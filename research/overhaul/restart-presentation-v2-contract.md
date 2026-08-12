# Restart / Offside Presentation V2 Contract

Status: dormant deterministic candidate. It is not loaded by
`match-engine/match.html`, owns no live authority, and changes no existing match,
restart, input, camera, online, set-piece, replay, sound, or officiating workflow.

## Purpose and boundary

`match-engine/restart-presentation-v2.js` models one future presentation path:

1. whistle;
2. request a gameplay freeze;
3. select the appropriate **existing** assistant referee;
4. request a camera pan to that official;
5. raise and hold the flag;
6. lower the flag, restore the correct restart camera, and hand the offside free
   kick back to the legacy restart authority.

The candidate only emits immutable JSON-safe commands and events. Every command
has `advisoryOnly: true` and `authority: "candidate-observer"`. The module does
not read or write the DOM, Three.js scene, ball, players, match clock, wall
clock, presentation clock, online transport, controller state, or legacy restart
state. A later adapter must validate each command against the authoritative
simulation tick before applying anything.

## Activation and workflow preservation

The initial state is disabled. Activation requires all of the following:

- an exact capability grant `enable-restart-presentation-v2-shadow`;
- scope `restart-presentation-v2-shadow-only`;
- runtime mode `restart-presentation-shadow`;
- authority `candidate-observer`;
- an offline workflow; and
- `normalMatchAuthority !== true`.

Normal match authority cannot manufacture the capability. `online-versus`, an
explicit online context, or any `online-remote` controller owner is rejected or
resolved to a frozen broadcast-only camera policy. The candidate therefore
cannot pause an online match, move its camera, animate an official, or issue its
restart.

The offline workflow values are descriptive shadow contexts, not activation of
live gameplay: single-player, local-versus, home-co-op, CPU-v-CPU, and the
Set-Piece Suite. All pre-existing workflow entry points remain legacy-owned.

## Fixed simulation-time sequence

The sequence uses integer simulation ticks only. With start tick `T`, its exact
boundaries are:

| Phase | Start | Duration | Commands on entry |
| --- | ---: | ---: | --- |
| whistle | `T` | 1 | `audio.whistle.play` |
| freeze gameplay | `T+1` | 6 | `gameplay.freeze(true)` |
| select assistant | `T+7` | 1 | `assistant-referee.select` |
| camera pan | `T+8` | 30 | `camera.pan` |
| flag raise | `T+38` | 12 | `assistant-referee.flag(raise)` |
| flag hold | `T+50` | 42 | `assistant-referee.flag(hold)` |
| free-kick handoff | `T+92` | 1 | flag lower, camera restore, free-kick handoff, then freeze release |
| complete | `T+93` | 0 | completion event only |

The handoff command precedes the freeze-release command at the same tick. This
prevents a future adapter from briefly releasing live play before the legacy
dead-ball restart exists. The handoff carries `exactlyOnce: true`; repeated
advances after completion emit nothing further.

The durations are presentation-contract defaults, not live tuning. A future
integration may revise them only through an explicit, replay-tested contract
change; it must never substitute elapsed render time.

## Existing assistant-referee selection

An offside incident must provide the current assistant-referee references. The
candidate requires stable, unique IDs and at least one north and one south
touchline assistant. It never creates an actor.

- incident at or north of the pitch midpoint: select the north assistant;
- incident south of the midpoint: select the south assistant;
- if multiple existing officials are supplied for a touchline, choose the one
  nearest to the incident, then stable-ID order as a deterministic tie-break.

The emitted selection command contains `reuseExistingActor: true`. A live
adapter must also restore the official's pre-presentation action, facing,
targets, and patrol state after the handoff.

## Camera ownership policy

| Restart | Taker / goalkeeper ownership | Required camera |
| --- | --- | --- |
| free kick, corner, goal kick | local human taker (keyboard, controller 1, or controller 2) | special set-piece angle |
| free kick, corner, goal kick | CPU taker | broadcast |
| penalty | local human taker | penalty-taker angle |
| penalty | CPU taker against a local human goalkeeper | penalty-save angle |
| penalty | CPU taker against CPU goalkeeper | broadcast |
| any | online-versus or remote-online ownership | frozen broadcast; candidate disabled |

The resolver exhaustively covers six workflows, four restart kinds, five taker
owners, and five goalkeeper owners: 600 deterministic permutations. Controller
2 is treated as local human in both local-versus and home-co-op. The ownership
decision is independent of which team is Home or Away.

