# Build 173 live-shadow adapter V2 — independent attachment review

Date: 2026-08-11
Scope: read-only review of the unattached adapter and its pinned V2 dependencies.
Verdict on reviewed bytes: **NO-GO for attachment** until every red gate below passes.

## Reviewed artifact hashes

- `match-engine/build173-live-shadow-adapter-v2.js`: `40e69a6b8c1b1493b7e37d2143f90e7dbfb858ec805f2ef77028eddab1a10394`
- `tests/build173-live-shadow-adapter-v2.mjs`: `fb60965613f57e713fc59b60b2ed1890a5a0dabcb2f5fa8dced1d432a09e5b56`
- `tests/fixtures/build173-live-shadow-fixture.mjs`: `237032a87abd6382683ec7c8d2927afff07fbc77696da7abb7d427b3aeb16c3d`
- `research/overhaul/build173-live-shadow-adapter-v2-contract.md`: `6307a097c93e0c8e3c67e7a241d725608cb243bc76be083941adcbee9baf376d`

## Evidence

The existing adapter plus pinned orchestrator/adversarial suite passed `109/109`.
The representative 22-player, 180-tick run averaged `1.691 ms/tick`; its capped
16-record export was about `560,600` bytes. The independent red-gate test passed
`1/9` and failed `8/9` on the reviewed adapter, as intended.

Run the independent red gates with:

```sh
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test tests/build173-live-shadow-adapter-independent-adversarial-v2.mjs
```

## Red gates before promotion

1. `validateIdentity` must accept only exact `human`/`cpu` control ownership,
   require opposite `+1/-1` attacking directions, enforce unique slot IDs, and
   enforce exactly one goalkeeper per team directly. Current GK/slot corruption
   is rejected only incidentally by Formation V2.
2. `validateRawPlayer` must bound stamina to `0..100` (and document/enforce the
   intended attribute range). Current `-1` and `101` values validate.
3. CPU events must use the observation tick and the event player must belong to
   the declared event team. Tick `99` and a cross-team player currently validate.
4. Formation requests must derive `playerCount` and exact
   `unavailableSlotIds` from the active frame's outfield dismissals. An enabled
   capture with one sent-off outfielder currently reports 11 candidate targets.
   A goalkeeper dismissal must fail closed until replacement semantics exist.
5. Public telemetry must not include candidate signatures or candidate state
   labels. Remove `candidateSignature`, `candidatePeriod`, and `candidatePhase`;
   retain only aggregate errors/agreement booleans.
6. The clock contract and fixtures must cover all supported match lengths and
   use `90 / MATCH_LENGTH_MINUTES`, not a fixed `22.5`. Integration must maintain
   a shadow-only `gameplaySeconds` accumulator that advances only when the phase
   governing the legacy tick is live. Raw fractional `clockFrames` remains
   observational and cannot be promoted to gameplay time.
7. Put deterministic bounds on IDs, strings, arrays, events, commands,
   environment data, and exported bytes; make keyed lookups safe for crafted
   names and make cyclic/non-plain data fail closed. Record count alone is not
   a sufficient telemetry bound.

## Substitution and dismissal lifecycle

Current Build 173 substitutions at `match-engine/match.html:6242` mutate the
persona, attributes, role and stamina of an existing on-pitch slot object. Its
runtime `id` remains stable. A two-tick in-place substitution therefore passed
the adapter continuity gate. Host capture must deliberately use this stable
on-pitch slot identity. If a future substitution replaces an active ID, the
diagnostic must self-freeze without propagating an exception into gameplay.

Dismissed players remain in the exact 22-player host identity with
`sentOff: true`; movement/CPU already receive that availability flag. Formation
V2 must additionally receive the exact dismissed outfield slot IDs and active
count. A dismissed GK is not a valid outfield reduction and must self-freeze.

## Frozen attachment shape

- After `match-engine/match.html:108` and before the main IIFE at `:109`, use an
  exact parser-time gate for `v2Shadow=1`. Refuse known online URL markers before
  synchronously loading the pinned dependency order. Recheck decoded runtime
  online/config state and never instantiate online.
- At the sole 60 Hz simulation call at `match-engine/match.html:7029`, select a
  direct legacy update function once when disabled. When enabled, capture an
  immutable before frame, call the unchanged legacy `update()`, capture after,
  and observe. Every diagnostic error freezes only the shadow.
- Do not arm after `focusGame()` (`:842`): it moves all players into the tunnel
  and enters walkout at `:847`. At the actual post-walkout kickoff transition
  (`:4134`), reset/arm but skip that transition tick. The next fully playable
  update is adapter tick 1. Practice requires its own post-initialisation arm.
- Permit only the exact held-throw-in taker/ball staging apron at `:2161`, raw
  and unclamped. Do not broaden pitch bounds.
- Finish/freeze before `fulltime-presentation` at `:4167` can enter
  `beginFullTimeWalkin()` at `:4107`. Reset on a genuinely new match (`:414`,
  and the self-test `focusGame()` at `:7020`); do not reset at ordinary restarts
  or half-time kickoff.

No existing workflow is removed or reduced. Build 173 remains the sole live
authority; V2 has no projection, apply, command, or gameplay-output path.
