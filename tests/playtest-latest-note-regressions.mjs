import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const match = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');

test('all inline match scripts still parse', () => {
  const scripts = [...match.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 4);
  scripts.forEach((row, index) => {
    if (row[1].trim()) assert.doesNotThrow(() => new Function(row[1]), `inline script ${index}`);
  });
});

test('walkout tunnel uses a real translucent shadow instead of a front black occluder', () => {
  assert.match(match, /new THREE\.ShadowMaterial\(\{color:0x000000,opacity:\.58,transparent:true\}\)/);
  assert.match(match, /tunnelCeilingShadow\.castShadow=false;tunnelCeilingShadow\.receiveShadow=true/);
  assert.match(match, /const tunnelBack=new THREE\.MeshStandardMaterial/);
});

test('kick-off latency is bounded and pause shifts every held-restart deadline', () => {
  assert.match(match, /resetUntil=restartStartedAt\+\(FAST\?80:520\)/);
  assert.match(match, /restartEarliestAt=restartStartedAt\+\(FAST\?160:1100\)/);
  assert.match(match, /restartForceAt=restartStartedAt\+\(FAST\?360:3200\)/);
  for (const field of ['restartStartedAt', 'restartEarliestAt', 'restartForceAt', 'restartReadySince', 'resetUntil']) {
    assert.match(match, new RegExp(`${field}=shift\\(${field}\\)`));
  }
});

test('throw-ins rotate visibly without retaining the old projected trajectory guide', () => {
  assert.match(match, /!\['FREE KICK','THROW-IN'\]\.includes\(restartMsg\)/);
  assert.match(match, /const aimDx=setPieceAim\.x-restartTaker\.x,aimDy=setPieceAim\.y-restartTaker\.y/);
  assert.match(match, /restartTaker\.fx=aimDx\/aimLength;restartTaker\.fy=aimDy\/aimLength/);
});

test('actual teammate possession deterministically hands over human control', () => {
  assert.match(match, /method:'actual-possession-owner'/);
  assert.match(match, /controlled=ball\.owner;autoSwitchCooldown=2/);
  assert.match(match, /controlledOpp=ball\.owner;oppAutoSwitchCooldown=2/);
});

test('V2 first touch credits a completed same-team pass exactly on initial reception', () => {
  const branch = match.match(/if\(result\.contactType==='first-touch'\)\{([\s\S]*?)\n\s*\}else if\(result\.contactType==='aerial-volley'/)?.[1] || '';
  assert.match(branch, /lastPasser\.team===actor\.team&&lastPasser!==actor/);
  assert.match(branch, /report\.teams\[actor\.team\]\.completed\+\+/);
  assert.match(branch, /assistCandidate=lastPasser;lastPasser=null/);
});

test('goal scorers roam for eight seconds and controller celebration input wins over replay skip', () => {
  assert.match(match, /celebrationChoiceDeadline=performance\.now\(\)\+8000/);
  assert.match(match, /team\.filter\(p=>p!==scorer\).*p\.celeb='choice'/s);
  const handler = match.match(/function gamepadButtonDown\(index\)\{([\s\S]*?)\n\s*\}\n\s*function gamepadButtonUp/)?.[1] || '';
  assert.ok(handler.indexOf('controllerCelebrationChoice(index,gamepadInput)') >= 0);
  assert.ok(handler.indexOf('controllerCelebrationChoice(index,gamepadInput)') < handler.indexOf("gamepadInput.buttonActions[index]='skip-replay'"));
  assert.match(match, /scorer\.celebFlipDuration=72/);
  assert.match(match, /angle=q\*Math\.PI\*2/);
});

test('playtest export now measures real visible render cadence instead of simulation minutes', () => {
  assert.match(match, /schema:'football-legacy-render-performance-v1'/);
  assert.match(match, /sampleScope:'visible-unpaused-active-match-render-frames'/);
  assert.match(match, /frameMs:\{average:0,p50:0,p95:0,p99:0,maximum:0\}/);
  assert.match(match, /document\.visibilityState==='visible'/);
  assert.match(match, /started&&!paused&&!matchOver/);
  assert.match(match, /maximumDrawCalls/);
  assert.match(match, /maximumTriangles/);
  assert.match(match, /if\(perf\.samples\.length>3600\)perf\.samples\.splice/);
  assert.doesNotMatch(match, /averageFps[^\n]*clockFrames/);
});

console.log('latest playtest-note regression contract: PASS');