## Structured adapter commands

- `audio.whistle.play`
- `gameplay.freeze`
- `assistant-referee.select`
- `camera.pan`
- `assistant-referee.flag`
- `camera.restore`
- `restart.free-kick.handoff`

Commands and events have stable session-local sequence IDs, integer simulation
ticks, phase, incident ID, candidate authority, and JSON-safe payloads. The
export contains no capture time or non-deterministic value. The module cannot
call a live function from a payload string; `adapterPoint` is documentation for
the later explicit adapter.

## Read-only audit of future live adapter points

Line references below describe the Build 173 snapshot audited for this dormant
candidate. They are not live edits.

- `match-engine/match.html:116-137` establishes online host state and the
  controller-2/Home-co-op ownership inputs. A future adapter must derive local
  ownership here and freeze the candidate whenever online host/remote state is
  present.
- `match-engine/match.html:3053-3065` computes the second-last-defender offside
  line, restart exemptions, position-at-kick evidence, and the candidate arm.
  This remains authoritative for deciding whether an offside candidate exists.
- `match-engine/match.html:4336-4338` confirms the offence on the receiver's
  deliberate play and currently calls
  `restart('FREE KICK', defendingTeam, b.x, b.y)` immediately. This is the
  precise future interposition seam: capture the incident, run the presentation,
  then issue the same legacy restart once.
- `match-engine/match.html:2156-2169` is the legacy `restart(...)` authority. It
  owns ball replacement, taker selection, set-piece arrangement, readiness,
  event UI, and restart logging. V2 must hand off to it, never reproduce it.
- `match-engine/match.html:2204-2212` is the legacy restart-readiness/whistle
  path. A future adapter must avoid a duplicate whistle and must not let the
  presentation's advisory timing replace restart readiness.
- `match-engine/match.html:4628` defines the two assistant logic actors as
  `lino1` and `lino2`.
- `match-engine/match.html:5752` creates their existing meshes and labels both
  `humanoidRole='assistant-referee'`. These actors must be reused.
- `match-engine/match.html:6100-6123` renders the officials and keeps them level
  with the ball on the north/south touchlines. A future adapter can temporarily
  override action/facing here, then restore the patrol contract.
- `match-engine/match.html:4864-4955` is the live camera authority.
  `match-engine/match.html:4929-4930` currently supplies restart-specific camera
  shots. The future adapter must add the ownership policy ahead of those shots,
  while leaving CPU restarts in broadcast and retaining the human-goalkeeper
  penalty-save view.

Both assistant actors also participate in special celebration/reaction logic.
Integration must reject overlap with a celebration, foul/card replay, VAR, or
other officiating presentation unless an explicit priority contract decides
which owns the officials and camera. Blindly writing assistant `action` or
camera state would create presentation collisions.

## Verification gates

The focused suite proves:

- browser and CommonJS exposure;
- dormant/live isolation;
- absence of random, wall-clock, DOM, renderer, and async authority;
- exact fixed-tick phase and command boundaries;
- exactly-once free-kick handoff and handoff-before-release ordering;
- deterministic north/south reuse of existing assistant IDs;
- the 600-case camera ownership matrix;
- online and normal-authority fail-closed gates;
- stable byte-for-byte repeat and JSON-safe export;
- invalid input and backwards-tick rejection; and
- presence of the audited legacy adapter points.

Coexistence is separately run with the Build 173 foundation and dormant
Set-Piece Suite V2 tests. No existing test, workflow, or gameplay file is
removed, reduced, imported, or redirected by this candidate.

## Integration risks intentionally left dormant

1. The legacy match currently uses presentation/wall time for restart readiness;
   a live adapter needs a simulation-time ownership boundary rather than copying
   that timing into V2.
2. Assistant actors are shared with celebrations and referee reactions; action
   restoration and presentation priority require a live arbitration layer.
3. Current set-piece camera selection is not ownership-aware. Adapter work must
   map actual taker/goalkeeper control safely across single-player, local versus,
   home co-op, keyboard, and online roles.
4. The offside enforcement seam currently restarts immediately. Integration
   must be atomic so it cannot issue both the old immediate call and the new
   delayed handoff.
5. Camera, sound, controller, replay, cards, VAR, clock, and restart workflows
   remain outside this candidate and must pass their existing gates before any
   future opt-in.
