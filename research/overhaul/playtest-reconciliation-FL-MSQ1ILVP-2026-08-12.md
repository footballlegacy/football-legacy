# FL-MSQ1ILVP playtest reconciliation — 2026-08-12

## Playtest identity

- Host build `0.174`; log schema `4`.
- Requested and effective engine: strict offline `fl-v2` Single Player.
- Arsenal Invincibles vs Conte Chelsea, Ultimate, four-minute match.
- Final score `0–0`; 859 events and 25 annotations.
- V2 remained the effective authority throughout the export. No Build 173
  continuation/fallback was recorded.

## Main forensic finding

The repeated “ball magnetises to the player” observation was a real
double-authority contact fault, not merely feel.

At the clearest logged incident, Freddie Ljungberg gained the ball from roughly
`73.8` host units, about `2.35 m`. That matches the retained legacy reception
radius (`rad + 62`) almost exactly. On a V2 tick where First Touch V2 returned
no contact, the old host reception path was still allowed to retry. It could
therefore award possession from the legacy radius, after which the live host
placed the ball at the new owner's centre.

The correction is deliberately two-sided:

1. FL V2 now owns the ordinary ground-reception attempt, including a miss. The
   legacy receiver cannot retry the same tick.
2. The acquisition radius is `0.74 m`, and the ball is not teleported to the
   player's centre when ownership is awarded.
3. Before that small contact window, the selected/intended player receives a
   bounded movement assist toward the ball. A strong opposite user input still
   overrides it.

That implements the tester's requested direction of assistance: player toward
ball first, ownership only at a genuinely close contact.

## Note-by-note disposition

| # | Tester observation | Evidence and disposition |
|---:|---|---|
| 1 | Backwards walk/jog for players and referee; individual referee FLARE | Valid presentation request, but not mixed into this possession/ball batch. It remains a later animation/referee-personality lane. |
| 2 | Pass weight/drag should accelerate then decelerate more | The log already shows strong physical deceleration: one pass falls from about `6.95` to `3.25` host units/frame over roughly `1.78 s`; another from `8.73` to `3.39`. Core Ball V2 drag was therefore not blindly increased. Re-test after the contact snap and visible-spin fixes, then tune from distance/arrival evidence if the glide remains. |
| 3 | CPU presser probably should have won the ball | Existing CPU defensive intents already issue press/cover/physical challenges. This specific owned-ball challenge was not proven to be a missing contact, so no speculative tackle boost was added. It remains a targeted next-log check. |
| 4 | Ball looked completely static during a pass | Fixed. The yellow ball mesh now rotates from actual world travel distance, with an airborne side-spin cue, instead of tiny velocity-based visual nudges. |
| 5 | CPU throw had no visible receiver / staging | The live receiver can now be assigned as a collector and move to the ball. Existing throw staging/route tests remain green, but CPU route choice itself still needs a clean re-test; it was not declared fully solved. |
| 6 | Ball magnetised to player from too far; use a yellow Nike ball | Contact fault fixed with the `0.74 m` V2 window, same-tick legacy suppression, player-to-ball assist and removal of the centre snap. The match ball is now a high-visibility yellow Total 90 Aerow-inspired procedural design. It intentionally does not copy licensed Nike artwork. |
| 7 | Pass should auto-switch to receiver | Fixed without enabling semi-assisted passing. If the authored pass has no assisted target, it now nominates a chase-only receiver along the unchanged trajectory and switches to that player. |
| 8 | Add a second keeper smother/sweep animation | The current working build already contains compact ground-save, forward-smother and sweep/claim variants from the goalkeeper presentation batch. This needs visual re-test rather than another unverified animation branch. |
| 9 | Pass weight and wrong receiver | Low-power through-ball selection now weights the requested stick lane more strongly. General drag was left evidence-led as described above. |
| 10 | Two passes should have gone to the other centre-back; do not enable semi-assist yet | The explicit “do not action semi-assist” instruction is preserved. Chase-only receiver nomination changes control selection, not the pass trajectory. Broader manual-pass aim assistance remains off. |
| 11 | Receiver should be pulled toward the ball | Fixed with bounded intended-receiver movement assistance before contact. Strong opposite input remains authoritative. |
| 12 | Missed touch was enjoyable | Preserved. No blanket removal of heavy/missed touches. |
| 13 | Two unpressured missed touches may be too frequent | The old legacy retry contaminated this sample. First Touch probability/technique tuning is deliberately deferred until the next authority-clean log; reducing error rates now would conceal whether the contact fix solved it. |
| 14 | Through-ball/run/first-touch/shot/save sequence was excellent | Preserved as a positive behaviour invariant. The current keeper animation set is broader, but smoothness remains visual tuning. |
| 15 | Strange second-half kickoff | Old CPU pass events logged `pace:0` before their next-tick Ball V2 launch, so the export could not honestly reconstruct the launch. CPU V2 passes now log their staged pace, loft, intent point and authority. The kickoff needs one new diagnostic-quality reproduction before tactical change. |
| 16 | Player again fought against collecting the ball | Fixed by the same player-to-ball assist and smaller possession window. |
| 17 | Chelsea striker did not collect; Kanté turned away | Neutral-ball authority now assigns exactly one eligible collector per team by deterministic ETA/awareness/pace, so shape does not collapse while the nearest suitable player attacks the ball. The owned-ball pressing part remains covered by CPU defensive intents and needs re-test. |
| 18 | Chelsea striker was not aiming for the ball | Addressed by the neutral-ball collector assignment. |
| 19 | Higher-power pass was better but glide remained | No blind friction change. Visible roll and removal of long-distance acquisition snapping change the two largest perceptual confounds; next log should provide distance/arrival evidence if glide remains. |
| 20 | Small through ball picked the wrong runner instead of the wide-right lane | Fixed: low-power through-ball scoring now penalises candidates away from the requested stick lane more strongly. |
| 21 | Chelsea CPU would not collect | Fixed by the per-team recovery assignment. |
| 22 | Three-angle replay was strong; first two unclear and too quick | All three complete replay passes are now 25% slower/longer: `[0.4, 0.4, 0.2]` instead of `[0.5, 0.5, 0.25]`. The third remains exactly half the speed of the first two and each pass retains the full frozen clip. |
| 23 | Reduce gain-possession distance | Fixed at the V2 `0.74 m` acquisition boundary. |
| 24 | CPU should recognise an available ball sooner | Addressed by deterministic ETA-based recovery assignment; next playtest verifies tuning rather than whether a collector exists. |
| 25 | Leaving the ball exposed nobody knew what to do | Addressed: ordinary low/slow neutral balls now create one recovery target for each team instead of leaving all players on shape targets. |

