# Pause-only instant replay review V2 contract

Date: 12 August 2026

## Purpose

Instant replay review is a local presentation tool entered only from the
ordinary pause menu. It lets a local player inspect the existing recent replay
buffer without creating a second simulation, changing a match outcome, or
reusing the automatic replay director's lifecycle.

## Authority boundary

- The match must already be paused through the ordinary pause menu.
- Single Player, all-CPU CPU versus CPU, Local 2P, Home Co-op, and other legacy
  local routes share the same presentation-only review.
- Online fails closed. The entry is visibly disabled and no review controller
  is opened.
- A clip is available only when the existing buffer contains at least two
  valid frames spanning at least 250 ms. An unavailable or malformed buffer
  disables the entry without changing match state.
- Automatic goal, foul, dive, Set-Piece, celebration, offside, confrontation,
  and special presentation sequences remain separate. Review cannot open while
  one owns presentation.

## Immutable clip

The controller deep-clones only the replay position/pose fields already held by
the approximately seven-second replay buffer. It sorts, bounds, and freezes the
copy to at most 7,000 ms and 220 frames. Neither UI scrubbing nor playback holds
a reference to the live buffer.

The review supports play/pause, `0.25x`, `0.5x`, `1x`, and `2x`, bounded scrub,
and six independent camera controls: dolly, pan, boom, tilt, truck, and orbit.

## Projection transaction and restoration

The replay frame is projected only for rendering while the simulation is
paused. Each render transaction restores the exact footballer, ball, referee,
and assistant-referee fields it temporarily projected, including whether a
field originally existed. It does so in a `finally` path so a rendering error
cannot strand a replay pose in the live model.

Opening captures the paused camera and presentation state once. Closing calls
the package restore callback exactly once, returns to the same pause menu, and
holds the captured paused camera until the match is resumed. Repeated close or
error cleanup is idempotent.

The review does not write score, clock, authority counters, restart state,
automatic replay state, report events, or gameplay input state. Keyboard and
gamepad review controls use private state. After gamepad exit, gameplay polling
is guarded until the review buttons and sticks return neutral, preventing a
review input becoming a pass, shot, switch, or pause edge.

## Controls

- Mouse/UI: timeline, play/pause, speed, reset camera, return to pause menu.
- Keyboard: Space play/pause; Left/Right scrub; brackets change speed; A/D
  orbit; W/S tilt; Q/E dolly; R/F boom; Z/X truck; C/V pan; 0 resets the
  camera; Escape exits.
- DualSense/Xbox: Cross/A play/pause; L1/R1 scrub; Square/X changes speed;
  LS trucks/booms; RS orbits/tilts; L2/R2 dollies; D-pad Left/Right pans;
  D-pad Up resets; Circle/B exits.

## Acceptance gates

1. Pure tests prove a bounded deep-frozen clip, source isolation, valid
   interpolation, bounded playback, independent camera axes, and exactly-once
   restore.
2. Host tests prove pause-only/offline entry, Online disablement, render
   transaction/finally restoration, private input guarding, and absence of
   score/clock/restart/director/authority writes from the feature host lane.
3. Adjacent pause, automatic replay, controller, Online, strict V2, and
   protected-workflow gates remain green.
4. Real-browser QA must verify playback and scrubbing, every camera axis,
   controller exit, unavailable-buffer behaviour, exact return to the paused
   view, and normal resume in at least Single Player and CPU versus CPU. A
   legacy local route and Online-disabled route require smoke confirmation.
