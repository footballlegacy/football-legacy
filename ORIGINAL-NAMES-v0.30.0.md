# Original names restoration — v0.30.0

This build restores original football names without changing modes, rules, club IDs, player IDs, finances, ratings, tables, fixtures, saves or simulation behaviour.

## Restored

- All 164 English and 156 world club-database names.
- All 92 modern Quick Play team names.
- English league names and the historical names used by overseas leagues.
- FA Cup, FIFA World Cup and UEFA competition display names, with period-appropriate historical names retained where the competition was originally known by a different name.
- Founder clubs, later timeline entrants and overseas clubs from their embedded real-club references.
- 110 high-confidence historical iconic-player identities, including Pelé, Diego Maradona, Lionel Messi, Cristiano Ronaldo, Johan Cruyff and other era-defining players represented by the existing archetypes.
- Existing saves receive a display-name-only migration when loaded. Technical IDs are deliberately preserved.

## Deliberately unchanged

- Procedurally generated players, managers and grassroots clubs, because they have no original identity to restore.
- Most current Quick Play player names. The data contains fictional names and only some counterpart numbers; no complete trustworthy original-name table is included in the game, so no names were guessed.
- Every game mode and gameplay system.

## Verification

- 92/92 Quick Play teams restored.
- 320/320 club-database rows restored.
- 110/110 iconic-player mappings are unique.
- Existing-save test confirms technical IDs and gameplay numbers are unchanged.
- Player Career and link tests: 16 passed, 0 failed.
- Full 2026 career-world integrity simulation: 0 errors, 0 warnings.
