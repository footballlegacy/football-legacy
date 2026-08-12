import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Ball = require('../match-engine/ball-engine-v2.js');
const Movement = require('../match-engine/movement-engine-v2.js');
const Dribbling = require('../match-engine/dribbling-state-v2.js');

function capability(workflow = 'single-player') {
  return Dribbling.createCapability({
    acknowledgement: Dribbling.ACKNOWLEDGEMENT,
    workflow,
    online: false
  });
}

function world(tick, options = {}) {
  const carrierX = options.carrierX ?? 40;
  const carrierY = options.carrierY ?? 0;
  const velocity = options.velocity || { x: 4, y: 0 };
  const defenderX = options.defenderX ?? 44;
  const defenderY = options.defenderY ?? 0;
  return Movement.createWorldState({
    tick,
    fixedTickSeconds: 1 / 60,
    bounds: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    ballOwnerId: options.ballOwnerId ?? 'carrier',
    players: [
      {
        id: 'carrier', teamId: 'you', role: 'RW',
        position: { x: carrierX, y: carrierY }, velocity, facing: options.facing || { x: 1, y: 0 },
        radius: 0.34, attributes: { control: 86, technique: 84, agility: 88, pace: 82, acceleration: 84 }
      },
      {
        id: 'defender', teamId: 'opp', role: 'LB',
        position: { x: defenderX, y: defenderY }, velocity: options.defenderVelocity || { x: 0, y: 0 }, facing: { x: -1, y: 0 },
        radius: 0.34, attributes: { control: 70, technique: 68, agility: 73, pace: 78, acceleration: 76 }
      }
    ]
  });
}

function roster(attributes = {}) {
  return [
    {
      id: 'carrier', teamId: 'you', isGK: false, sentOff: false, available: true,
      attributes: { control: 86, technique: 84, agility: 88, ...attributes }
    },
    {
      id: 'defender', teamId: 'opp', isGK: false, sentOff: false, available: true,
      attributes: { control: 70, technique: 68, agility: 73 }
    }
  ];
}

function ball(overrides = {}) {
  return Ball.createBallState({
    id: 'match-ball',
    position: { x: 40.42, y: 0, z: 0.11 },
    velocity: { x: 4, y: 0, z: 0 },
    grounded: true,
    regime: Ball.REGIMES.CONTROLLED,
    ...overrides
  });
}

function request(tick, state, ballState, options = {}) {
  return {
    schema: Dribbling.REQUEST_SCHEMA,
    workflow: options.workflow || 'single-player',
    online: false,
    tick,
    epoch: options.epoch || 0,
    seed: options.seed || 246813579,
    fixedTickSeconds: 1 / 60,
    state,
    movementWorld: options.world || world(tick, options.worldOptions),
    ballState,
    roster: options.roster || roster(options.attributes),
    logicalOwnerId: options.logicalOwnerId === undefined ? 'carrier' : options.logicalOwnerId,
    carrierInput: {
      source: options.source || 'human',
      direction: options.direction || { x: 1, y: 0 },
      intensity: options.intensity === undefined ? 0.78 : options.intensity,
      sprint: Boolean(options.sprint),
      shield: Boolean(options.shield)
    },
    surface: options.surface || 'dry',
    actionIntent: options.actionIntent || null,
    gate: {
      livePlay: options.livePlay !== false,
      restartActive: Boolean(options.restartActive),
      replayActive: Boolean(options.replayActive),
      keeperAuthority: Boolean(options.keeperAuthority),
      offsideInvolvementPending: Boolean(options.offsideInvolvementPending),
      specialActionAuthority: Boolean(options.specialActionAuthority)
    },
    difficulty: options.difficulty
  };
}

function resolve(tick, state, ballState, options = {}) {
  return Dribbling.resolve(request(tick, state, ballState, options), options.capability || capability(options.workflow));
}

