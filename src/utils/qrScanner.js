// One scanner for web and Capacitor. Own the stream so even a late permission
// response after cancellation is released immediately.
export function startQrScanner(video, { onDetected, onError }) {
  let stopped = false;
  let stream;
  let timer;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach(track => track.stop());
    if (video.srcObject === stream) video.srcObject = null;
  };
  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable here. Open the app or a secure HTTPS page, or enter the code.');
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } });
      if (stopped) { stop(); return; }
      video.srcObject = stream;
      await video.play();
      if (stopped) { stop(); return; }
      let detector;
      if (globalThis.BarcodeDetector) {
        try {
          const formats = await globalThis.BarcodeDetector.getSupportedFormats();
          if (formats.includes('qr_code')) detector = new globalThis.BarcodeDetector({ formats: ['qr_code'] });
        } catch { /* Use the same scanner's bundled decoder below. */ }
      }
      const reader = detector ? null : new (await import('@zxing/browser')).BrowserQRCodeReader();
      if (stopped) { stop(); return; }
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      const scan = async () => {
        if (stopped) return;
        try {
          let text;
          if (detector) text = (await detector.detect(video))[0]?.rawValue;
          else if (video.readyState >= 2 && video.videoWidth) {
            const scale = Math.min(1, 960 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            try { text = reader.decodeFromCanvas(canvas).getText(); } catch { /* No readable QR in this frame. */ }
          }
          if (!stopped && text) { stop(); onDetected(text); return; }
        } catch (error) { if (!stopped) { stop(); onError(error); } return; }
        if (!stopped) timer = setTimeout(scan, 180);
      };
      scan();
    } catch (error) { if (!stopped) { stop(); onError(error); } }
  };
  start();
  return stop;
}

export const cameraErrorMessage = error => {
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) return 'Camera permission was denied. Allow camera access in your browser or app settings, then retry. You can also enter the code.';
  if (['NotFoundError', 'DevicesNotFoundError'].includes(error?.name)) return 'No camera was found. Enter the code instead.';
  if (['NotReadableError', 'TrackStartError'].includes(error?.name)) return 'The camera is busy. Close other camera apps and retry, or enter the code.';
  return error?.message || 'The camera could not start. Retry or enter the code.';
};
