# Football Legacy Build 174 release checklist

Audited: 12 August 2026. This is a release allow-list, not permission to delete anything outside it.

## Release route confirmed

- Local release branch: `agent/fl-v2-playtest` at Build 173 baseline `3a2c620` (`origin/main`). It currently has no upstream branch.
- Remote: `https://github.com/footballlegacy/football-legacy.git`; remote default branch is `main`.
- The public root, Quick Play and match-engine assets are currently byte-for-byte identical to `origin/main`. No tracked `.github` deployment workflow exists, so merging the release into `main` is the observed GitHub Pages publication trigger.
- Public endpoints are live: `https://footballlegacy.github.io/football-legacy/`, `/quick-play/`, and `/match-engine/match.html` all return HTTP 200.
- GitHub Pages currently sends `Cache-Control: max-age=600`. Verify the release with a unique query string and allow up to ten minutes for an edge cache to expire.
- `git push --dry-run origin HEAD:refs/heads/agent/fl-v2-playtest` succeeds through the macOS keychain. Branch push is therefore available.
- `gh` 2.97.0 is installed, but `gh auth status` reports an invalid token for `joshtoucanlearn`. Use the connected GitHub app to create the draft pull request, or re-authenticate `gh`; do not call a pushed branch “published” until it is merged to `main` and the public bytes are verified.
- Repository-local `user.name` and `user.email` are unset. Set the intended author identity before committing.

## Exact public runtime allow-list

Stage these tracked entry-point changes explicitly after the runtime freezes:

- `quick-play/index.html`
- `quick-play/app.js`
- `quick-play/styles.css`
- `quick-play/historic-playtest-squads.js`
- `match-engine/match.html`

Stage every new file loaded by those entry points. Omitting any one would create a public 404 or force Build 173 fallback:

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
- Match control and set pieces: `tests/match-clock-v2.mjs`, `tests/restart-presentation-v2.mjs`, `tests/set-piece-coordinate-contract-v2.mjs`, `tests/set-piece-suite-v2.mjs`, `tests/live-v2-match-control-composition.mjs`, `tests/live-v2-match-control-independent-adversarial.mjs`.
- Live selection/integration: `tests/quick-play-fl-v2-engine-selection.mjs`, `tests/quick-play-live-v2-independent-adversarial.mjs`, `tests/overhaul-foundation.mjs`, `tests/overhaul-v2-cross-engine.mjs`, `tests/overhaul-v2-unified-promotion-adversarial.mjs`.
- Gameplay preservation: `tests/free-kick-replay-queue-removal.mjs`, `tests/live-offside-camera-policy.mjs`, `tests/historic-real-madrid-bbc.mjs`.
- Preserved public workflows: the existing Online connection, controller, lobby and quality gates, plus original-name, Player Career link and Create-a-Club gates. Do not regenerate `tests/career-world-integrity-report.json` in this release.
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

## Documentation corrections required before commit

- `README.md` still presents “Build 172 Online quality freeze”. Retitle it for Build 174, add the hosted Quick Play path and the `Gameplay Engine` choice, state that FL V2 is opt-in only for Single Player and Free Kick Practice, and retain the complete Online instructions unchanged.
- `CHANGELOG.md` still says Build 173 “has not been published”, but `origin/main` contains commit `8c90eaf` (`Publish Build 173 offline gameplay`). Correct that historical sentence and add an honest Build 174 section above Build 173 after final gate counts are known.
- `quick-play/README.md` lists only Single Player and Co-op and says the front end does not include the match engine. Update it for the current mode list, engine selector and match-package handoff.
- `match-engine/README.md` still identifies v0.28 and says passing, AI and set pieces are unchanged. Replace the stale status summary without deleting its historical visual-pass record.
- Do not claim the known Arsenal support/pressing shape defect is fixed. Record it as a post-publication P1.

## Final release gates

1. Freeze `match.html`, Quick Play and every runtime module; then update all content hashes/manifests once, after the last code edit.
2. Pass syntax checks and the focused V2, selector, contact, match-control, replay-removal, offside-camera and Real Madrid tests.
3. Pass protected Build 173 routes: default Single Player, Local 2P, same-team co-op, CPU-v-CPU and Online setup/connection remain Build 173; Career, Player Career, Create-a-Club and creation tools still launch.
4. Launch through the real Quick Play UI, not a lab:
   - Single Player + FL V2: visible V2 authority badge, advancing committed ticks, no fallback, controller movement/pass/receive/aerial/tackle/pause/restart, and no console errors.
   - Free Kick Practice + FL V2: suite authority armed, free kick/corner/penalty staging and repeat/reset work, clock/camera rules hold, and no console errors.
   - Unsupported modes requesting FL V2 visibly resolve to Build 173.
5. Review `git diff --cached --stat` and `git diff --cached`; confirm no capture, lab, cache, ZIP, generated career report or private path is staged.
6. Commit on `agent/fl-v2-playtest`, push with upstream, open a draft pull request against `main`, and record the exact checks in the PR body.
7. Merge only after the release gates pass. A branch push or draft PR is not the published game.
8. Verify GitHub Pages with cache-busting URLs. Confirm HTTP 200 for all newly referenced JavaScript files, compare the public `quick-play/app.js`, `quick-play/index.html` and `match-engine/match.html` hashes with the merged `origin/main`, then perform one final public Quick Play launch.

## Current blockers at this audit

- Final runtime bytes and manifests are not frozen yet, so content-hash pins and final gate counts cannot be sealed.
- The actual Quick Play Single Player and Free Kick Practice browser proofs are still required.
- The GitHub CLI token is invalid. This does not block the verified Git push route, but PR creation must use the connected GitHub app or a repaired `gh` login.
- README/CHANGELOG/Quick Play/Match Engine release documentation is stale.
