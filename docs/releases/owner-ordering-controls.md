# Owner daily controls and takeaway compatibility

Local candidate based on deployed frontend0226e4a. Not deployed or installed as an Android update.

Changes:
- Home exposes adjacent Edit Branding and server-confirmed Ordering Active/Paused. The saved Boolean uses existing PATCH /hotel/profile and a fresh GET /hotel/me confirmation, with stale-response/session guards and visible errors.
- Bottom navigation is Home, Menu, Analytics, QR, Theme, More. More opens secondary tools. Analytics is available at every owner app level; advanced features keep existing gates.
- Home Order History and the existing History tab load all restaurant orders through GET /orders. Active operations remain separate. This avoids the /kitchen/orders default50-record limit. Large histories depend on the existing unpaginated API; complete offline history is not newly guaranteed.
- View Live Menu uses the current assigned Table/Room QR URL. It links to the real guest experience; unpublished editor data is not used. Missing assignments and load errors have explicit recovery.
- Owner enables takeaway once in Tables & Rooms. The existing POST /table creates a reserved Takeaway location without a QR. Waiter Takeaway automatically submits that real tableId using the legacy API contract. Shared order/history/receipt rendering identifies the saved Takeaway snapshot and keeps separate takeaway bills ungrouped. Tables and rooms are naturally sorted in separate waiter lists with search. Legacy offline takeaway retries preserve clientOrderId and resolve the reserved location before replay.

Frontend-only scope confirmed by owner:
The backend candidate is excluded from this release. Home controls, branding access, navigation, complete history and live menu links reuse the existing APIs and can ship independently. The saved orderingEnabled setting blocks ordering through the updated guest interface and its checkout preflight; existing backend polling handles propagation. This is not server-side enforcement against direct API submissions. The user explicitly approved a dedicated Takeaway service location, so staff takeaway can work with the existing server after owner setup.

Backend limitation (reference only, not a release action):
The current remote backend01c73f5 unconditionally rejects missing tableId, its order schema lacks takeaway, and createOrder does not enforce customer pause. The isolated flexibackend-owner-ordering candidate supplies those changes. This release uses the existing real table API and leaves the backend unchanged. It does not provide genuine tableless storage or server-side guest blocking. Older clients may label these orders Table Takeaway. The existing backend cannot guarantee idempotency after ambiguous network retries or atomic uniqueness during concurrent owner setup.

Verification:
Frontend lint, unit tests and production build pass. Relevant mobile/desktop browser suites cover owner controls, navigation, guest pause/resume and cached menu, waiter ordering, history/receipt, authentication and existing Table/Room QR management. Evidence/logs and the separate backend handoff are stored outside this repository in admin-tools/owner-ordering-controls-20260923. Browser APIs use isolated fixtures; no live restaurant settings or customer orders were mutated. Physical Android installation and live backend acceptance remain separate release steps.
