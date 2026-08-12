# Unified V2 Stack Promotion Review

Date: 2026-08-11
Review scope: Ball V2, Ball Shadow Bridge V2, CPU Intelligence V2, Movement/Contact V2, Formation Behaviour V2, MatchClock V2, Aerial Contact V2, and the Unified Overhaul Shadow Orchestrator V2.
Reviewer constraint: target engines and `match-engine/match.html` were not edited. The review added only an adversarial test file and this report.

## Decision

**Opt-in read-only offline match observation: conditionally ready.** The five-engine unified coordinator now composes deterministically, fails closed on the reproduced identity/continuity/clock defects, remains online-frozen, has no projection or apply surface, and passed the complete focused plus adversarial gate.

This is not permission to switch gameplay authority. `match.html` still does not load any V2 module and Build 173 remains the sole live authority.

**Scripted dormant offline vertical-slice work: ready to continue.** A lab may connect public contracts and assert handoffs without changing a real match. This review does not promote such a lab into a playable or authoritative match.

**Authoritative offline vertical slice: not ready.** The unified coordinator is intentionally a five-engine comparator. It does not include Aerial V2 in its dependency list or tick order, does not turn CPU pass/shot intents into Ball launches, does not make Movement possession/contact the next Ball/CPU authority, and takes the next legacy snapshot rather than closing a V2-owned state loop. Those are deliberate current boundaries, not test failures.

## Defects reproduced and closed on the reviewed bytes

The adversarial suite first reproduced these composition defects against earlier bytes, then gated their fixes:

1. A rejected first observation could poison tick-1 attachment.
2. A failure after CPU evaluation could poison same-tick retry state.
3. A late Ball failure needed to leave CPU memory, Movement, MatchClock, unified trace, and Ball trace unchanged.
4. Consecutive accepted snapshots did not require exact Movement and Ball before/after boundary continuity.
5. Duplicate expected or supplied CPU team identities were accepted.
6. A CPU snapshot could omit Movement participants or disagree with Movement team ownership.
7. A Movement player could change team identity between the before and after worlds of one tick.
8. A Formation team entry could command a Movement player owned by another team.
9. The coordinator could attach at tick 1 with a full-time clock, accept period regression/jumps, or accept backwards legacy gameplay time.
10. CPU spatial config and geometry originally mixed legacy screen dimensions with a 105 x 68 pitch, causing the unified suite to reject valid metric snapshots. The declared canonical reference-pitch scaling contract now preserves decisions and normalized clearances across both coordinate systems.

All ten are covered by executable regression gates. Failed observations are transactional at first attach, before Ball, and at the final Ball step.

## Contract audit

### Units and mappings

- Ball conversion declares world-units-per-metre, frames-per-second, ball radius, and explicit legacy field mappings.
- The unified fixed tick must match every component and Ball frames-per-second must be its reciprocal.
- CPU spatial values are authored against the declared canonical pitch `x=84..3260`, `y=6..2136` and scale to the supplied pitch. The Bale open-channel fixture produced invariant carrier choice, run type, scores, clearances, constraints, and normalized targets on a 105 x 68 pitch.
- CPU snapshots must contain exactly the complete Movement roster with identical team ownership.
- Formation targets must exist in Movement and belong to the Formation entry's team.
- The mapping signature is locked on tick 1.

The future capture adapter must still supply an audited affine coordinate transform. Validation proves that its numbers are finite and non-zero; it cannot infer whether a semantically wrong but finite transform was chosen.

### Identity and ordering

Accepted observations preserve one-to-one player IDs, unique CPU/Formation team entries, stable per-player team ownership, exact legacy Movement/Ball boundaries, sequential ticks, and a first-half clock epoch.

The effective observed order is:

1. validate and clone the complete legacy snapshot;
2. synchronize candidate clock phase;
3. resolve Formation;
4. resolve CPU decisions and staged memory;
5. derive explicit/CPU/Formation Movement commands in that precedence order;
6. step Movement and MatchClock to the common barrier;
7. step Ball last;
8. construct comparison-only telemetry;
9. commit private candidate state only after the complete tick succeeds.

Aerial V2 is deliberately outside this order. Its standalone contact result is deterministic and its launch schema is exactly consumable by Ball V2, but that compatibility proof is not a match integration.

### Determinism, immutability, and chunking

- No candidate or orchestrator uses an unseeded random source, wall clock, timer, animation-frame time, or presentation clock as simulation authority.
- Frozen inputs are accepted without mutation.
- Returned snapshots, candidates, telemetry, and exported traces are cloned; caller mutation does not change private candidate state.
- Identical seeds and inputs produce byte-identical output.
- A representative 22-player trace produced identical state and trace when 48 ticks were supplied individually or in irregular batches of `1, 7, 1, 18, 21` ticks.
- Accepted legacy clock periods cannot regress or skip a period and gameplay seconds cannot move backwards.

