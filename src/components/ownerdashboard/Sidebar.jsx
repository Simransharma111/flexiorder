import { FiLogOut } from "react-icons/fi";

export default function Sidebar({ hotel, activeTab, navItems, onNavigate, onLogout }) {
  return <aside className="owner-rail">
    <div className="owner-rail__brand">{hotel?.logo ? <img src={hotel.logo} alt="" /> : <span>{hotel?.name?.charAt(0) || "F"}</span>}<div><strong>{hotel?.name || "Restaurant"}</strong><small>Owner</small></div></div>
    <nav aria-label="Owner navigation">{navItems.map((item, index) => { const Icon = item.icon; return <button type="button" key={item.key} className={`${activeTab === item.key ? "is-active" : ""}${index === 4 ? " starts-more" : ""}`} onClick={() => onNavigate(item.key)} title={item.label} aria-label={item.label}><Icon /><span>{item.label}</span></button>; })}</nav>
    <button type="button" className="owner-rail__logout" onClick={onLogout}><FiLogOut /><span>Sign out</span></button>
  </aside>;
}
