import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchSource = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');
const W = Math.round(3200 * 1.045);
const H = Math.round(2050 * 1.045);
const M = Math.round(80 * 1.045);
const X_PER_METRE = (W - 2 * M) / 105;
const Y_PER_METRE = H / 68;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function between(start, end) {
  const from = matchSource.indexOf(start);
  const to = matchSource.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return matchSource.slice(from, to);
}

const restartSource = between('function takeUserRestart', 'function keeperKick');

function runGroundRestart({ power, direction, teammates }) {
  const taker = {
    id: 'taker',
    team: 'you',
    x: 1000,
    y: 1000,
    fx: 1,
    fy: 0,
    attrs: { pass: 90, technique: 88 }
  };
  const ball = { x: taker.x, y: taker.y, owner: taker, target: null };
  const launches = [];
  const events = [];
  const completions = [];
  const worldDistanceMetres = (dx, dy) => Math.hypot(dx / X_PER_METRE, dy / Y_PER_METRE);
  const context = vm.createContext({
    W,
    H,
    M,
    PITCH_UNITS_PER_METRE: (H - 12) / 68,
    clamp,
    ball,
    controlled: taker,
    kickoffHeld: true,
    restartTaker: taker,
    restartMsg: 'FREE KICK',
    restartCanBeTaken: () => true,
    setPieceAimPoint: () => ({ x: W - M, y: H / 2, height: .5, curve: 0 }),
    facing: player => {
      const distance = Math.hypot(player.fx, player.fy) || 1;
      return { x: player.fx / distance, y: player.fy / distance };
    },
    teamList: () => [taker, ...teammates],
    nearestPlayerToPoint: () => {
      throw new Error('ground free kick used nearest-player fallback');
    },
    setPieceReceiver: () => {
      throw new Error('ground free kick used generic set-piece fallback');
    },
    worldDistanceMetres,
    humanGroundPassMeetingWithinRange: (source, point, maximumMetres) => {
      const dx = point.x - source.x;
      const dy = point.y - source.y;
      const distanceMetres = worldDistanceMetres(dx, dy);
      if (distanceMetres <= maximumMetres) {
        return { x: point.x, y: point.y, distanceMetres, rangeClamped: false };
      }
      const scale = maximumMetres / distanceMetres;
      return {
        x: source.x + dx * scale,
        y: source.y + dy * scale,
        distanceMetres: maximumMetres,
        rangeClamped: true
      };
    },
    humanGroundPassTrajectory: (resolvedPower, distanceMetres) => ({
      launchPaceMps: 12 + resolvedPower * 5,
      terminalPaceMps: 6 + resolvedPower * 2,
      predictedArrivalTicks: Math.round(20 + distanceMetres * 2),
      model: 'focused-test-trajectory'
    }),
    humanGroundPassPaceMetresPerSecond: resolvedPower => 10 + resolvedPower * 5,
    worldBallSpeedForMetresPerSecond: pace => pace / 60,
    playRestartBallToPoint: (source, point, speed, loft, flightType, target, options) => {
      launches.push({ source, point: { ...point }, speed, loft, flightType, target, options: { ...options } });
      ball.owner = null;
      ball.target = target;
      return true;
    },
    logEvent: (type, team, actor, facts) => events.push({ type, team, actor, facts: { ...facts } }),
    completeRestart: target => completions.push(target),
    showEvent: () => {},
    takeUserSetPieceShot: () => {
      throw new Error('ground free kick entered shot branch');
    }
  });
  vm.runInContext(`${restartSource}\nthis.take=takeUserRestart;`, context, {
    filename: 'human-free-kick-ground-channel-authority.vm.js'
  });
  const accepted = context.take('pass', power, taker, 'ground-pass', direction);
  return { accepted, ball, taker, launches, events, completions, worldDistanceMetres };
}

test('free-kick hint explicitly identifies Cross/A as the ground pass', () => {
  const display = between('function updateDeadBallDisplay', 'function clearRestartState');
  assert.match(display, /<b>Cross \/ A<\/b> ground pass on the LS line/);
});

