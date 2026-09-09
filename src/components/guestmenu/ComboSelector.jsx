import { useEffect, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";

const normalize = (value) => String(value || "").trim().toLocaleLowerCase();

export default function ComboSelector({ dish, onClose, onConfirm }) {
  const groups = dish?.comboConfig?.selectionGroups || [];
  const includedItems = dish?.comboConfig?.includedItems || [];
  const [selections, setSelections] = useState([]);

  useEffect(() => {
    setSelections([]);
  }, [dish]);

  const selectedFor = (group) => selections.find((selection) => normalize(selection.groupName) === normalize(group.name))?.items || [];
  const valid = groups.every((group) => {
    const count = selectedFor(group).length;
    return count >= Number(group.minSelections || 0) && count <= Number(group.maxSelections || 0);
  });

  const toggle = (group, option) => {
    const current = selectedFor(group);
    const exists = current.some((item) => normalize(item) === normalize(option));
    if (!exists && current.length >= Number(group.maxSelections || 0)) return;
    const nextItems = exists ? current.filter((item) => normalize(item) !== normalize(option)) : [...current, option];
    setSelections((previous) => [
      ...previous.filter((selection) => normalize(selection.groupName) !== normalize(group.name)),
      ...(nextItems.length ? [{ groupName: group.name, items: nextItems }] : []),
    ]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" role="presentation" onClick={onClose}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label={`Choose options for ${dish.name}`} onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white/95 px-5 py-4 backdrop-blur">
          <div><h2 className="text-xl font-bold text-gray-900">{dish.name}</h2><p className="mt-1 font-semibold text-orange-600">₹{Number(dish.price || 0).toFixed(2)}</p></div>
          <button type="button" aria-label="Close combo options" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><FiX /></button>
        </header>
        <div className="space-y-6 px-5 py-5">
          {dish.description && <p className="text-sm text-gray-600">{dish.description}</p>}
          {includedItems.length > 0 && <section><h3 className="font-bold text-gray-900">Included</h3><ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">{includedItems.map((item) => <li key={item}>✓ {item}</li>)}</ul></section>}
          {groups.map((group) => { const selected = selectedFor(group); const maxReached = selected.length >= Number(group.maxSelections || 0); return <section key={group.name}><div className="flex items-end justify-between gap-3"><div><h3 className="font-bold text-gray-900">{group.name}</h3><p className="mt-1 text-xs text-gray-500">Choose {group.minSelections === group.maxSelections ? `exactly ${group.minSelections}` : `${group.minSelections}-${group.maxSelections}`}</p></div><span className="text-sm font-semibold text-orange-600">{selected.length} / {group.maxSelections}</span></div><div className="mt-3 grid gap-2">{group.items.map((option) => { const isSelected = selected.some((item) => normalize(item) === normalize(option)); return <button type="button" key={option} disabled={!isSelected && maxReached} aria-pressed={isSelected} onClick={() => toggle(group, option)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${isSelected ? "border-orange-500 bg-orange-50 text-orange-800" : "border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"}`}><span>{option}</span>{isSelected && <FiCheck aria-hidden="true" />}</button>; })}</div></section>; })}
        </div>
        <footer className="sticky bottom-0 border-t bg-white p-4"><button type="button" disabled={!valid} onClick={() => onConfirm(selections)} className="w-full rounded-xl bg-orange-500 py-3.5 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300">Add to Cart • ₹{Number(dish.price || 0).toFixed(2)}</button></footer>
      </section>
    </div>
  );
}
