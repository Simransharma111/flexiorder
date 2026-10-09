import { describe, expect, it } from 'vitest';
import { sampleCustomers } from '../api/adminCustomers';
import { buildMailto, defaultTemplate, renderWelcome, validateDraft } from './adminCustomerEmail';
describe('customer email preparation', () => {
  it('requires explicit outlet scope and personalizes owner, outlet, sender and recorded terms', () => {
    expect(renderWelcome(sampleCustomers[0], '').issues).toHaveLength(1);
    const draft = renderWelcome(sampleCustomers[0], 'sample-restaurant-11');
    expect(draft.issues).toEqual([]);
    expect(draft.recipient).toBe('asha@orchard.example');
    expect(draft.body).toContain('Hello Asha Sample');
    expect(draft.body).toContain('Sample Orchard Riverside');
    expect(draft.body).toContain('Sample Starter');
    expect(draft.body).toContain('799.00');
    expect(draft.body).toContain('28 Sept 2026');
    expect(draft.body).toContain('Sample administrator');
  });
  it('omits trial billing demands and duplicate brand/outlet wording', () => {
    const draft = renderWelcome(sampleCustomers[1], 'sample-restaurant-2');
    expect(draft.issues).toEqual([]);
    expect(draft.body).not.toContain('First payment due');
    expect(draft.body).not.toContain('Billing starts on');
    expect(draft.body).not.toContain('Sample Lotus Cafe (Sample Lotus Cafe)');
    expect(draft.body).toContain('Trial ends on: 20 Oct 2026');
  });
  it('neutralizes unconfirmed default setup claims while blocking unknown owner and dates', () => {
    const draft = renderWelcome(sampleCustomers[2], 'sample-restaurant-3');
    expect(draft.body).not.toContain('completed successfully');
    expect(draft.subject).not.toContain('is ready');
    expect(draft.issues.join(' ')).toContain('owner_name');
    expect(draft.body).toContain('{{billing_start_date}}');
    expect(() => buildMailto(draft)).toThrow(/placeholder/);
  });
  it('does not mutate templates, and new drafts use updated agreements without leaking customer details', () => {
    const original = JSON.stringify(defaultTemplate);
    const customer = JSON.parse(JSON.stringify(sampleCustomers[0]));
    customer.restaurants[0].agreement.packageName = 'Revised sample plan';
    expect(renderWelcome(customer, 'sample-restaurant-1').body).toContain('Revised sample plan');
    expect(renderWelcome(sampleCustomers[6], 'sample-restaurant-7').body).not.toContain('Asha');
    expect(JSON.stringify(defaultTemplate)).toBe(original);
  });
  it('rejects missing contacts and unknown placeholders without evaluating expressions', () => {
    expect(renderWelcome(sampleCustomers[4], 'sample-restaurant-5').issues.join(' ')).toContain('recipient');
    const draft = renderWelcome(sampleCustomers[0], 'sample-restaurant-1', { ...defaultTemplate, body: '{{constructor}} {{owner_name}}' });
    expect(draft.issues.join(' ')).toContain('Unknown placeholder');
    expect(draft.body).toContain('{{constructor}}');
  });
  it('omits paid due dates and preserves custom trial text for explicit correction', () => {
    const paid = renderWelcome(sampleCustomers[6], 'sample-restaurant-7');
    expect(paid.body).not.toContain('First payment due');
    const trial = renderWelcome(sampleCustomers[1], 'sample-restaurant-2', { ...defaultTemplate, body: 'Hello {{owner_name}}, contact support; billing starts {{ billing_start_date }}.' });
    expect(trial.body).toContain('Hello Ravi Example, contact support');
    expect(() => buildMailto(trial)).toThrow(/placeholder/);
  });
  it('blocks header injection and multiple recipients, encodes Unicode/newlines, and offers oversized fallback', () => {
    const draft = { recipient: 'owner@restaurant.example', subject: 'Hello & नमस्ते', body: 'One\nTwo & three' };
    const url = buildMailto(draft);
    expect(url).toContain('body=One%0ATwo%20%26%20three');
    expect(validateDraft({ ...draft, subject: 'Hello\r\nBcc: other@example.com' })).not.toEqual([]);
    expect(validateDraft({ ...draft, recipient: 'one@example.com,two@example.com' })).not.toEqual([]);
    expect(() => buildMailto({ ...draft, body: 'x'.repeat(2100) })).toThrow(/Copy/);
  });
});
