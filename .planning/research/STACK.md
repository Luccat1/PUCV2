# Technology Stack

**Project:** PUCV2English — class-start emails and executive PDF report
**Researched:** 2026-03-19
**Scope:** Additive features to an existing GAS TypeScript app

---

## Existing Stack (Do Not Change)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | TypeScript | 5.7.3 | Compiled to single GAS-compatible `.js` |
| Runtime | Google Apps Script V8 | — | Container-bound to Google Sheets |
| Email | GmailApp | native | Already used for all batch sends |
| Templating | HtmlService | native | `createTemplateFromFile()` already in use |
| Storage | SpreadsheetApp | native | Lista Final Curso sheet is the data source |
| Build | tsc | 5.7.3 | `src/tsconfig.json` → `dist/` |
| Type defs | @types/google-apps-script | 1.0.98 | All GAS types resolved from this package |

---

## New APIs Required

### Feature 1: Class-Start Email (individual, personalized)

**Verdict:** No new APIs needed. Extend the existing `GmailApp.sendEmail` + `HtmlService.createTemplateFromFile` pattern already proven in `Correos.ts`.

**Why this pattern is correct:**
- The codebase already uses `GmailApp.sendEmail(recipient, subject, "", { htmlBody })` successfully for five email categories.
- `HtmlService.createTemplateFromFile` with template variable injection (`htmlBody.nombre`, `htmlBody.nivel`, etc.) is the established pattern — adding `sala` and `horario` is a trivial extension.
- The new email needs per-student classroom data (`sala`), which comes from a user-entered dialog — not a new API concern, just a new variable injected into the template.

**Key method signatures (confirmed from installed @types/google-apps-script 1.0.98):**

```typescript
// Sending with HTML body
GmailApp.sendEmail(
  recipient: string,
  subject: string,
  body: string,           // plain-text fallback — pass ""
  options: GmailAdvancedOptions
): GmailApp

// GmailAdvancedOptions (relevant fields)
interface GmailAdvancedOptions {
  htmlBody?: string;                               // HTML content
  attachments?: Base.BlobSource[];                 // for PDF attachment (see Feature 2)
  name?: string;                                   // sender display name
  replyTo?: string;
  cc?: string;
  bcc?: string;
}
```

**Template variable injection (existing pattern):**

```typescript
const tpl = HtmlService.createTemplateFromFile('CorreoInicioClases');
(tpl as any).nombre = r.nombre;
(tpl as any).nivel = r.nivel;
(tpl as any).horario = r.horario;   // new field
(tpl as any).sala = sala;            // new field, entered via dialog
const html = tpl.evaluate().getContent();
GmailApp.sendEmail(r.email, subject, "", { htmlBody: html });
```

**Quota check (existing pattern to reuse):**

```typescript
// MailApp.getRemainingDailyQuota() — already used in sendEmailBatch()
// Continue using this exact call; GmailApp does not expose its own quota method
MailApp.getRemainingDailyQuota(): Integer
```

**Confidence:** HIGH — verified against installed type definitions and existing codebase usage.

---

### Feature 2: Executive PDF Report

**Verdict:** Use `Spreadsheet.getAs(MimeType.PDF)` — the simplest and most robust path for a report that is already structured as Google Sheets data.

**Why not DocumentApp:**
- DocumentApp gives programmatic control over layout (paragraphs, tables, headings) but requires creating a temporary Google Doc, writing content into it body-element by element, exporting it, then deleting the temp file. That is ~40 lines of ceremony for a tabular report.
- The report content — course names, group counts, enrolled totals — is already in Google Sheets (Lista Final Curso sheet, written by `generarListaFinalCurso()`). A sheet that already exists IS the report data.

**Why not UrlFetchApp + export URL:**
- The `https://docs.google.com/spreadsheets/d/{id}/export?format=pdf` URL approach works but requires an OAuth bearer token injected via `ScriptApp.getOAuthToken()`. This adds auth complexity and a network round-trip. `Spreadsheet.getAs()` achieves the same result natively without HTTP.

**Why Spreadsheet.getAs is correct:**

```typescript
// Confirmed in @types/google-apps-script 1.0.98:
// interface Spreadsheet { getAs(contentType: string): Base.Blob; }
// MimeType.PDF resolves to "application/pdf"

const ss: GoogleAppsScript.Spreadsheet.Spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
const pdfBlob: GoogleAppsScript.Base.Blob = ss.getAs(MimeType.PDF);
pdfBlob.setName('Informe_PUCV2English.pdf');
```

**How to send the PDF as an email attachment:**

```typescript
// GmailAdvancedOptions.attachments accepts Base.BlobSource[]
// Base.Blob implements BlobSource — confirmed in type definitions
GmailApp.sendEmail(adminEmail, subject, plainBody, {
  htmlBody: htmlBody,
  attachments: [pdfBlob]
});
```

**Limitation of Spreadsheet.getAs:** It exports the entire spreadsheet as a multi-sheet PDF. For an executive summary this is acceptable — in fact desirable — since the admin sees all tabs. If a single-sheet export is needed, a Sheet-level getAs does not exist natively; the workaround is to copy the target sheet into a temporary standalone spreadsheet, export that, then delete it. Recommend avoiding this unless the admin explicitly requires it.

**MimeType enum (confirmed from @types/google-apps-script 1.0.98):**

