import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchPath = path.join(root, 'match-engine', 'match.html');
const matchSource = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Ball = require(path.join(root, 'match-engine', 'ball-engine-v2.js'));

// These dimensions are the exact live host dimensions in match.html. Keeping
// both axes is important: liveV2QueueLaunch converts host pace to metric pace
// along the authored direction rather than assuming square host units.
const W = Math.round(3200 * 1.045);
const H = Math.round(2050 * 1.045);
const M = Math.round(80 * 1.045);
const RAD = 12.75;
const X_PER_METRE = (W - 2 * M) / 105;
const Y_PER_METRE = H / 68;
const Z_PER_METRE = (H - 12) / 68;

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
const assistanceSource = sourceBetween(
  matchSource,
  'const HUMAN_PASS_ASSISTANCE',
  'function doPassForHuman'
);
const normalPassSource = sourceBetween(
  matchSource,
  'function doPassForHuman',
  'function doPass(power=0.5)'
);
const throughPassSource = sourceBetween(
  matchSource,
  'function doThroughPassFor',
  'function doLobPassFor'
);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function unit(vector) {
  const magnitude = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function player(overrides = {}) {
  return {
    id: 'passer', name: 'Passer', team: 'you', role: 'mid', attackRole: 'creator',
    x: 1000, y: 1000, vx: 0, vy: 0, fx: 1, fy: 0,
    attrs: { pass: 92 }, stats: { touches: 0 }, sentOff: false, isGK: false,
    ...overrides
  };
}

/**
 * Executes the production normal-X function and production V2 queue adapter in
 * a deliberately small host. No pass-distance, pace, loft, assistance or MR
 * formula is copied into this harness.
 */
function executeNormalX({ power, direction = { x: 1, y: 0 }, teammates = [], passer = player() }) {
  const team = [passer, ...teammates];
  const ball = { owner: passer, x: passer.x, y: passer.y, z: 0, stats: {} };
  const logs = [];
  const context = vm.createContext({
    started: true,
    paused: false,
    inReset: () => false,
    liveV2QueueDribbleAction: () => false,
    kickoffHeld: false,
    takeUserRestart: () => false,
    gamepadInput: { moveX: direction.x, moveY: direction.y },
    gamepadInput2: { moveX: 0, moveY: 0 },
    movementInput: () => direction,
    secondMovementInput: () => direction,
    facing: actor => unit({ x: actor.fx, y: actor.fy }),
    ykeep: null,
    okeep: null,
    hasBall: actor => ball.owner === actor,
    teamList: () => team,
    predictiveLaneRisk: () => 0,
    nearestOpponentDistance: actor => Number(actor.testSpace ?? 150),
    passValue: (_source, target) => Number(target.testPassValue ?? 0),
    other: currentTeam => currentTeam === 'you' ? 'opp' : 'you',
    CONFIG: { weather: 'day' },
    clamp,
    W,
    H,
    M,
    PITCH_UNITS_PER_METRE: Z_PER_METRE,
    worldDistanceMetres: (dx, dy) => Math.hypot((Number(dx) || 0) / X_PER_METRE, (Number(dy) || 0) / Y_PER_METRE),
    worldBallSpeedForMetresPerSecond: (paceMps, dx = 1, dy = 0) => {
      const distance = Math.hypot(dx, dy) || 1;
      const metresPerWorldUnit = Math.hypot((dx / distance) / X_PER_METRE, (dy / distance) / Y_PER_METRE);
      return clamp(Number(paceMps) || 0, 0, 40) / (60 * Math.max(.0001, metresPerWorldUnit));
    },
    ball,
    poss: 0,
    rad: RAD,
    liveV2Authority: {},
    liveV2CanStageProtectedLaunch: () => true,
    liveV2PendingLaunch: null,
    liveV2LaunchSerial: 0,
    liveV2CpuOffsideTiming: null,
    clockFrames: 1000,
    recordPass: () => {},
    logEvent: (kind, eventTeam, actor, details) => logs.push({ kind, team: eventTeam, actor, details }),
    actionPowerPulse: () => {},
    kickSound: () => {},
    armOffsideCandidate: () => {},
    clearRestartState: () => {},
    restartMsg: '',
    SAME_TEAM_COOP: false,
    controlled: passer,
    controlledOpp: null,
    offsideCandidate: null,
    clockRunning: true
  });
  vm.runInContext('Math.random=()=>0.5;', context);
  vm.runInContext(
    `${queueSource}\n${assistanceSource}\n${normalPassSource}\n` +
      'this.doPassForHuman=doPassForHuman;this.minimumPassDot=humanPassAssistanceMinDot("pass",1);' +
      'this.normalXPace=humanGroundPassPaceMetresPerSecond;this.normalXTrajectory=humanGroundPassTrajectory;',
    context,
    { filename: 'current-human-normal-x-pass.vm.js' }
  );
  context.doPassForHuman(passer, power, false, direction);
  return {
    passer,
    ball,
    logs,
    launch: context.liveV2PendingLaunch,
    controlled: context.controlled,
    minimumPassDot: context.minimumPassDot,
    normalXPace: context.normalXPace,
    normalXTrajectory: context.normalXTrajectory
  };
}

function resolveCurrentMrFlight(intent, maximumSeconds = 6) {
  assert.ok(intent, 'normal X must stage a V2 launch intent');
  const origin = {
    x: (intent.origin.x - M) / X_PER_METRE,
    y: (intent.origin.y - H / 2) / Y_PER_METRE,
    z: Math.max(.11, intent.origin.z / Z_PER_METRE + .11)
  };
  const target = {
    x: (intent.target.x - M) / X_PER_METRE,
    y: (intent.target.y - H / 2) / Y_PER_METRE,
    z: .11
  };
  const launch = Ball.resolveLaunch({
    id: `normal-x-${intent.sequence}`,
    origin,
    direction: intent.direction,
    speed: intent.speedMetresPerSecond,
    liftAngleDeg: intent.liftAngleDeg,
    sideSpinRpm: intent.sideSpinRpm,
    topSpinRpm: intent.topSpinRpm,
    source: intent.source
  });
  const targetDistance = Math.hypot(target.x - origin.x, target.y - origin.y);
  const targetWindow = clamp(1.35 + targetDistance * .025, 1.5, 3.25);
  const thresholds = [0.25, 0.5, 0.75];
  const thresholdSpeeds = new Map();
  let state = launch.state;
  let context = Ball.createSimulationContext({ seed: 173 });
  let arrival = null;
  let minimumTargetDistance = Infinity;
  const launchHorizontalSpeed = Math.hypot(state.velocity.x, state.velocity.y);
  for (let tick = 1; tick <= Math.round(maximumSeconds * 60); tick += 1) {
    const output = Ball.step(state, context, 1 / 60);
    state = output.state;
    context = output.context;
    const travelled = Math.hypot(state.position.x - origin.x, state.position.y - origin.y);
    const distanceToTarget = Math.hypot(state.position.x - target.x, state.position.y - target.y);
    const horizontalSpeed = Math.hypot(state.velocity.x, state.velocity.y);
    minimumTargetDistance = Math.min(minimumTargetDistance, distanceToTarget);
    for (const threshold of thresholds) {
      if (!thresholdSpeeds.has(threshold) && travelled >= targetDistance * threshold) {
        thresholdSpeeds.set(threshold, horizontalSpeed);
      }
    }
    if (!arrival && distanceToTarget <= targetWindow) {
      arrival = { tick, seconds: tick / 60, speed: horizontalSpeed, distanceToTarget };
    }
  }
  return {
    intent,
    origin,
    target,
    targetDistance,
    targetWindow,
    launchHorizontalSpeed,
    thresholdSpeeds: Object.fromEntries(thresholds.map(threshold => [threshold, thresholdSpeeds.get(threshold) ?? null])),
    arrival,
    minimumTargetDistance,
    final: {
      seconds: maximumSeconds,
      speed: Math.hypot(state.velocity.x, state.velocity.y),
      distanceFromOrigin: Math.hypot(state.position.x - origin.x, state.position.y - origin.y),
      settled: state.settled,
      regime: state.regime
    }
  };
}

function formatFlight(row) {
  const flight = row.flight;
  return JSON.stringify({
    power: row.power,
    metres: +flight.targetDistance.toFixed(2),
    launchMps: +flight.launchHorizontalSpeed.toFixed(2),
    arrivalSeconds: flight.arrival && +flight.arrival.seconds.toFixed(2),
    arrivalMps: flight.arrival && +flight.arrival.speed.toFixed(2),
    quarterMps: flight.thresholdSpeeds[0.25] && +flight.thresholdSpeeds[0.25].toFixed(2),
    halfMps: flight.thresholdSpeeds[0.5] && +flight.thresholdSpeeds[0.5].toFixed(2),
    threeQuarterMps: flight.thresholdSpeeds[0.75] && +flight.thresholdSpeeds[0.75].toFixed(2),
    finalMps: +flight.final.speed.toFixed(2),
    finalMetres: +flight.final.distanceFromOrigin.toFixed(2)
  });
}

test('normal-X acceptance is isolated from the proven through-ball weight and flight formula', () => {
  assert.match(throughPassSource, /(?:const\s+[^;]*,)?speed=overTop\?[^:]+:clamp\(7\.2\+distance\*\.0045\+p\*2\.0,7\.8,13\.8\)/,
    'the proven through-ball pace formula changed while calibrating normal X');
  assert.match(throughPassSource, /baseLoft=overTop\?clamp\(trajectory\.loft\*\.88,3\.1,7\.8\):\.10/,
    'the proven ground through-ball flight changed while calibrating normal X');
  assert.doesNotMatch(normalPassSource, /doThroughPassFor\s*\(/,
    'normal X must not acquire its calibration by routing through Triangle');
});

test('full-stick normal-X assistance cannot select or redirect outside the authored channel', () => {
  const inChannel = player({
    id: 'in-channel', name: 'In Channel', x: 1190, y: 1000,
    vx: 0, vy: 42, testSpace: 70, testPassValue: -200
  });
  const outsideChannel = player({
    id: 'outside-channel', name: 'Outside Channel', x: 1000, y: 1190,
    vx: 0, vy: 0, testSpace: 220, testPassValue: 500
  });
  const result = executeNormalX({
    power: .1,
    direction: { x: 1, y: 0 },
    teammates: [outsideChannel, inChannel]
  });
  assert.ok(result.launch, 'normal X did not stage a V2 launch');
  assert.equal(result.ball.target?.id, inChannel.id,
    'an attractive teammate outside the full-stick channel overrode the authored aim');
  assert.equal(result.launch.targetPlayerId, inChannel.id);
  const authored = { x: 1, y: 0 };
  const endpointDirection = unit({
    x: result.launch.target.x - result.passer.x,
    y: result.launch.target.y - result.passer.y
  });
  const endpointDot = endpointDirection.x * authored.x + endpointDirection.y * authored.y;
  assert.ok(endpointDot >= result.minimumPassDot - 1e-9,
    `rendezvous assistance redirected dot ${endpointDot.toFixed(3)} below full-stick channel ${result.minimumPassDot.toFixed(3)}`);
});

test('normal-X power produces monotonic range and launch pace through its 5-35 m ground-pass band', () => {
  const powers = [.07, .15, .25, .40, .55, .70, .85, 1];
  const rows = powers.map(power => {
    const result = executeNormalX({ power });
    return { power, result, flight: resolveCurrentMrFlight(result.launch) };
  });
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(rows[index].flight.targetDistance > rows[index - 1].flight.targetDistance,
      `more X power reduced range: ${formatFlight(rows[index - 1])} -> ${formatFlight(rows[index])}`);
    assert.ok(rows[index].flight.launchHorizontalSpeed + 1e-9 >= rows[index - 1].flight.launchHorizontalSpeed,
      `more X power reduced launch pace: ${formatFlight(rows[index - 1])} -> ${formatFlight(rows[index])}`);
  }
});

test('normal-X hold power changes the V2 launch and terminal pace even when receiving distance is fixed', () => {
  const { normalXTrajectory } = executeNormalX({ power: .1 });
  const distanceMetres = 15;
  const tap = normalXTrajectory(.07, distanceMetres);
  const medium = normalXTrajectory(.50, distanceMetres);
  const firm = normalXTrajectory(1, distanceMetres);
  assert.ok(tap.launchPaceMps < medium.launchPaceMps && medium.launchPaceMps < firm.launchPaceMps,
    `normal X still uses power only to choose range at a fixed endpoint: ${JSON.stringify({ tap, medium, firm })}`);
  assert.ok(tap.terminalPaceMps < medium.terminalPaceMps && medium.terminalPaceMps < firm.terminalPaceMps,
    `normal X lost terminal power feel at a fixed endpoint: ${JSON.stringify({ tap, medium, firm })}`);
});

test('representative 5-35 m normal-X passes stay grounded, decelerate and enter playable windows', () => {
  const powers = [.07, .30, .55, .78, 1];
  const rows = powers.map(power => {
    const result = executeNormalX({ power });
    return { power, result, flight: resolveCurrentMrFlight(result.launch) };
  });
  const violations = [];
  const accept = (condition, message) => { if (!condition) violations.push(message); };
  for (const row of rows) {
    const { result, flight } = row;
    const evidence = formatFlight(row);
    accept(result.launch.source === 'ground-pass', `normal X became a charged lob: ${evidence}`);
    accept(result.ball.zv === 0, `5-35 m normal X acquired host loft: ${evidence}`);
    accept(result.launch.liftAngleDeg === 0, `5-35 m normal X acquired MR lift: ${evidence}`);

    // A broad lower bound catches the weak/towed-ball failure reported in the
    // FL-MSQ1ILVP playtest while leaving plenty of room below elite driven
    // passes. The upper bound prevents the former 45-50 m/s regression.
    accept(flight.launchHorizontalSpeed >= 6.4 && flight.launchHorizontalSpeed <= 30,
      `normal X did not launch with believable crispness: ${evidence}`);
    accept(Boolean(flight.arrival), `normal X never entered its receiving window: ${evidence}`);
    if (flight.arrival) {
      accept(flight.arrival.seconds >= .22 && flight.arrival.seconds <= 2.6,
        `normal X reached its receiving window implausibly: ${evidence}`);
      accept(flight.arrival.speed >= 3.2,
        `normal X died before a receiver could meet it: ${evidence}`);
      accept(flight.arrival.speed <= flight.launchHorizontalSpeed * .97,
        `normal X floated at near-constant pace instead of visibly decelerating: ${evidence}`);
    }

    const quarter = flight.thresholdSpeeds[0.25];
    const half = flight.thresholdSpeeds[0.5];
    const threeQuarter = flight.thresholdSpeeds[0.75];
    accept([quarter, half, threeQuarter].every(Number.isFinite),
      `normal X did not traverse its intended path: ${evidence}`);
    if ([quarter, half, threeQuarter].every(Number.isFinite)) {
      accept(quarter + 1e-6 >= half && half + 1e-6 >= threeQuarter,
        `normal X accelerated or held an artificial glide through its path: ${evidence}`);
    }
  }
  assert.deepEqual(violations, [], violations.join('\n'));
});

test('full-charge normal X is a believable 30-35 m driven ground pass, never an implicit lob', () => {
  const result = executeNormalX({ power: 1 });
  const flight = resolveCurrentMrFlight(result.launch);
  assert.equal(result.launch.source, 'ground-pass');
  assert.equal(result.ball.flightType, 'ground-pass');
  assert.equal(result.ball.zv, 0);
  assert.equal(result.launch.liftAngleDeg, 0);
  assert.ok(flight.targetDistance >= 30 && flight.targetDistance <= 35,
    `full-charge X authored ${flight.targetDistance.toFixed(2)} m instead of an elite 30-35 m ground pass`);
  assert.ok(flight.arrival, `full-charge X never reached its meeting: ${formatFlight({ power: 1, flight })}`);
});

test('chase-only receiver assignment uses the exact same meeting as the Ball-V2 target', () => {
  const runner = player({ id: 'runner', name: 'Runner', x: 1650, y: 1000, vx: 0, vy: 0 });
  const result = executeNormalX({ power: .30, teammates: [runner] });
  const assignment = result.logs.find(event => event.kind === 'pass-receiver-assignment');
  const intent = result.logs.find(event => event.kind === 'human-pass-intent');
  assert.ok(assignment, 'scenario did not exercise chase-only assignment');
  assert.equal(result.launch.targetPlayerId, runner.id);
  assert.equal(assignment.details.sameAsBallTarget, true);
  assert.equal(assignment.details.meetingX, +result.launch.target.x.toFixed(1));
  assert.equal(assignment.details.meetingY, +result.launch.target.y.toFixed(1));
  assert.equal(intent.details.authoredMeetingX, +result.launch.target.x.toFixed(1));
  assert.equal(intent.details.authoredMeetingY, +result.launch.target.y.toFixed(1));
  assert.ok(Number.isFinite(intent.details.requestedDistanceMetres));
  assert.ok(Number.isFinite(intent.details.authoredDistanceMetres));
  assert.ok(Number.isFinite(intent.details.v2FlightDistanceMetres));
  assert.equal(intent.details.predictedArrivalTicks, result.launch.predictedArrivalTicks);
  assert.equal(intent.details.predictedTerminalPaceMps,
    +result.launch.predictedTerminalPaceMetresPerSecond.toFixed(2));
});
