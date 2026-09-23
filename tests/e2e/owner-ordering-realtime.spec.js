import { test, expect } from '@playwright/test';
import { fulfillJson, hotel, installSession, mockStaffWorkspace } from './helpers';

for (const conflicting of [false, true]) {
  test(`Home pause ${conflicting ? 'retains a newer conflicting settings event' : 'accepts its own realtime confirmation without a false error'}`, async ({ page }) => {
    await installSession(page, 'owner');
    await mockStaffWorkspace(page);
    let sendEvent;
    await page.routeWebSocket('**/*', socket => {
      socket.send('0' + JSON.stringify({ sid: 'engine', upgrades: [], pingInterval: 25000, pingTimeout: 20000 }));
      socket.onMessage(message => {
        if (message === '40') socket.send('40' + JSON.stringify({ sid: 'socket' }));
        if (String(message).includes('joinHotelSettings')) sendEvent = payload => socket.send('42' + JSON.stringify(['hotelSettingsUpdated', payload]));
      });
    });
    let paused = false, release;
    await page.route('**/hotel/profile', route => {
      paused = true;
      return fulfillJson(route, { hotel: { ...hotel, orderingEnabled: false } });
    });
    await page.route('**/hotel/me', async route => {
      if (!paused) return fulfillJson(route, { hotel });
      sendEvent({ hotelId: hotel._id, orderingEnabled: conflicting, updatedAt: conflicting ? '2100-01-02T00:00:00Z' : '2100-01-01T00:00:00Z' });
      await new Promise(resolve => { release = resolve; });
      return fulfillJson(route, { hotel: { ...hotel, orderingEnabled: false, updatedAt: '2100-01-01T00:00:00Z' } });
    });
    await page.goto('/owner/dashboard');
    await expect.poll(() => Boolean(sendEvent)).toBe(true);
    await page.getByRole('button', { name: /Ordering Active —/ }).click();
    await expect.poll(() => Boolean(release)).toBe(true);
    if (!conflicting) await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toHaveText('Saving…');
    else await expect(page.getByRole('button', { name: /Ordering Active —/ })).toHaveText('Saving…');
    await expect.poll(() => page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('flexiorder_owner_hotel:'));
      return JSON.parse(localStorage.getItem(key) || '{}').updatedAt;
    })).toBe(conflicting ? '2100-01-02T00:00:00Z' : '2100-01-01T00:00:00Z');
    release();
    if (conflicting) {
      await expect(page.getByRole('alert')).toContainText('changed on another device');
      await expect(page.getByRole('button', { name: /Ordering Active —/ })).toBeEnabled();
    } else {
      await expect(page.getByRole('button', { name: /Ordering Paused —/ })).toHaveText('Ordering Paused');
      await expect(page.getByRole('alert')).toHaveCount(0);
    }
  });
}
