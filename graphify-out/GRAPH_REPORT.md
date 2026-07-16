# Graph Report - .  (2026-07-16)

## Corpus Check
- 250 files · ~160,122 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 989 nodes · 1443 edges · 83 communities (66 shown, 17 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 175 edges (avg confidence: 0.87)
- Token cost: 0 input · 1,356,936 output

## Community Hubs (Navigation)
- PUCV2English Module Map & Logical Flow
- Class-Start Email: Gap Closure Architecture
- Accept/Reject Token System & Interfaces
- Bug Fixes & Data Corrections
- v5.0 Milestone Audit & Core Modules
- GSD Agent Skills Overview
- Codebase Concerns & Technical Debt
- Clasp Setup & Token Generation
- Schema Foundations & Requirements
- GSD Methodology & Gap Closure Workflow
- Configuration & Review Sidebars
- Menu.js Dialog Openers
- GSD Plan Checker Quality Dimensions
- Multi-Wave Scaffolding Example & Config Origins
- Dashboard Log Panel & Utils
- Context Compressor Strategies
- Evaluacion.js Scoring Functions
- TypeScript Compiler Config
- PROGRAM_DATA Configuration Extraction
- Evaluacion.ts Scoring Functions
- AI Model Adapter Guides
- Class-Start Gap Closure Decisions
- Placement.js Dialogs
- Placement.ts Dialogs
- TypeScript Hardening & Edge Cases
- InicioClases.ts Business Logic
- WebApp.js API Layer
- Documentation Update & Milestone Close
- Core Architecture & ADRs
- ListaFinal & WebApp.ts
- Dashboard Data API & UI Redesign
- Model Selection Playbook
- package.json Dependencies
- GSD Executor Agent Protocol
- Empirical Validation Principles
- GSD Meta-Prompting Philosophy
- External Integrations (GAS APIs)
- Seleccionados.js State Machine
- Lista Final Curso Sheet
- Correos.js Email Functions
- appsscript.json Manifest
- GSD Codebase Mapper Agent
- Context Health Monitor (3-Strike Rule)
- GSD Debugger Agent
- GSD Antigravity Version History
- Class-Start Email Template & Dialog
- PUCV2English Project State
- Commit & SPEC-PLAN-EXECUTE Protocol
- Config.js Constants
- Dashboard.js Functions
- InicioClases.js Functions
- Dashboard.js Functions (variant)
- Dashboard.ts Functions
- Tech Stack & Build Pipeline
- setup_search.sh Script
- CHANGELOG & Update Workflows
- ListaFinal Bug Fix (Plan 7.2)
- GSD Journal/Summary Templates
- deploy.sh Script
- deploy-simple.sh Script
- Clasp Removal (ADR-008)
- GSD Quick Reference Card
- Discovery/Research Templates
- search_repo.sh Script
- validate-all.sh Script
- validate-skills.sh Script
- validate-templates.sh Script
- validate-workflows.sh Script
- ADR-002 Combo UI Decision
- Cross-Platform Commands Reference
- GSD Workflow Example (Todo API)
- TODO.md Template
- User Setup Template
- Token Efficiency Rules

## God Nodes (most connected - your core abstractions)
1. `Codebase Concerns Document` - 33 edges
2. `/plan Workflow` - 20 edges
3. `/execute Workflow` - 17 edges
4. `Requirements: PUCV2English` - 17 edges
5. `Phase 1: Correo Inicio de Clases - Research` - 17 edges
6. `SPEC Goals 1-9 (native menu, sidebar, web dashboard, configurable params, accept-link, batch email, state separation, refactor)` - 16 edges
7. `GSD Antigravity v1.0.0` - 15 edges
8. `GSD Planner Agent` - 15 edges
9. `PUCV2English Control Panel (Web App)` - 15 edges
10. `PUCV2English v5.1.0 Release` - 14 edges

## Surprising Connections (you probably didn't know these)
- `poblarYEnviarEnvioInicioClases()` --semantically_similar_to--> `enviarCorreosInicioClases()`  [INFERRED] [semantically similar]
  .planning/phases/01-correo-inicio-de-clases/01-1-PLAN-GAP.md → src/InicioClases.ts
- `enviarCorreosInicioClases()` --semantically_similar_to--> `MailApp.getRemainingDailyQuota() Quota Check Pattern`  [INFERRED] [semantically similar]
  src/InicioClases.ts → .planning/phases/01-correo-inicio-de-clases/01-02-PLAN.md
- `Return-Based Testing Pattern (error strings)` --semantically_similar_to--> `testGetNivelesActivos()`  [INFERRED] [semantically similar]
  .planning/codebase/TESTING.md → src/TestInicioClases.ts
- `finalRows construction (src/ListaFinal.ts)` --semantically_similar_to--> `getSelectionData()`  [INFERRED] [semantically similar]
  .gsd/phases/7/2-SUMMARY.md → src/WebApp.ts
- `Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet` --references--> `saveConfiguracion()`  [AMBIGUOUS]
  .gsd/phases/5/1-PLAN.md → src/Evaluacion.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Context Engineering Subsystem (fetch, compress, budget, health)** — agent_skills_context_fetch_skill_main, agent_skills_context_compressor_skill_main, agent_skills_token_budget_skill_main, agent_skills_context_health_monitor_skill_main [INFERRED 0.85]
- **Checkpoint Protocol Pattern Across Planning & Execution** — agent_skills_planner_skill_task_types, agent_skills_executor_skill_checkpoint_protocol, gsd_style_xml_task_structure [INFERRED 0.80]
- **PUCV2English v5.1.0 Release Documentation Set** — changelog_pucv2english_v5_1_0, deployment_checklist_overview, readme_overview [INFERRED 0.85]
- **GSD Core Workflow Pipeline (map -> plan -> execute -> verify)** — agent_workflows_map_workflow, agent_workflows_plan_workflow, agent_workflows_execute_workflow, agent_workflows_verify_workflow [INFERRED 0.85]
- **GSD Session Continuity & Context Hygiene (debug, pause, resume)** — agent_workflows_debug_workflow, agent_workflows_pause_workflow, agent_workflows_resume_workflow [INFERRED 0.80]
- **GSD Milestone Lifecycle Management** — agent_workflows_new_project_workflow, agent_workflows_new_milestone_workflow, agent_workflows_complete_milestone_workflow, agent_workflows_plan_milestone_gaps_workflow [INFERRED 0.75]
- **Accept/Reject Cupo Email Confirmation Flow** — gsd_architecture_webapp_ts, gsd_architecture_correos_ts, gsd_architecture_seleccionados_ts, gsd_decisions_adr_003_accept_reject_link [INFERRED 0.90]
- **Phase 3 Tracking Gap (code implemented but unverified/undocumented)** — gsd_audit_phase3_email_system, gsd_roadmap_phase_3_email_system, gsd_todo_roadmap_consistency [INFERRED 0.85]
- **Phase 1: Monolith-to-Modules TypeScript Migration** — gsd_phases_1_1_plan, gsd_phases_1_2_plan, gsd_phases_1_3_plan, pucv2english_pucv2_js [EXTRACTED 1.00]
- **GSD Examples Reference Documentation Set** — gsd_examples_cross_platform, gsd_examples_multi_wave_workflow, gsd_examples_quick_reference, gsd_examples_workflow_example [INFERRED 0.85]
- **Phase 2: Sheets Sidebar/Dialog UI Workflow** — gsd_phases_2_research, gsd_phases_2_1_plan, gsd_phases_2_2_plan, gsd_phases_2_3_plan, gsd_phases_2_verification [INFERRED 0.85]
- **Phase 3: Accept/Reject Email & Waitlist Promotion Workflow** — gsd_phases_3_research, gsd_phases_3_1_plan, gsd_phases_3_2_plan, gsd_phases_3_3_plan, gsd_phases_3_verification [INFERRED 0.85]
- **Phase 4: Dashboard Data API + UI Redesign** — gsd_phases_4_1_plan, gsd_phases_4_1_summary, gsd_phases_4_2_plan, gsd_phases_4_2_summary [INFERRED 0.85]
- **Configurable Program Data Flow (Sheet-backed PROGRAM_DATA with hardcoded fallback)** — src_config_program_data, src_config_default_program_data, src_evaluacion_cargardatosprograma, src_sidebarconfig_html [INFERRED 0.85]
- **Phase 6.3 Edge Case Hardening Pass** — src_evaluacion_evaluarpostulacionespucv2, src_correos_sendemailbatch, src_webapp_getselectiondata, src_seleccionados_gestionarlistadeespera [EXTRACTED 1.00]
- **Hand Picked Applicant Email Flow** — pucv2english_correohandpicked, src_correos_getrecipients, src_correos_sendemailbatch, src_menu_enviarcorreoshandpicked [EXTRACTED 1.00]
- **GSD Phase Lifecycle Templates (Context to Verification)** — gsd_templates_context, gsd_templates_discovery, gsd_templates_research, gsd_templates_plan, gsd_templates_summary, gsd_templates_uat, gsd_templates_verification [INFERRED 0.85]
- **Project-Level Planning Documents (SPEC/Requirements/Roadmap/Decisions)** — gsd_templates_project, gsd_templates_spec, gsd_templates_requirements, gsd_templates_roadmap, gsd_templates_decisions [INFERRED 0.80]
- **Session Continuity and State Tracking Templates** — gsd_templates_state, gsd_templates_state_snapshot, gsd_templates_journal, gsd_templates_debug [INFERRED 0.85]
- **Phase 1 Correo Inicio de Clases — Plan/Summary Delivery Chain** — planning_roadmap_phase1, planning_phases_01_01_plan, planning_phases_01_01_summary, planning_phases_01_02_plan, planning_phases_01_02_summary, planning_phases_01_03_plan, planning_phases_01_03_summary [EXTRACTED 1.00]
- **Gap Closure: Sheet-Based Class-Start Email Workflow** — planning_phases_01_correo_inicio_de_clases_continue_here, planning_phases_01_1_plan_gap, planning_phases_01_2_plan_gap, src_envioinicioclases_crearhojaenvioinicioclases, src_envioinicioclases_poblaryenviarenvioinicioclases [EXTRACTED 1.00]
- **InicioClases.ts Public API for Class-Start Email Feature** — src_inicioclases_getnivelesactivos, src_inicioclases_guardarsalasyobtenerpreview, src_inicioclases_enviarcorreosinicioclases, src_inicioclases_rendercorreoinicioclases [EXTRACTED 1.00]
- **Class-Start Email Feature: Research, Architecture, Pitfalls & Artifacts** — planning_phases_01_correo_inicio_de_clases_01_research, planning_research_architecture, planning_research_pitfalls, pucv2english_correoinicioclases, pucv2english_dialogsalas [INFERRED 0.85]
- **QUAL-01 Quota API Contradiction Across Research Docs** — planning_phases_01_correo_inicio_de_clases_01_research_qual01_finding, planning_research_pitfalls_c5_quota_confusion, planning_research_stack, planning_phases_01_correo_inicio_de_clases_01_verification [INFERRED 0.75]
- **Gap 2 Contact Email Fix: Before/After Evidence** — planning_phases_01_correo_inicio_de_clases_01_gaps_gap2_contact_email, pucv2english_correotestnivel, pucv2english_correoplacementtest [INFERRED 0.80]
- **Applicant Selection & Payment-Confirmation Email Flow** — pucv2english_index, src_correoseleccionado, src_correoconfirmacionacepta, docs_logical_flow_webapp_ts [INFERRED 0.85]
- **PUCV2English Admin Control Panel Suite** — pucv2english_index, pucv2english_sidebarconfig, pucv2english_sidebarrevision [INFERRED 0.85]
- **GSD Model-Agnostic Adapter Layer** — adapters_claude, adapters_gemini, adapters_gpt_oss [INFERRED 0.95]
- **Applicant Evaluation & Review Workflow** — src_dialogconfirmeval, src_sidebarrevision, src_index [INFERRED 0.75]
- **Program Configuration & Setup Dialogs** — src_sidebarconfig, src_dialogplacementconfig, src_dialogsalas [INFERRED 0.75]
- **Email Dispatch Workflows (Real/Draft/Test)** — src_dialogsalas, src_dialogplacementconfig, src_index [INFERRED 0.75]

## Communities (83 total, 17 thin omitted)

### Community 0 - "PUCV2English Module Map & Logical Flow"
Cohesion: 0.05
Nodes (61): Flujo Lógico y Operación de Scripts (PUCV2English v5.1.0), Config.ts Module (scoring & program config), Correos.ts Module (batch email engine), Evaluacion.ts Module (scoring engine), Idempotencia de Envíos (rationale: date-stamp guards against duplicate sends), InicioClases.ts Module (class-start notification), ListaFinal.ts Module (final roster generation), LockService Concurrency Control (rationale: prevents parallel overwrite of sheets) (+53 more)

### Community 1 - "Class-Start Email: Gap Closure Architecture"
Cohesion: 0.07
Nodes (51): Phase 1 Gap Closure: Enhanced Architecture & Configuration, Gap 1: Separate Sheet for Deployment Record, Gap 3: Button Placement & Visibility (Two Menu Buttons), Phase 1: Correo Inicio de Clases - Research, Idempotency via Notification Column Pattern, INICIO-01: Dialog Requests Sala per Active Level, INICIO-02: Dialog Shows Nivel→Sala Confirmation, INICIO-03: Send Class-Start Emails to Confirmed Students (+43 more)

### Community 2 - "Accept/Reject Token System & Interfaces"
Cohesion: 0.05
Nodes (35): ADR-003 (tokenized accept/reject link pattern), Fix: Incluir correo nuevo o categoría para seleccionados extratemporáneos, Summary: Plan 7.3 - Add hand picked email category, Architecture Document, Container-bound GAS Architecture Pattern, IApplicantResult Interface, IConfig Interface, IProgramData Interface (+27 more)

### Community 3 - "Bug Fixes & Data Corrections"
Cohesion: 0.06
Nodes (40): TSV Double-Escape Column Bug Fix, Corrección de Puntajes (Score Correction), CorreoEsperaSinCupo.html Template, CorreoHandPicked.html Template, Filtro Estricto Lista Final, Lista de Espera Ampliada (Extended Waitlist Sheet), Migración de Monolito JS a TypeScript Modular, Modo Borrador Gmail (+32 more)

### Community 4 - "v5.0 Milestone Audit & Core Modules"
Cohesion: 0.06
Nodes (43): Correos.ts (batch email, quota guard, dedup), Seleccionados.ts (state machine: cupo/waitlist promotion), v5.0 Technical Debt (no unit tests, no CacheService, no error UI, quota guard done), WebApp.ts (API layer: doGet, updateApplicantStatus, getSelectionData), Milestone Audit v5.0, Phase 1: Foundation (PASS), Phase 2: Sheets Integration (PASS), Phase 3: Email System (INCOMPLETE TRACKING GAP) (+35 more)

### Community 5 - "GSD Agent Skills Overview"
Cohesion: 0.13
Nodes (43): codebase-mapper skill, context-health-monitor skill (3-strike rule), debugger skill, empirical-validation skill, executor skill, plan-checker skill, planner skill, verifier skill (+35 more)

### Community 6 - "Codebase Concerns & Technical Debt"
Cohesion: 0.06
Nodes (36): Decision: Centralized CONFIG Object, Codebase Concerns Document, Tech Debt: Array Index Safety Gaps, Tech Debt: Column Header Name Dependencies, Scaling Limit: Concurrent Execution (LockService), Fragile Area: Config.ts Global State Management, Test Gap: Configuration Loading Not Validated, Fragile Area: Correos.ts Template Rendering (+28 more)

### Community 7 - "Clasp Setup & Token Generation"
Cohesion: 0.12
Nodes (28): Phase 1 Research — Clasp + TypeScript Setup, Decision: use clasp v2.4.x (stable) over v3.0 alpha, Container-bound script architecture decision, Phase 1 Verification: Foundation, Plan 3.1: Accept/Reject Token System + doGet Routing, doGet(e) routing for dashboard vs accept/reject confirmation page, "Fecha Notificación" column in Seleccionados, generarToken(correo) — UUID token generator (+20 more)

### Community 8 - "Schema Foundations & Requirements"
Cohesion: 0.11
Nodes (26): Phase 01 Plan 01: Schema Foundations, Phase 01 Plan 01 Summary: Schema Foundations, Idempotency via INICIO_NOTIFICATION_DATE Column, Requirements: PUCV2English, INF-01: Guardar informe PDF en Drive compartido (v2), INF-02: Historial de informes generados (v2), INICIO-01: Diálogo solicita sala por nivel activo, INICIO-02: Confirmación mapeo nivel→sala (+18 more)

### Community 9 - "GSD Methodology & Gap Closure Workflow"
Cohesion: 0.09
Nodes (25): Architecture Decision Record (ADR) Pattern, Email Category for Hand-picked Applicants, Gap Closure Workflow, GSD Methodology, ListaFinal Generation Bug Fix, PROJECT_RULES.md (referenced, wave execution rules), ROADMAP.md Consistency Check, Wave-Based Execution (+17 more)

### Community 10 - "Configuration & Review Sidebars"
Cohesion: 0.11
Nodes (24): Plan 2.1: Configuration Sidebar + Server-Side Functions, getConfiguracion() server function, resetConfiguracion() server function, saveConfiguracion(data) server function, SidebarConfig.html — scoring weights editor, Phase 2, Plan 1 Summary: Configuration Sidebar, Plan 2.2: Applicant Review Sidebar, getPostulantesParaRevision() server function (+16 more)

### Community 11 - "Menu.js Dialog Openers"
Cohesion: 0.11
Nodes (7): confirmarYEnviarCorreos(), enviarCorreosEspera(), enviarCorreosEsperaRechazada(), enviarCorreosHandPicked(), enviarCorreosNoSeleccionados(), enviarCorreosSeleccionados(), enviarCorreosTestNivel()

### Community 12 - "GSD Plan Checker Quality Dimensions"
Cohesion: 0.12
Nodes (21): Dimension 3: Dependency Correctness, Dimension 4: Key Links Planned, GSD Plan Checker Agent, Dimension 1: Requirement Coverage, Dimension 5: Scope Sanity, Dimension 2: Task Completeness, Dimension 6: Verification Derivation, Dependency Graph & Wave Assignment (+13 more)

### Community 13 - "Multi-Wave Scaffolding Example & Config Origins"
Cohesion: 0.16
Nodes (21): Multi-Wave Workflow Example (User Authentication), State Snapshot (Wave-End Documentation), Wave-Based Execution Pattern, Plan 1.1: Project Scaffolding + Core Modules, ADR-005: Bind to Active Spreadsheet (remove SHEET_ID, use getSpreadsheet()), Config.ts (planned module: CONFIG, SCORING_PARAMS, PROGRAM_DATA, types), Utils.ts (planned module: shared utility functions), Summary Plan 1.1: Project Scaffolding + Core Modules (+13 more)

### Community 14 - "Dashboard Log Panel & Utils"
Cohesion: 0.13
Nodes (10): Plan 4.3: Real-Time Log Panel + Polish + Responsive Tuning, Summary - Plan 4.3: Real-Time Log Panel + Polish + Responsive Tuning, Phase 4 Verification: Dashboard Web App, src/index.html, appendLogs() (src/index.html client script), fetchLogs() (src/index.html client script), setLoading(state) (src/index.html client script), getWebAppLogs (src/Utils.ts) (+2 more)

### Community 15 - "Context Compressor Strategies"
Cohesion: 0.12
Nodes (17): Compression Triggers Table, Diff-Only Mode Strategy, Context Compressor Skill, Outline Mode Strategy, Progressive Disclosure Strategy, Reference Mode Strategy, Summary Mode Strategy, Context Efficiency Metrics (+9 more)

### Community 16 - "Evaluacion.js Scoring Functions"
Cohesion: 0.20
Nodes (13): applyConditionalFormattingToScores(), calcularPuntajeAnioIngreso(), calcularPuntajeCertificado(), calcularPuntajeInternacionalizacion(), calcularPuntajeTipoPostulante(), calcularPuntajeUsoIngles(), cargarConfiguracionDesdeHoja(), cargarDatosPrograma() (+5 more)

### Community 17 - "TypeScript Compiler Config"
Cohesion: 0.12
Nodes (16): esnext, google-apps-script, ../node_modules/@types, **/*.ts, compilerOptions, esModuleInterop, lib, module (+8 more)

### Community 18 - "PROGRAM_DATA Configuration Extraction"
Cohesion: 0.15
Nodes (15): Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet, Summary - Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet, .gsd/SPEC.md (REQ-04: configurable parameters), CONFIG, DEFAULT_PROGRAM_DATA, DEFAULT_SCORING_PARAMS, IApplicantResult, IConfig (+7 more)

### Community 19 - "Evaluacion.ts Scoring Functions"
Cohesion: 0.22
Nodes (13): applyConditionalFormattingToScores(), calcularPuntajeAnioIngreso(), calcularPuntajeCertificado(), calcularPuntajeInternacionalizacion(), calcularPuntajeTipoPostulante(), calcularPuntajeUsoIngles(), cargarConfiguracionDesdeHoja(), cargarDatosPrograma() (+5 more)

### Community 20 - "AI Model Adapter Guides"
Cohesion: 0.19
Nodes (15): Claude Adapter Guide, Extended Thinking Effort Levels (low/medium/high/max), adapters/GEMINI.md (Gemini-specific enhancements), Gemini Flash vs Pro Model Selection, GPT & Open Source Models Adapter Guide, GPT/OSS Shorter-Context Strategies, Model Selection Playbook, GSD Model-Agnostic Principle (rationale: structured plans compensate for model differences) (+7 more)

### Community 21 - "Class-Start Gap Closure Decisions"
Cohesion: 0.25
Nodes (15): Gap Plan 1.1: EnvioInicioClases.ts Sheet Workflow, Gap Plan 1.2: Config/Menu/Templates Wiring, Decision: Update Contact Email to idiomas@pucv.cl, Decision: Sheet-Based Workflow Instead of Dialog, Decision: Two Separate Buttons (Prepare vs Send), Resuming Phase 1: Gap Closure Execution, CONFIG.CONTACT_EMAIL constant, crearHojaEnvioInicioClases() (+7 more)

### Community 22 - "Placement.js Dialogs"
Cohesion: 0.23
Nodes (14): _abrirDialogoPlacement(), abrirDialogoPlacementInicial(), abrirDialogoPlacementNuevoCodigo(), abrirDialogoPlacementRecordatorio(), _buildPlainBody(), _buildSubject(), _getCheckboxColForMode(), _initPlacementSheet() (+6 more)

### Community 23 - "Placement.ts Dialogs"
Cohesion: 0.23
Nodes (14): _abrirDialogoPlacement(), abrirDialogoPlacementInicial(), abrirDialogoPlacementNuevoCodigo(), abrirDialogoPlacementRecordatorio(), _buildPlainBody(), _buildSubject(), _getCheckboxColForMode(), _initPlacementSheet() (+6 more)

### Community 24 - "TypeScript Hardening & Edge Cases"
Cohesion: 0.32
Nodes (14): Plan 5.2: TypeScript Strictness Pass + Correos.ts Hardening, Summary - Plan 5.2: TypeScript Strictness Pass + Correos.ts Hardening, Phase 5 Verification, Fix: Phase 3 Formal Verification, Fix: Edge Case Handling + Final Polish, Summary - Plan 6.3: Edge Case Hardening + JSDoc, MailApp.getRemainingDailyQuota() (Google Apps Script API), PROGRAM_DATA (+6 more)

### Community 25 - "InicioClases.ts Business Logic"
Cohesion: 0.31
Nodes (12): Phase 01 Plan 02: Core Business Logic, enviarCorreosInicioClases(), getNivelesActivos(), getRecipientsInicioClases(), guardarSalasYObtenerPreview(), ICorreoInicioClasesVars, IInicioClasesRecipient, renderCorreoInicioClases() (+4 more)

### Community 26 - "WebApp.js API Layer"
Cohesion: 0.21
Nodes (9): crearPaginaConfirmacion(), doGet(), generarToken(), getDashboardStats(), getDetailedScoreBreakdown(), getSelectionData(), obtenerUrlConfirmacion(), obtenerUrlConfirmacionConToken() (+1 more)

### Community 27 - "Documentation Update & Milestone Close"
Cohesion: 0.27
Nodes (13): .gsd/ARCHITECTURE.md, .gsd/AUDIT.md, Plan 5.3: TODO Resolution + ROADMAP Finalization + Milestone Close, Summary - Plan 5.3: TODO Resolution + ROADMAP Finalization + Milestone Close, Fix: User-Facing Documentation Update, Summary - Plan 6.2: User-Facing Documentation Update, Phase 6 Verification: Gap Closure, Fix: ROADMAP.md consistency (+5 more)

### Community 28 - "Core Architecture & ADRs"
Cohesion: 0.17
Nodes (13): Config.ts (Core: types, IApplicant, CONFIG, PROGRAM_DATA), Dashboard.ts (analytics reports in Sheets), Evaluacion.ts (Engine: evaluarPostulacionesPUCV2), PUCV2English System Architecture v5.0, ADR-001: Use TypeScript for development, ADR-004: Big Bang migration strategy, ADR-005: Remove hardcoded SHEET_ID — bind to active spreadsheet, ADR-006: Fix cargarConfiguracionDesdeHoja execution order (+5 more)

### Community 29 - "ListaFinal & WebApp.ts"
Cohesion: 0.22
Nodes (9): finalRows construction (src/ListaFinal.ts), crearPaginaConfirmacion(), doGet(), generarToken(), getDashboardStats(), getDetailedScoreBreakdown(), getSelectionData(), obtenerUrlConfirmacion() (+1 more)

### Community 30 - "Dashboard Data API & UI Redesign"
Cohesion: 0.22
Nodes (11): Plan 4.1: Dashboard Data API Enhancement, calcularEstadisticas() reused from Dashboard.ts, getDashboardStats() — chart-ready statistics API, getSelectionData() — enriched dashboard data API, Summary - Plan 4.1: Dashboard Data API Enhancement, Plan 4.2: Dashboard UI Redesign — HTML + CSS + Charts, Chart.js visualizations (bar, doughnut, stacked bar), switchTab(tabId) client-side JS function (+3 more)

### Community 31 - "Model Selection Playbook"
Cohesion: 0.20
Nodes (11): Effort Attribute (Model Selection Hint), Workflow File Conventions (.agent/workflows), XML Task Structure Convention, Long Context Capability (>100k tokens), Phase → Profile Recommendations, Model Profiles (fast_coder, standard, reasoning), Model Capabilities Registry (Optional), Speed Tier Capability (+3 more)

### Community 32 - "package.json Dependencies"
Cohesion: 0.18
Nodes (10): description, devDependencies, @types/google-apps-script, typescript, name, scripts, build, version (+2 more)

### Community 33 - "GSD Executor Agent Protocol"
Cohesion: 0.20
Nodes (10): Authentication Gate Protocol, Checkpoint Protocol (human-verify, decision, human-action), Deviation Rules (auto-fix bug, missing critical, blocking, architectural), Execution Flow (Load State → Load Plan → Determine Pattern → Execute Tasks), GSD Executor Agent, Need-to-Know Context Loading, SUMMARY.md Format, Task Types (auto, checkpoint:*) (+2 more)

### Community 34 - "Empirical Validation Principles"
Cohesion: 0.22
Nodes (9): Forbidden Completion Phrases, Empirical Validation Core Principle, Validation Protocol Before Marking Done, Validation Methods by Change Type, Trust Nothing, Verify Everything, GSD Verifier Agent, Stub Detection Patterns, VERIFICATION.md Format (+1 more)

### Community 35 - "GSD Meta-Prompting Philosophy"
Cohesion: 0.22
Nodes (9): Plans Are Prompts Principle, Budget Thresholds Table, Banned Enterprise/Temporal/Generic Patterns, Context Engineering Size Constraints, Fresh Context Pattern, GSD Meta-Prompting Philosophy, Skill File Conventions (.agent/skills), STATE.md State Preservation (+1 more)

### Community 36 - "External Integrations (GAS APIs)"
Cohesion: 0.22
Nodes (9): External Integrations Document, GmailApp API, HtmlService API, LockService API, MailApp API (Quota Check), PropertiesService API, ScriptApp API, SpreadsheetApp API (+1 more)

### Community 39 - "Lista Final Curso Sheet"
Cohesion: 0.25
Nodes (7): "Lista Final Curso" Sheet, Phase 01 Plan 02 Summary: Core Business Logic, Decision: Sala Stored In-Memory Only (Transient), Arquitectura del Sistema (Modular TypeScript), CONFIG Object (Global Configuration), IProgramData.HORARIOS[nivel].sala? field, generarListaFinalCurso()

### Community 40 - "Correos.js Email Functions"
Cohesion: 0.46
Nodes (7): calcularFechaLimite(), ejecutarEnvioCorreosDesdeWebApp(), enviarCorreoConfirmacion(), getRecipients(), previewEmailBatch(), sendEmailBatch(), sendTestEmail()

### Community 41 - "appsscript.json Manifest"
Cohesion: 0.25
Nodes (7): dependencies, exceptionLogging, runtimeVersion, timeZone, webapp, access, executeAs

### Community 42 - "GSD Codebase Mapper Agent"
Cohesion: 0.29
Nodes (7): ARCHITECTURE.md Output Format, Technical Debt Analysis Domain, Dependency Analysis Domain, GSD Codebase Mapper Agent, Pattern Analysis Domain, STACK.md Output Format, Structure Analysis Domain

### Community 43 - "Context Health Monitor (3-Strike Rule)"
Cohesion: 0.29
Nodes (7): 3-Strike Rule (Context Health), Auto-Save Protocol, Circular Detection Rule, Context Health Monitor Skill, Uncertainty Logging Rule, 3-Strike Rule (Debugging Restart), Verification Failure Handling

### Community 44 - "GSD Debugger Agent"
Cohesion: 0.29
Nodes (7): Cognitive Biases Table (confirmation, anchoring, availability, sunk cost), DEBUG.md Structure, Falsifiability Requirement (Hypothesis Testing), GSD Debugger Agent, Meta-Debugging Own Code, Debugging Techniques (rubber duck, minimal repro, working backwards, differential, binary search, comment-out), User = Reporter, AI = Investigator

### Community 45 - "GSD Antigravity Version History"
Cohesion: 0.33
Nodes (7): Cross-Platform Support (Bash equivalents), Template Parity Initiative, GSD Antigravity v1.1.0, GSD Antigravity v1.2.0, GSD Antigravity v1.3.0, GSD Antigravity v1.4.0, Validation Scripts Infrastructure

### Community 46 - "Class-Start Email Template & Dialog"
Cohesion: 0.52
Nodes (7): Phase 01 Plan 03: DialogSalas.html and CorreoInicioClases.html, Phase 01 Plan 03 Summary: DialogSalas + CorreoInicioClases, CorreoInicioClases.html (PUCV2English/) Email Template, DialogSalas.html (PUCV2English/), CorreoInicioClases.html (src/) Email Template, DialogSalas.html (src/), abrirDialogoInicioClases()

### Community 47 - "PUCV2English Project State"
Cohesion: 0.38
Nodes (7): QUAL-01 Disposition: No Code Change Required, PROJECT.md — PUCV2English, Decision: PDF Generado desde Google Sheets/Docs, PUCV2English System, Decision: Sala Ingresada Manualmente en Diálogo, Project State (STATE.md), Blocker: Confirm GmailApp quota method availability

### Community 48 - "Commit & SPEC-PLAN-EXECUTE Protocol"
Cohesion: 0.40
Nodes (6): Task Commit Protocol (one task = one commit), Commit Conventions (type(scope): description), Commit Conventions, SPEC → PLAN → EXECUTE → VERIFY → COMMIT Protocol, Planning Lock, Proof Requirements by Change Type

### Community 49 - "Config.js Constants"
Cohesion: 0.33
Nodes (5): CONFIG, DEFAULT_PROGRAM_DATA, DEFAULT_SCORING_PARAMS, PROGRAM_DATA, SCORING_PARAMS

### Community 50 - "Dashboard.js Functions"
Cohesion: 0.53
Nodes (4): calcularEstadisticas(), crearGraficoSede(), formatearDatosDashboard(), generarYActualizarDashboard()

### Community 51 - "InicioClases.js Functions"
Cohesion: 0.60
Nodes (5): enviarCorreosInicioClases(), getNivelesActivos(), getRecipientsInicioClases(), guardarSalasYObtenerPreview(), renderCorreoInicioClases()

### Community 52 - "Dashboard.js Functions (variant)"
Cohesion: 0.53
Nodes (4): calcularEstadisticas(), crearGraficoSede(), formatearDatosDashboard(), generarYActualizarDashboard()

### Community 53 - "Dashboard.ts Functions"
Cohesion: 0.53
Nodes (4): calcularEstadisticas(), crearGraficoSede(), formatearDatosDashboard(), generarYActualizarDashboard()

### Community 54 - "Tech Stack & Build Pipeline"
Cohesion: 0.40
Nodes (5): Technology Stack Document, Build Pipeline: tsc → dist/ → PUCV2English/PUCV2.js, Google Apps Script V8 Runtime, TypeScript 5.7.3, Structure Document

### Community 56 - "setup_search.sh Script"
Cohesion: 0.70
Nodes (4): check_fd(), check_ripgrep(), setup_search.sh script, suggest_install()

### Community 57 - "CHANGELOG & Update Workflows"
Cohesion: 0.50
Nodes (4): CHANGELOG.md, /help Workflow, /update Workflow, /whats-new Workflow

### Community 58 - "ListaFinal Bug Fix (Plan 7.2)"
Cohesion: 1.00
Nodes (3): Fix: Exception al ejecutar generar lista final del curso, Summary: Plan 7.2 - Fix Bug in ListaFinal generation, src/ListaFinal.ts

### Community 59 - "GSD Journal/Summary Templates"
Cohesion: 0.67
Nodes (3): JOURNAL.md Template (Session Log), Phase Summary Template, Plan Summary Template (SUMMARY.md)

## Ambiguous Edges - Review These
- `saveConfiguracion()` → `Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet`  [AMBIGUOUS]
  .gsd/phases/5/1-PLAN.md · relation: references
- `Phase 1 Correo Inicio de Clases Verification Report` → `Gap 3: Button Placement & Visibility (Two Menu Buttons)`  [AMBIGUOUS]
  .planning/phases/01-correo-inicio-de-clases/01-GAPS.md · relation: references
- `QUAL-01 Finding: GmailApp.getRemainingDailyQuota() Does Not Exist` → `Pitfall C5: GmailApp vs MailApp Quota Confusion`  [AMBIGUOUS]
  .planning/research/PITFALLS.md · relation: conceptually_related_to

## Knowledge Gaps
- **268 isolated node(s):** `CONFIG`, `DEFAULT_SCORING_PARAMS`, `SCORING_PARAMS`, `DEFAULT_PROGRAM_DATA`, `PROGRAM_DATA` (+263 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `saveConfiguracion()` and `Plan 5.1: Extract PROGRAM_DATA to Configurable Sheet`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Phase 1 Correo Inicio de Clases Verification Report` and `Gap 3: Button Placement & Visibility (Two Menu Buttons)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `QUAL-01 Finding: GmailApp.getRemainingDailyQuota() Does Not Exist` and `Pitfall C5: GmailApp vs MailApp Quota Confusion`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Arquitectura del Sistema (Modular TypeScript)` connect `Lista Final Curso Sheet` to `Accept/Reject Token System & Interfaces`, `Bug Fixes & Data Corrections`, `Dashboard Log Panel & Utils`, `PROGRAM_DATA Configuration Extraction`, `Evaluacion.ts Scoring Functions`, `InicioClases.ts Business Logic`, `ListaFinal & WebApp.ts`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `PUCV2English v5.1.0 System Overview` connect `Bug Fixes & Data Corrections` to `GSD Plan Checker Quality Dimensions`, `Lista Final Curso Sheet`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `sendEmailBatch()` connect `Accept/Reject Token System & Interfaces` to `TypeScript Hardening & Edge Cases`, `InicioClases.ts Business Logic`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `CONFIG`, `DEFAULT_SCORING_PARAMS`, `SCORING_PARAMS` to the rest of the system?**
  _268 weakly-connected nodes found - possible documentation gaps or missing edges._