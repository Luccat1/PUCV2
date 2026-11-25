# Changelog — PUCV2

Todos los cambios notables del proyecto PUCV2 (Motor de Evaluación de Postulaciones).

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
El versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [Sin publicar]

### Pauta de evaluación — ajustes tras la primera corrida real (nov 2026)

Reemplaza lo descrito más abajo en "Sexta convocatoria" donde se contradiga.

- **Nadie se excluye de la evaluación**: `motivosNoElegible_()` devuelve todos los motivos; la fila se puntúa igual y queda con `NO ELEGIBLE: <motivos>` en la nueva columna `Observaciones` (y en `Estado de Procesamiento`). Solo los elegibles entran a Seleccionados y Lista de Espera. "Mi carrera no tiene cursos de inglés obligatorios" ya no es impedimento; solo "cursos obligatorios pendientes".
- **Ramificación del formulario** documentada y respetada: pregrado (año de ingreso, internacionalización), postgrado y académico (internacionalización), funcionario (labor profesional), alumni (solo datos personales: sin declaraciones, sin nivel, `Observaciones` lo explica).
- **Disponibilidad y Compromiso puntúan**: 1 punto base × peso del perfil (pregrado 1, postgrado 1,5, funcionario y académico 2).
- **Máximo equivalente (11 puntos antes de Disponibilidad y Compromiso)** por vínculo: nivel de inglés máx 3 (el formulario solo ofrece Cambridge B1 y B2); sin certificado pero con adjunto, 1 punto base; peso de postgrado en Internacionalización 1,3; funcionarios ×0,75 en Uso del Inglés; académicos con 1 punto base fijo en Uso.
- **Internacionalización**: etapas correlativas (Ya aceptado 3,5 … Interés general 0), planes con puntaje jerárquico (postgrado 1 … congreso 0,3; tope 1,5), y por primera vez puntúan los **documentos de respaldo** (casillas; gana la más fuerte, tope 1). Peso de académicos corregido (1, no 0,75).
- **Texto libre**: análisis léxico (normalización, negaciones, familias léxicas, indicio mínimo para "otro") en planes, documentos y actividades; descripciones abiertas de funcionarios puntúan por familias de evidencia (0,2 c/u, tope 1). Palabras clave del formulario corregidas ("curso corto especializado", "visitantes internacionales"…). Se eliminó configuración muerta (`PalabrasClaveContribucion`, `PuntajePorPalabraClave`) y `contarPalabrasClave_`.
- **Año de ingreso** "Antes del 2020" puntúa 0 a propósito. La columna Carta muestra el valor ponderado.
- **Configuración**: `saveConfiguracion` ya no borra la hoja si falla (mezcla con el estado actual y arma las filas antes de borrar); la hoja `Configuración` se crea sola al abrir el sidebar y "Restaurar" la recrea.
- **Despliegue con `clasp`** (`bash deploy.sh && clasp push -f`) y pruebas `node tests/texto-libre.test.js`.

### Cambiado

