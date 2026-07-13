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
    const candidateEmail = nextCandidate[idxEmail];
    const candidateNivel = idxNivelPostulado !== -1 ? nextCandidate[idxNivelPostulado] : "";

    // Move to Seleccionados
    const lastRanking = hojaSelected.getLastRow();
    const newRow = [
      lastRanking, // New Ranking
      ...nextCandidate,
      "", // Verificación Certificado
      candidateNivel, // Nivel Asignado
      "Pendiente", // Aceptación
      `Promovido desde lista de espera${nivelTarget ? ' para nivel ' + nivelTarget : ''}`, // Comentarios
      ""           // Fecha Notificación
    ];
    hojaSelected.appendRow(newRow);

    logToWebApp(`Candidato ${candidateEmail} (${candidateNivel}) promovido de lista de espera.`);

    // Send notification email to the NEW candidate
    sendEmailBatch('SELECTED');
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
 * Restores the Seleccionados sheet to its exact state from July 10th.
 */
function restaurarHojaSeleccionadosPerdida(): void {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    "Restaurar Hoja Seleccionados",
    "Esta operación restaurará la hoja 'Seleccionados' al estado exacto previo a la regeneración incorrecta.\n\n¿Deseas continuar?",
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  try {
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

    const tsvData = `1	Leddihn Soto	Paulina Andrea	paulina.leddihn@pucv.cl	8590065-k	Mon Jul 06 2026 14:34:37 GMT-0400 (hora estándar de Chile)	Funcionario	Casa Central	4	2	1.50	0.00	2	0,5	3	2	15.00		B1+	Test de nivel	B1+	Pendiente		10/07/2026
2	Cruces Devia	Felipe Andrés	felipe.cruces@pucv.cl	19339549-k	Tue Jul 07 2026 11:58:18 GMT-0400 (hora estándar de Chile)	Funcionario	Centro Universitario Rafael Ariztía (FIN)	3	2	2.00	0.00	0	0,5	3	3	13.50		B1+	Test de nivel	B1+	Pendiente		10/07/2026
3	López Acevedo	Ignacio Javier	ignacio.lopez.a@pucv.cl	19470339-2	Mon Jul 06 2026 14:41:37 GMT-0400 (hora estándar de Chile)	Funcionario	Edificio Isabel Brown Caces (IBC)	3	2	2.75	0.00	0	0,5	3	2	13.25		B1+	Test de nivel	B1+	Acepta		10/07/2026
4	Gonzalez Olguin	Beatriz Eloisa	beatriz.gonzalez@pucv.cl	15950197-3	Thu Jun 25 2026 08:26:38 GMT-0400 (hora estándar de Chile)	Funcionario	Casa Central	4	2	1.00	0.00	0	0,5	3	2	12.50		B1+	Test de nivel	B1+	Acepta		10/07/2026
5	Silva Castro	Pia Ignacia	pia.silva.c@mail.pucv.cl	21883877-4	Wed Jul 08 2026 14:15:22 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	2.00	0	2	3	1	12.50		B1+	Test de nivel	B1+	Acepta		10/07/2026
6	Pérez Romero	Anthonia Bélen	anthonia.perez.r@mail.pucv.cl	21951372-0	Wed Jun 24 2026 16:42:17 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Casa Central	4	1	0.00	1.50	0	2	3	1	12.00		B1+	Test de nivel	B1+	Pendiente		10/07/2026
7	Costa Contreras	Fernanda Carmina	fernanda.costa.c@mail.pucv.cl	21795075-9	Tue Jul 07 2026 16:45:09 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Arquitectura y Diseño (EAD)	4	1	0.00	0.50	2	1	3	1	12.00		B1+	Test de nivel	B1+	Pendiente		10/07/2026
8	Muñoz Lira	Marcela Silvana	marcela.munoz.l@pucv.cl	16231943-4	Thu Jun 25 2026 17:56:00 GMT-0400 (hora estándar de Chile)	Académico	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	2	1.00	1.13	0	0,5	3	0	11.63		B1+	Test de nivel	B1+	Acepta		10/07/2026
9	Muñoz Orrego	Francisca Antonia	francisca.munoz.o@mail.pucv.cl	21205935-8	Wed Jun 24 2026 18:40:31 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	3	1	0.00	2.00	0	2	3	1	11.50		B1+	Test de nivel	B1+	Acepta		10/07/2026
10	Cruz Pollak	Elisa Victoria	elisacruzp@gmail.com	21931507-4	Mon Jul 06 2026 14:40:50 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Arquitectura y Diseño (EAD)	4	1	0.00	1.50	0	1,5	3	1	11.50		B1+	Test de nivel	B1+	Pendiente		10/07/2026
11	Espinoza Almonacid	Catalina Alejandra	catalina.espinoza.a@mail.pucv.cl	19941408-9	Mon Jul 06 2026 14:53:05 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	1	0.00	0.50	2	0,5	3	1	11.50		B1+	Test de nivel	B1+	Acepta		10/07/2026
12	Schafer Rodríguez	Félix Andrés	felix.schafer.r@mail.pucv.cl	20916787-5	Tue Jul 07 2026 12:05:07 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería de Construcción y Transporte	4	1	0.00	1.00	2	0	3	1	11.50	https://drive.google.com/open?id=1Ct9d-AI0emHh9PXdpRiDkPUkO0r9XnN2	B1+	Válido	B1+	Pendiente		10/07/2026
13	Escudero Ricotti	Eric Antonio	eric.escudero@pucv.cl	20675914-3	Wed Jun 24 2026 17:08:56 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Edificio Isabel Brown Caces (IBC)	4	1,5	1.00	1.13	0	0,5	3	0	11.13		B1+	Test de nivel	B1+	Acepta		10/07/2026
14	Toledo Giuffre	Catalina Belén	catalina.toledo.g@mail.pucv.cl	20983519-3	Thu Jun 25 2026 17:17:18 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Campus Curauma	4	1,5	1.00	1.13	0	0,5	3	0	11.13		B1+	Test de nivel	B1+	Acepta		10/07/2026
15	carvajal morales	paul ignacio	paul.carvajal@sansano.usm.cl	19268521-4	Tue Jul 07 2026 01:40:32 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Casa Central	4	1,5	1.00	1.13	0	0,5	3	0	11.13		B1+	Test de nivel	B1+	Acepta		10/07/2026
16	Melendez Pizarro	Martina Sofia	martina.melendez.p@mail.pucv.cl	22483771-2	Wed Jun 24 2026 16:30:32 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Civil	4	1	0.00	1.50	2	0,5	3	1	12.50	https://drive.google.com/open?id=1tCvMrqSvMHTaZ2kpgsysIjseQ1ua_Z7a	B1+	Válido	B1+	Acepta		10/07/2026
17	Herrero Faúndez	Paula José	paula.herrero.f@mail.pucv.cl	20172564-k	Wed Jun 24 2026 18:46:41 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Bioquímica (IBQ)	4	1	0.00	1.00	2	1	3	1	12.50	https://drive.google.com/open?id=19cI4BIRJ-W-MLnN95ff3H4B1aKjaPbEM	B2.1	Válido	B1+	Acepta		10/07/2026
18	Armijo Quiñones	Gabriela Valentina	gabriela.armijo@pucv.cl	17752652-5	Mon Jul 06 2026 15:34:54 GMT-0400 (hora estándar de Chile)	Funcionario	Casa Central	4	2	0.75	0.00	0	0,5	3	2	12.25		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
19	Pacheco Glaves	Gabriela Fernanda	gabriela.pacheco@pucv.cl	18297431-5	Wed Jun 24 2026 19:20:22 GMT-0400 (hora estándar de Chile)	Académico	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	2	1.00	1.13	0	0,5	3	0	11.63		B2.1	Test de nivel	B2.1	Pendiente		10/07/2026
20	Araya Álvarez	Angel Orlando	angel.araya.a@mail.pucv.cl	22483570-1	Wed Jun 24 2026 16:54:14 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario Rafael Ariztía (FIN)	4	1	0.00	0.50	2	0,5	3	1	11.50		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
21	Guevara Hurtado	José Miguel	jose.guevara.h@mail.pucv.cl	22168798-1	Wed Jul 08 2026 14:06:54 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	1.50	0	1,5	3	1	11.50		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
22	López Jiménez	Tatiana Maribel	tatiana.lopez@pucv.cl	15211380-3	Wed Jun 24 2026 16:42:30 GMT-0400 (hora estándar de Chile)	Académico	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	2	1.00	0.75	0	0,5	3	0	11.25		B2.1	Test de nivel	B2.1	Pendiente		10/07/2026
23	Cardona Menco	Manolo	manolo.cardona.m@mail.pucv.cl	28966142-5	Thu Jun 25 2026 15:53:48 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Casa Central	4	1,5	1.00	1.13	0	0,5	3	0	11.13		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
24	Lizama Mussa	Juan Pablo Jesús	juan.lizama.m@mail.pucv.cl	21482855-3	Wed Jun 24 2026 19:07:24 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	1	0.00	0.50	2	0	3	1	11.00	https://drive.google.com/open?id=1oLNWiWUnx-_g4FFefiB8BEQsmUr3OhR7	B2.1	Válido	B1+	Acepta		10/07/2026
25	Garay Cisternas	Catalina Abril	catalina.garay.c@mail.pucv.cl	21695418-1	Thu Jun 25 2026 15:41:07 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	0.50	0	2	3	1	11.00		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
26	González Cáceres	Valentina Ignacia	gcaceres.valentina@gmail.com	20183553-4	Wed Jul 01 2026 12:34:48 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Bioquímica (IBQ)	4	1	0.00	0.50	2	0	3	1	11.00	https://drive.google.com/open?id=1rVivLYMNCByUUApK-kxW4dCWn4Kg3NKZ	C1	Válido	C1	Acepta		10/07/2026
27	Navarro Espinoza	Marcelo Pablo	marcelo.navarro.e@mail.pucv.cl	15930605-4	Wed Jul 08 2026 10:40:31 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	PUCV Santiago	4	1,5	1.00	0.75	0	0,5	3	0	10.75		B2.1	Test de nivel	B2.1	Pendiente		10/07/2026
28	Barría Foncea	Camila de los Ángeles	camila.barria.f@mail.pucv.cl	19152557-4	Wed Jun 24 2026 14:29:00 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	3	1	0.00	2.00	0	1	3	1	10.50		B2.1	Test de nivel	B2.1	Pendiente		10/07/2026
29	Soto Monsalve	Martín Eugenio	martin.soto.m@mail.pucv.cl	21714906-1	Wed Jun 24 2026 16:56:13 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario Rafael Ariztía (FIN)	4	1	0.00	1.00	0	1	3	1	10.50		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
30	Parra Sandoval	Alexis Esteban	alexis.parra.s@mail.pucv.cl	21766058-0	Mon Jul 06 2026 14:57:27 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	3	1	0.00	1.00	0	2	3	1	10.50		B2.1	Test de nivel	B2.1	Acepta		10/07/2026
31	Álvarez Rojas	Paulina Andrea	paulinaalvarez914@gmail.com	22207470-3	Thu Jun 25 2026 00:59:22 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Química	4	1	0.00	2.00	3	1,5	3	1	15.00	https://drive.google.com/open?id=1skhADF7QRrof6Cp4lYMR81Wyb5ALm6Ug	C1	Válido	C1	Pendiente		10/07/2026
32	Vielma Farías	Tomás Alfonso	tomas.vielma@pucv.cl	18391814-1	Thu Jun 25 2026 13:10:20 GMT-0400 (hora estándar de Chile)	Funcionario	Casa Central	4	2	0.75	0.00	0	0,5	3	2	12.25		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
33	Ulloa Ferrada	Arantza Viviana	arantzaulloa@gmail.com	21128941-4	Mon Jul 06 2026 23:53:00 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	2.00	0	1,5	3	1	12.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
34	Rodríguez Rodríguez	Fernando	fernando.rodriguez@pucv.cl	15062098-8	Thu Jun 25 2026 17:17:43 GMT-0400 (hora estándar de Chile)	Académico	Campus Curauma	4	2	1.00	1.13	0	0,5	3	0	11.63		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
35	Cornejo D'Ottone	Marcela	marcela.cornejo@pucv.cl	13256642-9	Thu Jul 02 2026 11:43:57 GMT-0400 (hora estándar de Chile)	Académico	Campus Curauma	4	2	1.00	1.13	0	0,5	3	0	11.63		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
36	Menay Huertas	Nicolás Guillermo	nicolas.menay@pucv.cl	18298911-8	Sun Jun 28 2026 02:19:13 GMT-0400 (hora estándar de Chile)	Académico	Instituto de Arte	4	2	1.00	0.75	0	0,5	3	0	11.25		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
37	Calderón Godoy	Julieta Victoria	julieta.victoria.calderon@gmail.com	21884748-K	Wed Jun 24 2026 12:02:02 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Casa Central	4	1	0.00	0.50	0	2	3	1	11.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
38	Villarroel Ávila	Colomba Antonella	colomba.villarroel.a@mail.pucv.cl	22188245-8	Wed Jun 24 2026 16:35:54 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Monseñor Gimpert	4	1	0.00	1.00	0	1,5	3	1	11.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
39	Castillo Guerra	Camila Antonia	camila.castillo.g01@mail.pucv.cl	21122368-5	Wed Jun 24 2026 16:39:31 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Casa Central	4	1	0.00	0.50	2	0	3	1	11.00	https://drive.google.com/open?id=1r48MHqQc_FDOfitKE9cURGHeKVoFwhic	C1	Válido	C1	Acepta		10/07/2026
40	Gajardo Muñoz	Daniel Alexis	daniel.gajardo.m@mail.pucv.cl	21991143-2	Wed Jun 24 2026 17:48:45 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	4	1	0.00	0.50	0	2	3	1	11.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
41	Cabrera Pizarro	Josefina Dominga	josefina.cabrera.p@mail.pucv.cl	22010566-0	Sun Jun 28 2026 14:31:48 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	0.50	0	2	3	1	11.00		B2.2	Test de nivel	B2.2	Pendiente		10/07/2026
42	Leiva Tapia	Valentina Paz	valentina.leiva.t@mail.pucv.cl	21766106-4	Mon Jun 29 2026 08:27:21 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	4	1	0.00	0.50	0	2	3	1	11.00		B2.2	Test de nivel	B2.2	Pendiente		10/07/2026
43	Quijarro Ampuero	Jose Tomas	jose.quijarro.a@mail.pucv.cl	21990884-9	Mon Jul 06 2026 23:38:45 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	0.50	0	2	3	1	11.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
44	Figueroa Ulloa	Catalina Almendra	catalina.figueroa.u@pucv.cl	20843666-K	Thu Jun 25 2026 18:05:03 GMT-0400 (hora estándar de Chile)	Académico	Instituto y Conservatorio de Música	4	2	1.00	0.00	0	0,5	3	0	10.50		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
45	Gonzalez Mendez	Bryam Eliot	bryam.gonzalez.m@mail.pucv.cl	27073989-k	Sun Jul 05 2026 22:13:13 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Edificio Isabel Brown Caces (IBC)	4	1,5	1.00	0.00	0	0,5	3	0	10.00		B2.2	Test de nivel	B2.2	Acepta		10/07/2026
46	Pavez Jara	Javier Andrés	javier.pavez@pucv.cl	17220212-8	Wed Jun 24 2026 16:17:40 GMT-0400 (hora estándar de Chile)	Funcionario	Escuela de Ingeniería Bioquímica (IBQ)	4	2	2.75	0.00	0	0,5	3	2	14.25		C1	Test de nivel	C1	Acepta		10/07/2026
47	Mora Pizarro	Nicolás Ignacio	nicolas.mora@pucv.cl	18164398-6	Wed Jul 08 2026 12:29:48 GMT-0400 (hora estándar de Chile)	Funcionario	Campus Curauma	4	2	1.75	0.00	0	0,5	3	3	14.25		C1	Test de nivel	C1	Acepta		10/07/2026
48	Garcia Muñoz	Andres Sebastian	andres.garcia.m@mail.pucv.cl	23367227-0	Thu Jun 25 2026 20:48:40 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Química	4	1	0.00	1.50	3	1	3	1	14.00	https://drive.google.com/open?id=1x6P-X8R5uajVDUjNrazDE8HJt1STng8p	C1	Válido	C1	Acepta		10/07/2026
49	Díaz Purcell	Gabriel Alejandro	gabriel.diaz.p@mail.pucv.cl	21938462-9	Tue Jul 07 2026 23:22:06 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	3	1	0.00	0.50	3	2	3	1	13.00	https://drive.google.com/open?id=1RnTsJ4Fk3h-mLuqWwHEkKLvlMNNRuGhw	C1	Válido	C1	Acepta		10/07/2026
50	Bravo López	Laura Paz	laura.bravo.l@mail.pucv.cl	21761866-5	Wed Jul 08 2026 03:02:59 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Bioquímica (IBQ)	4	1	0.00	0.50	3	1	3	1	13.00	https://drive.google.com/open?id=1sIobprk9kVFdHPcBavh7UhtUmeJg5Vpd	C1	Válido	C1	Acepta		10/07/2026
51	Flores Reyes	Emilia Josefina	emilia.flores.r@mail.pucv.cl	22474145-6	Mon Jul 06 2026 14:34:55 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Casa Central	4	1	0.00	0.50	3	0,5	3	1	12.50	https://drive.google.com/open?id=15ign9VXz8uf68bsXYc50Rs2Hd3_oRKJj	C1	Válido	C1	Pendiente		10/07/2026
52	Oliva Paredes	Exequiel Eduardo	exequiel.oliva@pucv.cl	21525395-3	Mon Jun 29 2026 23:01:36 GMT-0400 (hora estándar de Chile)	Estudiante de postgrado	Centro Universitario Rafael Ariztía (FIN)	3	1,5	1.00	1.13	2	0,5	3	0	12.13	https://drive.google.com/open?id=14OCnIfI96LYMGefVVU_DJYA5YhI1PZc_	B1+	Válido	B1+	Acepta		10/07/2026
53	Santibáñez González	Benjamín Ignacio	benjamin.santibanez.g@mail.pucv.cl	20949249-0	Wed Jun 24 2026 16:44:39 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Alimentos	3	1	0.00	0.50	3	0,5	3	1	11.50		C1	Test de nivel	C1	Acepta		10/07/2026
54	Walter Villa	Francisca Ignacia	francisca.walter.v@mail.pucv.cl	21991485-7	Wed Jun 24 2026 16:32:32 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	4	1	0.00	1.00	0	1,5	3	1	11.00		C1	Test de nivel	C1	Pendiente		10/07/2026
55	Llancaman Torres	Rayen	rayen.llancaman.t@mail.pucv.cl	20706196-4	Mon Jul 06 2026 16:34:18 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Bioquímica (IBQ)	4	1	0.00	0.50	2	0	3	1	11.00	https://drive.google.com/open?id=1sjmSUPqvWMvW4anyD8fB3umcmaef_XJF	C1	Válido	C1	Acepta		10/07/2026
56	Zamora Segura	Francisca Isabel	francisca.zamora.s@mail.pucv.cl	21783814-2	Tue Jul 07 2026 00:16:04 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	4	1	0.00	0.50	0	2	3	1	11.00		C1	Test de nivel	C1	Acepta		10/07/2026
57	Goldsworthy Vega	Eduardo Andrés	edugoldsworthy@gmail.com	19325577-9	Wed Jun 24 2026 16:54:33 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	1	0.00	2.00	0	0	3	1	10.50		C1	Test de nivel	C1	Acepta		10/07/2026
58	Piña Oyarzún	José Francisco	jose.pina.o@mail.pucv.cl	20483743-0	Thu Jun 25 2026 02:25:12 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario Rafael Ariztía (FIN)	4	1	0.00	2.00	0	0	3	1	10.50		C1	Test de nivel	C1	Rechaza		10/07/2026
59	Villalobos Reyes	Rafaella Almendra	rafaella.villalobos.r@mail.pucv.cl	20957022-K	Mon Jul 06 2026 17:34:04 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Instituto y Conservatorio de Música	4	1	0.00	1.00	0	1	3	1	10.50		C1	Test de nivel	C1	Acepta		10/07/2026
60	Montero Chávez	Gabriel	gabriel.montero.c@mail.pucv.cl	22227914-3	Wed Jul 08 2026 14:32:01 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Campus Curauma	2	1	0.00	2.00	0	2	3	1	10.50		C1	Test de nivel	C1	Pendiente		10/07/2026
61	Molina Segura	Vicente Adolfo	vicente.molina.s@mail.pucv.cl	21127675-4	Tue Jul 07 2026 21:06:58 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Isabel Brown Caces (IBC)	4	1	0.00	0.50	0	0	3	1	9.00		B2.1	Válido	B2.1	Acepta	Promovido manualmente	10/07/2026
62	Henríquez Fernández	Catalina Alejandra	catalina.henriquez.f@mail.pucv.cl	21636607-7	Wed Jun 24 2026 18:34:20 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Negocios y Economía	4	1	0.00	0.50	0	1	3	1	10.00		B2.1	Válido	B2.1	Pendiente	Promovido manualmente	10/07/2026
63	Castro Liempi	Susana Ester	susana.castro.l@mail.pucv.cl	21723857-9	Wed Jun 24 2026 21:47:36 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Centro Universitario María Teresa Brown de Ariztía (Campus Sausalito)	4	1	0.00	1.00	0	1	3	1	10.50		B1+	Válido	B1+	Pendiente	Promovido manualmente	10/07/2026
64	Solorza Astudillo	Mateo Ignacio	mateo.solorza.a@mail.pucv.cl	21959315-5	Wed Jun 24 2026 21:55:25 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Química	3	1	0.00	0.50	0	2	3	1	10.00		B1+	Válido	B1+	Acepta	Promovido manualmente	10/07/2026
65	Ortiz Pizarro	Humberto Alonso	humberto.ortiz.p@mail.pucv.cl	22110795-0	Fri Jun 26 2026 01:04:04 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Escuela de Ingeniería Química	4	1	0.00	1.00	0	0	3	1	9.50		B2.1	Válido	B2.1	Pendiente	Promovido manualmente	10/07/2026
66	Espinoza Cid	Esperanza Ayelén	esperanza.espinoza.c@mail.pucv.cl	21668784-1	Wed Jul 01 2026 18:26:37 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Edificio Monseñor Gimpert	3	1	0.00	1.00	0	1	3	1	9.50		B2.1	Válido	B2.1	Pendiente	Promovido manualmente	10/07/2026
67	Pradenas Araya	Valentina Ignacia	valentina.pradenas.a@mail.pucv.cl	21930052-2	Wed Jul 08 2026 19:58:38 GMT-0400 (Chile Standard Time)	Estudiante de pregrado	Campus Curauma	4	1	0.00	0.50	0	2	3	1	11.00		B2.1	Válido	B2.1	Acepta	Promovido manualmente	10/07/2026
68	Guzmán Contreras	Elena Valentina	elena.guzman.c@mail.pucv.cl	20072957-9	Wed Jul 08 2026 23:50:26 GMT-0400 (Chile Standard Time)	Estudiante de pregrado	Instituto y Conservatorio de Música	3	1	0.00	0.50	3	1	3	1	12.00	https://drive.google.com/open?id=1waWuiesXVvMOMhldHoA-WEDw03kU32xr	C1	Válido	C1	Pendiente	Promovido manualmente	10/07/2026
69	Olivares Fernández	Catalina Ariela	catalina.olivares.f01@mail.pucv.cl	21373766-K	Sun Jul 05 2026 00:54:29 GMT-0400 (hora estándar de Chile)	Estudiante de pregrado	Instituto de Historia	4	1	0.00	0.50	2	0	3	1	11.00	https://drive.google.com/open?id=1DDaAXcJJ9AuQSK2yRiGEnXh1JUoAdAVI	B1+	Válido	B1+	Acepta	Promovido manualmente	10/07/2026
70	Massú Rubilar	Tahani Belén	tahani.massu.r@mail.pucv.cl	21444409-7	Wed Jul 08 2026 20:46:31 GMT-0400 (Chile Standard Time)	Estudiante de pregrado	Casa Central	4	1	0.00	0.50	3	0	3	1	12.00	https://drive.google.com/open?id=1itL2OA7umpdQXBbUNRAuPUdzBUoKyHP8	C1	Válido	C1	Acepta	Promovido manualmente	10/07/2026
71	Lillo Salinas	Benjamín Cristóbal	benjamin.lillo.s@mail.pucv.cl	21439154-6	Wed Jul 08 2026 22:32:41 GMT-0400 (Chile Standard Time)	Estudiante de pregrado	Casa Central	4	1	0.00	1.00	3	0	3	1	12.50	https://drive.google.com/open?id=1I0RuZ6g5nzBOBMhO5qRoOBHACMSaR99w	C1	Válido	C1	Acepta	Promovido manualmente	10/07/2026`;
    
    const lines = tsvData.split("\n").filter(line => line.trim() !== "");
    const rows = lines.map(line => {
      const parts = line.split("\t");
      // Insert "Pendiente" for Pago Matrícula at index 22 (between Aceptación [21] and Comentarios [22])
      parts.splice(22, 0, "Pendiente");
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
    ui.alert("Restauración Exitosa", "Se ha restaurado la hoja 'Seleccionados' con el listado original.", ui.ButtonSet.OK);
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
  const evalRowPart = rowData.slice(1, lastCol - 2); 

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
