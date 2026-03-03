/**
 * @file Menu.ts
 * Logic for creating the custom Google Sheets menu and handling authorization.
 */

/**
 * Creates the custom menu when the spreadsheet is opened.
 */
function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PUCV2English')
    .addItem('📊 Evaluar Postulaciones', 'evaluarPostulacionesPUCV2')
    .addItem('📋 Generar Lista Final', 'generarListaFinalCurso')
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Enviar Correos')
      .addItem('✅ Seleccionados', 'enviarCorreosSeleccionados')
      .addItem('🧪 Test de Nivel', 'enviarCorreosTestNivel')
      .addItem('⏳ Lista de Espera', 'enviarCorreosEspera')
      .addItem('❌ No Seleccionados', 'enviarCorreosNoSeleccionados')
      .addSeparator()
      .addItem('✉️ Enviar Correo de Prueba', 'abrirDialogoCorreoPrueba'))
    .addSeparator()
    .addItem('📈 Ver Dashboard', 'abrirDashboard')
    .addItem('📉 Ver Análisis de Equilibrio', 'ejecutarAnalisisDesdeMenu')
    .addSeparator()
    .addItem('⚙️ Forzar Autorización', 'forceWebAppPermissions')
    .addToUi();
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
function forceWebAppPermissions(): string {
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
