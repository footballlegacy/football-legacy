import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const match = fs.readFileSync(path.join(root, 'match-engine/match.html'), 'utf8');
const quickPlay = fs.readFileSync(path.join(root, 'quick-play/app.js'), 'utf8');
const quickPlayPage = fs.readFileSync(path.join(root, 'quick-play/index.html'), 'utf8');

function sourceWindow(start, end, padding = 0) {
  const from = match.indexOf(start);
  assert.ok(from >= 0, `missing source marker: ${start}`);
  const to = match.indexOf(end, from + start.length);
  assert.ok(to > from, `missing end marker: ${end}`);
  return match.slice(Math.max(0, from - padding), to);
}

test('an FL V2 authority fault freezes the match without a playable prior-engine fallback', () => {
  const stop = sourceWindow('function liveV2RecordStrictStop()', 'function liveV2PlayerById');
  assert.match(stop, /liveV2StrictStopped=true/);
  assert.match(stop, /paused=true;clockRunning=false/);
  assert.match(stop, /liveV2ControlDisabled=true/);
  assert.match(stop, /liveV2Badge\('FL V2 stopped · Match halted',true/);
  assert.match(stop, /event\.type==='v2-authority-stop'/);
  assert.match(stop, /continuedAsBuild173:false/);
  assert.match(stop, /recordLiveV2Authority\('strict-playtest-stop'\)/);
  assert.doesNotMatch(stop, /Build 173 active|build-173-fallback|runtime-fallback/);
});

test('both control and gameplay failures take the same strict-stop path', () => {
  const gameplay = sourceWindow('function liveV2RunTick()', 'function liveV2QueueLaunch');
  const control = sourceWindow('function liveV2RunControlOnly()', 'function liveV2QueueSuiteEvent');
  assert.match(gameplay, /liveV2Stop\(status\.failure\|\|'candidate planning fault'\)/);
  assert.match(gameplay, /liveV2Stop\(error\)/);
  assert.match(control, /liveV2Stop\(error\)/);
  assert.doesNotMatch(match, /function liveV2Fallback|FL V2 fallback · Build 173 active/);
});

test('the host cannot execute a legacy tick after the V2 stop is raised', () => {
  const update = sourceWindow('function update(){', 'function showFlash');
  assert.match(update, /if\(!started\)return;\s*if\(liveV2StrictStopped\)return;/);
  assert.match(update, /const liveV2LiveTick=liveV2RunTick\(\);if\(liveV2StrictStopped\|\|liveV2PeriodTransitionApplied\)return;/);
  const canAdvance = sourceWindow('function liveV2CanAdvance()', 'function liveV2ObserveBoundary');
  assert.match(canAdvance, /if\(liveV2StrictStopped\|\|!liveV2Authority/);
});

test('rejected V2 preflight and the public manual stop never expose a Build 173 switch', () => {
  const attach = sourceWindow('(function attachOfflineLiveV2(){', 'const BOX_D=');
  assert.match(attach, /if\(!LIVE_V2_PREFLIGHT\.requested\)\{liveV2Stop\('FL V2 is required:/);
  assert.match(attach, /LIVE_V2_PREFLIGHT\.eligible!==true\)\{liveV2Stop\('FL V2 preflight rejected:/);
  assert.match(attach, /stop:\(\)=>liveV2Stop\('manual FL V2 strict stop'\)/);
  assert.doesNotMatch(attach, /disable:\(\)=>|manual one-switch rollback|Build 173 active/);
});

test('a blocking diagnostic screen provides export, V2 restart and exit only', () => {
  assert.match(match, /id="v2StrictFailurePage"[^>]*role="alertdialog"[^>]*aria-modal="true"/);
  assert.match(match, /No previous engine is available\./);
  assert.match(match, /id="v2StrictExportBtn"[^>]*>Export diagnostic log<\/button>/);
  assert.match(match, /id="v2StrictRestartBtn"[^>]*>Restart FL V2<\/button>/);
  assert.match(match, /id="v2StrictExitBtn"[^>]*>Exit to match setup<\/button>/);
  assert.doesNotMatch(sourceWindow('id="v2StrictFailurePage"', 'id="previewPage"'), /Resume|Continue with Build 173|continued under Build 173/);
  assert.match(match, /function togglePause\(force\)\{if\(!started\|\|matchOver\|\|liveV2StrictStopped\)return;/);
});

test('the V2 requirement is applied before the animation loop can advance gameplay', () => {
  const attachAt = match.indexOf('(function attachOfflineLiveV2(){');
  const updateAt = match.indexOf('function update(){', attachAt);
  const animationAt = match.lastIndexOf('requestAnimationFrame(loop)');
  assert.ok(attachAt >= 0 && updateAt > attachAt && animationAt > updateAt);
  const update = sourceWindow('function update(){', 'function showFlash');
  assert.match(update, /if\(!started\)return;\s*if\(liveV2StrictStopped\)return;/);
  assert.match(match, /\?v=174-fl-v2-final-candidate-5/);
});

test('the public practice route is consistently named Set-Piece Suite', () => {
  assert.match(quickPlayPage, /<option value="free-kick-suite">Set-Piece Suite<\/option>/);
  assert.match(quickPlay, /mode==='free-kick-suite'\?'Set-Piece Suite'/);
  assert.doesNotMatch(quickPlayPage, /Free Kick Practice/);
  assert.doesNotMatch(quickPlay, /Free Kick Practice/);
});
