# MatchClock V2 contract

Status: **dormant additive candidate**. Build 173 remains authoritative. `match-engine/match-clock-v2.js` is not loaded or called by `match-engine/match.html`, and this change removes, shortens or replaces no existing workflow.

## Why this boundary exists

Build 173 currently derives football minutes directly from `clockFrames` and the configured real match duration. Its live update also applies special rates while kickoff is held or a celebration is active, while half/full-time gates, presentation delays and restart state are handled around that counter inside the monolith.

V2 isolates the proposed time contract without changing that live implementation:

- one authoritative fixed simulation tick;
- accelerated football time only during the `live` phase;
- ordinary real animation time during every stopped/presentation phase;
- no presentation or browser clock deciding gameplay;
- explicit, replayable transitions and period gates.

## Three time domains

The state keeps three separate clocks.

1. `simulationElapsedSeconds` advances by exactly `fixedTickSeconds` for every processed tick. This is the only authority.
2. `animationElapsedSeconds` advances by the same real-time tick while the match is not paused. Dead balls and presentation sequences therefore retain normal animation duration.
3. `totalGameplaySeconds` advances by `fixedTickSeconds * acceleration` only while the phase is `live`.

`pausedElapsedSeconds` records processed ticks spent paused. Pause time advances neither football time nor animation time nor added-time credit. Half-time and full-time presentations advance animation/presentation time but never football time.

The default six-real-minute configuration produces a 15x live-play acceleration (`5,400 / 360`). A consumer can instead supply an explicit acceleration. The module never samples `Date`, `performance`, animation frames, timers or randomness.

## Explicit phases and transitions

Active halves recognise:

- `live`;
- `dead-ball`;
- `offside-presentation`;
- `set-piece`;
- `substitution`;
- `card`;
- `var`;
- `replay`;
- `presentation`;
- `paused`.

All phase changes carry the current authoritative tick. A mismatched tick is rejected. `pause()` stores the exact resume phase; `resume()` restores it. A paused stoppage retains the same stoppage identity, but the paused interval contributes no animation time and no added-time credit.

Half-time is a gated period state, not a disguised live phase. The second half begins only through `startSecondHalf()`. Full time is terminal for football time, although post-match presentation animation can continue.

## Added-time accounting

Every stopped phase has an explicit, configurable added-time weight. The default candidate policy is one football second of candidate added time per real animation second. A consumer can exclude a category with weight `0`, use a partial weight, or mark a particular stoppage ineligible.

Before the regulation target, eligible stoppages build `candidateSeconds`. At the target:

- an explicit referee declaration wins if present;
- otherwise the candidate is rounded by the configured deterministic policy;
- the result is sealed and exposed as displayed added time.

Eligible stoppages after sealing build `postSealSeconds`, bounded by the same configured maximum. They extend the authoritative period target without retroactively changing the displayed board. Completed stoppage records retain their phase, reason, start/end ticks, real duration, weight and credited duration.

The default candidate/rounding policy is a technical contract, not a claim about a particular competition's rules. Competition-specific allocation remains a later data/policy decision.

## Period and display gates

- The first-half gate is `baseHalfGameplaySeconds + sealedAdded + postSealAdded`.
- Reaching it enters `half-time/presentation` and stores an immutable first-half summary.
- `startSecondHalf()` creates a fresh second-half period ledger. Its pre-kickoff dead-ball is ineligible by default.
- The second-half gate uses the same rule and enters `full-time/presentation`.

Display time follows football convention: the second half starts at `45:00` even if the first half contained added time. `totalGameplaySeconds` still retains every actually played football second, including both halves' extensions.

## Pure API and telemetry

The UMD/CommonJS API is pure and JSON-safe:

- `createState(options)` creates the complete clock ledger;
- `enterPhase`, `pause`, `resume`, `declareAddedTime` and `startSecondHalf` return new states;
- `advance(state, integerTicks)` is the only way time moves;
- `transition(state, event)` provides a schema-backed reducer interface;
- `runTimeline(state, segments)` supports deterministic fixtures/replays;
- `snapshot(state)` returns display clocks, all time domains, added-time state, gates and telemetry;
- `stableTelemetryJson(state)` produces key-canonical golden-trace JSON.

Telemetry is bounded and includes phase transitions, pauses/resumes, added-time declaration/sealing, period completion, active stoppage and completed stoppage episodes.

## Promotion gates

This dormant candidate must not become live authority until a later approved shadow migration proves:

- every live Build 173 clock/restart state maps to one explicit V2 phase;
- identical fixed-tick inputs produce byte-stable traces across frame chunks;
- all stopped phases leave football time frozen while their animations continue;
- pause/resume cannot leak time or added-time credit;
- first half, second half, added time, half-time and full-time gates agree with approved golden matches;
- replay, VAR, cards, substitutions, set pieces and offside presentation cannot decide gameplay from wall time;
- local, replay and online host traces agree for the same input timeline;
- Build 173 remains available as the rollback authority until opt-in comparison is accepted.

Live integration, tuning of competition-specific added-time policy and any alteration of `match.html` are deliberately outside this change.
