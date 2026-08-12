import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(import.meta.url);
const Adapter = require('../match-engine/live-v2-match-control-composition.js');
const Restart = require('../match-engine/restart-presentation-v2.js');

let assertions = 0;
function check(value, message) {
  assertions += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}
function throws(fn, pattern, message) {
  assertions += 1;
  assert.throws(fn, pattern, message);
}

function capability(workflow = 'single-player') {
  return Adapter.createCapability({
    enabled: true,
    workflow,
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Adapter.LIVE_ENGINE_VERSION,
    fallbackEngine: 'build-173',
    acknowledgement: Adapter.ACKNOWLEDGEMENT
  });
}

function tickInput(tick, hostPhase, workflow = 'single-player', extra = {}) {
  return {
    schema: Adapter.TICK_INPUT_SCHEMA,
    tick,
    workflow,
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Adapter.LIVE_ENGINE_VERSION,
    hostPhase,
    ...extra
  };
}

function runtimeOptions(sessionId, extra = {}) {
  return {
    sessionId,
    pitch: {
      units: 'metres',
      coordinateSystem: 'si-metres-world-x-length-y-width-z-up',
      axisAlignment: 'axis-aligned',
      xMin: 0,
      xMax: 105,
      yMin: 0,
      yMax: 68
    },
    ...extra
  };
}

function receipt(plan, overrides = {}) {
  return {
    schema: Adapter.RECEIPT_SCHEMA,
    planId: plan.planId,
    tick: plan.tick,
    success: true,
    clockAccepted: true,
    legacyClockAdvanced: false,
    appliedCommandIds: plan.requiredCommandIds,
    ...overrides
  };
}

function commitPlan(runtime, cap, plan, overrides) {
  return Adapter.commit(runtime, plan, receipt(plan, overrides), cap);
}

function offsideIncident(id = 'offside-0001') {
  return {
    eventId: id,
    pitchHeight: 68,
    position: { x: 18, y: 10 },
    assistantRefs: [
      { id: 'assistant-north', touchline: 'north', x: 16, y: 0 },
      { id: 'assistant-south', touchline: 'south', x: 16, y: 68 }
    ],
    attackingTeam: 'home',
    defendingTeam: 'away',
    takerOwner: 'cpu',
    goalkeeperOwner: 'cpu'
  };
}

equal(Adapter.VERSION, '1.0.0-offline-live-match-control', 'version is frozen');
equal(Adapter.WORKFLOWS, ['single-player', 'set-piece-suite'], 'only approved offline workflows are exposed');
equal(Adapter.mapHostPhase('live'), 'live', 'live phase maps exactly');
equal(Adapter.mapHostPhase('kickoff'), 'dead-ball', 'kickoff freezes gameplay time');
equal(Adapter.mapHostPhase('offside-presentation'), 'offside-presentation', 'offside has an explicit clock phase');
equal(Adapter.mapHostPhase('set-piece'), 'set-piece', 'set piece has an explicit clock phase');
equal(Adapter.mapHostPhase('celebration'), 'presentation', 'celebration is presentation time');
equal(Adapter.mapHostPhase('paused'), 'paused', 'pause is explicit');
throws(() => Adapter.mapHostPhase('render-frame'), /unsupported/, 'presentation/render time cannot invent a clock phase');

throws(() => capability('online-versus'), /exact FL V2 approved offline/, 'online is frozen');
throws(() => capability('home-co-op'), /exact FL V2 approved offline/, 'co-op is frozen');
throws(() => capability('cpu-v-cpu'), /exact FL V2 approved offline/, 'CPU v CPU is frozen');
const singleCap = capability();
const copiedCapability = JSON.parse(JSON.stringify(singleCap));
throws(() => Adapter.createRuntime({ sessionId: 'forged' }, copiedCapability), /issued/, 'serialized capability is not authority');

const runtime = Adapter.createRuntime(runtimeOptions('clock-case', { realMatchDurationSeconds: 240 }), singleCap);
let plan = Adapter.prepareTick(runtime, tickInput(1, 'live'), singleCap);
equal(plan.effectiveEngine, 'fl-v2', 'valid opt-in remains V2');
equal(plan.clock.phase, 'live', 'clock enters live before advancing the authoritative tick');
equal(plan.clock.clocks.gameplaySeconds, 0.375, '4-minute match accelerates gameplay from the fixed tick only');
const replayedPending = Adapter.prepareTick(runtime, { ...tickInput(1, 'live'), reason: 'live' }, singleCap);
equal(replayedPending.planId, plan.planId, 'same pending input is byte-stable across key order/default reason');
let snap = commitPlan(runtime, singleCap, plan);
equal(snap.committedTick, 1, 'accepted plan advances the private authority');
equal(snap.clock.clocks.gameplaySeconds, 0.375, 'accepted live clock is committed');

