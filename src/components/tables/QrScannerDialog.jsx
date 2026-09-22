import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import QrDialog from './QrDialog';
import { normalizeQrCode } from '../../utils/tableQr';
import { cameraErrorMessage, startQrScanner } from '../../utils/qrScanner';

export default function QrScannerDialog({ onConfirm, onClose }) {
  const video = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [detected, setDetected] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    let nativeListener;
    const stop = startQrScanner(video.current, {
      onDetected: value => {
        try { setDetected(normalizeQrCode(value)); } catch (err) { setError(err.message); }
      },
      onError: err => setError(cameraErrorMessage(err)),
    });
    const pause = () => { stop(); setError('Camera paused. Tap Retry camera when you are ready.'); };
    const visibility = () => { if (document.visibilityState === 'hidden') pause(); };
    document.addEventListener('visibilitychange', visibility);
    if (Capacitor.isNativePlatform()) App.addListener('appStateChange', state => { if (!state.isActive) pause(); })
      .then(handle => { if (disposed) handle.remove(); else nativeListener = handle; }).catch(() => {});
    return () => { disposed = true; stop(); nativeListener?.remove(); document.removeEventListener('visibilitychange', visibility); };
  }, [attempt]);
  const retry = () => { setError(''); setDetected(''); setAttempt(value => value + 1); };
  return <QrDialog title="Scan QR" onClose={onClose}>
    <p>Point your camera at a FlexiOrder QR code. Nothing is assigned until you confirm and save.</p>
    <video ref={video} muted playsInline aria-label="Camera preview" hidden={Boolean(detected || error)} />
    {!detected && !error && <p role="status">Waiting for camera permission or a readable QR code…</p>}
    {error && <p role="alert" className="tqr-error">{error}</p>}
    {detected && <div role="status"><strong>Detected code</strong><p className="tqr-code">{detected}</p></div>}
    <footer>{detected && <button type="button" className="tqr-primary" onClick={() => onConfirm(detected)}>Use this code</button>}
      {(error || detected) && <button type="button" onClick={retry}>Retry camera</button>}
      <button type="button" onClick={onClose}>Enter code instead</button></footer>
  </QrDialog>;
}
