---
phase: 01-correo-inicio-de-clases
plan: 1.1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/EnvioInicioClases.ts
  - src/TestEnvioInicioClases.ts
autonomous: true
requirements: [INICIO-01, INICIO-02, INICIO-03, INICIO-04, INICIO-05, INICIO-06, QUAL-01]
gap_closure: true
---

<objective>
Create persistent sheet-based workflow for class-start email deployment, replacing dialog-driven approach.

Purpose: Users need permanent audit trail of emails sent; two-button workflow (Create Sheet → Send) is clearer than modal dialog.

Output: `src/EnvioInicioClases.ts` with 3 functions + test suite; "Envío Inicio Clases" sheet template with 7-column headers.
</objective>

<execution_context>
@C:/Users/Usuario/.claude/get-shit-done/workflows/execute-plan.md

Phase 1 verification: All 8 original requirements passing (from 01-VERIFICATION.md)
Current state: Dialog-based send flow in InicioClases.ts works; gaps request sheet-persistent alternative
</execution_context>

<context>
@.planning/REQUIREMENTS.md
@.planning/phases/01-correo-inicio-de-clases/01-VERIFICATION.md
@.planning/phases/01-correo-inicio-de-clases/01-GAPS.md

From src/Config.ts:
- SHEETS.LISTA_FINAL = "Lista Final Curso"
- COLUMNS.NOMBRE, .CORREO, .NIVEL, .SALA, .INICIO_NOTIFICATION_DATE
- CONFIG.HORARIOS type structure with catedra, ayudantia, sala?

From src/InicioClases.ts:
- getNivelesActivos() → returns active levels
- getRecipientsInicioClases() → returns IInicioClasesRecipient[]
- renderCorreoInicioClases(recipient) → returns HTML string
- Existing send logic (MailApp quota, GmailApp.sendEmail, column writes)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create EnvioInicioClases.ts module with sheet manager functions</name>
  <files>src/EnvioInicioClases.ts</files>
  <action>
Create new module with 3 functions to manage the "Envío Inicio Clases" sheet:

1. **crearHojaEnvioInicioClases()** → Creates sheet or returns existing
   - Check if "Envío Inicio Clases" sheet exists; if yes, return it
   - If no, create new sheet via SpreadsheetApp
   - Call formatearHojaEnvio() to style headers
   - Return sheet object

