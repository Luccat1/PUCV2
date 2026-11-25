/**
 * @file WebApp.ts
 * Handlers for the Google Web App interface (doGet) and data APIs.
 */
/**
 * Serves the HTML dashboard page or the applicant confirmation page.
 * @param e The GET event object from Google Apps Script.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The rendered HTML content.
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const action = e.parameter.action;
  const token = e.parameter.token;
  const confirmed = e.parameter.confirmed;

  if (action && token) {
    if (action !== 'accept' && action !== 'reject') {
      return crearPaginaConfirmacion_(action, "Postulante", false, "El enlace no es válido.");
    }

    cargarConfiguracionDesdeHoja_();

    // If not confirmed yet, show intermediate confirmation screen (Fix #5: prevents email scanner pre-fetch)
    if (confirmed !== 'true' && confirmed !== '1') {
      const scriptProperties = PropertiesService.getScriptProperties();
      const tokenData = leerToken_(scriptProperties.getProperty('token_' + token));
      if (!tokenData) {
        return crearPaginaConfirmacion_(action, "Postulante", false, "Este enlace ya fue utilizado o no es válido.");
      }
      if (tokenData.vencido) {
        marcarEnlaceCaducado_(tokenData.correo);
        return crearPaginaConfirmacion_(action, "Postulante", false, "Este enlace ha caducado. El plazo para confirmar tu cupo ha expirado.");
      }
      return crearPaginaConfirmacionPrevia_(action, token);
    }

    const result = procesarAccionPostulante_(token, action);
    const paymentUrl = (action === 'accept' && result.exito) ? result.paymentUrl : undefined;
    return crearPaginaConfirmacion_(action, result.nombre || "Postulante", result.exito, result.mensaje, paymentUrl);
  }

  // Deny public access to admin dashboard via WebApp URL (Fix #1)
  return HtmlService.createHtmlOutput(
    '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; text-align: center; padding: 40px; color: #333;">' +
    '<h2 style="color: #0055a2;">Programa de Inglés PUCV</h2>' +
    '<p>Este enlace es de uso exclusivo para la confirmación de postulaciones.</p>' +
    '<p style="color: #666; font-size: 13px;">Si eres administrador, accede al panel de control directamente desde el menú de la planilla de Google Sheets.</p>' +
    '</div>'
  )
    .setTitle('Programa de Inglés PUCV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Creates an intermediate confirmation page so email anti-virus scanners
 * do not trigger acceptance/rejection on GET pre-fetch (Fix #5).
 */
