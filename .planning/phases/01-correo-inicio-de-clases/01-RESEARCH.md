# Phase 1: Correo Inicio de Clases - Research

**Researched:** 2026-03-19
**Domain:** Google Apps Script — batch email sending, HtmlService dialogs, idempotency via spreadsheet columns, TypeScript extension of existing Correos.ts pattern
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INICIO-01 | Admin puede abrir un diálogo que solicita la sala de clases por cada nivel activo antes de enviar correos | HtmlService modal pattern confirmed in Menu.ts; `showModalDialog` already used for `DialogConfirmEval` |
| INICIO-02 | El diálogo muestra una confirmación del mapeo nivel → sala antes de proceder | `google.script.run` two-step flow: first call saves + previews, second call triggers send — confirmed from SidebarConfig pattern |
| INICIO-03 | El sistema envía correos individuales de inicio de clases a todos los participantes confirmados en "Lista Final Curso" | `generarListaFinalCurso()` already produces the confirmed roster; read loop follows `sendEmailBatch` pattern exactly |
| INICIO-04 | El correo incluye nombre del estudiante, nivel asignado, horario (cátedra y ayudantía), sala de clases, y fechas de inicio/término del programa | All fields available: `nombre`/`nivel` from Lista Final, `PROGRAM_DATA.HORARIOS[nivel]` for schedule, `sala` passed as parameter, `PROGRAM_DATA.FECHA_INICIO`/`FECHA_TERMINO` from Config |
| INICIO-05 | La sala de clases ingresada se guarda en la columna correspondiente de "Lista Final Curso" | New column "Sala" in Lista Final; write pattern follows `sendEmailBatch` row-level `setValue` already in use |
| INICIO-06 | El sistema marca a cada estudiante notificado (columna "Notificado Inicio") y omite estudiantes ya notificados en re-ejecuciones | Exact same mechanism as `CONFIG.COLUMNS.NOTIFICATION_DATE` in `sendEmailBatch` — add `INICIO_NOTIFICATION_DATE` constant and check/write pattern |
| INICIO-07 | El envío está disponible desde el submenú "Enviar Correos" del menú PUCV2English | `onOpen()` already has `addSubMenu` for "Enviar Correos" — add one `addItem` entry pointing to a new wrapper in `Menu.ts` |
| QUAL-01 | La verificación de cuota de correo usa `GmailApp.getRemainingDailyQuota()` en lugar de `MailApp.getRemainingDailyQuota()` en todo el codebase | **CRITICAL FINDING: `GmailApp.getRemainingDailyQuota()` does NOT exist.** Verified against installed `@types/google-apps-script` 1.0.98 and official GAS API docs. `GmailApp` has no quota method. `MailApp.getRemainingDailyQuota()` is the correct and ONLY call available. QUAL-01 contains a factual error; the current code is already correct — no change needed. |
</phase_requirements>

---

## Summary

Phase 1 adds a single new workflow to an already-working GAS TypeScript app: a class-start email batch that the admin triggers from the "Enviar Correos" submenu. The feature is a direct extension of the existing `sendEmailBatch` pattern in `Correos.ts` — same quota check, same idempotency guard, same template injection — but reads from a different sheet ("Lista Final Curso" instead of "Seleccionados") and requires one new piece of data (sala de clases) that the admin enters via a multi-field modal dialog.

The critical technical finding for this phase is about QUAL-01: the requirement as written asks to replace `MailApp.getRemainingDailyQuota()` with `GmailApp.getRemainingDailyQuota()`. This is impossible — `GmailApp` exposes no quota method whatsoever, confirmed in both the installed type definitions and the official GAS API reference. The existing `MailApp.getRemainingDailyQuota()` call in `Correos.ts` line 91 is correct and must not be changed. The planner should mark QUAL-01 as "verified current behavior is correct" rather than scheduling a replacement.

