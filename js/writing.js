/* Spark Station — Writing & Phonics app logic. */

const speechSupported = 'speechSynthesis' in window;

function speak(text, rate) {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = rate || 0.85;
  window.speechSynthesis.speak(utter);
}

function speakSequence(items, gapMs, onDone) {
  if (!speechSupported) { if (onDone) onDone(); return; }
  window.speechSynthesis.cancel();
  let i = 0;
  function next() {
    if (i >= items.length) { if (onDone) onDone(); return; }
    speak(items[i], 0.8);
    i++;
    setTimeout(next, gapMs);
  }
  next();
}

/* ---------------- Print / Save as PDF ---------------- */

function printSheet(title, bodyHtml) {
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const sheet = document.getElementById('print-sheet');
  sheet.innerHTML = `
    <div class="print-sheet-inner">
      <div class="print-sheet-brand">✨ Spark Station — Writing &amp; Phonics Practice</div>
      <h2>${title}</h2>
      <div class="print-meta">
        <span>Name: ________________________</span>
        <span>Date: ${today}</span>
      </div>
      ${bodyHtml}
    </div>
  `;
  window.print();
}

/* ---------------- Tracing mode ---------------- */

const tracing = {
  set: UPPERCASE_LETTERS,
  index: 0,
  color: '#3E7C82',
  drawing: false,
  canvas: null,
  ctx: null,
};

function initTracing() {
  tracing.canvas = document.getElementById('trace-canvas');
  tracing.ctx = tracing.canvas.getContext('2d');

  document.getElementById('trace-set-upper').addEventListener('click', () => switchTraceSet(UPPERCASE_LETTERS, 'trace-set-upper'));
  document.getElementById('trace-set-lower').addEventListener('click', () => switchTraceSet(LOWERCASE_LETTERS, 'trace-set-lower'));
  document.getElementById('trace-set-numbers').addEventListener('click', () => switchTraceSet(NUMBERS, 'trace-set-numbers'));

  document.getElementById('trace-prev').addEventListener('click', () => stepTrace(-1));
  document.getElementById('trace-next').addEventListener('click', () => stepTrace(1));
  document.getElementById('trace-clear').addEventListener('click', drawGuide);
  document.getElementById('trace-hear').addEventListener('click', () => {
    const item = tracing.set[tracing.index];
    speak(item.spokenName);
  });
  document.getElementById('trace-print').addEventListener('click', () => {
    const label = document.getElementById('trace-current-label').textContent;
    const dataUrl = tracing.canvas.toDataURL('image/png');
    printSheet(label, `<div class="print-sheet-image-wrap"><img src="${dataUrl}" alt="${label}" /></div>`);
  });

  document.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      tracing.color = btn.dataset.color;
      document.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const canvas = tracing.canvas;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    tracing.drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const ctx = tracing.ctx;
    ctx.strokeStyle = tracing.color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const p = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!tracing.drawing) return;
    const p = pointerPos(e);
    const ctx = tracing.ctx;
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
    canvas.addEventListener(evt, () => { tracing.drawing = false; });
  });

  drawGuide();
}

