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
    if (type === 'SELECTED' || type === 'TEST_LEVEL_ONLY' || type === 'HAND_PICKED') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.SELECTED} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        const idxCorreo = headers.indexOf("Correo Electrónico");
        const idxNombre = headers.indexOf("Nombre(s)");
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
            if (type === 'HAND_PICKED')
                return p.verificacion === 'Hand picked' || p.verificacion === 'Manual';
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
    // QUAL-01 verified: MailApp.getRemainingDailyQuota() is the only GAS quota API. GmailApp has no quota method.
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < recipients.length) {
        return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y quieres enviar ${recipients.length}.`;
    }
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    const headersS = hojaS?.getDataRange().getValues()[0];
    const idxNotificado = headersS?.indexOf(CONFIG.COLUMNS.NOTIFICATION_DATE);
    let count = 0;
    let ultimosErrores = [];
    recipients.forEach(r => {
        try {
            let templateName = 'CorreoSeleccionado';
            let subject = "Resultado de Postulación Programas de Inglés PUCV";
            if (type === 'TEST_LEVEL_ONLY') {
                templateName = 'CorreoTestNivel';
                subject = "Test de Nivel - Programas de Inglés PUCV";
            }
            else if (type === 'WAITLIST') {
                templateName = 'CorreoListaEspera';
            }
            else if (type === 'NO_SELECTED') {
                templateName = 'CorreoNoSeleccionado';
            }
            else if (type === 'HAND_PICKED') {
                templateName = 'CorreoHandPicked';
                subject = "Cupo Disponible - Programas de Inglés PUCV";
            }
            const htmlBody = HtmlService.createTemplateFromFile(templateName);
            htmlBody.nombre = r.nombre;
            htmlBody.nivel = r.nivel;
            htmlBody.programData = PROGRAM_DATA;
            htmlBody.fechaLimite = calcularFechaLimite(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
            if (templateName === 'CorreoSeleccionado' || templateName === 'CorreoHandPicked') {
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
            ultimosErrores.push(`[${r.email}]: ${e.message}`);
        }
    });
    if (ultimosErrores.length > 0) {
        return `Se enviaron ${count} correos.\n\nSin embargo, hubo ${ultimosErrores.length} errores. Algunos de ellos son:\n${ultimosErrores.slice(0, 3).join('\n')}`;
    }
    return `Se enviaron ${count} correos exitosamente para el lote '${type}'.`;
}
/**
 * Sends a single test email.
 */
function sendTestEmail(targetEmail, type) {
    try {
        let templateName = 'CorreoSeleccionado';
        let subject = "[TEST] Resultado Postulación PUCV";
        if (type === 'TEST_LEVEL_ONLY') {
            templateName = 'CorreoTestNivel';
            subject = "[TEST] Test de Nivel - PUCV";
        }
        else if (type === 'WAITLIST') {
            templateName = 'CorreoListaEspera';
            subject = "[TEST] Lista de Espera - PUCV";
        }
        else if (type === 'NO_SELECTED' || type === 'NOT_SELECTED') {
            templateName = 'CorreoNoSeleccionado';
            subject = "[TEST] Resultado de Postulación - PUCV";
        }
        else if (type === 'HAND_PICKED') {
            templateName = 'CorreoHandPicked';
            subject = "[TEST] Cupo Disponible - PUCV";
        }
        else if (type === 'CONFIRM_ACCEPT') {
            templateName = 'CorreoConfirmacionAcepta';
            subject = "[TEST] Confirmación de Aceptación - PUCV";
        }
        else if (type === 'CONFIRM_REJECT') {
            templateName = 'CorreoConfirmacionRechaza';
            subject = "[TEST] Confirmación de Liberación de Cupo - PUCV";
        }
        else if (type && type.startsWith('Correo')) {
            templateName = type;
        }
        const htmlBody = HtmlService.createTemplateFromFile(templateName);
        htmlBody.nombre = "Usuario de Prueba";
        htmlBody.nivel = "B2.1";
        htmlBody.programData = PROGRAM_DATA;
        htmlBody.fechaLimite = calcularFechaLimite(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
        htmlBody.fechaPagoLimite = calcularFechaLimite(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
        htmlBody.paymentUrl = PROGRAM_DATA.PAYMENT_URL || "https://www.mercadopago.cl/link-pago-matricula";
        htmlBody.urlAceptar = obtenerUrlConfirmacion(targetEmail, 'accept');
        htmlBody.urlRechazar = obtenerUrlConfirmacion(targetEmail, 'reject');
        const finishedHtml = htmlBody.evaluate().getContent();
        GmailApp.sendEmail(targetEmail, subject, "", {
            htmlBody: finishedHtml
        });
        return `Correo de prueba (${templateName}) enviado a ${targetEmail}`;
    }
    catch (e) {
        return `Error en test: ${e.message}`;
    }
}
/**
 * Calculates a future limit date.
 */
function calcularFechaLimite(fechaInicio, dias) {
    const fechaLimite = new Date(fechaInicio.getTime() + dias * 24 * 60 * 60 * 1000);
    const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = fechaLimite.toLocaleDateString('es-ES', opciones);
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Sends a confirmation email to the applicant after they accept/reject their spot.
 */
function enviarCorreoConfirmacion(correo, tipoConfirmacion) {
    const ss = getSpreadsheet();
    const hojaS = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
    if (!hojaS)
        return;
    const dataS = hojaS.getDataRange().getValues();
    const headersS = dataS[0];
    const idxCorreo = headersS.indexOf("Correo Electrónico");
    const idxNombre = headersS.indexOf("Nombre(s)");
    const idxNivel = headersS.indexOf("Nivel Asignado");
    let candidateRow = null;
    for (let i = 1; i < dataS.length; i++) {
        if (String(dataS[i][idxCorreo]).trim().toLowerCase() === correo.trim().toLowerCase()) {
            candidateRow = dataS[i];
            break;
        }
    }
    if (!candidateRow) {
        logToWebApp(`No se encontró candidato para enviar confirmación a ${correo}`);
        return;
    }
    const nombre = candidateRow[idxNombre];
    const nivel = candidateRow[idxNivel] || "B1+";
    const templateName = tipoConfirmacion === 'accept' ? 'CorreoConfirmacionAcepta' : 'CorreoConfirmacionRechaza';
    const subject = tipoConfirmacion === 'accept' ?
        "Confirmación de Aceptación y Pago - PUCV2English" :
        "Confirmación de Liberación de Cupo - PUCV2English";
    try {
        const htmlBody = HtmlService.createTemplateFromFile(templateName);
        htmlBody.nombre = nombre;
        htmlBody.nivel = nivel;
        htmlBody.programData = PROGRAM_DATA;
        if (tipoConfirmacion === 'accept') {
            htmlBody.paymentUrl = PROGRAM_DATA.PAYMENT_URL || "https://www.mercadopago.cl/link-pago-matricula";
            htmlBody.fechaPagoLimite = calcularFechaLimite(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
        }
        const finishedHtml = htmlBody.evaluate().getContent();
        GmailApp.sendEmail(correo, subject, "", {
            htmlBody: finishedHtml
        });
        logToWebApp(`Correo de confirmación (${tipoConfirmacion}) enviado a ${correo}`);
    }
    catch (e) {
        logToWebApp(`Error enviando correo de confirmación a ${correo}: ${e.message}`);
    }
}
