# Phase 3 Research — Email System

## Discovery Level: 1 (Quick Verification)

All work uses native GAS APIs (no new external libraries). Confirmed patterns:

### 1. Token-Based Accept/Reject Links

**Approach:** Generate a UUID per applicant via `Utilities.getUuid()`, store the mapping `token → email` in `PropertiesService.getScriptProperties()` (persistent across executions, shared by all users).

**URL format:**

```
https://script.google.com/.../exec?action=accept&token=abc123
https://script.google.com/.../exec?action=reject&token=abc123
```

**doGet routing:** Check `e.parameter.action` — if present, handle accept/reject; otherwise serve dashboard (`index.html`).

**Access:** `appsscript.json` must change from `"access": "MYSELF"` to `"access": "ANYONE"` so applicants can click the link without a Google login. `executeAs` stays as `USER_DEPLOYING` for write access to sheets.

**Security:** Tokens are UUIDs (unguessable), single-use (deleted after processing), and expire naturally when the cycle ends. No sensitive data is exposed in the URL — the action only marks a status.

### 2. State Machine

```
Pendiente → Seleccionado → Notificado → Acepta/Rechaza → [Excluido]
                                         ↓ (Rechaza)
                                    Lista de Espera → Notificado (promoted)
```

**Storage:** New column "Estado" in `Seleccionados` sheet, replaces current "Aceptación" column behavior. Add "Notificado" timestamp column.

**Tracking "notificado":** Set timestamp in a "Fecha Notificación" column when email is sent. `getRecipients()` filters out rows where this column is non-empty (already notified).

### 3. Batch Sending Expansion

Current `getRecipients()` only handles SELECTED and TEST_LEVEL_ONLY. Needs:

- WAITLIST: reads from Evaluación automatizada (rank > 25 but within threshold)
- NO_SELECTED: reads from Evaluación automatizada (below threshold)
- Each type uses its own HTML template

### 4. Waitlist Auto-Promotion

`gestionarListaDeEspera()` is currently a stub. Needs:

- Detect "Rechaza" status change in `Seleccionados`
- Find next candidate from Evaluación (rank 26, 27, etc.)
- Add them to Seleccionados sheet
- Mark original applicant as "Excluido"

### 5. Confirmation Page HTML

A simple HTML page served by `doGet` when `action` parameter is present:

- Shows PUCV branding
- Displays "Gracias por confirmar" or "Lamentamos tu decisión"
- No JavaScript required (static HTML response)

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | `ScriptProperties` | Persistent, shared, simple key-value |
| Token generation | `Utilities.getUuid()` | Native, cryptographically random enough |
| Web app access | ANYONE | Applicants don't have Google accounts necessarily |
| Notificado tracking | Timestamp column | Idempotent — can re-run without double-sending |
| Confirmation page | Inline HTML via `doGet` | No extra file needed, simple response |
