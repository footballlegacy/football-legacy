# Build 173 Foundation / Build 174 FL V2 Offline Playtest Workflow

Status: exact-flag read-only shadow integration plus a release-gated
`offline-opt-in` promotion. Build 173 remains the default authority everywhere.
FL V2 can become authoritative only when it is explicitly selected in Quick
Play for offline Single Player, CPU versus CPU, or the Set-Piece Suite and the
query, payload, workflow, version, and deterministic seed agree exactly. CPU
versus CPU additionally requires zero human owners, both teams assigned to the
CPU, and one exact `autoplay=1` marker. All other workflows, including every
online route, remain Build 173-authoritative.

## Current implementation checkpoint — 2026-08-12

- F0 is frozen with a machine-checked baseline manifest and protected-workflow
  matrix.
- F1 now has an evidence-claim ledger, lawful FIFA 20 video/input capture,
  immutable source hashes, alignment/exclusion manifests, and reproducible
  analysis. The full controlled calibration/holdout shot-contact matrix is
  still incomplete, so captured passing-heavy footage is not used to fit ball
  coefficients.
- F2-F8 engines now exist for deterministic ball flight/contact,
  movement/tackles, first touch, aerial contacts, boundary/restart decisions,
  match time, set pieces, formation/team behaviour, CPU decisions, restart
  presentation, and their unified transaction composition. They remain dormant
  unless an exact supported opt-in passes preflight.
- A sealed multi-engine offline lab and pure-state authority candidate exercise
  the ordered loop without owning any ordinary match workflow. A separate
  engineering-canvas integration harness exposes that candidate only after the
  exact `offlineV2=1` flag and an explicit Start action. It is a developer
  diagnostic, not a Football Legacy playtest build and must not be presented as
  one.
- The normal Quick Play surface now owns the playable promotion. Its Gameplay
  Engine selector defaults to `Build 173 · Stable`. Selecting
  `FL V2 · Strict Offline Playtest` is accepted only for Single Player
  (`single-player`), CPU v CPU (`spectator` -> `cpu-v-cpu`), and the Set-Piece
  Suite (`free-kick-suite` -> `set-piece-suite`). Co-op,
  Home Co-op, online, and every unsupported mode visibly remain on Build 173.
- The FL V2 launch contract carries the exact engine request and a deterministic
  positive uint32 seed in both the Quick Play payload and the match URL. The
  match page fails closed on missing, duplicate, contradictory, online, shadow,
  unsupported, malformed, or seed-mismatched markers before loading any live V2
  authority module.
- Single Player and CPU v CPU compose movement, CPU, formation, ball, first
  touch, aerial and protected contact handling with the match-control
  transaction. CPU v CPU preserves its external workflow identity while both
  teams remain CPU-controlled and no human input can enter the authority tick.
  The Set-Piece Suite uses the same match-control, clock, restart, coordinate
  and suite contracts without claiming the normal-match gameplay adapter.
- Candidate host changes are prepared, applied, finalized, and receipted as one
  outer tick. A fault restores the captured host state, rolls back candidate
  ledgers, disables further simulation, and opens a blocking diagnostic with
  export, V2 restart, and setup-exit actions. An opted-in V2 match never
  continues as Build 173.
- The Build 173 observation adapter and host capture passed independent review
  and are attached behind the exact `v2Shadow=1` flag. The default path loads
  none of the V2 comparison stack; online-marked URLs freeze it before loading;
  the accepted path is telemetry-only and cannot project or apply candidate
  state to Build 173.
- Real-browser checks verified the exact-flag load, online freeze, ordinary
  Build 173 isolation, keyboard interaction in the playable slice, and a locked
  no-flag slice. With the browser stress tabs closed, the representative
  22-player 180-tick read-only comparison averaged 1.627 ms per tick and its
  bounded-trace gate passed.
- The protected Create-a-Club gate also passes when run without concurrent live
  browser matches: both entry rules and full grassroots/professional career
  generation completed. This preserves Create-a-Club rather than treating an
  earlier contention timeout as a workflow regression.
- Quick Play remains the real shared playtest surface for team selection,
  Single Player, CPU v CPU, Set Piece Suite, local two-player and Home Co-op.
  The three exact offline opt-ins use that existing surface; no parallel
  replacement match UI was introduced.
