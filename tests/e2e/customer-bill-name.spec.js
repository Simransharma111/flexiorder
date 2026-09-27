import { expect, test } from '@playwright/test';
import { fulfillJson, installSession, kitchenOrder, mockStaffWorkspace } from './helpers';

for (const offline of [false, true]) {
  test(`customer name survives ${offline ? 'offline sync' : 'creation'}, history refresh and receipt sharing`, async ({ page, context }) => {
    await installSession(page, 'staff');
    await mockStaffWorkspace(page);
    let orders = [];
    let submitted;
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => { window.__receiptText = payload.text; } });
    });
    await page.route(/\/orders(?:\?.*)?$/, route => {
      if (route.request().method() !== 'POST') return fulfillJson(route, { orders });
      submitted = route.request().postDataJSON();
      orders = [kitchenOrder({ _id: 'named-order', clientOrderId: submitted.clientOrderId, status: 'delivered', totalAmount: 315, items: [{ name: 'Paneer Tikka', price: 300, quantity: 1 }], guestName: 'Guest', guestContact: '9876543210' })];
      return fulfillJson(route, { order: orders[0] }, 201);
    });
    await page.route(/\/kitchen\/orders(?:\?.*)?$/, route => fulfillJson(route, { orders }));
    await page.goto('/owner/order');
    await page.getByRole('tab', { name: 'Take Order' }).click();
    await page.getByRole('button', { name: 'Table 8', exact: true }).click();
    await page.getByRole('button', { name: 'Guest details', exact: true }).click();
    await page.getByLabel('Guest name (optional)').fill('  Anika Shah  ');
    await page.getByRole('button', { name: 'Add Paneer Tikka', exact: true }).click();
    if (offline) await context.setOffline(true);
    await page.getByRole('button', { name: 'Place Order', exact: true }).click();
    if (offline) {
      await expect.poll(() => page.evaluate(() => {
        const key = Object.keys(localStorage).find(key => key.startsWith('flexiorder_pending_staff_orders:'));
        return JSON.parse(localStorage.getItem(key) || '[]')[0]?.payload.guestName;
      })).toBe('Anika Shah');
      await context.setOffline(false);
    }
    await expect.poll(() => submitted?.guestName).toBe('Anika Shah');
    await page.getByRole('tab', { name: 'History', exact: true }).click();
    await expect(page.getByText('Anika Shah', { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('tab', { name: 'History', exact: true }).click();
    await expect(page.getByText('Anika Shah', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'More options for Table 8' }).click();
    await page.getByRole('button', { name: 'View full details' }).click();
    const dialog = page.getByRole('dialog', { name: 'Order details for Table 8' });
    await expect(dialog.getByText('Anika Shah', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Share receipt', exact: true }).click();
    await dialog.getByRole('button', { name: 'Confirm and open share' }).click();
    await expect.poll(() => page.evaluate(() => window.__receiptText)).toContain('Anika Shah');
  });
}

test('analytics finds named bills and opens their receipt details', async ({ page }) => {
  await installSession(page, 'owner');
  const orders = [
    kitchenOrder({ _id: 'named-legacy', status: 'delivered', guestName: 'Guest', customerName: 'Meera Patel', totalAmount: 315 }),
    kitchenOrder({ _id: 'anonymous', status: 'delivered', totalAmount: 200 }),
  ];
  await mockStaffWorkspace(page, [orders[1]]);
  await page.route(/\/orders(?:\?.*)?$/, route => fulfillJson(route, { orders }));
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: 'Analytics', exact: true }).filter({ visible: true }).first().click();
  await page.getByPlaceholder('Guest, dish, order ID, table or room').fill('Meera');
  const bills = page.getByRole('region', { name: 'Bills in selected period' });
  await expect(bills.getByRole('button', { name: /^View bill for/ })).toHaveCount(1);
  await bills.getByRole('button', { name: /^View bill for Meera Patel/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Order details for Table 8' });
  await expect(dialog.getByText('Meera Patel', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Download PDF' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