The implementation requires: one new TypeScript file (`InicioClases.ts`), one new HTML email template (`CorreoInicioClases.html`), one new HTML dialog (`DialogSalas.html`), a one-line addition to `CONFIG.COLUMNS` for the idempotency column, a `sala?: string` field added to `IProgramData.HORARIOS` interface, and two lines added to `Menu.ts` (one `addItem` in `onOpen()` and one wrapper function). No new GAS APIs, no new npm dependencies, no schema migrations.

**Primary recommendation:** Build `InicioClases.ts` as a peer module to `Correos.ts` following the same patterns. The dialog collects sala per level, calls `guardarSalasYIniciarEnvio()` server-side which stores sala in `PROGRAM_DATA.HORARIOS[nivel].sala` (in-memory), shows a confirmation preview, then calls `enviarCorreosInicioClases()` which iterates Lista Final, renders the template, sends via `GmailApp.sendEmail`, writes the sala to the row, and stamps the notification date.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.7.3 | Source language | Project standard; already in use |
| @types/google-apps-script | 1.0.98 | GAS type definitions | Already installed; all GAS types resolved from here |
| GmailApp (GAS native) | V8 runtime | Sending HTML emails | Already used for all 5 existing email categories in `Correos.ts` |
| HtmlService (GAS native) | V8 runtime | Template rendering + modal dialogs | Already used for `createTemplateFromFile` and `showModalDialog` |
| SpreadsheetApp (GAS native) | V8 runtime | Reading Lista Final, writing sala + notification columns | Already used throughout |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MailApp (GAS native) | V8 runtime | Quota check ONLY (`getRemainingDailyQuota()`) | Pre-send check; this is the ONLY GAS API that exposes a daily quota method |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HtmlService modal for sala input | `SpreadsheetApp.getUi().prompt()` chained 4 times | Modal is better UX: all levels visible at once, admin can review/correct before submitting |
| In-memory `PROGRAM_DATA.HORARIOS[nivel].sala` | PropertiesService persistence | In-memory is correct scope — sala is transient, entered fresh each send to prevent stale data |

**Installation:** No new packages needed. All required APIs are GAS native.

---

## Architecture Patterns

### Recommended Project Structure Addition

```
src/
├── Config.ts          # Add sala?: string to IProgramData.HORARIOS; add INICIO_NOTIFICATION_DATE + SALA to CONFIG.COLUMNS
├── InicioClases.ts    # New module: sala storage, preview, and send logic
├── Menu.ts            # Add "Inicio de Clases" item to "Enviar Correos" submenu + wrapper function
├── CorreoInicioClases.html  # New email template
├── DialogSalas.html   # New sala-input modal dialog
└── [existing files unchanged]
```

### Pattern 1: Two-Step Dialog Flow (Collect → Confirm → Send)

**What:** The modal dialog (`DialogSalas.html`) has two phases. First submit calls `guardarSalasYObtenerPreview()` via `google.script.run`, receives back a summary string of `{nivel: sala, horario}`, renders it in the dialog for admin review. Second submit (after review) calls `enviarCorreosInicioClases()` via `google.script.run`.

**When to use:** Any workflow that collects user input AND must show a confirmation before a non-reversible batch action.

**Example:**
```typescript
// In InicioClases.ts (server-side)
// Source: pattern from SidebarConfig.html + Correos.ts
function guardarSalasYObtenerPreview(salas: Record<string, string>): string {
  // Validate: reject empty sala for any level that has recipients
  const niveles = getNivelesConParticipantes();
  const missing = niveles.filter(n => !salas[n] || salas[n].trim() === "");
  if (missing.length > 0) {
    throw new Error(`Sala vacía para: ${missing.join(", ")}`);
  }

  // Store in-memory (transient)
  Object.entries(salas).forEach(([nivel, sala]) => {
    if (PROGRAM_DATA.HORARIOS[nivel]) {
      (PROGRAM_DATA.HORARIOS[nivel] as any).sala = sala.trim();
    }
  });

  // Return preview for admin confirmation
  const participantes = getRecipientsInicioClases();
  return `Se enviarán ${participantes.length} correos.\n\n` +
    niveles.map(n => `${n}: Sala "${salas[n]}" · ${PROGRAM_DATA.HORARIOS[n].catedra}`).join("\n");
}
```

