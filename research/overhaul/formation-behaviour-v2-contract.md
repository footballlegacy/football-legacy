# Formation / Team Behaviour V2 contract

Status: **dormant additive candidate**. Build 173 remains authoritative. The module is not loaded or called by `match-engine/match.html`, and this work removes or replaces no existing workflow.

## Audited formation inventory

The repository currently exposes or recognises eight base formations. V2 covers their union rather than only the Quick Play selector subset.

| Formation | Repository evidence | Canonical defensive shape | Canonical attacking shape |
|---|---|---:|---:|
| 4-4-2 | Quick Play, match engine, Create a Club, career manager pool | 4-4-2 | 2-4-4 |
| 4-3-3 | Quick Play, match engine, Create a Club, career manager pool | 4-1-4-1 | 2-3-5 |
| 4-2-3-1 | Quick Play, match engine, Create a Club, career manager pool | 4-4-1-1 | 2-3-5 |
| 3-5-2 | Quick Play, match engine, Create a Club, career manager pool | 5-3-2 | 3-2-5 |
| 3-4-3 | Quick Play, match engine, historic playtest teams | 5-4-1 | 3-2-5 |
| 5-3-2 | match engine | 5-3-2 | 3-2-5 |
| 5-2-3 | match engine | 5-4-1 | 3-2-5 |
| 4-5-1 | Create a Club, career manager pool | 4-5-1 | 2-3-5 |

The focused gate independently extracts that union from the live repository and fails if an exposed formation lacks a V2 definition.

## Authority and API

`match-engine/formation-behaviour-v2.js` is a UMD/CommonJS pure request-to-shape engine:

- `resolve(request)` returns target positions plus stable telemetry.
- `validateFormation(code)` normalises supported compact and hyphenated codes.
- `canonicalLineup(code)` creates a role-valid reference eleven.
- `validateLineup(code, lineup)` validates slot identity, unique player identity, goalkeeper assignment and compatible positions.
- `createPhilosophyOverlay(spec)` creates an immutable, team-independent philosophy.
- `stableTelemetryJson(output)` creates key-canonical JSON for golden traces.

No input object is mutated. There is no random source, wall clock, presentation clock, timer or animation dependency. `tick` is explicit simulation metadata.

## Phase contract

Every formation defines all five phases:

1. `buildup`
2. `settled-attack`
3. `defend`
4. `positive-transition`
5. `negative-transition`

The base definition owns its slot bands, role families, compatible positions, default duty, defensive/offensive reference shapes, phase-shape label, rest-defence target and deterministic reduction order. Phase geometry supplies longitudinal line ranges. Width, depth and compactness modify geometry monotonically inside safety limits.

Coordinates are generated in an attacking-direction-neutral normalized space, then mapped into the supplied pitch. `attackingDirection` mirrors longitudinal geometry; `mirrorLateral` mirrors lateral geometry. Pitch insets and the supplied offside line are applied last and are reported in telemetry.

## Player-count and sent-off adaptation

V2 accepts seven through eleven active players. `unavailableSlotIds` describes known absent/sent-off slots; `playerCount` can request further deterministic reduction. The goalkeeper is retained. Each formation has an explicit stable removal order, and surviving members of affected lines are redistributed deterministically across the line's original span.

Telemetry records unavailable, removed and active slot IDs. This makes 10/9/8/7-player behaviour replayable and diffable; it is not a hidden runtime guess.

## Rest defence

Every base shape declares a minimum rest-defence unit. Selection is deterministic by role and formation order, then constrained behind a phase-specific maximum attacking progress. A philosophy can increase or change the per-phase number without altering the base formation.

## Philosophy overlay interface

Philosophies are independent of club/team IDs. A valid overlay declares:

- stable `id`, human `label`, and `baseFormation`;
- optional phase-shape labels;
- optional phase width/depth/compactness multipliers;
- optional per-phase, per-slot progress/lateral adjustments and instructions;
- optional per-phase rest-defence counts;
- descriptive principles.

The validator explicitly rejects `teamId` and `teamIds`. This lets future career data assign a philosophy to any compatible team while preserving one reusable geometry contract.

Two named examples prove the interface:

- `invincibles-442`: 4-4-2 defensive base, 4-4-1-1 buildup/transition, 3-2-5 settled attack, left overlap/inside rotation, connector plus depth runner, three-player rest defence.
- `conte-343`: 3-4-2-1 buildup, 3-2-5 settled attack, 5-4-1 defence, wing-back width/recovery, half-space wide forwards, back-three rest defence.

Neither example contains a Football Legacy team ID or a team-specific runtime branch.

## Required promotion gates

The dormant contract may not become live authority until an explicit later migration adds shadow comparison against Build 173. Current focused gates prove:

- full repository inventory coverage;
- eleven unique role-valid slots and one goalkeeper per formation;
- all eight formations resolve all five phases;
- deterministic, non-mutating, JSON-safe output;
- pitch and offside safety in both directions;
- monotonic width, depth and compactness controls;
- rest-defence stability;
- deterministic 10/9/8/7-player adaptation;
- lateral and attacking-direction mirror consistency;
- generic Invincibles and Conte overlay behaviour;
- custom career-facing overlay validation with team-ID rejection;
- byte-stable telemetry JSON;
- no live load/call and no workflow removal.

Future live work should first log Build 173 and V2 targets side by side for identical fixed-tick snapshots, then approve formation-by-formation golden traces before any opt-in authority switch. Geometry tuning and live integration are deliberately outside this dormant change.
