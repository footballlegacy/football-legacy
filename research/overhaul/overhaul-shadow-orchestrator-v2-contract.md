# Unified Overhaul Shadow Orchestrator V2 Contract

Status: dormant, additive and read-only. Build 173 remains the only live gameplay authority.

## Purpose

`match-engine/overhaul-shadow-orchestrator-v2.js` runs the five dormant V2 candidates on one explicit fixed-tick timeline:

1. MatchClock phase synchronisation
2. Formation Behaviour
3. CPU Intelligence
4. Movement and Contact
5. Ball integration
6. comparison-only telemetry

It exists to prove that the candidate contracts can coexist against captured legacy before/after states. It cannot project candidate state or commands back into Build 173.

## Authority boundary

- Default state is disabled.
- Enablement requires an exact, workflow-scoped capability with acknowledgement `EXPLICIT_READ_ONLY_SHADOW_NO_BUILD_173_AUTHORITY`.
- Online is frozen and cannot receive an enablement capability.
- Every current offline workflow can be observed: set-piece suite, single player, quick play, local two player, home co-op and CPU versus CPU.
- Returned authority is always `build-173-legacy`; candidate authority is labelled `v2-read-only-shadow`.
- Every output and trace record states `readOnly: true` and `appliedToLive: false`.
- `match.html` does not load or call this module. No existing workflow or Build 173 branch is changed.

## Input boundary

Each enabled observation must use schema `football-legacy-unified-legacy-snapshot-v2` and provide:

- a sequential integer tick, starting at pre-match tick 1;
- the exact positive fixed-tick duration;
- one recognised workflow;
- one complete immutable mapping block;
- legacy ball states before and after the tick;
- legacy movement worlds before and after the tick plus any explicit commands;
- the explicitly expected CPU-team snapshots;
- the explicitly expected formation-team requests;
- the legacy clock phase, period, ball-live flag and gameplay time.

Starting at tick 1 is mandatory because CPU memory, movement state, ball bridge and MatchClock must share one epoch. A replay fragment cannot invent missing candidate history.

## Mapping contract

Mapping schema `football-legacy-unified-mapping-v2` must be atomic. `ball`, `movement`, `cpu`, `formation` and `clock` are all explicitly marked complete. The adapter rejects instead of guessing when any of these are absent or inconsistent:

- fixed-tick duration and reciprocal ball frames-per-second;
- every referenced player identity;
- coordinate scale, offset and pitch axes;
- ball position, velocity, spin, dip, curve and flight fields;
- movement bounds and player identity sets;
- expected CPU and formation team sets;
- legacy-to-V2 MatchClock phases;
- candidate configuration blocks.

The stable mapping signature is locked on tick 1. It cannot be reinterpreted during a trace.

## Fixed-tick composition

For each tick, the adapter:

1. validates and clones the complete legacy snapshot;
2. synchronises only the candidate MatchClock phase;
3. resolves formation targets;
4. evaluates CPU decisions using deterministic per-team memory;
5. derives movement commands;
6. advances Movement/Contact V2 exactly one tick;
7. advances the Ball V2 shadow bridge exactly one tick;
8. advances MatchClock V2 exactly one tick;
9. rejects the observation if any component misses the common tick barrier;
10. records candidate-versus-legacy comparisons without writing to legacy state.

Explicit legacy movement commands take precedence. CPU run/defend intent may supply a movement command only when no explicit command owns that player. Formation targets are the final fallback. These are shadow inputs only; they are not live controls.

MatchClock follows the requested FIFA-style contract: accelerated gameplay time advances only during the mapped live phase, while every phase advances deterministic real animation time. The legacy clock is only compared and never changed.

## Determinism and safety

- No `Math.random`, `Date`, presentation clock, timer or animation-frame authority.
- Seed must be an explicit non-zero integer.
- Fixed-tick state advances once per accepted snapshot; chunking a trace into calls cannot change output.
- Observations must be sequential and mapping-stable.
- Input objects may be frozen and are never mutated.
- CPU memory is private candidate state and is reset with every other candidate.
- Stable JSON output sorts object keys before serialisation.
- Malformed input while disabled is recorded as skipped and cannot initialise any V2 engine.
- Enabled input fails closed through a validation error before candidate advancement.

## Telemetry

Every accepted tick exposes:

- component versions and fixed execution order;
- clock, formation, CPU, movement/contact and ball candidate telemetry;
- movement-command derivation and precedence;
- ball state/error comparisons;
- per-player movement deltas;
- formation target distances;
- candidate-versus-legacy clock deltas;
- fixed-tick, session, workflow and authority labels.

Trace export is deterministic JSON. The public API deliberately has no live projection, apply, commit or mutation surface.

## Adoption gates

Before any future live adapter is proposed, all of the following remain required:

- focused orchestrator tests pass;
- all five component suites and ball shadow bridge tests pass together;
- cross-engine and adversarial shadow suites pass;
- byte-identical replay and frame-chunk gates pass;
- incomplete mappings, team sets, identities, units, phase maps, tick gaps and mapping drift fail closed;
- `match.html` still has no V2 load or call;
- Build 173 workflows remain intact and authoritative.

This contract does not authorise tuning constants, migrating a workflow, replacing a legacy system or changing online play.
