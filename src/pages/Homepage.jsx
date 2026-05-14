import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../api/axios";

export default function Homepage() {

  const navigate = useNavigate();

  const [showOrderModal,
    setShowOrderModal] =
    useState(false);

  const [hotels,
    setHotels] =
    useState([]);

  const [tables,
    setTables] =
    useState([]);

  const [selectedHotel,
    setSelectedHotel] =
    useState("");

  const [selectedTable,
    setSelectedTable] =
    useState("");



  // ==========================
  // FETCH HOTELS
  // ==========================

  useEffect(() => {

    fetchHotels();

  }, []);

  const fetchHotels = async () => {

    try {

      const res =
        await api.get(
          "/public/hotels"
        );

      setHotels(res.data);

    } catch (err) {

      console.log(err);

    }

  };



  // ==========================
  // FETCH TABLES
  // ==========================

  const fetchTables =
    async (hotelId) => {

      try {

        const res =
          await api.get(
            `/public/tables/${hotelId}`
          );

        setTables(res.data);

      } catch (err) {

        console.log(err);

      }

    };



  // ==========================
  // START ORDER
  // ==========================

  const handleStartOrder =
    () => {

      if (!selectedTable) {

        alert(
          "Please select table/room"
        );

        return;

      }

      setShowOrderModal(false);

      navigate(
        `/menu/table/${selectedTable}`
      );

    };



  return (

    <div className="min-h-screen bg-black text-white overflow-hidden">

      {/* HERO */}

      <section className="relative px-6 lg:px-20 py-16 lg:py-24 border-b border-white/10">

        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-yellow-500/10" />



        {/* NAVBAR */}

        <div className="relative flex justify-between items-center mb-16">

          <h1 className="text-3xl font-black text-orange-500">
            FlexiOrder
          </h1>
          </div>
<div className="relative flex justify-between items-center mb-16">
  
  {/* LOGO */}
  <div className="flex items-center gap-3">
    <img
      src="/logo.jpg"
      alt="FlexiOrder"
      className="h-10 w-auto object-contain"
    />
  </div>
          <button
            onClick={() =>
              navigate("/login")
            }
            className="border border-white/10 hover:border-orange-500 transition px-6 py-3 rounded-2xl bg-white/5 font-semibold"
          >
            Login
          </button>

        </div>



        {/* HERO CONTENT */}

        <div className="relative grid lg:grid-cols-2 gap-14 items-center">

          {/* LEFT */}

          <div>
            <h1 className="text-5xl lg:text-7xl font-black leading-tight">

              Transform Your Restaurant Into a

              <span className="text-orange-500 block mt-2">
                Smart Dining Experience
              </span>

            </h1>

            <p className="text-gray-400 text-lg mt-8 max-w-2xl leading-relaxed">

              QR menus, realtime orders,
              kitchen workflow, analytics,
              payments and more.

            </p>



            {/* BUTTONS */}

            <div className="flex flex-wrap gap-4 mt-10">

              <button
                onClick={() =>
                  navigate("/login")
                }
                className="bg-orange-500 hover:bg-orange-600 transition px-8 py-4 rounded-2xl font-bold text-lg"
              >
                Create Restaurant
              </button>

              <button
                onClick={() =>
                  setShowOrderModal(true)
                }
                className="border border-white/10 hover:border-orange-500 transition px-8 py-4 rounded-2xl font-semibold bg-white/5"
              >
                Order Food
              </button>

            </div>

          </div>



          {/* RIGHT MOCKUP */}

          <div className="bg-white/5 border border-white/10 rounded-[40px] p-8">

            <div className="space-y-4">

              <div className="bg-black/40 rounded-2xl p-5">
                🍔 Live Orders
              </div>

              <div className="bg-black/40 rounded-2xl p-5">
                📱 QR Ordering
              </div>

              <div className="bg-black/40 rounded-2xl p-5">
                📈 Analytics
              </div>

            </div>

          </div>

        </div>

      </section>



      {/* ORDER MODAL */}

      {showOrderModal && (

        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">

          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-lg p-8">

            <div className="flex justify-between items-center mb-8">

              <h2 className="text-3xl font-bold">
                Start Ordering
              </h2>

              <button
                onClick={() =>
                  setShowOrderModal(false)
                }
                className="text-2xl"
              >
                ✕
              </button>

            </div>



            {/* HOTEL */}

            <div className="mb-6">

              <label className="block mb-2 text-sm text-gray-300">
                Select Hotel
              </label>

              <select
                value={selectedHotel}
                onChange={(e) => {

                  setSelectedHotel(
                    e.target.value
                  );

                  fetchTables(
                    e.target.value
                  );

                }}
               className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none text-white">

                <option value="" >
                  Choose Hotel
                </option>

                {hotels.map((hotel) => (

                  <option
                    key={hotel._id}
                    value={hotel._id}
                  className="text-black bg-white">
                    {hotel.name}
                  </option>

                ))}

              </select>

            </div>



            {/* TABLE */}

            <div className="mb-8">

              <label className="block mb-2 text-sm text-gray-300">
                Select Room / Table
              </label>

              <select
                value={selectedTable}
                onChange={(e) =>
                  setSelectedTable(
                    e.target.value
                  )
                }
                className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              >

                <option value="">
                  Choose Table
                </option>

                {tables.map((table) => (

                  <option
                    key={table._id}
                    value={table._id}
                  className="text-black bg-white">
                    {table.tableNumber}
                  </option>

                ))}

              </select>

            </div>



            {/* BUTTON */}

            <button
              onClick={handleStartOrder}
              className="w-full bg-orange-500 hover:bg-orange-600 transition rounded-2xl py-4 text-lg font-bold"
            >
              Continue To Menu
            </button>

          </div>

        </div>

      )}

    </div>

  );
}
