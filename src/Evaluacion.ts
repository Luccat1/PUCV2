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
        "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL", "Enlace Certificado", "Nivel Postulado"]
    ];

    const correosProcesados = new Set<string>();

    const hojaResultadosExistente = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (hojaResultadosExistente) {
      const valoresExistentes = hojaResultadosExistente.getDataRange().getValues();
      if (valoresExistentes.length > 1) {
        for (let i = 1; i < valoresExistentes.length; i++) {
          const email = String(valoresExistentes[i][2] || "").toLowerCase().trim();
          if (email) {
            if (correosProcesados.has(email)) {
              logToWebApp(`Limpiando duplicado preexistente de la hoja de resultados: ${email}`);
              continue;
            }
            correosProcesados.add(email);
          }
          resultados.push(valoresExistentes[i]);
        }
      }
    }

    let nuevasProcesadas = 0;

    logToWebApp(`Iniciando procesamiento de ${datos.length - 1} filas...`);

    for (let r = 1; r < datos.length; r++) {
      try {
        const fila = datos[r];

        // Skip already processed rows (marked in sheet)
        if (indiceEstado !== -1 && obtenerValor(fila, COLUMNA_ESTADO_NOMBRE, indiceColumnas) !== "") {
          const emailExistente = obtenerValor(fila, CONFIG.COLUMNS.EMAIL, indiceColumnas);
          if (emailExistente) correosProcesados.add(emailExistente.toLowerCase().trim());
          continue;
        }

        const correo = obtenerValor(fila, CONFIG.COLUMNS.EMAIL, indiceColumnas).toLowerCase().trim();
        const apellidos = [obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_P, indiceColumnas), obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_M, indiceColumnas)].filter(Boolean).join(" ");
        const nombres = [obtenerValor(fila, CONFIG.COLUMNS.FIRST_NAME, indiceColumnas), obtenerValor(fila, CONFIG.COLUMNS.SECOND_NAME, indiceColumnas)].filter(Boolean).join(" ");
        const rut = obtenerValor(fila, CONFIG.COLUMNS.RUT, indiceColumnas);

        // Edge case: Incomplete submission detection
        if (!correo || (!apellidos && !nombres) || !rut) {
          logToWebApp(`Saltando postulación incompleta en fila ${r + 1}: ${correo || 'sin correo'}`);
          if (indiceEstado !== -1) {
            actualizacionesEstado.push({ fila: r + 1, valor: "INCOMPLETA (Datos insuficientes)" });
          }
          continue;
        }

        // Edge Case: Duplicate Applicant Detection
        if (correo && correosProcesados.has(correo)) {
          logToWebApp(`Saltando duplicado: ${correo}`);
          if (indiceEstado !== -1 && obtenerValor(fila, COLUMNA_ESTADO_NOMBRE, indiceColumnas) === "") {
            actualizacionesEstado.push({ fila: r + 1, valor: "DUPLICADO (Ignorado)" });
          }
          continue;
        }
        if (correo) correosProcesados.add(correo);

        const fecha = normalizarFecha(fila[indiceColumnas[CONFIG.COLUMNS.TIMESTAMP]]);
        const tipo = obtenerValor(fila, CONFIG.COLUMNS.APPLICANT_TYPE, indiceColumnas);
        const sede = obtenerValor(fila, CONFIG.COLUMNS.CAMPUS, indiceColumnas);

        // Elegibilidad (bases n.º 4, 5.1 y 5.2): quien no cumple los requisitos no se evalúa
        const motivo = motivoNoElegible(fila, tipo, indiceColumnas);
        if (motivo) {
          logToWebApp(`Fila ${r + 1} (${correo}) no elegible: ${motivo}`);
          if (indiceEstado !== -1) {
            actualizacionesEstado.push({ fila: r + 1, valor: `NO ELEGIBLE: ${motivo}` });
          }
          continue;
        }

        // Pauta (bases n.º 7.2): proyección internacional, vínculo y etapa, nivel de inglés y uso del inglés.
        // Disponibilidad y compromisos son requisitos, no puntaje: sus columnas quedan en 0.
        const pDisp = 0;
        const pComp = 0;
        const alumni = esAlumni(tipo); // n.º 4: solo acceden a cupo después de toda la comunidad activa
        const pTipo = alumni ? 0 : calcularPuntajeTipoPostulante(tipo);
        const pUso = alumni ? 0 : calcularPuntajeUsoIngles(fila, tipo, indiceColumnas);
        const pIntl = alumni ? 0 : calcularPuntajeInternacionalizacion(fila, tipo, indiceColumnas);
        const pCert = alumni ? 0 : calcularPuntajeCertificado(fila, indiceColumnas);
        const pAnio = alumni ? 0 : calcularPuntajeAnioIngreso(fila, tipo, indiceColumnas);

        // Respaldo de la jefatura: solo académicos y funcionarios
        let pCarta = 0;
        if (!alumni && esAcademicoOFuncionario(tipo)) {
          if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_APPROVAL, indiceColumnas))) pCarta += 1;
          if (obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_LETTER, indiceColumnas)) pCarta += 1;
        }
        const pesoCarta = SCORING_PARAMS.CartaRespaldo.peso[/acad[eé]mico/i.test(tipo) ? "academico" : "funcionario"] || 1;
        const pTotal = pDisp + pTipo + pUso + pIntl + pCert + pAnio + pComp + (pCarta * pesoCarta);
        const enlaceCert = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_ATTACHMENT, indiceColumnas);
        const nivelPostulado = obtenerNivelDesdeFila(fila, indiceColumnas);

        const pUsoNum = Math.round(pUso * 100) / 100;
        const pIntlNum = Math.round(pIntl * 100) / 100;
        const pTotalNum = Math.round(pTotal * 100) / 100;

        resultados.push([
          apellidos, nombres, correo, rut, fecha, tipo, sede,
          pDisp, pTipo, pUsoNum, pIntlNum, pCert, pAnio,
          pComp, pCarta, pTotalNum, enlaceCert, nivelPostulado
        ]);
        nuevasProcesadas++;

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

    if (nuevasProcesadas === 0) {
      // Guarda igual los estados (INCOMPLETA, DUPLICADO, NO ELEGIBLE) para no re-evaluar esas filas
      if (indiceEstado !== -1) {
        actualizacionesEstado.forEach(upd => hojaEntrada.getRange(upd.fila, indiceEstado + 1).setValue(upd.valor));
      }
      return "No hay nuevas postulaciones para añadir.";
    }

    // Ensure all rows in resultados have the exact same length as the header row
    const expectedCols = resultados[0].length;
    for (let i = 0; i < resultados.length; i++) {
      if (resultados[i].length !== expectedCols) {
        logToWebApp(`Advertencia: Fila ${i} tiene longitud ${resultados[i].length} en lugar de ${expectedCols}. Ajustando...`);
        while (resultados[i].length < expectedCols) resultados[i].push("");
        if (resultados[i].length > expectedCols) resultados[i] = resultados[i].slice(0, expectedCols);
      }
    }

    // Write results safely: clear contents to avoid leftover rows and keep formatting template
    let hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (!hojaResultados) {
      hojaResultados = ss.insertSheet(CONFIG.SHEETS.OUTPUT);
    } else {
      hojaResultados.clearConditionalFormatRules();
      if (hojaResultados.getLastRow() > 0 && hojaResultados.getLastColumn() > 0) {
        hojaResultados.getRange(1, 1, hojaResultados.getLastRow(), hojaResultados.getLastColumn()).clearContent();
      }
    }

    hojaResultados.getRange(1, 1, resultados.length, expectedCols).setValues(resultados);
    formatearColumnaFecha(hojaResultados, resultados[0], resultados.length);
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
    generarHojaListaEspera(resultados, ss); // From Seleccionados.ts
    generarYActualizarDashboard(resultados, ss, datos, indiceColumnas); // From Dashboard.ts

    SpreadsheetApp.flush();
    logToWebApp("Evaluación completada.");
    return `¡Evaluación completada! Se procesaron ${nuevasProcesadas} nuevas postulaciones.`;

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
  if (!headers || headers.length < 3) return;

  const idxCriterio = headers.indexOf("Criterio");
  const idxPerfil = headers.indexOf("Perfil");
  let idxPeso = headers.indexOf("Peso");
  if (idxPeso === -1) {
    idxPeso = headers.indexOf("Peso/Valor");
  }

  if (idxCriterio === -1 || idxPerfil === -1 || idxPeso === -1) return;

  datosConfig.forEach(fila => {
    const criterio = String(fila[idxCriterio]).trim();
    const perfil = String(fila[idxPerfil]).trim();
    const pesoValue = fila[idxPeso];
    const peso = parseFloat(pesoValue);

    if (!criterio || !perfil || isNaN(peso)) return;

    if (SCORING_PARAMS[criterio as keyof IScoringParams]) {
      const criteriaObj = SCORING_PARAMS[criterio as keyof IScoringParams] as any;
      if (perfil === "MaxPuntaje") {
        criteriaObj.MaxPuntaje = peso;
      } else if (criteriaObj.peso) {
        criteriaObj.peso[perfil] = peso;
      }
    }
  });

  cargarDatosPrograma();
}

