function evaluarPostulacionesPUCV2() {
  const SHEET_ID = "1ohh906fh213G8K0MRhMjlxQFlRXctq97rhw3ply7NQ8";
  const INPUT_SHEET = "Respuestas de formulario 1";
  const OUTPUT_SHEET = "Evaluación automatizada";
  const DASHBOARD_SHEET = "Dashboard";
  const SELECCIONADOS_SHEET = "Seleccionados";

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hojaEntrada = ss.getSheetByName(INPUT_SHEET);
  if (!hojaEntrada) {
    throw new Error("Hoja de entrada no encontrada: " + INPUT_SHEET);
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

  // --- NUEVAS FUNCIONES DE PUNTUACIÓN COMPLEJAS ---

  const calcularPuntajeUsoIngles = (fila) => {
    let puntaje = 0;

    // 1. Frecuencia de uso
    const frecuencia = obtenerValor(fila, "¿Con qué frecuencia requieres utilizar el idioma inglés en tus funciones actuales?").toLowerCase();
    if (frecuencia.includes("diariamente")) puntaje += 1.5;
    else if (frecuencia.includes("semanalmente")) puntaje += 1;
    else if (frecuencia.includes("mensualmente")) puntaje += 0.5;

    // 2. Actividades (con pesos)
    const actividades = obtenerValor(fila, "Seleccione las actividades que realizas en inglés como parte de tus funciones:").toLowerCase();
    const pesosActividades = { "visitas internacionales": 1, "presentaciones": 1, "reuniones": 0.75, "clases": 0.5, "papers": 0.5, "correos": 0.25, "leer documentación": 0.25 };
    for (const actividad in pesosActividades) {
      if (actividades.includes(actividad)) puntaje += pesosActividades[actividad];
    }

    // 3. Proyectos futuros
    if (esSi(obtenerValor(fila, "¿Tu unidad tiene proyectos futuros que requerirán mayor uso del inglés?"))) {
      puntaje += 1;
    }

    // 4. Contribución al desempeño (palabras clave)
    const contribucion = obtenerValor(fila, "¿Cómo contribuiría el mejoramiento de tu nivel de inglés a tu desempeño profesional?");
    const palabrasClaveContribucion = ["proyección", "internacional", "colaborar", "crecimiento", "oportunidades", "movilidad", "publicar", "desarrollo"];
    puntaje += contarPalabrasClave(contribucion, palabrasClaveContribucion) * 0.25;

    return Math.min(4, puntaje); // Máximo 4 puntos para esta categoría
  };

  const calcularPuntajeInternacionalizacion = (fila) => {
    let puntaje = 0;

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
    const palabrasClavePlan = ["pasantía", "postdoctorado", "doctorado", "magíster", "investigación", "colaboración", "congreso", "publicar"];
    puntaje += contarPalabrasClave(plan, palabrasClavePlan) * 0.5;

    return Math.min(5, puntaje); // Máximo 5 puntos
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

  const calcularPuntajeAnioIngreso = (fila) => {
    const anio = obtenerValor(fila, "¿En qué año ingresaste a tu carrera actual?");
    if (anio === "2023") return 2;
    if (anio === "2024") return 1.5;
    if (anio === "2022") return 1;
    if (anio === "2025") return 0.5;
    return 0;
  };

  /**
   * Calcula estadísticas y actualiza la hoja del Dashboard.
   * @param {Array<Array<any>>} resultadosCompletos - Los datos procesados de los postulantes, incluyendo encabezados.
   * @param {Spreadsheet} spreadsheet - La hoja de cálculo activa.
   */
  const generarYActualizarDashboard = (resultadosCompletos, spreadsheet) => {
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

    // --- 1. Cálculos Estadísticos ---
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
    const indiceAnioOriginal = indiceColumnas["¿En qué año ingresaste a tu carrera actual?"];
    const statsPorAnio = {};
    datos.slice(1).forEach((filaOriginal, i) => {
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

    // --- 2. Preparar Datos para la Hoja ---
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
    for (const sede in statsCruzados) {
      for (const categoria in statsCruzados[sede]) {
        const promedio = statsCruzados[sede][categoria].suma / statsCruzados[sede][categoria].contador;
        datosDashboard.push([`${sede} - ${categoria}`, promedio.toFixed(2), `(${statsCruzados[sede][categoria].contador} postulantes)`]);
      }
    }

    // --- 3. Escribir en la Hoja ---
    let hojaDashboard = spreadsheet.getSheetByName(DASHBOARD_SHEET);
    if (!hojaDashboard) hojaDashboard = spreadsheet.insertSheet(DASHBOARD_SHEET);
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

    // --- 4. Añadir Gráfico de Distribución por Sede ---
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

  const resultados = [
    ["Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación", "Categoría Postulante", "Sede",
     "Puntaje Disponibilidad", "Puntaje Tipo", "Puntaje Uso Inglés", "Puntaje Intl.", "Puntaje Nivel Inglés",
     "Puntaje Año Ingreso", "Puntaje Compromiso", "Puntaje Carta", "PUNTAJE TOTAL"]
  ];

  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
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
    const puntajeUso = calcularPuntajeUsoIngles(fila);
    const puntajeIntl = calcularPuntajeInternacionalizacion(fila);
    const puntajeNivelIngles = calcularPuntajeCertificado(fila);
    const puntajeAnio = calcularPuntajeAnioIngreso(fila);

    // Compromiso (máx 3 puntos)
    let puntajeCompromiso = 0;
    if (esSi(obtenerValor(fila, "Compromiso con el programa "))) puntajeCompromiso++;
    if (esSi(obtenerValor(fila, "Veracidad de la información"))) puntajeCompromiso++;
    if (esSi(obtenerValor(fila, "Consecuencias por incumplimiento"))) puntajeCompromiso++;

    // Carta de respaldo (máx 3 puntos)
    let puntajeCarta = 0;
    if (esSi(obtenerValor(fila, "¿Cuentas con el respaldo de tu jefatura directa para participar en este programa?"))) puntajeCarta++;
    if (obtenerValor(fila, "Si la respuesta anterior fue \"Sí\", por favor, adjunta una carta de respaldo de tu jefatura?\" [Nota: Opcional, pero otorga puntaje adicional]")) puntajeCarta++;
    if (esSi(obtenerValor(fila, "¿Tu jefatura está en conocimiento y aprueba tu participación en el horario establecido?"))) puntajeCarta++;

    const puntajeTotal = puntajeDisponibilidad + puntajeTipo + puntajeUso + puntajeIntl + puntajeNivelIngles + puntajeAnio + puntajeCompromiso + puntajeCarta;
    resultados.push([
      apellidos, nombres, correo, rut, fechaPostulacion, tipoPostulante, sede,
      puntajeDisponibilidad, puntajeTipo, puntajeUso.toFixed(2),
      puntajeIntl.toFixed(2), puntajeNivelIngles, puntajeAnio,
      puntajeCompromiso, puntajeCarta,
      puntajeTotal.toFixed(2)
    ]);
  }

  let hojaResultados = ss.getSheetByName(OUTPUT_SHEET);
  if (!hojaResultados) hojaResultados = ss.insertSheet(OUTPUT_SHEET);
  else hojaResultados.clear();
  hojaResultados.getRange(1, 1, resultados.length, resultados[0].length).setValues(resultados);

  // --- Crear Hoja de Seleccionados (Top 25) ---
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

    let hojaSeleccionados = ss.getSheetByName(SELECCIONADOS_SHEET);
    if (!hojaSeleccionados) {
      hojaSeleccionados = ss.insertSheet(SELECCIONADOS_SHEET);
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
  // Primero, limpiamos las reglas de formato existentes en la hoja para evitar duplicados.
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

  // Generar y actualizar el dashboard con los resultados finales
  generarYActualizarDashboard(resultados, ss);
  SpreadsheetApp.flush(); // Asegura que todos los cambios se escriban en la hoja.
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
 * Se ejecuta automáticamente cuando se abre la hoja de cálculo.
 * Crea un menú personalizado para ejecutar el script de evaluación.
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Evaluación PUCV')
      .addItem('Actualizar Evaluación y Dashboard', 'evaluarPostulacionesPUCV2')
      .addSeparator()
      .addItem('Enviar Notificaciones a Seleccionados', 'enviarNotificacionesSeleccionados')
      .addToUi();
}

/**
 * Envía un correo de notificación a los postulantes en la hoja "Seleccionados".
 */
function enviarNotificacionesSeleccionados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaSeleccionados = ss.getSheetByName("Seleccionados");
  if (!hojaSeleccionados) {
    SpreadsheetApp.getUi().alert("No se encontró la hoja 'Seleccionados'. Por favor, ejecuta primero la evaluación.");
    return;
  }

  const datos = hojaSeleccionados.getDataRange().getValues();
  const encabezados = datos.shift(); // Quita y guarda los encabezados

  const indiceNombre = encabezados.indexOf("Nombre(s)");
  const indiceCorreo = encabezados.indexOf("Correo Electrónico");

  if (indiceNombre === -1 || indiceCorreo === -1) {
    SpreadsheetApp.getUi().alert("No se encontraron las columnas 'Nombre(s)' o 'Correo Electrónico' en la hoja 'Seleccionados'.");
    return;
  }

  const confirmacion = SpreadsheetApp.getUi().alert(
    'Confirmación de Envío',
    `¿Estás seguro de que quieres enviar un correo de notificación a ${datos.length} postulantes seleccionados?`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );

  if (confirmacion !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }

  datos.forEach(fila => {
    const nombre = fila[indiceNombre];
    const correo = fila[indiceCorreo];
    const asunto = "¡Felicitaciones! Has sido seleccionado para el Programa de Inglés PUCV";
    const cuerpo = `Estimado/a ${nombre},\n\nNos complace informarte que has sido seleccionado/a para participar en el programa de inglés.\n\nPor favor, responde a este correo para confirmar si aceptas o rechazas tu cupo a la brevedad.\n\nSaludos cordiales,\nEl equipo de PUCV.`;
    
    // MailApp.sendEmail(correo, asunto, cuerpo); // DESCOMENTAR PARA ENVIAR CORREOS REALES
    console.log(`Correo preparado para ${nombre} a ${correo}`); // Para pruebas
  });

  SpreadsheetApp.getUi().alert(`Se ha completado el proceso de envío de correos a ${datos.length} postulantes.`);
}