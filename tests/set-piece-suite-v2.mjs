import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const modulePath = path.join(root, 'match-engine', 'set-piece-suite-v2.js');
const ballModulePath = path.join(root, 'match-engine', 'ball-engine-v2.js');
const matchPath = path.join(root, 'match-engine', 'match.html');
const source = fs.readFileSync(modulePath, 'utf8');
const matchHtml = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Suite = require(modulePath);
const Ball = require(ballModulePath);

function harness(sessionId = 'suite-test-session') {
  const capability = Suite.createSuiteCapability({
    grant: Suite.CAPABILITY_GRANT,
    runtimeMode: Suite.SUITE_RUNTIME_MODE,
    authority: Suite.SUITE_RUNTIME_AUTHORITY,
    sessionId,
    capabilityId: 'suite-test-capability'
  });
  const dormant = Suite.createState({ sessionId, metadata: { fixture: true } });
  const state = Suite.activate(dormant, capability, {
    runtimeMode: Suite.SUITE_RUNTIME_MODE,
    authority: Suite.SUITE_RUNTIME_AUTHORITY
  });
  return { dormant, capability, state };
}

function launchProjection(intent) {
  return {
    schema: intent.schema,
    origin: intent.origin,
    target: intent.target,
    direction: intent.direction,
    speed: intent.speed,
    liftAngleDeg: intent.liftAngleDeg,
    sideSpinRpm: intent.sideSpinRpm,
    topSpinRpm: intent.topSpinRpm,
    axialSpinRpm: intent.axialSpinRpm,
    source: intent.source,
    scenarioId: intent.metadata.scenarioId,
    scenarioKind: intent.metadata.scenarioKind,
    wallPreset: intent.metadata.wallPreset,
    keeperPreset: intent.metadata.keeperPreset,
    targetPreset: intent.metadata.targetPreset,
    client: intent.metadata.client
  };
}

test('Set-Piece Suite V2 exposes a complete browser/CommonJS dormant API', () => {
  assert.equal(Suite.VERSION, '2.0.0-dormant');
  assert.equal(Suite.STATE_SCHEMA, 'football-legacy-set-piece-suite-v2-state');
  assert.equal(Suite.BALL_LAUNCH_SCHEMA, Ball.LAUNCH_SCHEMA);
  for (const name of [
    'createState', 'createScenario', 'getScenarioPreset', 'createSuiteCapability',
    'activate', 'deactivate', 'stageScenario', 'armLaunch', 'createLaunchIntent',
    'getPendingLaunchIntent', 'markLaunched', 'recordContact', 'recordOutcome',
    'resetTrial', 'repeatTrial', 'handleMenuIntent', 'handleShortcut',
    'createExportPayload', 'createCopyText', 'stateSignature'
  ]) assert.equal(typeof Suite[name], 'function', name);

  const browserWindow = {};
  vm.runInNewContext(source, { window: browserWindow });
  assert.equal(browserWindow.FootballLegacySetPieceSuiteV2.VERSION, Suite.VERSION);
  assert.equal(typeof browserWindow.FootballLegacySetPieceSuiteV2.stageScenario, 'function');
});

test('DORMANT AUTHORITY GATE: the live match neither loads nor calls the suite candidate', () => {
  assert.doesNotMatch(matchHtml, /<script[^>]+set-piece-suite-v2\.js/i);
  assert.doesNotMatch(matchHtml, /FootballLegacySetPieceSuiteV2/);
  assert.match(source, /deliberately dormant/i);
  const state = Suite.createState();
  assert.equal(state.enabled, false);
  assert.equal(state.authority, 'dormant-suite-candidate');
  assert.equal(state.runtimeMode, null);
  assert.equal(state.runtimeAuthority, null);
  assert.equal(state.lifecycle, Suite.LIFECYCLE.IDLE);
});

test('normal-match authority cannot manufacture or activate suite authority', () => {
  assert.throws(() => Suite.createSuiteCapability({
    grant: Suite.CAPABILITY_GRANT,
    runtimeMode: 'normal-match',
    authority: 'match-authority'
  }), /explicit set-piece-suite \/ suite-only scope/);

  const { dormant, capability } = harness();
  assert.throws(() => Suite.activate(dormant, capability, {
    runtimeMode: 'normal-match',
    authority: 'match-authority'
  }), /normal-match or non-suite authority/);
  assert.throws(() => Suite.activate(dormant, capability, {
    runtimeMode: Suite.SUITE_RUNTIME_MODE,
    authority: Suite.SUITE_RUNTIME_AUTHORITY,
    normalMatchAuthority: true
  }), /normal-match authority/);
  assert.throws(() => Suite.stageScenario(dormant, 'penalty', capability), /dormant/);
  assert.equal(dormant.enabled, false);
  assert.equal(dormant.events.length, 0);
});