function reachSeparated(options = {}) {
  const cap = capability(options.workflow);
  let state = Dribbling.createState({ epoch: 0 });
  let ballState = ball();
  const outputs = [];
  for (let tick = 1; tick <= 4; tick += 1) {
    const output = resolve(tick, state, ballState, { ...options, capability: cap });
    state = output.state;
    ballState = output.ballState;
    outputs.push(output);
  }
  return { cap, state, ballState, outputs };
}

test('capability is explicit, offline-only, and limited to the two live V2 workflows', () => {
  assert.equal(capability().physicsProfile, 'shared-human-cpu-ratings-neutral');
  assert.equal(capability('cpu-v-cpu').workflow, 'cpu-v-cpu');
  assert.throws(() => Dribbling.createCapability({ acknowledgement: Dribbling.ACKNOWLEDGEMENT, workflow: 'set-piece-suite', online: false }), /unsupported/);
  assert.throws(() => Dribbling.createCapability({ acknowledgement: Dribbling.ACKNOWLEDGEMENT, workflow: 'single-player', online: true }), /online:false/);
  assert.throws(() => Dribbling.createCapability({ workflow: 'single-player', online: false }), /acknowledgement/);
});

test('secured control progresses through preparation into a physically separated Ball V2 touch', () => {
  const { outputs } = reachSeparated();
  assert.deepEqual(outputs.map(output => output.state.phase), [
    Dribbling.PHASES.SECURED_CONTROL,
    Dribbling.PHASES.SECURED_CONTROL,
    Dribbling.PHASES.TOUCH_PREPARATION,
    Dribbling.PHASES.SEPARATED_TOUCH
  ]);
  const released = outputs.at(-1);
  assert.equal(released.physicalSeparated, true);
  assert.equal(released.logicalOwnerId, 'carrier');
  assert.equal(released.ballState.regime, Ball.REGIMES.SKID);
  assert.equal(released.ballState.contactCount, 1);
  assert.match(released.ballState.lastContact.colliderId, /^dribble-boot:carrier:(left|right)$/);
  assert.ok(released.presentation.separationMetres > 0.4);
  assert.ok(Math.hypot(released.ballState.velocity.x, released.ballState.velocity.y) > 4);
  assert.equal(released.telemetry.physicsProfile, 'shared-human-cpu-ratings-neutral');
  assert.ok(['left', 'right'].includes(released.telemetry.foot));
  assert.ok(['instep-push', 'inside-cut', 'outside-push'].includes(released.telemetry.contact));
});

test('released touch becomes chase/recovery and then physically resecures', () => {
  const chain = reachSeparated();
  const touchTick = chain.state.touchTick;
  let output = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    world: world(5, { carrierX: 40.27 }),
    logicalOwnerId: null
  });
  assert.equal(output.state.phase, Dribbling.PHASES.CHASE_RECOVERY);
  assert.equal(output.logicalOwnerId, 'carrier');
  const nearBall = Ball.createBallState({ ...output.ballState, position: { x: 40.58, y: 0, z: 0.11 } });
  output = resolve(Math.max(7, touchTick + 3), output.state, nearBall, {
    capability: chain.cap,
    world: world(Math.max(7, touchTick + 3), { carrierX: 40.32 }),
    logicalOwnerId: null
  });
  assert.equal(output.state.phase, Dribbling.PHASES.RESECURE);
  assert.equal(output.physicalSeparated, false);
  assert.equal(output.logicalOwnerId, 'carrier');
  assert.equal(output.ballState.regime, Ball.REGIMES.CONTROLLED);
  assert.equal(output.telemetry.outcome, 'resecure');
});

