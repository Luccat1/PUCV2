/**
 * @file Utils.ts
 * Shared utility functions for spreadsheet manipulation, logging, and data normalization.
 */

/**
 * Returns the active spreadsheet (container-bound).
 * Falls back to CONFIG.SHEET_ID if not container-bound (optional, for standalone use).
 */
function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
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
function esEstudiante(tipoPostulante: string): boolean {
  const tipoNormalizado = String(tipoPostulante || "").toLowerCase();
  return /estudiante|alumno/.test(tipoNormalizado) && !/postgrado|posgrado/.test(tipoNormalizado);
}

/**
 * Checks if a value string starts with 's' (case insensitive), commonly used for "Sí" responses.
 * @param valor The raw string.
 */
function esSi(valor: any): boolean {
  return /^s/i.test(String(valor || "").trim());
}

/**
 * Retrieves a value from a row using its column header name.
 * @param fila The data row array.
 * @param titulo The column header name.
 * @param indiceColumnas Mapping of header names to indices.
 */
function obtenerValor(fila: any[], titulo: string, indiceColumnas: Record<string, number>): string {
  const i = indiceColumnas[titulo];
  if (i === undefined) {
    return "";
  }
  return String(fila[i] || "").trim();
}

/**
 * Counts how many keywords from a list are present in a given text.
 * @param texto The text to search in.
 * @param palabrasClave List of keywords to look for.
 */
function contarPalabrasClave(texto: string, palabrasClave: string[]): number {
  const textoNormalizado = String(texto || "").toLowerCase();
  return palabrasClave.reduce((contador, clave) => contador + (textoNormalizado.includes(clave) ? 1 : 0), 0);
}

/**
 * Stores a log message in user properties for the Web App to retrieve.
 * @param message The message to log.
 */
function logToWebApp(message: string): void {
  const userProperties = PropertiesService.getUserProperties();
  let logs: string[] = JSON.parse(userProperties.getProperty('webAppLogs') || '[]');
  logs.push(`${new Date().toLocaleTimeString()} - ${message}`);
  userProperties.setProperty('webAppLogs', JSON.stringify(logs));
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
function columnaALetra(columna: number): string {
  let temp: number, letra = '';
  let col = columna;
  while (col > 0) {
    temp = (col - 1) % 26;
    letra = String.fromCharCode(temp + 65) + letra;
    col = (col - temp - 1) / 26;
  }
  return letra;
}
