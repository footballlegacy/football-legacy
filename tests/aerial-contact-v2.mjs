import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = path.join(root, 'match-engine', 'aerial-contact-v2.js');
const ballPath = path.join(root, 'match-engine', 'ball-engine-v2.js');
const matchPath = path.join(root, 'match-engine', 'match.html');
const source = fs.readFileSync(modulePath, 'utf8');
const matchHtml = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Aerial = require(modulePath);
const Ball = require(ballPath);

const attributes = (rating = 82, overrides = {}) => ({
  heading: rating,
  jumping: rating,
  strength: rating,
  technique: rating,
  shooting: rating,
  volleys: rating,
  balance: rating,
  agility: rating,
  awareness: rating,
  defend: rating,
  ...overrides
});

const actor = (overrides = {}) => ({
  id: 'actor-1',
  teamId: 'home',
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  facing: { x: 1, y: 0, z: 0 },
  heightM: 1.82,
  attributes: attributes(),
  ...overrides
});

const opponent = (id, overrides = {}) => ({
  id,
  teamId: 'away',
  position: { x: 0.92, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  facing: { x: -1, y: 0, z: 0 },
  heightM: 1.82,
  attributes: attributes(40),
  inputTick: 95,
  purpose: 'challenge',
  ...overrides
});

const request = (overrides = {}) => ({
  id: 'attempt-1',
  sessionId: 'session-1',
  simulationTick: 100,
  contactTick: 100,
  inputTick: 95,
  technique: 'volley',
  intent: 'shoot',
  actor: actor(),
  ball: {
    id: 'match-ball',
    position: { x: 0.46, y: 0.04, z: 0.9 },
    velocity: { x: -8, y: 1.5, z: -1.2 },
    angularVelocity: { x: 3, y: -5, z: 7 },
    radiusM: 0.11
  },
  target: { x: 28, y: 1.2, z: 1.1 },
  opponents: [],
  metadata: { source: 'focused-test' },
  ...overrides
});

const capability = Aerial.createShadowCapability({
  grant: Aerial.CAPABILITY_GRANT,
  runtimeMode: Aerial.RUNTIME_MODE,
  authority: Aerial.AUTHORITY,
  sessionId: 'session-1',
  capabilityId: 'capability-1'
});

const resolve = overrides => Aerial.resolveContact(request(overrides), capability);

test('Aerial Contact V2 exposes a browser/CommonJS API only through the exact offline FL V2 preflight', () => {
  assert.equal(Aerial.VERSION, '2.0.0-dormant');
  for (const name of [
    'createShadowCapability', 'createRequest', 'selectTechnique', 'resolveContact',
    'createExportPayload', 'createCopyText', 'resultSignature'
  ]) assert.equal(typeof Aerial[name], 'function', name);
  const browser = { window: {} };
  vm.runInNewContext(source, browser);
  assert.equal(browser.window.FootballLegacyAerialContactV2.VERSION, Aerial.VERSION);
  const preflight = matchHtml.match(/<script id="offlineLiveV2Preflight">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(preflight, 'exact offline FL V2 preflight must remain extractable');
  assert.match(preflight, /matchType=String\(decoded&&decoded\.matchType\|\|''\),liveWorkflow=matchType==='single-player'\?'single-player':matchType==='spectator'\?'cpu-v-cpu':matchType==='free-kick-suite'\?'set-piece-suite':null/);
  assert.match(preflight, /candidateValues\[0\]!=='4'/);
  assert.match(preflight, /quickPlayValues\[0\]!=='1'/);
  assert.match(preflight, /eligible=requested&&queryRequested&&payloadRequested&&!!decoded&&!!liveWorkflow&&unique\.length===0/);
  const gate = preflight.indexOf('if(!eligible)return;');
  const aerialLoader = preflight.indexOf("'aerial-contact-v2.js'");
  const liveAdapterLoader = preflight.indexOf("'live-v2-authority-adapter.js'");
  assert.ok(gate >= 0 && aerialLoader > gate && liveAdapterLoader > aerialLoader,
    'Aerial Contact V2 must load after Candidate 4 eligibility and before the live adapter');
  assert.match(preflight, /174-fl-v2-final-candidate-4/);
  assert.match(preflight, /shadow-marker-conflict|frozen-or-unsupported/);
  assert.doesNotMatch(matchHtml, /<script[^>]+src=["']aerial-contact-v2\.js/);
});

test('the resolver has no random, wall-clock, DOM, renderer, timer, or async authority', () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /Date\.(?:now|UTC)\s*\(/);
  assert.doesNotMatch(source, /performance\.now\s*\(/);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /set(?:Timeout|Interval)\s*\(/);
  assert.doesNotMatch(source, /document\.|THREE\.|CANNON\.|\basync\s+function\b|\bawait\b/);
});

test('normal-match and forged capabilities fail closed', () => {
  assert.throws(() => Aerial.createShadowCapability({
    grant: Aerial.CAPABILITY_GRANT,
    runtimeMode: 'normal-match',
    authority: 'live',
    sessionId: 'session-1',
    capabilityId: 'capability-1'
  }), /requires aerial-contact-shadow/);
  assert.throws(() => Aerial.resolveContact(request(), null), /shadow capability is required/);
  assert.throws(() => Aerial.resolveContact(request(), { ...capability, scope: 'normal-match' }), /scope is invalid/);
  assert.throws(() => Aerial.resolveContact(request(), { ...capability, token: 'forged' }), /does not match/);
  const otherSession = Aerial.createShadowCapability({
    grant: Aerial.CAPABILITY_GRANT,
    runtimeMode: Aerial.RUNTIME_MODE,
    authority: Aerial.AUTHORITY,
    sessionId: 'session-2',
    capabilityId: 'capability-2'
  });
  assert.throws(() => Aerial.resolveContact(request(), otherSession), /does not match/);
});

test('the same request repeats byte-identically without mutating inputs', () => {
  const input = request();
  const snapshot = JSON.stringify(input);
  const first = Aerial.resolveContact(input, capability);
  const second = Aerial.resolveContact(input, capability);
  assert.deepEqual(first, second);
  assert.equal(Aerial.resultSignature(first), Aerial.resultSignature(second));
  assert.equal(JSON.stringify(input), snapshot);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.telemetry), true);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(first)));
});

