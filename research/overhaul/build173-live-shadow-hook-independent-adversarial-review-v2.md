# Build 173 Live Shadow Hook V2 — Independent Adversarial Review

Date: 2026-08-12
Verdict: **GREEN — preserved read-only diagnostic workflow**
Scope: the live hook, the exact-flag `match.html` integration, and their
approved adapter/capture dependencies.

## Current reviewed bytes

- `match-engine/match.html`: `1787fa39b8f2d11954fd58a48257ce885f24492fdd20e5d9e654ae017bf29aa6`
- `match-engine/build173-live-shadow-hook-v2.js`: `61c4ab42563f3b4b8585371b37e8e2527073bdab4eb5598cb75b677fd1c12fca`
- `match-engine/build173-live-shadow-adapter-v2.js`: `b7cbd0f9366c97b966962c2a2c26c16d592cdb46358c0a7eb9e25cd3e60600e5`
- `match-engine/build173-shadow-host-capture-v2.js`: `c6556fafdb0caf1877e4b6b78f27bc4784d2dff5cfcee21b501849db96ea16c5`

The adapter, capture and hook remain unchanged from their reviewed read-only
contract. `match.html` subsequently gained a separate exact offline FL V2 live
preflight; the shadow preflight still rejects that live-engine marker and the
two capabilities cannot arm together.

The later `FL-MSPYQGTA` reconciliation changed only normal/live playtest
telemetry, goalkeeper distribution eligibility and pause/goal presentation.
The shadow loader, capture, adapter, mutual exclusion and read-only surface are
unchanged and remain covered by the same lifecycle gates.

## Hook gate result

The independent adversarial suite passes **15/15** and the canonical hook
suite passes **10/10**, for **25/25** hook gates. The unchanged adapter and
capture dependency suites separately pass **53/53**.

Those gates establish:

- default pages load zero V2 scripts; only exact offline `v2Shadow=1` loads
  the reviewed ten-script UMD stack in order;
- the shadow preflight rejects the separate live-engine marker, the offline
  live preflight rejects every shadow marker, and each default route remains
  unloaded, so the two conditional capabilities cannot coexist;
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
  suite-ready arm and underlying pre-full-time finish call, with no ordinary
  restart/half-time reset; both mutually exclusive clock-authority branches
  reach that finish through the same helper before presentation;
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
