/**
 * @file Seleccionados.ts
 * Logic for managing selected applicants, waitlist, and sheet formatting.
 */

/**
 * Helper to apply dropdown data validation rules to the Seleccionados sheet (Fix #9).
 */
function aplicarValidacionesSeleccionados_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  startRow: number,
  numRows: number,
  headers: any[]
): void {
  if (numRows <= 0) return;
  const idxAceptacion = headers.indexOf(HEADERS.ACCEPTANCE) + 1;
  const idxVerificacion = headers.indexOf(HEADERS.CERT_VERIFICATION) + 1;
  const idxNivel = headers.indexOf(HEADERS.LEVEL_ASSIGNED) + 1;
  const idxPago = headers.indexOf(HEADERS.PAYMENT) + 1;

  if (idxAceptacion > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
    sheet.getRange(startRow, idxAceptacion, numRows, 1).setDataValidation(rule);
  }
  if (idxVerificacion > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel', 'Hand picked', 'Manual'], true).setAllowInvalid(true).build();
    sheet.getRange(startRow, idxVerificacion, numRows, 1).setDataValidation(rule);
  }
  if (idxNivel > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();
    sheet.getRange(startRow, idxNivel, numRows, 1).setDataValidation(rule);
  }
  if (idxPago > 0) {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['Pagado', 'Pendiente'], true).build();
    sheet.getRange(startRow, idxPago, numRows, 1).setDataValidation(rule);
  }
}

/**
 * Generates the "Seleccionados" sheet with ranking and data validation.
 * @param resultados The processed evaluation results array.
 * @param ss The target Spreadsheet.
 */
