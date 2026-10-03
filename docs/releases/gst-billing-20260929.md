# GST billing correction — local candidate

Client bill sharing now includes the saved subtotal, discount, GST and total; PDF/print/details label recorded tax as GST. Saved amount/rate remain authoritative. Inconsistent historical GST/subtotal/total combinations carry a warning, without adding another tax charge or changing the recorded total. Current restaurant GST settings never rewrite historical bills.

Root cause is in backend main01c73f5: GST is computed but excluded from totalAmount. Isolated backend commit e2a8541 fixes new-order totals, removes the previously recorded uncharged service fee and snapshots a uniform GST rate. It retains existing menu pricing and discount behavior. Backend must be deployed for the actual saved-total bug to be fixed. No old-order migration, backend release or frontend release performed.

Validation:308 client tests,6 backend tests and8 mobile/desktop browser cases passed. Backend handoff and patch are in workspace admin-tools/gst-billing-20260929.
