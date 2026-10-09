export const allowedPlaceholders = ['owner_name', 'restaurant_brand', 'restaurant_name', 'sender_brand', 'sender_name', 'support_contact', 'customer_id', 'package_name', 'formatted_price', 'billing_cycle', 'setup_completed_date', 'billing_start_date', 'first_payment_due_date', 'today_date'];
export const defaultTemplate = {
  subject: 'Welcome to {{sender_brand}} — {{restaurant_brand}} is ready!',
  body: 'Hello {{owner_name}},\n\nThank you for choosing {{sender_brand}}! Your setup for {{restaurant_brand}} ({{restaurant_name}}) was completed successfully on {{setup_completed_date}}.\n\nYour plan details:\n- Customer ID: {{customer_id}}\n- Plan: {{package_name}}\n- Plan price: {{formatted_price}} per {{billing_cycle}}\n- Billing starts on: {{billing_start_date}}\n- First payment due: {{first_payment_due_date}}\n\nIf you have any questions about your plan or need help getting started, please contact us at {{support_contact}}.',
  signature: 'Best regards,\n{{sender_name}}\n{{sender_brand}} Team',
  senderName: 'Sample administrator', senderBrand: 'FlexiOrder', supportContact: 'support@flexiorder.example',
};
const dateText = (value) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : null;
export function validateDraft({ recipient, subject, body, setupConfirmed } = {}) {
  const issues = [];
  if (setupConfirmed === false && /completed successfully|setup (?:is )?complete|installation (?:is )?complete|is ready[!.]?/i.test(`${subject || ''} ${body || ''}`)) issues.push('Setup is unconfirmed. Remove the success claim before handoff.');
  if (typeof recipient !== 'string' || !/^[^\s@<>;,?&#%]+@[^\s@<>;,?&#%]+\.[a-z]{2,}$/i.test(recipient)) issues.push('A single valid recipient email is required.');
  if (typeof subject !== 'string' || !subject.trim()) issues.push('A subject is required.');
  if ((/[\r\n]/.test(String(subject ?? '')) || String(subject ?? '').includes(String.fromCharCode(0)))) issues.push('The subject cannot contain line breaks or control characters.');
  if (typeof body !== 'string' || !body.trim()) issues.push('A message body is required.');
  if (/\{\{|\}\}/.test(`${subject || ''}\n${body || ''}`)) issues.push('Resolve or remove every placeholder before opening the email app.');
  if (String(body ?? '').includes(String.fromCharCode(0))) issues.push('The body cannot contain null characters.');
  return issues;
}
export function renderWelcome(customer, restaurantId, template = defaultTemplate) {
  const restaurant = customer?.restaurants?.find((item) => item.id === restaurantId);
  if (!restaurant) return { subject: '', body: '', recipient: '', values: {}, issues: ['Select a restaurant and agreement for this email.'] };
  const agreement = restaurant.agreement;
  const confirmed = restaurant.setupStatus === 'confirmed' && Boolean(dateText(restaurant.setupCompletedAt));
  const trial = agreement?.status === 'trial';
  const eligibleAgreement = ['active', 'trial'].includes(agreement?.status);
  const values = {
    owner_name: restaurant.ownerName, restaurant_brand: restaurant.brand || restaurant.name, restaurant_name: restaurant.name,
    sender_brand: template.senderBrand, sender_name: template.senderName, support_contact: template.supportContact, customer_id: customer.reference,
    package_name: eligibleAgreement ? agreement.packageName : null,
    formatted_price: eligibleAgreement && Number.isSafeInteger(agreement.amountMinor) && agreement.amountMinor >= 0 && /^[A-Z]{3}$/.test(agreement.currency || '') ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: agreement.currency }).format(agreement.amountMinor / 100)}${agreement.taxTreatment ? ` (${agreement.taxTreatment})` : ' (tax treatment not recorded)'}` : null,
    billing_cycle: eligibleAgreement ? agreement.billingCycle : null,
    setup_completed_date: confirmed ? dateText(restaurant.setupCompletedAt) : null,
    billing_start_date: eligibleAgreement ? dateText(agreement.billingStartDate) : null,
    first_payment_due_date: eligibleAgreement ? (agreement.paymentStatus === 'paid' ? 'Already paid — no first payment due' : dateText(agreement.firstPaymentDueDate)) : null,
    today_date: dateText(new Date().toISOString()),
  };
  const issues = [];
  let subject = String(template.subject || '');
  let body = String(template.body || '');
  if (!confirmed && body.includes('Your setup for {{restaurant_brand}} ({{restaurant_name}}) was completed successfully on {{setup_completed_date}}.')) {
    body = body.replace('Your setup for {{restaurant_brand}} ({{restaurant_name}}) was completed successfully on {{setup_completed_date}}.', 'Welcome to {{restaurant_brand}} ({{restaurant_name}}). Setup completion is awaiting confirmation.');
    subject = subject.replace('{{restaurant_brand}} is ready!', '{{restaurant_brand}}');
  }
  if (trial) {
    body = body.replace(/^- Billing starts on: \{\{\s*billing_start_date\s*\}\}\s*$/gm, '').replace(/^- First payment due: \{\{\s*first_payment_due_date\s*\}\}\s*$/gm, '');
    if (dateText(agreement.trialEndDate)) body += `\n\nTrial ends on: ${dateText(agreement.trialEndDate)}.`;
  } else if (eligibleAgreement && (agreement.amountMinor === 0 || agreement.paymentStatus === 'paid')) {
    body = body.replace(/^- First payment due: \{\{\s*first_payment_due_date\s*\}\}\s*$/gm, '');
  }
  if (restaurant.brand === restaurant.name || !restaurant.brand) body = body.replaceAll('{{restaurant_brand}} ({{restaurant_name}})', '{{restaurant_brand}}');
  const render = (text) => text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (token, key) => {
    if (!allowedPlaceholders.includes(key)) { issues.push(`Unknown placeholder: ${key}.`); return token; }
    if (values[key] === undefined || values[key] === null || String(values[key]).trim() === '') { issues.push(`Missing confirmed value: ${key}.`); return token; }
    return String(values[key]);
  });
  subject = render(subject);
  body = render([body, template.signature].filter(Boolean).join('\n\n'));
  const recipient = restaurant.ownerEmail || customer.email || '';
  return { subject, body, recipient, values, setupConfirmed: confirmed, issues: [...new Set([...issues, ...validateDraft({ recipient, subject, body, setupConfirmed: confirmed })])] };
}
export function buildMailto(draft) {
  const issues = validateDraft(draft);
  if (issues.length) throw new Error(issues.join(' '));
  const url = `mailto:${encodeURIComponent(draft.recipient)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
  if (url.length > 2000) { const error = new Error('This draft is too long for a reliable email-app link. Copy the recipient, subject and body instead.'); error.code = 'DRAFT_TOO_LARGE'; throw error; }
  return url;
}
