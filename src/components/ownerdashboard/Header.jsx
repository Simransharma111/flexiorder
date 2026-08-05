import React from "react";
import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiRefreshCw,
} from "react-icons/fi";

export default function Header({

hotel,
activeTab,
navItems,
onMenuToggle,
onRefresh,
loadingOrders,
orderStats,
newOrderCount,
primaryColor,
accentColor,
themeText,
mutedText,
borderColor,
headerBg,

}) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        background: headerBg,
        borderColor,
        color: themeText,
      }}
    >
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="rounded-xl p-2 md:hidden"
            style={{ color: mutedText }}
          >
            <FiMenu size={21} />
          </button>

          <div>
            <p className="text-xs" style={{ color: mutedText }}>
              {hotel?.name || "FlexiOrder"}
            </p>

            <h2 className="font-semibold">
              {activeTab === "overview"
                ? "Overview"
                : navItems.find((item) => item.key === activeTab)?.label || "Dashboard"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="rounded-xl p-2.5 transition hover:opacity-80"
            style={{ color: mutedText }}
            title="Refresh"
          >
            <FiRefreshCw size={18} className={loadingOrders ? "animate-spin" : ""} />
          </button>

          <button
            className="relative rounded-xl p-2.5 transition hover:opacity-80"
            style={{ color: mutedText }}
            title="Notifications"
          >
            <FiBell size={18} />
           {newOrderCount > 0 && (

<span

className="
absolute
right-1
top-1
flex
h-5
min-w-5
items-center
justify-center
rounded-full
px-1
text-[10px]
font-bold
"

style={{

background:primaryColor,

color:"#fff"

}}

>

{newOrderCount}

</span>

)}
          </button>

          <div className="hidden items-center gap-2 border-l pl-3 sm:flex" style={{ borderColor }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: primaryColor,
                color: themeText,
              }}
            >
              O
            </div>

            <div className="hidden lg:block">
              <p className="text-xs font-medium">Owner</p>
              <p className="text-[10px]" style={{ color: mutedText }}>
                Administrator
              </p>
            </div>

            <FiChevronDown size={14} style={{ color: mutedText }} />
          </div>
        </div>
      </div>
    </header>
  );
}