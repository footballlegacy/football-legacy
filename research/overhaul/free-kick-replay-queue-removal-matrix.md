# Temporary normal-match free-kick replay queue removal matrix

Status: **AUDITED / IMPLEMENTATION GATE RED UNTIL REMOVAL**
Scope: remove only the temporary deferred normal-match queue; preserve all permanent match, replay, practice, Set-Piece Suite, online/co-op, career, and diagnostics workflows.
Live-engine edits in this audit: **none**.

## Evidence and authority

- Build 173 reference: the immutable external Build 173 snapshot identified by the baseline manifest hash (the local acquisition path is intentionally not recorded).
- Reference SHA-256: `8380734db3a142293c5bca2a22f6b6cc9e6a0fa658f9f0c26cce8ad1801cf678`
- The hash matches `research/overhaul/build-173-baseline-manifest.json`.
- Live gameplay authority remains `match-engine/match.html`.
- Build 173 and the current candidate contain the same temporary queue family. The current line numbers below were measured during this audit and may move while other Build 173 work lands; symbol and code anchors are authoritative.

## Removal contract

The temporary system records a normal-match free-kick flight, keeps the package after live play has resumed, and injects that earlier flight replay at a later stoppage, half-time, or full-time. That deferred presentation is the only workflow to remove.

The replacement lifecycle is:

1. Keep free-kick capture while the shot is still eligible for an immediate natural dead-ball outcome or goal replay.
2. Preserve per-attempt capture and replay in `FREE_KICK_PRACTICE`.
3. If normal live play resumes, the capture times out, or a period ends without a qualifying immediate replay, discard the stale package and its matching ball capture ID.
4. Never start an earlier free-kick replay at an unrelated later stoppage or period transition.

A small `discardPendingFreeKickReplay(reason)` helper is the safest replacement because it centralises the two pieces of cleanup: `pendingFreeKickReplay = null` and conditional clearing of `ball.freeKickReplayCaptureId` when it still matches the discarded capture.

## Exact symbol and call-site matrix

| Area | Build 173 anchor/line | Current anchor/line at audit | Required action | Protected successor or reason |
|---|---:|---:|---|---|
| Capture payload | `beginFreeKickReplayCapture`, 1321 | 1330 | Remove queue-only `queuedAt:0`; keep the rest of the payload. | Capture remains necessary for immediate goal/outcome and practice replays. |
| Capture timeout | `recordReplayFrame`, 1336 | 1345 | In `FREE_KICK_PRACTICE`, keep `sealPendingFreeKickReplay`; otherwise call `discardPendingFreeKickReplay('capture-timeout')`. | Practice still needs its per-attempt frames; normal matches must not retain a package for later. |
| Queue presentation | `playCapturedFreeKickReplay`, 1441-1443 | 1450-1452 | Delete the whole function. | `startOutcomeReplay` and `startPracticeFreeKickReplay` remain the valid shot-replay entry points. |
| Stoppage drain | `startQueuedFreeKickReplayAtStoppage`, 1445-1447 | 1454-1456 | Delete the whole function. | Restart and any replay belonging to the actual stoppage proceed normally. |
| Period drain | `startQueuedFreeKickReplayAtPeriodEnd`, 1449-1451 | 1458-1460 | Delete the whole function. | Half-time kickoff and full-time walk-in continue directly. |
| Full-time handoff | `fullTimePresentationUntil`, 4123 | 4153 | Remove the queued replay branch; retain direct `beginFullTimeWalkin(now)`. | Full-time workflow is unchanged except for no unrelated replay injection. |
| Generic stoppage loop | comment plus queue call near 4130-4133 | comment plus `startQueuedFreeKickReplayAtStoppage`, 4159-4163 | Remove the queue-specific comment and call only. | Existing goal, discipline, dive, card-fight, walk-in and restart ordering remains. |
| Half-time handoff | `halfTimeUntil`, 4137 | 4167 | Remove the queued replay branch; retain direct `kickoff('opp')`. | Second-half kickoff remains intact. |
| Half-time capture | `sealPendingFreeKickReplay('half-time')`, 4149 | 4179 | Replace queue-preserving seal with `discardPendingFreeKickReplay('half-time')`. | Prevent stale carry-over; do not alter clock or presentation. |
| Full-time capture | `sealPendingFreeKickReplay('full-time')`, 4151 | 4181 | Replace queue-preserving seal with `discardPendingFreeKickReplay('full-time')`. | Prevent stale carry-over; do not alter result/presentation. |
| Live-play resolution | `keeper-catch-live` outcome block, 4361 | 4392-4393 | Keep outcome classification. In practice, seal for its attempt replay; in a normal match, discard with the computed `outcome`. | Immediate natural dead-ball paths occur earlier and remain protected. |
| Queue-only debug seed | `seedDebugFreeKickReplay`, 6279-6280 | 6332-6333 | Delete. | It exists only to manufacture deferred queue packages. |
| Queue-only restart signatures | `heldRestartDebugSignature` and `compareHeldRestartDebug`, 6282-6287 | 6335-6340 | Delete. | Do **not** remove generic `captureHeldRestartState` / `restoreHeldRestartState`. |
| Queue-only restart test | `debugQueuedReplayForRestart`, 6289-6290 | 6342-6343 | Delete. | Generic replay-director and restart tests remain. |
| Queue-only period test | `debugQueuedReplayForPeriod`, 6292-6293 | 6345-6346 | Delete. | Period lifecycle remains covered separately. |
| Queue-only aggregate test | `debugFreeKickReplayQueue`, 6295-6297 | 6348-6350 | Delete. | Replaced by the source-level no-queue regression gate. |
| Public debug API | `debugFreeKickReplayQueue` export, 6448 | 6503 | Remove this property only. | Keep `debugReplayDirector` and all other debug/playtest exports. |
| Match config | free-kick `replay` object, 6658 | 6713 | Remove `liveBallPolicy:'queue-until-next-stoppage'`, `stoppageReplayPrecedence:'later-stoppage-own-replay-first'`, and queue-specific `restartRestoration`. | Keep capture, camera angles, slow-motion speeds and `deadBallOnly`. Optional explicit replacement: `normalMatchPolicy:'natural-dead-ball-outcomes-only-no-deferred-queue'`, `practicePolicy:'per-attempt-replay'`. |
| Browser self-test | `const freeKickReplayQueue=...`, 6874 | 6929 | Delete this whole queue assertion only. | Keep the preceding generic `replayDirector` assertion and all other engine checks. |

