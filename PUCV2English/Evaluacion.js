"use strict";
/**
 * @file Evaluacion.ts
 * Core evaluation engine for processing applications and calculating scores.
 */
/**
 * Main orchestrator for evaluation.
 * Processes new applications from the input sheet and updates output/selected sheets.
 */
function evaluarPostulacionesPUCV2() {
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
        if (!hojaEntrada)
            throw new Error("Hoja de entrada no encontrada: " + CONFIG.SHEETS.INPUT);
        const ultimaFila = hojaEntrada.getLastRow();
        if (ultimaFila < 2) {
            logToWebApp("No hay postulaciones para procesar.");
            return "No hay postulaciones para procesar.";
        }
        const datos = hojaEntrada.getRange(1, 1, ultimaFila, hojaEntrada.getLastColumn()).getValues();
        const encabezados = datos[0].map((h) => String(h || "").trim());
        const indiceColumnas = {};
        encabezados.forEach((h, i) => indiceColumnas[h] = i);
        const COLUMNA_ESTADO_NOMBRE = CONFIG.COLUMNS.PROCESSING_STATUS;
        const indiceEstado = encabezados.indexOf(COLUMNA_ESTADO_NOMBRE);
        const actualizacionesEstado = [];
        const resultados = [
            ["Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación", "Categoría Postulante", "Sede",
                "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés", "Puntaje Intl.", "Puntaje Nivel Inglés",
                "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL", "Enlace Certificado", "Nivel Postulado"]
        ];
        const correosProcesados = new Set();
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
                    if (emailExistente)
                        correosProcesados.add(emailExistente.toLowerCase().trim());
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
                if (correo)
                    correosProcesados.add(correo);
                const fecha = obtenerValor(fila, CONFIG.COLUMNS.TIMESTAMP, indiceColumnas);
                const tipo = obtenerValor(fila, CONFIG.COLUMNS.APPLICANT_TYPE, indiceColumnas);
                const sede = obtenerValor(fila, CONFIG.COLUMNS.CAMPUS, indiceColumnas);
                // 1. Availability
                let pDisp = 0;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_SESSIONS, indiceColumnas)))
                    pDisp++;
                if (!esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_CONFLICTS, indiceColumnas)))
                    pDisp++;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_ASSISTANCE, indiceColumnas)))
                    pDisp++;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_STUDY, indiceColumnas)))
                    pDisp++;
                // 2. Specialized Scoring
                const pTipo = calcularPuntajeTipoPostulante(tipo);
                const pUso = calcularPuntajeUsoIngles(fila, tipo, indiceColumnas);
                const pIntl = calcularPuntajeInternacionalizacion(fila, tipo, indiceColumnas);
                const pCert = calcularPuntajeCertificado(fila, indiceColumnas);
                const pAnio = calcularPuntajeAnioIngreso(fila, tipo, indiceColumnas);
                // 3. Commitment
                let pComp = 0;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_PROGRAM, indiceColumnas)))
                    pComp++;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_VERACITY, indiceColumnas)))
                    pComp++;
                if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_BREACH, indiceColumnas)))
                    pComp++;
                // 4. Endorsement Letter
                const pesoCarta = SCORING_PARAMS.CartaRespaldo.peso[esEstudiante(tipo) ? "estudiante" : "funcionario"] || 1;
                let pCarta = 0;
                const tieneCarta = !!obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_LETTER, indiceColumnas);
                if (esEstudiante(tipo)) {
                    pCarta = 1;
                    if (tieneCarta)
                        pCarta += 1.5;
                }
                else {
                    if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_APPROVAL, indiceColumnas)))
                        pCarta += 1;
                    if (tieneCarta)
                        pCarta += 1;
                    if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_SCHEDULE, indiceColumnas)))
                        pCarta++;
                }
                const pTotal = pDisp + pTipo + pUso + pIntl + pCert + pAnio + pComp + (pCarta * pesoCarta);
                const enlaceCert = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_ATTACHMENT, indiceColumnas);
                const nivelPostulado = obtenerNivelDesdeFila(fila, indiceColumnas);
                resultados.push([
                    apellidos, nombres, correo, rut, fecha, tipo, sede,
                    pDisp, pTipo, pUso.toFixed(2), pIntl.toFixed(2), pCert, pAnio,
                    pComp, pCarta, pTotal.toFixed(2), enlaceCert, nivelPostulado
                ]);
                nuevasProcesadas++;
                if (indiceEstado !== -1) {
                    actualizacionesEstado.push({ fila: r + 1, valor: new Date() });
                }
            }
            catch (e) {
                logToWebApp(`ERROR fila ${r + 1}: ${e.message}`);
                if (indiceEstado !== -1) {
                    actualizacionesEstado.push({ fila: r + 1, valor: `ERROR: ${e.message}` });
                }
            }
        }
        if (nuevasProcesadas === 0) {
            lock.releaseLock();
            return "No hay nuevas postulaciones para añadir.";
        }
        // Ensure all rows in resultados have the exact same length as the header row
        const expectedCols = resultados[0].length;
        for (let i = 0; i < resultados.length; i++) {
            if (resultados[i].length !== expectedCols) {
                logToWebApp(`Advertencia: Fila ${i} tiene longitud ${resultados[i].length} en lugar de ${expectedCols}. Ajustando...`);
                while (resultados[i].length < expectedCols)
                    resultados[i].push("");
                if (resultados[i].length > expectedCols)
                    resultados[i] = resultados[i].slice(0, expectedCols);
            }
        }
        // Write results safely: clear contents to avoid leftover rows and keep formatting template
        let hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
        if (!hojaResultados) {
            hojaResultados = ss.insertSheet(CONFIG.SHEETS.OUTPUT);
        }
        else {
            hojaResultados.clearConditionalFormatRules();
            if (hojaResultados.getLastRow() > 0 && hojaResultados.getLastColumn() > 0) {
                hojaResultados.getRange(1, 1, hojaResultados.getLastRow(), hojaResultados.getLastColumn()).clearContent();
            }
        }
        hojaResultados.getRange(1, 1, resultados.length, expectedCols).setValues(resultados);
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
        return `¡Evaluación completada! Se procesaron ${nuevasProcesadas} nuevas postulaciones.`;
    }
    finally {
        lock.releaseLock();
    }
}
/**
 * Loads scoring weights from the configuration sheet into memory.
 */
