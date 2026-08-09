import { FiAlertCircle, FiCheckCircle, FiClock, FiCreditCard, FiShoppingBag } from "react-icons/fi";

export default function DashboardHome({ stats }) {
  const metrics = [
    { label: "Revenue", value: `₹${Math.round(stats?.revenue || 0).toLocaleString("en-IN")}`, icon: FiCreditCard },
    { label: "Orders", value: stats?.orders || 0, icon: FiShoppingBag },
    { label: "Preparing", value: stats?.preparing || 0, icon: FiClock },
    { label: "Ready", value: stats?.ready || 0, icon: FiCheckCircle },
  ];
  const attention = Number(stats?.pending || 0) + Number(stats?.delayed || 0);
  return <section className="owner-today">
    <div className="owner-today__heading"><div><h1>Today</h1><p>Your restaurant at a glance</p></div>{attention > 0 && <span><FiAlertCircle /> {attention} need attention</span>}</div>
    <div className="owner-metrics">{metrics.map((item) => { const Icon = item.icon; return <article key={item.label}><Icon /><span>{item.label}</span><strong>{item.value}</strong></article>; })}</div>
    <div className="owner-today__status">
      <article><span className="is-new" /><div><strong>{stats?.pending || 0} new</strong><small>Waiting for kitchen</small></div></article>
      <article><span className="is-preparing" /><div><strong>{stats?.preparing || 0} preparing</strong><small>Work in progress</small></div></article>
      <article><span className="is-ready" /><div><strong>{stats?.ready || 0} ready</strong><small>Waiting for delivery</small></div></article>
    </div>
  </section>;
}
