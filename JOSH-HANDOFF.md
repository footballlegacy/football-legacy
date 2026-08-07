# Josh Handoff

## Source of truth

Work in this folder/repository. Do not edit an exported ZIP or an older numbered output.

## Important files

- `match-engine/match.html`: live 3D match, controls, fouls, replays, animation poses and cameras.
- `controller-ui.js`: shared controller navigation for menus and match overlays.
- `quick-play/`: team selection and match setup.
- `career-mode/`: Career Mode and Grassroots to Glory.
- `create-player/`, `create-club/`, `create-stadium/`: creation tools.

## Safe workflow

1. Make one focused change.
2. Run JavaScript syntax checks before playtesting.
3. Test both keyboard and DualSense paths when changing gameplay input.
4. Test one and two controllers when changing controller code.
5. Record major player-visible changes in the shared development changelog.

## Current controller contracts

Menu navigation is disabled while the live match canvas is active, preventing D-pad and Cross from being consumed twice. It becomes active on normal pages and when a match overlay such as Pause, Preview or Substitutions is open.

Skill moves are deliberately handled inside the match engine: RS up-to-side recognises a stepover and RS down through a half-circle recognises a roulette. Do not move those gestures into `controller-ui.js`.
