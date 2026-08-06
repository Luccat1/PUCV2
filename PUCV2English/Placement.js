"use strict";
/**
 * @file Placement.ts
 * Manages the Cambridge English Placement Test (CEPT) workflow.
 *
 * Flow:
 *  1. sincronizarPlacement()      → syncs paid+accepted+test-level candidates from "Seleccionados" to "Prueba de Nivel"
 *  2. abrirDialogoPlacementXxx()  → opens a modal dialog to configure dates, URL, and delivery method
 *  3. saveConfigAndProcessPlacement(payload) → saves config + runs processPlacementEmails()
 *  4. processPlacementEmails(mode, deliveryMethod) → sends emails / creates drafts, logs status
 *
 * Delivery methods:
 *  - ENVIAR_REAL       → send live emails to all marked candidates
 *  - BORRADOR_TODO     → create Gmail drafts for all marked candidates
 *  - BORRADOR_MUESTRA  → create Gmail drafts for a sample of up to 5 candidates
 *  - TEST_AUTOSEND     → send a single test email with fake credentials to the running user
 */
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PLACEMENT_HEADERS = [
    "user id",
    "password",
    "institutional id",
    "nombre",
    "correo",
    "Puntaje",
    "Nivel",
    "Enviar Inicial",
    "Enviar Recordatorio",
    "Enviar Nuevo Código",
    "Reminder Status",
    "Nivel Insuficiente", // index 11 — Phase 3: marks insufficient-level students
    "Correo Rechazo Enviado" // index 12 — Phase 3: idempotency stamp for rejection email
];
const PLACEMENT_COL = {
    userId: 0,
    password: 1,
    institution: 2,
    nombre: 3,
    correo: 4,
    puntaje: 5,
    nivel: 6,
    enviarInicial: 7,
    enviarRecordatorio: 8,
    enviarNuevoCodigo: 9,
    status: 10,
    nivelInsuficiente: 11, // "Nivel Insuficiente" column — value "Sí" when level is insufficient
    correoRechazaEnviado: 12 // "Correo Rechazo Enviado" column — date stamp after rejection email sent
};
// ---------------------------------------------------------------------------
// Public entry points (called by Menu.ts)
// ---------------------------------------------------------------------------
/**
 * Synchronises eligible candidates from "Seleccionados" into the "Prueba de Nivel" sheet.
 * A candidate is eligible when:
 *   - Verificación Certificado == "Test de nivel"
 *   - Aceptación              == "Acepta"
 *   - Pago Matrícula          == "Pagado"
 *
 * Candidates already present (matched by email) are not duplicated.
 * New candidates are added with "Enviar Inicial" checkbox pre-ticked.
 */
