'use strict';

/*
 * Football Legacy Aerial / Volley Contact V2
 *
 * A deterministic, SI-unit candidate resolver for shadow evaluation. It is
 * deliberately dormant, is not loaded by match.html, and emits commands for
 * later adapters rather than mutating live gameplay state.
 */
(function exposeAerialContactV2(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyAerialContactV2 = api;
})(typeof window === 'object' ? window : null, function createAerialContactV2Api() {
  'use strict';

  const VERSION = '2.0.0-dormant';
  const REQUEST_SCHEMA = 'football-legacy-aerial-contact-v2-request';
  const RESULT_SCHEMA = 'football-legacy-aerial-contact-v2-result';
  const TELEMETRY_SCHEMA = 'football-legacy-aerial-contact-v2-telemetry';
  const EVENT_SCHEMA = 'football-legacy-aerial-contact-v2-event';
  const EXPORT_SCHEMA = 'football-legacy-aerial-contact-v2-export';
  const CAPABILITY_SCHEMA = 'football-legacy-aerial-contact-v2-capability';
  const BALL_LAUNCH_SCHEMA = 'football-legacy-ball-v2-launch-intent';
  const AUTHORITY = 'candidate-observer';
  const CAPABILITY_SCOPE = 'aerial-contact-v2-shadow-only';
  const CAPABILITY_GRANT = 'enable-aerial-contact-v2-shadow';
  const RUNTIME_MODE = 'aerial-contact-shadow';

  const TECHNIQUES = Object.freeze({
    AUTO: 'auto',
    AERIAL_SHOT: 'aerial-shot',
    HEADER: 'header',
    VOLLEY: 'volley',
    HALF_VOLLEY: 'half-volley',
    FIRST_TIME_SHOT: 'first-time-shot'
  });

  const INTENTS = Object.freeze({
    SHOOT: 'shoot',
    PASS: 'pass',
    CLEAR: 'clear'
  });

  const OUTCOMES = Object.freeze({
    CONTACT: 'contact',
    MISS: 'miss',
    BLOCK: 'block'
  });

  const CONTACT_GRADES = Object.freeze({
    CLEAN: 'clean',
    PRESSURED: 'pressured',
    GLANCING: 'glancing'
  });

  const TECHNIQUE_PROFILES = deepFreeze({
    header: {
      family: 'aerial', windupTicks: 4, perfectWindowTicks: 1, viableWindowTicks: 3,
      minimumHeightM: 1.05, nominalHeightM: 1.72, maximumHeightM: null,
      horizontalReachM: 0.92, minimumBallAccess: -0.78, minimumTargetAlignment: -1,
      baseSpeedMps: 8.2, maximumSpeedMps: 23, baseTopSpinRpm: 35,
      skillWeights: { heading: 0.44, jumping: 0.19, strength: 0.11, technique: 0.12, awareness: 0.14 }
    },
    volley: {
      family: 'aerial', windupTicks: 5, perfectWindowTicks: 1, viableWindowTicks: 3,
      minimumHeightM: 0.38, nominalHeightM: 0.92, maximumHeightM: 1.55,
      horizontalReachM: 0.88, minimumBallAccess: -0.30, minimumTargetAlignment: -0.24,
      baseSpeedMps: 14.8, maximumSpeedMps: 36, baseTopSpinRpm: 105,
      skillWeights: { volleys: 0.34, shooting: 0.25, technique: 0.23, balance: 0.10, agility: 0.08 }
    },
    'half-volley': {
      family: 'ground-transition', windupTicks: 4, perfectWindowTicks: 1, viableWindowTicks: 3,
      minimumHeightM: 0.12, nominalHeightM: 0.34, maximumHeightM: 0.76,
      horizontalReachM: 0.82, minimumBallAccess: -0.22, minimumTargetAlignment: -0.22,
      baseSpeedMps: 14.2, maximumSpeedMps: 35, baseTopSpinRpm: 155,
      skillWeights: { volleys: 0.29, shooting: 0.27, technique: 0.25, balance: 0.11, agility: 0.08 }
    },
    'first-time-shot': {
      family: 'ground', windupTicks: 3, perfectWindowTicks: 1, viableWindowTicks: 3,
      minimumHeightM: 0.05, nominalHeightM: 0.24, maximumHeightM: 0.58,
      horizontalReachM: 0.78, minimumBallAccess: -0.18, minimumTargetAlignment: -0.18,
      baseSpeedMps: 15.2, maximumSpeedMps: 36, baseTopSpinRpm: 80,
      skillWeights: { shooting: 0.34, technique: 0.28, volleys: 0.15, balance: 0.12, agility: 0.11 }
    }
  });

  const DEFAULT_CONFIG = deepFreeze({
    automaticHeaderHeightM: 1.05,
    automaticVolleyHeightM: 0.45,
    automaticHalfVolleyMaximumHeightM: 0.34,
    automaticHalfVolleyMinimumVerticalSpeedMps: 0.65,
    maximumOutputSpeedMps: 38,
    maximumSpinRpm: 1800,
    incomingSpeedDifficultyStartMps: 12,
    incomingSpeedDifficultyRangeMps: 60,
    blockThresholdMargin: 1.5,
    minimumLaunchHorizontalComponent: 1e-6
  });

  const ATTRIBUTE_NAMES = Object.freeze([
    'heading', 'jumping', 'strength', 'technique', 'shooting', 'volleys',
    'balance', 'agility', 'awareness', 'defend'
  ]);

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

  function integer(value, fallback, label) {
    const result = Number.isInteger(value) ? Number(value) : fallback;
    if (!Number.isInteger(result)) throw new TypeError((label || 'value') + ' must be an integer');
    return result;
  }

  function range(value, fallback, minimum, maximum, label) {
    const result = finite(value, fallback, label);
    if (result < minimum || result > maximum) {
      throw new RangeError((label || 'value') + ' must be between ' + minimum + ' and ' + maximum);
    }
    return result;
  }

  function identifier(value, fallback, label) {
    if (value == null && fallback == null) {
      throw new TypeError((label || 'identifier') + ' is required');
    }
    const result = String(value == null ? fallback : value);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(result)) {
      throw new TypeError((label || 'identifier') + ' must be a stable identifier');
    }
    return result;
  }

  function enumeration(value, allowed, fallback, label) {
    const result = value == null ? fallback : String(value);
    if (!allowed.includes(result)) {
      throw new RangeError((label || 'value') + ' must be one of: ' + allowed.join(', '));
    }
    return result;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function compareIdentifiers(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function vector(value, fallback, label) {
    const source = value && typeof value === 'object' ? value : {};
    const base = fallback || { x: 0, y: 0, z: 0 };
    const prefix = label || 'vector';
    return {
      x: finite(source.x, base.x, prefix + '.x'),
      y: finite(source.y, base.y, prefix + '.y'),
      z: finite(source.z, base.z, prefix + '.z')
    };
  }

  function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
  function subtract(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function scale(a, scalar) { return { x: a.x * scalar, y: a.y * scalar, z: a.z * scalar }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function magnitude(a) { return Math.hypot(a.x, a.y, a.z); }
  function horizontalMagnitude(a) { return Math.hypot(a.x, a.y); }
  function horizontal(a) { return { x: a.x, y: a.y, z: 0 }; }
  function normalise(a, fallback) {
    const length = magnitude(a);
    if (length <= 1e-12) return { ...(fallback || { x: 0, y: 0, z: 0 }) };
    return scale(a, 1 / length);
  }
  function crossZ(a, b) { return a.x * b.y - a.y * b.x; }
  function radiansToRpm(value) { return value * 60 / (Math.PI * 2); }
  function rotateHorizontal(direction, radians) {
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    return {
      x: direction.x * cosine - direction.y * sine,
      y: direction.x * sine + direction.y * cosine,
      z: 0
    };
  }
  function round(value, places) {
    const factor = 10 ** (places == null ? 9 : places);
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
  function roundedVector(value) {
    return { x: round(value.x), y: round(value.y), z: round(value.z) };
  }

  function normaliseAttributes(value, label) {
    const source = value && typeof value === 'object' ? value : {};
    const result = {};
    for (const name of ATTRIBUTE_NAMES) {
      result[name] = range(source[name], 70, 1, 99, (label || 'attributes') + '.' + name);
    }
    return result;
  }

  function normaliseParticipant(value, label, contactTick, opponent) {
    const source = value && typeof value === 'object' ? value : {};
    const prefix = label || 'participant';
    if (!source.position || typeof source.position !== 'object') {
      throw new TypeError(prefix + '.position is required');
    }
    const facingRaw = vector(source.facing, { x: 0, y: 0, z: 0 }, prefix + '.facing');
    const facingHorizontal = horizontal(facingRaw);
    if (horizontalMagnitude(facingHorizontal) <= 1e-9) {
      throw new RangeError(prefix + '.facing must have a horizontal component');
    }
    const inputTick = source.inputTick == null ? null : integer(source.inputTick, NaN, prefix + '.inputTick');
    if (inputTick != null && inputTick > contactTick) {
      throw new RangeError(prefix + '.inputTick cannot be after contactTick');
    }
    return {
      id: identifier(source.id, null, prefix + '.id'),
      teamId: identifier(source.teamId, opponent ? 'opponent' : 'actor', prefix + '.teamId'),
      position: vector(source.position, { x: 0, y: 0, z: 0 }, prefix + '.position'),
      velocity: vector(source.velocity, { x: 0, y: 0, z: 0 }, prefix + '.velocity'),
      facing: normalise(facingHorizontal, { x: 1, y: 0, z: 0 }),
      heightM: range(source.heightM, 1.8, 1.3, 2.2, prefix + '.heightM'),
      attributes: normaliseAttributes(source.attributes, prefix + '.attributes'),
      inputTick,
      purpose: opponent ? enumeration(source.purpose, ['challenge', 'block'], 'challenge', prefix + '.purpose') : null
    };
  }

  function normaliseBall(value) {
    const source = value && typeof value === 'object' ? value : {};
    if (!source.position || typeof source.position !== 'object') {
      throw new TypeError('ball.position is required');
    }
    return {
      id: identifier(source.id, 'ball', 'ball.id'),
      position: vector(source.position, { x: 0, y: 0, z: 0.11 }, 'ball.position'),
      velocity: vector(source.velocity, { x: 0, y: 0, z: 0 }, 'ball.velocity'),
      angularVelocity: vector(source.angularVelocity, { x: 0, y: 0, z: 0 }, 'ball.angularVelocity'),
      radiusM: range(source.radiusM, 0.11, 0.05, 0.2, 'ball.radiusM')
    };
  }

  function createRequest(input) {
    const source = copyJson(input || {}, 'request');
    if (!source.actor || typeof source.actor !== 'object') throw new TypeError('request.actor is required');
    if (!source.ball || typeof source.ball !== 'object') throw new TypeError('request.ball is required');
    if (!source.target || typeof source.target !== 'object') throw new TypeError('request.target is required');
    if (source.opponents != null && !Array.isArray(source.opponents)) {
      throw new TypeError('request.opponents must be an array');
    }
    const sessionId = identifier(source.sessionId, null, 'request.sessionId');
    const requestId = identifier(source.id, null, 'request.id');
    const simulationTick = integer(source.simulationTick, NaN, 'request.simulationTick');
    const contactTick = integer(source.contactTick, NaN, 'request.contactTick');
    const inputTick = integer(source.inputTick, NaN, 'request.inputTick');
    if (simulationTick < 0 || contactTick < 0 || inputTick < 0) {
      throw new RangeError('request ticks must be non-negative');
    }
    if (contactTick > simulationTick) throw new RangeError('contactTick cannot be after simulationTick');
    if (inputTick > contactTick) throw new RangeError('inputTick cannot be after contactTick');
    const actor = normaliseParticipant(source.actor, 'actor', contactTick, false);
    const ball = normaliseBall(source.ball);
    const target = vector(source.target, { x: 0, y: 0, z: 0 }, 'target');
    if (Math.hypot(target.x - ball.position.x, target.y - ball.position.y) <= DEFAULT_CONFIG.minimumLaunchHorizontalComponent) {
      throw new RangeError('target must have a horizontal component from the ball');
    }
    const requestedTechnique = enumeration(
      source.technique,
      Object.values(TECHNIQUES),
      TECHNIQUES.AUTO,
      'request.technique'
    );
    const intent = enumeration(source.intent, Object.values(INTENTS), INTENTS.SHOOT, 'request.intent');
    if (requestedTechnique === TECHNIQUES.AERIAL_SHOT && intent !== INTENTS.SHOOT) {
      throw new RangeError('aerial-shot technique requires shoot intent');
    }
    const opponents = Array.isArray(source.opponents) ? source.opponents.map((entry, index) => (
      normaliseParticipant(entry, 'opponents[' + index + ']', contactTick, true)
    )) : [];
    const seen = new Set([actor.id]);
    for (const opponent of opponents) {
      if (seen.has(opponent.id)) throw new RangeError('participant IDs must be unique');
      seen.add(opponent.id);
      if (opponent.teamId === actor.teamId) throw new RangeError('opponents must be on a different team from actor');
    }
    opponents.sort((a, b) => compareIdentifiers(a.id, b.id));
    return deepFreeze({
      schema: REQUEST_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      shadowOnly: true,
      runtimeMode: RUNTIME_MODE,
      id: requestId,
      sessionId,
      simulationTick,
      contactTick,
      inputTick,
      requestedTechnique,
      intent,
      actor,
      ball,
      target,
      opponents,
      metadata: copyJson(source.metadata || {}, 'request.metadata')
    });
  }

  function capabilityToken(sessionId, capabilityId) {
    return CAPABILITY_SCOPE + ':' + sessionId + ':' + capabilityId;
  }

  function createShadowCapability(input) {
    const source = copyJson(input || {}, 'capability');
    if (source.grant !== CAPABILITY_GRANT) {
      throw new TypeError('capability.grant must explicitly enable Aerial Contact V2 shadow evaluation');
    }
    if (source.runtimeMode !== RUNTIME_MODE || source.authority !== AUTHORITY) {
      throw new TypeError('capability requires aerial-contact-shadow / candidate-observer scope');
    }
    const sessionId = identifier(source.sessionId, null, 'capability.sessionId');
    const capabilityId = identifier(source.capabilityId, null, 'capability.capabilityId');
    return deepFreeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      grant: CAPABILITY_GRANT,
      scope: CAPABILITY_SCOPE,
      runtimeMode: RUNTIME_MODE,
      authority: AUTHORITY,
      shadowOnly: true,
      sessionId,
      capabilityId,
      token: capabilityToken(sessionId, capabilityId)
    });
  }

  function assertCapability(capability, sessionId) {
    if (!capability || typeof capability !== 'object' || capability.schema !== CAPABILITY_SCHEMA) {
      throw new TypeError('an Aerial Contact V2 shadow capability is required');
    }
    if (capability.version !== VERSION || capability.grant !== CAPABILITY_GRANT ||
        capability.scope !== CAPABILITY_SCOPE || capability.runtimeMode !== RUNTIME_MODE ||
        capability.authority !== AUTHORITY || capability.shadowOnly !== true) {
      throw new TypeError('capability scope is invalid');
    }
    if (capability.sessionId !== sessionId ||
        capability.token !== capabilityToken(capability.sessionId, capability.capabilityId)) {
      throw new TypeError('capability does not match this request session');
    }
    return capability;
  }

  function relativeBallHeight(participant, ball) {
    return ball.position.z - participant.position.z;
  }

  function selectTechnique(request) {
    const heightM = relativeBallHeight(request.actor, request.ball);
    if (request.requestedTechnique === TECHNIQUES.AERIAL_SHOT) {
      if (heightM >= DEFAULT_CONFIG.automaticHeaderHeightM) return TECHNIQUES.HEADER;
      if (heightM >= TECHNIQUE_PROFILES.volley.minimumHeightM) return TECHNIQUES.VOLLEY;
      return null;
    }
    if (request.requestedTechnique !== TECHNIQUES.AUTO) return request.requestedTechnique;
    if (heightM >= DEFAULT_CONFIG.automaticHeaderHeightM) return TECHNIQUES.HEADER;
    if (heightM >= DEFAULT_CONFIG.automaticVolleyHeightM) return TECHNIQUES.VOLLEY;
    if (heightM <= DEFAULT_CONFIG.automaticHalfVolleyMaximumHeightM &&
        Math.abs(request.ball.velocity.z) >= DEFAULT_CONFIG.automaticHalfVolleyMinimumVerticalSpeedMps) {
      return TECHNIQUES.HALF_VOLLEY;
    }
    return TECHNIQUES.FIRST_TIME_SHOT;
  }

  function timingEvaluation(inputTick, contactTick, profile) {
    const strikeTick = inputTick + profile.windupTicks;
    const deltaTicks = strikeTick - contactTick;
    const absoluteDeltaTicks = Math.abs(deltaTicks);
    let score;
    if (absoluteDeltaTicks <= profile.perfectWindowTicks) score = 1;
    else if (absoluteDeltaTicks <= profile.viableWindowTicks) {
      const span = Math.max(1, profile.viableWindowTicks - profile.perfectWindowTicks);
      score = 1 - ((absoluteDeltaTicks - profile.perfectWindowTicks) / span) * 0.72;
    } else score = 0;
    return {
      inputTick,
      strikeTick,
      contactTick,
      deltaTicks,
      absoluteDeltaTicks,
      perfectWindowTicks: profile.perfectWindowTicks,
      viableWindowTicks: profile.viableWindowTicks,
      withinPerfectWindow: absoluteDeltaTicks <= profile.perfectWindowTicks,
      withinViableWindow: absoluteDeltaTicks <= profile.viableWindowTicks,
      score: round(score)
    };
  }

  function maximumHeaderHeight(participant) {
    const jump = (participant.attributes.jumping - 1) / 98;
    return participant.heightM + 0.18 + jump * 0.34;
  }

  function weightedSkill(attributes, weights) {
    let total = 0;
    let weightTotal = 0;
    for (const [name, weight] of Object.entries(weights)) {
      total += (attributes[name] / 99) * weight;
      weightTotal += weight;
    }
    return weightTotal > 0 ? total / weightTotal : 0;
  }

  function evaluateActor(request, technique) {
    const actor = request.actor;
    const ball = request.ball;
    const profile = TECHNIQUE_PROFILES[technique];
    const heightM = relativeBallHeight(actor, ball);
    const maximumHeightM = technique === TECHNIQUES.HEADER ? maximumHeaderHeight(actor) : profile.maximumHeightM;
    const ballOffset = subtract(ball.position, actor.position);
    const horizontalOffset = horizontal(ballOffset);
    const horizontalDistanceM = horizontalMagnitude(horizontalOffset);
    const toBall = normalise(horizontalOffset, actor.facing);
    const toTarget = normalise(horizontal(subtract(request.target, ball.position)), actor.facing);
    const incomingHorizontal = horizontal(ball.velocity);
    const incomingDirection = normalise(incomingHorizontal, scale(toBall, -1));
    const ballAccess = dot(actor.facing, toBall);
    const targetAlignment = dot(actor.facing, toTarget);
    const incomingApproach = dot(incomingDirection, scale(toBall, -1));
    const contactSide = clamp(crossZ(actor.facing, toBall), -1, 1);
    const timing = timingEvaluation(request.inputTick, request.contactTick, profile);
    const nominalHeight = technique === TECHNIQUES.HEADER ?
      clamp(profile.nominalHeightM, profile.minimumHeightM, maximumHeightM) : profile.nominalHeightM;
    const halfHeightRange = Math.max(0.1, (maximumHeightM - profile.minimumHeightM) * 0.5);
    const heightScore = clamp(1 - Math.abs(heightM - nominalHeight) / halfHeightRange, 0, 1);
    const reachScore = clamp(1 - horizontalDistanceM / profile.horizontalReachM, 0, 1);
    const accessScore = clamp(ballAccess * 0.5 + 0.5, 0, 1);
    const targetScore = clamp(targetAlignment * 0.5 + 0.5, 0, 1);
    const approachScore = clamp(incomingApproach * 0.5 + 0.5, 0, 1);
    const orientationScore = clamp(accessScore * 0.47 + targetScore * 0.38 + approachScore * 0.15, 0, 1);
    const skillScore = weightedSkill(actor.attributes, profile.skillWeights);
    const incomingSpeedMps = magnitude(ball.velocity);
    const incomingDifficultyScore = clamp(
      1 - Math.max(0, incomingSpeedMps - DEFAULT_CONFIG.incomingSpeedDifficultyStartMps) /
        DEFAULT_CONFIG.incomingSpeedDifficultyRangeMps,
      0.25,
      1
    );
    const reasonCodes = [];
    if (!timing.withinViableWindow) reasonCodes.push('timing-window-missed');
    if (heightM < profile.minimumHeightM) reasonCodes.push('ball-below-technique-window');
    if (heightM > maximumHeightM) reasonCodes.push('ball-above-reach-window');
    if (horizontalDistanceM > profile.horizontalReachM) reasonCodes.push('ball-outside-horizontal-reach');
    if (ballAccess < profile.minimumBallAccess) reasonCodes.push('ball-outside-body-envelope');
    if (targetAlignment < profile.minimumTargetAlignment) reasonCodes.push('unsupported-body-orientation');
    const quality = clamp(
      timing.score * 0.30 +
      ((heightScore + reachScore) * 0.5) * 0.20 +
      orientationScore * 0.20 +
      skillScore * 0.20 +
      incomingDifficultyScore * 0.10,
      0,
      1
    );
    return {
      profile,
      timing,
      reach: {
        relativeBallHeightM: round(heightM),
        minimumHeightM: profile.minimumHeightM,
        maximumHeightM: round(maximumHeightM),
        nominalHeightM: round(nominalHeight),
        horizontalDistanceM: round(horizontalDistanceM),
        horizontalReachM: profile.horizontalReachM,
        heightScore: round(heightScore),
        horizontalScore: round(reachScore)
      },
      orientation: {
        facing: roundedVector(actor.facing),
        toBall: roundedVector(toBall),
        toTarget: roundedVector(toTarget),
        incomingDirection: roundedVector(incomingDirection),
        ballAccess: round(ballAccess),
        targetAlignment: round(targetAlignment),
        incomingApproach: round(incomingApproach),
        contactSide: round(contactSide),
        score: round(orientationScore)
      },
      components: {
        timing: timing.score,
        height: round(heightScore),
        reach: round(reachScore),
        orientation: round(orientationScore),
        skill: round(skillScore),
        incomingDifficulty: round(incomingDifficultyScore)
      },
      incomingSpeedMps: round(incomingSpeedMps),
      quality: round(quality),
      reasonCodes
    };
  }

  function evaluateOpponent(request, opponent) {
    const ballHeightM = relativeBallHeight(opponent, request.ball);
    const isHigh = ballHeightM >= TECHNIQUE_PROFILES.header.minimumHeightM;
    const profile = isHigh ? TECHNIQUE_PROFILES.header : TECHNIQUE_PROFILES['first-time-shot'];
    const inputTick = opponent.inputTick == null ? request.contactTick - profile.windupTicks : opponent.inputTick;
    const timing = timingEvaluation(inputTick, request.contactTick, profile);
    const offset = horizontal(subtract(request.ball.position, opponent.position));
    const distanceM = horizontalMagnitude(offset);
    const toBall = normalise(offset, opponent.facing);
    const access = dot(opponent.facing, toBall);
    const maximumHeightM = isHigh ? maximumHeaderHeight(opponent) : 1.46;
    const minimumHeightM = isHigh ? profile.minimumHeightM : 0.03;
    const horizontalReachM = isHigh ? profile.horizontalReachM : 0.76;
    const eligible = timing.withinViableWindow && ballHeightM >= minimumHeightM &&
      ballHeightM <= maximumHeightM && distanceM <= horizontalReachM && access >= -0.82;
    const reachScore = clamp(1 - distanceM / horizontalReachM, 0, 1);
    const heightScore = clamp(1 - Math.max(0, ballHeightM - maximumHeightM) / 0.5, 0, 1);
    const accessScore = clamp(access * 0.5 + 0.5, 0, 1);
    const skillScore = isHigh ? weightedSkill(opponent.attributes, {
      heading: 0.26, jumping: 0.23, strength: 0.20, awareness: 0.19, defend: 0.12
    }) : weightedSkill(opponent.attributes, {
      defend: 0.34, awareness: 0.27, strength: 0.20, balance: 0.10, agility: 0.09
    });
    const score = eligible ? clamp(
      timing.score * 35 +
      ((reachScore + heightScore) * 0.5) * 20 +
      accessScore * 12 +
      skillScore * 23 +
      (opponent.attributes.strength / 99) * 10 +
      (opponent.purpose === 'block' ? 4 : 0),
      0,
      104
    ) : 0;
    const reasonCodes = [];
    if (!timing.withinViableWindow) reasonCodes.push('timing-window-missed');
    if (ballHeightM < minimumHeightM || ballHeightM > maximumHeightM) reasonCodes.push('height-window-missed');
    if (distanceM > horizontalReachM) reasonCodes.push('outside-horizontal-reach');
    if (access < -0.82) reasonCodes.push('outside-body-envelope');
    return {
      id: opponent.id,
      teamId: opponent.teamId,
      purpose: opponent.purpose,
      eligible,
      timing,
      relativeBallHeightM: round(ballHeightM),
      maximumHeightM: round(maximumHeightM),
      horizontalDistanceM: round(distanceM),
      horizontalReachM,
      ballAccess: round(access),
      components: {
        timing: timing.score,
        reach: round(reachScore),
        height: round(heightScore),
        access: round(accessScore),
        skill: round(skillScore),
        strength: round(opponent.attributes.strength / 99)
      },
      score: round(score),
      reasonCodes
    };
  }

  function contestEvaluation(request, actorEvaluation) {
    const candidates = request.opponents.map(opponent => evaluateOpponent(request, opponent));
    const eligible = candidates.filter(candidate => candidate.eligible).sort((a, b) => (
      b.score - a.score || compareIdentifiers(a.id, b.id)
    ));
    const actorScore = clamp(
      actorEvaluation.quality * 70 +
      (request.actor.attributes.strength / 99) * 10 +
      (request.actor.attributes.jumping / 99) * 10 +
      (request.actor.attributes.awareness / 99) * 10,
      0,
      100
    );
    const strongest = eligible[0] || null;
    const blocked = Boolean(strongest && strongest.score + DEFAULT_CONFIG.blockThresholdMargin >= actorScore);
    return {
      actorScore: round(actorScore),
      blockThresholdMargin: DEFAULT_CONFIG.blockThresholdMargin,
      candidates,
      eligibleCandidateIds: eligible.map(candidate => candidate.id),
      strongestOpponentId: strongest ? strongest.id : null,
      strongestOpponentScore: strongest ? strongest.score : null,
      blocked,
      winnerId: blocked ? strongest.id : request.actor.id
    };
  }

  function errorSign(evaluation) {
    const orientation = evaluation.orientation;
    if (Math.abs(orientation.contactSide) > 1e-6) return Math.sign(orientation.contactSide);
    if (Math.abs(orientation.targetAlignment - 1) > 1e-6) {
      return Math.sign(crossZ(orientation.facing, orientation.toTarget)) || 1;
    }
    if (evaluation.timing.deltaTicks !== 0) return Math.sign(evaluation.timing.deltaTicks);
    return 0;
  }

  function spinHandoff(ball, forward, profile, quality, evaluation, blocked) {
    const lateral = { x: -forward.y, y: forward.x, z: 0 };
    const incomingAxial = radiansToRpm(dot(ball.angularVelocity, forward));
    const incomingTop = radiansToRpm(dot(ball.angularVelocity, lateral));
    const incomingSide = radiansToRpm(ball.angularVelocity.z);
    const retention = blocked ? -0.28 : (0.18 + quality * 0.34);
    const timingNormal = clamp(
      evaluation.timing.deltaTicks / Math.max(1, evaluation.timing.viableWindowTicks),
      -1,
      1
    );
    const side = evaluation.orientation.contactSide;
    return {
      sideSpinRpm: round(clamp(
        incomingSide * retention + side * (1 - quality) * 360 + timingNormal * 85,
        -DEFAULT_CONFIG.maximumSpinRpm,
        DEFAULT_CONFIG.maximumSpinRpm
      ), 6),
      topSpinRpm: round(clamp(
        incomingTop * retention + profile.baseTopSpinRpm * (0.55 + quality * 0.45),
        -DEFAULT_CONFIG.maximumSpinRpm,
        DEFAULT_CONFIG.maximumSpinRpm
      ), 6),
      axialSpinRpm: round(clamp(
        incomingAxial * retention + side * 60,
        -DEFAULT_CONFIG.maximumSpinRpm,
        DEFAULT_CONFIG.maximumSpinRpm
      ), 6),
      incomingProjectionRpm: {
        side: round(incomingSide, 6),
        top: round(incomingTop, 6),
        axial: round(incomingAxial, 6)
      },
      retention: round(retention, 6)
    };
  }

  function contactLiftAngle(request, technique, evaluation) {
    const displacement = subtract(request.target, request.ball.position);
    const targetAngleDeg = Math.atan2(displacement.z, Math.max(0.01, horizontalMagnitude(displacement))) * 180 / Math.PI;
    let techniqueLift = technique === TECHNIQUES.HEADER ? 4 :
      technique === TECHNIQUES.VOLLEY ? 7 :
        technique === TECHNIQUES.HALF_VOLLEY ? 8 : 5;
    if (request.intent === INTENTS.PASS) techniqueLift += 3;
    if (request.intent === INTENTS.CLEAR) techniqueLift += 17;
    const timingPenalty = (1 - evaluation.timing.score) * 6;
    return round(clamp(targetAngleDeg + techniqueLift - timingPenalty, -14, 42), 6);
  }

  function contactSpeed(request, profile, evaluation) {
    const attributes = request.actor.attributes;
    const intentScale = request.intent === INTENTS.PASS ? 0.68 : request.intent === INTENTS.CLEAR ? 0.86 : 1;
    const strikeSkill = weightedSkill(attributes, profile.skillWeights);
    const incomingSpeed = magnitude(request.ball.velocity);
    const raw = (profile.baseSpeedMps + strikeSkill * 12 + Math.min(8, incomingSpeed * 0.22)) *
      (0.56 + evaluation.quality * 0.44) * intentScale;
    return round(clamp(raw, 1, Math.min(profile.maximumSpeedMps, DEFAULT_CONFIG.maximumOutputSpeedMps)), 6);
  }

  function buildContactLaunch(request, technique, evaluation, resultId, telemetryId, capability) {
    const profile = TECHNIQUE_PROFILES[technique];
    const baseDirection = normalise(horizontal(subtract(request.target, request.ball.position)), request.actor.facing);
    const maximumErrorRadians = technique === TECHNIQUES.HEADER ? 0.24 : 0.18;
    const lateralError = errorSign(evaluation) * (1 - evaluation.quality) * maximumErrorRadians;
    const forward = normalise(rotateHorizontal(baseDirection, lateralError), baseDirection);
    const spin = spinHandoff(request.ball, forward, profile, evaluation.quality, evaluation, false);
    return {
      schema: BALL_LAUNCH_SCHEMA,
      id: request.id + ':launch:' + request.contactTick,
      origin: { ...request.ball.position },
      target: null,
      direction: forward,
      speed: contactSpeed(request, profile, evaluation),
      liftAngleDeg: contactLiftAngle(request, technique, evaluation),
      sideSpinRpm: spin.sideSpinRpm,
      topSpinRpm: spin.topSpinRpm,
      axialSpinRpm: spin.axialSpinRpm,
      source: 'aerial-contact-v2-contact',
      metadata: {
        shadowOnly: true,
        authority: AUTHORITY,
        capabilityScope: CAPABILITY_SCOPE,
        capabilityId: capability.capabilityId,
        requestId: request.id,
        resultId,
        telemetryId,
        actorId: request.actor.id,
        ballId: request.ball.id,
        technique,
        intent: request.intent,
        contactTick: request.contactTick,
        quality: evaluation.quality,
        spinProjection: spin.incomingProjectionRpm,
        spinRetention: spin.retention
      }
    };
  }

  function buildBlockLaunch(request, blocker, evaluation, resultId, telemetryId, capability) {
    const incoming = request.ball.velocity;
    const normalRaw = horizontal(subtract(request.ball.position, blocker.position));
    const normal = normalise(normalRaw, scale(request.actor.facing, -1));
    const incidentHorizontal = horizontal(incoming);
    const reflected = subtract(incidentHorizontal, scale(normal, 1.55 * dot(incidentHorizontal, normal)));
    const forward = normalise(reflected, normal);
    const incomingSpeed = magnitude(incoming);
    const defenderSkill = (blocker.attributes.defend + blocker.attributes.strength + blocker.attributes.awareness) / (99 * 3);
    const speed = round(clamp(2.5 + Math.min(10, incomingSpeed * 0.30) + defenderSkill * 3, 3, 18), 6);
    const profile = TECHNIQUE_PROFILES[TECHNIQUES.FIRST_TIME_SHOT];
    const spin = spinHandoff(request.ball, forward, profile, evaluation.quality, evaluation, true);
    return {
      schema: BALL_LAUNCH_SCHEMA,
      id: request.id + ':block-launch:' + request.contactTick,
      origin: { ...request.ball.position },
      target: null,
      direction: forward,
      speed,
      liftAngleDeg: round(clamp(5 + Math.abs(incoming.z) * 1.2, 2, 30), 6),
      sideSpinRpm: spin.sideSpinRpm,
      topSpinRpm: spin.topSpinRpm,
      axialSpinRpm: spin.axialSpinRpm,
      source: 'aerial-contact-v2-block',
      metadata: {
        shadowOnly: true,
        authority: AUTHORITY,
        capabilityScope: CAPABILITY_SCOPE,
        capabilityId: capability.capabilityId,
        requestId: request.id,
        resultId,
        telemetryId,
        actorId: blocker.id,
        ballId: request.ball.id,
        technique: 'body-block',
        intent: 'deflect',
        contactTick: request.contactTick,
        spinProjection: spin.incomingProjectionRpm,
        spinRetention: spin.retention
      }
    };
  }

  function event(id, request, type, payload) {
    return {
      schema: EVENT_SCHEMA,
      id,
      type,
      simulationTick: request.simulationTick,
      contactTick: request.contactTick,
      requestId: request.id,
      payload
    };
  }

  function resolveContact(input, capability) {
    const request = input && input.schema === REQUEST_SCHEMA ? createRequest(input) : createRequest(input);
    assertCapability(capability, request.sessionId);
    const resultId = request.id + ':result:' + request.contactTick;
    const telemetryId = request.id + ':telemetry:' + request.contactTick;
    const chosenTechnique = selectTechnique(request);
    const unsupportedAerialShot = chosenTechnique == null;
    const technique = chosenTechnique || TECHNIQUES.VOLLEY;
    const evaluation = evaluateActor(request, technique);
    if (unsupportedAerialShot) evaluation.reasonCodes.unshift('aerial-shot-height-unsupported');
    const contest = contestEvaluation(request, evaluation);
    let outcome;
    let reason;
    let contactBy = null;
    let contactGrade = null;
    if (evaluation.reasonCodes.length > 0) {
      outcome = OUTCOMES.MISS;
      reason = evaluation.reasonCodes[0];
    } else if (contest.blocked) {
      outcome = OUTCOMES.BLOCK;
      reason = 'opponent-won-contact';
      contactBy = contest.strongestOpponentId;
      contactGrade = CONTACT_GRADES.PRESSURED;
    } else {
      outcome = OUTCOMES.CONTACT;
      reason = contest.eligibleCandidateIds.length ? 'actor-won-contested-contact' : 'actor-made-contact';
      contactBy = request.actor.id;
      contactGrade = evaluation.quality < 0.56 ? CONTACT_GRADES.GLANCING :
        contest.eligibleCandidateIds.length ? CONTACT_GRADES.PRESSURED : CONTACT_GRADES.CLEAN;
    }
    let launchIntent = null;
    if (outcome === OUTCOMES.CONTACT) {
      launchIntent = buildContactLaunch(request, technique, evaluation, resultId, telemetryId, capability);
    } else if (outcome === OUTCOMES.BLOCK) {
      const blocker = request.opponents.find(opponent => opponent.id === contactBy);
      launchIntent = buildBlockLaunch(request, blocker, evaluation, resultId, telemetryId, capability);
    }
    const telemetry = {
      schema: TELEMETRY_SCHEMA,
      id: telemetryId,
      version: VERSION,
      authority: AUTHORITY,
      shadowOnly: true,
      requestId: request.id,
      sessionId: request.sessionId,
      simulationTick: request.simulationTick,
      contactTick: request.contactTick,
      requestedTechnique: request.requestedTechnique,
      chosenTechnique: chosenTechnique,
      techniqueFamily: chosenTechnique ? TECHNIQUE_PROFILES[chosenTechnique].family : null,
      intent: request.intent,
      actorId: request.actor.id,
      ballId: request.ball.id,
      incomingBall: {
        position: roundedVector(request.ball.position),
        velocity: roundedVector(request.ball.velocity),
        angularVelocityRadPerSecond: roundedVector(request.ball.angularVelocity),
        speedMps: evaluation.incomingSpeedMps,
        radiusM: request.ball.radiusM
      },
      timing: evaluation.timing,
      reach: evaluation.reach,
      orientation: evaluation.orientation,
      quality: {
        score: evaluation.quality,
        components: evaluation.components,
        grade: contactGrade
      },
      contest,
      decision: {
        outcome,
        reason,
        reasonCodes: evaluation.reasonCodes.slice(),
        contactBy,
        launchProduced: launchIntent != null
      },
      handoff: launchIntent ? {
        consumerSchema: launchIntent.schema,
        launchId: launchIntent.id,
        speedMps: launchIntent.speed,
        liftAngleDeg: launchIntent.liftAngleDeg,
        sideSpinRpm: launchIntent.sideSpinRpm,
        topSpinRpm: launchIntent.topSpinRpm,
        axialSpinRpm: launchIntent.axialSpinRpm
      } : null,
      metadata: copyJson(request.metadata, 'telemetry.metadata')
    };
    const eventType = outcome === OUTCOMES.CONTACT ? 'contact-resolved' :
      outcome === OUTCOMES.BLOCK ? 'contact-blocked' : 'contact-missed';
    const events = [
      event(request.id + ':event:0001', request, 'attempt-evaluated', {
        requestedTechnique: request.requestedTechnique,
        chosenTechnique,
        intent: request.intent
      }),
      event(request.id + ':event:0002', request, eventType, {
        outcome,
        reason,
        contactBy,
        contactGrade,
        quality: evaluation.quality,
        launchId: launchIntent ? launchIntent.id : null
      })
    ];
    return deepFreeze({
      schema: RESULT_SCHEMA,
      id: resultId,
      version: VERSION,
      authority: AUTHORITY,
      capabilityScope: CAPABILITY_SCOPE,
      shadowOnly: true,
      requestId: request.id,
      sessionId: request.sessionId,
      simulationTick: request.simulationTick,
      contactTick: request.contactTick,
      requestedTechnique: request.requestedTechnique,
      technique: chosenTechnique,
      intent: request.intent,
      outcome,
      reason,
      contactBy,
      contactGrade,
      launchIntent,
      continuation: outcome === OUTCOMES.MISS ? {
        command: 'preserve-incoming-ball-state',
        ball: copyJson(request.ball, 'continuation.ball')
      } : null,
      telemetry,
      events
    });
  }

  function createExportPayload(resultInput) {
    const result = copyJson(resultInput, 'result');
    if (!result || result.schema !== RESULT_SCHEMA || result.version !== VERSION ||
        result.authority !== AUTHORITY || result.shadowOnly !== true) {
      throw new TypeError('result must be an Aerial Contact V2 shadow result');
    }
    return deepFreeze({
      schema: EXPORT_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      capabilityScope: CAPABILITY_SCOPE,
      shadowOnly: true,
      result
    });
  }

  function createCopyText(result, spacing) {
    const amount = spacing == null ? 2 : integer(spacing, NaN, 'spacing');
    if (amount < 0 || amount > 10) throw new RangeError('spacing must be between 0 and 10');
    return JSON.stringify(createExportPayload(result), null, amount);
  }

  function resultSignature(result) {
    return JSON.stringify(createExportPayload(result));
  }

  return deepFreeze({
    VERSION,
    REQUEST_SCHEMA,
    RESULT_SCHEMA,
    TELEMETRY_SCHEMA,
    EVENT_SCHEMA,
    EXPORT_SCHEMA,
    CAPABILITY_SCHEMA,
    BALL_LAUNCH_SCHEMA,
    AUTHORITY,
    CAPABILITY_SCOPE,
    CAPABILITY_GRANT,
    RUNTIME_MODE,
    TECHNIQUES,
    INTENTS,
    OUTCOMES,
    CONTACT_GRADES,
    TECHNIQUE_PROFILES,
    DEFAULT_CONFIG,
    createShadowCapability,
    createRequest,
    selectTechnique,
    resolveContact,
    createExportPayload,
    createCopyText,
    resultSignature
  });
});
