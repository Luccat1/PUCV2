"use strict";
/**
 * @file TestInicioClases.ts
 * GAS-editor-runnable test functions for the class-start email feature.
 * Run each function by name from the GAS editor "Run" button or Executions panel.
 * Output appears in Apps Script → Executions log.
 */
/**
 * Tests getNivelesActivos().
 * Expected: returns an array of level strings that have unnotified recipients in Lista Final.
 * Run after Lista Final is populated; expect ["B1+", "B2.1", ...] or similar.
 */
function testGetNivelesActivos() {
    try {
        const niveles = getNivelesActivos();
        Logger.log("testGetNivelesActivos: OK — Niveles activos: " + JSON.stringify(niveles));
        if (niveles.length === 0) {
            Logger.log("  WARN: Lista Final vacía o todos ya notificados. Verificar datos.");
        }
    }
    catch (e) {
        Logger.log("testGetNivelesActivos: FAIL — " + e.message);
    }
}
/**
 * Tests guardarSalasYObtenerPreview() with valid sala data.
 * Expected: returns a multi-line preview string mentioning each nivel and sala.
 * Also tests validation: call with empty sala should throw.
 */
function testGuardarSalasYObtenerPreview() {
    try {
        const niveles = getNivelesActivos();
        if (niveles.length === 0) {
            Logger.log("testGuardarSalasYObtenerPreview: SKIP — No active levels found.");
            return;
        }
        // Build a valid sala map
        const salasValidas = {};
        niveles.forEach(n => { salasValidas[n] = "Sala 101 (TEST)"; });
        const preview = guardarSalasYObtenerPreview(salasValidas);
        Logger.log("testGuardarSalasYObtenerPreview: OK — Preview:\n" + preview);
        // Verify in-memory storage
        niveles.forEach(n => {
            const stored = PROGRAM_DATA.HORARIOS[n].sala;
            if (stored !== "Sala 101 (TEST)") {
                Logger.log(`  FAIL: PROGRAM_DATA.HORARIOS["${n}"].sala = "${stored}", expected "Sala 101 (TEST)"`);
            }
        });
        // Validation test: empty sala should throw
        try {
            const salasInvalidas = {};
            niveles.forEach(n => { salasInvalidas[n] = ""; });
            guardarSalasYObtenerPreview(salasInvalidas);
            Logger.log("  FAIL: Expected throw for empty sala, but no error was thrown.");
        }
        catch (validationErr) {
            Logger.log("  Validation OK: empty sala correctly rejected — " + validationErr.message);
        }
    }
    catch (e) {
        Logger.log("testGuardarSalasYObtenerPreview: FAIL — " + e.message);
    }
}
/**
 * Tests getRecipientsInicioClases() — verifies row filtering logic.
 * Expected: returns only student rows, no CATEGORÍA or PRUEBA DE NIVEL rows,
 * no already-notified rows.
 */
function testGetRecipientsInicioClases() {
    try {
        const recipients = getRecipientsInicioClases();
        Logger.log("testGetRecipientsInicioClases: OK — Recipients count: " + recipients.length);
        recipients.slice(0, 3).forEach(r => {
            Logger.log(`  rowNum=${r.rowNum} | ${r.apellido}, ${r.nombre} | ${r.email} | ${r.nivel}`);
        });
        const badRows = recipients.filter(r => !r.email || r.nivel.startsWith("CATEGORÍA:") || r.nivel === "PRUEBA DE NIVEL");
        if (badRows.length > 0) {
            Logger.log("  FAIL: " + badRows.length + " rows with invalid nivel or missing email leaked through filter.");
        }
    }
    catch (e) {
        Logger.log("testGetRecipientsInicioClases: FAIL — " + e.message);
    }
}
/**
 * Tests renderCorreoInicioClases() — renders the template and checks output.
 * Expected: HTML string containing nombre, nivel, sala, fechaInicio values.
 * Requires CorreoInicioClases.html to be deployed in the GAS project.
 */
function testRenderCorreoInicioClases() {
    try {
        const html = renderCorreoInicioClases({
            nombre: "Estudiante Prueba",
            nivel: "B2.1",
            catedra: "Lunes y Miércoles 17:45-18:55",
            ayudantia: "Jueves 17:45-18:55",
            sala: "Sala TEST-42",
            fechaInicio: PROGRAM_DATA.FECHA_INICIO,
            fechaTermino: PROGRAM_DATA.FECHA_TERMINO,
        });
        const checks = [
            { label: "nombre", value: "Estudiante Prueba" },
            { label: "nivel", value: "B2.1" },
            { label: "sala", value: "Sala TEST-42" },
            { label: "fechaInicio", value: PROGRAM_DATA.FECHA_INICIO },
        ];
        let allPassed = true;
        checks.forEach(c => {
            if (!html.includes(c.value)) {
                Logger.log(`  FAIL: rendered HTML missing ${c.label} = "${c.value}"`);
                allPassed = false;
            }
        });
        if (allPassed) {
            Logger.log("testRenderCorreoInicioClases: OK — All expected values present in rendered HTML. Length: " + html.length);
        }
    }
    catch (e) {
        Logger.log("testRenderCorreoInicioClases: FAIL — " + e.message +
            "\n  (If 'Unable to find item: CorreoInicioClases', deploy CorreoInicioClases.html to GAS editor first)");
    }
}
