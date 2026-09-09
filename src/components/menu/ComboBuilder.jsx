import { FiPlus, FiTrash2 } from "react-icons/fi";

const updateAt = (items, index, value) => items.map((item, itemIndex) => itemIndex === index ? value : item);

export default function ComboBuilder({ value, onChange, disabled = false }) {
  const config = value || { includedItems: [], selectionGroups: [] };
  const setConfig = (next) => onChange({ includedItems: [], selectionGroups: [], ...next });

  const updateGroup = (index, patch) => setConfig({
    ...config,
    selectionGroups: updateAt(config.selectionGroups, index, {
      ...config.selectionGroups[index],
      ...patch,
    }),
  });

  return (
    <section className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/40 p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="text-base font-bold text-gray-900">Combo / Thali Builder</h3>
        <p className="mt-1 text-xs text-gray-500">Configure what is included and what guests can choose.</p>
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-800">Included Items</h4>
        <div className="mt-3 space-y-2">
          {config.includedItems.map((item, index) => (
            <div className="flex gap-2" key={`included-${index}`}>
              <input value={item} disabled={disabled} onChange={(event) => setConfig({
                ...config,
                includedItems: updateAt(config.includedItems, index, event.target.value),
              })} placeholder="Included item" className="owner-input flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2" />
              <button type="button" disabled={disabled} aria-label="Remove included item" onClick={() => setConfig({ ...config, includedItems: config.includedItems.filter((_, itemIndex) => itemIndex !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FiTrash2 /></button>
            </div>
          ))}
        </div>
        <button type="button" disabled={disabled} onClick={() => setConfig({ ...config, includedItems: [...config.includedItems, ""] })} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-700"><FiPlus /> Add included item</button>
      </div>

      <div className="mt-7 border-t border-orange-100 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-gray-800">Selection Groups</h4>
          <button type="button" disabled={disabled} onClick={() => setConfig({ ...config, selectionGroups: [...config.selectionGroups, { name: "", minSelections: 0, maxSelections: 0, items: [] }] })} className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700"><FiPlus /> Add group</button>
        </div>
        <div className="mt-4 space-y-4">
          {config.selectionGroups.map((group, groupIndex) => (
            <div className="rounded-xl border border-gray-200 bg-white p-4" key={`group-${groupIndex}`}>
              <div className="flex items-start gap-2">
                <input value={group.name} disabled={disabled} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} placeholder="Group name" className="owner-input flex-1 rounded-lg border border-gray-200 px-3 py-2 font-semibold" />
                <button type="button" disabled={disabled} aria-label="Remove selection group" onClick={() => setConfig({ ...config, selectionGroups: config.selectionGroups.filter((_, index) => index !== groupIndex) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FiTrash2 /></button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-600">Minimum<select value={group.minSelections} disabled={disabled} onChange={(event) => updateGroup(groupIndex, { minSelections: Number(event.target.value) })} className="owner-input mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value={0}>0</option>{Array.from({ length: group.items.length + 1 }, (_, index) => index).filter((index) => index > 0).map((index) => <option key={index} value={index}>{index}</option>)}</select></label>
                <label className="text-xs font-semibold text-gray-600">Maximum<select value={group.maxSelections} disabled={disabled} onChange={(event) => updateGroup(groupIndex, { maxSelections: Number(event.target.value) })} className="owner-input mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value={0}>0</option>{Array.from({ length: group.items.length + 1 }, (_, index) => index).filter((index) => index > 0).map((index) => <option key={index} value={index}>{index}</option>)}</select></label>
              </div>
              <div className="mt-4 space-y-2">
                {group.items.map((item, itemIndex) => (
                  <div className="flex gap-2" key={`option-${itemIndex}`}>
                    <input value={item} disabled={disabled} onChange={(event) => updateGroup(groupIndex, { items: updateAt(group.items, itemIndex, event.target.value) })} placeholder="Option name" className="owner-input flex-1 rounded-lg border border-gray-200 px-3 py-2" />
                    <button type="button" disabled={disabled} aria-label="Remove option" onClick={() => updateGroup(groupIndex, { items: group.items.filter((_, index) => index !== itemIndex) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><FiTrash2 /></button>
                  </div>
                ))}
              </div>
              <button type="button" disabled={disabled} onClick={() => updateGroup(groupIndex, { items: [...group.items, ""], maxSelections: Math.min(group.maxSelections, group.items.length + 1) })} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-700"><FiPlus /> Add option</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
