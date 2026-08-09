import { useCallback, useEffect, useState } from "react";
import { FiMoreVertical, FiPower, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import socket from "../socket";
import StaffOrder from "./StaffOrder";
import Orders from "../components/ownerdashboard/Orders";
import { getScopedStorageKey } from "../utils/storageScope";
import { mergeOrders, orderKey, reconcileAuthoritativeOrders } from "../utils/orderModel";
import { getPendingKitchenUpdates } from "../utils/offlineKitchenUpdates";

const HOTEL_CACHE_KEY = "flexiorder_staff_hotel";
const ORDERS_CACHE_KEY = "flexiorder_staff_orders";

export default function StaffWorkspace() {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updatingOrdering, setUpdatingOrdering] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const persistOrders = useCallback((next) => {
    localStorage.setItem(getScopedStorageKey(ORDERS_CACHE_KEY), JSON.stringify(next));
    return next;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [hotelResponse, ordersResponse] = await Promise.all([
        api.get("/hotel/me"),
        api.get("/kitchen/orders?type=kitchen"),
      ]);
      const nextHotel = hotelResponse.data?.hotel || hotelResponse.data;
      const nextOrders = ordersResponse.data?.orders || ordersResponse.data || [];
      setHotel(nextHotel);
      setOrders((current) => persistOrders(
        reconcileAuthoritativeOrders(current, nextOrders, getPendingKitchenUpdates())
      ));
      localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
    } catch (error) {
      console.warn("Staff workspace loading failed", error);
      try {
        const cachedHotel = localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY));
        const cachedOrders = localStorage.getItem(getScopedStorageKey(ORDERS_CACHE_KEY));
        if (cachedHotel) setHotel(JSON.parse(cachedHotel));
        if (cachedOrders) setOrders((current) => mergeOrders(current, JSON.parse(cachedOrders)));
      } catch (cacheError) {
        console.warn("Staff workspace cache failed", cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [persistOrders]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    fetchData();
    const interval = window.setInterval(fetchData, 15000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(interval);
    };
  }, [fetchData]);

  useEffect(() => {
    if (hotel?._id) socket.emit("joinHotel", hotel._id);
  }, [hotel?._id]);

  useEffect(() => {
    const upsert = (order) => setOrders((current) => persistOrders(mergeOrders(current, [order])));
    const update = (order) => {
      if (order.status === "cancelled") {
        setOrders((current) => persistOrders(
          current.filter((item) => orderKey(item) !== orderKey(order))
        ));
        return;
      }
      upsert(order);
    };
    socket.on("newOrder", upsert);
    socket.on("kitchenOrderUpdated", update);
    return () => {
      socket.off("newOrder", upsert);
      socket.off("kitchenOrderUpdated", update);
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

  if (loading && !hotel) return <div className="ops-loading">Loading waiter workspace…</div>;

  return (
    <main className="ops-workspace ops-waiter-workspace">
      <header className="ops-waiter-tabs">
        <div role="tablist" aria-label="Waiter workspace">
          <button type="button" role="tab" aria-selected={activeTab === "orders"} className={activeTab === "orders" ? "is-active" : ""} onClick={() => setActiveTab("orders")}>Orders</button>
          <button type="button" role="tab" aria-selected={activeTab === "take"} className={activeTab === "take" ? "is-active" : ""} onClick={() => setActiveTab("take")}>Take Order</button>
        </div>
        <span className={`ops-connection-dot ${isOnline ? "is-online" : "is-offline"}`} title={isOnline ? "Online" : "Offline · work is saved"} aria-label={isOnline ? "Online" : "Offline"} />
        <button type="button" className="ops-icon-button" aria-label="More waiter options" onClick={() => setMenuOpen(true)}><FiMoreVertical /></button>
      </header>

      {menuOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="ops-tools-sheet__brand"><strong>{hotel?.name || "Restaurant"}</strong><span>Waiter workspace</span></div>
            <button type="button" onClick={() => navigate("/kitchen")}>Kitchen workspace</button>
            <button type="button" onClick={toggleOrdering} disabled={updatingOrdering}><FiPower /> {hotel?.orderingEnabled === false ? "Turn customer ordering on" : "Pause customer ordering"}</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => setMenuOpen(false)}><FiX /> Close</button>
          </aside>
        </div>
      )}

      <div className="ops-waiter-content">
        <div hidden={activeTab !== "take"}>
          <StaffOrder hotel={hotel} onOrderCreated={addVisibleOrder} />
        </div>
        <div hidden={activeTab !== "orders"}>
          <Orders orders={orders} refresh={fetchData} onOrdersChange={setOrders} />
        </div>
      </div>
    </main>
  );
}
