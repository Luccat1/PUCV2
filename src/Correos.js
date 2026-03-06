"use strict";
/**
 * @file Correos.ts
 * Logic for sending batch and test emails using HTML templates.
 */
/**
 * Orchestrator called from Web App for batch sending.
 */
function ejecutarEnvioCorreosDesdeWebApp() {
    // Logic from original: defaults to 'SELECTED' batch
    return sendEmailBatch('SELECTED');
}
/**
 * Retrieves recipients data based on type (SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED).
 */
/**
 * Retrieves recipients data based on type (SELECTED, TEST_LEVEL_ONLY, WAITLIST, NO_SELECTED).
 * Implements Plan 3.2.
 */
function getRecipients(type) {
    const ss = getSpreadsheet();
    if (type === 'SELECTED' || type === 'TEST_LEVEL_ONLY') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.SELECTED} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        const idxCorreo = headers.indexOf(CONFIG.COLUMNS.EMAIL);
        const idxNombre = headers.indexOf(CONFIG.COLUMNS.FIRST_NAME);
        const idxNivel = headers.indexOf("Nivel Asignado");
        const idxVerificacion = headers.indexOf("Verificación Certificado");
        const idxNotificado = headers.indexOf(CONFIG.COLUMNS.NOTIFICATION_DATE);
        return datos.map((row, i) => ({
            index: i + 2, // 1-indexed + header row
            nombre: row[idxNombre],
            email: row[idxCorreo],
            nivel: row[idxNivel],
            verificacion: row[idxVerificacion],
            notificado: row[idxNotificado]
        })).filter(p => {
            // Idempotency: skip if already notified
            if (p.notificado && p.notificado !== "")
                return false;
            if (type === 'TEST_LEVEL_ONLY')
                return p.verificacion === 'Test de nivel';
            return p.email && p.nombre && p.nivel && p.verificacion === 'Válido';
        });
    }
    if (type === 'WAITLIST' || type === 'NO_SELECTED') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.OUTPUT); // Assuming they stay here for now
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.OUTPUT} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        // In AUTO_EVAL, they are marked in the Status column (to be defined/confirmed)
        // For now, let's assume getRecipients logic for these types is based on a specific criteria
        // or that we have a dedicated sheet for them if refactored.
        // Based on original logic, they might still be in the main list but filtered.
        // Let's implement basic filtering if they are not picked for SELECTED.
        // (This part might need adjustment based on how the list is generated)
        return []; // Placeholder for now as per plan 3.2
    }
    return [];
}
/**
 * Returns a preview string for the batch.
 */
function previewEmailBatch(type) {
    const recipients = getRecipients(type);
    if (recipients.length === 0)
        return "No hay destinatarios que cumplan los requisitos para el envío de '" + type + "'.";
    return `Se enviarán ${recipients.length} correos de tipo '${type}'. Destinatarios: ${recipients.map(r => r.email).join(', ')}`;
}
/**
 * Sends a batch of emails using the appropriate template.
 * Updates "Fecha Notificación" on success.
 * @param type The category of recipients to notify.
 * @returns {string} Status message for the UI.
 */
function sendEmailBatch(type) {
    const recipients = getRecipients(type);
    if (recipients.length === 0)
        return "No hay destinatarios pendientes para enviar '" + type + "'.";
    // Gmail Quota Check
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < recipients.length) {
        return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y quieres enviar ${recipients.length}.`;
    }
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const headersS = hojaS?.getDataRange().getValues()[0];
    const idxNotificado = headersS?.indexOf(CONFIG.COLUMNS.NOTIFICATION_DATE);
    let count = 0;
    recipients.forEach(r => {
        try {
            let templateName = 'CorreoSeleccionado';
            let subject = "Resultado de Postulación Programas de Inglés PUCV";
            if (type === 'TEST_LEVEL_ONLY') {
                templateName = 'CorreoTestNivel';
            }
            else if (type === 'WAITLIST') {
                templateName = 'CorreoListaEspera';
            }
            else if (type === 'NO_SELECTED') {
                templateName = 'CorreoNoSeleccionado';
            }
            const htmlBody = HtmlService.createTemplateFromFile(templateName);
            htmlBody.nombre = r.nombre;
            htmlBody.nivel = r.nivel;
            htmlBody.programData = PROGRAM_DATA;
            htmlBody.fechaLimite = PROGRAM_DATA.FECHA_LIMITE;
            if (templateName === 'CorreoSeleccionado') {
                htmlBody.urlAceptar = obtenerUrlConfirmacion(r.email, 'accept');
                htmlBody.urlRechazar = obtenerUrlConfirmacion(r.email, 'reject');
            }
            const finishedHtml = htmlBody.evaluate().getContent();
            GmailApp.sendEmail(r.email, subject, "", {
                htmlBody: finishedHtml
            });
            // Update notification date for idempotency
            if (hojaS && idxNotificado !== undefined && idxNotificado !== -1) {
                hojaS.getRange(r.index, idxNotificado + 1).setValue(new Date());
            }
            count++;
        }
        catch (e) {
            logToWebApp(`Error enviando a ${r.email}: ${e.message}`);
        }
    });
    return `Se enviaron ${count} correos exitosamente para el lote '${type}'.`;
}
/**
 * Sends a single test email.
 */
function sendTestEmail(targetEmail, type) {
    try {
        const templateName = type || 'CorreoSeleccionado';
        const htmlBody = HtmlService.createTemplateFromFile(templateName);
        htmlBody.nombre = "Usuario de Prueba";
        htmlBody.nivel = "B2.1";
        htmlBody.programData = PROGRAM_DATA;
        const finishedHtml = htmlBody.evaluate().getContent();
        GmailApp.sendEmail(targetEmail, "[TEST] Resultado Postulación PUCV", "", {
            htmlBody: finishedHtml
        });
        return `Correo de prueba (${templateName}) enviado a ${targetEmail}`;
    }
    catch (e) {
        return `Error en test: ${e.message}`;
    }
}
