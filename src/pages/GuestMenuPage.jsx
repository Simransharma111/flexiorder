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

  // THEME SAFE
  const themeConfig = THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor || themeConfig.primary || "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor || themeConfig.secondary || "#0F172A";

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

  // CART QTY
  const getItemQty = (id) => {
    const item = cartItems.find((i) => (i._id || i.id) === id);
    return item ? item.quantity : 0;
  };

  // MINIMUM 1 HOUR SCHEDULE
const getMinScheduleTime = () => {
  const now = new Date();

  // ADD 1 HOUR
  now.setHours(now.getHours() + 1);

  // REMOVE SECONDS
  now.setSeconds(0);
  now.setMilliseconds(0);

  // FORMAT FOR datetime-local
  return now.toISOString().slice(0, 16);
};
  // PLACE ORDER
  const placeOrder = async () => {
    try {
      if (!cartItems.length) return alert("Cart is empty");
      if (!guestName.trim()) return alert("Enter guest name");

      if (scheduleEnabled && !scheduledTime)
        return alert("Select schedule time");

      if (scheduleEnabled) {
  const selectedTime = new Date(scheduledTime);
  const minimumTime = new Date();

  // MUST BE AT LEAST 1 HOUR LATER
  minimumTime.setHours(minimumTime.getHours() + 1);

  if (selectedTime < minimumTime) {
    return alert(
      "Scheduled order must be at least 1 hour from now"
    );
  }
}

      setPlacingOrder(true);

      const payload = {
        tableId: tableInfo?._id,
        guestName,
        scheduledFor: scheduleEnabled ? scheduledTime : null,
        items: cartItems.map((i) => ({
          menuId: i._id || i.id,
          quantity: i.quantity,
        })),
      };

      const res = await api.post("/orders", payload);

      clearCart();
      setShowCart(false);

      navigate(`/track-order/${res.data.order._id}`);
    } catch (err) {
      alert(err?.response?.data?.message || "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ background: secondaryColor }}
      >
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

          {/* HOTEL INFO */}
          <div className="flex items-center gap-3">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}

            <div>
              <h1 className="text-2xl font-bold">
                {hotel?.name}
              </h1>
              <p className="text-xs text-gray-300">
                {hotel?.tagline}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                Table: {tableInfo?.tableNumber}
              </p>
            </div>
          </div>

          {/* CART BUTTON */}
          <button
            onClick={() => {
              console.log("Cart opened");
              setShowCart(true);
            }}
            className="px-5 py-2 rounded-full font-semibold"
            style={{ background: primaryColor }}
          >
            Cart ({cartItems.length})
          </button>
        </div>
      </div>

      {/* MENU */}
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

                  <div className="flex justify-between mt-4">
                    <span style={{ color: primaryColor }}>
                      ₹{dish.price}
                    </span>

                    {qty === 0 ? (
                      <button
                        onClick={() =>
                          addToCart({
                            _id: dish._id,
                            name: dish.name,
                            price: dish.price,
                            image: dish.image,
                          })
                        }
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

      {/* CART MODAL */}
      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-end">
          <div
            className="w-full max-w-2xl rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: secondaryColor }}
          >

            {/* CLOSE */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Cart</h2>
              <button onClick={() => setShowCart(false)}>✕</button>
            </div>

            {/* ITEMS */}
            {cartItems.map((item) => (
              <div
                key={item._id}
                className="flex justify-between items-center bg-white/5 p-4 rounded-2xl mb-3"
              >
                <div>
                  <h3>{item.name}</h3>
                  <p>₹{item.price}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => decreaseQty(item._id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => increaseQty(item._id)}>+</button>
                </div>
              </div>
            ))}

            {/* GUEST NAME */}
            <input
              className="w-full mt-4 p-3 rounded-xl text-black"
              placeholder="Enter name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />

            {/* SCHEDULE */}
            <label className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              Schedule Order
            </label>

            {scheduleEnabled && (
             <input
  type="datetime-local"
  className="w-full mt-3 p-3 rounded-xl text-black"
  value={scheduledTime}
  min={getMinScheduleTime()}
  onChange={(e) => setScheduledTime(e.target.value)}
/>
            )}

            {/* TOTAL */}
            <div className="mt-4 text-lg font-bold">
              Total: ₹{totalPrice}
            </div>

            {/* ORDER */}
            <button
              onClick={placeOrder}
              disabled={placingOrder}
              className="w-full mt-4 py-3 rounded-xl font-bold"
              style={{ background: primaryColor }}
            >
              {placingOrder ? "Placing..." : "Place Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}