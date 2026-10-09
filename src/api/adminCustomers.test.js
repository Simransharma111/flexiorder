import { describe, expect, it } from 'vitest';
import { get, list, PAGE_SIZE } from './adminCustomers';
describe('synthetic customer adapter', () => {
  it('searches restaurant/owner fields but keeps profile records out of list payloads', async () => {
    const result = await list({ search: 'Riverside' });
    expect(result.total).toBe(1);
    expect(result.items[0].restaurantCount).toBe(2);
    expect(result.items[0]).not.toHaveProperty('notes');
    expect(result.items[0]).not.toHaveProperty('restaurants');
    expect(PAGE_SIZE).toBe(25);
    expect(result.summary.followUp).toBeNull();
    expect(result.items[0].packageLabel).toBe('Mixed / 2 plans');
  });
  it('does not turn untracked activity into inactivity or unknown balances into zero', async () => {
    const inactive = await list({ filter: 'inactive' });
    expect(inactive.items.map((item) => item.id)).toEqual(['sample-customer-4']);
    const unknown = await list({ search: 'Untracked' });
    expect(unknown.summary.outstandingMinor).toBeNull();
    expect(unknown.items[0].outstandingMinor).toBeNull();
  });
  it('separates archived, trial and incomplete records', async () => {
    expect((await list({ filter: 'archived' })).items[0].id).toBe('sample-customer-6');
    expect((await list({ filter: 'trial' })).items[0].id).toBe('sample-customer-2');
    expect((await list({ filter: 'incomplete' })).total).toBe(2);
    expect((await list()).items.some((item) => item.status === 'archived')).toBe(false);
  });
  it('isolates each response and supports abort, missing and distinct simulated states', async () => {
    const first = await get('sample-customer-1');
    first.restaurants[0].ownerName = 'Changed';
    expect((await get(first.id)).restaurants[0].ownerName).toBe('Asha Sample');
    expect((await list({ scenario: 'empty' })).items).toEqual([]);
    expect((await list({ page: Infinity })).items.length).toBeGreaterThan(0);
    await expect(list({ scenario: 'expired' })).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await expect(list({ scenario: 'error' })).rejects.toMatchObject({ code: 'API_ERROR' });
    await expect(list({ scenario: 'unavailable' })).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(get('not-an-id')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    const controller = new AbortController(); controller.abort();
    await expect(list({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
