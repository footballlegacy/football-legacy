# Football Legacy v0.26.17 — History Integrity Fix

This build repairs the historical-career systems behind league movement, honours, managers and Hall of Fame records.

## Promotion and relegation

- Removed the annual historical-tier reset that forced clubs back into a fixed division after each season. This was the main cause of clubs winning the same lower division in consecutive seasons.
- Fixed lightweight league simulation being run before the new-season reset. The reset erased every simulated result, leaving undetailed divisions with all-zero tables and repeatedly awarding titles to the first listed club. Lightweight divisions are now simulated immediately before season archiving and league movement.
- Added era-specific English league movement rules, including election and test-match periods, two-up/two-down, regional Third Division champions, the 1958 national reorganisation, the 1973 expansion to three promotion places, the 1987 playoff and automatic League/Conference exchange era, and the 1994-95 restructuring.
- Lower regional divisions now promote champions rather than using arbitrary multi-club churn.

## Managers

- Added a persistent manager archive with season records, appointments, departures, spells, promotions and honours.
- Fixed headless historical simulation so every club manager receives a season record rather than only managers in detailed fixtures.
- Reworked AI manager tenure and retirement by era. Pre-war secretary-managers may have long reigns, while modern careers turn over more quickly.
- Prevented the fast-forward vacancy system and trajectory system from double-appointing managers.
- Prevented the loading placeholder manager from becoming a century-long historical manager.
- Player-manager appointments now close the outgoing manager's spell correctly.

## Honours and Hall of Fame

- Club trophy cabinets now count official team honours only. Promotions, individual awards, wartime competitions and unofficial competitions are separated rather than inflating the official total.
- Player pages now separate team honours from individual awards.
- Club and world Hall of Fame pages now use actual induction thresholds rather than listing every retired player.
- Legacy saves receive a migration pass for honours, manager records and Hall of Fame data.

## Validation

A complete 1888-2000 headless history was simulated after the fixes:

- 112 seasons archived
- 112 seasons with league movement processed
- 0 all-zero lower-division tables
- 0 cases of a club winning the same lower division in consecutive seasons
- 1,679 managers with recorded careers
- longest manager career: 35 years
- 142 world Hall of Fame inductees
- 53 clubs with at least one club Hall of Fame inductee

## Existing saves

Existing saves are cleaned and backfilled where reliable data exists. Past league tables that were already simulated incorrectly cannot be reconstructed perfectly from missing results. Start a new historical career to regenerate the full promotion, relegation, manager and honours history under the corrected systems.
