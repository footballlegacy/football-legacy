import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const Movement = require(path.join(root, 'match-engine', 'movement-engine-v2.js'));
const Ball = require(path.join(root, 'match-engine', 'ball-engine-v2.js'));
const CPU = require(path.join(root, 'match-engine', 'cpu-intelligence-v2.js'));
const Formation = require(path.join(root, 'match-engine', 'formation-behaviour-v2.js'));
const Contact = require(path.join(root, 'match-engine', 'live-v2-contact-authority-composer.js'));
const Dribbling = require(path.join(root, 'match-engine', 'dribbling-state-v2.js'));
const Adapter = require(path.join(root, 'match-engine', 'live-v2-authority-adapter.js'));

const dependencies = { movement: Movement, ball: Ball, cpu: CPU, formation: Formation, contact: Contact, dribbling: Dribbling };
const HUMAN_ID = 'you-CAM';
const TEAM_WINNER_ID = 'you-ST';

function movementWorld() {
  return Movement.createWorldState({
    tick: 0,
    players: [{
      id: 'human', teamId: 'you', role: 'CM',
      position: { x: 0, y: 0 }, velocity: { x: 6, y: 0 }, facing: { x: 1, y: 0 },
      attributes: { pace: 88, acceleration: 88, agility: 88, balance: 88, strength: 76, stamina: 88, control: 90 }
    }]
  });
}

function reverseCommand(responsivenessMultiplier) {
  return [{
    tick: 1, playerId: 'human', type: 'move', move: { x: -1, y: 0 }, facing: { x: -1, y: 0 },
    mode: 'run', intensity: 1, durationTicks: 90,
    ...(responsivenessMultiplier == null ? {} : { responsivenessMultiplier })
  }];
}

function canonicalLineup(teamId) {
  return Formation.canonicalLineup('4-3-3').map(row => ({ ...row, id: `${teamId}-${row.slotId}` }));
}

function looseBallSnapshot(control) {
  const tick = 1;
  const pitch = { xMin: 0, xMax: 105, yMin: -34, yMax: 34 };
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
      formation: team.formation, phase: team.phase, tick, lineup: team.lineup,
      pitch, attackingDirection: team.attackingDirection,
      offsideLine: team.offsideLine, tactics: team.tactics
    });
    for (const [index, target] of shape.targets.entries()) {
      players.push({
        id: target.playerId, teamId: team.id, role: target.position, position: target.position,
        slotId: target.slotId,
        x: team.id === 'you' ? 12 + index * 1.3 : 78 + index * 1.3,
        y: -29 + index * 5.6,
        vx: 0, vy: 0, fx: team.attackingDirection, fy: 0,
        radius: 0.42, stamina: 100,
        attrs: {
          pace: 84, accel: 84, agility: 86, balance: 86, strength: 76, stamina: 84,
          awareness: 88, pass: 84, shoot: 76, control: 88, defend: 74, aggression: 76
        },
        isGK: target.position === 'GK', sentOff: false,
        contactEligible: true, tackleActive: false, shoulderActive: false, control: null
      });
    }
  }
  const human = players.find(player => player.id === HUMAN_ID);
  const teamWinner = players.find(player => player.id === TEAM_WINNER_ID);
  assert.ok(human && teamWinner);
  Object.assign(human, { x: 48.7, y: 0, fx: 1, fy: 0, control });
  Object.assign(teamWinner, { x: 51.55, y: 0, fx: 1, fy: 0 });
  return {
    tick, fixedTickSeconds: 1 / 60, pitch,
    units: { xPerMetre: 1, yPerMetre: 1, zPerMetre: 1 },
    players, humanPlayerIds: [HUMAN_ID],
    ball: {
      id: 'loose-ball', x: 52.5, y: 0, z: 0,
      vx: 0, vy: 0, zv: 0, spin: 0, dip: 0,
      ownerId: null, targetId: null, lastKickerId: null,
      lastKickerTeamId: null, flightType: 'loose-ball', launchIntent: null
    },
    teams,
    contact: {
      intendedReceiverId: null, firstTouchIntent: null, aerialIntent: null,
      gate: {
        livePlay: true, restartActive: false, replayActive: false,
        keeperAuthority: false, offsideInvolvementPending: false, specialActionAuthority: false
      }
    },
    dribbling: { surface: 'dry', actionIntent: null, directionalKnockOnIntent: null }
  };
}

