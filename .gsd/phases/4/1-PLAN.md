---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: Dashboard Data API Enhancement

## Objective

Enrich the `getSelectionData()` function in `WebApp.ts` to return all the data the redesigned dashboard needs: full statistics, detailed score breakdowns, seat state counts, and waitlist data. Currently it returns minimal raw objects — the new version must provide structured, dashboard-ready payloads so the client has zero calculation burden.

## Context

- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- src/WebApp.ts (getSelectionData — lines 65-91)
- src/Dashboard.ts (calcularEstadisticas — lines 6-79)
- src/Config.ts (IStatistics interface — lines 90-99)
- src/Evaluacion.ts (getAnalysisReport — line 357)
- src/Seleccionados.ts (generarHojaSeleccionados — lines 6-70)

## Tasks

<task type="auto">
  <name>Enrich getSelectionData() response payload</name>
  <files>src/WebApp.ts</files>
  <action>
    Refactor `getSelectionData()` to return a comprehensive object:

    ```typescript
    {
      seleccionados: Array<{
        ranking: number,
        nombre: string,
        apellidos: string,
        correo: string,
        puntaje: number,
        enlaceCertificado: string,
        verificacion: string,
        nivel: string,
        aceptacion: string,
        fechaNotificacion: string | null
      }>,
      listaDeEspera: Array<{
        nombre: string,
        apellidos: string,
        correo: string,
        puntaje: number
      }>,
      estadisticas: {
        totalPostulantes: number,
        totalSeleccionados: number,
        puntajePromedioSeleccionados: number,
        promediosPorTipo: Record<string, number>,
        analisisDetallado: Record<string, { count: number, puntajes: Record<string, number> }>,
        seatBreakdown: {
          aceptados: number,
          pendientes: number,
          rechazados: number,
          total: number
        },
        distribucionSede: Record<string, number>,
        distribucionNivel: Record<string, number>
      }
    }
    ```
    
    Key implementation details:
    1. Read "Seleccionados" sheet and map headers to structured objects (keep existing header-mapping pattern)
    2. Compute waitlist from "Evaluación automatizada" — all applicants NOT in Seleccionados, sorted by score desc
    3. Compute seat breakdown by counting Aceptación column values
    4. Compute nivel distribution from "Nivel Asignado" column
    5. Compute sede distribution from "Sede" column in original data
    6. Reuse `calcularEstadisticas()` from Dashboard.ts for core stats
    7. Include `analisisDetallado` by calling score breakdown from Evaluacion data
    
    WHY structured objects: The current code dumps raw header-indexed arrays — the client must know column indices. Structured objects decouple the client from sheet layout changes.
    
    WHAT TO AVOID:
    - Do NOT change the function signature or name (it's called from index.html via google.script.run)
    - Do NOT remove any existing return fields — only add new ones
    - Do NOT call getAnalysisReport() inline (it returns a string, not structured data)
  </action>
  <verify>clasp push && open web app → browser console: check response shape from getSelectionData()</verify>
  <done>getSelectionData() returns seleccionados, listaDeEspera, and estadisticas with seatBreakdown, distribucionSede, distribucionNivel fields</done>
</task>

<task type="auto">
  <name>Add getDashboardStats() dedicated API function</name>
  <files>src/WebApp.ts, src/Dashboard.ts</files>
  <action>
    Create a new server function `getDashboardStats()` that returns statistics specifically for the dashboard charts independently from the table data. This allows the dashboard to refresh stats without reloading all table data.

    ```typescript
    function getDashboardStats(): object {
      // 1. Read Evaluación automatizada sheet
      // 2. Call calcularEstadisticas() 
      // 3. Read Seleccionados sheet for seat state
      // 4. Return enriched stats object
    }
    ```
    
    This function supplements getSelectionData() for cases where only chart refresh is needed.
    
    WHAT TO AVOID:
    - Do NOT duplicate logic already in calcularEstadisticas() — call it
    - Do NOT break the existing getSelectionData() flow
  </action>
  <verify>clasp push && call getDashboardStats() from browser console in deployed web app</verify>
  <done>getDashboardStats() exists and returns valid stats object with chart-ready data</done>
</task>

## Success Criteria

- [ ] getSelectionData() returns structured seleccionados with all fields
- [ ] getSelectionData() returns actual listaDeEspera data (not empty array)
- [ ] estadisticas includes seatBreakdown, distribucionSede, distribucionNivel
- [ ] getDashboardStats() function exists and returns valid stats
- [ ] TypeScript compiles without errors
