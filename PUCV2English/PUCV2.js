// MEJORA: Mover CONFIG fuera de la función para que sea una constante global.
// Esto permite que otras funciones como `enviarNotificacionesSeleccionados` también la usen.
const CONFIG = {
  SHEET_ID: "1ohh906fh213G8K0MRhMjlxQFlRXctq97rhw3ply7NQ8",
  SHEETS: {
    INPUT: "Respuestas de formulario 1",
    OUTPUT: "Evaluación automatizada",
    DASHBOARD: "Dashboard",
    CONFIG: "Configuración", // Nombre de la nueva hoja de configuración
    SELECTED: "Seleccionados"
  },
  COLUMNS: { // Centraliza los nombres de las columnas para evitar errores de tipeo
    PROCESSING_STATUS: "Estado de Procesamiento"
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
    const contribucion = obtenerValor(fila, "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?");
    const peso = SCORING_PARAMS.UsoIngles.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1

    if (esEstudiante(tipoPostulante)) {
      // --- NUEVA LÓGICA PARA ESTUDIANTES ---
      // Lógica basada únicamente en la pregunta abierta existente:
      // "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?"

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
      const frecuencia = obtenerValor(fila, "¿Con qué frecuencia requieres utilizar el idioma inglés en tus funciones actuales?").toLowerCase();
      for (const [key, value] of Object.entries(SCORING_PARAMS.UsoIngles.Frecuencia)) {
        if (frecuencia.includes(key)) puntaje += value;
      }
      // 2. Actividades (con pesos)
      const actividades = obtenerValor(fila, "Seleccione las actividades que realizas en inglés como parte de tus funciones:").toLowerCase();
      for (const [actividad, peso] of Object.entries(SCORING_PARAMS.UsoIngles.Actividades)) {
        if (actividades.includes(actividad)) puntaje += peso;
      }
      // 3. Proyectos futuros y contribución
      if (esSi(obtenerValor(fila, "¿Tu unidad tiene proyectos futuros que requerirán mayor uso del inglés?"))) puntaje += 1;
      puntaje += contarPalabrasClave(contribucion, SCORING_PARAMS.UsoIngles.PalabrasClaveContribucion) * SCORING_PARAMS.UsoIngles.PuntajePorPalabraClave;
    }
    
    return Math.min(SCORING_PARAMS.UsoIngles.MaxPuntaje, puntaje) * peso; // Aplicar el peso al puntaje final
  };

  const calcularPuntajeInternacionalizacion = (fila, tipoPostulante) => {
    let puntaje = 0;
    const peso = SCORING_PARAMS.Internacionalizacion.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1

    const tieneDocumentos = !!obtenerValor(fila, "Adjunta los documentos de respaldo");

    // 1. Etapa del proceso
    const etapa = obtenerValor(fila, "¿En qué etapa se encuentra tu proceso de internacionalización?").toLowerCase();
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
    const plan = obtenerValor(fila, "¿Cómo has planeado internacionalizar tu carrera?");
    puntaje += contarPalabrasClave(plan, SCORING_PARAMS.Internacionalizacion.PalabrasClavePlan) * SCORING_PARAMS.Internacionalizacion.PuntajePorPalabraClave;

    // 3. AJUSTE: Si es estudiante, otorgar puntaje base por tener planes, ya que es un objetivo clave para ellos.
    // Esto compensa la falta de experiencia profesional.
    if (esEstudiante(tipoPostulante) && (etapa.length > 0 || plan.length > 10)) {
      puntaje += 0.5; // Bonus REDUCIDO por demostrar interés y planificación.
    }

    return Math.min(SCORING_PARAMS.Internacionalizacion.MaxPuntaje, puntaje) * peso; // Aplicar el peso al puntaje final
  };

  const calcularPuntajeCertificado = (fila) => {
    if (obtenerValor(fila, "En caso de que no tengas certificación de inglés, marca esta casilla:")) {
      return 0;
    }
    const textoNormalizado = obtenerValor(fila, "Certificación de inglés");
    if (/C1/i.test(textoNormalizado)) return 5;
    if (/B2\.2/i.test(textoNormalizado)) return 4;
    if (/B2\.1/i.test(textoNormalizado)) return 3;
    if (/\bexim/i.test(textoNormalizado)) return 3; // 'eximido', 'eximición', etc.
    if (/B1\+/i.test(textoNormalizado)) return 2;
    if (/inglés 4|ingles 4/i.test(textoNormalizado)) return 2;
    return 1; // Puntaje mínimo si hay algo pero no coincide
  };

  const calcularPuntajeAnioIngreso = (fila, tipoPostulante) => {
    const anio = obtenerValor(fila, "¿En qué año ingresaste a tu carrera actual?");
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
    const indiceAnioOriginal = indicesOriginales["¿En qué año ingresaste a tu carrera actual?"];
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
     "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL"]
  ];

  // --- OPTIMIZACIÓN: Identificar la columna de estado ---
  const COLUMNA_ESTADO_NOMBRE = CONFIG.COLUMNS.PROCESSING_STATUS;
  const indiceEstado = encabezados.indexOf(COLUMNA_ESTADO_NOMBRE);

  for (let r = 1; r < datos.length; r++) {
    try { // <--- INICIO DEL BLOQUE TRY
      const fila = datos[r];

      // --- OPTIMIZACIÓN: Ignorar filas ya procesadas ---
      if (indiceEstado !== -1 && obtenerValor(fila, COLUMNA_ESTADO_NOMBRE) !== "") {
        continue; // Saltar a la siguiente iteración del bucle
      }

      // --- Datos Personales ---
      const apellidos = [obtenerValor(fila, "Apellido paterno"), obtenerValor(fila, "Apellido materno")].filter(Boolean).join(" ");
      const nombres = [obtenerValor(fila, "Primer nombre"), obtenerValor(fila, "Segundo nombre")].filter(Boolean).join(" ");
      const correo = obtenerValor(fila, "Dirección de correo electrónico");
      const rut = obtenerValor(fila, "RUT");
      const fechaPostulacion = obtenerValor(fila, "Marca temporal");
      const tipoPostulante = obtenerValor(fila, "Indica si eres funcionario, alumno, profesor, académico, etc.");
      const sede = obtenerValor(fila, "¿En qué sede realizas la mayoría de tus actividades académicas o profesionales?");

      // 1. Disponibilidad (máx 4 puntos)
      let puntajeDisponibilidad = 0;
      if (esSi(obtenerValor(fila, "¿Tienes disponibilidad para dedicar 3 sesiones semanales?"))) puntajeDisponibilidad++;
      if (!esSi(obtenerValor(fila, "¿Tienes compromisos académicos/laborales que podrían impedir cumplir con la asistencia obligatoria?"))) puntajeDisponibilidad++; // "No" es la respuesta deseada
      if (esSi(obtenerValor(fila, "¿Estás en condiciones de asistir al menos al 80 % de las clases?"))) puntajeDisponibilidad++;
      if (esSi(obtenerValor(fila, "¿Puedes comprometerse a dedicar 4 horas semanales de estudio autónomo además de las clases?"))) puntajeDisponibilidad++;

      // --- Cálculo de Puntajes por Área ---
      const puntajeTipo = calcularPuntajeTipoPostulante(tipoPostulante);
      const puntajeUso = calcularPuntajeUsoIngles(fila, tipoPostulante);
      const puntajeIntl = calcularPuntajeInternacionalizacion(fila, tipoPostulante);
      const puntajeNivelIngles = calcularPuntajeCertificado(fila);
      const puntajeAnio = calcularPuntajeAnioIngreso(fila, tipoPostulante);

      // Compromiso (máx 3 puntos)
      let puntajeCompromiso = 0;
      if (esSi(obtenerValor(fila, "Compromiso con el programa "))) puntajeCompromiso++;
      if (esSi(obtenerValor(fila, "Veracidad de la información"))) puntajeCompromiso++;
      if (esSi(obtenerValor(fila, "Consecuencias por incumplimiento"))) puntajeCompromiso++;

      // Carta de respaldo (máx 3 puntos)
      const pesoCarta = SCORING_PARAMS.CartaRespaldo.peso[esEstudiante(tipoPostulante) ? "estudiante" : "funcionario"] || 1; // Obtener el peso, default 1
      // AJUSTE: Si es estudiante, se le asigna un puntaje base para compensar que no puede tener carta de jefatura.
      let puntajeCarta = 0;
      const tieneCartaRespaldo = !!obtenerValor(fila, "Si la respuesta anterior fue \"Sí\", por favor, adjunta una carta de respaldo de tu jefatura?\" [Nota: Opcional, pero otorga puntaje adicional]");

      if (esEstudiante(tipoPostulante)) {
        puntajeCarta = 1; // Puntaje base por ser estudiante (no se espera respaldo de jefatura)
        if (tieneCartaRespaldo) puntajeCarta += 1.5; // Bonus alto si adjunta una carta (de un profesor, etc.)
      } else {
        // La lógica original solo se aplica a no-estudiantes
        if (esSi(obtenerValor(fila, "¿Cuentas con el respaldo de tu jefatura directa para participar en este programa?"))) puntajeCarta += 1;
        if (tieneCartaRespaldo) puntajeCarta += 1;
        if (esSi(obtenerValor(fila, "¿Tu jefatura está en conocimiento y aprueba tu participación en el horario establecido?"))) puntajeCarta++;
      }

      const puntajeTotal = puntajeDisponibilidad + puntajeTipo + puntajeUso + puntajeIntl + puntajeNivelIngles + puntajeAnio + puntajeCompromiso + (puntajeCarta * pesoCarta);
      resultados.push([
        apellidos, nombres, correo, rut, fechaPostulacion, tipoPostulante, sede,
        puntajeDisponibilidad, puntajeTipo, puntajeUso.toFixed(2),
        puntajeIntl.toFixed(2), puntajeNivelIngles, puntajeAnio,
        puntajeCompromiso, puntajeCarta,
        puntajeTotal.toFixed(2)
      ]);

      // --- OPTIMIZACIÓN: Marcar la fila como procesada ---
      if (indiceEstado !== -1) {
        hojaEntrada.getRange(r + 1, indiceEstado + 1).setValue(new Date());
      }

    } catch (e) { // <--- INICIO DEL BLOQUE CATCH
      // Si ocurre un error en el bloque 'try', el código salta aquí.
      const numeroFila = r + 1;
      console.error(`Error al procesar la fila ${numeroFila} de la hoja '${CONFIG.SHEETS.INPUT}'. Causa: ${e.message}`);
      console.error(`Stack del error: ${e.stack}`); // Información muy útil para depurar

      // Marcar la fila con error en la hoja para revisión manual.
      if (indiceEstado !== -1) {
        hojaEntrada.getRange(numeroFila, indiceEstado + 1).setValue(`ERROR: ${e.message}`);
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
  cargarConfiguracionDesdeHoja();

  let hojaResultados = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
  if (!hojaResultados) {
    hojaResultados = ss.insertSheet(CONFIG.SHEETS.OUTPUT); // Si no existe, la crea.
  } else {
    hojaResultados.clear(); // Si ya existe, la limpia por completo para evitar duplicados.
  }
  // Escribe todos los resultados (encabezados + datos) en la hoja limpia.
  hojaResultados.getRange(1, 1, resultados.length, resultados[0].length).setValues(resultados);

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
      "Verificación Certificado", "Nivel Asignado", "Aceptación"
    ];

    // Preparar los datos para escribir en la hoja (encabezados + seleccionados)
    // Las filas de datos tendrán espacios vacíos para las nuevas columnas manuales
    const datosParaHoja = [encabezadosSeleccionados, ...seleccionadosConRanking.map(fila => [...fila, "", "", "Pendiente"])];

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
      const rangoAceptacion = hojaSeleccionados.getRange(2, indiceColAceptacion, datosParaHoja.length - 1, 1);

      // Crear regla para menú desplegable
      const reglaDesplegable = SpreadsheetApp.newDataValidation().requireValueInList(['Acepta', 'Rechaza', 'Pendiente'], true).build();
      rangoAceptacion.setDataValidation(reglaDesplegable);

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
    let mensajeAnalisis = `--- ESTADÍSTICAS DESCRIPTIVAS (Top ${totalSeleccionados}) ---\n\n`;

    // a) Puntaje Total
    const puntajesTotales = datosSeleccionados.map(fila => parseFloat(fila[INDICES_SELECCIONADOS.puntajeTotal] || 0));
    const puntajePromedio = puntajesTotales.reduce((a, b) => a + b, 0) / totalSeleccionados;
    mensajeAnalisis += `📊 Puntaje Total:\n`;
    mensajeAnalisis += `   - Promedio: ${puntajePromedio.toFixed(2)}\n`;
    mensajeAnalisis += `   - Máximo: ${Math.max(...puntajesTotales).toFixed(2)}\n`;
    mensajeAnalisis += `   - Mínimo: ${Math.min(...puntajesTotales).toFixed(2)}\n\n`;

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
    mensajeAnalisis += `📈 Perfil de Puntuación Promedio por Grupo:\n\n`;
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
        mensajeAnalisis += `🔹 ${perfil} (${grupo.count} seleccionados):\n`;
        for (const key in grupo.puntajes) {
          const promedio = grupo.puntajes[key] / grupo.count;
          const nombreBonito = key.replace("puntaje", "").replace(/([A-Z])/g, ' $1').trim();
          mensajeAnalisis += `   - Promedio ${nombreBonito}: ${promedio.toFixed(2)}\n`;
        }
        mensajeAnalisis += `\n`;
      }
    }

    // --- Sección 2: Análisis de Equilibrio y Sugerencias (lógica existente) ---
    mensajeAnalisis += `\n\n--- ANÁLISIS DE EQUILIBRIO DEL RANKING ---\n\n`;
    const pctEstudiantes = ((distribucionEquilibrio["Estudiantes"] || 0) / totalSeleccionados) * 100;
    const pctFuncionarios = ((distribucionEquilibrio["Funcionarios/Otros"] || 0) / totalSeleccionados) * 100;

    mensajeAnalisis += `Composición del Ranking:\n`;
    mensajeAnalisis += `- Estudiantes: ${distribucionEquilibrio["Estudiantes"] || 0} (${pctEstudiantes.toFixed(1)}%)\n`;
    mensajeAnalisis += `- Funcionarios/Otros: ${distribucionEquilibrio["Funcionarios/Otros"] || 0} (${pctFuncionarios.toFixed(1)}%)\n\n`;

    // Identificar desequilibrio
    const UMBRAL_DESEQUILIBRIO = 80; // Si un grupo supera este %
    let grupoDominante = null;
    if (pctEstudiantes > UMBRAL_DESEQUILIBRIO) grupoDominante = "Estudiantes";
    if (pctFuncionarios > UMBRAL_DESEQUILIBRIO) grupoDominante = "Funcionarios/Otros";

    if (!grupoDominante) {
      mensajeAnalisis += "✅ El ranking parece razonablemente equilibrado. No se requieren ajustes urgentes.";
      return mensajeAnalisis;
    }

    mensajeAnalisis += `⚠️ Se ha detectado un desequilibrio. El grupo '${grupoDominante}' domina el ranking.\n\n--- SUGERENCIAS DE AJUSTE DE PESOS ---\n`;

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
        mensajeAnalisis += `\n🔹 Categoría: ${nombresCategorias[cat]}\n`;
        mensajeAnalisis += `   - Promedio '${grupoDominante}': ${promDominante.toFixed(2)}\n`;
        mensajeAnalisis += `   - Promedio '${grupoSubrepresentado}': ${promSub.toFixed(2)}\n`;
        if (diferencia > 0) {
          mensajeAnalisis += `   - SUGERENCIA: El grupo dominante puntúa mucho más alto aquí. Considera reducir el peso de esta categoría para '${grupoDominante}' en SCORING_PARAMS.\n`;
        } else {
          mensajeAnalisis += `   - SUGERENCIA: El grupo subrepresentado puntúa más alto aquí. Considera AUMENTAR el peso de esta categoría para '${grupoSubrepresentado}' para darles más oportunidades.\n`;
        }
      }
    });

    return mensajeAnalisis;

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
  return HtmlService.createHtmlOutputFromFile('WebAppUI')
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
    const asunto = "¡Felicitaciones! Has sido seleccionado para el Programa de Inglés PUCV";
    const cuerpo = `Estimado/a ${nombre},\n\nNos complace informarte que has sido seleccionado/a para participar en el programa de inglés.\n\nPor favor, responde a este correo para confirmar si aceptas o rechazas tu cupo a la brevedad.\n\nSaludos cordiales,\nEl equipo de PUCV.`;
    
    // MailApp.sendEmail(correo, asunto, cuerpo); // DESCOMENTAR PARA ENVIAR CORREOS REALES
    console.log(`Correo preparado para ${nombre} a ${correo}`); // Para pruebas
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
