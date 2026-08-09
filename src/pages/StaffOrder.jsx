import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiMinus, FiPlus, FiSearch, FiShoppingBag, FiX } from "react-icons/fi";
import api from "../api/axios";
import { getDishPricing } from "../utils/pricing";
import {
  getPendingStaffOrders,
  getStaffOrdersEligibleForHandled,
  getStaffOrdersNeedingAttention,
  markStaffOrdersHandled,
  queueStaffOrder,
  reconcileStaffOrderSync,
  recordStaffOrderFailure,
  retryStaffOrdersNeedingAttention,
} from "../utils/offlineOrders";
import { queueKitchenUpdate } from "../utils/offlineKitchenUpdates";

const tableLabel = (table) => table?.type === "room"
  ? `Room ${table.tableNumber || table.locationNumber}`
  : `Table ${table.tableNumber || table.locationNumber}`;

export default function StaffOrder({ hotel, onOrderCreated }) {
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState("dinein");
  const [tableSearch, setTableSearch] = useState("");
  const [dishSearch, setDishSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [cart, setCart] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingStaffOrders().length);
  const [attentionCount, setAttentionCount] = useState(getStaffOrdersNeedingAttention().length);
  const syncInFlight = useRef(false);
  const placingInFlight = useRef(false);

  const refreshQueueCounts = useCallback(() => {
    setPendingSyncCount(getPendingStaffOrders().length);
    setAttentionCount(getStaffOrdersNeedingAttention().length);
  }, []);

  const syncPendingOrders = useCallback(async () => {
    if (syncInFlight.current || !navigator.onLine) return;
    const snapshot = getPendingStaffOrders().filter((item) => !item.requiresAttention);
    if (!snapshot.length) return;
    syncInFlight.current = true;
    try {
      const failed = [];
      for (const queued of snapshot) {
        try {
          const response = await api.post("/orders", queued.payload);
          const syncedOrder = response.data?.order || response.data;
          if (syncedOrder?._id) {
            onOrderCreated?.({
              ...syncedOrder,
              clientOrderId: queued.clientOrderId,
              pendingSync: false,
            });
          }
          if (queued.alreadyHandled && syncedOrder?._id) {
            try {
              await api.put(`/kitchen/orders/${syncedOrder._id}`, { status: "delivered" });
            } catch {
              queueKitchenUpdate({ orderId: syncedOrder._id, status: "delivered", alreadyHandled: true });
            }
          }
        } catch (syncError) {
          failed.push(recordStaffOrderFailure(queued, syncError));
        }
      }
      const remaining = reconcileStaffOrderSync(snapshot, failed);
      setPendingSyncCount(remaining.length);
      setAttentionCount(getStaffOrdersNeedingAttention().length);
    } finally {
      syncInFlight.current = false;
    }
  }, [onOrderCreated]);

  useEffect(() => {
    if (!hotel?._id) return;
    const fetchData = async () => {
      const menuKey = `staff_menu_${hotel._id}`;
      const tableKey = `staff_tables_${hotel._id}`;
      try {
        const [menuResponse, tableResponse] = await Promise.all([
          api.get(`/menu/${hotel._id}`),
          api.get("/table"),
        ]);
        const nextMenu = menuResponse.data?.dishes || menuResponse.data?.menu || menuResponse.data || [];
        const nextTables = tableResponse.data?.tables || tableResponse.data || [];
        setMenu(Array.isArray(nextMenu) ? nextMenu : []);
        setTables(Array.isArray(nextTables) ? nextTables : []);
        localStorage.setItem(menuKey, JSON.stringify(nextMenu));
        localStorage.setItem(tableKey, JSON.stringify(nextTables));
      } catch (fetchError) {
        console.warn("Staff order data fetch failed", fetchError);
        try {
          const cachedMenu = JSON.parse(localStorage.getItem(menuKey) || "[]");
          const cachedTables = JSON.parse(localStorage.getItem(tableKey) || "[]");
          setMenu(Array.isArray(cachedMenu) ? cachedMenu : []);
          setTables(Array.isArray(cachedTables) ? cachedTables : []);
        } catch (cacheError) {
          console.warn("Staff order cache failed", cacheError);
        }
      }
    };
    fetchData();
  }, [hotel?._id]);

  useEffect(() => {
    const online = () => {
      setIsOnline(true);
      syncPendingOrders();
    };
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    refreshQueueCounts();
    syncPendingOrders();
    const interval = window.setInterval(syncPendingOrders, 15000);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.clearInterval(interval);
    };
  }, [refreshQueueCounts, syncPendingOrders]);

  const categories = useMemo(() => ["All", ...new Set(menu
    .filter((dish) => dish.isAvailable !== false)
    .map((dish) => typeof dish.category === "object" ? dish.category?.name : dish.category)
    .filter(Boolean))], [menu]);

  const visibleTables = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return tables.filter((table) => !term || tableLabel(table).toLowerCase().includes(term));
  }, [tableSearch, tables]);

  const visibleMenu = useMemo(() => {
    const term = dishSearch.trim().toLowerCase();
    return menu.filter((dish) => dish.isAvailable !== false).filter((dish) => {
      const dishCategory = typeof dish.category === "object" ? dish.category?.name : dish.category;
      return (category === "All" || dishCategory === category) &&
        (!term || String(dish.name || "").toLowerCase().includes(term));
    });
  }, [category, dishSearch, menu]);

  const quantityFor = (dishId) => cart.find((item) => item.menuId === dishId)?.quantity || 0;

  const changeQuantity = (dish, delta) => {
    const pricing = getDishPricing(dish);
    setCart((current) => {
      const existing = current.find((item) => item.menuId === dish._id);
      if (!existing && delta > 0) return [...current, {
        menuId: dish._id,
        name: dish.name,
        price: pricing.finalPrice,
        quantity: 1,
      }];
      if (!existing) return current;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) return current.filter((item) => item.menuId !== dish._id);
      return current.map((item) => item.menuId === dish._id ? { ...item, quantity } : item);
    });
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const resetOrder = () => {
    setCart([]);
    setGuestName("");
    setGuestContact("");
    setShowGuest(false);
    setDishSearch("");
    setCategory("All");
    setSelectedTable(null);
    setOrderType("dinein");
  };

  const placeOrder = async () => {
    if (placingInFlight.current) return;
    if (!selectedTable && orderType !== "takeaway") {
      setError("Choose a table or room first.");
      return;
    }
    if (!cart.length) {
      setError("Add at least one dish.");
      return;
    }
    const payload = {
      tableId: orderType === "takeaway" ? null : selectedTable._id,
      orderType,
      guestName: guestName.trim() || "Guest",
      guestContact: guestContact.trim() || null,
      items: cart.map((item) => ({ menuId: item.menuId, quantity: item.quantity })),
    };
    const localShape = {
      status: "pending",
      createdAt: new Date().toISOString(),
      orderType,
      tableId: selectedTable,
      locationType: selectedTable?.type,
      locationNumber: selectedTable?.tableNumber || selectedTable?.locationNumber,
      guestName: payload.guestName,
      items: cart.map((item) => ({ ...item })),
      pendingSync: !navigator.onLine,
    };

    setError("");
    placingInFlight.current = true;
    setPlacing(true);
    try {
      if (!navigator.onLine) {
        const queued = queueStaffOrder(payload);
        onOrderCreated?.({ ...localShape, _id: queued.clientOrderId, clientOrderId: queued.clientOrderId });
        refreshQueueCounts();
        setMessage("Order saved. It will sync automatically.");
        resetOrder();
        return;
      }
      const response = await api.post("/orders", payload);
      const created = response.data?.order || response.data;
      onOrderCreated?.(created?._id ? created : { ...localShape, _id: `local-${Date.now()}` });
      setMessage("Order sent to kitchen.");
      resetOrder();
    } catch (placeError) {
      if (!placeError?.response || placeError.response.status >= 500) {
        const queued = queueStaffOrder(payload);
        onOrderCreated?.({ ...localShape, _id: queued.clientOrderId, clientOrderId: queued.clientOrderId, pendingSync: true });
        refreshQueueCounts();
        setMessage("Order saved. It will sync automatically.");
        resetOrder();
      } else {
        setError(placeError.response?.data?.message || "Could not place order.");
      }
    } finally {
      placingInFlight.current = false;
      setPlacing(false);
    }
  };

  const chooseLocation = (table) => {
    setSelectedTable(table);
    setOrderType("dinein");
    setError("");
  };

  return (
    <section className="staff-order-flow">
      <h1 className="sr-only">Staff Ordering</h1>

      {(!isOnline || pendingSyncCount > 0) && (
        <div className={`ops-sync-strip${attentionCount ? " needs-attention" : ""}`}>
          <span>{!isOnline ? "Offline · orders save here" : attentionCount ? `${attentionCount} need attention` : `${pendingSyncCount} syncing`}</span>
          {attentionCount > 0 && isOnline && (
            <>
              {getStaffOrdersEligibleForHandled().length > 0 && <button type="button" onClick={() => {
                markStaffOrdersHandled();
                refreshQueueCounts();
              }}>Already handled</button>}
              <button type="button" onClick={() => {
                retryStaffOrdersNeedingAttention();
                refreshQueueCounts();
                syncPendingOrders();
              }}>Retry</button>
            </>
          )}
        </div>
      )}
      {message && <div className="ops-inline-success" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><FiX /></button></div>}
      {error && <div className="ops-inline-error" role="alert">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError("")}><FiX /></button></div>}

      {!selectedTable && orderType !== "takeaway" ? (
        <div className="staff-location-step">
          {tables.length > 12 && (
            <label className="ops-search"><FiSearch /><input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Search table or room" /></label>
          )}
          <div className="staff-location-grid">
            {visibleTables.map((table) => (
              <button key={table._id} type="button" className="staff-location-tile" onClick={() => chooseLocation(table)}>
                <strong>{tableLabel(table)}</strong>
                {table.activeOrderCount > 0 && <span>{table.activeOrderCount} active</span>}
              </button>
            ))}
          </div>
          {hotel?.takeawayEnabled !== false && (
            <button type="button" className="staff-takeaway-link" onClick={() => setOrderType("takeaway")}>Takeaway order</button>
          )}
        </div>
      ) : (
        <div className="staff-menu-step">
          <header className="staff-menu-step__head">
            <button type="button" className="ops-icon-button" aria-label="Back to tables" onClick={resetOrder}><FiArrowLeft /></button>
            <div><strong>{orderType === "takeaway" ? "Takeaway" : tableLabel(selectedTable)}</strong><span>{cartCount ? `${cartCount} selected` : "Tap a dish to add"}</span></div>
            <button type="button" className="staff-guest-toggle" onClick={() => setShowGuest((value) => !value)}>Guest details</button>
          </header>

          {showGuest && (
            <div className="staff-guest-fields">
              <input type="tel" value={guestContact} onChange={(event) => setGuestContact(event.target.value)} placeholder="Contact (optional)" />
              <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Name (optional)" />
            </div>
          )}

          <label className="ops-search staff-dish-search"><FiSearch /><input value={dishSearch} onChange={(event) => setDishSearch(event.target.value)} placeholder="Search dishes" /></label>
          <div className="staff-category-bar">
            {categories.slice(0, 4).map((item) => (
              <button type="button" key={item} className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
            {categories.length > 4 && <button type="button" onClick={() => setShowAllCategories(true)}>More ›</button>}
          </div>

          <div className="staff-dish-list">
            {visibleMenu.map((dish) => {
              const quantity = quantityFor(dish._id);
              const { basePrice, finalPrice, hasDiscount } = getDishPricing(dish);
              return (
                <div className="staff-dish-row" key={dish._id}>
                  <button type="button" className="staff-dish-row__main" onClick={() => changeQuantity(dish, 1)} aria-label={`Add ${dish.name}`}>
                    <span className={`food-mark ${dish.foodType === "nonveg" ? "is-nonveg" : "is-veg"}`} aria-label={dish.foodType === "nonveg" ? "Non-vegetarian" : "Vegetarian"} />
                    <span><strong>{dish.name}</strong>{dish.containsEgg && dish.foodType !== "nonveg" && <small>Contains egg</small>}</span>
                    <span className="staff-dish-price">{hasDiscount && <del>₹{basePrice.toFixed(0)}</del>}<b>₹{finalPrice.toFixed(0)}</b></span>
                    {!quantity && <span className="staff-add-label">Add</span>}
                  </button>
                  {quantity > 0 && (
                    <div className="staff-qty" aria-label={`${dish.name} quantity`}>
                      <button type="button" aria-label={`Remove one ${dish.name}`} onClick={() => changeQuantity(dish, -1)}><FiMinus /></button>
                      <b>{quantity}</b>
                      <button type="button" aria-label={`Add one ${dish.name}`} onClick={() => changeQuantity(dish, 1)}><FiPlus /></button>
                    </div>
                  )}
                </div>
              );
            })}
            {!visibleMenu.length && <p className="ops-empty-row">No dishes found</p>}
          </div>

          {cartCount > 0 && (
            <div className="staff-cart-bar">
              <span><FiShoppingBag /><b>{cartCount} items</b><small>₹{total.toFixed(0)}</small></span>
              <button type="button" onClick={placeOrder} disabled={placing}>{placing ? "Sending…" : "Place Order"}</button>
            </div>
          )}
        </div>
      )}

      {showAllCategories && (
        <div className="ops-sheet-backdrop" onClick={() => setShowAllCategories(false)}>
          <section className="ops-action-sheet" onClick={(event) => event.stopPropagation()}>
            <h2>Categories</h2>
            <div className="staff-all-categories">
              {categories.map((item) => <button type="button" key={item} onClick={() => { setCategory(item); setShowAllCategories(false); }}>{item}</button>)}
            </div>
            <button type="button" className="ops-sheet-cancel" onClick={() => setShowAllCategories(false)}>Close</button>
          </section>
        </div>
      )}
    </section>
  );
}
