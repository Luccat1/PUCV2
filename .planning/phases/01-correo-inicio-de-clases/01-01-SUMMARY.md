---
phase: 01-correo-inicio-de-clases
plan: 01
subsystem: configuration
tags: [schema, foundations, types, constants]
dependencies:
  requires: []
  provides:
    - CONFIG.COLUMNS.SALA
    - CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE
    - IProgramData.HORARIOS[nivel].sala?
    - 7-column Lista Final sheet
  affects: [01-02-plan, 01-03-plan]
tech_stack:
  added: []
  patterns:
    - TypeScript interface extension
    - Configuration constant management
    - Column schema versioning
key_files:
  created: []
  modified:
    - src/Config.ts
    - src/ListaFinal.ts
    - src/Correos.ts
decisions:
  - decision: QUAL-01 requires no code change
    rationale: MailApp.getRemainingDailyQuota() is the only GAS quota API; verified against @types/google-apps-script 1.0.98
    action: Added verification comment to Correos.ts; requirement closed
  - decision: sala field optional at type level
    rationale: Schema allows presence or absence; value populated at email send time (Plan 02)
    action: Added sala?: string to IProgramData.HORARIOS record value type
  - decision: 7-column header committed before any emails sent
    rationale: Idempotency guard — re-running generarListaFinalCurso() after Phase 2 preserves column schema
    action: Updated ListaFinal.ts to 7 columns (HEADER, separator rows, padding logic, formatting)
metrics:
  duration: 8 minutes
  completed_date: 2026-03-19
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 01 Plan 01: Schema Foundations for Class-Start Email Feature

**One-liner:** Extended Config.ts with SALA and INICIO_NOTIFICATION_DATE column constants and optional sala field; upgraded ListaFinal.ts to 7-column header to preserve schema across re-runs.

## Objective

Establish the schema foundations required by downstream tasks in Phase 01 (Correo Inicio de Clases). Every task in this phase depends on these constants and field definitions existing before implementation begins. The Lista Final 7-column header must be committed early to ensure idempotency when re-running generarListaFinalCurso() after sending class-start emails.

## Completed Tasks

### Task 1: Extend Config.ts — SALA, INICIO_NOTIFICATION_DATE, and sala? field

**Status:** COMPLETE

**Changes:**
- Added two new column constants to CONFIG.COLUMNS (lines 148-149):
  - `INICIO_NOTIFICATION_DATE: "Notificado Inicio"`
  - `SALA: "Sala"`
- Extended IProgramData.HORARIOS type (line 37) to accept optional sala field:
  - From: `Record<string, { catedra: string; ayudantia: string }>`
  - To: `Record<string, { catedra: string; ayudantia: string; sala?: string }>`
- Added QUAL-01 verification comment to Correos.ts (line 91) confirming MailApp.getRemainingDailyQuota() is the correct API

**Acceptance Criteria Met:**
- ✅ `grep -n "INICIO_NOTIFICATION_DATE" src/Config.ts` returns line 148 with correct value
- ✅ `grep -n "SALA:" src/Config.ts` returns line 149 with correct value
- ✅ `grep -n "sala?" src/Config.ts` returns line 37 with type definition
- ✅ `grep -n "QUAL-01 verified" src/Correos.ts` returns verification comment
- ✅ `npm run build` exits code 0 with zero TypeScript errors

**Commit:** `92a4e37` — feat(01-correo-inicio-de-clases): extend Config with SALA and INICIO_NOTIFICATION_DATE constants and sala? field

### Task 2: Update ListaFinal.ts — Extend to 7-Column Header

**Status:** COMPLETE

**Changes:**
- Updated HEADER constant (line 51) from 5 to 7 columns:
  - Added `"Sala"` and `"Notificado Inicio"` to the end of the array
- Extended separator row (line 55) to 7 empty columns
- Extended category header row (line 56) to 7 columns with empty placeholders
- Updated row padding logic (lines 59-61):
  - Changed `while (row.length < 5)` to `while (row.length < 7)`
  - Changed `row.slice(0, 5)` to `row.slice(0, 7)`
