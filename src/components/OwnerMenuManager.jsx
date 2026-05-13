import {
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

export default function OwnerMenuManager() {

  // =========================
  // STATES
  // =========================

  const [dishes, setDishes] =
    useState([]);

  const [editingId, setEditingId] =
    useState(null);

  const [formData, setFormData] =
    useState({
      name: "",
      description: "",
      category: "",
      price: "",
      prepTime: "",
    });

  // =========================
  // GET HOTEL ID
  // =========================

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const hotelId = user?.hotelId;

  // =========================
  // FETCH DISHES
  // =========================

  useEffect(() => {

    if (hotelId) {
      fetchDishes();
    }

  }, [hotelId]);

  const fetchDishes = async () => {

    try {

      const res = await api.get(
        `/menu/${hotelId}`
      );

      setDishes(res.data);

    } catch (err) {

      console.log(err);

    }
  };

  // =========================
  // HANDLE CHANGE
  // =========================

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]:
        e.target.value,
    });

  };

  // =========================
  // ADD / UPDATE DISH
  // =========================

  const handleSubmit = async (
    e
  ) => {

    e.preventDefault();

    try {

      const token =
        localStorage.getItem("token");

      const config = {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      };

      // UPDATE

      if (editingId) {

        const res =
          await api.put(
            `/menu/dish/${editingId}`,
            formData,
            config
          );

        setDishes((prev) =>
          prev.map((dish) =>
            dish._id === editingId
              ? res.data
              : dish
          )
        );

        setEditingId(null);

      }

      // CREATE

      else {

        const res =
          await api.post(
            "/menu/dish",
            formData,
            config
          );

        setDishes((prev) => [
          res.data,
          ...prev,
        ]);
      }

      // RESET

      setFormData({
        name: "",
        description: "",
        category: "",
        price: "",
        prepTime: "",
      });

    } catch (err) {

      console.log(err);

    }
  };

  // =========================
  // DELETE DISH
  // =========================

  const deleteDish = async (
    id
  ) => {

    const confirmDelete =
      window.confirm(
        "Delete this dish?"
      );

    if (!confirmDelete) return;

    try {

      const token =
        localStorage.getItem("token");

      await api.delete(
        `/menu/dish/${id}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setDishes((prev) =>
        prev.filter(
          (dish) =>
            dish._id !== id
        )
      );

    } catch (err) {

      console.log(err);

    }
  };

  // =========================
  // EDIT DISH
  // =========================

  const editDish = (dish) => {

    setEditingId(dish._id);

    setFormData({
      name: dish.name,
      description:
        dish.description,
      category: dish.category,
      price: dish.price,
      prepTime:
        dish.prepTime,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (

    <div>

      {/* HEADER */}

      <div className="flex justify-between items-center mb-8">

        <div>

          <h2 className="text-3xl font-bold">
            Menu Manager
          </h2>

          <p className="text-gray-400 mt-2">
            Add, edit and manage dishes
          </p>

        </div>

      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 border border-white/10 rounded-3xl p-6"
      >

        {/* NAME */}

        <input
          type="text"
          name="name"
          placeholder="Dish Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* CATEGORY */}

        <input
          type="text"
          name="category"
          placeholder="Category"
          value={formData.category}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* PRICE */}

        <input
          type="number"
          name="price"
          placeholder="Price"
          value={formData.price}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* PREP TIME */}

        <input
          type="number"
          name="prepTime"
          placeholder="Prep Time"
          value={formData.prepTime}
          onChange={handleChange}
          required
          className="bg-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* DESCRIPTION */}

        <textarea
          name="description"
          placeholder="Description"
          value={
            formData.description
          }
          onChange={handleChange}
          className="bg-white/10 rounded-2xl px-4 py-3 md:col-span-2 outline-none"
        />

        {/* BUTTON */}

        <button
          type="submit"
          className="bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-3 font-bold md:col-span-2"
        >
          {editingId
            ? "Update Dish"
            : "Add Dish"}
        </button>

      </form>

      {/* DISHES */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-10">

        {dishes.length === 0 ? (

          <div className="text-gray-400">
            No dishes found
          </div>

        ) : (

          dishes.map((dish) => (

            <div
              key={dish._id}
              className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
            >

              {/* IMAGE */}

              <img
                src={dish.image}
                alt={dish.name}
                className="h-56 w-full object-cover"
              />

              {/* CONTENT */}

              <div className="p-5">

                <div className="flex justify-between items-start">

                  <div>

                    <h3 className="text-2xl font-bold">
                      {dish.name}
                    </h3>

                    <p className="text-gray-400 mt-2">
                      {dish.description}
                    </p>

                  </div>

                  <span className="text-orange-400 font-bold text-xl">
                    ₹{dish.price}
                  </span>

                </div>

                {/* FOOTER */}

                <div className="flex justify-between items-center mt-6">

                  <div>

                    <p className="text-sm text-gray-400">
                      {dish.category}
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      ⏱ {dish.prepTime} mins
                    </p>

                  </div>

                  <div className="flex gap-3">

                    {/* EDIT */}

                    <button
                      onClick={() =>
                        editDish(
                          dish
                        )
                      }
                      className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-xl"
                    >
                      Edit
                    </button>

                    {/* DELETE */}

                    <button
                      onClick={() =>
                        deleteDish(
                          dish._id
                        )
                      }
                      className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl"
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