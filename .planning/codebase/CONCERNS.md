# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**Hardcoded Configuration Values:**
- Issue: WEB_APP_URL in `CONFIG` is empty string, must be manually filled post-deployment
- Files: `src/Config.ts` (line 106)
- Impact: Email confirmation links will fail if WEB_APP_URL not configured; users see "No se puede abrir el archivo"
- Fix approach: Implement auto-detection of Web App URL or add setup validation to `onOpen()` that alerts if WEB_APP_URL is blank

**Column Header Dependencies:**
- Issue: All data retrieval depends on exact column header names via `indexOf()`
- Files: `src/Evaluacion.ts`, `src/Correos.ts`, `src/Dashboard.ts`, `src/WebApp.ts`, `src/ListaFinal.ts`
- Impact: Adding/removing columns or renaming headers breaks entire evaluation engine; silent failures if header not found (indexOf returns -1)
- Fix approach: Create a column discovery/validation function that runs at startup and logs missing/unexpected columns; consider using column positions from CONFIG if headers change frequently

**Global Mutable State:**
- Issue: `SCORING_PARAMS` and `PROGRAM_DATA` modified by `cargarConfiguracionDesdeHoja()` and `saveConfiguracion()` without transaction safety
- Files: `src/Config.ts` (lines 193, 214), `src/Evaluacion.ts` (lines 305-306)
- Impact: If configuration sheet is corrupted or partially read, global state becomes inconsistent; next evaluation uses invalid weights
- Fix approach: Implement configuration validation layer; add rollback mechanism if cargarConfiguracionDesdeHoja() encounters invalid data

**Array Index Safety Gaps:**
- Issue: Code accesses array indices with variables like `f[idxNombre]` without bounds checking
- Files: `src/Evaluacion.ts` (lines 79-82, 123-127), `src/WebApp.ts` (lines 93-104, 126-131), `src/Correos.ts` (lines 36-42)
- Impact: If a row has fewer columns than expected, will read `undefined` values; silent data corruption
- Fix approach: Add helper function `getSafeValue(row, index, fallback)` that returns fallback if index out of bounds

## Known Bugs

**ListaFinal Column Mismatch:**
- Symptoms: Generated final list may have misaligned columns or missing data
- Files: `src/ListaFinal.ts` (lines 51-61)
- Trigger: When "Seleccionados" sheet headers are manually edited or data contains unexpected structure
- Status: Partially fixed in commit 55b5607, but root cause (assumption of fixed column positions) not addressed
- Workaround: Verify header structure in "Seleccionados" sheet before running `generarListaFinalCurso()`

**Duplicate Email Detection Incomplete:**
- Symptoms: Same applicant submitting form twice gets processed twice if processed in same batch
- Files: `src/Evaluacion.ts` (lines 53-76)
- Trigger: Two submissions with same email address in different rows of input sheet within single evaluation run
- Current mitigation: Set-based lookup in current batch, but doesn't check against PREVIOUS batches in "Evaluación automatizada" sheet
- Impact: Duplicate entries in output sheet; inflates statistics
- Fix approach: Query "Evaluación automatizada" sheet before processing to build initial correosProcesados Set with ALL historical emails

**Waitlist Promotion Logic Not Fully Implemented:**
- Symptoms: `gestionarListaDeEspera()` references undefined column `CONFIG.COLUMNS.SCORE`
- Files: `src/Seleccionados.ts` (line 89)
- Trigger: When waitlist promotion is triggered or test runs
- Impact: Waitlist management feature is broken; runtime error if triggered
- Fix approach: Either use "PUNTAJE TOTAL" directly or add `SCORE: "PUNTAJE TOTAL"` to `CONFIG.COLUMNS`

**Hardcoded Email Template Assumptions:**
- Symptoms: Email sending fails if HTML template files are missing or misnamed
- Files: `src/Correos.ts` (lines 106-119, 121)
- Trigger: Manual template deletion or renaming in GAS editor
- Current mitigation: try/catch blocks catch errors (line 144)
- Impact: Emails won't send, user sees error message but no visibility into root cause
- Fix approach: Add validation in `onOpen()` to check all expected templates exist; create factory pattern for template selection

## Security Considerations

**No Input Validation on Email Addresses:**
- Risk: Malformed email addresses in form responses could cause GmailApp.sendEmail() to fail or behave unpredictably
- Files: `src/Correos.ts` (line 134, 171)
- Current mitigation: try/catch blocks (lines 144, 175)
- Impact: Silent failures; some emails won't send with no clear reason
- Recommendations: Add email validation regex before calling GmailApp.sendEmail(); validate in both `sendEmailBatch()` and `sendTestEmail()`

**No Rate Limiting on Test Email Function:**
- Risk: User could call `sendTestEmail()` repeatedly in sidebar UI and exhaust Gmail quota
- Files: `src/Correos.ts` (line 161)
- Current mitigation: Gmail quota check exists for batch operations (line 91-93) but NOT for test function
- Impact: Quota exhaustion blocks legitimate batch sends
- Recommendations: Add rate limiting; cache recently sent test emails; log all test email sends

