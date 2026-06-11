/* Screen routing: title, map, progress. Exploration lives in world.js. */

let state = Engine.load(localStorage);
let session = null;

const app = document.getElementById('app');
const $ = (sel, el = document) => el.querySelector(sel);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function saveNow() { Engine.save(state, localStorage); }

// All zones are open from the start — she picks whatever she wants to play.
function zoneUnlocked() { return true; }

function totalStars() {
  return ZONES.reduce((s, z) => s + ((state.zones[z.id] || {}).stars || 0), 0);
}

function unlockedTables() {
  const tables = [];
  ZONES.forEach((z, i) => { if (zoneUnlocked(i)) tables.push(...z.tables); });
  return tables;
}

function header(title, backScreen) {
  return `
    <header class="topbar">
      <button class="btn btn-back" data-go="${backScreen}">← Back</button>
      <h2>${title}</h2>
      <div class="topbar-right">
        <span class="chip">🐟 ${state.fish}</span>
        <span class="chip">⭐ ${totalStars()}</span>
        <button class="btn btn-mute" id="muteBtn" title="Sound on/off">${state.muted ? '🔇' : '🔊'}</button>
      </div>
    </header>`;
}

function wireCommon() {
  document.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => { Sound.play('tap'); showScreen(b.dataset.go); }));
  const mute = $('#muteBtn');
  if (mute) mute.addEventListener('click', () => {
    state.muted = !state.muted;
    mute.textContent = state.muted ? '🔇' : '🔊';
    saveNow();
  });
}

