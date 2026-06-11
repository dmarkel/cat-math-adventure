/* Whisker's School: pick a table, get an interactive lesson with tricks,
   skip-counting, and gentle practice. */

let lesson = null;

function renderSchool() {
  const numbers = [];
  for (let n = 1; n <= 12; n++) {
    const visited = (state.lessons || {})[n];
    numbers.push(`<button class="school-num ${visited ? 'visited' : ''}" data-n="${n}">
      ×${n}${visited ? '<span class="school-check">✓</span>' : ''}
    </button>`);
  }
  app.innerHTML = `
    <div class="screen screen-school">
      ${header('🎓 Whisker’s School', 'map')}
      <div class="school-stage">
        <div class="school-cat bounce-in">${catSVG('teacher', 150)}</div>
        <div class="speech-bubble">Welcome to class, ${state.name || 'explorer'}! Pick a number and I’ll teach you all my tricks for that times table! 📚</div>
      </div>
      <div class="school-grid">${numbers.join('')}</div>
    </div>`;
  document.querySelectorAll('.school-num').forEach((b) =>
    b.addEventListener('click', () => { Sound.play('tap'); startLesson(+b.dataset.n); }));
  wireCommon();
}

function startLesson(n) {
  lesson = { n, step: 'count', practiceFacts: Engine.pickFacts(state, [n], 3), pIdx: 0, tries: 0 };
  renderLessonStep();
}

function lessonShell(inner, teacherLine) {
  app.innerHTML = `
    <div class="screen screen-school">
      ${header(`🎓 The ×${lesson.n} Table`, 'school')}
      <div class="school-stage">
        <div class="school-cat">${catSVG('teacher', 120)}</div>
        <div class="speech-bubble" id="teacherLine">${teacherLine}</div>
      </div>
      <div class="lesson-card bounce-in" id="lessonCard">${inner}</div>
    </div>`;
  wireCommon();
}

function renderLessonStep() {
  const { n, step } = lesson;
  if (step === 'count') renderCountStep(n);
  else if (step === 'trick') renderTrickStep(n);
  else if (step === 'practice') renderPracticeStep(n);
  else renderLessonDone(n);
}

/* --- step 1: what ×n means + skip-count stones --- */
function renderCountStep(n) {
  const stones = [];
  for (let i = 1; i <= 12; i++) {
    stones.push(`<button class="stone" data-i="${i}"><span class="stone-q">${i}×${n}</span></button>`);
  }
  lessonShell(`
    <h3>${n} at a time!</h3>
    <p class="lesson-text">“Times ${n}” means <b>groups of ${n}</b>. So 3 × ${n} is 3 groups of ${n} things!</p>
    <p class="lesson-text">Tap each stepping stone to skip-count up the whole table — say it out loud with me!</p>
    <div class="stone-path" id="stonePath">${stones.join('')}</div>
    <div class="lesson-nav"><button class="btn btn-big btn-primary" id="nextBtn">Next: Whisker’s Trick! ➜</button></div>
  `, `Let’s learn the ×${n} table together! First — what does “times ${n}” even mean?`);

  let revealed = 0;
  document.getElementById('stonePath').addEventListener('click', (e) => {
    const stone = e.target.closest('.stone');
    if (!stone || stone.classList.contains('revealed')) return;
    Sound.play('tap');
    stone.classList.add('revealed');
    stone.innerHTML = `<span class="stone-a">${+stone.dataset.i * n}</span><span class="stone-sub">${stone.dataset.i}×${n}</span>`;
    revealed += 1;
    if (revealed === 12) {
      Sound.play('win');
      document.getElementById('teacherLine').textContent =
        `You counted the WHOLE ×${n} table! ${pick(TEACHER_PRAISE)}`;
    }
  });
  document.getElementById('nextBtn').addEventListener('click', () => {
    Sound.play('tap');
    lesson.step = 'trick';
    renderLessonStep();
  });
}

/* --- step 2: the trick (+ finger widget for 9) --- */
function renderTrickStep(n) {
  const data = LESSONS[n];
  const [a, b] = data.example;
  const trickLines = data.trick.map((t, i) =>
    `<p class="lesson-text trick-line" style="animation-delay:${i * 0.9}s">💡 ${t}</p>`).join('');
  const widget = data.widget === 'fingers' ? `
    <div class="finger-box">
      <p class="lesson-text"><b>Try it!</b> To find 9 × a number, fold that finger down. Fingers on the left are TENS, fingers on the right are ONES. Tap a finger!</p>
      <div class="hands" id="hands">
        ${Array.from({ length: 10 }, (_, i) => `<button class="finger" data-f="${i + 1}">${i + 1}</button>`).join('')}
      </div>
      <p class="finger-result" id="fingerResult">Tap any finger to see the magic! ✨</p>
    </div>` : '';

  lessonShell(`
    <h3>Whisker’s Trick for ×${n}</h3>
    ${trickLines}
    ${widget}
    <div class="lesson-nav"><button class="btn btn-big btn-primary" id="nextBtn">Your Turn! ➜</button></div>
  `, `Now for my favorite part — the secret trick! 🤫`);

  const hands = document.getElementById('hands');
  if (hands) {
    hands.addEventListener('click', (e) => {
      const f = e.target.closest('.finger');
      if (!f) return;
      Sound.play('catch');
      document.querySelectorAll('.finger').forEach((el) => el.classList.remove('folded'));
      f.classList.add('folded');
      const k = +f.dataset.f;
      const tens = k - 1, ones = 10 - k;
      document.getElementById('fingerResult').innerHTML =
        `9 × ${k} → fold finger ${k} → <b>${tens}</b> finger${tens === 1 ? '' : 's'} on the left, <b>${ones}</b> on the right → <b>${tens * 10 + ones}</b>! 🎉`;
    });
  }
  document.getElementById('nextBtn').addEventListener('click', () => {
    Sound.play('tap');
    lesson.step = 'practice';
    renderLessonStep();
  });
}

