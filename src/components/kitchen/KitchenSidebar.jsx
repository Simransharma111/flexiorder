export default function KitchenSidebar({ hotel, open, logout, navigate }) {
  return (
    <aside
      className={`${open ? "w-56" : "w-0"} shrink-0 overflow-hidden bg-slate-950 text-white transition-all duration-200`}
      aria-label="Kitchen navigation"
    >
      <div className="flex h-full min-h-screen w-56 flex-col p-4">
        <div className="border-b border-white/10 pb-4">
          <p className="truncate text-sm font-bold">{hotel?.name || "Kitchen"}</p>
          <p className="mt-1 text-xs text-slate-400">Kitchen workspace</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/owner/dashboard")}
          className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
        >
          Owner dashboard
        </button>

        <button
          type="button"
          onClick={logout}
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