test('candidate has no random source, wall clock, presentation clock or async loop', () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /Date\s*[.(]/);
  assert.doesNotMatch(source, /performance\s*\./);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
});

test('every declared scenario preset normalizes deterministically with stable ids', () => {
  const ids = Object.keys(Suite.SCENARIO_PRESETS);
  assert.deepEqual(ids.sort(), [
    'corner-left', 'corner-right',
    'free-kick-centre-18m', 'free-kick-centre-23m', 'free-kick-centre-30m',
    'free-kick-left-18m', 'free-kick-left-23m', 'free-kick-left-30m',
    'free-kick-right-18m', 'free-kick-right-23m', 'free-kick-right-30m',
    'penalty'
  ]);
  const first = ids.map(id => Suite.getScenarioPreset(id));
  const second = ids.map(id => Suite.getScenarioPreset(id));
  assert.deepEqual(first, second);
  assert.equal(new Set(first.map(scenario => scenario.id)).size, ids.length);
  assert.ok(first.every(scenario => scenario.schema === Suite.SCENARIO_SCHEMA));
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
});

test('free-kick contract covers left, centre, right, custom distance and explicit angle', () => {
  const left = Suite.getScenarioPreset('free-kick-left-23m');
  const centre = Suite.getScenarioPreset('free-kick-centre-23m');
  const right = Suite.getScenarioPreset('free-kick-right-23m');
  assert.deepEqual([left.side, centre.side, right.side], ['left', 'centre', 'right']);
  assert.ok(left.angleDeg < 0);
  assert.equal(centre.angleDeg, 0);
  assert.ok(right.angleDeg > 0);
  assert.ok(left.geometry.origin.y < 0);
  assert.equal(centre.geometry.origin.y, 0);
  assert.ok(right.geometry.origin.y > 0);

  const custom = Suite.createScenario({
    kind: 'free-kick',
    side: 'left',
    distanceM: 35.5,
    angleDeg: -17.25,
    wallPreset: 'five',
    keeperPreset: 'right-bias',
    targetPreset: 'goal-right-low',
    metadata: { label: 'wide-long-range' }
  });
  assert.equal(custom.id, 'free-kick-left-35p5m-m17p25deg');
  assert.equal(custom.distanceM, 35.5);
  assert.equal(custom.angleDeg, -17.25);
  assert.equal(custom.wallPreset, 'five');
  assert.equal(custom.keeperPreset, 'right-bias');
  assert.equal(custom.geometry.target.y, 2.7);
});

test('corner left/right and penalty scenarios preserve wall, keeper and target presets', () => {
  const left = Suite.getScenarioPreset('corner-left');
  const right = Suite.getScenarioPreset('corner-right');
  const penalty = Suite.createScenario({
    kind: 'penalty',
    keeperPreset: 'aggressive',
    targetPreset: 'goal-left-high'
  });
  assert.equal(left.geometry.origin.y, -34);
  assert.equal(right.geometry.origin.y, 34);
  assert.equal(left.wallPreset, 'none');
  assert.equal(right.targetPreset, 'box-centre');
  assert.equal(penalty.geometry.origin.x, 41.5);
  assert.equal(penalty.wallPreset, 'none');
  assert.equal(penalty.keeperPreset, 'aggressive');
  assert.deepEqual(penalty.geometry.target, { x: 52.5, y: -2.7, z: 1.9 });
  assert.ok(Object.isFrozen(Suite.WALL_PRESETS));
  assert.ok(Object.isFrozen(Suite.KEEPER_PRESETS));
  assert.ok(Object.isFrozen(Suite.TARGET_PRESETS));
});

