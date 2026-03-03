/**
 * @file Evaluacion.ts
 * Core evaluation engine for processing applications and calculating scores.
 */

/**
 * Main orchestrator for evaluation.
 * Processes new applications from the input sheet and updates output/selected sheets.
 */
function evaluarPostulacionesPUCV2(): string {
  const lock = LockService.getScriptLock();
  const tuvoExito = lock.tryLock(10000);
  
  logToWebApp("Intentando iniciar evaluación de postulaciones...");
  if (!tuvoExito) {
    logToWebApp("No se pudo obtener el bloqueo. Reintenta en unos segundos.");
    return "No se pudo iniciar la evaluación. Otra operación está en curso.";
  }

  try {
    const ss = getSpreadsheet();
    
    // ADR-006: Load configuration BEFORE the evaluation loop
    logToWebApp("Cargando configuración de pesos desde la hoja...");
    cargarConfiguracionDesdeHoja();

    const hojaEntrada = ss.getSheetByName(CONFIG.SHEETS.INPUT);
    if (!hojaEntrada) throw new Error("Hoja de entrada no encontrada: " + CONFIG.SHEETS.INPUT);

    const ultimaFila = hojaEntrada.getLastRow();
    if (ultimaFila < 2) {
      logToWebApp("No hay postulaciones para procesar.");
      return "No hay postulaciones para procesar.";
    }

    const datos = hojaEntrada.getRange(1, 1, ultimaFila, hojaEntrada.getLastColumn()).getValues();
    const encabezados = datos[0].map((h: any) => String(h || "").trim());
    const indiceColumnas: Record<string, number> = {};
    encabezados.forEach((h: string, i: number) => indiceColumnas[h] = i);

    const COLUMNA_ESTADO_NOMBRE = CONFIG.COLUMNS.PROCESSING_STATUS;
    const indiceEstado = encabezados.indexOf(COLUMNA_ESTADO_NOMBRE);
    const actualizacionesEstado: { fila: number; valor: any }[] = [];

    const resultados: any[][] = [
      ["Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación", "Categoría Postulante", "Sede",
        "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés", "Puntaje Intl.", "Puntaje Nivel Inglés",
        "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL", "Enlace Certificado"]
    ];

    logToWebApp(`Iniciando procesamiento de ${datos.length - 1} filas...`);

    for (let r = 1; r < datos.length; r++) {
      try {
        const fila = datos[r];
        if (indiceEstado !== -1 && obtenerValor(fila, COLUMNA_ESTADO_NOMBRE, indiceColumnas) !== "") {
          continue;
        }

        const apellidos = [obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_P, indiceColumnas), obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_M, indiceColumnas)].filter(Boolean).join(" ");
        const nombres = [obtenerValor(fila, CONFIG.COLUMNS.FIRST_NAME, indiceColumnas), obtenerValor(fila, CONFIG.COLUMNS.SECOND_NAME, indiceColumnas)].filter(Boolean).join(" ");
        const correo = obtenerValor(fila, CONFIG.COLUMNS.EMAIL, indiceColumnas);
        const rut = obtenerValor(fila, CONFIG.COLUMNS.RUT, indiceColumnas);
        const fecha = obtenerValor(fila, CONFIG.COLUMNS.TIMESTAMP, indiceColumnas);
        const tipo = obtenerValor(fila, CONFIG.COLUMNS.APPLICANT_TYPE, indiceColumnas);
        const sede = obtenerValor(fila, CONFIG.COLUMNS.CAMPUS, indiceColumnas);

        // 1. Availability
        let pDisp = 0;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_SESSIONS, indiceColumnas))) pDisp++;
        if (!esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_CONFLICTS, indiceColumnas))) pDisp++;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_ASSISTANCE, indiceColumnas))) pDisp++;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_STUDY, indiceColumnas))) pDisp++;

        // 2. Specialized Scoring
        const pTipo = calcularPuntajeTipoPostulante(tipo);
        const pUso = calcularPuntajeUsoIngles(fila, tipo, indiceColumnas);
        const pIntl = calcularPuntajeInternacionalizacion(fila, tipo, indiceColumnas);
        const pCert = calcularPuntajeCertificado(fila, indiceColumnas);
        const pAnio = calcularPuntajeAnioIngreso(fila, tipo, indiceColumnas);

        // 3. Commitment
        let pComp = 0;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_PROGRAM, indiceColumnas))) pComp++;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_VERACITY, indiceColumnas))) pComp++;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_BREACH, indiceColumnas))) pComp++;

        // 4. Endorsement Letter
        const pesoCarta = SCORING_PARAMS.CartaRespaldo.peso[esEstudiante(tipo) ? "estudiante" : "funcionario"] || 1;
        let pCarta = 0;
        const tieneCarta = !!obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_LETTER, indiceColumnas);

        if (esEstudiante(tipo)) {
          pCarta = 1; 
          if (tieneCarta) pCarta += 1.5;
        } else {
          if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_APPROVAL, indiceColumnas))) pCarta += 1;
          if (tieneCarta) pCarta += 1;
          if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_SCHEDULE, indiceColumnas))) pCarta++;
        }

        const pTotal = pDisp + pTipo + pUso + pIntl + pCert + pAnio + pComp + (pCarta * pesoCarta);
        const enlaceCert = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_ATTACHMENT, indiceColumnas);

        resultados.push([
          apellidos, nombres, correo, rut, fecha, tipo, sede,
          pDisp, pTipo, pUso.toFixed(2), pIntl.toFixed(2), pCert, pAnio,
          pComp, pCarta, pTotal.toFixed(2), enlaceCert
        ]);

        if (indiceEstado !== -1) {
          actualizacionesEstado.push({ fila: r + 1, valor: new Date() });
        }

      } catch (e: any) {
        logToWebApp(`ERROR fila ${r + 1}: ${e.message}`);
        if (indiceEstado !== -1) {
          actualizacionesEstado.push({ fila: r + 1, valor: `ERROR: ${e.message}` });
        }
      }
    }

    if (resultados.length <= 1) {
      lock.releaseLock();
      return "No hay nuevas postulaciones para añadir.";
    }

    // Write results
    let hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (!hojaResultados) hojaResultados = ss.insertSheet(CONFIG.SHEETS.OUTPUT);
    else hojaResultados.clear();
    
    hojaResultados.getRange(1, 1, resultados.length, resultados[0].length).setValues(resultados);
    applyConditionalFormattingToScores(hojaResultados, resultados.length);

    // Update processing states
    if (indiceEstado !== -1 && actualizacionesEstado.length > 0) {
      actualizacionesEstado.forEach(upd => {
        hojaEntrada.getRange(upd.fila, indiceEstado + 1).setValue(upd.valor);
      });
    }

    // Update UI components
    logToWebApp("Generando hoja de seleccionados y dashboard...");
    generarHojaSeleccionados(resultados, ss); // From Seleccionados.ts
    generarYActualizarDashboard(resultados, ss, datos, indiceColumnas); // From Dashboard.ts
    
    SpreadsheetApp.flush();
    logToWebApp("Evaluación completada.");
    return `¡Evaluación completada! Se procesaron ${resultados.length - 1} nuevas postulaciones.`;

  } finally {
    lock.releaseLock();
  }
}

