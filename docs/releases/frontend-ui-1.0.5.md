# Frontend UI release 1.0.5

Prepared from frontend main `beb3d4144504d81039b44d13570bf65732d26683` on 2026-09-20. This isolated candidate contains owner/waiter UI improvements, local menu PDF export, draft-reset protection, native entry/back handling and the minimum display/build dependencies. No API endpoint, backend deployment, database migration or dependency-package change is included.

The baseline menu synchronization and offline-order utilities are unchanged. The newer strict menu acknowledgement/read-version implementation is deliberately excluded because it needs backend compatibility work. Existing tableless takeaway behavior is not fixed or newly enabled by this release. This candidate does not claim to resolve every previously identified product issue.

Validation: lint (one pre-existing TableQRManager hook warning), 202 unit tests and web build pass. The 196-case browser run passed 195; the remaining theme test deadlocked while accepting a browser alert after awaiting the click. Its alert handling was corrected, and three repetitions on each browser profile passed (6/6). Earlier tests exposed the baseline paused-ordering schedule button; the small frontend visibility fix is included. Browser requests are mocked, not production order tests.

Android version 1.0.5, version code 6, builds with the cached full JDK 21. Signature verification passed and matched the connected phone's installed 1.0.4 APK. Installed with `adb install -r`; package metadata confirms 1.0.5 and the original installation date remains unchanged. No uninstall or app-data clearing occurred. Process startup was observed; authenticated device workflows and saved customer data were not exhaustively inspected.

Website production is NOT updated. The saved Vercel credentials returned HTTP 403; GitHub CLI is unauthenticated. Renew publishing access before attempting website release. Preserve the current deployment for rollback and finish preview/live compatibility checks before promotion. No token, keystore, environment file or generated artifact is included in this commit.

Unsent waiter drafts remain memory-only: the new Back confirmation does not provide recovery after a reload or explicit workspace departure. Backend-dependent fixes remain outside this release.
