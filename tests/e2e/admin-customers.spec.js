import { expect, test } from '@playwright/test';
import { fulfillJson, installSession, isolateTestNetwork, mockStaffWorkspace } from './helpers';
const live = process.env.VITE_ADMIN_CUSTOMERS_LIVE === 'true';
const enabled = !live && process.env.VITE_ADMIN_CUSTOMERS_DEMO === 'true';
test.beforeEach(async ({ page }) => { await isolateTestNetwork(page); });

test('CRM is absent when its demo flag is disabled', async ({ page }) => {
  test.skip(enabled || live, 'Default build test');
  await installSession(page, 'superadmin');
  await page.route('**/admin/hotels', route => fulfillJson(route, { hotels: [] }));
  await page.goto('/superadmin');
  await expect(page.getByRole('button', { name: 'Customers · Demo' })).toHaveCount(0);
  await page.goto('/superadmin/customers');
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toHaveCount(0);
});

test.describe('enabled customer prototype', () => {
  test.skip(!enabled, 'Requires explicit demo build');
  test('compact list, scoped profile, URL navigation and narrow viewport', async ({ page }) => {
    await installSession(page, 'superadmin');
    await page.goto('/superadmin/customers');
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('Orchard');
    const link = page.getByRole('link', { name: 'Sample Orchard Hospitality' });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sample Orchard Hospitality' })).toBeVisible();
    for (const name of ['Restaurants & staff', 'Packages & payments', 'Usage', 'Private notes', 'Activity history', 'Overview']) {
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Close customer profile' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('Orchard');
    await expect(link).toBeFocused();
    await link.click();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveValue('Orchard');
  });
  test('email scope, defaults, one-off edits and reload', async ({ page }) => {
    await installSession(page, 'superadmin');
    await page.goto('/superadmin/customers');
    await page.getByRole('button', { name: 'Email templates', exact: true }).click();
    await page.getByLabel('Default subject', { exact: true }).fill('Hello {{owner_name}} from {{sender_brand}}');
    await page.getByRole('button', { name: 'Save demo default' }).click();
    await page.getByRole('button', { name: 'Back to customers' }).click();
    await page.getByRole('link', { name: 'Sample Orchard Hospitality' }).click();
    await page.getByRole('button', { name: 'Email customer', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate draft' })).toBeDisabled();
    await page.getByLabel('Restaurant / agreement scope').selectOption('sample-restaurant-1');
    await page.getByRole('button', { name: 'Generate draft' }).click();
    await expect(page.getByLabel('Email subject', { exact: true })).toHaveValue('Hello Asha Sample from FlexiOrder');
    await expect(page.getByRole('button', { name: 'Open email app' })).toBeEnabled();
    await page.getByLabel('Email subject', { exact: true }).fill('One-off draft');
    await page.getByRole('button', { name: 'Close email preview' }).click();
    await page.getByRole('button', { name: 'Email customer', exact: true }).click();
    await page.getByLabel('Restaurant / agreement scope').selectOption('sample-restaurant-11');
    await page.getByRole('button', { name: 'Generate draft' }).click();
    await expect(page.getByLabel('Email subject', { exact: true })).toHaveValue('Hello Asha Sample from FlexiOrder');
    await page.reload();
    await page.getByRole('button', { name: 'Email customer', exact: true }).click();
    await page.getByLabel('Restaurant / agreement scope').selectOption('sample-restaurant-1');
    await page.getByRole('button', { name: 'Generate draft' }).click();
    await expect(page.getByLabel('Email subject', { exact: true })).toHaveValue(/Welcome to FlexiOrder/);
  });
  test('missing facts stay unknown and block incomplete drafts', async ({ page }) => {
    await installSession(page, 'superadmin');
    await page.goto('/superadmin/customers/sample-customer-3');
    await page.getByRole('tab', { name: 'Usage', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Not tracked');
    await page.getByRole('tab', { name: 'Packages & payments' }).click();
    await expect(page.getByRole('tabpanel')).toContainText('Not recorded');
    await page.getByRole('button', { name: 'Email customer', exact: true }).click();
    await page.getByRole('button', { name: 'Generate draft' }).click();
    await expect(page.getByRole('button', { name: 'Open email app' })).toBeDisabled();
    await expect(page.getByRole('textbox', { name: 'Email body', exact: true })).not.toHaveValue(/completed successfully/);
    await page.getByRole('button', { name: 'Close customer profile' }).click();
    await page.getByRole('link', { name: 'Sample Missing Contact' }).click();
    await expect(page.getByRole('button', { name: 'Email customer', exact: true })).toBeDisabled();
  });
  test('empty, error, expired and invalid profile recover', async ({ page }) => {
    await installSession(page, 'superadmin');
    await page.goto('/superadmin/customers?scenario=empty');
    await expect(page.getByRole('heading', { name: 'No customers found' })).toBeVisible();
    await page.getByRole('button', { name: 'Reset view' }).click();
    await expect(page.getByRole('link', { name: 'Sample Orchard Hospitality' })).toBeVisible();
    for (const scenario of ['error', 'expired', 'unavailable']) {
      await page.goto(`/superadmin/customers?scenario=${scenario}`);
      await expect(page.getByRole('alert')).toContainText('Customer preview unavailable');
      await page.getByRole('button', { name: 'Restore sample data' }).click();
      await expect(page.getByRole('link', { name: 'Sample Orchard Hospitality' })).toBeVisible();
    }
    await page.goto('/superadmin/customers/invalid-id');
    await expect(page.getByRole('dialog')).toContainText('not found');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  for (const role of ['owner', 'staff', null]) {
    test(`${role || 'signed out'} cannot load customer prototype`, async ({ page }) => {
      const requests = [];
      page.on('request', request => { if (/CustomersPage|adminCustomers/.test(request.url())) requests.push(request.url()); });
      if (role) { await installSession(page, role); await mockStaffWorkspace(page); }
      await page.goto('/superadmin/customers/sample-customer-1');
      await expect(page).not.toHaveURL(/superadmin\/customers/);
      await expect(page.getByRole('heading', { name: 'Sample Orchard Hospitality' })).toHaveCount(0);
      expect(requests).toEqual([]);
    });
  }
});
