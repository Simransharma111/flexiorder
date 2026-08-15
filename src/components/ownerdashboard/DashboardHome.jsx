import { FiAlertCircle, FiCheckCircle, FiClock, FiCreditCard, FiShoppingBag, FiGlobe, FiMapPin } from "react-icons/fi";

export default function DashboardHome({
  stats,
  hotel,
  setActiveTab,
}) {
  const metrics = [
    {
      label: "Revenue",
      value: `₹${Math.round(stats?.revenue || 0).toLocaleString("en-IN")}`,
      icon: FiCreditCard,
      targetTab: "analytics"
    },
    {
      label: "Orders",
      value: stats?.orders || 0,
      icon: FiShoppingBag,
      targetTab: "orders"
    },
    {
      label: "Preparing",
      value: stats?.preparing || 0,
      icon: FiClock,
      targetTab: "orders"
    },
    {
      label: "Ready",
      value: stats?.ready || 0,
      icon: FiCheckCircle,
      targetTab: "orders"
    },
  ];

  const attention = Number(stats?.pending || 0) + Number(stats?.delayed || 0);

  return (
    <section className="owner-today">
      {/* Restaurant identity card */}
      <div className={`owner-hero-banner${hotel?.coverImage ? " has-cover" : ""}`}>
        {hotel?.coverImage && (
          <div className="owner-hero-cover" style={{ backgroundImage: `url(${hotel.coverImage})` }} role="img" aria-label={hotel?.name || "Restaurant cover"} />
        )}
        <div className="owner-hero-content">
          {hotel?.logo ? (
            <img src={hotel.logo} alt={hotel.name} className="owner-hero-logo" />
          ) : (
            <div className="owner-hero-logo-placeholder">
              {hotel?.name?.charAt(0) || "H"}
            </div>
          )}
          <div className="owner-hero-text">
            <h1>{hotel?.name || "Welcome Back"}</h1>
            {hotel?.tagline && <p className="owner-hero-tagline">{hotel.tagline}</p>}
            {(hotel?.address || hotel?.website) && (
              <div className="owner-hero-meta">
                {hotel?.address && (
                  <span><FiMapPin /> {hotel.address}</span>
                )}
                {hotel?.website && (
                  <span><FiGlobe /> {hotel.website}</span>
                )}
              </div>
            )}
          </div>
          <div className="owner-hero-status">
            {hotel?.orderingEnabled !== false ? (
              <span className="status-pill is-active">Ordering Enabled</span>
            ) : (
              <span className="status-pill is-paused">Ordering Paused</span>
            )}
          </div>
        </div>
      </div>

      <div className="owner-today__heading">
        <div>
          <h2>Today</h2>
          <p>Your restaurant at a glance</p>
        </div>
        {attention > 0 && (
          <button
            type="button"
            className="needs-attention-badge"
            onClick={() => setActiveTab && setActiveTab("orders")}
          >
            <FiAlertCircle /> {attention} need attention
          </button>
        )}
      </div>

      <div className="owner-metrics">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              onClick={() => setActiveTab && item.targetTab && setActiveTab(item.targetTab)}
              style={{ cursor: setActiveTab ? "pointer" : "default" }}
              className="clickable-metric-card"
            >
              <Icon />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          );
        })}
      </div>

      <div className="owner-today__status">
        <article onClick={() => setActiveTab?.("orders")}>
          <span className="is-new" />
          <div>
            <strong>{stats?.pending || 0} new</strong>
            <small>Waiting for kitchen</small>
          </div>
        </article>
        <article onClick={() => setActiveTab?.("orders")}>
          <span className="is-preparing" />
          <div>
            <strong>{stats?.preparing || 0} preparing</strong>
            <small>Work in progress</small>
          </div>
        </article>
        <article onClick={() => setActiveTab?.("orders")}>
          <span className="is-ready" />
          <div>
            <strong>{stats?.ready || 0} ready</strong>
            <small>Waiting for delivery</small>
          </div>
        </article>
      </div>
    </section>
  );
}