### Pattern 2: Reading Lista Final with Category-Row Filtering

**What:** "Lista Final Curso" contains category header rows (`CATEGORÍA: B1+`) and student rows. The send function must skip header rows and `PRUEBA DE NIVEL` rows. This requires checking each row's "Nivel" column for the CATEGORÍA prefix or PRUEBA DE NIVEL value.

**When to use:** Any function reading from Lista Final in student-iteration mode.

**Example:**
```typescript
// In InicioClases.ts
// Source: ListaFinal.ts structure analysis
function getRecipientsInicioClases(): IInicioClasesRecipient[] {
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) throw new Error(`Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`);

  const datos = hoja.getDataRange().getValues();
  const headers = datos.shift()!;
  // Expected headers: ["Apellido(s)", "Nombre(s)", "Correo", "Nivel", "Pagó (Sí/No)"]
  const idxApellido = headers.indexOf("Apellido(s)");
  const idxNombre   = headers.indexOf("Nombre(s)");
  const idxCorreo   = headers.indexOf("Correo");
  const idxNivel    = headers.indexOf("Nivel");
  const idxNotif    = headers.indexOf(CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);

  return datos
    .map((row, i) => ({ row, rowNum: i + 2 })) // 1-indexed + header
    .filter(({ row }) => {
      const nivel = String(row[idxNivel]).trim();
      if (!nivel || nivel.startsWith("CATEGORÍA:")) return false;
      if (nivel === "PRUEBA DE NIVEL") return false;
      if (row[idxNotif] && row[idxNotif] !== "") return false; // idempotency
      return true;
    })
    .map(({ row, rowNum }) => ({
      rowNum,
      apellido: String(row[idxApellido]),
      nombre:   String(row[idxNombre]),
      email:    String(row[idxCorreo]),
      nivel:    String(row[idxNivel]).trim(),
    }));
}
```

### Pattern 3: Idempotency + Sala Write — Same Row, Two Columns

**What:** After a successful send, write two values to the same row: the sala used (new column "Sala") and the notification timestamp (new column "Notificado Inicio"). Both writes happen in the same try-block as the send, so a failed send does not stamp either column.

**When to use:** Every row-level notification in this codebase.

**Example:**
```typescript
// In InicioClases.ts (inside the per-recipient loop)
// Source: Correos.ts sendEmailBatch idempotency pattern
GmailApp.sendEmail(r.email, subject, "", { htmlBody: finishedHtml });

// Only write after successful send
if (idxNotif !== -1) {
  hoja.getRange(r.rowNum, idxNotif + 1).setValue(new Date());
}
if (idxSala !== -1) {
  hoja.getRange(r.rowNum, idxSala + 1).setValue(sala);
}
count++;
```

### Pattern 4: Template Variable Contract via Typed Interface

**What:** Define an interface for the template variables, then assign via explicit typed object rather than `(htmlBody as any).field = value` for each field separately. Prevents silent `undefined` renders.

**When to use:** All new templates in this project.

**Example:**
```typescript
// In InicioClases.ts
interface ICorreoInicioClasesVars {
  nombre: string;
  nivel: string;
  catedra: string;
  ayudantia: string;
  sala: string;
  fechaInicio: string;
  fechaTermino: string;
}

function renderCorreoInicioClases(vars: ICorreoInicioClasesVars): string {
  const tpl = HtmlService.createTemplateFromFile('CorreoInicioClases');
  (tpl as any).nombre      = vars.nombre;
  (tpl as any).nivel       = vars.nivel;
  (tpl as any).catedra     = vars.catedra;
  (tpl as any).ayudantia   = vars.ayudantia;
  (tpl as any).sala        = vars.sala;
  (tpl as any).fechaInicio = vars.fechaInicio;
  (tpl as any).fechaTermino = vars.fechaTermino;
  return tpl.evaluate().getContent();
}
```

