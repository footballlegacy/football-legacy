# Football Legacy Quick Play — Standalone Front End

This directory adds the standalone Quick Play setup flow to the integrated Football Legacy menu.

## Modes

- Single Player: Player 1 controls the home team against the AI.
- Co-op: Player 1 and Player 2 control the home team together against the AI.

## Team snapshot

The four English divisions use the 2026/27 club memberships available when this prototype was built. Created clubs stored under `footballLegacyCreatedClubsV1` appear in a fifth Created Clubs category.

## Flow

1. Choose independent home and away league/team dropdowns.
2. Confirm the split-screen matchup.
3. Choose stadium, time, weather, match length, difficulty, camera and both kits.
4. Confirm and create a match package.

The package is saved under `footballLegacyPendingMatchDataV1`. The standalone suite does not include the match engine; this package is the integration boundary for the existing shared engine.
