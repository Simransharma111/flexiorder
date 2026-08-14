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
  FaSyncAlt,
  FaTimes,
} from "react-icons/fa";

import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/session.js";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [hotels, setHotels] = useState([]);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const [error, setError] = useState("");

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

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError("");

      console.log("FETCHING HOTELS...");

      const res = await api.get("/admin/hotels");

      console.log(
        "GET HOTELS RESPONSE:",
        res.data
      );

      /*
       * Backend response:
       *
       * {
       *   success: true,
       *   hotels: [...]
       * }
       */

      const hotelsFromServer =
        res.data?.hotels;

      if (Array.isArray(hotelsFromServer)) {
        setHotels(hotelsFromServer);
      } else {
        console.warn(
          "Unexpected hotel response:",
          res.data
        );

        setHotels([]);

        setError(
          "Server returned an invalid hotel list."
        );
      }
    } catch (err) {
      console.error(
        "FETCH HOTELS ERROR:",
        err
      );

      console.error(
        "STATUS:",
        err?.response?.status
      );

      console.error(
        "DATA:",
        err?.response?.data
      );

      const message =
        err?.response?.data?.message ||
        "Failed to fetch hotels.";

      setError(message);

      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchHotels();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setFormData({
      hotelName: "",
      address: "",
      phone: "",
      ownerName: "",
      ownerEmail: "",
      ownerPassword: "",
    });
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (actionLoading === "create") {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  // =====================================================
  // CREATE HOTEL
  // =====================================================

  const createHotel = async () => {
    const hotelName =
      formData.hotelName.trim();

    const ownerName =
      formData.ownerName.trim();

    const ownerEmail =
      formData.ownerEmail.trim();

    const ownerPassword =
      formData.ownerPassword.trim();

    if (!hotelName) {
      alert("Please enter hotel name.");
      return;
    }

    if (!ownerName) {
      alert("Please enter owner name.");
      return;
    }

    if (!ownerEmail) {
      alert("Please enter owner email.");
      return;
    }

    if (!ownerPassword) {
      alert("Please enter owner password.");
      return;
    }

    if (ownerPassword.length < 6) {
      alert(
        "Owner password must be at least 6 characters."
      );
      return;
    }

    try {
      setActionLoading("create");

      const payload = {
        hotelName,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        ownerName,
        ownerEmail,
        ownerPassword,
      };

      console.log(
        "CREATING HOTEL:",
        payload
      );

      const res = await api.post(
        "/admin/create-hotel",
        payload
      );

      console.log(
        "CREATE HOTEL RESPONSE:",
        res.data
      );

      if (!res.data?.success) {
        throw new Error(
          res.data?.message ||
          "Hotel creation failed."
        );
      }

      /*
       * Fetch the complete list again.
       * This keeps frontend state synchronized
       * with MongoDB.
       */

      await fetchHotels();

      setShowModal(false);

      resetForm();

      alert(
        "Hotel and owner created successfully."
      );
    } catch (err) {
      console.error(
        "CREATE HOTEL ERROR:",
        err
      );

      alert(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create hotel."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // ACTIVATE HOTEL
  // =====================================================

  const activateHotel = async (id) => {
    if (!id) return;

    try {
      setActionLoading(id);

      const res = await api.put(
        `/admin/hotels/${id}/activate`
      );

      console.log(
        "ACTIVATE RESPONSE:",
        res.data
      );

      if (res.data?.hotel) {
        setHotels((prev) =>
          prev.map((hotel) =>
            hotel._id === id
              ? res.data.hotel
              : hotel
          )
        );
      } else {
        await fetchHotels();
      }
    } catch (err) {
      console.error(
        "ACTIVATE ERROR:",
        err
      );

      alert(
        err?.response?.data?.message ||
        "Failed to activate hotel."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // DEACTIVATE HOTEL
  // =====================================================

  const deactivateHotel = async (id) => {
    if (!id) return;

    const confirmed =
      window.confirm(
        "Deactivate this hotel?\n\nThe owner will also lose access."
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(id);

      const res = await api.put(
        `/admin/hotels/${id}/deactivate`
      );

      console.log(
        "DEACTIVATE RESPONSE:",
        res.data
      );

      if (res.data?.hotel) {
        setHotels((prev) =>
          prev.map((hotel) =>
            hotel._id === id
              ? res.data.hotel
              : hotel
          )
        );
      } else {
        await fetchHotels();
      }
    } catch (err) {
      console.error(
        "DEACTIVATE ERROR:",
        err
      );

      alert(
        err?.response?.data?.message ||
        "Failed to deactivate hotel."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // DELETE HOTEL
  // =====================================================

  const deleteHotel = async (id) => {
    if (!id) return;

    const confirmed =
      window.confirm(
        "PERMANENTLY DELETE this hotel and its owner?\n\nThis action cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(id);

      const res = await api.delete(
        `/admin/hotels/${id}`
      );

      console.log(
        "DELETE RESPONSE:",
        res.data
      );

      setHotels((prev) =>
        prev.filter(
          (hotel) =>
            hotel._id !== id
        )
      );

      alert(
        "Hotel and owner deleted successfully."
      );
    } catch (err) {
      console.error(
        "DELETE HOTEL ERROR:",
        err
      );

      alert(
        err?.response?.data?.message ||
        "Failed to delete hotel."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    const confirmed =
      window.confirm(
        "Do you want to logout?"
      );

    if (!confirmed) {
      return;
    }

    clearAuthSession();

    navigate("/", {
      replace: true,
    });
  };

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
  // RENDER
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

          {/* REFRESH */}

          <button
            type="button"
            onClick={fetchHotels}
            disabled={loading}
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            <FaSyncAlt
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {/* CREATE */}

          <button
            type="button"
            onClick={() =>
              setShowModal(true)
            }
            className="bg-orange-500 hover:bg-orange-600 transition px-5 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            <FaPlus />

            Create Hotel
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 transition px-5 py-3 rounded-xl font-semibold"
          >
            Logout
          </button>

        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

            <div>
              <p className="font-semibold text-red-400">
                Unable to load hotels
              </p>

              <p className="text-sm text-red-300/80 mt-1">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHotels}
              className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold"
            >
              Try Again
            </button>

          </div>
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

        {/* TOTAL */}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">

          <p className="text-gray-400">
            Total Hotels
          </p>

          <h2 className="text-4xl font-bold mt-2">
            {totalHotels}
          </h2>

        </div>

        {/* ACTIVE */}

        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">

          <p className="text-green-400">
            Active Hotels
          </p>

          <h2 className="text-4xl font-bold mt-2 text-green-400">
            {activeHotels}
          </h2>

        </div>

        {/* INACTIVE */}

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
          HOTEL LIST
      ================================================= */}

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Hotels
            </h2>

            <p className="text-gray-400 mt-1">
              Manage hotel accounts and access
            </p>
          </div>

          <div className="text-sm text-gray-400">
            {totalHotels}{" "}
            {totalHotels === 1
              ? "hotel"
              : "hotels"}
          </div>

        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="text-center py-20">

            <FaSyncAlt className="mx-auto text-4xl text-orange-400 animate-spin mb-4" />

            <p className="text-gray-400">
              Loading hotels...
            </p>

          </div>

        ) : hotels.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <div className="text-center py-20 text-gray-400">

            <FaHotel className="mx-auto text-5xl mb-4 opacity-40" />

            <h3 className="text-xl font-semibold text-gray-300">
              No hotels found
            </h3>

            <p className="mt-2 text-sm">
              Create a hotel to get started.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowModal(true)
              }
              className="mt-5 bg-orange-500 hover:bg-orange-600 px-5 py-3 rounded-xl font-semibold inline-flex items-center gap-2"
            >
              <FaPlus />

              Create Hotel
            </button>

          </div>

        ) : (

          /* =================================================
             HOTELS
          ================================================= */

          <div className="space-y-4">

            {hotels.map((hotel) => {

              const isActive =
                hotel.isActive !== false;

              const owner =
                hotel.owner;

              const isLoading =
                actionLoading ===
                hotel._id;

              return (

                <div
                  key={hotel._id}
                  className={`border rounded-2xl p-5 transition ${
                    isActive
                      ? "bg-white/5 border-white/10"
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >

                  {/* =================================================
                      HOTEL TOP
                  ================================================= */}

                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">

                    {/* HOTEL INFO */}

                    <div className="flex-1">

                      <div className="flex items-start gap-3">

                        <div className="bg-orange-500/10 p-3 rounded-xl shrink-0">

                          <FaHotel className="text-orange-400 text-xl" />

                        </div>

                        <div className="min-w-0">

                          <h3 className="text-xl md:text-2xl font-bold break-words">
                            {hotel.name ||
                              "Unnamed Hotel"}
                          </h3>

                          <p className="text-xs text-gray-500 mt-1 break-all">
                            ID:{" "}
                            {hotel._id}
                          </p>

                        </div>

                      </div>

                      {/* =================================================
                          HOTEL DETAILS
                      ================================================= */}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">

                        <div className="flex items-start gap-2 text-gray-300">

                          <FaMapMarkerAlt className="text-gray-500 mt-1 shrink-0" />

                          <span>
                            {hotel.address ||
                              "No address"}
                          </span>

                        </div>

                        <div className="flex items-center gap-2 text-gray-300">

                          <FaPhone className="text-gray-500 shrink-0" />

                          <span>
                            {hotel.phone ||
                              "No phone"}
                          </span>

                        </div>

                      </div>

                      {/* =================================================
                          OWNER DETAILS
                      ================================================= */}

                      {owner ? (

                        <div className="mt-5 bg-black/20 border border-white/5 rounded-xl p-4">

                          <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">
                            Owner Details
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            <div className="flex items-center gap-2 min-w-0">

                              <FaUser className="text-orange-400 shrink-0" />

                              <span className="truncate">
                                {owner.name ||
                                  "No name"}
                              </span>

                            </div>

                            <div className="flex items-center gap-2 min-w-0">

                              <FaEnvelope className="text-orange-400 shrink-0" />

                              <span className="break-all">
                                {owner.email ||
                                  "No email"}
                              </span>

                            </div>

                          </div>

                        </div>

                      ) : (

                        <div className="mt-5 bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-4">

                          <p className="text-sm text-yellow-400">
                            No owner is linked to this hotel.
                          </p>

                        </div>

                      )}

                    </div>

                    {/* =================================================
                        STATUS
                    ================================================= */}

                    <div className="flex flex-col items-start xl:items-end gap-3">

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {isActive
                          ? "● Active"
                          : "● Inactive"}
                      </span>

                      {hotel.setupCompleted !==
                        undefined && (

                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            hotel.setupCompleted
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {hotel.setupCompleted
                            ? "Setup Complete"
                            : "Setup Pending"}
                        </span>

                      )}

                    </div>

                  </div>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/10">

                    {isActive ? (

                      <button
                        type="button"
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
                        type="button"
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
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        deleteHotel(
                          hotel._id
                        )
                      }
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
                    >

                      <FaTrash />

                      {isLoading
                        ? "Please wait..."
                        : "Delete"}

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

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">

          <div className="bg-[#111827] border border-white/10 rounded-3xl w-full max-w-xl p-6 my-8 shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between mb-6">

              <div>
                <h2 className="text-2xl md:text-3xl font-bold">
                  Create Hotel
                </h2>

                <p className="text-gray-400 text-sm mt-1">
                  Create a hotel and its owner account.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  actionLoading ===
                  "create"
                }
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-50"
              >
                <FaTimes />
              </button>

            </div>

            {/* HOTEL NAME */}

            <label className="block text-sm text-gray-300 mb-2">
              Hotel Name *
            </label>

            <input
              type="text"
              name="hotelName"
              placeholder="Hotel Name"
              value={
                formData.hotelName
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* ADDRESS */}

            <label className="block text-sm text-gray-300 mb-2">
              Hotel Address
            </label>

            <input
              type="text"
              name="address"
              placeholder="Hotel address"
              value={
                formData.address
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* PHONE */}

            <label className="block text-sm text-gray-300 mb-2">
              Hotel Phone
            </label>

            <input
              type="text"
              name="phone"
              placeholder="Hotel phone"
              value={
                formData.phone
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* OWNER NAME */}

            <label className="block text-sm text-gray-300 mb-2">
              Owner Name *
            </label>

            <input
              type="text"
              name="ownerName"
              placeholder="Owner name"
              value={
                formData.ownerName
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* OWNER EMAIL */}

            <label className="block text-sm text-gray-300 mb-2">
              Owner Email *
            </label>

            <input
              type="email"
              name="ownerEmail"
              placeholder="owner@example.com"
              value={
                formData.ownerEmail
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* PASSWORD */}

            <label className="block text-sm text-gray-300 mb-2">
              Owner Password *
            </label>

            <input
              type="password"
              name="ownerPassword"
              placeholder="Minimum 6 characters"
              value={
                formData.ownerPassword
              }
              onChange={
                handleFormChange
              }
              disabled={
                actionLoading ===
                "create"
              }
              className="w-full mb-6 bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500 disabled:opacity-50"
            />

            {/* BUTTONS */}

            <div className="flex gap-3">

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  actionLoading ===
                  "create"
                }
                className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createHotel}
                disabled={
                  actionLoading ===
                  "create"
                }
                className="flex-1 bg-orange-500 hover:bg-orange-600 py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >

                {actionLoading ===
                "create" ? (

                  <>
                    <FaSyncAlt className="animate-spin" />

                    Creating...
                  </>

                ) : (

                  <>
                    <FaPlus />

                    Create Hotel
                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}