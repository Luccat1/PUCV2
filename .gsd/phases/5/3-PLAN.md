---
phase: 5
plan: 3
wave: 2
---

# Plan 5.3: TODO Resolution + ROADMAP Finalization + Milestone Close

## Objective

Resolve all remaining TODO items, update the ROADMAP to reflect accurate completion status, update the ARCHITECTURE.md technical debt list to remove items already addressed, and prepare the milestone for formal closure.

## Context

- .gsd/TODO.md (5 pending items, several already resolved by Phase 6)
- .gsd/ROADMAP.md (Phase 3 checkboxes in "Gaps" section are stale)
- .gsd/ARCHITECTURE.md (technical debt item about Email Quota Guard was resolved)
- .gsd/AUDIT.md (current audit report)

## Tasks

<task type="auto">
  <name>Resolve TODO.md and update ROADMAP.md</name>
  <files>.gsd/TODO.md, .gsd/ROADMAP.md, .gsd/ARCHITECTURE.md</files>
  <action>
    1. In TODO.md:
       - Mark "Verify GAS email quota limits" as resolved (implemented in Phase 6)
       - Mark "Actualizar los setup READMEs" as resolved (Phase 6)
       - Mark "Phase 3 verification" as resolved (Phase 6)
       - Mark "ROADMAP.md consistency" as in-progress (this task)
       - Mark/update "Phase 5 execution" status

    2. In ROADMAP.md:
       - Update Phase 5 status to "✅ Complete" (after this plan executes)
       - Update the "Gaps to Close" section under Phase 6 to mark all items as complete
       - Ensure the "Current Phase" line at the top reflects the milestone state

    3. In ARCHITECTURE.md:
       - Mark "Email Quota Guard" technical debt as resolved (✅)
       - Keep remaining items (Tests, Cache, Error UI) as open debt for future milestones

    IMPORTANT:
    - This is the FINAL documentation pass for v5.0
    - Do NOT change any source code in this task
  </action>
  <verify>grep -c "\[x\]" .gsd/TODO.md (should show most items resolved); cat .gsd/ROADMAP.md | head -5</verify>
  <done>TODO.md reflects current state. ROADMAP.md shows accurate phase statuses. ARCHITECTURE.md debt list is current.</done>
</task>

<task type="auto">
  <name>Final git commit and milestone summary</name>
  <files>.gsd/STATE.md</files>
  <action>
    1. Update STATE.md with final milestone summary
    2. Stage all .gsd/ changes
    3. Commit with message "docs(milestone): finalize v5.0 — all phases complete"

    IMPORTANT:
    - This commit should be the last one for Milestone v5.0
  </action>
  <verify>git log --oneline -5 (shows final commit)</verify>
  <done>Clean commit history. STATE.md reflects milestone completion.</done>
</task>

## Success Criteria

- [ ] All TODO items resolved or explicitly deferred
- [ ] ROADMAP shows 5/6 phases complete (Phase 5 included) + Phase 6 complete
- [ ] ARCHITECTURE.md technical debt is accurate
- [ ] Clean final commit for milestone v5.0
