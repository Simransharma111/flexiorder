import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiBox,
  FiChevronDown,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiShoppingBag,
  FiTable,
  FiUsers,
  FiX,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import QRInventory from "./QRInventoryPage";

import socket from "../socket";
import api from "../api/axios";

/* =========================================================
   THEME SYSTEM
========================================================= */

const THEME_MAP = {
  stormy_morning: {
    primary: "#64748B",
    secondary: "#0F172A",
    accent: "#94A3B8",
  },

  mossy_hollow: {
    primary: "#4D7C0F",
    secondary: "#1A2E05",
    accent: "#84CC16",
  },

  blue_eclipse: {
    primary: "#1E293B",
    secondary: "#020617",
    accent: "#38BDF8",
  },

  lush_forest: {
    primary: "#14532D",
    secondary: "#052E16",
    accent: "#22C55E",
  },

  green_juice: {
    primary: "#16A34A",
    secondary: "#052E16",
    accent: "#4ADE80",
  },

  chili_spice: {
    primary: "#DC2626",
    secondary: "#1F0A0A",
    accent: "#FB7185",
  },

  chocolate_truffle: {
    primary: "#7C2D12",
    secondary: "#1C0A00",
    accent: "#FB923C",
  },

  ink_wash: {
    primary: "#111827",
    secondary: "#F8FAFC",
    accent: "#64748B",
  },
};

/* =========================================================
   NAVIGATION
========================================================= */

const NAV_ITEMS = [
  {
    key: "overview",
    label: "Overview",
    icon: FiGrid,
  },
  {
    key: "kitchen",
    label: "Kitchen",
    icon: FiActivity,
  },
  {
    key: "orders",
    label: "Orders",
    icon: FiShoppingBag,
  },
  {
    key: "menu",
    label: "Menu",
    icon: FiPackage,
  },
  {
    key: "staff",
    label: "Staff",
    icon: FiUsers,
  },
  {
    key: "tables",
    label: "QR Tables",
    icon: FiTable,
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: FiBarChart2,
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: FiBox,
  },
];

/* =========================================================
   STATUS CONFIG
========================================================= */

