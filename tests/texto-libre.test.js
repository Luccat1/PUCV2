// Prueba de las familias léxicas de texto libre contra el código compilado (dist/).
const fs = require("fs"), vm = require("vm");
const dist = require("path").join(__dirname, "..", "dist") + "/"; // requiere npm run build
const ctx = { console, SpreadsheetApp: {}, Utilities: {}, PropertiesService: {}, LockService: {}, Logger: console };
vm.createContext(ctx);
// Config primero (define CONFIG, SCORING_PARAMS, etc.), luego Utils y Evaluacion
for (const f of ["Config.js", "Utils.js", "Evaluacion.js"]) vm.runInContext(fs.readFileSync(dist + f, "utf8"), ctx, { filename: f });
// `const`/`let` de script no cuelgan de ctx; se evalúa dentro del contexto
const run = (code) => vm.runInContext(code, ctx);

const COL = run("CONFIG.COLUMNS");
const fila = (o) => { const idx = {}, arr = []; Object.keys(o).forEach((k, i) => { idx[k] = i; arr.push(o[k]); }); return { arr, idx }; };

function plan(tipo, etapa, planTxt) {
  const { arr, idx } = fila({ [COL.INTL_STAGE]: etapa, [COL.INTL_PLAN]: planTxt, [COL.INTL_SUPPORT_DOCS]: "" });
  ctx.__a = arr; ctx.__i = idx; ctx.__t = tipo;
  return run("calcularPuntajeInternacionalizacion_(__a, __t, __i)");
}
function planes(planTxt) { // puntaje solo de planes (etapa "Interés general" = 0), postgrado sin bono
  return Math.round(plan("Estudiante de postgrado", "Interés general", planTxt) / 1.3 * 100) / 100;
}
function uso(actTxt) {
  const { arr, idx } = fila({ [COL.ENGLISH_USE_FREQUENCY]: "Ocasionalmente", [COL.ENGLISH_USE_ACTIVITIES]: actTxt, [COL.ENGLISH_USE_FUTURE_PROJECTS]: "No" });
  ctx.__a = arr; ctx.__i = idx;
  return Math.round(run("calcularPuntajeUsoIngles_(__a, 'Funcionario', __i)") / 0.75 * 100) / 100;
}

let fallos = 0;
function ok(nombre, obtenido, esperado) {
  const bien = Math.abs(obtenido - esperado) < 0.011;
  if (!bien) fallos++;
  console.log((bien ? "OK   " : "FALLA") + " " + nombre + " -> " + obtenido + (bien ? "" : " (esperado " + esperado + ")"));
}

console.log("== PLANES (suma de planes, tope 1.5) ==");
ok("opción exacta: Postgrado completo", planes("Postgrado completo"), 1);
ok("todas las opciones (tope 1.5)", planes("Postgrado completo, Pasantía de investigación, Intercambio estudiantil, Curso corto especializado, Práctica profesional internacional, Participación en congreso/seminario, Proyecto de investigación internacional, Programa de doble titulación"), 1.5);
ok("Otro: Trabajo (caso real Ulloa)", planes("Postgrado completo, Trabajo"), 1.5);
ok("Otro: Colaboración internacional para ... AIC (caso real Guerra)", planes("Proyecto de investigación internacional, Colaboración internacional para llevar a cabo y publicar un AIC"), 0.5);
ok("Otro: Doctorado en el extranjero", planes("Doctorado en el extranjero"), 1);
ok("Otro: magíster en España", planes("Magíster en España"), 1);
ok("Otro: posgrado (grafía alterna)", planes("posgrado en Chile"), 1);
ok("Otro: Postdoctorado", planes("Postdoctorado en Alemania"), 1);
ok("Otro: doble grado", planes("Doble grado con universidad francesa"), 0.8);
ok("Otro: semestre de intercambio", planes("Semestre de intercambio en Francia"), 0.8);
ok("Otro: estancia de investigación", planes("Estancia de investigación en Brasil"), 0.6);
ok("Otro: proyectos de investigación (plural)", planes("Proyectos de investigación con colegas de Canadá"), 0.5);
ok("Otro: diplomado", planes("Diplomado en gestión cultural en Madrid"), 0.4);
ok("Otro: simposio", planes("Simposio internacional de biología"), 0.3);
ok("Otro: texto que no encaja (otro 0.2)", planes("Beca de idiomas del gobierno"), 0.2);
ok("Otro: negación 'no he pensado'", planes("No he pensado en postgrado todavía"), 0);
ok("Otro: 'Ninguno'", planes("Ninguno"), 0);
ok("Otro: 'N/A'", planes("N/A"), 0);
ok("Otro: 'sin plan'", planes("sin plan por ahora"), 0);
ok("opción + negación en Otro", planes("Postgrado completo, no sé"), 1);
ok("sin tildes ni mayúsculas", planes("INTERCAMBIO ESTUDIANTIL"), 0.8);
ok("vacío", planes(""), 0);

