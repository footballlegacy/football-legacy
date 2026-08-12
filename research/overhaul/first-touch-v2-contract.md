# First Touch V2 contract

Status: dormant, additive, offline-only candidate. It is not loaded or called
by `match-engine/match.html` and cannot alter a Build 173 player, ball,
possession, input, animation, restart, replay, or online workflow.

Implementation: `match-engine/first-touch-v2.js`
Focused gates: `tests/first-touch-v2.mjs`

## Purpose

First Touch V2 closes the control stage between a moving Ball Engine V2 state
and the later movement/possession decision. It distinguishes contact geometry,
body region, timing, relative velocity, player technique, facing, intended
touch direction, and opponent pressure. It returns a complete detached Ball
Engine V2 state plus read-only telemetry; it has no renderer, animation, input,
live-apply, or ownership mutation surface.

## Capability and authority

The module defaults dormant and accepts only the explicit acknowledgement
`EXPLICIT_DORMANT_FIRST_TOUCH_V2_WITH_NO_LIVE_AUTHORITY` in one of three
candidate contexts:

- `offline-v2-lab`;
- `set-piece-suite`; or
- `shadow`.

Online, normal-match, missing, malformed, and forged capabilities fail closed.
An `ownerCandidateId` is advisory candidate output, never a live possession
assignment.

## Ordered input contract

A request contains:

1. one fixed simulation tick and non-zero deterministic seed;
2. a complete Ball Engine V2 state in SI units;
3. stable player/team identity, position, velocity, facing, height, and all six
   explicitly supplied, bounded `0..100`
   control/technique/balance/agility/strength/awareness attributes;
4. `trap`, `cushion`, `directional-touch`, or `layoff` intent with a bounded
   direction and distance;
5. optional stable opposing pressure snapshots; and
6. an explicit signed timing offset.

Inputs are cloned and never mutated. Input graphs must be bounded plain JSON
data: cycles, accessors, reserved prototype keys, symbols, non-finite numbers,
unsafe identifiers, extreme physical magnitudes, and oversized metadata fail
closed. Pressure rows are sorted by stable ID, so caller order cannot change
the result.

## Contact model

Automatic technique selection covers:

- sole trap;
- foot cushion;
- thigh control;
- chest control; and
- header cushion.

Each technique has its own vertical envelope, horizontal reach, absorption,
and difficulty. Explicit technique selection cannot bypass that envelope.
Dynamic reach gains only a small bounded contribution from player motion
projected toward the contact point; movement away from the ball cannot extend
reach.

Timing bands are exact and symmetric:

- perfect: `|offset| <= 0.045 s`;
- good: `|offset| <= 0.105 s`;
- stretch: `|offset| <= 0.180 s`; and
- missed: anything later.

Quality combines the six declared attributes, facing/incoming alignment,
target alignment, technique difficulty, timing, relative ball speed, and
bounded nearby-opponent pressure. Outcome is one of:

- `controlled`: clean trap/cushion with an advisory owner;
- `retained`: purposeful but still loose directional control;
- `loose`: auditable heavy touch; or
- `missed`: ball remains byte-semantically on its incoming state.

The small directional error is keyed deterministically by seed, tick, ball,
player, and intent. It consumes no ambient RNG and is replay/chunk invariant.

## Ball and energy handoff

Every non-missed result is rebuilt through Ball Engine V2's complete state
factory. Contact metadata records the stable player and technique. Controlled
states use the explicit `controlled` regime; loose low contacts use `skid`, and
airborne contacts use `flight`.

Passive retained/loose contacts cannot increase combined linear and rotational
ball energy. The guard uses the authoritative Ball V2 `inertia`, not a locally
re-derived sphere approximation. Directional/layoff contacts and controlled
player attachment are the only explicit active contacts; caller flags cannot
convert trap/cushion into an active strike. Total three-dimensional output
speed and induced spin remain bounded.

The handoff preserves Ball V2 radius, mass, inertia, orientation,
`lastOuterTick`, and simulation time, resets settle time for the new contact,
and uses current `flight`/`skid`/`controlled` regimes. Contact normal is the
unit incoming relative-velocity direction and `normalSpeed` is the absolute
projection onto that normal, so the two fields cannot contradict one another.
The constants are candidate gameplay priors, not FIFA 20 measurements and not
calibrated from the passing-heavy capture.

## Determinism and telemetry

The module uses no `Math.random`, wall/presentation clock, timer, animation
frame, DOM, renderer, network, or asynchronous authority. Stable telemetry
records:

- geometry and chosen technique;
- timing band and offset;
- quality components and nearest pressure;
- relative speed and direction error;
- before/after energy and whether the contact is active;
- outcome, reason, and advisory ownership; and
- `liveApplied:false`.

Focused gates cover CommonJS/browser parity, dormancy, capability isolation,
all five body regions, timing boundaries, clean and pressured controls,
unreachable contacts, passive-energy safety, deterministic directional touch,
current Ball Engine V2 field continuity, contact-normal semantics,
approach-only dynamic reach, total-speed limits, input/order invariance, finite
output, hostile metadata, and malformed input rejection.

## Promotion boundary

Promotion requires a separately reviewed ordered adapter after Movement V2
positions the receiver and before Ball V2 advances the post-contact state.
That adapter must also coordinate visible animation acknowledgement, possession
transfer, replay telemetry, online authority, and automatic-finish guards. No
such adapter exists in this change, and no current workflow is changed.
