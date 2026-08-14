---
id: SPIKE-A-CAPTION
title: YouTube caption acquisition feasibility
type: technical-spike
phase: TECHNICAL_SPIKES
status: READY
priority: P0
next: true
allowlist_mode: strict
base_ref: main
depends_on: []
ci_profile: spike
risk_refs: [R-CAP-01, R-CAP-02]
decision_refs: [D1, D12, D18]
---

# SPIKE-A-CAPTION — YouTube caption acquisition feasibility

## 1. Goal
Prove or falsify that a disposable Manifest V3 extension/harness on regular YouTube watch pages can obtain timed original-English captions reliably enough for the MVP caption-source boundary.

Canonical project-owned output:
`{ startMs, endMs, text, trackMetadata }`

for representative manual-English and YouTube-ASR tracks without uploader edit permission.

## 2. Question
Can current YouTube player/internal caption metadata plus a viable timed-text fetch path provide usable timed English caption segments across representative public videos and SPA navigation, while exposing failure/token/format variability clearly enough to define a replaceable adapter boundary?

## 3. Controlling context
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `docs/DISCOVERY.md` — P0-CAP, R-CAP-01, R-CAP-02, SPIKE-A
- `docs/DECISIONS.md` — D1, D12, D18

Observed YouTube internals are NOT a stable public contract.

## 4. Preconditions
- [ ] task is `READY`
- [ ] current canonical base available
- [ ] Chrome stable available for empirical target testing
- [ ] representative regular YouTube videos with manual English and ASR English can be tested
- [ ] no production extension architecture has been frozen

If a required precondition is unavailable: `BLOCKED`.

## 5. In scope
- disposable MV3 experimental caption-acquisition extension/harness;
- observe current watch-page/player caption metadata;
- select original English manual track when available;
- fallback to original English ASR when manual unavailable;
- timed-text/payload fetching in the real browser context needed for feasibility;
- parse/normalize encountered payload variants into canonical segments;
- SPA semantic video change/reacquisition sufficient for spike;
- evidence capture for manual, ASR, no-caption, navigation, token/fetch and malformed variants;
- redact sensitive/session-specific evidence before commit.

## 6. Out of scope
- translation/provider integration;
- VieNeu/TTS;
- dubbing playback;
- production cache/UI/architecture;
- generic YouTube downloader/extractor framework;
- ASR/Whisper;
- livestream/Shorts;
- bypassing access controls;
- permanent Innertube client unless strictly necessary to answer this bounded spike.

## 7. Allowed paths
Strict allowlist:
- `spikes/spike-a-caption/**`
- `evidence/SPIKE-A-CAPTION/**`

If another path is required: `BLOCKED — SCOPE_GAP`.

