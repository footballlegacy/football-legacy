# Build 173 shadow capture + adapter V2 post-fix independent review

Status: **GREEN / GO for the exact default-off, offline-only, read-only live
shadow attachment described below.** This is not approval for candidate/live
authority, online use, or any workflow reduction.

Scope: independent composition review of
`match-engine/build173-live-shadow-adapter-v2.js` and
`match-engine/build173-shadow-host-capture-v2.js`. Neither target module nor
`match.html` was edited by this review.

## Former blockers independently closed

1. **No public projection surface.** `toUnifiedSnapshot()` and
   `assertObservation()` remain private implementation helpers and are absent
   from both CommonJS and browser public APIs. Public capture/adapter results
   contain bounded aggregate telemetry only.
2. **Crafted keys/accessors rejected.** Own enumerable `__proto__`,
   `prototype`, and `constructor` properties fail validation before mapping.
   Accessor properties are rejected rather than read repeatedly.
3. **Clock agreement preserved safely.** Host capture accepts the adapter's
   whitelisted `periodAgreement` and `phaseAgreement` booleans directly. Valid
   accepted ticks report `true` without returning candidate/legacy labels.
4. **Presentation errors fail closed.** Presentation-boundary reads execute
   inside capture error handling. A throwing clock getter self-freezes only the
   diagnostic session and does not escape to the legacy update loop.
5. **Derived telemetry remains finite.** Extreme but finite raw velocity values
   cannot retain/export `Infinity`, `NaN`, or JSON `null` comparison values.

## Passing composition gates

- default-off and all declared online/config markers freeze before host data;
- CommonJS/browser loading, exact schemas and read-only flags;
- walkout skip, post-walkout arm, tick-1 epoch, finish-before-walk-in, reset;
- immutable one-capture-per-update sequencing and fractional clock accumulation;
- raw held throw-in apron with exact declared taker and no clamp;
- stable-slot substitutions and duplicate-occupant rejection;
- outfield red-card formation availability and goalkeeper-dismissal freeze;
- record/byte-bounded telemetry for accepted configuration;
- cyclic capture self-freeze; and
- no current `match.html` attachment or live-apply call.

## Test result

Command: the two adapter tests, host-capture test, independent composition
test, orchestrator tests, movement adversaries, ball bridge and formation suite.

Result on reviewed bytes: **154 tests; 154 pass; 0 fail**. The independent
composition file reports **13 tests; 13 pass; 0 fail**. Representative unified
22-player performance remained bounded in the same run (180-tick mean 2.386
ms; retained trace 560600 bytes).

Independent executable artifact:
`tests/build173-shadow-capture-adapter-composition-independent-v2.mjs`.

Reviewed target SHA-256:

- adapter: `b7cbd0f9366c97b966962c2a2c26c16d592cdb46358c0a7eb9e25cd3e60600e5`;
- host capture: `c6556fafdb0caf1877e4b6b78f27bc4784d2dff5cfcee21b501849db96ea16c5`.

## Safe attachment constraints

- default off; parse exact `v2Shadow=1` before synchronously loading the frozen
  dependency chain; refuse any online URL/config/controller/decoded marker;
- instantiate inside a startup `try/catch`; any diagnostic failure freezes only
  shadow and never interrupts Build 173;
- do not arm at `focusGame()` return: skip tunnel/walkout, arm only immediately
  after the real on-pitch `kickoff('you')`, and begin tick 1 on the next update;
- around the sole fixed-tick `update()`, capture immutable before, run the
  unchanged authoritative update, capture after, then observe; choose the
  direct legacy update function once when disabled to avoid per-frame cost;
- allow only the exact held `THROW IN` taker/ball apron and never clamp;
- finish before full-time presentation/walk-in; reset only for a true new match
  or explicit suite/self-test epoch, with a fresh epoch ID; and
- expose only bounded aggregate telemetry; never return or assign a mapped,
  candidate, projection, command, force, state, or apply surface.
