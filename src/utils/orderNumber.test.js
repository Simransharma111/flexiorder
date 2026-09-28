import { orderMatchesAnalyticsSearch } from "./analyticsRanges";
import { expect, it } from 'vitest';
import { orderNumber } from './orderNumber';
import { buildOrderReceipt, receiptPrintHtml, receiptShareText, receiptFilename } from './orderReceipt';

it('keeps real assigned order numbers and creates stable compact fallback references', () => {
  expect(orderNumber({ orderNumber: 'R-123', _id: 'abc' })).toBe('R-123');
  expect(orderNumber({ orderNumber: 0 })).toBe('0');
  const order = { _id: '66f73aa110b4567890123456' };
  const reference = orderNumber(order);
  expect(reference).toMatch(/^FO-\d{8}$/);
  expect(orderNumber({ ...order, status: 'delivered', updatedAt: 'later' })).toBe(reference);
  expect(orderNumber({ _id: '66f73aa110b4567890123457' })).not.toBe(reference);
  expect(orderNumber({})).toBe('—');
});

it('uses the compact reference across bills without disclosing payment metadata', () => {
  const order = { _id: '66f73aa110b4567890123456', paymentStatus: 'pending', paymentMethod: 'cash', totalAmount: 105, gstAmount: 5 };
  const receipt = buildOrderReceipt(order);
  expect(receipt.order).not.toHaveProperty('paymentStatus');
  expect(receipt.order).not.toHaveProperty('paymentMethod');
  const html = receiptPrintHtml(receipt);
  const text = receiptShareText(receipt);
  for (const output of [html, text]) {
    expect(output).toContain(orderNumber(order));
    expect(output).not.toContain(order._id);
    expect(output).not.toMatch(/pending|Payment:|cash/);
  }
  expect(receiptFilename(receipt)).toBe(`order-receipt-${orderNumber(order)}.pdf`);
  expect(receipt.financials.total).toBe(105);
  expect(receipt.financials.gstAmount).toBe(5);
});

it('uses restaurant initials consistently without altering an assigned number', () => {
  const order = { _id: '66f73aa110b4567890123456' };
  const green = { name: 'Green Courtyard' };
  expect(orderNumber(order, green)).toMatch(/^GC-\d{8}$/);
  expect(orderNumber(order, { name: 'Spice Garden' })).toMatch(/^SG-\d{8}$/);
  expect(orderNumber(order, { name: 'Saffron' })).toMatch(/^SAF-\d{8}$/);
  expect(orderNumber(order, { name: '!!!' })).toMatch(/^FO-/);
  expect(orderNumber({ ...order, orderNumber: 'INV-12' }, green)).toBe('INV-12');
  const receipt = buildOrderReceipt(order, green);
  expect(receiptFilename(receipt)).toBe(`order-receipt-${orderNumber(order, green)}.pdf`);
  expect(receiptShareText(receipt)).toContain(orderNumber(order, green));
  expect(orderMatchesAnalyticsSearch(order, orderNumber(order, green), green)).toBe(true);
  expect(orderNumber({ ...order, restaurantName: 'Original Restaurant' }, green)).toMatch(/^OR-/);
  const unicode = buildOrderReceipt(order, { name: 'श्री भोजन' });
  expect(unicode.order.reference).toMatch(/^श्रीभो-/u);
  expect(receiptFilename(unicode)).toContain(unicode.order.reference);
});