- The authority ladder below remains binding. Passing module tests does not
  widen the three-workflow authority scope or change the Build 173 default.
- Final release hash sealing is complete. Frozen-byte real-browser proof is
  complete for Single Player and CPU versus CPU; the Set-Piece Suite still
  needs its final confirmation. Protected regression gates, publication, and
  public-asset verification remain mandatory before this checkpoint can be
  called published.

## Non-removal contract

The overhaul is additive until an explicit migration gate is approved. It must not reduce, bypass, silently re-route, or delete any existing workflow while the replacement systems are being researched, built, or calibrated.

Protected workflows:

- Single Player and Quick Play.
- Local two-player and Home Co-op.
- CPU versus CPU.
- The existing online-versus path, which stays frozen while offline foundations change.
- Keyboard, DualSense, generic gamepad, controller switching, pause, restart, replay, and diagnostics.
- Normal-match free kicks, corners, penalties, throw-ins, goal kicks, and kick-offs.
- The Set-Piece Suite, whose internal compatibility route remains `free-kick-suite`.
- Career Mode, Create-a-Club, and Player Career. Player Career may be archived only in a separate, explicit future change; it is not removed here.
- Existing team, formation, tactics, stadium, kit, historic-team, and save-data inputs.
- Existing self-tests, playtest exports, and direct offline diagnostic links.

The temporary free-kick replay queue was an observation tool, not a permanent
match rule. It has now been removed in a separate machine-gated change. The
ordinary dead-ball, goal, free-kick-goal, free-kick-shot, and practice replay
routes remain protected; repeatable experimentation belongs in the dormant Set
Piece Suite candidate.

## Authority ladder

Only one rung may be authoritative at a time:

1. `legacy`: Build 173 behavior remains the game.
2. `shadow`: the candidate engine receives copied launch/contact inputs and logs its predicted result, but cannot move the live ball.
3. `suite-opt-in`: the Set Piece Suite can choose legacy or candidate physics for controlled comparison. This is active only through the explicit Quick Play selector.
4. `offline-opt-in`: selected offline modes may opt in after suite gates pass. This is active only for Single Player and CPU versus CPU Quick Play.
5. `migration candidate`: every protected workflow passes a recorded compatibility matrix.
6. `authoritative`: requires Joshua's explicit approval after blind/holdout playtesting.

No phase may infer approval for the next phase.

## Foundation order

### F0 — Freeze and inventory

- Preserve a Build 173 reference snapshot and record hashes for authoritative files.
- Inventory every launch, integration, collision, restart, replay, clock, and controller entry point.
- Record current self-test and mode-link baselines.
- Mark online gameplay as frozen rather than attempting to improve it alongside the offline overhaul.

Exit gate: reproducible baseline and protected-workflow matrix exist.

### F1 — Evidence and capture

- Maintain a claim ledger that distinguishes official FIFA 20 evidence, later EA lineage, public physics evidence, direct observation, hypothesis, and unknown proprietary detail.
- Capture owned FIFA 20 behavior lawfully through Remote Play or console recordings.
- Store controller settings, player/ball context, camera, frame rate, input recipe, and source hash beside each capture.
- Split calibration and holdout samples before coefficient fitting.

Exit gate: the minimum launch, flight, bounce, skid, roll, post, wall, keeper, and first-touch matrix is populated and validated.

### F2 — Stable contracts, no tuning

Introduce dormant interfaces for:

- launch intent and resolved launch state;
- ball state `(position, velocity, orientation, angular velocity)`;
- contact manifold and material profile;
- deterministic simulation context and seeded variation;
- per-step trace and outcome metrics.

The interfaces may be loaded by the page, but they must not alter live Build 173 behavior.

Exit gate: deterministic unit tests pass and legacy-match signatures remain unchanged.

### F3 — Candidate flight in shadow

- Fixed simulation time step with bounded substeps.
- Gravity, aerodynamic drag, vector Magnus lift, angular decay, and optional deterministic knuckle perturbation.
- Coefficients are bounded surfaces over speed/spin regimes, not copied constants.
- Reverse Magnus stays disabled until direct observations justify it.
- Every candidate step is traceable and replayable from the same seed.

Exit gate: calibration error improves without degrading holdout error or determinism.

### F4 — Candidate contact and ground regimes in shadow