### Anti-Patterns to Avoid

- **Reading from Seleccionados for class-start emails:** Seleccionados contains unconfirmed applicants. Lista Final Curso is the authoritative confirmed roster. Never bypass it.
- **Chained `ui.prompt()` per level:** Four sequential modal interruptions for four levels. Use a single `DialogSalas.html` modal with one form field per level.
- **Storing sala in CONFIG or PropertiesService permanently:** Sala is transient (changes each semester). Store only in-memory via `PROGRAM_DATA.HORARIOS[nivel].sala`. Clear risk: stale sala from a previous semester causing wrong emails.
- **Replacing `MailApp.getRemainingDailyQuota()` with `GmailApp.getRemainingDailyQuota()`:** The latter method does not exist. The current code is already correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML email with per-student data | Custom string concatenation | `HtmlService.createTemplateFromFile()` | Already the project standard; GAS scriptlet syntax handles HTML escaping |
| Dialog that collects multi-field input | `ui.prompt()` chained per level | `HtmlService.createHtmlOutputFromFile()` + `showModalDialog()` | Project already uses this pattern for `DialogConfirmEval` |
| Idempotency guard for email sends | Custom flag/token scheme | Timestamp column in spreadsheet | Exact pattern in `sendEmailBatch` — zero learning curve |
| Quota check | Manual counter tracking | `MailApp.getRemainingDailyQuota()` | The only GAS-native method; one-liner |

**Key insight:** Every new component in this phase has a direct analog in the existing codebase. The implementation is extension, not invention.

---

## Common Pitfalls

### Pitfall 1: QUAL-01 as Written Is Impossible

**What goes wrong:** If the planner schedules a task to "replace `MailApp.getRemainingDailyQuota()` with `GmailApp.getRemainingDailyQuota()`", the code will fail TypeScript compilation. `GmailApp` has no such method — confirmed in `@types/google-apps-script` 1.0.98 (no `getRemainingDailyQuota` in `google-apps-script.gmail.d.ts`) and in the official GAS API reference.

**Why it happens:** The requirement was written based on an incorrect assumption about GmailApp's API surface.

**How to avoid:** Mark QUAL-01 as "verified — current `MailApp.getRemainingDailyQuota()` is the correct implementation; no code change required."

**Warning signs:** TypeScript compiler error `Property 'getRemainingDailyQuota' does not exist on type 'typeof GmailApp'`.

---

### Pitfall 2: Empty Sala Renders Silently in Email Template

**What goes wrong:** If admin leaves a sala field blank and presses Submit, the email template renders "Sala: " with an empty value. GAS does not throw; no visible error.

**Why it happens:** `HtmlService` template scriptlets render `undefined` and empty string silently.

**How to avoid:** In `guardarSalasYObtenerPreview()`, validate that sala is non-empty for every nivel that has at least one recipient. Throw with a specific message listing which levels are missing. In the email template, add a fallback: `<?= sala || '[SALA NO INGRESADA]' ?>`.

**Warning signs:** Preview dialog shows sala field as blank; test send renders empty sala.

---

### Pitfall 3: New "Notificado Inicio" Column Not Present After Lista Final Regeneration

**What goes wrong:** `generarListaFinalCurso()` calls `hojaF.clear()` and rewrites the entire sheet. If it runs again after class-start emails have been sent, the "Notificado Inicio" and "Sala" columns are erased, and the idempotency guard is gone.

**Why it happens:** `generarListaFinalCurso()` rewrites all data from scratch. The class-start email feature adds new columns that `generarListaFinalCurso()` does not know about.

