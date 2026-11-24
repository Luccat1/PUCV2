/**
 * @file Utils.ts
 * Shared utility functions for spreadsheet manipulation, logging, and data normalization.
 */

/**
 * Returns the active spreadsheet (container-bound).
 * Falls back to CONFIG.SHEET_ID if not container-bound (optional, for standalone use).
 */
function getSpreadsheet_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // If not container-bound, you might need a fallback or throw error
    throw new Error("No se pudo obtener la hoja de cálculo activa. Asegúrate de que el script esté vinculado.");
  }
}

/**
 * Normalizes a type string and checks if it belongs to a student profile.
 * @param tipoPostulante The raw string from the form.
 */
function esEstudiante_(tipoPostulante: string): boolean {
  const tipoNormalizado = String(tipoPostulante || "").toLowerCase();
  return /estudiante|alumno/.test(tipoNormalizado) && !/postgrado|posgrado/.test(tipoNormalizado);
}

/**
 * Mensaje legible de un error capturado (en TypeScript el `catch` entrega `unknown`).
 */
function mensajeError_(e: unknown): string {
  if (typeof e === "object" && e !== null && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/** Hoja leída completa: encabezados, filas (sin cabecera) y búsqueda de columnas por nombre. */
interface IHojaLeida {
  hoja: GoogleAppsScript.Spreadsheet.Sheet;
  nombre: string;
  headers: string[];
  /** Filas de datos; la fila i está en la hoja en la posición i + 2. */
  filas: any[][];
  /** Índice 0-based de la columna. Lanza un error claro si no existe, en vez de devolver -1 y fallar en silencio. */
  col(encabezado: string): number;
  /** Índice 0-based o -1, para columnas que pueden faltar. */
  colOpc(encabezado: string): number;
}

/**
 * Lee una hoja completa. Lanza si la hoja no existe.
 * Usar `h.col(HEADERS.X)` para las columnas obligatorias y `h.colOpc(...)` solo para las opcionales.
 */
function leerHoja_(nombre: string): IHojaLeida {
  const hoja = getSpreadsheet_().getSheetByName(nombre);
  if (!hoja) throw new Error(`Hoja ${nombre} no encontrada.`);
  const datos = hoja.getDataRange().getValues();
  const headers = (datos.shift() || []).map(h => String(h).trim());
  return {
    hoja, nombre, headers, filas: datos,
    col(encabezado: string): number {
      const i = headers.indexOf(encabezado);
      if (i === -1) throw new Error(`Falta la columna "${encabezado}" en la hoja "${nombre}".`);
      return i;
    },
    colOpc: (encabezado: string) => headers.indexOf(encabezado)
  };
}

/**
 * Evalúa un fragmento HTML compartido (estilos, cabecera, pie de los correos).
 * Uso dentro de una plantilla: <?!= incluir_('CorreoBase_Pie') ?>
 * `nota` (HTML opcional) es la única variable que reciben los fragmentos.
 */
function incluir_(nombre: string, vars: Record<string, unknown> = {}): string {
  const tpl = HtmlService.createTemplateFromFile(nombre);
  Object.assign(tpl, { nota: "" }, vars);
  return tpl.evaluate().getContent();
}

/**
 * Evalúa una plantilla de correo con las variables dadas y devuelve el HTML final.
 */
function renderPlantilla_(nombre: string, vars: Record<string, unknown>): string {
  const tpl = HtmlService.createTemplateFromFile(nombre);
  Object.assign(tpl, vars);
  return tpl.evaluate().getContent();
}

/**
 * Alumni (egresados) reciben puntaje 0: menor prioridad entre los postulantes.
 */
function esAlumni_(tipoPostulante: string): boolean {
  return /alumni/i.test(String(tipoPostulante || ""));
}

/**
 * Académicos y funcionarios: los únicos a quienes aplican "Uso del inglés" y el respaldo de jefatura
 * (bases n.º 7.2). Los estudiantes de postgrado cuentan como estudiantes.
 */
function esAcademicoOFuncionario_(tipoPostulante: string): boolean {
  return /acad[eé]mico|funcionario/i.test(String(tipoPostulante || "")) && !/postgrado|posgrado/i.test(String(tipoPostulante || ""));
}

/**
 * Orden de preferencia en caso de empate total (bases n.º 7.5):
 * académicos y postgrado, luego funcionarios, luego pregrado, luego alumni.
 */
function rangoDesempate_(tipoPostulante: string): number {
  const t = String(tipoPostulante || "");
  if (esAlumni_(t)) return 3;
  if (/postgrado|posgrado|acad[eé]mico/i.test(t)) return 0;
  if (/funcionario/i.test(t)) return 1;
  return 2;
}

/**
 * Comparador de postulantes: puntaje (desc), categoría de desempate (n.º 7.5) y fecha de postulación (asc).
 */
function compararPostulantes_(a: any[], b: any[], idxTotal: number, idxCat: number, idxFecha: number): number {
  const dif = parseFloat(b[idxTotal] || 0) - parseFloat(a[idxTotal] || 0);
  if (dif) return dif;
  const rango = rangoDesempate_(a[idxCat]) - rangoDesempate_(b[idxCat]);
  if (rango) return rango;
  return (new Date(a[idxFecha]).getTime() - new Date(b[idxFecha]).getTime()) || 0;
}

/**
 * Normaliza la marca temporal del formulario a Date para que la hoja la formatee y ordene bien.
 * Acepta Date o texto "dd/mm/aaaa hh:mm:ss"; si no se reconoce, devuelve el texto original.
 */
function normalizarFecha_(valor: unknown): Date | string {
  if (valor instanceof Date) return valor;
  const txt = String(valor || "").trim();
  const m = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return txt;
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

/**
 * Aplica formato dd/MM/yyyy HH:mm a la columna "Fecha de Postulación" de una hoja.
 */
function formatearColumnaFecha_(sheet: GoogleAppsScript.Spreadsheet.Sheet, headers: any[], filas: number): void {
  const col = headers.indexOf(HEADERS.APPLICATION_DATE) + 1;
  if (col > 0 && filas > 1) sheet.getRange(2, col, filas - 1, 1).setNumberFormat("dd/MM/yyyy HH:mm");
}

/**
 * Checks if a value string is an affirmative response ("Sí", "Si", etc.).
 * @param valor The raw string.
 */
function esSi_(valor: unknown): boolean {
  return /^s[íi]$/i.test(String(valor || "").trim());
}

/**
 * Retrieves a value from a row using its column header name.
 * @param fila The data row array.
 * @param titulo The column header name.
 * @param indiceColumnas Mapping of header names to indices.
 */
function obtenerValor_(fila: any[], titulo: string, indiceColumnas: Record<string, number>): string {
  const i = indiceColumnas[String(titulo || "").trim()];
  if (i === undefined) {
    return "";
  }
  return String(fila[i] || "").trim();
}

/** Minúsculas y sin tildes, para comparar texto libre. */
function normalizarTexto_(texto: unknown): string {
  return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Stores a log message in user properties for the Web App to retrieve.
 * @param message The message to log.
 */
function logToWebApp_(message: string): void {
  const lock = LockService.getUserLock();
  try {
    lock.waitLock(2000);
    const userProperties = PropertiesService.getUserProperties();
    let logs: string[] = JSON.parse(userProperties.getProperty('webAppLogs') || '[]');
    logs.push(`${new Date().toLocaleTimeString()} - ${message}`);
    if (logs.length > 100) {
      logs = logs.slice(-50);
    }
    userProperties.setProperty('webAppLogs', JSON.stringify(logs));
  } catch (e) {
    Logger.log("logToWebApp_ warning: " + mensajeError_(e));
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Retrieves and clears the stored log messages for the Web App.
 */
function getWebAppLogs(): string[] {
  const userProperties = PropertiesService.getUserProperties();
  const logs = userProperties.getProperty('webAppLogs');
  userProperties.deleteProperty('webAppLogs');
  return logs ? JSON.parse(logs) : [];
}

/**
 * Converts a column index (1-based) to its letter representation (e.g., 1 -> A, 27 -> AA).
 * @param columna The 1-based column index.
 */
function columnaALetra_(columna: number): string {
  let temp: number, letra = '';
  let col = columna;
  while (col > 0) {
    temp = (col - 1) % 26;
    letra = String.fromCharCode(temp + 65) + letra;
    col = (col - temp - 1) / 26;
  }
  return letra;
}
