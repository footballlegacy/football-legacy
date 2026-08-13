# Football Legacy Build 174 release checklist

Audited: 13 August 2026. This is a release allow-list, not permission to delete anything outside it.

## Release route confirmed

- Candidate-3 closure began on `agent/fl-v2-playtest` from `435a5ff`. Published `origin/main` is merge `9668f52`, containing candidate 2 plus its evidence-sanitization follow-up. This checklist curates the subsequent candidate-3 closure batch; publication remains pending.
- Remote: `https://github.com/footballlegacy/football-legacy.git`; remote default branch is `main`.
- At the release-route audit, the public root, Quick Play and match-engine assets were byte-for-byte identical to `origin/main`. No tracked `.github` deployment workflow exists, so merging a later release into `main` remains the observed GitHub Pages publication trigger; re-verify public bytes after this closure batch is merged.
- Public endpoints are live: `https://footballlegacy.github.io/football-legacy/`, `/quick-play/`, and `/match-engine/match.html` all return HTTP 200.
- GitHub Pages currently sends `Cache-Control: max-age=600`. Verify the release with a unique query string and allow up to ten minutes for an edge cache to expire.
- `git push --dry-run origin HEAD:refs/heads/agent/fl-v2-playtest` succeeds through the macOS keychain. Branch push is therefore available.
- `gh` 2.97.0 is installed, but `gh auth status` reports an invalid token for `joshtoucanlearn`. Use the connected GitHub app to create the draft pull request, or re-authenticate `gh`; do not call a pushed branch “published” until it is merged to `main` and the public bytes are verified.
- Repository-local commit identity matches the preceding Build 173 and Build 174 release commits.

## Exact public runtime allow-list

Stage these tracked entry-point changes explicitly after the runtime freezes:

- `quick-play/index.html`
- `quick-play/app.js`
- `quick-play/styles.css`
- `quick-play/historic-playtest-squads.js`
- `match-engine/match.html`
- `controller-ui.js` (reconnect-safe input transport only)
- `online/app.js` and `online/index.html` (matching reconnect-safe input bridge
  and cache keys; Online gameplay authority remains Build 173)

Stage every new file loaded by those entry points. Omitting any one would create a public 404 and must trigger the blocking FL V2 diagnostic rather than legacy continuation:

- `match-engine/ball-physics.js` (unconditional compatibility kernel)
- `match-engine/ball-engine-v2.js`
- `match-engine/movement-engine-v2.js`
- `match-engine/cpu-intelligence-v2.js`
- `match-engine/formation-behaviour-v2.js`
- `match-engine/first-touch-v2.js`
- `match-engine/first-touch-authority-adapter-v2.js`
- `match-engine/aerial-contact-v2.js`
- `match-engine/live-v2-contact-authority-composer.js`
- `match-engine/match-clock-v2.js`
- `match-engine/restart-presentation-v2.js`
- `match-engine/set-piece-coordinate-contract-v2.js`
- `match-engine/set-piece-suite-v2.js`
- `match-engine/live-v2-match-control-composition.js`
- `match-engine/dribbling-state-v2.js`
- `match-engine/instant-replay-review-v2.js`
- `match-engine/playtest-full-state-replay-v1.js`
- `match-engine/live-v2-authority-adapter.js`

The public match page still exposes the exact-flag, read-only `v2Shadow=1` diagnostic workflow. To preserve that existing workflow without 404s, also stage its directly referenced dependencies:

- `match-engine/ball-shadow-bridge-v2.js`
- `match-engine/overhaul-shadow-orchestrator-v2.js`
- `match-engine/build173-live-shadow-adapter-v2.js`
- `match-engine/build173-shadow-host-capture-v2.js`
- `match-engine/build173-live-shadow-hook-v2.js`

Do not use `git add -A`; the worktree contains unrelated research captures and unfinished labs.

## Release evidence to stage

Stage the final, corrected release gates and their direct fixtures:

- V2 engines: `tests/ball-engine-v2.mjs`, `tests/ball-aerodynamics-v2-adversarial.mjs`, `tests/movement-engine-v2.mjs`, `tests/cpu-intelligence-v2.mjs`, `tests/formation-behaviour-v2.mjs`.
- Touch/contact: `tests/first-touch-v2.mjs`, `tests/first-touch-v2-independent-adversarial.mjs`, `tests/first-touch-authority-adapter-v2.mjs`, `tests/first-touch-authority-adapter-independent-adversarial-v2.mjs`, `tests/aerial-contact-v2.mjs`, `tests/live-v2-contact-authority-composer.mjs`, `tests/live-v2-contact-independent-adversarial.mjs`.
- Dribbling and pause review: `tests/dribbling-state-v2.mjs`,
  `tests/dribbling-state-v2-independent-adversarial.mjs`,
  `tests/live-v2-dribbling-authority-integration.mjs`,
  `tests/live-v2-dribbling-host-seam-adversarial.mjs`,
  `tests/live-v2-dribbling-independent-live-review.mjs` and
  `tests/instant-replay-review-v2.mjs`.
