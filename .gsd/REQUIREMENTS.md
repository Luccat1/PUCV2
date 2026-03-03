# REQUIREMENTS.md

## Format
| ID | Requirement | Source | Status |
|----|-------------|--------|--------|
| REQ-01 | Modularizar código en archivos TypeScript separados (Evaluacion, Correos, Dashboard, Config, WebApp, Utils) | SPEC Goal 9 | Pending |
| REQ-02 | Configurar proyecto con clasp para desarrollo local + deploy a GAS | SPEC Goal 9 | Pending |
| REQ-03 | Crear menú nativo en Sheets vía `onOpen()` con categorías: Evaluación, Correos, Dashboard, Configuración | SPEC Goal 1 | Pending |
| REQ-04 | Implementar sidebar HTML para configurar pesos de evaluación con UI de formulario | SPEC Goal 2, 4 | Pending |
| REQ-05 | Implementar sidebar/dialog HTML para revisión individual de postulaciones | SPEC Goal 2 | Pending |
| REQ-06 | Crear web app dashboard con estadísticas, gráficos Chart.js, tablas de seleccionados/espera | SPEC Goal 3 | Pending |
| REQ-07 | Endpoint web app para aceptación/rechazo de cupo vía enlace en correo | SPEC Goal 5 | Pending |
| REQ-08 | Incluir enlace de confirmación en plantilla de correo de seleccionados | SPEC Goal 5 | Pending |
| REQ-09 | Envío batch de correos por categoría (seleccionados, espera, no seleccionados) activado por botón post-revisión | SPEC Goal 6, 8 | Pending |
| REQ-10 | Solo enviar a postulantes que cumplen criterios y no han sido notificados previamente | SPEC Goal 6 | Pending |
| REQ-11 | Separación clara de estados: Seleccionado, Lista de Espera, No Seleccionado, Rechazado, Excluido | SPEC Goal 7 | Pending |
| REQ-12 | Exclusión automática de lista cuando postulante rechaza cupo o revisor marca como no apto | SPEC Goal 7 | Pending |
| REQ-13 | Promoción automática de lista de espera cuando se libera cupo | SPEC Goal 7 | Pending |
| REQ-14 | Parámetros de evaluación editables desde UI sin modificar código | SPEC Goal 4 | Pending |
| REQ-15 | Guía de setup de clasp clara e incluida en documentación | SPEC Goal 9 | Pending |
| REQ-16 | Todo funciona dentro de Google Workspace sin dependencias externas más allá de CDNs | SPEC Constraint | Pending |
