# Phase 2, Plan 2 Summary: Applicant Review Sidebar

## Objective
Enable per-applicant review and verification directly within the Sheets UI.

## Key Changes
- **src/SidebarRevision.html**: Created a sidebar with navigation controls, score breakdown table, and inline editing for verification status, level, and comments.
- **src/WebApp.ts**: Added `getPostulantesParaRevision` (standardized header mapping) and `guardarRevisionPostulante`.
- **src/WebApp.ts**: Standardized `updateApplicantStatus` to use `CONFIG.COLUMNS.EMAIL` for lookups.

## Verification Results
- [x] Reviewer can navigate applicants (Prev/Next).
- [x] Score breakdown displays correctly for each applicant.
- [x] Verification status and comments are correctly written back to the 'Seleccionados' sheet.
- [x] External certificate links open correctly in new tabs.
