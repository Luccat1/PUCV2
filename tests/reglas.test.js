// Pruebas de elegibilidad (hallazgo 1), desempates, sanitización de fórmulas y tokens contra dist/.
const fs = require("fs"), vm = require("vm");
const dist = require("path").join(__dirname, "..", "dist") + "/";
const ctx = { console, SpreadsheetApp: {}, Utilities: {}, PropertiesService: {}, LockService: {}, Logger: console };
vm.createContext(ctx);
for (const f of ["Config.js", "Utils.js", "Evaluacion.js", "WebApp.js", "Seleccionados.js"]) {
  vm.runInContext(fs.readFileSync(dist + f, "utf8"), ctx, { filename: f });
}
const run = (code) => vm.runInContext(code, ctx);

const COL = run("CONFIG.COLUMNS");
const HEADERS = run("HEADERS");
const DECLARACIONES = run("DECLARACIONES_REQUERIDAS");

let fallos = 0;
function ok(nombre, cond) {
  if (!cond) fallos++;
  console.log((cond ? "OK   " : "FALLA") + " " + nombre);
}

function filaObj(o) {
  const idx = {}, arr = [];
  Object.keys(o).forEach((k, i) => { idx[k] = i; arr.push(o[k]); });
  return { arr, idx };
}

function baseElegible() {
  const o = {
    [COL.AVAILABILITY_SESSIONS]: "Sí",
    [COL.AVAILABILITY_CONFLICTS]: "No",
    [COL.AVAILABILITY_ASSISTANCE]: "Sí",
    [COL.PREV_FAILED]: "No",
    [COL.PREV_WITHDREW]: "No",
    [COL.PREV_C1]: "No",
    [COL.PREV_COURSES]: "Ninguno",
    [COL.ENROLLED]: "Sí",
    [COL.PILE_STATUS]: "Aprobé todos los cursos obligatorios"
  };
  DECLARACIONES.forEach(d => { o[d] = "Sí"; });
  return o;
}

console.log("== HALLAZGO 1: ELEGIBILIDAD Y VISTA SIN OBSERVACIONES ==");
{
  const f = filaObj(baseElegible());
  ctx.__a = f.arr; ctx.__i = f.idx;
  ok("postulante elegible -> 0 motivos", run("motivosNoElegible_(__a, 'Estudiante de pregrado', __i)").length === 0);

  const sinAsist = baseElegible();
  sinAsist[COL.AVAILABILITY_ASSISTANCE] = "No";
  const f2 = filaObj(sinAsist);
  ctx.__a = f2.arr; ctx.__i = f2.idx;
  ok("sin compromiso 80% -> no elegible", run("motivosNoElegible_(__a, 'Estudiante de pregrado', __i)").length > 0);

  const pilePend = baseElegible();
  pilePend[COL.PILE_STATUS] = "Aún tengo cursos obligatorios pendientes";
  const f3 = filaObj(pilePend);
  ctx.__a = f3.arr; ctx.__i = f3.idx;
  ok("PILE pendiente en estudiante -> no elegible", run("motivosNoElegible_(__a, 'Estudiante de pregrado', __i)").length > 0);

  const f4 = filaObj(baseElegible());
  ctx.__a = f4.arr; ctx.__i = f4.idx;
  ok("alumni -> no elegible", run("motivosNoElegible_(__a, 'Alumni / Exalumno', __i)").length > 0);

  // vistaEvaluacion_(resultados, true) excluye NO ELEGIBLE y quita columna Observaciones
  ctx.__res = [
    [HEADERS.LAST_NAME, HEADERS.EMAIL, HEADERS.TOTAL_SCORE, "Observaciones"],
    ["Pérez", "a@pucv.cl", 12, ""],
    ["Soto", "b@pucv.cl", 15, "NO ELEGIBLE: reprobó un curso PUCV2English"]
  ];
  const vista = run("vistaEvaluacion_(__res, true)");
  ok("vistaEvaluacion_ filtra NO ELEGIBLE y conserva cabecera", vista.length === 2 && vista[1][1] === "a@pucv.cl");
  ok("vistaEvaluacion_ elimina columna Observaciones", !vista[0].includes("Observaciones") && vista[0].length === 3);
}

