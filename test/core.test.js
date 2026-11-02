import test from 'node:test';
import assert from 'node:assert/strict';

import { segmentWords, isWord, DEFAULT_OPTIONS } from '../src/index.js';

const texts = (segs) => segs.map((s) => s.text);
const flags = (segs) => segs.map((s) => s.isWord);

// Reconstructing the input from the segments is the core invariant: the
// segments must tile the string with no gaps or overlap.
function assertTiles(input, segs) {
  let rebuilt = '';
  let cursor = 0;
  for (const seg of segs) {
    assert.equal(seg.start, cursor, 'segment start must be contiguous');
    assert.equal(seg.end, seg.start + seg.text.length, 'end must match text length');
    rebuilt += seg.text;
    cursor = seg.end;
  }
  assert.equal(rebuilt, input, 'concatenated segments must equal the input');
  assert.equal(cursor, input.length, 'segments must cover the whole input');
}

test('empty input yields no segments', () => {
  assert.deepEqual(segmentWords(''), []);
});

test('single word', () => {
  const segs = segmentWords('hello');
  assert.deepEqual(texts(segs), ['hello']);
  assert.deepEqual(flags(segs), [true]);
  assertTiles('hello', segs);
});

test('single non-word run', () => {
  const segs = segmentWords('   ');
  assert.deepEqual(texts(segs), ['   ']);
  assert.deepEqual(flags(segs), [false]);
  assertTiles('   ', segs);
});

test('alternating words and separators', () => {
  const input = 'one, two; three!';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['one', ', ', 'two', '; ', 'three', '!']);
  assert.deepEqual(flags(segs), [true, false, true, false, true, false]);
  assertTiles(input, segs);
});

test('underscore and apostrophe join words', () => {
  const input = "don't_stop";
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ["don't_stop"]);
  assert.deepEqual(flags(segs), [true]);
});

test('leading and trailing separators are kept', () => {
  const input = '  hi  ';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['  ', 'hi', '  ']);
  assert.deepEqual(flags(segs), [false, true, false]);
  assertTiles(input, segs);
});

test('digits are word characters', () => {
  const input = 'abc123 def';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['abc123', ' ', 'def']);
  assert.deepEqual(flags(segs), [true, false, true]);
});

test('keepWhitespace splits whitespace from other non-word runs', () => {
  const input = 'a, b';
  const segs = segmentWords(input, { keepWhitespace: true });
  assert.deepEqual(texts(segs), ['a', ',', ' ', 'b']);
  assert.deepEqual(flags(segs), [true, false, false, true]);
  assertTiles(input, segs);
});

test('keepWhitespace merges adjacent whitespace into one run', () => {
  const input = 'a  ,  b';
  const segs = segmentWords(input, { keepWhitespace: true });
  assert.deepEqual(texts(segs), ['a', '  ', ',', '  ', 'b']);
  assert.deepEqual(flags(segs), [true, false, false, false, true]);
  assertTiles(input, segs);
});

test('astral characters are not split across segments', () => {
  const input = 'a\u{1F600}b';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['a', '\u{1F600}', 'b']);
  assert.deepEqual(flags(segs), [true, false, true]);
  assertTiles(input, segs);
});

test('combining marks stay attached to their base letter', () => {
  // e + combining acute accent should be a single word character run.
  const input = 'cafe\u0301 bar';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['cafe\u0301', ' ', 'bar']);
  assert.deepEqual(flags(segs), [true, false, true]);
});

test('non-latin letters are word characters', () => {
  const input = '\u4F60\u597D, world';
  const segs = segmentWords(input);
  assert.deepEqual(texts(segs), ['\u4F60\u597D', ', ', 'world']);
  assert.deepEqual(flags(segs), [true, false, true]);
});

test('isWord classifies individual code points', () => {
  assert.equal(isWord('a'), true);
  assert.equal(isWord('7'), true);
  assert.equal(isWord('_'), true);
  assert.equal(isWord("'"), true);
  assert.equal(isWord(' '), false);
  assert.equal(isWord(','), false);
  assert.equal(isWord(''), false);
});

test('non-string input throws a TypeError', () => {
  assert.throws(() => segmentWords(42), TypeError);
  assert.throws(() => segmentWords(null), TypeError);
});

test('DEFAULT_OPTIONS is frozen and defaults to merged whitespace', () => {
  assert.equal(DEFAULT_OPTIONS.keepWhitespace, false);
  assert.equal(Object.isFrozen(DEFAULT_OPTIONS), true);
  const segs = segmentWords('a, b');
  assert.deepEqual(texts(segs), ['a', ', ', 'b']);
});
