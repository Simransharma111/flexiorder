import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";


import api from "../api/axios";
import socket from "../socket";


// Components

import KitchenSidebar from "../components/kitchen/KitchenSidebar";
import KitchenHeader from "../components/kitchen/KitchenHeader";
import KitchenStats from "../components/kitchen/KitchenStats";
import KitchenBoard from "../components/kitchen/KitchenBoard";



export default function KitchenDashboard() {


  const navigate = useNavigate();



  // =========================
  // STATES
  // =========================


  const [hotel, setHotel] = useState(null);

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [search, setSearch] = useState("");





  // =========================
  // FETCH HOTEL
  // =========================


  const fetchHotel = async () => {


    try {


      const res =
        await api.get(
          "/hotel/me",
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
          }
        );



      setHotel(res.data);



    }
    catch (err) {

      console.error(
        "Hotel fetch error",
        err
      );

    }


  };









  // =========================
  // FETCH ORDERS
  // =========================


  const fetchOrders = async () => {


    try {


      const res =
        await api.get(
          "/kitchen/orders",
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`
            }
          }
        );



      const activeOrders =
        (res.data.orders || [])
          .filter(
            order =>

              order.status !== "delivered"

              &&

              order.status !== "cancelled"

          );



      setOrders(activeOrders);



    }
    catch (err) {

      console.error(
        "Orders fetch error",
        err
      );


    }
    finally {

      setLoading(false);

    }


  };









  // =========================
  // SOCKET
  // =========================


  useEffect(() => {


    fetchHotel();

    fetchOrders();





    const handleNewOrder = (order) => {


      setOrders(
        prev => [
          order,
          ...prev
        ]
      );



      // sound alert

      const audio =
        new Audio(
          "/orders_received.mp3"
        );


      audio.play()
        .catch(() => { });


    };


    const handleOrderUpdate = (updatedOrder) => {
      if (updatedOrder.status === "cancelled") {
        setOrders(prev =>
          prev.filter(order => order._id !== updatedOrder._id)
        );
        return;
      }

      if (updatedOrder.status === "delivered") {
        setOrders(prev =>
          prev.map(order =>
            order._id === updatedOrder._id
              ? updatedOrder
              : order
          )
        );

        window.setTimeout(() => {
          setOrders(prev =>
            prev.filter(
              order =>
                order._id !== updatedOrder._id ||
                order.status !== "delivered"
            )
          );
        }, 10000);

        return;
      }

      setOrders(

        prev => {
          const exists =
            prev.some(
              order =>

                order._id === updatedOrder._id

            );

          if (!exists) {

            return [

              updatedOrder,

              ...prev

            ];

          }
          return prev.map(

            order =>

              order._id === updatedOrder._id

                ?

                updatedOrder

                :

                order

          );



        }

      );



    };

    socket.on(
      "newOrder",
      handleNewOrder
    );


    socket.on(
      "kitchenOrderUpdated",
      handleOrderUpdate
    );


    return () => {
      socket.off(
        "newOrder",
        handleNewOrder
      );

      socket.off(
        "kitchenOrderUpdated",
        handleOrderUpdate
      );

    };

  }, []);

  // =========================
  // AUTO REFRESH
  // =========================


  useEffect(() => {


    const interval =
      setInterval(
        fetchOrders,
        30000
      );
    return () => clearInterval(interval);
  }, []);

  // =========================
  // HELPERS
  // =========================


  const getLocation = (order) => {

    if (
      order.locationType === "room"
    ) {

      return `Room ${order.locationNumber}`;

    }

    return `Table ${order.locationNumber}`;

  };

  const getOrderType = (order) => {


    if (
      order.locationType === "room"
    ) {

      return "Room Service";

    }


    if (
      order.orderType === "takeaway"
    ) {

      return "Take Away";

    }



    return "Dine In";


  };

  const getWaitingMinutes = (createdAt) => {


    if (!createdAt)
      return 0;



    return Math.floor(

      (
        Date.now()
        -
        new Date(createdAt).getTime()

      )
      / 60000

    );


  };

  // =========================
  // STATUS FLOW
  // =========================


  const nextStatus = (current) => {


    const flow = {


      pending:
        "accepted",


      accepted:
        "preparing",


      preparing:
        "ready",


      ready:
        "ready"


    };


    return flow[current];


  };
  // =========================
  // UPDATE STATUS
  // =========================


  const updateStatus =
    async (
      orderId,
      status,
      pauseReason = null
    ) => {


      try {


        const res =
          await api.put(

            `/kitchen/orders/${orderId}`,

            {
              status,
              pauseReason
            },

            {
              headers: {
                Authorization:
                  `Bearer ${localStorage.getItem("token")}`
              }
            }

          );




        setOrders(

          prev =>

            prev.map(

              order =>

                order._id === orderId

                  ?

                  res.data.order

                  :

                  order

            )

        );



      }
      catch (err) {

        console.error(err);

        alert(
          "Failed to update order"
        );


      }



    };
  // =========================
  // SEARCH FILTER
  // =========================


  const filteredOrders =
    useMemo(() => {


      if (!search.trim())
        return orders;



      const text =
        search.toLowerCase();



      return orders.filter(order => {


        return (


          String(
            order.locationNumber || ""
          )

            .toLowerCase()

            .includes(text)



          ||

          String(
            order.guestName || ""
          )

            .toLowerCase()

            .includes(text)



        );


      });


    }, [
      orders,
      search
    ]);

  // =========================
  // COUNTS
  // =========================


  const newOrders =
    filteredOrders.filter(
      o => o.status === "pending"
    );

  const preparingOrders =
    filteredOrders.filter(
      o =>

        o.status === "accepted"

        ||

        o.status === "preparing"

    );



  const readyOrders =
    filteredOrders.filter(
      o => o.status === "ready"
    );
  // =========================
  // LOGOUT
  // =========================


  const logout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    localStorage.removeItem("role");


    navigate("/");


  };

  // =========================
  // LOADING
  // =========================


  if (loading) {


    return (

      <div
        className="
h-screen
flex
items-center
justify-center
font-bold
"
      >

        Loading Kitchen...

      </div>

    );


  }

  // =========================
  // UI
  // =========================


  return (

    <div
      className="
min-h-screen
bg-gray-100
flex
"
    >

      <KitchenSidebar

        hotel={hotel}

        open={sidebarOpen}

        logout={logout}
        navigate={navigate}

      />

      <div
        className="
flex-1
min-w-0
"
      >

        <KitchenHeader

          hotel={hotel}

          search={search}

          setSearch={setSearch}

          orderCount={orders.length}

          toggleSidebar={() =>
            setSidebarOpen(!sidebarOpen)
          }

        />

        <KitchenStats

          newCount={newOrders.length}

          preparingCount={
            preparingOrders.length
          }

          readyCount={
            readyOrders.length
          }

        />

        <KitchenBoard


          newOrders={newOrders}


          preparingOrders={
            preparingOrders
          }


          readyOrders={
            readyOrders
          }



          updateStatus={updateStatus}


          getLocation={getLocation}


          getOrderType={getOrderType}


          getWaitingMinutes={getWaitingMinutes}


          nextStatus={nextStatus}


        />

      </div>
    </div>

  );


}