function generarHojaSeleccionados_(resultados: any[][], ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const datosPostulantes = resultados.slice(1);
  const idxTotal = resultados[0].indexOf(HEADERS.TOTAL_SCORE);
  const idxFecha = resultados[0].indexOf(HEADERS.APPLICATION_DATE);
  const idxNivelPostulado = resultados[0].indexOf(HEADERS.LEVEL_APPLIED);
  const idxEmail = resultados[0].indexOf(HEADERS.EMAIL);
  const idxCat = resultados[0].indexOf(HEADERS.CATEGORY);

  logToWebApp_("Generando lista de seleccionados por nivel (cupos abiertos: B1+ 25, resto 15)...");

  // Read existing candidates from Seleccionados to preserve their states
  const emailMap: Record<string, { verificacion: string, nivel: string, aceptacion: string, pagoMatricula: string, comentarios: string, fechaNotif: string }> = {};
  const existingRowsMap: Record<string, any[]> = {};
  
  let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (sheet) {
    const existingValues = sheet.getDataRange().getValues();
    if (existingValues.length > 1) {
      const headersS = existingValues[0];
      const idxEmailS = headersS.indexOf(HEADERS.EMAIL);
      const idxVerifS = headersS.indexOf(HEADERS.CERT_VERIFICATION);
      const idxNivelS = headersS.indexOf(HEADERS.LEVEL_ASSIGNED);
      const idxAceptacionS = headersS.indexOf(HEADERS.ACCEPTANCE);
      const idxPagoS = headersS.indexOf(HEADERS.PAYMENT);
      const idxCommentsS = headersS.indexOf(HEADERS.COMMENTS);
      const idxNotifS = headersS.indexOf(HEADERS.NOTIFICATION_DATE);

      if (idxEmailS !== -1) {
        existingValues.slice(1).forEach(row => {
          const email = String(row[idxEmailS]).trim().toLowerCase();
          if (email) {
            emailMap[email] = {
              verificacion: idxVerifS !== -1 ? String(row[idxVerifS]) : "",
              nivel: idxNivelS !== -1 ? String(row[idxNivelS]) : "",
              aceptacion: idxAceptacionS !== -1 ? String(row[idxAceptacionS]) : "Pendiente",
              pagoMatricula: idxPagoS !== -1 ? String(row[idxPagoS]) : "Pendiente",
              comentarios: idxCommentsS !== -1 ? String(row[idxCommentsS]) : "",
              fechaNotif: idxNotifS !== -1 ? String(row[idxNotifS]) : ""
            };
            // Extract the original results row part (excluding "Ranking" at start and custom columns at the end)
            // The custom columns start at "Verificación Certificado".
            const endIdx = idxVerifS !== -1 ? idxVerifS : row.length;
            const resultRowPart = row.slice(1, endIdx);
            existingRowsMap[email] = resultRowPart;
          }
        });
      }
    }
  }

  const niveles = ["B1+", "B2.1", "B2.2", "C1"];
  const seleccionadosPorNivel: any[][] = [];

  niveles.forEach(nivel => {
    // 1. Candidates from latest evaluations for this level
    const candidatesInResults = datosPostulantes.filter(f => {
      const nivelPost = idxNivelPostulado !== -1 ? String(f[idxNivelPostulado]).trim() : "";
      return nivelPost === nivel;
    });

    // 2. Candidates from existing selected sheet for this level (mapped by assigned level, or fallback to nivel postulado)
    const alreadySelectedEmails = Object.keys(emailMap).filter(email => {
      const assignedNivel = emailMap[email].nivel;
      if (assignedNivel === nivel) return true;
      if (!assignedNivel || !niveles.includes(assignedNivel)) {
        const match = datosPostulantes.find(f => idxEmail !== -1 && String(f[idxEmail]).trim().toLowerCase() === email);
        const postNivel = match && idxNivelPostulado !== -1 ? String(match[idxNivelPostulado]).trim() : "";
        return postNivel === nivel;
      }
      return false;
    });
    
    // Build the list of already selected candidates for this level
    const yaSeleccionados: any[][] = [];
    alreadySelectedEmails.forEach(email => {
      const matchInResults = datosPostulantes.find(f => idxEmail !== -1 && String(f[idxEmail]).trim().toLowerCase() === email);
      if (matchInResults) {
        yaSeleccionados.push(matchInResults);
      } else if (existingRowsMap[email]) {
        yaSeleccionados.push(existingRowsMap[email]);
      }
    });

    // Build the list of new candidates for this level who are not already selected
    const nuevosCandidatos = candidatesInResults.filter(f => {
      const email = idxEmail !== -1 ? String(f[idxEmail]).trim().toLowerCase() : "";
      return !emailMap[email];
    });

    // Sort new candidates by score desc, date asc (tie breaker)
    nuevosCandidatos.sort((a, b) => compararPostulantes_(a, b, idxTotal, idxCat, idxFecha));

    // Cupos de convocatoria abierta del nivel (bases n.º 3) menos los ya seleccionados
    const cuposDisponibles = Math.max(0, (CUPOS_CONVOCATORIA_ABIERTA[nivel] || 15) - yaSeleccionados.length);
    const nuevosAceptados = nuevosCandidatos.slice(0, cuposDisponibles);

    seleccionadosPorNivel.push(...yaSeleccionados, ...nuevosAceptados);
  });

  // Preserve any candidate from emailMap that wasn't captured in the 4 level loops (Fix #4)
  const capturedEmails = new Set(
    seleccionadosPorNivel.map(row => idxEmail !== -1 ? String(row[idxEmail]).trim().toLowerCase() : "")
  );
  Object.keys(emailMap).forEach(email => {
    if (!capturedEmails.has(email)) {
      const matchInResults = datosPostulantes.find(f => idxEmail !== -1 && String(f[idxEmail]).trim().toLowerCase() === email);
      if (matchInResults) {
        seleccionadosPorNivel.push(matchInResults);
      } else if (existingRowsMap[email]) {
        seleccionadosPorNivel.push(existingRowsMap[email]);
      }
    }
  });

  // Sort combined candidates: by level, then score desc
  seleccionadosPorNivel.sort((a, b) => {
    const emailA = idxEmail !== -1 ? String(a[idxEmail]).trim().toLowerCase() : "";
    const emailB = idxEmail !== -1 ? String(b[idxEmail]).trim().toLowerCase() : "";
    const existA = emailMap[emailA];
    const existB = emailMap[emailB];

    const nivelA = existA ? (existA.nivel || (idxNivelPostulado !== -1 ? String(a[idxNivelPostulado]).trim() : "")) : (idxNivelPostulado !== -1 ? String(a[idxNivelPostulado]).trim() : "");
    const nivelB = existB ? (existB.nivel || (idxNivelPostulado !== -1 ? String(b[idxNivelPostulado]).trim() : "")) : (idxNivelPostulado !== -1 ? String(b[idxNivelPostulado]).trim() : "");
    if (nivelA !== nivelB) return nivelA.localeCompare(nivelB);

    return compararPostulantes_(a, b, idxTotal, idxCat, idxFecha);
  });

  const rankedData = seleccionadosPorNivel.map((f, i) => [i + 1, ...f]);

  const headersS = [
    HEADERS.RANKING, ...resultados[0],
    HEADERS.CERT_VERIFICATION, HEADERS.LEVEL_ASSIGNED, HEADERS.ACCEPTANCE, HEADERS.PAYMENT, HEADERS.COMMENTS, HEADERS.NOTIFICATION_DATE
  ];

  const idxEmailInS = headersS.indexOf(HEADERS.EMAIL);
  const idxNivelPostuladoInS = headersS.indexOf(HEADERS.LEVEL_APPLIED);

  const sheetData = [headersS, ...rankedData.map(f => {
    const email = idxEmailInS !== -1 ? String(f[idxEmailInS]).trim().toLowerCase() : "";
    const existing = emailMap[email];
    const nivelPost = idxNivelPostuladoInS !== -1 ? String(f[idxNivelPostuladoInS]).trim() : "";
    
    return [
      ...f,
      existing ? existing.verificacion : "",
      existing ? (existing.nivel || nivelPost) : nivelPost,
      existing ? existing.aceptacion : "Pendiente",
      existing ? existing.pagoMatricula : "Pendiente",
      existing ? existing.comentarios : "",
      existing ? existing.fechaNotif : ""
    ];
  })];

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.SELECTED);
  } else {
    sheet.clearConditionalFormatRules();
    if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
      sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
    }
  }

  if (sheetData.length > 0) {
    const range = sheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setValues(protegerFormulas_(sheetData));
    formatearColumnaFecha_(sheet, headersS, sheetData.length);

    if (sheetData.length > 1) {
      const idxAceptacion = headersS.indexOf(HEADERS.ACCEPTANCE) + 1;

      // Data validations via shared helper (Fix #9)
      aplicarValidacionesSeleccionados_(sheet, 2, sheetData.length - 1, headersS);

      // Conditional formatting
      const fullRange = sheet.getRange(2, 1, sheetData.length - 1, sheetData[0].length);
      const letterA = columnaALetra_(idxAceptacion);

      const ruleGreen = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${letterA}2="Acepta"`).setBackground("#D9EAD3").setRanges([fullRange]).build();
      const ruleRed = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${letterA}2="Rechaza"`).setBackground("#F4CCCC").setRanges([fullRange]).build();

      const rules = sheet.getConditionalFormatRules();
      rules.push(ruleGreen, ruleRed);
      sheet.setConditionalFormatRules(rules);
    }
  }
}

