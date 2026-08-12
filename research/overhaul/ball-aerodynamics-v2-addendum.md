# Ball Engine V2 aerodynamic addendum

Date: 2026-08-11
Status: additive dormant-candidate refinement only. `match-engine/match.html` does not load or call Ball Engine V2; Build 173 remains the sole live gameplay authority.

## Scope and authority boundary

This addendum tightens the deterministic flight model and its observability without promoting it, retuning the live game, or changing any existing controller, match, set-piece, replay, online, career, presentation, sound, clock, collision, contact, launch or restart workflow.

The passing-heavy FIFA 20 two-match capture is **not** a coefficient source. Its visual audit explicitly says the footage cannot estimate drag, spin, restitution, force, velocity or other physical coefficients. Aerodynamic tuning remains blocked until camera-calibrated, action-specific trials are divided into locked training and holdout sets.

## Physical facts implemented as invariants

For ball velocity `v`, wind velocity `w`, relative air velocity `u = v - w`, radius `r`, mass `m`, air density `rho`, dynamic viscosity `mu`, and cross-sectional area `A = pi r^2`:

- Reynolds telemetry is `Re = rho |u| (2r) / mu`.
- Drag acceleration remains `aD = -(q Cd A / m) uHat`, where `q = 0.5 rho |u|^2` and `Cd` still comes from the existing speed table.
- Axial spin is `omegaParallel = (omega dot uHat) uHat`; the Magnus calculation uses only `omegaPerp = omega - omegaParallel`.
- Spin parameter is `S = r |omegaPerp| / |u|`.
- The existing lift curve remains `Cl = clamp(liftSlope S, 0, maximumLiftCoefficient)`.
- Magnus acceleration remains `aM = (q Cl A / m) normalize(omegaPerp cross u)`.

The transverse-spin projection is a correctness fix: spin parallel to the airflow cannot inflate the lift coefficient, while adding any amount of axial spin leaves the same transverse Magnus result. The tests also require Magnus acceleration to be wind-relative, orthogonal to relative airflow, and sign-reversing under spin reversal.

Independent football studies support Reynolds- and spin-dependent aerodynamics, ball-profile dependence, and temporally correlated low-spin knuckle forcing. They do **not** provide universal coefficients or reveal FIFA 20's implementation. Relevant evidence-ledger entries are `PHYS-AERO-001` through `PHYS-AERO-005`, `PHYS-SPIN-001`, `F20-UNKNOWN-002`, and `F20-UNKNOWN-003`.

## Provisional dormant research choice

When and only when `knuckle.enabled` is explicitly set, speed is at least `minimumSpeed`, and total spin is no more than `maximumSpin`, the former independent-per-substep white-noise perturbation is replaced by a smooth seeded oscillator:

`aK = a0 sin(2 pi f t + phaseSide) lateral + 0.5 a0 sin(2 pi f t + phaseLift) liftAxis`

`lateral` and `liftAxis` form an orthonormal basis transverse to the relative airflow. Both phases are deterministic functions of the simulation seed. The forcing consumes no random draws, is replayable, is continuous across outer/render-frame chunking, has zero mean over complete periods, is orthogonal to relative airflow, and is component-bounded by `a0` laterally and `0.5 a0` on the lift axis.

The default `f = 3.5 Hz` is a configurable dormant research prior based on the average vortex/lift-force frequency reported in one free-flight experiment, not a universal football constant and not a FIFA 20 value. The existing `a0 = 0.75 m/s^2`, `minimumSpeed = 18 m/s`, and `maximumSpin = 6 rad/s` are retained as provisional uncalibrated candidate values. The default remains `knuckle.enabled = false`.

Primary research:

- Hong et al., *Unsteady Aerodynamic Force on a Knuckleball in Soccer*: https://doi.org/10.1016/j.proeng.2010.04.015
- Hong and Asai, *Effect of panel shape of soccer ball on its flight characteristics*: https://doi.org/10.1038/srep05068
- Asai and Kamemoto, *Flow structure of knuckling effect in footballs*: https://doi.org/10.1016/j.jfluidstructs.2011.03.016
- Goff et al., *Creating drag and lift curves from soccer trajectories*: https://doi.org/10.1088/1361-6404/aa6fcd
- Asai et al., *Fundamental aerodynamics of the soccer ball*: https://doi.org/10.1007/BF02844207

## Explicit non-changes

- Reynolds number is telemetry only. It does not select or modify `Cd`.
- The existing drag-speed table is unchanged.
- The existing lift slope and lift clamp are unchanged.
- Angular decay remains `0.16 s^-1`; no published spin-decay number is treated as universal.
- Reverse Magnus remains absent because its physical occurrence is regime- and surface-specific and its FIFA 20 relevance is unverified.
- Ball mass, radius, inertia, gravity, integration/substep order, ground regimes, passive-energy policy, collision materials, swept contacts, launch intents and state signatures are unchanged.
- No numerical value is labelled an EA or FIFA 20 constant.
- The exported candidate version remains `2.0.0-shadow`. A version bump would require the bridge, vertical slice and authority-kernel fixtures to be re-pinned together, so this bounded dormant patch is identified by its exact file hash instead of partially versioning the dependency stack.

## Executable gates

`tests/ball-aerodynamics-v2-adversarial.mjs` requires:

1. candidate dormancy and pinned untuned defaults;
2. axial-spin isolation and transverse-spin invariance;
3. wind-relative, orthogonal, sign-symmetric Magnus behavior;
4. dimensionally correct Reynolds scaling without implicit coefficient tuning;
5. seeded, bounded, zero-mean, temporally correlated knuckle forcing with explicit regime gates;
6. replay and render-chunk invariance for a knuckle-enabled candidate flight.

Promotion still requires ball-profile coefficient surfaces calibrated from suitable clean-room captures, holdout trajectory validation, uncertainty and extrapolation rules, distinct shot/pass/contact launch telemetry, target-browser performance gates, and an explicit separately approved authority transition. This refinement authorizes no workflow removal, reduction, rerouting, or live tuning.
