import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const teamsSource = read('quick-play/teams.js');
const historicSource = read('quick-play/historic-playtest-squads.js');
const appSource = read('quick-play/app.js');
const plain = value => JSON.parse(JSON.stringify(value));

function quickPlayContext() {
  const context = vm.createContext({ console, localStorage: { getItem: () => '[]' } });
  context.window = context;
  vm.runInContext(teamsSource, context, { filename: 'quick-play/teams.js' });
  vm.runInContext(historicSource, context, { filename: 'quick-play/historic-playtest-squads.js' });
  return context;
}

const expectedLineup = ['che-courtois','che-azpilicueta','che-luiz','che-cahill','che-moses','che-kante','che-matic','che-alonso','che-pedro','che-costa','che-hazard'];
const expectedBench = ['che-begovic','che-terry','che-fabregas','che-willian','che-batshuayi','che-zouma','che-chalobah'];
const attrs = (pace,accel,control,pass,shoot,defend,awareness,reactions,strength,heading,jumping,balance,agility,technique,aggression,keeper) =>
  ({pace,accel,control,pass,shoot,defend,awareness,reactions,strength,heading,jumping,balance,agility,technique,aggression,keeper});
const expectedPlayers = new Map([
  ['che-courtois',[89,attrs(52,46,23,69,14,18,86,81,70,13,68,45,61,13,23,89)]],
  ['che-begovic',[82,attrs(58,52,24,73,12,11,79,78,80,12,38,41,53,16,42,82)]],
  ['che-azpilicueta',[85,attrs(79,78,79,80,46,88,87,86,73,76,76,73,75,69,80,8)]],
  ['che-luiz',[86,attrs(71,68,79,79,55,85,80,79,81,83,80,56,72,66,86,8)]],
  ['che-cahill',[84,attrs(63,62,63,65,56,85,84,85,80,86,82,51,62,58,84,8)]],
  ['che-moses',[79,attrs(83,84,80,73,70,72,68,76,80,69,66,83,80,84,45,8)]],
  ['che-kante',[87,attrs(80,82,79,84,65,89,91,87,77,54,79,90,83,77,90,7)]],
  ['che-matic',[83,attrs(66,62,78,83,64,83,85,82,89,77,71,53,56,72,83,7)]],
  ['che-alonso',[81,attrs(79,74,79,79,64,80,77,82,79,70,70,58,68,78,72,8)]],
  ['che-pedro',[84,attrs(80,84,87,83,81,32,84,84,56,55,67,82,84,84,56,6)]],
  ['che-costa',[86,attrs(75,74,83,67,88,39,88,86,91,83,64,52,58,77,93,6)]],
  ['che-hazard',[90,attrs(87,93,92,86,83,27,85,85,65,57,59,91,93,93,54,6)]],
  ['che-terry',[78,attrs(34,33,59,66,46,80,81,74,83,83,80,46,42,45,77,8)]],
  ['che-fabregas',[86,attrs(62,65,86,91,76,63,91,81,64,74,68,77,65,80,45,7)]],
  ['che-willian',[84,attrs(86,91,86,82,77,58,80,83,62,29,46,81,89,87,44,6)]],
  ['che-batshuayi',[80,attrs(80,77,77,64,83,26,83,79,82,73,81,78,78,76,61,6)]],
  ['che-zouma',[79,attrs(71,63,66,62,47,83,78,74,88,77,87,52,45,48,83,8)]],
  ['che-chalobah',[75,attrs(65,69,76,78,55,77,70,69,75,71,71,65,74,74,72,7)]]
]);

test('Conte Chelsea uses the dated FIFA 18 launch baseline while Arsenal keeps its separate historic calibration', () => {
  const context = quickPlayContext();
  const chelsea = context.FLQuickPlayTeams.getTeam('div1', 'west-london-blues');
  const arsenal = context.FLQuickPlayTeams.getTeam('div1', 'woolwich-arsenal');

  assert.deepEqual(plain(chelsea.ratings), { overall: 84, attack: 85, midfield: 85, defence: 82 });
  assert.equal(chelsea.rating, 84);
  assert.equal(chelsea.calibration.sourceDate, '2017-09-25');
  assert.match(chelsea.calibration.method, /FIFA 18 launch snapshot 180004/);
  assert.equal(arsenal.rating, 90);
  assert.deepEqual(plain(arsenal.ratings), { overall: 90, attack: 92, midfield: 91, defence: 89 });
  assert.equal(arsenal.squad.find(player => player.id === 'ars-henry').overall, 97);
  assert.equal(arsenal.squad.find(player => player.id === 'ars-vieira').overall, 94);
  assert.match(arsenal.calibration.method, /FIFA 05 post-Invincibles overall anchor/);
});

test('all 18 Chelsea players have exact explicit FIFA-mapped gameplay ratings', () => {
  const chelsea = quickPlayContext().FLQuickPlayTeams.getTeam('div1', 'west-london-blues');
  assert.equal(chelsea.squad.length, 18);
  assert.equal(new Set(chelsea.squad.map(player => player.id)).size, 18);
  assert.equal(new Set(chelsea.squad.map(player => player.number)).size, 18);

  for (const player of chelsea.squad) {
    const expected = expectedPlayers.get(player.id);
    assert.ok(expected, `unexpected Chelsea player ${player.id}`);
    assert.equal(player.overall, expected[0], `${player.id}.overall`);
    assert.deepEqual(plain(player.attrs), expected[1], `${player.id}.attrs`);
    assert.match(player.quickPlayProfile.calibration, /FIFA 18 launch snapshot 180004/);
    assert.match(player.quickPlayProfile.source, /25 September 2017/);
    for (const [key, value] of Object.entries(player.attrs)) {
      assert.ok(Number.isInteger(value) && value >= 1 && value <= 99, `${player.id}.${key}`);
    }
  }
});

test('the title-winning 3-4-3 XI and seven-player bench survive Quick Play payload transport', () => {
  const chelsea = quickPlayContext().FLQuickPlayTeams.getTeam('div1', 'west-london-blues');
  assert.deepEqual(Array.from(chelsea.preferredLineup), expectedLineup);
  assert.deepEqual(Array.from(chelsea.preferredBench), expectedBench);
  assert.deepEqual(new Set([...chelsea.preferredLineup, ...chelsea.preferredBench]), new Set(chelsea.squad.map(player => player.id)));

  const teamRecordLine = appSource.split('\n').find(line => line.startsWith('function teamRecord('));
  assert.ok(teamRecordLine, 'Quick Play team payload seam must remain extractable');
  const recordContext = vm.createContext({
    state: { management: { away: { formation: chelsea.formation, lineup: chelsea.preferredLineup, bench: chelsea.preferredBench, tactics: {} } } },
    recordsByIds: (team, ids) => ids.map(id => team.squad.find(player => player.id === id)).filter(Boolean),
    currentKit: (team, key) => team.kits[key]
  });
  vm.runInContext(`${teamRecordLine};this.makeRecord=teamRecord;`, recordContext);
  const record = plain(recordContext.makeRecord(chelsea, 'div1', 'away', 'away'));
  assert.deepEqual(record.lineup.map(player => player.id), expectedLineup);
  assert.deepEqual(record.bench.map(player => player.id), expectedBench);
  assert.deepEqual(record.rating, { overall: 84, attack: 85, midfield: 85, defence: 82 });
  assert.equal(record.calibration.sourceDate, '2017-09-25');
  assert.equal(record.lineup.find(player => player.id === 'che-hazard').overall, 90);
  assert.equal(record.lineup.find(player => player.id === 'che-kante').attrs.reactions, 87);
});