function crearPaginaConfirmacionPrevia_(action: string, token: string): GoogleAppsScript.HTML.HtmlOutput {
  const isAccept = action === 'accept';
  const accionTexto = isAccept ? 'Aceptar Cupo' : 'Rechazar Cupo';
  const accionDesc = isAccept ? 'aceptar tu vacante seleccionada en el Programa de Inglés PUCV' : 'rechazar tu vacante y liberarla para la lista de espera';
  const colorBoton = isAccept ? '#2e7d32' : '#c62828';
  let webAppUrl = CONFIG.WEB_APP_URL || ScriptApp.getService().getUrl();
  webAppUrl = webAppUrl.replace(/\/u\/\d+/, '');
  const targetUrl = `${webAppUrl}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&confirmed=true`;

  const logoUrl = "https://www.pucv.cl/pucv/site/artic/20220615/imag/foto_0000000120220615160256/logo_header.png";

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación — Programa de Inglés PUCV</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f0f2f5; }
        .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 480px; width: 90%; text-align: center; }
        .logo { max-width: 180px; margin-bottom: 24px; }
        h1 { font-size: 20px; color: #1a1a1a; margin-bottom: 12px; }
        p { color: #555; line-height: 1.5; font-size: 15px; margin-bottom: 24px; }
        .btn { background-color: ${colorBoton}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .btn:hover { opacity: 0.92; }
      </style>
    </head>
    <body>
      <div class="card">
        <img src="${logoUrl}" alt="PUCV" class="logo">
        <h1>Confirmación de Decisión</h1>
        <p>Estás a punto de <strong>${accionDesc}</strong>.<br><br>Para formalizar tu respuesta, presiona el botón a continuación:</p>
        <a href="${targetUrl}" target="_top" class="btn">Confirmar ${accionTexto}</a>
      </div>
    </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Confirmación — Programa de Inglés PUCV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Creates a branded confirmation page for applicants.
 * @param accion The action performed ('accept' or 'reject').
 * @param nombre The name of the applicant.
 * @param exito Whether the operation was successful.
 * @param mensaje The status message to display.
 * @param paymentUrl The payment URL if accepted.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The confirmation page.
 */
function crearPaginaConfirmacion_(accion: string, nombre: string, exito: boolean, mensaje: string, paymentUrl?: string): GoogleAppsScript.HTML.HtmlOutput {
  const esc = (s: string) => String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const logoUrl = "https://www.pucv.cl/pucv/site/artic/20220615/imag/foto_0000000120220615160256/logo_header.png";
  const color = exito ? (accion === 'accept' ? "#4CAF50" : "#f44336") : "#ff9800";

  let paymentButtonHtml = "";
  if (exito && accion === 'accept' && paymentUrl) {
    paymentButtonHtml = `
      <div style="margin: 25px 0 10px 0;">
        <a href="${paymentUrl}" target="_blank" style="background-color: #0055a2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
          &#128179; Proceder al Pago de Matrícula
        </a>
      </div>
      <p style="font-size: 0.85em; color: #666;">Nota: Tienes un plazo de 3 días para completar el pago.</p>
    `;
  }

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
          <h2>Hola, ${esc(nombre)}</h2>
          <p>${esc(mensaje)}</p>
          ${paymentButtonHtml}
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
function getSelectionData(): object {
  const ss = getSpreadsheet_();

  // 1. Selected Data
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  const dataS = hojaS ? hojaS.getDataRange().getValues() : [];
  const headersS = dataS.shift() || [];

  const idxCorreoS = headersS.indexOf(HEADERS.EMAIL);
  const idxNombreS = headersS.indexOf(HEADERS.FIRST_NAME);
  const idxApellidosS = headersS.indexOf(HEADERS.LAST_NAME);
  const idxRankingS = headersS.indexOf(HEADERS.RANKING);
  const idxPuntajeS = headersS.indexOf(HEADERS.TOTAL_SCORE);
  const idxEnlaceS = headersS.indexOf(HEADERS.CERTIFICATE_LINK);
  const idxVerifS = headersS.indexOf(HEADERS.CERT_VERIFICATION);
  const idxNivelS = headersS.indexOf(HEADERS.LEVEL_ASSIGNED);
  const idxAceptacionS = headersS.indexOf(HEADERS.ACCEPTANCE);
  const idxPagoS = headersS.indexOf(HEADERS.PAYMENT);
  const idxNotificadoS = headersS.indexOf(HEADERS.NOTIFICATION_DATE);

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
    pagoMatricula: idxPagoS !== -1 ? f[idxPagoS] : "Pendiente",
    fechaNotificacion: f[idxNotificadoS]
  }));

  // 2. Waitlist Data (directly from official waitlist sheet)
  const hojaW = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
  const dataW = hojaW ? hojaW.getDataRange().getValues() : [];
  const headersW = dataW.shift() || [];

  const idxRankingW = headersW.indexOf(HEADERS.RANKING);
  const idxCorreoW = headersW.indexOf(HEADERS.EMAIL);
  const idxNombreW = headersW.indexOf(HEADERS.FIRST_NAME);
  const idxApellidosW = headersW.indexOf(HEADERS.LAST_NAME);
  const idxPuntajeW = headersW.indexOf(HEADERS.TOTAL_SCORE);
  const idxNivelW = headersW.indexOf(HEADERS.LEVEL_APPLIED);
  const idxNotificadoW = headersW.indexOf(HEADERS.NOTIFICATION_DATE);

  const listaDeEspera = dataW.map(f => ({
    ranking: idxRankingW !== -1 ? f[idxRankingW] : "",
    nombre: idxNombreW !== -1 ? f[idxNombreW] : "",
    apellidos: idxApellidosW !== -1 ? f[idxApellidosW] : "",
    correo: idxCorreoW !== -1 ? f[idxCorreoW] : "",
    puntaje: idxPuntajeW !== -1 ? f[idxPuntajeW] : "",
    nivel: idxNivelW !== -1 ? f[idxNivelW] : "",
    fechaNotificacion: idxNotificadoW !== -1 ? f[idxNotificadoW] : ""
  }));

  // 3. Statistics
  const stats = getDashboardStats_();

  return {
    seleccionados,
    listaDeEspera,
    estadisticas: stats
  };
}

/**
 * Retrieves statistics specifically for the dashboard charts.
 * Independent API for faster refreshes.
 */
function getDashboardStats_() {
  const ss = getSpreadsheet_();
  const hojaE = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
  const dataE = hojaE ? hojaE.getDataRange().getValues() : [];
  if (dataE.length <= 1) return { error: "No hay datos de evaluación para generar estadísticas." };

  const headersE = dataE[0];
  const indicesOriginales: Record<string, number> = {};

  // Reconstruct indices from Input sheet to satisfy calculateEstadisticas requirement
  const hojaI = ss.getSheetByName(CONFIG.SHEETS.INPUT);
  if (hojaI) {
    hojaI.getRange(1, 1, 1, hojaI.getLastColumn()).getValues()[0].forEach((h, i) => {
      indicesOriginales[String(h).trim()] = i;
    });
  }

  const inputData = hojaI ? hojaI.getDataRange().getValues() : [];
  const baseStats = calcularEstadisticas_(dataE, inputData, indicesOriginales);

  // Seat state from Seleccionados
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  const dataS = hojaS ? hojaS.getDataRange().getValues() : [];
  const headersS = dataS.shift() || [];
  const idxAceptacion = headersS.indexOf(HEADERS.ACCEPTANCE);
  const idxNivel = headersS.indexOf(HEADERS.LEVEL_ASSIGNED);
  const idxPuntaje = headersS.indexOf(HEADERS.TOTAL_SCORE);

  const countBy = (arr: any[][], idx: number) => {
    const res: Record<string, number> = {};
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
    distribucionNivelPostulado: Object.fromEntries(Object.entries(baseStats.statsPorNivel).map(([k, v]) => [k, v.contador])),
    distribucionSede: Object.fromEntries(Object.entries(baseStats.statsPorSede).map(([k, v]) => [k, v.contador])),
    promediosPorTipo: Object.fromEntries(Object.entries(baseStats.statsPorCategoria).map(([k, v]) => [k, v.suma / v.contador])),
    // Analysis detailed breakdown
    analisisDetallado: getDetailedScoreBreakdown_(dataE, headersE)
  };
}

/**
 * Helper to get detailed score breakdown by category.
 */
function getDetailedScoreBreakdown_(data: any[][], headers: any[]): Record<string, any> {
  const result: Record<string, any> = {};
  const rows = data.slice(1);

  const getIdx = (name: string) => headers.indexOf(name);
  const idxCat = getIdx(HEADERS.CATEGORY);
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
function updateApplicantStatus(correo: string, verificacion: string, nivel: string, pago?: string): string {
  try {
    const h = leerHoja_(CONFIG.SHEETS.SELECTED);
    const cCorreo = h.col(HEADERS.EMAIL);
    const i = h.filas.findIndex(f => f[cCorreo] === correo);
    if (i === -1) return "No se encontró al postulante con correo " + correo;

    // Se resuelven todas las columnas antes de escribir: si falta una, no queda nada escrito a medias
    const cVerif = h.col(HEADERS.CERT_VERIFICATION);
    const cNivel = h.col(HEADERS.LEVEL_ASSIGNED);
    const cPago = h.colOpc(HEADERS.PAYMENT); // hojas antiguas pueden no tener "Pago Matrícula"

    const fila = i + 2; // fila en la hoja (cabecera = 1)
    const escribir = (col: number, valor: string | undefined) => {
      if (valor !== undefined && col !== -1) h.hoja.getRange(fila, col + 1).setValue(valor);
    };
    escribir(cVerif, verificacion);
    escribir(cNivel, nivel);
    escribir(cPago, pago);
    return "Estado de " + correo + " actualizado.";
  } catch (e) {
    return "Error: " + mensajeError_(e);
  }
}

/**
 * Retrieves all selected applicants for the sidebar review interface.
 */
function getPostulantesParaRevision(): object[] {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || [];

  return data.map(row => {
    const obj: { puntajes: Record<string, unknown>; [campo: string]: unknown } = { puntajes: {} };
    headers.forEach((h, i) => {
      const val = row[i];
      // Group scores into a sub-object for the UI
      if (["disponibilidad", "tipo", "usoIngles", "intl", "nivelIngles", "anioIngreso", "compromiso", "carta", "total"].includes(h.toLowerCase())) {
        obj.puntajes[h.toLowerCase()] = val;
      } else {
        // Map common fields to camelCase for the UI
        if (h === HEADERS.EMAIL) obj.correo = val;
        else if (h === HEADERS.FIRST_NAME) obj.nombre = val;
        else if (h === HEADERS.LAST_NAME) obj.apellidos = val;
        else if (h === "RUT") obj.rut = val;
        else if (h === HEADERS.APPLICATION_DATE) obj.fecha = val;
        else if (h === HEADERS.CATEGORY) obj.categoria = val;
        else if (h === "Sede") obj.sede = val;
        else if (h === HEADERS.CERT_VERIFICATION) obj.verificacion = val;
        else if (h === HEADERS.LEVEL_ASSIGNED) obj.nivel = val;
        else if (h === HEADERS.ACCEPTANCE) obj.aceptacion = val;
        else if (h === HEADERS.PAYMENT) obj.pagoMatricula = val;
        else if (h === HEADERS.COMMENTS) obj.comentarios = val;
        else if (h === HEADERS.CERTIFICATE_LINK) obj.enlaceCertificado = val;
        else obj[h] = val;
      }
    });
    return obj;
  });
}

/**
 * Saves review data for a single applicant.
 */
function guardarRevisionPostulante(data: { correo: string, verificacion: string, nivel: string, comentarios: string }): string {
  const h = leerHoja_(CONFIG.SHEETS.SELECTED);
  const cCorreo = h.col(HEADERS.EMAIL);
  const cVerif = h.col(HEADERS.CERT_VERIFICATION);
  const cNivel = h.col(HEADERS.LEVEL_ASSIGNED);
  const cComentarios = h.col(HEADERS.COMMENTS);

  const i = h.filas.findIndex(f => f[cCorreo] === data.correo);
  if (i === -1) throw new Error("No se encontró el postulante.");

  const fila = i + 2; // fila en la hoja (cabecera = 1)
  h.hoja.getRange(fila, cVerif + 1).setValue(data.verificacion);
  h.hoja.getRange(fila, cNivel + 1).setValue(data.nivel);
  h.hoja.getRange(fila, cComentarios + 1).setValue(data.comentarios);
  return "Cambios guardados para " + data.correo;
}

/**
 * Generates a UUID token for an applicant and stores it in script properties.
 * Uses Utilities.getUuid() to produce unique collision-free keys, avoiding
 * lock contention and timeouts during batch operations.
 */
/**
 * Lee y valida un token guardado en Script Properties.
 * Soporta tokens nuevos ({correo, fecha}) y tokens antiguos (solo correo).
 */
function leerToken_(raw: string | null): { correo: string; vencido: boolean; diasVencido: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.correo === 'string') {
      const dias = PROGRAM_DATA.DEADLINE_DAYS || 3;
      const fechaMs = typeof parsed.fecha === 'number' ? parsed.fecha : Date.parse(parsed.fecha);
      const msVencido = isNaN(fechaMs) ? 0 : Date.now() - fechaMs - dias * 86400000;
      return { correo: parsed.correo, vencido: msVencido > 0, diasVencido: Math.max(0, msVencido / 86400000) };
    }
  } catch (_) {
    // Token antiguo en texto plano (solo correo)
  }
  return { correo: raw, vencido: false, diasVencido: 0 };
}

