# Architecture Patterns

**Domain:** Class-start notification and PDF report generation for GAS TypeScript project
**Researched:** 2026-03-19

---

## Existing Architecture (Baseline)

The project follows a flat modular pattern inside a single GAS bundle. All modules share global scope after compilation. There is no dependency injection or import/export — modules interact by calling each other's top-level functions directly.

```
User (Sheets UI)
    ↓ menu item click
Menu.ts  ─── dialog launcher ──→ HtmlService dialog/sidebar
    ↓ calls business logic function
Business Module (Correos, ListaFinal, Evaluacion, etc.)
    ↓ reads/writes
Config.ts (CONFIG, PROGRAM_DATA globals)
    ↓
GAS APIs (SpreadsheetApp, GmailApp, DriveApp, HtmlService)
    ↓
Google Sheets tabs + Gmail + Google Drive
```

Key constraint: **all compiled modules land in a single JS file**. There is no module system at runtime. Every function is globally visible after bundle.

---

## Recommended Architecture for New Features

### Component Overview

The two new features map naturally to two new source files plus supporting HTML files:

| New Component | File | Responsibility |
|---------------|------|----------------|
| InicioClases | `src/InicioClases.ts` | Build per-student class-start email with room per level; send batch |
| InformeEjecutivo | `src/InformeEjecutivo.ts` | Aggregate Lista Final data; generate PDF via Google Docs; save to Drive |
| Menu additions | `src/Menu.ts` (extend) | Add menu items pointing to new functions |
| Config additions | `src/Config.ts` (extend) | Add `sala` field to `IProgramData.HORARIOS`; add sheet/column keys if needed |
| Email template | `PUCV2English/CorreoInicioClases.html` | HTML template for class-start email |
| Dialog HTML | `PUCV2English/DialogSalas.html` | Per-level room entry dialog (HtmlService modal) |

### Component Boundaries

| Component | What It Owns | What It Calls | What Calls It |
|-----------|-------------|---------------|---------------|
| `InicioClases.ts` | Class-start email logic, recipient filtering from Lista Final | `CONFIG`, `PROGRAM_DATA`, `GmailApp`, `HtmlService` | `Menu.ts` wrappers |
| `InformeEjecutivo.ts` | PDF aggregation and generation | `CONFIG`, `SpreadsheetApp`, `DriveApp`, `DocumentApp` | `Menu.ts` wrappers |
| `Menu.ts` (new items) | UI wiring only — no logic | `InicioClases.ts` functions, `InformeEjecutivo.ts` functions | GAS `onOpen()` trigger |
| `Config.ts` (additions) | `HORARIOS` shape extended with `sala` | Nothing new | Everything reads it |
| `DialogSalas.html` | Room collection form UI | `google.script.run` to write back to `PROGRAM_DATA` | `Menu.ts` dialog launcher |
| `CorreoInicioClases.html` | Class-start email template | Template variables injected by `InicioClases.ts` | `InicioClases.ts` |

---

## Data Flow

### Class-Start Email Flow

```
Admin clicks menu item "Enviar Correos Inicio de Clases"
    ↓
Menu.ts: abrirDialogoSalas()
    → HtmlService.createHtmlOutputFromFile('DialogSalas')
    → showModalDialog()

Admin fills classroom per level in DialogSalas.html
    ↓
google.script.run.guardarSalasYConfirmar(salasObj)
    → InicioClases.ts: guardarSalas(salasObj)
    → Updates PROGRAM_DATA.HORARIOS[nivel].sala for each level

Admin confirms send in same dialog (or a second confirmation prompt)
    ↓
InicioClases.ts: enviarCorreosInicioClases()
    → Reads "Lista Final Curso" sheet (CONFIG.SHEETS.FINAL_LIST)
    → Filters rows: skip category headers, skip PRUEBA DE NIVEL rows, skip already-notified
    → For each student: look up nivel → get horario + sala from PROGRAM_DATA.HORARIOS
    → HtmlService.createTemplateFromFile('CorreoInicioClases')
    → GmailApp.sendEmail(email, subject, "", { htmlBody })
    → Marks row with notification timestamp (new column "Notificado Inicio" in Lista Final)

Returns result string → Menu.ts shows ui.alert()
```

