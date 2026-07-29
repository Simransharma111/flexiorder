import { useEffect, useMemo, useState } from "react";
import socket from "../socket";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

import {
  FiMenu,
  FiGrid,
  FiClipboard,
  FiCoffee,
  FiCheckCircle,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiMaximize2,
  FiLogOut,
  FiBell,
  FiSearch,
  FiMoreVertical,
  FiPrinter,
  FiX,
} from "react-icons/fi";

import {
  MdRestaurant,
  MdFastfood,
  MdRoomService,
  MdOutlineTakeoutDining,
} from "react-icons/md";

const STATUS_STYLES = {
  pending: {
    label: "NEW",
    className: "bg-orange-500",
  },
  accepted: {
    label: "IN PROGRESS",
    className: "bg-yellow-500",
  },
  preparing: {
    label: "IN PROGRESS",
    className: "bg-blue-600",
  },
  ready: {
    label: "READY",
    className: "bg-green-600",
  },
};

const STATUS_BUTTONS = {
  pending: "Accept Order",
  accepted: "Start Preparing",
  preparing: "Prepared / Ready",
  ready: "Prepared / Ready",
};

export default function KitchenDashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [hotel, setHotel] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [hiddenOrders, setHiddenOrders] = useState([]);
  const [countdown, setCountdown] = useState(24);

  const [search, setSearch] = useState("");

  /* =====================================================
      FETCH HOTEL
  ===================================================== */

  const fetchHotel = async () => {
    try {
      const res = await api.get("/hotel/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setHotel(res.data);
    } catch (err) {
      console.error("Failed to fetch hotel:", err);
    }
  };

  /* =====================================================
      FETCH ORDERS
  ===================================================== */

  const fetchOrders = async () => {
    try {
      const res = await api.get("/kitchen/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      const incomingOrders = (res.data.orders || []).filter(
        (order) =>
          order.status !== "delivered" &&
          order.status !== "cancelled"
      );

      setOrders(incomingOrders);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
      INITIAL LOAD + SOCKET
  ===================================================== */

  useEffect(() => {
    fetchHotel();
    fetchOrders();

    const handleNewOrder = (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);

      try {
        const audio = new Audio("/orders_received.mp3");
        audio.play().catch(() => {});
      } catch (err) {
        console.log(err);
      }
    };

    const handleOrderUpdated = (updatedOrder) => {
      if (
        updatedOrder.status === "delivered" ||
        updatedOrder.status === "cancelled"
      ) {
        setOrders((prev) =>
          prev.filter((order) => order._id !== updatedOrder._id)
        );

        return;
      }

      setOrders((prev) => {
        const exists = prev.some(
          (order) => order._id === updatedOrder._id
        );

        if (!exists) {
          return [updatedOrder, ...prev];
        }

        return prev.map((order) =>
          order._id === updatedOrder._id
            ? updatedOrder
            : order
        );
      });
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("kitchenOrderUpdated", handleOrderUpdated);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off(
        "kitchenOrderUpdated",
        handleOrderUpdated
      );
    };
  }, []);

  /* =====================================================
      AUTO REFRESH
  ===================================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  /* =====================================================
      AUTO HIDE COUNTDOWN
  ===================================================== */

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 24;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* =====================================================
      WAITING TIME
  ===================================================== */

  const getWaitingMinutes = (createdAt) => {
    if (!createdAt) return 0;

    const created = new Date(createdAt).getTime();
    const now = Date.now();

    return Math.max(
      0,
      Math.floor((now - created) / 60000)
    );
  };

  /* =====================================================
      DELAYED
  ===================================================== */

  const isDelayed = (order) => {
    return getWaitingMinutes(order.createdAt) >= 15;
  };

  /* =====================================================
      LOCATION
  ===================================================== */

  const getLocation = (order) => {
    if (order.locationType === "room") {
      return `Room ${order.locationNumber}`;
    }

    return `Table ${order.locationNumber}`;
  };

  /* =====================================================
      ORDER TYPE
  ===================================================== */

  const getOrderType = (order) => {
    if (order.locationType === "room") {
      return "Room Service";
    }

    if (order.orderType === "takeaway") {
      return "Take Away";
    }

    return "Dine In";
  };

  /* =====================================================
      UPDATE STATUS
  ===================================================== */

  const updateStatus = async (orderId, status) => {
    try {
      const res = await api.put(
        `/kitchen/orders/${orderId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
        }
      );

      if (
        status === "delivered" ||
        status === "cancelled"
      ) {
        setOrders((prev) =>
          prev.filter(
            (order) => order._id !== orderId
          )
        );

        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? res.data.order
            : order
        )
      );

      /* Ready orders disappear after 24 seconds */
      if (status === "ready") {
        setTimeout(() => {
          setHiddenOrders((prev) => [
            ...prev,
            orderId,
          ]);
        }, 24000);
      }
    } catch (err) {
      console.error(err);

      alert(
        err?.response?.data?.message ||
          "Failed to update order"
      );
    }
  };

  /* =====================================================
      NEXT STATUS
  ===================================================== */

  const getNextStatus = (current) => {
    const flow = {
      pending: "accepted",
      accepted: "preparing",
      preparing: "ready",
      ready: "ready",
    };

    return flow[current];
  };

  /* =====================================================
      FILTERED ORDERS
  ===================================================== */

  const visibleOrders = useMemo(() => {
    return orders
      .filter(
        (order) => !hiddenOrders.includes(order._id)
      )
      .filter((order) => {
        if (!search.trim()) return true;

        const text = search.toLowerCase();

        return (
          String(order.locationNumber || "")
            .toLowerCase()
            .includes(text) ||
          String(order.guestName || "")
            .toLowerCase()
            .includes(text) ||
          String(order._id || "")
            .toLowerCase()
            .includes(text)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  }, [orders, hiddenOrders, search]);

  /* =====================================================
      COUNTS
  ===================================================== */

  const delayedCount = orders.filter(isDelayed).length;

  /* =====================================================
      LOGOUT
  ===================================================== */

  const handleLogout = () => {
    const ok = window.confirm(
      "Do you want to logout?"
    );

    if (!ok) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    navigate("/");
  };

  /* =====================================================
      KITCHEN DISPLAY
  ===================================================== */

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  /* =====================================================
      LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <h2 className="text-xl font-bold">
            Loading Kitchen...
          </h2>
        </div>
      </div>
    );
  }

  /* =====================================================
      UI
  ===================================================== */

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-900 flex overflow-hidden">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`
          fixed lg:static
          inset-y-0 left-0
          z-50
          bg-[#111827]
          text-white
          transition-all duration-300
          flex flex-col
          ${
            sidebarOpen
              ? "w-[245px]"
              : "w-0 lg:w-[78px]"
          }
          overflow-hidden
        `}
      >

        {/* LOGO */}

        <div className="h-[86px] px-5 flex items-center gap-3 border-b border-white/10">

          {hotel?.logo ? (
            <img
              src={hotel.logo}
              alt={hotel?.name || "Restaurant"}
              className="w-11 h-11 rounded-full object-cover bg-white shrink-0"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
              <MdRestaurant size={24} />
            </div>
          )}

          <div className="min-w-[140px]">
            <h2 className="font-bold text-sm">
              {hotel?.name || "Restaurant"}
            </h2>

            <p className="text-xs text-gray-400">
              Kitchen Dashboard
            </p>
          </div>

        </div>

        {/* NAVIGATION */}

        <nav className="flex-1 px-3 py-6 space-y-2">

          <SidebarItem
            icon={<MdRestaurant />}
            label="Kitchen"
            active
            collapsed={!sidebarOpen}
          />

          <SidebarItem
            icon={<FiClipboard />}
            label="Orders History"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/orders-history")
            }
          />

          <SidebarItem
            icon={<FiCoffee />}
            label="Menu"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/menu")
            }
          />

          <SidebarItem
            icon={<FiCheckCircle />}
            label="Dish Availability"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/dish-availability")
            }
          />

          <SidebarItem
            icon={<FiClock />}
            label="Scheduled Orders"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/scheduled-orders")
            }
          />

          <SidebarItem
            icon={<FiBarChart2 />}
            label="Reports"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/reports")
            }
          />

          <SidebarItem
            icon={<FiSettings />}
            label="Settings"
            collapsed={!sidebarOpen}
            onClick={() =>
              navigate("/settings")
            }
          />

        </nav>

        {/* RESTAURANT BOTTOM */}

        <div className="p-4 border-t border-white/10">

          <div
            className={`
              flex items-center gap-3
              ${
                sidebarOpen
                  ? ""
                  : "justify-center"
              }
            `}
          >

            {hotel?.logo ? (
              <img
                src={hotel.logo}
                className="w-10 h-10 rounded-full object-cover"
                alt=""
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <MdRestaurant />
              </div>
            )}

            {sidebarOpen && (
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {hotel?.name || "Tasty Bites"}
                </p>

                <p className="text-xs text-gray-500">
                  v1.0.0
                </p>
              </div>
            )}

          </div>

          <button
            onClick={handleLogout}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
          >
            <FiLogOut />

            {sidebarOpen && "Logout"}
          </button>

        </div>

      </aside>

      {/* MOBILE OVERLAY */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="flex-1 min-w-0 overflow-y-auto">

        {/* HEADER */}

        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">

          <div className="h-[82px] px-4 sm:px-6 flex items-center justify-between gap-4">

            {/* LEFT */}

            <div className="flex items-center gap-4 min-w-0">

              <button
                onClick={() =>
                  setSidebarOpen(!sidebarOpen)
                }
                className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center shrink-0"
              >
                <FiMenu size={22} />
              </button>

              <div className="min-w-0">

                <h1 className="text-xl sm:text-2xl font-bold truncate">
                  Kitchen
                </h1>

                <p className="text-xs sm:text-sm text-gray-500">
                  {hotel?.name || "Restaurant"}
                </p>

              </div>

            </div>

            {/* RIGHT */}

            <div className="flex items-center gap-2 sm:gap-4">

              {/* SEARCH */}

              <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2">

                <FiSearch className="text-gray-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search order..."
                  className="bg-transparent outline-none text-sm px-2 w-40"
                />

              </div>

              {/* NOTIFICATION */}

              <button className="relative w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <FiBell size={20} />

                {orders.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                    {Math.min(orders.length, 9)}
                  </span>
                )}
              </button>

              {/* FULLSCREEN */}

              <button
                onClick={enterFullscreen}
                className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111827] text-white text-sm font-semibold hover:bg-gray-800"
              >
                <FiMaximize2 />
                Kitchen Display
              </button>

            </div>

          </div>

        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="p-4 sm:p-6 lg:p-7">

          {/* TOP TITLE */}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

            <div>
              <h2 className="text-2xl font-bold">
                Active Orders ({visibleOrders.length})
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {delayedCount > 0
                  ? `${delayedCount} order${
                      delayedCount > 1
                        ? "s"
                        : ""
                    } delayed`
                  : "All orders are on time"}
              </p>
            </div>

            <div className="text-sm text-gray-500">
              Auto hide completed in{" "}
              <span className="font-bold text-red-500">
                {countdown} sec
              </span>
            </div>

          </div>

          {/* =================================================
              ORDER GRID
          ================================================= */}

          {visibleOrders.length === 0 ? (

            <div className="min-h-[60vh] bg-white border border-gray-200 rounded-2xl flex items-center justify-center">

              <div className="text-center">

                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
                  <FiClipboard
                    size={35}
                    className="text-gray-400"
                  />
                </div>

                <h2 className="text-2xl font-bold">
                  No Active Orders
                </h2>

                <p className="text-gray-500 mt-2">
                  Incoming orders will appear here
                </p>

              </div>

            </div>

          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">

              {visibleOrders.map((order) => {

                const waiting =
                  getWaitingMinutes(
                    order.createdAt
                  );

                const delayed =
                  isDelayed(order);

                const status =
                  STATUS_STYLES[
                    order.status
                  ] ||
                  STATUS_STYLES.pending;

                return (

                  <div
                    key={order._id}
                    className={`
                      bg-white
                      rounded-xl
                      border
                      overflow-hidden
                      shadow-sm
                      hover:shadow-md
                      transition
                      ${
                        delayed
                          ? "border-red-300"
                          : "border-gray-200"
                      }
                    `}
                  >

                    {/* TOP STATUS */}

                    <div className="px-4 pt-4">

                      <div className="flex items-center justify-between">

                        <span className="text-xs font-medium text-gray-500">
                          {new Date(
                            order.createdAt
                          ).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>

                        <span
                          className={`
                            px-2.5 py-1
                            rounded-md
                            text-[10px]
                            text-white
                            font-bold
                            ${status.className}
                          `}
                        >
                          {delayed
                            ? "DELAYED"
                            : status.label}
                        </span>

                      </div>

                    </div>

                    {/* LOCATION */}

                    <div className="px-4 pt-2">

                      <div className="flex items-start justify-between gap-2">

                        <div>

                          <h3 className="text-2xl font-bold">
                            {getLocation(order)}
                          </h3>

                          <p className="text-xs text-gray-500 mt-1">
                            {getOrderType(order)}
                          </p>

                        </div>

                        <button className="text-gray-400 hover:text-gray-700">
                          <FiMoreVertical />
                        </button>

                      </div>

                    </div>

                    {/* CUSTOMER */}

                    {order.guestName && (
                      <div className="px-4 pt-3">

                        <p className="text-xs text-gray-500">
                          Customer
                        </p>

                        <p className="text-sm font-semibold">
                          {order.guestName}
                        </p>

                      </div>
                    )}

                    {/* ITEMS */}

                    <div className="px-4 py-4">

                      <div className="border-t border-gray-100 pt-3 space-y-2">

                        {order.items
                          ?.slice(0, 5)
                          .map((item, index) => (

                            <div
                              key={index}
                              className="flex items-center justify-between gap-3 text-sm"
                            >

                              <div className="flex items-center gap-2 min-w-0">

                                <span className="font-bold text-gray-700">
                                  {item.quantity}
                                </span>

                                <span className="truncate">
                                  {item.name}
                                </span>

                              </div>

                            </div>

                          ))}

                        {order.items?.length > 5 && (
                          <p className="text-xs text-gray-400">
                            +{" "}
                            {order.items.length - 5}{" "}
                            more items
                          </p>
                        )}

                      </div>

                    </div>

                    {/* WAITING */}

                    <div className="px-4 pb-3">

                      <div
                        className={`
                          flex items-center gap-2
                          text-sm
                          font-semibold
                          ${
                            delayed
                              ? "text-red-500"
                              : "text-gray-600"
                          }
                        `}
                      >

                        <FiClock />

                        {waiting} min

                      </div>

                    </div>

                    {/* ACTION */}

                    <div className="px-4 pb-4">

                      <button
                        onClick={() =>
                          updateStatus(
                            order._id,
                            getNextStatus(
                              order.status
                            )
                          )
                        }
                        className={`
                          w-full
                          py-3
                          rounded-lg
                          text-white
                          text-sm
                          font-bold
                          transition
                          ${
                            delayed
                              ? "bg-red-600 hover:bg-red-700"
                              : order.status ===
                                "preparing"
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-orange-500 hover:bg-orange-600"
                          }
                        `}
                      >
                        {STATUS_BUTTONS[
                          order.status
                        ] || "Prepared / Ready"}
                      </button>

                    </div>

                  </div>

                );
              })}

            </div>

          )}

          {/* =================================================
              BOTTOM LEGEND
          ================================================= */}

          <div className="flex flex-wrap items-center justify-center gap-5 mt-6 text-xs text-gray-500">

            <Legend
              dot="bg-red-500"
              label="Delayed"
            />

            <Legend
              dot="bg-orange-500"
              label="New"
            />

            <Legend
              dot="bg-blue-600"
              label="In Progress"
            />

            <Legend
              dot="bg-green-600"
              label="Ready"
            />

          </div>

        </div>

      </main>

    </div>
  );
}

/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  icon,
  label,
  active = false,
  collapsed = false,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full
        flex
        items-center
        gap-3
        rounded-lg
        px-3
        py-3
        text-sm
        font-medium
        transition
        ${
          active
            ? "bg-orange-500 text-white"
            : "text-gray-300 hover:bg-white/10 hover:text-white"
        }
        ${
          collapsed
            ? "justify-center"
            : ""
        }
      `}
      title={collapsed ? label : ""}
    >

      <span className="text-xl shrink-0">
        {icon}
      </span>

      {!collapsed && (
        <span>{label}</span>
      )}

    </button>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function Legend({ dot, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${dot}`}
      />
      {label}
    </div>
  );
}