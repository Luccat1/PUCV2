---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: Management, Email, and Interface Modules

## Objective
Complete the modular migration by creating the remaining 5 modules: Seleccionados, ListaFinal, Correos, WebApp, and Menu. Also migrate the 4 HTML email templates to the new `src/` directory.

## Context
- `.gsd/SPEC.md` — Requirements
- `.gsd/ARCHITECTURE.md` — Component breakdown
- `src/Config.ts` — Created in Plan 1.1
- `src/Utils.ts` — Created in Plan 1.1
- `src/Evaluacion.ts` — Created in Plan 1.2
- `src/Dashboard.ts` — Created in Plan 1.2
- `PUCV2English/PUCV2.js` lines 646-730 — Selected list generation
- `PUCV2English/PUCV2.js` lines 992-1000 — doGet
- `PUCV2English/PUCV2.js` lines 1024-1252 — Email engine
- `PUCV2English/PUCV2.js` lines 1295-1399 — Waitlist management
- `PUCV2English/PUCV2.js` lines 1401-1482 — Final list generation
- `PUCV2English/PUCV2.js` lines 1484-1680 — Web app data API
- `PUCV2English/index.html` — Web app UI
- `PUCV2English/Correo*.html` — 4 email templates

## Tasks

<task type="auto">
  <name>1. Create Seleccionados.ts + ListaFinal.ts</name>
  <files>
    - src/Seleccionados.ts (NEW)
    - src/ListaFinal.ts (NEW)
  </files>
  <action>
    **Seleccionados.ts** — Extract from PUCV2.js:

    1. `generarHojaSeleccionados(resultados: any[][], spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): void`
       - Extract from lines 646-730 of evaluarPostulacionesPUCV2
       - Sorting logic (primary: score desc, secondary: date asc)
       - Top 25 selection
       - Write to "Seleccionados" sheet with dropdown validations
       - Conditional formatting (green=Acepta, red=Rechaza)
       - Use columnaALetra() from Utils.ts

    2. `gestionarListaDeEspera(e: GoogleAppsScript.Events.SheetsOnEdit): void` (lines 1295-1399)
       - Extract as standalone function
       - Use getSpreadsheet() instead of openById()
       - This is the onEdit trigger handler

    **ListaFinal.ts** — Extract from PUCV2.js:

    3. `generarListaFinalCurso(): string` (lines 1401-1482)
       - Extract as standalone function
       - Use getSpreadsheet()
       - Filter accepted applicants with assigned levels
       - Organize by level
  </action>
  <verify>
    - generarHojaSeleccionados creates dropdowns and conditional formatting
    - gestionarListaDeEspera handles onEdit events
    - generarListaFinalCurso filters and organizes by level
    - `npx tsc --noEmit -p src/tsconfig.json` passes
  </verify>
  <done>
    Seleccionados.ts and ListaFinal.ts compile cleanly with all selection, waitlist, and final list functions extracted and typed.
  </done>
</task>

<task type="auto">
  <name>2. Create Correos.ts + WebApp.ts + Menu.ts</name>
  <files>
    - src/Correos.ts (NEW)
    - src/WebApp.ts (NEW)
    - src/Menu.ts (NEW)
  </files>
  <action>
    **Correos.ts** — Extract from PUCV2.js:

    1. `getRecipients(type: string): any[]` (lines 1034-1093)
    2. `previewEmailBatch(type: string): string` (lines 1095-1113)
    3. `sendEmailBatch(type: string): string` (lines 1115-1188)
    4. `sendTestEmail(targetEmail: string, type: string): string` (lines 1190-1252)
    5. `ejecutarEnvioCorreosDesdeWebApp(): string` (lines 1024-1032)

    All use getSpreadsheet() instead of openById().
    All reference PROGRAM_DATA from Config.ts.

    **WebApp.ts** — Extract from PUCV2.js:

    6. `doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput` (lines 992-1000)
       - Serves index.html
    7. `getSelectionData(): object` (lines 1484-1625)
       - Returns JSON with seleccionados, listaDeEspera, estadisticas
    8. `updateApplicantStatus(correo: string, verificacion: string, nivel: string): string` (lines 1627-1680)

    All use getSpreadsheet().

    **Menu.ts** — NEW module (not in original code):

    9. `onOpen(): void`
       - Creates custom menu "PUCV2English" in Sheets menubar
       - Menu items:
         - "📊 Evaluar Postulaciones" → evaluarPostulacionesPUCV2
         - "📋 Generar Lista Final" → generarListaFinalCurso
         - "📧 Enviar Correos" → (submenu for each type)
         - "📈 Ver Análisis" → ejecutarAnalisisDesdeWebApp
         - "⚙️ Verificar Permisos" → forceWebAppPermissions
    10. `forceReauthorization(): void` (lines 1254-1276)
    11. `forceWebAppPermissions(): string` (lines 1278-1293)
  </action>
  <verify>
    - Correos.ts has all 5 email functions typed
    - WebApp.ts has doGet, getSelectionData, updateApplicantStatus typed
    - Menu.ts has onOpen with menu structure
    - `npx tsc --noEmit -p src/tsconfig.json` passes
  </verify>
  <done>
    Correos.ts, WebApp.ts, and Menu.ts compile cleanly with all email, web app, and menu functions extracted and typed.
  </done>
</task>

<task type="auto">
  <name>3. Migrate HTML templates and verify full compilation</name>
  <files>
    - src/index.html (COPY + CLEAN)
    - src/CorreoSeleccionado.html (COPY)
    - src/CorreoTestNivel.html (COPY)
    - src/CorreoListaEspera.html (COPY)
    - src/CorreoNoSeleccionado.html (COPY)
  </files>
  <action>
    1. Copy all 5 HTML files from `PUCV2English/` to `src/`
    2. In `src/index.html`:
       - Fix duplicate `.withSuccessHandler()` calls (lines 458-459, 467-468)
       - Keep all existing functionality intact
    3. Verify the complete project compiles:
       - `npx tsc --noEmit -p src/tsconfig.json` must pass with zero errors
    4. Create a summary of all files in `src/` and their line counts
    5. Do NOT delete the original `PUCV2English/` directory — keep as reference
  </action>
  <verify>
    - All 5 HTML files present in src/
    - Duplicate withSuccessHandler bug fixed in index.html
    - `npx tsc --noEmit -p src/tsconfig.json` passes with ZERO errors across ALL .ts files
    - Total module count: 7 .ts files + 5 .html files = 12 files in src/
  </verify>
  <done>
    All HTML templates migrated. Full TypeScript compilation passes with zero errors. The complete modular migration is done.
  </done>
</task>

## Success Criteria
- [ ] Seleccionados.ts + ListaFinal.ts: selection, waitlist, and final list functions
- [ ] Correos.ts: all email functions typed
- [ ] WebApp.ts: doGet, data API, status update
- [ ] Menu.ts: onOpen with full menu structure
- [ ] All 5 HTML files in src/ with duplicate handler bug fixed
- [ ] `npx tsc --noEmit -p src/tsconfig.json` passes with zero errors for ALL modules
- [ ] 12 files total in src/ (7 .ts + 5 .html)
