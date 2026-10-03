import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOrderReceipt,
  normalizeReceiptContact,
  receiptFilename,
  receiptPrintHtml,
  receiptShareText,
} from "./orderReceipt";

describe("order receipt", () => {
  it("labels a tableless takeaway receipt and preserves its billed total", () => {
    const receipt = buildOrderReceipt({ _id: "takeaway", orderType: "takeaway", tableId: null, roomNumber: null, status: "delivered", totalAmount: 283.5, items: [{ name: "Paneer", quantity: 1, price: 270 }] });
    expect(receipt.order.location).toBe("Takeaway");
    expect(receipt.financials.total).toBe(283.5);
    expect(receipt.financials.totalIsServerSnapshot).toBe(true);
  });
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
    expect(receiptFilename(first)).toMatch(/^order-receipt-TK-\d{8}\.pdf$/);
  });
});


describe("restaurant GSTIN on receipts", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses only the explicit restaurant's saved GSTIN in print and share output", () => {
    vi.stubGlobal("localStorage", { getItem: key => key === "flexiorder_restaurant_billing:hotel-a" ? JSON.stringify({ gstin: "27ABCDE1234F1Z5" }) : null });
    const order = { _id: "test", items: [], totalAmount: 100 };
    const a = buildOrderReceipt(order, { _id: "hotel-a", name: "A & B" });
    const b = buildOrderReceipt(order, { _id: "hotel-b" });
    expect(a.restaurant.gstin).toBe("27ABCDE1234F1Z5");
    expect(receiptPrintHtml(a)).toContain("GSTIN: 27ABCDE1234F1Z5");
    expect(receiptPrintHtml(a)).toContain("A &amp; B");
    expect(receiptShareText(a)).toContain("GSTIN: 27ABCDE1234F1Z5");
    expect(receiptPrintHtml(b)).not.toContain("GSTIN:");
    expect(buildOrderReceipt(order).restaurant.gstin).toBe("");
    expect(a.financials.total).toBe(100);
  });
  it("returns an actionable warning instead of crashing on corrupt receipt storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => "broken" });
    const receipt = buildOrderReceipt({ totalAmount: 100 }, { _id: "hotel-a" });
    expect(receipt.restaurant.gstin).toBe("");
    expect(receipt.restaurant.billingWarning).toContain("could not be read");
  });
});

describe('GST bill reconciliation', () => {
  it('shows GST separately without adding it twice to the saved total', () => {
    const receipt=buildOrderReceipt({subtotal:100,gstAmount:5,gstRate:5,totalAmount:105});
    expect(receipt.financials).toMatchObject({gstAmount:5,total:105,taxMismatch:false,note:''});
    expect(receiptShareText(receipt)).toContain('GST (5%): INR 5.00');
    expect(receiptShareText(receipt)).toContain('Total: INR 105.00');
    expect(receiptPrintHtml(receipt)).toContain('GST (5%)');
  });
  it('adds saved GST to a legacy pre-tax total in the bill without changing the order', () => {
    const order=Object.freeze({subtotal:100,gstAmount:5,totalAmount:100});
    const receipt=buildOrderReceipt(order);
    expect(receipt.financials).toMatchObject({gstAmount:5,total:105,recordedTotal:100,gstAddedToBill:true,taxMismatch:false,totalIsServerSnapshot:false});
    expect(receiptShareText(receipt)).toContain('Total: INR 105.00');
    expect(receiptPrintHtml(receipt)).toContain('INR 105.00');
    expect(order.totalAmount).toBe(100);
  });
  it('leaves unrelated mismatches and ambiguous discounts for confirmation', () => {
    expect(buildOrderReceipt({subtotal:100,gstAmount:5,totalAmount:98}).financials).toMatchObject({total:98,taxMismatch:true,gstAddedToBill:false});
    expect(buildOrderReceipt({subtotal:100,discountAmount:10,gstAmount:5,totalAmount:100}).financials.gstAddedToBill).toBe(false);
    expect(buildOrderReceipt({subtotal:100,gstAmount:5,totalAmount:100,taxInclusive:true}).financials.gstAddedToBill).toBe(false);
  });
  it('uses an explicit discounted net snapshot and rounds small GST once', () => {
    expect(buildOrderReceipt({grossSubtotal:100,netSubtotal:90,discountAmount:10,gstAmount:4.5,totalAmount:90}).financials.total).toBe(94.5);
    expect(buildOrderReceipt({subtotal:0.1+0.2,gstAmount:0.01,totalAmount:0.3}).financials.total).toBe(0.31);
    expect(buildOrderReceipt({subtotal:0.3,gstAmount:0.01,totalAmount:0.31}).financials.gstAddedToBill).toBe(false);
  });
  it('does not add current restaurant GST to historical zero-tax orders', () => {
    const receipt=buildOrderReceipt({subtotal:100,gstAmount:0,totalAmount:100},{gstEnabled:true,gstPercentage:18});
    expect(receipt.financials).toMatchObject({gstAmount:0,total:100,taxMismatch:false});
    expect(receiptShareText(receipt)).not.toContain('GST:');
  });
  it('preserves mixed-rate saved tax without inventing a uniform rate', () => {
    const receipt=buildOrderReceipt({subtotal:350,gstAmount:29,totalAmount:379});
    expect(receipt.financials.taxMismatch).toBe(false);
    expect(receiptShareText(receipt)).toContain('GST: INR 29.00');
    expect(receiptShareText(receipt)).not.toContain('GST (');
  });
});
