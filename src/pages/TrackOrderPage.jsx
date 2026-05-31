import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/axios";
import socket from "../socket";

export default function TrackOrderPage() {

  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  // FETCH ORDER
  const fetchOrder = async () => {

    try {

      const res = await api.get(
        `/orders/${orderId}`
      );

      // backend returns direct order object
      setOrder(res.data);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    if (!orderId) return;

    fetchOrder();

    // JOIN SOCKET ROOM
    socket.emit(
      "joinOrderRoom",
      orderId
    );

    // LISTEN FOR LIVE UPDATES
    socket.on(
      "orderUpdated",
      (updatedOrder) => {

        setOrder(updatedOrder);

      }
    );

    return () => {

      socket.off("orderUpdated");

    };

  }, [orderId]);

  // STATUS STEPS
const steps = [
  "pending",
   "accepted",
  "preparing",
  "ready",
  "delivered",
];

  const currentStep =
    steps.indexOf(order?.status);

  // LOADING
  if (loading) {

    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center text-2xl">
        Loading...
      </div>
    );
  }

  // NO ORDER
  if (!order) {
// CANCELLED
if (order.status === "cancelled") {

  return (

    <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center px-4">

      <div className="bg-white/5 border border-red-500/30 rounded-3xl p-10 text-center max-w-lg w-full">

        <div className="text-7xl mb-5">
          ❌
        </div>

        <h1 className="text-4xl font-black text-red-500">
          Order Cancelled
        </h1>

        <p className="text-gray-300 mt-5 text-lg">
          Unfortunately your order was cancelled by staff.
        </p>

        <p className="text-gray-500 mt-3">
          Please contact the restaurant or place a new order.
        </p>

      </div>

    </div>

  );
}
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center text-2xl">
        Order not found
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-[#0F172A] text-white px-4 py-10">

      <div className="max-w-3xl mx-auto">

        {/* HEADER */}

        <div className="text-center">

          <h1 className="text-5xl font-bold">
            Order Tracking
          </h1>

          <p className="text-gray-400 mt-4">
            Live order updates
          </p>

        </div>

        {/* ORDER CARD */}

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mt-10">

          <div className="flex justify-between items-center flex-wrap gap-4">

            <div>

              <p className="text-gray-400">
                Order ID
              </p>

              <h2 className="text-lg font-bold mt-2 break-all">
                {order._id}
              </h2>

            </div>

            <div>

              <p className="text-gray-400">
                Estimated Time
              </p>

              <h2 className="text-3xl font-bold mt-2 text-orange-400">
                {order.estimatedTime} mins
              </h2>

            </div>

          </div>

          {/* ITEMS */}

          <div className="mt-10 space-y-4">

            {(order.items || []).map((item, index) => (

              <div
                key={index}
                className="flex justify-between items-center bg-white/5 rounded-2xl px-5 py-4"
              >

                <div>

                  <h3 className="font-semibold text-lg">
                    {item.name}
                  </h3>

                  <p className="text-gray-400 text-sm mt-1">
                    Qty: {item.quantity}
                  </p>

                </div>

                <div className="font-bold text-orange-400">
                  ₹{item.price * item.quantity}
                </div>

              </div>

            ))}

          </div>

          {/* TRACKING */}

          <div className="mt-12">

            <div className="flex justify-between items-center relative">

              {/* LINE */}

              <div className="absolute top-5 left-0 w-full h-1 bg-white/10 rounded-full"></div>

              <div
                className="absolute top-5 left-0 h-1 bg-orange-500 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    currentStep <= 0
                      ? 0
                      : (currentStep /
                          (steps.length - 1)) *
                        100
                  }%`,
                }}
              ></div>

              {/* STEPS */}

              {steps.map((step, index) => {

                const active =
                  index <= currentStep;

                return (

                  <div
                    key={step}
                    className="relative z-10 flex flex-col items-center"
                  >

                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        active
                          ? "bg-orange-500"
                          : "bg-white/10"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <p className="mt-3 capitalize text-sm">
                      {step}
                    </p>

                  </div>

                );
              })}

            </div>

          </div>

          {/* STATUS */}

          <div className="mt-12 text-center">

            <h2 className="text-4xl font-bold capitalize text-orange-400">
              {order.status}
            </h2>

          </div>

        </div>

      </div>

    </div>
  );
}