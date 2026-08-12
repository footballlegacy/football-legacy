# FIFA 20 Ball-Behavior Reconstruction Protocol

Purpose: build a lawful clean-room Football Legacy ball system that targets the observable feel and outcome envelope of FIFA 20 without copying proprietary source, assets, tables, protected expression, or non-public material.

## Epistemic boundary

We can use:

- official public EA descriptions and manuals;
- later public EA lineage as lineage, not proof of FIFA 20 internals;
- public patents as architectural evidence, not a source-code recipe;
- peer-reviewed football aerodynamics and FIFA equipment/turf standards;
- direct measurements from Joshua's owned FIFA 20 copy;
- Football Legacy's independently written code and captured playtest data.

We cannot claim to know FIFA 20's proprietary time step, integrator, collision shapes, coefficient tables, error model, attribute weights, assistance implementation, animation-to-impulse mapping, random process, network authority, or internal files unless EA has publicly documented the exact point. Unknowns stay marked unknown.

The structured claim ledger lives at `research/ball-physics/fifa20-evidence-claims.json`.

## Reconstruction layers

Treat the observed result as a chain rather than one opaque “physics” value:

`action archetype -> assistance/targeting -> player/context/contact error -> launch velocity and spin -> aerodynamic flight -> collision/material response -> skid/bounce/roll -> trap/touch`

An observation is not used to tune a lower layer until plausible upper-layer causes are controlled or recorded.

## Capture conditions

Every capture record must include:

- FIFA 20 platform/version/date and whether it is Practice Arena, Skill Game, Kick-Off, or replay;
- camera, zoom, resolution, frame rate, and whether the source is native console or Remote Play;
- controller type/connection and controller-settings page values;
- player identity, preferred foot, visible attributes if known, ball, pitch/weather, run-up, body orientation, and starting location;
- exact button/stick recipe, approximate power-bar fraction, modifiers, and timed-finish state;
- clip path, hash, trim range, calibration landmarks, annotations, and observer uncertainty;
- whether the record belongs to calibration, validation, or holdout.

Remote Play compression and latency affect input timing and image measurement. They do not change the console's underlying simulation after the input arrives, but power-bar timing and single-frame contact estimates must carry larger uncertainty than native capture.

## Controller strata

Capture two distinct settings strata:

1. `identification/manual`: manual pass, through-ball, lob, and cross assistance where available. This reduces hidden directional correction while identifying launch/flight behavior.
2. `reference/default`: FIFA 20's familiar assisted/semi-assisted settings. This captures the final feel players actually recognise.

Do not pool the strata. Shot Assistance, Pass Assistance, Cross Assistance, Lob Pass Assistance, and Through Ball Assistance are experimental variables.

Initial observed Remote Play settings on 2026-08-11: Pass Assistance Manual, Shot Assistance Semi, Cross Assistance Semi, Lob Pass Assistance Assisted. Through-ball value was not visible in the captured frame and remains unrecorded until checked.

## Minimum observation matrix

For each recipe, collect repeated trials rather than one “good-looking” example:

- stationary short/medium/full-power ground pass;
- stationary short/medium/full-power lob;
- driven pass and driven cross;
- normal shot at low/medium/high power;
- finesse shot with left/right curvature;
- low-driven shot;
- direct free kick with low/medium/high power, neutral spin, side spin, top spin, and knuckle input;
- first-time shot, volley, half-volley, header, and clearance;
- shallow/medium/steep first bounce onto dry grass;
- repeated bounce, skid, roll, and settle;
- post/crossbar at shallow and steep incidence;
- wall/body/keeper deflection where repeatable.

Use a minimum of five valid repeats per controlled cell for exploratory fitting, with separate holdout players, locations, and power bands. Increase repeats for noisy/knuckle outcomes.

## Video extraction

1. Preserve the original clip and hash it before trimming.
2. Record effective frame rate and identify duplicate/dropped frames.
3. Calibrate image coordinates from pitch markings and goal dimensions where perspective permits.
4. Mark ball centre, contact frame range, bounce frames, goal-frame contacts, and settled frame.
5. Store pixel trajectory plus derived world-coordinate estimates and uncertainty; never discard the source pixels.
6. Compute launch direction/speed proxy, apex time/height proxy, lateral deviation, curvature evolution, flight time, bounce restitution proxy, skid distance, roll deceleration, and settle time.
7. Reject or flag occluded, camera-cut, auto-zoom, goalkeeper-contact, or unrepeatable samples rather than forcing a fit.

## Candidate physical model

State:

- position `x` and linear velocity `v`;
- orientation `q`;
- angular velocity vector `omega`;
- deterministic simulation seed and regime state.

Relative air velocity `u = v - wind`, Reynolds number `Re = rho * |u| * D / mu`, and spin parameter `Sp = R * |omega_perpendicular| / |u|` select bounded drag/lift behavior. Forces include gravity, drag opposite `u`, and Magnus lift from the spin/velocity cross product. Angular velocity decays through explicit torque/decay terms. Knuckle behavior, if enabled, uses a seeded temporally correlated process within a low-spin/high-speed envelope.

These equations are an independent physical foundation. Publicly reported coefficient ranges are priors and constraints, not FIFA 20 constants. Reverse Magnus is physically possible but remains disabled until direct FIFA 20 observations require it.

Ground/contact response separates normal restitution, tangential friction/spin transfer, skid, rolling resistance, and settle. Football feel may require bounded authored clamps; every clamp must be named, tested, and traceable rather than hidden in action-specific multipliers.

## Fitting order

Fit only against calibration samples, in this order:

1. scale, coordinate, time-step, and gravity sanity;
2. neutral-spin drag/flight-time envelope;
3. sidespin lift/curvature envelope;
4. top/back-spin dip, carry, and first-bounce effects;
5. angular decay;
6. bounce restitution and tangential coupling;
7. skid-to-roll transition and rolling resistance;
8. correlated knuckle variation;
9. contact material profiles;
10. assistance/context/attribute error above the physical solver.

After each stage, evaluate the untouched holdout. A parameter change that only improves hand-picked training clips is rejected.

## Acceptance metrics

Use both quantitative and perceptual gates:

- trajectory position error over normalised flight time;
- apex time/height error;
- lateral deviation and curvature-shape error;
- flight duration and arrival-speed error;
- first/second bounce height and time ratios;
- skid distance, roll deceleration, and settle-time error;
- post/wall/body rebound angle and retained-speed error;
- determinism and frame-rate independence;
- blind A/B ratings for weight, responsiveness, curve, dip, bounce, roll, and variety.

The target is not frame-perfect reproduction of one clip. It is a robust observable outcome envelope across actions, power, spin, players, and contacts.

## Integration rule

The reconstructed engine begins dormant, then shadow-only, then Set Piece Suite opt-in. It cannot become authoritative from research or calibration alone. Migration is governed by `OVERHAUL-FOUNDATION-WORKFLOW.md`, including the full workflow-preservation matrix and an immediate legacy rollback.

## Immediate capture batch

The first Practice Arena session should collect:

1. neutral stationary ground passes at three power bands;
2. neutral stationary lobs at three power bands;
3. normal shots at three power bands with Shot Assistance Semi;
4. paired left/right finesse shots at matched power;
5. low-driven shots at two power bands;
6. a short roll-to-settle sequence.

Keep player, location, camera, ball, pitch, and controller settings fixed. Free kicks, knuckle shots, bounces, and posts follow after this baseline because their launch/contact inputs are harder to control.
