# Owner menu reset, ordering confirmation and shared exports

Local frontend changes based on Android 1.0.11 commit `5d47fe6`, in the `flexiorder-pdf-dietary` worktree. No backend changes, production menu reset, deployment or Android installation.

- Table/room ordering now uses the same numeric-aware comparator across selectors, live-menu links and grouped order displays, including God Mode. Locations 1, 2 and 10 retain natural order; same-location ticket chronology remains intact.
- Turning customer ordering off from Home, Settings or staff tools requires a warning confirmation. Cancellation sends no update. Existing save verification remains.
- Settings offers Delete all menu items with confirmation, progress and partial-failure feedback. It uses existing authenticated per-dish endpoints, keeps categories and historical orders, blocks offline/unsynced work, guards owner/restaurant session changes and verifies ambiguous 404s before acknowledging deletion. Other-device additions remain outside the snapshot and appear on final refresh. This is not an atomic bulk operation.
- Downloads offer sharing for QR PNG/PDF, menu PDF/JSON/demo, receipts and analytics XLSX. Native exports use cache files and the device share sheet; capable browsers share files, with ordinary download fallback. Cancellation is not reported as delivery or a saved file.

Independent review identified and resolved the generic-404 deletion ambiguity. The second edge-case review reported no additional findings. Physical Android destination compatibility remains unverified.

Verification: final `npm run check` passes lint, 286 unit tests and production build. Mobile/desktop browser verification covers owner controls/races/realtime, reset cancellation/failure/retry, menu tools/import/export, location sorting, table/room QR exports, menu PDFs, analytics sharing and receipt sharing. Initial combined run passed 115/118; two obsolete demo-link selectors and one test-only desktop navigation race were corrected. Corrected reset/export/receipt/analytics reruns passed 12 cases, followed by both demo import/export cases passing. Across these runs, all 126 distinct mobile/desktop scenarios passed.

Prior billing requirements beyond receipt sharing are not available in the current conversation; clarification was requested. Financial calculations and backend order policy were not changed.
