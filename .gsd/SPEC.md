# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision

Refactorizar PUCV2English desde un script monolítico hacia un sistema modular, profesional y ergonómico que viva dentro de Google Sheets. El sistema usará menús nativos, sidebars HTML y una web app externa para dashboard, transformando la experiencia tanto para los revisores administrativos (2 personas) como para los postulantes que interactúan vía correo. El código se desarrollará con **clasp + TypeScript** para tipado, modularidad y desarrollo local.

## Goals

1. **Menú nativo de Sheets** — Integrar todas las acciones administrativas como ítems del menú contextual de Google Sheets (`onOpen` → menú personalizado)
2. **Sidebar HTML para configuración y revisión** — Panel lateral en Sheets para configurar parámetros de evaluación, revisar postulaciones individuales, y gestionar estados
3. **Web App externa para dashboard** — Dashboard rico con Chart.js para estadísticas y gráficos comparativos
4. **Parámetros de evaluación configurables** — Los pesos de puntuación y criterios deben ser editables desde ventanas modales/sidebar sin tocar código
5. **Sistema de aceptación por enlace** — Los postulantes seleccionados reciben un correo con un enlace a una mini web app donde confirman o rechazan su cupo, actualizando Sheets automáticamente
6. **Automatización inteligente de correos** — Envío en batch activado por botón tras revisión, con lógica que solo envía a quienes cumplen criterios y no han sido notificados
7. **Separación limpia Seleccionados vs Lista de Espera** — Evitar confusiones entre estados; exclusión automática de quienes rechazan o son marcados como no aptos
8. **Correos automatizados para no seleccionados** — Incluir en el flujo de envío batch
9. **Refactoring arquitectónico** — Modularizar en archivos separados (Evaluacion, Correos, Dashboard, Config, WebApp, Utils), usar clasp + TypeScript, aplicar buenas prácticas GAS

## Non-Goals (Out of Scope)

- Migrar fuera de Google Workspace (todo debe funcionar dentro de la suite de Google)
- Crear una app móvil nativa
- Implementar autenticación de usuarios adicional (los 2 revisores ya tienen acceso al Sheet)
- Reescribir el formulario de postulación (se mantiene el Google Form existente)
- Multi-idioma en la interfaz administrativa (se mantiene en español)

## Users

### Revisores Administrativos (2 personas)
- Acceso completo al Google Sheet
- Usan menú nativo, sidebar y web app para gestionar todo el ciclo
- Necesitan una experiencia fluida: evaluar → revisar → configurar → enviar correos → generar listas

### Postulantes (~50-200 por convocatoria)
- Interactúan solo vía correo electrónico
- Reciben notificaciones según su estado (seleccionado, lista de espera, no seleccionado)
- Los seleccionados confirman/rechazan cupo mediante enlace web

## Constraints

- **Plataforma:** Google Apps Script (V8 runtime) dentro de Google Sheets
- **Desarrollo:** clasp + TypeScript con guía de setup clara
- **Timeline:** Urgente — debe estar listo para la próxima convocatoria (5ª versión del programa)
- **Datos:** El script reside en la misma hoja que recibe las respuestas del formulario (34 columnas de entrada)
- **Límites GAS:** 6 min timeout por ejecución, 100 emails/día (Gmail), 30 sec sidebar/dialog timeout
- **Compatibilidad:** 2 usuarios con acceso completo, sin necesidad de permisos diferenciados

## Success Criteria

- [ ] Menú nativo en Sheets con todas las funciones organizadas por categoría
- [ ] Sidebar funcional para configurar parámetros y revisar postulaciones
- [ ] Web App dashboard con estadísticas y gráficos comparativos
- [ ] Los postulantes pueden aceptar/rechazar cupo desde un enlace en el correo
- [ ] Los correos se envían en batch por categoría (seleccionados, espera, no seleccionados) con un solo clic post-revisión
- [ ] La lista de espera está claramente separada y los rechazos/exclusiones se procesan automáticamente
- [ ] El código está modularizado en archivos separados con TypeScript
- [ ] Guía de setup de clasp incluida y funcional
- [ ] El sistema funciona íntegramente dentro de Google Workspace
