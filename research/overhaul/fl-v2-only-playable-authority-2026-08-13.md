# FL V2-only playable authority — approved 13 August, Candidate 5 refresh 14 August 2026

Status: approved release contract for Build 174 Candidate 5; the playable-authority scope is unchanged from the Candidate 4 cutover.

This contract supersedes the earlier Build 173-default and FL V2 opt-in release policy. It changes which match engine may be played; it does not erase the earlier baselines, evidence, tests or archived versions that made the migration auditable.

## Playable scope

FL V2 is the sole playable match authority. There is no engine selector, previous-build default or previous-build fallback.

The released playable workflows are:

- Single Player.
- CPU versus CPU, with zero human owners and both teams assigned to the CPU.
- Set-Piece Suite.

The following workflows are unavailable until their complete V2 authority and release gates are implemented:

- Local two-player.
- Same-team Home Co-op.
- Online Versus.

An unavailable workflow must remain visibly unavailable. It must not launch a previous engine, silently change mode, or construct a playable legacy envelope.

Career Mode, Create-a-Club, Player Career and the creation/data tools retain their independent workflows. Any handoff from those areas into a match must satisfy the same V2-only launch contract.

## Exact launch boundary

A playable match must arrive through an eligible workflow with matching V2 query and payload fields, the expected workflow identity, the required ownership model and a valid deterministic seed. CPU versus CPU additionally requires the exact all-CPU ownership and autoplay contract.

Missing, malformed, duplicated, contradictory, online, shadow-only, unsupported or seed-mismatched launch data fails closed before simulation. A direct or cached `match.html` route without the exact V2 contract is not a playable back door.

Once a V2 match begins, candidate preparation, application and finalization remain one transaction. A fault restores the captured host state, rolls back the candidate tick, disables simulation and opens the exportable V2 diagnostic. No previous-engine tick may run before or after that stop.

## What legacy-named internals mean now

Some source identifiers, adapters, baseline hashes, fixtures, tests and comments still contain Build 173 or legacy names. They may remain only when they serve one of these non-playable purposes:

- immutable provenance for the recovered baseline;
- host-shape compatibility used by the V2 composition layer;
- read-only comparison, diagnostics or regression evidence;
- rollback sentinels that stop V2 safely without transferring authority;
- historical release documentation.

Those names do not confer playable authority. Dormant module headers written during the shadow/opt-in stages are superseded by this contract wherever they imply that Build 173 remains selectable, default or playable.

The separate FL V1.5 forensic archive remains untouched. It is an independently preserved historical game file set, not a fallback bundled into Candidate 5.

## Release gates

Candidate 5 may be published only when all of the following are true:

- Quick Play exposes FL V2 as a fixed, non-selectable authority.
- Only Single Player, CPU versus CPU and Set-Piece Suite can launch a match.
- Local two-player, Home Co-op and Online are visibly unavailable and cannot launch.
- Old setup pages, launchers, direct URLs and malformed/cached payloads cannot enter previous-build gameplay.
- The protected workflow matrix, manifest hashes and cache markers describe Candidate 5.
- Focused authority, deterministic, controller, restart, replay, set-piece and browser gates pass on the frozen bytes.
- The reviewed commit is pushed and merged, then the hosted GitHub Pages assets are verified rather than inferred from the merge.

## Future restoration rule

An unavailable mode returns only through an explicit V2 implementation and release change. Preserving old code or transport scaffolding is not sufficient evidence that the mode is playable.
