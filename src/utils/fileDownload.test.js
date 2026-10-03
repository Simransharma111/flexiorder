import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ native: vi.fn(), writeFile: vi.fn(), share: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: mocks.native } }));
vi.mock('@capacitor/share', () => ({ Share: { share: mocks.share } }));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { ExternalStorage: 'external', Documents: 'documents', Cache: 'cache' },
}));
import { downloadFile, fileExportMessage } from './fileDownload';

describe('file exports', () => {
  const pdf = new Blob(['%PDF fixture'], { type: 'application/pdf' });
  let anchor;
  let browserShare;
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    mocks.native.mockReturnValue(true);
    mocks.writeFile.mockResolvedValue({ uri: 'file:///cache/qr.pdf' });
    vi.stubGlobal('FileReader', class {
      readAsDataURL() { this.result = 'data:application/pdf;base64,cGRm'; this.onload(); }
    });
    anchor = { click: vi.fn(), remove: vi.fn() };
    browserShare = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', { share: browserShare, canShare: vi.fn(() => true) });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:qr-test'), revokeObjectURL: vi.fn() });
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { appendChild: vi.fn() } });
    vi.stubGlobal('window', { setTimeout });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('opens native sharing using a cache file without external storage permissions', async () => {
    await expect(downloadFile(pdf, 'qr.pdf')).resolves.toMatchObject({ native: true, status: 'shared' });
    expect(mocks.writeFile).toHaveBeenCalledExactlyOnceWith({ path: 'qr.pdf', directory: 'cache', recursive: true, data: 'cGRm' });
    expect(mocks.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///cache/qr.pdf'] }));
    expect(anchor.click).not.toHaveBeenCalled();
  });
  it.each([new Error('Share canceled'), Object.assign(new Error('dismissed'), { name: 'AbortError' })])('does not report a cancelled native share as a saved file', async error => {
    mocks.share.mockRejectedValue(error);
    const result = await downloadFile(pdf, 'qr.pdf');
    expect(result.status).toBe('cancelled');
    expect(fileExportMessage(result)).toContain('cancelled');
    expect(anchor.click).not.toHaveBeenCalled();
  });
  it('surfaces native storage and share errors', async () => {
    mocks.writeFile.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(downloadFile(pdf, 'qr.pdf')).rejects.toThrow('Storage unavailable');
    expect(mocks.share).not.toHaveBeenCalled();
    mocks.share.mockRejectedValueOnce(new Error('No share app'));
    await expect(downloadFile(pdf, 'qr.pdf')).rejects.toThrow('No share app');
  });
  it('shares the named file and MIME type in capable browsers', async () => {
    mocks.native.mockReturnValue(false);
    expect((await downloadFile(pdf, 'qr.pdf')).status).toBe('shared');
    const file = browserShare.mock.calls[0][0].files[0];
    expect(file.name).toBe('qr.pdf'); expect(file.type).toBe('application/pdf');
    expect(anchor.click).not.toHaveBeenCalled();
  });
  it('does not download after browser cancellation', async () => {
    mocks.native.mockReturnValue(false);
    browserShare.mockRejectedValue(Object.assign(new Error('Cancel'), { name: 'AbortError' }));
    expect((await downloadFile(pdf, 'qr.pdf')).status).toBe('cancelled');
    expect(anchor.click).not.toHaveBeenCalled();
  });
  it.each(['unsupported', 'permission'])('downloads when sharing is %s and revokes its object URL', async reason => {
    mocks.native.mockReturnValue(false);
    if (reason === 'unsupported') navigator.canShare.mockReturnValue(false);
    else browserShare.mockRejectedValue(Object.assign(new Error('Activation expired'), { name: 'NotAllowedError' }));
    expect((await downloadFile(pdf, 'qr.pdf')).status).toBe('downloaded');
    expect(anchor.download).toBe('qr.pdf');
    expect(anchor.click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:qr-test');
  });
});
