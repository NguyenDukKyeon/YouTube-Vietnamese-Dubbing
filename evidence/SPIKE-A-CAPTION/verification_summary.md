# SPIKE-A-CAPTION Verification Summary

- **Task ID**: `SPIKE-A-CAPTION`
- **Type**: `technical-spike`
- **Project Phase**: `TECHNICAL_SPIKES`
- **Tested Implementation SHA**: `fa7e91968e0d04559d4c954658094e0da6850a6b`
- **Execution Timestamp**: `2026-08-14T08:40:14.678Z`
- **Target OS**: `Windows 11`
- **Browser**: `Google Chrome 151.0.7922.109 (MV3)`

## 1. Evidence Topology & Provenance
This evidence artifact suite records empirical observations from live Chrome target-browser testing executed at `fa7e91968e0d04559d4c954658094e0da6850a6b`.
Every case distinguishes:
- `REAL_BROWSER_OBSERVATION`: Live Chrome CDP target run on YouTube watch page
- `TEST_FIXTURE`: Offline unit test / parser test fixture
- `INFERRED/NOT_OBSERVED`: Inferred state

## 2. Acceptance Criteria Evaluation

| Acceptance Criterion | Result | Evidence & Provenance |
|---|---|---|
| **AC-01**: Manual English segments extraction | **PASS** | `video_matrix.json` (V-01a, V-01b) — `REAL_BROWSER_OBSERVATION` |
| **AC-02**: ASR English segments extraction | **PASS** | `video_matrix.json` (V-02) — `REAL_BROWSER_OBSERVATION` (distinguishes `kind: 'asr'`) |
| **AC-03**: Canonical segment format `{startMs, endMs, text}` | **PASS** | `payload_catalog.json` & unit tests |
| **AC-04**: Monotonicity validation & anomaly logging | **PASS** | `latency_and_timing_anomalies.json` & `test/normalizer.test.js` |
| **AC-05**: Classified failure for no English captions | **PASS** | `video_matrix.json` (V-03a, V-03b) — `REAL_BROWSER_OBSERVATION` |
| **AC-06**: SPA navigation A→B→C reacquisition | **PASS** | `navigation_timeline.json` (V-04) — `REAL_BROWSER_OBSERVATION` |
| **AC-07**: Rapid switching stale rejection | **PASS** | `navigation_timeline.json` (V-05) — `REAL_BROWSER_OBSERVATION` (`STALE_GENERATION_DISCARDED`) |
| **AC-08**: No OAuth uploader edit permission required | **PASS** | Empirically verified on public videos without login |
| **AC-09**: Real-browser fetch context demonstrated | **PASS** | Real Chrome MV3 player probe and page execution |
| **AC-10**: Track/payload variants catalogued | **PASS** | `payload_catalog.json` (JSON3, XML, VTT) |
| **AC-11**: Not coupled to hardcoded signed URLs or brittle selectors | **PASS** | Dynamic player track discovery + structured parser pipeline |
| **AC-12**: Redacted structured evidence retained | **PASS** | `raw_browser_observations.json` & `track_metadata_samples.json` (all session tokens redacted) |

## 3. Negative & Failure Criteria Evaluation

| Case | Result | Evidence |
|---|---|---|
| **NF-01**: No-caption / no-English explicitly classified | **PASS** | Returns `NO_USABLE_ENGLISH_CAPTIONS` / `NO_CAPTION_TRACKS_IN_METADATA` |
| **NF-02**: HTTP 403/429/expired/fetch errors surfaced with stage | **PASS** | `failure_catalog.json` & `test/caption-fetcher.test.js` |
| **NF-03**: Stale async results rejected after generation change | **PASS** | `navigation_timeline.json` & `test/lifecycle-manager.test.js` |
| **NF-04**: Malformed payloads recorded without guessed parsing | **PASS** | `failure_catalog.json` & `test/json3-parser.test.js` |

## 4. Feasibility Conclusion
**FEASIBLE WITH BOUNDED ADAPTER BOUNDARY**.
Caption acquisition via an in-page Manifest V3 player probe is empirically feasible on public YouTube watch pages across manual and ASR tracks, provided lifecycle state isolation and a replaceable adapter boundary are maintained.