const STATUS_CONFIG = {
  pending: {
    label: "New",
    icon: FiClock,
    className: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  },

  accepted: {
    label: "Accepted",
    icon: FiCheckCircle,
    className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  },

  preparing: {
    label: "Preparing",
    icon: FiActivity,
    className: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  },

  ready: {
    label: "Ready",
    icon: FiCheckCircle,
    className: "bg-green-500/10 text-green-300 border-green-500/20",
  },

  delivered: {
    label: "Completed",
    icon: FiCheckCircle,
    className: "bg-gray-500/10 text-gray-300 border-gray-500/20",
  },

  cancelled: {
    label: "Cancelled",
    icon: FiAlertCircle,
    className: "bg-red-500/10 text-red-300 border-red-500/20",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [hotel, setHotel] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [orderFilter, setOrderFilter] = useState("all");

  /* =========================================================
     TOKEN
  ========================================================= */

  const token = localStorage.getItem("token");

  /* =========================================================
     FETCH HOTEL
  ========================================================= */

  const fetchHotel = async () => {
    try {
      const res = await api.get("/hotel/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setHotel(res.data);
    } catch (err) {
      console.log("FETCH HOTEL ERROR:", err);
    }
  };

  /* =========================================================
     FETCH ORDERS
  ========================================================= */

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);

      const res = await api.get("/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log("FETCH ORDERS ERROR:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    fetchHotel();
    fetchOrders();
  }, []);

  /* =========================================================
     SOCKET ORDER UPDATES
  ========================================================= */

  useEffect(() => {
    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;

      setOrders((prev) => {
        const exists = prev.some(
          (order) => order._id === newOrder._id
        );

        if (exists) return prev;

        return [newOrder, ...prev];
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      if (!updatedOrder) return;

      if (
        updatedOrder.status === "delivered" ||
        updatedOrder.status === "cancelled"
      ) {
        setOrders((prev) =>
          prev.map((order) =>
            order._id === updatedOrder._id
              ? updatedOrder
              : order
          )
        );

        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order._id === updatedOrder._id
            ? updatedOrder
            : order
        )
      );
    };

    socket.on("newOrder", handleNewOrder);
    socket.on("orderUpdated", handleOrderUpdated);

    return () => {
      socket.off("newOrder", handleNewOrder);
      socket.off("orderUpdated", handleOrderUpdated);
    };
  }, []);

  /* =========================================================
     THEME
  ========================================================= */

  const currentTheme =
    THEME_MAP[
      hotel?.theme?.themeId ||
        hotel?.theme?.id
    ] || THEME_MAP.stormy_morning;

  const primaryColor =
    hotel?.theme?.primaryColor ||
    hotel?.theme?.primary ||
    currentTheme.primary;

  const secondaryColor =
    hotel?.theme?.secondaryColor ||
    hotel?.theme?.secondary ||
    currentTheme.secondary;

  const accentColor =
    hotel?.theme?.accentColor ||
    hotel?.theme?.accent ||
    currentTheme.accent;

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    navigate("/login");
  };

  /* =========================================================
     ORDER STATISTICS
  ========================================================= */

  const orderStats = useMemo(() => {
    const active = orders.filter(
      (order) =>
        !["delivered", "cancelled"].includes(
          order.status
        )
    );

    const pending = orders.filter(
      (order) => order.status === "pending"
    );

    const preparing = orders.filter(
      (order) =>
        order.status === "preparing" ||
        order.status === "accepted"
    );

    const ready = orders.filter(
      (order) => order.status === "ready"
    );

    const completed = orders.filter(
      (order) => order.status === "delivered"
    );

    const revenue = orders
      .filter(
        (order) => order.status !== "cancelled"
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.totalAmount || 0),
        0
      );

    return {
      total: orders.length,
      active: active.length,
      pending: pending.length,
      preparing: preparing.length,
      ready: ready.length,
      completed: completed.length,
      revenue,
    };
  }, [orders]);

  /* =========================================================
     FILTERED ORDERS
  ========================================================= */

  const filteredOrders = useMemo(() => {
    if (orderFilter === "all") {
      return orders;
    }

    if (orderFilter === "active") {
      return orders.filter(
        (order) =>
          !["delivered", "cancelled"].includes(
            order.status
          )
      );
    }

    return orders.filter(
      (order) => order.status === orderFilter
    );
  }, [orders, orderFilter]);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);

    if (tab === "orders" || tab === "kitchen") {
      fetchOrders();
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* =========================================================
     ORDER LOCATION
  ========================================================= */

  const getLocationLabel = (order) => {
    if (order.locationType === "room") {
      return `Room ${
        order.locationNumber ||
        order.roomNumber ||
        "-"
      }`;
    }

    return `Table ${
      order.locationNumber ||
      order.roomNumber ||
      "-"
    }`;
  };

  /* =========================================================
     RENDER ORDER CARD
  ========================================================= */

  const renderOrderCard = (order) => {
    const status =
      STATUS_CONFIG[order.status] ||
      STATUS_CONFIG.pending;

    const StatusIcon = status.icon;

    return (
      <div
        key={order._id}
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
      >
        {/* TOP */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">
                {getLocationLabel(order)}
              </span>

              <span
                className={`rounded-full border px-2.5 py-1 text-xs ${status.className}`}
              >
                <span className="flex items-center gap-1">
                  <StatusIcon size={12} />
                  {status.label}
                </span>
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-400">
              {order.guestName || "Guest"} •{" "}
              {formatTime(order.createdAt)}
            </p>
          </div>

          <div className="text-right">
            <p
              className="text-lg font-bold"
              style={{ color: accentColor }}
            >
              ₹{Number(order.totalAmount || 0).toFixed(2)}
            </p>

            <p className="text-xs text-gray-500">
              #{order._id?.slice(-6)}
            </p>
          </div>
        </div>

        {/* ITEMS */}
        <div className="mt-4 space-y-2">
          {order.items?.map((item, index) => (
            <div
              key={`${order._id}-${index}`}
              className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                  style={{
                    background: `${primaryColor}40`,
                    color: accentColor,
                  }}
                >
                  {item.quantity}
                </span>

                <span className="text-sm">
                  {item.name}
                </span>
              </div>

              <span className="text-sm text-gray-400">
                ₹
                {Number(
                  item.price * item.quantity
                ).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-xs text-gray-500">
            {order.items?.length || 0} item
            {(order.items?.length || 0) !== 1
              ? "s"
              : ""}
          </span>

          <button
            onClick={() => changeTab("kitchen")}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition hover:bg-white/10"
            style={{ color: accentColor }}
          >
            Manage
            <FiArrowRight size={13} />
          </button>
        </div>
      </div>
    );
  };

  /* =========================================================
     STAT CARD
  ========================================================= */

  const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
  }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            background: `${primaryColor}30`,
            color: accentColor,
          }}
        >
          <Icon size={19} />
        </div>
      </div>
    </div>
  );

  /* =========================================================
     SIDEBAR
  ========================================================= */

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* BRAND */}
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          {hotel?.logo ? (
            <img
              src={hotel.logo}
              alt={hotel.name || "Hotel"}
              className="h-11 w-11 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold"
              style={{
                background: primaryColor,
              }}
            >
              {hotel?.name
                ?.charAt(0)
                ?.toUpperCase() || "F"}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-bold">
              {hotel?.name || "FlexiOrder"}
            </h1>

            <p className="truncate text-xs text-gray-500">
              Owner Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          Management
        </p>

        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() =>
                  changeTab(item.key)
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  active
                    ? "text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                style={
                  active
                    ? {
                        background: `${primaryColor}35`,
                        color: accentColor,
                      }
                    : {}
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>

                {item.key === "kitchen" &&
                  orderStats.active > 0 && (
                    <span
                      className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: primaryColor,
                        color: "white",
                      }}
                    >
                      {orderStats.active}
                    </span>
                  )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* USER / LOGOUT */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-gray-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  /* =========================================================
     HEADER
  ========================================================= */

  const Header = () => (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/50 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* MOBILE MENU */}
          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="rounded-xl p-2 text-gray-300 hover:bg-white/10 md:hidden"
          >
            <FiMenu size={21} />
          </button>

          <div>
            <p className="text-xs text-gray-500">
              {hotel?.name || "FlexiOrder"}
            </p>

            <h2 className="font-semibold">
              {activeTab === "overview"
                ? "Overview"
                : NAV_ITEMS.find(
                    (item) =>
                      item.key === activeTab
                  )?.label || "Dashboard"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* REFRESH */}
          <button
            onClick={() => {
              fetchHotel();
              fetchOrders();
            }}
            className="rounded-xl p-2.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            title="Refresh"
          >
            <FiRefreshCw
              size={18}
              className={
                loadingOrders
                  ? "animate-spin"
                  : ""
              }
            />
          </button>

          {/* NOTIFICATION */}
          <button
            className="relative rounded-xl p-2.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            title="Notifications"
          >
            <FiBell size={18} />

            {orderStats.pending > 0 && (
              <span
                className="absolute right-1 top-1 h-2 w-2 rounded-full"
                style={{
                  background: primaryColor,
                }}
              />
            )}
          </button>

          {/* PROFILE */}
          <div className="hidden items-center gap-2 border-l border-white/10 pl-3 sm:flex">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: primaryColor,
              }}
            >
              O
            </div>

            <div className="hidden lg:block">
              <p className="text-xs font-medium">
                Owner
              </p>

              <p className="text-[10px] text-gray-500">
                Administrator
              </p>
            </div>

            <FiChevronDown
              size={14}
              className="text-gray-500"
            />
          </div>
        </div>
      </div>
    </header>
  );

  /* =========================================================
     OVERVIEW
  ========================================================= */

  const Overview = () => (
    <div className="space-y-6">
      {/* WELCOME */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}35, rgba(255,255,255,0.03))`,
        }}
      >
        <div className="relative z-10 max-w-2xl">
          <p
            className="text-sm font-medium"
            style={{ color: accentColor }}
          >
            Welcome back
          </p>

          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            {hotel?.name ||
              "Manage your restaurant"}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
            Monitor orders, manage your menu,
            coordinate your kitchen and keep
            your restaurant operations running
            smoothly.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() =>
                changeTab("kitchen")
              }
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{
                background: primaryColor,
              }}
            >
              <FiActivity size={16} />
              Open Kitchen
            </button>

            <button
              onClick={() =>
                changeTab("menu")
              }
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              <FiPackage size={16} />
              Manage Menu
            </button>
          </div>
        </div>

        <div
          className="absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-20 blur-3xl"
          style={{
            background: primaryColor,
          }}
        />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={FiShoppingBag}
          title="Total Orders"
          value={orderStats.total}
          subtitle="All orders"
        />

        <StatCard
          icon={FiClock}
          title="Active Orders"
          value={orderStats.active}
          subtitle={`${orderStats.pending} new`}
        />

        <StatCard
          icon={FiActivity}
          title="Preparing"
          value={orderStats.preparing}
          subtitle="Kitchen queue"
        />

        <StatCard
          icon={FiBarChart2}
          title="Revenue"
          value={`₹${orderStats.revenue.toFixed(
            2
          )}`}
          subtitle="Current loaded orders"
        />
      </div>

      {/* QUICK ACTIONS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Quick Actions
            </h2>

            <p className="text-xs text-gray-500">
              Manage your restaurant quickly
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <button
            onClick={() =>
              changeTab("kitchen")
            }
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `${primaryColor}25`,
                color: accentColor,
              }}
            >
              <FiActivity size={19} />
            </div>

            <p className="font-semibold">
              Kitchen
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {orderStats.active} active orders
            </p>
          </button>

          <button
            onClick={() =>
              changeTab("menu")
            }
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `${primaryColor}25`,
                color: accentColor,
              }}
            >
              <FiPackage size={19} />
            </div>

            <p className="font-semibold">
              Menu
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Manage dishes
            </p>
          </button>

          <button
            onClick={() =>
              changeTab("staff")
            }
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `${primaryColor}25`,
                color: accentColor,
              }}
            >
              <FiUsers size={19} />
            </div>

            <p className="font-semibold">
              Staff
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Manage team
            </p>
          </button>

          <button
            onClick={() =>
              changeTab("tables")
            }
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]"
          >
            <div
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: `${primaryColor}25`,
                color: accentColor,
              }}
            >
              <FiTable size={19} />
            </div>

            <p className="font-semibold">
              QR Tables
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Manage QR codes
            </p>
          </button>
        </div>
      </section>

      {/* RECENT ORDERS */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">
              Recent Orders
            </h2>

            <p className="text-xs text-gray-500">
              Latest activity
            </p>
          </div>

          <button
            onClick={() =>
              changeTab("orders")
            }
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: accentColor }}
          >
            View all
            <FiArrowRight size={13} />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center">
            <FiShoppingBag
              className="mx-auto text-gray-600"
              size={28}
            />

            <p className="mt-3 text-sm text-gray-400">
              No orders yet
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {orders
              .slice(0, 4)
              .map(renderOrderCard)}
          </div>
        )}
      </section>
    </div>
  );

  /* =========================================================
     KITCHEN
  ========================================================= */

  const Kitchen = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Kitchen Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage live orders and kitchen
            workflow.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"
        >
          <FiRefreshCw
            size={16}
            className={
              loadingOrders
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* KITCHEN STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={FiClock}
          title="New"
          value={orderStats.pending}
          subtitle="Awaiting action"
        />

        <StatCard
          icon={FiActivity}
          title="Preparing"
          value={orderStats.preparing}
          subtitle="In kitchen"
        />

        <StatCard
          icon={FiCheckCircle}
          title="Ready"
          value={orderStats.ready}
          subtitle="Ready to serve"
        />

        <StatCard
          icon={FiShoppingBag}
          title="Active"
          value={orderStats.active}
          subtitle="Current orders"
        />
      </div>

      {/* FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          {
            key: "all",
            label: "All",
          },
          {
            key: "pending",
            label: "New",
          },
          {
            key: "accepted",
            label: "Accepted",
          },
          {
            key: "preparing",
            label: "Preparing",
          },
          {
            key: "ready",
            label: "Ready",
          },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() =>
              setOrderFilter(filter.key)
            }
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
              orderFilter === filter.key
                ? "text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
            style={
              orderFilter === filter.key
                ? {
                    background: primaryColor,
                  }
                : {}
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* ORDERS */}
      {loadingOrders ? (
        <div className="rounded-2xl border border-white/10 py-20 text-center">
          <FiRefreshCw
            className="mx-auto animate-spin text-gray-500"
            size={28}
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading kitchen orders...
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <FiCheckCircle
            className="mx-auto text-gray-600"
            size={30}
          />

          <h3 className="mt-3 font-semibold">
            No orders found
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Your kitchen is clear right now.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredOrders.map(
            renderOrderCard
          )}
        </div>
      )}
    </div>
  );

  /* =========================================================
     ORDERS
  ========================================================= */

  const Orders = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Orders
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and monitor all restaurant
            orders.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          style={{
            background: primaryColor,
          }}
        >
          <FiRefreshCw
            size={16}
            className={
              loadingOrders
                ? "animate-spin"
                : ""
            }
          />
          Refresh Orders
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={FiShoppingBag}
          title="All Orders"
          value={orderStats.total}
        />

        <StatCard
          icon={FiClock}
          title="Pending"
          value={orderStats.pending}
        />

        <StatCard
          icon={FiActivity}
          title="Preparing"
          value={orderStats.preparing}
        />

        <StatCard
          icon={FiCheckCircle}
          title="Completed"
          value={orderStats.completed}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ["all", "All"],
          ["active", "Active"],
          ["pending", "Pending"],
          ["preparing", "Preparing"],
          ["ready", "Ready"],
          ["delivered", "Completed"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() =>
              setOrderFilter(key)
            }
            className="whitespace-nowrap rounded-xl px-4 py-2 text-sm"
            style={
              orderFilter === key
                ? {
                    background: primaryColor,
                    color: "white",
                  }
                : {
                    background:
                      "rgba(255,255,255,0.05)",
                    color: "#9CA3AF",
                  }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loadingOrders ? (
        <div className="py-20 text-center text-gray-500">
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-gray-500">
          No orders found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(
            renderOrderCard
          )}
        </div>
      )}
    </div>
  );

  /* =========================================================
     MENU
  ========================================================= */

  const Menu = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Menu Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Add, edit and manage your dishes.
          </p>
        </div>

        <button
          onClick={() =>
            setRefreshKey(
              (value) => value + 1
            )
          }
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"
        >
          <FiRefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
        <OwnerMenuManager
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
        />
      </div>
    </div>
  );

  /* =========================================================
     STAFF
  ========================================================= */

  const Staff = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          Staff Management
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage staff members for your hotel.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
        <StaffManager />
      </div>
    </div>
  );

  /* =========================================================
     TABLES
  ========================================================= */

  const Tables = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          QR Tables
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create and manage table QR codes.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
        <TableQRManager
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
        />
      </div>
    </div>
  );

  /* =========================================================
     ANALYTICS
  ========================================================= */

  const Analytics = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          Analytics
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Monitor your restaurant performance.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
        <AnalyticsDashboard />
      </div>
    </div>
  );

  /* =========================================================
     INVENTORY
  ========================================================= */

  const Inventory = () => (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">
          QR Inventory
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your generated QR inventory.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:p-5">
        <QRInventory
          refreshKey={refreshKey}
          setRefreshKey={setRefreshKey}
        />
      </div>
    </div>
  );

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          secondaryColor || "#0F172A",
      }}
    >
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        >
          <aside
            className="h-full w-[280px] border-r border-white/10 bg-[#0B1120]"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex justify-end p-3">
              <button
                onClick={() =>
                  setSidebarOpen(false)
                }
                className="rounded-xl p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="h-[calc(100%-60px)]">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="fixed hidden h-screen w-[250px] border-r border-white/10 bg-black/20 md:block">
          <SidebarContent />
        </aside>

        {/* MAIN */}
        <div className="w-full md:ml-[250px]">
          <Header />

          <main className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
            {activeTab === "overview" && (
              <Overview />
            )}

            {activeTab === "kitchen" && (
              <Kitchen />
            )}

            {activeTab === "orders" && (
              <Orders />
            )}

            {activeTab === "menu" && <Menu />}

            {activeTab === "staff" && (
              <Staff />
            )}

            {activeTab === "tables" && (
              <Tables />
            )}

            {activeTab === "analytics" && (
              <Analytics />
            )}

            {activeTab === "inventory" && (
              <Inventory />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}