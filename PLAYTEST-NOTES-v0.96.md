# Football Legacy v0.96 — historic teams and attacking identities

## Playtest purpose

This iteration turns the generic attacking framework into two visible team behaviours and replaces the fictional Quick Play squads for the current North London test.

## Teams

- Arsenal Invincibles 2003/04: 4-4-2 becoming a 2-4-4. Ashley Cole and Lauren advance, Pires and Ljungberg become the high wide players, Vieira and Gilberto support the move, and Henry and Bergkamp remain beyond the ball.
- Conte Chelsea 2016/17: 3-4-3 defending as a 5-4-1 and attacking as a 3-2-5. Alonso and Moses provide the width, Kanté and Matić protect and connect, Hazard and Pedro move inside around Diego Costa.
- Both squads use named historic footballers and custom Football Legacy ratings. These are gameplay calibrations based on season performance and tactical role, not official EA/FIFA ratings.

## CPU attacking changes

- Team shape is now connected to the footballer movement targets, pass selection and telemetry rather than existing only as a plan label.
- Central carriers actively search for full-backs or wing-backs.
- Wide carriers can combine, overlap, carry down the touchline, cross early or reach a cutback position.
- A genuine give-and-go sequence now records the first pass, sends the original passer beyond the ball, selects the return pass and only counts a completion when that footballer receives it.
- Wide-entry telemetry counts entry into a wide attacking zone rather than counting every simulation tick spent there.
- Existing volley finishing is retained and now has a realistic route into matches because the CPU can create crosses.

## Playtest safeguards and logging

- Team style, base shape, current possession shape, crosses and give-and-go attempts/returns/completions are exported in the playtest report.
- The guaranteed-goal keyboard shortcut is off by default so typing timed notes cannot accidentally alter the score. It is available only when explicitly enabled or during self-test.
- Engine/report version is 0.96.

## Validation target

Run one Legendary six-minute match at North London. Check that Arsenal use both full-backs, Chelsea create a five-player attacking line, at least some possessions reach a genuinely wide carrier, and one-twos/crosses appear without becoming compulsory on every attack.