test('lease failure becomes a bounded heavy touch with no retained authority', () => {
  const chain = reachSeparated();
  let chase = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    world: world(5, { carrierX: 38 }),
    logicalOwnerId: null
  });
  assert.equal(chase.state.phase, Dribbling.PHASES.CHASE_RECOVERY);
  const farBall = Ball.createBallState({ ...chase.ballState, position: { x: 43, y: 0, z: 0.11 } });
  const heavy = resolve(7, chase.state, farBall, {
    capability: chain.cap,
    world: world(7, { carrierX: 39 }),
    logicalOwnerId: null
  });
  assert.equal(heavy.state.phase, Dribbling.PHASES.HEAVY_TOUCH);
  assert.equal(heavy.logicalOwnerId, null);
  assert.equal(heavy.physicalSeparated, false);
  assert.equal(heavy.telemetry.outcome, 'heavy-touch');
  const loose = resolve(8, heavy.state, heavy.ballState, { capability: chain.cap, logicalOwnerId: null });
  assert.equal(loose.state.phase, Dribbling.PHASES.IDLE);
  assert.equal(loose.telemetry.outcome, 'loose');
});

test('an opponent who physically reaches the separated ball wins a deterministic turnover', () => {
  const chain = reachSeparated();
  const chase = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    world: world(5, { carrierX: 40, defenderX: 42 }),
    logicalOwnerId: null
  });
  const contactBall = Ball.createBallState({ ...chase.ballState, position: { x: 41, y: 0, z: 0.11 } });
  const turnover = resolve(7, chase.state, contactBall, {
    capability: chain.cap,
    world: world(7, { carrierX: 40, defenderX: 41.2 }),
    logicalOwnerId: null
  });
  assert.equal(turnover.state.phase, Dribbling.PHASES.TURNOVER);
  assert.equal(turnover.logicalOwnerId, 'defender');
  assert.equal(turnover.ballState.regime, Ball.REGIMES.CONTROLLED);
  assert.equal(turnover.presentation.previousCarrierId, 'carrier');
});

test('a contact-ineligible opponent cannot win the separated ball', () => {
  const chain = reachSeparated();
  const chase = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    world: world(5, { carrierX: 40, defenderX: 42 }),
    logicalOwnerId: null
  });
  const contactBall = Ball.createBallState({ ...chase.ballState, position: { x: 41, y: 0, z: 0.11 } });
  const denied = resolve(7, chase.state, contactBall, {
    capability: chain.cap,
    world: world(7, { carrierX: 40, defenderX: 41.2 }),
    roster: [
      { id: 'carrier', teamId: 'you', available: true, contactEligible: true, attributes: { control: 86, technique: 84, agility: 88 } },
      { id: 'defender', teamId: 'opp', available: true, contactEligible: false, attributes: { control: 70, technique: 68, agility: 73 } }
    ],
    logicalOwnerId: null
  });
  assert.equal(denied.state.phase, Dribbling.PHASES.CHASE_RECOVERY);
  assert.equal(denied.logicalOwnerId, 'carrier');
});

test('shielding remains controlled and can physically secure a short released lease', () => {
  const cap = capability();
  let output = resolve(1, Dribbling.createState(), ball(), { capability: cap, shield: true });
  assert.equal(output.state.phase, Dribbling.PHASES.SHIELD);
  output = resolve(2, output.state, output.ballState, { capability: cap, shield: true });
  assert.equal(output.state.phase, Dribbling.PHASES.SHIELD);
  assert.equal(output.physicalSeparated, false);

  const chain = reachSeparated();
  const chase = resolve(5, chain.state, chain.ballState, { capability: chain.cap, logicalOwnerId: null });
  const nearBall = Ball.createBallState({ ...chase.ballState, position: { x: 40.56, y: 0, z: 0.11 } });
  const shield = resolve(6, chase.state, nearBall, {
    capability: chain.cap,
    world: world(6, { carrierX: 40.1, defenderX: 40.7 }),
    logicalOwnerId: null,
    shield: true
  });
  assert.equal(shield.state.phase, Dribbling.PHASES.SHIELD);
  assert.equal(shield.logicalOwnerId, 'carrier');
  assert.equal(shield.ballState.regime, Ball.REGIMES.CONTROLLED);
});

