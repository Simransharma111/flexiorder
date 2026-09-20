// Display only the order snapshot, never today's editable menu configuration.
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const names = value => Array.isArray(value)
  ? value.map(item => text(item?.name ?? item)).filter(Boolean)
  : [];

export const orderItemDetails = (item = {}) => {
  if (!item || typeof item !== 'object') return [];
  const details = [];
  const included = names(item.comboIncludedItems);
  if (included.length) details.push(`Included: ${included.join(', ')}`);
  if (Array.isArray(item.comboSelections)) {
    item.comboSelections.forEach(selection => {
      const selected = names(selection?.items);
      if (selected.length) details.push(`${text(selection?.groupName) || 'Selected'}: ${selected.join(', ')}`);
    });
  }
  const variant = text(item.variant?.name ?? item.variant);
  if (variant) details.push(`Variant: ${variant}`);
  const extras = names(item.addOns);
  if (extras.length) details.push(`Add-ons: ${extras.join(', ')}`);
  const note = text(item.specialInstructions || item.instructions || item.notes || item.note);
  if (note) details.push(`Instructions: ${note}`);
  return details;
};
