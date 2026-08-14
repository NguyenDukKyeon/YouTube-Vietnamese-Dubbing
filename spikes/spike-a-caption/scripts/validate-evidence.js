/**
 * Evidence Validator Script
 *
 * Verifies that all required evidence artifacts exist, match schema requirements,
 * contain required validation matrix entries, and contain zero unredacted secrets or tokens.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  // 1. Check file existence
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

  // 2. Validate environment.json structure
  try {
    const envData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'environment.json'), 'utf-8'));
    if (!envData.task || !envData.os || !envData.chromeVersion || !envData.headSha) {
      console.error('[Evidence Validator] environment.json is missing required fields (task, os, chromeVersion, headSha)');
      hasErrors = true;
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse environment.json:', err.message);
    hasErrors = true;
  }

  // 3. Validate video_matrix.json entries
  try {
    const matrixData = JSON.parse(readFileSync(join(EVIDENCE_DIR, 'video_matrix.json'), 'utf-8'));
    const caseIds = matrixData.map(c => c.caseId);
    const requiredCases = ['V-01a', 'V-01b', 'V-02', 'V-03a', 'V-03b', 'V-04', 'V-05', 'V-06', 'V-07', 'V-08', 'V-09', 'V-10'];
    for (const reqCase of requiredCases) {
      if (!caseIds.includes(reqCase)) {
        console.error(`[Evidence Validator] video_matrix.json is missing required case: ${reqCase}`);
        hasErrors = true;
      }
    }
  } catch (err) {
    console.error('[Evidence Validator] Failed to parse video_matrix.json:', err.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('[Evidence Validator] FAILED: Evidence validation failed.');
    process.exit(1);
  }

  console.log('[Evidence Validator] PASSED: All evidence artifacts exist, are valid, and free of secrets.');
}

validateEvidence();
