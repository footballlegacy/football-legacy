# Pre-promotion regression audit — 2026-08-12

Point-in-time execution: 2026-08-12 02:05 BST. Runtime:
`/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node`.

## Outcome

- Executed Node test cases: **547**.
- Passed: **545**.
- Failed: **2**.
- Functional/workflow failures: **0**.
- The only two executed failures are exact SHA-256 pin assertions in
  `tests/overhaul-foundation.mjs` while `match-engine/match.html` is being
  changed by the unfinished live-authority promotion work.
- No test was weakened, skipped inside an executed command, or repaired during
  this audit. No gameplay, adapter, Quick Play, online or career file was
  edited.

## Executed commands and exact results

### 1. Quick Play, Madrid BBC, original names and Player Career

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/quick-play-fl-v2-engine-selection.mjs tests/historic-real-madrid-bbc.mjs tests/original-names.test.mjs tests/player-career.test.mjs tests/player-career-links.test.mjs
```

Result: exit 0; **27/27 passed**; 0 failed; duration 1944.100 ms.

This includes Build 173 default authority, explicit offline Single Player FL V2
selection, mode fallback, Online freeze, deterministic seed/payload transport,
all existing Quick Play routes, exact Madrid BBC data, original names, Player
Career links and Player Career simulation branches.

### 2. Online connection, controller, lobby and quality

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/online-connection-gate.mjs tests/online-controller-hotfix.mjs tests/online-lobby-sync.mjs tests/online-quality-stability.mjs
```

Result: exit 0; **4/4 wrapper tests passed**; 0 failed; duration 217.956 ms.

The wrapper outputs also reported:

- connection gate: Home/Away wait for DataConnection open;
- controller hotfix: **13/13 checks passed**;
- lobby sync: **85/85 checks passed**;
- quality/stability: **23/23 checks passed**.

### 3. Offside, replay cleanup, restarts and Set-Piece suites

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/free-kick-replay-queue-removal.mjs tests/live-offside-camera-policy.mjs tests/boundary-restart-v2.mjs tests/restart-presentation-v2.mjs tests/set-piece-coordinate-contract-v2.mjs tests/set-piece-suite-v2.mjs tests/set-piece-v2-browser-lab.mjs tests/set-piece-v2-browser-lab-independent-adversarial.mjs
```

Result: exit 0; **112/112 passed**; 0 failed; duration 1761.577 ms.

The protected temporary replay-queue removal, permanent replay routes,
assistant-referee/offside sequence, camera ownership, whole-ball laws, restart
handoffs, suite presets, suite export, Ball/Aerial/First-Touch handoffs and
normal/online isolation all passed.

### 4. Frozen V2 modules and adversarial promotion gates

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/ball-engine-v2.mjs tests/ball-aerodynamics-v2-adversarial.mjs tests/ball-shadow-bridge-v2.mjs tests/cpu-intelligence-v2.mjs tests/movement-engine-v2.mjs tests/formation-behaviour-v2.mjs tests/match-clock-v2.mjs tests/aerial-contact-v2.mjs tests/first-touch-v2.mjs tests/first-touch-v2-independent-adversarial.mjs tests/overhaul-foundation.mjs tests/overhaul-v2-cross-engine.mjs tests/overhaul-v2-p2-safety.mjs tests/overhaul-v2-shadow-movement-adversarial.mjs tests/overhaul-shadow-orchestrator-v2.mjs tests/overhaul-v2-unified-promotion-adversarial.mjs
```

Result: exit 1; **276/278 passed**; **2 failed**; duration 980.245 ms.

All Ball, aerodynamics, bridge, CPU, Movement, Formation, MatchClock, Aerial,
First-Touch, cross-engine, P2 safety, movement adversarial, orchestrator and
unified-promotion functional gates passed. The two failures were:

1. `every protected file exists and matches the pinned candidate SHA-256`
   - file reached before assertion stopped: `match-engine/match.html`
   - expected: `b2c97e75c689211d429d3c412db254b26b236ef0af10224e91ed420b2cb6c6e8`
   - actual at test execution: `754ee306288b33c75a0ca56474340fe5420a63b20ea1c23c1c111e39a2fa37d5`
2. `the match-page delta is the dormant load, pinned legacy maintenance and exact-flag read-only shadow`
   - expected normalized delta: `c38c685e61e9665a89399211d5e67a3daa248cdb773139e4931e84bd781d975f`
   - actual at test execution: `96ced7e4abc6e5c67e5e1793b741732d0250fa2d23ca267466e9668f39d2d393`

