import api from './axios';

const OBJECT_ID = /^[a-f\d]{24}$/i;
const DAY = 24 * 60 * 60 * 1000;
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const validId = (value) => typeof value === 'string' && OBJECT_ID.test(value);
const date = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
};
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const invalid = () => new Error('The server returned an invalid customer directory response.');

export function mapDirectory(hotels) {
  if (!Array.isArray(hotels)) throw invalid();
  const customers = new Map();
  const seenHotels = new Set();
  for (const hotel of hotels) {
    if (!object(hotel) || !validId(hotel._id) || seenHotels.has(hotel._id)) throw invalid();
    seenHotels.add(hotel._id);
    const owner = hotel.owner;
    if (owner != null && (!object(owner) || !validId(owner._id))) throw invalid();
    const ownerId = owner?._id ?? null;
    const id = ownerId ? `owner-${ownerId}` : `hotel-${hotel._id}`;
    if (!customers.has(id)) {
      customers.set(id, {
        id,
        reference: ownerId ? `Owner ${ownerId}` : `Restaurant ${hotel._id}`,
        name: text(owner?.name),
        email: text(owner?.email),
        ownerId,
        status: text(owner?.accountStatus) ?? 'unknown',
        restaurants: [],
        // The directory API does not return the owner's registration date.
        registeredAt: null,
      });
    }
    customers.get(id).restaurants.push({
      id: hotel._id,
      name: text(hotel.name),
      phone: text(hotel.phone),
      address: text(hotel.address),
      status: hotel.isActive === true ? 'active' : hotel.isActive === false ? 'inactive' : 'unknown',
      createdAt: date(hotel.createdAt),
      updatedAt: date(hotel.updatedAt),
      plan: text(owner?.subscriptionPlan),
      subscriptionStartedAt: date(owner?.subscriptionStartedAt),
      subscriptionExpiresAt: date(owner?.subscriptionExpiresAt),
    });
  }
  return [...customers.values()];
}

export async function loadDirectory({ signal } = {}) {
  const { data } = await api.get('/admin/hotels', { signal, adapter: 'fetch', fetchOptions: { cache: 'no-store' } });
  if (data?.success !== true || !Array.isArray(data.hotels)) throw invalid();
  return mapDirectory(data.hotels);
}

function expiry(record) {
  const values = record.restaurants.map((restaurant) => Date.parse(restaurant.subscriptionExpiresAt)).filter(Number.isFinite);
  return values.length ? Math.min(...values) : Infinity;
}

export function filterDirectory(records, { search = '', filter = 'all', sort = 'name', page = 1, now = Date.now() } = {}) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now);
  const isExpiring = (record) => record.restaurants.some((restaurant) => {
    const expires = Date.parse(restaurant.subscriptionExpiresAt);
    return Number.isFinite(expires) && expires >= timestamp && expires <= timestamp + 30 * DAY;
  });
  const isIncomplete = (record) => !record.ownerId || !record.name || !record.email || record.restaurants.some((restaurant) => !restaurant.name);
  const summary = {
    customers: records.length,
    restaurants: records.reduce((sum, record) => sum + record.restaurants.length, 0),
    expiring: records.filter(isExpiring).length,
    incomplete: records.filter(isIncomplete).length,
  };
  const needle = String(search).trim().toLocaleLowerCase();
  const matching = records.filter((record) => {
    if (filter === 'expiring' && !isExpiring(record)) return false;
    if (filter === 'incomplete' && !isIncomplete(record)) return false;
    if (filter === 'inactive' && !record.restaurants.some((restaurant) => restaurant.status === 'inactive')) return false;
    const haystack = [record.name, record.email, record.reference, ...record.restaurants.flatMap((restaurant) => [restaurant.id, restaurant.name, restaurant.phone, restaurant.address])].filter(Boolean).join(' ').toLocaleLowerCase();
    return !needle || haystack.includes(needle);
  });
  matching.sort((a, b) => {
    if (sort === 'expiry') {
      const difference = expiry(a) - expiry(b);
      if (Number.isFinite(difference) && difference !== 0) return difference;
      if (expiry(a) !== expiry(b)) return expiry(a) < expiry(b) ? -1 : 1;
    }
    const primary = sort === 'reference' ? a.reference.localeCompare(b.reference) : (a.name ?? '').localeCompare(b.name ?? '');
    return primary || a.id.localeCompare(b.id);
  });
  const pageNumber = Number.isFinite(Number(page)) ? Math.max(1, Math.floor(Number(page))) : 1;
  return { items: matching.slice((pageNumber - 1) * 25, pageNumber * 25), total: matching.length, summary };
}
