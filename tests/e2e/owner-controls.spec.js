import { expect, test } from '@playwright/test';
import { fulfillJson, hotel, installSession, kitchenOrder, mockStaffWorkspace } from './helpers';

async function owner(page) {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, []));
}

test('Home pauses and resumes confirmed ordering, persists refresh and retains state after errors', async ({ page }) => {
  await owner(page);
  let saved = { ...hotel };
  let fail = false;
  await page.route('**/hotel/me', route => fulfillJson(route, { hotel: saved }));
  await page.route('**/hotel/profile', route => {
    const body = route.request().postDataJSON();
    expect(Object.keys(body)).toEqual(['orderingEnabled']);
    if (fail) return fulfillJson(route, { message: 'Could not save ordering' }, 500);
    saved = { ...saved, orderingEnabled: body.orderingEnabled };
    return fulfillJson(route, { hotel: saved });
  });
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: /Ordering Active —/ }).click();
  await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toHaveText('Ordering Paused');
  await page.reload();
  await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toHaveText('Ordering Paused');
  fail = true;
  await page.getByRole('button', { name: /Ordering Paused —/ }).click();
  await expect(page.getByRole('alert')).toContainText('Could not save ordering');
  await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toBeEnabled();
  fail = false;
  await page.getByRole('button', { name: /Ordering Paused —/ }).click();
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toHaveText('Ordering Active');
  await page.getByRole('button', { name: 'Edit Branding' }).click();
  await expect(page.getByRole('region', { name: 'Edit restaurant branding' })).toBeInViewport();
});

test('Home history loads older orders separately from the active list and stays on History', async ({ page }) => {
  await owner(page);
  await page.route('**/kitchen/orders', route => fulfillJson(route, { orders: [kitchenOrder()] }));
  let reads = 0;
  await page.route('**/api/orders', route => {
    reads++;
    return fulfillJson(route, { orders: [kitchenOrder(), kitchenOrder({ _id: 'old-order', orderType: 'takeaway', tableId: null, status: 'delivered', createdAt: '2020-01-01T00:00:00Z' })] });
  });
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: /Order History View all/ }).click();
  await expect(page.getByRole('tab', { name: 'History', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'More options for Takeaway' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => reads).toBe(2);
  await expect(page.getByRole('tab', { name: 'History', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('Live menu reads assigned locations and links to the real public URL without writes', async ({ page }) => {
  await owner(page);
  await page.route('**/table', route => {
    expect(route.request().method()).toBe('GET');
    return fulfillJson(route, { tables: [{ _id: 't1', type: 'table', tableNumber: '01', qrId: 'TABLE-001' }, { _id: 'r1', type: 'room', tableNumber: '101', qrId: 'room/code' }] });
  });
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: 'Manage menu', exact: true }).click();
  await page.getByRole('button', { name: 'View Live Menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'View Live Menu' });
  await expect(dialog.getByRole('link', { name: 'Table 01 — Open live menu' })).toHaveAttribute('href', /\/qr\/TABLE-001$/);
  await expect(dialog.getByRole('link', { name: 'Room 101 — Open live menu' })).toHaveAttribute('href', /\/qr\/room%2Fcode$/);
});

test('Live menu empty and error states never invent a public preview', async ({ page }) => {
  await owner(page);
  let failed = true;
  await page.route('**/table', route => failed ? fulfillJson(route, { message: 'Unavailable' }, 500) : fulfillJson(route, { tables: [] }));
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: 'Manage menu', exact: true }).click();
  await page.getByRole('button', { name: 'View Live Menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'View Live Menu' });
  await expect(dialog.getByRole('alert')).toContainText('Could not load');
  failed = false;
  await dialog.getByRole('button', { name: 'Retry' }).click();
  await expect(dialog.getByText(/No assigned QR yet/)).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Open Tables & Rooms' })).toHaveAttribute('href', '/qr');
});
