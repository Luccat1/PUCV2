# Changelog — PUCV2English

Todos los cambios notables del programa PUCV2English.

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
