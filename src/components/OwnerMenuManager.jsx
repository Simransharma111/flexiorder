import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { sortDishesForDisplay } from "../utils/menuOrdering";
import {
  buildCategoryList,
  categoryId,
  categoryKey,
  categoryName,
  dishCategoryName,
  findCategoryByName,
  normalizeCategoryRecord,
} from "../utils/menuCategories";
import {
  enqueueMenuCreate,
  enqueueMenuDelete,
  enqueueMenuUpdate,
  getMenuSyncSummary,
  MENU_CHANGED_EVENT,
  readMenuCache,
  readMenuCategoryCache,
  reconcileMenuFromServer,
  requestBackgroundSync,
  retryMenuMutations,
  writeMenuCategoryCache,
} from "../utils/offlineMenu";
import { getRestaurantId } from "../utils/storageScope";
import {
  importMenuViaSingleDishEndpoints,
  MENU_TRANSFER_MAX_BYTES,
  parseMenuImport,
  serializeMenuExport,
} from "../utils/menuTransfer";
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

export default function OwnerMenuManager({
  advancedEnabled = false,
  restaurant = null,
}) {
  const { user } = useAuth();
  const { isOnline } = useConnectivity();

  const hotelId =
    getRestaurantId(restaurant) || getRestaurantId(user);

  const [dishes, setDishes] = useState(() =>
    hotelId ? readMenuCache(hotelId) : []
  );
  const [categoryCatalog, setCategoryCatalog] = useState(() =>
    hotelId ? readMenuCategoryCache(hotelId) : []
  );
  const [categoryCatalogConfirmed, setCategoryCatalogConfirmed] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");

  const [syncSummary, setSyncSummary] = useState(() =>
    hotelId
      ? getMenuSyncSummary(hotelId)
      : { pending: 0, attention: 0 }
  );

  const savingInFlight = useRef(false);

  const canonicalCategories = useMemo(() => {
    const byName = new Map();
    const dishCategories = dishes.map((dish) =>
      normalizeCategoryRecord({
        _id:
          categoryId(dish.categoryId) ||
          categoryId(dish.category),
        name: dishCategoryName(dish),
      })
    );

    [
      ...categoryCatalog,
      ...(categoryCatalogConfirmed ? [] : dishCategories),
    ]
      .map(normalizeCategoryRecord)
      .filter(Boolean)
      .forEach((category) => {
        const key = categoryKey(category);
        if (key && !byName.has(key)) byName.set(key, category);
      });

    return [...byName.values()];
  }, [categoryCatalog, categoryCatalogConfirmed, dishes]);

  const categories = useMemo(
    () => buildCategoryList(
      dishes,
      [
        ...DEFAULT_CATEGORIES,
        ...canonicalCategories.map(categoryName),
      ]
    ),
    [canonicalCategories, dishes]
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
    setCategoryCatalog(readMenuCategoryCache(hotelId));
    setSyncSummary(getMenuSyncSummary(hotelId));
  }, [hotelId]);

  const storeCategoryCatalog = useCallback((nextCategories) => {
    if (!hotelId) return [];

    const stored = writeMenuCategoryCache(hotelId, nextCategories);
    setCategoryCatalog(stored);
    return stored;
  }, [hotelId]);

  const fetchCategories = useCallback(async () => {
    if (!hotelId) return [];

    const response = await api.get(`/menu/categories/${hotelId}`);
    const incoming = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.categories)
        ? response.data.categories
        : [];

    const stored = storeCategoryCatalog(incoming);
    setCategoryCatalogConfirmed(true);
    return stored;
  }, [hotelId, storeCategoryCatalog]);

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
      setCategoryCatalogConfirmed(false);
      fetchDishes();
      fetchCategories().catch((err) => {
        console.warn("Failed to fetch menu categories:", err);
        setCategoryCatalog(readMenuCategoryCache(hotelId));
      });
    }
  }, [fetchCategories, fetchDishes, hotelId]);

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

  const resolveCategoryForSave = async (value) => {
    const requestedName = categoryName(value);
    let match = findCategoryByName(canonicalCategories, requestedName);

    if (match) return match;

    if (!isOnline) {
      throw new Error(
        `Connect to the internet to create “${requestedName}”. You can still use categories already saved on this device.`
      );
    }

    try {
      const response = await api.post("/menu/category", {
        name: requestedName,
        subCategories: [],
      });
      const created = normalizeCategoryRecord(
        response.data?.category || response.data
      );

      if (!created) {
        throw new Error("The restaurant did not confirm the new category.");
      }

      storeCategoryCatalog([...canonicalCategories, created]);
      return created;
    } catch (err) {
      try {
        const refreshed = await fetchCategories();
        match = findCategoryByName(refreshed, requestedName);
        if (match) return match;
      } catch {
        // Preserve the original category-creation error below.
      }

      throw new Error(
        err?.response?.data?.message ||
          err?.message ||
          "The category could not be created. Your dish has not been queued.",
        { cause: err }
      );
    }
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

      const resolvedCategory = await resolveCategoryForSave(
        formData.category
      );
      const resolvedFields = {
        ...fields,
        category: resolvedCategory,
        categoryId: categoryId(resolvedCategory),
        categoryName: categoryName(resolvedCategory),
      };

      if (editingId) {
        enqueueMenuUpdate(
          hotelId,
          editingId,
          resolvedFields,
          imageFile
        );

        setFeedback(
          `${formData.name} updated. FlexiOrder will sync the change automatically.`
        );
      } else {
        enqueueMenuCreate(
          hotelId,
          resolvedFields,
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
      throw err;
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

    try {
      const serialized = serializeMenuExport(dishes);
      const blob = new Blob(
        [serialized],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "flexiorder-menu.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setLoadError("");
    } catch (err) {
      setLoadError(err?.message || "The menu could not be exported.");
    }
  };

  const importMenu = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || !hotelId) return;

    try {
      if (!isOnline) {
        throw new Error(
          "Connect to the internet to import this menu. The file was not changed and can be selected again."
        );
      }

      if (file.size > MENU_TRANSFER_MAX_BYTES) {
        throw new Error("The menu file must be 1 MB or smaller.");
      }

      const latestSummary = getMenuSyncSummary(hotelId);
      if (latestSummary.pending > 0 || latestSummary.attention > 0) {
        throw new Error(
          "Wait for saved menu changes to finish syncing before importing."
        );
      }

      const payload = parseMenuImport(
        await file.text(),
        file.size
      );
      if (
        new TextEncoder().encode(JSON.stringify(payload)).byteLength >
        MENU_TRANSFER_MAX_BYTES
      ) {
        throw new Error(
          "The normalized menu is larger than 1 MB. Split it into smaller menu files."
        );
      }

      const confirmed = window.confirm(
        `Import ${payload.dishes.length} dishes into this menu? Existing dishes will stay.`
      );

      if (!confirmed) return;

      setImporting(true);
      setLoadError("");
      setFeedback("");

      let response;
      try {
        response = await api.post("/menu/import", payload, {
          headers: { "Content-Type": "application/json" },
          maxBodyLength: MENU_TRANSFER_MAX_BYTES,
        });
      } catch (error) {
        if (error?.response?.status !== 404) throw error;

        /*
         * Older backends do not expose the bulk import route. Replicate the
         * import with the single-category/single-dish endpoints instead.
         */
        setImportProgress([0, payload.dishes.length]);
        response = {
          data: await importMenuViaSingleDishEndpoints(payload, {
            hotelId,
            existingDishes: dishes,
            onProgress: (done, total) => setImportProgress([done, total]),
          }),
        };
      }
      const imported = response.data?.imported;
      const skipped = response.data?.skipped;
      const errors = response.data?.errors;
      const total = response.data?.total;

      if (
        response.data?.success !== true ||
        !Number.isInteger(imported) ||
        !Number.isInteger(skipped) ||
        imported < 0 ||
        skipped < 0 ||
        imported + skipped !== payload.dishes.length ||
        total !== payload.dishes.length ||
        errors !== 0
      ) {
        throw new Error("The restaurant did not confirm the menu import.");
      }

      await fetchDishes();
      setFeedback(
        `${imported} dish${imported === 1 ? "" : "es"} imported. ${skipped} skipped.`
      );
    } catch (err) {
      console.error("MENU IMPORT ERROR:", err);

      setLoadError(
        err?.response?.data?.message ||
          err?.message ||
          "The menu could not be imported. No changes were made."
      );
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortDishesForDisplay(
      dishes.filter((dish) => {
        const dishCategory = dishCategoryName(dish);

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
                  ? importProgress
                    ? `Importing ${importProgress[0]}/${importProgress[1]}...`
                    : "Importing..."
                  : "Import menu"}

                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={importMenu}
                  disabled={importing}
                  className="hidden"
                />
              </label>

              <a
                href="/examples/flexiorder-menu-demo.json"
                download="flexiorder-menu-demo.json"
                className="flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Demo file
              </a>

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
            className="owner-accent-bg flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold"
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

      {/* Recovery is prominent only when a saved menu change needs a decision. */}
      {syncSummary.attention > 0 && (
        <div
          className="ops-attention-panel mb-4"
          role="status"
        >
          <span>
            {`${syncSummary.attention} menu change${
              syncSummary.attention === 1
                ? " needs"
                : "s need"
            } attention`}
          </span>

          <button
            type="button"
            disabled={!isOnline}
            title={!isOnline ? "Reconnect to retry" : undefined}
            onClick={() => retryMenuMutations(hotelId)}
          >
            Retry
          </button>
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
            className="owner-input w-full bg-gray-50 rounded-lg pl-10 pr-4 py-3 outline-none"
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
                ? "owner-accent-bg"
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
                className="owner-accent-bg mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold"
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
                        <span className="veg-badge is-veg">Veg</span>
                      ) : (
                        <span className="veg-badge is-nonveg">Non-Veg</span>
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
                        <span className="veg-badge is-veg">Veg</span>
                      ) : (
                        <span className="veg-badge is-nonveg">Non-Veg</span>
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
    <span className="owner-tag">
      <FiStar size={9} />
      {children}
    </span>
  );
}
