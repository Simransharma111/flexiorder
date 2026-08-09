import { FiMapPin, FiShoppingBag } from "react-icons/fi";

export default function GuestHeader({ hotel, table, cartCount, onCart, orderingEnabled = true }) {
  const location = table?.type === "room"
    ? `Room ${table?.locationNumber || table?.tableNumber || ""}`
    : `Table ${table?.locationNumber || table?.tableNumber || ""}`;
  const primary = hotel?.theme?.primary || "#00796b";

  return (
    <header className="guest-brand-strip" style={{ "--guest-brand": primary }}>
      <div className="guest-brand-strip__inner">
        <div className="guest-brand-strip__logo" aria-hidden={!hotel?.logo}>
          {hotel?.logo ? <img src={hotel.logo} alt="" /> : <span>{hotel?.name?.charAt(0) || "F"}</span>}
        </div>
        <div className="guest-brand-strip__identity">
          <h1>{hotel?.name || "Restaurant"}</h1>
          <p>{hotel?.tagline || hotel?.description || "Welcome"}</p>
        </div>
        <span className="guest-brand-strip__location"><FiMapPin /> {location}</span>
        {orderingEnabled && cartCount > 0 && (
          <button type="button" onClick={onCart} aria-label={`Open cart with ${cartCount} items`}>
            <FiShoppingBag /><b>{cartCount}</b>
          </button>
        )}
      </div>
    </header>
  );
}
