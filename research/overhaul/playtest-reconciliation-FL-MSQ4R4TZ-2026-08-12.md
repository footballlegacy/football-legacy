# FL-MSQ4R4TZ playtest reconciliation

Date: 12 August 2026

Source: `football-legacy-playtest-FL-MSQ4R4TZ.json`

Logged build: `0.174`; requested engine: `fl-v2`; effective authority remained
`fl-v2-live` for the recorded session. The export contains 927 events and 30
tester annotations. It ends at match minute 71 without an engine fault event;
the tester stopped because the repeated contact behaviour made the match
unusable.

This document is a closure record, not a publication declaration. `Implemented`
means the source and a focused regression exist. `Browser proof required` means
the result is visual, subjective, hardware-dependent, or must be exercised
through the real Quick Play route. `Active repair` means the item is part of the
current bounded repair batch and is not yet release-frozen. No protected
workflow is removed or silently routed to another engine.

## Note-by-note reconciliation

| # | Match note | Evidence and diagnosis | Current resolution / acceptance boundary |
| --- | --- | --- | --- |
| 1 | Tunnel appears as a black block | The walkout source created opaque near-black geometry at the tunnel opening. The log contains no image, so the exact appearance is a code-supported diagnosis rather than visual proof. | **Implemented; browser proof required.** The opaque front occluder is replaced with a darker shell, rear plane, and soft translucent shadow. Prove the opening is unobstructed while the tunnel still reads darker. |
| 2 | Kick-off takes about two seconds too long | Kick-off used a 2.3 s minimum plus readiness stabilization; it was not waiting for the referee. | **Implemented; browser proof required.** The legal-ready minimum is reduced to 1.1 s, stabilization retained, and pause-safe restart deadlines are tested. Confirm whistle, legal spacing, and prompt control in-browser. |
| 3 | Failed first touch from kick-off; technical players should rarely fail unpressured | The later log contains 78 V2 receptions: 17 controlled, 60 retained, and one loose. Clean retained outcomes could recur every 18 host frames. | **Implemented in the First Touch layer; integrated dribbling active.** Clean failure probability is rating-led and very small for high technique, while speed, pressure, timing, and geometry remain physical. Same-player retained continuations are classified as `dribble-touch`, not new receptions. Final acceptance also requires the dedicated dribbling state and real kick-off play. |
| 4 | Good defensive take; frame rate feels poor; perhaps leave the web | The defensive take is positive evidence. The export did not contain rendered FPS, frame time, long-task, draw-call, triangle, DPR, visibility, or GPU data, so it cannot establish a platform cause. | **Defensive behaviour preserved. Performance instrumentation implemented; profiling required.** The report now records real RAF frame-time percentiles, long frames, catch-up/clamp counts, renderer load, DPR/resolution, hardware concurrency, and browser. A desktop wrapper is deferred until the same scene is measured in the normal browser and Chrome/PC. |
| 5 | CPU appeared to run the ball out | The event chain is a Costa-to-Hazard pass with no reception; the loose ball crossed the touchline. It was not a logged deliberate carrier run-out. | **Partially mitigated; integrated proof required.** Intended-receiver ETA preference exists. CPU physics-dribbling and receiver recovery must now prove that a reachable target continues toward the ball or emits an explicit abort before it exits. |
| 6 | Nearest-player switch fought the input | The complained incident has no immediately preceding L1 event. A later L1 worked 73 ms after input and selected Ashley Cole by distance. The current player being excluded can still make selection feel adversarial. | **Ambiguous incident; current owner-switch fix implemented.** If a teammate actually wins the ball, control now hands over immediately. Manual-switch candidate scoring and a short overwrite audit remain required before changing selection from this note alone. |
| 7 | Web version / PC may be the cause | This is a repeat of the performance concern, not additional measurement. | **Deferred behind comparable profiling.** Keep the present web route for now. Packaging the same WebGL code as a desktop app would not itself prove or guarantee better performance. |
| 8 | Throw-in aim guide remains; player rotation unclear | The throw taker already rotates toward the selected aim. The projected guide was deliberately rendered for throw-ins. | **Implemented; browser proof required.** The throw trajectory guide is hidden while taker rotation and directional selection remain. Mirror-test both touchlines with controller and keyboard. |
| 9 | CPU should have taken the ball; first touch too erroneous | This is consistent with the retained-touch calibration and receiver-continuation defect rather than a missing CPU controller. | **First Touch repair implemented; dribbling/CPU continuation active.** CPU and human players must use the same contact and separated-touch physics; difficulty may affect decisions, not the collision result. |
| 10 | Through ball intended wide to the fullback redirected control | The log proves the tester's intended target only through the note; raw stick direction and ranked candidate scores were not exported. | **Existing directional source retained; browser/telemetry proof required.** Reproduce an eight-direction through ball, log requested vector and ranked targets, and ensure auto-switch cannot redirect control away from the nominated reachable receiver. |
| 11 | Opposition throw-in sequence was awful | The CPU used a constant launch regardless of target distance, overshot Pedro by roughly 500 world units, and stale `throw-in` flight metadata survived into later possession and a shot. | **Active repair.** Solve speed/loft from distance, bound the legal target, clear flight metadata on controlled contact, and require landing within one control radius. |
| 12 | Switch to the teammate that reaches the ball first | The request is precise and independent of manual candidate cycling. | **Implemented.** Actual same-team ball ownership now causes immediate control handover, with local co-op ownership exclusions preserved. Focused regression passes; real controller proof remains. |
| 13 | Excellent keeper distribution | Positive evidence; no repair is warranted from this incident. | **Preserve as a positive invariant.** Current keeper-target, input, and carry-pose work must not regress this distribution route. |
| 14 | CPU fullback stayed static instead of exploiting space | Courtois distributed toward Alonso, but Alonso never completed the reception; Azpilicueta eventually collected the loose ball hundreds of frames later. | **Active integrated proof.** Intended-receiver pursuit and the CPU dribbling/recovery state must make the assigned fullback close on the projected ball or explicitly reassign/abort. Do not solve this by global speed inflation. |
| 15 | Add FIFA-style instant replay with dolly, pan, boom, tilt and truck | Existing replays are automatic cinematic packages over a rolling snapshot buffer. There was no user-opened scrub timeline or free camera. | **Active implementation.** Add a pause-only review over an immutable copy of the existing buffer with scrub, play/pause/speed, orbit, pan, tilt, dolly, truck, and boom. It must never mutate match state, automatic replay capture, clock, score, rules, or authority, and must restore the exact paused view once. |
| 16 | Tackle deflection or pass straight out? | The old export lacks the contact-path details required to distinguish the two. | **Telemetry boundary, no speculative physics tune.** Record action source, ball contact/deflection identity, pre/post velocity, intended receiver, and boundary outcome. The loose-ball slide contract below will supply exact contact evidence for future reproductions. |
| 17 | Pausing caused the game to take the throw | A human throw was staged, the game paused for about 19.5 wall-clock seconds, and the restart watchdog auto-launched at the same frozen match frame. Restart deadlines were not shifted while paused and the watchdog did not distinguish a human taker. | **Active repair.** Shift all restart deadlines across pause and prohibit human watchdog release. After a 20 s pause, require a fresh post-resume release edge before the throw can launch. |
| 18 | Slide did not collide with the loose ball | The slide path only tested `ball.owner`; an unowned ball could not be struck even when the tackler passed within collision distance. | **Implemented in current host candidate; final integration active.** Resolve an owner-independent swept ball contact before carrier/foul resolution and expose a distinct slide action. Require exactly one logged slide contact, not an incidental later reception. |
| 19 | Keeper did not release on Cross | The recorded release occurred at the 300-frame watchdog. No Cross edge was exported, so the log cannot distinguish missed browser input from a rejected game action. | **Active repair.** Add accepted/rejected keeper-release provenance for controller 1/2 and keyboard, including held-across-pause/reconnect cases; require one release before the watchdog. |
| 20 | Slide hitbox again felt disabled | The second slide also ended `won:false` despite finishing close to a loose ball. | **Same active slide-contact repair as note 18.** Reproduce all three logged trajectories and prove the contact capsule remains deterministic under replay/chunking. |
| 21 | Dead-ball glide remained; opponents staged inside the goal-kick box | Restart logging exposed illegal initial positions, then players were hard-moved to the exclusion boundary while the match frame remained frozen. | **Active repair.** Legalize positions and clear locomotion/actions atomically before the first observable goal-kick frame. No player may glide during a frozen staging cut. |
| 22 | Player took a touch then ran away | This is the visible symptom of treating a retained touch as neither controlled possession nor a durable dribbling continuation. | **Physics-led dribbling active.** A retained contact must enter a serialized separated-touch state: touch preparation, physical ball separation, chase/recovery, and one of resecure, heavy touch, shield/turn, action release, or turnover. |
| 23 | Backflip rotates the wrong way and is too slow | The animation used negative full rotation over 112 simulation ticks. | **Implemented; visual proof required.** Rotation direction is reversed and duration reduced to 72 ticks. Confirm head clearance, landing, and camera tracking. |
| 24 | CPU chooses a celebration instantly; allow eight seconds for scorer roaming and teammates following | The CPU selected a celebration one millisecond after the goal; the previous human window was only 4.3 s. | **Implemented; browser proof required.** Every scorer gets an eight-second roaming window, teammates follow, and CPU fallback occurs only at the deadline. Human choice remains available throughout; pause shifts the deadline. |
| 25 | This slide felt satisfying and correct | The logged slide still ended `won:false`; the satisfying outcome was an incidental subsequent First Touch reception. | **Preserve the feel, correct the attribution.** The new slide contract must make a successful version log the actual ball contact and possession consequence, while the same input/aim remains responsive. |
| 26 | Drag needs work; new visual ball spin looks excellent | The note does not identify drag-back skill, turf deceleration, or aerodynamic drag, and no fixed trajectory sample surrounds it. Visual spin praise is clear and separate. | **Visual spin preserved; physical drag unclassified.** Do not tune a coefficient from ambiguous evidence. Future repro must log initiating action, authority owner, surface/air state, velocity/spin samples, and stopping/arrival distance. |
| 27 | Keeper arm animation is still wrong while carrying | Human keeper carry did not use the same action state as CPU carry, and the ball was positioned by a generic owned-ball rule rather than a hand/chest socket. | **Active repair.** Use one keeper-carry action for all controllers, attach the ball to a bounded hand/chest socket, preserve running legs, and test hand-ball distance while moving. |
| 28 | R1 + Square low cross worked but was far too hard; receiver logic unclear | Input mapping and attacking runs were correct. The launch was about 24.8 host speed, remained far above the declared contact height after the predicted contact frame, missed everyone, and crossed the pitch. | **Active repair.** Use a capped flat/skidding low-cross profile with consistent contact time/height. Require arrival within one receiver stride and prevent untouched full-width continuation. |
| 29 | Repeated first touches look broken but reveal an inspiring physics/collision-based dribbling model | The minute 56-71 window contains long same-player retained-touch chains at the host's 18-frame unlock cadence. This was a control loop, not a crash. | **Major V2 dribbling work active.** Keep the reactive ball physics, but replace repeated receptions with a dedicated dribble state, foot/contact telemetry, deterministic separation, bounded recovery/resecure, shield/turn, heavy-touch and turnover outcomes, and buffered pass/shot/skill actions. Human and CPU use identical physical rules. |
| 30 | The match is breaking; end the playtest | The export has no runtime-fatal or authority-fallback event. After the minute-60 note it still records tackles, possessions, passes, and skill inputs, but repeated retained contacts continue and `endedAt` remains null. | **Primary loop root cause repaired; final release still pending.** Re-run the minute 56-71 scenario through Single Player and CPU-v-CPU after dribbling integration. Separately make user-ended exports record an explicit end lifecycle instead of relying on a final pause/note. |

