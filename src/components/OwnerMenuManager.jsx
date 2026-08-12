import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import {
  buildCategoryList,
  categoryKey,
  categoryName,
} from "../utils/menuCategories";
import { readMenuCache } from "../utils/offlineMenu";
import {
  enqueueMenuCreate,
  enqueueMenuDelete,
  enqueueMenuUpdate,
  getMenuSyncSummary,
  MENU_CHANGED_EVENT,
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
  FiUpload,
  FiDownload,
  FiEye,
  FiEyeOff,
  FiStar,
} from "react-icons/fi";
import DishForm from "../components/menu/DishForm";

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

const EMPTY_FORM = {
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
};

export default function OwnerMenuManager({
  advancedEnabled = false,
  restaurant = null,
}) {
  const { user } = useAuth();
  const { label: connectionLabel } = useConnectivity();

  const hotelId =
    getRestaurantId(restaurant) || getRestaurantId(user);

  const [dishes, setDishes] = useState(() =>
    hotelId ? readMenuCache(hotelId) : []
  );

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [syncSummary, setSyncSummary] = useState(() =>
    hotelId
      ? getMenuSyncSummary(hotelId)
      : { pending: 0, attention: 0 }
  );

  const savingInFlight = useRef(false);

  const categories = useMemo(
    () => buildCategoryList(dishes, DEFAULT_CATEGORIES),
    [dishes]
  );

  useEffect(() => {
    if (
      !categories.some(
        (category) =>
          categoryKey(category) === categoryKey(activeCategory)
      )
    ) {
      setActiveCategory("All");
    }
  }, [activeCategory, categories]);

  const refreshLocalMenu = useCallback(() => {
    if (!hotelId) {
      setDishes([]);
      return;
    }

    setDishes(readMenuCache(hotelId));
    setSyncSummary(getMenuSyncSummary(hotelId));
  }, [hotelId]);

  const fetchDishes = useCallback(async () => {
    if (!hotelId) return;

    const cached = readMenuCache(hotelId);
    setDishes(cached);

    try {
      const res = await api.get(`/menu/${hotelId}`);

      const serverDishes = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.dishes)
        ? res.data.dishes
        : [];

      const reconciled = reconcileMenuFromServer(
        hotelId,
        serverDishes
      );

      setDishes(reconciled);
      setSyncSummary(getMenuSyncSummary(hotelId));
      setLoadError("");
    } catch (err) {
      console.error("Failed to fetch dishes:", err);

      setDishes(readMenuCache(hotelId));

      setLoadError(
        cached.length
          ? "Showing the saved menu. FlexiOrder will refresh it when the connection returns."
          : "The menu could not be loaded. Check the connection and try again."
      );
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
      if (
        event?.detail?.restaurantId &&
        event.detail.restaurantId !== hotelId
      ) {
        return;
      }

      refreshLocalMenu();
    };

    window.addEventListener(
      MENU_CHANGED_EVENT,
      refreshFromStorage
    );

    refreshFromStorage();

    return () => {
      window.removeEventListener(
        MENU_CHANGED_EVENT,
        refreshFromStorage
      );
    };
  }, [hotelId, refreshLocalMenu]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setShowForm(false);
    setLoading(false);

    const fileInput = document.getElementById("dish-image");

    if (fileInput) {
      fileInput.value = "";
    }
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setShowForm(true);
    setLoadError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDishSaved = async ({
    formData,
    imageFile,
    fields,
  }) => {
    if (!hotelId) {
      setLoadError(
        "Hotel information is missing. Please refresh and try again."
      );
      return;
    }

    if (savingInFlight.current) return;

    try {
      savingInFlight.current = true;
      setLoading(true);
      setLoadError("");
      setFeedback("");

      if (editingId) {
        enqueueMenuUpdate(
          hotelId,
          editingId,
          fields,
          imageFile
        );

        setFeedback(
          `${formData.name} updated. FlexiOrder will sync the change automatically.`
        );
      } else {
        enqueueMenuCreate(
          hotelId,
          fields,
          imageFile
        );

        setFeedback(
          `${formData.name} added. FlexiOrder will sync it automatically.`
        );
      }

      refreshLocalMenu();
      resetForm();
      requestBackgroundSync();
    } catch (err) {
      console.error("SAVE DISH ERROR:", err);

      setLoadError(
        err?.response?.data?.message ||
          err?.message ||
          "The dish could not be saved."
      );
    } finally {
      savingInFlight.current = false;
      setLoading(false);
    }
  };

  const editDish = (dish) => {
    setEditingId(dish._id);
    setShowForm(true);
    setLoadError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteDish = async (id) => {
    if (!hotelId || !id) return;

    const dish = dishes.find((item) => item._id === id);

    const confirmed = window.confirm(
      `Are you sure you want to delete${
        dish?.name ? ` "${dish.name}"` : " this dish"
      }?`
    );

    if (!confirmed) return;

    try {
      enqueueMenuDelete(hotelId, id);

      refreshLocalMenu();

      setFeedback(
        "Dish removed here. FlexiOrder will sync the change automatically."
      );

      requestBackgroundSync();
    } catch (err) {
      console.error("DELETE DISH ERROR:", err);

      setLoadError(
        err?.message ||
          "The dish could not be removed. Try again."
      );
    }
  };

  const toggleAvailability = async (dish) => {
    if (!hotelId || !dish?._id) return;

    const nextAvailable = !dish.isAvailable;

    try {
      enqueueMenuUpdate(
        hotelId,
        dish._id,
        {
          isAvailable: nextAvailable,
        }
      );

      refreshLocalMenu();

      setFeedback(
        `${dish.name} is now ${
          nextAvailable ? "available" : "paused"
        }.`
      );

      requestBackgroundSync();
    } catch (err) {
      console.error("TOGGLE AVAILABILITY ERROR:", err);

      setLoadError(
        err?.message ||
          "Could not update dish availability."
      );
    }
  };

  const exportMenu = () => {
    if (!dishes.length) return;

    const excludedFields = new Set([
      "_id",
      "__v",
      "createdAt",
      "updatedAt",
      "image",
      "pendingSync",
      "syncError",
    ]);

    const payload = {
      format: "flexiorder-menu",
      version: 1,
      exportedAt: new Date().toISOString(),
      dishes: dishes.map((dish) => ({
        ...Object.fromEntries(
          Object.entries(dish).filter(
            ([field]) => !excludedFields.has(field)
          )
        ),
        category: categoryName(dish.category),
      })),
    };

    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "flexiorder-menu.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

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

      if (
        !Array.isArray(importedDishes) ||
        importedDishes.length === 0
      ) {
        throw new Error(
          "The file does not contain any dishes."
        );
      }

      const confirmed = window.confirm(
        `Import ${importedDishes.length} dishes into this menu? Existing dishes will stay.`
      );

      if (!confirmed) return;

      setImporting(true);
      setLoadError("");

      let created = 0;

      for (const dish of importedDishes) {
        if (!dish?.name || dish?.price === undefined) {
          continue;
        }

        const category =
          categoryName(dish.category) ||
          "Main Course";

        const fields = {
          name: dish.name,
          description: dish.description || "",
          category,
          foodType: dish.foodType || "veg",
          containsEgg: Boolean(dish.containsEgg),
          price: Number(dish.price) || 0,
          discountType:
            dish.discountType || "percentage",
          discountValue:
            Number(dish.discountValue) || 0,
          prepTime: Number(dish.prepTime) || 0,
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
          tags: Array.isArray(dish.tags)
            ? dish.tags
            : [],
          displayOrder:
            Number(dish.displayOrder) || 0,
        };

        enqueueMenuCreate(
          hotelId,
          fields,
          null
        );

        created += 1;
      }

      refreshLocalMenu();

      setFeedback(
        `${created} dish${
          created === 1 ? "" : "es"
        } imported. FlexiOrder will sync automatically.`
      );

      requestBackgroundSync();
    } catch (err) {
      console.error("MENU IMPORT ERROR:", err);

      setLoadError(
        err?.message ||
          "The menu could not be imported."
      );
    } finally {
      setImporting(false);
    }
  };

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortDishesForDisplay(
      dishes.filter((dish) => {
        const dishCategory = categoryName(
          dish.category
        );

        const categoryMatch =
          activeCategory === "All" ||
          categoryKey(dishCategory) ===
            categoryKey(activeCategory);

        const searchMatch =
          !query ||
          dish.name
            ?.toLowerCase()
            .includes(query) ||
          dish.description
            ?.toLowerCase()
            .includes(query);

        return categoryMatch && searchMatch;
      })
    );
  }, [
    dishes,
    activeCategory,
    search,
  ]);

  const editingDish = useMemo(() => {
    if (!editingId) return null;

    return (
      dishes.find(
        (dish) => dish._id === editingId
      ) || null
    );
  }, [dishes, editingId]);

  return (
    <div className="text-gray-900">

      {/* HEADER */}
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

                {importing
                  ? "Importing..."
                  : "Import menu"}

                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importMenu}
                  disabled={importing}
                  className="hidden"
                />
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
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            <FiPlus />
            Add Dish
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div
          className="ops-inline-success mb-4"
          role="status"
        >
          <span>{feedback}</span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setFeedback("")}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* ERROR */}
      {loadError && (
        <div
          className="ops-inline-error mb-4"
          role="alert"
        >
          <span>{loadError}</span>

          <button
            type="button"
            onClick={fetchDishes}
          >
            Retry
          </button>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setLoadError("")}
          >
            <FiX />
          </button>
        </div>
      )}

      {/* SYNC */}
      {(syncSummary.pending > 0 ||
        syncSummary.attention > 0 ||
        connectionLabel !== "Online") && (
        <div
          className={`ops-sync-strip mb-4${
            syncSummary.attention
              ? " needs-attention"
              : ""
          }`}
          role="status"
        >
          <span>
            {syncSummary.attention
              ? `${syncSummary.attention} menu change${
                  syncSummary.attention === 1
                    ? " needs"
                    : "s need"
                } attention`
              : syncSummary.pending
              ? `${syncSummary.pending} menu change${
                  syncSummary.pending === 1
                    ? ""
                    : "s"
                } · ${connectionLabel}`
              : connectionLabel}
          </span>

          {syncSummary.attention > 0 && (
            <button
              type="button"
              onClick={() =>
                retryMenuMutations(hotelId)
              }
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* SEARCH */}
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
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() =>
              setActiveCategory(category)
            }
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
              categoryKey(activeCategory) ===
              categoryKey(category)
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* DISH FORM */}
      {showForm && (
        <DishForm
          hotelId={hotelId}
          categories={categories}
          dish={editingDish}
          editingId={editingId}
          advancedEnabled={advancedEnabled}
          loading={loading}
          onSubmit={handleDishSaved}
          onCancel={resetForm}
        />
      )}

      {/* COUNT */}
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

      {/* EMPTY */}
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
            {search || activeCategory !== "All"
              ? "Try changing your search or category."
              : "Add your first dish to the menu."}
          </p>

          {!search &&
            activeCategory === "All" && (
              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-orange-600"
              >
                <FiPlus />
                Add Dish
              </button>
            )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

          {/* DESKTOP */}
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
                            {dish.prepTime || 0} min
                          </div>

                          {dish.pendingSync && (
                            <div className="text-[11px] text-blue-600 mt-1">
                              {dish.syncError ||
                                "Waiting to sync"}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      {categoryName(
                        dish.category
                      ) || "Uncategorized"}
                    </td>

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

                    <td className="px-5 py-4 font-semibold">
                      ₹{dish.price}
                    </td>

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

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {dish.featured && (
                          <SmallTag>
                            Featured
                          </SmallTag>
                        )}

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

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleAvailability(dish)
                          }
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            dish.isAvailable
                              ? "bg-green-50 text-green-600 hover:bg-green-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                          title={
                            dish.isAvailable
                              ? "Hide from menu"
                              : "Show on menu"
                          }
                        >
                          {dish.isAvailable ? (
                            <FiEye size={15} />
                          ) : (
                            <FiEyeOff size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            editDish(dish)
                          }
                          className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                          title="Edit"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteDish(dish._id)
                          }
                          className="w-9 h-9 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
                          title="Delete"
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

          {/* MOBILE */}
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

                      <span className="font-bold whitespace-nowrap">
                        ₹{dish.price}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mt-1">
                      {categoryName(
                        dish.category
                      ) || "Uncategorized"}{" "}
                      • {dish.prepTime || 0} min
                    </p>

                    {dish.pendingSync && (
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          dish.syncError
                            ? "text-red-700"
                            : "text-blue-700"
                        }`}
                      >
                        {dish.syncError ||
                          "Waiting to sync"}
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

                  {dish.featured && (
                    <SmallTag>
                      Featured
                    </SmallTag>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      toggleAvailability(dish)
                    }
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                      dish.isAvailable
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {dish.isAvailable ? (
                        <FiEye />
                      ) : (
                        <FiEyeOff />
                      )}

                      {dish.isAvailable
                        ? "Hide"
                        : "Show"}
                    </span>
                  </button>

                  <button
                    type="button"
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
                    type="button"
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

function SmallTag({ children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-[10px] font-semibold">
      <FiStar size={9} />
      {children}
    </span>
  );
}