/**
 * Orchestrates waitlist promotion when a spot becomes available.
 * Finds the next eligible candidate in "Evaluación automatizada" for the specific level and moves them to "Seleccionados".
 */
function gestionarListaDeEspera_(nivelTarget?: string): string {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(30000);
    lockAcquired = true;
    const ss = getSpreadsheet_();
    const hojaOutput = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaOutput || !hojaSelected) {
      return "Error: No se encontraron las hojas requeridas para gestionar la lista de espera.";
    }

    const valuesOutput = hojaOutput.getDataRange().getValues();
    const headersOutput = valuesOutput.shift()!;
    const idxScore = headersOutput.indexOf(CONFIG.COLUMNS.SCORE);
    const idxNivelPostulado = headersOutput.indexOf(HEADERS.LEVEL_APPLIED);
    const idxEmail = headersOutput.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxObs = headersOutput.indexOf(HEADERS.OBSERVATIONS);

    const valuesS = hojaSelected.getDataRange().getValues();
    const headersS = valuesS.shift() || [];
    const idxCorreoS = headersS.indexOf(HEADERS.EMAIL);

    // Build set of all current emails in Seleccionados
    const emailsSelected = new Set(valuesS.map(row => String(row[idxCorreoS]).trim().toLowerCase()));

    // Sort by score descending, then date ascending
    const idxFecha = headersOutput.indexOf(HEADERS.APPLICATION_DATE);
    let candidates = valuesOutput
      .filter(row => row[idxEmail] && !(idxObs !== -1 && row[idxObs]) && !emailsSelected.has(String(row[idxEmail]).trim().toLowerCase())) // los NO ELEGIBLE no se promueven solos
      .sort((a, b) => compararPostulantes_(a, b, idxScore, headersOutput.indexOf(HEADERS.CATEGORY), idxFecha));

    if (nivelTarget && idxNivelPostulado !== -1) {
      candidates = candidates.filter(row => String(row[idxNivelPostulado]).trim() === nivelTarget);
    }

    if (candidates.length === 0) {
      const msg = `No hay candidatos disponibles en lista de espera${nivelTarget ? ' para el nivel ' + nivelTarget : ''}.`;
      logToWebApp_(msg);
      return msg;
    }

    const nextCandidate = candidates[0];
    const candidateEmail = String(nextCandidate[idxEmail] || "").trim();
    const idxNombre = headersOutput.indexOf(HEADERS.FIRST_NAME);
    const candidateNombre = idxNombre !== -1 ? String(nextCandidate[idxNombre] || "").trim() : "Postulante";
    const candidateNivel = idxNivelPostulado !== -1 ? String(nextCandidate[idxNivelPostulado] || "").trim() : "";

    // Move to Seleccionados
    const newRowNum = agregarASeleccionados_(
      hojaSelected,
      headersS,
      nextCandidate.filter((_, j) => j !== idxObs),
      candidateNivel,
      "Válido",
      `Promovido desde lista de espera${nivelTarget ? ' para nivel ' + nivelTarget : ''}`
    );

    // Remove candidate from Waitlist sheet to prevent duplicate/contradictory emails (Fix #10)
    const hojaWaitlist = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
    if (hojaWaitlist) {
      const waitlistValues = hojaWaitlist.getDataRange().getValues();
      if (waitlistValues.length > 1) {
        const hW = waitlistValues[0];
        const idxEmailW = hW.indexOf(HEADERS.EMAIL);
        if (idxEmailW !== -1) {
          for (let w = 1; w < waitlistValues.length; w++) {
            if (String(waitlistValues[w][idxEmailW]).trim().toLowerCase() === candidateEmail.toLowerCase()) {
              hojaWaitlist.deleteRow(w + 1);
              reordenarRankingEspera_(hojaWaitlist);
              break;
            }
          }
        }
      }
    }

    logToWebApp_(`Candidato ${candidateEmail} (${candidateNivel}) promovido de lista de espera.`);

    // Send targeted notification email ONLY to the newly promoted candidate
    const enviado = enviarCorreoIndividualSeleccionado_(candidateEmail, candidateNombre, candidateNivel, newRowNum);
    if (!enviado) {
      const idxVerifS = headersS.indexOf(HEADERS.CERT_VERIFICATION);
      if (idxVerifS !== -1) {
        hojaSelected.getRange(newRowNum, idxVerifS + 1).setValue("Manual");
      }
      return `Candidato ${candidateEmail} (${candidateNivel}) promovido, pero falló el envío de correo. Quedó marcado como 'Manual' para reenvío.`;
    }
    return `Se promovió a ${candidateNombre} (${candidateEmail}) al nivel ${candidateNivel} con éxito.`;
  } catch (e) {
    const msg = "Error en gestionarListaDeEspera_: " + mensajeError_(e);
    logToWebApp_(msg);
    return msg;
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}

