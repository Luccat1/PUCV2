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
    if (type === 'WAITLIST') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.WAITLIST} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        const idxCorreo = headers.indexOf("Correo Electrónico");
        const idxNombre = headers.indexOf("Nombre(s)");
        const idxNivel = headers.indexOf("Nivel Postulado");
        const idxNotificado = headers.indexOf("Fecha Notificación");
        if (idxCorreo === -1 || idxNombre === -1 || idxNivel === -1 || idxNotificado === -1) {
            throw new Error(`Faltan columnas necesarias en la hoja de Lista de Espera.`);
        }
        return datos.map((row, i) => ({
            index: i + 2, // 1-indexed + header row
            nombre: row[idxNombre],
            email: row[idxCorreo],
            nivel: row[idxNivel],
            notificado: row[idxNotificado]
        })).filter(p => {
            // Idempotency: skip if already notified
            return p.email && p.nombre && p.nivel && (!p.notificado || p.notificado === "");
        });
    }
    if (type === 'WAITLIST_REJECTED') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.WAITLIST} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        const idxCorreo = headers.indexOf("Correo Electrónico");
        const idxNombre = headers.indexOf("Nombre(s)");
        const idxNivel = headers.indexOf("Nivel Postulado");
        const idxNotificadoCierre = headers.indexOf("Fecha Notificación Cierre");
        if (idxCorreo === -1 || idxNombre === -1 || idxNivel === -1 || idxNotificadoCierre === -1) {
            throw new Error(`Faltan columnas necesarias en la hoja de Lista de Espera.`);
        }
        return datos.map((row, i) => ({
            index: i + 2, // 1-indexed + header row
            nombre: row[idxNombre],
            email: row[idxCorreo],
            nivel: row[idxNivel],
            notificadoCierre: row[idxNotificadoCierre]
        })).filter(p => {
            // Idempotency: skip if already notified of closure rejection
            return p.email && p.nombre && p.nivel && (!p.notificadoCierre || p.notificadoCierre === "");
        });
    }
    if (type === 'NO_SELECTED') {
        const hojaOutput = ss.getSheetByName(CONFIG.SHEETS.OUTPUT);
        const hojaSelected = ss.getSheetByName(CONFIG.SHEETS.SELECTED);
        const hojaWaitlist = ss.getSheetByName(CONFIG.SHEETS.WAITLIST);
        if (!hojaOutput || !hojaSelected || !hojaWaitlist) {
            throw new Error("Faltan hojas de evaluación, seleccionados o lista de espera.");
        }
        const valuesOutput = hojaOutput.getDataRange().getValues();
        const headersOutput = valuesOutput.shift();
        const idxCorreoOut = headersOutput.indexOf("Correo Electrónico");
        const idxNombreOut = headersOutput.indexOf("Nombre(s)");
        const idxNivelOut = headersOutput.indexOf("Nivel Postulado");
        if (idxCorreoOut === -1 || idxNombreOut === -1 || idxNivelOut === -1) {
            throw new Error(`Faltan columnas esenciales en la hoja de evaluación.`);
        }
        const valS = hojaSelected.getDataRange().getValues();
        const headS = valS.shift() || [];
        const idxS = headS.indexOf("Correo Electrónico");
        const emailsSelected = new Set(valS.map(row => String(row[idxS]).trim().toLowerCase()));
        const valW = hojaWaitlist.getDataRange().getValues();
        const headW = valW.shift() || [];
        const idxW = headW.indexOf("Correo Electrónico");
        const emailsWaitlist = new Set(valW.map(row => String(row[idxW]).trim().toLowerCase()));
        return valuesOutput
            .filter(row => {
            const email = String(row[idxCorreoOut]).trim().toLowerCase();
            return email && !emailsSelected.has(email) && !emailsWaitlist.has(email);
        })
            .map((row, i) => ({
            index: i + 2,
            nombre: row[idxNombreOut],
            email: row[idxCorreoOut],
            nivel: row[idxNivelOut],
            notificado: false
        }));
    }
    if (type === 'CONTINUATION') {
        const hoja = ss.getSheetByName(CONFIG.SHEETS.CONTINUATION);
        if (!hoja)
            throw new Error(`Hoja ${CONFIG.SHEETS.CONTINUATION} no encontrada.`);
        const datos = hoja.getDataRange().getValues();
        const headers = datos.shift();
        if (!headers)
            return [];
        const idxName = headers.indexOf("Name");
        const idxSurname = headers.indexOf("Surname");
        const idxCurso = headers.indexOf("Curso");
        const idxAsistencia = headers.indexOf("Asistencia");
        const idxPromedio = headers.indexOf("Promedio Final");
        let idxEmail = headers.indexOf("Email");
        if (idxEmail === -1)
            idxEmail = headers.indexOf("Correo Electrónico");
        const idxNotificado = headers.indexOf(CONFIG.COLUMNS.NOTIFICATION_DATE);
        if (idxName === -1 || idxSurname === -1 || idxCurso === -1 || idxAsistencia === -1 || idxPromedio === -1) {
            throw new Error(`Faltan columnas necesarias en la hoja de Continuación (Name, Surname, Curso, Asistencia, Promedio Final).`);
        }
        return datos.map((row, i) => {
            const cursoRaw = String(row[idxCurso]).trim();
            const cursoMatch = cursoRaw.match(/^(B1\+|B2\.1|B2\.2|C1)/i);
            const cursoNivel = cursoMatch ? cursoMatch[1] : cursoRaw.split(' ')[0];
            const asistenciaRaw = String(row[idxAsistencia]).replace(',', '.');
            const asistencia = parseFloat(asistenciaRaw) || 0;
            const promedioRaw = String(row[idxPromedio]).replace(',', '.');
            const promedio = parseFloat(promedioRaw) || 0;
            const nivelSiguiente = CONTINUATION_MAP[cursoNivel] || null;
            return {
                index: i + 2,
                nombre: `${row[idxName]} ${row[idxSurname]}`.trim(),
                email: idxEmail !== -1 ? String(row[idxEmail]).trim() : '',
                cursoAnterior: cursoNivel,
                nivelSiguiente: nivelSiguiente,
                asistencia: asistencia,
                promedio: promedio,
                notificado: idxNotificado !== -1 ? row[idxNotificado] : ''
            };
        }).filter(p => {
            if (p.notificado && p.notificado !== '')
                return false;
            if (!p.email)
                return false;
            if (!p.nivelSiguiente)
                return false;
            if (p.asistencia < CONTINUATION_MIN_ATTENDANCE)
                return false;
            if (p.promedio < CONTINUATION_MIN_GRADE)
                return false;
            return true;
        });
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
function sendEmailBatch(type, asDraft = false, limit = 0) {
    cargarConfiguracionDesdeHoja();
    let recipients = getRecipients(type);
    if (recipients.length === 0)
        return "No hay destinatarios pendientes para enviar '" + type + "'.";
    if (limit > 0) {
        recipients = recipients.slice(0, limit);
    }
    // Gmail Quota Check
    // QUAL-01 verified: MailApp.getRemainingDailyQuota() is the only GAS quota API. GmailApp has no quota method.
    const quota = MailApp.getRemainingDailyQuota();
    if (quota < recipients.length) {
        return `ERROR: Cuota de Gmail insuficiente. Te quedan ${quota} envíos y quieres enviar ${recipients.length}.`;
    }
    const ss = getSpreadsheet();
    const isWaitlist = (type === 'WAITLIST' || type === 'WAITLIST_REJECTED');
    const sheetName = isWaitlist ? CONFIG.SHEETS.WAITLIST : CONFIG.SHEETS.SELECTED;
    const hojaS = ss.getSheetByName(sheetName);
    const headersS = hojaS?.getDataRange().getValues()[0];
    const colName = type === 'WAITLIST_REJECTED' ? "Fecha Notificación Cierre" : CONFIG.COLUMNS.NOTIFICATION_DATE;
    const idxNotificado = headersS?.indexOf(colName);
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
            else if (type === 'WAITLIST_REJECTED') {
                templateName = 'CorreoEsperaSinCupo';
                subject = "Cierre de Proceso - Lista de Espera PUCV2English";
            }
            else if (type === 'NO_SELECTED') {
                templateName = 'CorreoNoSeleccionado';
            }
            else if (type === 'HAND_PICKED') {
                templateName = 'CorreoHandPicked';
                subject = "Cupo Disponible - Programas de Inglés PUCV";
            }
            else if (type === 'CONTINUATION') {
                templateName = 'CorreoContinuacion';
                subject = "Acceso Preferencial de Continuación - PUCV2English";
            }
            const htmlBody = HtmlService.createTemplateFromFile(templateName);
            htmlBody.nombre = r.nombre;
            htmlBody.nivel = r.nivel;
            htmlBody.programData = PROGRAM_DATA;
            htmlBody.fechaLimite = calcularFechaLimite(new Date(), PROGRAM_DATA.DEADLINE_DAYS || 3);
            if (templateName === 'CorreoSeleccionado' || templateName === 'CorreoHandPicked' || templateName === 'CorreoTestNivel') {
                const token = generarToken(r.email);
                htmlBody.urlAceptar = obtenerUrlConfirmacionConToken(token, 'accept');
                htmlBody.urlRechazar = obtenerUrlConfirmacionConToken(token, 'reject');
            }
            else if (templateName === 'CorreoContinuacion') {
                htmlBody.cursoAnterior = r.cursoAnterior;
                htmlBody.nivelSiguiente = r.nivelSiguiente;
                const token = generarToken(r.email);
                htmlBody.urlAceptar = obtenerUrlConfirmacionConToken(token, 'accept');
                htmlBody.urlRechazar = obtenerUrlConfirmacionConToken(token, 'reject');
            }
            const finishedHtml = htmlBody.evaluate().getContent();
            if (asDraft) {
                GmailApp.createDraft(r.email, subject, "", {
                    htmlBody: finishedHtml
                });
            }
            else {
                GmailApp.sendEmail(r.email, subject, "", {
                    htmlBody: finishedHtml
                });
                // Update notification date for idempotency only when sending real emails
                if (type === 'CONTINUATION') {
                    const hojaCont = ss.getSheetByName(CONFIG.SHEETS.CONTINUATION);
                    if (hojaCont) {
                        const headersCont = hojaCont.getDataRange().getValues()[0];
                        const idxNotifCont = headersCont.indexOf(CONFIG.COLUMNS.NOTIFICATION_DATE);
                        if (idxNotifCont !== -1) {
                            hojaCont.getRange(r.index, idxNotifCont + 1).setValue(new Date());
                        }
                    }
                }
                else if (type !== 'NO_SELECTED' && hojaS && idxNotificado !== undefined && idxNotificado !== -1) {
                    hojaS.getRange(r.index, idxNotificado + 1).setValue(new Date());
                }
            }
            count++;
        }
        catch (e) {
            logToWebApp(`Error enviando a ${r.email}: ${e.message}`);
            ultimosErrores.push(`[${r.email}]: ${e.message}`);
        }
    });
    const verb = asDraft ? "crearon" : "enviaron";
    const noun = asDraft ? "borradores" : "correos";
    if (ultimosErrores.length > 0) {
        return `Se ${verb} ${count} ${noun}.\n\nSin embargo, hubo ${ultimosErrores.length} errores. Algunos de ellos son:\n${ultimosErrores.slice(0, 3).join('\n')}`;
    }
    return `Se ${verb} ${count} ${noun} exitosamente para el lote '${type}'.`;
}
/**
 * Sends a single test email.
 */
