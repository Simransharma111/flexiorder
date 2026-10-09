import { useState } from 'react';
import { sampleCustomers } from '../../../api/adminCustomers';
import { allowedPlaceholders, renderWelcome } from '../../../utils/adminCustomerEmail';

const field = 'mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900';
const button = 'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

export default function TemplateEditor({ template, onSave, onClose }) {
  const [edited, setEdited] = useState(() => ({ ...template }));
  const [status, setStatus] = useState('');
  const unknown = [...new Set(Array.from([edited.subject, edited.body, edited.signature].join('\n').matchAll(/{{\s*([^{}]+?)\s*}}/g), (match) => match[1]))].filter((name) => !allowedPlaceholders.includes(name));
  const errors = [];
  for (const key of ['senderName', 'senderBrand', 'supportContact']) if (!edited[key]?.trim()) errors.push('Complete the sender name, brand and support contact before saving.');
  if (!edited.subject?.trim() || !edited.body?.trim()) errors.push('Subject and body are required.');
  if (/[\r\n]/.test(edited.subject || '')) errors.push('Subject must be one line.');
  if (/\{\{|\}\}/.test([edited.subject, edited.body, edited.signature].join('\n').replace(/\{\{\s*[^{}]+?\s*\}\}/g, ''))) errors.push('Repair incomplete placeholder braces before saving.');
  if (unknown.length) errors.push(`Unsupported placeholders: ${unknown.join(', ')}`);
  const sample = sampleCustomers[0];
  const preview = renderWelcome(sample, sample.restaurants[0].id, edited);

  function update(name, value) {
    setEdited((current) => ({ ...current, [name]: value }));
    setStatus('Unsaved demo template changes.');
  }

  function save(event) {
    event.preventDefault();
    if (errors.length) return;
    onSave({ ...edited });
    setStatus('Demo default saved in memory for future drafts. It resets when you leave Customers or reload; existing drafts are unchanged.');
  }

  return (
    <section className="crm-template space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-6" aria-label="Email template settings">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Admin Settings · Email templates</h2><button type="button" className={button} onClick={onClose}>Back to customers</button></div>
      <p className="text-sm text-amber-900">Synthetic prototype. Saving changes only the demo default during this Customers visit; leaving Customers or reloading resets it. No production template or email is changed.</p>
      <form className="space-y-4" onSubmit={save}>
        <h3 className="font-semibold">Welcome / installation complete</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium">Sender name<input className={field} value={edited.senderName || ''} onChange={(event) => update('senderName', event.target.value)} /></label>
          <label className="block text-sm font-medium">Sender brand<input className={field} value={edited.senderBrand || ''} onChange={(event) => update('senderBrand', event.target.value)} /></label>
          <label className="block text-sm font-medium">Support contact<input className={field} value={edited.supportContact || ''} onChange={(event) => update('supportContact', event.target.value)} /></label>
        </div>
        <label className="block text-sm font-medium">Default subject<input className={field} value={edited.subject || ''} onChange={(event) => update('subject', event.target.value)} /></label>
        <label className="block text-sm font-medium">Default body<textarea className={field} rows={12} value={edited.body || ''} onChange={(event) => update('body', event.target.value)} /></label>
        <label className="block text-sm font-medium">Support signature<textarea className={field} rows={4} value={edited.signature || ''} onChange={(event) => update('signature', event.target.value)} /></label>
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700"><p className="mb-2 font-semibold">Allowed placeholders</p><div className="flex flex-wrap gap-2">{allowedPlaceholders.map((name) => <code key={name}>{`{{${name}}}`}</code>)}</div></div>
        <p className="text-sm text-gray-600">Keep customer-specific details in placeholders. Do not include private notes, credentials or a customer's hardcoded details. Draft edits never change this shared default.</p>
        {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-red-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        <button type="submit" className={`${button} bg-indigo-700 text-white`} disabled={errors.length > 0}>Save demo default</button>
        <p role="status" className="text-sm text-gray-700">{status}</p>
      </form>
      <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Sample preview · {sample.reference}</h3><p className="text-xs text-gray-600">Uses synthetic customer data. Nothing is sent.</p><p className="break-words text-sm"><strong>To:</strong> {preview.recipient}</p><p className="break-words text-sm"><strong>Subject:</strong> {preview.subject}</p><pre className="whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 font-sans text-sm">{preview.body}</pre>{preview.issues.length > 0 && <ul className="list-disc pl-5 text-sm text-amber-900">{preview.issues.map((issue, index) => <li key={`${index}-${issue}`}>{issue}</li>)}</ul>}</div>
    </section>
  );
}
