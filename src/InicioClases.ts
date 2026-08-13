/**
 * @file InicioClases.ts
 * Server-side logic for the class-start email batch.
 * Called from DialogSalas.html via google.script.run.
 *
 * Public API:
 *   getNivelesActivos()              — returns string[] of active levels for dialog rendering
 *   guardarSalasYObtenerPreview()    — validates + stores sala in-memory; returns preview string
 *   enviarCorreosInicioClases()      — iterates Lista Final, sends emails, writes sala + timestamp
 */

/**
 * Internal interface for a class-start email recipient.
 * Rows from Lista Final that pass the filter criteria.
 */
interface IInicioClasesRecipient {
  rowNum: number;   // 1-indexed row in the sheet (header = row 1, first data = row 2)
  apellido: string;
  nombre: string;
  email: string;
  nivel: string;
}

/**
 * Typed variables contract for the CorreoInicioClases.html template.
 */
interface ICorreoInicioClasesVars {
  nombre: string;
  nivel: string;
  catedra: string;
  ayudantia: string;
  sala: string;
  fechaInicio: string;
  fechaTermino: string;
}

/**
 * Returns an array of unique nivel values that appear in Lista Final Curso
 * and have at least one unnotified student row.
 * Called by DialogSalas.html on load via google.script.run.
 * @returns {string[]} Sorted list of active level names.
 */
function getNivelesActivos(): string[] {
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) throw new Error(`Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`);

  const datos = hoja.getDataRange().getValues();
  const headers = datos[0] as string[];
  const rows = datos.slice(1);

  const idxNivel = headers.indexOf("Nivel");
  const idxNotif = headers.indexOf(CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);

  const niveles = new Set<string>();
  rows.forEach(row => {
    const nivel = String(row[idxNivel]).trim();
    if (!nivel || nivel.startsWith("CATEGORÍA:") || nivel === "PRUEBA DE NIVEL") return;
    const notif = idxNotif !== -1 ? String(row[idxNotif]).trim() : "";
    if (notif !== "") return; // already notified — skip for active level detection
    niveles.add(nivel);
  });

  return Array.from(niveles).sort();
}

/**
 * Validates the sala mapping, stores sala values in-memory via PROGRAM_DATA.HORARIOS,
 * and returns a human-readable confirmation string for the dialog's preview step.
 * Throws if any active level is missing a sala value.
 * @param salas - Object mapping nivel → sala string entered by admin in the dialog.
 * @returns {string} Preview text describing what will be sent.
 */
function guardarSalasYObtenerPreview(salas: Record<string, string>): string {
  const nivelesActivos = getNivelesActivos();

  // Validate: reject empty sala for any level that has unnotified recipients
  const missing = nivelesActivos.filter(n => !salas[n] || salas[n].trim() === "");
  if (missing.length > 0) {
    throw new Error(`Sala vacía para: ${missing.join(", ")}. Ingresa sala para todos los niveles activos.`);
  }

  // Store in-memory (transient — valid only for this GAS execution)
  nivelesActivos.forEach(nivel => {
    if (PROGRAM_DATA.HORARIOS[nivel]) {
      (PROGRAM_DATA.HORARIOS[nivel] as any).sala = salas[nivel].trim();
    }
  });

  // Build preview string
  const destinatarios = getRecipientsInicioClases();
  const resumen = nivelesActivos
    .map(n => {
      const horario = PROGRAM_DATA.HORARIOS[n];
      const count = destinatarios.filter(r => r.nivel === n).length;
      return `${n}: Sala "${salas[n].trim()}" · ${horario ? horario.catedra : "[Horario no definido]"} · ${count} estudiante(s)`;
    })
    .join("\n");

  return `Se enviarán ${destinatarios.length} correos de inicio de clases.\n\n${resumen}`;
}

