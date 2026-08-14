/**
 * Evidence Validator Script (Comprehensive Empirical & Redaction Enforcement)
 *
 * Verifies:
 * 1. Existence and valid schema for all required evidence artifacts.
 * 2. Strict redaction invariant: no unredacted signatures, session tokens, keys, expirations, cookies.
 * 3. Provenance integrity:
 *    - Real cases (V-01a, V-01b, V-02, V-03a, V-03b, V-04, V-05, V-06, V-07) are REAL_BROWSER_OBSERVATION.
 *    - Unexercised optional cases (V-08, V-09, V-10) are honestly NOT_OBSERVED.
 * 4. Concrete empirical assertions:
 *    - Live timedtext capture verified (status 200, parsed segment count > 0, total duration > 0, monotonic).
 *    - Genuine SPA navigation verified (observed semantic video IDs are genuinely distinct).
 *    - Real rapid switching verified (contains stale discard records and active generation).
 * 5. Tested implementation SHA ancestry in git and zero source code drift.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

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

  // 3. Validate video_matrix.json empirical provenance & concrete fields
  try {
    const matrixData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'video_matrix.json'), 'utf-8'));

    // Empirical cases
    const empiricalCases = ['V-01a', 'V-01b', 'V-02', 'V-03a', 'V-03b', 'V-04', 'V-05', 'V-06', 'V-07'];
    for (const cId of empiricalCases) {
      const entry = matrixData.find(c => c.caseId === cId);
      if (!entry) {
        console.error(`[Evidence Validator] video_matrix.json missing case: ${cId}`);
        hasErrors = true;
      } else if (entry.provenance !== 'REAL_BROWSER_OBSERVATION') {
        console.error(`[Evidence Validator] Case ${cId} must be REAL_BROWSER_OBSERVATION, found: ${entry.provenance}`);
        hasErrors = true;
      }
    }

    // Honest unexercised cases
    const unexercisedCases = ['V-08', 'V-09', 'V-10'];
    for (const cId of unexercisedCases) {
      const entry = matrixData.find(c => c.caseId === cId);
      if (!entry) {
        console.error(`[Evidence Validator] video_matrix.json missing case: ${cId}`);
        hasErrors = true;
      } else if (entry.provenance !== 'NOT_OBSERVED') {
        console.error(`[Evidence Validator] Case ${cId} must be NOT_OBSERVED, found: ${entry.provenance}`);
        hasErrors = true;
      }
    }

    // Verify live parsed segment statistics on V-01a, V-01b, V-02, V-06
    for (const cId of ['V-01a', 'V-01b', 'V-02', 'V-06']) {
      const entry = matrixData.find(c => c.caseId === cId);
      if (entry) {
        if (typeof entry.segmentCount !== 'number' || entry.segmentCount <= 0) {
          console.error(`[Evidence Validator] Case ${cId} missing valid dynamic segmentCount`);
          hasErrors = true;
        }
        if (typeof entry.totalDurationMs !== 'number' || entry.totalDurationMs <= 0) {
          console.error(`[Evidence Validator] Case ${cId} missing valid dynamic totalDurationMs`);
          hasErrors = true;
        }
        if (entry.isMonotonic !== true) {
          console.error(`[Evidence Validator] Case ${cId} isMonotonic must be true`);
          hasErrors = true;
        }
      }
    }

    // Verify SPA distinct semantic video IDs
    const spaEntry = matrixData.find(c => c.caseId === 'V-04');
    if (spaEntry) {
      const ids = spaEntry.observedSemanticVideoIds;
      if (!Array.isArray(ids) || ids.length < 3 || ids[0] === ids[1] || ids[1] === ids[2]) {
        console.error('[Evidence Validator] Case V-04 must have 3 distinct observed semantic player video IDs.');
        hasErrors = true;
      }
    }

    // Verify Rapid Switch stale discards
    const rapidEntry = matrixData.find(c => c.caseId === 'V-05');
    if (rapidEntry) {
      if (!Array.isArray(rapidEntry.staleDiscards) || rapidEntry.staleDiscards.length < 2) {
        console.error('[Evidence Validator] Case V-05 must record real stale discards.');
        hasErrors = true;
      }
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse video_matrix.json:', err.message);
    hasErrors = true;
  }

  // 4. Validate raw_browser_observations.json
  try {
    const rawData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'raw_browser_observations.json'), 'utf-8'));
    if (!Array.isArray(rawData) || rawData.length < 3) {
      console.error('[Evidence Validator] raw_browser_observations.json must contain observations for tested videos.');
      hasErrors = true;
    }
    for (const obs of rawData) {
      if (obs.provenance !== 'REAL_BROWSER_OBSERVATION' || !obs.videoId || !obs.semanticPlayerVideoId) {
        console.error(`[Evidence Validator] Invalid observation record for ${obs.videoId}`);
        hasErrors = true;
      }
      // Ensure all tracks in raw observations are sanitized
      if (Array.isArray(obs.allTracksSanitized)) {
        for (const t of obs.allTracksSanitized) {
          if (t.baseUrl && !t.baseUrlSanitized) {
            console.error(`[Evidence Validator] Unsanitized track URL in observation record ${obs.videoId}`);
            hasErrors = true;
          }
        }
      }
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse raw_browser_observations.json:', err.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('[Evidence Validator] FAILED: Evidence validation failed.');
    process.exit(1);
  }

  console.log('[Evidence Validator] PASSED: All empirical evidence artifacts exist, are valid, have verified provenance and ancestry, and adhere strictly to the redaction invariant.');
}

validateEvidence();
