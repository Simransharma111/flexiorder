import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiMinus, FiPlus, FiSearch, FiShoppingBag, FiX } from "react-icons/fi";
import api from "../api/axios";
import { getDishPricing } from "../utils/pricing";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import { buildCategoryList, categoryKey } from "../utils/menuCategories";
import {
  getPendingStaffOrders,
  getStaffOrdersEligibleForHandled,
  getStaffOrdersNeedingAttention,
  markStaffOrdersHandled,
  queueStaffOrder,
  retryStaffOrdersNeedingAttention,
} from "../utils/offlineOrders";
import {
  MENU_CHANGED_EVENT,
  readMenuCache,
  reconcileMenuFromServer,
} from "../utils/offlineMenu";
import { getRestaurantId } from "../utils/storageScope";
import { useConnectivity } from "../context/ConnectivityContext";
import { useSync } from "../context/SyncContext";
import { SYNC_STATE_EVENT } from "../utils/syncQueues";
import SubcategoryChooser from "../components/menu/SubcategoryChooser";

const tableLabel = (table) => table?.type === "room"
  ? `Room ${table.tableNumber || table.locationNumber}`
  : `Table ${table.tableNumber || table.locationNumber}`;

export default function StaffOrder({ hotel, onOrderCreated }) {
  const restaurantId = getRestaurantId(hotel);
  const { isOnline } = useConnectivity();
  const { syncNow } = useSync();
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState("dinein");
  const [tableSearch, setTableSearch] = useState("");
  const [dishSearch, setDishSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [activeSubCategory, setActiveSubCategory] = useState("All");
  const [showGuest, setShowGuest] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [cart, setCart] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingStaffOrders().length);
  const [attentionCount, setAttentionCount] = useState(getStaffOrdersNeedingAttention().length);
  const placingInFlight = useRef(false);

  const refreshQueueCounts = useCallback(() => {
    setPendingSyncCount(getPendingStaffOrders().length);
    setAttentionCount(getStaffOrdersNeedingAttention().length);
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    const fetchData = async () => {
      const tableKey = `staff_tables_${restaurantId}`;
      setMenu(readMenuCache(restaurantId));
      const [menuResult, tableResult] = await Promise.allSettled([
          api.get(`/menu/${restaurantId}`),
          api.get("/table"),
      ]);

      if (menuResult.status === "fulfilled") {
        try {
          setMenu(reconcileMenuFromServer(restaurantId, menuResult.value.data));
        } catch (menuError) {
          console.warn("Staff menu response was invalid", menuError);
          setMenu(readMenuCache(restaurantId));
        }
      } else {
        console.warn("Staff menu fetch failed", menuResult.reason);
        setMenu(readMenuCache(restaurantId));
      }

      if (tableResult.status === "fulfilled") {
        const nextTables = tableResult.value.data?.tables || tableResult.value.data || [];
        if (Array.isArray(nextTables)) {
          setTables(nextTables);
          localStorage.setItem(tableKey, JSON.stringify(nextTables));
        }
      } else {
        console.warn("Staff table fetch failed", tableResult.reason);
        try {
          const cachedTables = JSON.parse(localStorage.getItem(tableKey) || "[]");
          setTables(Array.isArray(cachedTables) ? cachedTables : []);
        } catch (cacheError) {
          console.warn("Staff table cache failed", cacheError);
        }
      }
    };
    fetchData();
  }, [restaurantId]);

  useEffect(() => {
    const handleMenuChanged = (event) => {
      if (!event?.detail?.restaurantId || event.detail.restaurantId === restaurantId) {
        setMenu(readMenuCache(restaurantId));
      }
    };
    const handleSync = (event) => {
      if (event.detail?.kind !== "staff-orders") return;
      event.detail.syncedOrders?.forEach((order) => onOrderCreated?.(order));
      refreshQueueCounts();
    };
    window.addEventListener(MENU_CHANGED_EVENT, handleMenuChanged);
    window.addEventListener(SYNC_STATE_EVENT, handleSync);
    refreshQueueCounts();
    return () => {
      window.removeEventListener(MENU_CHANGED_EVENT, handleMenuChanged);
      window.removeEventListener(SYNC_STATE_EVENT, handleSync);
    };
  }, [onOrderCreated, refreshQueueCounts, restaurantId]);

  // Reset subcategory on main category change
  useEffect(() => {
    setActiveSubCategory("All");
  }, [category]);

  const categories = useMemo(
    () => buildCategoryList(menu.filter((dish) => dish.isAvailable !== false)),
    [menu]
  );

  const visibleTables = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    return tables.filter((table) => !term || tableLabel(table).toLowerCase().includes(term));
  }, [tableSearch, tables]);

  // Unique subcategories for the selected category
  const subCategories = useMemo(() => {
    const categoryFiltered = menu.filter((dish) => dish.isAvailable !== false).filter((dish) => {
      return category === "All" || categoryKey(dish.category) === categoryKey(category);
    });
    
    const set = new Set();
    categoryFiltered.forEach((dish) => {
      const sub = dish.subCategory || dish.subcategory || "";
      if (sub && sub.trim()) {
        set.add(sub.trim());
      }
    });
    return ["All", ...Array.from(set)];
  }, [category, menu]);

  const visibleMenu = useMemo(() => {
    const term = dishSearch.trim().toLowerCase();
    return sortDishesForDisplay(menu.filter((dish) => dish.isAvailable !== false).filter((dish) => {
      return (category === "All" || categoryKey(dish.category) === categoryKey(category)) &&
        (!term || String(dish.name || "").toLowerCase().includes(term));
    }));
  }, [category, dishSearch, menu]);

  // Grouped menu items by subcategory
  const groupedMenu = useMemo(() => {
    const groups = {};
    visibleMenu.forEach((dish) => {
      const sub = (dish.subCategory || dish.subcategory || "").trim();
      const groupName = sub || "";
      
      if (activeSubCategory !== "All" && groupName !== activeSubCategory) {
        return;
      }
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(dish);
    });
    return groups;
  }, [visibleMenu, activeSubCategory]);

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
    const clientOrderId = globalThis.crypto?.randomUUID?.() ||
      `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      clientOrderId,
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
      pendingSync: !isOnline,
      clientOrderId,
    };

    setError("");
    placingInFlight.current = true;
    setPlacing(true);
    try {
      if (!isOnline) {
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
                syncNow();
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

          <div className="staff-menu-filters">
            <div className="staff-menu-filter-group">
              <span className="staff-menu-filter-label">Category</span>
              <div className="staff-category-bar" role="group" aria-label="Dish categories">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? "is-active" : ""}
                  aria-pressed={category === item}
                  onClick={() => {
                    setActiveSubCategory("All");
                    setCategory(item);
                  }}
                >
                  {item}
                </button>
              ))}
              </div>
            </div>

            <SubcategoryChooser
              key={category}
              options={subCategories}
              value={activeSubCategory}
              onChange={setActiveSubCategory}
            />
          </div>

          <div className="staff-dish-list">
            {Object.entries(groupedMenu).map(([subCatName, subCatDishes]) => {
              if (!subCatDishes.length) return null;
              return (
                <div key={subCatName || "other"}>
                  {subCatName && <div className="staff-subcategory-header">{subCatName}</div>}
                  {subCatDishes.map((dish) => {
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
    </section>
  );
}
