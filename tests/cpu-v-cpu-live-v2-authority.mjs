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
const Control = require('../match-engine/live-v2-match-control-composition.js');
const matchSource = readFileSync(new URL('../match-engine/match.html', import.meta.url), 'utf8');

const dependencies = { ball: Ball, movement: Movement, cpu: CPU, formation: Formation, contact: Contact };
const cpuOwnership = { humanPlayerIds: [], cpuTeamIds: ['you', 'opp'] };

function gameplayCapability(extra = {}) {
  return Adapter.createCapability({
    acknowledgement: Adapter.ACKNOWLEDGEMENT,
    workflow: 'cpu-v-cpu',
    online: false,
    onlineMarkers: {},
    controlOwnership: cpuOwnership,
    ...extra
  });
}

function canonicalLineup(teamId) {
  return Formation.canonicalLineup('4-3-3').map(row => ({ ...row, id: `${teamId}-${row.slotId}` }));
}

function cpuSnapshot(humanPlayerIds = [], controlledPlayerId = null) {
  const teams = ['you', 'opp'].map(teamId => ({
    id: teamId,
    formation: '4-3-3',
    phase: teamId === 'you' ? 'settled-attack' : 'defend',
    philosophy: teamId === 'you' ? 'ancelotti-bbc-433' : null,
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
      tick: 1,
      lineup: team.lineup,
      pitch: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
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
      radius: 0.42,
      stamina: 100,
      attrs: {
        pace: 88, accel: 88, agility: 88, balance: 88, strength: 88, stamina: 88,
        awareness: 90, pass: 90, shoot: 88, control: 90, defend: 88, aggression: 88
      },
      isGK: target.position === 'GK',
      sentOff: false,
      tackleActive: false,
      shoulderActive: false,
      control: target.playerId === controlledPlayerId
        ? { x: 1, y: 0, strength: 1, sprint: true }
        : null
    });
  }
  const ownerId = 'you-CAM';
  const owner = players.find(player => player.id === ownerId);
  return {
    tick: 1,
    fixedTickSeconds: 1 / 60,
    pitch: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    units: { xPerMetre: 1, yPerMetre: 1, zPerMetre: 1 },
    players,
    humanPlayerIds,
    ball: {
      id: 'cpu-v-cpu-live-ball', x: owner.x, y: owner.y, z: 0,
      vx: 0, vy: 0, zv: 0, spin: 0, dip: 0,
      ownerId, targetId: null, lastKickerId: null, flightType: '', launchIntent: null
    },
    teams,
    contact: {
      intendedReceiverId: null,
      firstTouchIntent: null,
      aerialIntent: null,
      gate: {
        livePlay: true, restartActive: false, replayActive: false,
        keeperAuthority: false, offsideInvolvementPending: false, specialActionAuthority: false
      }
    }
  };
}

function controlCapability(extra = {}) {
  return Control.createCapability({
    enabled: true,
    workflow: 'cpu-v-cpu',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    fallbackEngine: 'build-173',
    acknowledgement: Control.ACKNOWLEDGEMENT,
    ...extra
  });
}

function controlRuntime(capability) {
  return Control.createRuntime({
    sessionId: 'cpu-v-cpu-contract',
    realMatchDurationSeconds: 240,
    pitch: {
      units: 'metres',
      coordinateSystem: 'si-metres-world-x-length-y-width-z-up',
      axisAlignment: 'axis-aligned',
      xMin: 0, xMax: 105, yMin: 0, yMax: 68
    }
  }, capability);
}

function livePreflight(query, payload) {
  const script = matchSource.match(/<script id="offlineLiveV2Preflight">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'offline FL V2 preflight must remain extractable');
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const writes = [];
  const context = vm.createContext({
    URLSearchParams,
    TextDecoder,
    Uint8Array,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    location: { search: query, hash: `#flMatch=${encoded}` },
    document: { write: value => writes.push(value) },
    window: {}
  });
  vm.runInContext(script, context, { filename: 'cpu-v-cpu-live-preflight.vm.js' });
  return {
    preflight: JSON.parse(JSON.stringify(context.window.__FL_V2_LIVE_PREFLIGHT)),
    writes
  };
}

