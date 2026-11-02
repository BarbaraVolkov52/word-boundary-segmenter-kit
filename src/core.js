// Word boundary segmentation following the spirit of Unicode Standard Annex #29
// default word boundary rules (UAX #29), implemented with no dependencies.
//
// Design decision: the full UAX #29 word-boundary algorithm needs the complete
// Unicode word-break property table, which cannot be shipped without a data
// dependency. Instead we implement a deterministic, documented approximation:
// a character is a "word character" when it is a Unicode letter, digit, or the
// connector/combining marks that commonly appear inside words (underscore,
// apostrophe, and the combining marks category Mn/Mc/Me). Everything else is a
// non-word character. Boundaries are reported wherever the word-ness of two
// adjacent code points differs. This is the interpretation this library
// commits to; the README states it plainly.

/**
 * @typedef {Object} Segment
 * @property {string} text   The substring for this segment.
 * @property {boolean} isWord True when the segment consists of word characters.
 * @property {number} start   Inclusive start index in the original string.
 * @property {number} end     Exclusive end index in the original string.
 */

/**
 * @typedef {Object} Options
 * @property {boolean} keepWhitespace When true, whitespace runs are emitted as
 *   their own non-word segments instead of being merged into surrounding
 *   non-word runs. Default false.
 */

/** @type {Options} */
export const DEFAULT_OPTIONS = Object.freeze({ keepWhitespace: false });

// Connector and combining characters that are treated as word characters even
// though they are not letters or digits. This is the deliberate approximation
// discussed above: apostrophes and underscores join words, and combining marks
// attach to the base character they modify.
const WORD_EXTRA = /[\u005F\u0027\u2019\u02BC\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/u;

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const WHITESPACE = /\s/u;

/**
 * Decide whether a single code point is a word character.
 *
 * WHY a dedicated helper: the segmentation loop calls this once per code point
 * and the three regexes above are module-level so they are compiled once.
 *
 * @param {string} ch A single code point (may be a surrogate pair).
 * @returns {boolean}
 */
export function isWord(ch) {
  if (ch.length === 0) return false;
  return LETTER_OR_DIGIT.test(ch) || WORD_EXTRA.test(ch);
}

/**
 * Segment `input` into alternating word and non-word runs.
 *
 * The returned segments tile the input exactly: concatenating every `text`
 * reproduces the input, and `start`/`end` are consistent with `text.length`.
 * Empty input yields an empty array.
 *
 * @param {string} input The text to segment.
 * @param {Options} [options]
 * @returns {Segment[]}
 */
export function segmentWords(input, options = DEFAULT_OPTIONS) {
  if (typeof input !== 'string') {
    throw new TypeError('segmentWords expects a string');
  }
  const keepWhitespace = options.keepWhitespace === true;
  const segments = [];
  // Iterate by code point so astral characters are not split across segments.
  const codePoints = Array.from(input);
  let index = 0; // index into the original string (UTF-16 code units)
  let runStart = 0;
  let runWord = false;
  let runIsWhitespace = false;
  let run = '';

  const flush = (end) => {
    if (run.length === 0) return;
    segments.push({
      text: run,
      isWord: runWord,
      start: runStart,
      end,
    });
  };

  for (const ch of codePoints) {
    const word = isWord(ch);
    const ws = !word && WHITESPACE.test(ch);
    // A run ends when word-ness changes, or when keepWhitespace is on and the
    // whitespace-ness changes within a non-word run.
    const boundary =
      run.length > 0 &&
      (word !== runWord || (keepWhitespace && !word && ws !== runIsWhitespace));
    if (boundary) {
      flush(index);
      run = '';
      runStart = index;
    }
    if (run.length === 0) {
      runWord = word;
      runIsWhitespace = ws;
    }
    run += ch;
    index += ch.length;
  }
  flush(index);
  return segments;
}