**Scoring Configuration Not Audited:**
- Risk: User can modify `SCORING_PARAMS` via web UI without visibility into impact
- Files: `src/Evaluacion.ts` (lines 266-309)
- Current mitigation: None
- Impact: Invalid weights (e.g., negative numbers, very large values) could produce nonsensical scores with no validation
- Recommendations: Add `validateScoringParams()` function that checks: all peso values > 0, all MaxPuntaje > 0, no NaN values; add audit log to track configuration changes

**No Encryption of Sensitive Data in Properties Service:**
- Risk: Web app logs and configuration stored in `PropertiesService.getUserProperties()` in plaintext
- Files: `src/Utils.ts` (lines 64-69)
- Impact: Any user with script access can read all logs including email addresses and processing errors
- Recommendations: Consider whether logs need to persist at all; if they do, implement basic masking (email domains only, not full addresses)

## Performance Bottlenecks

**Full Sheet Retrieval on Every Evaluation:**
- Problem: `evaluarPostulacionesPUCV2()` calls `getDataRange().getValues()` on input sheet (line 36), retrieving ALL rows including processed ones
- Files: `src/Evaluacion.ts` (lines 36, 86-87)
- Cause: Early exit via "Estado de Procesamiento" column check is per-row but entire range is fetched upfront
- Scaling impact: At 1000 rows, retrieval time grows; at 10,000 rows, performance degrades significantly
- Improvement path: Implement incremental fetch; add row count limit and batch processing; consider using getLastRow() to only fetch up to last data row

**Duplicate Filtering Uses Linear Search:**
- Problem: `correosProcesados` Set is rebuilt each execution from current batch + rechecked set
- Files: `src/Evaluacion.ts` (lines 54-77)
- Cause: No persistent cache of processed emails; rebuilds from "Evaluación automatizada" would be better
- Scaling impact: At 500 new submissions per batch, Set lookups are O(1) but initial Set construction is O(n)
- Improvement path: Load all processed emails from output sheet into Set once at start; maintain as batch progresses

**Dashboard Statistics Recalculated on Every Evaluation:**
- Problem: `generarYActualizarDashboard()` is called after EVERY evaluation, even if only 1 new applicant
- Files: `src/Evaluacion.ts` (line 164)
- Cause: Unconditional call
- Scaling impact: Dashboard generation includes full iteration over all applicants; at 1000 applicants, this becomes slow
- Improvement path: Only regenerate dashboard if new applicants added; cache dashboard data; make dashboard generation async

**Email Batch Processing Has No Checkpointing:**
- Problem: If `sendEmailBatch()` fails mid-way through 500 recipients, all must be retried from start
- Files: `src/Correos.ts` (lines 86-155)
- Cause: Updates "Fecha Notificación" column after email sent, but if function interrupted, loses progress
- Impact: Timeout on large batches; wasted quota
- Improvement path: Implement checkpoint-based sending; send in waves of 10; persist state; implement resume logic

## Fragile Areas

**Config.ts Global State Management:**
- Files: `src/Config.ts` (lines 155-187, 193, 214)
- Why fragile: Two global mutable objects (`SCORING_PARAMS`, `PROGRAM_DATA`) initialized from JSON.parse copies, but modifications are scattered across multiple files. No state validation after updates.
- Safe modification: Always validate state after modification; add setter functions instead of direct assignment; implement state snapshot/rollback
- Test coverage: No unit tests for configuration loading/saving logic

**Seleccionados.ts Ranking Calculation:**
- Files: `src/Seleccionados.ts` (lines 14-25)
- Why fragile: Ranking is assigned based on position in sorted array (`i + 1`) but "Ranking" column is used as unique ID in other functions. If sheet is manually edited, rankings become invalid.
- Safe modification: Regenerate entire sheet rather than manual edits; add validation that rankings are sequential
- Test coverage: No tests for ranking consistency

**WebApp.ts Array Indexing:**
- Files: `src/WebApp.ts` (lines 74-141)
- Why fragile: Multiple `indexOf()` calls to find column positions; if any returns -1, subsequent array access reads wrong columns
- Safe modification: Add guard checks: `if (idx < 0) throw Error(...)` after each indexOf; create column index map function
- Test coverage: No validation that all required columns exist

**Evaluacion.ts Scoring Functions:**
- Files: `src/Evaluacion.ts` (lines 324-415)
- Why fragile: Each scoring function has different logic for extracting values from fila array; inconsistent null/undefined handling
- Safe modification: Create utility for consistent value extraction; add @param validation at start of each function
- Test coverage: Scoring logic has no unit tests; only works end-to-end through sheet

**Correos.ts Template Rendering:**
- Files: `src/Correos.ts` (lines 121-136)
- Why fragile: Sets arbitrary properties on HtmlService template object via `(htmlBody as any)` type assertions
- Safe modification: Create strongly-typed template context interfaces; validate all required properties are set before evaluate()
- Test coverage: No template rendering tests

## Scaling Limits

**Google Apps Script Execution Time:**
- Current capacity: ~6-minute timeout limit per GAS execution
- Limit: At ~500 new applicants per batch, evaluation completes within timeout but is slow
- Triggers: Form submission spike, manual evaluation of backlog
- Scaling path: Implement batch processing in chunks of 100; use timed triggers for multi-phase evaluation; implement queue pattern