/**
 * Loads program data (dates and schedules) from the configuration sheet.
 */
function cargarDatosPrograma(): void {
  const ss = getSpreadsheet();
  const hojaConfig = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!hojaConfig) return;

  const datosConfig = hojaConfig.getDataRange().getDisplayValues();

  // Assuming the first row is headers, skip it for data processing
  const headers = datosConfig.shift();
  if (!headers) return; // No headers, no data

  const idxCriterio = headers.indexOf("Criterio");
  const idxPerfil = headers.indexOf("Perfil");
  const idxValor = headers.indexOf("Peso/Valor");

  if (idxCriterio === -1 || idxPerfil === -1 || idxValor === -1) return;

  datosConfig.forEach(fila => {
    const criterio = String(fila[idxCriterio]).trim();
    const perfil = String(fila[idxPerfil]).trim();
    const valor = String(fila[idxValor]).trim();

    if (!criterio || !perfil || !valor) return;

    if (criterio === "PROGRAMA") {
      if (perfil === "TIMEZONE") PROGRAM_DATA.TIMEZONE = valor;
      else if (perfil === "FECHA_LIMITE") PROGRAM_DATA.FECHA_LIMITE = valor;
      else if (perfil === "FECHA_INICIO") PROGRAM_DATA.FECHA_INICIO = valor;
      else if (perfil === "FECHA_TERMINO") PROGRAM_DATA.FECHA_TERMINO = valor;
      else if (perfil === "PAYMENT_URL") PROGRAM_DATA.PAYMENT_URL = valor;
      else if (perfil === "DEADLINE_DAYS") PROGRAM_DATA.DEADLINE_DAYS = parseInt(valor, 10) || 3;
      else if (perfil === "TEST_FECHA") PROGRAM_DATA.TEST_FECHA = valor;
      else if (perfil === "TEST_INSTRUCCIONES_FECHA") PROGRAM_DATA.TEST_INSTRUCCIONES_FECHA = valor;
    } else if (criterio.startsWith("HORARIO_")) {
      const nivel = criterio.replace("HORARIO_", "");
      if (PROGRAM_DATA.HORARIOS[nivel]) {
        if (perfil === "Catedra") PROGRAM_DATA.HORARIOS[nivel].catedra = valor;
        else if (perfil === "Ayudantia") PROGRAM_DATA.HORARIOS[nivel].ayudantia = valor;
      }
    }
  });
}

