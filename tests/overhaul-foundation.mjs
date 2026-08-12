import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => readFileSync(path.join(root, relative));
const readText = relative => read(relative).toString('utf8');
const readJson = relative => JSON.parse(readText(relative));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = readJson('research/overhaul/build-173-baseline-manifest.json');
const matrix = readJson('research/overhaul/protected-workflows.json');
const matchHtml = readText('match-engine/match.html');
const quickPlayHtml = readText('quick-play/index.html');
const quickPlayApp = readText('quick-play/app.js');

function inlineScript(id) {
  const match = matchHtml.match(new RegExp(`<script id=["']${id}["']>([\\s\\S]*?)<\\/script>`));
  assert.ok(match, `${id} inline script must exist`);
  return match[1];
}

test('F0 keeps Build 173 as the default and promotes only the explicit offline opt-in rung', () => {
  assert.equal(manifest.schema, 'football-legacy-overhaul-baseline-v1');
  assert.equal(manifest.schemaVersion, '2.0.0');
  assert.equal(manifest.build, 173);
  assert.equal(manifest.candidateBuild, 174);
  assert.equal(manifest.authority.currentRung, 'offline-opt-in');
  assert.equal(manifest.authority.defaultAuthority, 'build-173-legacy');
  assert.equal(manifest.authority.liveGameplayOwner, 'match-engine/match.html');
  assert.equal(manifest.authority.candidateMayControlLiveGameplay, true);
  assert.deepEqual(manifest.authority.candidateAuthorityScope, [
    'single-player-quick-play', 'cpu-versus-cpu', 'set-piece-suite'
  ]);
  assert.equal(manifest.authority.candidateAuthorityRequiresExplicitSelection, true);
  assert.equal(manifest.authority.runtimeFailurePolicy, 'rollback-then-freeze-fl-v2-with-blocking-diagnostic');
  assert.equal(manifest.authority.scopedLegacyMaintenanceAllowed, true);
  assert.equal(manifest.authority.onlineChangesAllowed, false);
  assert.equal(manifest.authority.offlineOptInApprovedByJoshua, true);
  assert.equal(manifest.authority.furtherMigrationRequiresExplicitJoshuaApproval, true);
  assert.equal(manifest.reference.pathRecordedInManifest, false);
});

test('every pinned protected file exists and matches its candidate SHA-256', () => {
  assert.ok(manifest.protectedFiles.length >= 19);
  for (const entry of manifest.protectedFiles) {
    assert.match(entry.path, /^(?!\/)(?!.*\.\.)/);
    assert.ok(existsSync(path.join(root, entry.path)), `${entry.path} must exist`);
    assert.match(entry.baselineSha256, /^[a-f0-9]{64}$/);
    if (entry.pinState === 'pending-final-freeze') {
      assert.equal(entry.candidateSha256, null, `${entry.path} pending pin must be explicit`);
      continue;
    }
    assert.match(entry.candidateSha256, /^[a-f0-9]{64}$/);
    assert.equal(sha256(read(entry.path)), entry.candidateSha256, `${entry.path} candidate hash`);
    if (entry.expectedRelation.startsWith('byte-identical')) {
      assert.equal(entry.candidateSha256, entry.baselineSha256, `${entry.path} must remain Build 173-identical`);
    }
  }
});

