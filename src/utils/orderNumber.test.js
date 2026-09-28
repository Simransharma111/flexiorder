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
