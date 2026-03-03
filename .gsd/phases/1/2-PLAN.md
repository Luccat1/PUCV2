---
phase: 1
plan: 2
wave: 2
---

# Plan 1.2: Evaluation Engine + Dashboard Migration

## Objective
Migrate the core evaluation engine and dashboard generation from the monolithic `evaluarPostulacionesPUCV2()` function into two clean TypeScript modules. This is the most complex migration piece — the 700-line function becomes two focused modules.

## Context
- `.gsd/SPEC.md` — Requirements
- `.gsd/ARCHITECTURE.md` — Component breakdown
- `.gsd/DECISIONS.md` — ADR-006 (config load order fix)
- `src/Config.ts` — Created in Plan 1.1 (types, CONFIG, SCORING_PARAMS)
- `src/Utils.ts` — Created in Plan 1.1 (shared utilities)
- `PUCV2English/PUCV2.js` lines 77–765 — evaluarPostulacionesPUCV2 function
- `PUCV2English/PUCV2.js` lines 781–983 — getAnalysisReport function

## Tasks

<task type="auto">
  <name>1. Create Evaluacion.ts — scoring functions + orchestrator</name>
  <files>
    - src/Evaluacion.ts (NEW)
  </files>
  <action>
    Extract and refactor from `PUCV2English/PUCV2.js`:

    1. **Scoring functions** (extract from inside evaluarPostulacionesPUCV2):
       - `calcularPuntajeTipoPostulante(texto: string): number` (lines 121-126)
       - `calcularPuntajeUsoIngles(fila: any[], tipoPostulante: string, indiceColumnas: Record<string, number>): number` (lines 217-256)
       - `calcularPuntajeInternacionalizacion(fila: any[], tipoPostulante: string, indiceColumnas: Record<string, number>): number` (lines 258-288)
       - `calcularPuntajeCertificado(fila: any[], indiceColumnas: Record<string, number>): number` (lines 290-302)
       - `calcularPuntajeAnioIngreso(fila: any[], tipoPostulante: string, indiceColumnas: Record<string, number>): number` (lines 304-320)
       - `cargarConfiguracionDesdeHoja(): void` (lines 172-213) — reads from Configuración sheet, updates SCORING_PARAMS

    2. **Main orchestrator** `evaluarPostulacionesPUCV2(): string`
       - Use `getSpreadsheet()` from Utils.ts instead of `SpreadsheetApp.openById()` (ADR-005)
       - FIX: Call `cargarConfiguracionDesdeHoja()` BEFORE the evaluation loop (ADR-006)
       - All nested functions now called as module-level functions
       - Pass `indiceColumnas` as parameter to scoring functions instead of closure
       - Keep LockService concurrency control
       - Keep row-level try/catch error handling
       - Keep incremental processing (skip already-processed rows)
       - After processing: call `generarYActualizarDashboard()` from Dashboard.ts
       - After processing: call `generarHojaSeleccionados()` from Seleccionados.ts (Plan 1.3)

    3. **Analysis function** `getAnalysisReport(): string` (lines 781-983)
       - Extract as standalone function
       - Use getSpreadsheet() instead of openById()

    KEY CHANGES from original:
    - All functions at module level (not nested)
    - indiceColumnas passed as parameter, not closure
    - obtenerValor, contarPalabrasClave, esSi from Utils.ts (global)
    - SCORING_PARAMS from Config.ts (global)
    - cargarConfiguracionDesdeHoja runs BEFORE loop
  </action>
  <verify>
    - All scoring functions have typed signatures
    - evaluarPostulacionesPUCV2 uses getSpreadsheet() not openById()
    - cargarConfiguracionDesdeHoja is called BEFORE the evaluation loop
    - No nested function declarations inside evaluarPostulacionesPUCV2
    - `npx tsc --noEmit -p src/tsconfig.json` passes
  </verify>
  <done>
    Evaluacion.ts compiles cleanly with all scoring functions extracted to module level, main orchestrator refactored, and config load order fixed.
  </done>
</task>

<task type="auto">
  <name>2. Create Dashboard.ts — statistics and visualization</name>
  <files>
    - src/Dashboard.ts (NEW)
  </files>
  <action>
    Extract from `PUCV2English/PUCV2.js` lines 322-508:

    1. `calcularEstadisticas(resultadosCompletos: any[][], datosOriginales: any[][], indicesOriginales: Record<string, number>): IStatistics`
       - Extract from inside evaluarPostulacionesPUCV2
       - Type the return value with IStatistics from Config.ts

    2. `formatearDatosDashboard(stats: IStatistics): any[][]`
       - Extract from inside evaluarPostulacionesPUCV2

    3. `crearGraficoSede(hojaDashboard: GoogleAppsScript.Spreadsheet.Sheet, statsPorSede: Record<string, {suma: number, contador: number}>): void`
       - Extract from inside evaluarPostulacionesPUCV2

    4. `generarYActualizarDashboard(resultadosCompletos: any[][], spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, datosOriginales: any[][], indicesOriginales: Record<string, number>): void`
       - Orchestrator that calls the above three functions
       - Use CONFIG.SHEETS.DASHBOARD for sheet name

    Also extract from lines 1002-1008:
    5. `ejecutarAnalisisDesdeWebApp(): string`
       - Wrapper that calls getAnalysisReport() from Evaluacion.ts

    All functions fully typed with GoogleAppsScript types.
  </action>
  <verify>
    - All 5 functions exist with proper TypeScript signatures
    - Uses GoogleAppsScript types for Sheet, Spreadsheet, Charts
    - References CONFIG and IStatistics from Config.ts
    - `npx tsc --noEmit -p src/tsconfig.json` passes
  </verify>
  <done>
    Dashboard.ts compiles cleanly with statistics, formatting, chart, and dashboard orchestrator functions extracted and typed.
  </done>
</task>

## Success Criteria
- [ ] Evaluacion.ts: all scoring functions at module level, properly typed
- [ ] Evaluacion.ts: evaluarPostulacionesPUCV2 uses getSpreadsheet(), config loads before loop
- [ ] Dashboard.ts: all stats/dashboard functions extracted and typed
- [ ] `npx tsc --noEmit -p src/tsconfig.json` passes with zero errors
