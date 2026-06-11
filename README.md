# Cat Math Adventure 🐱✨

A multiplication practice game for kids (3rd–4th grade). Help **Whisker the cat**
explore six zones — from Sunny Meadow to Star Summit — by solving multiplication
problems. Includes mini-games and progress tracking.

**Play it here:** https://dmarkel.github.io/cat-math-adventure/

## How it works

- **Adventure mode** — each zone covers two times tables (×1–×12), with story
  obstacles solved by multiplication. Earn up to 3 stars per zone; 1 star
  unlocks the next zone.
- **Adaptive practice** — facts answered wrong come back more often; a fact is
  "mastered" after 3 first-try correct answers in a row.
- **Hints** — a wrong answer shows the fact as rows of paw prints
  (e.g. 3 rows of 4), then reveals the answer kindly on a second miss.
- **Mini-games** — Fish Frenzy (catch the fish with the right answer) and
  Kitten Match (memory pairs of problems and answers).
- **Progress screen** — stars, fish treats, per-table mastery bars, and a
  12×12 fact map (great for parents to check).

Progress is saved in the browser (localStorage) — she should use the same
device/browser each time to keep her progress.

## Tech

Plain HTML/CSS/JS, no build step, no backend. Hosted on GitHub Pages.

Run tests: `node tests/engine.test.js`
