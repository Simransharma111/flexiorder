import { useEffect, useState } from "react";
import { FiArrowLeft, FiLogOut, FiMoreVertical, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import OwnerMenuManager from "../components/OwnerMenuManager";
import { canUseStaffCapability, hydrateHotelFeatures } from "../utils/featureSettings";
import { getHotelThemeStyle } from "../utils/hotelTheme";
import { clearAuthSession, readStoredSession } from "../utils/session";
import { getScopedStorageKey, rememberRestaurantId } from "../utils/storageScope";

const HOTEL_CACHE_KEY = "flexiorder_staff_hotel";

export default function StaffMenuPage() {
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const role = readStoredSession().user?.role;

  useEffect(() => {
    api.get("/hotel/me")
      .then((response) => {
        const nextHotel = hydrateHotelFeatures(response.data?.hotel || response.data);
        rememberRestaurantId(nextHotel);
        setHotel(nextHotel);
        try {
          localStorage.setItem(getScopedStorageKey(HOTEL_CACHE_KEY), JSON.stringify(nextHotel));
        } catch {
          // Menu editing remains available when persistent storage is restricted.
        }
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(getScopedStorageKey(HOTEL_CACHE_KEY));
          setHotel(cached ? hydrateHotelFeatures(JSON.parse(cached)) : false);
        } catch {
          setHotel(false);
        }
      });
  }, []);

  const signOut = () => {
    if (!window.confirm("Sign out of FlexiOrder on this device?")) return;
    clearAuthSession();
    navigate("/login");
  };

  if (hotel === null) return <div className="ops-loading">Loading menu…</div>;
  if (!hotel || !canUseStaffCapability(hotel, "editMenu", role)) {
    return <main className="ops-access-message"><p>Menu editing is not enabled for staff.</p><button type="button" onClick={() => navigate("/owner/order")}>Back to Waiter</button></main>;
  }

  const canSwitch = canUseStaffCapability(hotel, "switchWorkspaces", role);

  return (
    <main className="ops-workspace staff-menu-workspace" style={getHotelThemeStyle(hotel)}>
      <header className="staff-menu-header">
        <button type="button" className="ops-icon-button" aria-label="Back to Waiter" onClick={() => navigate("/owner/order")}><FiArrowLeft /></button>
        <div><strong>Edit menu</strong><span>{hotel.name}</span></div>
        <button type="button" className="ops-icon-button" aria-label="More menu options" onClick={() => setMenuOpen(true)}><FiMoreVertical /></button>
      </header>

      {menuOpen && (
        <div className="ops-sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <aside className="ops-tools-sheet" onClick={(event) => event.stopPropagation()}>
            {canSwitch && <button type="button" onClick={() => navigate("/owner/order")}>Waiter workspace</button>}
            {canSwitch && <button type="button" onClick={() => navigate("/kitchen")}>Kitchen workspace</button>}
            {["owner", "superadmin"].includes(role) && <button type="button" onClick={() => navigate("/owner/dashboard")}>Manage restaurant</button>}
            <button type="button" onClick={signOut}><FiLogOut /> Sign out</button>
            <button type="button" className="ops-sheet-cancel" onClick={() => setMenuOpen(false)}><FiX /> Close</button>
          </aside>
        </div>
      )}

      <div className="staff-menu-content"><OwnerMenuManager advancedEnabled={false} restaurant={hotel} /></div>
    </main>
  );
}
