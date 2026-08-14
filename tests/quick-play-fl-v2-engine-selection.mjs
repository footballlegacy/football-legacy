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
  playableModes:[...FL_V2_PLAYABLE_MODES],
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
  online: null,
  homeTeam: sampleTeam('madrid-real-2013-14', 'home'),
  awayTeam: sampleTeam('woolwich-arsenal', 'away'),
  controllers: matchType === 'spectator'
    ? { player1Team: null, player2Team: null, aiTeam: 'both' }
    : { player1Team: 'home', player2Team: null, aiTeam: 'away' },
  settings: {
    stadium: { id: 'north-london', source: 'built-in', theme: 'north-london', capacity: 38000 },
    matchTime: 'night', weather: 'clear', matchLengthMinutes: 4,
    difficulty: 'ultimate', camera: 'broadcast', volume: 70
  },
  createdAt
});

test('FL V2 Candidate 5 is the fixed sole playable engine', () => {
  assert.equal(Engine.version, '1.0.0-offline-live-authority-playtest');
  assert.equal(Engine.candidate, '5');
  assert.deepEqual(plain(Engine.playableModes), ['single-player', 'free-kick-suite', 'spectator']);
  for (const incoming of [null, '', 'unknown-engine', 'build-173', 'fl-v2']) {
    assert.equal(Engine.normalizeEngineRequest(incoming), 'fl-v2');
  }
  assert.doesNotMatch(appSource, /BUILD_173_ENGINE|Build 173 active|Build 173 selected/);
  assert.doesNotMatch(htmlSource, /value=["']build-173["']/);
  assert.match(htmlSource, /id="gameplayEngine"[^>]*value="fl-v2"/);
});

test('Single Player, CPU vs CPU and Set-Piece Suite all launch exact FL V2 envelopes', () => {
  for (const mode of Engine.playableModes) {
    for (const incoming of [null, 'build-173', 'unknown-engine', 'fl-v2']) {
      const payload = plain(Engine.finalizeMatchPayload(samplePayload(mode), incoming, false));
      assert.deepEqual(payload.engine, {
        requested: 'fl-v2', effective: 'fl-v2',
        version: '1.0.0-offline-live-authority-playtest', fallbackReason: null
      }, `${mode}/${incoming}`);
      assert.ok(Number.isInteger(payload.simulationSeed) && payload.simulationSeed > 0);
      const markers = Engine.applyEngineQueryMarkers(
        new URLSearchParams('engine=build-173&candidate=2&candidate=999'),
        payload.engine,
        payload.simulationSeed
      );
      assert.deepEqual(markers.getAll('engine'), ['fl-v2']);
      assert.deepEqual(markers.getAll('candidate'), ['5']);
      assert.equal(markers.get('simulationSeed'), String(payload.simulationSeed));
    }
  }
  assert.match(appSource, /if\(data\.matchType==='spectator'\)params\.set\('autoplay','1'\)/);
});

test('Co-op, same-team Co-op and Online are unavailable and cannot materialise a match', () => {
  for (const mode of ['co-op', 'home-co-op']) {
    const selection = plain(Engine.resolveEngineSelection('fl-v2', mode, false));
    assert.equal(selection.requested, 'fl-v2');
    assert.equal(selection.effective, 'unavailable');
    assert.equal(selection.fallbackReason, `v2-only-unsupported-mode:${mode}`);
    assert.throws(() => Engine.finalizeMatchPayload(samplePayload(mode), 'fl-v2', false), /v2-only-unsupported-mode/);
  }
  const online = plain(Engine.resolveEngineSelection('fl-v2', 'online', true));
  assert.equal(online.effective, 'unavailable');
  assert.equal(online.fallbackReason, 'v2-only-online-unavailable');
  assert.throws(() => Engine.finalizeMatchPayload(samplePayload('online'), 'fl-v2', true), /v2-only-online-unavailable/);
  const unavailableMarkers = Engine.applyEngineQueryMarkers(
    new URLSearchParams('engine=build-173&candidate=3'),
    online,
    123
  );
  assert.equal(unavailableMarkers.has('engine'), false);
  assert.equal(unavailableMarkers.has('candidate'), false);
  assert.match(appSource, /Only FL V2 matches may launch/);
  assert.match(appSource, /This mode will return when its V2 authority is complete/);
});

test('simulation seed is deterministic and the exact engine envelope survives URL-safe transport', () => {
  const first = plain(Engine.finalizeMatchPayload(samplePayload('single-player', '2026-08-12T12:00:00.000Z'), null, false));
  const replay = plain(Engine.finalizeMatchPayload(samplePayload('single-player', '2026-08-13T09:45:00.000Z'), 'build-173', false));
  assert.equal(first.simulationSeed, replay.simulationSeed, 'wall-clock and obsolete incoming engine markers must not alter the seed');
  const changed = samplePayload('single-player');
  changed.homeTeam.lineup[10] = { id: 'rm-morata' };
  const changedPayload = plain(Engine.finalizeMatchPayload(changed, 'fl-v2', false));
  assert.notEqual(first.simulationSeed, changedPayload.simulationSeed);
  const decoded = decodePayload(Engine.encodeMatchPayload(first));
  assert.deepEqual(decoded.engine, first.engine);
  assert.equal(decoded.simulationSeed, first.simulationSeed);
  assert.match(appSource, /config=\{mode:'quickPlay',[^\n]*engine:\{\.\.\.data\.engine\},simulationSeed:data\.simulationSeed/);
});

test('Quick Play keeps the six-minute default and all existing duration choices', () => {
  assert.match(htmlSource, /<option value="4">4 minutes<\/option><option value="6" selected>6 minutes<\/option>/);
  assert.match(appSource, /matchLength:Number\(query\.get\('matchMinutes'\)\)\|\|6/);
  for (const minutes of [3, 4, 6, 8, 10]) assert.match(htmlSource, new RegExp(`<option value="${minutes}"`));
});

test('historic squads and Match Preview presentation remain intact', () => {
  assert.equal(createHash('sha256').update(historicSource).digest('hex'), '4aacd4a33083eee996beace57ba038caf6e5b5a580f1896a9b1d765240b879d5');
  assert.equal((historicSource.match(/reactions:overall/g) || []).length, 4);
  for (const identity of ['madrid-real-2013-14', 'Ancelotti Real Madrid BBC', 'rm-bale', 'rm-benzema', 'rm-ronaldo']) {
    assert.ok(historicSource.includes(identity), identity);
  }
  assert.match(htmlSource, /class="stadium-preview" id="stadiumPreview"/);
  assert.match(stylesSource, /\.stadium-preview\s*\{/);
  assert.match(stylesSource, /\.stadium-preview-copy\s+strong\s*\{/);
});
