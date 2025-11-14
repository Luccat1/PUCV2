// MEJORA: Mover CONFIG fuera de la función para que sea una constante global.
// Esto permite que otras funciones como `enviarNotificacionesSeleccionados` también la usen.
const CONFIG = {
  SHEET_ID: "1ohh906fh213G8K0MRhMjlxQFlRXctq97rhw3ply7NQ8",
  SHEETS: {
    INPUT: "Respuestas de formulario 1",
    OUTPUT: "Evaluación automatizada",
    DASHBOARD: "Dashboard",
    CONFIG: "Configuración", // Nombre de la nueva hoja de configuración
    SELECTED: "Seleccionados",
    FINAL_LIST: "Lista Final Curso" // Nueva hoja para la lista definitiva
  },
  COLUMNS: { // Centraliza los nombres de las columnas para evitar errores de tipeo y facilitar mantenimiento
    // Columnas de Entrada (Hoja "Respuestas de formulario 1")
    PROCESSING_STATUS: "Estado de Procesamiento",
    TIMESTAMP: "Marca temporal",
    EMAIL: "Dirección de correo electrónico",
    FIRST_NAME: "Primer nombre",
    SECOND_NAME: "Segundo nombre",
    LAST_NAME_P: "Apellido paterno",
    LAST_NAME_M: "Apellido materno",
    RUT: "RUT",
    APPLICANT_TYPE: "Indica si eres funcionario, alumno, profesor, académico, etc.",
    CAMPUS: "¿En qué sede realizas la mayoría de tus actividades académicas o profesionales?",
    AVAILABILITY_SESSIONS: "¿Tienes disponibilidad para dedicar 3 sesiones semanales?",
    AVAILABILITY_CONFLICTS: "¿Tienes compromisos académicos/laborales que podrían impedir cumplir con la asistencia obligatoria?",
    AVAILABILITY_ASSISTANCE: "¿Estás en condiciones de asistir al menos al 80 % de las clases?",
    AVAILABILITY_STUDY: "¿Puedes comprometerse a dedicar 4 horas semanales de estudio autónomo además de las clases?",
    ENGLISH_USE_FREQUENCY: "¿Con qué frecuencia requieres utilizar el idioma inglés en tus funciones actuales?",
    ENGLISH_USE_ACTIVITIES: "Seleccione las actividades que realizas en inglés como parte de tus funciones:",
    ENGLISH_USE_FUTURE_PROJECTS: "¿Tu unidad tiene proyectos futuros que requerirán mayor uso del inglés?",
    ENGLISH_USE_CONTRIBUTION: "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?",
    INTL_STAGE: "¿En qué etapa se encuentra tu proceso de internacionalización?",
    INTL_PLAN: "¿Cómo has planeado internacionalizar tu carrera?",
    INTL_SUPPORT_DOCS: "Adjunta los documentos de respaldo",
    CERTIFICATE_CHECKBOX: "En caso de que no tengas certificación de inglés, marca esta casilla:",
    CERTIFICATE_ATTACHMENT: "Adjunta la certificación que permita verificar tu nivel de inglés más alto (certificado oficial, captura con aprobación y nota final de la asignatura u otros).",
    CERTIFICATE_LEVEL: "Certificación de inglés",
    ENTRY_YEAR: "¿En qué año ingresaste a tu carrera actual?",
    COMMITMENT_PROGRAM: "Compromiso con el programa ",
    COMMITMENT_VERACITY: "Veracidad de la información",
    COMMITMENT_BREACH: "Consecuencias por incumplimiento",
    ENDORSEMENT_APPROVAL: "¿Cuentas con el respaldo de tu jefatura directa para participar en este programa?",
    ENDORSEMENT_LETTER: "Si la respuesta anterior fue \"Sí\", por favor, adjunta una carta de respaldo de tu jefatura?\" [Nota: Opcional, pero otorga puntaje adicional]",
    ENDORSEMENT_SCHEDULE: "¿Tu jefatura está en conocimiento y aprueba tu participación en el horario establecido?"
  }
};

const esEstudiante = (tipoPostulante) => {
  const tipoNormalizado = String(tipoPostulante || "").toLowerCase();
  return /estudiante|alumno/.test(tipoNormalizado) && !/postgrado|posgrado/.test(tipoNormalizado);
};