- Separate impact, skid, rolling, and settled states.
- Surface/contact profiles for grass, player body regions, boots, wall, goal frame, keeper hands, and net.
- Continuous or substepped collision checks for fast balls.
- Energy and momentum sanity bounds, with explicit gameplay clamps where physical fidelity alone feels wrong.

Exit gate: no tunnelling in the test envelope; bounce, skid, roll, post, wall, and body-contact gates pass.

### F5 — Locomotion, touch, tackle, and aerial contracts

- Ordered pipeline: locomotion -> collision/contact -> first touch -> action/contact window -> ball launch -> flight -> secondary contact -> outcome.
- Repair standing-tackle input visibility and animation acknowledgement.
- Improve tackle reach, timing, ball-winning windows, and deflection without making tackles magnetic.
- Make volley, half-volley, header, and aerial-shot contact states executable and observable.
- Improve free-kick run-up timing without coupling the animation directly to aerodynamic coefficients.

Exit gate: action acknowledgement, contact timing, and outcome suites pass before gameplay tuning is split across contributors.

### F6 — Match-time contract

- One simulation-time authority.
- Live-ball play uses FIFA-style accelerated presentation time.
- Dead-ball sequences, out-of-play transitions, and set-piece preparation use real-time presentation.
- Presentation time never decides a collision, restart, advantage, foul, or ball outcome.

Exit gate: identical input traces give identical gameplay results under different presentation/render rates.

### F7 — Set Piece Suite

- Rename Free Kick Suite to Set Piece Suite.
- Hidden menu toggled by Options/Escape.
- Direct scenarios for left corner, right corner, penalty, and free-kick locations.
- D-pad Up in the penalty area can stage a penalty in suite mode only.
- Copyable/exportable raw log containing input recipe, launch state, trajectory, contacts, outcome, settings, build, engine, and seed.
- Preserve all normal-match set-piece workflows.

Exit gate: controlled A/B comparison, export, replay, and every ordinary set-piece route pass.

### F8 — Formation behavior contracts

- Audit every supported position and formation.
- Define defensive shape, attacking shape, transition anchors, width, depth, rest defence, pressing triggers, and role constraints.
- Add philosophy/team overlays only after the neutral formation contract works.
- Use imported historic teams such as the Invincibles, Conte Chelsea, and a future BBC-era Real Madrid sample to calibrate overlays rather than hard-coding formations to one team.

Exit gate: neutral contracts pass before team-specific philosophy tuning.

### F9 — Controlled migration

- Suite opt-in plus Single Player and CPU versus CPU offline opt-ins are now
  wired behind the exact Quick Play engine-selection contract. Build 173
  remains selected by default.
- Never use online play as the first integration environment.
- Compare legacy/candidate traces and human ratings.
- Run protected-workflow, performance, determinism, save-data, controller, replay, restart, set-piece, clock, and mode-link gates.
- Keep same-tick transaction rollback, but enforce a strict V2 stop after any
  authority fault. Build 173 may be chosen before kickoff; it is not a hidden
  mid-match continuation path for an opted-in V2 playtest.

## Safe parallel-work boundary

Parallel work is safe now for evidence, capture tooling, deterministic candidate modules, test fixtures, data schemas, and formation inventory. It is not safe to independently tune free kicks, corners, penalties, tackles, volleys, or AI against the legacy ball model while the authoritative ball/contact/locomotion contracts are still changing.

Each contributor must own separate files, use the same contracts, avoid live integration, and hand back tests plus an evidence note. Runtime integration remains single-owner until F5 is stable.

## Create-a-Club future contract

Create-a-Club remains available. Its later gameplay design should support three presets:

1. Grassroots: manager plus roughly ten mates, local free agents, and a ground-up league path.
2. Established: a stable club roughly two divisions below the top level.
3. Elite: a top-flight Arsenal/United/Madrid-adjacent club.

For the grassroots preset, the local pub and social media initially replace the conventional transfer market. Repeated use inside a short window can reduce recruitment appeal and, if habitual, contribute to an `overbearing` manager trait. Division structure and balancing are deferred until the world/career loop is audited.

## Definition of done

The overhaul is not done when a new ball looks impressive in one free kick. It is done only when the evidence is auditable, the simulation is deterministic, holdout behavior is credible, the complete protected-workflow matrix passes, rollback works, and explicit migration approval has been given.
