# Football Legacy Quick Play

This directory contains the five-stage Quick Play setup flow and its validated handoff to the shared 3D match engine.

## Modes

- Single Player: Player 1 controls the home team against the CPU.
- Free Kick Practice: unlimited set-piece attempts from the main setup route.
- Co-op / Local 2P: Controller 1 takes Home and Controller 2 takes Away.
- Same-Team Co-op: Controllers 1 and 2 share Home against the CPU.
- CPU vs CPU: both teams are autonomous.
- Online Versus: Home hosts the authoritative match and Away sends remote input.

## Gameplay engines

- **Build 173 · Stable** is the default for every mode.
- **FL V2 · Experimental Offline** can be selected for Single Player and Free Kick Practice.
- Unsupported modes and Online resolve visibly and safely to Build 173.

The match package records the requested and effective engine, the engine version, any fallback reason and a deterministic simulation seed. The URL uses `engine=fl-v2` only when FL V2 is genuinely effective.

## Team snapshot

The four English divisions use the 2026/27 club memberships available when this prototype was built. Created clubs stored under `footballLegacyCreatedClubsV1` appear in a fifth Created Clubs category.

## Flow

1. Choose independent home and away league/team dropdowns.
2. Confirm the split-screen matchup.
3. Choose stadium, time, weather, match length, difficulty, camera and both kits.
4. Choose the match mode and gameplay engine.
5. Confirm controls and create a match package.

The package is saved under `footballLegacyPendingMatchDataV1` and encoded into the launch fragment, then consumed by `match-engine/match.html`. This keeps served and downloaded offline launches on the same validated setup boundary.
