import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Adapter = require('../match-engine/live-v2-authority-adapter.js');
const Ball = require('../match-engine/ball-engine-v2.js');
const Movement = require('../match-engine/movement-engine-v2.js');
const CPU = require('../match-engine/cpu-intelligence-v2.js');
const Formation = require('../match-engine/formation-behaviour-v2.js');
const Contact = require('../match-engine/live-v2-contact-authority-composer.js');
const Dribbling = require('../match-engine/dribbling-state-v2.js');
const MATCH_SOURCE = readFileSync(new URL('../match-engine/match.html', import.meta.url), 'utf8');

const PITCH = Object.freeze({ xMin: 0, xMax: 105, yMin: -34, yMax: 34 });
const UNITS = Object.freeze({ xPerMetre: 1, yPerMetre: 1, zPerMetre: 1 });
const CARRIER_ID = 'you-CAM';
const RECEIVER_ID = 'you-RW';
const SOURCE_ID = 'you-LCM';

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return source.slice(from, to);
}

function canonicalLineup(teamId) {
  return Formation.canonicalLineup('4-3-3').map(row => ({ ...row, id: `${teamId}-${row.slotId}` }));
}

function baseSnapshot(tick = 1) {
  const teams = ['you', 'opp'].map(teamId => ({
    id: teamId,
    formation: '4-3-3',
    phase: teamId === 'you' ? 'settled-attack' : 'defend',
    philosophy: null,
    attackingDirection: teamId === 'you' ? 1 : -1,
    offsideLine: teamId === 'you' ? 90 : 15,
    tactics: {},
    lineup: canonicalLineup(teamId)
  }));
  const players = [];
  for (const team of teams) {
    const shape = Formation.resolve({
      formation: team.formation,
      phase: team.phase,
      tick,
      lineup: team.lineup,
      pitch: PITCH,
      attackingDirection: team.attackingDirection,
      offsideLine: team.offsideLine,
      tactics: {}
    });
    for (const target of shape.targets) players.push({
      id: target.playerId,
      teamId: team.id,
      role: target.position,
      position: target.position,
      slotId: target.slotId,
      x: target.target.x,
      y: target.target.y,
      vx: 0,
      vy: 0,
      fx: team.attackingDirection,
      fy: 0,
      radius: .42,
      heightM: 1.82,
      stamina: 100,
      attrs: {
        pace: 86, accel: 86, acceleration: 86, agility: 86, balance: 84,
        strength: 78, stamina: 86, awareness: 88, pass: 88, shoot: 76,
        control: 88, technique: 88, defend: 72, aggression: 72
      },
      isGK: target.position === 'GK',
      sentOff: false,
      contactEligible: false,
      bodyContactEligible: false,
      tackleActive: false,
      shoulderActive: false,
      control: null
    });
  }
  return {
    tick,
    fixedTickSeconds: 1 / 60,
    pitch: { ...PITCH },
    units: { ...UNITS },
    players,
    humanPlayerIds: [],
    ball: {
      id: 'wfxxv-v2-ball', x: 35, y: 0, z: 0, vx: 0, vy: 0, zv: 0,
      spin: 0, dip: 0, ownerId: null, targetId: null,
      lastKickerId: null, lastKickerTeamId: null,
      flightType: '', authoredRouteExpired: false, launchIntent: null
    },
    teams,
    contact: {
      intendedReceiverId: null,
      firstTouchIntent: null,
      aerialIntent: null,
      gate: {
        livePlay: true,
        restartActive: false,
        replayActive: false,
        keeperAuthority: false,
        offsideInvolvementPending: false,
        specialActionAuthority: false
      }
    },
    dribbling: { surface: 'dry', actionIntent: null, directionalKnockOnIntent: null }
  };
}

function attachment(seed = 562263971) {
  const committed = [];
  const capability = Adapter.createCapability({
    acknowledgement: Adapter.ACKNOWLEDGEMENT,
    workflow: 'single-player',
    online: false,
    onlineMarkers: {}
  });
  const live = Adapter.createAttachment({
    enabled: true,
    capability,
    seed,
    trueFeelPhysicalTouchAuthority: false,
    cpuPassRaceFilter: true,
    dependencies: {
      ball: Ball,
      movement: Movement,
      cpu: CPU,
      formation: Formation,
      contact: Contact,
      dribbling: Dribbling
    },
    host: {
      prepareTick(projection) {
        return {
          commit() { committed.push(structuredClone(projection)); },
          rollback() { committed.pop(); }
        };
      }
    }
  });
  return { live, committed };
}

