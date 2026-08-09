import { useEffect, useState } from "react";
import api from "../../api/axios";
import { FiX, FiImage } from "react-icons/fi";

export default function DishForm({
  categories = [],
  editingDish,
  onSaved,
  onCancel
}) {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [subCategories, setSubCategories] = useState([]);

  const initialState = {
    name: "",
    description: "",
    category: "",
    subcategory: "",
    foodType: "veg",
    price: "",
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
    displayOrder: 0
  };

  const [formData, setFormData] = useState(initialState);

  // =============================
  // LOAD EDIT DATA
  // =============================

  useEffect(() => {
    if (!editingDish) {
      setFormData(initialState);
      setSubCategories([]);
      setImageFile(null);
      setImagePreview("");
      return;
    }

    const categoryId =
      editingDish.categoryId?._id ||
      editingDish.categoryId ||
      editingDish.category?._id ||
      editingDish.category ||
      "";

    const category = categories.find(
      item => item._id === categoryId
    );

    setSubCategories(
      category?.subCategories || []
    );

    setFormData({
      name: editingDish.name || "",

      description:
        editingDish.description || "",

      category: categoryId,

      subcategory:
        editingDish.subCategory ||
        editingDish.subcategory ||
        "",

      foodType:
        editingDish.foodType || "veg",

      price:
        editingDish.price ?? "",

      prepTime:
        editingDish.prepTime ?? "",

      isAvailable:
        editingDish.isAvailable ?? true,

      isRecommended:
        editingDish.isRecommended ?? false,

      isBestseller:
        editingDish.isBestseller ?? false,

      featured:
        editingDish.featured ?? false,

      todaySpecial:
        editingDish.todaySpecial ?? false,

      isPopular:
        editingDish.isPopular ?? false,

      isNewArrival:
        editingDish.isNewArrival ?? false,

      chefChoice:
        editingDish.chefChoice ?? false,

      spiceLevel:
        editingDish.spiceLevel || "",

      tags:
        Array.isArray(editingDish.tags)
          ? editingDish.tags
          : [],

      displayOrder:
        editingDish.displayOrder ?? 0
    });

    setImagePreview(
      editingDish.image || ""
    );
  }, [editingDish, categories]);

  // =============================
  // INPUT
  // =============================

  const handleChange = e => {
    const {
      name,
      value
    } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // =============================
  // CATEGORY CHANGE
  // =============================

  const changeCategory = e => {
    const id = e.target.value;

    const selected = categories.find(
      category => category._id === id
    );

    const subs =
      selected?.subCategories || [];

    setSubCategories(subs);

    setFormData(prev => ({
      ...prev,
      category: id,
      subcategory: ""
    }));
  };

  // =============================
  // CHECKBOX
  // =============================

  const toggle = name => {
    setFormData(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // =============================
  // IMAGE
  // =============================

  const handleImageChange = e => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    setImagePreview(
      URL.createObjectURL(file)
    );
  };

  // =============================
  // TAGS
  // =============================

  const handleTagsChange = e => {
    const value = e.target.value;

    setFormData(prev => ({
      ...prev,
      tags: value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean)
    }));
  };

  // =============================
  // SAVE
  // =============================

  const handleSubmit = async e => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Dish name is required");
      return;
    }

    if (!formData.category) {
      alert("Please select a category");
      return;
    }

    if (!formData.price) {
      alert("Price is required");
      return;
    }

    try {
      setLoading(true);

      const form = new FormData();

      form.append(
        "name",
        formData.name.trim()
      );

      form.append(
        "description",
        formData.description || ""
      );

      // IMPORTANT:
      // Backend expects categoryId
      form.append(
        "categoryId",
        formData.category
      );

      // IMPORTANT:
      // Backend expects subCategory
      form.append(
        "subCategory",
        formData.subcategory || ""
      );

      form.append(
        "price",
        formData.price
      );

      form.append(
        "prepTime",
        formData.prepTime || "15"
      );

      form.append(
        "foodType",
        formData.foodType
      );

      form.append(
        "isAvailable",
        String(formData.isAvailable)
      );

      form.append(
        "isRecommended",
        String(formData.isRecommended)
      );

      form.append(
        "isBestseller",
        String(formData.isBestseller)
      );

      form.append(
        "featured",
        String(formData.featured)
      );

      form.append(
        "todaySpecial",
        String(formData.todaySpecial)
      );

      form.append(
        "isPopular",
        String(formData.isPopular)
      );

      form.append(
        "isNewArrival",
        String(formData.isNewArrival)
      );

      form.append(
        "chefChoice",
        String(formData.chefChoice)
      );

      form.append(
        "spiceLevel",
        formData.spiceLevel || ""
      );

      form.append(
        "tags",
        formData.tags.join(",")
      );

      form.append(
        "displayOrder",
        String(formData.displayOrder || 0)
      );

      if (imageFile) {
        form.append(
          "image",
          imageFile
        );
      }

      const token =
        localStorage.getItem("token");

      const config = {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      };

      if (editingDish) {
        await api.put(
          `/menu/dish/${editingDish._id}`,
          form,
          config
        );
      } else {
        await api.post(
          "/menu/dish",
          form,
          config
        );
      }

      alert(
        editingDish
          ? "Dish updated successfully"
          : "Dish added successfully"
      );

      onSaved();

    } catch (err) {
      console.error(
        "DISH SAVE ERROR:",
        err.response?.data || err
      );

      alert(
        err.response?.data?.message ||
        "Dish save failed"
      );

    } finally {
      setLoading(false);
    }
  };

  // =============================
  // CHECKBOX ITEM
  // =============================

  const renderCheckOption = (name, label) => (
    <label
      className="
        flex
        items-center
        gap-2
        cursor-pointer
        text-sm
        text-gray-700
      "
    >
      <input
        type="checkbox"
        checked={formData[name]}
        onChange={() => toggle(name)}
        className="w-4 h-4"
      />

      {label}
    </label>
  );

  // =============================
  // UI
  // =============================

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        bg-black/50
        flex
        items-center
        justify-center
        p-4
      "
    >
      <div
        className="
          bg-white
          rounded-2xl
          shadow-2xl
          w-full
          max-w-3xl
          max-h-[90vh]
          overflow-y-auto
        "
      >

        {/* HEADER */}

        <div
          className="
            sticky
            top-0
            bg-white
            border-b
            px-6
            py-4
            flex
            items-center
            justify-between
            z-10
          "
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingDish
                ? "Edit Dish"
                : "Add Dish"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Add your dish details
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="
              w-9
              h-9
              rounded-lg
              bg-gray-100
              hover:bg-gray-200
              flex
              items-center
              justify-center
            "
          >
            <FiX />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5"
        >

          {/* IMAGE */}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dish Image
            </label>

            <div className="flex items-center gap-4">

              <label
                className="
                  w-28
                  h-28
                  rounded-xl
                  border-2
                  border-dashed
                  border-gray-300
                  flex
                  flex-col
                  items-center
                  justify-center
                  cursor-pointer
                  hover:border-orange-400
                  overflow-hidden
                "
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="
                      w-full
                      h-full
                      object-cover
                    "
                  />
                ) : (
                  <>
                    <FiImage
                      size={24}
                      className="text-gray-400"
                    />

                    <span className="text-xs text-gray-400 mt-1">
                      Upload
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>

              {imageFile && (
                <div className="text-sm text-gray-500">
                  {imageFile.name}
                </div>
              )}

            </div>
          </div>

          {/* NAME */}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Dish Name
            </label>

            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Example: Paneer Tikka"
              required
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-3
                py-3
                outline-none
                focus:border-orange-500
              "
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Describe the dish..."
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-3
                py-3
                outline-none
                focus:border-orange-500
              "
            />
          </div>

          {/* CATEGORY + SUBCATEGORY */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Category
              </label>

              <select
                value={formData.category}
                onChange={changeCategory}
                required
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  outline-none
                  focus:border-orange-500
                  bg-white
                "
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(category => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Subcategory
              </label>

              <select
                name="subcategory"
                value={formData.subcategory}
                onChange={handleChange}
                disabled={
                  subCategories.length === 0
                }
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  outline-none
                  focus:border-orange-500
                  bg-white
                  disabled:bg-gray-100
                  disabled:text-gray-400
                "
              >
                <option value="">
                  {subCategories.length > 0
                    ? "Select Subcategory"
                    : "No subcategories"}
                </option>

                {subCategories.map(sub => (
                  <option
                    key={sub}
                    value={sub}
                  >
                    {sub}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* PRICE + PREP TIME */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Price
              </label>

              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="₹ 250"
                min="0"
                required
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  outline-none
                  focus:border-orange-500
                "
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Preparation Time
              </label>

              <input
                type="number"
                name="prepTime"
                value={formData.prepTime}
                onChange={handleChange}
                placeholder="15 minutes"
                min="1"
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  outline-none
                  focus:border-orange-500
                "
              />
            </div>

          </div>

          {/* FOOD TYPE + SPICE */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Food Type
              </label>

              <select
                name="foodType"
                value={formData.foodType}
                onChange={handleChange}
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  bg-white
                "
              >
                <option value="veg">
                  Vegetarian
                </option>

                <option value="nonveg">
                  Non Vegetarian
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Spice Level
              </label>

              <select
                name="spiceLevel"
                value={formData.spiceLevel}
                onChange={handleChange}
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-lg
                  px-3
                  py-3
                  bg-white
                "
              >
                <option value="">
                  Not specified
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

          </div>

          {/* TAGS */}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tags
            </label>

            <input
              value={formData.tags.join(", ")}
              onChange={handleTagsChange}
              placeholder="Paneer, Tandoori, Indian"
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-3
                py-3
                outline-none
                focus:border-orange-500
              "
            />

            <p className="text-xs text-gray-400 mt-1">
              Separate tags using commas
            </p>
          </div>

          {/* STATUS */}

          <div
            className="
              border
              border-gray-200
              rounded-xl
              p-4
            "
          >
            <h3 className="font-semibold text-gray-800 mb-3">
              Dish Settings
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              {renderCheckOption("isAvailable", "Available")}
              {renderCheckOption("featured", "Featured")}
              {renderCheckOption("todaySpecial", "Today's Special")}
              {renderCheckOption("isRecommended", "Recommended")}
              {renderCheckOption("isBestseller", "Bestseller")}
              {renderCheckOption("isPopular", "Popular")}
              {renderCheckOption("isNewArrival", "New Arrival")}
              {renderCheckOption("chefChoice", "Chef's Choice")}

            </div>
          </div>

          {/* ACTIONS */}

          <div
            className="
              flex
              justify-end
              gap-3
              pt-2
              border-t
              border-gray-100
            "
          >

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="
                border
                border-gray-300
                bg-white
                text-gray-700
                px-5
                py-2.5
                rounded-lg
                font-semibold
                hover:bg-gray-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="
                bg-orange-500
                hover:bg-orange-600
                disabled:opacity-60
                text-white
                px-6
                py-2.5
                rounded-lg
                font-semibold
              "
            >
              {loading
                ? "Saving..."
                : editingDish
                ? "Update Dish"
                : "Save Dish"}
            </button>

          </div>

        </form>

      </div>
    </div>
  );
}