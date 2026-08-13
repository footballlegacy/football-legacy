import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const appSource = read('quick-play/app.js');
const htmlSource = read('quick-play/index.html');
const stylesSource = read('quick-play/styles.css');
const historicSource = read('quick-play/historic-playtest-squads.js');
const contractStart = appSource.indexOf('// QUICK_PLAY_ENGINE_CONTRACT_BEGIN');
const contractEnd = appSource.indexOf('// QUICK_PLAY_ENGINE_CONTRACT_END');
const codecStart = appSource.indexOf('function encodeMatchPayload(value)');
const codecEnd = appSource.indexOf('const FORMATIONS=');

assert.ok(contractStart >= 0 && contractEnd > contractStart, 'Quick Play engine contract markers must exist');
assert.ok(codecStart >= 0 && codecEnd > codecStart, 'Quick Play payload codec must remain extractable');

const context = vm.createContext({
  URLSearchParams,
  TextEncoder,
  btoa: value => Buffer.from(value, 'binary').toString('base64')
});
vm.runInContext(`
${appSource.slice(contractStart, contractEnd)}
${appSource.slice(codecStart, codecEnd)}
this.engineContract={
  version:QUICK_PLAY_ENGINE_VERSION,
  candidate:FL_V2_CANDIDATE,
  normalizeEngineRequest,
  resolveEngineSelection,
  launchEngineSelection,
  deterministicSimulationSeed,
  finalizeMatchPayload,
  applyEngineQueryMarkers,
  encodeMatchPayload
};`, context, { filename: 'quick-play-engine-contract.vm.js' });

const Engine = context.engineContract;
const plain = value => JSON.parse(JSON.stringify(value));
const decodePayload = value => {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
};
const sampleTeam = (id, side) => ({
  id,
  formation: side === 'home' ? '4-3-3' : '4-4-2',
  tactics: { mentality: 'balanced', support: side === 'home' ? 'forward' : 'balanced' },
  selectedKit: side === 'home' ? 'home' : 'away',
  lineup: Array.from({ length: 11 }, (_, index) => ({ id: `${id}-xi-${index + 1}` })),
  bench: Array.from({ length: 7 }, (_, index) => ({ id: `${id}-sub-${index + 1}` }))
});
const samplePayload = (matchType = 'single-player', createdAt = '2026-08-12T12:00:00.000Z') => ({
  schemaVersion: 4,
  mode: 'quickPlay',
  season: '2026/27',
  year: 2026,
  matchType,
  practiceMode: matchType === 'free-kick-suite' ? 'free-kick' : null,
  online: matchType === 'online' ? { protocol: 'football-legacy-online-v1', roomCode: 'TEST1' } : null,
  homeTeam: sampleTeam('madrid-real-2013-14', 'home'),
  awayTeam: sampleTeam('woolwich-arsenal', 'away'),
  controllers: matchType === 'online'
    ? { player1Team: 'home', player2Team: 'away', aiTeam: null, online: true }
    : matchType === 'spectator'
      ? { player1Team: null, player2Team: null, aiTeam: 'both' }
      : { player1Team: 'home', player2Team: null, aiTeam: 'away' },
  settings: {
    stadium: { id: 'north-london', source: 'built-in', theme: 'north-london', capacity: 38000 },
    matchTime: 'night', weather: 'clear', matchLengthMinutes: 4,
    difficulty: 'ultimate', camera: 'broadcast', volume: 70
  },
  createdAt
});

test('Build 173 is the default request and effective engine', () => {
  assert.equal(Engine.version, '1.0.0-offline-live-authority-playtest');
  assert.equal(Engine.candidate, '3');
  assert.equal(Engine.normalizeEngineRequest(null), 'build-173');
  assert.equal(Engine.normalizeEngineRequest('unknown-engine'), 'build-173');
  const payload = plain(Engine.finalizeMatchPayload(samplePayload(), 'build-173', false));
  assert.deepEqual(payload.engine, {
    requested: 'build-173', effective: 'build-173',
    version: '1.0.0-offline-live-authority-playtest', fallbackReason: null
  });
  assert.ok(Number.isInteger(payload.simulationSeed) && payload.simulationSeed > 0);
  const spectator = plain(Engine.finalizeMatchPayload(samplePayload('spectator'), 'build-173', false));
  assert.equal(spectator.engine.requested, 'build-173');
  assert.equal(spectator.engine.effective, 'build-173');
  assert.equal(spectator.engine.fallbackReason, null);
  assert.match(htmlSource, /<option value="build-173" selected>Build 173 · Stable<\/option>/);
});

test('Quick Play defaults to the readable six-minute match clock while retaining every duration choice', () => {
  assert.match(htmlSource, /<option value="4">4 minutes<\/option><option value="6" selected>6 minutes<\/option>/);
  assert.match(appSource, /matchLength:Number\(query\.get\('matchMinutes'\)\)\|\|6/);
  for (const minutes of [3, 4, 6, 8, 10]) {
    assert.match(htmlSource, new RegExp(`<option value="${minutes}"`));
  }
});

