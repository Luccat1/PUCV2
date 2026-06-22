---
phase: 01-correo-inicio-de-clases
plan: 1.2
type: execute
wave: 2
depends_on: [01-1-PLAN-GAP]
files_modified:
  - src/Config.ts
  - src/Menu.ts
  - src/CorreoInicioClases.html
  - src/CorreoSeleccionado.html
  - src/CorreoTestNivel.html
  - src/CorreoListaEspera.html
  - src/CorreoNoSeleccionado.html
  - PUCV2English/CorreoInicioClases.html
  - PUCV2English/CorreoSeleccionado.html
  - PUCV2English/CorreoTestNivel.html
  - PUCV2English/CorreoListaEspera.html
  - PUCV2English/CorreoNoSeleccionado.html
autonomous: true
requirements: [INICIO-01, INICIO-02, INICIO-03, INICIO-04, INICIO-05, INICIO-06, QUAL-01]
gap_closure: true
---

<objective>
Update Config.ts with contact email constant, wire Menu.ts to new two-button workflow, and update all email templates to use correct contact email (idiomas@pucv.cl).

Purpose: Centralize config, replace dialog-based menu item with two discrete buttons, fix contact email across all templates.

Output: Config.CONTACT_EMAIL added; Menu.ts shows "Crear Hoja Envío..." and "Enviar Correos Inicio..."; all templates updated to idiomas@pucv.cl.
</objective>

<execution_context>
@.planning/phases/01-correo-inicio-de-clases/01-GAPS.md (Gap requirements)

Depends on: Plan 1.1 (EnvioInicioClases.ts created and tested)
</execution_context>

<context>
From src/Config.ts (current state):
- Lines 145–149: COLUMNS object with SALA, INICIO_NOTIFICATION_DATE
- Line 37: IProgramData.HORARIOS type (sala? field exists)

From src/Menu.ts (current state):
- Line 28: `addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases')` in "Enviar Correos" submenu
- Line 138–143: `abrirDialogoInicioClases()` function opens DialogSalas.html modal

Current email templates reference: `inglés.dgai@pucv.cl` (to be changed to `idiomas@pucv.cl`)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add CONTACT_EMAIL constant to Config.ts</name>
  <files>src/Config.ts</files>
  <action>
Add new constant to CONFIG object (or top-level export):

```typescript
export const CONTACT_EMAIL = 'idiomas@pucv.cl';
```

Location: Add after line 149 (after COLUMNS definitions), before any export statement.

