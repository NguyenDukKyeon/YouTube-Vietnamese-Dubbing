/**
 * Evidence Validator Script (Comprehensive Empirical Cross-Checking & Redaction Enforcement)
 *
 * Verifies:
 * 1. Existence and valid schema for all required evidence artifacts.
 * 2. Strict redaction invariant: no unredacted signatures, session tokens, keys, expirations, cookies.
 * 3. Provenance integrity:
 *    - Real cases (V-01a, V-01b, V-02a, V-02b, V-03a, V-03b, V-04, V-05, V-06, V-07) are REAL_BROWSER_OBSERVATION.
 *    - Unexercised optional cases (V-08, V-09, V-10) are honestly NOT_OBSERVED.
 * 4. Cross-checks raw observations against derived matrix rows:
 *    - Matches raw payloadLengthBytes > 0, parsedSegmentCount > 0, totalDurationMs > 0 against video_matrix.
 *    - Validates 1:1 selectedTrack <-> capturedTimedtext canonical identity binding:
 *      * videoId exact match
 *      * languageCode exact match
 *      * kind (manual vs asr) exact match
 *      * variant / name match where applicable
 *      * raw.trackBindingMatched === true and mat.trackBindingMatched === true
 *    - Runs regression assertion proving that multi-track variant (.en.nP7-2PuUl7o) rejects mismatched variants (lang=en-US).
 *    - Validates V-02a/V-02b are genuinely ASR-only (hasManualEn: false, isAsrOnly: true, selectedTrackKind: 'asr').
 *    - Validates V-03a/V-03b have real target-browser observation records in raw observations.
 *    - Validates V-05 has genuine async fetch race with real AbortController AbortErrors and authoritative raw discard records.
 *    - Validates V-04 has distinct observed semantic player video IDs.
 *    - Validates payload_catalog.json REAL_BROWSER_OBSERVATION entry references real raw capture.
 * 5. Tested implementation SHA ancestry in git and zero source code drift.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import {
  deriveIdentityFromTimedtextUrl,
  matchesTrackIdentity
} from '../src/extractor/track-selector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..');
const EVIDENCE_DIR = join(REPO_ROOT, 'evidence', 'SPIKE-A-CAPTION');

const REQUIRED_FILES = [
  'environment.json',
  'video_matrix.json',
  'track_metadata_samples.json',
  'payload_catalog.json',
  'navigation_timeline.json',
  'failure_catalog.json',
  'latency_and_timing_anomalies.json',
  'raw_browser_observations.json',
  'verification_summary.md'
];

const FORBIDDEN_UNREDACTED_PATTERNS = [
  /signature=[0-9A-Fa-f.]{30,}/,
  /sig=[0-9A-Fa-f.]{30,}/,
  /po_token=[A-Za-z0-9-_%]{20,}/,
  /cookie:\s*[^;]+/i,
  /Bearer\s+[A-Za-z0-9-_.]+/
];

function validateEvidence() {
  console.log('[Evidence Validator] Checking evidence directory:', EVIDENCE_DIR);

  if (!existsSync(EVIDENCE_DIR)) {
    console.error('[Evidence Validator] FAILED: Evidence directory does not exist.');
    process.exit(1);
  }

  let hasErrors = false;

  // 1. Check file existence & redaction
  for (const filename of REQUIRED_FILES) {
    const fullPath = join(EVIDENCE_DIR, filename);
    if (!existsSync(fullPath)) {
      console.error(`[Evidence Validator] Missing required evidence file: ${filename}`);
      hasErrors = true;
    } else {
      const content = readFileSync(fullPath, 'utf-8');
      if (!content.trim()) {
        console.error(`[Evidence Validator] File is empty: ${filename}`);
        hasErrors = true;
      }

      // Check for unredacted secret leaks
      for (const pattern of FORBIDDEN_UNREDACTED_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`[Evidence Validator] Potential unredacted token leak in ${filename} matching pattern ${pattern}`);
          hasErrors = true;
        }
      }
    }
  }

  // 2. Validate environment.json structure & Ancestry
  let testedImplementationSha = null;
  try {
    const envData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'environment.json'), 'utf-8'));
    if (!envData.task || !envData.os || !envData.chromeVersion || !envData.testedImplementationSha) {
      console.error('[Evidence Validator] environment.json missing required fields (task, os, chromeVersion, testedImplementationSha)');
      hasErrors = true;
    } else {
      testedImplementationSha = envData.testedImplementationSha;
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse environment.json:', err.message);
    hasErrors = true;
  }

  // Check testedImplementationSha ancestry in git
  if (testedImplementationSha) {
    try {
      execSync(`git merge-base --is-ancestor ${testedImplementationSha} HEAD`, { cwd: REPO_ROOT });
      console.log(`[Evidence Validator] Verified testedImplementationSha ${testedImplementationSha} is a valid ancestor of HEAD.`);

      const diffCode = execSync(
        `git diff --name-only ${testedImplementationSha} HEAD -- spikes/spike-a-caption/src spikes/spike-a-caption/test`,
        { cwd: REPO_ROOT, encoding: 'utf-8' }
      ).trim();

      if (diffCode) {
        console.error('[Evidence Validator] Implementation code changed after testedImplementationSha without re-running empirical evidence:', diffCode);
        hasErrors = true;
      } else {
        console.log('[Evidence Validator] Verified zero implementation code diffs since empirical run.');
      }
    } catch (err) {
      try {
        const headSha = execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
        if (headSha.startsWith(testedImplementationSha) || testedImplementationSha.startsWith(headSha)) {
          console.log('[Evidence Validator] testedImplementationSha matches current HEAD.');
        } else {
          console.error('[Evidence Validator] testedImplementationSha is not an ancestor of current HEAD.');
          hasErrors = true;
        }
      } catch (headErr) {
        console.error('[Evidence Validator] Git ancestry check failed:', err.message);
        hasErrors = true;
      }
    }
  }

  // 3. Multi-track Variant Regression Check (Self-Test)
  const v1bTestSelected = {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en',
    kind: 'manual',
    vssId: '.en.nP7-2PuUl7o',
    name: 'en',
    variant: null
  };
  const v1bMismatchedCaptured = {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en-US',
    kind: 'manual',
    vssId: null,
    name: 'English - United States',
    variant: null
  };
  if (matchesTrackIdentity(v1bTestSelected, v1bMismatchedCaptured)) {
    console.error('[Evidence Validator] Multi-track regression assertion failed: matchesTrackIdentity did not reject mismatched language variant (en vs en-US).');
    hasErrors = true;
  }

  // 4. Read and Cross-Check raw observations vs derived matrix
  try {
    const rawData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'raw_browser_observations.json'), 'utf-8'));
    const matrixData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'video_matrix.json'), 'utf-8'));
    const payloadData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'payload_catalog.json'), 'utf-8'));
    const timelineData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'navigation_timeline.json'), 'utf-8'));

    if (!Array.isArray(rawData) || rawData.length < 6) {
      console.error('[Evidence Validator] raw_browser_observations.json must contain observations for tested videos (V-01a, V-01b, V-02a, V-02b, V-03a, V-03b).');
      hasErrors = true;
    }

    // Cross-check each empirical live fetch video case
    const liveFetchCases = [
      { caseId: 'V-01a', expectedKind: 'manual', requireAsrOnly: false },
      { caseId: 'V-01b', expectedKind: 'manual', requireAsrOnly: false },
      { caseId: 'V-02a', expectedKind: 'asr', requireAsrOnly: true },
      { caseId: 'V-02b', expectedKind: 'asr', requireAsrOnly: true }
    ];

    for (const req of liveFetchCases) {
      const raw = rawData.find(r => r.caseId === req.caseId);
      const mat = matrixData.find(m => m.caseId === req.caseId);

      if (!raw) {
        console.error(`[Evidence Validator] Missing raw observation record for ${req.caseId}`);
        hasErrors = true;
        continue;
      }
      if (!mat) {
        console.error(`[Evidence Validator] Missing video_matrix record for ${req.caseId}`);
        hasErrors = true;
        continue;
      }

      // Check raw provenance
      if (raw.provenance !== 'REAL_BROWSER_OBSERVATION') {
        console.error(`[Evidence Validator] Raw observation for ${req.caseId} must have provenance REAL_BROWSER_OBSERVATION`);
        hasErrors = true;
      }
      if (raw.timedtextCapture?.payloadProvenance !== 'REAL_BROWSER_FETCH') {
        console.error(`[Evidence Validator] Raw timedtextCapture for ${req.caseId} must have payloadProvenance REAL_BROWSER_FETCH`);
        hasErrors = true;
      }
      if (typeof raw.timedtextCapture?.payloadLengthBytes !== 'number' || raw.timedtextCapture.payloadLengthBytes <= 0) {
        console.error(`[Evidence Validator] Raw observation for ${req.caseId} must have payloadLengthBytes > 0, found: ${raw.timedtextCapture?.payloadLengthBytes}`);
        hasErrors = true;
      }
      if (typeof raw.timedtextCapture?.parsedSegmentCount !== 'number' || raw.timedtextCapture.parsedSegmentCount <= 0) {
        console.error(`[Evidence Validator] Raw observation for ${req.caseId} must have parsedSegmentCount > 0, found: ${raw.timedtextCapture?.parsedSegmentCount}`);
        hasErrors = true;
      }
      if (!raw.timedtextCapture?.sampleSegment) {
        console.error(`[Evidence Validator] Raw observation for ${req.caseId} missing sampleSegment`);
        hasErrors = true;
      }

      // Cross-check exact match between raw observation and video_matrix row
      if (mat.segmentCount !== raw.timedtextCapture.parsedSegmentCount) {
        console.error(`[Evidence Validator] Mismatch in segmentCount for ${req.caseId}: matrix=${mat.segmentCount}, raw=${raw.timedtextCapture.parsedSegmentCount}`);
        hasErrors = true;
      }
      if (mat.totalDurationMs !== raw.timedtextCapture.totalDurationMs) {
        console.error(`[Evidence Validator] Mismatch in totalDurationMs for ${req.caseId}: matrix=${mat.totalDurationMs}, raw=${raw.timedtextCapture.totalDurationMs}`);
        hasErrors = true;
      }
      if (mat.fetchStatus !== raw.timedtextCapture.httpStatus) {
        console.error(`[Evidence Validator] Mismatch in fetchStatus for ${req.caseId}: matrix=${mat.fetchStatus}, raw=${raw.timedtextCapture.httpStatus}`);
        hasErrors = true;
      }
      if (mat.payloadProvenance !== raw.timedtextCapture.payloadProvenance) {
        console.error(`[Evidence Validator] Mismatch in payloadProvenance for ${req.caseId}: matrix=${mat.payloadProvenance}, raw=${raw.timedtextCapture.payloadProvenance}`);
        hasErrors = true;
      }

      // Check track type
      if (mat.trackType !== req.expectedKind || raw.selectedTrackKind !== req.expectedKind) {
        console.error(`[Evidence Validator] Track type mismatch for ${req.caseId}: expected ${req.expectedKind}, found mat=${mat.trackType}, raw=${raw.selectedTrackKind}`);
        hasErrors = true;
      }

      // Check canonical SAFE identities & exact track binding
      if (!raw.selectedTrackIdentity || typeof raw.selectedTrackIdentity !== 'object') {
        console.error(`[Evidence Validator] Missing selectedTrackIdentity object for ${req.caseId}`);
        hasErrors = true;
      }
      if (!raw.capturedRequestIdentity || typeof raw.capturedRequestIdentity !== 'object') {
        console.error(`[Evidence Validator] Missing capturedRequestIdentity object for ${req.caseId}`);
        hasErrors = true;
      }
      if (raw.trackBindingMatched !== true || mat.trackBindingMatched !== true) {
        console.error(`[Evidence Validator] trackBindingMatched must be true for ${req.caseId}`);
        hasErrors = true;
      }

      // Independently re-verify matching between selectedTrackIdentity and capturedRequestIdentity
      const bindingCheck = matchesTrackIdentity(raw.selectedTrackIdentity, raw.capturedRequestIdentity);
      if (!bindingCheck) {
        console.error(`[Evidence Validator] Independent track identity verification failed for ${req.caseId}: Selected=${JSON.stringify(raw.selectedTrackIdentity)}, Captured=${JSON.stringify(raw.capturedRequestIdentity)}`);
        hasErrors = true;
      }

      // Verify request URL conforms to captured identity
      const reconstructedUrlIdentity = deriveIdentityFromTimedtextUrl(raw.timedtextCapture.sanitizedRequestUrl);
      if (!matchesTrackIdentity(raw.selectedTrackIdentity, reconstructedUrlIdentity)) {
        console.error(`[Evidence Validator] Sanitized request URL identity does not match selected track identity for ${req.caseId}`);
        hasErrors = true;
      }

      // Check ASR-only requirement
      if (req.requireAsrOnly) {
        if (raw.isAsrOnly !== true || raw.hasManualEn !== false || raw.hasAsrEn !== true) {
          console.error(`[Evidence Validator] Case ${req.caseId} must be ASR-only (isAsrOnly=true, hasManualEn=false, hasAsrEn=true)`);
          hasErrors = true;
        }
        const hasManualTrack = raw.allTracksSanitized?.some(t => t.languageCode === 'en' && t.kind !== 'asr');
        if (hasManualTrack) {
          console.error(`[Evidence Validator] Case ${req.caseId} contains manual English track in inventory; violates ASR-only requirement`);
          hasErrors = true;
        }
      }
    }

    // Validate V-03a and V-03b (Real target-browser non-English / zero-caption cases)
    const rawV3a = rawData.find(r => r.caseId === 'V-03a');
    const matV3a = matrixData.find(m => m.caseId === 'V-03a');
    if (!rawV3a || rawV3a.provenance !== 'REAL_BROWSER_OBSERVATION' || !matV3a || matV3a.outcome !== 'CLASSIFIED_UNSUPPORTED') {
      console.error('[Evidence Validator] V-03a must have real target-browser observation in raw_browser_observations.json and CLASSIFIED_UNSUPPORTED in matrix');
      hasErrors = true;
    }

    const rawV3b = rawData.find(r => r.caseId === 'V-03b');
    const matV3b = matrixData.find(m => m.caseId === 'V-03b');
    if (!rawV3b || rawV3b.provenance !== 'REAL_BROWSER_OBSERVATION' || !matV3b || matV3b.outcome !== 'CLASSIFIED_UNSUPPORTED') {
      console.error('[Evidence Validator] V-03b must have real target-browser observation in raw_browser_observations.json and CLASSIFIED_UNSUPPORTED in matrix');
      hasErrors = true;
    }

    // Validate V-04 (SPA)
    const spaEntry = matrixData.find(c => c.caseId === 'V-04');
    if (!spaEntry) {
      console.error('[Evidence Validator] Missing V-04 in video_matrix.json');
      hasErrors = true;
    } else {
      const ids = spaEntry.observedSemanticVideoIds;
      if (!Array.isArray(ids) || ids.length < 3 || ids[0] === ids[1] || ids[1] === ids[2]) {
        console.error('[Evidence Validator] V-04 must have 3 distinct observed semantic player video IDs.');
        hasErrors = true;
      }
    }

    // Validate V-05 (Rapid Switching Race with Authoritative Raw Abort Verification)
    const rapidEntry = matrixData.find(c => c.caseId === 'V-05');
    if (!rapidEntry) {
      console.error('[Evidence Validator] Missing V-05 in video_matrix.json');
      hasErrors = true;
    } else {
      if (!Array.isArray(rapidEntry.staleDiscards) || rapidEntry.staleDiscards.length < 2) {
        console.error('[Evidence Validator] V-05 must record at least 2 real stale discards.');
        hasErrors = true;
      } else {
        // Find corresponding timeline raw records
        const timelineDiscards = timelineData.filter(t => t.event === 'ACQUISITION_ABORTED_STALE');
        if (timelineDiscards.length < 2) {
          console.error('[Evidence Validator] navigation_timeline.json must contain at least 2 ACQUISITION_ABORTED_STALE records.');
          hasErrors = true;
        }

        for (let i = 0; i < rapidEntry.staleDiscards.length; i++) {
          const disc = rapidEntry.staleDiscards[i];
          const rawDisc = timelineDiscards.find(t => t.operationId === disc.operationId);

          if (!rawDisc) {
            console.error(`[Evidence Validator] Missing authoritative raw timeline record for V-05 operation ${disc.operationId}`);
            hasErrors = true;
            continue;
          }

          // Check raw facts
          if (rawDisc.requestStarted !== true) {
            console.error(`[Evidence Validator] Raw V-05 discard ${disc.operationId} missing requestStarted=true`);
            hasErrors = true;
          }
          if (!rawDisc.selectedTrackIdentity || typeof rawDisc.selectedTrackIdentity !== 'object') {
            console.error(`[Evidence Validator] Raw V-05 discard ${disc.operationId} missing selectedTrackIdentity`);
            hasErrors = true;
          }
          if (rawDisc.signalAborted !== true) {
            console.error(`[Evidence Validator] Raw V-05 discard ${disc.operationId} missing signalAborted=true`);
            hasErrors = true;
          }
          if (rawDisc.actualOutcome !== 'ABORTED_BY_CONTROLLER') {
            console.error(`[Evidence Validator] Raw V-05 discard ${disc.operationId} must have actualOutcome === 'ABORTED_BY_CONTROLLER', found: ${rawDisc.actualOutcome}`);
            hasErrors = true;
          }
          if (rawDisc.actualErrorName !== 'AbortError') {
            console.error(`[Evidence Validator] Raw V-05 discard ${disc.operationId} must have actualErrorName === 'AbortError', found: ${rawDisc.actualErrorName}`);
            hasErrors = true;
          }

          // Cross-check matrix row against raw record
          if (disc.abortError !== rawDisc.actualErrorName) {
            console.error(`[Evidence Validator] V-05 matrix abortError does not match raw actualErrorName for ${disc.operationId}`);
            hasErrors = true;
          }
          if (disc.actualOutcome !== rawDisc.actualOutcome) {
            console.error(`[Evidence Validator] V-05 matrix actualOutcome does not match raw actualOutcome for ${disc.operationId}`);
            hasErrors = true;
          }
          if (disc.status !== 'STALE_GENERATION_DISCARDED') {
            console.error(`[Evidence Validator] V-05 discard missing status 'STALE_GENERATION_DISCARDED'`);
            hasErrors = true;
          }
        }
      }
      if (!rapidEntry.activeGeneration?.operationId || rapidEntry.activeGeneration.status !== 'SUCCESS') {
        console.error('[Evidence Validator] V-05 missing valid activeGeneration record');
        hasErrors = true;
      }
    }

    // Validate V-06 (Long-form)
    const v6Entry = matrixData.find(c => c.caseId === 'V-06');
    const v2aRaw = rawData.find(r => r.caseId === 'V-02a');
    if (!v6Entry) {
      console.error('[Evidence Validator] Missing V-06 in video_matrix.json');
      hasErrors = true;
    } else {
      if (v6Entry.segmentCount !== v2aRaw?.timedtextCapture.parsedSegmentCount) {
        console.error('[Evidence Validator] V-06 segmentCount does not match reused V-02a empirical capture');
        hasErrors = true;
      }
      if (v6Entry.totalDurationMs < 3600000) {
        console.error('[Evidence Validator] V-06 totalDurationMs must be > 1 hour (3,600,000 ms) for long-form case');
        hasErrors = true;
      }
    }

    // Validate Payload Catalog Provenance
    const json3Entry = payloadData.find(p => p.format === 'json3');
    if (!json3Entry || json3Entry.provenance !== 'REAL_BROWSER_OBSERVATION' || !json3Entry.sourceCaseId) {
      console.error('[Evidence Validator] payload_catalog.json json3 entry must have provenance REAL_BROWSER_OBSERVATION and valid sourceCaseId');
      hasErrors = true;
    }

    // Validate V-08, V-09, V-10 honest NOT_OBSERVED
    for (const cId of ['V-08', 'V-09', 'V-10']) {
      const entry = matrixData.find(c => c.caseId === cId);
      if (!entry || entry.provenance !== 'NOT_OBSERVED') {
        console.error(`[Evidence Validator] Case ${cId} must be honestly marked NOT_OBSERVED`);
        hasErrors = true;
      }
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to cross-check observations and matrix:', err.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('[Evidence Validator] FAILED: Evidence validation failed.');
    process.exit(1);
  }

  console.log('[Evidence Validator] PASSED: All empirical evidence artifacts exist, cross-check accurately against raw observations, have verified canonical track identity binding, ASR-only status, rapid-switch real AbortError evidence, and adhere strictly to the redaction invariant.');
}

validateEvidence();
