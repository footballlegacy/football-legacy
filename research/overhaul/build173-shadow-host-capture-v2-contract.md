# Build 173 shadow host capture v2 contract

Status: exact-flag, read-only, offline-only observation infrastructure.

Implementation: `match-engine/build173-shadow-host-capture-v2.js`

## Purpose and authority

The module converts explicit detached Build 173 host snapshots into
`football-legacy-build173-host-observation-v2`. It does not read globals from
`match.html`, call `update()`, write live state, or return a candidate state or
candidate command. Build 173 remains the only gameplay authority. The only
handoff is to the frozen read-only live-shadow adapter, and the host-capture
module re-whitelists that response into bounded comparison telemetry.

The module is loaded only inside the exact `v2Shadow=1` offline preflight,
after the reviewed adapter and before the live hook. The default match path
loads no V2 component. It is disabled unless all of these conditions are explicit:

1. `enabled === true`;
2. the workflow is one of the six declared offline workflows;
3. the exact acknowledgement is supplied; and
4. no online marker is present.

Any online role, room, build, URL marker, online match type, online controller
marker, `online:true`, or the `online` workflow freezes enablement. This does
not modify the online path.

## Supported offline workflows

No offline workflow is removed:

- `set-piece-suite`: one Home human, Away CPU;
- `single-player`: one Home human, Away CPU;
- `quick-play`: one Home human, Away CPU;
- `local-two-player`: one human per team;
- `home-coop`: two Home humans, Away CPU; and
- `cpu-v-cpu`: both teams CPU-owned.

Control ownership is an immutable match declaration. A controller becoming
temporarily connected or disconnected does not change identity, ownership, or
the shadow mapping.

## Exact coordinate and metric contract

The host coordinate envelope is fixed to Build 173:

| Field | Exact value |
| --- | ---: |
| world width | 3344 |
| world height | 2142 |
| goal-line margin | 84 |
| host goal lines | x = 84..3260 |
| host touchline transform | y = 0..2142 |
| pitch length | 105 m |
| pitch width | 68 m |
| x units per metre | 3176 / 105 |
| y units per metre | 2142 / 68 |
| z units per metre | (2142 - 12) / 68 = 2130 / 68 |
| simulation frequency | 60 Hz |
| visual ball radius | 0.11 m |

The different live offsets are preserved as evidence rather than conflated:

- `match.html` constructs `W=3344`, `H=2142`, `M=84` and
  `PITCH_UNITS_PER_METRE=(H-12)/68`;
- the marked white rectangle is `strokeRect(M,6,W-2*M,H-12)`, hence marked
  lines y=6..2136; and
- loose-ball throw-in detection uses y=8 and y=H-8.

The frozen host transform remains y=0..2142, while z retains the Build 173
`H-12` scale. No coordinate is silently clamped by capture.

### Held throw-in apron

The only player exception to the host pitch envelope is the currently held
throw-in taker:

```text
x = 84..3260
y = -26..2168
exception = declared-held-throw-in-taker-only
```

Build 173 itself stages the taker at `-26` or `H+26`. A captured observation
with an outside player therefore includes the exact root context:

```json
{"restart":{"kind":"THROW IN","held":true,"takerId":"stable-slot-id"}}
```

and includes the raw, unchanged player coordinate in `before` or `after`.
Only one outside player is permitted. Undeclared outside coordinates,
different restart kinds, multiple staged players, and apron overflow fail
closed. Players returning infield are observed normally.

## Stable identity and substitutions

Identity contains exactly two teams and 22 stable on-pitch slots. Each team
has exactly 11 unique slots, exactly one declared goalkeeper slot, an opposite
attacking direction, a formation, and an immutable control mode. Each slot has:

- stable host `id`;
- stable shadow mapping `candidateId`;
- team-local `slotId`;
- declared position; and
- a validated position family.

Runtime player IDs are not identity keys. Capture resolves every runtime row
by `teamId + slotId`, emits the stable slot ID into the observation, and stores
the actual before/after player IDs only as host telemetry:

```text
environment.hostCapture.actualPlayerIds.before[stablePlayerId]
environment.hostCapture.actualPlayerIds.after[stablePlayerId]
```

A substitution must declare `teamId`, `slotId`, `outPlayerId`, and
`inPlayerId`. The declared transition must exactly equal the actual ID change
at that stable slot. A valid substitution cannot throw into or alter live
gameplay. A missing, surplus, or mismatched transition self-freezes only the
capture session.

## Red cards and formation availability

Sent-off players remain in the exact 22-slot observation roster with
`sentOff:true`; they are never deleted or renumbered. Formation entries remain
one per declared team and expose:

```text
formation[].playerCount
formation[].unavailableSlotIds[]
environment.hostCapture.formationAvailability[]
```

`playerCount` is 11 minus the sent-off active stable slots. The unavailable
slot list must exactly match those slots. This preserves immutable identity
while allowing the formation shadow to reason about the active count.

## Clock and phase contract

`contract.clock` contains:

```text
source = simulation-time-only
matchLengthMinutes = explicit Build 173 value in 2..20
acceleration = 90 / matchLengthMinutes
phaseMap = PLAY->live, DEAD_BALL->dead-ball,
           SET_PIECE->set-piece, PAUSED->paused
```

The host capture owns `gameplaySeconds`. It is a monotonic accumulator and is
not derived from legacy `clockFrames`. For each captured update it advances by
`(1/60) * acceleration` only when the **before** phase governing that update
is `PLAY`. Dead balls, held set pieces, pauses, half-time, walkout, walk-in,
replays and presentation do not advance it. Raw `clockFrames`, including
fractional values, real-time dead-ball increments and half-time snaps, remains
observation-only telemetry.

## Phase mapping

Phase is derived deterministically from explicit host clock flags:

- pause wins and maps to `PAUSED`;
- a held or declared restart maps to `SET_PIECE`;
- active stopped presentation maps to `DEAD_BALL`; and
- only running ordinary `matchPhase:'play'` maps to `PLAY`.

An explicitly supplied phase must match that derivation.

## Ball and movement capture

Every frame includes exact ball position, velocity, height, vertical velocity,
spin, raw `dip`, raw `curveAccel`, owner and flight type. Only the initial
explicit kickoff state may omit `id`, `z`, `zv`, `spin`, `dip`, `curveAccel`
or `flightType`; capture records every defaulted field and supplies zero or
`ground` so the host schema remains complete. Outside kickoff, missing
kinematics fails closed.

Movement commands and CPU event player references are converted from actual
runtime IDs to stable slot IDs. They are immutable copies tagged with the
observation tick. CPU entries exist exactly for CPU-owned teams. Formation
entries exist exactly for both teams.

## Lifecycle

1. **Disabled / awaiting kickoff.** Nothing is captured by default.
2. **Walkout skipped.** `focusGame()` moves players into the tunnel and sets
   `matchPhase='walkout'`; that presentation state is never observed.
3. **Arm.** Ordinary matches arm only after the actual post-walkout
   `kickoff()` transition has restored all 22 players on pitch at a zeroed
   first-half kickoff. The set-piece suite may arm after its explicit own
   ready setup (`freeKickPracticeReady:true`).
4. **Tick 1.** The immutable before frame is the zeroed pre-match/setup frame
   and the observation epoch stage is `pre-match`.
5. **Sequential capture.** Exactly one observation is allowed for every host
   `update()` call. The next before frame must byte-semantically equal the
   previous accepted after frame. FAST mode still emits every simulation call
   as its own tick even when several calls share one render frame.
6. **Finish before presentation.** Capture finishes before
   `fulltime-presentation` / `beginFullTimeWalkin()`. Walk-in moves players
   outside the pitch and is never mapped or clamped.
7. **Reset.** A new match requires a fresh epoch ID and returns to the same
   post-walkout arming gate.

Any malformed capture, discontinuity, identity mutation, missing update,
unsupported presentation frame, bad substitution, invalid staged player or
adapter rejection changes only the capture lifecycle to `self-frozen`. The
live Build 173 match continues untouched.

All presentation-boundary reads and snapshot conversion happen inside that
fail-closed boundary. Throwing accessors, getters that change value between
reads, cyclic/non-plain data, reserved object keys, non-finite derived values,
and oversized payloads can therefore freeze only the shadow session; they can
never escape into the legacy update loop.

## Telemetry boundary

The adapter observation result is re-whitelisted. Host capture returns only:

- tick, fixed tick, workflow and mapping-complete status;
- command-derivation count;
- aggregate ball position/velocity error;
- aggregate movement position/velocity error, owner agreement and count;
- aggregate formation counts/errors by index; and
- clock phase/period agreement and time delta.

It does not return a candidate snapshot, force, command, signature, mapping,
projector or application function. Trace storage is deterministic and capped
at 16 records. Session identifiers are capped at 256 characters, an individual
telemetry record is capped at 64 KiB, and the complete retained export is
capped at 512 KiB. When the byte ceiling is reached, the oldest complete record
is evicted deterministically; records are never truncated into invalid JSON.

## Required gates

The focused suite must prove:

- exact schemas and exact world/metric constants;
- all six offline workflows and their ownership contracts;
- controller connectivity cannot mutate ownership;
- online markers freeze enablement;
- 22 unique stable slots and position families;
- walkout skip, post-walkout arm, tick-1 epoch, finish-before-walk-in and reset;
- monotonic simulation time independent of fractional/raw clock frames;
- kickoff defaults plus raw ball dip and curve;
- exact CPU, formation and movement ID mapping;
- declared throw-in apron preservation with no clamp;
- exact sent-off roster and formation availability;
- stable-slot substitution acceptance and malformed-substitution self-freeze;
- FAST one-tick-per-update sequencing;
- immutable before/after continuity and fail-closed errors;
- throwing/unstable accessors cannot escape or leave the session armed;
- finite extreme input cannot overflow telemetry to `Infinity` or JSON `null`;
- deterministic count and byte bounds with no state or command leakage; and
- the exact-flag attachment is the only `match.html` integration, the default
  path loads no V2 component, and no established workflow is removed,
  shortened, replaced or rerouted.
