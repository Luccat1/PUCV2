---
phase: 6
plan: 2
wave: 1
gap_closure: true
---

# Fix: User-Facing Documentation Update

## Problem

The README.md and setup guides have not been updated to reflect the current state of the project after 4 phases of development. Users need accurate documentation to set up, configure, and use the system.

## Root Cause

Documentation was deferred during rapid feature development (Phases 1-4). The project evolved from a monolith to a full modular TypeScript system without updating user-facing docs.

## Tasks

### Task 6.2.1: Update README.md

**Files:** `README.md`

**Action:**

1. Read the current `README.md`.
2. Update to reflect the v5.0 architecture:
   - Project overview and features list
   - Technology stack (clasp + TypeScript + Chart.js)
   - Module descriptions (9 .ts modules, 8 .html files)
   - Screenshots/descriptions of the 3 UI surfaces (Menu, Sidebar, Web App)
3. Include clasp setup guide (install, login, clone, push).
4. Document the evaluation workflow end-to-end.
5. Add configuration instructions (scoring weights via sidebar).

**Verify:** README.md is comprehensive, has a clear setup guide, and covers all features.

### Task 6.2.2: Update ARCHITECTURE.md

**Files:** `.gsd/ARCHITECTURE.md`

**Action:**

1. Update the architecture doc to reflect Phase 4 changes (new dashboard APIs, enriched data flow).
2. Ensure all module descriptions are current.
3. Update the data flow diagram if needed.

**Verify:** ARCHITECTURE.md accurately describes the current system.

**Done:** All user-facing documentation is current and accurate for v5.0.
