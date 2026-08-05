/**
 * @file TestRechazoPorNivel.ts
 * GAS test stubs for Phase 3 — Asignación por Test de Nivel.
 * Run each function individually from the GAS Apps Script editor.
 * All output goes to the Executions log (Logger.log).
 */

// Forward declaration for RechazoPorNivel.ts (implemented in Plan 03-03).
// At GAS runtime all .ts files compile into one global scope — this function will exist.
declare function enviarCorreosRechazoPorNivel(): string;

/**
 * NIVEL-01, NIVEL-02: Verifies that a student with "Test de nivel" and a valid
 * level (B1+/B2.1/B2.2/C1) in "Prueba de Nivel" appears under their real level
 * in the final list — not under "PRUEBA DE NIVEL".
 *
 * SETUP REQUIRED: At least one row in "Seleccionados" with Verificación Certificado
 * = "Test de nivel", Aceptación = "Acepta", Pago Matrícula = "Pagado"; and a
 * matching row in "Prueba de Nivel" with Nivel = "B2.1" (or any valid level).
 */
function testGenerarListaFinal_NivelValido(): void {
  const result = generarListaFinalCurso();
  Logger.log("[NIVEL-01/02] generarListaFinalCurso() returned: " + result);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaF = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hojaF) {
    Logger.log("FAIL: Lista Final Curso sheet not found.");
    return;
  }
  const data = hojaF.getDataRange().getValues();
  const nivelesEnLista = data.map(r => String(r[3]).trim());

  const hasPruebaDeNivel = nivelesEnLista.some(n => n === "PRUEBA DE NIVEL");
  const hasRealLevel     = nivelesEnLista.some(n => ["B1+","B2.1","B2.2","C1"].includes(n));
  Logger.log("[NIVEL-01] 'PRUEBA DE NIVEL' group present (should be false for fully resolved): " + hasPruebaDeNivel);
  Logger.log("[NIVEL-02] Real level group present (should be true): " + hasRealLevel);
  Logger.log("[NIVEL-01/02] PASS if real level present and no residual PRUEBA DE NIVEL group (if all students resolved).");
}

/**
 * NIVEL-03: Verifies that a student with an insufficient level (A1/A2/B1.1)
 * is excluded from the final list and marked "Sí" in "Nivel Insuficiente" column.
 *
 * SETUP REQUIRED: At least one row in "Seleccionados" with Verificación Certificado
 * = "Test de nivel"; matching row in "Prueba de Nivel" with Nivel = "A2".
 */
function testGenerarListaFinal_NivelInsuficiente(): void {
  generarListaFinalCurso();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
  if (!placSheet) {
    Logger.log("FAIL: 'Prueba de Nivel' sheet not found.");
    return;
  }

  const data = placSheet.getDataRange().getValues();
  let found = false;
  for (let r = 1; r < data.length; r++) {
    const nivelInsuf = (data[r][PLACEMENT_COL.nivelInsuficiente] || "").toString().trim();
    if (nivelInsuf === "Sí") {
      found = true;
      const correo = data[r][PLACEMENT_COL.correo];
      Logger.log("[NIVEL-03] Student marked as insufficient: " + correo + " — Nivel Insuficiente = Sí. OK.");
    }
  }
  if (!found) {
    Logger.log("[NIVEL-03] WARNING: No student marked with 'Sí' in 'Nivel Insuficiente'. Verify test data in 'Prueba de Nivel' has an A1/A2/B1.1 entry.");
  }
}

/**
 * NIVEL-04: Verifies that a student with no result yet (empty Nivel in "Prueba de Nivel")
 * remains under "PRUEBA DE NIVEL" and the return string contains a warning with their email.
 *
 * SETUP REQUIRED: At least one row in "Seleccionados" with Verificación Certificado
 * = "Test de nivel"; matching row in "Prueba de Nivel" with Nivel = "" (blank).
 */
function testGenerarListaFinal_SinResultado(): void {
  const result = generarListaFinalCurso();
  Logger.log("[NIVEL-04] generarListaFinalCurso() returned: " + result);

  const containsWarning = result.toLowerCase().includes("sin resultado") ||
                          result.toLowerCase().includes("aún") ||
                          result.includes("Ingresar resultados");
  Logger.log("[NIVEL-04] Return string contains pending-result warning: " + containsWarning);
  Logger.log("[NIVEL-04] PASS if warning text about pending results is present.");
}

/**
 * NIVEL-05: Verifies that renderCorreoInicioClases() output contains the exact
 * nivel-assignment phrase defined in D-08.
 *
 * No sheet setup required — uses HtmlService directly.
 */
function testRenderCorreoInicioClases_FraseNivel(): void {
  const html = renderCorreoInicioClases({
    nombre: "Test Usuario",
    nivel: "B2.1",
    catedra: "Lunes 14:00–16:00",
    ayudantia: "Miércoles 12:00–13:00",
    sala: "Sala 101",
    fechaInicio: "lunes 5 de agosto",
    fechaTermino: "viernes 13 de diciembre"
  });

  const expectedPhrase = "De acuerdo con los resultados obtenidos en tu prueba de nivel o al certificado presentado durante el proceso de postulación, fuiste asignado/a al nivel";
  const containsPhrase = html.includes(expectedPhrase);
  Logger.log("[NIVEL-05] HTML contains nivel-assignment phrase: " + containsPhrase);
  if (!containsPhrase) {
    Logger.log("[NIVEL-05] FAIL — phrase not found. Verify CorreoInicioClases.html was updated in Plan 04.");
  } else {
    Logger.log("[NIVEL-05] PASS");
  }
}

/**
 * NIVEL-06: Verifies idempotency of enviarCorreosRechazoPorNivel().
 * On second call, should return "No hay destinatarios pendientes" (0 sends).
 *
 * SETUP REQUIRED: At least one row in "Prueba de Nivel" with "Nivel Insuficiente" = "Sí"
 * and "Correo Rechazo Enviado" = "" (blank). Run once to send, then run again to verify skip.
 *
 * WARNING: This test sends real emails on first run. Use a test row with your own email.
 */
function testEnviarCorreosRechazoPorNivel_Idempotencia(): void {
  // First call — sends to any pending recipients
  const result1 = enviarCorreosRechazoPorNivel();
  Logger.log("[NIVEL-06] First call result: " + result1);

  // Second call — should find no pending recipients (all already sent)
  const result2 = enviarCorreosRechazoPorNivel();
  Logger.log("[NIVEL-06] Second call result: " + result2);

  const isIdempotent = result2.includes("No hay destinatarios pendientes") || result2.includes("0 correos");
  Logger.log("[NIVEL-06] Second call is idempotent (no double-sends): " + isIdempotent);
  if (!isIdempotent) {
    Logger.log("[NIVEL-06] FAIL — second call sent emails again. Check 'Correo Rechazo Enviado' write-back in RechazoPorNivel.ts.");
  } else {
    Logger.log("[NIVEL-06] PASS");
  }
}
