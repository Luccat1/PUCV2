---
phase: 6
plan: 3
wave: 2
gap_closure: true
---

# Fix: Edge Case Handling + Final Polish

## Problem

Phase 5 deliverables (testing, edge cases, code comments) were never started. The system handles the happy path but lacks guards for edge cases that could affect ~200 applicants.

## Root Cause

Phase 5 was not yet reached in the execution flow.

## Tasks

### Task 6.3.1: Edge Case Hardening

**Files:** `src/Correos.ts`, `src/WebApp.ts`, `src/Evaluacion.ts`, `src/Seleccionados.ts`

**Action:**

1. Add duplicate email detection in `evaluarPostulacionesPUCV2()`.
2. Add quota limit check before `sendEmailBatch()` (GAS limit: 100 emails/day for Gmail).
3. Add null/empty guards in `getSelectionData()` and `getDashboardStats()` for sheets that don't exist yet.
4. Ensure `procesarAccionPostulante()` handles expired/reused tokens gracefully (already does, verify).
5. Add try/catch wrappers around critical `google.script.run` callbacks in `index.html`.

**Verify:** Each edge case has a guard. No uncaught exceptions in the critical path.

### Task 6.3.2: Code Comments + JSDoc

**Files:** All `.ts` files in `src/`

**Action:**

1. Add JSDoc `@param` and `@returns` annotations to all public functions.
2. Add inline comments for non-obvious logic (scoring calculations, waitlist promotion flow).
3. Ensure all functions have a `@file` header comment.

**Verify:** Every exported/global function has JSDoc documentation.

**Done:** Codebase is hardened against edge cases and fully documented.
