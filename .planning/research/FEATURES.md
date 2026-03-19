# Feature Landscape

**Domain:** Educational program admissions management — class-start notifications and executive enrollment reporting
**Researched:** 2026-03-19
**Confidence:** HIGH (grounded in existing codebase, project spec, and GAS platform constraints)

---

## Context

This research covers two new features for the final stage of the PUCV2English admissions pipeline:

1. **Class-start notification email** — sent to all confirmed students in "Lista Final Curso", informing each person of their assigned level, schedule, and classroom.
2. **Executive enrollment PDF report** — internal administrative document summarizing final enrollment by course/level.

Both features operate after `generarListaFinalCurso()` has been run. The data source is the "Lista Final Curso" sheet, which contains: Apellido(s), Nombre(s), Correo, Nivel, Pagó (Sí/No).

The existing email system (`Correos.ts`) and template pattern (`HtmlService.createTemplateFromFile`) define the implementation contract these features must follow.

---

## Table Stakes

Features that must exist or the feature does not serve its stated purpose.

### Class-Start Notification Email

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Student name personalization | Every other email in the system uses `nombre`; nameless emails feel broken and impersonal | Low | Already the pattern in all 5 existing templates |
| Assigned level | The whole enrollment is level-based; student must know which group they are in | Low | Available in "Lista Final Curso" via `Nivel` column |
| Class schedule (catedra + ayudantia) | Student needs to know when to show up | Low | Already in `PROGRAM_DATA.HORARIOS[nivel]` |
| Classroom (sala) | Student needs to know where to show up — this is the new data point | Low-Med | Not in any existing data; must be collected via dialog at send time |
| Program start and end dates | Orients the student to the semester commitment | Low | Already in `PROGRAM_DATA.FECHA_INICIO` and `FECHA_TERMINO` |
| PUCV branding (logo, colors) | All existing emails have it; absence would look wrong | Low | Copy existing template header/footer |
| Send only to confirmed students | Sending to unconfirmed or rejected students would be an operational error | Low | Source is "Lista Final Curso", which already filters to confirmed |
| Idempotency guard (skip already-notified) | Prevents duplicate emails on re-run; pattern already used in `sendEmailBatch` | Low | Add a "Fecha Inicio Clases Notificado" column, same as `NOTIFICATION_DATE` |
| Gmail quota check before sending | Already required by all batch sends; failure to check causes partial batch | Low | Already the pattern in `sendEmailBatch` |
| Error reporting on partial failures | Admin needs to know which students were not notified | Low | Already the pattern: collect errors, return summary string |

### Executive Enrollment PDF Report

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Total enrolled count | Primary administrative metric — "how many people are in the program" | Low | Count rows in "Lista Final Curso" |
| Enrolled count per level/course | Each level is a separate class; admin needs per-class headcount | Low | Already grouped in "Lista Final Curso" by `CATEGORÍA: nivel` |
| List of students per level | Enables attendance sheets, teacher rosters | Low | Already in "Lista Final Curso"; report can reference or replicate it |
| Program dates (start, end) | Report header context | Low | `PROGRAM_DATA.FECHA_INICIO` / `FECHA_TERMINO` |
| Report generation date | Administrative traceability — "when was this snapshot taken" | Low | `new Date()` at generation time |
| PDF output to Google Drive | The format requested by spec; must be a file, not just a sheet view | Med | GAS: export via `DriveApp` + Google Sheets/Docs API or `getAs(MimeType.PDF)` |
| Triggerable from menu | Admin must be able to run it on demand | Low | Add menu item; same pattern as existing menu actions |

---

## Differentiators

Features that add value but are not required for the feature to function.

### Class-Start Notification Email

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "What to bring / how to prepare" blurb | Reduces first-day questions to admin | Low | Static text in template; useful but not necessary |
| Contact email or support link for questions | Reduces follow-up burden | Low | Static text; already implied by "Coordinación PUCV2English" sign-off |
| Dry-run / preview mode (log recipients without sending) | Allows admin to review before committing | Low | Same pattern as `previewEmailBatch`; already exists for other types |
| Test email to a single address | Admin can verify template before batch | Low | Already exists as `sendTestEmail`; just needs to support new template type |
| Per-level sala input validation (warn if empty) | Prevents sending "Sala: " with a blank value | Low | Dialog-level check before send is triggered |

