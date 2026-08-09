import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const careerRoot = path.join(root, 'career-mode');

function storageStub() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key), clear: () => values.clear() };
}

function runtimeContext() {
  const elements = new Map();
  const elementStub = () => ({ style: { setProperty() {} }, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild() {}, addEventListener() {}, remove() {}, setAttribute() {}, removeAttribute() {}, click() {}, focus() {}, querySelector: () => null, querySelectorAll: () => [], getContext: () => null, textContent: '', innerHTML: '', className: '', value: '', hidden: false, disabled: false });
  const document = {
    body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, dataset: {}, appendChild() {} },
    head: { appendChild() {} },
    documentElement: { style: { setProperty() {} } },
    createElement: tag => ({ ...elementStub(), tagName: String(tag).toUpperCase() }),
    getElementById: id => { if (!elements.has(id)) elements.set(id, elementStub()); return elements.get(id); }, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
  const context = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Promise, Map, Set, URL, URLSearchParams, TextEncoder, TextDecoder, performance, document, navigator: { userAgent: 'Created club test' }, location: { href: '', search: '' }, localStorage: storageStub(), sessionStorage: storageStub(), addEventListener() {}, removeEventListener() {}, confirm: () => true, alert() {} });
  context.window = context;
  context.globalThis = context;
  const html = fs.readFileSync(path.join(careerRoot, 'game.html'), 'utf8');
  const sources = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split('?')[0]).filter(source => source.startsWith('js/'));
  const last = sources.indexOf('js/grassroots-career.js');
  for (const source of sources.slice(0, last + 1).filter(source => !source.endsWith('save.js'))) {
    const filename = path.join(careerRoot, source);
    vm.runInContext(fs.readFileSync(filename, 'utf8'), context, { filename, timeout: 10_000 });
  }
  const uiFile = path.join(careerRoot, 'js/ui.js');
  vm.runInContext(fs.readFileSync(uiFile, 'utf8'), context, { filename: uiFile, timeout: 10_000 });
  context.__elements = elements;
  return context;
}

function createdClub(tier) {
  const positions = ['GK','GK','CB','CB','CB','CB','FB','FB','DM','CM','CM','CM','AM','W','W','ST','ST','ST','CM','CB'];
  const players = positions.map((position, index) => ({ id: `test-player-${tier}-${index}`, source: 'generated', name: `Tier ${tier} Player ${index + 1}`, firstName: 'Tier', lastName: `${tier}-${index + 1}`, age: 18 + index % 14, nationality: 'England', primaryPosition: position, overall: Math.max(24, 84 - tier * 4 + index % 5) }));
  return {
    id: `created-club-tier-${tier}`, name: `Test Tier ${tier} FC`, shortName: 'Test', abbreviation: `T${tier}`, founded: 2026, startingTier: tier,
    location: { city: 'Henley-on-Thames', county: 'Oxfordshire', country: 'England' }, colours: { primary: '#7b1d2a', secondary: '#eeeade' }, stadiumId: 'auto-club-ground',
    squad: { playerIds: players.map(player => player.id), players, startingXI: players.slice(0, 11).map(player => player.id), substitutes: players.slice(11, 18).map(player => player.id) }, teamSetup: { formation: '442' }
  };
}

test('Create-a-Club form owns grassroots and professional entry rules', () => {
  const html = fs.readFileSync(path.join(root, 'create-club/index.html'), 'utf8');
  assert.match(html, /id="startingTier"[^>]*min="1"[^>]*max="15"/);
  assert.match(html, /Generated Tier Squad/);
  assert.match(html, /Created Custom Players/);
  assert.match(html, /Real-Profile Player Pool/);
  assert.match(html, /original-names\.js/);
  assert.match(html, /legendArchetype/);
  assert.match(html, /start-created-club\.html/);
  assert.doesNotMatch(html, /career-route\.html/);
});

test('created club careers build playable grassroots and professional saves', { timeout: 120_000 }, async () => {
  const context = runtimeContext();
  const manager = { firstName: 'Career', lastName: 'Tester', age: 38, nationality: 'English', birthplace: 'England', managementStyle: 'Balanced', temperament: 'Measured', occupation: 'Full-time Football Manager' };
  const base = await context.FLGame.createStartYear(manager, context.FLGrassroots.placeholderId('home-counties'), 2026);

  const grassroots = JSON.parse(JSON.stringify(base));
  context.FLGrassroots.applyCreatedClub(grassroots, createdClub(15), [], null, 'home-counties');
  const grassrootsClub = context.FLGame.controlledClub(grassroots);
  assert.equal(grassroots.meta.careerRoute, 'create-club');
  assert.equal(grassroots.meta.grassroots, true);
  assert.equal(grassrootsClub.tier, 15);
  assert.equal(grassrootsClub.players.length, 20);
  assert.ok(grassrootsClub.players.every(player => player.partTime));
  assert.equal(grassroots.finances.transferBudget, 0);
  assert.equal(context.FLGrassroots.useLocalRecruitment(grassroots), true);
  assert.ok(grassroots.fixtures.some(fixture => fixture.home === grassrootsClub.id || fixture.away === grassrootsClub.id));
  assert.doesNotThrow(() => context.FLUI.render(grassroots));
  assert.match(context.__elements.get('mainPanel').innerHTML, /Test Tier 15 FC/);
  for (const tab of ['inbox', 'team', 'squad', 'transfers', 'club', 'board', 'competitions', 'history', 'search', 'manager', 'settings']) {
    grassroots.selectedTab = tab;
    assert.doesNotThrow(() => context.FLUI.render(grassroots), `${tab} menu should render`);
    assert.ok(context.__elements.get('mainPanel').innerHTML.length > 20, `${tab} menu should contain a view`);
  }

  const professional = JSON.parse(JSON.stringify(base));
  const professionalSetup = createdClub(2);
  const realPlayer = { id: 'real_french-explosive-wide-striker', source: 'real', legendArchetype: 'french-explosive-wide-striker', name: 'Kylian Mbappé', firstName: 'Kylian', lastName: 'Mbappé', age: 28, nationality: 'French', primaryPosition: 'W', overall: 91 };
  professionalSetup.squad.playerIds.push(realPlayer.id);
  professionalSetup.squad.players.push(realPlayer);
  context.FLGrassroots.applyCreatedClub(professional, professionalSetup, [], null, 'home-counties');
  const professionalClub = context.FLGame.controlledClub(professional);
  assert.equal(professional.meta.grassroots, false);
  assert.equal(professionalClub.tier, 2);
  assert.equal(professionalClub.players.length, 21);
  assert.ok(professionalClub.players.every(player => player.partTime === false && player.contractType === 'Professional'));
  assert.equal(professionalClub.players.filter(player => player.legendArchetype === realPlayer.legendArchetype).length, 1);
  const allEnglishCopies = professional.clubs.flatMap(club => club.players || []).filter(player => player.legendArchetype === realPlayer.legendArchetype);
  const allWorldCopies = context.FLWorldFootball.players(professional).filter(found => found.p.legendArchetype === realPlayer.legendArchetype);
  assert.equal(allEnglishCopies.length + allWorldCopies.length, 1);
  assert.ok(professional.finances.transferBudget > 0);
  assert.equal(context.FLGrassroots.useLocalRecruitment(professional), false);
  assert.ok(professional.fixtures.some(fixture => fixture.home === professionalClub.id || fixture.away === professionalClub.id));
  assert.doesNotThrow(() => context.FLUI.render(professional));
  assert.match(context.__elements.get('mainPanel').innerHTML, /Test Tier 2 FC/);
});