function cpuPayload(overrides = {}) {
  return {
    mode: 'quickPlay',
    matchType: 'spectator',
    online: null,
    controllers: { player1Team: null, player2Team: null, aiTeam: 'both' },
    engine: {
      requested: 'fl-v2', effective: 'fl-v2',
      version: Adapter.VERSION, fallbackReason: null
    },
    simulationSeed: 1967,
    practiceMode: null,
    homeTeam: { id: 'madrid-real-2013-14', name: 'Madrid 2013/14' },
    awayTeam: { id: 'woolwich-arsenal', name: 'Arsenal Invincibles' },
    ...overrides
  };
}

test('CPU-v-CPU authority requires exact all-CPU ownership and remains offline-only', () => {
  assert.deepEqual([...Adapter.SUPPORTED_WORKFLOWS], ['single-player', 'cpu-v-cpu']);
  assert.throws(() => gameplayCapability({ controlOwnership: undefined }), /zero human players/);
  assert.throws(() => gameplayCapability({
    controlOwnership: { humanPlayerIds: ['player-1'], cpuTeamIds: ['you', 'opp'] }
  }), /zero human players/);
  assert.throws(() => gameplayCapability({
    controlOwnership: { humanPlayerIds: [], cpuTeamIds: ['you', 'you'] }
  }), /exact you\/opp CPU team ownership/);
  assert.throws(() => gameplayCapability({
    controlOwnership: { humanPlayerIds: [], cpuTeamIds: ['you'] }
  }), /exact you\/opp CPU team ownership/);
  assert.throws(() => gameplayCapability({
    controlOwnership: cpuOwnership, online: true
  }), /online must be explicitly false/);
  const capability = gameplayCapability();
  assert.equal(capability.workflow, 'cpu-v-cpu');
  assert.deepEqual(capability.controlOwnership, { humanPlayerIds: [], cpuTeamIds: ['opp', 'you'] });
});

test('one CPU-v-CPU live tick gives both teams CPU, movement, formation and ball authority', () => {
  let committedProjection = null;
  const attachment = Adapter.createAttachment({
    enabled: true,
    capability: gameplayCapability(),
    seed: 1967,
    dependencies,
    host: {
      prepareTick(projection) {
        return {
          commit() { committedProjection = projection; },
          rollback() { committedProjection = null; }
        };
      }
    }
  });
  const frame = attachment.planTick(cpuSnapshot());
  assert.ok(frame, JSON.stringify(attachment.status()));
  assert.equal(frame.hostProjection.movement.length, 20);
  assert.deepEqual(Object.keys(frame.formation).sort(), ['opp', 'you']);
  assert.deepEqual(Object.keys(frame.cpu).sort(), ['opp', 'you']);
  assert.equal(frame.hostProjection.authorityCounters.candidateTicks, 1);
  assert.equal(frame.hostProjection.authorityCounters.legacyCpu, 0);
  assert.equal(frame.hostProjection.authorityCounters.legacyOutfieldLocomotion, 0);
  assert.equal(attachment.commitTick(frame), true);
  assert.ok(committedProjection);
  assert.equal(attachment.status().workflow, 'cpu-v-cpu');
  assert.equal(attachment.status().committedTicks, 1);
});

test('a CPU-v-CPU snapshot self-disables on either human identity or human control input', () => {
  for (const snapshot of [cpuSnapshot(['you-CAM']), cpuSnapshot([], 'you-CAM')]) {
    const attachment = Adapter.createAttachment({
      enabled: true,
      capability: gameplayCapability(),
      seed: 1967,
      dependencies,
      host: { prepareTick() { return { commit() {}, rollback() {} }; } }
    });
    assert.equal(attachment.planTick(snapshot), null);
    assert.equal(attachment.status().enabled, false);
    assert.match(attachment.status().failure, /no human ownership or human control input/);
  }
});

