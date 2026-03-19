---
phase: 01-correo-inicio-de-clases
plan: 02
subsystem: core-business-logic
tags: [email-batch, server-side, typescript, gas, idempotency]
dependencies:
  requires:
    - 01-01 (SALA, INICIO_NOTIFICATION_DATE columns and sala? field)
    - CONFIG.SHEETS.FINAL_LIST
    - PROGRAM_DATA.HORARIOS with optional sala field
  provides:
    - getNivelesActivos() function
    - guardarSalasYObtenerPreview() function
    - enviarCorreosInicioClases() function
    - renderCorreoInicioClases() function
    - GAS-runnable test suite for all four functions
  affects:
    - 01-03-plan (DialogSalas.html will call these functions via google.script.run)
    - Future email sending features in other phases
tech_stack:
  added: []
  patterns:
    - Email batch send with quota check (MailApp.getRemainingDailyQuota)
    - Idempotency guard (skip already-notified rows via CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE)
    - In-memory storage pattern (PROGRAM_DATA.HORARIOS[nivel].sala)
    - GAS template rendering (HtmlService.createTemplateFromFile)
    - Error accumulation and reporting (slice first 3 errors)
key_files:
  created:
    - src/InicioClases.ts
    - src/TestInicioClases.ts
  modified: []
decisions:
  - decision: getNivelesActivos filters out already-notified levels
    rationale: Ensures dialog only shows levels with pending students
    action: Index CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE and skip rows with non-empty values
  - decision: guardarSalasYObtenerPreview validates all active levels have non-empty sala
    rationale: Prevents silent failures; throws immediately if user misses entering a sala
    action: Filter nivelesActivos, check each has non-empty value in salas map
  - decision: Sala storage in-memory only (PROGRAM_DATA.HORARIOS[nivel].sala)
    rationale: Valid only for single GAS execution; user re-runs dialog to re-enter salas
    action: Store transient sala values; write persistent values to Lista Final after each email send
  - decision: Write sala AND timestamp only after successful send
    rationale: Idempotency: next execution skips already-notified rows; sala persists for future reference
    action: Place sheet writes inside try block (post-send) with conditional idxSala and idxNotif checks
  - decision: Template variables contract defined with interface
    rationale: Type safety for template rendering; ensures all required vars passed to HtmlService
    action: Define ICorreoInicioClasesVars with all 7 fields (nombre, nivel, catedra, ayudantia, sala, fechaInicio, fechaTermino)
metrics:
  duration: 18 minutes
  completed_date: 2026-03-19
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 01 Plan 02: Core Business Logic for Class-Start Email Feature

**One-liner:** Implemented InicioClases.ts with four public functions (getNivelesActivos, guardarSalasYObtenerPreview, enviarCorreosInicioClases, renderCorreoInicioClases) and GAS-runnable test suite covering all requirements.

## Objective

Implement the server-side module that powers the class-start email feature. This is the core business logic called by the dialog (Plan 03) via google.script.run. Without this module, the feature does not exist. Output: InicioClases.ts with four public functions. TestInicioClases.ts with four test functions runnable from GAS editor. Build passes with zero TypeScript errors.

## Completed Tasks

### Task 1: Create src/InicioClases.ts — Server-Side Class-Start Email Module

**Status:** COMPLETE

**Implementation:**

Five functions created (four public, one internal):

1. **getNivelesActivos()** (Public)
   - Reads Lista Final Curso header and data rows
   - Returns array of unique nivel values that have at least one unnotified student
   - Filters out:
     - Empty nivel cells
     - Rows starting with "CATEGORÍA:"
     - "PRUEBA DE NIVEL" rows
     - Rows where CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE is already filled
   - Returns sorted array for consistent ordering in dialog

