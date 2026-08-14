import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchAndParseCaptions, buildFormatUrl } from '../src/extractor/caption-fetcher.js';
import { AcquisitionStatus, PayloadFormat } from '../src/types.js';

test('buildFormatUrl appends or updates fmt param', () => {
  assert.equal(
    buildFormatUrl('https://example.com/api?v=123', 'json3'),
    'https://example.com/api?v=123&fmt=json3'
  );
  assert.equal(
    buildFormatUrl('https://example.com/api?v=123&fmt=xml', 'json3'),
    'https://example.com/api?v=123&fmt=json3'
  );
});

test('fetchAndParseCaptions successfully fetches and parses JSON3 payload', async () => {
  const mockPayload = JSON.stringify({
    events: [
      { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Successful caption test.' }] }
    ]
  });

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => mockPayload
  });

  const rawTrack = { baseUrl: 'https://www.youtube.com/api/timedtext?v=test' };
  const trackMeta = { trackId: 'test', kind: 'manual', languageCode: 'en', name: 'English', format: 'json3', isTranslatable: true };

  const result = await fetchAndParseCaptions(rawTrack, trackMeta, { fetchFn: mockFetch });

  assert.equal(result.status, AcquisitionStatus.SUCCESS);
  assert.equal(result.formatUsed, PayloadFormat.JSON3);
  assert.equal(result.segments.length, 1);
  assert.deepEqual(result.segments[0], { startMs: 1000, endMs: 3000, text: 'Successful caption test.' });
});

test('fetchAndParseCaptions classifies HTTP 403 Forbidden', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    statusText: 'Forbidden'
  });

  const rawTrack = { baseUrl: 'https://www.youtube.com/api/timedtext?v=test' };
  const trackMeta = { trackId: 'test', kind: 'manual', languageCode: 'en', name: 'English', format: 'json3', isTranslatable: true };

  const result = await fetchAndParseCaptions(rawTrack, trackMeta, { fetchFn: mockFetch });

  assert.equal(result.status, AcquisitionStatus.HTTP_403_FORBIDDEN);
  assert.equal(result.httpStatusCode, 403);
  assert.equal(result.errorStage, 'FETCH_JSON3');
});

test('fetchAndParseCaptions classifies HTTP 429 Rate Limited', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests'
  });

  const rawTrack = { baseUrl: 'https://www.youtube.com/api/timedtext?v=test' };
  const trackMeta = { trackId: 'test', kind: 'manual', languageCode: 'en', name: 'English', format: 'json3', isTranslatable: true };

  const result = await fetchAndParseCaptions(rawTrack, trackMeta, { fetchFn: mockFetch });

  assert.equal(result.status, AcquisitionStatus.HTTP_429_RATE_LIMITED);
  assert.equal(result.httpStatusCode, 429);
  assert.equal(result.errorStage, 'FETCH_JSON3');
});

test('fetchAndParseCaptions falls back to XML when server responds with XML', async () => {
  const xmlPayload = '<transcript><text start="2.0" dur="3.0">XML fallback content</text></transcript>';

  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => xmlPayload
  });

  const rawTrack = { baseUrl: 'https://www.youtube.com/api/timedtext?v=test' };
  const trackMeta = { trackId: 'test', kind: 'manual', languageCode: 'en', name: 'English', format: 'json3', isTranslatable: true };

  const result = await fetchAndParseCaptions(rawTrack, trackMeta, { fetchFn: mockFetch });

  assert.equal(result.status, AcquisitionStatus.SUCCESS);
  assert.equal(result.formatUsed, PayloadFormat.XML);
  assert.equal(result.segments.length, 1);
  assert.deepEqual(result.segments[0], { startMs: 2000, endMs: 5000, text: 'XML fallback content' });
});

test('fetchAndParseCaptions classifies malformed payload correctly', async () => {
  const mockFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '{"invalidJson":'
  });

  const rawTrack = { baseUrl: 'https://www.youtube.com/api/timedtext?v=test' };
  const trackMeta = { trackId: 'test', kind: 'manual', languageCode: 'en', name: 'English', format: 'json3', isTranslatable: true };

  const result = await fetchAndParseCaptions(rawTrack, trackMeta, { fetchFn: mockFetch });

  assert.equal(result.status, AcquisitionStatus.MALFORMED_PAYLOAD);
  assert.equal(result.errorStage, 'PARSE_JSON3');
});
