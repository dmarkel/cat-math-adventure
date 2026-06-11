/* Mini-games: Fish Frenzy and Kitten Match. Both use facts from unlocked zones. */

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

/* ---------- Kitten Match: pair each problem with its answer ---------- */
function startKittenMatch() {
  const tables = unlockedTables();
  const PAIRS = 6;
  const facts = Engine.pickFacts(state, tables, PAIRS);
  // ensure unique products so every problem has exactly one matching answer
  const seen = new Set();
  for (let i = 0; i < facts.length; i++) {
    let [a, b] = facts[i];
    let guard = 0;
    while (seen.has(a * b) && guard < 30) {
      [[a, b]] = Engine.pickFacts(state, tables, 1);
      guard++;
    }
    facts[i] = [a, b];
    seen.add(a * b);
  }

  const cards = [];
  facts.forEach(([a, b], i) => {
    cards.push({ id: i, label: `${a} × ${b}`, value: a * b, kind: 'q' });
    cards.push({ id: i, label: String(a * b), value: a * b, kind: 'a' });
  });
  cards.sort(() => Math.random() - 0.5);

  let flipped = [];
  let matched = 0;
  let moves = 0;
  let lock = false;

  app.innerHTML = `
    <div class="screen screen-match">
      ${header('🃏 Kitten Match', 'map')}
      <p class="hint-text center">Flip two cards: match each problem with its answer!</p>
      <div class="match-grid" id="matchGrid">
        ${cards.map((c, i) => `
          <button class="match-card" data-i="${i}">
            <span class="card-front">🐱</span>
            <span class="card-back ${c.kind}">${c.label}</span>
          </button>`).join('')}
      </div>
      <div class="match-hud"><span class="chip" id="movesChip">Flips: 0</span></div>
    </div>`;
  wireCommon();

  $('#matchGrid').addEventListener('click', (e) => {
    const el = e.target.closest('.match-card');
    if (!el || lock || el.classList.contains('matched') || el.classList.contains('flipped')) return;
    Sound.play('tap');
    el.classList.add('flipped');
    flipped.push(el);
    if (flipped.length < 2) return;

    moves += 1;
    $('#movesChip').textContent = `Flips: ${moves}`;
    const [c1, c2] = flipped.map((f) => cards[+f.dataset.i]);
    lock = true;
    if (c1.value === c2.value && c1.kind !== c2.kind) {
      Sound.play('correct');
      flipped.forEach((f) => f.classList.add('matched'));
      matched += 1;
      flipped = [];
      lock = false;
      if (matched === PAIRS) finishMatch(moves);
    } else {
      Sound.play('wrong');
      setTimeout(() => {
        flipped.forEach((f) => f.classList.remove('flipped'));
        flipped = [];
        lock = false;
      }, 900);
    }
  });

  function finishMatch(totalMoves) {
    const reward = Math.max(2, 10 - (totalMoves - PAIRS));
    state.fish += reward;
    saveNow();
    Sound.play('win');
    confetti(50);
    setTimeout(() => {
      $('#matchGrid').insertAdjacentHTML('afterend', `
        <div class="result-card bounce-in">
          <h2>All matched! 🎉</h2>
          <p class="result-line">${totalMoves} flips — 🐟 +${reward} treats!</p>
          <div class="result-buttons">
            <button class="btn btn-big btn-primary" id="againBtn">↻ Play Again</button>
            <button class="btn btn-big" data-go="map">🗺️ Back to Map</button>
          </div>
        </div>`);
      $('#againBtn').addEventListener('click', startKittenMatch);
      wireCommon();
    }, 600);
  }
}
