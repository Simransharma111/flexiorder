import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiArrowLeft, FiMinus, FiPlus, FiSearch, FiShoppingBag, FiX } from "react-icons/fi";
import api from "../api/axios";
import { getDishPricing } from "../utils/pricing";
import { groupMenuSections, sortDishesForDisplay } from "../utils/menuOrdering";
import { buildCategoryList, categoryKey, dishCategoryName, resolveDishCategoryNames } from "../utils/menuCategories";
import {
  getStaffOrdersEligibleForHandled,
  getStaffOrdersNeedingAttention,
  markStaffOrdersHandled,
  queueStaffOrder,
  retryStaffOrdersNeedingAttention,
} from "../utils/offlineOrders";
import {
  MENU_CHANGED_EVENT,
  readMenuCache,
  readMenuCategoryCache,
  writeMenuCategoryCache,
  reconcileMenuFromServer,
} from "../utils/offlineMenu";
import { getRestaurantId } from "../utils/storageScope";
import { useConnectivity } from "../context/ConnectivityContext";
import { useSync } from "../context/SyncContext";
import { SYNC_STATE_EVENT } from "../utils/syncQueues";
import SubcategoryChooser from "../components/menu/SubcategoryChooser";
import useDialogFocus from "../hooks/useDialogFocus";
import ComboSelector from "../components/guestmenu/ComboSelector";

const tableLabel = (table) => table?.type === "room"
  ? `Room ${table.tableNumber || table.locationNumber}`
  : `Table ${table.tableNumber || table.locationNumber}`;

const comboSignature = (selections = []) => selections
  .map((selection) => ({
    groupName: String(selection.groupName || "").trim(),
    items: [...(selection.items || [])].map((item) => String(item).trim()).sort(),
  }))
  .sort((left, right) => left.groupName.localeCompare(right.groupName));

const cartLineKey = (menuId, selections = []) => (
  selections.length ? `${menuId}::${JSON.stringify(comboSignature(selections))}` : String(menuId)
);

