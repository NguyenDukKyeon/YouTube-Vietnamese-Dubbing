/**
 * YouTube TimedText Fetcher & Format Negotiator
 *
 * Fetches caption payloads from YouTube's timedtext endpoint, negotiates formats
 * (preferring json3), handles HTTP 403/429/network errors with explicit stage classification,
 * and passes content to appropriate parsers.
 */

import { parseJson3 } from '../parsers/json3-parser.js';
import { parseXml } from '../parsers/xml-parser.js';
import { parseVtt } from '../parsers/vtt-parser.js';
import { AcquisitionStatus, PayloadFormat } from '../types.js';

/**
 * Ensures baseUrl includes requested format parameter.
 * @param {string} baseUrl
 * @param {string} fmt
 * @returns {string}
 */
export function buildFormatUrl(baseUrl, fmt) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('fmt', fmt);
    return url.toString();
  } catch {
    // If not a valid absolute URL, append format query param
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}fmt=${fmt}`;
  }
}

/**
 * Fetches and parses caption payload for a given track.
 *
 * @param {import('../types.js').RawCaptionTrack} rawTrack
 * @param {import('../types.js').TrackMetadata} trackMeta
 * @param {Object} [options]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeoutMs=8000]
 * @param {typeof fetch} [options.fetchFn=globalThis.fetch]
 * @returns {Promise<{
 *   status: string,
 *   segments?: Array<{ startMs: number, endMs: number, text: string }>,
 *   timingSummary?: import('../types.js').TimingSummary,
 *   formatUsed: string,
 *   rawPayloadSample?: string,
 *   errorMessage?: string,
 *   errorStage?: string,
 *   httpStatusCode?: number
 * }>}
 */
export async function fetchAndParseCaptions(rawTrack, trackMeta, options = {}) {
  const { signal, timeoutMs = 8000, fetchFn = globalThis.fetch } = options;

  if (!rawTrack || !rawTrack.baseUrl) {
    return {
      status: AcquisitionStatus.MALFORMED_PAYLOAD,
      errorStage: 'PRE_FETCH',
      errorMessage: 'Missing baseUrl in track'
    };
  }

  // Set up timeout + abort handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('TIMEOUT')), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason));
  }

  // Attempt 1: json3 format
  const json3Url = buildFormatUrl(rawTrack.baseUrl, 'json3');

  try {
    const response = await fetchFn(json3Url, {
      method: 'GET',
      credentials: 'same-origin',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 403) {
      return {
        status: AcquisitionStatus.HTTP_403_FORBIDDEN,
        errorStage: 'FETCH_JSON3',
        httpStatusCode: 403,
        errorMessage: 'HTTP 403 Forbidden from YouTube timedtext endpoint'
      };
    }

    if (response.status === 429) {
      return {
        status: AcquisitionStatus.HTTP_429_RATE_LIMITED,
        errorStage: 'FETCH_JSON3',
        httpStatusCode: 429,
        errorMessage: 'HTTP 429 Rate Limited from YouTube timedtext endpoint'
      };
    }

    if (!response.ok) {
      return {
        status: AcquisitionStatus.NETWORK_ERROR,
        errorStage: 'FETCH_JSON3',
        httpStatusCode: response.status,
        errorMessage: `HTTP ${response.status} ${response.statusText}`
      };
    }

    const rawText = await response.text();

    // Check if empty response
    if (!rawText || !rawText.trim()) {
      return {
        status: AcquisitionStatus.MALFORMED_PAYLOAD,
        errorStage: 'PARSE_JSON3',
        errorMessage: 'Received empty response body from timedtext endpoint'
      };
    }

    // Try parsing as json3
    try {
      const parsed = parseJson3(rawText);
      return {
        status: AcquisitionStatus.SUCCESS,
        segments: parsed.segments,
        timingSummary: parsed.timingSummary,
        formatUsed: PayloadFormat.JSON3,
        rawPayloadSample: rawText.substring(0, 300)
      };
    } catch (parseErr) {
      // If server returned XML or fallback despite requesting json3
      if (rawText.trim().startsWith('<')) {
        try {
          const parsedXml = parseXml(rawText);
          return {
            status: AcquisitionStatus.SUCCESS,
            segments: parsedXml.segments,
            timingSummary: parsedXml.timingSummary,
            formatUsed: PayloadFormat.XML,
            rawPayloadSample: rawText.substring(0, 300)
          };
        } catch (xmlErr) {
          return {
            status: AcquisitionStatus.MALFORMED_PAYLOAD,
            errorStage: 'PARSE_FALLBACK_XML',
            errorMessage: `Failed parsing XML fallback: ${xmlErr.message}`,
            rawPayloadSample: rawText.substring(0, 300)
          };
        }
      }

      return {
        status: AcquisitionStatus.MALFORMED_PAYLOAD,
        errorStage: 'PARSE_JSON3',
        errorMessage: parseErr.message,
        rawPayloadSample: rawText.substring(0, 300)
      };
    }
  } catch (fetchErr) {
    clearTimeout(timeoutId);

    if (signal && signal.aborted) {
      return {
        status: AcquisitionStatus.STALE_GENERATION_DISCARDED,
        errorStage: 'FETCH_ABORTED',
        errorMessage: 'Request aborted due to generation change'
      };
    }

    return {
      status: AcquisitionStatus.NETWORK_ERROR,
      errorStage: 'FETCH_EXCEPTION',
      errorMessage: fetchErr.message
    };
  }
}
