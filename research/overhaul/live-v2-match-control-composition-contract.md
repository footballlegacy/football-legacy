# FL V2 live match-control composition contract

Status: **reviewed integration candidate; not yet loaded by `match.html`**.
`match-engine/live-v2-match-control-composition.js` composes the frozen
MatchClock V2, Restart Presentation V2, Set-Piece Suite V2 and Set-Piece
Coordinate Contract V2. It changes no existing route or Build 173 behaviour by
being present on disk.

## Activation boundary

Activation requires an unforgeable, process-local capability created with the
exact acknowledgement
`EXPLICIT_FL_V2_OFFLINE_SINGLE_PLAYER_MATCH_CONTROL`, effective/requested
engine `fl-v2`, fallback `build-173`, live engine version
`1.0.0-offline-live-authority-playtest`, and `online:false`.

The only accepted workflows are:

- `single-player`; and
- `set-piece-suite` (the existing Quick Play free-kick-suite route may retain
  its old alias while selecting this effective workflow).

Online Versus, Local Versus, Home Co-op and CPU-v-CPU cannot mint a capability.
Build 173 remains the default and the permanent same-session fallback. The
Set-Piece Suite workflow cannot start normal-match offside presentation.

Every runtime must also declare one axis-aligned metric live pitch. Unsupported,
non-metric or malformed geometry fails closed before a match-control runtime is
created.

## Host API

1. `createCapability(options)` issues the exact offline capability.
2. `createRuntime({ sessionId, pitch, realMatchDurationSeconds }, capability)`
   creates private Clock/Restart/Suite state.
3. `prepareTick(runtime, input, capability)` validates exactly the next 1/60 s
   tick and returns an immutable plan. Preparation changes no committed state.
4. The outer live-authority transaction applies all gameplay/contact and
   match-control commands.
5. `commit(runtime, plan, receipt, capability)` promotes the private candidate
   only when the host confirms the clock and every required command atomically.
   The receipt must explicitly prove `legacyClockAdvanced:false`.
6. `abortPrepared(runtime, plan, capability)` discards a plan before any host
   apply and restores the exact pre-tick state while allowing a deterministic
   retry.
7. `rollback(runtime, plan, reason, capability)` is for a possibly partial host
   apply; it discards the candidate and permanently selects Build 173.
8. `disable(...)` is the explicit one-switch fallback.
9. `snapshot(...)` exposes finite JSON-safe authority, clock, restart, suite and
   exact-once ledger evidence.

Malformed tick input never throws through the match loop after a valid runtime
exists. It self-freezes the composition and returns a bounded Build 173 fallback
plan at the last committed tick.

## Authoritative phase projection

The host cannot invent a clock phase from render/presentation time.

| Host phase | MatchClock V2 phase |
| --- | --- |
| `kickoff`, `dead-ball`, `restart-setup` | `dead-ball` |
| `live` | `live` |
| `offside-presentation` | `offside-presentation` |
| `set-piece` | `set-piece` |
| `substitution`, `card`, `var`, `replay` | matching stopped phase |
| `celebration`, `presentation`, `half-time`, `full-time` | `presentation` |
| `paused` | `paused` |

Only `live` advances accelerated football time. All stopped phases advance real
animation time; pause advances neither. Period completion comes only from the
clock. The second half requires one namespaced, exact-once
`start-second-half` period event during a kickoff/dead-ball host phase. It emits
`clock.period-transition.handoff`; duplicate or stale events cannot reopen a
period. The host receipt prevents Build 173 and V2 clocks advancing together.

## Exact-once Restart and Suite handoffs

Restart, Suite and period source event IDs are stored in independent hashed
namespaces (`restart:`, `suite:`, `period:`). A raw ID reused across subsystems
therefore cannot suppress a different event. Commands also have stable IDs and
remain in original semantic order. In particular, an offside free-kick handoff
precedes freeze release at the same tick.

Exact-once evidence is never aged out and then accepted again. Both event and
command ledgers have an explicit capacity of 1,024 stable identities. Before a
new plan touches Clock, Restart or Suite candidate state, the composer projects
the event-ledger size; before returning host commands, it projects the command
ledger size. A transaction that would exceed either capacity is rejected as a
bounded Build 173 fallback at the last committed tick. No entry is evicted, the
rejected event is not applied, and later replay of the oldest ID cannot toggle
state or reactivate V2. This is a deliberately safe session boundary rather
than probabilistic or time-windowed deduplication.

The reviewed offside sequence reuses existing assistant-referee IDs and emits
whistle, freeze, selection, pan, raise, hold and one free-kick handoff at fixed
simulation ticks. Replayed inputs cannot repeat the restart.

Set-Piece Suite staging emits one `setpiece.setup.handoff`; arming/repeating
emits one `ball.launch.handoff`. Stage/arm/reset/repeat require explicit
`attackingDirection` `+1` or `-1`. The coordinate dependency maps ball, taker,
wall, keeper, targets, launch origin/target/direction from the canonical centred
105 x 68 frame into the declared live pitch. Attacking left is a 180-degree
horizontal rotation, not an x-only mirror. No centred Suite bytes are sent
directly to the live 0..105 pitch.

## Camera policy

- CPU free kick, corner or goal kick: broadcast.
- Local human free kick, corner or goal kick: special set-piece angle.
- Local human penalty taker: penalty-taker angle.
- CPU penalty against a local human goalkeeper: penalty-save angle.
- CPU penalty against CPU goalkeeper: broadcast.
- Online/remote ownership: unavailable because the composition is frozen.

Camera outputs are transactional commands. They do not directly mutate the
live camera.

## Promotion and fallback invariants

- fixed 1/60 s simulation ticks only; no wall clock, timers or ambient random;
- prepare is private and idempotent for the same canonical input;
- commit accepts all required command IDs or none;
- clean abort is byte-identical to the pre-tick snapshot;
- partial/failed host acceptance permanently falls back to Build 173;
- replay, object-key order and independent runs are byte-stable;
- 1,024 exact-once IDs remain durable; the 1,025th unique event and a 1,026th
  replay preserve the complete committed Clock/Restart/Suite snapshot and fail
  safely to Build 173;
- no DOM, Three.js, input listener, network or live page authority;
- `match.html` remains untouched until the outer gameplay/contact transaction
  owner performs the reviewed merge.

Focused evidence lives in
`tests/live-v2-match-control-composition.mjs`. The gate covers both supported
workflows, phase/clock semantics, second-half transition, offside sequence,
camera matrix, exact-once ledgers, coordinate mapping in both directions,
unsupported geometry, malformed input containment, outer abort, dual-clock
rejection, permanent failback and deterministic traces.
