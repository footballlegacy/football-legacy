# Build 174 Candidate 5 — FL V2 foundation and release workflow

Status: FL V2-only playable authority, approved 13 August and refreshed for Candidate 5 on 14 August 2026.

The earlier shadow, suite-opt-in and offline-opt-in stages are complete historical migration stages. They are not engine choices in Candidate 5. FL V2 is fixed as the sole playable match authority.

The binding policy is `research/overhaul/fl-v2-only-playable-authority-2026-08-13.md`; the machine-readable scope is `research/overhaul/protected-workflows.json`.

## Current playable scope

Candidate 5 can launch only:

- Single Player.
- CPU versus CPU with zero human owners, both teams assigned to the CPU and the exact autoplay contract.
- Set-Piece Suite.

Local two-player, same-team Home Co-op and Online Versus are unavailable until their complete V2 authority and release gates exist. They must be visibly unavailable and must not launch a previous build, silently change mode or construct a legacy gameplay envelope.

Career Mode, Create-a-Club, Player Career and the creation/data tools remain independent protected workflows. Any transition from those areas into a match must enter through the exact V2 contract.

## Current implementation checkpoint — 13 August 2026

- F0 retains the machine-checked baseline manifest and protected-workflow matrix as provenance.
- F1 retains the evidence-claim ledger, lawful FIFA 20 video/input capture, immutable source hashes, alignment/exclusion manifests and reproducible analysis. Passing-heavy footage is not misrepresented as a complete coefficient-fitting set.
- F2-F8 provide deterministic ball flight/contact, movement/tackles, first touch, aerial contacts, boundary/restart decisions, match time, set pieces, formation/team behaviour, CPU decisions, restart presentation and unified transaction composition.
- Single Player and CPU versus CPU compose movement, CPU, formation, ball, first-touch, aerial and protected-contact handling with the match-control transaction.
- Set-Piece Suite composes match control, clock, restart, coordinate and suite contracts without widening authority to unsupported modes.
- Candidate host changes are prepared, applied, finalized and receipted as one outer tick. A fault restores captured host state, rolls back candidate ledgers, disables further simulation and opens the blocking V2 diagnostic.
- Candidate 5 keeps pass direction, power and timing player-authored while providing bounded meeting-point assistance. Aerial miscontrols can produce reaction-rated recontrol attempts without granting possession.
- The normal Quick Play surface remains the shared setup for teams, lineups, tactics, kits, stadium, weather and supported match modes. The engine is fixed rather than selectable.
- Candidate 5 cache isolation uses `candidate=5` and `174-fl-v2-final-candidate-5`; neither marker changes authority or deterministic seed.
- Publication still requires frozen-byte regression checks, reviewed commit/merge and direct verification of the hosted assets.

## Exact launch and failure boundary

The Quick Play package and URL must agree on:

- `engine=fl-v2` and the matching requested/effective payload values;
- one of the three eligible runtime workflow identities;
- offline ownership appropriate to that workflow;
- a deterministic positive uint32 seed;
- exact all-CPU ownership plus `autoplay=1` for CPU versus CPU;
- the Candidate 5 cache marker where required for byte isolation.

Missing, duplicate, contradictory, online, shadow-only, unsupported, malformed, stale or seed-mismatched input fails closed before simulation. A raw or bookmarked `match-engine/match.html` page is not a playable shortcut.

After launch, the V2 transaction may either commit or stop. On failure it rolls back the candidate tick and blocks behind export, V2 restart and setup-exit actions. No previous-engine tick may run before the stop or after it.

## Preserved engineering provenance

The migration does not require cosmetic renaming of every internal symbol. Build 173 or legacy names may remain only as:

- immutable baseline hashes and recovered-source provenance;
- host-shape adapters used by the V2 composition layer;
- read-only shadow/comparison evidence and diagnostic fixtures;
- regression tests and rollback sentinels;
- clearly marked historical release notes.

These internals do not create a playable engine. Any dormant module header that still describes Build 173 as selectable, default or authoritative is superseded by the current V2-only contract.

The separate FL V1.5 forensic archive remains untouched. It is not a Candidate 5 fallback or a source of runtime authority.

## Protected release behaviours

Within the three released modes, the following remain protected:

- keyboard, DualSense and generic gamepad input;
- controller switching and disconnect/reconnect acknowledgement;
- pause, resume, restart, replay, diagnostics and full-time;
- free kicks, corners, penalties, throw-ins, goal kicks and kick-offs;
- team, formation, tactics, stadium, kit, historic-team and save-data inputs;
- deterministic self-tests and playtest exports;
- transactional rollback followed by a strict V2 stop.

Unavailable modes are protected differently: their unavailable state, absence of launch authority and absence of legacy fallback are the required behaviours.

## Historical migration record

The authority ladder used to build V2 was:

1. `legacy`: the recovered baseline remained the game.
2. `shadow`: candidate systems observed copied state without applying it.
3. `suite-opt-in`: controlled set-piece experiments could select the candidate.
4. `offline-opt-in`: supported offline workflows could explicitly choose V2.
5. `migration-candidate`: protected gates were evaluated as a release set.
6. `authoritative-v2-only-playable`: V2 became the fixed match authority.

Candidate 5 occupies rung 6. Rungs 1-5 remain useful provenance, not user-facing runtime choices.

## Foundation record

### F0 — Freeze and inventory

The recovered baseline, authoritative file hashes and workflow inventory provide the comparison boundary. They remain immutable evidence rather than a playable menu option.

### F1 — Evidence and capture

Claims distinguish official FIFA 20 evidence, later EA lineage, public physics evidence, direct observation, hypothesis and unknown proprietary detail. Calibration and holdout samples remain separated before coefficient fitting.

### F2-F4 — Deterministic state, flight and contact

Stable launch, ball, contact, deterministic-context and trace contracts underpin fixed-step flight, bounded substeps, gravity, drag, Magnus response, spin decay, impact, skid, rolling and settled regimes. Tests retain tunnelling, energy, momentum, determinism and holdout gates.

### F5 — Movement, touch, tackle and aerial order

The ordered authority remains locomotion, collision/contact, first touch, action/contact window, ball launch, flight, secondary contact and outcome. Standing tackles, slide outcomes, volleys, headers, aerial finishes and recontrol attempts must be observable and rating-bounded.

### F6 — Match time

One simulation-time authority decides gameplay. Presentation time may accelerate live-ball football and use real-time dead-ball staging, but it cannot decide collisions, restarts, advantage, fouls or ball outcomes.

### F7 — Set-Piece Suite

The suite provides direct free-kick, corner and penalty scenarios plus deterministic export/replay. It remains isolated from normal-match award and restart rules.

### F8 — Formation and CPU behaviour

Neutral positional contracts define defensive shape, attacking shape, transition anchors, width, depth, rest defence, pressing triggers and role constraints. Historic-team overlays calibrate those contracts without hard-coding the entire engine to one team.

### F9 — V2-only release

The release gate removes user-accessible previous-build selection and fallback, disables unsupported modes, verifies every old launcher/direct route fails closed, runs the protected matrix on frozen bytes, then publishes through a reviewed merge and verifies GitHub Pages directly.

## Safe parallel-work boundary

Evidence, capture tooling, deterministic modules, fixtures, data schemas and formation analysis can proceed in separate files behind shared contracts. Changes that alter live authority, contact order, launch validation or supported-mode scope require one integration owner and the complete focused regression set.

## Restoring an unavailable mode

Local two-player, Home Co-op or Online may return only when the mode:

1. has a complete V2 ownership and simulation contract;
2. passes its controller, lifecycle, deterministic, restart, replay and failure gates;
3. cannot enter a previous-engine path through UI, URL, payload or cached assets;
4. receives an explicit release change.

Retained UI, transport code or historical test coverage alone is not sufficient.

## Create-a-Club future contract

Create-a-Club remains available. Its later gameplay design should support three presets:

1. Grassroots: manager plus roughly ten mates, local free agents and a ground-up league path.
2. Established: a stable club roughly two divisions below the top level.
3. Elite: a top-flight Arsenal/United/Madrid-adjacent club.

For Grassroots, the local pub and social media initially replace the conventional transfer market. Repeated use inside a short window can reduce recruitment appeal and, if habitual, contribute to an `overbearing` manager trait. Division structure and balancing remain deferred until the world/career loop is audited.

## Definition of done

The overhaul is not complete because one free kick or one through-ball sequence looks impressive. It is complete only when the evidence is auditable, simulation is deterministic, holdout behaviour is credible, the protected workflow matrix passes, rollback and strict-stop behaviour are proven, unsupported modes cannot fall back, the reviewed release is merged and the hosted Candidate 5 bytes are verified.