console.log("== DESEMPATES (compararPostulantes_) ==");
{
  // Orden: puntaje desc, categoría (postgrado/académico < funcionario < pregrado < alumni), fecha asc
  const postgradoTarde = [10, "Estudiante de postgrado", new Date("2026-03-05T10:00:00Z")];
  const funcionarioTemprano = [10, "Funcionario", new Date("2026-03-01T10:00:00Z")];
  const pregradoTemprano = [10, "Estudiante de pregrado", new Date("2026-03-01T10:00:00Z")];
  const pregradoTarde = [10, "Estudiante de pregrado", new Date("2026-03-02T10:00:00Z")];
  const puntajeAlto = [12, "Estudiante de pregrado", new Date("2026-03-10T10:00:00Z")];

  ctx.__lista = [pregradoTarde, funcionarioTemprano, pregradoTemprano, postgradoTarde, puntajeAlto];
  const ordenados = run("__lista.slice().sort((a, b) => compararPostulantes_(a, b, 0, 1, 2))");
  ok("1.º mayor puntaje", ordenados[0][0] === 12);
  ok("2.º empate puntaje: postgrado antes que funcionario", ordenados[1][1] === "Estudiante de postgrado");
  ok("3.º empate puntaje: funcionario antes que pregrado", ordenados[2][1] === "Funcionario");
  ok("4.º empate puntaje y categoría: fecha más temprana primero", ordenados[3][2].getTime() < ordenados[4][2].getTime());
}

console.log("== SANITIZACIÓN DE FÓRMULAS (comoTexto_) ==");
{
  ok("antepone comilla si empieza con =", run("comoTexto_('=IMAGE(\"https://x.cl\")')") === "'=IMAGE(\"https://x.cl\")");
  ok("antepone comilla si empieza con +, -, @", run("comoTexto_('+1')") === "'+1" && run("comoTexto_('-1')") === "'-1" && run("comoTexto_('@SUM')") === "'@SUM");
  ok("no altera texto normal", run("comoTexto_('María José')") === "María José");
}

console.log("== EXPIRACIÓN DE TOKENS (leerToken_) ==");
{
  const vigente = JSON.stringify({ correo: "a@pucv.cl", fecha: Date.now() - 86400000 });
  const vencido = JSON.stringify({ correo: "b@pucv.cl", fecha: Date.now() - 5 * 86400000 });
  ctx.__t1 = vigente;
  ctx.__t2 = vencido;
  ok("token de 1 día sigue vigente", run("leerToken_(__t1)").vencido === false);
  ok("token de 5 días está vencido", run("leerToken_(__t2)").vencido === true);
}


console.log("== protegerFormulas_ (puntos de escritura) ==");
{
  const m = run("protegerFormulas_([['=IMAGE(\"x\")', 5, '-1', 'Ana', new Date(0)]])")[0];
  ok("texto con = queda como texto", m[0] === "'=IMAGE(\"x\")");
  ok("números y texto normal no cambian", m[1] === 5 && m[3] === "Ana");
  ok("segunda pasada no duplica la comilla", run("protegerFormulas_(protegerFormulas_([['=a']]))")[0][0] === "'=a");
}

console.log("== LISTA DE ESPERA excluye a los ya seleccionados ==");
{
  ctx.LockService.getUserLock = () => ({ waitLock() {}, releaseLock() {} });
  ctx.PropertiesService.getUserProperties = () => ({ getProperty: () => null, setProperty() {} });
  class Hoja {
    constructor(v) { this.values = v; this.out = null; }
    getDataRange() { return { getValues: () => this.values.map(f => [...f]) }; }
    clearConditionalFormatRules() {} getLastRow() { return this.values.length; } getLastColumn() { return this.values[0].length; }
    getRange() { const s = this, r = { clearContent() { return r; }, setValues(v) { s.out = v; return r; }, setNumberFormat() { return r; }, setBackground() { return r; }, setFontColor() { return r; }, setFontWeight() { return r; } }; return r; }
    setTabColor() {} setFrozenRows() {} autoResizeColumns() {}
  }
  const cab = [HEADERS.LAST_NAME, HEADERS.FIRST_NAME, HEADERS.EMAIL, HEADERS.APPLICATION_DATE, HEADERS.CATEGORY, HEADERS.TOTAL_SCORE, HEADERS.LEVEL_APPLIED];
  const fila = (ap, em) => [ap, "N", em, new Date(2026, 0, 1), "Estudiante de pregrado", 5, "B1+"];
  const espera = new Hoja([[HEADERS.RANKING, ...cab, HEADERS.NOTIFICATION_DATE, HEADERS.CLOSURE_NOTIFICATION_DATE], [1, ...fila("A", "ana@x.cl"), "", ""]]);
  const selecc = new Hoja([[HEADERS.RANKING, ...cab], [1, ...fila("A", "ana@x.cl")]]);
  const ss = { getSheetByName: n => (n === run("CONFIG.SHEETS.WAITLIST") ? espera : n === run("CONFIG.SHEETS.SELECTED") ? selecc : null) };
  ctx.__ss = ss; ctx.__res = [cab, fila("A", "ana@x.cl"), fila("B", "bea@x.cl")];
  run("generarHojaListaEspera_(__res, __ss)");
  const correos = espera.out.slice(1).map(f => f[3]);
  ok("ana (ya seleccionada) no queda en espera", !correos.includes("ana@x.cl"));
  ok("bea (nueva) sí queda en espera", correos.includes("bea@x.cl"));
}

console.log(fallos ? `\n${fallos} fallo(s)` : "\nTodo OK");
process.exit(fallos ? 1 : 0);
