# Football Legacy — Build 171 Online code-verification hold

Football Legacy is a browser football game prototype with Quick Play, local controller multiplayer, an early friends-only Online Versus mode, creation tools, Career Mode and Grassroots to Glory.

## Play Online with a friend

Online Versus must be launched from the hosted HTTPS version:

**[Open Football Legacy](https://footballlegacy.github.io/football-legacy/)**

1. Josh and Connor each use a supported desktop browser and connect a controller.
2. Home opens the link above, chooses **Online**, then chooses **Host**.
3. Home remains on the code-verification screen and sends Away the displayed copyable full join URL. The room code stays visible while Home waits.
4. Away opens that URL. The entered room code remains visible on Away's verification screen; both players stay at this boundary until the peer connection opens.
5. After connection, Home occupies the Home slot and Away occupies the Away slot. Each player chooses their own team, lineup, tactics and kit; Home chooses the shared match settings.
6. Both players select **Ready** for the exact teams, lineups, tactics, kits and shared settings shown on screen.
7. Once both matching Ready states are confirmed, Home explicitly presses **Start Online Match**. Away becoming ready never starts the match by itself. If either player changes a team, tactic or kit, or Home changes a shared match setting, both players must ready again before Home can start.

The Online shell and all five setup stages support D-pad/left-stick navigation, Cross/A selection, Circle/B back, and L1/LB or R1/RB carousel movement.

Match sound starts on. If Chrome or Firefox requests a first interaction, click **Enable match sound** once. After that, pause the match and use **Match sound** to mute or restore audio.

The host runs the authoritative match and the joining player's controller operates Away. Build 171 removes the one-frame room-code handoff: Home's verification screen persists until Away opens the peer connection, Away can see the code it is joining, and Home can copy the complete join URL instead of asking the other player to remember a flashing code. It advances the Online cache token and room namespace to Build 171 so this flow does not mix with older cached clients or room names.

Build 171 retains Build 170's acknowledged Ready and launch transactions, missed-event recovery, 24-second heartbeat tolerance, reconnect replacement and readiness invalidation. Controller navigation remains the working Build 169 DualSense/Xbox route. This change does not alter match gameplay.

Build 171 has passed a local two-browser acceptance: Home retained the visible code, the full join URL prefilled Away's matching code, and both clients entered setup only after the peer connection opened. A real two-machine test must still confirm that handoff plus the complete Ready-to-match route before this early friends-only prototype can be called remotely accepted.

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
