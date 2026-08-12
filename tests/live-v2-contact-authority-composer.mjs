import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  movement: path.join(root, 'match-engine', 'movement-engine-v2.js'),
  ball: path.join(root, 'match-engine', 'ball-engine-v2.js'),
  touch: path.join(root, 'match-engine', 'first-touch-v2.js'),
  touchAdapter: path.join(root, 'match-engine', 'first-touch-authority-adapter-v2.js'),
  aerial: path.join(root, 'match-engine', 'aerial-contact-v2.js'),
  composer: path.join(root, 'match-engine', 'live-v2-contact-authority-composer.js')
};
const require = createRequire(import.meta.url);
const Movement = require(paths.movement);
const Ball = require(paths.ball);
const Composer = require(paths.composer);
const source = Object.fromEntries(Object.entries(paths).map(([name, file]) => [name, fs.readFileSync(file, 'utf8')]));

function capability(workflow = 'single-player') {
  return Composer.createCapability({
    enabled: true,
    online: false,
    workflow,
    parentAdapterVersion: Composer.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Composer.ACKNOWLEDGEMENT
  });
}

function player(id, teamId, x, overrides = {}) {
  return {
    id,
    teamId,
    role: overrides.role || 'CM',
    position: { x, y: overrides.y || 0 },
    velocity: overrides.velocity || { x: 0, y: 0 },
    facing: overrides.facing || { x: teamId === 'you' ? 1 : -1, y: 0 },
    attributes: {
      pace: 78,
      acceleration: 78,
      agility: 88,
      balance: 88,
      strength: 76,
      stamina: 80,
      defending: 70,
      aggression: 72,
      control: 94,
      ...(overrides.attributes || {})
    }
  };
}

function rosterEntry(state, overrides = {}) {
  return {
    id: state.id,
    teamId: state.teamId,
    isGK: false,
    sentOff: false,
    available: true,
    contactEligible: true,
    heightM: 1.82,
    attributes: {
      control: 94,
      technique: 92,
      awareness: 91,
      heading: 84,
      jumping: 83,
      strength: 76,
      shooting: 88,
      shoot: 88,
      volleys: 90,
      balance: 88,
      agility: 88,
      defending: 70,
      ...(overrides.attributes || {})
    },
    ...overrides
  };
}

function request(overrides = {}) {
  const tick = overrides.tick || 17;
  const receiverInput = overrides.receiver || player('receiver', 'you', 52.5);
  const defenderInput = overrides.defender || player('defender', 'opp', 56.5, {
    attributes: { control: 70, technique: 65, awareness: 80, strength: 80 }
  });
  const movementWorld = Movement.createWorldState({
    tick,
    fixedTickSeconds: 1 / 60,
    bounds: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    ballOwnerId: null,
    players: [receiverInput, defenderInput]
  });
  const ballState = Ball.createBallState({
    id: 'match-ball',
    position: overrides.ballPosition || { x: 53.02, y: 0, z: 0.11 },
    velocity: overrides.ballVelocity || { x: -8, y: 0, z: 0 },
    angularVelocity: overrides.angularVelocity || { x: 0, y: 3, z: 0 },
    inertia: overrides.inertia,
    grounded: overrides.grounded == null ? true : overrides.grounded,
    regime: overrides.regime || Ball.REGIMES.ROLL,
    lastOuterTick: tick,
    contactCount: overrides.contactCount || 0,
    simulationTime: tick / 60
  });
  return {
    schema: Composer.REQUEST_SCHEMA,
    workflow: overrides.workflow || 'single-player',
    online: false,
    tick,
    epoch: overrides.epoch || 0,
    seed: overrides.seed || 173,
    fixedTickSeconds: 1 / 60,
    movementWorld,
    ballState,
    roster: overrides.roster || [
      rosterEntry(receiverInput, overrides.receiverRoster || {}),
      rosterEntry(defenderInput, overrides.defenderRoster || {})
    ],
    intendedReceiverId: overrides.intendedReceiverId === undefined ? 'receiver' : overrides.intendedReceiverId,
    firstTouchIntent: overrides.firstTouchIntent || null,
    aerialIntent: overrides.aerialIntent || null,
    consumedFirstTouchIds: overrides.consumedFirstTouchIds || [],
    consumedAerialIds: overrides.consumedAerialIds || [],
    gate: {
      livePlay: true,
      restartActive: false,
      replayActive: false,
      keeperAuthority: false,
      offsideInvolvementPending: false,
      specialActionAuthority: false,
      ...(overrides.gate || {})
    }
  };
}

