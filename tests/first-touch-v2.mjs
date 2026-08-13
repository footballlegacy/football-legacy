import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import Ball from '../match-engine/ball-engine-v2.js';
import Touch from '../match-engine/first-touch-v2.js';

const moduleSource = readFileSync(new URL('../match-engine/first-touch-v2.js', import.meta.url), 'utf8');
const matchSource = readFileSync(new URL('../match-engine/match.html', import.meta.url), 'utf8');

function capability(workflow = 'offline-v2-lab') {
  return Touch.createCapability({
    enabled: true,
    online: false,
    workflow,
    acknowledgement: Touch.ACKNOWLEDGEMENT
  });
}

function clone(value) {
  return structuredClone(value);
}

function request(overrides = {}) {
  const base = Touch.createGroundReceptionFixture();
  return {
    ...base,
    ...overrides,
    ball: overrides.ball || base.ball,
    player: overrides.player ? { ...base.player, ...overrides.player } : base.player,
    intent: overrides.intent ? { ...base.intent, ...overrides.intent } : base.intent,
    pressure: overrides.pressure || base.pressure
  };
}

function highBall(z, velocity = { x: -4, y: 0, z: -1 }) {
  return Ball.createBallState({
    id: 'fixture-ball',
    position: { x: 0.35, y: 0, z },
    velocity,
    angularVelocity: { x: 2, y: 1, z: 0.5 },
    regime: Ball.REGIMES.AIR,
    grounded: false,
    settled: false
  });
}

function energy(ball) {
  const linear = 0.5 * ball.mass * (
    ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
  );
  const rotational = 0.5 * ball.inertia * (
    ball.angularVelocity.x ** 2 + ball.angularVelocity.y ** 2 + ball.angularVelocity.z ** 2
  );
  return linear + rotational;
}

function assertNumbersFinite(value) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value));
    return;
  }
  if (Array.isArray(value)) value.forEach(assertNumbersFinite);
  else if (value && typeof value === 'object') Object.values(value).forEach(assertNumbersFinite);
}

test('First Touch V2 exposes a complete dormant CommonJS API', () => {
  assert.equal(Touch.VERSION, '2.0.0-dormant');
  assert.equal(Touch.REQUEST_SCHEMA, 'football-legacy-first-touch-v2-request');
  assert.equal(Touch.RESULT_SCHEMA, 'football-legacy-first-touch-v2-result');
  assert.equal(typeof Touch.resolve, 'function');
  assert.equal(typeof Touch.createCapability, 'function');
  assert.ok(Object.isFrozen(Touch));
});

test('plain browser loading requires Ball V2 and exposes one frozen global', () => {
  const context = { globalThis: {}, console };
  context.globalThis.FootballLegacyBallEngineV2 = Ball;
  vm.runInNewContext(moduleSource, context, { filename: 'first-touch-v2.js' });
  const browser = context.globalThis.FootballLegacyFirstTouchV2;
  assert.equal(browser.VERSION, Touch.VERSION);
  assert.equal(browser.REQUEST_SCHEMA, Touch.REQUEST_SCHEMA);
  assert.ok(Object.isFrozen(browser));
});

