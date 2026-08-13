import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulePath = path.join(root, 'match-engine', 'ball-engine-v2.js');
const source = fs.readFileSync(modulePath, 'utf8');
const Ball = createRequire(import.meta.url)(modulePath);

const body = Object.freeze({
  id: 'outfielder-7',
  position: Object.freeze({ x: 1, y: 0, z: 0 }),
  velocity: Object.freeze({ x: 0, y: 0, z: 0 }),
  radius: 0.2,
  heightM: 1.8
});

const energy = state => 0.5 * state.mass * (
  state.velocity.x ** 2 + state.velocity.y ** 2 + state.velocity.z ** 2
) + 0.5 * state.inertia * (
  state.angularVelocity.x ** 2 + state.angularVelocity.y ** 2 + state.angularVelocity.z ** 2
);

test('the passive player-body deflection primitive is public in CommonJS and browser builds', () => {
  assert.equal(typeof Ball.resolvePassiveBodyDeflection, 'function');
  const browser = { window: {} };
  vm.runInNewContext(source, browser);
  assert.equal(typeof browser.window.FootballLegacyBallEngineV2.resolvePassiveBodyDeflection, 'function');
});

test('a fast ball cannot tunnel through a player capsule and records exactly one passive contact', () => {
  const state = Ball.createBallState({
    position: { x: 2, y: 0, z: 0.9 },
    velocity: { x: 100, y: 0, z: 0 },
    angularVelocity: { x: 2, y: -1, z: 3 },
    grounded: false,
    contactCount: 4,
    simulationTime: 3.25,
    lastOuterTick: 19,
    metadata: { owner: 'caller' }
  });
  const input = {
    previousBallPosition: { x: 0, y: 0, z: 0.9 },
    body,
    tick: 20,
    fixedTickSeconds: 0.02
  };
  const stateSnapshot = structuredClone(state);
  const bodySnapshot = structuredClone(body);
  const inputSnapshot = structuredClone(input);
  const beforeEnergy = energy(state);

  const result = Ball.resolvePassiveBodyDeflection(state, input);

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.state), true);
  assert.equal(Object.isFrozen(result.event), true);
  assert.equal(result.hit, true);
  assert.ok(result.timeFraction > 0 && result.timeFraction < 1);
  assert.equal(result.state.contactCount, state.contactCount + 1);
  assert.equal(result.state.simulationTime, state.simulationTime, 'the query must not advance physical time');
  assert.equal(result.state.lastOuterTick, state.lastOuterTick, 'the query must not advance the outer clock');
  assert.equal(result.event.colliderId, body.id);
  assert.equal(result.event.colliderKind, Ball.COLLIDER_KINDS.CAPSULE);
  assert.equal(result.event.materialId, Ball.MATERIALS.playerBody.id);
  assert.equal(result.event.energyPolicy, 'passive-contact');
  assert.equal(result.event.timeFraction, result.timeFraction);
  assert.equal(result.event.outerTick, input.tick);
  assert.equal(result.state.lastContact.outerTick, input.tick);
  assert.ok(result.event.afterEnergyJ <= result.event.beforeEnergyJ + 1e-12);
  assert.ok(energy(result.state) <= beforeEnergy + 1e-12);
  assert.ok(result.state.position.x < body.position.x);
  assert.ok(result.state.velocity.x < 0);
  assert.deepEqual(state, stateSnapshot, 'ball input must remain untouched');
  assert.equal(Object.isFrozen(state.metadata), false, 'freezing the result must not freeze caller metadata');
  assert.deepEqual(body, bodySnapshot, 'player input must remain untouched');
  assert.deepEqual(input, inputSnapshot, 'query input must remain untouched');
  assert.notEqual(result.state, state);
});

