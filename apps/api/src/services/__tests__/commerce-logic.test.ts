import { describe, expect, it } from "vitest";
import { normalizeOrderItems, toMinorUnit, fromMinorUnit } from "../commerce-logic.js";

describe("currency conversion", () => {
  it("converts rupees to paise without floating-point drift", () => {
    // 19.99 * 100 is 1998.9999... in binary floating point; rounding matters.
    expect(toMinorUnit(19.99)).toBe(1999);
    expect(toMinorUnit(599)).toBe(59900);
    expect(toMinorUnit(0.1)).toBe(10);
    expect(toMinorUnit(0)).toBe(0);
  });

  it("converts paise back to rupees", () => {
    expect(fromMinorUnit(59900)).toBe(599);
    expect(fromMinorUnit(1999)).toBe(19.99);
    expect(fromMinorUnit(0)).toBe(0);
  });

  it("round-trips a price unchanged", () => {
    for (const price of [1, 9.99, 100.5, 1234.56, 99999.99]) {
      expect(fromMinorUnit(toMinorUnit(price))).toBeCloseTo(price, 2);
    }
  });
});

describe("normalizeOrderItems", () => {
  it("converts Meta's minor-unit prices and computes line totals", () => {
    const result = normalizeOrderItems([
      { product_retailer_id: "SKU-1", quantity: 2, item_price: 59900, currency: "INR" },
      { product_retailer_id: "SKU-2", quantity: 1, item_price: 129900, currency: "INR" },
    ]);

    expect(result.items).toEqual([
      {
        retailerId: "SKU-1",
        quantity: 2,
        unitPrice: 599,
        currency: "INR",
        lineTotal: 1198,
      },
      {
        retailerId: "SKU-2",
        quantity: 1,
        unitPrice: 1299,
        currency: "INR",
        lineTotal: 1299,
      },
    ]);
    expect(result.total).toBe(2497);
    expect(result.currency).toBe("INR");
  });

  it("handles an empty order without dividing by zero", () => {
    const result = normalizeOrderItems([]);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    // Falls back to INR rather than undefined so the DB column stays valid.
    expect(result.currency).toBe("INR");
  });

  it("takes the currency from the first item", () => {
    const result = normalizeOrderItems([
      { product_retailer_id: "A", quantity: 1, item_price: 1000, currency: "USD" },
    ]);
    expect(result.currency).toBe("USD");
  });

  it("keeps fractional prices exact to two decimals", () => {
    const result = normalizeOrderItems([
      { product_retailer_id: "A", quantity: 3, item_price: 1999, currency: "INR" },
    ]);
    expect(result.items[0]!.unitPrice).toBe(19.99);
    expect(result.total).toBeCloseTo(59.97, 2);
  });
});
