import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Ball = require('../match-engine/ball-engine-v2.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchSource = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');
const WORLD_SCALE = 1.045;
const W = Math.round(3200 * WORLD_SCALE);
const H = Math.round(2050 * WORLD_SCALE);
const M = Math.round(80 * WORLD_SCALE);
const X_PER_METRE = (W - 2 * M) / 105;
const Y_PER_METRE = H / 68;
const Z_PER_METRE = (H - 12) / 68;
const rad = 12.75;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return source.slice(from, to);
}

function worldDistanceMetres(dx, dy) {
  return Math.hypot((Number(dx) || 0) / X_PER_METRE, (Number(dy) || 0) / Y_PER_METRE);
}

function worldBallSpeedForMetresPerSecond(paceMps, dx = 1, dy = 0) {
  const distance = Math.hypot(dx, dy) || 1;
  const metresPerWorldUnit = worldDistanceMetres(dx / distance, dy / distance);
  return clamp(Number(paceMps) || 0, 0, 40) / (60 * Math.max(.0001, metresPerWorldUnit));
}

const planSource = sourceBetween(matchSource,
  'const DIRECTIONAL_KNOCK_ON_FORWARD_COS', 'function directionalKnockOnRecoveryDecision');
const planContext = vm.createContext({
  clamp,
  rad,
  worldDistanceMetres,
  worldBallSpeedForMetresPerSecond,
  facing: player => ({ x: player.fx ?? 1, y: player.fy ?? 0 })
});
vm.runInContext(`${planSource};this.plan=directionalKnockOnPlan;`, planContext);

function playerForPace(paceMps, direction = { x: 1, y: 0 }) {
  const worldSpeed = worldBallSpeedForMetresPerSecond(paceMps, direction.x, direction.y);
  return {
    id: 'runner', team: 'you', x: 1000, y: 1000,
    vx: direction.x * worldSpeed, vy: direction.y * worldSpeed,
    fx: direction.x, fy: direction.y, gait: 'sprint', locomotionState: 'sprint',
    attrs: { control: 86, pace: 84 }
  };
}

function metricDirection(direction) {
  const mx = direction.x / X_PER_METRE;
  const my = direction.y / Y_PER_METRE;
  const length = Math.hypot(mx, my) || 1;
  return { x: mx / length, y: my / length };
}

function simulateDirectionalRollout(plan, runnerPaceMps, direction) {
  const forward = metricDirection(direction);
  const initialGapMetres = worldDistanceMetres(direction.x * (rad + 9), direction.y * (rad + 9));
  const metadata = plan.groundDampingModel ? {
    groundDampingModel: plan.groundDampingModel,
    groundDampingInitialPerSecond: plan.groundDampingInitialPerSecond,
    groundDampingRampScale: plan.groundDampingRampScale,
    groundDampingRampExponent: plan.groundDampingRampExponent,
    groundDampingOriginX: forward.x * initialGapMetres,
    groundDampingOriginY: forward.y * initialGapMetres,
    groundDampingReferenceDistanceMetres: plan.groundDampingReferenceDistanceMetres,
    groundDampingMaximumProgress: plan.groundDampingMaximumProgress,
    groundSkidFrictionScale: plan.groundSkidFrictionScale,
    groundLinearDampingUntilSeconds: plan.groundLinearDampingUntilSeconds
  } : undefined;
  const launch = Ball.resolveLaunch({
    id: `directional-${plan.tier}`,
    origin: { x: forward.x * initialGapMetres, y: forward.y * initialGapMetres, z: .11 + 1 / Z_PER_METRE },
    direction: { x: forward.x, y: forward.y, z: 0 },
    speed: plan.touchPaceMps,
    liftAngleDeg: Math.atan2(.18 * 60 / Z_PER_METRE, plan.touchPaceMps) * 180 / Math.PI,
    sideSpinRpm: 0,
    topSpinRpm: plan.topSpinRpm,
    source: 'directional-knock-on',
    metadata
  });
  let state = launch.state;
  let context = Ball.createSimulationContext({ seed: 173 });
  let playerX = 0;
  let playerY = 0;
  let maximum = initialGapMetres;
  let previousPace = plan.touchPaceMps;
  let lateMaximumTickLoss = 0;
  let tick = 0;
  for (; tick < 900 && !state.settled; tick += 1) {
    const output = Ball.step(state, context, 1 / 60);
    state = output.state;
    context = output.context;
    playerX += forward.x * runnerPaceMps / 60;
    playerY += forward.y * runnerPaceMps / 60;
    // Measure only the ball's visible lead. Once the footballer has caught and
    // run beyond a settled ball, the negative separation is not another gap.
    const physicalLead = (state.position.x - playerX) * forward.x
      + (state.position.y - playerY) * forward.y;
    maximum = Math.max(maximum, physicalLead);
    const pace = Math.hypot(state.velocity.x, state.velocity.y);
    if (pace < 4) lateMaximumTickLoss = Math.max(lateMaximumTickLoss, Math.max(0, previousPace - pace));
    previousPace = pace;
  }
  const originX = forward.x * initialGapMetres;
  const originY = forward.y * initialGapMetres;
  const travelMetres = (state.position.x - originX) * forward.x
    + (state.position.y - originY) * forward.y;
  return { maximum, travelMetres, settled: state.settled, ticks: tick, lateMaximumTickLoss };
}