/**
 * Returns current configuration (scoring + program data) for the UI.
 */
function getConfiguracion(): object {
  cargarConfiguracionDesdeHoja();
  return { scoring: SCORING_PARAMS, program: PROGRAM_DATA };
}

/**
 * Saves configuration from the UI to the spreadsheet.
 */
function saveConfiguracion(mergedData: any): string {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!sheet) sheet = ss.insertSheet(CONFIG.SHEETS.CONFIG);

  sheet.clear();
  const rows = [["Criterio", "Perfil", "Peso/Valor"]];

  const data = mergedData.scoring;
  const pData = mergedData.program;

  // 1. Scoring Params
  for (const [criterio, obj] of Object.entries(data)) {
    const c = obj as any;
    if (c.peso) {
      for (const [perfil, peso] of Object.entries(c.peso)) {
        rows.push([criterio, perfil, peso as any]);
      }
    }
    if (c.MaxPuntaje !== undefined) {
      rows.push([criterio, "MaxPuntaje", c.MaxPuntaje]);
    }
  }

  // 2. Program Data
  rows.push(["PROGRAMA", "FECHA_LIMITE", pData.FECHA_LIMITE]);
  rows.push(["PROGRAMA", "FECHA_INICIO", pData.FECHA_INICIO]);
  rows.push(["PROGRAMA", "FECHA_TERMINO", pData.FECHA_TERMINO]);
  rows.push(["PROGRAMA", "PAYMENT_URL", pData.PAYMENT_URL]);
  rows.push(["PROGRAMA", "DEADLINE_DAYS", pData.DEADLINE_DAYS]);
  rows.push(["PROGRAMA", "TEST_FECHA", pData.TEST_FECHA]);
  rows.push(["PROGRAMA", "TEST_INSTRUCCIONES_FECHA", pData.TEST_INSTRUCCIONES_FECHA]);

  for (const [nivel, horarios] of Object.entries(pData.HORARIOS)) {
    const h = horarios as any;
    rows.push([`HORARIO_${nivel}`, "Catedra", h.catedra]);
    rows.push([`HORARIO_${nivel}`, "Ayudantia", h.ayudantia]);
  }

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#e9f2fa");

  // Update in-memory
  SCORING_PARAMS = data;
  PROGRAM_DATA = pData;

  return "Configuración guardada correctamente.";
}

