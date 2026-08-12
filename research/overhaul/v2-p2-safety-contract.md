# Dormant Ball/CPU V2 P2 safety closure

Date: 2026-08-11
Authority: dormant candidates only; no `match.html`, input, replay, set-piece,
career, online, sound, camera or existing Build 173 workflow authority changed.

## Ball V2

- Context restoration rejects any integer `randomState` whose unsigned 32-bit
  representation is zero. This prevents xorshift's permanent absorbing state.
- An omitted plane normal retains the documented upward default. An explicitly
  supplied zero vector is invalid geometry and fails closed.
- A translating plane is swept in its relative frame. Its plane constant is
  advanced by normal velocity for the cumulative elapsed substep/contact time,
  so it cannot reset to its initial position on each substep. Contact response
  continues to use collider-relative velocity and the existing passive/active
  material policy.

The focused gate uses a collision that occurs only after more than one 240 Hz
substep and proves its contact fraction, final relative position and final
relative velocity equal the corresponding stationary-plane reference frame.

## CPU Intelligence V2

- Carrier, possession team and roster ownership are checked as one authority
  contract. Legitimate opponent possession/turnover remains valid and yields
  no controlled-team carrier action.
- Populated replay memory requires the exact schema and validates nested maps,
  finite points/numbers, keys, flags, bounded risks and tick lifecycles before
  the decision can advance.
- Unknown/non-finite explicit config values do not fall back silently. Risks
  are bounded to 0..1; distances/buffers/scores are non-negative; pitch-relative
  maximums are enforced in the declared canonical reference units.
- Spatial behavior is normalized against reference pitch `x=84..3260`,
  `y=6..2136`. Public snapshot, decision and memory points remain in the
  supplied pitch coordinate system. A 105x68 proportional mapping produces the
  same run choice, carrier choice, confidence, normalized score/clearance and
  constraint result as the reference snapshot.

## Executable gate

`tests/overhaul-v2-p2-safety.mjs` contains seven focused regressions covering
all closures above. It is additive and does not load or mutate live gameplay.

The full focused run also includes Ball, CPU, cross-engine coexistence, unified
shadow coordinator and promotion-adversarial suites. At this revision the
combined result is 103 passed, 0 failed.
