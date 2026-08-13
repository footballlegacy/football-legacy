import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchSource = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');
const require = createRequire(import.meta.url);
const Ball = require(path.join(root, 'match-engine', 'ball-engine-v2.js'));

const W = Math.round(3200 * 1.045);
const H = Math.round(2050 * 1.045);
const M = Math.round(80 * 1.045);
const X_PER_METRE = (W - 2 * M) / 105;
const Y_PER_METRE = H / 68;
const Z_PER_METRE = (H - 12) / 68;

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

const queueSource = sourceBetween(
  matchSource,
  'function liveV2QueueLaunch',
  '// MatchClock/Restart/Set-Piece V2'
);
const trajectorySource = sourceBetween(
  matchSource,
  'function humanGroundPassTrajectory',
  'function doPassForHuman'
);

const context = vm.createContext({
  clamp,
  W,
  H,
  M,
  PITCH_UNITS_PER_METRE: Z_PER_METRE,
  worldDistanceMetres: (dx, dy) => Math.hypot(dx / X_PER_METRE, dy / Y_PER_METRE),
  liveV2Authority: {},
  liveV2CanStageProtectedLaunch: () => true,
  liveV2PendingLaunch: null,
  liveV2LaunchSerial: 0,
  liveV2CpuOffsideTiming: null,
  ball: { z: 0 }
});
vm.runInContext(
  `${queueSource}\n${trajectorySource}\n` +
    'this.queue=liveV2QueueLaunch;this.trajectory=humanGroundPassTrajectory;',
  context,
  { filename: 'human-normal-x-rendezvous-v2.vm.js' }
);

function worldSpeedForMetresPerSecond(paceMps, dx, dy) {
  const distance = Math.hypot(dx, dy) || 1;
  const metresPerWorldUnit = Math.hypot(
    (dx / distance) / X_PER_METRE,
    (dy / distance) / Y_PER_METRE
  );
  return paceMps / (60 * metresPerWorldUnit);
}

function stageAndSimulate({ distanceMetres, power, angle }) {
  const origin = { x: W * .35, y: H * .5, z: 1 };
  const target = {
    x: origin.x + Math.cos(angle) * distanceMetres * X_PER_METRE,
    y: origin.y + Math.sin(angle) * distanceMetres * Y_PER_METRE
  };
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const trajectory = context.trajectory(power, distanceMetres);
  const speedWorld = worldSpeedForMetresPerSecond(trajectory.launchPaceMps, dx, dy);
  const intent = context.queue(
    { id: 'passer', team: 'you', x: origin.x, y: origin.y },
    target,
    {
      origin,
      speedWorld,
      loftWorld: 0,
      spin: 0,
      flightType: 'ground-pass'
    }
  );
  assert.ok(intent, 'production V2 queue rejected normal X');

  const metricOrigin = {
    x: (intent.origin.x - M) / X_PER_METRE,
    y: (intent.origin.y - H / 2) / Y_PER_METRE,
    z: Math.max(.11, intent.origin.z / Z_PER_METRE + .11)
  };
  const metricTarget = {
    x: (intent.target.x - M) / X_PER_METRE,
    y: (intent.target.y - H / 2) / Y_PER_METRE
  };
  const launch = Ball.resolveLaunch({
    id: `normal-x-rendezvous-${power}-${distanceMetres}-${angle}`,
    origin: metricOrigin,
    direction: intent.direction,
    speed: intent.speedMetresPerSecond,
    liftAngleDeg: intent.liftAngleDeg,
    sideSpinRpm: intent.sideSpinRpm,
    topSpinRpm: intent.topSpinRpm,
    source: intent.source
  });
  let state = launch.state;
  let simulationContext = Ball.createSimulationContext({ seed: 173 });
  for (let tick = 0; tick < trajectory.predictedArrivalTicks; tick += 1) {
    const output = Ball.step(state, simulationContext, 1 / 60);
    state = output.state;
    simulationContext = output.context;
  }
  return {
    trajectory,
    intent,
    state,
    targetErrorMetres: Math.hypot(
      state.position.x - metricTarget.x,
      state.position.y - metricTarget.y
    ),
    terminalPaceMps: Math.hypot(state.velocity.x, state.velocity.y)
  };
}

test('production Ball V2 reaches the one authored normal-X meeting at its predicted ETA', () => {
  const matrix = [
    { distanceMetres: 5, power: .07, angle: 0 },
    { distanceMetres: 8, power: .20, angle: Math.PI / 2 },
    { distanceMetres: 12, power: .35, angle: Math.PI / 4 },
    { distanceMetres: 18, power: .48, angle: -Math.PI / 3 },
    { distanceMetres: 25, power: .75, angle: Math.PI / 6 },
    { distanceMetres: 15, power: 1, angle: Math.PI / 2 },
    { distanceMetres: 25, power: 1, angle: 0 },
    { distanceMetres: 35, power: 1, angle: -Math.PI / 4 }
  ];
  const violations = [];
  for (const scenario of matrix) {
    const result = stageAndSimulate(scenario);
    const evidence = JSON.stringify({
      ...scenario,
      launchPaceMps: +result.intent.speedMetresPerSecond.toFixed(2),
      predictedArrivalTicks: result.trajectory.predictedArrivalTicks,
      predictedTerminalPaceMps: +result.trajectory.terminalPaceMps.toFixed(2),
      actualTerminalPaceMps: +result.terminalPaceMps.toFixed(2),
      targetErrorMetres: +result.targetErrorMetres.toFixed(3),
      regime: result.state.regime
    });
    if (result.intent.source !== 'ground-pass') violations.push(`not ground-pass: ${evidence}`);
    if (result.intent.liftAngleDeg !== 0) violations.push(`normal X acquired lift: ${evidence}`);
    if (result.targetErrorMetres > 1) violations.push(`missed authored meeting at predicted ETA: ${evidence}`);
    if (result.terminalPaceMps < 4.5 || result.terminalPaceMps > 12.5) {
      violations.push(`terminal pace is not playable: ${evidence}`);
    }
    if (Math.abs(result.terminalPaceMps - result.trajectory.terminalPaceMps) > 1.25) {
      violations.push(`terminal pace prediction drifted: ${evidence}`);
    }
    if (!['skid', 'roll'].includes(result.state.regime)) {
      violations.push(`normal X was not in a ground regime at meeting: ${evidence}`);
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
});

test('normal-X power remains monotonic at one fixed authored meeting', () => {
  const powers = [.07, .35, .65, 1];
  const results = powers.map(power => stageAndSimulate({
    distanceMetres: 15,
    power,
    angle: Math.PI / 5
  }));
  for (let index = 1; index < results.length; index += 1) {
    assert.ok(
      results[index].intent.speedMetresPerSecond > results[index - 1].intent.speedMetresPerSecond,
      'more X power reduced launch pace at the same meeting'
    );
    assert.ok(
      results[index].terminalPaceMps > results[index - 1].terminalPaceMps,
      'more X power reduced terminal pace at the same meeting'
    );
    assert.ok(
      results[index].trajectory.predictedArrivalTicks < results[index - 1].trajectory.predictedArrivalTicks,
      'more X power did not reach the same meeting sooner'
    );
  }
});
