# Phase 3: Asignación por Test de Nivel - Research

**Researched:** 2026-08-05
**Domain:** Google Apps Script — TypeScript pipeline, spreadsheet data integration, email batch sending
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** La lógica se integra directamente dentro de `generarListaFinalCurso()` en `ListaFinal.ts`. Al detectar un estudiante con `Verificación Certificado === "Test de nivel"`, se busca su resultado en la hoja "Prueba de Nivel" por email antes de agruparlo.

**D-02:** Niveles válidos (incluibles): `B1+`, `B2.1`, `B2.2`, `C1`. Niveles insuficientes (excluibles): `A1`, `A2`, `B1.1` (cualquier valor no presente en la lista de niveles válidos se trata como insuficiente).

**D-03:** Los estudiantes con nivel insuficiente son marcados en la hoja "Prueba de Nivel" — columna nueva `"Nivel Insuficiente"` con valor `"Sí"` — y NO se agregan a ningún grupo en la Lista Final.

**D-04:** Los estudiantes con nivel válido quedan bajo su nivel real (ej: `B2.1`) en la Lista Final, reemplazando el grupo `"PRUEBA DE NIVEL"`.

**D-05:** Los estudiantes sin resultado aún ingresado (columna `Nivel` vacía en "Prueba de Nivel") permanecen agrupados bajo `"PRUEBA DE NIVEL"` en la Lista Final.

**D-06:** La advertencia se muestra como parte del string de retorno de `generarListaFinalCurso()`. No requiere diálogo adicional ni cambio visual en la hoja. Ejemplo de mensaje: `"Lista final generada. X estudiante(s) aún sin resultado en Prueba de Nivel: [emails]. Ingresar resultados y regenerar para incluirlos en su nivel."`.

**D-07:** La frase de asignación de nivel es **unificada para todos los estudiantes** (certificado Y test de nivel). No se necesita variable condicional en el template.

**D-08:** Frase exacta a incorporar en `CorreoInicioClases.html`: *"De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel [nivel]."* — Se agrega como párrafo en el bloque `.content` antes o después del highlight box, o integrado al highlight.

**D-09:** Template nuevo: `CorreoRechazoPorNivel.html`. Mismo estilo visual que los otros templates (Roboto, logo PUCV, container max-width 600px, highlight box azul).

**D-10:** Contenido del correo de rechazo:
- Informar que su nivel obtenido en la prueba está por debajo del mínimo requerido para los cursos ofrecidos.
- Informar que pueden solicitar una **constancia del nivel alcanzado** enviando un correo con copia a `alexis.ponce@pucv.cl`. El equipo puede generar dicha constancia.
- Invitar a consultar recursos de idiomas u otros cursos disponibles en la PUCV.

**D-11:** Idempotencia: nueva columna en "Prueba de Nivel" — `"Correo Rechazo Enviado"` — con la fecha de envío. Re-ejecución omite estudiantes con esta columna ya completada.

**D-12:** Nueva opción bajo el submenú `"📧 Enviar Correos"`, después del separador que precede a `"🏫 Inicio de Clases"`: `"❌ Rechazo por Nivel Insuficiente"` → llama a función `enviarCorreosRechazoPorNivel()`.

### Claude's Discretion

- Nombre exacto de la función de envío del correo de rechazo: `enviarCorreosRechazoPorNivel()` — implementar en nuevo módulo `RechazoPorNivel.ts` o dentro de `InicioClases.ts` (Claude decide según cohesión).
- Posición exacta de la frase de nivel en `CorreoInicioClases.html` (antes o después del highlight box).
- Estructura de columnas nuevas en "Prueba de Nivel" (agregar al final de `PLACEMENT_HEADERS` y `PLACEMENT_COL` en Placement.ts).

### Deferred Ideas (OUT OF SCOPE)