### Queue vocabulary that must reach zero occurrences

`playCapturedFreeKickReplay`, `startQueuedFreeKickReplayAtStoppage`, `startQueuedFreeKickReplayAtPeriodEnd`, `seedDebugFreeKickReplay`, `heldRestartDebugSignature`, `compareHeldRestartDebug`, `debugQueuedReplayForRestart`, `debugQueuedReplayForPeriod`, `debugFreeKickReplayQueue`, `queuedAt`, `free-kick-replay-queue`, `queued-next-stoppage`, `queue-until-next-stoppage`, `later-stoppage-own-replay-first`, `stoppageReplayPrecedence`, `queuedBehindRestart`, `EARLIER FREE-KICK FLIGHT REPLAY`, `temporaryPlaytestFrequency`, `queuedReplaySecond`, and `periodEndDrain`.

## Permanent functionality that must remain

| Protected workflow | Required symbols/routes | Why it is not the temporary queue |
|---|---|---|
| Free-kick goal replay | `REPLAY_PRESENTATION_PROFILES['free-kick-goal-replay']`, `score`, `sealPendingFreeKickReplay('goal')`, `startGoalReplay` | Immediate presentation of the goal just scored. |
| Free-kick miss/save/touchline replay | `REPLAY_PRESENTATION_PROFILES['free-kick-shot-replay']`, `startOutcomeReplay`, `free-kick-touchline-out`, `missed-shot`, `save-to-corner` | Immediate presentation while the ball is naturally dead, before its own restart. |
| Free-kick practice replay | `FREE_KICK_PRACTICE`, `startPracticeFreeKickReplay`, `queuePracticeBallReturn`, practice goal/wide/touchline/completed-at-rest routes | Per-attempt Set-Piece Suite precursor; no unrelated later stoppage. |
| Shared capture support | `pendingFreeKickReplay`, `freeKickReplayCaptureSequence`, `appendPendingFreeKickFrame`, `beginFreeKickReplayCapture`, `sealPendingFreeKickReplay`, `currentBallCarriesFreeKickReplay`, `consumePendingFreeKickReplay` | Used by the three valid replay paths above. |
| Generic replay restoration | `captureRestartFootballerState`, `restoreRestartFootballerState`, `captureHeldRestartState`, `restoreHeldRestartState` | Shared by all discipline/outcome replays, not queue-specific. |
| Generic replay director | `debugReplayDirector`, replay profiles/cameras/skip controls | Permanent replay workflow and browser self-test. |
| Dormant Set-Piece Suite V2 | `match-engine/set-piece-suite-v2.js`, presets, activation, scenario staging, contacts/outcomes, export/copy APIs | Separate dormant/opt-in capability; it is not loaded by `match.html`. |
| Product workflows | Every entry in `research/overhaul/protected-workflows.json` | Removal policy stays false; single-player, local/co-op, online, match lifecycle, career and creation surfaces remain protected. |

## Regression gate

Run with the bundled Node runtime:

```text
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/free-kick-replay-queue-removal.mjs
```

The gate contains six independent checks:

1. Build 173 provenance.
2. Zero temporary queue symbols, policies, labels, events, debug exports or self-tests.
3. Queue-free capture cleanup at timeout, live resolution, half-time and full-time, while practice still seals its attempt.
4. Immediate dead-ball, goal, practice, held-restart and generic replay-director retention.
5. Dormant Set-Piece Suite API/presets/export retention and normal-match isolation.
6. Full protected-workflow matrix retention.

Current expected state before implementation: **4 pass / 2 fail**. Only checks 2 and 3 are red. This is deliberate: the gate documents the implementation boundary and must turn **6/6 green** after removal.

## Definition of green

- The focused gate is 6/6.
- Existing Set-Piece Suite gates remain green.
- The engine's complete browser/self-test gate remains green after removing only its obsolete queue assertion.
- A normal-match free-kick can still produce its immediate goal or natural dead-ball replay.
- Free-kick practice still replays every eligible attempt before returning the ball.
- No earlier free-kick replay appears at a later restart, half-time or full-time.
- Every protected product workflow remains present. No workflow is reduced.
