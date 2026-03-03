---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Project Scaffolding + Core Modules

## Objective
Set up the clasp project structure with TypeScript, and create the foundational modules (`Config.ts`, `Utils.ts`) that all other modules depend on. This establishes the project skeleton that waves 2 builds upon.

## Context
- `.gsd/SPEC.md` — Requirements and vision
- `.gsd/ARCHITECTURE.md` — Current component analysis
- `.gsd/DECISIONS.md` — ADR-004 to ADR-007
- `.gsd/phases/1/RESEARCH.md` — clasp + TypeScript setup details
- `PUCV2English/PUCV2.js` lines 1–75 — CONFIG object, utility functions, logging

## Tasks

<task type="auto">
  <name>1. Initialize clasp project with TypeScript</name>
  <files>
    - src/.clasp.json (NEW)
    - src/appsscript.json (NEW)
    - src/tsconfig.json (NEW)
    - package.json (NEW)
    - .claspignore (NEW)
  </files>
  <action>
    1. Create a `src/` directory in the project root to house all GAS source code
    2. Create `package.json` at project root with:
       - `@types/google-apps-script` as devDependency
       - `typescript` as devDependency
       - `@google/clasp` as devDependency (for local usage)
       - Scripts: `push` → `cd src && npx clasp push`, `pull` → `cd src && npx clasp pull`, `watch` → `cd src && npx clasp push --watch`
    3. Create `src/appsscript.json` with:
       - `timeZone`: "America/Santiago"
       - `runtimeVersion`: "V8"
       - `webapp.executeAs`: "USER_DEPLOYING", `webapp.access`: "MYSELF"
       - `oauthScopes`: GmailApp, SpreadsheetApp, ScriptApp, PropertiesService, LockService, HtmlService
    4. Create `src/tsconfig.json` for GAS with:
       - `lib`: ["esnext"], `target`: "ESNext", `strict`: true
       - No module system (GAS concatenates files)
    5. Create `.claspignore` to exclude non-source files
    6. Do NOT run `clasp clone` yet — the user will need to authenticate first interactively
    7. Create a `SETUP_GUIDE.md` at project root with step-by-step clasp login + clone instructions

    IMPORTANT: Do NOT use `import/export` in TypeScript files — GAS treats all files as global scope.
    Use simple function declarations and `const`/`var` at file level.
  </action>
  <verify>
    - `package.json` exists with correct dependencies
    - `src/appsscript.json` is valid JSON with correct runtime
    - `src/tsconfig.json` is valid and configured for GAS
    - `SETUP_GUIDE.md` has clear, step-by-step instructions
  </verify>
  <done>
    Project scaffolding complete: package.json, appsscript.json, tsconfig.json, .claspignore, SETUP_GUIDE.md all present and valid.
  </done>
</task>

<task type="auto">
  <name>2. Create Config.ts — centralized configuration and types</name>
  <files>
    - src/Config.ts (NEW)
  </files>
  <action>
    Extract from `PUCV2English/PUCV2.js`:

    1. Define TypeScript interfaces:
       - `IConfig` — Shape of the CONFIG object (sheets, columns)
       - `IScoringParams` — Shape of SCORING_PARAMS with nested weights
       - `IProgramData` — Shape of PROGRAM_DATA (dates, schedules)
       - `IApplicantResult` — Structure for a processed applicant row
       - `IStatistics` — Shape returned by calcularEstadisticas
       - `ApplicantStatus` — Union type: 'Pendiente' | 'Seleccionado' | 'Notificado' | 'Acepta' | 'Rechaza' | 'Excluido'

    2. Create `CONFIG` constant (from lines 3-47 of PUCV2.js):
       - REMOVE `SHEET_ID` entirely (ADR-005: bind to active spreadsheet)
       - Keep `SHEETS` mapping (all 6 sheet names)
       - Keep `COLUMNS` mapping (all 30+ column headers)

    3. Create `SCORING_PARAMS` constant (from lines 131-167):
       - Extract from inside evaluarPostulacionesPUCV2() to global scope
       - Type it with `IScoringParams`
       - Make it `let` not `const` so cargarConfiguracionDesdeHoja can modify it

    4. Create `PROGRAM_DATA` constant (from lines 1010-1022):
       - Extract dates, schedules
       - Type it with `IProgramData`

    IMPORTANT: No imports/exports — everything is global. Use clear naming to avoid collisions.
  </action>
  <verify>
    - All interfaces are defined with proper types
    - CONFIG has no SHEET_ID
    - SCORING_PARAMS is at global scope, not nested
    - PROGRAM_DATA is extracted
    - TypeScript compiles without errors: `npx tsc --noEmit -p src/tsconfig.json`
  </verify>
  <done>
    Config.ts compiles cleanly with all types, CONFIG (without SHEET_ID), SCORING_PARAMS, and PROGRAM_DATA defined at module level.
  </done>
</task>

<task type="auto">
  <name>3. Create Utils.ts — shared utility functions</name>
  <files>
    - src/Utils.ts (NEW)
  </files>
  <action>
    Extract from `PUCV2English/PUCV2.js`:

    1. `esEstudiante(tipoPostulante: string): boolean` (line 49-52)
    2. `esSi(valor: string): boolean` — extracted from inline lambda (line 114)
    3. `obtenerValor(fila: any[], titulo: string, indiceColumnas: Record<string, number>): string`
       - Extract from nested function (lines 105-112)
       - CHANGE: Accept `indiceColumnas` as parameter instead of closure variable
    4. `contarPalabrasClave(texto: string, palabrasClave: string[]): number` (lines 116-119)
    5. `logToWebApp(message: string): void` (lines 58-64)
    6. `getWebAppLogs(): string[]` (lines 70-75)
    7. `columnaALetra(columna: number): string` (lines 771-779)
       - Rename from `_columnaALetra` — remove underscore prefix
    8. `getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet`
       - NEW helper: returns `SpreadsheetApp.getActiveSpreadsheet()` (ADR-005)
       - Falls back to opening by ID if not container-bound (for testing)

    All functions must have JSDoc comments with @param and @return.
    All functions must be typed with TypeScript.
  </action>
  <verify>
    - All 8 functions exist with proper TypeScript signatures
    - No closures over external state — all dependencies are parameters
    - JSDoc comments present
    - TypeScript compiles without errors: `npx tsc --noEmit -p src/tsconfig.json`
  </verify>
  <done>
    Utils.ts compiles cleanly with all shared utilities extracted, typed, and documented.
  </done>
</task>

## Success Criteria
- [ ] Project scaffolding: package.json, appsscript.json, tsconfig.json present
- [ ] SETUP_GUIDE.md with clear clasp login/clone instructions
- [ ] Config.ts compiles with all types, CONFIG (no SHEET_ID), SCORING_PARAMS, PROGRAM_DATA
- [ ] Utils.ts compiles with all 8 utility functions typed and documented
- [ ] `npx tsc --noEmit -p src/tsconfig.json` passes with zero errors