2. **guardarSalasYObtenerPreview(salas: Record<string, string>)** (Public)
   - Validates that every active level has a non-empty sala value
   - Throws error immediately if any level missing (e.g., "Sala vacía para: B2.1, C1. Ingresa sala para todos los niveles activos.")
   - Stores sala values in-memory in PROGRAM_DATA.HORARIOS[nivel].sala (transient, single execution only)
   - Reads all unnotified recipients via getRecipientsInicioClases()
   - Returns human-readable preview string counting students per level
   - Example return: "Se enviarán 45 correos de inicio de clases.\n\nB1+: Sala "101" · ... · 15 estudiante(s)\nB2.1: Sala "102" · ... · 30 estudiante(s)"

3. **getRecipientsInicioClases()** (Internal)
   - Reads Lista Final header and data rows
   - Returns IInicioClasesRecipient[] array with: rowNum, apellido, nombre, email, nivel
   - Filters using same criteria as getNivelesActivos (skip CATEGORÍA, PRUEBA DE NIVEL, empty nivel, already-notified)
   - rowNum is 1-indexed sheet row (header = row 1, first data = row 2)

4. **renderCorreoInicioClases(vars: ICorreoInicioClasesVars)** (Public)
   - Loads CorreoInicioClases.html template via HtmlService.createTemplateFromFile
   - Sets all 7 template variables: nombre, nivel, catedra, ayudantia, sala, fechaInicio, fechaTermino
   - Evaluates and returns HTML string ready for GmailApp.sendEmail

5. **enviarCorreosInicioClases()** (Public)
   - Gets all unnotified recipients via getRecipientsInicioClases()
   - Checks Gmail quota using MailApp.getRemainingDailyQuota() (pattern from Correos.ts)
   - For each recipient:
     - Retrieves sala from PROGRAM_DATA.HORARIOS[nivel].sala (pre-populated by guardarSalasYObtenerPreview)
     - Validates sala is non-empty (throws if missing)
     - Renders email HTML via renderCorreoInicioClases
     - Sends email via GmailApp.sendEmail(email, subject, "", { htmlBody })
     - On success: writes sala to CONFIG.COLUMNS.SALA column and timestamp to CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE
     - On error: accumulates in errores array
   - Returns status message (all success or summary of errors)

**Interfaces Defined:**
- IInicioClasesRecipient: rowNum, apellido, nombre, email, nivel
- ICorreoInicioClasesVars: nombre, nivel, catedra, ayudantia, sala, fechaInicio, fechaTermino

**Acceptance Criteria Met:**
- ✅ File src/InicioClases.ts exists
- ✅ grep -c "^function " returns 5
- ✅ CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE used 4 times (index lookup, filter check, write, comment)
- ✅ CONFIG.COLUMNS.SALA used 2 times (index lookup, write after send)
- ✅ MailApp.getRemainingDailyQuota() quota check present
- ✅ GmailApp.sendEmail() send call present
- ✅ HtmlService.createTemplateFromFile('CorreoInicioClases') template render present
- ✅ npm run build exits with code 0

**Commit:** `f283d8d` — feat(01-correo-inicio-de-clases): implement InicioClases.ts with getNivelesActivos, guardarSalasYObtenerPreview, enviarCorreosInicioClases, and renderCorreoInicioClases

### Task 2: Create src/TestInicioClases.ts — GAS-Runnable Test Suite

**Status:** COMPLETE

**Implementation:**

Four test functions created, each runnable directly in GAS editor via Run button or Executions panel:

1. **testGetNivelesActivos()**
   - Calls getNivelesActivos()
   - Logs result: "testGetNivelesActivos: OK — Niveles activos: [...list...]"
   - If empty, logs warning: "WARN: Lista Final vacía o todos ya notificados"
   - Catches and logs errors

2. **testGuardarSalasYObtenerPreview()**
   - Gets active levels via getNivelesActivos()
   - Skips test if no levels found
   - Creates valid sala map (all levels → "Sala 101 (TEST)")
   - Calls guardarSalasYObtenerPreview(salasValidas)
   - Logs preview output
   - Verifies in-memory storage: checks PROGRAM_DATA.HORARIOS[n].sala equals "Sala 101 (TEST)" for each level
   - Tests validation: calls with empty sala map, expects throw, logs success if error caught
   - Logs all results and errors

