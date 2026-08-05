/**
 * @file RechazoPorNivel.ts
 * Rejection email batch for students with insufficient placement test level.
 *
 * Public API (called by Menu.ts):
 *   enviarCorreosRechazoPorNivel() — reads "Prueba de Nivel", sends CorreoRechazoPorNivel.html
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
function renderCorreoRechazoPorNivel(vars: ICorreoRechazoPorNivelVars): string {
  const tpl = HtmlService.createTemplateFromFile('CorreoRechazoPorNivel');
  (tpl as any).nombre = vars.nombre;
  (tpl as any).nivel  = vars.nivel;
  return tpl.evaluate().getContent();
}

/**
 * Sends rejection emails to all students marked with insufficient placement level.
 * Idempotent: skips rows where "Correo Rechazo Enviado" already has a value.
 * Side effect: writes new Date() to PLACEMENT_COL.correoRechazaEnviado after each successful send.
 *
 * @returns Status string for display via SpreadsheetApp.getUi().alert().
 */
function enviarCorreosRechazoPorNivel(): string {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
  if (!placSheet) return "ERROR: Hoja \"Prueba de Nivel\" no encontrada. Ejecuta primero \"Sincronizar Candidatos a Test\".";

  const data = placSheet.getDataRange().getValues();
  if (data.length < 2) return "No hay datos en \"Prueba de Nivel\".";

  // Collect eligible recipients: Nivel Insuficiente === "Sí" AND Correo Rechazo Enviado blank
  const recipients: { rowNum: number; nombre: string; correo: string; nivel: string }[] = [];
  for (let r = 1; r < data.length; r++) {
    const esInsuficiente = (data[r][PLACEMENT_COL.nivelInsuficiente] || "").toString().trim() === "Sí";
    const yaEnviado      = (data[r][PLACEMENT_COL.correoRechazaEnviado] || "").toString().trim() !== "";
    if (!esInsuficiente || yaEnviado) continue;
    recipients.push({
      rowNum: r + 1,  // 1-based row in sheet
      nombre: (data[r][PLACEMENT_COL.nombre] || "").toString().trim(),
      correo: (data[r][PLACEMENT_COL.correo] || "").toString().trim(),
      nivel:  (data[r][PLACEMENT_COL.nivel]  || "").toString().trim(),
    });
  }

  if (recipients.length === 0) return "No hay destinatarios pendientes de correo de rechazo.";

  // Quota guard — same pattern as InicioClases.ts lines 175-178
  const quota = MailApp.getRemainingDailyQuota();
  if (quota < recipients.length) {
    return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y necesitas ${recipients.length}.`;
  }

  const subject = "Resultado de Prueba de Nivel — PUCV2English";
  let count = 0;
  const errores: string[] = [];

  recipients.forEach(r => {
    try {
      const htmlBody = renderCorreoRechazoPorNivel({ nombre: r.nombre, nivel: r.nivel });
      GmailApp.sendEmail(r.correo, subject, "", { htmlBody, name: "Programa PUCV2English" });
      // Idempotency stamp — write date to "Correo Rechazo Enviado" column (per D-11)
      placSheet.getRange(r.rowNum, PLACEMENT_COL.correoRechazaEnviado + 1).setValue(new Date());
      count++;
    } catch (e: any) {
      errores.push(`[${r.correo}]: ${e.message}`);
    }
  });

  if (errores.length > 0) {
    return `Se enviaron ${count} correos de rechazo por nivel insuficiente.\n\nHubo ${errores.length} error(es):\n${errores.slice(0, 3).join("\n")}`;
  }
  return `Se enviaron ${count} correos de rechazo por nivel insuficiente exitosamente.`;
}
