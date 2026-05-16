import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/axios";

export default function TableQRManager() {
  const [tableName, setTableName] = useState("");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [type, setType] = useState("table");

  // inputs
  const [qrInputs, setQrInputs] = useState({});
  const [showReassign, setShowReassign] = useState({});

  /* ================= FETCH ================= */
  const fetchTables = async () => {
    try {
      const res = await api.get("/table", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setTables(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  /* ================= CREATE ================= */
  const createTable = async () => {
    if (!tableName.trim()) return;

    try {
      setLoading(true);

      await api.post(
        "/table",
        { tableNumber: tableName, type },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setTableName("");
      fetchTables();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ASSIGN / REASSIGN (SAME API) ================= */
  const assignQR = async (tableId) => {
    try {
      const qrId = qrInputs[tableId];

      if (!qrId?.trim()) {
        alert("Enter QR ID");
        return;
      }

      setAssigning(true);

      await api.put(
        "/table/assign-qr",
        { tableId, qrId: qrId.trim() },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setQrInputs((p) => ({ ...p, [tableId]: "" }));
      setShowReassign((p) => ({ ...p, [tableId]: false }));

      fetchTables();
    } catch (err) {
      console.log(err);
      alert("Failed to assign/reassign QR");
    } finally {
      setAssigning(false);
    }
  };

  /* ================= REMOVE ASSIGNMENT ================= */
  const removeQR = async (tableId) => {
    try {
      await api.put(
        "/qr/remove-qr",
        { tableId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      fetchTables();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-[#0F172A] text-white">

      {/* HEADER */}
      <div className="flex gap-4 mb-8">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-white/10 px-4 py-3 rounded-xl"
        >
          <option value="table">Table</option>
          <option value="room">Room</option>
        </select>

        <input
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder={type === "room" ? "Room 101" : "Table A1"}
          className="flex-1 bg-white/10 px-4 py-3 rounded-xl"
        />

        <button
          onClick={createTable}
          className="bg-orange-500 px-6 py-3 rounded-xl"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-3 gap-6">

        {tables.map((t) => (
          <div key={t._id} className="bg-white/5 p-6 rounded-2xl">

            <p className="text-orange-400 text-lg font-bold mb-2 uppercase ml-2">
              {t.type}
            </p>

            {/* QR */}
            {t.qrId ? (
              <QRCodeCanvas
                value={`${window.location.origin}/qr/${t.qrId}`}
                size={160}
              />
            ) : (
              <div className="h-[160px] flex items-center justify-center border border-dashed">
                No QR
              </div>
            )}

            {/* NAME */}
            <h2 className="mt-3 font-bold text-lg">
              {t.type === "room"
                ? `Room: ${t.tableNumber}`
                : `Table: ${t.tableNumber}`}
            </h2>

            {/* QR ID */}
            <p className="text-gray-400 text-sm">
              {t.qrId || "QR Pending"}
            </p>

            {/* ================= NO QR ================= */}
            {!t.qrId && (
              <div className="mt-3 space-y-2">
                <input
                  value={qrInputs[t._id] || ""}
                  onChange={(e) =>
                    setQrInputs({
                      ...qrInputs,
                      [t._id]: e.target.value,
                    })
                  }
                  className="w-full bg-white/10 px-3 py-2 rounded"
                  placeholder="Enter QR ID"
                />

                <button
                  onClick={() => assignQR(t._id)}
                  className="w-full bg-green-500 py-2 rounded"
                >
                  Assign QR
                </button>
              </div>
            )}

            {/* ================= ACTIONS ================= */}
            {t.qrId && (
              <div className="mt-4 space-y-2">

                {/* OPEN MENU */}
                <a
                  href={`/qr/${t.qrId}`}
                  className="block text-center bg-orange-500 py-2 rounded font-bold"
                >
                  Open Menu
                </a>

                {/* REASSIGN BUTTON */}
                <button
                  onClick={() =>
                    setShowReassign((p) => ({
                      ...p,
                      [t._id]: !p[t._id],
                    }))
                  }
                  className="w-full bg-white/10 py-2 rounded"
                >
                  Reassign
                </button>

                {/* REASSIGN INPUT */}
                {showReassign[t._id] && (
                  <>
                    <input
                      value={qrInputs[t._id] || ""}
                      onChange={(e) =>
                        setQrInputs({
                          ...qrInputs,
                          [t._id]: e.target.value,
                        })
                      }
                      className="w-full bg-white/10 px-3 py-2 rounded"
                      placeholder="New QR ID"
                    />

                    <button
                      onClick={() => assignQR(t._id)}
                      className="w-full bg-blue-500 py-2 rounded"
                    >
                      Confirm Reassign
                    </button>
                  </>
                )}

                {/* REMOVE */}
                <button
                  onClick={() => removeQR(t._id)}
                  className="w-full bg-red-500 py-2 rounded"
                >
                  Remove Assignment
                </button>

              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}