/* ---------- title screen ---------- */
function renderTitle() {
  const hasName = !!state.name;
  app.innerHTML = `
    <div class="screen screen-title">
      <div class="clouds"><i></i><i></i><i></i></div>
      <div class="title-cat bounce-in">${catSVG('excited', 190)}</div>
      <h1 class="game-title">Cat Math<br>Adventure</h1>
      <p class="tagline">Explore the world with Whisker — solve puzzles, meet friends, collect treasures! ✨</p>
      ${hasName ? `
        <p class="welcome">Welcome back, <strong>${state.name}</strong>! 🐾</p>
        <button class="btn btn-big btn-primary" id="playBtn">▶ Play</button>
        <button class="btn btn-big" data-go="progress">📊 My Progress</button>
      ` : `
        <label class="name-label" for="nameInput">What's your name, explorer?</label>
        <input id="nameInput" class="name-input" maxlength="20" placeholder="Type your name" autocomplete="off">
        <button class="btn btn-big btn-primary" id="startBtn">Let's Go! 🐾</button>
      `}
    </div>`;
  if (hasName) {
    $('#playBtn').addEventListener('click', () => { Sound.play('tap'); showScreen('map'); });
  } else {
    const go = () => {
      const name = $('#nameInput').value.trim();
      if (!name) { $('#nameInput').focus(); return; }
      state.name = name;
      saveNow();
      Sound.play('win');
      showScreen('map');
    };
    $('#startBtn').addEventListener('click', go);
    $('#nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  }
  wireCommon();
}

/* ---------- map screen ---------- */
function renderMap() {
  const stops = ZONES.map((z, i) => {
    const unlocked = zoneUnlocked(i);
    const zs = state.zones[z.id] || { stars: 0 };
    const stars = '★'.repeat(zs.stars) + '☆'.repeat(3 - zs.stars);
    return `
      <button class="zone-stop ${unlocked ? '' : 'locked'} ${i % 2 ? 'zig' : 'zag'}"
              data-zone="${z.id}" ${unlocked ? '' : 'disabled'}
              style="--zone-color:${z.color}">
        <span class="zone-emoji">${unlocked ? z.emoji : '🔒'}</span>
        <span class="zone-name">${z.name}</span>
        <span class="zone-tables">×${z.tables.join(' and ×')}</span>
        <span class="zone-stars">${unlocked ? stars : ''}</span>
      </button>`;
  }).join('<div class="path-dots">• • • •</div>');

  app.innerHTML = `
    <div class="screen screen-map">
      ${header(`${state.name}'s Adventure Map`, 'title')}
      <button class="school-card" id="schoolBtn">
        <span class="school-card-cat">${catSVG('teacher', 84)}</span>
        <span class="school-card-text">
          <span class="zone-name">🎓 Whisker’s School</span>
          <span class="zone-tables">Learn tricks for any times table!</span>
        </span>
      </button>
      <div class="map-trail">${stops}</div>
      <div class="map-extras">
        <h3>Mini-Games <span class="hint-text">(earn extra fish treats!)</span></h3>
        <div class="minigame-row">
          <button class="btn btn-game" id="fishBtn">🎣 Fish Frenzy</button>
          <button class="btn btn-game" id="matchBtn">🃏 Kitten Match</button>
        </div>
      </div>
    </div>`;
  document.querySelectorAll('.zone-stop:not(.locked)').forEach((b) =>
    b.addEventListener('click', () => { Sound.play('tap'); startZone(b.dataset.zone); }));
  $('#schoolBtn').addEventListener('click', () => { Sound.play('tap'); showScreen('school'); });
  $('#fishBtn').addEventListener('click', () => { Sound.play('tap'); startFishFrenzy(); });
  $('#matchBtn').addEventListener('click', () => { Sound.play('tap'); startKittenMatch(); });
  wireCommon();
}

/* ---------- progress screen ---------- */
function renderProgress() {
  const rows = [];
  for (let t = 1; t <= 12; t++) {
    const { mastered, total } = Engine.tableProgress(state, t);
    const pct = Math.round((mastered / total) * 100);
    rows.push(`
      <div class="prog-row">
        <span class="prog-label">×${t}</span>
        <div class="prog-bar"><i style="width:${pct}%"></i></div>
        <span class="prog-count">${mastered}/${total}</span>
      </div>`);
  }

  const treasures = ZONES.map((z) => {
    const n = (state.treasures || {})[z.id] || 0;
    return `<div class="treasure ${n ? '' : 'empty'}" title="${z.name}">
              <span class="treasure-emoji">${z.item.emoji}</span><b>×${n}</b>
            </div>`;
  }).join('');

  // fact grid: green = mastered, yellow = practicing, gray = not seen yet
  let gridCells = '<span class="fg-corner">×</span>';
  for (let c = 1; c <= 12; c++) gridCells += `<span class="fg-head">${c}</span>`;
  for (let r = 1; r <= 12; r++) {
    gridCells += `<span class="fg-head">${r}</span>`;
    for (let c = 1; c <= 12; c++) {
      const rec = state.facts[Engine.factKey(r, c)];
      const cls = !rec ? 'unseen' : rec.streak >= Engine.MASTERY_STREAK ? 'mastered' : 'learning';
      gridCells += `<span class="fg-cell ${cls}" title="${r}×${c}=${r * c}"></span>`;
    }
  }

  const masteredCount = Object.values(state.facts).filter((f) => f.streak >= Engine.MASTERY_STREAK).length;
  app.innerHTML = `
    <div class="screen screen-progress">
      ${header(`${state.name || 'Explorer'}'s Progress`, 'title')}
      <div class="progress-summary">
        <div class="sum-card">⭐<b>${totalStars()}</b><span>stars</span></div>
        <div class="sum-card">🐟<b>${state.fish}</b><span>fish treats</span></div>
        <div class="sum-card">🧠<b>${masteredCount}</b><span>facts mastered</span></div>
      </div>
      <h3>Treasure Shelf</h3>
      <div class="treasure-shelf">${treasures}</div>
      <h3>Times Tables</h3>
      <div class="prog-rows">${rows.join('')}</div>
      <h3>Fact Map <span class="hint-text">🟩 mastered · 🟨 practicing · ⬜ new</span></h3>
      <div class="fact-grid">${gridCells}</div>
    </div>`;
  wireCommon();
}

/* ---------- router ---------- */
function showScreen(name) {
  if (name === 'title') renderTitle();
  else if (name === 'map') renderMap();
  else if (name === 'progress') renderProgress();
  else if (name === 'school') renderSchool();
}

renderTitle();
