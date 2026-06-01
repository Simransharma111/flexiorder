import { useEffect, useState } from "react";
import socket from "../socket";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

const THEME_MAP = {
  stormy_morning: {
    primary: "#64748B",
    secondary: "#0F172A",
  },

  mossy_hollow: {
    primary: "#4D7C0F",
    secondary: "#1A2E05",
  },

  blue_eclipse: {
    primary: "#1E293B",
    secondary: "#020617",
  },

  lush_forest: {
    primary: "#14532D",
    secondary: "#052E16",
  },

  green_juice: {
    primary: "#16A34A",
    secondary: "#052E16",
  },

  chili_spice: {
    primary: "#DC2626",
    secondary: "#1F0A0A",
  },

  chocolate_truffle: {
    primary: "#7C2D12",
    secondary: "#1C0A00",
  },

  ink_wash: {
    primary: "#111827",
    secondary: "#F8FAFC",
  },
};

const STATUS_STEPS = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "delivered",
];

export default function KitchenDashboard() {

  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [hotel, setHotel] =
    useState(null);

  /* =========================
     THEME
  ========================= */

  const themeConfig =
    THEME_MAP[
      hotel?.theme?.themeId
    ] || {};

  const primaryColor =
    hotel?.theme?.primaryColor ||
    themeConfig.primary ||
    "#F97316";

  const secondaryColor =
    hotel?.theme
      ?.secondaryColor ||
    themeConfig.secondary ||
    "#0F172A";

  /* =========================
     FETCH HOTEL
  ========================= */

  const fetchHotel = async () => {

    try {

      const res =
        await api.get(
          "/hotel/me",
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem(
                  "token"
                )}`,
            },
          }
        );

      setHotel(res.data);

    } catch (err) {

      console.log(err);

    }

  };

  /* =========================
     FETCH ORDERS
  ========================= */

  const fetchOrders = async () => {

    try {

      const res =
        await api.get(
          "/kitchen/orders",
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem(
                  "token"
                )}`,
            },
          }
        );

      setOrders(

        (res.data.orders || [])
          .filter(
            (order) =>
              order.status !==
                "delivered" &&
              order.status !==
                "cancelled"
          )

      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {

    fetchHotel();

    fetchOrders();

    socket.on(
      "newOrder",
      (newOrder) => {

        setOrders((prev) => [
          newOrder,
          ...prev,
        ]);

        try {

          new Audio(
            "/orders_received.mp3"
          ).play();

        } catch (err) {

          console.log(err);

        }

      }
    );

    socket.on(
      "kitchenOrderUpdated",
      (updatedOrder) => {

        if (
          updatedOrder.status ===
            "delivered" ||
          updatedOrder.status ===
            "cancelled"
        ) {

          setOrders((prev) =>
            prev.filter(
              (o) =>
                o._id !==
                updatedOrder._id
            )
          );

        } else {

          setOrders((prev) =>
            prev.map((o) =>
              o._id ===
              updatedOrder._id
                ? updatedOrder
                : o
            )
          );

        }

      }
    );

    return () => {

      socket.off("newOrder");

      socket.off(
        "kitchenOrderUpdated"
      );

    };

  }, []);

  /* =========================
     UPDATE STATUS
  ========================= */

  const updateStatus = async (
    orderId,
    status
  ) => {

    try {

      const res =
        await api.put(

          `/kitchen/orders/${orderId}`,

          { status },

          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem(
                  "token"
                )}`,
            },
          }
        );

      // REMOVE FROM UI
      if (
        status === "delivered" ||
        status === "cancelled"
      ) {

        setOrders((prev) =>
          prev.filter(
            (o) =>
              o._id !== orderId
          )
        );

        return;

      }

      // UPDATE LIVE
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? res.data.order
            : o
        )
      );

    } catch (err) {

      alert(
        err?.response?.data
          ?.message || "Failed"
      );

    }

  };

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = () => {

    const confirmLogout =
      window.confirm(
        "Do you want to logout?"
      );

    if (!confirmLogout)
      return;

    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "role"
    );

    navigate("/");

  };

  /* =========================
     NEXT STATUS
  ========================= */

  const getNextStatus = (
    current
  ) => {

    const flow = {

      pending: "accepted",

      accepted: "preparing",

      preparing: "ready",

      ready: "delivered",

    };

    return flow[current];

  };

  const getButtonText = (
    current
  ) => {

    const text = {

      pending:
        "Accept Order",

      accepted:
        "Start Preparing",

      preparing:
        "Mark Ready",

      ready:
        "Mark Delivered",

    };

    return text[current];

  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {

    return (

      <div
        className="
          min-h-screen
          flex
          items-center
          justify-center
          text-white
          text-2xl
          font-bold
        "
        style={{
          background:
            secondaryColor,
        }}
      >
        Loading Orders...
      </div>

    );

  }

  return (

    <div
      className="
        min-h-screen
        text-white
      "
      style={{
        background:
          secondaryColor,
      }}
    >

      {/* =========================
          HEADER
      ========================= */}

      <div
        className="
          sticky
          top-0
          z-50
          border-b
          border-white/10
          backdrop-blur-xl
        "
        style={{
          background:
            `${secondaryColor}dd`,
        }}
      >

        <div
          className="
            max-w-7xl
            mx-auto
            px-4
            py-5
            flex
            justify-between
            items-center
          "
        >

          {/* LEFT */}

          <div
            className="
              flex
              items-center
              gap-4
            "
          >

            {hotel?.logo && (

              <img
                src={hotel.logo}
                alt="logo"
                className="
                  w-14
                  h-14
                  rounded-full
                  object-cover
                  border
                  border-white/10
                "
              />

            )}

            <div>

              <h1
                className="
                  text-3xl
                  font-black
                "
              >
                Kitchen Dashboard
              </h1>

              <p
                className="
                  text-sm
                  text-gray-300
                "
              >
                {hotel?.name}
              </p>

            </div>

          </div>

          {/* RIGHT */}

          <div
            className="
              flex
              items-center
              gap-3
            "
          >

            <div
              className="
                px-5
                py-3
                rounded-2xl
                text-center
              "
              style={{
                background:
                  primaryColor,
              }}
            >

              <p
                className="
                  text-xs
                  uppercase
                "
              >
                Active Orders
              </p>

              <h2
                className="
                  text-2xl
                  font-black
                "
              >
                {orders.length}
              </h2>

            </div>

            <button
              onClick={
                handleLogout
              }
              className="
                px-5
                py-3
                rounded-2xl
                bg-red-600
                hover:bg-red-700
                transition
                font-bold
              "
            >
              Logout
            </button>

          </div>

        </div>

      </div>

      {/* =========================
          ORDERS
      ========================= */}

      <section
        className="
          max-w-7xl
          mx-auto
          px-4
          py-8
        "
      >

        {orders.length === 0 ? (

          <div
            className="
              h-[60vh]
              flex
              items-center
              justify-center
              text-center
            "
          >

            <div>

              <h2
                className="
                  text-4xl
                  font-black
                "
              >
                No Active Orders
              </h2>

              <p
                className="
                  text-gray-400
                  mt-3
                "
              >
                Incoming orders
                will appear here
              </p>

            </div>

          </div>

        ) : (

          <div
            className="
              grid
              lg:grid-cols-2
              gap-8
            "
          >

            {orders.map((order) => {

              const currentIndex =
                STATUS_STEPS.indexOf(
                  order.status
                );

              return (

                <div
                  key={order._id}
                  className="
                    bg-white/5
                    border
                    border-white/10
                    rounded-[30px]
                    p-6
                    backdrop-blur-lg
                  "
                >

                  {/* TOP */}

                  <div
                    className="
                      flex
                      justify-between
                      gap-4
                    "
                  >

                    <div>

                      <h2
                        className="
                          text-3xl
                          font-black
                        "
                        style={{
                          color:
                            primaryColor,
                        }}
                      >

                        {order.locationType ===
                        "room"

                          ? `Room ${order.locationNumber}`

                          : `Table ${order.locationNumber}`}

                      </h2>

                      <p
                        className="
                          text-gray-300
                          mt-1
                        "
                      >
                        {
                          order.guestName
                        }
                      </p>

                      <p
                        className="
                          text-xs
                          text-gray-500
                          mt-2
                        "
                      >

                        {new Date(
                          order.createdAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour:
                              "2-digit",

                            minute:
                              "2-digit",
                          }
                        )}

                      </p>

                    </div>

                    <div
                      className="
                        text-right
                      "
                    >

                      <div
                        className="
                          px-4
                          py-2
                          rounded-full
                          text-sm
                          font-bold
                          uppercase
                        "
                        style={{
                          background:
                            primaryColor,
                        }}
                      >

                        {order.status}

                      </div>

                      <h3
                        className="
                          text-3xl
                          font-black
                          mt-4
                        "
                      >
                        ₹
                        {
                          order.totalAmount
                        }
                      </h3>

                    </div>

                  </div>

                  {/* STATUS TRACKER */}

                  <div
                    className="
                      mt-8
                      overflow-x-auto
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        min-w-max
                      "
                    >

                      {STATUS_STEPS.map(
                        (
                          step,
                          index
                        ) => {

                          const active =
                            index <=
                            currentIndex;

                          return (

                            <div
                              key={step}
                              className="
                                flex
                                items-center
                              "
                            >

                              <div
                                className="
                                  flex
                                  flex-col
                                  items-center
                                "
                              >

                                <div
                                  className="
                                    w-12
                                    h-12
                                    rounded-full
                                    flex
                                    items-center
                                    justify-center
                                    text-sm
                                    font-black
                                    border-2
                                    transition-all
                                  "
                                  style={{
                                    background:
                                      active
                                        ? primaryColor
                                        : "transparent",

                                    borderColor:
                                      active
                                        ? primaryColor
                                        : "#ffffff30",
                                  }}
                                >

                                  {active
                                    ? "✓"
                                    : index + 1}

                                </div>

                                <p
                                  className={`
                                    text-[11px]
                                    mt-2
                                    font-bold
                                    uppercase
                                    ${
                                      active
                                        ? "text-white"
                                        : "text-gray-500"
                                    }
                                  `}
                                >

                                  {step}

                                </p>

                              </div>

                              {index !==
                                STATUS_STEPS.length -
                                  1 && (

                                <div
                                  className="
                                    w-10
                                    h-1
                                    rounded-full
                                    mx-2
                                    mb-6
                                  "
                                  style={{
                                    background:
                                      currentIndex >
                                      index
                                        ? primaryColor
                                        : "#ffffff20",
                                  }}
                                />

                              )}

                            </div>

                          );

                        }
                      )}

                    </div>

                  </div>

                  {/* ITEMS */}

                  <div
                    className="
                      mt-8
                      space-y-4
                    "
                  >

                    {order.items.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          key={index}
                          className="
                            flex
                            justify-between
                            items-center
                            bg-black/20
                            border
                            border-white/10
                            rounded-2xl
                            p-4
                          "
                        >

                          <div>

                            <h3
                              className="
                                text-lg
                                font-bold
                              "
                            >
                              {item.name}
                            </h3>

                            <p
                              className="
                                text-sm
                                text-gray-400
                                mt-1
                              "
                            >
                              ₹
                              {item.price}
                              {" "}each
                            </p>

                          </div>

                          <div
                            className="
                              w-[70px]
                              h-[70px]
                              rounded-2xl
                              flex
                              items-center
                              justify-center
                              text-3xl
                              font-black
                            "
                            style={{
                              background:
                                primaryColor,
                            }}
                          >

                            ×
                            {
                              item.quantity
                            }

                          </div>

                        </div>

                      )
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div
                    className="
                      mt-8
                      flex
                      flex-wrap
                      gap-4
                    "
                  >

                    {order.status !==
                      "delivered" &&
                      order.status !==
                        "cancelled" && (

                      <button
                        onClick={() =>
                          updateStatus(
                            order._id,
                            getNextStatus(
                              order.status
                            )
                          )
                        }
                        className="
                          flex-1
                          min-w-[220px]
                          py-4
                          px-6
                          rounded-2xl
                          text-lg
                          font-black
                          transition-all
                          hover:scale-[1.02]
                          active:scale-95
                        "
                        style={{
                          background:
                            primaryColor,
                        }}
                      >

                        {getButtonText(
                          order.status
                        )}

                      </button>

                    )}

                    {order.status !==
                      "delivered" &&
                      order.status !==
                        "cancelled" && (

                      <button
                        onClick={() => {

                          const ok =
                            window.confirm(
                              "Cancel this order?"
                            );

                          if (!ok)
                            return;

                          updateStatus(
                            order._id,
                            "cancelled"
                          );

                        }}
                        className="
                          px-6
                          py-4
                          rounded-2xl
                          bg-red-600
                          hover:bg-red-700
                          transition-all
                          font-bold
                        "
                      >
                        Cancel
                      </button>

                    )}

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </section>

    </div>
  );
}