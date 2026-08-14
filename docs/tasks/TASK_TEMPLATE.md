---
id: TASK-XXX
title: Short bounded task title
type: technical-spike # technical-spike | spec | implementation | remediation | docs | governance
phase: TECHNICAL_SPIKES
status: DRAFT # DRAFT | READY | IN_PROGRESS | PR_OPEN | NEEDS_FIX | ACCEPTED | BLOCKED | DONE | CANCELLED
priority: P1
next: false
allowlist_mode: strict # strict | advisory
base_ref: main
depends_on: []
ci_profile: spike
risk_refs: []
decision_refs: []
---

# TASK-XXX — Short bounded task title

## 1. Goal
State exactly one observable bounded outcome.

## 2. Question / user-visible behavior
For a spike, state exact feasibility question. For implementation, state exact behavior added/changed.

## 3. Controlling context
List only canonical repo sources controlling this task (Discovery risks, Decisions IDs, approved SPEC sections). Do not paste unrelated history.

## 4. Preconditions
- [ ] task status is `READY`
- [ ] exact base ref/SHA available
- [ ] dependencies satisfy required state
- [ ] required hardware/browser/account/credentials available if applicable
- [ ] no unresolved human decision blocks task

If required precondition is false: `BLOCKED`.

## 5. In scope
- ...

## 6. Out of scope
- ...

Out-of-scope findings may be reported but not fixed.

## 7. Allowed paths
When `allowlist_mode: strict`, modifications MUST remain inside listed paths.
- `path/**`

## 8. Protected / forbidden paths
Normally:
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `.github/**`
- any other protected project paths

## 9. Dependency policy
Choose one:
- `NO_DEPENDENCY_CHANGES`
- `DEPENDENCY_CHANGES_ALLOWED_WITH_JUSTIFICATION`
- `EXACT_DEPENDENCIES_ONLY: ...`

## 10. Functional acceptance criteria
Every item objectively checkable.
- [ ] AC-01: ...
- [ ] AC-02: ...

## 11. Negative / failure acceptance
- [ ] NF-01: ...
- [ ] NF-02: ...

## 12. Validation matrix
| Case | Input/environment | Expected result | Evidence |
|---|---|---|---|
| V-01 | ... | ... | ... |

## 13. Required evidence
Tie evidence to exact task head.
- [ ] environment/version record where relevant
- [ ] raw/structured output needed to verify acceptance
- [ ] failure samples where required
- [ ] final changed-path list
- [ ] final verification output

Default path when persistent evidence is needed: `evidence/TASK-XXX/`.
Never store secrets/unnecessary private data.

## 14. CI / automated verification
`ci_profile: <profile>`

List required commands/checks that ACTUALLY EXIST. If a required verification capability does not exist, do not invent it; return BLOCKED unless task authorizes adding it.

## 15. Manual / target-environment verification
Use only when CI cannot establish behavior (real Chrome/YouTube, target Windows VieNeu, subjective naturalness, audible ducking, etc.).

## 16. Security / privacy invariants
Task-specific invariants plus defaults from `AGENTS.md`.

## 17. Stop / block conditions
Stop immediately if scope, environment, canonical contradiction, or task-size conditions make bounded completion impossible.

## 18. Deliverables
Exactly enumerate authorized outputs, normally including one bounded PR + evidence.

## 19. Audit focus
List highest-risk exact-head checks the independent auditor must emphasize.

## 20. Non-claims
Mandatory for technical spikes. State what PASS does NOT prove.

## 21. Completion rule
Executor may stop `READY_FOR_AUDIT` only when acceptance has evidence, required available verification ran, final diff is within scope, PR is current, and no known blocking defect remains. Independent exact-head ACCEPT is still required.
