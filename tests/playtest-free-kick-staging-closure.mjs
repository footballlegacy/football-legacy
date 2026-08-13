import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const match = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');

function sourceBetween(start, end) {
  const from = match.indexOf(start);
  const to = match.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source start: ${start}`);
  assert.ok(to > from, `missing source end: ${end}`);
  return match.slice(from, to);
}

const W = Math.round(3200 * 1.045);
const H = Math.round(2050 * 1.045);
const M = Math.round(80 * 1.045);
const rad = 12.75;
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const attackDirection = team => team === 'you' ? 1 : -1;
const positionFamily = player => {
  const unit = String(player?.unitRole || '').toLowerCase();
  if (unit.startsWith('centre-back')) return 'centre-back';
  if (unit.startsWith('fullback')) return 'full-back';
  if (unit.startsWith('wingback')) return 'wing-back';
  return player?.role === 'def' ? 'centre-back' : player?.role === 'fwd' ? 'striker' : 'central-midfielder';
};

function player(id, team, role, unitRole, homeX, homeY, defend = 75) {
  return { id, team, role, unitRole, homeX, homeY, attrs: { defend }, vx: 3, vy: -2, sentOff: false };
}

test('free-kick rest-defence and compact-line helpers are mirror-safe and preserve football roles', () => {
  const helperSource = sourceBetween('function freeKickRestDefenders', 'function arrangeFreeKickSetPiece');
  const helpers = vm.runInNewContext(`${helperSource};({freeKickRestDefenders,freeKickRestDefenderTarget,freeKickCompactDefensiveTarget})`, {
    W, H, M, rad, clamp, attackDirection, positionFamily, Object
  });

  const homePlayers = [
    player('cb-left', 'you', 'def', 'centre-back-left', W * .29, H * .37, 91),
    player('cb-right', 'you', 'def', 'centre-back-right', W * .29, H * .63, 89),
    player('fb-left', 'you', 'def', 'fullback-left', W * .34, H * .12, 84),
    player('cm', 'you', 'mid', 'central-mid-left', W * .46, H * .44, 78),
    player('st', 'you', 'fwd', 'striker-left', W * .61, H * .34, 35)
  ];
  const selected = helpers.freeKickRestDefenders(homePlayers);
  assert.deepEqual(selected.map(row => row.id), ['cb-left', 'cb-right']);
  const homeTargets = selected.map((row, index) => helpers.freeKickRestDefenderTarget(row, 'you', index));
  assert.ok(homeTargets.every(target => target.x < W / 2), JSON.stringify(homeTargets));
  assert.ok(homeTargets.every(target => target.priority >= 3.6));

  const awayPlayers = homePlayers.map(row => ({ ...row, id: `away-${row.id}`, team: 'opp', homeX: W - row.homeX }));
  const awayTargets = helpers.freeKickRestDefenders(awayPlayers).map((row, index) => helpers.freeKickRestDefenderTarget(row, 'opp', index));
  assert.ok(awayTargets.every(target => target.x > W / 2), JSON.stringify(awayTargets));
  homeTargets.forEach((target, index) => assert.ok(Math.abs(target.x + awayTargets[index].x - W) < .01));

  const highHomeReference = W * .47;
  const homeAttackingBackline = helpers.freeKickCompactDefensiveTarget(
    player('away-cb', 'opp', 'def', 'centre-back-left', W * .69, H * .38, 90),
    'you',
    highHomeReference
  );
  assert.ok(homeAttackingBackline.x > W / 2, JSON.stringify(homeAttackingBackline));
  assert.ok(homeAttackingBackline.x > highHomeReference, JSON.stringify(homeAttackingBackline));

  const highAwayReference = W - highHomeReference;
  const awayAttackingBackline = helpers.freeKickCompactDefensiveTarget(
    player('home-cb', 'you', 'def', 'centre-back-left', W * .31, H * .38, 90),
    'opp',
    highAwayReference
  );
  assert.ok(awayAttackingBackline.x < W / 2, JSON.stringify(awayAttackingBackline));
  assert.ok(awayAttackingBackline.x < highAwayReference, JSON.stringify(awayAttackingBackline));
  assert.ok(Math.abs(homeAttackingBackline.x + awayAttackingBackline.x - W) < .01);
});

function makeReadinessRuntime() {
  let now = 13_000;
  const events = [];
  const taker = player('taker', 'you', 'mid', 'central-mid-left', W * .4, H / 2);
  const essential = player('essential', 'you', 'def', 'centre-back-left', W * .2, H * .35);
  const support = player('support', 'opp', 'mid', 'central-mid-left', W * .8, H * .6);
  essential.x = W * .8; essential.y = H * .8; essential.setPieceTarget = { x: W * .3, y: H * .35, priority: 3.6 };
  support.x = W * .2; support.y = H * .2; support.setPieceTarget = { x: W * .7, y: H * .6, priority: 2.4 };
  const context = {
    performance: { now: () => now },
    restartMsg: 'FREE KICK', restartForceAt: 4_000, restartEarliestAt: 2_000, restartStartedAt: 0,
    restartReadySince: 0, restartReadySignalled: false, kickoffHeld: true, paused: false,
    restartTaker: taker, controlled: taker, controlledOpp: null,
    you: [taker, essential], opp: [support], ykeep: null, okeep: null,
    D: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
    pendingFightWindowActive: () => false,
    enforceKickoffRestrictions() {}, kickoffPlayersLegal: () => true,
    enforceGoalKickExclusion() {}, teamList: () => [], other: team => team === 'you' ? 'opp' : 'you', inOwnPenaltyArea: () => false,
    enforcePenaltyExclusion() {}, penaltyPlayersLegal: () => true,
    inReset: () => false, teamHasHumanController: () => false,
    whistle() {}, showEvent() {}, logEvent: (type, team, actor, detail) => events.push({ type, detail }),
    Math
  };
  const readinessSource = sourceBetween('function setPieceReady', 'function updateDeadBallDisplay');
  const api = vm.runInNewContext(`${readinessSource};({setPieceReady,settleFreeKickStagingAtDeadline,restartCanBeTaken,cpuNonKickoffRestartWatchdogEligible})`, context);
  return { context, api, events, essential, support, setNow: value => { now = value; } };
}

test('the free-kick force deadline stages players before the whistle instead of bypassing readiness', () => {
  const runtime = makeReadinessRuntime();
  assert.equal(runtime.api.restartCanBeTaken(), false, 'deadline frame must stage, not immediately launch');
  for (const row of [runtime.essential, runtime.support]) {
    assert.equal(row.x, row.setPieceTarget.x);
    assert.equal(row.y, row.setPieceTarget.y);
    assert.equal(row.vx, 0);
    assert.equal(row.vy, 0);
    assert.equal(row.setPieceLocked, true);
  }
  assert.equal(runtime.events.filter(row => row.type === 'restart-staging-forced-settle').length, 1);
  assert.equal(runtime.events.find(row => row.type === 'restart-staging-forced-settle').detail.essential, 2);
  runtime.setNow(13_241);
  assert.equal(runtime.api.restartCanBeTaken(), true, 'staged players receive the normal whistle-stability window');
});

test('the CPU free-kick watchdog cannot bypass the same staging gate', () => {
  const runtime = makeReadinessRuntime();
  assert.equal(runtime.api.cpuNonKickoffRestartWatchdogEligible(), false, 'watchdog must stage first and wait for stability');
  assert.equal(runtime.essential.x, runtime.essential.setPieceTarget.x);
  assert.equal(runtime.support.x, runtime.support.setPieceTarget.x);
  runtime.setNow(13_241);
  assert.equal(runtime.api.cpuNonKickoffRestartWatchdogEligible(), true);
});

test('the live free-kick arranger wires both structural helpers and exposes a browser closure audit', () => {
  const arranger = sourceBetween('function arrangeFreeKickSetPiece', 'function arrangeSetPiece');
  assert.match(arranger, /restDefenders=targets\.length\?freeKickRestDefenders\(rankedAttackers\)/);
  assert.match(arranger, /freeKickRestDefenderTarget\(p,team,i\)/);
  assert.match(arranger, /freeKickCompactDefensiveTarget\(p,team,highReferenceX,i\)/);
  assert.match(match, /debugFreeKickRestDefenceClosure:\(\)=>debugFreeKickRestDefenceClosure\(\)/);
});
