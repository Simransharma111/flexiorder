import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { buildMailto, renderWelcome, validateDraft } from '../../../utils/adminCustomerEmail';

const field = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900';
const button = 'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

export default function CustomerEmail({ customer, template, onClose }) {
  const restaurants = customer.restaurants || [];
  const [restaurantId, setRestaurantId] = useState(restaurants.length === 1 ? restaurants[0].id : '');
  const [draft, setDraft] = useState(null);
  const [generatedScope, setGeneratedScope] = useState('');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [status, setStatus] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const native = Capacitor.isNativePlatform();
  const errors = draft ? validateDraft(draft) : [];
  const changedScope = draft && generatedScope !== restaurantId;
  let mailto = '';
  let handoffError = '';
  if (draft && errors.length === 0) {
    try { mailto = buildMailto(draft); } catch (error) { handoffError = error.message; }
  }

  function generate() {
    if (!restaurantId || (draft && !replaceConfirmed)) return;
    const next = renderWelcome(customer, restaurantId, template);
    setDraft(next);
    setGeneratedScope(restaurantId);
    setReplaceConfirmed(false);
    setManualCopy(false);
    setStatus('Draft generated from sample records. Review all details before opening your email app.');
  }

  function edit(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setStatus('Draft edited. Source records and shared defaults are unchanged.');
  }

  async function copy() {
    const text = `To: ${draft.recipient}\nSubject: ${draft.subject}\n\n${draft.body}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('Draft copied. Nothing has been sent.');
    } catch {
      setManualCopy(true);
      setStatus('Clipboard access is unavailable. Select and copy the text below.');
    }
  }

  return (
    <section className="crm-email mt-4 space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4" aria-label="Email customer">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-gray-900">Email customer</h3>
        <button type="button" className={button} onClick={onClose}>Close email preview</button>
      </div>
      <p className="text-sm text-amber-900">Sample data only. Closing this preview discards its draft. Template changes reset when you leave Customers or reload. This prototype never sends email.</p>
      <label className="block text-sm font-medium">Restaurant / agreement scope
        <select className={field} value={restaurantId} onChange={(event) => { setRestaurantId(event.target.value); setReplaceConfirmed(false); }}>
          <option value="">Select a restaurant and its agreement</option>
          {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name} — {restaurant.agreement?.packageName || 'No agreed package'}</option>)}
        </select>
      </label>
      {draft && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} />Replace my current draft and edits when I regenerate.</label>}
      <button type="button" className={`${button} bg-indigo-700 text-white`} disabled={!restaurantId || Boolean(draft && !replaceConfirmed)} onClick={generate}>{draft ? 'Regenerate draft' : 'Generate draft'}</button>
      {changedScope && <p role="alert" className="text-sm text-amber-900">The selected scope changed. Regenerate explicitly before handoff; your current edits are preserved.</p>}
      {draft && <>
        {draft.issues?.length > 0 && <div className="text-sm text-amber-900"><p className="font-medium">Source details to review</p><ul className="list-disc pl-5">{draft.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul><p>Correct or remove affected text in this draft. Do not invent billing or setup details.</p></div>}
        <details className="text-sm"><summary className="cursor-pointer font-medium">Personalization values used</summary><dl className="mt-2 space-y-1">{Object.entries(draft.values || {}).map(([name, value]) => <div key={name} className="break-words"><dt className="inline font-medium">{name}: </dt><dd className="inline">{value || 'Unavailable'}</dd></div>)}</dl></details>
        <label className="block text-sm font-medium">Recipient email<input type="email" className={field} value={draft.recipient || ''} onChange={(event) => edit('recipient', event.target.value)} /></label>
        <p className="text-xs text-gray-600">The greeting uses the recorded restaurant owner. For a different contact, correct the greeting explicitly or use a neutral greeting.</p>
        <label className="block text-sm font-medium">Email subject<input className={field} value={draft.subject} onChange={(event) => edit('subject', event.target.value)} /></label>
        <label className="block text-sm font-medium">Email body<textarea className={field} rows={15} value={draft.body} onChange={(event) => edit('body', event.target.value)} /></label>
        {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-red-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        {handoffError && <p className="text-sm text-amber-900">{handoffError} Copy the complete draft below; no text is truncated.</p>}
        {native && <p className="text-sm text-amber-900">Native email-handler availability cannot be checked in this prototype. Copy the draft into your email app.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${button} bg-indigo-700 text-white`} disabled={!mailto || native || Boolean(changedScope)} onClick={() => { setStatus('External email draft requested. Sending and delivery are not tracked.'); window.location.href = mailto; }}>Open email app</button>
          <button type="button" className={button} disabled={errors.length > 0 || Boolean(changedScope)} onClick={copy}>Copy complete draft</button>
        </div>
        <p className="text-xs text-gray-600">Your email app may not open if no handler is configured. Use Copy complete draft instead. Review and send manually in your email app.</p>
        {manualCopy && <label className="block text-sm font-medium">Select and copy draft<textarea readOnly className={field} rows={10} onFocus={(event) => event.target.select()} value={`To: ${draft.recipient}\nSubject: ${draft.subject}\n\n${draft.body}`} /></label>}
      </>}
      <p role="status" className="text-sm text-gray-700">{status}</p>
    </section>
  );
}
