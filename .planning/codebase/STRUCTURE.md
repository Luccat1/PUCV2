# Structure

## Directory Layout

```
PUCV2/
├── src/                        # TypeScript source (compile target)
│   ├── Config.ts               # All constants, interfaces, scoring params
│   ├── Menu.ts                 # GAS menu + dialog/sidebar launchers
│   ├── Evaluacion.ts           # Scoring engine
│   ├── Seleccionados.ts        # Ranking and selection logic
│   ├── Correos.ts              # Email sending (all types)
│   ├── Dashboard.ts            # Statistics aggregation
│   ├── ListaFinal.ts           # Final roster generation
│   ├── WebApp.ts               # HTTP handlers (doGet/doPost)
│   └── Utils.ts                # Shared helpers
│
├── dist/                       # Compiled JS output (from npm run build)
│   └── *.js                    # One file per src/ module
│
├── PUCV2English/               # GAS deployment folder (copy-paste to editor)
│   ├── PUCV2.js                # Single bundled JS file (~2000+ lines)
│   ├── index.html              # Dashboard web app HTML
│   ├── CorreoSeleccionado.html # Email template: selected applicant
│   ├── CorreoNoSeleccionado.html # Email template: rejected applicant
│   ├── CorreoListaEspera.html  # Email template: waitlist applicant
│   └── CorreoTestNivel.html    # Email template: level test invitation
│
├── package.json                # Build config (TypeScript compiler)
├── tsconfig.json               # TypeScript configuration
├── CHANGELOG.md                # Version history
└── .planning/                  # GSD planning directory
```

## Key Locations

| What | Where |
|------|-------|
| All configuration (sheet names, columns) | `src/Config.ts` — `CONFIG` object |
| Scoring algorithm weights | `src/Config.ts` — `DEFAULT_SCORING_PARAMS` |
| Program dates and schedules | `src/Config.ts` — `DEFAULT_PROGRAM_DATA` |
| Main menu entry point | `src/Menu.ts` — `onOpen()` |
| Web app entry point | `src/WebApp.ts` — `doGet()` / `doPost()` |
| Email templates | `PUCV2English/*.html` |
| Deployment bundle | `PUCV2English/PUCV2.js` |

## Naming Conventions

- **Files**: PascalCase matching the module name (`Evaluacion.ts`, `Config.ts`)
- **Functions**: camelCase (`evaluarPostulaciones`, `sendEmailBatch`, `generarListaFinalCurso`)
- **Interfaces**: PascalCase with `I` prefix (`IConfig`, `IApplicantResult`, `IScoringParams`)
- **Constants**: SCREAMING_SNAKE_CASE (`CONFIG`, `SCORING_PARAMS`, `DEFAULT_PROGRAM_DATA`)
- **GAS triggers**: standard names (`onOpen`, `doGet`, `doPost`)
- **Email functions**: verb + target pattern (`enviarCorreosSeleccionados`, `sendEmailBatch`)
- **Menu wrappers**: verb + noun pattern (`abrirSidebarConfig`, `ejecutarGenerarListaFinal`)

## Sheet Structure (Google Sheets tabs)

| Sheet Name (CONFIG key) | Purpose |
|------------------------|---------|
| `Respuestas de formulario 1` (INPUT) | Raw Google Form submissions |
| `Evaluación automatizada` (OUTPUT) | Scored applicant results |
| `Dashboard` (DASHBOARD) | Aggregated statistics |
| `Configuración` (CONFIG) | Runtime config overrides (scoring weights, program dates) |
| `Seleccionados` (SELECTED) | Top-25 ranked applicants + acceptance tracking |
| `Lista Final Curso` (FINAL_LIST) | Final enrolled student roster |

## Build Pipeline

```
src/*.ts
  → (tsc) →
dist/*.js
  → (bundle script) →
PUCV2English/PUCV2.js
  → (manual copy-paste) →
Google Apps Script Editor
```

Run `npm run build` to compile. Deploy by pasting `PUCV2.js` into the GAS editor.
