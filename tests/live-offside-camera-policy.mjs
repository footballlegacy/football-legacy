import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const matchPath = path.join(root, 'match-engine', 'match.html');
const source = fs.readFileSync(matchPath, 'utf8');

function functionSource(name) {
  const marker = `function ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${name}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

const cameraKindSource = functionSource('normalizeRestartCameraKind');
const cameraResolverSource = functionSource('resolveLiveRestartCameraPreset');
const cameraContext = {};
vm.runInNewContext(`${cameraKindSource};${cameraResolverSource};this.resolve=resolveLiveRestartCameraPreset;`, cameraContext);
const resolveCamera = (...args) => cameraContext.resolve(...args);

test('restart camera ownership matrix matches the requested human and CPU policy', () => {
  assert.equal(resolveCamera('FREE KICK', true, false, false), 'set-piece-special');
  assert.equal(resolveCamera('GOAL KICK', true, false, false), 'set-piece-special');
  assert.equal(resolveCamera('CORNER', true, false, false), 'set-piece-special');
  assert.equal(resolveCamera('FREE KICK', false, true, false), 'broadcast');
  assert.equal(resolveCamera('GOAL KICK', false, true, false), 'broadcast');
  assert.equal(resolveCamera('CORNER', false, true, false), 'broadcast');
  assert.equal(resolveCamera('PENALTY', true, false, false), 'penalty-taker');
  assert.equal(resolveCamera('PENALTY', false, true, false), 'penalty-save');
  assert.equal(resolveCamera('PENALTY', false, false, false), 'broadcast');
  assert.equal(resolveCamera('THROW-IN', true, false, false), 'broadcast');
});

test('online and remote presentation remain on the shared broadcast camera', () => {
  for (const kind of ['FREE KICK', 'GOAL KICK', 'CORNER', 'PENALTY']) {
    assert.equal(resolveCamera(kind, true, true, true), 'broadcast');
    assert.equal(resolveCamera(kind, false, true, true), 'broadcast');
  }
});

test('offside law exemptions and delayed involvement enforcement remain intact', () => {
  assert.match(source, /function offsideRestartExempt\(kind\)\{return\['GOAL KICK','THROW-IN','CORNER'\]/);
  assert.match(source, /offsideCandidate\.player===b&&offsideCandidate\.team===b\.team/);
  assert.match(source, /beginOffsidePresentation\(offence,b,defendingTeam\)/);
  assert.doesNotMatch(source, /showEvent\('OFFSIDE',800\);restart\('FREE KICK'/);
});

test('offside presentation is a frozen real-time sequence with one guarded handoff', () => {
  const begin = functionSource('beginOffsidePresentation');
  const update = functionSource('updateOffsidePresentation');
  for (const phase of ['whistle', 'camera-pan', 'flag-raise', 'flag-hold']) assert.ok(update.includes(`'${phase}'`));
  assert.match(begin, /whistle\(\);showEvent\('OFFSIDE · FLAG UP'/);
  assert.match(begin, /ball\.vx=ball\.vy=ball\.zv=0/);
  assert.match(update, /p\.vx=p\.vy=p\.desiredVx=p\.desiredVy=0/);
  assert.match(update, /seq\.handoffDone=true/);
  assert.equal((update.match(/restart\('FREE KICK'/g) || []).length, 1);
  assert.match(source, /clockFrames\+=\(kickoffHeld\|\|offsidePresentation\)\?DT\/45/);
  assert.match(source, /function canSettlePeriod\(\)\{return celebrate<=0&&!kickoffHeld&&!offsidePresentation/);
});

test('existing assistant referees render and animate the raised flag', () => {
  assert.match(source, /playerMesh\._assistantFlagTexture/);
  assert.match(source, /assistantFlagRaise/);
  assert.match(source, /assistantFlagHold/);
  assert.match(source, /else if\(offsidePresentation&&offsidePresentation\.active\)\{\s*place\(refMesh,ref,false\)/);
  assert.match(source, /selected\.action=seq\.phase==='flag-hold'/);
  assert.match(source, /lino1\.action=lino2\.action='idle'/);
});

test('offside presentation state is observable and cleared on every terminal route', () => {
  assert.match(source, /getOffsidePresentation:\(\)=>offsidePresentationSnapshot\(\)/);
  assert.match(source, /presentation:\{foul:[^\n]+offside:offsidePresentationSnapshot\(\)/);
  assert.match(source, /offsideSequence:\{stages:\['whistle','camera-pan','flag-raise','flag-hold','free-kick-handoff'\]/);
  assert.match(source, /offsideCandidate=null;offsidePresentation=null;/);
  assert.ok((source.match(/offsidePresentation=null/g) || []).length >= 5);
});

test('camera preset is captured for each live set-piece launch route', () => {
  const assignments = source.match(/setPieceCameraHold=\{[^}]+cameraPreset:liveRestartCameraPreset\(kind,team\)[^}]+\}/g) || [];
  assert.equal(assignments.length, 2);
  assert.match(source, /function holdSetPieceStrikeCamera\(kind,team,targetY=setPieceAim\.y,now=performance\.now\(\)\)/);
  assert.match(source, /holdSetPieceStrikeCamera\(kind,team,targetY\)/);
  assert.match(source, /holdSetPieceStrikeCamera\(strikeKind,shooter\.team,target\.y\*yPer\)/);
  assert.match(source, /restartCameraPreset==='penalty-save'/);
  assert.match(source, /restartCameraPreset!=='broadcast'/);
});

test('protected workflows remain and V2 authority loads only through the exact offline preflight', () => {
  for (const marker of ['ONLINE_HOST', 'SAME_TEAM_COOP', 'FORCE_SINGLE_CONTROLLER', 'FREE_KICK_PRACTICE', 'getOnlineStream', 'twoPlayerEnabled']) {
    assert.ok(source.includes(marker), `missing protected marker ${marker}`);
  }
  assert.match(source, /id="offlineLiveV2Preflight"/);
  assert.match(source, /const liveWorkflow=matchType==='single-player'\?'single-player':matchType==='spectator'\?'cpu-v-cpu':matchType==='free-kick-suite'\?'set-piece-suite':null/);
  assert.match(source, /eligible=requested&&queryRequested&&payloadRequested&&!!decoded&&!!liveWorkflow&&unique\.length===0/);
  assert.match(source, /buildVersion:'0\.174'/);
  assert.match(source, /hostEngineVersion:'build-173-compatible-orchestrator'/);
});