These are pin drift, not a functional regression result. Because the first
protected-file loop stops at its first mismatch, a separate read-only manifest
comparison was performed after the test run. At that later instant it found
three currently unpinned protected files:

- `match-engine/match.html`: expected
  `b2c97e75c689211d429d3c412db254b26b236ef0af10224e91ed420b2cb6c6e8`;
  then-current
  `499ddc7dd7aa62a6aaa0c6f7323ad8d87320dcc8a8f193edb0c7e6f2e07165ff`;
- `quick-play/index.html`: expected
  `6732f88581b00dfb5651d3bdfae4bc440b7891c3763b9b8e13e482a4fe04fef1`;
  current
  `108193229d7d5c1ad35176164c5f5affb827c8b3be2743894afe414d3d04ac1b`;
- `quick-play/app.js`: expected
  `eacee9cf9fd9d22631d6534ef74f371ed147175a95ec626151637c4223186f18`;
  current
  `cac843b6269d52281ede4e0cc375684c590140ceb4a4560462ad6654251a7497`.

The match page continued changing between the test and the comparison, so its
two actual hashes intentionally differ. No manifest pin was updated here.

### 5. Legacy ball-physics evidence/kernel and controller logger

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/ball-physics-engine.mjs tests/ball-physics-captures.mjs tests/ball-physics-sync-manifest.mjs tests/controller-input-logger.mjs
```

Result: exit 0; **38/38 passed**; 0 failed; duration 673.937 ms.

### 6. Sealed Offline V2 authority, playable slice and coexistence labs

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/offline-v2-authority-kernel-candidate.mjs tests/offline-v2-first-touch-coexistence.mjs tests/offline-v2-first-touch-integration-adversarial.mjs tests/offline-v2-first-touch-integration-independent-adversarial.mjs tests/offline-v2-playable-slice.mjs tests/offline-v2-playable-slice-cpu-independent-adversarial.mjs tests/offline-v2-vertical-slice-lab.mjs
```

Result: exit 0; **86/86 passed**; 0 failed; duration 5319.695 ms.

This includes deterministic export/restore/replay/chunking, CPU pass/carry/shot,
the CPU defensive Movement loop already represented by the sealed candidate,
offside fallibility, transition phases, tackles, goals, boundary/restart laws,
Set-Piece and First-Touch integration, browser dependency order and normal/
online isolation.

### 7. Deferred Create-a-Club gate

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/create-club-career.test.mjs
```

Result: exit 0; **2/2 passed**; 0 failed; duration 99289.820 ms.

The lightweight form check passed immediately. The intentionally heavy
grassroots/professional career construction and rendering test completed in
99.209 seconds within its declared 120-second allowance.

## Deliberate exclusions

### Career-world integrity generator

`tests/career-world-integrity.mjs` was not run. It is not read-only: lines
398–399 overwrite `tests/career-world-integrity-report.json`, including a new
wall-clock `generatedAt` value. Its last saved machine report (2026-08-11
23:23 BST) already records the known current baseline of **4 errors, 0
warnings**:

- missing-fixture recovery failed in 1888;
- missing-fixture recovery failed in 1950;
- missing-fixture recovery failed in 2000;
- missing-fixture recovery failed in 2026.

This audit neither regenerated nor altered that evidence file.

### Unfinished live-authority-specific suites

The following evolving attachment/adapter tests were intentionally excluded so
this sweep did not sample half-written live-authority bytes:

- `build173-live-shadow-adapter-v2.mjs` and its independent adversarial suite;
- `build173-live-shadow-hook-v2.mjs` and its independent adversarial suite;
- `build173-shadow-host-capture-v2.mjs`;
- `build173-shadow-capture-adapter-composition-independent-v2.mjs`;
- `first-touch-authority-adapter-v2.mjs` and its independent adversarial suite.

They require their own final promotion run after the live adapter and match-page
integration bytes are frozen.

## Promotion reading

At this checkpoint every executed functional/workflow test passed. Promotion is
not yet pin-clean: the foundation manifest and allowed match-page delta must be
reviewed and intentionally resealed only after the concurrent Quick Play and
live-authority changes stop moving. The excluded live-authority suites and the
known career-world fixture-recovery baseline remain separate final-review
items; this report does not waive either.
