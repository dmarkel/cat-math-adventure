/* Explorable world: arrow-key movement, characters who ask questions,
   items as rewards, and a gate that opens when all items are earned. */

const QUESTIONS_PER_CHAR = 2;
let world = null;

function startZone(zoneId) {
  const zone = ZONES.find((z) => z.id === zoneId);
  const grid = zone.map.map((r) => r.split(''));
  let start = { x: 1, y: 1 };
  const chars = [];
  let gate = null;
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (c === 'S') { start = { x, y }; grid[y][x] = '.'; }
    else if (c >= '1' && c <= '4') {
      chars.push({ ...zone.characters[+c - 1], idx: +c - 1, x, y, answered: 0, done: false });
      grid[y][x] = '.';
    } else if (c === 'G') { gate = { x, y, open: false }; }
  }));
  world = { zone, grid, chars, gate, cat: { ...start }, facing: 1 };
  session = {
    zone,
    facts: Engine.pickFacts(state, zone.tables, zone.characters.length * QUESTIONS_PER_CHAR),
    qIdx: 0,
    firstTryCorrect: 0,
    triesThisQuestion: 0,
    items: 0,
    total: zone.characters.length * QUESTIONS_PER_CHAR,
  };
  renderWorld();
}

function renderWorld() {
  const { zone, grid, chars, gate, cat } = world;
  const H = grid.length, W = grid[0].length;

  let tiles = '';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      const alt = (x + y) % 2 ? ' alt' : '';
      if (c === '#') tiles += `<div class="tile block${alt}"><span>${zone.blockEmoji}</span></div>`;
      else if (c === '~') tiles += `<div class="tile water${alt}"></div>`;
      else if (c === 'G') tiles += `<div class="tile gate${alt}" id="gateTile"><span>🚪</span></div>`;
      else if (c === ',') tiles += `<div class="tile${alt}"><span class="decor">${zone.decorEmoji}</span></div>`;
      else tiles += `<div class="tile${alt}"></div>`;
    }
  }

  const sprites = chars.map((ch) => `
    <button class="sprite char" id="char-${ch.idx}" style="--x:${ch.x};--y:${ch.y}"
            aria-label="${ch.name}">${ch.emoji}</button>`).join('');

  app.innerHTML = `
    <div class="screen screen-world" style="--zone-color:${zone.color}">
      ${header(`${zone.emoji} ${zone.name}`, 'map')}
      <div class="world-hud">
        <span class="chip" id="itemChip">${zone.item.emoji} 0 / ${chars.length}</span>
        <span class="hint-text">Walk with arrow keys — visit every friend, then head to the door! 🚪</span>
      </div>
      <div class="world" id="worldBox"
           style="--cols:${W};--rows:${H};--ground:${zone.ground};--ground-alt:${zone.groundAlt};--water:${zone.water}">
        <div class="tiles">${tiles}</div>
        ${sprites}
        <div class="sprite cat-sprite" id="catSprite" style="--x:${cat.x};--y:${cat.y}">${catSVG('happy', 64)}</div>
      </div>
      <div class="dpad">
        <button class="dpad-btn up" data-dir="0,-1">▲</button>
        <button class="dpad-btn left" data-dir="-1,0">◀</button>
        <button class="dpad-btn down" data-dir="0,1">▼</button>
        <button class="dpad-btn right" data-dir="1,0">▶</button>
      </div>
    </div>`;
  wireCommon();

  document.querySelectorAll('.dpad-btn').forEach((b) =>
    b.addEventListener('click', () => {
      const [dx, dy] = b.dataset.dir.split(',').map(Number);
      tryMove(dx, dy);
    }));

  chars.forEach((ch) => {
    document.getElementById(`char-${ch.idx}`).addEventListener('click', () => {
      const near = Math.abs(ch.x - world.cat.x) + Math.abs(ch.y - world.cat.y) === 1;
      if (near) openDialog(ch);
      else toast(`Walk over to ${ch.name} to talk!`);
    });
  });

  const keyHandler = (e) => {
    if (!document.getElementById('worldBox')) { document.removeEventListener('keydown', keyHandler); return; }
    if (document.querySelector('.dialog-overlay')) return; // dialog has its own keys
    const dirs = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    };
    const dir = dirs[e.key];
    if (dir) { e.preventDefault(); tryMove(dir[0], dir[1]); }
  };
  document.addEventListener('keydown', keyHandler);
}

