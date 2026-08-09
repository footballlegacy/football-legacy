import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(files) {
  const localStorage = {getItem(){return null;}, setItem(){}, removeItem(){}};
  const context = vm.createContext({console, Date, Math, JSON, localStorage});
  context.window = context;
  context.globalThis = context;
  for (const file of files) {
    const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    vm.runInContext(source, context, {filename:file});
  }
  return context;
}

test('every database club uses its original name and preserves its former display name', () => {
  const context = runtime(['career-mode/js/club-database.js', 'career-mode/js/original-names.js']);
  const rows = [...context.FLClubDatabase.english, ...context.FLClubDatabase.world];
  assert.equal(rows.length, 320);
  assert.ok(rows.every(row => row.name === row.reference));
  assert.ok(rows.every(row => typeof row.fictionalName === 'string' && row.fictionalName.length > 0));
});

test('all 92 quick-play clubs and all four English divisions use original names', () => {
  const context = runtime([
    'career-mode/js/club-database.js',
    'career-mode/js/original-names.js',
    'quick-play/teams.js',
    'quick-play/original-names.js'
  ]);
  const teams = Object.values(context.FLQuickPlayTeams.TEAMS).flat();
  assert.equal(teams.length, 92);
  assert.ok(teams.every(team => team.fictionalName && team.name !== team.fictionalName));
  assert.deepEqual(
    Array.from(context.FLQuickPlayTeams.LEAGUES.slice(0, 4), league => league.name),
    ['Premier League', 'EFL Championship', 'EFL League One', 'EFL League Two']
  );
  assert.equal(teams.find(team => team.id === 'woolwich-arsenal').name, 'Arsenal');
  assert.equal(teams.find(team => team.id === 'mersey-reds').name, 'Liverpool');
});

test('founder, timeline and overseas clubs restore from their embedded references', () => {
  const context = runtime([
    'career-mode/js/club-database.js',
    'career-mode/js/data.js',
    'career-mode/js/world-football-data.js',
    'career-mode/js/timeline-data.js',
    'career-mode/js/original-names.js'
  ]);
  assert.deepEqual(
    Array.from(context.FLData.clubs, club => club.name),
    ['Accrington', 'Aston Villa', 'Blackburn Rovers', 'Bolton Wanderers', 'Burnley', 'Derby County', 'Everton', 'Notts County', 'Preston North End', 'Stoke City', 'West Bromwich Albion', 'Wolverhampton Wanderers']
  );
  assert.equal(context.FLWorldFootballData.leagues.find(league => league.id === 'spain').clubs[0].name, 'Real Madrid');
  assert.equal(context.FLWorldFootballData.leagues.find(league => league.id === 'germany').clubs[0].name, 'Bayern Munich');
  assert.equal(context.FLTimelineData.clubSeeds.find(club => club.reference === 'Manchester United parallel').name, 'Manchester United');
  assert.equal(context.FLTimelineData.clubSeeds.find(club => club.reference === 'West Ham parallel').name, 'West Ham United');
});

test('league, cup and iconic-player restoration uses canonical names', () => {
  const context = runtime(['career-mode/js/club-database.js', 'career-mode/js/original-names.js']);
  const names = context.FLOriginalNames;
  assert.equal(names.renameString('Mersey Reds win the English Cup'), 'Liverpool win the FA Cup');
  assert.equal(names.renameString('European Champions League'), 'UEFA Champions League');
  assert.equal(names.renameString('Division 2 — Championship'), 'EFL Championship');
  assert.equal(names.legendNames['global-brazil-prodigy'], 'Pelé');
  assert.equal(names.legendNames['argentine-movement-genius'], 'Lionel Messi');
  assert.equal(names.legendNames['maradona-wave'], 'Diego Maradona');
  assert.equal(Object.keys(names.legendNames).length, 110);
  assert.equal(new Set(Object.values(names.legendNames)).size, 110);
});

test('old-save migration changes visible names but never technical IDs or gameplay data', () => {
  const context = runtime(['career-mode/js/club-database.js', 'career-mode/js/original-names.js']);
  const save = {
    mode: 'manager-career',
    clubId: 'mersey-reds',
    competitionId: 'english-cup',
    club: {id:'mersey-reds', name:'Mersey Reds', strength:88, finance:123456, points:67},
    history: [{title:'Mersey Reds win English Cup', type:'honour', season:2026}],
    player: {id:'legend-1', name:'Generated Name', legendArchetype:'global-brazil-prodigy', overall:96}
  };
  context.FLOriginalNames.restoreGame(save);
  assert.equal(save.club.name, 'Liverpool');
  assert.equal(save.history[0].title, 'Liverpool win FA Cup');
  assert.equal(save.player.name, 'Pelé');
  assert.equal(save.clubId, 'mersey-reds');
  assert.equal(save.competitionId, 'english-cup');
  assert.equal(save.mode, 'manager-career');
  assert.deepEqual(JSON.parse(JSON.stringify({strength:save.club.strength, finance:save.club.finance, points:save.club.points, overall:save.player.overall})), {strength:88, finance:123456, points:67, overall:96});
});