test('automatic technique classification covers headers, volleys, half-volleys, and low first-time shots', () => {
  const chosen = (z, verticalSpeed) => {
    const created = Aerial.createRequest(request({
      technique: 'auto',
      inputTick: 96,
      ball: { ...request().ball, position: { x: 0.46, y: 0, z }, velocity: { x: -6, y: 0, z: verticalSpeed } }
    }));
    return Aerial.selectTechnique(created);
  };
  assert.equal(chosen(1.35, -1), 'header');
  assert.equal(chosen(0.8, -1), 'volley');
  assert.equal(chosen(0.24, 1.1), 'half-volley');
  assert.equal(chosen(0.24, 0.1), 'first-time-shot');
});

test('explicit header contact resolves with header timing, reach, and launch telemetry', () => {
  const result = resolve({
    technique: 'header',
    inputTick: 96,
    ball: { ...request().ball, position: { x: 0.5, y: 0.02, z: 1.72 } }
  });
  assert.equal(result.outcome, 'contact');
  assert.equal(result.technique, 'header');
  assert.equal(result.telemetry.techniqueFamily, 'aerial');
  assert.equal(result.telemetry.timing.withinPerfectWindow, true);
  assert.ok(result.telemetry.reach.maximumHeightM > 2);
  assert.equal(result.launchIntent.schema, Ball.LAUNCH_SCHEMA);
});

test('explicit volley and first-time shot use distinct profiles and remain deterministic', () => {
  const volley = resolve();
  const firstTime = resolve({
    id: 'first-time-1',
    technique: 'first-time-shot',
    inputTick: 97,
    ball: { ...request().ball, position: { x: 0.42, y: 0, z: 0.23 }, velocity: { x: -9, y: 0, z: 0.1 } }
  });
  assert.equal(volley.outcome, 'contact');
  assert.equal(volley.technique, 'volley');
  assert.equal(firstTime.outcome, 'contact');
  assert.equal(firstTime.technique, 'first-time-shot');
  assert.notEqual(volley.launchIntent.speed, firstTime.launchIntent.speed);
  assert.notEqual(
    Aerial.TECHNIQUE_PROFILES.volley.windupTicks,
    Aerial.TECHNIQUE_PROFILES['first-time-shot'].windupTicks
  );
  assert.notEqual(volley.telemetry.timing.inputTick, firstTime.telemetry.timing.inputTick);
});

test('half-volley resolves a rising low ball through the ground-transition family', () => {
  const result = resolve({
    id: 'half-volley-1',
    technique: 'half-volley',
    inputTick: 96,
    ball: { ...request().ball, position: { x: 0.43, y: 0, z: 0.28 }, velocity: { x: -10, y: 0.4, z: 1.4 } }
  });
  assert.equal(result.outcome, 'contact');
  assert.equal(result.technique, 'half-volley');
  assert.equal(result.telemetry.techniqueFamily, 'ground-transition');
});

