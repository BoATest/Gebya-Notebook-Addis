## Summary

### Phase A — Delete dead `TeamPage.jsx`
- Removed the 389-line unreachable duplicate staff system (zero imports/references in the entire codebase)
- Verified no orphaned dependencies — all its imports are shared with 7+ live files

### Phase B — Plain-language reconciliation labels (English only)
- **`staff/ReconStatusBadge.jsx`** — updated 5 English labels to plain-language wording:
  - `staff_submitted` → "Waiting for your review"
  - `owner_reviewed` → "You reviewed — needs finalize"
  - `disputed` → "Difference found"
  - `finalized` → "Settled"
  - `checked` → "Counted directly"
  - **Amharic labels intentionally unchanged** pending native-speaker review
- **`report/StaffSettlementList.jsx`** — removed inline `ReconBadge` duplicate, now uses shared `ReconStatusBadge`
- **`report/SettlementSheet.jsx`** — removed inline `StatusBadge` duplicate, now uses shared `ReconStatusBadge`; updated "Disputed settlement" → "Difference found" and "Dispute" button → "Flag difference"
- **`StaffPage.jsx`** — removed dead `ReconStatusBadge` import (imported but never rendered)
- **`StaffCollectionForm.jsx`** — aligned "Owner noted a difference" → "Difference found by owner"

## Verification
- Build passed: `vite build` succeeded — 2197 modules transformed, no errors
- Commit is clean: exactly 6 files (5 modified + TeamPage.jsx deleted), 14 insertions, 435 deletions
- No Amharic corruption — verified byte-for-byte in all edited files
- No duplicate label maps remain — consolidation complete

## Follow-up
The local-staff role gap (role UI only exists for cloud staff) is committed to a separate branch `staff-role-gap-local-staff`.