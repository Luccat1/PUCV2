---
phase: 2
level: 1
---

# Phase 2 Research: Google Sheets Sidebar & Dialog Patterns

## Discovery Level: 1 — Quick Verification
All patterns use standard Google Apps Script APIs already available in the project's `@types/google-apps-script`. No new external dependencies needed.

## Key Findings

### 1. Sidebar API
- `SpreadsheetApp.getUi().showSidebar(htmlOutput)` — Opens a 300px wide panel on the right side
- `HtmlService.createHtmlOutputFromFile('filename')` — Loads an HTML file from the project
- `HtmlService.createTemplateFromFile('filename')` — Allows server-side templating with `<?= ?>` tags
- Max width: 300px (fixed by Google, not configurable)
- Sidebar stays open until user closes it or script calls `google.script.host.close()`

### 2. Communication: Sidebar ↔ Server
- **Client → Server**: `google.script.run.withSuccessHandler(fn).withFailureHandler(fn).serverFunction(args)`
- **Server → Client**: Return values via success handler (JSON objects work well)
- All server functions must be global (top-level) — already the case in our modular structure
- Max execution time for sidebar-triggered functions: 6 minutes (same as any GAS function)

### 3. Modal Dialog API
- `SpreadsheetApp.getUi().showModalDialog(htmlOutput, title)` — Blocks interaction with sheet
- Configurable width/height: `.setWidth(px).setHeight(px)`
- Use for confirmations and parameter editing before running evaluation

### 4. Configuración Sheet Structure
Current structure (from `cargarConfiguracionDesdeHoja`):
```
| Criterio            | Perfil       | Peso |
|---------------------|--------------|------|
| UsoIngles           | estudiante   | 0.75 |
| UsoIngles           | funcionario  | 1    |
| UsoIngles           | academico    | 1    |
| Internacionalizacion| estudiante   | 1    |
| ...                 | ...          | ...  |
```

The sidebar will read this structure and present it as editable form controls, then write back to the same sheet.

### 5. Design Considerations for 300px Sidebar
- Use compact forms with labels above inputs
- Group related parameters under collapsible sections
- Use CSS variables or inline styles (no Tailwind in GAS)
- Font: Roboto (consistent with existing index.html)
- Colors: PUCV blue palette (#003366, #0055a2, #e9f2fa)

### 6. Applicant Review Sidebar
- Should show one applicant at a time with navigation (prev/next)
- Display: name, category, campus, score breakdown, certificate link
- Inline controls: verification status dropdown, level assignment, comments
- Save button per applicant
- Data source: "Seleccionados" sheet

## Conclusion
No external research needed. All APIs are well-documented in the existing GAS types. Level 0 discovery for implementation.
