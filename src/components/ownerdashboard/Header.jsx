import { useEffect, useState } from "react";
import { FiBellOff, FiMenu, FiRefreshCw } from "react-icons/fi";
import {
  getOrderNotificationStatus,
  ORDER_NOTIFICATION_STATUS_EVENT,
} from "../../utils/fcmPush";

export default function Header({ hotel, activeTab, navItems, newOrderCount = 0, onMenuToggle, onRefresh, loading, connectionStatus = "connecting", connectionLabel = "Connecting" }) {
  const [notificationStatus, setNotificationStatus] = useState(getOrderNotificationStatus);
  useEffect(() => {
    const handleStatus = (event) => setNotificationStatus(event.detail);
    window.addEventListener(ORDER_NOTIFICATION_STATUS_EVENT, handleStatus);
    return () => window.removeEventListener(ORDER_NOTIFICATION_STATUS_EVENT, handleStatus);
  }, []);
  const title = navItems?.find((item) => item.key === activeTab)?.label || "Today";
  return <header className="owner-header">
    <button type="button" className="ops-icon-button owner-mobile-menu" aria-label="Open owner menu" onClick={onMenuToggle}><FiMenu /></button>
    <div><strong>{title}</strong><span>{hotel?.name || "Restaurant"}</span></div>
    {activeTab !== "orders" && newOrderCount > 0 && <em className="owner-header__alert" aria-label={`${newOrderCount} new orders`}>{newOrderCount}</em>}
    {["denied", "error"].includes(notificationStatus.state) && <span className="owner-header__notification-warning" title={notificationStatus.message} aria-label={notificationStatus.message}><FiBellOff /> Alerts off</span>}
    <span className={`ops-connection-dot is-${connectionStatus}`} title={connectionLabel} aria-label={connectionLabel} />
    <button type="button" className="ops-icon-button" aria-label="Refresh" onClick={onRefresh}><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
  </header>;
}
