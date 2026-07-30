import {
  FiArrowLeft,
  FiMinus,
  FiPlus,
  FiTrash2,
  FiClock,
} from "react-icons/fi";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";

export default function CartPage() {
  const navigate = useNavigate();

  const { qrId } = useParams();

  const {
    cartItems,
    cartCount,
    totalPrice,
    increaseQty,
    decreaseQty,
    removeFromCart,
    setCartSession,
  } = useCart();

  const [orderType, setOrderType] =
    useState("now");

  const [scheduledFor, setScheduledFor] =
    useState("");

  // ======================================
  // SET CART SESSION
  // ======================================

  useEffect(() => {
    if (qrId) {
      setCartSession(qrId);
    }
  }, [qrId, setCartSession]);

  // ======================================
  // MINIMUM SCHEDULE TIME
  // ======================================

  const getMinDateTime = () => {
    const date = new Date();

    date.setHours(
      date.getHours() + 1
    );

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const hours = String(
      date.getHours()
    ).padStart(2, "0");

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // ======================================
  // EMPTY CART
  // ======================================

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">

        <div className="bg-white rounded-2xl p-8 text-center shadow-sm w-full max-w-md">

          <div className="text-5xl mb-4">
            🛒
          </div>

          <h2 className="text-xl font-bold">
            Your cart is empty
          </h2>

          <p className="text-gray-500 mt-2">
            Add some delicious items first.
          </p>

          <button
            onClick={() =>
              navigate(`/qr/${qrId}`)
            }
            className="mt-6 w-full bg-orange-500 text-white py-3 rounded-xl font-bold"
          >
            Browse Menu
          </button>

        </div>

      </div>
    );
  }

  // ======================================
  // CHECKOUT
  // ======================================

  const handleCheckout = () => {
    if (
      orderType === "schedule" &&
      !scheduledFor
    ) {
      alert(
        "Please select a schedule time."
      );

      return;
    }

    navigate(
      `/checkout/${qrId}`,
      {
        state: {
          orderType,
          scheduledFor:
            orderType === "schedule"
              ? scheduledFor
              : null,
        },
      }
    );
  };

  // ======================================
  // UI
  // ======================================

  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* HEADER */}

      <header className="bg-white border-b sticky top-0 z-40">

        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">

          <button
            onClick={() =>
              navigate(`/qr/${qrId}`)
            }
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <FiArrowLeft />
          </button>

          <div>
            <h1 className="font-bold text-lg">
              Your Cart
            </h1>

            <p className="text-xs text-gray-500">
              {cartCount}{" "}
              {cartCount === 1
                ? "item"
                : "items"}
            </p>
          </div>

        </div>

      </header>

      {/* CONTENT */}

      <main className="max-w-3xl mx-auto px-4 py-5">

        {/* ITEMS */}

        <section className="space-y-3">

          {cartItems.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border p-4"
            >

              <div className="flex gap-3">

                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                )}

                <div className="flex-1">

                  <div className="flex justify-between gap-2">

                    <h3 className="font-bold">
                      {item.name}
                    </h3>

                    <button
                      onClick={() =>
                        removeFromCart(
                          item._id
                        )
                      }
                      className="text-red-500"
                    >
                      <FiTrash2 />
                    </button>

                  </div>

                  <p className="text-orange-600 font-bold mt-1">
                    ₹
                    {Number(
                      item.price
                    ).toFixed(2)}
                  </p>

                  <div className="flex items-center justify-between mt-3">

                    <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-1">

                      <button
                        onClick={() =>
                          decreaseQty(
                            item._id
                          )
                        }
                        className="w-8 h-8 bg-white rounded-md flex items-center justify-center"
                      >
                        <FiMinus />
                      </button>

                      <span className="font-bold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          increaseQty(
                            item._id
                          )
                        }
                        className="w-8 h-8 bg-orange-500 text-white rounded-md flex items-center justify-center"
                      >
                        <FiPlus />
                      </button>

                    </div>

                    <strong>
                      ₹
                      {(
                        Number(
                          item.price
                        ) *
                        item.quantity
                      ).toFixed(2)}
                    </strong>

                  </div>

                </div>

              </div>

            </div>
          ))}

        </section>

        {/* ORDER TYPE */}

        <section className="bg-white rounded-2xl border p-5 mt-5">

          <h2 className="font-bold text-lg">
            When would you like your order?
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-4">

            <button
              onClick={() =>
                setOrderType("now")
              }
              className={`p-4 rounded-xl border text-left ${
                orderType === "now"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200"
              }`}
            >
              <div className="font-bold">
                Order Now
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Prepare as soon as possible
              </div>
            </button>

            <button
              onClick={() =>
                setOrderType("schedule")
              }
              className={`p-4 rounded-xl border text-left ${
                orderType === "schedule"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200"
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                <FiClock />
                Schedule
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Choose a future time
              </div>
            </button>

          </div>

          {/* SCHEDULE INPUT */}

          {orderType === "schedule" && (
            <div className="mt-4">

              <label className="text-sm font-semibold">
                Select date & time
              </label>

              <input
                type="datetime-local"
                min={getMinDateTime()}
                value={scheduledFor}
                onChange={(e) =>
                  setScheduledFor(
                    e.target.value
                  )
                }
                className="w-full mt-2 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />

              <p className="text-xs text-gray-500 mt-2">
                Scheduled orders must be at least
                1 hour in advance.
              </p>

            </div>
          )}

        </section>

        {/* TOTAL */}

        <section className="bg-white rounded-2xl border p-5 mt-5">

          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>
              ₹{totalPrice.toFixed(2)}
            </span>
          </div>

          <div className="border-t my-4" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>

            <span>
              ₹{totalPrice.toFixed(2)}
            </span>
          </div>

        </section>

      </main>

      {/* CHECKOUT BAR */}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3">

        <div className="max-w-3xl mx-auto">

          <button
            onClick={handleCheckout}
            className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold"
          >
            Continue to Order
          </button>

        </div>

      </div>

    </div>
  );
}