Ninguna — la discusión se mantuvo dentro del alcance de la fase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NIVEL-01 | Al generar Lista Final Curso, para estudiantes con `Verificación Certificado === "Test de nivel"`, buscar resultado en "Prueba de Nivel" por correo y asignar nivel obtenido | Covered by analysis of `generarListaFinalCurso()` intervention point (lines 41-43 in ListaFinal.ts) and `PLACEMENT_COL.correo/nivel` index constants |
| NIVEL-02 | Si nivel obtenido está en rango ofrecido (B1+, B2.1, B2.2, C1), el estudiante aparece bajo ese nivel en lista final | Hardcoded valid-levels array `["B1+", "B2.1", "B2.2", "C1"]`; replaces "PRUEBA DE NIVEL" group assignment |
| NIVEL-03 | Si nivel está por debajo del mínimo (A1, A2, B1.1), estudiante excluido de lista final y marcado en "Prueba de Nivel" | New `"Nivel Insuficiente"` column appended to `PLACEMENT_HEADERS`; skip branch in grouping logic |
| NIVEL-04 | Si resultado no ingresado (columna Nivel vacía), estudiante permanece en "PRUEBA DE NIVEL" con advertencia al admin | Warning string appended to `generarListaFinalCurso()` return value; no dialog needed |
| NIVEL-05 | `CorreoInicioClases.html` incluye frase de asignación de nivel unificada | Static paragraph insertion in `.content` block; no new template variable required |
| NIVEL-06 | Nueva opción de menú envía correo a candidatos con nivel insuficiente; template `CorreoRechazoPorNivel.html`; idempotente | New `RechazoPorNivel.ts` module; `"Correo Rechazo Enviado"` column in `PLACEMENT_HEADERS`; reuses `renderCorreoInicioClases()` pattern |
| NIVEL-07 | Nueva opción de menú bajo submenú "Enviar Correos" | `Menu.ts:onOpen()` — insert after separator before `"🏫 Inicio de Clases"` (currently last item in subMenu, line 35) |
</phase_requirements>

---

## Summary

This phase modifies three existing source files (`ListaFinal.ts`, `Placement.ts`, `CorreoInicioClases.html`) and adds two new files (`RechazoPorNivel.ts`, `CorreoRechazoPorNivel.html`), plus a one-liner addition to `Menu.ts`. The entire implementation is a GAS TypeScript project that compiles to JavaScript for manual deployment; there is no automated test runner — all tests are GAS-runnable functions that log to the Executions panel.

The critical data flow is: `generarListaFinalCurso()` reads "Seleccionados", detects "Test de nivel" students, looks them up in "Prueba de Nivel" by email (normalized to lowercase), then routes each student to their resolved nivel group or excludes them and marks the placement sheet. The rejection email function reads directly from "Prueba de Nivel", targets rows where `"Nivel Insuficiente" === "Sí"` and `"Correo Rechazo Enviado"` is blank, and follows the identical idempotency pattern used in `InicioClases.ts`.

The two columns to add (`"Nivel Insuficiente"`, `"Correo Rechazo Enviado"`) must be appended to `PLACEMENT_HEADERS` and `PLACEMENT_COL` in `Placement.ts`. The existing `_initPlacementSheet()` function will initialize them for newly created sheets; existing sheets require the columns to be appended at runtime when first written (GAS `setValues` on a cell beyond current lastColumn auto-extends the sheet).

**Primary recommendation:** Implement in a single wave — `Placement.ts` column additions first (they are depended upon by all other changes), then `ListaFinal.ts` logic, then `RechazoPorNivel.ts` + `CorreoRechazoPorNivel.html`, then `CorreoInicioClases.html` phrase, then `Menu.ts` entry point.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Google Apps Script (GAS) | Container-bound (V8 runtime) | Server-side execution against Google Sheets/Gmail | Project is already GAS-bound; no alternatives |
| TypeScript | 5.x (tsc configured in `src/tsconfig.json`) | Type-safe authoring, compiled to JS for GAS | Established project pattern |
| `@types/google-apps-script` | latest (devDependency) | GAS API type definitions | Required for `SpreadsheetApp`, `GmailApp`, `HtmlService` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `HtmlService.createTemplateFromFile()` | GAS built-in | Render `.html` templates with server-side variable injection | All email templates — already the project pattern |
| `MailApp.getRemainingDailyQuota()` | GAS built-in | Quota guard before batch sends | Required before any email batch (project pattern, QUAL-01 verified) |
| `SpreadsheetApp.getActiveSpreadsheet()` | GAS built-in | Sheet access | All data reads/writes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New module `RechazoPorNivel.ts` | Extend `InicioClases.ts` | Separate module preferred for cohesion — rejection emails concern Placement, not InicioClases |
| Static `"Nivel Insuficiente"` column in sheet | Boolean value | String `"Sí"` matches project pattern for human-readable status columns |

