import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const modulePath = path.join(root, 'match-engine', 'restart-presentation-v2.js');
const matchPath = path.join(root, 'match-engine', 'match.html');
const source = fs.readFileSync(modulePath, 'utf8');
const matchHtml = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Restart = require(modulePath);

function harness(workflow = Restart.WORKFLOWS.SINGLE_PLAYER, sessionId = 'restart-test-session') {
  const capability = Restart.createShadowCapability({
    grant: Restart.CAPABILITY_GRANT,
    runtimeMode: Restart.RUNTIME_MODE,
    authority: Restart.RUNTIME_AUTHORITY,
    sessionId,
    capabilityId: 'restart-test-capability'
  });
  const dormant = Restart.createState({ sessionId, metadata: { fixture: true } });
  const state = Restart.activate(dormant, capability, {
    runtimeMode: Restart.RUNTIME_MODE,
    authority: Restart.RUNTIME_AUTHORITY,
    workflow,
    online: false
  });
  return { dormant, capability, state };
}

function incident(overrides = {}) {
  return {
    id: 'offside-incident-0001',
    attackingTeam: 'home',
    defendingTeam: 'away',
    takerOwner: Restart.OWNERS.CPU,
    goalkeeperOwner: Restart.OWNERS.CONTROLLER_1,
    pitchHeight: 680,
    position: { x: 731.25, y: 92.5 },
    assistantRefs: [
      { id: 'lino1', touchline: 'north', x: 640, y: 10 },
      { id: 'lino2', touchline: 'south', x: 640, y: 670 }
    ],
    metadata: { source: 'offside-reception' },
    ...overrides
  };
}

function runToCompletion(workflow = Restart.WORKFLOWS.SINGLE_PLAYER, startTick = 100, overrides = {}) {
  const { capability, state } = harness(workflow);
  const started = Restart.beginOffsidePresentation(state, capability, incident(overrides), startTick);
  return {
    capability,
    started,
    complete: Restart.advance(started, capability, startTick + 93)
  };
}

test('Restart Presentation V2 exposes a complete browser/CommonJS dormant API', () => {
  assert.equal(Restart.VERSION, '2.0.0-dormant');
  assert.equal(Restart.STATE_SCHEMA, 'football-legacy-restart-presentation-v2-state');
  for (const name of [
    'createState', 'createShadowCapability', 'activate', 'beginOffsidePresentation',
    'advance', 'selectAssistant', 'resolveCameraPolicy', 'commandsSince',
    'createExportPayload', 'stateSignature'
  ]) assert.equal(typeof Restart[name], 'function', name);

  const browserWindow = {};
  vm.runInNewContext(source, { window: browserWindow });
  assert.equal(browserWindow.FootballLegacyRestartPresentationV2.VERSION, Restart.VERSION);
  assert.equal(typeof browserWindow.FootballLegacyRestartPresentationV2.advance, 'function');
});

test('DORMANT GATE: live match neither loads nor invokes the candidate', () => {
  assert.doesNotMatch(matchHtml, /<script[^>]+restart-presentation-v2\.js/i);
  assert.doesNotMatch(matchHtml, /FootballLegacyRestartPresentationV2/);
  const state = Restart.createState();
  assert.equal(state.enabled, false);
  assert.equal(state.phase, Restart.PHASES.IDLE);
  assert.equal(state.authority, 'dormant-restart-presentation-candidate');
  assert.equal(state.runtimeMode, null);
  assert.equal(state.runtimeAuthority, null);
  assert.equal(state.commands.length, 0);
  assert.equal(state.events.length, 0);
});

test('candidate has no random, wall clock, presentation clock, DOM, renderer or async authority', () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /\bDate\s*[.(]/);
  assert.doesNotMatch(source, /performance\s*\./);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /document\s*\./);
  assert.doesNotMatch(source, /THREE\s*\./);
  assert.doesNotMatch(source, /CANNON\s*\./);
});

