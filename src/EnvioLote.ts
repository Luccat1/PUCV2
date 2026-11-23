/**
 * @file EnvioLote.ts
 * Envío de correos por lote compartido por Correos, InicioClases y RechazoPorNivel:
 * cuota, modo borrador, límite de muestra, try/catch por destinatario y sello de fecha.
 */

/** Destinatario mínimo de un lote. rowNum = fila 1-based donde se escribe el sello de notificación. */
interface IDestinatarioLote {
  email: string;
  rowNum: number;
}

interface IOpcionesLote<T extends IDestinatarioLote> {
  /** Texto para el mensaje final: "Se enviaron 3 correos de <etiqueta>". */
  etiqueta: string;
  destinatarios: T[];
  asunto: string;
  /** Devuelve el HTML ya evaluado para ese destinatario. */
  html: (r: T) => string;
  /** Hoja y columna (1-based) donde se sella la fecha tras un envío real. Sin columna no se sella. */
  hojaSello?: GoogleAppsScript.Spreadsheet.Sheet | null;
  columnaSello?: number;
  /** Escrituras extra tras un envío real exitoso (por ejemplo, guardar la sala). */
  alEnviar?: (r: T) => void;
  remitente?: string;
  asBorrador?: boolean;
  /** Si es > 0, procesa solo los primeros N (modo muestra). */
  limite?: number;
  /** Tiempo máximo de la ejecución en ms; al pasarlo se detiene y avisa cuántos quedan. Por defecto 5 min (el tope de Apps Script es 6). */
  maxMs?: number;
}

/** Tiempo tras el cual un envío se detiene solo (Apps Script corta cada ejecución a los 6 minutos). */
const MAX_MS_ENVIO = 5 * 60 * 1000;

/**
 * Envía (o crea borradores de) un lote de correos y devuelve el mensaje para la UI.
 * El sello de fecha solo se escribe en envíos reales: es lo que evita reenviar al volver a ejecutar.
 */
function enviarLote_<T extends IDestinatarioLote>(o: IOpcionesLote<T>): string {
  const limite = o.limite && o.limite > 0 ? o.limite : 0;
  const lista = limite ? o.destinatarios.slice(0, limite) : o.destinatarios;
  const borrador = !!o.asBorrador;

  // Los borradores no consumen cuota de envío
  if (!borrador) {
    const cuota = MailApp.getRemainingDailyQuota();
    if (cuota < lista.length) {
      return `ERROR: Cuota de Gmail insuficiente. Te quedan ${cuota} envíos y quieres enviar ${lista.length}.`;
    }
  }

  const opciones: { name?: string } = o.remitente ? { name: o.remitente } : {};
  const inicio = Date.now();
  const maxMs = o.maxMs ?? MAX_MS_ENVIO;
  let procesados = 0;
  let enviados = 0;
  const errores: string[] = [];

  for (const r of lista) {
    if (Date.now() - inicio > maxMs) break;
    procesados++;
    try {
      const htmlBody = o.html(r);
      if (borrador) {
        GmailApp.createDraft(r.email, o.asunto, "", { htmlBody, ...opciones });
      } else {
        GmailApp.sendEmail(r.email, o.asunto, "", { htmlBody, ...opciones });
        if (o.hojaSello && o.columnaSello && o.columnaSello > 0) {
          o.hojaSello.getRange(r.rowNum, o.columnaSello).setValue(new Date());
        }
        if (o.alEnviar) o.alEnviar(r);
      }
      enviados++;
    } catch (e) {
      logToWebApp_(`Error enviando a ${r.email}: ${mensajeError_(e)}`);
      errores.push(`[${r.email}]: ${mensajeError_(e)}`);
    }
  }

  const verbo = borrador ? "crearon" : "enviaron";
  const sustantivo = borrador ? "borradores" : "correos";
  const muestra = limite ? ` (muestra limitada a ${limite})` : "";
  let mensaje = `Se ${verbo} ${enviados} ${sustantivo} de ${o.etiqueta}${muestra}.`;
  if (errores.length > 0) {
    mensaje += `\n\nHubo ${errores.length} error(es):\n${errores.slice(0, 3).join("\n")}`;
  }
  const pendientes = lista.length - procesados;
  if (pendientes > 0) {
    mensaje += `\n\n⏱ Se detuvo por tiempo: quedan ${pendientes} pendientes. ${borrador ? "Los borradores no se marcan: usa la muestra de 5 o crea menos a la vez." : "Vuelve a ejecutar el mismo envío; los ya enviados no se repiten."}`;
  }
  return mensaje;
}

/**
 * Devuelve la columna (1-based) con ese encabezado; si no existe, la crea al final.
 * Sin esta columna no habría sello y un reenvío duplicaría los correos.
 */
function asegurarColumna_(hoja: GoogleAppsScript.Spreadsheet.Sheet, encabezado: string): number {
  const ultima = hoja.getLastColumn();
  const headers = ultima > 0 ? hoja.getRange(1, 1, 1, ultima).getValues()[0] : [];
  const idx = headers.map(h => String(h).trim()).indexOf(encabezado);
  if (idx !== -1) return idx + 1;
  hoja.getRange(1, ultima + 1).setValue(encabezado);
  return ultima + 1;
}
