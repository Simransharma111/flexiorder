import { useEffect, useState } from "react";
import api from "../api/axios";

export default function OwnerMenuManager() {
  const [dishes, setDishes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
const [formData, setFormData] = useState({
  name: "",
  description: "",
  category: "Main Course",
  foodType: "veg",
  price: "",
  prepTime: "",
  isAvailable: true,
  isRecommended: false,
  isBestseller: false,
});

  const [imageFile, setImageFile] = useState(null);
const user =
  JSON.parse(localStorage.getItem("user"));

const hotelId =
  typeof user?.hotelId === "object"
    ? user?.hotelId?._id
    : user?.hotelId;

  // ================= FETCH DISHES =================
  useEffect(() => {
    if (hotelId) fetchDishes();
  }, [hotelId]);

  const fetchDishes = async () => {
    try {
      const res = await api.get(`/menu/${hotelId}`);
      setDishes(res.data); // FIXED
    } catch (err) {
      console.log(err);
    }
  };

  // ================= HANDLE INPUT =================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ================= SUBMIT (ADD / UPDATE) =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const form = new FormData();

      // ✅ IMPORTANT: explicit fields
      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("foodType", formData.foodType);
      form.append("price", formData.price);
      form.append("prepTime", formData.prepTime);
      form.append("isAvailable", formData.isAvailable);
      form.append("isRecommended", formData.isRecommended);
      form.append("isBestseller", formData.isBestseller); 

      // ✅ image upload
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

      // ================= UPDATE =================
      if (editingId) {
        res = await api.put(`/menu/dish/${editingId}`, form, config);

        setDishes((prev) =>
          prev.map((d) => (d._id === editingId ? res.data : d))
        );

        setEditingId(null);
      }

      // ================= CREATE =================
      else {
        res = await api.post("/menu/dish", form, config);

        setDishes((prev) => [res.data, ...prev]);
      }

      // ================= RESET =================
      setFormData({
        name: "",
        description: "",
        category: "Main Course",
        foodType: "veg",
        price: "",
        prepTime: "",
        isAvailable: true,
        isRecommended: false,
        isBestseller: false,  
      });

      setImageFile(null);
      e.target.reset(); // FIX UI FILE RESET
    } catch (err) {
      console.log(err);
      alert(err?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  // ================= DELETE =================
  const deleteDish = async (id) => {
    try {
      const token = localStorage.getItem("token");

      await api.delete(`/menu/dish/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDishes((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  // ================= EDIT =================
  const editDish = (dish) => {
    setEditingId(dish._id);

    setFormData({
      name: dish.name,
      description: dish.description,
      category: dish.category,
      foodType: dish.foodType,
      price: dish.price,
      prepTime: dish.prepTime,
      isAvailable: dish.isAvailable,
      isRecommended: dish.isRecommended,
      isBestseller: dish.isBestseller,  
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div>
      {/* ================= FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="grid md:grid-cols-2 gap-4 bg-white/5 p-6 rounded-3xl"
      >
        <input
          name="name"
          placeholder="Dish Name"
          value={formData.name}
          onChange={handleChange}
          className="bg-white/10 p-3 rounded-xl"
          required
        />

        <input
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
          className="bg-white/10 p-3 rounded-xl"
          required
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className="bg-white/10 p-3 rounded-xl"
        >
          <option>Main Course</option>
          <option>Snacks</option>
          <option>Desserts</option>
          <option>Drinks</option>
          <option>Breakfast</option>
        </select>

        <input
          type="number"
          name="prepTime"
          placeholder="Prep Time"
          value={formData.prepTime}
          onChange={handleChange}
          className="bg-white/10 p-3 rounded-xl"
        />

        {/* FOOD TYPE */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              setFormData((p) => ({ ...p, foodType: "veg" }))
            }
            className={`px-4 py-2 rounded-xl ${
              formData.foodType === "veg"
                ? "bg-green-600"
                : "bg-white/10"
            }`}
          >
            Veg
          </button>

          <button
            type="button"
            onClick={() =>
              setFormData((p) => ({ ...p, foodType: "nonveg" }))
            }
            className={`px-4 py-2 rounded-xl ${
              formData.foodType === "nonveg"
                ? "bg-red-600"
                : "bg-white/10"
            }`}
          >
            Non-Veg
          </button>
        </div>
        {/* FLAGS */}

<div className="md:col-span-2 flex flex-wrap gap-4">

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.isAvailable}
      onChange={(e) =>
        setFormData((p) => ({
          ...p,
          isAvailable: e.target.checked,
        }))
      }
    />

    Available
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.isRecommended}
      onChange={(e) =>
        setFormData((p) => ({
          ...p,
          isRecommended: e.target.checked,
        }))
      }
    />

    Recommended
  </label>

  <label className="flex items-center gap-2">
    <input
      type="checkbox"
      checked={formData.isBestseller}
      onChange={(e) =>
        setFormData((p) => ({
          ...p,
          isBestseller: e.target.checked,
        }))
      }
    />

    Bestseller
  </label>

</div>

        {/* IMAGE */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
          className="bg-white/10 p-2 rounded-xl"
        />

        {/* DESCRIPTION */}
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleChange}
          className="md:col-span-2 bg-white/10 p-3 rounded-xl"
        />

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 bg-orange-500 py-3 rounded-xl font-bold"
        >
          {editingId ? "Update Dish" : "Add Dish"}
        </button>
      </form>

      {/* ================= LIST ================= */}
      <div className="grid md:grid-cols-3 gap-6 mt-10">
        {dishes.length === 0 ? (
          <p className="text-gray-400">No dishes found</p>
        ) : (
          dishes.map((dish) => (
            <div
              key={dish._id}
              className="bg-white/5 rounded-2xl overflow-hidden"
            >
              <img
                src={dish.image}
                className="h-52 w-full object-cover"
              />

              <div className="p-4">
                <h3 className="text-xl font-bold">{dish.name}</h3>
                <p className="text-gray-400">{dish.description}</p>
                <div className="flex gap-2 flex-wrap mt-2">

  {!dish.isAvailable && (
    <span className="bg-red-500 text-xs px-2 py-1 rounded-full">
      Unavailable
    </span>
  )}

  {dish.isRecommended && (
    <span className="bg-blue-500 text-xs px-2 py-1 rounded-full">
      Recommended
    </span>
  )}

  {dish.isBestseller && (
    <span className="bg-yellow-500 text-xs px-2 py-1 rounded-full">
      Bestseller
    </span>
  )}

</div>

                <div className="flex justify-between mt-4">
                  <span>₹{dish.price}</span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => editDish(dish)}
                      className="bg-blue-500 px-3 py-1 rounded"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteDish(dish._id)}
                      className="bg-red-500 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}