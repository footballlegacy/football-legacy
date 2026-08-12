import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build173Observation } from './fixtures/build173-live-shadow-fixture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Adapter = require(path.resolve(here, '../match-engine/build173-live-shadow-adapter-v2.js'));

function validation(mutate) {
  return Adapter.validateObservation(build173Observation(1, mutate));
}

function rejects(mutate, pattern) {
  const result = validation(mutate);
  assert.equal(result.valid, false, `unexpectedly valid: ${JSON.stringify(result)}`);
  assert.match(result.errors.join('; '), pattern);
}

function enabledAdapter() {
  return Adapter.createAdapter({
    enabled: true,
    workflow: 'quick-play',
    capability: Adapter.createCapability({
      workflow: 'quick-play',
      acknowledgement: Adapter.ACKNOWLEDGEMENT
    }),
    fixedTickSeconds: 1 / 60,
    seed: 173,
    sessionId: 'independent-adversarial-review'
  });
}

function recursiveKeys(value, keys = []) {
  if (Array.isArray(value)) value.forEach(row => recursiveKeys(row, keys));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, row]) => {
    keys.push(key);
    recursiveKeys(row, keys);
  });
  return keys;
}

test('identity control ownership is an exact human/cpu enum', () => {
  rejects(value => {
    value.identity.teams[1].control = 'alien';
    value.cpu = [];
  }, /control.*human.*cpu/i);
});

test('the two declared teams must attack in opposite directions', () => {
  rejects(value => { value.identity.teams[1].attackingDirection = 1; }, /opposite.*attacking/i);
});

test('runtime stamina is bounded to 0..100', () => {
  for (const stamina of [-1, 101]) {
    rejects(value => {
      value.before.players[1].stamina = stamina;
      value.after.players[1].stamina = stamina;
    }, /stamina.*0.*100/i);
  }
});

test('identity enforces one goalkeeper per team and unique slot IDs directly', () => {
  rejects(value => {
    value.identity.teams[0].players[2].slotId = value.identity.teams[0].players[1].slotId;
  }, /identity.*slot.*unique/i);
  rejects(value => {
    value.identity.teams[0].players[1].position = 'GK';
    value.identity.teams[1].players[0].position = 'CB';
    value.before.players.find(player => player.id === 'you-LB').position = 'GK';
    value.after.players.find(player => player.id === 'you-LB').position = 'GK';
    value.before.players.find(player => player.id === 'opp-GK').position = 'CB';
    value.after.players.find(player => player.id === 'opp-GK').position = 'CB';
  }, /exactly one.*GK.*per team/i);
});

test('CPU events use the observation tick and event-player team ownership', () => {
  rejects(value => {
    value.cpu[0].events = [{ type: 'support-run', tick: 99, teamId: 'opp', playerId: 'opp-ST' }];
  }, /event.*tick.*observation/i);
  rejects(value => {
    value.cpu[0].events = [{ type: 'support-run', tick: 1, teamId: 'opp', playerId: 'you-LST' }];
  }, /event.*player.*ownership/i);
});

test('outfield dismissal reduces the candidate formation by the exact unavailable slot', () => {
  const observation = build173Observation(1, value => {
    value.before.players.find(player => player.id === 'you-LST').sentOff = true;
    value.after.players.find(player => player.id === 'you-LST').sentOff = true;
  });
  const output = enabledAdapter().observe(observation);
  const home = output.telemetry.comparison.formation.find(row => row.teamId === 'home');
  assert.equal(home.observedPlayerCount, 10);
});

test('goalkeeper dismissal fails closed until replacement semantics are declared', () => {
  rejects(value => {
    value.before.players.find(player => player.id === 'you-GK').sentOff = true;
    value.after.players.find(player => player.id === 'you-GK').sentOff = true;
  }, /goalkeeper.*dismiss.*replacement/i);
});

test('public telemetry contains comparisons, never candidate state labels or signatures', () => {
  const output = enabledAdapter().observe(build173Observation(1));
  const keys = recursiveKeys(output);
  for (const forbidden of ['candidateSignature', 'candidatePeriod', 'candidatePhase']) {
    assert.equal(keys.includes(forbidden), false, forbidden);
  }
});

test('Build 173 in-place substitution preserves stable slot identity across ticks', () => {
  const adapter = enabledAdapter();
  const first = build173Observation(1);
  adapter.observe(first);
  const second = build173Observation(2);
  second.epoch.stage = 'match-shadow';
  second.before = structuredClone(first.after);
  const substituted = second.after.players.find(player => player.id === 'you-LST');
  substituted.role = 'mid';
  substituted.attrs.pace = 71;
  substituted.attrs.shoot = 63;
  const result = adapter.observe(second);
  assert.equal(result.tick, 2);
  assert.equal(substituted.id, 'you-LST');
});
