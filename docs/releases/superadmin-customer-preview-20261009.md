# Super Admin customer preview — 2026-10-09

Preview-only release based on production commit 830ad37. Adds the reviewed CRM-01–03 synthetic customer screens alongside existing Super Admin hotel/subscription tools. No backend changes, real CRM records, durable storage or Android release.

This branch enables VITE_ADMIN_CUSTOMERS_DEMO=true through its Vercel buildCommand. Do not merge the preview-only enablement into production without an explicit release decision. Existing superadmin login remains required; no authentication bypass exists.

Customers list/profile and email templates use synthetic fixtures. Defaults reset when leaving Customers/reloading; drafts reset when closed. Email handoff requests a draft only. Native handoff uses copy fallback.

Validation: npm run check passed on this candidate (lint, unit tests, production build). Relevant CRM/auth routing browser tests use installed Google Chrome with video disabled; see workspace deployment record for final results and URL.

Rollback: delete/disable the preview deployment. Production and restaurant backend are unchanged.

## Production authorization — 2026-10-09

After reviewing preview access, the user explicitly requested publishing this sample-data demo on the existing production website without a Vercel login. The same tested app code and demo build flag are approved for production. The Customers area still requires the existing Super Admin login. It remains a synthetic prototype, not a real CRM ledger.

Release validation:321 unit tests and40 desktop/mobile CRM/auth routing browser cases passed. No code changes since that validation. To remove the demo entry, remove the explicit VITE_ADMIN_CUSTOMERS_DEMO=true buildCommand override and redeploy; the application flag defaults off.