/** Días que se conserva un token ya vencido, para que quien abra su enlace siga viendo "ha caducado". */
const DIAS_RETENCION_TOKEN_VENCIDO = 30;

/**
 * Anota "Enlace caducado" en Comentarios de Seleccionados cuando alguien abre un enlace vencido,
 * para que la coordinación sepa a quién reenviar (menú "Reenviar enlace a un postulante").
 */
function marcarEnlaceCaducado_(correo: string): void {
  try {
    const buscado = correo.trim().toLowerCase();
    // Seleccionados primero; si no está, la hoja Continuación (su columna Comentarios se crea si falta)
    for (const nombre of [CONFIG.SHEETS.SELECTED, CONFIG.SHEETS.CONTINUATION]) {
      if (!getSpreadsheet_().getSheetByName(nombre)) continue;
      const h = leerHoja_(nombre);
      const cCorreo = h.colOpc("Email") !== -1 ? h.colOpc("Email") : h.colOpc(HEADERS.EMAIL);
      if (cCorreo === -1) continue;
      const i = h.filas.findIndex(f => String(f[cCorreo]).trim().toLowerCase() === buscado);
      if (i === -1) continue;
      const colCom = asegurarColumna_(h.hoja, HEADERS.COMMENTS); // 1-based
      const celda = h.hoja.getRange(i + 2, colCom);
      const actual = String(celda.getValue() || "");
      if (actual.includes("Enlace caducado")) return;
      const fecha = Utilities.formatDate(new Date(), PROGRAM_DATA.TIMEZONE || "America/Santiago", "dd/MM/yyyy HH:mm");
      celda.setValue(protegerFormulas_([[(actual ? actual + " | " : "") + `Enlace caducado (abierto el ${fecha})`]])[0][0]);
      return;
    }
  } catch (e) {
    logToWebApp_(`No se pudo anotar el enlace caducado de ${correo}: ${mensajeError_(e)}`);
  }
}

