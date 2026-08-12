import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../match-engine/match.html', import.meta.url), 'utf8');
assert.match(html, /FL V2 live · Set-Piece Suite/, 'the live status title must name the Set-Piece Suite rather than Single Player');

const section = (start, end) => {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing integration section: ${start}`);
  return html.slice(from, to);
};

for (const [index, match] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries()) {
  if (match[1].trim()) assert.doesNotThrow(() => new Function(match[1]), `inline script ${index} must parse`);
}

const cameraPolicy = section('function applyLiveV2SetPieceCameraPolicy', 'function liveRestartCameraPreset');
assert.match(cameraPolicy, /liveV2SetPieceCameraPolicy=next/);
assert.match(cameraPolicy, /'FREE KICK','GOAL KICK','CORNER','PENALTY'/);
assert.match(html, /function normalizeRestartCameraKind\(kind\)\{return String\(kind\|\|''\)\.trim\(\)\.replace\(\/\[-_\]\+\/g,' '\)/);
assert.match(cameraPolicy, /normalizeRestartCameraKind\(policy\.restartKind\)/);
const normalizeSource = html.match(/function normalizeRestartCameraKind\(kind\)\{[^}]+\}/)?.[0];
assert.ok(normalizeSource, 'restart-kind normalizer must remain extractable');
const normalizeRestartKind = new Function(`${normalizeSource};return normalizeRestartCameraKind;`)();
assert.equal(normalizeRestartKind('free-kick'), 'FREE KICK');
assert.equal(normalizeRestartKind('goal_kick'), 'GOAL KICK');
assert.match(html, /camera\.policy\.apply'\)\{applyLiveV2SetPieceCameraPolicy\(payload\.policy,payload\.scenarioId\)/);
assert.match(html, /ball\.launch\.handoff'[\s\S]*holdSetPieceStrikeCamera\(strikeKind,shooter\.team,target\.y\*yPer\)/);
assert.match(html, /ball\.launch\.handoff'[\s\S]*if\(!pendingFreeKickReplay\)beginSetPieceReplayCapture\(strikeKind,shooter\.team,shooter,ball\.shotType,'v2-set-piece'\)/);
const liveSuiteStrike = section("if(LIVE_V2_PREFLIGHT.workflow==='set-piece-suite'&&FREE_KICK_PRACTICE&&kind==='FREE KICK')", 'const ok=launchMatchBall');
assert.doesNotMatch(liveSuiteStrike, /beginFreeKickReplayCapture/, 'V2 capture must begin with the committed launch command, not while its arm event is still pending');

const cameraFollow = section('function camFollow()', 'function draw(){');
assert.match(cameraFollow, /resolveSetPieceCameraRig\(\{kind,team,originX,originY/);
assert.match(cameraFollow, /setPieceCameraLookState\.x\+=\(rig\.look\.x-setPieceCameraLookState\.x\)\*lookAlpha/);
assert.match(cameraFollow, /LIVE_V2_PREFLIGHT\.workflow==='set-piece-suite'/);
assert.match(cameraFollow, /updatePracticeRoamCamera\(now\)/);
assert.match(html, /function practiceRoamCameraInputActive\(isSecond=false\)\{return !isSecond&&FREE_KICK_PRACTICE&&LIVE_V2_PREFLIGHT\.workflow==='set-piece-suite'/);
assert.match(html, /if\(practiceRoamCameraInputActive\(isSecond\)\)/);

const cameraRigSource = section('function resolveSetPieceCameraRig', 'const isDualSenseDevice');
const resolveSetPieceCameraRig = new Function(`
  const W=3344,H=2142,M=84,GOAL_H=230;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const worldX=gx=>gx-W/2,worldZ=gy=>gy-H/2;
  const normalizeRestartCameraKind=kind=>String(kind||'').trim().replace(/[-_]+/g,' ').replace(/\s+/g,' ').toUpperCase();
  ${cameraRigSource}
  return resolveSetPieceCameraRig;
`)();
for (const kind of ['FREE KICK', 'CORNER', 'GOAL KICK', 'PENALTY']) {
  const rig = resolveSetPieceCameraRig({kind, team:'you', originX:2500, originY:1071, aimY:1120, aimHeight:.56, taker:{x:2380,y:1048}});
  assert.equal(rig.ballAnchored, true, `${kind} camera must remain ball anchored`);
  assert.equal(rig.goalFramed, true, `${kind} camera must frame the goal or delivery axis`);
  assert.equal(rig.behindPlayer, true, `${kind} camera must stay behind the taker`);
  assert.ok(rig.back >= 295, `${kind} camera must leave room for the run-up`);
  assert.ok(Math.abs(rig.panYawDeg) < 12, `${kind} directional pan must stay in a small rotation window`);
}
const fkRig = resolveSetPieceCameraRig({kind:'FREE KICK', team:'you', originX:2500, originY:1000, aimY:1120, aimHeight:.6, taker:{x:2380,y:970}});
assert.equal(fkRig.back, 420, 'free-kick camera must be dollied farther back than the retired 238-unit shot');
const mirroredFkRig = resolveSetPieceCameraRig({kind:'FREE KICK', team:'opp', originX:844, originY:1142, aimY:1022, aimHeight:.6, taker:{x:964,y:1172}});
assert.ok(Math.abs(fkRig.back-mirroredFkRig.back)<.001 && Math.sign(fkRig.forward.x)===-Math.sign(mirroredFkRig.forward.x), 'free-kick camera must mirror at opposite ends');

const runUpSource = section('function freeKickRunUpGeometry', 'function holdSetPieceStrikeCamera');
const runUpRuntime = new Function(`
  const W=3344,H=2142,M=84,rad=12.75,PITCH_UNITS_PER_METRE=(H-12)/68;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const attackDirection=team=>team==='you'?1:-1;
  ${runUpSource}
  return {freeKickRunUpGeometry,freeKickRunUpPoint};
`)();
const rightFoot = runUpRuntime.freeKickRunUpGeometry({team:'you',ballX:2500,ballY:1071,taker:{preferredFoot:'Right'},technique:'dipping',contact:{variant:'controlled-dip',strikeFoot:'Right'}});
const leftFoot = runUpRuntime.freeKickRunUpGeometry({team:'you',ballX:2500,ballY:1071,taker:{preferredFoot:'Left'},technique:'dipping',contact:{variant:'controlled-dip',strikeFoot:'Left'}});
const curved = runUpRuntime.freeKickRunUpGeometry({team:'you',ballX:2500,ballY:1071,taker:{preferredFoot:'Right'},technique:'curved',contact:{variant:'inside-wrap',strikeFoot:'Right'}});
const driven = runUpRuntime.freeKickRunUpGeometry({team:'you',ballX:2500,ballY:1071,taker:{preferredFoot:'Right'},technique:'driven',contact:{variant:'driven-straight',strikeFoot:'Right'}});
assert.ok(rightFoot.distanceMetres >= 3.5 && rightFoot.distanceMetres <= 4.3, 'free-kick run-up must provide a real 3.5-4.3m approach');
assert.equal(rightFoot.durationMs, 1180);
assert.equal(curved.durationMs, 1320);
assert.equal(driven.durationMs, 1060);
assert.equal(Math.sign(rightFoot.lateral), -Math.sign(leftFoot.lateral), 'preferred-foot approaches must mirror');
assert.ok(Math.abs(curved.lateral)>Math.abs(driven.lateral), 'curved approach must be wider than the driven approach');
assert.deepEqual(runUpRuntime.freeKickRunUpPoint(rightFoot,0), {x:rightFoot.startX,y:rightFoot.startY,t:0});
const contactPoint = runUpRuntime.freeKickRunUpPoint(rightFoot,1);
assert.equal(contactPoint.x, rightFoot.contactX);
assert.equal(contactPoint.y, rightFoot.contactY);

const deliverySource = section('function standardLobTrajectory', 'function flairPassExecution');
const setPieceDeliveryPlan = new Function(`
  const W=3344,H=2142,M=84,GOAL_H=230,PITCH_UNITS_PER_METRE=(H-12)/68;
  const ERA_MATCH={airDrag:.994,ballSpeed:1,loft:1};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const attackDirection=team=>team==='you'?1:-1;
  const normalizeRestartCameraKind=kind=>String(kind||'').trim().replace(/[-_]+/g,' ').replace(/\s+/g,' ').toUpperCase();
  ${deliverySource}
  return setPieceDeliveryPlan;
`)();
for (const kind of ['FREE KICK','CORNER','GOAL KICK']) {
  const normal=setPieceDeliveryPlan({kind,team:'you',sourceX:600,sourceY:200,targetX:2400,targetY:1000,power:.65,mode:'normal',passRating:88,techniqueRating:90,stickX:.8,stickY:.55,deterministic:true});
  const low=setPieceDeliveryPlan({kind,team:'you',sourceX:600,sourceY:200,targetX:2400,targetY:1000,power:.65,mode:'low-cross',passRating:88,techniqueRating:90,stickX:.8,stickY:.55,deterministic:true});
  const drivenPlan=setPieceDeliveryPlan({kind,team:'you',sourceX:600,sourceY:200,targetX:2400,targetY:1000,power:.65,mode:'driven',passRating:88,techniqueRating:90,stickX:.8,stickY:.55,deterministic:true});
  assert.equal(normal.directional,true);
  assert.ok(low.trajectory.loft<normal.trajectory.loft, `${kind} R1 delivery must be lower than normal`);
  assert.ok(drivenPlan.trajectory.loft<normal.trajectory.loft, `${kind} L1+R1 delivery must be flatter than normal`);
  assert.ok(Math.abs(normal.spin)>Math.abs(drivenPlan.spin), `${kind} normal service may bend more than driven service`);
  assert.equal(low.physics,'lower-faster-restrained-bend');
  assert.equal(drivenPlan.physics,'driven-flat-minimal-bend');
}
assert.match(html, /if\(kickoffHeld\).*takeUserRestart\(restartMsg==='GOAL KICK'\?'shoot':'pass',p,src,mode,direction\)/);
assert.match(html, /\['FREE KICK','CORNER','GOAL KICK'\]\.includes\(restartMsg\)/);
assert.match(html, /set-piece-directional-delivery/);

const practiceRoamAdvanceSource = section('function advancePracticeRoamCamera', 'function updatePracticeRoamCamera');
const advancePracticeRoamCamera = new Function(`
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  ${practiceRoamAdvanceSource}
  return advancePracticeRoamCamera;
`)();
const roamBase = {orbit:0,distance:165,lastAt:0};
const roamDown = advancePracticeRoamCamera(roamBase, {x:0,y:1});
const roamUp = advancePracticeRoamCamera(roamBase, {x:0,y:-1});
const roamLeft = advancePracticeRoamCamera(roamBase, {x:-1,y:0});
const roamRight = advancePracticeRoamCamera(roamBase, {x:1,y:0});
assert.ok(roamDown.distance > roamBase.distance, 'RS down must move the suite-roam camera backward');
assert.ok(roamUp.distance < roamBase.distance, 'RS up must move the suite-roam camera closer');
assert.ok(roamLeft.orbit < roamBase.orbit && roamRight.orbit > roamBase.orbit, 'RS left/right must orbit in opposite directions');
assert.equal(advancePracticeRoamCamera({orbit:0,distance:329,lastAt:0}, {x:0,y:1}, 1000).distance, 330);
assert.equal(advancePracticeRoamCamera({orbit:0,distance:113,lastAt:0}, {x:0,y:-1}, 1000).distance, 112);

const capture = section('function beginSetPieceReplayCapture', 'function recordReplayFrame');
assert.match(capture, /\['FREE KICK','PENALTY'\]\.includes\(restartKind\)/);
assert.match(capture, /consumedSetPieceReplayCaptureIds\.add\(pending\.captureId\)/);
assert.match(capture, /pending\.consumedAt=performance\.now\(\)/);
assert.match(capture, /pendingFreeKickReplay=null/);

const practiceReplay = section('function startPracticeFreeKickReplay', 'function pendingFightWindowActive');
assert.match(practiceReplay, /if\(!pending\|\|!Number\.isInteger\(pending\.captureId\)\|\|consumedSetPieceReplayCaptureIds\.has\(pending\.captureId\)\)return false/);
assert.match(practiceReplay, /captured=consumePendingFreeKickReplay\(outcome\);if\(!captured\)return false/);
assert.match(practiceReplay, /penalty\?'penalty-shot-replay':'free-kick-shot-replay'/);
assert.match(practiceReplay, /penalty\?'PENALTY ':'FREE-KICK '/);

const returnLoop = section('function updatePracticeBallReturn', 'function setPieceReady');
assert.match(returnLoop, /if\(pendingFreeKickReplay&&startPracticeFreeKickReplay/);
assert.doesNotMatch(returnLoop, /replayBuffer\.filter/);

assert.match(html, /'penalty-shot-replay':\{durationMs:5200/);
assert.match(html, /queuePracticeBallReturn\('penalty-shot-fallback',2600\)/);
assert.match(html, /practiceKind==='PENALTY'\?'practice-penalty-result':'practice-free-kick-result'/);
assert.match(html, /kind==='penalty-shot-replay'\?'RUN-UP \+ KEEPER \+ OUTCOME SLOW MOTION'/);

assert.match(html, /SHOT_REPLAY_PACKAGE_SPEEDS=Object\.freeze\(\[\.4,\.4,\.2\]\)/);
for (const kind of ['goal-replay', 'free-kick-goal-replay', 'missed-shot', 'save-to-corner', 'free-kick-shot-replay', 'penalty-shot-replay']) {
  assert.match(html, new RegExp(`SHOT_REPLAY_PACKAGE_KINDS=new Set\\(\\[[^\\]]*'${kind}'`));
}
assert.match(html, /function immutableShotReplayClip\(/);
assert.match(html, /completeImmutableClipPerPass:true/);
assert.match(html, /skipScope:'whole-package'/);
assert.match(html, /completionPolicy:'exactly-once'/);
assert.match(html, /fullClipPerAngle:!!replayPackage/);
assert.match(html, /goalReplay\.shotPackage=replayPackage/);
assert.match(html, /disciplineReplay\.shotPackage=replayPackage/);
assert.match(html, /finishDisciplineReplay\('skipped'\)/);
assert.match(html, /function shotOutcomeReplayStoppageConfirmed/);
assert.match(html, /reason:'save-remained-in-live-play'/);
assert.match(html, /liveInPlaySaveReplay:false/);
assert.match(html, /debugShotReplayPackage:\(\)=>debugShotReplayPackage\(\)/);
assert.match(html, /FREE_KICK_PRACTICE&&LIVE_V2_PREFLIGHT\.workflow==='set-piece-suite'&&\(k==='u'\|\|k==='r'\)/);
assert.match(html, /control:'keyboard-u'.*scenarioId:'penalty-shortcut'/);
assert.match(html, /D-pad Up \/ U · Place free kick or penalty in the box/);
assert.match(html, /D-pad Down \/ R · Repeat after the replay and ball return/);
assert.match(html, /liveV2RequestSuiteRepeat\('controller'\)/);
assert.match(html, /liveV2RequestSuiteRepeat\('keyboard'\)/);

const receiptSource = section('function liveV2ControlReceiptMatches', 'function liveV2CommitControl');
const liveV2ControlReceiptMatches = new Function(`${receiptSource};return liveV2ControlReceiptMatches;`)();
assert.equal(liveV2ControlReceiptMatches(['camera:1', 'suite-setup:1', 'suite-launch:1'], ['camera:1', 'suite-launch:1', 'suite-setup:1']), true, 'multi-command repeat receipt must be order-independent');
assert.equal(liveV2ControlReceiptMatches(['camera:1', 'suite-setup:1'], ['camera:1', 'suite-launch:1', 'suite-setup:1']), false, 'partial repeat receipt must still fail closed');

const repeatReadySource = section('function liveV2SuiteRepeatBlocker', 'function liveV2RequestSuiteRepeat');
const repeatReady = state => new Function('state', `
  const LIVE_V2_PREFLIGHT={workflow:'set-piece-suite'};
  const liveV2ControlDisabled=!!state.disabled,liveV2SuiteShotActive=!!state.shotActive,liveV2SuiteEvent=state.event||null,liveV2SuiteEventQueue=state.queue||[];
  const kickoffHeld=!!state.kickoffHeld,externalSetPieceActive=!!state.external,pendingFreeKickReplay=state.capture||null,practiceBallReturnAt=state.returnAt||0;
  const goalReplay={active:!!state.goalReplay,pending:!!state.goalPending},disciplineReplay={active:!!state.discipline},diveReplay={active:!!state.dive},specialPSequence={active:!!state.special};
  const celebrate=state.celebrate||0;
  ${repeatReadySource}
  return liveV2SuiteRepeatReady();
`)(state);
assert.equal(repeatReady({}), true, 'a terminal returned attempt may repeat');
assert.equal(repeatReady({goalReplay:true}), false, 'repeat must stay blocked throughout the replay package');
assert.equal(repeatReady({returnAt:1}), false, 'repeat must stay blocked until the practice ball has returned');
assert.equal(repeatReady({shotActive:true}), false, 'repeat must not orphan a live shot');
assert.match(html, /liveV2SuiteShotActive\)\{if\(!liveV2SuiteTerminalEventPending\(\)\)[\s\S]*queuePracticeBallReturn\('suite-attempt-terminal',120\)/, 'a settled or controlled Suite shot must resolve, replay and return instead of remaining live forever');
assert.match(html, /live-attempt-timeout'[\s\S]*queuePracticeBallReturn\('suite-attempt-timeout',120\)/, 'a Suite shot that never produces a terminal collision must still resolve and return after the bounded capture window');

const immutableClipSource = section('function immutableShotReplayClip', 'function createShotReplayPackage');
const createPackageSource = section('function createShotReplayPackage', 'function shotReplayPackagePlayback');
const playbackSource = section('function shotReplayPackagePlayback', 'function shotReplayPackageLabel');
const packageRuntime = new Function(`
  const FAST=false,SHOT_REPLAY_PACKAGE_SPEEDS=Object.freeze([.4,.4,.2]);
  const SHOT_REPLAY_PACKAGE_KINDS=new Set(['goal-replay','free-kick-goal-replay','missed-shot','save-to-corner','free-kick-shot-replay','penalty-shot-replay']);
  const SHOT_REPLAY_PACKAGE_ANGLES={'penalty-shot-replay':['behind-taker','goal-line-keeper','corner-outcome']};
  let shotReplayPackageSequence=0;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const cloneReplayFrame=frame=>JSON.parse(JSON.stringify(frame));
  const shotReplayPackageEligible=kind=>SHOT_REPLAY_PACKAGE_KINDS.has(String(kind||''));
  ${immutableClipSource}
  ${createPackageSource}
  ${playbackSource}
  return {createShotReplayPackage,shotReplayPackagePlayback};
`)();
const sampleFrames = [
  {t:1000,players:[],ball:{x:0,y:0,z:0,vx:0,vy:0,zv:0,isShot:false}},
  {t:1450,players:[],ball:{x:1,y:0,z:1,vx:1,vy:0,zv:0,isShot:true}},
  {t:1900,players:[],ball:{x:2,y:0,z:0,vx:1,vy:0,zv:0,isShot:true}}
];
const packageResult = packageRuntime.createShotReplayPackage('penalty-shot-replay', sampleFrames);
assert.deepEqual([...packageResult.speeds], [.4, .4, .2]);
assert.equal(packageResult.passes.length, 3);
assert.equal(packageResult.passes[2].durationMs, packageResult.passes[0].durationMs * 2);
assert.equal(new Set(packageResult.passes.map(pass => pass.angle)).size, 3);
assert.ok(Object.isFrozen(packageResult.frames) && packageResult.frames.every(Object.isFrozen));
for (const pass of packageResult.passes) {
  assert.equal(packageRuntime.shotReplayPackagePlayback(packageResult, pass.startsAtMs).sourceProgress, 0);
  assert.ok(packageRuntime.shotReplayPackagePlayback(packageResult, pass.endsAtMs - .001).sourceProgress > .999);
}

const stoppageSource = section('function shotOutcomeReplayStoppageConfirmed', 'function startOutcomeReplay');
const stoppageRuntime = new Function(`
  let clockRunning=true,kickoffHeld=false,ball={x:50},M=10,W=100;
  ${stoppageSource}
  return {check:shotOutcomeReplayStoppageConfirmed,setBallX:value=>ball.x=value};
`)();
assert.equal(stoppageRuntime.check('save-to-corner'), false, 'live in-play save must not start a package');
stoppageRuntime.setBallX(101);
assert.equal(stoppageRuntime.check('save-to-corner'), true, 'confirmed goal-line exit may replay a save to corner');
stoppageRuntime.setBallX(50);
assert.equal(stoppageRuntime.check('save-to-corner', {stoppageConfirmed:true}), true, 'explicit post-stoppage selection may replay a save');

console.log('set-piece camera/replay integration contract: PASS');
