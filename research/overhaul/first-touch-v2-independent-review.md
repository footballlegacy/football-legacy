# First Touch V2 independent freeze review

Date: 2026-08-11
Reviewer scope: dormant First Touch V2 candidate only
Decision: **GREEN / freeze approved for the dormant candidate**
Live promotion: **not approved and not attempted**

The review did not edit `match-engine/first-touch-v2.js` or
`match-engine/match.html`. The only executable addition made by this review is
`tests/first-touch-v2-independent-adversarial.mjs`.

## Authority and workflow isolation

- CommonJS and plain-browser exports expose the same frozen API and resolve the
  same canonical request byte-semantically.
- Missing Ball Engine V2 fails when the First Touch candidate is used.
- Only the explicit dormant, offline candidate workflows are accepted.
- Online, normal-match, disabled, mismatched, and malformed capability paths
  fail closed.
- `match-engine/match.html` contains no First Touch V2 script reference, global
  reference, resolver call, adapter, or live apply path.
- The module has no DOM, input, renderer, animation-frame, network, timer,
  asynchronous, possession-mutation, or live-ball mutation surface.

## Physical and schema review

- Requests require the current complete Ball Engine V2 schema, all six declared
  player attributes, bounded SI state, deterministic seed/tick data, and plain
  bounded JSON metadata.
- Non-missed handoff preserves radius, mass, authoritative inertia,
  orientation, simulation time, and `lastOuterTick`; the new contact increments
  contact count and deliberately resets settle time.
- Passive retained/loose contacts cannot increase true combined linear and
  rotational energy, including when Ball V2 supplies a custom inertia rather
  than the sphere-default inertia.
- Controlled attachment and loose output obey the configured total 3D speed
  ceiling; induced spin is bounded.
- Caller input cannot turn trap/cushion into an active strike by supplying a
  truthy or mismatched `active` flag.
- Contact normal is unit length and derived from incoming relative velocity;
  `normalSpeed` is the corresponding absolute projection.
- Sole, foot, thigh, chest, and header envelopes are explicit. An explicitly
  selected technique cannot bypass its vertical envelope, and player motion
  extends reach only when projected toward the contact point.
- Extreme-but-finite vectors, unsafe counters, hostile metadata, missing
  attributes, cycles, accessors, symbols, reserved keys, oversized graphs, and
  non-finite numbers fail before derived non-finite telemetry can be emitted.

## Determinism and output review

- Exact positive and negative timing boundaries are symmetric.
- Pressure rows are normalized to a stable order; reversed caller order returns
  identical stable JSON.
- Directional error is keyed by seed, tick, ball ID, player ID, and intent, with
  no ambient random or presentation-time source.
- Successful results and nested state/telemetry are deeply frozen, finite, and
  do not mutate the request.
- Misses preserve the incoming Ball V2 state through the dependency's current
  clone path and only report detached telemetry.

## Executed gates

Focused command:

`node --test tests/first-touch-v2.mjs tests/first-touch-v2-independent-adversarial.mjs`

Result: **42 tests, 42 passed, 0 failed, 0 skipped**.

Breakdown:

- canonical focused suite: 26 passed;
- independent adversarial suite: 16 passed.

Both the module and independent adversarial test also pass Node syntax checks.

## Reviewed hashes

- `match-engine/first-touch-v2.js`
  `da75f9cc3ab3458df67c08f7868e45ae2c8d4ad1ef50ff07c78c3c100370b77d`
- `match-engine/ball-engine-v2.js`
  `4084ff8968859af2a4149703ce02eb37e0691fa20a542dbc97d793c33342c504`
- `research/overhaul/first-touch-v2-contract.md`
  `18468ac2784a754250be298c114616173ebbe63eeb3d365620e790fb8062cf05`
- `tests/first-touch-v2.mjs`
  `fafb14ae8c72e4cdea9bcc4a41c424ed46e31e3a653fed9cc8dc201b66a908f1`
- `tests/first-touch-v2-independent-adversarial.mjs`
  `ffba95720e7b39ad05f0aac3a38ca807ebb493565b7b8cbc0027de096ba5900a`

## Freeze boundary

No P0 or P1 defect remains in the reviewed dormant candidate at these hashes.
GREEN means the detached candidate and its contract can be frozen as a reviewed
foundation. It does not authorize a live adapter, normal-match authority,
online use, possession mutation, animation acknowledgement, or tuning against
unmeasured FIFA behaviour. Any such promotion remains a separate ordered and
independently reviewed change.
