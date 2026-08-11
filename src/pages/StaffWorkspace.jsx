import { useCallback, useEffect, useRef, useState } from "react";
import { FiLogOut, FiMoreVertical, FiPower, FiRefreshCw, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import { triggerLocalOrderNotification } from "../utils/fcmPush";
import StaffOrder from "./StaffOrder";
import Orders from "../components/ownerdashboard/Orders";
import { getScopedStorageKey, rememberRestaurantId } from "../utils/storageScope";
import { mergeOrders, mergeOrderUpdate, reconcileAuthoritativeOrders } from "../utils/orderModel";
import { getPendingKitchenUpdates } from "../utils/offlineKitchenUpdates";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import { clearAuthSession, readStoredSession } from "../utils/session";
import {
  applyHotelSettingsUpdate,
  canUseStaffCapability,
  getFeatureSettings,
  hydrateHotelFeatures,
  persistFeatureSettings,
} from "../utils/featureSettings";
import { useConnectivity } from "../context/ConnectivityContext";

const HOTEL_CACHE_KEY = "flexiorder_staff_hotel";
const ORDERS_CACHE_KEY = "flexiorder_staff_orders";

export default function StaffWorkspace() {
  const navigate = useNavigate();
  const { status: connectionStatus, label: connectionLabel } = useConnectivity();
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrdering, setUpdatingOrdering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const settingsRevision = useRef(0);
  const currentRole = readStoredSession().user?.role;

  const persistOrders = useCallback((next) => {
    localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY), JSON.stringify(next));
    return next;
  }, []);

  const fetchData = useCallback(async () => {
    const requestRevision = settingsRevision.current;
    try {
      const [hotelResponse, ordersResponse] = await Promise.all([
        api.get("/hotel/me"),
        api.get("/kitchen/orders"),
      ]);
      const nextHotel = hydrateHotelFeatures(hotelResponse.data?.hotel || hotelResponse.data);
      rememberRestaurantId(nextHotel);
      const nextOrders = ordersResponse.data?.orders || ordersResponse.data || [];
      if (requestRevision === settingsRevision.current) {
        setHotel(nextHotel);
        localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
      }
      setOrders((current) => persistOrders(
        reconcileAuthoritativeOrders(current, nextOrders, getPendingKitchenUpdates())
      ));
    } catch (error) {
      console.warn("Staff workspace loading failed", error);
      try {
        const cachedHotel = localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY));
        const cachedOrders = localStorage.getItem(getScopedStorageKey(ORDERS_CACHE_KEY));
        if (cachedHotel && requestRevision === settingsRevision.current) {
          setHotel(JSON.parse(cachedHotel));
        }
        if (cachedOrders) setOrders((current) => mergeOrders(current, JSON.parse(cachedOrders)));
      } catch (cacheError) {
        console.warn("Staff workspace cache failed", cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [persistOrders]);

  const refreshNow = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 15000);
    return () => {
      window.clearInterval(interval);
    };
  }, [fetchData]);

  useEffect(() => {
    if (hotel?._id) socket.emit("joinHotel", hotel._id);
  }, [hotel?._id]);

  useEffect(() => {
    const upsert = (order) => setOrders((current) => persistOrders(
      mergeOrderUpdate(current, order, getPendingKitchenUpdates())
    ));
    const handleNewOrder = (order) => {
      upsert(order);
      triggerLocalOrderNotification(order);
    };
    const update = (order) => upsert(order);
    const updateHotelSettings = (payload) => {
      settingsRevision.current += 1;
      setHotel((current) => {
        const next = applyHotelSettingsUpdate(current, payload);
        if (!next || next === current) return current;
        persistFeatureSettings(next, next.featureSettings);
        localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(next));
        return next;
      });
    };
    socket.on("newOrder", handleNewOrder);
    socket.on("kitchenOrderUpdated", update);
    socket.on("hotelSettingsUpdated", updateHotelSettings);
    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("kitchenOrderUpdated", update);
      socket.off("hotelSettingsUpdated", updateHotelSettings);
    };
  }, [persistOrders]);

  const toggleOrdering = async () => {
    if (!hotel || updatingOrdering) return;
    const nextValue = hotel.orderingEnabled === false;
    if (!window.confirm(nextValue
      ? "Allow customers to place new orders now?"
      : "Pause customer ordering? Customers can still view the menu.")) return;
    setUpdatingOrdering(true);
    try {
      await api.patch("/hotel/profile", { orderingEnabled: nextValue });
      const nextHotel = { ...hotel, orderingEnabled: nextValue };
      setHotel(nextHotel);
      localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
    } catch (error) {
      window.alert(error?.response?.data?.message || "Could not update customer ordering.");
    } finally {
      setUpdatingOrdering(false);
    }
  };

  const addVisibleOrder = useCallback((order) => {
    if (!order) return;
    setOrders((current) => persistOrders(mergeOrders(current, [order])));
    setActiveTab("orders");
  }, [persistOrders]);

  const logout = () => {
    if (!window.confirm("Sign out of FlexiOrder on this device?")) return;
    clearAuthSession();
    navigate("/login");
  };

  const featureSettings = getFeatureSettings(hotel);
  const canSwitch = canUseStaffCapability(hotel, "switchWorkspaces", currentRole);
  const canEditMenu = canUseStaffCapability(hotel, "editMenu", currentRole);
  const canChangeOrdering = canUseStaffCapability(hotel, "changeOrdering", currentRole);
  const canUseDisplay = featureSettings.publicDisplayEnabled &&
    canUseStaffCapability(hotel, "usePublicDisplay", currentRole);
  const canBulkDeliver = ["staff", "waiter", "owner", "superadmin"].includes(
    String(currentRole || "").toLowerCase()
  );

  if (loading && !hotel) return <div className="ops-loading">Loading waiter workspace…</div>;

  return (
    <main className="ops-workspace ops-waiter-workspace" style={getHotelThemeStyle(hotel)}>
      <header className="ops-waiter-tabs">
        <div role="tablist" aria-label="Waiter workspace">
          <button type="button" role="tab" aria-selected={activeTab === "orders"} className={activeTab === "orders" ? "is-active" : ""} onClick={() => setActiveTab("orders")}>Orders</button>
          <button type="button" role="tab" aria-selected={activeTab === "take"} className={activeTab === "take" ? "is-active" : ""} onClick={() => setActiveTab("take")}>Take Order</button>
        </div>
        <span className={`ops-connection-dot is-${connectionStatus}`} title={connectionLabel === "Offline" ? "Offline · work is saved" : connectionLabel} aria-label={connectionLabel} />
        <button type="button" className="ops-icon-button" aria-label="Refresh waiter workspace" onClick={refreshNow} disabled={refreshing}><FiRefreshCw className={refreshing ? "animate-spin" : ""} /></button>
        <button type="button" className="ops-icon-button" aria-label="More waiter options" onClick={() => setMenuOpen(true)}><FiMoreVertical /></button>
      </header>

      {menuOpen && (
        <div className="ops-sheet-backdrop" onClick={() => { setMenuOpen(false); setMoreOpen(false); }}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="ops-tools-sheet__brand"><strong>{hotel?.name || "Restaurant"}</strong><span>Waiter workspace</span></div>
            {canSwitch && <button type="button" onClick={() => navigate("/kitchen")}>Kitchen workspace</button>}
            <button type="button" onClick={() => setMoreOpen((prev) => !prev)}>{moreOpen ? "▲ Fewer options" : "▾ More settings"}</button>
            {moreOpen && (
              <>
                {["owner", "superadmin"].includes(currentRole) && (
                  <button type="button" onClick={() => navigate("/owner/dashboard")}>Manage restaurant</button>
                )}
                {canEditMenu && <button type="button" onClick={() => navigate("/staff/menu")}>Edit menu</button>}
                {canUseDisplay && <button type="button" onClick={() => navigate("/display")}>Public order display</button>}
                {canChangeOrdering && <button type="button" onClick={toggleOrdering} disabled={updatingOrdering}><FiPower /> {hotel?.orderingEnabled === false ? "Turn customer ordering on" : "Pause customer ordering"}</button>}
              </>
            )}
            <button type="button" onClick={logout}><FiLogOut /> Sign out</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => { setMenuOpen(false); setMoreOpen(false); }}><FiX /> Close</button>
          </aside>
        </div>
      )}

      <div className="ops-waiter-content">
        <div hidden={activeTab !== "take"}>
          <StaffOrder hotel={hotel} onOrderCreated={addVisibleOrder} />
        </div>
        <div hidden={activeTab !== "orders"}>
          <Orders
            orders={orders}
            refresh={fetchData}
            onOrdersChange={setOrders}
            godModeEnabled={featureSettings.godModeEnabled}
            allowBulkDelivery={canBulkDeliver}
            hotel={hotel}
          />
        </div>
      </div>
    </main>
  );
}
