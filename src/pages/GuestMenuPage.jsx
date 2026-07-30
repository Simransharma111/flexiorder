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
  FiArrowLeft,
} from "react-icons/fi";

export default function GuestMenuPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [hotel, setHotel] = useState(null);
  const [table, setTable] = useState(null);
  const [dishes, setDishes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [activeCategory, setActiveCategory] = useState("All");

  const [selectedDish, setSelectedDish] = useState(null);

  const [cart, setCart] = useState([]);

  // =====================================================
  // FETCH MENU
  // =====================================================

  useEffect(() => {
    if (!tableId) {
      setError("Table information is missing.");
      setLoading(false);
      return;
    }

    fetchMenu();
  }, [tableId]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError("");

     const res = await api.get(`/qr/menu/${qrId}`);
      setTable(res.data?.table || null);
      setDishes(res.data?.dishes || []);

      // If your backend later returns hotel data,
      // this will automatically use it.
      if (res.data?.hotel) {
        setHotel(res.data.hotel);
      }

    } catch (err) {
      console.error(
        "Failed to load menu:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load menu."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD CART
  // =====================================================

  useEffect(() => {
    const storageKey = `cart_${tableId}`;

    try {
      const savedCart =
        JSON.parse(
          localStorage.getItem(storageKey)
        ) || [];

      setCart(savedCart);
    } catch (err) {
      console.error(
        "Failed to load cart:",
        err
      );

      setCart([]);
    }
  }, [tableId]);

  // =====================================================
  // SAVE CART
  // =====================================================

  useEffect(() => {
    if (!tableId) return;

    localStorage.setItem(
      `cart_${tableId}`,
      JSON.stringify(cart)
    );
  }, [cart, tableId]);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        dishes
          .map((dish) => dish.category)
          .filter(Boolean)
      ),
    ];

    return ["All", ...uniqueCategories];
  }, [dishes]);

  // =====================================================
  // FILTERED DISHES
  // =====================================================

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const categoryMatch =
        activeCategory === "All" ||
        dish.category === activeCategory;

      const foodMatch =
        foodFilter === "all" ||
        dish.foodType === foodFilter;

      const searchMatch =
        dish.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        dish.description
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        dish.tags?.some((tag) =>
          tag
            .toLowerCase()
            .includes(search.toLowerCase())
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

  // =====================================================
  // FEATURED DISHES
  // =====================================================

  const todaySpecial = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.todaySpecial
  );

  const recommended = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.isRecommended
  );

  const popular = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.isPopular
  );

  const bestsellers = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.isBestseller
  );

  const newArrivals = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.isNewArrival
  );

  const featured = dishes.filter(
    (dish) =>
      dish.isAvailable &&
      dish.featured
  );

  // =====================================================
  // CART HELPERS
  // =====================================================

  const getCartQuantity = (dishId) => {
    const item = cart.find(
      (item) => item._id === dishId
    );

    return item?.quantity || 0;
  };

  const addToCart = (dish) => {
    if (!dish.isAvailable) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item._id === dish._id
      );

      if (existing) {
        return prev.map((item) =>
          item._id === dish._id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          _id: dish._id,
          name: dish.name,
          price: dish.price,
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
              quantity:
                item.quantity - 1,
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

  // =====================================================
  // CART TOTAL
  // =====================================================

  const cartCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        item.quantity,
    0
  );

  // =====================================================
  // GO TO CART
  // =====================================================

  const openCart = () => {
    navigate(`/cart/${tableId}`);
  };

  // =====================================================
  // LOADING
  // =====================================================

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

  // =====================================================
  // ERROR
  // =====================================================

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

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="bg-white sticky top-0 z-40 border-b border-gray-100">

        <div className="max-w-6xl mx-auto px-4">

          <div className="flex items-center justify-between h-16">

            <div className="flex items-center gap-3">

              {hotel?.logo ? (
                <img
                  src={hotel.logo}
                  alt="Restaurant"
                  className="w-10 h-10 rounded-xl object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                  F
                </div>
              )}

              <div>

                <h1 className="font-bold text-gray-900 leading-tight">
                  {hotel?.name ||
                    "Welcome"}
                </h1>

                {table && (
                  <p className="text-xs text-gray-500">
                    Table{" "}
                    {table.tableNumber ||
                      table.number ||
                      table.name ||
                      ""}
                  </p>
                )}

              </div>

            </div>

            {/* CART */}

            <button
              onClick={openCart}
              className="relative w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center"
            >
              <FiShoppingBag size={19} />

              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}

            </button>

          </div>

        </div>

      </header>

      {/* =================================================
          RESTAURANT INTRO
      ================================================= */}

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

            <h2 className="text-xl md:text-2xl font-bold">
              {hotel?.tagline ||
                "Order your favourites"}
            </h2>

            {hotel?.description && (
              <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                {hotel.description}
              </p>
            )}

          </div>

        </div>

      </section>

      {/* =================================================
          SEARCH
      ================================================= */}

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

      {/* =================================================
          FOOD FILTER
      ================================================= */}

      <section className="max-w-6xl mx-auto px-4 mt-4">

        <div className="flex gap-2">

          <button
            onClick={() =>
              setFoodFilter("all")
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              foodFilter === "all"
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            All
          </button>

          <button
            onClick={() =>
              setFoodFilter("veg")
            }
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
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
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              foodFilter === "nonveg"
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            🔴 Non-Veg
          </button>

        </div>

      </section>

      {/* =================================================
          FEATURED SECTIONS
      ================================================= */}

      {!search && activeCategory === "All" && (
        <>

          {/* FEATURED */}

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

          {/* TODAY SPECIAL */}

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

          {/* RECOMMENDED */}

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

          {/* POPULAR */}

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

          {/* BEST SELLERS */}

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

          {/* NEW ARRIVALS */}

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

      {/* =================================================
          CATEGORY NAVIGATION
      ================================================= */}

      <section className="max-w-6xl mx-auto px-4 mt-8">

        <div className="flex items-center justify-between mb-3">

          <h2 className="text-lg font-bold">
            Menu
          </h2>

        </div>

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

      {/* =================================================
          ALL DISHES
      ================================================= */}

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
                onDecrease={
                  decreaseQuantity
                }
                onIncrease={
                  increaseQuantity
                }
                onSelect={
                  setSelectedDish
                }
              />
            ))

          )}

        </div>

      </section>

      {/* =================================================
          BOTTOM CART BAR
      ================================================= */}

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-3">

          <div className="max-w-6xl mx-auto">

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
                    ₹
                    {cartTotal.toFixed(2)}
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

      {/* =================================================
          DISH MODAL
      ================================================= */}

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
          onDecrease={
            decreaseQuantity
          }
          onIncrease={
            increaseQuantity
          }
        />
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

        <h2 className="text-lg md:text-xl font-bold">
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
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm ${
        compact ? "" : ""
      }`}
    >

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
              compact
                ? "h-40"
                : "h-52"
            }`}
          />
        ) : (
          <div
            className={`w-full bg-gray-100 flex items-center justify-center text-gray-400 ${
              compact
                ? "h-40"
                : "h-52"
            }`}
          >
            No Image
          </div>
        )}

        {/* FOOD TYPE */}

        <div className="absolute top-3 left-3">

          <span
            className={`w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-xs`}
          >
            {dish.foodType ===
            "veg"
              ? "🟢"
              : "🔴"}
          </span>

        </div>

        {/* BADGES */}

        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">

          {dish.isBestseller && (
            <Badge>
              Bestseller
            </Badge>
          )}

          {dish.todaySpecial && (
            <Badge>
              Today's Special
            </Badge>
          )}

          {dish.isNewArrival && (
            <Badge>
              New
            </Badge>
          )}

        </div>

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

          {dish.rating > 0 && (
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
            🌶️{" "}
            {capitalize(
              dish.spiceLevel
            )} spice
          </p>
        )}

        {/* PRICE + CART */}

        <div className="flex items-center justify-between mt-4">

          <div>

            <span className="text-lg font-bold">
              ₹{dish.price}
            </span>

            {dish.prepTime && (
              <span className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                <FiClock size={10} />
                {dish.prepTime} min
              </span>
            )}

          </div>

          {quantity === 0 ? (

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
                  onDecrease(
                    dish._id
                  )
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
                  onIncrease(
                    dish._id
                  )
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
                  {dish.foodType ===
                  "veg"
                    ? "🟢"
                    : "🔴"}
                </span>

                <h2 className="text-xl font-bold">
                  {dish.name}
                </h2>

              </div>

              <p className="text-orange-600 text-lg font-bold mt-2">
                ₹{dish.price}
              </p>

            </div>

            {dish.rating > 0 && (
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
                🌶️{" "}
                {capitalize(
                  dish.spiceLevel
                )}
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

          {/* ADD */}

          <div className="mt-6">

            {quantity === 0 ? (

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
                      onDecrease(
                        dish._id
                      )
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
                      onIncrease(
                        dish._id
                      )
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