# Simplified bill presentation

Local candidate. Bills omit payment method and status. PDF, print, shared text, history details/cards and Analytics display existing assigned order numbers or a stable FO-######## fallback instead of a long database ID. Receipt filenames and Excel order references agree; history/Analytics search accept the displayed number.

The fallback is a hash-based display reference, not a sequential or guaranteed-unique invoice number. Original IDs remain the only record keys; no API, financial or retry behavior changes. Anonymous records without IDs show an em dash. Pending records may receive a different display reference when assigned a server ID. Backend sequence allocation is outside this client-only change.

Verification: client quality gate and mobile/desktop PDF-rendering regression plus named-bill workflows. The PDF test captures actual canvas text to verify absence of payment labels, presence of GST, and the short order reference.

Passed: npm run check (303 unit tests, lint/build) and8 mobile/desktop browser cases. Existing memo/chunk-size warnings remain. Not deployed; APK/AAB1.0.13 predate this change.

Restaurant prefix refinement: restaurant initials replace FO when a name is available, e.g. GC for Green Courtyard or SAF for Saffron. All bill displays, filenames and search use the same restaurant context. Unicode graphemes are preserved on supported platforms. Existing assigned order numbers take precedence. If no restaurant-name snapshot exists, renaming the restaurant changes the display prefix on re-export; abbreviations are not globally unique tenant identifiers. Prefix verification covers multiple names, missing names, non-Latin names and Analytics lookup;8 mobile/desktop bill tests passed.
