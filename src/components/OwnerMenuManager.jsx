import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import {
  buildCategoryList,
  categoryKey,
  categoryName,
  normalizeCategory,
  resolveCategoryReference,
} from "../utils/menuCategories";
import { dishFieldsFromForm, readImageForStorage } from "../utils/menuData";
import {
  enqueueMenuCreate,
  enqueueMenuDelete,
  enqueueMenuUpdate,
  getMenuSyncSummary,
  MENU_CHANGED_EVENT,
  readMenuCache,
  reconcileMenuFromServer,
  requestBackgroundSync,
  retryMenuMutations,
} from "../utils/offlineMenu";
import { getRestaurantId } from "../utils/storageScope";
import { useAuth } from "../context/AuthContext";
import { useConnectivity } from "../context/ConnectivityContext";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiImage,
  FiStar,
  FiUpload,
  FiDownload,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

const DEFAULT_CATEGORIES = [
  "Starters",
  "Main Course",
  "Breads",
  "Rice",
  "Snacks",
  "Desserts",
  "Drinks",
  "Breakfast",
];

export default function OwnerMenuManager({ advancedEnabled = false, restaurant = null }) {
  const { user } = useAuth();
  const { label: connectionLabel } = useConnectivity();
  const hotelId = getRestaurantId(restaurant) || getRestaurantId(user);
  const [dishes, setDishes] = useState(() => readMenuCache(hotelId));
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [syncSummary, setSyncSummary] = useState(() => getMenuSyncSummary(hotelId));
  const savingInFlight = useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Main Course",
    foodType: "veg",
    containsEgg: false,
    price: "",
    discountType: "percentage",
    discountValue: "",
    prepTime: "",

    isAvailable: true,
    isRecommended: false,
    isBestseller: false,

    featured: false,
    todaySpecial: false,
    isPopular: false,
    isNewArrival: false,
    chefChoice: false,

    spiceLevel: "",
    tags: [],
    displayOrder: 0,
  });

  const [imageFile, setImageFile] = useState(null);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = useMemo(
    () => buildCategoryList(dishes, DEFAULT_CATEGORIES),
    [dishes]
  );

  useEffect(() => {
    if (!categories.some((category) => categoryKey(category) === categoryKey(activeCategory))) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  // =====================================================
  // FETCH DISHES
  // =====================================================

  const fetchDishes = useCallback(async () => {
    if (!hotelId) return;
    setDishes(readMenuCache(hotelId));
    try {
      const res = await api.get(`/menu/${hotelId}`);
      setDishes(reconcileMenuFromServer(hotelId, res.data));
      setLoadError("");
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
      setDishes(readMenuCache(hotelId));
      setLoadError(readMenuCache(hotelId).length
        ? "Showing the saved menu. FlexiOrder will refresh it when the connection returns."
        : "The menu could not be loaded. Check the connection and try again.");
    }
  }, [hotelId]);

  useEffect(() => {
    if (hotelId) {
      fetchDishes();
    }
  }, [fetchDishes, hotelId]);

  useEffect(() => {
    if (!hotelId) return undefined;
    const refreshFromStorage = (event) => {
      if (event?.detail?.restaurantId && event.detail.restaurantId !== hotelId) return;
      setDishes(readMenuCache(hotelId));
      setSyncSummary(getMenuSyncSummary(hotelId));
    };
    window.addEventListener(MENU_CHANGED_EVENT, refreshFromStorage);
    refreshFromStorage();
    return () => window.removeEventListener(MENU_CHANGED_EVENT, refreshFromStorage);
  }, [hotelId]);

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // CHECKBOX
  // =====================================================

  const handleCheckbox = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // TAGS
  // =====================================================

  const toggleTag = (tag) => {
    setFormData((prev) => {
      const exists = prev.tags.includes(tag);

      return {
        ...prev,
        tags: exists
          ? prev.tags.filter((item) => item !== tag)
          : [...prev.tags, tag],
      };
    });
  };

  const availableTags = [
    "Spicy",
    "Chef's Choice",
    "Best Seller",
    "Healthy",
    "Jain Friendly",
  ];

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingInFlight.current) return;

    const enteredCategory = categoryName(formData.category);
    if (!enteredCategory) {
      alert("Enter a category name.");
      return;
    }
    if (categoryKey(enteredCategory) === "all") {
      alert('“All” is reserved for viewing the full menu. Choose another category name.');
      return;
    }
    const normalizedCategory = normalizeCategory(enteredCategory, categories);
    const categoryReference = resolveCategoryReference(normalizedCategory, dishes);

    try {
      savingInFlight.current = true;
      setLoading(true);
      setFeedback("");
      const image = await readImageForStorage(imageFile);
      const fields = dishFieldsFromForm(formData, categoryReference);
      if (editingId) {
        enqueueMenuUpdate(hotelId, editingId, fields, image);
        setFeedback("Dish updated here. FlexiOrder will sync it automatically.");
      } else {
        enqueueMenuCreate(hotelId, fields, image);
        setFeedback("Dish added here. FlexiOrder will sync it automatically.");
      }
      setDishes(readMenuCache(hotelId));
      resetForm();
      requestBackgroundSync();
    } catch (err) {
      console.error(err);
      setLoadError(err?.message || "The dish could not be saved. Check the details and try again.");
    } finally {
      savingInFlight.current = false;
      setLoading(false);
    }
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setEditingId(null);

    setFormData({
      name: "",
      description: "",
      category: "Main Course",
      foodType: "veg",
      containsEgg: false,
      price: "",
      discountType: "percentage",
      discountValue: "",
      prepTime: "",

      isAvailable: true,
      isRecommended: false,
      isBestseller: false,

      featured: false,
      todaySpecial: false,
      isPopular: false,
      isNewArrival: false,
      chefChoice: false,

      spiceLevel: "",
      tags: [],
      displayOrder: 0,
    });

    setImageFile(null);
    setShowForm(false);

    const fileInput =
      document.getElementById("dish-image");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteDish = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this dish?"
    );

    if (!confirmDelete) return;

    try {
      enqueueMenuDelete(hotelId, id);
      setDishes(readMenuCache(hotelId));
      setFeedback("Dish removed here. FlexiOrder will sync the change automatically.");
      requestBackgroundSync();
    } catch (err) {
      console.error(err);
      setLoadError(err?.message || "The dish could not be removed. Try again.");
    }
  };

  const toggleAvailability = async (dish) => {
    const nextAvailable = !dish.isAvailable;
    try {
      enqueueMenuUpdate(hotelId, dish._id, { isAvailable: nextAvailable });
      setDishes(readMenuCache(hotelId));
      setFeedback(`${dish.name} is now ${nextAvailable ? "available" : "paused"}.`);
      requestBackgroundSync();
    } catch (err) {
      setLoadError(err?.message || "Could not update dish availability.");
    }
  };

  const exportMenu = () => {
    const excludedFields = new Set([
      "_id", "__v", "createdAt", "updatedAt", "image",
    ]);
    const payload = {
      format: "flexiorder-menu",
      version: 1,
      exportedAt: new Date().toISOString(),
      dishes: dishes.map((dish) => ({
        ...Object.fromEntries(
          Object.entries(dish).filter(([field]) => !excludedFields.has(field))
        ),
        category: categoryName(dish.category),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "flexiorder-menu.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importMenu = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !hotelId) return;

    try {
      const parsed = JSON.parse(await file.text());
      const importedDishes = Array.isArray(parsed)
        ? parsed
        : parsed?.dishes;

      if (!Array.isArray(importedDishes) || importedDishes.length === 0) {
        throw new Error("The file does not contain any dishes.");
      }

      const confirmed = window.confirm(
        `Import ${importedDishes.length} dishes into this menu? Existing dishes will stay.`
      );
      if (!confirmed) return;

      setImporting(true);
      const created = [];

      for (const dish of importedDishes) {
        if (!dish?.name || dish?.price === undefined) continue;

        const importedCategory = categoryName(dish.category);
        const safeCategory = importedCategory && categoryKey(importedCategory) !== "all"
          ? normalizeCategory(importedCategory, categories)
          : "Main Course";

        const fields = Object.fromEntries([
          "name", "description", "foodType", "containsEgg",
          "price", "discountType", "discountValue", "prepTime",
          "isAvailable", "isRecommended", "isBestseller", "featured",
          "todaySpecial", "isPopular", "isNewArrival", "chefChoice",
          "spiceLevel", "displayOrder",
        ].filter((field) => dish[field] !== undefined).map((field) => [field, dish[field]]));
        fields.category = resolveCategoryReference(safeCategory, dishes);
        fields.tags = Array.isArray(dish.tags)
          ? dish.tags
          : String(dish.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
        created.push(enqueueMenuCreate(hotelId, fields));
      }

      setDishes(readMenuCache(hotelId));
      setFeedback(`${created.length} dishes imported here. FlexiOrder will sync them automatically.`);
      requestBackgroundSync();
    } catch (err) {
      console.error("Menu import failed", err);
      setLoadError(err?.message || "The menu could not be imported.");
    } finally {
      setImporting(false);
    }
  };

  // =====================================================
  // EDIT
  // =====================================================

  const editDish = (dish) => {
    setEditingId(dish._id);

    setFormData({
      name: dish.name || "",
      description: dish.description || "",
      category: categoryName(dish.category) || "Main Course",
      foodType: dish.foodType || "veg",
      containsEgg: dish.containsEgg ?? false,
      price: dish.price || "",
      discountType: dish.discountType || "percentage",
      discountValue: dish.discountValue || "",
      prepTime: dish.prepTime || "",

      isAvailable:
        dish.isAvailable ?? true,

      isRecommended:
        dish.isRecommended ?? false,

      isBestseller:
        dish.isBestseller ?? false,

      featured:
        dish.featured ?? false,

      todaySpecial:
        dish.todaySpecial ?? false,

      isPopular:
        dish.isPopular ?? false,

      isNewArrival:
        dish.isNewArrival ?? false,

      chefChoice:
        dish.chefChoice ?? false,

      spiceLevel:
        dish.spiceLevel || "",

      tags:
        Array.isArray(dish.tags)
          ? dish.tags
          : [],

      displayOrder:
        dish.displayOrder || 0,
    });

    setImageFile(null);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredDishes = useMemo(() => {
    return sortDishesForDisplay(dishes.filter((dish) => {
      const categoryMatch =
        activeCategory === "All" ||
        categoryKey(dish.category) === categoryKey(activeCategory);

      const searchMatch =
        dish.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        dish.description
          ?.toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    }));
  }, [
    dishes,
    activeCategory,
    search,
  ]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="text-gray-900">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <h1 className="text-2xl font-bold">
            Menu Management
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Manage dishes, availability and menu sections
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {advancedEnabled && (
            <>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            <FiUpload />
            {importing ? "Importing..." : "Import menu"}
            <input type="file" accept=".json,application/json" onChange={importMenu} disabled={importing} className="hidden" />
          </label>
          <button
            type="button"
            onClick={exportMenu}
            disabled={!dishes.length}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiDownload />
            Export menu
          </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            <FiPlus />
            Add Dish
          </button>
        </div>

      </div>

      {feedback && (
        <div className="ops-inline-success mb-4" role="status">
          <span>{feedback}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setFeedback("")}><FiX /></button>
        </div>
      )}

      {loadError && (
        <div className="ops-inline-error mb-4" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={fetchDishes}>Retry</button>
          <button type="button" aria-label="Dismiss error" onClick={() => setLoadError("")}><FiX /></button>
        </div>
      )}

      {(syncSummary.pending > 0 || syncSummary.attention > 0 || connectionLabel !== "Online") && (
        <div className={`ops-sync-strip mb-4${syncSummary.attention ? " needs-attention" : ""}`} role="status">
          <span>
            {syncSummary.attention
              ? `${syncSummary.attention} menu change${syncSummary.attention === 1 ? " needs" : "s need"} attention`
              : syncSummary.pending
                ? `${syncSummary.pending} menu change${syncSummary.pending === 1 ? "" : "s"} · ${connectionLabel}`
                : connectionLabel}
          </span>
          {syncSummary.attention > 0 && (
            <button type="button" onClick={() => retryMenuMutations(hotelId)}>Retry</button>
          )}
        </div>
      )}

      {/* =================================================
          SEARCH
      ================================================= */}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">

        <div className="relative">

          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />

          <input
            type="text"
            placeholder="Search dishes..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
          />

        </div>

      </div>

      {/* =================================================
          CATEGORY TABS
      ================================================= */}

      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">

        {categories.map((category) => (
          <button
            key={category}
            onClick={() =>
              setActiveCategory(category)
            }
            className={`
              whitespace-nowrap
              px-4 py-2
              rounded-lg
              text-sm
              font-medium
              transition
              ${
                activeCategory === category
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            {category}
          </button>
        ))}

      </div>

      {/* =================================================
          FORM
      ================================================= */}

      {showForm && (
        <div className="ops-menu-dish-editor bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">

          {/* FORM HEADER */}

          <div className="flex items-center justify-between p-5 border-b border-gray-200">

            <div>
              <h2 className="text-lg font-bold">
                {editingId
                  ? "Edit Dish"
                  : "Add New Dish"}
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Add dish information and display settings
              </p>
            </div>

            <button
              type="button"
              onClick={resetForm}
              className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <FiX />
            </button>

          </div>

          <form
            onSubmit={handleSubmit}
            className="ops-menu-dish-form p-5"
          >

            {/* BASIC DETAILS */}

            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label htmlFor="dish-name" className="block text-sm font-semibold mb-1">
                  Dish Name
                </label>

                <input
                  id="dish-name"
                  name="name"
                  placeholder="e.g. Paneer Butter Masala"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Price
                </label>

                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Discount (optional)
                </label>
                <div className="flex gap-2">
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleChange}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-3 outline-none"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">₹</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    name="discountValue"
                    placeholder="Amount"
                    value={formData.discountValue}
                    onChange={handleChange}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dish-category" className="block text-sm font-semibold mb-1">
                  Category
                </label>

                <input
                  id="dish-category"
                  type="text"
                  list="menu-category-options"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Choose or type a category"
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none"
                  required
                />
                <datalist id="menu-category-options">
                  {categories.filter((category) => category !== "All").map((category) => (
                    <option value={category} key={category} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-gray-500">
                  Select a suggestion or type your own category name.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Preparation Time
                </label>

                <input
                  type="number"
                  name="prepTime"
                  placeholder="Minutes"
                  value={formData.prepTime}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none"
                  required
                />
              </div>

            </div>

            {/* FOOD TYPE */}

            <div className="mt-5">

              <label className="block text-sm font-semibold mb-2">
                Food Type
              </label>

              <div className="flex gap-3">

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      foodType: "veg",
                    }))
                  }
                  className={`
                    px-5 py-2.5
                    rounded-lg
                    border
                    text-sm
                    font-semibold
                    ${
                      formData.foodType === "veg"
                        ? "bg-green-50 border-green-500 text-green-700"
                        : "border-gray-200 text-gray-500"
                    }
                  `}
                >
                  🟢 Veg
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      foodType: "nonveg",
                    }))
                  }
                  className={`
                    px-5 py-2.5
                    rounded-lg
                    border
                    text-sm
                    font-semibold
                    ${
                      formData.foodType === "nonveg"
                        ? "bg-red-50 border-red-500 text-red-700"
                        : "border-gray-200 text-gray-500"
                    }
                  `}
                >
                  🔴 Non-Veg
                </button>

              </div>

            </div>

            {/* DESCRIPTION */}

            {formData.foodType === "veg" && (
              <label className="mt-5 flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={formData.containsEgg}
                  onChange={(event) =>
                    handleCheckbox("containsEgg", event.target.checked)
                  }
                  className="h-4 w-4 accent-green-600"
                />
                Contains egg
              </label>
            )}

            <div className="mt-5">

              <label className="block text-sm font-semibold mb-1">
                Description
              </label>

              <textarea
                name="description"
                placeholder="Describe the dish..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none resize-none"
              />

            </div>

            {/* IMAGE */}

            <div className="mt-5">

              <label className="block text-sm font-semibold mb-2">
                Dish Image
              </label>

              <label
                htmlFor="dish-image"
                className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
              >

                <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FiImage className="text-gray-500" />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Choose image
                  </p>

                  <p className="text-xs text-gray-500">
                    JPG, PNG or WEBP
                  </p>
                </div>

              </label>

              <input
                id="dish-image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImageFile(
                    e.target.files?.[0] || null
                  )
                }
                className="hidden"
              />

              {imageFile && (
                <p className="text-xs text-green-600 mt-2">
                  Selected: {imageFile.name}
                </p>
              )}

            </div>

            {/* AVAILABILITY */}

            <div className="mt-6">

              <h3 className="font-bold text-sm mb-3">
                Availability
              </h3>

              <CheckOption
                label="Available"
                description="Customers can order this dish"
                checked={formData.isAvailable}
                onChange={(value) =>
                  handleCheckbox(
                    "isAvailable",
                    value
                  )
                }
              />

            </div>

            {/* DISPLAY SECTIONS */}

            {advancedEnabled && <div className="mt-6">

              <h3 className="font-bold text-sm mb-3">
                Display Sections
              </h3>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

                <CheckOption
                  label="Featured"
                  checked={formData.featured}
                  onChange={(value) =>
                    handleCheckbox(
                      "featured",
                      value
                    )
                  }
                />

                <CheckOption
                  label="Today's Special"
                  checked={formData.todaySpecial}
                  onChange={(value) =>
                    handleCheckbox(
                      "todaySpecial",
                      value
                    )
                  }
                />

                <CheckOption
                  label="Recommended"
                  checked={formData.isRecommended}
                  onChange={(value) =>
                    handleCheckbox(
                      "isRecommended",
                      value
                    )
                  }
                />

                <CheckOption
                  label="Best Seller"
                  checked={formData.isBestseller}
                  onChange={(value) =>
                    handleCheckbox(
                      "isBestseller",
                      value
                    )
                  }
                />

                <CheckOption
                  label="Popular"
                  checked={formData.isPopular}
                  onChange={(value) =>
                    handleCheckbox(
                      "isPopular",
                      value
                    )
                  }
                />

                <CheckOption
                  label="New Arrival"
                  checked={formData.isNewArrival}
                  onChange={(value) =>
                    handleCheckbox(
                      "isNewArrival",
                      value
                    )
                  }
                />

                <CheckOption
                  label="Chef's Choice"
                  checked={formData.chefChoice}
                  onChange={(value) =>
                    handleCheckbox(
                      "chefChoice",
                      value
                    )
                  }
                />

              </div>

            </div>}

            {/* TAGS */}

            {advancedEnabled && <div className="mt-6">

              <h3 className="font-bold text-sm mb-3">
                Dish Tags
              </h3>

              <div className="flex flex-wrap gap-2">

                {availableTags.map((tag) => {

                  const selected =
                    formData.tags.includes(tag);

                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        toggleTag(tag)
                      }
                      className={`
                        px-3 py-2
                        rounded-lg
                        text-xs
                        font-semibold
                        border
                        transition
                        ${
                          selected
                            ? "bg-orange-500 border-orange-500 text-white"
                            : "bg-white border-gray-200 text-gray-600"
                        }
                      `}
                    >
                      {tag}
                    </button>
                  );
                })}

              </div>

            </div>}

            {/* SPICE */}

            <div className={`grid gap-4 mt-6 ${advancedEnabled ? "sm:grid-cols-2" : ""}`}>

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Spice Level
                </label>

                <select
                  name="spiceLevel"
                  value={formData.spiceLevel}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                >
                  <option value="">
                    Select spice level
                  </option>
                  <option value="mild">
                    Mild
                  </option>
                  <option value="medium">
                    Medium
                  </option>
                  <option value="hot">
                    Hot
                  </option>
                </select>
              </div>

              {advancedEnabled && <div>
                <label className="block text-sm font-semibold mb-1">
                  Menu priority (optional)
                </label>

                <input
                  type="number"
                  min="0"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Positive numbers appear first; 1 is highest. Leave 0 for normal order.
                </p>
              </div>}

            </div>

            {/* BUTTONS */}

            <div className="flex flex-col sm:flex-row gap-3 mt-7">

              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Dish"
                  : "Add Dish"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="sm:w-32 border border-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>

            </div>

          </form>

        </div>
      )}

      {/* =================================================
          DISH COUNT
      ================================================= */}

      <div className="flex items-center justify-between mb-4">

        <div>
          <h2 className="font-bold text-lg">
            Dishes
          </h2>

          <p className="text-sm text-gray-500">
            {filteredDishes.length} dishes
          </p>
        </div>

      </div>

      {/* =================================================
          DISH TABLE / CARDS
      ================================================= */}

      {filteredDishes.length === 0 ? (

        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">

          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiImage
              size={25}
              className="text-gray-400"
            />
          </div>

          <h3 className="font-bold text-lg">
            No dishes found
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Add your first dish to the menu.
          </p>

        </div>

      ) : (

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* DESKTOP TABLE */}

          <div className="hidden lg:block overflow-x-auto">

            <table className="w-full">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Dish
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Category
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Type
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Price
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Sections
                  </th>

                  <th className="text-right px-5 py-4 text-xs font-bold text-gray-500 uppercase">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-100">

                {filteredDishes.map((dish) => (

                  <tr
                    key={dish._id}
                    className="hover:bg-gray-50"
                  >

                    {/* DISH */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                            <FiImage className="text-gray-400" />
                          </div>
                        )}

                        <div>

                          <div className="font-semibold">
                            {dish.name}
                          </div>

                          <div className="text-xs text-gray-500">
                            {dish.prepTime} min
                          </div>

                        </div>

                      </div>

                    </td>

                    {/* CATEGORY */}

                    <td className="px-5 py-4 text-sm">
                      {categoryName(dish.category) || "Uncategorized"}
                    </td>

                    {/* FOOD TYPE */}

                    <td className="px-5 py-4">

                      {dish.foodType === "veg" ? (
                        <span className="text-green-600 text-xs font-bold">
                          🟢 Veg
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-bold">
                          🔴 Non-Veg
                        </span>
                      )}

                    </td>

                    {/* PRICE */}

                    <td className="px-5 py-4 font-semibold">
                      ₹{dish.price}
                    </td>

                    {/* STATUS */}

                    <td className="px-5 py-4">

                      {dish.isAvailable ? (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                          Hidden
                        </span>
                      )}

                    </td>

                    {/* SECTIONS */}

                    <td className="px-5 py-4">

                      <div className="flex flex-wrap gap-1 max-w-[220px]">

                        {dish.todaySpecial && (
                          <SmallTag>
                            Today's Special
                          </SmallTag>
                        )}

                        {dish.isRecommended && (
                          <SmallTag>
                            Recommended
                          </SmallTag>
                        )}

                        {dish.isBestseller && (
                          <SmallTag>
                            Bestseller
                          </SmallTag>
                        )}

                        {dish.isPopular && (
                          <SmallTag>
                            Popular
                          </SmallTag>
                        )}

                        {dish.isNewArrival && (
                          <SmallTag>
                            New
                          </SmallTag>
                        )}

                        {dish.chefChoice && (
                          <SmallTag>
                            Chef's Choice
                          </SmallTag>
                        )}

                      </div>

                    </td>

                    {/* ACTIONS */}

                    <td className="px-5 py-4">

                      <div className="flex justify-end gap-2">

                        <button
                          onClick={() => toggleAvailability(dish)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${dish.isAvailable ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                          title={dish.isAvailable ? "Hide from menu" : "Show on menu"}
                          aria-label={`${dish.isAvailable ? "Hide" : "Show"} ${dish.name}`}
                        >
                          {dish.isAvailable ? <FiEye size={15} /> : <FiEyeOff size={15} />}
                        </button>

                        <button
                          onClick={() =>
                            editDish(dish)
                          }
                          className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                          title="Edit"
                          aria-label={`Edit ${dish.name}`}
                        >
                          <FiEdit2 size={15} />
                        </button>

                        <button
                          onClick={() =>
                            deleteDish(dish._id)
                          }
                          className="w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                          title="Delete"
                          aria-label={`Delete ${dish.name}`}
                        >
                          <FiTrash2 size={15} />
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {/* MOBILE / TABLET CARDS */}

          <div className="lg:hidden divide-y divide-gray-100">

            {filteredDishes.map((dish) => (

              <div
                key={dish._id}
                className="p-4"
              >

                <div className="flex gap-3">

                  {dish.image ? (
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                      <FiImage className="text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">

                    <div className="flex justify-between gap-2">

                      <h3 className="font-bold truncate">
                        {dish.name}
                      </h3>

                      <span className="font-bold">
                        ₹{dish.price}
                      </span>

                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      {categoryName(dish.category) || "Uncategorized"} •{" "}
                      {dish.prepTime} min
                    </p>

                    {dish.pendingSync && (
                      <p className={`mt-1 text-xs font-semibold ${dish.syncError ? "text-red-700" : "text-blue-700"}`}>
                        {dish.syncError || "Waiting to sync"}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">

                      {dish.foodType === "veg" ? (
                        <span className="text-green-600 text-xs font-semibold">
                          🟢 Veg
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-semibold">
                          🔴 Non-Veg
                        </span>
                      )}

                      {dish.isAvailable ? (
                        <span className="text-green-600 text-xs font-semibold">
                          Available
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-semibold">
                          Hidden
                        </span>
                      )}

                    </div>

                  </div>

                </div>

                {/* TAGS */}

                <div className="flex flex-wrap gap-1 mt-3">

                  {dish.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 rounded-md text-[10px] font-medium text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}

                  {dish.todaySpecial && (
                    <SmallTag>
                      Today's Special
                    </SmallTag>
                  )}

                  {dish.isRecommended && (
                    <SmallTag>
                      Recommended
                    </SmallTag>
                  )}

                  {dish.isBestseller && (
                    <SmallTag>
                      Bestseller
                    </SmallTag>
                  )}

                  {dish.isPopular && (
                    <SmallTag>
                      Popular
                    </SmallTag>
                  )}

                </div>

                {/* ACTIONS */}

                <div className="flex gap-2 mt-4">

                  <button
                    onClick={() => toggleAvailability(dish)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${dish.isAvailable ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {dish.isAvailable ? <FiEye /> : <FiEyeOff />}
                      {dish.isAvailable ? "Hide" : "Show"}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      editDish(dish)
                    }
                    className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-semibold"
                  >
                    <span className="inline-flex items-center gap-1">
                      <FiEdit2 />
                      Edit
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      deleteDish(dish._id)
                    }
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-sm font-semibold"
                  >
                    <span className="inline-flex items-center gap-1">
                      <FiTrash2 />
                      Delete
                    </span>
                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>
  );
}

/* =========================================================
   CHECK OPTION
========================================================= */

function CheckOption({
  label,
  description,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50">

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="w-4 h-4 accent-orange-500"
      />

      <div>

        <p className="text-sm font-semibold">
          {label}
        </p>

        {description && (
          <p className="text-xs text-gray-500">
            {description}
          </p>
        )}

      </div>

    </label>
  );
}

/* =========================================================
   SMALL TAG
========================================================= */

function SmallTag({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-[10px] font-semibold">
      <FiStar size={9} />
      {children}
    </span>
  );
}