- **Envío por lote unificado** (`EnvioLote.ts`, `enviarLote()`): `Correos`, `InicioClases` y `RechazoPorNivel` comparten cuota, borrador, límite de muestra, manejo de errores por destinatario y sello de fecha. Antes eran tres copias que ya habían divergido.
- **Tabla de tipos de correo** (`CORREOS`, `TipoCorreo` en `Correos.ts`): reemplaza las cadenas `if/else` de plantilla y asunto de `sendEmailBatch` y `sendTestEmail`. `sendEmailBatch`, `previewEmailBatch` y `getRecipients` reciben `TipoCorreo` (tipo cerrado). Los destinatarios usan `rowNum` en vez de `index`.
- **Plantillas de correo**: estilos, logo y pie salen de tres fragmentos compartidos (`CorreoBase_Estilos`, `CorreoBase_Cabecera`, `CorreoBase_Pie`). 11 plantillas pasan de 1.151 a 508 líneas (+54 de fragmentos). Verificado: el contenido de cada correo queda idéntico y el estilo efectivo no cambia, salvo `CorreoListaEspera` (el color de texto del cuerpo y de los títulos `h3` pasan a ser los de los demás correos). `CorreoPlacementTest` conserva su diseño propio.
- **Cuota**: los borradores ya no se bloquean por falta de cuota de envío (no la consumen).
- Los textos de resultado cambian a "Se enviaron N correos de <tipo>".
- **Funciones privadas** (convención `_` final de Apps Script): 75 funciones internas pasan a terminar en `_` y ya no se pueden llamar con `google.script.run`. Siguen públicas las 49 que usan el menú, los disparadores (`onOpen`, `doGet`, `evaluarPostulacionesPUCV2`) y el HTML de paneles, diálogos y sidebars. Las plantillas llaman `incluir_`. Quien tenga un disparador instalado a mano sobre una función interna deberá apuntarlo a una pública.
- **Encabezados de hojas** en `HEADERS` (`Config.ts`): 154 textos sueltos (`"Correo Electrónico"`, `"Nivel Asignado"`…) pasan a `HEADERS.*`; `CONFIG.COLUMNS` los reutiliza.
- **`leerHoja_()`** en `getRecipients_`, `enviarCorreoConfirmacion_`, `updateApplicantStatus` y `guardarRevisionPostulante`: una columna mal escrita lanza "Falta la columna X en la hoja Y" en vez de producir un resultado vacío. `updateApplicantStatus` ya no escribe a medias si falta una columna. El resto de las lecturas de hojas (unas 30) sigue con `indexOf`, ahora con `HEADERS.*`.
- **Tipado**: los `as any` pasan de 6 a 0; los `catch (e: any)` (21) pasan a `unknown` con `mensajeError_()`; `saveConfiguracion`, `esSi_`, `normalizarFecha_`, `renderPlantilla_` y `getDashboardStats` tienen tipos propios. Los `any` que quedan son sobre todo valores de celdas (`any[][]` de la API de Google).
- `getRecipients_` ya no crea la columna de sello al consultar (la vista previa no modifica hojas); la crea `sendEmailBatch` antes de enviar.

### Corregido

- **Envíos largos**: `enviarLote_` y el envío de Prueba de Nivel se detienen a los 5 minutos y avisan "quedan N pendientes". Antes un lote grande podía cortarse a los 6 minutos sin informar cuántos salieron (y en Prueba de Nivel perder el estado de lo enviado, que se guarda al final).
- **Salas de inicio de clases**: se eliminó el guardado en memoria de `guardarSalasYObtenerPreview` (cada llamada del diálogo es otra ejecución, así que nunca llegaba al envío). `HORARIOS[nivel].sala` ya no existe.

### Añadido

- `renderPlantilla()` e `incluir()` en `Utils.ts`: reemplazan 52 asignaciones `(htmlBody as any).campo = ...`.
- `sendTestEmail('CADENA_COMPLETA')` ahora prueba las 11 plantillas, incluyendo `CorreoEsperaSinCupo` y `CorreoRechazoPorNivel`, que antes no se probaban. Nueva columna `CONFIG.COLUMNS.CLOSURE_NOTIFICATION_DATE`.
- Si falta la columna de sello (`Fecha Notificación`, `Notificado Inicio`, `Sala`), se crea al enviar; antes el envío salía sin sello y un reenvío duplicaba los correos.

---

## [2.6.0] — 2026-11-16

Sexta convocatoria (1.er semestre 2027): la evaluación sigue las bases de postulación.

### Corregido

- **Columnas del formulario 2026** — `CONFIG.COLUMNS` actualizado a los encabezados vigentes. Con los nombres antiguos todos los postulantes quedaban en B1+, con 1 punto de certificado y sin disponibilidad ni compromisos reconocidos.
- **Fecha de postulación** — se guarda como fecha (antes texto largo) y se formatea `dd/MM/yyyy HH:mm` en Evaluación automatizada, Seleccionados y Lista de Espera. Admite textos `dd/mm/aaaa hh:mm:ss`.
- **Internacionalización** — "Interés general" ya no activa el bono de +0.5 para estudiantes.
- **Nivel de inglés** — un certificado en blanco ahora da 0 (antes 1).
- **Estados de procesamiento** — `INCOMPLETA`, `DUPLICADO` y `NO ELEGIBLE` se guardan aunque no haya postulaciones nuevas válidas.

### Cambiado

