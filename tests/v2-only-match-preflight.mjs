import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const match = fs.readFileSync(path.join(root, 'match-engine/match.html'), 'utf8');
const sourceMatch = match.match(/<script id="offlineLiveV2Preflight">\s*([\s\S]*?)<\/script>/);
assert.ok(sourceMatch, 'offline FL V2 preflight script is present');
const preflightSource = sourceMatch[1];

const ENGINE = Object.freeze({
  requested: 'fl-v2',
  effective: 'fl-v2',
  version: '1.0.0-offline-live-authority-playtest',
  fallbackReason: null,
});

function canonicalPayload(matchType = 'single-player') {
  const cpu = matchType === 'spectator';
  return {
    mode: 'quickPlay',
    matchType,
    practiceMode: matchType === 'free-kick-suite' ? 'free-kick' : null,
    online: null,
    engine: { ...ENGINE },
    simulationSeed: 1772652239,
    homeTeam: { id: 'arsenal-0304', name: 'Arsenal 03/04' },
    awayTeam: { id: 'chelsea-1617', name: 'Chelsea 16/17' },
    controllers: cpu
      ? { player1Team: null, player2Team: null, aiTeam: 'both' }
      : { player1Team: 'home', player2Team: null, aiTeam: 'away' },
  };
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function canonicalSearch(matchType = 'single-player') {
  const params = new URLSearchParams({
    quickPlay: '1',
    engine: 'fl-v2',
    candidate: '4',
    simulationSeed: '1772652239',
  });
  if (matchType === 'spectator') params.set('autoplay', '1');
  if (matchType === 'free-kick-suite') params.set('practice', 'free-kick');
  return `?${params}`;
}

function runPreflight({ payload = null, search = '', hash = null } = {}) {
  const writes = [];
  const encodedHash = hash === null
    ? payload === null ? '' : `#flMatch=${encodePayload(payload)}`
    : hash;
  const sandbox = {
    location: { search, hash: encodedHash },
    window: {},
    document: { write(value) { writes.push(String(value)); } },
    URLSearchParams,
    Uint8Array,
    TextDecoder,
    atob(value) { return Buffer.from(String(value), 'base64').toString('binary'); },
  };
  vm.runInNewContext(preflightSource, sandbox, { filename: 'offlineLiveV2Preflight.js' });
  return { preflight: sandbox.window.__FL_V2_LIVE_PREFLIGHT, writes };
}

for (const [matchType, workflow] of [
  ['single-player', 'single-player'],
  ['free-kick-suite', 'set-piece-suite'],
  ['spectator', 'cpu-v-cpu'],
]) {
  test(`the exact ${matchType} V2 envelope arms ${workflow}`, () => {
    const result = runPreflight({
      payload: canonicalPayload(matchType),
      search: canonicalSearch(matchType),
    });
    assert.equal(result.preflight.requested, true);
    assert.equal(result.preflight.eligible, true);
    assert.equal(result.preflight.workflow, workflow);
    assert.equal(result.preflight.simulationSeed, 1772652239);
    assert.deepEqual([...result.preflight.urlMarkers], []);
    assert.ok(result.writes.length > 0, 'V2 modules load only after exact eligibility');
    assert.ok(result.writes.every(row => row.includes('174-fl-v2-final-candidate-4')));
  });
}

const rejectedCases = [
  ['raw direct match URL', { payload: null, search: '' }, 'not-requested'],
  ['missing engine query', { payload: canonicalPayload(), search: canonicalSearch().replace('&engine=fl-v2', '') }, 'engine-query-marker-missing'],
  ['legacy payload and query', { payload: { ...canonicalPayload(), engine: { requested: 'build-173', effective: 'build-173', version: '0.173', fallbackReason: null } }, search: canonicalSearch().replace('engine=fl-v2', 'engine=build-173') }, 'engine-query-marker-invalid'],
  ['missing candidate', { payload: canonicalPayload(), search: canonicalSearch().replace('&candidate=4', '') }, 'candidate-query-marker-missing'],
  ['stale candidate', { payload: canonicalPayload(), search: canonicalSearch().replace('candidate=4', 'candidate=3') }, 'candidate-query-marker-invalid'],
  ['duplicate candidate', { payload: canonicalPayload(), search: `${canonicalSearch()}&candidate=4` }, 'duplicate-candidate-marker'],
  ['missing Quick Play marker', { payload: canonicalPayload(), search: canonicalSearch().replace('quickPlay=1&', '') }, 'quick-play-query-marker-missing'],
  ['malformed payload', { search: canonicalSearch(), hash: '#flMatch=this-is-not-json' }, 'payload-invalid'],
  ['missing home team', { payload: { ...canonicalPayload(), homeTeam: null }, search: canonicalSearch() }, 'payload-home-team-missing'],
  ['missing away team', { payload: { ...canonicalPayload(), awayTeam: null }, search: canonicalSearch() }, 'payload-away-team-missing'],
  ['empty home team', { payload: { ...canonicalPayload(), homeTeam: {} }, search: canonicalSearch() }, 'payload-home-team-missing'],
  ['wrong payload mode', { payload: { ...canonicalPayload(), mode: 'quick-play' }, search: canonicalSearch() }, 'payload-mode-invalid'],
  ['unsupported co-op workflow', { payload: { ...canonicalPayload(), matchType: 'co-op', controllers: { player1Team: 'home', player2Team: 'away', aiTeam: null } }, search: canonicalSearch() }, 'unsupported-workflow'],
  ['single-player autoplay marker', { payload: canonicalPayload(), search: `${canonicalSearch()}&autoplay=1` }, 'single-player-autoplay-marker-present'],
  ['single-player practice payload', { payload: { ...canonicalPayload(), practiceMode: 'free-kick' }, search: canonicalSearch() }, 'single-player-practice-payload-invalid'],
  ['single-player cooperative controller field', { payload: { ...canonicalPayload(), controllers: { ...canonicalPayload().controllers, cooperative: false } }, search: canonicalSearch() }, 'single-player-control-ownership-invalid'],
  ['set-piece suite missing query practice', { payload: canonicalPayload('free-kick-suite'), search: canonicalSearch('free-kick-suite').replace('&practice=free-kick', '') }, 'set-piece-practice-marker-invalid'],
  ['set-piece suite wrong payload practice', { payload: { ...canonicalPayload('free-kick-suite'), practiceMode: null }, search: canonicalSearch('free-kick-suite') }, 'set-piece-practice-payload-invalid'],
  ['spectator missing autoplay', { payload: canonicalPayload('spectator'), search: canonicalSearch('spectator').replace('&autoplay=1', '') }, 'cpu-v-cpu-autoplay-marker-invalid'],
  ['spectator human ownership', { payload: { ...canonicalPayload('spectator'), controllers: canonicalPayload().controllers }, search: canonicalSearch('spectator') }, 'cpu-v-cpu-control-ownership-invalid'],
  ['online payload', { payload: { ...canonicalPayload(), online: { roomCode: 'ABCDE' } }, search: canonicalSearch() }, 'decoded-online'],
  ['online URL marker', { payload: canonicalPayload(), search: `${canonicalSearch()}&onlineRole=host` }, 'onlineRole'],
  ['shadow diagnostic marker', { payload: canonicalPayload(), search: `${canonicalSearch()}&v2Shadow=1` }, 'shadow-marker-conflict'],
];

for (const [name, input, expectedMarker] of rejectedCases) {
  test(`${name} is frozen and cannot load a gameplay bundle`, () => {
    const result = runPreflight(input);
    assert.equal(result.preflight.eligible, false);
    assert.equal(result.preflight.workflow, null);
    assert.equal(result.preflight.simulationSeed, null);
    assert.equal(result.writes.length, 0);
    if (expectedMarker === 'not-requested') assert.equal(result.preflight.reason, 'not-requested');
    else assert.ok([...result.preflight.urlMarkers].includes(expectedMarker), `${expectedMarker} diagnostic is present`);
  });
}

test('every ineligible preflight, including requested=false, enters strict stop before the loop', () => {
  const attachAt = match.indexOf('(function attachOfflineLiveV2(){');
  const loopAt = match.lastIndexOf('requestAnimationFrame(loop)');
  assert.ok(attachAt >= 0 && loopAt > attachAt);
  const attach = match.slice(attachAt, match.indexOf('const BOX_D=', attachAt));
  assert.match(attach, /if\(!LIVE_V2_PREFLIGHT\.requested\)\{liveV2Stop\('FL V2 is required:/);
  assert.match(attach, /if\(LIVE_V2_PREFLIGHT\.eligible!==true\)\{liveV2Stop\('FL V2 preflight rejected:/);
  assert.doesNotMatch(attach, /if\(!LIVE_V2_PREFLIGHT\.requested\)return/);
});
