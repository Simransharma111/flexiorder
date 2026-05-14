import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../api/axios";
import { useCart } from "../context/CartContext";

const THEME_MAP = {
  stormy_morning: { primary: "#64748B", secondary: "#0F172A" },
  mossy_hollow: { primary: "#4D7C0F", secondary: "#1A2E05" },
  blue_eclipse: { primary: "#1E293B", secondary: "#020617" },
  lush_forest: { primary: "#14532D", secondary: "#052E16" },
  green_juice: { primary: "#16A34A", secondary: "#052E16" },
  chili_spice: { primary: "#DC2626", secondary: "#1F0A0A" },
  chocolate_truffle: { primary: "#7C2D12", secondary: "#1C0A00" },
  ink_wash: { primary: "#111827", secondary: "#F8FAFC" },
};

export default function GuestMenuPage() {
  const { qrId } = useParams();
  const navigate = useNavigate();

  const {
    cartItems,
    totalPrice,
    addToCart,
    increaseQty,
    decreaseQty,
    clearCart,
  } = useCart();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const [tableInfo, setTableInfo] = useState(null);
  const [hotel, setHotel] = useState(null);

  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  /* ================= THEME (FIXED) ================= */
  const themeConfig =
    THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor ||
    themeConfig.primary ||
    "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor ||
    themeConfig.secondary ||
    "#0F172A";

  /* ================= FETCH MENU ================= */
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await api.get(`/qr/${qrId}`);

      setDishes(res.data.dishes || []);
      setTableInfo(res.data.table);
      setHotel(res.data.hotel);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= CART ================= */
  const getItemQty = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

  /* ================= ORDER ================= */
  const placeOrder = async () => {
    try {
      if (!cartItems.length) return alert("Cart is empty");
      if (!guestName.trim()) return alert("Enter guest name");

      if (scheduleEnabled && !scheduledTime)
        return alert("Select time");

      if (
        scheduleEnabled &&
        new Date(scheduledTime) < new Date()
      )
        return alert("Invalid time");

      setPlacingOrder(true);

      const payload = {
        tableId: tableInfo?._id,
        guestName,
        scheduledFor: scheduleEnabled ? scheduledTime : null,
        items: cartItems.map((i) => ({
          menuId: i._id,
          quantity: i.quantity,
        })),
      };

      const res = await api.post("/orders", payload);

      const orderId = res.data.order?._id;

      clearCart();
      setShowCart(false);

      navigate(`/track-order/${orderId}`);
    } catch (err) {
      alert(err?.response?.data?.message || "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white"
        style={{ background: secondaryColor }}>
        Loading Menu...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: secondaryColor }}
    >
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}

            <div>
              <h1 className="text-2xl font-bold">
                {hotel?.name || "Hotel"}
              </h1>
              <p className="text-xs text-gray-300">
                {hotel?.tagline}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                {tableInfo?.type === "room"
                  ? `Room: ${tableInfo?.tableNumber}`
                  : `Table: ${tableInfo?.tableNumber}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="px-5 py-2 rounded-full font-semibold"
            style={{ background: primaryColor }}
          >
            Cart
          </button>
        </div>
      </div>

      {/* HERO */}
      <section className="relative h-[320px] overflow-hidden">
        <img
          src={hotel?.coverImage || "https://images.unsplash.com/photo-1504674900247-0877df9cc836"}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60 flex items-end">
          <div className="p-6">
            <h2 className="text-4xl font-bold">{hotel?.name}</h2>
            <p className="text-gray-300">{hotel?.tagline}</p>
          </div>
        </div>
      </section>

      {/* MENU (UNCHANGED UI) */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {dishes.map((dish) => {
            const qty = getItemQty(dish._id);

            return (
              <div
                key={dish._id}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden"
              >
                <img
                  src={dish.image}
                  className="h-56 w-full object-cover"
                />

                <div className="p-5">
                  <h3 className="text-xl font-bold">{dish.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {dish.description}
                  </p>

                  <div className="flex justify-between mt-4">
                    <span style={{ color: primaryColor }}>
                      ₹{dish.price}
                    </span>

                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(dish)}
                        style={{ background: primaryColor }}
                        className="px-4 py-1 rounded-full"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <button onClick={() => decreaseQty(dish._id)}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => increaseQty(dish._id)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}