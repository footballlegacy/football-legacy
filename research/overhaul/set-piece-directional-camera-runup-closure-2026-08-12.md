# Set-piece directional delivery, camera and run-up closure

Date: 2026-08-12

## Scope

This is additive maintenance inside the existing main 3D match and Quick Play Set-Piece Suite. It does not remove, replace or rename a workflow. Build 173 remains the Quick Play default; FL V2 remains an explicit offline opt-in for Single Player, CPU vs CPU and Set-Piece Suite only. Online and the other protected workflows remain unchanged.

## Free-kick approach

- Direct free kicks now have a dedicated technique-sensitive approach rather than the old short straight rush.
- The path is a deterministic curved approach from roughly 3.5 to 4.3 metres.
- Preferred foot and strike type mirror the approach side.
- Dipping, driven and curved techniques use distinct approach widths and durations: 1180 ms, 1060 ms and 1320 ms.
- Contact uses a look-ahead facing direction and a separate slower run-up presentation phase.
- Circle remains the direct-shot input. The service controls below do not replace direct free-kick shooting.

## Directional lofted services

The same service vocabulary is available at free kicks, corners and goal kicks:

- Square: normal loft and bend.
- R1 + Square: lower, faster service with restrained bend.
- L1 + R1 + Square: driven, flatter service with minimal bend.
- Left stick at release: delivery line and spin bias.

The plan combines power, passing, technique, destination, stick direction and the selected flight mode. Each mode has a different speed, loft, contact-height, spin, curve and dip profile. No additional invented modifier was added.

## Camera contract

- The set-piece rig is anchored to the ball and aligned to the goal or delivery axis.
- Free-kick, corner and goal-kick views remain behind the player with enough depth for the full approach.
- The camera is dollied farther back than the retired setup: 420 units for a free kick, 370 for a corner and 390 for a goal kick.
- The look target stays near the ball so the taker and goal remain inside one shot.
- Directional panning is bounded to a small rotation window rather than orbiting away from the wall and goal.
- Opposite ends mirror deterministically.
- A narrow-window HUD rule keeps the long control guide away from the central run-up lane.
- Online and CPU-controlled restart camera policies remain their protected broadcast choices.

## Evidence

- Inline scripts compile 4/4.
- Focused set-piece, restart, replay, keeper and input family: 105/105 green.
- Protected V2, online, CPU-v-CPU, First Touch, Dribbling and shadow semantic matrix is green after exact-byte reseal.
- Real Quick Play route used: Set-Piece Suite plus explicit FL V2 selection.
- The live page displayed `V2 · SET PIECE`; its status title now explicitly says `FL V2 live · Set-Piece Suite`.
- The staged frame visibly contained the taker, ball, wall and goal, and the mid-approach frame showed the slower run-up without a camera cut.
- Browser warning/error log: empty.

## Honest limits

- The current footballer remains the procedural articulated match model; the refined approach is a distinct deterministic animation sequence, not motion-captured FIFA animation.
- Final subjective tuning of camera distance, approach cadence and delivery weight remains playtest feedback, not an authority or workflow blocker.