/**
 * Loads scoring weights from the configuration sheet into memory.
 */
function cargarConfiguracionDesdeHoja(): void {
  const ss = getSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!hojaConfig) return;

  const datosConfig = hojaConfig.getDataRange().getValues();
  const headers = datosConfig.shift();
  if (!headers) return;

  const idxCriterio = headers.indexOf("Criterio");
  const idxPerfil = headers.indexOf("Perfil");
  const idxPeso = headers.indexOf("Peso");

  if (idxCriterio === -1 || idxPerfil === -1 || idxPeso === -1) return;

  datosConfig.forEach(fila => {
    const criterio = String(fila[idxCriterio]);
    const perfil = String(fila[idxPerfil]);
    const peso = parseFloat(fila[idxPeso]);

    if (!criterio || !perfil || isNaN(peso)) return;

    if (SCORING_PARAMS[criterio as keyof IScoringParams] && (SCORING_PARAMS[criterio as keyof IScoringParams] as any).peso) {
      (SCORING_PARAMS[criterio as keyof IScoringParams] as any).peso[perfil] = peso;
    }
  });
}

function calcularPuntajeTipoPostulante(texto: string): number {
  const norm = texto.toLowerCase();
  if (/acad[eé]mico|funcionario/.test(norm)) return 2;
  if (/postgrado|posgrado/.test(norm)) return 1.5;
  return 1;
}

function calcularPuntajeUsoIngles(fila: any[], tipo: string, idxs: Record<string, number>): number {
  let p = 0;
  const contrib = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_CONTRIBUTION, idxs);
  const normTipo = tipo.toLowerCase();
  let peso = 1;

  if (normTipo.includes("académico") || normTipo.includes("postgrado")) {
    peso = SCORING_PARAMS.UsoIngles.peso.academico;
    const kw = ["investigación", "publicar", "paper", "revista", "indexada", "congreso", "ponente", "expositor", "colaboración internacional", "clases", "docencia"];
    p += contarPalabrasClave(contrib, kw) * 0.8 + 1.0;
  } else if (esEstudiante(tipo)) {
    peso = SCORING_PARAMS.UsoIngles.peso.estudiante;
    if (contrib.length > 20) p += 0.5;
    const hi = ["intercambio", "magíster", "doctorado", "postgrado", "investigación", "publicar", "congreso", "pasantía"];
    const gen = ["oportunidades", "desarrollo", "competitividad", "laboral", "profesional", "herramienta", "bibliografía", "papers", "libros", "comunicarme"];
    p += contarPalabrasClave(contrib, hi) * 0.75 + contarPalabrasClave(contrib, gen) * 0.25;
  } else {
    peso = SCORING_PARAMS.UsoIngles.peso.funcionario;
    const freq = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FREQUENCY, idxs).toLowerCase();
    for (const [k, v] of Object.entries(SCORING_PARAMS.UsoIngles.Frecuencia)) {
      if (freq.includes(k)) p += v;
    }
    const acts = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_ACTIVITIES, idxs).toLowerCase();
    for (const [a, ps] of Object.entries(SCORING_PARAMS.UsoIngles.Actividades)) {
      if (acts.includes(a)) p += ps;
    }
    if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FUTURE_PROJECTS, idxs))) p += 1;
  }
  return Math.min(SCORING_PARAMS.UsoIngles.MaxPuntaje, p) * peso;
}