**How to avoid:** The "Notificado Inicio" and "Sala" columns must be added to `generarListaFinalCurso()` as part of the HEADER row and initialized empty. Do NOT rely on the columns appearing only after the first send. Add them to the Lista Final schema from day one. `INICIO-05` (write sala to column) is satisfied by updating this row during the send loop.

**Warning signs:** Running "Generar Lista Final" after sending class-start emails produces a sheet without "Notificado Inicio" column; re-running class-start email then tries to send to already-notified students.

---

### Pitfall 4: `DialogSalas.html` Only Deployed in `src/`, Not in `PUCV2English/`

**What goes wrong:** The build pipeline (`npm run build`) compiles TypeScript to `PUCV2English/PUCV2.js`, but HTML templates must be manually copied to the GAS editor. The deployment workflow docs must list `CorreoInicioClases.html` and `DialogSalas.html` alongside existing templates.

**Why it happens:** The copy-paste deployment workflow is entirely manual for HTML files. There is no automated sync.

**How to avoid:** Document in the task that both HTML files must be created in the GAS editor as separate HTML files (same filename as the `createTemplateFromFile` / `createHtmlOutputFromFile` argument). Add a comment in `Menu.ts` listing all required HTML files.

**Warning signs:** `HtmlService.createTemplateFromFile('CorreoInicioClases')` throws "Unable to find item: CorreoInicioClases" — silent catch in `sendEmailBatch` means 0 emails sent with no clear error.

---

### Pitfall 5: Stale Sala Data on Batch Retry

**What goes wrong:** If the admin runs the class-start batch, it partially fails at recipient N, and then re-runs. On the second run, `PROGRAM_DATA.HORARIOS[nivel].sala` is unset (new GAS execution, fresh global scope). The dialog must be shown again to collect sala before retrying.

**Why it happens:** GAS global variables reset between executions. In-memory `PROGRAM_DATA` changes do not persist.

**How to avoid:** The dialog is always shown before sending — that is the design. The idempotency guard ensures already-notified students are skipped. The admin re-enters sala for the retry. This is acceptable given the class-start batch is small (~25 students) and failures are rare.

**Warning signs:** Admin calls `enviarCorreosInicioClases()` directly (bypassing dialog); `sala` is `undefined` for all students.

---

## Code Examples

### CONFIG.COLUMNS additions

```typescript
// Source: src/Config.ts — extend COLUMNS object
COLUMNS: {
  // ... existing entries ...
  NOTIFICATION_DATE: "Fecha Notificación",           // existing
  INICIO_NOTIFICATION_DATE: "Notificado Inicio",     // NEW — idempotency for class-start emails
  SALA: "Sala"                                        // NEW — sala written to Lista Final after send
}
```

### IProgramData.HORARIOS interface update

```typescript
// Source: src/Config.ts IProgramData interface
interface IProgramData {
  FECHA_LIMITE: string;
  FECHA_INICIO: string;
  FECHA_TERMINO: string;
  HORARIOS: Record<string, { catedra: string; ayudantia: string; sala?: string }>;
  //                                                              ^^^^^^^^^^^^
  //                                          sala is optional — set at runtime from dialog
}
```

### Lista Final header update in generarListaFinalCurso()

```typescript
// Source: src/ListaFinal.ts — extend HEADER constant
const HEADER = ["Apellido(s)", "Nombre(s)", "Correo", "Nivel", "Pagó (Sí/No)", "Sala", "Notificado Inicio"];
//                                                                               ^^^^^^  ^^^^^^^^^^^^^^^^^
//                                                              New columns: always present, initially empty
```

### Menu additions

```typescript
// Source: src/Menu.ts — extend "Enviar Correos" submenu in onOpen()
.addSubMenu(ui.createMenu('📧 Enviar Correos')
  // ... existing items ...
  .addSeparator()
  .addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases'))  // NEW

// New wrapper function in Menu.ts:
function abrirDialogoInicioClases(): void {
  const html = HtmlService.createHtmlOutputFromFile('DialogSalas')
    .setWidth(480)
    .setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Configurar Salas — Inicio de Clases');
}
```

