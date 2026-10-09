import { useEffect, useRef, useState } from 'react';
import adminCustomers from '../../../api/adminCustomers';
import CustomerEmail from './CustomerEmail';

const tabs = ['Overview', 'Restaurants & staff', 'Packages & payments', 'Usage', 'Private notes', 'Activity history'];
import { money } from '../../../utils/adminCustomerDisplay';
const date = value => value ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded';

export default function CustomerProfile({ id, template, onClose }) {
  const dialog = useRef(null);
  const [record, setRecord] = useState({ loading: true });
  const [tab, setTab] = useState('Overview');
  const [email, setEmail] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    adminCustomers.get(id, { signal: controller.signal }).then(customer => {
      if (!controller.signal.aborted) setRecord(customer ? { customer } : { error: 'Customer not found.' });
    }).catch(error => { if (!controller.signal.aborted) setRecord({ error: error.message }); });
    return () => controller.abort();
  }, [id, retry]);
  const customer = record.customer;
  return <dialog ref={dialog} className="crm-profile" aria-labelledby="crm-profile-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="crm-profile-header">
      <div><p className="crm-eyebrow">Sample customer profile</p><h2 id="crm-profile-title">{customer?.name || 'Customer details'}</h2><p>{customer?.reference || id}</p></div>
      <button type="button" autoFocus onClick={onClose} aria-label="Close customer profile">Close</button>
    </div>
    {record.loading && <p role="status">Loading customer…</p>}
    {record.error && <div role="alert"><p>{record.error}</p><button onClick={() => { setRecord({ loading: true }); setRetry(value => value + 1); }}>Retry</button></div>}
    {customer && <>
      <p className="crm-notice">Synthetic records. Sample prices and dates are illustrative. No live accounts or payments are changed.</p>
      <div className="crm-toolbar"><span>{customer.restaurants.length} linked restaurants · {customer.status}</span><button onClick={() => setEmail(true)} disabled={!customer.email && !customer.restaurants.some(restaurant => restaurant.ownerEmail)}>Email customer</button>{!customer.email && !customer.restaurants.some(restaurant => restaurant.ownerEmail) && <span>Add email in the future secure service to prepare a draft.</span>}</div>
      {email ? <CustomerEmail customer={customer} template={template} onClose={() => setEmail(false)} /> : <>
        <div className="crm-tabs" role="tablist" aria-label="Customer profile sections">{tabs.map((name, index) => <button key={name} id={`crm-tab-${index}`} role="tab" aria-selected={tab === name} aria-controls="crm-panel" tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[next]); document.getElementById(`crm-tab-${next}`).focus(); } }}>{name}</button>)}</div>
        <div id="crm-panel" role="tabpanel" aria-labelledby={`crm-tab-${tabs.indexOf(tab)}`} tabIndex={0} className="crm-panel">
          {tab === 'Overview' && <><dl className="crm-facts"><dt>Billing contact email</dt><dd>{customer.email || 'Not recorded'}</dd><dt>Phone</dt><dd>{customer.phone || 'Not recorded'}</dd><dt>Registration</dt><dd>{date(customer.registeredAt)}</dd><dt>Source</dt><dd>{customer.source}</dd><dt>Last refreshed</dt><dd>{date(customer.updatedAt)}</dd></dl><h3>Setup milestones</h3>{customer.restaurants.map(restaurant => <p key={restaurant.id}>{restaurant.name}: {restaurant.setupStatus} · {date(restaurant.setupCompletedAt)}</p>)}</>}
          {tab === 'Restaurants & staff' && customer.restaurants.map(restaurant => <section className="crm-card" key={restaurant.id}><h3>{restaurant.name}</h3><p>{restaurant.reference} · Brand: {restaurant.brand || restaurant.name}</p><p>Owner: {restaurant.ownerName || 'Unavailable'} · {restaurant.ownerEmail || 'Email unavailable'}</p><h4>CRM staff profiles</h4><p>Sample manual profiles only; these do not create or edit app logins.</p>{restaurant.staff.length ? restaurant.staff.map(staff => <div className="crm-record" key={staff.reference}><strong>{staff.name} · {staff.reference}</strong><p>{staff.role} · {staff.status} · {staff.source}</p><p>Last refreshed: {date(staff.updatedAt)}. Joined: Not tracked. Last activity: Not tracked.</p></div>) : <p>Staff roster unavailable. No authorized live source connected.</p>}</section>)}
          {tab === 'Packages & payments' && <><p>Sample outstanding balance: <strong>{money(customer.outstandingMinor)}</strong> · Sample payments: {money(customer.paidMinor)}</p><p>Manual sample ledger, not provider-verified. Recording payments becomes available after secure service integration.</p>{customer.restaurants.map(restaurant => <section className="crm-card" key={restaurant.id}><h3>{restaurant.name}</h3><p>Selected package: {restaurant.selectedPackage || 'Not recorded'}</p>{restaurant.agreement ? <dl className="crm-facts"><dt>Agreed package</dt><dd>{restaurant.agreement.packageName} · {restaurant.agreement.status}</dd><dt>Agreed price</dt><dd>{money(restaurant.agreement.amountMinor)} / {restaurant.agreement.billingCycle} · {restaurant.agreement.taxTreatment || 'Tax terms not recorded'}</dd><dt>Billing start</dt><dd>{date(restaurant.agreement.billingStartDate)}</dd><dt>First payment due</dt><dd>{date(restaurant.agreement.firstPaymentDueDate)}</dd><dt>Renewal</dt><dd>{date(restaurant.agreement.renewalDate)}</dd><dt>Trial end</dt><dd>{date(restaurant.agreement.trialEndDate)}</dd></dl> : <p>Agreement not recorded.</p>}</section>)}</>}
          {tab === 'Usage' && <><h3>Activity coverage</h3><p>{customer.usageCoverage || 'Not tracked — no activity coverage available'}</p><dl className="crm-facts"><dt>Last observed activity</dt><dd>{customer.lastActivityAt ? `${date(customer.lastActivityAt)} · sample observation` : 'Not tracked'}</dd>{['Last login', 'Owner activity', 'Restaurant activity', 'First order', 'Last order', 'Monthly usage'].map(label => <div key={label}><dt>{label}</dt><dd>Not tracked</dd></div>)}</dl><p>No live activity source is connected. Unknown activity does not mean inactive.</p></>}
          {tab === 'Private notes' && <><p>Sample private notes. Editing and durable saving require the secure admin service.</p>{customer.notes.length ? customer.notes.map(note => <article className="crm-card" key={note.id}><p className="crm-prewrap">{note.body}</p><small>{note.author} · {date(note.createdAt)} · sample revision 1</small></article>) : <p>No sample notes.</p>}</>}
          {tab === 'Activity history' && <><p>Sample history only. Email actions in this prototype are not a durable audit log.</p>{customer.activity.length ? customer.activity.map(event => <article className="crm-record" key={event.id}><strong>{event.type}</strong><p>{event.description}</p><small>{date(event.at)} · {event.source}</small></article>) : <p>No recorded sample events.</p>}</>}
        </div>
      </>}
    </>}
  </dialog>;
}