function calcularPuntajeInternacionalizacion(fila: any[], tipo: string, idxs: Record<string, number>): number {
  let p = 0;
  const peso = SCORING_PARAMS.Internacionalizacion.peso[esEstudiante(tipo) ? "estudiante" : "funcionario"] || 1;
  const docs = !!obtenerValor(fila, CONFIG.COLUMNS.INTL_SUPPORT_DOCS, idxs);
  const etapa = obtenerValor(fila, CONFIG.COLUMNS.INTL_STAGE, idxs).toLowerCase();

  if (etapa.includes("carta de aceptación")) {
    p += 3.5 + (docs ? 0.5 : 0);
  } else if (etapa.includes("postulación enviada")) {
    p += 2.5;
  } else if (etapa.includes("programa identificado") || etapa.includes("en contacto")) {
    p += 1.5;
  } else if (etapa.includes("buscando programa")) {
    p += 0.5;
  }

  const plan = obtenerValor(fila, CONFIG.COLUMNS.INTL_PLAN, idxs);
  p += contarPalabrasClave(plan, SCORING_PARAMS.Internacionalizacion.PalabrasClavePlan) * SCORING_PARAMS.Internacionalizacion.PuntajePorPalabraClave;

  if (esEstudiante(tipo) && (etapa.length > 0 || plan.length > 10)) {
    p += 0.5;
  }

  return Math.min(SCORING_PARAMS.Internacionalizacion.MaxPuntaje, p) * peso;
}

function calcularPuntajeCertificado(fila: any[], idxs: Record<string, number>): number {
  if (obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_CHECKBOX, idxs)) return 0;
  const txt = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_LEVEL, idxs);
  if (/C1/i.test(txt)) return 5;
  if (/B2\.2/i.test(txt)) return 4;
  if (/B2\.1/i.test(txt)) return 3;
  if (/\bexim/i.test(txt)) return 3;
  if (/B1\+/i.test(txt)) return 2;
  if (/inglés 4|ingles 4/i.test(txt)) return 2;
  return 1;
}

function calcularPuntajeAnioIngreso(fila: any[], tipo: string, idxs: Record<string, number>): number {
  const anio = parseInt(obtenerValor(fila, CONFIG.COLUMNS.ENTRY_YEAR, idxs), 10);
  const current = new Date().getFullYear();

  if (esEstudiante(tipo)) {
    if (anio === current - 2) return 2;
    if (anio === current - 1) return 1.5;
    if (anio === current - 3) return 1;
    if (anio === current) return 0.5;
    return 0;
  } else {
    if (anio < current - 10) return 2;
    if (anio < current - 5) return 1;
    return 0.5;
  }
}

function applyConditionalFormattingToScores(sheet: GoogleAppsScript.Spreadsheet.Sheet, rowCount: number): void {
  sheet.clearConditionalFormatRules();
  if (rowCount <= 1) return;

  const range = sheet.getRange(2, 8, rowCount - 1, 9);
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .setGradientMinpoint('#F8696B')
    .setGradientMidpointWithValue('#FFEB84', SpreadsheetApp.InterpolationType.PERCENT, '50')
    .setGradientMaxpoint('#63BE7B')
    .setRanges([range])
    .build();

  const rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);
}

function getAnalysisReport(): string {
  try {
    const ss = getSpreadsheet();
    const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const hojaEvaluacion = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);

    if (!hojaSeleccionados || !hojaEvaluacion) return "Error: Faltan Hojas de datos.";

    const datosS = hojaSeleccionados.getDataRange().getValues();
    const headersS = datosS.shift();
    if (!headersS || datosS.length === 0) return "No hay datos en 'Seleccionados'.";

    const idxsS = {
      cat: headersS.indexOf("Categoría Postulante"),
      total: headersS.indexOf("PUNTAJE TOTAL"),
      // ... keep it simple for now or port fully if needed
    };

    const lineas = ["--- ANÁLISIS DE EQUILIBRIO ---"];
    lineas.push(`Total seleccionados: ${datosS.length}`);
    
    // Portfolio analysis logic from original - simplified for TS/Modular
    const dist = datosS.reduce((acc: any, f) => {
      const p = esEstudiante(f[idxsS.cat]) ? "Estudiantes" : "Funcionarios";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    lineas.push(`Estudiantes: ${dist.Estudiantes || 0}`);
    lineas.push(`Funcionarios: ${dist.Funcionarios || 0}`);

    return lineas.join("\n");
  } catch (e: any) {
    return `Error en el análisis: ${e.message}`;
  }
}
