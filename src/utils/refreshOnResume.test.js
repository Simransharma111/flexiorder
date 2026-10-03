import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ native: false, on: vi.fn(), off: vi.fn(), addListener: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.addListener } }));
vi.mock('../socket', () => ({ default: { on: mocks.on, off: mocks.off } }));
import { OPERATIONAL_FALLBACK_POLL_MS, subscribeToRefresh } from './refreshOnResume';

describe('resume reconciliation', () => {
  let dispose;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.native = false;
    vi.stubGlobal('window', Object.assign(new EventTarget(), { setInterval, clearInterval }));
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }));
    vi.stubGlobal('navigator', { onLine: true });
  });
  afterEach(() => { dispose?.(); vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('coalesces simultaneous wake events and removes every subscription', async () => {
    let finish;
    const refresh = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    dispose = subscribeToRefresh(refresh, { intervalMs: 15000 });
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    mocks.on.mock.calls[0][1]();
    expect(refresh).toHaveBeenCalledTimes(1);
    finish(); await Promise.resolve();
    dispose();
    window.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(30000);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mocks.off).toHaveBeenCalledWith('connect', mocks.on.mock.calls[0][1]);
  });
  it('skips offline/hidden polling then reconciles on return', async () => {
    const refresh = vi.fn().mockResolvedValue();
    dispose = subscribeToRefresh(refresh, { intervalMs: 15000 });
    navigator.onLine = false;
    await vi.advanceTimersByTimeAsync(15000);
    navigator.onLine = true; document.visibilityState = 'hidden';
    window.dispatchEvent(new Event('online'));
    expect(refresh).not.toHaveBeenCalled();
    document.visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('handles native listener registration completing after cleanup', async () => {
    mocks.native = true;
    let register;
    const remove = vi.fn();
    mocks.addListener.mockReturnValue(new Promise(resolve => { register = resolve; }));
    const refresh = vi.fn().mockResolvedValue();
    dispose = subscribeToRefresh(refresh);
    mocks.addListener.mock.calls[0][1]({ isActive: false });
    expect(refresh).not.toHaveBeenCalled();
    mocks.addListener.mock.calls[0][1]({ isActive: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    dispose(); register({ remove }); await Promise.resolve();
    expect(remove).toHaveBeenCalledOnce();
  });
  it('retries a failed read on a later event without an unbounded loop', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const refresh = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
    dispose = subscribeToRefresh(refresh);
    window.dispatchEvent(new Event('focus')); await Promise.resolve();
    window.dispatchEvent(new Event('online')); await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
  it('uses a conservative operational fallback while keeping event reconciliation', () => {
    expect(OPERATIONAL_FALLBACK_POLL_MS).toBe(60_000);
  });
});
