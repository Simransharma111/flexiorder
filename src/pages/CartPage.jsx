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

import api from "../api/axios";

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
    clearCart,
  } = useCart();

  const [orderType, setOrderType] =
    useState("now");

  const [scheduledFor, setScheduledFor] =
    useState("");

  const [guestName, setGuestName] =
    useState("");

  const [placingOrder, setPlacingOrder] =
    useState(false);

  const [error, setError] =
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

  if (!cartItems || cartItems.length === 0) {
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
  // PLACE ORDER
  // ======================================

  const handlePlaceOrder = async () => {
    try {
      setError("");

      // -------------------------------
      // VALIDATION
      // -------------------------------

      if (!qrId) {
        setError(
          "QR information is missing."
        );
        return;
      }

      if (!cartItems.length) {
        setError(
          "Your cart is empty."
        );
        return;
      }

      if (
        orderType === "schedule" &&
        !scheduledFor
      ) {
        setError(
          "Please select a schedule time."
        );
        return;
      }

      // -------------------------------
      // GET TABLE INFORMATION
      // -------------------------------

      /*
        IMPORTANT:

        Your backend createOrder expects:

        {
          tableId,
          guestName,
          items
        }

        But this CartPage only knows qrId.

        Therefore we first get the QR information.
      */

      const qrResponse =
        await api.get(
          `/qr/menu/${qrId}`
        );

      const table =
        qrResponse.data?.table;

      if (!table?._id) {
        setError(
          "Unable to find table information."
        );
        return;
      }

      // -------------------------------
      // PREPARE ITEMS
      // -------------------------------

      const items = cartItems.map(
        (item) => ({
          menuId: item._id,
          quantity: Number(
            item.quantity
          ),
        })
      );

      // -------------------------------
      // START LOADING
      // -------------------------------

      setPlacingOrder(true);

      // -------------------------------
      // PLACE ORDER
      // -------------------------------

      const response =
        await api.post(
          "/orders",
          {
            tableId: table._id,

            guestName:
              guestName.trim() ||
              "Guest",

            items,

            orderType,

            scheduledFor:
              orderType === "schedule"
                ? scheduledFor
                : null,
          }
        );

      // -------------------------------
      // SUCCESS
      // -------------------------------

      if (
        response.data?.success
      ) {
        const createdOrder =
          response.data.order;

        // Save latest order ID
        // for tracking later.
        if (createdOrder?._id) {
          localStorage.setItem(
            `lastOrder_${qrId}`,
            createdOrder._id
          );
        }

        // Keep order history
        if (createdOrder?._id) {
          const historyKey =
            `orders_${qrId}`;

          const oldOrders =
            JSON.parse(
              localStorage.getItem(
                historyKey
              )
            ) || [];

          const updatedOrders = [
            createdOrder._id,
            ...oldOrders.filter(
              (id) =>
                id !== createdOrder._id
            ),
          ];

          localStorage.setItem(
            historyKey,
            JSON.stringify(
              updatedOrders
            )
          );
        }

        // Clear cart after successful order
        clearCart();

        /*
          Go back to GuestMenu.

          Guest can order more food.

          Later we will add the
          Previous Orders / Track Order
          section at the top of GuestMenu.
        */
        navigate(`/qr/${qrId}`, {
          replace: true,
          state: {
            orderPlaced: true,
            orderId:
              createdOrder?._id,
          },
        });
      } else {
        setError(
          response.data?.message ||
            "Unable to place order."
        );
      }
    } catch (err) {
      console.error(
        "PLACE ORDER ERROR:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Failed to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // ======================================
  // UI
  // ======================================

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* =================================
          HEADER
      ================================= */}

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

      {/* =================================
          CONTENT
      ================================= */}

      <main className="max-w-3xl mx-auto px-4 py-5">

        {/* =================================
            ERROR
        ================================= */}

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* =================================
            GUEST NAME
        ================================= */}

        <section className="bg-white rounded-2xl border p-5">

          <h2 className="font-bold text-lg">
            Guest Details
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Enter your name for the order.
          </p>

          <input
            type="text"
            placeholder="Your name (optional)"
            value={guestName}
            onChange={(e) =>
              setGuestName(
                e.target.value
              )
            }
            className="w-full mt-4 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
          />

        </section>

        {/* =================================
            CART ITEMS
        ================================= */}

        <section className="space-y-3 mt-5">

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
                      item.price || 0
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
                          item.price || 0
                        ) *
                        Number(
                          item.quantity || 0
                        )
                      ).toFixed(2)}
                    </strong>

                  </div>

                </div>

              </div>

            </div>
          ))}

        </section>

        {/* =================================
            ORDER TYPE
        ================================= */}

        <section className="bg-white rounded-2xl border p-5 mt-5">

          <h2 className="font-bold text-lg">
            When would you like your order?
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-4">

            {/* ORDER NOW */}

            <button
              type="button"
              onClick={() =>
                setOrderType("now")
              }
              className={`p-4 rounded-xl border text-left ${
                orderType === "now"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white"
              }`}
            >

              <div className="font-bold">
                Order Now
              </div>

              <div className="text-xs text-gray-500 mt-1">
                Prepare as soon as possible
              </div>

            </button>

            {/* SCHEDULE */}

            <button
              type="button"
              onClick={() =>
                setOrderType("schedule")
              }
              className={`p-4 rounded-xl border text-left ${
                orderType === "schedule"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white"
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

          {/* =================================
              SCHEDULE INPUT
          ================================= */}

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
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />

              <p className="text-xs text-gray-500 mt-2">
                Scheduled orders must be at least
                1 hour in advance.
              </p>

            </div>
          )}

        </section>

        {/* =================================
            TOTAL
        ================================= */}

        <section className="bg-white rounded-2xl border p-5 mt-5">

          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>

            <span>
              ₹
              {Number(
                totalPrice || 0
              ).toFixed(2)}
            </span>
          </div>

          <div className="border-t my-4" />

          <div className="flex justify-between text-lg font-bold">

            <span>
              Total
            </span>

            <span>
              ₹
              {Number(
                totalPrice || 0
              ).toFixed(2)}
            </span>

          </div>

        </section>

      </main>

      {/* =================================
          PLACE ORDER BAR
      ================================= */}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50">

        <div className="max-w-3xl mx-auto">

          <button
            onClick={handlePlaceOrder}
            disabled={placingOrder}
            className={`w-full py-3.5 rounded-xl font-bold text-white ${
              placingOrder
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >

            {placingOrder
              ? "Placing Order..."
              : orderType ===
                "schedule"
              ? "Schedule Order"
              : "Place Order"}

          </button>

        </div>

      </div>

    </div>
  );
}