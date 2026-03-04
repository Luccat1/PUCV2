---
phase: 4
plan: 3
wave: 2
---

# Plan 4.3: Real-Time Log Panel + Polish + Responsive Tuning

## Objective

Improve the real-time log output panel, add loading states/animations, and finalize responsive design across all screen sizes. This is the final polish plan before Phase 4 verification.

## Context

- src/index.html (after Plan 4.2 changes)
- src/WebApp.ts
- src/Utils.ts (logToWebApp, getWebAppLogs)

## Tasks

<task type="auto">
  <name>Enhance real-time log panel</name>
  <files>src/index.html</files>
  <action>
    Redesign the log output from a simple div to a styled terminal-like panel:

    1. Style the log area as a dark terminal (dark bg, monospace font, green/white text)
    2. Add auto-scroll behavior (scroll to bottom on new logs)
    3. Add a "Limpiar Logs" (clear) button
    4. Add timestamp prefix to each log line (client-side)
    5. Make the log panel collapsible (toggle button) — shown by default when operations running
    6. Position as a fixed/sticky footer panel that doesn't interfere with scrolling
    
    CSS for terminal panel:
    ```css
    .log-panel {
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      border-radius: 8px 8px 0 0;
      max-height: 250px;
      overflow-y: auto;
    }
    ```
    
    WHAT TO AVOID:
    - Do NOT change the fetchLogs() or appendLogs() server interaction — only style the output
    - Do NOT import JetBrains Mono from CDN (use Courier New fallback only)
  </action>
  <verify>clasp push → run evaluation → verify logs appear in styled terminal with auto-scroll</verify>
  <done>Log panel styled as terminal, auto-scrolls, has clear button, collapsible</done>
</task>

<task type="auto">
  <name>Add loading animations and micro-interactions</name>
  <files>src/index.html</files>
  <action>
    1. Add CSS spinner animation for the loading state (replace text "Procesando...")
    2. Add skeleton loading placeholders for KPI cards and tables while data loads
    3. Add button ripple/press effects on click
    4. Add smooth fade transition when switching tabs (opacity animation)
    5. Add success/error toast notifications instead of raw text in output div

    Spinner CSS:
    ```css
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner {
      width: 24px; height: 24px;
      border: 3px solid #ddd;
      border-top-color: #0055a2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    ```
    
    WHAT TO AVOID:
    - Do NOT add external animation libraries
    - Keep animations subtle and performant (use transform/opacity only)
  </action>
  <verify>clasp push → trigger loading states → verify spinner shows, skeletons display, transitions smooth</verify>
  <done>Loading spinner replaces text, skeleton placeholders show, tab transitions are smooth, button interactions feel polished</done>
</task>

## Success Criteria

- [ ] Log panel has terminal styling with auto-scroll
- [ ] Loading states use spinner animation
- [ ] Tab switching uses fade transition
- [ ] Buttons have hover/active micro-interactions
- [ ] UI is responsive and functional at 360px, 768px, 1200px widths
