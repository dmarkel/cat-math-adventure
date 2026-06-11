/* Core game logic: fact mastery, adaptive question picking, save state.
   No DOM access here — also runs under Node for tests. */

const Engine = (() => {
  const SAVE_KEY = 'catMathAdventure.v1';
  const MASTERY_STREAK = 3; // consecutive first-try correct answers to master a fact

  function freshState() {
    return {
      name: '',
      facts: {},   // "3x4" -> { c: correct, w: wrong, streak: first-try streak }
      zones: {},   // zoneId -> { stars: 0-3, plays: n }
      fish: 0,     // treat currency earned across modes
      muted: false,
      created: Date.now(),
    };
  }

  function factKey(a, b) {
    // 3x4 and 4x3 are the same fact; store under the sorted key
    return a <= b ? `${a}x${b}` : `${b}x${a}`;
  }

  function factRecord(state, a, b) {
    const key = factKey(a, b);
    if (!state.facts[key]) state.facts[key] = { c: 0, w: 0, streak: 0 };
    return state.facts[key];
  }

  function isMastered(state, a, b) {
    const rec = state.facts[factKey(a, b)];
    return !!rec && rec.streak >= MASTERY_STREAK;
  }

  function recordAnswer(state, a, b, correct, firstTry) {
    const rec = factRecord(state, a, b);
    if (correct) {
      rec.c += 1;
      rec.streak = firstTry ? rec.streak + 1 : 0;
    } else {
      rec.w += 1;
      rec.streak = 0;
    }
    return rec;
  }

  // All unique facts for a set of tables, paired with every multiplier 1-12.
  function factsForTables(tables) {
    const seen = new Set();
    const out = [];
    for (const t of tables) {
      for (let m = 1; m <= 12; m++) {
        const key = factKey(t, m);
        if (!seen.has(key)) {
          seen.add(key);
          out.push([t, m]);
        }
      }
    }
    return out;
  }

  // Weight: unseen facts get a solid base, wrong-heavy facts get boosted,
  // mastered facts still appear occasionally so they stay fresh.
  function factWeight(state, a, b) {
    const rec = state.facts[factKey(a, b)];
    if (!rec) return 6;
    if (rec.streak >= MASTERY_STREAK) return 1;
    return 4 + Math.min(rec.w * 3, 12) - Math.min(rec.streak, 3);
  }

  function weightedPick(pairs, weights, rng) {
    let total = 0;
    for (const w of weights) total += w;
    let roll = rng() * total;
    for (let i = 0; i < pairs.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return pairs.length - 1;
  }

  // Pick n facts for a session, weighted toward what needs practice,
  // never repeating a fact back-to-back.
  function pickFacts(state, tables, n, rng = Math.random) {
    const pool = factsForTables(tables);
    const picked = [];
    let lastKey = null;
    for (let i = 0; i < n; i++) {
      const candidates = pool.filter(([a, b]) => factKey(a, b) !== lastKey || pool.length === 1);
      const weights = candidates.map(([a, b]) => factWeight(state, a, b));
      const idx = weightedPick(candidates, weights, rng);
      const [a, b] = candidates[idx];
      // Randomize presentation order so she sees both 3×4 and 4×3
      const flip = rng() < 0.5;
      picked.push(flip ? [b, a] : [a, b]);
      lastKey = factKey(a, b);
    }
    return picked;
  }

  // Plausible wrong answers near the real product (off-by-one-table errors etc.)
  function decoysFor(a, b, count, rng = Math.random) {
    const answer = a * b;
    const candidates = new Set();
    const options = [
      (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1),
      answer + a, answer - a, answer + b, answer - b,
      answer + 1, answer - 1, answer + 10, answer - 10,
    ];
    for (const v of options) {
      if (v > 0 && v !== answer) candidates.add(v);
    }
    const list = [...candidates];
    const out = [];
    while (out.length < count && list.length) {
      const i = Math.floor(rng() * list.length);
      out.push(list.splice(i, 1)[0]);
    }
    let pad = answer + 2;
    while (out.length < count) {
      if (pad !== answer && !out.includes(pad)) out.push(pad);
      pad++;
    }
    return out;
  }

  function tableProgress(state, table) {
    let mastered = 0;
    for (let m = 1; m <= 12; m++) {
      if (isMastered(state, table, m)) mastered++;
    }
    return { mastered, total: 12 };
  }

  function starsForAccuracy(firstTryCorrect, total) {
    const pct = firstTryCorrect / total;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    return 1;
  }

  // --- persistence (browser only; storage arg injectable for tests) ---
  function load(storage) {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      return Object.assign(freshState(), JSON.parse(raw));
    } catch {
      return freshState();
    }
  }

  function save(state, storage) {
    try {
      storage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch { /* storage full or blocked — play on without saving */ }
  }

  return {
    freshState, factKey, isMastered, recordAnswer, factsForTables,
    pickFacts, decoysFor, tableProgress, starsForAccuracy, load, save,
    MASTERY_STREAK,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
