import { useEffect, useState } from "react";
<<<<<<< HEAD
import {
  useParams,
  useNavigate,
} from "react-router-dom";

=======
import { useParams, useNavigate } from "react-router-dom";
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
import api from "../api/axios";
import { useCart } from "../context/CartContext";
import { getTheme} from "../utils/useHotelTheme";

const theme = getTheme(hotel);
const primaryColor = theme.primary;
const secondaryColor = theme.secondary;
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

  // =========================
  // STATES
  // =========================

  const [dishes, setDishes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

<<<<<<< HEAD
  const [showCart, setShowCart] =
    useState(false);

  const [guestName, setGuestName] =
    useState("");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [tableInfo, setTableInfo] =
  useState(null);
  
  const [hotel, setHotel] =
  useState(null);
  const theme = getHotelTheme(hotel);

  // SCHEDULE ORDER

  const [scheduleEnabled, setScheduleEnabled] =
    useState(false);

  const [scheduledTime, setScheduledTime] =
    useState("");

  // =========================
  // FETCH MENU
  // =========================
=======
  // THEME SAFE
  const themeConfig = THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor || themeConfig.primary || "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor || themeConfig.secondary || "#0F172A";
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51

  useEffect(() => {

    fetchMenu();

  }, []);

  const fetchMenu = async () => {
<<<<<<< HEAD

    try {

      const res = await api.get(
        `/qr/${qrId}`
      );

      setDishes(
        res.data.dishes || []
      );

      setTableInfo(
        res.data.table
      );

      setHotel(
        res.data.hotel
      );

=======
    try {
      const res = await api.get(`/qr/${qrId}`);
      setDishes(res.data.dishes || []);
      setTableInfo(res.data.table);
      setHotel(res.data.hotel);
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

<<<<<<< HEAD
  // =========================
  // THEME COLORS
  // =========================

  // =========================
  // CART HELPERS
  // =========================

  const getItemQty = (id) => {

    const item = cartItems.find(
      (i) => i._id === id
    );

    return item
      ? item.quantity
      : 0;
  };

  // =========================
  // PLACE ORDER
  // =========================

  const placeOrder = async () => {

    try {

      // EMPTY CART

      if (cartItems.length === 0) {

        alert("Cart is empty");

        return;
      }

      // GUEST NAME

      if (!guestName.trim()) {

        alert(
          "Please enter guest name"
        );

        return;
      }

      // SCHEDULE VALIDATION

      if (
        scheduleEnabled &&
        !scheduledTime
      ) {

        alert(
          "Please select schedule time"
        );

        return;
      }

      // PAST TIME VALIDATION

      if (
        scheduleEnabled &&
        new Date(scheduledTime) <
          new Date()
      ) {

        alert(
          "Scheduled time cannot be in past"
        );

        return;
      }
=======
  // CART QTY
  const getItemQty = (id) => {
    const item = cartItems.find((i) => (i._id || i.id) === id);
    return item ? item.quantity : 0;
  };

  // PLACE ORDER
  const placeOrder = async () => {
    try {
      if (!cartItems.length) return alert("Cart is empty");
      if (!guestName.trim()) return alert("Enter guest name");

      if (scheduleEnabled && !scheduledTime)
        return alert("Select schedule time");

      if (
        scheduleEnabled &&
        new Date(scheduledTime) < new Date()
      )
        return alert("Invalid schedule time");
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51

      setPlacingOrder(true);

      // PAYLOAD

      const payload = {

        tableId:
          tableInfo?._id,

        guestName,
<<<<<<< HEAD

        scheduledFor:
          scheduleEnabled
            ? scheduledTime
            : null,

        items: cartItems.map(
          (item) => ({
            menuId: item._id,
            quantity:
              item.quantity,
          })
        ),
=======
        scheduledFor: scheduleEnabled ? scheduledTime : null,
        items: cartItems.map((i) => ({
          menuId: i._id || i.id,
          quantity: i.quantity,
        })),
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
      };

      const res = await api.post(
        "/orders",
        payload
      );

<<<<<<< HEAD
      const orderId =
        res.data.order?._id;

      if (!orderId) {

        alert("Order failed");

        return;
      }

      setShowCart(false);

      clearCart();

      navigate(
        `/track-order/${orderId}`
      );

=======
      clearCart();
      setShowCart(false);

      navigate(`/track-order/${res.data.order._id}`);
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
    } catch (err) {

      console.error(err);

      alert(
        err.response?.data
          ?.message ||
          "Failed to place order"
      );

    } finally {

      setPlacingOrder(false);

    }
  };

<<<<<<< HEAD
  // =========================
  // LOADING
  // =========================

=======
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
  if (loading) {

    return (
<<<<<<< HEAD

      <div className="min-h-screen flex items-center justify-center text-white">

=======
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ background: secondaryColor }}
      >
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
        Loading Menu...

      </div>
    );
  }

  return (

    <div
      className="min-h-screen text-white"
      style={{
        background:
          secondaryColor,
      }}
    >

      {/* HEADER */}

      <div className="sticky top-0 z-50 bg-black/40 backdrop-blur border-b border-white/10">

        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">

<<<<<<< HEAD
=======
          {/* HOTEL INFO */}
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
          <div className="flex items-center gap-3">

           {theme.logo && (
  <img
    src={theme.logo}
    className="w-12 h-12 rounded-full object-cover"
  />
)}

            <div>

              <h1 className="text-2xl font-bold">
<<<<<<< HEAD

                {hotel?.name ||
                  "Hotel"}

=======
                {hotel?.name}
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
              </h1>

              <p className="text-xs text-gray-300">

                {hotel?.tagline}

              </p>

              <p className="text-sm text-gray-300 mt-1">
<<<<<<< HEAD

                {tableInfo?.type ===
                "room"
                  ? `Room: ${tableInfo?.tableNumber}`
                  : `Table: ${tableInfo?.tableNumber}`}

=======
                Table: {tableInfo?.tableNumber}
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
              </p>

            </div>

          </div>

          {/* CART BUTTON */}
          <button
<<<<<<< HEAD
            onClick={() =>
              setShowCart(true)
            }
=======
            onClick={() => {
              console.log("Cart opened");
              setShowCart(true);
            }}
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
            className="px-5 py-2 rounded-full font-semibold"
            style={{
              background:
                primaryColor,
            }}
          >
<<<<<<< HEAD

            Cart

=======
            Cart ({cartItems.length})
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
          </button>

        </div>

      </div>

<<<<<<< HEAD
      {/* HERO */}

      <section className="relative h-[320px] overflow-hidden">

  {theme.coverImage ? (
    <img
      src={theme.coverImage}
      className="w-full h-full object-cover"
    />
  ) : (
    <img
      src="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
      className="w-full h-full object-cover"
    />
  )}

  <div className="absolute inset-0 bg-black/60 flex items-end">
    <div className="p-6">
      <h2 className="text-4xl font-bold">
        {hotel?.name}
      </h2>
      <p className="text-gray-300">
        {hotel?.tagline}
      </p>
    </div>
  </div>

</section>

      {/* CATEGORY */}

      <section className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex gap-4 overflow-x-auto pb-2">

          {[
            "Main Course",
            "Snacks",
            "Desserts",
            "Drinks",
          ].map((cat) => (

            <button
              key={cat}
              className="whitespace-nowrap px-5 py-2 rounded-full transition"
              style={{
                background:
                  "rgba(255,255,255,0.1)",
              }}
            >

              {cat}

            </button>

          ))}

        </div>

      </section>

      {/* MENU */}
=======
      {/* MENU */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {dishes.map((dish) => {
            const qty = getItemQty(dish._id);
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51

      <section className="max-w-7xl mx-auto px-4 pb-32">

        {dishes.length === 0 ? (

          <div className="text-center text-gray-400 text-xl py-20">

            No dishes available

          </div>

        ) : (

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

            {dishes.map((dish) => {

              const qty =
                getItemQty(
                  dish._id
                );

              return (

                <div
                  key={dish._id}
                  className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-lg hover:scale-[1.02] transition duration-300"
                >

                  {/* IMAGE */}

                  <img
                    src={
                      dish.image ||
                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
                    }
                    alt={dish.name}
                    className="h-56 w-full object-cover"
                  />

                  {/* CONTENT */}

                  <div className="p-5">

                    <div className="flex items-center gap-2 mb-3">

                      {/* VEG NON VEG */}

                      <div
                        className={`w-5 h-5 border-2 rounded-sm flex items-center justify-center ${
                          dish.foodType ===
                          "veg"
                            ? "border-green-500"
                            : "border-red-500"
                        }`}
                      >

                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            dish.foodType ===
                            "veg"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                        />

                      </div>

                      <h3 className="text-2xl font-semibold">

                        {dish.name}

                      </h3>

                    </div>

                    <div className="flex justify-between items-start gap-4">

                      <div>

                        <p className="text-gray-400 text-sm">

                          {dish.description}

                        </p>

                      </div>

                      <span
                        className="font-bold text-lg whitespace-nowrap"
                        style={{
                          color:
                            primaryColor,
                        }}
                      >

                        ₹{dish.price}

                      </span>

                    </div>

                    {/* FOOTER */}

                    <div className="mt-5 flex items-center justify-between">

                      <div className="text-sm text-gray-300">

                        ⏱ {dish.prepTime} mins

                      </div>

                      {qty === 0 ? (

                        <button
                          onClick={() =>
                            addToCart(
                              dish
                            )
                          }
                          className="px-5 py-2 rounded-full font-medium transition"
                          style={{
                            background:
                              primaryColor,
                          }}
                        >

                          Add

                        </button>

                      ) : (

                        <div className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-full">

                          <button
                            onClick={() =>
                              decreaseQty(
                                dish._id
                              )
                            }
                            className="text-xl"
                          >

                            -

                          </button>

                          <span className="font-semibold">

                            {qty}

                          </span>

                          <button
                            onClick={() =>
                              increaseQty(
                                dish._id
                              )
                            }
                            className="text-xl"
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

        )}

      </section>

      {/* FLOATING CART */}

      {cartItems.length > 0 && (

        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[95%] max-w-xl rounded-2xl shadow-2xl px-6 py-4 flex justify-between items-center z-50"
          style={{
            background:
              primaryColor,
          }}
        >

          <div>

            <p className="font-bold text-lg">

              {cartItems.length} Items

            </p>

            <p className="text-sm">

              ₹{totalPrice}

            </p>

          </div>

          <button
            onClick={() =>
              setShowCart(true)
            }
            className="bg-black text-white px-5 py-2 rounded-full font-medium"
          >

            View Cart

          </button>

        </div>

      )}

      {/* CART MODAL */}

      {showCart && (

        <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-end">

          <div
            className="w-full max-w-2xl rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
            style={{
              background:
                secondaryColor,
            }}
          >

            {/* HEADER */}

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-3xl font-bold">

                Your Order

              </h2>

              <button
                onClick={() =>
                  setShowCart(false)
                }
                className="text-2xl"
              >

                ✕

              </button>

            </div>

            {/* ITEMS */}

            <div className="space-y-4">

              {cartItems.map(
                (item) => (

                  <div
                    key={item._id}
                    className="flex justify-between items-center bg-white/5 rounded-2xl p-4"
                  >

                    <div>

                      <h3 className="font-semibold text-lg">

                        {item.name}

                      </h3>

                      <p className="text-gray-400 text-sm">

                        ₹{item.price}

                      </p>

                    </div>

                    <div className="flex items-center gap-3">

                      <button
                        onClick={() =>
                          decreaseQty(
                            item._id
                          )
                        }
                        className="bg-white/10 w-8 h-8 rounded-full"
                      >

                        -

                      </button>

                      <span>

                        {item.quantity}

                      </span>

                      <button
                        onClick={() =>
                          increaseQty(
                            item._id
                          )
                        }
                        className="bg-white/10 w-8 h-8 rounded-full"
                      >

                        +

                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

            {/* TOTAL */}

            <div className="mt-8 border-t border-white/10 pt-6">

              <div className="flex justify-between text-xl font-bold">

                <span>Total</span>

                <span>
                  ₹{totalPrice}
                </span>

              </div>

            </div>

            {/* GUEST NAME */}

            <div className="mt-6">

              <label className="block mb-2 text-sm text-gray-300">

                Guest Name

              </label>

              <input
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) =>
                  setGuestName(
                    e.target.value
                  )
                }
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

            </div>

            {/* SCHEDULE ORDER */}

            <div className="mt-6">

              <label className="flex items-center gap-3">

                <input
                  type="checkbox"
                  checked={
                    scheduleEnabled
                  }
                  onChange={(e) =>
                    setScheduleEnabled(
                      e.target.checked
                    )
                  }
                />

<<<<<<< HEAD
                <span>
=======
                <div className="p-5">
                  <h3 className="text-xl font-bold">{dish.name}</h3>
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51

                  Schedule Order

                </span>

              </label>

              {scheduleEnabled && (

                <input
                  type="datetime-local"
                  value={
                    scheduledTime
                  }
                  onChange={(e) =>
                    setScheduledTime(
                      e.target.value
                    )
                  }
                  min={
                    new Date()
                      .toISOString()
                      .slice(0, 16)
                  }
                  className="w-full mt-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
                />

              )}

            </div>

            {/* ROOM */}

            <div
              className="mt-6 rounded-2xl p-4"
              style={{
                background:
                  `${primaryColor}20`,
              }}
            >

              <p className="text-sm text-gray-300">

                Delivering To

              </p>

              <h3 className="text-xl font-bold">

                {tableInfo?.tableNumber}

              </h3>

            </div>

            {/* PLACE ORDER */}

            <button
              onClick={placeOrder}
              disabled={
                placingOrder
              }
              className="w-full mt-8 rounded-2xl py-4 text-lg font-bold transition"
              style={{
                background:
                  primaryColor,
              }}
            >

              {placingOrder
                ? "Placing Order..."
                : "Place Order"}

            </button>

          </div>

<<<<<<< HEAD
        </div>

      )}

=======
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
>>>>>>> 583ff4bf807dee75359f0c72d06987071fcb9e51
    </div>
  );
}
