"use strict";
/**
 * @file ListaFinal.ts
 * Logic for generating the final confirmed participant list.
 */
/**
 * Generates the final list of course participants who have accepted and have an assigned level.
 */
function generarListaFinalCurso() {
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS)
        return "Error: Hoja 'Seleccionados' no encontrada.";
    const datosS = hojaS.getDataRange().getValues();
    const headers = datosS.shift();
    if (!headers)
        return "Error: Hoja vacía.";
    const idxNombre = headers.indexOf("Nombre(s)");
    const idxApellido = headers.indexOf("Apellido(s)");
    const idxCorreo = headers.indexOf("Correo Electrónico");
    const idxRut = headers.indexOf("RUT");
    const idxNivel = headers.indexOf("Nivel Asignado");
    const idxAceptacion = headers.indexOf("Aceptación");
    const idxVerificacion = headers.indexOf("Verificación Certificado");
    const idxPago = headers.indexOf("Pago Matrícula");
    // Filter: Candidate must have Accepted (Aceptación === 'Acepta') AND paid matriculation (Pago Matrícula === 'Pagado')
    // and either have an assigned level or be scheduled for a placement test.
    const finales = datosS.filter(f => {
        const isAccepted = String(f[idxAceptacion]).toLowerCase() === 'acepta';
        const isPaid = idxPago !== -1 ? String(f[idxPago]).toLowerCase() === 'pagado' : false;
        const hasNivelOrTest = String(f[idxNivel]).trim() !== "" || String(f[idxVerificacion]).toLowerCase() === 'test de nivel';
        return isAccepted && isPaid && hasNivelOrTest;
    });
    if (finales.length === 0)
        return "No hay participantes confirmados para generar la lista final.";
    const VALID_LEVELS = ["B1+", "B2.1", "B2.2", "C1"];
    // Read "Prueba de Nivel" once before the loop for O(1) lookup (NIVEL-01 through NIVEL-04)
    const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
    const placMap = _buildPlacementEmailMap(placSheet);
    const pendingTestEmails = [];
    // Group by Nivel — each entry now includes RUT
    const grupos = {};
    finales.forEach(f => {
        let nivel = String(f[idxNivel]).trim();
        const esTest = String(f[idxVerificacion]).toLowerCase() === 'test de nivel';
        if (esTest) {
            const correo = String(f[idxCorreo]).trim().toLowerCase();
            const resultado = placMap.get(correo) ?? "";
            if (resultado === "") {
                // NIVEL-04: no result yet — keep in PRUEBA DE NIVEL pending group
                nivel = "PRUEBA DE NIVEL";
                pendingTestEmails.push(correo);
            }
            else if (VALID_LEVELS.includes(resultado)) {
                // NIVEL-02: valid level — assign real level (replaces PRUEBA DE NIVEL grouping)
                nivel = resultado;
            }
            else {
                // NIVEL-03: insufficient level — mark in placement sheet, exclude from list
                if (placSheet)
                    _markNivelInsuficiente(placSheet, correo);
                return; // skip — do NOT push to grupos
            }
        }
        if (!grupos[nivel])
            grupos[nivel] = [];
        const pagoVal = idxPago !== -1 && String(f[idxPago]).toLowerCase() === 'pagado' ? 'Sí' : 'No';
        const rut = idxRut !== -1 ? String(f[idxRut]).trim() : "";
        grupos[nivel].push([f[idxApellido], f[idxNombre], rut, f[idxCorreo], nivel, pagoVal]);
    });
    // Group continuation students from "Continuación" sheet who have Aceptación === 'Acepta'
    let totalContinuationConfirmed = 0;
    const hojaC = ss.getSheetByName(CONFIG.SHEETS.CONTINUATION);
    if (hojaC) {
        const datosC = hojaC.getDataRange().getValues();
        const headersC = datosC.shift();
        if (headersC) {
            const idxNameC = headersC.indexOf("Name");
            const idxSurnameC = headersC.indexOf("Surname");
            let idxCorreoC = headersC.indexOf("Email");
            if (idxCorreoC === -1)
                idxCorreoC = headersC.indexOf("Correo Electrónico");
            const idxIdC = headersC.indexOf("ID");
            const idxCursoC = headersC.indexOf("Curso");
            const idxAceptacionC = headersC.indexOf("Aceptación");
            if (idxCursoC !== -1 && idxAceptacionC !== -1) {
                datosC.forEach(row => {
                    const isAccepted = String(row[idxAceptacionC]).trim().toLowerCase() === 'acepta';
                    if (isAccepted) {
                        const cursoRaw = String(row[idxCursoC]).trim();
                        const cursoMatch = cursoRaw.match(/^(B1\+|B2\.1|B2\.2|C1)/i);
                        const cursoNivel = cursoMatch ? cursoMatch[1] : cursoRaw.split(' ')[0];
                        const nivelSiguiente = CONTINUATION_MAP[cursoNivel] || cursoNivel;
                        if (!grupos[nivelSiguiente])
                            grupos[nivelSiguiente] = [];
                        const apellido = idxSurnameC !== -1 ? String(row[idxSurnameC]).trim() : "";
                        const nombre = idxNameC !== -1 ? String(row[idxNameC]).trim() : "";
                        const correo = idxCorreoC !== -1 ? String(row[idxCorreoC]).trim() : "";
                        const rutC = idxIdC !== -1 ? String(row[idxIdC]).trim() : "";
                        grupos[nivelSiguiente].push([apellido, nombre, rutC, correo, nivelSiguiente, "Exento (Continuación)"]);
                        totalContinuationConfirmed++;
                    }
                });
            }
        }
    }
    const totalConfirmados = finales.length + totalContinuationConfirmed;
    if (totalConfirmados === 0)
        return "No hay participantes confirmados para generar la lista final.";
    // ---------------------------------------------------------------------------
    // Preserve previous notification data before clearing (Sala, Notificado Inicio)
    // ---------------------------------------------------------------------------
    let hojaF = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
    const prevData = new Map(); // Map<normalizedEmail, { sala, notificadoInicio }>
    if (hojaF) {
        const oldData = hojaF.getDataRange().getValues();
        if (oldData.length > 1) {
            const oldHeaders = oldData[0];
            const oIdxCorreo = oldHeaders.indexOf("Correo");
            const oIdxSala = oldHeaders.indexOf("Sala");
            const oIdxNotif = oldHeaders.indexOf(CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);
            if (oIdxCorreo !== -1) {
                for (let r = 1; r < oldData.length; r++) {
                    const email = String(oldData[r][oIdxCorreo]).trim().toLowerCase();
                    if (!email)
                        continue;
                    prevData.set(email, {
                        sala: oIdxSala !== -1 ? oldData[r][oIdxSala] : "",
                        notificadoInicio: oIdxNotif !== -1 ? oldData[r][oIdxNotif] : ""
                    });
                }
            }
        }
        hojaF.clear();
    }
    else {
        hojaF = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
    }
    const HEADER = ["Apellido(s)", "Nombre(s)", "RUT", "Correo", "Nivel", "Pagó (Sí/No)", "Sala", CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE];
    const NUM_COLS = HEADER.length;
    const finalRows = [];
    finalRows.push(HEADER);
    Object.keys(grupos).sort().forEach(nivel => {
        const emptyRow = new Array(NUM_COLS).fill("");
        finalRows.push(emptyRow); // Empty row as separator
        const catRow = new Array(NUM_COLS).fill("");
        catRow[0] = `CATEGORÍA: ${nivel}`;
        finalRows.push(catRow); // Category header
        grupos[nivel].forEach(p => {
            // p = [apellido, nombre, rut, correo, nivel, pagoVal]
            const correoNorm = String(p[3]).trim().toLowerCase();
            const prev = prevData.get(correoNorm);
            const row = [
                p[0], // Apellido(s)
                p[1], // Nombre(s)
                p[2], // RUT
                p[3], // Correo
                p[4], // Nivel
                p[5], // Pagó (Sí/No)
                prev ? prev.sala : "",                  // Sala (preserved)
                prev ? prev.notificadoInicio : ""       // Notificado Inicio (preserved)
            ];
            finalRows.push(row);
        });
    });
    if (finalRows.length > 0 && finalRows[0].length > 0) {
        hojaF.getRange(1, 1, finalRows.length, finalRows[0].length).setValues(finalRows);
        hojaF.getRange(1, 1, 1, NUM_COLS).setFontWeight("bold").setBackground("#cfe2f3");
    }
    let mensaje = `Lista final generada exitosamente en la hoja '${CONFIG.SHEETS.FINAL_LIST}'. Total confirmados: ${totalConfirmados} (${finales.length} seleccionados + ${totalContinuationConfirmed} continuación).`;
    if (prevData.size > 0) {
        const preservedCount = [...prevData.values()].filter(v => v.notificadoInicio !== "" && v.notificadoInicio !== null && v.notificadoInicio !== undefined).length;
        if (preservedCount > 0)
            mensaje += ` Se preservaron ${preservedCount} notificación(es) de inicio previas.`;
    }
    if (pendingTestEmails.length > 0) {
        mensaje += ` ADVERTENCIA: ${pendingTestEmails.length} estudiante(s) aún sin resultado en Prueba de Nivel: ${pendingTestEmails.join(", ")}. Ingresar resultados y regenerar para incluirlos en su nivel.`;
    }
    return mensaje;
}
/**
 * Builds a Map<normalizedEmail, nivelString> from the "Prueba de Nivel" sheet.
 * Returns an empty Map if the sheet is null or has no data rows.
 * Email keys are normalized to lowercase for case-insensitive match.
 * @param placSheet - The "Prueba de Nivel" sheet, or null if it doesn't exist.
 */
function _buildPlacementEmailMap(placSheet) {
    const map = new Map();
    if (!placSheet)
        return map;
    const data = placSheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
        const correo = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
        const nivel = (data[r][PLACEMENT_COL.nivel] || "").toString().trim();
        if (correo)
            map.set(correo, nivel);
    }
    return map;
}
/**
 * Sets "Nivel Insuficiente" = "Sí" for the row matching emailLower in the placement sheet.
 * This is an idempotent write — calling it again on an already-marked row is harmless.
 * Side effect: generarListaFinalCurso() writes to "Prueba de Nivel" when excluding students.
 * @param placSheet - The "Prueba de Nivel" sheet (must not be null — caller guards).
 * @param emailLower - Normalized (lowercase) student email to match.
 */
function _markNivelInsuficiente(placSheet, emailLower) {
    const data = placSheet.getDataRange().getValues();
    for (let r = 1; r < data.length; r++) {
        const rowEmail = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
        if (rowEmail === emailLower) {
            placSheet.getRange(r + 1, PLACEMENT_COL.nivelInsuficiente + 1).setValue("Sí");
            return;
        }
    }
}
