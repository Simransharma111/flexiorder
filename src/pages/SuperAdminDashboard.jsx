import { useEffect, useState } from "react";

import {
  FaHotel,
  FaTrash,
  FaPlus,
  FaUser,
} from "react-icons/fa";

import api from "../api/axios";

export default function SuperAdminDashboard() {

  // =========================
  // STATES
  // =========================

  const [hotels, setHotels] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const [formData, setFormData] =
    useState({
      hotelName: "",
      address: "",
      phone: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
    });

  // =========================
  // FETCH HOTELS
  // =========================

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {

    try {

      const token =
        localStorage.getItem("token");

      const res = await api.get(
        "/admin/hotels",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setHotels(res.data);

    } catch (err) {

      console.log(err);

      alert(
        err.response?.data ||
          "Failed to fetch hotels"
      );

    }
  };

  // =========================
  // CREATE HOTEL
  // =========================

  const createHotel = async () => {

    try {

      setLoading(true);

      const token =
        localStorage.getItem("token");

      const payload = {
        hotelName:
          formData.hotelName,
        address:
          formData.address,
        phone:
          formData.phone,
        ownerName:
          formData.ownerName,
        ownerEmail:
          formData.ownerEmail,
        ownerPassword:
          formData.ownerPassword,
      };

      const res = await api.post(
        "/admin/create-hotel",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // ADD NEW HOTEL TO UI

      setHotels((prev) => [
        res.data.hotel,
        ...prev,
      ]);

      // RESET FORM

      setFormData({
        hotelName: "",
        address: "",
        phone: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
      });

      setShowModal(false);

      alert(
        "Hotel created successfully"
      );

    } catch (err) {

      console.log(err);

      alert(
        err.response?.data ||
          "Failed to create hotel"
      );

    } finally {

      setLoading(false);

    }
  };

  // =========================
  // DELETE HOTEL
  // =========================

  const deleteHotel = async (
    id
  ) => {

    const confirmDelete =
      window.confirm(
        "Delete this hotel?"
      );

    if (!confirmDelete) return;

    try {

      const token =
        localStorage.getItem("token");

      await api.delete(
        `/admin/hotels/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setHotels((prev) =>
        prev.filter(
          (hotel) =>
            hotel._id !== id
        )
      );

      alert(
        "Hotel deleted successfully"
      );

    } catch (err) {

      console.log(err);

      alert(
        err.response?.data ||
          "Failed to delete hotel"
      );

    }
  };

  return (

    <div className="min-h-screen bg-[#0F172A] text-white p-6">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10">

        <div>

          <h1 className="text-4xl font-bold">
            Super Admin Dashboard
          </h1>

          <p className="text-gray-400 mt-2">
            Manage hotels and owners
          </p>

        </div>

        <button
          onClick={() =>
            setShowModal(true)
          }
          className="bg-orange-500 hover:bg-orange-600 transition px-6 py-3 rounded-2xl font-semibold flex items-center gap-3"
        >
          <FaPlus />

          Create Hotel
        </button>

      </div>

      {/* STATS */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

          <h2 className="text-gray-400 text-lg">
            Total Hotels
          </h2>

          <h1 className="text-5xl font-bold mt-4">
            {hotels.length}
          </h1>

        </div>

      </div>

      {/* HOTELS */}

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">

        <h2 className="text-3xl font-bold mb-8">
          Hotels
        </h2>

        {
          hotels.length === 0 ? (

            <div className="text-center py-20 text-gray-400">
              No hotels found
            </div>

          ) : (

            <div className="space-y-5">

              {
                hotels.map((hotel) => (

                  <div
                    key={hotel._id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5"
                  >

                    {/* LEFT */}

                    <div>

                      <div className="flex items-center gap-3">

                        <FaHotel className="text-orange-400 text-2xl" />

                        <h2 className="text-2xl font-bold">
                          {hotel.name}
                        </h2>

                      </div>

                      <p className="text-gray-400 mt-3">
                        {hotel.address}
                      </p>

                      <p className="text-gray-400 mt-1">
                        {hotel.phone}
                      </p>

                      {/* OWNER */}

                      {
                        hotel.owner && (
                          <div className="flex items-center gap-2 mt-3 text-gray-300">

                            <FaUser />

                            <span>
                              {
                                hotel.owner
                                  ?.name
                              }
                            </span>

                          </div>
                        )
                      }

                    </div>

                    {/* RIGHT */}

                    <div className="flex items-center gap-4">

                      <span
                        className={`px-4 py-2 rounded-full text-sm ${
                          hotel.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {
                          hotel.isActive
                            ? "Active"
                            : "Inactive"
                        }
                      </span>

                      <button
                        onClick={() =>
                          deleteHotel(
                            hotel._id
                          )
                        }
                        className="bg-red-500 hover:bg-red-600 transition p-3 rounded-xl"
                      >
                        <FaTrash />
                      </button>

                    </div>

                  </div>
                ))
              }

            </div>

          )
        }

      </div>

      {/* MODAL */}

      {
        showModal && (

          <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4">

            <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-xl p-6">

              <h2 className="text-3xl font-bold mb-6">
                Create Hotel
              </h2>

              {/* HOTEL NAME */}

              <input
                type="text"
                placeholder="Hotel Name"
                value={formData.hotelName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    hotelName:
                      e.target.value,
                  })
                }
                className="w-full mb-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* ADDRESS */}

              <input
                type="text"
                placeholder="Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    address:
                      e.target.value,
                  })
                }
                className="w-full mb-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* PHONE */}

              <input
                type="text"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone:
                      e.target.value,
                  })
                }
                className="w-full mb-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* OWNER NAME */}

              <input
                type="text"
                placeholder="Owner Name"
                value={formData.ownerName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ownerName:
                      e.target.value,
                  })
                }
                className="w-full mb-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* OWNER EMAIL */}

              <input
                type="email"
                placeholder="Owner Email"
                value={formData.ownerEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ownerEmail:
                      e.target.value,
                  })
                }
                className="w-full mb-4 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* OWNER PASSWORD */}

              <input
                type="password"
                placeholder="Owner Password"
                value={formData.ownerPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    ownerPassword:
                      e.target.value,
                  })
                }
                className="w-full mb-6 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              />

              {/* BUTTONS */}

              <div className="flex gap-4">

                <button
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="flex-1 bg-white/10 py-3 rounded-2xl"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    createHotel
                  }
                  disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 py-3 rounded-2xl font-semibold"
                >
                  {
                    loading
                      ? "Creating..."
                      : "Create Hotel"
                  }
                </button>

              </div>

            </div>

          </div>
        )
      }

    </div>
  );
}