/**
 * Reads Lista Final Curso and returns all unnotified, non-header student rows.
 * Used internally by guardarSalasYObtenerPreview and enviarCorreosInicioClases.
 * @returns {IInicioClasesRecipient[]}
 */
function getRecipientsInicioClases(): IInicioClasesRecipient[] {
  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) throw new Error(`Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`);

  const datos = hoja.getDataRange().getValues();
  const headers = datos[0] as string[];
  const rows = datos.slice(1);

  const idxApellido = headers.indexOf("Apellido(s)");
  const idxNombre   = headers.indexOf("Nombre(s)");
  const idxCorreo   = headers.indexOf("Correo");
  const idxNivel    = headers.indexOf("Nivel");
  const idxNotif    = headers.indexOf(CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);

  const recipients: IInicioClasesRecipient[] = [];
  rows.forEach((row, i) => {
    const nivel = String(row[idxNivel]).trim();
    // Skip category headers, PRUEBA DE NIVEL rows, and empty rows
    if (!nivel || nivel.startsWith("CATEGORÍA:") || nivel === "PRUEBA DE NIVEL") return;
    // Idempotency: skip already-notified students
    if (idxNotif !== -1 && row[idxNotif] !== "" && row[idxNotif] !== null && row[idxNotif] !== undefined) return;

    recipients.push({
      rowNum: i + 2, // +1 for header, +1 for 0-index → 1-index
      apellido: String(row[idxApellido]),
      nombre:   String(row[idxNombre]),
      email:    String(row[idxCorreo]),
      nivel,
    });
  });

  return recipients;
}

/**
 * Renders the CorreoInicioClases.html template with the given variables.
 * @param vars - Typed variable set for the template.
 * @returns {string} Evaluated HTML string ready for GmailApp.sendEmail.
 */
function renderCorreoInicioClases(vars: ICorreoInicioClasesVars): string {
  const tpl = HtmlService.createTemplateFromFile('CorreoInicioClases');
  (tpl as any).nombre      = vars.nombre;
  (tpl as any).nivel       = vars.nivel;
  (tpl as any).catedra     = vars.catedra;
  (tpl as any).ayudantia   = vars.ayudantia;
  (tpl as any).sala        = vars.sala;
  (tpl as any).fechaInicio = vars.fechaInicio;
  (tpl as any).fechaTermino = vars.fechaTermino;
  return tpl.evaluate().getContent();
}

/**
 * Main send function. Iterates Lista Final Curso and sends class-start emails
 * to all unnotified confirmed students.
 * On successful send: writes sala to CONFIG.COLUMNS.SALA column and
 * writes current date to CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE column.
 * Requires guardarSalasYObtenerPreview() to have been called in the same
 * GAS execution (sala values live in PROGRAM_DATA.HORARIOS[nivel].sala).
 * @param asDraft - If true, creates Gmail drafts instead of sending emails.
 * @param limit - If > 0, limits the number of recipients processed (for sample/muestra mode).
 * @returns {string} Status message for the dialog UI.
 */
