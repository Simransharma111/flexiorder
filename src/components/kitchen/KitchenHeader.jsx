export default function KitchenHeader({
  hotel,
  search,
  setSearch,
  orderCount,
  pendingSyncCount = 0,
  isOnline = true,
  toggleSidebar,
}) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={toggleSidebar}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
        aria-label="Toggle kitchen navigation"
      >
        ☰
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold text-slate-900">
          {hotel?.name || "Kitchen"}
        </h1>
        <p className="text-xs text-slate-500">
          {orderCount} active orders
          {(!isOnline || pendingSyncCount > 0) && (
            <span className="ml-2 font-semibold text-red-600">
              • {!isOnline ? "Offline — updates save here" : `${pendingSyncCount} waiting to sync`}
            </span>
          )}
        </p>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search table"
        aria-label="Search kitchen orders"
        className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 sm:w-52"
      />
    </header>
  );
}
