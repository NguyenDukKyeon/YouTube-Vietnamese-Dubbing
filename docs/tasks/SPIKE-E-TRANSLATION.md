---
id: SPIKE-E-TRANSLATION
title: Zero-cost translation fitness benchmark
type: technical-spike
phase: TECHNICAL_SPIKES
status: READY
priority: P0
next: false
allowlist_mode: strict
base_ref: main
depends_on: []
ci_profile: spike
risk_refs: [R-TR-01, R-QUOTA-01, R-PRIV-01]
decision_refs: [D2, D3, D8, D10, D13, D21, D22, D23, D24]
---

# SPIKE-E-TRANSLATION — Zero-cost translation fitness benchmark

## 1. Goal
Prove that at least one zero-cost English→Vietnamese provider path is good enough for the semantic portion of the dubbing pipeline, or falsify that assumption before architecture/SPEC freeze.

## 2. Question
Can Chrome Translator, Gemini free-tier-capable access, Azure Translator F0, DeepL API Free, or a clearly documented composition of them produce useful dubbing text at the required cadence while satisfying meaning, adaptive terminology, context coherence, spoken-natural output and duration-aware shortening constraints?

## 3. Controlling context
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `docs/DISCOVERY.md` — P0-TRANSLATION / R-TR-01 / SPIKE-E
- `docs/DECISIONS.md` — D2, D3, D8, D10, D13, D21, D22, D23, D24

Provider documentation proves availability/capability classes, not project-quality acceptance.

## 4. Preconditions
- [ ] task is READY
- [ ] same frozen English caption corpus can be used for all available candidates
- [ ] provider credentials/accounts are available only where legitimately needed
- [ ] secrets remain local and are never committed
- [ ] privacy mode and data-sent accounting can be recorded per provider

If some provider is unavailable because of account/quota/platform constraints, record that fact. At least the zero-cost paths actually available to the user must be evaluated sufficiently to resolve the P0 question.

## 5. In scope
- disposable text-only benchmark harness/scripts;
- a frozen shared corpus containing conversational English, incomplete fragments, pronoun/context cases, terminology/code-switching, filler, numbers/formulas, sentences spanning captions, and intentionally short timing slots;
- separate evaluation modes: direct/literal translation; context-aware translation; spoken-natural rewrite; explicit shorter-without-meaning-loss rewrite;
- sliding previous/future context only where provider supports it, with current-chunk-only output requirement;
- latency/throughput, source/output length ratio, adequacy, naturalness, terminology errors, additions/omissions, context consistency, short-rewrite success, quota/error behavior and bytes/text disclosed to cloud;
- actual current account/model/tier metadata where available;
- privacy classification and local-only viability.

## 6. Out of scope
- production provider abstraction/router;
- production prompts/cache/retry policy;
- TTS implementation;
- final architecture/provider commitment;
- purchasing paid quota;
- silently expanding cloud disclosure beyond D22;
- claiming traditional MT supports prompted rewrite when its API does not.

## 7. Allowed paths
- `spikes/spike-e-translation/**`
- `evidence/SPIKE-E-TRANSLATION/**`

## 8. Protected paths
No governance/docs changes, production `src/**`, `.github/**`, companion production code or committed secret files.

## 9. Dependency policy
`DEPENDENCY_CHANGES_ALLOWED_WITH_JUSTIFICATION`
Only spike-local benchmark/client dependencies. Never embed credentials.

## 10. Acceptance criteria
At least one zero-cost path must demonstrate all of:
- [ ] AC-01: no systematic meaning loss or hallucinated/additional content on representative corpus;
- [ ] AC-02: terminology behavior is compatible with D2 adaptive terminology;
- [ ] AC-03: where contextual input is supported, current-chunk coherence materially benefits without leaking output for neighboring chunks;
- [ ] AC-04: path can reach spoken-natural Vietnamese either directly or via an explicitly demonstrated second local/zero-cost stage;
- [ ] AC-05: path can produce shorter wording when timing requires it without routinely deleting important meaning;
- [ ] AC-06: measured latency/throughput is compatible with adaptive buffering rather than guaranteed underrun;
- [ ] AC-07: contextual requests still return current-chunk-only output;
- [ ] AC-08: cloud disclosure is measured and consistent with D22; local-only path produces no cloud requests;
- [ ] AC-09: provider capability distinctions are preserved (e.g. direct MT vs generative rewrite) rather than flattened into one `translate()` assumption;
- [ ] AC-10: current quota/rate/provider errors observed in the user's actual accessible tier are recorded without hard-coding them as permanent guarantees.

## 11. Failure criteria
FAILED if all practically available zero-cost paths either materially violate D3, cannot keep up under realistic adaptive buffering, have unusable quota/access constraints, or require unacceptable cloud disclosure with no usable local fallback/composition.

## 12. Validation matrix
Use the same corpus across candidates. Minimum categories:
- conversational complete sentence;
- fragmented captions;
- previous-context pronoun/reference;
- technical adaptive terminology;
- code-switching;
- filler removal;
- numbers/dates/versions;
- math/science notation;
- sentence spanning chunks;
- intentionally short timing slot;
- current-only output with context;
- repeated latency samples.

## 13. Required evidence
Persistent path: `evidence/SPIKE-E-TRANSLATION/`

Required:
- frozen corpus + IDs/timing metadata;
- provider/model/tier/runtime/browser version matrix;
- anonymized representative outputs;
- blind or provider-hidden human adequacy/naturalness comparison where practical;
- per-chunk latency/throughput distribution;
- source/output length ratio and shortening-success measurements;
- terminology/addition/omission/context-consistency labels;
- quota/error observations and approximate realistic personal-viewing consumption estimate;
- cloud data-sent accounting per request/provider;
- explicit capability matrix separating direct translation vs prompted rewrite/shortening;
- exact head SHA and final changed paths.

Never commit API/auth keys or sensitive account identifiers.

## 14. CI / verification
`ci_profile: spike`
CI may verify harness, corpus schema and deterministic scoring helpers. Provider calls/Chrome built-in model behavior may require local target evidence. Run only commands that exist.

## 15. Manual / target verification
Human adequacy/naturalness judgment is required for representative outputs. Chrome Translator must be tested in actual supported Chrome where it is part of the evaluated path. Cloud provider tests use the user's legitimate current tier/account where available.

## 16. Security/privacy
- credentials remain outside extension/repo;
- never send unrelated transcript/history/cache data;
- do not silently give one provider more context than D22 allows;
- local-only observations must verify zero cloud requests for the tested path;
- document free/unpaid provider privacy caveats separately from linguistic quality.

## 17. Stop/block conditions
BLOCKED if no representative corpus can be run, all candidate access is unavailable for reasons unrelated to fitness, or required work escapes allowlist. Do not purchase paid service to make the spike pass.

## 18. Deliverables
1. disposable translation benchmark harness;
2. frozen corpus and evidence;
3. provider capability/fitness matrix;
4. one bounded PR;
5. executor state READY_FOR_AUDIT/BLOCKED/FAILED.

## 19. Audit focus
Same-corpus fairness, no hidden extra context, current-only output, adequacy vs naturalness distinction, provider capability honesty, actual latency rather than marketing, quota/privacy evidence, secret hygiene, and whether at least one genuinely zero-cost path satisfies the complete acceptance predicate.

## 20. Non-claims
ACCEPT does not freeze final provider ordering, final prompts, permanent free quotas, privacy consent defaults, numerical duration thresholds, or production routing. It only resolves that at least one zero-cost semantic path is feasible enough to continue design/SPEC gates.
