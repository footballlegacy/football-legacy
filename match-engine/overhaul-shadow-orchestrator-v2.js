'use strict';

/*
 * Football Legacy unified overhaul shadow orchestrator v2.
 *
 * Intentionally dormant and read-only. Build 173 remains the sole live
 * authority. This adapter can compose the five V2 candidates against explicit
 * legacy before/after snapshots, but it never returns or writes a live command,
 * ball, clock, formation or decision. It is disabled unless an exact scoped
 * observation capability is supplied, and online remains frozen.
 */
(function exposeUnifiedShadow(root, factory) {
  const dependencies = typeof module === 'object' && module.exports
    ? {
        Bridge: require('./ball-shadow-bridge-v2.js'),
        CPU: require('./cpu-intelligence-v2.js'),
        Movement: require('./movement-engine-v2.js'),
        Formation: require('./formation-behaviour-v2.js'),
        Clock: require('./match-clock-v2.js')
      }
    : {
        Bridge: root && root.FootballLegacyBallShadowBridgeV2,
        CPU: root && root.FootballLegacyCPUIntelligenceV2,
        Movement: root && root.FootballLegacyMovementEngineV2,
        Formation: root && root.FootballLegacyFormationBehaviourV2,
        Clock: root && root.FootballLegacyMatchClockV2
      };
  const api = factory(dependencies);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyOverhaulShadowOrchestratorV2 = api;
})(typeof window === 'object' ? window : null, function createUnifiedShadowApi(dependencies) {
  'use strict';

  const VERSION = '2.0.0-dormant-unified-shadow';
  const CAPABILITY_SCHEMA = 'football-legacy-unified-shadow-capability-v2';
  const LEGACY_SNAPSHOT_SCHEMA = 'football-legacy-unified-legacy-snapshot-v2';
  const MAPPING_SCHEMA = 'football-legacy-unified-mapping-v2';
  const OUTPUT_SCHEMA = 'football-legacy-unified-shadow-output-v2';
  const TELEMETRY_SCHEMA = 'football-legacy-unified-shadow-telemetry-v2';
  const TRACE_SCHEMA = 'football-legacy-unified-shadow-trace-v2';
  const ACKNOWLEDGEMENT = 'EXPLICIT_READ_ONLY_SHADOW_NO_BUILD_173_AUTHORITY';
  const LIVE_AUTHORITY = 'build-173-legacy';
  const SHADOW_AUTHORITY = 'v2-read-only-shadow';
  const COMPONENT_ORDER = Object.freeze([
    'clock-phase',
    'formation-behaviour',
    'cpu-intelligence',
    'movement-contact',
    'ball-integration',
    'comparison-telemetry'
  ]);
  const WORKFLOWS = Object.freeze({
    ONLINE: 'online',
    SET_PIECE_SUITE: 'set-piece-suite',
    SINGLE_PLAYER: 'single-player',
    QUICK_PLAY: 'quick-play',
    LOCAL_TWO_PLAYER: 'local-two-player',
    HOME_COOP: 'home-coop',
    CPU_V_CPU: 'cpu-v-cpu'
  });
  const OFFLINE_WORKFLOWS = Object.freeze(Object.values(WORKFLOWS).filter(value => value !== WORKFLOWS.ONLINE));
  const REQUIRED_COMPONENTS = Object.freeze(['ball', 'movement', 'cpu', 'formation', 'clock']);

  const Bridge = dependencies && dependencies.Bridge;
  const CPU = dependencies && dependencies.CPU;
  const Movement = dependencies && dependencies.Movement;
  const Formation = dependencies && dependencies.Formation;
  const Clock = dependencies && dependencies.Clock;

  function assertDependencies() {
    const missing = [];
    if (!Bridge || Bridge.VERSION !== '2.0.0-dormant-shadow-bridge') missing.push('Ball Shadow Bridge V2');
    if (!CPU || CPU.VERSION !== '2.0.0-dormant') missing.push('CPU Intelligence V2');
    if (!Movement || Movement.VERSION !== '2.0.0-dormant') missing.push('Movement/Contact V2');
    if (!Formation || Formation.VERSION !== '2.0.0-dormant') missing.push('Formation Behaviour V2');
    if (!Clock || Clock.VERSION !== '2.0.0-dormant') missing.push('MatchClock V2');
    if (missing.length) throw new Error('Unified shadow dependencies are incomplete: ' + missing.join(', '));
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

  function stableJson(value) {
    return JSON.stringify(stableValue(value));
  }

  function finite(value, fallback, label) {
    const resolved = Number.isFinite(value) ? Number(value) : fallback;
    if (!Number.isFinite(resolved)) throw new TypeError((label || 'value') + ' must be finite');
    return resolved;
  }

  function positive(value, fallback, label) {
    const resolved = finite(value, fallback, label);
    if (!(resolved > 0)) throw new RangeError((label || 'value') + ' must be positive');
    return resolved;
  }

  function nonNegativeInteger(value, fallback, label) {
    const resolved = Number.isInteger(value) ? value : fallback;
    if (!Number.isInteger(resolved) || resolved < 0) {
      throw new TypeError((label || 'value') + ' must be a non-negative integer');
    }
    return resolved;
  }

  function normalizedVector(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    return length <= 1e-12 ? { x: 0, y: 0 } : { x: dx / length, y: dy / length };
  }

  function createCapability(options) {
    assertDependencies();
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || '');
    if (!OFFLINE_WORKFLOWS.includes(workflow)) {
      throw new Error('unified shadow capability requires a recognised offline workflow');
    }
    if (source.acknowledgement !== ACKNOWLEDGEMENT) {
      throw new Error('unified shadow capability requires the exact read-only acknowledgement');
    }
    return Object.freeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      workflow,
      scope: SHADOW_AUTHORITY,
      explicit: true,
      readOnly: true,
      acknowledgement: ACKNOWLEDGEMENT
    });
  }

  function validCapability(capability, workflow) {
    return Boolean(capability && capability.schema === CAPABILITY_SCHEMA && capability.version === VERSION &&
      capability.workflow === workflow && capability.scope === SHADOW_AUTHORITY && capability.explicit === true &&
      capability.readOnly === true && capability.acknowledgement === ACKNOWLEDGEMENT);
  }

  function resolveStatus(options) {
    assertDependencies();
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || WORKFLOWS.QUICK_PLAY);
    const requestedEnabled = source.enabled === true;
    let enabled = false;
    let reason = requestedEnabled ? 'capability-rejected' : 'disabled-by-default';
    if (!Object.values(WORKFLOWS).includes(workflow)) reason = 'unknown-workflow';
    else if (workflow === WORKFLOWS.ONLINE || source.online === true) reason = 'online-frozen';
    else if (requestedEnabled && validCapability(source.capability, workflow)) {
      enabled = true;
      reason = 'explicit-read-only-shadow';
    }
    return Object.freeze({
      requestedEnabled,
      enabled,
      reason,
      workflow,
      liveAuthority: LIVE_AUTHORITY,
      shadowAuthority: enabled ? SHADOW_AUTHORITY : null,
      readOnly: true,
      appliedToLive: false
    });
  }

  function mapId(id, mapping, label) {
    if (id == null) return null;
    const key = String(id);
    const playerIds = mapping && mapping.playerIds;
    if (!playerIds || !Object.prototype.hasOwnProperty.call(playerIds, key)) {
      throw new Error((label || 'player id') + ' has no explicit playerIds mapping: ' + key);
    }
    const candidateId = String(playerIds[key] || '');
    if (!candidateId) throw new Error((label || 'player id') + ' maps to an empty candidate id: ' + key);
    return candidateId;
  }

  function mapPlayer(player, mapping) {
    const result = clone(player);
    result.id = mapId(player && player.id, mapping, 'player');
    return result;
  }

  function mapMovementWorld(world, mapping, label) {
    if (!world || typeof world !== 'object') throw new TypeError(label + ' is required');
    const result = clone(world);
    result.players = (Array.isArray(world.players) ? world.players : []).map(player => mapPlayer(player, mapping));
    result.ballOwnerId = world.ballOwnerId == null ? null : mapId(world.ballOwnerId, mapping, label + '.ballOwnerId');
    return Movement.createWorldState(result, mapping.movement.config);
  }

  function mapMovementCommand(command, mapping) {
    const result = clone(command);
    result.playerId = mapId(command && command.playerId, mapping, 'movement command playerId');
    result.targetId = command && command.targetId != null
      ? mapId(command.targetId, mapping, 'movement command targetId')
      : null;
    return result;
  }

  function mapCpuSnapshot(snapshot, mapping) {
    const result = clone(snapshot);
    result.players = (Array.isArray(snapshot.players) ? snapshot.players : []).map(player => mapPlayer(player, mapping));
    result.carrierId = snapshot.carrierId == null ? null : mapId(snapshot.carrierId, mapping, 'cpu carrierId');
    result.events = (Array.isArray(snapshot.events) ? snapshot.events : []).map(event => ({
      ...clone(event),
      playerId: event.playerId == null ? null : mapId(event.playerId, mapping, 'cpu event playerId')
    }));
    return CPU.validateSnapshot(result, mapping.cpu.config);
  }

  function mapFormationRequest(request, mapping) {
    const result = clone(request);
    if (Array.isArray(result.lineup)) {
      result.lineup = result.lineup.map(player => ({
        ...player,
        id: mapId(player.id, mapping, 'formation lineup player id')
      }));
    }
    return result;
  }

  function transformPoint(point, transform) {
    return {
      x: finite(point && point.x, NaN, 'target.x') * transform.xScale + transform.xOffset,
      y: finite(point && point.y, NaN, 'target.y') * transform.yScale + transform.yOffset
    };
  }

  function validateMappingShape(mapping, fixedTickSeconds, errors) {
    if (!mapping || typeof mapping !== 'object') {
      errors.push('mapping is required');
      return;
    }
    if (mapping.schema !== MAPPING_SCHEMA) errors.push('mapping.schema must be ' + MAPPING_SCHEMA);
    if (mapping.complete !== true) errors.push('mapping.complete must be exactly true');
    if (!Number.isFinite(mapping.fixedTickSeconds) || Math.abs(mapping.fixedTickSeconds - fixedTickSeconds) > 1e-12) {
      errors.push('mapping.fixedTickSeconds must equal the unified fixed tick');
    }
    const components = mapping.components;
    REQUIRED_COMPONENTS.forEach(component => {
      if (!components || components[component] !== true) errors.push('mapping.components.' + component + ' must be exactly true');
      if (!mapping[component] || mapping[component].complete !== true) errors.push('mapping.' + component + '.complete must be exactly true');
    });
    if (!mapping.playerIds || typeof mapping.playerIds !== 'object' || Array.isArray(mapping.playerIds)) {
      errors.push('mapping.playerIds must explicitly map every legacy player id');
    } else {
      const values = Object.values(mapping.playerIds).map(value => String(value || ''));
      if (values.some(value => !value)) errors.push('mapping.playerIds cannot contain empty candidate ids');
      if (new Set(values).size !== values.length) errors.push('mapping.playerIds must be one-to-one');
    }
    const transform = mapping.coordinateTransform;
    for (const key of ['xScale', 'xOffset', 'yScale', 'yOffset']) {
      if (!transform || !Number.isFinite(transform[key])) errors.push('mapping.coordinateTransform.' + key + ' must be finite');
    }
    if (transform && (Math.abs(transform.xScale) <= 1e-12 || Math.abs(transform.yScale) <= 1e-12)) {
      errors.push('mapping coordinate scales must not be zero');
    }
    const units = mapping.ball && mapping.ball.units;
    if (!units || !Number.isFinite(units.framesPerSecond) ||
      Math.abs(units.framesPerSecond * fixedTickSeconds - 1) > 1e-9) {
      errors.push('mapping.ball.units.framesPerSecond must be the reciprocal of the unified fixed tick');
    }
    const phaseMap = mapping.clock && mapping.clock.phaseMap;
    if (!phaseMap || typeof phaseMap !== 'object' || Array.isArray(phaseMap)) {
      errors.push('mapping.clock.phaseMap must explicitly map legacy phases');
    }
  }

  function tryNormalizeLegacySnapshot(snapshot, options) {
    assertDependencies();
    const errors = [];
    const source = snapshot && typeof snapshot === 'object' ? snapshot : null;
    if (!source) return { valid: false, errors: ['legacy snapshot must be an object'], normalized: null };
    if (source.schema !== LEGACY_SNAPSHOT_SCHEMA) errors.push('snapshot.schema must be ' + LEGACY_SNAPSHOT_SCHEMA);
    if (!Number.isInteger(source.tick) || source.tick < 1) errors.push('snapshot.tick must be an integer of at least 1');
    if (!Number.isFinite(source.fixedTickSeconds) || !(source.fixedTickSeconds > 0)) {
      errors.push('snapshot.fixedTickSeconds must be explicit and positive');
    }
    const fixedTickSeconds = Number.isFinite(source.fixedTickSeconds) ? Number(source.fixedTickSeconds) : 1 / 60;
    const workflow = String(source.workflow || '');
    if (!Object.values(WORKFLOWS).includes(workflow)) errors.push('snapshot.workflow is not recognised');
    if (options && options.workflow && workflow !== options.workflow) errors.push('snapshot.workflow does not match the adapter workflow');
    const mapping = source.mapping;
    validateMappingShape(mapping, fixedTickSeconds, errors);
    const legacy = source.legacy;
    if (!legacy || typeof legacy !== 'object') errors.push('snapshot.legacy is required');
    if (errors.length) return { valid: false, errors, normalized: null };

    try {
      const ball = legacy.ball;
      if (!ball || typeof ball !== 'object') throw new TypeError('legacy.ball is required');
      const bridgeOptions = {
        units: mapping.ball.units,
        mapping: mapping.ball.mapping,
        config: mapping.ball.config,
        outerTick: source.tick - 1,
        elapsed: (source.tick - 1) * fixedTickSeconds
      };
      const ballBefore = Bridge.legacyToCandidateState(ball.before, bridgeOptions);
      const ballAfter = Bridge.legacyToCandidateState(ball.after, { ...bridgeOptions, outerTick: source.tick, elapsed: source.tick * fixedTickSeconds });
      if (!ballBefore.completeMapping || !ballAfter.completeMapping) {
        const fields = Array.from(new Set(ballBefore.unmappedFields.concat(ballAfter.unmappedFields)));
        throw new Error('ball mapping is incomplete; unmapped fields: ' + fields.join(', '));
      }

      const movement = legacy.movement;
      if (!movement || typeof movement !== 'object') throw new TypeError('legacy.movement is required');
      const movementBefore = mapMovementWorld(movement.before, mapping, 'legacy.movement.before');
      const movementAfter = mapMovementWorld(movement.after, mapping, 'legacy.movement.after');
      if (movementBefore.tick !== source.tick - 1) throw new Error('legacy movement before tick must equal snapshot.tick - 1');
      if (movementAfter.tick !== source.tick) throw new Error('legacy movement after tick must equal snapshot.tick');
      if (Math.abs(movementBefore.fixedTickSeconds - fixedTickSeconds) > 1e-12 ||
        Math.abs(movementAfter.fixedTickSeconds - fixedTickSeconds) > 1e-12) {
        throw new Error('legacy movement fixed tick must equal the unified fixed tick');
      }
      const movementIds = new Set(movementBefore.players.map(player => player.id));
      if (movementAfter.players.length !== movementBefore.players.length ||
        movementAfter.players.some(player => !movementIds.has(player.id))) {
        throw new Error('legacy movement before/after player identity sets must match');
      }
      const movementOwnership = Object.fromEntries(
        movementBefore.players.map(player => [player.id, player.teamId])
      );
      movementAfter.players.forEach(player => {
        if (movementOwnership[player.id] !== player.teamId) {
          throw new Error('legacy movement player team ownership cannot change within one tick: ' + player.id);
        }
      });
      const movementCommands = (Array.isArray(movement.commands) ? movement.commands : []).map(command => {
        const mapped = mapMovementCommand(command, mapping);
        if (mapped.tick !== source.tick) throw new Error('every explicit movement command must target snapshot.tick');
        return mapped;
      });

      const cpuEntries = Array.isArray(legacy.cpu) ? legacy.cpu : null;
      if (!cpuEntries) throw new TypeError('legacy.cpu must be an explicit array (empty is allowed)');
      const expectedCpuTeams = Array.isArray(mapping.cpu.expectedTeamIds) ? mapping.cpu.expectedTeamIds.map(String).sort() : null;
      if (!expectedCpuTeams) throw new TypeError('mapping.cpu.expectedTeamIds must be an explicit array');
      if (new Set(expectedCpuTeams).size !== expectedCpuTeams.length) {
        throw new Error('mapping.cpu.expectedTeamIds must contain unique team ids');
      }
      const actualCpuTeams = cpuEntries.map(entry => String(entry && entry.teamId || '')).sort();
      if (new Set(actualCpuTeams).size !== actualCpuTeams.length) {
        throw new Error('legacy.cpu must contain at most one entry per unique team id');
      }
      if (stableJson(actualCpuTeams) !== stableJson(expectedCpuTeams.slice().sort())) {
        throw new Error('legacy.cpu team set does not match mapping.cpu.expectedTeamIds');
      }
      const cpu = cpuEntries.map(entry => {
        if (!entry || typeof entry.teamId !== 'string' || !entry.teamId) throw new TypeError('every cpu entry requires teamId');
        const mapped = mapCpuSnapshot(entry.snapshot, mapping);
        if (mapped.tick !== source.tick) throw new Error('cpu snapshot tick must equal unified snapshot.tick');
        if (mapped.teamId !== entry.teamId) throw new Error('cpu entry teamId must match its mapped snapshot.teamId');
        const cpuIds = new Set(mapped.players.map(player => player.id));
        if (cpuIds.size !== mapped.players.length || cpuIds.size !== movementIds.size ||
          Array.from(movementIds).some(playerId => !cpuIds.has(playerId))) {
          throw new Error('cpu snapshot player roster must exactly match the complete movement roster');
        }
        mapped.players.forEach(player => {
          if (!movementIds.has(player.id)) throw new Error('cpu player missing from movement mapping: ' + player.id);
          if (movementOwnership[player.id] !== player.teamId) {
            throw new Error('cpu player team ownership conflicts with movement identity: ' + player.id);
          }
        });
        return { teamId: entry.teamId, snapshot: mapped };
      }).sort((a, b) => a.teamId.localeCompare(b.teamId));

      const formationEntries = Array.isArray(legacy.formation) ? legacy.formation : null;
      if (!formationEntries) throw new TypeError('legacy.formation must be an explicit array');
      const expectedFormationTeams = Array.isArray(mapping.formation.expectedTeamIds)
        ? mapping.formation.expectedTeamIds.map(String).sort()
        : null;
      if (!expectedFormationTeams) throw new TypeError('mapping.formation.expectedTeamIds must be an explicit array');
      if (new Set(expectedFormationTeams).size !== expectedFormationTeams.length) {
        throw new Error('mapping.formation.expectedTeamIds must contain unique team ids');
      }
      const actualFormationTeams = formationEntries.map(entry => String(entry && entry.teamId || '')).sort();
      if (new Set(actualFormationTeams).size !== actualFormationTeams.length) {
        throw new Error('legacy.formation must contain at most one entry per unique team id');
      }
      if (stableJson(actualFormationTeams) !== stableJson(expectedFormationTeams.slice().sort())) {
        throw new Error('legacy.formation team set does not match mapping.formation.expectedTeamIds');
      }
      const formation = formationEntries.map(entry => {
        if (!entry || typeof entry.teamId !== 'string' || !entry.teamId) throw new TypeError('every formation entry requires teamId');
        const request = mapFormationRequest(entry.request, mapping);
        if (request.tick !== source.tick) throw new Error('formation request tick must equal unified snapshot.tick');
        const output = Formation.resolve(request);
        output.targets.forEach(target => {
          if (!movementIds.has(target.playerId)) throw new Error('formation player missing from movement mapping: ' + target.playerId);
          if (movementOwnership[target.playerId] !== entry.teamId) {
            throw new Error('formation player must belong to the formation entry team: ' + target.playerId);
          }
        });
        return { teamId: entry.teamId, request, validationOutput: output };
      }).sort((a, b) => a.teamId.localeCompare(b.teamId));

      const clock = legacy.clock;
      if (!clock || typeof clock !== 'object') throw new TypeError('legacy.clock is required');
      const phaseMap = mapping.clock.phaseMap;
      if (!Object.prototype.hasOwnProperty.call(phaseMap, clock.legacyPhase)) {
        throw new Error('legacy clock phase has no explicit phaseMap entry: ' + String(clock.legacyPhase));
      }
      const clockPhase = String(phaseMap[clock.legacyPhase]);
      if (!Clock.PHASES.includes(clockPhase)) throw new Error('mapped clock phase is unsupported: ' + clockPhase);
      if (typeof clock.ballLive !== 'boolean') throw new TypeError('legacy.clock.ballLive must be explicit');
      if (clock.ballLive !== (clockPhase === 'live')) throw new Error('legacy clock ballLive conflicts with the mapped phase');
      if (!['first-half', 'half-time', 'second-half', 'full-time'].includes(clock.period)) {
        throw new Error('legacy.clock.period is unsupported');
      }
      if (!Number.isFinite(clock.gameplaySeconds) || clock.gameplaySeconds < 0) {
        throw new TypeError('legacy.clock.gameplaySeconds must be finite and non-negative');
      }

      return {
        valid: true,
        errors: [],
        normalized: {
          schema: LEGACY_SNAPSHOT_SCHEMA,
          tick: source.tick,
          fixedTickSeconds,
          workflow,
          source: clone(source),
          mapping: clone(mapping),
          ball: { before: clone(ball.before), after: clone(ball.after), environment: clone(ball.environment) },
          movement: { before: movementBefore, after: movementAfter, commands: movementCommands },
          cpu,
          formation,
          clock: {
            legacyPhase: String(clock.legacyPhase),
            phase: clockPhase,
            period: clock.period,
            ballLive: clock.ballLive,
            gameplaySeconds: Number(clock.gameplaySeconds),
            event: clock.event ? clone(clock.event) : null,
            reason: String(clock.reason || clock.legacyPhase)
          }
        }
      };
    } catch (error) {
      errors.push(error && error.message ? error.message : String(error));
      return { valid: false, errors, normalized: null };
    }
  }

  function validateLegacySnapshot(snapshot, options) {
    const result = tryNormalizeLegacySnapshot(snapshot, options);
    return { valid: result.valid, errors: result.errors.slice() };
  }

  function assertLegacySnapshot(snapshot, options) {
    const result = tryNormalizeLegacySnapshot(snapshot, options);
    if (!result.valid) throw new Error('incomplete unified legacy mapping: ' + result.errors.join('; '));
    return result.normalized;
  }

  function movementComparison(candidate, legacyAfter) {
    const legacyById = Object.fromEntries(legacyAfter.players.map(player => [player.id, player]));
    const players = candidate.players.map(player => {
      const legacy = legacyById[player.id];
      const dx = player.position.x - legacy.position.x;
      const dy = player.position.y - legacy.position.y;
      const dvx = player.velocity.x - legacy.velocity.x;
      const dvy = player.velocity.y - legacy.velocity.y;
      return {
        playerId: player.id,
        positionDelta: { x: dx, y: dy },
        velocityDelta: { x: dvx, y: dvy },
        positionError: Math.hypot(dx, dy),
        velocityError: Math.hypot(dvx, dvy),
        candidateStamina: player.stamina,
        legacyStamina: legacy.stamina,
        action: player.action ? clone(player.action) : null
      };
    });
    return {
      players,
      maximumPositionError: players.reduce((maximum, row) => Math.max(maximum, row.positionError), 0),
      maximumVelocityError: players.reduce((maximum, row) => Math.max(maximum, row.velocityError), 0),
      candidateBallOwnerId: candidate.ballOwnerId,
      legacyBallOwnerId: legacyAfter.ballOwnerId
    };
  }

  function formationComparison(outputs, legacyAfter, transform) {
    const actualById = Object.fromEntries(legacyAfter.players.map(player => [player.id, player]));
    return outputs.map(entry => ({
      teamId: entry.teamId,
      phase: entry.output.phase,
      formation: entry.output.formation,
      targets: entry.output.targets.map(target => {
        const targetMovement = transformPoint(target.target, transform);
        const actual = actualById[target.playerId];
        return {
          playerId: target.playerId,
          slotId: target.slotId,
          target: targetMovement,
          legacyPosition: clone(actual.position),
          error: Math.hypot(targetMovement.x - actual.position.x, targetMovement.y - actual.position.y)
        };
      })
    }));
  }

  function addCommand(commands, locked, command) {
    if (locked.has(command.playerId)) return false;
    commands.push(command);
    locked.add(command.playerId);
    return true;
  }

  function deriveMovementCommands(normalized, movementState, decisions, formationOutputs) {
    const commands = normalized.movement.commands.map(clone);
    const locked = new Set(commands.map(command => command.playerId));
    const players = Object.fromEntries(movementState.players.map(player => [player.id, player]));
    const transform = normalized.mapping.coordinateTransform;
    const derivations = commands.map(command => ({ playerId: command.playerId, source: 'explicit-legacy-command', commandId: command.id || null }));

    decisions.forEach(entry => {
      entry.decision.runs.forEach((run, index) => {
        const player = players[run.playerId];
        const runTarget = run.continuationTarget || run.target;
        if (!player || !runTarget) return;
        const target = transformPoint(runTarget, transform);
        const direction = normalizedVector(player.position, target);
        const accepted = addCommand(commands, locked, {
          id: 'cpu-run:' + entry.teamId + ':' + run.playerId + ':' + normalized.tick + ':' + index,
          tick: normalized.tick,
          playerId: run.playerId,
          type: 'move',
          move: direction,
          facing: direction,
          intensity: 1,
          mode: 'sprint',
          durationTicks: 1
        });
        if (accepted) derivations.push({ playerId: run.playerId, source: 'cpu-committed-run', target, runType: run.type || null });
      });
      const intent = entry.decision.carrierIntent;
      const carrier = players[entry.decision.memory && entry.decision.teamId === entry.teamId
        ? entry.snapshot.carrierId
        : null];
      if (intent && intent.type === 'carry' && intent.target && carrier) {
        const target = transformPoint(intent.target, transform);
        const direction = normalizedVector(carrier.position, target);
        const accepted = addCommand(commands, locked, {
          id: 'cpu-carry:' + entry.teamId + ':' + carrier.id + ':' + normalized.tick,
          tick: normalized.tick,
          playerId: carrier.id,
          type: 'move',
          move: direction,
          facing: direction,
          intensity: 0.9,
          mode: 'run',
          durationTicks: 1
        });
        if (accepted) derivations.push({ playerId: carrier.id, source: 'cpu-carrier-intent', target, intent: 'carry' });
      }
    });

    formationOutputs.forEach(entry => {
      entry.output.targets.forEach(targetRow => {
        const player = players[targetRow.playerId];
        if (!player) return;
        const target = transformPoint(targetRow.target, transform);
        const distance = Math.hypot(target.x - player.position.x, target.y - player.position.y);
        if (distance <= 0.025) return;
        const direction = normalizedVector(player.position, target);
        const accepted = addCommand(commands, locked, {
          id: 'formation:' + entry.teamId + ':' + targetRow.playerId + ':' + normalized.tick,
          tick: normalized.tick,
          playerId: targetRow.playerId,
          type: 'move',
          move: direction,
          facing: direction,
          intensity: Math.min(1, Math.max(0.25, distance / 8)),
          mode: distance > 4 ? 'run' : 'walk',
          durationTicks: 1
        });
        if (accepted) derivations.push({ playerId: targetRow.playerId, source: 'formation-target', target, slotId: targetRow.slotId });
      });
    });
    commands.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
    derivations.sort((a, b) => a.playerId.localeCompare(b.playerId) || a.source.localeCompare(b.source));
    return { commands, derivations };
  }

  function syncClockPhase(state, normalizedClock) {
    let next = state;
    if (normalizedClock.event) {
      next = Clock.transition(next, { ...normalizedClock.event, tick: next.tick });
    }
    const target = normalizedClock.phase;
    if (target === 'paused') {
      if (next.phase !== 'paused') next = Clock.pause(next, { tick: next.tick, reason: normalizedClock.reason });
      return next;
    }
    if (next.phase === 'paused') next = Clock.resume(next, { tick: next.tick, reason: normalizedClock.reason });
    if (next.phase !== target && (next.period === 'first-half' || next.period === 'second-half')) {
      next = Clock.enterPhase(next, target, { tick: next.tick, reason: normalizedClock.reason });
    }
    return next;
  }

  function createInitialClock(normalized, clockConfig) {
    const target = normalized.clock.phase;
    const initialPhase = target === 'paused' ? 'dead-ball' : target;
    let state = Clock.createState({
      ...(clockConfig || {}),
      ...(normalized.mapping.clock.config || {}),
      fixedTickSeconds: normalized.fixedTickSeconds,
      initialPhase,
      initialReason: normalized.clock.reason,
      initialEligibleForAddedTime: false
    });
    if (target === 'paused') state = Clock.pause(state, { tick: 0, reason: normalized.clock.reason });
    return state;
  }

  function assertLegacyBoundaryContinuity(previousMovementAfter, previousBallAfter, previousClock, normalized, firstObservation) {
    if (previousMovementAfter && stableJson(previousMovementAfter) !== stableJson(normalized.movement.before)) {
      throw new Error('legacy movement boundary continuity failed between accepted observations');
    }
    if (previousBallAfter && stableJson(previousBallAfter) !== stableJson(normalized.ball.before)) {
      throw new Error('legacy ball boundary continuity failed between accepted observations');
    }
    const clock = normalized.clock;
    if (firstObservation) {
      if (clock.period !== 'first-half' || clock.gameplaySeconds > normalized.fixedTickSeconds + 1e-9) {
        throw new Error('unified shadow pre-match clock epoch must attach in the first half at tick 1');
      }
      return;
    }
    if (!previousClock) throw new Error('legacy clock continuity state is missing');
    const periodOrder = { 'first-half': 0, 'half-time': 1, 'second-half': 2, 'full-time': 3 };
    const previousOrder = periodOrder[previousClock.period];
    const nextOrder = periodOrder[clock.period];
    if (nextOrder < previousOrder || nextOrder > previousOrder + 1) {
      throw new Error('legacy clock period continuity failed between accepted observations');
    }
    if (clock.gameplaySeconds + 1e-9 < previousClock.gameplaySeconds) {
      throw new Error('legacy clock gameplay time must be monotonic between accepted observations');
    }
  }

  function createAdapter(options) {
    assertDependencies();
    const source = options && typeof options === 'object' ? options : {};
    const status = resolveStatus(source);
    const fixedTickSeconds = positive(source.fixedTickSeconds, 1 / 60, 'fixedTickSeconds');
    const seed = nonNegativeInteger(source.seed, 1, 'seed');
    if (status.enabled && seed === 0) throw new RangeError('enabled unified shadow seed must not be zero');
    const traceLimit = Math.max(1, Math.min(100000, nonNegativeInteger(source.traceLimit, 2000, 'traceLimit')));
    const sessionId = String(source.sessionId || ('unified-shadow-' + seed));
    let expectedTick = null;
    let mappingSignature = null;
    let bridge = null;
    let movementState = null;
    let clockState = null;
    let cpuMemories = {};
    let lastLegacyMovementAfter = null;
    let lastLegacyBallAfter = null;
    let lastLegacyClock = null;
    let sequence = 0;
    const records = [];

    function record(type, details) {
      const item = {
        schema: TRACE_SCHEMA,
        version: VERSION,
        sessionId,
        sequence: sequence++,
        type,
        status: clone(status),
        ...(clone(details) || {})
      };
      records.push(item);
      if (records.length > traceLimit) records.shift();
      return clone(item);
    }

    function observe(snapshot) {
      if (!status.enabled) {
        const skipped = record('observation-skipped', {
          reason: status.reason,
          suppliedTick: snapshot && Number.isInteger(snapshot.tick) ? snapshot.tick : null,
          appliedToLive: false
        });
        return {
          schema: OUTPUT_SCHEMA,
          version: VERSION,
          enabled: false,
          authority: LIVE_AUTHORITY,
          appliedToLive: false,
          readOnly: true,
          reason: status.reason,
          record: skipped
        };
      }

      const normalized = assertLegacySnapshot(snapshot, { workflow: status.workflow });
      if (Math.abs(normalized.fixedTickSeconds - fixedTickSeconds) > 1e-12) {
        throw new Error('snapshot fixed tick does not match adapter fixed tick');
      }
      const firstObservation = expectedTick == null;
      if (firstObservation && normalized.tick !== 1) {
        throw new Error('unified shadow must attach at pre-match tick 1 so all five candidate clocks share one epoch');
      }
      const stagedMappingSignature = firstObservation ? stableJson(normalized.mapping) : mappingSignature;
      if (normalized.tick !== (firstObservation ? 1 : expectedTick)) {
        throw new Error('unified shadow observations must be sequential fixed ticks');
      }
      if (!firstObservation && stableJson(normalized.mapping) !== mappingSignature) {
        throw new Error('unified mapping cannot change during a shadow trace');
      }
      assertLegacyBoundaryContinuity(
        lastLegacyMovementAfter,
        lastLegacyBallAfter,
        lastLegacyClock,
        normalized,
        firstObservation
      );

      let stagedBridge = bridge;
      let stagedMovementState = movementState;
      let stagedClockState = clockState;
      const stagedCpuMemories = clone(cpuMemories);
      if (firstObservation) {
        stagedBridge = Bridge.createBridge({
          mode: Bridge.MODES.SHADOW,
          workflow: status.workflow,
          seed,
          sessionId: sessionId + ':ball',
          traceLimit,
          units: normalized.mapping.ball.units,
          mapping: normalized.mapping.ball.mapping,
          config: normalized.mapping.ball.config
        });
        stagedMovementState = Movement.createWorldState(normalized.movement.before, normalized.mapping.movement.config);
        stagedClockState = createInitialClock(normalized, source.clockConfig);
      }
      if (stagedMovementState.tick !== normalized.tick - 1) throw new Error('movement candidate tick lost unified alignment');
      if (stagedClockState.tick !== normalized.tick - 1) throw new Error('MatchClock candidate tick lost unified alignment');

      stagedClockState = syncClockPhase(stagedClockState, normalized.clock);
      const formationOutputs = normalized.formation.map(entry => ({
        teamId: entry.teamId,
        output: Formation.resolve(entry.request)
      }));
      const decisions = normalized.cpu.map(entry => {
        const memory = stagedCpuMemories[entry.teamId] || CPU.createMemory();
        const decision = CPU.decide(entry.snapshot, memory, normalized.mapping.cpu.config);
        stagedCpuMemories[entry.teamId] = clone(decision.memory);
        return { teamId: entry.teamId, snapshot: entry.snapshot, decision };
      });
      const derived = deriveMovementCommands(normalized, stagedMovementState, decisions, formationOutputs);
      const movementResult = Movement.step(stagedMovementState, derived.commands, normalized.mapping.movement.config);
      const nextMovementState = movementResult.state;
      const nextClockState = Clock.step(stagedClockState);
      const clockOutput = Clock.snapshot(nextClockState);

      if (nextMovementState.tick !== normalized.tick || nextClockState.tick !== normalized.tick ||
        formationOutputs.some(entry => entry.output.tick !== normalized.tick) ||
        decisions.some(entry => entry.decision.tick !== normalized.tick)) {
        throw new Error('one or more V2 components failed the unified fixed-tick barrier');
      }

      // Ball observation is deliberately last because the bridge owns an
      // internal trace. Every caller-controlled validation and every other
      // candidate step must succeed before that trace can advance.
      const ballResult = stagedBridge.observeStep({
        legacyBefore: normalized.ball.before,
        legacyAfter: normalized.ball.after,
        outerTick: normalized.tick,
        environment: normalized.ball.environment,
        config: normalized.mapping.ball.config
      });
      if (ballResult.context.outerTick !== normalized.tick) {
        throw new Error('one or more V2 components failed the unified fixed-tick barrier');
      }

      const comparisons = {
        ball: clone(ballResult.comparison),
        movement: movementComparison(nextMovementState, normalized.movement.after),
        formation: formationComparison(formationOutputs, normalized.movement.after, normalized.mapping.coordinateTransform),
        clock: {
          legacyPeriod: normalized.clock.period,
          candidatePeriod: clockOutput.period,
          legacyGameplaySeconds: normalized.clock.gameplaySeconds,
          candidateGameplaySeconds: clockOutput.clocks.gameplaySeconds,
          gameplaySecondsDelta: clockOutput.clocks.gameplaySeconds - normalized.clock.gameplaySeconds,
          legacyPhase: normalized.clock.phase,
          candidatePhase: clockOutput.phase
        }
      };
      const componentVersions = {
        ballBridge: Bridge.VERSION,
        cpu: CPU.VERSION,
        movement: Movement.VERSION,
        formation: Formation.VERSION,
        clock: Clock.VERSION
      };
      const telemetry = {
        schema: TELEMETRY_SCHEMA,
        version: VERSION,
        sessionId,
        tick: normalized.tick,
        fixedTickSeconds: normalized.fixedTickSeconds,
        workflow: normalized.workflow,
        liveAuthority: LIVE_AUTHORITY,
        shadowAuthority: SHADOW_AUTHORITY,
        readOnly: true,
        appliedToLive: false,
        mappingComplete: true,
        componentOrder: COMPONENT_ORDER.slice(),
        componentVersions,
        commandDerivations: clone(derived.derivations),
        components: {
          ball: { record: clone(ballResult.record), events: clone(ballResult.record.candidateEvents || []) },
          cpu: decisions.map(entry => ({ teamId: entry.teamId, telemetry: clone(entry.decision.telemetry) })),
          movement: clone(movementResult.telemetry),
          formation: formationOutputs.map(entry => ({ teamId: entry.teamId, telemetry: clone(entry.output.telemetry) })),
          clock: clone(clockOutput.telemetry)
        },
        comparisons
      };
      const traceRecord = record('unified-shadow-tick', {
        tick: normalized.tick,
        appliedToLive: false,
        telemetry
      });
      const output = {
        schema: OUTPUT_SCHEMA,
        version: VERSION,
        enabled: true,
        tick: normalized.tick,
        fixedTickSeconds: normalized.fixedTickSeconds,
        workflow: normalized.workflow,
        authority: LIVE_AUTHORITY,
        shadowAuthority: SHADOW_AUTHORITY,
        readOnly: true,
        appliedToLive: false,
        legacySnapshot: clone(normalized.source),
        candidate: {
          ball: clone(ballResult.candidateState),
          movement: clone(nextMovementState),
          cpu: decisions.map(entry => ({ teamId: entry.teamId, decision: clone(entry.decision) })),
          formation: clone(formationOutputs),
          clock: clone(clockOutput)
        },
        telemetry,
        record: traceRecord
      };
      bridge = stagedBridge;
      movementState = nextMovementState;
      clockState = nextClockState;
      cpuMemories = stagedCpuMemories;
      mappingSignature = stagedMappingSignature;
      expectedTick = normalized.tick + 1;
      lastLegacyMovementAfter = clone(normalized.movement.after);
      lastLegacyBallAfter = clone(normalized.ball.after);
      lastLegacyClock = clone(normalized.clock);
      return output;
    }

    function exportTrace() {
      return {
        schema: TRACE_SCHEMA + '-export',
        version: VERSION,
        sessionId,
        status: clone(status),
        fixedTickSeconds,
        recordCount: records.length,
        records: clone(records),
        ballTrace: bridge ? bridge.exportTrace() : null
      };
    }

    function reset() {
      expectedTick = null;
      mappingSignature = null;
      bridge = null;
      movementState = null;
      clockState = null;
      cpuMemories = {};
      lastLegacyMovementAfter = null;
      lastLegacyBallAfter = null;
      lastLegacyClock = null;
      sequence = 0;
      records.length = 0;
    }

    return Object.freeze({
      status,
      sessionId,
      fixedTickSeconds,
      observe,
      observeTimeline(snapshots) {
        if (!Array.isArray(snapshots)) throw new TypeError('snapshots must be an array');
        return snapshots.map(observe);
      },
      exportTrace,
      stableTraceJson() { return stableJson(exportTrace()); },
      reset,
      getShadowState() {
        return {
          movement: movementState ? clone(movementState) : null,
          clock: clockState ? clone(clockState) : null,
          cpuMemories: clone(cpuMemories),
          ball: bridge ? bridge.getCandidateState() : null
        };
      }
    });
  }

  return Object.freeze({
    VERSION,
    CAPABILITY_SCHEMA,
    LEGACY_SNAPSHOT_SCHEMA,
    MAPPING_SCHEMA,
    OUTPUT_SCHEMA,
    TELEMETRY_SCHEMA,
    TRACE_SCHEMA,
    ACKNOWLEDGEMENT,
    LIVE_AUTHORITY,
    SHADOW_AUTHORITY,
    COMPONENT_ORDER,
    WORKFLOWS,
    OFFLINE_WORKFLOWS,
    REQUIRED_COMPONENTS,
    createCapability,
    resolveStatus,
    validateLegacySnapshot,
    assertLegacySnapshot,
    createAdapter,
    stableJson
  });
});