/**
 * Elimina los tokens que llevan más de DIAS_RETENCION_TOKEN_VENCIDO días vencidos, para no llenar la cuota de 500 KB.
 */
function limpiarTokensVencidos(): number {
  const scriptProperties = PropertiesService.getScriptProperties();
  const all = scriptProperties.getProperties();
  let eliminados = 0;
  for (const key of Object.keys(all)) {
    if (!key.startsWith('token_')) continue;
    const data = leerToken_(all[key]);
    if (data && data.vencido && data.diasVencido > DIAS_RETENCION_TOKEN_VENCIDO) {
      scriptProperties.deleteProperty(key);
      eliminados++;
    }
  }
  if (eliminados > 0) {
    logToWebApp_(`Limpieza de tokens: ${eliminados} token(s) vencido(s) eliminado(s).`);
  }
  return eliminados;
}

function generarToken_(correo: string): string {
  try {
    const token = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('token_' + token, JSON.stringify({ correo, fecha: Date.now() }));
    return token;
  } catch (e) {
    logToWebApp_("Error generando token: " + mensajeError_(e));
    throw e;
  }
}

/**
 * Generates and persists multiple tokens in a single batch operation.
 * Eliminates repetitive property store calls during mass email dispatch.
 */
function generarTokensBatch_(correos: string[]): Record<string, string> {
  const props: Record<string, string> = {};
  const tokenMap: Record<string, string> = {};
  const ahora = Date.now();
  correos.forEach(correo => {
    const token = Utilities.getUuid();
    props['token_' + token] = JSON.stringify({ correo, fecha: ahora });
    tokenMap[correo] = token;
  });
  if (Object.keys(props).length > 0) {
    PropertiesService.getScriptProperties().setProperties(props);
  }
  return tokenMap;
}