**Installation:** No new packages required. All APIs are GAS built-ins already in use.

**Build command:** `npm run build` (from repo root — compiles `src/*.ts` → `PUCV2English/*.js`)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── Placement.ts           # MODIFY — add 2 new columns to PLACEMENT_HEADERS/PLACEMENT_COL
├── ListaFinal.ts          # MODIFY — resolve nivel before grouping (lines ~41-43)
├── CorreoInicioClases.html # MODIFY — add unified nivel assignment phrase
├── RechazoPorNivel.ts     # NEW — enviarCorreosRechazoPorNivel() function
├── CorreoRechazoPorNivel.html # NEW — rejection email template
└── Menu.ts                # MODIFY — add menu item (line ~35)
```

### Pattern 1: Placement Sheet Column Extension

**What:** Add new sentinel columns to `PLACEMENT_HEADERS` array and corresponding numeric index entries to `PLACEMENT_COL` object in `Placement.ts`.

**When to use:** Any time new per-candidate state needs to be tracked in "Prueba de Nivel".

**Example (from existing code, Placement.ts lines 22-48):**
```typescript
// AFTER existing last entry ("Reminder Status"):
const PLACEMENT_HEADERS = [
  // ... existing 11 entries ...
  "Nivel Insuficiente",      // index 11 — new for Phase 3
  "Correo Rechazo Enviado"   // index 12 — new for Phase 3
];

const PLACEMENT_COL = {
  // ... existing entries ...
  status: 10,
  nivelInsuficiente: 11,     // new
  correoRechazaEnviado: 12   // new
};
```

**Critical:** `_initPlacementSheet()` uses `PLACEMENT_HEADERS.length` for the range width — extending the array automatically covers initialization for new sheets. Existing sheets auto-extend when GAS writes beyond `lastColumn`.

### Pattern 2: Level Resolution in generarListaFinalCurso()

**What:** Before the existing grouping block at line 41, for students with `Verificación Certificado === "Test de nivel"`, look up their result in the "Prueba de Nivel" sheet by email (normalized lowercase match), then branch on valid/insuficiente/pending.

**Intervention point (ListaFinal.ts lines 38-47):**
```typescript
// Current code (to be replaced/extended):
finales.forEach(f => {
  let nivel = String(f[idxNivel]).trim();
  if (String(f[idxVerificacion]).toLowerCase() === 'test de nivel') {
    nivel = "PRUEBA DE NIVEL";  // ← Phase 3 replaces this block
  }
  // ...
});
```

**Replacement logic structure:**
```typescript
const VALID_LEVELS = ["B1+", "B2.1", "B2.2", "C1"];

// Read "Prueba de Nivel" ONCE before the forEach loop
const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
const placMap = buildPlacementEmailMap(placSheet); // email → nivel string

const pendingTestEmails: string[] = [];

finales.forEach(f => {
  let nivel = String(f[idxNivel]).trim();
  const esTest = String(f[idxVerificacion]).toLowerCase() === 'test de nivel';

  if (esTest) {
    const correo = String(f[idxCorreo]).trim().toLowerCase();
    const resultado = placMap.get(correo) ?? "";

    if (resultado === "") {
      nivel = "PRUEBA DE NIVEL";
      pendingTestEmails.push(correo);
    } else if (VALID_LEVELS.includes(resultado)) {
      nivel = resultado;           // NIVEL-02: assign real level
    } else {
      // NIVEL-03: insufficient — mark in sheet, exclude from list
      markNivelInsuficiente(placSheet, correo);
      return; // skip — do not push to grupos
    }
  }
  // ... existing group push logic
});