function pointerPos(e) {
  const rect = tracing.canvas.getBoundingClientRect();
  const scaleX = tracing.canvas.width / rect.width;
  const scaleY = tracing.canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function switchTraceSet(set, btnId) {
  tracing.set = set;
  tracing.index = 0;
  document.querySelectorAll('.trace-set-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(btnId).classList.add('active');
  drawGuide();
}

function stepTrace(delta) {
  const len = tracing.set.length;
  tracing.index = (tracing.index + delta + len) % len;
  drawGuide();
}

function loadWordIntoTracing(word) {
  document.querySelector('[data-tab="trace"]').click();
  tracing.wordOverride = word;
  drawGuide();
}

function drawGuide() {
  const ctx = tracing.ctx;
  const canvas = tracing.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const text = tracing.wordOverride || tracing.set[tracing.index].char;
  tracing.wordOverride = null;

  ctx.fillStyle = '#D8D2C4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let fontSize = 320;
  const maxWidth = canvas.width - 60;
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 20) {
    fontSize -= 6;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const item = tracing.set.find(s => s.char === text);
  const label = document.getElementById('trace-current-label');
  label.textContent = item ? `${item.kind === 'number' ? 'Number' : 'Letter'}: ${text}` : `Word: ${text}`;
}

/* ---------------- Phonics & Spelling mode ---------------- */

const phonics = {
  ageBand: '3-5',
  words: [],
  currentWord: null,
  nextIndex: 0,
  choiceEls: [],
};

function initPhonics() {
  document.getElementById('phonics-age-toggle').querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      phonics.ageBand = btn.dataset.age;
      document.querySelectorAll('#phonics-age-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildWordList();
    });
  });

  document.getElementById('phonics-new-word').addEventListener('click', pickRandomWord);

  document.getElementById('phonics-sound-out').addEventListener('click', () => {
    const word = phonics.currentWord.word;
    const sounds = word.split('').map(l => LETTER_SOUNDS[l] || l);
    speakSequence(sounds, 700, () => setTimeout(() => speak(word, 0.85), 200));
  });

  document.getElementById('phonics-hear-word').addEventListener('click', () => {
    speak(phonics.currentWord.word, 0.85);
  });

  document.getElementById('phonics-print').addEventListener('click', () => {
    const word = phonics.currentWord.word;
    printSheet(`I can spell "${word}"!`, `<div class="print-word-display">${word.toUpperCase()}</div>`);
  });

  buildWordList();
  pickRandomWord();
}

function buildWordList() {
  phonics.words = PHONICS_WORDS.filter(w => w.ageBand === phonics.ageBand);
}

function pickRandomWord() {
  const pool = phonics.words.filter(w => w.word !== (phonics.currentWord && phonics.currentWord.word));
  const list = pool.length ? pool : phonics.words;
  phonics.currentWord = list[Math.floor(Math.random() * list.length)];
  phonics.nextIndex = 0;
  renderPhonicsWord();
}

function renderPhonicsWord() {
  const word = phonics.currentWord.word;

  const blanksEl = document.getElementById('phonics-blanks');
  blanksEl.innerHTML = '';
  word.split('').forEach((ch, i) => {
    const slot = document.createElement('div');
    slot.className = 'phonics-blank';
    slot.dataset.index = i;
    blanksEl.appendChild(slot);
  });

  const tilesEl = document.getElementById('phonics-tiles');
  tilesEl.innerHTML = '';
  const shuffled = shuffleLetters(word.split(''));
  phonics.choiceEls = shuffled.map(letter => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'phonics-tile';
    tile.textContent = letter.toUpperCase();
    tile.dataset.letter = letter;
    tile.addEventListener('click', () => handleTileTap(tile));
    tilesEl.appendChild(tile);
    return tile;
  });

  document.getElementById('phonics-write-btn').onclick = () => loadWordIntoTracing(word);
  document.getElementById('phonics-celebrate').hidden = true;
  document.getElementById('phonics-done-actions').hidden = true;
}

function shuffleLetters(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const original = arr.join('');
  if (copy.join('') === original && copy.length > 1) return shuffleLetters(arr);
  return copy;
}

function handleTileTap(tile) {
  if (tile.disabled) return;
  const word = phonics.currentWord.word;
  const expected = word[phonics.nextIndex];
  const letter = tile.dataset.letter;

  speak(LETTER_SOUNDS[letter] || letter, 0.9);

  if (letter === expected) {
    const slot = document.querySelector(`.phonics-blank[data-index="${phonics.nextIndex}"]`);
    slot.textContent = letter.toUpperCase();
    slot.classList.add('filled');
    tile.disabled = true;
    tile.classList.add('used');
    phonics.nextIndex++;
    if (phonics.nextIndex >= word.length) {
      setTimeout(() => {
        speak(word, 0.85);
        document.getElementById('phonics-celebrate').hidden = false;
        document.getElementById('phonics-done-actions').hidden = false;
      }, 300);
    }
  } else {
    tile.classList.add('shake');
    setTimeout(() => tile.classList.remove('shake'), 400);
  }
}

/* ---------------- Tabs ---------------- */

function initTabs() {
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.mode-panel').forEach(p => p.hidden = true);
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).hidden = false;
    });
  });
}

function initSpeechNotice() {
  if (speechSupported) return;
  const notice = document.getElementById('speech-notice');
  if (notice) notice.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTracing();
  initPhonics();
  initSpeechNotice();
});