// --- Ejemplos reales aportados por la coordinación ---
ok("real: Práctica profesional en colegio bilingüe", planes("Practica profesional en colegio bilingüe. Con posibilidad de quedar trabajando."), 0.5);
ok("real: Intención de trabajar en EEUU o Canadá", planes("Intención de trabajar en Estados Unidos o Canadá"), 0.5);
ok("real: 'En mi trayectoria profesional' no puntúa", planes("En mi trayectoria profesional"), 0);
ok("real: 'No he planeado eso'", planes("No he planeado eso"), 0);
ok("real: IQA Nueva Zelanda (otro con indicio internacional)", planes("Postgrado completo, Curso corto especializado,  International Qualification Assessment (IQA) de Nueva Zelanda"), 1.5); // 1 + 0.4 + otro 0.2 = 1.6, con tope 1.5
ok("real: coma final vacía", planes("Curso corto especializado, "), 0.4);

function docsPts(docTxt, adj) { // puntaje de respaldo aislado (postgrado, etapa 0, sin planes): peso 1.3
  const { arr, idx } = fila({ [COL.INTL_STAGE]: "Interés general", [COL.INTL_PLAN]: "", [COL.DOCUMENTOS_RESPALDO_SITUACION]: docTxt, [COL.INTL_SUPPORT_DOCS]: adj || "" });
  ctx.__a = arr; ctx.__i = idx; ctx.__t = "Estudiante de postgrado";
  return Math.round(run("calcularPuntajeInternacionalizacion_(__a, __t, __i)") / 1.3 * 100) / 100;
}
console.log("== DOCUMENTOS DE RESPALDO ==");
ok("Carta de aceptación", docsPts("Carta de aceptación"), 1);
ok("varias: gana la más fuerte, no suma", docsPts("Carta de aceptación, Contactos establecidos con institución, Programa identificado"), 1);
ok("Postulación enviada", docsPts("Postulación enviada"), 0.75);
ok("Carta de invitación + contactos", docsPts("Carta de invitación, Contactos establecidos con institución"), 0.75);
ok("Contactos establecidos", docsPts("Contactos establecidos con institución"), 0.5);
ok("Programa identificado", docsPts("Programa identificado"), 0.25);
ok("real: 'no tengo respaldo'", docsPts("no tengo respaldo"), 0);
ok("real: 'No aun'", docsPts("No aun"), 0);
ok("real: 'No hay nada todavía'", docsPts("No hay nada todavía"), 0);
ok("real: 'Ninguno'", docsPts("Ninguno "), 0);
ok("real: 'desconozco los documentos'", docsPts("desconozco los documentos que podría usar"), 0);
ok("real: reuniones con encargados del magíster", docsPts("Reuniones con encargados del programa de Magister"), 0.5);
ok("real: correos con encargada de intercambio", docsPts("correos con encargada de intercambio EII y asistencia a charlas"), 0.5);
ok("real: contacto de mi director de tesis", docsPts("Contacto de mi director de tesis"), 0.5);
ok("real: contacto profesor advisor", docsPts("Contactos establecidos con institución, Contacto de mi profesor advisor con la universidad de destino"), 0.5);
ok("real: 'Aún no hay un correo oficial' (negado)", docsPts("Contactos establecidos con institución, Aún no hay un correo oficial, solo fue conversado oralmente con la directora"), 0.5);
ok("real: 'Solo evaluando opciones por páginas web'", docsPts("Solo evaluando opciones por paginas web"), 0);
ok("real: 'Por el momento es una meta'", docsPts("Por el momento es una meta"), 0);
ok("real: Programa identificado + 'interés general pero en país hispanohablante'", docsPts("Programa identificado, Interes general, pero en un pais de habla hispana."), 0.25);
ok("adjunto suma 0.25 (tope 1)", docsPts("Programa identificado", "http://x"), 0.5);
ok("adjunto no pasa el tope", docsPts("Carta de aceptación", "http://x"), 1);

