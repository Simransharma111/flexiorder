# Saved accounts and PDF sequence

The login screen offers an optional **Save login** checkbox and **Choose saved account** button on supported platforms. Save requests occur only after successful authentication, and temporary passwords requiring a change are not saved. Selection fills the fields; the user still presses Login. Signing out clears the current session and silent-selection state without deleting passwords from the provider. To change accounts, sign out, choose another saved account, then log in.

Android delegates to AndroidX Credential Manager 1.6.0 and the user's selected provider (with the Play Services adapter for older Android versions). The local Capacitor plugin has no credential database or file persistence. Web uses the browser PasswordCredential API when supported and HTTPS is available; ordinary username/current-password autocomplete remains available otherwise. Native app and website credentials are not claimed to synchronize automatically: Digital Asset Links are not configured by this change. Saving requires the provider's user consent and may be unavailable on devices without a configured provider.

Passwords are never written to application localStorage, preferences, files, or logs. Browser/Android password managers own storage and deletion. Credentials enter JS memory briefly to populate the form/send the existing authentication request, as manually typed passwords do. Capacitor native logging is disabled, and authentication errors log only the HTTP status rather than Axios request bodies. Existing session-token storage is unchanged. Manual login works when selection is cancelled, no account exists, or the provider fails. Old native builds do not show unavailable plugin controls.

PDF ordering now shares buildCategoryList and groupMenuSections with the live Flexi menu: explicit category displayOrder, embedded category metadata, consistent tie-breaking, dish displayOrder, and contiguous subcategories. Export selections filter this order rather than redefining it. Prices and backend records do not change.

Verification: npm run check; saved-login, authentication-routing and menu-PDF browser scenarios. Native release compilation checks the real Credential Manager API integration. Actual password saving remains subject to the user's device provider and consent; bridge tests do not substitute for that.

References: [Android password integration](https://developer.android.com/identity/passwords), [AndroidX credentials releases](https://developer.android.com/jetpack/androidx/releases/credentials).
