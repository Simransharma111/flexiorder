import { useCallback, useEffect, useState, useMemo } from "react";
import { FiDownload, FiRefreshCw, FiTrendingUp, FiShoppingBag, FiCreditCard, FiClock, FiCheckCircle, FiSearch } from "react-icons/fi";
import api from "../api/axios";
import {
  analyticsComparison,
  buildAnalyticsChartData,
  calculateAnalyticsStats,
  calculatePopularDishes,
  filterAnalyticsOrders,
  previousAnalyticsRange,
  resolveAnalyticsRange,
} from "../utils/analyticsRanges";
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

const dateInputValue = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const monthInputValue = (date) => dateInputValue(date).slice(0, 7);

export default function AnalyticsDashboard({ orders = [], advancedEnabled = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Selected metric tab: "revenue" | "orders" | "aov" | "dishes"
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [rangeMode, setRangeMode] = useState("monthly");
  const [selectedMonth, setSelectedMonth] = useState(() => monthInputValue(new Date()));
  const [selectedQuarter, setSelectedQuarter] = useState(() => Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customStart, setCustomStart] = useState(() => dateInputValue(new Date()));
  const [customEnd, setCustomEnd] = useState(() => dateInputValue(new Date()));
  const [search, setSearch] = useState("");

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

  const range = useMemo(() => resolveAnalyticsRange({
    mode: rangeMode,
    month: selectedMonth,
    quarter: selectedQuarter,
    year: selectedYear,
    startDate: customStart,
    endDate: customEnd,
  }), [customEnd, customStart, rangeMode, selectedMonth, selectedQuarter, selectedYear]);

  const previousRange = useMemo(() => previousAnalyticsRange(range), [range]);
  const filteredOrdersForTimeframe = useMemo(
    () => filterAnalyticsOrders(orders, range, search),
    [orders, range, search],
  );
  const previousOrders = useMemo(
    () => filterAnalyticsOrders(orders, previousRange, search),
    [orders, previousRange, search],
  );
  const stats = useMemo(
    () => calculateAnalyticsStats(filteredOrdersForTimeframe),
    [filteredOrdersForTimeframe],
  );
  const previousStats = useMemo(
    () => calculateAnalyticsStats(previousOrders),
    [previousOrders],
  );
  const chartData = useMemo(
    () => buildAnalyticsChartData(filteredOrdersForTimeframe, range),
    [filteredOrdersForTimeframe, range],
  );
  const chartUsesWeeklyBuckets = Boolean(
    range.start && range.end && (range.end.getTime() - range.start.getTime()) > 45 * 24 * 60 * 60 * 1000,
  );
  const popularDishes = useMemo(
    () => calculatePopularDishes(filteredOrdersForTimeframe),
    [filteredOrdersForTimeframe],
  );

  const metrics = [
    { key: "revenue", label: "Revenue", value: currency(stats.totalRevenue), comparison: analyticsComparison(stats.totalRevenue, previousStats.totalRevenue), icon: FiCreditCard },
    { key: "orders", label: "Orders", value: stats.totalOrders, comparison: analyticsComparison(stats.totalOrders, previousStats.totalOrders), icon: FiShoppingBag },
    { key: "aov", label: "Average Order", value: currency(stats.avgOrderValue), comparison: analyticsComparison(stats.avgOrderValue, previousStats.avgOrderValue), icon: FiTrendingUp },
    { key: "pending", label: "Pending", value: stats.pendingOrders, comparison: analyticsComparison(stats.pendingOrders, previousStats.pendingOrders), lowerIsBetter: true, icon: FiClock },
    { key: "completed", label: "Completed", value: stats.completedOrders, comparison: analyticsComparison(stats.completedOrders, previousStats.completedOrders), icon: FiCheckCircle },
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
        <button
          type="button"
          className="ops-icon-button"
          aria-label="Refresh analytics"
          onClick={fetchAnalytics}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error && orders.length === 0 && (
        <div className="ops-inline-error" role="alert">{error}</div>
      )}

      <section className="analytics-chart-card grid gap-4" aria-label="Analytics filters">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date range type">
          {[
            ["custom", "Custom"],
            ["monthly", "Monthly"],
            ["quarterly", "Quarterly"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={rangeMode === value}
              className={`min-h-11 rounded-lg border px-4 text-sm font-bold transition ${
                rangeMode === value
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
              onClick={() => setRangeMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,1.4fr)]">
          <div className="grid gap-3 sm:grid-cols-2">
            {rangeMode === "monthly" && (
              <label className="grid gap-1 text-xs font-bold text-white/70">
                Month
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white [color-scheme:dark]"
                />
              </label>
            )}

            {rangeMode === "quarterly" && (
              <>
                <label className="grid gap-1 text-xs font-bold text-white/70">
                  Quarter
                  <select
                    value={selectedQuarter}
                    onChange={(event) => setSelectedQuarter(Number(event.target.value))}
                    className="min-h-11 rounded-lg border border-white/20 bg-slate-900 px-3 text-sm text-white"
                  >
                    {[1, 2, 3, 4].map((quarter) => <option key={quarter} value={quarter}>Q{quarter}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold text-white/70">
                  Year
                  <input
                    type="number"
                    min="1900"
                    max="9999"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    onBlur={() => {
                      const year = Number(selectedYear);
                      if (!Number.isInteger(year) || year < 1900 || year > 9999) {
                        setSelectedYear(new Date().getFullYear());
                      }
                    }}
                    className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white"
                  />
                </label>
              </>
            )}

            {rangeMode === "custom" && (
              <>
                <label className="grid gap-1 text-xs font-bold text-white/70">
                  Start date
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white [color-scheme:dark]"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold text-white/70">
                  End date
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart || undefined}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="min-h-11 rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white [color-scheme:dark]"
                  />
                </label>
              </>
            )}
          </div>

          <label className="grid gap-1 text-xs font-bold text-white/70">
            Search by name or order
            <span className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 focus-within:border-orange-400">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Guest, dish, order ID, table or room"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
            </span>
          </label>
        </div>

        {range.error ? (
          <div className="ops-inline-error" role="alert">{range.error}</div>
        ) : (
          <p className="text-xs text-white/60" role="status">
            Showing {filteredOrdersForTimeframe.length} {filteredOrdersForTimeframe.length === 1 ? "order" : "orders"} for {range.label}. Comparing with {previousRange?.label}.
          </p>
        )}
      </section>

      {!range.error && (
        <>
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
              <small className={`text-[11px] font-semibold ${
                m.comparison.percent === null
                  ? "text-white/45"
                  : m.comparison.percent === 0
                    ? "text-white/60"
                    : (m.lowerIsBetter ? m.comparison.percent < 0 : m.comparison.percent > 0)
                      ? "text-emerald-400"
                      : "text-rose-400"
              }`}>
                {m.comparison.label}
              </small>
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
              {range.error ? "Choose a valid reporting period" : `${range.label} · ${chartUsesWeeklyBuckets ? "Weekly" : "Daily"} breakdown`}
            </p>
          </div>
          {advancedEnabled && <button type="button" onClick={downloadCSV} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"><FiDownload /> Export today&apos;s CSV</button>}
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
        </>
      )}
    </section>
  );
}