test('only a genuine sprint inside the complete 150-degree forward sector receives the new touch ladder', () => {
  const runner = playerForPace(8.8);
  const light = planContext.plan(runner, { x: .75, y: 0 }, { sprint: true });
  const strong = planContext.plan(runner, { x: .95, y: 0 }, { sprint: true });
  const double = planContext.plan(runner, { x: .95, y: 0 }, { sprint: true, double: true });
  assert.deepEqual([light.tier, strong.tier, double.tier],
    ['sprint-forward-light', 'sprint-forward-strong', 'sprint-forward-double']);
  assert.deepEqual([light.touchDistanceMetres, strong.touchDistanceMetres, double.touchDistanceMetres], [3.4, 5.5, 8.5]);
  assert.deepEqual([light.groundDampingModel, strong.groundDampingModel, double.groundDampingModel],
    ['progressive-ground-strike-v2', 'progressive-ground-strike-v2', 'progressive-ground-strike-v2']);

  const seventyFive = 75 * Math.PI / 180;
  const boundary = planContext.plan(runner,
    { x: Math.cos(seventyFive) * .95, y: Math.sin(seventyFive) * .95 }, { sprint: true });
  const oppositeBoundary = planContext.plan(runner,
    { x: Math.cos(seventyFive) * .95, y: -Math.sin(seventyFive) * .95 }, { sprint: true });
  const backwardSide = 76 * Math.PI / 180;
  const antiDirectional = planContext.plan(runner,
    { x: Math.cos(backwardSide) * .95, y: Math.sin(backwardSide) * .95 }, { sprint: true });
  const oppositeAntiDirectional = planContext.plan(runner,
    { x: Math.cos(backwardSide) * .95, y: -Math.sin(backwardSide) * .95 }, { sprint: true });
  const jogging = planContext.plan(playerForPace(5.9), { x: .95, y: 0 }, { sprint: true });
  assert.equal(boundary.tier, 'sprint-forward-strong');
  assert.equal(oppositeBoundary.tier, 'sprint-forward-strong');
  assert.equal(antiDirectional.tier, 'baseline-free-roll');
  assert.equal(oppositeAntiDirectional.tier, 'baseline-free-roll');
  assert.equal(jogging.tier, 'baseline-free-roll');
  assert.equal(jogging.touchDistance, 70 + .84 * 42 + (1 - .86) * 24,
    'the accepted jogging touch distance remains unchanged');
  assert.equal(jogging.touchPaceMps, 7.4 + .84 * 2.2,
    'the accepted jogging touch pace remains unchanged');
  assert.equal(antiDirectional.topSpinRpm, 0);
  assert.equal(jogging.topSpinRpm, 0);
  assert.equal(antiDirectional.groundDampingModel, null,
    'accepted off-angle touch physics remain untagged');
  assert.equal(jogging.groundDampingModel, null,
    'accepted jogging touch physics remain untagged');
});

