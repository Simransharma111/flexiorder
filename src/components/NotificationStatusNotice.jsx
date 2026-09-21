import { useEffect, useState } from "react";
import { FiBellOff, FiRefreshCw } from "react-icons/fi";
import {
  getOrderNotificationStatus,
  ORDER_NOTIFICATION_STATUS_EVENT,
  recheckOrderNotifications,
} from "../utils/fcmPush";

export default function NotificationStatusNotice() {
  const [status, setStatus] = useState(getOrderNotificationStatus);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const update = (event) => setStatus(event.detail);
    window.addEventListener(ORDER_NOTIFICATION_STATUS_EVENT, update);
    return () => window.removeEventListener(ORDER_NOTIFICATION_STATUS_EVENT, update);
  }, []);

  if (!["denied", "error"].includes(status.state)) return null;

  const checkAgain = async () => {
    if (checking) return;
    setChecking(true);
    try { await recheckOrderNotifications(); } finally { setChecking(false); }
  };

  return (
    <div className="ops-notification-warning" role="alert">
      <FiBellOff aria-hidden="true" />
      <span>{status.message}</span>
      <button type="button" onClick={checkAgain} disabled={checking}>
        <FiRefreshCw className={checking ? "animate-spin" : ""} aria-hidden="true" />
        {checking ? "Checking…" : "Check again"}
      </button>
    </div>
  );
}
