'use strict';

/*
 * Football Legacy Ball Shadow Bridge V2
 *
 * This adapter is deliberately dormant. It can translate Build 173 ball
 * snapshots into Ball Engine V2, advance a side-effect-free shadow, and emit
 * comparisons. It never mutates a live ball. Candidate output is exposed only
 * for an explicitly capability-gated suite/offline workflow. Online and all
 * default callers remain Build 173 legacy authority.
 */
(function exposeBallShadowBridge(root, factory) {
  const dependency = typeof module === 'object' && module.exports
    ? require('./ball-engine-v2.js')
    : root && root.FootballLegacyBallEngineV2;
  const api = factory(dependency);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyBallShadowBridgeV2 = api;
})(typeof window === 'object' ? window : null, function createBallShadowBridgeApi(Ball) {
  'use strict';

  const VERSION = '2.0.0-dormant-shadow-bridge';
  const TRACE_SCHEMA = 'football-legacy-ball-shadow-trace-v2';
  const CAPABILITY_SCHEMA = 'football-legacy-overhaul-capability-v1';
  const ACKNOWLEDGEMENT = 'EXPLICIT_CANDIDATE_EVALUATION_NOT_BUILD_173';
  const MODES = Object.freeze({
    LEGACY: 'legacy',
    SHADOW: 'shadow',
    SUITE_CANDIDATE: 'suite-candidate',
    OFFLINE_CANDIDATE: 'offline-candidate'
  });
  const AUTHORITIES = Object.freeze({ LEGACY: 'build-173-legacy', CANDIDATE: 'ball-engine-v2-candidate' });
  const WORKFLOWS = Object.freeze({
    ONLINE: 'online',
    SET_PIECE_SUITE: 'set-piece-suite',
    SINGLE_PLAYER: 'single-player',
    QUICK_PLAY: 'quick-play',
    LOCAL_TWO_PLAYER: 'local-two-player',
    HOME_COOP: 'home-coop',
    CPU_V_CPU: 'cpu-v-cpu'
  });
  const OFFLINE_CANDIDATE_WORKFLOWS = Object.freeze([
    WORKFLOWS.SINGLE_PLAYER,
    WORKFLOWS.QUICK_PLAY,
    WORKFLOWS.LOCAL_TWO_PLAYER,
    WORKFLOWS.HOME_COOP,
    WORKFLOWS.CPU_V_CPU
  ]);
  const DEFAULT_UNITS = Object.freeze({
    xUnitsPerMetre: (3344 - 2 * 84) / 105,
    yUnitsPerMetre: (2142 - 12) / 68,
    zUnitsPerMetre: (2142 - 12) / 68,
    framesPerSecond: 60,
    ballRadiusMetres: 0.11
  });

  function assertEngine() {
    if (!Ball || Ball.VERSION !== '2.0.0-shadow') {
      throw new Error('Ball Engine V2 must be loaded before the shadow bridge');
    }
  }

  function finite(value, fallback, label) {
    const result = Number.isFinite(value) ? Number(value) : fallback;
    if (!Number.isFinite(result)) throw new TypeError((label || 'value') + ' must be finite');
    return result;
  }

  function positive(value, fallback, label) {
    const result = finite(value, fallback, label);
    if (!(result > 0)) throw new RangeError((label || 'value') + ' must be positive');
    return result;
  }

  function nonNegative(value, fallback, label) {
    const result = finite(value, fallback, label);
    if (result < 0) throw new RangeError((label || 'value') + ' must be non-negative');
    return result;
  }

  function integer(value, fallback, label) {
    const result = Number.isInteger(value) ? Number(value) : fallback;
    if (!Number.isInteger(result) || result < 0) throw new RangeError((label || 'value') + ' must be a non-negative integer');
    return result;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function cloneJson(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function createUnitSystem(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    return Object.freeze({
      xUnitsPerMetre: positive(source.xUnitsPerMetre, DEFAULT_UNITS.xUnitsPerMetre, 'xUnitsPerMetre'),
      yUnitsPerMetre: positive(source.yUnitsPerMetre, DEFAULT_UNITS.yUnitsPerMetre, 'yUnitsPerMetre'),
      zUnitsPerMetre: positive(source.zUnitsPerMetre, DEFAULT_UNITS.zUnitsPerMetre, 'zUnitsPerMetre'),
      framesPerSecond: positive(source.framesPerSecond, DEFAULT_UNITS.framesPerSecond, 'framesPerSecond'),
      ballRadiusMetres: positive(source.ballRadiusMetres, DEFAULT_UNITS.ballRadiusMetres, 'ballRadiusMetres')
    });
  }

  function createCapability(options) {
    assertEngine();
    const source = options && typeof options === 'object' ? options : {};
    const scope = source.scope === MODES.SUITE_CANDIDATE || source.scope === MODES.OFFLINE_CANDIDATE
      ? source.scope
      : null;
    if (!scope) throw new RangeError('capability scope must be a candidate mode');
    if (source.acknowledgement !== ACKNOWLEDGEMENT) {
      throw new Error('candidate capability requires the explicit acknowledgement');
    }
    const workflow = String(source.workflow || '');
    if (!workflow) throw new TypeError('capability workflow is required');
    return Object.freeze({
      schema: CAPABILITY_SCHEMA,
      scope,
      workflow,
      explicit: true,
      candidateVersion: Ball.VERSION,
      acknowledgement: ACKNOWLEDGEMENT
    });
  }

  function validCapability(capability, scope, workflow) {
    return Boolean(capability && capability.schema === CAPABILITY_SCHEMA && capability.explicit === true &&
      capability.scope === scope && capability.workflow === workflow &&
      capability.candidateVersion === Ball.VERSION && capability.acknowledgement === ACKNOWLEDGEMENT);
  }

  function normaliseMode(value) {
    return Object.values(MODES).includes(value) ? value : MODES.LEGACY;
  }

  function resolveAuthority(options) {
    assertEngine();
    const source = options && typeof options === 'object' ? options : {};
    const requestedMode = normaliseMode(source.mode);
    const workflow = String(source.workflow || WORKFLOWS.QUICK_PLAY);
    if (source.online === true || workflow === WORKFLOWS.ONLINE) {
      return Object.freeze({ requestedMode, mode: MODES.LEGACY, workflow, authority: AUTHORITIES.LEGACY, shadowEnabled: false, reason: 'online-frozen' });
    }
    if (requestedMode === MODES.SHADOW) {
      return Object.freeze({ requestedMode, mode: MODES.SHADOW, workflow, authority: AUTHORITIES.LEGACY, shadowEnabled: true, reason: 'shadow-observation-only' });
    }
    if (requestedMode === MODES.SUITE_CANDIDATE) {
      const allowed = workflow === WORKFLOWS.SET_PIECE_SUITE && validCapability(source.capability, requestedMode, workflow);
      return Object.freeze({ requestedMode, mode: allowed ? requestedMode : MODES.LEGACY, workflow, authority: allowed ? AUTHORITIES.CANDIDATE : AUTHORITIES.LEGACY, shadowEnabled: allowed, reason: allowed ? 'explicit-suite-candidate' : 'suite-capability-rejected' });
    }
    if (requestedMode === MODES.OFFLINE_CANDIDATE) {
      const allowed = OFFLINE_CANDIDATE_WORKFLOWS.includes(workflow) && validCapability(source.capability, requestedMode, workflow);
      return Object.freeze({ requestedMode, mode: allowed ? requestedMode : MODES.LEGACY, workflow, authority: allowed ? AUTHORITIES.CANDIDATE : AUTHORITIES.LEGACY, shadowEnabled: allowed, reason: allowed ? 'explicit-offline-candidate' : 'offline-capability-rejected' });
    }
    return Object.freeze({ requestedMode, mode: MODES.LEGACY, workflow, authority: AUTHORITIES.LEGACY, shadowEnabled: false, reason: 'legacy-default' });
  }

  function validateLegacyBall(ball, label) {
    const source = ball && typeof ball === 'object' ? ball : null;
    if (!source) throw new TypeError((label || 'legacy ball') + ' is required');
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'zv']) {
      if (!Number.isFinite(source[key])) throw new TypeError((label || 'legacy ball') + '.' + key + ' must be finite');
    }
    return source;
  }

  function axisScale(units, axis) {
    return axis === 'x' ? units.xUnitsPerMetre : axis === 'y' ? units.yUnitsPerMetre : units.zUnitsPerMetre;
  }

  function worldPositionToMetres(value, axis, units) {
    return finite(value, NaN, axis + ' world position') / axisScale(units, axis);
  }

  function metresToWorldPosition(value, axis, units) {
    return finite(value, NaN, axis + ' metre position') * axisScale(units, axis);
  }

  function worldVelocityToMetresPerSecond(value, axis, units) {
    return finite(value, NaN, axis + ' world velocity') * units.framesPerSecond / axisScale(units, axis);
  }

  function metresPerSecondToWorldVelocity(value, axis, units) {
    return finite(value, NaN, axis + ' SI velocity') * axisScale(units, axis) / units.framesPerSecond;
  }

  function inspectUnmappedLegacyFields(legacy, mapping) {
    const source = mapping && typeof mapping === 'object' ? mapping : {};
    const unmapped = [];
    if (Math.abs(finite(legacy.spin, 0, 'legacy.spin')) > 1e-12 && !Number.isFinite(source.spinRadiansPerSecondPerLegacyUnit)) unmapped.push('spin');
    if (Math.abs(finite(legacy.dip, 0, 'legacy.dip')) > 1e-12) unmapped.push('dip');
    if (Math.abs(finite(legacy.curveAccel, 0, 'legacy.curveAccel')) > 1e-12 && Math.abs(finite(legacy.spin, 0, 'legacy.spin')) > 1e-12) unmapped.push('curveAccel');
    return unmapped;
  }

  function legacyToCandidateState(legacyInput, options) {
    assertEngine();
    const legacy = validateLegacyBall(legacyInput);
    const source = options && typeof options === 'object' ? options : {};
    const units = createUnitSystem(source.units);
    const mapping = source.mapping && typeof source.mapping === 'object' ? source.mapping : {};
    const spinScale = Number.isFinite(mapping.spinRadiansPerSecondPerLegacyUnit)
      ? Number(mapping.spinRadiansPerSecondPerLegacyUnit)
      : 0;
    const zAboveGround = Math.max(0, worldPositionToMetres(legacy.z, 'z', units));
    const position = {
      x: worldPositionToMetres(legacy.x, 'x', units),
      y: worldPositionToMetres(legacy.y, 'y', units),
      z: units.ballRadiusMetres + zAboveGround
    };
    const velocity = {
      x: worldVelocityToMetresPerSecond(legacy.vx, 'x', units),
      y: worldVelocityToMetresPerSecond(legacy.vy, 'y', units),
      z: worldVelocityToMetresPerSecond(legacy.zv, 'z', units)
    };
    const grounded = legacy.z <= 0 && legacy.zv <= 0;
    const unmappedFields = inspectUnmappedLegacyFields(legacy, mapping);
    const state = Ball.createBallState({
      id: String(source.id || legacy.id || 'match-ball'),
      position,
      velocity,
      angularVelocity: { x: 0, y: 0, z: finite(legacy.spin, 0, 'legacy.spin') * spinScale },
      radius: units.ballRadiusMetres,
      grounded,
      settled: grounded && Math.hypot(legacy.vx, legacy.vy, legacy.zv) <= 1e-12,
      regime: grounded ? Ball.REGIMES.ROLL : Ball.REGIMES.FLIGHT,
      lastOuterTick: integer(source.outerTick, 0, 'outerTick'),
      simulationTime: nonNegative(source.elapsed, 0, 'elapsed'),
      metadata: {
        ...(cloneJson(source.metadata) || {}),
        source: 'build-173-legacy-snapshot',
        flightType: legacy.flightType || null,
        legacySpin: finite(legacy.spin, 0, 'legacy.spin'),
        legacyDip: finite(legacy.dip, 0, 'legacy.dip'),
        legacyCurveAccel: finite(legacy.curveAccel, 0, 'legacy.curveAccel'),
        unmappedFields: unmappedFields.slice(),
        completeMapping: unmappedFields.length === 0
      }
    }, source.config);
    return Object.freeze({ state, units, unmappedFields: Object.freeze(unmappedFields.slice()), completeMapping: unmappedFields.length === 0 });
  }

  function candidateToLegacyState(stateInput, options) {
    assertEngine();
    if (!Ball.isBallState(stateInput)) throw new TypeError('candidate state must be complete');
    const source = options && typeof options === 'object' ? options : {};
    const units = createUnitSystem(source.units);
    const template = source.template && typeof source.template === 'object' ? cloneJson(source.template) : {};
    const mapping = source.mapping && typeof source.mapping === 'object' ? source.mapping : {};
    const spinScale = Number.isFinite(mapping.spinRadiansPerSecondPerLegacyUnit) && Math.abs(mapping.spinRadiansPerSecondPerLegacyUnit) > 1e-12
      ? Number(mapping.spinRadiansPerSecondPerLegacyUnit)
      : null;
    const state = stateInput;
    return {
      ...template,
      x: metresToWorldPosition(state.position.x, 'x', units),
      y: metresToWorldPosition(state.position.y, 'y', units),
      z: Math.max(0, metresToWorldPosition(state.position.z - state.radius, 'z', units)),
      vx: metresPerSecondToWorldVelocity(state.velocity.x, 'x', units),
      vy: metresPerSecondToWorldVelocity(state.velocity.y, 'y', units),
      zv: metresPerSecondToWorldVelocity(state.velocity.z, 'z', units),
      spin: spinScale === null ? 0 : state.angularVelocity.z / spinScale,
      dip: 0,
      curveAccel: 0,
      flightAge: state.lastOuterTick,
      candidateRegime: state.regime,
      candidateSignature: Ball.stateSignature(state)
    };
  }

  function compareLegacyToCandidate(legacyAfterInput, candidateState, options) {
    const legacy = validateLegacyBall(legacyAfterInput, 'legacyAfter');
    const projection = candidateToLegacyState(candidateState, { ...(options || {}), template: legacy });
    const delta = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'zv']) delta[key] = projection[key] - legacy[key];
    return {
      legacy: cloneJson(legacy),
      candidateProjection: projection,
      delta,
      positionErrorWorld: Math.hypot(delta.x, delta.y, delta.z),
      velocityErrorWorldPerFrame: Math.hypot(delta.vx, delta.vy, delta.zv),
      candidateSignature: Ball.stateSignature(candidateState)
    };
  }

  function createBridge(options) {
    assertEngine();
    const source = options && typeof options === 'object' ? options : {};
    const authority = resolveAuthority(source);
    const units = createUnitSystem(source.units);
    const seed = authority.shadowEnabled
      ? integer(source.seed, NaN, 'seed')
      : (Number.isInteger(source.seed) && source.seed > 0 ? source.seed : 1);
    if (authority.shadowEnabled && seed === 0) throw new RangeError('seed must not be zero');
    const traceLimit = Math.max(1, Math.min(100000, integer(source.traceLimit, 2000, 'traceLimit')));
    const sessionId = String(source.sessionId || ('ball-shadow-' + seed));
    const mapping = source.mapping && typeof source.mapping === 'object' ? { ...source.mapping } : {};
    const config = source.config && typeof source.config === 'object' ? cloneJson(source.config) : undefined;
    let candidateState = null;
    let context = authority.shadowEnabled ? Ball.createSimulationContext({ seed }) : null;
    let registeredOuterTick = null;
    let mappingStatus = Object.freeze({ completeMapping: true, unmappedFields: Object.freeze([]) });
    let sequence = 0;
    const records = [];

    function record(type, payload) {
      const item = {
        schema: TRACE_SCHEMA,
        sessionId,
        sequence: sequence++,
        type,
        authority: authority.authority,
        mode: authority.mode,
        workflow: authority.workflow,
        ...(cloneJson(payload) || {})
      };
      records.push(item);
      if (records.length > traceLimit) records.shift();
      return cloneJson(item);
    }

    function registerLegacyState(legacy, metadata) {
      if (!authority.shadowEnabled) return record('registration-skipped', { reason: authority.reason });
      const meta = metadata && typeof metadata === 'object' ? metadata : {};
      const outerTick = integer(meta.outerTick, 0, 'outerTick');
      const mapped = legacyToCandidateState(legacy, { units, mapping, outerTick, elapsed: outerTick / units.framesPerSecond, config, metadata: meta.metadata });
      candidateState = mapped.state;
      mappingStatus = Object.freeze({
        completeMapping: mapped.completeMapping,
        unmappedFields: Object.freeze(mapped.unmappedFields.slice())
      });
      context = Ball.createSimulationContext({ seed, outerTick, elapsed: outerTick / units.framesPerSecond });
      registeredOuterTick = outerTick;
      return record('legacy-state-registered', {
        outerTick,
        completeMapping: mapped.completeMapping,
        unmappedFields: mapped.unmappedFields,
        candidateSignature: Ball.stateSignature(candidateState)
      });
    }

    function registerCandidateLaunch(intent, metadata) {
      if (!authority.shadowEnabled) return record('launch-skipped', { reason: authority.reason });
      const meta = metadata && typeof metadata === 'object' ? metadata : {};
      const outerTick = integer(meta.outerTick, 0, 'outerTick');
      const launch = Ball.resolveLaunch(intent, config);
      candidateState = Ball.createBallState({
        ...launch.state,
        lastOuterTick: outerTick,
        simulationTime: outerTick / units.framesPerSecond
      }, config);
      context = Ball.createSimulationContext({ seed, outerTick, elapsed: outerTick / units.framesPerSecond });
      const spinScale = Number.isFinite(mapping.spinRadiansPerSecondPerLegacyUnit) &&
        Math.abs(mapping.spinRadiansPerSecondPerLegacyUnit) > 1e-12;
      const angularMagnitude = Math.hypot(candidateState.angularVelocity.x,
        candidateState.angularVelocity.y, candidateState.angularVelocity.z);
      const unmappedFields = angularMagnitude > 1e-12 && !spinScale ? ['angularVelocity'] : [];
      mappingStatus = Object.freeze({
        completeMapping: unmappedFields.length === 0,
        unmappedFields: Object.freeze(unmappedFields)
      });
      registeredOuterTick = outerTick;
      return record('candidate-launch-registered', {
        outerTick,
        launch: launch.event,
        completeMapping: mappingStatus.completeMapping,
        unmappedFields: mappingStatus.unmappedFields,
        candidateSignature: Ball.stateSignature(candidateState)
      });
    }

    function observeStep(observation) {
      const item = observation && typeof observation === 'object' ? observation : {};
      if (!authority.shadowEnabled) {
        return { authority, appliedToLive: false, record: record('observation-skipped', { reason: authority.reason }) };
      }
      const legacyBefore = validateLegacyBall(item.legacyBefore, 'legacyBefore');
      const legacyAfter = validateLegacyBall(item.legacyAfter, 'legacyAfter');
      const outerTick = integer(item.outerTick, NaN, 'outerTick');
      if (!candidateState) registerLegacyState(legacyBefore, { outerTick: Math.max(0, outerTick - 1), metadata: { registration: 'implicit-first-observation' } });
      if (registeredOuterTick !== null && outerTick !== context.outerTick + 1) {
        throw new RangeError('shadow observations must be sequential outer ticks');
      }
      const result = Ball.step(candidateState, context, 1 / units.framesPerSecond, item.environment, item.config || config);
      candidateState = result.state;
      context = result.context;
      registeredOuterTick = outerTick;
      const comparison = compareLegacyToCandidate(legacyAfter, candidateState, { units, mapping });
      const unmappedFields = mappingStatus.unmappedFields.slice();
      const traceRecord = record('shadow-step', {
        outerTick,
        completeMapping: mappingStatus.completeMapping,
        unmappedFields,
        comparison,
        candidateOutcome: result.trace.outcome,
        candidateEvents: result.trace.events
      });
      return {
        authority,
        appliedToLive: false,
        candidateState: Ball.cloneBallState(candidateState, item.config || config),
        context: Ball.cloneContext(context),
        comparison,
        record: traceRecord
      };
    }

    function candidateAuthorityOutput(template) {
      if (authority.authority !== AUTHORITIES.CANDIDATE) {
        throw new Error('candidate output is unavailable while Build 173 is authoritative');
      }
      if (!candidateState) throw new Error('candidate state has not been registered');
      if (!mappingStatus.completeMapping) {
        throw new Error('candidate output is unavailable because the legacy mapping is incomplete; unmapped fields: ' +
          mappingStatus.unmappedFields.join(', '));
      }
      const output = candidateToLegacyState(candidateState, { units, mapping, template });
      record('candidate-output-projected', { outerTick: context.outerTick, candidateSignature: output.candidateSignature });
      return output;
    }

    function exportTrace() {
      return {
        schema: TRACE_SCHEMA + '-export',
        version: VERSION,
        engineVersion: Ball.VERSION,
        sessionId,
        authority: cloneJson(authority),
        units: cloneJson(units),
        recordCount: records.length,
        records: cloneJson(records)
      };
    }

    function reset() {
      candidateState = null;
      context = authority.shadowEnabled ? Ball.createSimulationContext({ seed }) : null;
      registeredOuterTick = null;
      mappingStatus = Object.freeze({ completeMapping: true, unmappedFields: Object.freeze([]) });
      records.length = 0;
      sequence = 0;
    }

    return Object.freeze({
      authority,
      units,
      sessionId,
      registerLegacyState,
      registerCandidateLaunch,
      observeStep,
      candidateAuthorityOutput,
      exportTrace,
      reset,
      getCandidateState: () => candidateState ? Ball.cloneBallState(candidateState, config) : null,
      getContext: () => context ? Ball.cloneContext(context) : null
    });
  }

  return Object.freeze({
    VERSION,
    TRACE_SCHEMA,
    CAPABILITY_SCHEMA,
    ACKNOWLEDGEMENT,
    MODES,
    AUTHORITIES,
    WORKFLOWS,
    DEFAULT_UNITS,
    OFFLINE_CANDIDATE_WORKFLOWS,
    createUnitSystem,
    createCapability,
    resolveAuthority,
    legacyToCandidateState,
    candidateToLegacyState,
    compareLegacyToCandidate,
    createBridge
  });
});