function updateCatSprite() {
  const el = document.getElementById('catSprite');
  if (!el) return;
  el.style.setProperty('--x', world.cat.x);
  el.style.setProperty('--y', world.cat.y);
  el.classList.toggle('flip', world.facing < 0);
}

function tryMove(dx, dy) {
  if (!world || document.querySelector('.dialog-overlay')) return;
  const { grid, chars, gate, cat, zone } = world;
  if (dx) world.facing = dx;
  const nx = cat.x + dx, ny = cat.y + dy;
  if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) return;

  const charHere = chars.find((c) => c.x === nx && c.y === ny);
  if (charHere) { updateCatSprite(); openDialog(charHere); return; }

  if (gate.x === nx && gate.y === ny) {
    if (gate.open) { finishZone(); }
    else {
      Sound.play('wrong');
      toast(`🔒 The door is locked! Earn all ${chars.length} ${zone.item.plural} first.`);
    }
    return;
  }

  const t = grid[ny][nx];
  if (t === '#' || t === '~') { updateCatSprite(); return; }

  cat.x = nx; cat.y = ny;
  updateCatSprite();
}

function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('worldBox').appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/* ---------- character dialog ---------- */

function openDialog(char) {
  const { zone } = world;
  if (char.done) {
    toast(`${char.emoji} "Thanks again! Enjoy the ${zone.item.name}!"`);
    return;
  }
  session.triesThisQuestion = 0;
  const [a, b] = session.facts[session.qIdx];
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog bounce-in">
      <div class="dialog-head">
        <span class="dialog-emoji">${char.emoji}</span>
        <div>
          <h3>${char.name}</h3>
          <p class="dialog-line" id="dialogLine">${char.answered === 0 ? char.line : 'One more and the ' + zone.item.name + ' is yours!'}</p>
        </div>
      </div>
      <div class="question-card">
        <div class="dialog-qcount">Question ${char.answered + 1} of ${QUESTIONS_PER_CHAR}</div>
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
  document.querySelector('.screen-world').appendChild(overlay);
  wireDialogNumpad(a, b, char);
}