plan = Adapter.prepareTick(runtime, tickInput(2, 'dead-ball'), singleCap);
equal(plan.clock.clocks.gameplaySeconds, 0.375, 'dead ball freezes football time');
equal(plan.clock.clocks.animationElapsedSeconds, 0.033333, 'dead ball still advances real animation time');
snap = commitPlan(runtime, singleCap, plan);
plan = Adapter.prepareTick(runtime, tickInput(3, 'paused'), singleCap);
equal(plan.clock.clocks.gameplaySeconds, 0.375, 'pause freezes gameplay time');
equal(plan.clock.clocks.animationElapsedSeconds, 0.033333, 'pause freezes animation time');
equal(plan.clock.clocks.pausedElapsedSeconds, 0.016667, 'pause is measured only in simulation ticks');
commitPlan(runtime, singleCap, plan);

// Prepare is non-authoritative until the host acknowledges the complete plan.
plan = Adapter.prepareTick(runtime, tickInput(4, 'live'), singleCap);
equal(Adapter.snapshot(runtime, singleCap).committedTick, 3, 'prepare does not mutate committed authority');
equal(Adapter.prepareTick(runtime, tickInput(4, 'live'), singleCap).planId, plan.planId, 'prepare retry returns the exact pending transaction');
snap = commitPlan(runtime, singleCap, plan);
equal(snap.committedTick, 4, 'commit is the only promotion point');
equal(Adapter.commit(runtime, plan, receipt(plan), singleCap).committedTick, 4, 'duplicate commit is idempotent');

// Fixed-tick offside presentation, existing assistant reuse and exact-once restart handoff.
const offsideCap = capability();
const offsideRuntime = Adapter.createRuntime(runtimeOptions('offside-case'), offsideCap);
const restartCommands = [];
for (let tick = 1; tick <= 95; tick += 1) {
  const extra = tick === 1 ? { restartIncident: offsideIncident() } : {};
  const current = Adapter.prepareTick(offsideRuntime, tickInput(tick, 'offside-presentation', 'single-player', extra), offsideCap);
  restartCommands.push(...current.commands);
  commitPlan(offsideRuntime, offsideCap, current);
}
equal(restartCommands.map(command => command.tick), [1, 2, 8, 9, 39, 51, 93, 93, 93, 93],
  'restart commands use the reviewed simulation-tick boundaries');
equal(restartCommands.filter(command => command.type === Restart.COMMANDS.HANDOFF_FREE_KICK).length, 1,
  'offside free-kick handoff is emitted exactly once');
const handoffIndex = restartCommands.findIndex(command => command.type === Restart.COMMANDS.HANDOFF_FREE_KICK);
const releaseIndex = restartCommands.findIndex(command => command.type === Restart.COMMANDS.FREEZE_GAMEPLAY &&
  command.payload.sourcePayload.frozen === false);
check(handoffIndex >= 0 && releaseIndex > handoffIndex, 'free-kick handoff precedes gameplay release');
equal(restartCommands.find(command => command.type === Restart.COMMANDS.SELECT_ASSISTANT).payload.sourcePayload.actorId,
  'assistant-north', 'composition reuses the correct existing assistant');
equal(Adapter.snapshot(offsideRuntime, offsideCap).restart.phase, 'complete', 'restart presentation completes once');
equal(Adapter.snapshot(offsideRuntime, offsideCap).clock.clocks.gameplaySeconds, 0,
  'offside presentation never advances football time');

// The Set-Piece Suite route is a first-class explicit opt-in, while its legacy alias/default stay external.
const suiteCap = capability('set-piece-suite');
const suiteRuntime = Adapter.createRuntime(runtimeOptions('suite-case'), suiteCap);
plan = Adapter.prepareTick(suiteRuntime, tickInput(1, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'suite-stage-1', action: 'stage', scenario: 'free-kick-left-23m',
    takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: 1
  }
}), suiteCap);
equal(plan.commands.find(command => command.type === 'camera.policy.apply').payload.policy.preset, 'broadcast',
  'CPU free kick stays on broadcast camera');