### PDF Executive Report Flow

```
Admin clicks menu item "Generar Informe Ejecutivo PDF"
    ↓
Menu.ts: ejecutarGenerarInformeEjecutivo()
    ↓
InformeEjecutivo.ts: generarInformeEjecutivoPDF()
    → Reads "Lista Final Curso" sheet
    → Aggregates: count per level, total enrolled, summary statistics
    → DocumentApp.create("Informe Ejecutivo PUCV2English [date]")
    → Builds document body: title, date, summary table (level | count | schedule | room)
    → doc.getAs('application/pdf') → Blob
    → DriveApp.createFile(pdfBlob) in root Drive folder (or specific folder)
    → Returns Drive file URL

Menu.ts: ui.alert() shows URL or opens browser tab with PDF
```

---

## Patterns to Follow

### Pattern 1: Menu Wrapper — Logic Separation

All existing menu items follow the same structure: the menu item points to a thin wrapper in `Menu.ts` that calls the business logic module. Never call business functions directly from menu items.

```typescript
// In Menu.ts
function abrirDialogoInicioClases(): void {
  const html = HtmlService.createHtmlOutputFromFile('DialogSalas')
    .setWidth(500)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Configurar Salas e Inicio de Clases');
}

function ejecutarGenerarInformeEjecutivo(): void {
  const result = generarInformeEjecutivoPDF();
  SpreadsheetApp.getUi().alert('Informe Generado', result, SpreadsheetApp.getUi().ButtonSet.OK);
}
```

**Why:** Keeps business logic testable in GAS editor independently of UI triggers.

### Pattern 2: Dialog Data Collection via google.script.run

The existing pattern for sidebars (SidebarConfig, SidebarRevision) uses `google.script.run` to call server-side functions from HTML. The room dialog uses the same pattern.

```javascript
// In DialogSalas.html (client-side script block)
function onSubmit() {
  const salas = {
    'B1+': document.getElementById('sala-b1').value,
    'B2.1': document.getElementById('sala-b21').value,
    'B2.2': document.getElementById('sala-b22').value,
    'C1':   document.getElementById('sala-c1').value
  };
  google.script.run
    .withSuccessHandler(onSalasGuardadas)
    .withFailureHandler(onError)
    .guardarSalasYConfirmar(salas);
}
```

```typescript
// In InicioClases.ts (server-side)
function guardarSalasYConfirmar(salas: Record<string, string>): string {
  Object.entries(salas).forEach(([nivel, sala]) => {
    if (PROGRAM_DATA.HORARIOS[nivel]) {
      (PROGRAM_DATA.HORARIOS[nivel] as any).sala = sala;
    }
  });
  return previewCorreosInicioClases();
}
```

**Why:** Follows the established HtmlService + google.script.run contract already used in SidebarConfig.

### Pattern 3: Idempotency via Notification Column

The existing `sendEmailBatch()` skips recipients where `Fecha Notificación` is already set. The same pattern applies to class-start emails. Add a `"Notificado Inicio"` column to `Lista Final Curso`, and `enviarCorreosInicioClases()` checks it before sending.

**Why:** Prevents duplicate sends if admin runs the function twice. Matches the existing idempotency mechanism exactly.

### Pattern 4: PDF via DocumentApp → getAs PDF

GAS has no native PDF renderer. The correct approach is:

1. `DocumentApp.create(name)` — creates a Google Doc in Drive
2. Populate with formatted content using the Docs API
3. `doc.getAs(MimeType.PDF)` — exports as PDF blob
4. `DriveApp.createFile(blob)` — saves PDF to Drive
5. Optionally delete the temporary Doc after PDF is created

This is HIGH confidence — it is the standard GAS PDF pattern documented in official GAS references. No external libraries required.