## Cross-cutting acceptance for this batch

1. Preserve Build 173 as the default and preserve every protected mode. FL V2
   authority remains an exact offline opt-in for its approved workflows; Online
   remains fail-closed to legacy authority.
2. First Touch, dribbling, Movement, Ball, contact, CPU, and Formation must use
   one deterministic transaction per fixed tick. A late failure must roll back
   the whole candidate tick; it must never mix half a V2 touch with a legacy
   touch in the same tick.
3. Human and CPU players use the same ball/contact/dribbling physics. Ratings
   and pressure can change technique and decisions; difficulty cannot secretly
   change collision radii, gravity, speed, restitution, or possession rules.
4. Pause-only replay review is presentation state only. Entering, scrubbing,
   moving the camera, and leaving it must not change score, time, RNG, authority,
   player/ball state, automatic replay queues, restarts, or input edges.
5. Collect real render telemetry before deciding on a desktop wrapper or PC
   migration. Compare the same scene, seed, resolution, DPR, and settings.
6. Re-run Single Player, CPU-versus-CPU, Set-Piece Suite, legacy modes, Online
   setup, Career, Create-a-Club, Player Career, controller/keyboard paths,
   restart/replay/full-time, strict-stop, shadow isolation, and export gates on
   the final frozen bytes.

## Release state

Not frozen. The current bounded implementation lanes are physics-led dribbling,
restart/throw/slide/keeper/low-cross repair, and pause-only instant replay. The
final status of this document must be updated from `Active repair` only after
their focused gates, protected regressions, and real-browser checks pass on one
unchanged byte set.
