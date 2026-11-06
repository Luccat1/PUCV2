/**
 * @file Seleccionados.ts
 * Logic for managing selected applicants, waitlist, and sheet formatting.
 */

/**
 * Generates the "Seleccionados" sheet with ranking and data validation.
 * @param resultados The processed evaluation results array.
 * @param ss The target Spreadsheet.
 */
function generarHojaSeleccionados(resultados: any[][], ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const datosPostulantes = resultados.slice(1);
  const idxTotal = resultados[0].indexOf("PUNTAJE TOTAL");
  const idxFecha = resultados[0].indexOf("Fecha de Postulación");
  const idxNivelPostulado = resultados[0].indexOf("Nivel Postulado");
  const idxEmail = resultados[0].indexOf("Correo Electrónico");

  logToWebApp("Generando lista de seleccionados por nivel (Top 15 por nivel)...");

  // Read existing candidates from Seleccionados to preserve their states
  const emailMap: Record<string, { verificacion: string, nivel: string, aceptacion: string, pagoMatricula: string, comentarios: string, fechaNotif: string }> = {};
  const existingRowsMap: Record<string, any[]> = {};
  
  let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (sheet) {
    const existingValues = sheet.getDataRange().getValues();
    if (existingValues.length > 1) {
      const headersS = existingValues[0];
      const idxEmailS = headersS.indexOf("Correo Electrónico");
      const idxVerifS = headersS.indexOf("Verificación Certificado");
      const idxNivelS = headersS.indexOf("Nivel Asignado");
      const idxAceptacionS = headersS.indexOf("Aceptación");
      const idxPagoS = headersS.indexOf("Pago Matrícula");
      const idxCommentsS = headersS.indexOf("Comentarios");
      const idxNotifS = headersS.indexOf("Fecha Notificación");

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

    // 2. Candidates from existing selected sheet for this level (mapped by assigned level)
    const alreadySelectedEmails = Object.keys(emailMap).filter(email => emailMap[email].nivel === nivel);
    
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
    nuevosCandidatos.sort((a, b) => {
      const pB = parseFloat(b[idxTotal] || 0);
      const pA = parseFloat(a[idxTotal] || 0);
      if (pB !== pA) return pB - pA;
      return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
    });

    // Available spots: 15 minus those already selected
    const cuposDisponibles = Math.max(0, 15 - yaSeleccionados.length);
    const nuevosAceptados = nuevosCandidatos.slice(0, cuposDisponibles);

    seleccionadosPorNivel.push(...yaSeleccionados, ...nuevosAceptados);
  });

  // Sort combined candidates: by level, then score desc
  seleccionadosPorNivel.sort((a, b) => {
    const emailA = idxEmail !== -1 ? String(a[idxEmail]).trim().toLowerCase() : "";
    const emailB = idxEmail !== -1 ? String(b[idxEmail]).trim().toLowerCase() : "";
    const existA = emailMap[emailA];
    const existB = emailMap[emailB];

    const nivelA = existA ? existA.nivel : (idxNivelPostulado !== -1 ? String(a[idxNivelPostulado]).trim() : "");
    const nivelB = existB ? existB.nivel : (idxNivelPostulado !== -1 ? String(b[idxNivelPostulado]).trim() : "");
    if (nivelA !== nivelB) return nivelA.localeCompare(nivelB);

    const pB = parseFloat(b[idxTotal] || 0);
    const pA = parseFloat(a[idxTotal] || 0);
    return pB - pA;
  });

  const rankedData = seleccionadosPorNivel.map((f, i) => [i + 1, ...f]);

  const headersS = [
    "Ranking", ...resultados[0],
    "Verificación Certificado", "Nivel Asignado", "Aceptación", "Pago Matrícula", "Comentarios", "Fecha Notificación"
  ];

  const idxEmailInS = headersS.indexOf("Correo Electrónico");
  const idxNivelPostuladoInS = headersS.indexOf("Nivel Postulado");

  const sheetData = [headersS, ...rankedData.map(f => {
    const email = idxEmailInS !== -1 ? String(f[idxEmailInS]).trim().toLowerCase() : "";
    const existing = emailMap[email];
    const nivelPost = idxNivelPostuladoInS !== -1 ? String(f[idxNivelPostuladoInS]).trim() : "";
    
    return [
      ...f,
      existing ? existing.verificacion : "",
      existing ? existing.nivel : nivelPost,
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
    range.setValues(sheetData);

    if (sheetData.length > 1) {
      const idxAceptacion = headersS.indexOf("Aceptación") + 1;
      const idxVerificacion = headersS.indexOf("Verificación Certificado") + 1;
      const idxNivel = headersS.indexOf("Nivel Asignado") + 1;
      const idxPago = headersS.indexOf("Pago Matrícula") + 1;

      // Data validations
      const ruleAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
      const ruleVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
      const ruleNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();
      const rulePago = SpreadsheetApp.newDataValidation().requireValueInList(['Pagado', 'Pendiente'], true).build();

      const rangeA = sheet.getRange(2, idxAceptacion, sheetData.length - 1, 1);
      const rangeV = sheet.getRange(2, idxVerificacion, sheetData.length - 1, 1);
      const rangeN = sheet.getRange(2, idxNivel, sheetData.length - 1, 1);
      const rangeP = sheet.getRange(2, idxPago, sheetData.length - 1, 1);

      rangeA.setDataValidation(ruleAceptacion);
      rangeV.setDataValidation(ruleVerificacion);
      rangeN.setDataValidation(ruleNivel);
      rangeP.setDataValidation(rulePago);

      // Conditional formatting
      const fullRange = sheet.getRange(2, 1, sheetData.length - 1, sheetData[0].length);
      const letterA = columnaALetra(idxAceptacion);

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
function gestionarListaDeEspera(nivelTarget?: string): void {
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
    const idxNivelPostulado = headersOutput.indexOf("Nivel Postulado");
    const idxEmail = headersOutput.indexOf(CONFIG.COLUMNS.EMAIL);

    const valuesS = hojaSelected.getDataRange().getValues();
    const headersS = valuesS.shift() || [];
    const idxCorreoS = headersS.indexOf("Correo Electrónico");

    // Build set of all current emails in Seleccionados
    const emailsSelected = new Set(valuesS.map(row => String(row[idxCorreoS]).trim().toLowerCase()));

    // Sort by score descending, then date ascending
    const idxFecha = headersOutput.indexOf("Fecha de Postulación");
    let candidates = valuesOutput
      .filter(row => row[idxEmail] && !emailsSelected.has(String(row[idxEmail]).trim().toLowerCase()))
      .sort((a, b) => {
        const pB = parseFloat(b[idxScore] || 0);
        const pA = parseFloat(a[idxScore] || 0);
        if (pB !== pA) return pB - pA;
        return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
      });

    if (nivelTarget && idxNivelPostulado !== -1) {
      candidates = candidates.filter(row => String(row[idxNivelPostulado]).trim() === nivelTarget);
    }

    if (candidates.length === 0) {
      logToWebApp(`No hay candidatos disponibles en lista de espera${nivelTarget ? ' para el nivel ' + nivelTarget : ''}.`);
      return;
    }

    const nextCandidate = candidates[0];
    const candidateEmail = String(nextCandidate[idxEmail] || "").trim();
    const idxNombre = headersOutput.indexOf("Nombre(s)");
    const candidateNombre = idxNombre !== -1 ? String(nextCandidate[idxNombre] || "").trim() : "Postulante";
    const candidateNivel = idxNivelPostulado !== -1 ? String(nextCandidate[idxNivelPostulado] || "").trim() : "";

    // Move to Seleccionados
    const lastRanking = hojaSelected.getLastRow();
    const newRow = [
      lastRanking, // New Ranking
      ...nextCandidate,
      "", // Verificación Certificado
      candidateNivel, // Nivel Asignado
      "Pendiente", // Aceptación
      "Pendiente", // Pago Matrícula
      `Promovido desde lista de espera${nivelTarget ? ' para nivel ' + nivelTarget : ''}`, // Comentarios
      ""           // Fecha Notificación
    ];
    hojaSelected.appendRow(newRow);
    const newRowNum = hojaSelected.getLastRow();

    logToWebApp(`Candidato ${candidateEmail} (${candidateNivel}) promovido de lista de espera.`);

    // Send targeted notification email ONLY to the newly promoted candidate
    enviarCorreoIndividualSeleccionado(candidateEmail, candidateNombre, candidateNivel, newRowNum);
  } catch (e: any) {
    logToWebApp("Error en gestionarListaDeEspera: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Specifically handles rejection from the Web App.
 * Updates state to "Rechaza". Waitlist promotion is triggered manually by admin, NOT automatically.
 * @param correo The email address of the rejecting applicant.
 */
function procesarRechazoDesdeWebApp(correo: string): void {
  logToWebApp(`Procesando rechazo de ${correo}. La lista de espera debe ser activada manualmente.`);
  // Rejection email is sent in WebApp.ts through the confirmation flow.
}

/**
 * Promotes the currently selected applicant in the active sheet to the Selected sheet.
 */
function promoverCandidatoActivo(): void {
  const ss = getSpreadsheet();
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

  const idxEmail = headers.indexOf("Correo Electrónico");
  const idxNombre = headers.indexOf("Nombre(s)");
  const idxApellido = headers.indexOf("Apellido(s)");
  const idxNivelPostulado = headers.indexOf("Nivel Postulado");

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
  const idxCorreoS = headersS.indexOf("Correo Electrónico");

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

  const nextRanking = hojaSelected.getLastRow();
  const newRow = [
    nextRanking, // Ranking
    ...rowData,
    "Válido", // Verificación Certificado
    nivelPostulado, // Nivel Asignado
    "Pendiente", // Aceptación
    "Promovido manualmente", // Comentarios
    "" // Fecha Notificación
  ];

  hojaSelected.appendRow(newRow);

  // Apply validations for drop-downs
  const idxAceptacion = headersS.indexOf("Aceptación") + 1;
  const idxVerificacion = headersS.indexOf("Verificación Certificado") + 1;
  const idxNivel = headersS.indexOf("Nivel Asignado") + 1;

  if (idxAceptacion > 0 && idxVerificacion > 0 && idxNivel > 0) {
    const ruleAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
    const ruleVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
    const ruleNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();

    const newRowNum = hojaSelected.getLastRow();
    hojaSelected.getRange(newRowNum, idxAceptacion).setDataValidation(ruleAceptacion);
    hojaSelected.getRange(newRowNum, idxVerificacion).setDataValidation(ruleVerificacion);
    hojaSelected.getRange(newRowNum, idxNivel).setDataValidation(ruleNivel);
  }

  ui.alert("Promoción Exitosa", `Se ha promovido a ${nombres} ${apellidos} al nivel ${nivelPostulado} de seleccionados.`, ui.ButtonSet.OK);
}

/**
 * Generates the "Lista de Espera" sheet with ranking.
 * @param resultados The processed evaluation results array.
 * @param ss The target Spreadsheet.
 */
function generarHojaListaEspera(resultados: any[][], ss: GoogleAppsScript.Spreadsheet.Spreadsheet): void {
  const datosPostulantes = resultados.slice(1);
  const idxTotal = resultados[0].indexOf("PUNTAJE TOTAL");
  const idxFecha = resultados[0].indexOf("Fecha de Postulación");
  const idxNivelPostulado = resultados[0].indexOf("Nivel Postulado");
  const idxEmail = resultados[0].indexOf("Correo Electrónico");

  logToWebApp("Generando lista de espera por nivel (Siguientes 30 por nivel)...");

  // Read existing waitlist to preserve notified dates
  const emailMap: Record<string, { fechaNotif: string, fechaCierre: string }> = {};
  const existingRowsMap: Record<string, any[]> = {};

  let sheet = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
  if (sheet) {
    const existingValues = sheet.getDataRange().getValues();
    if (existingValues.length > 1) {
      const headersW = existingValues[0];
      const idxEmailW = headersW.indexOf("Correo Electrónico");
      const idxNotifW = headersW.indexOf("Fecha Notificación");
      const idxCierreW = headersW.indexOf("Fecha Notificación Cierre");

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
      const idxCorreoS = headS.indexOf("Correo Electrónico");
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

    // Candidates already in waitlist for this level
    const alreadyWaitlistedEmails = Object.keys(emailMap).filter(email => {
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
    nuevosCandidatos.sort((a, b) => {
      const pB = parseFloat(b[idxTotal] || 0);
      const pA = parseFloat(a[idxTotal] || 0);
      if (pB !== pA) return pB - pA;
      return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
    });

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

    const pB = parseFloat(b[idxTotal] || 0);
    const pA = parseFloat(a[idxTotal] || 0);
    return pB - pA;
  });

  const rankedData = waitlistPorNivel.map((f, i) => [i + 1, ...f]);
  const headersW = ["Ranking", ...resultados[0], "Fecha Notificación", "Fecha Notificación Cierre"];

  const idxEmailInW = headersW.indexOf("Correo Electrónico");

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
    range.setValues(sheetData);
    
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
    const ss = getSpreadsheet();
    cargarConfiguracionDesdeHoja();

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
    generarHojaListaEspera(resultados, ss);

    SpreadsheetApp.flush();
    ui.alert("Operación Exitosa", "Se ha regenerado la hoja 'Lista de Espera' de forma correcta, excluyendo a los seleccionados actuales.", ui.ButtonSet.OK);
  } catch (e: any) {
    ui.alert("Error", "Ocurrió un error: " + e.message, ui.ButtonSet.OK);
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

  try {
    const file = DriveApp.getFileById(fileId);
    const tsvData = file.getBlob().getDataAsString("utf-8");

    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.SELECTED);
    } else {
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
      "Ranking", "Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación",
      "Categoría Postulante", "Sede", "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés",
      "Puntaje Intl.", "Puntaje Nivel Inglés", "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta",
      "PUNTAJE TOTAL", "Enlace Certificado", "Nivel Postulado", "Verificación Certificado", "Nivel Asignado",
      "Aceptación", "Pago Matrícula", "Comentarios", "Fecha Notificación"
    ];

    const sheetData = [headers, ...rows];

    const range = sheet.getRange(1, 1, sheetData.length, sheetData[0].length);
    range.setValues(sheetData);

    // Apply formatting and validation
    sheet.setTabColor("#11aa55");
    sheet.getRange(1, 1, 1, sheetData[0].length)
      .setBackground("#d9ead3")
      .setFontColor("#274e13")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, sheetData[0].length);

    // Apply validations for drop-downs
    const idxAceptacion = headers.indexOf("Aceptación") + 1;
    const idxVerificacion = headers.indexOf("Verificación Certificado") + 1;
    const idxNivel = headers.indexOf("Nivel Asignado") + 1;
    const idxPago = headers.indexOf("Pago Matrícula") + 1;

    if (idxAceptacion > 0 && idxVerificacion > 0 && idxNivel > 0 && idxPago > 0 && sheetData.length > 1) {
      const ruleAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
      const ruleVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
      const ruleNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();
      const rulePago = SpreadsheetApp.newDataValidation().requireValueInList(['Pagado', 'Pendiente'], true).build();

      const validationRangeAceptacion = sheet.getRange(2, idxAceptacion, sheetData.length - 1, 1);
      const validationRangeVerificacion = sheet.getRange(2, idxVerificacion, sheetData.length - 1, 1);
      const validationRangeNivel = sheet.getRange(2, idxNivel, sheetData.length - 1, 1);
      const validationRangePago = sheet.getRange(2, idxPago, sheetData.length - 1, 1);

      validationRangeAceptacion.setDataValidation(ruleAceptacion);
      validationRangeVerificacion.setDataValidation(ruleVerificacion);
      validationRangeNivel.setDataValidation(ruleNivel);
      validationRangePago.setDataValidation(rulePago);
    }

    SpreadsheetApp.flush();
    ui.alert("Restauración Exitosa", "Se ha restaurado la hoja 'Seleccionados' con el listado de respaldo.", ui.ButtonSet.OK);
  } catch (e: any) {
    ui.alert("Error", "Ocurrió un error al restaurar: " + e.message, ui.ButtonSet.OK);
  }
}

/**
 * Promotes a candidate selected from the "Lista de Espera" sheet to the "Seleccionados" sheet.
 * Deletes them from "Lista de Espera" and re-orders the remaining rankings.
 */
function promoverDesdeListaEspera(): void {
  const ss = getSpreadsheet();
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

  const idxEmail = headers.indexOf("Correo Electrónico");
  const idxNombre = headers.indexOf("Nombre(s)");
  const idxApellido = headers.indexOf("Apellido(s)");
  const idxNivelPostulado = headers.indexOf("Nivel Postulado");

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
  const idxCorreoS = headersS.indexOf("Correo Electrónico");

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

  const nextRanking = hojaSelected.getLastRow();
  
  // The waitlist row format: [Ranking, ...resultados[0], Fecha Notificación, Fecha Notificación Cierre]
  // We want to extract findings from ...resultados[0] and build:
  // [Ranking, ...resultados[0], Verificación Certificado, Nivel Asignado, Aceptación, Pago Matrícula, Comentarios, Fecha Notificación]
  // Use header-based slicing to be robust against column count variations.
  const idxFechaNotifW = headers.indexOf("Fecha Notificación");
  const sliceEnd = idxFechaNotifW !== -1 ? idxFechaNotifW : lastCol - 2;
  const evalRowPart = rowData.slice(1, sliceEnd);

  const newRow = [
    nextRanking, // Ranking
    ...evalRowPart,
    "Válido", // Verificación Certificado
    nivelPostulado, // Nivel Asignado
    "Pendiente", // Aceptación
    "Pendiente", // Pago Matrícula
    "Promovido de Lista de Espera", // Comentarios
    "" // Fecha Notificación
  ];

  hojaSelected.appendRow(newRow);

  // Apply validations for drop-downs
  const idxAceptacion = headersS.indexOf("Aceptación") + 1;
  const idxVerificacion = headersS.indexOf("Verificación Certificado") + 1;
  const idxNivel = headersS.indexOf("Nivel Asignado") + 1;
  const idxPago = headersS.indexOf("Pago Matrícula") + 1;

  if (idxAceptacion > 0 && idxVerificacion > 0 && idxNivel > 0 && idxPago > 0) {
    const ruleAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
    const ruleVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
    const ruleNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build();
    const rulePago = SpreadsheetApp.newDataValidation().requireValueInList(['Pagado', 'Pendiente'], true).build();

    const newRowNum = hojaSelected.getLastRow();
    hojaSelected.getRange(newRowNum, idxAceptacion).setDataValidation(ruleAceptacion);
    hojaSelected.getRange(newRowNum, idxVerificacion).setDataValidation(ruleVerificacion);
    hojaSelected.getRange(newRowNum, idxNivel).setDataValidation(ruleNivel);
    hojaSelected.getRange(newRowNum, idxPago).setDataValidation(rulePago);
  }

  // Delete from waitlist
  activeSheet.deleteRow(rowNum);

  // Re-index remaining rankings in Lista de Espera
  const lastRowW = activeSheet.getLastRow();
  if (lastRowW > 1) {
    const rangeRank = activeSheet.getRange(2, 1, lastRowW - 1, 1);
    const ranks = [];
    for (let r = 1; r <= lastRowW - 1; r++) {
      ranks.push([r]);
    }
    rangeRank.setValues(ranks);
  }

  ui.alert("Promoción Exitosa", `Se ha promovido a ${nombres} ${apellidos} de Lista de Espera a Seleccionados.`, ui.ButtonSet.OK);
}
