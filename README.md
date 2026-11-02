# word-boundary-segmenter-kit

Segments a string into alternating word and non-word runs, using a documented
approximation of the Unicode Standard Annex #29 default word boundary rules.

```js
import { segmentWords, isWord } from 'word-boundary-segmenter-kit';

const segments = segmentWords("don't stop, cafe\u0301!");
// [
//   { text: "don't", isWord: true,  start: 0,  end: 5 },
//   { text: ' ',     isWord: false, start: 5,  end: 6 },
//   { text: 'stop',  isWord: true,  start: 6,  end: 10 },
//   { text: ', ',    isWord: false, start: 10, end: 12 },
//   { text: 'cafe\u0301', isWord: true, start: 12, end: 17 },
//   { text: '!',     isWord: false, start: 17, end: 18 },
// ]

isWord('a');   // true
isWord(',');   // false
```

Pass `{ keepWhitespace: true }` to emit whitespace runs as their own segments
instead of merging them into the surrounding non-word run:

```js
segmentWords('a, b', { keepWhitespace: true }).map((s) => s.text);
// ['a', ',', ' ', 'b']
```

## Why this exists

The full UAX #29 word-boundary algorithm depends on the complete Unicode
word-break property table. Shipping that table means shipping a data dependency
or a generated file that has to be regenerated with every Unicode release. This
library trades exact UAX #29 conformance for a zero-dependency implementation:
a code point is a word character when it is a Unicode letter (`\p{L}`), a
Unicode digit (`\p{N}`), or one of the connector/combining characters that
commonly appear inside words (underscore, apostrophe, the typographic
apostrophe, and the combining marks in `Mn`/`Mc`/`Me`). Boundaries are reported
wherever adjacent code points disagree on word-ness. The README states this
interpretation plainly because it is the one the tests exercise.

## The awkward edge

Whitespace is a non-word character, so by default a run of spaces and a comma
are a single non-word segment: `segmentWords('a, b')` gives `['a', ', ', 'b']`,
not `['a', ',', ' ', 'b']`. If you need whitespace separated out, pass
`{ keepWhitespace: true }`; that option only affects whitespace inside a
non-word run and never splits a word run.

## API

- `segmentWords(input, options?)` — returns an array of
  `{ text, isWord, start, end }` segments that tile `input` exactly. Throws a
  `TypeError` if `input` is not a string.
- `isWord(codePoint)` — returns `true` when a single code point is a word
  character under the rules above.
- `DEFAULT_OPTIONS` — a frozen object with `keepWhitespace: false`.