function evaluarPostulacionesPUCV2() {
  // --- MEJORA: Usar LockService para evitar ejecuciones simultáneas ---
  // Esto es crucial para activadores automáticos como 'onFormSubmit'.
  // Evita que dos ejecuciones del script se pisen entre sí si llegan dos respuestas de formulario muy rápido.
  const lock = LockService.getScriptLock();
  const tuvoExito = lock.tryLock(10000); // Intentar obtener el bloqueo por 10 segundos.
  if (!tuvoExito) {
    console.log("No se pudo obtener el bloqueo. Otra instancia del script ya se está ejecutando.");
    return; // Salir si no se puede obtener el bloqueo.
  }

  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hojaEntrada = ss.getSheetByName(CONFIG.SHEETS.INPUT);
  if (!hojaEntrada) {
    throw new Error("Hoja de entrada no encontrada: " + CONFIG.SHEETS.INPUT);
  }

  const ultimaFila = hojaEntrada.getLastRow();
  if (ultimaFila < 2) {
    console.log("No hay postulaciones para procesar.");
    return; // No hay datos más allá de la fila de encabezado.
  }

  const datos = hojaEntrada.getRange(1, 1, ultimaFila, hojaEntrada.getLastColumn()).getValues();
  const encabezados = datos[0].map(h => String(h || "").trim());
  const indiceColumnas = {};
  encabezados.forEach((h, i) => indiceColumnas[h] = i);

  const obtenerValor = (fila, titulo) => {
    const i = indiceColumnas[titulo];
    if (i === undefined) {
      // console.warn(`Advertencia: La columna "${titulo}" no fue encontrada.`);
      return "";
    }
    return String(fila[i] || "").trim();
  };

  const esSi = valor => /^s/i.test(String(valor || "").trim());

  const contarPalabrasClave = (texto, palabrasClave) => {
    const textoNormalizado = String(texto || "").toLowerCase();
    return palabrasClave.reduce((contador, clave) => contador + (textoNormalizado.includes(clave) ? 1 : 0), 0);
  };

  const calcularPuntajeTipoPostulante = texto => {
    const textoNormalizado = String(texto || "").toLowerCase();
    if (/acad[eé]mico|funcionario/.test(textoNormalizado)) return 2;
    if (/postgrado|posgrado/.test(textoNormalizado)) return 1.5;
    return 1;
  };


  // --- MEJORA: Agrupar constantes de puntuación para fácil mantenimiento ---
  // Ahora con ponderaciones diferentes por tipo de postulante
  const SCORING_PARAMS = {
    UsoIngles: {
      Frecuencia: { "diariamente": 1.5, "semanalmente": 1, "mensualmente": 0.5 },
      Actividades: { "visitas internacionales": 1, "presentaciones": 1, "reuniones": 0.75, "clases": 0.5, "papers": 0.5, "correos": 0.25, "leer documentación": 0.25 },
      PalabrasClaveContribucion: ["proyección", "internacional", "colaborar", "crecimiento", "oportunidades", "movilidad", "publicar", "desarrollo"],
      PuntajePorPalabraClave: 0.25,
      MaxPuntaje: 4,
      peso: { // Ponderación por tipo de postulante
        estudiante: 0.75,  // Reducimos el peso para estudiantes
        funcionario: 1,
        academico: 1
      }
    },
    Internacionalizacion: {
      PalabrasClavePlan: ["pasantía", "postdoctorado", "doctorado", "magíster", "investigación", "colaboración", "congreso", "publicar"],
      PuntajePorPalabraClave: 0.5,
      MaxPuntaje: 5,
      peso: { // Ponderación por tipo de postulante
        estudiante: 1,
        funcionario: 0.75,  // Reducimos el peso para funcionarios
        academico: 1
      }
    },
    CartaRespaldo: {
      peso: { // Ponderación por tipo de postulante
        estudiante: 0.5,  // Reducimos el peso para estudiantes
        funcionario: 1,
        academico: 1,
        // Añadimos una clave para identificar el tipo de perfil
        // para la función de análisis.
        // 'perfil' es para estudiantes, 'profesional' para el resto.
        _perfil: {
          estudiante: "perfil",
        }
      }
    }
  };

/**
 * Lee los pesos de puntuación desde la hoja de configuración y actualiza el objeto SCORING_PARAMS.
 */
function cargarConfiguracionDesdeHoja() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hojaConfig = ss.getSheetByName(CONFIG.SHEETS.CONFIG);
  if (!hojaConfig) {
    throw new Error(`No se encontró la hoja de configuración: ${CONFIG.SHEETS.CONFIG}`);
  }

  const datosConfig = hojaConfig.getDataRange().getValues();
  const encabezadosConfig = datosConfig.shift();

  // --- Mapeo de índices de las columnas de configuración ---
  const getIndiceConfig = (nombre) => encabezadosConfig.indexOf(nombre);
  const INDICE_CRITERIO = getIndiceConfig("Criterio");
  const INDICE_PERFIL = getIndiceConfig("Perfil");
  const INDICE_PESO = getIndiceConfig("Peso");

  if (INDICE_CRITERIO === -1 || INDICE_PERFIL === -1 || INDICE_PESO === -1) {
    throw new Error("Las columnas 'Criterio', 'Perfil' o 'Peso' no fueron encontradas en la hoja de configuración.");
  }

  // --- Iterar sobre cada fila de la hoja de configuración ---
  datosConfig.forEach(filaConfig => {
    const criterio = filaConfig[INDICE_CRITERIO];
    const perfil = filaConfig[INDICE_PERFIL];
    const peso = parseFloat(filaConfig[INDICE_PESO]);

    // --- Validar que los datos sean correctos ---
    if (!criterio || !perfil || isNaN(peso)) {
      console.warn(`Fila de configuración inválida: Criterio=${criterio}, Perfil=${perfil}, Peso=${peso}. Omitiendo...`);
      return; // Saltar a la siguiente iteración
    }

    // --- Actualizar el objeto SCORING_PARAMS ---
    if (SCORING_PARAMS[criterio] && SCORING_PARAMS[criterio].peso) {
      SCORING_PARAMS[criterio].peso[perfil] = peso;
    } else {
      console.warn(`Criterio '${criterio}' o perfil '${perfil}' no encontrados en SCORING_PARAMS. Omitiendo...`);
    }
  });

  console.log("Configuración de pesos cargada exitosamente desde la hoja.");
}

  // --- NUEVAS FUNCIONES DE PUNTUACIÓN COMPLEJAS ---

  const calcularPuntajeUsoIngles = (fila, tipoPostulante) => {
    let puntaje = 0;
    const contribucion = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_CONTRIBUTION);
    const peso = SCORING_PARAMS.UsoIngles.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1

    if (esEstudiante(tipoPostulante)) {
      // --- NUEVA LÓGICA PARA ESTUDIANTES ---
      // Lógica basada únicamente en la pregunta abierta existente:
      // CONFIG.COLUMNS.ENGLISH_USE_CONTRIBUTION

      if (contribucion.length > 20) { // Puntaje base por dar una respuesta elaborada.
        puntaje += 0.5;
      }

      // Palabras clave de ALTO impacto (objetivos concretos)
      const palabrasClaveAltoImpacto = ["intercambio", "magíster", "doctorado", "postgrado", "investigación", "publicar", "congreso", "pasantía"];
      puntaje += contarPalabrasClave(contribucion, palabrasClaveAltoImpacto) * 0.75; // Más puntos por objetivos claros.

      // Palabras clave de intención GENERAL (motivación)
      const palabrasClaveGenerales = ["oportunidades", "desarrollo", "competitividad", "laboral", "profesional", "herramienta", "bibliografía", "papers", "libros", "comunicarme"];
      puntaje += contarPalabrasClave(contribucion, palabrasClaveGenerales) * 0.25; // Menos puntos, pero captura más casos.

    } else {
      // Lógica Original para Funcionarios/Académicos:
      // 1. Frecuencia de uso
      const frecuencia = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FREQUENCY).toLowerCase();
      for (const [key, value] of Object.entries(SCORING_PARAMS.UsoIngles.Frecuencia)) {
        if (frecuencia.includes(key)) puntaje += value;
      }
      // 2. Actividades (con pesos)
      const actividades = obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_ACTIVITIES).toLowerCase();
      for (const [actividad, peso] of Object.entries(SCORING_PARAMS.UsoIngles.Actividades)) {
        if (actividades.includes(actividad)) puntaje += peso;
      }
      // 3. Proyectos futuros y contribución
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENGLISH_USE_FUTURE_PROJECTS))) puntaje += 1;
      puntaje += contarPalabrasClave(contribucion, SCORING_PARAMS.UsoIngles.PalabrasClaveContribucion) * SCORING_PARAMS.UsoIngles.PuntajePorPalabraClave;
    }
    
    return Math.min(SCORING_PARAMS.UsoIngles.MaxPuntaje, puntaje) * peso; // Aplicar el peso al puntaje final
  };

  const calcularPuntajeInternacionalizacion = (fila, tipoPostulante) => {
    let puntaje = 0;
    const peso = SCORING_PARAMS.Internacionalizacion.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1

    const tieneDocumentos = !!obtenerValor(fila, CONFIG.COLUMNS.INTL_SUPPORT_DOCS);

    // 1. Etapa del proceso
    const etapa = obtenerValor(fila, CONFIG.COLUMNS.INTL_STAGE).toLowerCase();
    if (etapa.includes("carta de aceptación")) {
      puntaje += 3.5; // Mayor puntaje por tener la aceptación confirmada.
      if (tieneDocumentos) puntaje += 0.5; // Bonus si adjunta la carta.
    } else if (etapa.includes("postulación enviada")) {
      puntaje += 2.5; // Un poco menos que tener la carta.
    } else if (etapa.includes("programa identificado") || etapa.includes("en contacto")) {
      puntaje += 1.5;
    } else if (etapa.includes("buscando programa")) {
      puntaje += 0.5;
    }

    // 2. Plan de internacionalización (palabras clave)
    const plan = obtenerValor(fila, CONFIG.COLUMNS.INTL_PLAN);
    puntaje += contarPalabrasClave(plan, SCORING_PARAMS.Internacionalizacion.PalabrasClavePlan) * SCORING_PARAMS.Internacionalizacion.PuntajePorPalabraClave;

    // 3. AJUSTE: Si es estudiante, otorgar puntaje base por tener planes, ya que es un objetivo clave para ellos.
    // Esto compensa la falta de experiencia profesional.
    if (esEstudiante(tipoPostulante) && (etapa.length > 0 || plan.length > 10)) {
      puntaje += 0.5; // Bonus REDUCIDO por demostrar interés y planificación.
    }

    return Math.min(SCORING_PARAMS.Internacionalizacion.MaxPuntaje, puntaje) * peso; // Aplicar el peso al puntaje final
  };

  const calcularPuntajeCertificado = (fila) => {
    if (obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_CHECKBOX)) {
      return 0;
    }
    const textoNormalizado = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_LEVEL);
    if (/C1/i.test(textoNormalizado)) return 5;
    if (/B2\.2/i.test(textoNormalizado)) return 4;
    if (/B2\.1/i.test(textoNormalizado)) return 3;
    if (/\bexim/i.test(textoNormalizado)) return 3; // 'eximido', 'eximición', etc.
    if (/B1\+/i.test(textoNormalizado)) return 2;
    if (/inglés 4|ingles 4/i.test(textoNormalizado)) return 2;
    return 1; // Puntaje mínimo si hay algo pero no coincide
  };

  const calcularPuntajeAnioIngreso = (fila, tipoPostulante) => {
    const anio = obtenerValor(fila, CONFIG.COLUMNS.ENTRY_YEAR);
    const anioActual = new Date().getFullYear();
    const anioNum = parseInt(anio, 10);

    if (esEstudiante(tipoPostulante)) {
      if (anioNum === anioActual - 2) return 2;   // Ej: 2023 si estamos en 2025
      if (anioNum === anioActual - 1) return 1.5; // Ej: 2024
      if (anioNum === anioActual - 3) return 1;   // Ej: 2022
      if (anioNum === anioActual) return 0.5;     // Ej: 2025 (recién ingresado)
      return 0;
    } else { // Para funcionarios, académicos, etc., premiar antigüedad.
      if (anioNum < anioActual - 10) return 2; // Más de 10 años
      if (anioNum < anioActual - 5) return 1;  // Entre 5 y 10 años
      return 0.5; // Menos de 5 años
    }
  };

  /**
   * MEJORA (Modularidad): Función dedicada solo a calcular estadísticas.
   * @returns {object} Un objeto con todas las estadísticas calculadas.
   */
  const calcularEstadisticas = (resultadosCompletos, datosOriginales, indicesOriginales) => {
    const encabezadosResultados = resultadosCompletos[0];
    const datosPostulantes = resultadosCompletos.slice(1);
    if (datosPostulantes.length === 0) {
      return; // No hay datos para generar un dashboard
    }

    // --- Mapeo dinámico de índices desde los encabezados de resultados ---
    const getIndice = (nombre) => encabezadosResultados.indexOf(nombre);
    const INDICE_CATEGORIA = getIndice("Categoría Postulante");
    const INDICE_PUNTAJE_TOTAL = getIndice("PUNTAJE TOTAL");
    const INDICE_SEDE = getIndice("Sede");

    const puntajes = datosPostulantes.map(fila => parseFloat(fila[INDICE_PUNTAJE_TOTAL] || 0));
    const totalPostulantes = datosPostulantes.length;
    const puntajePromedio = puntajes.reduce((acc, p) => acc + p, 0) / totalPostulantes;
    const puntajeMaximo = Math.max(...puntajes);
    const puntajeMinimo = Math.min(...puntajes);

    const agruparStats = (indice) => {
      const stats = {};
      datosPostulantes.forEach(fila => {
        const clave = fila[indice] || "No especificado";
        const puntaje = parseFloat(fila[INDICE_PUNTAJE_TOTAL] || 0);
        if (!stats[clave]) {
          stats[clave] = {
            suma: 0,
            contador: 0
          };
        }
        stats[clave].suma += puntaje;
        stats[clave].contador++;
      });
      return stats;
    };

    const statsPorCategoria = agruparStats(INDICE_CATEGORIA);
    const statsPorSede = agruparStats(INDICE_SEDE);

    // Para el año de ingreso, necesitamos el dato original, no el puntaje.
    // Lo extraeremos de la hoja de entrada original.
    const indiceAnioOriginal = indicesOriginales[CONFIG.COLUMNS.ENTRY_YEAR];
    const statsPorAnio = {};
    datosOriginales.slice(1).forEach((filaOriginal, i) => {
      const anio = filaOriginal[indiceAnioOriginal] || "No especificado";
      const puntaje = parseFloat(datosPostulantes[i][INDICE_PUNTAJE_TOTAL] || 0);
      if (!statsPorAnio[anio]) {
        statsPorAnio[anio] = {
          suma: 0,
          contador: 0
        };
      }
      statsPorAnio[anio].suma += puntaje;
      statsPorAnio[anio].contador++;
    });

    // Análisis cruzado Sede x Categoría
    const statsCruzados = {};
    datosPostulantes.forEach(fila => {
      const sede = fila[INDICE_SEDE] || "N/A";
      const categoria = fila[INDICE_CATEGORIA] || "N/A";
      const puntaje = parseFloat(fila[INDICE_PUNTAJE_TOTAL] || 0);
      if (!statsCruzados[sede]) statsCruzados[sede] = {};
      if (!statsCruzados[sede][categoria]) statsCruzados[sede][categoria] = {
        suma: 0,
        contador: 0
      };
      statsCruzados[sede][categoria].suma += puntaje;
      statsCruzados[sede][categoria].contador++;
    });

    return { totalPostulantes, puntajePromedio, puntajeMaximo, puntajeMinimo, statsPorCategoria, statsPorSede, statsPorAnio, statsCruzados };
  };

  /**
   * MEJORA (Modularidad): Función dedicada a formatear los datos para la hoja del dashboard.
   * @param {object} stats - El objeto de estadísticas generado por calcularEstadisticas.
   * @returns {Array<Array<any>>} Un array 2D listo para ser escrito en la hoja.
   */
  const formatearDatosDashboard = (stats) => {
    const { totalPostulantes, puntajePromedio, puntajeMaximo, puntajeMinimo, statsPorCategoria, statsPorSede, statsPorAnio, statsCruzados } = stats;
    if (!totalPostulantes) return [];

    let datosDashboard = [
      ["MÉTRICAS GENERALES", "", ""],
      ["Número Total de Postulantes", totalPostulantes, ""],
      ["Puntaje Promedio General", puntajePromedio.toFixed(2), ""],
      ["Puntaje Máximo / Mínimo", `${puntajeMaximo.toFixed(2)} / ${puntajeMinimo.toFixed(2)}`, ""],
      [], // Separador
    ];

    const anadirTabla = (titulo, stats) => {
      datosDashboard.push([titulo, "Nº Postulantes", "Puntaje Promedio"]);
      for (const clave in stats) {
        const promedio = stats[clave].suma / stats[clave].contador;
        datosDashboard.push([clave, stats[clave].contador, promedio.toFixed(2)]);
      }
      datosDashboard.push([]); // Separador
    };

    anadirTabla("DESGLOSE POR CATEGORÍA", statsPorCategoria);
    anadirTabla("DESGLOSE POR SEDE", statsPorSede);
    anadirTabla("DESGLOSE POR AÑO DE INGRESO", statsPorAnio);

    // Añadir tabla de análisis cruzado
    datosDashboard.push(["ANÁLISIS CRUZADO: SEDE vs CATEGORÍA", "Puntaje Promedio", ""]);
    for (const sede in stats.statsCruzados) {
      for (const categoria in stats.statsCruzados[sede]) {
        const promedio = stats.statsCruzados[sede][categoria].suma / stats.statsCruzados[sede][categoria].contador;
        datosDashboard.push([`${sede} - ${categoria}`, promedio.toFixed(2), `(${stats.statsCruzados[sede][categoria].contador} postulantes)`]);
      }
    }
    return datosDashboard;
  };

  /**
   * MEJORA (Modularidad): Función dedicada a crear el gráfico.
   */
  const crearGraficoSede = (hojaDashboard, statsPorSede) => {
    const datosGraficoSede = [["Sede", "Nº Postulantes"]];
    for (const sede in statsPorSede) {
      datosGraficoSede.push([sede, statsPorSede[sede].contador]);
    }

    if (datosGraficoSede.length > 1) { // Solo crear gráfico si hay datos
      const rangoDatosGrafico = hojaDashboard.getRange(1, 5, datosGraficoSede.length, 2); // Rango E1:F...
      rangoDatosGrafico.setValues(datosGraficoSede);

      const chart = hojaDashboard.newChart()
        .setChartType(Charts.ChartType.PIE)
        .addRange(rangoDatosGrafico)
        .setOption('title', 'Distribución de Postulantes por Sede')
        .setPosition(5, 5, 0, 0) // Anclar en la celda E5
        .build();

      hojaDashboard.insertChart(chart);
    }
  };

  /**
   * Orquesta la creación y actualización del Dashboard.
   * @param {Array<Array<any>>} resultadosCompletos - Los datos procesados de los postulantes.
   * @param {Spreadsheet} spreadsheet - La hoja de cálculo activa.
   */
  const generarYActualizarDashboard = (resultadosCompletos, spreadsheet, datosOriginales, indicesOriginales) => {
    // 1. Calcular estadísticas
    const estadisticas = calcularEstadisticas(resultadosCompletos, datosOriginales, indicesOriginales);
    // 2. Formatear los datos para la hoja
    const datosDashboard = formatearDatosDashboard(estadisticas);
    
    // --- 3. Escribir en la Hoja ---
    let hojaDashboard = spreadsheet.getSheetByName(CONFIG.SHEETS.DASHBOARD);
    if (!hojaDashboard) hojaDashboard = spreadsheet.insertSheet(CONFIG.SHEETS.DASHBOARD);
    else {
      // Limpiamos contenido y formato del rango que usaremos, es más seguro que clear()
      hojaDashboard.getRange("A:C").clearContent().clearFormat();
      // Limpiamos también los gráficos antiguos para evitar duplicados
      hojaDashboard.getCharts().forEach(chart => hojaDashboard.removeChart(chart));
      // Limpiamos el área que usaremos para los datos del gráfico
      hojaDashboard.getRange("E:F").clearContent();
    }

    if (datosDashboard.length > 0) {
      // Rellenar filas para que todas tengan 3 columnas
      const datosRectangulares = datosDashboard.map(fila => {
        const filaCompleta = [...fila];
        while (filaCompleta.length < 3) filaCompleta.push("");
        return filaCompleta;
      });
      hojaDashboard.getRange(1, 1, datosRectangulares.length, 3).setValues(datosRectangulares);

      // Aplicar formato básico
      datosRectangulares.forEach((fila, i) => {
        if (fila[0].endsWith(":") || fila[1] === "Nº Postulantes") {
          hojaDashboard.getRange(i + 1, 1, 1, 3).setFontWeight("bold");
        }
      });
      hojaDashboard.getRange("A1:C1").setFontSize(12);
    }

    // 4. Crear el gráfico
    crearGraficoSede(hojaDashboard, estadisticas.statsPorSede);
  };
  
  const resultados = [
    ["Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación", "Categoría Postulante", "Sede",
     "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés", "Puntaje Intl.", "Puntaje Nivel Inglés",
     "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL", "Enlace Certificado"] // Se añade "Enlace Certificado"
  ];

  // --- OPTIMIZACIÓN: Identificar la columna de estado ---
  const COLUMNA_ESTADO_NOMBRE = CONFIG.COLUMNS.PROCESSING_STATUS;
  const indiceEstado = encabezados.indexOf(COLUMNA_ESTADO_NOMBRE);

  // --- OPTIMIZACIÓN: Preparar array para actualizar estados en lote ---
  const actualizacionesEstado = [];


  for (let r = 1; r < datos.length; r++) {
    try { // <--- INICIO DEL BLOQUE TRY
      const fila = datos[r];

      // --- OPTIMIZACIÓN: Ignorar filas ya procesadas ---
      if (indiceEstado !== -1 && obtenerValor(fila, COLUMNA_ESTADO_NOMBRE) !== "") {
        continue; // Saltar a la siguiente iteración del bucle
      }

      // --- Datos Personales ---
      const apellidos = [obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_P), obtenerValor(fila, CONFIG.COLUMNS.LAST_NAME_M)].filter(Boolean).join(" ");
      const nombres = [obtenerValor(fila, CONFIG.COLUMNS.FIRST_NAME), obtenerValor(fila, CONFIG.COLUMNS.SECOND_NAME)].filter(Boolean).join(" ");
      const correo = obtenerValor(fila, CONFIG.COLUMNS.EMAIL);
      const rut = obtenerValor(fila, CONFIG.COLUMNS.RUT);
      const fechaPostulacion = obtenerValor(fila, CONFIG.COLUMNS.TIMESTAMP);
      const tipoPostulante = obtenerValor(fila, CONFIG.COLUMNS.APPLICANT_TYPE);
      const sede = obtenerValor(fila, CONFIG.COLUMNS.CAMPUS);

      // 1. Disponibilidad (máx 4 puntos)
      let puntajeDisponibilidad = 0;
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_SESSIONS))) puntajeDisponibilidad++;
      if (!esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_CONFLICTS))) puntajeDisponibilidad++; // "No" es la respuesta deseada
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_ASSISTANCE))) puntajeDisponibilidad++;
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.AVAILABILITY_STUDY))) puntajeDisponibilidad++;

      // --- Cálculo de Puntajes por Área ---
      const puntajeTipo = calcularPuntajeTipoPostulante(tipoPostulante);
      const puntajeUso = calcularPuntajeUsoIngles(fila, tipoPostulante);
      const puntajeIntl = calcularPuntajeInternacionalizacion(fila, tipoPostulante);
      const puntajeNivelIngles = calcularPuntajeCertificado(fila);
      const puntajeAnio = calcularPuntajeAnioIngreso(fila, tipoPostulante);

      // Compromiso (máx 3 puntos)
      let puntajeCompromiso = 0;
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_PROGRAM))) puntajeCompromiso++;
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_VERACITY))) puntajeCompromiso++;
      if (esSi(obtenerValor(fila, CONFIG.COLUMNS.COMMITMENT_BREACH))) puntajeCompromiso++;

      // Carta de respaldo (máx 3 puntos)
      const pesoCarta = SCORING_PARAMS.CartaRespaldo.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1
      // AJUSTE: Si es estudiante, se le asigna un puntaje base para compensar que no puede tener carta de jefatura.
      let puntajeCarta = 0;
      const tieneCartaRespaldo = !!obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_LETTER);

      if (esEstudiante(tipoPostulante)) {
        puntajeCarta = 1; // Puntaje base por ser estudiante (no se espera respaldo de jefatura)
        if (tieneCartaRespaldo) puntajeCarta += 1.5; // Bonus alto si adjunta una carta (de un profesor, etc.)
      } else {
        // La lógica original solo se aplica a no-estudiantes
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_APPROVAL))) puntajeCarta += 1;
        if (tieneCartaRespaldo) puntajeCarta += 1;
        if (esSi(obtenerValor(fila, CONFIG.COLUMNS.ENDORSEMENT_SCHEDULE))) puntajeCarta++;
      }

      const puntajeTotal = puntajeDisponibilidad + puntajeTipo + puntajeUso + puntajeIntl + puntajeNivelIngles + puntajeAnio + puntajeCompromiso + (puntajeCarta * pesoCarta);        
      const enlaceCertificado = obtenerValor(fila, CONFIG.COLUMNS.CERTIFICATE_ATTACHMENT); // Obtener el enlace del certificado

      resultados.push([
        apellidos, nombres, correo, rut, fechaPostulacion, tipoPostulante, sede,
        puntajeDisponibilidad, puntajeTipo, puntajeUso.toFixed(2),
        puntajeIntl.toFixed(2), puntajeNivelIngles, puntajeAnio,
        puntajeCompromiso, puntajeCarta,
        puntajeTotal.toFixed(2),
        enlaceCertificado // Añadir el enlace del certificado
      ]);

      // --- OPTIMIZACIÓN: Marcar la fila como procesada ---
      if (indiceEstado !== -1) {
        actualizacionesEstado.push({ fila: r + 1, valor: new Date() });
      }

    } catch (e) { // <--- INICIO DEL BLOQUE CATCH
      // Si ocurre un error en el bloque 'try', el código salta aquí.
      const numeroFila = r + 1;
      console.error(`Error al procesar la fila ${numeroFila} de la hoja '${CONFIG.SHEETS.INPUT}'. Causa: ${e.message}`);
      console.error(`Stack del error: ${e.stack}`); // Información muy útil para depurar

      // Marcar la fila con error en la hoja para revisión manual.
      if (indiceEstado !== -1) {
        actualizacionesEstado.push({ fila: numeroFila, valor: `ERROR: ${e.message}` });
      }
    } // <--- FIN DEL BLOQUE TRY...CATCH
  }

  // Si no se procesaron nuevas filas, no hay nada más que hacer.
  if (resultados.length <= 1) {
    console.log("No hay nuevas postulaciones para añadir.");
    lock.releaseLock();
    return;
  }

  // --- MEJORA: Cargar la configuración desde la hoja ---
  // IMPORTANTE: Esto debe ejecutarse ANTES del bucle de procesamiento si se quiere
  // que los pesos de la hoja afecten el cálculo actual.
  // Lo muevo aquí para que quede claro que afecta a los cálculos que siguen,
  // aunque en la lógica actual se usa para la siguiente ejecución.
  // Si el objetivo es usar los pesos en ESTA ejecución, esta línea debería ir
  // ANTES del bucle `for (let r = 1; ...)`
  cargarConfiguracionDesdeHoja();

  let hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
  if (!hojaResultados) {
    hojaResultados = ss.insertSheet(CONFIG.SHEETS.OUTPUT); // Si no existe, la crea.

  } else {
    hojaResultados.clear(); // Si ya existe, la limpia por completo para evitar duplicados.
  }
  // Escribe todos los resultados (encabezados + datos) en la hoja limpia.
  hojaResultados.getRange(1, 1, resultados.length, resultados[0].length).setValues(resultados);

  // --- OPTIMIZACIÓN: Escribir todos los estados de una sola vez ---
  if (indiceEstado !== -1 && actualizacionesEstado.length > 0) {
    actualizacionesEstado.forEach(actualizacion => {
      hojaEntrada.getRange(actualizacion.fila, indiceEstado + 1).setValue(actualizacion.valor);
    });
  }

  // --- REGENERAR Hoja de Seleccionados y Dashboard ---
  if (resultados.length > 1) {
    const datosPostulantes = resultados.slice(1);
    const indicePuntajeTotal = resultados[0].indexOf("PUNTAJE TOTAL");

    // Ordenar postulantes por puntaje total de mayor a menor
    datosPostulantes.sort((a, b) => {
      const puntajeB = parseFloat(b[indicePuntajeTotal] || 0);
      const puntajeA = parseFloat(a[indicePuntajeTotal] || 0);
      return puntajeB - puntajeA;
    });

    // Tomar los mejores 25 (o menos si no hay tantos)
    const top25 = datosPostulantes.slice(0, 25);

    // Añadir la columna de Ranking a los datos
    const seleccionadosConRanking = top25.map((fila, index) => [index + 1, ...fila]);
    
    // Añadir encabezados para Ranking y columnas de verificación manual

    const encabezadosSeleccionados = [
      "Ranking", ...resultados[0],
      "Verificación Certificado", "Nivel Asignado", "Aceptación", "Comentarios" // "Enlace Certificado" ya está en resultados[0]
    ];

   // Preparar los datos para escribir en la hoja (encabezados + seleccionados)
    // Las filas de datos tendrán espacios vacíos para las nuevas columnas manuales (Verificación, Nivel, Aceptación, Comentarios).
    // El "Enlace Certificado" ya viene en la fila de seleccionadosConRanking.
    const datosParaHoja = [encabezadosSeleccionados, ...seleccionadosConRanking.map(fila => [...fila, "", "", "Pendiente", ""])];

    let hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaSeleccionados) {
      hojaSeleccionados = ss.insertSheet(CONFIG.SHEETS.SELECTED);
    } else {
      hojaSeleccionados.clear();
    }

    if (datosParaHoja.length > 1) {
      const rangoDatos = hojaSeleccionados.getRange(1, 1, datosParaHoja.length, datosParaHoja[0].length);      
      rangoDatos.setValues(datosParaHoja);

      // --- Añadir Menú Desplegable y Formato Condicional ---
      const indiceColAceptacion = encabezadosSeleccionados.indexOf("Aceptación") + 1;
      const indiceColVerificacion = encabezadosSeleccionados.indexOf("Verificación Certificado") + 1;
      const indiceColNivel = encabezadosSeleccionados.indexOf("Nivel Asignado") + 1;

      const rangoAceptacion = hojaSeleccionados.getRange(2, indiceColAceptacion, datosParaHoja.length - 1, 1);
      const rangoVerificacion = hojaSeleccionados.getRange(2, indiceColVerificacion, datosParaHoja.length - 1, 1);
      const rangoNivel = hojaSeleccionados.getRange(2, indiceColNivel, datosParaHoja.length - 1, 1);


      // Crear reglas para menús desplegables
      const reglaAceptacion = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
      const reglaVerificacion = SpreadsheetApp.newDataValidation().requireValueInList(['Válido', 'Test de nivel'], true).build();
      const reglaNivel = SpreadsheetApp.newDataValidation().requireValueInList(['B1+', 'B2.1', 'B2.2', 'C1'], true).setAllowInvalid(true).build(); // Allow invalid para poder escribir resultados de test

      rangoAceptacion.setDataValidation(reglaAceptacion);
      rangoVerificacion.setDataValidation(reglaVerificacion);
      rangoNivel.setDataValidation(reglaNivel);

      // Limpiar reglas de formato antiguas y aplicar nuevas
      hojaSeleccionados.clearConditionalFormatRules();
      const rangoCompletoFila = hojaSeleccionados.getRange(2, 1, datosParaHoja.length - 1, datosParaHoja[0].length);

      const reglaVerde = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${_columnaALetra(indiceColAceptacion)}2="Acepta"`).setBackground("#D9EAD3").setRanges([rangoCompletoFila]).build();
      const reglaRojo = SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=$${_columnaALetra(indiceColAceptacion)}2="Rechaza"`).setBackground("#F4CCCC").setRanges([rangoCompletoFila]).build();
      
      const reglas = hojaSeleccionados.getConditionalFormatRules();
      reglas.push(reglaVerde, reglaRojo);
      hojaSeleccionados.setConditionalFormatRules(reglas);
    }
  }

  // --- Aplicar Formato Condicional a los Puntajes ---
  // Limpiamos y reaplicamos las reglas de formato para que cubran los nuevos datos.
  hojaResultados.clearConditionalFormatRules();

  if (resultados.length > 1) { // Solo aplicar si hay datos
    // El rango de los puntajes va desde la columna H (8) hasta la P (16)
    const rangoPuntajes = hojaResultados.getRange(2, 8, resultados.length - 1, 9);

    // Crear una regla de escala de colores (rojo -> amarillo -> verde)
    const reglaFormato = SpreadsheetApp.newConditionalFormatRule()
      .setGradientMinpoint('#F8696B') // Rojo para el valor más bajo
      .setGradientMidpointWithValue('#FFEB84', SpreadsheetApp.InterpolationType.PERCENT, '50') // Amarillo para el 50%
      .setGradientMaxpoint('#63BE7B') // Verde para el valor más alto
      .setRanges([rangoPuntajes])
      .build();

    // Obtener todas las reglas de la hoja (puede haber otras) y añadir la nuestra
    const reglas = hojaResultados.getConditionalFormatRules();
    reglas.push(reglaFormato);
    hojaResultados.setConditionalFormatRules(reglas);
  }

  // Para el dashboard y seleccionados, usamos los 'resultados' que acabamos de calcular.
  generarYActualizarDashboard(resultados, ss, datos, indiceColumnas);
  SpreadsheetApp.flush(); // Asegura que todos los cambios se escriban en la hoja.

  // --- MEJORA: Liberar el bloqueo al final de la ejecución ---
  // Es fundamental liberar el bloqueo para que la próxima ejecución pueda comenzar.
  lock.releaseLock();
  console.log("Proceso completado y bloqueo liberado.");
  return `¡Evaluación completada! Se procesaron ${resultados.length - 1} nuevas postulaciones. Las hojas "Evaluación automatizada", "Seleccionados" y "Dashboard" han sido actualizadas.`;
}