/**
 * Resets configuration to code defaults.
 */
function resetConfiguracion(): object {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (sheet) sheet.clear();

  SCORING_PARAMS = JSON.parse(JSON.stringify(DEFAULT_SCORING_PARAMS));
  PROGRAM_DATA = JSON.parse(JSON.stringify(DEFAULT_PROGRAM_DATA));
  return { scoring: SCORING_PARAMS, program: PROGRAM_DATA };
}

function calcularPuntajeTipoPostulante(texto: string): number {
  const norm = texto.toLowerCase();
  if (/acad[eé]mico|funcionario/.test(norm)) return 2;
  if (/postgrado|posgrado/.test(norm)) return 1.5;
  return 1;
}

function calcularPuntajeUsoIngles(fila: any[], tipo: string, idxs: Record<string, number>): number {
  // Bases n.º 7.2: este criterio aplica solo a académicos y funcionarios
  if (!esAcademicoOFuncionario(tipo)) return 0;
  let p = 0;
  let peso: number;

  if (/acad[eé]mico/i.test(tipo)) {
    const contrib = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_CONTRIBUTION, idxs);
    peso = SCORING_PARAMS.UsoIngles.peso.academico;
    const kw = ["investigación", "publicar", "paper", "revista", "indexada", "congreso", "ponente", "expositor", "colaboración internacional", "clases", "docencia"];
    p += contarPalabrasClave(contrib, kw) * 0.8 + 1.0;
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
  } else if (etapa.includes("en proceso de postulación")) {
    p += 2;
  } else if (etapa.includes("programa identificado") || etapa.includes("en contacto")) {
    p += 1.5;
  } else if (etapa.includes("buscando programa")) {
    p += 0.5;
  }

  const pEtapa = p; // "Interés general" u otras etapas no reconocidas no suman
  const plan = obtenerValor(fila, CONFIG.COLUMNS.INTL_PLAN, idxs);
  p += contarPalabrasClave(plan, SCORING_PARAMS.Internacionalizacion.PalabrasClavePlan) * SCORING_PARAMS.Internacionalizacion.PuntajePorPalabraClave;

  if (esEstudiante(tipo) && (pEtapa > 0 || plan.length > 10)) {
    p += 0.5;
  }

  return Math.min(SCORING_PARAMS.Internacionalizacion.MaxPuntaje, p) * peso;
}

/**
 * Requisitos e impedimentos de las bases (n.º 4, 5.1 y 5.2). Devuelve el motivo si la postulación
 * no se evalúa, o null si es elegible. Los nivel de ingreso y certificados NO filtran: se verifican después.
 * shortcut: "cursos completados" y "situación PILE" se reconocen por palabras clave del texto de la opción;
 * revisar si el formulario cambia esas opciones.
 */
