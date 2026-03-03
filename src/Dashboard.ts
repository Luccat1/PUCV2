/**
 * @file Dashboard.ts
 * Logic for calculating statistics and generating the Google Sheets dashboard.
 */

/**
 * Calculates various statistics from the evaluation results.
 */
function calcularEstadisticas(
  resultadosCompletos: any[][], 
  datosOriginales: any[][], 
  indicesOriginales: Record<string, number>
): IStatistics {
  const encabezadosR = resultadosCompletos[0];
  const postulantes = resultadosCompletos.slice(1);

  const getIdx = (name: string) => encabezadosR.indexOf(name);
  const idxCat = getIdx("Categoría Postulante");
  const idxTotal = getIdx("PUNTAJE TOTAL");
  const idxSede = getIdx("Sede");

  const puntajes = postulantes.map(f => parseFloat(f[idxTotal] || 0));
  const totalPostulantes = postulantes.length;
  
  if (totalPostulantes === 0) {
    throw new Error("No hay datos para generar estadísticas.");
  }

  const pPromedio = puntajes.reduce((acc, p) => acc + p, 0) / totalPostulantes;
  const pMax = Math.max(...puntajes);
  const pMin = Math.min(...puntajes);

  const agrupar = (idx: number) => {
    const s: Record<string, { suma: number; contador: number }> = {};
    postulantes.forEach(f => {
      const k = String(f[idx] || "No especificado");
      const p = parseFloat(f[idxTotal] || 0);
      if (!s[k]) s[k] = { suma: 0, contador: 0 };
      s[k].suma += p;
      s[k].contador++;
    });
    return s;
  };

  const sCat = agrupar(idxCat);
  const sSede = agrupar(idxSede);

  const idxAnioOriginal = indicesOriginales[CONFIG.COLUMNS.ENTRY_YEAR];
  const sAnio: Record<string, { suma: number; contador: number }> = {};
  datosOriginales.slice(1).forEach((fOrig, i) => {
    const anio = String(fOrig[idxAnioOriginal] || "No especificado");
    const p = parseFloat(postulantes[i][idxTotal] || 0);
    if (!sAnio[anio]) sAnio[anio] = { suma: 0, contador: 0 };
    sAnio[anio].suma += p;
    sAnio[anio].contador++;
  });

  const sCruzados: Record<string, Record<string, { suma: number; contador: number }>> = {};
  postulantes.forEach(f => {
    const sede = String(f[idxSede] || "N/A");
    const cat = String(f[idxCat] || "N/A");
    const p = parseFloat(f[idxTotal] || 0);
    if (!sCruzados[sede]) sCruzados[sede] = {};
    if (!sCruzados[sede][cat]) sCruzados[sede][cat] = { suma: 0, contador: 0 };
    sCruzados[sede][cat].suma += p;
    sCruzados[sede][cat].contador++;
  });

  return {
    totalPostulantes,
    puntajePromedio: pPromedio,
    puntajeMaximo: pMax,
    puntajeMinimo: pMin,
    statsPorCategoria: sCat,
    statsPorSede: sSede,
    statsPorAnio: sAnio,
    statsCruzados: sCruzados
  };
}

/**
 * Formats statistics for writing into the Spreadsheet dashboard.
 */
function formatearDatosDashboard(stats: IStatistics): any[][] {
  const { totalPostulantes, puntajePromedio, puntajeMaximo, puntajeMinimo, statsPorCategoria, statsPorSede, statsPorAnio, statsCruzados } = stats;
  
  let rows: any[][] = [
    ["MÉTRICAS GENERALES", "", ""],
    ["Número Total de Postulantes", totalPostulantes, ""],
    ["Puntaje Promedio General", puntajePromedio.toFixed(2), ""],
    ["Puntaje Máximo / Mínimo", `${puntajeMaximo.toFixed(2)} / ${puntajeMinimo.toFixed(2)}`, ""],
    []
  ];

  const addTable = (title: string, tableStats: Record<string, { suma: number; contador: number }>) => {
    rows.push([title, "Nº Postulantes", "Puntaje Promedio"]);
    for (const k in tableStats) {
      const prom = tableStats[k].suma / tableStats[k].contador;
      rows.push([k, tableStats[k].contador, prom.toFixed(2)]);
    }
    rows.push([]);
  };

  addTable("DESGLOSE POR CATEGORÍA", statsPorCategoria);
  addTable("DESGLOSE POR SEDE", statsPorSede);
  addTable("DESGLOSE POR AÑO DE INGRESO", statsPorAnio);

  rows.push(["ANÁLISIS CRUZADO: SEDE vs CATEGORÍA", "Puntaje Promedio", ""]);
  for (const s in statsCruzados) {
    for (const c in statsCruzados[s]) {
      const prom = statsCruzados[s][c].suma / statsCruzados[s][c].contador;
      rows.push([`${s} - ${c}`, prom.toFixed(2), `(${statsCruzados[s][c].contador} postulantes)`]);
    }
  }
  
  return rows;
}

/**
 * Inserts or updates a pie chart in the dashboard sheet.
 */
function crearGraficoSede(sheet: GoogleAppsScript.Spreadsheet.Sheet, statsSede: Record<string, { contador: number }>): void {
  const chartData: any[][] = [["Sede", "Nº Postulantes"]];
  for (const s in statsSede) chartData.push([s, statsSede[s].contador]);

  if (chartData.length > 1) {
    const range = sheet.getRange(1, 5, chartData.length, 2);
    range.setValues(chartData);

    const chart = sheet.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(range)
      .setOption('title', 'Distribución de Postulantes por Sede')
      .setPosition(5, 5, 0, 0)
      .build();

    sheet.insertChart(chart);
  }
}

/**
 * Orchestrates the dashboard generation process.
 */
function generarYActualizarDashboard(
  resultadosCompletos: any[][], 
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet, 
  datosOriginales: any[][], 
  indicesOriginales: Record<string, number>
): void {
  const stats = calcularEstadisticas(resultadosCompletos, datosOriginales, indicesOriginales);
  const rows = formatearDatosDashboard(stats);

  let sheet = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.DASHBOARD);
  else {
    sheet!.getRange("A:C").clearContent().clearFormat();
    sheet!.getCharts().forEach(c => sheet!.removeChart(c));
    sheet!.getRange("E:F").clearContent();
  }

  if (rows.length > 0) {
    const rectRows = rows.map(r => {
      const full = [...r];
      while (full.length < 3) full.push("");
      return full;
    });
    sheet.getRange(1, 1, rectRows.length, 3).setValues(rectRows);

    rectRows.forEach((r, i) => {
      if (r[0].endsWith(":") || r[1] === "Nº Postulantes") {
        sheet.getRange(i + 1, 1, 1, 3).setFontWeight("bold");
      }
    });
    sheet.getRange("A1:C1").setFontSize(12);
  }

  crearGraficoSede(sheet!, stats.statsPorSede);
}

/**
 * Helper called from the Web App to run analysis.
 */
function ejecutarAnalisisDesdeWebApp(): string {
  return getAnalysisReport(); // Calls function from Evaluacion.ts
}
