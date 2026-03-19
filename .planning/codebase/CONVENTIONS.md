# Coding Conventions

**Analysis Date:** 2026-03-19

## Naming Patterns

**Files:**
- PascalCase for TypeScript modules: `Config.ts`, `Evaluacion.ts`, `Correos.ts`, `Utils.ts`
- Each module represents a major functional domain
- HTML templates use FileName.html pattern: `DialogConfirmEval.html`, `SidebarConfig.html`

**Functions:**
- camelCase for regular functions: `evaluarPostulacionesPUCV2()`, `obtenerValor()`, `esSi()`
- Spanish naming conventions: `calcularPuntajeTipoPostulante()`, `generarHojaSeleccionados()`, `logToWebApp()`
- Action-oriented naming with verb prefixes: `enviar*`, `calcular*`, `generar*`, `obtener*`, `cargar*`

**Variables:**
- camelCase for locals: `resultados`, `datos`, `indiceColumnas`, `hojaEntrada`
- Abbreviated index variables: `idxCorreo`, `idxNombre`, `idxNivel`, `idxTotal`
- Type prefixes: `idx*` for array indices, `p*` for scores
- Spanish variable naming: `hojaResultados`, `datosPostulantes`, `correosProcesados`

**Types and Interfaces:**
- PascalCase with I prefix: `IConfig`, `IApplicantResult`, `IScoringParams`, `IStatistics`, `IProgramData`
- Interface properties use camelCase: `apellido`, `nombre`, `correo`, `puntajes`, `enlaceCertificado`

**Constants:**
- UPPER_SNAKE_CASE: `CONFIG`, `DEFAULT_SCORING_PARAMS`, `DEFAULT_PROGRAM_DATA`

## Code Style

**Formatting:**
- 2-space indentation
- Semicolons consistently used
- Curly braces on same line

**Linting:**
- No ESLint or Prettier detected
- TypeScript strict mode in `src/tsconfig.json`:
  - `strict: true`
  - `noImplicitAny: true`
  - `esModuleInterop: true`

## Import Organization

**Pattern:**
- No explicit imports (Google Apps Script global scope)
- Functions call each other by name directly
- Config accessed via global `CONFIG` constant
- Sheet names via `CONFIG.SHEETS.*`
- Column headers via `CONFIG.COLUMNS.*`

**Module Structure:**
- Each `.ts` file represents a logical domain
- Shared utilities in `src/Utils.ts`
- Configuration centralized in `src/Config.ts`

## Error Handling

**Patterns:**
- Try-catch blocks at operation boundaries
- Errors logged via `logToWebApp()` in `src/Utils.ts`
- Error messages returned as strings to UI
- Sheet retrieval with null-check: `if (!hoja) throw new Error("mensaje")`
- Early returns for validation failures

## Logging

**Framework:** `logToWebApp()` utility function

**Patterns:**
- Messages stored in user properties
- Timestamp added automatically
- Progress tracking during long operations
- Cleared after Web App retrieval

## Comments

**When to Comment:**
- File header with `@file` JSDoc tag
- Function documentation with JSDoc blocks
- Complex scoring logic with inline comments
- Edge cases and workarounds

**JSDoc Usage:**
- Consistent JSDoc for all public functions
- `@param` tags for parameters
- `@returns` tags for return types
- `@file` tags at module start
- English documentation

## Function Design

**Size Guideline:**
- Utilities: 5-50 lines (e.g., `esSi()`, `esEstudiante()`)
- Mid-sized: 40-100 lines (e.g., `calcularPuntajeUsoIngles()`)
- Orchestrators: 100+ lines (e.g., `evaluarPostulacionesPUCV2()` at 469 lines)

**Parameters:**
- Row data as `any[][]` arrays with column index mappings
- Global `CONFIG` and `SCORING_PARAMS` references
- TypeScript interfaces for complex types

**Return Values:**
- String for status messages
- Object for complex data structures
- Boolean for validation
- Void for side-effect operations
- `any[][]` for spreadsheet collections

## Module Design

**Exports:**
- All functions global (Google Apps Script style)
- No explicit module exports
- Global state: `CONFIG`, `SCORING_PARAMS`, `PROGRAM_DATA`

**File Organization:**

- `src/Config.ts` - Configuration and interfaces (214 lines)
- `src/Utils.ts` - Utility functions (94 lines)
- `src/Evaluacion.ts` - Scoring engine (469 lines)
- `src/Correos.ts` - Email sending (178 lines)
- `src/Seleccionados.ts` - Selected applicants (148 lines)
- `src/Dashboard.ts` - Statistics (185 lines)
- `src/ListaFinal.ts` - Final list generation (71 lines)
- `src/Menu.ts` - UI menu handlers (130 lines)
- `src/WebApp.ts` - Web interface handlers (424 lines)

## Type System

**TypeScript Strictness:**
- `strict: true` and `noImplicitAny: true` enforced
- Explicit parameter types
- Interface usage for complex data
- Type annotations on configuration objects
- `any[]` for spreadsheet rows (standard GAS pattern)

---

*Convention analysis: 2026-03-19*
