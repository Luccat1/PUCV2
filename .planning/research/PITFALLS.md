# Domain Pitfalls

**Domain:** Google Apps Script — PDF generation (Sheets/Docs export) + batch email notifications
**Researched:** 2026-03-19
**Confidence note:** Based on direct codebase analysis (HIGH) and GAS runtime knowledge from training (MEDIUM). WebSearch was unavailable during research; flag LOW-confidence items for validation before implementation.

---

## Critical Pitfalls

These mistakes cause feature rewrites, data loss, or silent failures in production.

---

### Pitfall C1: Temporary Docs Left in Drive After PDF Export

**What goes wrong:** The standard GAS PDF export workflow creates a temporary Google Doc or Sheet, exports it to PDF via `DriveApp`, then should delete the temp file. If the function throws mid-process (quota error, timeout, unexpected data), the cleanup step never runs. Over time, Drive accumulates orphaned temporary files with no owner record.

**Why it happens:** Try/catch is applied at the outer level, but the temp file is created before the potential failure point. Cleanup is not in a `finally`-equivalent block.

**Consequences:** Drive storage fills with phantom files; exported PDFs from future runs may reference stale temp documents if names are reused; Drive trash bloat.

**Prevention:**
```
1. Store the temp file reference BEFORE any operation that can fail.
2. Wrap the export in try/finally: always call tempFile.setTrashed(true) in the finally block.
3. Name temp files with a unique prefix (e.g., "PUCV2_temp_report_") so orphans are discoverable via DriveApp.getFilesByName() for manual cleanup.
```

**Detection warning signs:**
- Drive shows many files named with the report prefix but no corresponding download action
- Function execution logs show errors but no corresponding cleanup log entries

**Phase that must address this:** PDF generation phase (any phase adding `DriveApp.create*` calls).

---

### Pitfall C2: PDF Generation Exceeds 6-Minute Execution Timeout

**What goes wrong:** GAS has a hard 6-minute execution timeout per invocation. Generating a PDF from a Google Sheet or Doc involves: creating the file, formatting cells, invoking the export URL, saving to Drive. Each step uses GAS service calls, which are slow. On large datasets (50+ matriculados grouped by level), this chain can run close to or over the limit.

**Why it happens:** The ListaFinal sheet already does multiple `setValues`, `setFontWeight`, `setBackground` calls. Adding PDF generation on top of the same invocation multiplies service calls linearly.

**Consequences:** The function is killed mid-way; the PDF may be partially created or empty; the Sheet state is left inconsistent. No rollback occurs.

**Prevention:**
```
1. Separate PDF generation from ListaFinal generation — two distinct menu actions, not one.
2. Batch all Sheets formatting operations into a single setValues() + range batch where possible. Avoid per-cell calls.
3. Measure execution time with Date.now() at function start; if approaching 5 minutes, abort and alert user.
4. Test with realistic data size (30+ rows grouped into 4 levels) before shipping.
```

**Detection warning signs:**
- GAS Executions panel shows "Exceeded maximum execution time"
- PDF file in Drive is 0 bytes or corrupt

**Phase that must address this:** PDF generation phase.

---

### Pitfall C3: Class-Start Email Contains Stale Sala/Horario Data

**What goes wrong:** The class-start email must include sala (classroom) and horario (schedule) per level. The sala comes from a UI dialog at generation time. The horario comes from `PROGRAM_DATA.HORARIOS`, which is loaded from the "Configuración" sheet. If the admin runs the email batch, then later changes the Configuración sheet, and re-runs due to a partial failure, subsequent recipients get different sala/horario than earlier ones.

**Why it happens:** PROGRAM_DATA is loaded fresh from the sheet each execution. There is no snapshot of what data was used for the first partial send.

**Consequences:** Students in the same level receive conflicting schedule information. Some receive wrong sala. Support burden increases.

**Prevention:**
```
1. Before sending the class-start batch, write a "snapshot" of {nivel: {sala, horario}} to PropertiesService.getScriptProperties() as JSON.
2. Use the snapshot for the entire batch run, not live PROGRAM_DATA.
3. On retry, detect existing snapshot and use it. Clear snapshot only after full batch completion.
4. Show admin the sala/horario snapshot in the confirmation dialog before sending.
```

**Detection warning signs:**
- Correos.ts already has this pattern (Fecha Notificación as idempotency marker) — extend it
- If a batch runs in two separate executions, check that PROGRAM_DATA.HORARIOS matches between runs

**Phase that must address this:** Class-start email phase.

---

### Pitfall C4: Dialog Input for Sala Not Validated Before Email Send

