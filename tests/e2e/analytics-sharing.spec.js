import { expect, test } from '@playwright/test';
import { fulfillJson, hotel, installSession } from './helpers';

test('analytics Excel export shares its file and falls back to download when unsupported', async ({ page }) => {
  await installSession(page, 'owner');
  await page.route('**/hotel/me', route => fulfillJson(route, {
    hotel: { ...hotel, featureSettings: { appLevel: 'advanced' } },
  }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, route => fulfillJson(route, { orders: [] }));
  await page.route('**/api/orders', route => fulfillJson(route, { orders: [] }));
  await page.route('**/menu/hotel-1', route => fulfillJson(route, []));
  await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, []));
  await page.route('**/analytics', route => fulfillJson(route, {}));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => {
      window.__reportShare = payload.files.map(file => ({ name: file.name, type: file.type, size: file.size }));
    } });
  });
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: 'Analytics', exact: true }).filter({ visible: true }).click();
  const exportButton = page.getByRole('button', { name: /^Export report/ });
  await exportButton.click();
  await expect(page.getByText('Share sheet opened. Confirm the destination in the app you choose.')).toBeVisible();
  const [file] = await page.evaluate(() => window.__reportShare);
  expect(file.name).toMatch(/\.xlsx$/);
  expect(file.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  expect(file.size).toBeGreaterThan(1000);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('cancelled', 'AbortError'); } });
  });
  await exportButton.click();
  await expect(page.getByText('Sharing cancelled. No file was sent.')).toBeVisible();

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
  });
  const waiting = page.waitForEvent('download');
  await exportButton.click();
  expect((await waiting).suggestedFilename()).toBe(file.name);
  await expect(page.getByText('Download started. Check your browser downloads.')).toBeVisible();
});
