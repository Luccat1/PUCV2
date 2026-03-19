# Testing Patterns

**Analysis Date:** 2026-03-19

## Test Framework

**Status:** Not detected

**Current State:**
- No Jest, Vitest, Mocha, or other test framework
- No test files (.test.ts, .spec.ts)
- No test configuration files
- Google Apps Script native testing pattern not implemented

**Build/Execution:**
- TypeScript compilation only: `npm run build` compiles to `dist/`
- Manual testing in GAS editor (copy-paste compiled code)
- No automated test runner

## Testing Approach

**Current Method:**
- Manual testing via Google Sheets UI
- Test email functions: `sendTestEmail()` in `src/Correos.ts`
- Logging via `logToWebApp()` for debugging
- Web App dashboard for manual inspection

**Entry Points for Manual Testing:**
- Menu functions from Google Sheets custom menu (PUCV2English)
- Web App interface at `doGet()` in `src/WebApp.ts`
- Direct function calls in GAS editor

## Test Structure

**Manual Testing Pattern:**
GAS allows named functions to be executed directly in the editor

**Return-Based Testing:**
Functions return error strings rather than throwing, enabling testing via return values:

```
function sendEmailBatch(type: string): string {
  const recipients = getRecipients(type);
  if (recipients.length === 0) {
    return "No hay destinatarios pendientes...";
  }

  const quota = MailApp.getRemainingDailyQuota();
  if (quota < recipients.length) {
    return `ERROR: Cuota insuficiente...`;
  }
}
```

## Mocking

**Current Approach:** Not formalized

**Available Tools:**
- `resetConfiguracion()` function - resets to defaults
- Direct spreadsheet manipulation for test data
- `logToWebApp()` captures execution traces

**Environment Isolation:**
- PropertiesService for state storage
- No teardown functions
- No test data fixtures or factories

## Fixtures and Factories

**Test Data Pattern:**
- Hardcoded in spreadsheet sheets (not version controlled)
- Manual setup required before each test run
- Reset via `resetConfiguracion()` to defaults

**Location:**
- Test data in Google Sheets sheets directly
- No local test fixtures in code
- Default values in `src/Config.ts`:
  - `DEFAULT_SCORING_PARAMS`
  - `DEFAULT_PROGRAM_DATA`

## Coverage

**Requirements:** None enforced

**Status:** No coverage measurement tools

## Test Types

**Unit Tests:** Not implemented
- No isolated function tests
- Would require mocking GAS APIs
- Scoring functions could be testable

**Integration Tests:** Manual
- End-to-end workflows in Google Sheets
- Verify data flow: input -> evaluation -> output
- Email sending tested with preview and quota checks

**E2E Tests:** Not implemented
- Would require headless Sheets automation
- Currently tested via Web App in browser

## Validation Testing Observed

**Regex-Based Validation:**
Pattern matching in `src/Evaluacion.ts` for scoring:

```
function detectarNivelCertificado(certificado: string): number {
  const txt = String(certificado || "").toLowerCase();
  if (/C1/i.test(txt)) return 5;
  if (/B2\.2/i.test(txt)) return 4;
  if (/B2\.1/i.test(txt)) return 3;
  if (/\bexim/i.test(txt)) return 2;
  if (/B1\+/i.test(txt)) return 1.5;
  return 0;
}
```

**Early Return Validation:**
Precondition checking in `src/ListaFinal.ts`:

```
function generarListaFinalCurso(): string {
  const ss = getSpreadsheet();
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaS) return "Error: Hoja 'Seleccionados' no encontrada.";

  const datosS = hojaS.getDataRange().getValues();
  const headers = datosS.shift();
  if (!headers) return "Error: Hoja vacía.";
}
```

## Logging for Debugging

Progress logging in `src/Evaluacion.ts`:

```
logToWebApp("Intentando iniciar evaluación...");
if (!tuvoExito) {
  logToWebApp("No se pudo obtener el bloqueo...");
  return "No se pudo iniciar...";
}

try {
  logToWebApp("Cargando configuración...");
  cargarConfiguracionDesdeHoja();
  logToWebApp(`Procesando ${datos.length - 1} filas...`);
  logToWebApp("Evaluación completada.");
} finally {
  lock.releaseLock();
}
```

## Manual Testing Workflow

**For Evaluation Function:**
1. Populate input sheet with test applicants
2. Google Sheets menu PUCV2English > "Evaluar Postulaciones"
3. Monitor logs via Web App interface
4. Verify output in "Evaluacion automatizada" sheet
5. Check dashboard statistics

**For Email Sending:**
1. Test email: Menu > "Enviar Correos" > "Enviar Correo de Prueba"
2. Provide test email address and template type
3. Check email received and format
4. For batch: use "Vista Previa" to inspect recipients first
5. Confirm and send via category

**For Configuration:**
1. Menu > "Configurar Pesos"
2. Modify scoring parameters in sidebar
3. Save via sidebar action
4. Verify in "Configuracion" sheet
5. Run evaluation to confirm weights apply

## What is NOT Tested

**No Test Coverage For:**
- Spreadsheet API failures
- Concurrent evaluation attempts
- Large dataset performance (1000+ applicants)
- Email quota exhaustion (returns error string only)
- Invalid certificate formats
- Duplicate applicant edge cases
- Configuration validation
- HTML template rendering in clients
- Web App form submission security

**Risk Areas:**
- Scoring calculation accuracy (manual inspection only)
- Email template rendering (manual client testing)
- Data persistence (sheet inspection)
- Internationalization (Spanish strings hardcoded)

---

*Testing analysis: 2026-03-19*