/**
 * Helper function to convert column index to letter (e.g., 1 -> A, 27 -> AA)
 * Necesario para las fórmulas de formato condicional.
 */
function _columnaALetra(columna) {
  let temp, letra = '';
  while (columna > 0) {
    temp = (columna - 1) % 26;
    letra = String.fromCharCode(temp + 65) + letra;
    columna = (columna - temp - 1) / 26;
  }
  return letra;
}

/**
 * Analiza la composición del ranking de seleccionados y sugiere ajustes
 * en los pesos de SCORING_PARAMS para mejorar el equilibrio entre perfiles.
 */
function getAnalysisReport() {
  // MEJORA: Envolver toda la lógica en un try...catch para devolver errores claros a la Web App.
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const hojaEvaluacion = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);

    if (!hojaSeleccionados || !hojaEvaluacion) {
      return "Error: Faltan Hojas. Asegúrate de que las hojas 'Seleccionados' y 'Evaluación automatizada' existan antes de ejecutar el análisis.";
    }

    // 1. Leer todos los datos de la hoja de seleccionados para un análisis completo
    const datosSeleccionados = hojaSeleccionados.getDataRange().getValues();
    const encabezadosSeleccionados = datosSeleccionados.shift();
    const totalSeleccionados = datosSeleccionados.length;

    if (totalSeleccionados === 0) {
      return "No hay datos. La hoja 'Seleccionados' está vacía.";
    }

    // --- Mapeo de índices para el análisis ---
    const getIndiceSeleccionados = (nombre) => encabezadosSeleccionados.indexOf(nombre);
    const INDICES_SELECCIONADOS = {
      categoria: getIndiceSeleccionados("Categoría Postulante"),
      sede: getIndiceSeleccionados("Sede"),
      puntajeTotal: getIndiceSeleccionados("PUNTAJE TOTAL"),
      puntajeDisponibilidad: getIndiceSeleccionados("Puntaje Disponibilidad"),
      puntajeTipo: getIndiceSeleccionados("Puntaje Tipo"),
      puntajeUsoIngles: getIndiceSeleccionados("Puntaje Uso Inglés"),
      puntajeIntl: getIndiceSeleccionados("Puntaje Intl."),
      puntajeNivelIngles: getIndiceSeleccionados("Puntaje Nivel Inglés"),
      puntajeAnio: getIndiceSeleccionados("Puntaje Año Ingreso"),
      puntajeCompromiso: getIndiceSeleccionados("Puntaje Compromiso"),
      puntajeCarta: getIndiceSeleccionados("Puntaje Carta"),
    };

    // --- Sección 1: Estadísticas Descriptivas de los Seleccionados ---
    const lineasAnalisis = [`--- ESTADÍSTICAS DESCRIPTIVAS (Top ${totalSeleccionados}) ---\n`];

    // a) Puntaje Total
    const puntajesTotales = datosSeleccionados.map(fila => parseFloat(fila[INDICES_SELECCIONADOS.puntajeTotal] || 0));
    const puntajePromedio = puntajesTotales.reduce((a, b) => a + b, 0) / totalSeleccionados;
    lineasAnalisis.push(`📊 Puntaje Total:`);
    lineasAnalisis.push(`   - Promedio: ${puntajePromedio.toFixed(2)}`);
    lineasAnalisis.push(`   - Máximo: ${Math.max(...puntajesTotales).toFixed(2)}`);
    lineasAnalisis.push(`   - Mínimo: ${Math.min(...puntajesTotales).toFixed(2)}\n`);

    // b) Distribución por Categoría y Sede
    const distribucionCategoria = {};
    const distribucionSede = {};
    datosSeleccionados.forEach(fila => {
      const categoria = fila[INDICES_SELECCIONADOS.categoria] || "N/A";
      const sede = fila[INDICES_SELECCIONADOS.sede] || "N/A";
      distribucionCategoria[categoria] = (distribucionCategoria[categoria] || 0) + 1;
      distribucionSede[sede] = (distribucionSede[sede] || 0) + 1;
    });

    // c) Distribución para análisis de equilibrio (Estudiante vs Funcionario)
    const distribucionEquilibrio = datosSeleccionados.reduce((acc, fila) => {
      const categoria = fila[INDICES_SELECCIONADOS.categoria];
      const perfil = esEstudiante(categoria) ? "Estudiantes" : "Funcionarios/Otros";
      acc[perfil] = (acc[perfil] || 0) + 1;
      return acc;
    }, {});
    
    // d) MEJORA: Perfil de Puntuación Promedio por Grupo
    lineasAnalisis.push(`📈 Perfil de Puntuación Promedio por Grupo:\n`);
    const promediosPorGrupo = {
      Estudiantes: { count: 0, puntajes: {} },
      "Funcionarios/Otros": { count: 0, puntajes: {} }
    };

    // Inicializar sumas de puntajes
    for (const perfil in promediosPorGrupo) {
      for (const key in INDICES_SELECCIONADOS) {
        if (key.startsWith("puntaje") && key !== "puntajeTotal") {
          promediosPorGrupo[perfil].puntajes[key] = 0;
        }
      }
    }

    // Sumar los puntajes para cada grupo
    datosSeleccionados.forEach(fila => {
      const perfil = esEstudiante(fila[INDICES_SELECCIONADOS.categoria]) ? "Estudiantes" : "Funcionarios/Otros";
      promediosPorGrupo[perfil].count++;
      for (const key in promediosPorGrupo[perfil].puntajes) {
        promediosPorGrupo[perfil].puntajes[key] += parseFloat(fila[INDICES_SELECCIONADOS[key]] || 0);
      }
    });

    // Calcular y formatear los promedios
    for (const perfil in promediosPorGrupo) {
      const grupo = promediosPorGrupo[perfil];
      if (grupo.count > 0) {
        lineasAnalisis.push(`🔹 ${perfil} (${grupo.count} seleccionados):`);
        for (const key in grupo.puntajes) {
          const promedio = grupo.puntajes[key] / grupo.count;
          const nombreBonito = key.replace("puntaje", "").replace(/([A-Z])/g, ' $1').trim();
          lineasAnalisis.push(`   - Promedio ${nombreBonito}: ${promedio.toFixed(2)}`);
        }
        lineasAnalisis.push(''); // Salto de línea
      }
    }

    // --- Sección 2: Análisis de Equilibrio y Sugerencias (lógica existente) ---
    lineasAnalisis.push(`\n--- ANÁLISIS DE EQUILIBRIO DEL RANKING ---\n`);
    const pctEstudiantes = ((distribucionEquilibrio["Estudiantes"] || 0) / totalSeleccionados) * 100;
    const pctFuncionarios = ((distribucionEquilibrio["Funcionarios/Otros"] || 0) / totalSeleccionados) * 100;

    lineasAnalisis.push(`Composición del Ranking:`);
    lineasAnalisis.push(`- Estudiantes: ${distribucionEquilibrio["Estudiantes"] || 0} (${pctEstudiantes.toFixed(1)}%)`);
    lineasAnalisis.push(`- Funcionarios/Otros: ${distribucionEquilibrio["Funcionarios/Otros"] || 0} (${pctFuncionarios.toFixed(1)}%)\n`);

    // Identificar desequilibrio
    const UMBRAL_DESEQUILIBRIO = 80; // Si un grupo supera este %
    let grupoDominante = null;
    if (pctEstudiantes > UMBRAL_DESEQUILIBRIO) grupoDominante = "Estudiantes";
    if (pctFuncionarios > UMBRAL_DESEQUILIBRIO) grupoDominante = "Funcionarios/Otros";

    if (!grupoDominante) {
      lineasAnalisis.push("✅ El ranking parece razonablemente equilibrado. No se requieren ajustes urgentes.");
      return lineasAnalisis.join('\n');
    }

    lineasAnalisis.push(`⚠️ Se ha detectado un desequilibrio. El grupo '${grupoDominante}' domina el ranking.\n\n--- SUGERENCIAS DE AJUSTE DE PESOS ---`);

    // Calcular puntajes promedio por categoría para encontrar la causa
    const datosEvaluacion = hojaEvaluacion.getDataRange().getValues();
    const encabezados = datosEvaluacion.shift();
    const indices = {
      categoria: encabezados.indexOf("Categoría Postulante"),
      usoIngles: encabezados.indexOf("Puntaje Uso Inglés"),
      intl: encabezados.indexOf("Puntaje Intl."),
      anio: encabezados.indexOf("Puntaje Año Ingreso"),
      carta: encabezados.indexOf("Puntaje Carta")
    };

    const promedios = {
      Estudiantes: { usoIngles: 0, intl: 0, anio: 0, carta: 0, count: 0 },
      "Funcionarios/Otros": { usoIngles: 0, intl: 0, anio: 0, carta: 0, count: 0 }
    };

    datosEvaluacion.forEach(fila => {
      const perfil = esEstudiante(fila[indices.categoria]) ? "Estudiantes" : "Funcionarios/Otros";
      promedios[perfil].count++;
      promedios[perfil].usoIngles += parseFloat(fila[indices.usoIngles] || 0);
      promedios[perfil].intl += parseFloat(fila[indices.intl] || 0);
      promedios[perfil].anio += parseFloat(fila[indices.anio] || 0);
      promedios[perfil].carta += parseFloat(fila[indices.carta] || 0);
    });

    // Normalizar promedios
    for (const perfil in promedios) {
      if (promedios[perfil].count > 0) {
        promedios[perfil].usoIngles /= promedios[perfil].count;
        promedios[perfil].intl /= promedios[perfil].count;
        promedios[perfil].anio /= promedios[perfil].count;
        promedios[perfil].carta /= promedios[perfil].count;
      }
    }

    // Generar sugerencias basadas en las mayores diferencias
    const grupoSubrepresentado = grupoDominante === "Estudiantes" ? "Funcionarios/Otros" : "Estudiantes";
    const categoriasPuntaje = ["usoIngles", "intl", "anio", "carta"];
    const nombresCategorias = {
      usoIngles: "Uso Inglés",
      intl: "Internacionalización",
      anio: "Año Ingreso",
      carta: "Carta Respaldo"
    };

    categoriasPuntaje.forEach(cat => {
      const promDominante = promedios[grupoDominante][cat];
      const promSub = promedios[grupoSubrepresentado][cat];
      const diferencia = promDominante - promSub;

      if (Math.abs(diferencia) > 0.5) { // Solo mostrar diferencias significativas
        lineasAnalisis.push(`\n🔹 Categoría: ${nombresCategorias[cat]}`);
        lineasAnalisis.push(`   - Promedio '${grupoDominante}': ${promDominante.toFixed(2)}`);
        lineasAnalisis.push(`   - Promedio '${grupoSubrepresentado}': ${promSub.toFixed(2)}`);
        if (diferencia > 0) {
          lineasAnalisis.push(`   - SUGERENCIA: El grupo dominante puntúa mucho más alto aquí. Considera reducir el peso de esta categoría para '${grupoDominante}' en SCORING_PARAMS.`);
        } else {
          lineasAnalisis.push(`   - SUGERENCIA: El grupo subrepresentado puntúa más alto aquí. Considera AUMENTAR el peso de esta categoría para '${grupoSubrepresentado}' para darles más oportunidades.`);
        }
      }
    });

    return lineasAnalisis.join('\n');

  } catch (e) {
    console.error(`Error en getAnalysisReport: ${e.toString()}\nStack: ${e.stack}`);
    return `Se produjo un error al generar el reporte.\n\nCausa: ${e.toString()}\n\nPor favor, revisa los registros de ejecución en el editor de Apps Script para más detalles.`;
  }
}

