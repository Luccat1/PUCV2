# DECISIONS.md — Architecture Decision Records

> Decisions made during project development.

## ADR-001: Use clasp + TypeScript for development
- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** The current codebase is a single 1681-line JavaScript file. Modularization is needed but GAS editor doesn't support good tooling.
- **Decision:** Use Google's clasp CLI with TypeScript for local development, type safety, and multi-file structure.
- **Consequences:** Requires one-time clasp setup. Adds a build step. Enables proper code organization and IDE support.

## ADR-002: Combo UI approach (Menu + Sidebar + Web App)
- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Need to balance convenience (in-Sheets) with capability (rich dashboard).
- **Decision:** Native Sheets menu for quick actions, HTML sidebar for configuration/review, separate web app for full dashboard.
- **Consequences:** Three UI surfaces to maintain. Best UX for different tasks.

## ADR-003: Accept/Reject cupo via web app link
- **Date:** 2026-03-03
- **Status:** Accepted
- **Context:** Gmail doesn't support interactive buttons. Postulantes currently reply "Confirmo" by email, which is manual to track.
- **Decision:** Include tokenized links in notification emails that open a mini web app confirmation page.
- **Consequences:** Need to handle the `doGet` route for accept/reject. Need token generation for security. Updates Sheet automatically.
