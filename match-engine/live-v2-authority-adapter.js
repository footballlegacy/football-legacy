'use strict';

/*
 * Football Legacy live V2 authority adapter.
 *
 * This is an explicit, offline-only migration seam. It projects the reviewed
 * deterministic Ball, Movement, CPU, Formation and Contact V2 modules into the existing
 * 3D match without taking ownership of rendering, cameras, controllers,
 * restarts, replays, officiating or presentation. Build 173 remains the default
 * and immediate transactional fallback.
 */
(function exposeLiveV2Authority(root, factory) {
  const api = factory(root || null);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyLiveV2Authority = api;
})(typeof window === 'object' ? window : null, function createLiveV2AuthorityApi(browserRoot) {
  'use strict';

  const VERSION = '1.0.0-offline-live-authority-playtest';
  const ACKNOWLEDGEMENT = 'I understand FL V2 is an explicit offline playtest authority with Build 173 as the transactional fallback.';
  const SUPPORTED_WORKFLOWS = Object.freeze(['single-player']);
  const REQUIRED_DEPENDENCIES = Object.freeze([
    'ball', 'movement', 'cpu', 'formation', 'contact'
  ]);
  const DEPENDENCY_CONTRACTS = Object.freeze({
    ball: Object.freeze({ version: '2.0.0-shadow', schemas: Object.freeze({
      STATE_SCHEMA: 'football-legacy-ball-v2-state', CONTEXT_SCHEMA: 'football-legacy-ball-v2-context',
      TRACE_SCHEMA: 'football-legacy-ball-v2-step-trace', LAUNCH_SCHEMA: 'football-legacy-ball-v2-launch-intent'
    }) }),
    movement: Object.freeze({ version: '2.0.0-dormant', schemas: Object.freeze({
      PLAYER_SCHEMA: 'football-legacy-movement-player-v2', WORLD_SCHEMA: 'football-legacy-movement-world-v2',
      TELEMETRY_SCHEMA: 'football-legacy-movement-telemetry-v2'
    }) }),
    cpu: Object.freeze({ version: '2.0.0-dormant', schemas: Object.freeze({
      SNAPSHOT_SCHEMA: 'football-legacy-cpu-snapshot-v2', MEMORY_SCHEMA: 'football-legacy-cpu-memory-v2',
      DECISION_SCHEMA: 'football-legacy-cpu-decision-v2'
    }) }),
    formation: Object.freeze({ version: '2.0.0-dormant', schemas: Object.freeze({
      REQUEST_SCHEMA: 'football-legacy-formation-request-v2', OUTPUT_SCHEMA: 'football-legacy-formation-output-v2',
      TELEMETRY_SCHEMA: 'football-legacy-formation-telemetry-v2', PHILOSOPHY_SCHEMA: 'football-legacy-philosophy-overlay-v2'
    }) }),
    contact: Object.freeze({ version: '1.0.0-offline-live-contact-composer-playtest', schemas: Object.freeze({
      REQUEST_SCHEMA: 'football-legacy-live-v2-contact-composer-request',
      RESULT_SCHEMA: 'football-legacy-live-v2-contact-composer-result',
      CAPABILITY_SCHEMA: 'football-legacy-live-v2-contact-composer-capability'
    }) })
  });
  const FIXED_TICK_SECONDS = 1 / 60;
  const METRIC_PITCH = Object.freeze({ xMin: 0, xMax: 105, yMin: -34, yMax: 34 });
  const issuedCapabilities = new WeakSet();

  function finite(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    for (const key of Object.keys(value)) output[key] = clone(value[key]);
    return output;
  }

  function deepFreeze(value, seen) {
    if (!value || typeof value !== 'object') return value;
    const visited = seen || new WeakSet();
    if (visited.has(value)) return value;
    visited.add(value);
    for (const key of Object.keys(value)) deepFreeze(value[key], visited);
    return Object.freeze(value);
  }

  function stableHash(value) {
    const text = String(value == null ? '' : value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    hash >>>= 0;
    return hash || 0x9e3779b9;
  }

  function point(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      x: finite(source.x, fallback.x),
      y: finite(source.y, fallback.y)
    };
  }

  function vectorLength(value) {
    return Math.hypot(finite(value && value.x, 0), finite(value && value.y, 0));
  }

  function unit(value, fallback) {
    const source = point(value, fallback || { x: 1, y: 0 });
    const length = Math.hypot(source.x, source.y);
    if (length <= 1e-12) return point(fallback || { x: 1, y: 0 }, { x: 1, y: 0 });
    return { x: source.x / length, y: source.y / length };
  }

  function dependenciesFrom(options) {
    const supplied = options && options.dependencies || {};
    const root = browserRoot || {};
    return {
      ball: supplied.ball || root.FootballLegacyBallEngineV2,
      movement: supplied.movement || root.FootballLegacyMovementEngineV2,
      cpu: supplied.cpu || root.FootballLegacyCPUIntelligenceV2,
      formation: supplied.formation || root.FootballLegacyFormationBehaviourV2,
      contact: supplied.contact || root.FootballLegacyLiveV2ContactAuthorityComposer
    };
  }

  function validateDependencies(dependencies) {
    const errors = [];
    if (!dependencies.ball || typeof dependencies.ball.step !== 'function' ||
        typeof dependencies.ball.resolveLaunch !== 'function') errors.push('ball-v2-api-missing');
    if (!dependencies.movement || typeof dependencies.movement.advance !== 'function' ||
        typeof dependencies.movement.createWorldState !== 'function') errors.push('movement-v2-api-missing');
    if (!dependencies.cpu || typeof dependencies.cpu.decide !== 'function' ||
        typeof dependencies.cpu.createMemory !== 'function') errors.push('cpu-v2-api-missing');
    if (!dependencies.formation || typeof dependencies.formation.resolve !== 'function' ||
        typeof dependencies.formation.validateLineup !== 'function') errors.push('formation-v2-api-missing');
    if (!dependencies.contact || typeof dependencies.contact.createCapability !== 'function' ||
        typeof dependencies.contact.compose !== 'function') errors.push('contact-v2-api-missing');
    for (const name of REQUIRED_DEPENDENCIES) {
      const api = dependencies[name], contract = DEPENDENCY_CONTRACTS[name];
      if (!api || api.VERSION !== contract.version) errors.push(name + '-v2-version-mismatch');
      for (const [key, value] of Object.entries(contract.schemas)) {
        if (!api || api[key] !== value) errors.push(name + '-v2-' + key.toLowerCase().replaceAll('_', '-') + '-mismatch');
      }
    }
    return errors;
  }

  function createCapability(options) {
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || '');
    if (source.acknowledgement !== ACKNOWLEDGEMENT) throw new Error('explicit FL V2 acknowledgement is required');
    if (!SUPPORTED_WORKFLOWS.includes(workflow)) throw new Error('unsupported live V2 workflow: ' + workflow);
    if (source.online !== false) throw new Error('online must be explicitly false for live V2 authority');
    const onlineMarkers = source.onlineMarkers && typeof source.onlineMarkers === 'object' ? source.onlineMarkers : {};
    const activeMarkers = Object.keys(onlineMarkers).filter(key => {
      const value = onlineMarkers[key];
      return !(value == null || value === false || value === '' || (Array.isArray(value) && value.length === 0));
    });
    if (activeMarkers.length) throw new Error('online markers freeze live V2: ' + activeMarkers.sort().join(','));
    const capability = Object.freeze({
      schema: 'football-legacy-live-v2-capability',
      version: VERSION,
      grant: 'offline-normal-match-live-authority',
      workflow,
      offlineOnly: true,
      online: false,
      onlineMarkerDigest: activeMarkers.length ? activeMarkers.sort().join(',') : 'none',
      authority: Object.freeze({
        ballLaunchAndFlight: 'football-legacy-ball-engine-v2',
        ballGroundAndGoalFrameContact: 'football-legacy-ball-engine-v2',
        outfieldLocomotion: 'football-legacy-movement-engine-v2',
        outfieldPlayerContact: 'football-legacy-movement-engine-v2',
        cpuRunsAndCarrierIntent: 'football-legacy-cpu-intelligence-v2',
        teamShape: 'football-legacy-formation-behaviour-v2',
        firstTouchReception: 'football-legacy-live-v2-contact-authority-composer',
        aerialVolleyAttempt: 'football-legacy-live-v2-contact-authority-composer',
        goalkeepersSpecialActionsRenderingRulesRestartsReplays: 'build-173',
        wallKeeperAndUnownedOutfieldBallContact: 'build-173-explicit-contact-handoff'
      })
    });
    issuedCapabilities.add(capability);
    return capability;
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new TypeError('live snapshot is required');
    if (!Number.isInteger(snapshot.tick) || snapshot.tick < 1) throw new TypeError('live snapshot tick must be a positive integer');
    if (Math.abs(finite(snapshot.fixedTickSeconds, 0) - FIXED_TICK_SECONDS) > 1e-12) {
      throw new RangeError('live snapshot fixed tick must be 1/60');
    }
    const pitch = snapshot.pitch && typeof snapshot.pitch === 'object' ? {
      xMin: finite(snapshot.pitch.xMin, NaN), xMax: finite(snapshot.pitch.xMax, NaN),
      yMin: finite(snapshot.pitch.yMin, NaN), yMax: finite(snapshot.pitch.yMax, NaN)
    } : null;
    if (!pitch || !(pitch.xMax > pitch.xMin) || !(pitch.yMax > pitch.yMin)) throw new TypeError('live pitch bounds are invalid');
    const units = snapshot.units && typeof snapshot.units === 'object' ? {
      xPerMetre: finite(snapshot.units.xPerMetre, NaN),
      yPerMetre: finite(snapshot.units.yPerMetre, NaN),
      zPerMetre: finite(snapshot.units.zPerMetre, NaN)
    } : null;
    if (!units || !(units.xPerMetre > 0) || !(units.yPerMetre > 0) || !(units.zPerMetre > 0)) {
      throw new TypeError('live metric conversion is invalid');
    }
    if (Math.abs((pitch.xMax - pitch.xMin) / units.xPerMetre - 105) > 1e-9 ||
        Math.abs((pitch.yMax - pitch.yMin) / units.yPerMetre - 68) > 1e-9) {
      throw new RangeError('live pitch units must map exactly to 105 by 68 metres');
    }
    const players = Array.isArray(snapshot.players) ? snapshot.players.map(player => {
      if (!player || typeof player.id !== 'string' || !player.id || !['you', 'opp'].includes(player.teamId)) {
        throw new TypeError('live player identity is invalid');
      }
      return {
        id: player.id, teamId: player.teamId, role: String(player.role || 'midfielder'),
        position: String(player.position || player.role || 'CM'), slotId: String(player.slotId || ''),
        x: finite(player.x, NaN), y: finite(player.y, NaN), vx: finite(player.vx, 0), vy: finite(player.vy, 0),
        fx: finite(player.fx, player.teamId === 'you' ? 1 : -1), fy: finite(player.fy, 0),
        radius: finite(player.radius, 12.75), stamina: clamp(finite(player.stamina, 100), 0, 100),
        heightM: clamp(finite(player.heightM, 1.8), 1.3, 2.2),
        attrs: clone(player.attrs || {}), isGK: Boolean(player.isGK), sentOff: Boolean(player.sentOff),
        tackleActive: Boolean(player.tackleActive), shoulderActive: Boolean(player.shoulderActive),
        control: player.control && typeof player.control === 'object' ? {
          x: clamp(finite(player.control.x, 0), -1, 1), y: clamp(finite(player.control.y, 0), -1, 1),
          strength: clamp(finite(player.control.strength, Math.hypot(finite(player.control.x, 0), finite(player.control.y, 0))), 0, 1),
          sprint: Boolean(player.control.sprint)
        } : null
      };
    }) : [];
    if (players.length < 2) throw new TypeError('live snapshot needs players from both teams');
    const ids = new Set();
    for (const player of players) {
      if (!Number.isFinite(player.x) || !Number.isFinite(player.y)) throw new TypeError('live player coordinates are invalid');
      if (ids.has(player.id)) throw new TypeError('live player ids must be unique');
      ids.add(player.id);
    }
    const humanPlayerIds = new Set((Array.isArray(snapshot.humanPlayerIds) ? snapshot.humanPlayerIds : []).map(String));
    for (const id of humanPlayerIds) if (!ids.has(id)) throw new TypeError('human ownership references an unknown player');
    const ball = snapshot.ball && typeof snapshot.ball === 'object' ? {
      id: String(snapshot.ball.id || 'live-ball'), x: finite(snapshot.ball.x, NaN), y: finite(snapshot.ball.y, NaN),
      z: finite(snapshot.ball.z, 0), vx: finite(snapshot.ball.vx, 0), vy: finite(snapshot.ball.vy, 0),
      zv: finite(snapshot.ball.zv, 0), spin: finite(snapshot.ball.spin, 0), dip: finite(snapshot.ball.dip, 0),
      ownerId: snapshot.ball.ownerId == null ? null : String(snapshot.ball.ownerId),
      targetId: snapshot.ball.targetId == null ? null : String(snapshot.ball.targetId),
      lastKickerId: snapshot.ball.lastKickerId == null ? null : String(snapshot.ball.lastKickerId),
      flightType: String(snapshot.ball.flightType || ''),
      launchIntent: snapshot.ball.launchIntent && typeof snapshot.ball.launchIntent === 'object'
        ? clone(snapshot.ball.launchIntent) : null
    } : null;
    if (!ball || !Number.isFinite(ball.x) || !Number.isFinite(ball.y)) throw new TypeError('live ball snapshot is invalid');
    if (ball.ownerId && !ids.has(ball.ownerId)) throw new TypeError('live ball owner is unknown');
    if (ball.targetId && !ids.has(ball.targetId)) throw new TypeError('live ball target is unknown');
    if (ball.lastKickerId && !ids.has(ball.lastKickerId)) throw new TypeError('live ball last kicker is unknown');
    const teams = Array.isArray(snapshot.teams) ? snapshot.teams.map(team => ({
      id: String(team && team.id || ''), formation: String(team && team.formation || ''),
      phase: String(team && team.phase || 'defend'), philosophy: team && team.philosophy || null,
      attackingDirection: team && team.attackingDirection === -1 ? -1 : 1,
      offsideLine: finite(team && team.offsideLine, team && team.attackingDirection === -1 ? pitch.xMin : pitch.xMax),
      tactics: clone(team && team.tactics || {}), lineup: clone(team && team.lineup || [])
    })) : [];
    if (teams.length !== 2 || new Set(teams.map(team => team.id)).size !== 2 || teams.some(team => !['you', 'opp'].includes(team.id))) {
      throw new TypeError('live snapshot requires exact you and opp team contracts');
    }
    const contactSource = snapshot.contact && typeof snapshot.contact === 'object' ? snapshot.contact : {};
    const contact = {
      intendedReceiverId: contactSource.intendedReceiverId == null ? ball.targetId : String(contactSource.intendedReceiverId),
      firstTouchIntent: contactSource.firstTouchIntent && typeof contactSource.firstTouchIntent === 'object'
        ? clone(contactSource.firstTouchIntent) : null,
      aerialIntent: contactSource.aerialIntent && typeof contactSource.aerialIntent === 'object'
        ? clone(contactSource.aerialIntent) : null,
      gate: {
        livePlay: !!(contactSource.gate && contactSource.gate.livePlay === true),
        restartActive: !!(contactSource.gate && contactSource.gate.restartActive === true),
        replayActive: !!(contactSource.gate && contactSource.gate.replayActive === true),
        keeperAuthority: !!(contactSource.gate && contactSource.gate.keeperAuthority === true),
        offsideInvolvementPending: !!(contactSource.gate && contactSource.gate.offsideInvolvementPending === true),
        specialActionAuthority: !!(contactSource.gate && contactSource.gate.specialActionAuthority === true)
      }
    };
    if (contact.intendedReceiverId && !ids.has(contact.intendedReceiverId)) {
      throw new TypeError('live contact intended receiver is unknown');
    }
    return { tick: snapshot.tick, fixedTickSeconds: FIXED_TICK_SECONDS, pitch, units, players, ball, teams, humanPlayerIds, contact };
  }

  function metricPoint(player, snapshot) {
    return {
      x: (player.x - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
      y: (player.y - (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2) / snapshot.units.yPerMetre
    };
  }

  function metricVelocity(player, snapshot) {
    return {
      x: player.vx * 60 / snapshot.units.xPerMetre,
      y: player.vy * 60 / snapshot.units.yPerMetre
    };
  }

  function livePoint(metric, snapshot) {
    return {
      x: snapshot.pitch.xMin + metric.x * snapshot.units.xPerMetre,
      y: (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2 + metric.y * snapshot.units.yPerMetre
    };
  }

  function liveVelocity(metric, snapshot) {
    return { x: metric.x * snapshot.units.xPerMetre / 60, y: metric.y * snapshot.units.yPerMetre / 60 };
  }

  function metricBall(ball, snapshot) {
    return {
      position: {
        x: (ball.x - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
        y: (ball.y - (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2) / snapshot.units.yPerMetre,
        z: Math.max(0.11, ball.z / snapshot.units.zPerMetre + 0.11)
      },
      velocity: {
        x: ball.vx * 60 / snapshot.units.xPerMetre,
        y: ball.vy * 60 / snapshot.units.yPerMetre,
        z: ball.zv * 60 / snapshot.units.zPerMetre
      }
    };
  }

  function liveBall(state, snapshot) {
    return {
      x: snapshot.pitch.xMin + state.position.x * snapshot.units.xPerMetre,
      y: (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2 + state.position.y * snapshot.units.yPerMetre,
      z: Math.max(0, (state.position.z - state.radius) * snapshot.units.zPerMetre),
      vx: state.velocity.x * snapshot.units.xPerMetre / 60,
      vy: state.velocity.y * snapshot.units.yPerMetre / 60,
      zv: state.velocity.z * snapshot.units.zPerMetre / 60,
      regime: state.regime,
      grounded: state.grounded,
      settled: state.settled
    };
  }

  function philosophyFor(team, formation) {
    const id = String(team.philosophy || '');
    const expected = {
      '4-4-2': 'invincibles-442',
      '3-4-3': 'conte-343',
      '4-3-3': 'ancelotti-bbc-433'
    };
    return expected[formation] === id ? id : null;
  }

  function createAttachment(options) {
    const source = options && typeof options === 'object' ? options : {};
    const capability = source.capability;
    if (!issuedCapabilities.has(capability) || capability.schema !== 'football-legacy-live-v2-capability' ||
        capability.version !== VERSION || capability.grant !== 'offline-normal-match-live-authority' ||
        capability.offlineOnly !== true || capability.online !== false || capability.onlineMarkerDigest !== 'none' ||
        !SUPPORTED_WORKFLOWS.includes(capability.workflow)) throw new Error('issued offline live V2 capability required');
    const dependencies = dependenciesFrom(source), dependencyErrors = validateDependencies(dependencies);
    if (dependencyErrors.length) throw new Error(dependencyErrors.join(','));
    const host = source.host && typeof source.host === 'object' ? source.host : {};
    if (typeof host.prepareTick !== 'function') throw new Error('live V2 host.prepareTick is required');
    const deterministicSeed = (Number.isInteger(source.seed) ? source.seed >>> 0 : stableHash(source.sessionId || capability.workflow)) || 1;
    const contactCapability = dependencies.contact.createCapability({
      enabled: true,
      online: false,
      workflow: capability.workflow,
      parentAdapterVersion: VERSION,
      parentGrant: capability.grant,
      acknowledgement: dependencies.contact.ACKNOWLEDGEMENT
    });
    let enabled = source.enabled === true, lifecycle = enabled ? 'armed' : 'disabled', failure = null, resetEpoch = 0;
    function freshDomain() {
      return {
        world: null, rosterSignature: '', cpuMemories: { you: null, opp: null },
        ballState: null, ballContext: dependencies.ball.createSimulationContext({ seed: (deterministicSeed ^ Math.imul(resetEpoch + 1, 0x9e3779b9)) >>> 0 || deterministicSeed }),
        lastBallProjection: null, lastLaunchSequence: '', lastTackleState: new Set(),
        lastCarrierEmission: { you: '', opp: '' }, possession: { teamId: null, ownerId: null, inFlight: false, intendedReceiverId: null, releaseTick: null, offsideCandidate: null },
        transition: null,
        consumedFirstTouchIds: [],
        consumedAerialIds: []
      };
    }
    let domain = freshDomain();
    let planSequence = 0, latestPlanSequence = 0, lastCommittedTick = -1, committedTicks = 0, committedBallTicks = 0, committedContactTicks = 0;
    let lastFormation = { you: null, opp: null }, lastCpuDecision = { you: null, opp: null }, latestTelemetry = null;
    const issuedFrames = new WeakSet(), consumedFrames = new WeakSet(), privateFrames = new WeakMap();
    const issuedPrepared = new WeakSet(), privatePrepared = new WeakMap();

    function freeze(reason) {
      enabled = false; lifecycle = 'self-disabled-fallback';
      failure = String(reason && reason.message || reason || 'live V2 adapter fault').slice(0, 1024);
      return false;
    }
    function status() {
      return {
        schema: 'football-legacy-live-v2-status', version: VERSION, enabled, lifecycle,
        workflow: capability.workflow, authority: enabled ? 'fl-v2-offline-live' : 'build-173',
        fallback: enabled ? null : 'build-173', failure, fixedTickSeconds: FIXED_TICK_SECONDS,
        deterministicSeed, committedTicks, committedBallTicks, committedContactTicks, lastCommittedTick,
        authorities: clone(capability.authority), dependencyContracts: clone(DEPENDENCY_CONTRACTS),
        lastFormation: clone(lastFormation), lastCpuDecision: clone(lastCpuDecision), latestTelemetry: clone(latestTelemetry),
        possession: clone(domain.possession)
      };
    }
    function phaseAuthority(snapshot, possession) {
      let transition = domain.transition && clone(domain.transition);
      if (domain.possession.teamId && possession.teamId && domain.possession.teamId !== possession.teamId) {
        transition = { fromTeamId: domain.possession.teamId, toTeamId: possession.teamId, startedTick: snapshot.tick, untilTick: snapshot.tick + 30 };
      } else if (transition && snapshot.tick > transition.untilTick) transition = null;
      const phases = {};
      for (const team of snapshot.teams) {
        if (transition) phases[team.id] = team.id === transition.toTeamId ? 'positive-transition' : 'negative-transition';
        else if (possession.teamId) phases[team.id] = team.id === possession.teamId ? 'settled-attack' : 'defend';
        else phases[team.id] = team.phase;
      }
      return { phases, transition };
    }
    function formationOutputs(snapshot, phaseState) {
      const output = {};
      for (const team of snapshot.teams) {
        const formation = dependencies.formation.normalizeFormationCode(team.formation);
        if (!formation) throw new Error('formation V2 rejected ' + team.formation);
        const lineup = team.lineup.map(row => ({ id: String(row.id), slotId: String(row.slotId), position: String(row.position) }));
        const validation = dependencies.formation.validateLineup(formation, lineup);
        if (!validation.valid) throw new Error('formation V2 lineup invalid: ' + validation.errors.join(';'));
        output[team.id] = dependencies.formation.resolve({
          formation, phase: phaseState.phases[team.id], tick: snapshot.tick, lineup,
          philosophy: philosophyFor(team, formation), pitch: METRIC_PITCH,
          attackingDirection: team.attackingDirection,
          offsideLine: (team.offsideLine - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
          tactics: team.tactics
        });
      }
      return output;
    }
    function derivePossession(snapshot) {
      const owner = snapshot.ball.ownerId && snapshot.players.find(player => player.id === snapshot.ball.ownerId);
      if (owner) return { teamId: owner.teamId, ownerId: owner.id, inFlight: false, intendedReceiverId: null, releaseTick: null, offsideCandidate: null };
      const launch = snapshot.ball.launchIntent;
      if (launch) {
        const sourcePlayer = snapshot.players.find(player => player.id === String(launch.sourcePlayerId || snapshot.ball.lastKickerId || ''));
        if (sourcePlayer) return {
          teamId: sourcePlayer.teamId, ownerId: null, inFlight: true,
          intendedReceiverId: launch.targetPlayerId == null ? snapshot.ball.targetId : String(launch.targetPlayerId),
          releaseTick: snapshot.tick, offsideCandidate: clone(launch.offsideCandidate || null)
        };
      }
      const speed = Math.hypot(snapshot.ball.vx, snapshot.ball.vy, snapshot.ball.zv);
      if (domain.possession.teamId && domain.possession.inFlight && speed > 0.03) return clone(domain.possession);
      return { teamId: null, ownerId: null, inFlight: false, intendedReceiverId: null, releaseTick: null, offsideCandidate: null };
    }
    function cpuOutputs(snapshot, formations, possession) {
      const allPlayers = snapshot.players.map(player => {
        const metric = metricPoint(player, snapshot), velocity = metricVelocity(player, snapshot);
        const target = formations[player.teamId].targets.find(row => row.playerId === player.id), attrs = player.attrs || {};
        return {
          id: player.id, teamId: player.teamId, x: metric.x, y: metric.y, vx: velocity.x, vy: velocity.y,
          role: player.role, position: player.position, formationAnchor: target ? target.target : metric,
          pace: finite(attrs.pace, 70), acceleration: finite(attrs.accel, attrs.pace || 70), awareness: finite(attrs.awareness, 70),
          passing: finite(attrs.pass, 70), shooting: finite(attrs.shoot, 65), control: finite(attrs.control, 70),
          defending: finite(attrs.defend, 55), aggression: finite(attrs.aggression, 65), strength: finite(attrs.strength, 70),
          balance: finite(attrs.balance, 70), fx: player.fx, fy: player.fy,
          stamina: player.stamina, isGK: player.isGK, sentOff: player.sentOff, available: !player.sentOff,
          cpuControlled: !snapshot.humanPlayerIds.has(player.id), humanControlled: snapshot.humanPlayerIds.has(player.id)
        };
      });
      const ballPoint = metricBall(snapshot.ball, snapshot).position, outputs = {}, memories = {};
      for (const team of snapshot.teams) {
        const decision = dependencies.cpu.decide({
          tick: snapshot.tick, fixedTickSeconds: FIXED_TICK_SECONDS, teamId: team.id,
          possessionTeamId: possession.teamId, carrierId: possession.ownerId,
          intendedReceiverId: possession.intendedReceiverId, inFlight: possession.inFlight,
          attackingDirection: team.attackingDirection,
          offsideLine: (team.offsideLine - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
          pitch: METRIC_PITCH, ball: { x: ballPoint.x, y: ballPoint.y }, players: allPlayers,
          events: possession.offsideCandidate ? [{ type: 'offside-candidate', ...clone(possession.offsideCandidate) }] : []
        }, domain.cpuMemories[team.id], { fixedTickSeconds: FIXED_TICK_SECONDS });
        outputs[team.id] = decision; memories[team.id] = decision.memory;
      }
      return { outputs, memories };
    }
    function createMovementWorld(snapshot) {
      const activeOutfieldIds = new Set(snapshot.players.filter(player => !player.sentOff && !player.isGK).map(player => player.id));
      return dependencies.movement.createWorldState({
        tick: Math.max(0, snapshot.tick - 1), fixedTickSeconds: FIXED_TICK_SECONDS, bounds: METRIC_PITCH,
        // Goalkeeper ownership stays entirely in Build 173. Never hand an id
        // that is absent from the Movement world into Movement V2.
        ballOwnerId: snapshot.ball.ownerId && activeOutfieldIds.has(snapshot.ball.ownerId) ? snapshot.ball.ownerId : null,
        players: snapshot.players.filter(player => !player.sentOff && !player.isGK).map(player => {
          const position = metricPoint(player, snapshot), velocity = metricVelocity(player, snapshot), attrs = player.attrs || {};
          return {
            id: player.id, teamId: player.teamId, role: player.position || player.role, position, velocity,
            facing: unit({ x: player.fx, y: player.fy }, { x: player.teamId === 'you' ? 1 : -1, y: 0 }),
            radius: clamp(player.radius / Math.sqrt(snapshot.units.xPerMetre * snapshot.units.yPerMetre), 0.25, 0.7),
            staminaLevel: player.stamina, attributes: {
              pace: finite(attrs.pace, 70), acceleration: finite(attrs.accel, attrs.pace || 70), agility: finite(attrs.agility, 70),
              balance: finite(attrs.balance, 70), strength: finite(attrs.strength, 70), stamina: finite(attrs.stamina, 75),
              defending: finite(attrs.defend, 55), aggression: finite(attrs.aggression, 65), control: finite(attrs.control, 70)
            }
          };
        })
      });
    }
    function movementWorld(snapshot) {
      const active = snapshot.players.filter(player => !player.sentOff && !player.isGK), signature = active.map(player => player.id).sort().join('|');
      const activeIds = new Set(active.map(player => player.id));
      const currentOutfieldOwnerId = snapshot.ball.ownerId && activeIds.has(snapshot.ball.ownerId) ? snapshot.ball.ownerId : null;
      let world = domain.world;
      const resync = !world || signature !== domain.rosterSignature || world.players.length !== active.length || world.tick !== snapshot.tick - 1 ||
        world.players.some(statePlayer => {
          const livePlayer = snapshot.players.find(player => player.id === statePlayer.id);
          if (!livePlayer) return true; const metric = metricPoint(livePlayer, snapshot);
          return Math.hypot(metric.x - statePlayer.position.x, metric.y - statePlayer.position.y) > 1.15;
      });
      if (resync) world = createMovementWorld(snapshot);
      // A release/keeper claim can change ownership without moving any player
      // far enough to trigger a spatial resync. Reconcile it every frame on a
      // planned copy, never by mutating the committed domain world.
      world = {
        ...world,
        ballOwnerId: currentOutfieldOwnerId,
        players: world.players.map(player => ({ ...player, hasBall: player.id === currentOutfieldOwnerId }))
      };
      return { world, signature };
    }
    function targetMaps(formations, decisions) {
      const shape = {}, run = {}, carrier = {}, defensive = {};
      for (const teamId of ['you', 'opp']) {
        for (const target of formations[teamId].targets) shape[target.playerId] = target.target;
        for (const committed of decisions[teamId].runs || []) run[committed.playerId] = committed.continuationTarget || committed.target;
        const intent = decisions[teamId].carrierIntent;
        if (intent && intent.type === 'carry' && intent.target) carrier[teamId] = intent.target;
        for (const intent of decisions[teamId].defensiveIntents || []) {
          if (!intent || !intent.playerId || !intent.target) continue;
          defensive[String(intent.playerId)] = clone(intent);
        }
      }
      return { shape, run, carrier, defensive };
    }
    function nearestOpponent(player, snapshot) {
      return snapshot.players.filter(candidate => candidate.teamId !== player.teamId && !candidate.sentOff)
        .map(candidate => ({ candidate, distance: Math.hypot(candidate.x - player.x, candidate.y - player.y) }))
        .sort((a, b) => a.distance - b.distance || a.candidate.id.localeCompare(b.candidate.id))[0]?.candidate || null;
    }
    function movementCommands(snapshot, world, formations, decisions) {
      const commands = [], maps = targetMaps(formations, decisions), nextTick = world.tick + 1;
      const currentTackles = new Set(snapshot.players.filter(player => player.tackleActive).map(player => player.id));
      for (const statePlayer of world.players) {
        const livePlayer = snapshot.players.find(player => player.id === statePlayer.id); if (!livePlayer) continue;
        const isHuman = snapshot.humanPlayerIds.has(livePlayer.id);
        const tackleEdge = currentTackles.has(livePlayer.id) && !domain.lastTackleState.has(livePlayer.id);
        const shoulderEdge = livePlayer.shoulderActive && !domain.lastTackleState.has('shoulder:' + livePlayer.id);
        const defensiveIntent = !isHuman ? maps.defensive[livePlayer.id] || null : null;
        const cpuPhysical = defensiveIntent && defensiveIntent.physicalAction &&
          defensiveIntent.physicalAction.issuedTick === snapshot.tick ? defensiveIntent.physicalAction : null;
        if (tackleEdge || shoulderEdge || cpuPhysical) {
          const target = cpuPhysical
            ? snapshot.players.find(player => player.id === String(cpuPhysical.targetPlayerId || defensiveIntent.targetPlayerId || '')) || null
            : nearestOpponent(livePlayer, snapshot);
          const direction = target ? unit({ x: target.x - livePlayer.x, y: target.y - livePlayer.y }, statePlayer.facing) : statePlayer.facing;
          const type = cpuPhysical ? cpuPhysical.type : tackleEdge ? 'stand-tackle' : 'shoulder-challenge';
          commands.push({ id: type + ':' + livePlayer.id + ':' + nextTick,
            tick: nextTick, playerId: livePlayer.id, type,
            targetId: target && target.id, direction }); continue;
        }
        let desired = { x: 0, y: 0 }, intensity = 0, mode = 'idle';
        if (isHuman) {
          const control = livePlayer.control || { x: 0, y: 0, strength: 0, sprint: false };
          desired = control.strength > 0.02 ? unit(control, statePlayer.facing) : desired;
          intensity = control.strength; mode = intensity <= 0.02 ? 'idle' : control.sprint ? 'sprint' : intensity > 0.38 ? 'run' : 'walk';
        } else {
          const metric = metricPoint(livePlayer, snapshot), runTarget = maps.run[livePlayer.id];
          const carrierTarget = snapshot.ball.ownerId === livePlayer.id ? maps.carrier[livePlayer.teamId] : null;
          const defensiveTarget = defensiveIntent && defensiveIntent.target || null;
          const target = defensiveTarget || runTarget || carrierTarget || maps.shape[livePlayer.id];
          if (target) {
            const toward = { x: target.x - metric.x, y: target.y - metric.y }, distance = vectorLength(toward);
            desired = unit(toward, statePlayer.facing);
            if (defensiveIntent) {
              intensity = clamp(finite(defensiveIntent.targetSpeed, defensiveIntent.type === 'press' ? .88 : .62), .18, 1);
              mode = defensiveIntent.accelerate || defensiveIntent.urgency === 'sprint' ? 'sprint' : intensity > .42 ? 'run' : 'walk';
            } else {
              intensity = clamp(distance / (runTarget ? 7 : 12), runTarget ? 0.74 : 0.12, runTarget ? 1 : 0.72);
              mode = runTarget || intensity > 0.74 ? 'sprint' : intensity > 0.2 ? 'run' : 'walk';
            }
          }
        }
        commands.push(mode === 'idle' ? { id: 'stop:' + livePlayer.id + ':' + nextTick, tick: nextTick, playerId: livePlayer.id, type: 'stop' }
          : { id: 'move:' + livePlayer.id + ':' + nextTick, tick: nextTick, playerId: livePlayer.id, type: 'move', move: desired, facing: desired, mode, intensity, durationTicks: 1 });
      }
      return { commands, stagedTackleState: new Set([...currentTackles, ...snapshot.players.filter(player => player.shoulderActive).map(player => 'shoulder:' + player.id)]) };
    }
    function intelligenceProjection(snapshot, decisions) {
      const projection = [], stagedCarrierEmission = { ...domain.lastCarrierEmission };
      for (const teamId of ['you', 'opp']) {
        const intent = decisions[teamId].carrierIntent, owner = snapshot.ball.ownerId && snapshot.players.find(player => player.id === snapshot.ball.ownerId);
        if (!intent || !owner || owner.teamId !== teamId || snapshot.humanPlayerIds.has(owner.id)) continue;
        const targetId = intent.targetPlayerId == null ? '' : String(intent.targetPlayerId);
        const committedRun = (decisions[teamId].runs || []).find(run => String(run.playerId) === targetId) || null;
        const key = owner.id + '|' + intent.type + '|' + targetId + '|' + Math.floor(snapshot.tick / 6);
        if (['shot', 'pass'].includes(intent.type) && key === stagedCarrierEmission[teamId]) continue;
        if (['shot', 'pass'].includes(intent.type)) stagedCarrierEmission[teamId] = key;
        const sourceTiming = intent.offsideTiming || committedRun && committedRun.offsideTiming || null;
        const offsideTiming = sourceTiming ? clone(sourceTiming) : null;
        if (offsideTiming) {
          offsideTiming.onsideGateX = snapshot.pitch.xMin + finite(sourceTiming.onsideGateX, 0) * snapshot.units.xPerMetre;
          offsideTiming.offsideLineX = snapshot.pitch.xMin + finite(sourceTiming.offsideLineX, 0) * snapshot.units.xPerMetre;
          if (sourceTiming.continuationTarget) offsideTiming.continuationTarget = livePoint(sourceTiming.continuationTarget, snapshot);
          offsideTiming.coordinateSystem = 'build-173-live-pitch';
        }
        projection.push({ teamId, playerId: owner.id, type: intent.type, targetPlayerId: targetId || null,
          target: intent.target ? livePoint(intent.target, snapshot) : null, confidence: finite(intent.confidence, 0), reason: String(intent.reason || 'cpu-v2'),
          offsideTiming,
          continuationTarget: committedRun && committedRun.continuationTarget ? livePoint(committedRun.continuationTarget, snapshot)
            : intent.target ? livePoint(intent.target, snapshot) : null });
      }
      return { projection, stagedCarrierEmission };
    }
    function goalEnvironment() {
      return { colliders: [
        ...dependencies.ball.createGoalFrame({ id: 'home-goal-v2', leftPostBase: { x: 0, y: -3.66, z: 0 }, rightPostBase: { x: 0, y: 3.66, z: 0 }, height: 2.44, postRadius: 0.06 }),
        ...dependencies.ball.createGoalFrame({ id: 'away-goal-v2', leftPostBase: { x: 105, y: -3.66, z: 0 }, rightPostBase: { x: 105, y: 3.66, z: 0 }, height: 2.44, postRadius: 0.06 })
      ], groundEnabled: true };
    }
    function ballMismatch(ball) {
      const prior = domain.lastBallProjection; if (!prior) return true;
      return Math.abs(ball.x - prior.x) > 0.2 || Math.abs(ball.y - prior.y) > 0.2 || Math.abs(ball.z - prior.z) > 0.2 ||
        Math.abs(ball.vx - prior.vx) > 0.08 || Math.abs(ball.vy - prior.vy) > 0.08 || Math.abs(ball.zv - prior.zv) > 0.08;
    }
    function ballPlan(snapshot) {
      if (snapshot.ball.ownerId) return { projection: null, trace: null, stagedState: null, stagedContext: domain.ballContext, stagedProjection: null, stagedLaunchSequence: domain.lastLaunchSequence };
      const metric = metricBall(snapshot.ball, snapshot), intent = snapshot.ball.launchIntent;
      let state = domain.ballState, context = domain.ballContext, launchSequence = domain.lastLaunchSequence;
      if (intent && String(intent.sequence || '') !== launchSequence) {
        const origin = point(intent.origin, { x: snapshot.ball.x, y: snapshot.ball.y });
        const originMetric = { x: (origin.x - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
          y: (origin.y - (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2) / snapshot.units.yPerMetre,
          z: Math.max(.11, finite(intent.origin && intent.origin.z, snapshot.ball.z) / snapshot.units.zPerMetre + .11) };
        const resolved = dependencies.ball.resolveLaunch({ id: 'live-release-' + String(intent.sequence), origin: originMetric,
          direction: unit(intent.direction, { x: 1, y: 0 }), speed: clamp(finite(intent.speedMetresPerSecond, 0), .05, 48),
          liftAngleDeg: clamp(finite(intent.liftAngleDeg, 0), -8, 62), sideSpinRpm: clamp(finite(intent.sideSpinRpm, 0), -2200, 2200),
          topSpinRpm: clamp(finite(intent.topSpinRpm, 0), -1800, 1800), source: String(intent.source || snapshot.ball.flightType || 'live-v2-launch'),
          metadata: { adapterVersion: VERSION, deterministicSeed, sourcePlayerId: intent.sourcePlayerId || null, targetPlayerId: intent.targetPlayerId || null } });
        state = resolved.state; launchSequence = String(intent.sequence);
      } else if (!state || ballMismatch(snapshot.ball)) {
        state = dependencies.ball.createBallState({ id: snapshot.ball.id, position: metric.position, velocity: metric.velocity,
          angularVelocity: state ? state.angularVelocity : { x: 0, y: 0, z: 0 }, grounded: metric.position.z <= .111 && metric.velocity.z <= .65,
          metadata: { resynchronizedFromBuild173Contact: true } });
      }
      // A Build 173 ownership/restart handoff can resynchronise the ball while
      // the adapter's deterministic simulation tick keeps advancing. Ball V2's
      // context is duration-based, so align only its outer chronology to this
      // exact host tick before stepping; the seeded context and all force state
      // remain intact. Contact then receives lastOuterTick === snapshot.tick.
      if (context.outerTick !== snapshot.tick - 1) context = dependencies.ball.createSimulationContext({
        ...context,
        outerTick: snapshot.tick - 1
      });
      const stepped = dependencies.ball.step(state, context, FIXED_TICK_SECONDS, goalEnvironment()), projection = liveBall(stepped.state, snapshot);
      return { projection, trace: stepped.trace, stagedState: stepped.state, stagedContext: stepped.context, stagedProjection: clone(projection), stagedLaunchSequence: launchSequence };
    }
    function contactPlan(snapshot, movementState, plannedBall) {
      if (!plannedBall.stagedState || movementState.ballOwnerId != null) return null;
      let aerialIntent = null;
      if (snapshot.contact.aerialIntent) {
        const source = snapshot.contact.aerialIntent, target = source.target && typeof source.target === 'object' ? source.target : {};
        aerialIntent = {
          sequence: String(source.sequence || ''),
          epoch: resetEpoch,
          commandTick: source.commandTick,
          actorId: String(source.actorId || ''),
          technique: String(source.technique || 'auto'),
          intent: String(source.intent || 'shoot'),
          target: {
            x: (finite(target.x, snapshot.pitch.xMin) - snapshot.pitch.xMin) / snapshot.units.xPerMetre,
            y: (finite(target.y, (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2) -
              (snapshot.pitch.yMin + snapshot.pitch.yMax) / 2) / snapshot.units.yPerMetre,
            z: Math.max(.11, finite(target.z, 0) / snapshot.units.zPerMetre + .11)
          }
        };
      }
      const activeIds = new Set(movementState.players.map(player => player.id));
      const result = dependencies.contact.compose({
        schema: dependencies.contact.REQUEST_SCHEMA,
        workflow: capability.workflow,
        online: false,
        tick: snapshot.tick,
        epoch: resetEpoch,
        seed: deterministicSeed,
        fixedTickSeconds: FIXED_TICK_SECONDS,
        movementWorld: movementState,
        ballState: plannedBall.stagedState,
        roster: snapshot.players.filter(player => activeIds.has(player.id)).map(player => ({
          id: player.id,
          teamId: player.teamId,
          isGK: player.isGK,
          sentOff: player.sentOff,
          available: !player.sentOff,
          contactEligible: !player.sentOff && !player.isGK,
          heightM: player.heightM,
          attributes: clone(player.attrs)
        })),
        // Movement V2 intentionally excludes goalkeepers and unavailable
        // players. Do not let a protected Build 173 keeper/restart target fail
        // contact normalization before the explicit authority gate can run.
        intendedReceiverId: snapshot.contact.intendedReceiverId && activeIds.has(snapshot.contact.intendedReceiverId)
          ? snapshot.contact.intendedReceiverId : null,
        firstTouchIntent: snapshot.contact.firstTouchIntent,
        aerialIntent,
        consumedFirstTouchIds: domain.consumedFirstTouchIds,
        consumedAerialIds: domain.consumedAerialIds,
        gate: snapshot.contact.gate
      }, contactCapability);
      if (!result || result.schema !== dependencies.contact.RESULT_SCHEMA || result.version !== dependencies.contact.VERSION ||
          result.tick !== snapshot.tick || result.epoch !== resetEpoch || result.online !== false ||
          !dependencies.ball.isBallState(result.ballState)) throw new Error('live contact composer result contract failed');
      return result;
    }
    function planTick(rawSnapshot) {
      if (!enabled) return null;
      try {
        const snapshot = normalizeSnapshot(rawSnapshot);
        const expectedTick = lastCommittedTick < 0 ? 1 : lastCommittedTick + 1;
        if (snapshot.tick !== expectedTick) throw new RangeError('live V2 snapshot tick must be exactly sequential');
        const possession = derivePossession(snapshot), phaseState = phaseAuthority(snapshot, possession);
        const formations = formationOutputs(snapshot, phaseState), cpu = cpuOutputs(snapshot, formations, possession);
        const currentMovement = movementWorld(snapshot), commands = movementCommands(snapshot, currentMovement.world, formations, cpu.outputs);
        const movement = dependencies.movement.advance(currentMovement.world, commands.commands, 1, { fixedTickSeconds: FIXED_TICK_SECONDS });
        const movementProjection = movement.state.players.map(player => {
          const position = livePoint(player.position, snapshot), velocity = liveVelocity(player.velocity, snapshot);
          return { id: player.id, x: position.x, y: position.y, vx: velocity.x, vy: velocity.y, fx: player.facing.x, fy: player.facing.y,
            stamina: player.stamina, locomotionState: player.locomotionState, visibleAction: player.visibleAction, action: player.action ? clone(player.action) : null };
        });
        const intelligence = intelligenceProjection(snapshot, cpu.outputs);
        const movementOwnerId = movement.state.ballOwnerId == null ? null : String(movement.state.ballOwnerId);
        const movementOwner = movementOwnerId && snapshot.players.find(player => player.id === movementOwnerId);
        const snapshotOwner = snapshot.ball.ownerId && snapshot.players.find(player => player.id === snapshot.ball.ownerId);
        let effectiveOwnerId = (movementOwnerId || snapshotOwner && snapshotOwner.isGK) ? movementOwnerId || snapshotOwner.id : null;
        let postMovementPossession = effectiveOwnerId ? (() => {
          const owner = snapshot.players.find(player => player.id === effectiveOwnerId);
          return { teamId: owner.teamId, ownerId: owner.id, inFlight: false,
            intendedReceiverId: null, releaseTick: null, offsideCandidate: null };
        })() : snapshotOwner && !snapshotOwner.isGK
          // Movement explicitly returned no owner for an outfield-owned ball:
          // respect that loss instead of silently preserving pre-tick ownership.
          ? { teamId: null, ownerId: null, inFlight: false, intendedReceiverId: null, releaseTick: null, offsideCandidate: null }
          : possession;
        const ballSnapshot = { ...snapshot, ball: { ...snapshot.ball, ownerId: effectiveOwnerId } };
        // Ball V2 sees the post-Movement owner. A loose ball claimed by a
        // tackle can therefore never be integrated again in the same tick.
        const plannedBall = ballPlan(ballSnapshot);
        const contact = contactPlan(ballSnapshot, movement.state, plannedBall);
        let stagedWorld = movement.state;
        let stagedBallState = plannedBall.stagedState;
        let stagedBallProjection = plannedBall.stagedProjection;
        let hostBallProjection = plannedBall.projection;
        if (contact) {
          stagedBallState = contact.ballState;
          stagedBallProjection = contact.ownedContact && contact.ownerCandidateId
            ? null : liveBall(contact.ballState, snapshot);
          hostBallProjection = stagedBallProjection && clone(stagedBallProjection);
          if (contact.ownedContact && contact.ownerCandidateId) {
            const owner = snapshot.players.find(player => player.id === contact.ownerCandidateId);
            if (!owner || owner.isGK || owner.sentOff) throw new Error('live contact owner candidate is ineligible');
            effectiveOwnerId = owner.id;
            postMovementPossession = {
              teamId: owner.teamId,
              ownerId: owner.id,
              inFlight: false,
              intendedReceiverId: null,
              releaseTick: null,
              offsideCandidate: null
            };
            stagedWorld = dependencies.movement.createWorldState({
              tick: movement.state.tick,
              fixedTickSeconds: FIXED_TICK_SECONDS,
              bounds: movement.state.bounds,
              ballOwnerId: owner.id,
              players: movement.state.players.map(player => ({ ...player, hasBall: player.id === owner.id }))
            });
          }
        }
        let stagedTransition = phaseState.transition;
        if (domain.possession.teamId && postMovementPossession.teamId &&
            domain.possession.teamId !== postMovementPossession.teamId) {
          stagedTransition = {
            fromTeamId: domain.possession.teamId,
            toTeamId: postMovementPossession.teamId,
            startedTick: snapshot.tick,
            untilTick: snapshot.tick + 30
          };
        }
        const frame = {
          schema: 'football-legacy-live-v2-tick-frame', version: VERSION, planSequence: ++planSequence, snapshotTick: snapshot.tick,
          hostProjection: { snapshotTick: snapshot.tick, movement: movementProjection, intelligence: intelligence.projection,
            ball: hostBallProjection, contact: contact ? clone(contact) : null,
            movementTelemetry: clone(movement.telemetry), ballTrace: clone(plannedBall.trace),
            possession: clone(postMovementPossession), movementBallOwnerId: effectiveOwnerId,
            authorityCounters: { legacyOutfieldLocomotion: 0, legacyCpu: 0, legacyLooseBallIntegration: 0, candidateTicks: 1 } },
          staged: { world: stagedWorld, rosterSignature: currentMovement.signature, cpuMemories: cpu.memories,
            ballState: stagedBallState, ballContext: plannedBall.stagedContext, lastBallProjection: stagedBallProjection,
            lastLaunchSequence: plannedBall.stagedLaunchSequence, lastTackleState: commands.stagedTackleState,
            lastCarrierEmission: intelligence.stagedCarrierEmission, possession: postMovementPossession, transition: stagedTransition,
            consumedFirstTouchIds: contact ? clone(contact.consumedFirstTouchIds) : domain.consumedFirstTouchIds,
            consumedAerialIds: contact ? clone(contact.consumedAerialIds) : domain.consumedAerialIds },
          formation: formations, cpu: cpu.outputs, movementTelemetry: movement.telemetry, ballTrace: plannedBall.trace,
          contact
        };
        const publicFrame = deepFreeze({
          schema: frame.schema, version: frame.version, planSequence: frame.planSequence, snapshotTick: frame.snapshotTick,
          hostProjection: clone(frame.hostProjection), formation: clone(frame.formation), cpu: clone(frame.cpu),
          movementTelemetry: clone(frame.movementTelemetry), ballTrace: clone(frame.ballTrace), contact: clone(frame.contact)
        });
        latestPlanSequence = frame.planSequence; issuedFrames.add(publicFrame); privateFrames.set(publicFrame, frame); return publicFrame;
      } catch (error) { freeze(error); return null; }
    }
    function validFrame(publicFrame) {
      const frame = publicFrame && privateFrames.get(publicFrame);
      if (!enabled || !frame || !issuedFrames.has(publicFrame) || consumedFrames.has(publicFrame) || frame.version !== VERSION ||
          frame.planSequence !== latestPlanSequence || frame.snapshotTick !== (lastCommittedTick < 0 ? 1 : lastCommittedTick + 1)) return null;
      return frame;
    }
    function prepareCommit(publicFrame) {
      const frame = validFrame(publicFrame);
      if (!frame) return null;
      try {
        const transaction = host.prepareTick(clone(frame.hostProjection));
        if (!transaction || typeof transaction.commit !== 'function' || typeof transaction.rollback !== 'function') throw new Error('host tick transaction is invalid');
        const prepared = deepFreeze({
          schema: 'football-legacy-live-v2-prepared-tick', version: VERSION,
          planSequence: frame.planSequence, snapshotTick: frame.snapshotTick
        });
        const prior = {
          domain, lastCommittedTick, committedTicks, committedBallTicks, committedContactTicks,
          lastFormation, lastCpuDecision, latestTelemetry, lifecycle, failure
        };
        issuedPrepared.add(prepared);
        privatePrepared.set(prepared, { publicFrame, frame, transaction, prior, applied: false, finalized: false });
        return prepared;
      } catch (error) { freeze(error); return null; }
    }
    function preparedRecord(prepared) {
      const record = prepared && privatePrepared.get(prepared);
      if (!enabled || !record || !issuedPrepared.has(prepared) || record.rolledBack || record.aborted) return null;
      return record;
    }
    function applyPrepared(prepared) {
      const record = preparedRecord(prepared);
      if (!record || record.applied || record.finalized) return false;
      try {
        record.transaction.commit();
        record.applied = true;
        return true;
      } catch (error) {
        try { record.transaction.rollback(); } catch (_) {}
        record.rolledBack = true;
        consumedFrames.add(record.publicFrame);
        return freeze(error);
      }
    }
    function finalizePrepared(prepared) {
      const record = preparedRecord(prepared);
      if (!record || !record.applied || record.finalized) return false;
      const frame = record.frame;
      try {
        domain = frame.staged; lastCommittedTick = frame.snapshotTick; committedTicks += 1;
        if (frame.hostProjection.ball) committedBallTicks += 1;
        if (frame.contact && frame.contact.ownedContact) committedContactTicks += 1;
        lastFormation = Object.fromEntries(['you', 'opp'].map(teamId => [teamId, {
          formation: frame.formation[teamId].formation, phase: frame.formation[teamId].phase, phaseShape: frame.formation[teamId].phaseShape,
          targets: frame.formation[teamId].targets.map(row => ({ playerId: row.playerId, slotId: row.slotId, target: clone(row.target) })) }]));
        lastCpuDecision = Object.fromEntries(['you', 'opp'].map(teamId => [teamId, { tick: frame.cpu[teamId].tick,
          runs: clone(frame.cpu[teamId].runs), carrierIntent: clone(frame.cpu[teamId].carrierIntent) }]));
        latestTelemetry = { movement: clone(frame.movementTelemetry), ball: clone(frame.ballTrace), contact: clone(frame.contact), possession: clone(domain.possession),
          formation: Object.fromEntries(['you', 'opp'].map(teamId => [teamId, clone(frame.formation[teamId].telemetry)])),
          cpu: Object.fromEntries(['you', 'opp'].map(teamId => [teamId, clone(frame.cpu[teamId].telemetry)])) };
        lifecycle = 'live'; consumedFrames.add(record.publicFrame); record.finalized = true; return true;
      } catch (error) {
        try { record.transaction.rollback(); } catch (_) {}
        Object.assign(record, { rolledBack: true });
        Object.assign(record.prior, {});
        domain = record.prior.domain; lastCommittedTick = record.prior.lastCommittedTick;
        committedTicks = record.prior.committedTicks; committedBallTicks = record.prior.committedBallTicks;
        committedContactTicks = record.prior.committedContactTicks; lastFormation = record.prior.lastFormation;
        lastCpuDecision = record.prior.lastCpuDecision; latestTelemetry = record.prior.latestTelemetry;
        lifecycle = record.prior.lifecycle; failure = record.prior.failure;
        consumedFrames.add(record.publicFrame);
        return freeze(error);
      }
    }
    function abortPrepared(prepared) {
      const record = preparedRecord(prepared);
      if (!record || record.applied || record.finalized) return false;
      try { record.transaction.rollback(); } catch (_) {}
      record.aborted = true;
      privatePrepared.delete(prepared);
      return true;
    }
    function rollbackPrepared(prepared, reason) {
      const record = prepared && privatePrepared.get(prepared);
      if (!record || !issuedPrepared.has(prepared) || record.rolledBack || record.aborted) return false;
      try { record.transaction.rollback(); } catch (_) {}
      if (record.finalized) {
        domain = record.prior.domain; lastCommittedTick = record.prior.lastCommittedTick;
        committedTicks = record.prior.committedTicks; committedBallTicks = record.prior.committedBallTicks;
        committedContactTicks = record.prior.committedContactTicks; lastFormation = record.prior.lastFormation;
        lastCpuDecision = record.prior.lastCpuDecision; latestTelemetry = record.prior.latestTelemetry;
        lifecycle = record.prior.lifecycle; failure = record.prior.failure;
      }
      record.rolledBack = true;
      consumedFrames.add(record.publicFrame);
      return freeze(reason || 'outer live V2 host transaction rolled back');
    }
    function commitTick(publicFrame) {
      const prepared = prepareCommit(publicFrame);
      if (!prepared || !applyPrepared(prepared)) return false;
      return finalizePrepared(prepared);
    }
    function reset(reason) {
      if (!enabled) return false;
      resetEpoch += 1; domain = freshDomain(); latestPlanSequence = ++planSequence; lastCommittedTick = -1;
      lastFormation = { you: null, opp: null }; lastCpuDecision = { you: null, opp: null }; latestTelemetry = null;
      lifecycle = 'armed'; failure = null;
      return { schema: 'football-legacy-live-v2-reset', version: VERSION, resetEpoch, reason: String(reason || 'build-173-restart-handoff') };
    }
    return Object.freeze({ schema: 'football-legacy-live-v2-attachment', version: VERSION, planTick, prepareCommit, applyPrepared,
      finalizePrepared, abortPrepared, rollbackPrepared, commitTick, reset, status,
      disable: reason => freeze(reason || 'manual one-switch rollback') });
  }

  return Object.freeze({
    VERSION, ACKNOWLEDGEMENT, SUPPORTED_WORKFLOWS, REQUIRED_DEPENDENCIES, DEPENDENCY_CONTRACTS,
    FIXED_TICK_SECONDS, METRIC_PITCH, stableHash, createCapability, createAttachment
  });
});