/**
 * URL base de la Web App para los enlaces de aceptar/rechazar. Falla con instrucciones si no hay ninguna:
 * ScriptApp.getService().getUrl() devuelve null cuando el proyecto no tiene una implementación de Web App.
 */
function urlBaseWebApp_(): string {
  const url = CONFIG.WEB_APP_URL || ScriptApp.getService().getUrl();
  if (!url) {
    throw new Error("No hay URL de la Web App para los enlaces de aceptar/rechazar. En Apps Script: Implementar > Nueva implementación > Aplicación web, y pega la URL (termina en /exec) en CONFIG.WEB_APP_URL de Config.");
  }
  return url;
}

function obtenerUrlConfirmacionConToken_(token: string, action: string): string {
  let webAppUrl = urlBaseWebApp_();
  
  // Strip multi-login segment (e.g. /u/2/) to avoid account conflict errors for recipients
  webAppUrl = webAppUrl.replace(/\/u\/\d+/, '');

  if (!CONFIG.WEB_APP_URL && webAppUrl.endsWith('/dev')) {
    logToWebApp_(`⚠️ ADVERTENCIA: Enlace /dev generado. Publica la Web App y configura WEB_APP_URL en Config.ts para evitar errores de Google Drive.`);
  }

  return `${webAppUrl.replace(/\/$/, '')}?action=${action}&token=${token}`;
}

