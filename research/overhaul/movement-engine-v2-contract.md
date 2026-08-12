# Movement/contact engine v2 dormant contract

Status: additive candidate only. `match-engine/match.html` neither loads nor calls this module; Build 173 remains the sole live locomotion, tackle and player-contact authority.

## Boundary

`FootballLegacyMovementEngineV2.advance(world, commandTimeline, ticks, config)` is a pure fixed-tick transition. It returns a new world plus telemetry and never mutates the supplied world or commands. It does not read the DOM, controller APIs, wall/presentation time or any random source.

Required authority inputs:

- a non-negative simulation `tick` and configured `fixedTickSeconds`;
- finite pitch bounds;
- unique player ids, roles, physical/locomotion attributes and complete position, velocity, facing and stamina state;
- an optional current `ballOwnerId` referencing a player;
- commands with an explicit target simulation tick and player id.

Supported commands are `move`, `stop`, `stand-tackle` and `shoulder-challenge`. Move commands carry direction, intensity, duration and an explicit `walk`, `run`, `sprint`, `jockey` or `shield` context. Action commands carry direction and an optional opponent target.

## Fixed-tick order

For every simulation tick, in stable player/id order:

1. Acknowledge or reject commands scheduled for this exact tick.
2. Enter explicit action windows for tackle/shoulder commands.
3. Resolve desired context, facing rotation and turn inertia.
4. Integrate acceleration/deceleration under role, attribute, stamina and action caps.
5. Integrate position and deterministic stamina drain/recovery.
6. Use swept approaches to evaluate the action contact window.
7. Resolve tackle/shoulder scores, outcome telemetry, impulse and possession transfer.
8. Resolve player-player overlap with deterministic, mass-weighted separation.
9. Apply bounds and finite/speed safety guards.

Calling once for `N` ticks and calling in arbitrary chunks totalling `N` must produce byte-equivalent JSON world state when given the same explicit command timeline.

## Locomotion and action states

Ordinary locomotion is explicit: `idle`, `walk`, `run`, `sprint`, `jockey` or `shield`. Speed, acceleration, turn response and mass derive from role family and physical attributes. Sprint drains stamina; low stamina scales speed and acceleration; non-running states recover stamina.

Every accepted `stand-tackle` or `shoulder-challenge` command must immediately:

- emit `command-acknowledged`;
- emit `action-window-entered`;
- set `visibleAction: true`;
- enter a named wind-up locomotion state.

The action then advances through `windup`, `contact` and `recovery`. The contact window resolves exactly once as `win`, `contact-lost` or `miss`; recovery remains visible until its deterministic end tick. This contract makes a pressed-but-invisible stand tackle impossible inside the candidate kernel.

## Contact primitives

- `sweptApproach` tests relative movement over a full tick, preventing high-speed approach tunnelling.
- `separatePlayers` resolves overlaps in stable id order over a fixed iteration count.
- Exact coincident centres use an id-derived normal rather than randomness.
- Separation displacement is inverse-mass weighted.
- Tackle/shoulder outcomes use parameterized defending, control, strength, balance, aggression, acceleration, alignment, closing speed and shielding state.
- Every action contact, win/loss/miss, separation and safety correction is exposed as JSON-safe telemetry.

## Named regression fixtures

- `failed-to-register stand tackle regression`: proves acknowledgement and a visible window even though the distant target forces an explicit miss.
- `shoulder challenge contact`: proves swept physical contact, a deterministic strength win and possession transfer.
- `released-input deceleration`: proves monotonic braking to rest.
- `sharp-turn inertia`: proves a 180-degree request cannot snap velocity/facing on one tick, but completes under sustained input.
- `sprint fatigue and recovery`: proves stamina drain, fatigue speed loss, stop and deterministic recovery.

## Promotion gates

Before any shadow adapter or live opt-in is considered, preserve:

1. CommonJS and plain-browser UMD API parity;
2. dormant-authority assertion against `match.html`;
3. no random, wall-clock, presentation-clock or scheduler dependency;
4. identical input/memory purity and JSON-safe output;
5. explicit fixed tick and command tick validation;
6. exact frame-chunk invariance;
7. acceleration, cap, deceleration, turn, context, fatigue and recovery fixtures;
8. swept contact and deterministic mass-weighted separation fixtures;
9. tackle acknowledgement/visibility plus win/loss/miss telemetry coverage;
10. finite-state and maximum-speed safety gates;
11. coexistence with the dormant ball, CPU intelligence and Build 173 foundation suites.

No constants in this candidate are live tuning values, and this component authorizes no removal, rerouting or reduction of an existing workflow.
