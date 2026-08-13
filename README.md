# Football Legacy — local Build 174 FL V2 playtest

Football Legacy is a browser football game prototype with Quick Play, local controller multiplayer, an early friends-only Online Versus mode, creation tools, Career Mode and Grassroots to Glory.

## Playtest FL V2

Launch the current checkout and open **Quick Play**:

1. Choose **Quick Play**, select the teams and continue to Match Setup.
2. Choose **Single Player**, all-CPU **CPU vs CPU**, or the **Set-Piece Suite**.
3. Set **Gameplay Engine** to **FL V2 · Strict Offline Playtest**.
4. Finish setup and launch the match normally.

FL V2 is an explicit offline playtest route. Single Player and all-CPU CPU vs CPU activate the deterministic Ball, Movement, CPU, Formation, First Touch and Aerial systems. The Set-Piece Suite activates the reviewed Clock, Restart, Set-Piece and coordinate systems. **Build 173 · Stable** remains the deliberate default before kickoff. Once an FL V2 match launches, a V2 authority fault freezes the simulation behind an exportable diagnostic screen; the match never silently continues as Build 173. Local 2P, same-team co-op and Online remain on Build 173; Career, Create-a-Club, Player Career and the creation tools retain their established workflows.

This local Build 174 state incorporates the three latest playtest logs: calibrated passing, through balls, lobs, crosses and throw-ins; more responsive first touches, shielding, collisions, goalkeeper possession and support runs; corrected CPU restarts and replay anchoring; set-piece camera/replay revisions; and controller reconnect plus single-launch loading feedback. Targeted carrier-relative support corrections were added for the Invincibles and Conte Chelsea, but Arsenal's full-match support/pressing shape still needs visual calibration and is not claimed closed. Ancelotti's representative 2013/14 Real Madrid BBC team is available alongside them.

Build 173 has already been published as the stable baseline. This README describes the current local Build 174 working state and does not claim that FL V2 has been publicly released.

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

1. Connect one or two DualSense controllers. USB-C is the verified route. Bluetooth may show as connected without delivering input on some Mac/browser combinations and is not yet claimed fixed.
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

At a free kick, corner or goal kick, the left stick chooses the service line. Square gives the normal lofted delivery, R1 + Square gives a lower/faster ball, and L1 + R1 + Square gives the driven delivery. Direct free-kick shots remain on Circle with their existing dipping, driven and curved modifiers.

Read `research/overhaul/set-piece-directional-camera-runup-closure-2026-08-12.md` for the current set-piece controls and visual evidence, and `PLAYTEST-NOTES-v0.28.6.md` for the older visual-pass history.

## Development

The game is intentionally build-free: edit the HTML, CSS and JavaScript files, then open the launcher again. The main match is `match-engine/match.html`; shared controller menu navigation is `controller-ui.js`.

Read `JOSH-HANDOFF.md` before changing gameplay systems.
