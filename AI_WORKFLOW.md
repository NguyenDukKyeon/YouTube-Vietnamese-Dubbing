# AI_WORKFLOW.md

Version: 1.0

## 1. Goal

Use GitHub as persistent project memory so ordinary ChatGPT + local Antigravity can execute bounded work with minimal prompting while preserving independent verification.

Normal human interaction per task:
1. one EXECUTE prompt;
2. one fresh AUDIT prompt;
3. FIX + RE-AUDIT only if needed.

## 2. Roles

### HUMAN OWNER
Owns product intent, scope, trade-offs, residual-risk acceptance, SPEC approval, UX acceptance, release and merge authority.

### EXECUTOR
Ordinary ChatGPT/Antigravity session with repo + local environment access. Owns fresh-reading repo/task context, bounded coding/spike work, in-scope debugging, local verification, evidence, branch/PR creation. Does not own independent acceptance, scope expansion, or merge authority.

### CI
Provides deterministic automated evidence defined by `docs/CI_PROTOCOL.md`. CI is evidence, not product approval.

### INDEPENDENT AUDITOR
Prefer a fresh Sol High session. Owns exact-head review, scope/acceptance/evidence/CI verification and task-relevant regression/security review. Does not edit or merge.

## 3. Phase machine

`BRAINSTORM → DISCOVERY → TECHNICAL_SPIKES → SPEC → IMPLEMENTATION → FINAL_QA → RELEASE`

No agent advances phase merely because its own task passed. Phase advancement requires a human-approved gate recorded canonically.

Current gate before SPEC:
- architecture-breaking P0 unknowns resolved/rejected/explicitly isolated;
- architecture-relevant P1 risks resolved or isolated behind stable boundaries.

## 4. Task lifecycle

Allowed statuses:
`DRAFT`, `READY`, `IN_PROGRESS`, `PR_OPEN`, `NEEDS_FIX`, `ACCEPTED`, `BLOCKED`, `DONE`, `CANCELLED`.

Only `READY` tasks may execute. `docs/tasks/QUEUE.md` is a routing index; each manifest is authoritative for semantics.

## 5. One-task rule

One bounded task must fit one coherent PR. If not: `BLOCKED — TASK_TOO_LARGE`; decompose before implementation. Never silently split or broaden while coding.

## 6. EXECUTE flow

1. Read mandatory files from `AGENTS.md`.
2. Resolve explicit task ID or the single `NEXT` + `READY` task in queue.
3. Verify status/preconditions/dependencies.
4. Fresh-read canonical base and relevant code/tests.
5. Create bounded branch from correct base.
6. Implement only manifest scope.
7. Run applicable verification that actually exists.
8. Debug only introduced in-scope failures.
9. Inspect final diff and paths.
10. Produce required evidence.
11. Push and open/update PR using `.github/pull_request_template.md`.
12. Inspect available CI; fix introduced in-scope CI failures when possible.
13. Stop with `READY_FOR_AUDIT`, `BLOCKED`, or `FAILED`.

Never merge.

## 7. AUDIT flow

Use a fresh session when practical.

1. Read governance + controlling manifest.
2. Fresh-fetch PR metadata.
3. Record exact current base/head SHA.
4. Fresh-read changed paths and raw diff.
5. Verify strict path scope.
6. Fresh-read required evidence.
7. Fresh-read CI/check results.
8. Evaluate every acceptance/negative predicate.
9. Check task-relevant regressions/security/privacy.
10. Ignore PR/author summary unless independently verified.
11. Return exactly `ACCEPT`, `REJECT`, or `BLOCKED` with concrete evidence.
12. Persist verdict to PR when capability allows.
13. Stop. Do not fix or merge.

Any head change invalidates prior ACCEPT.

## 8. REMEDIATION flow

Triggered only by REJECT. Executor fresh-reads current head and exact findings, fixes only those findings within controlling scope, reruns affected + mandatory verification, updates evidence and the same PR, then stops `READY_FOR_AUDIT`. Fresh re-audit is required.

## 9. Human merge gate

Merge only when current exact head has independent ACCEPT, required CI is current/green, required manual/UX checks are complete, and no newer commit invalidated audit.

## 10. Minimal prompts

### EXECUTE explicit task
`Repo NguyenDukKyeon/YouTube-Vietnamese-Dubbing. Execute <TASK_ID> strictly under repo governance and its controlling manifest. Use the local Antigravity environment for required target/browser evidence, create/update one bounded branch/PR, verify evidence/CI, then STOP. Do not merge.`

### EXECUTE next task
`Repo NguyenDukKyeon/YouTube-Vietnamese-Dubbing. Execute the single NEXT READY task according to repo governance. Use Antigravity/local target environment where required, create/update one bounded branch/PR, verify evidence/CI, then STOP. Do not merge.`

### AUDIT
`Independently fresh-audit PR #<PR> in NguyenDukKyeon/YouTube-Vietnamese-Dubbing against AGENTS.md and its controlling task manifest. Verify exact current base/head, raw diff, changed paths, evidence and CI. Do not trust author/PR summaries. Persist/return only ACCEPT, REJECT or BLOCKED with concrete findings. Do not modify or merge.`

### FIX
`Remediate only the current independent audit findings on PR #<PR> under its controlling task manifest. Preserve scope, rerun affected verification/CI, update evidence, and STOP. Do not merge.`

### RE-AUDIT
`Fresh re-audit the current exact head of PR #<PR> under its controlling task manifest. Prior verdict is stale if head changed. Do not modify or merge.`

## 11. Prompt minimization rule

Do not paste context that already exists canonically in repo. Prompts normally contain only repo + task/PR + role + exceptional human decision not yet recorded. Repeated decisions belong in repo docs, not repeated chat prompts.

## 12. Technical spikes

A spike answers one bounded feasibility question. It must define hypothesis/question, measurements, acceptance/failure criteria, evidence artifact, maximum scope, and explicit non-implementation. Spike PASS supports a design decision; spike code is not automatically production code.

## 13. Production implementation after SPEC

Human-approved SPEC → small task manifests → executor → CI → independent exact-head audit → human UX/scope review → merge → next task.

## 14. Evidence over narrative

Meaningful claims must reduce to current source/diff, test/CI output, benchmark evidence, browser/hardware observation, versioned artifact, or explicit human decision. Narrative summaries are convenience only.