function sendTestEmail(targetEmail, type) {
    try {
        cargarConfiguracionDesdeHoja();
        if (type === 'CADENA_COMPLETA') {
            const types = [
                'SELECTED',
                'TEST_LEVEL_ONLY',
                'HAND_PICKED',
                'WAITLIST',
                'NOT_SELECTED',
                'CONFIRM_ACCEPT',
                'CONFIRM_REJECT',
                'CLASS_START',
                'CONTINUATION'
            ];
            types.forEach(t => {
                sendTestEmail(targetEmail, t);
            });
            return `Cadena completa de ${types.length} correos de prueba enviada a ${targetEmail}`;
        }
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
        else if (type === 'CLASS_START') {
            templateName = 'CorreoInicioClases';
            subject = "[TEST] Inicio de Clases - PUCV";
        }
        else if (type === 'CONTINUATION') {
            templateName = 'CorreoContinuacion';
            subject = "[TEST] Acceso Preferencial de Continuación - PUCV";
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
        const token = generarToken(targetEmail);
        htmlBody.urlAceptar = obtenerUrlConfirmacionConToken(token, 'accept');
        htmlBody.urlRechazar = obtenerUrlConfirmacionConToken(token, 'reject');
        htmlBody.cursoAnterior = "B1+";
        htmlBody.nivelSiguiente = "B2.1";
        // Add dummy variables for CorreoInicioClases template backed by program data config
        const levelHorario = PROGRAM_DATA.HORARIOS["B2.1"] || PROGRAM_DATA.HORARIOS["Default"];
        htmlBody.catedra = levelHorario ? levelHorario.catedra : "Lunes y Miércoles 14:30 - 16:00";
        htmlBody.ayudantia = levelHorario ? levelHorario.ayudantia : "Viernes 14:30 - 16:00";
        htmlBody.sala = "Sala 2-3 (Casa Central)";
        htmlBody.fechaInicio = PROGRAM_DATA.FECHA_INICIO || "Lunes, 30 de Marzo";
        htmlBody.fechaTermino = PROGRAM_DATA.FECHA_TERMINO || "Viernes, 10 de Julio";
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
    cargarConfiguracionDesdeHoja();
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
