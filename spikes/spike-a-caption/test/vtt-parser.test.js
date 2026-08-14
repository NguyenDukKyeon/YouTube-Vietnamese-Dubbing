import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVtt } from '../src/parsers/vtt-parser.js';

test('parseVtt parses standard WebVTT subtitle stream', () => {
  const vtt = `WEBVTT
Kind: captions
Language: en

00:01.200 --> 00:04.500
Hello from WebVTT format!

00:05.100 --> 00:08.200
<c.yellow>Colored</c> and <v Speaker>voice tags</v> cleaned.
`;

  const result = parseVtt(vtt);

  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0], {
    startMs: 1200,
    endMs: 4500,
    text: 'Hello from WebVTT format!'
  });
  assert.deepEqual(result.segments[1], {
    startMs: 5100,
    endMs: 8200,
    text: 'Colored and voice tags cleaned.'
  });
});

test('parseVtt handles HH:MM:SS.mmm format timestamps', () => {
  const vtt = `WEBVTT

01:15:20.500 --> 01:15:25.000
Long form video caption at 1 hour mark.
`;

  const result = parseVtt(vtt);
  assert.equal(result.segments.length, 1);
  const expectedStartMs = (1 * 3600 + 15 * 60 + 20.5) * 1000;
  const expectedEndMs = (1 * 3600 + 15 * 60 + 25) * 1000;

  assert.equal(result.segments[0].startMs, expectedStartMs);
  assert.equal(result.segments[0].endMs, expectedEndMs);
  assert.equal(result.segments[0].text, 'Long form video caption at 1 hour mark.');
});

test('parseVtt throws on missing WEBVTT header', () => {
  assert.throws(() => parseVtt('NOT WEBVTT\n00:01 --> 00:02\nTest'), /MALFORMED_VTT_PAYLOAD/);
});
