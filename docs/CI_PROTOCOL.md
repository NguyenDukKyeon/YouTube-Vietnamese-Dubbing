# CI_PROTOCOL.md

Version: 1.0

## 1. Purpose

CI provides reproducible automated evidence for a task/PR. CI does not replace target-machine benchmarks, real-browser empirical spikes, subjective voice/UX evaluation, independent audit, or human product acceptance.

No agent may claim a check passed unless raw output or a current CI check proves it.

## 2. Do not invent commands

This project is still in technical spikes and may not yet have a final scaffold.

Therefore:
- commands must come from scripts/config actually present in the current repo;
- inspect package/runtime/workflow configs before invoking commands;
- never invent `npm test`, `npm run build`, `pytest`, `ruff`, etc. because they are conventional;
- if a task requires a verification capability the repo lacks, return `BLOCKED` unless the task explicitly authorizes adding it.

## 3. Logical check names

Where applicable use stable names:
1. `scope`
2. `format` (optional)
3. `lint`
4. `typecheck`
5. `unit`
6. `integration`
7. `build`
8. `security-static`
9. `task-specific`
10. `evidence-validation`

## 4. CI profiles

### `docs`
Docs/governance-only. Require path/scope validation and only existing docs/schema checks. Do not require application builds for ceremony.

### `spike`
Disposable technical spikes. Require scope validation, any syntax/lint/typecheck/build/tests that actually exist for the spike, task-specific automated checks, and evidence validation where practical. External empirical evidence may be required by manifest.

### `extension`
After production Chrome extension scaffold exists: scope, lint, typecheck, unit, build, relevant integration, task-specific tests unless approved SPEC says otherwise.

### `companion`
After production Local Companion scaffold exists: scope, lint/static analysis, adopted typecheck, unit, integration, package/startup validation, task-specific tests.

### `mixed`
Explicit task touching extension + companion. Require applicable gates from both plus cross-boundary integration. Prefer decomposition where possible.

### `remediation`
Same profile as rejected task plus affected checks. Remediation cannot weaken/remove a failing check unless separately authorized.

## 5. Executor/check sequence

1. inspect repo/scripts;
2. run fastest relevant checks;
3. task-specific tests;
4. broader required tests;
5. typecheck/lint where applicable;
6. build/package where applicable;
7. inspect final diff/path scope;
8. push;
9. let GitHub Actions run canonical PR checks when configured;
10. inspect results before `READY_FOR_AUDIT`.

## 6. Scope gate

Every PR must prove changed paths are allowed by controlling manifest. With `allowlist_mode: strict`, any path outside allowlist is failure unless manifest is human-authorized first. Governance is protected by default.

## 7. Test policy

Tests assert behavior, not mere execution. Feature/bug tasks add/update tests when automatable. Bug fixes should get regression tests where practical. Do not weaken assertions or delete tests merely to obtain green CI unless approved behavior changed. Spikes may use bounded harnesses/fixtures defined by manifest.

## 8. Build policy

Production-code PR cannot be accepted with a failed required build/package gate. Spike needs production build only if its feasibility question depends on build/install viability.

## 9. Environment-dependent evidence

GitHub Actions cannot prove all target behavior. Examples requiring target/manual evidence:
- VieNeu throughput on the actual Windows target machine;
- Chrome/YouTube undocumented caption behavior;
- audible synchronization/ducking quality;
- browser activation/autoplay behavior;
- human Vietnamese naturalness ratings.

For these, CI verifies harness/data format where possible and auditor verifies target evidence separately. Never substitute a hosted-runner benchmark for a declared target-machine benchmark.

## 10. Failure classification

Each failed required check is classified:
- `INTRODUCED`: current change caused it; executor fixes if in scope.
- `PRE_EXISTING`: demonstrably on exact controlling base; report, do not silently repair.
- `INFRASTRUCTURE`: runner/registry/service/quota/environment failure unrelated to code semantics; not code failure, but not PASS.
- `UNKNOWN`: unresolved due insufficient evidence.

## 11. Skips/flakiness

Required checks must not silently skip. Skipped required check is not PASS. Flakiness must be evidenced. Re-runs may confirm infra/flaky events, but do not fish for green while ignoring deterministic failures.

## 12. Dependency/security checks

When dependencies change, manifest must authorize them. Verify lockfile consistency and relevant source/license/security constraints. Never introduce secret material. Do not perform unrelated mass upgrades. Security-static checks are mandatory when changing a security boundary or when production scaffold requires them.

## 13. Evidence freshness

CI/evidence is valid only for exact PR head tested. If head changes, prior CI may be stale, prior ACCEPT is stale, and affected evidence must be regenerated/revalidated.

## 14. Acceptance gate

Independent ACCEPT requires:
- all manifest-required current CI checks green;
- required non-CI evidence exists and supports acceptance;
- scope valid;
- no blocking introduced failure.

Pending/skipped/missing required verification yields BLOCKED or REJECT depending on cause.

## 15. Production branch protection recommendation

After production scaffold exists, configure `main` for PR-before-merge, required status checks, no force pushes, and no routine direct pushes. Human merge remains final gate for this personal project.
