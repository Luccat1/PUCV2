---
phase: 1
slug: correo-inicio-de-clases
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual GAS execution (no local test runner — GAS runs server-side) |
| **Config file** | none — GAS runtime only |
| **Quick run command** | `npm run build` (TypeScript compile check) |
| **Full suite command** | `npm run build` + manual execution in GAS editor |
| **Estimated runtime** | ~30 seconds (build) + manual verification |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` to confirm TypeScript compiles without errors
- **After every plan wave:** Run `npm run build` + deploy to GAS + manual smoke test
- **Before `/gsd:verify-work`:** Full manual acceptance test against all 5 success criteria
- **Max feedback latency:** 30 seconds (build) / 5 minutes (manual GAS test)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| Config extension | 01 | 1 | INICIO-04, INICIO-05, INICIO-06 | compile | `npm run build` | ✅ | ⬜ pending |
| InicioClases.ts | 01 | 1 | INICIO-03, INICIO-04, INICIO-05, INICIO-06 | compile + manual | `npm run build` | ❌ W0 | ⬜ pending |
| DialogSalas.html | 01 | 1 | INICIO-01, INICIO-02 | manual | manual in GAS | ❌ W0 | ⬜ pending |
| CorreoInicioClases.html | 01 | 1 | INICIO-04 | manual | manual in GAS | ❌ W0 | ⬜ pending |
| Menu wiring + QUAL-01 | 01 | 2 | INICIO-07, QUAL-01 | compile + manual | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/InicioClases.ts` — stub file created so build passes from wave 1 start
- [ ] `PUCV2English/DialogSalas.html` — placeholder HTML created
- [ ] `PUCV2English/CorreoInicioClases.html` — placeholder email template created

*All other infrastructure (tsconfig.json, npm run build, existing GAS patterns) already in place.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dialog shows correct active levels | INICIO-01 | GAS UI only testable in browser | Deploy to GAS, open "Enviar Correos > Inicio de Clases", verify dialog shows all levels that have recipients in Lista Final |
| Confirmation screen shows nivel→sala mapping | INICIO-02 | GAS UI interaction | Enter sala for each level, verify confirmation dialog shows complete nivel→sala table before sending |
| Email received with correct content | INICIO-04 | Requires live Gmail send | Send test email, verify it contains nombre, nivel, horario (cátedra + ayudantía), sala, and FECHA_INICIO/FECHA_TERMINO |
| Sala written to Lista Final row | INICIO-05 | Requires live spreadsheet state | After send, verify "Sala" column populated for each notified student |
| Idempotency: second run skips notified | INICIO-06 | Requires two sequential runs | Run send twice; verify second run logs 0 sent and "Notificado Inicio" column unchanged |
| Menu item reachable | INICIO-07 | GAS UI only | Open sheet, verify "Enviar Correos" submenu contains "Inicio de Clases" item |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (build) / 5min (manual)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
