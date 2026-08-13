import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BallV2 = require('../match-engine/ball-engine-v2.js');
const html = fs.readFileSync(new URL('../match-engine/match.html', import.meta.url), 'utf8');
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const WORLD_SCALE = 1.045;
const W = Math.round(3200 * WORLD_SCALE);
const H = Math.round(2050 * WORLD_SCALE);
const M = Math.round(80 * WORLD_SCALE);
const PITCH_UNITS_PER_METRE = (H - 12) / 68;
const X_UNITS_PER_METRE = (W - 2 * M) / 105;
const Y_UNITS_PER_METRE = H / 68;
const ERA = { ballSpeed: 1.03, loft: 1.02, airDrag: .9938, bounce: .49 };

function section(start, end, source = html) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return source.slice(from, to);
}

function trajectoryFunctions() {
  const source = section('function standardLobTrajectory', 'function setPieceDeliveryPlan');
  return new Function('ERA_MATCH', 'PITCH_UNITS_PER_METRE', 'clamp', `
    ${source}
    return { standardLobTrajectory, standardV2AerialServiceTrajectory, standardLowCrossTrajectory, standardCrossTrajectory };
  `)(ERA, PITCH_UNITS_PER_METRE, clamp);
}

function simulateV2(plan, distance, {
  axis = 'x', startHeight = 1, dip = 0, frames = plan.v2ContactFrame
} = {}) {
  const horizontalScale = axis === 'x' ? X_UNITS_PER_METRE : Y_UNITS_PER_METRE;
  const speedMetresPerSecond = plan.v2SpeedWorld * 60 / horizontalScale;
  const verticalIntentMetresPerSecond = plan.v2LoftWorld * 60 / PITCH_UNITS_PER_METRE;
  const liftAngleDeg = Math.atan2(verticalIntentMetresPerSecond, speedMetresPerSecond) * 180 / Math.PI;
  let { state } = BallV2.resolveLaunch({
    id: `aerial-${axis}-${distance}`,
    origin: { x: 0, y: 0, z: startHeight / PITCH_UNITS_PER_METRE + .11 },
    direction: { x: 1, y: 0, z: 0 },
    speed: speedMetresPerSecond,
    liftAngleDeg,
    sideSpinRpm: 0,
    topSpinRpm: Math.abs(dip) * 650,
    axialSpinRpm: 0,
    source: 'v2-aerial-service-acceptance'
  });
  let context = BallV2.createSimulationContext({ seed: 0x174 });
  let maximumHeight = startHeight;
  let minimumHeightBeforeContact = Infinity;
  let firstGroundFrame = null;
  let frameNine = null;
  for (let frame = 1; frame <= frames; frame += 1) {
    ({ state, context } = BallV2.step(state, context, 1 / 60, { groundEnabled: true, colliders: [] }));
    const height = (state.position.z - .11) * PITCH_UNITS_PER_METRE;
    maximumHeight = Math.max(maximumHeight, height);
    minimumHeightBeforeContact = Math.min(minimumHeightBeforeContact, height);
    if (frame === 9) frameNine = { travelled: state.position.x * horizontalScale, height };
    if (!firstGroundFrame && state.regime !== BallV2.REGIMES.FLIGHT) firstGroundFrame = frame;
  }
  return {
    travelled: state.position.x * horizontalScale,
    distanceErrorMetres: Math.abs(state.position.x * horizontalScale - distance) / horizontalScale,
    height: (state.position.z - .11) * PITCH_UNITS_PER_METRE,
    heightErrorMetres: null,
    verticalVelocity: state.velocity.z,
    maximumHeight,
    minimumHeightBeforeContact,
    firstGroundFrame,
    frameNine,
    regime: state.regime
  };
}

function legacyLob(distance, power = .58, mode = 'normal') {
  const driven = mode === 'driven' || mode === 'low-cross';
  const p = clamp(power, .22, 1);
  const flightTicks = Math.round(clamp(
    (driven ? 22 : 30) + distance / (driven ? 95 : 72) + p * (driven ? 5 : 9),
    driven ? 25 : 34,
    driven ? 43 : 62
  ));
  const drag = ERA.airDrag;
  const sum = Math.abs(1 - drag) < .00001 ? flightTicks : (1 - Math.pow(drag, flightTicks)) / (1 - drag);
  const speed = distance / Math.max(1, sum) / ERA.ballSpeed;
  const zv = .26 * (flightTicks - 1) / 2 - 1 / flightTicks;
  const loft = zv / ERA.loft;
  return { flightTicks, speed: +speed.toFixed(3), loft: +loft.toFixed(3), mode, expectedDistance: +distance.toFixed(1) };
}

function legacyCross(distance, power = .58, mode = 'normal') {
  const base = legacyLob(distance, power, mode);
  const contactHeight = mode === 'low-cross' ? 13 : mode === 'driven' ? 32 : 44;
  const ticks = base.flightTicks;
  const zv = (contactHeight - 1 + .26 * ticks * (ticks - 1) / 2) / ticks;
  return { ...base, loft: +(zv / ERA.loft).toFixed(3), contactHeight, contactFrame: ticks };
}

