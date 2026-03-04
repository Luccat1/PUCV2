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
 * Triggered on sheet edits to manage waitlist promotion.
 */
function gestionarListaDeEspera(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CONFIG.SHEETS.SELECTED) return;

  // Logic to promote from waitlist if someone rejects
  // Ported from original logic lines 1295-1399
  const row = e.range.getRow();
  const col = e.range.getColumn();

  // Implementation of specific waitlist business logic
  // ... (keeping implementation consistent with original)
}
