---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Pre-Evaluation Dialog + Menu Polish

## Objective
Create a modal dialog that shows current scoring configuration before running the evaluation, allowing last-minute confirmation or adjustment. Also finalize the complete menu structure for Phase 2 deliverables. This completes REQ-03 and strengthens REQ-14.

## Context
- `src/Menu.ts` — onOpen() with current menu structure
- `src/Evaluacion.ts` — evaluarPostulacionesPUCV2(), getConfiguracion() (from Plan 2.1)
- `src/SidebarConfig.html` — config form (created in Plan 2.1)

## Tasks

<task type="auto">
  <name>1. Create DialogConfirmEval.html — pre-evaluation confirmation </name>
  <files>
    - src/DialogConfirmEval.html (NEW)
  </files>
  <action>
    Create a modal dialog (600px × 450px) that appears BEFORE running evaluation.

    **UI Structure:**
    - Title: "Confirmar Evaluación"
    - Summary of current scoring weights (read-only table)
      - Shows all Criterio/Perfil/Peso values from the Configuración sheet
      - If no custom config exists, shows "(Valores por defecto)"
    - Warning box: "⚠️ Esto procesará todas las postulaciones nuevas. ¿Deseas continuar?"
    - Two buttons:
      - "✅ Ejecutar Evaluación" (primary, blue) → calls `confirmarYEjecutarEvaluacion()`
      - "❌ Cancelar" → `google.script.host.close()`
    - Optional: link to "⚙️ Cambiar pesos" that opens the sidebar (and closes the dialog)

    **Client-side JS:**
    - On load: `google.script.run.withSuccessHandler(displayConfig).getConfiguracion()`
    - On confirm: `google.script.run.withSuccessHandler(showResult).evaluarPostulacionesPUCV2()`
    - Show a loading spinner while evaluation runs
    - Display result message when done, with "Cerrar" button

    **Styling:** Same PUCV palette. Clean, professional look.
  </action>
  <verify>
    - HTML file exists at src/DialogConfirmEval.html
    - Contains config summary table, warning, and two action buttons
    - Uses google.script.run for getConfiguracion and evaluarPostulacionesPUCV2
  </verify>
  <done>
    DialogConfirmEval.html created with full pre-evaluation confirmation UI.
  </done>
</task>

<task type="auto">
  <name>2. Finalize Menu.ts — complete menu structure and dialog launcher</name>
  <files>
    - src/Menu.ts (MODIFY)
  </files>
  <action>
    Update `onOpen()` to have the FINAL menu structure for Phase 2:

    ```
    PUCV2English
    ├── 📊 Evaluar Postulaciones       → abrirDialogoEvaluacion (NEW — opens dialog)
    ├── 📋 Generar Lista Final          → generarListaFinalCurso
    ├── ──────────
    ├── 📧 Enviar Correos (submenu)     → (same as before)
    ├── ──────────
    ├── 👁️ Revisar Postulaciones        → abrirSidebarRevision
    ├── ⚙️ Configurar Pesos             → abrirSidebarConfig
    ├── ──────────
    ├── 📈 Ver Dashboard                → abrirDashboard
    ├── 📉 Ver Análisis de Equilibrio   → ejecutarAnalisisDesdeMenu
    ├── ──────────
    └── 🔧 Forzar Autorización          → forceWebAppPermissions
    ```

    Add `abrirDialogoEvaluacion()`:
    - Creates HtmlOutput from 'DialogConfirmEval'
    - Sets width 600, height 450
    - Shows via `showModalDialog(output, "Confirmar Evaluación")`

    NOTE: The old direct call to `evaluarPostulacionesPUCV2` from the menu is replaced by the dialog launcher. The evaluation itself is still called from the dialog's JS.
  </action>
  <verify>
    - onOpen has the complete final menu structure
    - abrirDialogoEvaluacion opens the confirmation dialog
    - evaluarPostulacionesPUCV2 is NO LONGER a direct menu item (it's behind the dialog)
    - `npx tsc -p src/tsconfig.json --noEmit` passes
  </verify>
  <done>
    Menu.ts has the complete, polished Phase 2 menu structure. Evaluation is gated behind a confirmation dialog. All sidebar launchers work.
  </done>
</task>

## Success Criteria
- [ ] DialogConfirmEval.html with config summary and confirmation flow
- [ ] Menu.ts has final structure with dialog launcher replacing direct eval call
- [ ] `npx tsc -p src/tsconfig.json --noEmit` passes
- [ ] All 3 HTML sidebars/dialogs accessible from the menu
