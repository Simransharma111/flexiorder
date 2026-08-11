import { describe, expect, it } from "vitest";
import {
  buildOrderReceipt,
  normalizeReceiptContact,
  receiptFilename,
  receiptPrintHtml,
  receiptShareText,
} from "./orderReceipt";

describe("order receipt", () => {
  it("normalizes supported Indian and explicit international contacts", () => {
    expect(normalizeReceiptContact("98765 43210")).toBe("+919876543210");
    expect(normalizeReceiptContact("91-98765-43210")).toBe("+919876543210");
    expect(normalizeReceiptContact("+44 (20) 7946 0958")).toBe("+442079460958");
    expect(normalizeReceiptContact("12345")).toBeNull();
    expect(normalizeReceiptContact("00442079460958")).toBeNull();
  });

  it("recognizes a legacy gross subtotal without applying its discount twice", () => {
    const receipt = buildOrderReceipt({
      _id: "gross-order",
      status: "delivered",
      subtotal: 300,
      discountAmount: 30,
      gstAmount: 13.5,
      totalAmount: 283.5,
      items: [{ name: "Paneer", quantity: 1, price: 300 }],
    });
    expect(receipt.financials).toMatchObject({
      subtotal: 300,
      subtotalLabel: "Gross subtotal",
      discount: 30,
      total: 283.5,
      totalIsServerSnapshot: true,
      note: "",
    });
  });

  it("recognizes a net checkout subtotal and preserves the server total", () => {
    const receipt = buildOrderReceipt({
      _id: "net-order",
      status: "delivered",
      subtotal: 270,
      discountAmount: 30,
      gstAmount: 13.5,
      totalAmount: 283.5,
      items: [{ name: "Paneer", quantity: 1, finalPrice: 270 }],
    });
    expect(receipt.financials).toMatchObject({
      subtotal: 270,
      subtotalLabel: "Subtotal after discount",
      discount: 30,
      total: 283.5,
      note: "",
    });
  });

  it("does not invent a total when a discounted legacy subtotal is ambiguous", () => {
    const receipt = buildOrderReceipt({
      _id: "ambiguous-order",
      status: "delivered",
      subtotal: 300,
      discountAmount: 30,
      gstAmount: 13.5,
      items: [{ name: "Paneer", quantity: 1, price: 300 }],
    });
    expect(receipt.financials.total).toBeNull();
    expect(receipt.financials.note).toMatch(/total was not recalculated/);
    expect(receiptShareText(receipt)).toContain("Total: Not recorded");
  });

  it("keeps gross labeling when both canonical subtotal snapshots exist", () => {
    const receipt = buildOrderReceipt({
      _id: "canonical-order",
      status: "delivered",
      grossSubtotal: 300,
      netSubtotal: 270,
      discountAmount: 30,
      gstAmount: 13.5,
      totalAmount: 283.5,
    });
    expect(receipt.financials).toMatchObject({
      subtotal: 300,
      subtotalLabel: "Gross subtotal",
      total: 283.5,
    });
  });

  it("renders malformed dates as unavailable instead of breaking receipt output", () => {
    const receipt = buildOrderReceipt({
      _id: "bad-date",
      status: "delivered",
      deliveredAt: "not-a-date",
      totalAmount: 100,
    });
    expect(receiptShareText(receipt)).toContain("Not recorded");
    expect(receiptPrintHtml(receipt)).toContain("Not recorded");
  });

  it("keeps each receipt isolated to its selected order", () => {
    const first = buildOrderReceipt({
      _id: "first/order",
      status: "delivered",
      guestContact: "9876543210",
      items: [{ name: "Paneer Tikka", quantity: 2, price: 120 }],
      totalAmount: 240,
    }, { name: "Test Kitchen" });
    const second = buildOrderReceipt({
      _id: "second",
      status: "delivered",
      items: [{ name: "Hakka Noodles", quantity: 1, price: 180 }],
      totalAmount: 180,
    }, { name: "Test Kitchen" });

    expect(receiptShareText(first)).toContain("Paneer Tikka");
    expect(receiptShareText(first)).not.toContain("Hakka Noodles");
    expect(receiptPrintHtml(second)).toContain("Hakka Noodles");
    expect(receiptPrintHtml(second)).not.toContain("Paneer Tikka");
    expect(receiptFilename(first)).toBe("order-receipt-first-order.pdf");
  });
});