function cargarConfiguracionDesdeHoja() {
    const ss = getSpreadsheet();
    const hojaConfig = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
    if (!hojaConfig)
        return;
    const datosConfig = hojaConfig.getDataRange().getValues();
    const headers = datosConfig.shift();
    if (!headers || headers.length < 3)
        return;
    const idxCriterio = headers.indexOf("Criterio");
    const idxPerfil = headers.indexOf("Perfil");
    const idxPeso = headers.indexOf("Peso");
    if (idxCriterio === -1 || idxPerfil === -1 || idxPeso === -1)
        return;
    datosConfig.forEach(fila => {
        const criterio = String(fila[idxCriterio]).trim();
        const perfil = String(fila[idxPerfil]).trim();
        const pesoValue = fila[idxPeso];
        const peso = parseFloat(pesoValue);
        if (!criterio || !perfil || isNaN(peso))
            return;
        if (SCORING_PARAMS[criterio]) {
            const criteriaObj = SCORING_PARAMS[criterio];
            if (perfil === "MaxPuntaje") {
                criteriaObj.MaxPuntaje = peso;
            }
            else if (criteriaObj.peso) {
                criteriaObj.peso[perfil] = peso;
            }
        }
    });
    cargarDatosPrograma();
}
/**
 * Loads program data (dates and schedules) from the configuration sheet.
 */
