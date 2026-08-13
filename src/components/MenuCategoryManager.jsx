import { useCallback, useEffect, useRef, useState } from "react";
import api from "../api/axios";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp
} from "react-icons/fi";

export default function MenuCategoryManager({
  hotelId,
  onCategoryUpdate
}) {
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState("");
  const [subCategories, setSubCategories] = useState([]);

  const [subCategoryInput, setSubCategoryInput] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [expanded, setExpanded] = useState({});

  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [editingSubName, setEditingSubName] = useState("");
  const onCategoryUpdateRef = useRef(onCategoryUpdate);

  useEffect(() => {
    onCategoryUpdateRef.current = onCategoryUpdate;
  }, [onCategoryUpdate]);

  // =============================
  // FETCH CATEGORIES
  // =============================

  const fetchCategories = useCallback(async ({ signal } = {}) => {
    let res;

    try {
      res = await api.get(
        `/menu/category/${hotelId}`,
        { signal }
      );
    } catch (err) {
      if (signal?.aborted || err.code === "ERR_CANCELED") return;
      console.error(
        "Category fetch error:",
        err.response?.data || err
      );
      return;
    }

    if (signal?.aborted) return;

    const data = res.data || [];
    setCategories(data);
    onCategoryUpdateRef.current?.(data);
  }, [hotelId]);

  useEffect(() => {
    if (!hotelId) {
      setCategories([]);
      return undefined;
    }

    const controller = new AbortController();
    fetchCategories({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchCategories, hotelId]);

  // =============================
  // ADD SUBCATEGORY TO FORM
  // =============================

  const addSubCategory = () => {
    const value = subCategoryInput.trim();

    if (!value) return;

    const exists = subCategories.some(
      sub =>
        sub.toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      alert("Subcategory already added");
      return;
    }

    setSubCategories([
      ...subCategories,
      value
    ]);

    setSubCategoryInput("");
  };

  // =============================
  // REMOVE SUBCATEGORY FROM FORM
  // =============================

  const removeSubCategory = (index) => {
    setSubCategories(
      subCategories.filter(
        (_, i) => i !== index
      )
    );
  };

  // =============================
  // SAVE CATEGORY
  // =============================

  const saveCategory = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      setLoading(true);

      const data = {
        name: name.trim(),
        subCategories
      };

      if (editingId) {
        await api.put(
          `/menu/category/${editingId}`,
          data
        );
      } else {
        await api.post(
          "/menu/category",
          data
        );
      }

      resetForm();

      await fetchCategories();

    } catch (err) {
      console.error(
        "CATEGORY SAVE ERROR:",
        err.response?.data || err
      );

      alert(
        err.response?.data?.message ||
        "Category save failed"
      );

    } finally {
      setLoading(false);
    }
  };

  // =============================
  // EDIT CATEGORY
  // =============================

  const editCategory = (category) => {
    setEditingId(category._id);

    setName(category.name);

    setSubCategories(
      Array.isArray(category.subCategories)
        ? [...category.subCategories]
        : []
    );

    setSubCategoryInput("");

    setShowForm(true);
  };

  // =============================
  // DELETE CATEGORY
  // =============================

  const deleteCategory = async (id) => {
    const ok = window.confirm(
      "Delete this category?\n\nAll its subcategories will also be removed."
    );

    if (!ok) return;

    try {
      await api.delete(
        `/menu/category/${id}`
      );

      await fetchCategories();

    } catch (err) {
      console.error(
        "DELETE CATEGORY ERROR:",
        err.response?.data || err
      );

      alert(
        err.response?.data?.message ||
        "Delete failed"
      );
    }
  };

  // =============================
  // REMOVE SUBCATEGORY
  // =============================

  const removeExistingSubCategory = async (
    category,
    subCategory
  ) => {
    const ok = window.confirm(
      `Remove "${subCategory}" from ${category.name}?`
    );

    if (!ok) return;

    try {
      const updatedSubCategories =
        category.subCategories.filter(
          sub => sub !== subCategory
        );

      await api.put(
        `/menu/category/${category._id}`,
        {
          name: category.name,
          subCategories:
            updatedSubCategories
        }
      );

      await fetchCategories();

    } catch (err) {
      console.error(
        "SUBCATEGORY DELETE ERROR:",
        err.response?.data || err
      );

      alert(
        err.response?.data?.message ||
        "Subcategory removal failed"
      );
    }
  };

  // =============================
  // START EDIT SUBCATEGORY
  // =============================

  const startEditSubCategory = (
    category,
    index
  ) => {
    setEditingSubCategory({
      categoryId: category._id,
      index
    });

    setEditingSubName(
      category.subCategories[index]
    );
  };

  // =============================
  // SAVE SUBCATEGORY EDIT
  // =============================

  const saveSubCategoryEdit = async (
    category
  ) => {
    const value = editingSubName.trim();

    if (!value) {
      alert("Subcategory name is required");
      return;
    }

    const index =
      editingSubCategory.index;

    const updatedSubCategories = [
      ...category.subCategories
    ];

    const duplicate =
      updatedSubCategories.some(
        (sub, i) =>
          i !== index &&
          sub.toLowerCase() ===
            value.toLowerCase()
      );

    if (duplicate) {
      alert("Subcategory already exists");
      return;
    }

    updatedSubCategories[index] = value;

    try {
      await api.put(
        `/menu/category/${category._id}`,
        {
          name: category.name,
          subCategories:
            updatedSubCategories
        }
      );

      setEditingSubCategory(null);
      setEditingSubName("");

      await fetchCategories();

    } catch (err) {
      console.error(
        "SUBCATEGORY UPDATE ERROR:",
        err.response?.data || err
      );

      alert(
        err.response?.data?.message ||
        "Subcategory update failed"
      );
    }
  };

  // =============================
  // RESET
  // =============================

  const resetForm = () => {
    setName("");

    setSubCategories([]);

    setSubCategoryInput("");

    setEditingId(null);

    setShowForm(false);
  };

  // =============================
  // EXPAND / COLLAPSE
  // =============================

  const toggleExpanded = (id) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="mt-8">

      {/* HEADER */}

      <div className="flex items-center justify-between mb-5">

        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Menu Categories
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Organize your menu with categories and subcategories
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="
            bg-orange-500
            hover:bg-orange-600
            text-white
            px-4
            py-2.5
            rounded-lg
            flex
            items-center
            gap-2
            font-semibold
            transition
          "
        >
          <FiPlus />
          Add Category
        </button>

      </div>

      {/* FORM */}

      {showForm && (
        <form
          onSubmit={saveCategory}
          className="
            border
            border-gray-200
            rounded-xl
            p-5
            mb-6
            bg-gray-50
          "
        >

          <div className="flex items-center justify-between mb-4">

            <h3 className="font-semibold text-gray-900">
              {editingId
                ? "Edit Category"
                : "Create Category"}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="
                w-8
                h-8
                rounded-lg
                flex
                items-center
                justify-center
                hover:bg-gray-200
              "
            >
              <FiX />
            </button>

          </div>

          {/* CATEGORY NAME */}

          <label className="block text-sm font-medium text-gray-700">
            Category Name
          </label>

          <input
            value={name}
            onChange={e =>
              setName(e.target.value)
            }
            placeholder="Example: Starters"
            className="
              w-full
              border
              border-gray-300
              rounded-lg
              px-3
              py-3
              mt-1
              mb-5
              outline-none
              focus:border-orange-500
            "
          />

          {/* SUBCATEGORY */}

          <label className="block text-sm font-medium text-gray-700">
            Subcategories
          </label>

          <div className="flex gap-2 mt-1">

            <input
              value={subCategoryInput}
              onChange={e =>
                setSubCategoryInput(
                  e.target.value
                )
              }
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSubCategory();
                }
              }}
              placeholder="Example: Veg Starter"
              className="
                flex-1
                border
                border-gray-300
                rounded-lg
                px-3
                py-3
                outline-none
                focus:border-orange-500
              "
            />

            <button
              type="button"
              onClick={addSubCategory}
              className="
                bg-gray-900
                hover:bg-black
                text-white
                px-4
                rounded-lg
                flex
                items-center
                gap-2
              "
            >
              <FiPlus />
              Add
            </button>

          </div>

          {/* NEW SUBCATEGORIES */}

          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">

              {subCategories.map(
                (sub, index) => (
                  <div
                    key={`${sub}-${index}`}
                    className="
                      flex
                      items-center
                      gap-2
                      bg-orange-50
                      text-orange-700
                      border
                      border-orange-200
                      px-3
                      py-1.5
                      rounded-full
                      text-sm
                    "
                  >

                    <span>{sub}</span>

                    <button
                      type="button"
                      onClick={() =>
                        removeSubCategory(index)
                      }
                      className="
                        hover:text-red-600
                      "
                    >
                      <FiX size={14} />
                    </button>

                  </div>
                )
              )}

            </div>
          )}

          {/* ACTIONS */}

          <div className="flex gap-3 mt-6">

            <button
              type="submit"
              disabled={loading}
              className="
                bg-orange-500
                hover:bg-orange-600
                disabled:opacity-60
                text-white
                px-5
                py-2.5
                rounded-lg
                font-semibold
              "
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Category"
                : "Save Category"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="
                border
                border-gray-300
                px-5
                py-2.5
                rounded-lg
                font-semibold
                bg-white
              "
            >
              Cancel
            </button>

          </div>

        </form>
      )}

      {/* CATEGORY LIST */}

      <div className="space-y-3">

        {categories.length === 0 ? (

          <div
            className="
              border
              border-dashed
              border-gray-300
              rounded-xl
              p-8
              text-center
              text-gray-500
            "
          >
            <p className="font-medium">
              No categories yet
            </p>

            <p className="text-sm mt-1">
              Create your first menu category
            </p>
          </div>

        ) : (

          categories.map(category => {

            const isExpanded =
              expanded[category._id];

            return (
              <div
                key={category._id}
                className="
                  border
                  border-gray-200
                  rounded-xl
                  bg-white
                  overflow-hidden
                "
              >

                {/* CATEGORY ROW */}

                <div
                  className="
                    p-4
                    flex
                    items-center
                    justify-between
                  "
                >

                  <div className="flex items-center gap-3">

                    {category.subCategories?.length > 0 && (
                      <button
                        onClick={() =>
                          toggleExpanded(
                            category._id
                          )
                        }
                        className="
                          w-8
                          h-8
                          rounded-lg
                          bg-gray-100
                          flex
                          items-center
                          justify-center
                          text-gray-600
                        "
                      >
                        {isExpanded ? (
                          <FiChevronUp />
                        ) : (
                          <FiChevronDown />
                        )}
                      </button>
                    )}

                    <div>

                      <div className="flex items-center gap-2">

                        <h3 className="font-semibold text-gray-900">
                          {category.name}
                        </h3>

                        {category.subCategories?.length > 0 && (
                          <span
                            className="
                              text-xs
                              bg-gray-100
                              text-gray-600
                              px-2
                              py-1
                              rounded-full
                            "
                          >
                            {category.subCategories.length}
                            {" "}
                            subcategories
                          </span>
                        )}

                      </div>

                      {!category.subCategories?.length && (
                        <p className="text-xs text-gray-400 mt-1">
                          No subcategories
                        </p>
                      )}

                    </div>

                  </div>

                  <div className="flex items-center gap-2">

                    <button
                      onClick={() =>
                        editCategory(category)
                      }
                      className="
                        w-9
                        h-9
                        rounded-lg
                        bg-blue-50
                        text-blue-600
                        flex
                        items-center
                        justify-center
                        hover:bg-blue-100
                      "
                    >
                      <FiEdit2 size={16} />
                    </button>

                    <button
                      onClick={() =>
                        deleteCategory(
                          category._id
                        )
                      }
                      className="
                        w-9
                        h-9
                        rounded-lg
                        bg-red-50
                        text-red-600
                        flex
                        items-center
                        justify-center
                        hover:bg-red-100
                      "
                    >
                      <FiTrash2 size={16} />
                    </button>

                  </div>

                </div>

                {/* SUBCATEGORY LIST */}

                {isExpanded &&
                  category.subCategories?.length > 0 && (

                    <div
                      className="
                        border-t
                        border-gray-100
                        bg-gray-50
                        px-4
                        py-3
                      "
                    >

                      <div className="space-y-2">

                        {category.subCategories.map(
                          (sub, index) => {

                            const isEditing =
                              editingSubCategory &&
                              editingSubCategory.categoryId ===
                                category._id &&
                              editingSubCategory.index ===
                                index;

                            return (
                              <div
                                key={`${category._id}-${sub}-${index}`}
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  bg-white
                                  border
                                  border-gray-200
                                  rounded-lg
                                  px-3
                                  py-2.5
                                "
                              >

                                {isEditing ? (

                                  <div className="flex-1 flex gap-2">

                                    <input
                                      value={
                                        editingSubName
                                      }
                                      onChange={e =>
                                        setEditingSubName(
                                          e.target.value
                                        )
                                      }
                                      autoFocus
                                      className="
                                        flex-1
                                        border
                                        border-gray-300
                                        rounded-lg
                                        px-3
                                        py-2
                                        outline-none
                                        focus:border-orange-500
                                      "
                                    />

                                    <button
                                      onClick={() =>
                                        saveSubCategoryEdit(
                                          category
                                        )
                                      }
                                      className="
                                        w-9
                                        h-9
                                        rounded-lg
                                        bg-green-50
                                        text-green-600
                                        flex
                                        items-center
                                        justify-center
                                      "
                                    >
                                      <FiCheck />
                                    </button>

                                    <button
                                      onClick={() => {
                                        setEditingSubCategory(
                                          null
                                        );
                                        setEditingSubName(
                                          ""
                                        );
                                      }}
                                      className="
                                        w-9
                                        h-9
                                        rounded-lg
                                        bg-gray-100
                                        text-gray-600
                                        flex
                                        items-center
                                        justify-center
                                      "
                                    >
                                      <FiX />
                                    </button>

                                  </div>

                                ) : (

                                  <>
                                    <div className="flex items-center gap-3">

                                      <span className="text-orange-500">
                                        •
                                      </span>

                                      <span className="text-sm font-medium text-gray-700">
                                        {sub}
                                      </span>

                                    </div>

                                    <div className="flex items-center gap-2">

                                      <button
                                        onClick={() =>
                                          startEditSubCategory(
                                            category,
                                            index
                                          )
                                        }
                                        className="
                                          w-8
                                          h-8
                                          rounded-lg
                                          bg-blue-50
                                          text-blue-600
                                          flex
                                          items-center
                                          justify-center
                                        "
                                      >
                                        <FiEdit2 size={14} />
                                      </button>

                                      <button
                                        onClick={() =>
                                          removeExistingSubCategory(
                                            category,
                                            sub
                                          )
                                        }
                                        className="
                                          w-8
                                          h-8
                                          rounded-lg
                                          bg-red-50
                                          text-red-600
                                          flex
                                          items-center
                                          justify-center
                                        "
                                      >
                                        <FiTrash2 size={14} />
                                      </button>

                                    </div>
                                  </>

                                )}

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>

                  )}

              </div>
            );
          })

        )}

      </div>

    </div>
  );
}
