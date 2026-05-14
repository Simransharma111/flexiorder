import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/axios";

export default function TableQRManager() {

  const [tableName, setTableName] = useState("");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrInputs, setQrInputs] = useState({});
const [assigning, setAssigning] = useState(false);

  const [type, setType] = useState("table");

  // FETCH TABLES
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

  // CREATE ROOM/TABLE
  const createTable = async () => {

    if (!tableName.trim()) return;

    try {

      setLoading(true);

      await api.post(
        "/table",

        {
          tableNumber: tableName,
          type,
        },

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

      {
        tableId,
        qrId: qrId.trim(),
      },

      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    fetchTables();

    alert("QR Assigned");

  } catch (err) {

    console.log(err);

    alert(
      err.response?.data?.message ||
      "Failed to assign QR"
    );

  } finally {

    setAssigning(false);

  }
};

  return (

    <div className="p-6 min-h-screen bg-[#0F172A] text-white">

      {/* HEADER */}

      <div className="flex flex-col md:flex-row gap-4 mb-8">

        {/* TYPE */}

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
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
          type="text"
          placeholder={
            type === "room"
              ? "Room 101"
              : "Table A1"
          }
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        {/* BUTTON */}

        <button
          onClick={createTable}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 transition px-6 py-3 rounded-2xl font-bold"
        >

          {loading
            ? "Creating..."
            : `Create ${type === "room" ? "Room" : "Table"}`
          }

        </button>

      </div>

      {/* GRID */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {tables.map((t) => (

          <div
            key={t._id}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center hover:scale-[1.02] transition"
          >

            {/* TYPE */}

            <p className="text-sm uppercase text-orange-400 mb-4">

              {t.type}

            </p>

            {/* QR */}

            {t.qrId ? (

              <QRCodeCanvas
                value={`${window.location.origin}/qr/${t.qrId}`}
                size={180}
                bgColor="#ffffff"
                fgColor="#000000"
              />

            ) : (

              <div className="w-[180px] h-[180px] rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-400 text-center px-4">

                No QR Assigned

              </div>

            )}

            {/* NAME */}

            <h3 className="text-xl font-bold mt-5 text-center">

              {t.type === "room"
                ? `Room ${t.tableNumber}`
                : `Table ${t.tableNumber}`
              }

            </h3>

            {/* QR ID */}

            <p className="text-gray-400 text-sm mt-2">

              {t.qrId || "QR Pending"}

            </p>

            {/* LINK */}

            {t.qrId && (

              <p className="text-gray-500 text-xs mt-2 text-center break-all">

                {window.location.origin}/qr/{t.qrId}

              </p>

            )}
            {/* ASSIGN QR */}

{!t.qrId && (

  <div className="w-full mt-5">

    <input
      type="text"
      placeholder="Enter QR ID"
      value={qrInputs[t._id] || ""}
      onChange={(e) =>
        setQrInputs({
          ...qrInputs,
          [t._id]: e.target.value,
        })
      }
      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none"
    />

    <button
      onClick={() => assignQR(t._id)}
      disabled={assigning}
      className="w-full mt-3 bg-orange-500 hover:bg-orange-600 transition px-4 py-3 rounded-xl font-bold"
    >

      {assigning
        ? "Assigning..."
        : "Assign QR"
      }

    </button>

  </div>

)}

            {/* OPEN MENU */}

            {t.qrId && (

              <a
                href={`/qr/${t.qrId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 bg-orange-500 hover:bg-orange-600 transition px-5 py-2 rounded-xl"
              >

                Open Menu

              </a>

            )}

          </div>

        ))}

      </div>

      {/* EMPTY */}

      {tables.length === 0 && (

        <div className="text-center text-gray-400 mt-20">

          No rooms or tables created yet

        </div>

      )}

    </div>
  );
}