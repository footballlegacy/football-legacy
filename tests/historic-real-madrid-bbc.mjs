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
const matchSource = read('match-engine/match.html');

function quickPlayContext() {
  const context = vm.createContext({ console, localStorage: { getItem: () => '[]' } });
  context.window = context;
  vm.runInContext(teamsSource, context, { filename: 'quick-play/teams.js' });
  vm.runInContext(historicSource, context, { filename: 'quick-play/historic-playtest-squads.js' });
  return context;
}

const expectedLineup = ['rm-casillas','rm-carvajal','rm-pepe','rm-ramos','rm-marcelo','rm-modric','rm-xabi-alonso','rm-di-maria','rm-bale','rm-benzema','rm-ronaldo'];
const expectedBench = ['rm-diego-lopez','rm-varane','rm-coentrao','rm-arbeloa','rm-khedira','rm-isco','rm-morata'];
const expectedRoster = new Map([
  ['Iker Casillas',['GK',1]],['Diego López',['GK',25]],['Dani Carvajal',['RB',15]],['Pepe',['CB',3]],
  ['Sergio Ramos',['CB',4]],['Marcelo',['LB',12]],['Raphaël Varane',['CB',2]],['Fábio Coentrão',['LB',5]],
  ['Álvaro Arbeloa',['RB',17]],['Luka Modrić',['CM',19]],['Xabi Alonso',['CDM',14]],['Ángel Di María',['CM',22]],
  ['Sami Khedira',['CM',6]],['Isco',['CAM',23]],['Gareth Bale',['RW',11]],['Karim Benzema',['ST',9]],
  ['Cristiano Ronaldo',['LW',7]],['Álvaro Morata',['ST',21]]
]);

test('2013/14 Ancelotti BBC squad is visible once with exact identity, roster and bounds', () => {
  const context = quickPlayContext();
  vm.runInContext(historicSource, context, { filename: 'historic-idempotence.js' });
  const rows = context.FLQuickPlayTeams.getLeagueTeams('div1').filter(team => team.id === 'madrid-real-2013-14');
  assert.equal(rows.length, 1);
  const team = rows[0];
  assert.equal(team.name, 'Ancelotti Real Madrid BBC');
  assert.equal(team.shortName, 'RMA 13/14');
  assert.equal(team.historicSeason, '2013/14');
  assert.equal(team.manager, 'Carlo Ancelotti');
  assert.equal(team.formation, '4-3-3');
  assert.equal(team.philosophyId, 'ancelotti-bbc-433');
  assert.equal(team.stadium, 'Santiago Bernabéu');
  assert.match(team.calibration.source, /custom playtest ratings, not official EA ratings/i);
  assert.deepEqual(Array.from(team.preferredLineup), expectedLineup);
  assert.deepEqual(Array.from(team.preferredBench), expectedBench);
  assert.equal(team.squad.length, 18);
  assert.equal(new Set(team.squad.map(player => player.id)).size, 18);
  assert.deepEqual(new Set([...team.preferredLineup, ...team.preferredBench]), new Set(team.squad.map(player => player.id)));
  for (const player of team.squad) {
    const expected = expectedRoster.get(player.name);
    assert.ok(expected, `unexpected player ${player.name}`);
    assert.deepEqual(Array.from(expected), [player.position, player.number]);
    assert.ok(player.overall >= 1 && player.overall <= 99, `${player.id} overall`);
    assert.equal(player.quickPlayProfile.season, '2013/14');
    assert.match(player.quickPlayProfile.source, /not official EA ratings/i);
    for (const [key, value] of Object.entries(player.attrs)) assert.ok(value >= 1 && value <= 99, `${player.id}.${key}`);
  }
  assert.equal(team.squad.find(player => player.id === 'rm-ronaldo').overall, 98);
  assert.equal(team.squad.find(player => player.id === 'rm-benzema').position, 'ST');
  assert.equal(team.squad.find(player => player.id === 'rm-bale').preferredFoot, 'Left');
});

