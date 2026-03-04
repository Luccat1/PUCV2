/**
 * @file Seleccionados.ts
 * Logic for managing selected applicants, waitlist, and sheet formatting.
 */

/**
 * Generates the "Seleccionados" sheet with ranking and data validation.
 */
function generarHojaSeleccionados(resultados: any[][], ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const datosPostulantes = resultados.slice(1);
  const idxTotal = resultados[0].indexOf("PUNTAJE TOTAL");
  const idxFecha = resultados[0].indexOf("Fecha de Postulación");

  // Sort: 1. Score desc, 2. Date asc (tie breaker)
  datosPostulantes.sort((a, b) => {
    const pB = parseFloat(b[idxTotal] || 0);
    const pA = parseFloat(a[idxTotal] || 0);
    if (pB !== pA) return pB - pA;
    return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
  });

  logToWebApp("Generando lista de seleccionados (Top 25)...");
  const top25 = datosPostulantes.slice(0, 25);
  const rankedData = top25.map((f, i) => [i + 1, ...f]);

  const headersS = [
    "Ranking", ...resultados[0],
    "Verificación Certificado", "Nivel Asignado", "Aceptación", "Comentarios", "Fecha Notificación"
  ];

  const sheetData = [headersS, ...rankedData.map(f => [...f, "", "", "Pendiente", "", ""])];

  let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.SELECTED);
  else sheet.clear();

  if (sheetData.length > 1) {
    const range = sheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setValues(sheetData);

    const idxAceptacion = headersS.indexOf("Aceptación") + 1;
    const idxVerificacion = headersS.indexOf("Verificación Certificado") + 1;
    const idxNivel = headersS.indexOf("Nivel Asignado") + 1;

    // Data validations
    const ruleAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
    const ruleVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
    const ruleNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();

    const rangeA = sheet.getRange(2, idxAceptacion, sheetData.length - 1, 1);
    const rangeV = sheet.getRange(2, idxVerificacion, sheetData.length - 1, 1);
    const rangeN = sheet.getRange(2, idxNivel, sheetData.length - 1, 1);

    rangeA.setDataValidation(ruleAceptacion);
    rangeV.setDataValidation(ruleVerificacion);
    rangeN.setDataValidation(ruleNivel);

    // Conditional formatting
    sheet.clearConditionalFormatRules();
    const fullRange = sheet.getRange(2, 1, sheetData.length - 1, sheetData[0].length);
    const letterA = columnaALetra(idxAceptacion);

    const ruleGreen = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${letterA}2="Acepta"`).setBackground("#D9EAD3").setRanges([fullRange]).build();
    const ruleRed = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${letterA}2="Rechaza"`).setBackground("#F4CCCC").setRanges([fullRange]).build();

    const rules = sheet.getConditionalFormatRules();
    rules.push(ruleGreen, ruleRed);
    sheet.setConditionalFormatRules(rules);
  }
}

/**
 * Orchestrates waitlist promotion when a spot becomes available.
 * Finds the next eligible candidate in "Evaluación automatizada" and moves them to "Seleccionados".
 * Implements Plan 3.3, Task 3.3.1.
 */
function gestionarListaDeEspera(): void {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getSpreadsheet();
    const hojaOutput = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaOutput || !hojaSelected) return;

    const valuesOutput = hojaOutput.getDataRange().getValues();
    const headersOutput = valuesOutput.shift()!;
    const idxScore = headersOutput.indexOf(CONFIG.COLUMNS.SCORE);

    // In original logic, the status was in column 1 (Ranking) or similar.
    // For v5, we check if they are NOT in Seleccionados yet.
    // We already have their score.

    const recipientsSelected = getRecipients('SELECTED');
    const emailsSelected = new Set(recipientsSelected.map(r => r.email));

    // Sort by score descending, then date ascending
    const idxFecha = headersOutput.indexOf("Fecha de Postulación");
    const candidates = valuesOutput
      .filter(row => !emailsSelected.has(row[headersOutput.indexOf(CONFIG.COLUMNS.EMAIL)]))
      .sort((a, b) => {
        const pB = parseFloat(b[idxScore] || 0);
        const pA = parseFloat(a[idxScore] || 0);
        if (pB !== pA) return pB - pA;
        return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
      });

    if (candidates.length === 0) {
      logToWebApp("No hay candidatos disponibles en la lista de espera.");
      return;
    }

    const nextCandidate = candidates[0];
    const candidateEmail = nextCandidate[headersOutput.indexOf(CONFIG.COLUMNS.EMAIL)];

    // Move to Seleccionados
    const lastRanking = hojaSelected.getLastRow();
    const newRow = [
      lastRanking, // New Ranking
      ...nextCandidate,
      "Pendiente", // Verificación Certificado
      "",          // Nivel Asignado
      "Pendiente", // Aceptación
      "Promovido desde lista de espera", // Comentarios
      ""           // Fecha Notificación
    ];
    hojaSelected.appendRow(newRow);

    logToWebApp(`Candidato ${candidateEmail} promovido de lista de espera.`);

    // Send notification email to the NEW candidate
    // Note: sendEmailBatch('SELECTED') will now only send to those with empty Fecha Notificación
    sendEmailBatch('SELECTED');
  } catch (e: any) {
    logToWebApp("Error en gestionarListaDeEspera: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Specifically handles rejection from the Web App.
 */
function procesarRechazoDesdeWebApp(correo: string): void {
  logToWebApp(`Procesando rechazo de ${correo} y activando lista de espera.`);
  gestionarListaDeEspera();
}