### CorreoInicioClases.html template variables contract

```html
<!-- Variables injected by renderCorreoInicioClases() in InicioClases.ts -->
<!-- nombre, nivel, catedra, ayudantia, sala, fechaInicio, fechaTermino -->
<?= nombre ?>
<?= nivel ?>
<?= catedra ?>
<?= ayudantia ?>
<?= sala || '[SALA NO INGRESADA]' ?>
<?= fechaInicio ?>
<?= fechaTermino ?>
```

### Quota check (existing, already correct — DO NOT CHANGE)

```typescript
// Source: src/Correos.ts line 91 — this is already correct, QUAL-01 notwithstanding
const quota = MailApp.getRemainingDailyQuota();
if (quota < recipients.length) {
  return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y quieres enviar ${recipients.length}.`;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ui.prompt()` per-field dialog | `HtmlService.createHtmlOutputFromFile()` multi-field modal | Already done in this codebase (DialogConfirmEval) | Better UX, all fields visible at once |
| `SpreadsheetApp.getAs(MimeType.PDF)` (whole spreadsheet) | `DocumentApp.create()` + `getAs()` (Phase 2 only) | Phase 2 scope | Not relevant to Phase 1 |

**Deprecated/outdated for this phase:**
- None. All patterns are current.

---

## Open Questions

1. **QUAL-01 disposition**
   - What we know: `GmailApp.getRemainingDailyQuota()` does not exist in the GAS API. `MailApp.getRemainingDailyQuota()` is the correct method and is already in use.
   - What's unclear: Whether QUAL-01 should be closed as "no change needed" or rewritten to say "verify MailApp quota check is present in all batch send functions".
   - Recommendation: Planner should mark QUAL-01 as "resolved — current code is correct; add `MailApp.getRemainingDailyQuota()` check to new `enviarCorreosInicioClases()` function to match existing pattern."

2. **"Notificado Inicio" column in Lista Final schema**
   - What we know: `generarListaFinalCurso()` currently writes a 5-column header. It must be extended to 7 columns (add "Sala" and "Notificado Inicio") to avoid the regeneration pitfall.
   - What's unclear: Whether updating `generarListaFinalCurso()` is in Phase 1 scope or Phase 2.
   - Recommendation: It MUST be Phase 1. INICIO-05 (write sala to column) and INICIO-06 (idempotency) both depend on these columns existing. Include a task to update `generarListaFinalCurso()` HEADER and column write logic.

3. **Levels present at send time**
   - What we know: `PROGRAM_DATA.HORARIOS` has four fixed levels: "B1+", "B2.1", "B2.2", "C1". The dialog should dynamically show only levels that have at least one recipient in Lista Final (to avoid admin entering sala for an empty level).
   - What's unclear: Whether this dynamic behavior is in scope for v1 or if static four-field form is sufficient.
   - Recommendation: Dynamic (read from sheet at dialog open) is safer and not materially more complex. Use `google.script.run` to call a `getNivelesActivos()` function that returns the list of unique levels present in Lista Final, then render dialog fields only for those levels.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — GAS project has no local test runner |
| Config file | None — testing is done in GAS editor via named test functions |
| Quick run command | Manual: run named test function in GAS Executions panel |
| Full suite command | Manual: run all `test*()` functions in GAS editor |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INICIO-01 | Dialog opens with one input per active level | manual-only | Run `testAbrirDialogoInicioClases()` in GAS editor | ❌ Wave 0 |
| INICIO-02 | Dialog shows nivel→sala confirmation before sending | manual-only | Run `testGuardarSalasYObtenerPreview()` in GAS editor | ❌ Wave 0 |
| INICIO-03 | Sends emails to all confirmed students in Lista Final | manual-only | Run `testEnviarCorreosInicioClases_dryRun()` in GAS editor | ❌ Wave 0 |
| INICIO-04 | Email contains nombre, nivel, horario, sala, dates | manual-only | Run `testRenderCorreoInicioClases()` — check output HTML | ❌ Wave 0 |
| INICIO-05 | Sala written to "Sala" column in Lista Final | manual-only | Inspect sheet after `testEnviarCorreosInicioClases_dryRun()` | ❌ Wave 0 |
| INICIO-06 | Already-notified students skipped on re-run | manual-only | Run function twice; second run should send 0 emails | ❌ Wave 0 |
| INICIO-07 | Menu item present under "Enviar Correos" submenu | manual-only | Open sheet, verify menu structure visually | ❌ Wave 0 |
| QUAL-01 | Quota check uses correct API | code-review | TypeScript compilation — no `GmailApp.getRemainingDailyQuota` call | ✅ (current code correct) |

### Sampling Rate

- **Per task commit:** Deploy to GAS editor and run relevant `test*()` function manually
- **Per wave merge:** Run all `test*()` functions; verify Lista Final sheet state
- **Phase gate:** All manual tests pass before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `testGuardarSalasYObtenerPreview()` — covers INICIO-01, INICIO-02; call with mock sala object, verify return string
- [ ] `testGetRecipientsInicioClases()` — covers INICIO-03 data sourcing; verify category rows filtered, notificado rows skipped
- [ ] `testRenderCorreoInicioClases()` — covers INICIO-04; call with sample vars, assert output contains sala + horario
- [ ] `testEnviarCorreosInicioClases_dryRun()` — covers INICIO-03, INICIO-05, INICIO-06; add a `dryRun` param that skips actual send but writes columns

*(GAS test functions are plain TypeScript functions callable directly in the GAS editor; no framework installation required. Add to a new `src/TestInicioClases.ts` file that compiles into the bundle.)*

---

## Sources

### Primary (HIGH confidence)

- `src/Correos.ts` — `sendEmailBatch`, `getRecipients`, quota check, idempotency pattern — direct codebase read
- `src/Config.ts` — `IConfig`, `IProgramData`, `CONFIG.COLUMNS`, `PROGRAM_DATA.HORARIOS` — direct codebase read
- `src/ListaFinal.ts` — sheet structure (5-column header, CATEGORÍA rows, PRUEBA DE NIVEL rows) — direct codebase read
- `src/Menu.ts` — `onOpen()` submenu structure, `confirmarYEnviarCorreos` wrapper pattern, `showModalDialog` usage — direct codebase read
- `src/CorreoSeleccionado.html` — template variable contract (`nombre`, `nivel`, `programData`, scriptlet syntax) — direct codebase read
- `node_modules/@types/google-apps-script/google-apps-script.gmail.d.ts` v1.0.98 — confirmed: GmailApp has `sendEmail` but NO `getRemainingDailyQuota`
- `node_modules/@types/google-apps-script/google-apps-script.mail.d.ts` v1.0.98 — confirmed: `MailApp.getRemainingDailyQuota(): Integer` exists at line 40
- Official GAS API reference (https://developers.google.com/apps-script/reference/gmail/gmail-app) — confirmed: no quota method on GmailApp; `sendEmail` signatures match type definitions

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — technology stack analysis; all key claims verified against type definitions
- `.planning/research/ARCHITECTURE.md` — component architecture recommendations; patterns verified against existing codebase
- `.planning/research/PITFALLS.md` — pitfall catalog; C5 (quota confusion) verified directly

### Tertiary (LOW confidence)

- None for Phase 1 scope. All Phase 1 findings have HIGH or MEDIUM support.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified against installed type definitions and existing codebase usage
- Architecture: HIGH — all patterns traced to existing working code in the same project
- Pitfalls: HIGH (Pitfalls 1-4) — verified against type defs, official docs, and codebase analysis
- QUAL-01 finding: HIGH — `GmailApp` API surface exhaustively verified in both type definitions and official docs

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (GAS APIs are stable; @types/google-apps-script updates are infrequent)
