import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const matchPath = path.join(root, 'match-engine', 'match.html');
const baselineManifestPath = path.join(root, 'research', 'overhaul', 'build-173-baseline-manifest.json');
const workflowMatrixPath = path.join(root, 'research', 'overhaul', 'protected-workflows.json');
const suitePath = path.join(root, 'match-engine', 'set-piece-suite-v2.js');
const matchHtml = fs.readFileSync(matchPath, 'utf8');
const baselineManifest = JSON.parse(fs.readFileSync(baselineManifestPath, 'utf8'));
const workflowMatrix = JSON.parse(fs.readFileSync(workflowMatrixPath, 'utf8'));
const require = createRequire(import.meta.url);
const Suite = require(suitePath);

function occurrenceCount(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function sourceWindow(anchor, before = 300, after = 1300) {
  const index = matchHtml.indexOf(anchor);
  assert.notEqual(index, -1, `missing source anchor: ${anchor}`);
  return matchHtml.slice(Math.max(0, index - before), index + after);
}

test('Build 173 provenance pins the audited queue-bearing reference', () => {
  assert.equal(baselineManifest.build, 173);
  const matchEntry = baselineManifest.protectedFiles.find(entry => entry.path === 'match-engine/match.html');
  assert.ok(matchEntry, 'match-engine/match.html must remain in the protected baseline manifest');
  assert.equal(
    matchEntry.baselineSha256,
    '8380734db3a142293c5bca2a22f6b6cc9e6a0fa658f9f0c26cce8ad1801cf678'
  );
  assert.equal(baselineManifest.authority.liveGameplayOwner, 'match-engine/match.html');
});

test('TEMPORARY QUEUE REMOVAL: no deferred normal-match free-kick queue symbol, call site, policy or diagnostic remains', () => {
  const forbidden = [
    ['playCapturedFreeKickReplay', /\bplayCapturedFreeKickReplay\b/],
    ['startQueuedFreeKickReplayAtStoppage', /\bstartQueuedFreeKickReplayAtStoppage\b/],
    ['startQueuedFreeKickReplayAtPeriodEnd', /\bstartQueuedFreeKickReplayAtPeriodEnd\b/],
    ['seedDebugFreeKickReplay', /\bseedDebugFreeKickReplay\b/],
    ['heldRestartDebugSignature', /\bheldRestartDebugSignature\b/],
    ['compareHeldRestartDebug', /\bcompareHeldRestartDebug\b/],
    ['debugQueuedReplayForRestart', /\bdebugQueuedReplayForRestart\b/],
    ['debugQueuedReplayForPeriod', /\bdebugQueuedReplayForPeriod\b/],
    ['debugFreeKickReplayQueue', /\bdebugFreeKickReplayQueue\b/],
    ['queuedAt field', /\bqueuedAt\b/],
    ['free-kick-replay-queue event', /free-kick-replay-queue/],
    ['queued-next-stoppage outcome', /queued-next-stoppage/],
    ['queue-until-next-stoppage policy', /queue-until-next-stoppage/],
    ['later-stoppage-own-replay-first policy', /later-stoppage-own-replay-first/],
    ['stoppageReplayPrecedence config', /stoppageReplayPrecedence/],
    ['queuedBehindRestart payload', /queuedBehindRestart/],
    ['EARLIER FREE-KICK FLIGHT REPLAY presentation', /EARLIER FREE-KICK FLIGHT REPLAY/],
    ['temporaryPlaytestFrequency diagnostic', /temporaryPlaytestFrequency/],
    ['queuedReplaySecond diagnostic', /queuedReplaySecond/],
    ['periodEndDrain diagnostic', /periodEndDrain/]
  ];
  const remaining = forbidden
    .map(([label, pattern]) => ({ label, count: occurrenceCount(matchHtml, new RegExp(pattern.source, 'g')) }))
    .filter(item => item.count > 0);
  assert.deepEqual(remaining, [], `temporary queue artifacts remain: ${JSON.stringify(remaining)}`);
});

test('QUEUE-FREE CAPTURE LIFECYCLE: normal live play, timeout and period ends discard stale capture while practice still seals it for its per-attempt replay', () => {
  assert.ok(
    /function\s+discardPendingFreeKickReplay\s*\([^)]*\)\s*\{/.test(matchHtml),
    'missing discardPendingFreeKickReplay helper'
  );
  const helper = sourceWindow('function discardPendingFreeKickReplay', 0, 1200);
  assert.match(helper, /pendingFreeKickReplay\s*=\s*null/);
  assert.match(helper, /freeKickReplayCaptureId\s*===\s*pending\.captureId/);
  assert.match(helper, /freeKickReplayCaptureId\s*=\s*null/);
  assert.ok(
    occurrenceCount(matchHtml, /\bdiscardPendingFreeKickReplay\s*\(/g) >= 5,
    'discard helper needs its definition plus timeout, live-resolution, half-time and full-time uses'
  );

  assert.ok(/discardPendingFreeKickReplay\s*\(\s*['"]capture-timeout['"]/.test(matchHtml), 'capture timeout must discard in normal-match authority');
  assert.ok(/discardPendingFreeKickReplay\s*\(\s*['"]half-time['"]/.test(matchHtml), 'half-time must discard any stale capture');
  assert.ok(/discardPendingFreeKickReplay\s*\(\s*['"]full-time['"]/.test(matchHtml), 'full-time must discard any stale capture');
  assert.ok(/discardPendingFreeKickReplay\s*\(\s*outcome\s*(?:,|\))/.test(matchHtml), 'live-play resolution must discard its stale normal-match capture');
  assert.ok(!/sealPendingFreeKickReplay\s*\(\s*['"]half-time['"]/.test(matchHtml), 'half-time may not seal a package for later playback');
  assert.ok(!/sealPendingFreeKickReplay\s*\(\s*['"]full-time['"]/.test(matchHtml), 'full-time may not seal a package for later playback');

  const timeoutLifecycle = sourceWindow('t-pendingFreeKickReplay.startedAt>7000', 140, 650);
  assert.match(timeoutLifecycle, /FREE_KICK_PRACTICE/);
  assert.match(timeoutLifecycle, /sealPendingFreeKickReplay/);
  assert.match(timeoutLifecycle, /discardPendingFreeKickReplay/);

  const liveResolution = sourceWindow("const outcome=ball.owner&&ball.owner.isGK?'keeper-catch-live'", 220, 1200);
  assert.match(liveResolution, /FREE_KICK_PRACTICE/);
  assert.match(liveResolution, /sealPendingFreeKickReplay/);
  assert.match(liveResolution, /discardPendingFreeKickReplay\s*\(\s*outcome/);
});

test('PROTECTED REPLAY WORKFLOWS: immediate dead-ball, goal and practice free-kick replays remain intact', () => {
  const required = [
    ['free-kick goal replay profile', /['"]free-kick-goal-replay['"]\s*:\s*\{/],
    ['free-kick shot replay profile', /['"]free-kick-shot-replay['"]\s*:\s*\{/],
    ['capture start', /function\s+beginFreeKickReplayCapture\s*\(/],
    ['capture sealing', /function\s+sealPendingFreeKickReplay\s*\(/],
    ['capture ownership', /function\s+currentBallCarriesFreeKickReplay\s*\(/],
    ['capture consumption', /function\s+consumePendingFreeKickReplay\s*\(/],
    ['immediate natural-outcome replay', /function\s+startOutcomeReplay\s*\(/],
    ['free-kick touchline outcome route', /startOutcomeReplay\s*\(\s*['"]free-kick-touchline-out['"]/],
    ['per-attempt practice replay', /function\s+startPracticeFreeKickReplay\s*\(/],
    ['practice goal replay route', /startPracticeFreeKickReplay\s*\(\s*['"]goal['"]/],
    ['practice ball return', /function\s+queuePracticeBallReturn\s*\(/],
    ['free-kick goal selection', /goalReplay\.kind\s*=\s*freeKickGoal\s*\?\s*['"]free-kick-goal-replay['"]/],
    ['held restart capture', /function\s+captureHeldRestartState\s*\(/],
    ['held restart restoration', /function\s+restoreHeldRestartState\s*\(/],
    ['generic replay director', /function\s+debugReplayDirector\s*\(/],
    ['generic replay director export', /debugReplayDirector\s*:\s*\(\)\s*=>\s*debugReplayDirector\s*\(\)/],
    ['free-kick practice authority', /\bFREE_KICK_PRACTICE\b/]
  ];
  const missing = required.filter(([, pattern]) => !pattern.test(matchHtml)).map(([label]) => label);
  assert.deepEqual(missing, [], `protected replay paths were removed: ${missing.join(', ')}`);
});

test('PROTECTED SET-PIECE SUITE: candidate API, presets, export and normal-match isolation remain intact', () => {
  assert.equal(Suite.VERSION, '2.0.0-dormant');
  for (const name of [
    'createState', 'createSuiteCapability', 'activate', 'stageScenario',
    'createLaunchIntent', 'recordContact', 'recordOutcome',
    'createExportPayload', 'createCopyText'
  ]) assert.equal(typeof Suite[name], 'function', name);
  for (const id of [
    'free-kick-left-23m', 'free-kick-centre-23m', 'free-kick-right-23m',
    'corner-left', 'corner-right', 'penalty'
  ]) assert.ok(Suite.SCENARIO_PRESETS[id], id);
  assert.doesNotMatch(matchHtml, /<script[^>]+set-piece-suite-v2\.js/i);
  assert.doesNotMatch(matchHtml, /FootballLegacySetPieceSuiteV2/);
});

test('PROTECTED WORKFLOW MATRIX still forbids workflow removal and retains match, replay, set-piece, online, co-op and career surfaces', () => {
  assert.equal(workflowMatrix.build, 173);
  assert.equal(workflowMatrix.policy.removalAllowed, false);
  const workflows = new Map(workflowMatrix.workflows.map(workflow => [workflow.id, workflow]));
  for (const id of [
    'single-player-quick-play', 'local-two-player', 'home-co-op', 'cpu-versus-cpu',
    'online-versus', 'match-lifecycle', 'normal-match-set-pieces', 'set-piece-suite',
    'career-mode', 'create-a-club', 'player-career', 'diagnostics-and-playtest-exports'
  ]) assert.ok(workflows.has(id), id);
  assert.ok(workflows.get('match-lifecycle').variants.includes('replay'));
  assert.ok(workflows.get('normal-match-set-pieces').requiredGates.includes('replay'));
  assert.ok(workflows.get('set-piece-suite').requiredGates.includes('export'));
  assert.equal(workflows.get('online-versus').status, 'frozen');
});
