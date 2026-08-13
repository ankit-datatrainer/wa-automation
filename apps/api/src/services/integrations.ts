import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export type IntegrationEvent =
  | "message.received"
  | "message.status"
  | "campaign.completed"
  | "contact.created"
  | "flow.submitted"
  | "order.placed"
  | "payment.captured";

/** Providers that accept a plain JSON POST at a configured URL. */
const URL_FIELD_BY_PROVIDER: Record<string, string> = {
  webhook: "url",
  zapier: "hookUrl",
};

/**
 * Fans an event out to the org's active outbound integrations.
 *
 * Fire-and-forget by design: a customer's broken endpoint must never slow down
 * or fail our webhook ingestion, so failures are logged rather than thrown.
 */
export async function dispatchIntegrationWebhooks(
  organizationId: string,
  event: IntegrationEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: integrations } = await supabaseAdmin
      .from("integrations")
      .select("provider, config")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (!integrations?.length) return;

    const body = JSON.stringify({
      event,
      organizationId,
      occurredAt: new Date().toISOString(),
      data: payload,
    });

    await Promise.allSettled(
      integrations.map((integration) => {
        const field = URL_FIELD_BY_PROVIDER[integration.provider];
        if (!field) return Promise.resolve();

        const config = (integration.config ?? {}) as Record<string, string>;
        const url = config[field];
        if (!url?.startsWith("http")) return Promise.resolve();

        return post(url, body, config.secret);
      }),
    );
  } catch (err) {
    logger.error({ err, organizationId, event }, "Integration dispatch failed");
  }
}

async function post(url: string, body: string, secret?: string): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Lets the receiver verify the payload really came from us.
  if (secret) {
    headers["X-WA-Signature-256"] =
      "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      logger.warn({ url, status: response.status }, "Integration endpoint returned an error");
    }
  } catch (err) {
    logger.warn({ err, url }, "Integration endpoint unreachable");
  }
}