test('every pinned promoted runtime file is new to the baseline, scoped and hash-sealed', () => {
  assert.equal(manifest.promotedFiles.length, 22);
  const paths = manifest.promotedFiles.map(entry => entry.path);
  assert.equal(new Set(paths).size, paths.length, 'promoted file paths must be unique');
  for (const entry of manifest.promotedFiles) {
    assert.match(entry.path, /^(?!\/)(?!.*\.\.)/);
    assert.equal(entry.baselineAbsent, true, `${entry.path} must be declared absent from Build 173`);
    assert.ok(existsSync(path.join(root, entry.path)), `${entry.path} must exist`);
    assert.ok(Array.isArray(entry.authorityScope) && entry.authorityScope.length > 0, `${entry.path} scope`);
    if (entry.pinState === 'pending-final-freeze') {
      assert.equal(entry.candidateSha256, null, `${entry.path} pending pin must be explicit`);
      continue;
    }
    assert.match(entry.candidateSha256, /^[a-f0-9]{64}$/);
    assert.equal(sha256(read(entry.path)), entry.candidateSha256, `${entry.path} promoted hash`);
  }
  assert.deepEqual(
    manifest.promotedFiles.filter(entry => entry.pinState === 'pending-final-freeze').map(entry => entry.path),
    []
  );
  assert.ok(paths.includes('match-engine/dribbling-state-v2.js'));
  assert.ok(paths.includes('match-engine/instant-replay-review-v2.js'));
});

test('release freeze has no unresolved candidate hash pins', () => {
  const pending = [...manifest.protectedFiles, ...manifest.promotedFiles]
    .filter(entry => entry.pinState === 'pending-final-freeze')
    .map(entry => entry.path);
  assert.deepEqual(pending, [], `final release pins still pending: ${pending.join(', ')}`);
});

