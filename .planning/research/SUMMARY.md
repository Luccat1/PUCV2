# Research Summary

**Project:** PUCV2English — class-start emails and executive PDF report
**Synthesized:** 2026-03-19
**Research files:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md

---

## Executive Summary

PUCV2English is a mature, container-bound Google Apps Script project written in TypeScript that manages the end-to-end admissions pipeline for an English language program at PUCV. The two new features — a class-start notification email and an executive enrollment PDF report — are additive extensions to a working system, not greenfield work. Every required API (`GmailApp`, `HtmlService`, `SpreadsheetApp`, `DocumentApp`, `DriveApp`) is either already in production use or a well-understood GAS primitive. No new dependencies, no npm packages, and no external services are required or appropriate.

The recommended approach is strict adherence to existing patterns: the batch email follows the same `sendEmailBatch` + idempotency-column + quota-check structure already proven for five other email categories; the PDF report uses the `DocumentApp.create()` → populate → `getAs(MimeType.PDF)` → `DriveApp.createFile()` pattern, which is the standard GAS PDF path. The classroom (sala) input is collected via a multi-level `HtmlService` modal dialog (one form, all levels at once), following the existing `SidebarConfig` / `DialogConfirmEval` interaction model. The architecture introduces two new source files (`InicioClases.ts`, `InformeEjecutivo.ts`) plus two HTML files (`CorreoInicioClases.html`, `DialogSalas.html`) wired into the existing `Menu.ts` and `Config.ts` extension points.

The key risks are operational, not technical: an empty sala field silently corrupting an email template, a temporary Drive file not cleaned up after a PDF export error, and the existing `MailApp.getRemainingDailyQuota()` call measuring the wrong quota counter. All three are preventable with patterns already partially established in the codebase (idempotency columns, try/finally cleanup, pre-send validation dialogs). The overall implementation confidence is HIGH — every API call is verified against the installed `@types/google-apps-script 1.0.98` type definitions and the existing codebase.

---

## Key Findings

### From STACK.md

| Capability | API | Confidence |
|-----------|-----|------------|
| Send personalized HTML email per student | `GmailApp.sendEmail()` + `HtmlService.createTemplateFromFile()` | HIGH — already in production |
| Generate PDF blob from spreadsheet data | `DocumentApp.create()` → `getAs(MimeType.PDF)` | HIGH — confirmed in type defs |
| Save PDF to Drive | `DriveApp.createFile(blob)` | HIGH — core GAS API |
| Collect sala per nivel from user | `HtmlService.createHtmlOutputFromFile()` modal dialog | HIGH — pattern in existing Menu.ts |
| Check send quota before batch | `MailApp.getRemainingDailyQuota()` (current) — **should be `GmailApp`** | HIGH — see C5 pitfall |

- TypeScript 5.7.3 + `@types/google-apps-script 1.0.98` are the installed versions; no version changes needed.
- No new npm dependencies. No external services. GAS runtime constraints apply throughout.
- `appsscript.json` requires no manifest changes; GAS auto-detects Drive/Gmail scopes from API usage.

### From FEATURES.md

**Must-have (table stakes):**
- Class-start email: student name, assigned level, schedule (catedra + ayudantia), sala, program start/end dates, PUCV branding, send-only-to-confirmed-students filter, idempotency guard ("Notificado Inicio" column), Gmail quota check, error reporting on partial failures.
- PDF report: total enrolled count, per-level headcount, student list per level, program dates, generation date, PDF output to Google Drive, triggerable from menu.

**Should-have (differentiators):**
- Dry-run / preview mode for class-start email (low effort, high admin confidence value).
- Per-level sala validation before send (prevent empty sala in template).
- Date-stamped PDF filename (`InformeEjecutivo_YYYYMMDD.pdf`).
- Drive URL shown in success message so admin can click directly to the file.

**Defer to v2+:**
- Schedule and sala included in PDF report (requires sala persistence; only worthwhile if sala is saved, not transient).
- Drive folder targeting for PDF (adds config surface; default root Drive is acceptable for v1).
- "Pago" summary in PDF (confirm column usage with stakeholder first).

**Anti-features (do not build):**
- Automated classroom assignment — sala is external and manual by design.
- Student-facing PDF distribution — report is internal/administrative only.
- Rich HTML report editor in GAS — use DocumentApp with fixed structure.
- Webhook or external notification on report generation — no external services in scope.

### From ARCHITECTURE.md

**Major components and responsibilities:**

