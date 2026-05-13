import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useCart } from "../context/CartContext";

export default function GuestMenuPage() {
  const { tableId } = useParams();
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

  // FETCH MENU BY TABLE
  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const res = await api.get(`/menu/table/${tableId}`);

      setDishes(res.data.dishes || res.data);
      setTableInfo(res.data.table); // optional if backend sends table
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getItemQty = (id) => {
    const item = cartItems.find((i) => i._id === id);
    return item ? item.quantity : 0;
  };

 const placeOrder = async () => {

  try {

    if (cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (!guestName.trim()) {
      alert("Please enter guest name");
      return;
    }

    setPlacingOrder(true);

    const payload = {

      tableId,

      guestName,

      items: cartItems.map((item) => ({
        menuId: item._id,
        quantity: item.quantity,
      })),
    };

    const res = await api.post(
      "/orders",
      payload
    );

    const orderId = res.data.order?._id;

    if (!orderId) {
      alert("Order failed");
      return;
    }

    setShowCart(false);
    clearCart();
    navigate(`/track-order/${orderId}`);

  } catch (err) {

    console.error(err);

    alert(
      err.response?.data?.message ||
      "Failed to place order"
    );

  } finally {

    setPlacingOrder(false);

  }
};


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading Menu...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">

      {/* HEADER */}
      <div className="sticky top-0 bg-black/40 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">FlexiOrder</h1>

            {/* ✅ FIXED DISPLAY */}
            <p className="text-sm text-gray-300 mt-1">
              Table: {tableInfo?.tableNumber || tableId}
            </p>
          </div>

          <button
            onClick={() => setShowCart(true)}
            className="bg-orange-500 px-5 py-2 rounded-full"
          >
            Cart
          </button>
        </div>
      </div>

      {/* HERO */}

      <section className="relative h-[300px] overflow-hidden">

        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836"
          alt="Food Banner"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60 flex items-center">

          <div className="px-6 max-w-3xl">

            <h2 className="text-4xl md:text-6xl font-bold leading-tight">
              Delicious Food Delivered To Your Room
            </h2>

            <p className="mt-4 text-gray-300 text-lg">
              Order directly from your hotel room
              and track preparation live.
            </p>

          </div>
        </div>

      </section>

      {/* CATEGORY PILLS */}

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
              className="whitespace-nowrap px-5 py-2 rounded-full bg-white/10 hover:bg-orange-500 transition"
            >
              {cat}
            </button>
          ))}

        </div>

      </section>

      {/* MENU */}

      <section className="max-w-7xl mx-auto px-4 pb-32">

        {dishes.length === 0 ? (
          <div className="text-center text-gray-400 text-xl py-20">
            No dishes available
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

            {dishes.map((dish) => {
              const qty = getItemQty(dish._id);

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

                    <div className="flex justify-between items-start gap-4">

                      <div>

                        <h3 className="text-2xl font-semibold">
                          {dish.name}
                        </h3>

                        <p className="text-gray-400 text-sm mt-2">
                          {dish.description}
                        </p>

                      </div>

                      <span className="text-orange-400 font-bold text-lg whitespace-nowrap">
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
                          onClick={() => addToCart(dish)}
                          className="bg-orange-500 hover:bg-orange-600 px-5 py-2 rounded-full font-medium transition"
                        >
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-full">

                          <button
                            onClick={() =>
                              decreaseQty(dish._id)
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
                              increaseQty(dish._id)
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[95%] max-w-xl bg-orange-500 rounded-2xl shadow-2xl px-6 py-4 flex justify-between items-center z-50">

          <div>

            <p className="font-bold text-lg">
              {cartItems.length} Items
            </p>

            <p className="text-sm">
              ₹{totalPrice}
            </p>

          </div>

          <button
            onClick={() => setShowCart(true)}
            className="bg-black text-white px-5 py-2 rounded-full font-medium"
          >
            View Cart
          </button>

        </div>
      )}

      {/* CHECKOUT MODAL */}

      {showCart && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex justify-center items-end">

          <div className="w-full max-w-2xl bg-[#111827] rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto">

            {/* HEADER */}

            <div className="flex justify-between items-center mb-6">

              <h2 className="text-3xl font-bold">
                Your Order
              </h2>

              <button
                onClick={() => setShowCart(false)}
                className="text-2xl"
              >
                ✕
              </button>

            </div>

            {/* ITEMS */}

            <div className="space-y-4">

              {cartItems.map((item) => (

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

                  {/* QUANTITY */}

                  <div className="flex items-center gap-3">

                    <button
                      onClick={() =>
                        decreaseQty(item._id)
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
                        increaseQty(item._id)
                      }
                      className="bg-white/10 w-8 h-8 rounded-full"
                    >
                      +
                    </button>

                  </div>

                </div>

              ))}

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
                  setGuestName(e.target.value)
                }
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

            </div>

            {/* ROOM */}

            <div className="mt-4 bg-orange-500/20 border border-orange-500/20 rounded-2xl p-4">

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
              disabled={placingOrder}
              className="w-full mt-8 bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-4 text-lg font-bold"
            >
              {placingOrder
                ? "Placing Order..."
                : "Place Order"}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}