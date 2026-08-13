# Football Legacy Build 174 — Candidate 4 V2-only release checklist

Audited: 13 August 2026. Candidate 4 supersedes the unpublished local Candidate 3 commit `c44b74d`.

## Binding playable-authority decision

- FL V2 is the only playable match authority in the main Football Legacy repository.
- The playable routes are Single Player, CPU versus CPU, and Set-Piece Suite.
- Local two-player, same-team co-op, and Online are visibly unavailable until they have complete V2 authority.
- No public selector, default, malformed URL, cached payload, unsupported mode, or runtime fault may start or fall back to the previous engine.
- A match starts only from an exact Candidate 4 V2 contract. Every other direct or constructed match request strict-stops before the simulation loop.
- Internal Build 173-named host scaffolding, reference hashes, adapters, fixtures, and sentinels remain solely because the live V2 composition and its regression evidence depend on them. They are not playable entry points or fallback authority.
- The separate `footballlegacy/fl-v1.5` forensic archive is not part of this cutover and remains untouched.

The binding policy is `research/overhaul/fl-v2-only-playable-authority-2026-08-13.md`. `research/overhaul/protected-workflows.json` is the machine-readable workflow matrix.

## Public entry-point contract

Publicly playable:

- `/quick-play/?mode=single-player&engine=fl-v2&candidate=4`
- `/quick-play/?mode=spectator&engine=fl-v2&candidate=4`
- `/quick-play/?mode=free-kick-suite&engine=fl-v2&candidate=4`

Unavailable rather than downgraded:

- Co-op / local two-player
- Same-Team Co-op
- Online versus

Entry-point requirements:

- Quick Play displays one fixed `FL V2 · Current` authority label and no engine selector.
- Root navigation exposes only the three V2 routes; unavailable modes are disabled notices.
- Online is a static migration notice with no PeerJS transport, host/join controls, iframe, or match launch.
- `match-engine/index.html` and desktop launchers route through Candidate 4 Quick Play, never a raw legacy match URL.
- The two-player launcher reports that the mode is unavailable.
- An exact match request contains one payload, Candidate 4 query markers, a matching uint32 seed, named teams, an exact controller envelope, and one of the three supported mode contracts.
- `v2Shadow`, Online markers, co-op controllers, missing payloads, duplicate payloads, stale candidates, previous-engine envelopes, and malformed team/controller data all fail closed.

## Candidate 4 cache boundary

- Quick Play application URL: `174-fl-v2-final-candidate-4`.
- Dynamically loaded V2 runtime URL: `174-fl-v2-final-candidate-4`.
- Quick Play writes `engine=fl-v2&candidate=4` to every supported match URL.
- Unchanged historical-squad and replay-export assets retain their previous content tokens; their bytes did not change.
- GitHub Pages previously served `Cache-Control: max-age=600`; public verification must use Candidate 4 URLs and compare bytes after merge.

## Frozen production hashes

The final manifest must match these SHA-256 values after the last edit:

- `match-engine/match.html`: `f37e49a3ada723ece4f09e1641e84625fd5b26cd502d944e6e65609cbee825e8`
- `match-engine/live-v2-authority-adapter.js`: `185340bd57f0fc257ec29babc7cf02c78e23aa8b098d0f151c7a99691d97b3e6`
- `match-engine/live-v2-contact-authority-composer.js`: `15f87890f25012412dff34d1d8f0dcdf44694d14d107b859f260cde3c4e6c10b`
- `quick-play/app.js`: `06090e804060265a6df5656e55242d3bc75cbe908664e05e92ce1ba9b1d8c537`
- `quick-play/index.html`: `22ef3a563ae1015e2ab4a5a430b6d20254122bd9ed6024e3216c594a66666b1c`
- `quick-play/styles.css`: `ed49a7f9f80f876373c38feafa1599b3a1248faa513b39d67788f5221fc53532`
- `index.html`: `879f9e28f5c864a73bf7c0c85337bcbe51ca4319e59cfea6ecdf0e1718348a75`
- `styles.css`: `a60b5b114ce5d41ddd4d54717dce27ce51ba5bea0fedf14e11d42da2010e40b4`
- `online/index.html`: `2a69791287542fecd17b936f744101973a14b35080ac01e442fab757d0f652d9`
- `match-engine/index.html`: `c4d1cfe418494852e4fe9782d57834776b3bfdb9f6dfa3d4aa51b5f1b3d125f5`

`research/overhaul/build-173-baseline-manifest.json` must validate every protected current byte while preserving baseline hashes as provenance.

## Verification gates

Required automated evidence:

