# Customer names on saved bills

Local candidate; not deployed or installed.

Customer names submitted with orders are retained when an acknowledgement/update omits a name or returns the default Guest placeholder. Existing scoped caches retain that metadata across refresh. A meaningful server name wins; separate orders never borrow names from a shared table. Anonymous bills remain anonymous. Server financial snapshots and offline operation IDs are unchanged.

History cards/details, receipt PDF/print/share text, and Analytics bill listings consistently show optional names. Analytics search can find named bills and open their existing receipt details. Excel exports have a dedicated Customer name column in addition to contact.

The cached backend main already supports guestName on create and in the Order model. No backend changes or production data writes were made. This client fix cannot reconstruct names absent from both server and local cache, and cross-device availability requires server persistence. Existing history-fetch limits remain.

Verification: `npm run check` passed with301 unit tests;10 relevant Playwright mobile/desktop scenarios passed. One pre-existing receipt useMemo lint warning and build chunk-size warning remain.

Review identified and resolved late acknowledgements being ignored for name recovery, guest tracking overwrites, and Analytics needing the existing `/orders` history feed alongside recent kitchen orders. History remains subject to the existing 500-order request limit.