**Gmail API Quota:**
- Current capacity: 100 emails/day per user (MailApp), Gmail API separately
- Limit: Batch sending 25 selected + 100 waitlist = 125 emails exceeds daily limit
- Triggers: Large class sizes, test email spam
- Scaling path: Implement quota tracking; add retry logic for quota errors; document daily limits in UI; consider Google Workspace API

**Spreadsheet Data Volume:**
- Current capacity: Google Sheets technically unlimited, but performance degrades
- Limit: At 5000+ rows, getDataRange() becomes slow; getLastRow()/getLastColumn() add overhead
- Triggers: Multi-year data accumulation
- Scaling path: Archive old evaluations to separate sheets; implement data cleanup in config sheet; use filters instead of manual row deletion

**Concurrent Execution:**
- Current capacity: LockService.tryLock() with 10-second timeout
- Limit: If two evaluations triggered simultaneously (form spam + manual trigger), second fails
- Triggers: High form submission rate
- Scaling path: Implement queue-based execution; use Apps Script execution API for async jobs

## Dependencies at Risk

**@types/google-apps-script ^1.0.98:**
- Risk: Type definitions may not match actual GAS runtime behavior; types lag behind GAS API updates
- Impact: Type-safe code may fail at runtime; missing methods not caught by compiler
- Migration plan: Regularly verify key APIs match actual GAS behavior; add runtime guards for external API calls; test in deployed script before using

**TypeScript strict mode with ESNext target:**
- Risk: Compiled output may not work in GAS runtime (which uses limited ES version)
- Impact: Runtime errors from unsupported ES syntax
- Migration plan: Test compiled dist/ files in GAS editor regularly; validate transpilation output; consider targeting ES5

## Missing Critical Features

**No Audit Log:**
- Problem: System has no persistent record of who modified what when
- Blocks: Compliance requirements, debugging user actions, security auditing
- Implementation path: Add audit sheet; log all configuration changes, email sends, acceptance/rejection actions with timestamp and user email

**No Backup/Recovery:**
- Problem: If "Evaluación automatizada" sheet is accidentally cleared, all evaluation data is lost
- Blocks: Data protection requirements
- Implementation path: Implement automatic daily snapshots; version configuration sheets; add "restore from backup" menu option

**No Rollback Mechanism:**
- Problem: If evaluation produces wrong scores, must manually edit scores in output sheet
- Blocks: Quick error recovery
- Implementation path: Add "Undo Last Evaluation" function; maintain previous evaluation snapshot; implement transaction pattern

**No Dry Run Mode:**
- Problem: Users can't preview what evaluation will do before committing
- Blocks: Testing changes to scoring logic
- Implementation path: Add "Preview Evaluation (No Write)" mode that shows what scores would be assigned but doesn't modify sheets

**No Email Template Preview:**
- Problem: Can't see what email will look like before sending to 25 people
- Blocks: Typo detection, QA
- Implementation path: Add "Preview Email Template" in menu that shows rendered HTML for one recipient

## Test Coverage Gaps

**Scoring Logic Not Unit Tested:**
- What's not tested: `calcularPuntajeTipoPostulante()`, `calcularPuntajeUsoIngles()`, `calcularPuntajeInternacionalizacion()`, `calcularPuntajeCertificado()`, `calcularPuntajeAnioIngreso()` have no tests
- Files: `src/Evaluacion.ts` (lines 324-415)
- Risk: Bug in scoring function affects all applicants; discovered only after evaluation completes
- Priority: High - scoring is core logic

**Configuration Loading Not Validated:**
- What's not tested: `cargarConfiguracionDesdeHoja()` and `cargarDatosPrograma()` don't validate loaded data
- Files: `src/Evaluacion.ts` (lines 177-253)
- Risk: Corrupted config sheet produces nonsensical SCORING_PARAMS
- Priority: High - configuration is critical

**Array Bounds Not Checked:**
- What's not tested: Code assumes columns always exist at expected indices; no test for missing columns
- Files: Multiple files accessing `f[idx...]` patterns
- Risk: Missing column causes silent data corruption (reads undefined)
- Priority: High - data integrity

**Email Sending Edge Cases:**
- What's not tested: Handling of invalid email addresses, quota exhaustion, network errors
- Files: `src/Correos.ts` (lines 86-155)
- Risk: Silent email failures; users don't know emails weren't sent
- Priority: Medium - feature-blocking failures

**Dashboard Stats Calculation:**
- What's not tested: Grouping by categoria/sede/anio with missing/empty values
- Files: `src/Dashboard.ts` (lines 9-79)
- Risk: Incomplete statistics for edge case values
- Priority: Medium - incorrect reporting

**Waitlist Promotion Logic:**
- What's not tested: `gestionarListaDeEspera()` references undefined column; never tested end-to-end
- Files: `src/Seleccionados.ts` (lines 78-139)
- Risk: Feature completely broken; runtime error if triggered
- Priority: Critical - feature doesn't work

---

*Concerns audit: 2026-03-19*