function cargarDatosPrograma() {
    const ss = getSpreadsheet();
    const hojaConfig = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
    if (!hojaConfig)
        return;
    const datosConfig = hojaConfig.getDataRange().getValues();
    // Assuming the first row is headers, skip it for data processing
    const headers = datosConfig.shift();
    if (!headers)
        return; // No headers, no data
    const idxCriterio = headers.indexOf("Criterio");
    const idxPerfil = headers.indexOf("Perfil");
    const idxValor = headers.indexOf("Peso/Valor");
    if (idxCriterio === -1 || idxPerfil === -1 || idxValor === -1)
        return;
    datosConfig.forEach(fila => {
        const criterio = String(fila[idxCriterio]).trim();
        const perfil = String(fila[idxPerfil]).trim();
        const valor = String(fila[idxValor]).trim();
        if (!criterio || !perfil || !valor)
            return;
        if (criterio === "PROGRAMA") {
            if (perfil === "FECHA_LIMITE")
                PROGRAM_DATA.FECHA_LIMITE = valor;
            else if (perfil === "FECHA_INICIO")
                PROGRAM_DATA.FECHA_INICIO = valor;
            else if (perfil === "FECHA_TERMINO")
                PROGRAM_DATA.FECHA_TERMINO = valor;
            else if (perfil === "PAYMENT_URL")
                PROGRAM_DATA.PAYMENT_URL = valor;
            else if (perfil === "DEADLINE_DAYS")
                PROGRAM_DATA.DEADLINE_DAYS = parseInt(valor, 10) || 3;
        }
        else if (criterio.startsWith("HORARIO_")) {
            const nivel = criterio.replace("HORARIO_", "");
            if (PROGRAM_DATA.HORARIOS[nivel]) {
                if (perfil === "Catedra")
                    PROGRAM_DATA.HORARIOS[nivel].catedra = valor;
                else if (perfil === "Ayudantia")
                    PROGRAM_DATA.HORARIOS[nivel].ayudantia = valor;
            }
        }
    });
}
/**
 * Returns current configuration (scoring + program data) for the UI.
 */
function getConfiguracion() {
    cargarConfiguracionDesdeHoja();
    return { scoring: SCORING_PARAMS, program: PROGRAM_DATA };
}
/**
 * Saves configuration from the UI to the spreadsheet.
 */
