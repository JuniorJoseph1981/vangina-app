/* Spark Station — app logic. No build step, no dependencies. */

const STORAGE_KEY = 'sparkstation.weeklyPlan.v1';
const FILTER_KEY = 'sparkstation.filters.v1';

const state = {
  ageBand: null,           // null = all ages
  categories: new Set(),   // empty set = all categories
  benefitFocus: new Set(), // empty set = any skill focus
  maxDuration: null,       // null = any duration
  dexterityOnly: false,
  seenPool: {},            // key: filterSignature -> Set of activity ids already shown this cycle
  currentBatch: [],
  plan: [],                // array of activity ids
};

const els = {};

function $(id) { return document.getElementById(id); }

function init() {
  cacheEls();
  buildAgeToggle();
  buildCategoryChips();
  buildBenefitChips();
  loadFilters();
  loadPlan();
  bindEvents();
  renderPlan();
  generateBatch();
}

function cacheEls() {
  els.ageToggle = $('age-toggle');
  els.categoryChips = $('category-chips');
  els.benefitChips = $('benefit-chips');
  els.durationSelect = $('duration-select');
  els.dexterityToggle = $('dexterity-toggle');
  els.generateBtn = $('generate-btn');
  els.resultsGrid = $('results-grid');
  els.emptyState = $('empty-state');
  els.planList = $('plan-list');
  els.planCount = $('plan-count');
  els.printPlanBtn = $('print-plan-btn');
  els.clearPlanBtn = $('clear-plan-btn');
  els.modalBackdrop = $('modal-backdrop');
  els.modalBody = $('modal-body');
  els.modalClose = $('modal-close');
  els.printSheet = $('print-sheet');
}

function buildAgeToggle() {
  const allBtn = makeToggleButton('All Ages', null);
  els.ageToggle.appendChild(allBtn);
  AGE_BANDS.forEach(band => {
    els.ageToggle.appendChild(makeToggleButton(band.label, band.id));
  });
}

function makeToggleButton(label, value) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'toggle-btn';
  btn.textContent = label;
  btn.dataset.value = value === null ? '' : value;
  btn.addEventListener('click', () => {
    state.ageBand = value;
    refreshAgeToggleUI();
    saveFilters();
    generateBatch();
  });
  return btn;
}

function refreshAgeToggleUI() {
  [...els.ageToggle.children].forEach(btn => {
    const val = btn.dataset.value || null;
    btn.classList.toggle('active', val === state.ageBand);
  });
}

function buildCategoryChips() {
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.style.setProperty('--chip-color', cat.color);
    chip.innerHTML = `<span class="chip-emoji">${cat.emoji}</span> ${cat.label}`;
    chip.dataset.value = cat.id;
    chip.addEventListener('click', () => {
      if (state.categories.has(cat.id)) {
        state.categories.delete(cat.id);
      } else {
        state.categories.add(cat.id);
      }
      refreshChipUI();
      saveFilters();
      generateBatch();
    });
    els.categoryChips.appendChild(chip);
  });
}

function refreshChipUI() {
  [...els.categoryChips.children].forEach(chip => {
    chip.classList.toggle('active', state.categories.has(chip.dataset.value));
  });
}

function buildBenefitChips() {
  BENEFITS.forEach(benefit => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip chip-benefit';
    chip.title = benefit.blurb;
    chip.innerHTML = `<span class="chip-emoji">${benefit.emoji}</span> ${benefit.label}`;
    chip.dataset.value = benefit.id;
    chip.addEventListener('click', () => {
      if (state.benefitFocus.has(benefit.id)) {
        state.benefitFocus.delete(benefit.id);
      } else {
        state.benefitFocus.add(benefit.id);
      }
      refreshBenefitChipUI();
      saveFilters();
      generateBatch();
    });
    els.benefitChips.appendChild(chip);
  });
}

function refreshBenefitChipUI() {
  [...els.benefitChips.children].forEach(chip => {
    chip.classList.toggle('active', state.benefitFocus.has(chip.dataset.value));
  });
}