test('normal-match and forged capabilities cannot activate candidate authority', () => {
  assert.throws(() => Restart.createShadowCapability({
    grant: Restart.CAPABILITY_GRANT,
    runtimeMode: 'normal-match',
    authority: 'match-authority'
  }), /explicit dormant shadow grant/);

  const { dormant, capability } = harness();
  assert.throws(() => Restart.activate(dormant, capability, {
    runtimeMode: 'normal-match',
    authority: 'match-authority',
    workflow: Restart.WORKFLOWS.SINGLE_PLAYER
  }), /live or normal-match authority/);
  assert.throws(() => Restart.activate(dormant, capability, {
    runtimeMode: Restart.RUNTIME_MODE,
    authority: Restart.RUNTIME_AUTHORITY,
    workflow: Restart.WORKFLOWS.SINGLE_PLAYER,
    normalMatchAuthority: true
  }), /live or normal-match authority/);
  assert.throws(() => Restart.beginOffsidePresentation(dormant, capability, incident(), 0), /dormant/);
  assert.equal(dormant.commands.length, 0);
});

test('online and remote-owned presentation paths remain frozen with no authority leak', () => {
  const sessionId = 'online-restart-session';
  const capability = Restart.createShadowCapability({
    grant: Restart.CAPABILITY_GRANT,
    runtimeMode: Restart.RUNTIME_MODE,
    authority: Restart.RUNTIME_AUTHORITY,
    sessionId,
    capabilityId: 'online-restart-capability'
  });
  const dormant = Restart.createState({ sessionId });
  assert.throws(() => Restart.activate(dormant, capability, {
    runtimeMode: Restart.RUNTIME_MODE,
    authority: Restart.RUNTIME_AUTHORITY,
    workflow: Restart.WORKFLOWS.ONLINE_VERSUS,
    online: true
  }), /online workflows are frozen/);

  const remotePolicy = Restart.resolveCameraPolicy({
    workflow: Restart.WORKFLOWS.SINGLE_PLAYER,
    restartKind: Restart.RESTART_KINDS.FREE_KICK,
    takerOwner: Restart.OWNERS.ONLINE_REMOTE,
    goalkeeperOwner: Restart.OWNERS.CPU
  });
  assert.equal(remotePolicy.preset, Restart.CAMERA_PRESETS.BROADCAST);
  assert.equal(remotePolicy.frozen, true);
  assert.equal(remotePolicy.authority, Restart.RUNTIME_AUTHORITY);

  const { state } = harness();
  assert.throws(() => Restart.beginOffsidePresentation(state, capability, incident({
    takerOwner: Restart.OWNERS.ONLINE_REMOTE
  }), 0), /matching Restart Presentation V2 shadow capability|remote-owned/);
  assert.equal(dormant.enabled, false);
  assert.equal(dormant.commands.length, 0);
});

test('fixed-tick state machine follows the exact whistle-to-handoff sequence', () => {
  const { capability, started } = runToCompletion();
  const checkpoints = [
    [started, 100, Restart.PHASES.WHISTLE, false],
    [Restart.advance(started, capability, 101), 101, Restart.PHASES.FREEZE_GAMEPLAY, true],
    [Restart.advance(started, capability, 107), 107, Restart.PHASES.SELECT_ASSISTANT, true],
    [Restart.advance(started, capability, 108), 108, Restart.PHASES.CAMERA_PAN, true],
    [Restart.advance(started, capability, 138), 138, Restart.PHASES.FLAG_RAISE, true],
    [Restart.advance(started, capability, 150), 150, Restart.PHASES.FLAG_HOLD, true],
    [Restart.advance(started, capability, 192), 192, Restart.PHASES.FREE_KICK_HANDOFF, false],
    [Restart.advance(started, capability, 193), 193, Restart.PHASES.COMPLETE, false]
  ];
  for (const [state, tick, phase, freeze] of checkpoints) {
    assert.equal(state.currentTick, tick);
    assert.equal(state.phase, phase);
    assert.equal(state.advisoryFreeze, freeze);
  }
  assert.equal(checkpoints.at(-1)[0].active, false);
});

