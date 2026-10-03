import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeQrCode, saveTableQr, tableLabel, tableQrUrl, validateAssignment, validateLocation } from './tableQr';

const location = { _id: 't1', hotelId: 'h1', type: 'table', tableNumber: '01', qrId: null };
function server({ failure, registration = {}, locations = [] } = {}) {
  let rows = structuredClone(locations);
  const api = {
    get: vi.fn(async () => ({ data: { tables: structuredClone(rows) } })),
    post: vi.fn(async (url, body) => {
      if (url === '/table') { rows.push({ ...location, ...body }); return { data: { table: structuredClone(rows.at(-1)) } }; }
      if (url === '/qr/generate') return { data: { qrCodes: [{ qrId: 'generated_123' }] } };
      return { data: { qr: { qrId: body.qrId, isActive: true, assigned: false, ...registration } } };
    }),
    put: vi.fn(async (url, body) => {
      if (failure) throw failure;
      if (url === '/table/assign-qr') rows = rows.map(t => t._id === body.tableId ? { ...t, qrId: body.qrId } : t);
      else rows = rows.map(t => ({ ...t, tableNumber: body.tableNumber }));
      return { data: { table: structuredClone(rows[0]) } };
    }),
  };
  return api;
}
const draft = (changes = {}) => ({ name: '01', type: 'table', method: 'auto', code: '', table: null, ...changes });
afterEach(() => vi.unstubAllGlobals());
describe('Table and room QR contract', () => {
  it('normalizes canonical QR links and preserves case and escaped identifiers', () => {
    vi.stubGlobal('window', { location: { origin: 'https://test.example' } });
    expect(normalizeQrCode(' https://test.example/qr/A%2FB%23C ')).toBe('A/B#C');
    expect(tableQrUrl('A/B#C')).toBe('https://test.example/qr/A%2FB%23C');
    expect(normalizeQrCode('TABLE-A1')).toBe('TABLE-A1');
    expect(() => normalizeQrCode('https://other.example/qr/A')).toThrow();
    expect(() => normalizeQrCode('https://test.example/qr/A?x=1')).toThrow();
    expect(() => normalizeQrCode('https://test.example/cart/A')).toThrow();
    expect(() => normalizeQrCode('x\nY')).toThrow();
  });
  it('keeps leading zeros, avoids duplicated prefixes and rejects local duplicates', () => {
    expect(tableLabel({ type: 'room', tableNumber: 'Room 001' })).toBe('Room 001');
    expect(tableLabel(location)).toBe('Table 01');
    expect(() => validateLocation('01', 'table', [location])).toThrow(/already exists/);
    expect(validateLocation('01', 'room', [location])).toBe('01');
    expect(() => validateAssignment('OLD', [{ ...location, qrId: 'OLD' }], 't2')).toThrow(/already assigned/);
  });
  for (const type of ['table', 'room']) {
    for (const method of ['auto', 'manual']) {
      it(`creates ${type} with ${method} through existing APIs, without client hotelId`, async () => {
        const api = server();
        const result = await saveTableQr(api, draft({ type, method, code: method === 'manual' ? 'CUSTOM-01' : '' }), [], () => {}, 'h1');
        expect(result.qrId).toBe(method === 'auto' ? 'generated_123' : 'CUSTOM-01');
        expect(api.post).toHaveBeenCalledWith('/table', { type, tableNumber: '01' });
        expect(api.post).toHaveBeenCalledWith(method === 'auto' ? '/qr/generate' : '/qr/register', method === 'auto' ? { count: 1 } : { qrId: 'CUSTOM-01' });
        expect(api.put).toHaveBeenCalledWith('/table/assign-qr', { tableId: 't1', qrId: result.qrId });
      });
    }
  }
  it('retains generated code and table across a failed assignment then retries only assignment', async () => {
    const api = server({ failure: new Error('Network lost') });
    let progress = draft();
    await expect(saveTableQr(api, progress, [], p => { progress = p; }, 'h1')).rejects.toThrow('Network lost');
    expect(progress.table._id).toBe('t1'); expect(progress.code).toBe('generated_123');
    api.put.mockResolvedValue({ data: { table: { ...location, qrId: progress.code } } });
    await saveTableQr(api, progress, [], () => {}, 'h1');
    expect(api.post.mock.calls.map(c => c[0])).toEqual(['/table', '/qr/generate']);
  });
  it('recognizes a successful assignment whose response was lost', async () => {
    const api = server({ locations: [location] });
    api.put.mockImplementation(async () => {
      api.get.mockResolvedValue({ data: { tables: [{ ...location, qrId: 'CODE' }] } });
      throw new Error('Lost reply');
    });
    const result = await saveTableQr(api, draft({ table: location, method: 'manual', code: 'CODE' }), [location], () => {}, 'h1');
    expect(result.qrId).toBe('CODE');
  });
  it('blocks assignment that was added by another device before save', async () => {
    const api = server({ locations: [location, { ...location, _id: 't2', tableNumber: '02', qrId: 'CODE' }] });
    await expect(saveTableQr(api, draft({ table: location, method: 'manual', code: 'CODE' }), [location], () => {}, 'h1')).rejects.toThrow(/already assigned/);
    expect(api.put).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled();
  });
  it.each([{ hotelId: 'other' }, { tableId: 'other' }, { assigned: true }, { isActive: false }])('rejects unsafe registration ownership/status %j', async registration => {
    const api = server({ locations: [location], registration });
    await expect(saveTableQr(api, draft({ table: location, method: 'manual', code: 'CODE' }), [location], () => {}, 'h1')).rejects.toThrow();
    expect(api.put).not.toHaveBeenCalled();
  });
  it('does not generate or reassign when keeping an existing QR', async () => {
    const table = { ...location, qrId: 'KEEP' }; const api = server({ locations: [table] });
    expect((await saveTableQr(api, draft({ table, method: 'keep' }), [table], () => {}, 'h1')).qrId).toBe('KEEP');
    expect(api.post).not.toHaveBeenCalled(); expect(api.put).not.toHaveBeenCalled();
  });
  it('reports unsupported rename without generating/replacing QR', async () => {
    const api = server({ locations: [location], failure: { response: { status: 404 } } });
    await expect(saveTableQr(api, draft({ table: location, name: '02' }), [location], () => {}, 'h1')).rejects.toThrow(/does not support name changes/);
    expect(api.post).not.toHaveBeenCalled();
  });
  it('recovers uncertain table creation before retrying', async () => {
    const api = server({ locations: [location] });
    await saveTableQr(api, draft({ uncertainCreate: true }), [], () => {}, 'h1');
    expect(api.post.mock.calls.map(c => c[0])).toEqual(['/qr/generate']);
  });
  it('blocks later pipeline writes if the signed-in account changed', async () => {
    let token = 'first'; vi.stubGlobal('localStorage', { getItem: () => token });
    const api = server(); api.post.mockImplementation(async () => { token = 'second'; return { data: { table: location } }; });
    await expect(saveTableQr(api, draft(), [], () => {}, 'h1')).rejects.toThrow(/account changed/);
    expect(api.post).toHaveBeenCalledTimes(1); expect(api.put).not.toHaveBeenCalled();
  });
});

