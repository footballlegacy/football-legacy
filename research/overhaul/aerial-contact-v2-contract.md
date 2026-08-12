# Aerial / Volley Contact V2 contract

Status: dormant deterministic candidate, not live gameplay authority
Implementation: `match-engine/aerial-contact-v2.js`
Focused gate: `tests/aerial-contact-v2.mjs`

## Purpose and boundary

Aerial / Volley Contact V2 resolves one proposed contact at one fixed simulation tick. It answers four separate questions in a fixed order:

1. Which supported technique applies?
2. Can the actor physically and temporally reach the ball with that technique?
3. Does a valid opponent win or block the contact?
4. If the ball is contacted, what deterministic Ball Engine V2 launch intent follows?

The module does not animate a player, advance the ball, award a shot, update possession, choose a live target, play audio, render UI, or mutate match state. It is a pure candidate resolver. A future adapter may consume its commands only after a separately reviewed live-authority integration.

The module is dormant by construction:

- `match.html` does not load or name it.
- resolution requires the exact `enable-aerial-contact-v2-shadow` grant;
- the capability and request must both identify `aerial-contact-shadow` and `candidate-observer`;
- the capability is session-bound and has the scope `aerial-contact-v2-shadow-only`;
- every result, event, telemetry record, and launch metadata block is marked `shadowOnly: true`;
- no normal-match, online, career, set-piece, replay, controller, clock, or presentation workflow is changed.

These are capability boundaries, not a cryptographic permission system. Live integration must remain an explicit code change and cannot be inferred from the presence of this file.

## Determinism and time

The resolver accepts only integer simulation ticks:

- `inputTick`: when the contact input was armed;
- `contactTick`: the proposed physical contact tick;
- `simulationTick`: the enclosing authoritative simulation tick.

The required ordering is `inputTick <= contactTick <= simulationTick`. Each technique has a fixed wind-up. The strike tick is `inputTick + windupTicks`; its signed difference from `contactTick` is the timing error. Presentation time is never read and cannot affect the result.

The resolver has no random source, wall clock, animation frame, timer, DOM, Three.js, Cannon, network, or asynchronous dependency. Identical JSON-safe inputs and capability produce byte-identical exports. Opponents are sorted by stable ID before evaluation; equal contest scores use the lexicographically smaller stable ID.

## Units and coordinate contract

All spatial quantities use metres and seconds:

- position: metres;
- linear velocity: metres per second;
- incoming angular velocity: radians per second;
- output launch spin: revolutions per minute, matching Ball Engine V2;
- facing: normalised horizontal direction;
- timing: integer simulation ticks.

Player positions are interpreted as ground/base positions. Relative contact height is `ball.position.z - player.position.z`.

Every number must be finite. Inputs must contain only JSON primitives, arrays, and plain objects; circular references, class instances, duplicate participant IDs, impossible tick order, invalid techniques, invalid intent combinations, and a target with no horizontal displacement all fail closed.

## Supported technique families

The current values are explicit engineering placeholders for controlled evaluation. They are not claimed as final tuning, and they were not fitted to the passing-heavy FIFA 20 capture.

| Technique | Wind-up | Perfect / viable | Relative height | Horizontal reach | Family |
|---|---:|---:|---:|---:|---|
| Header | 4 ticks | +/-1 / +/-3 | 1.05 m to dynamic jump reach | 0.92 m | aerial |
| Volley | 5 ticks | +/-1 / +/-3 | 0.38-1.55 m | 0.88 m | aerial |
| Half-volley | 4 ticks | +/-1 / +/-3 | 0.12-0.76 m | 0.82 m | ground transition |
| First-time shot | 3 ticks | +/-1 / +/-3 | 0.05-0.58 m | 0.78 m | ground |

Header maximum height is derived from body height and jumping. The other height bands are fixed candidate windows. Reach, height, timing, body orientation, technique skill, and incoming-speed difficulty remain distinct telemetry components.

`auto` selects, in order:

1. header at or above 1.05 m;
2. volley at or above 0.45 m;
3. half-volley at or below 0.34 m when absolute vertical ball speed is at least 0.65 m/s;
4. otherwise first-time shot.

`aerial-shot` is deliberately narrower: it may select only header or volley. A low-ball `aerial-shot` request misses with `aerial-shot-height-unsupported`; it does not silently become a grounded shot.

Overhead kicks, scissor kicks, diving headers, back-heels, bicycle-kick probability, foot choice, and animation selection are not supported. Back-facing volley geometry fails as an unsupported body orientation rather than inventing an acrobatic contact.

## Ordered resolution

### 1. Technique

The explicit or automatic technique resolves before any contest. A technique profile fixes the wind-up, timing windows, reach envelope, orientation envelope, skill weights, base speed, output cap, and base spin contribution.

### 2. Actor contact gate

The actor is evaluated against:

- the technique timing window;
- minimum and maximum contact height;
- horizontal reach;
- facing-to-ball access;
- facing-to-target alignment;
- incoming trajectory;
- relevant attributes;
- incoming-speed difficulty.

Hard misses are returned before opponent comparison. Stable reason codes include:

- `timing-window-missed`;
- `ball-below-technique-window`;
- `ball-above-reach-window`;
- `ball-outside-horizontal-reach`;
- `ball-outside-body-envelope`;
- `unsupported-body-orientation`;
- `aerial-shot-height-unsupported`.

A miss emits no launch intent and returns `preserve-incoming-ball-state` with an immutable copy of the incoming ball. The future adapter must not consume or reposition the ball after such a miss merely because an attempt was evaluated.

### 3. Contest

Every opponent is evaluated independently for timing, height, horizontal reach, facing access, defensive/aerial skill, strength, and declared `challenge` or `block` purpose. Ineligible opponents remain in telemetry with their rejection reasons but cannot win.

The actor score is a deterministic combination of contact quality, strength, jumping, and awareness. The strongest eligible defender wins when its score plus the fixed block margin reaches the actor score. There is no probabilistic upset and no list-order dependency.

Outcomes are:

- `contact`: actor makes an uncontested or winning contact;
- `block`: opponent wins and supplies the deflection contact;
- `miss`: actor fails a hard contact gate before a duel can consume the ball.

Contact grades are `clean`, `pressured`, or `glancing`. They describe the candidate contact only; they do not award gameplay statistics.

### 4. Ball handoff

`contact` and `block` produce a complete `football-legacy-ball-v2-launch-intent` without importing Ball Engine V2 or advancing physics.

Actor contact derives:

- horizontal direction from the requested target;
- deterministic lateral error from body geometry and timing, never noise;
- speed from the technique profile, relevant attributes, quality, intent, and bounded incoming-speed retention;
- lift from target elevation, technique, intent, and timing;
- three-axis output spin from the incoming angular-velocity projection, technique retention, contact side, and timing.

Block contact uses a deterministic reflection/deflection direction around the blocker-to-ball normal. Its speed is capped at 18 m/s. All contacts are additionally capped by the global 38 m/s candidate ceiling and their technique-specific ceiling. All three output spin axes are capped at +/-1800 rpm. Extreme but finite incoming velocity or spin therefore cannot create non-finite output or an unbounded launch.

Ball Engine V2 compatibility is a schema handoff, not authority transfer. Launch metadata retains the candidate authority, capability scope, stable request/result/telemetry IDs, actor or blocker ID, ball ID, technique, intent, contact tick, quality where applicable, and incoming spin projection.

## Stable telemetry and export

Every result includes:

- stable request, result, telemetry, launch, and event IDs;
- requested and chosen technique;
- fixed ticks and explicit timing windows;
- incoming ball position, velocity, angular velocity, speed, and radius;
- reach and orientation vectors/scores;
- all quality components;
- every opponent candidate in stable order, eligibility, score, and reason codes;
- winner and block decision;
- outcome, reason, contact actor, grade, and handoff summary;
- caller-provided JSON-safe metadata.

`createExportPayload`, `createCopyText`, and `resultSignature` serialise this without timestamps. They are intended for controlled-suite and shadow comparison, not live match logging until a later adapter is approved.

## Read-only audit of current live adapter points

The present monolith remains untouched. Its relevant seams are:

- `match-engine/match.html:1925-1934`: current radii, reach-height estimate, cross-service classifier, input arming, lead-point check, and timing estimate;
- `match-engine/match.html:1940-1954`: current header animation/contact plus shoot, clear, and pass branches;
- `match-engine/match.html:1956-1959`: current volley animation/contact and shot branch;
- `match-engine/match.html:1961-1970`: current acrobatic attempts, explicitly outside this candidate's supported technique set;
- `match-engine/match.html:1972-1984`: current aerial candidate filtering, random duel score/upset, automatic technique selection, and human-side automatic-finishing guard;
- `match-engine/match.html:1986-1993`: current body-block eligibility and random deflection;
- `match-engine/match.html:353-373`: existing playtest shot/cross funnel aggregation that a later adapter must preserve.

A future adapter should translate live pixel units and attributes into this SI contract, call the resolver once at an authoritative fixed tick, validate its candidate result, trigger the appropriate existing animation, and pass only an accepted launch intent into Ball Engine V2. That integration must preserve the existing human-command guard, controller ownership, online authority, playtest telemetry, restarts, replays, statistics, sound, and presentation workflows.

## Gates before live integration

The focused test suite proves:

- browser and CommonJS exposure;
- dormant normal-match exclusion and forged/wrong-session rejection;
- deterministic repetition, immutability, JSON safety, and stable IDs;
- every supported technique and automatic classification;
- early, perfect, viable-edge, and late timing;
- height, reach, and body-orientation misses;
- actor-win and defender-block contests;
- stable opponent ordering and tie-breaks;
- pass, clear, and shoot intent differences;
- Ball Engine V2 launch compatibility and three-axis spin handoff;
- adversarial finite-input bounds;
- coexistence with the other dormant V2 modules.

No live integration or tuning should occur until representative aerial, volley, first-time, header, block, and miss reference cases exist. The FIFA 20 recording gathered for the current overhaul is useful chiefly for passing, dribbling, and off-ball movement; it is not sufficient evidence to calibrate this contact model.