## 8. Protected paths
Must not change:
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/**`
- `.github/**`
- any future production `src/**`
- any future companion production paths

## 9. Dependency policy
`DEPENDENCY_CHANGES_ALLOWED_WITH_JUSTIFICATION`

Only disposable spike-local dependencies needed to observe/parse behavior. Document every addition; it does not imply production adoption.

## 10. Functional acceptance criteria
- [ ] AC-01: representative manual-English videos emit canonical timed segments from intended manual track.
- [ ] AC-02: representative ASR-only-English videos emit canonical timed segments and distinguish ASR.
- [ ] AC-03: output has numeric `startMs`, numeric `endMs`, non-empty `text`, and metadata sufficient to distinguish language/type/source identity.
- [ ] AC-04: timelines are materially monotonic/usable; anomalies are recorded rather than silently repaired.
- [ ] AC-05: no usable English captions produces classified unsupported/failure, not false success.
- [ ] AC-06: after SPA A→B and B→C navigation, new caption state is reacquired and stale metadata is not reused.
- [ ] AC-07: rapid video switching cannot attribute prior-video async results to new video.
- [ ] AC-08: successful path does not require OAuth uploader edit permission.
- [ ] AC-09: at least one viable real-browser fetch context is empirically demonstrated on representative public videos.
- [ ] AC-10: every encountered relevant player/track/payload variant is catalogued.
- [ ] AC-11: solution is not coupled to manually copied one-off signed URLs or a single brittle DOM text selector.
- [ ] AC-12: raw metadata/payload needed for audit is retained in redacted form or reproducible structured summary/fingerprint.

## 11. Negative/failure acceptance
- [ ] NF-01: no-caption/no-English explicitly classified.
- [ ] NF-02: 403/429/expired/token/fetch failures surface stage/context and are not converted to false empty success.
- [ ] NF-03: stale async results are rejected after semantic video generation changes.
- [ ] NF-04: malformed/unsupported payload shape is recorded as unsupported with evidence, not guessed parsing.

## 12. Validation matrix
| Case | Input/environment | Expected result | Evidence |
|---|---|---|---|
| V-01 | multiple manual-English regular videos | canonical manual segments | matrix + metadata/payload |
| V-02 | multiple English-ASR-only videos | canonical ASR segments | matrix + metadata/payload |
| V-03 | no usable English captions | classified unsupported | failure record |
| V-04 | SPA A→B→C | reacquire each, no stale state | navigation timeline |
| V-05 | rapid A→B→C | no cross-video leakage | generation/timeline log |
| V-06 | representative long-form | acquisition remains usable | counts/timing |
| V-07 | logged-out if feasible | behavior recorded | context/result |
| V-08 | normal personal logged-in if feasible | behavior recorded | context/result |
| V-09 | ad transition if naturally encountered | behavior recorded | observation |
| V-10 | legitimately viewable restricted edge case if available | record only; not MVP gate unless later scoped | observation |

Do not silently reduce the matrix.

## 13. Required evidence
Persistent path: `evidence/SPIKE-A-CAPTION/`

Required:
- environment record: Chrome version, OS, extension mode, session context, exact spike head SHA;
- video matrix: privacy-safe video identifier, track type, acquisition method, fetch context, format, outcome;
- redacted track metadata samples;
- payload-shape catalogue / representative sanitized samples;
- navigation timeline including A→B→C and rapid switching;
- failure catalogue including 403/429/token/expiry/unsupported shapes encountered;
- acquisition latency and timing-anomaly measurements;
- final changed-path list;
- final verification summary tied to exact head.

Never commit cookies, auth headers/tokens, sensitive PO/session tokens, private captions, keys, or browsing history.

## 14. CI / automated verification
`ci_profile: spike`

Run only commands that actually exist. Where harness supports it:
- syntax/build/typecheck;
- parser/unit checks using sanitized fixtures;
- evidence structure validation;
- changed-path allowlist validation.

Real YouTube behavior requires target-browser evidence and cannot be replaced by hosted CI.

## 15. Manual / target verification
Required in actual Chrome target environment:
- manual-English acquisition;
- ASR acquisition;
- no-caption/no-English failure;
- SPA A→B→C;
- rapid switch;
- real fetch/token behavior.

Automate evidence collection as much as practical.

## 16. Security/privacy invariants
- page/player input untrusted;
- no generic privileged RPC bridge;
- no secrets/session tokens in repo;
- no auth/access-control bypass;
- any MAIN-world probe is minimal and emits only sanitized caption-related data needed by spike;
- no cloud provider calls.

## 17. Stop/block conditions
`BLOCKED` if:
- only apparent path requires uploader edit permission;
- only successful path depends on manually copying per-video signed URLs;
- representative manual/ASR cases cannot be exercised;
- required change lies outside allowlist;
- spike expands into full downloader/Innertube implementation;
- evidence contradicts controlling scope and needs human product decision.

Return `FAILED` instead if the bounded spike was fully exercisable and evidence shows approach does not meet acceptance.

## 18. Deliverables
Exactly:
1. disposable harness under `spikes/spike-a-caption/`;
2. reproducible/redacted evidence under `evidence/SPIKE-A-CAPTION/`;
3. one bounded PR;
4. executor state `READY_FOR_AUDIT`, `BLOCKED`, or `FAILED`.

No production caption source is authorized.

## 19. Audit focus
Verify exact base/head, strict allowlist, manual-vs-ASR evidence, absence of uploader edit permission, SPA stale-state prevention, visible fetch/token failures, multi-video corpus, evidence reproducibility, no committed secrets, and no claim that observed internals are a stable YouTube API.

## 20. Non-claims
Even ACCEPT does NOT prove:
- YouTube internals are a stable public API;
- mechanism will never break;
- universal word-level timing;
- private/members/age-restricted support unless separately scoped/evidenced;
- translation/TTS/sync feasibility;
- spike code should be promoted directly to production.

ACCEPT only means caption acquisition is empirically feasible enough under observed current conditions and a replaceable adapter boundary to continue project gates.

## 21. Completion rule
Executor may stop `READY_FOR_AUDIT` only when available validation cases ran, every acceptance has evidence or is explicitly unmet, required negative behavior was exercised where possible, evidence ties to exact head, paths stay in strict allowlist, one bounded PR is current, and no blocker is hidden. Independent exact-head ACCEPT is required before P0 caption risk is resolved/downgraded.
