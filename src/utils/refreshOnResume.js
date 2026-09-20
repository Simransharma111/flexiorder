import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import socket from '../socket';

// Reconcile missed events through the existing APIs after an app/browser wake-up.
export const subscribeToRefresh = (refresh, { intervalMs = 0 } = {}) => {
  let stopped = false;
  let running = false;
  let nativeHandle;
  const run = async () => {
    if (stopped || running || document.visibilityState === 'hidden' || navigator.onLine === false) return;
    running = true;
    try { await refresh(); } catch (error) { console.warn('Refresh could not complete', error); }
    finally { running = false; }
  };
  window.addEventListener('online', run);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', run);
  socket.on('connect', run);
  const interval = intervalMs > 0 ? window.setInterval(run, intervalMs) : null;
  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', state => { if (state.isActive) run(); })
      .then(handle => { if (stopped) handle.remove(); else nativeHandle = handle; })
      .catch(error => console.warn('Native resume listener unavailable', error));
  }
  return () => {
    stopped = true;
    window.removeEventListener('online', run);
    window.removeEventListener('focus', run);
    document.removeEventListener('visibilitychange', run);
    socket.off('connect', run);
    if (interval !== null) window.clearInterval(interval);
    nativeHandle?.remove();
  };
};
