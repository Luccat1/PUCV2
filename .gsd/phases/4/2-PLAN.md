---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Dashboard UI Redesign — HTML + CSS + Charts

## Objective

Completely redesign `index.html` with a modern, professional dashboard layout featuring:

- Card-based statistics section with KPI metrics
- Multiple Chart.js visualizations (bar, doughnut, radar)
- Tabbed navigation for different dashboard sections
- Responsive CSS grid/flexbox layout
- PUCV brand colors and modern typography

This is the largest plan — it transforms the 556-line monolithic page into a well-organized, visually premium admin interface.

## Context

- .gsd/SPEC.md (REQ-06: Web App dashboard with charts and management tables)
- src/index.html (current 556-line dashboard)
- src/WebApp.ts (getSelectionData, getDashboardStats — from Plan 4.1)
- src/Config.ts (PROGRAM_DATA, IProgramData)

## Tasks

<task type="auto">
  <name>Redesign HTML structure and CSS design system</name>
  <files>src/index.html</files>
  <action>
    Rewrite the HTML structure and CSS of index.html. The new layout:

    **Header:**
    - PUCV branding with program name
    - Quick-stats bar (total applicants | selected | pending | accepted)
    
    **Main content — tabbed sections:**
    1. **📊 Estadísticas** (default tab)
       - KPI cards row: Total Postulantes, Seleccionados, Puntaje Promedio, Cupos Aceptados
       - Chart grid (2x2): 
         - Bar chart: Puntaje promedio por categoría
         - Doughnut: Distribución por sede
         - Stacked bar: Análisis detallado (Uso Inglés, Intl, Año, Nivel por perfil)
         - Doughnut: Estado de cupos (Acepta/Rechaza/Pendiente)
    
    2. **👥 Gestión** 
       - Seleccionados table with inline editing (existing functionality preserved)
       - Lista de Espera table
       - Refresh button
    
    3. **📧 Correos**
       - Email action buttons (existing functionality preserved)
       - Test email panel
       - Preview/confirmation flow
    
    4. **⚙️ Herramientas**
       - Evaluar Postulaciones button
       - Generar Lista Final button
       - Analizar Equilibrio button
       - Permission check
    
    **Footer:**
    - Real-time log output (preserved from current)
    
    **CSS Design System:**
    - Font: Inter from Google Fonts (modern, clean)
    - Primary: #003366 (PUCV dark blue)
    - Secondary: #0055a2 (PUCV blue)
    - Accent: #28a745 (success green), #dc3545 (danger red), #ffc107 (warning amber)
    - Background: #f0f2f5 (light gray)
    - Cards: white with subtle shadows and rounded corners
    - Tab navigation styled as horizontal pill buttons
    - Responsive: CSS Grid for chart layout, flexbox for cards
    - Smooth transitions on tab switches, hover effects on cards/buttons
    - Table styles: striped rows, sticky headers, subtle hover highlight
    
    WHAT TO PRESERVE:
    - All `google.script.run` calls and their success/failure handlers
    - The `<base target="_top">` tag
    - Chart.js CDN import
    - All button IDs used by setLoading()
    
    WHAT TO AVOID:
    - Do NOT use external CSS frameworks (no Bootstrap, Tailwind) — GAS HtmlService serves everything inline
    - Do NOT use ES modules or imports — GAS context is global
    - Do NOT change function signatures of existing JS functions
    - Keep all CSS inside `<style>` tag (GAS serves as single file)
  </action>
  <verify>clasp push && deploy web app → verify all tabs render, CSS looks correct, responsive on resize</verify>
  <done>
    - Page loads with tabbed layout
    - 4 tabs visible and switchable
    - KPI cards render with placeholder text
    - Chart areas exist (even if data not connected yet)
    - All existing buttons present and functional
    - Responsive layout works at 768px and 1200px widths
  </done>
</task>

<task type="auto">
  <name>Implement Chart.js visualizations</name>
  <files>src/index.html</files>
  <action>
    Wire up the Chart.js charts to display data from getSelectionData():

    1. **Bar chart — Puntaje promedio por categoría:**
       - Read `data.estadisticas.promediosPorTipo`
       - Labels: profile types, Values: averages
       - Colors: gradient blue palette
    
    2. **Doughnut — Distribución por sede:**
       - Read `data.estadisticas.distribucionSede`
       - Labels: sede names, Values: count
       - Colors: curated palette (5-6 distinct colors)
    
    3. **Stacked bar — Análisis detallado:**
       - Read `data.estadisticas.analisisDetallado`
       - Labels: profiles, Datasets: Uso Inglés, Intl, Año Ingreso, Nivel Inglés
       - 4 datasets stacked with distinct colors
    
    4. **Doughnut — Estado de cupos:**
       - Read `data.estadisticas.seatBreakdown`
       - 3 segments: Acepta (green), Pendiente (amber), Rechaza (red)
    
    Chart.js configuration:
    - `responsive: true`, `maintainAspectRatio: false`
    - `plugins.legend.position: 'bottom'`
    - Tooltips enabled with formatting
    - Clean, minimal look with no gridlines on doughnut charts
    
    State management:
    - Store chart instances in a `window.dashboardCharts` object
    - Destroy each before re-creating on data refresh
    
    WHAT TO AVOID:
    - Do NOT create charts before data loads — check for null data
    - Do NOT use Chart.js plugins that require additional CDN imports
  </action>
  <verify>clasp push && deploy → verify 4 charts render with correct data, resize properly</verify>
  <done>
    - 4 charts render correctly with real data
    - Charts resize responsively
    - Charts update on data refresh without duplicates
    - Tooltips show formatted values
  </done>
</task>

<task type="auto">
  <name>Connect interactive tables and preserve all action handlers</name>
  <files>src/index.html</files>
  <action>
    Ensure all existing JavaScript functionality works with the new HTML structure:

    1. Update `renderTables(data)` to use new container IDs from the redesigned HTML
    2. Update `setLoading(isLoading)` to reference new button IDs
    3. Ensure `saveStatus(correo)` works with new table structure
    4. Ensure all email handlers work: handleEmailAction, runSendEmail, sendTestEmailAction
    5. Ensure runEvaluation, runGenerateFinalList, runAnalysis work
    6. Update log output div reference if container changed
    7. Add tab switching JS logic (pure vanilla — show/hide sections, update active tab class)
    
    Tab switching implementation:
    ```javascript
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).style.display = 'block';
      document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    }
    ```
    
    WHAT TO AVOID:
    - Do NOT break existing google.script.run calls
    - Do NOT change server function names
    - Do NOT remove any existing functionality
  </action>
  <verify>clasp push && deploy → test each button: evaluate, generate list, analyze, email send/preview, save status, test email</verify>
  <done>
    - Tab switching works smoothly
    - All existing buttons trigger correct server functions
    - Tables render data correctly
    - Status save works with indicator feedback
    - Email send with preview/confirm flow works
    - Log output updates in real-time
  </done>
</task>

## Success Criteria

- [ ] Dashboard loads with 4 functional tabs
- [ ] 4 Chart.js charts render with real data
- [ ] KPI cards show live statistics
- [ ] All existing functionality preserved (evaluation, email, list generation)
- [ ] Responsive at 768px and 1200px breakpoints
- [ ] No JavaScript errors in browser console
