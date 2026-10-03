import { fileExportMessage } from "../utils/fileDownload";
import { enableTakeawayLocation, findTakeawayLocation, isTakeawayLocation, sortServiceLocations } from "../utils/serviceLocations";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { FiDownload, FiGrid, FiHome, FiPlus, FiRefreshCw } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useConnectivity } from '../context/ConnectivityContext';
import { getRestaurantId, getScopedStorageKey } from '../utils/storageScope';
import { readTables, saveTableQr, tableLabel, tableQrUrl } from '../utils/tableQr';
import QrDialog from './tables/QrDialog';
import './tables/tableQr.css';

const QrScannerDialog = lazy(() => import('./tables/QrScannerDialog'));
const messageFor = error => error.response?.data?.message || error.message || 'Something went wrong. Please retry.';
function cachedTables(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(t => t && typeof t._id === 'string' && typeof t.tableNumber === 'string' && ['room', 'table'].includes(t.type)) : [];
  } catch { return []; }
}

export default function TableQRManager() {
  // Account changes mount fresh UI state; old requests keep their own busy refs.
  useAuth();
  return <ScopedTableQRManager key={`${getScopedStorageKey('flexiorder_table_qr')}:${localStorage.getItem('token') || ''}`} />;
}

function ScopedTableQRManager() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { isOffline } = useConnectivity();
  const scope = getScopedStorageKey('flexiorder_table_qr');
  const session = `${scope}:${localStorage.getItem('token') || ''}`;
  const [data, setData] = useState(() => ({ scope, tables: cachedTables(scope), stale: true }));
  const allTables = data.scope === scope ? data.tables : [];
  const tables = sortServiceLocations(allTables.filter(table => !isTakeawayLocation(table) || table.qrId));
  const takeawayLocation = findTakeawayLocation(allTables);
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(null);
  const [formError, setFormError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState('');
  const writing = useRef(false);
  const exportingRef = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const activeSession = useRef(session);
  useEffect(() => {
    activeSession.current = session; alive.current = true;
    return () => { alive.current = false; };
  }, [session]);
  const validSession = useCallback(() => alive.current && activeSession.current === session && `${getScopedStorageKey('flexiorder_table_qr')}:${localStorage.getItem('token') || ''}` === session, [session]);
  const storeTables = useCallback((values, stale = false) => {
    if (!validSession()) return;
    setData({ scope, tables: values, stale });
    setPreview(current => current ? values.find(t => t._id === current._id && t.qrId) || null : null);
    try { localStorage.setItem(scope, JSON.stringify(values)); } catch { /* Reads still work when storage is full. */ }
  }, [scope, validSession, setPreview]);
  const refresh = useCallback(async () => {
    if (isOffline || writing.current || !validSession()) return;
    const request = ++generation.current;
    setFetching(true);
    try {
      const values = await readTables(api);
      if (request !== generation.current || !validSession()) return;
      storeTables(values); setError('');
    } catch (failure) {
      if (request === generation.current && validSession()) {
        setError(messageFor(failure)); setData(current => ({ ...current, stale: true }));
      }
    } finally { if (request === generation.current && validSession()) setFetching(false); }
  }, [isOffline, storeTables, validSession]);
  useEffect(() => {
    setData({ scope, tables: cachedTables(scope), stale: true });
    setDraft(null); setPreview(null); setRemoving(null); setSelected([]); setScanning(false);
    setError(''); setNotice('');
  }, [scope, session]);
  useEffect(() => {
    let disposed = false;
    let handle;
    refresh();
    const focus = () => { if (document.visibilityState !== 'hidden') refresh(); };
    window.addEventListener('focus', focus);
    window.addEventListener('online', focus);
    document.addEventListener('visibilitychange', focus);
    if (Capacitor.isNativePlatform()) App.addListener('appStateChange', state => { if (state.isActive) refresh(); })
      .then(value => { if (disposed) value.remove(); else handle = value; }).catch(() => {});
    return () => {
      disposed = true; handle?.remove();
      window.removeEventListener('focus', focus); window.removeEventListener('online', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [refresh]);

  const openEditor = (type, table = null, method = table ? 'keep' : 'auto') => {
    setFormError('');
    setDraft({ type, name: table?.tableNumber || '', table, original: Boolean(table), method, code: '', registered: false, uncertainCreate: false });
  };
  const updateDraft = changes => setDraft(current => ({ ...current, ...(('code' in changes || 'method' in changes) ? { registered: false, codeNormalized: false } : {}), ...changes }));
  const upsert = table => {
    setData(current => {
      if (!validSession()) return current;
      const values = current.tables.some(t => t._id === table._id) ? current.tables.map(t => t._id === table._id ? table : t) : [...current.tables, table];
      try { localStorage.setItem(scope, JSON.stringify(values)); } catch { /* Best-effort cache. */ }
      return { scope, tables: values, stale: current.stale };
    });
  };
  const enableTakeaway = async () => {
    if (writing.current || isOffline || !validSession()) return;
    writing.current = true; generation.current++; setFetching(false); setBusy(true); setError('');
    try {
      const table = await enableTakeawayLocation(api, validSession);
      if (validSession()) { upsert(table); setNotice('Takeaway is ready. Waiters can choose Takeaway order without selecting a table.'); }
    } catch (failure) { if (validSession()) setError(messageFor(failure)); }
    finally { writing.current = false; if (validSession()) setBusy(false); }
  };
  const save = async event => {
    event.preventDefault();
    if (writing.current || isOffline || !validSession()) return;
    writing.current = true; generation.current++; setFetching(false); setBusy(true); setFormError('');
    try {
      const saved = await saveTableQr(api, draft, tables, progress => {
        if (!validSession()) return;
        setDraft(progress);
        if (progress.table) upsert(progress.table);
      }, getRestaurantId(user) || getRestaurantId());
      if (validSession()) { upsert(saved); setDraft(null); setNotice(`${tableLabel(saved)} saved.`); }
    } catch (failure) { if (validSession()) setFormError(messageFor(failure)); }
    finally {
      writing.current = false;
      if (validSession()) { setBusy(false); refresh(); }
    }
  };
  const remove = async () => {
    if (writing.current || isOffline || !validSession()) return;
    writing.current = true; generation.current++; setFetching(false); setBusy(true); setFormError('');
    try {
      const latest = (await readTables(api)).find(t => t._id === removing._id);
      if (!validSession()) return;
      if (!latest) throw new Error('This table or room is no longer available. Refresh the list.');
      if (latest.qrId && latest.qrId !== removing.qrId) throw new Error('The QR changed on another device. Close this dialog and refresh before removing it.');
      if (latest.qrId) {
        try {
          const response = await api.put('/qr/remove-qr', { tableId: removing._id });
          if (response.data?.success !== true) throw new Error('QR removal was not confirmed. Refresh and retry.');
        } catch (failure) {
          const confirmed = (await readTables(api).catch(() => [])).find(t => t._id === removing._id && !t.qrId);
          if (!confirmed) throw failure;
        }
      }
      if (validSession()) {
        upsert({ ...removing, qrId: null }); setNotice(`QR removed from ${tableLabel(removing)}.`); setRemoving(null);
      }
    } catch (failure) { if (validSession()) setFormError(messageFor(failure)); }
    finally { writing.current = false; if (validSession()) { setBusy(false); refresh(); } }
  };
  const download = async (items, individual = false) => {
    if (exportingRef.current) return;
    exportingRef.current = true; setExporting('Preparing QR download…'); setError('');
    try {
      const exporter = await import('../utils/tableQrExport');
      const result = individual ? await exporter.downloadTableQr(items[0], validSession) : await exporter.downloadTableQrPdf(items, (done, total) => { if (validSession()) setExporting(`Preparing QR ${done} of ${total}…`); }, validSession);
      if (validSession()) setNotice(fileExportMessage(result));
    } catch (failure) { if (validSession()) setError(messageFor(failure)); }
    finally { exportingRef.current = false; if (validSession()) setExporting(''); }
  };
  const hasAssignments = tables.some(t => t.qrId);
  useEffect(() => {
    // Make export available later in this session if the connection is lost.
    if (!isOffline && hasAssignments) import('../utils/tableQrExport').catch(() => {});
  }, [isOffline, hasAssignments]);
  const assigned = tables.filter(t => t.qrId);
  const selectedTables = assigned.filter(t => selected.includes(t._id));
  const visible = tables.filter(t => (filter === 'all' || t.type === filter) && `${tableLabel(t)} ${t.qrId || ''}`.toLowerCase().includes(search.toLowerCase()));
  const frozen = draft && (draft.uncertainCreate || (!draft.original && draft.table));
  const qrFrozen = draft?.uncertainCreate;

  return <section className="tqr" aria-label="Tables and Rooms">
    {pathname === "/qr" && <Link className="tqr-back" to="/owner/dashboard">← Back to dashboard</Link>}
    <div className="tqr-hero">
      <div><p className="tqr-eyebrow">SET UP · PRINT · WELCOME GUESTS</p><h1>Tables &amp; Rooms</h1><p>Give each table or room a QR code, then print it for your guests.</p></div>
      <div className="tqr-actions"><button className="tqr-primary" disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor('table')}><FiPlus /> Add Table</button><button disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor('room')}><FiPlus /> Add Room</button></div>
    </div>
    {(isOffline || data.stale) && <p className="tqr-note" role="status">{isOffline ? 'You are offline. Saved QR codes can still be viewed and downloaded. Connect to make changes.' : 'Showing saved assignments until the latest list loads. Printed codes may have changed on another device.'}</p>}
    {error && <p className="tqr-error" role="alert">{error}</p>}
    {notice && <p className="tqr-success" role="status">{notice}</p>}
    <section className="tqr-note" aria-label="Takeaway setup">
      <strong>{takeawayLocation ? 'Takeaway orders enabled' : 'Takeaway orders'}</strong>
      <p>{takeawayLocation ? 'Waiters can choose Takeaway directly. No table selection or QR is needed.' : 'Enable once for this restaurant so waiters can take takeaway orders without choosing a dining table.'}</p>
      {!takeawayLocation && <button className="tqr-primary" disabled={busy || fetching || isOffline || Boolean(exporting)} onClick={enableTakeaway}>{busy ? 'Setting up…' : 'Enable takeaway orders'}</button>}
    </section>
    <div className="tqr-toolbar">
      <div className="tqr-filters" aria-label="Filter locations">{[['all', 'All'], ['table', 'Tables'], ['room', 'Rooms']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{value === 'all' ? tables.length : tables.filter(t => t.type === value).length}</span></button>)}</div>
      <label className="tqr-search"><span className="sr-only">Search tables, rooms or codes</span><input placeholder="Search name or code" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <button aria-label="Refresh tables and rooms" disabled={fetching || busy || isOffline || Boolean(exporting)} onClick={refresh}><FiRefreshCw />{fetching ? 'Refreshing…' : 'Refresh'}</button>
    </div>
    <div className="tqr-exportbar">
      <label><input type="checkbox" aria-label="Select all assigned QR codes" checked={assigned.length > 0 && selectedTables.length === assigned.length} disabled={!assigned.length} onChange={event => setSelected(event.target.checked ? assigned.map(t => t._id) : [])} />{selectedTables.length ? `${selectedTables.length} selected` : 'Select QR codes to print'}</label>
      <div className="tqr-actions"><button disabled={!selectedTables.length || Boolean(exporting)} onClick={() => download(selectedTables)}><FiDownload /> Download Selected PDF</button><button className="tqr-primary" disabled={!assigned.length || Boolean(exporting)} onClick={() => download(assigned)}><FiDownload /> Download All PDF</button></div>
      {exporting && <p role="status">{exporting}</p>}
    </div>
    <div className="tqr-grid">
      {visible.map(table => <article className="tqr-card" key={table._id} aria-label={tableLabel(table)}>
        <header><div><p className="tqr-type">{table.type === 'room' ? <FiHome /> : <FiGrid />}{table.type === 'room' ? 'Room' : 'Table'}</p><h2>{tableLabel(table)}</h2></div><input type="checkbox" aria-label={`Select ${tableLabel(table)}`} disabled={!table.qrId} checked={Boolean(table.qrId) && selected.includes(table._id)} onChange={event => setSelected(current => event.target.checked ? [...current, table._id] : current.filter(id => id !== table._id))} /></header>
        <div className="tqr-card-main">{table.qrId ? <button className="tqr-qr-preview" aria-label={`View QR for ${tableLabel(table)}`} onClick={() => setPreview(table)}><QRCodeSVG value={tableQrUrl(table.qrId)} size={116} marginSize={4} level="M" /></button> : <div className="tqr-placeholder"><FiGrid /><span>Add a QR for guests</span></div>}<div className="tqr-code-info"><span className={table.qrId ? 'tqr-badge' : 'tqr-badge tqr-unassigned'}>{table.qrId ? 'Assigned' : 'Not assigned'}</span><p className="tqr-code">{table.qrId || 'Generate, enter or scan a code.'}</p></div></div>
        <div className="tqr-card-actions">{table.qrId ? <><button onClick={() => setPreview(table)}>View QR</button><button disabled={Boolean(exporting)} onClick={() => download([table], true)}><FiDownload /> Download QR</button><button disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor(table.type, table, 'manual')}>Scan / Replace QR</button></> : <><button disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor(table.type, table, 'auto')}>Generate QR</button><button disabled={busy || isOffline || Boolean(exporting)} onClick={() => { openEditor(table.type, table, 'manual'); setScanning(true); }}>Scan QR</button><button disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor(table.type, table, 'manual')}>Enter Code</button></>}<button disabled={busy || isOffline || Boolean(exporting)} onClick={() => openEditor(table.type, table)}>Edit</button>{table.qrId && <button className="tqr-danger" disabled={busy || isOffline || Boolean(exporting)} onClick={() => { setFormError(''); setRemoving(table); }}>Remove QR</button>}</div>
      </article>)}
    </div>
    {!visible.length && <div className="tqr-empty"><FiGrid /><h2>{fetching ? 'Loading tables and rooms…' : tables.length ? 'No matching tables or rooms' : 'Your first QR starts here'}</h2><p>{tables.length ? 'Try another name or filter.' : 'Add a table or room, choose its QR code and download a print-ready card.'}</p></div>}
    {draft && <QrDialog title={draft.original ? `Edit ${tableLabel(draft.table)}` : `Add ${draft.type === 'room' ? 'Room' : 'Table'}`} busy={busy} onClose={() => setDraft(null)}>
      <form onSubmit={save}>
        <label>Type<select value={draft.type} disabled={busy || draft.original || Boolean(frozen)} onChange={event => updateDraft({ type: event.target.value })}><option value="table">Table</option><option value="room">Room</option></select></label>
        <label>Name / Number<input autoFocus maxLength={80} value={draft.name} disabled={busy || Boolean(frozen)} placeholder={draft.type === 'room' ? '101' : '01'} onChange={event => updateDraft({ name: event.target.value })} required /></label>
        {draft.original && <p className="tqr-hint">Name changes depend on server support. QR changes keep this table or room and its existing orders.</p>}
        <fieldset disabled={busy || Boolean(qrFrozen)}><legend>QR code</legend><div className="tqr-methods">{draft.original && <button type="button" aria-pressed={draft.method === 'keep'} onClick={() => updateDraft({ method: 'keep', code: '' })}>Keep current</button>}<button type="button" aria-pressed={draft.method === 'auto'} onClick={() => updateDraft({ method: 'auto', code: '' })}>Auto Generate</button><button type="button" aria-pressed={draft.method === 'manual'} onClick={() => updateDraft({ method: 'manual', code: '' })}>Enter Code</button><button type="button" onClick={() => { updateDraft({ method: 'manual' }); setScanning(true); }}>Scan QR</button></div></fieldset>
        {draft.method === 'manual' && <label>QR Code / Code<input value={draft.code} disabled={busy || Boolean(qrFrozen)} placeholder="Enter a code or paste a QR link" onChange={event => updateDraft({ code: event.target.value })} required /></label>}
        {draft.method === 'auto' && <p className="tqr-note">{draft.code ? `Generated code: ${draft.code}` : 'A unique QR code will be generated and assigned when you save.'}</p>}
        {draft.table?.qrId && draft.method !== 'keep' && <p className="tqr-note">Replacing this QR stops its old printed code from opening this table or room. Print the new code after saving.</p>}
        {(frozen || draft.registered) && <p className="tqr-note">Your progress is saved on the server. Retry to finish assigning the QR without creating another table or room.</p>}
        {isOffline && <p className="tqr-note">Connect to the internet to save. This change has not been queued.</p>}
        {formError && <p className="tqr-error" role="alert">{formError}</p>}
        <footer><button type="button" disabled={busy} onClick={() => setDraft(null)}>Close</button><button className="tqr-primary" type="submit" disabled={busy || isOffline || Boolean(exporting)}>{busy ? 'Saving…' : formError ? 'Retry Save' : 'Save'}</button></footer>
      </form>
    </QrDialog>}
    {scanning && draft && <Suspense fallback={<QrDialog title="Opening camera" onClose={() => setScanning(false)}><p role="status">Loading scanner…</p></QrDialog>}><QrScannerDialog onClose={() => setScanning(false)} onConfirm={code => { updateDraft({ method: 'manual', code, codeNormalized: true }); setScanning(false); }} /></Suspense>}
    {preview && <QrDialog title={tableLabel(preview)} onClose={() => setPreview(null)}><div className="tqr-full-preview"><QRCodeSVG value={tableQrUrl(preview.qrId)} size={300} marginSize={4} level="M" /><strong>Scan to View Menu</strong><p className="tqr-code">{preview.qrId}</p></div><footer><a href={tableQrUrl(preview.qrId)} target="_blank" rel="noreferrer">Open Menu</a><button className="tqr-primary" disabled={Boolean(exporting)} onClick={() => download([preview], true)}>Download QR</button></footer></QrDialog>}
    {removing && <QrDialog title="Remove QR assignment" busy={busy} onClose={() => setRemoving(null)}><p>Remove the QR from <strong>{tableLabel(removing)}</strong>? Its printed code will no longer open this table or room. The table or room and its orders stay saved.</p>{formError && <p className="tqr-error" role="alert">{formError}</p>}<footer><button disabled={busy} onClick={() => setRemoving(null)}>Cancel</button><button className="tqr-danger" disabled={busy || isOffline || Boolean(exporting)} onClick={remove}>{busy ? 'Removing…' : 'Confirm Remove QR'}</button></footer></QrDialog>}
  </section>;
}