function sincronizarPlacement() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const selSheet = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!selSheet) {
        SpreadsheetApp.getUi().alert("❌ No se encontró la hoja \"Seleccionados\".");
        return;
    }
    // Ensure "Prueba de Nivel" sheet exists
    let placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
    if (!placSheet) {
        placSheet = ss.insertSheet(CONFIG.SHEETS.PLACEMENT);
        _initPlacementSheet(placSheet);
    }
    // Read existing emails in placement sheet (to avoid duplicates)
    const placLastRow = placSheet.getLastRow();
    const existingEmails = new Set();
    if (placLastRow > 1) {
        const emailCol = PLACEMENT_COL.correo + 1; // 1-based
        const emailData = placSheet.getRange(2, emailCol, placLastRow - 1, 1).getValues();
        emailData.forEach(row => {
            const e = (row[0] || "").toString().trim().toLowerCase();
            if (e)
                existingEmails.add(e);
        });
    }
    // Read Seleccionados headers to find column indexes
    const selData = selSheet.getDataRange().getValues();
    if (selData.length < 2) {
        SpreadsheetApp.getUi().alert("ℹ️ La hoja \"Seleccionados\" está vacía.");
        return;
    }
    const selHeaders = selData[0].map((h) => (h || "").toString().trim());
    const iEmail = selHeaders.indexOf("Correo Electrónico");
    const iNombre = selHeaders.indexOf("Nombre(s)");
    const iApellido = selHeaders.indexOf("Apellido(s)");
    const iVerif = selHeaders.indexOf("Verificación Certificado");
    const iAcep = selHeaders.indexOf("Aceptación");
    const iPago = selHeaders.indexOf("Pago Matrícula");
    if ([iEmail, iNombre, iApellido, iVerif, iAcep, iPago].some(i => i === -1)) {
        SpreadsheetApp.getUi().alert("❌ No se encontraron todas las columnas requeridas en \"Seleccionados\".\n" +
            "Asegúrate de que existan: Correo Electrónico, Nombre(s), Apellido(s), Verificación Certificado, Aceptación, Pago Matrícula.");
        return;
    }
    // Filter eligible candidates and collect new rows
    const newRows = [];
    for (let r = 1; r < selData.length; r++) {
        const row = selData[r];
        const verif = (row[iVerif] || "").toString().trim();
        const acep = (row[iAcep] || "").toString().trim();
        const pago = (row[iPago] || "").toString().trim();
        if (verif !== "Test de nivel" || acep !== "Acepta" || pago !== "Pagado")
            continue;
        const correo = (row[iEmail] || "").toString().trim().toLowerCase();
        if (!correo || existingEmails.has(correo))
            continue;
        const nombre = `${(row[iNombre] || "")} ${(row[iApellido] || "")}`.trim();
        newRows.push([
            "", // user id
            "", // password
            CONFIG.DEFAULT_INSTITUTION_ID, // institutional id
            nombre, // nombre
            correo, // correo
            "", // Puntaje
            "", // Nivel
            true, // Enviar Inicial (pre-ticked)
            false, // Enviar Recordatorio
            false, // Enviar Nuevo Código
            "Sincronizado de Seleccionados", // Reminder Status
            "", // Nivel Insuficiente
            "" // Correo Rechazo Enviado
        ]);
        existingEmails.add(correo);
    }
    if (newRows.length === 0) {
        SpreadsheetApp.getUi().alert("ℹ️ No hay candidatos nuevos para sincronizar.\n\nTodos los elegibles ya están en la hoja \"Prueba de Nivel\".");
        return;
    }
    const targetRow = placSheet.getLastRow() + 1;
    placSheet.getRange(targetRow, 1, newRows.length, PLACEMENT_HEADERS.length).setValues(newRows);
    // Add checkboxes to new rows
    placSheet.getRange(targetRow, PLACEMENT_COL.enviarInicial + 1, newRows.length, 3).insertCheckboxes();
    // Add dropdown validation for Nivel column
    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["A1", "A2", "B1.1", "B1.2", "B1+", "B2.1", "B2.2", "C1"], true)
        .setAllowInvalid(false)
        .build();
    placSheet.getRange(targetRow, PLACEMENT_COL.nivel + 1, newRows.length, 1).setDataValidation(rule);
    SpreadsheetApp.getUi().alert(`✅ Sincronización completada.\n\n${newRows.length} candidato(s) agregado(s) a "Prueba de Nivel".`);
}
/**
 * Opens the configuration dialog for the INICIAL send mode.
 */
function abrirDialogoPlacementInicial() {
    _abrirDialogoPlacement("INICIAL");
}
/**
 * Opens the configuration dialog for the RECORDATORIO send mode.
 */
function abrirDialogoPlacementRecordatorio() {
    _abrirDialogoPlacement("RECORDATORIO");
}
/**
 * Opens the configuration dialog for the NUEVO_CODIGO send mode.
 */
function abrirDialogoPlacementNuevoCodigo() {
    _abrirDialogoPlacement("NUEVO_CODIGO");
}
/**
 * Called asynchronously from the dialog HTML via google.script.run.
 * Saves configuration properties and executes the email processing.
 *
 * @param payload - Object with mode, deliveryMethod, fechaInicial, fechaRecordatorio, url
 * @returns Result message for display in the dialog
 */
