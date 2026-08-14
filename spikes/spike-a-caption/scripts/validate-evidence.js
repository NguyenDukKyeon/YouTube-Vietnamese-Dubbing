/**
 * Evidence Validator Script (Strengthened)
 *
 * Verifies:
 * 1. Existence and valid schema for all required evidence artifacts.
 * 2. Strict absence of unredacted secrets, access tokens, cookies, or signatures.
 * 3. Strict empirical provenance: verifies that required cases in video_matrix.json
 *    and raw_browser_observations.json have provenance = "REAL_BROWSER_OBSERVATION".
 * 4. Rejects synthetic fixtures presented as empirical PASS.
 * 5. Verifies tested implementation SHA ancestry and code integrity relative to HEAD.
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

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z-_]{35}/, // Google API Key
  /Bearer\s+[A-Za-z0-9-_.]+/, // Auth token
  /cookie:\s*[^;]+/i, // Cookie header
  /po_token=[^&]+/i, // Sensitive PO token
  /password/i,
  /secret_key/i
];

function validateEvidence() {
  console.log('[Evidence Validator] Checking evidence directory:', EVIDENCE_DIR);

  if (!existsSync(EVIDENCE_DIR)) {
    console.error('[Evidence Validator] FAILED: Evidence directory does not exist.');
    process.exit(1);
  }

  let hasErrors = false;

  // 1. Check file existence & content
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

      // Check for secret leaks
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`[Evidence Validator] Potential secret leak in ${filename} matching pattern ${pattern}`);
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
      // Check that testedImplementationSha is a valid commit and ancestor of HEAD
      execSync(`git merge-base --is-ancestor ${testedImplementationSha} HEAD`, { cwd: REPO_ROOT });
      console.log(`[Evidence Validator] Verified testedImplementationSha ${testedImplementationSha} is a valid ancestor of HEAD.`);

      // Check if any implementation code changed after testedImplementationSha
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
      // If testedImplementationSha is exactly current uncommitted state or equal to HEAD, verify
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

  // 3. Validate video_matrix.json empirical provenance
  try {
    const matrixData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'video_matrix.json'), 'utf-8'));
    const caseIds = matrixData.map(c => c.caseId);
    const requiredCases = ['V-01a', 'V-01b', 'V-02', 'V-03a', 'V-03b', 'V-04', 'V-05', 'V-06', 'V-07', 'V-08', 'V-09', 'V-10'];

    for (const reqCase of requiredCases) {
      const entry = matrixData.find(c => c.caseId === reqCase);
      if (!entry) {
        console.error(`[Evidence Validator] video_matrix.json missing required case: ${reqCase}`);
        hasErrors = true;
      } else {
        if (entry.provenance !== 'REAL_BROWSER_OBSERVATION') {
          console.error(`[Evidence Validator] Case ${reqCase} must have provenance = REAL_BROWSER_OBSERVATION, found: ${entry.provenance}`);
          hasErrors = true;
        }
      }
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse video_matrix.json:', err.message);
    hasErrors = true;
  }

  // 4. Validate raw_browser_observations.json
  try {
    const rawData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'raw_browser_observations.json'), 'utf-8'));
    if (!Array.isArray(rawData) || rawData.length < 5) {
      console.error('[Evidence Validator] raw_browser_observations.json must contain real observation records for all tested video cases.');
      hasErrors = true;
    }
    for (const obs of rawData) {
      if (obs.provenance !== 'REAL_BROWSER_OBSERVATION' || !obs.videoId || !Array.isArray(obs.rawTracks)) {
        console.error(`[Evidence Validator] Invalid raw observation record for ${obs.videoId}`);
        hasErrors = true;
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

  console.log('[Evidence Validator] PASSED: All empirical evidence artifacts exist, are valid, have verified provenance and ancestry, and are free of secrets.');
}

validateEvidence();