### Authority boundary

- Online is frozen even with an offline capability object and forged online flags.
- The public unified API exposes observation and trace methods, not `apply`, `project`, `commit`, `writeLive`, or `setAuthority` methods.
- Every unified result remains `readOnly: true` and `appliedToLive: false`.
- `match-engine/match.html` references none of the reviewed V2 modules.

## Performance and retention gate

The Node gate exercised 22 Movement players, a complete 22-player CPU view, both team formations, Ball, MatchClock, mapping validation, comparisons, and trace retention for 180 sequential ticks.

- measured mean: **1.720 ms per tick**;
- executable ceiling: **5 ms mean per tick**;
- retained unified and Ball windows: **16 records each**;
- exported trace size after the run: **560,600 bytes**;
- executable ceiling: **2,000,000 bytes**.

This is a deterministic development-machine guard, not a browser/render p95 measurement. The default 2,000-record option is not approved for a live capture experiment: linear extrapolation from this fixture is about 70 MB of JSON before JavaScript object overhead. A future in-match observer must explicitly use `traceLimit: 16`, measure browser frame-time p50/p95/p99 with rendering active, and disable itself if its agreed frame budget is exceeded.

## Exact adoption conditions

A future opt-in read-only match adapter is permitted for an offline development build only when all of these remain true:

1. It is behind an explicit development flag plus the exact workflow-scoped read-only capability.
2. Online and networked workflows remain rejected before any candidate initializes.
3. It attaches only at tick 1, in the first half, with gameplay time at most one fixed tick.
4. It observes immutable legacy before/after snapshots after the legacy tick; Build 173 remains the only writer.
5. All player IDs, full CPU rosters, team ownership, component sets, units, phase maps, coordinate transforms, and configurations are explicit and mapping-locked.
6. Every accepted tick is sequential and preserves exact Movement/Ball boundaries plus monotonic clock continuity.
7. No candidate value, decision, command, launch, possession result, clock, or formation target is projected into live state.
8. `traceLimit` is explicitly 16 for the experiment and trace export is user-triggered rather than performed every frame.
9. Browser-with-rendering performance is measured separately; the adapter must be removable without changing match behavior.
10. The 184-test command below remains completely green on the exact promoted bytes.

An authoritative offline slice additionally requires a new closed-loop authority contract for action/launch ownership, Movement-to-Ball contact and possession, Aerial placement in the tick order, CPU intent-to-Ball handoff, restart/set-piece ordering, substitutions/roster lifecycle, and rollback of the whole authoritative tick. None of that may be inferred from the current read-only comparator.

## Executed gate

Command:

```text
node --test tests/ball-engine-v2.mjs tests/ball-shadow-bridge-v2.mjs tests/cpu-intelligence-v2.mjs tests/movement-engine-v2.mjs tests/formation-behaviour-v2.mjs tests/match-clock-v2.mjs tests/aerial-contact-v2.mjs tests/overhaul-shadow-orchestrator-v2.mjs tests/overhaul-v2-unified-promotion-adversarial.mjs
```

Result: **184 passed, 0 failed, 0 skipped, 0 cancelled** in **832.485 ms**.

Test distribution: Ball 27; Ball Bridge 14; CPU 17; Movement 21; Formation 20; MatchClock 22; Aerial 22; unified orchestrator 22; promotion adversarial 19.

## Reviewed SHA-256 manifest

```text
3f0cfa3793e0b49456c9b8901f112f3749f388276c3276d8334ede59adc8b240  match-engine/ball-engine-v2.js
29381595bf08a3cc3494825e4039bcb88c9d1d6a37f203831658e95714a8527f  match-engine/ball-shadow-bridge-v2.js
4fda88c71a4dffb58b6c98001f6a89f103902c1041e03a9ccbe04a5a3c5fc8a8  match-engine/cpu-intelligence-v2.js
72df57ceaf2eab4d7eae46360a21cd6f1c1d9187d5efeefe2c033ad3d9fa864f  match-engine/movement-engine-v2.js
483dc0e6e4f85c17d247f593fbb8e47b7c754a969fb4681287145d098897708e  match-engine/formation-behaviour-v2.js
281be0604de488a870376cf73c7a3718f8555f868bf0ef423742c1272c03d408  match-engine/match-clock-v2.js
54bf086bef9e0f149f9ed2445454da510fca5908e79aa77d95ba5f70d5e8b1ba  match-engine/aerial-contact-v2.js
dbb2999b245ed49d39fb5efffb67913f08883f6a8bd5278445a294cb773a3733  match-engine/overhaul-shadow-orchestrator-v2.js
a82c52af32c5cfaba4401f5228efb751821aea17464f1de6109d5a9155488935  tests/overhaul-v2-unified-promotion-adversarial.mjs
```
