# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**
- TypeScript 5.7.3 - All core application logic, modular architecture

**Secondary:**
- HTML 5 - Email templates and Web App UI
- JavaScript (compiled from TypeScript) - Runtime execution in Google Apps Script

## Runtime

**Environment:**
- Google Apps Script V8 Runtime
- Container-bound to Google Sheets (no standalone deployment)

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Google Apps Script (built-in) - Server-side execution within Google Sheets/Gmail environment
- No frontend framework (HTML/CSS only for emails and dashboards)

**Testing:**
- None (manual testing in Google Apps Script editor's Execution panel)

**Build/Dev:**
- TypeScript Compiler (tsc) 5.7.3 - Compiles `src/tsconfig.json` → `dist/`
- @google/clasp 2.4.2 - Google Apps Script deployment tool (listed in package-lock.json but removed from current project)

## Key Dependencies

**Critical:**
- @types/google-apps-script 1.0.98 - Type definitions for GAS APIs (SpreadsheetApp, GmailApp, HtmlService, etc.)
- typescript 5.7.3 - TypeScript compiler for modular compilation

## Configuration

**Environment:**
- Container-bound: Script is attached to a Google Sheets file, not standalone
- No `.env` file (uses Google Apps Script Properties Service for configuration)
- Application configuration via `CONFIG` constant in `src/Config.ts`:
  - Sheet names (INPUT, OUTPUT, DASHBOARD, CONFIG, SELECTED, FINAL_LIST)
  - Column headers
  - Web App URL (manually set in `CONFIG.WEB_APP_URL`)

**Build:**
- `src/tsconfig.json` - TypeScript compilation config
  - Target: ESNext
  - Module: None (compiles to single Google Apps Script-compatible output)
  - Strict mode enabled
  - Resolves types from `@types/google-apps-script`
- `src/appsscript.json` - Google Apps Script manifest:
  - Runtime: V8
  - Timezone: America/Santiago
  - Exception logging: STACKDRIVER (Google Cloud)
  - Web app execution: USER_DEPLOYING, access: ANYONE
  - No external dependencies declared

## Platform Requirements

**Development:**
- Node.js with npm (for TypeScript compilation)
- Git Bash shell (project uses Unix paths on Windows)
- Google account with Sheets/Gmail access
- Manual deployment: Copy compiled `.js` file content into Google Apps Script editor

**Production:**
- Google Sheets document (container-bound)
- Gmail account for sending notifications
- Google Drive for file attachments and logs

---

*Stack analysis: 2026-03-19*