function commitTick(harness, snapshot) {
  const frame = harness.live.planTick(snapshot);
  assert.ok(frame, JSON.stringify(harness.live.status()));
  assert.equal(harness.live.commitTick(frame), true, JSON.stringify(harness.live.status()));
  assert.deepEqual(harness.committed.at(-1), frame.hostProjection,
    'the host must commit the exact adapter projection');
  return frame;
}

function applyMovement(snapshot, projection) {
  for (const movement of projection.movement) {
    const player = snapshot.players.find(row => row.id === movement.id);
    if (!player) continue;
    Object.assign(player, {
      x: movement.x,
      y: movement.y,
      vx: movement.vx,
      vy: movement.vy,
      fx: movement.fx,
      fy: movement.fy,
      stamina: movement.stamina
    });
  }
}

function missedCrossRun(seed) {
  const harness = attachment(seed);
  const release = baseSnapshot(1);
  const source = release.players.find(player => player.id === SOURCE_ID);
  const receiver = release.players.find(player => player.id === RECEIVER_ID);
  Object.assign(source, { x: 30, y: 20 });
  Object.assign(receiver, { x: 61, y: 20 });
  const origin = { x: 30, y: 20, z: 0 };
  const target = { x: 61, y: 20 };
  const offsideCandidate = { playerId: RECEIVER_ID, releaseTick: 1, lineX: 58 };
  Object.assign(release.ball, {
    x: origin.x,
    y: origin.y,
    z: origin.z,
    targetId: RECEIVER_ID,
    lastKickerId: SOURCE_ID,
    lastKickerTeamId: 'you',
    flightType: 'free-kick-cross',
    launchIntent: {
      sequence: 'wfxxv-missed-cross-1',
      sourcePlayerId: SOURCE_ID,
      sourceTeamId: 'you',
      targetPlayerId: RECEIVER_ID,
      origin,
      target,
      direction: { x: 1, y: 0 },
      speedMetresPerSecond: 15,
      liftAngleDeg: 5,
      sideSpinRpm: 0,
      topSpinRpm: 0,
      source: 'free-kick-cross',
      offsideCandidate
    }
  });
  release.contact.intendedReceiverId = RECEIVER_ID;
  const releaseFrame = commitTick(harness, release);
  assert.equal(releaseFrame.hostProjection.possession.inFlight, true);
  assert.equal(releaseFrame.hostProjection.possession.intendedReceiverId, RECEIVER_ID);

  const expired = structuredClone(release);
  expired.tick = 2;
  applyMovement(expired, releaseFrame.hostProjection);
  Object.assign(expired.ball, releaseFrame.hostProjection.ball, {
    z: 0,
    zv: 0,
    targetId: null,
    flightType: 'ground',
    authoredRouteExpired: true,
    launchIntent: null
  });
  expired.contact.intendedReceiverId = null;
  assert.ok(Math.hypot(expired.ball.vx, expired.ball.vy) > .03,
    'fixture must expire a still-moving grounded cross');
  const expiredFrame = commitTick(harness, expired);
  return {
    possession: expiredFrame.hostProjection.possession,
    recoveryAssignments: expiredFrame.hostProjection.recoveryAssignments,
    status: harness.live.status()
  };
}

test('a grounded missed cross expires its adapter receiver route on the second committed tick without erasing offside provenance', () => {
  assert.match(MATCH_SOURCE, /authoredRouteExpired:ball\.crossRouteExpired===true/,
    'the host snapshot must export its authored-route expiry decision');
  const first = missedCrossRun(424242);
  const second = missedCrossRun(424242);
  assert.equal(first.possession.inFlight, false);
  assert.equal(first.possession.intendedReceiverId, null);
  assert.equal(first.possession.intendedTarget, null);
  assert.deepEqual(first.possession.offsideCandidate,
    { playerId: RECEIVER_ID, releaseTick: 1, lineX: 58 });
  assert.equal(first.status.lastCommittedTick, 2);
  assert.equal(first.status.possession.inFlight, false);
  assert.equal(first.status.possession.intendedReceiverId, null);
  assert.deepEqual(first, second, 'route expiry must be seed-deterministic');
});