function motivoNoElegible(fila: any[], tipo: string, idxs: Record<string, number>): string | null {
  const C = CONFIG.COLUMNS;
  const v = (col: string) => obtenerValor(fila, col, idxs);

  if (!esSi(v(C.AVAILABILITY_SESSIONS)) || esSi(v(C.AVAILABILITY_CONFLICTS))) return "sin disponibilidad para el horario del programa";
  if (!esSi(v(C.AVAILABILITY_ASSISTANCE))) return "no se compromete al 80 % de asistencia";
  const sinAceptar = DECLARACIONES_REQUERIDAS.filter(d => !esSi(v(d)));
  if (sinAceptar.length > 0) return `no aceptó ${sinAceptar.length} declaración(es) del formulario`;

  if (esSi(v(C.PREV_FAILED))) return "reprobó un curso PUCV2English";
  if (esSi(v(C.PREV_WITHDREW))) return "renunció a la beca después de la primera semana";
  if (esSi(v(C.PREV_C1))) return "ya cursó el nivel C1";
  if (/\b(dos|tres|cuatro|[2-9])\b|m[aá]s de/i.test(v(C.PREV_COURSES))) return "completó dos o más cursos del programa";

  if (/estudiante|alumno/i.test(tipo) && /^no$/i.test(v(C.ENROLLED))) return "estudiante sin matrícula vigente";
  if (esEstudiante(tipo) && !/aprob|exim/i.test(v(C.PILE_STATUS))) return "no aprobó ni se eximió de los cursos obligatorios de inglés del PILE";
  return null;
}

function calcularPuntajeCertificado(fila: any[], idxs: Record<string, number>): number {
  const txt = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_LEVEL, idxs);
  if (!txt || /no sé|no se|no tengo/i.test(txt)) return 0; // sin respuesta o sin certificado Cambridge
  if (/C1/i.test(txt)) return 5;
  if (/B2\.2/i.test(txt)) return 4;
  if (/B2/i.test(txt) || /\bexim/i.test(txt)) return 3;
  if (/B1/i.test(txt) || /ingl[eé]s 4/i.test(txt)) return 2;
  return 1;
}

/**
 * Año en que comienza el programa, tomado de FECHA_INICIO (hoja Configuración).
 * shortcut: si FECHA_INICIO no trae año se usa el año actual; actualizar FECHA_INICIO en cada convocatoria.
 */
function anioDelPrograma(): number {
  const m = String(PROGRAM_DATA.FECHA_INICIO || "").match(/\d{4}/);
  return m ? parseInt(m[0], 10) : new Date().getFullYear();
}

function calcularPuntajeAnioIngreso(fila: any[], tipo: string, idxs: Record<string, number>): number {
  // Bases n.º 7.2 y 7.3: solo pregrado; se prioriza a quienes cursan desde el tercer año de su carrera
  if (!esEstudiante(tipo)) return 0;
  const anio = parseInt(obtenerValor(fila, CONFIG.COLUMNS.ENTRY_YEAR, idxs), 10);
  if (isNaN(anio)) return 0;
  const programa = anioDelPrograma();
  if (anio <= programa - 2) return 2;    // 3.er año o superior
  if (anio === programa - 1) return 0.5; // 2.º año
  return 0;                              // 1.er año
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

    const idxNivelPostulado = headersS.indexOf("Nivel Postulado");
    const distNivel = datosS.reduce((acc: any, f) => {
      const n = idxNivelPostulado !== -1 ? String(f[idxNivelPostulado]).trim() : "No asignado";
      acc[n] = (acc[n] || 0) + 1;
      return acc;
    }, {});

    lineas.push("\nSeleccionados por Nivel:");
    ["B1+", "B2.1", "B2.2", "C1"].forEach(nivel => {
      lineas.push(`  - ${nivel}: ${distNivel[nivel] || 0} / ${CUPOS_CONVOCATORIA_ABIERTA[nivel]}`);
    });

    return lineas.join("\n");
  } catch (e: any) {
    return `Error en el análisis: ${e.message}`;
  }
}

/**
 * Extracts the postulado level from a row based on LEVEL_APPLIED, or falls back to CERTIFICATE_LEVEL.
 */
function obtenerNivelDesdeFila(fila: any[], idxs: Record<string, number>): string {
  const colLevelApplied = CONFIG.COLUMNS.LEVEL_APPLIED;
  const colCertLevel = CONFIG.COLUMNS.CERTIFICATE_LEVEL;

  let txt = "";
  if (colLevelApplied && idxs[colLevelApplied] !== undefined) {
    txt = String(obtenerValor(fila, colLevelApplied, idxs) || "").trim();
  }
  
  if (!txt && colCertLevel && idxs[colCertLevel] !== undefined) {
    txt = String(obtenerValor(fila, colCertLevel, idxs) || "").trim();
  }

  // Normalize mapping
  if (/C1/i.test(txt)) return "C1";
  if (/B2\.2/i.test(txt)) return "B2.2";
  if (/B2/i.test(txt) || /\bexim/i.test(txt)) return "B2.1";
  if (/B1/i.test(txt) || /ingl[eé]s 4/i.test(txt)) return "B1+";

  return "B1+"; // Default fallback
}