- Match control and set pieces: `tests/match-clock-v2.mjs`, `tests/restart-presentation-v2.mjs`, `tests/set-piece-coordinate-contract-v2.mjs`, `tests/set-piece-suite-v2.mjs`, `tests/live-v2-match-control-composition.mjs`, `tests/live-v2-match-control-independent-adversarial.mjs`.
- Live selection/integration: `tests/quick-play-fl-v2-engine-selection.mjs`,
  `tests/cpu-v-cpu-live-v2-authority.mjs`,
  `tests/quick-play-live-v2-independent-adversarial.mjs`,
  `tests/overhaul-foundation.mjs`, `tests/overhaul-v2-cross-engine.mjs`,
  `tests/overhaul-v2-unified-promotion-adversarial.mjs`.
- Gameplay preservation: `tests/free-kick-replay-queue-removal.mjs`,
  `tests/live-offside-camera-policy.mjs`, `tests/historic-real-madrid-bbc.mjs`,
  `tests/historic-conte-chelsea-fifa18.mjs`,
  `tests/historic-invincibles-fifa05.mjs`,
  `tests/human-control-v2-recovery.mjs`,
  `tests/human-normal-x-pass-acceptance.mjs`,
  `tests/human-normal-x-rendezvous-v2.mjs`,
  `tests/human-through-pass-golden-sequence.mjs`,
  `tests/v2-aerial-service-trajectory.mjs`,
  `tests/contact-gesture-presentation-v2.mjs`,
  `tests/human-aerial-finish-and-free-kick-input-authority.mjs`,
  `tests/human-free-kick-ground-channel-authority.mjs`,
  `tests/playtest-free-kick-staging-closure.mjs`,
  `tests/playtest-shot-knockon-authority.mjs`,
  `tests/playtest-slide-discipline-closure.mjs`,
  `tests/playtest-full-state-replay-v1.mjs`,
  `tests/set-piece-camera-replay-integration.mjs` and the current
  playtest-contact/restart/replay/performance regression files.
- Preserved public workflows: the existing Online connection, controller, lobby
  and quality gates, the reconnect-specific
  `tests/controller-reconnect-and-quick-play-launch.mjs` and
  `tests/online-controller-hotfix.mjs` gates, plus original-name, Player Career
  link and Create-a-Club gates. Do not regenerate
  `tests/career-world-integrity-report.json` in this release.
- Shadow diagnostic preservation: the shadow tests and `tests/fixtures/build173-*.mjs` files whose five shadow runtime modules are included above.

Stage the final contracts and frozen manifests that describe the shipped authority boundary:

- `OVERHAUL-FOUNDATION-WORKFLOW.md`
- `research/overhaul/protected-workflows.json`
- `research/overhaul/build-173-baseline-manifest.json`
- The contracts/reviews corresponding to each staged V2 runtime module.
- This checklist.

Before staging research, remove or generalise absolute local paths. At audit time these two overhaul notes contain private machine paths and must not be published unchanged:

- `research/overhaul/free-kick-replay-queue-removal-matrix.md`
- `research/overhaul/offline-v2-first-touch-integration-independent-review.md`

## Explicitly excluded from the Build 174 public commit

Keep these files locally; do not delete them and do not silently publish them:

- `research/ball-physics/captures/fifa20-two-match-20260811/raw/dualsense-trace.jsonl` (about 13 MB).
- Generated input ledgers under `research/ball-physics/captures/fifa20-two-match-20260811/input-audit/` (about 1.6 MB combined).
- Any research artifact containing `/Users/...`, `/var/folders/...`, `file://...`, or another machine-specific path until sanitised.
- Unfinished public lab pages and their browser glue: `match-engine/offline-v2-playable-slice-*`, `match-engine/offline-v2-vertical-slice-lab.js`, and `match-engine/set-piece-v2-browser-lab-*`.
- Non-authoritative candidates not referenced by the shipped match page: `match-engine/offline-v2-authority-kernel-candidate.js` and `match-engine/boundary-restart-v2.js`.
- Controller-capture tooling and exploratory analysis tools unless a separate engineering-evidence commit is intentionally approved.

Exclusion from this release is not removal of a workflow. These artifacts remain in the worktree for later engineering work.

## Documentation state before candidate-3 commit

- Updated on 2026-08-13: `README.md`, `CHANGELOG.md`, `quick-play/README.md`
  and `match-engine/README.md` distinguish published candidate 2 from local
  candidate 3, preserve the exact three FL V2 routes and strict-stop behavior,
  and document the current Cross/A ground, Square aerial and explicit Circle
  aerial-finish controls. Complete Online instructions and historical Build
  172/173 evidence remain intact.
- Do not call the candidate-3 human football closed before the next PC playtest.
- Do not claim Bluetooth controller input is fixed. The reconnect decoder and UI state handling are hardened, but the latest Mac/browser playtest still enumerated a Bluetooth DualSense without receiving gameplay input. USB-C is the verified playtest route.

## Final release gates

1. Freeze `match.html`, Quick Play and every runtime module; then update all content hashes/manifests once, after the last code edit.
2. Pass syntax checks and the focused V2, selector, contact, match-control, replay-removal, offside-camera and Real Madrid tests.
3. Pass protected Build 173 routes: default Single Player, Local 2P, same-team
   co-op, default CPU-v-CPU and Online setup/connection remain Build 173;
   Career, Player Career, Create-a-Club and creation tools still launch.
