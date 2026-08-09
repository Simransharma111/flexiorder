import { useEffect, useState } from "react";
import api from "../api/axios";

import MenuCategoryManager from "./MenuCategoryManager";
import DishForm from "../components/menu/DishForm";
import DishList from "../components/menu/DishList";

export default function OwnerMenuManager() {
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingDish, setEditingDish] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [hotelId, setHotelId] = useState(null);

  // ============================
  // LOAD HOTEL
  // ============================

  useEffect(() => {
    loadHotel();
  }, []);

  const loadHotel = async () => {
    try {
      const res = await api.get("/hotel/me");

      const hotel = res.data?.hotel || res.data;
      const id = hotel?._id;

      if (!id) {
        console.error("Hotel ID not found:", res.data);
        return;
      }

      setHotelId(id);
    } catch (err) {
      console.error(
        "Hotel loading error:",
        err.response?.data || err
      );
    }
  };

  // ============================
  // LOAD DATA
  // ============================

  useEffect(() => {
    if (!hotelId) return;

    loadCategories();
    loadDishes();
  }, [hotelId]);

  // ============================
  // LOAD CATEGORIES
  // ============================

  const loadCategories = async () => {
    try {
      const res = await api.get(
        `/menu/category/${hotelId}`
      );

      setCategories(res.data || []);
    } catch (err) {
      console.error(
        "Category loading error:",
        err.response?.data || err
      );
    }
  };

  // ============================
  // LOAD DISHES
  // ============================

  const loadDishes = async () => {
    try {
      const res = await api.get(
        `/menu/${hotelId}`
      );

      setDishes(res.data || []);
    } catch (err) {
      console.error(
        "Dish loading error:",
        err.response?.data || err
      );
    }
  };

  // ============================
  // DELETE DISH
  // ============================

  const handleDelete = async (dishId) => {
    if (!dishId) {
      console.error("Dish ID missing");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this dish?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/menu/dish/${dishId}`
      );

      // Remove immediately from UI
      setDishes((prev) =>
        prev.filter(
          (dish) => dish._id !== dishId
        )
      );

      alert("Dish deleted successfully");
    } catch (err) {
      console.error(
        "DELETE DISH ERROR:",
        err.response?.data || err
      );

      alert(
        err?.response?.data?.message ||
        "Failed to delete dish"
      );
    }
  };

  // ============================
  // AFTER SAVE
  // ============================

  const handleSaved = async () => {
    await loadDishes();

    setEditingDish(null);
    setShowForm(false);
  };

  // ============================
  // RENDER
  // ============================

  return (
    <div className="space-y-6">

      {/* ADD DISH */}

      <button
        onClick={() => {
          setEditingDish(null);
          setShowForm(true);
        }}
        className="bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold"
      >
        + Add Dish
      </button>

      {/* CATEGORY MANAGER */}

      {hotelId && (
        <MenuCategoryManager
          hotelId={hotelId}
          onCategoryUpdate={setCategories}
        />
      )}

      {/* DISH FORM */}

      {showForm && hotelId && (
        <DishForm
          hotelId={hotelId}
          categories={categories}
          editingDish={editingDish}
          onSaved={handleSaved}
          onCancel={() => {
            setShowForm(false);
            setEditingDish(null);
          }}
        />
      )}

      {/* DISH LIST */}

      <DishList
        dishes={dishes}

        onEdit={(dish) => {
          setEditingDish(dish);
          setShowForm(true);
        }}

        onDelete={handleDelete}
      />

    </div>
  );
}
