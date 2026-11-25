/**
 * @file Correos.ts
 * Logic for sending batch and test emails using HTML templates.
 */

/**
 * Tipos de correo masivo. Para agregar uno: una entrada en CORREOS, su rama en getRecipients_()
 * y un ítem de menú. TypeScript falla si falta alguna entrada.
 * Solo texto y claves de CONFIG (no CONFIG directo): así no depende del orden en que Apps Script carga los archivos.
 */
type TipoCorreo = 'SELECTED' | 'TEST_LEVEL_ONLY' | 'HAND_PICKED' | 'WAITLIST' | 'WAITLIST_REJECTED' | 'NO_SELECTED' | 'CONTINUATION';

interface IDefCorreo {
  plantilla: string;
  asunto: string;
  asuntoPrueba: string;
  /** Clave de CONFIG.SHEETS de la hoja con los destinatarios y el sello de notificación. */
  hoja: keyof IConfig['SHEETS'];
  /** Clave de CONFIG.COLUMNS de la columna donde se sella la fecha de envío. */
  columnaSello: string;
  /** La plantilla trae los enlaces de aceptar y rechazar. */
  conToken: boolean;
  /** La plantilla o su confirmación de aceptación incluye el enlace de pago. */
  usaPago?: boolean;
}

const CORREOS: Record<TipoCorreo, IDefCorreo> = {
  SELECTED: {
    plantilla: 'CorreoSeleccionado', asunto: "Resultado de Postulación Programas de Inglés PUCV", asuntoPrueba: "[TEST] Resultado Postulación PUCV",
    hoja: 'SELECTED', columnaSello: 'NOTIFICATION_DATE', conToken: true, usaPago: true
  },
  TEST_LEVEL_ONLY: {
    plantilla: 'CorreoTestNivel', asunto: "Test de Nivel - Programas de Inglés PUCV", asuntoPrueba: "[TEST] Test de Nivel - PUCV",
    hoja: 'SELECTED', columnaSello: 'NOTIFICATION_DATE', conToken: true, usaPago: true
  },
  HAND_PICKED: {
    plantilla: 'CorreoHandPicked', asunto: "Cupo Disponible - Programas de Inglés PUCV", asuntoPrueba: "[TEST] Cupo Disponible - PUCV",
    hoja: 'SELECTED', columnaSello: 'NOTIFICATION_DATE', conToken: true, usaPago: true
  },
  WAITLIST: {
    plantilla: 'CorreoListaEspera', asunto: "Resultado de Postulación Programas de Inglés PUCV", asuntoPrueba: "[TEST] Lista de Espera - PUCV",
    hoja: 'WAITLIST', columnaSello: 'NOTIFICATION_DATE', conToken: false
  },
  WAITLIST_REJECTED: {
    plantilla: 'CorreoEsperaSinCupo', asunto: "Cierre de Proceso - Lista de Espera PUCV2English", asuntoPrueba: "[TEST] Cierre de Proceso - Lista de Espera PUCV2English",
    hoja: 'WAITLIST', columnaSello: 'CLOSURE_NOTIFICATION_DATE', conToken: false
  },
  NO_SELECTED: {
    plantilla: 'CorreoNoSeleccionado', asunto: "Resultado de Postulación Programas de Inglés PUCV", asuntoPrueba: "[TEST] Resultado de Postulación - PUCV",
    hoja: 'OUTPUT', columnaSello: 'REJECTION_NOTIFICATION_DATE', conToken: false
  },
  CONTINUATION: {
    plantilla: 'CorreoContinuacion', asunto: "Acceso Preferencial de Continuación - PUCV2English", asuntoPrueba: "[TEST] Acceso Preferencial de Continuación - PUCV",
    hoja: 'CONTINUATION', columnaSello: 'NOTIFICATION_DATE', conToken: true
  }
};

/** Correos que no son lotes de este módulo pero sí se prueban con sendTestEmail(). */
const CORREOS_PRUEBA_EXTRA: Record<string, { plantilla: string; asunto: string }> = {
  CONFIRM_ACCEPT: { plantilla: 'CorreoConfirmacionAcepta', asunto: "[TEST] Confirmación de Aceptación - PUCV" },
  CONFIRM_REJECT: { plantilla: 'CorreoConfirmacionRechaza', asunto: "[TEST] Confirmación de Liberación de Cupo - PUCV" },
  CLASS_START: { plantilla: 'CorreoInicioClases', asunto: "[TEST] Inicio de Clases - PUCV" },
  RECHAZO_NIVEL: { plantilla: 'CorreoRechazoPorNivel', asunto: "[TEST] Resultado de Prueba de Nivel - PUCV" }
};

