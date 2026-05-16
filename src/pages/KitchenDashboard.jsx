import { useEffect, useState } from "react";
import socket from "../socket";
import api from "../api/axios";
import { subscribeToPush } from "../utils/push";

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

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);

  /* ================= THEME ================= */
  const themeConfig =
    THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor ||
    themeConfig.primary ||
    "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor ||
    themeConfig.secondary ||
    "#0F172A";

  const fetchHotel = async () => {
    try {
      const res = await api.get("/hotel/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setHotel(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get("/kitchen/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrders(
        (res.data.orders || []).filter(
          (order) => order.status !== "delivered"
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotel();
    fetchOrders();

    subscribeToPush(api);

    socket.on("newOrder", (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      new Audio("/orders_received.mp3").play();
    });

    socket.on("kitchenOrderUpdated", (updatedOrder) => {
      if (updatedOrder.status === "delivered") {
        setOrders((prev) =>
          prev.filter((o) => o._id !== updatedOrder._id)
        );
      } else {
        setOrders((prev) =>
          prev.map((o) =>
            o._id === updatedOrder._id ? updatedOrder : o
          )
        );
      }
    });

    return () => {
      socket.off("newOrder");
      socket.off("kitchenOrderUpdated");
    };
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.put(
        `/kitchen/orders/${orderId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId ? res.data.order : o
        )
      );
    } catch (err) {
      alert(err?.response?.data?.message || "Failed");
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{ background: secondaryColor }}
      >
        Loading Orders...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: secondaryColor }}
    >
      {/* HEADER */}
      <div className="sticky top-0 z-50 backdrop-blur border-b border-white/10"
        style={{ background: `${secondaryColor}cc` }}
      >
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">

          <div className="flex items-center gap-3">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}

            <div>
              <h1 className="text-3xl font-bold">
                Kitchen Dashboard
              </h1>
              <p className="text-gray-300 text-sm">
                {hotel?.name}
              </p>
            </div>
          </div>

          <div
            className="px-5 py-3 rounded-2xl"
            style={{ background: primaryColor }}
          >
            <p className="text-sm">Active Orders</p>
            <h2 className="text-2xl font-bold">
              {orders.length}
            </h2>
          </div>

        </div>
      </div>

      {/* ORDERS */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">

          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white/5 border border-white/10 rounded-3xl p-6"
            >

              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold">
  Table {order.table?.tableNumber}
</h2>
                  <p className="text-gray-400">
                    {order.guestName}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
  {new Date(order.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}
</p>
                </div>

                <span
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ background: primaryColor }}
                >
                  {order.status}
                </span>
              </div>

          <div className="mt-5">

  <div className="flex items-center justify-between mb-4">

    <div>

      <p className="text-xs text-gray-400">
        TABLE / ROOM
      </p>

      <h2
        className="text-3xl font-black"
        style={{ color: primaryColor }}
      >
        {order.table?.tableNumber || "N/A"}
      </h2>

    </div>

    <div className="text-right">

      <p className="text-xs text-gray-400">
        ITEMS
      </p>

      <h3 className="text-2xl font-bold">
        {order.items.length}
      </h3>

    </div>

  </div>

  <div className="space-y-3">

    {order.items.map((item, i) => (

      <div
        key={i}
        className="flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-2xl"
      >

        <div>

          <h3 className="text-lg font-bold">
            {item.name}
          </h3>

          <p className="text-sm text-gray-400 mt-1">
            ₹{item.price} each
          </p>

        </div>

        <div
          className="min-w-[70px] h-[70px] rounded-2xl flex items-center justify-center text-3xl font-black"
          style={{
            background: primaryColor,
          }}
        >
          ×{item.quantity}
        </div>

      </div>

    ))}

  </div>

</div>

              {/* ACTIONS */}
              <div className="mt-6 flex gap-3 flex-wrap">

                <button
                  onClick={() =>
                    updateStatus(order._id, "accepted")
                  }
                  style={{ background: primaryColor }}
                  className="px-4 py-2 rounded-xl"
                >
                  Accept
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "preparing")
                  }
                  className="px-4 py-2 rounded-xl bg-blue-500"
                >
                  Preparing
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "ready")
                  }
                  className="px-4 py-2 rounded-xl bg-green-500"
                >
                  Ready
                </button>

                <button
                  onClick={() =>
                    updateStatus(order._id, "delivered")
                  }
                  className="px-4 py-2 rounded-xl bg-gray-600"
                >
                  Delivered
                </button>

              </div>

            </div>
          ))}

        </div>
      </section>
    </div>
  );
}