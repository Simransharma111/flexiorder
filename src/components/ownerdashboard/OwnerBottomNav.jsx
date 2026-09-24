import { FiHome, FiPackage, FiBarChart2, FiGrid, FiDroplet, FiMoreHorizontal } from "react-icons/fi";
const PRIMARY_TABS = [
  { key: "home", label: "Home", icon: FiHome },
  { key: "menu", label: "Menu", icon: FiPackage },
  { key: "analytics", label: "Analytics", icon: FiBarChart2 },
  { key: "tables", label: "QR", icon: FiGrid },
  { key: "themes", label: "Theme", icon: FiDroplet },
];
export default function OwnerBottomNav({ activeTab, onNavigate, onMore, moreOpen }) {
  return <nav className="owner-bottom-nav" aria-label="Owner primary navigation">
    {PRIMARY_TABS.map(({ key, label, icon: Icon }) => <button type="button" key={key}
      className={activeTab === key ? "is-active" : ""}
      aria-current={activeTab === key ? "page" : undefined} onClick={() => onNavigate(key)}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </button>)}
    <button type="button" className={!PRIMARY_TABS.some(tab => tab.key === activeTab) || moreOpen ? "is-active" : ""}
      aria-label="More" aria-haspopup="dialog" aria-expanded={moreOpen} aria-controls="owner-more-menu" onClick={onMore}>
      <FiMoreHorizontal aria-hidden="true" /><span>More</span>
    </button>
  </nav>;
}