test('Options and Escape are the only menu-toggle intents and releases are inert', () => {
  const { capability, state: active } = harness();
  const viaOptions = Suite.handleMenuIntent(active, {
    device: 'controller', control: 'Options', pressed: true
  }, capability);
  assert.equal(viaOptions.menuOpen, true);
  const release = Suite.handleMenuIntent(viaOptions, {
    device: 'controller', control: 'options', pressed: false
  }, capability);
  assert.equal(release, viaOptions);
  const viaEscape = Suite.handleMenuIntent(release, {
    device: 'keyboard', control: 'Escape', pressed: true
  }, capability);
  assert.equal(viaEscape.menuOpen, false);
  assert.deepEqual(viaEscape.events.filter(event => event.type === 'menu-toggled').map(event => event.payload.control), [
    'options', 'escape'
  ]);
  assert.throws(() => Suite.handleMenuIntent(viaEscape, {
    device: 'controller', control: 'cross', pressed: true
  }, capability), /Options or keyboard Escape/);
});

test('D-pad Up stages a penalty only inside an explicit penalty-area suite context', () => {
  const { capability, state: active } = harness();
  const outside = Suite.handleShortcut(active, {
    control: 'dpad-up', pressed: true, suiteContext: true, inPenaltyArea: false
  }, capability);
  assert.equal(outside, active);
  const notSuite = Suite.handleShortcut(active, {
    control: 'dpad-up', pressed: true, suiteContext: false, inPenaltyArea: true
  }, capability);
  assert.equal(notSuite, active);
  const penalty = Suite.handleShortcut(active, {
    control: 'dpad-up', pressed: true, suiteContext: true, inPenaltyArea: true,
    keeperPreset: 'left-bias', targetPreset: 'goal-right-low'
  }, capability);
  assert.equal(penalty.lifecycle, Suite.LIFECYCLE.STAGED);
  assert.equal(penalty.selectedScenario.kind, 'penalty');
  assert.equal(penalty.selectedScenario.keeperPreset, 'left-bias');
  assert.equal(penalty.selectedScenario.targetPreset, 'goal-right-low');
  assert.equal(penalty.trials[0].reason, 'dpad-up-penalty-area-shortcut');
  assert.throws(() => Suite.handleShortcut(active, {
    control: 'dpad-down', suiteContext: true, inPenaltyArea: true
  }, capability), /must be dpad-up/);
});

test('trial lifecycle hands a suite-only intent to Ball Engine V2 without importing live authority', () => {
  const { capability, state: active } = harness('lifecycle-session');
  const staged = Suite.stageScenario(active, 'free-kick-right-30m', capability);
  assert.equal(staged.lifecycle, Suite.LIFECYCLE.STAGED);
  assert.equal(staged.currentTrialId, 'lifecycle-session:trial:0001');

  const armedResult = Suite.createLaunchIntent(staged, {
    speed: 29.25,
    liftAngleDeg: 21,
    sideSpinRpm: -310,
    topSpinRpm: 180,
    metadata: { technique: 'inside-foot-curl' }
  }, capability);
  const armed = armedResult.state;
  const intent = armedResult.launchIntent;
  assert.equal(armed.lifecycle, Suite.LIFECYCLE.ARMED);
  assert.equal(intent.schema, Ball.LAUNCH_SCHEMA);
  assert.equal(intent.id, 'lifecycle-session:shot:0001');
  assert.equal(intent.source, 'set-piece-suite-v2');
  assert.equal(intent.metadata.suiteOnly, true);
  assert.equal(intent.metadata.capabilityScope, Suite.CAPABILITY_SCOPE);
  assert.equal(intent.metadata.trialId, staged.currentTrialId);
  assert.equal(intent.metadata.client.technique, 'inside-foot-curl');

  const acceptedByBallCandidate = Ball.createLaunchIntent(intent);
  assert.equal(acceptedByBallCandidate.schema, Ball.LAUNCH_SCHEMA);
  assert.equal(acceptedByBallCandidate.speed, 29.25);
  assert.deepEqual(acceptedByBallCandidate.origin, intent.origin);
  assert.deepEqual(acceptedByBallCandidate.target, intent.target);

  let launched = Suite.markLaunched(armed, {
    simulationTick: 120,
    consumer: 'ball-engine-v2-shadow-harness'
  }, capability);
  assert.equal(launched.lifecycle, Suite.LIFECYCLE.LAUNCHED);
  launched = Suite.recordContact(launched, {
    simulationTick: 143,
    kind: 'wall-contact',
    actorId: 'wall-player-04',
    materialId: 'player-body',
    position: { x: 46.2, y: 2.1, z: 1.4 },
    velocityBefore: { x: 18, y: -2, z: 3 },
    velocityAfter: { x: 9, y: 4, z: 1 },
    metadata: { swept: true }
  }, capability);
  assert.equal(launched.contacts[0].id, 'lifecycle-session:contact:0001');
  const resolved = Suite.recordOutcome(launched, {
    simulationTick: 171,
    result: 'saved',
    metrics: { terminalSpeedMps: 14.2 },
    metadata: { keeperTouch: true }
  }, capability);
  assert.equal(resolved.lifecycle, Suite.LIFECYCLE.RESOLVED);
  assert.equal(resolved.outcomes[0].id, 'lifecycle-session:outcome:0001');
  assert.equal(resolved.trials[0].status, Suite.LIFECYCLE.RESOLVED);
  assert.deepEqual(JSON.parse(JSON.stringify(resolved)), resolved);
});