test('aerial-shot selects only a header or volley and rejects a low ball', () => {
  const high = resolve({
    id: 'aerial-shot-high',
    technique: 'aerial-shot',
    inputTick: 96,
    ball: { ...request().ball, position: { x: 0.45, y: 0, z: 1.55 } }
  });
  const middle = resolve({ id: 'aerial-shot-middle', technique: 'aerial-shot' });
  const low = resolve({
    id: 'aerial-shot-low',
    technique: 'aerial-shot',
    inputTick: 97,
    ball: { ...request().ball, position: { x: 0.45, y: 0, z: 0.22 } }
  });
  assert.equal(high.technique, 'header');
  assert.equal(middle.technique, 'volley');
  assert.equal(low.technique, null);
  assert.equal(low.outcome, 'miss');
  assert.equal(low.reason, 'aerial-shot-height-unsupported');
  assert.equal(low.launchIntent, null);
});

test('perfect, edge-viable, early-missed, and late-missed timing windows are explicit', () => {
  const perfect = resolve({ id: 'timing-perfect', inputTick: 95 });
  const viable = resolve({ id: 'timing-viable', inputTick: 98 });
  const earlyMiss = resolve({ id: 'timing-early-miss', inputTick: 91 });
  const lateMiss = resolve({ id: 'timing-late-miss', inputTick: 99 });
  assert.equal(perfect.telemetry.timing.deltaTicks, 0);
  assert.equal(perfect.telemetry.timing.score, 1);
  assert.equal(viable.telemetry.timing.deltaTicks, 3);
  assert.equal(viable.outcome, 'contact');
  assert.ok(viable.telemetry.quality.score < perfect.telemetry.quality.score);
  assert.equal(earlyMiss.telemetry.timing.deltaTicks, -4);
  assert.equal(earlyMiss.reason, 'timing-window-missed');
  assert.equal(lateMiss.telemetry.timing.deltaTicks, 4);
  assert.equal(lateMiss.reason, 'timing-window-missed');
});

test('unreachable height and horizontal distance produce reasoned misses without consuming the ball', () => {
  const high = resolve({
    id: 'unreachable-high',
    ball: { ...request().ball, position: { x: 0.4, y: 0, z: 2.7 } }
  });
  const far = resolve({
    id: 'unreachable-far',
    ball: { ...request().ball, position: { x: 2.0, y: 0, z: 0.9 } },
    target: { x: 28, y: 0, z: 1 }
  });
  assert.equal(high.outcome, 'miss');
  assert.equal(high.reason, 'ball-above-reach-window');
  assert.equal(high.continuation.command, 'preserve-incoming-ball-state');
  assert.deepEqual(high.continuation.ball.velocity, request().ball.velocity);
  assert.equal(far.outcome, 'miss');
  assert.equal(far.reason, 'ball-outside-horizontal-reach');
});

test('unsupported back-facing volley geometry fails rather than inventing an acrobatic contact', () => {
  const result = resolve({
    id: 'back-facing',
    actor: actor({ facing: { x: -1, y: 0, z: 0 } })
  });
  assert.equal(result.outcome, 'miss');
  assert.ok(result.telemetry.decision.reasonCodes.includes('ball-outside-body-envelope'));
  assert.ok(result.telemetry.decision.reasonCodes.includes('unsupported-body-orientation'));
  assert.equal(result.launchIntent, null);
});

test('clean contact hands a complete compatible launch to Ball Engine V2', () => {
  const result = resolve({ id: 'ball-handoff' });
  assert.equal(result.outcome, 'contact');
  assert.equal(result.launchIntent.schema, Ball.LAUNCH_SCHEMA);
  assert.equal(result.launchIntent.metadata.shadowOnly, true);
  assert.equal(result.launchIntent.metadata.capabilityScope, Aerial.CAPABILITY_SCOPE);
  const resolved = Ball.resolveLaunch(result.launchIntent);
  assert.ok(resolved.state.velocity.x > 0);
  assert.ok(Number.isFinite(resolved.state.angularVelocity.x));
  assert.equal(resolved.state.metadata.launchId, result.launchIntent.id);
  assert.equal(result.telemetry.handoff.consumerSchema, Ball.LAUNCH_SCHEMA);
});

