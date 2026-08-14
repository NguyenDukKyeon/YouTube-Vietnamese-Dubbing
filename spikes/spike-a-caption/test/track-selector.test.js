import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectBestEnglishTrack,
  isAsrTrack,
  isEnglishLanguage,
  sanitizeTrackUrl,
  extractTrackName,
  deriveTrackIdentityFromTrack,
  deriveIdentityFromTimedtextUrl,
  matchesTrackIdentity
} from '../src/extractor/track-selector.js';
import { TrackKind } from '../src/types.js';

test('isEnglishLanguage recognizes English language codes', () => {
  assert.equal(isEnglishLanguage('en'), true);
  assert.equal(isEnglishLanguage('en-US'), true);
  assert.equal(isEnglishLanguage('en-GB'), true);
  assert.equal(isEnglishLanguage('vi'), false);
  assert.equal(isEnglishLanguage('ja'), false);
  assert.equal(isEnglishLanguage(''), false);
});

test('isAsrTrack accurately identifies auto-generated tracks', () => {
  assert.equal(isAsrTrack({ kind: 'asr' }), true);
  assert.equal(isAsrTrack({ vssId: 'a.en' }), true);
  assert.equal(isAsrTrack({ name: { simpleText: 'English (auto-generated)' } }), true);
  assert.equal(isAsrTrack({ vssId: '.en', kind: undefined, name: { simpleText: 'English' } }), false);
});

test('sanitizeTrackUrl strips sensitive query params while preserving video and lang', () => {
  const rawUrl = 'https://www.youtube.com/api/timedtext?v=abc12345&lang=en&name=en&expire=1712345678&signature=SECRET_SIG&key=SECRET_KEY&po_token=SECRET_PO';
  const sanitized = sanitizeTrackUrl(rawUrl);

  assert.ok(sanitized.includes('v=abc12345'));
  assert.ok(sanitized.includes('lang=en'));
  assert.ok(!sanitized.includes('SECRET_SIG'));
  assert.ok(!sanitized.includes('SECRET_KEY'));
  assert.ok(!sanitized.includes('SECRET_PO'));
  assert.ok(sanitized.includes('[REDACTED]'));
});

test('selectBestEnglishTrack prioritizes manual English track over ASR English', () => {
  const tracks = [
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=vi',
      vssId: '.vi',
      languageCode: 'vi',
      name: { simpleText: 'Vietnamese' }
    },
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en&kind=asr',
      vssId: 'a.en',
      languageCode: 'en',
      kind: 'asr',
      name: { simpleText: 'English (auto-generated)' }
    },
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en',
      vssId: '.en',
      languageCode: 'en',
      name: { simpleText: 'English' }
    }
  ];

  const result = selectBestEnglishTrack(tracks);

  assert.ok(result.selectedTrack);
  assert.equal(result.selectedTrack.kind, TrackKind.MANUAL);
  assert.equal(result.selectedTrack.languageCode, 'en');
  assert.equal(result.selectedTrack.vssId, '.en');
  assert.equal(result.reason, null);
});

test('selectBestEnglishTrack falls back to ASR English when manual English is absent', () => {
  const tracks = [
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=es',
      vssId: '.es',
      languageCode: 'es',
      name: { simpleText: 'Spanish' }
    },
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en&kind=asr',
      vssId: 'a.en',
      languageCode: 'en',
      kind: 'asr',
      name: { simpleText: 'English (auto-generated)' }
    }
  ];

  const result = selectBestEnglishTrack(tracks);

  assert.ok(result.selectedTrack);
  assert.equal(result.selectedTrack.kind, TrackKind.ASR);
  assert.equal(result.selectedTrack.vssId, 'a.en');
});

test('selectBestEnglishTrack returns classified failure when no English tracks exist', () => {
  const tracks = [
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=vi',
      vssId: '.vi',
      languageCode: 'vi',
      name: { simpleText: 'Tiếng Việt' }
    },
    {
      baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=ja',
      vssId: '.ja',
      languageCode: 'ja',
      name: { simpleText: 'Japanese' }
    }
  ];

  const result = selectBestEnglishTrack(tracks);

  assert.equal(result.selectedTrack, null);
  assert.equal(result.reason, 'NO_USABLE_ENGLISH_CAPTIONS');
  assert.equal(result.allTracks.length, 2);
});

test('selectBestEnglishTrack handles empty or null track list', () => {
  const result1 = selectBestEnglishTrack([]);
  assert.equal(result1.selectedTrack, null);
  assert.equal(result1.reason, 'NO_CAPTION_TRACKS_IN_METADATA');

  const result2 = selectBestEnglishTrack(null);
  assert.equal(result2.selectedTrack, null);
  assert.equal(result2.reason, 'NO_CAPTION_TRACKS_IN_METADATA');
});

test('deriveTrackIdentityFromTrack and deriveIdentityFromTimedtextUrl produce canonical identities', () => {
  const rawTrack = {
    languageCode: 'en',
    vssId: '.en.nP7-2PuUl7o',
    baseUrl: 'https://www.youtube.com/api/timedtext?v=kJQP7kiw5Fk&lang=en&name=en&expire=123&signature=SECRET'
  };
  const trackId = deriveTrackIdentityFromTrack(rawTrack, 'kJQP7kiw5Fk');
  assert.deepEqual(trackId, {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en',
    kind: 'manual',
    vssId: '.en.nP7-2PuUl7o',
    name: 'en',
    variant: null
  });

  const reqUrl = 'https://www.youtube.com/api/timedtext?v=kJQP7kiw5Fk&lang=en&name=en&expire=999';
  const reqId = deriveIdentityFromTimedtextUrl(reqUrl);
  assert.deepEqual(reqId, {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en',
    kind: 'manual',
    vssId: null,
    name: 'en',
    variant: null
  });
  assert.equal(matchesTrackIdentity(trackId, reqId), true);
});

test('matchesTrackIdentity rejects mismatched language variants (V-01b multi-track regression)', () => {
  const selectedVariant = {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en',
    kind: 'manual',
    vssId: '.en.nP7-2PuUl7o',
    name: 'en',
    variant: null
  };

  // Mismatched regional lang or name variant
  const capturedRegional = {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en-US',
    kind: 'manual',
    vssId: null,
    name: 'English - United States',
    variant: null
  };
  assert.equal(matchesTrackIdentity(selectedVariant, capturedRegional), false);

  // Mismatched kind (ASR vs manual)
  const capturedAsr = {
    videoId: 'kJQP7kiw5Fk',
    languageCode: 'en',
    kind: 'asr',
    vssId: null,
    name: 'en',
    variant: null
  };
  assert.equal(matchesTrackIdentity(selectedVariant, capturedAsr), false);
});

