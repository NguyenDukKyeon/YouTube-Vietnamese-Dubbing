import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJson3 } from '../src/parsers/json3-parser.js';

test('parseJson3 parses valid YouTube json3 payload into canonical segments', () => {
  const json3Payload = {
    wireMagic: 'pb3',
    events: [
      {
        tStartMs: 1200,
        dDurationMs: 3400,
        segs: [
          { utf8: 'Hello ' },
          { utf8: 'world, ' },
          { utf8: 'welcome to the spike.' }
        ]
      },
      {
        tStartMs: 4800,
        dDurationMs: 2500,
        segs: [
          { utf8: 'Testing YouTube caption extraction.' }
        ]
      }
    ]
  };

  const result = parseJson3(json3Payload);

  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0], {
    startMs: 1200,
    endMs: 4600,
    text: 'Hello world, welcome to the spike.'
  });
  assert.deepEqual(result.segments[1], {
    startMs: 4800,
    endMs: 7300,
    text: 'Testing YouTube caption extraction.'
  });
  assert.equal(result.timingSummary.isMonotonic, true);
});

test('parseJson3 skips window commands or events without segs', () => {
  const json3Payload = {
    events: [
      { tStartMs: 0, dDurationMs: 1000, wWinId: 1 }, // window command, no segs
      { tStartMs: 1000, dDurationMs: 2000, segs: [{ utf8: 'Real speech.' }] }
    ]
  };

  const result = parseJson3(json3Payload);
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].text, 'Real speech.');
});

test('parseJson3 throws on invalid payload shape', () => {
  assert.throws(() => parseJson3('invalid json string'), /MALFORMED_JSON3_PAYLOAD/);
  assert.throws(() => parseJson3({ notEvents: true }), /MALFORMED_JSON3_PAYLOAD/);
  assert.throws(() => parseJson3(null), /MALFORMED_JSON3_PAYLOAD/);
});