test('contact composition preserves CPU-v-CPU identity and rejects cross-workflow requests', () => {
  const capability = Contact.createCapability({
    enabled: true,
    online: false,
    workflow: 'cpu-v-cpu',
    parentAdapterVersion: Contact.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Contact.ACKNOWLEDGEMENT
  });
  const movementWorld = Movement.createWorldState({
    tick: 1,
    fixedTickSeconds: 1 / 60,
    bounds: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    ballOwnerId: null,
    players: [
      { id: 'you-player', teamId: 'you', role: 'CM', position: { x: 50, y: 0 }, velocity: { x: 0, y: 0 }, facing: { x: 1, y: 0 } },
      { id: 'opp-player', teamId: 'opp', role: 'CM', position: { x: 55, y: 0 }, velocity: { x: 0, y: 0 }, facing: { x: -1, y: 0 } }
    ]
  });
  const ballState = Ball.createBallState({
    id: 'contact-ball', position: { x: 52.5, y: 0, z: 0.11 }, velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 }, grounded: true, lastOuterTick: 1
  });
  const request = {
    schema: Contact.REQUEST_SCHEMA,
    workflow: 'cpu-v-cpu',
    online: false,
    tick: 1,
    epoch: 0,
    seed: 1967,
    fixedTickSeconds: 1 / 60,
    movementWorld,
    ballState,
    roster: movementWorld.players.map(player => ({
      id: player.id, teamId: player.teamId, isGK: false, sentOff: false,
      available: true, contactEligible: true, heightM: 1.82, attributes: {}
    })),
    intendedReceiverId: null,
    firstTouchIntent: null,
    aerialIntent: null,
    consumedFirstTouchIds: [],
    consumedAerialIds: [],
    gate: {
      livePlay: true, restartActive: false, replayActive: true,
      keeperAuthority: false, offsideInvolvementPending: false, specialActionAuthority: false
    }
  };
  const result = Contact.compose(request, capability);
  assert.equal(result.workflow, 'cpu-v-cpu');
  assert.equal(result.status, 'gated');
  assert.throws(() => Contact.compose({ ...request, workflow: 'single-player' }, capability), /match the exact approved offline workflow/);
});

