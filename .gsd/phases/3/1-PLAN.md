---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Accept/Reject Token System + doGet Routing

## Objective

Build the core accept/reject infrastructure: token generation, storage, `doGet` routing to handle both the admin dashboard and applicant confirmation links, and a branded confirmation page. This is the foundation that the email templates will link to.

## Context

- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- .gsd/phases/3/RESEARCH.md
- src/WebApp.ts
- src/Config.ts
- src/appsscript.json

## Tasks

<task type="auto">
  <name>Add token management functions to WebApp.ts</name>
  <files>src/WebApp.ts</files>
  <action>
    Add three new functions to WebApp.ts:

    1. `generarToken(correo: string): string` — Generates a UUID via `Utilities.getUuid()`, stores `token → correo` mapping in `ScriptProperties`, returns the token.

    2. `procesarAccionPostulante(token: string, action: string): string` — Looks up token in ScriptProperties, finds the applicant row in Seleccionados, updates their "Aceptación" column to "Acepta" or "Rechaza", deletes the token from properties, returns a status message. If token not found, returns error message.

    3. `obtenerUrlConfirmacion(correo: string, action: string): string` — Generates a token (or retrieves existing one), builds the full URL using `ScriptApp.getService().getUrl()` + `?action=${action}&token=${token}`, returns URL.

    IMPORTANT:
    - Store tokens with key prefix `token_` to avoid collisions with other properties
    - Use `LockService.getScriptLock()` to prevent race conditions on token creation
    - Do NOT modify existing functions yet — just add new ones
  </action>
  <verify>TypeScript compilation: `npx clasp push --force` from project root succeeds without type errors</verify>
  <done>Three new functions exist in WebApp.ts, TypeScript compiles cleanly, tokens stored/retrieved from ScriptProperties</done>
</task>

<task type="auto">
  <name>Route doGet for accept/reject actions</name>
  <files>src/WebApp.ts, src/appsscript.json</files>
  <action>
    1. Modify the existing `doGet(e)` function to check for `e.parameter.action`:
       - If `action` is "accept" or "reject" AND `token` exists → call `procesarAccionPostulante()`, serve branded HTML confirmation page
       - Otherwise → serve `index.html` as currently (dashboard)

    2. Create a helper `crearPaginaConfirmacion(accion: string, nombre: string, exito: boolean): GoogleAppsScript.HTML.HtmlOutput` that returns inline HTML with:
       - PUCV logo and branding (same styles as email templates)
       - Success message ("Gracias por confirmar tu participación" or "Lamentamos tu decisión, tu cupo será reasignado")
       - Error message if token invalid ("Este enlace ya fue utilizado o no es válido")

    3. Update `appsscript.json`: change `"access": "MYSELF"` to `"access": "ANYONE"` so applicants can access the accept/reject URLs without Google login.

    IMPORTANT:
    - Do NOT break the existing dashboard flow — `doGet` without action params must still work identically
    - Keep `"executeAs": "USER_DEPLOYING"` so the script has write access to sheets
  </action>
  <verify>TypeScript compilation succeeds. Visual review: doGet routes correctly based on presence of action param</verify>
  <done>doGet handles both dashboard (no params) and accept/reject (with action+token params). appsscript.json updated to ANYONE access.</done>
</task>

<task type="auto">
  <name>Add "Fecha Notificación" column support to Seleccionados</name>
  <files>src/Seleccionados.ts, src/Config.ts</files>
  <action>
    1. In `generarHojaSeleccionados()`, add "Fecha Notificación" to the headers array (after "Comentarios").

    2. In Config.ts, add a comment noting the new column. No interface changes needed as columns are referenced by header name, not index.

    IMPORTANT:
    - Initialize "Fecha Notificación" as empty string for all rows
    - Do NOT break existing data validation rules
  </action>
  <verify>TypeScript compiles. Review that the new column is appended after existing management columns</verify>
  <done>"Fecha Notificación" column exists in Seleccionados sheet generation, initialized as empty</done>
</task>

## Success Criteria

- [ ] Tokens are generated, stored in ScriptProperties, and successfully retrieved
- [ ] `doGet` serves dashboard for admin, confirmation page for applicants
- [ ] `appsscript.json` access changed to ANYONE
- [ ] "Fecha Notificación" column added to Seleccionados
- [ ] TypeScript compiles cleanly with `npx clasp push`
