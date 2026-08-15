import { useEffect, useMemo, useRef, useState } from "react";
import { FiDownload, FiPrinter, FiShare2 } from "react-icons/fi";
import {
  buildOrderReceipt,
  createOrderReceiptPdfBlob,
  receiptFilename,
  receiptPrintHtml,
  receiptShareText,
} from "../../utils/orderReceipt";
import { Share } from "@capacitor/share";
import { downloadFile, isNativeApp, writeTempShareFile } from "../../utils/fileDownload";

export default function OrderReceiptActions({ order, hotel }) {
  const receipt = useMemo(() => buildOrderReceipt(order, hotel), [hotel, order]);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const confirmRef = useRef(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const download = async () => {
    if (working) return;
    setWorking(true);
    setMessage("");
    try {
      const blob = createOrderReceiptPdfBlob(receipt);
      const filename = receiptFilename(receipt);
      if (isNativeApp()) {
        const saved = await downloadFile(blob, filename);
        setMessage(`Saved to ${saved.label || `Downloads/FlexiOrder/${filename}`}.`);
      } else {
        await downloadFile(blob, filename);
        setMessage("Receipt downloaded.");
      }
    } catch {
      setMessage("Could not create or save the PDF. Try Print instead.");
    } finally {
      setWorking(false);
    }
  };

  const print = async () => {
    if (working) return;
    // In the app shell, open the PDF through the native share/print sheet:
    // backable, shareable, and prints via the device's print service.
    if (isNativeApp()) {
      setWorking(true);
      setMessage("");
      try {
        const blob = createOrderReceiptPdfBlob(receipt);
        const uri = await writeTempShareFile(blob, receiptFilename(receipt));
        await Share.share({
          title: `${receipt.restaurant.name} receipt`,
          text: "Receipt PDF",
          url: uri,
          dialogTitle: "Print or share this receipt",
        });
        setMessage("PDF opened. Pick Print or any app to share it.");
      } catch (error) {
        setMessage(error?.name === "AbortError"
          ? "Sheet dismissed. Nothing was printed."
          : "Could not open the PDF sheet. Try Download to save it first.");
      } finally {
        setWorking(false);
      }
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setMessage("Print was blocked. Allow pop-ups and try again.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(receiptPrintHtml(receipt));
    printWindow.document.close();
    setMessage("Print view opened.");
  };

  const share = async () => {
    if (working || !receipt.order.normalizedContact) return;
    setWorking(true);
    setMessage("");
    try {
      const blob = createOrderReceiptPdfBlob(receipt);
      const file = new File([blob], receiptFilename(receipt), { type: "application/pdf" });
      const payload = {
        title: `${receipt.restaurant.name} order receipt`,
        text: receiptShareText(receipt),
        files: [file],
      };
      if (typeof navigator.share !== "function" ||
          (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] }))) {
        setMessage("File sharing is unavailable here. Use Download PDF or Print.");
        return;
      }
      await navigator.share(payload);
      setMessage("Share opened. Confirm delivery in the app you selected.");
      setConfirming(false);
    } catch (error) {
      setMessage(error?.name === "AbortError"
        ? "Share cancelled. Nothing was marked as sent."
        : "Could not open sharing. Use Download PDF or Print.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="ops-receipt-actions" aria-label="Order receipt actions">
      <div className="ops-receipt-actions__head">
        <div><h3>Paperless receipt</h3><p>Order receipt only · nothing is sent automatically</p></div>
      </div>
      <div className="ops-receipt-actions__buttons">
        {receipt.order.normalizedContact && (
          <button type="button" onClick={() => { setConfirming(true); setMessage(""); }} disabled={working}>
            <FiShare2 aria-hidden="true" /> Share receipt
          </button>
        )}
        <button type="button" onClick={download} disabled={working}>
          <FiDownload aria-hidden="true" /> Download PDF
        </button>
        <button type="button" onClick={print} disabled={working}>
          <FiPrinter aria-hidden="true" /> Print
        </button>
      </div>
      {!receipt.order.normalizedContact && (
        <p className="ops-receipt-actions__hint">A valid guest number is unavailable. Download and Print still work.</p>
      )}
      {confirming && receipt.order.normalizedContact && (
        <div className="ops-receipt-confirm" role="group" aria-label="Confirm receipt recipient">
          <p>Open the device share sheet for <strong>{receipt.order.normalizedContact}</strong>?</p>
          <small>The platform cannot guarantee or report which person receives the file.</small>
          <div>
            <button ref={confirmRef} type="button" onClick={share} disabled={working}>
              {working ? "Opening…" : "Confirm and open share"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={working}>Cancel</button>
          </div>
        </div>
      )}
      {message && <p className="ops-receipt-actions__status" role="status">{message}</p>}
    </section>
  );
}
