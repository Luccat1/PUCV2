/**
 * @file Correos.ts
 * Logic for sending batch and test emails using HTML templates.
 */

/**
 * Orchestrator called from Web App for batch sending.
 */
function ejecutarEnvioCorreosDesdeWebApp(): string {
  // Logic from original: defaults to 'SELECTED' batch
  return sendEmailBatch('SELECTED');
}

/**
 * Retrieves recipients data based on type (SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED).
 */
function getRecipients(type: string): any[] {
  const ss = getSpreadsheet();
  
  if (type === 'SELECTED' || type === 'TEST_LEVEL_ONLY') {
    const hoja = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hoja) throw new Error(`Hoja ${CONFIG.SHEETS.SELECTED} no encontrada.`);
    const datos = hoja.getDataRange().getValues();
    const headers = datos.shift()!;
    
    const idxCorreo = headers.indexOf("Correo Electrónico");
    const idxNombre = headers.indexOf("Nombre(s)");
    const idxNivel = headers.indexOf("Nivel Asignado");
    const idxVerificacion = headers.indexOf("Verificación Certificado");

    return datos.map(row => ({
      nombre: row[idxNombre],
      email: row[idxCorreo],
      nivel: row[idxNivel],
      verificacion: row[idxVerificacion]
    })).filter(p => {
      if (type === 'TEST_LEVEL_ONLY') return p.verificacion === 'Test de nivel';
      return p.email && p.nombre && p.nivel && p.verificacion === 'Válido';
    });
  }
  
  // WAITLIST and NO_SELECTED logic would go here
  return [];
}

/**
 * Returns a preview string for the batch.
 */
function previewEmailBatch(type: string): string {
  const recipients = getRecipients(type);
  if (recipients.length === 0) return "No hay destinatarios que cumplan los requisitos para el envío de '" + type + "'.";
  return `Se enviarán ${recipients.length} correos de tipo '${type}'. Destinatarios: ${recipients.map(r => r.email).join(', ')}`;
}

/**
 * Sends a batch of emails using the appropriate template.
 */
function sendEmailBatch(type: string): string {
  const recipients = getRecipients(type);
  if (recipients.length === 0) return "No hay destinatarios para enviar.";

  let count = 0;
  recipients.forEach(r => {
    try {
      let templateName = 'CorreoSeleccionado';
      if (type === 'TEST_LEVEL_ONLY') templateName = 'CorreoTestNivel';
      // ... more logic for waitlist/no-selected
      
      const htmlBody = HtmlService.createTemplateFromFile(templateName);
      (htmlBody as any).nombre = r.nombre;
      (htmlBody as any).nivel = r.nivel;
      (htmlBody as any).programData = PROGRAM_DATA;
      
      const finishedHtml = htmlBody.evaluate().getContent();
      
      GmailApp.sendEmail(r.email, "Resultado de Postulación Programas de Inglés PUCV", "", {
        htmlBody: finishedHtml
      });
      count++;
    } catch (e: any) {
      logToWebApp(`Error enviando a ${r.email}: ${e.message}`);
    }
  });

  return `Se enviaron ${count} correos exitosamente.`;
}

/**
 * Sends a single test email.
 */
function sendTestEmail(targetEmail: string, type: string): string {
  try {
    const templateName = type || 'CorreoSeleccionado';
    const htmlBody = HtmlService.createTemplateFromFile(templateName);
    (htmlBody as any).nombre = "Usuario de Prueba";
    (htmlBody as any).nivel = "B2.1";
    (htmlBody as any).programData = PROGRAM_DATA;
    
    const finishedHtml = htmlBody.evaluate().getContent();
    
    GmailApp.sendEmail(targetEmail, "[TEST] Resultado Postulación PUCV", "", {
      htmlBody: finishedHtml
    });
    return `Correo de prueba (${templateName}) enviado a ${targetEmail}`;
  } catch (e: any) {
    return `Error en test: ${e.message}`;
  }
}
