/**
 * @file WebApp.ts
 * Handlers for the Google Web App interface (doGet) and data APIs.
 */

/**
 * Serves the HTML dashboard page.
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Panel de Control de Evaluación PUCV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Retrieves data for the Web App tables (Selected and Waitlist).
 */
function getSelectionData(): object {
  const ss = getSpreadsheet();
  
  // Selected Data
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  const dataS = hojaS ? hojaS.getDataRange().getValues() : [];
  const headersS = dataS.shift() || [];
  
  // Waitlist Data
  const dataW: any[] = []; // Implementation for waitlist if needed
  
  // Statistics
  // ... can call calcularEstadisticas here if needed
  
  return {
    selected: dataS.map(f => {
      const obj: any = {};
      headersS.forEach((h, i) => obj[h] = f[i]);
      return obj;
    }),
    waitlist: dataW,
    logs: getWebAppLogs()
  };
}

/**
 * Updates an applicant's verification status or assigned level from the Web App.
 */
function updateApplicantStatus(correo: string, verificacion: string, nivel: string): string {
  const ss = getSpreadsheet();
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaS) return "Error: Hoja de seleccionados no encontrada.";

  const datos = hojaS.getDataRange().getValues();
  const headers = datos[0];
  const idxCorreo = headers.indexOf(CONFIG.COLUMNS.EMAIL);
  const idxVerificacion = headers.indexOf("Verificación Certificado") + 1;
  const idxNivel = headers.indexOf("Nivel Asignado") + 1;

  if (idxCorreo === -1) return "Error: Columna de correo no encontrada en Seleccionados.";

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][idxCorreo] === correo) {
      if (verificacion !== undefined) hojaS.getRange(i + 1, idxVerificacion).setValue(verificacion);
      if (nivel !== undefined) hojaS.getRange(i + 1, idxNivel).setValue(nivel);
      return "Estado de " + correo + " actualizado.";
    }
  }

  return "No se encontró al postulante con correo " + correo;
}

/**
 * Retrieves all selected applicants for the sidebar review interface.
 */
function getPostulantesParaRevision(): object[] {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || [];
  
  return data.map(row => {
    const obj: any = { puntajes: {} };
    headers.forEach((h, i) => {
      const val = row[i];
      // Group scores into a sub-object for the UI
      if (["disponibilidad", "tipo", "usoIngles", "intl", "nivelIngles", "anioIngreso", "compromiso", "carta", "total"].includes(h.toLowerCase())) {
         obj.puntajes[h.toLowerCase()] = val;
      } else {
        // Map common fields to camelCase for the UI
        if (h === CONFIG.COLUMNS.EMAIL) obj.correo = val;
        else if (h === CONFIG.COLUMNS.FIRST_NAME) obj.nombre = val;
        else if (h === CONFIG.COLUMNS.LAST_NAME_P) obj.apellidos = val;
        else if (h === CONFIG.COLUMNS.RUT) obj.rut = val;
        else if (h === CONFIG.COLUMNS.TIMESTAMP) obj.fecha = val;
        else if (h === CONFIG.COLUMNS.APPLICANT_TYPE) obj.categoria = val;
        else if (h === CONFIG.COLUMNS.CAMPUS) obj.sede = val;
        else if (h === "Verificación Certificado") obj.verificacion = val;
        else if (h === "Nivel Asignado") obj.nivel = val;
        else if (h === "Aceptación") obj.aceptacion = val;
        else if (h === "Comentarios") obj.comentarios = val;
        else if (h === "Enlace Certificado") obj.enlaceCertificado = val;
        else obj[h] = val;
      }
    });
    return obj;
  });
}

/**
 * Saves review data for a single applicant.
 */
function guardarRevisionPostulante(data: {correo: string, verificacion: string, nivel: string, comentarios: string}): string {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!sheet) throw new Error("Hoja 'Seleccionados' no encontrada.");

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
