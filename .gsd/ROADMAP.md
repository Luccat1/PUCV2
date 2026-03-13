# ROADMAP.md

> **Current Phase**: 7 (Gap Closure)
> **Milestone**: v5.0 (Auditing Gaps)

## Must-Haves (from SPEC)

- [x] TypeScript project structure with modular files *(Phase 1)*
- [x] Native Sheets menu with organized action items *(Phase 2)*
- [x] Sidebar for evaluation config and applicant review *(Phase 2)*
- [x] Web App dashboard with charts and management tables *(Phase 4)*
- [x] Accept/reject cupo via email link → web app endpoint *(Phase 3)*
- [x] Batch email sending by category, post-review *(Phase 3)*
- [x] Clean state separation (Seleccionado/Espera/No Seleccionado/Rechazado/Excluido) *(Phase 3)*
- [x] Automatic waitlist promotion and rejection exclusion *(Phase 3)*

## Phases

### Phase 1: Foundation — TypeScript + Modular Architecture

**Status**: ✅ Complete (2026-03-03)
**Objective**: Set up local typescript project, migrate existing code to TypeScript modules, establish project structure
**Requirements**: REQ-01, REQ-02, REQ-15, REQ-16

**Deliverables:**

- `appsscript.json` configured
- TypeScript modules: `Config.ts`, `Utils.ts`, `Evaluacion.ts`, `Dashboard.ts`, `Correos.ts`, `WebApp.ts`, `Menu.ts`
- Existing logic migrated and working identically
- Setup guide in README
- `tsconfig.json` with GAS-compatible settings

---

### Phase 2: Sheets Integration — Menu + Sidebar + Configurable Parameters

**Status**: ✅ Complete (2026-03-03)
**Objective**: Create native Sheets menu, sidebar for config/review, and configurable evaluation parameters
**Requirements**: REQ-03, REQ-04, REQ-05, REQ-14

**Deliverables:**

- Custom menu under "PUCV2English" in Sheets menubar
- Sidebar HTML for editing scoring weights (reads/writes `Configuración` sheet)
- Sidebar/dialog for reviewing individual applicants with certificate links and status controls
- Modal dialogs for evaluation parameters before running

---

### Phase 3: Email System — Links, Batch Sending, State Management

**Status**: ✅ Complete (2026-03-04) — *verified in Gap Closure*
**Objective**: Overhaul email system with accept/reject links, batch sending, and clean state tracking
**Requirements**: REQ-07, REQ-08, REQ-09, REQ-10, REQ-11, REQ-12, REQ-13

**Deliverables:**

- Web app endpoint `doGet` handles `?action=accept&token=...` and `?action=reject&token=...`
- Updated email templates with confirmation buttons/links
- Batch send function that filters by status and "notificado" flag
- State machine: Pendiente → Seleccionado → Notificado → Acepta/Rechaza → Excluido
- Waitlist auto-promotion when rejection detected
- Rejection emails included in batch flow

---

### Phase 4: Dashboard Web App — Visualization + Management

**Status**: ✅ Complete
**Objective**: Build rich web app dashboard for statistics, applicant management, and real-time monitoring
**Requirements**: REQ-06

**Deliverables:**

- Redesigned web app with improved UX/UI
- Chart.js visualizations (profile comparison, score distribution, seat breakdown)
- Interactive applicant tables with inline editing
- Real-time log output during long operations
- Responsive design

---

### Phase 5: Polish, Testing + Documentation

**Status**: ✅ Complete
**Objective**: End-to-end testing, edge case handling, documentation, and final cleanup

**Deliverables:**

- End-to-end test with sample data
- Edge case handling (duplicate emails, concurrent edits, quota limits)
- Updated README.md with full usage guide
- Manual setup guide using `dist` directory in README
- Code comments and JSDoc annotations

---

### Phase 6: Gap Closure (Milestone 5.0 Audit)

**Status**: ✅ Complete
**Objective**: Final architecture alignment and documentation modernization.

#### Plan 6.1: Phase 3 Gap Closure (Tracking & State)

- [x] Generate phase summaries for Plan 3.1, 3.2, 3.3
- [x] Formal verification report for Phase 3

#### Plan 6.2: Documentation Modernization

- [x] Rewrite README.md for v5 architecture
- [x] Rewrite ARCHITECTURE.md for modular data flow

#### Plan 6.3: System Hardening

- [x] Implement duplicate applicant detection
- [x] Implement Gmail quota guard
- [x] Ensure JSDoc documentation across core engines

---

### Phase 7: Gap Closure

**Status**: ✅ Complete (2026-03-13)
**Objective**: Address gaps from milestone audit v5.0

**Gaps to Close:**

- [ ] 7.1: Update ROADMAP.md consistency
- [ ] 7.2: Fix Bug in ListaFinal generation
- [ ] 7.3: Add new email category and deadline for "hand picked" applicants
