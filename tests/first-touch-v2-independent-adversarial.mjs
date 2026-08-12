import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const ballPath = path.join(root, 'match-engine', 'ball-engine-v2.js');
const touchPath = path.join(root, 'match-engine', 'first-touch-v2.js');
const matchPath = path.join(root, 'match-engine', 'match.html');
const ballSource = fs.readFileSync(ballPath, 'utf8');
const touchSource = fs.readFileSync(touchPath, 'utf8');
const matchSource = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Ball = require(ballPath);
const Touch = require(touchPath);

function capability(workflow = 'offline-v2-lab') {
  return Touch.createCapability({
    enabled: true,
    online: false,
    workflow,
    acknowledgement: Touch.ACKNOWLEDGEMENT
  });
}

function fixture(overrides = {}) {
  const value = Touch.createGroundReceptionFixture();
  return {
    ...value,
    ...overrides,
    ball: overrides.ball || value.ball,
    player: overrides.player ? { ...value.player, ...overrides.player } : value.player,
    intent: overrides.intent ? { ...value.intent, ...overrides.intent } : value.intent,
    pressure: overrides.pressure || value.pressure
  };
}

function speed3(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function finiteTree(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (value && typeof value === 'object') return Object.values(value).every(finiteTree);
  return true;
}

function physicalEnergy(ball) {
  return 0.5 * ball.mass * (
    ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
  ) + 0.5 * ball.inertia * (
    ball.angularVelocity.x ** 2 + ball.angularVelocity.y ** 2 + ball.angularVelocity.z ** 2
  );
}

test('independent exposure gate: CommonJS/browser surfaces are frozen and use current Ball V2', () => {
  assert.equal(Ball.VERSION, '2.0.0-shadow');
  assert.equal(Ball.STATE_SCHEMA, 'football-legacy-ball-v2-state');
  assert.equal(Touch.VERSION, '2.0.0-dormant');
  assert.equal(Object.isFrozen(Touch), true);

  const context = vm.createContext({});
  vm.runInContext('this.window = this;', context);
  vm.runInContext(ballSource, context, { filename: ballPath });
  vm.runInContext(touchSource, context, { filename: touchPath });
  const Browser = context.FootballLegacyFirstTouchV2;
  assert.equal(Browser.VERSION, Touch.VERSION);
  assert.equal(Object.isFrozen(Browser), true);
  const browserRequest = Browser.createGroundReceptionFixture();
  const browserCapability = vm.runInContext(`FootballLegacyFirstTouchV2.createCapability({
    enabled: true,
    online: false,
    workflow: 'offline-v2-lab',
    acknowledgement: FootballLegacyFirstTouchV2.ACKNOWLEDGEMENT
  })`, context);
  assert.equal(Browser.stableJson(Browser.resolve(browserRequest, browserCapability)),
    Touch.stableJson(Touch.resolve(fixture(), capability())));

  const missing = vm.createContext({ globalThis: {} });
  vm.runInContext(touchSource, missing, { filename: touchPath });
  assert.throws(() => missing.globalThis.FootballLegacyFirstTouchV2.createGroundReceptionFixture(),
    /Ball Engine V2 must be loaded/);
});

test('exact offline composition gate: the match conditionally loads First Touch and the module has no host side effects', () => {
  assert.match(matchSource, /if\(!eligible\)return;[\s\S]*'first-touch-v2\.js'/);
  assert.doesNotMatch(matchSource, /<script[^>]+src=["']first-touch-v2\.js/);
  assert.doesNotMatch(touchSource,
    /document\.|querySelector|requestAnimationFrame|addEventListener|fetch\(|WebSocket|RTCPeer|applyToLive/);
});

test('current Ball V2 handoff preserves inertia and existing outer-tick chronology', () => {
  const input = fixture();
  input.ball = Ball.createBallState({
    ...input.ball,
    inertia: 0.123,
    lastOuterTick: 41,
    simulationTime: 3.25
  });
  input.tick = 42;
  const result = Touch.resolve(input, capability());
  assert.notEqual(result.outcome, 'missed');
  assert.equal(result.ballState.inertia, input.ball.inertia);
  assert.equal(result.ballState.lastOuterTick, input.ball.lastOuterTick);
  assert.equal(result.ballState.simulationTime, input.ball.simulationTime);
  assert.equal(result.ballState.lastContact.outerTick, input.tick);
  assert.equal(result.ballState.contactCount, input.ball.contactCount + 1);
  assert.doesNotMatch(touchSource, /simulationTick|substepTick|randomState|randomDrawCount/,
    'First Touch must not pass obsolete fields absent from the current Ball V2 state schema');
});

test('contact metadata uses a unit normal and normal-relative speed rather than total speed', () => {
  const input = fixture();
  const result = Touch.resolve(input, capability());
  const contact = result.ballState.lastContact;
  const normalLength = speed3(contact.normal);
  assert.ok(Math.abs(normalLength - 1) <= 1e-9);
  const relative = {
    x: input.ball.velocity.x - input.player.velocity.x,
    y: input.ball.velocity.y - input.player.velocity.y,
    z: input.ball.velocity.z
  };
  const projected = Math.abs(relative.x * contact.normal.x +
    relative.y * contact.normal.y + relative.z * contact.normal.z);
  assert.ok(Math.abs(contact.normalSpeed - projected) <= 1e-9,
    `normalSpeed ${contact.normalSpeed} must equal relative normal projection ${projected}`);
});

test('schema completeness gate: every declared player attribute is required', () => {
  for (const attribute of ['control', 'technique', 'balance', 'agility', 'strength', 'awareness']) {
    const input = fixture();
    input.player = structuredClone(input.player);
    delete input.player.attributes[attribute];
    assert.throws(() => Touch.resolve(input, capability()), new RegExp(attribute), attribute);
  }
});

test('active-contact authority is typed and cannot be escalated by trap/cushion input', () => {
  const stringActive = fixture({ intent: { active: 'false' } });
  assert.throws(() => Touch.resolve(stringActive, capability()), /active.*(?:boolean|contract)|(?:boolean|contract).*active/i);

  const forgedActive = fixture({ intent: { type: 'cushion', active: true, touchDistanceM: 0.7 } });
  forgedActive.ball = Ball.createBallState({
    ...forgedActive.ball,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 }
  });
  forgedActive.player = {
    ...forgedActive.player,
    attributes: { control: 30, technique: 30, balance: 30, agility: 30, strength: 30, awareness: 30 }
  };
  assert.throws(() => Touch.resolve(forgedActive, capability()), /active.*intent|intent.*active/i);
});

test('passive contacts use the Ball V2 inertia and cannot create true combined energy', () => {
  const input = fixture({
    player: {
      attributes: { control: 46, technique: 45, balance: 48, agility: 45, strength: 45, awareness: 43 }
    },
    intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.7, active: false }
  });
  input.ball = Ball.createBallState({ ...input.ball, inertia: 0.123 });
  const result = Touch.resolve(input, capability());
  assert.equal(result.telemetry.activeEnergyContact, false);
  assert.equal(result.ballState.inertia, input.ball.inertia);
  assert.ok(physicalEnergy(result.ballState) <= physicalEnergy(input.ball) + 1e-9);
});

test('passive-energy guard weights custom inertia rather than silently substituting sphere inertia', () => {
  const input = fixture({
    player: {
      attributes: { control: 0, technique: 0, balance: 0, agility: 0, strength: 0, awareness: 0 }
    },
    intent: { type: 'cushion', direction: { x: 0, y: 1 }, touchDistanceM: 0.7, active: false }
  });
  input.ball = Ball.createBallState({
    ...input.ball,
    inertia: 0.1,
    velocity: { x: -0.05, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 }
  });
  const result = Touch.resolve(input, capability());
  const before = physicalEnergy(input.ball);
  const after = physicalEnergy(result.ballState);
  assert.equal(result.telemetry.activeEnergyContact, false);
  assert.ok(after <= before + 1e-9, `true passive energy rose ${before} -> ${after}`);
  assert.ok(Math.abs(result.telemetry.beforeEnergy - before) <= 1e-12);
  assert.ok(Math.abs(result.telemetry.afterEnergy - after) <= 1e-12);
});

test('extreme finite Ball V2 inputs fail closed before derived Infinity can enter telemetry', () => {
  const input = fixture();
  input.ball = Ball.createBallState({
    ...input.ball,
    velocity: { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: 0 }
  });
  assert.equal(Ball.isBallState(input.ball), true, 'the dependency structurally accepts this finite state');
  assert.throws(() => Touch.resolve(input, capability()), /finite|range|bound|envelope/i);
});

test('extreme finite player/pressure vectors fail closed before Infinity geometry is exported', () => {
  const input = fixture({
    pressure: [{
      id: 'extreme-defender', teamId: 'away',
      position: { x: Number.MAX_VALUE, y: Number.MAX_VALUE },
      velocity: { x: 0, y: 0 }, strength: 50
    }]
  });
  assert.throws(() => Touch.resolve(input, capability()), /finite|range|bound|position/i);
});

test('controlled attachment obeys the configured total output-speed ceiling', () => {
  const input = fixture({ player: { velocity: { x: 15, y: 0 } } });
  input.ball = Ball.createBallState({ ...input.ball, velocity: { x: 7, y: 0, z: 0 } });
  let result = null;
  try {
    result = Touch.resolve(input, capability());
  } catch (error) {
    assert.match(String(error && error.message), /player\.velocity.*envelope|output.*speed|speed.*bound/i);
  }
  if (result) {
    assert.equal(result.outcome, 'controlled');
    assert.ok(speed3(result.ballState.velocity) <= Touch.DEFAULT_CONFIG.maximumOutputSpeed + 1e-9,
      `controlled output ${speed3(result.ballState.velocity)} exceeds configured ceiling`);
  }
});

test('dynamic reach is directional: moving away cannot gain contact reach', () => {
  const stationary = fixture();
  stationary.ball = Ball.createBallState({ ...stationary.ball, position: { x: 1.15, y: 0, z: 0.11 } });
  const stationaryResult = Touch.resolve(stationary, capability());
  assert.equal(stationaryResult.reason, 'contact-geometry-unreachable');

  const away = fixture({ player: { velocity: { x: -10, y: 0 } } });
  away.ball = Ball.createBallState({ ...away.ball, position: { x: 1.15, y: 0, z: 0.11 } });
  const awayResult = Touch.resolve(away, capability());
  assert.equal(awayResult.reason, 'contact-geometry-unreachable');
  assert.equal(awayResult.telemetry.geometry.reachable, false);
});

test('body-region vertical envelopes remain physical at explicit edges and short-player header ceiling', () => {
  const footEdge = fixture({ technique: 'foot-cushion' });
  footEdge.ball = Ball.createBallState({ ...footEdge.ball, position: { x: 0.35, y: 0, z: 0.83 } });
  assert.notEqual(Touch.resolve(footEdge, capability()).reason, 'contact-geometry-unreachable');
  footEdge.ball = Ball.createBallState({ ...footEdge.ball, position: { x: 0.35, y: 0, z: 0.831 } });
  assert.equal(Touch.resolve(footEdge, capability()).reason, 'contact-geometry-unreachable');

  const shortHeader = fixture({ player: { heightM: 1.45 }, technique: 'header-cushion' });
  shortHeader.ball = Ball.createBallState({ ...shortHeader.ball, position: { x: 0.35, y: 0, z: 1.841 } });
  assert.equal(Touch.resolve(shortHeader, capability()).reason, 'contact-geometry-unreachable');
});

test('timing is symmetric at every exact declared boundary', () => {
  for (const [offset, expected] of [
    [0, 'perfect'], [0.045, 'perfect'], [-0.045, 'perfect'],
    [0.105, 'good'], [-0.105, 'good'], [0.18, 'stretch'], [-0.18, 'stretch'],
    [0.180001, 'missed'], [-0.180001, 'missed']
  ]) assert.equal(Touch.timingBand(offset), expected, String(offset));
});

test('pressure ordering and deterministic directional error are byte invariant', () => {
  const pressure = [
    { id: 'z-defender', teamId: 'away', position: { x: 1.1, y: 0.2 }, velocity: { x: 0, y: 0 }, strength: 84 },
    { id: 'a-defender', teamId: 'away', position: { x: 0.8, y: -0.1 }, velocity: { x: 0, y: 0 }, strength: 76 },
    { id: 'm-defender', teamId: 'away', position: { x: 1.5, y: 0.4 }, velocity: { x: 0, y: 0 }, strength: 91 }
  ];
  const firstInput = fixture({
    pressure,
    intent: { type: 'directional-touch', direction: { x: 0.6, y: 0.8 }, touchDistanceM: 2.4 }
  });
  const first = Touch.resolve(firstInput, capability());
  const second = Touch.resolve(structuredClone(firstInput), capability());
  const reordered = Touch.resolve(fixture({
    ...firstInput,
    pressure: [...pressure].reverse(),
    ball: structuredClone(firstInput.ball),
    player: structuredClone(firstInput.player),
    intent: structuredClone(firstInput.intent)
  }), capability());
  assert.equal(Touch.stableJson(first), Touch.stableJson(second));
  assert.equal(Touch.stableJson(first), Touch.stableJson(reordered));
});

test('successful results are deeply frozen, finite and do not mutate the request', () => {
  const input = fixture();
  const before = Touch.stableJson(input);
  const result = Touch.resolve(input, capability());
  assert.equal(Touch.stableJson(input), before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.ballState), true);
  assert.equal(Object.isFrozen(result.telemetry.quality), true);
  assert.equal(finiteTree(result), true);
  assert.doesNotMatch(JSON.stringify(result), /Infinity|NaN/);
  assert.doesNotMatch(ballSource, /FootballLegacyFirstTouchV2/);
});
