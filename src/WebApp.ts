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
  const idxCorreo = headers.indexOf("Correo Electrónico");
  const idxVerificacion = headers.indexOf("Verificación Certificado") + 1;
  const idxNivel = headers.indexOf("Nivel Asignado") + 1;

  for (let i = 1; i < datos.length; i++) {
    if (datos[i][idxCorreo] === correo) {
      if (verificacion) hojaS.getRange(i + 1, idxVerificacion).setValue(verificacion);
      if (nivel) hojaS.getRange(i + 1, idxNivel).setValue(nivel);
      return "Estado de " + correo + " actualizado.";
    }
  }

  return "No se encontró al postulante con correo " + correo;
}
