import { expect, test } from '@playwright/test';
import { fulfillJson, installSession, kitchenOrder, mockStaffWorkspace } from './helpers';

test('owner saves, reloads and clears a device GSTIN without changing server settings', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  let writes = 0;
  await page.route('**/hotel/profile', route => { writes++; return fulfillJson(route, {}); });
  const open = async () => {
    await page.goto('/owner/dashboard');
    if ((page.viewportSize()?.width || 0) < 768) await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).filter({ visible: true }).click();
  };
  await open();
  const region = page.getByRole('region', { name: 'Receipt details', exact: true });
  const input = region.getByLabel('Restaurant GSTIN (optional)');
  await input.fill('invalid');
  await region.getByRole('button', { name: 'Save receipt details' }).click();
  await expect(region.getByRole('alert')).toContainText('15-character');
  await input.fill('27abcde1234f1z5');
  await region.getByRole('button', { name: 'Save receipt details' }).click();
  await expect(region.getByRole('status')).toContainText('saved on this device');
  await open();
  await expect(input).toHaveValue('27ABCDE1234F1Z5');
  await input.fill('');
  await region.getByRole('button', { name: 'Save receipt details' }).click();
  await expect(region.getByRole('status')).toContainText('cleared');
  expect(writes).toBe(0);
});

test('receipt shares the saved restaurant GSTIN and blocks export if saved details become unreadable', async ({ page }) => {
  await installSession(page, 'staff');
  await page.addInitScript(() => {
    localStorage.setItem('flexiorder_restaurant_billing:hotel-1', JSON.stringify({ gstin: '27ABCDE1234F1Z5' }));
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__sharedReceipt = { text: payload.text, filename: payload.files[0].name, size: payload.files[0].size }; } });
  });
  await mockStaffWorkspace(page, [kitchenOrder({ status: 'delivered', guestContact: '9876543210', totalAmount: 100 })]);
  await page.goto('/owner/order');
  await page.getByRole('tab', { name: 'History' }).click();
  await page.getByRole('button', { name: 'More options for Table 8' }).click();
  await page.getByRole('button', { name: 'View full details' }).click();
  const details = page.getByRole('dialog', { name: 'Order details for Table 8' });
  await details.getByRole('button', { name: 'Share receipt', exact: true }).click();
  await details.getByRole('button', { name: 'Confirm and open share' }).click();
  await expect.poll(() => page.evaluate(() => window.__sharedReceipt?.text)).toContain('GSTIN: 27ABCDE1234F1Z5');
  expect(await page.evaluate(() => window.__sharedReceipt.size)).toBeGreaterThan(1000);
  await page.evaluate(() => {
    localStorage.setItem('flexiorder_restaurant_billing:hotel-1', 'broken');
    window.dispatchEvent(new Event('storage'));
  });
  await expect(details.getByRole('alert')).toContainText('GSTIN could not be read');
  await expect(details.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
});
