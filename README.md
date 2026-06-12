# Cat Math Adventure 🐱✨

A multiplication practice game for kids (3rd–4th grade). Help **Whisker the cat**
explore six zones — from Sunny Meadow to Star Summit — by solving multiplication
problems. Includes mini-games and progress tracking.

**Play it here:** https://dmarkel.github.io/cat-math-adventure/

## How it works

- **Whisker's School** — Teacher Whisker gives an interactive lesson on any
  times table (1–12): what "times N" means, tap-to-reveal skip-counting
  stones, a memory trick or mnemonic for that table (including the ×9 finger
  trick, fully interactive), and three gentle practice problems with
  encouragement. All zones are unlocked from the start, so she can play any
  level — the school is there whenever a table feels tough.

- **Adventure mode** — walk Whisker around each zone with the arrow keys (or
  the on-screen d-pad on tablets), rendered as a 3D tilted-board diorama.
  Each zone covers two times tables (×1–×12) and has its own terrain and four
  friendly characters who each ask two multiplication questions. Answer them
  to collect the zone's items (sunflowers, acorns, seashells...) — earn all
  four to open the door and finish the zone. Up to 3 stars per zone.
- **Adaptive practice** — facts answered wrong come back more often; a fact is
  "mastered" after 3 first-try correct answers in a row.
- **Hints** — a wrong answer shows the fact as rows of paw prints
  (e.g. 3 rows of 4), then reveals the answer kindly on a second miss.
- **Mini-games** — Fish Frenzy (catch the fish with the right answer) and
  Whisker Dash (a Geometry-Dash-style runner: jump the blocks, answer the
  math gate at each checkpoint to keep going; crashes restart from the last
  gate, never the beginning).
- **Progress screen** — stars, fish treats, per-table mastery bars, and a
  12×12 fact map (great for parents to check).

Progress is saved in the browser (localStorage) — she should use the same
device/browser each time to keep her progress.

## Tech

Plain HTML/CSS/JS, no build step, no backend. Hosted on GitHub Pages.

Run tests: `node tests/engine.test.js`
