# Football Legacy — Build 170 Online lobby transaction fix

Football Legacy is a browser football game prototype with Quick Play, local controller multiplayer, an early friends-only Online Versus mode, creation tools, Career Mode and Grassroots to Glory.

## Play Online with a friend

Online Versus must be launched from the hosted HTTPS version:

**[Open Football Legacy](https://footballlegacy.github.io/football-legacy/)**

1. Josh and Connor each open the link above in a supported desktop browser and connect a controller.
2. From the main menu, choose **Online**.
3. One player chooses **Host** and sends the displayed room code to the other player.
4. The other player chooses **Join**, enters the room code and occupies the Away slot. The host occupies Home.
5. Each player chooses their own team, lineup, tactics and kit. The host chooses the shared match settings.
6. Both players select **Ready** for the exact teams, lineups, tactics, kits and shared settings shown on screen.
7. Once both matching Ready states are confirmed, Home explicitly presses **Start Online Match**. Away becoming ready never starts the match by itself. If either player changes a team, tactic or kit, or Home changes a shared match setting, both players must ready again before Home can start.

The Online shell and all five setup stages support D-pad/left-stick navigation, Cross/A selection, Circle/B back, and L1/LB or R1/RB carousel movement.

Match sound starts on. If Chrome or Firefox requests a first interaction, click **Enable match sound** once. After that, pause the match and use **Match sound** to mute or restore audio.

The host runs the authoritative match and the joining player's controller operates Away. Josh and Connor's first real two-machine Build 169 test connected both controllers and reached Ready Up, but their readiness displays disagreed and launch stalled. Build 170 repairs that exact failure with acknowledged, retried Ready state tied to the current lobby configuration; continuously reconciled peer connection state; and a retried proposal -> acknowledgement -> commit launch transaction. A fresh Josh/Connor Build 170 internet retest is still required before this early friends-only prototype can be called remotely accepted.

Build 170 also tolerates a missed one-shot connection event by continuously publishing peer truth with a connection epoch, allows 24 seconds for heartbeat recovery, replaces stale connections during reconnect, and rejects readiness after any relevant lobby change. Controller navigation remains the working Build 169 DualSense/Xbox route. Online files carry the Build 170 cache-bust token so both machines load the same protocol revision.

The local two-tab acceptance deliberately dropped the first Home Ready packet and the explicit connected event, then passed Home-first and Away-first readiness, settings-change invalidation, explicit Home Start, and the Home-match/Away-live-view transition. The focused gates pass **13/13** controller checks and **85/85** lobby-transaction checks. The additional unchanged-area checks pass original names **5/5**, player links **2/2**, Player Career **9/9** and Create-a-Club **1/1**. The exhaustive career-world integrity suite was not rerun to completion because that expensive area is untouched by this Online-only repair.

Do not use a downloaded `file://` ZIP for Online Versus. Local-file browser origin and media restrictions make that route unsupported and unreliable. Downloaded copies remain suitable for offline Quick Play.

## Fastest PS5 controller playtest

1. Connect one or two DualSense controllers by USB-C or macOS Bluetooth.
2. Double-click `START-PS5-SINGLE-PLAYER.command` or `START-PS5-TWO-PLAYER.command`.
3. In the match, press **Options** to open the pause menu and controller preview.

Menu controls are available across the game:

- D-pad or left stick: move focus
- Cross: select
- Circle: back
- Options: pause during a match

## Current playtest controls

- Left stick: move
- R2: sprint
- Cross: pass
- Circle: shoot or tackle; rapid defensive taps pull a shirt
- Square: lob pass or slide tackle
- Triangle: through pass
- L1: switch player
- R1: shirt pull
- D-pad Down: contextual dive; performances are selected from the subtle, flop and ridiculous rolling set
- R3: flick the ball up
- Right stick up-to-side quarter-circle: stepover
- Right stick down half-circle: roulette

Read `PLAYTEST-NOTES-v0.28.6.md` for the exact changes and test checklist.

## Development

The game is intentionally build-free: edit the HTML, CSS and JavaScript files, then open the launcher again. The main match is `match-engine/match.html`; shared controller menu navigation is `controller-ui.js`.

Read `JOSH-HANDOFF.md` before changing gameplay systems.
