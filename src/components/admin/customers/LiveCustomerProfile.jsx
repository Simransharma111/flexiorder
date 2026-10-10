import { useEffect, useRef, useState } from 'react';

const tabs = ['Overview', 'Restaurants & staff', 'Packages & payments', 'Usage', 'Private notes'];
function date(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not available';
}

export default function LiveCustomerProfile({ customer, loading, error, onClose }) {
  const dialog = useRef(null);
  const [tab, setTab] = useState('Overview');
  useEffect(() => {
    dialog.current.showModal();
  }, []);

  const email = customer?.email;
  const validEmail = typeof email === 'string' && /^[^\s@<>;,?&#%]+@[^\s@<>;,?&#%]+\.[a-z]{2,}$/i.test(email);
  return <dialog ref={dialog} className="crm-profile" aria-labelledby="live-profile-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="crm-profile-header"><div><p className="crm-eyebrow">Live account directory</p><h2 id="live-profile-title">{customer?.name || customer?.restaurants[0]?.name || 'Account details'}</h2><p className="crm-id">{customer?.reference}</p></div><button autoFocus type="button" onClick={onClose} aria-label="Close customer profile">Close</button></header>
    {loading ? <p role="status">Loading account…</p> : error ? <p role="alert">{error}</p> : !customer ? <p role="alert">This account was not found in the authorized restaurant directory. It may have been removed or your access may have changed.</p> : <>
      <p className="crm-notice">Live restaurant and owner records. This view is read-only. Financial balances, notes and activity history are not connected.</p>
      <div className="crm-toolbar"><span>{customer.restaurants.length} linked restaurants · Owner status: {customer.status}</span>{validEmail && <a href={`mailto:${encodeURIComponent(email)}`}>Email owner</a>}</div>
      <div className="crm-tabs" role="tablist" aria-label="Customer profile sections">{tabs.map((name, index) => <button key={name} id={`live-tab-${index}`} role="tab" aria-selected={tab === name} aria-controls="live-customer-panel" tabIndex={tab === name ? 0 : -1} onClick={() => setTab(name)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        setTab(tabs[next]); document.getElementById(`live-tab-${next}`).focus();
      }}>{name}</button>)}</div>
      <section id="live-customer-panel" className="crm-panel" role="tabpanel" aria-labelledby={`live-tab-${tabs.indexOf(tab)}`} tabIndex={0}>
        {tab === 'Overview' && <><dl className="crm-facts"><dt>Owner name</dt><dd>{customer.ownerId ? (customer.name || 'Owner name unavailable') : 'Owner link missing'}</dd><dt>Owner email</dt><dd>{email || 'Not available'}</dd><dt>Source account ID</dt><dd className="crm-id">{customer.ownerId || 'Owner link missing'}</dd><dt>Owner registration</dt><dd>Not available from this API</dd><dt>Source</dt><dd>Authorized restaurant administration API</dd></dl>{!customer.ownerId && <p role="alert">This restaurant needs owner-link reconciliation. No customer account was invented or merged.</p>}<p>These are operational account records. A separate paying-customer identity has not been assigned.</p></>}
        {tab === 'Restaurants & staff' && customer.restaurants.map(restaurant => <article className="crm-card" key={restaurant.id}>
          <h3>{restaurant.name || 'Restaurant name unavailable'}</h3><p className="crm-id">Restaurant ID: {restaurant.id}</p><dl className="crm-facts"><dt>Restaurant status</dt><dd>{restaurant.status}</dd><dt>Restaurant contact</dt><dd>{restaurant.phone || 'Not available'}</dd><dt>Address</dt><dd>{restaurant.address || 'Not available'}</dd><dt>Restaurant created</dt><dd>{date(restaurant.createdAt)}</dd></dl>
          <p>Staff directory is not connected in this view.</p>
        </article>)}
        {tab === 'Packages & payments' && <><p>Subscription settings come from the existing owner account. They are not proof of payment or a recorded commercial agreement.</p>{customer.restaurants.map(restaurant => <article className="crm-card" key={restaurant.id}><h3>{restaurant.name || 'Restaurant name unavailable'}</h3><dl className="crm-facts"><dt>Account plan</dt><dd>{restaurant.plan || 'Not recorded'}</dd><dt>Subscription started</dt><dd>{date(restaurant.subscriptionStartedAt)}</dd><dt>Subscription expires</dt><dd>{date(restaurant.subscriptionExpiresAt)}</dd><dt>Agreed price</dt><dd>Not available</dd><dt>Payments / balance</dt><dd>Not connected</dd></dl></article>)}<p>Use Restaurant management for existing subscription actions. The separate customer payment ledger has not been implemented.</p></>}
        {tab === 'Usage' && <><h3>Not tracked</h3><p>The existing directory API does not provide last login, last meaningful activity or order usage. Restaurant update dates are not treated as activity.</p></>}
        {tab === 'Private notes' && <><h3>Private notes are not connected</h3><p>Permanent private notes require the secure admin service. No customer notes are saved in this browser.</p></>}
      </section>
    </>}
  </dialog>;
}