test('pass and shot inputs buffer only during the lease and release on resecure', () => {
  const chain = reachSeparated();
  const actionIntent = { id: 'pass-edge-44', type: 'pass', actorId: 'carrier', targetPlayerId: 'winger', power: 0.62, variant: 'over-the-top-through', commandTick: 5 };
  const chase = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    logicalOwnerId: null,
    actionIntent
  });
  assert.equal(chase.state.bufferedAction.id, actionIntent.id);
  assert.equal(chase.releasedAction, null);
  const nearBall = Ball.createBallState({ ...chase.ballState, position: { x: 40.55, y: 0, z: 0.11 } });
  const gathered = resolve(7, chase.state, nearBall, {
    capability: chain.cap,
    world: world(7, { carrierX: 40.25 }),
    logicalOwnerId: null,
    actionIntent
  });
  assert.equal(gathered.state.phase, Dribbling.PHASES.RESECURE);
  assert.equal(gathered.releasedAction.id, actionIntent.id);
  assert.equal(gathered.releasedAction.type, 'pass');
  assert.equal(gathered.releasedAction.variant, actionIntent.variant,
    'the exact authored pass family must survive the physical touch lease');
  assert.deepEqual(gathered.state.consumedActionIds, [actionIntent.id]);
});

test('bounded fail-closed action ledger preserves exact identity across long matches', () => {
  const cap = capability();
  let state = Dribbling.createState(), ballState = ball();
  for (let tick = 1; tick <= 40; tick += 1) {
    const output = resolve(tick, state, ballState, {
      capability: cap,
      intensity: 0,
      world: world(tick, { velocity: { x: 0, y: 0 } }),
      actionIntent: { id: 'pass-' + tick, type: 'pass', actorId: 'carrier', commandTick: tick }
    });
    assert.equal(output.releasedAction.id, 'pass-' + tick);
    state = output.state;
    ballState = output.ballState;
  }
  assert.equal(state.consumedActionIds.length, 40);
  assert.equal(state.consumedActionHighWaterTick, 40);
  const replay = resolve(41, state, ballState, {
    capability: cap,
    intensity: 0,
    world: world(41, { velocity: { x: 0, y: 0 } }),
    actionIntent: { id: 'pass-1', type: 'pass', actorId: 'carrier', commandTick: 1 }
  });
  assert.equal(replay.releasedAction, null);
  assert.equal(replay.state.consumedActionHighWaterTick, 40);

  const duplicateWithNewTick = resolve(42, state, ballState, {
    capability: cap,
    intensity: 0,
    world: world(42, { velocity: { x: 0, y: 0 } }),
    actionIntent: { id: 'pass-40', type: 'pass', actorId: 'carrier', commandTick: 42 }
  });
  assert.equal(duplicateWithNewTick.releasedAction, null,
    'a stable action identity cannot be replayed by changing its command tick');
  assert.throws(() => resolve(43, state, ballState, {
    capability: cap,
    intensity: 0,
    world: world(43, { velocity: { x: 0, y: 0 } }),
    actionIntent: { id: 'future-pass', type: 'pass', actorId: 'carrier', commandTick: 44 }
  }), /commandTick cannot be in the future/);
});

test('human and CPU carriers use byte-equivalent physical resolution and difficulty cannot alter it', () => {
  const human = reachSeparated({ source: 'human', difficulty: 'amateur' }).outputs.at(-1);
  const cpu = reachSeparated({ source: 'cpu', difficulty: 'legendary' }).outputs.at(-1);
  assert.deepEqual(cpu.state, human.state);
  assert.deepEqual(cpu.ballState, human.ballState);
  assert.deepEqual(cpu.telemetry, human.telemetry);
});

