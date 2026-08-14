import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities, normalizeText, normalizeAndValidateSegments } from '../src/parsers/normalizer.js';

test('decodeHtmlEntities decodes common HTML entities', () => {
  assert.equal(decodeHtmlEntities('&amp; &lt; &gt; &quot; &#39; &#x27;'), '& < > " \' \'');
  assert.equal(decodeHtmlEntities('No entities here'), 'No entities here');
  assert.equal(decodeHtmlEntities(''), '');
});

test('normalizeText collapses whitespace and decodes entities', () => {
  assert.equal(normalizeText('  Hello   &amp;   World \n\n!  '), 'Hello & World !');
  assert.equal(normalizeText(''), '');
});

test('normalizeAndValidateSegments converts raw segments and computes timing summary', () => {
  const raw = [
    { startMs: 0, endMs: 2500, text: 'First segment' },
    { startMs: 2500, endMs: 5000, text: 'Second segment' },
    { startMs: 5000, endMs: 7800, text: 'Third segment' }
  ];

  const result = normalizeAndValidateSegments(raw);

  assert.equal(result.segments.length, 3);
  assert.equal(result.timingSummary.totalSegments, 3);
  assert.equal(result.timingSummary.totalDurationMs, 7800);
  assert.equal(result.timingSummary.isMonotonic, true);
  assert.equal(result.timingSummary.anomalies.length, 0);
  assert.deepEqual(result.segments[0], { startMs: 0, endMs: 2500, text: 'First segment' });
});

test('normalizeAndValidateSegments flags timing anomalies and overlaps without silent data loss', () => {
  const raw = [
    { startMs: 0, endMs: 3000, text: 'Segment 1' },
    { startMs: 2500, endMs: 4000, text: 'Overlapping segment' }, // Overlap with prevEndMs 3000
    { startMs: 2000, endMs: 3500, text: 'Backward segment' },    // Backward start time
    { startMs: 5000, endMs: 4500, text: 'Inverted segment' },    // startMs > endMs
    { startMs: 'invalid', endMs: 6000, text: 'Invalid time' }    // non-numeric
  ];

  const result = normalizeAndValidateSegments(raw);

  assert.equal(result.timingSummary.isMonotonic, false);
  assert.ok(result.timingSummary.anomalies.length >= 4);

  const anomalyIssues = result.timingSummary.anomalies.map(a => a.issue);
  assert.ok(anomalyIssues.includes('OVERLAPPING_SEGMENT'));
  assert.ok(anomalyIssues.includes('BACKWARD_START_TIME'));
  assert.ok(anomalyIssues.includes('INVERTED_INTERVAL'));
  assert.ok(anomalyIssues.includes('NON_NUMERIC_TIMESTAMP'));
});

test('normalizeAndValidateSegments filters empty whitespace segments', () => {
  const raw = [
    { startMs: 0, endMs: 1000, text: '   ' },
    { startMs: 1000, endMs: 2000, text: 'Valid segment' }
  ];

  const result = normalizeAndValidateSegments(raw);
  assert.equal(result.segments.length, 1);
  assert.equal(result.segments[0].text, 'Valid segment');
});
