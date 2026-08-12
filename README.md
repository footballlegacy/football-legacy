# Football Legacy — Build 174 FL V2 offline playtest

Football Legacy is a browser football game prototype with Quick Play, local controller multiplayer, an early friends-only Online Versus mode, creation tools, Career Mode and Grassroots to Glory.

## Playtest FL V2

Use the hosted game and open **Quick Play**:

**[Open Football Legacy](https://footballlegacy.github.io/football-legacy/)**

1. Choose **Quick Play**, select the teams and continue to Match Setup.
2. Choose **Single Player** or **Free Kick Practice**.
3. Set **Gameplay Engine** to **FL V2 · Experimental Offline**.
4. Finish setup and launch the match normally.

FL V2 is an explicit offline playtest route. Single Player activates the new deterministic Ball, Movement, CPU, Formation, First Touch and Aerial systems. Free Kick Practice activates the reviewed Clock, Restart, Set-Piece and coordinate systems. **Build 173 · Stable** remains the default and the immediate safety fallback. Local 2P, same-team co-op, CPU vs CPU, Online, Career, Create-a-Club, Player Career and the creation tools retain their established workflows.

Known playtest issue: the Invincibles 4-4-2 currently uses overly static attacking anchors and assigns the wrong full-back to rest defence, so forward support can become too sparse. This remains a post-release priority rather than being hidden as fixed.

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

The host runs the authoritative match and the joining player's controller operates Away. Build 172 retains the persistent room-code handoff and advances the Online cache token and room namespace so it cannot mix with older cached clients or rooms.

Build 172 starts the host stream at 60 fps and adapts through bounded 60/50/40/30 fps quality profiles using measured frame rate, round-trip time, packet loss, available bitrate and browser CPU/bandwidth limitation evidence. It also caps queued controller data, automatically recovers Firefox's occasional blank Quick Play frame and attempts bounded data/video reconnection while the authoritative match pauses safely instead of handing Away to the CPU.

Josh and Theo completed a real two-machine hosted match with smooth remote Away control. D-pad Down did not produce dives in that session, while the local control log `FL-MSN757H7` records the same input producing two successful dive actions. Build 172 therefore normalises Firefox's raw DualSense face buttons and hat-axis D-pad on the sending machine before the packet crosses the peer link. The post-fix remote D-pad route still needs one short two-machine confirmation; the local historic Quick Play engine passes 184/184 checks and the dedicated Online quality gate passes 23/23.

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
- Circle: shoot or standing tackle; rapid defensive taps pull a shirt
- Square: lob pass or slide tackle
- Triangle: through pass; L1 + Triangle sends it over the top
- L1: nearest-player manual switch when defending
- R1: finesse-shot modifier and curved free-kick modifier
- L2: shield/flair modifier
- D-pad Down: contextual dive; performances are selected from the subtle, flop and ridiculous rolling set
- R3: flick the ball up
- L2 + right-stick vertical flick: chained stepovers
- Right stick down half-circle: roulette

Read `PLAYTEST-NOTES-v0.28.6.md` for the exact changes and test checklist.

## Development

The game is intentionally build-free: edit the HTML, CSS and JavaScript files, then open the launcher again. The main match is `match-engine/match.html`; shared controller menu navigation is `controller-ui.js`.

Read `JOSH-HANDOFF.md` before changing gameplay systems.
