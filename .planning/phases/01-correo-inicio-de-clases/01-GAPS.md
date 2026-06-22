---
phase: 01-correo-inicio-de-clases
gap_closure: true
discovered: 2026-03-19
status: open
---

# Phase 1 Gap Closure: Enhanced Architecture & Configuration

## Gaps Discovered

After Phase 1 verification and user feedback, three improvements were identified:

### Gap 1: Separate Sheet for Deployment Record

**Current state:** Feature works but sends from dialog directly; no persistent record of sends in sheet.

**Desired state:**
- New sheet "Envío Inicio Clases" created with full record of each send
- Columns: Nombre, Correo, Nivel, Sala, Horario, Correo Enviado (timestamp)
- Two-button workflow:
  1. "Crear Hoja Envío" → creates/formats sheet
  2. "Enviar Correos" → populates + sends (writes results to the sheet)

**Impact:** Users have permanent audit trail of class-start emails sent; easier to verify completeness.

### Gap 2: Contact Email Configuration

**Current state:** Email footer references `inglés.dgai@pucv.cl` in templates.

**Desired state:** Change all references to `idiomas@pucv.cl`

**Impact:** Correct contact email for students asking about the program.

### Gap 3: Button Placement & Visibility

**Current state:** Dialog launched from menu; UI state lives in modal.

**Desired state:** Two separate menu buttons:
1. "Crear Hoja Envío Inicio Clases" → triggers sheet creation
2. "Enviar Correos Inicio de Clases" → triggers send (reads from sheet)

**Impact:** Clearer workflow, persistent state, easier for admins to understand what they're doing.

---

## Implementation Tasks

### Task 1: Create "Envío Inicio Clases" Sheet Manager

**File:** `src/EnvioInicioClases.ts` (NEW)

Functions:
- `crearHojaEnvioInicioClases()` → Creates sheet, applies formatting, adds headers
- `poblarYEnviarEnvioInicioClases()` → Reads from Lista Final, populates sheet, sends emails, updates columns
- `formatearHojaEnvio()` → Styling (header colors, column widths, etc.)

**Header Row (7 columns):**
- "Nombre"
- "Correo"
- "Nivel"
- "Sala"
- "Horario"
- "Correo Enviado" (timestamp or ✓)
- "Estado" (Pendiente, Éxito, Error)

### Task 2: Update Config.ts

**Changes:**
- Add constant: `CONTACT_EMAIL: "idiomas@pucv.cl"`
- Update (if exists): `ENGLISH_EMAIL: "idiomas@pucv.cl"`
- Reference in all email templates

### Task 3: Update Menu.ts

**Changes:**
- Add menu item: "📋 Crear Hoja Envío Inicio de Clases" → `crearHojaEnvioInicioClases()`
- Add menu item: "🏫 Enviar Correos Inicio de Clases" → `poblarYEnviarEnvioInicioClases()`
- Remove old: "🏫 Inicio de Clases" (dialog-based)
- Keep in "📧 Enviar Correos" submenu

### Task 4: Update Email Templates

**Files:**
- `src/CorreoInicioClases.html`
- `PUCV2English/CorreoInicioClases.html`
- `src/CorreoSeleccionado.html` (if refs inglés.dgai)
- `src/CorreoTestNivel.html` (if refs inglés.dgai)
- `src/CorreoListaEspera.html` (if refs inglés.dgai)
- `src/CorreoNoSeleccionado.html` (if refs inglés.dgai)

**Change:** Replace all `inglés.dgai@pucv.cl` → `idiomas@pucv.cl`

### Task 5: Update Tests

**File:** `src/TestEnvioInicioClases.ts` (NEW)

Functions:
- `testCrearHojaEnvioInicioClases()` → Verify sheet creation
- `testFormatearHojaEnvio()` → Verify formatting
- `testPoblarYEnviar()` → Verify send with sheet write

### Task 6: Update Deployment & Documentation

**Files:**
- Update `DEPLOYMENT_CHECKLIST.md` with new workflow
- Update Phase 1 summary to reflect new architecture

---

## Requirement Impact

| Original Req | Change | Still Covered |
|---|---|---|
| INICIO-01 | Dialog removed, replaced with sheet | ✓ Users still input sala (via sheet, not dialog) |
| INICIO-02 | No preview dialog, but sheet shows data | ✓ Users can review sheet before clicking send |
| INICIO-03 | Send logic unchanged | ✓ Same email send logic |
| INICIO-04 | Email content unchanged | ✓ Same template variables |
| INICIO-05 | Sala saved to Lista Final | ✓ Still saved (now from sheet-based flow) |
| INICIO-06 | Idempotency unchanged | ✓ Same filter logic |
| INICIO-07 | Menu item updated | ✓ Still in submenu (now two items instead of one) |
| QUAL-01 | Quota check unchanged | ✓ Same MailApp API |

All requirements still met; architecture improved for usability & auditability.

---

## Success Criteria (For Gap Closure)

- [ ] New `EnvioInicioClases.ts` created with 3 functions
- [ ] "Envío Inicio Clases" sheet can be created with proper formatting
- [ ] Sheet populated with 7 columns (Nombre, Correo, Nivel, Sala, Horario, Correo Enviado, Estado)
- [ ] Send flow reads from sheet and updates "Correo Enviado" column
- [ ] `idiomas@pucv.cl` appears in all email templates (verified via grep)
- [ ] Two menu buttons added; old dialog-based button removed
- [ ] Test suite created and passes
- [ ] DEPLOYMENT_CHECKLIST.md updated with new workflow
- [ ] Phase 1 verification re-runs and still passes

---

## Estimated Effort

- Implementation: ~2-3 hours
- Testing: ~30 minutes
- Documentation: ~20 minutes

**Complexity:** Medium (new sheet operations, config updates, menu restructure)

---

*Gaps discovered during user feedback phase, 2026-03-19*
