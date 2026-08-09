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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
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
  // CATEGORIES
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
  // DISHES
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
  // AFTER SAVE
  // ============================

  const handleSaved = () => {
    loadDishes();
    setEditingDish(null);
    setShowForm(false);
  };

  return (
    <>
      <button
        onClick={() => {
          setEditingDish(null);
          setShowForm(true);
        }}
        className="bg-orange-500 text-white px-5 py-3 rounded-xl font-semibold"
      >
        + Add Dish
      </button>

      {hotelId && (
        <MenuCategoryManager
          hotelId={hotelId}
          onCategoryUpdate={setCategories}
        />
      )}

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

      <DishList
        dishes={dishes}
        onEdit={(dish) => {
          setEditingDish(dish);
          setShowForm(true);
        }}
        onDelete={loadDishes}
      />
    </>
  );
}