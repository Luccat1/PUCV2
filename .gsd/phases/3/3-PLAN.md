---
phase: 3
plan: 3
wave: 2
---

# Plan 3.3: Waitlist Auto-Promotion + State Machine + Menu Updates

## Objective

Implement the waitlist auto-promotion logic when a selected applicant rejects their spot, enforce the state machine transitions, and update the Sheets menu to reflect the new email workflow.

## Context

- .gsd/SPEC.md
- .gsd/phases/3/RESEARCH.md
- .gsd/phases/3/1-PLAN.md (token system)
- .gsd/phases/3/2-PLAN.md (batch sending)
- src/Seleccionados.ts
- src/WebApp.ts
- src/Menu.ts
- src/Config.ts

## Tasks

<task type="auto">
  <name>Implement waitlist auto-promotion in Seleccionados.ts</name>
  <files>src/Seleccionados.ts</files>
  <action>
    Complete the stub `gestionarListaDeEspera(e)` function:

    1. Detect when "Aceptación" column changes to "Rechaza" (either manually in sheet or via web app token)
    2. Mark the rejecting applicant row with background color #F4CCCC and status "Excluido"
    3. Find the next eligible candidate:
       - Read `Evaluación automatizada` sheet
       - Get all applicants not already in `Seleccionados`
       - Sort by total score (desc), then date (asc)
       - Pick the top one
    4. Add the promoted candidate to `Seleccionados` at the end
    5. Log the promotion via `logToWebApp()`

    Also add a NEW function `procesarRechazoDesdeWebApp(correo: string)`:
    - Called from `procesarAccionPostulante()` in WebApp.ts after updating the sheet
    - Triggers the same promotion logic without needing a sheet edit event
    - Uses `LockService` to prevent race conditions

    IMPORTANT:
    - Check that the promoted candidate isn't already in Seleccionados (edge case: multiple rejections in quick succession)
    - Do NOT auto-send email to the promoted candidate — just add them to the sheet. Admin sends batch manually.
  </action>
  <verify>TypeScript compiles. Code review: promotion logic finds correct next candidate, prevents duplicates</verify>
  <done>gestionarListaDeEspera handles rejection events, procesarRechazoDesdeWebApp enables web-triggered promotion, duplicate prevention in place</done>
</task>

<task type="auto">
  <name>Wire accept/reject to state machine in WebApp.ts</name>
  <files>src/WebApp.ts</files>
  <action>
    Update `procesarAccionPostulante()` to:

    1. On "accept": Set "Aceptación" to "Acepta" in Seleccionados
    2. On "reject": Set "Aceptación" to "Rechaza", then call `procesarRechazoDesdeWebApp(correo)` to trigger waitlist promotion

    Add state validation:
    - If applicant already has "Acepta" or "Rechaza" or "Excluido", return "Tu respuesta ya fue registrada anteriormente"
    - Only allow transition from "Notificado" or "Pendiente"

    IMPORTANT:
    - Delete the consumed token from ScriptProperties after processing (already in Plan 3.1)
    - Show the applicant's name in the confirmation page (look it up from the sheet)
  </action>
  <verify>TypeScript compiles. Code review: state transitions are validated, reject triggers promotion</verify>
  <done>Accept/reject from web app correctly updates sheet state and triggers promotion on rejection</done>
</task>

<task type="auto">
  <name>Update Menu.ts with email workflow actions</name>
  <files>src/Menu.ts</files>
  <action>
    1. Add a submenu item under "📧 Enviar Correos":
       - "👀 Vista Previa" → calls `mostrarPrevisualizacionCorreos()` (new function)
    2. Add `mostrarPrevisualizacionCorreos()` function that shows a dialog with:
       - Count per type (SELECTED, TEST_LEVEL, WAITLIST, NO_SELECTED)
       - List of recipient emails per type
       - "Showing only unsent (Fecha Notificación empty)" note
    3. Add a menu item "🔄 Ver Estado de Respuestas" that shows:
       - Count of Acepta / Rechaza / Pendiente / Notificado
       - Quick summary dialog

    IMPORTANT:
    - Keep existing menu items unchanged
    - New items should be added within existing submenu structure
  </action>
  <verify>TypeScript compiles. Menu items render correctly (visual check after clasp push)</verify>
  <done>Menu has preview, status overview items. Email batch flow is clearly exposed in the menu</done>
</task>

## Success Criteria

- [ ] Rejection automatically promotes next waitlist candidate to Seleccionados
- [ ] State machine prevents duplicate accept/reject actions
- [ ] Web app rejection triggers promotion (no sheet edit event needed)
- [ ] Menu includes email preview and response status overview
- [ ] TypeScript compiles cleanly
