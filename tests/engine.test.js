/* Sanity tests for the game engine. Run: node tests/engine.test.js */

const Engine = require('../js/engine.js');

let failures = 0;
function check(name, cond) {
  if (cond) console.log(`  ok - ${name}`);
  else { failures++; console.error(`  FAIL - ${name}`); }
}

// factKey normalizes order
check('factKey treats 3x4 and 4x3 as the same fact',
  Engine.factKey(3, 4) === Engine.factKey(4, 3));

// mastery after streak of first-try corrects
{
  const s = Engine.freshState();
  for (let i = 0; i < Engine.MASTERY_STREAK; i++) Engine.recordAnswer(s, 3, 4, true, true);
  check('fact mastered after streak of first-try corrects', Engine.isMastered(s, 3, 4));
  check('mastery visible from flipped orientation', Engine.isMastered(s, 4, 3));
  Engine.recordAnswer(s, 3, 4, false, true);
  check('wrong answer resets mastery', !Engine.isMastered(s, 3, 4));
}

// non-first-try correct doesn't build streak
{
  const s = Engine.freshState();
  for (let i = 0; i < 10; i++) Engine.recordAnswer(s, 5, 5, true, false);
  check('second-try corrects never master a fact', !Engine.isMastered(s, 5, 5));
}

// pickFacts: right count, right tables, no immediate repeats
{
  const s = Engine.freshState();
  const picks = Engine.pickFacts(s, [3, 4], 50);
  check('pickFacts returns requested count', picks.length === 50);
  check('all picks come from requested tables',
    picks.every(([a, b]) => [3, 4].includes(a) || [3, 4].includes(b)));
  check('all picks within 1-12', picks.every(([a, b]) => a >= 1 && a <= 12 && b >= 1 && b <= 12));
  let repeats = 0;
  for (let i = 1; i < picks.length; i++) {
    if (Engine.factKey(...picks[i]) === Engine.factKey(...picks[i - 1])) repeats++;
  }
  check('no back-to-back repeats', repeats === 0);
}

// adaptive weighting: a struggling fact shows up more than a mastered one
{
  const s = Engine.freshState();
  for (let i = 0; i < 5; i++) Engine.recordAnswer(s, 7, 8, false, true);   // struggling
  for (let i = 0; i < 5; i++) Engine.recordAnswer(s, 7, 2, true, true);    // mastered
  let hard = 0, easy = 0;
  for (let i = 0; i < 400; i++) {
    const [[a, b]] = Engine.pickFacts(s, [7], 1);
    const key = Engine.factKey(a, b);
    if (key === '7x8') hard++;
    if (key === '2x7') easy++;
  }
  check('struggling facts appear more often than mastered ones', hard > easy * 2);
}

// decoys: never the right answer, always positive, unique, correct count
{
  for (const [a, b] of [[1, 1], [3, 4], [12, 12], [7, 9]]) {
    const d = Engine.decoysFor(a, b, 3);
    check(`decoys for ${a}x${b}: 3 unique positive wrong answers`,
      d.length === 3 && new Set(d).size === 3 && d.every((v) => v > 0 && v !== a * b));
  }
}

// stars
check('90%+ accuracy earns 3 stars', Engine.starsForAccuracy(9, 10) === 3);
check('70%+ accuracy earns 2 stars', Engine.starsForAccuracy(7, 10) === 2);
check('below 70% earns 1 star', Engine.starsForAccuracy(5, 10) === 1);

// persistence round-trip with a fake storage
{
  const fake = { data: {}, getItem(k) { return this.data[k] || null; }, setItem(k, v) { this.data[k] = v; } };
  const s = Engine.freshState();
  s.name = 'Testy';
  s.fish = 42;
  Engine.recordAnswer(s, 6, 7, true, true);
  Engine.save(s, fake);
  const loaded = Engine.load(fake);
  check('save/load round-trips name, fish, and facts',
    loaded.name === 'Testy' && loaded.fish === 42 && loaded.facts['6x7'].c === 1);
  check('load with empty storage gives fresh state',
    Engine.load({ getItem: () => null }).fish === 0);
}

// tableProgress
{
  const s = Engine.freshState();
  for (let m = 1; m <= 6; m++) {
    for (let i = 0; i < Engine.MASTERY_STREAK; i++) Engine.recordAnswer(s, 9, m, true, true);
  }
  const p = Engine.tableProgress(s, 9);
  check('tableProgress counts mastered facts', p.mastered === 6 && p.total === 12);
}

console.log(failures ? `\n${failures} test(s) FAILED` : '\nAll tests passed!');
process.exit(failures ? 1 : 0);