test('actual Magnus-Reynolds rollout produces the requested light, strong and double sprint gaps', () => {
  const directions = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.SQRT1_2, y: Math.SQRT1_2 }
  ];
  const bands = {
    'sprint-forward-light': [3.2, 4.1],
    'sprint-forward-strong': [4.7, 6.4],
    'sprint-forward-double': [7.4, 9.6]
  };
  const failures = [];
  const rolloutFailures = [];
  const measurements = [];
  for (const runnerPaceMps of [6.5, 7.5, 8.8, 9.2]) {
    for (const direction of directions) {
      const runner = playerForPace(runnerPaceMps, direction);
      const cases = [
        planContext.plan(runner, { x: direction.x * .75, y: direction.y * .75 }, { sprint: true }),
        planContext.plan(runner, { x: direction.x * .95, y: direction.y * .95 }, { sprint: true }),
        planContext.plan(runner, { x: direction.x * .95, y: direction.y * .95 }, { sprint: true, double: true })
      ];
      const rollouts = cases.map(plan => simulateDirectionalRollout(plan, runnerPaceMps, direction));
      const gaps = rollouts.map(row => row.maximum);
      measurements.push(`${runnerPaceMps}m/s ${JSON.stringify(direction)} ${gaps.map(gap => gap.toFixed(3)).join('/')}`);
      for (let index = 0; index < cases.length; index += 1) {
        const plan = cases[index];
        const [minimum, maximum] = bands[plan.tier];
        if (!(gaps[index] >= minimum && gaps[index] <= maximum)) {
          failures.push(`${plan.tier} at ${runnerPaceMps}m/s on ${JSON.stringify(direction)} produced ${gaps[index].toFixed(3)}m`);
        }
      }
      for (let index = 0; index < cases.length; index += 1) {
        const plan = cases[index];
        const rollout = rollouts[index];
        if (!rollout.settled) rolloutFailures.push(`${plan.tier} did not settle naturally`);
        const safetyMargin = plan.maximumTravelDistanceMetres - rollout.travelMetres;
        if (safetyMargin < .35) rolloutFailures.push(
          `${plan.tier} at ${runnerPaceMps}m/s on ${JSON.stringify(direction)} settled only ${safetyMargin.toFixed(3)}m before its safety ceiling`);
        if (rollout.lateMaximumTickLoss > .14) rolloutFailures.push(
          `${plan.tier} at ${runnerPaceMps}m/s on ${JSON.stringify(direction)} late roll lost ${rollout.lateMaximumTickLoss.toFixed(3)}m/s in one tick`);
      }
      assert.ok(gaps[0] < gaps[1] && gaps[1] < gaps[2], JSON.stringify({ runnerPaceMps, direction, gaps }));
    }
  }
  assert.deepEqual(failures, [], measurements.join('\n'));
  assert.deepEqual(rolloutFailures, [], measurements.join('\n'));
});

test('both physical touch launches forward the exact progressive turf profile to Magnus-Reynolds', () => {
  const initialSource = sourceBetween(matchSource,
    'function performDirectionalKnockOn(player', 'function doSkill(');
  const doubleSource = sourceBetween(matchSource,
    'function performDirectionalKnockOnDoubleFollowUp', 'function directionalKnockOnInput');
  for (const source of [initialSource, doubleSource]) {
    assert.match(source, /groundDampingModel:plan\.groundDampingModel/);
    assert.match(source, /groundDampingRampScale:plan\.groundDampingRampScale/);
    assert.match(source, /groundDampingRampExponent:plan\.groundDampingRampExponent/);
    assert.match(source, /groundDampingReferenceDistanceMetres:plan\.groundDampingReferenceDistanceMetres/);
    assert.match(source, /groundSkidFrictionScale:plan\.groundSkidFrictionScale/);
    assert.match(source, /groundLinearDampingUntilSeconds:plan\.groundLinearDampingUntilSeconds/);
  }
});

