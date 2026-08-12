import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const Ball = require(path.join(root, 'match-engine', 'ball-engine-v2.js'));
const CPU = require(path.join(root, 'match-engine', 'cpu-intelligence-v2.js'));

const almost = (actual, expected, tolerance = 1e-8, label = 'values') => {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label} differ: ${actual} vs ${expected}`);
};

const noAir = {
  gravity: { x: 0, y: 0, z: 0 },
  airDensity: 0,
  angularDecayPerSecond: 0,
  maxSubstep: 1 / 240
};

test('Ball P2: restored random state cannot normalize to the absorbing zero state', () => {
  for (const randomState of [0, 0x100000000, -0x100000000]) {
    assert.throws(
      () => Ball.createSimulationContext({ seed: 17, randomState }),
      /randomState must not be zero/
    );
  }
  const valid = Ball.createSimulationContext({ seed: 17, randomState: 0xffffffff });
  assert.equal(Ball.isSimulationContext(valid), true);
  assert.equal(Ball.isSimulationContext({ ...valid, randomState: 0 }), false);
});

test('Ball P2: explicit zero plane normals fail closed while omission retains the documented default', () => {
  assert.throws(
    () => Ball.createPlaneCollider({ normal: { x: 0, y: 0, z: 0 } }),
    /plane normal must be non-zero/
  );
  assert.deepEqual(Ball.createPlaneCollider({ id: 'default-normal' }).normal, { x: 0, y: 0, z: 1 });
});

test('Ball P2: a translating plane uses cumulative relative motion across every substep', () => {
  const duration = 0.02;
  const planeVelocity = -100;
  const movingPlane = Ball.createPlaneCollider({
    id: 'moving-plane',
    point: { x: 1, y: 0, z: 0 },
    normal: { x: -1, y: 0, z: 0 },
    velocity: { x: planeVelocity, y: 0, z: 0 },
    material: Ball.MATERIALS.boot
  });
  const stationaryPlane = Ball.createPlaneCollider({
    id: 'stationary-plane',
    point: { x: 1, y: 0, z: 0 },
    normal: { x: -1, y: 0, z: 0 },
    material: Ball.MATERIALS.boot
  });
  const context = () => Ball.createSimulationContext({ seed: 51 });
  const stationaryBall = Ball.createBallState({
    position: { x: 0, y: 0, z: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    grounded: false
  });
  const relativeBall = Ball.createBallState({
    position: { x: 0, y: 0, z: 1 },
    velocity: { x: -planeVelocity, y: 0, z: 0 },
    grounded: false
  });
  const moving = Ball.step(
    stationaryBall,
    context(),
    duration,
    { groundEnabled: false, colliders: [movingPlane] },
    noAir
  );
  const equivalent = Ball.step(
    relativeBall,
    context(),
    duration,
    { groundEnabled: false, colliders: [stationaryPlane] },
    noAir
  );
  const movingContact = moving.trace.events.find(event => event.colliderId === 'moving-plane');
  const equivalentContact = equivalent.trace.events.find(event => event.colliderId === 'stationary-plane');
  assert.ok(movingContact, 'the moving plane must reach the ball after more than one substep');
  assert.ok(equivalentContact);
  assert.equal(movingContact.substepCount, 2);
  assert.equal(movingContact.substepCount, equivalentContact.substepCount);
  almost(movingContact.timeFraction, equivalentContact.timeFraction, 1e-12, 'contact fractions');
  almost(moving.state.velocity.x - planeVelocity, equivalent.state.velocity.x, 1e-9,
    'post-contact relative velocities');
  almost(moving.state.position.x - planeVelocity * duration, equivalent.state.position.x, 1e-9,
    'post-contact relative positions');
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const METRIC_PITCH = Object.freeze({ xMin: 0, xMax: 105, yMin: 0, yMax: 68 });
const CANONICAL = CPU.CANONICAL_PITCH;
const CANONICAL_WIDTH = CANONICAL.xMax - CANONICAL.xMin;
const CANONICAL_HEIGHT = CANONICAL.yMax - CANONICAL.yMin;

function pointToMetric(value) {
  return {
    x: (value.x - CANONICAL.xMin) / CANONICAL_WIDTH * (METRIC_PITCH.xMax - METRIC_PITCH.xMin) + METRIC_PITCH.xMin,
    y: (value.y - CANONICAL.yMin) / CANONICAL_HEIGHT * (METRIC_PITCH.yMax - METRIC_PITCH.yMin) + METRIC_PITCH.yMin
  };
}

function pointToCanonical(value) {
  return {
    x: (value.x - METRIC_PITCH.xMin) / (METRIC_PITCH.xMax - METRIC_PITCH.xMin) * CANONICAL_WIDTH + CANONICAL.xMin,
    y: (value.y - METRIC_PITCH.yMin) / (METRIC_PITCH.yMax - METRIC_PITCH.yMin) * CANONICAL_HEIGHT + CANONICAL.yMin
  };
}

function snapshotToMetric(snapshot) {
  const result = clone(snapshot);
  result.pitch = { ...METRIC_PITCH };
  result.offsideLine = pointToMetric({ x: result.offsideLine, y: CANONICAL.yMin }).x;
  result.ball = pointToMetric(result.ball);
  for (const player of result.players) {
    const mapped = pointToMetric(player);
    player.x = mapped.x;
    player.y = mapped.y;
    player.vx = (player.vx || 0) / CANONICAL_WIDTH * (METRIC_PITCH.xMax - METRIC_PITCH.xMin);
    player.vy = (player.vy || 0) / CANONICAL_HEIGHT * (METRIC_PITCH.yMax - METRIC_PITCH.yMin);
    player.formationAnchor = pointToMetric(player.formationAnchor);
  }
  for (const event of result.events) if (event.target) event.target = pointToMetric(event.target);
  return result;
}

test('CPU P2: carrier, possession team and represented team identities must agree', () => {
  const fixture = CPU.createBaleStyleOpenSpaceBeelineFixture();
  const missingPossession = clone(fixture.snapshots.closed);
  missingPossession.possessionTeamId = null;
  assert.throws(() => CPU.decide(missingPossession), /possessionTeamId is required/);

  const mismatchedCarrier = clone(fixture.snapshots.closed);
  mismatchedCarrier.possessionTeamId = 'away';
  assert.throws(() => CPU.decide(mismatchedCarrier), /teamId must match possessionTeamId/);

  const unknownPossessionTeam = clone(fixture.snapshots.closed);
  unknownPossessionTeam.carrierId = null;
  unknownPossessionTeam.possessionTeamId = 'missing-team';
  assert.throws(() => CPU.decide(unknownPossessionTeam), /team represented/);

  const turnover = CPU.decide(fixture.snapshots.turnover);
  assert.deepEqual(turnover.runs, []);
  assert.equal(turnover.carrierIntent.reason, 'no-controlled-possession');
});

test('CPU P2: populated replay memory is structurally validated before deterministic restore', () => {
  const fixture = CPU.createBaleStyleOpenSpaceBeelineFixture();
  const closed = CPU.decide(fixture.snapshots.closed);
  const opened = CPU.decide(fixture.snapshots.opened, closed.memory);
  const reacted = CPU.decide(fixture.snapshots.reacted, opened.memory);
  assert.deepEqual(CPU.createMemory(reacted.memory), reacted.memory);

  const missingNestedPoint = clone(reacted.memory);
  const laneKey = Object.keys(missingNestedPoint.lanes)[0];
  delete missingNestedPoint.lanes[laneKey].target.x;
  assert.throws(() => CPU.createMemory(missingNestedPoint), /finite \{x, y\} point/);

  const badLifecycle = clone(reacted.memory);
  const observationKey = Object.keys(badLifecycle.observations)[0];
  badLifecycle.observations[observationKey].perceivedTick =
    badLifecycle.observations[observationKey].eligibleTick + 1;
  assert.throws(() => CPU.createMemory(badLifecycle), /tick lifecycle is inconsistent/);

  const badCommitment = clone(reacted.memory);
  badCommitment.commitments[fixture.runnerId].offsideTiming.mistakeRisk = 2;
  assert.throws(() => CPU.createMemory(badCommitment), /supported range/);
});

test('CPU P2: spatial config remains strict in declared canonical units on a metric pitch', () => {
  const fixture = CPU.createBaleStyleOpenSpaceBeelineFixture();
  const metric = snapshotToMetric(fixture.snapshots.closed);
  assert.equal(CPU.COORDINATE_CONTRACT.authoredSpatialValues, 'canonical-reference-pitch-units');
  assert.equal(CPU.COORDINATE_CONTRACT.decisionPoints, 'supplied-pitch-units');
  assert.doesNotThrow(() => CPU.validateSnapshot(metric));
  assert.throws(() => CPU.validateSnapshot(metric, { shotDistance: CANONICAL_WIDTH }), /pitch width/);
  assert.throws(() => CPU.validateSnapshot(metric, { laneConflictWidth: CANONICAL_HEIGHT + 1 }), /pitch height/);
  assert.throws(() => CPU.validateSnapshot(metric, { pitchInset: CANONICAL_HEIGHT / 2 }), /playable area/);
  assert.throws(() => CPU.validateSnapshot(metric, { minimumLaneClearance: -1 }), /non-negative/);
  assert.throws(() => CPU.validateSnapshot(metric, { minimumBidScore: -1 }), /non-negative/);
  assert.throws(() => CPU.validateSnapshot(metric, { shotDistance: Number.NaN }), /finite number/);
});

test('CPU P2: canonical and 105x68 inputs produce equivalent decisions and proportionally mapped points', () => {
  const fixture = CPU.createBaleStyleOpenSpaceBeelineFixture();
  const runSequence = mapper => {
    const closed = CPU.decide(mapper(fixture.snapshots.closed));
    const opened = CPU.decide(mapper(fixture.snapshots.opened), closed.memory);
    return CPU.decide(mapper(fixture.snapshots.reacted), opened.memory);
  };
  const canonical = runSequence(clone);
  const metric = runSequence(snapshotToMetric);
  const decisionSignature = decision => ({
    runs: decision.runs.map(run => ({
      playerId: run.playerId,
      runType: run.runType,
      state: run.state,
      movementIntent: run.movementIntent,
      band: run.band,
      score: run.score,
      clearance: run.clearance,
      passClearance: run.passClearance,
      offsideIntent: run.offsideTiming.intent,
      bridgeInstruction: run.offsideTiming.bridgeInstruction
    })),
    carrier: {
      type: decision.carrierIntent.type,
      targetPlayerId: decision.carrierIntent.targetPlayerId,
      confidence: decision.carrierIntent.confidence,
      reason: decision.carrierIntent.reason
    },
    constraints: decision.telemetry.constraints
  });
  assert.deepEqual(decisionSignature(metric), decisionSignature(canonical));
  assert.equal(metric.runs.length, 1);
  const mappedRunTarget = pointToCanonical(metric.runs[0].target);
  almost(mappedRunTarget.x, canonical.runs[0].target.x, 1e-8, 'run target x');
  almost(mappedRunTarget.y, canonical.runs[0].target.y, 1e-8, 'run target y');
  const mappedPassTarget = pointToCanonical(metric.carrierIntent.target);
  almost(mappedPassTarget.x, canonical.carrierIntent.target.x, 1e-8, 'pass target x');
  almost(mappedPassTarget.y, canonical.carrierIntent.target.y, 1e-8, 'pass target y');

  for (const lane of Object.values(metric.memory.lanes)) {
    assert.ok(lane.target.x >= METRIC_PITCH.xMin && lane.target.x <= METRIC_PITCH.xMax);
    assert.ok(lane.target.y >= METRIC_PITCH.yMin && lane.target.y <= METRIC_PITCH.yMax);
  }
  assert.doesNotThrow(() => CPU.createMemory(metric.memory));
});
