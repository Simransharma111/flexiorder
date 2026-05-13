import {
  useEffect,
  useState,
} from "react";

import api from "../api/axios";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsDashboard() {

  const [data, setData] =
    useState(null);

  // FETCH ANALYTICS
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics =
    async () => {

      try {

        const token =
          localStorage.getItem(
            "token"
          );

        const res =
          await api.get(
            "/analytics",
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setData(res.data);

      } catch (err) {

        console.error(err);

      }
    };

  if (!data) {
    return (
      <div className="text-white">
        Loading analytics...
      </div>
    );
  }
  const downloadCSV =
  async () => {

    try {

      const token =
        localStorage.getItem(
          "token"
        );

      const response = await api.get(
  "/analytics/today-csv",
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob",
  }
);
      if (!response.ok) {

        throw new Error(
          "Failed to download CSV"
        );

      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const a =
        document.createElement(
          "a"
        );

      a.href = url;

      a.download =
        "today-orders.csv";

      document.body.appendChild(a);

      a.click();

      a.remove();

    } catch (err) {

      console.error(err);

      alert(
        "CSV download failed"
      );

    }

};

  return (
    <div>

      {/* CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <p className="text-gray-400">
            Revenue
          </p>

          <h2 className="text-4xl font-bold mt-3">
            ₹{data.totalRevenue}
          </h2>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <p className="text-gray-400">
            Orders
          </p>

          <h2 className="text-4xl font-bold mt-3">
            {data.totalOrders}
          </h2>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <p className="text-gray-400">
            Avg Order
          </p>

          <h2 className="text-4xl font-bold mt-3">
            ₹{data.avgOrderValue}
          </h2>

        </div>

      </div>

      {/* CHART */}

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mt-10">

        <h2 className="text-2xl font-bold mb-6">
          Popular Dishes
        </h2>

        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <BarChart
              data={
                data.popularDishes
              }
            >

              <XAxis
                dataKey="name"
              />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="qty"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* ORDER STATUS */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <p className="text-gray-400">
            Pending Orders
          </p>

          <h2 className="text-4xl font-bold mt-3 text-orange-400">
            {data.pendingOrders}
          </h2>

        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <p className="text-gray-400">
            Completed Orders
          </p>

          <h2 className="text-4xl font-bold mt-3 text-green-400">
            {data.completedOrders}
          </h2>
<button
  onClick={downloadCSV}
  className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-2xl font-bold"
>
  Download Today's CSV
</button>
        </div>

      </div>

    </div>
  );
}