function knockOnSnapshot() {
  const snapshot = baseSnapshot(1);
  const carrier = snapshot.players.find(player => player.id === CARRIER_ID);
  Object.assign(carrier, { x: 35, y: 0, vx: 0, vy: 0, fx: 1, fy: 0 });
  carrier.control = { x: 0, y: 0, strength: 0, sprint: false, shield: false };
  snapshot.humanPlayerIds = [CARRIER_ID];
  const startX = 35.72;
  const distance = 3.48;
  const targetX = startX + distance;
  const launchSequence = 'wfxxv-directional-knock-on-1';
  const contract = {
    playerId: CARRIER_ID,
    authority: 'live-v2',
    launchSequence,
    startX,
    startY: 0,
    targetX,
    targetY: 0,
    nx: 1,
    ny: 0,
    distance,
    reacquireMinimumDistance: distance * .55,
    maximumTravelDistance: distance * 5,
    startedAt: 1,
    reacquireAfter: 8,
    expiresAt: 181
  };
  Object.assign(snapshot.ball, {
    x: startX,
    y: 0,
    z: 0,
    targetId: CARRIER_ID,
    lastKickerId: CARRIER_ID,
    lastKickerTeamId: 'you',
    flightType: 'directional-knock-on',
    launchIntent: {
      sequence: launchSequence,
      sourcePlayerId: CARRIER_ID,
      sourceTeamId: 'you',
      targetPlayerId: CARRIER_ID,
      origin: { x: startX, y: 0, z: 0 },
      target: { x: targetX, y: 0 },
      direction: { x: 1, y: 0 },
      speedMetresPerSecond: 9.05,
      liftAngleDeg: 1,
      sideSpinRpm: 0,
      topSpinRpm: 0,
      source: 'directional-knock-on'
    }
  });
  snapshot.contact.intendedReceiverId = CARRIER_ID;
  snapshot.dribbling.directionalKnockOnIntent = contract;
  return { snapshot, contract };
}

function advanceKnockOnSnapshot(snapshot, frame, allowMeeting = true) {
  const next = structuredClone(snapshot);
  next.tick += 1;
  applyMovement(next, frame.hostProjection);
  if (frame.hostProjection.ball) Object.assign(next.ball, frame.hostProjection.ball);
  next.ball.ownerId = frame.hostProjection.logicalBallOwnerId;
  next.ball.launchIntent = null;
  next.ball.targetId = CARRIER_ID;
  next.contact.intendedReceiverId = CARRIER_ID;
  const carrier = next.players.find(player => player.id === CARRIER_ID);
  const contract = next.dribbling.directionalKnockOnIntent;
  const travelled = frame.hostProjection.ball
    ? Math.hypot(frame.hostProjection.ball.x - contract.startX,
      frame.hostProjection.ball.y - contract.startY)
    : 0;
  const physicalMeeting = allowMeeting && next.tick >= contract.reacquireAfter &&
    travelled >= contract.distance * 1.8;
  carrier.contactEligible = physicalMeeting;
  if (physicalMeeting && frame.hostProjection.ball) {
    // Move the test footballer into a real swept-contact meeting. The adapter
    // must still let First Touch decide ownership; this fixture never moves or
    // assigns the ball.
    carrier.x = frame.hostProjection.ball.x - .54;
    carrier.y = frame.hostProjection.ball.y;
    carrier.vx = .12;
    carrier.vy = 0;
  }
  carrier.control = physicalMeeting
    ? { x: 1, y: 0, strength: 1, sprint: true, shield: false }
    : { x: 0, y: 0, strength: 0, sprint: false, shield: false };
  return next;
}

function knockOnRun(seed, allowMeeting = true) {
  const harness = attachment(seed);
  const fixture = knockOnSnapshot();
  let snapshot = fixture.snapshot;
  let safetyBounded = false;
  let ownerWasFabricated = false;
  let acquiredByFirstTouch = false;
  let lastBall = null;
  let maximumTravel = 0;
  let minimumCarrierGap = Infinity;
  let ticks = 0;
  for (; ticks < 180; ticks += 1) {
    const frame = commitTick(harness, snapshot);
    const directional = frame.hostProjection.dribbling.directionalKnockOn;
    assert.equal(frame.hostProjection.possession.inFlight, false,
      'a knock-on must not become a pass flight');
    assert.equal(frame.hostProjection.possession.intendedReceiverId, null,
      'a knock-on must not install a reception route');
    assert.equal(frame.hostProjection.possession.reactionStimulus, null,
      'a knock-on must not open a teammate pass-reaction window');
    if (frame.hostProjection.ball) {
      lastBall = frame.hostProjection.ball;
      const liveCarrier = frame.hostProjection.movement.find(row => row.id === CARRIER_ID);
      if (liveCarrier) minimumCarrierGap = Math.min(minimumCarrierGap,
        Math.hypot(lastBall.x - liveCarrier.x, lastBall.y - liveCarrier.y));
      maximumTravel = Math.max(maximumTravel, Math.hypot(
        lastBall.x - fixture.contract.startX,
        lastBall.y - fixture.contract.startY
      ));
    }
    if (directional?.bounded) safetyBounded = true;
    const contactOwned = frame.hostProjection.contact?.ownedContact === true &&
      frame.hostProjection.contact?.ownerCandidateId === CARRIER_ID;
    if (frame.hostProjection.logicalBallOwnerId && !contactOwned) ownerWasFabricated = true;
    if (contactOwned) {
      acquiredByFirstTouch = true;
      break;
    }
    snapshot = advanceKnockOnSnapshot(snapshot, frame, allowMeeting);
  }
  return { safetyBounded, ownerWasFabricated, acquiredByFirstTouch, ticks, lastBall,
    maximumTravel, minimumCarrierGap, referenceDistance: fixture.contract.distance,
    maximumTravelDistance: fixture.contract.maximumTravelDistance };
}