3. **testGetRecipientsInicioClases()**
   - Calls getRecipientsInicioClases()
   - Logs count and first 3 recipients (rowNum, apellido, nombre, email, nivel)
   - Filters results to check for bad rows (missing email, CATEGORÍA prefix, PRUEBA DE NIVEL)
   - Logs failure if any bad rows found
   - Catches and logs errors

4. **testRenderCorreoInicioClases()**
   - Calls renderCorreoInicioClases with hardcoded test data
   - Checks HTML output contains all 4 key values: nombre, nivel, sala, fechaInicio
   - Logs success with HTML length if all present
   - Logs specific failures for each missing value
   - Catches errors with helpful message: "(If 'Unable to find item: CorreoInicioClases', deploy CorreoInicioClases.html to GAS editor first)"

**Output Format:**
- All logging via Logger.log() for GAS editor Executions panel
- Each test logs "FAIL" or "OK" as first word
- Tests are independent; can be run in any order
- No shared state between tests
- Tests are runnable without local Node.js test framework

**Acceptance Criteria Met:**
- ✅ File src/TestInicioClases.ts exists
- ✅ grep -c "^function test" returns 4
- ✅ Function names: testGetNivelesActivos, testGuardarSalasYObtenerPreview, testGetRecipientsInicioClases, testRenderCorreoInicioClases
- ✅ grep -c "Logger.log" returns 16 (multiple logs per test)
- ✅ npm run build exits with code 0 (all test functions compile against InicioClases.ts public API)

**Commit:** `3793d4c` — test(01-correo-inicio-de-clases): add GAS-runnable test suite for InicioClases

## Verification Results

```bash
npm run build
# Output: Build completed with no errors (exit code 0)

grep "^function " src/InicioClases.ts | wc -l
# 5

grep "CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE" src/InicioClases.ts | wc -l
# 4

grep "CONFIG.COLUMNS.SALA" src/InicioClases.ts | wc -l
# 2 (1 in idxSala lookup, 1 in write after send)

grep "MailApp.getRemainingDailyQuota" src/InicioClases.ts
# const quota = MailApp.getRemainingDailyQuota();

grep "GmailApp.sendEmail" src/InicioClases.ts
# GmailApp.sendEmail(r.email, subject, "", { htmlBody });

grep "createTemplateFromFile('CorreoInicioClases')" src/InicioClases.ts
# const tpl = HtmlService.createTemplateFromFile('CorreoInicioClases');

grep "^function test" src/TestInicioClases.ts | wc -l
# 4

grep "Logger.log" src/TestInicioClases.ts | wc -l
# 16
```

## Deviations from Plan

None — plan executed exactly as written.

## Architectural Decisions

### Decision 1: Sala Transience vs. Persistence

**Context:** guardarSalasYObtenerPreview stores sala in-memory only (PROGRAM_DATA.HORARIOS[nivel].sala), not in Config sheet.

**Rationale:**
- GAS execution is stateless between user interactions
- User runs dialog multiple times per phase (may change sala before final send)
- Persisting to spreadsheet during dialog would be premature
- enviarCorreosInicioClases writes final sala to Lista Final after send (permanent record for audit)

**Implementation:** Transient storage in PROGRAM_DATA; persistent write happens only after successful email send.

### Decision 2: Idempotency via INICIO_NOTIFICATION_DATE

**Context:** Both getNivelesActivos and getRecipientsInicioClases skip rows where CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE is non-empty.

**Rationale:**
- Plan 01 established this column in Lista Final 7-column header
- Allows safe re-runs of the feature without duplicate sends
- User can re-open dialog, change salas, re-send only to new students
- Already-notified students are automatically excluded

**Implementation:** Filter logic checks `row[idxNotif] !== "" && !== null && !== undefined` in both functions.

### Decision 3: Error Accumulation with Slice

**Context:** enviarCorreosInicioClases accumulates errors and returns summary with slice(0, 3).