test('match-control preserves CPU-v-CPU externally and uses the CPU restart/camera contract', () => {
  assert.deepEqual([...Control.WORKFLOWS], ['single-player', 'cpu-v-cpu', 'set-piece-suite']);
  const capability = controlCapability();
  const runtime = controlRuntime(capability);
  const initial = Control.snapshot(runtime, capability);
  assert.equal(initial.workflow, 'cpu-v-cpu');
  assert.equal(initial.restart.workflow, 'cpu-v-cpu');
  const plan = Control.prepareTick(runtime, {
    schema: Control.TICK_INPUT_SCHEMA,
    tick: 1,
    workflow: 'cpu-v-cpu',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    hostPhase: 'live'
  }, capability);
  assert.equal(plan.effectiveEngine, 'fl-v2');
  assert.equal(plan.workflow, 'cpu-v-cpu');
  const snapshot = Control.commit(runtime, plan, {
    schema: Control.RECEIPT_SCHEMA,
    planId: plan.planId,
    tick: plan.tick,
    success: true,
    clockAccepted: true,
    legacyClockAdvanced: false,
    appliedCommandIds: plan.requiredCommandIds
  }, capability);
  assert.equal(snapshot.workflow, 'cpu-v-cpu');
  assert.equal(snapshot.committedTick, 1);
  const offsidePlan = Control.prepareTick(runtime, {
    schema: Control.TICK_INPUT_SCHEMA,
    tick: 2,
    workflow: 'cpu-v-cpu',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    hostPhase: 'offside-presentation',
    restartIncident: {
      eventId: 'cpu-offside-1',
      pitchHeight: 68,
      position: { x: 71, y: 20 },
      assistantRefs: [
        { id: 'assistant-north', touchline: 'north', x: 70, y: 0 },
        { id: 'assistant-south', touchline: 'south', x: 70, y: 68 }
      ],
      attackingTeam: 'you',
      defendingTeam: 'opp',
      takerOwner: 'cpu',
      goalkeeperOwner: 'cpu'
    }
  }, capability);
  assert.equal(offsidePlan.effectiveEngine, 'fl-v2');
  assert.equal(offsidePlan.workflow, 'cpu-v-cpu');
  assert.ok(offsidePlan.commands.some(command => command.type === 'audio.whistle.play'));
  const afterOffside = Control.commit(runtime, offsidePlan, {
    schema: Control.RECEIPT_SCHEMA,
    planId: offsidePlan.planId,
    tick: offsidePlan.tick,
    success: true,
    clockAccepted: true,
    legacyClockAdvanced: false,
    appliedCommandIds: offsidePlan.requiredCommandIds
  }, capability);
  assert.equal(afterOffside.workflow, 'cpu-v-cpu');
  assert.equal(afterOffside.effectiveEngine, 'fl-v2');
  const policy = Control.resolveCameraPolicy({
    workflow: 'cpu-v-cpu', online: false, restartKind: 'free-kick',
    takerOwner: 'cpu', goalkeeperOwner: 'cpu'
  }, capability);
  assert.equal(policy.workflow, 'cpu-v-cpu');
  assert.equal(policy.preset, 'broadcast');
  const fallbackCapability = controlCapability();
  const fallbackRuntime = controlRuntime(fallbackCapability);
  const fallbackPlan = Control.prepareTick(fallbackRuntime, {
    schema: Control.TICK_INPUT_SCHEMA,
    tick: 1,
    workflow: 'single-player',
    online: false,
    requestedEngine: 'fl-v2',
    effectiveEngine: 'fl-v2',
    engineVersion: Control.LIVE_ENGINE_VERSION,
    hostPhase: 'live'
  }, fallbackCapability);
  assert.equal(fallbackPlan.effectiveEngine, 'build-173');
  assert.equal(fallbackPlan.workflow, 'cpu-v-cpu');
  assert.throws(() => controlCapability({ online: true }), /approved offline match-control/);
});

test('host preflight accepts only an exact offline all-CPU spectator launch', () => {
  const accepted = livePreflight('?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload());
  assert.equal(accepted.preflight.eligible, true);
  assert.equal(accepted.preflight.workflow, 'cpu-v-cpu');
  assert.equal(accepted.preflight.reason, 'exact-offline-cpu-v-cpu-authority');
  assert.equal(accepted.preflight.simulationSeed, 1967);
  assert.ok(accepted.writes.some(value => value.includes('live-v2-authority-adapter.js')));

  for (const [label, query, payload] of [
    ['missing autoplay', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967', cpuPayload()],
    ['duplicate autoplay', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1&autoplay=1', cpuPayload()],
    ['invalid autoplay', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=0', cpuPayload()],
    ['human home controller', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload({
      controllers: { player1Team: 'home', player2Team: null, aiTeam: 'away' }
    })],
    ['second human controller', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload({
      controllers: { player1Team: null, player2Team: 'away', aiTeam: 'you' }
    })],
    ['cooperative controller marker', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload({
      controllers: { player1Team: null, player2Team: null, aiTeam: 'both', cooperative: true }
    })],
    ['online controller marker', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload({
      controllers: { player1Team: null, player2Team: null, aiTeam: 'both', online: true }
    })],
    ['online payload marker', '?quickPlay=1&engine=fl-v2&candidate=4&simulationSeed=1967&autoplay=1', cpuPayload({
      online: { protocol: 'football-legacy-online-v1' }
    })]
  ]) {
    const rejected = livePreflight(query, payload);
    assert.equal(rejected.preflight.eligible, false, label);
    assert.equal(rejected.writes.length, 0, label);
  }
});