test('incoming three-axis spin is projected, retained, bounded, and serialised', () => {
  const result = resolve({
    id: 'spin-handoff',
    ball: { ...request().ball, angularVelocity: { x: 20, y: -12, z: 15 } }
  });
  const projection = result.launchIntent.metadata.spinProjection;
  assert.ok(Math.abs(projection.side) > 1);
  assert.ok(Math.abs(projection.top) > 1);
  assert.ok(Math.abs(projection.axial) > 1);
  for (const key of ['sideSpinRpm', 'topSpinRpm', 'axialSpinRpm']) {
    assert.ok(Number.isFinite(result.launchIntent[key]));
    assert.ok(Math.abs(result.launchIntent[key]) <= Aerial.DEFAULT_CONFIG.maximumSpinRpm);
  }
});

test('a strong actor can win a deterministic contested aerial contact', () => {
  const result = resolve({
    id: 'actor-wins-contest',
    actor: actor({ attributes: attributes(94) }),
    opponents: [opponent('weak-defender', { attributes: attributes(25) })]
  });
  assert.equal(result.outcome, 'contact');
  assert.equal(result.reason, 'actor-won-contested-contact');
  assert.equal(result.contactBy, 'actor-1');
  assert.equal(result.contactGrade, 'pressured');
  assert.equal(result.telemetry.contest.eligibleCandidateIds[0], 'weak-defender');
  assert.equal(result.telemetry.contest.winnerId, 'actor-1');
});

test('a stronger, perfectly timed defender wins the contact and emits a bounded deflection', () => {
  const result = resolve({
    id: 'defender-blocks',
    actor: actor({ attributes: attributes(35) }),
    opponents: [opponent('elite-defender', {
      attributes: attributes(99),
      purpose: 'block',
      inputTick: 97
    })]
  });
  assert.equal(result.outcome, 'block');
  assert.equal(result.reason, 'opponent-won-contact');
  assert.equal(result.contactBy, 'elite-defender');
  assert.equal(result.launchIntent.source, 'aerial-contact-v2-block');
  assert.ok(result.launchIntent.speed <= 18);
  assert.doesNotThrow(() => Ball.resolveLaunch(result.launchIntent));
});

test('opponent input ordering cannot change a duel result or stable tie-break', () => {
  const alpha = opponent('alpha-defender', { attributes: attributes(92), purpose: 'block' });
  const beta = opponent('beta-defender', { attributes: attributes(92), purpose: 'block' });
  const first = resolve({ id: 'ordered-duel', actor: actor({ attributes: attributes(35) }), opponents: [beta, alpha] });
  const second = resolve({ id: 'ordered-duel', actor: actor({ attributes: attributes(35) }), opponents: [alpha, beta] });
  assert.deepEqual(first, second);
  assert.equal(first.telemetry.contest.strongestOpponentId, 'alpha-defender');
  assert.deepEqual(first.telemetry.contest.candidates.map(entry => entry.id), ['alpha-defender', 'beta-defender']);
});

test('pass and clearance intents reuse contact resolution but preserve different launch semantics', () => {
  const base = {
    technique: 'header',
    inputTick: 96,
    ball: { ...request().ball, position: { x: 0.5, y: 0, z: 1.7 } },
    target: { x: 25, y: 4, z: 0.6 }
  };
  const pass = resolve({ ...base, id: 'headed-pass', intent: 'pass' });
  const clear = resolve({ ...base, id: 'headed-clear', intent: 'clear' });
  assert.equal(pass.outcome, 'contact');
  assert.equal(clear.outcome, 'contact');
  assert.ok(clear.launchIntent.liftAngleDeg > pass.launchIntent.liftAngleDeg);
  assert.notEqual(clear.launchIntent.speed, pass.launchIntent.speed);
  assert.equal(clear.launchIntent.metadata.intent, 'clear');
});

test('structured export is JSON-safe, stable, clock-free, and carries stable event IDs', () => {
  const result = resolve({ id: 'export-attempt' });
  const payload = Aerial.createExportPayload(result);
  const first = Aerial.createCopyText(result, 0);
  const second = Aerial.createCopyText(result, 0);
  assert.equal(payload.schema, Aerial.EXPORT_SCHEMA);
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first), payload);
  assert.deepEqual(result.events.map(entry => entry.id), [
    'export-attempt:event:0001',
    'export-attempt:event:0002'
  ]);
  assert.doesNotMatch(first, /timestamp|wallClock|realTime/);
  assert.throws(() => Aerial.createCopyText(result, 11), /spacing must be between/);
});

