# Registration contact and restaurant deletion guidance

Local frontend candidate based on830715e. Not deployed or included in the installed1.0.12 APK/AAB.

Registration now distinguishes personal owner name from restaurant display name, and carries the entered phone into restaurant setup through a setup-only hint in the existing authenticated session. The hint survives redirect/reload and is removed after successful setup; it does not assert that the backend saved an owner contact. Restaurant phone remains editable and setup submits the edited value.

Owner Settings verifies restaurant name and contact phone alongside menu/GST settings before displaying save success. An ignored contact edit triggers a verification read and an error. Superadmin displays Hotel.phone as Restaurant contact and refreshes from the existing hotel API on browser/app return, reconnect and manual refresh. Read sequence guards prevent older refreshes from replacing newer data.

Hotel deletion now warns the operator to remove all staff using the restaurant owner's Staff screen first. The current API deletes the hotel and owner only. The success message explicitly does not claim staff cleanup. This is an operational warning, not cascading deletion. Already orphaned staff require authorized backend/database repair; no superadmin cleanup route is exposed. Backend handoff is in the workspace at admin-tools/registration-contact-20260925/BACKEND-HANDOFF.md. No live records or backend files were changed.

Validation: npm run check passes lint,286 unit tests and production build. Across focused owner-setting and complete authentication/contact suites,38 distinct mobile/desktop cases pass. Initial new-test failures were a wrong password placeholder and a reload racing an alert; both were corrected. Registration tests cover APIs with and without phone in their response; setup submits the edited restaurant name/phone and clears its local hint. Contact tests reject unconfirmed saves and confirm owner/admin reload consistency. Test APIs are isolated fixtures, not proof of a particular live restaurant's stored values.
