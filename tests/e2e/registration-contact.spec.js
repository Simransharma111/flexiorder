import { expect, test } from '@playwright/test';
import { fulfillJson, hotel, installSession, isolateTestNetwork, makeToken, mockStaffWorkspace } from './helpers';

for (const returnsPhone of [true, false]) {
  test(`registration carries phone to editable restaurant setup when API ${returnsPhone ? 'includes' : 'omits'} phone`, async ({ page }) => {
    await isolateTestNetwork(page);
    await page.route('**/auth/register', route => {
      const data = route.request().postDataJSON();
      expect(data.name).toBe('Meera Owner');
      expect(data.phone).toBe('9876543210');
      return fulfillJson(route, { user: { id: 'new-owner', role: 'owner', name: data.name, email: data.email, hotelId: null, ...(returnsPhone ? { phone: data.phone } : {}) }, token: makeToken('new-owner'), hotelSetupCompleted: false });
    });
    await page.goto('/register');
    await page.getByRole('textbox', { name: 'Your name (owner account)' }).fill('Meera Owner');
    await page.getByRole('textbox', { name: 'Contact phone (used for restaurant setup)' }).fill('9876543210');
    await page.getByPlaceholder('Email Address').fill('meera@example.test');
    await page.getByPlaceholder('Password', { exact: true }).fill('Password123!');
    await page.getByPlaceholder('Confirm Password', { exact: true }).fill('Password123!');
    for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page).toHaveURL(/\/setup-hotel$/);
    const phone = page.getByRole('textbox', { name: 'Restaurant contact phone', exact: true });
    await expect(phone).toHaveValue('9876543210');
    await expect(page.getByRole('textbox', { name: 'Restaurant name', exact: true })).toHaveValue('');
    await phone.fill('9123456789');
    await expect(phone).toHaveValue('9123456789');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).name)).toBe('Meera Owner');
    await mockStaffWorkspace(page);
    await page.route('**/hotel/setup', route => {
      expect(route.request().method()).toBe('PUT');
      const body = route.request().postData();
      expect(body).toContain('name="phone"\r\n\r\n9123456789');
      expect(body).toContain('name="name"\r\n\r\nMeera Restaurant');
      return fulfillJson(route, { user: { id: 'new-owner', role: 'owner', name: 'Meera Owner', hotelId: 'hotel-1' } });
    });
    await page.getByRole('textbox', { name: 'Restaurant name', exact: true }).fill('Meera Restaurant');
    await page.getByPlaceholder('Hotel address').fill('Test Street');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: /Complete Hotel Setup/ }).click();
    await expect(page).toHaveURL(/\/owner\/dashboard$/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('user')).setupContactPhone)).toBeUndefined();
  });
}

test('superadmin refreshes saved restaurant phone on return and explains staff cleanup before delete', async ({ page }) => {
  await installSession(page, 'superadmin');
  let restaurant = { ...hotel, phone: '9876543210', owner: { _id: 'owner-1', name: 'Owner account', email: 'owner@example.test', phone: '9000000000' } };
  let writes = 0;
  await page.route('**/admin/hotels', route => fulfillJson(route, { hotels: [restaurant] }));
  await page.route('**/admin/hotels/hotel-1', route => { writes++; return fulfillJson(route, { success: true }); });
  await page.goto('/superadmin');
  await expect(page.getByText('Restaurant contact: 9876543210', { exact: true })).toBeVisible();
  restaurant = { ...restaurant, phone: '9123456789' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Restaurant contact: 9123456789', { exact: true })).toBeVisible();
  await expect(page.getByText('9000000000', { exact: true })).toHaveCount(0);
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('does NOT delete staff automatically');
    expect(dialog.message()).toContain('remove every staff account');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  expect(writes).toBe(0);
  await expect(page.getByText('Restaurant contact: 9123456789', { exact: true })).toBeVisible();
});


test('restaurant phone save requires confirmation and survives owner and administrator reloads', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  let saved = { ...hotel, menuMode: 'visual', phone: '9876543210' };
  let accept = false;
  await page.route('**/hotel/me', route => fulfillJson(route, { hotel: saved }));
  await page.route('**/hotel/profile', route => {
    const body = route.request().postDataJSON();
    expect(body.phone).toBe('9123456789');
    if (accept) saved = { ...saved, ...body };
    return fulfillJson(route, { hotel: saved });
  });
  const openSettings = async () => {
    if ((page.viewportSize()?.width || 0) < 768) await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).filter({ visible: true }).click();
  };
  await page.goto('/owner/dashboard');
  await openSettings();
  const phone = page.getByRole('textbox', { name: 'Restaurant contact phone', exact: true });
  await phone.fill('9123456789');
  page.once('dialog', async dialog => {
    expect(dialog.message()).toContain('did not confirm the saved name and contact phone');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await expect(phone).toHaveValue('9876543210');
  accept = true;
  await phone.fill('9123456789');
  const savedDialog = page.waitForEvent('dialog').then(async dialog => {
    expect(dialog.message()).toBe('Profile updated successfully');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
  await savedDialog;
  await expect.poll(() => saved.phone).toBe('9123456789');
  await page.reload();
  await openSettings();
  await expect(phone).toHaveValue('9123456789');
  await installSession(page, 'superadmin');
  await page.route('**/admin/hotels', route => fulfillJson(route, { hotels: [saved] }));
  await page.goto('/superadmin');
  await expect(page.getByText('Restaurant contact: 9123456789', { exact: true })).toBeVisible();
});