commitPlan(suiteRuntime, suiteCap, plan);
plan = Adapter.prepareTick(suiteRuntime, tickInput(2, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'suite-arm-1', action: 'arm', launch: {},
    takerOwner: 'controller-1', goalkeeperOwner: 'cpu', attackingDirection: 1
  }
}), suiteCap);
equal(plan.commands.find(command => command.type === 'camera.policy.apply').payload.policy.preset, 'set-piece-special',
  'local human free kick gets the special set-piece camera');
const launchHandoffs = plan.commands.filter(command => command.type === 'ball.launch.handoff');
equal(launchHandoffs.length, 1, 'suite arm emits one Ball V2 launch handoff');
equal(launchHandoffs[0].handoff, true, 'suite launch is explicitly an exact-once handoff');
const armPlanId = plan.planId;
equal(Adapter.prepareTick(suiteRuntime, tickInput(2, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'suite-arm-1', action: 'arm', launch: {},
    goalkeeperOwner: 'cpu', takerOwner: 'controller-1', attackingDirection: 1
  }
}), suiteCap).planId, armPlanId, 'suite handoff is stable across object key ordering');
commitPlan(suiteRuntime, suiteCap, plan);
plan = Adapter.prepareTick(suiteRuntime, tickInput(3, 'set-piece', 'set-piece-suite', {
  setPieceEvent: { eventId: 'suite-arm-1', action: 'arm', launch: {}, takerOwner: 'controller-1' }
}), suiteCap);
equal(plan.commands.filter(command => command.type === 'ball.launch.handoff').length, 0,
  'replayed suite event id cannot duplicate its launch handoff');
commitPlan(suiteRuntime, suiteCap, plan);
plan = Adapter.prepareTick(suiteRuntime, tickInput(4, 'set-piece', 'set-piece-suite', {
  setPieceEvent: { eventId: 'suite-launch-1', action: 'launch' }
}), suiteCap);
commitPlan(suiteRuntime, suiteCap, plan);
plan = Adapter.prepareTick(suiteRuntime, tickInput(5, 'set-piece', 'set-piece-suite', {
  setPieceEvent: { eventId: 'suite-outcome-1', action: 'resolve', outcome: { result: 'goal' } }
}), suiteCap);
snap = commitPlan(suiteRuntime, suiteCap, plan);
equal(snap.setPieceSuite.session.lifecycle, 'resolved', 'suite lifecycle reaches a finite resolved outcome');
equal(snap.ledgers.processedEventIds.length, 4, 'event ledger is monotonic and de-duplicates replayed input');
check(snap.ledgers.processedEventIds.every(id => id.startsWith('suite:')),
  'suite event ledger uses a stable domain namespace');

// Canonical suite geometry is transformed into the declared live pitch in both directions.
const rightLaunch = launchHandoffs[0].payload.launchIntent;
check(rightLaunch.origin.x > 52.5 && rightLaunch.origin.x < 105, 'attacking-right origin maps into live 0..105 x');
check(rightLaunch.origin.y >= 0 && rightLaunch.origin.y <= 68, 'attacking-right origin maps into live 0..68 y');
equal(rightLaunch.metadata.liveCoordinateContract.coordinateSystem,
  'si-metres-world-x-length-y-width-z-up', 'launch declares the live pitch coordinate system');
const leftCap = capability('set-piece-suite');
const leftRuntime = Adapter.createRuntime(runtimeOptions('suite-left'), leftCap);
let leftPlan = Adapter.prepareTick(leftRuntime, tickInput(1, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'left-stage', action: 'stage', scenario: 'free-kick-left-23m',
    takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: -1
  }
}), leftCap);
commitPlan(leftRuntime, leftCap, leftPlan);
leftPlan = Adapter.prepareTick(leftRuntime, tickInput(2, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'left-arm', action: 'arm', launch: {},
    takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: -1
  }
}), leftCap);
const leftLaunch = leftPlan.commands.find(command => command.type === 'ball.launch.handoff').payload.launchIntent;
check(Math.abs((rightLaunch.origin.x + leftLaunch.origin.x) - 105) < 1e-9,
  'attacking-left rotates launch x around the live pitch centre');
