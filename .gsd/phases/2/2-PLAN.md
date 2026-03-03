---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Applicant Review Sidebar

## Objective
Create an HTML sidebar that lets reviewers navigate through selected applicants one at a time, view their score breakdown and certificate links, and update verification status, level assignment, and comments. This fulfills REQ-05.

## Context
- `src/Seleccionados.ts` — generarHojaSeleccionados creates the sheet with columns: Ranking, Apellido(s), Nombre(s), Correo, RUT, Fecha, Categoría, Sede, 8 score columns, Enlace Certificado, Verificación Certificado, Nivel Asignado, Aceptación, Comentarios
- `src/WebApp.ts` — updateApplicantStatus(correo, verificacion, nivel) already exists
- `src/Menu.ts` — placeholder for abrirSidebarRevision (from Plan 2.1)

## Tasks

<task type="auto">
  <name>1. Create SidebarRevision.html — applicant reviewer</name>
  <files>
    - src/SidebarRevision.html (NEW)
  </files>
  <action>
    Create a 300px-wide sidebar for reviewing applicants one at a time.

    **UI Structure:**
    - Header: "👁️ Revisión de Postulaciones"
    - Navigation: "◀ Anterior" / "▶ Siguiente" buttons + "Postulante X de Y" indicator
    - **Applicant Card:**
      - Name (Nombre + Apellido), bold
      - Category (Categoría Postulante)
      - Campus (Sede)
      - RUT
      - Date (Fecha de Postulación)
    - **Score Breakdown** (compact table):
      - Disponibilidad, Tipo, Uso Inglés, Intl., Nivel Inglés, Año Ingreso, Compromiso, Carta
      - TOTAL (bold, highlighted)
    - **Certificate Review:**
      - Link to certificate file (opens in new tab)
      - "Verificación" dropdown: [- Seleccionar -, Válido, Test de nivel]
    - **Level Assignment:**
      - "Nivel Asignado" dropdown: [- Asignar -, B1+, B2.1, B2.2, C1]
    - **Acceptance Status:**
      - Display only (Pendiente/Acepta/Rechaza) — colored badge
    - **Comments:**
      - Textarea for free-text notes
    - **Save button** → calls server `guardarRevisionPostulante(data)`
    - Success/error feedback

    **Styling:** Same PUCV palette as SidebarConfig.html. Score cells use color gradient (red→yellow→green).

    **Client-side JS:**
    - On load: `google.script.run.withSuccessHandler(initReview).getPostulantesParaRevision()`
    - Navigation: update display from cached array, no server call
    - On save: `google.script.run.withSuccessHandler(showSaved).guardarRevisionPostulante({correo, verificacion, nivel, comentarios})`
  </action>
  <verify>
    - HTML file exists at src/SidebarRevision.html
    - Contains navigation controls, applicant card, score table, dropdowns, save button
    - Uses google.script.run for getPostulantesParaRevision and guardarRevisionPostulante
    - Consistent PUCV styling
  </verify>
  <done>
    SidebarRevision.html matches the spec with navigation, score breakdown, and save functionality.
  </done>
</task>

<task type="auto">
  <name>2. Create server-side review functions + complete Menu.ts</name>
  <files>
    - src/WebApp.ts (MODIFY — add getPostulantesParaRevision, guardarRevisionPostulante)
    - src/Menu.ts (MODIFY — replace placeholder with real sidebar launcher)
  </files>
  <action>
    **In WebApp.ts**, add 2 new functions:

    1. `getPostulantesParaRevision(): object[]`
       - Read all data from "Seleccionados" sheet
       - Return array of objects, one per applicant, with ALL columns mapped by header name
       - Include: ranking, nombre, apellidos, correo, rut, fecha, categoria, sede, all 8 score fields, puntajeTotal, enlaceCertificado, verificacion, nivel, aceptacion, comentarios

    2. `guardarRevisionPostulante(data: {correo: string, verificacion: string, nivel: string, comentarios: string}): string`
       - Find the row by correo in "Seleccionados" sheet
       - Update: Verificación Certificado, Nivel Asignado, Comentarios columns
       - Return confirmation message

    **In Menu.ts**, update `abrirSidebarRevision()`:
    - Replace placeholder alert with real sidebar:
      - Creates HtmlOutput from 'SidebarRevision'
      - Sets title "Revisión de Postulaciones"
      - Shows via showSidebar()
  </action>
  <verify>
    - getPostulantesParaRevision returns array of applicant objects
    - guardarRevisionPostulante updates the correct row by correo
    - abrirSidebarRevision opens the sidebar
    - `npx tsc -p src/tsconfig.json --noEmit` passes
  </verify>
  <done>
    Server-side review functions work. Menu launches sidebar correctly. TypeScript compiles cleanly.
  </done>
</task>

## Success Criteria
- [ ] SidebarRevision.html with applicant card, navigation, score table, and save
- [ ] 2 server-side functions: getPostulantesParaRevision, guardarRevisionPostulante
- [ ] Menu.ts abrirSidebarRevision opens sidebar
- [ ] `npx tsc -p src/tsconfig.json --noEmit` passes
