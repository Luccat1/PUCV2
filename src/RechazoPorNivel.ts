/**
 * @file RechazoPorNivel.ts
 * Rejection email batch for students with insufficient placement test level.
 *
 * Public API (called by Menu.ts):
 *   enviarCorreosRechazoPorNivel_() — reads "Prueba de Nivel", sends CorreoRechazoPorNivel.html
 *                                    to rows with Nivel Insuficiente === "Sí" and no prior send stamp.
 */

/**
 * Typed variables contract for CorreoRechazoPorNivel.html.
 */
interface ICorreoRechazoPorNivelVars {
  nombre: string;
  nivel: string;
}

/**
 * Renders the CorreoRechazoPorNivel.html template with the given variables.
 * @param vars - nombre and nivel to inject into the template.
 * @returns Evaluated HTML string ready for GmailApp.sendEmail.
 */
function renderCorreoRechazoPorNivel_(vars: ICorreoRechazoPorNivelVars): string {
  return renderPlantilla_('CorreoRechazoPorNivel', { ...vars });
}

/**
 * Sends rejection emails to all students marked with insufficient placement level.
 * Idempotent: skips rows where "Correo Rechazo Enviado" already has a value.
 * Side effect: writes new Date() to PLACEMENT_COL.correoRechazaEnviado after each successful send.
 *
 * @returns Status string for display via SpreadsheetApp.getUi().alert().
 */
function enviarCorreosRechazoPorNivel_(): string {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
  if (!placSheet) return "ERROR: Hoja \"Prueba de Nivel\" no encontrada. Ejecuta primero \"Sincronizar Candidatos a Test\".";

  const data = placSheet.getDataRange().getValues();
  if (data.length < 2) return "No hay datos en \"Prueba de Nivel\".";

  // Collect eligible recipients: Nivel Insuficiente === "Sí" AND Correo Rechazo Enviado blank
  const recipients: { rowNum: number; nombre: string; email: string; nivel: string }[] = [];
  for (let r = 1; r < data.length; r++) {
    const esInsuficiente = (data[r][PLACEMENT_COL.nivelInsuficiente] || "").toString().trim() === "Sí";
    const yaEnviado      = (data[r][PLACEMENT_COL.correoRechazaEnviado] || "").toString().trim() !== "";
    if (!esInsuficiente || yaEnviado) continue;
    recipients.push({
      rowNum: r + 1,  // 1-based row in sheet
      nombre: (data[r][PLACEMENT_COL.nombre] || "").toString().trim(),
      email: (data[r][PLACEMENT_COL.correo] || "").toString().trim(),
      nivel:  (data[r][PLACEMENT_COL.nivel]  || "").toString().trim(),
    });
  }

  if (recipients.length === 0) return "No hay destinatarios pendientes de correo de rechazo.";

  return enviarLote_({
    etiqueta: "rechazo por nivel insuficiente",
    destinatarios: recipients,
    asunto: "Resultado de Prueba de Nivel — PUCV2English",
    html: r => renderCorreoRechazoPorNivel_({ nombre: r.nombre, nivel: r.nivel }),
    remitente: "Programa PUCV2English",
    // Idempotency stamp — "Correo Rechazo Enviado" (per D-11)
    hojaSello: placSheet,
    columnaSello: PLACEMENT_COL.correoRechazaEnviado + 1
  });
}
