# Playtest gameplay-gap closure — 2026-08-12

This checkpoint closes only the three remaining gameplay gaps assigned from the three-log playtest audit. It does not change replay, set-piece camera, CPU-v-CPU authority, workflow availability, or foundation pins.

## Visual locomotion step distance

- World position, velocity, acceleration and top speed are unchanged.
- The presentation phase now advances at `2x` cadence, with doubled jog/sprint phase caps.
- One visible foot-plant cycle therefore covers roughly half the previous world distance (`visualStepDistanceRatio: .5`, `worldSpeedScale: 1`).
- The focused regression isolates the rendering section and rejects any write to player world position or velocity from the gait presentation branch.

## Minute-37 outfield loose-ball pickup

- An unowned, untargeted, non-shot slow ball in the defending half now creates a deterministic recovery contract.
- Eligible outfield defenders must be goal-side and belong to a defensive or central-midfield family. The lowest estimated arrival time wins, with player id as the final deterministic tie-break.
- Shots, crosses, restarts, high/aerial balls, intended-receiver flights, source-locked kickers, stunned/sliding players, and human-controlled players are excluded.
- The existing goalkeeper ETA contract retains priority. An outfielder is selected only when the goalkeeper does not own the race and the outfielder beats the nearest opponent by the safety margin.
- The selected defender actively sprints to the predicted point and takes possession inside the explicit claim radius. Telemetry distinguishes `outfield-loose-ball-contract` from `outfield-loose-ball-claim`.
- The dynamic minute-37 regression starts a centre-back goal-side of a slow ball, gives a nominally faster full-back a longer route, proves the centre-back wins by ETA and completes the pickup, then separately proves goalkeeper priority.

## Human open-play shot and direct-free-kick power

The concern was reproducible in the source conversion, so this was not left as an arbitrary feel-only retune.

The old host formulas produced these approximate initial speeds on the current regulation pitch after converting world units per tick to metres per second:

- normal open-play shot: about `56–76 m/s`;
- finesse shot: about `48–65 m/s`;
- low-driven shot: about `70–93 m/s`;
- representative 25 m dipping free kick: about `63 m/s`;
- full-power driven free kick: about `89 m/s`.

Those values demonstrated a unit-conversion defect. The corrected models define pace in regulation metres per second, then convert once to host world velocity:

- open-play finesse: `22.5–29 m/s`;
- open-play normal: `25–33 m/s`;
- open-play low-driven: `27–34 m/s`;
- direct free kicks by technique: `22.5–34 m/s`.

Power and relevant shooting/technique ratings remain monotonic within those envelopes. Shot logs now include `paceMps` and `arrivalMs`; direct-free-kick plans expose the same fields from their actual deterministic trajectory sample. The focused regression checks bounds, monotonic power response, and 18–32 m arrival windows. Further subjective feel tuning remains a real playtest decision rather than justification for another blind multiplier.

## Focused gate

`tests/playtest-replay-keeper-cadence-regressions.mjs` covers inline syntax, the protected replay/keeper behavior, exact gait presentation isolation, dynamic outfield pickup, goalkeeper priority, power bounds, monotonicity, and distance-to-arrival telemetry.
