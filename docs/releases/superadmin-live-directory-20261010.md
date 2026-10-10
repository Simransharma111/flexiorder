# Live Super Admin directory — 2026-10-10

Reads real restaurants and linked owners through authenticated GET /admin/hotels. Groups only owner IDs, preserves original source IDs, and shows supplied plan/expiry settings without inventing prices or paid status. Read-only, no imports or browser persistence. Existing axios authentication is retained with fetch cache:no-store. One fetch per mount/explicit refresh; client search, sort and paging.

Owner registration, last use, payments and notes remain unavailable; owners without restaurants are not exposed by this source. Staff excluded because inspected backend route lacks explicit authentication/role checks. No staff request introduced. Source endpoint remains unpaginated.

Production build enables VITE_ADMIN_CUSTOMERS_LIVE=true. Normal Super Admin login required. Secure persistent CRM/MFA service remains future work requiring hosting/identity setup.

Validation:337 unit tests and42 desktop/mobile directory/auth browser checks passed. Anonymous live directory request rejected401. Parent source/edge review completed; independent review agents unavailable due to usage limits. No production records changed. Existing lint/chunk warnings remain.

Rollback: restore previous production3338857 to sample mode; no database rollback. Release prepared in temporary memory-backed checkout because disk is full; original workspace edits preserved.
