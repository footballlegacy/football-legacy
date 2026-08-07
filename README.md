# Football Legacy — v0.28.6 Controller UI, Dives & Cinematic Balance

Football Legacy is a local browser football game prototype with Quick Play, local two-player DualSense support, creation tools, Career Mode and Grassroots to Glory.

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
- R3: dive; successive attempts cycle subtle, flop and ridiculous rolling performances
- Right stick up-to-side quarter-circle: stepover
- Right stick down half-circle: roulette

Read `PLAYTEST-NOTES-v0.28.6.md` for the exact changes and test checklist.

## Development

The game is intentionally build-free: edit the HTML, CSS and JavaScript files, then open the launcher again. The main match is `match-engine/match.html`; shared controller menu navigation is `controller-ui.js`.

Read `JOSH-HANDOFF.md` before changing gameplay systems.
