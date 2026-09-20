import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { orderItemDetails } from './orderItemDetails';
import OrderItemOptions from '../components/orders/OrderItemOptions';

const combo = { name: 'Lunch combo', quantity: 1, price: 250,
  comboIncludedItems: ['Rice'], comboSelections: [{ groupName: 'Main', items: ['Paneer <hot>'] }] };
describe('selected order item presentation', () => {
  it('handles old, malformed and untyped snapshots without reading live menu', () => {
    expect(orderItemDetails(null)).toEqual([]);
    expect(orderItemDetails({ comboSelections: [null, { items: 'invalid' }], comboIncludedItems: {} })).toEqual([]);
    expect(orderItemDetails(combo)).toEqual(['Included: Rice', 'Main: Paneer <hot>']);
    expect(orderItemDetails({ variant: { name: 'Large' }, addOns: [{ name: 'Cheese' }], instructions: 'No onion' }))
      .toEqual(['Variant: Large', 'Add-ons: Cheese', 'Instructions: No onion']);
  });
  it('escapes selection text and omits an empty wrapper for simple dishes', () => {
    expect(renderToStaticMarkup(<OrderItemOptions item={combo} />)).toContain('Paneer &lt;hot&gt;');
    expect(renderToStaticMarkup(<OrderItemOptions item={{ name: 'Rice' }} />)).toBe('');
  });
});