Also update any existing reference to `ENGLISH_EMAIL` if present to use this constant (search for `inglés.dgai` in Config.ts first to see if it's already defined).

Commit intention: "Centralize contact email in CONFIG for consistency"
  </action>
  <verify>
    <automated>grep -n "CONTACT_EMAIL.*idiomas@pucv.cl" src/Config.ts</automated>
    Returns 1 match
  </verify>
  <done>
- src/Config.ts has CONTACT_EMAIL = 'idiomas@pucv.cl' exported
- Constant available for import in other modules
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Menu.ts to replace dialog button with two new buttons</name>
  <files>src/Menu.ts</files>
  <action>
Replace the single menu item (line 28) with two new items:

1. Find line 28: `addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases')`

2. Replace with TWO new items:
```typescript
// In "Enviar Correos" submenu:
addItem('📋 Crear Hoja Envío Inicio de Clases', 'crearHojaEnvioInicioClases');
addItem('🏫 Enviar Correos Inicio de Clases', 'poblarYEnviarEnvioInicioClases');
```

3. Keep the old `abrirDialogoInicioClases()` function (lines 138–143) for backward compatibility (may be called from other contexts), but it is NO LONGER exposed in menu.

4. Add two new wrapper functions at end of Menu.ts (after abrirDialogoInicioClases):
```typescript
function crearHojaEnvioInicioClases() {
  const sheet = EnvioInicioClases.crearHojaEnvioInicioClases();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
  showAlert('Hoja "Envío Inicio Clases" creada y formateada. Ahora haz click en "Enviar Correos Inicio de Clases".');
}

function poblarYEnviarEnvioInicioClases() {
  const result = EnvioInicioClases.poblarYEnviarEnvioInicioClases();
  showAlert(result);
}
```

These wrappers call the new EnvioInicioClases module (imported at top of Menu.ts).

Add import at top: `import { EnvioInicioClases } from './EnvioInicioClases';` (or use GAS global pattern if applicable)
  </action>
  <verify>
    <automated>grep -n "Crear Hoja Envío\|Enviar Correos Inicio de Clases" src/Menu.ts | wc -l</automated>
    Returns 2 (both menu items present)
  </verify>
  <done>
- Menu.ts has two new buttons in "Enviar Correos" submenu
- Old dialog-based button removed
- Wrapper functions crearHojaEnvioInicioClases() and poblarYEnviarEnvioInicioClases() added
- Build still passes with new imports/functions
  </done>
</task>

<task type="auto">
  <name>Task 3: Update all email templates to use idiomas@pucv.cl instead of inglés.dgai@pucv.cl</name>
  <files>
src/CorreoInicioClases.html
src/CorreoSeleccionado.html
src/CorreoTestNivel.html
src/CorreoListaEspera.html
src/CorreoNoSeleccionado.html
PUCV2English/CorreoInicioClases.html
PUCV2English/CorreoSeleccionado.html
PUCV2English/CorreoTestNivel.html
PUCV2English/CorreoListaEspera.html
PUCV2English/CorreoNoSeleccionado.html
  </files>
  <action>
Replace all occurrences of `inglés.dgai@pucv.cl` with `idiomas@pucv.cl` in all email template files:

For each file (5 in src/, 5 in PUCV2English/):
1. Search for literal string: `inglés.dgai@pucv.cl`
2. Replace with: `idiomas@pucv.cl`
3. Keep all other content unchanged (HTML structure, template variables, styling)

Automation:
```bash
# Run for all files in src/
for f in src/Correo*.html; do
  sed -i 's/inglés\.dgai@pucv\.cl/idiomas@pucv.cl/g' "$f"
done

# Run for all files in PUCV2English/
for f in PUCV2English/Correo*.html; do
  sed -i 's/inglés\.dgai@pucv\.cl/idiomas@pucv.cl/g' "$f"
done
```

Verify each file has exactly 1 occurrence (footer email contact).
  </action>
  <verify>
    <automated>grep -r "inglés\.dgai@pucv\.cl" src/ PUCV2English/ 2>/dev/null | wc -l</automated>
    Returns 0 (no old email found in any file)
  </verify>
  <done>
- All 10 email template files updated
- No occurrences of old email remain
- New email `idiomas@pucv.cl` present in footers
- File structure and variables unchanged
  </done>
</task>

</tasks>

<verification>
After completion, verify:
- [ ] `src/Config.ts` exports CONTACT_EMAIL constant
- [ ] `src/Menu.ts` has two new menu items and wrapper functions
- [ ] All 10 email templates have `idiomas@pucv.cl` (run grep across src/ and PUCV2English/)
- [ ] No `inglés.dgai@pucv.cl` remains anywhere in templates
- [ ] Build passes: `npm run build` exits 0
- [ ] Original Phase 1 tests still pass (no regressions)
</verification>

<success_criteria>
- Config.CONTACT_EMAIL = 'idiomas@pucv.cl' exported
- Menu.ts has two buttons for sheet-based workflow (no dialog button visible)
- All email templates updated to correct contact email
- Build passes with no TypeScript errors
- Phase 1 verification still passes (all 8 original requirements intact)
</success_criteria>

<output>
After task completion:
- [ ] Commit: `git add src/Config.ts src/Menu.ts src/Correo*.html PUCV2English/Correo*.html`
- [ ] Create `.planning/phases/01-correo-inicio-de-clases/01-2-SUMMARY.md` with wiring overview
- [ ] Ready for gap closure verification test
</output>
