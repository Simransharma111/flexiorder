import { expect, test } from '@playwright/test';
import { fulfillJson, hotel, installSession } from './helpers';

const starters = { _id: '64a1f0000000000000000001', name: 'Starters', displayOrder: 1, subCategories: ['Veg'], description: 'Before your main' };
const mains = { _id: '64a1f0000000000000000002', name: 'Mains', displayOrder: 2, subCategories: ['Veg'] };
const dishes = [
  { _id: 'curry', name: 'Curry', price: 200, categoryId: mains._id, category: 'Mains', subCategory: 'Veg', isAvailable: true },
  { _id: 'soup', name: 'Soup', price: 100, categoryId: starters._id, category: 'Starters', subCategory: 'Veg', isAvailable: true },
];

test.beforeEach(async ({ page }) => {
  // Unhandled external requests stay inside the test; never contact production.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    return fulfillJson(route, {});
  });
});

for (const menuMode of ['graphic', 'simple']) {
  test(`${menuMode} menu groups shared subcategories by category and restores positions after reload`, async ({ page }) => {
    await page.route('**/qr/menu/category-test', route => fulfillJson(route, { hotel: { ...hotel, menuMode, orderingEnabled: false }, table: null, dishes }));
    await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, [mains, starters]));
    await page.goto('/qr/category-test');
    const headings = page.locator('.guest-category-heading');
    await expect(headings).toHaveText(['Starters', 'Mains']);
    const groups = page.locator('.guest-subcategory-group');
    await expect(groups.first()).toContainText('Soup');
    await expect(groups.first()).not.toContainText('Curry');
    await expect(groups.last()).toContainText('Curry');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await expect(headings).toHaveText(['Starters', 'Mains']);
    if (menuMode === 'simple') await expect(page.locator('.guest-simple-menu img')).toHaveCount(0);
  });
}

test('menu remains usable while category catalog is pending or fails', async ({ page }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/qr/menu/category-test', route => fulfillJson(route, { hotel: { ...hotel, orderingEnabled: false }, table: null, dishes }));
  await page.route('**/menu/categories/hotel-1', async route => {
    await pending;
    return fulfillJson(route, { message: 'Unavailable' }, 503);
  });
  await page.goto('/qr/category-test');
  try { await expect(page.getByText('Soup', { exact: true }).first()).toBeVisible(); }
  finally { release(); }
  await expect(page.getByText('Curry', { exact: true }).first()).toBeVisible();
});

test('owner can reach category editor and save a position without losing category fields', async ({ page }) => {
  await installSession(page, 'owner');
  let categories = [{ ...starters }, { ...mains }];
  let saved;
  await page.route('**/hotel/me', route => fulfillJson(route, { hotel }));
  await page.route(/\/kitchen\/orders(?:\?.*)?$/, route => fulfillJson(route, { orders: [] }));
  await page.route('**/menu/hotel-1', route => fulfillJson(route, dishes));
  await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, categories));
  await page.route(`**/menu/category/${starters._id}`, route => {
    saved = route.request().postDataJSON();
    categories = categories.map(category => category._id === starters._id ? { ...category, ...saved } : category);
    return fulfillJson(route, categories.find(category => category._id === starters._id));
  });
  await page.goto('/owner/dashboard');
  if ((page.viewportSize()?.width || 0) < 768) await page.getByRole('button', { name: 'Open owner menu' }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Manage categories', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Starters category' }).click();
  await page.getByLabel('Category position', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Update Category', exact: true }).click();
  await expect(page.getByText('Category saved.', { exact: false })).toBeVisible();
  expect(saved).toMatchObject({ name: 'Starters', displayOrder: 3, subCategories: ['Veg'], description: 'Before your main' });
  await page.getByRole('button', { name: 'Edit Starters category' }).click();
  await expect(page.getByLabel('Category position', { exact: true })).toHaveValue('3');
});