function benefitMeta(id) {
  return BENEFITS.find(b => b.id === id);
}

function bindEvents() {
  els.durationSelect.addEventListener('change', () => {
    state.maxDuration = els.durationSelect.value ? Number(els.durationSelect.value) : null;
    saveFilters();
    generateBatch();
  });
  els.dexterityToggle.addEventListener('change', () => {
    state.dexterityOnly = els.dexterityToggle.checked;
    saveFilters();
    generateBatch();
  });
  els.generateBtn.addEventListener('click', () => generateBatch());
  els.printPlanBtn.addEventListener('click', printWeeklyPlan);
  els.clearPlanBtn.addEventListener('click', () => {
    if (state.plan.length === 0) return;
    if (confirm('Clear all activities from the weekly plan?')) {
      state.plan = [];
      savePlan();
      renderPlan();
    }
  });
  els.modalClose.addEventListener('click', closeModal);
  els.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === els.modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function filterSignature() {
  return [
    state.ageBand || 'all',
    [...state.categories].sort().join(',') || 'all',
    [...state.benefitFocus].sort().join(',') || 'all',
    state.maxDuration || 'any',
    state.dexterityOnly ? 'dex' : 'nodex',
  ].join('|');
}

function matchesFilters(activity) {
  if (state.ageBand && !activity.ages.includes(state.ageBand)) return false;
  if (state.categories.size > 0 && !state.categories.has(activity.category)) return false;
  if (state.benefitFocus.size > 0 && !activity.benefits.some(b => state.benefitFocus.has(b))) return false;
  if (state.maxDuration && activity.duration > state.maxDuration) return false;
  if (state.dexterityOnly && !activity.dexterityFriendly) return false;
  return true;
}

function generateBatch() {
  const pool = ACTIVITIES.filter(matchesFilters);
  const sig = filterSignature();

  if (pool.length === 0) {
    els.resultsGrid.innerHTML = '';
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  if (!state.seenPool[sig]) state.seenPool[sig] = new Set();
  let seen = state.seenPool[sig];

  let available = pool.filter(a => !seen.has(a.id));
  if (available.length === 0) {
    seen.clear();
    available = pool.slice();
  }

  const batchSize = Math.min(4, pool.length);
  const picks = [];
  const shuffled = shuffle(available);
  for (const activity of shuffled) {
    if (picks.length >= batchSize) break;
    picks.push(activity);
  }
  while (picks.length < batchSize) {
    const extra = shuffle(pool.filter(a => !picks.includes(a)))[0];
    if (!extra) break;
    picks.push(extra);
  }

  picks.forEach(a => seen.add(a.id));
  state.currentBatch = picks;
  renderResults();
}

function regenerateSingle(activityId) {
  const pool = ACTIVITIES.filter(matchesFilters);
  const sig = filterSignature();
  if (!state.seenPool[sig]) state.seenPool[sig] = new Set();
  const seen = state.seenPool[sig];

  const currentIds = new Set(state.currentBatch.map(a => a.id));
  let candidates = pool.filter(a => !seen.has(a.id) && !currentIds.has(a.id));
  if (candidates.length === 0) {
    candidates = pool.filter(a => !currentIds.has(a.id));
  }
  if (candidates.length === 0) return;

  const replacement = shuffle(candidates)[0];
  seen.add(replacement.id);
  state.currentBatch = state.currentBatch.map(a => a.id === activityId ? replacement : a);
  renderResults();
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function categoryMeta(id) {
  return CATEGORIES.find(c => c.id === id);
}

function renderResults() {
  els.resultsGrid.innerHTML = '';
  state.currentBatch.forEach(activity => {
    els.resultsGrid.appendChild(buildCard(activity));
  });
}

function buildCard(activity) {
  const cat = categoryMeta(activity.category);
  const card = document.createElement('article');
  card.className = 'activity-card';
  card.style.setProperty('--card-color', cat.color);

  const inPlan = state.plan.includes(activity.id);
  const benefitPills = activity.benefits.map(id => {
    const b = benefitMeta(id);
    return `<span class="pill" title="${b.blurb}">${b.emoji} ${b.label}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="card-top">
      <span class="card-category">${cat.emoji} ${cat.label}</span>
      <button type="button" class="icon-btn refresh-btn" title="Swap for a different activity" aria-label="Swap for a different activity">↻</button>
    </div>
    <h3 class="card-title">${activity.title}</h3>
    <div class="card-badges">
      <span class="badge">⏱ ${activity.duration} min</span>
      <span class="badge">👤 ${activity.ages.join(', ')}</span>
      ${activity.dexterityFriendly ? '<span class="badge badge-dex">🖐 Low-dexterity friendly</span>' : ''}
    </div>
    <p class="card-benefits-label">Builds:</p>
    <div class="card-benefits">${benefitPills}</div>
    <p class="card-materials"><strong>Needs:</strong> ${activity.materials.slice(0, 3).join(', ')}${activity.materials.length > 3 ? '…' : ''}</p>
    <div class="card-actions">
      <button type="button" class="btn btn-secondary details-btn">View Full Details</button>
      <button type="button" class="btn ${inPlan ? 'btn-added' : 'btn-primary'} add-plan-btn">${inPlan ? '✓ In Plan' : '+ Add to Plan'}</button>
    </div>
  `;

  card.querySelector('.refresh-btn').addEventListener('click', () => regenerateSingle(activity.id));
  card.querySelector('.details-btn').addEventListener('click', () => openModal(activity));
  card.querySelector('.add-plan-btn').addEventListener('click', () => togglePlan(activity.id));

  return card;
}

function togglePlan(id) {
  const idx = state.plan.indexOf(id);
  if (idx === -1) {
    state.plan.push(id);
  } else {
    state.plan.splice(idx, 1);
  }
  savePlan();
  renderPlan();
  renderResults();
}

function renderPlan() {
  els.planList.innerHTML = '';
  els.planCount.textContent = state.plan.length;
  els.printPlanBtn.disabled = state.plan.length === 0;
  els.clearPlanBtn.disabled = state.plan.length === 0;

  if (state.plan.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'plan-empty';
    empty.textContent = 'No activities added yet. Use "+ Add to Plan" on any card.';
    els.planList.appendChild(empty);
    return;
  }

  state.plan.forEach(id => {
    const activity = ACTIVITIES.find(a => a.id === id);
    if (!activity) return;
    const cat = categoryMeta(activity.category);
    const benefitStr = activity.benefits.map(id => benefitMeta(id).emoji).join(' ');
    const li = document.createElement('li');
    li.className = 'plan-item';
    li.innerHTML = `
      <span class="plan-item-emoji">${cat.emoji}</span>
      <span class="plan-item-title">${activity.title}</span>
      <span class="plan-item-benefits" title="${activity.benefits.map(id => benefitMeta(id).label).join(', ')}">${benefitStr}</span>
      <span class="plan-item-duration">${activity.duration} min</span>
      <button type="button" class="icon-btn plan-remove-btn" aria-label="Remove from plan">✕</button>
    `;
    li.querySelector('.plan-remove-btn').addEventListener('click', () => togglePlan(id));
    els.planList.appendChild(li);
  });
}

function printWeeklyPlan() {
  const activities = state.plan.map(id => ACTIVITIES.find(a => a.id === id)).filter(Boolean);
  if (activities.length === 0) return;

  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const activitiesHtml = activities.map(activity => {
    const cat = categoryMeta(activity.category);
    return `
      <div class="print-activity">
        ${activityHeaderHtml(activity, cat)}
        ${activityDetailBodyHtml(activity)}
      </div>
    `;
  }).join('');

  els.printSheet.innerHTML = `
    <div class="print-sheet-inner modal-body">
      <div class="print-sheet-brand">✨ Spark Station — Weekly Activity Plan</div>
      <div class="print-meta">
        <span>Teacher: ________________________</span>
        <span>Week of: ${today}</span>
      </div>
      ${activitiesHtml}
    </div>
  `;
  window.print();
}

function activityHeaderHtml(activity, cat) {
  return `
    <span class="modal-category" style="--card-color:${cat.color}">${cat.emoji} ${cat.label}</span>
    <h2>${activity.title}</h2>
    <div class="card-badges">
      <span class="badge">⏱ ${activity.duration} min</span>
      <span class="badge">👤 Ages ${activity.ages.join(', ')}</span>
      ${activity.dexterityFriendly ? '<span class="badge badge-dex">🖐 Low-dexterity friendly</span>' : ''}
    </div>
  `;
}

function activityDetailBodyHtml(activity) {
  return `
    <h4>Skills this builds</h4>
    <ul class="benefits-list">${activity.benefits.map(id => {
      const b = benefitMeta(id);
      return `<li><strong>${b.emoji} ${b.label}</strong> — ${b.blurb}</li>`;
    }).join('')}</ul>

    <h4>What you'll need</h4>
    <ul>${activity.materials.map(m => `<li>${m}</li>`).join('')}</ul>

    <h4>Set up</h4>
    <p>${activity.setup}</p>

    <h4>Steps</h4>
    <ol>${activity.steps.map(s => `<li>${s}</li>`).join('')}</ol>

    <h4>Safety notes</h4>
    <ul class="safety-list">${activity.safety.map(s => `<li>${s}</li>`).join('')}</ul>

    <h4>Keeping attention / adapting for ADHD</h4>
    <ul class="tips-list">${activity.attentionTips.map(t => `<li>${t}</li>`).join('')}</ul>

    ${activity.dexterityNotes ? `<h4>Dexterity adaptation</h4><p>${activity.dexterityNotes}</p>` : ''}
  `;
}

function openModal(activity) {
  const cat = categoryMeta(activity.category);
  els.modalBody.innerHTML = `
    ${activityHeaderHtml(activity, cat)}
    ${activityDetailBodyHtml(activity)}
    <div class="modal-actions">
      <button type="button" class="btn ${state.plan.includes(activity.id) ? 'btn-added' : 'btn-primary'}" id="modal-add-btn">
        ${state.plan.includes(activity.id) ? '✓ In Weekly Plan' : '+ Add to Weekly Plan'}
      </button>
    </div>
  `;
  els.modalBody.querySelector('#modal-add-btn').addEventListener('click', () => {
    togglePlan(activity.id);
    openModal(ACTIVITIES.find(a => a.id === activity.id));
  });
  els.modalBackdrop.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  document.body.classList.remove('modal-open');
}

function savePlan() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plan)); } catch (e) { /* storage unavailable */ }
}

function loadPlan() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.plan = JSON.parse(raw);
  } catch (e) { state.plan = []; }
}

function saveFilters() {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify({
      ageBand: state.ageBand,
      categories: [...state.categories],
      benefitFocus: [...state.benefitFocus],
      maxDuration: state.maxDuration,
      dexterityOnly: state.dexterityOnly,
    }));
  } catch (e) { /* storage unavailable */ }
}

function loadFilters() {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw) {
      const f = JSON.parse(raw);
      state.ageBand = f.ageBand || null;
      state.categories = new Set(f.categories || []);
      state.benefitFocus = new Set(f.benefitFocus || []);
      state.maxDuration = f.maxDuration || null;
      state.dexterityOnly = !!f.dexterityOnly;
    }
  } catch (e) { /* ignore */ }

  refreshAgeToggleUI();
  refreshChipUI();
  refreshBenefitChipUI();
  els.durationSelect.value = state.maxDuration || '';
  els.dexterityToggle.checked = state.dexterityOnly;
}

document.addEventListener('DOMContentLoaded', init);
