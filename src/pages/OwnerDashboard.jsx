import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import OwnerMenuManager from "../components/OwnerMenuManager";
import TableQRManager from "../components/TableQRManager";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import StaffManager from "../components/StaffManager";

import api from "../api/axios";

export default function OwnerDashboard() {

  const [activeTab, setActiveTab] =
    useState("menu");

  const navigate = useNavigate();

  // =========================
  // ORDERS STATE
  // =========================

  const [orders, setOrders] =
    useState([]);

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  // =========================
  // FETCH ORDERS
  // =========================

  const fetchOrders = async () => {

    try {

      setLoadingOrders(true);

      const token =
        localStorage.getItem("token");

     const res = await api.get("/orders", {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setOrders(res.data);

    } catch (err) {

      console.log(err);

    } finally {

      setLoadingOrders(false);

    }
  };

  // =========================
  // LOAD WHEN TAB CHANGES
  // =========================

  useEffect(() => {

    if (activeTab === "orders") {
      fetchOrders();
    }

  }, [activeTab]);

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    navigate("/login");

  };

  return (

    <div className="min-h-screen bg-[#0F172A] text-white flex">

      {/* SIDEBAR */}

      <aside className="w-[260px] bg-[#111827] border-r border-white/10 p-6 hidden md:block">

        <h1 className="text-3xl font-bold">
          FlexiOrder
        </h1>

        <p className="text-gray-400 mt-2">
          Owner Panel
        </p>

        <div className="mt-10 space-y-3">

          <button
            onClick={() => setActiveTab("menu")}
            className={`w-full text-left px-4 py-3 rounded-2xl transition ${
              activeTab === "menu"
                ? "bg-orange-500"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Menu Management
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full text-left px-4 py-3 rounded-2xl transition ${
              activeTab === "orders"
                ? "bg-orange-500"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Orders
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className={`w-full text-left px-4 py-3 rounded-2xl transition ${
              activeTab === "staff"
                ? "bg-orange-500"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Staff
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`w-full text-left px-4 py-3 rounded-2xl transition ${
              activeTab === "analytics"
                ? "bg-orange-500"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            Analytics
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`w-full text-left px-4 py-3 rounded-2xl transition ${
              activeTab === "qr"
                ? "bg-orange-500"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            QR Tables
          </button>

        </div>

      </aside>

      {/* MAIN */}

      <main className="flex-1 p-6">

        {/* TOPBAR */}

        <div className="flex justify-between items-center">

          <div>

            <h2 className="text-4xl font-bold">
              Owner Dashboard
            </h2>

            <p className="text-gray-400 mt-2">
              Manage your hotel operations
            </p>

          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-5 py-3 rounded-2xl font-medium"
          >
            Logout
          </button>

        </div>

        {/* CONTENT */}

        <div className="mt-10">

          {/* MENU */}

          {activeTab === "menu" && (
            <OwnerMenuManager />
          )}

          {/* QR */}

          {activeTab === "qr" && (

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

              <h2 className="text-3xl font-bold">
                QR Table Manager
              </h2>

              <div className="mt-8">
                <TableQRManager />
              </div>

            </div>

          )}

          {/* ORDERS */}

          {activeTab === "orders" && (

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

              <div className="flex justify-between items-center mb-8">

                <h2 className="text-3xl font-bold">
                  Live Orders
                </h2>

                <button
                  onClick={fetchOrders}
                  className="bg-orange-500 hover:bg-orange-600 px-5 py-2 rounded-xl"
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

                      {/* TOP */}

                      <div className="flex flex-col md:flex-row md:justify-between gap-4">

                        <div>

                          <h3 className="text-2xl font-bold">

                            Table:
                            {" "}
                            {order.table?.tableNumber || "N/A"}

                          </h3>

                          <p className="text-gray-400 mt-1">

                            Guest:
                            {" "}
                            {order.guestName}

                          </p>

                        </div>

                        <div className="text-left md:text-right">

                          <p className="text-orange-400 text-2xl font-bold">

                            ₹{order.totalAmount}

                          </p>

                          <span className="text-sm bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full inline-block mt-2">

                            {order.status}

                          </span>

                        </div>

                      </div>

                      {/* ITEMS */}

                      <div className="mt-6 space-y-3">

                        {order.items.map((item, index) => (

                          <div
                            key={index}
                            className="flex justify-between items-center bg-white/5 rounded-2xl px-4 py-3"
                          >

                            <div>

                              <h4 className="font-semibold">
                                {item.name}
                              </h4>

                              <p className="text-sm text-gray-400">
                                Qty: {item.quantity}
                              </p>

                            </div>

                            <p className="font-bold text-orange-300">
                              ₹{item.price * item.quantity}
                            </p>

                          </div>

                        ))}

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          )}

          {/* STAFF */}

          {activeTab === "staff" && (
            <StaffManager />
          )}

          {/* ANALYTICS */}

          {activeTab === "analytics" && (
            <AnalyticsDashboard />
          )}

        </div>

      </main>

    </div>
  );
}