test('the relative sweep detects a moving capsule without granting it passive energy', () => {
  const state = Ball.createBallState({
    position: { x: 0, y: 0, z: 0.9 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    simulationTime: 7,
    lastOuterTick: 31
  });
  const movingBody = {
    ...body,
    position: { x: -0.5, y: 0, z: 0 },
    velocity: { x: -100, y: 0, z: 0 }
  };
  const result = Ball.resolvePassiveBodyDeflection(state, {
    previousBallPosition: state.position,
    body: movingBody,
    tick: 32,
    fixedTickSeconds: 0.02
  });

  assert.equal(result.hit, true);
  assert.ok(result.timeFraction > 0 && result.timeFraction < 1);
  assert.equal(result.state.contactCount, 1);
  assert.equal(result.event.beforeEnergyJ, 0);
  assert.equal(result.event.afterEnergyJ, 0);
  assert.ok(Object.values(result.state.velocity).every(component => component === 0));
  assert.equal(result.event.energyClamped, true);
  assert.equal(result.event.outerTick, 32);
  assert.equal(result.state.simulationTime, 7);
  assert.equal(result.state.lastOuterTick, 31);
});

test('a miss returns a detached unchanged state and null contact chronology', () => {
  const state = Ball.createBallState({
    position: { x: 0.4, y: 0, z: 0.9 },
    velocity: { x: 20, y: 0, z: 0 },
    grounded: false,
    contactCount: 2,
    simulationTime: 1.5,
    lastOuterTick: 9
  });
  const result = Ball.resolvePassiveBodyDeflection(state, {
    previousBallPosition: { x: 0, y: 0, z: 0.9 },
    body: { ...body, position: { x: 10, y: 0, z: 0 } },
    tick: 10,
    fixedTickSeconds: 0.02
  });

  assert.deepEqual(result, { hit: false, state, event: null, timeFraction: null });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.state), true);
  assert.notEqual(result.state, state);
  assert.notEqual(result.state.position, state.position);
});

test('an overlapping body behind a separating ball is not reported as a deflection', () => {
  const state = Ball.createBallState({
    position: { x: 0.45, y: 0, z: 0.9 },
    velocity: { x: 8, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    grounded: false,
    contactCount: 7,
    simulationTime: 2,
    lastOuterTick: 39,
    metadata: { flight: 'released-pass' }
  });
  const result = Ball.resolvePassiveBodyDeflection(state, {
    previousBallPosition: { x: 0.43, y: 0, z: 0.9 },
    body: {
      ...body,
      id: 'source-player',
      position: { x: 0, y: 0, z: 0 },
      radius: 0.36
    },
    tick: 40,
    fixedTickSeconds: 1 / 60
  });

  assert.equal(result.hit, false);
  assert.equal(result.event, null);
  assert.equal(result.timeFraction, null);
  assert.equal(result.state.contactCount, state.contactCount);
  assert.deepEqual(result.state.position, state.position);
  assert.deepEqual(result.state.velocity, state.velocity);
  assert.deepEqual(result.state.lastContact, state.lastContact);
  assert.deepEqual(result.state.metadata, state.metadata);
});

test('the same player-body query replays byte-identically', () => {
  const state = Ball.createBallState({
    position: { x: 1.4, y: 0.1, z: 1.1 },
    velocity: { x: 34, y: 2, z: -1 },
    angularVelocity: { x: 4, y: 8, z: -3 },
    grounded: false,
    contactCount: 6,
    simulationTime: 2.75,
    lastOuterTick: 15
  });
  const input = {
    previousBallPosition: { x: 0, y: 0.1, z: 1.1 },
    body,
    tick: 16,
    fixedTickSeconds: 1 / 60
  };
  const first = Ball.resolvePassiveBodyDeflection(state, input);
  const second = Ball.resolvePassiveBodyDeflection(state, input);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test('player capsule geometry and sweep duration retain explicit safety bounds', () => {
  const state = Ball.createBallState({ position: { x: 0, y: 0, z: 0.9 }, grounded: false });
  assert.throws(
    () => Ball.resolvePassiveBodyDeflection(state, {
      previousBallPosition: state.position,
      body: { ...body, radius: 0.5, heightM: 1 },
      tick: 0
    }),
    /height must exceed twice its radius/
  );
  assert.throws(
    () => Ball.resolvePassiveBodyDeflection(state, {
      previousBallPosition: state.position,
      body,
      tick: 0,
      fixedTickSeconds: 0.251
    }),
    /safety bound/
  );
  assert.throws(
    () => Ball.resolvePassiveBodyDeflection(state, {
      previousBallPosition: { x: NaN, y: 0, z: 0.9 },
      body,
      tick: 0
    }),
    /previousBallPosition.x must be finite/
  );
  assert.throws(
    () => Ball.resolvePassiveBodyDeflection(state, { previousBallPosition: state.position, body, tick: 1.5 }),
    /non-negative integer/
  );
  assert.throws(
    () => Ball.resolvePassiveBodyDeflection(state, {
      previousBallPosition: state.position,
      body: { ...body, id: '__ground__' },
      tick: 0
    }),
    /reserved/
  );
});
