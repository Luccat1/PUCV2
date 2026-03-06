"use strict";
/**
 * @file Menu.ts
 * Logic for creating the custom Google Sheets menu and handling authorization.
 */
/**
 * Creates the custom menu when the spreadsheet is opened.
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('PUCV2English')
        .addItem('📊 Evaluar Postulaciones', 'abrirDialogoEvaluacion')
        .addItem('📋 Generar Lista Final', 'generarListaFinalCurso')
        .addSeparator()
        .addItem('⚙️ Configurar Pesos', 'abrirSidebarConfig')
        .addItem('👁️ Revisar Postulaciones', 'abrirSidebarRevision')
        .addSeparator()
        .addSubMenu(ui.createMenu('📧 Enviar Correos')
        .addItem('✅ Seleccionados', 'enviarCorreosSeleccionados')
        .addItem('🧪 Test de Nivel', 'enviarCorreosTestNivel')
        .addItem('⏳ Lista de Espera', 'enviarCorreosEspera')
        .addItem('❌ No Seleccionados', 'enviarCorreosNoSeleccionados')
        .addSeparator()
        .addItem('👁️ Vista Previa Siguiente (Lista de Espera)', 'mostrarVistaPreviaProximo')
        .addItem('✉️ Enviar Correo de Prueba', 'abrirDialogoCorreoPrueba'))
        .addSeparator()
        .addItem('📈 Ver Dashboard', 'abrirDashboard')
        .addItem('📉 Ver Análisis de Equilibrio', 'ejecutarAnalisisDesdeMenu')
        .addSeparator()
        .addItem('⚙️ Forzar Autorización', 'forceWebAppPermissions')
        .addToUi();
}
/**
 * Sidebar and Dialog launchers
 */
function abrirDialogoEvaluacion() {
    const html = HtmlService.createHtmlOutputFromFile('DialogConfirmEval')
        .setWidth(600)
        .setHeight(450);
    SpreadsheetApp.getUi().showModalDialog(html, 'Confirmar Evaluación');
}
function abrirSidebarConfig() {
    const html = HtmlService.createHtmlOutputFromFile('SidebarConfig')
        .setTitle('Configuración de Pesos')
        .setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
}
function abrirSidebarRevision() {
    const html = HtmlService.createHtmlOutputFromFile('SidebarRevision')
        .setTitle('Revisión de Postulaciones')
        .setWidth(300);
    SpreadsheetApp.getUi().showSidebar(html);
}
/**
 * Menu action wrappers
 */
function enviarCorreosSeleccionados() { return sendEmailBatch('SELECTED'); }
function enviarCorreosTestNivel() { return sendEmailBatch('TEST_LEVEL_ONLY'); }
function enviarCorreosEspera() { return sendEmailBatch('WAITLIST'); }
function enviarCorreosNoSeleccionados() { return sendEmailBatch('NO_SELECTED'); }
function ejecutarAnalisisDesdeMenu() {
    const report = getAnalysisReport();
    SpreadsheetApp.getUi().alert("Análisis de Equilibrio", report, SpreadsheetApp.getUi().ButtonSet.OK);
}
function abrirDashboard() {
    const url = ScriptApp.getService().getUrl();
    const html = `<p>El dashboard se ha abierto en una nueva pestaña. Si no aparece, haz clic en el siguiente enlace:</p>
                <a href="${url}" target="_blank">Abrir Dashboard</a>
                <script>window.open("${url}", "_blank"); google.script.host.close();</script>`;
    const output = HtmlService.createHtmlOutput(html).setWidth(400).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(output, "Abriendo Dashboard...");
}
/**
 * Force re-authorization by requesting dummy scopes.
 */
function forceWebAppPermissions() {
    // Dummy calls to trigger scopes
    GmailApp.getAliases();
    SpreadsheetApp.getActiveSpreadsheet();
    return "Permisos verificados/solicitados.";
}
function abrirDialogoCorreoPrueba() {
    const ui = SpreadsheetApp.getUi();
    const res = ui.prompt("Enviar Correo de Prueba", "Ingresa el correo del destinatario:", ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() === ui.Button.OK) {
        const email = res.getResponseText();
        const result = sendTestEmail(email, 'CorreoSeleccionado');
        ui.alert(result);
    }
}
/**
 * Shows a preview of the next candidate in the waitlist.
 */
function mostrarVistaPreviaProximo() {
    const ui = SpreadsheetApp.getUi();
    const preview = previewEmailBatch('SELECTED'); // This currently shows all pending SELECTED
    ui.alert('Próximos Notificables', preview, ui.ButtonSet.OK);
}
