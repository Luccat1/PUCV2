# DECISIONS.md — Architecture Decision Records

> Decisions made during project development.

## ADR-001: Use TypeScript for development

- **Date:** 2026-03-03
- **Status:** Accepted (Updated 2026-03-13: Removed clasp requirement)
- **Context:** The current codebase is a single 1681-line JavaScript file. Modularization is needed but GAS editor doesn't support good tooling.
- **Decision:** Use TypeScript for local development, type safety, and multi-file structure.
- **Consequences:** Requires a build step (npm run build) to compile into a dist/ folder. Enables proper code organization and IDE support.

## ADR-002: Combo UI approach (Menu + Sidebar + Web App)

- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Need to balance convenience (in-Sheets) with capability (rich dashboard).
- **Decision:** Native Sheets menu for quick actions, HTML sidebar for configuration/review, separate web app for full dashboard.
- **Consequences:** Three UI surfaces to maintain. Best UX for different tasks.

## ADR-003: Accept/Reject cupo via web app link

- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Gmail doesn't support interactive buttons. Postulantes currently reply "Confirmo" by email, which is manual to track.
- **Decision:** Include tokenized links in notification emails that open a mini web app confirmation page.
- **Consequences:** Need to handle the `doGet` route for accept/reject. Need token generation for security. Updates Sheet automatically.

## ADR-004: Big Bang migration strategy

- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Need to migrate 1681-line monolith to modular TypeScript. Options: incremental (module by module) or big bang (all at once).
- **Decision:** Big Bang — rewrite all modules in one pass, using the current working code as reference for verification.
- **Reason:** Only 1 file to migrate, and the existing code serves as a reliable comparison target.

## ADR-005: Remove hardcoded SHEET_ID — bind to active spreadsheet

- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Current code has `CONFIG.SHEET_ID` hardcoded, tying the script to one specific spreadsheet.
- **Decision:** Use `SpreadsheetApp.getActiveSpreadsheet()` instead of `SpreadsheetApp.openById()`. The script will be container-bound to the spreadsheet with form responses.
- **Consequences:** Script must be created from within the spreadsheet (Extensions > Apps Script), not as a standalone project. Removes the need for SHEET_ID configuration. Makes the script reusable across different spreadsheets.

## ADR-006: Fix cargarConfiguracionDesdeHoja execution order

- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Bug found: `cargarConfiguracionDesdeHoja()` runs AFTER the evaluation loop (line 625), so custom weights don't affect the current evaluation.
- **Decision:** Move config loading to BEFORE the evaluation loop so weights are applied immediately.

## ADR-007: Module structure for TypeScript migration

- **Date:** 2026-03-03
- **Status:** Accepted
- **Decision:** Split into 9 modules: Config, Utils, Evaluacion, Seleccionados, Dashboard, Correos, WebApp, Menu, ListaFinal.
- **Consequences:** All nested functions inside `evaluarPostulacionesPUCV2()` will be extracted to module level. SCORING_PARAMS moves to Config.ts as a typed global.

## ADR-008: Remove clasp automation

- **Date:** 2026-03-13
- **Status:** Accepted
- **Context:** `clasp` requires persistent browser authentication which creates friction and failures in automated CI/CD and AI-agent environments.
- **Decision:** Remove `clasp` from the project and rely on a simple `npx tsc` build process.
- **Consequences:** Users must manually copy the generated `dist/` contents into Google Apps Script instead of running a deploy command. This guarantees stability at the cost of a slightly more manual deployment step.
