# Live V2 CPU pass receiver-race gate — 2026-08-12

## Scope

This is a narrow offline FL V2 adapter gate. It does not replace CPU Intelligence V2, Movement V2, Magnus Reynolds ball physics, True Feel reception/dribbling, or any protected Build 173 workflow. It applies only when the current ball owner is CPU-controlled. Human-owned Single Player decisions and inputs bypass it.

## Deterministic acceptance contract

For a proposed CPU pass, the adapter mirrors the live host's existing distance-based pass speed/loft formula, creates the exact Ball V2 launch, and projects that launch through the Magnus Reynolds solver for at most 150 fixed 1/60 ticks. It evaluates samples at the solver's exact 1/240 substep cadence. Authored meeting points are clamped into a 4.5 m infield corridor before evaluation.

Receiver and opponent arrival ticks use their current position, velocity, facing, radius, stamina, role profile, and Movement V2 pace/acceleration/agility limits. Reaction delay uses explicit `reactions` first and `awareness` only as a backward-compatible fallback: `3 + round((99 - rating) / 11)`, bounded to 3–12 fixed ticks. The named receiver receives three ticks of anticipation and is evaluated against the exact authored rendezvous, not an arbitrary earlier path sample. The normal safe gate requires the receiver there at least eight ticks before MR enters its arrival window and at least six ticks ahead of the earliest opponent.

A narrow deterministic risk envelope avoids turning CPU football into 100% safe selection: only a CPU-authored progressive pass of at least 7 m and confidence `>=0.82` may proceed with a two-tick receiver buffer and two-tick opponent margin. The attempt remains fully physical—MR flight, First Touch, interceptions, heavy touches and outs are unchanged—and the gate records the exact reason and margins.

If the pass is unsafe, the original target is never released. The adapter deterministically selects a clear 4.5 m carry, otherwise tests only the nearest backwards/sideways teammate as a safe recycle through the same race, otherwise waits. An accepted pass persists the same receiver rendezvous throughout the MR flight and prevents own-team neutral-recovery logic from overriding it. It does **not** make intervening players intangible: MR sweeps the ball against every eligible outfield body. Before that player's reaction window opens, a hit is an involuntary physical deflection with no owner; after the window, the earliest swept body may attempt deliberate First Touch. The passer is protected from passive self-contact for exactly three ticks and remains under the host's longer deliberate kicker lock. A passive ricochet neutralises the authored route but preserves the original offside provenance and reaction stimulus. Opponents remain physically eligible throughout. Shots and rebounds never inherit the deliberate-pass reaction lock. No player or ball is teleported.

## Eight-seed characterization history

Eight fixed seeds (`173`, `442`, `1967`, `2004`, `2014`, `2017`, `3434`, `7331`) ran 1,800 ticks each, 14,400/14,400 committed ticks.

| Outcome | Before gate | With gate |
| --- | ---: | ---: |
| Pass attempts | 65 | 26 |
| Intended completions | 8 | 16 |
| Interceptions | 9 | 0 |
| Unintended teammate recoveries | 8 | 0 |
| Boundary outs from pending passes | 32 | 8 |
| Unresolved at sample end | 8 | 2 |
| Shots / goals in simplified probe | 0 / 0 | 8 / 8 |
| Strict stops | 0 | 0 |
| Logical-owner continuity violations | 0 | 0 |

That first post-gate probe exposed two test-live mismatches: receivers could acquire beside the source before flight, and the accepted route survived only the release tick. Both are now explicit adversarial gates. A final exact-byte characterization is required before promotion; the table above is retained as diagnostic history, not a current release claim.

## Proof gates

- Dedicated accepted/rejected/moving-runner/flight-chronology/persisted-rendezvous/boundary/risk-envelope/replay/chunk/human-bypass/teammate-source-lock/shot-rebound suite: 12 green, 0 red.
- Combined CPU-v-CPU authority, True Feel integration, and independent adapter review: 28 green, 0 red.
- The dedicated test proves accepted and rejected CPU fixtures, replay identity, export/restore chunk identity, preserved target/run data, CPU-v-CPU ownership, and an untouched human-owned Single Player path.
