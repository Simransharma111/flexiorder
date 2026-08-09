import { useCallback, useEffect, useState, useMemo } from "react";
import { FiDownload, FiRefreshCw, FiTrendingUp, FiShoppingBag, FiCreditCard, FiClock, FiCheckCircle } from "react-icons/fi";
import api from "../api/axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currency = (value) => `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

export default function AnalyticsDashboard({ hotel, orders = [], advancedEnabled = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Selected metric tab: "revenue" | "orders" | "aov" | "dishes"
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  // Selected timeframe: "daily" | "weekly" | "quarterly"
  const [timeframe, setTimeframe] = useState("daily");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/analytics");
      setData(response.data || {});
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Analytics could not be loaded. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const downloadCSV = async () => {
    try {
      const response = await api.get("/analytics/today-csv", { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "today-orders.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      console.error(requestError);
      window.alert("Today's report could not be downloaded. Try again when the connection is stable.");
    }
  };

  // Helper to parse dates safely
  const getOrderDate = (order) => new Date(order.createdAt || order.queuedAt || order.updatedAt || Date.now());

  // Filter out cancelled orders
  const validOrders = useMemo(() => {
    return orders.filter(o => o.status !== "cancelled");
  }, [orders]);

  // Aggregate Metrics based on timeframe
  const filteredOrdersForTimeframe = useMemo(() => {
    const now = new Date();
    return validOrders.filter(order => {
      const date = getOrderDate(order);
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeframe === "daily") {
        // Today
        return date.toDateString() === now.toDateString();
      } else if (timeframe === "weekly") {
        // Last 7 days
        return diffDays <= 7;
      } else if (timeframe === "quarterly") {
        // Last 90 days
        return diffDays <= 90;
      }
      return true;
    });
  }, [validOrders, timeframe]);

  // Calculate high level stats from current timeframe
  const stats = useMemo(() => {
    const totalOrders = filteredOrdersForTimeframe.length;
    const totalRevenue = filteredOrdersForTimeframe.reduce((sum, o) => sum + Number(o.totalAmount || o.total || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const pendingOrders = filteredOrdersForTimeframe.filter(o => ["pending", "accepted", "preparing", "paused"].includes(o.status)).length;
    const completedOrders = filteredOrdersForTimeframe.filter(o => o.status === "delivered").length;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      pendingOrders,
      completedOrders
    };
  }, [filteredOrdersForTimeframe]);

  // Generate Chart Data based on timeframe
  const chartData = useMemo(() => {
    if (timeframe === "daily") {
      // Group by Hour for today
      const hours = Array.from({ length: 24 }, (_, i) => ({
        name: `${i}:00`,
        revenue: 0,
        orders: 0,
        hour: i
      }));
      
      filteredOrdersForTimeframe.forEach(order => {
        const date = getOrderDate(order);
        const hour = date.getHours();
        const amount = Number(order.totalAmount || order.total || 0);
        hours[hour].revenue += amount;
        hours[hour].orders += 1;
      });

      return hours.map(h => ({
        ...h,
        aov: h.orders > 0 ? Math.round(h.revenue / h.orders) : 0
      }));
    } else if (timeframe === "weekly") {
      // Group by last 7 Days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
          dateStr: d.toDateString(),
          name: d.toLocaleDateString([], { weekday: "short", day: "numeric" }),
          revenue: 0,
          orders: 0
        });
      }

      filteredOrdersForTimeframe.forEach(order => {
        const date = getOrderDate(order);
        const dateStr = date.toDateString();
        const bucket = days.find(day => day.dateStr === dateStr);
        if (bucket) {
          bucket.revenue += Number(order.totalAmount || order.total || 0);
          bucket.orders += 1;
        }
      });

      return days.map(d => ({
        ...d,
        aov: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0
      }));
    } else {
      // Quarterly - Group by Week (last 12 weeks)
      const weeks = [];
      for (let i = 11; i >= 0; i--) {
        const start = new Date();
        start.setDate(start.getDate() - (i * 7 + start.getDay()));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        weeks.push({
          start,
          end,
          name: `${start.toLocaleDateString([], { month: "short", day: "numeric" })}`,
          revenue: 0,
          orders: 0
        });
      }

      filteredOrdersForTimeframe.forEach(order => {
        const date = getOrderDate(order);
        const bucket = weeks.find(w => date >= w.start && date <= w.end);
        if (bucket) {
          bucket.revenue += Number(order.totalAmount || order.total || 0);
          bucket.orders += 1;
        }
      });

      return weeks.map(w => ({
        ...w,
        aov: w.orders > 0 ? Math.round(w.revenue / w.orders) : 0
      }));
    }
  }, [filteredOrdersForTimeframe, timeframe]);

  // Group popular dishes for the current timeframe
  const popularDishes = useMemo(() => {
    const counts = {};
    filteredOrdersForTimeframe.forEach(order => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        const name = item.name || "Unknown Item";
        const qty = Number(item.quantity || 1);
        if (!counts[name]) counts[name] = 0;
        counts[name] += qty;
      });
    });

    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 7);
  }, [filteredOrdersForTimeframe]);

  const metrics = [
    { key: "revenue", label: "Revenue", value: currency(stats.totalRevenue), icon: FiCreditCard },
    { key: "orders", label: "Orders", value: stats.totalOrders, icon: FiShoppingBag },
    { key: "aov", label: "Average Order", value: currency(stats.avgOrderValue), icon: FiTrendingUp },
    { key: "pending", label: "Pending", value: stats.pendingOrders, icon: FiClock },
    { key: "completed", label: "Completed", value: stats.completedOrders, icon: FiCheckCircle },
  ];

  if (loading && !data && orders.length === 0) {
    return <section className="analytics-state" role="status"><FiRefreshCw className="animate-spin" /> Loading analytics…</section>;
  }

  return (
    <section className="owner-analytics" aria-label="Restaurant analytics">
      <header className="owner-section-heading">
        <div>
          <h1>Analytics</h1>
          <p>Real-time performance metrics and sales trends</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Timeframe selector */}
          <div className="flex bg-white/10 p-1 rounded-xl text-xs font-semibold gap-1">
            {[
              ["daily", "Daily"],
              ["weekly", "Weekly"],
              ["quarterly", "Quarterly"]
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === val 
                    ? "bg-white text-black font-bold shadow" 
                    : "text-white/70 hover:text-white"
                }`}
                onClick={() => setTimeframe(val)}
              >
                {label}
              </button>
            ))}
          </div>
          <button 
            type="button" 
            className="ops-icon-button" 
            aria-label="Refresh analytics" 
            onClick={fetchAnalytics} 
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {error && orders.length === 0 && (
        <div className="ops-inline-error" role="alert">{error}</div>
      )}

      {/* Interactive Metric Cards */}
      <div className="analytics-metrics cursor-pointer">
        {metrics.map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMetric === m.key;
          return (
            <article 
              key={m.key} 
              className={`transition-all duration-200 transform hover:scale-[1.02] ${
                isSelected 
                  ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/5" 
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
              onClick={() => {
                if (m.key === "pending" || m.key === "completed") {
                  setSelectedMetric("orders");
                } else {
                  setSelectedMetric(m.key);
                }
              }}
            >
              <div className="flex justify-between w-full items-start">
                <span className="text-white/60 text-xs font-medium uppercase tracking-wider">{m.label}</span>
                <Icon className={isSelected ? "text-orange-400" : "text-white/40"} size={16} />
              </div>
              <strong className="text-white text-2xl font-black mt-2 tracking-tight block">
                {m.value}
              </strong>
            </article>
          );
        })}
      </div>

      {/* Main Dynamic Chart */}
      <article className="analytics-chart-card mt-6">
        <div className="analytics-chart-card__head mb-4">
          <div>
            <h2 className="capitalize font-bold text-lg text-white">
              {selectedMetric === "revenue" ? "Revenue Trends" : selectedMetric === "orders" ? "Order Volume" : "Average Order Value (AOV)"}
            </h2>
            <p className="text-white/60 text-xs">
              {timeframe === "daily" ? "Today's hourly break-down" : timeframe === "weekly" ? "Last 7 days break-down" : "Last 12 weeks break-down"}
            </p>
          </div>
          {advancedEnabled && <button type="button" onClick={downloadCSV} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><FiDownload /> Export CSV</button>}
        </div>

        {chartData.some(d => d.revenue > 0 || d.orders > 0) ? (
          <div className="analytics-chart w-full h-[320px] mt-4" aria-label="Dynamic sales trend chart">
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric === "revenue" ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tickFormatter={(v) => `₹${v}`} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} 
                    contentStyle={{ background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} 
                    formatter={(v) => [currency(v), "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              ) : selectedMetric === "orders" ? (
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{ background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={(v) => [v, "Orders"]}
                  />
                  <Bar dataKey="orders" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <defs>
                    <linearGradient id="colorAov" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.4)" tickFormatter={(v) => `₹${v}`} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} 
                    contentStyle={{ background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={(v) => [currency(v), "AOV"]}
                  />
                  <Area type="monotone" dataKey="aov" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAov)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="analytics-empty py-16 flex flex-col items-center justify-center text-white/40"><FiTrendingUp size={36} /><strong className="text-white mt-2 block">No data in this period</strong><span>Trend charts will populate as orders are completed.</span></div>
        )}
      </article>

      {/* Popular Dishes Card */}
      <article className="analytics-chart-card mt-6">
        <div className="analytics-chart-card__head mb-4">
          <div>
            <h2 className="font-bold text-lg text-white">Popular Dishes</h2>
            <p className="text-white/60 text-xs">Quantity ordered by dish in this period</p>
          </div>
        </div>

        {popularDishes.length ? (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="analytics-chart w-full h-[260px]" aria-label="Popular dishes chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularDishes} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: "rgba(255,255,255,0.03)" }} 
                    contentStyle={{ background: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} 
                  />
                  <Bar dataKey="qty" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* List View of Popular Dishes */}
            <div className="flex flex-col justify-center gap-2.5">
              {popularDishes.map((dish, i) => (
                <div key={dish.name} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {i + 1}
                    </span>
                    <span className="text-white text-sm font-semibold">{dish.name}</span>
                  </div>
                  <strong className="text-white text-sm bg-white/10 px-2.5 py-1 rounded-lg">
                    {dish.qty} orders
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="analytics-empty py-16 flex flex-col items-center justify-center text-white/40"><FiTrendingUp size={36} /><strong className="text-white mt-2 block">No dish performance yet</strong><span>Popular dishes will appear after orders are completed.</span></div>
        )}
      </article>
    </section>
  );
}
