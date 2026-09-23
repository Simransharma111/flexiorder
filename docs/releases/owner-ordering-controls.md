# Owner daily controls and takeaway compatibility

Local candidate based on deployed frontend0226e4a. Not deployed or installed as an Android update.

Changes:
- Home exposes adjacent Edit Branding and server-confirmed Ordering Active/Paused. The saved Boolean uses existing PATCH /hotel/profile and a fresh GET /hotel/me confirmation, with stale-response/session guards and visible errors.
- Bottom navigation is Home, Menu, Analytics, QR, Theme. Header More retains secondary tools. Analytics is available at every owner app level; advanced features keep existing gates.
- Home Order History and the existing History tab load all restaurant orders through GET /orders. Active operations remain separate. This avoids the /kitchen/orders default50-record limit. Large histories depend on the existing unpaginated API; complete offline history is not newly guaranteed.
- View Live Menu uses the current assigned Table/Room QR URL. It links to the real guest experience; unpublished editor data is not used. Missing assignments and load errors have explicit recovery.
- The waiter already submits orderType:takeaway and tableId:null; fixture-backed browser regression coverage now follows its offline retry ID through saved history/receipt. Shared receipts retain authoritative server amounts.

Required server release:
The current remote backend01c73f5 unconditionally rejects missing tableId, its order schema lacks takeaway, and createOrder does not enforce customer pause. The isolated flexibackend-owner-ordering candidate supplies those changes. A frontend deployment alone cannot fix tableless takeaway or guarantee server-side guest blocking. It must not substitute a fake table.

Verification:
Frontend lint, unit tests and production build pass. Relevant mobile/desktop browser suites cover owner controls, navigation, guest pause/resume and cached menu, waiter ordering, history/receipt, authentication and existing Table/Room QR management. Evidence/logs and the separate backend handoff are stored outside this repository in admin-tools/owner-ordering-controls-20260923. Browser APIs use isolated fixtures; no live restaurant settings or customer orders were mutated. Physical Android installation and live backend acceptance remain separate release steps.
