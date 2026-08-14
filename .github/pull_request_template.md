## Task
- Task ID:
- Task manifest:
- Task type:
- Project phase:

## Exact refs
- Base ref:
- Base SHA:
- Current head SHA:

> Update current head SHA before requesting independent audit.

## Scope
### Changed paths
List every changed path:
- ...

### In-scope work completed
- ...

### Explicitly not changed
- ...

## Acceptance evidence
| Acceptance | Result | Raw evidence |
|---|---|---|
| AC-01 | PASS/FAIL | command/log/file/observation |
| AC-02 | PASS/FAIL | ... |

PR narrative is not proof by itself; point to underlying evidence.

## Negative/failure cases
| Case | Result | Evidence |
|---|---|---|
| NF-01 | PASS/FAIL | ... |

## Verification
Only list checks that actually ran.

| Check | Result | Exact command / CI check |
|---|---|---|
| scope | PASS/FAIL | ... |
| lint | PASS/FAIL/N/A | ... |
| typecheck | PASS/FAIL/N/A | ... |
| tests | PASS/FAIL/N/A | ... |
| build | PASS/FAIL/N/A | ... |
| task-specific | PASS/FAIL/N/A | ... |

### CI
- Required CI profile:
- Current CI state:
- Workflow/run:
- Known infrastructure failures:

## Evidence artifacts
- `evidence/<TASK_ID>/...`

## Environment / versions
Only when behavior depends on environment:
- OS:
- Browser:
- Runtime:
- Model/provider:
- Hardware:
- Other:

## Deviations
State `NONE` or list every deviation from controlling manifest. A deviation is not self-authorizing; scope/acceptance changes require human authorization first.

## Known limitations / unresolved observations
- ...

## Non-claims
This PR does **not** claim:
- ...

## Executor declaration
- [ ] I fresh-read controlling manifest.
- [ ] I inspected final diff.
- [ ] Changed paths satisfy allowlist/scope.
- [ ] I did not silently expand scope.
- [ ] I did not hard-code/commit secrets.
- [ ] Required evidence is tied to current head.
- [ ] Required available verification ran.
- [ ] I did not merge or enable auto-merge.

## Independent audit
Do not pre-fill verdict.

Auditor records:
- Audited exact head SHA:
- Verdict: `ACCEPT` / `REJECT` / `BLOCKED`
- Findings/evidence:
