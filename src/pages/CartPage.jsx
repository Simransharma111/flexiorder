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
import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useConnectivity } from "../context/ConnectivityContext";
import { getSchedulePickerBounds, validateScheduledOrderTime } from "../utils/scheduleWindow";
import { mergeGuestOrderItems, saveGuestOrderHandoff } from "../utils/guestOrderState";

const getHotelPricing = (hotel) => {
  const enabled = Boolean(
    hotel?.gstEnabled ?? hotel?.enableGST ?? hotel?.gst?.enabled
  );
  const rate = Number(
    hotel?.gstPercentage ?? hotel?.gstRate ?? hotel?.gst?.percentage ?? 0
  );
  return {
    enabled: enabled && rate > 0,
    rate: rate > 0 ? rate : 0,
  };
};

export default function CartPage() {
  const navigate = useNavigate();
  const { qrId } = useParams();
  const { isOnline } = useConnectivity();

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
  const placingInFlight = useRef(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [scheduleClock, setScheduleClock] = useState(() => new Date());
  // Track whether the host has paused QR ordering.
  const [orderingEnabled, setOrderingEnabled] = useState(true);

  // =========================================================
  // SET CART SESSION
  // =========================================================

  useEffect(() => {
    if (qrId) {
      setCartSession(qrId);
      api.get(`/qr/menu/${qrId}`, { skipAuth: true })
        .then((response) => {
          const hotel = response.data?.hotel;
          // Respect the host's ordering toggle.
          setOrderingEnabled(hotel?.orderingEnabled !== false);
          const pricing = getHotelPricing(hotel);
          setGstEnabled(pricing.enabled);
          setGstRate(pricing.rate);
          const menu = response.data?.dishes || response.data?.menu || [];
          setUnavailableIds(
            menu
              .filter((dish) => dish.isAvailable === false)
              .map((dish) => dish._id)
          );
        })
        .catch((error) => {
          console.warn("Could not refresh checkout availability", error);
        });
    }
  }, [qrId, setCartSession]);

  useEffect(() => {
    if (orderType !== "schedule") return undefined;
    const intervalId = window.setInterval(() => setScheduleClock(new Date()), 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, [orderType]);

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
  // ORDERING DISABLED — block the cart page entirely
  // =========================================================

  if (!orderingEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm w-full max-w-md">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-gray-900">Ordering is paused</h2>
          <p className="text-gray-500 mt-2 text-sm">
            The restaurant has temporarily disabled customer ordering. Please ask a waiter to place the order on your behalf.
          </p>
          <button
            onClick={() => navigate(`/qr/${qrId}`)}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  const schedulePickerBounds = getSchedulePickerBounds(scheduleClock);
  const scheduleTimeLabel = (value) => new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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
    if (placingInFlight.current) return;

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

    if (!isOnline) {
      setErrorMessage("You are offline. Please reconnect before placing the order.");
      return;
    }

    if (!orderingEnabled) {
      setErrorMessage("Customer ordering is currently disabled. Please ask a waiter to place the order.");
      return;
    }

    if (hasUnavailableItems) {
      setErrorMessage("Remove unavailable dishes before placing the order.");
      return;
    }

    if (orderType === "schedule") {
      const scheduleValidation = validateScheduledOrderTime(scheduledFor);
      if (!scheduleValidation.valid) {
        setErrorMessage(scheduleValidation.error);
        return;
      }
    }

    const clientOrderId = globalThis.crypto?.randomUUID?.() ||
      "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    placingInFlight.current = true;

    try {
      setPlacingOrder(true);
      let orderPricing = {
        enabled: gstEnabled,
        rate: gstRate,
      };

      // =====================================================
      // GET TABLE INFORMATION
      // =====================================================

      let tableId = null;

      try {
        const menuResponse = await api.get(
          `/qr/menu/${qrId}`,
          { skipAuth: true }
        );

        orderPricing = getHotelPricing(menuResponse.data?.hotel);
        setGstEnabled(orderPricing.enabled);
        setGstRate(orderPricing.rate);

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

      const orderGstAmount = orderPricing.enabled
        ? subtotal * orderPricing.rate / 100
        : 0;

      // =====================================================
      // ORDER DATA
      // =====================================================

      const orderData = {
        clientOrderId,
        tableId,

        guestName:
          guestName.trim() || "Guest",

        guestContact:
          guestContact.trim() || null,

        items,

        subtotal,
        discountAmount: discountTotal,
        gstRate: orderPricing.enabled ? orderPricing.rate : 0,
        gstAmount: orderGstAmount,
        totalAmount: subtotal + orderGstAmount,

        orderType,

        scheduledFor:
          orderType === "schedule"
            ? scheduledFor
            : null,
      };

      if (orderType === "schedule") {
        const finalScheduleValidation = validateScheduledOrderTime(scheduledFor);
        if (!finalScheduleValidation.valid) {
          setErrorMessage(finalScheduleValidation.error);
          return;
        }
      }

      // =====================================================
      // CREATE ORDER
      // =====================================================

      const response = await api.post(
        "/orders",
        orderData,
        { skipAuth: true }
      );

      // =====================================================
      // SUCCESS
      // =====================================================

      const responseBody = response.data;
      if (responseBody?.success === false) {
        throw new Error(responseBody.message || "Order was not accepted.");
      }
      const createdOrder = responseBody?.order ||
        (responseBody?._id ? responseBody : null);
      const submittedItems = cartItems.map((item) => ({
        menuId: item._id,
        name: item.name,
        quantity: Number(item.quantity),
      }));
      const receivedOrder = {
        status: "pending",
        createdAt: new Date().toISOString(),
        ...orderData,
        ...createdOrder,
        _id: createdOrder?._id || clientOrderId,
        clientOrderId: createdOrder?.clientOrderId || clientOrderId,
        items: mergeGuestOrderItems(createdOrder?.items, submittedItems),
      };

      const handoff = saveGuestOrderHandoff(qrId, receivedOrder);
      setSuccessMessage(
        orderType === "schedule"
          ? "Scheduled order placed successfully!"
          : "Order placed successfully!"
      );
      clearCart();

      setTimeout(() => {
        navigate("/qr/" + qrId, {
          replace: true,
          state: { receivedOrder: handoff },
        });
      }, 1800);

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
      placingInFlight.current = false;
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
              onClick={() => {
                setScheduleClock(new Date());
                setOrderType("schedule");
              }}
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

              <label htmlFor="scheduled-order-time" className="text-sm font-semibold">
                Select date & time
              </label>

              <input
                id="scheduled-order-time"
                type="datetime-local"
                min={schedulePickerBounds.min}
                max={schedulePickerBounds.max}
                aria-describedby="scheduled-order-window"
                value={scheduledFor}
                onChange={(e) =>
                  setScheduledFor(
                    e.target.value
                  )
                }
                disabled={placingOrder}
                className="w-full mt-2 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400"
              />

              <p id="scheduled-order-window" className="text-xs text-gray-500 mt-2">
                Available from {scheduleTimeLabel(schedulePickerBounds.min)} to {scheduleTimeLabel(schedulePickerBounds.max)}.
                Times outside this range cannot be scheduled.
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
