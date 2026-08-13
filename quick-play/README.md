# Football Legacy Quick Play

This directory contains the five-stage Quick Play setup flow and its validated handoff to the shared 3D match engine.

## Modes

- Single Player: Player 1 controls the home team against the CPU.
- Set-Piece Suite: free kicks, corners and penalties from the main setup route.
- Co-op / Local 2P: Controller 1 takes Home and Controller 2 takes Away.
- Same-Team Co-op: Controllers 1 and 2 share Home against the CPU.
- CPU vs CPU: both teams are autonomous.
- Online Versus: Home hosts the authoritative match and Away sends remote input.

## Gameplay engines

- **Build 173 · Stable** is the default for every mode.
- **FL V2 · Strict Offline Playtest** can be selected for Single Player, all-CPU CPU vs CPU, and the Set-Piece Suite.
- Once an FL V2 match launches, a V2 authority fault freezes the simulation behind an exportable diagnostic screen. It never silently continues as Build 173.
- Local 2P, same-team co-op and Online select Build 173 visibly before kickoff because those workflows do not support V2 authority.

At free kicks, Cross/A is the grounded pass and stays inside the authored left-stick and power channel. Square supplies the aerial service, R1 + Square the lower/faster ball, and L1 + R1 + Square the driven ball. Corners and goal kicks retain the directional Square-service family; Circle remains the separate direct-free-kick shot route.

The setup UI retains the user's engine preference and shows any pre-launch compatibility reason. The launched match package is stricter: an effective V2 route records `requested=effective=fl-v2`, while an unsupported or frozen route receives a clean `requested=effective=build-173` envelope with no V2 fallback marker. The URL uses `engine=fl-v2` only when FL V2 is genuinely effective; that field is never used to continue a launched V2 match as Build 173. Candidate 3 also emits the fixed cache-only marker `candidate=3`, so a PC cannot silently reuse candidate-2 match HTML for an otherwise identical fixture.

Quick Play now treats match launch as a single transaction: the Start action immediately shows loading feedback and ignores a second activation. Shared controller discovery also clears stale held input across disconnect/reconnect, and text-entry fields are isolated from gameplay navigation.

## Team snapshot

The four English divisions use the 2026/27 club memberships available when this prototype was built. Created clubs stored under `footballLegacyCreatedClubsV1` appear in a fifth Created Clubs category. The historic-team set includes the Invincibles, Conte Chelsea and Ancelotti's representative 2013/14 Real Madrid BBC squad.

## Flow

1. Choose independent home and away league/team dropdowns.
2. Confirm the split-screen matchup.
3. Choose stadium, time, weather, match length, difficulty, camera and both kits.
4. Choose the match mode and gameplay engine.
5. Confirm controls and create a match package.

The package is saved under `footballLegacyPendingMatchDataV1` and encoded into the launch fragment, then consumed by `match-engine/match.html`. This keeps served and downloaded offline launches on the same validated setup boundary.