**What goes wrong:** The sala de clases is entered via a manual UI dialog. If the admin accidentally leaves it blank, presses OK on a prompt, or enters it for only some levels, the email renders with an empty sala field. Recipients receive "Sala: " with no value and must contact the administration to correct it.

**Why it happens:** GAS `Browser.inputBox()` / `SpreadsheetApp.getUi().prompt()` returns whatever the user typed, including empty strings. The email template will render the variable as empty without complaint.

**Consequences:** Incorrect emails already sent; no recall mechanism in GAS (GmailApp has no unsend API).

**Prevention:**
```
1. After reading sala from dialog, validate: trim whitespace, reject empty string.
2. Show a confirmation dialog displaying the full {nivel: sala, horario} mapping before sending any email.
3. If sala is missing for any level that has recipients, abort with a specific error message listing which levels are missing sala.
4. In the email template, add a visible placeholder like "[SALA NO INGRESADA]" using a conditional — this surfaces template variable failures visually.
```

**Detection warning signs:**
- Template renders with an empty `{{sala}}` slot — no GAS error is thrown
- Test email (sendTestEmail) does not include sala validation

**Phase that must address this:** Class-start email phase.

---

### Pitfall C5: GmailApp vs MailApp Quota Confusion Causes Silent Send Failures

> **⚠️ QUAL-01 CORRECTION (Phase 1 Research):** The original version of this pitfall recommended replacing `MailApp.getRemainingDailyQuota()` with `GmailApp.getRemainingDailyQuota()`. This recommendation is **incorrect**. `GmailApp` exposes no quota method whatsoever — verified against `@types/google-apps-script` 1.0.98 and the official GAS API reference. `MailApp.getRemainingDailyQuota()` is the **only** valid quota API in Google Apps Script. The existing code is already correct and must not be changed.

**What goes wrong:** A developer reading INTEGRATIONS.md's note ("MailApp - legacy, superseded by GmailApp") may attempt to replace the `MailApp` quota check with a `GmailApp` equivalent. There is no such equivalent — the call will fail at runtime with a `TypeError`.

**Why it happens:** The note in INTEGRATIONS.md describes the *send* API (where `GmailApp.sendEmail()` is preferred over `MailApp.sendEmail()`), not the quota-check API. These are independent method surfaces. Only `MailApp` exposes `getRemainingDailyQuota()`.

**Consequences:** Replacing the quota check causes a hard runtime crash before any email is sent, bringing the entire batch to a halt with no partial delivery.

**Prevention:**
```
1. Keep MailApp.getRemainingDailyQuota() as-is — it is the correct and only GAS quota API.
2. Do NOT attempt to call GmailApp.getRemainingDailyQuota() — this method does not exist.
3. Track successful send count within the batch and compare against the pre-check result.
4. The existing "Fecha Notificación" idempotency pattern is the right mitigation for mid-batch failures.
```

**Detection warning signs:**
- Any call to `GmailApp.getRemainingDailyQuota()` in the codebase is a bug — grep for it in CI
- Batch fails on the very first send with a `TypeError` (not a quota error)

**Phase that must address this:** Resolved. QUAL-01 closed in Phase 1 — current `MailApp.getRemainingDailyQuota()` verified correct; no code change required.

---

### Pitfall C6: PDF Export URL Approach Requires Drive File Permission to Be Accessible

**What goes wrong:** One common GAS PDF technique uses `UrlFetchApp.fetch(exportUrl)` with an export URL constructed from a Google Sheets or Docs file ID. This requires the file to be accessible by the executing user. If the script runs as USER_DEPLOYING and the spreadsheet is in a shared drive or has restricted permissions, the fetch fails with a 403.

**Why it happens:** The `appsscript.json` sets `executeAs: USER_DEPLOYING`. The container-bound script executes as the deploying user. If that user's Drive access is restricted by org policy, export URLs fail.

**Prevention:**
```
1. Prefer DriveApp.getFileById(id).getBlob() over UrlFetchApp export URL when possible — it respects the same auth context without an extra HTTP round-trip.
2. Test on the exact Google account that will run in production (not a dev account with wider permissions).
3. Alternatively, use Sheets.spreadsheets.export() via the Sheets Advanced Service if available in the GAS project's appsscript.json.
```

**Detection warning signs:**
- 403 errors in execution logs when fetching export URL
- Works in dev account, fails in production account

**Phase that must address this:** PDF generation phase.

---

## Moderate Pitfalls

These cause incorrect behavior or maintenance difficulty, but not full feature failure.

---