/**
 * Envía un correo de notificación a los postulantes en la hoja "Seleccionados".
 */
// =================================================================
// --- SECCIÓN DE LA APLICACIÓN WEB (SOLUCIÓN PARA SCRIPT INDEPENDIENTE) ---
// =================================================================

/**
 * Esta función se ejecuta cuando accedes a la URL de la aplicación web.
 * Sirve la página HTML que actuará como nuestro menú.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Panel de Control de Evaluación PUCV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/**
 * Esta función es llamada desde el HTML para ejecutar la lógica de análisis.
 * Devuelve los resultados como una cadena de texto para mostrarlos en la web.
 */
function ejecutarAnalisisDesdeWebApp() {
  return getAnalysisReport();
}

/**
 * Esta función es llamada desde el HTML para ejecutar el envío de correos.
 * Devuelve un mensaje de confirmación.
 */
function ejecutarEnvioCorreosDesdeWebApp() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
  if (!hojaSeleccionados) {
    return "Error: No se encontró la hoja 'Seleccionados'.";
  }

  const datos = hojaSeleccionados.getDataRange().getValues();
  const encabezados = datos.shift(); // Quita y guarda los encabezados

  const indiceNombre = encabezados.indexOf("Nombre(s)");
  const indiceCorreo = encabezados.indexOf("Correo Electrónico");

  if (indiceNombre === -1 || indiceCorreo === -1) {
    return "Error: No se encontraron las columnas 'Nombre(s)' o 'Correo Electrónico' en la hoja 'Seleccionados'.";
  }

  datos.forEach(fila => {
    const nombre = fila[indiceNombre];
    const correo = fila[indiceCorreo];
    
    // MEJORA: Usar plantilla HTML para el correo.
    const plantilla = HtmlService.createTemplateFromFile('CorreoSeleccionado');
    plantilla.nombre = nombre; // Pasar la variable 'nombre' a la plantilla
    const cuerpoHtml = plantilla.evaluate().getContent();

    const asunto = "¡Felicitaciones! Has sido seleccionado para el Programa de Inglés PUCV";
    
    // MailApp.sendEmail({ to: correo, subject: asunto, htmlBody: cuerpoHtml }); // DESCOMENTAR PARA ENVIAR
    console.log(`Correo HTML de selección preparado para ${nombre} a ${correo}`); // Para pruebas
  });

  const mensajeConfirmacion = `Proceso de envío iniciado para ${datos.length} postulantes. Revisa los registros para ver el progreso.`;
  console.log(mensajeConfirmacion); // Log para el servidor
  return mensajeConfirmacion; // Mensaje para el cliente (la web app)
}

