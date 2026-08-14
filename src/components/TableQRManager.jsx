import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

import {
  FiExternalLink,
  FiRefreshCw,
  FiTrash2,
  FiPlus,
  FiMoreVertical,
  FiGrid,
  FiHome,
} from "react-icons/fi";

import api from "../api/axios";
import { getPublicAppUrl } from "../config/env";

export default function TableQRManager() {
  // =====================================================
  // STATE
  // =====================================================

  const [tableName, setTableName] = useState("");
  const [tables, setTables] = useState([]);

  const [type, setType] = useState("table");

  const [loading, setLoading] = useState(false);

  const [fetchingTables, setFetchingTables] = useState(false);

  const [qrInputs, setQrInputs] = useState({});

  const [openMenu, setOpenMenu] = useState(null);

  const [showReassign, setShowReassign] = useState({});

  const [assigningQR, setAssigningQR] = useState(null);

  const [removingQR, setRemovingQR] = useState(null);

  // =====================================================
  // AUTH HEADER
  // =====================================================

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  // =====================================================
  // FETCH TABLES / ROOMS
  // =====================================================

  const fetchTables = async () => {
    try {
      setFetchingTables(true);

      const res = await api.get(
        "/table",
        getAuthConfig()
      );

      setTables(res.data?.tables || []);
    } catch (err) {
      console.error("TABLE FETCH ERROR:", err);

      console.error(
        "TABLE FETCH RESPONSE:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          "Failed to load tables and rooms"
      );
    } finally {
      setFetchingTables(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchTables();
  }, []);

  // =====================================================
  // CREATE TABLE / ROOM
  // =====================================================

  const createTable = async () => {
    const trimmedName = tableName.trim();

    if (!trimmedName) {
      alert(
        type === "room"
          ? "Please enter a room number"
          : "Please enter a table number"
      );

      return;
    }

    try {
      setLoading(true);

      const res = await api.post(
        "/table",
        {
          tableNumber: trimmedName,
          type,
        },
        getAuthConfig()
      );

      console.log(
        "CREATE TABLE SUCCESS:",
        res.data
      );

      setTableName("");

      await fetchTables();
    } catch (err) {
      console.error(
        "CREATE TABLE ERROR:",
        err
      );

      console.error(
        "CREATE TABLE RESPONSE:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          "Failed to create table or room"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // HANDLE QR INPUT
  // =====================================================

  const handleQRInputChange = (
    tableId,
    value
  ) => {
    setQrInputs((prev) => ({
      ...prev,
      [tableId]: value,
    }));
  };

  // =====================================================
  // ASSIGN / REASSIGN QR
  // =====================================================

  const assignQR = async (tableId) => {
    const qrId =
      qrInputs[tableId]?.trim();

    if (!qrId) {
      alert("Please enter a QR ID");
      return;
    }

    try {
      setAssigningQR(tableId);

      const res = await api.put(
        "/table/assign-qr",
        {
          tableId,
          qrId,
        },
        getAuthConfig()
      );

      console.log(
        "ASSIGN QR SUCCESS:",
        res.data
      );

      // Clear input
      setQrInputs((prev) => ({
        ...prev,
        [tableId]: "",
      }));

      // Close reassign section
      setShowReassign((prev) => ({
        ...prev,
        [tableId]: false,
      }));

      // Close menu
      setOpenMenu(null);

      // Refresh tables
      await fetchTables();
    } catch (err) {
      console.error(
        "ASSIGN QR ERROR:",
        err
      );

      console.error(
        "ASSIGN QR RESPONSE:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          "Failed to assign QR"
      );
    } finally {
      setAssigningQR(null);
    }
  };

  // =====================================================
  // REMOVE QR
  // =====================================================

  const removeQR = async (tableId) => {
    if (!tableId) {
      alert("Invalid table ID");
      return;
    }

    try {
      setRemovingQR(tableId);

      console.log(
        "REMOVING QR FROM TABLE:",
        tableId
      );

      /*
       * IMPORTANT:
       *
       * Correct endpoint:
       *
       * /qr/remove-qr
       *
       * NOT:
       *
       * api/qr/remove-qr
       */

      const res = await api.put(
        "/qr/remove-qr",
        {
          tableId,
        },
        getAuthConfig()
      );

      console.log(
        "REMOVE QR SUCCESS:",
        res.data
      );

      // Close menu
      setOpenMenu(null);

      // Close reassign section
      setShowReassign((prev) => ({
        ...prev,
        [tableId]: false,
      }));

      // Clear QR input
      setQrInputs((prev) => ({
        ...prev,
        [tableId]: "",
      }));

      // Refresh table data
      await fetchTables();
    } catch (err) {
      console.error(
        "REMOVE QR ERROR:",
        err
      );

      console.error(
        "REMOVE QR STATUS:",
        err.response?.status
      );

      console.error(
        "REMOVE QR RESPONSE:",
        err.response?.data
      );

      alert(
        err.response?.data?.message ||
          "Failed to remove QR assignment"
      );
    } finally {
      setRemovingQR(null);
    }
  };

  // =====================================================
  // TOGGLE THREE DOT MENU
  // =====================================================

  const toggleMenu = (tableId) => {
    setOpenMenu((prev) =>
      prev === tableId
        ? null
        : tableId
    );
  };

  // =====================================================
  // TOGGLE REASSIGN
  // =====================================================

  const toggleReassign = (tableId) => {
    setShowReassign((prev) => ({
      ...prev,
      [tableId]: !prev[tableId],
    }));

    setOpenMenu(null);
  };

  // =====================================================
  // PUBLIC QR URL
  // =====================================================

  const getQRUrl = (qrId) => {
    if (!qrId) return "";

    return `${getPublicAppUrl()}/qr/${qrId}`;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-950
        text-white
        p-4
        md:p-6
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          mb-8
          rounded-3xl
          bg-white/5
          border
          border-white/10
          p-5
        "
      >
        <div className="mb-5">
          <h1
            className="
              text-2xl
              font-black
            "
          >
            QR Tables Management
          </h1>

          <p
            className="
              text-sm
              text-slate-400
              mt-1
            "
          >
            Create tables or rooms and
            assign QR codes to them.
          </p>
        </div>

        {/* CREATE FORM */}

        <div
          className="
            flex
            flex-col
            md:flex-row
            gap-3
          "
        >
          {/* TYPE */}

          <select
            value={type}
            onChange={(e) =>
              setType(e.target.value)
            }
            className="
              bg-slate-900
              border
              border-white/10
              rounded-xl
              px-4
              py-3
              outline-none
              text-white
            "
          >
            <option value="table">
              Table
            </option>

            <option value="room">
              Room
            </option>
          </select>

          {/* NAME */}

          <input
            value={tableName}
            onChange={(e) =>
              setTableName(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createTable();
              }
            }}
            placeholder={
              type === "room"
                ? "Room 101"
                : "Table A1"
            }
            className="
              flex-1
              bg-white/10
              border
              border-white/10
              rounded-xl
              px-4
              py-3
              outline-none
              placeholder:text-slate-500
            "
          />

          {/* CREATE BUTTON */}

          <button
            onClick={createTable}
            disabled={loading}
            className="
              bg-orange-500
              hover:bg-orange-600
              disabled:opacity-50
              disabled:cursor-not-allowed
              rounded-xl
              px-6
              py-3
              font-bold
              flex
              items-center
              justify-center
              gap-2
              transition
            "
          >
            <FiPlus />

            {loading
              ? "Creating..."
              : "Create"}
          </button>
        </div>
      </div>

      {/* =====================================================
          LOADING
      ===================================================== */}

      {fetchingTables && (
        <div
          className="
            mb-5
            text-center
            text-slate-400
            text-sm
          "
        >
          Loading tables and rooms...
        </div>
      )}

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {!fetchingTables &&
        tables.length === 0 && (
          <div
            className="
              rounded-3xl
              bg-white/5
              border
              border-white/10
              p-10
              text-center
            "
          >
            <FiGrid
              className="
                mx-auto
                text-4xl
                text-slate-500
                mb-4
              "
            />

            <h2
              className="
                text-lg
                font-bold
              "
            >
              No tables or rooms yet
            </h2>

            <p
              className="
                text-sm
                text-slate-400
                mt-2
              "
            >
              Create your first table or
              room above.
            </p>
          </div>
        )}

      {/* =====================================================
          TABLE GRID
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-1
          md:grid-cols-2
          xl:grid-cols-3
          gap-5
        "
      >
        {tables.map((table) => {
          const hasQR = Boolean(
            table.qrId
          );

          const isRemoving =
            removingQR === table._id;

          const isAssigning =
            assigningQR === table._id;

          const qrUrl =
            getQRUrl(table.qrId);

          return (
            <div
              key={table._id}
              className="
                relative
                rounded-3xl
                bg-white/5
                border
                border-white/10
                p-5
                hover:border-orange-500/40
                transition
              "
            >
              {/* =================================================
                  TOP
              ================================================= */}

              <div
                className="
                  flex
                  justify-between
                  items-start
                "
              >
                {/* TITLE */}

                <div>
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-orange-400
                      text-xs
                      font-bold
                      uppercase
                    "
                  >
                    {table.type ===
                    "room" ? (
                      <FiHome />
                    ) : (
                      <FiGrid />
                    )}

                    {table.type}
                  </div>

                  <h2
                    className="
                      text-xl
                      font-black
                      mt-2
                    "
                  >
                    {table.type ===
                    "room"
                      ? `Room ${table.tableNumber}`
                      : `Table ${table.tableNumber}`}
                  </h2>
                </div>

                {/* THREE DOT MENU */}

                <div
                  className="
                    relative
                  "
                >
                  <button
                    onClick={() =>
                      toggleMenu(
                        table._id
                      )
                    }
                    className="
                      p-2
                      rounded-xl
                      hover:bg-white/10
                      transition
                    "
                  >
                    <FiMoreVertical />
                  </button>

                  {openMenu ===
                    table._id && (
                    <div
                      className="
                        absolute
                        right-0
                        top-10
                        w-44
                        bg-slate-900
                        border
                        border-white/10
                        rounded-xl
                        shadow-xl
                        z-20
                        overflow-hidden
                      "
                    >
                      {/* REASSIGN */}

                      <button
                        onClick={() =>
                          toggleReassign(
                            table._id
                          )
                        }
                        disabled={isRemoving}
                        className="
                          w-full
                          px-4
                          py-3
                          text-left
                          hover:bg-white/10
                          flex
                          gap-2
                          items-center
                          disabled:opacity-50
                        "
                      >
                        <FiRefreshCw />

                        Reassign
                      </button>

                      {/* REMOVE */}

                      {hasQR && (
                        <button
                          onClick={() =>
                            removeQR(
                              table._id
                            )
                          }
                          disabled={
                            isRemoving
                          }
                          className="
                            w-full
                            px-4
                            py-3
                            text-left
                            hover:bg-red-500/20
                            text-red-400
                            flex
                            gap-2
                            items-center
                            disabled:opacity-50
                          "
                        >
                          <FiTrash2 />

                          {isRemoving
                            ? "Removing..."
                            : "Remove QR"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* =================================================
                  QR DISPLAY
              ================================================= */}

              <div
                className="
                  mt-5
                  bg-white
                  rounded-2xl
                  p-3
                  flex
                  justify-center
                  min-h-[144px]
                  items-center
                "
              >
                {hasQR ? (
                  <QRCodeCanvas
                    value={qrUrl}
                    size={120}
                    includeMargin
                  />
                ) : (
                  <div
                    className="
                      h-[120px]
                      flex
                      flex-col
                      items-center
                      justify-center
                      text-black
                      text-sm
                    "
                  >
                    <FiGrid
                      className="
                        text-2xl
                        mb-2
                        text-slate-400
                      "
                    />

                    No QR Assigned
                  </div>
                )}
              </div>

              {/* =================================================
                  STATUS
              ================================================= */}

              <div
                className="
                  mt-4
                  flex
                  justify-between
                  items-center
                  gap-3
                "
              >
                <p
                  className="
                    text-xs
                    text-slate-400
                    truncate
                    flex-1
                  "
                  title={
                    table.qrId ||
                    "Not Assigned"
                  }
                >
                  QR:{" "}
                  {table.qrId ||
                    "Not Assigned"}
                </p>

                <div
                  className={`
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    font-bold
                    whitespace-nowrap
                    ${
                      hasQR
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-500/20 text-slate-400"
                    }
                  `}
                >
                  {hasQR
                    ? "QR Active"
                    : "No QR"}
                </div>
              </div>

              {/* =================================================
                  OPEN MENU
              ================================================= */}

              {hasQR && (
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    mt-5
                    w-full
                    flex
                    items-center
                    justify-center
                    gap-2
                    bg-orange-500
                    hover:bg-orange-600
                    rounded-xl
                    py-3
                    font-bold
                    transition
                  "
                >
                  <FiExternalLink />

                  Open Menu
                </a>
              )}

              {/* =================================================
                  REASSIGN AREA
              ================================================= */}

              {showReassign[
                table._id
              ] && (
                <div
                  className="
                    mt-4
                    p-4
                    rounded-2xl
                    bg-white/5
                    border
                    border-white/10
                    space-y-3
                  "
                >
                  <p
                    className="
                      text-sm
                      font-bold
                    "
                  >
                    Reassign QR
                  </p>

                  <p
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    Enter the new QR ID.
                    The existing QR will
                    be released automatically.
                  </p>

                  <input
                    value={
                      qrInputs[
                        table._id
                      ] || ""
                    }
                    onChange={(e) =>
                      handleQRInputChange(
                        table._id,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter"
                      ) {
                        assignQR(
                          table._id
                        );
                      }
                    }}
                    placeholder="Enter new QR ID"
                    disabled={isAssigning}
                    className="
                      w-full
                      bg-white/10
                      border
                      border-white/10
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      placeholder:text-slate-500
                      disabled:opacity-50
                    "
                  />

                  <div
                    className="
                      flex
                      gap-2
                    "
                  >
                    <button
                      onClick={() =>
                        assignQR(
                          table._id
                        )
                      }
                      disabled={
                        isAssigning
                      }
                      className="
                        flex-1
                        bg-blue-500
                        hover:bg-blue-600
                        disabled:opacity-50
                        rounded-xl
                        py-3
                        font-bold
                        transition
                      "
                    >
                      {isAssigning
                        ? "Assigning..."
                        : "Confirm Reassign"}
                    </button>

                    <button
                      onClick={() => {
                        setShowReassign(
                          (prev) => ({
                            ...prev,
                            [table._id]:
                              false,
                          })
                        );

                        setQrInputs(
                          (prev) => ({
                            ...prev,
                            [table._id]:
                              "",
                          })
                        );
                      }}
                      className="
                        px-4
                        rounded-xl
                        bg-white/10
                        hover:bg-white/20
                        transition
                      "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* =================================================
                  ASSIGN FIRST QR
              ================================================= */}

              {!hasQR && (
                <div
                  className="
                    mt-4
                    space-y-3
                  "
                >
                  <input
                    value={
                      qrInputs[
                        table._id
                      ] || ""
                    }
                    onChange={(e) =>
                      handleQRInputChange(
                        table._id,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter"
                      ) {
                        assignQR(
                          table._id
                        );
                      }
                    }}
                    placeholder="Enter QR ID"
                    disabled={isAssigning}
                    className="
                      w-full
                      bg-white/10
                      border
                      border-white/10
                      rounded-xl
                      px-4
                      py-3
                      outline-none
                      placeholder:text-slate-500
                      disabled:opacity-50
                    "
                  />

                  <button
                    onClick={() =>
                      assignQR(
                        table._id
                      )
                    }
                    disabled={isAssigning}
                    className="
                      w-full
                      bg-green-500
                      hover:bg-green-600
                      disabled:opacity-50
                      rounded-xl
                      py-3
                      font-bold
                      transition
                    "
                  >
                    {isAssigning
                      ? "Assigning..."
                      : "Assign QR"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}