test('directional knock-on is a V2 True Feel/MR launch, never a self-pass, and only First Touch may restore ownership', () => {
  const performSource = sourceBetween(MATCH_SOURCE, 'function performDirectionalKnockOn', 'function doSkill');
  assert.match(performSource, /liveV2QueueLaunch\(player,\{x:plan\.targetX,y:plan\.targetY\}/,
    'the host must stage the touch through the MR launch contract');
  assert.match(performSource, /authority:v2Launch\?'live-v2':'build-173'/,
    'the legacy Build 173 path must remain explicit when V2 is inactive');

  const first = knockOnRun(515151);
  const second = knockOnRun(515151);
  const uncollected = knockOnRun(515151, false);
  assert.equal(first.safetyBounded, false, JSON.stringify(first));
  assert.equal(first.ownerWasFabricated, false, JSON.stringify(first));
  assert.equal(first.acquiredByFirstTouch, true, JSON.stringify(first));
  assert.ok(first.maximumTravel > first.referenceDistance * 1.5,
    `MR knock-on still died at its old 3.48m reference: ${JSON.stringify(first)}`);
  assert.ok(first.maximumTravel < first.maximumTravelDistance,
    `ordinary knock-on reached its emergency safety limit: ${JSON.stringify(first)}`);
  assert.equal(uncollected.acquiredByFirstTouch, false, JSON.stringify(uncollected));
  assert.equal(uncollected.safetyBounded, false, JSON.stringify(uncollected));
  assert.ok(uncollected.maximumTravel >= uncollected.referenceDistance * 4.4,
    `uncollected MR touch did not retain the V1.5 free-roll window: ${JSON.stringify(uncollected)}`);
  assert.ok(uncollected.maximumTravel < uncollected.maximumTravelDistance,
    `normal MR rollout relied on the emergency containment ceiling: ${JSON.stringify(uncollected)}`);
  assert.deepEqual(first, second, 'knock-on free roll and physical reacquisition must be seed-deterministic');
});

test('the post-commit host reconciliation cannot synthesize a directional knock-on owner', () => {
  const source = sourceBetween(MATCH_SOURCE, 'function directionalKnockOnRecoveryDecision', 'function performDirectionalKnockOn');
  const player = { id: CARRIER_ID, team: 'you', x: 102, y: 100, vx: 1, vy: 0, stats: { touches: 0 } };
  const contract = {
    playerId: CARRIER_ID,
    authority: 'live-v2',
    startedAt: 10,
    expiresAt: 90,
    reacquireAfter: 17,
    startX: 100,
    startY: 100,
    targetX: 104,
    targetY: 100,
    nx: 1,
    ny: 0,
    distance: 4,
    reacquireMinimumDistance: 2.2,
    maximumTravelDistance: 4.25
  };
  const state = {
    owner: null,
    target: player,
    lastKicker: player,
    flightType: 'directional-knock-on',
    x: 102.7,
    y: 100,
    z: 0,
    vx: .6,
    vy: 0,
    zv: 0,
    directionalKnockOnContract: contract
  };
  const context = vm.createContext({
    Math,
    clamp: (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
    rad: .42,
    BALLR: .11,
    liveV2TickApplied: true,
    liveV2SuppressLegacyReception: false,
    you: [player],
    opp: [],
    teamList: () => [],
    other: team => team === 'you' ? 'opp' : 'you',
    D: (left, right) => Math.hypot(left.x - right.x, left.y - right.y),
    logEvent() {},
    lastTouch: null,
    lastTouchPlayer: null,
    poss: 0
  });
  vm.runInContext(`${source};this.reconcile=reconcileDirectionalKnockOn;`, context);
  const decision = context.reconcile(state, 20);
  assert.equal(decision.reacquire, false);
  assert.equal(decision.authorityPending, 'first-touch-v2');
  assert.equal(state.owner, null, 'post-commit host code fabricated ownership');
  assert.equal(state.target, player);
  assert.equal(context.liveV2SuppressLegacyReception, true);
});
