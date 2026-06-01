import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useCart } from "../context/CartContext";
import socket from "../socket";

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
    setCartSession,
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

 const [activeOrders, setActiveOrders] = useState([]);
 const [previousOrders, setPreviousOrders] = useState([]);

  // THEME SAFE
  const themeConfig = THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor || themeConfig.primary || "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor || themeConfig.secondary || "#0F172A";

useEffect(() => {
  fetchMenu();

  // RESTORE ACTIVE ORDERS
 const activeOrdersKey = `activeOrders_${qrId}`;
const previousOrdersKey = `previousOrders_${qrId}`;

const savedActiveOrders =
  localStorage.getItem(activeOrdersKey);

const savedPreviousOrders =
  localStorage.getItem(previousOrdersKey);

  if (savedActiveOrders) {
    setActiveOrders(
      JSON.parse(savedActiveOrders)
    );
  }

  if (savedPreviousOrders) {
    setPreviousOrders(
      JSON.parse(savedPreviousOrders)
    );
  }
}, []);
useEffect(() => {

  if(qrId){

    setCartSession(qrId);

  }

}, [qrId]);
useEffect(() => {

  if (!activeOrders.length) return;

  activeOrders.forEach((order) => {

    socket.emit(
      "joinOrderRoom",
      order._id
    );

  });

  const handleOrderUpdate = (
    updatedOrder
  ) => {

    // ORDER COMPLETED
   // ORDER COMPLETED OR CANCELLED
if (
  updatedOrder.status === "delivered" ||
  updatedOrder.status === "cancelled"
) {

      const updatedActiveOrders =
        activeOrders.filter(
          (o) => o._id !== updatedOrder._id
        );

    const updatedPreviousOrders = [
  {
    ...updatedOrder,
    cancelled:
      updatedOrder.status === "cancelled",
  },
  ...previousOrders,
];

      setActiveOrders(
        updatedActiveOrders
      );

      setPreviousOrders(
        updatedPreviousOrders
      );

    localStorage.setItem(
  `activeOrders_${qrId}`,
  JSON.stringify(updatedActiveOrders)
);

    localStorage.setItem(
  `previousOrders_${qrId}`,
  JSON.stringify(updatedPreviousOrders)
);

      return;
    }

    // UPDATE ACTIVE ORDER
    const updatedOrders =
      activeOrders.map((o) =>
        o._id === updatedOrder._id
          ? updatedOrder
          : o
      );

    setActiveOrders(updatedOrders);

   localStorage.setItem(
  `activeOrders_${qrId}`,
      JSON.stringify(updatedOrders)
    );
  };

  socket.on(
    "orderUpdated",
    handleOrderUpdate
  );

  return () => {

    socket.off(
      "orderUpdated",
      handleOrderUpdate
    );

  };

}, [activeOrders, previousOrders]);

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
const newOrder = res.data.order;

const updatedOrders = [
  newOrder,
  ...activeOrders,
];

setActiveOrders(updatedOrders);

localStorage.setItem(
  `activeOrders_${qrId}`,
  JSON.stringify(updatedOrders)
);

clearCart();

setShowCart(false);

setScheduleEnabled(false);

setScheduledTime("");

alert(
  "Order placed successfully. You can continue ordering."
);
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

{/* ACTIVE ORDERS */}

{activeOrders.length > 0 && (

  <section className="max-w-7xl mx-auto px-4 mt-6">

    <div className="flex items-center justify-between mb-4">

      <h2 className="text-2xl font-bold">
        Active Orders
      </h2>

      <span className="text-sm text-gray-400">
        Live Tracking
      </span>

    </div>

    <div className="space-y-4">

      {activeOrders.map((order) => (

        <div
          key={order._id}
          className="bg-white/5 border border-white/10 rounded-3xl p-5"
        >

          <div className="flex justify-between gap-4 flex-wrap">

            <div>

              <p className="text-xs text-gray-400">
                ORDER ID
              </p>

              <h3 className="font-bold break-all">
                {order._id}
              </h3>

              <div className="mt-4 space-y-1">

                {(order.items || []).map(
                  (item, index) => (

                    <p
                      key={index}
                      className="text-sm text-gray-300"
                    >
                      • {item.name} × {item.quantity}
                    </p>

                  )
                )}

              </div>

            </div>

            <div className="text-right">

              <p className="text-xs text-gray-400">
                STATUS
              </p>

              <h3
  className="font-bold capitalize text-lg"
  style={{
    color:
      order.status === "cancelled"
        ? "#EF4444"
        : primaryColor,
  }}
>
  {order.status}
</h3>

{order.status === "cancelled" && (
  <p className="text-red-400 text-sm mt-2">
    Your order was cancelled by staff.
  </p>
)}

            </div>

          </div>

        </div>

      ))}

    </div>

  </section>

)}
{/* =========================
    PREVIOUS ORDERS
========================= */}

