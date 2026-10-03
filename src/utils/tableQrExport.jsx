import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { downloadFile } from './fileDownload';
import { tableLabel, tableQrUrl } from './tableQr';

// Four independent cards per A4 sheet, with space to cut around every card.
export const qrCardPlacement = index => ({
  page: Math.floor(index / 4), x: 12 + (index % 2) * 96,
  y: 16 + Math.floor((index % 4) / 2) * 132, width: 90, height: 120,
});

function wrappedText(context, text, width) {
  const lines = [];
  let line = '';
  for (const character of Array.from(text)) {
    if (line && context.measureText(line + character).width > width) {
      lines.push(line.trim()); line = '';
    }
    line += character;
  }
  if (line) lines.push(line.trim());
  return lines;
}

export async function renderQrCard(table) {
  if (!table.qrId) throw new Error(`${tableLabel(table)} has no QR code to download.`);
  if (document.fonts?.ready) await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 1200; canvas.height = 1600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This device cannot create QR images. Try another browser.');
  context.fillStyle = '#ffffff'; context.fillRect(0, 0, 1200, 1600);
  context.strokeStyle = '#d4d9dc'; context.lineWidth = 3; context.strokeRect(2, 2, 1196, 1596);
  context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillStyle = '#172b35';
  let size = 86;
  let lines;
  do {
    context.font = `700 ${size}px Arial, sans-serif`;
    lines = wrappedText(context, tableLabel(table), 1040);
    if (lines.length * size * 1.15 <= 260) break;
    size -= 2;
  } while (size > 12);
  const lineHeight = size * 1.15;
  lines.forEach((line, index) => context.fillText(line, 600, 196 + (index - (lines.length - 1) / 2) * lineHeight));
  const svg = renderToStaticMarkup(<QRCodeSVG xmlns="http://www.w3.org/2000/svg" value={tableQrUrl(table.qrId)} size={1000} level="M" marginSize={4} />);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const qr = new Image();
    await new Promise((resolve, reject) => {
      qr.onload = resolve;
      qr.onerror = () => reject(new Error('The QR image could not be created. Please retry.'));
      qr.src = url;
    });
    context.imageSmoothingEnabled = false;
    context.drawImage(qr, 100, 380, 1000, 1000);
  } finally { URL.revokeObjectURL(url); }
  context.font = '600 48px Arial, sans-serif';
  context.fillText('Scan to View Menu', 600, 1450);
  context.font = '500 30px Arial, sans-serif'; context.fillStyle = '#52616b';
  context.fillText('FlexiOrder', 600, 1528);
  return canvas;
}

export async function downloadTableQr(table, shouldContinue = () => true) {
  const canvas = await renderQrCard(table);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The QR image could not be saved.')), 'image/png'));
  const name = tableLabel(table).replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 80) || 'Table-Room';
  if (!shouldContinue()) throw new Error('Download cancelled because the account changed.');
  return downloadFile(blob, `${name}-QR.png`);
}

export async function downloadTableQrPdf(tables, onProgress = () => {}, shouldContinue = () => true) {
  if (!tables.length) throw new Error('Select at least one assigned table or room.');
  // Fail explicitly rather than quietly leaving an unassigned selection out.
  if (tables.some(table => !table.qrId)) throw new Error('Every selected table or room must have a QR code.');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'Tables & Rooms — QR Codes', creator: 'FlexiOrder' });
  for (let index = 0; index < tables.length; index++) {
    if (!shouldContinue()) throw new Error('Download cancelled because the account changed.');
    const card = await renderQrCard(tables[index]);
    const placement = qrCardPlacement(index);
    if (index && index % 4 === 0) doc.addPage();
    doc.addImage(card.toDataURL('image/png'), 'PNG', placement.x, placement.y, placement.width, placement.height, undefined, 'FAST');
    onProgress(index + 1, tables.length);
    // Let the progress message paint and avoid retaining every source canvas.
    card.width = 0; card.height = 0;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (!shouldContinue()) throw new Error('Download cancelled because the account changed.');
  return downloadFile(doc.output('blob'), 'FlexiOrder-Tables-Rooms-QR.pdf');
}