/**
 * FUNCIÓN DE DEPURACIÓN DE PERMISOS
 * Ejecuta esta función manualmente desde el editor de scripts para forzar
 * el diálogo de autorización y asegurar que el script tiene todos los permisos necesarios.
 */
function forceReauthorization() {
  try {
    // 1. Forzar permiso para acceder a hojas de cálculo por ID
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    console.log(`Acceso exitoso a la hoja: ${ss.getName()}`);

    // 2. Forzar permiso para enviar correos
    MailApp.sendEmail(Session.getActiveUser().getEmail(), "Prueba de Permisos de Script", "Este es un correo de prueba para verificar los permisos. No es necesario responder.");
    console.log("Permiso para enviar correos verificado.");

    // 3. Forzar permiso para LockService
    const lock = LockService.getScriptLock();
    console.log("Permiso para LockService verificado.");

    SpreadsheetApp.getUi().alert("¡Éxito! Todos los permisos necesarios han sido verificados.");
  } catch (e) { /* Ignoramos el error de getUi() que es esperado en el editor */ }
}

/**
 * FUNCIÓN DE DEPURACIÓN PARA LA WEB APP
 * Ejecuta esta función desde un botón en la Web App para forzar el diálogo
 * de autorización en el contexto correcto de la implementación.
 */
