/**
 * SPIKE-A-CAPTION Domain Types & Constants
 *
 * Defines canonical output formats, failure classifications, and track representations.
 */

export const TrackKind = {
  MANUAL: 'manual',
  ASR: 'asr'
};

export const PayloadFormat = {
  JSON3: 'json3',
  XML: 'xml',
  VTT: 'vtt',
  UNKNOWN: 'unknown'
};

export const AcquisitionStatus = {
  SUCCESS: 'SUCCESS',
  NO_USABLE_ENGLISH_CAPTIONS: 'NO_USABLE_ENGLISH_CAPTIONS',
  HTTP_403_FORBIDDEN: 'HTTP_403_FORBIDDEN',
  HTTP_429_RATE_LIMITED: 'HTTP_429_RATE_LIMITED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MALFORMED_PAYLOAD: 'MALFORMED_PAYLOAD',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  STALE_GENERATION_DISCARDED: 'STALE_GENERATION_DISCARDED',
  PLAYER_UNAVAILABLE: 'PLAYER_UNAVAILABLE'
};

/**
 * @typedef {Object} RawCaptionTrack
 * @property {string} baseUrl
 * @property {{ runs?: Array<{ text: string }>, simpleText?: string }} [name]
 * @property {string} [vssId]
 * @property {string} [languageCode]
 * @property {string} [kind]
 * @property {boolean} [isTranslatable]
 */

/**
 * @typedef {Object} TrackMetadata
 * @property {string} trackId
 * @property {string} languageCode
 * @property {string} name
 * @property {'manual'|'asr'} kind
 * @property {string} [vssId]
 * @property {boolean} isTranslatable
 * @property {string} format
 * @property {string} [sourceUrlSanitized]
 */

/**
 * @typedef {Object} CanonicalCaptionSegment
 * @property {number} startMs
 * @property {number} endMs
 * @property {string} text
 */

/**
 * @typedef {Object} TimingAnomaly
 * @property {number} index
 * @property {string} issue
 * @property {number} startMs
 * @property {number} endMs
 * @property {number} [prevEndMs]
 */

/**
 * @typedef {Object} TimingSummary
 * @property {number} totalSegments
 * @property {number} totalDurationMs
 * @property {boolean} isMonotonic
 * @property {TimingAnomaly[]} anomalies
 */

/**
 * @typedef {Object} CanonicalCaptionOutput
 * @property {string} status
 * @property {string} videoId
 * @property {number} generation
 * @property {TrackMetadata} [trackMetadata]
 * @property {CanonicalCaptionSegment[]} [segments]
 * @property {TimingSummary} [timingSummary]
 * @property {string} [errorMessage]
 * @property {string} [errorStage]
 * @property {number} [httpStatusCode]
 */
