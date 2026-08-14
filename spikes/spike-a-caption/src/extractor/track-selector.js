/**
 * YouTube Caption Track Selector
 *
 * Inspects player caption tracklist, differentiates manual vs ASR tracks,
 * selects the highest-priority usable English track, or classifies why no English track is available.
 */

import { TrackKind } from '../types.js';

/**
 * Extracts a readable track name from YouTube name field.
 * @param {object} nameField
 * @returns {string}
 */
export function extractTrackName(nameField) {
  if (!nameField) return '';
  if (typeof nameField === 'string') return nameField;
  if (typeof nameField.simpleText === 'string') return nameField.simpleText;
  if (Array.isArray(nameField.runs) && nameField.runs.length > 0) {
    return nameField.runs.map(r => r.text || '').join('');
  }
  return '';
}

/**
 * Determines if a track is auto-generated (ASR) based on YouTube internal metadata markers.
 * @param {import('../types.js').RawCaptionTrack} track
 * @returns {boolean}
 */
export function isAsrTrack(track) {
  if (!track) return false;
  if (track.kind === 'asr') return true;
  if (typeof track.vssId === 'string' && track.vssId.startsWith('a.')) return true;
  const name = extractTrackName(track.name).toLowerCase();
  if (name.includes('auto-generated') || name.includes('(tự động)') || name.includes('generated')) {
    return true;
  }
  return false;
}

/**
 * Checks if a language code represents English.
 * @param {string} langCode
 * @returns {boolean}
 */
export function isEnglishLanguage(langCode) {
  if (!langCode || typeof langCode !== 'string') return false;
  const lower = langCode.toLowerCase();
  return lower === 'en' || lower.startsWith('en-') || lower.startsWith('en_');
}

/**
 * Sanitizes track URL for logging/evidence by stripping sensitive/ephemeral query tokens.
 * @param {string} rawUrl
 * @returns {string}
 */
export function sanitizeTrackUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const url = new URL(rawUrl);
    const paramParts = [];
    for (const [key, value] of url.searchParams.entries()) {
      if (['v', 'lang', 'name', 'fmt', 'subformat', 'type', 'kind', 'variant'].includes(key)) {
        paramParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      } else {
        paramParts.push(`${encodeURIComponent(key)}=[REDACTED]`);
      }
    }
    const query = paramParts.length > 0 ? `?${paramParts.join('&')}` : '';
    return `${url.origin}${url.pathname}${query}`;
  } catch {
    return '[INVALID_URL]';
  }
}

/**
 * Evaluates available tracks and selects the best English track.
 * Priority:
 * 1. Manual English track
 * 2. ASR English track
 *
 * @param {Array<import('../types.js').RawCaptionTrack>} rawTracks
 * @returns {{
 *   selectedTrack: import('../types.js').TrackMetadata | null,
 *   selectedRawTrack: import('../types.js').RawCaptionTrack | null,
 *   allTracks: Array<import('../types.js').TrackMetadata>,
 *   reason: string | null
 * }}
 */
export function selectBestEnglishTrack(rawTracks) {
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    return {
      selectedTrack: null,
      selectedRawTrack: null,
      allTracks: [],
      reason: 'NO_CAPTION_TRACKS_IN_METADATA'
    };
  }

  /** @type {Array<import('../types.js').TrackMetadata>} */
  const allTracks = [];
  /** @type {Array<{ meta: import('../types.js').TrackMetadata, raw: import('../types.js').RawCaptionTrack }>} */
  const manualEnglishCandidates = [];
  /** @type {Array<{ meta: import('../types.js').TrackMetadata, raw: import('../types.js').RawCaptionTrack }>} */
  const asrEnglishCandidates = [];

  for (let i = 0; i < rawTracks.length; i++) {
    const raw = rawTracks[i];
    if (!raw || !raw.baseUrl) continue;

    const name = extractTrackName(raw.name);
    const langCode = raw.languageCode || '';
    const asr = isAsrTrack(raw);
    const kind = asr ? TrackKind.ASR : TrackKind.MANUAL;
    const vssId = raw.vssId || '';

    const meta = {
      trackId: vssId || `track_${i}_${langCode}`,
      languageCode: langCode,
      name: name || (asr ? 'English (auto-generated)' : 'English'),
      kind,
      vssId,
      isTranslatable: Boolean(raw.isTranslatable),
      format: 'json3',
      sourceUrlSanitized: sanitizeTrackUrl(raw.baseUrl)
    };

    allTracks.push(meta);

    if (isEnglishLanguage(langCode)) {
      if (!asr) {
        manualEnglishCandidates.push({ meta, raw });
      } else {
        asrEnglishCandidates.push({ meta, raw });
      }
    }
  }

  // Priority 1: Manual English
  if (manualEnglishCandidates.length > 0) {
    // Prefer exact 'en' over regional 'en-US' / 'en-GB' if multiple exist
    const exact = manualEnglishCandidates.find(c => c.meta.languageCode.toLowerCase() === 'en');
    const selected = exact || manualEnglishCandidates[0];
    return {
      selectedTrack: selected.meta,
      selectedRawTrack: selected.raw,
      allTracks,
      reason: null
    };
  }

  // Priority 2: ASR English
  if (asrEnglishCandidates.length > 0) {
    const selected = asrEnglishCandidates[0];
    return {
      selectedTrack: selected.meta,
      selectedRawTrack: selected.raw,
      allTracks,
      reason: null
    };
  }

  return {
    selectedTrack: null,
    selectedRawTrack: null,
    allTracks,
    reason: 'NO_USABLE_ENGLISH_CAPTIONS'
  };
}

