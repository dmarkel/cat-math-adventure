/* Screen routing and adventure mode. */

let state = Engine.load(localStorage);

const app = document.getElementById('app');
const $ = (sel, el = document) => el.querySelector(sel);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function saveNow() { Engine.save(state, localStorage); }

function zoneUnlocked(i) {
  if (i === 0) return true;
  const prev = state.zones[ZONES[i - 1].id];
  return !!prev && prev.stars >= 1;
}

function totalStars() {
  return ZONES.reduce((s, z) => s + ((state.zones[z.id] || {}).stars || 0), 0);
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
      <p class="tagline">Help Whisker explore the world with multiplication magic! ✨</p>
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
  $('#fishBtn').addEventListener('click', () => { Sound.play('tap'); startFishFrenzy(); });
  $('#matchBtn').addEventListener('click', () => { Sound.play('tap'); startKittenMatch(); });
  wireCommon();
}

/* ---------- adventure mode ---------- */
let session = null;

function unlockedTables() {
  const tables = [];
  ZONES.forEach((z, i) => { if (zoneUnlocked(i)) tables.push(...z.tables); });
  return tables;
}

function startZone(zoneId) {
  const zone = ZONES.find((z) => z.id === zoneId);
  session = {
    zone,
    facts: Engine.pickFacts(state, zone.tables, QUESTIONS_PER_ZONE),
    idx: 0,
    firstTryCorrect: 0,
    triesThisQuestion: 0,
  };
  renderQuestion(zone.intro);
}

function renderQuestion(introText) {
  const { zone, facts, idx } = session;
  const [a, b] = facts[idx];
  session.triesThisQuestion = 0;
  const story = introText || pick(zone.obstacles);
  app.innerHTML = `
    <div class="screen screen-quest" style="--zone-color:${zone.color}">
      ${header(`${zone.emoji} ${zone.name}`, 'map')}
      <div class="quest-progress">
        <div class="quest-bar"><i style="width:${(idx / facts.length) * 100}%"></i></div>
        <span>${idx + 1} of ${facts.length}</span>
      </div>
      <div class="quest-stage">
        <div class="quest-cat" id="questCat">${catSVG('thinking', 130)}</div>
        <div class="speech-bubble" id="storyText">${story}</div>
      </div>
      <div class="question-card bounce-in">
        <div class="question-text"><span>${a}</span> × <span>${b}</span> = <span class="answer-slot" id="answerSlot">?</span></div>
        <div class="hint-area" id="hintArea"></div>
        <div class="numpad" id="numpad">
          ${[1,2,3,4,5,6,7,8,9].map((n) => `<button class="pad-key" data-key="${n}">${n}</button>`).join('')}
          <button class="pad-key pad-clear" data-key="clear">⌫</button>
          <button class="pad-key" data-key="0">0</button>
          <button class="pad-key pad-go" data-key="go">GO!</button>
        </div>
      </div>
    </div>`;
  wireNumpad(a, b);
  wireCommon();
}

function wireNumpad(a, b) {
  let entry = '';
  const slot = $('#answerSlot');
  const setEntry = (v) => {
    entry = v.slice(0, 3);
    slot.textContent = entry || '?';
    slot.classList.toggle('filled', !!entry);
  };
  const press = (key) => {
    if (key === 'clear') { Sound.play('tap'); setEntry(entry.slice(0, -1)); }
    else if (key === 'go') { if (entry) submitAnswer(a, b, parseInt(entry, 10)); }
    else { Sound.play('tap'); setEntry(entry + key); }
  };
  $('#numpad').addEventListener('click', (e) => {
    const btn = e.target.closest('.pad-key');
    if (btn) press(btn.dataset.key);
  });
  const keyHandler = (e) => {
    if (!document.contains(slot)) { document.removeEventListener('keydown', keyHandler); return; }
    if (e.key >= '0' && e.key <= '9') press(e.key);
    else if (e.key === 'Backspace') press('clear');
    else if (e.key === 'Enter') press('go');
  };
  document.addEventListener('keydown', keyHandler);
}