- **Elegibilidad como filtro** (`motivoNoElegible()`, bases n.º 4, 5.1 y 5.2): disponibilidad, 80 % de asistencia, 7 declaraciones, impedimentos (reprobó, renunció, C1 previo, dos cursos), matrícula vigente y PILE en pregrado. Quien no cumple queda `NO ELEGIBLE: <motivo>` y no se puntúa. Disponibilidad y Compromiso dejan de puntuar: sus columnas quedan en 0.
- **Uso del inglés** y **respaldo de jefatura**: solo académicos y funcionarios (n.º 7.2). Peso de carta 1.5 para funcionarios y académicos; se eliminó el punto de "horario" (fusionado en el formulario).
- **Año de ingreso**: solo pregrado; 3.er año o superior 2 pts, 2.º año 0.5, 1.er año 0 (n.º 7.3). El año del programa sale de `FECHA_INICIO`.
- **Proyección internacional**: las palabras clave del plan son los tipos de actividad de las bases (postgrado, doble titulación, pasantía, intercambio, práctica profesional, curso especializado, congreso). La etapa "En proceso de postulación" suma 2.
- **Alumni**: puntaje 0 en todas las áreas.
- **Cupos de convocatoria abierta** (`CUPOS_CONVOCATORIA_ABIERTA`): B1+ 25; B2.1, B2.2 y C1 15 (antes 15 en todos).
- **Desempate** (`compararPostulantes()`, n.º 7.5): puntaje, luego académicos y postgrado > funcionarios > pregrado, luego fecha de postulación. Aplicado en Seleccionados, Lista de Espera y promoción desde espera.
- **Datos del programa por defecto**: inicio 22 de marzo de 2027, término 1 de julio de 2027, límite viernes 11 de diciembre.

### Añadido

- Nuevas columnas en `CONFIG.COLUMNS`: `PREV_COURSES`, `PREV_C1`, `PREV_FAILED`, `PREV_WITHDREW`, `ENROLLED`, `PILE_STATUS`; y la lista `DECLARACIONES_REQUERIDAS`.
- Helpers en `Utils.ts`: `esAlumni()`, `esAcademicoOFuncionario()`, `rangoDesempate()`, `compararPostulantes()`, `normalizarFecha()`, `formatearColumnaFecha()`.

### Nota de despliegue

Archivos modificados: `Config.js`, `Utils.js`, `Evaluacion.js`, `Seleccionados.js`. Para recalcular usa `🔄 Reevaluar Todo desde Cero` (borra Seleccionados: hazlo antes de registrar aceptaciones o pagos). Si la hoja `Configuración` existe, actualiza ahí `FECHA_INICIO`, `FECHA_TERMINO`, `FECHA_LIMITE`, `TEST_FECHA` y el peso de Carta de Respaldo (1.5).

---

## [2.5.0] — 2026-07-15

### Añadido

- **Módulo Prueba de Nivel (CEPT)** — Sistema completo para gestionar el Cambridge English Placement Test:
  - **`Placement.ts`** — Módulo nuevo (484 líneas) con el flujo completo del placement test.
  - **`sincronizarPlacement()`** — Sincroniza candidatos elegibles desde `"Seleccionados"` a la hoja `"Prueba de Nivel"`. Un candidato es elegible cuando `Verificación Certificado = "Test de nivel"`, `Aceptación = "Acepta"` y `Pago Matrícula = "Pagado"`.
  - **Hoja `"Prueba de Nivel"`** — Hoja automática con columnas: `user id`, `password`, `institutional id`, `nombre`, `correo`, `Puntaje`, `Nivel`, `Enviar Inicial`, `Enviar Recordatorio`, `Enviar Nuevo Código`, `Reminder Status`.
  - **3 modos de envío de correo**: Inicial (credenciales CEPT), Recordatorio, Nuevo Código.
  - **4 métodos de entrega**: `ENVIAR_REAL`, `BORRADOR_TODO`, `BORRADOR_MUESTRA` (máx 5), `TEST_AUTOSEND`.
  - **`CorreoPlacementTest.html`** — Template HTML para el correo de credenciales del test (249 líneas).
  - **`DialogPlacementConfig.html`** — Diálogo modal para configurar URL del test, fecha límite y método de entrega (256 líneas).
  - **`CONFIG.SHEETS.PLACEMENT`** — Nueva clave `"Prueba de Nivel"` en Config.
  - **`CONFIG.PLACEMENT_PDF_NAME`** — Referencia al PDF de instrucciones del placement.
  - **Sub-menú `🧪 Prueba de Nivel (CEPT)`** — 4 nuevas opciones en el menú de Google Sheets:
    - `🔄 Sincronizar Candidatos a Test`
    - `📧 Enviar Credenciales Iniciales`
    - `🔔 Enviar Recordatorios`
    - `✉️ Enviar Nuevos Códigos`
  - **Deduplicación**: Los candidatos ya presentes en la hoja (por email) no se duplican al sincronizar.
  - **Checkboxes pre-marcados**: Nuevos candidatos se agregan con `Enviar Inicial` pre-ticked.

