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
    .addItem('🔄 Reevaluar Todo desde Cero', 'ejecutarReevaluacionCompleta')
    .addItem('📋 Generar Lista Final', 'ejecutarGenerarListaFinal')
    .addItem('👤 Promover Candidato Activo', 'promoverCandidatoActivo')
    .addItem('👤 Promover desde Lista de Espera', 'promoverDesdeListaEspera')
    .addItem('🔄 Regenerar Lista de Espera', 'ejecutarRegeneracionDeListas')
    .addItem('⚠️ Restaurar Hoja Seleccionados Perdida', 'restaurarHojaSeleccionadosPerdida')
    .addItem('🔁 Reenviar enlace a un postulante', 'reenviarEnlacePostulante')
    .addSeparator()
    .addItem('⚙️ Configurar Pesos', 'abrirSidebarConfig')
    .addItem('👁️ Revisar Postulaciones', 'abrirSidebarRevision')
    .addSeparator()
    .addSubMenu(ui.createMenu('📧 Enviar Correos')
      .addItem('✅ Seleccionados', 'enviarCorreosSeleccionados')
      .addItem('🧪 Test de Nivel', 'enviarCorreosTestNivel')
      .addItem('💎 Hand Picked (Extratemporáneos)', 'enviarCorreosHandPicked')
      .addItem('⏳ Lista de Espera', 'enviarCorreosEspera')
      .addItem('⏳ Cierre Lista de Espera (Sin Cupo)', 'enviarCorreosEsperaRechazada')
      .addItem('❌ No Seleccionados', 'enviarCorreosNoSeleccionados')
      .addItem('🔄 Continuación (Año Anterior)', 'enviarCorreosContinuacion')
      .addSeparator()
      .addItem('👁️ Vista Previa Siguiente (Lista de Espera)', 'mostrarVistaPreviaProximo')
      .addItem('✉️ Enviar Correo de Prueba', 'abrirDialogoCorreoPrueba')
      .addSeparator()
      .addItem('❌ Rechazo por Nivel Insuficiente', 'ejecutarEnvioRechazoPorNivel')
      .addItem('🏫 Inicio de Clases', 'abrirDialogoInicioClases'))
    .addSeparator()
    .addSubMenu(ui.createMenu('🧪 Prueba de Nivel (CEPT)')
      .addItem('🔄 Sincronizar Candidatos a Test', 'ejecutarSincronizarPlacement')
      .addSeparator()
      .addItem('📧 Enviar Credenciales Iniciales', 'ejecutarPlacementInicial')
      .addItem('🔔 Enviar Recordatorios', 'ejecutarPlacementRecordatorio')
      .addItem('✉️ Enviar Nuevos Códigos', 'ejecutarPlacementNuevoCodigo'))
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
function confirmarYEnviarCorreos_(tipo: TipoCorreo): void {
  const ui = SpreadsheetApp.getUi();
  const vistaPrevia = previewEmailBatch(tipo);
  
  const respuesta = ui.alert('Confirmar Envío de Correos', 
    vistaPrevia + '\n\n¿Cómo deseas proceder con el envío?\n\n' +
    '- Presiona SÍ para enviar los correos REALMENTE a los candidatos.\n' +
    '- Presiona NO para crear estos correos como BORRADORES en tu Gmail.\n' +
    '- Presiona CANCELAR para abortar la operación.', 
    ui.ButtonSet.YES_NO_CANCEL);
    
  if (respuesta === ui.Button.YES) {
    const resultado = sendEmailBatch(tipo, false);
    ui.alert('Resultado', resultado, ui.ButtonSet.OK);
  } else if (respuesta === ui.Button.NO) {
    const muestraRespuesta = ui.alert('Límite de Borradores',
      '¿Deseas crear borradores para TODOS los destinatarios pendientes o solo para una MUESTRA de prueba (máximo 5)?\n\n' +
      '- Presiona SÍ para crear un máximo de 5 borradores (Recomendado para revisar).\n' +
      '- Presiona NO para crear borradores para todos.\n' +
      '- Presiona CANCELAR para abortar.',
      ui.ButtonSet.YES_NO_CANCEL);
      
    if (muestraRespuesta === ui.Button.CANCEL) return;
    
    const limit = muestraRespuesta === ui.Button.YES ? 5 : 0;
    const resultado = sendEmailBatch(tipo, true, limit);
    ui.alert('Resultado de Borradores', resultado, ui.ButtonSet.OK);
  } else {
    ui.alert('Cancelado', 'La operación ha sido cancelada.', ui.ButtonSet.OK);
  }
}

function enviarCorreosSeleccionados() { confirmarYEnviarCorreos_('SELECTED'); }
function enviarCorreosTestNivel() { confirmarYEnviarCorreos_('TEST_LEVEL_ONLY'); }
function enviarCorreosHandPicked() { confirmarYEnviarCorreos_('HAND_PICKED'); }
function enviarCorreosEspera() { confirmarYEnviarCorreos_('WAITLIST'); }
function enviarCorreosEsperaRechazada() { confirmarYEnviarCorreos_('WAITLIST_REJECTED'); }
function enviarCorreosNoSeleccionados() { confirmarYEnviarCorreos_('NO_SELECTED'); }
function enviarCorreosContinuacion() { confirmarYEnviarCorreos_('CONTINUATION'); }

function ejecutarAnalisisDesdeMenu() {
  const report = getAnalysisReport_();
  SpreadsheetApp.getUi().alert("Análisis de Equilibrio", report, SpreadsheetApp.getUi().ButtonSet.OK);
}

function abrirDashboard(): void {
  const html = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Panel de Control de Evaluación PUCV')
    .setWidth(1200)
    .setHeight(850);
  SpreadsheetApp.getUi().showModelessDialog(html, 'Panel de Control de Evaluación PUCV');
}

/**
 * Confirms and executes rejection emails for applicants with insufficient level (Fix #11).
 */
function ejecutarEnvioRechazoPorNivel(): void {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.alert(
    'Confirmar Envío de Rechazos por Nivel',
    '¿Deseas enviar los correos de rechazo a postulantes con nivel insuficiente?',
    ui.ButtonSet.YES_NO
  );
  if (respuesta === ui.Button.YES) {
    const res = enviarCorreosRechazoPorNivel_();
    ui.alert('Resultado Rechazo por Nivel', res, ui.ButtonSet.OK);
  }
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
 * Shows a preview of the next candidate in the waitlist (Fix #12).
 */
function mostrarVistaPreviaProximo(): void {
  const ui = SpreadsheetApp.getUi();
  const preview = previewEmailBatch('WAITLIST');
  ui.alert('Próximos Notificables (Lista de Espera)', preview, ui.ButtonSet.OK);
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

// ---------------------------------------------------------------------------
// Placement Test (CEPT) wrappers
// ---------------------------------------------------------------------------

/**
 * Syncs paid+accepted+test-level candidates from "Seleccionados" to "Prueba de Nivel".
 */
function ejecutarSincronizarPlacement(): void {
  sincronizarPlacement_();
}

/**
 * Opens the placement config dialog for sending initial credentials.
 */
function ejecutarPlacementInicial(): void {
  abrirDialogoPlacementInicial_();
}

/**
 * Opens the placement config dialog for sending reminders.
 */
function ejecutarPlacementRecordatorio(): void {
  abrirDialogoPlacementRecordatorio_();
}

/**
 * Opens the placement config dialog for sending new credentials.
 */
function ejecutarPlacementNuevoCodigo(): void {
  abrirDialogoPlacementNuevoCodigo_();
}
