# Guest scan-link loading investigation — 2026-09-23

Status: frontend fixes prepared locally; not deployed or installed. Customer-specific performance diagnosis awaits the affected QR URL.

## Verified findings

The current online GuestMenuPage bundle still increments its request revision for each 30-second refresh, only clears loading for a non-silent request that remains current, and has no request timeout. If the first request lasts beyond a refresh interval, a newer silent request can invalidate it and leave the spinner visible after data arrives. Repeated slow overlapping requests can also keep invalidating responses.

The menu cache is read only after a request rejects, so repeat visitors wait for the network before seeing already saved dishes. Writes to localStorage are inside the main success try block: storage quota/privacy errors can incorrectly send a valid fresh response into error handling. Guest dish images lack lazy loading, requesting off-screen artwork unnecessarily.

These are code-confirmed frontend problems, including inspection of the served production bundle. The spinner race was also reproduced against the actual online frontend with an isolated delayed API fixture: advancing beyond30 seconds caused2 menu requests; after releasing both successful replies the spinner remained visible and the dish did not appear. No customer backend request or write was used in that reproduction. They do not prove that the notification provider, hosting plan, MongoDB queries or image sizes caused the customer's particular delay.

## Live measurement limits

Decoded the public QR URL from the previous installed-app screenshot instead of relying on a transcribed identifier. Three fresh browser contexts reached the website shell in approximately 0.39–0.80 seconds. The menu API response took approximately 0.81–0.87 seconds, with the response available about 1.60–1.95 seconds after navigation. All three returned HTTP404, “This QR code is not assigned to any table or room.” Consequently **these are not successful menu-display times** and cannot establish the speed of a populated customer menu.

A separate diagnostic request had approximately 15 seconds of local DNS resolution time; do not attribute that local-network outlier to the customer's backend. No authenticated data was changed. No customer IDs were enumerated. Requested the actual affected link and observed delay from the user.

## Focused frontend changes

- Share one in-flight menu request per current QR across polling/reconnect triggers; prevent a slow initial load from being superseded repeatedly.
- Clear the loading state for the current completion, including background recovery. Bound menu requests to20 seconds and show an explicit retry message on timeout.
- Display a saved menu immediately as view-only while requesting current data. Ordering requires a fresh authoritative hotel response; cached data never enables ordering by itself.
- Isolate cache-write failures so storage cannot discard a successful live response.
- Do not fall back to stale cache after an authoritative 4xx QR rejection; offline/transport/server failures retain view-only fallback.
- Add native browser lazy loading and asynchronous decoding to dish images. No image URL redesign, backend/schema change, or speculative query/index changes.

## Verification

`npm run check` passed: lint,258 unit tests and production build. All38 guest browser cases passed across the main run and the corrected timeout-test rerun (36+2). The initial timeout test incorrectly used Playwright's5-second assertion deadline for a native20-second XHR timeout; its assertion now allows25 seconds. Product code was unchanged for that rerun.

Regression coverage includes immediate cached visibility with ordering disabled, stalled requests exiting the spinner, cache quota failures preserving fresh menus, and invalid QR responses not reviving old menus. Existing checkout, price/GST, ordering-pause, offline and guest-menu tests pass.

Remaining: obtain a valid affected link; measure navigation→JS→menu API→first dish/hero/image completion on a representative mobile network and repeated visits. Backend query timing/cold-start diagnosis needs service telemetry or backend access. A frontend release alone cannot guarantee a fast first visit if the server is slow.
