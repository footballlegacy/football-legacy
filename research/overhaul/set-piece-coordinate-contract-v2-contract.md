# Set-Piece Coordinate Contract V2

Status: dormant, additive coordinate adapter only. It is not loaded by
`match-engine/match.html`, owns no live authority, and does not alter Set-Piece
Suite V2, Ball Engine V2, Build 173, or any offline, local co-op, online, replay,
restart, controller, sound, VAR, foul, card or presentation workflow.

## Purpose

Set-Piece Suite V2 authors geometry in the exact coordinate system
`si-metres-attacking-positive-x`. Its full reference pitch is a centred 105 x 68
metre rectangle:

- centre spot: `(0, 0)`;
- attacked goal line: `x = 52.5`;
- opposite goal line: `x = -52.5`;
- attacking-left touchline: `y = -34`;
- attacking-right touchline: `y = 34`; and
- `z` is an unscaled height in metres.

`match-engine/set-piece-coordinate-contract-v2.js` supplies the missing public,
deterministic and reversible mapping from that canonical frame to a declared
metric pitch rectangle. It does not infer units, axes, rotation, pitch size or
attacking direction.

## Declared metric pitch

A supported pitch declaration must explicitly provide:

- units `metres`;
- coordinate system `si-metres-world-x-length-y-width-z-up`;
- axis alignment `axis-aligned`; and
- finite, strictly increasing `xMin`, `xMax`, `yMin`, `yMax` bounds.

The dormant engine support envelope is length 90..120 metres, width 45..90
metres, with length strictly greater than width. This is an internal capability
boundary, not a fallback or an inference about malformed geometry. Rotated,
sheared, polygonal, pixel, foot, yard, axis-swapped, out-of-range, non-finite,
reversed and undeclared geometry fails closed.

## Exact affine transform

For pitch length `L`, pitch width `W`, pitch centre `(Cx, Cy)`, and attack sign
`s`:

- `s = +1` for `attacking-right` (positive world x);
- `s = -1` for `attacking-left` (negative world x);
- `X = Cx + s * x * (L / 105)`;
- `Y = Cy + s * y * (W / 68)`; and
- `Z = z`.

The inverse is:

- `x = s * (X - Cx) / (L / 105)`;
- `y = s * (Y - Cy) / (W / 68)`; and
- `z = Z`.

Attacking-left is therefore an exact 180-degree horizontal rotation, not an x
mirror. A canonical attacking-left position (`y < 0`) stays on the taker's left
after the team changes direction. Anisotropic pitch scaling applies separately
to x and y. Direction vectors use the same linear part without translation and
are intended to be normalized by the consuming Ball Engine launch resolver.

The only numerical accommodation is a `1e-9` metre boundary tolerance for
floating-point affine round trips. Values inside that tolerance are clamped to
the exact declared edge; materially out-of-envelope values still fail closed.

## Role-complete geometry

The public role bundle has the exact fields:

- `ball`: one position;
- `taker`: one position;
- `wall`: a dense array of zero or more positions;
- `keeper`: one position or explicit `null` for an absent keeper; and
- `targets`: a non-empty dense array of positions.

Every point must contain exactly finite `x`, `y`, `z` data properties. Canonical
points must lie inside the canonical pitch; mapped points must lie inside the
declared pitch; supported height is 0..20 metres. Sparse arrays, getters,
setters, symbolic fields, custom prototypes, extra geometry fields, missing
roles, empty targets and forged transform coefficients are rejected before any
mapping occurs.

## Compatibility and immutability

The adapter's canonical coordinate-system string is byte-identical to the one
already emitted by Set-Piece Suite V2. On a centred 105 x 68 pitch while
attacking right, all role coordinates are a byte-semantic no-op. The adapter
does not rewrite scenario IDs, wall/keeper/target presets, launch schema, speed,
lift or spin values.

All public results are deeply frozen. Inputs are never mutated. Equal inputs
produce byte-identical JSON. Point, vector and complete role-bundle mappings are
independently reversible.

## Ball Engine handoff

A suite launch may be adapted without changing the shared
`football-legacy-ball-v2-launch-intent` schema:

1. map `origin` with `canonicalToPitchPoint`;
2. map `target`, when present, with `canonicalToPitchPoint`;
3. otherwise map `direction` with `canonicalToPitchVector`; and
4. preserve speed, lift angle, all three spin axes, source and metadata.

This contract performs no handoff itself. Selection, attribution and gameplay
authority remain the responsibility of a separately gated consumer.

## Evidence gates

`tests/set-piece-coordinate-contract-v2.mjs` covers:

- CommonJS/browser parity and live-match absence;
- canonical 105 x 68 no-op compatibility;
- complete ball/taker/wall/keeper/targets mapping;
- noncanonical and offset pitch round trips;
- decimal-boundary round trips;
- normalized proportional equivalence;
- attacking-left/right rotation semantics;
- point and direction-vector reversibility;
- Set-Piece Suite launch coexistence with current Ball Engine V2; and
- adversarial non-metric, unsupported, malformed, accessor-bearing and forged
  inputs.

The suite must also coexist green with the full existing Set-Piece Suite V2 and
Ball Engine V2 focused suites. No live integration is authorized by these
tests.