function aerialRequest(overrides = {}) {
  const tick = overrides.tick || 100;
  const actor = player('receiver', 'you', 52.5, {
    role: 'ST',
    attributes: { control: 90, technique: 92, awareness: 91, strength: 82 }
  });
  const defender = player('defender', 'opp', 56.5, {
    role: 'CB',
    attributes: { control: 70, technique: 65, awareness: 65, strength: 50, defending: 50 }
  });
  return request({
    ...overrides,
    tick,
    receiver: actor,
    defender,
    ballPosition: overrides.ballPosition || { x: 52.96, y: 0.04, z: 0.9 },
    ballVelocity: overrides.ballVelocity || { x: -8, y: 1.5, z: -1.2 },
    angularVelocity: { x: 3, y: -5, z: 7 },
    grounded: false,
    regime: Ball.REGIMES.FLIGHT,
    aerialIntent: overrides.aerialIntent || {
      sequence: 'attempt-1',
      epoch: overrides.epoch || 0,
      commandTick: tick - 5,
      actorId: 'receiver',
      technique: 'volley',
      intent: 'shoot',
      target: { x: 80, y: 1.2, z: 1.1 }
    }
  });
}

test('surface is frozen, dependency-locked, plan-only and deterministic', () => {
  assert.equal(Composer.VERSION, '1.0.0-offline-live-contact-composer-playtest');
  assert.equal(Composer.PARENT_VERSION, '1.0.0-offline-live-authority-playtest');
  assert.equal(Composer.ACKNOWLEDGEMENT, 'EXPLICIT_OFFLINE_LIVE_V2_CONTACT_COMPOSITION');
  assert.equal(Composer.AUTHORITY, 'offline-live-v2-contact-plan');
  assert.equal(Composer.DRIBBLE_CONTINUATION_PHASE, 'dribble-continuation');
  assert.deepEqual([...Composer.SUPPORTED_WORKFLOWS], ['single-player', 'cpu-v-cpu']);
  assert.equal(Object.isFrozen(Composer), true);
  assert.equal(typeof Composer.createCapability, 'function');
  assert.equal(typeof Composer.compose, 'function');
  assert.doesNotMatch(source.composer, /Math\.random|Date\.now|performance\.now|document\.|requestAnimationFrame|setTimeout|setInterval/);
  assert.doesNotMatch(source.composer, /function\s+(?:apply|commit|consume|mutate)\s*\(/);
  for (const contract of Object.values(Composer.DEPENDENCY_CONTRACTS)) assert.equal(Object.isFrozen(contract), true);
});

test('browser and CommonJS loading expose the exact same composition API', () => {
  const context = vm.createContext({});
  vm.runInContext('this.window = this;', context);
  for (const name of ['movement', 'ball', 'touch', 'touchAdapter', 'aerial', 'composer']) {
    vm.runInContext(source[name], context, { filename: paths[name] });
  }
  assert.equal(context.FootballLegacyLiveV2ContactAuthorityComposer.VERSION, Composer.VERSION);
  assert.equal(context.FootballLegacyLiveV2ContactAuthorityComposer.REQUEST_SCHEMA, Composer.REQUEST_SCHEMA);
});

test('capability provenance, parent version, workflow and online scope fail closed', () => {
  const forged = {
    schema: Composer.CAPABILITY_SCHEMA,
    version: Composer.VERSION,
    authority: Composer.AUTHORITY,
    workflow: 'single-player',
    online: false,
    parentAdapterVersion: Composer.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    exactOnce: true,
    transactionalPlanOnly: true
  };
  assert.throws(() => Composer.compose(request(), forged), /issued live contact capability/);
  assert.throws(() => Composer.createCapability({
    enabled: true,
    online: true,
    workflow: 'single-player',
    parentAdapterVersion: Composer.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Composer.ACKNOWLEDGEMENT
  }), /exact offline Single Player/);
  assert.throws(() => Composer.createCapability({
    enabled: true,
    online: false,
    workflow: 'single-player',
    parentAdapterVersion: 'forged',
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Composer.ACKNOWLEDGEMENT
  }), /exact offline Single Player/);
  assert.throws(() => Composer.createCapability({
    enabled: true,
    online: false,
    workflow: 'home-co-op',
    parentAdapterVersion: Composer.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Composer.ACKNOWLEDGEMENT
  }), /exact offline Single Player or CPU-v-CPU/);
  const cpuCapability = capability('cpu-v-cpu');
  const cpuResult = Composer.compose(request({ workflow: 'cpu-v-cpu' }), cpuCapability);
  assert.equal(cpuResult.workflow, 'cpu-v-cpu');
  assert.throws(() => Composer.compose(request(), cpuCapability), /match the exact approved offline workflow/);
});

test('clean pass reception emits one canonical controlled first-touch handoff', () => {
  const input = request();
  const before = Composer.stableJson(input);
  const result = Composer.compose(input, capability());
  assert.equal(Composer.stableJson(input), before);
  assert.equal(result.status, 'contact');
  assert.equal(result.contactType, 'first-touch');
  assert.equal(result.ownedContact, true);
  assert.equal(result.presentation.outcome, 'controlled');
  assert.equal(result.ownerCandidateId, 'receiver');
  assert.equal(result.ballState.contactCount, input.ballState.contactCount + 1);
  assert.equal(result.ballState.lastContact.colliderId, 'receiver');
  assert.equal(result.ballState.lastContact.outerTick, input.tick);
  assert.equal(result.ballState.lastOuterTick, input.tick);
  assert.equal(result.consumedFirstTouchIds.length, 1);
  assert.deepEqual(result.suppressLegacy, {
    reception: true,
    aerialDuel: true,
    outfieldBallBlock: false,
    keeperContact: false,
    wallContact: false
  });
});

test('same-player retained contacts stay physical but cannot restart reception presentation every 18 ticks', () => {
  const directional = {
    type: 'directional-touch', direction: { x: 1, y: 0 }, touchDistanceM: 1.1, active: true
  };
  const first = Composer.compose(request({ tick: 17, firstTouchIntent: directional }), capability());
  assert.equal(first.contactType, 'first-touch');
  assert.equal(first.presentation.outcome, 'retained');
  assert.equal(first.presentation.phase, 'reception');

  const secondInput = request({ tick: 35, firstTouchIntent: directional, contactCount: first.ballState.contactCount });
  secondInput.ballState = Ball.createBallState({
    ...structuredClone(first.ballState),
    lastOuterTick: secondInput.tick
  });
  const second = Composer.compose(secondInput, capability());
  assert.equal(second.status, 'contact');
  assert.equal(second.contactType, 'dribble-touch');
  assert.equal(second.presentation.phase, Composer.DRIBBLE_CONTINUATION_PHASE);
  assert.equal(second.detail.retainedTouchContinuation, true);
  assert.equal(second.ballState.contactCount, first.ballState.contactCount + 1);
  assert.equal(second.suppressLegacy.reception, true);

  const thirdInput = request({ tick: 53, firstTouchIntent: directional, contactCount: second.ballState.contactCount });
  thirdInput.ballState = Ball.createBallState({
    ...structuredClone(second.ballState),
    lastOuterTick: thirdInput.tick
  });
  const third = Composer.compose(thirdInput, capability());
  assert.equal(third.contactType, 'dribble-touch');
  assert.equal(third.presentation.phase, Composer.DRIBBLE_CONTINUATION_PHASE);
});

test('pressured weak receiver produces a deterministic heavy touch that remains loose', () => {
  const close = player('defender', 'opp', 52.95, {
    y: 0.1,
    attributes: { control: 70, technique: 65, awareness: 90, strength: 94 }
  });
  const input = request({
    defender: close,
    receiver: player('receiver', 'you', 52.5, {
      attributes: { control: 20, agility: 25, balance: 25, strength: 30 }
    }),
    receiverRoster: { attributes: { control: 20, technique: 18, awareness: 20, agility: 25, balance: 25, strength: 30 } }
  });
  const first = Composer.compose(input, capability());
  const second = Composer.compose(structuredClone(input), capability());
  assert.equal(first.status, 'contact');
  assert.equal(first.presentation.outcome, 'loose');
  assert.equal(first.presentation.reason, 'heavy-touch');
  assert.equal(first.ownerCandidateId, null);
  assert.equal(Composer.stableJson(first), Composer.stableJson(second));
});

test('first-touch exact-once IDs remain caller-staged until the outer transaction commits', () => {
  const input = request();
  const first = Composer.compose(input, capability());
  assert.deepEqual(input.consumedFirstTouchIds, []);
  const retryBeforeCommit = Composer.compose(input, capability());
  assert.equal(Composer.stableJson(retryBeforeCommit), Composer.stableJson(first));
  const afterCommit = request({ consumedFirstTouchIds: first.consumedFirstTouchIds });
  const duplicate = Composer.compose(afterCommit, capability());
  assert.equal(duplicate.status, 'already-consumed');
  assert.equal(duplicate.ownedContact, false);
});

test('offside, restart, replay, keeper and special-action gates precede contact', () => {
  for (const key of ['offsideInvolvementPending', 'restartActive', 'replayActive', 'keeperAuthority', 'specialActionAuthority']) {
    const result = Composer.compose(request({ gate: { [key]: true } }), capability());
    assert.equal(result.status, 'gated', key);
    assert.equal(result.ownedContact, false, key);
    assert.equal(result.ballState.contactCount, 0, key);
    assert.deepEqual(result.consumedFirstTouchIds, [], key);
  }
});

test('aerial command has exclusive priority over ground first touch and records repaired chronology', () => {
  const input = aerialRequest({ contactCount: 7 });
  const first = Composer.compose(input, capability());
  const second = Composer.compose(structuredClone(input), capability());
  assert.equal(first.status, 'contact');
  assert.equal(first.contactType, 'aerial-volley');
  assert.equal(first.presentation.outcome, 'contact');
  assert.equal(first.presentation.technique, 'volley');
  assert.equal(first.ownerCandidateId, null);
  assert.equal(first.ballState.contactCount, 8);
  assert.equal(first.ballState.lastOuterTick, input.tick);
  assert.equal(first.ballState.lastContact.outerTick, input.tick);
  assert.equal(first.ballState.lastContact.colliderId, first.presentation.playerId);
  assert.equal(first.ballState.metadata.liveContactLedgerId, first.consumedAerialIds[0]);
  assert.equal(first.consumedFirstTouchIds.length, 0);
  assert.equal(first.consumedAerialIds.length, 1);
  assert.equal(Composer.stableJson(first), Composer.stableJson(second));
});

test('aerial pending and miss paths do not consume early or mutate the incoming ball', () => {
  const pending = aerialRequest({
    tick: 100,
    aerialIntent: {
      sequence: 'pending-1', epoch: 0, commandTick: 99, actorId: 'receiver',
      technique: 'volley', intent: 'shoot', target: { x: 80, y: 0, z: 1 }
    }
  });
  const waiting = Composer.compose(pending, capability());
  assert.equal(waiting.status, 'aerial-pending');
  assert.deepEqual(waiting.consumedAerialIds, []);
  assert.equal(Composer.stableJson(waiting.ballState), Composer.stableJson(pending.ballState));
  assert.equal(waiting.suppressLegacy.aerialDuel, true);
  assert.equal(waiting.suppressLegacy.reception, true);
  assert.equal(waiting.suppressLegacy.keeperContact, false);
  assert.equal(waiting.suppressLegacy.wallContact, false);

  const miss = aerialRequest({
    ballPosition: { x: 60, y: 0, z: 0.9 },
    ballVelocity: { x: -8, y: 0, z: -1 }
  });
  const missed = Composer.compose(miss, capability());
  assert.equal(missed.status, 'aerial-miss');
  assert.equal(missed.ownedContact, false);
  assert.equal(missed.consumedAerialIds.length, 1);
  assert.equal(Composer.stableJson(missed.ballState), Composer.stableJson(miss.ballState));
  assert.equal(missed.suppressLegacy.aerialDuel, true);
  assert.equal(missed.suppressLegacy.reception, true);
});

test('aerial ledgers are epoch-bound and a failed/retried plan cannot eat the command', () => {
  const input = aerialRequest({ epoch: 4 });
  const first = Composer.compose(input, capability());
  assert.deepEqual(input.consumedAerialIds, []);
  assert.equal(Composer.stableJson(Composer.compose(input, capability())), Composer.stableJson(first));
  const committed = aerialRequest({ epoch: 4, consumedAerialIds: first.consumedAerialIds });
  const duplicate = Composer.compose(committed, capability());
  assert.equal(duplicate.status, 'already-consumed');
  assert.equal(duplicate.suppressLegacy.aerialDuel, true);
  assert.equal(duplicate.suppressLegacy.reception, true);
  assert.equal(duplicate.suppressLegacy.outfieldBallBlock, false);
  assert.equal(duplicate.suppressLegacy.keeperContact, false);
  assert.equal(duplicate.suppressLegacy.wallContact, false);
  assert.throws(() => Composer.compose(aerialRequest({
    epoch: 5,
    aerialIntent: {
      sequence: 'old-epoch', epoch: 4, commandTick: 95, actorId: 'receiver',
      technique: 'volley', intent: 'shoot', target: { x: 80, y: 0, z: 1 }
    }
  }), capability()), /different transaction epoch/);
});

test('sent-off and goalkeeper aerial actors are rejected before the candidate resolver', () => {
  const sentOff = aerialRequest();
  sentOff.roster[0].sentOff = true;
  assert.throws(() => Composer.compose(sentOff, capability()), /eligible outfield/);
  const keeper = aerialRequest();
  keeper.roster[0].isGK = true;
  assert.throws(() => Composer.compose(keeper, capability()), /eligible outfield/);
});

test('sent-off, unavailable, contact-ineligible and keeper opponents cannot win an aerial contact', () => {
  for (const patch of [
    { sentOff: true },
    { available: false },
    { contactEligible: false },
    { isGK: true }
  ]) {
    const input = aerialRequest({
      defender: player('defender', 'opp', 52.95, {
        y: 0.02,
        attributes: { defending: 99, strength: 99, awareness: 99 }
      }),
      defenderRoster: {
        ...patch,
        attributes: { defending: 99, strength: 99, awareness: 99, heading: 99, jumping: 99 }
      }
    });
    const result = Composer.compose(input, capability());
    assert.notEqual(result.presentation && result.presentation.playerId, 'defender', JSON.stringify(patch));
  }
});
