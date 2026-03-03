# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v5.0

## Must-Haves (from SPEC)
- [ ] Clasp + TypeScript project structure with modular files
- [ ] Native Sheets menu with organized action items
- [ ] Sidebar for evaluation config and applicant review
- [ ] Web App dashboard with charts and management tables
- [ ] Accept/reject cupo via email link → web app endpoint
- [ ] Batch email sending by category, post-review
- [ ] Clean state separation (Seleccionado/Espera/No Seleccionado/Rechazado/Excluido)
- [ ] Automatic waitlist promotion and rejection exclusion

## Phases

### Phase 1: Foundation — Clasp + TypeScript + Modular Architecture
**Status**: ✅ Complete (2026-03-03)
**Objective**: Set up clasp project, migrate existing code to TypeScript modules, establish project structure
**Requirements**: REQ-01, REQ-02, REQ-15, REQ-16

**Deliverables:**
- `clasp.json` + `appsscript.json` configured
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
**Status**: ⬜ Not Started
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
**Status**: ⬜ Not Started
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
**Status**: ⬜ Not Started
**Objective**: End-to-end testing, edge case handling, documentation, and final cleanup

**Deliverables:**
- End-to-end test with sample data
- Edge case handling (duplicate emails, concurrent edits, quota limits)
- Updated README.md with full usage guide
- Clasp setup guide
- Code comments and JSDoc annotations