## Bounded implementation from this log

1. **Contact ownership:** First Touch V2 owns ordinary ground reception, even
   when it returns no contact; acquisition is limited to `0.74 m`.
2. **No possession teleport:** ownership no longer hard-snaps the ball to the
   footballer's centre.
3. **Player-to-ball assistance:** an intended human receiver is guided toward
   the loose ball while meaningful contrary input remains authoritative.
4. **CPU loose-ball awareness:** exactly one eligible outfielder per team is
   assigned to collect by deterministic ETA, awareness, pace, intended-target
   status and goal-side geometry.
5. **Receiver switching:** a manual pass can nominate a chase-only receiver
   without altering the user's pass trajectory or enabling semi-assist.
6. **Low-power through-ball selection:** requested-direction weighting is
   stronger for short through balls.
7. **Ball presentation:** high-visibility yellow procedural match ball and
   travel-derived visible rotation.
8. **Replay legibility:** full three-pass director package slowed to
   `0.4x / 0.4x / 0.2x`.
9. **CPU pass diagnostics:** staged Ball V2 pace, loft, authority and intent
   point are recorded instead of misleading zero-pace events.

## Deliberately not changed from ambiguous evidence

- Ball V2 ground drag/friction. The exported trajectories already decelerate
  materially; the next authority-clean log should determine whether the
  remaining complaint is physical or visual.
- First-touch error probabilities. The old dual reception path invalidated the
  frequency sample.
- A global/semi-assisted passing mode. The tester explicitly asked not to
  enable it yet.
- Tackle success or defender physical bonuses. The single pressing incident
  did not prove a missing legal challenge.
- Licensed Nike artwork. The result is an original Aerow-inspired procedural
  yellow design.
- Backwards locomotion/referee personalities. Those remain a separate visual
  lane, not silently claimed complete.

## Verification

- Focused and adjacent automated sweep: **301/301 tests pass**.
- This includes contact chronology/exact-once, First Touch, Aerial, Ball launch
  direction, Movement, CPU, Formation, receiver recovery, through-ball input,
  replay timing, Set-Piece, period handoff, Quick Play selection, shadow
  preservation and all frozen file pins.
- `git diff --check`: clean.
- Real in-app browser launch through Quick Play: strict FL V2 Single Player,
  visible yellow ball, `candidateTicks=1068`, `committedTick=1068`,
  `failureCode=none`, and zero warning/error console messages.

## Next playtest questions

1. Does possession now occur at the player's feet rather than from a visible
   gap?
2. Does the intended receiver naturally close the final metre without fighting
   the user's input?
3. When nobody owns a slow ball, does one sensible player from each side pursue
   it without the whole formation collapsing?
4. With visible ball roll and no acquisition teleport, does the remaining pass
   glide still feel wrong? If yes, the next log's distance/arrival data can tune
   Ball V2 rather than guessing.
5. Are unpressured missed touches still too frequent now that legacy reception
   cannot retry or overwrite the V2 result?
