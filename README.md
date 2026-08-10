# Football Legacy — Build 168 Online Versus prototype

Football Legacy is a browser football game prototype with Quick Play, local controller multiplayer, an early friends-only Online Versus mode, creation tools, Career Mode and Grassroots to Glory.

## Play Online with a friend

Online Versus must be launched from the hosted HTTPS version:

**[Open Football Legacy](https://footballlegacy.github.io/football-legacy/)**

1. Josh and Connor each open the link above in a supported desktop browser and connect a controller.
2. From the main menu, choose **Online**.
3. One player chooses **Host** and sends the displayed room code to the other player.
4. The other player chooses **Join**, enters the room code and occupies the Away slot. The host occupies Home.
5. Each player chooses their own team, lineup, tactics and kit. The host chooses the shared match settings.
6. Both players select **Ready**. The host then starts the match.

Match sound starts on. If Chrome or Firefox requests a first interaction, click **Enable match sound** once. After that, pause the match and use **Match sound** to mute or restore audio.

The host runs the authoritative match and the joining player's controller operates Away. This is an early friends-only prototype: the first real two-Mac internet test between Josh and Connor is still required. It currently uses public peer signalling without a dedicated TURN relay, so some restrictive school, office, carrier or symmetric-NAT networks may not connect.

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
