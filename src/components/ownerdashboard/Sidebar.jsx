import { FiInfo, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ hotel, activeTab, navItems, onNavigate, onLogout }) {
  const navigate = useNavigate();
  return <aside className="owner-rail">
    <div className="owner-rail__brand">{hotel?.logo ? <img src={hotel.logo} alt="" /> : <span>{hotel?.name?.charAt(0) || "F"}</span>}<div><strong>{hotel?.name || "Restaurant"}</strong><small>Owner</small></div></div>
    <div className="owner-workspace-switch">
      <span className="owner-workspace-switch__label" id="owner-workspace-switch-label">Workspaces</span>
      <div className="owner-workspace-switch__group" role="group" aria-labelledby="owner-workspace-switch-label">
        <button type="button" onClick={() => navigate("/owner/order")}>Waiter</button>
        <button type="button" onClick={() => navigate("/kitchen")}>Kitchen</button>
      </div>
    </div>
    <nav aria-label="Owner navigation">{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} className={`${activeTab === item.key ? "is-active" : ""}${item.startsMore ? " starts-more" : ""}`} onClick={() => onNavigate(item.key)} title={item.label} aria-label={item.label}><Icon /><span>{item.label}</span></button>; })}</nav>
    <div className="owner-rail__footer">
      <button type="button" className={`owner-rail__about${activeTab === "about" ? " is-active" : ""}`} onClick={() => onNavigate("about")} aria-label="About Us"><FiInfo /><span>About Us</span></button>
      <button type="button" className="owner-rail__logout" onClick={onLogout}><FiLogOut /><span>Sign out</span></button>
    </div>
  </aside>;
}
