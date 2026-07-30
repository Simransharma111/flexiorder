import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";

import {
  FiSearch,
  FiShoppingBag,
  FiPlus,
  FiMinus,
  FiChevronRight,
  FiClock,
  FiStar,
  FiX,
  FiCalendar,
  FiArrowLeft,
} from "react-icons/fi";

export default function GuestMenuPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();

  // =========================================================
  // HOTEL / TABLE / MENU
  // =========================================================

  const [hotel, setHotel] = useState(null);
  const [table, setTable] = useState(null);
  const [dishes, setDishes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // MENU FILTERS
  // =========================================================

  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [activeCategory, setActiveCategory] = useState("All");

  // =========================================================
  // CART
  // =========================================================

  const [cart, setCart] = useState([]);
const [activeOrder, setActiveOrder] = useState(null);
const [orderLoading, setOrderLoading] = useState(false);
  // =========================================================
  // DISH MODAL
  // =========================================================

  const [selectedDish, setSelectedDish] = useState(null);

  // =========================================================
  // SCHEDULE ORDER
  // =========================================================

  const [showScheduleInfo, setShowScheduleInfo] = useState(false);

  // =========================================================
  // FETCH MENU USING QR ID
  // =========================================================

  useEffect(() => {
    if (!qrId) {
      setError("QR information is missing.");
      setLoading(false);
      return;
    }

    fetchMenu();
  }, [qrId]);
  const fetchActiveOrder = async () => {
  try {
    const savedOrderId =
      localStorage.getItem(`activeOrder_${qrId}`);

    if (!savedOrderId) {
      setActiveOrder(null);
      return;
    }

    setOrderLoading(true);

    const res = await api.get(
      `/orders/${savedOrderId}`
    );

    const order = res.data;

    // Order is finished
    if (
      order.status === "delivered" ||
      order.status === "cancelled"
    ) {
      localStorage.removeItem(
        `activeOrder_${qrId}`
      );

      setActiveOrder(null);
      return;
    }

    setActiveOrder(order);

  } catch (err) {
    console.error(
      "Failed to fetch active order:",
      err
    );
  } finally {
    setOrderLoading(false);
  }
};

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("Loading menu for QR:", qrId);

      const res = await api.get(`/qr/menu/${qrId}`);

      console.log("QR MENU RESPONSE:", res.data);

      setHotel(res.data?.hotel || null);
      setTable(res.data?.table || null);
      setDishes(res.data?.dishes || []);
    } catch (err) {
      console.error("Failed to load menu:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load menu. Please scan the QR code again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // CART STORAGE
  //
  // IMPORTANT:
  // Cart belongs to QR, NOT tableId.
  // =========================================================

  useEffect(() => {
    if (!qrId) return;

    try {
      const storageKey = `cart_${qrId}`;

      const savedCart = localStorage.getItem(storageKey);

      if (savedCart) {
        setCart(JSON.parse(savedCart));
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error("Failed to load cart:", err);
      setCart([]);
    }
  }, [qrId]);

  // =========================================================
  // SAVE CART
  // =========================================================

  useEffect(() => {
    if (!qrId) return;

    try {
      localStorage.setItem(
        `cart_${qrId}`,
        JSON.stringify(cart)
      );
    } catch (err) {
      console.error("Failed to save cart:", err);
    }
  }, [cart, qrId]);

  // =========================================================
  // CATEGORIES
  // =========================================================

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        dishes
          .map((dish) => {
            if (typeof dish.category === "object") {
              return dish.category?.name;
            }

            return dish.category;
          })
          .filter(Boolean)
      ),
    ];

    return ["All", ...uniqueCategories];
  }, [dishes]);

  // =========================================================
  // FILTER DISHES
  // =========================================================

  const filteredDishes = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return dishes.filter((dish) => {
      let dishCategory = dish.category;

      if (typeof dish.category === "object") {
        dishCategory = dish.category?.name;
      }

      const categoryMatch =
        activeCategory === "All" ||
        dishCategory === activeCategory;

      const foodMatch =
        foodFilter === "all" ||
        dish.foodType === foodFilter;

      const searchMatch =
        !searchText ||
        dish.name?.toLowerCase().includes(searchText) ||
        dish.description
          ?.toLowerCase()
          .includes(searchText) ||
        dish.tags?.some((tag) =>
          String(tag)
            .toLowerCase()
            .includes(searchText)
        );

      return (
        categoryMatch &&
        foodMatch &&
        searchMatch
      );
    });
  }, [
    dishes,
    activeCategory,
    foodFilter,
    search,
  ]);

  // =========================================================
  // FEATURED SECTIONS
  // =========================================================

  const availableDish = (dish) =>
    dish.isAvailable !== false;

  const todaySpecial = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.todaySpecial
  );

  const recommended = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.isRecommended
  );

  const popular = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.isPopular
  );

  const bestsellers = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.isBestseller
  );

  const newArrivals = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.isNewArrival
  );

  const featured = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.featured
  );

  // =========================================================
  // CART HELPERS
  // =========================================================

  const getCartQuantity = (dishId) => {
    const item = cart.find(
      (item) => item._id === dishId
    );

    return item?.quantity || 0;
  };

  const addToCart = (dish) => {
    if (dish.isAvailable === false) {
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item._id === dish._id
      );

      if (existing) {
        return prev.map((item) =>
          item._id === dish._id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          _id: dish._id,
          name: dish.name,
          description: dish.description,
          price: Number(dish.price || 0),
          image: dish.image,
          foodType: dish.foodType,
          quantity: 1,
        },
      ];
    });
  };

  const decreaseQuantity = (dishId) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => item._id === dishId
      );

      if (!existing) {
        return prev;
      }

      if (existing.quantity <= 1) {
        return prev.filter(
          (item) => item._id !== dishId
        );
      }

      return prev.map((item) =>
        item._id === dishId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item
      );
    });
  };

  const increaseQuantity = (dishId) => {
    const dish = dishes.find(
      (item) => item._id === dishId
    );

    if (dish) {
      addToCart(dish);
    }
  };

  // =========================================================
  // CART TOTAL
  // =========================================================

  const cartCount = cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  // =========================================================
  // OPEN CART
  //
  // IMPORTANT:
  // Send QR ID, NOT tableId.
  // =========================================================

  const openCart = () => {
    if (!qrId) return;

    navigate(`/cart/${qrId}`);
  };

  // =========================================================
  // TRACK ORDER
  // =========================================================

  const openTrackOrder = () => {
    const lastOrderId = localStorage.getItem(
      `lastOrder_${qrId}`
    );

    if (lastOrderId) {
      navigate(`/track-order/${lastOrderId}`);
    } else {
      alert(
        "You do not have an active order yet."
      );
    }
  };

  // =========================================================
  // SCHEDULE
  // =========================================================

  const openSchedule = () => {
    if (cartCount === 0) {
      alert("Please add items to cart first.");
      return;
    }

    setShowScheduleInfo(true);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto" />

          <p className="text-gray-500 mt-4 text-sm">
            Loading menu...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-900">
            Menu unavailable
          </h2>

          <p className="text-gray-500 text-sm mt-2">
            {error}
          </p>

          <button
            onClick={fetchMenu}
            className="mt-5 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">

          <div className="flex items-center justify-between h-16">

            {/* HOTEL INFO */}

            <div className="flex items-center gap-3 min-w-0">

              {hotel?.logo ? (
                <img
                  src={hotel.logo}
                  alt={hotel?.name || "Hotel"}
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                  {hotel?.name
                    ?.charAt(0)
                    ?.toUpperCase() || "H"}
                </div>
              )}

              <div className="min-w-0">

                <h1 className="font-bold text-gray-900 leading-tight truncate">
                  {hotel?.name || "Welcome"}
                </h1>

                {table && (
                  <p className="text-xs text-gray-500">
                    {table.type === "room"
                      ? "Room"
                      : "Table"}{" "}
                    {table.tableNumber || ""}
                  </p>
                )}

              </div>
            </div>

            {/* CART */}

            <button
              onClick={openCart}
              className="relative w-11 h-11 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0"
            >
              <FiShoppingBag size={19} />

              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

          </div>

        </div>
      </header>
      {/* =================================================
    ACTIVE ORDER TRACKING
================================================= */}

{activeOrder && (
  <section className="max-w-6xl mx-auto px-4 pt-4">

    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* HEADER */}

      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">

        <div>
          <h2 className="font-bold text-gray-900">
            Your Order
          </h2>

          <p className="text-xs text-gray-500">
            Order #{activeOrder._id?.slice(-6)}
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            activeOrder.status === "pending"
              ? "bg-yellow-100 text-yellow-700"
              : activeOrder.status === "accepted"
              ? "bg-blue-100 text-blue-700"
              : activeOrder.status === "preparing"
              ? "bg-orange-100 text-orange-700"
              : activeOrder.status === "ready"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          {capitalize(activeOrder.status)}
        </span>

      </div>

      {/* STATUS */}

      <div className="p-4">

        <div className="flex items-center justify-between">

          {/* PENDING */}

          <OrderStatusStep
            label="Placed"
            active={[
              "pending",
              "accepted",
              "preparing",
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
            completed={[
              "accepted",
              "preparing",
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
          />

          <div className="flex-1 h-1 bg-gray-200 mx-1" />

          {/* ACCEPTED */}

          <OrderStatusStep
            label="Accepted"
            active={[
              "accepted",
              "preparing",
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
            completed={[
              "preparing",
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
          />

          <div className="flex-1 h-1 bg-gray-200 mx-1" />

          {/* PREPARING */}

          <OrderStatusStep
            label="Preparing"
            active={[
              "preparing",
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
            completed={[
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
          />

          <div className="flex-1 h-1 bg-gray-200 mx-1" />

          {/* READY */}

          <OrderStatusStep
            label="Ready"
            active={[
              "ready",
              "delivered",
            ].includes(activeOrder.status)}
            completed={[
              "delivered",
            ].includes(activeOrder.status)}
          />

        </div>

        {/* ESTIMATED TIME */}

        {activeOrder.estimatedTime && (
          <div className="mt-4 bg-gray-50 rounded-xl p-3 flex items-center justify-between">

            <div className="flex items-center gap-2">

              <FiClock className="text-orange-500" />

              <span className="text-sm text-gray-600">
                Estimated preparation
              </span>

            </div>

            <strong className="text-sm">
              {activeOrder.estimatedTime} min
            </strong>

          </div>
        )}

        {/* TOTAL */}

        <div className="flex justify-between mt-3 text-sm">

          <span className="text-gray-500">
            Order Total
          </span>

          <strong>
            ₹{Number(
              activeOrder.totalAmount || 0
            ).toFixed(2)}
          </strong>

        </div>

      </div>

    </div>

  </section>
)}

      {/* =====================================================
          HOTEL INTRO
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 pt-5">

        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">

          {hotel?.coverImage && (
            <img
              src={hotel.coverImage}
              alt=""
              className="w-full h-40 md:h-56 object-cover"
            />
          )}

          <div className="p-5">

            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {hotel?.tagline ||
                "Order your favourites"}
            </h2>

            {hotel?.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                {hotel.description}
              </p>
            )}

            {table && (
              <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-2 rounded-lg text-sm font-semibold">
                {table.type === "room"
                  ? "Room"
                  : "Table"}{" "}
                {table.tableNumber}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 mt-5">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

          <button
            onClick={openSchedule}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-left hover:border-orange-300"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FiCalendar />
            </div>

            <div>
              <p className="font-bold text-gray-900 text-sm">
                Schedule Order
              </p>

              <p className="text-xs text-gray-500">
                Order for later
              </p>
            </div>
          </button>

          <button
            onClick={openCart}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-left hover:border-orange-300"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FiShoppingBag />
            </div>

            <div>
              <p className="font-bold text-gray-900 text-sm">
                My Cart
              </p>

              <p className="text-xs text-gray-500">
                {cartCount} items
              </p>
            </div>
          </button>

          <button
            onClick={openTrackOrder}
            className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-left hover:border-orange-300 col-span-2 md:col-span-1"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FiClock />
            </div>

            <div>
              <p className="font-bold text-gray-900 text-sm">
                Track Order
              </p>

              <p className="text-xs text-gray-500">
                Check order status
              </p>
            </div>
          </button>

        </div>

      </section>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 mt-5">

        <div className="relative">

          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={19}
          />

          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full bg-white border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-orange-400"
          />

        </div>
      </section>

      {/* =====================================================
          FOOD FILTER
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 mt-4">

        <div className="flex gap-2 overflow-x-auto">

          <button
            onClick={() =>
              setFoodFilter("all")
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              foodFilter === "all"
                ? "bg-orange-500 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            All
          </button>

          <button
            onClick={() =>
              setFoodFilter("veg")
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              foodFilter === "veg"
                ? "bg-green-600 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            🟢 Veg
          </button>

          <button
            onClick={() =>
              setFoodFilter("nonveg")
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
              foodFilter === "nonveg"
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            🔴 Non-Veg
          </button>

        </div>
      </section>

      {/* =====================================================
          FEATURED SECTIONS
      ===================================================== */}

      {!search && activeCategory === "All" && (
        <>
          {featured.length > 0 && (
            <FeaturedSection
              title="Featured"
              dishes={featured}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}

          {todaySpecial.length > 0 && (
            <FeaturedSection
              title="Today's Special"
              dishes={todaySpecial}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}

          {recommended.length > 0 && (
            <FeaturedSection
              title="Recommended"
              dishes={recommended}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}

          {popular.length > 0 && (
            <FeaturedSection
              title="Most Popular"
              dishes={popular}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}

          {bestsellers.length > 0 && (
            <FeaturedSection
              title="Best Sellers"
              dishes={bestsellers}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}

          {newArrivals.length > 0 && (
            <FeaturedSection
              title="New Arrivals"
              dishes={newArrivals}
              onAdd={addToCart}
              onDecrease={decreaseQuantity}
              onIncrease={increaseQuantity}
              getQuantity={getCartQuantity}
              onSelect={setSelectedDish}
            />
          )}
        </>
      )}

      {/* =====================================================
          CATEGORY NAVIGATION
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 mt-8">

        <h2 className="text-lg font-bold text-gray-900 mb-3">
          Menu
        </h2>

        <div className="flex gap-2 overflow-x-auto pb-2">

          {categories.map((category) => (
            <button
              key={category}
              onClick={() =>
                setActiveCategory(category)
              }
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold ${
                activeCategory === category
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {category}
            </button>
          ))}

        </div>
      </section>

      {/* =====================================================
          ALL DISHES
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-4 mt-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {filteredDishes.length === 0 ? (
            <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="font-semibold text-gray-700">
                No dishes found
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Try another category or search.
              </p>
            </div>
          ) : (
            filteredDishes.map((dish) => (
              <DishCard
                key={dish._id}
                dish={dish}
                quantity={getCartQuantity(
                  dish._id
                )}
                onAdd={addToCart}
                onDecrease={decreaseQuantity}
                onIncrease={increaseQuantity}
                onSelect={setSelectedDish}
              />
            ))
          )}

        </div>
      </section>

      {/* =====================================================
          BOTTOM CART BAR
      ===================================================== */}

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3">

          <div className="max-w-6xl mx-auto space-y-2">

            <button
              onClick={openCart}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-5 py-3 flex items-center justify-between font-bold"
            >
              <div className="flex items-center gap-3">

                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <FiShoppingBag />
                </div>

                <div className="text-left">

                  <p className="text-xs opacity-90">
                    {cartCount}{" "}
                    {cartCount === 1
                      ? "item"
                      : "items"}
                  </p>

                  <p>
                    ₹{cartTotal.toFixed(2)}
                  </p>

                </div>
              </div>

              <div className="flex items-center gap-2">
                View Cart
                <FiChevronRight />
              </div>
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          DISH MODAL
      ===================================================== */}

      {selectedDish && (
        <DishModal
          dish={selectedDish}
          quantity={getCartQuantity(
            selectedDish._id
          )}
          onClose={() =>
            setSelectedDish(null)
          }
          onAdd={addToCart}
          onDecrease={decreaseQuantity}
          onIncrease={increaseQuantity}
        />
      )}

      {/* =====================================================
          SCHEDULE INFORMATION MODAL
      ===================================================== */}

      {showScheduleInfo && (
        <div
          className="fixed inset-0 z-[110] bg-black/50 flex items-end md:items-center justify-center p-4"
          onClick={() =>
            setShowScheduleInfo(false)
          }
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <FiCalendar />
                </div>

                <h2 className="text-lg font-bold">
                  Schedule Order
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowScheduleInfo(false)
                }
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <FiX />
              </button>

            </div>

            <p className="text-sm text-gray-500 mt-4 leading-6">
              Your cart is ready. Continue to the
              cart page to select the date and time
              for your scheduled order.
            </p>

            <button
              onClick={() => {
                setShowScheduleInfo(false);
                openCart();
              }}
              className="w-full mt-5 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold"
            >
              Continue to Cart
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

/* =========================================================
   FEATURED SECTION
========================================================= */

function FeaturedSection({
  title,
  dishes,
  onAdd,
  onDecrease,
  onIncrease,
  getQuantity,
  onSelect,
}) {
  return (
    <section className="max-w-6xl mx-auto px-4 mt-7">

      <div className="flex items-center justify-between mb-3">

        <h2 className="text-lg md:text-xl font-bold text-gray-900">
          {title}
        </h2>

        <span className="text-xs text-gray-400">
          {dishes.length} items
        </span>

      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">

        {dishes.map((dish) => (
          <div
            key={dish._id}
            className="min-w-[245px] max-w-[245px]"
          >
            <DishCard
              dish={dish}
              quantity={getQuantity(
                dish._id
              )}
              onAdd={onAdd}
              onDecrease={onDecrease}
              onIncrease={onIncrease}
              onSelect={onSelect}
              compact
            />
          </div>
        ))}

      </div>
    </section>
  );
}

/* =========================================================
   DISH CARD
========================================================= */

function DishCard({
  dish,
  quantity,
  onAdd,
  onDecrease,
  onIncrease,
  onSelect,
  compact = false,
}) {
  const isAvailable =
    dish.isAvailable !== false;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">

      {/* IMAGE */}

      <div
        className="relative cursor-pointer"
        onClick={() =>
          onSelect(dish)
        }
      >

        {dish.image ? (
          <img
            src={dish.image}
            alt={dish.name}
            className={`w-full object-cover ${
              compact ? "h-40" : "h-52"
            }`}
          />
        ) : (
          <div
            className={`w-full bg-gray-100 flex items-center justify-center text-gray-400 ${
              compact ? "h-40" : "h-52"
            }`}
          >
            No Image
          </div>
        )}

        {/* FOOD TYPE */}

        <div className="absolute top-3 left-3">

          <span className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-xs">
            {dish.foodType === "veg"
              ? "🟢"
              : "🔴"}
          </span>

        </div>

        {/* BADGES */}

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">

          {dish.isBestseller && (
            <Badge>Bestseller</Badge>
          )}

          {dish.todaySpecial && (
            <Badge>Today's Special</Badge>
          )}

          {dish.isNewArrival && (
            <Badge>New</Badge>
          )}

        </div>

        {!isAvailable && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white px-3 py-2 rounded-lg font-bold text-sm">
              Currently Unavailable
            </span>
          </div>
        )}

      </div>

      {/* CONTENT */}

      <div className="p-4">

        <div className="flex items-start justify-between gap-2">

          <div className="min-w-0">

            <h3 className="font-bold text-gray-900 truncate">
              {dish.name}
            </h3>

            {dish.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {dish.description}
              </p>
            )}

          </div>

          {Number(dish.rating || 0) > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-700 shrink-0">
              <FiStar
                className="text-yellow-500 fill-yellow-500"
                size={12}
              />
              {dish.rating}
            </span>
          )}

        </div>

        {/* TAGS */}

        {dish.tags?.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">

            {dish.tags
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[10px] font-medium"
                >
                  {tag}
                </span>
              ))}

          </div>
        )}

        {/* SPICE */}

        {dish.spiceLevel && (
          <p className="text-[11px] text-gray-500 mt-2">
            🌶️ {capitalize(dish.spiceLevel)} spice
          </p>
        )}

        {/* PRICE + CART */}

        <div className="flex items-center justify-between mt-4">

          <div>

            <span className="text-lg font-bold text-gray-900">
              ₹{Number(dish.price || 0).toFixed(2)}
            </span>

            {dish.prepTime && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                <FiClock size={10} />
                {dish.prepTime} min
              </span>
            )}

          </div>

          {!isAvailable ? (
            <span className="text-xs text-gray-400 font-semibold">
              Unavailable
            </span>
          ) : quantity === 0 ? (

            <button
              onClick={() =>
                onAdd(dish)
              }
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              <FiPlus size={15} />
              Add
            </button>

          ) : (

            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1.5">

              <button
                onClick={() =>
                  onDecrease(dish._id)
                }
                className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-orange-600"
              >
                <FiMinus size={14} />
              </button>

              <span className="font-bold text-sm">
                {quantity}
              </span>

              <button
                onClick={() =>
                  onIncrease(dish._id)
                }
                className="w-7 h-7 rounded-md bg-orange-500 text-white flex items-center justify-center"
              >
                <FiPlus size={14} />
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
function OrderStatusStep({
  label,
  active,
  completed,
}) {
  return (
    <div className="flex flex-col items-center min-w-[55px]">

      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
          completed
            ? "bg-green-500 text-white"
            : active
            ? "bg-orange-500 text-white"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        {completed ? "✓" : "•"}
      </div>

      <span
        className={`text-[10px] mt-1 text-center ${
          active
            ? "text-gray-900 font-semibold"
            : "text-gray-400"
        }`}
      >
        {label}
      </span>

    </div>
  );
}
/* =========================================================
   DISH MODAL
========================================================= */

function DishModal({
  dish,
  quantity,
  onClose,
  onAdd,
  onDecrease,
  onIncrease,
}) {
  const isAvailable =
    dish.isAvailable !== false;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-5"
      onClick={onClose}
    >

      <div
        className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* IMAGE */}

        <div className="relative">

          {dish.image ? (
            <img
              src={dish.image}
              alt={dish.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
              No Image
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
          >
            <FiX />
          </button>

        </div>

        {/* DETAILS */}

        <div className="p-5">

          <div className="flex items-start justify-between gap-3">

            <div>

              <div className="flex items-center gap-2">

                <span>
                  {dish.foodType === "veg"
                    ? "🟢"
                    : "🔴"}
                </span>

                <h2 className="text-xl font-bold text-gray-900">
                  {dish.name}
                </h2>

              </div>

              <p className="text-orange-600 text-lg font-bold mt-2">
                ₹{Number(dish.price || 0).toFixed(2)}
              </p>

            </div>

            {Number(dish.rating || 0) > 0 && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-sm font-bold">
                <FiStar
                  size={13}
                  className="fill-green-600"
                />
                {dish.rating}
              </div>
            )}

          </div>

          {dish.description && (
            <p className="text-sm text-gray-500 mt-4 leading-6">
              {dish.description}
            </p>
          )}

          {/* INFO */}

          <div className="flex gap-2 flex-wrap mt-4">

            {dish.prepTime && (
              <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs">
                ⏱ {dish.prepTime} min
              </span>
            )}

            {dish.spiceLevel && (
              <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs">
                🌶️ {capitalize(dish.spiceLevel)}
              </span>
            )}

            {dish.isBestseller && (
              <span className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-semibold">
                Bestseller
              </span>
            )}

          </div>

          {/* TAGS */}

          {dish.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">

              {dish.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs"
                >
                  {tag}
                </span>
              ))}

            </div>
          )}

          {/* CART */}

          <div className="mt-6">

            {!isAvailable ? (

              <div className="bg-gray-100 text-gray-500 text-center py-3.5 rounded-xl font-semibold">
                Currently unavailable
              </div>

            ) : quantity === 0 ? (

              <button
                onClick={() =>
                  onAdd(dish)
                }
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-bold"
              >
                Add to Cart
              </button>

            ) : (

              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl p-2">

                <span className="font-bold text-sm pl-2">
                  Quantity
                </span>

                <div className="flex items-center gap-4">

                  <button
                    onClick={() =>
                      onDecrease(dish._id)
                    }
                    className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-orange-600"
                  >
                    <FiMinus />
                  </button>

                  <span className="font-bold">
                    {quantity}
                  </span>

                  <button
                    onClick={() =>
                      onIncrease(dish._id)
                    }
                    className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center"
                  >
                    <FiPlus />
                  </button>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   BADGE
========================================================= */

function Badge({ children }) {
  return (
    <span className="bg-white/95 backdrop-blur text-gray-800 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm">
      {children}
    </span>
  );
}

/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(value) {
  if (!value) return "";

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}