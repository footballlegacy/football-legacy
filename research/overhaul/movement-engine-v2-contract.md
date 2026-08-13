# Movement/contact engine v2 contract

Status: promoted only behind the explicit offline FL V2 opt-in for Single Player and CPU-v-CPU Quick Play. Build 173 remains the deliberate default and continues to own every unsupported/online workflow, rendering, rules, restarts and keepers. The V2 host adapter applies this engine transactionally; any failed candidate tick rolls back and the strict playtest host freezes before any Build 173 gameplay tick can advance.

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

Possession affects movement explicitly. A ball carrier receives a small, control-scaled speed reduction: roughly 0.4–2.5% while running and 0.8–3.5% while sprinting, with elite control at the low end. Off-ball players are unchanged. This is deliberately a minor footballing constraint, not a blanket pace nerf.

The live First Touch handoff may author a serialized two-tick `touchBurstUntilTick` acceleration multiplier. It can improve only early acceleration after a directional touch; it never raises the terminal speed cap. Shielding uses the explicit `shield` context with a 1.9–3.1 m/s control band and 0.84 turn multiplier. The live host preserves L2 input, chooses the visible shielding side from the nearest challenger, and advances a persistent shield animation rather than freezing a single pose.

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

## Live opt-in and regression gates

The following remain mandatory:

1. CommonJS and plain-browser UMD API parity;
2. no unconditional load: only the exact offline FL V2 preflight may load it;
3. no random, wall-clock, presentation-clock or scheduler dependency;
4. identical input/memory purity and JSON-safe output;
5. explicit fixed tick and command tick validation;
6. exact frame-chunk invariance;
7. acceleration, cap, deceleration, turn, context, fatigue and recovery fixtures;
8. swept contact and deterministic mass-weighted separation fixtures;
9. tackle acknowledgement/visibility plus win/loss/miss telemetry coverage;
10. finite-state and maximum-speed safety gates;
11. carrier-versus-off-ball and low-versus-elite control-speed gates;
12. two-tick acceleration-only burst with identical terminal maximum speed;
13. shield input-to-engine-to-visible-host persistence and mirrored side choice;
14. coexistence with Ball V2, CPU intelligence, Formation V2 and the protected Build 173 workflows.

The opt-in authorizes no workflow removal. Unsupported modes and any online marker fail closed to Build 173.
