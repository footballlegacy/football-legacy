# First-Touch Authority Adapter V2 independent adversarial review

Date: 2026-08-11
Reviewed status: repaired dormant candidate
Independent decision: **GREEN — freeze as dormant only; do not promote live**
Live authority: absent and not attempted

The first independent pass was RED: 12/16 assertions passed and four failed
across three P1 classes. The adapter, its contract and its canonical tests were
then repaired without deleting or weakening any independent assertion. This
record is GREEN only because the unchanged adversarial behaviors now pass.

No edit was made to First Touch V2, Ball V2, Movement V2, the offline authority
kernel or `match-engine/match.html`.

## Closed findings

### Closed P1 — receiver eligibility is now explicit authority input

Every request now requires one exact seven-field authority-roster record using
schema `football-legacy-first-touch-roster-eligibility-v2`. It is bound to the
request tick, receiver identity and team, and requires:

- `sentOff:false`;
- `available:true`; and
- `contactEligible:true`.

Missing, aliased, additional, stale, identity/team-mismatched, sent-off,
unavailable or contact-ineligible records fail closed. The Movement player
being present is no longer treated as sufficient eligibility evidence.

### Closed P1 — same-tick contacted Ball re-feed is rejected

A Ball carrying `lastContact.outerTick` equal to or later than the adapter tick
cannot enter a new contact opportunity. Re-feeding the loose heavy-touch Ball
from the first handoff at the same tick now fails before First Touch V2 can mint
a second contact or increment its contact count.

### Closed P1 — exact-once identity is stable pre-contact authority state

The handoff ID now derives from a typed pre-contact identity containing only:

- workflow, fixed tick and fixed tick duration;
- Ball ID and pre-contact count; and
- receiver ID and team.

Seed, pressure subset, First Touch outcome, telemetry and post-contact state are
not part of that identity. They remain visible through the attempt digest and
result, but cannot produce another pending handoff after the authority-owned
contact ID is consumed. Both the seed and pressure-subset bypass assertions now
return the original candidate ID with `status:"already-consumed"` and no
handoff.

The result and handoff preconditions carry the exact same frozen contact
identity and digest for audit.

## Retained passing boundaries

The independent suite still confirms that the repaired bytes:

- lock the declared Movement, Ball and First Touch versions/schemas;
- fail when browser dependencies are absent;
- reject structurally forged and workflow-mismatched capabilities;
- reject missing receiver and profile identity/team substitution;
- reject existing Movement ownership, stray `hasBall` and Ball `controlled`
  regime;
- enforce SI coordinate and Movement/Ball/fixed-tick continuity;
- keep identical replay byte-stable and restore pending state under rollback;
- make pressure order invariant while rejecting duplicate/team-invalid rows;
- reject getters without invoking them, cycles, reserved keys and symbols;
- reject huge finite values before non-finite derivation;
- produce finite, deeply frozen, bounded advisory output; and
- remain absent from `match.html`, with no apply, commit, consume or live
  authority function/output.

## Gate result

- canonical adapter suite: **19/19 passed**;
- unchanged independent adversarial behaviors: **16/16 passed**;
- combined Movement + First Touch canonical/independent + adapter
  canonical/independent coexistence gate: **98/98 passed**;
- failures, skips and todos: **0**.

## Reviewed hashes

- adapter: `fbbea7ff774015fff32806c32eeb012e23ff2197f86470d4441a9aec27ea4c3e`
- canonical adapter tests: `e979be99d17e590808ca225cb5c091d0ac50111107f73f3644d7425d1e3e3df7`
- independent adversarial tests: `60908d9486cf8b2bed1d3638c9666c972c234dcbc81631190f13636a6b81f5e4`
- adapter contract: `e2a40b23ffac9de1a42dd810c2d588d269d549a794f63c5a3a88cb10d445987d`
- Movement V2: `72df57ceaf2eab4d7eae46360a21cd6f1c1d9187d5efeefe2c033ad3d9fa864f`
- Ball V2: `4084ff8968859af2a4149703ce02eb37e0691fa20a542dbc97d793c33342c504`
- First Touch V2: `da75f9cc3ab3458df67c08f7868e45ae2c8d4ad1ef50ff07c78c3c100370b77d`

## Freeze and remaining promotion boundary

No P0 or P1 remains inside the reviewed dormant adapter boundary. It is GREEN
to freeze as an offline advisory foundation.

Live promotion is still intentionally blocked: a separately reviewed authority
transaction must derive/validate the eligible pressure set, atomically validate
Movement/Ball/roster preconditions, consume the handoff inside rollback state,
commit possession/contact exactly once, and coordinate replay, animation and
online authority in the sealed tick order. The adapter exposes none of those
operations, and this review does not authorize adding them.
