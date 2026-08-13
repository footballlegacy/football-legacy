# First Touch V2 contract

Status: immutable offline resolver foundation. Build 174 conditionally loads it
only after the exact offline FL V2 preflight for Single Player, CPU v CPU or the
Set-Piece Suite. Build 173/default and every online route remain outside that
dependency graph. The module itself still returns detached advisory output and
cannot mutate a player, ball, possession, input, animation, restart or replay.

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
bounded nearby-opponent pressure.

Routine ground traps/cushions have a separate deterministic technical-security
gate. It applies only to reachable sole/foot contacts with perfect/good timing,
relative speed no greater than `14 m/s`, and pressure score no greater than
`0.12`. Reliability is `50% control + 30% technique + 20% awareness`. The
seed-keyed failure prior is `12%` at reliability 50, `2%` at 70, and falls to a
`0.1%` elite floor; ratings below 50 receive no routine-control assurance.
Meaningful pressure, late timing, excessive pace, unreachable geometry, upper
body contacts and active directional/layoff touches cannot use this gate.

Outcome is one of:

- `controlled`: clean trap/cushion with an advisory owner;
- `retained`: purposeful but still loose directional control;
- `loose`: auditable heavy touch; or
- `missed`: ball remains byte-semantically on its incoming state.

The small directional error is keyed deterministically by seed, tick, ball,
player, and intent. Routine-control security uses a separate stable key over
the same authority identity. Neither consumes ambient RNG; both are
replay/chunk invariant.

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
- routine-control eligibility, reliability, failure prior, keyed roll and
  control basis;
- relative speed and direction error;
- before/after energy and whether the contact is active;
- outcome, reason, and advisory ownership; and
- `liveApplied:false`.

Focused gates cover CommonJS/browser parity, dormancy, capability isolation,
all five body regions, timing boundaries, clean and pressured controls,
rating-ordered routine-control calibration, unreachable contacts,
passive-energy safety, deterministic directional touch,
current Ball Engine V2 field continuity, contact-normal semantics,
approach-only dynamic reach, total-speed limits, input/order invariance, finite
output, hostile metadata, and malformed input rejection.

## Build 174 composition boundary

The separately reviewed First-Touch Authority Adapter and live V2 contact
composer now place this resolver after Movement V2 positions the receiver and
after the incoming Ball V2 step. On an exact offline FL V2 route, that separate
composer validates the advisory handoff, owns the bounded exact-once ledger and
may commit the resulting contact/possession through the live authority adapter.
The composer also reads the resolver's stable Ball contact metadata: a retained
same-player contact in one uninterrupted loose-ball chain remains physically
authoritative but is classified as `dribble-touch` / `dribble-continuation`,
not replayed as a new `first-touch` reception after the host animation timer
expires. A different player, a new launch, or a non-retained prior outcome
starts a new reception phase.

This module is not itself promoted: its result and telemetry still say
`liveApplied:false`, it exposes no apply/commit/consume surface, and it receives
only its original factory-issued offline capability. The normal Build 173 path
does not request or load the conditional graph, and online markers fail the
preflight before any First-Touch dependency is written.
