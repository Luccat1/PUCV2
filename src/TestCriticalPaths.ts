/**
 * @file TestCriticalPaths.ts
 * GAS test suite covering critical paths:
 * 1. Token flow: generate → consume → reject reuse (procesarAccionPostulante)
 * 2. Column layout of waitlist auto-promotion (gestionarListaDeEspera custom columns)
 * 3. NO_SELECTED rejection email idempotency (Fecha Notificación Rechazo)
 *
 * Runnable from GAS Executions panel or Apps Script editor.
 */

/**
 * Runs all critical path tests sequentially.
 */
function runAllCriticalPathTests(): void {
  Logger.log("=== STARTING CRITICAL PATH TEST SUITE ===");
  testProcesarAccionPostulante_TokenReuse();
  testGestionarListaDeEspera_ColumnLayout();
  testNoSelected_Idempotency();
  Logger.log("=== CRITICAL PATH TEST SUITE COMPLETED ===");
}

/**
 * Test 1: Asserts that procesarAccionPostulante() consumes the token,
 * deletes it from ScriptProperties, and returns failure (exito: false) on reuse.
 */
function testProcesarAccionPostulante_TokenReuse(): void {
  try {
    const testEmail = "token.test." + new Date().getTime() + "@pucv.cl";
    const token = generarToken(testEmail);
    Logger.log("[TEST-TOKEN-REUSE] Generated token for " + testEmail);

    const storedEmail = PropertiesService.getScriptProperties().getProperty('token_' + token);
    if (storedEmail !== testEmail) {
      Logger.log("[TEST-TOKEN-REUSE] FAIL — Token was not stored in ScriptProperties.");
      return;
    }

    // First call (consumes token)
    const result1 = procesarAccionPostulante(token, 'accept');
    Logger.log("[TEST-TOKEN-REUSE] First call result: exito=" + result1.exito);

    // Verify token was deleted from properties
    const tokenAfter = PropertiesService.getScriptProperties().getProperty('token_' + token);
    const isDeleted = (tokenAfter === null || tokenAfter === undefined);

    // Second call with same token must fail
    const result2 = procesarAccionPostulante(token, 'accept');
    Logger.log("[TEST-TOKEN-REUSE] Second call result: exito=" + result2.exito + " (mensaje: " + result2.mensaje + ")");

    if (result1.exito && isDeleted && !result2.exito) {
      Logger.log("[TEST-TOKEN-REUSE] PASS — Token generated, consumed, deleted, and rejected on reuse.");
    } else {
      Logger.log("[TEST-TOKEN-REUSE] FAIL — Token was not properly consumed/rejected. result1=" + result1.exito + ", isDeleted=" + isDeleted + ", result2=" + result2.exito);
    }
  } catch (e: any) {
    Logger.log("[TEST-TOKEN-REUSE] ERROR: " + e.message);
  }
}

/**
 * Test 2: Asserts that the Seleccionados sheet and gestionarListaDeEspera()
 * column layout contains all 6 custom columns:
 * 1. Verificación Certificado
 * 2. Nivel Asignado
 * 3. Aceptación
 * 4. Pago Matrícula
 * 5. Comentarios
 * 6. Fecha Notificación
 * and that Pago Matrícula is separated from Comentarios.
 */
function testGestionarListaDeEspera_ColumnLayout(): void {
  try {
    const ss = getSpreadsheet();
    const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaSelected) {
      Logger.log("[TEST-WAITLIST-COLS] SKIP — Sheet '" + CONFIG.SHEETS.SELECTED + "' not found.");
      return;
    }

    const headers = hojaSelected.getRange(1, 1, 1, hojaSelected.getLastColumn()).getValues()[0];
    const customHeaders = [
      "Verificación Certificado",
      "Nivel Asignado",
      "Aceptación",
      "Pago Matrícula",
      "Comentarios",
      "Fecha Notificación"
    ];

    const last6 = headers.slice(-6);
    Logger.log("[TEST-WAITLIST-COLS] Last 6 headers in Seleccionados: " + JSON.stringify(last6));

    const matches = customHeaders.every((h, i) => last6[i] === h);
    if (!matches) {
      Logger.log("[TEST-WAITLIST-COLS] FAIL — Headers do not match expected 6 custom columns. Expected: " + JSON.stringify(customHeaders));
      return;
    }

    // Verify row data if rows exist
    const lastRow = hojaSelected.getLastRow();
    if (lastRow > 1) {
      const rowVals = hojaSelected.getRange(lastRow, 1, 1, hojaSelected.getLastColumn()).getValues()[0];
      const customVals = rowVals.slice(-6);
      const pagoVal = String(customVals[3]);
      if (pagoVal.startsWith("Promovido")) {
        Logger.log("[TEST-WAITLIST-COLS] FAIL — 'Pago Matrícula' cell contains comment string: " + pagoVal);
        return;
      }
    }

    Logger.log("[TEST-WAITLIST-COLS] PASS — 6 custom columns present including 'Pago Matrícula'.");
  } catch (e: any) {
    Logger.log("[TEST-WAITLIST-COLS] ERROR: " + e.message);
  }
}

/**
 * Test 3: Asserts that NO_SELECTED rejection emails are idempotent.
 * Once Fecha Notificación Rechazo is stamped, the recipient is excluded from subsequent runs.
 */
function testNoSelected_Idempotency(): void {
  try {
    cargarConfiguracionDesdeHoja();
    const recipients = getRecipients('NO_SELECTED');
    Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] Current pending non-selected recipients: " + recipients.length);

    if (recipients.length === 0) {
      Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] PASS (0 pending) — No unnotified non-selected applicants.");
      return;
    }

    const testRecipient = recipients[0];
    const ss = getSpreadsheet();
    const hojaOutput = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (!hojaOutput) {
      Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] FAIL — Sheet '" + CONFIG.SHEETS.OUTPUT + "' not found.");
      return;
    }

    const headers = hojaOutput.getDataRange().getValues()[0];
    const colName = CONFIG.COLUMNS.REJECTION_NOTIFICATION_DATE || "Fecha Notificación Rechazo";
    const idxNotif = headers.indexOf(colName);

    if (idxNotif === -1) {
      Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] FAIL — Column '" + colName + "' not found in OUTPUT headers.");
      return;
    }

    // Temporarily stamp notification date
    const originalValue = hojaOutput.getRange(testRecipient.index, idxNotif + 1).getValue();
    hojaOutput.getRange(testRecipient.index, idxNotif + 1).setValue(new Date());

    // Verify recipient is now excluded
    const secondCheck = getRecipients('NO_SELECTED');
    const isExcluded = !secondCheck.some(r => r.email.toLowerCase() === testRecipient.email.toLowerCase());

    // Revert timestamp
    hojaOutput.getRange(testRecipient.index, idxNotif + 1).setValue(originalValue);

    if (isExcluded) {
      Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] PASS — Recipient excluded after notification timestamp stamped (idempotency confirmed).");
    } else {
      Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] FAIL — Recipient still returned even after notification timestamp was set.");
    }
  } catch (e: any) {
    Logger.log("[TEST-NO-SELECTED-IDEMPOTENCY] ERROR: " + e.message);
  }
}