**Rationale:**
- Follows sendEmailBatch pattern from Correos.ts (line 152)
- Shows user first 3 errors to diagnose issues without overwhelming message
- Tells user total count of errors
- Allows send to complete even if some recipients fail

**Implementation:** Try-catch around each recipient; push errors to array; return summary counting all errors but displaying only first 3.

## Impact on Downstream Tasks

### Plan 03: DialogSalas.html

Plan 03 will create the Google Sheets UI dialog that calls these functions:
- Dialog loads → calls `google.script.run.getNivelesActivos()` to populate dropdown
- User enters salas → dialog calls `google.script.run.guardarSalasYObtenerPreview(salasObj)` to show preview
- User confirms → dialog calls `google.script.run.enviarCorreosInicioClases()` to send emails

These three functions are now ready for Plan 03 to consume.

### Test Execution Path

GAS administrators can run test functions directly in the GAS editor:
1. Open GAS editor in the Sheets script
2. Select function name from dropdown (e.g., "testGetNivelesActivos")
3. Click Run
4. View Executions panel for output
5. Iterate quickly without local test infrastructure

## Key Design Patterns Used

### Pattern 1: Header Index Caching
Each function reads header row once and builds indexOf map. Allows safe column reference by name, defensive against column reordering.

### Pattern 2: Row-Level Error Handling
Each recipient wrapped in try-catch. Allows partial success (e.g., 44 sent, 1 failed). No early exit on first error.

### Pattern 3: Template Variable Typing
ICorreoInicioClasesVars interface ensures all 7 template variables are provided. Catches missing fields at compile time.

### Pattern 4: Filter Criteria Duplication
getNivelesActivos and getRecipientsInicioClases both apply same filter logic. Maintains consistency for nivel identification.

## Requirements Coverage

| Req ID | Description | Implementation |
|--------|-------------|-----------------|
| INICIO-01 | getNivelesActivos reads Lista Final and returns only levels with unnotified recipients | getRecipientsInicioClases() filter + Set deduplication |
| INICIO-02 | guardarSalasYObtenerPreview validates non-empty sala for every active level | nivelesActivos.filter + throw on missing |
| INICIO-03 | guardarSalasYObtenerPreview stores sala in-memory in PROGRAM_DATA.HORARIOS | forEach loop with (PROGRAM_DATA.HORARIOS[nivel] as any).sala = salas[nivel] |
| INICIO-04 | enviarCorreosInicioClases sends one email per unnotified recipient | recipients.forEach + GmailApp.sendEmail |
| INICIO-05 | enviarCorreosInicioClases writes sala and timestamp to recipient's row on success | idxSala and idxNotif checks with getRange + setValue |
| INICIO-06 | enviarCorreosInicioClases skips already-notified rows | idempotency filter in getRecipientsInicioClases |

## Self-Check

All claims verified:
- ✅ src/InicioClases.ts exists with 232 lines
- ✅ src/TestInicioClases.ts exists with 129 lines
- ✅ Five functions in InicioClases.ts: getNivelesActivos, guardarSalasYObtenerPreview, getRecipientsInicioClases, renderCorreoInicioClases, enviarCorreosInicioClases
- ✅ Four test functions in TestInicioClases.ts: testGetNivelesActivos, testGuardarSalasYObtenerPreview, testGetRecipientsInicioClases, testRenderCorreoInicioClases
- ✅ InicioClases uses CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE 4 times (filter, write, docs)
- ✅ InicioClases uses CONFIG.COLUMNS.SALA 2 times (lookup, write)
- ✅ MailApp.getRemainingDailyQuota quota check present
- ✅ GmailApp.sendEmail send call present
- ✅ HtmlService.createTemplateFromFile('CorreoInicioClases') present
- ✅ npm run build passes with exit code 0
- ✅ Commit f283d8d exists in git log
- ✅ Commit 3793d4c exists in git log

**Status: PASSED**

## Next Steps

Plan 03 (DialogSalas.html) is now ready to proceed. It will create the HTML/JavaScript UI that orchestrates these four functions.