function attachment() {
  const capability = Adapter.createCapability({
    acknowledgement: Adapter.ACKNOWLEDGEMENT,
    workflow: 'single-player', online: false, onlineMarkers: {}
  });
  return Adapter.createAttachment({
    enabled: true, capability, seed: 4256516105, dependencies,
    trueFeelPhysicalTouchAuthority: false, cpuPassRaceFilter: true,
    host: { prepareTick() { return { commit() {}, rollback() {} }; } }
  });
}

function planLooseBall(control) {
  const live = attachment();
  const frame = live.planTick(looseBallSnapshot(control));
  assert.ok(frame, JSON.stringify(live.status()));
  return frame.hostProjection;
}

test('human turn response is quicker but remains rated, gradual and speed-capped', () => {
  const baselineFirst = Movement.advance(movementWorld(), reverseCommand(), 1).state.players[0];
  const responsiveFirst = Movement.advance(movementWorld(), reverseCommand(1.42), 1).state.players[0];
  assert.ok(baselineFirst.velocity.x > 0 && responsiveFirst.velocity.x > 0,
    'neither path may snap through a 180-degree turn in one tick');
  assert.ok(responsiveFirst.facing.x < baselineFirst.facing.x,
    'the human response must begin the requested turn sooner');

  const baseline = Movement.advance(movementWorld(), reverseCommand(), 40).state.players[0];
  const responsive = Movement.advance(movementWorld(), reverseCommand(1.42), 40).state.players[0];
  assert.ok(baseline.velocity.x > 0, `baseline unexpectedly completed early: ${JSON.stringify(baseline.velocity)}`);
  assert.ok(responsive.velocity.x < 0, `responsive input remained truck-like: ${JSON.stringify(responsive.velocity)}`);
  assert.ok(Math.hypot(responsive.velocity.x, responsive.velocity.y) <= Movement.DEFAULT_CONFIG.sprintSpeedMaximum + 1e-9,
    'responsiveness must never increase the rated speed ceiling');
});

test('default and explicit one-times responsiveness are bit-identical for CPU/legacy callers', () => {
  const implicit = Movement.advance(movementWorld(), reverseCommand(), 60).state;
  const explicit = Movement.advance(movementWorld(), reverseCommand(1), 60).state;
  assert.deepEqual(explicit, implicit);
});

test('controlled footballer gets local loose-ball guidance even when a teammate wins team ETA', () => {
  const projection = planLooseBall({ x: 0, y: 0, strength: 0, sprint: false, shield: false });
  const teamWinner = projection.recoveryAssignments.find(row => row.playerId === TEAM_WINNER_ID);
  const human = projection.recoveryAssignments.find(row => row.playerId === HUMAN_ID);
  assert.equal(teamWinner?.authority, 'v2-loose-ball-recovery');
  assert.equal(human?.authority, 'v2-human-loose-ball-guidance');
  assert.ok(human.distanceMetres > teamWinner.distanceMetres,
    'fixture must prove the human was not the automatic team winner');
  const movement = projection.movement.find(row => row.id === HUMAN_ID);
  assert.ok(movement.vx > 0, `neutral human input was not guided toward the ball: ${JSON.stringify(movement)}`);
  assert.equal(projection.movementBallOwnerId, null,
    'approach assistance must not manufacture possession');
});

test('deliberate opposing input always defeats loose-ball approach guidance', () => {
  const projection = planLooseBall({ x: -1, y: 0, strength: 1, sprint: false, shield: false });
  const human = projection.recoveryAssignments.find(row => row.playerId === HUMAN_ID);
  assert.equal(human?.authority, 'v2-human-loose-ball-guidance',
    'the local opportunity should still be diagnosed');
  const movement = projection.movement.find(row => row.id === HUMAN_ID);
  assert.ok(movement.vx < 0, `assist overrode the player's away input: ${JSON.stringify(movement)}`);
  assert.equal(projection.movementBallOwnerId, null);
});
