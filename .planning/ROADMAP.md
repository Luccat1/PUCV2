# Roadmap: PUCV2English

## Overview

Two additive features extend the existing admissions pipeline to cover the final stage of the program cycle: notifying confirmed students of their class details (Phase 1) and generating an internal administrative enrollment report (Phase 2). Both phases work against the existing "Lista Final Curso" data. No new infrastructure is required — every API is already in production or is a standard GAS primitive.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Correo Inicio de Clases** (COMPLETE) - Admin puede enviar correos personalizados de inicio de clases a todos los estudiantes confirmados, con sala ingresada vía diálogo
- [ ] **Phase 2: Informe Ejecutivo PDF** - Admin puede generar un PDF de matrícula final agrupado por nivel y exportarlo directamente desde el menú
- [ ] **Phase 3: Asignación por Test de Nivel** - Al generar la lista final, el sistema lee los resultados del test de nivel y asigna cada estudiante a su nivel correspondiente; rechaza con correo específico a quienes obtuvieron nivel insuficiente (A1/A2/B1.1)

## Phase Details

### Phase 1: Correo Inicio de Clases
**Goal**: Admin can send personalized class-start emails to all confirmed students, with per-level classroom collected via dialog, idempotency guard preventing double-sends, and correct quota tracking
**Depends on**: Nothing (existing Lista Final Curso data is prerequisite — already available)
**Requirements**: INICIO-01, INICIO-02, INICIO-03, INICIO-04, INICIO-05, INICIO-06, INICIO-07, QUAL-01
**Success Criteria** (what must be TRUE):
  1. Admin opens a dialog that shows all active levels and can enter the classroom for each before any email is sent
  2. Admin sees a confirmation screen showing the nivel → sala mapping and can abort before sending
  3. Every confirmed student in Lista Final Curso receives an email containing their name, level, schedule (cátedra + ayudantía), classroom, and program start/end dates
  4. Each notified student is marked in the "Notificado Inicio" column; re-running the send skips already-notified students without error
  5. The quota check uses GmailApp.getRemainingDailyQuota() and the menu item is reachable from "Enviar Correos"
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Extend Config.ts (SALA + INICIO_NOTIFICATION_DATE constants, sala? field) and ListaFinal.ts (7-column header); close QUAL-01
- [x] 01-02-PLAN.md — Create InicioClases.ts server module (getNivelesActivos, guardarSalasYObtenerPreview, enviarCorreosInicioClases) and TestInicioClases.ts
- [x] 01-03-PLAN.md — Create DialogSalas.html + CorreoInicioClases.html (src/ and PUCV2English/); wire Menu.ts entry point

### Phase 2: Informe Ejecutivo PDF
**Goal**: Admin can generate a PDF enrollment report grouped by level with totals and individual student rows, exported to Google Drive with the URL shown on success
**Depends on**: Phase 1 (Lista Final Curso populated; sala saved to column)
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05
**Success Criteria** (what must be TRUE):
  1. Admin triggers report generation from the menu and receives a clickable Drive URL pointing to the generated PDF
  2. The PDF is organized by level with a headcount per level and an executive summary showing total enrolled students
  3. Each student row in the PDF includes apellido, nombre, correo, nivel, horario, sala, and payment status (Pagó Sí/No)
  4. The PDF filename includes the generation date (e.g., InformeEjecutivo_20260319.pdf) and no temporary Drive document remains after export completes or fails
**Plans**: TBD

### Phase 3: Asignación por Test de Nivel
**Goal**: Al generar Lista Final Curso, leer resultados de la hoja "Prueba de Nivel" y asignar automáticamente el nivel a cada estudiante que rindió el test; excluir de la lista a quienes obtuvieron nivel insuficiente (A1/A2/B1.1) y enviarles un correo de rechazo específico desde el menú
**Depends on**: Phase 1 (Lista Final Curso estructura ya existente)
**Requirements**: NIVEL-01, NIVEL-02, NIVEL-03, NIVEL-04, NIVEL-05, NIVEL-06, NIVEL-07
**Success Criteria** (what must be TRUE):
  1. Al generar la lista final, los estudiantes con test de nivel quedan bajo su nivel real (B1+/B2.1/B2.2/C1), no bajo "PRUEBA DE NIVEL"
  2. Los estudiantes con nivel insuficiente (A1/A2/B1.1) son excluidos de la lista final y marcados en "Prueba de Nivel"
  3. El admin recibe una advertencia si hay estudiantes con resultado aún no ingresado
  4. El correo de inicio de clases menciona para los estudiantes de test que su nivel fue determinado por los resultados del Test de Nivel
  5. Una nueva opción de menú envía el correo de rechazo por nivel insuficiente (`CorreoRechazoPorNivel.html`) con idempotencia
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Extend Placement.ts (2 new columns: Nivel Insuficiente + Correo Rechazo Enviado); create TestRechazoPorNivel.ts test scaffold
- [ ] 03-02-PLAN.md — Modify ListaFinal.ts: level-resolution logic in generarListaFinalCurso() (NIVEL-01 through NIVEL-04)
- [ ] 03-03-PLAN.md — Create RechazoPorNivel.ts + CorreoRechazoPorNivel.html (src and PUCV2English) for NIVEL-06
- [ ] 03-04-PLAN.md — Insert nivel-assignment phrase in CorreoInicioClases.html (NIVEL-05); wire menu item in Menu.ts (NIVEL-07); human verify checkpoint

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Correo Inicio de Clases | 3/3 | Complete | 2026-03-19 |
| 2. Informe Ejecutivo PDF | 0/TBD | Not started | - |
| 3. Asignación por Test de Nivel | 1/4 | In Progress|  |