2. **formatearHojaEnvio(sheet)** → Apply styling to headers
   - Get range A1:G1 (7 columns: Nombre, Correo, Nivel, Sala, Horario, Correo Enviado, Estado)
   - Set header row text (A1="Nombre", B1="Correo", C1="Nivel", D1="Sala", E1="Horario", F1="Correo Enviado", G1="Estado")
   - Apply formatting: bold, light blue background (#D9E8F5), center alignment
   - Set column widths: A=25, B=35, C=15, D=15, E=25, F=25, G=15
   - Freeze header row (1 row)

3. **poblarYEnviarEnvioInicioClases()** → Read Lista Final, populate sheet, send emails, update columns
   - Call getRecipientsInicioClases() from InicioClases.ts (REUSE existing logic)
   - Create/get sheet via crearHojaEnvioInicioClases()
   - For each recipient:
     a. Write row: A=nombre, B=correo, C=nivel, D=sala, E=horario (concat catedra+ayudantia), G="Pendiente"
     b. Call renderCorreoInicioClases(recipient) and send via GmailApp.sendEmail()
     c. On success: F=new Date() (timestamp), G="Éxito"
     d. On error: G="Error: [message]", F empty
   - Include MailApp.getRemainingDailyQuota() check before loop (quota error → show alert, exit)
   - Return success message: "Se enviaron [count] correos de inicio de clases."

Type signature:
```typescript
function crearHojaEnvioInicioClases(): GoogleAppsScript.Spreadsheet.Sheet
function formatearHojaEnvio(sheet: GoogleAppsScript.Spreadsheet.Sheet): void
function poblarYEnviarEnvioInicioClases(): string
```

Module-level: Import from Config.ts, InicioClases.ts, Correos.ts (for quota pattern)
  </action>
  <verify>
    <automated>grep -n "crearHojaEnvioInicioClases\|formatearHojaEnvio\|poblarYEnviarEnvioInicioClases" src/EnvioInicioClases.ts | wc -l</automated>
    Returns 3 (all three functions defined)
  </verify>
  <done>
- File src/EnvioInicioClases.ts exists with 3 functions
- All functions typed and follow GAS patterns
- Module imports Config, InicioClases, uses SpreadsheetApp/MailApp APIs
  </done>
</task>

<task type="auto">
  <name>Task 2: Create TestEnvioInicioClases.ts test suite</name>
  <files>src/TestEnvioInicioClases.ts</files>
  <action>
Create test file with 3 test functions (follow TestInicioClases.ts pattern):

1. **testCrearHojaEnvioInicioClases()** → Verify sheet creation
   - Call crearHojaEnvioInicioClases()
   - Assert sheet exists: `sheet.getName() === "Envío Inicio Clases"`
   - Assert header row A1:G1 has correct text (via getRange().getValues())
   - Log: "✓ Sheet creation and headers"

2. **testFormatearHojaEnvio()** → Verify formatting applied
   - Create temp sheet, call formatearHojaEnvio()
   - Assert header range has bold font: `headerRange.getFontWeight() === "bold"`
   - Assert column widths match spec: A≈25, B≈35, C≈15, D≈15, E≈25, F≈25, G≈15
   - Assert frozen rows === 1
   - Log: "✓ Header formatting and column widths"

3. **testPoblarYEnviar()** → Verify row population (without actual send)
   - Mock: Use test data from CONFIG (2–3 test nivel entries)
   - Call poblarYEnviarEnvioInicioClases() in dry-run mode (or test with small subset)
   - Assert sheet has rows 2+ populated with nombre, correo, nivel, sala, horario
   - Assert columns F ("Correo Enviado") and G ("Estado") have values
   - Log: "✓ Row population and column writes"

All tests log to Logger.log() for GAS Executions panel visibility.

Type: Match TestInicioClases.ts structure (no return, Logger output only)
  </action>
  <verify>
    <automated>grep -n "function test" src/TestEnvioInicioClases.ts | wc -l</automated>
    Returns 3 (all three test functions defined)
  </verify>
  <done>
- File src/TestEnvioInicioClases.ts exists with 3 test functions
- Tests verify sheet creation, formatting, and row population
- Ready to run in GAS editor via test function calls
  </done>
</task>

</tasks>

<verification>
After completion, verify:
- [ ] `src/EnvioInicioClases.ts` compiles with `npm run build`
- [ ] Three functions callable from GAS menu/dialog context (public scope)
- [ ] `src/TestEnvioInicioClases.ts` test functions pass when run in GAS editor
- [ ] Sheet "Envío Inicio Clases" can be created and has all 7 columns with correct headers
- [ ] Original Phase 1 requirements still pass (no regressions to InicioClases.ts)
</verification>

<success_criteria>
- EnvioInicioClases.ts module created with 3 public functions
- Sheet creation + formatting working (verified via test)
- Row population logic matches recipients from InicioClases.ts
- Quota check in poblarYEnviarEnvioInicioClases matches QUAL-01 pattern
- TestEnvioInicioClases.ts passes all 3 tests in GAS editor
- Build passes: `npm run build` exits 0
</success_criteria>

<output>
After task completion:
- [ ] Commit: `git add src/EnvioInicioClases.ts src/TestEnvioInicioClases.ts`
- [ ] Create `.planning/phases/01-correo-inicio-de-clases/01-1-SUMMARY.md` with module overview
- [ ] Note: Plan 1.2 will update Config.ts + Menu.ts to wire these new functions
</output>
