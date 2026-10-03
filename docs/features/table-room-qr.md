# Tables & Rooms QR management

Status: installed on the connected Android phone as 1.0.10/code 11 on 2026-09-22. Website not deployed. Frontend only.

## Owner workflow

Open **Tables & Rooms** from the owner dashboard, or an existing `/qr` bookmark. Add a table/room, enter its number/name, choose **Auto Generate**, **Enter Code**, or **Scan QR**, then Save. Scanning requires camera permission and explicit **Use this code** confirmation before saving. The server decides which hotel the record belongs to from the signed-in owner.

Cards show the saved code and **Assigned** or **Not assigned**. View/open/download, edit QR, replace by scanning/entering/generating, or remove its assignment with confirmation. Removing a QR keeps the table/room and its orders. Download an individual 1200×1600 PNG, selected QR cards, or all assigned cards in an A4 PDF. PDFs have four complete 90×120 mm cards per page, large QR artwork with four-module quiet zones, location labels and “Scan to View Menu.” Labels use device fonts, including available Unicode glyphs.

Existing table/room names cannot be changed on the current deployed server: it has no rename endpoint. The form reports this limitation and does not recreate records. Keep the current name to save a QR change. Existing type changes/table deletion are not exposed.

## Reused contracts

Inspected remote backend main `01c73f51f57aaeadce1a74f0d6d365d195b65f9a`; local backend HEAD and uncommitted work differ. Unauthenticated live probes confirm the registration route is mounted and rename is absent. No authenticated customer writes were performed.

| Action | Request | Result used |
|---|---|---|
| List | GET `/table` | `tables` |
| Create | POST `/table` `{tableNumber,type}` | `table` |
| Generate | POST `/qr/generate` `{count:1}` | `qrCodes[0].qrId` |
| Enter/scan | POST `/qr/register` `{qrId}` | new/existing `qr`, ownership/status checks |
| Assign/replace | PUT `/table/assign-qr` `{tableId,qrId}` | confirmed `table.qrId` |
| Unassign | PUT `/qr/remove-qr` `{tableId}` | success or reconciled table |
| Guest menu | GET `/qr/menu/:qrId` | unchanged public menu contract |

All privileged requests use `src/api/axios.js`. No request carries a form-supplied hotelId. No batch API, new route, migration, database change, or token/inventory UI is introduced. `Table.qrId`, QR ownership fields and canonical `getPublicAppUrl()/qr/<encoded-code>` are reused. Public guest/cart path segments are encoded to preserve existing codes containing reserved characters.

## Reliability and limits

- Validate names, codes/links, local duplicate assignments and a fresh server table list before mutations. Reject dot-only codes that normalize outside the QR route. Preserve exact code case and table leading zeros.
- Reject returned QR ownership from another table/hotel or disabled codes. Global conflicts and authorization remain server decisions.
- Creation, generation and assignment remain separate writes. Preserve confirmed table/generated code when a later step fails. Retry does not recreate a known table or regenerate a known code. Reconcile lost replies via a fresh list. Do not take over an already assigned location during uncertain creation or overwrite a detected cross-device name/QR change.
- The existing APIs are not transactional or conditional writes. Concurrent changes after preflight remain possible. A lost generation response can leave an unused QR record; there is no safe cleanup endpoint. Closing/reloading discards in-memory intermediate draft state; saved tables remain in the list. Do not claim atomicity or guaranteed idempotency.
- Account changes remount scoped UI; pending operations cannot proceed under the next account. Updated server lists update/close an open QR preview. Confirmed codes are cached by user/hotel using existing storage conventions.
- Offline: loaded/cached assignments can be viewed/exported with a stale-data notice. Exports are preloaded while online when assignments exist. Mutations are disabled and not queued. Cold offline web startup still depends on existing app asset caching; printed codes may have been reassigned elsewhere.
- “Assigned” is not “Enabled”: table listing lacks QR enablement state. No toggle endpoint is exposed.

## Scanner and release configuration

Reuse the workspace's getUserMedia/BarcodeDetector scanner with lazy `@zxing/browser` fallback. It decodes locally and releases camera tracks on detection, cancellation, backgrounding, unmount and late permission results. Camera errors have a manual-entry fallback. Android declares CAMERA and an optional hardware camera feature; Capacitor handles permission requests. Vercel Permissions-Policy allows `camera=(self)` while microphone/geolocation stay disabled. Website and Android require separate releases for these settings.

## Verification and production acceptance

Run `npm run check` and `npm run test:e2e`. Unit tests cover contracts, retry/reconciliation, ownership, cross-device conflicts, input/URL validation, account switching, scanner cleanup and PDF boundaries. Browser tests cover table/room auto/manual/actual decoded QR video streams, confirmation, denied permission, replacements/removal, duplicate rejection, failed and lost replies, refresh, selected/all PDFs, native file adapter, offline reads/exports and encoded public URLs. Browser API responses are isolated contract fixtures, not a substitute for authenticated production validation.

An A4 sample was rendered and visually checked; its QR artwork was decoded from the rendered PDF. Android debug and signed release builds passed. Android 1.0.10/code 11 was installed in place on the connected handset; launch returned Status ok and the existing signed-in Tables & Rooms list loaded its assignment. Physical camera/permission acceptance and authenticated production creation remain unverified. Website deployment is not included.

After release, validate one owner-created test table and room with generate/enter/scan, reload, scan the printed card in a separate signed-out browser, and verify correct hotel/name. Confirm permission-denied fallback and download location on an Android handset. Keep existing customer QR codes untouched. Use browser Network responses for the ordered requests above; an assignment is complete only after confirmed table data includes its QR. No new logging/telemetry backend was added.

## Completed verification — 2026-09-22

- `npm run check`: lint, 258 tests in 34 files, production build passed. Existing large-chunk warning remains.
- `npm run test:e2e`: all 256 desktop/mobile cases passed, including 34 integrated QR cases. Old navigation/category test selectors were aligned with the current UI.
- Android debug/release Gradle builds passed; release APK contains the current production assets, code 11/version 1.0.10, CAMERA permission and matching existing signing certificate.
- `adb install -r`: Success. Activity launch Status ok; package version verified. No uninstall or data-clear command used.
- Two independent reviewers confirmed their reported concurrency, stale-preview, normalized-code and session-state findings were addressed.
