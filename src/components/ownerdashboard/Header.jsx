import { FiMenu, FiRefreshCw } from "react-icons/fi";

export default function Header({ hotel, activeTab, navItems, newOrderCount = 0, onMenuToggle, onRefresh, loading }) {
  const title = navItems?.find((item) => item.key === activeTab)?.label || "Today";
  return <header className="owner-header">
    <button type="button" className="ops-icon-button owner-mobile-menu" aria-label="Open owner menu" onClick={onMenuToggle}><FiMenu /></button>
    <div><strong>{title}</strong><span>{hotel?.name || "Restaurant"}</span></div>
    {activeTab !== "orders" && newOrderCount > 0 && <em className="owner-header__alert" aria-label={`${newOrderCount} new orders`}>{newOrderCount}</em>}
    <button type="button" className="ops-icon-button" aria-label="Refresh" onClick={onRefresh}><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
  </header>;
}
