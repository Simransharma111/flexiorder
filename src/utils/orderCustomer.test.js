import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { customerName, preserveCustomerName } from './orderCustomer';
import { mergeOrders, replaceOrderAuthoritatively } from './orderModel';
import { mergeGuestActiveOrders } from './guestOrderState';
import { buildOrderReceipt, receiptPrintHtml, receiptShareText } from './orderReceipt';
import { buildAnalyticsReportBlob } from './excelReport';

describe('customer names on bills', () => {
  it('uses meaningful explicit fields and leaves anonymous orders unnamed', () => {
    expect(customerName({ guestName: ' Guest ', customerName: ' Meera ' })).toBe('Meera');
    expect(customerName({ guestName: {}, customerName: ' अनिका ' })).toBe('अनिका');
    expect(customerName({ guestName: '  ', name: 'Dish name' })).toBe('');
    expect(customerName({ guestName: 'Guest' })).toBe('');
  });
  it('keeps the submitted name on sparse acknowledgements without copying financials', () => {
    expect(preserveCustomerName({ _id: '1', totalAmount: 42 }, { guestName: ' Anika ', totalAmount: 999 }))
      .toEqual({ _id: '1', totalAmount: 42, guestName: 'Anika' });
  });
  it('retains known names through blank patches and accepts real corrections', () => {
    const previous = [{ _id: '1', guestName: 'Anika', status: 'ready', totalAmount: 42 }];
    expect(mergeOrders(previous, [{ _id: '1', guestName: 'Guest', status: 'delivered', totalAmount: 45 }])[0])
      .toMatchObject({ guestName: 'Anika', status: 'delivered', totalAmount: 45 });
    expect(replaceOrderAuthoritatively(previous, { _id: '1', guestName: 'Meera' })[0].guestName).toBe('Meera');
    expect(mergeOrders(previous, [{ _id: '2', guestName: 'Guest' }]).find(order => order._id === '2').guestName).toBe('Guest');
  });
  it('recovers a late acknowledgement name while keeping newer status and totals', () => {
    const result = mergeOrders([{ _id: '1', guestName: 'Guest', status: 'ready', totalAmount: 42 }],
      [{ _id: '1', guestName: 'Anika', status: 'pending', totalAmount: 999 }])[0];
    expect(result).toMatchObject({ guestName: 'Anika', status: 'ready', totalAmount: 42 });
  });
  it('preserves a QR handoff name through subsequent public tracking', () => {
    expect(mergeGuestActiveOrders([{ _id: '1', guestName: 'Guest', status: 'ready', totalAmount: 42 }],
      [{ _id: '1', guestName: 'Anika', status: 'pending', totalAmount: 999 }])[0])
      .toMatchObject({ guestName: 'Anika', status: 'ready', totalAmount: 42 });
  });
  it('includes legacy names safely in receipt text and print', () => {
    const receipt = buildOrderReceipt({ guestName: 'Guest', customerName: '<Anika>', totalAmount: 42 });
    expect(receiptShareText(receipt)).toContain('Customer: <Anika>');
    expect(receiptPrintHtml(receipt)).toContain('&lt;Anika&gt;');
    expect(receipt.order.guestName).toBe('<Anika>');
  });
  it('exports customer name alongside contact without shifting money columns', async () => {
    const blob = await buildAnalyticsReportBlob({ orders: [{ _id: '1', guestName: 'Guest', customerName: 'Anika', guestContact: '9876543210', totalAmount: 42 }] });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await blob.arrayBuffer());
    const sheet = wb.worksheets[0];
    let header;
    sheet.eachRow(row => { if (row.getCell(1).value === 'Order #') header = row.number; });
    expect(sheet.getRow(header).getCell(14).value).toBe('Customer name');
    const row = sheet.getRow(header + 1);
    expect(row.getCell(14).value).toBe('Anika');
    expect(row.getCell(5).value).toBe('9876543210');
    expect(row.getCell(11).value).toBe(42);
  });
});
