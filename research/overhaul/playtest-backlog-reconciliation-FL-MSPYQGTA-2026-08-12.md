# FL-MSPYQGTA backlog reconciliation — 2026-08-12

## Purpose

This is the single durable reconciliation checkpoint for the 25 notes in playtest `FL-MSPYQGTA`. It separates live regressions from already-completed work, partial contracts, new tuning requests, browser/hardware constraints and positive evidence. It does not create a parallel workflow.

At the time of reconciliation, the collaboration runtime reported exactly one running task (`/root`) and no child agents. The archived agent names are retained task histories/checkpoints, not unfinished workers. The code backlog, not the history list, is what needs resolving.

## Playtest identity

- Host build: `0.174`; log schema: `4`.
- Requested and effective engine: `fl-v2`.
- Workflow: Single Player (`auto:false`, `twoPlayer:false`), Ultimate, Arsenal Invincibles vs Conte Chelsea.
- Score: Arsenal 0–1 Chelsea.
- 1,452 recorded events and 25 tester annotations.
- The exported `candidateTicks:0` and `lastCommittedTick:0` were false-negative telemetry: V2 evidence exists throughout the event log, but the old exporter only reported the latest gameplay epoch after dead-ball reset.

## Reconciliation result

| # | Tester observation | Forensic result | Existing work link | Status / disposition |
|---:|---|---|---|---|
| 1 | Sound still needs a click | Audio is already armed from canvas, global pointer, keyboard and gamepad gestures. A browser can still require an explicit accepted gesture under autoplay policy. | Audio unlock work | Browser constraint; retain the visible fallback instead of risking silent matches. |
| 2 | Framerate feels worse | Pure-engine performance gates do not measure the full 3D page, rendering, logging, battery throttling or browser load. | Engine performance gates | Needs one real browser profile on charged hardware; no speculative physics/AI rollback. |
| 3 | Chelsea did not collect a loose/long ball | The incident followed a V2 tackle and long pass. Existing outfield recovery only owns slow, low, untargeted defensive loose balls; it does not assign an attacking receiver/collector to this flight. | Outfield loose-ball recovery | Real P1 contract gap: targeted/contested flight collection priority. |
| 4 | CPU defenders static | A heavy-touch/loose transition left no suitable collector until the goalkeeper race engaged. | CPU defensive intents + recovery | Partially covered; receiver/collector continuation is still missing. |
| 5 | Keeper may have caught outside box | Courtois's logged claim at roughly `(3179,1636)` was inside the actual penalty-area bounds. | Keeper ETA sweep/claim | The specific incident is not a rules violation. A separate latent hand-claim sweep-boundary audit remains queued. |
| 6 | Keeper kicked twice without releasing; carrying slow | The ball was released, then the same keeper reclaimed its own distribution one frame later. This is the same source-player recontact family previously fixed for passes/lobs/throws, but keeper releases were omitted from the regression. | Source-player contact exclusion + goalkeeper release | Regression fixed in this batch; own keeper distributions remain ineligible until another player touches the ball. Carrying speed was already improved. |
| 7 | Keeper kicked straight out | Courtois's long distribution crossed the touchline. Repeated self-reclaims contaminated the broader distribution sample. | Keeper release targets | Real P1 decision/target-quality follow-up; re-test after the loop fix before retuning ballistics. |
| 8 | Keeper kick/catch loop; avoid striker press | The loop is the same confirmed self-recapture defect. | Keeper loose-ball ETA + release | Loop fixed. Press avoidance and release selection remain a bounded follow-up. |
| 9 | Rotate keeper arms/hands to ball | No prior task changed the precise hand alignment. | Keeper presentation | New cosmetic P2; not mixed into keeper authority logic. |
| 10 | V2 indicator smaller/remove | The strict-stop design still needs a passive live indicator, but the full label was unnecessarily intrusive. | Strict V2 playtest stop | Fixed: compact `V2 · SP` / `V2 · CPU`, smaller styling; full meaning remains in its title. |
| 11 | Keeper still stuck releasing | Same repeated own-distribution self-recapture. | Keeper release | Fixed by the new keeper-release exclusion. |
| 12 | Press keeper passively; foul/card release interference | Existing challenge paths already prevent normal tackles on a goalkeeper. The graduated foul/team-warning model is not implemented. | Rules/discipline + keeper pressure | New rules P2: passive press is preserved; release interference needs an explicit incident/count/card contract. |
| 13 | Distribution finally released but was poor | Confirmed poor outcome, but the loop distorted target selection and timing. | Keeper distribution | P1 after clean re-test. |
| 14 | Bad throw-in / dead-piece CPU | Existing Set-Piece V2 work covers the dedicated Suite and restart authority, not full tactical competency of every live CPU dead ball. | Restart/Set-Piece V2 | Real P1 live CPU restart-choice gap. |
| 15 | Referee positioning and referee replay viewport | Prior referee work added locomotion/animation, not research-backed diagonal positioning conventions or an operator camera. | Referee-run presentation | New P2 research/implementation lane, explicitly not claimed complete. |
| 16 | Authentic first-touch failure; should be rarer unpressured | Positive evidence for the first-touch system. Some touches in the log are V2 and some retained legacy-boundary contacts. | First Touch V2 live composition | Preserve; tune probability/pressure/technique only after authority-tagged frequency telemetry. |
| 17 | Thought match was CPU vs CPU | Launch config proves Single Player from the start; no workflow switch occurred. | Quick Play V2 selector | Not a runtime switch. Compact badge now explicitly says `SP` or `CPU`. |
| 18 | Keeper carrying speed improved | Confirms the isolated keeper carrying floor is visible. | Keeper carrying-speed task | Positive/closed; train CPU decision-making around it next. |
| 19 | Turning less icy but extremely stodgy | The movement work deliberately added deceleration/turn cost, but presentation does not yet sell the weight transfer. | Movement V2 turn/deceleration | Partial P1 feel/animation tuning; do not restore ice-skating locomotion. |
| 20 | Should auto-switch to intended pass receiver | The log records an automatic switch to Sol Campbell, followed later by a manual receiver override to Kolo during the same flight. | Receiver auto-switch | Auto-switch exists. Investigate initial target/aim selection and override timing; do not remove manual switching wholesale. |
| 21 | Pass much too weak / too much glide | Earlier work correctly removed extreme 30–50 m/s passes; this example then arrived too slowly (roughly 104 frames, pace falling from about 5.47 to 2.63 host units). | Ball/pass calibration | Real P1 lower-bound/friction calibration gap; needs distance/arrival test before another tune. |
| 22 | Lovely off-ball run | Direct positive evidence that the new run intelligence can produce the desired behaviour. | CPU run intelligence + formation support | Preserve as a promotion invariant and expand only after regressions are stable. |
| 23 | Team came too deep and boxed itself in | The note occurred at an own-corner throw-in, not normal settled open play. | Formation carrier-relative support | Real P1 restart-support shape gap; keep separate from ordinary formation tuning. |
| 24 | Hold normal broadcast angle four seconds after goal | No such protected hold existed before celebration/director cameras. | Replay/camera task | Fixed in this batch: normal selected broadcast mode holds the goal for 4 s before celebration/director coverage. |
| 25 | Pausing skipped replay; freeze match state | Physics already stops while paused, but real-time cinematic deadlines continued to elapse. | Replay exact-once/presentation | Fixed in this batch for celebration, goal/foul/dive replay, special sequence, goal broadcast hold and live set-piece camera hold. |

