# Summary: Plan 7.3 - Add hand picked email category

## Changes
- Created `PUCV2English/CorreoHandPicked.html` template.
  - Includes institutional branding.
  - Implements Accept/Reject buttons with tokenized links (ADR-003 style).
  - Uses dynamic variables for `nombre`, `nivel`, `fechaLimite`, and `programData`.
- Updated `src/Correos.ts`:
  - `getRecipients` now supports `HAND_PICKED` type, filtering by `Verificación Certificado === 'Hand picked'`.
  - `sendEmailBatch` handles the `HAND_PICKED` template and ensures buttons are populated.
- Updated `src/Menu.ts`:
  - Added "Hand Picked (Extratemporáneos)" option under the "Enviar Correos" sub-menu.
  - Added `enviarCorreosHandPicked` wrapper function.

## Verification
- Code review of logic flow.
- Verified template variable names match the `HtmlService` property assignment.
