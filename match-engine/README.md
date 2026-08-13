# Current match build: Build 174 Candidate 4 — FL V2 only

The main 3D match remains the shared renderer, rules, camera, goalkeeper, restart and replay host. FL V2 is now the sole playable match authority. Single Player and all-CPU CPU vs CPU use the live Ball, Movement, CPU, Formation, First Touch and Aerial authority; the Set-Piece Suite uses the reviewed Match Clock, Restart, Set-Piece and coordinate authority.

There is no previous-build selector, default or fallback. Local 2P, same-team Home Co-op and Online are unavailable until each can run through complete V2 authority. Career and creation workflows remain available independently, but any match handoff must satisfy the same V2-only contract.

The host admits a match only when an eligible workflow carries matching V2 query and payload fields, the required ownership model and a valid deterministic seed. A direct, cached, missing, malformed, duplicate, contradictory, online, shadow-only, unsupported or seed-mismatched route stops before simulation. A live candidate fault restores the captured host state, rolls back that tick, disables simulation and opens the strict diagnostic screen; it never transfers authority to a previous engine.

Candidate 4 preserves authored normal-pass and ground-through channels while solving their Ball V2 meeting point; adds bounded, input-subordinate receiver guidance; permits reaction-rated recontrol attempts after loose aerial cushions without granting possession; closes shot/keeper and directional-knock-on double-authority paths; binds explicit aerial finishes to one cross flight; repairs free-kick staging and grounded Cross/A delivery; and grades slide cards from the physical challenge rather than treating every slide foul as a yellow. CPU pass-race rejection holds one decision briefly instead of recalculating it every frame. Human acceptance remains open, and the CPU characterization is recorded honestly rather than claimed perfect.

The current set-piece closure adds a dedicated slower free-kick approach that mirrors preferred foot and strike technique, plus a ball-anchored behind-player camera with bounded pan. Free kicks, corners and goal kicks share normal, low and driven directional service physics while direct free-kick shooting remains a separate Circle/B action.

Candidate 4 uses `candidate=4` and `174-fl-v2-final-candidate-4` only for cache isolation. Those markers do not alter authority or the deterministic seed. Publication is complete only after the reviewed bytes are merged and the hosted assets are verified.

Some internal source identifiers still use Build 173 or legacy names because V2 composes over a preserved host shape and the repository retains baseline evidence. Those identifiers are non-playable provenance or compatibility only. Dormant shadow/opt-in headers are superseded by `research/overhaul/fl-v2-only-playable-authority-2026-08-13.md` wherever they imply that a previous engine remains playable.

The visual-pass notes below are retained as historical implementation context. Their old authority and unchanged-gameplay claims do not describe Candidate 4.

# Historical visual pass — v0.28

This build starts from the last stable cross-field-passing version. The working match engine has been protected while the visible match has been rebuilt toward a late-2000s football-game style.

## Preserved from the stable build

- Sprint remains **Shift**.
- Passing, full-power cross-field switches, shooting and tackling are unchanged.
- Existing team AI, tactics, set pieces, added time, substitutions and Instant Result are unchanged.
- Existing camera options remain available.
- The current Football Legacy match report and integration functions remain available.

## Visual rebuild

- Rebuilt player proportions with separate shoulders, torso, hips, thighs, knees, shins, ankles, boots, upper arms, elbows, forearms and hands.
- Running and sprinting now use visible hip rotation, planted steps, bent knees, arm drive, body lean and head stabilisation.
- Twelve head shapes, seven height ranges, varied builds, jaws, chins, cheekbones, ears, eye spacing, noses, brows and mouths.
- Eight skin tones, eight hairstyles, facial-hair variation and weather/era-dependent sleeve lengths.
- Detailed boots with tongues, soles and laces.
- Textured kits with fabric grain, collars, cuffs, club crests, sponsors and correctly orientated shirt numbers.
- Close player shots during the pre-match sequence and goal celebrations so the faces can actually be seen.
- Rebuilt grass with mowing stripes, grain, worn goalmouths, weather response and complete pitch markings.
- Reworked goals, posts, crossbars and denser moving nets.
- Three visible stands during normal sideline gameplay. The camera-side main stand is removed from the gameplay sightline.
- The fourth main stand and proper tunnel are shown during the walkout.
- The stand behind the camera is also hidden in the End-to-End view.
- Tiered seating, roofs, beams, glass sections, stairs, club banners, advertising boards and denser crowds.
- Era-aware terraces, roofs, stadium scale, attendance and floodlights.
- Improved daylight, overcast, rain and night lighting, shadows, sky and rain effects.
- Added **Classic 2008**, a lower and closer sideline camera inspired by late-2000s football games.

## Start on Mac

1. Extract the ZIP.
2. Double-click `START-MATCH.command`.
3. If macOS blocks it, right-click it and choose **Open**.

The match can load Three.js online. Run `INSTALL-OFFLINE-GRAPHICS.command` once while online to keep the graphics library inside the folder.

## Controls

- Arrow keys — move
- Shift — sprint
- A — pass; hold for distance and lift
- S — shoot; hold for power
- D — standing tackle; double-tap for a slide
- W — manual player switch
- Q — contextual skill move
- Q twice — roulette
- Q + left/right — ball roll
- Q + back — drag-back
- Q + forward and sideways — body feint
- Shift + Q + forward — knock-on
- Shift + Q + sideways — lane change
- Esc / P — pause

## Football Legacy integration

The build continues to accept the existing match configuration, including year, weather, kits, stadium capacity, attendance, floodlight year, squad appearance data, formations, custom formation slots and tactical instructions.

Available functions include:

- `FLMatch.getState()`
- `FLMatch.getReport()`
- `FLMatch.instantResult()`
- `FLMatch.getMatchConfig()`
- `FLMatch.setAutoSwitch(true | false)`
- `FLMatch.setTeamTactics(team, tactics)`

## Validation

The JavaScript passes syntax checks. The scene has been run through mocked runtime checks across 1888, 1960 and 2008 stadium/weather combinations, including the Classic 2008 and End-to-End cameras. The protected passing, shooting, AI, restart and match-update functions match the stable build.


## v0.61 cinematic visual pass

The match now includes upgraded lighting, sky, pitch materials, stadium seating, animated adult crowd models, environmental reflections, cinematic colour grading and improved player material shading. Gameplay systems are inherited from v0.60 and were not removed. See `MATCH-GRAPHICS-v0.61.txt` and `ASSET-SOURCES-v0.61.txt`.
