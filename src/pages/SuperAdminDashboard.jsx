import { useEffect, useState } from "react";

import {
  FaHotel,
  FaTrash,
  FaPlus,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaPowerOff,
} from "react-icons/fa";

import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/session.js";


export default function SuperAdminDashboard() {

  const navigate = useNavigate();

  const [hotels, setHotels] = useState([]);

  const [loading, setLoading] = useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [formData, setFormData] = useState({
    hotelName: "",
    address: "",
    phone: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
  });

  // =====================================================
  // FETCH HOTELS
  // =====================================================

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {

    try {

      const res = await api.get(
        "/admin/hotels"
      );

      setHotels(
        Array.isArray(res.data)
          ? res.data
          : []
      );

    } catch (err) {

      console.log(
        "FETCH HOTELS ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to fetch hotels"
      );
    }
  };

  // =====================================================
  // CREATE HOTEL
  // =====================================================

  const createHotel = async () => {

    if (
      !formData.hotelName.trim() ||
      !formData.ownerName.trim() ||
      !formData.ownerEmail.trim() ||
      !formData.ownerPassword.trim()
    ) {

      alert(
        "Please fill all required fields"
      );

      return;
    }

    try {

      setLoading(true);

      const res = await api.post(
        "/admin/create-hotel",
        formData
      );

      if (res.data?.hotel) {

        setHotels((prev) => [
          res.data.hotel,
          ...prev,
        ]);

      } else {

        await fetchHotels();

      }

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

      console.log(
        "CREATE HOTEL ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to create hotel"
      );

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // ACTIVATE
  // =====================================================

  const activateHotel = async (id) => {

    try {

      setActionLoading(id);

      const res = await api.put(
        `/admin/hotels/${id}/activate`
      );

      const updatedHotel =
        res.data?.hotel;

      if (updatedHotel) {

        setHotels((prev) =>
          prev.map((hotel) =>
            hotel._id === id
              ? updatedHotel
              : hotel
          )
        );

      } else {

        await fetchHotels();

      }

    } catch (err) {

      console.log(
        "ACTIVATE ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to activate hotel"
      );

    } finally {

      setActionLoading(null);
    }
  };

  // =====================================================
  // DEACTIVATE
  // =====================================================

  const deactivateHotel = async (id) => {

    const confirmDeactivate =
      window.confirm(
        "Deactivate this hotel? The owner will also lose access."
      );

    if (!confirmDeactivate) {
      return;
    }

    try {

      setActionLoading(id);

      const res = await api.put(
        `/admin/hotels/${id}/deactivate`
      );

      const updatedHotel =
        res.data?.hotel;

      if (updatedHotel) {

        setHotels((prev) =>
          prev.map((hotel) =>
            hotel._id === id
              ? updatedHotel
              : hotel
          )
        );

      } else {

        await fetchHotels();

      }

    } catch (err) {

      console.log(
        "DEACTIVATE ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to deactivate hotel"
      );

    } finally {

      setActionLoading(null);
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const deleteHotel = async (id) => {

    const confirmDelete =
      window.confirm(
        "PERMANENTLY DELETE this hotel and its owner? This cannot be undone."
      );

    if (!confirmDelete) {
      return;
    }

    try {

      setActionLoading(id);

      await api.delete(
        `/admin/hotels/${id}`
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

      console.log(
        "DELETE ERROR:",
        err
      );

      alert(
        err.response?.data?.message ||
        "Failed to delete hotel"
      );

    } finally {

      setActionLoading(null);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => { 
  const confirmLogout = window.confirm("Do you want to logout?"); 
  if (!confirmLogout) 
    return; 
  clearAuthSession(); navigate("/"); };

  // =====================================================
  // STATS
  // =====================================================

  const totalHotels =
    hotels.length;

  const activeHotels =
    hotels.filter(
      (hotel) =>
        hotel.isActive !== false
    ).length;

  const inactiveHotels =
    hotels.filter(
      (hotel) =>
        hotel.isActive === false
    ).length;

  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="min-h-screen bg-[#0F172A] text-white p-4 md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

        <div>

          <h1 className="text-3xl md:text-4xl font-bold">
            Super Admin Dashboard
          </h1>

          <p className="text-gray-400 mt-2">
            Manage hotels and owners
          </p>

        </div>

        <div className="flex gap-3 flex-wrap">

          <button
            onClick={() =>
              setShowModal(true)
            }
            className="bg-orange-500 hover:bg-orange-600 transition px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
          >

            <FaPlus />

            Create Hotel

          </button>

          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 transition px-5 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>

        </div>

      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-gray-400">
            Total Hotels
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {totalHotels}
          </h2>

        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">

          <p className="text-green-400">
            Active Hotels
          </p>

          <h2 className="text-4xl font-bold mt-2 text-green-400">
            {activeHotels}
          </h2>

        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">

          <p className="text-red-400">
            Inactive Hotels
          </p>

          <h2 className="text-4xl font-bold mt-2 text-red-400">
            {inactiveHotels}
          </h2>

        </div>

      </div>

      {/* =================================================
          HOTELS
      ================================================= */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">

        <div className="flex items-center justify-between mb-6">

          <div>

            <h2 className="text-2xl md:text-3xl font-bold">
              Hotels
            </h2>

            <p className="text-gray-400 mt-1">
              Manage hotel accounts and access
            </p>

          </div>

        </div>

        {hotels.length === 0 ? (

          <div className="text-center py-20 text-gray-400">

            <FaHotel className="mx-auto text-5xl mb-4 opacity-40" />

            No hotels found

          </div>

        ) : (

          <div className="space-y-4">

            {hotels.map((hotel) => {

              const isActive =
                hotel.isActive !== false;

              const owner =
                hotel.owner;

              const isLoading =
                actionLoading === hotel._id;

              return (

                <div
                  key={hotel._id}
                  className={`border rounded-2xl p-5 transition ${isActive
                    ? "bg-white/5 border-white/10"
                    : "bg-red-500/5 border-red-500/20"
                    }`}
                >

                  {/* TOP */}

                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">

                    {/* HOTEL INFO */}

                    <div className="flex-1">

                      <div className="flex items-start gap-3">

                        <div className="bg-orange-500/10 p-3 rounded-xl">

                          <FaHotel className="text-orange-400 text-xl" />

                        </div>

                        <div>

                          <h3 className="text-xl md:text-2xl font-bold">

                            {hotel.name}

                          </h3>

                          <p className="text-xs text-gray-500 mt-1">

                            ID: {hotel._id}

                          </p>

                        </div>

                      </div>

                      {/* HOTEL DETAILS */}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">

                        <div className="flex items-center gap-2 text-gray-300">

                          <FaMapMarkerAlt className="text-gray-500" />

                          <span>
                            {hotel.address || "No address"}
                          </span>

                        </div>

                        <div className="flex items-center gap-2 text-gray-300">

                          <FaPhone className="text-gray-500" />

                          <span>
                            {hotel.phone || "No phone"}
                          </span>

                        </div>

                      </div>

                      {/* OWNER DETAILS */}

                      {owner && (

                        <div className="mt-5 bg-black/20 border border-white/5 rounded-xl p-4">

                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">
                            Owner Details
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            <div className="flex items-center gap-2">

                              <FaUser className="text-orange-400" />

                              <span>
                                {owner.name || "No name"}
                              </span>

                            </div>

                            <div className="flex items-center gap-2">

                              <FaEnvelope className="text-orange-400" />

                              <span className="break-all">
                                {owner.email || "No email"}
                              </span>

                            </div>

                          </div>

                        </div>

                      )}

                    </div>

                    {/* STATUS */}

                    <div className="flex flex-col items-start xl:items-end gap-3">

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                          }`}
                      >

                        {isActive
                          ? "● Active"
                          : "● Inactive"}

                      </span>

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/10">

                    {isActive ? (

                      <button
                        disabled={isLoading}
                        onClick={() =>
                          deactivateHotel(
                            hotel._id
                          )
                        }
                        className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                      >

                        <FaPowerOff />

                        {isLoading
                          ? "Please wait..."
                          : "Deactivate"}

                      </button>

                    ) : (

                      <button
                        disabled={isLoading}
                        onClick={() =>
                          activateHotel(
                            hotel._id
                          )
                        }
                        className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                      >

                        <FaPowerOff />

                        {isLoading
                          ? "Please wait..."
                          : "Activate"}

                      </button>

                    )}

                    {/* DELETE */}

                    <button
                      disabled={isLoading}
                      onClick={() =>
                        deleteHotel(
                          hotel._id
                        )
                      }
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                    >

                      <FaTrash />

                      Delete

                    </button>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </div>

      {/* =================================================
          CREATE HOTEL MODAL
      ================================================= */}

      {showModal && (

        <div className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-4 overflow-y-auto">

          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-xl p-6 my-8">

            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Create Hotel
            </h2>

            {/* HOTEL NAME */}

            <input
              type="text"
              placeholder="Hotel Name *"
              value={formData.hotelName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  hotelName:
                    e.target.value,
                })
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
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
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
            />

            {/* PHONE */}

            <input
              type="text"
              placeholder="Hotel Phone"
              value={formData.phone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  phone:
                    e.target.value,
                })
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
            />

            {/* OWNER NAME */}

            <input
              type="text"
              placeholder="Owner Name *"
              value={formData.ownerName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ownerName:
                    e.target.value,
                })
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
            />

            {/* OWNER EMAIL */}

            <input
              type="email"
              placeholder="Owner Email *"
              value={formData.ownerEmail}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ownerEmail:
                    e.target.value,
                })
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
            />

            {/* PASSWORD */}

            <input
              type="password"
              placeholder="Owner Password *"
              value={formData.ownerPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ownerPassword:
                    e.target.value,
                })
              }
              className="w-full mb-6 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
            />

            {/* BUTTONS */}

            <div className="flex gap-3">

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={createHotel}
                disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 py-3 rounded-xl font-semibold disabled:opacity-50"
              >

                {loading
                  ? "Creating..."
                  : "Create Hotel"}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}