'use strict';

/*
 * Football Legacy Build 173 -> V2 live shadow capture adapter.
 *
 * This module is intentionally unattached. match.html does not load it. When
 * explicitly enabled by a scoped capability, it converts immutable Build 173
 * before/after captures into the unified V2 orchestrator input and returns
 * bounded comparison telemetry only. Build 173 remains the sole authority;
 * candidate states and commands are never returned to, projected into, or
 * applied by the host workflow.
 */
(function exposeBuild173LiveShadow(root, factory) {
  const dependency = typeof module === 'object' && module.exports
    ? require('./overhaul-shadow-orchestrator-v2.js')
    : root && root.FootballLegacyOverhaulShadowOrchestratorV2;
  const api = factory(dependency);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyBuild173LiveShadowAdapterV2 = api;
})(typeof window === 'object' ? window : null, function createBuild173LiveShadowApi(Orchestrator) {
  'use strict';

  const VERSION = '2.0.0-build173-live-read-only-shadow';
  const HOST_SCHEMA = 'football-legacy-build173-host-observation-v2';
  const HOST_CONTRACT_SCHEMA = 'football-legacy-build173-host-contract-v2';
  const CAPABILITY_SCHEMA = 'football-legacy-build173-live-shadow-capability-v2';
  const OUTPUT_SCHEMA = 'football-legacy-build173-live-shadow-output-v2';
  const TELEMETRY_SCHEMA = 'football-legacy-build173-live-shadow-telemetry-v2';
  const TRACE_SCHEMA = 'football-legacy-build173-live-shadow-trace-v2';
  const ACKNOWLEDGEMENT = 'EXPLICIT_BUILD_173_READ_ONLY_SHADOW_WITH_NO_LIVE_WRITES';
  const HOST_AUTHORITY = 'build-173-legacy';
  const BUILD = 173;
  const PRE_MATCH_STAGE = 'pre-match';
  const MAX_TRACE_RECORDS = 16;
  const MAX_OBSERVATION_BYTES = 512 * 1024;
  const MAX_TELEMETRY_RECORD_BYTES = 64 * 1024;
  const MAX_TELEMETRY_EXPORT_BYTES = 512 * 1024;
  const MAX_INPUT_DEPTH = 16;
  const MAX_INPUT_NODES = 12000;
  const MAX_ARRAY_LENGTH = 256;
  const MAX_OBJECT_KEYS = 160;
  const MAX_STRING_LENGTH = 256;
  const HOST_CONTROL_MODES = Object.freeze(['human', 'cpu']);
  const RESERVED_MAP_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);
  const THROW_IN_KIND = 'THROW IN';
  const THROW_IN_EXCEPTION = 'declared-held-throw-in-taker-only';
  const BALL_FORCE_CONTROL_POLICY = Object.freeze({
    mode: 'state-only-candidate-versus-observed-legacy-after',
    legacyForceControlsExcludedFromCandidateState: true,
    candidateStartsFromExactKinematicState: true,
    legacyAfterIncludesLegacyForceControlEffects: true,
    authority: HOST_AUTHORITY,
    readOnly: true
  });
  const METRIC_PITCH = Object.freeze({ xMin: 0, xMax: 105, yMin: 0, yMax: 68 });
  const REQUIRED_PLAYER_ATTRIBUTES = Object.freeze([
    'pace', 'accel', 'agility', 'balance', 'strength', 'stamina',
    'defend', 'aggression', 'control', 'pass', 'shoot', 'awareness'
  ]);
  const HOST_PHASES = Object.freeze(['PLAY', 'DEAD_BALL', 'SET_PIECE', 'PAUSED']);
  const HOST_PERIODS = Object.freeze(['first-half', 'half-time', 'second-half', 'full-time']);

  function assertDependency() {
    if (!Orchestrator || Orchestrator.VERSION !== '2.0.0-dormant-unified-shadow') {
      throw new Error('Unified Overhaul Shadow Orchestrator V2 must be loaded before the Build 173 adapter');
    }
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    Object.keys(value).forEach(key => { result[key] = clone(value[key]); });
    return result;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    Object.keys(value).sort().forEach(key => { result[key] = stableValue(value[key]); });
    return result;
  }

  function assertBoundedPlainData(value, label, overrides) {
    const limits = {
      maximumBytes: MAX_OBSERVATION_BYTES,
      maximumDepth: MAX_INPUT_DEPTH,
      maximumNodes: MAX_INPUT_NODES,
      maximumArrayLength: MAX_ARRAY_LENGTH,
      maximumObjectKeys: MAX_OBJECT_KEYS,
      maximumStringLength: MAX_STRING_LENGTH,
      ...(overrides || {})
    };
    const seen = new WeakSet();
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
      const current = stack.pop();
      const row = current.value;
      nodes += 1;
      if (nodes > limits.maximumNodes) throw new RangeError(label + ' exceeds the node limit');
      if (current.depth > limits.maximumDepth) throw new RangeError(label + ' exceeds the nesting limit');
      if (row == null || typeof row === 'boolean') continue;
      if (typeof row === 'number') {
        if (!Number.isFinite(row)) throw new TypeError(label + ' must contain finite numbers only');
        continue;
      }
      if (typeof row === 'string') {
        if (row.length > limits.maximumStringLength) throw new RangeError(label + ' contains an overlong string');
        continue;
      }
      if (typeof row !== 'object') throw new TypeError(label + ' must contain JSON-safe values only');
      if (seen.has(row)) throw new TypeError(label + ' must be acyclic and must not contain shared object references');
      seen.add(row);
      if (Array.isArray(row)) {
        if (row.length > limits.maximumArrayLength) throw new RangeError(label + ' contains an oversized array');
        const ownKeys = Reflect.ownKeys(row);
        for (const key of ownKeys) {
          if (key === 'length') continue;
          if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= row.length) {
            throw new TypeError(label + ' arrays must not contain custom or symbolic properties');
          }
          const descriptor = Object.getOwnPropertyDescriptor(row, key);
          if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
              descriptor.get || descriptor.set || descriptor.enumerable !== true) {
            throw new TypeError(label + ' must contain stable enumerable data properties only; accessors are unsafe');
          }
        }
        for (let index = row.length - 1; index >= 0; index -= 1) {
          stack.push({ value: row[index], depth: current.depth + 1 });
        }
        continue;
      }
      const prototype = Object.getPrototypeOf(row);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(label + ' must contain plain objects only');
      }
      const ownKeys = Reflect.ownKeys(row);
      if (ownKeys.some(key => typeof key !== 'string')) {
        throw new TypeError(label + ' must not contain symbolic keys');
      }
      const keys = ownKeys;
      if (keys.length > limits.maximumObjectKeys) throw new RangeError(label + ' contains an oversized object');
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        if (key.length > limits.maximumStringLength) throw new RangeError(label + ' contains an overlong key');
        if (RESERVED_MAP_KEYS.includes(key)) throw new TypeError(label + ' contains a reserved unsafe key: ' + key);
        const descriptor = Object.getOwnPropertyDescriptor(row, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
            descriptor.get || descriptor.set || descriptor.enumerable !== true) {
          throw new TypeError(label + ' must contain stable enumerable data properties only; accessors are unsafe');
        }
        stack.push({ value: descriptor.value, depth: current.depth + 1 });
      }
    }
    let encoded;
    try {
      encoded = JSON.stringify(value);
    } catch (error) {
      throw new TypeError(label + ' must be JSON serialisable');
    }
    if (typeof encoded !== 'string' || encoded.length * 4 > limits.maximumBytes) {
      throw new RangeError(label + ' exceeds the byte limit');
    }
    return encoded.length * 4;
  }

  function stableJson(value) {
    assertBoundedPlainData(value, 'stableJson value', {
      maximumBytes: 4 * 1024 * 1024,
      maximumDepth: 32,
      maximumNodes: 100000,
      maximumArrayLength: 20000,
      maximumObjectKeys: 1000,
      maximumStringLength: 100000
    });
    return JSON.stringify(stableValue(value));
  }

  function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return Number(value);
  }

  function positive(value, label) {
    const result = finite(value, label);
    if (!(result > 0)) throw new RangeError(label + ' must be positive');
    return result;
  }

  function integer(value, minimum, label) {
    if (!Number.isInteger(value) || value < minimum) {
      throw new TypeError(label + ' must be an integer of at least ' + minimum);
    }
    return value;
  }

  function string(value, label) {
    if (typeof value !== 'string' || !value) throw new TypeError(label + ' must be a non-empty string');
    if (value.length > MAX_STRING_LENGTH) throw new RangeError(label + ' exceeds the string length limit');
    return value;
  }

  function identityKey(value, label) {
    const result = string(value, label);
    if (RESERVED_MAP_KEYS.includes(result)) throw new Error(label + ' is reserved and unsafe for keyed mappings');
    return result;
  }

  function exactBoolean(value, label) {
    if (typeof value !== 'boolean') throw new TypeError(label + ' must be an explicit boolean');
    return value;
  }

  function record(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(label + ' must be an object');
    return value;
  }

  function array(value, label) {
    if (!Array.isArray(value)) throw new TypeError(label + ' must be an array');
    return value;
  }

  function unique(values, label) {
    if (new Set(values).size !== values.length) throw new Error(label + ' must be unique');
  }

  function assertExactSet(actual, expected, label) {
    const a = actual.map(String).sort();
    const b = expected.map(String).sort();
    unique(a, label);
    if (stableJson(a) !== stableJson(b)) throw new Error(label + ' must exactly match the declared identity set');
  }

  function createCapability(options) {
    assertDependency();
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || '');
    if (!Orchestrator.OFFLINE_WORKFLOWS.includes(workflow)) {
      throw new Error('Build 173 live shadow capability requires a recognised offline workflow');
    }
    if (source.acknowledgement !== ACKNOWLEDGEMENT) {
      throw new Error('Build 173 live shadow capability requires the exact no-live-writes acknowledgement');
    }
    return Object.freeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      workflow,
      explicit: true,
      readOnly: true,
      authority: HOST_AUTHORITY,
      acknowledgement: ACKNOWLEDGEMENT
    });
  }

  function validCapability(capability, workflow) {
    return Boolean(capability && capability.schema === CAPABILITY_SCHEMA && capability.version === VERSION &&
      capability.workflow === workflow && capability.explicit === true && capability.readOnly === true &&
      capability.authority === HOST_AUTHORITY && capability.acknowledgement === ACKNOWLEDGEMENT);
  }

  function resolveStatus(options) {
    assertDependency();
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || Orchestrator.WORKFLOWS.QUICK_PLAY);
    const requestedEnabled = source.enabled === true;
    let enabled = false;
    let reason = requestedEnabled ? 'capability-rejected' : 'disabled-by-default';
    if (!Object.values(Orchestrator.WORKFLOWS).includes(workflow)) reason = 'unknown-workflow';
    else if (workflow === Orchestrator.WORKFLOWS.ONLINE || source.online === true) reason = 'online-frozen';
    else if (requestedEnabled && validCapability(source.capability, workflow)) {
      enabled = true;
      reason = 'explicit-read-only-live-shadow';
    }
    return Object.freeze({
      requestedEnabled,
      enabled,
      reason,
      workflow,
      authority: HOST_AUTHORITY,
      readOnly: true,
      candidateExposed: false,
      appliedToLive: false
    });
  }

  function validatePitch(contract) {
    const world = record(contract.world, 'contract.world');
    const worldWidth = positive(world.width, 'contract.world.width');
    const worldHeight = positive(world.height, 'contract.world.height');
    const goalLineMargin = positive(world.goalLineMargin, 'contract.world.goalLineMargin');
    if (worldWidth !== 3344 || worldHeight !== 2142 || goalLineMargin !== 84) {
      throw new Error('Build 173 world contract must exactly declare 3344 x 2142 with goal-line margin 84');
    }
    const pitch = record(contract.pitch, 'contract.pitch');
    const xMin = finite(pitch.xMin, 'contract.pitch.xMin');
    const xMax = finite(pitch.xMax, 'contract.pitch.xMax');
    const yMin = finite(pitch.yMin, 'contract.pitch.yMin');
    const yMax = finite(pitch.yMax, 'contract.pitch.yMax');
    if (!(xMax > xMin) || !(yMax > yMin)) throw new RangeError('contract.pitch bounds must have positive size');
    const lengthMetres = positive(pitch.lengthMetres, 'contract.pitch.lengthMetres');
    const widthMetres = positive(pitch.widthMetres, 'contract.pitch.widthMetres');
    if (Math.abs(lengthMetres - 105) > 1e-12 || Math.abs(widthMetres - 68) > 1e-12) {
      throw new Error('Build 173 pitch contract must explicitly declare the 105 x 68 metre reference');
    }
    if (xMin !== goalLineMargin || xMax !== worldWidth - goalLineMargin || yMin !== 0 || yMax !== worldHeight) {
      throw new Error('Build 173 pitch contract must exactly declare goal lines 84..3260 and touchlines 0..2142');
    }
    const xUnitsPerMetre = positive(pitch.xUnitsPerMetre, 'contract.pitch.xUnitsPerMetre');
    const yUnitsPerMetre = positive(pitch.yUnitsPerMetre, 'contract.pitch.yUnitsPerMetre');
    const zUnitsPerMetre = positive(pitch.zUnitsPerMetre, 'contract.pitch.zUnitsPerMetre');
    if (Math.abs((xMax - xMin) / xUnitsPerMetre - lengthMetres) > 1e-9) {
      throw new Error('contract.pitch x units must exactly span 105 metres');
    }
    if (Math.abs((yMax - yMin) / yUnitsPerMetre - widthMetres) > 1e-9) {
      throw new Error('contract.pitch y units must exactly span 68 metres');
    }
    const framesPerSecond = positive(pitch.framesPerSecond, 'contract.pitch.framesPerSecond');
    const ballRadiusMetres = positive(pitch.ballRadiusMetres, 'contract.pitch.ballRadiusMetres');
    const spinScale = finite(pitch.spinRadiansPerSecondPerLegacyUnit,
      'contract.pitch.spinRadiansPerSecondPerLegacyUnit');
    return {
      worldWidth, worldHeight, goalLineMargin,
      xMin, xMax, yMin, yMax, lengthMetres, widthMetres,
      xUnitsPerMetre, yUnitsPerMetre, zUnitsPerMetre,
      framesPerSecond, ballRadiusMetres, spinScale
    };
  }

  function validateStagingContract(contract, pitch) {
    const staging = record(contract.staging, 'contract.staging');
    const apron = record(staging.throwInApron, 'contract.staging.throwInApron');
    const result = {
      xMin: finite(apron.xMin, 'contract.staging.throwInApron.xMin'),
      xMax: finite(apron.xMax, 'contract.staging.throwInApron.xMax'),
      yMin: finite(apron.yMin, 'contract.staging.throwInApron.yMin'),
      yMax: finite(apron.yMax, 'contract.staging.throwInApron.yMax'),
      exception: string(apron.exception, 'contract.staging.throwInApron.exception')
    };
    if (result.xMin !== pitch.xMin || result.xMax !== pitch.xMax ||
      result.yMin !== pitch.yMin - 26 || result.yMax !== pitch.yMax + 26 ||
      result.exception !== THROW_IN_EXCEPTION) {
      throw new Error('throw-in staging contract must exactly declare the bounded 26-unit held-taker apron');
    }
    return result;
  }

  function validateClockContract(contract, fixedTickSeconds) {
    const clock = record(contract.clock, 'contract.clock');
    if (clock.source !== 'simulation-time-only') {
      throw new Error('contract.clock.source must be simulation-time-only');
    }
    const acceleration = positive(clock.acceleration, 'contract.clock.acceleration');
    const matchLengthMinutes = positive(clock.matchLengthMinutes, 'contract.clock.matchLengthMinutes');
    if (matchLengthMinutes < 2 || matchLengthMinutes > 20) {
      throw new RangeError('contract.clock.matchLengthMinutes must be in the Build 173 range 2..20');
    }
    if (Math.abs(acceleration - 90 / matchLengthMinutes) > 1e-12) {
      throw new Error('contract.clock.acceleration must equal 90 / matchLengthMinutes');
    }
    const phaseMap = record(clock.phaseMap, 'contract.clock.phaseMap');
    const exactPhaseMap = { PLAY: 'live', DEAD_BALL: 'dead-ball', SET_PIECE: 'set-piece', PAUSED: 'paused' };
    if (stableJson(phaseMap) !== stableJson(exactPhaseMap)) {
      throw new Error('contract.clock.phaseMap must exactly map all four supported Build 173 phases');
    }
    if (Math.abs(contract.pitch.framesPerSecond * fixedTickSeconds - 1) > 1e-9) {
      throw new Error('contract pitch frame rate must be the reciprocal of fixedTickSeconds');
    }
    return { acceleration, matchLengthMinutes, phaseMap: clone(phaseMap) };
  }

  function validateIdentity(observation) {
    const identity = record(observation.identity, 'identity');
    const teams = array(identity.teams, 'identity.teams');
    if (teams.length !== 2) throw new Error('Build 173 identity must declare exactly two teams');
    const hostTeamIds = teams.map(team => identityKey(team && team.id, 'identity team id'));
    const candidateTeamIds = teams.map(team => identityKey(team && team.candidateId, 'identity team candidateId'));
    unique(hostTeamIds, 'identity host team ids');
    unique(candidateTeamIds, 'identity candidate team ids');
    const players = [];
    teams.forEach((team, teamIndex) => {
      if (team.attackingDirection !== 1 && team.attackingDirection !== -1) {
        throw new TypeError('identity.teams[' + teamIndex + '].attackingDirection must be exactly 1 or -1');
      }
      string(team.formation, 'identity team formation');
      if (!HOST_CONTROL_MODES.includes(team.control)) {
        throw new Error('identity team control must be exactly human or cpu');
      }
      const lineup = array(team.players, 'identity team players');
      if (lineup.length !== 11) throw new Error('each Build 173 identity team must contain exactly 11 players');
      unique(lineup.map(player => player && player.slotId), 'identity team slot ids');
      const goalkeeperCount = lineup.filter(player => player && player.position === 'GK').length;
      if (goalkeeperCount !== 1) throw new Error('identity must declare exactly one GK per team');
      lineup.forEach((player, index) => {
        const row = record(player, 'identity player');
        players.push({
          id: identityKey(row.id, 'identity player id'),
          candidateId: identityKey(row.candidateId, 'identity player candidateId'),
          teamId: team.id,
          candidateTeamId: team.candidateId,
          slotId: identityKey(row.slotId, 'identity player slotId'),
          position: string(row.position, 'identity player position'),
          index
        });
      });
    });
    if (teams[0].attackingDirection !== -teams[1].attackingDirection) {
      throw new Error('the two identity teams must declare opposite attacking directions');
    }
    unique(players.map(player => player.id), 'identity host player ids');
    unique(players.map(player => player.candidateId), 'identity candidate player ids');
    identityKey(identity.ballId, 'identity.ballId');
    return { teams: clone(teams), players, hostTeamIds, candidateTeamIds, ballId: identity.ballId };
  }

  function teamLookups(identity) {
    const teamByHost = Object.create(null);
    identity.teams.forEach(team => { teamByHost[team.id] = team; });
    const playerByHost = Object.create(null);
    identity.players.forEach(player => { playerByHost[player.id] = player; });
    return { teamByHost, playerByHost };
  }

  function validateRestartContext(source, identity, staging) {
    if (source.restart == null) return null;
    const restart = record(source.restart, 'restart');
    if (restart.kind !== THROW_IN_KIND || restart.held !== true) {
      throw new Error('restart staging is allowed only for an explicitly held THROW IN');
    }
    const takerId = identityKey(restart.takerId, 'restart.takerId');
    if (!identity.players.some(player => player.id === takerId)) {
      throw new Error('restart.takerId must reference the exact identity roster');
    }
    return { kind: THROW_IN_KIND, held: true, takerId, staging };
  }

  function validateRawPlayer(player, declared, frameLabel, pitch, restartContext) {
    const raw = record(player, frameLabel + ' player');
    if (raw.teamId !== declared.teamId) throw new Error(frameLabel + ' player team ownership conflicts with identity: ' + declared.id);
    for (const key of ['x', 'y', 'vx', 'vy', 'fx', 'fy', 'homeX', 'homeY', 'stamina']) {
      finite(raw[key], frameLabel + ' player.' + key);
    }
    const normalPosition = raw.x >= pitch.xMin && raw.x <= pitch.xMax && raw.y >= pitch.yMin && raw.y <= pitch.yMax;
    const stagedThrowInTaker = Boolean(restartContext && raw.id === restartContext.takerId &&
      raw.x >= restartContext.staging.xMin && raw.x <= restartContext.staging.xMax &&
      raw.y >= restartContext.staging.yMin && raw.y <= restartContext.staging.yMax);
    if (!normalPosition && !stagedThrowInTaker) {
      throw new RangeError(frameLabel + ' player is outside the pitch and exact held-throw-in staging apron: ' + declared.id);
    }
    if (raw.homeX < pitch.xMin || raw.homeX > pitch.xMax || raw.homeY < pitch.yMin || raw.homeY > pitch.yMax) {
      throw new RangeError(frameLabel + ' player home anchor is outside the declared pitch: ' + declared.id);
    }
    if (Math.hypot(raw.fx, raw.fy) <= 1e-12) throw new Error(frameLabel + ' player facing must be non-zero: ' + declared.id);
    if (raw.stamina < 0 || raw.stamina > 100) {
      throw new RangeError(frameLabel + ' player.stamina must be in the range 0..100');
    }
    string(raw.role, frameLabel + ' player.role');
    if (raw.position !== declared.position) throw new Error(frameLabel + ' player position conflicts with identity: ' + declared.id);
    exactBoolean(raw.sentOff, frameLabel + ' player.sentOff');
    const attrs = record(raw.attrs, frameLabel + ' player.attrs');
    REQUIRED_PLAYER_ATTRIBUTES.forEach(key => {
      const value = finite(attrs[key], frameLabel + ' player.attrs.' + key);
      if (value < 0 || value > 100) {
        throw new RangeError(frameLabel + ' player.attrs.' + key + ' must be in the range 0..100');
      }
    });
    return raw;
  }

  function validateRawBall(ball, identity, label) {
    const raw = record(ball, label + '.ball');
    if (raw.id !== identity.ballId) throw new Error(label + '.ball.id conflicts with identity.ballId');
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'zv', 'spin', 'dip', 'curveAccel']) finite(raw[key], label + '.ball.' + key);
    if (raw.ownerId != null && !identity.players.some(player => player.id === raw.ownerId)) {
      throw new Error(label + '.ball.ownerId is not in the exact identity roster');
    }
    string(raw.flightType || 'ground', label + '.ball.flightType');
    return raw;
  }

  function validateRawClock(clock, label, contractClock) {
    const raw = record(clock, label + '.clock');
    if (!HOST_PHASES.includes(raw.phase)) throw new Error(label + '.clock.phase is unsupported');
    if (!HOST_PERIODS.includes(raw.period)) throw new Error(label + '.clock.period is unsupported');
    exactBoolean(raw.ballLive, label + '.clock.ballLive');
    if (raw.ballLive !== (contractClock.phaseMap[raw.phase] === 'live')) {
      throw new Error(label + '.clock.ballLive conflicts with the exact phase mapping');
    }
    const clockFrames = finite(raw.clockFrames, label + '.clock.clockFrames');
    if (clockFrames < 0) throw new RangeError(label + '.clock.clockFrames must be non-negative');
    const gameplaySeconds = finite(raw.gameplaySeconds, label + '.clock.gameplaySeconds');
    if (gameplaySeconds < 0) throw new RangeError(label + '.clock.gameplaySeconds must be non-negative');
    string(raw.reason, label + '.clock.reason');
    return raw;
  }

  function validateFrame(frame, tick, identity, lookups, pitch, contractClock, restartContext, label) {
    const raw = record(frame, label);
    if (raw.tick !== tick) throw new Error(label + '.tick must equal ' + tick);
    const players = array(raw.players, label + '.players');
    assertExactSet(players.map(player => player && player.id), identity.players.map(player => player.id), label + ' player ids');
    players.forEach(player => validateRawPlayer(player, lookups.playerByHost[player.id], label, pitch, restartContext));
    const staged = players.filter(player => player.x < pitch.xMin || player.x > pitch.xMax ||
      player.y < pitch.yMin || player.y > pitch.yMax);
    if (staged.length > 1 || (staged.length === 1 && (!restartContext || staged[0].id !== restartContext.takerId))) {
      throw new Error(label + ' may stage only the declared held-throw-in taker outside the pitch');
    }
    const ball = validateRawBall(raw.ball, identity, label);
    const clock = validateRawClock(raw.clock, label, contractClock);
    return { raw, players, ball, clock };
  }

  function normalizePosition(value, pitch) {
    return {
      x: (finite(value.x, 'position.x') - pitch.xMin) / pitch.xUnitsPerMetre,
      y: (finite(value.y, 'position.y') - pitch.yMin) / pitch.yUnitsPerMetre
    };
  }

  function normalizeVelocity(value, pitch) {
    return {
      x: finite(value.vx, 'velocity.vx') * pitch.framesPerSecond / pitch.xUnitsPerMetre,
      y: finite(value.vy, 'velocity.vy') * pitch.framesPerSecond / pitch.yUnitsPerMetre
    };
  }

  function normalizeFacing(player) {
    const length = Math.hypot(player.fx, player.fy);
    return { x: player.fx / length, y: player.fy / length };
  }

  function movementPlayer(player, lookups, pitch) {
    const declared = lookups.playerByHost[player.id];
    return {
      id: player.id,
      teamId: lookups.teamByHost[player.teamId].candidateId,
      role: player.role,
      position: normalizePosition(player, pitch),
      velocity: normalizeVelocity(player, pitch),
      facing: normalizeFacing(player),
      attributes: {
        pace: player.attrs.pace,
        acceleration: player.attrs.accel,
        agility: player.attrs.agility,
        balance: player.attrs.balance,
        strength: player.attrs.strength,
        stamina: player.attrs.stamina,
        defending: player.attrs.defend,
        aggression: player.attrs.aggression,
        control: player.attrs.control
      },
      staminaLevel: player.stamina,
      locomotionState: String(player.locomotionState || 'idle'),
      hasBall: false,
      sentOff: player.sentOff,
      declaredPosition: declared.position
    };
  }

  function cpuPlayer(player, lookups, pitch) {
    const declared = lookups.playerByHost[player.id];
    const position = normalizePosition(player, pitch);
    const velocity = normalizeVelocity(player, pitch);
    return {
      id: player.id,
      teamId: lookups.teamByHost[player.teamId].candidateId,
      x: position.x,
      y: position.y,
      vx: velocity.x,
      vy: velocity.y,
      formationAnchor: normalizePosition({ x: player.homeX, y: player.homeY }, pitch),
      role: player.role,
      position: declared.position,
      unitRole: declared.slotId,
      pace: player.attrs.pace,
      acceleration: player.attrs.accel,
      awareness: player.attrs.awareness,
      passing: player.attrs.pass,
      shooting: player.attrs.shoot,
      control: player.attrs.control,
      stamina: player.stamina,
      isGK: declared.position === 'GK',
      sentOff: player.sentOff,
      available: !player.sentOff
    };
  }

  function normalizedBall(ball, pitch) {
    return {
      id: ball.id,
      x: ball.x - pitch.xMin,
      y: ball.y - pitch.yMin,
      z: ball.z,
      vx: ball.vx,
      vy: ball.vy,
      zv: ball.zv,
      spin: ball.spin,
      // Build 173 dip/curveAccel are per-step force controls, not reversible
      // instantaneous state. Preserve them in host telemetry, but exclude them
      // from the candidate state so the current bridge receives a complete
      // state-only mapping. The observed after kinematics already contain the
      // legacy force effects and remain the comparison target.
      dip: 0,
      curveAccel: 0,
      flightType: ball.flightType || 'ground'
    };
  }

  function movementWorld(frame, tick, fixedTickSeconds, lookups, pitch) {
    return {
      tick,
      fixedTickSeconds,
      bounds: clone(METRIC_PITCH),
      ballOwnerId: frame.ball.ownerId,
      players: frame.players.map(player => movementPlayer(player, lookups, pitch))
    };
  }

  function validateCpuEntries(observation, identity, lookups, pitch, tick) {
    const entries = array(observation.cpu, 'cpu');
    const declaredCpuTeams = identity.teams.filter(team => team.control === 'cpu').map(team => team.id);
    assertExactSet(entries.map(entry => entry && entry.teamId), declaredCpuTeams, 'cpu team ids');
    return entries.map(entry => {
      const raw = record(entry, 'cpu entry');
      const team = lookups.teamByHost[raw.teamId];
      const possession = raw.possessionTeamId == null ? null : lookups.teamByHost[raw.possessionTeamId];
      if (raw.possessionTeamId != null && !possession) throw new Error('cpu possessionTeamId is not in identity');
      if (raw.carrierId != null && !lookups.playerByHost[raw.carrierId]) throw new Error('cpu carrierId is not in identity');
      if (raw.carrierId != null && lookups.playerByHost[raw.carrierId].teamId !== raw.possessionTeamId) {
        throw new Error('cpu carrier ownership conflicts with possessionTeamId');
      }
      const offsideLine = normalizePosition({ x: finite(raw.offsideLine, 'cpu.offsideLine'), y: pitch.yMin }, pitch).x;
      const events = array(raw.events, 'cpu.events').map((event, index) => {
        const row = record(event, 'cpu event');
        const eventTeam = row.teamId == null ? null : lookups.teamByHost[row.teamId];
        if (row.teamId != null && !eventTeam) throw new Error('cpu event teamId is not in identity');
        if (row.playerId != null && !lookups.playerByHost[row.playerId]) throw new Error('cpu event playerId is not in identity');
        if (row.tick !== tick) throw new Error('cpu event tick must equal the observation tick');
        if (eventTeam && eventTeam.id !== raw.teamId) throw new Error('cpu event team ownership conflicts with the CPU entry');
        if (row.playerId != null) {
          const playerTeamId = lookups.playerByHost[row.playerId].teamId;
          const declaredEventTeamId = eventTeam ? eventTeam.id : raw.teamId;
          if (playerTeamId !== declaredEventTeamId) throw new Error('cpu event player ownership conflicts with event team');
        }
        if (row.target && (finite(row.target.x, 'cpu event target.x') < pitch.xMin ||
          row.target.x > pitch.xMax || finite(row.target.y, 'cpu event target.y') < pitch.yMin ||
          row.target.y > pitch.yMax)) {
          throw new RangeError('cpu event target must remain inside the declared pitch');
        }
        return {
          id: identityKey(row.id || ('host-event:' + tick + ':' + index), 'cpu event.id'),
          type: string(row.type, 'cpu event.type'),
          tick,
          teamId: eventTeam ? eventTeam.candidateId : null,
          playerId: row.playerId == null ? null : row.playerId,
          runType: row.runType == null ? null : String(row.runType),
          target: row.target ? normalizePosition(row.target, pitch) : null,
          reason: String(row.reason || 'build-173-live-capture')
        };
      });
      return { raw, team, possession, offsideLine, events };
    });
  }

  function formationAvailability(team, afterPlayers, lookups) {
    const unavailableSlotIds = [];
    for (const declared of team.players) {
      const player = afterPlayers.find(candidate => candidate.id === declared.id);
      if (!player || !player.sentOff) continue;
      if (declared.position === 'GK') {
        throw new Error('goalkeeper dismissal requires explicit replacement semantics before shadow observation');
      }
      unavailableSlotIds.push(lookups.playerByHost[declared.id].slotId);
    }
    return { playerCount: 11 - unavailableSlotIds.length, unavailableSlotIds };
  }

  function validateFormationEntries(observation, identity, lookups, pitch, afterPlayers) {
    const entries = array(observation.formation, 'formation');
    assertExactSet(entries.map(entry => entry && entry.teamId), identity.hostTeamIds, 'formation team ids');
    return entries.map(entry => {
      const raw = record(entry, 'formation entry');
      const team = lookups.teamByHost[raw.teamId];
      string(raw.phase, 'formation.phase');
      const availability = formationAvailability(team, afterPlayers, lookups);
      if (raw.playerCount != null && raw.playerCount !== availability.playerCount) {
        throw new Error('formation.playerCount conflicts with exact sent-off availability');
      }
      if (raw.unavailableSlotIds != null) {
        assertExactSet(array(raw.unavailableSlotIds, 'formation.unavailableSlotIds'),
          availability.unavailableSlotIds, 'formation unavailable slot ids');
      }
      return {
        raw,
        team,
        playerCount: availability.playerCount,
        unavailableSlotIds: availability.unavailableSlotIds,
        offsideLine: normalizePosition({ x: finite(raw.offsideLine, 'formation.offsideLine'), y: pitch.yMin }, pitch).x
      };
    });
  }

  function mapMovementCommand(command, tick, lookups) {
    const row = record(command, 'movement command');
    if (!lookups.playerByHost[row.playerId]) throw new Error('movement command playerId is not in identity');
    if (row.targetId != null && !lookups.playerByHost[row.targetId]) throw new Error('movement command targetId is not in identity');
    if (row.tick !== tick) throw new Error('movement command tick must equal the observation tick');
    return clone(row);
  }

  function normalizeObservation(observation, expectedWorkflow) {
    assertDependency();
    assertBoundedPlainData(observation, 'Build 173 observation');
    const source = record(observation, 'Build 173 observation');
    if (source.schema !== HOST_SCHEMA) throw new Error('observation.schema must be ' + HOST_SCHEMA);
    if (source.build !== BUILD) throw new Error('observation.build must be exactly 173');
    if (source.authority !== HOST_AUTHORITY) throw new Error('observation.authority must remain build-173-legacy');
    if (source.readOnlyCapture !== true) throw new Error('observation.readOnlyCapture must be exactly true');
    if (source.online !== false) throw new Error('online observations are frozen and rejected');
    const workflow = string(source.workflow, 'observation.workflow');
    if (!Orchestrator.OFFLINE_WORKFLOWS.includes(workflow)) throw new Error('observation.workflow must be recognised and offline');
    if (expectedWorkflow && workflow !== expectedWorkflow) throw new Error('observation.workflow does not match the adapter workflow');
    const tick = integer(source.tick, 1, 'observation.tick');
    const fixedTickSeconds = positive(source.fixedTickSeconds, 'observation.fixedTickSeconds');
    const epoch = record(source.epoch, 'observation.epoch');
    identityKey(epoch.id, 'observation.epoch.id');
    string(epoch.stage, 'observation.epoch.stage');
    if (tick === 1 && epoch.stage !== PRE_MATCH_STAGE) {
      throw new Error('tick 1 must attach at the explicit pre-match epoch');
    }
    const contract = record(source.contract, 'observation.contract');
    if (contract.schema !== HOST_CONTRACT_SCHEMA) throw new Error('contract.schema must be ' + HOST_CONTRACT_SCHEMA);
    if (contract.authority !== HOST_AUTHORITY || contract.readOnly !== true) {
      throw new Error('contract must explicitly preserve read-only Build 173 authority');
    }
    const pitch = validatePitch(contract);
    const staging = validateStagingContract(contract, pitch);
    const clockContract = validateClockContract(contract, fixedTickSeconds);
    const identity = validateIdentity(source);
    const lookups = teamLookups(identity);
    const restartContext = validateRestartContext(source, identity, staging);
    const before = validateFrame(source.before, tick - 1, identity, lookups, pitch, clockContract,
      restartContext, 'before');
    const after = validateFrame(source.after, tick, identity, lookups, pitch, clockContract,
      restartContext, 'after');
    if (after.clock.gameplaySeconds + 1e-9 < before.clock.gameplaySeconds) {
      throw new Error('Build 173 gameplay simulation time must be monotonic within an observation');
    }
    const expectedGameplayDelta = before.clock.phase === 'PLAY'
      ? fixedTickSeconds * clockContract.acceleration : 0;
    const observedGameplayDelta = after.clock.gameplaySeconds - before.clock.gameplaySeconds;
    if (Math.abs(observedGameplayDelta - expectedGameplayDelta) > 1e-9) {
      throw new Error('gameplaySeconds must advance only from the phase governing the legacy tick');
    }
    if (tick === 1 && (before.clock.period !== 'first-half' || before.clock.gameplaySeconds !== 0)) {
      throw new Error('tick 1 must begin at a zeroed first-half pre-match simulation epoch');
    }
    const cpu = validateCpuEntries(source, identity, lookups, pitch, tick);
    const formation = validateFormationEntries(source, identity, lookups, pitch, after.players);
    const commands = array(source.movementCommands, 'movementCommands')
      .map(command => mapMovementCommand(command, tick, lookups));
    record(source.environment, 'environment');
    return { source, workflow, tick, fixedTickSeconds, epoch, contract, pitch, staging, restartContext,
      clockContract, identity, lookups, before, after, cpu, formation, commands };
  }

  function toUnifiedSnapshot(observation, options) {
    const normalized = normalizeObservation(observation, options && options.workflow);
    const { source, workflow, tick, fixedTickSeconds, pitch, clockContract,
      identity, lookups, before, after, cpu, formation, commands } = normalized;
    const playerIds = Object.fromEntries(identity.players.map(player => [player.id, player.candidateId]));
    const candidatePlayers = after.players.map(player => cpuPlayer(player, lookups, pitch));
    const candidateTeamIds = Object.fromEntries(identity.teams.map(team => [team.id, team.candidateId]));
    const mapping = {
      schema: Orchestrator.MAPPING_SCHEMA,
      complete: true,
      fixedTickSeconds,
      components: { ball: true, movement: true, cpu: true, formation: true, clock: true },
      playerIds,
      coordinateTransform: { xScale: 1, xOffset: 0, yScale: 1, yOffset: 0 },
      ball: {
        complete: true,
        units: {
          xUnitsPerMetre: pitch.xUnitsPerMetre,
          yUnitsPerMetre: pitch.yUnitsPerMetre,
          zUnitsPerMetre: pitch.zUnitsPerMetre,
          framesPerSecond: pitch.framesPerSecond,
          ballRadiusMetres: pitch.ballRadiusMetres
        },
        mapping: { spinRadiansPerSecondPerLegacyUnit: pitch.spinScale },
        config: {}
      },
      movement: { complete: true, config: { fixedTickSeconds } },
      cpu: {
        complete: true,
        expectedTeamIds: cpu.map(entry => entry.team.candidateId).sort(),
        config: { fixedTickSeconds }
      },
      formation: {
        complete: true,
        expectedTeamIds: formation.map(entry => entry.team.candidateId).sort()
      },
      clock: {
        complete: true,
        phaseMap: clone(clockContract.phaseMap),
        config: { fixedTickSeconds, acceleration: clockContract.acceleration }
      }
    };
    return {
      schema: Orchestrator.LEGACY_SNAPSHOT_SCHEMA,
      tick,
      fixedTickSeconds,
      workflow,
      mapping,
      legacy: {
        ball: {
          before: normalizedBall(before.ball, pitch),
          after: normalizedBall(after.ball, pitch),
          environment: clone(source.environment)
        },
        movement: {
          before: movementWorld(before, tick - 1, fixedTickSeconds, lookups, pitch),
          after: movementWorld(after, tick, fixedTickSeconds, lookups, pitch),
          commands
        },
        cpu: cpu.map(entry => ({
          teamId: entry.team.candidateId,
          snapshot: {
            tick,
            fixedTickSeconds,
            teamId: entry.team.candidateId,
            possessionTeamId: entry.possession ? entry.possession.candidateId : null,
            carrierId: entry.raw.carrierId,
            attackingDirection: entry.team.attackingDirection,
            offsideLine: entry.offsideLine,
            pitch: clone(METRIC_PITCH),
            ball: normalizePosition(after.ball, pitch),
            players: clone(candidatePlayers),
            events: clone(entry.events)
          }
        })),
        formation: formation.map(entry => ({
          teamId: entry.team.candidateId,
          request: {
            tick,
            formation: entry.team.formation,
            phase: entry.raw.phase,
            pitch: clone(METRIC_PITCH),
            attackingDirection: entry.team.attackingDirection,
            offsideLine: entry.offsideLine,
            playerCount: entry.playerCount,
            unavailableSlotIds: clone(entry.unavailableSlotIds),
            lineup: entry.team.players.map(player => ({
              id: player.id,
              slotId: player.slotId,
              position: player.position
            }))
          }
        })),
        clock: {
          legacyPhase: after.clock.phase,
          period: after.clock.period,
          ballLive: after.clock.ballLive,
          gameplaySeconds: after.clock.gameplaySeconds,
          reason: after.clock.reason
        }
      },
      hostMapping: {
        epochId: source.epoch.id,
        hostTeamIds: clone(identity.hostTeamIds),
        candidateTeamIds,
        hostPitch: { xMin: pitch.xMin, xMax: pitch.xMax, yMin: pitch.yMin, yMax: pitch.yMax },
        candidatePitch: clone(METRIC_PITCH),
        sourceClockFramesBefore: before.clock.clockFrames,
        sourceClockFrames: after.clock.clockFrames,
        sourceGameplaySeconds: after.clock.gameplaySeconds,
        matchLengthMinutes: clockContract.matchLengthMinutes,
        clockAcceleration: clockContract.acceleration,
        ballForceControlPolicy: {
          ...clone(BALL_FORCE_CONTROL_POLICY),
          rawBefore: { dip: before.ball.dip, curveAccel: before.ball.curveAccel },
          rawAfter: { dip: after.ball.dip, curveAccel: after.ball.curveAccel }
        },
        readOnly: true
      }
    };
  }

  function validateObservation(observation, options) {
    try {
      const mapped = toUnifiedSnapshot(observation, options);
      const hostMapping = mapped.hostMapping;
      delete mapped.hostMapping;
      const result = Orchestrator.validateLegacySnapshot(mapped, options);
      return result.valid
        ? { valid: true, errors: [], hostMapping }
        : { valid: false, errors: result.errors.slice(), hostMapping: null };
    } catch (error) {
      return { valid: false, errors: [error && error.message ? error.message : String(error)], hostMapping: null };
    }
  }

  function assertObservation(observation, options) {
    const mapped = toUnifiedSnapshot(observation, options);
    const hostMapping = mapped.hostMapping;
    delete mapped.hostMapping;
    const validation = Orchestrator.validateLegacySnapshot(mapped, options);
    if (!validation.valid) throw new Error('Build 173 live shadow mapping is incomplete: ' + validation.errors.join('; '));
    return { mapped, hostMapping };
  }

  function boundedComparison(telemetry) {
    const comparisons = telemetry.comparisons || {};
    const ball = comparisons.ball || {};
    const movement = comparisons.movement || {};
    const formation = Array.isArray(comparisons.formation) ? comparisons.formation : [];
    const clock = comparisons.clock || {};
    function boundedMetric(value) {
      const number = Number(value == null ? 0 : value);
      if (Number.isNaN(number) || number <= 0) return 0;
      return Number.isFinite(number) ? number : Number.MAX_VALUE;
    }
    function mean(values) {
      let result = 0;
      values.forEach((value, index) => {
        result += (boundedMetric(value) - result) / (index + 1);
        if (!Number.isFinite(result)) result = Number.MAX_VALUE;
      });
      return boundedMetric(result);
    }
    return {
      ball: {
        positionErrorWorld: boundedMetric(ball.positionErrorWorld),
        velocityErrorWorldPerFrame: boundedMetric(ball.velocityErrorWorldPerFrame)
      },
      movement: {
        maximumPositionError: boundedMetric(movement.maximumPositionError),
        maximumVelocityError: boundedMetric(movement.maximumVelocityError),
        ownerAgreement: movement.candidateBallOwnerId === movement.legacyBallOwnerId,
        observedPlayerCount: Array.isArray(movement.players) ? movement.players.length : 0
      },
      formation: formation.map(entry => {
        const errors = Array.isArray(entry.targets) ? entry.targets.map(target => boundedMetric(target.error)) : [];
        return {
          teamId: entry.teamId,
          formation: entry.formation,
          phase: entry.phase,
          observedPlayerCount: errors.length,
          maximumTargetError: errors.reduce((maximum, value) => Math.max(maximum, value), 0),
          meanTargetError: mean(errors)
        };
      }),
      clock: {
        periodAgreement: clock.legacyPeriod === clock.candidatePeriod,
        phaseAgreement: clock.legacyPhase === clock.candidatePhase,
        absoluteGameplaySecondsError: boundedMetric(Math.abs(Number(clock.gameplaySecondsDelta || 0)))
      }
    };
  }

  function createAdapter(options) {
    assertDependency();
    const source = options && typeof options === 'object' ? options : {};
    const status = resolveStatus(source);
    const fixedTickSeconds = source.fixedTickSeconds == null ? 1 / 60 : positive(source.fixedTickSeconds, 'fixedTickSeconds');
    const seed = source.seed == null ? 173 : integer(source.seed, 1, 'seed');
    const traceLimit = Math.max(1, Math.min(MAX_TRACE_RECORDS,
      source.traceLimit == null ? MAX_TRACE_RECORDS : integer(source.traceLimit, 1, 'traceLimit')));
    const sessionId = string(String(source.sessionId || ('build173-live-shadow-' + seed)), 'sessionId');
    let shadow = null;
    let epochId = null;
    let mappingSignature = null;
    let sequence = 0;
    const records = [];
    const recordSizes = [];

    if (status.enabled) {
      const orchestratorCapability = Orchestrator.createCapability({
        workflow: status.workflow,
        acknowledgement: Orchestrator.ACKNOWLEDGEMENT
      });
      shadow = Orchestrator.createAdapter({
        enabled: true,
        workflow: status.workflow,
        capability: orchestratorCapability,
        fixedTickSeconds,
        seed,
        traceLimit,
        sessionId: sessionId + ':unified'
      });
    }

    function append(type, details) {
      const item = {
        schema: TRACE_SCHEMA,
        version: VERSION,
        sessionId,
        sequence: sequence++,
        type,
        status: clone(status),
        ...(clone(details) || {})
      };
      const itemBytes = assertBoundedPlainData(item, 'live shadow telemetry record', {
        maximumBytes: MAX_TELEMETRY_RECORD_BYTES,
        maximumDepth: 24,
        maximumNodes: 24000,
        maximumArrayLength: 512,
        maximumObjectKeys: 512,
        maximumStringLength: 2048
      });
      records.push(item);
      recordSizes.push(itemBytes);
      if (records.length > traceLimit) {
        records.shift();
        recordSizes.shift();
      }
      while (recordSizes.reduce((sum, value) => sum + value, 0) > MAX_TELEMETRY_EXPORT_BYTES - 4096) {
        records.shift();
        recordSizes.shift();
      }
      return clone(item);
    }

    function observe(observation) {
      if (!status.enabled) {
        const trace = append('observation-skipped', {
          reason: status.reason,
          suppliedTick: observation && Number.isInteger(observation.tick) ? observation.tick : null,
          appliedToLive: false
        });
        return {
          schema: OUTPUT_SCHEMA,
          version: VERSION,
          enabled: false,
          authority: HOST_AUTHORITY,
          readOnly: true,
          candidateExposed: false,
          appliedToLive: false,
          reason: status.reason,
          trace
        };
      }
      const prepared = assertObservation(observation, { workflow: status.workflow });
      if (Math.abs(prepared.mapped.fixedTickSeconds - fixedTickSeconds) > 1e-12) {
        throw new Error('observation fixed tick does not match the live shadow adapter fixed tick');
      }
      if (epochId == null && prepared.mapped.tick !== 1) throw new Error('live shadow attachment must begin at tick 1');
      if (epochId == null && observation.epoch.stage !== PRE_MATCH_STAGE) throw new Error('live shadow attachment must begin at the pre-match epoch');
      if (epochId != null && observation.epoch.id !== epochId) throw new Error('Build 173 match epoch cannot change during a live shadow trace');
      const signature = stableJson(prepared.mapped.mapping);
      if (mappingSignature != null && signature !== mappingSignature) throw new Error('Build 173 identity/unit/clock mapping cannot change during a trace');
      const result = shadow.observe(prepared.mapped);
      const comparison = boundedComparison(result.telemetry);
      const telemetry = {
        schema: TELEMETRY_SCHEMA,
        version: VERSION,
        sessionId,
        tick: result.tick,
        fixedTickSeconds: result.fixedTickSeconds,
        workflow: result.workflow,
        authority: HOST_AUTHORITY,
        shadowAuthority: result.shadowAuthority,
        readOnly: true,
        candidateExposed: false,
        appliedToLive: false,
        mappingComplete: true,
        hostMapping: clone(prepared.hostMapping),
        ballForceControlPolicy: clone(prepared.hostMapping.ballForceControlPolicy),
        componentVersions: clone(result.telemetry.componentVersions),
        commandDerivationCount: Array.isArray(result.telemetry.commandDerivations)
          ? result.telemetry.commandDerivations.length : 0,
        comparison
      };
      const trace = append('build173-live-shadow-observation', {
        tick: result.tick,
        appliedToLive: false,
        telemetry
      });
      epochId = observation.epoch.id;
      mappingSignature = signature;
      return {
        schema: OUTPUT_SCHEMA,
        version: VERSION,
        enabled: true,
        tick: result.tick,
        fixedTickSeconds: result.fixedTickSeconds,
        workflow: result.workflow,
        authority: HOST_AUTHORITY,
        shadowAuthority: result.shadowAuthority,
        readOnly: true,
        candidateExposed: false,
        appliedToLive: false,
        telemetry,
        trace
      };
    }

    function exportTelemetry() {
      const exported = {
        schema: TRACE_SCHEMA + '-export',
        version: VERSION,
        sessionId,
        status: clone(status),
        fixedTickSeconds,
        traceLimit,
        recordCount: records.length,
        records: clone(records),
        readOnly: true,
        candidateExposed: false,
        appliedToLive: false
      };
      assertBoundedPlainData(exported, 'live shadow telemetry export', {
        maximumBytes: MAX_TELEMETRY_EXPORT_BYTES,
        maximumDepth: 28,
        maximumNodes: 50000,
        maximumArrayLength: 1024,
        maximumObjectKeys: 512,
        maximumStringLength: 4096
      });
      return exported;
    }

    function reset() {
      epochId = null;
      mappingSignature = null;
      sequence = 0;
      records.length = 0;
      recordSizes.length = 0;
      if (shadow) shadow.reset();
    }

    return Object.freeze({
      status,
      sessionId,
      fixedTickSeconds,
      traceLimit,
      observe,
      exportTelemetry,
      stableTelemetryJson() { return stableJson(exportTelemetry()); },
      reset
    });
  }

  return Object.freeze({
    VERSION,
    HOST_SCHEMA,
    HOST_CONTRACT_SCHEMA,
    CAPABILITY_SCHEMA,
    OUTPUT_SCHEMA,
    TELEMETRY_SCHEMA,
    TRACE_SCHEMA,
    ACKNOWLEDGEMENT,
    HOST_AUTHORITY,
    BUILD,
    PRE_MATCH_STAGE,
    MAX_TRACE_RECORDS,
    MAX_OBSERVATION_BYTES,
    MAX_TELEMETRY_RECORD_BYTES,
    MAX_TELEMETRY_EXPORT_BYTES,
    BALL_FORCE_CONTROL_POLICY,
    METRIC_PITCH,
    REQUIRED_PLAYER_ATTRIBUTES,
    HOST_CONTROL_MODES,
    THROW_IN_KIND,
    THROW_IN_EXCEPTION,
    createCapability,
    resolveStatus,
    validateObservation,
    createAdapter,
    stableJson
  });
});
