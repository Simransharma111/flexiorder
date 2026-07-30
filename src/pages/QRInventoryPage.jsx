import { useState } from "react";
import api from "../api/axios";

import jsPDF from "jspdf";

export default function QRInventoryPage() {

  const [count, setCount] = useState(10);

  const [qrs, setQrs] = useState([]);

  const [loading, setLoading] =
    useState(false);

  // GENERATE QR
const generateQRs = async () => {
  try {
    setLoading(true);

    const res = await api.post(
      "/qr/generate",
      { count: Number(count) }
    );

    console.log("QR RESPONSE:", res.data);

    setQrs(res.data.qrCodes || []);

  } catch (err) {
    console.error("QR GENERATION ERROR:", err);

    alert(
      err.response?.data?.message ||
      "Failed to generate QR codes"
    );

  } finally {
    setLoading(false);
  }
};
  // DOWNLOAD ALL PDF
  const downloadPDF = async () => {

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let x = 10;
    let y = 20;

    const qrSize = 40;

    for (let i = 0; i < qrs.length; i++) {

      const qr = qrs[i];

      // ADD QR IMAGE
      pdf.addImage(
        qr.qrImage,
        "PNG",
        x,
        y,
        qrSize,
        qrSize
      );

      // QR CODE LABEL
      pdf.setFontSize(12);

      pdf.text(
        qr.qrId,
        x,
        y + 48
      );

      // NEXT POSITION
      x += 65;

      // NEW ROW
      if (x > 140) {
        x = 10;
        y += 70;
      }

      // NEW PAGE
      if (y > 240) {
        pdf.addPage();
        x = 10;
        y = 20;
      }
    }

    pdf.save("hotel-qrs.pdf");
  };

  return (
    <div className="p-6 text-white">

      {/* TOP */}
      <div className="flex gap-4 mb-8 flex-wrap">

        <input
          type="number"
          value={count}
          onChange={(e) =>
            setCount(e.target.value)
          }
          className="
            bg-black
            border
            p-3
            rounded-xl
          "
        />

        <button
          onClick={generateQRs}
          className="
            bg-orange-500
            px-6
            py-3
            rounded-xl
          "
        >
          {loading
            ? "Generating..."
            : "Generate QR"}
        </button>

        {qrs.length > 0 && (
          <button
            onClick={downloadPDF}
            className="
              bg-green-600
              px-6
              py-3
              rounded-xl
            "
          >
            Download PDF
          </button>
        )}

      </div>

      {/* GRID */}
      <div
        className="
          grid
          grid-cols-2
          md:grid-cols-4
          gap-6
        "
      >

        {qrs.map((qr) => (

          <div
            key={qr.qrId}
            className="
              bg-white
              text-black
              p-4
              rounded-2xl
              flex
              flex-col
              items-center
            "
          >

            <img
              src={qr.qrImage}
              alt={qr.qrId}
              className="w-40 h-40"
            />

            <h3 className="mt-3 font-bold">
              {qr.qrId}
            </h3>

          </div>

        ))}

      </div>

    </div>
  );
}