function enviarCorreosInicioClases(salas: Record<string, string>, asDraft: boolean = false, limit: number = 0): string {
  cargarConfiguracionDesdeHoja();
  let recipients = getRecipientsInicioClases();
  if (recipients.length === 0) return "No hay estudiantes pendientes de notificación de inicio de clases.";

  if (limit > 0) {
    recipients = recipients.slice(0, limit);
  }

  // Quota check — same pattern as sendEmailBatch in Correos.ts
  const quota = MailApp.getRemainingDailyQuota();
  if (quota < recipients.length) {
    return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y quieres enviar ${recipients.length}.`;
  }

  const ss = getSpreadsheet();
  const hoja = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) return `ERROR: Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`;

  const headers = hoja.getDataRange().getValues()[0] as string[];
  const idxNotif = headers.indexOf(CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);
  const idxSala  = headers.indexOf(CONFIG.COLUMNS.SALA);

  const subject = "Inicio de Clases — Programa PUCV2English";
  let count = 0;
  const errores: string[] = [];

  recipients.forEach(r => {
    try {
      const horario = PROGRAM_DATA.HORARIOS[r.nivel] || PROGRAM_DATA.HORARIOS["Default"];
      let sala = salas && salas[r.nivel] ? salas[r.nivel].trim() : undefined;
      if (!sala) {
        sala = (horario as any).sala as string | undefined;
      }

      if (!sala || sala.trim() === "") {
        throw new Error(`Sala no ingresada para nivel ${r.nivel}. Ejecuta el diálogo de inicio de clases antes de llamar enviarCorreosInicioClases().`);
      }

      const htmlBody = renderCorreoInicioClases({
        nombre:      `${r.nombre} ${r.apellido}`,
        nivel:       r.nivel,
        catedra:     horario ? horario.catedra : "[Horario por confirmar]",
        ayudantia:   horario ? horario.ayudantia : "[Horario por confirmar]",
        sala:        sala,
        fechaInicio: PROGRAM_DATA.FECHA_INICIO,
        fechaTermino: PROGRAM_DATA.FECHA_TERMINO,
      });

      if (asDraft) {
        GmailApp.createDraft(r.email, subject, "", { htmlBody });
      } else {
        GmailApp.sendEmail(r.email, subject, "", { htmlBody });

        // Write sala and notification timestamp only after successful send
        if (idxSala !== -1) {
          hoja.getRange(r.rowNum, idxSala + 1).setValue(sala);
        }
        if (idxNotif !== -1) {
          hoja.getRange(r.rowNum, idxNotif + 1).setValue(new Date());
        }
      }

      count++;
    } catch (e: any) {
      logToWebApp(`Error enviando inicio de clases a ${r.email}: ${e.message}`);
      errores.push(`[${r.email}]: ${e.message}`);
    }
  });

  const verb = asDraft ? "crearon" : "enviaron";
  const noun = asDraft ? "borradores" : "correos";
  const sampleNote = limit > 0 ? ` (muestra limitada a ${limit})` : "";
  if (errores.length > 0) {
    return `Se ${verb} ${count} ${noun} de inicio de clases${sampleNote}.\n\nHubo ${errores.length} error(es):\n${errores.slice(0, 3).join("\n")}`;
  }

  return `Se ${verb} ${count} ${noun} de inicio de clases exitosamente${sampleNote}.`;
}

/**
 * Sends a single test email to the admin with dummy class-start data.
 * Follows the TEST_AUTOSEND pattern from Placement.ts.
 * @returns {string} Status message for the dialog UI.
 */
function sendTestInicioClases(): string {
  cargarConfiguracionDesdeHoja();
  const adminEmail = Session.getActiveUser().getEmail();
  if (!adminEmail) throw new Error("No se pudo detectar el correo del administrador. Verifica tu cuenta de Google.");

  const horario = PROGRAM_DATA.HORARIOS["B2.1"] || PROGRAM_DATA.HORARIOS["Default"];
  const htmlBody = renderCorreoInicioClases({
    nombre: "Administrador de Prueba",
    nivel: "B2.1",
    catedra: horario ? horario.catedra : "Lunes y Miércoles 14:30 - 16:00",
    ayudantia: horario ? horario.ayudantia : "Viernes 14:30 - 16:00",
    sala: "Sala 2-3 (Casa Central) [PRUEBA]",
    fechaInicio: PROGRAM_DATA.FECHA_INICIO || "Lunes, 30 de Marzo",
    fechaTermino: PROGRAM_DATA.FECHA_TERMINO || "Viernes, 10 de Julio",
  });

  const subject = "[PRUEBA SANDBOX] Inicio de Clases — PUCV2English";
  GmailApp.sendEmail(adminEmail, subject, "", { htmlBody });

  return `✅ Correo de prueba de inicio de clases enviado a ${adminEmail}. Revisa tu bandeja de entrada.`;
}
