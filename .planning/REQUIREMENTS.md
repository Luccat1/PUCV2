# Requirements: PUCV2English

**Defined:** 2026-03-19
**Core Value:** Automatizar el proceso de admisión end-to-end para que el equipo administrativo pueda gestionar cientos de postulaciones con mínima intervención manual — desde la evaluación hasta el inicio de clases.

## v1 Requirements

### Inicio de Clases (Correo a Estudiantes)

- [x] **INICIO-01**: Admin puede abrir un diálogo que solicita la sala de clases por cada nivel activo antes de enviar correos — verificado: `src/Menu.ts:183` (`abrirDialogoInicioClases()`) abre `DialogSalas.html`
- [x] **INICIO-02**: El diálogo muestra una confirmación del mapeo nivel → sala antes de proceder — verificado: `src/DialogSalas.html:67-77` (estado PREVIEW con botón Back)
- [x] **INICIO-03**: El sistema envía correos individuales de inicio de clases a todos los participantes confirmados en "Lista Final Curso" — verificado: `src/InicioClases.ts:169-231` (`enviarCorreosInicioClases()`)
- [x] **INICIO-04**: El correo incluye nombre del estudiante, nivel asignado, horario (cátedra y ayudantía), sala de clases, y fechas de inicio/término del programa — verificado: `src/CorreoInicioClases.html:40-56`
- [x] **INICIO-05**: La sala de clases ingresada se guarda en la columna correspondiente de "Lista Final Curso" — verificado: `src/Config.ts:162` (`COLUMNS.SALA`), `src/InicioClases.ts:213-214`
- [x] **INICIO-06**: El sistema marca a cada estudiante notificado (columna "Notificado Inicio") y omite estudiantes ya notificados en re-ejecuciones — verificado: `src/Config.ts:161` (`COLUMNS.INICIO_NOTIFICATION_DATE`), `src/InicioClases.ts:129,216-217`
- [x] **INICIO-07**: El envío está disponible desde el submenú "Enviar Correos" del menú PUCV2English — verificado: `src/Menu.ts:34`

### Informe Ejecutivo PDF

- [ ] **PDF-01**: Admin puede generar un informe ejecutivo PDF del estado final del curso desde el menú
- [ ] **PDF-02**: El informe agrupa estudiantes por nivel e incluye conteo de matriculados por nivel
- [ ] **PDF-03**: Cada estudiante aparece con: apellido, nombre, correo, nivel, horario, sala y estado de pago (Pagó Sí/No)
- [ ] **PDF-04**: El informe incluye un resumen ejecutivo con totales generales (total matriculados, desglose por nivel)
- [ ] **PDF-05**: El PDF se exporta directamente (descarga o adjunto en correo al admin) sin guardarse permanentemente en Drive

### Calidad y Correcciones

- [x] **QUAL-01**: La verificación de cuota de correo usa `GmailApp.getRemainingDailyQuota()` en lugar de `MailApp.getRemainingDailyQuota()` en todo el codebase — **cerrado sin cambio de código**: `GmailApp.getRemainingDailyQuota()` no existe en la API de GAS; `MailApp.getRemainingDailyQuota()` (ya presente en `Correos.ts` línea 178) es la única API de cuota válida. Verificado en Phase 1 (`01-VERIFICATION.md`), comentario de verificación agregado en el código.

## v2 Requirements

### Notificaciones

- **NOTIF-01**: Vista previa del correo de inicio de clases antes de enviar (reutilizar patrón `previewEmailBatch`)
- **NOTIF-02**: Envío de correo de prueba de inicio de clases a destinatario específico

### Informe Avanzado

- **INF-01**: Guardar informe PDF en carpeta compartida de Drive del equipo
- **INF-02**: Historial de informes generados (fecha, número de matriculados)

### Asignación por Test de Nivel

- [x] **NIVEL-01**: Al generar Lista Final Curso, para estudiantes con `Verificación Certificado === "Test de nivel"`, el sistema busca su resultado en la hoja "Prueba de Nivel" (match por correo) y les asigna automáticamente el nivel obtenido — actualiza la lista final y la columna "Nivel Asignado" en "Seleccionados"
- [ ] **NIVEL-02**: Si el nivel obtenido está en el rango ofrecido (B1+, B2.1, B2.2, C1), el estudiante aparece bajo ese nivel en la lista final (reemplaza el grupo "PRUEBA DE NIVEL")
- [x] **NIVEL-03**: Si el nivel obtenido está por debajo del mínimo requerido (A1, A2, B1.1 — todos bajo B1.2 para el nivel inicial B1+), el estudiante es excluido de la lista final y marcado como "Nivel insuficiente" en la hoja "Prueba de Nivel"
- [ ] **NIVEL-04**: Si el resultado aún no ha sido ingresado (columna "Nivel" vacía en "Prueba de Nivel"), el estudiante permanece en el grupo "PRUEBA DE NIVEL" con una advertencia al admin al momento de generar la lista
- [ ] **NIVEL-05**: `CorreoInicioClases.html` incluye, para estudiantes cuyo nivel proviene del test de nivel, una frase indicando que el nivel fue determinado según los resultados del Test de Nivel (en lugar de "según la documentación aportada")
- [x] **NIVEL-06**: Nueva opción de menú **"Enviar Correo a Candidatos con Nivel Insuficiente"** que envía un correo (nuevo template `CorreoRechazoPorNivel.html`) a los estudiantes marcados como "Nivel insuficiente" en "Prueba de Nivel". El correo: explica que su nivel está bajo el mínimo requerido, informa sobre la posibilidad de obtener constancia del nivel alcanzado, e invita a consultar recursos de idiomas u otros cursos. Es idempotente (registra envío en columna de estado de "Prueba de Nivel")
- [ ] **NIVEL-07**: La nueva opción de menú queda disponible bajo el submenú "Enviar Correos" de PUCV2English

## Out of Scope

| Feature | Reason |
|---------|--------|
| Integración directa con sistema de salas de la universidad | La sala llega por correo externo, no hay API disponible |
| Persistencia de salas entre semestres | Cada semestre las salas cambian; ingresar siempre desde cero evita datos obsoletos |
| Portal web de postulación propio | Se usa Google Forms |
| Notificaciones push / SMS | GAS no soporta sin servicios externos |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INICIO-01 | Phase 1 | Verified |
| INICIO-02 | Phase 1 | Verified |
| INICIO-03 | Phase 1 | Verified |
| INICIO-04 | Phase 1 | Verified |
| INICIO-05 | Phase 1 | Verified |
| INICIO-06 | Phase 1 | Verified |
| INICIO-07 | Phase 1 | Verified |
| PDF-01 | Phase 2 | Pending |
| PDF-02 | Phase 2 | Pending |
| PDF-03 | Phase 2 | Pending |
| PDF-04 | Phase 2 | Pending |
| PDF-05 | Phase 2 | Pending |
| QUAL-01 | Phase 1 | Verified (no code change needed) |
| NIVEL-01 | Phase 3 | Complete |
| NIVEL-02 | Phase 3 | Pending |
| NIVEL-03 | Phase 3 | Complete |
| NIVEL-04 | Phase 3 | Pending |
| NIVEL-05 | Phase 3 | Pending |
| NIVEL-06 | Phase 3 | Complete |
| NIVEL-07 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*
