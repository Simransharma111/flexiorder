import { useState } from "react";
import api from "../api/axios";

export default function QRInventoryPage() {

  const [count, setCount] = useState(10);
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateQRs = async () => {

    try {

      setLoading(true);

      const res = await api.post(
        "/qr/generate",
        { count }
      );

      setQrs(res.data);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="p-6 text-white">

      <div className="flex gap-4 mb-8">

        <input
          type="number"
          value={count}
          onChange={(e) =>
            setCount(e.target.value)
          }
          className="bg-black border p-3 rounded-xl"
        />

        <button
          onClick={generateQRs}
          className="bg-orange-500 px-6 py-3 rounded-xl"
        >
          {loading
            ? "Generating..."
            : "Generate QR"}
        </button>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {qrs.map((qr) => (

          <div
            key={qr.qrId}
            className="bg-white text-black p-4 rounded-2xl flex flex-col items-center"
          >

            <img
              src={qr.qrImage}
              alt={qr.qrId}
              className="w-40 h-40"
            />

            <h3 className="mt-3 font-bold">
              {qr.qrId}
            </h3>

            <a
              href={qr.qrImage}
              download={`${qr.qrId}.png`}
              className="mt-3 bg-black text-white px-4 py-2 rounded-xl"
            >
              Download
            </a>

          </div>

        ))}

      </div>

    </div>
  );
}