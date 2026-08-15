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
  FaSignOutAlt,
} from "react-icons/fa";

import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/session.js";

const inputClass =
  "w-full rounded-card border border-hairline bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-disabled focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50";

const labelClass = "mb-1.5 block text-sm font-bold text-ink";

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

  const [modalError, setModalError] = useState("");

  const [notice, setNotice] = useState(null);

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

      const res = await api.get("/admin/hotels");

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

    if (modalError) setModalError("");

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
    setModalError("");
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
      setModalError("Please enter hotel name.");
      return;
    }

    if (!ownerName) {
      setModalError("Please enter owner name.");
      return;
    }

    if (!ownerEmail) {
      setModalError("Please enter owner email.");
      return;
    }

    if (!ownerPassword) {
      setModalError("Please enter owner password.");
      return;
    }

    if (ownerPassword.length < 6) {
      setModalError(
        "Owner password must be at least 6 characters."
      );
      return;
    }

    try {
      setActionLoading("create");
      setModalError("");

      const payload = {
        hotelName,
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        ownerName,
        ownerEmail,
        ownerPassword,
      };

      const res = await api.post(
        "/admin/create-hotel",
        payload
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

      setNotice({
        type: "success",
        text: "Hotel and owner created successfully.",
      });
    } catch (err) {
      console.error(
        "CREATE HOTEL ERROR:",
        err
      );

      setModalError(
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

      setNotice({
        type: "error",
        text:
          err?.response?.data?.message ||
          "Failed to activate hotel.",
      });
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

      setNotice({
        type: "error",
        text:
          err?.response?.data?.message ||
          "Failed to deactivate hotel.",
      });
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

      await api.delete(
        `/admin/hotels/${id}`
      );

      setHotels((prev) =>
        prev.filter(
          (hotel) =>
            hotel._id !== id
        )
      );

      setNotice({
        type: "success",
        text: "Hotel and owner deleted successfully.",
      });
    } catch (err) {
      console.error(
        "DELETE HOTEL ERROR:",
        err
      );

      setNotice({
        type: "error",
        text:
          err?.response?.data?.message ||
          "Failed to delete hotel.",
      });
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
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Super Admin
          </h1>

          <p className="mt-1 text-sm text-ink-secondary">
            Manage hotels and owner accounts
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">

          {/* REFRESH */}

          <button
            type="button"
            onClick={fetchHotels}
            disabled={loading}
            className="flex min-h-11 items-center gap-2 rounded-card border border-hairline bg-white px-4 text-sm font-bold text-ink transition hover:bg-subtle disabled:opacity-50"
          >
            <FaSyncAlt
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
              aria-hidden="true"
            />

            Refresh
          </button>

          {/* CREATE */}

          <button
            type="button"
            onClick={() =>
              setShowModal(true)
            }
            className="flex min-h-11 items-center gap-2 rounded-card bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong"
          >
            <FaPlus aria-hidden="true" />

            Create Hotel
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 items-center gap-2 rounded-card border border-status-delayed-line/40 bg-white px-4 text-sm font-bold text-status-delayed-ink transition hover:bg-status-delayed-surface"
          >
            <FaSignOutAlt aria-hidden="true" />

            Logout
          </button>

        </div>
      </div>

      {/* =================================================
          NOTICE
      ================================================= */}

      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-start justify-between gap-3 rounded-card border px-4 py-3 text-sm font-semibold ${
            notice.type === "success"
              ? "border-status-ready-line/40 bg-status-ready-surface text-status-ready-ink"
              : "border-status-delayed-line/40 bg-status-delayed-surface text-status-delayed-ink"
          }`}
        >
          {notice.text}

          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="rounded-sm p-0.5 opacity-70 transition hover:opacity-100"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="mb-5 rounded-card border border-status-delayed-line/40 bg-status-delayed-surface p-4">

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

            <div role="alert">
              <p className="text-sm font-bold text-status-delayed-ink">
                Unable to load hotels
              </p>

              <p className="mt-0.5 text-sm text-status-delayed-ink/80">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHotels}
              className="min-h-10 shrink-0 rounded-card border border-status-delayed-line/40 bg-white px-4 text-sm font-bold text-status-delayed-ink transition hover:bg-status-delayed-surface"
            >
              Try Again
            </button>

          </div>
        </div>
      )}

      {/* =================================================
          STATS
      ================================================= */}

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">

        {/* TOTAL */}

        <div className="rounded-card border border-hairline bg-white p-4 shadow-card">

          <dt className="text-xs font-bold uppercase tracking-wider text-ink-disabled">
            Total Hotels
          </dt>

          <dd className="mt-1.5 text-3xl font-extrabold text-ink">
            {totalHotels}
          </dd>

        </div>

        {/* ACTIVE */}

        <div className="rounded-card border-l-4 border-y border-r border-hairline border-l-status-ready-line bg-white p-4 shadow-card">

          <dt className="text-xs font-bold uppercase tracking-wider text-status-ready-ink">
            Active
          </dt>

          <dd className="mt-1.5 text-3xl font-extrabold text-status-ready-ink">
            {activeHotels}
          </dd>

        </div>

        {/* INACTIVE */}

        <div className="rounded-card border-l-4 border-y border-r border-hairline border-l-status-delayed-line bg-white p-4 shadow-card">

          <dt className="text-xs font-bold uppercase tracking-wider text-status-delayed-ink">
            Inactive
          </dt>

          <dd className="mt-1.5 text-3xl font-extrabold text-status-delayed-ink">
            {inactiveHotels}
          </dd>

        </div>

      </dl>

      {/* =================================================
          HOTEL LIST
      ================================================= */}

      <section className="rounded-panel border border-hairline bg-white p-4 shadow-card md:p-6" aria-label="Hotels">

        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

          <div>
            <h2 className="text-xl font-extrabold">
              Hotels
            </h2>

            <p className="mt-0.5 text-sm text-ink-secondary">
              Manage hotel accounts and access
            </p>
          </div>

          <p className="text-sm font-semibold text-ink-secondary">
            {totalHotels}{" "}
            {totalHotels === 1
              ? "hotel"
              : "hotels"}
          </p>

        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <div className="py-16 text-center">

            <FaSyncAlt className="mx-auto mb-3 animate-spin text-3xl text-brand" aria-hidden="true" />

            <p className="text-sm font-semibold text-ink-secondary">
              Loading hotels…
            </p>

          </div>

        ) : hotels.length === 0 ? (

          /* =================================================
             EMPTY
          ================================================= */

          <div className="py-16 text-center">

            <FaHotel className="mx-auto mb-4 text-4xl text-ink-disabled" aria-hidden="true" />

            <h3 className="text-lg font-extrabold text-ink">
              No hotels yet
            </h3>

            <p className="mt-1.5 text-sm text-ink-secondary">
              Create a hotel to get started.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowModal(true)
              }
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-card bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong"
            >
              <FaPlus aria-hidden="true" />

              Create Hotel
            </button>

          </div>

        ) : (

          /* =================================================
             HOTELS
          ================================================= */

          <div className="space-y-3.5">

            {hotels.map((hotel) => {

              const isActive =
                hotel.isActive !== false;

              const owner =
                hotel.owner;

              const isLoading =
                actionLoading ===
                hotel._id;

              return (

                <article
                  key={hotel._id}
                  className={`rounded-card border p-4 md:p-5 ${
                    isActive
                      ? "border-hairline bg-white"
                      : "border-status-delayed-line/40 bg-status-delayed-surface/40"
                  }`}
                >

                  {/* =================================================
                      HOTEL TOP
                  ================================================= */}

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                    {/* HOTEL INFO */}

                    <div className="flex-1">

                      <div className="flex items-start gap-3">

                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-brand-light text-brand">

                          <FaHotel aria-hidden="true" />

                        </span>

                        <div className="min-w-0">

                          <h3 className="break-words text-lg font-extrabold text-ink md:text-xl">
                            {hotel.name ||
                              "Unnamed Hotel"}
                          </h3>

                          <p className="mt-0.5 break-all text-xs text-ink-disabled">
                            ID:{" "}
                            {hotel._id}
                          </p>

                        </div>

                      </div>

                      {/* =================================================
                          HOTEL DETAILS
                      ================================================= */}

                      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">

                        <p className="flex items-start gap-2 text-sm text-ink-secondary">

                          <FaMapMarkerAlt className="mt-0.5 shrink-0 text-ink-disabled" aria-hidden="true" />

                          <span>
                            {hotel.address ||
                              "No address"}
                          </span>

                        </p>

                        <p className="flex items-center gap-2 text-sm text-ink-secondary">

                          <FaPhone className="shrink-0 text-ink-disabled" aria-hidden="true" />

                          <span>
                            {hotel.phone ||
                              "No phone"}
                          </span>

                        </p>

                      </div>

                      {/* =================================================
                          OWNER DETAILS
                      ================================================= */}

                      {owner ? (

                        <div className="mt-4 rounded-card border border-hairline bg-canvas p-3.5">

                          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-ink-disabled">
                            Owner
                          </p>

                          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">

                            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">

                              <FaUser className="shrink-0 text-brand" aria-hidden="true" />

                              <span className="truncate">
                                {owner.name ||
                                  "No name"}
                              </span>

                            </p>

                            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">

                              <FaEnvelope className="shrink-0 text-brand" aria-hidden="true" />

                              <span className="break-all">
                                {owner.email ||
                                  "No email"}
                              </span>

                            </p>

                          </div>

                        </div>

                      ) : (

                        <div className="mt-4 rounded-card border border-status-new-line/40 bg-status-new-surface p-3.5">

                          <p className="text-sm font-semibold text-status-new-ink">
                            No owner is linked to this hotel.
                          </p>

                        </div>

                      )}

                    </div>

                    {/* =================================================
                        STATUS
                    ================================================= */}

                    <div className="flex flex-col items-start gap-2 xl:items-end">

                      <span
                        className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold ${
                          isActive
                            ? "bg-status-ready-surface text-status-ready-ink"
                            : "bg-status-delayed-surface text-status-delayed-ink"
                        }`}
                      >
                        {isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                      {hotel.setupCompleted !==
                        undefined && (

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            hotel.setupCompleted
                              ? "bg-status-preparing-surface text-status-preparing-ink"
                              : "bg-status-new-surface text-status-new-ink"
                          }`}
                        >
                          {hotel.setupCompleted
                            ? "Setup complete"
                            : "Setup pending"}
                        </span>

                      )}

                    </div>

                  </div>

                  {/* =================================================
                      ACTIONS
                  ================================================= */}

                  <div className="mt-4 flex flex-wrap gap-2.5 border-t border-hairline pt-4">

                    {isActive ? (

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          deactivateHotel(
                            hotel._id
                          )
                        }
                        className="flex min-h-10 items-center gap-2 rounded-card border border-status-new-line/40 bg-status-new-surface px-4 text-sm font-bold text-status-new-ink transition hover:brightness-95 disabled:opacity-50"
                      >

                        <FaPowerOff aria-hidden="true" />

                        {isLoading
                          ? "Please wait…"
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
                        className="flex min-h-10 items-center gap-2 rounded-card border border-status-ready-line/40 bg-status-ready-surface px-4 text-sm font-bold text-status-ready-ink transition hover:brightness-95 disabled:opacity-50"
                      >

                        <FaPowerOff aria-hidden="true" />

                        {isLoading
                          ? "Please wait…"
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
                      className="flex min-h-10 items-center gap-2 rounded-card border border-status-delayed-line/40 bg-white px-4 text-sm font-bold text-status-delayed-ink transition hover:bg-status-delayed-surface disabled:opacity-50"
                    >

                      <FaTrash aria-hidden="true" />

                      {isLoading
                        ? "Please wait…"
                        : "Delete"}

                    </button>

                  </div>

                </article>

              );
            })}

          </div>

        )}

      </section>

      {/* =================================================
          CREATE HOTEL MODAL
      ================================================= */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-hotel-title"
            className="my-8 w-full max-w-xl rounded-panel border border-hairline bg-white p-6 shadow-pop"
          >

            {/* MODAL HEADER */}

            <div className="mb-5 flex items-start justify-between gap-4">

              <div>
                <h2 id="create-hotel-title" className="text-xl font-extrabold md:text-2xl">
                  Create Hotel
                </h2>

                <p className="mt-1 text-sm text-ink-secondary">
                  Creates a hotel and its owner login.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  actionLoading ===
                  "create"
                }
                aria-label="Close dialog"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-card text-ink-secondary transition hover:bg-subtle hover:text-ink disabled:opacity-50"
              >
                <FaTimes aria-hidden="true" />
              </button>

            </div>

            {modalError && (
              <p
                role="alert"
                className="mb-4 rounded-card border border-status-delayed-line/40 bg-status-delayed-surface px-3.5 py-2.5 text-sm font-semibold text-status-delayed-ink"
              >
                {modalError}
              </p>
            )}

            {/* HOTEL NAME */}

            <label htmlFor="hotelName" className={labelClass}>
              Hotel Name *
            </label>

            <input
              id="hotelName"
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
              className={`${inputClass} mb-4`}
            />

            {/* ADDRESS */}

            <label htmlFor="hotelAddress" className={labelClass}>
              Hotel Address
            </label>

            <input
              id="hotelAddress"
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
              className={`${inputClass} mb-4`}
            />

            {/* PHONE */}

            <label htmlFor="hotelPhone" className={labelClass}>
              Hotel Phone
            </label>

            <input
              id="hotelPhone"
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
              className={`${inputClass} mb-4`}
            />

            {/* OWNER NAME */}

            <label htmlFor="ownerName" className={labelClass}>
              Owner Name *
            </label>

            <input
              id="ownerName"
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
              className={`${inputClass} mb-4`}
            />

            {/* OWNER EMAIL */}

            <label htmlFor="ownerEmail" className={labelClass}>
              Owner Email *
            </label>

            <input
              id="ownerEmail"
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
              className={`${inputClass} mb-4`}
            />

            {/* PASSWORD */}

            <label htmlFor="ownerPassword" className={labelClass}>
              Owner Password *
            </label>

            <input
              id="ownerPassword"
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
              className={`${inputClass} mb-5`}
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
                className="min-h-11 flex-1 rounded-card border border-hairline bg-white text-sm font-bold text-ink transition hover:bg-subtle disabled:opacity-50"
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
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-card bg-brand text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-50"
              >

                {actionLoading ===
                "create" ? (

                  <>
                    <FaSyncAlt className="animate-spin" aria-hidden="true" />

                    Creating…
                  </>

                ) : (

                  <>
                    <FaPlus aria-hidden="true" />

                    Create Hotel
                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}

      </div>
    </div>
  );
}
