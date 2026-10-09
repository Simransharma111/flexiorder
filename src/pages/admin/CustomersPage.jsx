import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import adminCustomers from '../../api/adminCustomers';
import { defaultTemplate } from '../../utils/adminCustomerEmail';
import CustomerProfile from '../../components/admin/customers/CustomerProfile';
import { money } from '../../utils/adminCustomerDisplay';
import TemplateEditor from '../../components/admin/customers/TemplateEditor';
import '../../components/admin/customers/customers.css';

export default function CustomersPage() {
  const { customerId } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState({ loading: true });
  const [template, setTemplate] = useState(defaultTemplate);
  const [settings, setSettings] = useState(false);
  const [retry, setRetry] = useState(0);
  const focusTarget = useRef(null);
  const search = params.get('q') || '';
  const filter = params.get('filter') || 'all';
  const sort = params.get('sort') || 'name';
  const rawPage = Number(params.get('page'));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const scenario = params.get('scenario') || 'normal';
  const update = (key, value) => {
    setParams(current => { const next = new URLSearchParams(current); next.set(key, value); if (key !== 'page') next.delete('page'); return next; }, { replace: true });
  };
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setResult({ loading: true });
      adminCustomers.list({ search, filter, sort, page, scenario, signal: controller.signal }).then(data => { if (!controller.signal.aborted) setResult(data); }).catch(error => { if (!controller.signal.aborted) setResult({ error: error.message }); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, filter, sort, page, scenario, retry]);
  useEffect(() => {
    if (!customerId && focusTarget.current) { document.getElementById(focusTarget.current)?.focus({ preventScroll: true }); }
  }, [customerId]);
  const closeProfile = () => location.state?.fromCustomerList ? navigate(-1) : navigate({ pathname: '/superadmin/customers', search: location.search }, { replace: true });
  return <main className="crm-shell">
    <header className="crm-heading"><div><Link to="/superadmin">← Restaurant management</Link><p className="crm-eyebrow">Super Admin / Customer management</p><h1>Customers</h1><p>One place for relationships, agreements and follow-up.</p></div><button onClick={() => setSettings(value => !value)} aria-expanded={settings}>Email templates</button></header>
    <aside className="crm-notice"><strong>Sample-data prototype</strong> · No real customer records. All edits reset when you leave Customers or reload. Prices and dates are illustrative.</aside>
    {settings && <section className="crm-card"><TemplateEditor template={template} onSave={setTemplate} onClose={() => setSettings(false)} /></section>}
    {result.summary && <div className="crm-summary" aria-label="Sample customer totals">{[['Customers', result.summary.customers], ['Renewals in 30 days', result.summary.renewalsDue ?? result.summary.expiring], ['Outstanding balance', money(result.summary.outstandingMinor)], ['Need follow-up', result.summary.followUp ?? 'Not recorded']].map(([label, value]) => <section key={label}><span>{label}</span><strong>{value}</strong></section>)}</div>}
    <div className="crm-toolbar crm-filters">
      <label className="crm-search">Search customers<input type="search" value={search} onChange={event => update('q', event.target.value)} placeholder="Name, customer ID, restaurant or contact" /></label>
      <label>Filter<select value={filter} onChange={event => update('filter', event.target.value)}><option value="all">All customers</option><option value="trial">Trial ending</option><option value="expiring">Renewal in 30 days</option><option value="dues">Outstanding payment</option><option value="incomplete">Incomplete setup</option><option value="archived">Archived</option><option value="inactive" disabled>Inactivity — not tracked</option><option disabled>No first order — not tracked</option></select></label>
      <label>Sort<select value={sort} onChange={event => update('sort', event.target.value)}><option value="name">Customer name</option><option value="reference">Customer ID</option><option value="outstanding">Outstanding balance</option><option value="renewal">Renewal date</option><option value="activity">Last observed activity</option></select></label>
    </div>
    <p className="crm-muted">{result.summary?.unknownBalances > 0 && `${result.summary.unknownBalances} unknown balances excluded from totals. `}Activity filters require an authorized source. Unknown activity is shown as Not tracked.</p>
    <section className="crm-list" aria-label="Customer list" aria-busy={Boolean(result.loading)}>
      {result.loading ? <p role="status" className="crm-empty">Loading customers…</p> : result.error ? <div role="alert" className="crm-empty"><h2>Customer preview unavailable</h2><p>{result.error}</p><button onClick={() => setRetry(value => value + 1)}>Retry</button><button onClick={() => update('scenario', 'normal')}>Restore sample data</button></div> : result.items?.length ? <table><thead><tr><th>Customer</th><th>Package</th><th>Payment / renewal</th><th>Last activity</th></tr></thead><tbody>{result.items.map(customer => <tr key={customer.id}><td><Link id={`customer-${customer.id}`} onClick={() => { focusTarget.current = `customer-${customer.id}`; }} state={{ fromCustomerList: true }} to={{ pathname: `/superadmin/customers/${encodeURIComponent(customer.id)}`, search: location.search }}><strong>{customer.name}</strong></Link><small>{customer.reference} · {customer.restaurantCount} restaurants {customer.status === 'archived' ? '· Archived' : ''}</small></td><td data-label="Package">{customer.packageLabel || 'Not recorded'}</td><td data-label="Payment / renewal"><strong>{money(customer.outstandingMinor)} outstanding</strong><small>{customer.renewalDate ? `Renewal ${new Date(customer.renewalDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}` : 'Renewal not recorded'}</small></td><td data-label="Last activity">{customer.lastActivityAt ? <>{new Date(customer.lastActivityAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}<small>Sample observation</small></> : 'Not tracked'}</td></tr>)}</tbody></table> : <div className="crm-empty"><h2>No customers found</h2><p>Try another search or filter, or restore the sample data.</p><button onClick={() => setParams({})}>Reset view</button></div>}
    </section>
    {!result.loading && !result.error && <div className="crm-toolbar crm-pagination"><span>{result.total || 0} matching customers · 25 per page</span><button disabled={page <= 1} onClick={() => update('page', String(page - 1))}>Previous</button><span>Page {page}</span><button disabled={page * 25 >= (result.total || 0)} onClick={() => update('page', String(page + 1))}>Next</button></div>}
    <details className="crm-scenarios"><summary>Prototype state preview</summary><label>Sample scenario<select value={scenario} onChange={event => update('scenario', event.target.value)}><option value="normal">Sample customers</option><option value="empty">Empty list</option><option value="error">Service failure</option><option value="expired">Expired demo session</option><option value="unavailable">Unavailable service</option></select></label><p>These simulations do not change your real login or contact a service.</p></details>
    {customerId && <CustomerProfile key={customerId} id={customerId} template={template} onClose={closeProfile} />}
  </main>;
}