export default function StaffOrder({ hotel, onOrderCreated, active = true, visible = true, onRevealDraft }) {
  const restaurantId = getRestaurantId(hotel) || getRestaurantId();
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
  const [comboDish, setComboDish] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [cart, setCart] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tableError, setTableError] = useState("");
  const [attentionCount, setAttentionCount] = useState(getStaffOrdersNeedingAttention().length);
  const placingInFlight = useRef(false);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [menuRefresh, setMenuRefresh] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const discardRef = useRef(null);
  const reviewRef = useRef(null);
  const locationHeadingRef = useRef(null);
  const focusLocationAfterDiscard = useRef(false);
  const dishSearchRef = useRef(null);
  const closeDiscard = useCallback(() => setDiscardOpen(false), []);
  useDialogFocus(discardOpen, discardRef, closeDiscard);
  useEffect(() => {
    if (!discardOpen) {
      if (focusLocationAfterDiscard.current) {
        locationHeadingRef.current?.focus();
        focusLocationAfterDiscard.current = false;
      }
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [discardOpen]);

  const refreshQueueCounts = useCallback(() => {
    setAttentionCount(getStaffOrdersNeedingAttention().length);
  }, []);

  const fetchTables = useCallback(async () => {
    if (!restaurantId) { setTablesLoading(false); return; }
    setTablesLoading(true);
    const tableKey = `staff_tables_${restaurantId}`;
    setTableError("");
    const applyTables = (payload) => {
      const nextTables = payload?.tables || payload || [];
      if (!Array.isArray(nextTables)) return false;
      setTables(nextTables);
      localStorage.setItem(tableKey, JSON.stringify(nextTables));
      return true;
    };
    try {
      // Primary: authenticated owner/staff table list (newer backend)
      const response = await api.get("/table");
      if (!applyTables(response.data)) throw new Error("Unexpected tables response");
    } catch (primaryError) {
      console.warn("Staff table fetch failed, trying public fallback", primaryError);
      try {
        // Fallback: older deployed backends deny /table to staff; the public
        // guest-facing table list for this hotel is safe to reuse.
        const fallback = await api.get(`/public/tables/${restaurantId}`);
        if (applyTables(fallback.data)) return;
        throw new Error("Unexpected tables response", { cause: primaryError });
      } catch (fallbackError) {
        console.warn("Staff table fallback failed", fallbackError);
        try {
          const cachedTables = JSON.parse(localStorage.getItem(tableKey) || "[]");
          setTables(Array.isArray(cachedTables) ? cachedTables : []);
        } catch (cacheError) {
          console.warn("Staff table cache failed", cacheError);
        }
        setTableError("Tables could not be loaded. Check the connection and try again.");
      }
    } finally { setTablesLoading(false); }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let disposed = false;
    let revision = 0;
    const withCategories = (dishes) => resolveDishCategoryNames(dishes, readMenuCategoryCache(restaurantId));
    const fetchData = async () => {
      const requestRevision = ++revision;
      setMenuLoading(true);
      setMenuError("");
      setMenu(withCategories(readMenuCache(restaurantId)));
      // Catalog reads enrich the local menu independently: a slow category
      // request must not hold up ordering, or discard queued local edits.
      const catalogRequest = api.get(`/menu/categories/${restaurantId}`).then(({ data }) => {
        if (disposed || requestRevision !== revision) return;
        const categories = Array.isArray(data) ? data : data?.categories;
        if (!Array.isArray(categories)) return;
        writeMenuCategoryCache(restaurantId, categories);
        setMenu(withCategories(readMenuCache(restaurantId)));
      }).catch(() => { /* Retain the last saved category positions offline. */ });
      const menuResult = await Promise.allSettled([api.get(`/menu/${restaurantId}`)]);
      if (disposed || requestRevision !== revision) return;
      if (menuResult[0].status === "fulfilled") {
        try {
          setMenu(withCategories(reconcileMenuFromServer(restaurantId, menuResult[0].value.data)));
        } catch (menuError) {
          setMenuError("Could not refresh dishes. Showing the saved menu if available.");
          console.warn("Staff menu response was invalid", menuError);
          setMenu(withCategories(readMenuCache(restaurantId)));
        }
      } else {
        setMenuError("Could not refresh dishes. Showing the saved menu if available.");
        console.warn("Staff menu fetch failed", menuResult[0].reason);
        setMenu(withCategories(readMenuCache(restaurantId)));
      }
      setMenuLoading(false);
      await catalogRequest;
    };
    fetchData();
    fetchTables();
    const unsubscribe = subscribeToRefresh(() => Promise.all([fetchData(), fetchTables()]), { intervalMs: 15000 });
    return () => { disposed = true; unsubscribe(); };
  }, [restaurantId, fetchTables, menuRefresh]);

  useEffect(() => {
    const handleMenuChanged = (event) => {
      if (!event?.detail?.restaurantId || event.detail.restaurantId === restaurantId) {
        setMenu(resolveDishCategoryNames(readMenuCache(restaurantId), readMenuCategoryCache(restaurantId)));
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
      return category === "All" || categoryKey(dishCategoryName(dish)) === categoryKey(category);
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
      return (category === "All" || categoryKey(dishCategoryName(dish)) === categoryKey(category)) &&
        (!term || String(dish.name || "").toLowerCase().includes(term));
    }));
  }, [category, dishSearch, menu]);

  const groupedMenu = useMemo(() => groupMenuSections(
    visibleMenu.filter((dish) => activeSubCategory === "All" || String(dish.subCategory || dish.subcategory || "").trim() === activeSubCategory),
    categories
  ), [visibleMenu, activeSubCategory, categories]);

  const quantityFor = (dishId) => cart
    .filter((item) => item.menuId === dishId)
    .reduce((total, item) => total + Number(item.quantity || 0), 0);

  const changeQuantity = (dish, delta, comboSelections = []) => {
    const pricing = getDishPricing(dish);
    const key = cartLineKey(dish._id, comboSelections);
    setCart((current) => {
      const existing = current.find((item) => (item.cartKey || item.menuId) === key);
      if (!existing && delta > 0) return [...current, {
        menuId: dish._id,
        cartKey: key,
        name: dish.name,
        price: pricing.finalPrice,
        quantity: 1,
        ...(dish.menuType === "combo" ? {
          itemType: "combo",
          comboSelections: comboSignature(comboSelections),
          comboIncludedItems: dish.comboConfig?.includedItems || [],
        } : {}),
      }];
      if (!existing) return current;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) return current.filter((item) => (item.cartKey || item.menuId) !== key);
      return current.map((item) => (item.cartKey || item.menuId) === key ? { ...item, quantity } : item);
    });
  };

  const addDish = (dish) => {
    if (dish.menuType === "combo") {
      setComboDish(dish);
      return;
    }
    changeQuantity(dish, 1);
  };

  const confirmCombo = (selections) => {
    if (!comboDish) return;
    changeQuantity(comboDish, 1, selections);
    setComboDish(null);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const resetOrder = useCallback(() => {
    setCart([]);
    setGuestName("");
    setGuestContact("");
    setShowGuest(false);
    setDishSearch("");
    setCategory("All");
    setSelectedTable(null);
    setOrderType("dinein");
    setComboDish(null);
    setDiscardOpen(false);
  }, []);

  const requestBack = useCallback(() => {
    if (placingInFlight.current) return;
    if (cart.length || guestName || guestContact) setDiscardOpen(true);
    else resetOrder();
  }, [cart.length, guestName, guestContact, resetOrder]);

  useEffect(() => {
    if (!active) return undefined;
    const back = event => {
      if (!visible && !cart.length && !guestName && !guestContact) return;
      if (discardOpen || comboDish || selectedTable || orderType === "takeaway") {
        if (!visible) onRevealDraft?.();
        event.preventDefault();
        if (discardOpen) closeDiscard();
        else if (comboDish) setComboDish(null);
        else requestBack();
      }
    };
    window.addEventListener("flexiorder:owner-menu-back", back);
    return () => window.removeEventListener("flexiorder:owner-menu-back", back);
  }, [active, discardOpen, comboDish, selectedTable, orderType, requestBack, closeDiscard, visible, onRevealDraft, cart.length, guestName, guestContact]);

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
      items: cart.map((item) => ({
        menuId: item.menuId,
        quantity: item.quantity,
        ...(item.itemType === "combo" ? {
          itemType: "combo",
          comboSelections: item.comboSelections,
        } : {}),
      })),
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
      {discardOpen && <div className="ops-sheet-backdrop" onClick={closeDiscard}>
        <section ref={discardRef} role="dialog" aria-modal="true" aria-labelledby="discard-order-title" className="ops-tools-sheet" tabIndex={-1} onClick={event => event.stopPropagation()}>
          <h2 id="discard-order-title">Discard this order?</h2>
          <p>Your selected dishes and guest details will be removed.</p>
          <button type="button" onClick={closeDiscard}>Keep editing</button>
          <button type="button" disabled={placing} onClick={() => { focusLocationAfterDiscard.current = true; resetOrder(); }}>Discard order</button>
        </section>
      </div>}

      {comboDish && (
        <ComboSelector
          dish={comboDish}
          onClose={() => setComboDish(null)}
          onConfirm={confirmCombo}
        />
      )}

      {attentionCount > 0 && (
        <div className="ops-attention-panel" role="status">
          <span>{`${attentionCount} need attention`}</span>
          {getStaffOrdersEligibleForHandled().length > 0 && <button type="button" onClick={() => {
            markStaffOrdersHandled();
            refreshQueueCounts();
          }}>Already handled</button>}
          <button type="button" disabled={!isOnline} title={!isOnline ? "Reconnect to retry" : undefined} onClick={() => {
            retryStaffOrdersNeedingAttention();
            refreshQueueCounts();
            syncNow();
          }}>Retry</button>
        </div>
      )}
      {message && <div className="ops-inline-success" role="status">{message}<button type="button" aria-label="Dismiss message" onClick={() => setMessage("")}><FiX /></button></div>}
      {error && <div className="ops-inline-error" role="alert">{error}<button type="button" aria-label="Dismiss error" onClick={() => setError("")}><FiX /></button></div>}

      {!selectedTable && orderType !== "takeaway" ? (
        <div className="staff-location-step">
          <div className="staff-step-heading"><span>Step 1 of 2</span><h2 ref={locationHeadingRef} tabIndex={-1}>Choose a table or room</h2><p>Select where you’re taking this order.</p></div>
          {tables.length > 0 && (
            <label className="ops-search"><FiSearch /><input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} aria-label="Search table or room" placeholder="Search table or room" /></label>
          )}
          <div className="staff-location-grid">
            {visibleTables.map((table) => (
              <button key={table._id} type="button" className="staff-location-tile" onClick={() => chooseLocation(table)}>
                <strong>{tableLabel(table)}</strong>
                {table.activeOrderCount > 0 && <span>{table.activeOrderCount} active</span>}
              </button>
            ))}
          </div>
          {tablesLoading && !tables.length && <p role="status">Loading tables and rooms…</p>}
          {!tablesLoading && !tableError && !tables.length && <p className="ops-empty-row">No tables or rooms are set up yet. Ask the restaurant owner to add them.</p>}
          {tables.length > 0 && !visibleTables.length && <div className="ops-empty-row"><p>No matching tables or rooms.</p><button type="button" onClick={() => setTableSearch("")}>Clear location search</button></div>}
          {tableError && (
            <div className="ops-inline-error staff-location-error" role="alert">
              <span>{tables.length ? "Showing saved tables and rooms. " : ""}{tableError}</span>
              <button type="button" onClick={fetchTables}>Retry</button>
            </div>
          )}
          {hotel?.takeawayEnabled !== false && (
            <button type="button" className="staff-takeaway-link" onClick={() => setOrderType("takeaway")}>Takeaway order</button>
          )}
        </div>
      ) : (
        <div className="staff-menu-step">
          <header className="staff-menu-step__head">
            <button type="button" className="ops-icon-button" aria-label="Back to tables" disabled={placing} onClick={requestBack}><FiArrowLeft /></button>
            <div><strong>{orderType === "takeaway" ? "Takeaway" : tableLabel(selectedTable)}</strong><span>{cartCount ? `${cartCount} selected` : "Tap a dish to add"}</span></div>
            <button type="button" className="staff-guest-toggle" aria-expanded={showGuest} onClick={() => setShowGuest((value) => !value)}>Guest details</button>
          </header>

          <div className="staff-step-heading"><span>Step 2 of 2</span><h2>Add dishes</h2></div>
          {menuError && <div className="ops-inline-error" role="alert"><span>{menuError}</span><button type="button" onClick={() => setMenuRefresh(value => value + 1)}>Retry menu</button></div>}
          {menuLoading && !menu.length && <p role="status">Loading dishes…</p>}
          {showGuest && (
            <div className="staff-guest-fields">
              <input type="tel" value={guestContact} onChange={(event) => setGuestContact(event.target.value)} aria-label="Guest contact (optional)" placeholder="Contact (optional)" />
              <input value={guestName} onChange={(event) => setGuestName(event.target.value)} aria-label="Guest name (optional)" placeholder="Name (optional)" />
            </div>
          )}

          <label className="ops-search staff-dish-search"><FiSearch /><input ref={dishSearchRef} aria-label="Search dishes" value={dishSearch} onChange={(event) => setDishSearch(event.target.value)} placeholder="Search dishes" /></label>

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
            {groupedMenu.map(({ key, category: categoryName, sub: subCatName, dishes: subCatDishes }) => {
              if (!subCatDishes.length) return null;
              return (
                <div key={key} className="staff-category-section">
                  {categoryName && <h2 className="staff-subcategory-header">{categoryName}</h2>}
                  {subCatName && <div className="staff-subcategory-header">{subCatName}</div>}
                  {subCatDishes.map((dish) => {
                    const quantity = quantityFor(dish._id);
                    const { basePrice, finalPrice, hasDiscount } = getDishPricing(dish);
                    const isCombo = dish.menuType === "combo";
                    return (
                      <div className="staff-dish-row" key={dish._id}>
                        <button type="button" className="staff-dish-row__main" onClick={() => addDish(dish)} aria-label={`${isCombo ? "Choose options for" : "Add"} ${dish.name}`}>
                          <span className={`food-mark ${dish.foodType === "nonveg" ? "is-nonveg" : "is-veg"}`} aria-label={dish.foodType === "nonveg" ? "Non-vegetarian" : "Vegetarian"} />
                          <span><strong>{dish.name}</strong>{dish.containsEgg && dish.foodType !== "nonveg" && <small>Contains egg</small>}</span>
                          <span className="staff-dish-price">{hasDiscount && <del>₹{basePrice.toFixed(0)}</del>}<b>₹{finalPrice.toFixed(0)}</b></span>
                          {!quantity && <span className="staff-add-label">{isCombo ? "Choose Options" : "Add"}</span>}
                        </button>
                        {quantity > 0 && !isCombo && (
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
            {!groupedMenu.some(section => section.dishes.length) && !menuLoading && (!menuError || menu.length > 0) && <div className="ops-empty-row"><p>{menu.some(dish => dish.isAvailable !== false) ? "No dishes match these filters." : "No dishes are available right now."}</p>{(dishSearch || category !== "All" || activeSubCategory !== "All") && <button type="button" onClick={() => { setDishSearch(""); setCategory("All"); setActiveSubCategory("All"); }}>Clear dish filters</button>}</div>}
          </div>

          {cartCount > 0 && (
            <section ref={reviewRef} tabIndex={-1} aria-label="Selected order items" className="rounded-xl border bg-white p-4 my-4">
              <h3 className="font-bold mb-3">Review order</h3><button type="button" className="staff-review-edit" onClick={() => { dishSearchRef.current?.scrollIntoView({ block: "center" }); dishSearchRef.current?.focus(); }}>Add more dishes</button>
              {cart.map(item => <div key={item.cartKey || item.menuId} className="flex justify-between gap-3 mb-3">
                <span>{item.quantity} × {item.name}<OrderItemOptions item={item} /></span>
                <button type="button" className="ops-icon-button" aria-label={`Remove one ${item.name} from order`}
                  onClick={() => setCart(current => current.map(line => line.cartKey === item.cartKey ? { ...line, quantity: line.quantity - 1 } : line).filter(line => line.quantity > 0))}><FiMinus /></button>
              </div>)}
            </section>
          )}
          {cartCount > 0 && (
            <div className="staff-cart-bar">
              <button type="button" className="staff-cart-review" aria-label={`Review order, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} onClick={() => { reviewRef.current?.scrollIntoView({ block: "center" }); reviewRef.current?.focus({ preventScroll: true }); }}><FiShoppingBag /><span><b>{cartCount} {cartCount === 1 ? "item" : "items"} · ₹{total.toFixed(0)}</b><small>Review order</small></span></button>
              <button type="button" onClick={placeOrder} disabled={placing}>{placing ? "Sending…" : "Place Order"}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
import { subscribeToRefresh } from '../utils/refreshOnResume';
import OrderItemOptions from '../components/orders/OrderItemOptions';
