# Football Legacy — Changelog

Last reviewed: 10 August 2026 — build 167 prepared on `agent/build-167-offline-quick-play`

This file records the two source lines and the combined build produced from them:

- **Combined integration build v0.31.0** — the complete v0.30.1 career/data build plus Josh's complete v0.96 match branch, with the overlapping Quick Play page merged rather than replaced.
- **Career and data build v0.30.1** — the current Player Career/original-names copy with the Create-a-Club career fixes below.
- **Match Engine v0.96** — Josh's GitHub pull request #1, included unchanged except for the intentional Quick Play integration described below.

## Mandatory GitHub setup for Connor's AI agent

Before any future GitHub publication, Connor's AI agent **must** verify that the official GitHub CLI is installed and authenticated:

1. Run `gh --version` and `gh auth status` before creating commits or promising a push.
2. If `gh` is missing on macOS, install the official CLI with `brew install gh`.
3. Authenticate the intended owner account with `gh auth login --hostname github.com --git-protocol https --web`, then rerun `gh auth status` and verify the `footballlegacy` organisation is accessible.
4. Use the repository's normal branch, commit, push and draft-pull-request workflow. Do not silently replace it with manual website uploads or claim publication succeeded before the remote branch and pull request have been verified.

This is a mandatory workstation prerequisite for Connor's AI agent, not an optional recommendation. It was added after build 166 was locally complete but the first publication attempt found that `gh` was absent.

## Build 167 — offline Quick Play roster handoff

- Fixes the downloaded-ZIP route that could show Arsenal Invincibles and Conte Chelsea in Quick Play but load generic `HOME` and `AWAY` footballers in the match.
- Mirrors the complete selected teams, lineups, benches, tactics, kits and controller assignments into a validated local URL fragment, while retaining browser storage for normal served play and reload continuity.
- Adds `matchConfigSource` telemetry and corrects the playtest engine label to `0.167`, making URL, browser-storage and fallback launches distinguishable in future logs.
- Is supported by the contrasting logs `FL-MSN7AWXB` (generic fallback) and `FL-MSN757H7` (correct historic rosters), an end-to-end five-stage Quick Play launch, and a clean **182/182** engine gate.
- Changes no locomotion, CPU tactics, positional contracts, physics, shooting, defending, goalkeeper, animation, stadium, FLARE, replay, free-kick or difficulty values.

## Build 166 — controller publication hotfix

- Preserves the complete build-165 match, CPU, presentation and request-log workflow.
- Repairs Firefox DualSense D-pad navigation and D-pad Down contextual dive delivery.
- Makes intended pass-receiver handover reliable while keeping all defensive player switching manual through L1 or directional RS.
- Retains the Xbox One browser-standard mapping and adds explicit Xbox detection, A/B menu guidance and direct checks for A/B/X/Y, LB/RB, LT/RT, Menu, LS/RS and D-pad controls.
- Passes the clean **181/181** in-browser engine gate; physical Xbox acceptance remains for Connor.

## v0.31.1 — Missing-fixture recovery hotfix

- Repairs saves that open with no scheduled matches for the controlled club.
- Preserves existing fixtures and prevents duplicate fixture IDs.
- Runs defensively so repair or persistence failure cannot stop the career page rendering.
- Adds an automated 1888 broken-save recovery test.

## v0.31.0 — Combined career and match integration

