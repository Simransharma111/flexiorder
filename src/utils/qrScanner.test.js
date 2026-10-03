import { afterEach, expect, it, vi } from 'vitest';
import { cameraErrorMessage, startQrScanner } from './qrScanner';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
it('releases a stream whose permission arrives after closing', async () => {
  let resolve; const track = { stop: vi.fn() };
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise(r => { resolve = r; }) } });
  const video = { play: vi.fn(), srcObject: null };
  const stop = startQrScanner(video, { onDetected: vi.fn(), onError: vi.fn() });
  stop(); resolve({ getTracks: () => [track] }); await tick();
  expect(track.stop).toHaveBeenCalled(); expect(video.play).not.toHaveBeenCalled(); expect(video.srcObject).toBeNull();
});
it('detects once and stops the camera before confirmation', async () => {
  const track = { stop: vi.fn() }; const detected = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [track] }) } });
  vi.stubGlobal('BarcodeDetector', class { static async getSupportedFormats() { return ['qr_code']; } async detect() { return [{ rawValue: 'TABLE-01' }]; } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({}) }) });
  startQrScanner({ play: async () => {}, srcObject: null }, { onDetected: detected, onError: vi.fn() });
  await tick(); expect(detected).toHaveBeenCalledExactlyOnceWith('TABLE-01'); expect(track.stop).toHaveBeenCalled();
});
it('reports denied permission and offers manual entry', async () => {
  const error = { name: 'NotAllowedError' }; const report = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => { throw error; } } });
  startQrScanner({}, { onDetected: vi.fn(), onError: report }); await tick();
  expect(report).toHaveBeenCalledWith(error); expect(cameraErrorMessage(error)).toMatch(/enter the code/i);
});
it('reports unavailable and busy cameras clearly', () => {
  expect(cameraErrorMessage({ name: 'NotFoundError' })).toMatch(/No camera/);
  expect(cameraErrorMessage({ name: 'NotReadableError' })).toMatch(/busy/);
});

it('allows same-origin camera access in the website release configuration', async () => {
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));
  const policies = config.headers.flatMap(entry => entry.headers).filter(header => header.key.toLowerCase() === 'permissions-policy');
  expect(policies).toHaveLength(1);
  expect(policies[0].value).toContain('camera=(self)');
  expect(policies[0].value).toContain('microphone=()');
});
