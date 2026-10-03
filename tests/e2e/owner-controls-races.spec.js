import { test, expect } from '@playwright/test';
import { fulfillJson, hotel, installSession, mockStaffWorkspace } from './helpers';

test.beforeEach(async ({ page }) => { page.on("dialog", dialog => dialog.accept()); });

test('a stale dashboard refresh cannot undo a confirmed Home pause', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  let saved = { ...hotel };
  let holdNext = false;
  let releaseStale;
  await page.route('**/hotel/me', async route => {
    if (holdNext) {
      holdNext = false;
      const snapshot = { ...saved };
      await new Promise(resolve => { releaseStale = resolve; });
      return fulfillJson(route, { hotel: snapshot });
    }
    return fulfillJson(route, { hotel: saved });
  });
  await page.route('**/hotel/profile', route => {
    saved = { ...saved, orderingEnabled: route.request().postDataJSON().orderingEnabled };
    return fulfillJson(route, { hotel: saved });
  });
  await page.goto('/owner/dashboard');
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toBeEnabled();
  holdNext = true;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect.poll(() => Boolean(releaseStale)).toBe(true);
  await page.getByRole('button', { name: /Ordering Active —/ }).click();
  await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toHaveText('Ordering Paused');
  const staleReply = page.waitForResponse(async response => response.url().endsWith('/hotel/me') && (await response.json()).hotel?.orderingEnabled === true);
  releaseStale();
  await staleReply;
  await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toBeEnabled();
});

test('an unconfirmed save cannot claim ordering was paused', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  await page.route('**/hotel/profile', route => fulfillJson(route, { success: true }));
  await page.goto('/owner/dashboard');
  await page.getByRole('button', { name: /Ordering Active —/ }).click();
  await expect(page.getByRole('alert')).toContainText('different ordering status');
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toHaveText('Ordering Active');
});

test('offline Home pause is rejected visibly without queuing or changing the setting', async ({ page, context }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  let writes = 0;
  await page.route('**/hotel/profile', route => { writes++; return fulfillJson(route, { hotel }); });
  await page.goto('/owner/dashboard');
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toBeEnabled();
  await context.setOffline(true);
  await page.getByRole('button', { name: /Ordering Active —/ }).click();
  await expect(page.getByRole('alert')).toContainText('Connect to the internet');
  expect(writes).toBe(0);
  await expect(page.getByRole('button', { name: /Ordering Active —/ })).toHaveText('Ordering Active');
});