```typescript
function generarInformeEjecutivoPDF(): string {
  const grupos = agregarDatosListaFinal();
  const doc = DocumentApp.create(`Informe Ejecutivo PUCV2English ${new Date().toLocaleDateString()}`);
  const body = doc.getBody();
  // ... populate body with tables and paragraphs
  doc.saveAndClose();
  const pdf = doc.getAs(MimeType.PDF);
  const file = DriveApp.createFile(pdf);
  doc.getFile().setTrashed(true); // clean up temp Doc
  return `Informe generado: ${file.getUrl()}`;
}
```

### Pattern 5: Config Extension for Room Data

`PROGRAM_DATA.HORARIOS` already holds `catedra` and `ayudantia` per level. The `sala` field is added to the same record shape. This keeps room data co-located with schedule data.

```typescript
// Extend IProgramData interface in Config.ts
interface IProgramData {
  // ... existing fields
  HORARIOS: Record<string, { catedra: string; ayudantia: string; sala?: string }>;
}
```

`sala` is optional (`?`) because it is entered at runtime, not statically configured. The email template renders a placeholder if sala is empty.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Reading from Seleccionados for Class-Start Emails

**What:** Sourcing class-start email recipients from the "Seleccionados" sheet instead of "Lista Final Curso".

**Why bad:** Seleccionados contains applicants who have not yet confirmed (status Pendiente, Rechaza). Lista Final Curso is the authoritative post-confirmation roster. Using Seleccionados would send class-start emails to rejected candidates.

**Instead:** `enviarCorreosInicioClases()` reads exclusively from `CONFIG.SHEETS.FINAL_LIST`. The filter inside `generarListaFinalCurso()` already guarantees only confirmed students appear there.

### Anti-Pattern 2: Collecting Room Data via ui.prompt() Chained Calls

**What:** Using `SpreadsheetApp.getUi().prompt()` once per level (four sequential modal prompts) to collect room data.

**Why bad:** Disruptive UX — four interrupting prompts before anything sends. User cannot review or correct previous entries. Follows the pattern of `abrirDialogoCorreoPrueba()` which only collects one value; multi-value collection warrants an HtmlService dialog.

**Instead:** Single `DialogSalas.html` modal collects all rooms at once in a form, then calls `google.script.run` once to persist and preview.

### Anti-Pattern 3: Generating PDF Directly from Sheets Export URL

**What:** Using `UrlFetchApp.fetch(sheetExportUrl)` with `export?format=pdf` to generate PDF from the Google Sheet.

**Why bad:** Requires the Web App to be published as "Anyone, even anonymous" to fetch without auth tokens. Authorization is fragile. The Sheet layout is not designed for report presentation. DocumentApp approach produces a cleaner, controlled layout.

**Instead:** DocumentApp creates a purpose-built document with only the relevant aggregated data.

### Anti-Pattern 4: Storing Room Data in Script Properties

**What:** Persisting `sala` values in `PropertiesService.getScriptProperties()` across sessions.

**Why bad:** PropertiesService already used for one-time tokens. Mixing token storage and configuration creates coupling. Room data changes each semester; stale values from last semester could cause incorrect emails.

**Instead:** Room data lives in `PROGRAM_DATA.HORARIOS[nivel].sala` (in-memory, set fresh each time from dialog). The admin enters rooms immediately before sending, so in-memory storage is correct scope. If persistence is needed later, the Config sheet is the right place.

---

## Component Communication Map

```
onOpen() [Menu.ts]
    └── builds menu with new items:
        ├── "Enviar Correos Inicio de Clases" → abrirDialogoInicioClases()
        └── "Generar Informe Ejecutivo PDF"   → ejecutarGenerarInformeEjecutivo()

abrirDialogoInicioClases() [Menu.ts]
    └── HtmlService → DialogSalas.html (modal)
            └── google.script.run → guardarSalasYConfirmar() [InicioClases.ts]
                    └── reads: PROGRAM_DATA.HORARIOS (Config.ts)
                    └── writes: PROGRAM_DATA.HORARIOS[nivel].sala (in-memory)
                    └── returns: preview string → dialog shows confirm button
                └── google.script.run → enviarCorreosInicioClases() [InicioClases.ts]
                        └── reads: Lista Final Curso sheet
                        └── reads: PROGRAM_DATA.HORARIOS (with sala)
                        └── renders: CorreoInicioClases.html template
                        └── sends: GmailApp.sendEmail()
                        └── writes: "Notificado Inicio" column in Lista Final

ejecutarGenerarInformeEjecutivo() [Menu.ts]
    └── calls: generarInformeEjecutivoPDF() [InformeEjecutivo.ts]
            └── reads: Lista Final Curso sheet
            └── creates: DocumentApp temporary doc
            └── exports: PDF blob via doc.getAs(MimeType.PDF)
            └── saves: DriveApp.createFile()
            └── returns: Drive file URL string
    └── ui.alert() shows URL
```