check(Math.abs((rightLaunch.origin.y + leftLaunch.origin.y) - 68) < 1e-9,
  'attacking-left rotates launch y and preserves player-relative left/right');
equal(leftLaunch.metadata.liveCoordinateContract.attackSign, -1, 'leftward launch carries explicit attack sign');
const scaledCap = capability('set-piece-suite');
const scaledRuntime = Adapter.createRuntime(runtimeOptions('scaled-pitch', {
  pitch: { units: 'metres', coordinateSystem: 'si-metres-world-x-length-y-width-z-up',
    axisAlignment: 'axis-aligned', xMin: 10, xMax: 110, yMin: -30, yMax: 30 }
}), scaledCap);
let scaledPlan = Adapter.prepareTick(scaledRuntime, tickInput(1, 'set-piece', 'set-piece-suite', {
  setPieceEvent: {
    eventId: 'scaled-stage', action: 'stage', scenario: 'corner-right',
    takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: 1
  }
}), scaledCap);
const scaledSetup = scaledPlan.commands.find(command => command.type === 'setpiece.setup.handoff');
equal(scaledSetup.payload.transform.xScale, 100 / 105, 'noncanonical live pitch uses its declared length scale');
equal(scaledSetup.payload.transform.yScale, 60 / 68, 'noncanonical live pitch uses its declared width scale');
equal(scaledSetup.payload.geometry.ball, { x: 110, y: 30, z: 0.11 },
  'noncanonical corner maps to the exact declared live pitch edge');
throws(() => Adapter.createRuntime(runtimeOptions('bad-pitch', {
  pitch: { units: 'metres', coordinateSystem: 'si-metres-world-x-length-y-width-z-up',
    axisAlignment: 'axis-aligned', xMin: 0, xMax: 105, yMin: 0, yMax: 200 }
}), leftCap), /width is outside/, 'unsupported live pitch geometry fails closed');

// Camera ownership policies required by the live contract.
equal(Adapter.resolveCameraPolicy({ workflow: 'single-player', online: false, restartKind: 'free-kick',
  takerOwner: 'cpu', goalkeeperOwner: 'cpu' }, singleCap).preset, 'broadcast', 'CPU free kick is broadcast');
equal(Adapter.resolveCameraPolicy({ workflow: 'single-player', online: false, restartKind: 'corner',
  takerOwner: 'controller-1', goalkeeperOwner: 'cpu' }, singleCap).preset, 'set-piece-special', 'human corner is special angle');
equal(Adapter.resolveCameraPolicy({ workflow: 'single-player', online: false, restartKind: 'goal-kick',
  takerOwner: 'keyboard', goalkeeperOwner: 'keyboard' }, singleCap).preset, 'set-piece-special', 'human goal kick is special angle');
equal(Adapter.resolveCameraPolicy({ workflow: 'single-player', online: false, restartKind: 'penalty',
  takerOwner: 'cpu', goalkeeperOwner: 'controller-1' }, singleCap).preset, 'penalty-save', 'CPU penalty retains human goalkeeper save angle');
equal(Adapter.resolveCameraPolicy({ workflow: 'single-player', online: false, restartKind: 'penalty',
  takerOwner: 'cpu', goalkeeperOwner: 'cpu' }, singleCap).preset, 'broadcast', 'CPU v CPU penalty stays broadcast');
throws(() => Adapter.resolveCameraPolicy({ workflow: 'online-versus', online: true, restartKind: 'free-kick',
  takerOwner: 'online-remote' }, singleCap), /capability offline workflow/, 'online camera ownership remains frozen');

// Suite cannot manufacture normal-match offside authority.
const suiteOffsideCap = capability('set-piece-suite');
const suiteOffsideRuntime = Adapter.createRuntime(runtimeOptions('suite-offside'), suiteOffsideCap);
plan = Adapter.prepareTick(suiteOffsideRuntime, tickInput(1, 'offside-presentation', 'set-piece-suite', {
  restartIncident: offsideIncident('forbidden-suite-offside')
}), suiteOffsideCap);
equal(plan.effectiveEngine, 'build-173', 'unsupported suite offside fails back visibly');

