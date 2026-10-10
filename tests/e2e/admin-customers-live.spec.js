import { expect, test } from '@playwright/test';
import { fulfillJson, installSession, isolateTestNetwork, mockStaffWorkspace } from './helpers';

const enabled = process.env.VITE_ADMIN_CUSTOMERS_LIVE === 'true';
const id = number => number.toString(16).padStart(24, '0');
const owner = { _id: id(100), name: 'Actual Owner One', email: 'shared@example.test', accountStatus: 'active', subscriptionPlan: 'enterprise', subscriptionExpiresAt: null };
const hotels = [
  { _id: id(1), name: 'Actual Restaurant One', isActive: true, createdAt: '2026-01-01T00:00:00.000Z', owner },
  { _id: id(2), name: 'Actual Restaurant Two', isActive: true, owner },
  { _id: id(3), name: 'Actual Restaurant Three', isActive: false, owner: { ...owner, _id: id(101), name: 'Actual Owner Two', subscriptionPlan: null } },
];
async function directory(page, body = { success: true, hotels }, status = 200) {
  await page.route('**/admin/hotels', route => fulfillJson(route, body, status));
}

test.describe('live Super Admin directory', () => {
  test.skip(!enabled, 'Requires VITE_ADMIN_CUSTOMERS_LIVE=true');
  test.beforeEach(async ({ page }) => { await isolateTestNetwork(page); });

  test('groups exact owner IDs, shows source facts and searches without refetching', async ({ page }) => {
    await installSession(page, 'superadmin');
    let reads = 0;
    await page.route('**/admin/hotels', route => { reads += 1; return fulfillJson(route, { success: true, hotels }); });
    await page.goto('/superadmin/customers');
    const list = page.getByRole('region', { name: 'Live customer list' });
    await expect(list.getByRole('link')).toHaveCount(2);
    await expect(list).toContainText('enterprise');
    await expect(list).toContainText('Not recorded');
    await expect(list).toContainText('2 restaurants');
    await expect(page.getByText('Sample Orchard Hospitality', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Email templates', exact: true })).toHaveCount(0);
    const loadedReads = reads;
    await page.getByRole('searchbox').fill('Actual Restaurant Two');
    await expect(list.getByRole('link')).toHaveCount(1);
    await expect(list.getByRole('link', { name: 'Actual Owner One' })).toBeVisible();
    await page.getByRole('searchbox').fill('Actual Owner Two');
    await expect(list.getByRole('link', { name: 'Actual Owner Two' })).toBeVisible();
    expect(reads).toBe(loadedReads);
  });

  test('deep links preserve unknown owner dates and never imply payment or activity', async ({ page }) => {
    await installSession(page, 'superadmin');
    await directory(page);
    await page.goto(`/superadmin/customers/owner-${id(100)}`);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Actual Owner One' })).toBeVisible();
    await expect(dialog.getByRole('tabpanel')).toContainText('Not available from this API');
    await dialog.getByRole('tab', { name: 'Packages & payments' }).click();
    await expect(dialog.getByRole('tabpanel')).toContainText('enterprise');
    await expect(dialog.getByRole('tabpanel')).toContainText('Not connected');
    await expect(dialog.getByRole('tabpanel')).toContainText('Not available');
    await dialog.getByRole('tab', { name: 'Usage', exact: true }).click();
    await expect(dialog.getByRole('tabpanel')).toContainText('Not tracked');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL(/\/superadmin\/customers$/);
  });

  test('staff remains unavailable and never calls the unprotected staff endpoint', async ({ page }) => {
    await installSession(page, 'superadmin');
    await directory(page);
    const requested = [];
    await page.route('**/admin/hotels/*/staff', route => {
      requested.push(route.request().url());
      return fulfillJson(route, { success: false }, 403);
    });
    await page.goto(`/superadmin/customers/owner-${id(100)}`);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Restaurants & staff' }).click();
    await expect(dialog).toContainText('Actual Restaurant One');
    await expect(dialog).toContainText('Actual Restaurant Two');
    await expect(dialog.getByRole('button', { name: /View staff/ })).toHaveCount(0);
    await expect(dialog).toContainText(/Staff.*not (?:available|connected)|Staff.*unavailable/i);
    expect(requested).toEqual([]);
  });

  for (const role of ['owner', null]) {
    test(`${role || 'anonymous'} cannot access live customer data`, async ({ page }) => {
      if (role) { await installSession(page, role); await mockStaffWorkspace(page); }
      let reads = 0;
      await page.route('**/admin/hotels', route => { reads += 1; return fulfillJson(route, { success: true, hotels }); });
      await page.goto(`/superadmin/customers/owner-${id(100)}`);
      await expect(page).not.toHaveURL(/superadmin\/customers/);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(reads).toBe(0);
    });
  }

  test('distinguishes an API failure from a successful empty directory', async ({ page }) => {
    await installSession(page, 'superadmin');
    let failing = true;
    await page.route('**/admin/hotels', route => fulfillJson(route, failing ? { success: false } : { success: true, hotels: [] }, failing ? 503 : 200));
    await page.goto('/superadmin/customers');
    await expect(page.getByRole('alert')).toContainText('Live accounts unavailable');
    await expect(page.getByRole('heading', { name: 'No accounts found' })).toHaveCount(0);
    failing = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No accounts found' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Actual Owner One', { exact: true })).toHaveCount(0);
  });

  test('logout from another tab removes an open customer profile', async ({ page }) => {
    await installSession(page, 'superadmin');
    await directory(page);
    await page.goto(`/superadmin/customers/owner-${id(100)}`);
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Actual Owner One' })).toBeVisible();
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new StorageEvent('storage', { key: 'token', newValue: null }));
    });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).not.toHaveURL(/superadmin\/customers/);
    await expect(page.getByText('Actual Owner One', { exact: true })).toHaveCount(0);
  });

  test('list and profile fit a narrow mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await installSession(page, 'superadmin');
    await directory(page);
    await page.goto('/superadmin/customers');
    await expect(page.getByRole('link', { name: 'Actual Owner One', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Actual Owner One', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Restaurants & staff' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await dialog.evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0)).toBe(true);
    await page.getByRole('button', { name: 'Close customer profile' }).click();
    await expect(page.getByRole('link', { name: 'Actual Owner One', exact: true })).toBeFocused();
  });
});
