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
  const ss = getSpreadsheet_();
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
 * Validates the sala mapping and returns a human-readable confirmation string for the dialog's preview step.
 * No guarda nada: las salas viajan en el parámetro de enviarCorreosInicioClases() (cada llamada del diálogo es otra ejecución).
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


  // Build preview string
  const destinatarios = getRecipientsInicioClases_();
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
function getRecipientsInicioClases_(): IInicioClasesRecipient[] {
  const ss = getSpreadsheet_();
  const hoja = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) throw new Error(`Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`);

  const datos = hoja.getDataRange().getValues();
  const headers = datos[0] as string[];
  const rows = datos.slice(1);

  const idxApellido = headers.indexOf(HEADERS.LAST_NAME);
  const idxNombre   = headers.indexOf(HEADERS.FIRST_NAME);
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
function renderCorreoInicioClases_(vars: ICorreoInicioClasesVars): string {
  return renderPlantilla_('CorreoInicioClases', { ...vars });
}

/**
 * Main send function. Iterates Lista Final Curso and sends class-start emails
 * to all unnotified confirmed students.
 * On successful send: writes sala to CONFIG.COLUMNS.SALA column and
 * writes current date to CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE column.
 * @param salas - Mapa nivel → sala ingresado en el diálogo; es obligatorio para todos los niveles con destinatarios.
 * @param asDraft - If true, creates Gmail drafts instead of sending emails.
 * @param limit - If > 0, limits the number of recipients processed (for sample/muestra mode).
 * @returns {string} Status message for the dialog UI.
 */
function enviarCorreosInicioClases(salas: Record<string, string>, asDraft: boolean = false, limit: number = 0): string {
  cargarConfiguracionDesdeHoja_();
  const recipients = getRecipientsInicioClases_();
  if (recipients.length === 0) return "No hay estudiantes pendientes de notificación de inicio de clases.";

  const hoja = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.FINAL_LIST);
  if (!hoja) return `ERROR: Hoja ${CONFIG.SHEETS.FINAL_LIST} no encontrada.`;

  const colNotif = asegurarColumna_(hoja, CONFIG.COLUMNS.INICIO_NOTIFICATION_DATE);
  const colSala = asegurarColumna_(hoja, CONFIG.COLUMNS.SALA);

  const horarioDe = (nivel: string) => PROGRAM_DATA.HORARIOS[nivel] || PROGRAM_DATA.HORARIOS["Default"];
  const salaDe = (r: IInicioClasesRecipient): string => {
    const sala = salas && salas[r.nivel] ? salas[r.nivel].trim() : "";
    if (!sala) {
      throw new Error(`Sala no ingresada para nivel ${r.nivel}. Ejecuta el diálogo de inicio de clases antes de llamar enviarCorreosInicioClases().`);
    }
    return sala;
  };

  return enviarLote_({
    etiqueta: "inicio de clases",
    destinatarios: recipients,
    asunto: "Inicio de Clases — Programa PUCV2English",
    html: r => {
      const horario = horarioDe(r.nivel);
      return renderCorreoInicioClases_({
        nombre: `${r.nombre} ${r.apellido}`,
        nivel: r.nivel,
        catedra: horario ? horario.catedra : "[Horario por confirmar]",
        ayudantia: horario ? horario.ayudantia : "[Horario por confirmar]",
        sala: salaDe(r),
        fechaInicio: PROGRAM_DATA.FECHA_INICIO,
        fechaTermino: PROGRAM_DATA.FECHA_TERMINO
      });
    },
    hojaSello: hoja,
    columnaSello: colNotif,
    // La sala se guarda solo tras un envío exitoso, junto con el sello de fecha
    alEnviar: r => hoja.getRange(r.rowNum, colSala).setValue(salaDe(r)),
    asBorrador: asDraft,
    limite: limit
  });
}

/**
 * Sends a single test email to the admin with dummy class-start data.
 * Follows the TEST_AUTOSEND pattern from Placement.ts.
 * @returns {string} Status message for the dialog UI.
 */
function sendTestInicioClases(): string {
  cargarConfiguracionDesdeHoja_();
  const adminEmail = Session.getActiveUser().getEmail();
  if (!adminEmail) throw new Error("No se pudo detectar el correo del administrador. Verifica tu cuenta de Google.");

  const horario = PROGRAM_DATA.HORARIOS["B2.1"] || PROGRAM_DATA.HORARIOS["Default"];
  const htmlBody = renderCorreoInicioClases_({
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
