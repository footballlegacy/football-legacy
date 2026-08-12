# Build 173 Live Shadow Adapter V2 contract

## Status and authority

`build173-live-shadow-adapter-v2.js` is an opt-in observation adapter.
`match.html` loads it only inside the exact `v2Shadow=1` offline preflight,
after the six V2 components and unified orchestrator and before host capture
and the live hook. The default path loads no V2 component. `match.html` never
calls this adapter directly. It cannot be enabled without the exact offline workflow capability and the
acknowledgement
`EXPLICIT_BUILD_173_READ_ONLY_SHADOW_WITH_NO_LIVE_WRITES`.

Build 173 remains the only match authority. The adapter must never write to a
Build 173 ball, player, team, clock, input, restart, camera, replay, online, or
presentation object. Candidate states, commands, and legacy projections must
never be returned to or applied by the host. Only bounded comparison telemetry
may leave the adapter.

The public API exposes status/capability validation, observation validation,
adapter construction, and stable telemetry serialisation only. Full-snapshot
mapping and assertion helpers remain private implementation details; there is
no public projector, candidate-state accessor, or apply surface.

Online use is frozen at both gates: online attachment options leave the adapter
disabled, and an observation with `online !== false` is rejected.

## Pinned candidate stack

The adapter accepts only the current unified orchestrator version
`2.0.0-dormant-unified-shadow` and its exact five-component schema:

- ball bridge `2.0.0-dormant-shadow-bridge`
- movement `2.0.0-dormant`
- CPU intelligence `2.0.0-dormant`
- formation `2.0.0-dormant`
- match clock `2.0.0-dormant`

The emitted unified snapshot uses
`football-legacy-unified-legacy-snapshot-v2` and
`football-legacy-unified-mapping-v2`. All five component flags must be `true`
and the mapping must be complete before the observation reaches the
orchestrator.

## Explicit host capture

Each observation has schema
`football-legacy-build173-host-observation-v2`, build `173`, authority
`build-173-legacy`, `readOnlyCapture: true`, `online: false`, a recognised
offline workflow, and explicit before/after frames for one fixed tick.

The identity contract contains exactly two teams and exactly eleven stable
on-pitch slots per team. Host team IDs, candidate team IDs, host player IDs,
candidate player IDs, slot IDs, positions, formations, attacking directions,
and control ownership must be explicit and one-to-one. Control ownership is the
exact enum `human | cpu`; the two teams must attack in opposite directions;
slot IDs must be unique within each team; and each team must declare exactly
one goalkeeper. Each frame must contain the exact declared stable-slot roster
and team ownership. The CPU and formation arrays must exactly cover their
declared teams.

Build 173 substitutions mutate the persona and attributes carried by an
existing on-pitch slot rather than replacing its stable slot identity. The
adapter consequently keys observations to that stable identity. Host-only
actual-player substitutions may be retained as bounded acquisition metadata,
but they cannot reinterpret a candidate identity mapping mid-trace.

All 22 stable slots remain present after a dismissal. A sent-off outfield slot
is explicitly unavailable to the candidate formation and reduces that team's
active `playerCount`; any host-supplied availability declaration must agree
exactly with the frame. A dismissed goalkeeper fails closed until a separately
reviewed goalkeeper-replacement contract exists.

The Build 173 world/metric contract is anisotropic and exact:

- world size: `W = 3344`, `H = 2142`
- playable x goal lines: `84..3260`
- x scale: `(3260 - 84) / 105` world units per metre
- playable y touch lines: `0..2142`
- y scale: `2142 / 68` world units per metre
- z scale: `(2142 - 12) / 68` world units per metre
- candidate metric pitch: `0..105` by `0..68`
- simulation rate: 60 frames per second and `fixedTickSeconds = 1/60`

The only permitted player staging exception is the single declared held
throw-in taker. The observation must include
`restart = { kind: 'THROW IN', held: true, takerId }`, and that exact player may
occupy `x = 84..3260`, `y = -26..2168` without clamping. No other player, ball,
restart, or general out-of-bounds exception is inferred from this apron.

The full `3344` world width is not treated as 105 metres. Player positions,
home anchors, velocities, facings, attributes, formation anchors, CPU offside
lines, ball position/velocity, and ball spin are mapped through the declared
axis contract. No identity, unit, or clock mapping may change during a trace.

## Clock contract

