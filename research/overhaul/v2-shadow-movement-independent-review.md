# Independent promotion review: dormant shadow bridge and movement engine v2

Date: 2026-08-11
Review scope: `match-engine/ball-shadow-bridge-v2.js`, `match-engine/movement-engine-v2.js`, their existing tests and contract, plus an independent adversarial suite.
Reviewed bridge SHA-256: `29381595bf08a3cc3494825e4039bcb88c9d1d6a37f203831658e95714a8527f`
Reviewed movement SHA-256: `72df57ceaf2eab4d7eae46360a21cd6f1c1d9187d5efeefe2c033ad3d9fa864f`

## Verdict

**GREEN for the dormant foundation and progression to a read-only shadow-adapter stage; NOT approval for live authority.** There is no current live-authority leak: `match-engine/match.html` neither loads nor calls the ball engine v2, shadow bridge v2 or movement engine v2. Build 173 remains the sole live gameplay authority, online remains on the legacy authority path, and no existing workflow was removed, rerouted or reduced.

The bridge defects reproduced earlier in this review and all four independently reproduced movement defects are corrected against the hashes above. Reserved provenance is bridge-owned, incomplete legacy mapping blocks candidate output, implicit command identity is batching-invariant, duplicates are rejected, every physical phase lasts at least one tick, busy physical-action retriggers are rejected explicitly, and malformed coordinate objects no longer become role metadata.

## Executable evidence

Bundled Node was used for both runs.

- Existing bridge and movement suites: **35/35 PASS**.
- Independent suite `tests/overhaul-v2-shadow-movement-adversarial.mjs`: **13/13 PASS**.
- Combined reviewed evidence: **48/48 PASS, 0 FAIL**.
- Independent gates cover CommonJS/browser coexistence, static live-authority absence, online legacy freeze, shadow reset/replay determinism, bridge provenance, incomplete-mapping refusal, explicit- and implicit-ID chunk invariance, duplicate-ID rejection, minimum physical-action visibility, busy-action lifecycle closure, unique-ID input-order invariance and player-order-invariant separation.

## Resolved P1 findings

1. **Implicit command identity is now delivery-batching invariant.** `normalizeCommand` derives implicit identity from command type, player and authoritative tick, without caller array position (`match-engine/movement-engine-v2.js:302-328`). The full-timeline versus incremental-delivery gate is green: `tests/overhaul-v2-shadow-movement-adversarial.mjs:216`.

2. **Duplicate command ids are now rejected before sorting or stepping.** `advance` rejects the second occurrence deterministically (`match-engine/movement-engine-v2.js:756-762`). The caller-order ambiguity gate is green: `tests/overhaul-v2-shadow-movement-adversarial.mjs:240`.

3. **Every physical-action phase now lasts at least one authoritative tick.** Zero overrides are clamped to the smallest valid phase (`match-engine/movement-engine-v2.js:125-144`), so an acknowledged action cannot disappear in its acknowledgement tick. The visibility gate is green: `tests/overhaul-v2-shadow-movement-adversarial.mjs:251`.

4. **Physical-action retriggers now receive an explicit busy rejection.** The active action is retained, while command-ack and action telemetry identify the rejected command, reason and active command (`match-engine/movement-engine-v2.js:339-355`). The exactly-one-terminal-result gate is green: `tests/overhaul-v2-shadow-movement-adversarial.mjs:269`.

## Current safety properties verified

- Bridge default is legacy; unknown modes normalize to legacy (`match-engine/ball-shadow-bridge-v2.js:134-157`).
- `online: true` or workflow `online` forces legacy and disables shadow/candidate authority (`match-engine/ball-shadow-bridge-v2.js:138-155`).
- Candidate authority requires an exact workflow-scoped acknowledgement object (`match-engine/ball-shadow-bridge-v2.js:106-131`). This is an explicit internal consent token, not a security secret.
- Shadow output never applies to live state; observations require sequential fixed outer ticks and reset/replay is deterministic.
- Bridge mapping provenance is written after caller metadata and mapping status is retained outside caller-controlled state (`match-engine/ball-shadow-bridge-v2.js:231-240`, `304-370`). Incomplete mapping now blocks candidate output (`match-engine/ball-shadow-bridge-v2.js:410-421`). Legacy-only `spin`, `dip` and `curveAccel` are neutralized rather than inherited in candidate projection (`match-engine/ball-shadow-bridge-v2.js:245-269`).
- Movement is fixed-tick, synchronous, JSON-safe, input-pure and contains no random, wall-clock or presentation-clock dependency in the reviewed code.
- Command identity is stable across delivery chunking, duplicate ids fail closed, unique-id command order is stable, physical-action lifecycle phases remain observable, and active-action conflicts emit deterministic rejection telemetry. Player input order is normalized and three-body separation is repeatable.

## Focused contract gaps before any integration

These do not alter the dormant verdict, but integration must not proceed until they are owned explicitly:

- The bridge currently trusts caller-supplied `online` and `workflow` classification. A future live adapter must derive both from the established authoritative match state, fail closed, and retain an unconditional kill switch.
- Movement has no authority resolver or read-only shadow adapter of its own. Its safety today comes from absence from `match.html`; loading it later must not itself grant state-write authority.
- The adapter should still provide authoritative stable command ids and propagate duplicate/busy rejections. The deterministic implicit fallback intentionally collides for multiple same-player, same-type, same-tick commands, so valid multi-command cases require adapter-owned sequencing rather than caller array order.
- Preserve the reviewed minimum-one-tick physical phases and command/action rejection telemetry at the adapter boundary; do not hide or rewrite them as acceptance.

## Bounded P2 follow-ups

- An invalid explicit `targetId` silently falls back to the nearest opponent (`match-engine/movement-engine-v2.js:527-535`). The adapter contract should choose explicit rejection or explicitly documented fallback.
- `isCompleteWorldState` is shallow and does not validate bounds, unique ids, ball-owner references, action/control internals or normalized facing (`match-engine/movement-engine-v2.js:282-290`). It should not be treated as an integration-grade restore validator.
- Configuration validates finiteness/positivity for selected values but not every useful ordering/range relationship (for example minimum versus maximum families). Add validation before allowing external tuning data.

## Remaining gates before shadow/live integration

1. This green review permits only the next read-only shadow-adapter stage; candidate output is not approved to write live match state.
2. Add a read-only movement adapter with authoritative match-state workflow/online derivation, an unconditional kill switch, authoritative tick/state provenance, stable command sequencing, bounded telemetry and reset/replay golden tests.
3. Keep the reviewed **48/48** bridge, movement and independent gates green.
4. Re-run ball, CPU, movement, bridge and cross-engine coexistence suites together under the bundled runtime before landing the adapter.
5. Reconfirm that `match.html` has not acquired candidate imports/calls and that no online, offline, co-op, replay, set-piece or career workflow changed.
6. Live authority requires a later, separately approved staged rollout with legacy parity and rollback gates; it is outside this review.

## Evidence classification

“Verified” above means direct source inspection or an executable deterministic test against the reviewed hashes recorded above. “Required before integration” is a design/promotion condition derived from the current authority contracts. This review makes no claim of live play quality, FIFA equivalence or production readiness.
