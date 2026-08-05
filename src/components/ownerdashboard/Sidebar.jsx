import React from "react";
import { FiLogOut } from "react-icons/fi";

export default function Sidebar({
  hotel,
  activeTab,
  navItems,
  onNavigate,
  onLogout,
  orderStats,
  primaryColor,
  secondaryColor,
  themeText,
  mutedText,
  surfaceBg,
  borderColor,
}) {
  return (
    <div className="flex h-full flex-col" style={{ background: secondaryColor, color: themeText }}>
      <div className="border-b p-5" style={{ borderColor }}>
        <div className="flex items-center gap-3">
          {hotel?.logo ? (
            <img
              src={hotel.logo}
              alt={hotel.name || "Hotel"}
              className="h-11 w-11 rounded-xl object-cover"
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold"
              style={{
                background: primaryColor,
                color: themeText,
              }}
            >
              {hotel?.name?.charAt(0)?.toUpperCase() || "F"}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate font-bold">{hotel ? hotel.name : "FlexiOrder"}</h1>
            <p className="truncate text-xs" style={{ color: mutedText }}>
              {hotel?.type || "Hotel"} Management
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: mutedText }}>
          Management
        </p>

        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition"
                style={
                  active
                    ? {
                        background: `${primaryColor}35`,
                        color: themeText,
                      }
                    : {
                        background: "transparent",
                        color: mutedText,
                      }
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>

                {item.key === "kitchen" && orderStats.active > 0 && (
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{
                      background: primaryColor,
                      color: themeText,
                    }}
                  >
                    {orderStats.active}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="border-t p-3" style={{ borderColor }}>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition hover:opacity-80"
          style={{ color: mutedText }}
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}