/**
 * Agrega un postulante a la hoja Seleccionados y aplica sus validaciones.
 */
function agregarASeleccionados_(
  hojaSelected: GoogleAppsScript.Spreadsheet.Sheet,
  headersS: any[],
  filaEval: any[],
  nivel: string,
  verificacion: string,
  comentario: string
): number {
  const nextRanking = hojaSelected.getLastRow();
  const newRow = [
    nextRanking,
    ...filaEval,
    verificacion,
    nivel,
    "Pendiente",
    "Pendiente",
    comentario,
    ""
  ];
  hojaSelected.appendRow(protegerFormulas_([newRow])[0]);
  const newRowNum = hojaSelected.getLastRow();
  aplicarValidacionesSeleccionados_(hojaSelected, newRowNum, 1, headersS);
  return newRowNum;
}

/**
 * Reenumera la columna Ranking (columna 1) de la hoja Lista de Espera.
 */
function reordenarRankingEspera_(hojaWaitlist: GoogleAppsScript.Spreadsheet.Sheet): void {
  const lastRowW = hojaWaitlist.getLastRow();
  if (lastRowW > 1) {
    const ranks = [];
    for (let r = 1; r <= lastRowW - 1; r++) {
      ranks.push([r]);
    }
    hojaWaitlist.getRange(2, 1, lastRowW - 1, 1).setValues(ranks);
  }
}

/**
 * Crea una copia de respaldo de la hoja Seleccionados antes de limpiarla o sobrescribirla.
 */
function respaldarHojaSeleccionados_(ss: GoogleAppsScript.Spreadsheet.Spreadsheet, sheet?: GoogleAppsScript.Spreadsheet.Sheet | null): void {
  const hoja = sheet || ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hoja || hoja.getLastRow() <= 0) return;
  const fecha = Utilities.formatDate(new Date(), PROGRAM_DATA.TIMEZONE || "America/Santiago", "yyyy-MM-dd HH-mm-ss");
  hoja.copyTo(ss).setName("Seleccionados (respaldo " + fecha + ")");
}

/**
 * Promotes the currently selected applicant in the active sheet to the Selected sheet.
 */
