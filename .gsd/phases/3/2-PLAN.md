---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Email Templates + Batch Sending + Notificado Tracking

## Objective

Update all email templates for v5, add accept/reject buttons to CorreoSeleccionado, fully implement the batch sending for WAITLIST and NO_SELECTED types, and add "notificado" tracking to prevent double-sends.

## Context

- .gsd/SPEC.md
- .gsd/phases/3/RESEARCH.md
- .gsd/phases/3/1-PLAN.md (token system from Plan 3.1)
- src/Correos.ts
- src/CorreoSeleccionado.html
- src/CorreoTestNivel.html
- src/CorreoListaEspera.html
- src/CorreoNoSeleccionado.html
- src/Config.ts

## Tasks

<task type="auto">
  <name>Update CorreoSeleccionado.html with accept/reject buttons</name>
  <files>src/CorreoSeleccionado.html</files>
  <action>
    1. Replace the "responde a este correo con un «Confirmo»" section with two styled buttons:
       - ✅ "Acepto mi Cupo" → links to `<?= urlAceptar ?>`
       - ❌ "Rechazo mi Cupo" → links to `<?= urlRechazar ?>`
    2. Update program references from "cuarta versión" to "quinta versión"
    3. Keep all existing PUCV branding and styles
    4. Add a fallback text below buttons: "Si los botones no funcionan, copia y pega este enlace:" with the accept URL as plain text

    Button styles:
    - Accept: green background (#4CAF50), white text, rounded, 16px padding
    - Reject: red background (#f44336), white text, same dimensions
    - Both: `text-decoration: none; display: inline-block; margin: 10px;`

    IMPORTANT:
    - Email clients don't support modern CSS — use inline styles on `<a>` tags, NOT `<button>`
    - Template variables: `urlAceptar`, `urlRechazar` (generated in Correos.ts)
  </action>
  <verify>Open the HTML file in a browser to verify button rendering. Check template variable syntax is valid GAS scriptlet format</verify>
  <done>CorreoSeleccionado.html has two styled accept/reject button links, v5 text, fallback URL</done>
</task>

<task type="auto">
  <name>Update remaining email templates for v5</name>
  <files>src/CorreoTestNivel.html, src/CorreoListaEspera.html, src/CorreoNoSeleccionado.html</files>
  <action>
    1. CorreoTestNivel.html: Update from "cuarta versión" to "quinta versión". Remove the FE DE ERRATAS section (it was specific to the 4th edition). Update dates to use template variables from PROGRAM_DATA.

    2. CorreoListaEspera.html: Update from "cuarta versión" to "quinta versión". Add PUCV branding consistency (use same header styles as CorreoSeleccionado).

    3. CorreoNoSeleccionado.html: Update from "cuarta versión" to "quinta versión".

    IMPORTANT:
    - Keep all template variable names consistent across templates
    - Maintain the PUCV institutional tone and formatting
  </action>
  <verify>Open each HTML file in browser to verify rendering. Check no hardcoded edition references remain</verify>
  <done>All 4 email templates updated for v5, consistent branding, no hardcoded edition references</done>
</task>

<task type="auto">
  <name>Expand Correos.ts with full batch logic + notificado tracking</name>
  <files>src/Correos.ts</files>
  <action>
    1. Update `sendEmailBatch()`:
       - After sending each email successfully, write the current timestamp to the "Fecha Notificación" column for that row in Seleccionados
       - Pass `urlAceptar` and `urlRechazar` as template variables (call `obtenerUrlConfirmacion()` for each recipient)
       - Support all 4 types: SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED

    2. Update `getRecipients()`:
       - SELECTED: add filter to exclude rows where "Fecha Notificación" is not empty (already notified)
       - TEST_LEVEL_ONLY: same notificado filter
       - WAITLIST: read from `Evaluación automatizada` sheet, get candidates ranked 26+ up to a reasonable threshold (e.g., 40), filter out those already in Seleccionados
       - NO_SELECTED: read from `Evaluación automatizada`, get candidates below the waitlist threshold

    3. Update `sendTestEmail()` to pass dummy accept/reject URLs

    IMPORTANT:
    - WAITLIST and NO_SELECTED recipients come from a DIFFERENT sheet (Evaluación automatizada), not Seleccionados
    - Use the same batch sending pattern (try/catch per recipient, logToWebApp on error)
    - Return count of sent emails clearly
  </action>
  <verify>TypeScript compiles. Code review: all 4 types handled, notificado filter active, URLs generated per recipient</verify>
  <done>Correos.ts handles all 4 email types, tracks sent timestamps, generates token URLs for SELECTED type</done>
</task>

## Success Criteria

- [ ] CorreoSeleccionado.html has styled accept/reject buttons linking to web app
- [ ] All templates updated for v5 (no "cuarta versión" references)
- [ ] `getRecipients()` correctly filters all 4 types including WAITLIST and NO_SELECTED
- [ ] Sent emails are tracked via "Fecha Notificación" — re-running batch won't double-send
- [ ] TypeScript compiles cleanly
