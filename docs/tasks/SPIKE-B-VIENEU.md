---
id: SPIKE-B-VIENEU
title: VieNeu target-machine feasibility benchmark
type: technical-spike
phase: TECHNICAL_SPIKES
status: READY
priority: P0
next: false
allowlist_mode: strict
base_ref: main
depends_on: []
ci_profile: spike
risk_refs: [R-TTS-01, R-TTS-02]
decision_refs: [D3, D5, D6, D7, D9, D13, D17, D19, D20, D21]
---

# SPIKE-B-VIENEU — VieNeu target-machine feasibility benchmark

## 1. Goal
Determine whether a pinned current VieNeu v3 Turbo setup is suitable to freeze as the primary local TTS candidate on the actual Windows target machine.

## 2. Question
On the real target hardware, does VieNeu provide sustained throughput, acceptable TTFA/memory/long-run stability, usable mixed Vietnamese-English technical pronunciation, and an operational cancellation-or-discard strategy compatible with adaptive dubbing?

## 3. Controlling context
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `docs/DISCOVERY.md` — P0-TTS, R-TTS-01, R-TTS-02, SPIKE-B
- `docs/DECISIONS.md` — referenced D3/D5/D6/D7/D9/D13/D17/D19/D20/D21

Maintainer benchmarks are context only, not target-machine acceptance evidence.

## 4. Preconditions
- [ ] task is `READY`
- [ ] actual target Windows machine available
- [ ] exact VieNeu/runtime/model versions can be pinned and recorded
- [ ] benchmark can run without committing model binaries/generated bulk audio

## 5. In scope
- disposable benchmark harness;
- exact environment/model/runtime capture;
- ONNX CPU streaming benchmark first;
- GPU path only if actual target/support requirement justifies it;
- corpus covering normal Vietnamese, code-switching, programming/API/GitHub/Transformer terms, math, physics, chemistry, dates/versions/fractions/numbers, acronyms, long/punctuation-heavy sentences and short duration-fit text;
- cold/warm load, TTFA, total generation time, RTF, media-seconds prepared per wall-second, CPU/GPU, peak/steady RAM, output duration/size, chunk-length sensitivity, long-run trend, repeated-run variation;
- human listening rating for naturalness/pronunciation;
- cancellation behavior if supported, otherwise measured discard-result strategy after seek-like invalidation.

## 6. Out of scope
- production TTS server/companion;
- extension IPC;
- voice cloning/diarization/multi-speaker UX;
- production provider routing;
- rewriting project architecture;
- benchmarking many alternative models unless VieNeu fails a P0 gate.

## 7. Allowed paths
- `spikes/spike-b-vieneu/**`
- `evidence/SPIKE-B-VIENEU/**`

## 8. Protected paths
No changes to governance/docs outside the allowed evidence path, production `src/**`, `.github/**`, or companion production paths.

## 9. Dependency policy
`DEPENDENCY_CHANGES_ALLOWED_WITH_JUSTIFICATION`
Only spike-local dependencies needed to install/run the pinned benchmark.

## 10. Acceptance criteria
- [ ] AC-01: exact OS/CPU/RAM/GPU/runtime/VieNeu/model/backend versions are recorded.
- [ ] AC-02: cold and warm model-load behavior and stable memory footprint are measured.
- [ ] AC-03: no progressive throughput collapse or unbounded memory growth occurs over representative long-run generation.
- [ ] AC-04: sustained preparation throughput is at least sufficient for 1× media playback on target hardware.
- [ ] AC-05: data quantifies headroom or lack of headroom for 1.25×/1.5×/2× when combined with buffering/shortening; these faster rates need not independently pass without adaptation.
- [ ] AC-06: technical corpus has no systematic pronunciation/naturalness blocker that materially destroys meaning/usability.
- [ ] AC-07: actual audio duration and bytes/output characteristics are measured across representative chunk lengths.
- [ ] AC-08: cancellation is either demonstrated or explicitly recorded unsupported with measured cost of allowing inference to finish then discarding stale result.
- [ ] AC-09: repeated-run variation is measured; result is not based on a single cherry-picked run.

If sustained 1× preparation fails on target, VieNeu cannot be frozen as primary long-form MVP TTS from this spike.

## 11. Failure criteria
- ready-buffer simulation necessarily trends to exhaustion at 1×;
- RAM grows without bound or multi-minute instability occurs;
- technical/code-switching pronunciation frequently changes/obscures meaning;
- startup/load cost is incompatible with any reasonable adaptive-startup policy;
- invalidated inference cannot be cancelled/discarded with tolerable measured cost.

## 12. Validation matrix
Include short/medium/long chunks, warm/cold start, normal Vietnamese, technical code-switching, math/physics/chemistry, numbers/acronyms, punctuation-heavy text, repeated runs, and sustained sequence/load test.

## 13. Required evidence
Persistent path: `evidence/SPIKE-B-VIENEU/`

Required:
- exact environment/model/runtime manifest;
- raw CSV/JSON benchmark data;
- summary with calculation definitions including RTF;
- human rating sheet with representative sample IDs;
- representative lightweight audio references/samples only if repo size/privacy allow; otherwise local artifact manifest + hashes/ratings;
- memory/throughput long-run trend;
- cancellation/discard experiment;
- output-byte measurements useful for later IPC/cache decisions;
- exact head SHA and final changed paths.

Do NOT commit model weights, large generated-audio corpus, caches, secrets or local credentials.

## 14. CI / verification
`ci_profile: spike`
CI may verify benchmark code/fixtures/schema but cannot substitute for actual target-machine measurements. Run only commands that exist.

## 15. Manual/target verification
Mandatory on the actual Windows target machine. Human listening rating is required for naturalness/technical pronunciation.

## 16. Security/privacy
No cloud keys required. Do not commit personal paths/secrets. Treat generated speech corpus/evidence as project data and keep bulk artifacts local where appropriate.

## 17. Stop/block conditions
BLOCKED if actual target machine cannot be exercised, exact versions cannot be recorded, or required work escapes allowlist. FAILED if benchmark is fully exercisable and P0 acceptance fails.

## 18. Deliverables
1. disposable benchmark harness;
2. target-machine evidence;
3. one bounded PR;
4. `READY_FOR_AUDIT`, `BLOCKED`, or `FAILED`.

## 19. Audit focus
Exact environment/version provenance, raw calculations, sustained—not burst—throughput, long-run memory trend, corpus representativeness, human rating traceability, no substitution of maintainer/CI benchmark for target data, and no large/secrets artifacts committed.

## 20. Non-claims
ACCEPT does not freeze final voice, speed thresholds, IPC transport, cache size, production TTS server design, or guarantee 2× natural dubbing. It only resolves whether VieNeu is viable enough to remain/freeze as primary local TTS candidate under measured target conditions.