test('invalid numbers, cycles, prototypes, IDs, teams, duplicates, and tick regressions fail closed', () => {
  assert.throws(() => Aerial.createRequest(request({ simulationTick: Number.NaN })), /finite JSON numbers/);
  const missingRequestId = request();
  delete missingRequestId.id;
  assert.throws(() => Aerial.createRequest(missingRequestId), /request.id is required/);
  const missingActorId = request();
  delete missingActorId.actor.id;
  assert.throws(() => Aerial.createRequest(missingActorId), /actor.id is required/);
  const missingTarget = request();
  delete missingTarget.target;
  assert.throws(() => Aerial.createRequest(missingTarget), /request.target is required/);
  const missingBallPosition = request();
  delete missingBallPosition.ball.position;
  assert.throws(() => Aerial.createRequest(missingBallPosition), /ball.position is required/);
  assert.throws(() => Aerial.createRequest(request({ opponents: {} })), /opponents must be an array/);
  const circular = request();
  circular.metadata.circular = circular;
  assert.throws(() => Aerial.createRequest(circular), /circular references/);
  assert.throws(() => Aerial.createRequest(request({ metadata: new Map() })), /plain JSON objects/);
  assert.throws(() => Aerial.createRequest(request({ id: 'bad id' })), /stable identifier/);
  assert.throws(() => Aerial.createRequest(request({ inputTick: 101 })), /cannot be after contactTick/);
  assert.throws(() => Aerial.createRequest(request({ contactTick: 101 })), /cannot be after simulationTick/);
  assert.throws(() => Aerial.createRequest(request({
    opponents: [opponent('actor-1')]
  })), /participant IDs must be unique/);
  assert.throws(() => Aerial.createRequest(request({
    opponents: [opponent('same-team', { teamId: 'home' })]
  })), /different team/);
  assert.throws(() => Aerial.createRequest(request({ target: { x: 0.46, y: 0.04, z: 2 } })), /horizontal component/);
});

test('adversarial finite velocity and spin cannot create NaN, unbounded spin, or an energy-like speed explosion', () => {
  const result = resolve({
    id: 'extreme-input',
    ball: {
      ...request().ball,
      velocity: { x: -1000000, y: 700000, z: -500000 },
      angularVelocity: { x: 1000000000, y: -800000000, z: 600000000 }
    }
  });
  assert.equal(result.outcome, 'contact');
  assert.ok(result.launchIntent.speed <= Aerial.DEFAULT_CONFIG.maximumOutputSpeedMps);
  assert.ok(result.launchIntent.speed <= Aerial.TECHNIQUE_PROFILES.volley.maximumSpeedMps);
  for (const key of ['speed', 'liftAngleDeg', 'sideSpinRpm', 'topSpinRpm', 'axialSpinRpm']) {
    assert.ok(Number.isFinite(result.launchIntent[key]), key);
  }
  for (const key of ['sideSpinRpm', 'topSpinRpm', 'axialSpinRpm']) {
    assert.ok(Math.abs(result.launchIntent[key]) <= Aerial.DEFAULT_CONFIG.maximumSpinRpm, key);
  }
  assert.doesNotThrow(() => Ball.resolveLaunch(result.launchIntent));
});

test('the candidate coexists with Ball, Movement, Set-Piece, and Restart browser globals', () => {
  const movementSource = fs.readFileSync(path.join(root, 'match-engine', 'movement-engine-v2.js'), 'utf8');
  const suiteSource = fs.readFileSync(path.join(root, 'match-engine', 'set-piece-suite-v2.js'), 'utf8');
  const restartSource = fs.readFileSync(path.join(root, 'match-engine', 'restart-presentation-v2.js'), 'utf8');
  const ballSource = fs.readFileSync(ballPath, 'utf8');
  const browser = { window: {} };
  for (const moduleSource of [ballSource, movementSource, suiteSource, restartSource, source]) {
    vm.runInNewContext(moduleSource, browser);
  }
  assert.equal(browser.window.FootballLegacyBallEngineV2.VERSION, Ball.VERSION);
  assert.equal(browser.window.FootballLegacyMovementEngineV2.VERSION, '2.0.0-dormant');
  assert.equal(browser.window.FootballLegacySetPieceSuiteV2.VERSION, '2.0.0-dormant');
  assert.equal(browser.window.FootballLegacyRestartPresentationV2.VERSION, '2.0.0-dormant');
  assert.equal(browser.window.FootballLegacyAerialContactV2.VERSION, Aerial.VERSION);
});
