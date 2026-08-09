# Football Legacy Career Integrity Test

This is a separate test copy. It does not replace the shared master game.

## Result

The automated world checks completed with **0 errors and 0 warnings** for new careers beginning in 1888, 1950, 2000 and 2026. Each generated career was also converted to save data, loaded back, migrated and checked again.

## What was repaired

- Every simulated club-season record now retains played, won, drawn, lost, goals for, goals against and points. The old fast-forward code discarded most of these columns outside the top five tiers.
- Every active player and free agent now starts with complete current-season statistics and career totals. Existing saves receive zeroes for genuinely unrecorded totals instead of blank fields.
- The free-agent market is replenished with complete fictional players instead of being emptied permanently by AI clubs.
- A persistent unemployed-manager market now exists. AI clubs appoint actual available managers with identity, age, nationality, style, formation, level, previous club, reason for availability and a complete W/D/L record.
- The Manager Jobs screen now displays that unemployed-manager market and its records.
- Foreign retired-player archives now retain age, birth year, ability, potential, ceiling, personality and traits.
- A duplicate historic-icon bug was fixed. A foreign icon can no longer survive as a stale young copy after the real player has retired.
- Historical player creation now contains 136 distinct fictional iconic archetypes. Names are fictional, while eras, nationalities, positions and playing profiles are designed to evoke football history without using the real players' names.
- Repeated full-history searches were reduced. An isolated 2026 build fell from roughly 122 seconds to roughly 118 seconds on this machine.

## Final checked world sizes

| Start | Clubs | Players | Free agents | Club-season rows | Player-season rows | Icon archetypes generated | Manager archive | Available managers |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1888 | 100 | 920 | 20 | 0 | 0 | 0 | 0 | 24 |
| 1950 | 205 | 5,497 | 19 | 5,214 | 51,025 | 26 | 575 | 24 |
| 2000 | 745 | 6,044 | 24 | 12,996 | 68,941 | 105 | 1,649 | 25 |
| 2026 | 1,477 | 6,967 | 161 | 25,398 | 72,769 | 136 | 4,689 | 90 |

The 2026 world retains 124 iconic players across active, retired and deceased player records, comfortably above the requested minimum of 100. All 136 archetypes have generation records.

## Other checks

- 82 direct local page/asset references checked; none missing.
- 1,616 portrait catalogue entries checked; none missing.
- All JavaScript files and inline page scripts passed syntax checking.
- Duplicate club IDs, duplicate manager IDs, conflicting player copies, impossible W/D/L totals, missing player columns and invalid numeric values were checked.
- The final machine-readable evidence is in `tests/career-world-integrity-report.json`.

## Honest remaining issue

A new 2026 career still takes about 118 seconds to construct on this machine, and its uncompressed save representation is about 199 MB. The progress screen prevents a false crash, but this is still too slow and too large. It needs a dedicated history-cache/save-size project before this test copy should replace the shared master.

## Accuracy note

This is a fictional historical simulation, not a licensed real-world results database. “Accurate” here means internally complete, mathematically consistent, era-aware and historically plausible. Clubs and iconic players remain disguised, and simulated season results are not claims about exact real-life results.
