"use strict";
/**
 * @file Seleccionados.ts
 * Logic for managing selected applicants, waitlist, and sheet formatting.
 */
/**
 * Generates the "Seleccionados" sheet with ranking and data validation.
 * @param resultados The processed evaluation results array.
 * @param ss The target Spreadsheet.
 */
function generarHojaSeleccionados(resultados, ss) {
    const datosPostulantes = resultados.slice(1);
    const idxTotal = resultados[0].indexOf("PUNTAJE TOTAL");
    const idxFecha = resultados[0].indexOf("Fecha de Postulación");
    const idxNivelPostulado = resultados[0].indexOf("Nivel Postulado");
    logToWebApp("Generando lista de seleccionados por nivel (Top 15 por nivel)...");
    const niveles = ["B1+", "B2.1", "B2.2", "C1"];
    const seleccionadosPorNivel = [];
    niveles.forEach(nivel => {
        const filtrados = datosPostulantes.filter(f => {
            const nivelFila = idxNivelPostulado !== -1 ? String(f[idxNivelPostulado]).trim() : "";
            return nivelFila === nivel;
        });
        // Sort: 1. Score desc, 2. Date asc (tie breaker)
        filtrados.sort((a, b) => {
            const pB = parseFloat(b[idxTotal] || 0);
            const pA = parseFloat(a[idxTotal] || 0);
            if (pB !== pA)
                return pB - pA;
            return new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime();
        });
        const top15 = filtrados.slice(0, 15);
        seleccionadosPorNivel.push(...top15);
    });
    // Sort combined candidates: by level, then score desc
    seleccionadosPorNivel.sort((a, b) => {
        const nivelA = idxNivelPostulado !== -1 ? String(a[idxNivelPostulado]).trim() : "";
        const nivelB = idxNivelPostulado !== -1 ? String(b[idxNivelPostulado]).trim() : "";
        if (nivelA !== nivelB)
            return nivelA.localeCompare(nivelB);
        const pB = parseFloat(b[idxTotal] || 0);
        const pA = parseFloat(a[idxTotal] || 0);
        return pB - pA;
    });
    const rankedData = seleccionadosPorNivel.map((f, i) => [i + 1, ...f]);
    const headersS = [
        "Ranking", ...resultados[0],
        "Verificación Certificado", "Nivel Asignado", "Aceptación", "Comentarios", "Fecha Notificación"
    ];
    const idxNivelPostuladoInS = headersS.indexOf("Nivel Postulado");
    const sheetData = [headersS, ...rankedData.map(f => {
            const nivelPost = idxNivelPostuladoInS !== -1 ? String(f[idxNivelPostuladoInS]).trim() : "";
            return [...f, "", nivelPost, "Pendiente", "", ""];
        })];
    let sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!sheet)
        sheet = ss.insertSheet(CONFIG.SHEETS.SELECTED);
    else
        sheet.clear();
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
 * Finds the next eligible candidate in "Evaluación automatizada" for the specific level and moves them to "Seleccionados".
 */
function gestionarListaDeEspera(nivelTarget) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);
        const ss = getSpreadsheet();
        const hojaOutput = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
        const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
        if (!hojaOutput || !hojaSelected)
            return;
        const valuesOutput = hojaOutput.getDataRange().getValues();
        const headersOutput = valuesOutput.shift();
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
            if (pB !== pA)
                return pB - pA;
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
            "" // Fecha Notificación
        ];
        hojaSelected.appendRow(newRow);
        logToWebApp(`Candidato ${candidateEmail} (${candidateNivel}) promovido de lista de espera.`);
        // Send notification email to the NEW candidate
        sendEmailBatch('SELECTED');
    }
    catch (e) {
        logToWebApp("Error en gestionarListaDeEspera: " + e.message);
    }
    finally {
        lock.releaseLock();
    }
}
/**
 * Specifically handles rejection from the Web App.
 * Updates state to "Rechaza". Waitlist promotion is triggered manually by admin, NOT automatically.
 * @param correo The email address of the rejecting applicant.
 */
function procesarRechazoDesdeWebApp(correo) {
    logToWebApp(`Procesando rechazo de ${correo}. La lista de espera debe ser activada manualmente.`);
    // Rejection email is sent in WebApp.ts through the confirmation flow.
}
