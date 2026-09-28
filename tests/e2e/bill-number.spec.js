import { expect, test } from '@playwright/test';
import { installSession, mockStaffWorkspace, kitchenOrder } from './helpers';

test('bill PDF shows a short reference and no payment labels', async ({ page }) => {
  await installSession(page, 'staff');
  await page.addInitScript(() => {
    window.__pdfLines = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
      window.__pdfLines.push(String(text));
      return original.call(this, text, ...args);
    };
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  const id = '66f73aa110b4567890123456';
  await mockStaffWorkspace(page, [kitchenOrder({ _id: id, status: 'delivered', paymentStatus: 'pending', paymentMethod: 'cash', totalAmount: 105, gstAmount: 5 })]);
  await page.goto('/owner/order');
  await page.getByRole('tab', { name: 'History', exact: true }).click();
  await page.getByRole('button', { name: 'More options for Table 8' }).click();
  await page.getByRole('button', { name: 'View full details' }).click();
  const details = page.getByRole('dialog', { name: 'Order details for Table 8' });
  await expect(details.getByText(/^Order #FTK-\d{8}$/)).toBeVisible();
  const download = page.waitForEvent('download');
  await details.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/^order-receipt-FTK-\d{8}\.pdf$/);
  const lines = (await page.evaluate(() => window.__pdfLines)).join('\n');
  expect(lines).toMatch(/Order\s+FTK-\d{8}/);
  expect(lines).not.toContain(id);
  expect(lines).not.toMatch(/Payment|pending|cash/);
  expect(lines).toContain('GST');
});
