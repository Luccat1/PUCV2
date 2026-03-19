---
phase: 01-correo-inicio-de-clases
plan: 03
subsystem: DialogSalas.html, CorreoInicioClases.html, Menu.ts wiring
tags: [end-to-end, email-batch, modal-dialog, menu-integration]
dependency_graph:
  requires:
    - 01-01 (InicioClases.ts backend)
    - 01-02 (InicioClases.ts, TestInicioClases.ts)
  provides:
    - Complete user-facing flow for class-start email batch
    - Menu entry accessible from "Enviar Correos > Inicio de Clases"
    - Two-step dialog: sala input → confirmation → send
  affects:
    - Sheet menu (Menu.ts onOpen)
    - GAS deployment (HTML files required in GAS editor)
tech_stack:
  added:
    - DialogSalas.html (4-state modal dialog, 390 lines)
    - CorreoInicioClases.html (email template, 8 template variables)
  patterns:
    - Two-step dialog via google.script.run with state management
    - GAS scriptlet syntax (<?= variable ?>) for email rendering
    - Modal dialog with spinner states and error handling
key_files:
  created:
    - src/DialogSalas.html
    - PUCV2English/DialogSalas.html
    - src/CorreoInicioClases.html
    - PUCV2English/CorreoInicioClases.html
  modified:
    - src/Menu.ts
decisions:
  - Sala entered manually in modal (not pre-populated) — admin specifies per-run
  - Email template uses fallback "<?= sala || '[SALA NO INGRESADA]'" for missing sala
  - Menu item placed in "Enviar Correos" submenu with separator (consistent with other batch emails)
  - HTML files created in both src/ and PUCV2English/ as identical copies (not auto-synced by build)
metrics:
  plan_duration: 5 minutes
  completed_date: 2026-03-19
  tasks_completed: 2/2
  files_created: 4
  files_modified: 1
  total_lines_added: 553
---

# Phase 01 Plan 03: DialogSalas.html and CorreoInicioClases.html Summary

Create two-step sala collection dialog and email template for class-start notification batch.

## Objective

Wire the end-to-end user flow for "Enviar Correos > Inicio de Clases": admin opens menu entry, dialog appears asking for salas, preview shows mapping, send button executes the batch. HTML files are deployed to GAS manually (not synced by build pipeline). Without these files, the backend from plan 02 is unreachable.

## Execution Summary

**All tasks completed successfully.** Plan 01-03 achieved 2/2 task completion with zero deviations.

### Task 1: Create DialogSalas.html

**Status:** COMPLETE

Created a four-state modal dialog in `src/DialogSalas.html` and identical copy in `PUCV2English/DialogSalas.html`:

- **State: LOADING** — Spinner while fetching active levels via `google.script.run.getNivelesActivos()`
- **State: FORM** — Dynamic inputs for each level (one label + input field per nivel)
- **State: PREVIEW** — Shows confirmation string from `guardarSalasYObtenerPreview(salas)` with Back and Confirm buttons
- **State: RESULT** — Shows final status (success or error) with Close button

**Implementation details:**
- Roboto font, #0055a2/#003366 color scheme matching DialogConfirmEval.html
- Client-side state management via `showState(name)` function
- Spinner styling with CSS animation
- Button groups with primary/secondary styling
- All three server-side function calls present:
  1. `getNivelesActivos()` — called on window.onload
  2. `guardarSalasYObtenerPreview(salas)` — called in submitSalas()
  3. `enviarCorreosInicioClases()` — called in confirmarEnvio()
- Input validation: alerts if any nivel is missing sala before proceeding
- Error handling via `withFailureHandler` for each async call

**Verification:**
- grep "getNivelesActivos|guardarSalasYObtenerPreview|enviarCorreosInicioClases" src/DialogSalas.html — 3 matches
- grep "state-loading|state-form|state-preview|state-result" src/DialogSalas.html — 4 matches
- diff src/DialogSalas.html PUCV2English/DialogSalas.html — no output (identical)
- Commit: a95a9b1

### Task 2: Create CorreoInicioClases.html and wire Menu.ts

**Status:** COMPLETE

**Part A — Email Template (`src/CorreoInicioClases.html`)**

Created GAS email template with PUCV branding, modeled on CorreoSeleccionado.html:

