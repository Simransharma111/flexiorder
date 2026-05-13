import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/axios";

export default function TableQRManager() {
  const [tableName, setTableName] = useState("");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // CREATE TABLE
  const createTable = async () => {
    if (!tableName.trim()) return;

    try {
      setLoading(true);

      await api.post(
        "/table",
        { tableNumber: tableName },
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

  return (
    <div className="p-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">

        <input
          type="text"
          placeholder="Room 101 / Table A1"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-3 outline-none"
        />

        <button
          onClick={createTable}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 transition px-6 py-3 rounded-2xl font-bold"
        >
          {loading ? "Creating..." : "Create Table + QR"}
        </button>

      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {tables.map((t) => (
          <div
            key={t._id}
            className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center hover:scale-[1.02] transition"
          >

            {/* QR */}
            <QRCodeCanvas
              value={`${window.location.origin}/menu/table/${t._id}`}
              size={180}
              bgColor="#ffffff"
              fgColor="#000000"
            />

            {/* TABLE NAME */}
            <h3 className="text-xl font-bold mt-5 text-center">
              {t.tableNumber}
            </h3>

            {/* LINK */}
            <p className="text-gray-400 text-xs mt-2 text-center break-all">
              {window.location.origin}/menu/table/{t._id}
            </p>

            {/* OPEN MENU */}
            <a
              href={`/menu/table/${t._id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 bg-orange-500 px-5 py-2 rounded-xl"
            >
              Open Menu
            </a>

          </div>
        ))}

      </div>

      {/* EMPTY STATE */}
      {tables.length === 0 && (
        <div className="text-center text-gray-400 mt-10">
          No tables created yet
        </div>
      )}

    </div>
  );
}