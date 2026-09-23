import { FiHome, FiPackage, FiBarChart2, FiGrid, FiDroplet } from "react-icons/fi";
const PRIMARY_TABS = [
  { key: "home", label: "Home", icon: FiHome },
  { key: "menu", label: "Menu", icon: FiPackage },
  { key: "analytics", label: "Analytics", icon: FiBarChart2 },
  { key: "tables", label: "QR", icon: FiGrid },
  { key: "themes", label: "Theme", icon: FiDroplet },
];
export default function OwnerBottomNav({ activeTab, onNavigate }) {
  return <nav className="owner-bottom-nav" aria-label="Owner primary navigation">
    {PRIMARY_TABS.map(({ key, label, icon: Icon }) => <button type="button" key={key}
      className={activeTab === key ? "is-active" : ""}
      aria-current={activeTab === key ? "page" : undefined} onClick={() => onNavigate(key)}>
      <Icon aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}