## Bounded repair made from this log

1. **Keeper source-recontact exclusion.** `goalkeeperLooseBallContext` now rejects keeper-originated roll, throw, kick, pass and goal-kick flight types while the keeper remains the last-touch actor. An opponent touch restores eligibility; a genuine keeper parry remains recoverable.
2. **Cumulative V2 telemetry.** Candidate gameplay commits, committed ticks and authority epochs are retained across dead-ball/special-action handoffs. `currentEpochTick` remains available separately. The next export can no longer misleadingly finish at `0/0` after a boundary reset.
3. **Compact live indicator.** The required playtest indicator is reduced to `V2 · SP` or `V2 · CPU`; strict-stop errors remain prominent and match-halting.
4. **Four-second goal broadcast hold.** A goal first remains in the user's selected broadcast camera for four real gameplay seconds before celebration/director coverage.
5. **Pause-safe presentation clocks.** Resuming shifts active cinematic deadlines by the exact paused duration, so writing a note cannot consume the goal hold or replay package.

## One ordered backlog — no agent fan-out

### Verify immediately in the next playtest

- Keeper releases do not self-recapture at any distance before another player's touch.
- V2 export ends with non-zero cumulative candidate/committed ticks and the correct `SP` or `CPU` identity.
- Pausing during the four-second post-goal hold resumes the same hold, then celebration and replay exactly once.
- No new full-page frame regression on charged hardware.

### Next P1 batch, after that clean log

1. Assign deterministic receiver/collector ownership to targeted and contested CPU ball flights.
2. Re-test and then improve goalkeeper distribution selection/press avoidance without changing the now-correct carrying speed.
3. Improve live CPU throw-in/free-kick/goal-kick choices and own-third restart support shape.
4. Calibrate the short-pass floor and ground decay from logged distance/arrival values.
5. Tune turning weight-transfer presentation while preserving the reduced ice-skating model.

### Later P2 / visual research

- Pressure/technique-conditioned first-touch error frequency.
- Keeper hand alignment.
- Referee positioning conventions and referee replay camera viewport.
- Keeper-release interference foul/team-warning/yellow-card ladder.

## Integrity rule going forward

Every future uploaded playtest is reconciled into this ordered runtime backlog. It does not create a new agent lane by default. A completed item stays complete only when the new log's evidence and its executable regression agree; a recurrence is reopened as a regression with the missing scenario added to the same test family.

## Final seal

- Final `match-engine/match.html` SHA-256: `b9a70902e6fd4c276161eeda2c31df10fd2f79603db95245b98ae6a3c4c54988`.
- Final-byte release/shadow/playtest seal: 52/52 passed.
- Final-byte adjacent CPU-v-CPU, restart, offside, first-touch/aerial contact, match-control, replay and Set-Piece sweep: 88/88 passed.
- `git diff --check`: clean.
- Real local-browser smoke: explicit FL V2 Single Player launched; compact `V2 · SP` rendered at 7.68 px with the full mode in its title; zero warning/error console entries.
