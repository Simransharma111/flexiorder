import { FiAlertCircle, FiCheckCircle, FiClock, FiCreditCard, FiShoppingBag, FiGlobe, FiMapPin } from "react-icons/fi";

export default function DashboardHome({ stats, hotel, setActiveTab }) {
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
      {/* Personalized Hero Banner */}
      <div 
        className="owner-hero-banner"
        style={{
          backgroundImage: hotel?.coverImage ? `linear-gradient(to right, rgba(0,0,0,0.85), rgba(0,0,0,0.4)), url(${hotel.coverImage})` : 'linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(239, 68, 68, 0.95))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
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
            <div className="owner-hero-meta">
              {hotel?.address && (
                <span><FiMapPin /> {hotel.address}</span>
              )}
              {hotel?.website && (
                <span><FiGlobe /> {hotel.website}</span>
              )}
            </div>
          </div>
        </div>
        <div className="owner-hero-status">
          {hotel?.orderingEnabled !== false ? (
            <span className="status-pill is-active">🟢 Ordering Enabled</span>
          ) : (
            <span className="status-pill is-paused">🟡 Ordering Paused</span>
          )}
        </div>
      </div>

      <div className="owner-today__heading">
        <div>
          <h2>Today</h2>
          <p>Your restaurant at a glance</p>
        </div>
        {attention > 0 && (
          <span 
            className="needs-attention-badge" 
            onClick={() => setActiveTab && setActiveTab("orders")}
            style={{ cursor: 'pointer' }}
          >
            <FiAlertCircle /> {attention} need attention
          </span>
        )}
      </div>

      <div className="owner-metrics">
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <article 
              key={item.label} 
              onClick={() => setActiveTab && item.targetTab && setActiveTab(item.targetTab)}
              style={{ cursor: setActiveTab ? 'pointer' : 'default' }}
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
        <article onClick={() => setActiveTab?.("orders")} style={{ cursor: 'pointer' }}>
          <span className="is-new" />
          <div>
            <strong>{stats?.pending || 0} new</strong>
            <small>Waiting for kitchen</small>
          </div>
        </article>
        <article onClick={() => setActiveTab?.("orders")} style={{ cursor: 'pointer' }}>
          <span className="is-preparing" />
          <div>
            <strong>{stats?.preparing || 0} preparing</strong>
            <small>Work in progress</small>
          </div>
        </article>
        <article onClick={() => setActiveTab?.("orders")} style={{ cursor: 'pointer' }}>
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
