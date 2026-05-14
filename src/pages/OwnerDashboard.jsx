import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";
import QRInventory from "./QRInventoryPage";

import api from "../api/axios";

/* =========================
   THEME SYSTEM
========================= */
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

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState("menu");
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [hotel, setHotel] = useState(null);

  /* =========================
     FETCH HOTEL
  ========================= */
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

  /* =========================
     FETCH ORDERS
  ========================= */
  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);

      const res = await api.get("/orders", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setOrders(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchHotel();
  }, []);

  useEffect(() => {
    if (activeTab === "orders") fetchOrders();
  }, [activeTab]);

  /* =========================
     THEME RESOLVE
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const getButtonStyle = (active) => ({
    background: active ? primaryColor : "rgba(255,255,255,0.05)",
    color: "white",
  });

  return (
    <div
      className="min-h-screen text-white flex"
      style={{ background: secondaryColor }}
    >
      {/* ================= SIDEBAR ================= */}
      <aside
        className="w-[260px] border-r border-white/10 p-6 hidden md:block backdrop-blur-lg"
        style={{ background: "#111827" }}
      >
        <h1 className="text-3xl font-bold flex items-center gap-3">
          {hotel?.logo && (
            <img
              src={hotel.logo}
              className="w-10 h-10 rounded-full object-cover"
              alt="logo"
            />
          )}
          {hotel?.name || "FlexiOrder"}
        </h1>

        <p className="text-gray-400 mt-2">
          {hotel?.tagline || "Owner Panel"}
        </p>

        <div className="mt-10 space-y-3">
          <button
            onClick={() => setActiveTab("menu")}
            className="w-full text-left px-4 py-3 rounded-2xl"
            style={getButtonStyle(activeTab === "menu")}
          >
            Menu Management
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className="w-full text-left px-4 py-3 rounded-2xl"
            style={getButtonStyle(activeTab === "orders")}
          >
            Orders
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className="w-full text-left px-4 py-3 rounded-2xl"
            style={getButtonStyle(activeTab === "staff")}
          >
            Staff
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className="w-full text-left px-4 py-3 rounded-2xl"
            style={getButtonStyle(activeTab === "analytics")}
          >
            Analytics
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className="w-full text-left px-4 py-3 rounded-2xl"
            style={getButtonStyle(activeTab === "qr")}
          >
            QR Tables
          </button>
          <button
  onClick={() => setActiveTab("qr")}
  className="w-full text-left px-4 py-3 rounded-2xl"
  style={getButtonStyle(activeTab === "qr")}
>
  QR Inventory
</button>
        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex-1 p-6">
        
        {/* HEADER WITH COVER IMAGE */}
        <div
          className="flex justify-between items-center p-6 rounded-3xl mb-6"
          style={{
            backgroundImage: hotel?.coverImage
              ? `url(${hotel.coverImage})`
              : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: secondaryColor,
          }}
        >
          <div className="flex items-center gap-4">
            {hotel?.logo && (
              <img
                src={hotel.logo}
                className="w-14 h-14 rounded-full object-cover border"
                alt="logo"
              />
            )}

            <div>
              <h2 className="text-4xl font-bold">
                {hotel?.name || "Owner Dashboard"}
              </h2>
              <p className="text-gray-300">
                Manage your hotel operations
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-5 py-3 rounded-2xl font-medium"
            style={{ background: primaryColor }}
          >
            Logout
          </button>
        </div>

        {/* CONTENT */}
        <div className="mt-10">
          
          {activeTab === "menu" && (
            <OwnerMenuManager />
          )}

          {activeTab === "qr" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              <h2 className="text-3xl font-bold">QR Manager</h2>
              <div className="mt-8">
                <TableQRManager />
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Live Orders</h2>

                <button
                  onClick={fetchOrders}
                  className="px-5 py-2 rounded-xl"
                  style={{ background: primaryColor }}
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
                  {orders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-black/30 border border-white/10 rounded-3xl p-6"
                    >
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-2xl font-bold">
                            {order.table?.type === "room"
                              ? "Room"
                              : "Table"}{" "}
                            {order.table?.tableNumber}
                          </h3>
                          <p className="text-gray-400">
                            Guest: {order.guestName}
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className="text-2xl font-bold"
                            style={{ color: primaryColor }}
                          >
                            ₹{order.totalAmount}
                          </p>
                          <span className="text-yellow-300 text-sm">
                            {order.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex justify-between bg-white/5 p-3 rounded-xl"
                          >
                            <span>{item.name}</span>
                            <span style={{ color: primaryColor }}>
                              ₹{item.price * item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "staff" && <StaffManager />}

          {activeTab === "analytics" && (
            <AnalyticsDashboard />
          )}
          {activeTab === "qr" && (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
    <h2 className="text-3xl font-bold mb-6">QR Inventory</h2>

    <QRInventory />
  </div>
)}
        </div>
      </main>
    </div>
  );
}