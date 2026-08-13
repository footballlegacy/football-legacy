import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const root = read('index.html');
const rootStyles = read('styles.css');
const quick = read('quick-play/index.html');
const quickApp = read('quick-play/app.js');
const online = read('online/index.html');
const retiredSetup = read('match-engine/index.html');
const match = read('match-engine/match.html');
const singleLauncher = read('START-PS5-SINGLE-PLAYER.command');
const twoPlayerLauncher = read('START-PS5-TWO-PLAYER.command');
const macMatchLauncher = read('match-engine/START-MATCH.command');
const windowsMatchLauncher = read('match-engine/START-MATCH.bat');
const matrix = JSON.parse(read('research/overhaul/protected-workflows.json'));

const publicMatchEntrypoints = [root, quick, online, retiredSetup, singleLauncher, twoPlayerLauncher, macMatchLauncher, windowsMatchLauncher];

test('no public entry point selects or launches the prior engine', () => {
  for (const source of publicMatchEntrypoints) {
    assert.doesNotMatch(source, /value=["']build-173["']|engine=build-173|match-engine\/match\.html\?|match\.html\?year=/);
  }
  assert.doesNotMatch(quickApp, /BUILD_173_ENGINE|effective:BUILD_173_ENGINE|Build 173 active|Build 173 selected/);
  assert.match(quickApp, /if\(selection\.effective!==FL_V2_ENGINE\)throw new Error/);
  assert.match(quickApp, /if\(!data\|\|data\.engine\?\.effective!==FL_V2_ENGINE\)throw new Error/);
});

test('only the three approved V2 workflows expose playable controls', () => {
  for (const mode of ['single-player', 'spectator', 'free-kick-suite']) {
    assert.match(root, new RegExp(`mode=${mode}(?:&amp;|&)engine=fl-v2(?:&amp;|&)candidate=4`));
    assert.match(quick, new RegExp(`<option value="${mode}">`));
  }
  assert.match(quick, /<option value="co-op" disabled>/);
  assert.match(quick, /<option value="home-co-op" disabled>/);
  assert.match(root, /Co-op · V2 migration pending/);
  assert.match(root, /Online Versus · V2 migration pending/);
  assert.match(rootStyles, /\.action-button:disabled/);
  assert.deepEqual(matrix.policy.v2PlayableWorkflows, ['single-player-quick-play', 'cpu-versus-cpu', 'set-piece-suite']);
  assert.deepEqual(matrix.policy.unavailableUntilV2Authority, ['local-two-player', 'home-co-op', 'online-versus']);
});

test('Online is a static unavailable notice with no playable transport', () => {
  assert.match(online, /V2 migration pending/);
  assert.match(online, /no legacy fallback/i);
  assert.doesNotMatch(online, /<script|peerjs|id="hostButton"|id="showJoinButton"|id="joinForm"|id="gameFrame"|Host Match|Join Match/);
});

test('old setup pages and launchers route through V2 Quick Play', () => {
  assert.match(retiredSetup, /http-equiv="refresh"[^>]+quick-play\/index\.html\?mode=single-player&amp;engine=fl-v2&amp;candidate=4/);
  assert.doesNotMatch(retiredSetup, /<form|instantResultBtn|match\.html\?/);
  for (const source of [singleLauncher, macMatchLauncher, windowsMatchLauncher]) {
    assert.match(source, /quick-play[\\/]index\.html\?mode=single-player(?:&|&)engine=fl-v2(?:&|&)candidate=4/);
  }
  assert.match(twoPlayerLauncher, /unavailable while its match authority is migrated to FL V2/);
  assert.match(twoPlayerLauncher, /quick-play\/index\.html\?mode=co-op&engine=fl-v2&candidate=4/);
});

test('raw, stale and rejected match routes enter strict V2 stop instead of gameplay', () => {
  assert.match(match, /if\(!LIVE_V2_PREFLIGHT\.requested\)\{liveV2Stop\('FL V2 is required:/);
  assert.match(match, /if\(LIVE_V2_PREFLIGHT\.eligible!==true\)\{liveV2Stop\('FL V2 preflight rejected:/);
  assert.match(match, /candidateValues\[0\]!=='4'/);
  assert.match(match, /payloadValues\.length!==1/);
  assert.match(match, /decoded\.mode!=='quickPlay'/);
  assert.match(match, /exactControllerKeys/);
  assert.match(match, /No previous engine is available/);
});