test('explicit strict FL V2 promotion covers offline Single Player, CPU vs CPU and Set-Piece Suite', () => {
  const payload = plain(Engine.finalizeMatchPayload(samplePayload('single-player'), 'fl-v2', false));
  assert.deepEqual(payload.engine, {
    requested: 'fl-v2', effective: 'fl-v2',
    version: '1.0.0-offline-live-authority-playtest', fallbackReason: null
  });
  const markers = Engine.applyEngineQueryMarkers(new URLSearchParams('quickPlay=1'), payload.engine, payload.simulationSeed);
  assert.equal(markers.get('engine'), 'fl-v2');
  assert.equal(markers.get('candidate'), '3');
  assert.equal(markers.get('simulationSeed'), String(payload.simulationSeed));
  assert.match(htmlSource, /FL V2 · Strict Offline Playtest/);
  assert.match(appSource, /FL V2 active · Strict Single Player/);
  const suite = plain(Engine.finalizeMatchPayload(samplePayload('free-kick-suite'), 'fl-v2', false));
  assert.equal(suite.engine.requested, 'fl-v2');
  assert.equal(suite.engine.effective, 'fl-v2');
  assert.equal(suite.engine.fallbackReason, null);
  const suiteMarkers = Engine.applyEngineQueryMarkers(new URLSearchParams('quickPlay=1'), suite.engine, suite.simulationSeed);
  assert.equal(suiteMarkers.get('engine'), 'fl-v2');
  assert.equal(suiteMarkers.get('candidate'), '3');
  assert.match(appSource, /FL V2 active · Strict Set-Piece Suite/);
  const spectator = plain(Engine.finalizeMatchPayload(samplePayload('spectator'), 'fl-v2', false));
  assert.equal(spectator.engine.requested, 'fl-v2');
  assert.equal(spectator.engine.effective, 'fl-v2');
  assert.equal(spectator.engine.fallbackReason, null);
  assert.deepEqual(spectator.controllers, { player1Team: null, player2Team: null, aiTeam: 'both' });
  const spectatorMarkers = Engine.applyEngineQueryMarkers(new URLSearchParams('quickPlay=1'), spectator.engine, spectator.simulationSeed);
  assert.equal(spectatorMarkers.get('engine'), 'fl-v2');
  assert.equal(spectatorMarkers.get('candidate'), '3');
  assert.match(appSource, /FL V2 active · Strict CPU vs CPU/);
  assert.match(appSource, /if\(data\.matchType==='spectator'\)params\.set\('autoplay','1'\)/);
});

test('mode switches retain the setup preference but launch a clean Build 173 envelope', () => {
  const requested = 'fl-v2';
  for (const mode of ['co-op', 'home-co-op']) {
    const setupSelection = plain(Engine.resolveEngineSelection(requested, mode, false));
    assert.equal(setupSelection.requested, 'fl-v2', `${mode} setup preference`);
    assert.equal(setupSelection.effective, 'build-173', `${mode} setup effective engine`);
    assert.equal(setupSelection.fallbackReason, `unsupported-offline-mode:${mode}`);
    const fallback = plain(Engine.finalizeMatchPayload(samplePayload(mode), requested, false));
    assert.deepEqual(fallback.engine, {
      requested: 'build-173', effective: 'build-173',
      version: '1.0.0-offline-live-authority-playtest', fallbackReason: null
    }, `${mode} launch envelope must not arm strict V2 preflight`);
    const markers = Engine.applyEngineQueryMarkers(new URLSearchParams('engine=fl-v2'), fallback.engine, fallback.simulationSeed);
    assert.equal(markers.has('engine'), false, `${mode} must not emit a live V2 marker`);
    assert.equal(markers.has('candidate'), false, `${mode} must not retain a V2 cache marker`);
  }
  const restored = plain(Engine.finalizeMatchPayload(samplePayload('single-player'), requested, false));
  assert.equal(restored.engine.requested, 'fl-v2');
  assert.equal(restored.engine.effective, 'fl-v2');
  assert.equal(restored.engine.fallbackReason, null);
  assert.match(appSource, /state\.engineRequested=normalizeEngineRequest\(elements\.gameplayEngine\.value\);state\.mode=/);
});

