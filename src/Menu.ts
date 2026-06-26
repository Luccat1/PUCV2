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
    .addItem('📊 Evaluar Postulaciones', 'abrirDialogoEvaluacion')
    .addItem('📋 Generar Lista Final', 'ejecutarGenerarListaFinal')
    .addSeparator()
    .addItem('⚙️ Configurar Pesos', 'abrirSidebarConfig')
    .addItem('👁️ Revisar Postulaciones', 'abrirSidebarRevision')
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Enviar Correos')
      .addItem('✅ Seleccionados', 'enviarCorreosSeleccionados')
      .addItem('🧪 Test de Nivel', 'enviarCorreosTestNivel')
      .addItem('💎 Hand Picked (Extratemporáneos)', 'enviarCorreosHandPicked')
      .addItem('⏳ Lista de Espera', 'enviarCorreosEspera')
      .addItem('❌ No Seleccionados', 'enviarCorreosNoSeleccionados')
      .addSeparator()
      .addItem('👁️ Vista Previa Siguiente (Lista de Espera)', 'mostrarVistaPreviaProximo')
      .addItem('✉️ Enviar Correo de Prueba', 'abrirDialogoCorreoPrueba')
      .addSeparator()
      .addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases'))
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
function abrirDialogoEvaluacion(): void {
  const html = HtmlService.createHtmlOutputFromFile('DialogConfirmEval')
    .setWidth(600)
    .setHeight(450);
  SpreadsheetApp.getUi().showModalDialog(html, 'Confirmar Evaluación');
}

function abrirSidebarConfig(): void {
  const html = HtmlService.createHtmlOutputFromFile('SidebarConfig')
    .setTitle('Configuración de Pesos')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function abrirSidebarRevision(): void {
  const html = HtmlService.createHtmlOutputFromFile('SidebarRevision')
    .setTitle('Revisión de Postulaciones')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function ejecutarGenerarListaFinal(): void {
  const result = generarListaFinalCurso();
  SpreadsheetApp.getUi().alert('Generar Lista Final', result, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu action wrappers
 */
function confirmarYEnviarCorreos(tipo: string): void {
  const ui = SpreadsheetApp.getUi();
  const vistaPrevia = previewEmailBatch(tipo);
  
  const respuesta = ui.alert('Confirmar Envío de Correos', 
    vistaPrevia + '\n\n¿Estás SEGURO de que deseas enviar estos correos REALMENTE?', 
    ui.ButtonSet.YES_NO);
    
  if (respuesta === ui.Button.YES) {
    const resultado = sendEmailBatch(tipo);
    ui.alert('Resultado', resultado, ui.ButtonSet.OK);
  } else {
    ui.alert('Cancelado', 'El envío de correos ha sido cancelado.', ui.ButtonSet.OK);
  }
}

function enviarCorreosSeleccionados() { confirmarYEnviarCorreos('SELECTED'); }
function enviarCorreosTestNivel() { confirmarYEnviarCorreos('TEST_LEVEL_ONLY'); }
function enviarCorreosHandPicked() { confirmarYEnviarCorreos('HAND_PICKED'); }
function enviarCorreosEspera() { confirmarYEnviarCorreos('WAITLIST'); }
function enviarCorreosNoSeleccionados() { confirmarYEnviarCorreos('NO_SELECTED'); }

function ejecutarAnalisisDesdeMenu() {
  const report = getAnalysisReport();
  SpreadsheetApp.getUi().alert("Análisis de Equilibrio", report, SpreadsheetApp.getUi().ButtonSet.OK);
}

function abrirDashboard() {
  const url = ScriptApp.getService().getUrl();
  const html = `<div style="font-family: 'Inter', -apple-system, sans-serif; padding: 15px; text-align: center;">
                  <p style="color: #1a1a1a; font-size: 14px; margin-bottom: 20px; line-height: 1.5;">
                    El panel de control administrativo se abrirá en una nueva pestaña. Si tu navegador bloqueó la apertura automática, haz clic en el botón de abajo:
                  </p>
                  <a href="${url}" target="_blank" style="background-color: #0055a2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" onclick="google.script.host.close();">
                    🚀 Abrir Panel de Control (Dashboard)
                  </a>
                </div>
                <script>
                  try {
                    var win = window.open("${url}", "_blank");
                    if (win) {
                      google.script.host.close();
                    }
                  } catch (e) {
                    console.error("Popup blocker active", e);
                  }
                </script>`;
  const output = HtmlService.createHtmlOutput(html).setWidth(420).setHeight(180);
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

/**
 * Shows a preview of the next candidate in the waitlist.
 */
function mostrarVistaPreviaProximo(): void {
  const ui = SpreadsheetApp.getUi();
  const preview = previewEmailBatch('SELECTED'); // This currently shows all pending SELECTED
  ui.alert('Próximos Notificables', preview, ui.ButtonSet.OK);
}

/**
 * Opens the sala-collection dialog for the class-start email batch.
 * Required HTML files in GAS project: DialogSalas.html, CorreoInicioClases.html
 */
function abrirDialogoInicioClases(): void {
  const html = HtmlService.createHtmlOutputFromFile('DialogSalas')
    .setWidth(480)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Configurar Salas — Inicio de Clases');
}
