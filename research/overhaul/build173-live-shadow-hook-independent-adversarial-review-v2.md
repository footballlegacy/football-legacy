# Build 173 Live Shadow Hook V2 — Independent Adversarial Review

Date: 2026-08-11
Verdict: **GREEN — preserved read-only diagnostic workflow**
Scope: the live hook, the exact-flag `match.html` integration, and their
approved adapter/capture dependencies.

## Current reviewed bytes

- `match-engine/match.html`: `0d0bc4ea63368722d7220526b717bf04769aa6ce074a90a4bf174a6105e0df82`
- `match-engine/build173-live-shadow-hook-v2.js`: `61c4ab42563f3b4b8585371b37e8e2527073bdab4eb5598cb75b677fd1c12fca`
- `match-engine/build173-live-shadow-adapter-v2.js`: `b7cbd0f9366c97b966962c2a2c26c16d592cdb46358c0a7eb9e25cd3e60600e5`
- `match-engine/build173-shadow-host-capture-v2.js`: `c6556fafdb0caf1877e4b6b78f27bc4784d2dff5cfcee21b501849db96ea16c5`

The adapter, capture and hook remain unchanged from their reviewed read-only
contract. `match.html` subsequently gained a separate exact offline FL V2 live
preflight; the shadow preflight still rejects that live-engine marker and the
two capabilities cannot arm together.

## Hook gate result

The independent adversarial suite now passes **15/15**. The focused,
adapter, capture, composition and foundation group passes **73/73**. Running
the two groups together passes **88/88**.

Those gates establish:

- default pages load zero V2 scripts; only exact offline `v2Shadow=1` loads
  the reviewed ten-script UMD stack in order;
- malformed or non-record decoded `flMatch` payloads freeze before loading;
- every declared direct, query, saved-config and decoded online route freezes
  before host inspection or V2 loading;
- before-snapshot, after-snapshot, team-state, environment and tick-metadata
  faults never suppress or duplicate the one authoritative Build 173 update;
- throwing accessors, cyclic values and oversized values self-freeze the
  shadow with bounded diagnostics after that one legacy update;
- public/exported surfaces are bounded telemetry only, with no candidate
  state, snapshot, commands, projection, apply, commit or live-write route;
- walkout transition and full-time presentation ticks stay outside capture;
- correct ordinary and set-piece ready routes arm, while either cross-method
  call permanently self-freezes at stage `arm` before host snapshot capture;
- the page still contains exactly one reset, ordinary kickoff arm,
  suite-ready arm and pre-full-time finish boundary, with no ordinary
  restart/half-time reset;
- all six offline workflows retain exactly 22 unique stable team/slot
  identities across an in-place substitution; and
- twelve FAST simulation steps each produce one ordered legacy update and one
  capture boundary.

## Resolved finding: public lifecycle methods previously cross-armed

The initial independent suite found that `armAfterPostWalkoutKickoff()` and
`armAfterSetPieceSuiteReady()` could each arm the other workflow family. The
hook now compares its immutable workflow family with the requested arm kind
before reading the host or invoking capture-session arm. A mismatch throws at
the shadow boundary and is converted into the required permanent self-freeze.

The canonical suite now independently asserts both mismatch directions and
also proves that the resulting self-freeze cannot suppress Build 173. The
original adversarial gate was not weakened; it passes unchanged apart from
repinning the intentionally corrected hook bytes.

## Release status

The Build 174 foundation gate pins the final match page and all five shadow
runtime modules, retains the exact `v2Shadow=1` offline-only loader and proves
that its output remains bounded comparison telemetry. The separately reviewed
live adapter does not expose or consume the shadow projection surface.

## Review artifacts

- `tests/build173-live-shadow-hook-independent-adversarial-v2.mjs`
- `research/overhaul/build173-live-shadow-hook-independent-adversarial-review-v2.md`

This review changes no runtime bytes; it records that the diagnostic workflow
remains preserved alongside the exact offline playtest opt-in.