---

## [2.4.0] — 2026-07-13

### Añadido

- **Lista de Espera Ampliada** — Hoja física `"Lista de Espera"` con capacidad de 30 candidatos por nivel (120 total).
- **Columna Pago Matrícula** — Dropdown interactivo (`Pagado`/`Pendiente`) en `"Seleccionados"` para control de pagos.
- **Filtro Estricto Lista Final** — Solo candidatos con `Aceptación = "Acepta"` y `Pago Matrícula = "Pagado"` entran a la lista final.
- **Promoción desde Lista de Espera** — Función `promoverDesdeListaEspera()` para mover candidatos de la lista de espera a seleccionados con un clic.
- **Correo Cierre de Lista de Espera** — Nueva plantilla `CorreoEsperaSinCupo.html` y lote `WAITLIST_REJECTED` para notificar cierre del proceso.
- **Columna Fecha Notificación Cierre** — Control independiente de notificaciones de cierre en la hoja Lista de Espera.
- **Modo Borrador Gmail** — Opción de crear correos como borradores antes de enviar (muestra de máximo 5).
- **Correo Hand Picked** — Plantilla `CorreoHandPicked.html` para candidatos seleccionados manualmente fuera de plazo.
- **Restauración de Seleccionados** — Función de emergencia `restaurarHojaSeleccionadosPerdida()` para recuperar datos perdidos.
- **Exclusión Segura NO_SELECTED** — Los correos de rechazo excluyen en caliente a seleccionados y lista de espera.
- **Fecha Límite Dinámica** — El plazo de 3 días se calcula dinámicamente desde la fecha de envío del correo.
- **Menú Expandido** — Nuevas opciones: `⏳ Cierre Lista de Espera`, `👤 Promover desde Lista de Espera`, `⚠️ Restaurar Hoja Seleccionados`.
- Templates y lógica bilingüe (español/inglés) para PUCV2 y PUCV2English.
- WebApp con módulos: dashboard, confirmación de postulante, estadísticas de datos.

### Cambiado

- **Seleccionados Congelados** — La hoja `"Seleccionados"` ya no se sobreescribe al regenerar; solo se actualiza la lista de espera.
- **Promoción Segura** — Al promover desde la lista de espera, se elimina al candidato de la lista de espera y se re-secuencian los rankings.
- **Lista Final requiere pago** — La columna `"Pagó (Sí/No)"` se deriva automáticamente del estado de pago verificado.
- **sendEmailBatch** — Soporte para 6 tipos de lote: `SELECTED`, `TEST_LEVEL_ONLY`, `HAND_PICKED`, `WAITLIST`, `WAITLIST_REJECTED`, `NO_SELECTED`.

### Corregido

- **Bug de columnas TSV** — Corregido escape doble `\\t` que causaba discrepancia de columnas en restauración.
- **Escritura de notificación NO_SELECTED** — Prevenida sobrescritura incorrecta de la hoja de seleccionados al enviar correos de rechazo.

---

## [2.3.0] — 2026-07-09

### Añadido

- Motor de evaluación y archivos de configuración para el módulo PUCV2English.
- Integración de criterios de evaluación específicos para el programa de inglés.

---

## [2.2.0] — 2026-07-08

### Añadido

- **Procesamiento de Correos por Lotes** — Lógica de batch email con soporte para múltiples templates HTML.
- **Soporte Bilingüe** — Arquitectura modular con soporte para estructura de proyecto bilingüe (español/inglés).
- Función de notificación de prueba para validar envíos antes de producción.

---

## [2.1.0] — 2026-06-26

### Añadido

- **Dashboard Expandido** — Desglose por nivel, conteo de certificados y corrección del popup blocker.
- **Correos de Prueba** — Soporte para categorías `hand-picked` y `class-start` en modo test.

### Corregido

- Corrección de heights de chart containers y redimensionamiento responsivo en Dashboard.
- Eliminado segmento de path multi-login de URL de WebApp para evitar conflictos de sesión.

---

## [2.0.0] — 2026-06-22

> **Nueva temporada** — Motor de evaluación rediseñado desde cero para el ciclo 2026.

### Añadido

