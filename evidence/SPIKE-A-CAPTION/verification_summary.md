# SPIKE-A-CAPTION Verification Summary

- **Task ID**: `SPIKE-A-CAPTION`
- **Type**: `technical-spike`
- **Project Phase**: `TECHNICAL_SPIKES`
- **Tested Implementation SHA**: `44ba5d0653f86a344f13209801201041e0693242`
- **Execution Timestamp**: `2026-08-14T15:54:54.869Z`
- **Target OS**: `Windows 11`
- **Browser**: `Google Chrome 151.0.7922.109 (MV3)`

## 1. Evidence Topology & Provenance
This evidence artifact suite records empirical observations from live Chrome target-browser testing executed at `44ba5d0653f86a344f13209801201041e0693242`.
Every case distinguishes:
- `REAL_BROWSER_OBSERVATION`: Live Chrome CDP target run on YouTube watch page
- `TEST_FIXTURE`: Offline unit test / parser test fixture
- `NOT_OBSERVED`: Optional context cases not exercised in this clean temporary profile run

## 2. Acceptance Criteria Evaluation

| Acceptance Criterion | Result | Evidence & Provenance |
|---|---|---|
| **AC-01**: Manual English segments extraction | **PASS** | `video_matrix.json` (V-01a, V-01b) — `REAL_BROWSER_OBSERVATION` (live JSON3 captured and parsed into canonical segments) |
| **AC-02**: ASR / Full Course English segments extraction | **PASS** | `video_matrix.json` (V-02) — `REAL_BROWSER_OBSERVATION` (live JSON3 captured and parsed into 4530 segments) |
| **AC-03**: Canonical segment format `{startMs, endMs, text}` | **PASS** | `payload_catalog.json` & live parsed JSON3 segments |
| **AC-04**: Monotonicity validation & anomaly logging | **PASS** | `latency_and_timing_anomalies.json` & `test/normalizer.test.js` |
| **AC-05**: Classified failure for no English captions | **PASS** | `video_matrix.json` (V-03a, V-03b) — `REAL_BROWSER_OBSERVATION` (`NO_USABLE_ENGLISH_CAPTIONS`) |
| **AC-06**: Genuine YouTube SPA navigation A→B→C reacquisition | **PASS** | `video_matrix.json` (V-04) & `navigation_timeline.json` — `REAL_BROWSER_OBSERVATION` (observed semantic video IDs: `dQw4w9WgXcQ` → `_uQrJ0TkZlc` → `M576WGiDBdQ`) |
| **AC-07**: Real rapid switching stale rejection | **PASS** | `video_matrix.json` (V-05) & `navigation_timeline.json` — `REAL_BROWSER_OBSERVATION` (`STALE_GENERATION_DISCARDED` on out-of-order arrivals) |
| **AC-08**: No OAuth uploader edit permission required | **PASS** | Empirically verified on public videos without login |
| **AC-09**: Real-browser fetch context demonstrated | **PASS** | Real Chrome MV3 player probe and timedtext capture |
| **AC-10**: Track/payload variants catalogued | **PASS** | `payload_catalog.json` (JSON3, XML, VTT) |
| **AC-11**: Dynamic player track discovery | **PASS** | In-page player discovery without hardcoded signed URLs or brittle selectors |
| **AC-12**: Redacted structured evidence retained | **PASS** | `raw_browser_observations.json` & `track_metadata_samples.json` (all session tokens, signatures, keys redacted) |

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
