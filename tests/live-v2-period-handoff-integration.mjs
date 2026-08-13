import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchSource = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');
const require = createRequire(import.meta.url);
const Control = require('../match-engine/live-v2-match-control-composition.js');

function sourceWindow(anchor, before = 0, after = 2600) {
  const index = matchSource.indexOf(anchor);
  assert.notEqual(index, -1, `missing source anchor: ${anchor}`);
  return matchSource.slice(Math.max(0, index - before), index + after);
}

function capability() {
  return Control.createCapability({
    enabled: true,
    workflow: 'single-player',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    fallbackEngine: 'build-173',
    acknowledgement: Control.ACKNOWLEDGEMENT
  });
}

function input(tick, hostPhase, extra = {}) {
  return {
    schema: Control.TICK_INPUT_SCHEMA,
    tick,
    workflow: 'single-player',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    hostPhase,
    reason: `period-handoff-${hostPhase}`,
    eligibleForAddedTime: hostPhase === 'live',
    ...extra
  };
}

function commit(runtime, cap, tick, hostPhase, extra = {}) {
  const plan = Control.prepareTick(runtime, input(tick, hostPhase, extra), cap);
  const snapshot = Control.commit(runtime, plan, {
    schema: Control.RECEIPT_SCHEMA,
    planId: plan.planId,
    tick: plan.tick,
    success: true,
    clockAccepted: true,
    legacyClockAdvanced: false,
    appliedCommandIds: plan.requiredCommandIds
  }, cap);
  assert.equal(snapshot.effectiveEngine, 'fl-v2', snapshot.fallbackReason || `tick ${tick} fell back`);
  return snapshot;
}

test('match host adopts committed V2 period authority before preparing another tick', () => {
  const bridge = sourceWindow('function liveV2ApplyHostPeriod', 0, 3000);
  assert.match(bridge, /clock\.period==='half-time'/);
  assert.match(bridge, /halfTimeUntil=performance\.now\(\)\+\(FAST\?120:2600\)/);
  assert.match(bridge, /logEvent\('half-time',[^;]+authority:'match-clock-v2'/);
  assert.match(bridge, /clock\.period==='second-half'/);
  assert.match(bridge, /liveV2HalfTimeSeen=false/);
  assert.match(bridge, /clock\.period==='full-time'/);
  assert.match(bridge, /matchPhase='fulltime-presentation'/);

  const commitBridge = sourceWindow('function liveV2CommitControl', 0, 2800);
  assert.match(commitBridge, /liveV2ApplyHostPeriod\(snapshot\.clock\)/);
  const updateBridge = sourceWindow('function update(){', 0, 12500);
  assert.match(updateBridge, /liveV2RunControlOnly\(\);\s*if\(liveV2PeriodTransitionApplied\)return/);
  assert.match(updateBridge, /const liveV2LiveTick=liveV2RunTick\(\);if\(liveV2StrictStopped\|\|liveV2PeriodTransitionApplied\)return/);
  assert.match(updateBridge, /if\(!liveV2OwnsPeriodClock\(\)\)\{[\s\S]*calculateAddedMinutes\(1\)[\s\S]*calculateAddedMinutes\(2\)/);

  const strictStopBridge = sourceWindow('function liveV2RecordStrictStop', 0, 3200);
  assert.match(strictStopBridge, /event\.type==='v2-authority-stop'/);
  assert.match(strictStopBridge, /logEvent\('v2-authority-stop',[\s\S]*failureCode:[\s\S]*liveV2ControlTick[\s\S]*continuedAsBuild173:false/);
  assert.match(strictStopBridge, /recordLiveV2Authority\('strict-playtest-stop'\)/);
  assert.doesNotMatch(strictStopBridge, /Build 173 active|build-173-fallback/);
});

test('half-time, exact second-half start and full-time remain V2 without fallback', () => {
  const cap = capability();
  const runtime = Control.createRuntime({
    sessionId: 'live-v2-period-handoff-regression',
    realMatchDurationSeconds: 2,
    pitch: {
      units: 'metres',
      coordinateSystem: 'si-metres-world-x-length-y-width-z-up',
      axisAlignment: 'axis-aligned',
      xMin: 0,
      xMax: 105,
      yMin: 0,
      yMax: 68
    }
  }, cap);

  let snapshot;
  for (let tick = 1; tick <= 60; tick += 1) snapshot = commit(runtime, cap, tick, 'live');
  assert.equal(snapshot.clock.period, 'half-time');

  snapshot = commit(runtime, cap, 61, 'half-time');
  assert.equal(snapshot.clock.period, 'half-time');
  snapshot = commit(runtime, cap, 62, 'kickoff', {
    periodEvent: { eventId: 'second-half-regression', action: 'start-second-half' }
  });
  assert.equal(snapshot.clock.period, 'second-half');
  assert.equal(snapshot.clock.phase, 'dead-ball');

  for (let tick = 63; tick <= 122; tick += 1) snapshot = commit(runtime, cap, tick, 'live');
  assert.equal(snapshot.clock.period, 'full-time');
  snapshot = commit(runtime, cap, 123, 'full-time');
  assert.equal(snapshot.clock.period, 'full-time');
  assert.equal(snapshot.enabled, true);
  assert.equal(snapshot.fallbackReason, null);
});
