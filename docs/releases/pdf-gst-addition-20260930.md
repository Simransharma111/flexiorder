# Include recorded GST in the bill total

User explicitly requested PDF subtotal+GST arithmetic with no backend changes. For the known legacy case where the saved total equals a clearly recorded pre-tax amount, the bill adds the saved GST exactly once, rounded to paise. It retains the original recorded total separately in the receipt model and marks the displayed total as derived. No API/database mutation occurs. Current restaurant tax settings are never used to recalculate historical tax.

Already-taxed totals remain unchanged. Explicit tax-inclusive records, unexplained mismatches, and ambiguous discount snapshots are not automatically adjusted. PDF, print, share text and bill details use the same calculation. Reporting aggregates continue to use stored order totals, so they may differ from the bill total. This is a bill-only correction, not a server accounting migration.

Verification:310 unit tests and8 mobile/desktop browser cases passed; actual PDF canvas output and visible bill total assert INR105 for a legacy subtotal100/GST5/total100 fixture. Backend unchanged.
