import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));

function arsenalTeam() {
  const context = vm.createContext({ console, localStorage: { getItem: () => '[]' } });
  context.window = context;
  vm.runInContext(read('quick-play/teams.js'), context, { filename: 'quick-play/teams.js' });
  vm.runInContext(read('quick-play/historic-playtest-squads.js'), context, { filename: 'quick-play/historic-playtest-squads.js' });
  return context.FLQuickPlayTeams.getTeam('div1', 'woolwich-arsenal');
}

const expectedOveralls = Object.freeze({
  'ars-lehmann':87, 'ars-stack':72, 'ars-lauren':89, 'ars-campbell':93,
  'ars-toure':88, 'ars-cole':89, 'ars-ljungberg':89, 'ars-vieira':94,
  'ars-gilberto':89, 'ars-pires':92, 'ars-henry':97, 'ars-bergkamp':92,
  'ars-cygan':79, 'ars-clichy':76, 'ars-edu':84, 'ars-parlour':82,
  'ars-reyes':87, 'ars-kanu':83
});

test('Invincibles use the FIFA 05 team anchor without flattening their exceptional identity', () => {
  const arsenal = arsenalTeam();
  assert.equal(arsenal.rating, 90);
  assert.deepEqual(plain(arsenal.ratings), { overall: 90, attack: 92, midfield: 91, defence: 89 });
  assert.equal(arsenal.calibration.sourceDate, '2004-10-08');
  assert.match(arsenal.calibration.method, /FIFA 05 post-Invincibles overall anchor/);
  assert.equal(arsenal.squad.length, 18);
  assert.deepEqual(Object.fromEntries(arsenal.squad.map(player => [player.id, player.overall])), expectedOveralls);
});

test('Henry, Bergkamp and the side spine retain their signature Football Legacy qualities', () => {
  const arsenal = arsenalTeam();
  const byId = id => arsenal.squad.find(player => player.id === id);
  assert.deepEqual(plain(Object.fromEntries(['pace','accel','control','shoot','awareness','reactions','agility','technique'].map(key => [key, byId('ars-henry').attrs[key]]))), {
    pace:98, accel:99, control:98, shoot:98, awareness:98, reactions:98, agility:98, technique:98
  });
  assert.deepEqual(plain(Object.fromEntries(['control','pass','awareness','reactions','shoot','technique'].map(key => [key, byId('ars-bergkamp').attrs[key]]))), {
    control:99, pass:98, awareness:99, reactions:97, shoot:94, technique:99
  });
  assert.equal(byId('ars-vieira').attrs.defend, 96);
  assert.equal(byId('ars-vieira').attrs.strength, 97);
  assert.equal(byId('ars-campbell').attrs.strength, 98);
  assert.equal(byId('ars-pires').attrs.control, 95);
  assert.equal(byId('ars-lauren').overall, 89);
});

test('every Invincibles gameplay attribute is explicit-range safe and reactions no longer inherit stale overalls', () => {
  const arsenal = arsenalTeam();
  assert.equal(new Set(arsenal.squad.map(player => player.id)).size, 18);
  assert.equal(new Set(arsenal.squad.map(player => player.number)).size, 18);
  for (const player of arsenal.squad) {
    assert.ok(Object.hasOwn(player.attrs, 'reactions'), `${player.id}.reactions`);
    for (const [key, value] of Object.entries(player.attrs)) {
      assert.ok(Number.isInteger(value) && value >= 1 && value <= 99, `${player.id}.${key}`);
    }
  }
  assert.notEqual(arsenal.squad.find(player => player.id === 'ars-clichy').attrs.reactions,
    arsenal.squad.find(player => player.id === 'ars-clichy').overall);
});