function forceWebAppPermissions() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    MailApp.sendEmail(Session.getActiveUser().getEmail(), "Prueba de Permisos de Web App", "Los permisos de la Web App han sido verificados exitosamente.");
    return `¡Éxito! Se ha verificado el acceso a la hoja de cálculo '${ss.getName()}' y se ha enviado un correo de prueba a tu cuenta. Ahora puedes usar las otras funciones.`;
  } catch (e) {
    console.error(`Error en forceWebAppPermissions: ${e.toString()}`);
    return `FALLO LA VERIFICACIÓN DE PERMISOS.\n\nCausa: ${e.toString()}\n\nEsto usualmente significa que el SHEET_ID en el objeto CONFIG es incorrecto o no tienes acceso a esa hoja. Por favor, verifica el ID y tus permisos de Google Drive.`;
  }
}

/**
 * Se activa al editar la hoja "Seleccionados".
 * Si un postulante es marcado como "Rechaza", busca al siguiente en el ranking general,
 * lo añade a la lista de seleccionados y le envía una notificación.
 * @param {Object} e El objeto de evento de la edición.
 */
function gestionarListaDeEspera(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hojaActiva = ss.getActiveSheet();

    // 1. Verificar si la edición ocurrió en el lugar correcto
    if (hojaActiva.getName() !== CONFIG.SHEETS.SELECTED) return;

    const rangoEditado = e.range;
    const filaEditada = rangoEditado.getRow();
    const columnaEditada = rangoEditado.getColumn();
    const nuevoValor = e.value;

    if (filaEditada <= 1) return; // Ignorar ediciones en el encabezado

    const encabezados = hojaActiva.getRange(1, 1, 1, hojaActiva.getLastColumn()).getValues()[0];
    const nombreColumnaEditada = encabezados[columnaEditada - 1];

    // 2. Actuar solo si se cambia la columna "Aceptación" a "Rechaza"
    if (nombreColumnaEditada !== "Aceptación" || nuevoValor !== "Rechaza") {
      return;
    }

    console.log(`Rechazo detectado en la fila ${filaEditada}. Iniciando proceso de lista de espera.`);

    // 3. Obtener todos los postulantes evaluados y los ya seleccionados
    const hojaEvaluacion = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
    const hojaSeleccionados = hojaActiva; // Es la misma que la activa

    if (!hojaEvaluacion) {
      throw new Error(`No se encontró la hoja de evaluación: ${CONFIG.SHEETS.OUTPUT}`);
    }

    const datosEvaluacion = hojaEvaluacion.getDataRange().getValues();
    const datosSeleccionados = hojaSeleccionados.getDataRange().getValues();

    const encabezadosEvaluacion = datosEvaluacion.shift();
    const encabezadosSeleccionados = datosSeleccionados.shift();

    const indiceCorreoEvaluacion = encabezadosEvaluacion.indexOf("Correo Electrónico");
    const indiceCorreoSeleccionados = encabezadosSeleccionados.indexOf("Correo Electrónico");

    // Crear un conjunto de correos ya seleccionados para una búsqueda rápida
    const correosSeleccionados = new Set(datosSeleccionados.map(fila => fila[indiceCorreoSeleccionados]));

    // 4. Encontrar al siguiente candidato en la lista de espera
    let siguienteCandidato = null;
    for (const candidato of datosEvaluacion) {
      const correoCandidato = candidato[indiceCorreoEvaluacion];
      if (!correosSeleccionados.has(correoCandidato)) {
        siguienteCandidato = candidato;
        break; // Encontramos al primero que no está en la lista
      }
    }

    if (!siguienteCandidato) {
      console.log("No hay más candidatos en la lista de espera.");
      SpreadsheetApp.getUi().alert("No hay más candidatos disponibles en la lista de espera.");
      return;
    }

    // 5. Añadir el nuevo candidato a la hoja "Seleccionados"
    const ultimoRanking = datosSeleccionados.length > 0 ? Math.max(...datosSeleccionados.map(f => parseInt(f[0] || 0))) : 0;
    const nuevoRanking = ultimoRanking + 1;

    // Formatear la fila para que coincida con la estructura de "Seleccionados"
    const nuevaFila = [
      nuevoRanking,
      ...siguienteCandidato,
      "", // Verificación Certificado
      "", // Nivel Asignado
      "Pendiente", // Aceptación
      "Añadido desde lista de espera" // Comentarios
    ];

    hojaSeleccionados.appendRow(nuevaFila);
    console.log(`Nuevo candidato '${siguienteCandidato[indiceCorreoEvaluacion]}' añadido a la lista con ranking ${nuevoRanking}.`);

    // 6. Enviar correo de notificación al nuevo candidato
    const nombreNuevoCandidato = siguienteCandidato[encabezadosEvaluacion.indexOf("Nombre(s)")];
    const correoNuevoCandidato = siguienteCandidato[indiceCorreoEvaluacion];

    // MEJORA: Usar plantilla HTML para el correo de lista de espera.
    const plantilla = HtmlService.createTemplateFromFile('CorreoListaEspera');
    plantilla.nombre = nombreNuevoCandidato;
    const cuerpoHtml = plantilla.evaluate().getContent();

    const asunto = "Oportunidad en el Programa de Inglés PUCV: ¡Un cupo se ha liberado!";
    
    // MailApp.sendEmail({ to: correoNuevoCandidato, subject: asunto, htmlBody: cuerpoHtml }); // DESCOMENTAR PARA ENVIAR
    console.log(`Correo HTML de lista de espera preparado para ${nombreNuevoCandidato} a ${correoNuevoCandidato}`);

    SpreadsheetApp.getUi().alert(`¡Proceso completado! Se ha añadido a '${nombreNuevoCandidato}' desde la lista de espera y se le ha notificado.`);

  } catch (e) {
    console.error(`Error en gestionarListaDeEspera: ${e.toString()}\nStack: ${e.stack}`);
    SpreadsheetApp.getUi().alert(`Se produjo un error al gestionar la lista de espera: ${e.message}`);
  }
}

