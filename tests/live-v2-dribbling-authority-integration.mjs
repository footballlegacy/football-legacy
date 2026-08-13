import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Adapter = require('../match-engine/live-v2-authority-adapter.js');
const Ball = require('../match-engine/ball-engine-v2.js');
const Movement = require('../match-engine/movement-engine-v2.js');
const CPU = require('../match-engine/cpu-intelligence-v2.js');
const Formation = require('../match-engine/formation-behaviour-v2.js');
const Contact = require('../match-engine/live-v2-contact-authority-composer.js');
const Dribbling = require('../match-engine/dribbling-state-v2.js');

const dependencies = { ball: Ball, movement: Movement, cpu: CPU, formation: Formation, contact: Contact, dribbling: Dribbling };

function canonicalLineup(teamId) {
  return Formation.canonicalLineup('4-3-3').map(row => ({ ...row, id: `${teamId}-${row.slotId}` }));
}

function initialSnapshot(workflow = 'single-player') {
  const teams = ['you', 'opp'].map(teamId => ({
    id: teamId, formation: '4-3-3', phase: teamId === 'you' ? 'settled-attack' : 'defend',
    philosophy: teamId === 'you' ? 'ancelotti-bbc-433' : null,
    attackingDirection: teamId === 'you' ? 1 : -1,
    offsideLine: teamId === 'you' ? 90 : 15, tactics: {}, lineup: canonicalLineup(teamId)
  }));
  const players = [];
  for (const team of teams) {
    const shape = Formation.resolve({
      formation: team.formation, phase: team.phase, tick: 1, lineup: team.lineup,
      pitch: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
      attackingDirection: team.attackingDirection, offsideLine: team.offsideLine, tactics: {}
    });
    for (const target of shape.targets) players.push({
      id: target.playerId, teamId: team.id, role: target.position, position: target.position,
      slotId: target.slotId, x: target.target.x, y: target.target.y, vx: 0, vy: 0,
      fx: team.attackingDirection, fy: 0, radius: 0.34, stamina: 100, heightM: 1.82,
      attrs: { pace: 86, accel: 86, acceleration: 86, agility: 88, technique: 86,
        balance: 84, strength: 82, stamina: 88, awareness: 88, pass: 85, shoot: 80,
        control: 88, defend: 76, aggression: 76 },
      isGK: target.position === 'GK', sentOff: false, contactEligible: target.position !== 'GK',
      tackleActive: false, shoulderActive: false, control: null
    });
  }
  const ownerId = 'you-CAM', owner = players.find(player => player.id === ownerId);
  if (workflow === 'single-player') owner.control = { x: 1, y: 0, strength: 0.76, sprint: false, shield: false };
  return {
    tick: 1, fixedTickSeconds: 1 / 60,
    pitch: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    units: { xPerMetre: 1, yPerMetre: 1, zPerMetre: 1 },
    players,
    humanPlayerIds: workflow === 'single-player' ? [ownerId] : [],
    ball: { id: 'live-ball', x: owner.x, y: owner.y, z: 0, vx: 0, vy: 0, zv: 0,
      spin: 0, dip: 0, ownerId, targetId: null, lastKickerId: null, flightType: '', launchIntent: null },
    teams,
    contact: { intendedReceiverId: null, firstTouchIntent: null, aerialIntent: null,
      gate: { livePlay: true, restartActive: false, replayActive: false, keeperAuthority: false,
        offsideInvolvementPending: false, specialActionAuthority: false } },
    dribbling: { surface: 'dry', actionIntent: null }
  };
}

function capability(workflow) {
  return Adapter.createCapability({
    acknowledgement: Adapter.ACKNOWLEDGEMENT,
    workflow,
    online: false,
    onlineMarkers: {},
    ...(workflow === 'cpu-v-cpu'
      ? { controlOwnership: { humanPlayerIds: [], cpuTeamIds: ['you', 'opp'] } }
      : {})
  });
}

function attachment(workflow = 'single-player', profile = {}) {
  let committed = null;
  const live = Adapter.createAttachment({
    enabled: true,
    capability: capability(workflow),
    seed: 337733,
    dependencies,
    ...profile,
    host: { prepareTick(projection) { return {
      commit() { committed = structuredClone(projection); },
      rollback() { committed = null; }
    }; } }
  });
  return { live, committed: () => committed };
}

