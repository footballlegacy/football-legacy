# Football Legacy Quick Play

This directory contains the five-stage Quick Play flow and its validated handoff to the shared FL V2 match host.

## Released modes

- Single Player: Player 1 controls Home against the CPU.
- CPU vs CPU: both teams are autonomous, with zero human owners.
- Set-Piece Suite: controlled free-kick, corner and penalty scenarios through the main setup route.

Co-op / Local 2P, same-team Home Co-op and Online Versus are unavailable until their complete V2 authority is implemented and released. Their visible unavailable state must not launch or fall back to a previous engine.

## Gameplay authority

FL V2 is fixed as the sole playable authority. Quick Play does not expose an engine selector, previous-build default or previous-build fallback.

The launched package records `requested=effective=fl-v2`, the eligible runtime workflow, ownership data, a deterministic positive uint32 seed and the Candidate 4 cache marker. The match URL must agree exactly with that package. Missing, duplicate, contradictory, unsupported, online, shadow-only or seed-mismatched data fails closed before simulation.

Once a V2 match launches, an authority fault restores the captured host state, rolls back the candidate tick and freezes the simulation behind an exportable diagnostic screen. It never continues on a previous engine.

Candidate 4 uses the cache-only `candidate=4` marker and the `174-fl-v2-final-candidate-4` V2 module token. These isolate released bytes; they do not alter the deterministic seed or widen the three-workflow authority scope.

At free kicks, Cross/A is the grounded pass and stays inside the authored left-stick and power channel. Square/X supplies the aerial service, R1/RB + Square/X the lower, faster ball, and L1/LB + R1/RB + Square/X the driven ball. Corners and goal kicks use the directional Square/X service family; Circle/B remains the separate direct-free-kick shot route.

Quick Play treats launch as one transaction: Start immediately shows loading feedback and ignores a second activation. Shared controller discovery clears stale held input across disconnect/reconnect, and text-entry fields are isolated from gameplay navigation.

## Team snapshot

The four English divisions use the 2026/27 club memberships available when this prototype was built. Created clubs stored under `footballLegacyCreatedClubsV1` appear in a fifth Created Clubs category. The historic-team set includes the Invincibles, Conte Chelsea and Ancelotti's representative 2013/14 Real Madrid BBC squad.

## Flow

1. Choose independent Home and Away league/team dropdowns.
2. Confirm the matchup.
3. Choose stadium, time, weather, match length, difficulty, camera and both kits.
4. Choose one released match mode; FL V2 remains fixed.
5. Confirm controls and create the exact V2 match package.

The package is saved under `footballLegacyPendingMatchDataV1` and encoded into the launch fragment, then consumed by `match-engine/match.html`. A raw or cached direct match page without that contract is deliberately non-playable.
