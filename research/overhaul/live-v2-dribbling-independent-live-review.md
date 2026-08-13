# Live V2 Dribbling independent live review

Date: 2026-08-12
Verdict: **PASS — no open P0 or P1 blocker on the reviewed bytes.**

## Reviewed bytes

- `match-engine/dribbling-state-v2.js` — `6c57e9626b4844233c7cafe5aee8d42743cd1244e74b55aeb7144a2838b2b29a`
- `match-engine/live-v2-authority-adapter.js` — `0abf4e3ee5af94dbabccc5a7c37833d82540ce5e086beaa51723b66222539548`
- `match-engine/match.html` — `960cadd33e5772384dc27a8fe52db93ff8cd1beec0ab0dd71e6e68ac332dc80b`
- Independent adversarial gate: `tests/live-v2-dribbling-independent-live-review.mjs` — `b02c72581171a3c6e9446d67e9188c71ca6a1dbf56901a91d233c8017f9f464f`

## Evidence

Bundled Node final bounded matrix: **89/89 pass**.

- Core, purity and independent adversarial gates: **30/30**.
- Host, first-touch coexistence and transaction gates: **25/25**.
- CPU-v-CPU, strict-stop, Quick Play and protected-route gates: **34/34**.

The review covers conditional loading; Single Player and CPU-v-CPU shared physics; physical ownerless Ball V2 touches with retained logical authority; human pass, shot, lob/cross and through-ball buffering; captured command direction and exact-once release after resecure; CPU action suppression/parity; shielding and protected-skill handoff; restart, replay, offside, keeper, online, Set-Piece Suite and Build 173 containment; reception-loop prevention; export/restore and replay projection equality; transaction rollback; stable action identity; nested Ball metadata detachment; and finite action/touch bounds.

## Blockers closed during review

- **P0:** a separated Dribbling V2 ball could be reclaimed by the same-frame legacy reception loop. The full lease now suppresses legacy reception, while contact-owned first-touch presentation keeps precedence on the securing frame.
- **P1:** terminal lease output could strand a pending human action; it is now retired explicitly.
- **P1:** duplicate prepared handles could commit one frame twice, and an old finalized handle could rewind a newer committed tick. Preparation is single-reservation and stale rollback tokens are inert.
- **P1:** a reused stable action ID could execute again with a newer command tick, while a future command tick could poison chronology. Stable IDs are globally exact-once within a finite 2,048-ID match ledger and future ticks fail closed.
- **P1:** nested Ball metadata was shallow-copied and result freezing could mutate caller-owned state. Result metadata is now detached before freezing.
- **P1:** transaction rollback omitted dribble presentation fields and human receiver selection; both are captured/restored.
- **P1:** buffered human actions re-read the later stick direction; pass, shot, lob/cross and through-ball release now uses the command-time direction.
- **P1:** secured dribble presentation could overwrite a first-touch pose, while heavy-touch/turnover failure animation targeted the wrong player. Contact pose precedence and prior-carrier failure presentation are now enforced.

## Non-blocking hardening notes

- **P2:** cyclic or excessively deep untrusted nested input fails closed, but generally through a stack-overflow diagnostic rather than an explicit cycle/depth/roster-size validator. Intended host snapshots are bounded and JSON-shaped; explicit structural limits would improve diagnostics and adversarial resilience.
- **P2:** the adapter can accept snapshot `dribbling.actionIntent` during CPU-v-CPU if a nonstandard caller injects it. The shipped CPU-v-CPU host has no human source for that field, but the adapter could enforce CPU provenance itself.
- **P2 scope note:** checkpoint replay is proven chunk-identical through the Dribbling/adapter projection. After resecure, the stable released command deliberately enters the existing Build 173 pass/shot executor; whole-match RNG state is outside this module's export contract.
- **P2 scope note:** human and CPU carriers share byte-equivalent touch physics and action handling, but CPU decision code does not currently originate a shield command. This is a decision-repertoire gap, not a physics-parity fault.

No workflow, route or Build 173 behavior was removed by this review.