function textoUso(sit, proy, contrib) {
  const { arr, idx } = fila({ [COL.SITUACIONES_INGLES]: sit, [COL.PROYECTOS_FUTUROS_DESC]: proy, [COL.ENGLISH_USE_CONTRIBUTION]: contrib });
  ctx.__a = arr; ctx.__i = idx; return Math.round(run("puntajeTextoUso_(__a, __i)") * 100) / 100;
}
console.log("== DESCRIPCIONES ABIERTAS (funcionarios): 0.2 por familia, tope 1 ==");
ok("real: científica (artículos, proyectos internacionales, congresos)",
  textoUso("Redacción y lectura de artículos científicos, coordinación y trabajo en proyectos internacionales, postulación y ejecución de proyectos, presentación en congresos, entre otros",
    "Participo y lidero la postulación a proyectos de financiamiento internacional, como National Geographic, Rufford Foundation, DAAD, así como la escritura de artículos científicos",
    "Mejoraría totalmente, ya que gran parte de las actividades en ciencias (congresos, artículos, proyectos, conferencias), son en inglés."), 1);
ok("real: directora de investigación traslacional", textoUso("Necesito usar inglés en reuniones con universidades, expertos y empresas internacionales para explorar colaboraciones y presentar nuestras iniciativas. También participar en congresos, revisar documentación técnica y redactar correos.", "", "Me permitiría participar con mayor fluidez en reuniones con expertos y socios internacionales"), 0.8); // sin mención de proyectos
ok("real: 'ninguno' + 'No' + comentario breve", textoUso("ninguno", "", "tendria mas herramientas para comunicarme en caso de ser necesario o recibamos visitas de alumnos de intercambio como voluntarios para nuestras actividades"), 0.2);
ok("real: bibliografía y modelos de formación práctica", textoUso("En la revisión de bibliografía especializada y marcos de referencia internacionales sobre innovación curricular y modelos de formación práctica para fortalecer los procesos de acompañamiento docente.", "", ""), 0.6);
ok("vacío", textoUso("", "", ""), 0);
ok("solo 'No'/'Ninguno'", textoUso("ninguno", "No", "no"), 0);
ok("texto largo repetitivo no pasa el tope", textoUso("reunion ".repeat(200), "", ""), 0.2);

console.log("== ETAPAS ==");
ok("Ya aceptado/a (pregrado, sin plan)", plan("Estudiante de pregrado", "Ya aceptado/a en programa internacional", ""), 3.5 + 0.5);
ok("En proceso de postulación", plan("Académico", "En proceso de postulación", ""), 2.5);
ok("Con plan concreto para próximo año", plan("Académico", "Con plan concreto para próximo año", ""), 1.75);
ok("En etapa de planificación", plan("Académico", "En etapa de planificación", ""), 1);
ok("Interés general", plan("Académico", "Interés general", ""), 0);

