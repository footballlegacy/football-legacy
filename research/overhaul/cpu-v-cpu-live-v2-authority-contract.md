# FL V2 CPU-versus-CPU live authority contract

Status: exact offline Quick Play opt-in. Build 173 remains the default.

## Launch boundary

CPU versus CPU may arm FL V2 only when every item below agrees:

- Quick Play `matchType` is externally `spectator`;
- payload engine request and effective engine are both `fl-v2` at
  `1.0.0-offline-live-authority-playtest` with no fallback reason;
- the URL contains exactly one `engine=fl-v2`, one matching positive uint32
  `simulationSeed`, and exactly one `autoplay=1`;
- payload controller ownership is exactly no player-one team, no player-two
  team, AI ownership of `both`, no online marker, and no cooperative marker;
- no online, shadow, duplicate, contradictory, malformed, or unsupported
  marker is present.

The host translates `spectator` to the runtime identity `cpu-v-cpu`. It must not
translate the external workflow to Single Player. Any failed condition loads no
live V2 authority module and leaves Build 173 visibly active.

## Gameplay authority

The live authority capability for `cpu-v-cpu` contains zero human player IDs
and exact CPU team IDs `you` and `opp`. Every snapshot must again contain zero
human IDs and no player control object. Injection of either permanently disables
that V2 attachment and restores the captured Build 173 state in the same tick.

An accepted tick composes the same deterministic ball, movement, CPU team/player,
formation, first-touch, aerial and protected contact engines as offline Single
Player. Both teams are planned by CPU V2. Host application, contact ledgers,
possession, ball projection and match-control remain one atomic transaction;
there is no mixed human or second legacy gameplay authority on a successful
tick.

## Match control and presentation

The outer match-control workflow remains `cpu-v-cpu`. Its private Restart
Presentation dependency uses that dependency's established CPU-v-CPU workflow
contract, so CPU-owned free kicks, corners, goal kicks and CPU-versus-CPU
penalties retain the broadcast camera. Clock, offside presentation, restart and
period handoffs remain exact-once and transactional.

## Non-removal and fallback

- CPU versus CPU with no FL V2 selection remains Build 173.
- Single Player and Set-Piece Suite retain their existing exact FL V2 opt-ins.
- Local two-player, Home Co-op, online, career and every other workflow remain
  unchanged and cannot mint this capability.
- Any preflight, planning, host-application, receipt or commit failure rolls
  back the complete candidate tick, disables the V2 session, and visibly
  continues on Build 173.

Focused evidence:

- `tests/cpu-v-cpu-live-v2-authority.mjs`;
- `tests/quick-play-fl-v2-engine-selection.mjs`;
- `tests/quick-play-live-v2-independent-adversarial.mjs`;
- `tests/live-v2-contact-independent-adversarial.mjs`;
- `tests/live-v2-match-control-composition.mjs`;
- `tests/live-v2-match-control-independent-adversarial.mjs`.