test('reset creates a fresh staged trial while repeat recreates identical launch physics', () => {
  const { capability, state: active } = harness('repeat-session');
  const staged = Suite.stageScenario(active, {
    id: 'repeat-free-kick',
    kind: 'free-kick', side: 'left', distanceM: 27, angleDeg: -24,
    wallPreset: 'four', keeperPreset: 'balanced', targetPreset: 'goal-right-high'
  }, capability);
  const first = Suite.armLaunch(staged, {
    speed: 28,
    liftAngleDeg: 24,
    sideSpinRpm: 360,
    topSpinRpm: 90,
    axialSpinRpm: 12,
    metadata: { recipe: 'repeat-me' }
  }, capability);
  const firstIntent = first.pendingLaunchIntent;
  const reset = Suite.resetTrial(first, capability);
  assert.equal(reset.lifecycle, Suite.LIFECYCLE.STAGED);
  assert.equal(reset.currentTrialId, 'repeat-session:trial:0002');
  assert.equal(reset.trials[1].reason, 'reset');
  assert.equal(reset.pendingLaunchIntent, null);

  const resetArmed = Suite.armLaunch(reset, first.lastLaunchRecipe, capability);
  const repeated = Suite.repeatTrial(resetArmed, capability);
  assert.equal(repeated.lifecycle, Suite.LIFECYCLE.ARMED);
  assert.equal(repeated.currentTrialId, 'repeat-session:trial:0003');
  assert.equal(repeated.repeatOfTrialId, 'repeat-session:trial:0002');
  assert.equal(repeated.pendingLaunchIntent.id, 'repeat-session:shot:0003');
  assert.deepEqual(launchProjection(firstIntent), launchProjection(resetArmed.pendingLaunchIntent));
  assert.deepEqual(launchProjection(resetArmed.pendingLaunchIntent), launchProjection(repeated.pendingLaunchIntent));
});

test('the same deterministic command sequence replays byte-identically without mutating inputs', () => {
  const run = () => {
    const { capability, state: active } = harness('deterministic-session');
    const before = Suite.stateSignature(active);
    let state = Suite.handleMenuIntent(active, {
      device: 'keyboard', control: 'escape', pressed: true
    }, capability);
    state = Suite.stageScenario(state, 'corner-left', capability);
    state = Suite.armLaunch(state, {
      speed: 21.5, liftAngleDeg: 29, sideSpinRpm: 175,
      metadata: { test: ['deterministic', 1] }
    }, capability);
    state = Suite.markLaunched(state, { simulationTick: 10 }, capability);
    state = Suite.recordContact(state, {
      simulationTick: 33,
      kind: 'player-contact',
      actorId: 'attacker-09',
      position: { x: 48, y: -3, z: 1.7 },
      metadata: { phase: 'aerial' }
    }, capability);
    state = Suite.recordOutcome(state, {
      simulationTick: 46,
      result: 'cleared',
      metrics: { clearanceDistanceM: 19 }
    }, capability);
    assert.equal(Suite.stateSignature(active), before, 'input state must remain immutable');
    return { state, export: Suite.createExportPayload(state, capability) };
  };
  const first = run();
  const second = run();
  assert.deepEqual(first, second);
  assert.equal(Suite.stateSignature(first.state), Suite.stateSignature(second.state));
});

