import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { filterDirectory, loadDirectory, mapDirectory } from './liveAdminCustomers';

vi.mock('./axios', () => ({ default: { get: vi.fn() } }));
const id = (n) => n.toString(16).padStart(24, '0');
const hotel = (n, owner = { _id: id(100), name: 'Alice', email: 'a@example.test' }) => ({
  _id: id(n), name: `Restaurant ${n}`, isActive: true, owner,
  createdAt: '2026-01-01T00:00:00.000Z',
});
beforeEach(() => vi.resetAllMocks());

describe('mapDirectory', () => {
  it('groups only identical owner IDs and never merges accounts by shared email', () => {
    const records = mapDirectory([hotel(1), hotel(2), hotel(3, { _id: id(101), name: 'Alice', email: 'a@example.test' })]);
    expect(records).toHaveLength(2);
    expect(records[0].restaurants.map((r) => r.id)).toEqual([id(1), id(2)]);
    expect(records[0].reference).toBe(`Owner ${id(100)}`);
    expect(records[1].id).toBe(`owner-${id(101)}`);
  });

  it('keeps ownerless restaurants separate and unknown facts null', () => {
    const records = mapDirectory([hotel(1, null), { ...hotel(2, null), isActive: undefined, createdAt: 'not a date' }]);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ id: `hotel-${id(1)}`, reference: `Restaurant ${id(1)}`, ownerId: null, name: null, email: null, registeredAt: null, status: 'unknown' });
    expect(records[1].restaurants[0]).toMatchObject({ status: 'unknown', createdAt: null, plan: null, subscriptionExpiresAt: null });
    expect(mapDirectory([hotel(3)])[0].registeredAt).toBeNull();
  });

  it.each([null, {}, [null], [{ _id: '../other' }], [hotel(1, { _id: '../../users' })], [hotel(1), hotel(1)]])('rejects malformed or ambiguous data %#', (value) => {
    expect(() => mapDirectory(value)).toThrow('invalid customer directory');
  });
});

describe('live API reads', () => {
  it('uses the authenticated shared client and forwards cancellation', async () => {
    const signal = new AbortController().signal;
    api.get.mockResolvedValue({ data: { success: true, hotels: [hotel(1)] } });
    expect(await loadDirectory({ signal })).toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith('/admin/hotels', { signal, adapter: 'fetch', fetchOptions: { cache: 'no-store' } });
  });
  it.each([{ hotels: [] }, { success: false, hotels: [] }, { success: true, hotels: {} }])('rejects malformed envelopes %#', async (data) => {
    api.get.mockResolvedValue({ data });
    await expect(loadDirectory()).rejects.toThrow('invalid customer directory');
  });
  it('propagates API and cancellation failures without demo fallback', async () => {
    const failure = new Error('canceled');
    api.get.mockRejectedValue(failure);
    await expect(loadDirectory()).rejects.toBe(failure);
  });

});

describe('filterDirectory', () => {
  const now = Date.parse('2026-10-09T00:00:00Z');
  it('counts expiry from real dates only and includes a secondary expiring restaurant', () => {
    const records = mapDirectory([
      hotel(1, { _id: id(100), name: 'A', email: 'a@test', subscriptionExpiresAt: '2026-09-01' }),
      hotel(2, { _id: id(100), name: 'A', email: 'a@test', subscriptionExpiresAt: '2026-10-10' }),
      hotel(3, null),
    ]);
    const result = filterDirectory(records, { filter: 'expiring', now });
    expect(result.total).toBe(1);
    expect(result.summary).toEqual({ customers: 2, restaurants: 3, expiring: 1, incomplete: 1 });
  });
  it('filters inactive restaurants only on explicit inactive state', () => {
    const records = mapDirectory([{ ...hotel(1), isActive: undefined }, { ...hotel(2, null), isActive: false }]);
    expect(filterDirectory(records, { filter: 'inactive' }).items.map((r) => r.id)).toEqual([`hotel-${id(2)}`]);
  });
  it('searches restaurant data, pages 25 records, and does not mutate input', () => {
    const records = mapDirectory(Array.from({ length: 30 }, (_, i) => hotel(i + 1, null)));
    const before = JSON.stringify(records);
    expect(filterDirectory(records).items).toHaveLength(25);
    expect(filterDirectory(records, { page: 2 }).items).toHaveLength(5);
    expect(filterDirectory(records, { search: 'restaurant 30' }).total).toBe(1);
    filterDirectory(records, { sort: 'expiry' });
    expect(JSON.stringify(records)).toBe(before);
  });
});
