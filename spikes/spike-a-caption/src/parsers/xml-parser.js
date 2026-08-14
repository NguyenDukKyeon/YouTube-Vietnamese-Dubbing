/**
 * YouTube XML TimedText Parser
 *
 * Handles standard YouTube XML format (<transcript><text start="1.2" dur="3.4">...)
 * and timedtext / srv3 XML format (<timedtext><body><p t="1200" d="3400">...).
 */

import { normalizeAndValidateSegments, decodeHtmlEntities } from './normalizer.js';

/**
 * Parses a YouTube XML timedtext payload string into canonical segments.
 *
 * @param {string} xmlString
 * @returns {{ segments: Array<{ startMs: number, endMs: number, text: string }>, timingSummary: import('../types.js').TimingSummary }}
 */
export function parseXml(xmlString) {
  if (typeof xmlString !== 'string' || !xmlString.trim()) {
    throw new Error('MALFORMED_XML_PAYLOAD: Empty or invalid XML string');
  }

  const rawSegments = [];

  // Match <text start="..." dur="...">content</text>
  const textTagRegex = /<text\s+([^>]*?)>([\s\S]*?)<\/text>/gi;
  let textMatch;
  let matchedAny = false;

  while ((textMatch = textTagRegex.exec(xmlString)) !== null) {
    matchedAny = true;
    const attrString = textMatch[1];
    const rawContent = textMatch[2];

    const startMatch = /start="([\d.]+)"/i.exec(attrString);
    const durMatch = /dur="([\d.]+)"/i.exec(attrString);

    if (!startMatch) continue;

    const startSec = parseFloat(startMatch[1]);
    const durSec = durMatch ? parseFloat(durMatch[1]) : 0;

    const startMs = Math.round(startSec * 1000);
    const endMs = Math.round((startSec + durSec) * 1000);

    // Strip internal XML tags if any (e.g. <s>)
    const cleanedText = rawContent.replace(/<[^>]+>/g, '');

    rawSegments.push({
      startMs,
      endMs,
      text: decodeHtmlEntities(cleanedText)
    });
  }

  // If no <text> tags matched, check for <p t="..." d="..."> format
  if (!matchedAny) {
    const pTagRegex = /<p\s+([^>]*?)>([\s\S]*?)<\/p>/gi;
    let pMatch;

    while ((pMatch = pTagRegex.exec(xmlString)) !== null) {
      matchedAny = true;
      const attrString = pMatch[1];
      const rawContent = pMatch[2];

      const tMatch = /t="(\d+)"/i.exec(attrString);
      const dMatch = /d="(\d+)"/i.exec(attrString);

      if (!tMatch) continue;

      const tMs = parseInt(tMatch[1], 10);
      const dMs = dMatch ? parseInt(dMatch[1], 10) : 0;

      // Extract text content (e.g. from <s> elements inside <p>)
      const cleanedText = rawContent.replace(/<[^>]+>/g, '');

      rawSegments.push({
        startMs: tMs,
        endMs: tMs + dMs,
        text: decodeHtmlEntities(cleanedText)
      });
    }
  }

  if (!matchedAny && (xmlString.includes('<transcript') || xmlString.includes('<timedtext'))) {
    // Valid XML wrapper but empty transcript
    return normalizeAndValidateSegments([]);
  }

  if (!matchedAny) {
    throw new Error('MALFORMED_XML_PAYLOAD: No valid <text> or <p> timedtext nodes found');
  }

  return normalizeAndValidateSegments(rawSegments);
}
