import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiX,
  FiImage,
  FiStar,
} from "react-icons/fi";

export default function OwnerMenuManager() {
  const [dishes, setDishes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);

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

  const user = JSON.parse(localStorage.getItem("user") || "null");

  const hotelId =
    typeof user?.hotelId === "object"
      ? user?.hotelId?._id
      : user?.hotelId;

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = [
    "All",
    "Starters",
    "Main Course",
    "Breads",
    "Rice",
    "Snacks",
    "Desserts",
    "Drinks",
    "Breakfast",
  ];

  // =====================================================
  // FETCH DISHES
  // =====================================================

  useEffect(() => {
    if (hotelId) {
      fetchDishes();
    }
  }, [hotelId]);

  const fetchDishes = async () => {
    try {
      const res = await api.get(`/menu/${hotelId}`);
      setDishes(res.data || []);
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    }
  };

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

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const form = new FormData();

      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("foodType", formData.foodType);
      form.append("containsEgg", formData.containsEgg);
      form.append("price", formData.price);
      form.append("discountType", formData.discountType);
      form.append("discountValue", formData.discountValue);
      form.append("prepTime", formData.prepTime);

      form.append("isAvailable", formData.isAvailable);
      form.append("isRecommended", formData.isRecommended);
      form.append("isBestseller", formData.isBestseller);

      form.append("featured", formData.featured);
      form.append("todaySpecial", formData.todaySpecial);
      form.append("isPopular", formData.isPopular);
      form.append("isNewArrival", formData.isNewArrival);
      form.append("chefChoice", formData.chefChoice);

      form.append("spiceLevel", formData.spiceLevel);
      form.append("displayOrder", formData.displayOrder);

      form.append("tags", formData.tags.join(","));

      if (imageFile) {
        form.append("image", imageFile);
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      };

      let res;

      // =================================================
      // UPDATE
      // =================================================

      if (editingId) {
        res = await api.put(
          `/menu/dish/${editingId}`,
          form,
          config
        );

        setDishes((prev) =>
          prev.map((dish) =>
            dish._id === editingId
              ? res.data
              : dish
          )
        );

        alert("Dish updated successfully");
      }

      // =================================================
      // CREATE
      // =================================================

      else {
        res = await api.post(
          "/menu/dish",
          form,
          config
        );

        setDishes((prev) => [
          res.data,
          ...prev,
        ]);

        alert("Dish added successfully");
      }

      resetForm();

    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
          "Something went wrong"
      );
    } finally {
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
      const token = localStorage.getItem("token");

      await api.delete(`/menu/dish/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDishes((prev) =>
        prev.filter((dish) => dish._id !== id)
      );

    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
          "Failed to delete dish"
      );
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
      category: dish.category || "Main Course",
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
    return dishes.filter((dish) => {
      const categoryMatch =
        activeCategory === "All" ||
        dish.category === activeCategory;

      const searchMatch =
        dish.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        dish.description
          ?.toLowerCase()
          .includes(search.toLowerCase());

      return categoryMatch && searchMatch;
    });
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

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold transition"
        >
          <FiPlus />
          Add Dish
        </button>

      </div>

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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">

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
            className="p-5"
          >

            {/* BASIC DETAILS */}

            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Dish Name
                </label>

                <input
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
                <label className="block text-sm font-semibold mb-1">
                  Category
                </label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none"
                >
                  <option>Starters</option>
                  <option>Main Course</option>
                  <option>Breads</option>
                  <option>Rice</option>
                  <option>Snacks</option>
                  <option>Desserts</option>
                  <option>Drinks</option>
                  <option>Breakfast</option>
                </select>
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

            <div className="mt-6">

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

            </div>

            {/* TAGS */}

            <div className="mt-6">

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

            </div>

            {/* SPICE */}

            <div className="grid sm:grid-cols-2 gap-4 mt-6">

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

              <div>
                <label className="block text-sm font-semibold mb-1">
                  Display Order
                </label>

                <input
                  type="number"
                  name="displayOrder"
                  value={formData.displayOrder}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-lg px-3 py-3"
                />
              </div>

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
                      {dish.category}
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
                          onClick={() =>
                            editDish(dish)
                          }
                          className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center"
                          title="Edit"
                        >
                          <FiEdit2 size={15} />
                        </button>

                        <button
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
                      {dish.category} •{" "}
                      {dish.prepTime} min
                    </p>

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
