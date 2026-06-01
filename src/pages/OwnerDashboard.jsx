import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import QRInventory from "./QRInventoryPage";
import socket from "../socket";

import api from "../api/axios";

/* =========================
   THEME SYSTEM
========================= */
const THEME_MAP = {
  stormy_morning: {
    primary: "#64748B",
    secondary: "#0F172A",
  },

  mossy_hollow: {
    primary: "#4D7C0F",
    secondary: "#1A2E05",
  },

  blue_eclipse: {
    primary: "#1E293B",
    secondary: "#020617",
  },

  lush_forest: {
    primary: "#14532D",
    secondary: "#052E16",
  },

  green_juice: {
    primary: "#16A34A",
    secondary: "#052E16",
  },

  chili_spice: {
    primary: "#DC2626",
    secondary: "#1F0A0A",
  },

  chocolate_truffle: {
    primary: "#7C2D12",
    secondary: "#1C0A00",
  },

  ink_wash: {
    primary: "#111827",
    secondary: "#F8FAFC",
  },
};

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState("menu");

  const [orders, setOrders] = useState([]);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [hotel, setHotel] = useState(null);

  const [refreshKey, setRefreshKey] =
    useState(0);

  /* =========================
     FETCH HOTEL
  ========================= */
  const fetchHotel = async () => {
    try {
      const res = await api.get("/hotel/me", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "token"
          )}`,
        },
      });

      setHotel(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  /* =========================
     FETCH ORDERS
  ========================= */
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);

      const res = await api.get("/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "token"
          )}`,
        },
      });

      setOrders(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  /* =========================
     INITIAL LOAD
  ========================= */
  useEffect(() => {
    fetchHotel();
  }, []);

  /* =========================
     LIVE ORDER REFRESH
  ========================= */
 useEffect(() => {

  if (activeTab !== "orders") return;

  fetchOrders();

  // NEW ORDER
  socket.on("newOrder", (newOrder) => {

    setOrders((prev) => [
      newOrder,
      ...prev,
    ]);

  });

  // ORDER UPDATED
  socket.on(
    "orderUpdated",
    (updatedOrder) => {

      setOrders((prev) =>
        prev.map((o) =>
          o._id === updatedOrder._id
            ? updatedOrder
            : o
        )
      );

    }
  );

  return () => {

    socket.off("newOrder");

    socket.off("orderUpdated");

  };

}, [activeTab]);

  /* =========================
     THEME
  ========================= */
  const theme =
    THEME_MAP[hotel?.theme?.themeId] || {};

  const primaryColor =
    hotel?.theme?.primaryColor ||
    theme.primary ||
    "#F97316";

  const secondaryColor =
    hotel?.theme?.secondaryColor ||
    theme.secondary ||
    "#0F172A";

  /* =========================
     LOGOUT
  ========================= */
  const handleLogout = () => {
   localStorage.removeItem("token");

  localStorage.removeItem("user");

  localStorage.removeItem("role");


    navigate("/login");
  };

  /* =========================
     BUTTON STYLE
  ========================= */
  const getButtonStyle = (active) => ({
    background: active
      ? primaryColor
      : "rgba(255,255,255,0.06)",

    color: "white",
  });

  const tabs = [
    {
      key: "menu",
      label: "Menu",
    },

    {
      key: "orders",
      label: "Orders",
    },

    {
      key: "staff",
      label: "Staff",
    },

    {
      key: "analytics",
      label: "Analytics",
    },

    {
      key: "tables",
      label: "QR Tables",
    },

    {
      key: "inventory",
      label: "Inventory",
    },
  ];

  return (
    <div
      className="min-h-screen text-white flex flex-col md:flex-row"
      style={{
        background: secondaryColor,
      }}
    >
      {/* =========================
          MOBILE NAVBAR
      ========================= */}
      <div className="md:hidden sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 p-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key)
              }
              className="px-4 py-2 rounded-xl whitespace-nowrap text-sm"
              style={getButtonStyle(
                activeTab === tab.key
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================
          SIDEBAR
      ========================= */}
      <aside
        className="w-[260px] border-r border-white/10 p-6 hidden md:block backdrop-blur-lg"
        style={{
          background: "#111827",
        }}
      >
        {/* LOGO */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                alt="logo"
                className="w-10 h-10 rounded-full object-cover"
              />
            )}

            {hotel?.name || "FlexiOrder"}
          </h1>

          <p className="text-gray-400 mt-2">
            {hotel?.tagline ||
              "Owner Panel"}
          </p>
        </div>

        {/* NAVIGATION */}
        <div className="mt-10 space-y-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key)
              }
              className="w-full text-left px-4 py-3 rounded-2xl transition-all"
              style={getButtonStyle(
                activeTab === tab.key
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}
      <main className="flex-1 p-3 md:p-6">
        {/* =========================
            HEADER
        ========================= */}
        <div
          className="
            flex flex-col md:flex-row
            gap-5
            md:justify-between
            md:items-center
            p-4 md:p-6
            rounded-3xl
            mb-6
            overflow-hidden
          "
          style={{
            backgroundImage:
              hotel?.coverImage
                ? `url(${hotel.coverImage})`
                : "none",

            backgroundSize: "cover",

            backgroundPosition: "center",

            backgroundColor:
              secondaryColor,
          }}
        >
          {/* LEFT */}
          <div className="flex items-center gap-4">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                alt="logo"
                className="w-14 h-14 rounded-full object-cover border border-white/20"
              />
            )}

            <div>
              <h2 className="text-2xl md:text-4xl font-bold">
                {hotel?.name ||
                  "Owner Dashboard"}
              </h2>

              <p className="text-gray-300 mt-1">
                Manage your hotel
                operations
              </p>
            </div>
          </div>

          {/* RIGHT */}
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-5 py-3 rounded-2xl font-medium"
            style={{
              background: primaryColor,
            }}
          >
            Logout
          </button>
        </div>

        {/* =========================
            TAB CONTENT
        ========================= */}
        <div className="mt-6">
          {/* MENU */}
          {activeTab === "menu" && (
            <OwnerMenuManager
              refreshKey={refreshKey}
              setRefreshKey={
                setRefreshKey
              }
            />
          )}

          {/* ORDERS */}
          {activeTab === "orders" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
              <div className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold">
                  Live Orders
                </h2>

                <button
                  onClick={fetchOrders}
                  className="px-5 py-2 rounded-xl"
                  style={{
                    background:
                      primaryColor,
                  }}
                >
                  Refresh
                </button>
              </div>

              {loadingOrders ? (
                <div className="text-center py-20 text-gray-400">
                  Loading orders...
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  No orders yet
                </div>
              ) : (
                <div className="space-y-5">
                  {orders.map(
                    (order) => (
                      <div
                        key={order._id}
                        className="bg-black/30 border border-white/10 rounded-3xl p-4 md:p-6"
                      >
                        {/* TOP */}
                        <div className="flex flex-col md:flex-row gap-4 md:justify-between">
                          <div>
                            <h2
  className="text-3xl font-black"
  style={{ color: primaryColor }}
>
  {order.locationType === "room"
    ? `Room: ${
        order.locationNumber || order.roomNumber
      }`
    : `Table: ${
        order.locationNumber || order.roomNumber
      }`}
</h2>

                            <p className="text-gray-400 mt-1">
                              Guest:{" "}
                              {
                                order.guestName
                              }
                            </p>
                          </div>

                          <div className="md:text-right">
                            <p
                              className="text-2xl font-bold"
                              style={{
                                color:
                                  primaryColor,
                              }}
                            >
                              ₹
                              {
                                order.totalAmount
                              }
                            </p>

                            <span className="text-yellow-300 text-sm">
                              {
                                order.status
                              }
                            </span>
                          </div>
                        </div>

                        {/* ITEMS */}
                        <div className="mt-5 space-y-3">
                          {order.items.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={index}
                                className="
                                  flex justify-between items-center
                                  gap-3
                                  bg-white/5
                                  p-3
                                  rounded-xl
                                "
                              >
                                <div>
                                  <p className="font-medium">
                                    {
                                      item.name
                                    }
                                  </p>

                                  <p className="text-sm text-gray-400">
                                    Qty:{" "}
                                    {
                                      item.quantity
                                    }
                                  </p>
                                </div>

                                <span
                                  className="font-semibold"
                                  style={{
                                    color:
                                      primaryColor,
                                  }}
                                >
                                  ₹
                                  {item.price *
                                    item.quantity}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* STAFF */}
          {activeTab === "staff" && (
            <StaffManager />
          )}

          {/* ANALYTICS */}
          {activeTab ===
            "analytics" && (
            <AnalyticsDashboard />
          )}

          {/* QR TABLES */}
          {activeTab === "tables" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold">
                QR Tables
              </h2>

              <div className="mt-6">
                <TableQRManager
                  refreshKey={
                    refreshKey
                  }
                  setRefreshKey={
                    setRefreshKey
                  }
                />
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {activeTab ===
            "inventory" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-4 md:p-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                QR Inventory
              </h2>

              <QRInventory
                refreshKey={
                  refreshKey
                }
                setRefreshKey={
                  setRefreshKey
                }
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}