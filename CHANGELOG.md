# Changelog — PUCV2

Todos los cambios notables del proyecto PUCV2 (Motor de Evaluación de Postulaciones).

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).
El versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

> [!NOTE]
> El changelog del framework de planificación GSD (herramienta del agente IA) está en `.gsd/CHANGELOG-GSD.md`.

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
