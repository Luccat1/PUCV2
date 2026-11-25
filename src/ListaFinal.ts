/**
 * @file ListaFinal.ts
 * Logic for generating the final confirmed participant list.
 */

/**
 * Generates the final list of course participants who have accepted and have an assigned level.
 */
function generarListaFinalCurso(): string {
  const ss = getSpreadsheet_();
  const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaS) return "Error: Hoja 'Seleccionados' no encontrada.";

  const datosS = hojaS.getDataRange().getValues();
  const headers = datosS.shift();
  if (!headers) return "Error: Hoja vacía.";

  const idxNombre = headers.indexOf(HEADERS.FIRST_NAME);
  const idxApellido = headers.indexOf(HEADERS.LAST_NAME);
  const idxCorreo = headers.indexOf(HEADERS.EMAIL);
  const idxNivel = headers.indexOf(HEADERS.LEVEL_ASSIGNED);
  const idxAceptacion = headers.indexOf(HEADERS.ACCEPTANCE);
  const idxVerificacion = headers.indexOf(HEADERS.CERT_VERIFICATION);
  const idxPago = headers.indexOf(HEADERS.PAYMENT);

  // Filter: Candidate must have Accepted (Aceptación === 'Acepta') AND paid matriculation (Pago Matrícula === 'Pagado')
  // and either have an assigned level or be scheduled for a placement test.
  const finales = datosS.filter(f => {
    const isAccepted = String(f[idxAceptacion]).toLowerCase() === 'acepta';
    const isPaid = idxPago !== -1 ? String(f[idxPago]).toLowerCase() === 'pagado' : false;
    const hasNivelOrTest = String(f[idxNivel]).trim() !== "" || String(f[idxVerificacion]).toLowerCase() === 'test de nivel';
    return isAccepted && isPaid && hasNivelOrTest;
  });

  if (finales.length === 0) return "No hay participantes confirmados para generar la lista final.";

  const VALID_LEVELS = ["B1+", "B2.1", "B2.2", "C1"];

  // Read "Prueba de Nivel" once before the loop for O(1) lookup (NIVEL-01 through NIVEL-04)
  const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
  const placMap   = buildPlacementEmailMap_(placSheet);

  const pendingTestEmails: string[] = [];

  // Group by Nivel
  const grupos: Record<string, any[][]> = {};
  finales.forEach(f => {
    let nivel = String(f[idxNivel]).trim();
    const esTest = String(f[idxVerificacion]).toLowerCase() === 'test de nivel';

    if (esTest) {
      const correo    = String(f[idxCorreo]).trim().toLowerCase();
      const resultado = placMap.get(correo) ?? "";

      if (resultado === "") {
        // NIVEL-04: no result yet — keep in PRUEBA DE NIVEL pending group
        nivel = "PRUEBA DE NIVEL";
        pendingTestEmails.push(correo);
      } else if (VALID_LEVELS.includes(resultado)) {
        // NIVEL-02: valid level — assign real level (replaces PRUEBA DE NIVEL grouping)
        nivel = resultado;
      } else {
        // NIVEL-03: insufficient level — mark in placement sheet, exclude from list
        if (placSheet) markNivelInsuficiente_(placSheet, correo);
        return; // skip — do NOT push to grupos
      }
    }

    if (!grupos[nivel]) grupos[nivel] = [];
    const pagoVal = idxPago !== -1 && String(f[idxPago]).toLowerCase() === 'pagado' ? 'Sí' : 'No';
    grupos[nivel].push([f[idxApellido], f[idxNombre], f[idxCorreo], nivel, pagoVal]);
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
      if (idxCorreoC === -1) idxCorreoC = headersC.indexOf(HEADERS.EMAIL);
      const idxCursoC = headersC.indexOf("Curso");
      const idxAceptacionC = headersC.indexOf(HEADERS.ACCEPTANCE);

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

  // Regenerar la lista no debe borrar quién ya recibió el correo de inicio de clases (si no, se reenvía a todos)
  const sellosPrevios = new Map<string, [any, any]>();
  if (hojaF) {
    const previos = hojaF.getDataRange().getValues();
    const hp = (previos.shift() || []).map(h => String(h).trim());
    const iCorreo = hp.indexOf("Correo"), iSala = hp.indexOf("Sala"), iNotif = hp.indexOf("Notificado Inicio");
    if (iCorreo !== -1 && iNotif !== -1) {
      previos.forEach(f => {
        const c = String(f[iCorreo]).trim().toLowerCase();
        if (c && (f[iNotif] !== "" || (iSala !== -1 && f[iSala] !== ""))) sellosPrevios.set(c, [iSala !== -1 ? f[iSala] : "", f[iNotif]]);
      });
    }
  }

  if (!hojaF) hojaF = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
  else hojaF.clear();

  const finalRows: any[][] = [];
  const HEADER = [HEADERS.LAST_NAME, HEADERS.FIRST_NAME, "Correo", "Nivel", "Pagó (Sí/No)", "Sala", "Notificado Inicio"];
  finalRows.push(HEADER);

  Object.keys(grupos).sort().forEach(nivel => {
    finalRows.push(["", "", "", "", "", "", ""]); // Empty row as separator (7 cols)
    finalRows.push([`CATEGORÍA: ${nivel}`, "", "", "", "", "", ""]); // Category header (7 cols)
    grupos[nivel].forEach(p => {
      // 5 columnas de datos + Sala y Notificado Inicio (se conservan si ya existían para ese correo)
      const row = p.slice(0, 5);
      while (row.length < 5) row.push("");
      const sello = sellosPrevios.get(String(p[2]).trim().toLowerCase());
      finalRows.push([...row, sello ? sello[0] : "", sello ? sello[1] : ""]);
    });
  });

  if (finalRows.length > 0 && finalRows[0].length > 0) {
    hojaF.getRange(1, 1, finalRows.length, finalRows[0].length).setValues(protegerFormulas_(finalRows));
    hojaF.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#cfe2f3");
  }
  
  let mensaje = `Lista final generada exitosamente en la hoja '${CONFIG.SHEETS.FINAL_LIST}'. Total confirmados: ${totalConfirmados} (${finales.length} seleccionados + ${totalContinuationConfirmed} continuación).`;
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
function buildPlacementEmailMap_(
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
function markNivelInsuficiente_(
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
