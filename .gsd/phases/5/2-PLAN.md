---
phase: 5
plan: 2
wave: 1
---

# Plan 5.2: TypeScript Strictness Pass + Correos.ts Hardening

## Objective

Run a strict TypeScript compilation pass to catch any remaining type issues, clean up leftover `any` types where practical, and address the hardcoded `fechaLimite` string in `Correos.ts` (line 110) which should now read from `PROGRAM_DATA`.

## Context

- src/Correos.ts (hardcoded fechaLimite on line 110)
- src/Config.ts (PROGRAM_DATA)
- src/Evaluacion.ts (duplicate JSDoc `@file` header removed in Phase 6)
- src/Seleccionados.ts (`@file` header removed in Phase 6 — may need re-adding)
- src/WebApp.ts (`@file` header removed in Phase 6 — may need re-adding)

## Tasks

<task type="auto">
  <name>Replace hardcoded fechaLimite in Correos.ts with PROGRAM_DATA</name>
  <files>src/Correos.ts</files>
  <action>
    1. On Correos.ts line ~110, replace:
       `(htmlBody as any).fechaLimite = "Viernes 12 de diciembre";`
       with:
       `(htmlBody as any).fechaLimite = PROGRAM_DATA.FECHA_LIMITE;`
    2. Ensure `Correos.ts` references `PROGRAM_DATA` (which is global from Config.ts)
    3. Restore `@file` JSDoc header to the top of the file if missing

    IMPORTANT:
    - Do NOT change email template HTML — only the data source
  </action>
  <verify>npx tsc --noEmit (zero errors); grep "PROGRAM_DATA" src/Correos.ts</verify>
  <done>fechaLimite is dynamically sourced from PROGRAM_DATA. No hardcoded dates remain in Correos.ts.</done>
</task>

<task type="auto">
  <name>Restore @file headers and add missing JSDoc across all modules</name>
  <files>src/Seleccionados.ts, src/WebApp.ts, src/Correos.ts, src/ListaFinal.ts</files>
  <action>
    1. Add `@file` JSDoc headers to files that lost them during Phase 6 edits:
       - `src/Seleccionados.ts`: `@file Seleccionados.ts — Manages selected applicants, waitlist, and sheet formatting.`
       - `src/WebApp.ts`: `@file WebApp.ts — Handlers for the Google Web App interface (doGet) and data APIs.`
    2. Add `@file` header to `src/ListaFinal.ts` if missing
    3. Ensure every exported/global function has at least a one-line JSDoc comment

    IMPORTANT:
    - Do NOT modify function logic — documentation only
  </action>
  <verify>grep -c "@file" src/*.ts (should equal number of .ts files); npx tsc --noEmit</verify>
  <done>All .ts files have @file headers. All global functions have JSDoc comments.</done>
</task>

## Success Criteria

- [ ] No hardcoded dates remain in Correos.ts
- [ ] All .ts files have `@file` JSDoc headers
- [ ] TypeScript compiles cleanly
