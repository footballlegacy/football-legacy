'use strict';

/*
 * Football Legacy Set-Piece Suite V2
 *
 * Deterministic controller/state-machine for future suite-only evaluation.
 * This module is deliberately dormant: it is not loaded by match.html, owns
 * no live gameplay authority, and cannot activate without an explicit
 * suite-only capability plus an explicit suite runtime context.
 */
(function exposeSetPieceSuiteV2(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacySetPieceSuiteV2 = api;
})(typeof window === 'object' ? window : null, function createSetPieceSuiteV2Api() {
  'use strict';

  const VERSION = '2.0.0-dormant';
  const STATE_SCHEMA = 'football-legacy-set-piece-suite-v2-state';
  const CAPABILITY_SCHEMA = 'football-legacy-set-piece-suite-v2-capability';
  const SCENARIO_SCHEMA = 'football-legacy-set-piece-suite-v2-scenario';
  const TRIAL_SCHEMA = 'football-legacy-set-piece-suite-v2-trial';
  const EVENT_SCHEMA = 'football-legacy-set-piece-suite-v2-event';
  const SHOT_SCHEMA = 'football-legacy-set-piece-suite-v2-shot';
  const CONTACT_SCHEMA = 'football-legacy-set-piece-suite-v2-contact';
  const OUTCOME_SCHEMA = 'football-legacy-set-piece-suite-v2-outcome';
  const EXPORT_SCHEMA = 'football-legacy-set-piece-suite-v2-export';
  const BALL_LAUNCH_SCHEMA = 'football-legacy-ball-v2-launch-intent';
  const AUTHORITY = 'dormant-suite-candidate';
  const CAPABILITY_SCOPE = 'set-piece-suite-v2-only';
  const CAPABILITY_GRANT = 'enable-set-piece-suite-v2';
  const SUITE_RUNTIME_MODE = 'set-piece-suite';
  const SUITE_RUNTIME_AUTHORITY = 'suite-only';

  const LIFECYCLE = Object.freeze({
    IDLE: 'idle',
    STAGED: 'staged',
    ARMED: 'armed',
    LAUNCHED: 'launched',
    RESOLVED: 'resolved'
  });

  const SCENARIO_KINDS = Object.freeze({
    FREE_KICK: 'free-kick',
    CORNER: 'corner',
    PENALTY: 'penalty'
  });

  const SIDES = Object.freeze({
    LEFT: 'left',
    CENTRE: 'centre',
    RIGHT: 'right'
  });

  const OUTCOME_RESULTS = Object.freeze([
    'goal', 'saved', 'missed', 'blocked', 'post', 'crossbar', 'cleared', 'aborted', 'unknown'
  ]);

  const WALL_PRESETS = deepFreeze({
    none: { id: 'none', defenders: 0, alignment: 'none' },
    automatic: { id: 'automatic', defenders: 4, alignment: 'keeper-directed' },
    one: { id: 'one', defenders: 1, alignment: 'central' },
    three: { id: 'three', defenders: 3, alignment: 'central' },
    four: { id: 'four', defenders: 4, alignment: 'central' },
    five: { id: 'five', defenders: 5, alignment: 'central' }
  });

  const KEEPER_PRESETS = deepFreeze({
    balanced: { id: 'balanced', lateralOffsetM: 0, depthOffsetM: 0, behaviour: 'balanced' },
    centre: { id: 'centre', lateralOffsetM: 0, depthOffsetM: 0, behaviour: 'hold-centre' },
    'left-bias': { id: 'left-bias', lateralOffsetM: -0.75, depthOffsetM: 0, behaviour: 'hold-bias' },
    'right-bias': { id: 'right-bias', lateralOffsetM: 0.75, depthOffsetM: 0, behaviour: 'hold-bias' },
    aggressive: { id: 'aggressive', lateralOffsetM: 0, depthOffsetM: 0.8, behaviour: 'advance' },
    absent: { id: 'absent', lateralOffsetM: 0, depthOffsetM: 0, behaviour: 'disabled' }
  });

  const TARGET_PRESETS = deepFreeze({
    'goal-centre-low': { id: 'goal-centre-low', frame: 'goal', x: 52.5, y: 0, z: 0.65 },
    'goal-centre-high': { id: 'goal-centre-high', frame: 'goal', x: 52.5, y: 0, z: 1.9 },
    'goal-left-low': { id: 'goal-left-low', frame: 'goal', x: 52.5, y: -2.7, z: 0.65 },
    'goal-left-high': { id: 'goal-left-high', frame: 'goal', x: 52.5, y: -2.7, z: 1.9 },
    'goal-right-low': { id: 'goal-right-low', frame: 'goal', x: 52.5, y: 2.7, z: 0.65 },
    'goal-right-high': { id: 'goal-right-high', frame: 'goal', x: 52.5, y: 2.7, z: 1.9 },
    'near-post-low': { id: 'near-post-low', frame: 'relative-goal', heightM: 0.65 },
    'near-post-high': { id: 'near-post-high', frame: 'relative-goal', heightM: 1.9 },
    'far-post-low': { id: 'far-post-low', frame: 'relative-goal', heightM: 0.65 },
    'far-post-high': { id: 'far-post-high', frame: 'relative-goal', heightM: 1.9 },
    'box-near-zone': { id: 'box-near-zone', frame: 'relative-box', x: 47.5, z: 1.2 },
    'box-centre': { id: 'box-centre', frame: 'box', x: 46.8, y: 0, z: 1.2 },
    'box-far-zone': { id: 'box-far-zone', frame: 'relative-box', x: 47.5, z: 1.2 }
  });

  const DEFAULT_LAUNCH_RECIPES = deepFreeze({
    'free-kick': {
      speed: 26,
      liftAngleDeg: 18,
      sideSpinRpm: 0,
      topSpinRpm: 120,
      axialSpinRpm: 0
    },
    corner: {
      speed: 22,
      liftAngleDeg: 26,
      sideSpinRpm: 0,
      topSpinRpm: -45,
      axialSpinRpm: 0
    },
    penalty: {
      speed: 25,
      liftAngleDeg: 8,
      sideSpinRpm: 0,
      topSpinRpm: 30,
      axialSpinRpm: 0
    }
  });

  const SCENARIO_PRESETS = deepFreeze({
    'free-kick-left-18m': freeKickPreset('free-kick-left-18m', SIDES.LEFT, 18, -32),
    'free-kick-left-23m': freeKickPreset('free-kick-left-23m', SIDES.LEFT, 23, -28),
    'free-kick-left-30m': freeKickPreset('free-kick-left-30m', SIDES.LEFT, 30, -22),
    'free-kick-centre-18m': freeKickPreset('free-kick-centre-18m', SIDES.CENTRE, 18, 0),
    'free-kick-centre-23m': freeKickPreset('free-kick-centre-23m', SIDES.CENTRE, 23, 0),
    'free-kick-centre-30m': freeKickPreset('free-kick-centre-30m', SIDES.CENTRE, 30, 0),
    'free-kick-right-18m': freeKickPreset('free-kick-right-18m', SIDES.RIGHT, 18, 32),
    'free-kick-right-23m': freeKickPreset('free-kick-right-23m', SIDES.RIGHT, 23, 28),
    'free-kick-right-30m': freeKickPreset('free-kick-right-30m', SIDES.RIGHT, 30, 22),
    'corner-left': {
      id: 'corner-left', kind: SCENARIO_KINDS.CORNER, side: SIDES.LEFT,
      wallPreset: 'none', keeperPreset: 'balanced', targetPreset: 'box-centre'
    },
    'corner-right': {
      id: 'corner-right', kind: SCENARIO_KINDS.CORNER, side: SIDES.RIGHT,
      wallPreset: 'none', keeperPreset: 'balanced', targetPreset: 'box-centre'
    },
    penalty: {
      id: 'penalty', kind: SCENARIO_KINDS.PENALTY, side: SIDES.CENTRE,
      wallPreset: 'none', keeperPreset: 'balanced', targetPreset: 'goal-centre-low'
    }
  });

  function freeKickPreset(id, side, distanceM, angleDeg) {
    return {
      id,
      kind: SCENARIO_KINDS.FREE_KICK,
      side,
      distanceM,
      angleDeg,
      wallPreset: 'automatic',
      keeperPreset: 'balanced',
      targetPreset: side === SIDES.LEFT ? 'far-post-high' :
        side === SIDES.RIGHT ? 'far-post-high' : 'goal-centre-high'
    };
  }

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

  function finite(value, fallback, label) {
    const result = Number.isFinite(value) ? Number(value) : fallback;
    if (!Number.isFinite(result)) throw new TypeError((label || 'value') + ' must be finite');
    return result;
  }

  function bounded(value, fallback, minimum, maximum, label) {
    const result = finite(value, fallback, label);
    if (result < minimum || result > maximum) {
      throw new RangeError((label || 'value') + ' must be between ' + minimum + ' and ' + maximum);
    }
    return result;
  }

  function nonNegativeInteger(value, fallback, label) {
    const result = value == null ? fallback : value;
    if (!Number.isInteger(result) || result < 0) {
      throw new TypeError((label || 'value') + ' must be a non-negative integer');
    }
    return result;
  }

  function identifier(value, fallback, label) {
    const result = value == null ? fallback : String(value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/.test(result)) {
      throw new TypeError((label || 'id') + ' must be a stable identifier');
    }
    return result;
  }

  function vector(value, fallback, label) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      x: finite(source.x, fallback.x, (label || 'vector') + '.x'),
      y: finite(source.y, fallback.y, (label || 'vector') + '.y'),
      z: finite(source.z, fallback.z, (label || 'vector') + '.z')
    };
  }

  function sequenceId(sessionId, kind, sequence, width) {
    return sessionId + ':' + kind + ':' + String(sequence).padStart(width || 4, '0');
  }

  function decimalToken(value) {
    return String(Number(value)).replace(/-/g, 'm').replace(/\./g, 'p');
  }

  function presetId(value, presets, fallback, label) {
    const result = value == null ? fallback : String(value);
    if (!Object.prototype.hasOwnProperty.call(presets, result)) {
      throw new RangeError((label || 'preset') + ' is unknown: ' + result);
    }
    return result;
  }

  function resolveTarget(targetPreset, side) {
    const preset = TARGET_PRESETS[targetPreset];
    if (preset.frame === 'goal' || preset.frame === 'box') {
      return { x: preset.x, y: preset.y, z: preset.z };
    }
    if (preset.frame === 'relative-goal') {
      const near = targetPreset.startsWith('near-');
      const leftNear = side === SIDES.LEFT;
      const nearY = leftNear ? -3.05 : 3.05;
      const farY = -nearY;
      return { x: 52.5, y: near ? nearY : farY, z: preset.heightM };
    }
    if (preset.frame === 'relative-box') {
      const near = targetPreset.startsWith('box-near-');
      const leftNear = side === SIDES.LEFT;
      const nearY = leftNear ? -5.5 : 5.5;
      const farY = -nearY;
      return { x: preset.x, y: near ? nearY : farY, z: preset.z };
    }
    throw new RangeError('target preset has an unsupported frame');
  }

  function normalizeScenario(input) {
    let source;
    if (typeof input === 'string') {
      if (!Object.prototype.hasOwnProperty.call(SCENARIO_PRESETS, input)) {
        throw new RangeError('scenario preset is unknown: ' + input);
      }
      source = SCENARIO_PRESETS[input];
    } else if (input && typeof input === 'object') {
      source = input;
    } else {
      throw new TypeError('scenario must be a preset id or object');
    }

    const kind = String(source.kind || '');
    if (!Object.values(SCENARIO_KINDS).includes(kind)) {
      throw new RangeError('scenario.kind must be free-kick, corner or penalty');
    }

    let side = source.side == null ? SIDES.CENTRE : String(source.side);
    let distanceM = null;
    let angleDeg = null;
    let defaultWall = 'none';
    let defaultTarget = 'goal-centre-low';
    let origin;

    if (kind === SCENARIO_KINDS.FREE_KICK) {
      if (![SIDES.LEFT, SIDES.CENTRE, SIDES.RIGHT].includes(side)) {
        throw new RangeError('free-kick side must be left, centre or right');
      }
      distanceM = bounded(source.distanceM, 23, 16.5, 45, 'scenario.distanceM');
      const fallbackAngle = side === SIDES.LEFT ? -28 : side === SIDES.RIGHT ? 28 : 0;
      angleDeg = bounded(source.angleDeg, fallbackAngle, -55, 55, 'scenario.angleDeg');
      if (side === SIDES.CENTRE && Math.abs(angleDeg) > 1e-9) {
        throw new RangeError('centre free-kick angleDeg must be zero');
      }
      if (side === SIDES.LEFT && !(angleDeg < 0)) {
        throw new RangeError('left free-kick angleDeg must be negative');
      }
      if (side === SIDES.RIGHT && !(angleDeg > 0)) {
        throw new RangeError('right free-kick angleDeg must be positive');
      }
      const radians = angleDeg * Math.PI / 180;
      origin = {
        x: 52.5 - distanceM * Math.cos(radians),
        y: distanceM * Math.sin(radians),
        z: 0.11
      };
      defaultWall = 'automatic';
      defaultTarget = side === SIDES.CENTRE ? 'goal-centre-high' : 'far-post-high';
    } else if (kind === SCENARIO_KINDS.CORNER) {
      if (![SIDES.LEFT, SIDES.RIGHT].includes(side)) {
        throw new RangeError('corner side must be left or right');
      }
      if (source.distanceM != null || source.angleDeg != null) {
        throw new TypeError('corner scenarios do not accept distanceM or angleDeg');
      }
      origin = { x: 52.5, y: side === SIDES.LEFT ? -34 : 34, z: 0.11 };
      defaultTarget = 'box-centre';
    } else {
      if (source.distanceM != null || source.angleDeg != null) {
        throw new TypeError('penalty scenarios do not accept distanceM or angleDeg');
      }
      side = SIDES.CENTRE;
      origin = { x: 41.5, y: 0, z: 0.11 };
      defaultTarget = 'goal-centre-low';
    }

    const wallPreset = presetId(source.wallPreset, WALL_PRESETS, defaultWall, 'scenario.wallPreset');
    if (kind !== SCENARIO_KINDS.FREE_KICK && wallPreset !== 'none') {
      throw new RangeError(kind + ' scenarios require wallPreset none');
    }
    const keeperPreset = presetId(source.keeperPreset, KEEPER_PRESETS, 'balanced', 'scenario.keeperPreset');
    const targetPreset = presetId(source.targetPreset, TARGET_PRESETS, defaultTarget, 'scenario.targetPreset');
    const target = source.target == null ? resolveTarget(targetPreset, side) :
      vector(source.target, resolveTarget(targetPreset, side), 'scenario.target');
    const generatedId = kind === SCENARIO_KINDS.FREE_KICK ?
      'free-kick-' + side + '-' + decimalToken(distanceM) + 'm-' + decimalToken(angleDeg) + 'deg' :
      kind === SCENARIO_KINDS.CORNER ? 'corner-' + side : 'penalty';

    return deepFreeze({
      schema: SCENARIO_SCHEMA,
      id: identifier(source.id, generatedId, 'scenario.id'),
      kind,
      side,
      distanceM,
      angleDeg,
      wallPreset,
      keeperPreset,
      targetPreset,
      geometry: {
        coordinateSystem: 'si-metres-attacking-positive-x',
        origin,
        target
      },
      metadata: copyJson(source.metadata || {}, 'scenario.metadata')
    });
  }

  function createScenario(input) {
    return normalizeScenario(input);
  }

  function getScenarioPreset(id) {
    const key = String(id || '');
    if (!Object.prototype.hasOwnProperty.call(SCENARIO_PRESETS, key)) {
      throw new RangeError('scenario preset is unknown: ' + key);
    }
    return normalizeScenario(SCENARIO_PRESETS[key]);
  }

  function createState(input) {
    const source = input && typeof input === 'object' ? input : {};
    const sessionId = identifier(source.sessionId, 'suite-session-0001', 'sessionId');
    return deepFreeze({
      schema: STATE_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      suiteOnly: true,
      enabled: false,
      runtimeMode: null,
      runtimeAuthority: null,
      capabilityId: null,
      sessionId,
      revision: 0,
      lifecycle: LIFECYCLE.IDLE,
      menuOpen: false,
      selectedScenario: null,
      currentTrialId: null,
      repeatOfTrialId: null,
      pendingLaunchIntent: null,
      lastLaunchRecipe: null,
      sequences: { event: 0, trial: 0, shot: 0, contact: 0, outcome: 0 },
      events: [],
      trials: [],
      shots: [],
      contacts: [],
      outcomes: [],
      metadata: copyJson(source.metadata || {}, 'state.metadata')
    });
  }

  function assertState(state) {
    if (!state || typeof state !== 'object' || state.schema !== STATE_SCHEMA) {
      throw new TypeError('state must be a Set-Piece Suite V2 state');
    }
    if (state.authority !== AUTHORITY || state.suiteOnly !== true) {
      throw new TypeError('state authority contract is invalid');
    }
    for (const key of ['events', 'trials', 'shots', 'contacts', 'outcomes']) {
      if (!Array.isArray(state[key])) throw new TypeError('state.' + key + ' must be an array');
    }
    return state;
  }

  function capabilityToken(sessionId, capabilityId) {
    return CAPABILITY_SCOPE + ':' + sessionId + ':' + capabilityId;
  }

  function createSuiteCapability(input) {
    const source = input && typeof input === 'object' ? input : {};
    if (source.grant !== CAPABILITY_GRANT) {
      throw new TypeError('capability.grant must explicitly enable Set-Piece Suite V2');
    }
    if (source.runtimeMode !== SUITE_RUNTIME_MODE || source.authority !== SUITE_RUNTIME_AUTHORITY) {
      throw new TypeError('capability requires explicit set-piece-suite / suite-only scope');
    }
    const sessionId = identifier(source.sessionId, 'suite-session-0001', 'capability.sessionId');
    const capabilityId = identifier(source.capabilityId, 'suite-capability-0001', 'capability.capabilityId');
    return deepFreeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      grant: CAPABILITY_GRANT,
      scope: CAPABILITY_SCOPE,
      runtimeMode: SUITE_RUNTIME_MODE,
      authority: SUITE_RUNTIME_AUTHORITY,
      sessionId,
      capabilityId,
      token: capabilityToken(sessionId, capabilityId)
    });
  }

  function assertCapability(capability, sessionId) {
    if (!capability || typeof capability !== 'object' || capability.schema !== CAPABILITY_SCHEMA) {
      throw new TypeError('a Set-Piece Suite V2 capability is required');
    }
    if (capability.grant !== CAPABILITY_GRANT || capability.scope !== CAPABILITY_SCOPE ||
        capability.runtimeMode !== SUITE_RUNTIME_MODE || capability.authority !== SUITE_RUNTIME_AUTHORITY) {
      throw new TypeError('capability scope is invalid');
    }
    if (capability.sessionId !== sessionId ||
        capability.token !== capabilityToken(capability.sessionId, capability.capabilityId)) {
      throw new TypeError('capability does not match this suite session');
    }
    return capability;
  }

  function assertAccess(state, capability) {
    assertState(state);
    assertCapability(capability, state.sessionId);
    if (!state.enabled || state.runtimeMode !== SUITE_RUNTIME_MODE ||
        state.runtimeAuthority !== SUITE_RUNTIME_AUTHORITY || state.capabilityId !== capability.capabilityId) {
      throw new Error('Set-Piece Suite V2 is dormant or capability authority is not active');
    }
  }

  function mutableState(state) {
    assertState(state);
    return copyJson(state, 'state');
  }

  function appendEvent(next, type, payload, simulationTick) {
    next.revision += 1;
    next.sequences.event += 1;
    const event = {
      schema: EVENT_SCHEMA,
      id: sequenceId(next.sessionId, 'event', next.sequences.event, 6),
      sequence: next.sequences.event,
      transitionRevision: next.revision,
      simulationTick: simulationTick == null ? null : nonNegativeInteger(simulationTick, null, 'simulationTick'),
      type: String(type),
      sessionId: next.sessionId,
      trialId: next.currentTrialId,
      scenarioId: next.selectedScenario ? next.selectedScenario.id : null,
      payload: copyJson(payload || {}, 'event.payload')
    };
    next.events.push(event);
    return event;
  }

  function activate(state, capability, context) {
    assertState(state);
    assertCapability(capability, state.sessionId);
    const source = context && typeof context === 'object' ? context : {};
    if (source.runtimeMode !== SUITE_RUNTIME_MODE || source.authority !== SUITE_RUNTIME_AUTHORITY) {
      throw new Error('normal-match or non-suite authority cannot activate Set-Piece Suite V2');
    }
    if (source.normalMatchAuthority === true || source.runtimeMode === 'normal-match') {
      throw new Error('normal-match authority cannot activate Set-Piece Suite V2');
    }
    const next = mutableState(state);
    next.enabled = true;
    next.runtimeMode = SUITE_RUNTIME_MODE;
    next.runtimeAuthority = SUITE_RUNTIME_AUTHORITY;
    next.capabilityId = capability.capabilityId;
    appendEvent(next, 'suite-activated', {
      capabilityId: capability.capabilityId,
      scope: CAPABILITY_SCOPE
    });
    return deepFreeze(next);
  }

  function deactivate(state, capability) {
    assertAccess(state, capability);
    const next = mutableState(state);
    appendEvent(next, 'suite-deactivated', { previousLifecycle: next.lifecycle });
    next.enabled = false;
    next.runtimeMode = null;
    next.runtimeAuthority = null;
    next.capabilityId = null;
    next.lifecycle = LIFECYCLE.IDLE;
    next.menuOpen = false;
    next.selectedScenario = null;
    next.currentTrialId = null;
    next.repeatOfTrialId = null;
    next.pendingLaunchIntent = null;
    return deepFreeze(next);
  }

  function updateCurrentTrial(next, patch) {
    const trial = next.trials.find(entry => entry.id === next.currentTrialId);
    if (!trial) throw new Error('current trial record is missing');
    Object.assign(trial, patch);
  }

  function startTrial(next, scenario, reason, repeatOfTrialId) {
    next.sequences.trial += 1;
    const trialId = sequenceId(next.sessionId, 'trial', next.sequences.trial, 4);
    next.selectedScenario = copyJson(scenario, 'scenario');
    next.currentTrialId = trialId;
    next.repeatOfTrialId = repeatOfTrialId || null;
    next.pendingLaunchIntent = null;
    next.lifecycle = LIFECYCLE.STAGED;
    next.trials.push({
      schema: TRIAL_SCHEMA,
      id: trialId,
      sequence: next.sequences.trial,
      scenarioId: scenario.id,
      scenario: copyJson(scenario, 'trial.scenario'),
      status: LIFECYCLE.STAGED,
      reason: String(reason || 'manual-stage'),
      repeatOfTrialId: repeatOfTrialId || null,
      shotId: null,
      outcomeId: null
    });
    appendEvent(next, 'scenario-staged', {
      trialId,
      reason: String(reason || 'manual-stage'),
      repeatOfTrialId: repeatOfTrialId || null,
      scenario: copyJson(scenario, 'event.scenario')
    });
    return next;
  }

  function stageScenario(state, scenarioInput, capability, options) {
    assertAccess(state, capability);
    const scenario = normalizeScenario(scenarioInput);
    const source = options && typeof options === 'object' ? options : {};
    const next = mutableState(state);
    startTrial(next, scenario, source.reason || 'manual-stage', null);
    return deepFreeze(next);
  }

  function normalizeLaunchRecipe(scenario, input) {
    const source = input && typeof input === 'object' ? input : {};
    const defaults = DEFAULT_LAUNCH_RECIPES[scenario.kind];
    const target = source.target == null ? scenario.geometry.target :
      vector(source.target, scenario.geometry.target, 'launch.target');
    const direction = source.direction == null ? null :
      vector(source.direction, { x: 1, y: 0, z: 0 }, 'launch.direction');
    if (direction && Math.hypot(direction.x, direction.y) <= 1e-12) {
      throw new RangeError('launch.direction requires a horizontal component');
    }
    return {
      target,
      direction,
      speed: bounded(source.speed, defaults.speed, 0.1, 60, 'launch.speed'),
      liftAngleDeg: bounded(source.liftAngleDeg, defaults.liftAngleDeg, -10, 60, 'launch.liftAngleDeg'),
      sideSpinRpm: bounded(source.sideSpinRpm, defaults.sideSpinRpm, -2000, 2000, 'launch.sideSpinRpm'),
      topSpinRpm: bounded(source.topSpinRpm, defaults.topSpinRpm, -2000, 2000, 'launch.topSpinRpm'),
      axialSpinRpm: bounded(source.axialSpinRpm, defaults.axialSpinRpm, -2000, 2000, 'launch.axialSpinRpm'),
      metadata: copyJson(source.metadata || {}, 'launch.metadata')
    };
  }

  function armMutable(next, launchInput) {
    if (next.lifecycle !== LIFECYCLE.STAGED || !next.selectedScenario || !next.currentTrialId) {
      throw new Error('a staged suite trial is required before arming a launch');
    }
    const recipe = normalizeLaunchRecipe(next.selectedScenario, launchInput);
    next.sequences.shot += 1;
    const shotId = sequenceId(next.sessionId, 'shot', next.sequences.shot, 4);
    const launchIntent = {
      schema: BALL_LAUNCH_SCHEMA,
      id: shotId,
      origin: copyJson(next.selectedScenario.geometry.origin, 'launch.origin'),
      target: recipe.direction ? null : copyJson(recipe.target, 'launch.target'),
      direction: recipe.direction ? copyJson(recipe.direction, 'launch.direction') : null,
      speed: recipe.speed,
      liftAngleDeg: recipe.liftAngleDeg,
      sideSpinRpm: recipe.sideSpinRpm,
      topSpinRpm: recipe.topSpinRpm,
      axialSpinRpm: recipe.axialSpinRpm,
      source: 'set-piece-suite-v2',
      metadata: {
        suiteOnly: true,
        capabilityScope: CAPABILITY_SCOPE,
        sessionId: next.sessionId,
        trialId: next.currentTrialId,
        scenarioId: next.selectedScenario.id,
        scenarioKind: next.selectedScenario.kind,
        wallPreset: next.selectedScenario.wallPreset,
        keeperPreset: next.selectedScenario.keeperPreset,
        targetPreset: next.selectedScenario.targetPreset,
        shotSequence: next.sequences.shot,
        client: copyJson(recipe.metadata, 'launch.metadata')
      }
    };
    const shot = {
      schema: SHOT_SCHEMA,
      id: shotId,
      sequence: next.sequences.shot,
      sessionId: next.sessionId,
      trialId: next.currentTrialId,
      scenarioId: next.selectedScenario.id,
      status: LIFECYCLE.ARMED,
      launchIntent: copyJson(launchIntent, 'shot.launchIntent')
    };
    next.shots.push(shot);
    next.pendingLaunchIntent = copyJson(launchIntent, 'pendingLaunchIntent');
    next.lastLaunchRecipe = copyJson(recipe, 'lastLaunchRecipe');
    next.lifecycle = LIFECYCLE.ARMED;
    updateCurrentTrial(next, { status: LIFECYCLE.ARMED, shotId });
    appendEvent(next, 'launch-armed', { shotId, launchIntent: copyJson(launchIntent, 'event.launchIntent') });
    return next;
  }

  function armLaunch(state, launchInput, capability) {
    assertAccess(state, capability);
    const next = mutableState(state);
    armMutable(next, launchInput);
    return deepFreeze(next);
  }

  function createLaunchIntent(state, launchInput, capability) {
    const next = armLaunch(state, launchInput, capability);
    return deepFreeze({
      state: next,
      launchIntent: copyJson(next.pendingLaunchIntent, 'launchIntent')
    });
  }

  function getPendingLaunchIntent(state) {
    assertState(state);
    return state.pendingLaunchIntent == null ? null : copyJson(state.pendingLaunchIntent, 'pendingLaunchIntent');
  }

  function markLaunched(state, input, capability) {
    assertAccess(state, capability);
    if (state.lifecycle !== LIFECYCLE.ARMED || !state.pendingLaunchIntent) {
      throw new Error('an armed launch is required before marking it launched');
    }
    const source = input && typeof input === 'object' ? input : {};
    const simulationTick = nonNegativeInteger(source.simulationTick, 0, 'launch.simulationTick');
    const next = mutableState(state);
    next.lifecycle = LIFECYCLE.LAUNCHED;
    const shot = next.shots.find(entry => entry.id === next.pendingLaunchIntent.id);
    if (!shot) throw new Error('pending shot record is missing');
    shot.status = LIFECYCLE.LAUNCHED;
    shot.launchSimulationTick = simulationTick;
    updateCurrentTrial(next, { status: LIFECYCLE.LAUNCHED });
    appendEvent(next, 'launch-handed-off', {
      shotId: next.pendingLaunchIntent.id,
      consumer: source.consumer == null ? 'external-ball-authority' : String(source.consumer)
    }, simulationTick);
    return deepFreeze(next);
  }

  function recordContact(state, input, capability) {
    assertAccess(state, capability);
    if (state.lifecycle !== LIFECYCLE.LAUNCHED) {
      throw new Error('contacts may only be recorded after a suite launch');
    }
    const source = input && typeof input === 'object' ? input : {};
    const kind = String(source.kind || '');
    if (!/^[a-z][a-z0-9-]{1,39}$/.test(kind)) throw new TypeError('contact.kind is required');
    const simulationTick = nonNegativeInteger(source.simulationTick, null, 'contact.simulationTick');
    const next = mutableState(state);
    next.sequences.contact += 1;
    const contactId = sequenceId(next.sessionId, 'contact', next.sequences.contact, 4);
    const contact = {
      schema: CONTACT_SCHEMA,
      id: contactId,
      sequence: next.sequences.contact,
      sessionId: next.sessionId,
      trialId: next.currentTrialId,
      shotId: next.pendingLaunchIntent.id,
      scenarioId: next.selectedScenario.id,
      simulationTick,
      kind,
      actorId: source.actorId == null ? null : identifier(source.actorId, null, 'contact.actorId'),
      materialId: source.materialId == null ? null : identifier(source.materialId, null, 'contact.materialId'),
      position: source.position == null ? null : vector(source.position, { x: 0, y: 0, z: 0 }, 'contact.position'),
      normal: source.normal == null ? null : vector(source.normal, { x: 0, y: 0, z: 1 }, 'contact.normal'),
      velocityBefore: source.velocityBefore == null ? null :
        vector(source.velocityBefore, { x: 0, y: 0, z: 0 }, 'contact.velocityBefore'),
      velocityAfter: source.velocityAfter == null ? null :
        vector(source.velocityAfter, { x: 0, y: 0, z: 0 }, 'contact.velocityAfter'),
      metadata: copyJson(source.metadata || {}, 'contact.metadata')
    };
    next.contacts.push(contact);
    appendEvent(next, 'contact-recorded', { contactId, kind }, simulationTick);
    return deepFreeze(next);
  }

  function recordOutcome(state, input, capability) {
    assertAccess(state, capability);
    if (state.lifecycle !== LIFECYCLE.LAUNCHED) {
      throw new Error('an outcome may only resolve a launched suite trial');
    }
    const source = input && typeof input === 'object' ? input : {};
    const result = String(source.result || '');
    if (!OUTCOME_RESULTS.includes(result)) {
      throw new RangeError('outcome.result is unknown: ' + result);
    }
    const simulationTick = nonNegativeInteger(source.simulationTick, null, 'outcome.simulationTick');
    const next = mutableState(state);
    next.sequences.outcome += 1;
    const outcomeId = sequenceId(next.sessionId, 'outcome', next.sequences.outcome, 4);
    const outcome = {
      schema: OUTCOME_SCHEMA,
      id: outcomeId,
      sequence: next.sequences.outcome,
      sessionId: next.sessionId,
      trialId: next.currentTrialId,
      shotId: next.pendingLaunchIntent.id,
      scenarioId: next.selectedScenario.id,
      simulationTick,
      result,
      metrics: copyJson(source.metrics || {}, 'outcome.metrics'),
      metadata: copyJson(source.metadata || {}, 'outcome.metadata')
    };
    next.outcomes.push(outcome);
    next.lifecycle = LIFECYCLE.RESOLVED;
    const shot = next.shots.find(entry => entry.id === next.pendingLaunchIntent.id);
    if (shot) shot.status = LIFECYCLE.RESOLVED;
    updateCurrentTrial(next, { status: LIFECYCLE.RESOLVED, outcomeId });
    appendEvent(next, 'trial-resolved', { outcomeId, result }, simulationTick);
    return deepFreeze(next);
  }

  function resetTrial(state, capability) {
    assertAccess(state, capability);
    if (!state.selectedScenario) throw new Error('a scenario is required before resetting a trial');
    const next = mutableState(state);
    startTrial(next, state.selectedScenario, 'reset', null);
    return deepFreeze(next);
  }

  function repeatTrial(state, capability) {
    assertAccess(state, capability);
    if (!state.selectedScenario || !state.lastLaunchRecipe || !state.currentTrialId) {
      throw new Error('a previously armed trial is required before repeating');
    }
    const previousTrialId = state.currentTrialId;
    const recipe = copyJson(state.lastLaunchRecipe, 'lastLaunchRecipe');
    const next = mutableState(state);
    startTrial(next, state.selectedScenario, 'repeat', previousTrialId);
    armMutable(next, recipe);
    return deepFreeze(next);
  }

  function handleMenuIntent(state, input, capability) {
    assertAccess(state, capability);
    const source = input && typeof input === 'object' ? input : {};
    const control = String(source.control || '').toLowerCase();
    const device = String(source.device || '').toLowerCase();
    const valid = (device === 'controller' && control === 'options') ||
      (device === 'keyboard' && control === 'escape');
    if (!valid) throw new TypeError('menu intent must be controller Options or keyboard Escape');
    if (source.pressed === false) return state;
    const next = mutableState(state);
    next.menuOpen = typeof source.open === 'boolean' ? source.open : !next.menuOpen;
    appendEvent(next, 'menu-toggled', { device, control, open: next.menuOpen });
    return deepFreeze(next);
  }

  function handleShortcut(state, input, capability) {
    assertAccess(state, capability);
    const source = input && typeof input === 'object' ? input : {};
    const control = String(source.control || '').toLowerCase();
    if (control !== 'dpad-up') throw new TypeError('shortcut control must be dpad-up');
    if (source.pressed === false || source.suiteContext !== true || source.inPenaltyArea !== true) {
      return state;
    }
    const scenario = normalizeScenario({
      id: source.scenarioId || 'penalty-shortcut',
      kind: SCENARIO_KINDS.PENALTY,
      wallPreset: 'none',
      keeperPreset: source.keeperPreset || 'balanced',
      targetPreset: source.targetPreset || 'goal-centre-low',
      metadata: { stagedBy: 'dpad-up-penalty-area-shortcut' }
    });
    const next = mutableState(state);
    startTrial(next, scenario, 'dpad-up-penalty-area-shortcut', null);
    return deepFreeze(next);
  }

  function createExportPayload(state, capability) {
    assertAccess(state, capability);
    return deepFreeze({
      schema: EXPORT_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      suiteOnly: true,
      capabilityScope: CAPABILITY_SCOPE,
      session: {
        id: state.sessionId,
        revision: state.revision,
        lifecycle: state.lifecycle,
        enabled: state.enabled,
        runtimeMode: state.runtimeMode,
        runtimeAuthority: state.runtimeAuthority,
        capabilityId: state.capabilityId,
        menuOpen: state.menuOpen,
        currentTrialId: state.currentTrialId,
        selectedScenarioId: state.selectedScenario ? state.selectedScenario.id : null
      },
      counts: {
        events: state.events.length,
        trials: state.trials.length,
        shots: state.shots.length,
        contacts: state.contacts.length,
        outcomes: state.outcomes.length
      },
      selectedScenario: state.selectedScenario == null ? null : copyJson(state.selectedScenario, 'selectedScenario'),
      trials: copyJson(state.trials, 'trials'),
      shots: copyJson(state.shots, 'shots'),
      contacts: copyJson(state.contacts, 'contacts'),
      outcomes: copyJson(state.outcomes, 'outcomes'),
      events: copyJson(state.events, 'events'),
      metadata: copyJson(state.metadata, 'metadata')
    });
  }

  function createCopyText(state, capability, spacing) {
    const amount = spacing == null ? 2 : nonNegativeInteger(spacing, 2, 'spacing');
    if (amount > 10) throw new RangeError('spacing must be at most 10');
    return JSON.stringify(createExportPayload(state, capability), null, amount);
  }

  function stateSignature(state) {
    assertState(state);
    return JSON.stringify(state);
  }

  return deepFreeze({
    VERSION,
    STATE_SCHEMA,
    CAPABILITY_SCHEMA,
    SCENARIO_SCHEMA,
    TRIAL_SCHEMA,
    EVENT_SCHEMA,
    SHOT_SCHEMA,
    CONTACT_SCHEMA,
    OUTCOME_SCHEMA,
    EXPORT_SCHEMA,
    BALL_LAUNCH_SCHEMA,
    AUTHORITY,
    CAPABILITY_SCOPE,
    CAPABILITY_GRANT,
    SUITE_RUNTIME_MODE,
    SUITE_RUNTIME_AUTHORITY,
    LIFECYCLE,
    SCENARIO_KINDS,
    SIDES,
    OUTCOME_RESULTS,
    WALL_PRESETS,
    KEEPER_PRESETS,
    TARGET_PRESETS,
    SCENARIO_PRESETS,
    DEFAULT_LAUNCH_RECIPES,
    createState,
    createScenario,
    getScenarioPreset,
    createSuiteCapability,
    activate,
    deactivate,
    stageScenario,
    armLaunch,
    createLaunchIntent,
    getPendingLaunchIntent,
    markLaunched,
    recordContact,
    recordOutcome,
    resetTrial,
    repeatTrial,
    handleMenuIntent,
    handleShortcut,
    createExportPayload,
    createCopyText,
    stateSignature
  });
});
