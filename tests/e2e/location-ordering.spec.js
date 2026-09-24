import { test, expect } from '@playwright/test';
import { installSession, mockStaffWorkspace, fulfillJson, kitchenOrder } from './helpers';

test('waiter order lanes and owner location cards share natural table ordering', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  const tables = ['10', '2', '1'].map(number => ({ _id: `table-${number}`, tableNumber: number, type: 'table' }));
  await page.route('**/table', route => fulfillJson(route, { tables }));
  await page.route('**/kitchen/orders', route => fulfillJson(route, {
    orders: tables.map(table => kitchenOrder({ _id: `order-${table.tableNumber}`, tableId: table, locationNumber: table.tableNumber, status: 'pending' })),
  }));
  await page.goto('/qr');
  await expect(page.locator('.tqr-card h2')).toHaveText(['Table 1', 'Table 2', 'Table 10']);
  await page.goto('/owner/order');
  await expect(page.locator('.ops-order-card strong').filter({ hasText: /^Table / })).toHaveText(['Table 1', 'Table 2', 'Table 10']);
});