test('ground free kick has no generic receiver fallback and records its authority facts', () => {
  const branch = between("if(deliveryMode==='ground-pass'){", "}else{\n        const initialTarget");
  assert.doesNotMatch(branch, /nearestPlayerToPoint|setPieceReceiver/);
  assert.match(branch, /target=choice\?choice\.q:null/);
  assert.match(branch, /selection:target\?'eligible-in-authored-channel':'none-launch-authored-point'/);
  assert.match(branch, /authoredPointPreserved:/);
  assert.match(branch, /endpointWithinChannel:/);
  assert.match(branch, /endpointWithinRange:/);
});

test('no in-channel teammate launches to the authored stick-power point with target null', () => {
  const power = .5;
  const result = runGroundRestart({
    power,
    direction: { x: 1, y: 0 },
    teammates: [
      { id: 'sideways', team: 'you', x: 1000 + X_PER_METRE, y: 1000 + 10 * Y_PER_METRE, isGK: false, sentOff: false },
      { id: 'too-far', team: 'you', x: 1000 + 30 * X_PER_METRE, y: 1000, isGK: false, sentOff: false }
    ]
  });
  assert.equal(result.accepted, true);
  assert.equal(result.launches.length, 1);
  const launch = result.launches[0];
  const requestedMetres = clamp(5.5 + Math.pow(power, 1.12) * 20.5, 5.5, 26);
  assert.equal(launch.target, null);
  assert.equal(result.ball.target, null);
  assert.equal(result.completions[0], null);
  assert.ok(Math.abs(launch.point.x - (1000 + requestedMetres * X_PER_METRE)) < 1e-6);
  assert.ok(Math.abs(launch.point.y - 1000) < 1e-6);
  assert.equal(launch.flightType, 'ground-pass');
  assert.equal(launch.loft, 0);
  assert.equal(launch.options.v2LoftWorld, 0);
  const facts = result.events.at(-1).facts;
  assert.equal(facts.targetId, null);
  assert.equal(facts.selection, 'none-launch-authored-point');
  assert.equal(facts.candidateCount, 0);
  assert.equal(facts.authoredPointPreserved, true);
  assert.equal(facts.endpointWithinChannel, true);
  assert.equal(facts.endpointWithinRange, true);
});

test('an eligible teammate may be selected but the meeting stays inside stick channel and power range', () => {
  const power = .8;
  const receiver = {
    id: 'inside-channel',
    team: 'you',
    x: 1000 + 12 * X_PER_METRE,
    y: 1000 + 2 * Y_PER_METRE,
    isGK: false,
    sentOff: false
  };
  const result = runGroundRestart({
    power,
    direction: { x: 1, y: 0 },
    teammates: [
      receiver,
      { id: 'closer-but-outside-channel', team: 'you', x: 1000 + X_PER_METRE, y: 1000 + 8 * Y_PER_METRE, isGK: false, sentOff: false }
    ]
  });
  const launch = result.launches[0];
  const facts = result.events.at(-1).facts;
  const dx = launch.point.x - result.taker.x;
  const dy = launch.point.y - result.taker.y;
  const endpointDot = dx / Math.hypot(dx, dy);
  const endpointMetres = result.worldDistanceMetres(dx, dy);
  assert.equal(launch.target, receiver);
  assert.equal(result.ball.target, receiver);
  assert.equal(result.completions[0], receiver);
  assert.equal(facts.selection, 'eligible-in-authored-channel');
  assert.equal(facts.targetId, receiver.id);
  assert.equal(facts.candidateCount, 1);
  assert.ok(endpointDot >= facts.minimumDot);
  assert.ok(endpointMetres <= facts.authoredRangeMetres + .01);
  assert.equal(facts.endpointWithinChannel, true);
  assert.equal(facts.endpointWithinRange, true);
  assert.equal(facts.authoredPointPreserved, false);
});