// Any partial host application permanently fails back in the same transaction.
const failureCap = capability();
const failureRuntime = Adapter.createRuntime(runtimeOptions('failure-case'), failureCap);
plan = Adapter.prepareTick(failureRuntime, tickInput(1, 'offside-presentation', 'single-player', {
  restartIncident: offsideIncident('commit-failure-offside')
}), failureCap);
snap = Adapter.commit(failureRuntime, plan, receipt(plan, { appliedCommandIds: [] }), failureCap);
equal(snap.effectiveEngine, 'build-173', 'partial command receipt triggers Build173 failback');
equal(snap.fallbackReason, 'match-control-host-commit-failed', 'failback reason is visible and bounded');
equal(Adapter.prepareTick(failureRuntime, tickInput(2, 'live'), failureCap).effectiveEngine, 'build-173',
  'one-switch fallback cannot silently reactivate');

const rollbackCap = capability();
const rollbackRuntime = Adapter.createRuntime(runtimeOptions('rollback-case'), rollbackCap);
plan = Adapter.prepareTick(rollbackRuntime, tickInput(1, 'live'), rollbackCap);
snap = Adapter.rollback(rollbackRuntime, plan, 'host-ball-apply-failed', rollbackCap);
equal(snap.effectiveEngine, 'build-173', 'explicit rollback is same-session permanent');
equal(snap.committedTick, 0, 'rollback never commits the prepared V2 tick');

// A clean outer two-phase abort restores the exact pre-tick committed state without disabling V2.
const abortCap = capability();
const abortRuntime = Adapter.createRuntime(runtimeOptions('abort-case'), abortCap);
const beforeAbort = Adapter.snapshot(abortRuntime, abortCap);
plan = Adapter.prepareTick(abortRuntime, tickInput(1, 'live'), abortCap);
equal(Adapter.snapshot(abortRuntime, abortCap).committedTick, 0, 'outer prepare does not partially advance the clock');
snap = Adapter.abortPrepared(abortRuntime, plan, abortCap);
equal(Adapter.stableJson(snap), Adapter.stableJson(beforeAbort),
  'outer abort restores clock, restart, suite and ledgers to the exact pre-tick state');
equal(snap.effectiveEngine, 'fl-v2', 'clean pre-apply abort permits a deterministic retry');

// Host must prove Build173 clock remained frozen before the exclusive V2 clock can commit.
const dualClockCap = capability();
const dualClockRuntime = Adapter.createRuntime(runtimeOptions('dual-clock-case'), dualClockCap);
plan = Adapter.prepareTick(dualClockRuntime, tickInput(1, 'live'), dualClockCap);
snap = Adapter.commit(dualClockRuntime, plan, receipt(plan, { legacyClockAdvanced: true }), dualClockCap);
equal(snap.effectiveEngine, 'build-173', 'dual Build173/V2 clock advancement fails back atomically');
equal(snap.committedTick, 0, 'dual-clock rejection commits neither V2 time nor presentation state');

// Half-time is terminal until one exact, acknowledged second-half transition is supplied.
const periodCap = capability();
const periodRuntime = Adapter.createRuntime(runtimeOptions('period-case', { realMatchDurationSeconds: 2 }), periodCap);
for (let tick = 1; tick <= 60; tick += 1) {
  const current = Adapter.prepareTick(periodRuntime, tickInput(tick, 'live'), periodCap);
  commitPlan(periodRuntime, periodCap, current);
}
equal(Adapter.snapshot(periodRuntime, periodCap).clock.period, 'half-time', 'first-half gate enters explicit half-time');
plan = Adapter.prepareTick(periodRuntime, tickInput(61, 'kickoff', 'single-player', {
  periodEvent: { eventId: 'second-half-1', action: 'start-second-half' }
}), periodCap);
equal(plan.clock.period, 'second-half', 'explicit period transition opens the second half');
equal(plan.clock.phase, 'dead-ball', 'second half begins at a stopped kickoff phase');
equal(plan.commands.filter(command => command.type === 'clock.period-transition.handoff').length, 1,
  'second-half authority handoff is emitted once');
commitPlan(periodRuntime, periodCap, plan);
plan = Adapter.prepareTick(periodRuntime, tickInput(62, 'kickoff', 'single-player', {
  periodEvent: { eventId: 'second-half-1', action: 'start-second-half' }
}), periodCap);
equal(plan.commands.filter(command => command.type === 'clock.period-transition.handoff').length, 0,
  'duplicate period event cannot restart or duplicate the second half');
commitPlan(periodRuntime, periodCap, plan);

