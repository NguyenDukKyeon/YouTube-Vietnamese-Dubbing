# SPIKE-A-CAPTION Verification Summary

- **Task ID**: `SPIKE-A-CAPTION`
- **Type**: `technical-spike`
- **Project Phase**: `TECHNICAL_SPIKES`
- **Tested Implementation SHA**: `1523bc5dcb554b07defd342c752c4fb58d062ca8`
- **Execution Timestamp**: `2026-08-14T18:04:16.008Z`
- **Target OS**: `Windows 11`
- **Browser**: `Google Chrome 151.0.7922.109 (MV3, --mute-audio)`

## 1. Evidence Topology & Provenance
This evidence artifact suite records empirical observations from live Chrome target-browser testing executed at `1523bc5dcb554b07defd342c752c4fb58d062ca8`.
Every case distinguishes:
- `REAL_BROWSER_OBSERVATION`: Live Chrome CDP target run on YouTube watch page
- `TEST_FIXTURE`: Offline unit test / parser test fixture
- `NOT_OBSERVED`: Optional context cases not exercised in this clean temporary profile run

## 2. Acceptance Criteria Evaluation

| Acceptance Criterion | Result | Evidence & Provenance |
|---|---|---|
| **AC-01**: Multiple Manual English segments extraction | **PASS** | `video_matrix.json` (V-01a: W6NZfCO5SIk [524 segs, 2896420ms]; V-01b: kJQP7kiw5Fk [90 segs, 273500ms]) — `REAL_BROWSER_OBSERVATION` (exact 1:1 track-to-payload canonical identity binding) |
| **AC-02**: Multiple ASR-only English segments extraction | **PASS** | `video_matrix.json` (V-02a: SqcY0GlETPk [2151 segs, 4798800ms]; V-02b: 3JZ_D3ELwOQ [108 segs, 255799ms]) — `REAL_BROWSER_OBSERVATION` (verified zero manual English tracks, exact 1:1 identity binding) |
| **AC-03**: Canonical segment format `{startMs, endMs, text}` | **PASS** | `payload_catalog.json` & live parsed JSON3 canonical segments |
| **AC-04**: Monotonicity validation & anomaly logging | **PASS** | `latency_and_timing_anomalies.json` & `test/normalizer.test.js` |
| **AC-05**: Classified failure for no English captions | **PASS** | `video_matrix.json` (V-03a: 9bZkp7q19f0 [`NO_USABLE_ENGLISH_CAPTIONS`], V-03b: fN1CmbGOz6I [`NO_CAPTION_TRACKS_IN_METADATA`]) — `REAL_BROWSER_OBSERVATION` |
| **AC-06**: Genuine YouTube SPA navigation A→B→C reacquisition | **PASS** | `video_matrix.json` (V-04) & `navigation_timeline.json` — `REAL_BROWSER_OBSERVATION` (observed semantic player video IDs: `W6NZfCO5SIk` → `SqcY0GlETPk` → `3JZ_D3ELwOQ`) |
| **AC-07**: Real rapid switching stale rejection & abort | **PASS** | `video_matrix.json` (V-05) & `navigation_timeline.json` — `REAL_BROWSER_OBSERVATION` (genuine in-flight fetch operations aborted with native DOM `AbortError`, discarded with `STALE_GENERATION_DISCARDED`) |
| **AC-08**: No OAuth uploader edit permission required | **PASS** | Empirically verified on public videos without login |
| **AC-09**: Real-browser fetch context demonstrated | **PASS** | Real Chrome MV3 player probe and timedtext capture |
| **AC-10**: Track/payload variants catalogued | **PASS** | `payload_catalog.json` (JSON3 from live V-01a, XML, VTT) |
| **AC-11**: Dynamic player track discovery | **PASS** | In-page player discovery without hardcoded signed URLs or brittle selectors |
| **AC-12**: Redacted structured evidence retained | **PASS** | `raw_browser_observations.json` & `track_metadata_samples.json` (all session tokens, signatures, keys redacted) |

## 3. Negative & Failure Criteria Evaluation

| Case | Result | Evidence |
|---|---|---|
| **NF-01**: No-caption / no-English explicitly classified | **PASS** | Real target Chrome observations on 9bZkp7q19f0 (`NO_USABLE_ENGLISH_CAPTIONS`) and fN1CmbGOz6I (`NO_CAPTION_TRACKS_IN_METADATA`) |
| **NF-02**: HTTP 403/429/expired/fetch errors surfaced with stage | **PASS** | `failure_catalog.json` & `test/caption-fetcher.test.js` |
| **NF-03**: Stale async results rejected after generation change | **PASS** | `navigation_timeline.json` & `test/lifecycle-manager.test.js` |
| **NF-04**: Malformed payloads recorded without guessed parsing | **PASS** | `failure_catalog.json` & `test/json3-parser.test.js` |

## 4. Feasibility Conclusion
**FEASIBLE WITH BOUNDED ADAPTER BOUNDARY**.
Caption acquisition via an in-page Manifest V3 player probe is empirically feasible on public YouTube watch pages across manual and ASR tracks, provided lifecycle state isolation and a replaceable adapter boundary are maintained.
