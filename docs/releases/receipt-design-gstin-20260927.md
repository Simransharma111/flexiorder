# Professional receipts and restaurant GSTIN

Local frontend candidate based on9c6e9c8. No backend edits, publication or Android installation.

Settings → Receipt details → Restaurant GSTIN offers a dedicated Save receipt details action. The value is saved only on the current device for the explicit restaurant, with clear format/storage errors and empty-to-clear behavior. Other devices need their own saved setting. Clearing app/browser data can remove it. This field does not change tax rates or financial calculations.

PDF, browser print and share text include the saved GSTIN. PDF layout now has a restaurant-led header, readable metadata, aligned item/quantity/rate/amount columns, recorded subtotal/adjustments and a prominent total. It preserves Unicode canvas rendering and pagination, keeps ordinary rows intact, and repeats table headings on continuation pages. The PDF body remains rasterized rather than selectable text. Receipt financial logic is unchanged, and output remains labelled an order receipt rather than a tax invoice. The local GSTIN is current configuration, not an immutable snapshot of the original order.

Invalid stored billing details show recovery guidance and block export rather than silently omit a known saved identifier. Explicit hotel scoping prevents cross-restaurant leakage. Sharing cancellation and download fallbacks retain their tested behavior.

Verification: lint,294 unit tests and production build pass;16 relevant mobile/desktop Settings/receipt/sharing/takeaway cases pass. Generated and inspected standard,85-item mixed Hindi/English and extreme long-name/notes PDFs; no text-bound violations. Samples and layout report: workspace admin-tools/receipt-design-20260927. Independent review found no blocking defect; long unbroken print contact text was additionally made wrappable. No live restaurant values were changed.