function advanceSnapshot(snapshot, projection, tick, actionIntent = null) {
  const next = structuredClone(snapshot);
  next.tick = tick;
  const movementById = Object.fromEntries(projection.movement.map(row => [row.id, row]));
  for (const player of next.players) {
    const moved = movementById[player.id];
    if (!moved) continue;
    Object.assign(player, { x: moved.x, y: moved.y, vx: moved.vx, vy: moved.vy, fx: moved.fx, fy: moved.fy,
      stamina: moved.stamina });
  }
  if (projection.physicalBallSeparated) {
    next.ball.ownerId = null;
    assert.ok(projection.ball, 'a separated lease must project physical Ball V2 geometry');
  } else next.ball.ownerId = projection.logicalBallOwnerId;
  if (projection.ball) Object.assign(next.ball, projection.ball);
  if (!projection.physicalBallSeparated && next.ball.ownerId) {
    const owner = next.players.find(player => player.id === next.ball.ownerId);
    if (owner) Object.assign(next.ball, { x: owner.x, y: owner.y, z: 0, vx: owner.vx, vy: owner.vy, zv: 0 });
  }
  next.ball.launchIntent = null;
  next.dribbling = { surface: 'dry', actionIntent };
  return next;
}

function runTick(live, snapshot) {
  const frame = live.planTick(snapshot);
  assert.ok(frame, JSON.stringify(live.status()));
  assert.equal(live.commitTick(frame), true, JSON.stringify(live.status()));
  return frame;
}

test('adapter pins Dribbling V2 dependency and capability provenance without renaming V2', () => {
  assert.equal(Adapter.DEPENDENCY_CONTRACTS.dribbling.version, Dribbling.VERSION);
  assert.equal(Adapter.DEPENDENCY_CONTRACTS.dribbling.schemas.STATE_SCHEMA, Dribbling.STATE_SCHEMA);
  assert.ok(Adapter.REQUIRED_DEPENDENCIES.includes('dribbling'));
  const cap = capability('single-player');
  assert.equal(cap.authority.dribblingPhysicalTouchesAndActionLease, Dribbling.STATE_SCHEMA);
  assert.equal(Adapter.VERSION, '1.0.0-offline-live-authority-playtest');
});

test('CPU physical tackles respect one readable post-turnover protection window', () => {
  const transition = { fromTeamId: 'you', toTeamId: 'opp', startedTick: 100, untilTick: 130 };
  assert.equal(Adapter.TURNOVER_TACKLE_PROTECTION_TICKS, 30);
  assert.equal(Adapter.cpuPhysicalActionAllowed(null, 100), true);
  assert.equal(Adapter.cpuPhysicalActionAllowed(transition, 100), false);
  assert.equal(Adapter.cpuPhysicalActionAllowed(transition, 130), false);
  assert.equal(Adapter.cpuPhysicalActionAllowed(transition, 131), true);
  assert.equal(Adapter.cpuPhysicalActionAllowed({ startedTick: NaN }, 131), false);
});

test('controlled-carry True Feel keeps ownership attached while producing readable foot cadence', () => {
  const { live } = attachment('single-player', {
    trueFeelPhysicalTouchAuthority: false,
    cpuPassRaceFilter: true
  });
  let snapshot = initialSnapshot('single-player');
  for (const player of snapshot.players) {
    if (player.teamId === 'opp') {
      player.contactEligible = false;
      player.sentOff = true;
    }
  }
  const touchTicks = [], feet = [];
  let priorSequence = 0;
  for (let tick = 1; tick <= 120; tick += 1) {
    const frame = runTick(live, snapshot), projection = frame.hostProjection;
    assert.equal(projection.physicalBallSeparated, false);
    assert.equal(projection.logicalBallOwnerId, 'you-CAM');
    assert.equal(projection.ball, null);
    assert.equal(projection.dribbling.telemetry.authorityMode, 'attached-controlled-carry');
    assert.equal(projection.dribbling.telemetry.physicsProfile, 'true-feel-controlled-carry');
    assert.equal(projection.dribbling.presentation.animationPhase, 'dribble-secured');
    assert.equal(projection.dribbling.presentation.outcome, 'controlled-carry');
    assert.ok(projection.dribbling.presentation.targetSeparationMetres >= 0.5);
    const sequence = projection.dribbling.telemetry.touchSequence;
    if (sequence > priorSequence) {
      touchTicks.push(tick);
      feet.push(projection.dribbling.presentation.foot);
    }
    priorSequence = sequence;
    snapshot = advanceSnapshot(snapshot, projection, tick + 1);
  }
  assert.ok(touchTicks.length >= 4, touchTicks.join(','));
  const intervals = touchTicks.slice(1).map((tick, index) => tick - touchTicks[index]);
  assert.ok(intervals.every(interval => interval >= Dribbling.CONFIG.minimumTouchCadenceTicks), intervals.join(','));
  assert.ok(intervals.every(interval => interval <= Dribbling.CONFIG.maximumTouchCadenceTicks), intervals.join(','));
  assert.ok(feet.every((foot, index) => index === 0 || foot !== feet[index - 1]), feet.join(','));
  assert.deepEqual(live.status().authorityProfile, {
    id: 'v2-football-baseline-reconciliation',
    trueFeelPhysicalTouchAuthority: false,
    cpuPassRaceFilter: true
  });
  assert.equal(live.status().enabled, true);
});