test('shared V2 aerial solver reaches authored cross contacts in the real MR ball model', () => {
  const { standardCrossTrajectory } = trajectoryFunctions();
  const cases = [
    { mode: 'normal', metres: 12, power: .25, dip: 0, contactHeight: 44 },
    { mode: 'normal', metres: 30, power: .58, dip: 0, contactHeight: 44 },
    { mode: 'normal', metres: 46, power: .90, dip: 0, contactHeight: 44 },
    { mode: 'normal', metres: 30, power: .58, dip: .11, contactHeight: 44 },
    { mode: 'driven', metres: 12, power: .25, dip: 0, contactHeight: 32 },
    { mode: 'driven', metres: 30, power: .58, dip: 0, contactHeight: 32 },
    { mode: 'driven', metres: 46, power: .90, dip: .065, contactHeight: 32 }
  ];
  for (const row of cases) {
    const distance = row.metres * PITCH_UNITS_PER_METRE;
    const plan = standardCrossTrajectory(distance, row.power, row.mode, row.dip);
    assert.ok(Number.isInteger(plan.v2ContactFrame) && plan.v2ContactFrame > 0);
    assert.match(plan.calibration, /^fl-v2-mr-si-/);
    for (const axis of ['x', 'y']) {
      const result = simulateV2(plan, distance, { axis, dip: row.dip });
      const contactHeightMetres = row.contactHeight / PITCH_UNITS_PER_METRE;
      result.heightErrorMetres = Math.abs(result.height - row.contactHeight) / PITCH_UNITS_PER_METRE;
      assert.ok(result.distanceErrorMetres <= 1.15,
        `${row.mode} ${row.metres}m ${axis}: distance error ${result.distanceErrorMetres.toFixed(3)}m`);
      assert.ok(result.heightErrorMetres <= .42,
        `${row.mode} ${row.metres}m ${axis}: height ${result.height.toFixed(2)} world, expected ${row.contactHeight} (${contactHeightMetres.toFixed(2)}m)`);
      assert.equal(result.firstGroundFrame, null, `${row.mode} ${row.metres}m must not ground before contact`);
      assert.ok(result.verticalVelocity < 0, `${row.mode} ${row.metres}m should be descending at contact`);
    }
  }
});

test('lofted, driven and over-the-top services reach playable contacts without touching ground Triangle', () => {
  const { standardLobTrajectory, standardV2AerialServiceTrajectory } = trajectoryFunctions();
  const cases = [
    { profile: 'lob', metres: 12, power: .25, contactHeight: 8 },
    { profile: 'lob', metres: 30, power: .58, contactHeight: 8 },
    { profile: 'lob', metres: 50, power: .82, contactHeight: 8 },
    { profile: 'driven-lob', metres: 12, power: .25, contactHeight: 6 },
    { profile: 'driven-lob', metres: 30, power: .58, contactHeight: 6 },
    { profile: 'over-the-top', metres: 18, power: .18, contactHeight: 8 },
    { profile: 'over-the-top', metres: 34, power: .58, contactHeight: 8 },
    { profile: 'over-the-top', metres: 50, power: .90, contactHeight: 8 }
  ];
  for (const row of cases) {
    const distance = row.metres * PITCH_UNITS_PER_METRE;
    const plan = row.profile === 'lob'
      ? standardLobTrajectory(distance, row.power, 'normal')
      : row.profile === 'driven-lob'
        ? standardLobTrajectory(distance, row.power, 'driven')
        : standardV2AerialServiceTrajectory(distance, row.power, row.profile, row.contactHeight, 0);
    for (const axis of ['x', 'y']) {
      const result = simulateV2(plan, distance, { axis });
      const heightErrorMetres = Math.abs(result.height - row.contactHeight) / PITCH_UNITS_PER_METRE;
      assert.ok(result.distanceErrorMetres <= 1.15,
        `${row.profile} ${row.metres}m ${axis}: distance error ${result.distanceErrorMetres.toFixed(3)}m`);
      assert.ok(heightErrorMetres <= .34,
        `${row.profile} ${row.metres}m ${axis}: contact-height error ${heightErrorMetres.toFixed(3)}m`);
      assert.equal(result.firstGroundFrame, null, `${row.profile} ${row.metres}m must remain airborne through contact`);
      assert.ok(result.verticalVelocity < 0, `${row.profile} ${row.metres}m should be descending at contact`);
    }
  }

  const goalKickDistance = 62 * PITCH_UNITS_PER_METRE;
  const longGoalKick = standardV2AerialServiceTrajectory(goalKickDistance, .24, 'lob', 8, .045);
  const early = simulateV2(longGoalKick, goalKickDistance, { axis: 'x', dip: .045 });
  const goalKickHeightErrorMetres = Math.abs(early.height - 8) / PITCH_UNITS_PER_METRE;
  assert.ok(early.distanceErrorMetres <= 1.15,
    `CUO5O-range goal kick distance error ${early.distanceErrorMetres.toFixed(3)}m`);
  assert.ok(goalKickHeightErrorMetres <= .42,
    `CUO5O-range goal kick contact-height error ${goalKickHeightErrorMetres.toFixed(3)}m`);
  assert.equal(early.firstGroundFrame, null, 'CUO5O-range goal kick must stay airborne through its solved contact');
  assert.ok(early.frameNine.height / PITCH_UNITS_PER_METRE >= 1.25,
    `long service must clear the launch lane by frame nine; height ${early.frameNine.height / PITCH_UNITS_PER_METRE}m`);

  const throughSource = section('function doThroughPassFor', 'function doLobPassFor');
  assert.match(throughSource, /v2Trajectory=overTop\?standardV2AerialServiceTrajectory/);
  assert.doesNotMatch(throughSource, /v2Trajectory=!overTop\?/);
});