test('the rapid double flick is a second physical contact and never an ownership shortcut', () => {
  const decisionSource = sourceBetween(matchSource,
    'const DIRECTIONAL_KNOCK_ON_FORWARD_COS', 'function performDirectionalKnockOnDoubleFollowUp');
  const player = playerForPace(8.8);
  const sequence = 'directional-launch-1';
  const ball = {
    owner: null, isShot: false, lastKicker: player, flightType: 'directional-knock-on',
    x: player.x + X_PER_METRE * 1.35, y: player.y,
    directionalKnockOnContract: { playerId: player.id, launchSequence: sequence }
  };
  const context = vm.createContext({
    clamp,
    rad,
    BALLR: 5.55,
    clockFrames: 106,
    ball,
    worldDistanceMetres,
    worldBallSpeedForMetresPerSecond,
    facing: actor => ({ x: actor.fx ?? 1, y: actor.fy ?? 0 }),
    other: team => team === 'you' ? 'opp' : 'you',
    teamList: () => [{ id: 'defender', team: 'opp', x: player.x + X_PER_METRE * 4, y: player.y, sentOff: false }]
  });
  vm.runInContext(`${decisionSource};this.decide=directionalKnockOnDoubleFollowUpDecision;`, context);
  const state = {
    sprint: true,
    knockOnLastFlickFrame: 100,
    knockOnLastFlickPlayerId: player.id,
    knockOnLastFlickTier: 'sprint-forward-strong',
    knockOnLastFlickX: 1,
    knockOnLastFlickY: 0,
    knockOnLastLaunchSequence: sequence,
    knockOnNeutralSeen: true
  };
  const accepted = context.decide(player, { x: .95, y: 0 }, state);
  assert.equal(accepted.eligible, true, JSON.stringify(accepted));
  assert.equal(context.decide(player, { x: .95, y: 0 }, { ...state, knockOnNeutralSeen: false }).eligible, false);
  assert.equal(context.decide(player, { x: .75, y: 0 }, state).eligible, false);
  context.clockFrames = 111;
  assert.equal(context.decide(player, { x: .95, y: 0 }, state).active, false, 'late inputs are not secretly upgraded');

  const followUpSource = sourceBetween(matchSource,
    'function performDirectionalKnockOnDoubleFollowUp', 'function directionalKnockOnInput');
  assert.doesNotMatch(followUpSource, /ball\.owner\s*=/,
    'the second flick must not manufacture ownership before striking the loose ball');
  assert.match(followUpSource, /origin:\{x:startX,y:startY/,
    'the second impulse must begin at the physical ball rather than teleporting it to the footballer');
  assert.match(followUpSource, /playerDistanceMetres/);
  assert.match(followUpSource, /opponentDistanceMetres/);
});

test('controller gesture requires flick, neutral, flick and cannot retrigger while held', () => {
  const gateSource = sourceBetween(matchSource,
    'function directionalSwitchGestureGate', 'function clearStepoverChain');
  const inputSource = sourceBetween(matchSource,
    'function directionalKnockOnInput', 'function performDirectionalKnockOn(');
  let ownsBall = true;
  let initialTouches = 0;
  let followUpTouches = 0;
  const state = {
    sprint: true,
    knockOnLatched: false,
    knockOnSwitchConsumed: false,
    knockOnLastFlickFrame: -Infinity,
    knockOnNeutralSeen: false
  };
  const player = { id: 'runner' };
  const context = vm.createContext({
    clockFrames: 100,
    DIRECTIONAL_KNOCK_ON_DOUBLE_WINDOW_FRAMES: 10,
    hasBall: () => ownsBall,
    performDirectionalKnockOn: (_player, _stick, _isSecond, inputState) => {
      initialTouches += 1;
      inputState.knockOnLastFlickFrame = 100;
      inputState.knockOnNeutralSeen = false;
      return true;
    },
    directionalKnockOnDoubleFollowUpDecision: () => ({ active: true }),
    performDirectionalKnockOnDoubleFollowUp: () => {
      followUpTouches += 1;
      return true;
    }
  });
  vm.runInContext(`${gateSource};${inputSource};this.gate=directionalSwitchGestureGate;this.input=directionalKnockOnInput;`, context);

  assert.equal(context.input(state, player, { x: 1, y: 0 }, false, true, false), true);
  assert.equal(initialTouches, 1);
  assert.equal(state.knockOnSwitchConsumed, true);
  assert.equal(context.input(state, player, { x: 1, y: 0 }, false, true, false), true);
  assert.equal(initialTouches, 1, 'holding the first flick cannot strike the ball twice');

  context.clockFrames = 103;
  context.gate(state, 0);
  context.input(state, player, { x: 0, y: 0 }, false, true, false);
  assert.equal(state.knockOnLatched, false);
  assert.equal(state.knockOnNeutralSeen, true);

  ownsBall = false;
  assert.equal(context.input(state, player, { x: 1, y: 0 }, false, true, false), true);
  assert.equal(followUpTouches, 1);
  assert.equal(state.knockOnSwitchConsumed, true,
    'the second flick stays part of the touch gesture rather than switching footballer');
  assert.equal(context.input(state, player, { x: 1, y: 0 }, false, true, false), true);
  assert.equal(followUpTouches, 1, 'holding the second flick cannot strike the ball twice');
});
