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

  const [orders, setOrders] =
    useState([]);

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
    hotel?.theme?.secondaryColor ||
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
      SOCKETS
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
      STATUS FLOW
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
          text-xl
          sm:text-2xl
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
            py-4
            flex
            flex-col
            lg:flex-row
            gap-4
            lg:gap-0
            justify-between
            lg:items-center
          "
        >

          {/* LEFT */}

          <div
            className="
              flex
              items-center
              gap-3
              min-w-0
            "
          >

            {hotel?.logo && (

              <img
                src={hotel.logo}
                alt="logo"
                className="
                  w-12
                  h-12
                  sm:w-14
                  sm:h-14
                  rounded-full
                  object-cover
                  border
                  border-white/10
                  shrink-0
                "
              />

            )}

            <div className="min-w-0">

              <h1
                className="
                  text-xl
                  sm:text-2xl
                  lg:text-3xl
                  font-black
                  truncate
                "
              >
                Kitchen Dashboard
              </h1>

              <p
                className="
                  text-xs
                  sm:text-sm
                  text-gray-300
                  truncate
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
              w-full
              lg:w-auto
            "
          >

            <div
              className="
                flex-1
                lg:flex-none
                px-4
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
                  text-[10px]
                  sm:text-xs
                  uppercase
                "
              >
                Active Orders
              </p>

              <h2
                className="
                  text-xl
                  sm:text-2xl
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
                px-4
                sm:px-5
                py-3
                rounded-2xl
                bg-red-600
                hover:bg-red-700
                transition
                font-bold
                text-sm
                sm:text-base
                whitespace-nowrap
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
          py-6
          sm:py-8
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
                  text-3xl
                  sm:text-4xl
                  font-black
                "
              >
                No Active Orders
              </h2>

              <p
                className="
                  text-gray-400
                  mt-3
                  text-sm
                  sm:text-base
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
              grid-cols-1
              xl:grid-cols-2
              gap-6
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
                    rounded-[28px]
                    p-4
                    sm:p-6
                    backdrop-blur-lg
                    overflow-hidden
                  "
                >

                  {/* TOP */}

                  <div
                    className="
                      flex
                      flex-col
                      sm:flex-row
                      justify-between
                      gap-5
                    "
                  >

                    {/* LEFT */}

                    <div className="min-w-0">

                      <h2
                        className="
                          text-2xl
                          sm:text-3xl
                          font-black
                          break-words
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
                          text-sm
                          sm:text-base
                          break-words
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

                    {/* RIGHT */}

                    <div
                      className="
                        flex
                        sm:block
                        items-center
                        justify-between
                        gap-4
                      "
                    >

                      <div
                        className="
                          px-4
                          py-2
                          rounded-full
                          text-xs
                          sm:text-sm
                          font-bold
                          uppercase
                          text-center
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
                          text-2xl
                          sm:text-3xl
                          font-black
                          mt-0
                          sm:mt-4
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
                      pb-2
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
                                    w-10
                                    h-10
                                    sm:w-12
                                    sm:h-12
                                    rounded-full
                                    flex
                                    items-center
                                    justify-center
                                    text-xs
                                    sm:text-sm
                                    font-black
                                    border-2
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
                                    text-[10px]
                                    sm:text-[11px]
                                    mt-2
                                    font-bold
                                    uppercase
                                    whitespace-nowrap
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
                                    w-8
                                    sm:w-10
                                    h-1
                                    rounded-full
                                    mx-1
                                    sm:mx-2
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
                            gap-3
                            bg-black/20
                            border
                            border-white/10
                            rounded-2xl
                            p-4
                          "
                        >

                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >

                            <h3
                              className="
                                text-base
                                sm:text-lg
                                font-bold
                                break-words
                              "
                            >
                              {item.name}
                            </h3>

                            <p
                              className="
                                text-xs
                                sm:text-sm
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
                              min-w-[55px]
                              h-[55px]
                              sm:min-w-[70px]
                              sm:h-[70px]
                              rounded-2xl
                              flex
                              items-center
                              justify-center
                              text-xl
                              sm:text-3xl
                              font-black
                              shrink-0
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
                      flex-col
                      sm:flex-row
                      gap-3
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
                          w-full
                          py-4
                          px-5
                          rounded-2xl
                          text-base
                          sm:text-lg
                          font-black
                          transition-all
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
                          w-full
                          sm:w-auto
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