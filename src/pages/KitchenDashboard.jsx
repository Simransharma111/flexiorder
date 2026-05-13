import { useEffect, useState } from "react";
import socket from "../socket";
import api from "../api/axios";

export default function KitchenDashboard() {

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // FETCH ORDERS

  const fetchOrders = async () => {

    try {

      const res = await api.get(
        "/kitchen/orders",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

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

  // SOCKETS + INITIAL FETCH

  useEffect(() => {

    fetchOrders();

    // NEW ORDER

    socket.on(
      "newOrder",
      (newOrder) => {

        setOrders((prev) => [
          newOrder,
          ...prev,
        ]);

        // SOUND NOTIFICATION

        const audio = new Audio(
          "/orders_received.mp3"
        );

        audio.play();

      }
    );

    // ORDER UPDATED

    socket.on(
  "kitchenOrderUpdated",
  (updatedOrder) => {

    // REMOVE DELIVERED ORDER

    if (
      updatedOrder.status ===
      "delivered"
    ) {

      setOrders((prev) =>
        prev.filter(
          (order) =>
            order._id !==
            updatedOrder._id
        )
      );

    } else {

      // UPDATE ORDER LIVE

      setOrders((prev) =>
        prev.map((order) =>
          order._id ===
          updatedOrder._id
            ? updatedOrder
            : order
        )
      );

    }

  }
);

return () => {

  socket.off("newOrder");

  socket.off(
    "kitchenOrderUpdated"
  );

};

}, []);
  // UPDATE STATUS

  const updateStatus = async (
    orderId,
    status
  ) => {

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

      // OPTIONAL INSTANT UI UPDATE

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? res.data.order
            : order
        )
      );

    } catch (err) {

      console.error(err);

      alert(
        err.response?.data?.message ||
        "Failed to update order"
      );

    }

  };

  // STATUS COLOR

  const getStatusColor = (
    status
  ) => {

    switch (status) {

      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";

      case "accepted":
        return "bg-purple-500/20 text-purple-400 border-purple-500/20";

      case "preparing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/20";

      case "ready":
        return "bg-green-500/20 text-green-400 border-green-500/20";

      case "delivered":
        return "bg-gray-500/20 text-gray-300 border-gray-500/20";

      default:
        return "bg-white/10";

    }

  };

  // LOADING

  if (loading) {

    return (

      <div className="min-h-screen bg-[#0F172A] text-white flex justify-center items-center text-3xl">

        Loading Orders...

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-[#0F172A] text-white">

      {/* HEADER */}

      <div className="sticky top-0 z-50 bg-[#111827]/80 backdrop-blur-lg border-b border-white/10">

        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">

          <div>

            <h1 className="text-3xl md:text-4xl font-bold">
              Kitchen Dashboard
            </h1>

            <p className="text-gray-400 mt-1">
              Live Hotel Orders
            </p>

          </div>

          <div className="bg-orange-500 px-5 py-3 rounded-2xl">

            <p className="text-sm">
              Active Orders
            </p>

            <h2 className="text-2xl font-bold">
              {orders.length}
            </h2>

          </div>

        </div>

      </div>

      {/* ORDERS */}

      <section className="max-w-7xl mx-auto px-4 py-8">

        {orders.length === 0 ? (

          <div className="text-center py-20 text-gray-400 text-2xl">

            No Active Orders

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {orders.map((order) => (

              <div
                key={order._id}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-lg"
              >

                {/* TOP */}

                <div className="flex justify-between items-start">

                  <div>

                    <h2 className="text-2xl font-bold">

                      {order.roomNumber ||
                        order.tableNumber ||
                        "Table"}

                    </h2>

                    <p className="text-gray-400 mt-1">

                      {order.guestName ||
                        "Guest"}

                    </p>

                  </div>

                  <div
                    className={`px-4 py-2 rounded-full border text-sm font-medium capitalize ${getStatusColor(order.status)}`}
                  >

                    {order.status}

                  </div>

                </div>

                {/* ITEMS */}

                <div className="mt-6 space-y-3">

                  {order?.items?.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="flex justify-between bg-white/5 rounded-2xl px-4 py-3"
                      >

                        <div>

                          <h3 className="font-semibold">

                            {item.name ||
                              "Dish"}

                          </h3>

                          <p className="text-sm text-gray-400">

                            Qty:
                            {" "}
                            {item.quantity}

                          </p>

                        </div>

                        <div className="text-orange-400 font-bold">

                          ₹
                          {item.price *
                            item.quantity}

                        </div>

                      </div>

                    )
                  )}

                </div>

                {/* TIME + TOTAL */}

                <div className="mt-6 flex justify-between items-center">

                  <div>

                    <p className="text-sm text-gray-400">

                      Estimated Time

                    </p>

                    <h3 className="text-xl font-bold">

                      {order.estimatedTime || 20}
                      {" "}
                      mins

                    </h3>

                  </div>

                  <div>

                    <p className="text-sm text-gray-400">

                      Total

                    </p>

                    <h3 className="text-xl font-bold text-orange-400">

                      ₹{order.totalAmount}

                    </h3>

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="mt-8 flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "accepted"
                      )
                    }
                    className="bg-purple-500 hover:bg-purple-600 px-5 py-3 rounded-2xl font-medium"
                  >
                    Accept
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "preparing"
                      )
                    }
                    className="bg-blue-500 hover:bg-blue-600 px-5 py-3 rounded-2xl font-medium"
                  >
                    Preparing
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "ready"
                      )
                    }
                    className="bg-green-500 hover:bg-green-600 px-5 py-3 rounded-2xl font-medium"
                  >
                    Ready
                  </button>

                  <button
                    onClick={() =>
                      updateStatus(
                        order._id,
                        "delivered"
                      )
                    }
                    className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-2xl font-medium"
                  >
                    Delivered
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </section>

    </div>

  );

}