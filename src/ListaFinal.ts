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
  const idxPago = headers.indexOf("Pago Matrícula");

  // Filter: Candidate must have Accepted (Aceptación === 'Acepta') AND paid matriculation (Pago Matrícula === 'Pagado')
  // and either have an assigned level or be scheduled for a placement test.
  const finales = datosS.filter(f => {
    const isAccepted = String(f[idxAceptacion]).toLowerCase() === 'acepta';
    const isPaid = idxPago !== -1 ? String(f[idxPago]).toLowerCase() === 'pagado' : false;
    const hasNivelOrTest = String(f[idxNivel]).trim() !== "" || String(f[idxVerificacion]).toLowerCase() === 'test de nivel';
    return isAccepted && isPaid && hasNivelOrTest;
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
    const pagoVal = idxPago !== -1 && String(f[idxPago]).toLowerCase() === 'pagado' ? 'Sí' : 'No';
    grupos[nivel].push([f[idxApellido], f[idxNombre], f[idxCorreo], nivel, pagoVal]); // Populate 'Pagó (Sí/No)'
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
      if (idxCorreoC === -1) idxCorreoC = headersC.indexOf("Correo Electrónico");
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

            if (!grupos[nivelSiguiente]) grupos[nivelSiguiente] = [];

            const apellido = idxSurnameC !== -1 ? String(row[idxSurnameC]).trim() : "";
            const nombre = idxNameC !== -1 ? String(row[idxNameC]).trim() : "";
            const correo = idxCorreoC !== -1 ? String(row[idxCorreoC]).trim() : "";

            grupos[nivelSiguiente].push([apellido, nombre, correo, nivelSiguiente, "Exento (Continuación)"]);
            totalContinuationConfirmed++;
          }
        });
      }
    }
  }

  const totalConfirmados = finales.length + totalContinuationConfirmed;
  if (totalConfirmados === 0) return "No hay participantes confirmados para generar la lista final.";

  let hojaF = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hojaF) hojaF = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
  else hojaF.clear();

  const finalRows: any[][] = [];
  const HEADER = ["Apellido(s)", "Nombre(s)", "Correo", "Nivel", "Pagó (Sí/No)", "Sala", "Notificado Inicio"];
  finalRows.push(HEADER);

  Object.keys(grupos).sort().forEach(nivel => {
    finalRows.push(["", "", "", "", "", "", ""]); // Empty row as separator (7 cols)
    finalRows.push([`CATEGORÍA: ${nivel}`, "", "", "", "", "", ""]); // Category header (7 cols)
    grupos[nivel].forEach(p => {
      // Ensure row has exactly 7 columns (Sala and Notificado Inicio start empty)
      const row = [...p];
      while (row.length < 7) row.push("");
      finalRows.push(row.slice(0, 7));
    });
  });

  if (finalRows.length > 0 && finalRows[0].length > 0) {
    hojaF.getRange(1, 1, finalRows.length, finalRows[0].length).setValues(finalRows);
    hojaF.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#cfe2f3");
  }
  
  return `Lista final generada exitosamente en la hoja '${CONFIG.SHEETS.FINAL_LIST}'. Total confirmados: ${totalConfirmados} (${finales.length} seleccionados + ${totalContinuationConfirmed} continuación).`;
}

/**
 * Builds a Map<normalizedEmail, nivelString> from the "Prueba de Nivel" sheet.
 * Returns an empty Map if the sheet is null or has no data rows.
 * Email keys are normalized to lowercase for case-insensitive match.
 * @param placSheet - The "Prueba de Nivel" sheet, or null if it doesn't exist.
 */
function _buildPlacementEmailMap(
  placSheet: GoogleAppsScript.Spreadsheet.Sheet | null
): Map<string, string> {
  const map = new Map<string, string>();
  if (!placSheet) return map;
  const data = placSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const correo = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
    const nivel  = (data[r][PLACEMENT_COL.nivel]  || "").toString().trim();
    if (correo) map.set(correo, nivel);
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
function _markNivelInsuficiente(
  placSheet: GoogleAppsScript.Spreadsheet.Sheet,
  emailLower: string
): void {
  const data = placSheet.getDataRange().getValues();
  for (let r = 1; r < data.length; r++) {
    const rowEmail = (data[r][PLACEMENT_COL.correo] || "").toString().trim().toLowerCase();
    if (rowEmail === emailLower) {
      placSheet.getRange(r + 1, PLACEMENT_COL.nivelInsuficiente + 1).setValue("Sí");
      return;
    }
  }
}