- Motor de evaluación modular con cargador de configuración y documentación técnica para el pipeline PUCV2.
- Correos de confirmación de matrícula automatizados.
- Dashboard web expandido con métricas por categoría, sede y nivel.
- Lógica de evaluación (Dashboard + Evaluación) para análisis y procesamiento de datos.

### Cambiado

- Arquitectura del pipeline de evaluación completamente rediseñada.
- Configuración externalizada a hojas de cálculo dedicadas.

---

## [1.2.0] — 2026-03-19

### Añadido

- **Módulo Inicio de Clases** — `InicioClases.ts` con funciones: `getNivelesActivos`, `guardarSalasYObtenerPreview`, `enviarCorreosInicioClases`, `renderCorreoInicioClases`.
- **Template `CorreoInicioClases.html`** — Con horarios, salas y fechas de inicio/término.
- **Diálogo de Salas** — `DialogSalas.html`, modal en dos pasos para recolección de sala por nivel.
- Tests de InicioClases para validación del módulo.
- Extensión del schema `ListaFinal` a 7 columnas (`Sala` y `Notificado Inicio`).
- Constantes `SALA` y `INICIO_NOTIFICATION_DATE` en `Config`.

---

## [1.1.0] — 2026-03-13

### Añadido

- **Email Hand Picked** — Categoría y plantilla `CorreoHandPicked.html` para candidatos seleccionados manualmente fuera de plazo.

### Corregido

- **Mismatch de Columnas** — Corregido bug de desalineación de columnas en `ListaFinal`.

---

## [1.0.0] — 2026-03-04

> **Primera versión formal** — Refactorización completa de monolito JavaScript a arquitectura modular profesional con TypeScript.

### Añadido

- **Arquitectura Modular TypeScript** — Migración completa desde monolito JS (~1.6k loc) a módulos con tipado estricto.
- **Motor de Evaluación** — `Evaluacion.ts` con criterios ponderados y lógica de ranking.
- **Sistema de Correos** — `Correos.ts` con hardening contra duplicados y límites de cuota.
- **Integración de Hojas** — Módulo de integración con Google Sheets para lectura/escritura de datos.
- **Dashboard Web App** — Panel de control web con gráficos por categoría, sede y nivel; tabs; animaciones de terminal.
- **Sistema de Tokens** — Gestión de tokens de confirmación para respuestas de candidatos.
- **WebApp** — Routing `doGet` para aceptar/rechazar candidaturas con tokens.
- **Menú Personalizado** — Menú de Google Sheets con funciones de gestión completas.
- **`ListaFinal`** — Generación de lista final de seleccionados (Top 15 por nivel).
- **Promotion de Lista de Espera** — Lógica de promoción automática desde waitlist.
- **`PROGRAM_DATA`** — Externalizado a hoja de cálculo configurable.
- README.md y ARCHITECTURE.md reescritos para arquitectura modular.
- Documentación técnica completa (ADRs, fases de ejecución).

---

## [0.5.0] — 2025-12-15

### Añadido

- Sistema de evaluación con parámetros de scoring configurables.
- Logging estructurado de evaluaciones.
- Templates de email asociados al flujo de evaluación.

---

## [0.4.0] — 2025-11-17

### Añadido

- **PUCV2English** — Dashboard con gestión de postulantes y estadísticas del programa de inglés.
- Templates HTML de notificación por email para el programa PUCV English.
- Estructura de datos `PROGRAM_DATA` para PUCV2English.

### Cambiado

- Refactorización de estructura `CONFIG` con función de carga de configuración.
- Mejoras en la lógica de scoring para análisis más preciso.

---

## [0.3.0] — 2025-11-13

### Añadido

- Interfaz web (Web App) para análisis y gestión de notificaciones.

### Cambiado

- Refactorización de parámetros de scoring.

---

## [0.2.0] — 2025-11-04

### Añadido

- Motor de evaluación automatizada con funciones de scoring modularizadas.
- Dashboard con análisis por categoría y hoja de postulantes seleccionados.
- Notificaciones automáticas por email a candidatos seleccionados.
- Bloqueo de ejecuciones simultáneas (`LockService`).

### Cambiado

- `CONFIG` movida a constante global.
- Lógica de scoring mejorada y modularizada.
- Limpieza de hoja de resultados antes de escritura (elimina duplicados).

---

## [0.1.0] — 2025-11-03

> **Primera versión del sistema.**

### Añadido

- Script inicial de evaluación de postulaciones PUCV2.
- Cálculo de puntajes por criterios.
- Dashboard básico de visualización de resultados.
