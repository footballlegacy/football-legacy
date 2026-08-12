# CPU intelligence v2 dormant contract

Status: additive candidate only. `match-engine/match.html` does not load or call this module; Build 173 remains the sole live authority.

## Boundary

`FootballLegacyCPUIntelligenceV2.decide(snapshot, previousMemory, config)` is a pure fixed-tick function. It accepts a complete pitch snapshot plus the prior returned memory and returns a new decision, new memory and telemetry. It never reads the DOM, wall/presentation time, input devices or a random source, and it does not mutate either argument.

Required snapshot authority:

- explicit non-negative integer `tick`;
- explicit `fixedTickSeconds` matching the configured fixed step;
- controlled `teamId`, `possessionTeamId`, `carrierId` and `attackingDirection`;
- pitch bounds, ball point, current offside line and complete player positions/roles/attributes;
- optional player `fx`/`fy`, defending, aggression, strength and balance values
  for physical challenge eligibility;
- `cpuControlled: false` or `humanControlled: true` on a human-owned player so
  defensive authorship can never override local input;
- optional simulation events, including `space-opened`.

Identity is fail-closed: a carrier must exist in the roster, a carrier requires
an explicit possession team, and the carrier's team must equal that possession
team. A possession team without a carrier is allowed for loose-ball/transition
snapshots only if that team is represented in the supplied roster. This keeps
legitimate turnovers representable without allowing contradictory ownership.

## Coordinate-unit contract

The public snapshot, decision and replay-memory point coordinates always stay
in the caller's supplied pitch units. The engine does not return hidden legacy
screen coordinates.

All authored tactical distances and all measured/scored spatial values use one
declared reference pitch: `x=84..3260`, `y=6..2136` (3176 by 2130 reference
units). At decision time the engine derives independent x/y mappings from the
supplied pitch:

- forward steps, offside buffers and x insets scale by pitch-width ratio;
- lane placement and y insets scale by pitch-height ratio;
- points are mapped into the reference pitch before Euclidean clearance and
  goal-distance calculations;
- forward progress is normalized into reference x units before thresholds,
  bid scores and confidence terms are evaluated;
- final run, carrier and memory targets are mapped/stored only in supplied
  pitch units.

Therefore a proportionally identical 105x68 metric snapshot must select the
same run types, carrier action, confidence, constraints and normalized scores
as the 3176x2130 reference snapshot, with targets proportionally mapped. The
executable P2 gate covers that equivalence. Authored config remains in reference
units and is range-checked against the reference dimensions on every pitch;
using a metric snapshot does not silently reinterpret `shotDistance: 610` as
610 metres.

Replay memory stores supplied-unit points. It must be restored under the same
pitch mapping used to produce it; the unified shadow coordinator separately
rejects mid-trace mapping changes.

## Replay-memory boundary

Empty memory may be omitted. Populated memory must carry the exact v2 schema,
team/tick metadata and structurally valid lane, observation, commitment,
offside-timing and optional additive defence records. Defensive memory contains
only a simulation-tick phase/lifecycle, selected player ids and per-player
physical-action cooldown ticks. Older valid v2 memories without `defense` are
accepted and promoted to an idle defensive record. Map keys, nested finite
points, bounded risks, boolean flags and tick lifecycles are validated before
any decision advances. An engine-produced memory object round-trips through
this validator.

## Decision order

1. Validate and normalize the fixed-tick snapshot.
2. Generate role- and formation-bounded off-ball run candidates.
3. Perceive explicit `space-opened` events and clearance transitions from the prior tick memory.
4. Apply each player's deterministic reaction delay.
5. Persist or abort existing commitments.
6. Rank coordinated bids, enforcing offside, lane occupancy, team run capacity and rest defence.
7. Commit new runs with minimum persistence and maximum expiry ticks.
8. Select the carrier's `shot`, `pass`, `carry` or `wait` intent.
9. When the opponent has a carrier, observe, commit or persist one primary
   challenger plus at most one cover supporter; otherwise abort that defensive
   commitment immediately.
10. Author a physical action only when the primary challenger is inside the
    declared distance, alignment, relative-speed and cooldown window.
11. Return complete telemetry and copied memory.

## Run lifecycle

- **Perceived:** a previously blocked lane crosses the opening thresholds, or an explicit opening event arrives.
- **Reacting:** the opening is remembered, but the player's awareness/acceleration-derived reaction tick has not arrived.
- **Committed:** the winning bid receives an onside movement gate, a continuation target beyond the line where appropriate, `beeline` movement intent, sprint urgency, acceleration flag, minimum persistence tick and expiry tick.
- **Persisting:** marginal lane changes cannot erase a committed run before its minimum persistence window.
- **Aborted:** possession loss, runner unavailability/offside, expiry, or a persistently sealed lane ends the run with a named telemetry reason.