1. V2-only public-entry scan: no selectable/default/fallback previous engine and no raw playable match link.
2. Exact-match preflight: supported contracts arm; every missing, stale, malformed, unsupported, shadow, Online, co-op, or prior-engine contract stops before animation/simulation.
3. Quick Play selection and launch: supported modes always resolve to V2 Candidate 4; unsupported modes cannot materialize a launch payload.
4. Root/launcher/Online gates: V2 routes only; unavailable modes remain inert.
5. Foundation/manifest and frozen-byte gates.
6. Single Player, CPU versus CPU, and Set-Piece Suite live-authority tests.
7. Passing, rendezvous, aerial, restart, free-kick, contact, discipline, dribbling, replay, match-control, movement, Ball V2, First Touch, and deterministic checkpoint regressions.
8. Inline match scripts and changed standalone JavaScript parse cleanly.
9. Browser smoke through the real Quick Play UI for all three routes, plus unsupported-mode and direct-invalid-link fail-closed checks.

Candidate 3 gameplay evidence remains applicable where no gameplay bytes changed: the bounded closure tests were green, and the four-seed CPU characterization passed 13/15 quality gates. It produced 102 passes, 19 three-pass chains, 15 multi-pass chances, 34 moving-runner rendezvous, eight interceptions, and no strict stop, continuity failure, or overshoot. The two honest warnings remain: 91.8% completion exceeded the 90% ceiling, and Mac p95 tick time was 15.821 ms against a 12 ms target. Candidate 4 changes the playable boundary and public surfaces, not those CPU gameplay decisions.

## Curated commit boundary

Stage only the reviewed Candidate 4 authority, public-entry, manifest, documentation, and test files. Do not use `git add -A`.

Must remain unstaged:

- `tests/career-world-integrity-report.json`
- raw ball-physics captures and generated input ledgers
- unfinished offline V2 labs and browser labs
- Golden reconstruction/viewer experiments
- non-authoritative authority-kernel/boundary candidates
- local analysis tools and any research containing private machine paths

Before commit:

- inspect `git diff --cached --stat` and the full staged diff;
- verify no staged file has an unstaged overlap;
- scan staged additions for secrets, private paths, temporary paths, captures, archives, binary/media payloads, and oversized data;
- rerun `git diff --cached --check`;
- confirm the generated career report remains outside the index.

## Publication route

- Local branch: `agent/fl-v2-playtest`.
- Push explicitly with `git push origin HEAD:refs/heads/agent/fl-v2-playtest`; do not use its stale configured upstream.
- Open a pull request against `main`, record the exact Candidate 4 evidence, review the immutable PR delta, then merge.
- A local commit, branch push, or pull request is not publication. GitHub Pages is published only after merge to `main` and public-byte verification.
- After merge, verify HTTP 200 and SHA-256 equality for root, Quick Play, match page, V2 adapter/composer, and every newly referenced asset. Then run a final public Single Player launch using the Candidate 4 link.
- The GitHub CLI token was invalid at the last audit. Normal HTTPS push used the macOS credential path; PR creation/merge can use the signed-in GitHub browser if CLI authentication remains unavailable.

## Current status

- Candidate 4 V2-only production and public-entry changes are local and unpublished.
- Candidate 4 boundary/public/selection regression passed 95/95. The independent current-byte preflight/match-control set passed 87/87 plus 1,138 match-control assertions. The final bounded gameplay and engine sweep passed 393/393. Five repaired Candidate 4 static/fixture gates separately passed 95/95. No P0 or P1 remained in independent review.
- Local browser smoke passed through the real Quick Play UI for Single Player, CPU versus CPU, and Set-Piece Suite. Each produced an exact `engine=fl-v2&candidate=4` URL, reached its live V2 authority badge, did not strict-stop, and emitted no browser warning/error logs.
- A stale Co-op/Build 173 URL exposed no Start Match control and the visible mode options were migration-disabled. The Online page loaded no script, iframe, input, or button. A raw `match-engine/match.html` URL stopped at gameplay tick 0, stated that no previous engine is available, and offered only export, V2 restart, and setup exit.
- Public-entry audit covered 110 tracked HTML/JavaScript/launcher files (excluding tests, research, and the unlinked historical prototype) and found no playable prior-engine selector, default, fallback, or raw match entry.
- Curated staged-index audit passed: all 38 staged paths matched the explicit allow-list; the generated career report and every unrelated lab, capture, golden experiment and tool remained unstaged; no staged/unstaged overlap, secret, private path, binary or oversized new artifact was present; and every staged manifest/checklist hash matched the exact index bytes.
- Commit/push/PR/merge/Pages verification: pending.
