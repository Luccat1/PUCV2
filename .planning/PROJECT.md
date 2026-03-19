# PUCV2English

## What This Is

Sistema modular en TypeScript/Google Apps Script que gestiona el ciclo completo de postulaciones al Programa de Inglés PUCV: evaluación automática con criterios ponderados, selección de candidatos, comunicación con postulantes, y gestión de matrícula vía dashboard web. Corre como script container-bound en Google Sheets.

## Core Value

Automatizar el proceso de admisión end-to-end para que el equipo administrativo pueda gestionar cientos de postulaciones con mínima intervención manual — desde la evaluación hasta el inicio de clases.

## Requirements

### Validated

- ✓ Evaluación automática de postulaciones con puntaje ponderado — existing
- ✓ Ranking y selección del top-25 por categoría — existing
- ✓ Envío de correos en batch (seleccionados, lista de espera, no seleccionados, test de nivel, hand-picked) — existing
- ✓ Dashboard estadístico de postulaciones — existing
- ✓ Web app para confirmación de aceptación/rechazo por token — existing
- ✓ Generación de lista final de participantes confirmados — existing

### Active

- [ ] Correo de inicio de clases a cada estudiante con su nivel, horario y sala asignada
- [ ] Ingreso manual de sala de clases por nivel al momento de generar (vía diálogo)
- [ ] Informe ejecutivo PDF con resumen de cursos, agrupaciones y número de matriculados

### Out of Scope

- Integración directa con sistema de salas de la universidad — la sala se recibe por correo externo y se ingresa manualmente
- Portal web de postulación propio — se usa Google Forms

## Context

El proceso tiene varias etapas: postulación → evaluación → selección → notificación → aceptación → inicio de clases. Las funcionalidades nuevas cubren la última etapa: comunicar a los estudiantes confirmados los detalles de sus clases, y generar un reporte administrativo del estado final del curso.

La sala de clases llega desde un ente exterior (Dirección de Infraestructura u otro) vía correo electrónico, por lo que no puede automatizarse su origen — se ingresa manualmente al momento de generar.

El informe PDF es para uso interno/administrativo, no para distribuir a estudiantes.

## Constraints

- **Tech stack**: TypeScript → GAS. Sin npm en producción. Sin librerías externas.
- **Runtime**: Google Apps Script — sin acceso a filesystem local, sin node.js
- **PDF**: GAS soporta generación de PDF vía `DriveApp` / Google Docs API o exportación de sheets
- **Deployment**: Manual copy-paste de `PUCV2English/PUCV2.js` al editor GAS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Sala ingresada manualmente en diálogo al generar | Origen externo, no automatizable | — Pending |
| PDF generado desde Google Sheets o Docs | Única opción viable en GAS sin librerías externas | — Pending |

---
*Last updated: 2026-03-19 after initialization*