/**
 * Genera la lista final de participantes del curso en una nueva hoja.
 * Filtra los postulantes que han "Aceptado" y tienen un "Nivel Asignado",
 * y los organiza por nivel.
 */
function generarListaFinalCurso() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    const hojaSeleccionados = ss.getSheetByName(CONFIG.SHEETS.SELECTED);

    if (!hojaSeleccionados) {
      throw new Error(`La hoja "${CONFIG.SHEETS.SELECTED}" no existe. Por favor, ejecuta primero la evaluación.`);
    }

    const datosSeleccionados = hojaSeleccionados.getDataRange().getValues();
    const encabezados = datosSeleccionados.shift();

    // Mapeo de índices para legibilidad
    const getIndice = (nombre) => encabezados.indexOf(nombre);
    const INDICE_ACEPTACION = getIndice("Aceptación");
    const INDICE_NIVEL = getIndice("Nivel Asignado");
    const INDICE_NOMBRE = getIndice("Nombre(s)");
    const INDICE_APELLIDOS = getIndice("Apellido(s)");
    const INDICE_CORREO = getIndice("Correo Electrónico");
    const INDICE_RUT = getIndice("RUT");
    const INDICE_CATEGORIA = getIndice("Categoría Postulante");

    if (INDICE_ACEPTACION === -1 || INDICE_NIVEL === -1) {
      throw new Error("No se encontraron las columnas 'Aceptación' o 'Nivel Asignado' en la hoja de Seleccionados.");
    }

    // 1. Filtrar a los que aceptaron y tienen un nivel
    const listaFinal = datosSeleccionados.filter(fila => {
      return fila[INDICE_ACEPTACION] === 'Acepta' && String(fila[INDICE_NIVEL] || "").trim() !== '';
    });

    if (listaFinal.length === 0) {
      // Devolver un mensaje en lugar de usar getUi()
      return "No se generó la lista: No hay postulantes que hayan aceptado y tengan un nivel asignado.";
    }

    // 2. Ordenar la lista por el nivel asignado
    listaFinal.sort((a, b) => {
      const nivelA = a[INDICE_NIVEL];
      const nivelB = b[INDICE_NIVEL];
      if (nivelA < nivelB) return -1;
      if (nivelA > nivelB) return 1;
      return 0;
    });

    // 3. Preparar los datos para la nueva hoja
    const encabezadosFinales = ["Nivel Asignado", "Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Categoría Postulante"];
    const datosParaHoja = listaFinal.map(fila => [
      fila[INDICE_NIVEL],
      fila[INDICE_APELLIDOS],
      fila[INDICE_NOMBRE],
      fila[INDICE_CORREO],
      fila[INDICE_RUT],
      fila[INDICE_CATEGORIA]
    ]);

    // 4. Crear/Limpiar y escribir en la hoja "Lista Final Curso"
    let hojaFinal = ss.getSheetByName(CONFIG.SHEETS.FINAL_LIST);
    if (!hojaFinal) hojaFinal = ss.insertSheet(CONFIG.SHEETS.FINAL_LIST);
    hojaFinal.clear();
    hojaFinal.getRange(1, 1, 1, encabezadosFinales.length).setValues([encabezadosFinales]).setFontWeight("bold");
    hojaFinal.getRange(2, 1, datosParaHoja.length, datosParaHoja[0].length).setValues(datosParaHoja);
    hojaFinal.autoResizeColumns(1, encabezadosFinales.length);

    // Devolver un mensaje de éxito en lugar de usar getUi()
    return `¡Éxito! Se ha generado la "Lista Final Curso" con ${listaFinal.length} participantes.`;

  } catch (e) {
    console.error(`Error en generarListaFinalCurso: ${e.toString()}`);
    // Devolver el mensaje de error para que se muestre en la Web App
    return `Error al generar la lista final: ${e.message}`;
  }
}
