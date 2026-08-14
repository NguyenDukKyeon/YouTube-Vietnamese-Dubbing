import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { parseJson3 } from '../src/parsers/json3-parser.js';
import { parseXml } from '../src/parsers/xml-parser.js';
import { parseVtt } from '../src/parsers/vtt-parser.js';
import { selectBestEnglishTrack } from '../src/extractor/track-selector.js';
import { TrackKind } from '../src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(relPath) {
  return readFileSync(join(__dirname, 'fixtures', relPath), 'utf-8');
}

test('Fixtures: manual_en_json3.json parses accurately', () => {
  const content = loadFixture('manual_en_json3.json');
  const result = parseJson3(content);

  assert.equal(result.segments.length, 3);
  assert.equal(result.timingSummary.totalSegments, 3);
  assert.equal(result.timingSummary.isMonotonic, true);
  assert.equal(result.segments[0].text, 'Welcome to this comprehensive demonstration.');
  assert.equal(result.segments[1].text, 'We are testing manual English caption extraction.');
  assert.equal(result.segments[2].text, 'Timing and text normalization must be preserved accurately.');
});

test('Fixtures: asr_en_json3.json parses accurately', () => {
  const content = loadFixture('asr_en_json3.json');
  const result = parseJson3(content);

  assert.equal(result.segments.length, 3);
  assert.equal(result.timingSummary.isMonotonic, true);
  assert.equal(result.segments[0].text, "so today we're going to talk about");
  assert.equal(result.segments[1].text, 'machine learning and automatic speech recognition');
});

test('Fixtures: timedtext_srv3.xml parses accurately', () => {
  const content = loadFixture('timedtext_srv3.xml');
  const result = parseXml(content);

  assert.equal(result.segments.length, 2);
  assert.equal(result.timingSummary.isMonotonic, true);
  assert.equal(result.segments[0].startMs, 1500);
  assert.equal(result.segments[0].endMs, 5000);
  assert.equal(result.segments[0].text, 'This is an XML timedtext format payload.');
});

test('Fixtures: subtitles.vtt parses accurately', () => {
  const content = loadFixture('subtitles.vtt');
  const result = parseVtt(content);

  assert.equal(result.segments.length, 2);
  assert.equal(result.timingSummary.isMonotonic, true);
  assert.equal(result.segments[0].text, 'Subtitle in WebVTT format.');
});

test('Fixtures: player_responses.json evaluates track variants correctly', () => {
  const playerResponses = JSON.parse(loadFixture('player_responses.json'));

  // 1. Multi-track -> Manual EN selected
  const res1 = selectBestEnglishTrack(playerResponses.multi_track.captions.playerCaptionsTracklistRenderer.captionTracks);
  assert.ok(res1.selectedTrack);
  assert.equal(res1.selectedTrack.kind, TrackKind.MANUAL);
  assert.equal(res1.selectedTrack.vssId, '.en');

  // 2. ASR-only -> ASR EN selected
  const res2 = selectBestEnglishTrack(playerResponses.asr_only.captions.playerCaptionsTracklistRenderer.captionTracks);
  assert.ok(res2.selectedTrack);
  assert.equal(res2.selectedTrack.kind, TrackKind.ASR);
  assert.equal(res2.selectedTrack.vssId, 'a.en');

  // 3. Non-English -> Classified failure
  const res3 = selectBestEnglishTrack(playerResponses.non_english_only.captions.playerCaptionsTracklistRenderer.captionTracks);
  assert.equal(res3.selectedTrack, null);
  assert.equal(res3.reason, 'NO_USABLE_ENGLISH_CAPTIONS');

  // 4. No captions -> Classified failure
  const res4 = selectBestEnglishTrack(playerResponses.no_captions.captions?.playerCaptionsTracklistRenderer?.captionTracks || []);
  assert.equal(res4.selectedTrack, null);
  assert.equal(res4.reason, 'NO_CAPTION_TRACKS_IN_METADATA');
});