function saveConfigAndProcessPlacement(payload) {
    const props = PropertiesService.getDocumentProperties();
    props.setProperty("PLACEMENT_FECHA_INICIAL", payload.fechaInicial.trim());
    props.setProperty("PLACEMENT_FECHA_RECORDATORIO", payload.fechaRecordatorio.trim());
    props.setProperty("PLACEMENT_URL", payload.url.trim());
    return _processPlacementEmails(payload.mode, payload.deliveryMethod);
}
// ---------------------------------------------------------------------------
// Core processing
// ---------------------------------------------------------------------------
function _processPlacementEmails(mode, deliveryMethod) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const placSheet = ss.getSheetByName(CONFIG.SHEETS.PLACEMENT);
    if (!placSheet) {
        throw new Error("No se encontró la hoja \"Prueba de Nivel\". Ejecuta primero \"Sincronizar Candidatos a Test\".");
    }
    const props = PropertiesService.getDocumentProperties();
    const fechaInicial = props.getProperty("PLACEMENT_FECHA_INICIAL") || "NO CONFIGURADA";
    const fechaRecordatorio = props.getProperty("PLACEMENT_FECHA_RECORDATORIO") || "NO CONFIGURADA";
    const placementUrl = props.getProperty("PLACEMENT_URL") || "https://www.metritests.com/metrica/";
    // Handle TEST_AUTOSEND separately
    if (deliveryMethod === "TEST_AUTOSEND") {
        return _sendTestAutoSend(placementUrl, fechaInicial);
    }
    const fechaLimite = (mode === "INICIAL") ? fechaInicial : fechaRecordatorio;
    if (fechaLimite === "NO CONFIGURADA") {
        throw new Error("No has configurado la Fecha Límite. Revisa la ventana de configuración.");
    }
    const isSample = deliveryMethod === "BORRADOR_MUESTRA";
    const isDraft = deliveryMethod === "BORRADOR_TODO" || isSample;
    const sampleLimit = 5;
    // Checkbox column index (1-based) for the current mode
    const checkColIdx = _getCheckboxColForMode(mode);
    const allData = placSheet.getDataRange().getValues();
    if (allData.length < 2)
        throw new Error("La hoja \"Prueba de Nivel\" no tiene datos.");
    // Verify quota before starting
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < 1 && !isDraft) {
        throw new Error("Has alcanzado el límite diario de envíos de Google. Intenta mañana o usa modo borrador.");
    }
    // Try to attach PDF instructions from Drive
    let pdfBlob = null;
    try {
        const files = DriveApp.getFilesByName(CONFIG.PLACEMENT_PDF_NAME);
        if (files.hasNext()) {
            pdfBlob = files.next().getBlob();
        }
        else {
            Logger.log(`AVISO: No se encontró el PDF "${CONFIG.PLACEMENT_PDF_NAME}" en Google Drive. El correo se enviará sin adjunto.`);
        }
    }
    catch (e) {
        Logger.log(`Error al buscar PDF: ${e.message}`);
    }
    // Accumulate status updates and process
    const statusUpdates = allData.map(row => [row[PLACEMENT_COL.status]]);
    const checkUpdates = allData.map(row => [row[checkColIdx - 1]]);
    let processed = 0;
    let skipped = 0;
    const timeStr = new Date().toLocaleString("es-CL");
    const emailTemplate = HtmlService.createTemplateFromFile("CorreoPlacementTest");
    for (let r = 1; r < allData.length; r++) {
        // Sample limit
        if (isSample && processed >= sampleLimit)
            break;
        // Real send quota
        if (!isDraft && processed >= quota)
            break;
        const row = allData[r];
        const isChecked = (row[checkColIdx - 1] === true);
        if (!isChecked) {
            skipped++;
            continue;
        }
        const correo = (row[PLACEMENT_COL.correo] || "").toString().trim();
        const username = (row[PLACEMENT_COL.userId] || "").toString().trim();
        const password = (row[PLACEMENT_COL.password] || "").toString().trim();
        const institutionId = (row[PLACEMENT_COL.institution] || CONFIG.DEFAULT_INSTITUTION_ID).toString().trim() || CONFIG.DEFAULT_INSTITUTION_ID;
        const nombreCompleto = (row[PLACEMENT_COL.nombre] || "").toString().trim();
        const firstName = nombreCompleto.split(/\s+/)[0] || nombreCompleto; // first word = first name for name-apellido format
        if (!correo) {
            skipped++;
            continue;
        }
        if (!username || !password) {
            statusUpdates[r][0] = `Error: Faltan credenciales (user id / password). Fila ${r + 1}`;
            continue;
        }
        try {
            emailTemplate.nombre = nombreCompleto;
            emailTemplate.firstName = firstName;
            emailTemplate.username = username;
            emailTemplate.password = password;
            emailTemplate.institutionId = institutionId;
            emailTemplate.fechaLimite = fechaLimite;
            emailTemplate.placementUrl = placementUrl;
            const htmlBody = emailTemplate.evaluate().getContent();
            const plainBody = _buildPlainBody({ nombre: nombreCompleto, username, password, institutionId, fechaLimite, placementUrl });
            const subject = _buildSubject(mode);
            const options = {
                htmlBody,
                name: "Programa PUCV2English"
            };
            if (pdfBlob) {
                options.attachments = [pdfBlob];
            }
            if (isDraft) {
                GmailApp.createDraft(correo, subject, plainBody, options);
                statusUpdates[r][0] = `Borrador ${mode} creado el ${timeStr}`;
            }
            else {
                GmailApp.sendEmail(correo, subject, plainBody, options);
                statusUpdates[r][0] = `Enviado ${mode} el ${timeStr}`;
            }
            // Uncheck after successful operation
            checkUpdates[r][0] = false;
            processed++;
        }
        catch (e) {
            const msg = e.message || String(e);
            statusUpdates[r][0] = `Error: ${msg}`;
            if (msg.includes("limit") || msg.includes("cuota"))
                break;
        }
    }
    // Write back status and checkbox updates
    if (processed > 0 || statusUpdates.some((v, i) => i > 0 && v[0] !== allData[i][PLACEMENT_COL.status])) {
        placSheet.getRange(1, PLACEMENT_COL.status + 1, statusUpdates.length, 1).setValues(statusUpdates);
        placSheet.getRange(1, checkColIdx, checkUpdates.length, 1).setValues(checkUpdates);
    }
    const action = isDraft ? "borradores creados" : "correos enviados";
    const sampleNote = isSample ? ` (muestra limitada a ${sampleLimit})` : "";
    return `✅ ${processed} ${action}${sampleNote}. ${skipped} omitidos (sin marca).${pdfBlob ? "" : "\n⚠️ PDF de instrucciones no encontrado en Drive — correo enviado sin adjunto."}`;
}
// ---------------------------------------------------------------------------
// TEST_AUTOSEND
// ---------------------------------------------------------------------------
function _sendTestAutoSend(placementUrl, fechaLimite) {
    const adminEmail = Session.getActiveUser().getEmail();
    if (!adminEmail)
        throw new Error("No se pudo detectar el correo del administrador. Verifica tu cuenta de Google.");
    const fakeData = {
        nombre: "Administrador de Prueba",
        firstName: "Administrador",
        username: "TEST_USER_123",
        password: "TEST_PASS_456",
        institutionId: CONFIG.DEFAULT_INSTITUTION_ID,
        fechaLimite: fechaLimite || "viernes 25 de julio",
        placementUrl: placementUrl
    };
    const emailTemplate = HtmlService.createTemplateFromFile("CorreoPlacementTest");
    Object.assign(emailTemplate, fakeData);
    const htmlBody = emailTemplate.evaluate().getContent();
    const plainBody = _buildPlainBody(fakeData);
    const subject = `[PRUEBA SANDBOX] Test de Diagnóstico — PUCV2English`;
    let pdfBlob;
    try {
        const files = DriveApp.getFilesByName(CONFIG.PLACEMENT_PDF_NAME);
        if (files.hasNext())
            pdfBlob = files.next().getBlob();
    }
    catch (_) { }
    const options = {
        htmlBody,
        name: "Programa PUCV2English [TEST]"
    };
    if (pdfBlob)
        options.attachments = [pdfBlob];
    GmailApp.sendEmail(adminEmail, subject, plainBody, options);
    return `✅ Correo de prueba enviado a ${adminEmail}. Revisa tu bandeja de entrada.${pdfBlob ? "" : "\n⚠️ PDF no encontrado — correo enviado sin adjunto."}`;
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function _abrirDialogoPlacement(mode) {
    const html = HtmlService.createTemplateFromFile("DialogPlacementConfig");
    html.mode = mode;
    const props = PropertiesService.getDocumentProperties();
    html.fechaInicial = props.getProperty("PLACEMENT_FECHA_INICIAL") || "viernes 25 de julio";
    html.fechaRecordatorio = props.getProperty("PLACEMENT_FECHA_RECORDATORIO") || "miércoles 30 de julio";
    html.url = props.getProperty("PLACEMENT_URL") || "https://www.metritests.com/metrica/";
    const output = html.evaluate().setWidth(500).setHeight(500);
    SpreadsheetApp.getUi().showModalDialog(output, `🧪 Prueba de Nivel — Envío ${mode}`);
}
function _initPlacementSheet(sh) {
    const headerRange = sh.getRange(1, 1, 1, PLACEMENT_HEADERS.length);
    headerRange.setValues([PLACEMENT_HEADERS]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#003366");
    headerRange.setFontColor("#ffffff");
    sh.setFrozenRows(1);
    // Set up dropdown validation rule for Nivel column (from row 2 to 1000)
    const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["A1", "A2", "B1.1", "B1.2", "B1+", "B2.1", "B2.2", "C1"], true)
        .setAllowInvalid(false)
        .build();
    sh.getRange(2, PLACEMENT_COL.nivel + 1, 999, 1).setDataValidation(rule);
    sh.autoResizeColumns(1, PLACEMENT_HEADERS.length);
}
function _getCheckboxColForMode(mode) {
    // Returns 1-based column index
    switch (mode) {
        case "RECORDATORIO": return PLACEMENT_COL.enviarRecordatorio + 1;
        case "NUEVO_CODIGO": return PLACEMENT_COL.enviarNuevoCodigo + 1;
        default: return PLACEMENT_COL.enviarInicial + 1;
    }
}
function _buildSubject(mode) {
    switch (mode) {
        case "RECORDATORIO": return "Recordatorio: Placement Test — PUCV2English";
        case "NUEVO_CODIGO": return "Nuevas Credenciales — Placement Test, PUCV2English";
        default: return "Test de Diagnóstico: PUCV2English";
    }
}
function _buildPlainBody(d) {
    return [
        `Hola ${d.nombre},`,
        "",
        "Muchas gracias por postular al programa PUCV2English.",
        "",
        `Para continuar con el proceso de confirmación de tu cupo en los cursos seleccionados, necesitamos que realices el Placement Test (Test de Diagnóstico) con plazo máximo el ${d.fechaLimite}.`,
        "",
        "Ten en cuenta que esta evaluación es un paso obligatorio para asegurar tu vacante. El nivel asignado inicialmente podría ser modificado (cambiando a un nivel superior o inferior) de acuerdo con los resultados específicos que obtengas en esta prueba.",
        "",
        "Por favor, envíanos un correo corroborando que pudiste realizar el test satisfactoriamente una vez que lo finalices.",
        "",
        "=== REQUERIMIENTOS TÉCNICOS ===",
        "- Conexión estable a Internet.",
        "- Computador de escritorio o portátil (no se permite celulares ni tablets).",
        "- No usar computador MAC ni navegador Safari.",
        "- Navegador actualizado (Google Chrome o Mozilla Firefox).",
        "- Cámara web y micrófono funcionando correctamente.",
        "- Espacio silencioso y libre de interrupciones.",
        "",
        "=== TUS CREDENCIALES ===",
        `Username:       ${d.username}`,
        `Password:       ${d.password}`,
        `Institution ID: ${d.institutionId}`,
        "",
        "=== INSTRUCCIONES DE ACCESO ===",
        `1. Ingresa a: ${d.placementUrl}`,
        "2. Selecciona \"Login\" (no \"Entry Code\").",
        "3. Ingresa tus credenciales.",
        "4. En la sección \"Active\", busca CEPT, Reading and Listening y haz clic en la flecha (▶).",
        "5. Completa tus datos personales. En \"Test Purpose\" selecciona \"Placement on a Language Course\".",
        "6. En \"Candidate ID\" ingresa tu RUT (sin puntos, con guion).",
        "7. Haz clic en Submit y luego en Open para iniciar.",
        "",
        "Importante: Realiza la prueba desde un computador con buena conexión a internet y en un ambiente tranquilo.",
        "",
        "Saludos cordiales,",
        "",
        "Programa PUCV2English",
        "Dirección General de Asuntos Internacionales",
        "Pontificia Universidad Católica de Valparaíso",
        "",
        "Este es un correo generado automáticamente. Por consultas: idiomas@pucv.cl"
    ].join("\n");
}