test('preferred XI maps to the exact live 4-3-3 unit-role order and survives payload transport', () => {
  const context = quickPlayContext();
  const team = context.FLQuickPlayTeams.getTeam('div1', 'madrid-real-2013-14');
  assert.deepEqual(Array.from(team.formationSlots, slot => slot.unitRole), [
    'fullback-right','centre-back-right','centre-back-left','fullback-left','central-mid-right',
    'defensive-mid-centre','central-mid-left','winger-right','striker-centre','winger-left'
  ]);
  const teamRecordLine = appSource.split('\n').find(line => line.startsWith('function teamRecord('));
  assert.ok(teamRecordLine);
  const recordContext = vm.createContext({
    state: { management: { home: { formation: team.formation, lineup: team.preferredLineup, bench: team.preferredBench, tactics: team.tacticalDefaults } } },
    recordsByIds: (selectedTeam, ids) => ids.map(id => selectedTeam.squad.find(player => player.id === id)),
    currentKit: (selectedTeam, key) => selectedTeam.kits[key]
  });
  vm.runInContext(`${teamRecordLine};this.makeRecord=teamRecord;`, recordContext);
  const record = recordContext.makeRecord(team, 'div1', 'home', 'home');
  assert.equal(record.philosophyId, 'ancelotti-bbc-433');
  assert.equal(record.tactics.philosophyId, 'ancelotti-bbc-433');
  assert.equal(record.tactics.formationSlots.length, 10);
  assert.deepEqual(Array.from(record.lineup, player => player.id), expectedLineup);
  const encodeSource = appSource.match(/function encodeMatchPayload\(value\)\{[\s\S]*?\n\}/)?.[0];
  const decodeSource = matchSource.split('\n').find(line => line.includes('function decodeMatchPayload('));
  assert.ok(encodeSource && decodeSource);
  const codec = vm.createContext({
    TextEncoder, TextDecoder, Uint8Array,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary')
  });
  vm.runInContext(`${encodeSource};${decodeSource};this.encode=encodeMatchPayload;this.decode=decodeMatchPayload;`, codec);
  const payload = { mode: 'quickPlay', homeTeam: record, awayTeam: record };
  const decoded = codec.decode(codec.encode(payload));
  assert.equal(decoded.homeTeam.id, 'madrid-real-2013-14');
  assert.equal(decoded.homeTeam.lineup[8].name, 'Gareth Bale');
  assert.equal(decoded.homeTeam.lineup[9].name, 'Karim Benzema');
  assert.equal(decoded.homeTeam.lineup[10].name, 'Cristiano Ronaldo');
  assert.equal(decoded.homeTeam.tactics.formationSlots[8].unitRole, 'striker-centre');
});

test('Build 173 recognises Madrid before preserving the original Quick Play fallbacks', () => {
  const madridBranch = matchSource.indexOf("blob.includes('madrid-real-2013-14')");
  const fallback = matchSource.indexOf("if(QUICK_PLAY)return team==='you'?'woolwich':'wlb';");
  assert.ok(madridBranch > 0 && madridBranch < fallback);
  assert.equal(matchSource.split("if(QUICK_PLAY)return team==='you'?'woolwich':'wlb';").length - 1, 1);
  assert.match(matchSource, /madrid:\{id:'ancelotti-real-madrid-bbc-4-3-3'/);
  assert.match(matchSource, /style\.id==='ancelotti-real-madrid-bbc-4-3-3'/);
  assert.match(matchSource, /job='benzema-drop-and-link-bbc'/);
  assert.match(matchSource, /'ronaldo-left-channel-burst'/);
  assert.match(matchSource, /'bale-right-inside-burst'/);
  for (const id of [...expectedLineup, ...expectedBench]) assert.match(matchSource, new RegExp(`\\['${id.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}'`));
});

test('all existing Quick Play mode and launch routes remain present', () => {
  for (const mode of ['online','co-op','home-co-op','spectator','free-kick-suite','single-player']) assert.ok(appSource.includes(`'${mode}'`), mode);
  assert.match(appSource, /\.\.\/match-engine\/match\.html\?/);
  assert.match(appSource, /\.\.\/online\//);
  assert.match(read('quick-play/index.html'), /historic-playtest-squads\.js/);
});