test('Online is frozen visibly and effectively to Build 173', () => {
  const setupSelection = plain(Engine.resolveEngineSelection('fl-v2', 'online', true));
  assert.deepEqual(setupSelection, {
    requested: 'fl-v2', effective: 'build-173',
    version: '1.0.0-offline-live-authority-playtest', fallbackReason: 'online-authority-frozen'
  });
  const payload = plain(Engine.finalizeMatchPayload(samplePayload('online'), 'fl-v2', true));
  assert.deepEqual(payload.engine, {
    requested: 'build-173', effective: 'build-173',
    version: '1.0.0-offline-live-authority-playtest', fallbackReason: null
  });
  const markers = Engine.applyEngineQueryMarkers(new URLSearchParams('engine=fl-v2'), payload.engine, payload.simulationSeed);
  assert.equal(markers.has('engine'), false);
  assert.equal(markers.has('candidate'), false);
  assert.equal(markers.get('simulationSeed'), String(payload.simulationSeed));
  assert.match(appSource, /setDisabled\(\[elements\.matchMode,elements\.gameplayEngine\],true\)/);
  assert.match(appSource, /Online is frozen to the proven engine/);
});

test('candidate marker is fixed by effective authority rather than trusted from an incoming URL', () => {
  const live = plain(Engine.finalizeMatchPayload(samplePayload('single-player'), 'fl-v2', false));
  const liveMarkers = Engine.applyEngineQueryMarkers(new URLSearchParams('candidate=2&candidate=999'), live.engine, live.simulationSeed);
  assert.deepEqual(liveMarkers.getAll('candidate'), ['3']);
  const stable = plain(Engine.finalizeMatchPayload(samplePayload('single-player'), 'build-173', false));
  const stableMarkers = Engine.applyEngineQueryMarkers(new URLSearchParams('candidate=3'), stable.engine, stable.simulationSeed);
  assert.equal(stableMarkers.has('candidate'), false);
});

test('simulation seed is deterministic and engine envelope survives URL-safe payload transport', () => {
  const first = plain(Engine.finalizeMatchPayload(samplePayload('single-player', '2026-08-12T12:00:00.000Z'), 'fl-v2', false));
  const replay = plain(Engine.finalizeMatchPayload(samplePayload('single-player', '2026-08-13T09:45:00.000Z'), 'fl-v2', false));
  assert.equal(first.simulationSeed, replay.simulationSeed, 'wall-clock metadata must not alter simulation seed');
  const changed = samplePayload('single-player');
  changed.homeTeam.lineup[10] = { id: 'rm-morata' };
  const changedPayload = plain(Engine.finalizeMatchPayload(changed, 'fl-v2', false));
  assert.notEqual(first.simulationSeed, changedPayload.simulationSeed, 'gameplay configuration must alter simulation seed');
  const decoded = decodePayload(Engine.encodeMatchPayload(first));
  assert.deepEqual(decoded.engine, first.engine);
  assert.equal(decoded.simulationSeed, first.simulationSeed);
  assert.equal(decoded.homeTeam.id, 'madrid-real-2013-14');
  assert.match(appSource, /config=\{mode:'quickPlay',[^\n]*engine:\{\.\.\.data\.engine\},simulationSeed:data\.simulationSeed/);
  assert.match(appSource, /applyEngineQueryMarkers\(params,data\.engine,data\.simulationSeed\)/);
});

test('every Quick Play mode, Madrid BBC identity and historic reaction defaults remain intact', () => {
  for (const value of ['single-player', 'free-kick-suite', 'co-op', 'home-co-op', 'spectator']) {
    assert.match(htmlSource, new RegExp(`<option value="${value}"`));
  }
  assert.match(appSource, /requestedMode==='online'/);
  assert.match(appSource, /\.\.\/match-engine\/match\.html\?/);
  assert.match(appSource, /\.\.\/online\//);
  assert.equal(createHash('sha256').update(historicSource).digest('hex'), '4aacd4a33083eee996beace57ba038caf6e5b5a580f1896a9b1d765240b879d5');
  assert.equal((historicSource.match(/reactions:overall/g) || []).length, 4,
    'goalkeeper, defender, midfielder and forward defaults must all expose reactions');
  assert.match(historicSource,
    /Object\.entries\(\{\.\.\.roleDefaults\(role,overall\),\.\.\.specific\}\)/,
    'historic defaults must remain overridable by a player-specific reactions rating');
  for (const identity of ['madrid-real-2013-14', 'Ancelotti Real Madrid BBC', 'rm-bale', 'rm-benzema', 'rm-ronaldo']) {
    assert.ok(historicSource.includes(identity), identity);
  }
});

test('Match Preview keeps the named-stadium strip visually separated', () => {
  assert.match(htmlSource, /class="stadium-preview" id="stadiumPreview"/);
  assert.match(htmlSource, /class="stadium-preview-copy"/);
  assert.match(stylesSource, /\.stadium-preview\s*\{/);
  assert.match(stylesSource, /\.stadium-preview-copy\s*\{/);
  assert.match(stylesSource, /\.stadium-preview-copy\s+span/);
  assert.match(stylesSource, /\.stadium-preview-copy\s+strong\s*\{/);
  assert.match(stylesSource, /display\s*:\s*grid/);
  assert.match(stylesSource, /justify-items\s*:\s*end/);
});
