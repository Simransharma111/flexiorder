import { getPublicAppUrl } from '../config/env';
import { normalizeEntityId } from './storageScope';

export const tableLabel = table => {
  const prefix = table.type === 'room' ? 'Room' : 'Table';
  const name = String(table.tableNumber || '').trim();
  return new RegExp(`^${prefix}(?:\\s|$)`, 'i').test(name) ? name : `${prefix} ${name}`;
};
export const tableQrUrl = code => `${getPublicAppUrl()}/qr/${encodeURIComponent(String(code))}`;

const hasControlCharacters = value => Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

export function normalizeQrCode(input, { raw = false } = {}) {
  let code = String(input || '').trim();
  if (!raw && /^(?:https?:\/\/|\/)/i.test(code)) {
    let url;
    try { url = new URL(code, getPublicAppUrl()); } catch { throw new Error('Enter a code or a valid FlexiOrder QR link.'); }
    const base = new URL(getPublicAppUrl());
    const match = url.pathname.match(/^\/(?:menu\/)?qr\/([^/]+)\/?$/);
    if (!match || url.origin !== base.origin || url.search || url.hash) throw new Error('Use a QR link from this restaurant app, or enter its code directly.');
    try { code = decodeURIComponent(match[1]); } catch { throw new Error('This QR link contains an unreadable code.'); }
  } else if (!raw && code.includes('://')) throw new Error('Use a FlexiOrder QR link or enter the code directly.');
  if (code === '.' || code === '..') throw new Error('Choose a code other than a single or double dot.');
  if (!code || code.length > 256 || hasControlCharacters(code)) throw new Error('Enter a QR code of 1–256 characters without control characters.');
  return code;
}

export function validateLocation(name, type, tables, exceptId) {
  const value = String(name || '').trim();
  if (!['table', 'room'].includes(type) || !value || value.length > 80 || hasControlCharacters(value)) throw new Error('Enter a table or room name of 1–80 characters.');
  if (tables.some(t => t._id !== exceptId && t.type === type && String(t.tableNumber).trim().toLowerCase() === value.toLowerCase())) throw new Error('That table or room name already exists. Choose another name.');
  return value;
}

export function validateAssignment(code, tables, tableId, codeNormalized = false) {
  const value = normalizeQrCode(code, { raw: codeNormalized });
  const existing = tables.find(t => t.qrId === value && t._id !== tableId);
  if (existing) throw new Error(`This code is already assigned to ${tableLabel(existing)}. Remove that assignment first.`);
  return value;
}

export const readTables = async (api, config) => {
  const response = await api.get('/table', config);
  if (!Array.isArray(response.data?.tables)) throw new Error('The table list could not be read. Refresh and try again.');
  return response.data.tables;
};