// Same raw event IDs cannot collide across Restart and Suite exact-once domains.
plan = Adapter.prepareTick(offsideRuntime, tickInput(96, 'set-piece', 'single-player', {
  setPieceEvent: {
    eventId: 'offside-0001', action: 'stage', scenario: 'corner-left',
    takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: 1
  }
}), offsideCap);
check(plan.commands.some(command => command.type === 'setpiece.setup.handoff'),
  'suite event with same raw id as restart is still processed');
snap = commitPlan(offsideRuntime, offsideCap, plan);
check(snap.ledgers.processedEventIds.some(id => id.startsWith('restart:')) &&
  snap.ledgers.processedEventIds.some(id => id.startsWith('suite:')), 'event ledger namespaces restart and suite domains');

// Malformed and accessor-bearing tick inputs self-freeze without throwing through the match loop.
const hostileCap = capability();
const hostileRuntime = Adapter.createRuntime(runtimeOptions('hostile-case'), hostileCap);
let hostilePlan;
assertions += 1;
assert.doesNotThrow(() => {
  hostilePlan = Adapter.prepareTick(hostileRuntime, { ...tickInput(1, 'live'), tick: Number.NaN }, hostileCap);
}, 'NaN tick must be contained');
equal(hostilePlan.effectiveEngine, 'build-173', 'NaN tick visibly freezes V2 and returns Build173');
const accessorCap = capability();
const accessorRuntime = Adapter.createRuntime(runtimeOptions('accessor-case'), accessorCap);
const accessorInput = tickInput(1, 'live');
Object.defineProperty(accessorInput, 'tick', { enumerable: true, get() { throw new Error('must-not-run'); } });
assertions += 1;
assert.doesNotThrow(() => {
  hostilePlan = Adapter.prepareTick(accessorRuntime, accessorInput, accessorCap);
}, 'accessor input must be contained without invoking authority');
equal(hostilePlan.effectiveEngine, 'build-173', 'accessor-bearing input fails back without leaking an exception');

// Exact-once evidence is durable for the whole supported session: saturation fails closed before eviction.
equal(Adapter.MAX_LEDGER, 1024, 'exact-once ledger capacity is explicit and reviewable');
const saturationCap = capability('set-piece-suite');
const saturationRuntime = Adapter.createRuntime(runtimeOptions('ledger-saturation'), saturationCap);
for (let tick = 1; tick <= Adapter.MAX_LEDGER; tick += 1) {
  const current = Adapter.prepareTick(saturationRuntime, tickInput(tick, 'set-piece', 'set-piece-suite', {
    setPieceEvent: {
      eventId: 'menu-' + tick,
      action: 'menu',
      intent: { device: 'keyboard', control: 'escape', pressed: false }
    }
  }), saturationCap);
  equal(current.effectiveEngine, 'fl-v2', 'ledger accepts unique event within capacity at tick ' + tick);
  commitPlan(saturationRuntime, saturationCap, current);
}
const beforeSaturation = Adapter.snapshot(saturationRuntime, saturationCap);
equal(beforeSaturation.ledgers.processedEventIds.length, Adapter.MAX_LEDGER,
  'ledger retains every exact-once identity through capacity');
equal(beforeSaturation.setPieceSuite.session.menuOpen, false, 'inert fill events leave suite state unchanged');
let saturationPlan;
assertions += 1;
assert.doesNotThrow(() => {
  saturationPlan = Adapter.prepareTick(saturationRuntime,
    tickInput(1025, 'set-piece', 'set-piece-suite', {
      setPieceEvent: {
        eventId: 'menu-1025', action: 'menu',
        intent: { device: 'keyboard', control: 'escape', pressed: true }
      }
    }), saturationCap);
}, '1,025th unique event must fail back without throwing through the host');
equal(saturationPlan.effectiveEngine, 'build-173', '1,025th unique event fails closed before ledger eviction');
const afterSaturation = Adapter.snapshot(saturationRuntime, saturationCap);
equal(afterSaturation.committedTick, beforeSaturation.committedTick,
  'saturation fallback does not commit the rejected tick');
equal(afterSaturation.ledgers, beforeSaturation.ledgers, 'saturation fallback preserves every retained exact-once id');
equal(afterSaturation.clock, beforeSaturation.clock, 'saturation fallback preserves committed clock state');
equal(afterSaturation.restart, beforeSaturation.restart, 'saturation fallback preserves committed restart state');
equal(afterSaturation.setPieceSuite, beforeSaturation.setPieceSuite,
  'saturation fallback preserves committed suite state and rejects the attempted toggle');
