/**
 * WebVTT TimedText Parser
 *
 * Handles WebVTT timedtext format from YouTube (&fmt=vtt).
 */

import { normalizeAndValidateSegments, decodeHtmlEntities } from './normalizer.js';

/**
 * Parses timestamp string "HH:MM:SS.mmm" or "MM:SS.mmm" to milliseconds.
 * @param {string} ts
 * @returns {number}
 */
function parseVttTimestamp(ts) {
  const parts = ts.trim().split(':');
  let seconds = 0;
  if (parts.length === 3) {
    seconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    seconds = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else {
    seconds = parseFloat(parts[0]);
  }
  return Math.round(seconds * 1000);
}

/**
 * Parses WebVTT payload string into canonical segments.
 *
 * @param {string} vttString
 * @returns {{ segments: Array<{ startMs: number, endMs: number, text: string }>, timingSummary: import('../types.js').TimingSummary }}
 */
export function parseVtt(vttString) {
  if (typeof vttString !== 'string' || !vttString.trim().startsWith('WEBVTT')) {
    throw new Error('MALFORMED_VTT_PAYLOAD: Payload does not start with WEBVTT header');
  }

  const rawSegments = [];
  const lines = vttString.split(/\r?\n/);
  let i = 0;

  // Skip header lines until first empty line or first cue
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const match = line.match(/((?:\d+:)?\d+:\d+\.\d+)\s+-->\s+((?:\d+:)?\d+:\d+\.\d+)/);
      if (match) {
        const startMs = parseVttTimestamp(match[1]);
        const endMs = parseVttTimestamp(match[2]);

        i++;
        let cueText = '';
        while (i < lines.length && lines[i].trim() !== '') {
          const contentLine = lines[i].trim();
          // Skip header/note/cue identifier lines
          if (contentLine && !contentLine.includes('-->')) {
            cueText += (cueText ? ' ' : '') + contentLine;
          }
          i++;
        }

        // Clean tags like <c.color> or voice markers <v Name>
        const cleanText = cueText.replace(/<[^>]+>/g, '');

        if (cleanText) {
          rawSegments.push({
            startMs,
            endMs,
            text: decodeHtmlEntities(cleanText)
          });
        }
      }
    }
    i++;
  }

  return normalizeAndValidateSegments(rawSegments);
}
