# Quick Play Live FL V2 Independent Promotion Review

Date: 2026-08-12
Scope: explicit offline Quick Play Single Player gameplay authority plus the separately composed Free Kick Practice control route
Verdict on the frozen candidate below: **GO for the two explicit offline FL V2 playtest routes**

## Frozen bytes reviewed

- `match-engine/live-v2-authority-adapter.js`: `4567ed9c55d9072e544e36c7572b5e7f07bcf0b3d0b5bcb275ff987c26faa326`
- `match-engine/match.html`: `0d0bc4ea63368722d7220526b717bf04769aa6ce074a90a4bf174a6105e0df82`
- `match-engine/live-v2-contact-authority-composer.js`: `bc277f91b9b4a49c5243355b0f7ca1846302cc817d37f948f64de317ef24412f`
- `match-engine/live-v2-match-control-composition.js`: `e75e2d63fb57a884c829b705732714c2418fe4d3f5f4060ef58de2128e07bcc0`

## Independent automated evidence

The final bounded promotion review passed **59/59** critical gates, including the late-release Ball chronology regression, live contact composition, match-control composition and the Quick Play selector/workflow boundary.

The new gates prove:

1. Exact frozen bytes and exact dependency versions/schemas.
2. Unforgeable capability provenance; online markers and unsupported workflows fail closed.
3. Immutable private plans, exact-once commits, and sequential ticks.
4. Whole-tick host rollback and self-freeze to Build 173 on commit failure.
5. Released-ball Ball V2 authority retains team, intended receiver, and offside context.
6. Deterministic replay, finite bounded telemetry, and reset re-arm at tick one.
7. Exact query/payload/seed preflight; duplicate, zero-seed, online, unsupported, and shadow-conflict cases load no V2 scripts.
8. Exactly one live V2 tick hook and success-gated overlapping legacy locomotion, CPU, contact, loose-ball integration, and goal-frame collision.
9. Existing controller, keyboard, restart, replay, camera, goalkeeper, rules, and red-card containment remains Build 173.
10. Madrid BBC identity is byte-exact and every Quick Play workflow remains present.
11. Circular Build 173 player/scan references from an ordinary pass are captured by identity instead of traversed through JSON.

The focused engine suites additionally prove deterministic beeline runs, formation/rest-defence behaviour, carrier actions, pass-flight support, organic offside, transition phases, first-touch/aerial chronology and replay invariance.

## Closed browser blocker

The first frozen browser candidate fell back after an ordinary human movement/pass sequence. The exact diagnostic was a circular JSON traversal through Build 173 runtime references: `player.scan.teammates[0].player` closed back onto the player. Player runtime fields, `TEAM_BRAIN`, and `actionPowerFeedback.actor` deliberately retain these live references, so the transaction now saves/restores their top-level identities while continuing to clone JSON-safe stats and report data.

The exact prior failing browser sequence was rerun on the final bytes. A normal Quick Play launch remained on FL V2 through 08:37 and `committedTick=818` after kickoff, movement and repeated passing, with `failureCode=none` and zero browser warnings/errors. The real Quick Play Free Kick Practice selector also launched the FL V2 Set-Piece Suite, accepted the take-set-piece input, opened its dedicated Escape menu without opening ordinary pause, and produced zero warnings/errors.

## Boundaries of this GO

- Build 173 remains the default and rollback engine.
- Only explicitly selected offline Single Player and Free Kick Practice can arm FL V2.
- Online, co-op, CPU-v-CPU and every other unsupported workflow remain Build 173 or fail closed. The shared renderer, goalkeeper, normal-match rules and protected replay lanes remain Build 173-owned at the documented composition boundary.
- The browser evidence is a promotion smoke/playability gate, not a claim that every match outcome has received human tuning.

No existing workflow was removed or reduced by this review.