// Every write is scoped by the authenticated API. Never send a hotelId from a
// form. The callback retains completed steps if a later request fails.
export async function saveTableQr(api, draft, tables, onProgress, hotelId) {
  let progress = { ...draft, name: String(draft.name || '').trim() };
  const initialSession = globalThis.localStorage?.getItem('token');
  const checkSession = () => {
    if (globalThis.localStorage?.getItem('token') !== initialSession) throw new Error('Your account changed. Reopen Tables & Rooms before saving.');
  };
  const remember = changes => { checkSession(); progress = { ...progress, ...changes }; onProgress(progress); };
  const request = async (method, ...args) => { checkSession(); const result = await api[method](...args); checkSession(); return result; };
  const freshTables = async () => {
    const response = await request('get', '/table');
    if (!Array.isArray(response.data?.tables)) throw new Error('Refresh the table list before saving.');
    return response.data.tables;
  };
  if (!['auto', 'keep', 'manual'].includes(progress.method)) throw new Error('Choose how to set the QR code.');
  // Validate locally before any write; then recheck a fresh list to catch another device.
  if (progress.method === 'manual') validateAssignment(progress.code, tables, progress.table?._id, progress.codeNormalized);
  const current = await freshTables();
  if (progress.uncertainCreate) {
    const found = current.find(t => t.type === progress.type && t.tableNumber === progress.name);
    if (found?.qrId) throw new Error('A table or room with this name already has a QR. Close this form and review its assignment before making changes.');
    remember({ table: found || null, uncertainCreate: false });
  }
  if (progress.table) {
    const latest = current.find(t => t._id === progress.table._id);
    if (!latest) throw new Error('This table or room is no longer available. Refresh the list.');
    if (latest.tableNumber !== progress.table.tableNumber && latest.tableNumber !== progress.name) throw new Error('The name changed on another device. Close this form and refresh before saving.');
    if (latest.qrId !== progress.table.qrId && latest.qrId !== progress.code) throw new Error('The QR changed on another device. Close this form and refresh before replacing it.');
    remember({ table: latest });
  }
  const name = validateLocation(progress.name, progress.type, current, progress.table?._id);
  if (progress.method === 'manual') validateAssignment(progress.code, current, progress.table?._id, progress.codeNormalized);
  if (!progress.table) {
    remember({ uncertainCreate: true });
    try {
      const response = await request('post', '/table', { tableNumber: name, type: progress.type });
      if (response.data?.success === false || !response.data?.table?._id) throw new Error('The server did not confirm the new table. Retry to check its status.');
      remember({ table: response.data.table, uncertainCreate: false });
    } catch (error) {
      // A definitive rejection must not adopt another user's concurrent create.
      if (error.response?.status >= 400 && error.response.status < 500) {
        remember({ uncertainCreate: false });
        throw error;
      }
      const refreshed = await freshTables().catch(() => null);
      if (refreshed) {
        const found = refreshed.find(t => t.type === progress.type && t.tableNumber === name);
        if (found?.qrId) throw new Error('A table or room with this name already has a QR. Close this form and review its assignment before making changes.', { cause: error });
        remember({ table: found || null, uncertainCreate: false });
        if (!found) throw error;
      } else throw error;
    }
  } else if (progress.table.tableNumber !== name) {
    try {
      const response = await request('put', `/table/${encodeURIComponent(progress.table._id)}`, { tableNumber: name });
      if (response.data?.success === false || response.data?.table?._id !== progress.table._id) throw new Error('The name change could not be confirmed. Refresh and try again.');
      remember({ table: response.data.table });
    } catch (error) {
      if (error.response?.status === 404) throw new Error('This server does not support name changes. Keep the current name to save QR changes.', { cause: error });
      const found = (await freshTables().catch(() => [])).find(t => t._id === progress.table._id && t.tableNumber === name);
      if (found) remember({ table: found });
      else throw error;
    }
  }
  if (progress.method === 'keep') return progress.table;
  if (!progress.code && progress.method === 'auto') {
    const response = await request('post', '/qr/generate', { count: 1 });
    const code = response.data?.qrCodes?.[0]?.qrId;
    if (response.data?.success === false || !code) throw new Error('QR generation was not confirmed. Your table is saved; retry to generate its QR.');
    remember({ code: normalizeQrCode(code, { raw: true }), codeNormalized: true, registered: true });
  }
  const code = validateAssignment(progress.code, current, progress.table._id, progress.codeNormalized);
  remember({ code, codeNormalized: true });
  if (progress.table.qrId === code) return progress.table;
  if (!progress.registered) {
    try {
      const response = await request('post', '/qr/register', { qrId: code });
      const qr = response.data?.qr;
      if (response.data?.success === false || qr?.qrId !== code) throw new Error('The server could not confirm this QR code. Please retry.');
      if ((qr.tableId && normalizeEntityId(qr.tableId) !== progress.table._id) || (qr.hotelId && normalizeEntityId(qr.hotelId) !== hotelId) || (qr.assigned && !qr.tableId)) throw new Error('This code is already assigned elsewhere. Use another code.');
      if (qr.isActive === false) throw new Error('This QR code is disabled. Use another code.');
      remember({ registered: true });
    } catch (error) {
      if (error.response?.status !== 404) throw error;
      // Older servers can still assign a code that already exists. Unknown codes
      // produce a visible assignment error, never a made-up successful QR.
    }
  }
  try {
    const response = await request('put', '/table/assign-qr', { tableId: progress.table._id, qrId: code });
    if (response.data?.success === false || response.data?.table?._id !== progress.table._id || response.data?.table?.qrId !== code) throw new Error('QR assignment was not confirmed. Retry to check its status.');
    remember({ table: response.data.table });
  } catch (error) {
    const found = (await freshTables().catch(() => [])).find(t => t._id === progress.table._id && t.qrId === code);
    if (found) { remember({ table: found }); return found; }
    if (error.response?.status === 404) throw new Error('This code could not be assigned by the server. Use Generate QR or an existing FlexiOrder code.', { cause: error });
    throw error;
  }
  return progress.table;
}
