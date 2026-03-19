# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Google Apps Script Native APIs:**
- GmailApp - Send emails with HTML templates to applicants
  - Used in: `src/Correos.ts` (sendEmailBatch, sendTestEmail)
  - Quota tracking: Checks `GmailApp.getRemainingDailyQuota()` before batch sends
  - Email categories: SELECTED, TEST_LEVEL_ONLY, HAND_PICKED, WAITLIST, NO_SELECTED
- SpreadsheetApp - Read/write to Google Sheets data
  - Used throughout: `src/Config.ts`, `src/Evaluacion.ts`, `src/ListaFinal.ts`, `src/WebApp.ts`, `src/Dashboard.ts`
  - Operations: Read form responses, write scores, update statuses
- HtmlService - Render HTML templates for emails and Web App UI
  - Email templates: `src/CorreoSeleccionado.html`, `src/CorreoTestNivel.html`, `src/CorreoHandPicked.html`, `src/CorreoListaEspera.html`, `src/CorreoNoSeleccionado.html`
  - Dashboard: `src/index.html`
  - Sidebars: `src/SidebarConfig.html`, `src/SidebarRevision.html`
  - Template variable injection via HtmlService.createTemplateFromFile()
- PropertiesService - Store tokens, logs, and configuration
  - Script Properties: Store one-time use tokens for applicant actions (accept/reject)
  - User Properties: Store Web App logs temporarily
  - Used in: `src/WebApp.ts` (generarToken, procesarAccionPostulante)
- ScriptApp - Access deployed Web App URL and manage permissions
  - Used in: `src/WebApp.ts` for generating applicant confirmation links
  - Used in: `src/Menu.ts` for permission forcing
- LockService - Synchronize concurrent token generation
  - Used in: `src/WebApp.ts` (generarToken) with 10-second timeout
- Utilities - Generate UUIDs for applicant tokens
  - Used in: `src/WebApp.ts` (Utilities.getUuid())
- MailApp - Check remaining daily email quota (legacy, superseded by GmailApp)
  - Used in: `src/Correos.ts` for quota validation

## Data Storage

**Databases:**
- Google Sheets (container-bound)
  - Connection: Auto via SpreadsheetApp.getActiveSpreadsheet()
  - Client: SpreadsheetApp (native GAS API)
  - Sheets used:
    - "Respuestas de formulario 1" - Form submissions input
    - "Evaluación automatizada" - Computed scores and initial filtering
    - "Seleccionados" - Selected applicants with verification and assignment
    - "Lista Final Curso" - Final enrollment list
    - "Dashboard" - Computed statistics (written by script)
    - "Configuración" - Scoring parameters (editable by users)

**File Storage:**
- Google Drive - Attachment URLs stored in spreadsheet cells
  - Certificate attachments: Referenced in CERTIFICATE_ATTACHMENT column
  - Letter of support: Referenced in ENDORSEMENT_LETTER column
  - Integration: Files are URLs in cells, not directly accessed by script

**Caching:**
- None (PropertiesService used only for tokens and logs, not cache)

## Authentication & Identity

**Auth Provider:**
- Google OAuth2 (implicit - GAS handles authorization)
  - Permissions required: SpreadsheetApp, GmailApp, HtmlService
  - User executing script: Must have Editor access to the Sheet and Gmail send rights
  - Applicant confirmation: Token-based one-time URLs
    - Token storage: PropertiesService.getScriptProperties()
    - Token format: UUID (Utilities.getUuid())
    - Used in: `src/WebApp.ts` functions obtenerUrlConfirmacion(), procesarAccionPostulante()

## Monitoring & Observability

**Error Tracking:**
- Google Stackdriver - Exception logging
  - Configured in `src/appsscript.json`: "exceptionLogging": "STACKDRIVER"
  - Errors automatically logged by Google Apps Script runtime

**Logs:**
- PropertiesService User Properties - Temporary Web App logs
  - Function: `logToWebApp()` in `src/Utils.ts` appends timestamped messages
  - Function: `getWebAppLogs()` retrieves and clears logs for display in dashboard
  - Cleared after each Web App request
- Console: Manual testing uses GAS editor Execution panel

## CI/CD & Deployment

**Hosting:**
- Google Apps Script (deployed to Google Sheets)
- Web App endpoint: Deployed via Extensions > Apps Script > New Deployment
- Execution model: Container-bound to single Google Sheets file

**CI Pipeline:**
- None (manual deployment)
- Build process: `npm run build` → TypeScript compilation to `dist/`
- Deployment: Manual copy-paste of compiled JavaScript into GAS editor
- No automated tests or deployment pipeline

## Environment Configuration

**Required env vars:**
- None (GAS uses OAuth2 implicitly)
- Manual configuration in `src/Config.ts`:
  - `CONFIG.WEB_APP_URL` - Published Web App URL (optional, auto-detected if blank)
  - Sheet names in `CONFIG.SHEETS`
  - Column mappings in `CONFIG.COLUMNS`
  - Scoring parameters in `DEFAULT_SCORING_PARAMS` (can be overridden via Configuración sheet)

**Secrets location:**
- No external secrets required
- Sensitive data (spreadsheet structure, email lists) stored in the Sheet itself
- One-time tokens: Stored in Script Properties (encrypted by Google)

## Webhooks & Callbacks

**Incoming:**
- Web App doGet endpoint - Serves dashboard and processes applicant actions
  - URL format: `{PUBLISHED_WEB_APP_URL}?action={accept|reject}&token={UUID}`
  - Used for: Accept/reject confirmation links sent via email
  - Handler: `src/WebApp.ts` doGet() → procesarAccionPostulante()
  - Idempotency: One-time use tokens (deleted after use)

**Outgoing:**
- None (script only sends emails via GmailApp, no webhooks to external services)

## Email Configuration

**Send Service:**
- GmailApp - Native Google Apps Script email API
- Sender: Email of the user executing the script
- Subject templates: Hardcoded in `src/Correos.ts`
- HTML body: Rendered from template files using HtmlService
- Email templates contain:
  - Applicant name, assigned level, program dates/schedules
  - Confirmation links (for SELECTED and HAND_PICKED categories)
  - Program information and contact details

---

*Integration audit: 2026-03-19*
