function evaluarPostulacionesPUCV2() {
  const SHEET_ID = "1wxljJRiF6G9Ejs6e83BOTLTZFeiyZmSPCip_vpAdO4Q";
  const INPUT_SHEET = "Respuestas de formulario 1";
  const OUTPUT_SHEET = "Evaluación automatizada";
  const DASHBOARD_SHEET = "Dashboard";

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

    // 1. Etapa del proceso
    const etapa = obtenerValor(fila, "¿En qué etapa se encuentra tu proceso de internacionalización?").toLowerCase();
    if (etapa.includes("postulación enviada") || etapa.includes("carta de aceptación")) puntaje += 3;
    else if (etapa.includes("programa identificado") || etapa.includes("en contacto")) puntaje += 2;
    else if (etapa.includes("buscando programa")) puntaje += 1;

    // 2. Plan de internacionalización (palabras clave)
    const plan = obtenerValor(fila, "¿Cómo has planeado internacionalizar tu carrera?");
    const palabrasClavePlan = ["pasantía", "postdoctorado", "doctorado", "magíster", "investigación", "colaboración", "congreso", "publicar"];
    puntaje += contarPalabrasClave(plan, palabrasClavePlan) * 0.5;

    // 3. Documentos de respaldo
    if (obtenerValor(fila, "Adjunta los documentos de respaldo")) {
      puntaje += 1; // Punto por adjuntar al menos un documento
    }

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
    const datosPostulantes = resultadosCompletos.slice(1); // Omitir encabezados
    if (datosPostulantes.length === 0) {
      return; // No hay datos para generar un dashboard
    }

    // Índices basados en la estructura del array 'resultados'
    const INDICE_CATEGORIA = 5;
    const INDICE_PUNTAJE_TOTAL = 14;

    const puntajes = datosPostulantes.map(fila => parseFloat(fila[INDICE_PUNTAJE_TOTAL]));
    const totalPostulantes = datosPostulantes.length;
    const puntajePromedio = puntajes.reduce((acc, p) => acc + p, 0) / totalPostulantes;
    const puntajeMaximo = Math.max(...puntajes);
    const puntajeMinimo = Math.min(...puntajes);

    const statsPorCategoria = {};
    datosPostulantes.forEach(fila => {
      const categoria = fila[INDICE_CATEGORIA] || "Sin Categoría";
      const puntaje = parseFloat(fila[INDICE_PUNTAJE_TOTAL]);
      if (!statsPorCategoria[categoria]) {
        statsPorCategoria[categoria] = { sumaPuntajes: 0, contador: 0 };
      }
      statsPorCategoria[categoria].sumaPuntajes += puntaje;
      statsPorCategoria[categoria].contador++;
    });

    // Preparar datos para la hoja
    const datosDashboard = [
      ["Métrica General", "Valor"],
      ["Número Total de Postulantes", totalPostulantes],
      ["Puntaje Promedio General", puntajePromedio.toFixed(2)],
      ["Puntaje Máximo", puntajeMaximo.toFixed(2)],
      ["Puntaje Mínimo", puntajeMinimo.toFixed(2)],
      [], // Fila vacía para separar
      ["Análisis por Categoría", "Nº Postulantes", "Puntaje Promedio"]
    ];

    for (const categoria in statsPorCategoria) {
      const stats = statsPorCategoria[categoria];
      const promedioCategoria = stats.sumaPuntajes / stats.contador;
      datosDashboard.push([categoria, stats.contador, promedioCategoria.toFixed(2)]);
    }

    let hojaDashboard = spreadsheet.getSheetByName(DASHBOARD_SHEET);
    if (!hojaDashboard) hojaDashboard = spreadsheet.insertSheet(DASHBOARD_SHEET);
    else hojaDashboard.clear();

    hojaDashboard.getRange(1, 1, datosDashboard.length, datosDashboard[0].length).setValues(datosDashboard);
  };

  const resultados = [
    ["Apellido(s)", "Nombre(s)", "Correo Electrónico", "RUT", "Fecha de Postulación", "Categoría Postulante",
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
      apellidos, nombres, correo, rut, fechaPostulacion, tipoPostulante,
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

  // Generar y actualizar el dashboard con los resultados finales
  generarYActualizarDashboard(resultados, ss);
  SpreadsheetApp.flush(); // Asegura que todos los cambios se escriban en la hoja.
}