### Executive Enrollment PDF Report

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Schedule per level included in report | Gives teacher/coordinator a one-page reference | Low | Data already in `PROGRAM_DATA.HORARIOS` |
| Sala per level included in report | Useful if report is generated after classroom assignment | Low | Requires sala data to be persisted somewhere; depends on class-start email feature |
| "Pagó" (paid) column summary | Finance tracking; counts who has paid | Low | Already a column in "Lista Final Curso" |
| Report saved with date-stamped filename | Makes version tracking trivial in Drive | Low | e.g. `Informe_PUCV2English_2026-03-19.pdf` |
| Drive folder targeting (save to specific folder) | Keeps admin Drive organized | Low-Med | Requires a folder ID to be configured; adds config surface |

---

## Anti-Features

Features to deliberately NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Automated classroom assignment | Spec explicitly states sala arrives via external email and cannot be automated | Collect sala via dialog at send time; treat it as manual input |
| Student-facing PDF delivery (emailing the report) | Report is internal/administrative only per spec | Save to Drive only; no email distribution |
| Re-sending logic with confirmation prompts per student | Over-engineering; idempotency guard on a column is sufficient | Use `NOTIFICATION_DATE`-style column; skip already-notified rows |
| Rich HTML report editor inside GAS | GAS has no good WYSIWYG; any UI complexity here is maintenance debt | Generate from a Google Doc or Sheet template with fixed structure |
| Separate "Informe" sheet tab that stays in the spreadsheet | PDF is meant for distribution/archiving; a live sheet is not a deliverable | Export directly to PDF via `getAs(MimeType.PDF)` and save to Drive |
| Webhook or external notification on report generation | No external services in scope; GAS cannot call arbitrary external URLs without UrlFetch | Return a Drive link as a string in the UI; let admin share manually |
| Tracking email opens or link clicks | GAS has no native open-tracking; any workaround would require external infra | Not applicable for a notification-only email |

---

## Feature Dependencies

```
generarListaFinalCurso() [existing]
  └── enviarCorreoInicioClases() [new]
        └── requires: sala per nivel (collected via dialog at trigger time)
        └── requires: PROGRAM_DATA.HORARIOS (existing)
        └── requires: PROGRAM_DATA.FECHA_INICIO / FECHA_TERMINO (existing)
        └── writes: "Fecha Inicio Clases Notificado" column (new)

generarListaFinalCurso() [existing]
  └── generarInformeEjecutivoPDF() [new]
        └── reads: "Lista Final Curso" sheet (existing)
        └── reads: PROGRAM_DATA (existing)
        └── writes: PDF file to Google Drive (new)
        └── optionally reads: sala per nivel (if classroom data is persisted)
```

```
Dialog (sala input) → enviarCorreoInicioClases()
  The dialog must fire before email sending begins.
  If the admin cancels the dialog, the send must abort cleanly.
```

---

## MVP Recommendation

Prioritize in this order:

1. **enviarCorreoInicioClases() with dialog-based sala input** — this is the primary student-facing deliverable. Must include: student name, level, schedule (catedra + ayudantia), sala, program dates, branding. Idempotency guard required.
2. **generarInformeEjecutivoPDF()** — internal tool, lower urgency. Must include: total enrollment, per-level counts, student list per level, program dates, generation date. Output as PDF to Drive.
3. **Dry-run / preview for class-start email** — low effort, high operational value for admin confidence before a bulk send.

Defer:
- Schedule and sala in PDF report: implement only if sala data is persisted from step 1. If sala is transient (only used during email send and not saved), the PDF cannot include it without a second dialog.
- Drive folder targeting for PDF: adds config surface; default to root Drive and let admin move the file.
- "Pagó" summary in PDF: depends on whether the column is actually used. Confirm with stakeholder before including.

---

## Sources

- Project spec: `.planning/PROJECT.md` (validated requirements, constraints, key decisions)
- Existing codebase: `src/Config.ts` (PROGRAM_DATA structure, column mappings, HORARIOS data)
- Existing codebase: `src/Correos.ts` (sendEmailBatch pattern, idempotency guard, quota check, error reporting)
- Existing codebase: `src/ListaFinal.ts` (data source shape, grouping by nivel)
- Existing codebase: `src/CorreoSeleccionado.html`, `src/CorreoHandPicked.html` (template variable contract)
- Integration audit: `.planning/codebase/INTEGRATIONS.md` (GmailApp, DriveApp, HtmlService usage)
- GAS platform constraint: PDF generation via `SpreadsheetApp.getActiveSpreadsheet().getAs(MimeType.PDF)` or Google Docs export — no npm, no external libs
