/**
 * YouTube JSON3 TimedText Parser
 *
 * Handles official YouTube json3 format (events array with tStartMs, dDurationMs, segs).
 */

import { normalizeAndValidateSegments } from './normalizer.js';

/**
 * Parses a YouTube JSON3 payload string or object into canonical segments.
 *
 * @param {string|object} rawInput
 * @returns {{ segments: Array<{ startMs: number, endMs: number, text: string }>, timingSummary: import('../types.js').TimingSummary }}
 */
export function parseJson3(rawInput) {
  let data = rawInput;
  if (typeof rawInput === 'string') {
    try {
      data = JSON.parse(rawInput);
    } catch (err) {
      throw new Error(`MALFORMED_JSON3_PAYLOAD: Failed to parse JSON: ${err.message}`);
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('MALFORMED_JSON3_PAYLOAD: Payload is not an object');
  }

  if (!Array.isArray(data.events)) {
    throw new Error('MALFORMED_JSON3_PAYLOAD: Missing events array');
  }

  const rawSegments = [];

  for (let i = 0; i < data.events.length; i++) {
    const event = data.events[i];
    if (!event || typeof event !== 'object') continue;

    // Some events might just be window commands or newlines without segs
    if (!Array.isArray(event.segs) || event.segs.length === 0) {
      continue;
    }

    const tStartMs = Number(event.tStartMs);
    const dDurationMs = Number(event.dDurationMs);

    if (isNaN(tStartMs)) {
      continue;
    }

    const duration = isNaN(dDurationMs) || dDurationMs < 0 ? 0 : dDurationMs;
    const endMs = tStartMs + duration;

    // Concatenate all segment pieces (preserving word spaces)
    let fullText = '';
    for (const seg of event.segs) {
      if (seg && typeof seg.utf8 === 'string') {
        fullText += seg.utf8;
      }
    }

    rawSegments.push({
      startMs: tStartMs,
      endMs,
      text: fullText
    });
  }

  return normalizeAndValidateSegments(rawSegments);
}
