import { useEffect, useMemo, useState } from "react";
import {
  FiX,
  FiImage,
  FiStar,
} from "react-icons/fi";
import {
  dishFieldsFromForm,
  readImageForStorage,
} from "../../utils/menuData.js";
import {
  categoryKey,
  categoryName,
} from "../../utils/menuCategories";

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

const AVAILABLE_TAGS = [
  "Spicy",
  "Chef's Choice",
  "Best Seller",
  "Healthy",
  "Jain Friendly",
];

export default function DishForm({
  hotelId,
  categories = [],
  dish = null,
  editingId = null,
  advancedEnabled = false,
  loading = false,
  onSubmit,
  onCancel,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(editingId);

  const categoryOptions = useMemo(() => {
    return categories
      .filter(
        (category) =>
          categoryKey(category) !== "all"
      )
      .map((category) =>
        categoryName(category)
      )
      .filter(Boolean);
  }, [categories]);

  useEffect(() => {
    if (!dish) {
      setFormData({
        ...EMPTY_FORM,
        category:
          categoryOptions.includes("Main Course")
            ? "Main Course"
            : categoryOptions[0] || "Main Course",
      });

      setImageFile(null);
      setImagePreview("");
      setError("");
      return;
    }

    const existingCategory =
      categoryName(dish.category) ||
      "Main Course";

    setFormData({
      name: dish.name || "",
      description: dish.description || "",
      category: existingCategory,

      foodType:
        dish.foodType === "nonveg"
          ? "nonveg"
          : "veg",

      containsEgg:
        dish.containsEgg ?? false,

      price:
        dish.price ?? "",

      discountType:
        dish.discountType || "percentage",

      discountValue:
        dish.discountValue ?? "",

      prepTime:
        dish.prepTime ?? "",

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
        dish.displayOrder ?? 0,
    });

    setImageFile(null);
    setImagePreview(dish.image || "");
    setError("");
  }, [dish, categoryOptions]);

  useEffect(() => {
    return () => {
      if (
        imagePreview &&
        imagePreview.startsWith("blob:")
      ) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
  };

  const handleCheckbox = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleFoodType = (foodType) => {
    setFormData((previous) => ({
      ...previous,
      foodType,
      containsEgg:
        foodType === "nonveg"
          ? false
          : previous.containsEgg,
    }));

    setError("");
  };

  const toggleTag = (tag) => {
    setFormData((previous) => {
      const exists =
        previous.tags.includes(tag);

      return {
        ...previous,
        tags: exists
          ? previous.tags.filter(
              (item) => item !== tag
            )
          : [...previous.tags, tag],
      };
    });
  };

  const handleImageChange = (event) => {
    const file =
      event.target.files?.[0] || null;

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );
      event.target.value = "";
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Image must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    if (
      imagePreview &&
      imagePreview.startsWith("blob:")
    ) {
      URL.revokeObjectURL(imagePreview);
    }

    const preview =
      URL.createObjectURL(file);

    setImageFile(file);
    setImagePreview(preview);
    setError("");
  };

  const validate = () => {
    const name =
      formData.name.trim();

    const category =
      String(
        formData.category || ""
      ).trim();

    const price =
      Number(formData.price);

    const prepTime =
      Number(formData.prepTime);

    if (!hotelId) {
      return "Hotel information is missing. Please refresh the page.";
    }

    if (!name) {
      return "Dish name is required.";
    }

    if (!category) {
      return "Please choose or enter a category.";
    }

    if (
      category.toLowerCase() ===
      "all"
    ) {
      return '“All” is reserved for viewing the complete menu. Please choose another category.';
    }

    if (
      formData.price === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return "Please enter a valid price.";
    }

    if (
      formData.prepTime === "" ||
      !Number.isFinite(prepTime) ||
      prepTime < 0
    ) {
      return "Please enter a valid preparation time.";
    }

    const discountValue =
      Number(formData.discountValue || 0);

    if (
      formData.discountValue !== "" &&
      (!Number.isFinite(discountValue) ||
        discountValue < 0)
    ) {
      return "Please enter a valid discount.";
    }

    if (
      formData.discountType ===
        "percentage" &&
      discountValue > 100
    ) {
      return "Percentage discount cannot be greater than 100%.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError("");

      const cleanFormData = {
        ...formData,
        name: formData.name.trim(),
        description:
          formData.description.trim(),
        category:
          String(formData.category).trim(),
        price: Number(formData.price),
        prepTime: Number(formData.prepTime),
        discountValue:
          formData.discountValue === ""
            ? 0
            : Number(
                formData.discountValue
              ),
        displayOrder:
          Number(formData.displayOrder) ||
          0,
        tags: Array.isArray(
          formData.tags
        )
          ? formData.tags
          : [],
      };

      /*
       * IMPORTANT
       *
       * category is deliberately passed
       * as a NAME.
       *
       * Example:
       * "Main Course"
       *
       * NOT:
       * ObjectId
       *
       * NOT:
       * { _id, name }
       */
      const fields =
        dishFieldsFromForm(
          cleanFormData,
          cleanFormData.category
        );

      /*
       * readImageForStorage is used here
       * rather than inside OwnerMenuManager.
       *
       * This keeps all form/image handling
       * inside DishForm.
       */
      let image = null;

      if (imageFile) {
        image =
          await readImageForStorage(
            imageFile
          );
      }

      await onSubmit({
        formData: cleanFormData,
        imageFile: image,
        fields,
      });
    } catch (err) {
      console.error(
        "DISH FORM SUBMIT ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "The dish could not be saved."
      );
    }
  };

  return (
    <div className="ops-menu-dish-editor bg-white border border-gray-200 rounded-2xl shadow-sm mb-8">

      {/* HEADER */}
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-bold">
            {isEditing
              ? "Edit Dish"
              : "Add New Dish"}
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Add dish information and display settings
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-50"
          aria-label="Close form"
        >
          <FiX />
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="ops-menu-dish-form p-5"
      >

        {/* BASIC DETAILS */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* NAME */}
          <div>
            <label
              htmlFor="dish-name"
              className="block text-sm font-semibold mb-1"
            >
              Dish Name
            </label>

            <input
              id="dish-name"
              name="name"
              type="text"
              placeholder="e.g. Paneer Butter Masala"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              disabled={loading}
              required
            />
          </div>

          {/* PRICE */}
          <div>
            <label
              htmlFor="dish-price"
              className="block text-sm font-semibold mb-1"
            >
              Price
            </label>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₹
              </span>

              <input
                id="dish-price"
                type="number"
                name="price"
                min="0"
                step="0.01"
                placeholder="250"
                value={formData.price}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* DISCOUNT */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Discount
              <span className="text-gray-400 font-normal">
                {" "}
                (optional)
              </span>
            </label>

            <div className="flex gap-2">
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                disabled={loading}
                className="w-28 rounded-lg border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="percentage">
                  %
                </option>

                <option value="fixed">
                  ₹
                </option>
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                name="discountValue"
                placeholder="Amount"
                value={
                  formData.discountValue
                }
                onChange={handleChange}
                disabled={loading}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* CATEGORY */}
          <div>
            <label
              htmlFor="dish-category"
              className="block text-sm font-semibold mb-1"
            >
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
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              required
            />

            <datalist id="menu-category-options">
              {categoryOptions.map(
                (category) => (
                  <option
                    value={category}
                    key={category}
                  />
                )
              )}
            </datalist>

            <p className="mt-1 text-xs text-gray-500">
              Select an existing category or
              type a new category name.
            </p>
          </div>

          {/* PREP TIME */}
          <div>
            <label
              htmlFor="dish-prep-time"
              className="block text-sm font-semibold mb-1"
            >
              Preparation Time
            </label>

            <div className="relative">
              <input
                id="dish-prep-time"
                type="number"
                min="0"
                name="prepTime"
                placeholder="20"
                value={formData.prepTime}
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 pr-20 outline-none focus:ring-2 focus:ring-orange-400"
                required
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                minutes
              </span>
            </div>
          </div>
        </div>

        {/* FOOD TYPE */}
        <div className="mt-5">
          <label className="block text-sm font-semibold mb-2">
            Food Type
          </label>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                handleFoodType("veg")
              }
              disabled={loading}
              className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition ${
                formData.foodType ===
                "veg"
                  ? "bg-green-50 border-green-500 text-green-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              🟢 Veg
            </button>

            <button
              type="button"
              onClick={() =>
                handleFoodType("nonveg")
              }
              disabled={loading}
              className={`px-5 py-2.5 rounded-lg border text-sm font-semibold transition ${
                formData.foodType ===
                "nonveg"
                  ? "bg-red-50 border-red-500 text-red-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              🔴 Non-Veg
            </button>
          </div>
        </div>

        {/* EGG */}
        {formData.foodType ===
          "veg" && (
          <label className="mt-5 flex items-center gap-3 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              name="containsEgg"
              checked={
                formData.containsEgg
              }
              onChange={handleChange}
              disabled={loading}
              className="h-4 w-4 accent-green-600"
            />

            Contains egg
          </label>
        )}

        {/* DESCRIPTION */}
        <div className="mt-5">
          <label
            htmlFor="dish-description"
            className="block text-sm font-semibold mb-1"
          >
            Description
          </label>

          <textarea
            id="dish-description"
            name="description"
            placeholder="Describe the dish..."
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none resize-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* IMAGE */}
        <div className="mt-5">
          <label className="block text-sm font-semibold mb-2">
            Dish Image
          </label>

          <label
            htmlFor="dish-image"
            className="border-2 border-dashed border-gray-300 rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Dish preview"
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center">
                <FiImage className="text-gray-500" />
              </div>
            )}

            <div>
              <p className="text-sm font-semibold">
                {imagePreview
                  ? "Change image"
                  : "Choose image"}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG or WEBP · Max 5 MB
              </p>
            </div>
          </label>

          <input
            id="dish-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            onChange={handleImageChange}
            disabled={loading}
            className="hidden"
          />

          {imageFile && (
            <p className="text-xs text-green-600 mt-2">
              Selected:{" "}
              {imageFile.name}
            </p>
          )}

          {isEditing &&
            !imageFile &&
            dish?.image && (
              <p className="text-xs text-gray-500 mt-2">
                Existing image will remain
                unchanged.
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
            checked={
              formData.isAvailable
            }
            onChange={(value) =>
              handleCheckbox(
                "isAvailable",
                value
              )
            }
            disabled={loading}
          />
        </div>

        {/* ADVANCED DISPLAY SECTIONS */}
        {advancedEnabled && (
          <div className="mt-6">
            <h3 className="font-bold text-sm mb-3">
              Display Sections
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

              <CheckOption
                label="Featured"
                checked={
                  formData.featured
                }
                onChange={(value) =>
                  handleCheckbox(
                    "featured",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="Today's Special"
                checked={
                  formData.todaySpecial
                }
                onChange={(value) =>
                  handleCheckbox(
                    "todaySpecial",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="Recommended"
                checked={
                  formData.isRecommended
                }
                onChange={(value) =>
                  handleCheckbox(
                    "isRecommended",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="Best Seller"
                checked={
                  formData.isBestseller
                }
                onChange={(value) =>
                  handleCheckbox(
                    "isBestseller",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="Popular"
                checked={
                  formData.isPopular
                }
                onChange={(value) =>
                  handleCheckbox(
                    "isPopular",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="New Arrival"
                checked={
                  formData.isNewArrival
                }
                onChange={(value) =>
                  handleCheckbox(
                    "isNewArrival",
                    value
                  )
                }
                disabled={loading}
              />

              <CheckOption
                label="Chef's Choice"
                checked={
                  formData.chefChoice
                }
                onChange={(value) =>
                  handleCheckbox(
                    "chefChoice",
                    value
                  )
                }
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* TAGS */}
        {advancedEnabled && (
          <div className="mt-6">
            <h3 className="font-bold text-sm mb-3">
              Dish Tags
            </h3>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map(
                (tag) => {
                  const selected =
                    formData.tags.includes(
                      tag
                    );

                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        toggleTag(tag)
                      }
                      disabled={loading}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                        selected
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {selected && (
                        <FiStar
                          className="inline mr-1"
                          size={10}
                        />
                      )}

                      {tag}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* SPICE / ORDER */}
        <div
          className={`grid gap-4 mt-6 ${
            advancedEnabled
              ? "sm:grid-cols-2"
              : ""
          }`}
        >
          {/* SPICE */}
          <div>
            <label
              htmlFor="dish-spice"
              className="block text-sm font-semibold mb-1"
            >
              Spice Level
            </label>

            <select
              id="dish-spice"
              name="spiceLevel"
              value={
                formData.spiceLevel
              }
              onChange={handleChange}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
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

          {/* DISPLAY ORDER */}
          {advancedEnabled && (
            <div>
              <label
                htmlFor="dish-display-order"
                className="block text-sm font-semibold mb-1"
              >
                Menu Priority
                <span className="text-gray-400 font-normal">
                  {" "}
                  (optional)
                </span>
              </label>

              <input
                id="dish-display-order"
                type="number"
                min="0"
                name="displayOrder"
                value={
                  formData.displayOrder
                }
                onChange={handleChange}
                disabled={loading}
                className="w-full border border-gray-200 rounded-lg px-3 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />

              <p className="mt-1 text-xs text-gray-500">
                Positive numbers appear first.
                1 is highest priority. Use 0
                for normal order.
              </p>
            </div>
          )}
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col sm:flex-row gap-3 mt-7">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : isEditing
              ? "Update Dish"
              : "Add Dish"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="sm:w-32 border border-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function CheckOption({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label
      className={`flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "cursor-pointer hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) =>
          onChange(
            event.target.checked
          )
        }
        disabled={disabled}
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