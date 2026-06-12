/* Mini-games: Fish Frenzy and Whisker Dash. Both use facts from unlocked zones. */

/* ---------- Fish Frenzy: click the fish carrying the right answer ---------- */
function startFishFrenzy() {
  const tables = unlockedTables();
  const GAME_SECONDS = 45;
  let score = 0;
  let timeLeft = GAME_SECONDS;
  let current = null; // [a, b]
  let spawnTimer = null;
  let clockTimer = null;
  let over = false;

  app.innerHTML = `
    <div class="screen screen-fish">
      ${header('🎣 Fish Frenzy', 'map')}
      <div class="fish-hud">
        <div class="fish-question" id="fishQ"></div>
        <div class="chip" id="fishScore">🐟 0</div>
        <div class="chip" id="fishClock">⏱ ${GAME_SECONDS}</div>
      </div>
      <div class="pond" id="pond">
        <div class="pond-cat">${catSVG('thinking', 100)}</div>
      </div>
      <p class="hint-text center">Click the fish with the right answer before it swims away!</p>
    </div>`;
  wireCommon();
  const pond = $('#pond');

  function newQuestion() {
    const [pair] = Engine.pickFacts(state, tables, 1);
    current = pair;
    $('#fishQ').textContent = `${pair[0]} × ${pair[1]} = ?`;
  }

  function spawnFish() {
    if (over) return;
    const [a, b] = current;
    // 40% chance this fish carries the correct answer
    const isCorrect = Math.random() < 0.4;
    const value = isCorrect ? a * b : Engine.decoysFor(a, b, 1)[0];
    const fish = document.createElement('button');
    fish.className = 'fish swim';
    fish.innerHTML = `<span class="fish-body">🐠</span><span class="fish-num">${value}</span>`;
    fish.style.top = 8 + Math.random() * 72 + '%';
    fish.style.animationDuration = 4 + Math.random() * 3 + 's';
    if (Math.random() < 0.5) fish.classList.add('swim-left');
    fish.addEventListener('click', () => {
      if (over) return;
      if (parseInt(fish.dataset.value, 10) === a * b) {
        Sound.play('catch');
        score += 1;
        state.fish += 1;
        $('#fishScore').textContent = `🐟 ${score}`;
        fish.classList.add('caught');
        setTimeout(() => fish.remove(), 350);
        newQuestion();
      } else {
        Sound.play('wrong');
        fish.classList.add('nope');
        setTimeout(() => fish.classList.remove('nope'), 400);
      }
    });
    fish.dataset.value = value;
    fish.addEventListener('animationend', () => fish.remove());
    pond.appendChild(fish);
  }

  function endGame() {
    over = true;
    clearInterval(spawnTimer);
    clearInterval(clockTimer);
    saveNow();
    Sound.play('win');
    pond.innerHTML = `
      <div class="result-card bounce-in pond-result">
        <div>${catSVG('excited', 120)}</div>
        <h2>Time's up!</h2>
        <p class="result-line">You caught <b>${score}</b> fish! 🐟 +${score} treats</p>
        <div class="result-buttons">
          <button class="btn btn-big btn-primary" id="againBtn">↻ Play Again</button>
          <button class="btn btn-big" data-go="map">🗺️ Back to Map</button>
        </div>
      </div>`;
    $('#againBtn').addEventListener('click', startFishFrenzy);
    wireCommon();
  }

  newQuestion();
  spawnFish();
  spawnTimer = setInterval(spawnFish, 1300);
  clockTimer = setInterval(() => {
    timeLeft -= 1;
    $('#fishClock').textContent = `⏱ ${timeLeft}`;
    if (timeLeft <= 0) endGame();
  }, 1000);

  // stop timers if she navigates away mid-game
  document.querySelectorAll('[data-go]').forEach((b) =>
    b.addEventListener('click', () => { over = true; clearInterval(spawnTimer); clearInterval(clockTimer); }));
}

