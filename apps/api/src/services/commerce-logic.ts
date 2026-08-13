/**
 * Pure money and order-shaping helpers.
 *
 * Separated from `commerce.ts` so the currency arithmetic — the part where a
 * mistake costs real money — can be tested without touching Meta or the
 * database.
 */

export interface MetaProductItem {
  product_retailer_id: string;
  quantity: number;
  /** Price in the currency's minor unit, as Meta reports it. */
  item_price: number;
  currency: string;
}

export interface OrderLine {
  retailerId: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
}

/**
 * Major unit to minor unit (₹599.00 → 59900).
 * Rounds because 19.99 * 100 is 1998.9999… in binary floating point.
 */
export function toMinorUnit(amount: number): number {
  return Math.round(amount * 100);
}

/** Minor unit back to major (59900 → 599). */
export function fromMinorUnit(minor: number): number {
  return Math.round(minor) / 100;
}

/** Converts a Meta order's items into our stored shape and totals them. */
export function normalizeOrderItems(productItems: MetaProductItem[]): {
  items: OrderLine[];
  total: number;
  currency: string;
} {
  const items: OrderLine[] = (productItems ?? []).map((item) => {
    const unitPrice = fromMinorUnit(item.item_price);
    return {
      retailerId: item.product_retailer_id,
      quantity: item.quantity,
      unitPrice,
      currency: item.currency,
      // Rounded to two decimals so repeated fractional prices cannot drift.
      lineTotal: fromMinorUnit(toMinorUnit(unitPrice * item.quantity)),
    };
  });

  const total = fromMinorUnit(
    items.reduce((sum, item) => sum + toMinorUnit(item.lineTotal), 0),
  );

  return {
    items,
    total,
    // INR fallback keeps the NOT NULL currency column valid on an empty order.
    currency: items[0]?.currency ?? "INR",
  };
}