console.log("== ACTIVIDADES (funcionarios; frecuencia 'Ocasionalmente' = 0, proyectos No) ==");
ok("opción exacta: Atención a visitantes internacionales", uso("Atención a visitantes internacionales"), 1);
ok("Comunicación escrita (correos electrónicos, cartas)", uso("Comunicación escrita (correos electrónicos, cartas)"), 0.25);
ok("Traducción de documentos (sin doble conteo con documentos)", uso("Traducción de documentos"), 0.5);
ok("Gestión de documentos internacionales", uso("Gestión de documentos internacionales"), 0.5);
ok("Coordinación con instituciones extranjeras", uso("Coordinación con instituciones extranjeras"), 1);
ok("Apoyo en eventos internacionales", uso("Apoyo en eventos internacionales"), 0.75);
ok("Atención telefónica", uso("Atención telefónica"), 0.25);
ok("Actualmente no realizo actividades en inglés", uso("Actualmente no realizo actividades en inglés"), 0);
ok("Otro: reuniones por Zoom", uso("Atención telefónica, reuniones por Zoom con proveedores"), 0.25);
ok("Otro: clases y docencia", uso("Docencia de talleres en inglés"), 0.5);
ok("Otro: lectura de papers", uso("Lectura de papers y bibliografía"), 0.5);
ok("Otro: recepción de delegaciones", uso("Recepción de delegaciones extranjeras"), 1);
ok("Otro: texto que no encaja", uso("Contabilidad y rendiciones"), 0.25);
ok("Otro: negación", uso("No realizo ninguna"), 0);
ok("'no realizo' + otras opciones válidas", uso("Actualmente no realizo actividades en inglés, Atención telefónica"), 0.25);

console.log("== OTROS CAMPOS DE TEXTO FIJO ==");
function cert(txt, adj) {
  const { arr, idx } = fila({ [COL.CERTIFICATE_LEVEL]: txt, [COL.CERTIFICATE_ATTACHMENT]: adj });
  ctx.__a = arr; ctx.__i = idx; return run("calcularPuntajeCertificado_(__a, __i)");
}
ok("Cambridge B2", cert("Certificado Cambridge B2", ""), 3);
ok("Cambridge B1", cert("Certificado Cambridge B1", ""), 2);
ok("No tengo + adjunto", cert("No tengo certificado Cambridge", "http://x"), 1);
ok("No tengo sin adjunto", cert("No tengo certificado Cambridge", ""), 0);
function motivos(o, tipo) {
  const { arr, idx } = fila(o); ctx.__a = arr; ctx.__i = idx; ctx.__t = tipo;
  return run("motivosNoElegible_(__a, __t, __i)");
}
const base = { [COL.AVAILABILITY_SESSIONS]: "Sí", [COL.AVAILABILITY_CONFLICTS]: "No", [COL.AVAILABILITY_ASSISTANCE]: "Sí", [COL.PREV_FAILED]: "No", [COL.PREV_WITHDREW]: "No", [COL.PREV_C1]: "No" };
const decl = run("DECLARACIONES_REQUERIDAS"); const declSi = {}; decl.forEach(d => declSi[d] = "Sí");
for (const [txt, esp] of [["Ninguno", 0], ["Uno", 0], ["Dos", 1], ["dos cursos", 1]]) {
  ok("cursos previos '" + txt + "'", motivos({ ...base, ...declSi, [COL.PREV_COURSES]: txt }, "Académico").length, esp);
}
for (const [txt, esp] of [["Aprobé todos los cursos obligatorios.", 0], ["Me eximí de todos los cursos obligatorios.", 0],
  ["Cumplí el requisito mediante una combinación de aprobación y eximición.", 0], ["Mi carrera no tiene cursos de inglés obligatorios.", 0],
  ["Aún tengo cursos obligatorios pendientes.", 1]]) {
  ok("PILE '" + txt.slice(0, 30) + "'", motivos({ ...base, ...declSi, [COL.PREV_COURSES]: "Ninguno", [COL.ENROLLED]: "Sí", [COL.PILE_STATUS]: txt }, "Estudiante de pregrado").length, esp);
}
console.log(fallos ? "\n" + fallos + " FALLOS" : "\nTodo OK");
process.exit(fallos ? 1 : 0);
