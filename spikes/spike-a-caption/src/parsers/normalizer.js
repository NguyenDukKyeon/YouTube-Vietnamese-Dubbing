/**
 * Normalizer & Monotonicity Validator
 *
 * Converts raw parsed segments into canonical format, normalizes whitespace and
 * HTML entities conservatively, validates timing monotonicity, and records anomalies.
 */

/**
 * Conservative HTML entity decoding (without DOM requirement for Node/testing compatibility).
 * @param {string} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Cleans text without altering semantics.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  const decoded = decodeHtmlEntities(text);
  // Replace internal newlines with space, collapse multiple whitespace, trim
  return decoded.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes raw segments into CanonicalCaptionSegment[] and builds TimingSummary.
 * Records anomalies (backward jumps, inverted intervals, overlaps) rather than silently rewriting.
 *
 * @param {Array<{ startMs: number, endMs: number, text: string }>} rawSegments
 * @returns {{ segments: Array<{ startMs: number, endMs: number, text: string }>, timingSummary: import('../types.js').TimingSummary }}
 */
export function normalizeAndValidateSegments(rawSegments) {
  if (!Array.isArray(rawSegments)) {
    throw new Error('rawSegments must be an array');
  }

  /** @type {Array<{ startMs: number, endMs: number, text: string }>} */
  const segments = [];
  /** @type {import('../types.js').TimingAnomaly[]} */
  const anomalies = [];
  let isMonotonic = true;
  let prevStartMs = -1;
  let prevEndMs = -1;
  let maxEndMs = 0;

  for (let i = 0; i < rawSegments.length; i++) {
    const item = rawSegments[i];
    const rawStart = Number(item.startMs);
    const rawEnd = Number(item.endMs);
    const text = normalizeText(item.text);

    // Filter out completely empty segments (often blank whitespace markers in ASR)
    if (!text) {
      continue;
    }

    if (isNaN(rawStart) || isNaN(rawEnd)) {
      anomalies.push({
        index: i,
        issue: 'NON_NUMERIC_TIMESTAMP',
        startMs: rawStart,
        endMs: rawEnd
      });
      continue;
    }

    const startMs = Math.round(rawStart);
    const endMs = Math.round(rawEnd);

    // Check inverted interval (startMs > endMs)
    if (startMs > endMs) {
      anomalies.push({
        index: i,
        issue: 'INVERTED_INTERVAL',
        startMs,
        endMs
      });
    }

    // Check monotonicity of start times
    if (prevStartMs !== -1 && startMs < prevStartMs) {
      isMonotonic = false;
      anomalies.push({
        index: i,
        issue: 'BACKWARD_START_TIME',
        startMs,
        endMs,
        prevEndMs
      });
    }

    // Check if segment starts before previous segment ended (overlap)
    if (prevEndMs !== -1 && startMs < prevEndMs) {
      anomalies.push({
        index: i,
        issue: 'OVERLAPPING_SEGMENT',
        startMs,
        endMs,
        prevEndMs
      });
    }

    segments.push({
      startMs,
      endMs,
      text
    });

    prevStartMs = startMs;
    prevEndMs = endMs;
    if (endMs > maxEndMs) {
      maxEndMs = endMs;
    }
  }

  const timingSummary = {
    totalSegments: segments.length,
    totalDurationMs: maxEndMs,
    isMonotonic,
    anomalies
  };

  return { segments, timingSummary };
}
