# Changelog — PUCV2English

Todos los cambios notables del programa PUCV2English.

---

## [5.2.1] - 2026-07-21

### Añadido
- **Procesamiento de Respuestas WebApp para Continuación** — `procesarAccionPostulante()` en `WebApp` ahora busca fichas en la hoja `Continuación` si no se encuentran en `Seleccionados`.
- **Columna `Aceptación` en Continuación** — Se crea/actualiza automáticamente la columna `Aceptación` en la hoja `Continuación` al hacer clic en los enlaces de correo (`Acepta` / `Rechaza`).
- **Integración en Lista Final** — `generarListaFinalCurso()` en `ListaFinal` ahora escanea la hoja `Continuación` e incorpora a los alumnos con `Aceptación` = `Acepta` en sus respectivos niveles asignados con el estado `Exento (Continuación)`.
- **Integración de Menú Completa** — Añadida la opción `🔄 Continuación (Año Anterior)` en el submenú `📧 Enviar Correos` de Google Sheets.
- **Respuesta WebApp Personalizada** — Los estudiantes de continuación reciben un mensaje de confirmación que aclara que su cupo queda reservado directamente sin pago de matrícula.

### Corregido
- **Ámbito Global de Variables** — Eliminadas declaraciones duplicadas de `CONTINUATION_MAP` en `Correos.js` para evitar `SyntaxError: Identifier 'CONTINUATION_MAP' has already been declared`.

---

## [5.2.0] - 2026-07-21

### Añadido
- **Correo de Continuación** — Nueva plantilla `CorreoContinuacion.html` para estudiantes del año anterior que aprobaron su curso y pueden continuar al siguiente nivel con acceso preferencial (sin matrícula).
- **Mapeo de Niveles de Continuación** — Constante `CONTINUATION_MAP` que define la progresión: `B1+ → B2.1 → B2.2 → C1`.
- **Filtrado de Elegibilidad Automático** — El sistema filtra automáticamente por: asistencia ≥ 80%, nota ≥ 4.0 (40/70), y curso con continuación (excluye C1).
- **Hoja "Continuación"** — Nueva hoja del spreadsheet para pegar los datos del informe de cursos anteriores con columnas `Name`, `Surname`, `ID`, `Curso`, `Profesor`, `Asistencia`, `Promedio Final`, `Email`, `Fecha Notificación`.
- **Lote `CONTINUATION`** — Nuevo tipo de envío masivo en `sendEmailBatch()` con subject "Acceso Preferencial de Continuación - PUCV2English".
- **Test de Continuación** — `sendTestEmail(email, 'CONTINUATION')` para pruebas, incluido en la cadena completa `CADENA_COMPLETA`.
- **Parsing Robusto** — Manejo de comas como separador decimal en asistencia (`88,8` → `88.8`) y extracción de nivel con regex desde nombres de curso completos (`B1+ PIIE 2096 - 01` → `B1+`).

### Cambiado
- **sendEmailBatch** — Soporte para 7 tipos de lote (nuevo: `CONTINUATION`).
- **Cadena completa de test** — Ahora incluye 9 tipos (nuevo: `CONTINUATION`).

---

## [5.1.0] - 2026-07-13

### Añadido
- **Lista de Espera Ampliada** — Hoja física `"Lista de Espera"` con capacidad de 30 candidatos por nivel (120 total).
- **Columna Pago Matrícula** — Dropdown interactivo (`Pagado`/`Pendiente`) en `"Seleccionados"` para control de pagos.
- **Filtro Estricto Lista Final** — Solo candidatos con `Aceptación = "Acepta"` y `Pago Matrícula = "Pagado"` entran a la lista final.
- **Promoción desde Lista de Espera** — Función `promoverDesdeListaEspera()` para mover candidatos de la lista de espera a seleccionados con un clic.
- **Correo Cierre de Lista de Espera** — Nueva plantilla `CorreoEsperaSinCupo.html` y lote `WAITLIST_REJECTED` para notificar cierre del proceso.
- **Columna Fecha Notificación Cierre** — Control independiente de notificaciones de cierre en la hoja Lista de Espera.
- **Modo Borrador Gmail** — Opción de crear correos como borradores antes de enviar (con límite de muestra de 5).
- **Correo Hand Picked** — Plantilla `CorreoHandPicked.html` para candidatos seleccionados manualmente fuera de plazo.
- **Restauración de Seleccionados** — Función de emergencia `restaurarHojaSeleccionadosPerdida()` para recuperar datos perdidos.
- **Exclusión Segura NO_SELECTED** — Los correos de rechazo excluyen en caliente a seleccionados y lista de espera.
- **Fecha Límite Dinámica** — El plazo de 3 días se calcula dinámicamente desde la fecha de envío del correo.
- **Menú Expandido** — Nuevas opciones: `⏳ Cierre Lista de Espera`, `👤 Promover desde Lista de Espera`, `⚠️ Restaurar Hoja Seleccionados`.

### Cambiado
- **Seleccionados Congelados** — La hoja `"Seleccionados"` ya no se sobreescribe al regenerar; solo se actualiza la lista de espera.
- **Promoción Segura** — Al promover desde la lista de espera, se elimina al candidato de la lista de espera y se re-secuencian los rankings.
- **Lista Final requiere pago** — La columna `"Pagó (Sí/No)"` se deriva automáticamente del estado de pago verificado.
- **sendEmailBatch** — Soporte para 6 tipos de lote: `SELECTED`, `TEST_LEVEL_ONLY`, `HAND_PICKED`, `WAITLIST`, `WAITLIST_REJECTED`, `NO_SELECTED`.

### Corregido
- **Bug de columnas TSV** — Corregido escape doble `\\t` que causaba discrepancia de columnas en restauración.
- **Escritura de notificación NO_SELECTED** — Prevenida sobrescritura incorrecta de la hoja de seleccionados al enviar correos de rechazo.

---

## [5.0.2] - 2026-07-08

### Corregido
- **Corrección de Puntajes** — Solucionados los espacios en blanco adicionales en nombres de columnas de configuración (`CONFIG.COLUMNS`) que causaban pérdida de puntaje de Disponibilidad y Compromiso.
- **Eliminación de Duplicados** — Incorporado control de deduplicación de postulantes en caliente.
- **Filtro de Incompletos** — Descartado y marcado automático de postulaciones corruptas o incompletas.
- **Optimización de Tokens** — Unificado a un solo token por postulante para evitar acumulación huérfana de propiedades.

### Añadido
- **Reevaluación desde Menú** — Añadido comando superior `🔄 Reevaluar Todo desde Cero` para limpieza y recálculo masivo.

---

## [5.0.1] - 2026-03-19

### Cambiado
- Migración completa de monolito JavaScript (1.6k loc) a arquitectura modular profesional con TypeScript y tipado estricto.

### Añadido
- **Inicio de Clases** — Módulo completo para notificar inicio de clases con diálogo de asignación de salas por nivel.
- **Correo de Inicio de Clases** — Plantilla `CorreoInicioClases.html` con horarios, salas y fechas de inicio/término.
- **Tests de InicioClases** — Funciones de test para validar el módulo de inicio de clases.

---

## [5.0.0] - 2026-03-01

### Añadido
- Sistema completo de evaluación automatizada de postulaciones con criterios ponderados.
- Dashboard estadístico con métricas por categoría, sede y nivel.
- Ranking de seleccionados (Top 15 por nivel).
- Envío de correos de selección con tokens de confirmación.
- Panel de control web (Web App) para gestión administrativa.
- Sidebar de configuración de pesos y revisión de postulaciones.
