import { expect, test } from '@playwright/test';
import { dishes, fulfillJson, installSession, mockStaffWorkspace } from './helpers';

async function setup(page) {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, []));
  await page.goto('/owner/dashboard');
}
async function settings(page) {
  const button = page.getByRole('button', { name: 'Settings', exact: true }).filter({ visible: true });
  if ((page.viewportSize()?.width || 0) < 768) await page.getByRole('button', { name: 'More', exact: true }).click();
  await button.click();
}

test('cancelling pause from Home and Settings leaves ordering active without a write', async ({ page }) => {
  let writes = 0;
  await setup(page);
  await page.route('**/hotel/profile', route => { writes++; return fulfillJson(route, {}); });
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('Turn off customer ordering?');
    expect(dialog.message()).toContain('Existing orders will continue');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: /Ordering Active —/ }).click();
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toBeEnabled();
  await settings(page);
  await page.getByRole('checkbox', { name: 'Customer ordering enabled' }).click();
  await expect(page.getByRole('checkbox', { name: 'Customer ordering enabled' })).toBeChecked();
  expect(writes).toBe(0);
});

test('menu reset confirms, reports partial failure, and retry deletes remaining items', async ({ page }) => {
  await setup(page);
  let current = dishes.slice(0, 2);
  const deleted = [];
  let failSecond = true;
  await page.route('**/menu/hotel-1', route => fulfillJson(route, { dishes: current }));
  await page.route('**/menu/dish/*', route => {
    expect(route.request().method()).toBe('DELETE');
    const id = route.request().url().split('/').pop();
    if (id === dishes[1]._id && failSecond) return fulfillJson(route, { message: 'Try again later' }, 500);
    deleted.push(id);
    current = current.filter(item => item._id !== id);
    return fulfillJson(route, { success: true });
  });
  await settings(page);
  const section = page.getByRole('region', { name: 'Reset menu', exact: true });
  const button = section.getByRole('button', { name: 'Delete all menu items', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await button.click();
  expect(deleted).toEqual([]);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('Categories and past orders are kept');
    await dialog.accept();
  });
  await button.click();
  await expect(section.getByRole('alert')).toContainText('1 of 2 menu items deleted. Try again later');
  expect(deleted).toEqual([dishes[0]._id]);
  failSecond = false;
  page.once('dialog', dialog => dialog.accept());
  await button.click();
  await expect(section.getByRole('status')).toContainText('Menu reset complete. 1 items deleted');
  expect(deleted).toEqual(dishes.slice(0, 2).map(item => item._id));
});
