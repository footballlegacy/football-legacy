'use strict';

/*
 * Football Legacy Restart Presentation V2
 *
 * Dormant, deterministic presentation planning for an offside decision. The
 * module emits JSON-safe commands for a future adapter; it never pauses live
 * gameplay, moves a camera, animates an official, or starts a restart itself.
 */
(function exposeRestartPresentationV2(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyRestartPresentationV2 = api;
})(typeof window === 'object' ? window : null, function createRestartPresentationV2Api() {
  'use strict';

  const VERSION = '2.0.0-dormant';
  const STATE_SCHEMA = 'football-legacy-restart-presentation-v2-state';
  const CAPABILITY_SCHEMA = 'football-legacy-restart-presentation-v2-capability';
  const INCIDENT_SCHEMA = 'football-legacy-restart-presentation-v2-incident';
  const COMMAND_SCHEMA = 'football-legacy-restart-presentation-v2-command';
  const EVENT_SCHEMA = 'football-legacy-restart-presentation-v2-event';
  const EXPORT_SCHEMA = 'football-legacy-restart-presentation-v2-export';
  const CAMERA_POLICY_SCHEMA = 'football-legacy-restart-presentation-v2-camera-policy';
  const AUTHORITY = 'dormant-restart-presentation-candidate';
  const CAPABILITY_SCOPE = 'restart-presentation-v2-shadow-only';
  const CAPABILITY_GRANT = 'enable-restart-presentation-v2-shadow';
  const RUNTIME_MODE = 'restart-presentation-shadow';
  const RUNTIME_AUTHORITY = 'candidate-observer';

  const PHASES = Object.freeze({
    IDLE: 'idle',
    WHISTLE: 'whistle',
    FREEZE_GAMEPLAY: 'freeze-gameplay',
    SELECT_ASSISTANT: 'select-assistant',
    CAMERA_PAN: 'camera-pan',
    FLAG_RAISE: 'flag-raise',
    FLAG_HOLD: 'flag-hold',
    FREE_KICK_HANDOFF: 'free-kick-handoff',
    COMPLETE: 'complete'
  });

  const PHASE_ORDER = Object.freeze([
    PHASES.WHISTLE,
    PHASES.FREEZE_GAMEPLAY,
    PHASES.SELECT_ASSISTANT,
    PHASES.CAMERA_PAN,
    PHASES.FLAG_RAISE,
    PHASES.FLAG_HOLD,
    PHASES.FREE_KICK_HANDOFF,
    PHASES.COMPLETE
  ]);

  const PHASE_DURATIONS = deepFreeze({
    [PHASES.WHISTLE]: 1,
    [PHASES.FREEZE_GAMEPLAY]: 6,
    [PHASES.SELECT_ASSISTANT]: 1,
    [PHASES.CAMERA_PAN]: 30,
    [PHASES.FLAG_RAISE]: 12,
    [PHASES.FLAG_HOLD]: 42,
    [PHASES.FREE_KICK_HANDOFF]: 1,
    [PHASES.COMPLETE]: 0
  });

  const RESTART_KINDS = Object.freeze({
    FREE_KICK: 'free-kick',
    CORNER: 'corner',
    GOAL_KICK: 'goal-kick',
    PENALTY: 'penalty'
  });

  const WORKFLOWS = Object.freeze({
    SINGLE_PLAYER: 'single-player',
    LOCAL_VERSUS: 'local-versus',
    HOME_COOP: 'home-co-op',
    CPU_V_CPU: 'cpu-v-cpu',
    SET_PIECE_SUITE: 'set-piece-suite',
    ONLINE_VERSUS: 'online-versus'
  });

  const OWNERS = Object.freeze({
    CPU: 'cpu',
    KEYBOARD: 'keyboard',
    CONTROLLER_1: 'controller-1',
    CONTROLLER_2: 'controller-2',
    ONLINE_REMOTE: 'online-remote'
  });

  const CAMERA_PRESETS = Object.freeze({
    SET_PIECE_SPECIAL: 'set-piece-special',
    BROADCAST: 'broadcast',
    PENALTY_SAVE: 'penalty-save',
    PENALTY_TAKER: 'penalty-taker'
  });

  const COMMANDS = Object.freeze({
    PLAY_WHISTLE: 'audio.whistle.play',
    FREEZE_GAMEPLAY: 'gameplay.freeze',
    SELECT_ASSISTANT: 'assistant-referee.select',
    PAN_CAMERA: 'camera.pan',
    SET_FLAG: 'assistant-referee.flag',
    RESTORE_CAMERA: 'camera.restore',
    HANDOFF_FREE_KICK: 'restart.free-kick.handoff'
  });

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return value;
  }

  function copyJson(value, label, seen) {
    const name = label || 'value';
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError(name + ' must contain only finite JSON numbers');
      return Number(value);
    }
    if (typeof value !== 'object') throw new TypeError(name + ' must be JSON-safe');
    const stack = seen || new Set();
    if (stack.has(value)) throw new TypeError(name + ' must not contain circular references');
    stack.add(value);
    let result;
    if (Array.isArray(value)) {
      result = value.map((entry, index) => copyJson(entry, name + '[' + index + ']', stack));
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(name + ' must contain only plain JSON objects');
      }
      result = {};
      for (const key of Object.keys(value)) {
        if (value[key] === undefined) throw new TypeError(name + '.' + key + ' must not be undefined');
        result[key] = copyJson(value[key], name + '.' + key, stack);
      }
    }
    stack.delete(value);
    return result;
  }

  function identifier(value, fallback, label) {
    const result = value == null ? fallback : String(value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(result)) {
      throw new TypeError((label || 'id') + ' must be a stable identifier');
    }
    return result;
  }

  function finite(value, fallback, label) {
    const result = value == null ? fallback : value;
    if (!Number.isFinite(result)) throw new TypeError((label || 'value') + ' must be finite');
    return Number(result);
  }

  function nonNegativeInteger(value, fallback, label) {
    const result = value == null ? fallback : value;
    if (!Number.isInteger(result) || result < 0) {
      throw new TypeError((label || 'value') + ' must be a non-negative integer');
    }
    return result;
  }

  function member(value, allowed, label) {
    const result = String(value || '');
    if (!allowed.includes(result)) {
      throw new RangeError((label || 'value') + ' is unsupported: ' + result);
    }
    return result;
  }

  function sequenceId(sessionId, kind, sequence) {
    return sessionId + ':' + kind + ':' + String(sequence).padStart(6, '0');
  }

  function isLocalHuman(owner) {
    return owner === OWNERS.KEYBOARD || owner === OWNERS.CONTROLLER_1 || owner === OWNERS.CONTROLLER_2;
  }

  function resolveCameraPolicy(input) {
    const source = input && typeof input === 'object' ? input : {};
    const workflow = member(source.workflow, Object.values(WORKFLOWS), 'camera.workflow');
    const restartKind = member(source.restartKind, Object.values(RESTART_KINDS), 'camera.restartKind');
    const takerOwner = member(source.takerOwner, Object.values(OWNERS), 'camera.takerOwner');
    const goalkeeperOwner = member(source.goalkeeperOwner == null ? OWNERS.CPU : source.goalkeeperOwner,
      Object.values(OWNERS), 'camera.goalkeeperOwner');
    const onlineFrozen = workflow === WORKFLOWS.ONLINE_VERSUS ||
      takerOwner === OWNERS.ONLINE_REMOTE || goalkeeperOwner === OWNERS.ONLINE_REMOTE;
    let preset = CAMERA_PRESETS.BROADCAST;
    let reason = 'cpu-broadcast';

    if (onlineFrozen) {
      reason = 'online-candidate-frozen';
    } else if (restartKind === RESTART_KINDS.PENALTY) {
      if (isLocalHuman(takerOwner)) {
        preset = CAMERA_PRESETS.PENALTY_TAKER;
        reason = 'human-penalty-taker';
      } else if (takerOwner === OWNERS.CPU && isLocalHuman(goalkeeperOwner)) {
        preset = CAMERA_PRESETS.PENALTY_SAVE;
        reason = 'cpu-penalty-human-goalkeeper';
      } else {
        reason = 'cpu-penalty-broadcast';
      }
    } else if (isLocalHuman(takerOwner)) {
      preset = CAMERA_PRESETS.SET_PIECE_SPECIAL;
      reason = 'human-set-piece-taker';
    }

    return deepFreeze({
      schema: CAMERA_POLICY_SCHEMA,
      workflow,
      restartKind,
      takerOwner,
      goalkeeperOwner,
      preset,
      reason,
      frozen: onlineFrozen,
      authority: RUNTIME_AUTHORITY
    });
  }

  function normalizeAssistantRef(input, pitchHeight, index) {
    if (!input || typeof input !== 'object') throw new TypeError('assistantRefs[' + index + '] must be an object');
    const y = finite(input.y, null, 'assistantRefs[' + index + '].y');
    const inferredTouchline = y <= pitchHeight / 2 ? 'north' : 'south';
    const touchline = member(input.touchline == null ? inferredTouchline : input.touchline,
      ['north', 'south'], 'assistantRefs[' + index + '].touchline');
    return {
      id: identifier(input.id, null, 'assistantRefs[' + index + '].id'),
      actorType: 'assistant-referee',
      touchline,
      x: finite(input.x, 0, 'assistantRefs[' + index + '].x'),
      y
    };
  }

  function normalizeIncident(input, sequence, sessionId) {
    const source = input && typeof input === 'object' ? input : {};
    const pitchHeight = finite(source.pitchHeight, null, 'incident.pitchHeight');
    if (!(pitchHeight > 0)) throw new RangeError('incident.pitchHeight must be greater than zero');
    const positionSource = source.position && typeof source.position === 'object' ? source.position : {};
    const position = {
      x: finite(positionSource.x, null, 'incident.position.x'),
      y: finite(positionSource.y, null, 'incident.position.y')
    };
    if (position.y < 0 || position.y > pitchHeight) {
      throw new RangeError('incident.position.y must be inside the pitch height');
    }
    if (!Array.isArray(source.assistantRefs) || source.assistantRefs.length < 2) {
      throw new TypeError('incident.assistantRefs must supply the existing assistant referees');
    }
    const assistantRefs = source.assistantRefs.map((entry, index) =>
      normalizeAssistantRef(entry, pitchHeight, index));
    if (new Set(assistantRefs.map(entry => entry.id)).size !== assistantRefs.length) {
      throw new TypeError('incident.assistantRefs ids must be unique');
    }
    for (const touchline of ['north', 'south']) {
      if (!assistantRefs.some(entry => entry.touchline === touchline)) {
        throw new TypeError('incident.assistantRefs must include an existing ' + touchline + ' assistant');
      }
    }
    const cameraPolicy = resolveCameraPolicy({
      workflow: source.workflow,
      restartKind: RESTART_KINDS.FREE_KICK,
      takerOwner: source.takerOwner,
      goalkeeperOwner: source.goalkeeperOwner == null ? OWNERS.CPU : source.goalkeeperOwner
    });
    if (cameraPolicy.frozen) throw new Error('online or remote-owned incidents cannot start candidate presentation');
    return deepFreeze({
      schema: INCIDENT_SCHEMA,
      id: identifier(source.id, sequenceId(sessionId, 'incident', sequence), 'incident.id'),
      type: 'offside',
      restartKind: RESTART_KINDS.FREE_KICK,
      workflow: cameraPolicy.workflow,
      attackingTeam: identifier(source.attackingTeam, null, 'incident.attackingTeam'),
      defendingTeam: identifier(source.defendingTeam, null, 'incident.defendingTeam'),
      takerOwner: cameraPolicy.takerOwner,
      goalkeeperOwner: cameraPolicy.goalkeeperOwner,
      pitchHeight,
      position,
      assistantRefs,
      cameraPolicy,
      metadata: copyJson(source.metadata || {}, 'incident.metadata')
    });
  }

  function selectAssistant(incident) {
    if (!incident || incident.schema !== INCIDENT_SCHEMA) throw new TypeError('incident is invalid');
    const touchline = incident.position.y <= incident.pitchHeight / 2 ? 'north' : 'south';
    const candidates = incident.assistantRefs.filter(entry => entry.touchline === touchline);
    candidates.sort((a, b) => {
      const distance = Math.abs(a.y - incident.position.y) - Math.abs(b.y - incident.position.y);
      if (distance !== 0) return distance;
      return a.id.localeCompare(b.id);
    });
    return deepFreeze(copyJson(candidates[0], 'selectedAssistant'));
  }

  function createState(input) {
    const source = input && typeof input === 'object' ? input : {};
    return deepFreeze({
      schema: STATE_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      sessionId: identifier(source.sessionId, 'restart-presentation-session-0001', 'sessionId'),
      enabled: false,
      runtimeMode: null,
      runtimeAuthority: null,
      workflow: null,
      capabilityId: null,
      online: false,
      phase: PHASES.IDLE,
      active: false,
      advisoryFreeze: false,
      currentTick: 0,
      phaseStartedTick: null,
      phaseDeadlineTick: null,
      incident: null,
      selectedAssistantId: null,
      sequences: { incident: 0, command: 0, event: 0 },
      commands: [],
      events: [],
      metadata: copyJson(source.metadata || {}, 'state.metadata')
    });
  }

  function assertState(state) {
    if (!state || typeof state !== 'object' || state.schema !== STATE_SCHEMA || state.authority !== AUTHORITY) {
      throw new TypeError('state must be a Restart Presentation V2 candidate state');
    }
    return state;
  }

  function capabilityToken(sessionId, capabilityId) {
    return CAPABILITY_SCOPE + ':' + sessionId + ':' + capabilityId;
  }

  function createShadowCapability(input) {
    const source = input && typeof input === 'object' ? input : {};
    if (source.grant !== CAPABILITY_GRANT || source.runtimeMode !== RUNTIME_MODE ||
        source.authority !== RUNTIME_AUTHORITY) {
      throw new TypeError('capability requires the explicit dormant shadow grant');
    }
    const sessionId = identifier(source.sessionId, 'restart-presentation-session-0001', 'capability.sessionId');
    const capabilityId = identifier(source.capabilityId, 'restart-presentation-capability-0001', 'capability.capabilityId');
    return deepFreeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      grant: CAPABILITY_GRANT,
      scope: CAPABILITY_SCOPE,
      runtimeMode: RUNTIME_MODE,
      authority: RUNTIME_AUTHORITY,
      sessionId,
      capabilityId,
      token: capabilityToken(sessionId, capabilityId)
    });
  }

  function assertCapability(capability, sessionId) {
    if (!capability || capability.schema !== CAPABILITY_SCHEMA || capability.grant !== CAPABILITY_GRANT ||
        capability.scope !== CAPABILITY_SCOPE || capability.runtimeMode !== RUNTIME_MODE ||
        capability.authority !== RUNTIME_AUTHORITY || capability.sessionId !== sessionId ||
        capability.token !== capabilityToken(capability.sessionId, capability.capabilityId)) {
      throw new TypeError('a matching Restart Presentation V2 shadow capability is required');
    }
    return capability;
  }

  function mutableState(state) {
    assertState(state);
    return copyJson(state, 'state');
  }

  function appendEvent(next, type, tick, payload) {
    next.sequences.event += 1;
    const event = {
      schema: EVENT_SCHEMA,
      id: sequenceId(next.sessionId, 'event', next.sequences.event),
      sequence: next.sequences.event,
      simulationTick: nonNegativeInteger(tick, 0, 'event.simulationTick'),
      type,
      phase: next.phase,
      incidentId: next.incident ? next.incident.id : null,
      payload: copyJson(payload || {}, 'event.payload')
    };
    next.events.push(event);
    return event;
  }

  function appendCommand(next, type, tick, payload) {
    next.sequences.command += 1;
    const command = {
      schema: COMMAND_SCHEMA,
      id: sequenceId(next.sessionId, 'command', next.sequences.command),
      sequence: next.sequences.command,
      simulationTick: nonNegativeInteger(tick, 0, 'command.simulationTick'),
      type,
      phase: next.phase,
      incidentId: next.incident ? next.incident.id : null,
      authority: RUNTIME_AUTHORITY,
      advisoryOnly: true,
      payload: copyJson(payload || {}, 'command.payload')
    };
    next.commands.push(command);
    return command;
  }

  function activate(state, capability, context) {
    assertState(state);
    assertCapability(capability, state.sessionId);
    const source = context && typeof context === 'object' ? context : {};
    const workflow = member(source.workflow, Object.values(WORKFLOWS), 'context.workflow');
    if (source.runtimeMode !== RUNTIME_MODE || source.authority !== RUNTIME_AUTHORITY ||
        source.normalMatchAuthority === true) {
      throw new Error('live or normal-match authority cannot activate the dormant candidate');
    }
    if (source.online === true || workflow === WORKFLOWS.ONLINE_VERSUS) {
      throw new Error('online workflows are frozen out of Restart Presentation V2');
    }
    const next = mutableState(state);
    next.enabled = true;
    next.runtimeMode = RUNTIME_MODE;
    next.runtimeAuthority = RUNTIME_AUTHORITY;
    next.workflow = workflow;
    next.capabilityId = capability.capabilityId;
    next.online = false;
    appendEvent(next, 'candidate-activated', next.currentTick, { workflow, scope: CAPABILITY_SCOPE });
    return deepFreeze(next);
  }

  function assertAccess(state, capability) {
    assertState(state);
    assertCapability(capability, state.sessionId);
    if (!state.enabled || state.runtimeMode !== RUNTIME_MODE || state.runtimeAuthority !== RUNTIME_AUTHORITY ||
        state.capabilityId !== capability.capabilityId || state.online ||
        state.workflow === WORKFLOWS.ONLINE_VERSUS) {
      throw new Error('Restart Presentation V2 is dormant, frozen, or not capability-authorized');
    }
  }

  function enterPhase(next, phase, tick) {
    next.phase = phase;
    next.phaseStartedTick = tick;
    next.phaseDeadlineTick = phase === PHASES.COMPLETE ? null : tick + PHASE_DURATIONS[phase];
    appendEvent(next, 'phase-entered', tick, { phase });

    if (phase === PHASES.WHISTLE) {
      appendCommand(next, COMMANDS.PLAY_WHISTLE, tick, { cue: 'offside-whistle' });
    } else if (phase === PHASES.FREEZE_GAMEPLAY) {
      next.advisoryFreeze = true;
      appendCommand(next, COMMANDS.FREEZE_GAMEPLAY, tick, {
        frozen: true,
        reason: 'offside-presentation',
        adapterMustUseSimulationAuthority: true
      });
    } else if (phase === PHASES.SELECT_ASSISTANT) {
      const assistant = selectAssistant(next.incident);
      next.selectedAssistantId = assistant.id;
      appendCommand(next, COMMANDS.SELECT_ASSISTANT, tick, {
        actorId: assistant.id,
        actorType: assistant.actorType,
        touchline: assistant.touchline,
        reuseExistingActor: true
      });
    } else if (phase === PHASES.CAMERA_PAN) {
      appendCommand(next, COMMANDS.PAN_CAMERA, tick, {
        targetActorId: next.selectedAssistantId,
        shot: 'assistant-referee-medium',
        durationTicks: PHASE_DURATIONS[PHASES.CAMERA_PAN]
      });
    } else if (phase === PHASES.FLAG_RAISE) {
      appendCommand(next, COMMANDS.SET_FLAG, tick, {
        actorId: next.selectedAssistantId,
        state: 'raise',
        durationTicks: PHASE_DURATIONS[PHASES.FLAG_RAISE]
      });
    } else if (phase === PHASES.FLAG_HOLD) {
      appendCommand(next, COMMANDS.SET_FLAG, tick, {
        actorId: next.selectedAssistantId,
        state: 'hold',
        durationTicks: PHASE_DURATIONS[PHASES.FLAG_HOLD]
      });
    } else if (phase === PHASES.FREE_KICK_HANDOFF) {
      appendCommand(next, COMMANDS.SET_FLAG, tick, {
        actorId: next.selectedAssistantId,
        state: 'lower',
        durationTicks: PHASE_DURATIONS[PHASES.FREE_KICK_HANDOFF]
      });
      appendCommand(next, COMMANDS.RESTORE_CAMERA, tick, {
        preset: next.incident.cameraPolicy.preset,
        policy: next.incident.cameraPolicy,
        adapterMustRetainLiveCameraAuthority: true
      });
      appendCommand(next, COMMANDS.HANDOFF_FREE_KICK, tick, {
        kind: 'FREE KICK',
        team: next.incident.defendingTeam,
        position: next.incident.position,
        adapterPoint: "restart('FREE KICK', defendingTeam, x, y)",
        exactlyOnce: true
      });
      appendCommand(next, COMMANDS.FREEZE_GAMEPLAY, tick, {
        frozen: false,
        reason: 'free-kick-authority-handoff',
        releaseOnlyAfterPreviousCommand: true
      });
      next.advisoryFreeze = false;
    } else if (phase === PHASES.COMPLETE) {
      next.active = false;
      next.advisoryFreeze = false;
      appendEvent(next, 'presentation-complete', tick, {
        freeKickHandoffIssued: true,
        selectedAssistantId: next.selectedAssistantId
      });
    }
  }

  function beginOffsidePresentation(state, capability, input, simulationTick) {
    assertAccess(state, capability);
    if (state.active || ![PHASES.IDLE, PHASES.COMPLETE].includes(state.phase)) {
      throw new Error('an offside presentation is already active');
    }
    const tick = nonNegativeInteger(simulationTick, state.currentTick, 'simulationTick');
    if (tick < state.currentTick) throw new RangeError('simulationTick cannot move backwards');
    const next = mutableState(state);
    next.currentTick = tick;
    next.sequences.incident += 1;
    const withWorkflow = Object.assign({}, input || {}, { workflow: state.workflow });
    next.incident = normalizeIncident(withWorkflow, next.sequences.incident, next.sessionId);
    next.selectedAssistantId = null;
    next.active = true;
    next.advisoryFreeze = false;
    appendEvent(next, 'offside-presentation-started', tick, {
      incidentId: next.incident.id,
      defendingTeam: next.incident.defendingTeam
    });
    enterPhase(next, PHASES.WHISTLE, tick);
    return deepFreeze(next);
  }

  function nextPhase(phase) {
    const index = PHASE_ORDER.indexOf(phase);
    if (index < 0 || index + 1 >= PHASE_ORDER.length) return PHASES.COMPLETE;
    return PHASE_ORDER[index + 1];
  }

  function advance(state, capability, simulationTick) {
    assertAccess(state, capability);
    const targetTick = nonNegativeInteger(simulationTick, state.currentTick, 'simulationTick');
    if (targetTick < state.currentTick) throw new RangeError('simulationTick cannot move backwards');
    if (!state.active) {
      if (targetTick === state.currentTick) return state;
      const inactive = mutableState(state);
      inactive.currentTick = targetTick;
      return deepFreeze(inactive);
    }
    const next = mutableState(state);
    while (next.active && next.phaseDeadlineTick != null && targetTick >= next.phaseDeadlineTick) {
      const transitionTick = next.phaseDeadlineTick;
      enterPhase(next, nextPhase(next.phase), transitionTick);
    }
    next.currentTick = targetTick;
    return deepFreeze(next);
  }

  function commandsSince(state, sequence) {
    assertState(state);
    const after = nonNegativeInteger(sequence, 0, 'sequence');
    return deepFreeze(copyJson(state.commands.filter(command => command.sequence > after), 'commands'));
  }

  function createExportPayload(state) {
    assertState(state);
    return deepFreeze({
      schema: EXPORT_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      dormant: true,
      sessionId: state.sessionId,
      workflow: state.workflow,
      phase: state.phase,
      currentTick: state.currentTick,
      incident: state.incident,
      selectedAssistantId: state.selectedAssistantId,
      commands: state.commands,
      events: state.events,
      metadata: state.metadata
    });
  }

  function stateSignature(state) {
    return JSON.stringify(createExportPayload(state));
  }

  return deepFreeze({
    VERSION,
    STATE_SCHEMA,
    CAPABILITY_SCHEMA,
    INCIDENT_SCHEMA,
    COMMAND_SCHEMA,
    EVENT_SCHEMA,
    EXPORT_SCHEMA,
    CAMERA_POLICY_SCHEMA,
    AUTHORITY,
    CAPABILITY_SCOPE,
    CAPABILITY_GRANT,
    RUNTIME_MODE,
    RUNTIME_AUTHORITY,
    PHASES,
    PHASE_ORDER,
    PHASE_DURATIONS,
    RESTART_KINDS,
    WORKFLOWS,
    OWNERS,
    CAMERA_PRESETS,
    COMMANDS,
    createState,
    createShadowCapability,
    activate,
    beginOffsidePresentation,
    advance,
    selectAssistant,
    resolveCameraPolicy,
    commandsSince,
    createExportPayload,
    stateSignature
  });
});