`gameplaySeconds` is the only authoritative simulation-time value and must be
finite, non-negative, and monotonic. Presentation time cannot decide gameplay.
The exact phase mapping is `PLAY -> live`, `DEAD_BALL -> dead-ball`,
`SET_PIECE -> set-piece`, and `PAUSED -> paused`. `matchLengthMinutes` must be
explicitly inside Build 173's `2..20` range, and acceleration must equal exactly
`90 / matchLengthMinutes`.

For every observed fixed tick, simulation time advances by
`fixedTickSeconds * acceleration` only when the *before* phase governing that
tick is `PLAY`; it advances by zero for dead-ball, set-piece, and paused phases.
This prevents a transition's after-phase or presentation clock from rewriting
the time semantics of the tick that already occurred.

`clockFrames` is observational telemetry. It is finite and non-negative but is
deliberately allowed to be fractional because Build 173 advances it by
fractional amounts during dead-ball and celebration states.

The first accepted capture must be tick 1 at an explicit `pre-match` epoch,
starting from zeroed first-half simulation time. Later captures must preserve
the epoch and exact previous-after/current-before boundary.

## Legacy dip and curve controls

Build 173 `dip` and `curveAccel` are per-step force controls, not reversible
instantaneous ball state. The adapter therefore uses this deterministic,
non-authoritative observation policy:

1. Validate and preserve the exact raw before/after `dip` and `curveAccel`
   values in bounded host telemetry.
2. Feed the candidate bridge the exact captured position, velocity, spin, and
   flight type, with `dip = 0` and `curveAccel = 0` in the state-only bridge
   snapshot.
3. Step the candidate once from that state.
4. Compare the candidate result with the captured Build 173 after position and
   velocity. Those observed after kinematics already include the legacy force
   controls' effects.

Telemetry marks
`legacyForceControlsExcludedFromCandidateState: true` and
`legacyAfterIncludesLegacyForceControlEffects: true`. This is an aggregate
one-step observation, not a claim that legacy force controls were reversibly
promoted or reproduced.

## Determinism, failure, and telemetry bounds

The adapter uses no wall clock, random source, timer, animation frame, or
browser event. Invalid, incomplete, approximate, non-sequential, wrong-epoch,
wrong-authority, wrong-workflow, or online input fails closed before a trace is
accepted. Player stamina and every required player attribute are finite and
bounded to `0..100`. CPU events must use the exact observation tick, reference
the declared CPU team, reference only a player owned by that team, and keep
their target on the declared pitch.

Every observation is recursively checked as bounded plain data before any
candidate engine runs: cycles and shared references, non-plain objects, unsafe
map keys (`__proto__`, `prototype`, `constructor`), unsafe IDs, excessive
depth/node/container/string counts, symbolic or custom array properties,
getters/setters and other unstable descriptors, non-finite numbers, and
payloads above 512 KiB are rejected.
Telemetry records are capped at 64 KiB each and the retained telemetry export
at 512 KiB, evicting the oldest bounded record deterministically when needed.

Telemetry is hard-capped at 16 detached records. Output is marked `readOnly`,
`candidateExposed: false`, and `appliedToLive: false`. It contains pinned
component versions, aggregate ball/movement/formation/clock comparison
summaries, host clock observations, and the raw two-field dip/curve observation
described above. It contains no candidate state, candidate signature,
candidate period/phase label, candidate projection, per-player candidate
movement command payload, raw position/velocity delta, or live mutation hook.

## Constrained live attachment boundary

The reviewed `build173-live-shadow-hook-v2.js` attachment must:

1. keep a default-false host kill switch;
2. load the five dormant V2 components, unified orchestrator, then this adapter;
3. create the exact offline capability only when explicitly requested;
4. attach only at tick 1 of a fresh pre-match epoch;
5. deep-capture immutable host before/after snapshots around each fixed tick;
6. call `observe` after the authoritative Build 173 tick completes;
7. export only the adapter's bounded telemetry; and
8. never assign adapter/orchestrator output to live host state.

Finite but extreme legacy values may saturate a non-negative aggregate error
at `Number.MAX_VALUE`; they must never produce `Infinity`, `NaN`, or a JSON
`null` masquerading as a measurement.

Obvious URL and decoded online markers freeze before the stack loads. Any
online marker discovered after preflight freezes before a capture session can
instantiate this adapter. No present workflow is
removed, shortened, replaced, or altered by this contract.
