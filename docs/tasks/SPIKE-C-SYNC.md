---
id: SPIKE-C-SYNC
title: Playback synchronization and ducking feasibility
type: technical-spike
phase: TECHNICAL_SPIKES
status: BLOCKED
priority: P1
next: false
allowlist_mode: strict
base_ref: main
depends_on: [SPIKE-A-CAPTION, SPIKE-B-VIENEU, SPIKE-E-TRANSLATION]
ci_profile: spike
risk_refs: [R-SYNC-01, R-DUR-01, R-SPA-01, R-AUTO-01, R-AUD-01]
decision_refs: [D4, D5, D6, D7, D16, D17, D18, D24, D25]
---

# SPIKE-C-SYNC — Playback synchronization and ducking feasibility

## 1. Goal
Isolate browser synchronization/ducking feasibility from translation and TTS variability using pre-generated fixed audio fixtures.

## 2. Question
Can a YouTube-tab scheduler using `video.currentTime` as master clock keep dub aligned after play/pause, seek, repeated seek, buffering, playback-rate changes and SPA video switches, while avoiding stale old-video audio and preserving/restoring user original-volume state?

## 3. Controlling context
- `AGENTS.md`
- `AI_WORKFLOW.md`
- `docs/CI_PROTOCOL.md`
- `docs/DISCOVERY.md` — P1 sync/audio findings, SPIKE-C
- `docs/DECISIONS.md` — D4/D5/D6/D7/D16/D17/D18/D24/D25

## 4. Preconditions
Default queue policy blocks this until A/B/E P0 gate review, unless human explicitly unblocks it. Required fixed audio fixtures and Chrome/YouTube target environment must be available.

## 5. In scope
- disposable MV3/tab scheduler harness using pre-generated fixed audio;
- timeline logging: videoId/currentTime/playbackRate/media events/dub chunk/audio position/drift/correction/base+duck volume;
- play, pause, seek forward/back, repeated seek;
- 1×/1.25×/1.5×/2× and mid-chunk rate changes;
- buffering/waiting/stalled recovery;
- playlist/SPA A→B and rapid switches;
- direct original-media volume ducking/fade experiment;
- user changes YouTube volume during dub;
- auto-dub-style startup/activation observation;
- ad transition observation if naturally available;
- event-driven vs polling vs hybrid behavior measurements sufficient to freeze scheduler strategy.

## 6. Out of scope
- live caption acquisition;
- translation/provider calls;
- VieNeu/live TTS generation;
- production cache/router/companion;
- source separation;
- production UI;
- hard-coding final drift threshold before listening/data.

## 7. Allowed paths
- `spikes/spike-c-sync/**`
- `evidence/SPIKE-C-SYNC/**`

## 8. Acceptance criteria
- [ ] AC-01: drift does not accumulate without bound during stable playback.
- [ ] AC-02: pause/seek/ratechange trigger deterministic resynchronization behavior.
- [ ] AC-03: after seek, no pre-seek scheduled/stale audio may later leak.
- [ ] AC-04: after semantic videoId switch, no old-video audio may play.
- [ ] AC-05: recovery converges within a bounded observable chunk/event strategy instead of progressively diverging.
- [ ] AC-06: user/base original-volume state is restored correctly after ducking/disable.
- [ ] AC-07: YouTube/user volume changes during dub do not permanently corrupt remembered/base volume semantics.
- [ ] AC-08: a viable audio-start path is observed for manual activation and the intended auto-dub lifecycle.
- [ ] AC-09: 1×/1.25×/1.5×/2× behavior is measured; 2× limitations are characterized rather than hidden.
- [ ] AC-10: scheduler placement/strategy recommendation is supported by event+drift evidence, not guesswork.

## 9. Failure criteria
FAILED if cumulative drift is unavoidable, stale audio cannot be reliably invalidated/stopped, YouTube volume interaction makes direct ducking operationally unsafe, auto-dub requires repeated user clicks incompatible with D16, or speed changes require altering the master video timeline rather than adapting dub.

## 10. Required evidence
`evidence/SPIKE-C-SYNC/` must include environment/head, event/audio timeline logs, drift distributions, recovery latency, stale-discard counts, volume restoration error/observations, audible click/pump notes or recordings where practical, scheduler overhead, and recommendation for audio/scheduler context placement.

## 11. CI / target verification
`ci_profile: spike`. CI may validate harness/fixtures/log parsers; real Chrome/YouTube behavior is target-browser evidence.

## 12. Security/privacy
No cloud calls, no secrets, no generic page→privileged RPC. Page signals are untrusted.

## 13. Deliverables
Disposable fixed-audio sync harness + evidence + one bounded PR. No production translation/TTS/cache/provider implementation.

## 14. Audit focus
Exact-head scope, stale-generation invalidation, drift calculations, playback-rate coverage, SPA leakage, volume restoration, autoplay/activation evidence, and no arbitrary threshold presented as established before measurement.

## 15. Non-claims
ACCEPT does not freeze final numeric drift/overflow/speech-rate thresholds or production UI. It establishes that the synchronization/ducking boundary is feasible enough to specify.