test('Quick Play defaults to Build 173 and emits exact FL V2 payload/query agreement only for three modes', () => {
  const authority = manifest.allowedCandidateDelta.offlineOptInAuthority;
  assert.equal(authority.defaultEngine, 'build-173');
  assert.equal(authority.selectorDefault, 'build-173');
  assert.equal(authority.selectorOptIn, 'fl-v2');
  assert.equal(authority.onlinePolicy, 'frozen-to-build-173');
  assert.equal(authority.unsupportedWorkflowPolicy, 'visible-prelaunch-build-173-selection');
  assert.equal(authority.runtimeFailurePolicy, 'rollback-candidate-transaction-and-freeze-fl-v2-with-blocking-diagnostic');
  assert.deepEqual(authority.workflows.map(item => item.protectedWorkflow), [
    'single-player-quick-play', 'cpu-versus-cpu', 'set-piece-suite'
  ]);
  assert.deepEqual(authority.workflows.map(item => item.quickPlayMatchType), [
    'single-player', 'spectator', 'free-kick-suite'
  ]);
  assert.deepEqual(authority.workflows.map(item => item.runtimeWorkflow), [
    'single-player', 'cpu-v-cpu', 'set-piece-suite'
  ]);
  const cpuWorkflow = authority.workflows.find(item => item.protectedWorkflow === 'cpu-versus-cpu');
  assert.deepEqual(cpuWorkflow.authority, ['gameplay', 'match-control']);
  assert.deepEqual(cpuWorkflow.controlOwnership, { humanPlayerIds: [], cpuTeamIds: ['you', 'opp'] });
  assert.deepEqual(cpuWorkflow.queryRequirement, { autoplay: '1' });
  assert.equal(authority.queryContract.autoplay, 'exactly-one-value-1-for-cpu-versus-cpu-only');
  assert.deepEqual(authority.payloadContract['controllers.cpu-versus-cpu'], {
    player1Team: null, player2Team: null, aiTeam: 'both', online: 'not-true', cooperative: 'not-true'
  });
  assert.match(quickPlayHtml, /<select id="gameplayEngine">[\s\S]*?<option value="build-173" selected>Build 173 · Stable<\/option>[\s\S]*?<option value="fl-v2">FL V2 · Strict Offline Playtest<\/option>/);
  assert.match(quickPlayApp, /const QUICK_PLAY_ENGINE_VERSION='1\.0\.0-offline-live-authority-playtest'/);
  assert.match(quickPlayApp, /if\(online\|\|mode==='online'\)return\{requested:FL_V2_ENGINE,effective:BUILD_173_ENGINE/);
  assert.match(quickPlayApp, /if\(!\['single-player','free-kick-suite','spectator'\]\.includes\(mode\)\)return\{requested:FL_V2_ENGINE,effective:BUILD_173_ENGINE/);
  assert.match(quickPlayApp, /return\{requested:FL_V2_ENGINE,effective:FL_V2_ENGINE,version:QUICK_PLAY_ENGINE_VERSION,fallbackReason:null\}/);
  assert.match(quickPlayApp, /function finalizeMatchPayload\(payload,requested,online=false\)[\s\S]*?result\.simulationSeed=deterministicSimulationSeed\(result\)/);
  assert.match(quickPlayApp, /params\.set\('simulationSeed',String\(simulationSeed\)\)/);
  assert.match(quickPlayApp, /if\(engine\?\.effective===FL_V2_ENGINE\)params\.set\('engine',FL_V2_ENGINE\);else params\.delete\('engine'\)/);
  assert.match(quickPlayApp, /if\(data\.matchType==='spectator'\)params\.set\('autoplay','1'\)/);
});

test('the match page conditionally loads the exact FL V2 runtime only after fail-closed preflight', () => {
  const delta = manifest.allowedCandidateDelta;
  const authority = delta.offlineOptInAuthority;
  assert.equal(matchHtml.split(delta.exactLine).length - 1, delta.occurrences);
  assert.equal(delta.baselineSha256, manifest.protectedFiles.find(entry => entry.path === delta.path).baselineSha256);

  const preflight = inlineScript('offlineLiveV2Preflight');
  assert.match(preflight, /engineValues=params\.getAll\('engine'\)/);
  assert.match(preflight, /seedValues=params\.getAll\('simulationSeed'\)/);
  assert.match(preflight, /shadowValues=params\.getAll\('v2Shadow'\)/);
  assert.match(preflight, /if\(shadowValues\.length\)markers\.push\('shadow-marker-conflict'\)/);
  assert.match(preflight, /queryRequested=engineValues\.length===1&&engineValues\[0\]==='fl-v2'/);
  assert.match(preflight, /payloadRequested=!!\(payloadEngine&&payloadEngine\.requested==='fl-v2'\)/);
  assert.match(preflight, /if\(payloadEngine\.effective!=='fl-v2'\)markers\.push\('payload-engine-effective-mismatch'\)/);
  assert.match(preflight, /if\(payloadEngine\.version!=='1\.0\.0-offline-live-authority-playtest'\)/);
  assert.match(preflight, /else if\(querySeed!==String\(payloadSeed>>>0\)\)markers\.push\('simulation-seed-mismatch'\)/);
  assert.match(preflight, /const liveWorkflow=matchType==='single-player'\?'single-player':matchType==='spectator'\?'cpu-v-cpu':matchType==='free-kick-suite'\?'set-piece-suite':null/);
  assert.match(preflight, /if\(liveWorkflow==='cpu-v-cpu'\)\{[\s\S]*?controllers\.player1Team===null&&controllers\.player2Team===null&&controllers\.aiTeam==='both'&&controllers\.online!==true&&controllers\.cooperative!==true/);
  assert.match(preflight, /if\(autoplayValues\.length!==1\|\|autoplayValues\[0\]!=='1'\)markers\.push\(autoplayValues\.length>1\?'duplicate-autoplay-marker':'cpu-v-cpu-autoplay-marker-invalid'\)/);
  assert.match(preflight, /eligible=requested&&queryRequested&&payloadRequested&&!!decoded&&!!liveWorkflow&&unique\.length===0/);
  assert.match(preflight, /if\(!eligible\)return/);
  assert.match(preflight, /window\.__FL_V2_LIVE_PREFLIGHT=Object\.freeze/);

  let priorIndex = -1;
  for (const filename of authority.orderedScripts) {
    assert.equal(preflight.split(`'${filename}'`).length - 1, 1, `${filename} exact live loader entry`);
    const index = preflight.indexOf(`'${filename}'`);
    assert.ok(index > priorIndex, `${filename} conditional order`);
    priorIndex = index;
    assert.doesNotMatch(matchHtml, new RegExp(`<script\\s+src=["'][^"']*${filename.replace(/\./g, '\\.')}`, 'i'), `${filename} must not load unconditionally`);
  }
  assert.equal(authority.scriptCacheVersion, '174-fl-v2-playtest-notes-1');
  assert.match(preflight, /pieces\.forEach\(src=>document\.write\('<script src="'\+src\+'\?v=174-fl-v2-playtest-notes-1/);
});

test('the live host composes candidate transactions with rollback and a blocking strict V2 stop', () => {
  assert.match(matchHtml, /function liveV2Stop\(reason\)[\s\S]*?liveV2StrictStopped=true;paused=true;clockRunning=false[\s\S]*?liveV2Badge\('FL V2 stopped · Match halted',true,liveV2AttachFailure\)/);
  assert.match(matchHtml, /prepared=liveV2Authority\.prepareCommit\(frame\)/);
  assert.match(matchHtml, /liveV2Authority\.applyPrepared\(prepared\)/);
  assert.match(matchHtml, /liveV2Authority\.finalizePrepared\(prepared\)/);
  assert.match(matchHtml, /catch\(error\)\{liveV2RestoreTransactionState\(saved\);if\(prepared\)liveV2Authority\.rollbackPrepared\(prepared,error\)/);
  assert.match(matchHtml, /liveV2ControlApi\.rollback\(liveV2ControlRuntime,controlPlan,'outer-host-rollback'/);
  assert.match(matchHtml, /window\.FLLiveV2=Object\.freeze\(\{status:[\s\S]*?stop:\(\)=>liveV2Stop\('manual FL V2 strict stop'\)/);
  assert.match(matchHtml, /const liveV2LiveTick=liveV2RunTick\(\);if\(liveV2StrictStopped\|\|liveV2PeriodTransitionApplied\)return/);
  assert.match(matchHtml, /id="v2StrictFailurePage"[\s\S]*?Export diagnostic log[\s\S]*?Restart FL V2[\s\S]*?Exit to match setup/);
  assert.doesNotMatch(matchHtml, /FL V2 fallback · Build 173 active|build-173-fallback/);
  assert.match(matchHtml, /LIVE_V2_PREFLIGHT\.workflow==='single-player'/);
  assert.match(matchHtml, /LIVE_V2_PREFLIGHT\.workflow==='cpu-v-cpu'/);
  assert.match(matchHtml, /LIVE_V2_PREFLIGHT\.workflow==='set-piece-suite'/);
  assert.match(matchHtml, /controlOwnership:\{humanPlayerIds:\[\],cpuTeamIds:\['you','opp'\]\}/);
});

test('the exact-flag v2Shadow path remains offline, read-only and independently pinned', () => {
  const shadow = manifest.allowedCandidateDelta.liveShadowAttachment;
  const shadowPreflight = inlineScript('build173V2ShadowPreflight');
  assert.equal(shadow.id, 'build173-exact-flag-offline-read-only-shadow');
  assert.equal(shadow.exactFlag, 'v2Shadow=1');
  assert.equal(shadow.defaultLoadsV2, false);
  assert.equal(shadow.onlinePolicy, 'preflight-and-capture-frozen');
  assert.equal(shadow.armingPolicy, 'exact-workflow-method-bound-fail-closed');
  assert.equal(shadow.authority, 'build-173-legacy-update-only');
  assert.equal(shadow.liveProjectionAllowed, false);
  assert.equal(shadow.workflowRemovalAllowed, false);
  assert.match(shadowPreflight, /values=params\.getAll\('v2Shadow'\),requested=values\.length===1&&values\[0\]==='1'/);
  assert.match(shadowPreflight, /if\(!eligible\)return/);
  let priorIndex = -1;
  for (const filename of shadow.orderedScripts) {
    assert.equal(shadowPreflight.split(`'${filename}'`).length - 1, 1, `${filename} exact shadow loader entry`);
    const index = shadowPreflight.indexOf(`'${filename}'`);
    assert.ok(index > priorIndex, `${filename} shadow order`);
    priorIndex = index;
  }
  for (const [fileKey, hashKey] of [
    ['adapter', 'adapterSha256'], ['capture', 'captureSha256'], ['hook', 'hookSha256'],
    ['contract', 'contractSha256'], ['regressionGate', 'regressionGateSha256']
  ]) {
    assert.ok(existsSync(path.join(root, shadow[fileKey])), `${fileKey} must exist`);
    assert.equal(sha256(read(shadow[fileKey])), shadow[hashKey], `${fileKey} protected hash`);
  }
  assert.doesNotMatch(matchHtml, /build173V2Shadow\.(?:state|snapshot|commands?|apply|project|commit)\b/);
  assert.match(matchHtml, /getV2ShadowTelemetry/);
});

test('legacy maintenance and the additive Madrid contract remain sealed', () => {
  const delta = manifest.allowedCandidateDelta;
  assert.equal(delta.liveMaintenance.id, 'offside-restart-presentation-camera-policy');
  assert.equal(delta.liveMaintenance.authority, 'legacy-inline-only');
  assert.equal(delta.liveMaintenance.onlinePolicy, 'broadcast-camera-frozen');
  assert.ok(delta.liveMaintenance.scope.length >= 4);
  for (const [pathKey, hashKey] of [
    ['regressionGate', 'regressionGateSha256'],
    ['replayCleanupRegressionGate', 'replayCleanupRegressionGateSha256']
  ]) {
    assert.ok(existsSync(path.join(root, delta.liveMaintenance[pathKey])));
    assert.equal(sha256(read(delta.liveMaintenance[pathKey])), delta.liveMaintenance[hashKey]);
  }
  const madrid = delta.historicTeamAddition;
  assert.equal(madrid.id, 'madrid-real-2013-14');
  assert.equal(sha256(read(madrid.contract)), madrid.contractSha256);
  assert.equal(sha256(read(madrid.regressionGate)), madrid.regressionGateSha256);
  assert.equal(madrid.onlineChangesAllowed, false);
  assert.equal(madrid.workflowRemovalAllowed, false);
});

test('an optional external Build 173 reference can be verified without recording its local path', () => {
  if (!process.env.FL_BUILD_173_REFERENCE) return;
  const referenceRoot = path.resolve(process.env.FL_BUILD_173_REFERENCE);
  for (const entry of manifest.protectedFiles) {
    const referencePath = path.join(referenceRoot, entry.path);
    assert.ok(existsSync(referencePath), `${entry.path} external reference must exist`);
    assert.equal(sha256(readFileSync(referencePath)), entry.baselineSha256, `${entry.path} baseline hash`);
  }
});

test('the workflow matrix preserves all 14 workflows, with exactly three explicit opt-ins and 11 legacy paths', () => {
  assert.equal(matrix.schema, 'football-legacy-protected-workflow-matrix-v1');
  assert.equal(matrix.schemaVersion, '2.0.0');
  assert.equal(matrix.build, 173);
  assert.equal(matrix.candidateBuild, 174);
  assert.equal(matrix.policy.defaultAuthority, 'legacy');
  assert.equal(matrix.policy.replacementAllowedByThisMatrix, false);
  assert.equal(matrix.policy.explicitOfflineOptInAllowed, true);
  assert.equal(matrix.policy.explicitOfflineOptInAuthority, 'fl-v2');
  assert.equal(matrix.policy.removalAllowed, false);
  assert.equal(matrix.policy.silentRerouteAllowed, false);
  assert.equal(matrix.policy.onlineFoundationPolicy, 'frozen');
  assert.equal(matrix.policy.runtimeFailurePolicy, 'same-tick-rollback-then-strict-v2-stop');
  assert.deepEqual(matrix.policy.promotionOrder, [
    'legacy', 'shadow', 'suite-opt-in', 'offline-opt-in', 'migration-candidate', 'authoritative'
  ]);
  const required = [
    'single-player-quick-play', 'local-two-player', 'home-co-op', 'cpu-versus-cpu',
    'online-versus', 'input-devices', 'match-lifecycle', 'normal-match-set-pieces',
    'set-piece-suite', 'career-mode', 'create-a-club', 'player-career', 'content-inputs',
    'diagnostics-and-playtest-exports'
  ];
  assert.deepEqual(matrix.workflows.map(item => item.id).sort(), required.sort());
  const optIns = matrix.workflows.filter(item => item.authority === 'conditional-offline-opt-in');
  const legacy = matrix.workflows.filter(item => item.authority === 'legacy');
  assert.deepEqual(optIns.map(item => item.id), ['single-player-quick-play', 'cpu-versus-cpu', 'set-piece-suite']);
  assert.equal(legacy.length, 11);
  assert.deepEqual(matrix.policy.explicitOfflineOptInWorkflows, optIns.map(item => item.id));
  for (const workflow of optIns) {
    assert.equal(workflow.defaultAuthority, 'legacy');
    assert.equal(workflow.optInAuthority, 'fl-v2');
    assert.equal(workflow.activation.online, false);
    assert.equal(workflow.activation.requestedEngine, 'fl-v2');
    assert.equal(workflow.activation.requiresExactQueryAndPayloadAgreement, true);
  }
  const cpuWorkflow = matrix.workflows.find(item => item.id === 'cpu-versus-cpu');
  assert.equal(cpuWorkflow.activation.quickPlayMatchType, 'spectator');
  assert.equal(cpuWorkflow.activation.runtimeWorkflow, 'cpu-v-cpu');
  assert.equal(cpuWorkflow.activation.requiresExactAllCpuOwnership, true);
  assert.equal(cpuWorkflow.activation.requiresAutoplayQueryValue, '1');
  assert.deepEqual(cpuWorkflow.activation.controlOwnership, {
    humanPlayerIds: [], cpuTeamIds: ['you', 'opp']
  });
  for (const gate of [
    'engine-selector', 'payload-query-agreement', 'deterministic-seed', 'exact-all-cpu-ownership',
    'autoplay', 'ai-assignment', 'gameplay-authority', 'match-control', 'strict-v2-stop-no-legacy-continuation'
  ]) assert.ok(cpuWorkflow.requiredGates.includes(gate), `CPU v CPU requires ${gate}`);
  for (const workflow of matrix.workflows) {
    assert.ok(['protected', 'frozen'].includes(workflow.status));
    assert.ok(workflow.entryPoints.length > 0);
    assert.ok(workflow.requiredGates.length > 0);
    assert.doesNotMatch(JSON.stringify(workflow), /\b(?:removed|disabled|replaced)\b/i);
  }
});

test('online gameplay authority remains frozen to Build 173 through exact controller-only maintenance', () => {
  const online = manifest.protectedFiles.filter(entry => entry.path.startsWith('online/'));
  assert.deepEqual(online.map(entry => entry.path).sort(), ['online/app.js', 'online/index.html']);
  assert.deepEqual(online.map(entry => entry.expectedRelation).sort(), [
    'build-173-gameplay-authority-frozen-plus-controller-cache-bust',
    'build-173-gameplay-authority-frozen-plus-dualsense-reconnect-input-transport-maintenance'
  ]);
  const maintenance = manifest.allowedCandidateDelta.controllerReconnectMaintenance;
  assert.equal(maintenance.authority, 'input-transport-maintenance-only');
  assert.equal(maintenance.onlineGameplayAuthority, 'build-173-frozen');
  assert.equal(maintenance.onlineGameplayAuthorityChanged, false);
  for (const [relative, expected] of Object.entries(maintenance.files)) {
    assert.equal(sha256(read(relative)), expected, `${relative} reconnect maintenance hash`);
  }
  for (const [relative, expected] of Object.entries(maintenance.regressionGates)) {
    assert.equal(sha256(read(relative)), expected, `${relative} reconnect gate hash`);
  }
  assert.equal(matrix.workflows.find(item => item.id === 'online-versus').authority, 'legacy');
  assert.equal(manifest.allowedCandidateDelta.offlineOptInAuthority.onlinePolicy, 'frozen-to-build-173');
});
