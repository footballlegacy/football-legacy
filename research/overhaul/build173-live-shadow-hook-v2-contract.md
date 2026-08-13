# Build 173 exact-flag live shadow hook v2 contract

## Authority and enablement

`match-engine/build173-live-shadow-hook-v2.js` is a telemetry-only wrapper
around the existing Build 173 `update()` function. Whenever this shadow route
is selected, Build 173 remains the sole gameplay authority. The hook cannot
return state, candidate commands, forces, projections or an application
surface, and no shadow output is assigned to the live match.

Build 174 also contains a separate conditional offline FL V2 live-authority
preflight. It is outside this hook and is mutually exclusive with the shadow:
the shadow preflight rejects any live-engine query marker, while the live
preflight rejects any `v2Shadow` marker. Thus adding the playable opt-in does
not turn this diagnostic surface into a projection or write path.

The loader gate is exact:

- one and only one query value `v2Shadow=1` requests the stack;
- an absent, duplicated or differently valued flag loads no V2 component;
- obvious URL online markers, decoded `flMatch` online markers and invalid
  decoded payloads freeze before any V2 component loads; and
- online markers discovered from the selected match configuration freeze the
  hook before a capture session or adapter is instantiated.

The eligible UMD order is fixed: ball engine, ball bridge, CPU intelligence,
movement, formation, match clock, unified orchestrator, Build 173 adapter,
Build 173 host capture, then this hook. The exact acknowledgement is
`EXPLICIT_BUILD_173_EXACT_FLAG_OFFLINE_TELEMETRY_HOOK`.

## Host boundary

The inline host facade declares a stable two-team, 22-slot identity through
the reviewed formation inventory. Runtime players are read through their
stable on-pitch indices. It supplies explicit ownership for all six offline
workflows, the exact Build 173 pitch and match-length inputs, complete ball and
clock fields, deterministic team phases, empty movement commands and bounded
environment labels. All captures are detached and recursively frozen before
they cross the hook.

Every armed wrapper call follows one order:

1. capture immutable `before`;
2. invoke the authoritative legacy update exactly once;
3. capture immutable `after`;
4. submit one read-only observation; and
5. return only the original legacy result.

Capture failure before the update self-freezes the shadow and still calls the
legacy update once. Capture or observation failure after the update
self-freezes without changing its result. A legacy update error retains the
legacy error path and is never swallowed.

## Lifecycle

- A true new match resets to a fresh epoch after the real Build 173 teams and
  kickoff state have been rebuilt.
- Ordinary matches arm only after the walkout has actually transitioned to
  the on-pitch kickoff. The transition update itself is not captured.
- The set-piece suite arms only after its explicit ready restart setup.
- The two public arming methods are bound to those exact workflow families.
  Calling the suite-ready method for an ordinary offline workflow, or the
  post-walkout method for the set-piece suite, self-freezes before any host
  snapshot is read or capture-session arm is attempted.
- Half-time kickoff, goals, restarts, pauses and controller changes do not
  reset or replace the epoch.
- FAST mode wraps every legacy simulation update separately and records its
  render-frame sequence and simulation-step index.
- Capture finishes before `fulltime-presentation`; walk-in and post-match
  presentation are never observed. Both mutually exclusive clock-authority
  branches (default Build 173 and conditional offline live V2) invoke one
  shared finish helper, whose only shadow operation is the single reviewed
  `finishBeforeFullTimePresentation()` call.

A finished attachment may reset only for a true fresh match. An online-frozen
or self-frozen attachment is unavailable for the remainder of that page.

## Public output and failure containment

The public attachment exposes lifecycle calls, selection of the tick runner,
diagnostics and bounded telemetry export only. Diagnostics identify Build 173
as authority and assert `readOnly:true`, `liveWrites:false`. Telemetry is the
sanitised aggregate host-capture export; it contains no raw candidate snapshot,
movement command payload, state accessor, projector, apply or commit function.

Every hook/capture/accessor/telemetry error is caught at the shadow boundary,
records a bounded reason and permanently self-freezes that page's attachment.
It cannot interrupt, pause or mutate Build 173 gameplay.

## Required gates

The focused suite proves default zero-load, exact ordered loading, URL and
decoded-online freeze, the six offline ownership workflows, fresh-epoch and
set-piece arming, wrong-method workflow isolation, skipped transition tick,
exactly one legacy update, FAST
sequencing, finish-before-presentation, no half-time reset, fault containment,
bounded telemetry-only output, mutual exclusion from the separate offline-live
preflight, and absence of a live projection path. The
foundation suite pins the match-page delta and preserves all protected
workflow and online hashes.
