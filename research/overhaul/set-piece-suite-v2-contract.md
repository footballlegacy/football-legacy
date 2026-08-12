# Set-Piece Suite V2 dormant contract

Status: additive candidate only. Build 173, `match-engine/match.html`, the current
practice/free-kick flow, and every normal-match workflow remain authoritative and
unchanged.

## Authority boundary

`match-engine/set-piece-suite-v2.js` is a deterministic controller and state
machine. It has no renderer, input listener, physics loop, network transport, or
live match hook. The default state is disabled and reports
`dormant-suite-candidate` authority.

Activation requires both:

1. a session-bound capability created with the explicit grant
   `enable-set-piece-suite-v2`, runtime mode `set-piece-suite`, and authority
   `suite-only`; and
2. an activation context that independently declares the same suite-only mode
   and authority.

Normal-match authority is rejected. Merely loading the module cannot activate
it. The live match does not load or reference the module.

## Scenario contract

The candidate supports deterministic, SI-metre scenario descriptions for:

- left, centre, and right free kicks at preset or custom distances and angles;
- left and right corners; and
- penalties.

Each scenario selects validated wall, goalkeeper, and target presets and
contains an explicit ball origin and target. Preset objects are immutable.

## Dormant metric coordinate adapter

`match-engine/set-piece-coordinate-contract-v2.js` now defines the separate
public transform for this exact canonical coordinate system. It reversibly maps
the centred 105 x 68 metre suite frame to explicitly declared, axis-aligned
metric pitch bounds in either attacking direction, including ball, taker, wall,
keeper and target positions. Non-metric, rotated, malformed and unsupported
geometry fails closed. The adapter remains dormant and is not called by this
state machine or the live match; its complete boundary is frozen in
`research/overhaul/set-piece-coordinate-contract-v2-contract.md`.

## Input intents

- Controller `Options` and keyboard `Escape` are the only accepted menu-toggle
  intents.
- Controller `D-pad Up` stages a penalty only when both `suiteContext` and
  `inPenaltyArea` are explicitly true. It is inert otherwise.

These are pure intent handlers. The module does not install browser event
listeners or claim a controller.

## Trial lifecycle

The state machine progresses through:

`idle -> staged -> armed -> launched -> resolved`

- `resetTrial` creates a fresh staged trial for the same scenario.
- `repeatTrial` creates a fresh trial and re-arms the previous normalized launch
  recipe byte-deterministically, with new monotonic stable IDs.
- All transitions return a new immutable state and leave their input untouched.

## Ball Engine V2 handoff

Arming creates a JSON-safe `football-legacy-ball-v2-launch-intent` containing
origin, target or direction, speed, lift angle, three spin axes, and suite-only
metadata. The suite does not import or call Ball Engine V2. A later approved
adapter may pass this intent to a selected consumer; the current match remains
untouched.

## Evidence log and export

The state owns monotonic session-scoped IDs for events, trials, shots, contacts,
and outcomes. No random source, wall clock, presentation clock, or async timer is
used. Contact and outcome observations require explicit non-negative simulation
ticks.

`createExportPayload` returns the complete structured JSON-safe session record.
`createCopyText` serializes that same payload for clipboard or file export; it
does not perform either side effect itself.

## Migration rule

This candidate may be wired only in a separately approved suite-only opt-in.
Normal matches, offline play, local co-op, online play, replay, restart, set-piece,
foul, card, VAR, sound, and controller workflows must continue to use their
existing authority until their own migration gates are explicitly approved.
