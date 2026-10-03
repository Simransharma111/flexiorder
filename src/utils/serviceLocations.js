// A real location understood by the existing API, reserved for staff takeaway.
export const TAKEAWAY_LOCATION_NAME = 'Takeaway';
export const isTakeawayNumber = value => typeof value === 'string' && value.trim().toLowerCase() === 'takeaway';
export const isTakeawayLocation = location => location?.type === 'table' && isTakeawayNumber(location.tableNumber);
export const findTakeawayLocation = locations => [...locations]
  .filter(location => isTakeawayLocation(location) && !location.qrId && location._id)
  .sort((a, b) => String(a._id).localeCompare(String(b._id)))[0] || null;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const locationParts = location => {
  if (typeof location === 'string') {
    const match = location.trim().match(/^(table|room)\s+(.*)$/i);
    return match ? { type: match[1].toLowerCase(), tableNumber: match[2] } : { type: 'other', tableNumber: location };
  }
  return location || {};
};
export const compareServiceLocations = (left, right) => {
  const a = locationParts(left);
  const b = locationParts(right);
  const type = location => {
    if (isTakeawayLocation(location) || location.type === 'other') return 2;
    return (location.type || location.locationType) === 'room' ? 1 : 0;
  };
  const number = location => String(location.tableNumber ?? location.locationNumber ?? location.roomNumber ?? '').trim().replace(/^(?:table|room)\s+/i, '');
  const missing = value => !value || value === '-';
  const aNumber = number(a);
  const bNumber = number(b);
  // Preserve input chronology when tickets share the same location.
  return type(a) - type(b) || Number(missing(aNumber)) - Number(missing(bNumber)) || collator.compare(aNumber, bNumber);
};
export const sortServiceLocations = locations => [...locations].sort((a, b) =>
  compareServiceLocations(a, b) || String(a._id || '').localeCompare(String(b._id || '')));
const locationsFrom = response => {
  const rows = response.data?.tables || response.data;
  if (!Array.isArray(rows)) throw new Error('Could not read the location list. Refresh and try again.');
  return rows;
};
export async function enableTakeawayLocation(api, isCurrent) {
  const check = () => { if (!isCurrent()) throw new Error('Your account changed. Reopen Tables & Rooms.'); };
  const read = async () => { check(); const result = await api.get('/table', { timeout: 15000 }); check(); return locationsFrom(result); };
  const rows = await read();
  const existing = findTakeawayLocation(rows);
  if (existing) return existing;
  if (rows.some(isTakeawayLocation)) throw new Error('The Takeaway location has a guest QR. Remove that QR in Tables & Rooms before enabling staff takeaway.');
  try {
    check();
    const result = await api.post('/table', { tableNumber: TAKEAWAY_LOCATION_NAME, type: 'table' }, { timeout: 15000 });
    check();
    const table = result.data?.table;
    if (result.data?.success === false || !isTakeawayLocation(table) || !table._id || table.qrId) throw new Error('Takeaway setup was not confirmed. Refresh before retrying.');
    return table;
  } catch (error) {
    check();
    // Recover a saved location after a lost reply, including another owner's setup.
    const saved = findTakeawayLocation(await read());
    if (saved) return saved;
    throw error;
  }
}
export async function prepareLegacyTakeawayPayload(api, payload, hotelId) {
  if (payload?.orderType !== 'takeaway' || payload.tableId) return payload;
  if (!hotelId) throw new Error('Sign in to the restaurant before syncing takeaway.');
  const rows = locationsFrom(await api.get(`/public/tables/${encodeURIComponent(hotelId)}`, { timeout: 15000 }));
  const location = findTakeawayLocation(rows);
  if (!location) {
    const message = 'Ask the owner to enable takeaway orders in Tables & Rooms, then retry this saved order.';
    throw Object.assign(new Error(message), { response: { status: 409, data: { message } } });
  }
  return { ...payload, tableId: location._id, orderType: 'now' };
}