test('state machine emits ordered structured commands at exact simulation ticks', () => {
  const { complete } = runToCompletion();
  assert.deepEqual(complete.commands.map(command => [command.simulationTick, command.type]), [
    [100, Restart.COMMANDS.PLAY_WHISTLE],
    [101, Restart.COMMANDS.FREEZE_GAMEPLAY],
    [107, Restart.COMMANDS.SELECT_ASSISTANT],
    [108, Restart.COMMANDS.PAN_CAMERA],
    [138, Restart.COMMANDS.SET_FLAG],
    [150, Restart.COMMANDS.SET_FLAG],
    [192, Restart.COMMANDS.SET_FLAG],
    [192, Restart.COMMANDS.RESTORE_CAMERA],
    [192, Restart.COMMANDS.HANDOFF_FREE_KICK],
    [192, Restart.COMMANDS.FREEZE_GAMEPLAY]
  ]);
  assert.deepEqual(complete.commands.map(command => command.sequence), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(complete.commands.every(command => command.schema === Restart.COMMAND_SCHEMA));
  assert.ok(complete.commands.every(command => command.authority === Restart.RUNTIME_AUTHORITY));
  assert.ok(complete.commands.every(command => command.advisoryOnly === true));
  assert.deepEqual(complete.commands.filter(command => command.type === Restart.COMMANDS.SET_FLAG)
    .map(command => command.payload.state), ['raise', 'hold', 'lower']);
});

test('free-kick handoff is issued exactly once and releases freeze only after handoff', () => {
  const { capability, complete } = runToCompletion();
  const handoffs = complete.commands.filter(command => command.type === Restart.COMMANDS.HANDOFF_FREE_KICK);
  assert.equal(handoffs.length, 1);
  assert.deepEqual(handoffs[0].payload, {
    kind: 'FREE KICK',
    team: 'away',
    position: { x: 731.25, y: 92.5 },
    adapterPoint: "restart('FREE KICK', defendingTeam, x, y)",
    exactlyOnce: true
  });
  const handoffIndex = complete.commands.indexOf(handoffs[0]);
  const releaseIndex = complete.commands.findIndex(command =>
    command.type === Restart.COMMANDS.FREEZE_GAMEPLAY && command.payload.frozen === false);
  assert.ok(handoffIndex < releaseIndex);
  const later = Restart.advance(complete, capability, 500);
  assert.equal(later.commands.filter(command => command.type === Restart.COMMANDS.HANDOFF_FREE_KICK).length, 1);
  assert.equal(later.commands.length, complete.commands.length);
});

test('appropriate existing assistant is selected deterministically by incident touchline', () => {
  const north = runToCompletion(Restart.WORKFLOWS.SINGLE_PLAYER, 0, {
    position: { x: 500, y: 330 }
  }).complete;
  const south = runToCompletion(Restart.WORKFLOWS.SINGLE_PLAYER, 0, {
    position: { x: 500, y: 331 },
    pitchHeight: 660,
    assistantRefs: [
      { id: 'existing-north', touchline: 'north', x: 500, y: 10 },
      { id: 'existing-south', touchline: 'south', x: 500, y: 650 }
    ]
  }).complete;
  assert.equal(north.selectedAssistantId, 'lino1');
  assert.equal(south.selectedAssistantId, 'existing-south');
  assert.ok(north.incident.assistantRefs.some(entry => entry.id === north.selectedAssistantId));
  assert.ok(south.incident.assistantRefs.some(entry => entry.id === south.selectedAssistantId));
  const select = south.commands.find(command => command.type === Restart.COMMANDS.SELECT_ASSISTANT);
  assert.equal(select.payload.reuseExistingActor, true);
  assert.equal(select.payload.actorType, 'assistant-referee');
  assert.equal(select.payload.touchline, 'south');
});

test('human and CPU free-kick, corner and goal-kick camera policy is exact', () => {
  for (const restartKind of [
    Restart.RESTART_KINDS.FREE_KICK,
    Restart.RESTART_KINDS.CORNER,
    Restart.RESTART_KINDS.GOAL_KICK
  ]) {
    for (const takerOwner of [
      Restart.OWNERS.KEYBOARD,
      Restart.OWNERS.CONTROLLER_1,
      Restart.OWNERS.CONTROLLER_2
    ]) {
      const policy = Restart.resolveCameraPolicy({
        workflow: Restart.WORKFLOWS.HOME_COOP,
        restartKind,
        takerOwner,
        goalkeeperOwner: Restart.OWNERS.CPU
      });
      assert.equal(policy.preset, Restart.CAMERA_PRESETS.SET_PIECE_SPECIAL);
      assert.equal(policy.reason, 'human-set-piece-taker');
      assert.equal(policy.frozen, false);
    }
    const cpu = Restart.resolveCameraPolicy({
      workflow: Restart.WORKFLOWS.CPU_V_CPU,
      restartKind,
      takerOwner: Restart.OWNERS.CPU,
      goalkeeperOwner: Restart.OWNERS.CPU
    });
    assert.equal(cpu.preset, Restart.CAMERA_PRESETS.BROADCAST);
    assert.equal(cpu.reason, 'cpu-broadcast');
  }
});

test('penalty camera policy preserves taker, save and CPU broadcast angles', () => {
  const humanTaker = Restart.resolveCameraPolicy({
    workflow: Restart.WORKFLOWS.LOCAL_VERSUS,
    restartKind: Restart.RESTART_KINDS.PENALTY,
    takerOwner: Restart.OWNERS.CONTROLLER_2,
    goalkeeperOwner: Restart.OWNERS.CONTROLLER_1
  });
  assert.equal(humanTaker.preset, Restart.CAMERA_PRESETS.PENALTY_TAKER);
  assert.equal(humanTaker.reason, 'human-penalty-taker');

  const humanKeeper = Restart.resolveCameraPolicy({
    workflow: Restart.WORKFLOWS.SINGLE_PLAYER,
    restartKind: Restart.RESTART_KINDS.PENALTY,
    takerOwner: Restart.OWNERS.CPU,
    goalkeeperOwner: Restart.OWNERS.CONTROLLER_1
  });
  assert.equal(humanKeeper.preset, Restart.CAMERA_PRESETS.PENALTY_SAVE);
  assert.equal(humanKeeper.reason, 'cpu-penalty-human-goalkeeper');

  const cpu = Restart.resolveCameraPolicy({
    workflow: Restart.WORKFLOWS.CPU_V_CPU,
    restartKind: Restart.RESTART_KINDS.PENALTY,
    takerOwner: Restart.OWNERS.CPU,
    goalkeeperOwner: Restart.OWNERS.CPU
  });
  assert.equal(cpu.preset, Restart.CAMERA_PRESETS.BROADCAST);
  assert.equal(cpu.reason, 'cpu-penalty-broadcast');
});

test('camera resolver covers the exhaustive workflow/controller ownership matrix', () => {
  let cases = 0;
  for (const workflow of Object.values(Restart.WORKFLOWS)) {
    for (const restartKind of Object.values(Restart.RESTART_KINDS)) {
      for (const takerOwner of Object.values(Restart.OWNERS)) {
        for (const goalkeeperOwner of Object.values(Restart.OWNERS)) {
          const policy = Restart.resolveCameraPolicy({ workflow, restartKind, takerOwner, goalkeeperOwner });
          const frozen = workflow === Restart.WORKFLOWS.ONLINE_VERSUS ||
            takerOwner === Restart.OWNERS.ONLINE_REMOTE ||
            goalkeeperOwner === Restart.OWNERS.ONLINE_REMOTE;
          let expected = Restart.CAMERA_PRESETS.BROADCAST;
          if (!frozen && restartKind === Restart.RESTART_KINDS.PENALTY) {
            if ([Restart.OWNERS.KEYBOARD, Restart.OWNERS.CONTROLLER_1, Restart.OWNERS.CONTROLLER_2]
              .includes(takerOwner)) expected = Restart.CAMERA_PRESETS.PENALTY_TAKER;
            else if (takerOwner === Restart.OWNERS.CPU &&
              [Restart.OWNERS.KEYBOARD, Restart.OWNERS.CONTROLLER_1, Restart.OWNERS.CONTROLLER_2]
                .includes(goalkeeperOwner)) expected = Restart.CAMERA_PRESETS.PENALTY_SAVE;
          } else if (!frozen &&
            [Restart.OWNERS.KEYBOARD, Restart.OWNERS.CONTROLLER_1, Restart.OWNERS.CONTROLLER_2]
              .includes(takerOwner)) expected = Restart.CAMERA_PRESETS.SET_PIECE_SPECIAL;
          assert.equal(policy.preset, expected, `${workflow}/${restartKind}/${takerOwner}/${goalkeeperOwner}`);
          assert.equal(policy.frozen, frozen);
          cases += 1;
        }
      }
    }
  }
  assert.equal(cases, 6 * 4 * 5 * 5);
});

test('every offline workflow can be observed with capability but gains no live authority', () => {
  for (const workflow of Object.values(Restart.WORKFLOWS).filter(value =>
    value !== Restart.WORKFLOWS.ONLINE_VERSUS)) {
    const { state } = harness(workflow, `workflow-${workflow}`);
    assert.equal(state.workflow, workflow);
    assert.equal(state.runtimeAuthority, Restart.RUNTIME_AUTHORITY);
    assert.equal(state.authority, Restart.AUTHORITY);
    assert.equal(state.online, false);
    assert.equal(state.commands.length, 0);
  }
});

test('identical initial state, incident and tick trace replay byte-for-byte', () => {
  const first = runToCompletion().complete;
  const second = runToCompletion().complete;
  assert.equal(Restart.stateSignature(first), Restart.stateSignature(second));
  assert.deepEqual(first, second);
  assert.deepEqual(first.commands.map(command => command.id), second.commands.map(command => command.id));
  assert.deepEqual(first.events.map(event => event.id), second.events.map(event => event.id));
});

test('export and incremental command payloads are stable and JSON-safe', () => {
  const { complete } = runToCompletion();
  const payload = Restart.createExportPayload(complete);
  assert.equal(payload.schema, Restart.EXPORT_SCHEMA);
  assert.equal(payload.dormant, true);
  assert.equal(payload.phase, Restart.PHASES.COMPLETE);
  assert.equal(payload.commands.length, 10);
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
  assert.ok(Object.isFrozen(payload));
  assert.deepEqual(Restart.commandsSince(complete, 8).map(command => command.sequence), [9, 10]);
  assert.deepEqual(Restart.commandsSince(complete, 10), []);
});

test('invalid incidents, regressions and non-JSON metadata fail closed', () => {
  const { state, capability } = harness();
  assert.throws(() => Restart.beginOffsidePresentation(state, capability, incident({
    assistantRefs: [{ id: 'lino1', touchline: 'north', x: 0, y: 10 }]
  }), 0), /must supply the existing assistant referees/);
  assert.throws(() => Restart.beginOffsidePresentation(state, capability, incident({
    assistantRefs: [
      { id: 'duplicate', touchline: 'north', x: 0, y: 10 },
      { id: 'duplicate', touchline: 'south', x: 0, y: 670 }
    ]
  }), 0), /ids must be unique/);
  assert.throws(() => Restart.beginOffsidePresentation(state, capability, incident({
    position: { x: 0, y: 999 }
  }), 0), /inside the pitch height/);
  assert.throws(() => Restart.beginOffsidePresentation(state, capability, incident({
    metadata: { invalid: undefined }
  }), 0), /must not be undefined/);
  assert.throws(() => Restart.resolveCameraPolicy({
    workflow: 'unknown',
    restartKind: Restart.RESTART_KINDS.FREE_KICK,
    takerOwner: Restart.OWNERS.CPU
  }), /unsupported/);

  const started = Restart.beginOffsidePresentation(state, capability, incident(), 10);
  assert.throws(() => Restart.advance(started, capability, 9), /cannot move backwards/);
  assert.throws(() => Restart.beginOffsidePresentation(started, capability, incident(), 11), /already active/);
});

test('coexistence contract retains the audited legacy adapter points and workflows', () => {
  assert.match(matchHtml, /offsideCandidate=null;if\(!beginOffsidePresentation\(offence,b,defendingTeam\)\)restart\('FREE KICK',defendingTeam,b\.x,b\.y\);return;/);
  assert.match(matchHtml, /function updateOffsidePresentation\(now=performance\.now\(\)\)/);
  assert.match(matchHtml, /logEvent\('offside-presentation-handoff'/);
  assert.doesNotMatch(matchHtml, /showEvent\('OFFSIDE',800\);restart\('FREE KICK'/);
  assert.match(matchHtml, /lino1Mesh=playerMesh\(\{kind:'assistant'\}\)/);
  assert.match(matchHtml, /lino2Mesh=playerMesh\(\{kind:'assistant'\}\)/);
  assert.match(matchHtml, /humanoidRole='assistant-referee'/);
  assert.match(matchHtml, /lino1\.y=10/);
  assert.match(matchHtml, /lino2\.y=H-10/);
  assert.match(matchHtml, /function restart\(kind, team, x, y, fromFoul=false,forcedTaker=null\)/);
  assert.match(matchHtml, /function camFollow\(\)/);
  assert.match(matchHtml, /const ONLINE_ROLE=/);
  assert.match(matchHtml, /const SECOND_CONTROLLER_TEAM=/);
  assert.match(matchHtml, /const SAME_TEAM_COOP=/);
});
