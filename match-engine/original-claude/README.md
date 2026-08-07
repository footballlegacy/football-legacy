# Football Legacy — Match Engine (standalone)

This is the **playable match / "play the key moment" layer** for Football Legacy.
It is a **single self-contained HTML file** (`match-engine.html`) — open it in a
browser (Chrome/Safari, desktop, keyboard controls) and it runs on its own, no
build step, no external files, works offline.

It is **separate from the management game**. Think of it as one organ: the
management game (the living world, clubs, players, transfers, careers) is built
elsewhere; this is the bit that plays out a match and could report the result
back. The two are designed to meet at a clean data boundary (see "Integration"
below) — this file does NOT plug directly into the management codebase as-is.

---

## What it currently does

- Full stylised 3D **11-v-11** match (Three.js, drawn in code — no 3D art assets).
- **Full-size pitch** with a **ball-following broadcast camera** and a **radar/minimap**.
- **Controls:** Arrows = move · A = pass (hold for power/distance) · S = shoot
  (hold for power) · D = tackle (tap = poke, double-tap = slide) ·
  Q = skill/stepover (+ left/right) · W = switch player.
- **Four difficulty tiers** (Easy / Medium / Hard / Legend). Harder = the AI plays
  *better* (faster, presses more, shoots/tackles better, better keeper) — it never
  cheats. **Legend** additionally makes the human's own passing/shooting less
  forgiving (precision matters).
- **AI that plays football** — passes, shoots when in range, holds shape, presses.
- **Match flow:** two-column **walk-out** → kick-off → **match clock** (90 mins) →
  half-time → **full-time walk-off** → result.
- **Set pieces / rules:** throw-ins, corners, goal kicks, **fouls**, **free kicks**,
  and **penalties** (foul in the box → penalty, keeper on the line, strike at goal).
- **Officials:** referee (stays central) + two **linesmen** on the touchlines.
- **Named players** (placeholder names) + a **FIFA-style name banner** for the
  controlled player + **scorer detection** + **team goal celebrations** + a
  goal whistle and soft crowd ambience (all sound is generated in-code, no files).
- Frame-rate independent (delta-time) so it runs at a consistent speed on any
  display (60Hz, 120Hz, etc.).

## What it deliberately does NOT do (and why)

- **No photo-real players / real faces / motion-capture.** Those need a pro art
  pipeline (3D models, mocap) or image assets — out of scope for hand-written
  browser code. The figures are intentionally stylised. (A proof-of-concept for
  putting real face *images* on players exists separately and works, but is not
  in this build.)
- **No real club/player names or attributes yet.** All names are placeholders and
  every player currently plays to the same baseline ability — see Integration.
- **No offside** yet (planned; it's the hardest rule to get right).

---

## Integration (how this would connect to the management game)

The design principle is **"brain (simulation) separate from eyes (rendering)"**:
the match takes **data in** and gives a **result out**. To connect it, the two
sides just need to agree a shared shape for a *player* and a *team*.

**Data IN (what the management game would pass to a match):**
- Two teams, each: a club identity (name, colours, initials) + a squad of players.
- Each player: an id, a name, a position/role, and **attributes** on a 1–100 scale
  (e.g. pace, shooting, passing, tackling, keeping). Optionally a face image ref.
- Optionally: stadium parameters and a per-club **playing style**
  (defensive / balanced / attacking / pressing / counter).

**Result OUT (what a match would hand back):**
- Final score, plus a list of **match events** (goals + scorer + minute, etc.),
  and **appearances** for everyone who played — so the management game can write
  these into its permanent records (career stats, history).

**Two ways the management game can use a match:**
1. **Play it** — hand off to this engine so the user plays the key moments.
2. **Sim it** — run the same match logic *headless* (no rendering) and just take
   the result. The brain/eyes separation is what makes a "sim" button cheap.

### Where the placeholders live in the code (for whoever wires it up)
- `YOUNAMES` / `OPPNAMES` — arrays of placeholder names → swap for real squad names.
- Player objects are created in `kickoff()` via `mk(...)`; each has a `.name`
  (and would gain `.attributes` at integration).
- The mechanics already have clean "dials" that attributes/styles can drive:
  movement speed, pass forgiveness, shot spread, tackle success, keeper diving.
  Currently these are constants / difficulty-scaled; at integration they'd read
  from each player's attributes and each club's style.
- Scorer detection uses `lastTouchPlayer`; goals fire `score(team)`. That's the
  natural place to emit a "match event" for the result-out report.

---

## Note for ChatGPT

This file is provided so you can **see the match engine and understand its data
contract** — it is not expected to drop straight into the management codebase.
The useful next step for integration is agreeing the **player shape** (attributes,
1–100) and **team shape** (squad + optional style flag) described above, so the
match can be fed real squads and hand back real results (score, scorers,
appearances). Faces and menu portraits are the management/UI side; on-pitch
rendering is this engine's side.