/**
 * Reset all evaluation sheets and processing status to force a full re-evaluation.
 */
function ejecutarReevaluacionCompleta(): void {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.alert(
    'Confirmar Reevaluación Completa',
    'ATENCIÓN: Esto borrará de forma definitiva todas las evaluaciones y selecciones actuales, limpiará el estado de procesamiento de la hoja de respuestas, y volverá a calcular los puntajes de todos los candidatos desde cero.\n\n¿Estás seguro de que deseas continuar?',
    ui.ButtonSet.YES_NO
  );

  if (respuesta !== ui.Button.YES) {
    ui.alert('Operación Cancelada', 'No se ha realizado ningún cambio.', ui.ButtonSet.OK);
    return;
  }

  const lock = LockService.getScriptLock();
  const tuvoExito = lock.tryLock(15000);
  if (!tuvoExito) {
    ui.alert('Error', 'No se pudo obtener el bloqueo del script. Intenta de nuevo en unos segundos.', ui.ButtonSet.OK);
    return;
  }

  try {
    const ss = getSpreadsheet();
    
    // 1. Limpiar estado en la hoja de respuestas de formulario
    const hojaEntrada = ss.getSheetByName(CONFIG.SHEETS.INPUT);
    if (hojaEntrada) {
      const ultimaFila = hojaEntrada.getLastRow();
      if (ultimaFila >= 2) {
        const datos = hojaEntrada.getRange(1, 1, ultimaFila, hojaEntrada.getLastColumn()).getValues();
        const encabezados = datos[0].map((h: any) => String(h || "").trim());
        const COLUMNA_ESTADO_NOMBRE = CONFIG.COLUMNS.PROCESSING_STATUS;
        const indiceEstado = encabezados.indexOf(COLUMNA_ESTADO_NOMBRE);
        if (indiceEstado !== -1) {
          // Clear entire status column starting from row 2
          hojaEntrada.getRange(2, indiceEstado + 1, ultimaFila - 1, 1).clearContent();
        }
      }
    }

    // 2. Limpiar hoja de Evaluación Automatizada
    const hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    if (hojaResultados) {
      hojaResultados.clearConditionalFormatRules();
      if (hojaResultados.getLastRow() > 0 && hojaResultados.getLastColumn() > 0) {
        hojaResultados.getRange(1, 1, hojaResultados.getLastRow(), hojaResultados.getLastColumn()).clearContent();
      }
    }

    // 3. Limpiar hoja de Seleccionados
    const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (hojaSeleccionados) {
      hojaSeleccionados.clearConditionalFormatRules();
      if (hojaSeleccionados.getLastRow() > 0 && hojaSeleccionados.getLastColumn() > 0) {
        hojaSeleccionados.getRange(1, 1, hojaSeleccionados.getLastRow(), hojaSeleccionados.getLastColumn()).clearContent();
      }
    }

    // 3.5. Limpiar hoja de Lista de Espera
    const hojaWaitlist = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
    if (hojaWaitlist) {
      hojaWaitlist.clearConditionalFormatRules();
      if (hojaWaitlist.getLastRow() > 0 && hojaWaitlist.getLastColumn() > 0) {
        hojaWaitlist.getRange(1, 1, hojaWaitlist.getLastRow(), hojaWaitlist.getLastColumn()).clearContent();
      }
    }

    // 4. Limpiar Dashboard (ej. vaciar los datos numéricos de A:C)
    const hojaDashboard = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
    if (hojaDashboard) {
      hojaDashboard.getRange("A:C").clearContent().clearFormat();
      hojaDashboard.getCharts().forEach(c => hojaDashboard.removeChart(c));
      hojaDashboard.getRange("E:F").clearContent();
    }

    // Soltar el bloqueo antes de ejecutar la evaluación para evitar deadlock,
    // ya que evaluarPostulacionesPUCV2() obtendrá su propio bloqueo.
    lock.releaseLock();

    // 5. Ejecutar la evaluación de nuevo
    const resultado = evaluarPostulacionesPUCV2();
    ui.alert('Reevaluación Finalizada', 'Las hojas han sido limpiadas y recalculadas.\n\nResultado: ' + resultado, ui.ButtonSet.OK);

  } catch (e: any) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
    ui.alert('Error durante la reevaluación', e.message, ui.ButtonSet.OK);
  }
}