## Protected constraints

- The immediate movement gate is clamped to the current offside line with a fixed buffer and is re-clamped whenever that line moves.
- A penetrating run may carry a separate continuation target beyond the line. Its `offsideTiming` contract says whether the runner should break on the carrier's kick or has made a bounded deterministic early-release error. This allows believable offside offences without random calls or an AI that is mathematically perfect.
- A runner already beyond the safe line is rejected.
- Penetrating bids cannot consume the configured minimum rest-defence group.
- Stay-back/hold roles produce support bids only.
- Family-specific forward envelopes prevent event targets from overriding formation responsibilities.
- One runner wins each penetrating lane band; ties are stable by player and run id.

## Defensive-intent lifecycle

`decision.defensiveIntents` is additive; all existing `runs` and
`carrierIntent` bytes retain their meanings.

- **Idle / possession won:** no defensive intents. A turnover to the controlled
  team aborts any prior challenge immediately.
- **Reacting:** the opponent carrier, primary challenger and optional cover
  supporter are recorded, but the intent array remains empty until the same
  awareness/acceleration-derived reaction gate used by the CPU clock expires.
- **Committed:** exactly one eligible CPU player becomes the
  `primary-challenger`; one additional eligible CPU teammate becomes
  `cover-support` when available.
- **Persisting:** a nearer teammate appearing on a later tick cannot cause
  challenger thrash. The selected pair persists until carrier change,
  unavailability, possession recovery or bounded expiry.
- **Aborted:** carrier change starts a fresh reaction; possession recovery,
  loose/no carrier, protected rest-defence floor or unavailable challenger
  returns no intents.

Only CPU-controlled active outfield players can be selected. A rest defender
can become primary only when doing so leaves at least `restDefenseMinimum`
rest defenders behind. Cover selection prefers hold/rest-defence roles and its
target stays between the carrier and the controlled team's own goal, blended
with the cover player's formation anchor. Input roster order is normalized and
all score ties use stable player ids.

The primary press intent has:

```text
{
  playerId, type: "press", role: "primary-challenger",
  targetPlayerId, target, movementIntent: "beeline",
  accelerate: true, urgency: "sprint", targetSpeed,
  state: "committed" | "persisting",
  commitTick, minUntilTick, expiresTick,
  physicalAction: null | {
    type: "stand-tackle" | "shoulder-challenge",
    targetPlayerId, issuedTick, distance, alignment,
    relativeClosingSpeed, cooldownUntilTick
  }
}
```

The optional cover intent has the same lifecycle identity, `type: "cover"`,
`role: "cover-support"`, `movementIntent: "contain"`, balanced urgency and
always `physicalAction: null`.

All points remain in supplied pitch units. Physical-window measurements and
authored thresholds remain in canonical reference units. A physical action is
a one-tick edge, not a held button: the consumer issues it only for
`issuedTick`, maps `targetPlayerId` to the Movement V2 target id, and must not
synthesize another nearest-player press/tackle alongside it. When there is no
physical action, press/cover movement targets outrank the settled formation
target for those two CPU players; human input, current ball-carrier action and
existing attacking runs remain higher authority.

## Telemetry and gates

Every decision records perceived openings, all scored bids, rejection reasons,
attacking and defensive commitment transitions, the complete defensive phase
and emitted intents, constraint counts and the carrier choice. The output is
finite, JSON-safe and suitable for golden traces.

The named `Bale-style open-space beeline` fixture proves this sequence: blocked channel at tick 100; perceived opening at tick 101; committed channel acceleration by tick 102; persistence through a narrowed lane; deterministic abort after possession changes.

Before any future live adapter is considered, preserve these gates:

1. deterministic deep equality for identical snapshot and memory;
2. no input mutation;
3. no random or presentation-clock dependency;
4. golden trace for opening perception, reaction, commit, persistence and abort;
5. offside gates, deterministic timing-error bounds, rest-defence, role, formation and lane-coordination constraints;
6. complete carrier-intent branch coverage;
7. dormant-authority assertion against `match.html`.
8. defensive reaction/commit/persistence/abort and rest-role constraints;
9. exactly one challenger plus cover, with strict tackle/shoulder windows and
   a simulation-tick cooldown;
10. turnover, JSON replay, chunk-boundary and input-roster-order invariance,
    plus recursive finite-telemetry validation.