/* ---------- Whisker Dash: runner with blocks, spikes, pits, and math gates ---------- */
function startWhiskerDash() {
  const tables = unlockedTables();
  const SEGMENTS = 3;
  const HAZARDS_PER_SEG = 8;
  const CAT_X = 80;             // cat's fixed screen x
  const CAT_W = 40, CAT_H = 44; // collision box
  const CAT_FOOT = 56;          // visual offset: cat svg's paws within the 60px render
  const GRAVITY = 2400;         // px/s^2
  const JUMP_V = -860;          // px/s
  const PIT_DEPTH = 60;         // fall this far below ground = lost in the pit
  let speed = 280;              // px/s, +12% per segment

  let offset = 0;               // world scroll position
  let segStartOffset = 0;       // checkpoint to restart from
  let catY = 0, velY = 0;       // 0 = ground level, negative = up, positive = falling in a pit
  let segment = 0;
  let hazards = [];             // blocks + spikes: {worldX,w,h,hx,hw,hh,el}
  let pits = [];                // {start,end,el}
  let grounds = [];             // solid ground pieces: {x,w,el}
  let gate = null;              // {worldX, el, fact}
  let finishX = null;
  let alive = true, paused = false, won = false;
  let firstTryGates = 0, gateTries = 0;
  let lastT = 0, raf = 0;

  app.innerHTML = `
    <div class="screen screen-dash">
      ${header('🏃 Whisker Dash', 'map')}
      <div class="dash-hud">
        <div class="dash-progress"><i id="dashBar"></i></div>
        <span class="chip" id="dashSeg">Part 1 of ${SEGMENTS}</span>
      </div>
      <div class="dash-area" id="dashArea">
        <div class="dash-clouds"><i></i><i></i></div>
        <div class="dash-track" id="dashTrack"></div>
        <div class="dash-cat" id="dashCat">${catSVG('excited', 60)}</div>
      </div>
      <p class="hint-text center">Tap or press SPACE to jump blocks, spikes, and pits! Answer the math gates to keep running!</p>
    </div>`;
  wireCommon();
  const area = $('#dashArea');
  const track = $('#dashTrack');
  const catEl = $('#dashCat');
  const groundY = () => area.clientHeight - 44; // top of the ground

  function addEl(cls) {
    const el = document.createElement('div');
    el.className = cls;
    track.appendChild(el);
    return el;
  }

  function buildSegment() {
    track.innerHTML = '';
    hazards = []; pits = []; grounds = [];
    const viewW = Math.max(area.clientWidth, 700);
    let x = offset + viewW + 160;
    let gCursor = offset - 400; // solid ground starts well behind the cat

    // hazard mix: always 2 pits, rest blocks/spikes shuffled
    const types = ['pit', 'pit'];
    for (let i = 2; i < HAZARDS_PER_SEG; i++) types.push(Math.random() < 0.5 ? 'block' : 'spike');
    types.sort(() => Math.random() - 0.5);

    for (const type of types) {
      if (type === 'pit') {
        const pw = 90 + Math.random() * 50; // always jumpable
        grounds.push({ x: gCursor, w: x - gCursor, el: addEl('dash-groundseg') });
        pits.push({ start: x, end: x + pw, el: addEl('dash-pit') });
        gCursor = x + pw;
        x += pw + 340 + Math.random() * 260 + speed * 0.2;
      } else if (type === 'block') {
        const h = 26 + Math.floor(Math.random() * 3) * 12;
        const w = Math.random() < 0.25 ? 64 : 34;
        hazards.push({ worldX: x, w, h, hx: x, hw: w, hh: h, el: addEl('dash-obst') });
        x += 340 + Math.random() * 300 + speed * 0.25;
      } else {
        // spike: worldX is its center; forgiving triangle hitbox
        hazards.push({ worldX: x, w: 32, h: 38, hx: x - 8, hw: 16, hh: 28, el: addEl('dash-spike') });
        x += 340 + Math.random() * 300 + speed * 0.25;
      }
    }

    if (segment < SEGMENTS) {
      gate = { worldX: x + 220, el: addEl('dash-gate'), fact: Engine.pickFacts(state, tables, 1)[0] };
      gate.el.innerHTML = '<span>🔒</span>';
      finishX = null;
      grounds.push({ x: gCursor, w: gate.worldX + viewW * 2 - gCursor, el: addEl('dash-groundseg') });
    } else {
      gate = null;
      finishX = x + 220;
      const flag = addEl('dash-flag');
      flag.textContent = '🏁';
      grounds.push({ x: gCursor, w: finishX + viewW * 2 - gCursor, el: addEl('dash-groundseg') });
    }
    // hazards/gate/flag should paint above ground pieces
    for (const o of hazards) track.appendChild(o.el);
    if (gate) track.appendChild(gate.el);
  }

  function layout() {
    const gy = groundY();
    for (const g of grounds) {
      g.el.style.left = (g.x - offset) + 'px';
      g.el.style.width = g.w + 'px';
      g.el.style.top = gy + 'px';
    }
    for (const p of pits) {
      p.el.style.left = (p.start - offset) + 'px';
      p.el.style.width = (p.end - p.start) + 'px';
      p.el.style.top = gy + 4 + 'px';
    }
    for (const o of hazards) {
      const isSpike = o.el.classList.contains('dash-spike');
      o.el.style.left = (o.worldX - offset - (isSpike ? 16 : 0)) + 'px';
      o.el.style.top = (gy - o.h) + 'px';
      if (!isSpike) { o.el.style.width = o.w + 'px'; o.el.style.height = o.h + 'px'; }
    }
    if (gate) {
      gate.el.style.left = (gate.worldX - offset) + 'px';
      gate.el.style.top = (gy - 110) + 'px';
    }
    const flag = track.querySelector('.dash-flag');
    if (flag && finishX !== null) {
      flag.style.left = (finishX - offset) + 'px';
      flag.style.top = (gy - 64) + 'px';
    }
    catEl.style.left = CAT_X + 'px';
    catEl.style.top = (gy - CAT_FOOT + catY) + 'px';
    catEl.classList.toggle('air', catY < -2);
    const totalLen = (SEGMENTS + 1) * HAZARDS_PER_SEG * 560;
    $('#dashBar').style.width = Math.min(100, (offset / totalLen) * 100) + '%';
  }

  function supported() {
    const cx = offset + CAT_X + CAT_W / 2;
    return !pits.some((p) => cx > p.start + 10 && cx < p.end - 10);
  }

  function jump() {
    if (!alive || paused || won) return;
    if (catY === 0 && supported()) { velY = JUMP_V; Sound.play('catch'); }
  }

  function crash() {
    Sound.play('wrong');
    alive = false;
    catEl.classList.add('crashed');
    area.classList.add('shake');
    setTimeout(() => {
      catEl.classList.remove('crashed');
      area.classList.remove('shake');
      offset = segStartOffset;
      catY = 0; velY = 0;
      alive = true;
      layout();
    }, 700);
  }

  function step(t) {
    if (!document.getElementById('dashArea')) { cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(step);
    const dt = Math.min((t - lastT) / 1000, 0.04);
    lastT = t;
    if (paused || !alive || won) return;

    offset += speed * dt;
    velY += GRAVITY * dt;
    catY += velY * dt;

    if (catY >= 0) {
      if (supported()) { catY = 0; velY = 0; }
      else if (catY > PIT_DEPTH) { crash(); return; } // fell into a pit
    }

    // collision with blocks and spikes (forgiving hitboxes)
    const catL = CAT_X + 8, catR = CAT_X + CAT_W - 8;
    for (const o of hazards) {
      const ox = o.hx - offset;
      if (ox < catR && ox + o.hw > catL && catY > -o.hh) { crash(); return; }
    }

    if (gate && gate.worldX - offset < CAT_X + 70) { openMathGate(); return; }
    if (finishX !== null && finishX - offset < CAT_X + 50) { winDash(); return; }
    layout();
  }

  function openMathGate() {
    paused = true;
    gateTries = 0;
    const [a, b] = gate.fact;
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog bounce-in">
        <div class="dialog-head">
          <span class="dialog-emoji">🔒</span>
          <div><h3>Math Gate!</h3><p class="dialog-line" id="dialogLine">Answer to open the gate and keep running!</p></div>
        </div>
        <div class="question-card">
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
    document.querySelector('.screen-dash').appendChild(overlay);

    let entry = '';
    const slot = overlay.querySelector('#answerSlot');
    const line = overlay.querySelector('#dialogLine');
    const setEntry = (v) => {
      entry = v.slice(0, 3);
      slot.textContent = entry || '?';
      slot.classList.toggle('filled', !!entry);
    };
    const pass = () => {
      overlay.remove();
      gate.el.innerHTML = '<span>✨</span>';
      gate.el.classList.add('open');
      const passedGate = gate.el;
      setTimeout(() => passedGate.remove(), 900);
      gate = null;
      segment += 1;
      speed *= 1.12;
      segStartOffset = offset;       // checkpoint!
      $('#dashSeg').textContent = segment < SEGMENTS ? `Part ${segment + 1} of ${SEGMENTS}` : 'Final stretch!';
      buildSegment();
      layout();
      paused = false;
    };
    const submit = () => {
      const value = parseInt(entry, 10);
      gateTries += 1;
      const firstTry = gateTries === 1;
      if (value === a * b) {
        Engine.recordAnswer(state, a, b, true, firstTry);
        if (firstTry) firstTryGates += 1;
        state.fish += firstTry ? 2 : 1;
        saveNow();
        Sound.play('correct');
        slot.classList.add('correct');
        line.textContent = `${pick(PRAISE)} The gate is open!`;
        setTimeout(pass, 900);
      } else {
        Engine.recordAnswer(state, a, b, false, firstTry);
        saveNow();
        Sound.play('wrong');
        slot.classList.add('wrong');
        setTimeout(() => { slot.classList.remove('wrong', 'filled'); slot.textContent = '?'; entry = ''; }, 600);
        if (gateTries === 1) {
          line.textContent = pick(ENCOURAGE);
          showHint(a, b);
        } else {
          line.textContent = `That's okay! ${a} × ${b} = ${a * b} — gate's open, keep running! 💛`;
          overlay.querySelector('#hintArea').innerHTML = '';
          setTimeout(pass, 1800);
        }
      }
    };
    overlay.querySelector('#numpad').addEventListener('click', (e) => {
      const btn = e.target.closest('.pad-key');
      if (!btn) return;
      if (btn.dataset.key === 'clear') { Sound.play('tap'); setEntry(entry.slice(0, -1)); }
      else if (btn.dataset.key === 'go') { if (entry) submit(); }
      else { Sound.play('tap'); setEntry(entry + btn.dataset.key); }
    });
    const keyHandler = (e) => {
      if (!document.contains(slot)) { document.removeEventListener('keydown', keyHandler); return; }
      if (e.key >= '0' && e.key <= '9') { Sound.play('tap'); setEntry(entry + e.key); }
      else if (e.key === 'Backspace') setEntry(entry.slice(0, -1));
      else if (e.key === 'Enter' && entry) submit();
    };
    document.addEventListener('keydown', keyHandler);
  }

  function winDash() {
    won = true;
    cancelAnimationFrame(raf);
    const reward = 5 + firstTryGates * 3;
    state.fish += reward;
    saveNow();
    Sound.play('win');
    confetti();
    area.insertAdjacentHTML('beforeend', `
      <div class="result-card bounce-in pond-result">
        <div>${catSVG('excited', 110)}</div>
        <h2>You made it! 🏁</h2>
        <p class="result-line">${firstTryGates} of ${SEGMENTS} gates on the first try!</p>
        <p class="result-line">🐟 +${reward} treats!</p>
        <div class="result-buttons">
          <button class="btn btn-big btn-primary" id="againBtn">↻ Run Again</button>
          <button class="btn btn-big" data-go="map">🗺️ Back to Map</button>
        </div>
      </div>`);
    $('#againBtn').addEventListener('click', startWhiskerDash);
    wireCommon();
  }

  // controls
  area.addEventListener('pointerdown', jump);
  const keyHandler = (e) => {
    if (!document.getElementById('dashArea')) { document.removeEventListener('keydown', keyHandler); return; }
    if (paused) return;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jump(); }
  };
  document.addEventListener('keydown', keyHandler);

  buildSegment();
  layout();
  lastT = performance.now();
  raf = requestAnimationFrame(step);
}
