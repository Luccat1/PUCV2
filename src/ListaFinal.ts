/**
 * @file ListaFinal.ts
 * Logic for generating the final confirmed participant list.
 */

/**
 * Generates the final list of course participants who have accepted and have an assigned level.
 */
function generarListaFinalCurso(): string {
  const ss = getSpreadsheet();
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaS) return "Error: Hoja 'Seleccionados' no encontrada.";

  const datosS = hojaS.getDataRange().getValues();
  const headers = datosS.shift();
  if (!headers) return "Error: Hoja vacía.";

  const idxNombre = headers.indexOf("Nombre(s)");
  const idxApellido = headers.indexOf("Apellido(s)");
  const idxCorreo = headers.indexOf("Correo Electrónico");
  const idxNivel = headers.indexOf("Nivel Asignado");
  const idxAceptacion = headers.indexOf("Aceptación");

  const idxVerificacion = headers.indexOf("Verificación Certificado");

  // Filter: (Accepted AND has a Nivel) OR (Verification says Test de nivel)
  const finales = datosS.filter(f => {
    const isAcceptedCourse = String(f[idxAceptacion]).toLowerCase() === 'acepta' && String(f[idxNivel]).trim() !== "";
    const isTestDeNivel = String(f[idxVerificacion]).toLowerCase() === 'test de nivel';
    return isAcceptedCourse || isTestDeNivel;
  });

  if (finales.length === 0) return "No hay participantes confirmados para generar la lista final.";

  // Group by Nivel
  const grupos: Record<string, any[][]> = {};
  finales.forEach(f => {
    let nivel = String(f[idxNivel]).trim();
    if (String(f[idxVerificacion]).toLowerCase() === 'test de nivel') {
      nivel = "PRUEBA DE NIVEL";
    }
    if (!grupos[nivel]) grupos[nivel] = [];
    grupos[nivel].push([f[idxApellido], f[idxNombre], f[idxCorreo], nivel, ""]); // Empty string for 'Pagó'
  });

  let hojaF = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hojaF) hojaF = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
  else hojaF.clear();

  const finalRows: any[][] = [["Apellido(s)", "Nombre(s)", "Correo", "Nivel", "Pagó (Sí/No)"]];
  Object.keys(grupos).sort().forEach(nivel => {
    finalRows.push(["", "", "", "", ""]); // Empty row as separator (must have 5 columns)
    finalRows.push([`CATEGORÍA: ${nivel}`, "", "", "", ""]);
    grupos[nivel].forEach(p => finalRows.push(p));
  });

  hojaF.getRange(1, 1, finalRows.length, finalRows[0].length).setValues(finalRows);
  hojaF.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#cfe2f3");
  
  return `Lista final generada exitosamente en la hoja '${CONFIG.SHEETS.FINAL_LIST}'. Total confirmados: ${finales.length}.`;
}
