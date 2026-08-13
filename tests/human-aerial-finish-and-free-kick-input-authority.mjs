import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchSource = fs.readFileSync(path.join(root, 'match-engine', 'match.html'), 'utf8');

function between(start, end) {
  const from = matchSource.indexOf(start);
  const to = matchSource.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return matchSource.slice(from, to);
}

test('Circle aerial finish intent is immutable to one authored cross flight', () => {
  const seam = between('const AERIAL_MANUAL_RADIUS', 'function defensiveHeadAwayAllowed');
  assert.match(seam, /function humanAerialFinishFlightId\(state=ball\)/);
  assert.match(seam, /state&&state\.crossAuditId\?String\(state\.crossAuditId\):''/);
  assert.match(seam, /humanAerialFinishIntent=\{team,controller,intentMode,sourceId,flightId,/);
  assert.match(seam, /intent\.flightId!==flightId/);
  assert.match(seam, /clockFrames>intent\.untilFrame/);
  assert.match(seam, /humanAerialFinishOpportunity\(team,state,paused\)/,
    'pause may inspect the same intent without invalidating it while clockFrames is frozen');
});

test('new launches, controlled touches, restarts and terminal match state clear stale aerial intent', () => {
  const launch = between('function launchMatchBall', 'function playRestartBallToPoint');
  const controlledTouch = between('function clearControlledTouchFlightMetadata', 'function clearAerialAssignments');
  const restart = between('function restart(kind, team', 'function enterFreeKickPractice');
  const restartClear = between('function clearRestartState', 'function completeRestart');
  const presentation = between('function clearMatchPresentationUI', 'function endMatch');
  assert.match(launch, /clearHumanAerialFinishIntent\('new-launch'\)/);
  assert.match(controlledTouch, /clearHumanAerialFinishIntent\('controlled-touch'\)/);
  assert.match(restart, /clearHumanAerialFinishIntent\('restart-staged'\)/);
  assert.match(restartClear, /clearHumanAerialFinishIntent\('restart-cleared'\)/);
  assert.match(presentation, /clearHumanAerialFinishIntent\('match-presentation-cleared'\)/);
  assert.doesNotMatch(between('function togglePause', 'function exitToMatchSetup'), /clearHumanAerialFinishIntent/,
    'pause must preserve the exact current-flight command');
});

test('physical contest remains authoritative over Circle and no-Circle never auto-shoots', () => {
  const resolution = between('function resolveAerialDuel', 'function resolveBallBlock');
  const winnerSelection = resolution.indexOf('let winner=bestYou||bestOpp');
  const explicitRead = resolution.indexOf('activeHumanAerialFinishIntent(sourceTeam,ball)');
  assert.ok(winnerSelection >= 0 && explicitRead > winnerSelection,
    'winner must be physically selected before Circle intent is read');
  assert.match(resolution, /if\(!attackingCross\)\{logEvent\('human-aerial-finish-resolved',[\s\S]*outcome:'lost-physical-contest'/);
  assert.match(resolution, /if\(humanTeamAutomaticAttack\)\{logEvent\('automatic-attacking-finish-blocked'/);
  assert.match(resolution, /performHeader\(winner,loser,'pass'\)/);
  assert.match(resolution, /ownershipGranted:false/);
});

test('free-kick Cross/A remains zero-lift ground while Square/X remains aerial with no ownership grant', () => {
  const restart = between('function takeUserRestart', 'function keeperKick');
  const launch = between('function launchMatchBall', 'function playRestartBallToPoint');
  const controls = between('function doPassForHuman', 'function doPass(power=0.5)');
  const lobControls = between('function doLobPassFor', 'function doLobPass(power=.58,mode=');
  assert.match(controls, /takeUserRestart\('pass',p,src,'ground-pass',forcedDirection/);
  assert.match(lobControls, /takeUserRestart\(restartMsg==='GOAL KICK'\?'shoot':'pass',p,src,mode,direction\)/);
  assert.match(restart, /deliveryMode==='ground-pass'/);
  assert.match(restart, /playRestartBallToPoint\(taker,point,hostSpeed,0,'ground-pass',target,\{v2SpeedWorld:v2Speed,v2LoftWorld:0\}\)/);
  assert.match(restart, /controllerContract:'x-ground-square-aerial'/);
  assert.match(restart, /playRestartBallToPoint\(taker,plan\.point,plan\.trajectory\.speed,plan\.trajectory\.loft,plan\.flightType,target,/,
    'Square/X must launch the aerial plan rather than the ground-pass path');
  const deliveryPlan = between('function setPieceDeliveryPlan', 'function flairPassExecution');
  assert.match(deliveryPlan, /restartKind==='FREE KICK'\?'free-kick-cross':'corner'/,
    'a normal free-kick service must resolve to the authored aerial flight type');
  assert.match(launch, /ball\.owner=null/);
  assert.doesNotMatch(between('function completeRestart', 'function playRestartBall'), /ball\.owner\s*=(?!=)/,
    'control handover after a restart must not grant ball ownership');
});

test('dynamic regression hooks cover no-Circle, attacking Circle, defender win, expiry, pause and cross-A to same-source cross-B', () => {
  assert.match(matchSource, /debugAutomaticHumanTeamFinishPolicy/);
  assert.match(matchSource, /debugExplicitHumanAerialFinish/);
  const authorityDebug = between('window.FLMatch.debugHumanAerialFinishAuthority', 'window.FLMatch.debugNewControlMechanics');
  assert.match(authorityDebug, /debug-cross-identity-a/);
  assert.match(authorityDebug, /ball\.crossAuditId='debug-cross-identity-b'/);
  assert.match(authorityDebug, /launchMatchBall\(server,/);
  assert.match(authorityDebug, /expiryFrame\+1/);
  assert.match(authorityDebug, /winnerTeam==='opp'/);
  assert.match(authorityDebug, /pauseRetained/);
  assert.match(matchSource, /debugFreeKickGroundAndAerialInputs/);
});

test('keyboard aerial-finish input is one edge until keyup even under native key repeat', () => {
  const handlers = between('// game starts from a difficulty button', '  function clamp(v,a,b)');
  const runtime = new Function(`
    const listeners={},keys={};let queued=0,suppressShotKeyup=false;
    const addEventListener=(type,handler)=>{listeners[type]=handler;};
    const editableInputTarget=()=>false,instantReplayReviewHandleKeyDown=()=>false,instantReplayReviewHandleKeyUp=()=>false,initAudio=()=>{};
    const goalReplay={active:false},disciplineReplay={active:false},diveReplay={active:false},specialPSequence={active:false};
    let celebrate=0,celebrateTeam=null,celebratingPlayer=null,celebrationChoicePending=false,paused=false,started=true;
    const FREE_KICK_PRACTICE=false,LIVE_V2_PREFLIGHT={workflow:'single-player'};
    const window={FootballLegacySetPiece:null};
    const queueHumanAerialFinish=()=>{queued++;return true;};
    ${handlers}
    const event={key:'s',code:'KeyS',target:null,preventDefault(){}};
    return {
      press(){listeners.keydown(event);},
      release(){listeners.keyup(event);},
      snapshot(){return{queued,held:!!keys.s,suppressShotKeyup};}
    };
  `)();
  runtime.press();
  assert.deepEqual(runtime.snapshot(), { queued: 1, held: true, suppressShotKeyup: true });
  runtime.press();
  assert.deepEqual(runtime.snapshot(), { queued: 1, held: true, suppressShotKeyup: true },
    'native key repeat must not refresh the same-flight intent');
  runtime.release();
  assert.deepEqual(runtime.snapshot(), { queued: 1, held: false, suppressShotKeyup: false });
  runtime.press();
  assert.deepEqual(runtime.snapshot(), { queued: 2, held: true, suppressShotKeyup: true },
    'a genuine new press after keyup may queue a new command');
});
