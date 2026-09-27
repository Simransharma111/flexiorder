import { useState } from "react";
import { getRestaurantId } from "../../utils/storageScope";
import { readRestaurantBilling, saveRestaurantBilling } from "../../utils/restaurantBilling";

function RestaurantBillingForm({ hotel }) {
  const [initial] = useState(() => {
    try { return { ...readRestaurantBilling(hotel), error: "" }; }
    catch (error) { return { gstin: "", error: error.message }; }
  });
  const [gstin, setGstin] = useState(initial.gstin);
  const [error, setError] = useState(initial.error);
  const [message, setMessage] = useState("");
  const save = () => {
    setMessage("");
    setError("");
    try {
      const saved = saveRestaurantBilling(hotel, { gstin });
      setGstin(saved.gstin);
      setMessage(saved.gstin ? "Receipt details saved on this device for this restaurant." : "Saved GSTIN cleared on this device for this restaurant.");
    } catch (failure) { setError(failure.message); }
  };
  return <section className="rounded-3xl border border-white/20 bg-white/10 p-6" aria-label="Receipt details">
    <h2 className="text-2xl font-bold mb-2">Receipt details</h2>
    <p className="text-sm opacity-70 mb-4">The GSTIN is saved only on this device for this restaurant. It is not synced to other devices and may be lost if app or browser data is cleared. This does not change GST rates or checkout totals.</p>
    <label htmlFor="restaurant-receipt-gstin" className="block text-sm font-semibold mb-1">Restaurant GSTIN (optional)</label>
    <input id="restaurant-receipt-gstin" value={gstin} onChange={event => { setGstin(event.target.value); setMessage(""); setError(""); }} autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-describedby="receipt-gstin-help" aria-invalid={Boolean(error)} className="w-full max-w-sm rounded-xl border border-white/20 bg-black/10 px-4 py-3 outline-none" />
    <p id="receipt-gstin-help" className="text-sm opacity-70 mt-2">Only the 15-character format is checked; registration is not verified. Leave empty and save to clear.</p>
    <button type="button" onClick={save} className="mt-4 rounded-xl bg-orange-500 px-4 py-3 font-bold text-white">Save receipt details</button>
    {error && <p role="alert" className="mt-3 text-sm">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
  </section>;
}

export default function BillingSettings({ hotel }) {
  const id = hotel == null ? "" : getRestaurantId(hotel);
  return <RestaurantBillingForm key={id} hotel={hotel} />;
}