interface IDestinatarioCorreo extends IDestinatarioLote {
  nombre: string;
  nivel?: string;
  cursoAnterior?: string;
  nivelSiguiente?: string | null;
}

/** Variables que usan casi todas las plantillas. */
function varsComunes_(): Record<string, unknown> {
  const plazo = calcularFechaLimite_(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
  return {
    programData: PROGRAM_DATA,
    fechaLimite: plazo,
    fechaPagoLimite: plazo,
    paymentUrl: PROGRAM_DATA.PAYMENT_URL || ""
  };
}

/** Enlaces de aceptar/rechazar para un token de postulante. */
function varsToken_(token: string): Record<string, string> {
  return {
    urlAceptar: obtenerUrlConfirmacionConToken_(token, 'accept'),
    urlRechazar: obtenerUrlConfirmacionConToken_(token, 'reject')
  };
}

/**
 * Retrieves recipients data based on type (SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED).
 */
/**
 * Retrieves recipients data based on type (SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED).
 * Implements Plan 3.2.
 */
function getRecipients_(type: TipoCorreo): IDestinatarioCorreo[] {
  if (type === 'SELECTED' || type === 'TEST_LEVEL_ONLY' || type === 'HAND_PICKED') {
    const h = leerHoja_(CONFIG.SHEETS.SELECTED);
    const cCorreo = h.col(HEADERS.EMAIL);
    const cNombre = h.col(HEADERS.FIRST_NAME);
    const cNivel = h.col(HEADERS.LEVEL_ASSIGNED);
    const cVerif = h.col(HEADERS.CERT_VERIFICATION);
    const cNotif = h.colOpc(HEADERS.NOTIFICATION_DATE); // si falta, sendEmailBatch la crea antes de enviar

    return h.filas.map((row, i) => ({
      rowNum: i + 2, // 1-indexed + header row
      nombre: row[cNombre],
      email: row[cCorreo],
      nivel: row[cNivel],
      verificacion: row[cVerif],
      notificado: cNotif === -1 ? "" : row[cNotif]
    })).filter(p => {
      // Idempotency: skip if already notified
      if (p.notificado && p.notificado !== "") return false;

      if (type === 'TEST_LEVEL_ONLY') return p.verificacion === 'Test de nivel';
      if (type === 'HAND_PICKED') return p.verificacion === 'Hand picked' || p.verificacion === 'Manual';
      return p.email && p.nombre && p.nivel && p.verificacion === 'Válido';
    });
  }

  if (type === 'WAITLIST' || type === 'WAITLIST_REJECTED') {
    const h = leerHoja_(CONFIG.SHEETS.WAITLIST);
    const cCorreo = h.col(HEADERS.EMAIL);
    const cNombre = h.col(HEADERS.FIRST_NAME);
    const cNivel = h.col(HEADERS.LEVEL_APPLIED);
    // WAITLIST sella "Fecha Notificación"; WAITLIST_REJECTED (cierre sin cupo) sella "Fecha Notificación Cierre"
    const cNotif = h.col(type === 'WAITLIST' ? HEADERS.NOTIFICATION_DATE : HEADERS.CLOSURE_NOTIFICATION_DATE);

    return h.filas.map((row, i) => ({
      rowNum: i + 2, // 1-indexed + header row
      nombre: row[cNombre],
      email: row[cCorreo],
      nivel: row[cNivel],
      notificado: row[cNotif]
    })).filter(p => {
      // Idempotency: skip if already notified
      return p.email && p.nombre && p.nivel && (!p.notificado || p.notificado === "");
    });
  }

  if (type === 'NO_SELECTED') {
    const salida = leerHoja_(CONFIG.SHEETS.OUTPUT);
    const cCorreo = salida.col(HEADERS.EMAIL);
    const cNombre = salida.col(HEADERS.FIRST_NAME);
    const cNivel = salida.col(HEADERS.LEVEL_APPLIED);
    const cRechazo = salida.colOpc(HEADERS.REJECTION_NOTIFICATION_DATE); // si falta, sendEmailBatch la crea antes de enviar

    // Excluye a quienes ya están seleccionados o en lista de espera
    const correosDe = (nombreHoja: string): Set<string> => {
      const h = leerHoja_(nombreHoja);
      const c = h.col(HEADERS.EMAIL);
      return new Set(h.filas.map(row => String(row[c]).trim().toLowerCase()));
    };
    const emailsSelected = correosDe(CONFIG.SHEETS.SELECTED);
    const emailsWaitlist = correosDe(CONFIG.SHEETS.WAITLIST);

    return salida.filas
      .map((row, i) => ({
        rowNum: i + 2,
        nombre: row[cNombre],
        email: row[cCorreo],
        nivel: row[cNivel],
        notificado: cRechazo === -1 ? "" : row[cRechazo]
      }))
      .filter(p => {
        const email = String(p.email || "").trim().toLowerCase();
        return email &&
          !emailsSelected.has(email) &&
          !emailsWaitlist.has(email) &&
          (!p.notificado || p.notificado === "");
      });
  }

  if (type === 'CONTINUATION') {
    const h = leerHoja_(CONFIG.SHEETS.CONTINUATION);
    const cName = h.col("Name");
    const cSurname = h.col("Surname");
    const cCurso = h.col("Curso");
    const cAsistencia = h.col("Asistencia");
    const cPromedio = h.col("Promedio Final");
    const cEmail = h.colOpc("Email") !== -1 ? h.colOpc("Email") : h.colOpc(HEADERS.EMAIL);
    const cNotif = h.colOpc(HEADERS.NOTIFICATION_DATE);

    return h.filas.map((row, i) => {
      const cursoRaw = String(row[cCurso]).trim();
      const cursoMatch = cursoRaw.match(/^(B1\+|B2\.1|B2\.2|C1)/i);
      const cursoNivel = cursoMatch ? cursoMatch[1] : cursoRaw.split(' ')[0];

      const asistenciaRaw = String(row[cAsistencia]).replace(',', '.');
      const asistencia = parseFloat(asistenciaRaw) || 0;

      const promedioRaw = String(row[cPromedio]).replace(',', '.');
      const promedio = parseFloat(promedioRaw) || 0;

      const nivelSiguiente = CONTINUATION_MAP[cursoNivel] || null;

      return {
        rowNum: i + 2,
        nombre: `${row[cName]} ${row[cSurname]}`.trim(),
        email: cEmail !== -1 ? String(row[cEmail]).trim() : '',
        cursoAnterior: cursoNivel,
        nivelSiguiente: nivelSiguiente,
        asistencia: asistencia,
        promedio: promedio,
        notificado: cNotif !== -1 ? row[cNotif] : ''
      };
    }).filter(p => {
      if (p.notificado && p.notificado !== '') return false;
      if (!p.email) return false;
      if (!p.nivelSiguiente) return false;
      if (p.asistencia < CONTINUATION_MIN_ATTENDANCE) return false;
      if (p.promedio < CONTINUATION_MIN_GRADE) return false;
      return true;
    });
  }

  throw new Error(`Tipo de correo desconocido: ${type}`);
}

/**
 * Returns a preview string for the batch.
 */
function previewEmailBatch(type: TipoCorreo): string {
  const recipients = getRecipients_(type);
  if (recipients.length === 0) return "No hay destinatarios que cumplan los requisitos para el envío de '" + type + "'.";
  return `Se enviarán ${recipients.length} correos de tipo '${type}'. Destinatarios: ${recipients.map(r => r.email).join(', ')}`;
}

/**
 * Envía un lote de correos del tipo dado y sella "Fecha Notificación" en cada envío real.
 * @param type Tipo de correo (clave de CORREOS).
 * @param asDraft Crea borradores de Gmail en vez de enviar.
 * @param limit Si es > 0, procesa solo los primeros N (muestra).
 * @returns Mensaje para la UI.
 */
function sendEmailBatch(type: TipoCorreo, asDraft: boolean = false, limit: number = 0): string {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return "No se pudo iniciar el envío. Otra operación está en curso.";
  }

  try {
    cargarConfiguracionDesdeHoja_();
    limpiarTokensVencidos();
    const recipients = getRecipients_(type);
    if (recipients.length === 0) return "No hay destinatarios pendientes para enviar '" + type + "'.";

    const def = CORREOS[type];
    if (def.usaPago && (!PROGRAM_DATA.PAYMENT_URL || PROGRAM_DATA.PAYMENT_URL === DEFAULT_PAYMENT_URL)) {
      return "ERROR: Configura PAYMENT_URL en la hoja Configuración antes de enviar correos con enlace de pago.";
    }
    if (type === 'TEST_LEVEL_ONLY' && (!PROGRAM_DATA.TEST_FECHA || !PROGRAM_DATA.TEST_INSTRUCCIONES_FECHA)) {
      return "ERROR: Configura TEST_FECHA y TEST_INSTRUCCIONES_FECHA en la hoja Configuración antes de enviar el correo de test de nivel.";
    }
    const lote = limit > 0 ? recipients.slice(0, limit) : recipients;
    const hojaSello = getSpreadsheet_().getSheetByName(CONFIG.SHEETS[def.hoja]);
    if (!hojaSello) return `ERROR: Hoja ${CONFIG.SHEETS[def.hoja]} no encontrada.`;

    // Si la plantilla lleva enlaces, falla una sola vez y antes de crear tokens (no una vez por destinatario)
    if (def.conToken) {
      try { urlBaseWebApp_(); } catch (e) { return "ERROR: " + mensajeError_(e); }
    }

    // Todos los tokens de aceptar/rechazar en una sola escritura a Script Properties
    const tokens: Record<string, string> = def.conToken ? generarTokensBatch_(lote.map(r => r.email)) : {};

    return enviarLote_({
      etiqueta: `tipo '${type}'`,
      destinatarios: lote,
      asunto: def.asunto,
      html: r => renderPlantilla_(def.plantilla, {
        ...varsComunes_(),
        nombre: r.nombre,
        nivel: r.nivel,
        cursoAnterior: r.cursoAnterior,
        nivelSiguiente: r.nivelSiguiente,
        ...(def.conToken ? varsToken_(tokens[r.email] || generarToken_(r.email)) : {})
      }),
      hojaSello,
      columnaSello: asegurarColumna_(hojaSello, CONFIG.COLUMNS[def.columnaSello]),
      asBorrador: asDraft,
      limite: limit
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sends a targeted notification email to a single selected/promoted candidate.
 * Prevents mass accidental emailing to unnotified candidates in Seleccionados.
 */
function enviarCorreoIndividualSeleccionado_(email: string, nombre: string, nivel: string, rowNum?: number): boolean {
  try {
    cargarConfiguracionDesdeHoja_();
    const def = CORREOS.SELECTED;
    const hoja = getSpreadsheet_().getSheetByName(CONFIG.SHEETS.SELECTED);

    const resultado = enviarLote_({
      etiqueta: "aviso a candidato promovido",
      destinatarios: [{ email, rowNum: rowNum || 0 }],
      asunto: def.asunto,
      html: () => renderPlantilla_(def.plantilla, { ...varsComunes_(), ...varsToken_(generarToken_(email)), nombre, nivel }),
      hojaSello: hoja,
      columnaSello: hoja && rowNum ? asegurarColumna_(hoja, CONFIG.COLUMNS.NOTIFICATION_DATE) : 0
    });
    logToWebApp_(resultado);
    return !resultado.startsWith("ERROR:") && !resultado.includes("Hubo ");
  } catch (e) {
    logToWebApp_(`Error enviando aviso individual a ${email}: ${mensajeError_(e)}`);
    return false;
  }
}


/**
 * Sends a single test email.
 * @param type Clave de CORREOS, de CORREOS_PRUEBA_EXTRA, 'CADENA_COMPLETA' (todos) o el nombre de una plantilla "Correo...".
 */
function sendTestEmail(targetEmail: string, type: string): string {
  try {
    cargarConfiguracionDesdeHoja_();
    if (type === 'CADENA_COMPLETA') {
      const tipos = [...Object.keys(CORREOS), ...Object.keys(CORREOS_PRUEBA_EXTRA)];
      tipos.forEach(t => sendTestEmail(targetEmail, t));
      return `Cadena completa de ${tipos.length} correos de prueba enviada a ${targetEmail}`;
    }

    if (type === 'NOT_SELECTED') type = 'NO_SELECTED'; // nombre antiguo que aún usa el panel web
    const lote = CORREOS[type as TipoCorreo];
    const def = lote ? { plantilla: lote.plantilla, asunto: lote.asuntoPrueba } : CORREOS_PRUEBA_EXTRA[type]
      || (type && type.startsWith('Correo') ? { plantilla: type, asunto: "[TEST] " + type } : null);
    if (!def) return `Error en test: tipo de correo desconocido '${type}'`;

    // Datos de ejemplo para todas las plantillas (las que no los usan los ignoran)
    const horario = PROGRAM_DATA.HORARIOS["B2.1"] || PROGRAM_DATA.HORARIOS["Default"];
    const html = renderPlantilla_(def.plantilla, {
      ...varsComunes_(),
      ...varsToken_(generarToken_(targetEmail)),
      nombre: "Usuario de Prueba",
      nivel: "B2.1",
      cursoAnterior: "B1+",
      nivelSiguiente: "B2.1",
      catedra: horario ? horario.catedra : "Lunes y Miércoles 14:30 - 16:00",
      ayudantia: horario ? horario.ayudantia : "Viernes 14:30 - 16:00",
      sala: "Sala 2-3 (Casa Central)",
      fechaInicio: PROGRAM_DATA.FECHA_INICIO || "Lunes, 30 de Marzo",
      fechaTermino: PROGRAM_DATA.FECHA_TERMINO || "Viernes, 10 de Julio"
    });

    GmailApp.sendEmail(targetEmail, def.asunto, "", { htmlBody: html });
    return `Correo de prueba (${def.plantilla}) enviado a ${targetEmail}`;
  } catch (e) {
    return `Error en test: ${mensajeError_(e)}`;
  }
}

/**
 * Calculates a future limit date.
 */
function calcularFechaLimite_(fechaInicio: Date, dias: number): string {
  const tz = PROGRAM_DATA.TIMEZONE || "America/Santiago";
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(fechaInicio);

  const partMap: Record<string, number> = {};
  parts.forEach(p => {
    if (p.type !== 'literal') partMap[p.type] = parseInt(p.value, 10);
  });

  const fechaLimite = new Date(Date.UTC(partMap.year, partMap.month - 1, partMap.day + dias, 12, 0, 0));
  const opciones: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  const str = fechaLimite.toLocaleDateString('es-ES', opciones);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Sends a confirmation email to the applicant after they accept/reject their spot.
 */
function enviarCorreoConfirmacion_(correo: string, tipoConfirmacion: 'accept' | 'reject'): void {
  cargarConfiguracionDesdeHoja_();
  const templateName = tipoConfirmacion === 'accept' ? 'CorreoConfirmacionAcepta' : 'CorreoConfirmacionRechaza';
  const subject = tipoConfirmacion === 'accept' ?
    "Confirmación de Aceptación y Pago - PUCV2English" :
    "Confirmación de Liberación de Cupo - PUCV2English";

  try {
    const h = leerHoja_(CONFIG.SHEETS.SELECTED);
    const cCorreo = h.col(HEADERS.EMAIL);
    const cNombre = h.col(HEADERS.FIRST_NAME);
    const cNivel = h.col(HEADERS.LEVEL_ASSIGNED);

    const candidateRow = h.filas.find(f => String(f[cCorreo]).trim().toLowerCase() === correo.trim().toLowerCase());
    if (!candidateRow) {
      logToWebApp_(`No se encontró candidato para enviar confirmación a ${correo}`);
      return;
    }

    const html = renderPlantilla_(templateName, { ...varsComunes_(), nombre: candidateRow[cNombre], nivel: candidateRow[cNivel] || "B1+" });

    GmailApp.sendEmail(correo, subject, "", {
      htmlBody: html
    });

    logToWebApp_(`Correo de confirmación (${tipoConfirmacion}) enviado a ${correo}`);
  } catch (e) {
    logToWebApp_(`Error enviando correo de confirmación a ${correo}: ${mensajeError_(e)}`);
  }
}