### Pitfall M1: PDF Column Layout Breaks When ListaFinal Sheet is Formatted Post-Generation

**What goes wrong:** The PDF is a snapshot of the ListaFinal sheet. If the sheet is formatted after `generarListaFinalCurso()` runs (e.g., admin manually resizes columns, adds a comment, or applies conditional formatting), the PDF captures the modified state. Two runs of "generate PDF" on the same ListaFinal produce different visual outputs.

**Prevention:** Generate the PDF immediately after `generarListaFinalCurso()` in a single controlled flow, or document clearly that manual sheet edits before PDF export will affect output. Set column widths programmatically in the generation function so the layout is deterministic.

---

### Pitfall M2: Class-Start Email Template Adds a New Template File That onOpen() Does Not Validate

**What goes wrong:** The existing bug in CONCERNS.md documents that email sending fails silently if template files are missing or misnamed (Correos.ts lines 106-119). The new class-start email will require a new template file (e.g., `CorreoInicioClases.html`). If this file is missing after a fresh GAS deployment (copy-paste workflow), the batch silently fails.

**Why it happens:** The manual deployment workflow (copy-paste JS only) does not include HTML template files. Each HTML template must be created separately as a new file in the GAS editor.

**Consequences:** Admin runs the class-start email batch, sees 0 emails sent, no clear error.

**Prevention:**
```
1. Add the new template name to a validation list checked in onOpen() (or a dedicated validateTemplates() function).
2. The deployment documentation (or a comment in Menu.ts) must list ALL required HTML files including the new template.
3. Consider a self-test function "verificarConfiguracion()" callable from the menu that checks all templates exist and all required columns are present.
```

---

### Pitfall M3: Sala Dialog Runs Inside a Function That Also Triggers Email Send

**What goes wrong:** GAS UI methods (`getUi().prompt()`) can only be called from a function triggered by a user action (menu item, button), not from a time-based trigger or programmatic call. If the "generate class-start email" function is later hooked to a time trigger for automation, the dialog call throws `Exception: Cannot call getUi() from this context`.

**Prevention:** Keep the UI input (sala dialog) and the email-sending logic as separate functions. The menu action calls the dialog, collects input, then calls the pure email-sending function passing sala as a parameter. The email-sending function has no UI calls and can be safely called from any context.

---

### Pitfall M4: `(htmlBody as any)` Pattern Doesn't Fail Fast for Missing Template Variables

**What goes wrong:** The existing pattern in Correos.ts uses `(htmlBody as any).nombre = r.nombre` to inject template variables. If the class-start email template references a variable like `<?= sala ?>` but the calling code does not set `htmlBody.sala`, the template silently renders the variable as `undefined` (or blank) — no TypeScript error, no runtime throw.

**Prevention:**
```
1. Define a TypeScript interface for each template's required variables.
2. Create a typed wrapper function: setTemplateVars(template: HtmlTemplate, vars: ICorreoInicioClasesVars) that assigns all variables explicitly, catching undefined at compile time via strict TypeScript.
3. The existing CONCERNS.md already identifies this as a fragile area (Correos.ts template rendering section).
```

---

### Pitfall M5: PDF File Not Saved to Predictable Drive Location

**What goes wrong:** If the PDF is saved to Drive without a consistent folder structure, admins cannot reliably find past reports. `DriveApp.createFile()` saves to Drive root by default. On a shared Workspace Drive, "root" may resolve differently for different users.

**Prevention:**
```
1. Create a dedicated Drive folder for PUCV2 reports and store its ID in CONFIG or PropertiesService.
2. On first run, create the folder if it doesn't exist; on subsequent runs, use the stored ID.
3. Name PDFs with a timestamp: "InformeEjecutivo_YYYYMMDD_HHMMSS.pdf" to prevent overwrites.
4. Show the Drive file URL in the success message so the admin can click directly to it.
```

---

## Minor Pitfalls

---

### Pitfall m1: Email Subject Line for Class-Start Differs From Existing Subject Pattern

**What goes wrong:** If the class-start email subject is inconsistent with what recipients received during admissions (which referenced "Programas de Inglés PUCV"), students may not associate it with the program in their inbox. Low open rates may cause students to miss schedule information.

**Prevention:** Follow the established subject line pattern used in CorreoSeleccionado. Include "Programas de Inglés PUCV" and a clear action keyword ("Inicio de Clases").

---

### Pitfall m2: PropertiesService Payload Limit Hit By Sala Snapshot

