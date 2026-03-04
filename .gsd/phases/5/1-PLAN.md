---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet

## Objective

The `PROGRAM_DATA` object in `Config.ts` (lines 191-202) hardcodes dates, deadlines, and class schedules directly in TypeScript. This means any change (e.g., a new semester) requires a code push. This plan moves all program-specific data to the `Configuración` sheet so administrators can update it without touching code.

## Context

- .gsd/SPEC.md (REQ-04: configurable parameters)
- .gsd/ARCHITECTURE.md (Config.ts responsibilities)
- src/Config.ts (PROGRAM_DATA object, lines 191-202)
- src/Correos.ts (uses PROGRAM_DATA for email templates)

## Tasks

<task type="auto">
  <name>Add "Datos Programa" section to the Configuración sheet loader</name>
  <files>src/Config.ts, src/Evaluacion.ts</files>
  <action>
    1. Add a new function `cargarDatosPrograma()` in Config.ts that:
       - Reads a "Datos Programa" named range or a dedicated section in the `Configuración` sheet
       - Falls back to the hardcoded `PROGRAM_DATA` defaults if the sheet section doesn't exist
       - Updates the global `PROGRAM_DATA` variable
    2. Call `cargarDatosPrograma()` inside `cargarConfiguracionDesdeHoja()` in Evaluacion.ts so it loads alongside scoring weights
    3. Keep the hardcoded `PROGRAM_DATA` as `DEFAULT_PROGRAM_DATA` (same pattern as `DEFAULT_SCORING_PARAMS`)
    4. Make `PROGRAM_DATA` a `let` instead of `const`

    IMPORTANT:
    - Do NOT change the shape of `PROGRAM_DATA` — only the source
    - Ensure fallback so existing deployments don't break
  </action>
  <verify>npx tsc --noEmit (zero errors)</verify>
  <done>PROGRAM_DATA loads from sheet when section exists, falls back to defaults otherwise. TypeScript compiles cleanly.</done>
</task>

<task type="auto">
  <name>Update SidebarConfig to include Datos Programa editing</name>
  <files>src/SidebarConfig.html</files>
  <action>
    1. Add a new collapsible section "Datos del Programa" below the existing scoring weights section
    2. Include editable fields for: FECHA_LIMITE, FECHA_INICIO, FECHA_TERMINO
    3. Include a simple table for HORARIOS (level → cátedra + ayudantía)
    4. Wire the save logic to call `saveConfiguracion()` which now also persists program data

    IMPORTANT:
    - Match the existing UI style (same CSS classes, same interaction patterns)
    - Keep the section collapsed by default to not overwhelm the user
  </action>
  <verify>Visual inspection of sidebar in browser or manual review of HTML structure</verify>
  <done>SidebarConfig.html has a "Datos del Programa" section with editable fields for dates and schedules.</done>
</task>

## Success Criteria

- [ ] `PROGRAM_DATA` is loaded from the `Configuración` sheet at runtime
- [ ] Hardcoded defaults remain as fallback
- [ ] Sidebar allows editing program dates and schedules
- [ ] TypeScript compiles with zero errors
