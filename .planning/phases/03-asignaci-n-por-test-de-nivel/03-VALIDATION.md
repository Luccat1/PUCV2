---
phase: 3
slug: asignaci-n-por-test-de-nivel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | GAS editor-runnable test functions (no external runner) |
| **Config file** | None — tests are GAS functions run from the Apps Script editor |
| **Quick run command** | Select function name in GAS editor → click Run → check Executions log |
| **Full suite command** | Run each `test*` function in `TestRechazoPorNivel.ts` individually in GAS editor |
| **Estimated runtime** | ~30–60 seconds per function (GAS execution) |

---

## Sampling Rate

- **After every task commit:** Run the relevant `test*` function for that task in GAS editor
- **After every plan wave:** Run all Phase 3 test functions in `TestRechazoPorNivel.ts`
- **Before `/gsd:verify-work`:** All test functions must log OK
- **Max feedback latency:** ~60 seconds per test run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | Wave 0 | 0 | NIVEL-01,02,03,04,05,06 | unit | `testGenerarListaFinal_NivelValido()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-01-xx | 01 | 1 | NIVEL-01,02 | integration | `testGenerarListaFinal_NivelValido()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-01-xx | 01 | 1 | NIVEL-03 | integration | `testGenerarListaFinal_NivelInsuficiente()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-01-xx | 01 | 1 | NIVEL-04 | integration | `testGenerarListaFinal_SinResultado()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-02-xx | 02 | 1 | NIVEL-05 | unit | `testRenderCorreoInicioClases_FraseNivel()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-03-xx | 03 | 2 | NIVEL-06 | integration | `testEnviarCorreosRechazoPorNivel_Idempotencia()` in GAS editor | ❌ W0 | ⬜ pending |
| 3-04-xx | 04 | 2 | NIVEL-07 | manual | Open spreadsheet, verify menu item visible | manual-only | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/TestRechazoPorNivel.ts` — stubs for NIVEL-01 through NIVEL-06 test functions:
  - `testGenerarListaFinal_NivelValido()` — verifies NIVEL-01, NIVEL-02
  - `testGenerarListaFinal_NivelInsuficiente()` — verifies NIVEL-03
  - `testGenerarListaFinal_SinResultado()` — verifies NIVEL-04
  - `testRenderCorreoInicioClases_FraseNivel()` — verifies NIVEL-05
  - `testEnviarCorreosRechazoPorNivel_Idempotencia()` — verifies NIVEL-06
- [ ] Manual deployment reminder: `src/CorreoRechazoPorNivel.html` must be copied to `PUCV2English/` (HTML files are NOT copied by `npm run build`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Menú "❌ Rechazo por Nivel Insuficiente" visible | NIVEL-07 | GAS menu registration cannot be tested without a live Spreadsheet | Open spreadsheet → Extensions > PUCV2English > Enviar Correos → confirm item appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
