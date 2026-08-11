import { useEffect, useRef, useState } from "react";
import { FiClock, FiLoader } from "react-icons/fi";
import { orderLocation, waitingMinutes } from "../../utils/orderModel";

const publicStatus = (status) => {
  if (status === "pending") return "Received";
  if (["accepted", "preparing"].includes(status)) return "Preparing";
  if (status === "ready") return "Ready";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  return "Updating";
};

export default function ActiveOrder({ orders, loading, table }) {
  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    setActiveIndex((index) => Math.max(0, Math.min(index, (orders?.length || 1) - 1)));
  }, [orders?.length]);
  if (!orders?.length) return null;

  return (
    <section className="guest-active-orders" aria-label="Your active orders">
      <div className="guest-active-orders__title">
        <strong>Your order{orders.length > 1 ? "s" : ""}</strong>
        {loading && <FiLoader className="animate-spin" aria-label="Refreshing order status" />}
      </div>
      <div ref={sliderRef} className="guest-active-orders__slider" onScroll={(event) => {
        const width = event.currentTarget.clientWidth || 1;
        setActiveIndex(Math.round(event.currentTarget.scrollLeft / width));
      }}>
        {orders.map((order) => (
          <article className={`guest-active-order is-${String(order.status || "pending")}`} key={order._id || order.clientOrderId}>
            <div className="guest-active-order__head">
              <span><b>{orderLocation({ ...order, tableId: typeof order.tableId === "object" ? order.tableId : table })}</b><small>#{String(order._id || order.clientOrderId || "order").slice(-5)}</small></span>
              <strong>{publicStatus(order.status)}</strong>
            </div>
            <div className="guest-active-order__items">
              {order.items?.map((item, index) => <span key={item._id || item.menuId || `${item.name}-${index}`}><b>{item.quantity || 1} ×</b> {item.name || item.menu?.name || "Dish"}</span>)}
            </div>
            {order.guestHandoffUntil && !order.guestHandoffConfirmed && (
              <p className="guest-active-order__sync" role="status">
                <FiLoader className="animate-spin" aria-hidden="true" /> Refreshing status…
              </p>
            )}
            <p><FiClock /> {waitingMinutes(order)} min</p>
          </article>
        ))}
      </div>
      {orders.length > 1 && (
        <div className="guest-order-dots" aria-label="Order pages">
          {orders.map((order, index) => <button key={order._id || index} type="button" className={index === activeIndex ? "is-active" : ""} aria-label={`Show order ${index + 1}`} onClick={() => sliderRef.current?.children[index]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })} />)}
        </div>
      )}
    </section>
  );
}