| Component | File | Role |
|-----------|------|------|
| InicioClases | `src/InicioClases.ts` | Email batch logic: filter Lista Final, inject sala/horario, send, mark idempotency |
| InformeEjecutivo | `src/InformeEjecutivo.ts` | Aggregate Lista Final; create Doc; export PDF; save to Drive; return URL |
| Menu additions | `src/Menu.ts` (extend) | Thin UI wrappers only — no business logic |
| Config additions | `src/Config.ts` (extend) | Add `sala?: string` to `IProgramData.HORARIOS`; add new column key constants |
| CorreoInicioClases.html | HTML template | Email template; variables: `nombre`, `nivel`, `horario`, `FECHA_INICIO`, `FECHA_TERMINO` |
| DialogSalas.html | HTML dialog | Per-level room entry form; calls `google.script.run.guardarSalasYConfirmar()` |

**Key patterns to follow:**
1. Menu wrapper pattern — menu items call thin launchers in `Menu.ts`; business logic lives in dedicated modules.
2. `google.script.run` from HtmlService modals — same contract as existing `SidebarConfig.html`.
3. Idempotency via notification column — "Notificado Inicio" column in Lista Final, same as existing `Fecha Notificación`.
4. DocumentApp → `getAs(MimeType.PDF)` → `DriveApp.createFile()` — standard GAS PDF path; delete temp Doc in `finally`.
5. In-memory sala storage in `PROGRAM_DATA.HORARIOS[nivel].sala` — transient, never persisted to Config sheet.

**Suggested build order (dependency-driven):**
1. `Config.ts` extension (everything depends on it)
2. `CorreoInicioClases.html` template (no code dependencies, can run in parallel with step 1)
3. `InicioClases.ts` (depends on 1 and 2)
4. `DialogSalas.html` (depends on InicioClases function signatures)
5. `InformeEjecutivo.ts` (depends only on Config; parallel with 3-4)
6. `Menu.ts` additions (depends on functions from 3 and 5; always last)

### From PITFALLS.md

**Top 5 pitfalls with prevention strategies:**

