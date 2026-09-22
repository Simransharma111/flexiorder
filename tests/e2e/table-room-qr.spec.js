import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { fulfillJson, installSession, installNativeBridge, hotel, dishes } from './helpers';

async function setup(page, initial = []) {
  await installSession(page, 'owner');
  const state = { tables: structuredClone(initial), calls: [], failAssign: false, lostReply: false };
  await page.route('**/table', async route => {
    if (route.request().method() === 'GET') return fulfillJson(route, { tables: state.tables });
    const body = route.request().postDataJSON(); state.calls.push(['create', body]);
    const table = { ...body, _id: `table-${state.tables.length + 1}`, hotelId: 'hotel-1', qrId: null };
    state.tables.push(table); return fulfillJson(route, { success: true, table }, 201);
  });
  await page.route('**/qr/generate', route => {
    state.calls.push(['generate', route.request().postDataJSON()]);
    return fulfillJson(route, { success: true, qrCodes: [{ qrId: `AUTO-${state.calls.length}` }] }, 201);
  });
  await page.route('**/qr/register', route => {
    const { qrId } = route.request().postDataJSON(); state.calls.push(['register', { qrId }]);
    return fulfillJson(route, { success: true, qr: { qrId, assigned: false, isActive: true } }, 201);
  });
  await page.route('**/table/assign-qr', route => {
    const body = route.request().postDataJSON(); state.calls.push(['assign', body]);
    if (state.failAssign) return fulfillJson(route, { success: false, message: 'Assignment temporarily unavailable' }, 503);
    const table = state.tables.find(t => t._id === body.tableId); table.qrId = body.qrId;
    if (state.lostReply) return route.abort('failed');
    return fulfillJson(route, { success: true, table, qr: { qrId: table.qrId } });
  });
  await page.route('**/qr/remove-qr', route => {
    const body = route.request().postDataJSON(); state.calls.push(['remove', body]);
    state.tables.find(t => t._id === body.tableId).qrId = null;
    return fulfillJson(route, { success: true });
  });
  await page.route(/\/table\/table-\d+$/, route => fulfillJson(route, { message: 'Not found' }, 404));
  await page.goto('/qr');
  await expect(page.getByRole('heading', { name: 'Tables & Rooms', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh tables and rooms' })).toBeEnabled();
  return state;
}
const assigned = (type, number, qrId = `CODE-${number}`) => ({ _id: `table-${number}`, tableNumber: String(number), type, hotelId: 'hotel-1', qrId });
const cardFor = (page, name) => page.getByRole('article', { name, exact: true });

for (const type of ['Table', 'Room']) for (const method of ['auto', 'manual', 'scan']) {
  test(`create ${type} with ${method} QR and retain server assignment after reload`, async ({ page }) => {
    const state = await setup(page);
    if (method === 'scan') await installQrCamera(page, `SCAN-${type}`);
    await page.getByRole('button', { name: `Add ${type}`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Add ${type}`, exact: true });
    await dialog.getByLabel('Name / Number').fill('001');
    if (method === 'manual') {
      await dialog.getByRole('button', { name: 'Enter Code', exact: true }).click();
      await dialog.getByLabel('QR Code / Code').fill(`${type}-001`);
    }
    if (method === 'scan') {
      await dialog.getByRole('button', { name: 'Scan QR', exact: true }).click();
      const scanner = page.getByRole('dialog', { name: 'Scan QR', exact: true });
      await expect(scanner.getByText(`SCAN-${type}`, { exact: true })).toBeVisible();
      expect(state.calls).toHaveLength(0);
      await scanner.getByRole('button', { name: 'Use this code' }).click();
      await expect(dialog.getByLabel('QR Code / Code')).toHaveValue(`SCAN-${type}`);
      expect(await page.evaluate(() => window.__qrCameraStopped)).toBe(true);
    }
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(cardFor(page, `${type} 001`)).toContainText('Assigned');
    expect(state.calls.filter(c => c[0] === 'create')).toHaveLength(1);
    expect(state.calls[0][1]).toEqual({ type: type.toLowerCase(), tableNumber: '001' });
    await page.reload();
    await expect(cardFor(page, `${type} 001`)).toContainText(state.tables[0].qrId);
  });
}

// Actual bundled QR decoder, fed a canvas video stream instead of a physical camera.
async function installQrCamera(page, code) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: code, size: 640, marginSize: 4, xmlns: "http://www.w3.org/2000/svg" }));
  await page.evaluate(async svgText => {
    window.BarcodeDetector = undefined;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 640;
    const img = new Image(); img.src = `data:image/svg+xml;base64,${btoa(svgText)}`; await img.decode();
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const stream = canvas.captureStream(8); const track = stream.getVideoTracks()[0];
    const stop = track.stop.bind(track); track.stop = () => { window.__qrCameraStopped = true; stop(); };
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => stream });
    // A frame after video.play ensures the same WebRTC video path as a camera.
    const interval = setInterval(() => ctx.drawImage(img, 0, 0), 100);
    track.addEventListener('ended', () => clearInterval(interval));
  }, svg);
}

test('partial save retries reuse table and generated code; lost response is reconciled', async ({ page }) => {
  const state = await setup(page); state.failAssign = true;
  await page.getByRole('button', { name: 'Add Table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Table', exact: true });
  await dialog.getByLabel('Name / Number').fill('4'); await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('temporarily unavailable');
  state.failAssign = false; state.lostReply = true;
  await dialog.getByRole('button', { name: 'Retry Save' }).click(); await expect(dialog).toHaveCount(0);
  expect(state.calls.filter(c => c[0] === 'create')).toHaveLength(1);
  expect(state.calls.filter(c => c[0] === 'generate')).toHaveLength(1);
  await expect(cardFor(page, 'Table 4')).toContainText('Assigned');
});

for (const type of ['table', 'room']) test(`edit existing ${type}, replace and remove QR without changing identity`, async ({ page }) => {
  const state = await setup(page, [assigned(type, 1)]);
  const card = cardFor(page, `${type === 'room' ? 'Room' : 'Table'} 1`);
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Enter Code', exact: true }).click();
  await dialog.getByLabel('QR Code / Code').fill('REPLACED');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click(); await expect(dialog).toHaveCount(0);
  await expect(card).toContainText('REPLACED'); expect(state.calls.some(c => c[0] === 'create')).toBe(false);
  await card.getByRole('button', { name: 'Remove QR', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Remove QR assignment' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(state.tables[0].qrId).toBe('REPLACED');
  await card.getByRole('button', { name: 'Remove QR', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm Remove QR' }).click();
  await expect(card).toContainText('Not assigned'); expect(state.tables[0]._id).toBe('table-1');
});

test('rejects duplicate QR before registering and reports unavailable name editing', async ({ page }) => {
  const state = await setup(page, [assigned('table', 1), assigned('room', 2)]);
  await cardFor(page, 'Room 2').getByRole('button', { name: 'Scan / Replace QR' }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByLabel('QR Code / Code').fill('CODE-1');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('already assigned');
  expect(state.calls).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Keep current' }).click();
  await dialog.getByLabel('Name / Number').fill('3'); await dialog.getByRole('button', { name: 'Retry Save' }).click();
  await expect(dialog.getByRole('alert')).toContainText('does not support name changes');
  expect(state.tables[1].tableNumber).toBe('2'); expect(state.tables[1].qrId).toBe('CODE-2');
});

test('camera denial has usable manual fallback and small-screen forms do not overflow', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 360, height: 740 });
  await page.evaluate(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => { throw new DOMException('Denied', 'NotAllowedError'); } }));
  await page.getByRole('button', { name: 'Add Room', exact: true }).click();
  await page.getByRole('button', { name: 'Scan QR', exact: true }).click();
  const scanner = page.getByRole('dialog', { name: 'Scan QR', exact: true });
  await expect(scanner.getByRole('alert')).toContainText('permission was denied');
  await scanner.getByRole('button', { name: 'Enter code instead' }).click();
  await expect(page.getByLabel('QR Code / Code')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('view and download high-resolution image, selected PDF and multipage all PDF', async ({ page }, testInfo) => {
  await setup(page, [assigned('table', 1), assigned('table', 2), assigned('room', 101), assigned('room', 102), assigned('room', 103)]);
  const card = cardFor(page, 'Table 1'); await card.getByRole('button', { name: 'View QR', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Table 1', exact: true });
  await expect(preview.getByRole('link', { name: 'Open Menu' })).toHaveAttribute('href', /\/qr\/CODE-1$/);
  let waiting = page.waitForEvent('download'); await preview.getByRole('button', { name: 'Download QR', exact: true }).click();
  let result = await waiting; expect(result.suggestedFilename()).toBe('Table 1-QR.png'); await result.saveAs(testInfo.outputPath('table-1.png'));
  await preview.getByRole('button', { name: 'Close Table 1', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Select Room 101', exact: true }).check();
  waiting = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download Selected PDF' }).click();
  result = await waiting; await result.saveAs(testInfo.outputPath('selected-qr.pdf'));
  waiting = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download All PDF' }).click();
  result = await waiting; await result.saveAs(testInfo.outputPath('all-qr.pdf'));
  expect(result.suggestedFilename()).toMatch(/\.pdf$/);
});

test('offline retains saved previews and exports while writes are disabled', async ({ page, context }) => {
  const state = await setup(page, [assigned('room', 101)]);
  await expect(cardFor(page, 'Room 101')).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByRole('button', { name: 'Add Table', exact: true })).toBeDisabled();
  await expect(page.getByText(/You are offline. Saved QR codes/)).toBeVisible();
  const waiting = page.waitForEvent('download'); await cardFor(page, 'Room 101').getByRole('button', { name: 'Download QR', exact: true }).click();
  expect((await waiting).suggestedFilename()).toMatch(/Room 101/); expect(state.calls).toHaveLength(0);
  await context.setOffline(false); await expect(page.getByRole('button', { name: 'Add Table', exact: true })).toBeEnabled();
});

test('native QR downloads use the existing filesystem adapter', async ({ page }) => {
  await installNativeBridge(page); await setup(page, [assigned('table', 1)]);
  await cardFor(page, 'Table 1').getByRole('button', { name: 'Download QR', exact: true }).click();
  await expect(page.getByText(/Saved to Downloads\/FlexiOrder/)).toBeVisible();
  expect(await page.evaluate(() => window.__nativeCalls.some(c => c.plugin === 'Filesystem' && c.method === 'writeFile' && c.options.path.includes('Table 1-QR.png')))).toBe(true);
});

test('encoded existing public QR route still fetches its exact code', async ({ page }) => {
  await installSession(page, 'owner');
  let requested = false;
  await page.route('**/qr/menu/A%2FB%23C', route => { requested = true; return fulfillJson(route, { hotel, table: assigned('table', 1, 'A/B#C'), dishes }); });
  await page.goto('/qr/A%2FB%23C');
  await expect(page.getByText('Paneer Tikka', { exact: true }).first()).toBeVisible(); expect(requested).toBe(true);
});

test('refresh updates an open QR preview after another device replaces it', async ({ page }) => {
  const state = await setup(page, [assigned('table', 1)]);
  await cardFor(page, 'Table 1').getByRole('button', { name: 'View QR', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Table 1', exact: true });
  state.tables[0].qrId = 'NEW-DEVICE';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(dialog.getByRole('link', { name: 'Open Menu' })).toHaveAttribute('href', /\/qr\/NEW-DEVICE$/);
  state.tables[0].qrId = null;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(dialog).toHaveCount(0);
});

test('unassignment refuses a QR replaced elsewhere after opening its confirmation', async ({ page }) => {
  const state = await setup(page, [assigned('table', 1)]);
  await cardFor(page, 'Table 1').getByRole('button', { name: 'Remove QR', exact: true }).click();
  state.tables[0].qrId = 'NEW-DEVICE';
  await page.getByRole('button', { name: 'Confirm Remove QR' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('changed on another device');
  expect(state.calls).toHaveLength(0); expect(state.tables[0].qrId).toBe('NEW-DEVICE');
});
