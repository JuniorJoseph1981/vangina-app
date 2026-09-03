/* Writing & Phonics data — letter/number tracing sets and phonics word lists.
   Sounds are approximate phonetic spellings fed to the browser's built-in
   text-to-speech (Web Speech API) so it says a sound ("mmm") instead of a
   letter name ("em"). Quality depends on the device's installed voices. */

const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => ({
  char: ch, kind: 'letter', spokenName: ch,
}));

const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('').map(ch => ({
  char: ch, kind: 'letter', spokenName: ch,
}));

const NUMBERS = [
  { char: '0', kind: 'number', spokenName: 'zero' },
  { char: '1', kind: 'number', spokenName: 'one' },
  { char: '2', kind: 'number', spokenName: 'two' },
  { char: '3', kind: 'number', spokenName: 'three' },
  { char: '4', kind: 'number', spokenName: 'four' },
  { char: '5', kind: 'number', spokenName: 'five' },
  { char: '6', kind: 'number', spokenName: 'six' },
  { char: '7', kind: 'number', spokenName: 'seven' },
  { char: '8', kind: 'number', spokenName: 'eight' },
  { char: '9', kind: 'number', spokenName: 'nine' },
];

/* Approximate phonics sound for each letter, written phonetically so
   speechSynthesis reads it as a sound rather than a letter name. */
const LETTER_SOUNDS = {
  a: 'aa', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'ffff', g: 'guh',
  h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'llll', m: 'mmmm', n: 'nnnn',
  o: 'ah', p: 'puh', q: 'kwuh', r: 'rrrr', s: 'sss', t: 'tuh', u: 'uh',
  v: 'vvvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzzz',
};

/* Phonics & spelling word bank, grouped by age band. Kept to short,
   common, sound-it-out-able words appropriate for early readers. */
const PHONICS_WORDS = [
  // 3-5: simple 3-letter CVC words
  { word: 'cat', ageBand: '3-5' },
  { word: 'dog', ageBand: '3-5' },
  { word: 'sun', ageBand: '3-5' },
  { word: 'pig', ageBand: '3-5' },
  { word: 'hat', ageBand: '3-5' },
  { word: 'bed', ageBand: '3-5' },
  { word: 'cup', ageBand: '3-5' },
  { word: 'pen', ageBand: '3-5' },
  { word: 'red', ageBand: '3-5' },
  { word: 'bug', ageBand: '3-5' },

  // 5-7: CVC plus simple blends/digraphs
  { word: 'fish', ageBand: '5-7' },
  { word: 'frog', ageBand: '5-7' },
  { word: 'milk', ageBand: '5-7' },
  { word: 'star', ageBand: '5-7' },
  { word: 'duck', ageBand: '5-7' },
  { word: 'nest', ageBand: '5-7' },
  { word: 'lamp', ageBand: '5-7' },
  { word: 'ship', ageBand: '5-7' },
  { word: 'crab', ageBand: '5-7' },
  { word: 'swim', ageBand: '5-7' },

  // 7-9: longer, everyday words
  { word: 'jump', ageBand: '7-9' },
  { word: 'plant', ageBand: '7-9' },
  { word: 'snack', ageBand: '7-9' },
  { word: 'spoon', ageBand: '7-9' },
  { word: 'chair', ageBand: '7-9' },
  { word: 'brush', ageBand: '7-9' },
  { word: 'clock', ageBand: '7-9' },
  { word: 'dream', ageBand: '7-9' },
  { word: 'friend', ageBand: '7-9' },
  { word: 'school', ageBand: '7-9' },
];