function submitAnswer(a, b, value) {
  const correct = value === a * b;
  session.triesThisQuestion += 1;
  const firstTry = session.triesThisQuestion === 1;

  if (correct) {
    Engine.recordAnswer(state, a, b, true, firstTry);
    if (firstTry) session.firstTryCorrect += 1;
    state.fish += firstTry ? 2 : 1;
    saveNow();
    Sound.play('correct');
    $('#questCat').innerHTML = catSVG('excited', 130);
    $('#storyText').textContent = pick(PRAISE) + ` ${a} × ${b} = ${a * b}!`;
    $('#answerSlot').classList.add('correct');
    setTimeout(nextQuestion, 1200);
  } else {
    Engine.recordAnswer(state, a, b, false, firstTry);
    saveNow();
    Sound.play('wrong');
    $('#answerSlot').classList.add('wrong');
    setTimeout(() => {
      const slot = $('#answerSlot');
      if (slot) { slot.classList.remove('wrong'); slot.textContent = '?'; slot.classList.remove('filled'); }
    }, 600);

    if (session.triesThisQuestion === 1) {
      $('#storyText').textContent = pick(ENCOURAGE);
      showHint(a, b);
    } else {
      // Two misses: show the answer kindly, re-queue the fact for later in this run
      $('#questCat').innerHTML = catSVG('happy', 130);
      $('#storyText').textContent = `That's okay! ${a} × ${b} = ${a * b}. Let's remember it together! 💛`;
      $('#hintArea').innerHTML = '';
      session.facts.push([a, b]);
      setTimeout(nextQuestion, 2300);
    }
  }
}

// Visual hint: a groups-of grid of paw prints
function showHint(a, b) {
  const rows = Math.min(a, b), cols = Math.max(a, b);
  if (rows * cols > 60) {
    $('#hintArea').innerHTML = `<p class="hint-text">Hint: ${a} × ${b} is ${a} groups of ${b}. Try skip-counting by ${Math.max(a,b)}!</p>`;
    return;
  }
  let grid = '';
  for (let r = 0; r < rows; r++) {
    grid += `<div class="hint-row">${'<span>🐾</span>'.repeat(cols)}</div>`;
  }
  $('#hintArea').innerHTML = `<p class="hint-text">${rows} rows of ${cols}:</p><div class="hint-grid">${grid}</div>`;
}

function nextQuestion() {
  session.idx += 1;
  if (session.idx >= session.facts.length) finishZone();
  else renderQuestion();
}

function finishZone() {
  const { zone, firstTryCorrect } = session;
  const total = QUESTIONS_PER_ZONE;
  const stars = Engine.starsForAccuracy(firstTryCorrect, total);
  const zs = state.zones[zone.id] || { stars: 0, plays: 0 };
  zs.stars = Math.max(zs.stars, stars);
  zs.plays += 1;
  state.zones[zone.id] = zs;
  const bonus = stars * 3;
  state.fish += bonus;
  saveNow();
  Sound.play('win');
  confetti();

  const zoneIdx = ZONES.findIndex((z) => z.id === zone.id);
  const next = ZONES[zoneIdx + 1];
  const unlockedNext = next && stars >= 1 && (state.zones[next.id] === undefined);

  app.innerHTML = `
    <div class="screen screen-result" style="--zone-color:${zone.color}">
      <div class="result-card bounce-in">
        <div class="result-cat">${catSVG('excited', 160)}</div>
        <h2>${zone.name} Complete!</h2>
        <div class="result-stars">${'<span class="star earned">★</span>'.repeat(stars)}${'<span class="star">★</span>'.repeat(3 - stars)}</div>
        <p class="result-line">${firstTryCorrect} of ${total} on the first try!</p>
        <p class="result-line">🐟 +${bonus} bonus fish treats!</p>
        ${unlockedNext ? `<p class="result-unlock">🎉 You unlocked <strong>${next.emoji} ${next.name}</strong>!</p>` : ''}
        ${stars < 3 ? `<p class="hint-text">Play again to earn ${3 - stars} more star${stars === 2 ? '' : 's'}!</p>` : ''}
        <div class="result-buttons">
          <button class="btn btn-big btn-primary" id="replayBtn">↻ Play Again</button>
          <button class="btn btn-big" data-go="map">🗺️ Back to Map</button>
        </div>
      </div>
    </div>`;
  $('#replayBtn').addEventListener('click', () => startZone(zone.id));
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
}

renderTitle();