function promoverCandidatoActivo(): void {
  const ss = getSpreadsheet_();
  const activeSheet = ss.getActiveSheet();
  
  if (activeSheet.getName() !== CONFIG.SHEETS.OUTPUT) {
    SpreadsheetApp.getUi().alert("Operación Inválida", "Debes estar en la hoja '" + CONFIG.SHEETS.OUTPUT + "' para promover un postulante.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const activeCell = activeSheet.getActiveCell();
  const rowNum = activeCell.getRow();
  
  if (rowNum === 1) {
    SpreadsheetApp.getUi().alert("Operación Inválida", "Por favor selecciona una fila de un postulante, no la cabecera.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastCol = activeSheet.getLastColumn();
  const rowData = activeSheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];
  const headers = activeSheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];

  const idxEmail = headers.indexOf(HEADERS.EMAIL);
  const idxNombre = headers.indexOf(HEADERS.FIRST_NAME);
  const idxApellido = headers.indexOf(HEADERS.LAST_NAME);
  const idxNivelPostulado = headers.indexOf(HEADERS.LEVEL_APPLIED);
  const idxObs = headers.indexOf(HEADERS.OBSERVATIONS);

  if (idxEmail === -1 || idxNombre === -1 || idxApellido === -1 || idxNivelPostulado === -1) {
    SpreadsheetApp.getUi().alert("Error", "No se encontraron las columnas necesarias en la hoja de evaluación.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const email = String(rowData[idxEmail]).trim();
  const nombres = String(rowData[idxNombre]).trim();
  const apellidos = String(rowData[idxApellido]).trim();
  const nivelPostulado = String(rowData[idxNivelPostulado]).trim();

  if (!email) {
    SpreadsheetApp.getUi().alert("Error", "El candidato seleccionado no posee un correo electrónico válido.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaSelected) {
    SpreadsheetApp.getUi().alert("Error", `La hoja '${CONFIG.SHEETS.SELECTED}' no existe.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const valuesS = hojaSelected.getDataRange().getValues();
  const headersS = valuesS.shift() || [];
  const idxCorreoS = headersS.indexOf(HEADERS.EMAIL);

  if (idxCorreoS !== -1) {
    const emailsSelected = new Set(valuesS.map(row => String(row[idxCorreoS]).trim().toLowerCase()));
    if (emailsSelected.has(email.toLowerCase())) {
      SpreadsheetApp.getUi().alert("Aviso", `El postulante ${nombres} ${apellidos} (${email}) ya se encuentra en la lista de seleccionados.`, SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }

  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Confirmar Promoción",
    `¿Estás seguro/a de promover manualmente a ${nombres} ${apellidos} (${email}) al nivel ${nivelPostulado || '[NIVEL NO ASIGNADO]'} en la lista de seleccionados?`,
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  agregarASeleccionados_(
    hojaSelected,
    headersS,
    rowData.filter((_, j) => j !== idxObs),
    nivelPostulado,
    "Válido",
    "Promovido manualmente" + (idxObs !== -1 && rowData[idxObs] ? ` (${rowData[idxObs]})` : "")
  );

  ui.alert("Promoción Exitosa", `Se ha promovido a ${nombres} ${apellidos} al nivel ${nivelPostulado} de seleccionados.`, ui.ButtonSet.OK);
}

/**
 * Generates the "Lista de Espera" sheet with ranking.
 * @param resultados The processed evaluation results array.
 * @param ss The target Spreadsheet.
 */
function generarHojaListaEspera_(resultados: any[][], ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const datosPostulantes = resultados.slice(1);
  const idxTotal = resultados[0].indexOf(HEADERS.TOTAL_SCORE);
  const idxFecha = resultados[0].indexOf(HEADERS.APPLICATION_DATE);
  const idxNivelPostulado = resultados[0].indexOf(HEADERS.LEVEL_APPLIED);
  const idxEmail = resultados[0].indexOf(HEADERS.EMAIL);
  const idxCat = resultados[0].indexOf(HEADERS.CATEGORY);

  logToWebApp_("Generando lista de espera por nivel (Siguientes 30 por nivel)...");

  // Read existing waitlist to preserve notified dates
  const emailMap: Record<string, { fechaNotif: string, fechaCierre: string }> = {};
  const existingRowsMap: Record<string, any[]> = {};

  let sheet = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
  if (sheet) {
    const existingValues = sheet.getDataRange().getValues();
    if (existingValues.length > 1) {
      const headersW = existingValues[0];
      const idxEmailW = headersW.indexOf(HEADERS.EMAIL);
      const idxNotifW = headersW.indexOf(HEADERS.NOTIFICATION_DATE);
      const idxCierreW = headersW.indexOf(HEADERS.CLOSURE_NOTIFICATION_DATE);

      if (idxEmailW !== -1) {
        existingValues.slice(1).forEach(row => {
          const email = String(row[idxEmailW]).trim().toLowerCase();
          if (email) {
            emailMap[email] = {
              fechaNotif: idxNotifW !== -1 ? String(row[idxNotifW]) : "",
              fechaCierre: idxCierreW !== -1 ? String(row[idxCierreW]) : ""
            };
            const endIdx = idxNotifW !== -1 ? idxNotifW : row.length;
            const resultRowPart = row.slice(1, endIdx);
            existingRowsMap[email] = resultRowPart;
          }
        });
      }
    }
  }

  // Get current Selected candidates (don't put them on the waitlist)
  const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  const emailsSelected = new Set<string>();
  if (hojaSelected) {
    const valuesS = hojaSelected.getDataRange().getValues();
    if (valuesS.length > 1) {
      const headS = valuesS[0];
      const idxCorreoS = headS.indexOf(HEADERS.EMAIL);
      if (idxCorreoS !== -1) {
        valuesS.slice(1).forEach(row => {
          const email = String(row[idxCorreoS]).trim().toLowerCase();
          if (email) emailsSelected.add(email);
        });
      }
    }
  }

  const niveles = ["B1+", "B2.1", "B2.2", "C1"];
  const waitlistPorNivel: any[][] = [];

  niveles.forEach(nivel => {
    // Candidates who applied to this level and are NOT selected
    const candidatesInResults = datosPostulantes.filter(f => {
      const nivelPost = idxNivelPostulado !== -1 ? String(f[idxNivelPostulado]).trim() : "";
      const email = idxEmail !== -1 ? String(f[idxEmail]).trim().toLowerCase() : "";
      return nivelPost === nivel && !emailsSelected.has(email);
    });

    // Candidates already in waitlist for this level (exclude anyone already in Seleccionados)
    const alreadyWaitlistedEmails = Object.keys(emailMap).filter(email => {
      if (emailsSelected.has(email)) return false;
      // Find candidate's level
      const matchInResults = datosPostulantes.find(f => idxEmail !== -1 && String(f[idxEmail]).trim().toLowerCase() === email);
      if (matchInResults) {
        const nivelPost = idxNivelPostulado !== -1 ? String(matchInResults[idxNivelPostulado]).trim() : "";
        return nivelPost === nivel;
      }
      return false;
    });

    const yaEnEspera: any[][] = [];
    alreadyWaitlistedEmails.forEach(email => {
      const matchInResults = datosPostulantes.find(f => idxEmail !== -1 && String(f[idxEmail]).trim().toLowerCase() === email);
      if (matchInResults) {
        yaEnEspera.push(matchInResults);
      } else if (existingRowsMap[email]) {
        yaEnEspera.push(existingRowsMap[email]);
      }
    });

    // New candidates for waitlist
    const nuevosCandidatos = candidatesInResults.filter(f => {
      const email = idxEmail !== -1 ? String(f[idxEmail]).trim().toLowerCase() : "";
      return !emailMap[email];
    });

    // Sort new candidates by score desc, date asc
    nuevosCandidatos.sort((a, b) => compararPostulantes_(a, b, idxTotal, idxCat, idxFecha));

    // 30 spots for waitlist per level
    const spotsDisponibles = Math.max(0, 30 - yaEnEspera.length);
    const nuevosEspera = nuevosCandidatos.slice(0, spotsDisponibles);

    waitlistPorNivel.push(...yaEnEspera, ...nuevosEspera);
  });

  // Sort by level, then score desc
  waitlistPorNivel.sort((a, b) => {
    const nivelA = idxNivelPostulado !== -1 ? String(a[idxNivelPostulado]).trim() : "";
    const nivelB = idxNivelPostulado !== -1 ? String(b[idxNivelPostulado]).trim() : "";
    if (nivelA !== nivelB) return nivelA.localeCompare(nivelB);

    return compararPostulantes_(a, b, idxTotal, idxCat, idxFecha);
  });

  const rankedData = waitlistPorNivel.map((f, i) => [i + 1, ...f]);
  const headersW = [HEADERS.RANKING, ...resultados[0], HEADERS.NOTIFICATION_DATE, HEADERS.CLOSURE_NOTIFICATION_DATE];

  const idxEmailInW = headersW.indexOf(HEADERS.EMAIL);

  const sheetData = [headersW, ...rankedData.map(f => {
    const email = idxEmailInW !== -1 ? String(f[idxEmailInW]).trim().toLowerCase() : "";
    const existing = emailMap[email];
    return [
      ...f,
      existing ? existing.fechaNotif : "",
      existing ? existing.fechaCierre : ""
    ];
  })];

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.WAITLIST);
  } else {
    sheet.clearConditionalFormatRules();
    if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
      sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
    }
  }

  if (sheetData.length > 0) {
    const range = sheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setValues(protegerFormulas_(sheetData));
    formatearColumnaFecha_(sheet, headersW, sheetData.length);
    
    // Formatting
    sheet.setTabColor("#ff9900"); // Orange for Waitlist
    sheet.getRange(1, 1, 1, sheetData[0].length)
      .setBackground("#ffe599")
      .setFontColor("#7f6000")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheetData[0].length);
  }
}

/**
 * Regenerates the Waitlist sheet safely from the current evaluation results.
 * Excludes candidates who are already in the 'Seleccionados' sheet.
 */
function ejecutarRegeneracionDeListas(): void {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Regenerar Lista de Espera",
    "Esta operación regenerará la hoja 'Lista de Espera' basándose en los puntajes de 'Evaluación automatizada'.\n\nSe excluirán todos los candidatos que ya se encuentran en la hoja 'Seleccionados', la cual permanecerá intacta.\n\n¿Deseas continuar?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    const ss = getSpreadsheet_();
    cargarConfiguracionDesdeHoja_();

    const hojaO = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (!hojaO) {
      ui.alert("Error", `La hoja '${CONFIG.SHEETS.OUTPUT}' no existe. Por favor realiza una evaluación primero.`, ui.ButtonSet.OK);
      return;
    }

    const resultados = hojaO.getDataRange().getValues();
    if (resultados.length < 2) {
      ui.alert("Error", "No hay datos en la hoja de evaluación para procesar.", ui.ButtonSet.OK);
      return;
    }

    // Only generate the Waitlist sheet, keeping the Selected sheet 100% intact!
    generarHojaListaEspera_(vistaEvaluacion_(resultados, true), ss);

    SpreadsheetApp.flush();
    ui.alert("Operación Exitosa", "Se ha regenerado la hoja 'Lista de Espera' de forma correcta, excluyendo a los seleccionados actuales.", ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Error", "Ocurrió un error: " + mensajeError_(e), ui.ButtonSet.OK);
  }
}


/**
 * Restores the Seleccionados sheet from a secure backup file in Google Drive.
 * PII has been removed from the source code to comply with Chilean Ley 19.628.
 */
function restaurarHojaSeleccionadosPerdida(): void {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    "Restaurar Hoja Seleccionados",
    "Para dar cumplimiento a la Ley 19.628 de protección de datos personales, los datos de respaldo no se almacenan en el código fuente.\n\nPor favor, ingresa el ID del archivo de respaldo (TSV) alojado en Google Drive:",
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const fileId = prompt.getResponseText().trim();
  if (!fileId) {
    ui.alert("Error", "No se ingresó un ID de archivo válido.", ui.ButtonSet.OK);
    return;
  }

  const confirm = ui.alert(
    "Confirmar Restauración",
    "Esta acción sobrescribirá la hoja 'Seleccionados' actual con el respaldo del archivo.\n\nSi la hoja actual tiene datos, se guardará una copia de respaldo antes de continuar. ¿Deseas continuar?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
    const file = DriveApp.getFileById(fileId);
    const tsvData = file.getBlob().getDataAsString("utf-8");

    const ss = getSpreadsheet_();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.SELECTED);
    } else {
      respaldarHojaSeleccionados_(ss, sheet);
      sheet.clearConditionalFormatRules();
      if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
        sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
      }
    }

    const lines = tsvData.split("\n").filter(line => line.trim() !== "");
    const rows = lines.map(line => {
      const parts = line.split("\t");
      // If legacy backup without Pago Matrícula column (24 columns), insert "Pendiente"
      if (parts.length === 24) {
        parts.splice(22, 0, "Pendiente");
      }
      return parts;
    });

    const headers = [
      HEADERS.RANKING, HEADERS.LAST_NAME, HEADERS.FIRST_NAME, HEADERS.EMAIL, "RUT", HEADERS.APPLICATION_DATE,
      HEADERS.CATEGORY, "Sede", "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés",
      "Puntaje Intl.", "Puntaje Nivel Inglés", "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta",
      HEADERS.TOTAL_SCORE, HEADERS.CERTIFICATE_LINK, HEADERS.LEVEL_APPLIED, HEADERS.CERT_VERIFICATION, HEADERS.LEVEL_ASSIGNED,
      HEADERS.ACCEPTANCE, HEADERS.PAYMENT, HEADERS.COMMENTS, HEADERS.NOTIFICATION_DATE
    ];

    const sheetData = [headers, ...rows];

    const range = sheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setValues(protegerFormulas_(sheetData));

    // Apply formatting and validation
    sheet.setTabColor("#11aa55");
    sheet.getRange(1, 1, 1, sheetData[0].length)
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheetData[0].length);

    // Apply validations for drop-downs (Fix #9)
    aplicarValidacionesSeleccionados_(sheet, 2, sheetData.length - 1, headers);

    SpreadsheetApp.flush();
    ui.alert("Restauración Exitosa", "Se ha restaurado la hoja 'Seleccionados' con el listado de respaldo.", ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Error", "Ocurrió un error al restaurar: " + mensajeError_(e), ui.ButtonSet.OK);
  }
}

/**
 * Promotes a candidate selected from the "Lista de Espera" sheet to the "Seleccionados" sheet.
 * Deletes them from "Lista de Espera" and re-orders the remaining rankings.
 */
function promoverDesdeListaEspera(): void {
  const ss = getSpreadsheet_();
  const activeSheet = ss.getActiveSheet();
  
  if (activeSheet.getName() !== CONFIG.SHEETS.WAITLIST) {
    SpreadsheetApp.getUi().alert("Operación Inválida", "Debes estar en la hoja '" + CONFIG.SHEETS.WAITLIST + "' para promover un postulante.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const activeCell = activeSheet.getActiveCell();
  const rowNum = activeCell.getRow();
  
  if (rowNum === 1) {
    SpreadsheetApp.getUi().alert("Operación Inválida", "Por favor selecciona una fila de un postulante, no la cabecera.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastCol = activeSheet.getLastColumn();
  const rowData = activeSheet.getRange(rowNum, 1, 1, lastCol).getValues()[0];
  const headers = activeSheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];

  const idxEmail = headers.indexOf(HEADERS.EMAIL);
  const idxNombre = headers.indexOf(HEADERS.FIRST_NAME);
  const idxApellido = headers.indexOf(HEADERS.LAST_NAME);
  const idxNivelPostulado = headers.indexOf(HEADERS.LEVEL_APPLIED);

  if (idxEmail === -1 || idxNombre === -1 || idxApellido === -1 || idxNivelPostulado === -1) {
    SpreadsheetApp.getUi().alert("Error", "No se encontraron las columnas necesarias en la hoja de Lista de Espera.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const email = String(rowData[idxEmail]).trim();
  const nombres = String(rowData[idxNombre]).trim();
  const apellidos = String(rowData[idxApellido]).trim();
  const nivelPostulado = String(rowData[idxNivelPostulado]).trim();

  if (!email) {
    SpreadsheetApp.getUi().alert("Error", "El candidato seleccionado no posee un correo electrónico válido.", SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaSelected) {
    SpreadsheetApp.getUi().alert("Error", `La hoja '${CONFIG.SHEETS.SELECTED}' no existe.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const valuesS = hojaSelected.getDataRange().getValues();
  const headersS = valuesS.shift() || [];
  const idxCorreoS = headersS.indexOf(HEADERS.EMAIL);

  if (idxCorreoS !== -1) {
    const emailsSelected = new Set(valuesS.map(row => String(row[idxCorreoS]).trim().toLowerCase()));
    if (emailsSelected.has(email.toLowerCase())) {
      SpreadsheetApp.getUi().alert("Aviso", `El postulante ${nombres} ${apellidos} (${email}) ya se encuentra en la lista de seleccionados.`, SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }

  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Confirmar Promoción de Lista de Espera",
    `¿Estás seguro/a de promover a ${nombres} ${apellidos} (${email}) al nivel ${nivelPostulado || '[NIVEL NO ASIGNADO]'} de la lista de seleccionados?`,
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  // The waitlist row format: [Ranking, ...resultados[0], Fecha Notificación, Fecha Notificación Cierre]
  // We want to extract findings from ...resultados[0] and build:
  // [Ranking, ...resultados[0], Verificación Certificado, Nivel Asignado, Aceptación, Pago Matrícula, Comentarios, Fecha Notificación]
  // Use header-based slicing to be robust against column count variations.
  const idxFechaNotifW = headers.indexOf(HEADERS.NOTIFICATION_DATE);
  const sliceEnd = idxFechaNotifW !== -1 ? idxFechaNotifW : lastCol - 2;
  const evalRowPart = rowData.slice(1, sliceEnd);

  agregarASeleccionados_(hojaSelected, headersS, evalRowPart, nivelPostulado, "Válido", "Promovido de Lista de Espera");

  // Delete from waitlist
  activeSheet.deleteRow(rowNum);

  // Re-index remaining rankings in Lista de Espera
  reordenarRankingEspera_(activeSheet);

  ui.alert("Promoción Exitosa", `Se ha promovido a ${nombres} ${apellidos} de Lista de Espera a Seleccionados.`, ui.ButtonSet.OK);
}

/**
 * Permite reenviar el correo (con enlaces nuevos) a un postulante cuyo enlace caducó:
 * borra su "Fecha Notificación" para que el siguiente envío masivo lo incluya de nuevo.
 */
function reenviarEnlacePostulante(): void {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(
    "Reenviar enlace",
    "Correo del postulante en 'Seleccionados'. Se borrará su fecha de notificación y el próximo envío masivo le llegará de nuevo con enlaces nuevos (debe tener Verificación 'Válido', 'Manual' o 'Hand picked'):",
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const correo = r.getResponseText().trim().toLowerCase();
  try {
    const h = leerHoja_(CONFIG.SHEETS.SELECTED);
    const cCorreo = h.col(HEADERS.EMAIL);
    const cNotif = h.col(HEADERS.NOTIFICATION_DATE);
    const i = h.filas.findIndex(f => String(f[cCorreo]).trim().toLowerCase() === correo);
    if (i === -1) { ui.alert("No encontrado", `No hay un postulante con correo ${correo} en 'Seleccionados'.`, ui.ButtonSet.OK); return; }
    h.hoja.getRange(i + 2, cNotif + 1).clearContent();
    ui.alert("Listo", `Se limpió la notificación de ${correo}. Ejecuta el envío correspondiente para que reciba enlaces nuevos.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Error", mensajeError_(e), ui.ButtonSet.OK);
  }
}
