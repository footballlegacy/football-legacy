(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ball-engine-v2.js'));
  } else {
    root.FootballLegacyFirstTouchV2 = factory(root.FootballLegacyBallEngineV2);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (BallEngine) {
  'use strict';

  const VERSION = '2.0.0-dormant';
  const REQUEST_SCHEMA = 'football-legacy-first-touch-v2-request';
  const RESULT_SCHEMA = 'football-legacy-first-touch-v2-result';
  const TELEMETRY_SCHEMA = 'football-legacy-first-touch-v2-telemetry';
  const CAPABILITY_SCHEMA = 'football-legacy-first-touch-v2-capability';
  const ACKNOWLEDGEMENT = 'EXPLICIT_DORMANT_FIRST_TOUCH_V2_WITH_NO_LIVE_AUTHORITY';
  const BALL_VERSION = '2.0.0-shadow';
  const ALLOWED_WORKFLOWS = Object.freeze(['offline-v2-lab', 'set-piece-suite', 'shadow']);
  const INTENTS = Object.freeze(['trap', 'cushion', 'directional-touch', 'layoff']);
  const TECHNIQUES = Object.freeze([
    'sole-trap', 'foot-cushion', 'thigh-control', 'chest-control', 'header-cushion'
  ]);
  const OUTCOMES = Object.freeze(['controlled', 'retained', 'loose', 'missed']);
  const TIMING_BANDS = Object.freeze({ perfect: 0.045, good: 0.105, stretch: 0.18 });
  const SAFE_DATA_LIMITS = Object.freeze({
    maximumDepth: 10,
    maximumNodes: 1024,
    maximumArrayLength: 64,
    maximumObjectKeys: 64,
    maximumStringLength: 512
  });
  const RESERVED_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);

  const DEFAULT_CONFIG = Object.freeze({
    fixedTickSeconds: 1 / 60,
    maximumRelativeSpeed: 38,
    maximumOutputSpeed: 14,
    maximumPassiveSpeedGain: 0.35,
    maximumActiveSpeedGain: 4.8,
    maximumInducedSpin: 18,
    pressureRadius: 2.2,
    controlledThreshold: 0.68,
    retainedThreshold: 0.49,
    maximumTraceRecords: 64
  });

  const TECHNIQUE_PROFILES = Object.freeze({
    'sole-trap': Object.freeze({ zMin: 0, zMax: 0.28, reach: 0.82, absorption: 0.93, difficulty: 0.03 }),
    'foot-cushion': Object.freeze({ zMin: 0, zMax: 0.72, reach: 0.90, absorption: 0.78, difficulty: 0.10 }),
    'thigh-control': Object.freeze({ zMin: 0.55, zMax: 1.12, reach: 0.64, absorption: 0.72, difficulty: 0.20 }),
    'chest-control': Object.freeze({ zMin: 0.92, zMax: 1.62, reach: 0.52, absorption: 0.68, difficulty: 0.27 }),
    'header-cushion': Object.freeze({ zMin: 1.42, zMax: 2.18, reach: 0.50, absorption: 0.52, difficulty: 0.36 })
  });

  function assertDependency() {
    if (!BallEngine || BallEngine.VERSION !== BALL_VERSION ||
        BallEngine.STATE_SCHEMA !== 'football-legacy-ball-v2-state') {
      throw new Error('Ball Engine V2 must be loaded before First Touch V2');
    }
  }

  function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return Number(value);
  }

  function bounded(value, fallback, minimum, maximum, label) {
    const number = value == null ? fallback : finite(value, label);
    if (number < minimum || number > maximum) {
      throw new RangeError(label + ' must be within ' + minimum + '..' + maximum);
    }
    return number;
  }

  function integer(value, minimum, label) {
    const number = finite(value, label);
    if (!Number.isInteger(number) || number < minimum) {
      throw new RangeError(label + ' must be an integer >= ' + minimum);
    }
    return number;
  }

  function identifier(value, label) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(value)) {
      throw new TypeError(label + ' must be a safe stable id');
    }
    return value;
  }

  function plainObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(label + ' must be a plain object');
    }
    return value;
  }

  function vector2(value, fallback, label) {
    if (value == null && fallback == null) throw new TypeError(label + ' is required');
    const source = value == null ? fallback : plainObject(value, label);
    const result = { x: finite(source.x, label + '.x'), y: finite(source.y, label + '.y') };
    const length = Math.hypot(result.x, result.y);
    if (length < 1e-9) return { x: 0, y: 0 };
    return result;
  }

  function vector3(value, fallback, label) {
    if (value == null && fallback == null) throw new TypeError(label + ' is required');
    const source = value == null ? fallback : plainObject(value, label);
    return {
      x: finite(source.x, label + '.x'),
      y: finite(source.y, label + '.y'),
      z: finite(source.z, label + '.z')
    };
  }

  function normalise2(value, fallback) {
    const length = Math.hypot(value.x, value.y);
    if (!Number.isFinite(length)) throw new RangeError('direction magnitude is outside the safe envelope');
    if (length < 1e-9) return fallback ? { ...fallback } : { x: 1, y: 0 };
    return { x: value.x / length, y: value.y / length };
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function safeJsonClone(value, label, state, depth) {
    const path = label || 'value';
    const tracker = state || { active: new WeakSet(), nodes: 0 };
    const level = depth || 0;
    if (level > SAFE_DATA_LIMITS.maximumDepth) throw new RangeError(path + ' exceeds the safe depth limit');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return finite(value, path);
    if (typeof value === 'string') {
      if (value.length > SAFE_DATA_LIMITS.maximumStringLength) {
        throw new RangeError(path + ' exceeds the safe string limit');
      }
      return value;
    }
    if (!value || typeof value !== 'object') throw new TypeError(path + ' must contain JSON-safe data');
    tracker.nodes += 1;
    if (tracker.nodes > SAFE_DATA_LIMITS.maximumNodes) throw new RangeError(path + ' exceeds the safe node limit');
    if (tracker.active.has(value)) throw new TypeError(path + ' must not contain cycles');
    tracker.active.add(value);
    const isArray = Array.isArray(value);
    if (!isArray && Object.getPrototypeOf(value) !== Object.prototype) {
      tracker.active.delete(value);
      throw new TypeError(path + ' must contain plain objects only');
    }
    if (isArray && value.length > SAFE_DATA_LIMITS.maximumArrayLength) {
      tracker.active.delete(value);
      throw new RangeError(path + ' exceeds the safe array limit');
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length > (isArray ? value.length + 1 : SAFE_DATA_LIMITS.maximumObjectKeys)) {
      tracker.active.delete(value);
      throw new RangeError(path + ' exceeds the safe key limit');
    }
    const output = isArray ? [] : {};
    for (const key of keys) {
      if (typeof key !== 'string') {
        tracker.active.delete(value);
        throw new TypeError(path + ' must not contain symbol keys');
      }
      if (isArray && key === 'length') continue;
      if (RESERVED_KEYS.includes(key)) {
        tracker.active.delete(value);
        throw new TypeError(path + ' contains a reserved key');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        tracker.active.delete(value);
        throw new TypeError(path + '.' + key + ' must be a stable enumerable data property');
      }
      output[key] = safeJsonClone(descriptor.value, path + '.' + key, tracker, level + 1);
    }
    tracker.active.delete(value);
    return output;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).sort().forEach(key => { output[key] = stableValue(value[key]); });
    return output;
  }

  function stableJson(value) {
    return JSON.stringify(stableValue(safeJsonClone(value, 'stableJson')));
  }

  function assertComponentEnvelope(vector, maximum, label) {
    Object.keys(vector).forEach(key => {
      if (Math.abs(vector[key]) > maximum) throw new RangeError(label + '.' + key + ' exceeds the safe envelope');
    });
    return vector;
  }

  function assertMagnitudeEnvelope(vector, maximum, label) {
    const magnitude = Math.hypot(...Object.keys(vector).map(key => vector[key]));
    if (!Number.isFinite(magnitude) || magnitude > maximum) {
      throw new RangeError(label + ' magnitude exceeds the safe envelope');
    }
    return vector;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return value;
  }

  function keyedUnit(seed, text) {
    let hash = (integer(seed, 1, 'seed') ^ 2166136261) >>> 0;
    const input = String(text);
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 2246822507) >>> 0;
    hash ^= hash >>> 13;
    return (hash >>> 0) / 4294967295;
  }

  function createConfig(input) {
    const source = input == null ? {} : plainObject(safeJsonClone(input, 'config'), 'config');
    return deepFreeze({
      fixedTickSeconds: bounded(source.fixedTickSeconds, DEFAULT_CONFIG.fixedTickSeconds, 1 / 1000, 1 / 20, 'config.fixedTickSeconds'),
      maximumRelativeSpeed: bounded(source.maximumRelativeSpeed, DEFAULT_CONFIG.maximumRelativeSpeed, 1, 60, 'config.maximumRelativeSpeed'),
      maximumOutputSpeed: bounded(source.maximumOutputSpeed, DEFAULT_CONFIG.maximumOutputSpeed, 1, 30, 'config.maximumOutputSpeed'),
      maximumPassiveSpeedGain: bounded(source.maximumPassiveSpeedGain, DEFAULT_CONFIG.maximumPassiveSpeedGain, 0, 2, 'config.maximumPassiveSpeedGain'),
      maximumActiveSpeedGain: bounded(source.maximumActiveSpeedGain, DEFAULT_CONFIG.maximumActiveSpeedGain, 0, 10, 'config.maximumActiveSpeedGain'),
      maximumInducedSpin: bounded(source.maximumInducedSpin, DEFAULT_CONFIG.maximumInducedSpin, 0, 50, 'config.maximumInducedSpin'),
      pressureRadius: bounded(source.pressureRadius, DEFAULT_CONFIG.pressureRadius, 0.5, 5, 'config.pressureRadius'),
      controlledThreshold: bounded(source.controlledThreshold, DEFAULT_CONFIG.controlledThreshold, 0.4, 0.95, 'config.controlledThreshold'),
      retainedThreshold: bounded(source.retainedThreshold, DEFAULT_CONFIG.retainedThreshold, 0.2, 0.8, 'config.retainedThreshold'),
      maximumTraceRecords: integer(source.maximumTraceRecords == null ? DEFAULT_CONFIG.maximumTraceRecords : source.maximumTraceRecords, 1, 'config.maximumTraceRecords')
    });
  }

  function createCapability(input) {
    const source = input && typeof input === 'object' ? safeJsonClone(input, 'capability') : {};
    const workflow = typeof source.workflow === 'string' ? source.workflow : '';
    const accepted = source.enabled === true && source.online === false &&
      ALLOWED_WORKFLOWS.includes(workflow) && source.acknowledgement === ACKNOWLEDGEMENT;
    return deepFreeze({
      schema: CAPABILITY_SCHEMA,
      enabled: accepted,
      workflow: accepted ? workflow : null,
      readOnlyCandidate: true,
      liveAuthority: false,
      online: false,
      acknowledgement: accepted ? ACKNOWLEDGEMENT : null
    });
  }

  function assertCapability(capability, workflow) {
    if (!capability || capability.schema !== CAPABILITY_SCHEMA || capability.enabled !== true ||
        capability.readOnlyCandidate !== true || capability.liveAuthority !== false ||
        capability.online !== false || capability.acknowledgement !== ACKNOWLEDGEMENT ||
        capability.workflow !== workflow || !ALLOWED_WORKFLOWS.includes(workflow)) {
      throw new Error('First Touch V2 requires an explicit dormant offline capability');
    }
  }

  function timingBand(offsetSeconds) {
    const absolute = Math.abs(offsetSeconds);
    if (absolute <= TIMING_BANDS.perfect) return 'perfect';
    if (absolute <= TIMING_BANDS.good) return 'good';
    if (absolute <= TIMING_BANDS.stretch) return 'stretch';
    return 'missed';
  }

  function classifyTechnique(ballZ, playerHeight, intentType, explicitTechnique) {
    if (explicitTechnique != null) {
      if (!TECHNIQUES.includes(explicitTechnique)) throw new RangeError('technique is unsupported');
      return explicitTechnique;
    }
    if (intentType === 'trap' && ballZ <= TECHNIQUE_PROFILES['sole-trap'].zMax) return 'sole-trap';
    if (ballZ <= TECHNIQUE_PROFILES['foot-cushion'].zMax) return 'foot-cushion';
    if (ballZ <= TECHNIQUE_PROFILES['thigh-control'].zMax) return 'thigh-control';
    if (ballZ <= Math.min(playerHeight * 0.90, TECHNIQUE_PROFILES['chest-control'].zMax)) return 'chest-control';
    return 'header-cushion';
  }

  function normalizePlayer(input, config) {
    const source = plainObject(input, 'player');
    const attrs = plainObject(source.attributes, 'player.attributes');
    const attributes = {};
    ['control', 'technique', 'balance', 'agility', 'strength', 'awareness'].forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(attrs, key)) {
        throw new TypeError('player.attributes.' + key + ' is required');
      }
      attributes[key] = bounded(attrs[key], null, 0, 100, 'player.attributes.' + key);
    });
    const position = assertComponentEnvelope(vector2(source.position, null, 'player.position'), 100000, 'player.position');
    const velocity = assertMagnitudeEnvelope(vector2(source.velocity, null, 'player.velocity'),
      config.maximumOutputSpeed, 'player.velocity');
    const facing = normalise2(assertComponentEnvelope(vector2(source.facing, null, 'player.facing'),
      100000, 'player.facing'), { x: 1, y: 0 });
    return {
      id: identifier(source.id, 'player.id'),
      teamId: identifier(source.teamId, 'player.teamId'),
      position,
      velocity,
      facing,
      heightM: bounded(source.heightM, null, 1.45, 2.15, 'player.heightM'),
      attributes
    };
  }

  function normalizePressure(input, player) {
    if (input == null) return [];
    if (!Array.isArray(input) || input.length > 22) throw new TypeError('pressure must be an array of at most 22 opponents');
    const seen = new Set();
    return input.map((entry, index) => {
      const source = plainObject(entry, 'pressure[' + index + ']');
      const id = identifier(source.id, 'pressure[' + index + '].id');
      if (seen.has(id) || id === player.id) throw new Error('pressure ids must be unique opponents');
      seen.add(id);
      const teamId = identifier(source.teamId, 'pressure[' + index + '].teamId');
      if (teamId === player.teamId) throw new Error('pressure entries must belong to the opposing team');
      return {
        id,
        teamId,
        position: assertComponentEnvelope(vector2(source.position, null, 'pressure[' + index + '].position'),
          100000, 'pressure[' + index + '].position'),
        velocity: assertMagnitudeEnvelope(vector2(source.velocity, null, 'pressure[' + index + '].velocity'),
          30, 'pressure[' + index + '].velocity'),
        strength: bounded(source.strength, null, 0, 100, 'pressure[' + index + '].strength')
      };
    }).sort((a, b) => a.id.localeCompare(b.id));
  }

  function normalizeIntent(input, player) {
    const source = plainObject(input, 'intent');
    const type = source.type;
    if (!INTENTS.includes(type)) throw new RangeError('intent.type is unsupported');
    const fallback = player.facing;
    const direction = normalise2(vector2(source.direction, fallback, 'intent.direction'), fallback);
    const touchDistanceM = bounded(source.touchDistanceM,
      type === 'directional-touch' ? 2.1 : type === 'layoff' ? 1.2 : 0.35,
      0, 8, 'intent.touchDistanceM');
    const active = ['directional-touch', 'layoff'].includes(type);
    if (source.active != null && (typeof source.active !== 'boolean' || source.active !== active)) {
      throw new TypeError('intent.active must match the declared intent energy contract');
    }
    return {
      type,
      direction,
      touchDistanceM,
      active
    };
  }

  function normalizeRequest(input, config) {
    const source = plainObject(safeJsonClone(input, 'request'), 'request');
    if (source.schema !== REQUEST_SCHEMA) throw new Error('request schema mismatch');
    const workflow = source.workflow;
    if (!ALLOWED_WORKFLOWS.includes(workflow)) throw new RangeError('request workflow is unsupported');
    if (source.online !== false) throw new Error('online First Touch V2 is frozen');
    const tick = integer(source.tick, 1, 'request.tick');
    const fixedTickSeconds = bounded(source.fixedTickSeconds, config.fixedTickSeconds,
      config.fixedTickSeconds, config.fixedTickSeconds, 'request.fixedTickSeconds');
    if (!BallEngine.isBallState(source.ball)) throw new TypeError('request.ball must be a complete Ball Engine V2 state');
    const ballId = identifier(source.ball.id, 'request.ball.id');
    if (source.ball.radius < 0.01 || source.ball.radius > 1 ||
        source.ball.mass < 0.01 || source.ball.mass > 100 ||
        source.ball.inertia <= 0 || source.ball.inertia > 100) {
      throw new RangeError('request.ball physical values exceed the safe envelope');
    }
    assertComponentEnvelope(source.ball.position, 100000, 'request.ball.position');
    assertMagnitudeEnvelope(source.ball.velocity, 120, 'request.ball.velocity');
    assertMagnitudeEnvelope(source.ball.angularVelocity, 1000, 'request.ball.angularVelocity');
    assertComponentEnvelope(source.ball.orientation, 2, 'request.ball.orientation');
    if (!Number.isSafeInteger(source.ball.lastOuterTick) || source.ball.lastOuterTick > 1000000000 ||
        !Number.isSafeInteger(source.ball.contactCount) || source.ball.contactCount > 1000000000 ||
        source.ball.simulationTime < 0 || source.ball.simulationTime > 1000000000 ||
        source.ball.settleTime < 0 || source.ball.settleTime > 1000000) {
      throw new RangeError('request.ball counters exceed the safe envelope');
    }
    const player = normalizePlayer(source.player, config);
    const intent = normalizeIntent(source.intent, player);
    const pressure = normalizePressure(source.pressure, player);
    const timingOffsetSeconds = bounded(source.timingOffsetSeconds, 0, -0.5, 0.5, 'request.timingOffsetSeconds');
    const seed = integer(source.seed, 1, 'request.seed');
    return {
      schema: REQUEST_SCHEMA,
      workflow,
      online: false,
      tick,
      fixedTickSeconds,
      seed,
      ball: BallEngine.createBallState({
        ...BallEngine.cloneBallState(source.ball, BallEngine.createConfig()),
        id: ballId,
        metadata: safeJsonClone(source.ball.metadata, 'request.ball.metadata')
      }),
      player,
      intent,
      pressure,
      timingOffsetSeconds,
      technique: source.technique == null ? null : source.technique
    };
  }

  function pressureScore(player, opponents, radius) {
    let score = 0;
    let nearest = null;
    opponents.forEach(opponent => {
      const distance = Math.hypot(opponent.position.x - player.position.x,
        opponent.position.y - player.position.y);
      if (!nearest || distance < nearest.distance || (distance === nearest.distance && opponent.id < nearest.id)) {
        nearest = { id: opponent.id, distance };
      }
      const proximity = clamp(1 - distance / radius, 0, 1);
      score += proximity * (0.55 + opponent.strength / 220);
    });
    return { score: clamp(score, 0, 1.5), nearest };
  }

  function qualityScore(request, technique, timing, config) {
    const attrs = request.player.attributes;
    const ball = request.ball;
    const relativeVelocity = {
      x: ball.velocity.x - request.player.velocity.x,
      y: ball.velocity.y - request.player.velocity.y,
      z: ball.velocity.z
    };
    const relativeSpeed = Math.hypot(relativeVelocity.x, relativeVelocity.y, relativeVelocity.z);
    const incoming = normalise2({ x: -relativeVelocity.x, y: -relativeVelocity.y }, request.player.facing);
    const facingAlignment = clamp((request.player.facing.x * incoming.x + request.player.facing.y * incoming.y + 1) / 2, 0, 1);
    const targetAlignment = clamp((request.player.facing.x * request.intent.direction.x +
      request.player.facing.y * request.intent.direction.y + 1) / 2, 0, 1);
    const pressure = pressureScore(request.player, request.pressure, config.pressureRadius);
    const timingPenalty = timing === 'perfect' ? 0 : timing === 'good' ? 0.08 : timing === 'stretch' ? 0.22 : 1;
    const speedPenalty = clamp(relativeSpeed / config.maximumRelativeSpeed, 0, 1) * 0.31;
    const attributeQuality = (
      attrs.control * 0.32 + attrs.technique * 0.24 + attrs.balance * 0.13 +
      attrs.agility * 0.10 + attrs.awareness * 0.13 + attrs.strength * 0.08
    ) / 100;
    const score = attributeQuality * 0.77 + facingAlignment * 0.12 + targetAlignment * 0.11 -
      TECHNIQUE_PROFILES[technique].difficulty - timingPenalty - speedPenalty - pressure.score * 0.20;
    return { score: clamp(score, 0, 1), relativeVelocity, relativeSpeed, facingAlignment, targetAlignment, pressure };
  }

  function contactGeometry(request, technique) {
    const profile = TECHNIQUE_PROFILES[technique];
    const dx = request.ball.position.x - request.player.position.x;
    const dy = request.ball.position.y - request.player.position.y;
    const horizontalDistance = Math.hypot(dx, dy);
    const towardSpeed = horizontalDistance < 1e-9 ? 0 : Math.max(0,
      (request.player.velocity.x * dx + request.player.velocity.y * dy) / horizontalDistance);
    const dynamicReach = profile.reach + Math.min(0.18, towardSpeed * 0.018);
    const zMaximum = technique === 'header-cushion' ? Math.min(profile.zMax, request.player.heightM + 0.28) : profile.zMax;
    const verticalReach = request.ball.position.z >= profile.zMin - request.ball.radius &&
      request.ball.position.z <= zMaximum + request.ball.radius;
    return {
      horizontalDistance,
      horizontalReach: dynamicReach,
      towardContactSpeed: towardSpeed,
      verticalReach,
      reachable: horizontalDistance <= dynamicReach + request.ball.radius && verticalReach
    };
  }

  function rotate2(direction, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return { x: direction.x * cosine - direction.y * sine, y: direction.x * sine + direction.y * cosine };
  }

  function kineticEnergy(ball) {
    const linear = 0.5 * ball.mass * (
      ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2
    );
    const rotational = 0.5 * ball.inertia * (
      ball.angularVelocity.x ** 2 + ball.angularVelocity.y ** 2 + ball.angularVelocity.z ** 2
    );
    return linear + rotational;
  }

  function resolveOutputVelocity(request, technique, quality, config) {
    const profile = TECHNIQUE_PROFILES[technique];
    const incoming = request.ball.velocity;
    const incomingHorizontal = Math.hypot(incoming.x, incoming.y);
    const desiredByIntent = request.intent.type === 'trap' ? 0.18 :
      request.intent.type === 'cushion' ? clamp(request.intent.touchDistanceM / 0.8, 0.25, 1.8) :
      request.intent.type === 'layoff' ? clamp(request.intent.touchDistanceM / 0.55, 1.2, 4.8) :
      clamp(request.intent.touchDistanceM / 0.42, 1.5, 8.5);
    const deterministicSign = keyedUnit(request.seed,
      request.tick + '|' + request.ball.id + '|' + request.player.id + '|' + request.intent.type) * 2 - 1;
    const errorAngle = deterministicSign * (1 - quality.score) ** 1.35 * (Math.PI / 3.2);
    const direction = rotate2(request.intent.direction, errorAngle);
    const retained = incomingHorizontal * (1 - profile.absorption) * (0.55 + (1 - quality.score) * 0.55);
    let desiredSpeed = desiredByIntent * (0.62 + quality.score * 0.55) + retained;
    const gainLimit = request.intent.active ? config.maximumActiveSpeedGain : config.maximumPassiveSpeedGain;
    desiredSpeed = Math.min(desiredSpeed, incomingHorizontal + gainLimit, config.maximumOutputSpeed);
    const verticalRetention = technique === 'header-cushion' ? 0.28 :
      technique === 'chest-control' ? 0.18 : technique === 'thigh-control' ? 0.13 : 0.08;
    const intendedDrop = technique === 'header-cushion' ? -0.65 : technique === 'chest-control' ? -1.15 : -0.25;
    const vz = clamp(incoming.z * verticalRetention + intendedDrop * (0.45 + quality.score * 0.35), -4, 3);
    const maximumHorizontalSpeed = Math.sqrt(Math.max(0, config.maximumOutputSpeed ** 2 - vz ** 2));
    desiredSpeed = Math.min(desiredSpeed, maximumHorizontalSpeed);
    return {
      velocity: { x: direction.x * desiredSpeed, y: direction.y * desiredSpeed, z: vz },
      errorAngle,
      desiredSpeed,
      activeEnergy: request.intent.active
    };
  }

  function resolveSpin(request, output, config, quality) {
    const retainedFactor = 0.18 + quality.score * 0.42;
    const crossDirection = { x: -request.intent.direction.y, y: request.intent.direction.x };
    const induced = clamp(output.desiredSpeed * (1 - quality.score) * 1.6, 0, config.maximumInducedSpin);
    return {
      x: clamp(request.ball.angularVelocity.x * retainedFactor + crossDirection.x * induced,
        -config.maximumInducedSpin, config.maximumInducedSpin),
      y: clamp(request.ball.angularVelocity.y * retainedFactor + crossDirection.y * induced,
        -config.maximumInducedSpin, config.maximumInducedSpin),
      z: clamp(request.ball.angularVelocity.z * retainedFactor + output.errorAngle * 5,
        -config.maximumInducedSpin, config.maximumInducedSpin)
    };
  }

  function buildBallState(request, output, angularVelocity, outcome, technique) {
    const owned = outcome === 'controlled';
    const groundLike = request.ball.position.z <= request.ball.radius + 0.04 && output.velocity.z <= 0;
    const relativeVelocity = {
      x: request.ball.velocity.x - request.player.velocity.x,
      y: request.ball.velocity.y - request.player.velocity.y,
      z: request.ball.velocity.z
    };
    const relativeSpeed = Math.hypot(relativeVelocity.x, relativeVelocity.y, relativeVelocity.z);
    const contactNormal = relativeSpeed > 1e-9 ? {
      x: -relativeVelocity.x / relativeSpeed,
      y: -relativeVelocity.y / relativeSpeed,
      z: -relativeVelocity.z / relativeSpeed
    } : { x: 0, y: 0, z: 1 };
    const contactNormalSpeed = Math.abs(
      relativeVelocity.x * contactNormal.x +
      relativeVelocity.y * contactNormal.y +
      relativeVelocity.z * contactNormal.z
    );
    return BallEngine.createBallState({
      id: request.ball.id,
      position: { ...request.ball.position },
      velocity: owned ? { x: request.player.velocity.x, y: request.player.velocity.y, z: 0 } : output.velocity,
      orientation: { ...request.ball.orientation },
      angularVelocity: owned ? { x: 0, y: 0, z: 0 } : angularVelocity,
      radius: request.ball.radius,
      mass: request.ball.mass,
      inertia: request.ball.inertia,
      regime: owned ? BallEngine.REGIMES.CONTROLLED : groundLike ? BallEngine.REGIMES.SKID : BallEngine.REGIMES.FLIGHT,
      grounded: !owned && groundLike,
      settled: false,
      settleTime: 0,
      contactCount: request.ball.contactCount + 1,
      lastOuterTick: request.ball.lastOuterTick,
      simulationTime: request.ball.simulationTime,
      lastContact: {
        colliderId: request.player.id,
        materialId: 'first-touch:' + technique,
        normal: contactNormal,
        normalSpeed: contactNormalSpeed,
        outerTick: request.tick,
        substepCount: 0
      },
      metadata: {
        ...(request.ball.metadata || {}),
        firstTouch: { playerId: request.player.id, teamId: request.player.teamId, technique, outcome }
      }
    });
  }

  function resolve(requestInput, capability, configInput) {
    assertDependency();
    const config = createConfig(configInput);
    const request = normalizeRequest(requestInput, config);
    assertCapability(capability, request.workflow);
    const timing = timingBand(request.timingOffsetSeconds);
    const technique = classifyTechnique(request.ball.position.z, request.player.heightM,
      request.intent.type, request.technique);
    const geometry = contactGeometry(request, technique);
    const quality = qualityScore(request, technique, timing, config);
    const impossibleSpeed = quality.relativeSpeed > config.maximumRelativeSpeed;
    const missed = timing === 'missed' || !geometry.reachable || impossibleSpeed;
    let outcome = 'missed';
    if (!missed) {
      if (quality.score >= config.controlledThreshold && ['trap', 'cushion'].includes(request.intent.type)) outcome = 'controlled';
      else if (quality.score >= config.retainedThreshold) outcome = 'retained';
      else outcome = 'loose';
    }
    const output = missed ? {
      velocity: { ...request.ball.velocity }, errorAngle: 0,
      desiredSpeed: Math.hypot(request.ball.velocity.x, request.ball.velocity.y), activeEnergy: false
    } : resolveOutputVelocity(request, technique, quality, config);
    const angularVelocity = missed ? { ...request.ball.angularVelocity } : resolveSpin(request, output, config, quality);
    let ballState = missed ? BallEngine.cloneBallState(request.ball, BallEngine.createConfig()) :
      buildBallState(request, output, angularVelocity, outcome, technique);
    const beforeEnergy = kineticEnergy(request.ball);
    const activeEnergyContact = !missed && (output.activeEnergy || outcome === 'controlled');
    let afterEnergy = kineticEnergy(ballState);
    if (!activeEnergyContact && afterEnergy > beforeEnergy + 1e-9) {
      const scale = beforeEnergy <= 0 ? 0 : Math.sqrt(beforeEnergy / afterEnergy);
      ballState = BallEngine.createBallState({
        ...ballState,
        velocity: {
          x: ballState.velocity.x * scale,
          y: ballState.velocity.y * scale,
          z: ballState.velocity.z * scale
        },
        angularVelocity: {
          x: ballState.angularVelocity.x * scale,
          y: ballState.angularVelocity.y * scale,
          z: ballState.angularVelocity.z * scale
        }
      });
      afterEnergy = kineticEnergy(ballState);
    }
    const eventId = 'first-touch:' + request.tick + ':' + request.player.id + ':' + request.ball.id;
    const reason = timing === 'missed' ? 'timing-window-missed' :
      !geometry.reachable ? 'contact-geometry-unreachable' :
      impossibleSpeed ? 'relative-speed-outside-envelope' :
      outcome === 'controlled' ? 'clean-control' : outcome === 'retained' ? 'retained-touch' : 'heavy-touch';
    const telemetry = {
      schema: TELEMETRY_SCHEMA,
      eventId,
      tick: request.tick,
      workflow: request.workflow,
      playerId: request.player.id,
      teamId: request.player.teamId,
      ballId: request.ball.id,
      intent: request.intent.type,
      technique,
      timingBand: timing,
      timingOffsetSeconds: request.timingOffsetSeconds,
      outcome,
      reason,
      geometry,
      quality: {
        score: quality.score,
        relativeSpeed: quality.relativeSpeed,
        facingAlignment: quality.facingAlignment,
        targetAlignment: quality.targetAlignment,
        pressureScore: quality.pressure.score,
        nearestPressure: quality.pressure.nearest
      },
      directionErrorRadians: output.errorAngle,
      beforeEnergy,
      afterEnergy,
      activeEnergyContact,
      passiveEnergyGain: !activeEnergyContact ? Math.max(0, afterEnergy - beforeEnergy) : 0,
      ownerCandidateId: outcome === 'controlled' ? request.player.id : null,
      liveApplied: false
    };
    const result = {
      schema: RESULT_SCHEMA,
      version: VERSION,
      readOnlyCandidate: true,
      liveApplied: false,
      tick: request.tick,
      eventId,
      outcome,
      reason,
      technique,
      ownerCandidateId: outcome === 'controlled' ? request.player.id : null,
      ballState,
      telemetry
    };
    return deepFreeze(result);
  }

  function createGroundReceptionFixture(overrides) {
    assertDependency();
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const ball = BallEngine.createBallState({
      id: 'fixture-ball',
      position: { x: 0.52, y: 0, z: 0.11 },
      velocity: { x: -8, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 3, z: 0 },
      regime: BallEngine.REGIMES.ROLL,
      grounded: true,
      ...(source.ball || {})
    });
    return {
      schema: REQUEST_SCHEMA,
      workflow: source.workflow || 'offline-v2-lab',
      online: false,
      tick: source.tick || 1,
      fixedTickSeconds: 1 / 60,
      seed: source.seed || 173,
      ball,
      player: {
        id: 'receiver', teamId: 'home', position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 },
        facing: { x: 1, y: 0 }, heightM: 1.82,
        attributes: { control: 94, technique: 92, balance: 88, agility: 89, strength: 76, awareness: 91 },
        ...(source.player || {})
      },
      intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.4, ...(source.intent || {}) },
      pressure: source.pressure || [],
      timingOffsetSeconds: source.timingOffsetSeconds || 0,
      technique: source.technique == null ? null : source.technique
    };
  }

  return deepFreeze({
    VERSION,
    REQUEST_SCHEMA,
    RESULT_SCHEMA,
    TELEMETRY_SCHEMA,
    CAPABILITY_SCHEMA,
    ACKNOWLEDGEMENT,
    ALLOWED_WORKFLOWS,
    INTENTS,
    TECHNIQUES,
    OUTCOMES,
    TIMING_BANDS,
    DEFAULT_CONFIG,
    TECHNIQUE_PROFILES,
    createConfig,
    createCapability,
    timingBand,
    classifyTechnique,
    resolve,
    stableJson,
    createGroundReceptionFixture
  });
});
