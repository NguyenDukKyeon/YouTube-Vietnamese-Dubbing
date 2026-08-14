import test from 'node:test';
import assert from 'node:assert/strict';
import { parseXml } from '../src/parsers/xml-parser.js';

test('parseXml parses standard <transcript><text> format', () => {
  const xml = `
    <?xml version="1.0" encoding="utf-8" ?>
    <transcript>
      <text start="1.5" dur="3.2">Hello &amp; welcome <font color="red">to XML</font></text>
      <text start="5.0" dur="2.1">Second sentence here.</text>
    </transcript>
  `;

  const result = parseXml(xml);

  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0], {
    startMs: 1500,
    endMs: 4700,
    text: 'Hello & welcome to XML'
  });
  assert.deepEqual(result.segments[1], {
    startMs: 5000,
    endMs: 7100,
    text: 'Second sentence here.'
  });
  assert.equal(result.timingSummary.isMonotonic, true);
});

test('parseXml parses <timedtext><body><p t="..." d="..."> format', () => {
  const xml = `
    <timedtext format="3">
      <head/>
      <body>
        <p t="1200" d="3400">First p-tag line</p>
        <p t="4800" d="2000"><s>Nested span text</s></p>
      </body>
    </timedtext>
  `;

  const result = parseXml(xml);

  assert.equal(result.segments.length, 2);
  assert.deepEqual(result.segments[0], {
    startMs: 1200,
    endMs: 4600,
    text: 'First p-tag line'
  });
  assert.deepEqual(result.segments[1], {
    startMs: 4800,
    endMs: 6800,
    text: 'Nested span text'
  });
});

test('parseXml throws on malformed XML with no text nodes', () => {
  assert.throws(() => parseXml('<html><body>not a timedtext</body></html>'), /MALFORMED_XML_PAYLOAD/);
  assert.throws(() => parseXml(''), /MALFORMED_XML_PAYLOAD/);
});
