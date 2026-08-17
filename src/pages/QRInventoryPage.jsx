import { useRef, useState } from "react";
import {
  FiDownload,
  FiCopy,
  FiCheck,
  FiGrid,
  FiAlertCircle,
  FiPlusCircle,
} from "react-icons/fi";
import api from "../api/axios";
import jsPDF from "jspdf";
import { downloadFile } from "../utils/fileDownload";

export default function QRInventoryPage() {
  const [count, setCount] = useState(10);

  // Newly generated QR codes
  const [qrs, setQrs] = useState([]);

  // Existing/printed QR registration
  const [existingQrId, setExistingQrId] = useState("");
  const [registering, setRegistering] = useState(false);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [copiedId, setCopiedId] = useState(null);
  const [savedTo, setSavedTo] = useState(null);

  const resultRef = useRef(null);

  // =====================================================
  // GENERATE NEW QR CODES
  // =====================================================

  const generateQRs = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const requestedCount = Number(count);

      if (!requestedCount || requestedCount < 1) {
        setError("Please enter a valid QR count.");
        return;
      }

      const res = await api.post("/qr/generate", {
        count: requestedCount,
      });

      const codes = res.data?.qrCodes || [];

      setQrs(codes);
      setSavedTo(null);

      setSuccess(
        `${codes.length} QR ${
          codes.length === 1 ? "code" : "codes"
        } generated successfully.`
      );

      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to generate QR codes. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // REGISTER EXISTING / OLD PRINTED QR
  // =====================================================

  const registerExistingQR = async () => {
    const cleanQrId = existingQrId.trim();

    setError(null);
    setSuccess(null);

    if (!cleanQrId) {
      setError("Please enter the QR ID.");
      return;
    }

    setRegistering(true);

    try {
      const res = await api.post("/qr/register", {
        qrId: cleanQrId,
      });

      const registeredQR = res.data?.qr;

      if (!registeredQR) {
        throw new Error(
          "QR registration response is invalid."
        );
      }

      // Clear input after successful registration
      setExistingQrId("");

      if (res.data?.alreadyExists) {
        setSuccess(
          `QR "${registeredQR.qrId}" is already registered and ready to assign.`
        );
      } else {
        setSuccess(
          `QR "${registeredQR.qrId}" registered successfully. You can now assign it to a table or room.`
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to register the existing QR."
      );
    } finally {
      setRegistering(false);
    }
  };

  // =====================================================
  // HANDLE ENTER KEY FOR EXISTING QR
  // =====================================================

  const handleExistingQRKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!registering) {
        registerExistingQR();
      }
    }
  };

  // =====================================================
  // DOWNLOAD ALL GENERATED QRS AS PDF
  // =====================================================

  const downloadPDF = async () => {
    if (!qrs.length || downloading) return;

    setError(null);
    setDownloading(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const QR_SIZE = 42;
      const COLS = 3;
      const ROWS_PER_PAGE = 4;

      const COL_W = (210 - 20) / COLS;
      const ROW_H = QR_SIZE + 18;

      qrs.forEach((qr, i) => {
        const col = i % COLS;

        const row =
          Math.floor(i % (COLS * ROWS_PER_PAGE) / COLS);

        if (
          i > 0 &&
          i % (COLS * ROWS_PER_PAGE) === 0
        ) {
          pdf.addPage();
        }

        const x = 10 + col * COL_W;
        const y = 16 + row * ROW_H;

        pdf.addImage(
          qr.qrImage,
          "PNG",
          x,
          y,
          QR_SIZE,
          QR_SIZE
        );

        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);

        pdf.text(
          qr.qrId,
          x + QR_SIZE / 2,
          y + QR_SIZE + 6,
          {
            align: "center",
          }
        );
      });

      const filename = `flexi-qr-codes-${qrs.length}.pdf`;

      const blob = pdf.output("blob");

      const saved = await downloadFile(
        blob,
        filename
      );

      setSavedTo(saved?.label || null);
    } catch (err) {
      setError(
        err?.message ||
          "Could not save the QR PDF. Please try again."
      );
    } finally {
      setDownloading(false);
    }
  };

  // =====================================================
  // COPY QR LINK
  // =====================================================

  const copyLink = async (qrId) => {
    try {
      /*
       * IMPORTANT:
       * This must match the route used when generating
       * the QR code on the backend.
       *
       * Backend:
       * FRONTEND_URL/qr/:qrId
       */

      const url = `${window.location.origin}/qr/${qrId}`;

      if (!navigator.clipboard) {
        throw new Error(
          "Clipboard access is not available."
        );
      }

      await navigator.clipboard.writeText(url);

      setCopiedId(qrId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch (err) {
      setError(
        err?.message ||
          "Could not copy QR link."
      );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div
      className="ops-workspace"
      style={{
        paddingBottom: "80px",
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div
        style={{
          padding: "20px 16px 0",
          borderBottom:
            "1px solid var(--ops-border)",
          background: "var(--ops-card)",
        }}
      >
        <h1
          style={{
            margin: "0 0 4px",
            fontSize: "20px",
            fontWeight: 800,
          }}
        >
          QR Inventory
        </h1>

        <p
          style={{
            margin: "0 0 16px",
            fontSize: "13px",
            color: "var(--ops-muted)",
          }}
        >
          Generate new QR codes or register QR codes
          that you already printed.
        </p>

        {/* =================================================
            GENERATE NEW QRS
        ================================================= */}

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            paddingBottom: "16px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--ops-muted)",
              fontWeight: 700,
            }}
          >
            <FiGrid />

            How many QR codes?

            <input
              id="qr-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => {
                const value = Number(
                  e.target.value
                );

                setCount(
                  Math.max(
                    1,
                    Math.min(
                      200,
                      Number.isFinite(value)
                        ? value
                        : 1
                    )
                  )
                );
              }}
              style={{
                width: "72px",
                padding: "8px 10px",
                borderRadius: "8px",
                border:
                  "1px solid var(--ops-border)",
                background:
                  "var(--ops-subtle)",
                color: "var(--ops-ink)",
                fontSize: "14px",
                fontWeight: 700,
              }}
            />
          </label>

          <button
            type="button"
            onClick={generateQRs}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: 0,
              background: "var(--primary)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 800,
              cursor: loading
                ? "wait"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Generating…"
              : `Generate ${count} QR Codes`}
          </button>
        </div>

        {/* =================================================
            REGISTER EXISTING QR
        ================================================= */}

        <div
          style={{
            marginBottom: "16px",
            padding: "16px",
            border:
              "1px solid var(--ops-border)",
            borderRadius: "12px",
            background:
              "var(--ops-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "5px",
              fontSize: "14px",
              fontWeight: 800,
              color: "var(--ops-ink)",
            }}
          >
            <FiPlusCircle size={17} />

            Already have printed QR codes?
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "var(--ops-muted)",
              marginBottom: "12px",
              lineHeight: 1.5,
            }}
          >
            Enter the QR ID from an existing printed
            QR code. After registration, you can
            assign it to any table or room.
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={existingQrId}
              onChange={(e) =>
                setExistingQrId(
                  e.target.value
                )
              }
              onKeyDown={
                handleExistingQRKeyDown
              }
              placeholder="Enter existing QR ID"
              autoComplete="off"
              style={{
                flex:
                  "1 1 240px",
                minWidth: 0,
                padding:
                  "10px 12px",
                borderRadius: "8px",
                border:
                  "1px solid var(--ops-border)",
                background:
                  "var(--ops-card)",
                color:
                  "var(--ops-ink)",
                fontSize: "13px",
                outline: "none",
              }}
            />

            <button
              type="button"
              onClick={
                registerExistingQR
              }
              disabled={
                registering ||
                !existingQrId.trim()
              }
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                gap: "7px",
                padding:
                  "10px 16px",
                borderRadius:
                  "9px",
                border: 0,
                background:
                  "var(--primary)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor:
                  registering
                    ? "wait"
                    : "pointer",
                opacity:
                  registering ||
                  !existingQrId.trim()
                    ? 0.6
                    : 1,
                whiteSpace:
                  "nowrap",
              }}
            >
              <FiPlusCircle size={15} />

              {registering
                ? "Registering…"
                : "Register QR"}
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          className="ops-sync-strip needs-attention"
          style={{
            margin: "12px 16px",
          }}
          role="alert"
        >
          <FiAlertCircle />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError(null)
            }
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =================================================
          SUCCESS
      ================================================= */}

      {success && (
        <div
          style={{
            margin: "12px 16px",
            padding: "11px 14px",
            borderRadius: "10px",
            border:
              "1px solid rgba(22, 163, 74, 0.25)",
            background:
              "rgba(22, 163, 74, 0.08)",
            color: "#15803d",
            fontSize: "13px",
            fontWeight: 700,
          }}
          role="status"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FiCheck size={16} />

            <span>{success}</span>

            <button
              type="button"
              onClick={() =>
                setSuccess(null)
              }
              style={{
                marginLeft: "auto",
                border: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          GENERATED QR RESULTS
      ================================================= */}

      {qrs.length > 0 && (
        <div ref={resultRef}>
          {/* =================================================
              STICKY DOWNLOAD BAR
          ================================================= */}

          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              flexWrap: "wrap",
              gap: "8px",
              background:
                "var(--ops-card)",
              borderBottom:
                "1px solid var(--ops-border)",
              padding: "10px 16px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color:
                  "var(--ops-muted)",
              }}
            >
              {qrs.length} QR{" "}
              {qrs.length === 1
                ? "code"
                : "codes"}{" "}
              ready
            </span>

            <button
              type="button"
              id="qr-download-pdf"
              onClick={
                downloadPDF
              }
              disabled={
                downloading
              }
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: "8px",
                padding:
                  "10px 20px",
                borderRadius:
                  "10px",
                border: 0,
                background:
                  "#16a34a",
                color: "#fff",
                fontSize:
                  "14px",
                fontWeight: 800,
                cursor:
                  downloading
                    ? "wait"
                    : "pointer",
                opacity:
                  downloading
                    ? 0.7
                    : 1,
                boxShadow:
                  "0 2px 8px rgba(22,163,74,.35)",
              }}
            >
              <FiDownload size={16} />

              {downloading
                ? "Building PDF…"
                : `Download PDF (${qrs.length} codes)`}
            </button>
          </div>

          {/* =================================================
              QR GRID
          ================================================= */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "12px",
              padding: "16px",
            }}
          >
            {qrs.map((qr) => (
              <div
                key={qr.qrId}
                style={{
                  background: "#fff",
                  borderRadius:
                    "14px",
                  padding: "12px",
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  gap: "8px",
                  border:
                    "1px solid #e5e7eb",
                  boxShadow:
                    "0 1px 4px rgba(0,0,0,.06)",
                }}
              >
                <img
                  src={
                    qr.qrImage
                  }
                  alt={qr.qrId}
                  style={{
                    width: "120px",
                    height: "120px",
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    fontSize:
                      "11px",
                    fontWeight: 700,
                    color:
                      "#374151",
                    textAlign:
                      "center",
                    wordBreak:
                      "break-all",
                  }}
                >
                  {qr.qrId}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    copyLink(
                      qr.qrId
                    )
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "4px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      "8px",
                    background:
                      "#f9fafb",
                    color:
                      copiedId ===
                      qr.qrId
                        ? "#16a34a"
                        : "#374151",
                    fontSize:
                      "11px",
                    fontWeight: 700,
                    padding:
                      "5px 10px",
                    cursor:
                      "pointer",
                  }}
                >
                  {copiedId ===
                  qr.qrId ? (
                    <FiCheck
                      size={12}
                    />
                  ) : (
                    <FiCopy
                      size={12}
                    />
                  )}

                  {copiedId ===
                  qr.qrId
                    ? "Copied!"
                    : "Copy link"}
                </button>
              </div>
            ))}
          </div>

          {/* =================================================
              BOTTOM DOWNLOAD
          ================================================= */}

          <div
            style={{
              padding:
                "8px 16px 20px",
              display: "flex",
              flexDirection:
                "column",
              alignItems:
                "center",
            }}
          >
            <button
              type="button"
              onClick={
                downloadPDF
              }
              disabled={
                downloading
              }
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: "8px",
                padding:
                  "12px 28px",
                borderRadius:
                  "12px",
                border: 0,
                background:
                  "#16a34a",
                color: "#fff",
                fontSize:
                  "15px",
                fontWeight: 800,
                cursor:
                  downloading
                    ? "wait"
                    : "pointer",
                opacity:
                  downloading
                    ? 0.7
                    : 1,
              }}
            >
              <FiDownload
                size={18}
              />

              {downloading
                ? "Building PDF…"
                : "Download All as PDF"}
            </button>

            {savedTo && (
              <p
                role="status"
                style={{
                  margin:
                    "10px 0 0",
                  fontSize:
                    "13px",
                  color:
                    "var(--ops-muted)",
                }}
              >
                Saved to{" "}
                <strong>
                  {savedTo}
                </strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}