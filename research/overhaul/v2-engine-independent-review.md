# V2 dormant-engine independent review

Date: 2026-08-11
Scope: `match-engine/ball-engine-v2.js`, `match-engine/cpu-intelligence-v2.js`, their unit suites, and the independent cross-engine suite.
Authority verdict: **dormant and additive; no existing gameplay or workflow changed.** Neither candidate is loaded or called by `match-engine/match.html`; Build 173 remains the only live authority.

## Outcome

The reviewed snapshot is green at the dormant-candidate boundary: **62/62 scoped executable tests pass** under bundled Node v24.14.0 (27 ball, 17 CPU, 11 independent cross-engine, 7 focused P2 safety/coordinate gates). The wider ball+CPU+cross+P2+unified-orchestrator promotion set is also **103/103 green** (the scoped 62 plus 22 canonical-orchestrator and 19 promotion-adversarial gates). CommonJS and plain-browser exposure coexist, repeated runs are deterministic, supplied player/event order does not change CPU decisions, and the two candidate globals remain separate.

Four P1 defects found during the adversarial review were fixed before this report was frozen and now have regression gates:

1. `groundEnabled: false` no longer allowed the ground-regime solver to create a support surface.
2. Ground skid/roll coupling no longer creates rotational energy independently of translational energy.
3. A moving keeper capture is treated as an active controlled attachment and inherits the hands velocity without the passive-energy clamp corrupting it.
4. Both reaction-delayed and already-persisting CPU run targets are re-clamped against the **current** offside line.

Six P2 findings were also closed with executable gates before this revision:

1. zero/absorbing restored ball random state is rejected;
2. explicit zero plane normals are rejected;
3. translating planes use cumulative relative motion across substeps/contact slices;
4. CPU carrier, possession-team and roster ownership must agree;
5. populated CPU replay memory is structurally and lifecycle validated;
6. CPU spatial constants use a declared 3176x2130 reference contract while public points remain in supplied pitch units, including decision equivalence on 105x68.

No P0/P1 defect remains in this bounded dormant review. This is not approval for shadow or live authority: adapter contracts, capture-based calibration and integration gates listed below still have to be completed.

## Directly verified invariants

### Ball candidate

- A non-zero explicit seed is required; there is no `Math.random`, wall clock or presentation clock in the candidate.
- Equal state/context/environment/config inputs replay byte-identically, including seeded knuckle perturbation.
- Fixed 240 Hz physics substeps are render-chunk invariant in tested flight cases.
- Drag, three-axis launch spin, vector Magnus, bounce, skid, roll, settle, swept plane/sphere/capsule collision, goal-frame collision, moving boot contact and keeper capture all have executable coverage.
- Passive bounce and the complete passive ground projection stay inside the configured combined translational-plus-rotational energy bound.
- Continuous rolling support does not increment `contactCount`, replace `lastContact`, or emit gameplay `contact`/`capture` events over 120 outer ticks.
- `outerTick`, `substepCount`, `elapsed` and `simulationTime` are distinct and deterministically reported. A controlled or settled ball consumes an outer tick and requested elapsed time while performing zero physics substeps.
- Restored random state cannot enter xorshift's absorbing zero state, explicit zero plane geometry fails closed, and a moving-plane collision matches the equivalent stationary-plane relative frame across multiple substeps.

### CPU candidate

- The decision boundary requires explicit monotonically advancing simulation ticks and a matching fixed-tick duration.
- Decisions are deterministic, JSON-safe and do not mutate the supplied snapshot or memory in tested cases.
- The run lifecycle is covered from perceived opening through reaction, commitment, persistence and abort on turnover.
- Current-line offside clamps are covered at initial bid, reaction-delayed commit, persisted commitment and reverse attacking direction.
- Rest-defence, stay-back roles, formation envelopes, one penetrating runner per lane, stable tie resolution and carrier shot/pass/carry/wait branches are covered.
- Telemetry exposes perception, bids, rejection reasons, transitions, constraint counts and carrier choice.
- Carrier/possession/team contradictions and malformed populated replay memory fail before decision advancement.
- Authored spatial constants and normalized measurements use the declared 3176x2130 reference pitch; canonical and proportionally mapped 105x68 snapshots produce equivalent decisions while returned/memory points stay in supplied units.

