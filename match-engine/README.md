# Current match build: local Build 174 offline FL V2 playtest

The main 3D match remains the shared renderer, rules, camera, goalkeeper, restart and replay host. Build 173 is the deliberate default authority. An explicit offline Quick Play opt-in can activate FL V2 for Single Player, all-CPU CPU vs CPU, and the Set-Piece Suite. Unsupported and online modes select Build 173 before kickoff. A launched FL V2 match never returns to Build 173: a candidate fault rolls back its tick, freezes the simulation and opens the strict diagnostic screen.

Build 174 adds deterministic Ball, Movement, CPU, Formation, First Touch, Aerial, Match Clock, Restart and Set-Piece candidates behind strict workflow and transaction boundaries. Single Player and all-CPU CPU vs CPU use the live gameplay authority; the Set-Piece Suite uses the reviewed set-piece authority. Local 2P, same-team co-op and Online remain on Build 173, and no Career or creation workflow is removed.

The latest three-log gameplay batch calibrates pass, through-ball, lob, cross and throw-in delivery; prevents the kicker immediately reclaiming their own release; improves first-touch acceleration, shielding, collision ownership, goalkeeper possession and loose-ball decisions; and adds targeted carrier-support corrections for the Invincibles and Conte Chelsea. Arsenal's full-match support/pressing shape still needs visual calibration and is not claimed closed. CPU free kicks, restart camera ownership, incident-anchored replays, the three-view set-piece replay package, controller reconnection and single-launch loading feedback are included. Ancelotti's representative 2013/14 Real Madrid BBC team is part of the current historic-team set.

The current set-piece closure adds a dedicated slower free-kick approach that mirrors preferred foot and strike technique, plus a ball-anchored behind-player camera with bounded pan. Free kicks, corners and goal kicks now share normal, low and driven directional service physics while direct free-kick shooting remains a separate Circle action.

Build 173 has already been published as the stable baseline. This document describes the local Build 174 working state and makes no public-release claim for FL V2.

The visual-pass notes below are retained as historical implementation context; their old claim that gameplay systems were unchanged no longer describes the current opt-in FL V2 route.

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
