import { afterEach, expect, it, vi } from 'vitest';
import { qrCardPlacement, renderQrCard, downloadTableQrPdf } from './tableQrExport';

afterEach(() => vi.unstubAllGlobals());
it('keeps every complete card inside A4 margins across many pages', () => {
  for (let index = 0; index < 205; index++) {
    const card = qrCardPlacement(index);
    expect(card.page).toBe(Math.floor(index / 4));
    expect(card.x).toBeGreaterThanOrEqual(12);
    expect(card.y).toBeGreaterThanOrEqual(12);
    expect(card.x + card.width).toBeLessThanOrEqual(198);
    expect(card.y + card.height).toBeLessThanOrEqual(285);
  }
  const first = qrCardPlacement(0), right = qrCardPlacement(1), below = qrCardPlacement(2);
  expect(first.x + first.width).toBeLessThan(right.x);
  expect(first.y + first.height).toBeLessThan(below.y);
});
it('never silently drops empty or unassigned PDF selections', async () => {
  await expect(downloadTableQrPdf([])).rejects.toThrow(/Select at least one/);
  await expect(downloadTableQrPdf([{ tableNumber: '1', type: 'table', qrId: 'OK' }, { tableNumber: '2', type: 'room' }])).rejects.toThrow(/Every selected/);
});
it('rejects a missing QR before touching canvas', async () => {
  await expect(renderQrCard({ type: 'room', tableNumber: '101' })).rejects.toThrow(/Room 101 has no QR/);
});
