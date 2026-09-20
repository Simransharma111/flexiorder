import { FiHome, FiMoreHorizontal, FiPackage, FiShoppingBag } from "react-icons/fi";

const PRIMARY_TABS = [
  { key: "home", label: "Today", icon: FiHome },
  { key: "menu", label: "Menu", icon: FiPackage },
  { key: "orders", label: "Orders", icon: FiShoppingBag },
];

export default function OwnerBottomNav({ activeTab, navItems, onNavigate, onMore, moreOpen }) {
  const primaryTabs = PRIMARY_TABS.filter(tab => navItems.some(item => item.key === tab.key));
  const moreActive = !primaryTabs.some(tab => tab.key === activeTab);

  return <nav className="owner-bottom-nav" aria-label="Owner primary navigation">
    {primaryTabs.map(({ key, label, icon: Icon }) => <button
      type="button"
      key={key}
      className={activeTab === key ? "is-active" : ""}
      aria-current={activeTab === key ? "page" : undefined}
      onClick={() => onNavigate(key)}
    ><Icon aria-hidden="true" /><span>{label}</span></button>)}
    <button type="button" className={moreActive ? "is-active" : ""}
      aria-current={moreActive ? "page" : undefined}
      aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="owner-more-menu"
      onClick={onMore}
    ><FiMoreHorizontal aria-hidden="true" /><span>More</span></button>
  </nav>;
}
