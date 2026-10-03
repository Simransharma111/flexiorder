import { useRef, useState } from "react";
import api from "../../api/axios";
import { resetMenuItems } from "../../utils/menuReset";

export default function MenuResetSection({ hotel }) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reset = async () => {
    if (running.current) return;
    if (!window.confirm("Delete all menu items? This removes every current dish from your restaurant's menu and cannot be undone here. Categories and past orders are kept. Export a menu backup first if needed, and stop menu editing on other devices until this finishes.")) return;
    running.current = true;
    setBusy(true);
    setError("");
    setMessage("Loading current menu…");
    try {
      const result = await resetMenuItems(api, hotel, {
        onProgress: ({ completed, total }) => setMessage(`Deleting menu items: ${completed} of ${total}…`),
      });
      setMessage(result.remaining
        ? `${result.completed} items deleted. ${result.remaining} items are now on the menu, possibly added on another device. Review the menu before resetting again.`
        : `Menu reset complete. ${result.completed} items deleted. Categories and past orders are kept.`);
    } catch (failure) {
      setMessage("");
      setError(failure.message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return <section className="rounded-3xl border border-red-400/50 p-6" aria-label="Reset menu">
    <h2 className="text-2xl font-bold mb-2">Reset menu</h2>
    <p className="text-sm mb-4">Delete all menu items to start again. Categories and past orders are kept. Export a backup from Menu tools first if you need it. Stay on this screen until deletion finishes.</p>
    <button type="button" disabled={busy} onClick={reset} className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-50">
      {busy ? "Deleting menu items…" : "Delete all menu items"}
    </button>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
  </section>;
}
