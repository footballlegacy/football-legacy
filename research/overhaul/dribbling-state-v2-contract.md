# Football Legacy True Feel — Dribbling State V2 contract

Status: offline live-V2 candidate authority for explicit Single Player and CPU-v-CPU workflows. Build 173 remains the pre-match default. Set-Piece Suite, online play, keepers, restarts, replays, rules, protected skills, cameras and rendering remain outside this module.

## Authority and dependencies

- Module: `match-engine/dribbling-state-v2.js`
- Public engine name: `True Feel` (the V2 module/API filename remains stable)
- Browser global: `FootballLegacyDribblingStateV2`
- Version: `2.0.0-offline-live-dribbling-state`
- Required reviewed dependency: Ball Engine V2 `2.0.0-shadow`
- Live transaction owner: `match-engine/live-v2-authority-adapter.js`
- Capability grant: `offline-live-v2-dribbling-authority`, created only with the module acknowledgement, `online:false`, and workflow `single-player` or `cpu-v-cpu`.
- Human and CPU input sources share one physical resolver. Difficulty is neither accepted nor read by the module or adapter physics transaction.

The live adapter pins all five Dribbling V2 schemas in `DEPENDENCY_CONTRACTS.dribbling` and publishes authority provenance as `dribblingPhysicalTouchesAndActionLease: football-legacy-dribbling-state-v2`.

## Deterministic state chain

The serialized finite-state chain is:

`idle -> secured-control -> touch-preparation -> separated-touch -> chase-recovery -> resecure | heavy-touch | shield | turnover`

- `secured-control`: the carrier and Ball V2 are physically secured.
- `touch-preparation`: one fixed tick selects the touch geometry without releasing the ball.
- `separated-touch`: a boot contact creates a new Ball V2 state at the selected foot with a real position, velocity, contact record and target separation.
- `chase-recovery`: Ball V2 advances independently while short logical possession/action authority remains with the carrier.
- `resecure`: carrier geometry reaches the ball after the minimum separated interval.
- `heavy-touch`: separation or lease duration exceeds the ratings/pressure-derived bound, so logical authority is released and the physical ball stays loose.
- `shield`: an explicit shield input secures a reachable touch without changing the physical model.
- `turnover`: a contact-eligible opponent physically reaches the separated ball closer than the carrier.

The module does not synthesize a cosmetic tether or sine-wave offset. Every release uses Movement V2 carrier position, velocity, facing, radius and input direction/intensity, with control, technique, agility, opponent pressure and surface profile. A seeded hash supplies the bounded contact-direction error. No ambient random source is used.

## Touch and lease bounds

- Preparation: exactly 1 fixed tick.
- Minimum physical separation: 5 ticks before carrier resecure.
- Standard-carry touch cadence: 20-34 ticks. The selected next-contact boundary survives resecure; it is not reset to a two-tick preparation timer.
- Physical lease: 9-17 ticks.
- Action buffer: 12 ticks.
- Action exact-once ledger: identities never evict or become reusable when `commandTick` changes. Future-dated commands fail closed, and the 2,048-ID match capacity fails closed before it could forget an accepted action.
- Turnover selection requires `available`, non-keeper, non-sent-off and `contactEligible` opposition.
- Protected restart, replay, keeper, offside and skill gates atomically return an exact-once authority-handoff token and clear the physical lease state. Protected skills remain Build 173 actions rather than silently becoming dribble input.

## Public API

- `createCapability(options)`
- `createState(initial?)`
- `resolve(request, capability)`
- `serializeState(state)`
- `restoreState(serializedState)`

Schemas:

- `football-legacy-dribbling-state-v2`
- `football-legacy-dribbling-request-v2`
- `football-legacy-dribbling-result-v2`
- `football-legacy-dribbling-capability-v2`
- `football-legacy-dribbling-serialized-state-v2`

