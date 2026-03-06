"use strict";
/**
 * @file ListaFinal.ts
 * Logic for generating the final confirmed participant list.
 */
/**
 * Generates the final list of course participants who have accepted and have an assigned level.
 */
function generarListaFinalCurso() {
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS)
        return "Error: Hoja 'Seleccionados' no encontrada.";
    const datosS = hojaS.getDataRange().getValues();
    const headers = datosS.shift();
    if (!headers)
        return "Error: Hoja vacía.";
    const idxNombre = headers.indexOf("Nombre(s)");
    const idxApellido = headers.indexOf("Apellido(s)");
    const idxCorreo = headers.indexOf("Correo Electrónico");
    const idxNivel = headers.indexOf("Nivel Asignado");
    const idxAceptacion = headers.indexOf("Aceptación");
    // Filter: Accepted AND has a Nivel
    const finales = datosS.filter(f => String(f[idxAceptacion]).toLowerCase() === 'acepta' &&
        String(f[idxNivel]).trim() !== "");
    if (finales.length === 0)
        return "No hay participantes confirmados para generar la lista final.";
    // Group by Nivel
    const grupos = {};
    finales.forEach(f => {
        const nivel = String(f[idxNivel]).trim();
        if (!grupos[nivel])
            grupos[nivel] = [];
        grupos[nivel].push([f[idxApellido], f[idxNombre], f[idxCorreo], nivel]);
    });
    let hojaF = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
    if (!hojaF)
        hojaF = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
    else
        hojaF.clear();
    const finalRows = [["Apellido(s)", "Nombre(s)", "Correo", "Nivel"]];
    Object.keys(grupos).sort().forEach(nivel => {
        finalRows.push([]); // Empty row as separator
        finalRows.push([`NIVEL: ${nivel}`, "", "", ""]);
        grupos[nivel].forEach(p => finalRows.push(p));
    });
    hojaF.getRange(1, 1, finalRows.length, finalRows[0].length).setValues(finalRows);
    hojaF.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#cfe2f3");
    return `Lista final generada exitosamente en la hoja '${CONFIG.SHEETS.FINAL_LIST}'. Total confirmados: ${finales.length}.`;
}
