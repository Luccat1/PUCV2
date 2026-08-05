---
phase: 03-asignaci-n-por-test-de-nivel
plan: "03"
subsystem: rejection-email
tags: [email, idempotency, quota-guard, html-template, gas]
dependency_graph:
  requires:
    - 03-01  # PLACEMENT_COL.nivelInsuficiente and correoRechazaEnviado columns in Placement.ts
  provides:
    - enviarCorreosRechazoPorNivel  # callable from Menu.ts (Plan 04)
    - renderCorreoRechazoPorNivel   # render function for CorreoRechazoPorNivel.html
  affects:
    - src/TestRechazoPorNivel.ts    # forward declaration was already present; now resolved
tech_stack:
  added: []
  patterns:
    - Idempotency stamp via setValue(new Date()) after each successful GmailApp.sendEmail
    - Quota guard using MailApp.getRemainingDailyQuota() before batch send
    - GAS HtmlService template rendering with (tpl as any).variable assignment
key_files:
  created:
    - src/RechazoPorNivel.ts
    - src/CorreoRechazoPorNivel.html
    - PUCV2English/CorreoRechazoPorNivel.html
  modified: []
decisions:
  - Both HTML files kept byte-for-byte identical (cp rather than separate creation) so future edits remain in sync
  - Empty string passed as plain-text body to GmailApp.sendEmail (HTML-only email, matching InicioClases pattern)
metrics:
  duration_seconds: 115
  completed_date: "2026-08-05"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 03 Plan 03: RechazoPorNivel — Rejection Email Batch Summary

**One-liner:** Idempotent batch rejection email using HtmlService template with quota guard, stamping correoRechazaEnviado after each GmailApp.sendEmail call.

## What Was Built

Two artifacts deliver NIVEL-06:

1. **`src/RechazoPorNivel.ts`** — defines `renderCorreoRechazoPorNivel()` and `enviarCorreosRechazoPorNivel()`. The send function reads the "Prueba de Nivel" sheet, collects rows where `nivelInsuficiente === "Sí"` and `correoRechazaEnviado` is blank, checks Gmail quota, sends HTML emails, and writes `new Date()` to the stamp column for idempotency.

2. **`src/CorreoRechazoPorNivel.html` + `PUCV2English/CorreoRechazoPorNivel.html`** — rejection email template using `<?= nombre ?>` and `<?= nivel ?>` GAS scriptlet variables. Visual style (PUCV blue palette, 600px container, logo header) matches `CorreoInicioClases.html`. Both files are byte-for-byte identical; `PUCV2English/` is the copy the GAS runtime reads.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create CorreoRechazoPorNivel.html (src and PUCV2English) | 4697f2d | src/CorreoRechazoPorNivel.html, PUCV2English/CorreoRechazoPorNivel.html |
| 2 | Create RechazoPorNivel.ts with render and send functions | 29bffb8 | src/RechazoPorNivel.ts |

## Verification Results

- `diff src/CorreoRechazoPorNivel.html PUCV2English/CorreoRechazoPorNivel.html` — no output (files identical)
- Both `enviarCorreosRechazoPorNivel` and `renderCorreoRechazoPorNivel` present in RechazoPorNivel.ts
- Both `correoRechazaEnviado` and `nivelInsuficiente` column references present
- `npm run build` exits with code 0 — TypeScript compiles cleanly

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The implementation is complete. `enviarCorreosRechazoPorNivel()` is wired to real sheet columns from Plan 03-01. The only remaining step is adding a menu item in Plan 04 (Menu.ts).

## Self-Check

- [x] src/RechazoPorNivel.ts exists
- [x] src/CorreoRechazoPorNivel.html exists and contains `<?= nombre ?>`, `<?= nivel ?>`, `alexis.ponce@pucv.cl`, `max-width: 600px`
- [x] PUCV2English/CorreoRechazoPorNivel.html exists and is identical to src/
- [x] Commits 4697f2d and 29bffb8 present in git log
- [x] npm run build exits 0