Each result includes the complete next state, checksum-guarded serialized state, complete Ball V2 state, logical owner, physical-separation flag, optional buffered/released pass or shot (including its bounded authored variant), optional protected-authority handoff, telemetry and presentation data.

## Adapter transaction and replay contract

The adapter stages Dribbling V2 state, Ball V2 state, Movement V2 logical ownership, possession and output projection in the same immutable frame as movement/contact/CPU work. State changes only after the host commit succeeds. Abort leaves the domain byte-equivalent; rollback restores the prior domain.

`attachment.exportState()` returns checksum-guarded `football-legacy-live-v2-serialized-state`, including Movement, Ball, CPU memory, contact ledgers, possession and serialized Dribbling V2 state. `attachment.restoreState()` validates dependency state, chronology, seed, workflow, checksum and dribbling/Ball consistency before one atomic replacement. Restore invalidates all older planned/prepared tokens. Replaying from a checkpoint therefore produces chunk-identical host and dribbling projections.

During `separated-touch` and `chase-recovery`:

- `hostProjection.logicalBallOwnerId` and `movementBallOwnerId` retain the carrier.
- `hostProjection.physicalBallSeparated` is true.
- `hostProjection.ball` contains physical Ball V2 coordinates/velocity and must be applied with host `ball.owner === null`.
- pass/shot intent may enter through snapshot `dribbling.actionIntent`; the adapter buffers it exactly once and suppresses overlapping CPU pass/shot output.
- on physical resecure, `hostProjection.dribbling.releasedAction` is emitted exactly once for the host's existing pass/shot path without collapsing through-ball, loft, cross, finesse or normal variants.

Telemetry exposes tick/epoch event identity, state phase, animation phase, carrier/logical owner, physical separation, touch sequence, foot, contact type, current/maximum/target separation, pressure, pressure player, surface, rating basis, outcome and buffered/released action IDs. Presentation exposes player, previous carrier, foot, contact point, physical ball position, separation, target separation, outcome and animation phase.

## Minimal host seam

The match host must:

1. Load `dribbling-state-v2.js` after Ball V2 and before `live-v2-authority-adapter.js` for eligible live-V2 workflows only.
2. Add snapshot `dribbling: { surface, actionIntent }`; `surface` maps rain to `wet` and ordinary play to `dry`, and must never be derived from difficulty.
3. Capture one stable-ID human pass/shot release while a physical lease is active and retain it until the projection acknowledges the same ID as buffered or released.
4. When `physicalBallSeparated === true`, clear/suppress physical `ball.owner` attachment even though `movementBallOwnerId` remains the logical carrier, then apply `projection.ball`.
5. Apply `dribbling.presentation` to the carrier animation without creating a reception, pass, shot or touch statistic by itself.
6. Execute `dribbling.releasedAction` once through the existing pass/shot launch path after resecure, using the direction captured with the command rather than a later stick position, while suppressing any same-frame overlapping intelligence action.
7. Include pending action ID, receiver selection and current dribbling host presentation/lease markers in host transaction capture/restore.
8. A separated touch suppresses the legacy reception resolver for the full physical lease. First Touch keeps its contact-owned pose on the securing frame; heavy touch and turnover animate the previous carrier rather than the player who wins the ball.
9. Treat `authorityHandoff.executeExactlyOnce` as an exact-once protected Build 173 boundary; do not run both the dribble lease and the protected skill.

Set-Piece Suite never creates the live gameplay attachment and therefore never enters this state machine.

## Tests

- `tests/dribbling-state-v2.mjs`
- `tests/dribbling-state-v2-independent-adversarial.mjs`
- `tests/live-v2-dribbling-authority-integration.mjs`

The focused gates cover all phases, physical Ball V2 separation, attributes/input/facing/speed/pressure/surface sensitivity, ratings neutrality, human/CPU metamorphism, action buffering and saturation, opponent eligibility, shielding, protected skills, browser UMD, pure replay, serialization checksum, chunk continuation, adapter commit/abort/restore and both live workflows.
