import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { filterDirectory, loadDirectory } from '../../api/liveAdminCustomers';
import LiveCustomerProfile from '../../components/admin/customers/LiveCustomerProfile';
import '../../components/admin/customers/customers.css';

function expiry(customer) {
  const dates = customer.restaurants.map(restaurant => restaurant.subscriptionExpiresAt).filter(value => value && Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(a) - Date.parse(b));
  return dates[0] ? new Date(dates[0]).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not recorded';
}
function plan(customer) {
  const plans = [...new Set(customer.restaurants.map(restaurant => restaurant.plan || 'Not recorded'))];
  return plans.length > 1 ? `Mixed / ${plans.length} settings` : plans[0];
}
export default function LiveCustomersPage() {
  const { customerId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const focusTarget = useRef(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loadedAt, setLoadedAt] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    loadDirectory({ signal: controller.signal }).then(items => {
      if (!controller.signal.aborted) { setRecords(items); setLoadedAt(new Date().toISOString()); setLoading(false); }
    }).catch(() => {
      if (!controller.signal.aborted) { setRecords([]); setError('Unable to load live accounts. Check your connection and Super Admin access, then retry.'); setLoading(false); }
    });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => { if (!customerId && focusTarget.current) document.getElementById(focusTarget.current)?.focus({ preventScroll: true }); }, [customerId]);
  const result = useMemo(() => filterDirectory(records, { search, filter, sort, page }), [records, search, filter, sort, page]);
  const selected = records.find(customer => customer.id === customerId);
  const reload = () => { setRecords([]); setLoading(true); setError(''); setLoadedAt(null); setPage(1); setRefresh(value => value + 1); };
  const close = () => location.state?.fromLiveList ? navigate(-1) : navigate('/superadmin/customers', { replace: true });
  const reset = () => { setSearch(''); setFilter('all'); setSort('name'); setPage(1); };
  return <main className="crm-shell">
    <header className="crm-heading"><div><Link to="/superadmin">← Restaurant management</Link><p className="crm-eyebrow">Super Admin / Live directory</p><h1>Customers</h1><p>Your registered restaurants and linked owner accounts.</p></div><button disabled={loading} onClick={reload}>Refresh accounts</button></header>
    <aside className="crm-notice"><strong>Live account data</strong> · Read-only view of your existing system. Private notes, payment balances and usage tracking are not connected.</aside>
    <p className="crm-muted">Includes owners linked to restaurants. Registrations without a restaurant are not available from this API. {loadedAt && `Loaded ${new Date(loadedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST.`}</p>
    {!loading && !error && <div className="crm-summary" aria-label="Directory totals">{[['Accounts / groups', result.summary.customers], ['Restaurants', result.summary.restaurants], ['Expiring in 30 days', result.summary.expiring], ['Incomplete records', result.summary.incomplete]].map(([label, value]) => <section key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>}
    <div className="crm-toolbar crm-filters"><label className="crm-search">Search accounts<input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Owner, restaurant, email or source ID" /></label><label>Filter<select value={filter} onChange={event => { setFilter(event.target.value); setPage(1); }}><option value="all">All accounts</option><option value="expiring">Subscription expiring</option><option value="incomplete">Incomplete records</option><option value="inactive">Inactive restaurants</option></select></label><label>Sort<select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="name">Name</option><option value="reference">Source ID</option><option value="expiry">Subscription expiry</option></select></label></div>
    <section className="crm-list" aria-label="Live customer list" aria-busy={loading}>
      {loading ? <p role="status" className="crm-empty">Loading live accounts…</p> : error ? <div className="crm-empty" role="alert"><h2>Live accounts unavailable</h2><p>{error}</p><button onClick={reload}>Retry</button></div> : result.items.length ? <table><thead><tr><th>Customer / owner</th><th>Account plan</th><th>Subscription expiry</th><th>Activity</th></tr></thead><tbody>{result.items.map(customer => <tr key={customer.id}><td><Link id={`live-${customer.id}`} state={{ fromLiveList: true }} onClick={() => { focusTarget.current = `live-${customer.id}`; }} to={`/superadmin/customers/${encodeURIComponent(customer.id)}`}><strong>{customer.name || customer.restaurants[0]?.name || 'Owner name unavailable'}</strong></Link><small className="crm-id">{customer.reference}</small><small>{customer.restaurants.length} restaurant{customer.restaurants.length === 1 ? '' : 's'}{!customer.ownerId ? ' · Owner link missing' : ''}</small></td><td data-label="Account plan">{plan(customer)}</td><td data-label="Expiry">{expiry(customer)}</td><td data-label="Activity">Not tracked</td></tr>)}</tbody></table> : <div className="crm-empty"><h2>No accounts found</h2><p>{records.length ? 'Try another search or filter.' : 'No restaurants were returned by the administration API.'}</p><button onClick={reset}>Reset filters</button></div>}
    </section>
    {!loading && !error && <div className="crm-toolbar crm-pagination"><span>{result.total} matching accounts · 25 per page</span><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= result.total} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    {customerId && <LiveCustomerProfile key={`${customerId}-${refresh}`} customer={selected} loading={loading} error={error} onClose={close} />}
  </main>;
}