// NIVEL-04: append warning to return string
if (pendingTestEmails.length > 0) {
  warningMsg = `${pendingTestEmails.length} estudiante(s) aún sin resultado en Prueba de Nivel: ${pendingTestEmails.join(", ")}. Ingresar resultados y regenerar.`;
}
```

### Pattern 3: Idempotent Email Batch (Rejection Emails)

**What:** Reuse the exact pattern from `InicioClases.ts:enviarCorreosInicioClases()`. Read all rows from "Prueba de Nivel", filter on `"Nivel Insuficiente" === "Sí"` AND `"Correo Rechazo Enviado"` blank, send email, write `new Date()` to the `"Correo Rechazo Enviado"` cell.

**Source pattern (InicioClases.ts lines 129, 216-217):**
```typescript
// Idempotency guard:
if (idxNotif !== -1 && row[idxNotif] !== "" && row[idxNotif] !== null) return;
// ...after successful send:
hoja.getRange(r.rowNum, idxCorrRechEnviado + 1).setValue(new Date());
```

**Quota check (InicioClases.ts lines 175-178):**
```typescript
const quota = MailApp.getRemainingDailyQuota();
if (quota < recipients.length) {
  return `ERROR: Cuota insuficiente. Quedan ${quota} envíos, necesitas ${recipients.length}.`;
}
```

### Pattern 4: HTML Template Rendering

**What:** All email templates use `HtmlService.createTemplateFromFile('FileName')` — GAS scriptlet syntax `<?= variable ?>` in the HTML. Properties assigned directly to the template object.

**Source pattern (InicioClases.ts lines 148-158):**
```typescript
function renderCorreoRechazoPorNivel(vars: ICorreoRechazoPorNivelVars): string {
  const tpl = HtmlService.createTemplateFromFile('CorreoRechazoPorNivel');
  (tpl as any).nombre = vars.nombre;
  (tpl as any).nivel  = vars.nivel;
  return tpl.evaluate().getContent();
}
```

**Critical:** The HTML file must exist in `src/` (TypeScript source) AND be manually copied to `PUCV2English/` (GAS deployment folder). The build script compiles `.ts` → `.js` but does NOT copy `.html` files — this is a manual deployment step.

### Anti-Patterns to Avoid

- **Reading "Prueba de Nivel" inside the forEach loop:** Load the full placement sheet once before the loop and build a `Map<email, nivel>` for O(1) lookup. Do NOT call `getSheetByName()` or `getDataRange().getValues()` repeatedly inside loops — every GAS API call has latency.
- **Writing cells one by one inside the forEach loop:** Batch mark `"Nivel Insuficiente"` writes using accumulated row indices; write all at once after the loop using `setValues()` ranges where possible. (Exception: for the rejection email send, writing per-row is acceptable given the quota guard already limits batch size.)
- **Using `===` for email comparison without normalization:** Always `.trim().toLowerCase()` both sides before email matching — this is the established pattern in `sincronizarPlacement()` (Placement.ts line 123).
- **Modifying `CONFIG.COLUMNS` for placement columns:** The existing pattern is to add placement-specific columns to `PLACEMENT_COL` in `Placement.ts`, NOT to `CONFIG.COLUMNS` in `Config.ts` (per canonical ref in CONTEXT.md).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email quota enforcement | Custom counter | `MailApp.getRemainingDailyQuota()` | GAS enforces 100/day for consumer, 1500/day for Workspace — API is authoritative |
| Idempotency tracking | In-memory flag | Write date to sheet column on success | GAS execution is stateless per call; the sheet is the only durable state store |
| HTML email rendering | String concatenation | `HtmlService.createTemplateFromFile()` | Project-established pattern; handles encoding, scriptlet evaluation correctly |
| Email delivery via GAS | Custom SMTP | `GmailApp.sendEmail()` | Project-established pattern; GAS handles auth and sending |

**Key insight:** GAS has no persistent in-memory state between executions. The sheet IS the database. Every idempotency check, status flag, and audit trail must live in a cell.

---

## Common Pitfalls

### Pitfall 1: "Prueba de Nivel" Sheet May Not Exist

**What goes wrong:** `generarListaFinalCurso()` calls `getSheetByName(CONFIG.SHEETS.PLACEMENT)` — if the sheet was never created (no students sent to placement), this returns `null` and any property access throws.

**Why it happens:** The sheet is created lazily by `sincronizarPlacement()`. It only exists if placement sync has been run at least once.

**How to avoid:** Null-guard the sheet reference. If `placSheet === null`, all "Test de nivel" students should fall through to "PRUEBA DE NIVEL" (no results to look up). Never throw — return gracefully.

**Warning signs:** `TypeError: Cannot read property 'getDataRange' of null` in GAS execution log.

### Pitfall 2: Email Normalization Mismatch

**What goes wrong:** A student's email in "Seleccionados" is `User@Example.com` but stored in "Prueba de Nivel" as `user@example.com`. The lookup returns `undefined`.

**Why it happens:** GAS stores cell values exactly as entered. Google Forms may preserve case.

**How to avoid:** Apply `.trim().toLowerCase()` to ALL email values before building the lookup Map and before querying it. The project already uses this pattern in `sincronizarPlacement()` (line 123).

### Pitfall 3: Column Index Drift After Adding New Columns

**What goes wrong:** `PLACEMENT_COL` is a zero-indexed map of column positions. After adding two columns (indices 11 and 12), any code that hard-codes column numbers or iterates over `PLACEMENT_HEADERS.length` must be verified.

**Why it happens:** `_initPlacementSheet()` writes headers using `PLACEMENT_HEADERS.length` as the column count — this will automatically extend to 13 columns for new sheets. Existing sheets will already have 11 columns. The write of the new columns will auto-extend.

**How to avoid:** Always reference columns via `PLACEMENT_COL.nivelInsuficiente + 1` (1-based) rather than hard-coded numbers. Verify `_initPlacementSheet()` sets data validation for Nivel column (col 7) — unchanged, safe.

### Pitfall 4: Build-Only Copies .ts → .js, NOT .html Files

**What goes wrong:** `CorreoRechazoPorNivel.html` is created in `src/` but `npm run build` does not copy it to `PUCV2English/`. The GAS project only knows about files in `PUCV2English/`. Deploying without manually copying the HTML results in `Unable to find item: CorreoRechazoPorNivel`.

**Why it happens:** The TypeScript build pipeline (`tsc`) only processes `.ts` files. HTML files are static assets that must be manually mirrored.

**How to avoid:** After creating `src/CorreoRechazoPorNivel.html`, also create an identical copy at `PUCV2English/CorreoRechazoPorNivel.html`. Both files must remain in sync. Verify during testing with `testRenderCorreoRechazoPorNivel()`.

### Pitfall 5: Returning Early from forEach Skips `continue` — Must Use `return`

**What goes wrong:** Inside `finales.forEach(f => { ... })`, using `continue` causes a SyntaxError. To skip a student (insufficient level exclusion), the correct pattern is `return` (exits current callback iteration).

**Why it happens:** JavaScript's `forEach` callback is a function, not a loop body. `continue` is not valid. `return` exits the current callback invocation.

**How to avoid:** Use `return;` to skip (as seen in existing code in `InicioClases.ts`). This is already the project pattern.

### Pitfall 6: Marking "Nivel Insuficiente" Inside generarListaFinalCurso() Has Side Effects

**What goes wrong:** `generarListaFinalCurso()` is designed to be re-runnable (it clears and regenerates the final list). If it also writes to "Prueba de Nivel", re-running it would re-mark students. This is acceptable (idempotent write of `"Sí"` to a cell already containing `"Sí"`), but the plan must note that `generarListaFinalCurso()` now has a write side effect on a sheet it previously only read from.

**How to avoid:** The write is idempotent (`setValues([["Sí"]])` on a cell already set to `"Sí"` is harmless). Document this side effect in the JSDoc of the function.

---

## Code Examples

### Building a Placement Email Map (O(1) lookup)

```typescript
// Source: derived from Placement.ts sincronizarPlacement() pattern
function _buildPlacementEmailMap(
  placSheet: GoogleAppsScript.Spreadsheet.Sheet | null
): Map<string, string> {
  const map = new Map<string, string>();
  if (!placSheet) return map;
  const data = placSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const correo = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
    const nivel  = (data[r][PLACEMENT_COL.nivel]  || "").toString().trim();
    if (correo) map.set(correo, nivel);
  }
  return map;
}
```

### Marking Nivel Insuficiente in the Placement Sheet

```typescript
// Source: pattern derived from InicioClases.ts write-back approach
function _markNivelInsuficiente(
  placSheet: GoogleAppsScript.Spreadsheet.Sheet,
  emailLower: string
): void {
  const data = placSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const rowEmail = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
    if (rowEmail === emailLower) {
      placSheet.getRange(r + 1, PLACEMENT_COL.nivelInsuficiente + 1).setValue("Sí");
      return;
    }
  }
}
```

### enviarCorreosRechazoPorNivel() skeleton

```typescript
// Source: mirrors InicioClases.ts:enviarCorreosInicioClases() pattern
function enviarCorreosRechazoPorNivel(): string {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
  if (!placSheet) return "ERROR: Hoja \"Prueba de Nivel\" no encontrada.";

  const data = placSheet.getDataRange().getValues();
  if (data.length < 2) return "No hay datos en \"Prueba de Nivel\".";

  // Collect eligible recipients
  const recipients: { rowNum: number; nombre: string; correo: string; nivel: string }[] = [];
  for (let r = 1; r < data.length; r++) {
    const esInsuficiente = (data[r][PLACEMENT_COL.nivelInsuficiente] || "").toString().trim() === "Sí";
    const yaEnviado      = (data[r][PLACEMENT_COL.correoRechazaEnviado] || "").toString().trim() !== "";
    if (!esInsuficiente || yaEnviado) continue;
    recipients.push({
      rowNum: r + 1,
      nombre: (data[r][PLACEMENT_COL.nombre] || "").toString().trim(),
      correo: (data[r][PLACEMENT_COL.correo] || "").toString().trim(),
      nivel:  (data[r][PLACEMENT_COL.nivel]  || "").toString().trim(),
    });
  }

  if (recipients.length === 0) return "No hay destinatarios pendientes de correo de rechazo.";

  const quota = MailApp.getRemainingDailyQuota();
  if (quota < recipients.length) {
    return `ERROR: Cuota insuficiente. Quedan ${quota} envíos, necesitas ${recipients.length}.`;
  }

  let count = 0;
  const errores: string[] = [];
  const subject = "Resultado de Prueba de Nivel — PUCV2English";

  recipients.forEach(r => {
    try {
      const htmlBody = renderCorreoRechazoPorNivel({ nombre: r.nombre, nivel: r.nivel });
      GmailApp.sendEmail(r.correo, subject, "", { htmlBody, name: "Programa PUCV2English" });
      placSheet.getRange(r.rowNum, PLACEMENT_COL.correoRechazaEnviado + 1).setValue(new Date());
      count++;
    } catch (e: any) {
      errores.push(`[${r.correo}]: ${e.message}`);
    }
  });

  if (errores.length > 0) {
    return `Se enviaron ${count} correos de rechazo.\n\nErrores:\n${errores.slice(0, 3).join("\n")}`;
  }
  return `Se enviaron ${count} correos de rechazo por nivel insuficiente exitosamente.`;
}
```

### CorreoRechazoPorNivel.html structure

```html
<!-- Matches CorreoInicioClases.html visual style exactly -->
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: 'Roboto', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; color: #333333; }
    .container { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0055a2; }
    .header img { max-width: 150px; }
    .content { padding: 20px 0; line-height: 1.7; }
    .content h3 { color: #003366; }
    .highlight { background-color: #e9f2fa; padding: 15px; border-left: 4px solid #0055a2; margin: 20px 0; border-radius: 4px; }
    .highlight strong { color: #003366; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #777777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.pucv.cl/pucv/site/artic/20220615/imag/foto_0000000120220615160256/logo_header.png" alt="Logo PUCV">
    </div>
    <div class="content">
      <h3>Estimado/a <?= nombre ?>,</h3>
      <p>Junto con saludar, te informamos que hemos recibido los resultados de tu Prueba de Nivel (CEPT) del programa <strong>PUCV2English</strong>.</p>
      <div class="highlight">
        <p>El nivel obtenido en tu prueba (<strong><?= nivel ?></strong>) se encuentra <strong>por debajo del mínimo requerido</strong> para los cursos ofrecidos en el programa (B1+ o superior).</p>
        <p>Lamentablemente, no es posible incluirte en el presente período lectivo.</p>
      </div>
      <p>Si deseas obtener una <strong>constancia oficial del nivel alcanzado</strong>, puedes solicitarla enviando un correo a la coordinación con copia a <a href="mailto:alexis.ponce@pucv.cl">alexis.ponce@pucv.cl</a>.</p>
      <p>Te invitamos a consultar los recursos de idiomas y otros programas disponibles en la PUCV que podrían apoyar tu desarrollo en el idioma inglés.</p>
      <br>
      <p>Saludos cordiales,<br>Coordinación PUCV2English</p>
    </div>
    <div class="footer">
      <p>Pontificia Universidad Católica de Valparaíso</p>
    </div>
  </div>
</body>
</html>
```

### CorreoInicioClases.html — nivel phrase insertion point

The phrase (D-08) fits naturally **after the greeting paragraph and before the highlight box**, within the `.content` block:

```html
<!-- After: <p>...comienzan el <strong><?= fechaInicio ?></strong>...</p> -->
<!-- INSERT: -->
<p>
  De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado
  presentado durante el proceso de postulación, fuiste asignado/a al nivel
  <strong><?= nivel ?></strong>.
</p>
<!-- Then: <div class="highlight">... -->
```

No new template variable is needed — `nivel` is already injected by `renderCorreoInicioClases()`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All "Test de nivel" students grouped under "PRUEBA DE NIVEL" (lines 41-43, ListaFinal.ts) | Students resolved to real level or excluded based on Prueba de Nivel results | Phase 3 | PRUEBA DE NIVEL group becomes a pending-only bucket |
| Placement columns fixed at 11 (indices 0-10) | 13 columns (indices 0-12) after adding Nivel Insuficiente + Correo Rechazo Enviado | Phase 3 | `_initPlacementSheet()` auto-handles new sheets; existing sheets auto-extend on write |

**Deprecated/outdated:**

- The assumption that `"PRUEBA DE NIVEL"` group in the final list contains all test-level students. Post Phase 3, it only contains students with **no result yet entered**.

---

## Open Questions

1. **Should `generarListaFinalCurso()` also update "Nivel Asignado" in "Seleccionados" for resolved test students?**
   - What we know: NIVEL-01 says "actualiza la lista final y la columna 'Nivel Asignado' en 'Seleccionados'". D-01 in CONTEXT.md only mentions the Lista Final grouping.
   - What's unclear: REQUIREMENTS.md NIVEL-01 mentions updating "Nivel Asignado" in "Seleccionados". CONTEXT.md D-01 does not explicitly require this. Potential scope gap.
   - Recommendation: Include the back-write to "Seleccionados" to satisfy NIVEL-01 text, unless the planner determines it is out of scope given CONTEXT.md's more restricted D-01 description. Safer to include — it uses the same selSheet already loaded.

2. **New columns in existing "Prueba de Nivel" sheets**
   - What we know: GAS `setValues()` writes beyond `lastColumn` auto-extend the sheet. `getDataRange()` returns rows up to actual data bounds.
   - What's unclear: If existing data lacks the new columns, `data[r][PLACEMENT_COL.nivelInsuficiente]` returns `undefined` (not `""`). The null guard `|| ""` pattern handles this, but should be explicitly documented.
   - Recommendation: Always coerce with `(data[r][PLACEMENT_COL.nivelInsuficiente] || "").toString().trim()` — `undefined` coerces to `""` via `|| ""`.

---

## Environment Availability

This phase is purely code/config changes to a GAS TypeScript project. All runtime dependencies are GAS built-ins (SpreadsheetApp, GmailApp, HtmlService, MailApp). No external tools, CLIs, databases, or services beyond those already in production are required.

Step 2.6: SKIPPED (no new external dependencies — all GAS APIs already in use)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | GAS editor-runnable test functions (no external runner) |
| Config file | None — tests are GAS functions run from the Apps Script editor |
| Quick run command | Select function name in GAS editor → click Run button → check Executions log |
| Full suite command | Run each `test*` function individually in GAS editor |

**Note:** This project has no automated test runner (`npm test` is not configured). All validation is done by running named `test*` functions in the GAS editor. This is the established pattern (see `TestInicioClases.ts`). Phase 3 will add `TestRechazoPorNivel.ts` following the same pattern.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NIVEL-01 | Estudiante "Test de nivel" con nivel válido aparece bajo nivel real, no "PRUEBA DE NIVEL" | integration (GAS) | Run `testGenerarListaFinal_NivelValido()` in GAS editor | ❌ Wave 0 |
| NIVEL-02 | Nivel B1+/B2.1/B2.2/C1 → incluido en grupo correspondiente | integration (GAS) | Same as NIVEL-01 | ❌ Wave 0 |
| NIVEL-03 | Nivel A1/A2/B1.1 → excluido de lista; marcado "Sí" en col "Nivel Insuficiente" | integration (GAS) | Run `testGenerarListaFinal_NivelInsuficiente()` in GAS editor | ❌ Wave 0 |
| NIVEL-04 | Nivel vacío → permanece "PRUEBA DE NIVEL"; string retorno contiene advertencia con email | integration (GAS) | Run `testGenerarListaFinal_SinResultado()` in GAS editor | ❌ Wave 0 |
| NIVEL-05 | CorreoInicioClases.html renderizado contiene frase de nivel exacta | unit (GAS) | Run `testRenderCorreoInicioClases_FraseNivel()` in GAS editor | ❌ Wave 0 |
| NIVEL-06 | enviarCorreosRechazoPorNivel() envía solo a filas con "Sí"/sin fecha; escribe fecha tras envío | integration (GAS) | Run `testEnviarCorreosRechazoPorNivel_Idempotencia()` in GAS editor | ❌ Wave 0 |
| NIVEL-07 | Menú PUCV2English > Enviar Correos > "❌ Rechazo por Nivel Insuficiente" visible y clickeable | manual | Open spreadsheet, check menu | manual-only |

### Sampling Rate

- **Per task commit:** Run the relevant `test*` function for the task in GAS editor; verify Executions log shows OK.
- **Per wave merge:** Run all Phase 3 test functions in `TestRechazoPorNivel.ts`.
- **Phase gate:** All test functions log OK before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `src/TestRechazoPorNivel.ts` — covers NIVEL-01 through NIVEL-06 test functions
- [ ] Manual deployment of `src/CorreoRechazoPorNivel.html` to `PUCV2English/` (no build automation for HTML)

---

## Project Constraints (from CLAUDE.md)

- OS is Windows 11 but shell is Git Bash — use Unix paths
- Build command: `npm run build` from repo root
- Deployment is **manual copy-paste** of built JS files + HTML files into the GAS editor (Extensions > Apps Script in Google Sheets)
- Testing: run named test functions directly in the GAS editor; output goes to Executions panel
- No local test runner; no `npm test` command for GAS projects
- TypeScript → GAS pipeline: `src/*.ts` compiles to `PUCV2English/*.js`; HTML files are NOT copied by build — must be manually mirrored to `PUCV2English/`

---

## Sources

### Primary (HIGH confidence)

- Direct code reading: `src/Placement.ts` — PLACEMENT_HEADERS (line 22), PLACEMENT_COL (line 36), sincronizarPlacement() email normalization pattern (line 123), `_initPlacementSheet()` (line 402)
- Direct code reading: `src/ListaFinal.ts` — `generarListaFinalCurso()` full function; intervention point lines 41-43
- Direct code reading: `src/InicioClases.ts` — idempotency pattern (lines 129, 216-217), quota check (lines 175-178), `renderCorreoInicioClases()` pattern (lines 148-158)
- Direct code reading: `src/Menu.ts` — subMenu "Enviar Correos" structure (lines 23-35)
- Direct code reading: `src/CorreoInicioClases.html` — full template; intervention point for D-08 phrase
- Direct code reading: `src/Config.ts` — CONFIG.SHEETS.PLACEMENT (line 127), CONFIG.COLUMNS pattern (lines 131-176)
- Direct code reading: `.planning/phases/03-asignaci-n-por-test-de-nivel/03-CONTEXT.md` — all locked decisions D-01 through D-12

### Secondary (MEDIUM confidence)

- GAS documentation (training knowledge, confirmed by existing codebase usage): `HtmlService.createTemplateFromFile()`, `MailApp.getRemainingDailyQuota()`, `GmailApp.sendEmail()`, `SpreadsheetApp.getSheetByName()` — all confirmed in use in existing src files

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs already in production use in the codebase
- Architecture: HIGH — patterns directly observed in existing `InicioClases.ts` and `Placement.ts`
- Pitfalls: HIGH — null-guard, email normalization, and column drift risks are directly visible in the existing code structure; build pipeline HTML gap confirmed by directory listing

**Research date:** 2026-08-05
**Valid until:** 2026-11-05 (stable GAS APIs; 90-day validity)