```typescript
// GoogleAppsScript.Base.MimeType
MimeType.PDF        // "application/pdf"
MimeType.GOOGLE_SHEETS  // for creating a temp spreadsheet if needed
```

**Confidence:** HIGH — `Spreadsheet.getAs()` and `MimeType.PDF` confirmed in installed type definitions. The attachment pattern via `GmailAdvancedOptions.attachments` confirmed in same file.

---

### Feature 3: Classroom Input Dialog

**Verdict:** Use `SpreadsheetApp.getUi().prompt()` — already used in `Menu.ts` for the test email dialog.

**Why:** No new API. The pattern is already established:

```typescript
// Existing pattern from Menu.ts (abrirDialogoCorreoPrueba)
const ui = SpreadsheetApp.getUi();
const res = ui.prompt(
  "Sala de Clases",
  "Ingresa la sala para cada nivel (ej: B1+: Sala A1, B2.1: Sala B2):",
  ui.ButtonSet.OK_CANCEL
);
if (res.getSelectedButton() === ui.Button.OK) {
  const salaInput = res.getResponseText();
  // parse sala assignments per level
}
```

For multi-level input, a modal dialog via `HtmlService.createHtmlOutputFromFile` (already used for `DialogConfirmEval.html`) is cleaner. Use that pattern for the sala input dialog so each level gets its own field.

**Confidence:** HIGH — confirmed from `Menu.ts` and `HtmlService` usage already in codebase.

---

## Scope-Confirmed: What NOT to Use

| Option | Why Not |
|--------|---------|
| DocumentApp (Google Docs) | More complex than needed. Requires temp file lifecycle management for tabular data already in Sheets. |
| UrlFetchApp + export URL | Extra auth ceremony (`ScriptApp.getOAuthToken()`), network round-trip, same output as native `getAs()`. |
| External PDF libraries (jsPDF, pdfmake, etc.) | Impossible — project constraint is no npm in production, no external dependencies in GAS runtime. |
| `Sheet.getAs()` (sheet-level) | Does not exist. Only `Spreadsheet.getAs()` (file-level) is in the API. |
| MailApp.sendEmail instead of GmailApp.sendEmail | MailApp is simpler but lacks `htmlBody` option. GmailApp is the correct choice for HTML emails and is already the project standard. |

---

## appsscript.json Scope Additions Required

The new features need `DriveApp` scope (implicitly required by `Spreadsheet.getAs()` which touches Drive) and `GmailApp` scope for attachment sending. Current manifest has no explicit `oauthScopes`. GAS will auto-detect these scopes from API usage. No manifest change is required unless the project moves to explicit scope declaration.

If explicit scopes are ever added:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
}
```

**Confidence:** MEDIUM — scope auto-detection is standard GAS behavior, but the exact scope string for `Spreadsheet.getAs()` triggering Drive access is based on training knowledge, not a confirmed source. Risk is low: if scope is missing GAS will prompt the user to re-authorize.

---

## Data Source for New Features

Both new features read from the "Lista Final Curso" sheet, already written by `generarListaFinalCurso()`. The report PDF is a snapshot of that sheet. The class-start emails iterate over enrolled students grouped by level.

**No new sheets needed.** The sala mapping (nivel → sala string) is captured at runtime via dialog and passed into the email send loop — it does not need to be persisted unless idempotent re-send is required (see PITFALLS.md).

---

## Summary Table

| Capability | API | Method | Confidence |
|-----------|-----|--------|------------|
| Send HTML email with per-student data | GmailApp | `sendEmail(to, subject, "", { htmlBody })` | HIGH |
| Send PDF as email attachment | GmailApp | `sendEmail(to, subject, "", { attachments: [blob] })` | HIGH |
| Generate PDF blob from spreadsheet | SpreadsheetApp | `getActiveSpreadsheet().getAs(MimeType.PDF)` | HIGH |
| Inject template variables | HtmlService | `createTemplateFromFile(name).evaluate().getContent()` | HIGH |
| Capture sala per nivel from user | SpreadsheetApp UI | `getUi().showModalDialog(html, title)` | HIGH |
| Check send quota before batch | MailApp | `getRemainingDailyQuota()` | HIGH |

---

## Sources

- `C:\Users\Usuario\Documents\code\pucv\PUCV2\node_modules\@types\google-apps-script\google-apps-script.gmail.d.ts` — GmailApp.sendEmail signatures and GmailAdvancedOptions interface (version 1.0.98)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\node_modules\@types\google-apps-script\google-apps-script.spreadsheet.d.ts` — Spreadsheet.getAs() signature (line 2275)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\node_modules\@types\google-apps-script\google-apps-script.base.d.ts` — MimeType.PDF (line 220)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\node_modules\@types\google-apps-script\google-apps-script.document.d.ts` — Document.getAs() signature (line 235, included for completeness)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\node_modules\@types\google-apps-script\google-apps-script.mail.d.ts` — MailApp.getRemainingDailyQuota() (line 40)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\src\Correos.ts` — existing sendEmailBatch pattern (authoritative codebase reference)
- `C:\Users\Usuario\Documents\code\pucv\PUCV2\src\Menu.ts` — existing dialog pattern (authoritative codebase reference)

---

*Research date: 2026-03-19 | Type defs version: @types/google-apps-script 1.0.98*
