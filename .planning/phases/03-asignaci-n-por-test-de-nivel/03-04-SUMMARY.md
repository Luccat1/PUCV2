---
phase: 03-asignaci-n-por-test-de-nivel
plan: 04
subsystem: email
tags: [google-apps-script, html-template, menu, correo-inicio-clases, rechazo-por-nivel]

# Dependency graph
requires:
  - phase: 03-02
    provides: ListaFinal level-resolution logic and VALID_LEVELS routing
  - phase: 03-03
    provides: RechazoPorNivel.ts enviarCorreosRechazoPorNivel() function and CorreoRechazoPorNivel.html template

provides:
  - CorreoInicioClases.html unified nivel-assignment phrase (D-08) inserted before highlight box
  - Menu.ts wiring for enviarCorreosRechazoPorNivel under Enviar Correos submenu (D-12)

affects:
  - GAS deployment — both files must be re-deployed after this plan
  - Phase 3 human verification checkpoint (Task 3)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GAS HTML template scriptlets: <?= variable ?> used for level interpolation in email body"
    - "GAS menu chain: .addItem(label, callbackString) routes to top-level function by name"

key-files:
  created: []
  modified:
    - src/CorreoInicioClases.html
    - src/Menu.ts

key-decisions:
  - "Used existing '<?= nivel ?>' variable in CorreoInicioClases.html — no new template variable needed, nivel is already injected by renderCorreoInicioClases() in InicioClases.ts"
  - "New rejection menu item placed before '🏫 Inicio de Clases' after last separator, as specified in D-12"

patterns-established:
  - "Nivel phrase pattern: 'De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel <strong><?= nivel ?></strong>.'"

requirements-completed: [NIVEL-05, NIVEL-07]

# Metrics
duration: 5min
completed: 2026-08-05
---

# Phase 03 Plan 04: Integration Wiring (CorreoInicioClases + Menu) Summary

**Nivel-assignment phrase inserted into class-start email template and rejection-email menu item wired in Menu.ts, completing all Phase 3 integration points**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-05T22:56:49Z
- **Completed:** 2026-08-05T23:01:00Z
- **Tasks:** 2 of 3 completed (Task 3 is human-verify checkpoint — awaiting GAS deployment)
- **Files modified:** 2

## Accomplishments

- Inserted the unified nivel-assignment paragraph into `src/CorreoInicioClases.html` before the `.highlight` div, using the existing `<?= nivel ?>` scriptlet (no new variable needed)
- Added `'❌ Rechazo por Nivel Insuficiente'` menu item to the `Enviar Correos` submenu in `Menu.ts`, calling `enviarCorreosRechazoPorNivel` — immediately before `'🏫 Inicio de Clases'` after the last separator
- Build verified passing (`npm run build` exits 0) after both changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Insert nivel-assignment phrase into CorreoInicioClases.html** - `7e9ff24` (feat)
2. **Task 2: Add rejection email menu item to Menu.ts** - `ee6586a` (feat)
3. **Task 3: Human verify — Phase 3 complete** - awaiting human verification (checkpoint:human-verify)

## Files Created/Modified

- `src/CorreoInicioClases.html` - Added nivel-assignment paragraph between greeting and highlight box (6 lines inserted)
- `src/Menu.ts` - Added one `.addItem` call for rejection email before `abrirDialogoInicioClases` (1 line inserted)

## Decisions Made

- Used existing `<?= nivel ?>` variable in `CorreoInicioClases.html` — no new variable needed. `nivel` is already injected by `renderCorreoInicioClases()` in `InicioClases.ts`.
- New rejection menu item placed immediately before `'🏫 Inicio de Clases'` after the last separator, as specified in D-12 and confirmed by existing submenu structure.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - both changes are fully wired to existing implementations (no placeholder data, no TODO stubs).

## Issues Encountered

None.

## User Setup Required

GAS deployment required after this plan (manual copy-paste):
- `PUCV2English/PUCV2.js` (compiled from TypeScript — includes Menu.ts and InicioClases.ts changes)
- `PUCV2English/CorreoInicioClases.html` (template with new nivel paragraph)

See Task 3 how-to-verify for complete deployment and test steps.

## Next Phase Readiness

- All Phase 3 (NIVEL-01 through NIVEL-07) code changes are complete pending human verification
- GAS test functions to run: `testRenderCorreoInicioClases_FraseNivel()`, `testGenerarListaFinal_NivelValido()`, `testEnviarCorreosRechazoPorNivel_Idempotencia()`
- Menu visibility verification required in live Google Sheet
- Phase 2 (Informe Ejecutivo PDF) is the next phase after Phase 3 verification passes

---
*Phase: 03-asignaci-n-por-test-de-nivel*
*Completed: 2026-08-05*