/**
 * Derives a canonical SAFE track identity from raw track metadata.
 * Contains only non-sensitive identifying fields.
 *
 * @param {object} track
 * @param {string} [videoId]
 * @returns {{
 *   videoId: string | null,
 *   languageCode: string,
 *   kind: 'manual' | 'asr',
 *   vssId: string | null,
 *   name: string | null,
 *   variant: string | null
 * } | null}
 */
export function deriveTrackIdentityFromTrack(track, videoId = null) {
  if (!track) return null;
  const asr = isAsrTrack(track);
  const kind = asr ? 'asr' : 'manual';
  let name = null;
  let variant = null;

  if (track.baseUrl) {
    try {
      const u = new URL(track.baseUrl);
      if (u.searchParams.has('name')) {
        name = u.searchParams.get('name');
      }
      if (u.searchParams.has('variant')) {
        variant = u.searchParams.get('variant');
      }
    } catch {
      // Ignore URL parsing failure
    }
  }

  return {
    videoId: videoId || null,
    languageCode: track.languageCode || '',
    kind,
    vssId: track.vssId || null,
    name: name || null,
    variant: variant || null
  };
}

/**
 * Derives a canonical SAFE request identity from a timedtext URL.
 *
 * @param {string} url
 * @returns {{
 *   videoId: string | null,
 *   languageCode: string | null,
 *   kind: 'manual' | 'asr',
 *   vssId: string | null,
 *   name: string | null,
 *   variant: string | null
 * } | null}
 */
export function deriveIdentityFromTimedtextUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const videoId = u.searchParams.get('v') || null;
    const languageCode = u.searchParams.get('lang') || null;
    const kind = u.searchParams.get('kind') === 'asr' ? 'asr' : 'manual';
    const name = u.searchParams.get('name') || null;
    const variant = u.searchParams.get('variant') || null;
    const vssId = u.searchParams.get('vss_id') || null;

    return {
      videoId,
      languageCode,
      kind,
      vssId,
      name,
      variant
    };
  } catch {
    return null;
  }
}

/**
 * Compares selected track identity and captured request identity.
 * Uniquely identifies that the request matches the exact selected track.
 *
 * @param {object} selectedId
 * @param {object} capturedId
 * @returns {boolean}
 */
export function matchesTrackIdentity(selectedId, capturedId) {
  if (!selectedId || !capturedId) return false;

  // 1. videoId exact match (if present in both)
  if (selectedId.videoId && capturedId.videoId && selectedId.videoId !== capturedId.videoId) {
    return false;
  }

  // 2. languageCode exact match
  if (!selectedId.languageCode || !capturedId.languageCode || selectedId.languageCode !== capturedId.languageCode) {
    return false;
  }

  // 3. kind exact match (manual vs asr)
  if (selectedId.kind !== capturedId.kind) {
    return false;
  }

  // 4. name exact match (distinguishing variant name)
  if (selectedId.name !== capturedId.name) {
    return false;
  }

  // 5. variant match where present in selected track
  if (selectedId.variant) {
    if (capturedId.variant !== selectedId.variant) {
      return false;
    }
  }

  // 6. vssId match if captured URL includes explicit vss_id
  if (selectedId.vssId && capturedId.vssId) {
    if (selectedId.vssId !== capturedId.vssId) {
      return false;
    }
  }

  return true;
}