**Status:** published to the shared GitHub `main` branch through [pull request #2](https://github.com/connorwr833/football-legacy/pull/2) on 9 August 2026. Merge commit: `b306474`.

### Included without removals

- Preserved **Take Charge**, **Create a Club** and **Player Career** as the three main career choices.
- Preserved grassroots careers inside Create-a-Club for tiers 7–15, including informal recruitment, part-time registrations, availability conflicts and non-football departures.
- Preserved professional Create-a-Club rules for tiers 1–6, original club/competition/player display names and the complete Player Career system.
- Included Josh's full v0.96 match engine, historic Arsenal and Chelsea squads, attacking identities, spectator mode, controls, physicality, set pieces, fights, celebrations, audio and North London stadium configuration.
- Merged the only overlapping file, `quick-play/index.html`, so the original-name loaders and Josh's historic-squad loader both run. Neither version silently replaced the other.
- Kept every tracked file from GitHub `main`; the combined change set contains **zero tracked-file deletions**.

### Combined verification

- **18 automated career/data checks passed, 0 failed**, including full tier-15 grassroots and tier-2 professional world builds.
- The combined Quick Play script, historic-squad pack and both inline Match Engine scripts pass JavaScript syntax validation.
- Player Career, Create-a-Club routing, original names, existing-save migration and all tested local links pass in the combined directory.
- Josh's five source files were recovered from pull-request head `2fca39f` and checked by SHA-256 before integration.

### Publication record — 9 August 2026

- Combined [pull request #2](https://github.com/connorwr833/football-legacy/pull/2) merged **8 commits across 47 changed files** into `main`, with **3,965 additions, 679 line removals and zero deleted tracked files**.
- Merge commit `b306474` contains both the career/data work and Josh's complete v0.96 match work.
- Josh's original [pull request #1](https://github.com/connorwr833/football-legacy/pull/1) was closed only after its full contents were preserved in the combined merge. Its branch and commit history remain available for traceability.
- The shared Quick Play page loads both the original-name data and Josh's historic squad pack; neither side replaced the other.

## Pre-publication review record — 9 August 2026

- Before publication, the GitHub `main` branch contained one commit: `82a6a68` (**Initial Football Legacy playable build**).
- At that review point, the repository had one pull request: Josh's [pull request #1](https://github.com/connorwr833/football-legacy/pull/1).
- Josh's current pull-request head is `2fca39f`, following commits `4f8e0de` and `5968c48`. The live scope remains 5 files, 3 commits and **+1,678 / -502 lines**.
- GitHub reported at review time that the branch had no conflicts with `main`. It was Draft, with 0 checks, 0 submitted reviews and 0 review comments.
- The current local career/data copy differs from its preceding local v0.30 copy across 32 files, with **+1,256 / -171 lines**. This includes the Player Career/original-name work and the Create-a-Club/grassroots repairs documented below.
- The current local career/data suite passes **18 checks, 0 failures**. Josh's branch has static and built-in playtest evidence recorded below, but no GitHub-run automated checks.
- **Decision at review time:** Josh's v0.96 work was accepted for the combined integration build. Publication then proceeded through pull request #2 after correcting the visible v0.95/v0.96 title mismatch; a complete hands-on match playtest remains required before calling the match experience release-ready.

## v0.30.1 — Create-a-Club career repair

### Career setup and routing

- Reduced the career-type choice to one screen on the main homepage: **Take Charge**, **Create a Club** or **Player Career**.
- Removed the standalone Grassroots career choice. Grassroots remains fully available by choosing a bottom-tier entry inside Create-a-Club.
- Removed the manager-creation **Previous Job** field.
- Locked created clubs to the present-day 2026/27 start for now.
- Removed the second career-type prompt and the extra save/confirmation loop.
- Creating the club now builds its career and opens the career homepage directly.

### Created clubs, squads and tier rules

- Added exact starting-tier selection from tier 1 through tier 15.
- Added a preselected 20-player generated squad whose ratings scale to the chosen tier and whose positional balance includes two goalkeepers, six defenders, five midfielders and three forwards.
- Added choices to retain or replace generated players, use custom created players and select from the game’s named real-player/iconic-player records.
- Selected existing real players are moved into the created club rather than duplicated.
- Tier 7–15 starts use the preserved grassroots systems: informal/no-fee recruitment, part-time registrations, day-job conflicts, matchday availability and player departures for university, relocation and other non-football reasons.
- Tier 1–6 starts use professional contracts, transfer budgets, wage budgets and normal transfer negotiation.
- The created club now replaces a valid club slot in the selected 2026 division, retains pyramid membership and receives a valid first-season fixture list.

### Playability repairs

- Repaired the broken Create-a-Club handoff that previously returned to setup without constructing a career save.
- Added defensive save boot repair for an invalid or missing controlled-club reference so the career homepage cannot fail on that handoff.
- Preserved the selected club, manager, squad, finances, tier rules and homepage tab before the career UI renders.

### Verification

- **18 automated checks passed, 0 failed** across created-club careers, Player Career routes and saves, original names and existing-save migration.
- A full 1888→2026 career-world build passed for both tier 15 and tier 2 created clubs.
- The built tier-15 save successfully rendered Home, Inbox, Team, Squad, Transfers, Club, Board, Competitions, History, Search, Manager and Settings.
- All modified inline scripts and the grassroots career module pass JavaScript syntax validation.

## v0.30.0 — Player Career and original names

### Player Career

- Added **Player Career** as a separate start-menu choice alongside **Create Legacy** and **Grassroots to Glory**.
- Preserved the existing Grassroots to Glory mode and its direct start-menu route.
- Added a career beginning at age 14 through either a club academy or local grassroots football.
- Added progression through grassroots, district football, academy trials, youth teams, reserves, first-team football, veteran football and possible later returns to the grassroots game.
- Added release and redemption paths: being released is a career event, not an automatic game over.
- Added permanent match records covering opponent, competition, result, minutes, rating, goals, assists, captaincy and key moments.
- Kept club, youth-international and senior-international appearances as separate records.
- Added development, age-based decline, fitness, fatigue, morale, training, objectives and coach trust.
- Added individual relationships with teammates, the club manager, supporters, the player's agent, family, the national manager and international teammates.
- Added contracts, transfer interest, playing-time conversations, role discussions, feedback and pressure.
- Added off-pitch choices involving family, rest, extra training, social media and nightlife.
- Added youth and senior international selection, separate international records and earnable international captaincy.
- Added player-controlled retirement with no forced career-length cap.
- Added a post-retirement handoff into the existing manager-career identity, retaining the player's career record.
- Added a separate Player Career save and **Continue Player Career** menu card.

### Original football names

- Restored the original display names of all **92 Quick Play teams**.
- Restored the original display names of all **320 career-database clubs**: 164 English clubs and 156 world clubs.
- Restored English league names and the historical names used by overseas leagues.
- Restored FA Cup, FIFA World Cup and UEFA competition names, while retaining period-appropriate historic competition names.
- Restored founder clubs, timeline entrants and overseas club identities from the game's embedded real-club references.
- Restored **110 unique, high-confidence iconic-player identities**, including Pelé, Diego Maradona, Lionel Messi, Cristiano Ronaldo and Johan Cruyff.
- Added display-name migration for existing saves while deliberately preserving technical IDs and gameplay values.
- Left generated players, managers and grassroots clubs unchanged where no real identity exists.
- Left most current Quick Play player names unchanged because the game does not contain a complete, trustworthy original-name mapping; no names were guessed.

### Verification

- Player Career routes, saves and links: **16 passed, 0 failed**.
- Long-career test: more than 25 seasons and 1,040 permanently recorded matches without forced retirement.
- Academy release, grassroots redemption, international-record separation, captaincy, relationship persistence and retirement handoff tested.
- Original names: **92/92** Quick Play teams, **320/320** club rows and **110/110** unique iconic-player mappings verified.
- Existing-save migration confirmed to leave technical IDs and gameplay values unchanged.
- 2026 career-world integrity simulation: **0 errors, 0 warnings**.
- Existing 1888 career-world integrity audit: **0 errors, 0 warnings**.

### Deliberately still separate or unfinished

- Football-politics and referee careers are not included yet.
- Player Career currently uses its statistical match simulation; a full 3D key-match handoff is not yet integrated.
- Deep international tournaments, qualifying groups and full squad-selection screens remain future work.
- Later senior Player Career offers still use a smaller fictional pool rather than the whole synchronized career world.
- Injuries, boot deals, awards, interviews and full story scenes remain future layers.

## v0.96 — Historic squads and expanded Match Engine

**Status:** included in v0.31.0 on `main` through [pull request #2](https://github.com/connorwr833/football-legacy/pull/2). Josh's original [pull request #1](https://github.com/connorwr833/football-legacy/pull/1) was then closed as superseded by the combined merge, with its branch and history preserved.

### Historic playtest teams

- Added Arsenal 2003/04 and Chelsea 2016/17 historic playtest squads.
- Added full 18-player squad lists, unique shirt numbers, role-calibrated attributes and correct 4-4-2/3-4-3 starting shapes.
- Added Arsenal's 4-4-2 to 2-4-4 attacking identity, with overlapping fullbacks and wide combinations.
- Added Chelsea's 3-4-3 to 3-2-5 attacking identity, with wingback height and inside-forward occupation.
- Linked fullback and wingback movement to passing options, crosses and cutbacks.
- Added give-and-go behaviour and playtest telemetry for the new team identities.

### Match intelligence and team identity

- Added normalized difficulty handling and team-specific playstyle configuration.
- Added attacking shapes, repeatable attacking patterns, zonal roles, support runs, overlaps and defensive-phase marking.
- Expanded AI celebrations, match-state presentation cleanup and match/playtest telemetry export and recovery tools.
- Disabled the guaranteed-goal test shortcut for normal play.

### Controls and football actions

- Expanded mappings for both gamepads.
- Added lob passes, fake shots, flick-ups, manual aerial actions and flair aerial actions.
- Added crossing, headers, volleys, shoulder barges and enhanced contact outcomes.
- Added a multi-stage shirt-pull interaction and contextual diving decisions.
- Added penalty goalkeeper control, free-kick walls and stricter kickoff-law enforcement.

### Physicality, presentation and atmosphere

- Added contact-fall reactions and expanded collision feedback.
- Added confrontations, walkout fights and cinematic fight presentation.
- Added expanded celebration handling and match presentation cleanup.
- Added crowd and collision audio systems.
- Added a built-in North London stadium backdrop and stadium-theme configuration.

### Quick Play changes

- Added spectator mode with both teams controlled by AI.
- Added 3-4-3 to the selectable formations.
- Added the North London built-in stadium as the current default stadium theme.
- Changed the current default setup to a night match on Legendary difficulty.
- Passed named difficulty settings directly into the expanded match engine.

### Review and validation notes

- Pull request scope: **5 changed files, 3 commits, +1,678 / -502 lines**.
- Current commits: `2fca39f` (**Add Arsenal and Conte Chelsea playtest squads**), `5968c48` (**Add v0.96 team attacking identities**) and `4f8e0de` (**Document v0.96 historic team playtest**).
- The proposed match script, Quick Play script and historic-squad data all pass JavaScript syntax validation.
- Both historic squad packs contain 18 players with unique IDs, unique shirt numbers and integer attributes within the valid 1–99 range.
- At pre-publication review, the original pull request had **no automated GitHub checks, reviews or review comments** and was marked **Draft**.
- At that same review point, GitHub reported **no conflicts with the base branch**. After the combined merge changed `main`, the original draft was closed as superseded rather than merged a second time.
- Josh's pull-request file displayed **v0.95** in the page title while its internal report/configuration identified **v0.96**. The combined v0.31.0 build corrects that visible title to **v0.96** before publication.
- The pull request's original short description understates its actual scope. The broader controls, AI, physicality, fight, celebration, set-piece, audio, stadium and spectator changes are documented above so they are not silently introduced.
- Static validation is complete, but a full hands-on match playtest is still required before treating v0.96 as release-ready.
- The project owner has approved this change set for integration testing; that approval does not waive the manual playtest or permit it to overwrite the separate career/data work.

## Integration rule

Neither line of work should remove or silently replace an existing game mode. Player Career, Take Charge and Create-a-Club must remain available when the match branch is integrated; grassroots careers remain the tier 7–15 end of Create-a-Club. Josh's five-file pull request is match/Quick Play scoped and should be applied into a combined test build rather than used to replace the career/data directory wholesale.
