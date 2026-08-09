import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../api/axios";

import GuestHeader from "../components/guestmenu/GuestHeader";
import HeroBanner from "../components/guestmenu/HeroBanner";
import FeaturedSection from "../components/guestmenu/FeaturedSection";
import ActiveOrder from "../components/guestmenu/ActiveOrder";
import ScheduleModal from "../components/guestmenu/ScheduleModal";

import {
  FiSearch,
  FiShoppingBag,
  FiCalendar,
  FiPlus,
  FiMinus,
  FiLoader,
  FiX,
} from "react-icons/fi";

export default function GuestMenuPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [table, setTable] = useState(null);
  const [dishes, setDishes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");

  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSubCategory, setActiveSubCategory] = useState("All");

  const [cart, setCart] = useState([]);

  const [activeOrders, setActiveOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);

  const [showScheduleInfo, setShowScheduleInfo] = useState(false);

  // =====================================================
  // CATEGORY HELPERS
  // =====================================================

  const getCategoryName = (dish) => {
    if (!dish) return "";

    if (
      dish.categoryId &&
      typeof dish.categoryId === "object" &&
      dish.categoryId.name
    ) {
      return dish.categoryId.name;
    }

    if (
      dish.category &&
      typeof dish.category === "object" &&
      dish.category.name
    ) {
      return dish.category.name;
    }

    // IMPORTANT:
    // Do not display raw ObjectId as category name.
    if (typeof dish.categoryId === "string") {
      return "";
    }

    if (typeof dish.category === "string") {
      return dish.category;
    }

    return "";
  };

  const getSubCategoryName = (dish) => {
    if (!dish) return "";

    if (
      typeof dish.subCategory === "string"
    ) {
      return dish.subCategory.trim();
    }

    if (
      typeof dish.subcategory === "string"
    ) {
      return dish.subcategory.trim();
    }

    return "";
  };

  // =====================================================
  // FETCH MENU
  // =====================================================

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get(
        `/qr/menu/${qrId}`
      );

      setHotel(res.data?.hotel || null);
      setTable(res.data?.table || null);
      setDishes(
        Array.isArray(res.data?.dishes)
          ? res.data.dishes
          : []
      );
    } catch (err) {
      console.log("MENU ERROR:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load menu"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!qrId) {
      setError("QR information missing");
      setLoading(false);
      return;
    }

    fetchMenu();
  }, [qrId]);

  // =====================================================
  // ACTIVE ORDERS
  // =====================================================

  const fetchActiveOrders = async () => {
    if (!table?._id || !qrId) return;

    try {
      setOrderLoading(true);

      const res = await api.get(
        `/orders/table/${table._id}`
      );

      const orders =
        res.data?.orders ||
        res.data ||
        [];

      const active = Array.isArray(orders)
        ? orders.filter(
            (order) =>
              order.status !== "delivered" &&
              order.status !== "cancelled"
          )
        : [];

      setActiveOrders(active);

      localStorage.setItem(
        `activeOrders_${qrId}`,
        JSON.stringify(
          active.map(
            (order) => order._id
          )
        )
      );
    } catch (err) {
      console.log(
        "ORDER FETCH ERROR:",
        err
      );

      setActiveOrders([]);
    } finally {
      setOrderLoading(false);
    }
  };

  useEffect(() => {
    if (!table?._id) return;

    fetchActiveOrders();

    const interval = setInterval(
      fetchActiveOrders,
      5000
    );

    return () =>
      clearInterval(interval);
  }, [table?._id]);

  // =====================================================
  // LOAD CART
  // =====================================================

  useEffect(() => {
    if (!qrId) return;

    try {
      const saved =
        localStorage.getItem(
          `cart_${qrId}`
        );

      if (saved) {
        setCart(JSON.parse(saved));
      } else {
        setCart([]);
      }
    } catch {
      setCart([]);
    }
  }, [qrId]);

  // =====================================================
  // SAVE CART
  // =====================================================

  useEffect(() => {
    if (!qrId) return;

    localStorage.setItem(
      `cart_${qrId}`,
      JSON.stringify(cart)
    );
  }, [cart, qrId]);

  // =====================================================
  // CATEGORY DATA
  // =====================================================

  const categoryData = useMemo(() => {
    const map = new Map();

    dishes.forEach((dish) => {
      const categoryName =
        getCategoryName(dish);

      if (!categoryName) return;

      if (!map.has(categoryName)) {
        map.set(categoryName, {
          name: categoryName,
          subCategories: [],
        });
      }

      const category =
        map.get(categoryName);

      // Subcategory stored on dish
      const dishSubCategory =
        getSubCategoryName(dish);

      if (
        dishSubCategory &&
        !category.subCategories.includes(
          dishSubCategory
        )
      ) {
        category.subCategories.push(
          dishSubCategory
        );
      }

      // Subcategories stored on category
      const backendSubCategories =
        dish.categoryId &&
        typeof dish.categoryId ===
          "object" &&
        Array.isArray(
          dish.categoryId.subCategories
        )
          ? dish.categoryId.subCategories
          : [];

      backendSubCategories.forEach(
        (subCategory) => {
          if (
            typeof subCategory !== "string"
          ) {
            return;
          }

          const clean =
            subCategory.trim();

          if (
            clean &&
            !category.subCategories.includes(
              clean
            )
          ) {
            category.subCategories.push(
              clean
            );
          }
        }
      );
    });

    return Array.from(
      map.values()
    );
  }, [dishes]);

  // =====================================================
  // CATEGORY NAMES
  // =====================================================

  const categories = useMemo(() => {
    return [
      "All",
      ...categoryData.map(
        (category) => category.name
      ),
    ];
  }, [categoryData]);

  // =====================================================
  // ACTIVE CATEGORY
  // =====================================================

  const activeCategoryData =
    useMemo(() => {
      if (activeCategory === "All") {
        return null;
      }

      return (
        categoryData.find(
          (category) =>
            category.name ===
            activeCategory
        ) || null
      );
    }, [
      categoryData,
      activeCategory,
    ]);

  // =====================================================
  // CHANGE CATEGORY
  // =====================================================

  const handleCategoryChange = (
    category
  ) => {
    setActiveCategory(category);
    setActiveSubCategory("All");
  };

  // =====================================================
  // FILTER DISHES
  // =====================================================

  const filteredDishes = useMemo(() => {
    const text =
      search.trim().toLowerCase();

    return dishes.filter((dish) => {
      if (dish.isDeleted === true) {
        return false;
      }

      const categoryName =
        getCategoryName(dish);

      const subCategoryName =
        getSubCategoryName(dish);

      const categoryMatch =
        activeCategory === "All" ||
        categoryName === activeCategory;

      const subCategoryMatch =
        activeSubCategory === "All" ||
        subCategoryName ===
          activeSubCategory;

      const foodMatch =
        foodFilter === "all" ||
        dish.foodType === foodFilter;

      const searchMatch =
        !text ||
        String(dish.name || "")
          .toLowerCase()
          .includes(text) ||
        String(
          dish.description || ""
        )
          .toLowerCase()
          .includes(text) ||
        categoryName
          .toLowerCase()
          .includes(text) ||
        subCategoryName
          .toLowerCase()
          .includes(text) ||
        (Array.isArray(dish.tags) &&
          dish.tags.some((tag) =>
            String(tag)
              .toLowerCase()
              .includes(text)
          ));

      return (
        categoryMatch &&
        subCategoryMatch &&
        foodMatch &&
        searchMatch
      );
    });
  }, [
    dishes,
    search,
    foodFilter,
    activeCategory,
    activeSubCategory,
  ]);

  // =====================================================
  // FEATURED
  // =====================================================

  const availableDish = (dish) =>
    dish.isAvailable !== false &&
    dish.isDeleted !== true;

  const featured = dishes.filter(
    (dish) =>
      availableDish(dish) &&
      dish.featured
  );

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

  // =====================================================
  // CART HELPERS
  // =====================================================

  const getCartQuantity = (dishId) => {
    const item = cart.find(
      (item) =>
        item._id === dishId
    );

    return item?.quantity || 0;
  };

  const addToCart = (dish) => {
    if (
      !dish ||
      dish.isAvailable === false
    ) {
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item._id === dish._id
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
          description:
            dish.description || "",
          price: Number(
            dish.price || 0
          ),
          image: dish.image || "",
          foodType:
            dish.foodType || "veg",
          quantity: 1,
        },
      ];
    });
  };

  const decreaseQuantity = (
    dishId
  ) => {
    setCart((prev) => {
      const item = prev.find(
        (item) =>
          item._id === dishId
      );

      if (!item) return prev;

      if (item.quantity <= 1) {
        return prev.filter(
          (item) =>
            item._id !== dishId
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

  const increaseQuantity = (
    dishId
  ) => {
    const dish = dishes.find(
      (item) =>
        item._id === dishId
    );

    if (dish) {
      addToCart(dish);
    }
  };

  // =====================================================
  // CART TOTAL
  // =====================================================

  const cartCount =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );

  // FIXED:
  // Your old code was price - quantity.
  // It should be price * quantity.
  const cartTotal =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );

  // =====================================================
  // CART
  // =====================================================

  const openCart = () => {
    if (!qrId) return;

    navigate(`/cart/${qrId}`);
  };

  // =====================================================
  // SCHEDULE
  // =====================================================

  const openSchedule = () => {
    if (cartCount === 0) {
      alert(
        "Please add items to cart first."
      );
      return;
    }

    setShowScheduleInfo(true);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <FiLoader
            size={30}
            className="animate-spin"
          />
          <p className="font-medium">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl shadow-sm border p-7 text-center max-w-md w-full">
          <h2 className="text-xl font-bold text-gray-900">
            Menu unavailable
          </h2>

          <p className="text-gray-500 mt-2">
            {error}
          </p>

          <button
            onClick={fetchMenu}
            className="mt-5 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold"
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

      {/* HEADER */}

      <GuestHeader
        hotel={hotel}
        table={table}
        cartCount={cartCount}
        onCart={openCart}
      />

      {/* ACTIVE ORDERS */}

      <ActiveOrder
        orders={activeOrders}
        loading={orderLoading}
      />

      {/* HERO */}

      <HeroBanner
        hotel={hotel}
        table={table}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* QUICK ACTIONS */}

        <div className="grid grid-cols-2 gap-3 mt-5">

          <button
            onClick={openSchedule}
            className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FiCalendar size={20} />
            </div>

            <div>
              <p className="font-bold text-gray-900">
                Schedule
              </p>

              <p className="text-xs text-gray-500">
                Order later
              </p>
            </div>
          </button>

          <button
            onClick={openCart}
            className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FiShoppingBag size={20} />
            </div>

            <div>
              <p className="font-bold text-gray-900">
                Cart
              </p>

              <p className="text-xs text-gray-500">
                {cartCount} items
              </p>
            </div>
          </button>

        </div>

        {/* SEARCH */}

        <div className="relative mt-5">

          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={19}
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search dishes..."
            className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-11 pr-10 outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
          />

          {search && (
            <button
              onClick={() =>
                setSearch("")
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <FiX />
            </button>
          )}

        </div>

        {/* FOOD FILTER */}

        <div className="flex gap-2 overflow-x-auto py-4">

          {[
            {
              id: "all",
              label: "All",
            },
            {
              id: "veg",
              label: "🟢 Veg",
            },
            {
              id: "nonveg",
              label: "🔴 Non Veg",
            },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() =>
                setFoodFilter(
                  item.id
                )
              }
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                foodFilter === item.id
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {item.label}
            </button>
          ))}

        </div>

        {/* CATEGORY FILTER */}

        {categories.length > 0 && (
          <div className="mb-3">

            <h3 className="text-sm font-bold text-gray-800 mb-2">
              Categories
            </h3>

            <div className="flex gap-2 overflow-x-auto pb-2">

              {categories.map(
                (category) => (
                  <button
                    key={category}
                    onClick={() =>
                      handleCategoryChange(
                        category
                      )
                    }
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                      activeCategory ===
                      category
                        ? "bg-orange-500 text-white"
                        : "bg-white border border-gray-200 text-gray-600"
                    }`}
                  >
                    {category}
                  </button>
                )
              )}

            </div>

          </div>
        )}

        {/* SUBCATEGORY FILTER */}

        {activeCategory !==
          "All" &&
          activeCategoryData &&
          activeCategoryData
            .subCategories
            .length > 0 && (
            <div className="mb-5">

              <div className="flex gap-2 overflow-x-auto pb-2">

                <button
                  onClick={() =>
                    setActiveSubCategory(
                      "All"
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                    activeSubCategory ===
                    "All"
                      ? "bg-gray-900 text-white"
                      : "bg-white border border-gray-200 text-gray-600"
                  }`}
                >
                  All
                </button>

                {activeCategoryData.subCategories.map(
                  (
                    subCategory,
                    index
                  ) => (
                    <button
                      key={`${activeCategory}-${subCategory}-${index}`}
                      onClick={() =>
                        setActiveSubCategory(
                          subCategory
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        activeSubCategory ===
                        subCategory
                          ? "bg-gray-900 text-white"
                          : "bg-white border border-gray-200 text-gray-600"
                      }`}
                    >
                      {subCategory}
                    </button>
                  )
                )}

              </div>

            </div>
          )}

        {/* FEATURED */}

        {!search &&
          activeCategory ===
            "All" &&
          activeSubCategory ===
            "All" && (
            <>
              {featured.length >
                0 && (
                <FeaturedSection
                  title="Featured"
                  dishes={featured}
                  onAdd={addToCart}
                  onDecrease={
                    decreaseQuantity
                  }
                  onIncrease={
                    increaseQuantity
                  }
                  getQuantity={
                    getCartQuantity
                  }
                />
              )}

              {todaySpecial.length >
                0 && (
                <FeaturedSection
                  title="Today's Special"
                  dishes={
                    todaySpecial
                  }
                  onAdd={addToCart}
                  onDecrease={
                    decreaseQuantity
                  }
                  onIncrease={
                    increaseQuantity
                  }
                  getQuantity={
                    getCartQuantity
                  }
                />
              )}

              {recommended.length >
                0 && (
                <FeaturedSection
                  title="Recommended"
                  dishes={
                    recommended
                  }
                  onAdd={addToCart}
                  onDecrease={
                    decreaseQuantity
                  }
                  onIncrease={
                    increaseQuantity
                  }
                  getQuantity={
                    getCartQuantity
                  }
                />
              )}
            </>
          )}

        {/* MENU */}

        <section className="mt-6">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeCategory ===
                "All"
                  ? "Menu"
                  : activeCategory}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {filteredDishes.length}{" "}
                {filteredDishes.length ===
                1
                  ? "dish"
                  : "dishes"}
              </p>

            </div>

            {activeSubCategory !==
              "All" && (
              <span className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-full">
                {activeSubCategory}
              </span>
            )}

          </div>

          {filteredDishes.length ===
          0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">

              <div className="text-4xl mb-3">
                🍽️
              </div>

              <h3 className="font-bold text-gray-900">
                No dishes found
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Try another category or
                search.
              </p>

              <button
                onClick={() => {
                  setSearch("");
                  setFoodFilter(
                    "all"
                  );
                  setActiveCategory(
                    "All"
                  );
                  setActiveSubCategory(
                    "All"
                  );
                }}
                className="mt-4 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold"
              >
                Clear Filters
              </button>

            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {filteredDishes.map(
                (dish) => {

                  const quantity =
                    getCartQuantity(
                      dish._id
                    );

                  const categoryName =
                    getCategoryName(
                      dish
                    );

                  const subCategoryName =
                    getSubCategoryName(
                      dish
                    );

                  return (
                    <article
                      key={dish._id}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition"
                    >

                      {/* IMAGE */}

                      {dish.image ? (
                        <img
                          src={
                            dish.image
                          }
                          alt={
                            dish.name
                          }
                          className="w-full h-44 object-cover"
                        />
                      ) : (
                        <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-4xl">
                          🍽️
                        </div>
                      )}

                      <div className="p-4">

                        {/* CATEGORY */}

                        <div className="flex items-center gap-2 flex-wrap mb-2">

                          {dish.foodType && (
                            <span className="text-xs font-semibold text-gray-600">
                              {dish.foodType ===
                              "veg"
                                ? "🟢 Veg"
                                : "🔴 Non Veg"}
                            </span>
                          )}

                          {categoryName && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {categoryName}
                            </span>
                          )}

                          {subCategoryName && (
                            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">
                              {subCategoryName}
                            </span>
                          )}

                        </div>

                        {/* NAME */}

                        <h3 className="font-bold text-gray-900 text-lg">
                          {dish.name}
                        </h3>

                        {/* DESCRIPTION */}

                        {dish.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {
                              dish.description
                            }
                          </p>
                        )}

                        {/* TAGS */}

                        {Array.isArray(
                          dish.tags
                        ) &&
                          dish.tags.length >
                            0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">

                              {dish.tags
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    tag,
                                    index
                                  ) => (
                                    <span
                                      key={`${dish._id}-tag-${index}`}
                                      className="text-xs text-gray-500"
                                    >
                                      #{String(
                                        tag
                                      )}
                                    </span>
                                  )
                                )}

                            </div>
                          )}

                        {/* PRICE + CART */}

                        <div className="flex items-center justify-between mt-4">

                          <div>
                            <p className="text-lg font-bold text-gray-900">
                              ₹
                              {Number(
                                dish.price ||
                                  0
                              ).toFixed(
                                0
                              )}
                            </p>

                            {dish.prepTime && (
                              <p className="text-xs text-gray-400">
                                {dish.prepTime}{" "}
                                min
                              </p>
                            )}
                          </div>

                          {dish.isAvailable ===
                          false ? (
                            <span className="text-xs font-semibold text-red-500 bg-red-50 px-3 py-2 rounded-xl">
                              Unavailable
                            </span>
                          ) : quantity ===
                            0 ? (
                            <button
                              onClick={() =>
                                addToCart(
                                  dish
                                )
                              }
                              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2"
                            >
                              <FiPlus
                                size={
                                  17
                                }
                              />
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-2 py-1.5">

                              <button
                                onClick={() =>
                                  decreaseQuantity(
                                    dish._id
                                  )
                                }
                                className="w-8 h-8 rounded-lg bg-white text-orange-600 flex items-center justify-center shadow-sm"
                              >
                                <FiMinus />
                              </button>

                              <span className="font-bold text-orange-600 min-w-[20px] text-center">
                                {
                                  quantity
                                }
                              </span>

                              <button
                                onClick={() =>
                                  increaseQuantity(
                                    dish._id
                                  )
                                }
                                className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center"
                              >
                                <FiPlus />
                              </button>

                            </div>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

      </main>

      {/* BOTTOM CART */}

      {cartCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-50 px-4">

          <button
            onClick={openCart}
            className="max-w-6xl mx-auto w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-5 py-4 flex items-center justify-between font-bold shadow-xl"
          >

            <div className="flex items-center gap-3">

              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <FiShoppingBag
                  size={19}
                />
              </div>

              <div className="text-left">

                <p className="text-sm">
                  {cartCount}{" "}
                  {cartCount === 1
                    ? "item"
                    : "items"}
                </p>

                <p className="text-xs text-orange-100">
                  ₹
                  {cartTotal.toFixed(
                    2
                  )}
                </p>

              </div>

            </div>

            <span>
              View Cart →
            </span>

          </button>

        </div>
      )}

      {/* SCHEDULE MODAL */}

      <ScheduleModal
        show={showScheduleInfo}
        close={() =>
          setShowScheduleInfo(false)
        }
        onContinue={() => {
          setShowScheduleInfo(false);
          openCart();
        }}
      />

    </div>
  );
}
