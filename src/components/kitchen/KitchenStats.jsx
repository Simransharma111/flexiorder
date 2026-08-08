export default function KitchenStats({ newCount, preparingCount, readyCount }) {
  const stats = [
    ["New", newCount, "text-orange-600"],
    ["Preparing", preparingCount, "text-blue-600"],
    ["Ready", readyCount, "text-green-600"],
  ];

  return (
    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-3">
      {stats.map(([label, value, color]) => (
        <div key={label} className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-xl font-black ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