test('single-player adapter commits physical separation while retaining logical action authority', () => {
  const { live } = attachment();
  let snapshot = initialSnapshot();
  const phases = [];
  let separatedFrame = null;
  for (let tick = 1; tick <= 48; tick += 1) {
    const frame = runTick(live, snapshot);
    phases.push(frame.hostProjection.dribbling.phase);
    if (frame.hostProjection.physicalBallSeparated && !separatedFrame) separatedFrame = frame;
    snapshot = advanceSnapshot(snapshot, frame.hostProjection, tick + 1,
      separatedFrame && frame.hostProjection.physicalBallSeparated
        ? { id: 'human-pass-during-lease', type: 'pass', actorId: 'you-CAM', targetPlayerId: 'you-RW', commandTick: tick + 1, power: 0.62 }
        : null);
  }
  assert.ok(phases.includes(Dribbling.PHASES.TOUCH_PREPARATION), phases.join(','));
  assert.ok(phases.includes(Dribbling.PHASES.SEPARATED_TOUCH), phases.join(','));
  assert.ok(phases.includes(Dribbling.PHASES.CHASE_RECOVERY), phases.join(','));
  assert.ok(separatedFrame);
  assert.equal(separatedFrame.hostProjection.logicalBallOwnerId, 'you-CAM');
  assert.equal(separatedFrame.hostProjection.movementBallOwnerId, 'you-CAM');
  assert.equal(separatedFrame.hostProjection.physicalBallSeparated, true);
  assert.ok(separatedFrame.hostProjection.ball);
  assert.equal(separatedFrame.hostProjection.dribbling.presentation.animationPhase, 'dribble-contact');
  assert.ok(live.status().dribbling.state.touchSequence >= 1);
});

test('a separated True Feel carrier is guided back to the physical MR ball', () => {
  const { live } = attachment();
  let snapshot = initialSnapshot(), recovery = null;
  for (let tick = 1; tick <= 72; tick += 1) {
    const frame = runTick(live, snapshot), projection = frame.hostProjection;
    recovery = projection.recoveryAssignments.find(row =>
      row.authority === 'true-feel-lease-recovery' && row.playerId === 'you-CAM') || null;
    if (recovery) {
      assert.equal(projection.logicalBallOwnerId, 'you-CAM');
      assert.equal(projection.physicalBallSeparated, true);
      assert.ok(recovery.distanceMetres > 0.4 && recovery.distanceMetres < 2,
        JSON.stringify(recovery));
      assert.equal(recovery.intended, true);
      assert.equal(recovery.human, true);
      break;
    }
    snapshot = advanceSnapshot(snapshot, projection, tick + 1);
  }
  assert.ok(recovery, 'the lease owner must chase the physical touch instead of an unrelated shape target');
});

test('adapter buffers one action ID during a lease and suppresses duplicate CPU/host emission', () => {
  const { live } = attachment();
  let snapshot = initialSnapshot(), buffered = false, released = null;
  for (let tick = 1; tick <= 72; tick += 1) {
    const frame = runTick(live, snapshot), projection = frame.hostProjection;
    const action = projection.physicalBallSeparated
      ? { id: 'buffered-shot-1', type: 'shot', actorId: 'you-CAM', commandTick: tick + 1, power: 0.7 }
      : null;
    if (projection.dribbling.bufferedAction) buffered = true;
    if (projection.dribbling.releasedAction) released = projection.dribbling.releasedAction;
    if (released) {
      assert.equal(projection.intelligence.some(row => row.playerId === released.actorId && ['pass', 'shot'].includes(row.type)), false);
      break;
    }
    snapshot = advanceSnapshot(snapshot, projection, tick + 1, action);
  }
  assert.equal(buffered, true);
  assert.ok(released, JSON.stringify(live.status().latestTelemetry?.dribbling));
  assert.equal(released.id, 'buffered-shot-1');
  assert.equal(released.type, 'shot');
});