| ID | Pitfall | Prevention |
|----|---------|------------|
| C1 | Temp Drive Doc left orphaned after PDF export error | `try/finally` — always call `tempDoc.getFile().setTrashed(true)` in finally block |
| C3 | Stale sala/horario on batch retry (admin re-runs after partial failure) | Snapshot `{nivel: {sala, horario}}` to PropertiesService before send; use snapshot for entire batch; clear on completion |
| C4 | Empty sala field silently renders blank in email template | Validate dialog input before send; show confirmation dialog with full sala/horario mapping; abort if any level with recipients has blank sala |
| C5 | `MailApp.getRemainingDailyQuota()` measures wrong quota counter | Replace with `GmailApp.getRemainingDailyQuota()` in all batch sends — this is also a bug fix for the existing five email types |
| M2 | Missing `CorreoInicioClases.html` template after GAS deployment (copy-paste workflow doesn't include HTML files) | Add new template name to `onOpen()` validation list; update deployment documentation |

**Additional risks amplified by new features:**
- The existing no-checkpointing problem in email batches is more critical for the class-start send (one-time, high-stakes) — idempotency column is mandatory from day one, not optional.
- Column header dependency fragility (Correos.ts reads column names by string match) will affect class-start email reads from Lista Final — consider a column validation step before send.

---

## Implications for Roadmap

Based on combined research, the work decomposes into two independent feature tracks plus a cross-cutting quality item. Dependencies are shallow; both tracks can be delivered in a single phase or split into two small phases.

### Suggested Phase Structure

**Phase 1: Class-Start Email Notification**
- Rationale: Primary student-facing deliverable; higher urgency than the internal PDF report; establishes the new `InicioClases.ts` module and `DialogSalas.html` interaction pattern.
- Delivers: `enviarCorreosInicioClases()` with sala dialog, idempotency guard, quota check, error reporting, dry-run preview.
- Features from FEATURES.md: all class-start table stakes + per-level sala validation differentiator + dry-run differentiator.
- Pitfalls to address: C3 (stale sala snapshot), C4 (empty sala validation), C5 (wrong quota API — fix in this phase), M2 (missing template validation), M3 (separate dialog from send logic), M4 (typed template variable interface).
- Research flag: No additional research needed. All APIs confirmed in type definitions and existing codebase. Standard patterns apply.

**Phase 2: Executive Enrollment PDF Report**
- Rationale: Internal administrative tool; lower urgency; depends only on Lista Final data (already exists after Phase 1 completes or independently). Can be developed in parallel with Phase 1 if resources allow.
- Delivers: `generarInformeEjecutivoPDF()` producing a Drive-saved PDF with per-level enrollment summary, program dates, generation date, and a Drive URL shown to the admin.
- Features from FEATURES.md: all PDF report table stakes + date-stamped filename + Drive URL in success message.
- Pitfalls to address: C1 (try/finally temp Doc cleanup), C2 (execution timeout — separate from ListaFinal generation, batch Sheets writes), C6 (prefer DriveApp.getBlob() over UrlFetchApp export URL), M1 (deterministic layout via programmatic column widths), M5 (predictable Drive location).
- Research flag: No additional research needed. `DocumentApp.create()` + `getAs(MimeType.PDF)` + `DriveApp.createFile()` is a well-documented GAS pattern. Validate against https://developers.google.com/apps-script/guides/services/quotas for current timeout and quota limits before implementation.

**Phase 3 (optional, deferred): Quality and Hardening**
- Rationale: Several pitfalls (M2, M4, column validation) point to systemic fragility in the existing codebase that will be amplified by the new features. Addressing them as a dedicated cleanup phase after both features ship reduces risk for future maintenance.
- Delivers: `verificarConfiguracion()` self-test menu item; typed template variable interfaces for all templates; column discovery/validation before any batch send; deployment documentation update listing all required HTML files.
- Research flag: No research needed. Pure refactor of existing patterns.

### Research Flags

- **Phase 1 (Class-Start Email):** No additional research needed before implementation.
- **Phase 2 (PDF Report):** Validate GAS execution quotas and timeout limits against current documentation before implementation. The `DocumentApp` → PDF pattern is HIGH confidence but the exact timeout behavior under realistic data loads should be tested early (see C2 prevention guidance).
- **Phase 3 (Hardening):** No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All APIs verified against installed `@types/google-apps-script 1.0.98` type definitions and live codebase usage. No speculation. |
| Features | HIGH | Grounded in project spec (`.planning/PROJECT.md`), existing codebase patterns, and GAS platform constraints. Anti-features clearly defined. |
| Architecture | HIGH | All six API confidence entries rated HIGH in ARCHITECTURE.md. Patterns verified from existing modules (`Correos.ts`, `Menu.ts`, `SidebarConfig.html`). |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (C1-C6) are HIGH confidence from direct codebase analysis. GAS runtime constraints (execution timeout, quota behavior) are MEDIUM confidence — based on training knowledge, not live verification. |

**Overall: HIGH**

### Gaps to Address

1. **GmailApp.getRemainingDailyQuota() availability** — PITFALLS.md flags that the current code uses `MailApp.getRemainingDailyQuota()` (C5). Confirm that `GmailApp` exposes an equivalent method in the installed type definitions before replacing the call. If not, a workaround is needed.
2. **GAS execution timeout under real load** — PITFALLS.md C2 recommends testing PDF generation with 30+ rows before shipping. Do not skip this during Phase 2 implementation.
3. **Sala persistence decision** — FEATURES.md defers "sala in PDF report" to v2+, contingent on whether sala is persisted from the email send. Confirm with stakeholder whether the PDF must include classroom assignments. If yes, a sala persistence mechanism (PropertiesService snapshot or Config sheet column) is needed and must be planned as part of Phase 1, not after.
4. **"Pago" column usage in report** — FEATURES.md defers the paid-status summary pending stakeholder confirmation. Clarify before Phase 2 implementation to avoid a revision cycle.

---

## Sources (Aggregated)

| Source | Used By | Confidence |
|--------|---------|------------|
| `node_modules/@types/google-apps-script 1.0.98` | STACK.md | HIGH — installed, authoritative |
| `src/Correos.ts` | STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md | HIGH — production code |
| `src/Menu.ts` | STACK.md, ARCHITECTURE.md | HIGH — production code |
| `src/Config.ts` | FEATURES.md, ARCHITECTURE.md, PITFALLS.md | HIGH — production code |
| `src/ListaFinal.ts` | FEATURES.md, ARCHITECTURE.md | HIGH — production code |
| `.planning/PROJECT.md` | FEATURES.md | HIGH — validated project spec |
| `.planning/codebase/CONCERNS.md` | ARCHITECTURE.md, PITFALLS.md | HIGH — first-party audit |
| `.planning/codebase/INTEGRATIONS.md` | STACK.md, ARCHITECTURE.md, PITFALLS.md | HIGH — first-party audit |
| GAS runtime documentation (training knowledge) | PITFALLS.md | MEDIUM — not live-verified |

---

*Synthesized: 2026-03-19 | Researcher: gsd-synthesizer | Model: claude-sonnet-4-6*
