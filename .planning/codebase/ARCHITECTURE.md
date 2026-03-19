# Architecture

## Pattern

**Modular TypeScript → Google Apps Script (Container-bound)**

The codebase is a container-bound GAS script attached to a Google Sheets spreadsheet. TypeScript source files are compiled into a single bundled JS file deployed to GAS. All application logic runs server-side in the GAS runtime.

## Layers

```
User (Google Sheets UI)
    ↓
Menu / Dialogs / Sidebars (Menu.ts, HTML files)
    ↓
Business Logic Modules (Evaluacion, Seleccionados, Correos, Dashboard, ListaFinal)
    ↓
Configuration Layer (Config.ts — centralizes sheet names, column headers, scoring params)
    ↓
Utilities (Utils.ts — shared helpers)
    ↓
GAS APIs (SpreadsheetApp, GmailApp, HtmlService, ScriptApp, UrlFetchApp)
    ↓
Google Sheets (6 sheets: Input, Output, Dashboard, Config, Selected, Final List)
```

## Entry Points

- **`onOpen()`** (`src/Menu.ts`) — triggered on spreadsheet open, builds the custom menu
- **`doGet(e)`** (`src/WebApp.ts`) — HTTP GET handler for the published web app (dashboard + applicant confirmations)
- **`doPost(e)`** (`src/WebApp.ts`) — HTTP POST handler for web app actions

## Core Modules

| Module | File | Responsibility |
|--------|------|----------------|
| Config | `src/Config.ts` | All constants: sheet names, column headers, scoring weights, program dates |
| Menu | `src/Menu.ts` | Custom GAS menu, dialog/sidebar launchers, menu action wrappers |
| Evaluacion | `src/Evaluacion.ts` | Automated scoring engine — reads Input sheet, writes scored Output sheet |
| Seleccionados | `src/Seleccionados.ts` | Ranking and Top-25 selection logic — reads Output, writes Seleccionados sheet |
| Correos | `src/Correos.ts` | Email batch sending (selected, waitlist, rejected, test-level, hand-picked) |
| Dashboard | `src/Dashboard.ts` | Statistics aggregation — reads Output, writes Dashboard sheet |
| ListaFinal | `src/ListaFinal.ts` | Final course roster generation from Seleccionados sheet |
| WebApp | `src/WebApp.ts` | HTTP handlers for published web app — dashboard view + one-time token confirmations |
| Utils | `src/Utils.ts` | Shared helpers (normalization, string matching, token generation) |

## Data Flow

```
Google Form submission
    → "Respuestas de formulario 1" sheet (Input)
    → Evaluacion.ts: scores each applicant, writes to "Evaluación automatizada" (Output)
    → Seleccionados.ts: ranks Output, selects top-25, writes to "Seleccionados" sheet
    → Correos.ts: sends email batches (Selected / Waitlist / Rejected) from Seleccionados
    → ListaFinal.ts: generates "Lista Final Curso" from confirmed acceptances
    → Dashboard.ts: aggregates Output stats → "Dashboard" sheet
    → WebApp.ts: serves dashboard HTML + handles applicant acceptance/rejection tokens
```

## Web Interface

- `doGet(e)` serves a dashboard HTML page via `HtmlService`
- One-time tokens generated per applicant for acceptance/rejection confirmations
- Sidebars (`SidebarConfig`, `SidebarRevision`) rendered via `HtmlService.createHtmlOutputFromFile`
- Modal dialogs for evaluation confirmation (`DialogConfirmEval`) and test emails

## Key Design Decisions

- **Container-bound** — no `SHEET_ID` needed; uses `SpreadsheetApp.getActiveSpreadsheet()`
- **CONFIG object** — all sheet names and column headers in one place; prevents hardcoded strings
- **SCORING_PARAMS** — mutable clone of `DEFAULT_SCORING_PARAMS`; can be overridden at runtime from the Config sheet
- **PROGRAM_DATA** — dates/schedules configurable from sheet without code changes
- **TypeScript → single bundle** — compiled via `npm run build` into `PUCV2English/PUCV2.js`

## Abstractions

- `IConfig` — typed config interface for sheet/column names
- `IProgramData` — program-specific dates and schedules
- `IScoringParams` — weighted scoring algorithm configuration
- `IApplicantResult` — structured applicant evaluation result
- `IStatistics` — aggregated statistics shape for dashboard
