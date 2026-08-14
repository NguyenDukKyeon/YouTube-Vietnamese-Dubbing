/**
 * Scope Validator Script
 *
 * Checks git status / diff against strict allowlist:
 * - spikes/spike-a-caption/**
 * - evidence/SPIKE-A-CAPTION/**
 */

import { execSync } from 'node:child_process';

const ALLOWED_PATTERNS = [
  /^spikes\/spike-a-caption\//,
  /^evidence\/SPIKE-A-CAPTION\//
];

function getChangedFiles() {
  try {
    const files = new Set();
    try {
      const output = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' });
      output.split(/\r?\n/).forEach(f => f.trim() && files.add(f.trim().replace(/\\/g, '/')));
    } catch {}

    const uncommitted = execSync('git status --porcelain -uall', { encoding: 'utf-8' });
    uncommitted.split(/\r?\n/).forEach(line => {
      if (line.length > 3) {
        const file = line.substring(3).trim().replace(/\\/g, '/');
        if (file) files.add(file);
      }
    });

    return Array.from(files);
  } catch (err) {
    return [];
  }
}

function validateScope() {
  const files = getChangedFiles();
  console.log('[Scope Validator] Checking changed files:', files);

  let hasDisallowed = false;
  for (const file of files) {
    const isAllowed = ALLOWED_PATTERNS.some(p => p.test(file));
    if (!isAllowed) {
      console.error(`[Scope Violation] File is outside strict allowlist: ${file}`);
      hasDisallowed = true;
    }
  }

  if (hasDisallowed) {
    console.error('[Scope Validator] FAILED: Scope violations detected.');
    process.exit(1);
  }

  console.log(`[Scope Validator] PASSED: All ${files.length} changed files are within strict allowlist.`);
}

validateScope();
