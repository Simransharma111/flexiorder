import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiClock } from "react-icons/fi";

import api from "../api/axios";
import socket from "../socket";

const STEP_LABELS = ["Received", "Preparing", "Ready", "Delivered"];

const STEP_DESCRIPTIONS = {
  Received: "The restaurant has your order.",
  Preparing: "The kitchen is working on it.",
  Ready: "Your order is ready for pickup.",
  Delivered: "Served. Enjoy your meal!",
};

function TrackerShell({ children }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex h-14 items-center gap-2.5 border-b border-hairline bg-white px-4">
        <span className="grid h-8 w-8 place-items-center rounded-card bg-brand text-sm font-extrabold text-white">
          F
        </span>
        <p className="text-sm font-extrabold tracking-tight">Order tracking</p>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}

export default function TrackOrderPage() {

  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  // FETCH ORDER
  const fetchOrder = useCallback(async () => {

    try {

      const res = await api.get(
        `/orders/${orderId}`,
        { skipAuth: true }
      );

      // backend returns direct order object
      setOrder(res.data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  }, [orderId]);

  useEffect(() => {

    if (!orderId) return;

    fetchOrder();

    // Keep tracking useful when sockets are unavailable or disconnected.
    const pollingId = window.setInterval(fetchOrder, 5000);

    // JOIN SOCKET ROOM
    const joinOrder = () => socket.emit("joinOrderRoom", orderId);
    joinOrder();
    socket.on("connect", joinOrder);

    // LISTEN FOR LIVE UPDATES
    const handleOrderUpdated = (updatedOrder) => setOrder(updatedOrder);
    socket.on("orderUpdated", handleOrderUpdated);

    return () => {

      window.clearInterval(pollingId);
      socket.emit("leaveOrderRoom", orderId);
      socket.off("connect", joinOrder);
      socket.off("orderUpdated", handleOrderUpdated);

    };

  }, [fetchOrder, orderId]);

  // STATUS STEPS
  const steps = [
    "pending",
    "preparing",
    "ready",
    "delivered",
  ];

  const publicStatus =
    order?.status === "accepted"
      ? "preparing"
      : order?.status;

  const currentStep =
    steps.indexOf(publicStatus);

  // LOADING
  if (loading) {
    return (
      <TrackerShell>
        <div
          className="animate-pulse space-y-4"
          aria-label="Loading order status"
        >
          <div className="h-8 w-40 rounded-card bg-subtle" />
          <div className="h-56 rounded-panel border border-hairline bg-white" />
          <div className="h-32 rounded-panel border border-hairline bg-white" />
        </div>
      </TrackerShell>
    );
  }

  // NO ORDER
  if (!order) {
    return (
      <TrackerShell>
        <div className="rounded-panel border border-hairline bg-white px-6 py-12 text-center shadow-card">
          <h1 className="text-xl font-extrabold">Order not found</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Check the tracking link or ask the restaurant staff.
          </p>
        </div>
      </TrackerShell>
    );
  }

  // CANCELLED
  if (order.status === "cancelled") {
    return (
      <TrackerShell>
        <div className="rounded-panel border border-status-delayed-line/40 bg-white px-6 py-12 text-center shadow-card">
          <span
            className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-status-delayed-surface text-2xl"
            aria-hidden="true"
          >
            ✕
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-status-delayed-ink">
            Order cancelled
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-secondary">
            This order was cancelled by staff. Please contact the restaurant
            or place a new order.
          </p>
        </div>
      </TrackerShell>
    );
  }

  const statusLabel =
    publicStatus === "pending"
      ? "Received"
      : STEP_LABELS[currentStep] || "Received";

  const statusClass =
    publicStatus === "ready" || publicStatus === "delivered"
      ? "bg-status-ready-surface text-status-ready-ink"
      : publicStatus === "preparing"
        ? "bg-status-preparing-surface text-status-preparing-ink"
        : "bg-status-new-surface text-status-new-ink";

  const barColor =
    publicStatus === "ready" || publicStatus === "delivered"
      ? "bg-status-ready-line"
      : publicStatus === "preparing"
        ? "bg-status-preparing-line"
        : "bg-status-new-line";

  const location =
    order.locationNumber || order.roomNumber
      ? `${order.locationType === "room" ? "Room" : "Table"} ${
          order.locationNumber || order.roomNumber
        }`
      : null;

  return (

    <TrackerShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {location || "Your order"}
          </h1>
          {order.createdAt ? (
            <p className="mt-0.5 text-xs font-medium text-ink-disabled">
              Placed{" "}
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>

        <span
          className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${statusClass}`}
          role="status"
          aria-live="polite"
        >
          {statusLabel}
        </span>
      </div>

      {Number.isFinite(Number(order.estimatedTime)) && order.estimatedTime > 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-card border border-hairline bg-white px-4 py-3 text-sm font-bold text-ink shadow-card">
          <FiClock className="text-brand" aria-hidden="true" />
          About {order.estimatedTime} min
        </p>
      ) : null}

      {/* PROGRESS */}

      <div className="mt-4 rounded-panel border border-hairline bg-white p-5 shadow-card">
        <ol className="relative">
          {steps.map((step, index) => {
            const label = STEP_LABELS[index];
            const isDone = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <li key={step} className="relative flex gap-3.5 pb-6 last:pb-0">
                {index < steps.length - 1 ? (
                  <span
                    className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5 rounded-full ${
                      isDone ? barColor : "bg-hairline"
                    }`}
                    aria-hidden="true"
                  />
                ) : null}

                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-extrabold ${
                    isDone
                      ? `border-transparent text-white ${barColor}`
                      : isCurrent
                        ? "border-transparent bg-white text-ink ring-2 ring-inset"
                        : "border-hairline bg-white text-ink-disabled"
                  } ${isCurrent ? statusClass : ""}`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>

                <div>
                  <p
                    className={`text-sm font-bold ${
                      isCurrent || isDone ? "text-ink" : "text-ink-disabled"
                    }`}
                  >
                    {label}
                    {isCurrent ? (
                      <span className="sr-only">(current status)</span>
                    ) : null}
                  </p>
                  {isCurrent ? (
                    <p className="mt-0.5 text-xs leading-5 text-ink-secondary">
                      {STEP_DESCRIPTIONS[label]}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ITEMS */}

      <section
        aria-label="Ordered items"
        className="mt-4 rounded-panel border border-hairline bg-white p-5 shadow-card"
      >
        <h2 className="text-sm font-extrabold">Items</h2>

        <ul className="mt-3 divide-y divide-hairline">
          {(order.items || []).map((item, index) => (
            <li
              key={index}
              className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
            >
              <span className="font-semibold text-ink">{item.name}</span>
              <span className="shrink-0 font-bold text-ink-secondary">
                ×{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-5 text-center text-xs text-ink-disabled">
        Updates automatically while this page is open.
      </p>
    </TrackerShell>
  );
}
