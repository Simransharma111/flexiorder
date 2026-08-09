import { useRef, useState } from "react";
import { FiDownload, FiCopy, FiCheck, FiGrid, FiAlertCircle } from "react-icons/fi";
import api from "../api/axios";
import jsPDF from "jspdf";

export default function QRInventoryPage() {
  const [count, setCount] = useState(10);
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const resultRef = useRef(null);

  // ── Generate ─────────────────────────────────────────────────────────────
  const generateQRs = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/qr/generate", { count: Number(count) });
      const codes = res.data?.qrCodes || [];
      setQrs(codes);
      // Scroll to results so Download PDF is immediately visible
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate QR codes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Download all as PDF ───────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!qrs.length || downloading) return;
    setDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const QR_SIZE = 42;
      const COLS = 3;
      const COL_W = (210 - 20) / COLS;
      const ROW_H = QR_SIZE + 18;
      qrs.forEach((qr, i) => {
        const col = i % COLS;
        const row = Math.floor((i % (COLS * 4)) / COLS);
        if (i > 0 && i % (COLS * 4) === 0) {
          pdf.addPage();
        }
        const x = 10 + col * COL_W;
        const y = 16 + row * ROW_H;
        pdf.addImage(qr.qrImage, "PNG", x, y, QR_SIZE, QR_SIZE);
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.text(qr.qrId, x + QR_SIZE / 2, y + QR_SIZE + 6, { align: "center" });
      });

      pdf.save(`flexi-qr-codes-${qrs.length}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  // ── Copy individual QR link ────────────────────────────────────────────────
  const copyLink = (qrId) => {
    const url = `${window.location.origin}/menu/qr/${qrId}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(qrId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="ops-workspace" style={{ paddingBottom: "80px" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0", borderBottom: "1px solid var(--ops-border)", background: "var(--ops-card)" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800 }}>QR Inventory</h1>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--ops-muted)" }}>
          Generate QR tag IDs and download them as a print-ready PDF.
        </p>

        {/* ── Controls ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingBottom: "16px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--ops-muted)", fontWeight: 700 }}>
            <FiGrid />
            How many QR codes?
            <input
              id="qr-count"
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(200, Number(e.target.value))))}
              style={{
                width: "72px", padding: "8px 10px", borderRadius: "8px",
                border: "1px solid var(--ops-border)", background: "var(--ops-subtle)",
                color: "var(--ops-ink)", fontSize: "14px", fontWeight: 700,
              }}
            />
          </label>

          <button
            type="button"
            onClick={generateQRs}
            disabled={loading}
            style={{
              padding: "10px 20px", borderRadius: "10px", border: 0,
              background: "var(--primary)", color: "#fff",
              fontSize: "13px", fontWeight: 800, cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Generating…" : `Generate ${count} QR Codes`}
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="ops-sync-strip needs-attention" style={{ margin: "12px 16px" }} role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────── */}
      {qrs.length > 0 && (
        <div ref={resultRef}>
          {/* Sticky download bar — always visible above the fold */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
            background: "var(--ops-card)", borderBottom: "1px solid var(--ops-border)",
            padding: "10px 16px",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ops-muted)" }}>
              {qrs.length} QR codes ready
            </span>
            <button
              type="button"
              id="qr-download-pdf"
              onClick={downloadPDF}
              disabled={downloading}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "10px 20px", borderRadius: "10px", border: 0,
                background: "#16a34a", color: "#fff",
                fontSize: "14px", fontWeight: 800,
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
                boxShadow: "0 2px 8px rgba(22,163,74,.35)",
              }}
            >
              <FiDownload size={16} />
              {downloading ? "Building PDF…" : `Download PDF (${qrs.length} codes)`}
            </button>
          </div>

          {/* QR grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "12px",
            padding: "16px",
          }}>
            {qrs.map((qr) => (
              <div
                key={qr.qrId}
                style={{
                  background: "#fff", borderRadius: "14px", padding: "12px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                }}
              >
                <img src={qr.qrImage} alt={qr.qrId} style={{ width: "120px", height: "120px" }} />
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#374151", textAlign: "center", wordBreak: "break-all" }}>
                  {qr.qrId}
                </p>
                <button
                  type="button"
                  onClick={() => copyLink(qr.qrId)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    border: "1px solid #d1d5db", borderRadius: "8px", background: "#f9fafb",
                    color: copiedId === qr.qrId ? "#16a34a" : "#374151",
                    fontSize: "11px", fontWeight: 700, padding: "5px 10px", cursor: "pointer",
                  }}
                >
                  {copiedId === qr.qrId ? <FiCheck size={12} /> : <FiCopy size={12} />}
                  {copiedId === qr.qrId ? "Copied!" : "Copy link"}
                </button>
              </div>
            ))}
          </div>

          {/* Second download button at the bottom */}
          <div style={{ padding: "8px 16px 20px", display: "flex", justifyContent: "center" }}>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={downloading}
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "12px 28px", borderRadius: "12px", border: 0,
                background: "#16a34a", color: "#fff",
                fontSize: "15px", fontWeight: 800,
                cursor: downloading ? "wait" : "pointer",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              <FiDownload size={18} />
              {downloading ? "Building PDF…" : "Download All as PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}