/* --- step 3: three gentle practice problems --- */
function renderPracticeStep(n) {
  const [a, b] = lesson.practiceFacts[lesson.pIdx];
  lesson.tries = 0;
  lessonShell(`
    <div class="dialog-qcount">Practice ${lesson.pIdx + 1} of ${lesson.practiceFacts.length}</div>
    <div class="question-text"><span>${a}</span> × <span>${b}</span> = <span class="answer-slot" id="answerSlot">?</span></div>
    <div class="hint-area" id="hintArea"></div>
    <div class="numpad" id="numpad">
      ${[1,2,3,4,5,6,7,8,9].map((k) => `<button class="pad-key" data-key="${k}">${k}</button>`).join('')}
      <button class="pad-key pad-clear" data-key="clear">⌫</button>
      <button class="pad-key" data-key="0">0</button>
      <button class="pad-key pad-go" data-key="go">GO!</button>
    </div>
  `, lesson.pIdx === 0 ? 'Your turn! Use the trick — and take your time, I’m right here. 🐾' : pick(TEACHER_PRAISE));

  let entry = '';
  const slot = document.getElementById('answerSlot');
  const line = document.getElementById('teacherLine');
  const setEntry = (v) => {
    entry = v.slice(0, 3);
    slot.textContent = entry || '?';
    slot.classList.toggle('filled', !!entry);
  };
  const submit = () => {
    const value = parseInt(entry, 10);
    lesson.tries += 1;
    const firstTry = lesson.tries === 1;
    if (value === a * b) {
      Engine.recordAnswer(state, a, b, true, firstTry);
      state.fish += firstTry ? 2 : 1;
      saveNow();
      Sound.play('correct');
      slot.classList.add('correct');
      line.textContent = `${pick(PRAISE)} ${a} × ${b} = ${a * b}!`;
      setTimeout(() => {
        lesson.pIdx += 1;
        if (lesson.pIdx >= lesson.practiceFacts.length) lesson.step = 'done';
        renderLessonStep();
      }, 1100);
    } else {
      Engine.recordAnswer(state, a, b, false, firstTry);
      saveNow();
      Sound.play('wrong');
      slot.classList.add('wrong');
      setTimeout(() => { slot.classList.remove('wrong', 'filled'); slot.textContent = '?'; entry = ''; }, 600);
      if (lesson.tries === 1) {
        line.textContent = `${pick(ENCOURAGE)} Remember the trick: ${LESSONS[n].trick[0]}`;
        showHint(a, b);
      } else {
        line.textContent = `That’s okay — learning takes tries! ${a} × ${b} = ${a * b}. Say it once out loud with me! 💛`;
        document.getElementById('hintArea').innerHTML = '';
        setTimeout(() => {
          lesson.pIdx += 1;
          if (lesson.pIdx >= lesson.practiceFacts.length) lesson.step = 'done';
          renderLessonStep();
        }, 2400);
      }
    }
  };
  const press = (key) => {
    if (key === 'clear') { Sound.play('tap'); setEntry(entry.slice(0, -1)); }
    else if (key === 'go') { if (entry) submit(); }
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

/* --- step 4: celebration --- */
function renderLessonDone(n) {
  if (!state.lessons) state.lessons = {};
  const firstTime = !state.lessons[n];
  state.lessons[n] = true;
  state.fish += 5;
  saveNow();
  Sound.play('win');
  confetti(60);
  lessonShell(`
    <h3>×${n} Lesson Complete! 🎉</h3>
    <p class="lesson-text">🐟 +5 fish treats for being a great student!</p>
    <p class="lesson-text">Now go try the adventure — the trick will be right there in your head when you need it!</p>
    <div class="lesson-nav">
      <button class="btn btn-big btn-primary" data-go="school">📚 Another Lesson</button>
      <button class="btn btn-big" data-go="map">🗺️ To the Map!</button>
    </div>
  `, firstTime
    ? `You finished your first ×${n} lesson — I’m one proud teacher-cat! 😻`
    : `Back for more ×${n}? That’s how champions practice! 🏆`);
  wireCommon();
}
