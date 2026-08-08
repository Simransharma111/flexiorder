import { useEffect, useState } from "react";
import api from "../api/axios";
import StaffOrder from "./StaffOrder";
import Orders from "../components/ownerdashboard/Orders";

export default function StaffWorkspace() {
  const [hotel, setHotel] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [hotelResponse, ordersResponse] = await Promise.all([
        api.get("/hotel/me"),
        api.get("/kitchen/orders?type=kitchen"),
      ]);
      setHotel(hotelResponse.data?.hotel || hotelResponse.data);
      setOrders(ordersResponse.data?.orders || []);
    } catch (error) {
      console.error("Staff workspace loading failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = window.setInterval(fetchData, 15000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading && !hotel) {
    return (
      <div className="flex min-h-screen items-center justify-center font-bold">
        Loading workspace...
      </div>
    );
  }

  const primaryColor = hotel?.theme?.primary || "#f97316";

  return (
    <main className="min-h-screen bg-gray-50 p-3 sm:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex rounded-2xl border bg-white p-1 shadow-sm">
          {[
            ["orders", "Orders"],
            ["take", "Take Order"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                activeTab === value
                  ? "text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              style={activeTab === value ? { background: primaryColor } : undefined}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "take" ? (
          <StaffOrder hotel={hotel} />
        ) : (
          <Orders
            orders={orders}
            refresh={fetchData}
            primaryColor={primaryColor}
          />
        )}
      </div>
    </main>
  );
}