test('adapter export/restore resumes a physical lease with chunk-identical projections', () => {
  const first = attachment(), second = attachment();
  let snapshot = initialSnapshot(), frame;
  for (let tick = 1; tick <= 48; tick += 1) {
    frame = runTick(first.live, snapshot);
    snapshot = advanceSnapshot(snapshot, frame.hostProjection, tick + 1);
    if (frame.hostProjection.physicalBallSeparated) break;
  }
  assert.equal(frame.hostProjection.physicalBallSeparated, true);
  const checkpoint = first.live.exportState();
  assert.equal(checkpoint.domain.dribbling.schema, Dribbling.SERIALIZED_SCHEMA);
  assert.equal(second.live.restoreState(JSON.parse(JSON.stringify(checkpoint))), true);
  const direct = first.live.planTick(snapshot);
  const resumed = second.live.planTick(structuredClone(snapshot));
  assert.ok(direct && resumed);
  assert.deepEqual(resumed.hostProjection, direct.hostProjection);
  assert.deepEqual(resumed.dribbling, direct.dribbling);
  assert.equal(first.live.commitTick(direct), true);
  assert.equal(second.live.commitTick(resumed), true);
  assert.deepEqual(second.live.status().dribbling.state, first.live.status().dribbling.state);
  const corrupt = JSON.parse(JSON.stringify(checkpoint));
  corrupt.domain.dribbling.state.touchSequence += 1;
  assert.equal(second.live.restoreState(corrupt), false);
});

test('discarded prepared ticks do not mutate the serialized dribbling transaction', () => {
  const { live } = attachment();
  const before = live.exportState();
  const frame = live.planTick(initialSnapshot());
  const prepared = live.prepareCommit(frame);
  assert.ok(prepared);
  assert.equal(live.abortPrepared(prepared), true);
  assert.deepEqual(live.exportState(), before);
  const replay = live.planTick(initialSnapshot());
  assert.deepEqual(replay.hostProjection.dribbling, frame.hostProjection.dribbling);
});

test('all-CPU adapter traverses the same physical touch states without a difficulty input', () => {
  const { live } = attachment('cpu-v-cpu');
  let snapshot = initialSnapshot('cpu-v-cpu');
  const phases = new Set();
  for (let tick = 1; tick <= 48; tick += 1) {
    const frame = runTick(live, snapshot);
    phases.add(frame.hostProjection.dribbling.phase);
    assert.equal(frame.hostProjection.dribbling.telemetry.physicsProfile, 'shared-human-cpu-ratings-neutral');
    snapshot = advanceSnapshot(snapshot, frame.hostProjection, tick + 1);
  }
  assert.equal(snapshot.humanPlayerIds.length, 0);
  assert.ok(phases.has(Dribbling.PHASES.TOUCH_PREPARATION), [...phases].join(','));
  assert.ok(phases.has(Dribbling.PHASES.SEPARATED_TOUCH), [...phases].join(','));
  assert.ok(phases.has(Dribbling.PHASES.CHASE_RECOVERY), [...phases].join(','));
});

test('a sustained carry has readable physical touch cadence instead of a seven-frame possession loop', () => {
  const { live } = attachment('single-player');
  let snapshot = initialSnapshot('single-player');
  // Isolate cadence from the separately covered contested-turnover path.
  for (const player of snapshot.players) {
    if (player.teamId === 'opp') {
      player.contactEligible = false;
      player.sentOff = true;
    }
  }
  const touchTicks = [];
  let previousSequence = 0;
  for (let tick = 1; tick <= 180; tick += 1) {
    const frame = runTick(live, snapshot), projection = frame.hostProjection;
    const sequence = projection.dribbling.telemetry.touchSequence;
    if (sequence > previousSequence) touchTicks.push(tick);
    previousSequence = sequence;
    assert.equal(projection.logicalBallOwnerId, 'you-CAM',
      `logical possession lost at tick ${tick}: ${JSON.stringify(projection.dribbling.telemetry)}`);
    snapshot = advanceSnapshot(snapshot, projection, tick + 1);
  }
  assert.ok(touchTicks.length >= 5, touchTicks.join(','));
  const intervals = touchTicks.slice(1).map((tick, index) => tick - touchTicks[index]);
  assert.ok(intervals.every(interval => interval >= Dribbling.CONFIG.minimumTouchCadenceTicks), intervals.join(','));
  assert.ok(intervals.every(interval => interval <= Dribbling.CONFIG.maximumTouchCadenceTicks + 2), intervals.join(','));
  assert.ok(!intervals.includes(7), 'the playtest seven-frame loop must not return');
});
