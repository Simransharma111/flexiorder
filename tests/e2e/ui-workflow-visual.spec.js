import { test, expect } from '@playwright/test';
import { installSession, mockStaffWorkspace, fulfillJson } from './helpers';
for (const width of [360, 1280]) {
  test(`daily workflow screenshots ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await installSession(page, 'owner');
    await mockStaffWorkspace(page);
    await page.route('**/menu/categories/hotel-1', route => fulfillJson(route, []));
    await page.goto('/owner/dashboard');
    await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
    const root = testInfo.outputPath("screenshots");
    await page.screenshot({ path: `${root}/owner-today-${width}.png`, fullPage: false, animations: "disabled" });
    await page.getByRole('navigation', { name: width < 768 ? 'Owner primary navigation' : 'Owner navigation', exact: true }).getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByText('Paneer Tikka', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.screenshot({ path: `${root}/owner-menu-${width}.png`, fullPage: false, animations: "disabled" });
    await page.goto('/owner/order');
    await page.getByRole('tab', { name: 'Take Order' }).click();
    await expect(page.getByRole('button', { name: 'Table 8' })).toBeVisible();
    await page.screenshot({ path: `${root}/waiter-locations-${width}.png`, fullPage: false, animations: "disabled" });
    await page.getByRole('button', { name: 'Table 8' }).click();
    await page.getByRole('button', { name: 'Add Paneer Tikka' }).click();
    await page.screenshot({ path: `${root}/waiter-menu-${width}.png`, fullPage: false, animations: "disabled" });
    await page.getByRole('button', { name: 'Review order, 1 item' }).click();
    await expect(page.getByRole('region', { name: 'Selected order items' })).toBeInViewport();
    await page.screenshot({ path: `${root}/waiter-review-${width}.png`, animations: "disabled" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