---

## Suggested Build Order

Dependencies dictate this sequence:

1. **Config.ts extension** — Add `sala?: string` to `IProgramData.HORARIOS` and add any new column key constants. Everything else depends on Config.

2. **`CorreoInicioClases.html`** — Create email template. No code dependencies; can be developed in parallel with step 1. Template receives: `nombre`, `nivel`, `horario` (object with `catedra`, `ayudantia`, `sala`), `FECHA_INICIO`, `FECHA_TERMINO`.

3. **`InicioClases.ts`** — Implement `guardarSalasYConfirmar()`, `previewCorreosInicioClases()`, `enviarCorreosInicioClases()`. Depends on Config extension (step 1) and template (step 2).

4. **`DialogSalas.html`** — Implement room entry form. Depends on `InicioClases.ts` function signatures (step 3) to know what `google.script.run` targets to call.

5. **`InformeEjecutivo.ts`** — Implement PDF generation. Depends only on Config (step 1) and Lista Final sheet structure. Can be developed in parallel with steps 3-4.

6. **`Menu.ts` additions** — Wire new menu items. Depends on functions from steps 3 and 5 being defined. This is last because it only adds launcher wrappers.

---

## Scalability Considerations

| Concern | Current Scale | Impact for New Features |
|---------|--------------|------------------------|
| Lista Final row count | ~25-50 students | Class-start batch is well within Gmail daily quota (100/day for MailApp, higher for GmailApp). No chunking needed. |
| PDF generation time | One-shot operation | DocumentApp.create() + populate + export is typically under 10 seconds for a one-page report. No timeout risk. |
| Room data persistence | In-memory per execution | Admin must re-enter rooms if they reopen the sheet. Acceptable given room data changes per semester. If persistence is desired, write sala values to the Config sheet. |
| Idempotency for class-start emails | New "Notificado Inicio" column | Same mechanism as existing Fecha Notificación; zero learning curve for maintainers. |

---

## GAS API Confidence Notes

| API | Confidence | Basis |
|-----|-----------|-------|
| `DocumentApp.create()` + `getAs(MimeType.PDF)` | HIGH | Standard GAS PDF pattern; official GAS documentation |
| `DriveApp.createFile(blob)` | HIGH | Core GAS API; unchanged for many years |
| `HtmlService` multi-input modal dialog | HIGH | Pattern in use in existing SidebarConfig.html already |
| `google.script.run` from modal dialogs | HIGH | Same pattern as all existing sidebars in project |
| `GmailApp.sendEmail()` with HtmlService template | HIGH | Already in production use in `Correos.ts` |
| `PROGRAM_DATA` in-memory mutation from server-side function | HIGH | Pattern already used by `cargarConfiguracionDesdeHoja()` |

---

## Sources

- Existing codebase: `src/Config.ts`, `src/Correos.ts`, `src/ListaFinal.ts`, `src/Menu.ts`, `src/WebApp.ts`
- Existing codebase: `.planning/codebase/ARCHITECTURE.md` (baseline layer diagram)
- Existing codebase: `.planning/codebase/INTEGRATIONS.md` (GAS API usage audit)
- Existing codebase: `.planning/codebase/CONCERNS.md` (fragile areas to respect)
- Confidence level for GAS PDF pattern: HIGH (official GAS runtime behavior; `DocumentApp.getAs(MimeType.PDF)` is the only no-library path in GAS runtime)