{previousOrders.length > 0 && (

  <section className="max-w-7xl mx-auto px-4 mt-8">

    <div className="flex items-center justify-between mb-4">

      <h2 className="text-2xl font-bold">
        Previous Orders
      </h2>

      <span className="text-sm text-gray-400">
        Order History
      </span>

    </div>

    <div className="space-y-4">

      {previousOrders.map((order) => {

        const isCancelled =
          order.status === "cancelled";

        const isDelivered =
          order.status === "delivered";

        return (

          <div
            key={order._id}
            className={`
              rounded-3xl
              p-5
              border
              backdrop-blur
              ${
                isCancelled
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-green-500/10 border-green-500/30"
              }
            `}
          >

            {/* TOP */}

            <div className="flex justify-between gap-4 flex-wrap">

              <div>

                <p className="text-xs text-gray-400">
                  ORDER ID
                </p>

                <h3 className="font-bold break-all">
                  {order._id}
                </h3>

                <div className="mt-4 space-y-1">

                  {(order.items || []).map(
                    (item, index) => (

                      <p
                        key={index}
                        className="text-sm text-gray-300"
                      >
                        • {item.name} × {item.quantity}
                      </p>

                    )
                  )}

                </div>

              </div>

              {/* STATUS CARD */}

              <div className="text-right">

                <div
                  className={`
                    px-4 py-2 rounded-2xl
                    font-bold text-sm inline-block
                    ${
                      isCancelled
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }
                  `}
                >

                  {isCancelled
                    ? "Order Cancelled"
                    : "Order Delivered"}

                </div>

                <p className="text-xs text-gray-400 mt-3">
                  {new Date(
                    order.updatedAt || order.createdAt
                  ).toLocaleString()}
                </p>

              </div>

            </div>

            {/* MESSAGE */}

            <div
              className={`
                mt-5
                rounded-2xl
                p-4
                border
                ${
                  isCancelled
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-green-500/10 border-green-500/20"
                }
              `}
            >

              {isCancelled ? (

                <div>

                  <h3 className="font-bold text-red-400 text-lg">
                    ⚠ Order Cancelled
                  </h3>

                  <p className="text-red-200 text-sm mt-1">
                    Unfortunately, your order was cancelled by the restaurant staff.
                  </p>

                  <p className="text-gray-300 text-sm mt-3">
                    If payment was made, please contact staff for assistance.
                  </p>

                </div>

              ) : (

                <div>

                  <h3 className="font-bold text-green-400 text-lg">
                    ✅ Order Delivered
                  </h3>

                  <p className="text-green-200 text-sm mt-1">
                    Your order was successfully delivered.
                  </p>

                  <p className="text-gray-300 text-sm mt-3">
                    Thank you for ordering with us.
                  </p>

                </div>

              )}

            </div>

          </div>

        );

      })}

    </div>

  </section>

)}

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

  {/* TITLE + VEG/NONVEG */}
  <div className="flex items-start justify-between gap-3">

    <div className="flex-1">

      <div className="flex items-center gap-2 flex-wrap">

        <h3 className="text-xl font-bold">
          {dish.name}
        </h3>

        {/* VEG/NONVEG */}
        <span
          className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center ${
            dish.foodType === "veg"
              ? "border-green-500"
              : "border-red-500"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              dish.foodType === "veg"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          ></span>
        </span>

      </div>

      {/* DESCRIPTION */}
      <p className="text-gray-400 text-sm mt-2 line-clamp-2">
        {dish.description}
      </p>

    </div>

  </div>

  {/* BADGES */}
  <div className="flex gap-2 flex-wrap mt-4">

    {dish.isBestseller && (
      <span className="bg-yellow-500/20 text-yellow-300 text-xs px-3 py-1 rounded-full border border-yellow-500/30">
        Bestseller
      </span>
    )}

    {dish.isRecommended && (
      <span className="bg-green-500/20 text-green-300 text-xs px-3 py-1 rounded-full border border-green-500/30">
        Chef Recommended
      </span>
    )}

    {!dish.isAvailable && (
      <span className="bg-red-500/20 text-red-300 text-xs px-3 py-1 rounded-full border border-red-500/30">
        Currently Unavailable
      </span>
    )}

  </div>

  {/* PREP TIME */}
  <p className="text-xs text-gray-400 mt-3">
    Prep Time: {dish.prepTime || 15} mins
  </p>

  {/* PRICE + ACTION */}
  <div className="flex justify-between items-center mt-5">

    <span
      className="text-2xl font-bold"
      style={{ color: primaryColor }}
    >
      ₹{dish.price}
    </span>

    {!dish.isAvailable ? (

      <button
        disabled
        className="px-4 py-2 rounded-full bg-gray-500 cursor-not-allowed"
      >
        Unavailable
      </button>

    ) : qty === 0 ? (

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
        className="px-5 py-2 rounded-full font-semibold"
      >
        Add
      </button>

    ) : (

      <div className="flex gap-3 items-center bg-white/10 px-3 py-2 rounded-full">

        <button
          onClick={() => decreaseQty(dish._id)}
          className="text-lg"
        >
          −
        </button>

        <span className="font-bold">
          {qty}
        </span>

        <button
          onClick={() => increaseQty(dish._id)}
          className="text-lg"
        >
          +
        </button>

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