function wireDialogNumpad(a, b, char) {
  let entry = '';
  const slot = document.getElementById('answerSlot');
  const setEntry = (v) => {
    entry = v.slice(0, 3);
    slot.textContent = entry || '?';
    slot.classList.toggle('filled', !!entry);
  };
  const press = (key) => {
    if (key === 'clear') { Sound.play('tap'); setEntry(entry.slice(0, -1)); }
    else if (key === 'go') { if (entry) submitDialogAnswer(a, b, parseInt(entry, 10), char); }
    else { Sound.play('tap'); setEntry(entry + key); }
  };
  document.getElementById('numpad').addEventListener('click', (e) => {
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

function submitDialogAnswer(a, b, value, char) {
  const correct = value === a * b;
  session.triesThisQuestion += 1;
  const firstTry = session.triesThisQuestion === 1;
  const line = document.getElementById('dialogLine');
  const slot = document.getElementById('answerSlot');

  if (correct) {
    Engine.recordAnswer(state, a, b, true, firstTry);
    if (firstTry) session.firstTryCorrect += 1;
    state.fish += firstTry ? 2 : 1;
    saveNow();
    Sound.play('correct');
    slot.classList.add('correct');
    line.textContent = `${pick(PRAISE)} ${a} × ${b} = ${a * b}!`;
    setTimeout(() => advanceDialog(char), 1100);
  } else {
    Engine.recordAnswer(state, a, b, false, firstTry);
    saveNow();
    Sound.play('wrong');
    slot.classList.add('wrong');
    setTimeout(() => {
      if (document.contains(slot)) {
        slot.classList.remove('wrong', 'filled');
        slot.textContent = '?';
      }
    }, 600);
    if (session.triesThisQuestion === 1) {
      line.textContent = pick(ENCOURAGE);
      showHint(a, b);
    } else {
      line.textContent = `That's okay! ${a} × ${b} = ${a * b}. Let's remember it together! 💛`;
      document.getElementById('hintArea').innerHTML = '';
      setTimeout(() => advanceDialog(char), 2200);
    }
  }
}

// Visual hint: a groups-of grid of paw prints
function showHint(a, b) {
  const rows = Math.min(a, b), cols = Math.max(a, b);
  const area = document.getElementById('hintArea');
  if (rows * cols > 60) {
    area.innerHTML = `<p class="hint-text">Hint: ${a} × ${b} is ${a} groups of ${b}. Try skip-counting by ${Math.max(a, b)}!</p>`;
    return;
  }
  let grid = '';
  for (let r = 0; r < rows; r++) {
    grid += `<div class="hint-row">${'<span>🐾</span>'.repeat(cols)}</div>`;
  }
  area.innerHTML = `<p class="hint-text">${rows} rows of ${cols}:</p><div class="hint-grid">${grid}</div>`;
}

function advanceDialog(char) {
  session.qIdx += 1;
  char.answered += 1;
  document.querySelector('.dialog-overlay')?.remove();
  if (char.answered >= QUESTIONS_PER_CHAR) completeChar(char);
  else openDialog(char);
}

function completeChar(char) {
  const { zone, chars, gate } = world;
  char.done = true;
  session.items += 1;
  state.fish += 3;
  saveNow();
  Sound.play('catch');

  const sprite = document.getElementById(`char-${char.idx}`);
  sprite.classList.add('done');
  sprite.insertAdjacentHTML('beforeend', `<span class="item-pop">${zone.item.emoji}</span>`);
  document.getElementById('itemChip').textContent = `${zone.item.emoji} ${session.items} / ${chars.length}`;

  if (session.items >= chars.length) {
    gate.open = true;
    const gateTile = document.getElementById('gateTile');
    gateTile.classList.add('open');
    gateTile.innerHTML = '<span>✨</span>';
    Sound.play('win');
    toast(`✨ You earned all the ${zone.item.plural}! The door is open — go through it!`);
  } else {
    toast(`${zone.item.emoji} You earned a ${zone.item.name}! ${chars.length - session.items} more to go!`);
  }
}

/* ---------- zone completion ---------- */

function finishZone() {
  const { zone } = session;
  const total = session.total;
  const stars = Engine.starsForAccuracy(session.firstTryCorrect, total);
  const zs = state.zones[zone.id] || { stars: 0, plays: 0 };
  zs.stars = Math.max(zs.stars, stars);
  zs.plays += 1;
  state.zones[zone.id] = zs;
  const bonus = stars * 3;
  state.fish += bonus;
  if (!state.treasures) state.treasures = {};
  state.treasures[zone.id] = (state.treasures[zone.id] || 0) + session.items;
  saveNow();
  Sound.play('win');
  confetti();
  world = null;

  const zoneIdx = ZONES.findIndex((z) => z.id === zone.id);
  const next = ZONES[zoneIdx + 1];
  const unlockedNext = next && stars >= 1 && state.zones[next.id] === undefined;

  app.innerHTML = `
    <div class="screen screen-result" style="--zone-color:${zone.color}">
      <div class="result-card bounce-in">
        <div class="result-cat">${catSVG('excited', 160)}</div>
        <h2>${zone.name} Complete!</h2>
        <div class="result-stars">${'<span class="star earned">★</span>'.repeat(stars)}${'<span class="star">★</span>'.repeat(3 - stars)}</div>
        <p class="result-line">${zone.item.emoji} ${session.items} ${session.items === 1 ? zone.item.name : zone.item.plural} collected!</p>
        <p class="result-line">${session.firstTryCorrect} of ${total} on the first try — 🐟 +${bonus} bonus treats!</p>
        ${unlockedNext ? `<p class="result-unlock">🎉 You unlocked <strong>${next.emoji} ${next.name}</strong>!</p>` : ''}
        ${stars < 3 ? `<p class="hint-text">Play again to earn ${3 - stars} more star${stars === 2 ? '' : 's'}!</p>` : ''}
        <div class="result-buttons">
          <button class="btn btn-big btn-primary" id="replayBtn">↻ Play Again</button>
          <button class="btn btn-big" data-go="map">🗺️ Back to Map</button>
        </div>
      </div>
    </div>`;
  document.getElementById('replayBtn').addEventListener('click', () => startZone(zone.id));
  wireCommon();
}
