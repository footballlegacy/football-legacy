# Build 173 Ball and Collision Physics Audit

Scope: current `match-engine/match.html` behavior and its set-piece companion code. This is an as-is audit, not a replacement implementation.

## Executive finding

Build 173 has a capable custom 2.5D football model, but not a general rigid-body ball engine. Three.js renders the scene; the live ball is advanced by inline scalar position/velocity rules. The current implementation is useful as a stable legacy reference, but its scalar spin, single air-drag factor, single ground-grip factor, frame-coupled random roughness, and instantaneous contact reflections cannot support the intended FIFA-level range of flight and collision outcomes without a new ordered candidate pipeline.

There is no Cannon.js ball simulation in the current Build 173 snapshot. Any earlier description of Cannon physics does not describe this authoritative file.

## Current state and launch model

The live ball stores horizontal position/velocity, height/vertical velocity, scalar spin, curve acceleration, dip, and contextual metadata. Launch helpers resolve different actions—normal shots, finesse, low-driven shots, free kicks, passes, headers, volleys, and special contacts—into this shared scalar state.

Strengths:

- Many football actions already converge on a common live ball.
- Free-kick curve/dip and shot archetypes are observable and tunable.
- Predictive helpers exist for landing/flight estimates.
- The engine already carries rich action, player, restart, and replay context that a candidate layer can consume.

Limits:

- No 3D orientation quaternion or vector angular velocity.
- A single scalar spin cannot distinguish topspin, backspin, sidespin, tilted axes, or spin-axis evolution.
- Launch intent, contact solution, animation timing, assistance, and final impulse are not cleanly separated.
- Different action paths can inject ad-hoc multipliers, making global tuning fragile.

## Current flight model

The horizontal step applies a perpendicular curve force derived from scalar spin, decays that spin, applies a constant-style drag multiplier, and advances position. The vertical step subtracts a fixed gravity-like term plus a ramped dip term. Era settings provide `ballSpeed`, `loft`, `airDrag`, `groundGrip`, `bounce`, and `roughness`.

Strengths:

- Cheap, understandable, and performant.
- Produces visible curve and dip.
- Era values provide a useful presentation/gameplay variation layer.

Limits:

- Units are not physical SI units and the time-step contract is implicit.
- Drag is not derived from relative air speed, air density, ball diameter, or a speed-dependent coefficient.
- Curve is not vector Magnus lift and cannot correctly respond to arbitrary spin axes.
- Dip is partly an authored effect rather than the result of gravity plus topspin/aerodynamics.
- No wind-relative velocity or angular drag/torque model.
- No deterministic knuckle regime.
- Prediction helpers duplicate simplified integration and can drift from the live solver.

## Current bounce, skid, and roll

Ground contact applies one bounce coefficient, a large horizontal damping on bounce, then a grip multiplier while grounded. Small random direction changes represent surface roughness.

Strengths:

- Distinguishes airborne and grounded motion at a basic level.
- Era grip/bounce differences are easy to tune.

Limits:

- Impact, compression/restitution, skid, transition to roll, rolling resistance, and settle are not distinct regimes.
- Spin-to-translation coupling at first bounce is not modelled physically.
- `Math.random()` roughness makes exact replay/calibration difficult and acts as white noise rather than a correlated surface effect.
- Wetness, turf, body/boot material, incidence angle, and ball state cannot be expressed coherently.

## Current collision model

Goal-frame, wall, defender, and keeper contacts are primarily instantaneous position checks plus velocity reflection/damping or authored/random deflection. This is effective for readable gameplay but lacks a shared contact manifold/material solver.

Consequences:

- Fast-ball tunnelling and frame-rate sensitivity remain possible.
- A post, foot, shin, torso, head, keeper glove, and wall do not share a consistent impulse/energy model.
- Contact normal, tangential friction, angular impulse, body motion, and ball spin are only partially represented.
- Random deflection can hide whether the initial collision calculation was correct.

## Current action symptoms relevant to physics

Observed playtest reports that must become explicit gates:

- Volleys and aerial shooting do not reliably execute.
- Standing tackle can fail to show an acknowledgement animation, making input registration ambiguous.
- Tackles can be difficult to execute or win in situations where contact should be plausible.
- The free-kick run-up feels poor even where the eventual flight is acceptable.

These are not purely coefficient problems. They sit at the boundaries among input acknowledgement, animation/contact windows, locomotion, collision geometry, action eligibility, and ball launch. Tuning flight first cannot repair them.

## Replacement requirements

The candidate engine should expose:

- Fixed-step deterministic simulation with bounded substeps.
- Position, linear velocity, orientation, and vector angular velocity.
- Wind-relative speed, gravity, speed/spin-dependent drag/lift surfaces, angular decay, and optional seeded knuckle perturbation.
- Swept or substepped collision detection for fast contacts.
- Shared material/contact profiles with normal restitution, tangential friction, spin transfer, compliance clamps, and gameplay overrides.
- Explicit `airborne`, `impact`, `skid`, `roll`, and `settled` regimes.
- One authoritative solver used by live play, prediction, replay reconstruction, AI evaluation, and Set Piece Suite traces.
- Traceable contact events and energy/sanity diagnostics.

## Integration hazards

- Replacing the inline integrator directly would affect shots, passes, crosses, set pieces, AI interception, keepers, fouls, replays, restarts, camera tracking, sound triggers, online video presentation, and playtest logs simultaneously.
- Changing time units can silently alter animation/contact windows and AI reaction timing.
- Changing bounce/roll changes restart detection, keeper pickup, possession switching, and out-of-play timing.
- Changing launch semantics before locomotion/contact contracts stabilise can make free-kick or penalty tuning immediately obsolete.
- Using unseeded variation makes comparison, replay, and network diagnosis unreliable.

Therefore the first candidate must run in shadow and log deltas. It must not own the live ball until the foundation gates in `OVERHAUL-FOUNDATION-WORKFLOW.md` pass.

## Required regression matrix

At minimum, record pass/fail and trace hashes for:

- ground pass, through ball, lob, cross, normal shot, finesse, low-driven, header, volley, half-volley, clearance;
- direct free kick, indirect free kick, left/right corner, penalty, throw-in, goal kick, kick-off;
- first bounce, repeated bounces, skid-to-roll, settle, wet/dry profiles;
- post, crossbar, wall, boot, shin, torso, head, goalkeeper hand/body, net;
- standing tackle, slide tackle, shoulder contact, loose-ball duel, keeper pickup;
- 30/60/120 render-rate equivalence around one fixed simulation trace;
- pause/resume, replay, restart, match end, accelerated live clock, real-time dead-ball clock;
- Single Player, Local 2P, Home Co-op, CPU-v-CPU, suite mode, career launch, Create-a-Club launch, keyboard, DualSense, and generic gamepad.

The online path remains unchanged and receives compatibility verification only after the offline candidate is stable.