test('export payload and copy text are structured, JSON-safe and stable-id complete', () => {
  const { capability, state: active } = harness('export-session');
  let state = Suite.stageScenario(active, 'penalty', capability);
  state = Suite.armLaunch(state, { speed: 27, target: { x: 52.5, y: 2.1, z: 0.8 } }, capability);
  state = Suite.markLaunched(state, { simulationTick: 1 }, capability);
  state = Suite.recordOutcome(state, {
    simulationTick: 19, result: 'goal', metrics: { insidePostM: 0.38 }
  }, capability);
  const payload = Suite.createExportPayload(state, capability);
  assert.equal(payload.schema, Suite.EXPORT_SCHEMA);
  assert.equal(payload.version, Suite.VERSION);
  assert.equal(payload.suiteOnly, true);
  assert.equal(payload.capabilityScope, Suite.CAPABILITY_SCOPE);
  assert.deepEqual(payload.counts, { events: 5, trials: 1, shots: 1, contacts: 0, outcomes: 1 });
  assert.equal(payload.trials[0].id, 'export-session:trial:0001');
  assert.equal(payload.shots[0].id, 'export-session:shot:0001');
  assert.equal(payload.outcomes[0].id, 'export-session:outcome:0001');
  const copyText = Suite.createCopyText(state, capability);
  assert.deepEqual(JSON.parse(copyText), payload);
  assert.equal(Suite.createCopyText(state, capability, 0), JSON.stringify(payload));
  const eventIds = payload.events.map(event => event.id);
  assert.equal(new Set(eventIds).size, eventIds.length);
  assert.ok(eventIds.every((id, index) => id === `export-session:event:${String(index + 1).padStart(6, '0')}`));
});

test('invalid scenarios, presets, transitions, ticks and non-JSON metadata fail closed', () => {
  assert.throws(() => Suite.createScenario('does-not-exist'), /unknown/);
  assert.throws(() => Suite.createScenario({
    kind: 'free-kick', side: 'centre', distanceM: 23, angleDeg: 4
  }), /must be zero/);
  assert.throws(() => Suite.createScenario({
    kind: 'free-kick', side: 'left', distanceM: 23, angleDeg: 12
  }), /must be negative/);
  assert.throws(() => Suite.createScenario({ kind: 'corner', side: 'centre' }), /left or right/);
  assert.throws(() => Suite.createScenario({ kind: 'corner', side: 'left', distanceM: 20 }), /do not accept/);
  assert.throws(() => Suite.createScenario({ kind: 'penalty', wallPreset: 'four' }), /require wallPreset none/);
  assert.throws(() => Suite.createScenario({ kind: 'penalty', keeperPreset: 'teleporting' }), /unknown/);

  const circular = {};
  circular.self = circular;
  assert.throws(() => Suite.createScenario({ kind: 'penalty', metadata: circular }), /circular/);

  const { capability, state: active } = harness('invalid-session');
  assert.throws(() => Suite.armLaunch(active, {}, capability), /staged suite trial/);
  const staged = Suite.stageScenario(active, 'penalty', capability);
  assert.throws(() => Suite.armLaunch(staged, { speed: 0 }, capability), /between 0.1 and 60/);
  const armed = Suite.armLaunch(staged, {}, capability);
  assert.throws(() => Suite.recordContact(armed, {
    simulationTick: 1, kind: 'keeper-contact'
  }, capability), /after a suite launch/);
  const launched = Suite.markLaunched(armed, { simulationTick: 2 }, capability);
  assert.throws(() => Suite.recordContact(launched, { kind: 'keeper-contact' }, capability), /simulationTick/);
  assert.throws(() => Suite.recordOutcome(launched, {
    simulationTick: 3, result: 'maybe-a-goal'
  }, capability), /unknown/);
  assert.throws(() => Suite.recordOutcome(launched, {
    simulationTick: -1, result: 'goal'
  }, capability), /non-negative integer/);
  assert.throws(() => Suite.createCopyText(launched, capability, 11), /at most 10/);
});

test('capabilities are session-bound and deactivation returns to a legacy-safe dormant state', () => {
  const first = harness('session-one');
  const second = harness('session-two');
  assert.throws(() => Suite.stageScenario(first.state, 'penalty', second.capability), /does not match/);
  const staged = Suite.stageScenario(first.state, 'corner-right', first.capability);
  const inactive = Suite.deactivate(staged, first.capability);
  assert.equal(inactive.enabled, false);
  assert.equal(inactive.runtimeMode, null);
  assert.equal(inactive.runtimeAuthority, null);
  assert.equal(inactive.capabilityId, null);
  assert.equal(inactive.lifecycle, Suite.LIFECYCLE.IDLE);
  assert.equal(inactive.selectedScenario, null);
  assert.equal(inactive.currentTrialId, null);
  assert.equal(inactive.events.at(-1).type, 'suite-deactivated');
  assert.throws(() => Suite.stageScenario(inactive, 'penalty', first.capability), /dormant/);
});