- Header with PUCV logo (centered)
- Greeting: "Estimado/a <?= nombre ?>,"
- Body paragraph informing student classes start on <?= fechaInicio ?>
- Highlight box containing 6 list items with template variables:
  - Nivel: `<?= nivel ?>`
  - Sala: `<?= sala || '[SALA NO INGRESADA]' ?>` (with fallback)
  - Cátedras: `<?= catedra ?>`
  - Ayudantía: `<?= ayudantia ?>`
  - Inicio: `<?= fechaInicio ?>`
  - Término: `<?= fechaTermino ?>`
- Reminder about 80% attendance requirement
- Closing: "Saludos cordiales, Coordinación PUCV2English"
- Footer: "Pontificia Universidad Católica de Valparaíso"

**Template variables (8 total):**
1. nombre (student full name)
2. nivel (e.g., "B2.1")
3. catedra (e.g., "Lunes y Miércoles 17:45-18:55")
4. ayudantia (e.g., "Jueves 17:45-18:55")
5. sala (e.g., "Sala 101", with fallback text)
6. fechaInicio (e.g., "23 de marzo de 2026")
7. fechaTermino (e.g., "2 de julio de 2026")
8. (indirectly through layout; all 7 distinct variables shown)

**Part B — Menu.ts Updates**

Two targeted edits to `src/Menu.ts`:

1. **Menu item insertion** (line 27-28):
   - Added separator and new item in "Enviar Correos" submenu
   - `.addSeparator()` + `.addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases')`
   - Placed before closing parenthesis of submenu

2. **Function addition** (after line 131):
   - Added `abrirDialogoInicioClases()` function
   - Opens DialogSalas.html in a modal dialog (480x500 px)
   - Dialog title: "Configurar Salas — Inicio de Clases"
   - Calls `HtmlService.createHtmlOutputFromFile('DialogSalas')`

**Identical copy in PUCV2English/CorreoInicioClases.html:**
- diff src/CorreoInicioClases.html PUCV2English/CorreoInicioClases.html — no output

**Verification:**
- grep "abrirDialogoInicioClases" src/Menu.ts — 2 matches (addItem + function definition)
- grep "createHtmlOutputFromFile('DialogSalas')" src/Menu.ts — 1 match
- grep "<?= sala" src/CorreoInicioClases.html — 1 match with || fallback
- grep "<?= nombre|<?= catedra|<?= ayudantia|<?= fechaInicio|<?= fechaTermino" src/CorreoInicioClases.html — 6 matches (plus sala = 7 total)
- npm run build exits 0, zero TypeScript errors
- Commit: bdc80f2

## Full End-to-End Verification

All success criteria from plan met:

1. npm run build exits 0 ✓
2. DialogSalas.html exists in src/ and PUCV2English/ with all three google.script.run calls ✓
3. CorreoInicioClases.html exists in src/ and PUCV2English/ with all 7 template variables using <?= syntax ✓
4. src/ and PUCV2English/ copies are identical for both HTML files ✓
5. Menu.ts has '🏫 Inicio de Clases' addItem pointing to abrirDialogoInicioClases ✓
6. abrirDialogoInicioClases() function exists and calls createHtmlOutputFromFile('DialogSalas') ✓

## Deviations from Plan

None — plan executed exactly as written.

## Deployment Notes

The following files must be manually added to the GAS editor (File > New > HTML file) with exactly these names before the feature works in production:

- **DialogSalas** — copy content from PUCV2English/DialogSalas.html
- **CorreoInicioClases** — copy content from PUCV2English/CorreoInicioClases.html

The build pipeline does not auto-sync HTML files to GAS; they are static assets maintained separately.

## Technical Highlights

- **Async state machine:** Dialog manages 4 visual states via CSS display toggling, eliminating modal reloads
- **Responsive preview:** guardarSalasYObtenerPreview() returns human-readable confirmation, enabling informed decisions
- **Error resilience:** Both google.script.run calls use withFailureHandler; network errors displayed in result box
- **Validation:** Client-side check ensures all sala fields filled before server call; server-side re-validation in guardarSalasYObtenerPreview()
- **Consistent UX:** Colors, fonts, button styles match existing dialogs (DialogConfirmEval.html, DialogConfirmMailApp.html)

## Related

- Phase 01 Plan 01: RESEARCH.md — planning and coordination guidance
- Phase 01 Plan 02: InicioClases.ts, TestInicioClases.ts — server-side logic for getNivelesActivos(), guardarSalasYObtenerPreview(), enviarCorreosInicioClases()
- Phase 02: Will implement PDF report generation and integration with sala + notification tracking