4. Launch through the real Quick Play UI, not a lab:
   - Single Player + FL V2: visible V2 authority badge, advancing committed ticks, no strict stop, controller movement/pass/receive/aerial/tackle/pause/restart, and no console errors.
   - CPU versus CPU + FL V2: visible CPU-versus-CPU V2 authority badge,
     advancing committed ticks, both teams autonomous, zero human control,
     deterministic seed retained, broadcast CPU restart/penalty camera policy,
     and no strict stop or console errors.
   - Set-Piece Suite + FL V2: suite authority armed, free kick/corner/penalty staging and repeat/reset work, clock/camera rules hold, and no console errors.
   - Force one bounded candidate fault in a test fixture and prove the match freezes behind the export/restart/exit diagnostic without executing a Build 173 gameplay tick.
   - Unsupported modes requesting FL V2 visibly select Build 173 before kickoff.
5. Review `git diff --cached --stat` and `git diff --cached`; confirm no capture, lab, cache, ZIP, generated career report or private path is staged.
6. Commit on `agent/fl-v2-playtest`, push the explicit ref with `git push origin HEAD:refs/heads/agent/fl-v2-playtest` (setting that upstream only if deliberately required), open a draft pull request against `main`, and record the exact checks in the PR body.
7. Merge only after the release gates pass. A branch push or draft PR is not the published game.
8. Verify GitHub Pages with cache-busting URLs. Confirm HTTP 200 for all newly referenced JavaScript files, compare the public `quick-play/app.js`, `quick-play/index.html` and `match-engine/match.html` hashes with the merged `origin/main`, then perform one final public Quick Play launch.

## Current candidate-3 status at this audit

- Runtime bytes are frozen with a cache-only `candidate=3` match marker and the
  one-time `174-fl-v2-final-candidate-3` V2 module token. Unchanged historic
  squads and replay capture retain their candidate-2 URLs. Frozen production
  SHA-256 values are match `7bdb604227a39b2e560dccb23edb8b3e88515f6d957583cba6ad0aa123526d0a`,
  adapter `185340bd57f0fc257ec29babc7cf02c78e23aa8b098d0f151c7a99691d97b3e6`,
  contact composer `15f87890f25012412dff34d1d8f0dcdf44694d14d107b859f260cde3c4e6c10b`,
  Quick Play app `ea0f3569cc8d7555aa2cd0ca263bccf3628b67a0368c9096d39bb28eba8d05a8`
  and Quick Play index `fb97d370eb96ab32d84554da8e925b57211bd3f3032b8c41ef21fc729d1b88d0`.
- Independent review reports no open P0, P1 or P2 in the gameplay batch. The
  current core closure run passes 105/105; the repaired composer/restart pair
  passes 23/23; rollback/replay/match-control/strict-stop coverage passes 50/50.
  Candidate-3 browser smoke passed on 13 August 2026 through the real local
  Quick Play route. Single Player emitted `engine=fl-v2&candidate=3`, reached
  `FL V2 live · Single Player`, and advanced committed ticks; CPU versus CPU
  emitted the same candidate marker, ran both teams autonomously, and advanced
  live V2 ticks; the Set-Piece Suite armed V2, staged a free kick, reached the
  whistle-ready state, completed a shot, and cleared its repeat blocker after
  replay exit. All three routes had empty browser warning/error logs.
- The same smoke initially exposed an unsupported-mode launch-envelope fault:
  Co-op removed the V2 URL marker but still serialized a V2 request, causing a
  strict preflight stop. `launchEngineSelection` now preserves the preference
  only in setup while materializing a clean Build 173 launch envelope. The
  repeated Co-op browser launch contained neither `engine` nor `candidate`, did
  not strict-stop, loaded no V2 badge, and had no browser warning/error logs.
- The final bounded candidate-3 rerun after that browser-found fix passes
  163/163 across the five new direct regressions, through/rendezvous, reaction
  retry, CPU commitment, dribbling, restart/keeper, Quick Play selection,
  protected Build 173, Online, manifest/foundation and frozen-byte gates.
- CPU versus CPU passes 13/15 enforced football-quality gates across four
  60-second simulations: 15 multi-pass chances, 19 three-pass chains, 102
  passes, 34 moving-runner rendezvous, eight interceptions and no strict stop,
  continuity fault or overshoot. The two honest reds are 91.8% completion
  against a 90% ceiling and Mac p95 tick time 15.821 ms against 12 ms. The
  six-tick rejected-pass commitment reduced actual MR evaluations to 690 while
  2,815 identical decisions were safely held. No further tuning is hidden in
  this candidate; PC human playtesting is the next decision gate.
- The GitHub CLI token is invalid. This does not block the verified Git push route, but PR creation must use the connected GitHub app or a repaired `gh` login.
- README, CHANGELOG, Quick Play and Match Engine release summaries now describe the current three-route FL V2 candidate and directional set-piece closure. Historical Build 172/173 evidence is retained rather than rewritten.
