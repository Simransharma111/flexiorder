import {
  FiArrowLeft,
  FiMinus,
  FiPlus,
  FiTrash2,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";

import { useNavigate, useParams } from "react-router-dom";
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
    clearCart,
    setCartSession,
  } = useCart();

  const [orderType, setOrderType] = useState("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [guestName, setGuestName] = useState("");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstRate, setGstRate] = useState(0);
  const [unavailableIds, setUnavailableIds] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const applyHotelPricing = (hotel) => {
    const enabled = Boolean(
      hotel?.gstEnabled ?? hotel?.enableGST ?? hotel?.gst?.enabled
    );
    const rate = Number(
      hotel?.gstPercentage ?? hotel?.gstRate ?? hotel?.gst?.percentage ?? 0
    );
    setGstEnabled(enabled && rate > 0);
    setGstRate(rate > 0 ? rate : 0);
  };

  // =========================================================
  // SET CART SESSION
  // =========================================================

  useEffect(() => {
    if (qrId) {
      setCartSession(qrId);
      api.get(`/qr/menu/${qrId}`)
        .then((response) => {
          applyHotelPricing(response.data?.hotel);
          const menu = response.data?.dishes || response.data?.menu || [];
          setUnavailableIds(
            menu
              .filter((dish) => dish.isAvailable === false)
              .map((dish) => dish._id)
          );
        })
        .catch(() => {});
    }
  }, [qrId, setCartSession]);

  const subtotal = Number(totalPrice || 0);
  const originalSubtotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.originalPrice ?? item.price ?? 0) * Number(item.quantity || 0),
    0
  );
  const discountTotal = Math.max(0, originalSubtotal - subtotal);
  const gstAmount = gstEnabled ? subtotal * gstRate / 100 : 0;
  const finalTotal = subtotal + gstAmount;
  const hasUnavailableItems = cartItems.some((item) =>
    unavailableIds.includes(item._id)
  );

  // =========================================================
  // MINIMUM SCHEDULE TIME
  // =========================================================

  const getMinDateTime = () => {
    const date = new Date();

    date.setHours(date.getHours() + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // =========================================================
  // EMPTY CART
  // =========================================================

  if (cartItems.length === 0 && !successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm w-full max-w-md">

          <div className="text-5xl mb-4">🛒</div>

          <h2 className="text-xl font-bold text-gray-900">
            Your cart is empty
          </h2>

          <p className="text-gray-500 mt-2">
            Add some delicious items first.
          </p>

          <button
            onClick={() => navigate(`/qr/${qrId}`)}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold"
          >
            Browse Menu
          </button>

        </div>
      </div>
    );
  }

  // =========================================================
  // PLACE ORDER
  // =========================================================

  const handlePlaceOrder = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!cartItems.length) {
      setErrorMessage("Your cart is empty.");
      return;
    }

    if (!qrId) {
      setErrorMessage("QR information is missing.");
      return;
    }

    if (hasUnavailableItems) {
      setErrorMessage("Remove unavailable dishes before placing the order.");
      return;
    }

    if (orderType === "schedule" && !scheduledFor) {
      setErrorMessage("Please select a schedule time.");
      return;
    }

    if (orderType === "schedule" && scheduledFor) {
      const selectedTime = new Date(scheduledFor).getTime();

      const minimumTime =
        Date.now() + 60 * 60 * 1000;

      if (selectedTime < minimumTime) {
        setErrorMessage(
          "Scheduled orders must be at least 1 hour in advance."
        );
        return;
      }
    }

    try {
      setPlacingOrder(true);

      // =====================================================
      // GET TABLE INFORMATION
      // =====================================================

      let tableId = null;

      try {
        const menuResponse = await api.get(
          `/qr/menu/${qrId}`
        );

        applyHotelPricing(menuResponse.data?.hotel);

        tableId =
          menuResponse.data?.table?._id ||
          menuResponse.data?.table?.id ||
          menuResponse.data?.tableId;
      } catch (menuError) {
        console.error(
          "Failed to get table:",
          menuError
        );
      }

      // =====================================================
      // FALLBACK
      // =====================================================

      if (!tableId) {
        tableId = qrId;
      }

      // =====================================================
      // ITEMS
      // =====================================================

      const items = cartItems.map((item) => ({
        menuId: item._id,
        quantity: Number(item.quantity),
      }));

      // =====================================================
      // ORDER DATA
      // =====================================================

      const orderData = {
        tableId,

        guestName:
          guestName.trim() || "Guest",

        guestContact:
          guestContact.trim() || null,

        items,

        subtotal,
        discountAmount: discountTotal,
        gstRate: gstEnabled ? gstRate : 0,
        gstAmount,
        totalAmount: finalTotal,

        orderType,

        scheduledFor:
          orderType === "schedule"
            ? scheduledFor
            : null,
      };

      console.log("📦 ORDER DATA:", orderData);

      // =====================================================
      // CREATE ORDER
      // =====================================================

      const response = await api.post(
        "/orders",
        orderData
      );

      console.log(
        "✅ ORDER RESPONSE:",
        response.data
      );

      // =====================================================
      // SUCCESS
      // =====================================================

      if (
        response.data?.success ||
        response.status === 201
      ) {
        const createdOrder =
          response.data?.order;

        setSuccessMessage(
          orderType === "schedule"
            ? "Scheduled order placed successfully!"
            : "Order placed successfully!"
        );

        // ===================================================
        // SAVE ACTIVE ORDER
        // ===================================================

        if (createdOrder?._id) {
          localStorage.setItem(
            `activeOrder_${qrId}`,
            createdOrder._id
          );

          // Latest order
          localStorage.setItem(
            `latestOrder_${qrId}`,
            JSON.stringify(createdOrder)
          );

          // =================================================
          // PREVIOUS ORDERS
          // =================================================

          const previousOrdersKey =
            `previousOrders_${qrId}`;

          const oldOrders =
            JSON.parse(
              localStorage.getItem(
                previousOrdersKey
              )
            ) || [];

          const updatedOrders = [
            createdOrder,
            ...oldOrders,
          ];

          localStorage.setItem(
            previousOrdersKey,
            JSON.stringify(
              updatedOrders.slice(0, 20)
            )
          );
        }

        // ===================================================
        // CLEAR CART
        // ===================================================

        clearCart();

        // ===================================================
        // RETURN TO MENU
        // ===================================================

        setTimeout(() => {
          navigate(`/qr/${qrId}`, {
            replace: true,
          });
        }, 1800);
      }

    } catch (error) {
      console.error(
        "❌ PLACE ORDER ERROR:",
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to place order. Please try again.";

      setErrorMessage(message);

    } finally {
      setPlacingOrder(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* SUCCESS */}
      {successMessage && (
        <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-5">

          <div className="bg-white rounded-3xl p-7 w-full max-w-sm text-center shadow-2xl">

            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <FiCheckCircle size={34} />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mt-4">
              Order Placed!
            </h2>

            <p className="text-gray-500 text-sm mt-2">
              {successMessage}
            </p>

            <p className="text-xs text-gray-400 mt-4">
              Returning to menu...
            </p>

          </div>
        </div>
      )}

      {/* ERROR */}
      {errorMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-32px)] max-w-md">

          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 shadow-lg flex items-start gap-3">

            <FiAlertCircle
              size={20}
              className="shrink-0 mt-0.5"
            />

            <div className="flex-1">

              <p className="font-bold text-sm">
                Unable to place order
              </p>

              <p className="text-xs mt-1">
                {errorMessage}
              </p>

            </div>

            <button
              onClick={() =>
                setErrorMessage("")
              }
              className="text-red-500 font-bold"
            >
              ×
            </button>

          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-40">

        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">

          <button
            onClick={() =>
              navigate(`/qr/${qrId}`)
            }
            disabled={placingOrder}
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

        {/* CART ITEMS */}
        <section className="space-y-3">

          {cartItems.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-gray-200 p-4"
            >

              <div className="flex gap-3">

                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400 shrink-0">
                    No Image
                  </div>
                )}

                <div className="flex-1 min-w-0">

                  {unavailableIds.includes(item._id) && (
                    <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                      This dish is no longer available. Remove it to continue.
                    </p>
                  )}

                  <div className="flex justify-between gap-2">

                    <h3 className="font-bold text-gray-900 truncate">
                      {item.name}
                    </h3>

                    <button
                      onClick={() =>
                        removeFromCart(item._id)
                      }
                      disabled={placingOrder}
                      className="text-red-500 shrink-0"
                    >
                      <FiTrash2 />
                    </button>

                  </div>

                  <p className="font-bold mt-1">
                    {Number(item.originalPrice || 0) > Number(item.price || 0) && (
                      <span className="mr-2 text-sm text-gray-400 line-through">
                        ₹{Number(item.originalPrice).toFixed(2)}
                      </span>
                    )}
                    <span className={Number(item.originalPrice || 0) > Number(item.price || 0) ? "text-green-600" : "text-orange-600"}>
                      ₹{Number(item.price || 0).toFixed(2)}
                    </span>
                  </p>

                  <div className="flex items-center justify-between mt-3 gap-3">

                    <div className="flex items-center gap-3 bg-orange-50 rounded-lg p-1">

                      <button
                        onClick={() =>
                          decreaseQty(
                            item._id
                          )
                        }
                        disabled={placingOrder}
                        className="w-8 h-8 bg-white rounded-md flex items-center justify-center"
                      >
                        <FiMinus />
                      </button>

                      <span className="font-bold min-w-4 text-center">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          increaseQty(
                            item._id
                          )
                        }
                        disabled={placingOrder}
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

        {/* GUEST */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mt-5">

          <h2 className="font-bold text-lg">
            Guest Information
          </h2>

          <p className="text-xs text-gray-500 mt-1">
            Optional
          </p>

          <input
            type="tel"
            value={guestContact}
            onChange={(e) =>
              setGuestContact(e.target.value)
            }
            placeholder="Contact number (optional)"
            disabled={placingOrder}
            className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
          />

          <input
            type="text"
            value={guestName}
            onChange={(e) =>
              setGuestName(e.target.value)
            }
            placeholder="Enter your name"
            disabled={placingOrder}
            className="w-full mt-3 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
          />

        </section>

        {/* ORDER TYPE */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mt-5">

          <h2 className="font-bold text-lg">
            When would you like your order?
          </h2>

          <div className="grid grid-cols-2 gap-3 mt-4">

            <button
              onClick={() =>
                setOrderType("now")
              }
              disabled={placingOrder}
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

            <button
              onClick={() =>
                setOrderType("schedule")
              }
              disabled={placingOrder}
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
                disabled={placingOrder}
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />

              <p className="text-xs text-gray-500 mt-2">
                Scheduled orders must be at least 1 hour in advance.
              </p>

            </div>
          )}

        </section>

        {/* TOTAL */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 mt-5">

          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>

            <span>
              ₹{subtotal.toFixed(2)}
            </span>
          </div>

          {discountTotal > 0 && (
            <div className="mt-2 flex justify-between text-green-600">
              <span>Discount</span>
              <span>-₹{discountTotal.toFixed(2)}</span>
            </div>
          )}

          {gstEnabled && (
            <div className="mt-2 flex justify-between text-gray-500">
              <span>GST ({gstRate}%)</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t my-4" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>

            <span>
              ₹{finalTotal.toFixed(2)}
            </span>
          </div>

        </section>

      </main>

      {/* PLACE ORDER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">

        <div className="max-w-3xl mx-auto">

          <button
            onClick={handlePlaceOrder}
            disabled={placingOrder}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
          >

            {placingOrder ? (
              <>
                <FiLoader
                  className="animate-spin"
                  size={19}
                />
                Placing Order...
              </>
            ) : (
              <>
                {orderType === "schedule"
                  ? "Schedule Order"
                  : "Place Order"}

                <span>•</span>

                ₹{finalTotal.toFixed(2)}
              </>
            )}

          </button>

        </div>

      </div>

    </div>
  );
}
