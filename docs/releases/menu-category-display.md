# Menu category display release — 2026-09-10

## Changes

- Customer graphic and simple menus group dishes under main-category headings, then subcategory headings. Shared subcategory names cannot mix different main categories.
- Owner Menu → Manage categories → Edit exposes Category position. Positive positions appear first; zero/unset positions follow alphabetically. Position updates preserve descriptions and subcategories.
- Uses existing category GET/POST/PUT API routes and `displayOrder`; no backend deployment or database migration.
- Category catalog enrichment runs after the initial menu render, retains known metadata during refresh, and ignores responses superseded by a newer menu request. Category load failures leave the menu available.

## Verification and limits

- Production bundle builds successfully; modified application files pass ESLint.
- Unit tests and dedicated mobile/desktop category browser coverage exercise grouping, normalization, ordering, saving, reload, narrow layouts, and catalog failure.
- The full lint gate has 12 pre-existing errors in AnalyticsDashboard and excelReport, plus one TableQRManager warning. Those files are unchanged.
- The existing customer-ordering suite has a paused-ordering Schedule button assertion failure on both mobile and desktop. Both failures were separately reproduced on the previous production commit `be848c4`; the other 28 customer checks pass.
- Browser API writes are mocked. The live public catalog route was checked read-only; no restaurant records were modified during verification. Source contract inspection confirms the backend category update persists `displayOrder`; an authenticated production write was not performed.

## Rollout and recovery

Deploy only the frontend. Local preview entries, sample data, Android edits, QR inventory edits, and unrelated staged changes are excluded. Existing categories require no migration. Owners can choose positions after release; customers receive them on menu load/refresh.

Previous frontend commit: `be848c4`. If rollback is needed, redeploy that frontend build or revert this isolated commit. No database rollback is required because this release performs no data migration.