it('rejects dot-only codes whose URLs would leave the public QR route', () => {
  expect(() => normalizeQrCode('.')).toThrow(/dot/);
  expect(() => normalizeQrCode('..')).toThrow(/dot/);
});
it('preserves a confirmed scanner identifier that resembles a relative link', async () => {
  const api = server({ locations: [location] });
  const result = await saveTableQr(api, draft({ table: location, method: 'manual', code: '/qr/legacy-code', codeNormalized: true }), [location], () => {}, 'h1');
  expect(result.qrId).toBe('/qr/legacy-code');
  expect(api.post).toHaveBeenCalledWith('/qr/register', { qrId: '/qr/legacy-code' });
});
it('does not overwrite another device QR when reconciling uncertain creation', async () => {
  const api = server({ locations: [{ ...location, qrId: 'OTHER-DEVICE' }] });
  await expect(saveTableQr(api, draft({ uncertainCreate: true }), [], () => {}, 'h1')).rejects.toThrow(/already has a QR/);
  expect(api.post).not.toHaveBeenCalled(); expect(api.put).not.toHaveBeenCalled();
});
it('does not reverse another device rename while saving only a QR change', async () => {
  const api = server({ locations: [{ ...location, tableNumber: 'Patio' }] });
  await expect(saveTableQr(api, draft({ table: location, method: 'manual', code: 'NEW' }), [location], () => {}, 'h1')).rejects.toThrow(/name changed on another device/);
  expect(api.post).not.toHaveBeenCalled(); expect(api.put).not.toHaveBeenCalled();
});
