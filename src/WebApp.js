"use strict";
/**
 * @file WebApp.ts
 * Handlers for the Google Web App interface (doGet) and data APIs.
 */
/**
 * Serves the HTML dashboard page or the applicant confirmation page.
 * @param e The GET event object from Google Apps Script.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The rendered HTML content.
 */
function doGet(e) {
    const action = e.parameter.action;
    const token = e.parameter.token;
    if (action && token) {
        const result = procesarAccionPostulante(token, action);
        return crearPaginaConfirmacion(action, result.nombre || "Postulante", result.exito, result.mensaje);
    }
    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('Panel de Control de Evaluación PUCV')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
/**
 * Creates a branded confirmation page for applicants.
 * @param accion The action performed ('accept' or 'reject').
 * @param nombre The name of the applicant.
 * @param exito Whether the operation was successful.
 * @param mensaje The status message to display.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The confirmation page.
 */
function crearPaginaConfirmacion(accion, nombre, exito, mensaje) {
    const logoUrl = "https://www.pucv.cl/uuaa/vriea/dircom/manual-de-marca-pucv-2022/logo-pucv-color.png";
    const color = exito ? (accion === 'accept' ? "#4CAF50" : "#f44336") : "#ff9800";
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: 'Roboto', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
          .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; width: 100%; text-align: center; border-top: 5px solid ${color}; }
          img { max-width: 150px; margin-bottom: 20px; }
          h2 { color: #003366; }
          p { line-height: 1.6; color: #555; font-size: 1.1em; }
          .footer { margin-top: 30px; font-size: 0.8em; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="${logoUrl}" alt="PUCV Logo">
          <h2>Hola, ${nombre}</h2>
          <p>${mensaje}</p>
          <div class="footer">
            Pontificia Universidad Católica de Valparaíso<br>
            Programa PUCV2English
          </div>
        </div>
      </body>
    </html>
  `;
    return HtmlService.createHtmlOutput(html)
        .setTitle('Confirmación PUCV2English')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
/**
 * Retrieves data for the Web App tables (Selected and Waitlist).
 */
function getSelectionData() {
    const ss = getSpreadsheet();
    // 1. Selected Data
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const dataS = hojaS ? hojaS.getDataRange().getValues() : [];
    const headersS = dataS.shift() || [];
    const idxCorreoS = headersS.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxNombreS = headersS.indexOf(CONFIG.COLUMNS.FIRST_NAME);
    const idxApellidosS = headersS.indexOf("Apellido(s)");
    const idxRankingS = headersS.indexOf("Ranking");
    const idxPuntajeS = headersS.indexOf("PUNTAJE TOTAL");
    const idxEnlaceS = headersS.indexOf("Enlace Certificado");
    const idxVerifS = headersS.indexOf("Verificación Certificado");
    const idxNivelS = headersS.indexOf("Nivel Asignado");
    const idxAceptacionS = headersS.indexOf("Aceptación");
    const idxNotificadoS = headersS.indexOf("Fecha Notificación");
    const seleccionados = dataS.map(f => ({
        ranking: f[idxRankingS],
        nombre: f[idxNombreS],
        apellidos: f[idxApellidosS],
        correo: f[idxCorreoS],
        puntaje: f[idxPuntajeS],
        enlaceCertificado: f[idxEnlaceS],
        verificacion: f[idxVerifS],
        nivel: f[idxNivelS],
        aceptacion: f[idxAceptacionS],
        fechaNotificacion: f[idxNotificadoS]
    }));
    // 2. Waitlist Data (Applicants in Evaluation but not in Selected)
    const hojaE = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    const dataE = hojaE ? hojaE.getDataRange().getValues() : [];
    const headersE = dataE.shift() || [];
    const emailsSelected = new Set(seleccionados.map(s => s.correo));
    const idxCorreoE = headersE.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxNombreE = headersE.indexOf("Nombre(s)");
    const idxApellidosE = headersE.indexOf("Apellido(s)");
    const idxPuntajeE = headersE.indexOf("PUNTAJE TOTAL");
    const idxFechaE = headersE.indexOf("Fecha de Postulación");
    const listaDeEspera = dataE
        .filter(row => row[idxCorreoE] && !emailsSelected.has(row[idxCorreoE]))
        .sort((a, b) => {
        const pB = parseFloat(b[idxPuntajeE] || 0);
        const pA = parseFloat(a[idxPuntajeE] || 0);
        if (pB !== pA)
            return pB - pA;
        return new Date(a[idxFechaE]).getTime() - new Date(b[idxFechaE]).getTime();
    })
        .map(f => ({
        nombre: f[idxNombreE],
        apellidos: f[idxApellidosE],
        correo: f[idxCorreoE],
        puntaje: f[idxPuntajeE]
    }));
    // 3. Statistics
    const stats = getDashboardStats();
    return {
        seleccionados,
        listaDeEspera,
        estadisticas: stats,
        logs: getWebAppLogs()
    };
}
/**
 * Retrieves statistics specifically for the dashboard charts.
 * Independent API for faster refreshes.
 */
function getDashboardStats() {
    const ss = getSpreadsheet();
    const hojaE = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    const dataE = hojaE ? hojaE.getDataRange().getValues() : [];
    if (dataE.length <= 1)
        return { error: "No hay datos de evaluación para generar estadísticas." };
    const headersE = dataE[0];
    const indicesOriginales = {};
    // Reconstruct indices from Input sheet to satisfy calculateEstadisticas requirement
    const hojaI = ss.getSheetByName(CONFIG.SHEETS.INPUT);
    if (hojaI) {
        hojaI.getRange(1, 1, 1, hojaI.getLastColumn()).getValues()[0].forEach((h, i) => {
            indicesOriginales[String(h).trim()] = i;
        });
    }
    const inputData = hojaI ? hojaI.getDataRange().getValues() : [];
    const baseStats = calcularEstadisticas(dataE, inputData, indicesOriginales);
    // Seat state from Seleccionados
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const dataS = hojaS ? hojaS.getDataRange().getValues() : [];
    const headersS = dataS.shift() || [];
    const idxAceptacion = headersS.indexOf("Aceptación");
    const idxNivel = headersS.indexOf("Nivel Asignado");
    const idxPuntaje = headersS.indexOf("PUNTAJE TOTAL");
    const countBy = (arr, idx) => {
        const res = {};
        arr.forEach(row => {
            const val = row[idx] || "Pendiente/Sin Asignar";
            res[val] = (res[val] || 0) + 1;
        });
        return res;
    };
    const seatBreakdown = countBy(dataS, idxAceptacion);
    const distribucionNivel = countBy(dataS, idxNivel);
    const sumPuntajeS = dataS.reduce((acc, row) => acc + parseFloat(row[idxPuntaje] || 0), 0);
    const promPuntajeS = dataS.length > 0 ? sumPuntajeS / dataS.length : 0;
    return {
        ...baseStats,
        totalSeleccionados: dataS.length,
        puntajePromedioSeleccionados: promPuntajeS,
        seatBreakdown: {
            aceptados: seatBreakdown["Acepta"] || 0,
            pendientes: seatBreakdown["Pendiente"] || 0,
            rechazados: seatBreakdown["Rechaza"] || 0,
            total: dataS.length
        },
        distribucionNivel,
        distribucionSede: Object.fromEntries(Object.entries(baseStats.statsPorSede).map(([k, v]) => [k, v.contador])),
        promediosPorTipo: Object.fromEntries(Object.entries(baseStats.statsPorCategoria).map(([k, v]) => [k, v.suma / v.contador])),
        // Analysis detailed breakdown
        analisisDetallado: getDetailedScoreBreakdown(dataE, headersE)
    };
}
/**
 * Helper to get detailed score breakdown by category.
 */
function getDetailedScoreBreakdown(data, headers) {
    const result = {};
    const rows = data.slice(1);
    const getIdx = (name) => headers.indexOf(name);
    const idxCat = getIdx("Categoría Postulante");
    const scores = {
        "Uso Inglés": getIdx("Puntaje Uso Inglés"),
        "Internacionalización": getIdx("Puntaje Intl."),
        "Año Ingreso": getIdx("Puntaje Año Ingreso"),
        "Nivel Inglés": getIdx("Puntaje Nivel Inglés")
    };
    rows.forEach(row => {
        const cat = row[idxCat] || "N/A";
        if (!result[cat]) {
            result[cat] = { count: 0, puntajes: { "Uso Inglés": 0, "Internacionalización": 0, "Año Ingreso": 0, "Nivel Inglés": 0 } };
        }
        result[cat].count++;
        for (const [name, idx] of Object.entries(scores)) {
            result[cat].puntajes[name] += parseFloat(row[idx] || 0);
        }
    });
    // Calculate averages
    for (const cat in result) {
        for (const name in result[cat].puntajes) {
            result[cat].puntajes[name] = result[cat].puntajes[name] / result[cat].count;
        }
    }
    return result;
}
/**
 * Updates an applicant's verification status or assigned level from the Web App.
 */
function updateApplicantStatus(correo, verificacion, nivel) {
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS)
        return "Error: Hoja de seleccionados no encontrada.";
    const datos = hojaS.getDataRange().getValues();
    const headers = datos[0];
    const idxCorreo = headers.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxVerificacion = headers.indexOf("Verificación Certificado") + 1;
    const idxNivel = headers.indexOf("Nivel Asignado") + 1;
    if (idxCorreo === -1)
        return "Error: Columna de correo no encontrada en Seleccionados.";
    for (let i = 1; i < datos.length; i++) {
        if (datos[i][idxCorreo] === correo) {
            if (verificacion !== undefined)
                hojaS.getRange(i + 1, idxVerificacion).setValue(verificacion);
            if (nivel !== undefined)
                hojaS.getRange(i + 1, idxNivel).setValue(nivel);
            return "Estado de " + correo + " actualizado.";
        }
    }
    return "No se encontró al postulante con correo " + correo;
}
/**
 * Retrieves all selected applicants for the sidebar review interface.
 */
function getPostulantesParaRevision() {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!sheet)
        return [];
    const data = sheet.getDataRange().getValues();
    const headers = data.shift() || [];
    return data.map(row => {
        const obj = { puntajes: {} };
        headers.forEach((h, i) => {
            const val = row[i];
            // Group scores into a sub-object for the UI
            if (["disponibilidad", "tipo", "usoIngles", "intl", "nivelIngles", "anioIngreso", "compromiso", "carta", "total"].includes(h.toLowerCase())) {
                obj.puntajes[h.toLowerCase()] = val;
            }
            else {
                // Map common fields to camelCase for the UI
                if (h === CONFIG.COLUMNS.EMAIL)
                    obj.correo = val;
                else if (h === CONFIG.COLUMNS.FIRST_NAME)
                    obj.nombre = val;
                else if (h === CONFIG.COLUMNS.LAST_NAME_P)
                    obj.apellidos = val;
                else if (h === CONFIG.COLUMNS.RUT)
                    obj.rut = val;
                else if (h === CONFIG.COLUMNS.TIMESTAMP)
                    obj.fecha = val;
                else if (h === CONFIG.COLUMNS.APPLICANT_TYPE)
                    obj.categoria = val;
                else if (h === CONFIG.COLUMNS.CAMPUS)
                    obj.sede = val;
                else if (h === "Verificación Certificado")
                    obj.verificacion = val;
                else if (h === "Nivel Asignado")
                    obj.nivel = val;
                else if (h === "Aceptación")
                    obj.aceptacion = val;
                else if (h === "Comentarios")
                    obj.comentarios = val;
                else if (h === "Enlace Certificado")
                    obj.enlaceCertificado = val;
                else
                    obj[h] = val;
            }
        });
        return obj;
    });
}
/**
 * Saves review data for a single applicant.
 */
function guardarRevisionPostulante(data) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!sheet)
        throw new Error("Hoja 'Seleccionados' no encontrada.");
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const idxCorreo = headers.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxVerif = headers.indexOf("Verificación Certificado") + 1;
    const idxNivel = headers.indexOf("Nivel Asignado") + 1;
    const idxComents = headers.indexOf("Comentarios") + 1;
    for (let i = 1; i < values.length; i++) {
        if (values[i][idxCorreo] === data.correo) {
            sheet.getRange(i + 1, idxVerif).setValue(data.verificacion);
            sheet.getRange(i + 1, idxNivel).setValue(data.nivel);
            sheet.getRange(i + 1, idxComents).setValue(data.comentarios);
            return "Cambios guardados para " + data.correo;
        }
    }
    throw new Error("No se encontró el postulante.");
}
/**
 * Generates a UUID token for an applicant and stores it in script properties.
 * Per Plan 3.1, Task 3.1.1.
 */
function generarToken(correo) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(10000);
        const token = Utilities.getUuid();
        PropertiesService.getScriptProperties().setProperty('token_' + token, correo);
        return token;
    }
    catch (e) {
        logToWebApp("Error generando token: " + e.message);
        throw e;
    }
    finally {
        lock.releaseLock();
    }
}
/**
 * Returns the full confirmation URL for an applicant's action.
 */
function obtenerUrlConfirmacion(correo, action) {
    const token = generarToken(correo);
    const webAppUrl = CONFIG.WEB_APP_URL || ScriptApp.getService().getUrl();
    if (!CONFIG.WEB_APP_URL && webAppUrl.endsWith('/dev')) {
        logToWebApp(`⚠️ ADVERTENCIA: Enlace /dev generado para ${correo}. Publica la Web App y configura WEB_APP_URL en Config.ts para evitar errores de Google Drive.`);
    }
    return `${webAppUrl.replace(/\/$/, '')}?action=${action}&token=${token}`;
}
/**
 * Processes an applicant's accept/reject action via token.
 * Updates the spreadsheet and triggers promotion logic on rejection.
 */
function procesarAccionPostulante(token, action) {
    const scriptProperties = PropertiesService.getScriptProperties();
    const correo = scriptProperties.getProperty('token_' + token);
    if (!correo) {
        return { exito: false, mensaje: "Este enlace ya fue utilizado o no es válido." };
    }
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS) {
        return { exito: false, mensaje: "Error base de datos: Hoja 'Seleccionados' no encontrada." };
    }
    const values = hojaS.getDataRange().getValues();
    const headers = values[0];
    const idxCorreo = headers.indexOf(CONFIG.COLUMNS.EMAIL);
    const idxNombre = headers.indexOf(CONFIG.COLUMNS.FIRST_NAME);
    const idxAceptacion = headers.indexOf("Aceptación") + 1;
    for (let i = 1; i < values.length; i++) {
        if (values[i][idxCorreo] === correo) {
            const nombre = values[i][idxNombre];
            const estadoActual = values[i][idxAceptacion - 1];
            if (estadoActual === 'Acepta' || estadoActual === 'Rechaza') {
                scriptProperties.deleteProperty('token_' + token); // Clean up used token
                return { exito: true, mensaje: "Tu respuesta ya fue registrada anteriormente.", nombre: nombre };
            }
            const nuevoEstado = action === 'accept' ? 'Acepta' : 'Rechaza';
            hojaS.getRange(i + 1, idxAceptacion).setValue(nuevoEstado);
            scriptProperties.deleteProperty('token_' + token); // One-time use
            if (action === 'reject') {
                // Trigger waitlist promotion if rejection (Plan 3.3, Task 3.3.1)
                procesarRechazoDesdeWebApp(correo);
                logToWebApp(`Rechazo recibido y procesado para ${correo}.`);
            }
            else {
                logToWebApp(`Aceptación recibida de ${correo}.`);
            }
            return { exito: true, mensaje: action === 'accept' ? "Gracias por confirmar tu participación." : "Lamentamos tu decisión, tu cupo será reasignado.", nombre: nombre };
        }
    }
    return { exito: false, mensaje: "No se encontró tu postulación en el sistema." };
}