function saveConfiguracion(mergedData) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
    if (!sheet)
        sheet = ss.insertSheet(CONFIG.SHEETS.CONFIG);
    sheet.clear();
    const rows = [["Criterio", "Perfil", "Peso/Valor"]];
    const data = mergedData.scoring;
    const pData = mergedData.program;
    // 1. Scoring Params
    for (const [criterio, obj] of Object.entries(data)) {
        const c = obj;
        if (c.peso) {
            for (const [perfil, peso] of Object.entries(c.peso)) {
                rows.push([criterio, perfil, peso]);
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
    for (const [nivel, horarios] of Object.entries(pData.HORARIOS)) {
        const h = horarios;
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
function resetConfiguracion() {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
    if (sheet)
        sheet.clear();
    SCORING_PARAMS = JSON.parse(JSON.stringify(DEFAULT_SCORING_PARAMS));
    PROGRAM_DATA = JSON.parse(JSON.stringify(DEFAULT_PROGRAM_DATA));
    return { scoring: SCORING_PARAMS, program: PROGRAM_DATA };
}
function calcularPuntajeTipoPostulante(texto) {
    const norm = texto.toLowerCase();
    if (/acad[eé]mico|funcionario/.test(norm))
        return 2;
    if (/postgrado|posgrado/.test(norm))
        return 1.5;
    return 1;
}
function calcularPuntajeUsoIngles(fila, tipo, idxs) {
    let p = 0;
    const contrib = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_CONTRIBUTION, idxs);
    const normTipo = tipo.toLowerCase();
    let peso = 1;
    if (normTipo.includes("académico") || normTipo.includes("postgrado")) {
        peso = SCORING_PARAMS.UsoIngles.peso.academico;
        const kw = ["investigación", "publicar", "paper", "revista", "indexada", "congreso", "ponente", "expositor", "colaboración internacional", "clases", "docencia"];
        p += contarPalabrasClave(contrib, kw) * 0.8 + 1.0;
    }
    else if (esEstudiante(tipo)) {
        peso = SCORING_PARAMS.UsoIngles.peso.estudiante;
        if (contrib.length > 20)
            p += 0.5;
        const hi = ["intercambio", "magíster", "doctorado", "postgrado", "investigación", "publicar", "congreso", "pasantía"];
        const gen = ["oportunidades", "desarrollo", "competitividad", "laboral", "profesional", "herramienta", "bibliografía", "papers", "libros", "comunicarme"];
        p += contarPalabrasClave(contrib, hi) * 0.75 + contarPalabrasClave(contrib, gen) * 0.25;
    }
    else {
        peso = SCORING_PARAMS.UsoIngles.peso.funcionario;
        const freq = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FREQUENCY, idxs).toLowerCase();
        for (const [k, v] of Object.entries(SCORING_PARAMS.UsoIngles.Frecuencia)) {
            if (freq.includes(k))
                p += v;
        }
        const acts = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_ACTIVITIES, idxs).toLowerCase();
        for (const [a, ps] of Object.entries(SCORING_PARAMS.UsoIngles.Actividades)) {
            if (acts.includes(a))
                p += ps;
        }
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FUTURE_PROJECTS, idxs)))
            p += 1;
    }
    return Math.min(SCORING_PARAMS.UsoIngles.MaxPuntaje, p) * peso;
}
function calcularPuntajeInternacionalizacion(fila, tipo, idxs) {
    let p = 0;
    const peso = SCORING_PARAMS.Internacionalizacion.peso[esEstudiante(tipo) ? "estudiante" : "funcionario"] || 1;
    const docs = !!obtenerValor(fila, CONFIG.COLUMNS.INTL_SUPPORT_DOCS, idxs);
    const etapa = obtenerValor(fila, CONFIG.COLUMNS.INTL_STAGE, idxs).toLowerCase();
    if (etapa.includes("carta de aceptación")) {
        p += 3.5 + (docs ? 0.5 : 0);
    }
    else if (etapa.includes("postulación enviada")) {
        p += 2.5;
    }
    else if (etapa.includes("programa identificado") || etapa.includes("en contacto")) {
        p += 1.5;
    }
    else if (etapa.includes("buscando programa")) {
        p += 0.5;
    }
    const plan = obtenerValor(fila, CONFIG.COLUMNS.INTL_PLAN, idxs);
    p += contarPalabrasClave(plan, SCORING_PARAMS.Internacionalizacion.PalabrasClavePlan) * SCORING_PARAMS.Internacionalizacion.PuntajePorPalabraClave;
    if (esEstudiante(tipo) && (etapa.length > 0 || plan.length > 10)) {
        p += 0.5;
    }
    return Math.min(SCORING_PARAMS.Internacionalizacion.MaxPuntaje, p) * peso;
}
function calcularPuntajeCertificado(fila, idxs) {
    const txt = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_LEVEL, idxs);
    if (/no sé|no se|no tengo/i.test(txt))
        return 0;
    if (/C1/i.test(txt))
        return 5;
    if (/B2\.2/i.test(txt))
        return 4;
    if (/B2\.1/i.test(txt))
        return 3;
    if (/B2/i.test(txt))
        return 3;
    if (/\bexim/i.test(txt))
        return 3;
    if (/B1\+/i.test(txt))
        return 2;
    if (/B1/i.test(txt))
        return 2;
    if (/inglés 4|ingles 4/i.test(txt))
        return 2;
    return 1;
}
function calcularPuntajeAnioIngreso(fila, tipo, idxs) {
    const anio = parseInt(obtenerValor(fila, CONFIG.COLUMNS.ENTRY_YEAR, idxs), 10);
    const current = new Date().getFullYear();
    if (esEstudiante(tipo)) {
        if (anio === current - 2)
            return 2;
        if (anio === current - 1)
            return 1.5;
        if (anio === current - 3)
            return 1;
        if (anio === current)
            return 0.5;
        return 0;
    }
    else {
        if (anio < current - 10)
            return 2;
        if (anio < current - 5)
            return 1;
        return 0.5;
    }
}
function applyConditionalFormattingToScores(sheet, rowCount) {
    sheet.clearConditionalFormatRules();
    if (rowCount <= 1)
        return;
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
function getAnalysisReport() {
    try {
        const ss = getSpreadsheet();
        const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
        const hojaEvaluacion = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
        if (!hojaSeleccionados || !hojaEvaluacion)
            return "Error: Faltan Hojas de datos.";
        const datosS = hojaSeleccionados.getDataRange().getValues();
        const headersS = datosS.shift();
        if (!headersS || datosS.length === 0)
            return "No hay datos en 'Seleccionados'.";
        const idxsS = {
            cat: headersS.indexOf("Categoría Postulante"),
            total: headersS.indexOf("PUNTAJE TOTAL"),
            // ... keep it simple for now or port fully if needed
        };
        const lineas = ["--- ANÁLISIS DE EQUILIBRIO ---"];
        lineas.push(`Total seleccionados: ${datosS.length}`);
        // Portfolio analysis logic from original - simplified for TS/Modular
        const dist = datosS.reduce((acc, f) => {
            const p = esEstudiante(f[idxsS.cat]) ? "Estudiantes" : "Funcionarios";
            acc[p] = (acc[p] || 0) + 1;
            return acc;
        }, {});
        lineas.push(`Estudiantes: ${dist.Estudiantes || 0}`);
        lineas.push(`Funcionarios: ${dist.Funcionarios || 0}`);
        const idxNivelPostulado = headersS.indexOf("Nivel Postulado");
        const distNivel = datosS.reduce((acc, f) => {
            const n = idxNivelPostulado !== -1 ? String(f[idxNivelPostulado]).trim() : "No asignado";
            acc[n] = (acc[n] || 0) + 1;
            return acc;
        }, {});
        lineas.push("\nSeleccionados por Nivel:");
        ["B1+", "B2.1", "B2.2", "C1"].forEach(nivel => {
            lineas.push(`  - ${nivel}: ${distNivel[nivel] || 0} / 15`);
        });
        return lineas.join("\n");
    }
    catch (e) {
        return `Error en el análisis: ${e.message}`;
    }
}
/**
 * Extracts the postulado level from a row based on LEVEL_APPLIED, or falls back to CERTIFICATE_LEVEL.
 */
function obtenerNivelDesdeFila(fila, idxs) {
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
    if (/C1/i.test(txt))
        return "C1";
    if (/B2\.2/i.test(txt))
        return "B2.2";
    if (/B2\.1/i.test(txt))
        return "B2.1";
    if (/\bexim/i.test(txt))
        return "B2.1";
    if (/B2/i.test(txt))
        return "B2.1"; // Map generic B2 to B2.1
    if (/B1\+/i.test(txt))
        return "B1+";
    if (/B1/i.test(txt))
        return "B1+"; // Map generic B1 to B1+
    if (/inglés 4|ingles 4/i.test(txt))
        return "B1+";
    return "B1+"; // Default fallback
}
/**
 * Reset all evaluation sheets and processing status to force a full re-evaluation.
 */
function ejecutarReevaluacionCompleta() {
    const ui = SpreadsheetApp.getUi();
    const respuesta = ui.alert('Confirmar Reevaluación Completa', 'ATENCIÓN: Esto borrará de forma definitiva todas las evaluaciones y selecciones actuales, limpiará el estado de procesamiento de la hoja de respuestas, y volverá a calcular los puntajes de todos los candidatos desde cero.\n\n¿Estás seguro de que deseas continuar?', ui.ButtonSet.YES_NO);
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
                const encabezados = datos[0].map((h) => String(h || "").trim());
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
    }
    catch (e) {
        if (lock.hasLock()) {
            lock.releaseLock();
        }
        ui.alert('Error durante la reevaluación', e.message, ui.ButtonSet.OK);
    }
}