**What goes wrong:** PropertiesService has a per-property limit of 9KB and a total script properties limit of 500KB. Storing a sala snapshot as JSON is trivial. However, if sala data is combined with existing token storage, the 500KB cap could theoretically be reached if tokens accumulate over multiple semesters without cleanup.

**Prevention:** Verify token cleanup runs after each acceptance period ends. The sala snapshot should be explicitly deleted after the class-start batch completes. This is a minor risk given current class sizes (~25 students) but worth noting for future growth.

---

### Pitfall m3: Hardcoded HORARIOS in CONFIG Doesn't Include Sala

**What goes wrong:** `PROGRAM_DATA.HORARIOS` already contains catedra and ayudantia strings per level. The new feature adds sala as a third field. If sala is appended to HORARIOS by storing `{catedra, ayudantia, sala}` per level in CONFIG, it becomes part of the Config sheet and loses the "entered at generation time" requirement. The constraint in PROJECT.md is clear: sala is manual, external, per-generation.

**Prevention:** Never store sala in CONFIG or PROGRAM_DATA. Keep it as a transient value collected from the dialog, passed as a parameter to the email function, and optionally snapshotted in PropertiesService for retry resilience only. Do not conflate horario (persistent program data) with sala (transient operational data).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| PDF generation function | Temp file not cleaned up on error (C1) | try/finally for DriveApp.createFile() |
| PDF generation function | Execution timeout from chained service calls (C2) | Separate from ListaFinal generation; batch Sheets writes |
| PDF Drive export | Permission/403 on export URL (C6) | Use DriveApp.getBlob() not UrlFetchApp fetch |
| PDF layout | Non-deterministic output if sheet edited (M1) | Set column widths programmatically; generate PDF immediately after list generation |
| Class-start email | Empty sala renders silently in template (C4) | Validate dialog input; pre-send confirmation dialog |
| Class-start email | Stale sala/horario on batch retry (C3) | PropertiesService snapshot before send; clear after complete |
| Class-start email | Wrong quota API (C5) | **Do NOT replace** — `MailApp.getRemainingDailyQuota()` is the only valid GAS quota API; `GmailApp` has no quota method (QUAL-01 finding) |
| Class-start email template | Missing HTML file after deployment (M2) | Add to onOpen() template validation; update deployment docs |
| Class-start email | Template variable silently undefined (M4) | Typed interface for template context variables |
| Both features | UI dialog calls incompatible with triggers (M3) | Separate dialog collection from send logic |
| PDF Drive storage | File saved to Drive root, hard to find (M5) | Save to named folder; include Drive URL in success message |

---

## Existing Codebase Risks Amplified by New Features

The following items from CONCERNS.md become more critical when adding PDF generation and class-start emails:

**Email Batch Has No Checkpointing (CONCERNS.md: Performance Bottlenecks):** The class-start email is a one-time, high-stakes send. The existing no-checkpointing problem means a timeout at recipient 20/25 leaves 5 students uninformed with no automatic retry. The "Fecha Notificación" idempotency column must be applied to the class-start email from day one — it cannot be retrofitted after an incident.

**Hardcoded Email Template Assumptions (CONCERNS.md: Known Bugs):** The new `CorreoInicioClases` template will suffer the same missing-file failure mode. The existing CONCERNS.md recommends a factory pattern for template selection. This is the right moment to implement it across all templates, not just the new one.

**Column Header Dependencies (CONCERNS.md: Tech Debt):** The class-start email reads "Nivel Asignado" from the Seleccionados sheet. If this column was manually renamed since the last send, the email batch reads `undefined` for all levels. The column discovery/validation function recommended in CONCERNS.md should run as part of the pre-send validation for class-start emails.

**Gmail API Quota (CONCERNS.md: Scaling Limits):** 100/day personal limit. If the class-start batch (up to 25 emails) is run the same day as any other batch send, total daily sends could approach the limit. The class-start send should be given priority; defer other test sends on the same day.

---

## Sources

- Direct codebase analysis: `src/Correos.ts`, `src/ListaFinal.ts`, `src/Config.ts`, `src/Utils.ts` — HIGH confidence
- `.planning/codebase/CONCERNS.md` codebase audit — HIGH confidence (first-party analysis)
- `.planning/codebase/INTEGRATIONS.md` integration audit — HIGH confidence
- GAS runtime constraints (execution timeout, quota limits, PropertiesService limits, UrlFetchApp auth): MEDIUM confidence (training knowledge, no live verification during this session — validate against https://developers.google.com/apps-script/guides/services/quotas before implementation)
- PDF export via DriveApp.getBlob() vs UrlFetchApp: MEDIUM confidence — verify against current GAS docs
