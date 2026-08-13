import { env } from "../config/env.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import { upstreamError } from "../lib/errors.js";
import { decrypt } from "../lib/crypto.js";
import { meta } from "../lib/meta.js";
import { normalizeOrderItems, toMinorUnit } from "./commerce-logic.js";

const GRAPH_BASE = `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`;

interface CatalogProductPayload {
  retailer_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  availability: string;
  url?: string;
}

/**
 * Pushes products to a Meta Commerce catalog via the batch endpoint.
 *
 * Meta caps a batch at 5,000 items, and prices are in the currency's minor
 * unit (paise for INR), so both are handled here rather than at call sites.
 */
export async function syncCatalogToMeta(
  organizationId: string,
  catalogId: string,
  accessToken: string,
): Promise<{ synced: number; failed: number; errors: string[] }> {
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("retailer_id, name, description, price, currency, image_url, availability")
    .eq("organization_id", organizationId);

  if (error) throw error;
  if (!products?.length) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < products.length; i += 1000) {
    const chunk = products.slice(i, i + 1000);

    const requests = chunk.map((product) => ({
      method: "UPDATE",
      retailer_id: product.retailer_id,
      data: {
        name: product.name,
        description: product.description ?? product.name,
        // Meta expects the minor unit: ₹599.00 becomes 59900.
        price: toMinorUnit(Number(product.price)),
        currency: product.currency,
        image_url: product.image_url ?? "",
        availability:
          product.availability === "in stock" ? "in stock" : "out of stock",
        condition: "new",
        brand: "",
      } satisfies Partial<CatalogProductPayload> & Record<string, unknown>,
    }));

    try {
      const response = await fetch(`${GRAPH_BASE}/${catalogId}/batch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        handles?: string[];
        error?: { message: string };
      };

      if (!response.ok || body.error) {
        failed += chunk.length;
        errors.push(body.error?.message ?? `HTTP ${response.status}`);
        continue;
      }

      synced += chunk.length;
    } catch (err) {
      failed += chunk.length;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  logger.info({ organizationId, synced, failed }, "Catalog sync finished");
  return { synced, failed, errors: errors.slice(0, 5) };
}

/** Confirms a catalog id is reachable with these credentials before we store it. */
export async function verifyCatalog(
  catalogId: string,
  accessToken: string,
): Promise<{ id: string; name: string; productCount: number }> {
  const response = await fetch(
    `${GRAPH_BASE}/${catalogId}?fields=id,name,product_count`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const body = (await response.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    product_count?: number;
    error?: { message: string };
  };

  if (!response.ok || body.error || !body.id) {
    throw upstreamError(
      body.error?.message ?? "Could not read that catalog. Check the ID and token permissions.",
    );
  }

  return { id: body.id, name: body.name ?? "Catalog", productCount: body.product_count ?? 0 };
}

/** Sends a single product card. */
export async function sendProductMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  catalogId: string,
  retailerId: string,
  bodyText?: string,
) {
  return meta.sendMessage(phoneNumberId, accessToken, {
    to,
    type: "interactive",
    interactive: {
      type: "product",
      ...(bodyText && { body: { text: bodyText } }),
      action: { catalog_id: catalogId, product_retailer_id: retailerId },
    },
  });
}

/**
 * Sends a multi-product list. WhatsApp requires at least one section and caps
 * the total at 30 items across all sections.
 */
export async function sendMultiProductMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  catalogId: string,
  sections: { title: string; retailerIds: string[] }[],
  header: string,
  bodyText: string,
) {
  const totalItems = sections.reduce((sum, s) => sum + s.retailerIds.length, 0);
  if (totalItems === 0) throw upstreamError("Select at least one product to send");
  if (totalItems > 30) throw upstreamError("WhatsApp allows at most 30 products per message");

  return meta.sendMessage(phoneNumberId, accessToken, {
    to,
    type: "interactive",
    interactive: {
      type: "product_list",
      header: { type: "text", text: header },
      body: { text: bodyText },
      action: {
        catalog_id: catalogId,
        sections: sections.map((section) => ({
          title: section.title,
          product_items: section.retailerIds.map((id) => ({ product_retailer_id: id })),
        })),
      },
    },
  });
}

/** Opens the customer's cart view against the catalog. */
export async function sendCatalogMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  thumbnailRetailerId?: string,
) {
  return meta.sendMessage(phoneNumberId, accessToken, {
    to,
    type: "interactive",
    interactive: {
      type: "catalog_message",
      body: { text: bodyText },
      action: {
        name: "catalog_message",
        ...(thumbnailRetailerId && {
          parameters: { thumbnail_product_retailer_id: thumbnailRetailerId },
        }),
      },
    },
  });
}

export interface MetaOrderMessage {
  catalog_id: string;
  text?: string;
  product_items: {
    product_retailer_id: string;
    quantity: number;
    item_price: number;
    currency: string;
  }[];
}

/**
 * Persists an order a customer placed from the catalogue.
 *
 * Meta reports item prices in the minor unit, so they are converted back to
 * major units before storage to match how products are priced in our tables.
 */
export async function recordOrder(
  organizationId: string,
  contactId: string,
  conversationId: string,
  wamid: string,
  order: MetaOrderMessage,
): Promise<string | null> {
  const { items, total, currency } = normalizeOrderItems(order.product_items ?? []);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .insert({
      organization_id: organizationId,
      contact_id: contactId,
      conversation_id: conversationId,
      wamid,
      catalog_id: order.catalog_id,
      items,
      total,
      currency,
      note: order.text ?? null,
      status: "placed",
    })
    .select("id")
    .single();

  // 23505 means this order webhook was redelivered; the first insert stands.
  if (error?.code === "23505") return null;
  if (error) throw error;

  logger.info({ organizationId, orderId: data.id, total }, "Catalogue order received");
  return data.id;
}

export { decrypt };