### Coexistence and authority

- The ball and CPU candidates expose independent browser globals and CommonJS APIs in the same process.
- Static and executable gates confirm `match.html` does not mention either candidate script or global.
- No test or reviewed module writes DOM state, installs input handlers, starts timers, or mutates the established match engine.

## Remaining risks and contract gaps

These are not failures of the current dormant gates, but they must be resolved or explicitly contracted before the relevant integration stage.

### P2 — resolve before shadow integration

1. **Ball adapter-state canonicalisation.** `createBallState` accepts combinations such as `regime: "flight"` with `grounded: true`, or `regime: "controlled"` with `grounded: true`. The shadow bridge must reject or canonicalise contradictory live snapshots rather than silently choosing authority (`ball-engine-v2.js:356-399`).
2. **Simulation-clock mapping.** A controlled/settled `step` advances `context.elapsed` and `outerTick` with zero integrated substeps; `advance` also stops early after capture/settle (`ball-engine-v2.js:1084-1165`). The adapter needs a written mapping for requested wall/simulation slice, integrated duration, stopped-ball ownership and replay restoration. Add an explicit integrated-duration field if downstream comparison requires it.

### P2 — resolve before live authority

1. **Active-contact energy envelope.** Moving boot contact is correctly classified as active, but the candidate presently permits any finite active energy gain. A calibrated launch/contact envelope, telemetry threshold and failure policy are required before live use.
2. **CPU tactical semantics.** Confirm whether the carrier may count toward `restDefenseMinimum` when its role is a defender/holder, and validate coordinated runs against the complete intended formation-behaviour contracts, not only the current synthetic fixtures.

### P3 — cleanup/clarify

- `ground.spinMatchRate` remains part of configuration but is not consumed by the coupled ground solver. Remove it or define its future role so tuning surfaces do not imply authority they lack.

## Required gates before shadow integration

1. A read-only live-to-v2 adapter with explicit units, axes, ball radius/mass, simulation tick, seed/state restoration, regime canonicalisation and ownership rules.
2. One-way shadow execution only: Build 173 supplies state; candidates may emit comparison telemetry but may not write ball/player state, clock, restart state, input state, replay state, camera, sound or online transport.
3. Golden snapshot/restore tests covering restart, replay, possession change, keeper control, settled ball, set pieces, pause and resumed simulation.
4. Preserve the now-green rejection gates for zero random state, carrier/team mismatch, malformed CPU memory and out-of-range configuration; add contradictory ball-regime canonicalisation at the adapter boundary.
5. Deterministic comparison logs that distinguish requested duration, integrated duration, outer tick, physics substeps and stopped-ball ownership.
6. A kill switch/default-off assertion plus a full existing Build 173 regression run proving identical outputs with shadow mode absent and present-but-read-only.

## Required gates before any live integration

1. Clean-room capture-derived calibration and held-out validation for launch speed/lift/spin, drag, Magnus, bounce, skid/roll, posts, bodies, boots, keeper hands and aerial contacts. Current green tests prove internal invariants, **not FIFA 20 equivalence or gameplay quality**.
2. Live-scale contact ordering and anti-tunnelling stress tests across players, posts, crossbar, ground and moving colliders, including simultaneous/near-simultaneous contacts.
3. CPU scenario corpus spanning every supported formation, both attack directions, defensive transitions, offside-line movement, cards, stamina, late-match state, set pieces and multi-run coordination.
4. Performance budgets on target browsers/devices and bounded telemetry cost.
5. A staged opt-in authority switch with replayable golden traces, instant rollback and no online/career/set-piece workflow removal.

## Evidence classification

- **Direct static evidence:** module comments/exports, `match.html` absence, validation and solver order in the cited source.
- **Executable evidence:** all 62 scoped passing tests and the 103-test wider unified promotion run.
- **Inference/risk:** adapter and live-integration hazards above; these are conservative review findings, not claims that the dormant modules currently alter gameplay.
- **Out of scope:** subjective feel, production performance, FIFA 20 equivalence, online transport, career-mode behaviour and live Build 173 tuning.