/**
 * Processes an applicant's accept/reject action via token.
 * Updates the spreadsheet and sends confirmation emails.
 */
function procesarAccionPostulante_(token: string, action: string): { exito: boolean; mensaje: string; nombre?: string; paymentUrl?: string } {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lock.waitLock(10000);
    lockAcquired = true;
  } catch (_) {
    return { exito: false, mensaje: "El sistema está ocupado procesando otras solicitudes. Por favor, intenta de nuevo en un minuto." };
  }

  let correoConfirmacion: string | null = null;
  let tipoConfirmacion: 'accept' | 'reject' | null = null;
  let resultado: { exito: boolean; mensaje: string; nombre?: string; paymentUrl?: string };

  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const tokenData = leerToken_(scriptProperties.getProperty('token_' + token));

    if (!tokenData) {
      return { exito: false, mensaje: "Este enlace ya fue utilizado o no es válido." };
    }
    if (tokenData.vencido) {
      marcarEnlaceCaducado_(tokenData.correo);
      return { exito: false, mensaje: "Este enlace ha caducado. El plazo para confirmar tu cupo ha expirado." };
    }
    const correo = tokenData.correo;

    const ss = getSpreadsheet_();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS) {
      return { exito: false, mensaje: "Error base de datos: Hoja 'Seleccionados' no encontrada." };
    }

    let targetValues = hojaS.getDataRange().getValues();
    const headers = targetValues[0];
    const idxCorreo = headers.indexOf(HEADERS.EMAIL);
    const idxNombre = headers.indexOf(HEADERS.FIRST_NAME);
    const idxAceptacion = headers.indexOf(HEADERS.ACCEPTANCE) + 1;

    let isRealCandidate = false;
    let isContinuationStudent = false;
    let nombre = "Postulante";
    let targetSheet = hojaS;
    let rowIndex = -1;
    let idxAceptacionCol = idxAceptacion;

    for (let i = 1; i < targetValues.length; i++) {
      if (String(targetValues[i][idxCorreo]).trim().toLowerCase() === correo.trim().toLowerCase()) {
        isRealCandidate = true;
        nombre = targetValues[i][idxNombre];
        rowIndex = i + 1;
        break;
      }
    }

    // --- CHECK CONTINUATION SHEET IF NOT IN SELECTED ---
    if (!isRealCandidate) {
      const hojaC = ss.getSheetByName(CONFIG.SHEETS.CONTINUATION);
      if (hojaC) {
        const valuesC = hojaC.getDataRange().getValues();
        if (valuesC.length > 0) {
          const headersC = valuesC[0];
          let idxEmailC = headersC.indexOf("Email");
          if (idxEmailC === -1) idxEmailC = headersC.indexOf(HEADERS.EMAIL);
          const idxNameC = headersC.indexOf("Name");
          const idxSurnameC = headersC.indexOf("Surname");
          let idxAceptacionC = headersC.indexOf(HEADERS.ACCEPTANCE);

          if (idxAceptacionC === -1) {
            idxAceptacionC = headersC.length;
            hojaC.getRange(1, idxAceptacionC + 1).setValue(HEADERS.ACCEPTANCE);
          }

          if (idxEmailC !== -1) {
            for (let i = 1; i < valuesC.length; i++) {
              if (String(valuesC[i][idxEmailC]).trim().toLowerCase() === correo.trim().toLowerCase()) {
                isRealCandidate = true;
                isContinuationStudent = true;
                targetSheet = hojaC;
                nombre = `${valuesC[i][idxNameC] || ''} ${valuesC[i][idxSurnameC] || ''}`.trim() || correo;
                rowIndex = i + 1;
                idxAceptacionCol = idxAceptacionC + 1;
                targetValues = valuesC;
                break;
              }
            }
          }
        }
      }
    }

    // If candidate not found in Seleccionados nor Continuación (Fix #2: do not give false success)
    if (!isRealCandidate) {
      return {
        exito: false,
        mensaje: "No encontramos tu postulación en la lista de seleccionados ni de continuación. Por favor contacta a la coordinación del programa de inglés.",
        nombre: "Postulante"
      };
    }

    // Real candidate processing
    const estadoActual = targetValues[rowIndex - 1][idxAceptacionCol - 1];
    if (estadoActual === 'Acepta' || estadoActual === 'Rechaza') {
      // Consume token to prevent repeated accesses once recorded
      scriptProperties.deleteProperty('token_' + token);
      return { 
        exito: true, 
        mensaje: "Tu respuesta ya fue registrada anteriormente.", 
        nombre: nombre,
        paymentUrl: isContinuationStudent ? undefined : PROGRAM_DATA.PAYMENT_URL 
      };
    }

    const nuevoEstado = action === 'accept' ? 'Acepta' : 'Rechaza';
    targetSheet.getRange(rowIndex, idxAceptacionCol).setValue(nuevoEstado);

    // Consume token only after writing successfully to the sheet (Fix #3)
    scriptProperties.deleteProperty('token_' + token);

    if (isContinuationStudent) {
      logToWebApp_(`${action === 'accept' ? 'Aceptación' : 'Rechazo'} de continuación recibida de ${correo}.`);
      return {
        exito: true,
        mensaje: action === 'accept' ?
          "Gracias por confirmar tu participación. Al ser estudiante de continuación, tu cupo ha quedado reservado directamente sin pago de matrícula." :
          "Has rechazado tu cupo de continuación. Tu lugar no será reservado.",
        nombre: nombre,
        paymentUrl: undefined
      };
    }

    if (action === 'reject') {
      logToWebApp_(`Rechazo recibido y procesado para ${correo}.`);
      correoConfirmacion = correo;
      tipoConfirmacion = 'reject';
    } else {
      logToWebApp_(`Aceptación recibida de ${correo}.`);
      correoConfirmacion = correo;
      tipoConfirmacion = 'accept';
    }

    resultado = { 
      exito: true, 
      mensaje: action === 'accept' ? 
        "Gracias por confirmar tu participación. Para formalizar tu cupo, procede al pago de la matrícula." : 
        "Lamentamos tu decisión, tu cupo será liberado para la lista de espera.", 
      nombre: nombre,
      paymentUrl: PROGRAM_DATA.PAYMENT_URL
    };
  } finally {
    if (lockAcquired) lock.releaseLock();
  }

  // Enviar correo de confirmación fuera del candado para evitar contención
  if (correoConfirmacion && tipoConfirmacion) {
    enviarCorreoConfirmacion_(correoConfirmacion, tipoConfirmacion);
  }

  return resultado;
}

/**
 * Exposed API for manual waitlist promotion from the Web App.
 */
function promoverSiguienteEsperaAPI(nivel: string): string {
  try {
    return gestionarListaDeEspera_(nivel);
  } catch (e) {
    return `Error al promover candidato: ${mensajeError_(e)}`;
  }
}