const replayAfterSaturation = Adapter.prepareTick(saturationRuntime,
  tickInput(1026, 'set-piece', 'set-piece-suite', {
    setPieceEvent: {
      eventId: 'menu-1', action: 'menu',
      intent: { device: 'keyboard', control: 'escape', pressed: true }
    }
  }), saturationCap);
equal(replayAfterSaturation.effectiveEngine, 'build-173', 'tick 1,026 cannot reactivate or reaccept evicted history');
equal(Adapter.snapshot(saturationRuntime, saturationCap).setPieceSuite.session.menuOpen, false,
  'oldest event replay cannot toggle suite state after saturation');
equal(Adapter.snapshot(saturationRuntime, saturationCap).ledgers.processedEventIds.length, Adapter.MAX_LEDGER,
  'no exact-once identity is evicted after saturation');

// Two independent runs produce byte-stable output, independent of caller object ordering.
function deterministicFixture(reverseKeys) {
  const cap = capability('set-piece-suite');
  const rt = Adapter.createRuntime(runtimeOptions('deterministic-case'), cap);
  const event = reverseKeys
    ? { attackingDirection: 1, goalkeeperOwner: 'cpu', takerOwner: 'cpu', scenario: 'corner-left', action: 'stage', eventId: 'det-stage' }
    : { eventId: 'det-stage', action: 'stage', scenario: 'corner-left', takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: 1 };
  const first = Adapter.prepareTick(rt, tickInput(1, 'set-piece', 'set-piece-suite', { setPieceEvent: event }), cap);
  commitPlan(rt, cap, first);
  const second = Adapter.prepareTick(rt, tickInput(2, 'set-piece', 'set-piece-suite', {
    setPieceEvent: { eventId: 'det-arm', action: 'arm', launch: {}, takerOwner: 'cpu', goalkeeperOwner: 'cpu', attackingDirection: 1 }
  }), cap);
  commitPlan(rt, cap, second);
  return { plans: [first, second], snapshot: Adapter.snapshot(rt, cap) };
}
equal(Adapter.stableJson(deterministicFixture(false)), Adapter.stableJson(deterministicFixture(true)),
  'replay, object-order and independent-runtime traces are byte-stable');

const source = fs.readFileSync(path.join(root, 'match-engine/live-v2-match-control-composition.js'), 'utf8');
for (const forbidden of ['Math.random', 'Date.now', 'performance.now', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'document.', 'window.addEventListener']) {
  check(!source.includes(forbidden), 'composition contains no ambient authority: ' + forbidden);
}
const matchSource = fs.readFileSync(path.join(root, 'match-engine/match.html'), 'utf8');
const livePreflight = matchSource.match(/<script id="offlineLiveV2Preflight">([\s\S]*?)<\/script>/)?.[1] || '';
check(livePreflight.includes("'live-v2-match-control-composition.js'"),
  'reviewed host merge conditionally loads the match-control composition inside the exact FL V2 preflight');
check(livePreflight.includes('if(!eligible)return;'),
  'default and unsupported workflows return before any FL V2 match-control dependency is loaded');
check(matchSource.includes('liveV2ControlApi=window.FootballLegacyLiveV2MatchControlComposition'),
  'the host binds the reviewed match-control API only inside the offline live V2 attachment');
check(matchSource.includes('liveV2ControlApi.prepareTick(') && matchSource.includes('liveV2ControlApi.commit(')
  && matchSource.includes('liveV2ControlApi.rollback('),
  'the host exposes the complete prepare, commit and rollback transaction boundary');
const browserContext = vm.createContext({ window: {} });
for (const file of ['match-clock-v2.js', 'restart-presentation-v2.js', 'set-piece-suite-v2.js',
  'set-piece-coordinate-contract-v2.js', 'live-v2-match-control-composition.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'match-engine', file), 'utf8'), browserContext, { filename: file });
}
equal(browserContext.window.FootballLegacyLiveV2MatchControlComposition.VERSION, Adapter.VERSION,
  'browser and CommonJS expose the same composition version');
equal(Array.from(browserContext.window.FootballLegacyLiveV2MatchControlComposition.WORKFLOWS), Adapter.WORKFLOWS,
  'browser and CommonJS expose the same workflow boundary');

console.log(`live-v2 match-control composition: ${assertions} assertions passed`);
