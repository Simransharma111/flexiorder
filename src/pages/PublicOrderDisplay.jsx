import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiLogOut, FiMaximize, FiMinimize, FiRefreshCw, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import {
  appLevelAllows,
  canUseStaffCapability,
  getFeatureSettings,
  hydrateHotelFeatures,
} from "../utils/featureSettings";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import {
  groupOrdersByLocation,
  itemCount,
  matchesOrderId,
  mergeOrders,
  orderBelongsToHotel,
} from "../utils/orderModel";
import { clearAuthSession, getStoredAuthToken, readStoredSession } from "../utils/session";
import { getScopedStorageKey } from "../utils/storageScope";

const CACHE_KEY = "flexiorder_public_display_orders";
const HOTEL_CACHE_KEY = "flexiorder_public_display_hotel";

export default function PublicOrderDisplay() {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const wakeLock = useRef(null);
  const role = readStoredSession().user?.role;

  const cacheOrders = useCallback((next) => {
    try {
      localStorage.setItem(getScopedStorageKey(CACHE_KEY), JSON.stringify(next));
    } catch {
      // The live display remains usable when browser storage is restricted.
    }
    return next;
  }, []);

  const fetchDisplay = useCallback(async () => {
    const [hotelResult, orderResult] = await Promise.allSettled([
      api.get("/hotel/me"),
      api.get("/kitchen/orders"),
    ]);

    if (hotelResult.status === "fulfilled") {
      const nextHotel = hydrateHotelFeatures(
        hotelResult.value.data?.hotel || hotelResult.value.data
      );
      setHotel(nextHotel);
      try {
        localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
      } catch {
        // Live data still works when persistent storage is unavailable.
      }
    } else {
      try {
        const cachedHotel = JSON.parse(
          localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY)) || "null"
        );
        if (cachedHotel) setHotel(hydrateHotelFeatures(cachedHotel));
      } catch {
        // Leave the loading state in place when this display has never been warmed.
      }
    }

    if (orderResult.status === "fulfilled") {
      const nextOrders = (
        orderResult.value.data?.orders || orderResult.value.data || []
      ).filter((order) => !["delivered", "cancelled"].includes(order.status));
      setOrders(cacheOrders(nextOrders));
    } else {
      try {
        const cached = JSON.parse(
          localStorage.getItem(getScopedStorageKey(CACHE_KEY)) || "[]"
        );
        setOrders(Array.isArray(cached) ? cached : []);
      } catch {
        setOrders([]);
      }
    }
  }, [cacheOrders]);

  useEffect(() => {
    fetchDisplay();
    const interval = window.setInterval(fetchDisplay, 15000);
    return () => window.clearInterval(interval);
  }, [fetchDisplay]);

  useEffect(() => {
    if (!hotel?._id) return undefined;
    const hotelId = String(hotel._id);
    const joinHotel = () => socket.emit("joinHotel", hotelId, getStoredAuthToken());
    joinHotel();
    socket.on("connect", joinHotel);
    return () => {
      socket.emit("leaveHotel", hotelId);
      socket.off("connect", joinHotel);
    };
  }, [hotel?._id]);

  useEffect(() => {
    const upsert = (order) => setOrders((current) => {
      if (!orderBelongsToHotel(order, hotel?._id)) return current;
      let next;
      if (["delivered", "cancelled"].includes(order.status)) {
        const identifiers = [order._id, order.clientOrderId, order.localId].filter(Boolean);
        next = current.filter((item) => !identifiers.some((id) => matchesOrderId(item, id)));
      } else {
        next = mergeOrders(current, [order]);
      }
      return cacheOrders(next);
    });
    socket.on("newOrder", upsert);
    socket.on("kitchenOrderUpdated", upsert);
    return () => {
      socket.off("newOrder", upsert);
      socket.off("kitchenOrderUpdated", upsert);
    };
  }, [cacheOrders, hotel?._id]);

  useEffect(() => {
    const keepAwake = async () => {
      try {
        wakeLock.current = await navigator.wakeLock?.request("screen");
      } catch {
        wakeLock.current = null;
      }
    };
    keepAwake();
    const onVisibility = () => document.visibilityState === "visible" && keepAwake();
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      wakeLock.current?.release?.();
    };
  }, []);

  const preparing = useMemo(() => groupOrdersByLocation(
    orders.filter((order) => ["pending", "accepted", "preparing", "paused"].includes(order.status))
  ), [orders]);
  const ready = useMemo(() => groupOrdersByLocation(
    orders.filter((order) => order.status === "ready")
  ), [orders]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable in a browser preview; the display remains usable.
    }
  };

  const signOut = () => {
    if (!window.confirm("Sign out of FlexiOrder on this device?")) return;
    clearAuthSession();
    navigate("/login");
  };

  if (!hotel) return <div className="ops-loading">Loading public display…</div>;
  const featureSettings = getFeatureSettings(hotel);
  const canSwitch = canUseStaffCapability(hotel, "switchWorkspaces", role);
  if (!appLevelAllows(featureSettings.appLevel, "basic") ||
      !featureSettings.publicDisplayEnabled ||
      !canUseStaffCapability(hotel, "usePublicDisplay", role)) {
    return <main className="ops-access-message"><p>Public order display is not enabled.</p><button type="button" onClick={() => navigate(["owner", "superadmin"].includes(role) ? "/owner/dashboard" : "/kitchen")}>Go back</button></main>;
  }

  return (
    <main className="public-order-display" style={getHotelThemeStyle(hotel)}>
      {/* Persistent fullscreen button — always visible, top-right corner */}
      <button
        type="button"
        className="public-display-fullscreen-btn"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
        title={isFullscreen ? "Exit full screen (F11)" : "Full screen"}
      >
        {isFullscreen ? <FiMinimize /> : <FiMaximize />}
      </button>

      <button type="button" className="public-display-edge" aria-label="Open display options" onClick={() => setToolsOpen(true)}>•••</button>
      <div className="public-display-board">
        <section className="public-display-lane is-preparing">
          <header><h1>Preparing</h1><span>{preparing.length}</span></header>
          <div className="public-display-grid">
            {preparing.map((group) => <DisplayCard key={group.key} group={group} />)}
            {!preparing.length && <p>No orders preparing</p>}
          </div>
        </section>
        <section className="public-display-lane is-ready">
          <header><h1>Ready</h1><span>{ready.length}</span></header>
          <div className="public-display-grid">
            {ready.map((group) => <DisplayCard key={group.key} group={group} ready />)}
            {!ready.length && <p>Nothing ready</p>}
          </div>
        </section>
      </div>

      {toolsOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setToolsOpen(false)}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="ops-tools-sheet__brand"><strong>{hotel.name}</strong><span>Public order display</span></div>
            <button type="button" onClick={toggleFullscreen}>{isFullscreen ? <FiMinimize /> : <FiMaximize />} {isFullscreen ? "Exit full screen" : "Full screen"}</button>
            <button type="button" onClick={fetchDisplay}><FiRefreshCw /> Refresh</button>
            {canSwitch && <button type="button" onClick={() => navigate("/kitchen")}>Kitchen workspace</button>}
            {canSwitch && <button type="button" onClick={() => navigate("/owner/order")}>Waiter workspace</button>}
            {["owner", "superadmin"].includes(role) && <button type="button" onClick={() => navigate("/owner/dashboard")}>Manage restaurant</button>}
            <button type="button" onClick={signOut}><FiLogOut /> Sign out</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => setToolsOpen(false)}><FiX /> Close</button>
          </aside>
        </div>
      )}
    </main>
  );
}

function DisplayCard({ group, ready = false }) {
  const totalItems = group.orders.reduce((sum, order) => sum + itemCount(order), 0);
  return (
    <article className={`public-display-card${ready ? " is-ready" : ""}`}>
      <strong>{group.location}</strong>
      <span>{group.orders.length > 1 ? `${group.orders.length} orders · ` : ""}{totalItems} items</span>
      <b>{ready ? "Ready" : "Preparing"}</b>
    </article>
  );
}
