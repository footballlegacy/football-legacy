'use strict';

/*
 * Dormant First-Touch Authority Adapter V2.
 *
 * This pure adapter joins one canonical Movement V2 snapshot and one current
 * Ball V2 snapshot to First Touch V2. It emits only a detached, exact-once,
 * advisory contact/possession handoff. It has no live apply surface.
 */
(function exposeFirstTouchAuthorityAdapterV2(root, factory) {
  const api = factory(
    typeof module === 'object' && module.exports ? require('./movement-engine-v2.js') : root && root.FootballLegacyMovementEngineV2,
    typeof module === 'object' && module.exports ? require('./ball-engine-v2.js') : root && root.FootballLegacyBallEngineV2,
    typeof module === 'object' && module.exports ? require('./first-touch-v2.js') : root && root.FootballLegacyFirstTouchV2
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyFirstTouchAuthorityAdapterV2 = api;
})(typeof window === 'object' ? window : null, function createFirstTouchAuthorityAdapterV2Api(Movement, Ball, FirstTouch) {
  'use strict';

  const VERSION = '2.0.0-dormant-authority-adapter';
  const REQUEST_SCHEMA = 'football-legacy-first-touch-authority-adapter-v2-request';
  const RESULT_SCHEMA = 'football-legacy-first-touch-authority-adapter-v2-result';
  const HANDOFF_SCHEMA = 'football-legacy-first-touch-authority-handoff-v2';
  const PROFILE_SCHEMA = 'football-legacy-first-touch-authority-profile-v2';
  const ROSTER_ELIGIBILITY_SCHEMA = 'football-legacy-first-touch-roster-eligibility-v2';
  const CONTACT_IDENTITY_SCHEMA = 'football-legacy-first-touch-contact-identity-v2';
  const CAPABILITY_SCHEMA = 'football-legacy-first-touch-authority-adapter-v2-capability';
  const ACKNOWLEDGEMENT = 'EXPLICIT_DORMANT_OFFLINE_FIRST_TOUCH_AUTHORITY_ADAPTER_V2';
  const AUTHORITY = 'dormant-offline-advisory-only';
  const COORDINATE_SYSTEM = 'si-metres-centred-pitch-positive-z-up';
  const WORKFLOWS = Object.freeze(['offline-v2-lab', 'set-piece-suite', 'shadow']);
  const ISSUED_CAPABILITIES = new WeakSet();
  const MAX_LEDGER_IDS = 256;
  const MAX_TICK = 1000000000;
  const MAX_SEED = 0xffffffff;
  const SAFE_LIMITS = Object.freeze({ depth: 12, nodes: 4096, array: 256, keys: 128, string: 1024 });
  const RESERVED_KEYS = Object.freeze(['__proto__', 'prototype', 'constructor']);
  const ROSTER_ELIGIBILITY_KEYS = Object.freeze([
    'available', 'contactEligible', 'playerId', 'schema', 'sentOff', 'teamId', 'tick'
  ]);

  function assertDependencies() {
    if (!Movement || Movement.VERSION !== '2.0.0-dormant' ||
        Movement.PLAYER_SCHEMA !== 'football-legacy-movement-player-v2' ||
        Movement.WORLD_SCHEMA !== 'football-legacy-movement-world-v2') {
      throw new Error('current Movement Engine V2 is required before the First-Touch Authority Adapter');
    }
    if (!Ball || Ball.VERSION !== '2.0.0-shadow' ||
        Ball.STATE_SCHEMA !== 'football-legacy-ball-v2-state') {
      throw new Error('current Ball Engine V2 is required before the First-Touch Authority Adapter');
    }
    if (!FirstTouch || FirstTouch.VERSION !== '2.0.0-dormant' ||
        FirstTouch.REQUEST_SCHEMA !== 'football-legacy-first-touch-v2-request') {
      throw new Error('current First Touch V2 is required before the First-Touch Authority Adapter');
    }
  }

  function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return Number(value);
  }

  function bounded(value, minimum, maximum, label) {
    const number = finite(value, label);
    if (number < minimum || number > maximum) throw new RangeError(label + ' must be within ' + minimum + '..' + maximum);
    return number;
  }

  function integer(value, minimum, maximum, label) {
    const number = finite(value, label);
    if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
      throw new RangeError(label + ' must be a safe integer within ' + minimum + '..' + maximum);
    }
    return number;
  }

  function stableId(value, label) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) {
      throw new TypeError(label + ' must be a stable identifier');
    }
    return value;
  }

  function plainObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
      throw new TypeError(label + ' must be a plain object');
    }
    return value;
  }

  function safeClone(value, label, state, depth) {
    const path = label || 'value';
    const tracker = state || { active: new WeakSet(), nodes: 0 };
    const level = depth || 0;
    if (level > SAFE_LIMITS.depth) throw new RangeError(path + ' exceeds the safe depth limit');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') return finite(value, path);
    if (typeof value === 'string') {
      if (value.length > SAFE_LIMITS.string) throw new RangeError(path + ' exceeds the safe string limit');
      return value;
    }
    if (!value || typeof value !== 'object') throw new TypeError(path + ' must contain JSON-safe data');
    tracker.nodes += 1;
    if (tracker.nodes > SAFE_LIMITS.nodes) throw new RangeError(path + ' exceeds the safe node limit');
    if (tracker.active.has(value)) throw new TypeError(path + ' must not contain cycles');
    tracker.active.add(value);
    const array = Array.isArray(value);
    if (!array && Object.getPrototypeOf(value) !== Object.prototype) {
      tracker.active.delete(value);
      throw new TypeError(path + ' must contain plain objects only');
    }
    if (array && value.length > SAFE_LIMITS.array) {
      tracker.active.delete(value);
      throw new RangeError(path + ' exceeds the safe array limit');
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length > (array ? value.length + 1 : SAFE_LIMITS.keys)) {
      tracker.active.delete(value);
      throw new RangeError(path + ' exceeds the safe key limit');
    }
    const output = array ? [] : {};
    for (const key of keys) {
      if (typeof key !== 'string') {
        tracker.active.delete(value);
        throw new TypeError(path + ' must not contain symbol keys');
      }
      if (array && key === 'length') continue;
      if (RESERVED_KEYS.includes(key)) {
        tracker.active.delete(value);
        throw new TypeError(path + ' contains a reserved key');
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        tracker.active.delete(value);
        throw new TypeError(path + '.' + key + ' must be a stable enumerable data property');
      }
      output[key] = safeClone(descriptor.value, path + '.' + key, tracker, level + 1);
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
    return JSON.stringify(stableValue(safeClone(value, 'stableJson')));
  }

  function missedBallStateEquivalent(actual, expected) {
    if (!Ball.isBallState(actual) || !Ball.isBallState(expected)) return false;
    const actualCopy = safeClone(actual, 'missed result ball state');
    const expectedCopy = safeClone(expected, 'missed request ball state');
    const actualOrientation = actualCopy.orientation;
    const expectedOrientation = expectedCopy.orientation;
    delete actualCopy.orientation;
    delete expectedCopy.orientation;
    if (stableJson(actualCopy) !== stableJson(expectedCopy)) return false;
    const keys = ['x', 'y', 'z', 'w'];
    const directError = Math.max(...keys.map(key => Math.abs(actualOrientation[key] - expectedOrientation[key])));
    const equivalentSignError = Math.max(...keys.map(key => Math.abs(actualOrientation[key] + expectedOrientation[key])));
    return Math.min(directError, equivalentSignError) <= 1e-12;
  }

  function digest(value) {
    const text = stableJson(value);
    let first = 2166136261;
    let second = 3339675911;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      first ^= code;
      first = Math.imul(first, 16777619) >>> 0;
      second ^= code + (index & 255);
      second = Math.imul(second, 2246822519) >>> 0;
    }
    return first.toString(16).padStart(8, '0') + second.toString(16).padStart(8, '0');
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function compareIds(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
  }

  function magnitude2(value) {
    return Math.hypot(value.x, value.y);
  }

  function validateVector2(value, maximum, label) {
    const source = plainObject(value, label);
    const result = { x: finite(source.x, label + '.x'), y: finite(source.y, label + '.y') };
    if (!Number.isFinite(Math.hypot(result.x, result.y)) || Math.hypot(result.x, result.y) > maximum) {
      throw new RangeError(label + ' magnitude exceeds the SI safety envelope');
    }
    return result;
  }

  function createCapability(options) {
    assertDependencies();
    const source = plainObject(safeClone(options, 'capability'), 'capability');
    const workflow = source.workflow;
    if (source.enabled !== true || source.online !== false || source.liveAuthority !== false ||
        source.acknowledgement !== ACKNOWLEDGEMENT || !WORKFLOWS.includes(workflow)) {
      throw new TypeError('exact dormant offline First-Touch Authority Adapter capability is required');
    }
    const capability = deepFreeze({
      schema: CAPABILITY_SCHEMA,
      version: VERSION,
      workflow,
      authority: AUTHORITY,
      online: false,
      liveAuthority: false,
      advisoryOnly: true
    });
    ISSUED_CAPABILITIES.add(capability);
    return capability;
  }

  function assertCapability(capability, workflow) {
    if (!capability || !ISSUED_CAPABILITIES.has(capability) ||
        capability.schema !== CAPABILITY_SCHEMA || capability.version !== VERSION ||
        capability.workflow !== workflow || capability.authority !== AUTHORITY ||
        capability.online !== false || capability.liveAuthority !== false || capability.advisoryOnly !== true) {
      throw new TypeError('matching issued dormant offline adapter capability is required');
    }
  }

  function validateMovementWorld(world, tick, fixedTickSeconds) {
    if (!Movement.isCompleteWorldState(world) || world.schema !== Movement.WORLD_SCHEMA) {
      throw new TypeError('movementWorld must be a complete canonical Movement V2 world');
    }
    if (world.tick !== tick) throw new RangeError('movementWorld.tick must match the adapter tick');
    if (world.fixedTickSeconds !== fixedTickSeconds) {
      throw new RangeError('movementWorld.fixedTickSeconds must match the adapter fixed tick');
    }
    const bounds = plainObject(world.bounds, 'movementWorld.bounds');
    const xMin = finite(bounds.xMin, 'movementWorld.bounds.xMin');
    const xMax = finite(bounds.xMax, 'movementWorld.bounds.xMax');
    const yMin = finite(bounds.yMin, 'movementWorld.bounds.yMin');
    const yMax = finite(bounds.yMax, 'movementWorld.bounds.yMax');
    if (!(xMax > xMin) || !(yMax > yMin) || Math.max(Math.abs(xMin), Math.abs(xMax), Math.abs(yMin), Math.abs(yMax)) > 100000) {
      throw new RangeError('movementWorld bounds exceed the SI safety envelope');
    }
    if (world.players.length < 2 || world.players.length > 22) {
      throw new RangeError('movementWorld must contain 2..22 canonical players');
    }
    const ids = new Set();
    const teamIds = new Set();
    for (let index = 0; index < world.players.length; index += 1) {
      const player = plainObject(world.players[index], 'movementWorld.players[' + index + ']');
      if (player.schema !== Movement.PLAYER_SCHEMA) throw new TypeError('every movement player must use the current Movement V2 schema');
      const id = stableId(player.id, 'movementWorld.players[' + index + '].id');
      const teamId = stableId(player.teamId, 'movementWorld.players[' + index + '].teamId');
      if (ids.has(id)) throw new TypeError('movement player ids must be unique');
      if (index && compareIds(world.players[index - 1].id, id) >= 0) {
        throw new TypeError('movementWorld players must be in canonical stable-id order');
      }
      ids.add(id);
      teamIds.add(teamId);
      const position = validateVector2(player.position, 100000, 'movement player position');
      validateVector2(player.velocity, Movement.DEFAULT_CONFIG.safetyVelocityLimit, 'movement player velocity');
      const facing = validateVector2(player.facing, 1.000001, 'movement player facing');
      if (Math.abs(magnitude2(facing) - 1) > 1e-6) throw new RangeError('movement player facing must be unit length');
      const radius = bounded(player.radius, 0.15, 1.2, 'movement player radius');
      bounded(player.mass, 35, 140, 'movement player mass');
      if (position.x < xMin - radius || position.x > xMax + radius || position.y < yMin - radius || position.y > yMax + radius) {
        throw new RangeError('movement player position must remain inside the canonical pitch bounds');
      }
      const attributes = plainObject(player.attributes, 'movement player attributes');
      for (const key of ['pace', 'acceleration', 'agility', 'balance', 'strength', 'stamina', 'defending', 'aggression', 'control']) {
        bounded(attributes[key], 1, 99, 'movement player attributes.' + key);
      }
      if (typeof player.hasBall !== 'boolean') throw new TypeError('movement player hasBall must be boolean');
    }
    if (teamIds.size !== 2) throw new RangeError('movementWorld must contain exactly two stable teams');
    if (world.ballOwnerId !== null || world.players.some(player => player.hasBall !== false)) {
      throw new Error('first-touch authority requires one canonical loose ball with no current movement owner');
    }
    return { ids, teamIds };
  }

  function normalizeLedger(value) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > MAX_LEDGER_IDS) {
      throw new TypeError('consumedHandoffIds must be a bounded array');
    }
    const seen = new Set();
    const ids = value.map((entry, index) => {
      if (typeof entry !== 'string' || !/^first-touch-v2:[1-9][0-9]*:[a-f0-9]{16}$/.test(entry)) {
        throw new TypeError('consumedHandoffIds[' + index + '] is not an adapter handoff id');
      }
      if (seen.has(entry)) throw new TypeError('consumedHandoffIds must not contain duplicates');
      seen.add(entry);
      return entry;
    });
    return ids.sort(compareIds);
  }

  function normalizeRequest(input) {
    const source = plainObject(safeClone(input, 'request'), 'request');
    if (source.schema !== REQUEST_SCHEMA) throw new Error('adapter request schema mismatch');
    if (!WORKFLOWS.includes(source.workflow)) throw new RangeError('adapter workflow is unsupported');
    if (source.online !== false) throw new Error('online First-Touch Authority Adapter use is frozen');
    if (source.coordinateSystem !== COORDINATE_SYSTEM) throw new Error('adapter coordinate system must be explicit SI metres');
    const tick = integer(source.tick, 1, MAX_TICK, 'request.tick');
    const fixedTickSeconds = bounded(source.fixedTickSeconds, 1 / 1000, 1 / 20, 'request.fixedTickSeconds');
    const seed = integer(source.seed, 1, MAX_SEED, 'request.seed');
    const world = plainObject(source.movementWorld, 'request.movementWorld');
    validateMovementWorld(world, tick, fixedTickSeconds);
    const receiverId = stableId(source.receiverPlayerId, 'request.receiverPlayerId');
    const receiver = world.players.find(player => player.id === receiverId);
    if (!receiver) throw new Error('receiverPlayerId must reference the canonical Movement V2 world');
    const rosterEligibility = plainObject(source.rosterEligibility, 'request.rosterEligibility');
    if (Object.keys(rosterEligibility).sort(compareIds).join('\u0000') !== ROSTER_ELIGIBILITY_KEYS.join('\u0000')) {
      throw new Error('authority roster must provide one exact contact-eligible receiver record');
    }
    if (rosterEligibility.schema !== ROSTER_ELIGIBILITY_SCHEMA ||
        rosterEligibility.tick !== tick || rosterEligibility.playerId !== receiver.id ||
        rosterEligibility.teamId !== receiver.teamId) {
      throw new Error('authority roster contact-eligible record must exactly match receiver identity, team and tick');
    }
    if (rosterEligibility.sentOff !== false || rosterEligibility.available !== true ||
        rosterEligibility.contactEligible !== true || receiver.sentOff === true ||
        receiver.available === false || receiver.contactEligible === false ||
        receiver.eligibleForContact === false) {
      throw new Error('sent-off, unavailable or contact-ineligible receiver cannot enter a first-touch handoff');
    }
    if (magnitude2(receiver.velocity) > FirstTouch.DEFAULT_CONFIG.maximumPlayerSpeed) {
      throw new RangeError('receiver Movement velocity exceeds the First Touch input envelope');
    }
    const profile = plainObject(source.receiverProfile, 'request.receiverProfile');
    if (profile.schema !== PROFILE_SCHEMA || profile.playerId !== receiver.id || profile.teamId !== receiver.teamId) {
      throw new Error('receiverProfile identity and team must exactly match the Movement receiver');
    }
    const techniqueAttribute = bounded(profile.technique, 0, 100, 'receiverProfile.technique');
    const awarenessAttribute = bounded(profile.awareness, 0, 100, 'receiverProfile.awareness');
    for (const forbidden of ['control', 'balance', 'agility', 'strength', 'position', 'velocity', 'facing']) {
      if (Object.prototype.hasOwnProperty.call(profile, forbidden)) {
        throw new Error('receiverProfile may only supplement technique and awareness');
      }
    }
    if (!Ball.isBallState(source.ball)) throw new TypeError('request.ball must be a complete current Ball V2 state');
    stableId(source.ball.id, 'request.ball.id');
    if (source.ball.lastOuterTick !== tick) throw new RangeError('Ball V2 lastOuterTick must match the Movement/adapter tick');
    if (source.ball.regime === Ball.REGIMES.CONTROLLED) throw new Error('a controlled Ball V2 state cannot enter a loose-ball first-touch handoff');
    if (source.ball.lastContact != null) {
      const lastContact = plainObject(source.ball.lastContact, 'request.ball.lastContact');
      const contactOuterTick = integer(lastContact.outerTick, 0, MAX_TICK, 'request.ball.lastContact.outerTick');
      if (contactOuterTick >= tick) {
        throw new Error('Ball V2 already carries a same-tick or future contact and is not contact-eligible');
      }
    }
    if (source.ball.position.z < source.ball.radius - 1e-6) throw new RangeError('Ball V2 centre must not sit below its ground-supported radius');
    const pressureIds = Array.isArray(source.pressurePlayerIds) ? source.pressurePlayerIds.map((id, index) =>
      stableId(id, 'pressurePlayerIds[' + index + ']')) : [];
    if (new Set(pressureIds).size !== pressureIds.length) throw new TypeError('pressurePlayerIds must be unique');
    pressureIds.sort(compareIds);
    const pressure = pressureIds.map(id => {
      const opponent = world.players.find(player => player.id === id);
      if (!opponent) throw new Error('every pressurePlayerId must reference the canonical Movement V2 world');
      if (opponent.teamId === receiver.teamId) throw new Error('pressure players must belong to the opposing team');
      return {
        id: opponent.id,
        teamId: opponent.teamId,
        position: { x: opponent.position.x, y: opponent.position.y },
        velocity: { x: opponent.velocity.x, y: opponent.velocity.y },
        strength: opponent.attributes.strength
      };
    });
    const intent = plainObject(source.intent, 'request.intent');
    const timingOffsetSeconds = source.timingOffsetSeconds == null ? 0 :
      bounded(source.timingOffsetSeconds, -0.5, 0.5, 'request.timingOffsetSeconds');
    const selectedTechnique = source.technique == null ? null : source.technique;
    const consumedHandoffIds = normalizeLedger(source.consumedHandoffIds);
    return {
      schema: REQUEST_SCHEMA,
      workflow: source.workflow,
      online: false,
      coordinateSystem: COORDINATE_SYSTEM,
      tick,
      fixedTickSeconds,
      seed,
      movementWorld: world,
      receiver,
      receiverProfile: {
        schema: PROFILE_SCHEMA,
        playerId: receiver.id,
        teamId: receiver.teamId,
        technique: techniqueAttribute,
        awareness: awarenessAttribute
      },
      rosterEligibility: {
        schema: ROSTER_ELIGIBILITY_SCHEMA,
        tick,
        playerId: receiver.id,
        teamId: receiver.teamId,
        sentOff: false,
        available: true,
        contactEligible: true
      },
      ball: source.ball,
      pressureIds,
      pressure,
      intent,
      timingOffsetSeconds,
      technique: selectedTechnique,
      consumedHandoffIds
    };
  }

  function firstTouchRequest(request) {
    return {
      schema: FirstTouch.REQUEST_SCHEMA,
      workflow: request.workflow,
      online: false,
      tick: request.tick,
      fixedTickSeconds: request.fixedTickSeconds,
      seed: request.seed,
      ball: request.ball,
      player: {
        id: request.receiver.id,
        teamId: request.receiver.teamId,
        position: { x: request.receiver.position.x, y: request.receiver.position.y },
        velocity: { x: request.receiver.velocity.x, y: request.receiver.velocity.y },
        facing: { x: request.receiver.facing.x, y: request.receiver.facing.y },
        heightM: bounded(request.receiver.heightM == null ? 1.8 : request.receiver.heightM,
          1.45, 2.15, 'movement receiver heightM'),
        attributes: {
          control: request.receiver.attributes.control,
          technique: request.receiverProfile.technique,
          balance: request.receiver.attributes.balance,
          agility: request.receiver.attributes.agility,
          strength: request.receiver.attributes.strength,
          awareness: request.receiverProfile.awareness
        }
      },
      intent: request.intent,
      pressure: request.pressure,
      timingOffsetSeconds: request.timingOffsetSeconds,
      technique: request.technique
    };
  }

  function validateSourceResult(request, result) {
    if (!result || result.schema !== FirstTouch.RESULT_SCHEMA || result.readOnlyCandidate !== true || result.liveApplied !== false) {
      throw new Error('First Touch V2 returned a non-candidate result');
    }
    if (result.outcome === 'missed') {
      if (result.ownerCandidateId !== null || !missedBallStateEquivalent(result.ballState, request.ball)) {
        throw new Error('missed First Touch result violated detached state continuity');
      }
      return;
    }
    if (!Ball.isBallState(result.ballState) || result.ballState.contactCount !== request.ball.contactCount + 1 ||
        !result.ballState.lastContact || result.ballState.lastContact.colliderId !== request.receiver.id ||
        result.ballState.lastContact.outerTick !== request.tick || result.ballState.lastOuterTick !== request.ball.lastOuterTick) {
      throw new Error('First Touch result violated the contact handoff contract');
    }
    if (result.ownerCandidateId !== null && result.ownerCandidateId !== request.receiver.id) {
      throw new Error('First Touch owner candidate must be the canonical Movement receiver');
    }
  }

  function resolve(input, capability) {
    assertDependencies();
    const request = normalizeRequest(input);
    assertCapability(capability, request.workflow);
    const touchCapability = FirstTouch.createCapability({
      enabled: true,
      online: false,
      workflow: request.workflow,
      acknowledgement: FirstTouch.ACKNOWLEDGEMENT
    });
    const touchRequest = firstTouchRequest(request);
    const sourceResult = FirstTouch.resolve(touchRequest, touchCapability, {
      fixedTickSeconds: request.fixedTickSeconds
    });
    validateSourceResult(request, sourceResult);
    const snapshot = {
      adapterVersion: VERSION,
      workflow: request.workflow,
      coordinateSystem: request.coordinateSystem,
      tick: request.tick,
      fixedTickSeconds: request.fixedTickSeconds,
      seed: request.seed,
      movementWorld: request.movementWorld,
      receiverProfile: request.receiverProfile,
      rosterEligibility: request.rosterEligibility,
      ball: request.ball,
      pressureIds: request.pressureIds,
      intent: request.intent,
      timingOffsetSeconds: request.timingOffsetSeconds,
      technique: request.technique,
      sourceResult
    };
    const attemptDigest = digest(snapshot);
    const movementDigest = digest(request.movementWorld);
    const inputBallDigest = digest(request.ball);
    const contacted = sourceResult.outcome !== 'missed';
    const contactIdentity = {
      schema: CONTACT_IDENTITY_SCHEMA,
      workflow: request.workflow,
      tick: request.tick,
      fixedTickSeconds: request.fixedTickSeconds,
      ballId: request.ball.id,
      preContactCount: request.ball.contactCount,
      receiverPlayerId: request.receiver.id,
      receiverTeamId: request.receiver.teamId
    };
    const contactIdentityDigest = digest(contactIdentity);
    const candidateHandoffId = contacted ? 'first-touch-v2:' + request.tick + ':' + contactIdentityDigest : null;
    const alreadyConsumed = contacted && request.consumedHandoffIds.includes(candidateHandoffId);
    let handoff = null;
    if (contacted && !alreadyConsumed) {
      const controlled = sourceResult.outcome === 'controlled';
      handoff = {
        schema: HANDOFF_SCHEMA,
        version: VERSION,
        handoffId: candidateHandoffId,
        exactOnce: true,
        advisoryOnly: true,
        authority: AUTHORITY,
        workflow: request.workflow,
        online: false,
        liveApplied: false,
        tick: request.tick,
        sourceEventId: sourceResult.eventId,
        preconditions: {
          movementWorldDigest: movementDigest,
          inputBallDigest,
          movementTick: request.tick,
          ballLastOuterTick: request.ball.lastOuterTick,
          expectedBallContactCount: request.ball.contactCount,
          expectedBallOwnerId: null,
          receiverPlayerId: request.receiver.id,
          receiverTeamId: request.receiver.teamId,
          contactIdentity,
          contactIdentityDigest
        },
        contact: {
          ballId: request.ball.id,
          playerId: request.receiver.id,
          teamId: request.receiver.teamId,
          outcome: sourceResult.outcome,
          reason: sourceResult.reason,
          technique: sourceResult.technique,
          lastContact: sourceResult.ballState.lastContact,
          ballState: sourceResult.ballState
        },
        possession: {
          priorOwnerId: null,
          ownerCandidateId: sourceResult.ownerCandidateId,
          disposition: controlled ? 'candidate-acquire' : 'remain-loose'
        },
        telemetryDigest: digest(sourceResult.telemetry)
      };
    }
    return deepFreeze({
      schema: RESULT_SCHEMA,
      version: VERSION,
      authority: AUTHORITY,
      coordinateSystem: COORDINATE_SYSTEM,
      readOnlyCandidate: true,
      advisoryOnly: true,
      online: false,
      liveApplied: false,
      exactOnce: true,
      workflow: request.workflow,
      tick: request.tick,
      attemptDigest,
      contactIdentity,
      contactIdentityDigest,
      movementWorldDigest: movementDigest,
      inputBallDigest,
      receiverPlayerId: request.receiver.id,
      receiverTeamId: request.receiver.teamId,
      ballId: request.ball.id,
      outcome: sourceResult.outcome,
      reason: sourceResult.reason,
      technique: sourceResult.technique,
      ownerCandidateId: sourceResult.ownerCandidateId,
      status: !contacted ? 'no-contact' : alreadyConsumed ? 'already-consumed' : 'pending',
      candidateHandoffId,
      handoff,
      sourceTelemetry: sourceResult.telemetry
    });
  }

  function fixturePlayer(id, teamId, x, data) {
    const source = data || {};
    return {
      id,
      teamId,
      role: source.role || 'midfielder',
      position: { x, y: source.y || 0 },
      velocity: source.velocity || { x: 0, y: 0 },
      facing: source.facing || { x: 1, y: 0 },
      heightM: source.heightM || 1.82,
      attributes: {
        pace: 78, acceleration: 78, agility: 88, balance: 88, strength: 76,
        stamina: 80, defending: 70, aggression: 72, control: 94,
        ...(source.attributes || {})
      }
    };
  }

  function fixtureRequest(options) {
    assertDependencies();
    const source = options || {};
    const tick = source.tick || 17;
    const receiver = fixturePlayer('receiver', 'home', 0, source.receiver);
    const opponents = source.opponents || [fixturePlayer('defender', 'away', 4, {})];
    const movementWorld = Movement.createWorldState({
      tick,
      fixedTickSeconds: 1 / 60,
      bounds: { xMin: -52.5, xMax: 52.5, yMin: -34, yMax: 34 },
      ballOwnerId: null,
      players: [receiver, ...opponents]
    });
    const ball = Ball.createBallState({
      id: source.ballId || 'match-ball',
      position: source.ballPosition || { x: 0.52, y: 0, z: 0.11 },
      velocity: source.ballVelocity || { x: -8, y: 0, z: 0 },
      angularVelocity: source.angularVelocity || { x: 0, y: 3, z: 0 },
      inertia: source.inertia,
      regime: Ball.REGIMES.ROLL,
      grounded: true,
      lastOuterTick: tick,
      contactCount: source.contactCount || 0
    });
    return {
      schema: REQUEST_SCHEMA,
      workflow: source.workflow || 'offline-v2-lab',
      online: false,
      coordinateSystem: COORDINATE_SYSTEM,
      tick,
      fixedTickSeconds: 1 / 60,
      seed: source.seed || 173,
      movementWorld,
      receiverPlayerId: 'receiver',
      receiverProfile: {
        schema: PROFILE_SCHEMA,
        playerId: 'receiver',
        teamId: 'home',
        technique: source.techniqueAttribute == null ? 92 : source.techniqueAttribute,
        awareness: source.awareness == null ? 91 : source.awareness
      },
      rosterEligibility: {
        schema: ROSTER_ELIGIBILITY_SCHEMA,
        tick,
        playerId: 'receiver',
        teamId: 'home',
        sentOff: false,
        available: true,
        contactEligible: true
      },
      ball,
      pressurePlayerIds: source.pressurePlayerIds || [],
      intent: source.intent || { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.4 },
      timingOffsetSeconds: source.timingOffsetSeconds || 0,
      technique: source.technique == null ? null : source.technique,
      consumedHandoffIds: source.consumedHandoffIds || []
    };
  }

  function createCleanReceptionFixture() {
    return fixtureRequest({ seed: 173 });
  }

  function createPressuredHeavyTouchFixture() {
    return fixtureRequest({
      seed: 211,
      receiver: { attributes: { control: 20, agility: 25, balance: 25, strength: 30 } },
      techniqueAttribute: 18,
      awareness: 20,
      opponents: [
        fixturePlayer('close-a', 'away', 0.45, { y: 0.1, attributes: { strength: 94 } }),
        fixturePlayer('close-b', 'away', 0.65, { y: -0.2, attributes: { strength: 90 } })
      ],
      pressurePlayerIds: ['close-b', 'close-a'],
      intent: { type: 'cushion', direction: { x: 1, y: 0 }, touchDistanceM: 0.7, active: false }
    });
  }

  function createMovingAwayMissFixture() {
    return fixtureRequest({
      seed: 223,
      receiver: { velocity: { x: -10, y: 0 } },
      ballPosition: { x: 1.15, y: 0, z: 0.11 },
      ballVelocity: { x: -4, y: 0, z: 0 }
    });
  }

  function createCustomInertiaFixture() {
    return fixtureRequest({
      seed: 227,
      receiver: { attributes: { control: 1, agility: 1, balance: 1, strength: 1 } },
      techniqueAttribute: 0,
      awareness: 0,
      inertia: 0.1,
      ballVelocity: { x: -0.05, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      intent: { type: 'cushion', direction: { x: 0, y: 1 }, touchDistanceM: 0.7, active: false }
    });
  }

  function createReplayRollbackFixture() {
    return fixtureRequest({ tick: 29, seed: 229, ballId: 'rollback-ball' });
  }

  return Object.freeze({
    VERSION,
    REQUEST_SCHEMA,
    RESULT_SCHEMA,
    HANDOFF_SCHEMA,
    PROFILE_SCHEMA,
    ROSTER_ELIGIBILITY_SCHEMA,
    CONTACT_IDENTITY_SCHEMA,
    CAPABILITY_SCHEMA,
    ACKNOWLEDGEMENT,
    AUTHORITY,
    COORDINATE_SYSTEM,
    WORKFLOWS,
    createCapability,
    resolve,
    stableJson,
    createCleanReceptionFixture,
    createPressuredHeavyTouchFixture,
    createMovingAwayMissFixture,
    createCustomInertiaFixture,
    createReplayRollbackFixture
  });
});
