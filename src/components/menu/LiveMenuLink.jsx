import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { getStoredAuthToken } from '../../utils/session';
import { readTables, tableLabel, tableQrUrl } from '../../utils/tableQr';
import QrDialog from '../tables/QrDialog';
import '../tables/tableQr.css';

export default function LiveMenuLink() {
  const [open, setOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  const load = async () => {
    const id = ++request.current;
    const token = getStoredAuthToken();
    setOpen(true); setLoading(true); setError(''); setTables([]);
    try {
      const rows = await readTables(api, { timeout: 15000 });
      if (id !== request.current || token !== getStoredAuthToken()) return;
      setTables(rows.filter(table => typeof table.qrId === 'string' && table.qrId.trim()));
    } catch {
      if (id === request.current && token === getStoredAuthToken()) setError('Could not load live menu links. Check your connection and retry.');
    } finally { if (id === request.current && token === getStoredAuthToken()) setLoading(false); }
  };
  return <>
    <button type="button" className="owner-live-menu-button" onClick={load}>View Live Menu</button>
    {open && <QrDialog title="View Live Menu" onClose={() => { request.current++; setOpen(false); }}>
      <p>Open the published guest menu for a table or room. Ordering status and availability are checked live.</p>
      {loading ? <p role="status">Loading menu links…</p> : error ? <div role="alert">{error}<button type="button" onClick={load}>Retry</button></div> : tables.length ?
        <div className="owner-live-menu-links">{tables.map(table => <a key={table._id} href={tableQrUrl(table.qrId)} target="_blank" rel="noopener noreferrer">{tableLabel(table)} — Open live menu</a>)}</div> :
        <p>No assigned QR yet. <a href="/qr">Open Tables &amp; Rooms</a> to assign a QR, then view the live menu here.</p>}
    </QrDialog>}
  </>;
}