test('the V2 repair only adds metadata: every Build173 lob and cross field remains byte-for-byte numeric equivalent', () => {
  const { standardLobTrajectory, standardCrossTrajectory } = trajectoryFunctions();
  for (const distance of [180, 520, 780, 1260, 1600]) {
    for (const power of [.22, .41, .58, .77, 1]) {
      for (const mode of ['normal', 'driven']) {
        const actualLob = standardLobTrajectory(distance, power, mode);
        const expectedLob = legacyLob(distance, power, mode);
        for (const key of Object.keys(expectedLob)) assert.equal(actualLob[key], expectedLob[key], `lob ${mode} ${distance} ${power} ${key}`);

        const actualCross = standardCrossTrajectory(distance, power, mode, mode === 'normal' ? .11 : .065);
        const expectedCross = legacyCross(distance, power, mode);
        for (const key of Object.keys(expectedCross)) assert.equal(actualCross[key], expectedCross[key], `cross ${mode} ${distance} ${power} ${key}`);
      }
    }
  }

  const lowCross = standardCrossTrajectory(780, .58, 'low-cross', .025);
  assert.equal(lowCross.mode, 'low-cross');
  assert.equal(lowCross.calibration, 'fl-v2-flat-skid');
  assert.equal(lowCross.contactHeight, 0);
});

test('all requested launch sites forward solved V2 pace, loft and contact telemetry while legacy pace remains present', () => {
  const keeperDistribution = section('function executeGoalkeeperDistribution', 'function aiRestartPass');
  assert.match(keeperDistribution, /v2SpeedWorld:plan\.trajectory\.v2SpeedWorld,v2LoftWorld:plan\.trajectory\.v2LoftWorld,v2ContactFrame:plan\.trajectory\.v2ContactFrame/);
  assert.match(keeperDistribution, /plan\.trajectory\.speed,plan\.trajectory\.loft/);

  const cpuRestart = section('function aiRestartPass', 'function takeUserRestart');
  assert.match(cpuRestart, /standardCrossTrajectory\(serviceDistance,power,'normal',0\)/);
  assert.match(cpuRestart, /trajectory\.speed,trajectory\.loft,'free-kick-cross'/);
  assert.match(cpuRestart, /v2SpeedWorld:v2Trajectory\.v2SpeedWorld,v2LoftWorld:v2Trajectory\.v2LoftWorld/);

  const humanRestart = section('function takeUserRestart', 'function keeperKick');
  assert.match(humanRestart, /v2SpeedWorld:plan\.trajectory\.v2SpeedWorld,v2LoftWorld:plan\.trajectory\.v2LoftWorld/);
  assert.match(humanRestart, /v2ContactFrame:plan\.trajectory\.v2ContactFrame/);

  const liveKeeper = section('function keeperKick', 'const HUMAN_PASS_ASSISTANCE');
  assert.match(liveKeeper, /v2SpeedWorld:trajectory&&trajectory\.v2SpeedWorld,v2LoftWorld:trajectory&&trajectory\.v2LoftWorld,v2ContactFrame:trajectory&&trajectory\.v2ContactFrame/);
  assert.match(liveKeeper, /speed,loft,/);

  const setPiecePlan = section('function setPieceDeliveryPlan', 'function flairPassExecution');
  assert.match(setPiecePlan, /standardV2AerialServiceTrajectory\(distance,p,deliveryMode==='normal'\?'lob':'driven-lob',goalKickContactHeight,dip\)/);

  const humanLob = section('function doLobPassFor', 'function doLobPass');
  assert.match(humanLob, /speed:trajectory\.speed,loft:trajectory\.loft,v2SpeedWorld:trajectory\.v2SpeedWorld,v2LoftWorld:trajectory\.v2LoftWorld/);

  const cpuOpenPlay = section('function aiPass', 'function aiClear');
  assert.match(cpuOpenPlay, /v2SpeedWorld:crossPlan&&crossPlan\.v2SpeedWorld,v2LoftWorld:crossPlan&&crossPlan\.v2LoftWorld/);
  assert.match(cpuOpenPlay, /v2ContactFrame:crossPlan&&crossPlan\.v2ContactFrame/);

  const goalkeeperLaunches = keeperDistribution + liveKeeper;
  assert.doesNotMatch(goalkeeperLaunches, /keeperBypassId|bodyContactEligible|collisionImmune|ignore(?:Body|Collision)/,
    'goal-kick clearance must come from its physical trajectory, not collision immunity');
});