test('control, technique, agility, pressure, surface, facing, speed and input all alter the physical touch', () => {
  const base = reachSeparated().outputs.at(-1);
  const lowRatings = reachSeparated({ attributes: { control: 35, technique: 38, agility: 40 } }).outputs.at(-1);
  const pressure = reachSeparated({ worldOptions: { defenderX: 40.8 } }).outputs.at(-1);
  const wet = reachSeparated({ surface: 'wet' }).outputs.at(-1);
  const turn = reachSeparated({ direction: { x: 0.35, y: 0.94 }, worldOptions: { velocity: { x: 2, y: 1 } } }).outputs.at(-1);
  assert.notDeepEqual(lowRatings.ballState.velocity, base.ballState.velocity);
  assert.notDeepEqual(pressure.ballState.velocity, base.ballState.velocity);
  assert.notDeepEqual(wet.ballState.velocity, base.ballState.velocity);
  assert.notDeepEqual(turn.ballState.velocity, base.ballState.velocity);
  assert.ok(lowRatings.state.targetSeparationMetres > base.state.targetSeparationMetres);
  assert.equal(wet.telemetry.surface, 'wet');
  assert.ok(pressure.telemetry.pressure > base.telemetry.pressure);
});

test('serialized state is checksum guarded and supports deterministic replay chunks', () => {
  const chain = reachSeparated();
  const serialized = Dribbling.serializeState(chain.state);
  const restored = Dribbling.restoreState(JSON.parse(JSON.stringify(serialized)));
  const options = { capability: chain.cap, logicalOwnerId: null, world: world(5, { carrierX: 40.2 }) };
  const direct = resolve(5, chain.state, chain.ballState, options);
  const resumed = resolve(5, restored, chain.ballState, options);
  assert.deepEqual(resumed, direct);
  const corrupt = JSON.parse(JSON.stringify(serialized));
  corrupt.state.touchSequence += 1;
  assert.throws(() => Dribbling.restoreState(corrupt), /invalid serialized/);
});

test('resolution is pure so discarded plans and rollback replays remain exact', () => {
  const chain = reachSeparated();
  const before = structuredClone(chain.state);
  const first = resolve(5, chain.state, chain.ballState, { capability: chain.cap, logicalOwnerId: null });
  const replay = resolve(5, chain.state, chain.ballState, { capability: chain.cap, logicalOwnerId: null });
  assert.deepEqual(chain.state, before);
  assert.deepEqual(replay, first);
});

test('restarts, replays, keepers, offside involvement and protected skills hand authority back without a touch', () => {
  for (const gate of ['restartActive', 'replayActive', 'keeperAuthority', 'offsideInvolvementPending', 'specialActionAuthority']) {
    const output = resolve(1, Dribbling.createState(), ball(), { [gate]: true });
    assert.equal(output.state.phase, Dribbling.PHASES.IDLE, gate);
    assert.match(output.telemetry.outcome, /^protected-.+-handoff$/, gate);
    assert.equal(output.authorityHandoff.executeExactlyOnce, true, gate);
    assert.equal(output.ballState.contactCount, 0, gate);
  }
  const stopped = resolve(1, Dribbling.createState(), ball(), { livePlay: false });
  assert.equal(stopped.state.phase, Dribbling.PHASES.IDLE);
});

test('protected skill handoff atomically clears an active lease and emits one stable exact-once token', () => {
  const chain = reachSeparated();
  const beforeBall = structuredClone(chain.ballState);
  const first = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    logicalOwnerId: null,
    specialActionAuthority: true
  });
  const replay = resolve(5, chain.state, chain.ballState, {
    capability: chain.cap,
    logicalOwnerId: null,
    specialActionAuthority: true
  });
  assert.equal(first.state.phase, Dribbling.PHASES.IDLE);
  assert.equal(first.physicalSeparated, false);
  assert.deepEqual(first.ballState, beforeBall);
  assert.equal(first.authorityHandoff.authority, 'build-173-protected-skill');
  assert.equal(first.authorityHandoff.executeExactlyOnce, true);
  assert.deepEqual(replay.authorityHandoff, first.authorityHandoff);
});
