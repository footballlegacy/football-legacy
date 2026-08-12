# First-Touch Authority Adapter V2 contract

Status: dormant, additive, offline-only advisory adapter. It is not loaded or
called by `match-engine/match.html`, it does not edit an authority state, and it
does not authorize live or online promotion.

Implementation: `match-engine/first-touch-authority-adapter-v2.js`
Focused gates: `tests/first-touch-authority-adapter-v2.mjs`

## Purpose and ordered boundary

This adapter closes only the typed boundary between three already separate V2
candidates:

1. Movement V2 supplies the canonical same-tick receiver/opponent identities,
   teams, positions, velocities, facing and shared physical/control attributes.
2. Ball V2 supplies the canonical same-tick loose-ball position, velocity,
   spin, physical parameters and contact chronology.
3. First Touch V2 resolves detached contact geometry, timing, pressure, quality
   and its next Ball V2 candidate.
4. The adapter emits one advisory exact-once contact/possession handoff. A
   separate authority may validate and consume that handoff later; this module
   cannot apply it.

The required coordinate declaration is
`si-metres-centred-pitch-positive-z-up`. `tick`, Movement `world.tick` and Ball
`lastOuterTick` must be the same positive fixed-simulation tick, and Movement
and the adapter must use the same explicit `fixedTickSeconds`.

## Capability and dormancy

The adapter accepts only factory-issued capabilities carrying the exact
acknowledgement
`EXPLICIT_DORMANT_OFFLINE_FIRST_TOUCH_AUTHORITY_ADAPTER_V2`. The issued object
is identity-checked through a private `WeakSet`; a structurally identical forged
object is rejected.

Allowed contexts are limited to:

- `offline-v2-lab`;
- `set-piece-suite`; and
- `shadow`.

The capability and request both prohibit online/live authority. The public API
has no apply, commit, consume, mutation, DOM, input, renderer, timer, random,
network or asynchronous surface.

## Canonical input contract

The request must contain:

- the adapter request schema, workflow, offline flag, SI coordinate declaration,
  fixed tick and deterministic seed;
- one complete, canonical Movement V2 world containing 2..22 players in stable
  ID order and exactly two stable teams;
- one receiver ID referencing that world;
- one complete current Ball V2 state synchronized to the same tick;
- one exact authority-roster eligibility record using
  `football-legacy-first-touch-roster-eligibility-v2`, bound to the same tick,
  receiver ID and team, with `sentOff:false`, `available:true` and
  `contactEligible:true`;
- an identity/team-bound receiver profile supplying only `technique` and
  `awareness`, the two First Touch attributes absent from Movement V2;
- explicit optional opposing pressure-player IDs from the same Movement world;
- First Touch intent, timing offset and optional body technique; and
- a bounded optional ledger of already-consumed adapter handoff IDs.

Movement remains authoritative for control, balance, agility, strength,
position, velocity, facing, identity and team. The supplemental profile cannot
override those fields. Pressure snapshots are built only from canonical
Movement opponents, then sorted by stable ID.

Movement presence alone is not contact eligibility. Dismissal and availability
belong to the authority roster, so a missing, stale, identity/team-mismatched,
sent-off, unavailable or contact-ineligible roster record fails closed. The
record has an exact seven-field shape; aliases and additional eligibility
fields are rejected rather than merged.

The entry state must have exactly one loose ball: Movement `ballOwnerId` is
`null`, every player has `hasBall:false`, and Ball V2 cannot already be in its
`controlled` regime. A first-touch adapter is not allowed to overwrite an
existing possession owner. A Ball whose `lastContact.outerTick` is equal to or
later than the request tick is also rejected: a detached same-tick contact
candidate cannot be re-fed as a fresh contact opportunity.

All input is bounded plain JSON data. Cycles, accessors, symbols, reserved
prototype keys, non-finite data, unsafe IDs, oversized graphs, out-of-range SI
state, mismatched ticks/teams/identities, below-ground ball centres and receiver
speed outside First Touch's output envelope fail closed.

## Handoff contract

A miss returns `status:"no-contact"` and no handoff. It cannot nominate an
owner or change the Ball state.

A controlled, retained or loose contact returns `status:"pending"` and one
deeply frozen handoff containing:

- a stable `first-touch-v2:<tick>:<digest>` ID and `exactOnce:true`;
- Movement-world and input-ball precondition digests;
- expected tick, prior contact count, prior `ballOwnerId:null`, receiver ID and
  team;
- the complete detached post-contact Ball V2 candidate and contact metadata;
- a controlled receiver as an advisory `ownerCandidateId`, or `null` with
  `remain-loose` for retained/heavy touches; and
- a source-telemetry digest, `advisoryOnly:true` and `liveApplied:false`.

The result never returns a mutated Movement world. It exposes only detached
source telemetry and the advisory handoff.

## Exact-once replay and rollback

The handoff ID is derived deterministically from one immutable pre-contact
authority identity:

- workflow and fixed simulation tick;
- fixed tick duration;
- Ball ID and pre-contact count; and
- receiver player ID and team ID.

The identity uses schema
`football-legacy-first-touch-contact-identity-v2` and is returned both on the
adapter result and in the handoff preconditions. Seed, caller pressure subset,
First Touch outcome, telemetry and all post-contact state are deliberately
excluded. They may change the attempt digest, but cannot mint a second handoff
for the same authority contact opportunity. Replaying the same snapshot returns
byte-identical output and the same ID.

If that ID is present in the caller's rollback-owned
`consumedHandoffIds` ledger, the adapter returns
`status:"already-consumed"`, preserves the candidate ID for audit, and emits no
second handoff. Restoring the earlier ledger as part of rollback restores the
original pending output exactly. The ledger is explicit caller state; the
adapter keeps no hidden mutable history.

## Deterministic regression fixtures

The module exports fresh fixtures for:

- clean controlled reception and advisory acquisition;
- close pressure producing a heavy touch with no owner;
- movement away from the ball producing a geometry miss;
- custom Ball V2 inertia with passive true-energy safety; and
- replay, duplicate-ledger suppression and rollback restoration.

## Freeze and promotion boundary

The focused suite gates CommonJS/browser coexistence, exact dependency schemas,
factory-issued capability identity, live dormancy, clean/pressured/missed/custom
inertia fixtures, canonical identity/team/possession/tick/SI validation,
pressure-order invariance, hostile inputs, deterministic deep-frozen output and
replay/rollback exact-once behavior.

This adapter remains frozen as a dormant foundation only. Its bytes still own
none of the responsibilities below.

The separately sealed Offline V2 authority-kernel candidate version
`2.4.0-offline-cpu-integration-authority-candidate` now performs the first reviewed
consumer transaction, and only inside its capability-gated offline state. It:

- runs Ball integration first, then translates the kernel's axis-aligned pitch
  into this adapter's centred-SI frame;
- supplies explicit roster eligibility and a rollback-owned exact-once ledger;
- validates the result/handoff authority, snapshot digests, contact identity,
  prior owner/count/tick, complete detached Ball candidate and advisory owner;
- translates the accepted Ball candidate back to pitch space; and
- atomically commits Ball contact/last touch plus, only for
  `candidate-acquire`, one matching Movement/Ball owner.

Any validation failure rolls back the whole kernel tick. A heavy/retained touch
may commit Ball contact while remaining loose, but cannot partially commit
possession. The standalone Offline V2 playable slice consumes that sealed
kernel. Normal `match.html`, Build 173 and online authority remain untouched.
Animation/replay-video/online coordination and any live promotion remain
outside both this adapter and the sealed offline consumer.