- Updated header formatting range (line 67) from 5 to 7 columns for bold/background styling

**Acceptance Criteria Met:**
- ✅ HEADER constant includes both "Sala" and "Notificado Inicio"
- ✅ Row padding ensures exactly 7 columns with empty values for Sala and Notificado Inicio
- ✅ Header formatting applies to all 7 columns
- ✅ `npm run build` exits code 0

**Commit:** `de81a4d` — feat(01-correo-inicio-de-clases): extend ListaFinal to 7-column header with Sala and Notificado Inicio

## Verification Results

```bash
npm run build 2>&1
# Output: Build completed with no errors

grep "INICIO_NOTIFICATION_DATE\|SALA:" src/Config.ts
# 148: INICIO_NOTIFICATION_DATE: "Notificado Inicio",
# 149: SALA: "Sala"

grep "sala?" src/Config.ts
# 37: HORARIOS: Record<string, { catedra: string; ayudantia: string; sala?: string }>;

grep "Notificado Inicio\|\"Sala\"" src/ListaFinal.ts
# 51: const HEADER = ["Apellido(s)", "Nombre(s)", "Correo", "Nivel", "Pagó (Sí/No)", "Sala", "Notificado Inicio"];

grep "row.length < 7\|row.slice(0, 7)" src/ListaFinal.ts
# 60: while (row.length < 7) row.push("");
# 61: finalRows.push(row.slice(0, 7));
```

## Deviations from Plan

None — plan executed exactly as written.

## QUAL-01 Disposition

**Status:** CLOSED (verified, no code change required)

**Finding:** Investigation confirmed that `MailApp.getRemainingDailyQuota()` is the only GAS quota checking API. The GmailApp service does not expose a quota method in @types/google-apps-script v1.0.98. The current implementation in Correos.ts line 91 is correct.

**Action Taken:** Added one-line verification comment above the quota check to document this finding for future maintainers. No code changes to the quota API call itself.

## Impact on Downstream Tasks

**Downstream Dependencies (Plan 02 — InicioClases.ts):**
- Plan 02 will reference `CONFIG.COLUMNS.SALA` and `CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE` by name at send time
- Plan 02 will read `PROGRAM_DATA.HORARIOS[nivel].sala` when composing email context
- Both constants and the optional field are now available at the TypeScript type level

**Idempotency Guarantee:**
- The 7-column header is committed before any emails are sent
- Re-running `generarListaFinalCurso()` after Phase 02 completes will preserve the column schema (Sala and Notificado Inicio columns remain in the output)
- This prevents the common problem of losing tracking columns when regenerating reports

## Key Decisions Made

1. **QUAL-01 verification comment** — Added documentation in place of a code change, since the current implementation is already correct
2. **Optional sala field** — Kept at the type level (not required in HORARIOS) because the value is populated dynamically at email send time by Plan 02
3. **Early 7-column commit** — Committed before any emails are sent to lock in the schema and ensure idempotency across re-runs

## Next Steps

Plan 02 will implement InicioClases.ts, which depends on these constants and schema. It will:
- Reference CONFIG.COLUMNS.SALA and CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE when preparing email data
- Optionally populate sala from user input (if provided)
- Write notification timestamps to the INICIO_NOTIFICATION_DATE column after each send

## Self-Check

All modifications verified:
- ✅ src/Config.ts exists and contains SALA, INICIO_NOTIFICATION_DATE constants
- ✅ src/Config.ts IProgramData.HORARIOS includes sala?: string
- ✅ src/ListaFinal.ts HEADER is 7 columns with correct names
- ✅ src/ListaFinal.ts row padding uses 7 columns
- ✅ src/ListaFinal.ts formatting range updated to 7
- ✅ src/Correos.ts contains QUAL-01 verification comment
- ✅ npm run build passes with exit code 0
- ✅ Both commits exist in git log

**Status: PASSED**
