# FlexiOrder

FlexiOrder is a QR-first restaurant ordering and kitchen workflow client. Customers can view a restaurant menu and place orders from a table QR code; restaurant staff use dedicated waiter and kitchen workspaces with local caching and offline queues.

## Current scope

This repository contains the React/Vite PWA and Capacitor Android client. It does **not** contain the API, database, Socket.IO server, tenant-isolation rules, printer service, or deployment secrets.

Implemented client flows include:

- QR menu, visual/simple layouts, search, dietary labels, discounts and GST display
- Cart, immediate/scheduled order submission, contact details and active-order tracking
- Waiter order entry for tables, rooms and takeaway
- Kitchen New → Preparing → Ready → Delivered workflow with tap and long-press actions
- Cached guest/staff/kitchen data and retry queues for temporary connection loss
- Owner branding, themes, ordering pause, dish availability and menu import/export
- Protected owner/staff/super-admin routes and role-based landing destinations
- Installable PWA and Capacitor Android wrapper

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- A running FlexiOrder-compatible API and Socket.IO server
- Android Studio and a full JDK 21 (including `javac`) when building the Android application

## Environment

Copy `.env.example` to `.env.local` and set the deployment URLs:

```bash
cp .env.example .env.local
```

`VITE_API_URL` and `VITE_SOCKET_URL` must use HTTPS/WSS in production. `VITE_FRONTEND_URL` is used when generating printable/shareable QR links.

## Development and verification

```bash
npm install
npm run dev
npm run lint
npm test -- --run
npm run build
```

Run the full client gate with `npm run check`.

For release-level local verification, run `npm run test:ci`. It executes linting,
unit tests, a production build, and the complete Playwright suite while failing
on flaky tests. `npm run audit:ci` checks the dependency tree for high or
critical vulnerabilities.

## Continuous integration

GitHub Actions runs the quality pipeline on pull requests and pushes to `main`.
It includes:

- lint, unit tests, production build, and dependency audit
- Playwright tests split across two parallel shards
- ten-repeat burn-in on pull requests and every Sunday
- JUnit output and failure traces, screenshots, and videos
- a merged HTML report retained as a workflow artifact

GitHub's normal Actions notifications report failures; no repository secrets are
required. After the first successful run, protect `main` and require the
`Lint, Unit Tests & Build` and both `E2E Tests` checks before merging.

See [docs/ci.md](docs/ci.md) for operation and troubleshooting details and
[docs/ci-secrets-checklist.md](docs/ci-secrets-checklist.md) for the secrets
policy.

## Offline behavior

The application caches the last successfully loaded menu, table, staff-order and kitchen-order data. Staff caches and queues are scoped to the signed-in account. Waiter-created orders receive a `clientOrderId`; kitchen mutations receive a `clientMutationId`, and both IDs are sent during replay. Pending work retries automatically when connectivity returns, remains visible until accepted by the API, and stops automatic retries after repeated or terminal failures so staff can retry it deliberately.

The backend must enforce idempotency for those client IDs. The frontend alone cannot guarantee duplicate prevention or resolve cross-device conflicts.

## Android

Build web assets and sync them before opening Android Studio:

```bash
npm run build
npx cap sync android
cd android
./gradlew test
./gradlew bundleRelease
```

Google Play publication additionally requires a private release keystore, signed release configuration, privacy policy, screenshots, store listing, Data Safety declarations and real-device testing. Never commit a signing key.

Capacitor 8 compiles Android sources for Java 21. A Java runtime without the JDK compiler is not sufficient.

## Production checklist

- Configure production API, socket, CORS and HTTPS endpoints.
- Verify server-side authentication, permissions and restaurant/tenant isolation for every endpoint.
- Recalculate menu prices, discounts, GST and availability on the server; never trust cart snapshots.
- Deduplicate order creation by `clientOrderId` and serialize status changes safely.
- Validate upload MIME types, file sizes and storage permissions server-side.
- Test QR menu, cart, waiter, kitchen, reconnect and history workflows with at least two devices.
- Test slow/offline conditions and concurrent updates against the production-like API.
- Configure logging, monitoring, backups, database indexes and recovery procedures on the server.
- Run `npm run check` and `npm audit --omit=dev` before each web release.

## Not certified by this repository

The client build cannot certify backend authorization, tenant isolation, server-side pricing/GST, scheduled-order activation, true cross-device conflict resolution, database durability, backups, notification delivery, KOT/printer compatibility, subscription enforcement or store-signing configuration. These require the backend repository, deployment environment and relevant hardware.
