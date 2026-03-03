---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Configuration Sidebar + Server-Side Functions

## Objective
Create an HTML sidebar that lets reviewers view and edit scoring weights for the evaluation engine, and new server-side functions to read/write the `Configuración` sheet. This fulfills REQ-04 and REQ-14.

## Context
- `src/Config.ts` — IScoringParams type, SCORING_PARAMS variable
- `src/Evaluacion.ts` — cargarConfiguracionDesdeHoja() reads the config sheet
- `src/Menu.ts` — onOpen() menu structure (needs new item)
- `.gsd/phases/2/RESEARCH.md` — Sidebar API patterns

## Tasks

<task type="auto">
  <name>1. Create SidebarConfig.html — scoring weights editor</name>
  <files>
    - src/SidebarConfig.html (NEW)
  </files>
  <action>
    Create a 300px-wide sidebar HTML file for editing scoring weights.

    **UI Structure:**
    - Header: "⚙️ Configuración de Pesos"
    - 3 collapsible sections, one per criteria category:
      1. **Uso de Inglés** — 3 weight sliders/inputs (estudiante, funcionario, académico) + MaxPuntaje
      2. **Internacionalización** — 3 weight sliders/inputs + MaxPuntaje
      3. **Carta de Respaldo** — 3 weight inputs
    - Each input: label above, number input with step=0.25, range 0-5
    - "Guardar" button at bottom → calls server saveConfiguracion()
    - "Restaurar Valores por Defecto" secondary button → calls server resetConfiguracion()
    - Loading state while saving
    - Success/error feedback message

    **Styling:**
    - Font: Roboto (Google Fonts CDN)
    - Colors: PUCV palette (#003366 headers, #0055a2 buttons, #e9f2fa backgrounds)
    - Compact layout for 300px width
    - Collapsible sections using CSS (no JS framework)

    **Client-side JS:**
    - On load: `google.script.run.withSuccessHandler(populate).getConfiguracion()`
    - On save: collect all inputs → `google.script.run.withSuccessHandler(showSuccess).saveConfiguracion(data)`
    - On reset: `google.script.run.withSuccessHandler(populate).resetConfiguracion()`
  </action>
  <verify>
    - HTML file exists at src/SidebarConfig.html
    - Contains 3 sections with labeled number inputs
    - Contains google.script.run calls for getConfiguracion, saveConfiguracion, resetConfiguracion
    - Uses PUCV color palette
  </verify>
  <done>
    SidebarConfig.html is created with a complete form layout, PUCV styling, and client-side JS that communicates with server functions.
  </done>
</task>

<task type="auto">
  <name>2. Create server-side config functions + update Menu.ts</name>
  <files>
    - src/Evaluacion.ts (MODIFY — add getConfiguracion, saveConfiguracion, resetConfiguracion)
    - src/Menu.ts (MODIFY — add sidebar menu items)
  </files>
  <action>
    **In Evaluacion.ts**, add 3 new functions:

    1. `getConfiguracion(): object`
       - Read from "Configuración" sheet
       - Return current weights as JSON object matching the sidebar form structure
       - If sheet is empty, return defaults from SCORING_PARAMS

    2. `saveConfiguracion(data: any): string`
       - Receive JSON object from sidebar
       - Write to "Configuración" sheet in Criterio|Perfil|Peso format
       - Clear existing data first, then write new rows
       - Also update in-memory SCORING_PARAMS
       - Return success message

    3. `resetConfiguracion(): object`
       - Clear "Configuración" sheet
       - Reset SCORING_PARAMS to hardcoded defaults
       - Return the default values (same format as getConfiguracion)

    **In Menu.ts**, update `onOpen()`:
    - Add new menu items before the separator:
      - "⚙️ Configurar Pesos de Evaluación" → `abrirSidebarConfig`
      - "👁️ Revisar Postulaciones" → `abrirSidebarRevision` (placeholder for Plan 2.2)
    - Add wrapper function `abrirSidebarConfig()`:
      - Creates HtmlOutput from 'SidebarConfig'
      - Sets title "Configuración de Pesos"
      - Shows via `SpreadsheetApp.getUi().showSidebar()`
    - Add placeholder wrapper `abrirSidebarRevision()` (opens placeholder alert)
  </action>
  <verify>
    - getConfiguracion returns JSON with UsoIngles, Internacionalizacion, CartaRespaldo weights
    - saveConfiguracion writes to "Configuración" sheet
    - resetConfiguracion clears sheet and returns defaults
    - Menu has "Configurar Pesos" and "Revisar Postulaciones" items
    - `npx tsc -p src/tsconfig.json --noEmit` passes
  </verify>
  <done>
    Server-side config CRUD functions work correctly. Menu updated with sidebar launchers. TypeScript compiles cleanly.
  </done>
</task>

## Success Criteria
- [ ] SidebarConfig.html with complete form UI and client-side JS
- [ ] 3 server-side functions: getConfiguracion, saveConfiguracion, resetConfiguracion
- [ ] Menu.ts updated with new sidebar items
- [ ] `npx tsc -p src/tsconfig.json --noEmit` passes