test('EXACT OFFLINE AUTHORITY GATE: the live match conditionally loads First Touch V2 without giving the module host authority', () => {
  assert.match(matchSource, /const liveWorkflow=matchType==='single-player'\?'single-player':matchType==='spectator'\?'cpu-v-cpu':matchType==='free-kick-suite'\?'set-piece-suite':null/);
  assert.match(matchSource, /if\(!eligible\)return;[\s\S]*'first-touch-v2\.js'/);
  assert.match(matchSource, /shadow-marker-conflict|frozen-or-unsupported/);
  assert.doesNotMatch(matchSource, /<script[^>]+src=["']first-touch-v2\.js/);
  assert.doesNotMatch(moduleSource, /document\.|querySelector|requestAnimationFrame|addEventListener/);
});

test('determinism gate has no random, wall-clock, timer, renderer, network or live apply source', () => {
  assert.doesNotMatch(moduleSource, /Math\.random|Date\.now|performance\.now|setTimeout|setInterval/);
  assert.doesNotMatch(moduleSource, /WebSocket|RTCPeer|fetch\(|XMLHttpRequest|\.style\b|canvas|renderer/i);
  assert.doesNotMatch(moduleSource, /applyToLive|liveState\s*=/);
});

test('capability is exact, offline, bounded to candidate workflows and never live authority', () => {
  assert.equal(capability().enabled, true);
  assert.equal(capability('set-piece-suite').enabled, true);
  assert.equal(capability('shadow').enabled, true);
  assert.equal(Touch.createCapability({
    enabled: true, online: false, workflow: 'normal-match', acknowledgement: Touch.ACKNOWLEDGEMENT
  }).enabled, false);
  assert.equal(Touch.createCapability({
    enabled: true, online: true, workflow: 'offline-v2-lab', acknowledgement: Touch.ACKNOWLEDGEMENT
  }).enabled, false);
  assert.equal(capability().liveAuthority, false);
});

test('elite ground reception cushions a driven pass into explicit controlled possession', () => {
  const result = Touch.resolve(request(), capability());
  assert.equal(result.outcome, 'controlled');
  assert.equal(result.technique, 'foot-cushion');
  assert.equal(result.ownerCandidateId, 'receiver');
  assert.equal(result.ballState.regime, Ball.REGIMES.CONTROLLED);
  assert.equal(result.ballState.lastContact.colliderId, 'receiver');
  assert.equal(result.ballState.lastContact.materialId, 'first-touch:foot-cushion');
  assert.equal(result.telemetry.liveApplied, false);
});

test('routine low-pressure ground control is seeded, rating-led and makes elite errors exceptional', () => {
  const failures = {};
  for (const rating of [50, 60, 70, 90, 95]) {
    failures[rating] = 0;
    for (let seed = 1; seed <= 500; seed += 1) {
      const result = Touch.resolve(request({
        seed,
        player: {
          facing: { x: 0, y: 1 },
          attributes: {
            control: rating, technique: rating, balance: rating,
            agility: rating, strength: rating, awareness: rating
          }
        }
      }), capability());
      assert.equal(result.telemetry.routineControl.eligible, true);
      if (result.outcome !== 'controlled') failures[rating] += 1;
    }
  }
  assert.ok(failures[50] > failures[60]);
  assert.ok(failures[60] > failures[70]);
  assert.ok(failures[70] > failures[90]);
  assert.ok(failures[50] >= 45 && failures[50] <= 100, JSON.stringify(failures));
  assert.ok(failures[60] >= 20 && failures[60] <= 65, JSON.stringify(failures));
  assert.ok(failures[70] <= 20, JSON.stringify(failures));
  assert.ok(failures[90] <= 10, JSON.stringify(failures));
  assert.ok(failures[95] <= 5, JSON.stringify(failures));
});

test('routine-control security never overrides meaningful close pressure', () => {
  const result = Touch.resolve(request({
    player: {
      facing: { x: 0, y: 1 },
      attributes: { control: 90, technique: 90, balance: 90, agility: 90, strength: 90, awareness: 90 }
    },
    pressure: [{
      id: 'pressing-defender', teamId: 'away', position: { x: 0.1, y: 0 },
      velocity: { x: 0, y: 0 }, strength: 99
    }]
  }), capability());
  assert.equal(result.telemetry.routineControl.eligible, false);
  assert.equal(result.telemetry.routineControl.secured, false);
  assert.notEqual(result.outcome, 'controlled');
});

test('timing bands are explicit and a late contact cannot consume the ball', () => {
  assert.equal(Touch.timingBand(0.045), 'perfect');
  assert.equal(Touch.timingBand(0.105), 'good');
  assert.equal(Touch.timingBand(-0.18), 'stretch');
  assert.equal(Touch.timingBand(0.181), 'missed');
  const input = request({ timingOffsetSeconds: 0.25 });
  const result = Touch.resolve(input, capability());
  assert.equal(result.outcome, 'missed');
  assert.equal(result.reason, 'timing-window-missed');
  assert.deepEqual(result.ballState, input.ball);
});

test('automatic body-region selection covers sole, foot, thigh, chest and header cushions', () => {
  assert.equal(Touch.classifyTechnique(0.11, 1.82, 'trap', null), 'sole-trap');
  assert.equal(Touch.classifyTechnique(0.45, 1.82, 'cushion', null), 'foot-cushion');
  assert.equal(Touch.classifyTechnique(0.85, 1.82, 'cushion', null), 'thigh-control');
  assert.equal(Touch.classifyTechnique(1.25, 1.82, 'cushion', null), 'chest-control');
  assert.equal(Touch.classifyTechnique(1.78, 1.82, 'cushion', null), 'header-cushion');
});

test('a high technical player can chest-control a reachable dropping ball', () => {
  const result = Touch.resolve(request({
    ball: highBall(1.25),
    player: {
      attributes: { control: 100, technique: 100, balance: 100, agility: 100, strength: 100, awareness: 100 }
    },
    intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.25 }
  }), capability());
  assert.equal(result.technique, 'chest-control');
  assert.equal(result.outcome, 'controlled');
});

test('unreachable height or horizontal geometry produces a reasoned miss', () => {
  const tooHigh = Touch.resolve(request({ ball: highBall(2.45) }), capability());
  assert.equal(tooHigh.outcome, 'missed');
  assert.equal(tooHigh.reason, 'contact-geometry-unreachable');
  const tooFarBall = highBall(0.45);
  tooFarBall.position.x = 2.5;
  const tooFar = Touch.resolve(request({ ball: tooFarBall }), capability());
  assert.equal(tooFar.outcome, 'missed');
});

test('weak technique under close strong pressure creates an auditable heavy touch', () => {
  const result = Touch.resolve(request({
    player: {
      attributes: { control: 28, technique: 31, balance: 32, agility: 30, strength: 36, awareness: 29 }
    },
    pressure: [{
      id: 'pressing-defender', teamId: 'away', position: { x: 0.25, y: 0.1 },
      velocity: { x: 0, y: 0 }, strength: 96
    }]
  }), capability());
  assert.equal(result.outcome, 'loose');
  assert.equal(result.reason, 'heavy-touch');
  assert.ok(result.telemetry.quality.pressureScore > 0.5);
  assert.equal(result.ownerCandidateId, null);
});

test('directional touch uses bounded active contact and deterministic directional error', () => {
  const input = request({
    intent: { type: 'directional-touch', direction: { x: 0.6, y: 0.8 }, touchDistanceM: 3.2, active: true }
  });
  const first = Touch.resolve(input, capability());
  const second = Touch.resolve(clone(input), capability());
  assert.equal(Touch.stableJson(first), Touch.stableJson(second));
  assert.equal(first.telemetry.activeEnergyContact, true);
  assert.ok(Math.hypot(first.ballState.velocity.x, first.ballState.velocity.y) <= Touch.DEFAULT_CONFIG.maximumOutputSpeed);
  assert.ok(Math.abs(first.telemetry.directionErrorRadians) <= Math.PI / 3.2);
});

test('passive loose control cannot create combined linear and rotational ball energy', () => {
  const input = request({
    player: {
      attributes: { control: 46, technique: 45, balance: 48, agility: 45, strength: 45, awareness: 43 }
    },
    intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.7, active: false }
  });
  const result = Touch.resolve(input, capability());
  assert.ok(['retained', 'loose'].includes(result.outcome));
  assert.ok(energy(result.ballState) <= energy(input.ball) + 1e-8);
  assert.ok(result.telemetry.passiveEnergyGain <= 1e-8);
});

test('passive energy guard uses the authoritative Ball V2 inertia field', () => {
  const input = request({
    ball: Ball.createBallState({
      ...request().ball,
      velocity: { x: -0.05, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      inertia: 0.1
    }),
    player: {
      attributes: { control: 0, technique: 0, balance: 0, agility: 0, strength: 0, awareness: 0 }
    },
    intent: { type: 'cushion', direction: { x: 0, y: 1 }, touchDistanceM: 0.7, active: false }
  });
  const result = Touch.resolve(input, capability());
  assert.ok(energy(result.ballState) <= energy(input.ball) + 1e-9);
  assert.ok(result.telemetry.passiveEnergyGain <= 1e-9);
});

test('successful output is a complete Ball Engine V2 state and follows the same predictor path', () => {
  const result = Touch.resolve(request({
    intent: { type: 'directional-touch', direction: { x: 1, y: 0.2 }, touchDistanceM: 1.8 }
  }), capability());
  assert.equal(Ball.isBallState(result.ballState), true);
  const context = Ball.createSimulationContext({ seed: 173 });
  const predicted = Ball.predict(result.ballState, context, {
    duration: 1 / 60,
    environment: { groundEnabled: false }
  });
  assert.equal(Ball.isBallState(predicted.state), true);
});

test('pressure input order cannot alter score, chosen nearest pressure or output', () => {
  const pressure = [
    { id: 'z-defender', teamId: 'away', position: { x: 1.2, y: 0 }, velocity: { x: 0, y: 0 }, strength: 90 },
    { id: 'a-defender', teamId: 'away', position: { x: 0.8, y: 0 }, velocity: { x: 0, y: 0 }, strength: 70 }
  ];
  const first = Touch.resolve(request({ pressure }), capability());
  const second = Touch.resolve(request({ pressure: [...pressure].reverse() }), capability());
  assert.equal(Touch.stableJson(first), Touch.stableJson(second));
  assert.equal(first.telemetry.quality.nearestPressure.id, 'a-defender');
});

test('resolver does not mutate request, capability, ball or player data', () => {
  const input = request();
  const cap = capability();
  const beforeInput = Touch.stableJson(input);
  const beforeCapability = Touch.stableJson(cap);
  Touch.resolve(input, cap);
  assert.equal(Touch.stableJson(input), beforeInput);
  assert.equal(Touch.stableJson(cap), beforeCapability);
});

test('stable JSON is key-order invariant and all result numbers remain finite', () => {
  assert.equal(Touch.stableJson({ b: 2, a: 1 }), Touch.stableJson({ a: 1, b: 2 }));
  const result = Touch.resolve(request(), capability());
  const encoded = JSON.stringify(result);
  assertNumbersFinite(result);
  assert.ok(!encoded.includes('Infinity'));
  assert.ok(!encoded.includes('NaN'));
});

test('safety gates reject bad schemas, invalid numbers, unsafe ids and duplicate pressure', () => {
  assert.throws(() => Touch.resolve({ ...request(), schema: 'wrong' }, capability()), /schema/);
  assert.throws(() => Touch.resolve(request({ timingOffsetSeconds: NaN }), capability()), /finite/);
  assert.throws(() => Touch.resolve(request({ player: { id: '../bad' } }), capability()), /stable id/);
  const opponent = { id: 'same', teamId: 'away', position: { x: 1, y: 0 }, velocity: { x: 0, y: 0 }, strength: 50 };
  assert.throws(() => Touch.resolve(request({ pressure: [opponent, opponent] }), capability()), /unique/);
});

test('disabled, forged and wrong-workflow capabilities fail before producing a result', () => {
  const disabled = Touch.createCapability({});
  assert.throws(() => Touch.resolve(request(), disabled), /explicit dormant offline capability/);
  assert.throws(() => Touch.resolve(request({ workflow: 'shadow' }), capability()), /explicit dormant offline capability/);
  assert.throws(() => Touch.resolve({ ...request(), online: true }, capability()), /online/);
});

test('explicit technique cannot bypass its physical vertical reach envelope', () => {
  const result = Touch.resolve(request({ ball: highBall(1.3), technique: 'foot-cushion' }), capability());
  assert.equal(result.outcome, 'missed');
  assert.equal(result.reason, 'contact-geometry-unreachable');
});

test('Ball V2 handoff preserves physical/timing fields and uses coherent contact projection', () => {
  const base = request().ball;
  const ball = Ball.createBallState({
    ...base,
    inertia: 0.0031,
    settleTime: 0.75,
    lastOuterTick: 77,
    simulationTime: 12.5
  });
  const result = Touch.resolve(request({ ball }), capability());
  assert.equal(result.ballState.inertia, ball.inertia);
  assert.equal(result.ballState.settleTime, 0);
  assert.equal(result.ballState.lastOuterTick, 77);
  assert.equal(result.ballState.simulationTime, 12.5);
  const normal = result.ballState.lastContact.normal;
  const relative = {
    x: ball.velocity.x - request().player.velocity.x,
    y: ball.velocity.y - request().player.velocity.y,
    z: ball.velocity.z
  };
  const projected = Math.abs(relative.x * normal.x + relative.y * normal.y + relative.z * normal.z);
  assert.ok(Math.abs(Math.hypot(normal.x, normal.y, normal.z) - 1) < 1e-12);
  assert.ok(Math.abs(result.ballState.lastContact.normalSpeed - projected) < 1e-12);
});

test('intent energy contract cannot be forged by truthy or mismatched active flags', () => {
  assert.throws(() => Touch.resolve(request({
    intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.4, active: true }
  }), capability()), /energy contract/);
  assert.throws(() => Touch.resolve(request({
    intent: { type: 'directional-touch', direction: { x: 1, y: 0 }, touchDistanceM: 1, active: false }
  }), capability()), /energy contract/);
  assert.throws(() => Touch.resolve(request({
    intent: { type: 'trap', direction: { x: 1, y: 0 }, touchDistanceM: 0.2, active: 'yes' }
  }), capability()), /energy contract/);
});

test('movement can extend reach only when projected toward the contact point', () => {
  const ball = highBall(0.45, { x: -4, y: 0, z: 0 });
  ball.position.x = 1.15;
  const toward = Touch.resolve(request({ ball, player: { velocity: { x: 10, y: 0 } } }), capability());
  const away = Touch.resolve(request({ ball, player: { velocity: { x: -10, y: 0 } } }), capability());
  assert.notEqual(toward.reason, 'contact-geometry-unreachable');
  assert.equal(away.outcome, 'missed');
  assert.equal(away.reason, 'contact-geometry-unreachable');
  assert.ok(toward.telemetry.geometry.towardContactSpeed > 0);
  assert.equal(away.telemetry.geometry.towardContactSpeed, 0);
});

test('ball output and player input movement obey their separate 3D safety limits', () => {
  const active = Touch.resolve(request({
    intent: { type: 'directional-touch', direction: { x: 1, y: 0.2 }, touchDistanceM: 8 }
  }), capability(), { maximumOutputSpeed: 5 });
  assert.ok(Math.hypot(active.ballState.velocity.x, active.ballState.velocity.y,
    active.ballState.velocity.z) <= 5 + 1e-12);
  assert.throws(() => Touch.resolve(request({
    player: { velocity: { x: Touch.DEFAULT_CONFIG.maximumPlayerSpeed + 0.01, y: 0 } }
  }), capability()), /player\.velocity magnitude/);
});

test('complete but unsafe finite inputs, missing attributes and hostile metadata fail closed', () => {
  const extremeBall = request().ball;
  extremeBall.velocity.x = Number.MAX_VALUE;
  assert.throws(() => Touch.resolve(request({ ball: extremeBall }), capability()), /safe envelope/);

  assert.throws(() => Touch.resolve(request({
    player: { attributes: { control: 90 } }
  }), capability()), /is required/);

  const cyclicBall = request().ball;
  cyclicBall.metadata.self = cyclicBall.metadata;
  assert.throws(() => Touch.resolve(request({ ball: cyclicBall }), capability()), /cycles/);

  const accessorBall = request().ball;
  Object.defineProperty(accessorBall.metadata, 'unstable', {
    enumerable: true,
    get() { return 1; }
  });
  assert.throws(() => Touch.resolve(request({ ball: accessorBall }), capability()), /stable enumerable data property/);
});
