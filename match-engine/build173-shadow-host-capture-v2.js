'use strict';

/*
 * Football Legacy Build 173 plain-host shadow capture v2.
 *
 * This module is intentionally unattached. It only turns detached, explicit
 * Build 173 snapshots into the frozen live-adapter observation schema and can
 * hand that observation to the read-only adapter. It never calls the match
 * update loop and exposes no live-state write or candidate-state surface.
 */
(function exposeBuild173ShadowHostCapture(root, factory) {
  const dependency = typeof module === 'object' && module.exports
    ? require('./build173-live-shadow-adapter-v2.js')
    : root && root.FootballLegacyBuild173LiveShadowAdapterV2;
  const api = factory(dependency);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyBuild173ShadowHostCaptureV2 = api;
})(typeof window === 'object' ? window : null, function createBuild173ShadowHostCaptureApi(Adapter) {
  'use strict';

  const VERSION = '2.0.0-build173-plain-host-capture';
  const ACKNOWLEDGEMENT = 'EXPLICIT_BUILD_173_PLAIN_CAPTURE_WITH_NO_LIVE_WRITES';
  const CAPTURE_RESULT_SCHEMA = 'football-legacy-build173-host-capture-result-v2';
  const CAPTURE_TRACE_SCHEMA = 'football-legacy-build173-host-capture-trace-v2';
  const ADAPTER_TELEMETRY_SCHEMA = 'football-legacy-build173-host-capture-adapter-telemetry-v2';
  const HOST_SCHEMA = 'football-legacy-build173-host-observation-v2';
  const HOST_CONTRACT_SCHEMA = 'football-legacy-build173-host-contract-v2';
  const HOST_AUTHORITY = 'build-173-legacy';
  const BUILD = 173;
  const FIXED_TICK_SECONDS = 1 / 60;
  const MAX_TRACE_RECORDS = 16;
  const MAX_SESSION_ID_LENGTH = 256;
  const MAX_TELEMETRY_RECORD_BYTES = 64 * 1024;
  const MAX_TELEMETRY_EXPORT_BYTES = 512 * 1024;
  const MAX_ERROR_MESSAGE_LENGTH = 1024;
  const PRE_MATCH_STAGE = 'pre-match';
  const SHADOW_STAGE = 'match-shadow';

  const WORKFLOWS = Object.freeze({
    ONLINE: 'online',
    SET_PIECE_SUITE: 'set-piece-suite',
    SINGLE_PLAYER: 'single-player',
    QUICK_PLAY: 'quick-play',
    LOCAL_TWO_PLAYER: 'local-two-player',
    HOME_COOP: 'home-coop',
    CPU_V_CPU: 'cpu-v-cpu'
  });
  const OFFLINE_WORKFLOWS = Object.freeze(Object.values(WORKFLOWS)
    .filter(workflow => workflow !== WORKFLOWS.ONLINE));

  const BUILD173_WORLD = Object.freeze({
    width: 3344,
    height: 2142,
    goalLineMargin: 84,
    pitch: Object.freeze({
      xMin: 84,
      xMax: 3260,
      yMin: 0,
      yMax: 2142,
      lengthMetres: 105,
      widthMetres: 68,
      xUnitsPerMetre: (3260 - 84) / 105,
      yUnitsPerMetre: 2142 / 68,
      zUnitsPerMetre: (2142 - 12) / 68,
      framesPerSecond: 60,
      ballRadiusMetres: 0.11,
      spinRadiansPerSecondPerLegacyUnit: 1
    }),
    markings: Object.freeze({
      xMin: 84,
      xMax: 3260,
      yMin: 6,
      yMax: 2136,
      evidence: 'match.html strokeRect(M,6,W-2*M,H-12)'
    }),
    ruleTouchlines: Object.freeze({
      yMin: 8,
      yMax: 2134,
      evidence: 'match.html loose-ball top=8,bot=H-8'
    }),
    throwInApron: Object.freeze({
      xMin: 84,
      xMax: 3260,
      yMin: -26,
      yMax: 2168,
      exception: 'declared-held-throw-in-taker-only'
    })
  });

  const PHASE_MAP = Object.freeze({
    PLAY: 'live',
    DEAD_BALL: 'dead-ball',
    SET_PIECE: 'set-piece',
    PAUSED: 'paused'
  });
  const PERIODS = Object.freeze(['first-half', 'half-time', 'second-half', 'full-time']);
  const PRELUDE_PHASES = Object.freeze(['walkout', 'walkout-tunnel', 'walkout-line']);
  const POST_MATCH_PRESENTATION_PHASES = Object.freeze(['fulltime-presentation', 'walkin', 'ended']);
  const REQUIRED_PLAYER_ATTRIBUTES = Object.freeze([
    'pace', 'accel', 'agility', 'balance', 'strength', 'stamina',
    'defend', 'aggression', 'control', 'pass', 'shoot', 'awareness'
  ]);

  const POSITION_FAMILIES = Object.freeze({
    GK: 'goalkeeper',
    CB: 'centre-back', LCB: 'centre-back', RCB: 'centre-back', SW: 'centre-back',
    LB: 'full-back', RB: 'full-back', FB: 'full-back',
    LWB: 'wing-back', RWB: 'wing-back',
    DM: 'defensive-midfield', CDM: 'defensive-midfield',
    CM: 'central-midfield', LCM: 'central-midfield', RCM: 'central-midfield',
    LM: 'wide-midfield', RM: 'wide-midfield',
    AM: 'attacking-midfield', CAM: 'attacking-midfield',
    LW: 'winger', RW: 'winger',
    CF: 'second-striker', SS: 'second-striker',
    ST: 'striker', LST: 'striker', RST: 'striker'
  });

  const WORKFLOW_OWNERSHIP = Object.freeze({
    [WORKFLOWS.SET_PIECE_SUITE]: Object.freeze({ humanCounts: [1, 0], cpuCounts: [0, 1] }),
    [WORKFLOWS.SINGLE_PLAYER]: Object.freeze({ humanCounts: [1, 0], cpuCounts: [0, 1] }),
    [WORKFLOWS.QUICK_PLAY]: Object.freeze({ humanCounts: [1, 0], cpuCounts: [0, 1] }),
    [WORKFLOWS.LOCAL_TWO_PLAYER]: Object.freeze({ humanCounts: [1, 1], cpuCounts: [0, 0] }),
    [WORKFLOWS.HOME_COOP]: Object.freeze({ humanCounts: [2, 0], cpuCounts: [0, 1] }),
    [WORKFLOWS.CPU_V_CPU]: Object.freeze({ humanCounts: [0, 0], cpuCounts: [1, 1] })
  });

  function assertDependency() {
    if (!Adapter || Adapter.HOST_SCHEMA !== HOST_SCHEMA ||
      Adapter.HOST_CONTRACT_SCHEMA !== HOST_CONTRACT_SCHEMA ||
      Adapter.HOST_AUTHORITY !== HOST_AUTHORITY || Adapter.BUILD !== BUILD) {
      throw new Error('Build 173 live shadow adapter v2 must be loaded before host capture v2');
    }
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    const result = {};
    Object.keys(value).forEach(key => { result[key] = clone(value[key]); });
    return result;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
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

  function utf8ByteLength(value) {
    const text = String(value);
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length &&
          text.charCodeAt(index + 1) >= 0xdc00 && text.charCodeAt(index + 1) <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    }
    return bytes;
  }

  function digest(value) {
    const text = stableJson(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'fnv1a32-' + (hash >>> 0).toString(16).padStart(8, '0');
  }

  function record(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(label + ' must be an object');
    }
    return value;
  }

  function array(value, label) {
    if (!Array.isArray(value)) throw new TypeError(label + ' must be an array');
    return value;
  }

  function string(value, label) {
    if (typeof value !== 'string' || !value) throw new TypeError(label + ' must be a non-empty string');
    return value;
  }

  function boundedString(value, maximum, label) {
    const result = string(value, label);
    if (result.length > maximum) throw new RangeError(label + ' exceeds the string length limit');
    return result;
  }

  function errorMessage(error) {
    let message;
    try { message = error && typeof error.message === 'string' ? error.message : String(error); }
    catch (ignored) { message = 'unreadable shadow-capture error'; }
    return String(message).slice(0, MAX_ERROR_MESSAGE_LENGTH);
  }

  function finite(value, label) {
    if (!Number.isFinite(value)) throw new TypeError(label + ' must be finite');
    return Number(value);
  }

  function nonNegative(value, label) {
    const result = finite(value, label);
    if (result < 0) throw new RangeError(label + ' must be non-negative');
    return result;
  }

  function range(value, minimum, maximum, label) {
    const result = finite(value, label);
    if (result < minimum || result > maximum) {
      throw new RangeError(label + ' must be in the range ' + minimum + '..' + maximum);
    }
    return result;
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

  function exactBoolean(value, label) {
    if (typeof value !== 'boolean') throw new TypeError(label + ' must be an explicit boolean');
    return value;
  }

  function unique(values, label) {
    if (new Set(values).size !== values.length) throw new Error(label + ' must be unique');
  }

  function exactSet(actual, expected, label) {
    const a = actual.map(String).sort();
    const b = expected.map(String).sort();
    unique(a, label);
    if (stableJson(a) !== stableJson(b)) throw new Error(label + ' must exactly match the declared set');
  }

  function positionFamily(position) {
    const key = String(position || '').toUpperCase();
    const family = POSITION_FAMILIES[key];
    if (!family) throw new Error('unsupported Build 173 position: ' + key);
    return family;
  }

  function roleForFamily(family) {
    if (family === 'goalkeeper') return 'gk';
    if (['centre-back', 'full-back', 'wing-back'].includes(family)) return 'def';
    if (['winger', 'second-striker', 'striker'].includes(family)) return 'fwd';
    return 'mid';
  }

  function onlineMarkerReasons(source) {
    const options = source && typeof source === 'object' ? source : {};
    const markers = options.onlineMarkers && typeof options.onlineMarkers === 'object'
      ? options.onlineMarkers : {};
    const reasons = [];
    for (const key of ['onlineRole', 'onlineRoom', 'onlineBuild']) {
      if (Object.prototype.hasOwnProperty.call(markers, key) && markers[key] != null && markers[key] !== '') {
        reasons.push(key);
      }
    }
    if (markers.mode === 'online' || markers.mode === 'online-versus') reasons.push('mode');
    if (markers.matchType === 'online' || markers.matchType === 'online-versus') reasons.push('matchType');
    if (markers.configOnline === true) reasons.push('configOnline');
    if (markers.controllersOnline === true) reasons.push('controllersOnline');
    if (Array.isArray(markers.urlMarkers) && markers.urlMarkers.length) reasons.push('urlMarkers');
    if (source.online === true) reasons.push('online');
    if (source.workflow === WORKFLOWS.ONLINE) reasons.push('workflow');
    return Array.from(new Set(reasons)).sort();
  }

  function resolveStatus(options) {
    assertDependency();
    const source = options && typeof options === 'object' ? options : {};
    const workflow = String(source.workflow || WORKFLOWS.QUICK_PLAY);
    const requestedEnabled = source.enabled === true;
    const markerReasons = onlineMarkerReasons(source);
    let enabled = false;
    let reason = requestedEnabled ? 'acknowledgement-rejected' : 'disabled-by-default';
    if (!Object.values(WORKFLOWS).includes(workflow)) reason = 'unknown-workflow';
    else if (markerReasons.length) reason = 'online-frozen';
    else if (requestedEnabled && source.acknowledgement === ACKNOWLEDGEMENT && OFFLINE_WORKFLOWS.includes(workflow)) {
      enabled = true;
      reason = 'explicit-offline-read-only-capture';
    }
    return Object.freeze({
      requestedEnabled,
      enabled,
      reason,
      workflow,
      onlineMarkerReasons: markerReasons,
      authority: HOST_AUTHORITY,
      readOnly: true,
      liveWrites: false
    });
  }

  function createPitchContract(matchLengthMinutes) {
    const minutes = range(matchLengthMinutes, 2, 20, 'matchLengthMinutes');
    return deepFreeze({
      schema: HOST_CONTRACT_SCHEMA,
      authority: HOST_AUTHORITY,
      readOnly: true,
      world: { width: BUILD173_WORLD.width, height: BUILD173_WORLD.height, goalLineMargin: BUILD173_WORLD.goalLineMargin },
      pitch: clone(BUILD173_WORLD.pitch),
      coordinateEvidence: {
        markedPitch: clone(BUILD173_WORLD.markings),
        ruleTouchlines: clone(BUILD173_WORLD.ruleTouchlines)
      },
      staging: { throwInApron: clone(BUILD173_WORLD.throwInApron) },
      clock: {
        source: 'simulation-time-only',
        matchLengthMinutes: minutes,
        acceleration: 90 / minutes,
        phaseMap: clone(PHASE_MAP)
      }
    });
  }

  function validateOwnership(workflow, teams, ownership) {
    const source = record(ownership, 'controlOwnership');
    const teamIds = teams.map(team => team.id);
    const participants = array(source.participants, 'controlOwnership.participants').map((participant, index) => {
      const row = record(participant, 'controlOwnership participant');
      const teamId = string(row.teamId, 'controlOwnership participant.teamId');
      if (!teamIds.includes(teamId)) throw new Error('control participant teamId is not declared');
      return {
        id: string(row.id, 'controlOwnership participant.id'),
        inputSlot: string(row.inputSlot, 'controlOwnership participant.inputSlot'),
        teamId,
        order: index
      };
    });
    unique(participants.map(row => row.id), 'control participant ids');
    unique(participants.map(row => row.inputSlot), 'control input slots');
    const cpuTeamIds = array(source.cpuTeamIds, 'controlOwnership.cpuTeamIds').map(String);
    unique(cpuTeamIds, 'control CPU team ids');
    cpuTeamIds.forEach(teamId => {
      if (!teamIds.includes(teamId)) throw new Error('control CPU teamId is not declared');
    });
    participants.forEach(row => {
      if (cpuTeamIds.includes(row.teamId)) throw new Error('a team cannot be both human-owned and CPU-owned');
    });
    const requirement = WORKFLOW_OWNERSHIP[workflow];
    if (!requirement) throw new Error('workflow has no offline control ownership contract');
    const humanCounts = teamIds.map(teamId => participants.filter(row => row.teamId === teamId).length);
    const cpuCounts = teamIds.map(teamId => cpuTeamIds.includes(teamId) ? 1 : 0);
    if (stableJson(humanCounts) !== stableJson(requirement.humanCounts) ||
      stableJson(cpuCounts) !== stableJson(requirement.cpuCounts)) {
      throw new Error('control ownership does not match the explicit ' + workflow + ' workflow contract');
    }
    return deepFreeze({ participants: clone(participants), cpuTeamIds: clone(cpuTeamIds) });
  }

  function createIdentity(options) {
    const source = record(options, 'identity options');
    const workflow = string(source.workflow, 'identity workflow');
    if (!OFFLINE_WORKFLOWS.includes(workflow)) throw new Error('identity workflow must be recognised and offline');
    const teams = array(source.teams, 'identity teams').map((team, teamIndex) => {
      const row = record(team, 'identity team');
      const players = array(row.players, 'identity team players').map(player => {
        const entry = record(player, 'identity player');
        const position = string(entry.position, 'identity player.position').toUpperCase();
        const family = positionFamily(position);
      return {
        id: string(entry.id, 'identity player.id'),
          actualPlayerId: entry.actualPlayerId == null ? null : string(entry.actualPlayerId, 'identity player.actualPlayerId'),
          candidateId: string(entry.candidateId, 'identity player.candidateId'),
          slotId: string(entry.slotId, 'identity player.slotId'),
          position,
          positionFamily: family
        };
      });
      if (players.length !== 11) throw new Error('identity team must contain exactly 11 stable player slots');
      unique(players.map(player => player.id), 'identity team player ids');
      unique(players.map(player => player.candidateId), 'identity team candidate player ids');
      unique(players.map(player => player.slotId), 'identity team slot ids');
      if (players.filter(player => player.positionFamily === 'goalkeeper').length !== 1) {
        throw new Error('identity team must contain exactly one goalkeeper slot');
      }
      const attackingDirection = row.attackingDirection;
      if (attackingDirection !== 1 && attackingDirection !== -1) {
        throw new Error('identity team attackingDirection must be exactly 1 or -1');
      }
      return {
        id: string(row.id, 'identity team.id'),
        candidateId: string(row.candidateId, 'identity team.candidateId'),
        formation: string(row.formation, 'identity team.formation'),
        attackingDirection,
        order: teamIndex,
        players
      };
    });
    if (teams.length !== 2) throw new Error('identity requires exactly two teams');
    unique(teams.map(team => team.id), 'identity team ids');
    unique(teams.map(team => team.candidateId), 'identity candidate team ids');
    if (teams[0].attackingDirection !== -teams[1].attackingDirection) {
      throw new Error('identity teams must declare opposite attacking directions');
    }
    const allPlayers = teams.flatMap(team => team.players);
    unique(allPlayers.map(player => player.id), 'identity player ids');
    unique(allPlayers.map(player => player.candidateId), 'identity candidate player ids');
    const ownership = validateOwnership(workflow, teams, source.controlOwnership);
    const adapterTeams = teams.map(team => ({
      id: team.id,
      candidateId: team.candidateId,
      formation: team.formation,
      attackingDirection: team.attackingDirection,
      control: ownership.cpuTeamIds.includes(team.id) ? 'cpu' : 'human',
      players: team.players.map(player => ({
        id: player.id,
        candidateId: player.candidateId,
        slotId: player.slotId,
        position: player.position
      }))
    }));
    return deepFreeze({
      workflow,
      ballId: string(source.ballId, 'identity ballId'),
      teams: adapterTeams,
      positionFamilies: Object.fromEntries(allPlayers.map(player => [player.id, player.positionFamily])),
      controlOwnership: clone(ownership)
    });
  }

  function phaseFromHostClock(clock) {
    const source = record(clock, 'host clock');
    const matchPhase = String(source.matchPhase || 'play');
    if (source.paused === true) return 'PAUSED';
    if (source.setPieceActive === true || source.kickoffHeld === true ||
      (typeof source.restartKind === 'string' && source.restartKind) || matchPhase === 'set-piece') {
      return 'SET_PIECE';
    }
    const stoppedPresentation = source.deadBall === true || source.offsidePresentation === true ||
      source.celebrationActive === true || source.replayActive === true ||
      POST_MATCH_PRESENTATION_PHASES.includes(matchPhase);
    if (source.clockRunning === true && matchPhase === 'play' && !stoppedPresentation) return 'PLAY';
    return 'DEAD_BALL';
  }

  function presentationBoundary(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const clock = source.clock && typeof source.clock === 'object' ? source.clock : {};
    const phase = String(clock.matchPhase || '');
    if (source.presentationPrelude === true || PRELUDE_PHASES.includes(phase)) return 'prelude';
    if (source.postMatchPresentation === true || POST_MATCH_PRESENTATION_PHASES.includes(phase)) return 'post-match';
    return null;
  }

  function normalizeClock(clock, gameplaySeconds) {
    const source = record(clock, 'host snapshot clock');
    const phase = phaseFromHostClock(source);
    const period = string(source.period, 'host snapshot clock.period');
    if (!PERIODS.includes(period)) throw new Error('host snapshot clock.period is unsupported');
    const suppliedPhase = source.phase == null ? phase : String(source.phase);
    if (suppliedPhase !== phase) throw new Error('explicit host phase conflicts with deterministic phase mapping');
    return {
      phase,
      period,
      ballLive: phase === 'PLAY',
      clockFrames: nonNegative(source.clockFrames, 'host snapshot clock.clockFrames'),
      gameplaySeconds: nonNegative(gameplaySeconds, 'cumulative gameplaySeconds'),
      reason: string(source.reason, 'host snapshot clock.reason')
    };
  }

  function restartContext(snapshot) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const restart = source.restart && typeof source.restart === 'object' ? source.restart : {};
    return {
      kind: String(restart.kind || '').trim().toUpperCase().replace(/[\s_]+/g, '-'),
      takerId: restart.takerId == null ? null : String(restart.takerId),
      held: restart.held === true
    };
  }

  function insidePitch(value, pitch) {
    return value.x >= pitch.xMin && value.x <= pitch.xMax && value.y >= pitch.yMin && value.y <= pitch.yMax;
  }

  function normalizePlayer(player, declared, snapshot, label) {
    const source = record(player, label + ' player');
    if (source.teamId !== declared.teamId) throw new Error(label + ' player team ownership conflicts with identity: ' + declared.id);
    const position = source.position == null ? declared.position : String(source.position).toUpperCase();
    if (position !== declared.position) throw new Error(label + ' player position conflicts with stable slot identity: ' + declared.id);
    const family = positionFamily(position);
    if (family !== declared.positionFamily) throw new Error(label + ' player position family changed: ' + declared.id);
    const result = {
      id: declared.id,
      teamId: declared.teamId,
      x: finite(source.x, label + ' player.x'),
      y: finite(source.y, label + ' player.y'),
      vx: finite(source.vx, label + ' player.vx'),
      vy: finite(source.vy, label + ' player.vy'),
      fx: finite(source.fx, label + ' player.fx'),
      fy: finite(source.fy, label + ' player.fy'),
      homeX: finite(source.homeX, label + ' player.homeX'),
      homeY: finite(source.homeY, label + ' player.homeY'),
      role: source.role == null ? roleForFamily(family) : string(source.role, label + ' player.role'),
      position,
      attrs: {},
      stamina: range(source.stamina, 0, 100, label + ' player.stamina'),
      sentOff: exactBoolean(source.sentOff, label + ' player.sentOff'),
      locomotionState: String(source.locomotionState || 'idle')
    };
    if (Math.hypot(result.fx, result.fy) <= 1e-12) throw new Error(label + ' player facing must be non-zero: ' + declared.id);
    if (!insidePitch({ x: result.homeX, y: result.homeY }, BUILD173_WORLD.pitch)) {
      throw new Error(label + ' player home anchor is outside the exact pitch: ' + declared.id);
    }
    if (!insidePitch(result, BUILD173_WORLD.pitch)) {
      const restart = restartContext(snapshot);
      const apron = BUILD173_WORLD.throwInApron;
      const stableRestartTakerId = restart.takerId == null ? null :
        snapshot.__actualToStablePlayerId[restart.takerId] || restart.takerId;
      const declaredException = restart.kind === 'THROW-IN' && restart.held && stableRestartTakerId === declared.id &&
        result.x >= apron.xMin && result.x <= apron.xMax && result.y >= apron.yMin && result.y <= apron.yMax &&
        (result.y < BUILD173_WORLD.pitch.yMin || result.y > BUILD173_WORLD.pitch.yMax);
      if (!declaredException) throw new Error(label + ' player is outside the pitch without the held throw-in taker exception: ' + declared.id);
    }
    const attrs = record(source.attrs, label + ' player.attrs');
    REQUIRED_PLAYER_ATTRIBUTES.forEach(key => {
      result.attrs[key] = range(attrs[key], 0, 100, label + ' player.attrs.' + key);
    });
    return result;
  }

  function optionalKickoffNumber(source, key, kickoff, defaults) {
    if (Number.isFinite(source[key])) return Number(source[key]);
    if (!kickoff) throw new TypeError('host ball.' + key + ' must be finite outside the explicit kickoff state');
    defaults.push(key);
    return 0;
  }

  function normalizeBall(ball, identity, snapshot, clock, label) {
    const source = record(ball, label + ' ball');
    const kickoff = clock.phase === 'SET_PIECE' &&
      (snapshot.clock.kickoffHeld === true || String(snapshot.clock.restartKind || '') === 'KICK OFF');
    const defaults = [];
    const id = source.id == null && kickoff ? identity.ballId : source.id;
    if (id !== identity.ballId) throw new Error(label + ' ball identity conflicts with match identity');
    const rawOwnerId = source.ownerId == null ? null : String(source.ownerId);
    const ownerId = rawOwnerId == null ? null : snapshot.__actualToStablePlayerId[rawOwnerId] || rawOwnerId;
    const playerIds = identity.teams.flatMap(team => team.players.map(player => player.id));
    if (ownerId != null && !playerIds.includes(ownerId)) throw new Error(label + ' ball ownerId is not in the exact stable-slot roster');
    let flightType = source.flightType;
    if ((typeof flightType !== 'string' || !flightType) && kickoff) {
      defaults.push('flightType');
      flightType = 'ground';
    }
    return {
      ball: {
        id: identity.ballId,
        x: finite(source.x, label + ' ball.x'),
        y: finite(source.y, label + ' ball.y'),
        z: optionalKickoffNumber(source, 'z', kickoff, defaults),
        vx: finite(source.vx, label + ' ball.vx'),
        vy: finite(source.vy, label + ' ball.vy'),
        zv: optionalKickoffNumber(source, 'zv', kickoff, defaults),
        spin: optionalKickoffNumber(source, 'spin', kickoff, defaults),
        dip: optionalKickoffNumber(source, 'dip', kickoff, defaults),
        curveAccel: optionalKickoffNumber(source, 'curveAccel', kickoff, defaults),
        ownerId,
        flightType: string(flightType, label + ' ball.flightType')
      },
      kickoffDefaults: defaults.sort()
    };
  }

  function identityLookups(identity) {
    const players = [];
    identity.teams.forEach(team => team.players.forEach(player => players.push({
      id: player.id,
      teamId: team.id,
      slotId: player.slotId,
      position: player.position,
      positionFamily: positionFamily(player.position)
    })));
    return {
      players,
      playerById: Object.fromEntries(players.map(player => [player.id, player])),
      playerBySlot: Object.fromEntries(players.map(player => [player.teamId + ':' + player.slotId, player])),
      teamById: Object.fromEntries(identity.teams.map(team => [team.id, team]))
    };
  }

  function normalizeFrame(snapshot, tick, identity, gameplaySeconds, label) {
    const source = record(snapshot, label + ' snapshot');
    const lookups = identityLookups(identity);
    const players = array(source.players, label + ' snapshot.players');
    const resolved = players.map(player => {
      const row = record(player, label + ' player');
      const stable = row.slotId == null
        ? lookups.playerById[row.id]
        : lookups.playerBySlot[String(row.teamId) + ':' + String(row.slotId)];
      if (!stable) throw new Error(label + ' player has no declared stable on-pitch slot: ' + String(row.id || 'unknown'));
      return { row, stable, actualPlayerId: String(row.actualPlayerId || row.id || '') };
    });
    exactSet(resolved.map(entry => entry.stable.id), lookups.players.map(player => player.id), label + ' stable player slots');
    unique(resolved.map(entry => entry.actualPlayerId), label + ' actual player ids');
    const actualToStable = Object.fromEntries(resolved.map(entry => [entry.actualPlayerId, entry.stable.id]));
    const snapshotForMapping = { ...source, __actualToStablePlayerId: actualToStable };
    const normalizedPlayers = resolved.map(entry => normalizePlayer(entry.row, entry.stable, snapshotForMapping, label));
    const clock = normalizeClock(source.clock, gameplaySeconds);
    const normalizedBall = normalizeBall(source.ball, identity, snapshotForMapping, clock, label);
    const stagingPlayers = normalizedPlayers.filter(player => !insidePitch(player, BUILD173_WORLD.pitch)).map(player => ({
      id: player.id,
      x: player.x,
      y: player.y,
      exception: BUILD173_WORLD.throwInApron.exception
    }));
    const rawRestart = restartContext(snapshotForMapping);
    const stableRestartTakerId = rawRestart.takerId == null ? null :
      actualToStable[rawRestart.takerId] || rawRestart.takerId;
    const stagingRestart = stagingPlayers.length ? {
      kind: 'THROW IN',
      held: rawRestart.held,
      takerId: stableRestartTakerId
    } : null;
    return {
      frame: { tick, players: normalizedPlayers, ball: normalizedBall.ball, clock },
      metadata: {
        kickoffDefaults: normalizedBall.kickoffDefaults,
        stagingPlayers,
        actualPlayerIds: Object.fromEntries(resolved.map(entry => [entry.stable.id, entry.actualPlayerId])),
        actualToStablePlayerId: actualToStable,
        stagingRestart
      }
    };
  }

  function mergeStagingRestart(before, after) {
    const rows = [before && before.metadata && before.metadata.stagingRestart,
      after && after.metadata && after.metadata.stagingRestart].filter(Boolean);
    if (!rows.length) return null;
    if (rows.some(row => row.kind !== 'THROW IN' || row.held !== true || !row.takerId)) {
      throw new Error('outside-touchline staging requires the explicit held THROW IN restart context');
    }
    if (rows.some(row => stableJson(row) !== stableJson(rows[0]))) {
      throw new Error('held throw-in restart context must remain exact across the captured boundary');
    }
    return clone(rows[0]);
  }

  function normalizeTeamStates(teamStates, identity, frame, tick, actualToStablePlayerId) {
    const entries = array(teamStates, 'teamStates');
    exactSet(entries.map(entry => entry && entry.teamId), identity.teams.map(team => team.id), 'teamStates team ids');
    const playerTeams = Object.fromEntries(identity.teams.flatMap(team => team.players.map(player => [player.id, team.id])));
    const ownerId = frame.ball.ownerId;
    const possessionTeamId = ownerId == null ? null : playerTeams[ownerId];
    const formation = entries.map(entry => {
      const row = record(entry, 'teamState');
      const team = identity.teams.find(item => item.id === row.teamId);
      const sentOffIds = frame.players.filter(player => player.teamId === row.teamId && player.sentOff).map(player => player.id);
      const unavailableSlotIds = team.players.filter(player => sentOffIds.includes(player.id)).map(player => player.slotId).sort();
      return {
        teamId: row.teamId,
        phase: string(row.formationPhase, 'teamState.formationPhase'),
        offsideLine: finite(row.offsideLine, 'teamState.offsideLine'),
        playerCount: 11 - unavailableSlotIds.length,
        unavailableSlotIds
      };
    });
    const cpuTeamIds = identity.controlOwnership.cpuTeamIds;
    const cpu = entries.filter(entry => cpuTeamIds.includes(entry.teamId)).map(entry => ({
      teamId: entry.teamId,
      possessionTeamId,
      carrierId: ownerId,
      offsideLine: finite(entry.offsideLine, 'teamState.offsideLine'),
      events: array(entry.cpuEvents, 'teamState.cpuEvents').map((event, index) => {
        const value = clone(record(event, 'CPU event'));
        value.id = String(value.id || ('build173-host-event:' + tick + ':' + index));
        value.type = string(value.type, 'CPU event.type');
        value.tick = tick;
        if (value.playerId != null) value.playerId = actualToStablePlayerId[String(value.playerId)] || String(value.playerId);
        return value;
      })
    }));
    return { cpu, formation };
  }

  function normalizeMovementCommands(commands, identity, tick, actualToStablePlayerId) {
    const playerIds = identity.teams.flatMap(team => team.players.map(player => player.id));
    return array(commands, 'movementCommands').map((command, index) => {
      const row = clone(record(command, 'movement command'));
      row.playerId = string(row.playerId, 'movement command.playerId');
      row.playerId = actualToStablePlayerId[row.playerId] || row.playerId;
      if (!playerIds.includes(row.playerId)) throw new Error('movement command playerId is not in the exact roster');
      if (row.targetId != null) row.targetId = actualToStablePlayerId[String(row.targetId)] || String(row.targetId);
      if (row.targetId != null && !playerIds.includes(String(row.targetId))) {
        throw new Error('movement command targetId is not in the exact roster');
      }
      row.id = String(row.id || ('build173-host-command:' + tick + ':' + index));
      row.tick = tick;
      row.type = string(row.type, 'movement command.type');
      return row;
    });
  }

  function buildObservation(input) {
    assertDependency();
    const source = record(input, 'capture observation input');
    const workflow = string(source.workflow, 'capture workflow');
    if (!OFFLINE_WORKFLOWS.includes(workflow)) throw new Error('capture workflow must be recognised and offline');
    const tick = integer(source.tick, 1, 'capture tick');
    const observation = {
      schema: HOST_SCHEMA,
      build: BUILD,
      authority: HOST_AUTHORITY,
      readOnlyCapture: true,
      online: false,
      workflow,
      tick,
      fixedTickSeconds: FIXED_TICK_SECONDS,
      epoch: {
        id: string(source.epochId, 'capture epochId'),
        stage: tick === 1 ? PRE_MATCH_STAGE : SHADOW_STAGE
      },
      contract: clone(source.contract),
      identity: {
        ballId: source.identity.ballId,
        teams: clone(source.identity.teams)
      },
      before: clone(source.before),
      after: clone(source.after),
      movementCommands: clone(source.movementCommands),
      cpu: clone(source.cpu),
      formation: clone(source.formation),
      environment: clone(source.environment)
    };
    if (source.restart) observation.restart = clone(source.restart);
    return deepFreeze(observation);
  }

  function prepareObservation(input) {
    assertDependency();
    const source = record(input, 'plain host observation input');
    const workflow = string(source.workflow, 'plain host workflow');
    const tick = integer(source.tick, 1, 'plain host tick');
    const identity = source.identity || createIdentity({
      workflow,
      teams: source.teams,
      controlOwnership: source.controlOwnership,
      ballId: source.ballId
    });
    if (identity.workflow && identity.workflow !== workflow) {
      throw new Error('plain host workflow must match the immutable identity workflow');
    }
    const contract = source.contract || createPitchContract(source.matchLengthMinutes == null ? 4 : source.matchLengthMinutes);
    const gameplaySecondsBefore = nonNegative(source.gameplaySecondsBefore == null ? 0 : source.gameplaySecondsBefore,
      'gameplaySecondsBefore');
    const before = normalizeFrame(clone(source.before), tick - 1, identity, gameplaySecondsBefore, 'before');
    const gameplayAdvance = before.frame.clock.phase === 'PLAY'
      ? FIXED_TICK_SECONDS * contract.clock.acceleration : 0;
    const after = normalizeFrame(clone(source.after), tick, identity,
      gameplaySecondsBefore + gameplayAdvance, 'after');
    const teams = normalizeTeamStates(source.teamStates, identity, after.frame, tick,
      after.metadata.actualToStablePlayerId);
    const movementCommands = normalizeMovementCommands(source.movementCommands || [], identity, tick,
      after.metadata.actualToStablePlayerId);
    const restart = mergeStagingRestart(before, after);
    return buildObservation({
      workflow,
      tick,
      epochId: source.epochId,
      contract,
      identity,
      before: before.frame,
      after: after.frame,
      movementCommands,
      cpu: teams.cpu,
      formation: teams.formation,
      restart,
      environment: {
        ...(clone(source.environment || {})),
        hostCapture: {
          schema: CAPTURE_TRACE_SCHEMA,
          readOnly: true,
          gameplayAdvanceSeconds: gameplayAdvance,
          phaseMapping: clone(PHASE_MAP),
          kickoffDefaults: { before: before.metadata.kickoffDefaults, after: after.metadata.kickoffDefaults },
          stagingPlayers: { before: before.metadata.stagingPlayers, after: after.metadata.stagingPlayers },
          actualPlayerIds: { before: before.metadata.actualPlayerIds, after: after.metadata.actualPlayerIds },
          formationAvailability: teams.formation.map(entry => ({
            teamId: entry.teamId,
            playerCount: entry.playerCount,
            unavailableSlotIds: entry.unavailableSlotIds
          }))
        }
      }
    });
  }

  function sanitizeAdapterOutput(output) {
    const source = record(output, 'live adapter output');
    if (source.readOnly !== true || source.appliedToLive !== false || source.candidateExposed !== false) {
      throw new Error('adapter handoff violated the telemetry-only no-live-writes boundary');
    }
    if (source.enabled !== true || !source.telemetry) throw new Error('adapter handoff did not accept the host observation');
    const telemetry = record(source.telemetry, 'live adapter telemetry');
    const comparison = telemetry.comparison && typeof telemetry.comparison === 'object'
      ? telemetry.comparison : {};
    const ball = comparison.ball && typeof comparison.ball === 'object' ? comparison.ball : {};
    const movement = comparison.movement && typeof comparison.movement === 'object' ? comparison.movement : {};
    const clock = comparison.clock && typeof comparison.clock === 'object' ? comparison.clock : {};
    const formation = Array.isArray(comparison.formation) ? comparison.formation : [];
    return {
      schema: ADAPTER_TELEMETRY_SCHEMA,
      tick: integer(telemetry.tick, 1, 'live adapter telemetry.tick'),
      fixedTickSeconds: positive(telemetry.fixedTickSeconds, 'live adapter telemetry.fixedTickSeconds'),
      workflow: string(telemetry.workflow, 'live adapter telemetry.workflow'),
      mappingComplete: telemetry.mappingComplete === true,
      commandDerivationCount: nonNegative(Number(telemetry.commandDerivationCount || 0),
        'live adapter telemetry.commandDerivationCount'),
      comparison: {
        ball: {
          positionErrorWorld: nonNegative(Number(ball.positionErrorWorld || 0), 'ball position error'),
          velocityErrorWorldPerFrame: nonNegative(Number(ball.velocityErrorWorldPerFrame || 0), 'ball velocity error')
        },
        movement: {
          maximumPositionError: nonNegative(Number(movement.maximumPositionError || 0), 'movement position error'),
          maximumVelocityError: nonNegative(Number(movement.maximumVelocityError || 0), 'movement velocity error'),
          ownerAgreement: movement.ownerAgreement === true,
          observedPlayerCount: integer(Number(movement.observedPlayerCount || 0), 0, 'movement observed player count')
        },
        formation: formation.map((entry, index) => ({
          index,
          observedPlayerCount: integer(Number(entry && entry.observedPlayerCount || 0), 0,
            'formation observed player count'),
          maximumTargetError: nonNegative(Number(entry && entry.maximumTargetError || 0),
            'formation maximum target error'),
          meanTargetError: nonNegative(Number(entry && entry.meanTargetError || 0),
            'formation mean target error')
        })),
        clock: {
          periodAgreement: clock.periodAgreement === true,
          phaseAgreement: clock.phaseAgreement === true,
          absoluteGameplaySecondsError: nonNegative(
            Number(clock.absoluteGameplaySecondsError || 0), 'clock gameplay seconds error')
        }
      },
      readOnly: true,
      liveWrites: false
    };
  }

  function createCaptureSession(options) {
    assertDependency();
    const source = options && typeof options === 'object' ? options : {};
    const status = resolveStatus(source);
    const workflow = status.workflow;
    const traceLimit = Math.max(1, Math.min(MAX_TRACE_RECORDS,
      source.traceLimit == null ? MAX_TRACE_RECORDS : integer(source.traceLimit, 1, 'traceLimit')));
    let identity = null;
    let contract = null;
    let adapter = null;
    if (status.enabled) {
      identity = createIdentity({
        workflow,
        teams: source.teams,
        controlOwnership: source.controlOwnership,
        ballId: source.ballId
      });
      contract = createPitchContract(source.matchLengthMinutes == null ? 4 : source.matchLengthMinutes);
      const capability = Adapter.createCapability({ workflow, acknowledgement: Adapter.ACKNOWLEDGEMENT });
      adapter = Adapter.createAdapter({
        enabled: true,
        workflow,
        capability,
        fixedTickSeconds: FIXED_TICK_SECONDS,
        seed: source.seed == null ? 173 : integer(source.seed, 1, 'seed'),
        traceLimit,
        sessionId: boundedString(String(source.sessionId || 'build173-host-capture'),
          MAX_SESSION_ID_LENGTH, 'sessionId') + ':adapter'
      });
    }
    const sessionId = boundedString(String(source.sessionId || 'build173-host-capture'),
      MAX_SESSION_ID_LENGTH, 'sessionId');
    let lifecycle = status.enabled ? 'awaiting-kickoff' : 'disabled';
    let epochId = null;
    let previousEpochId = null;
    let lastFrame = null;
    let lastActualPlayerIds = null;
    let nextTick = 1;
    let cumulativeGameplaySeconds = 0;
    let acceptedTicks = 0;
    let sequence = 0;
    const records = [];
    const recordSizes = [];

    function append(type, details) {
      let item = {
        schema: CAPTURE_TRACE_SCHEMA,
        version: VERSION,
        sessionId,
        sequence: sequence++,
        type,
        lifecycle,
        authority: HOST_AUTHORITY,
        readOnly: true,
        liveWrites: false,
        ...(clone(details) || {})
      };
      let itemBytes = utf8ByteLength(stableJson(item));
      if (itemBytes > MAX_TELEMETRY_RECORD_BYTES) {
        item = {
          schema: CAPTURE_TRACE_SCHEMA,
          version: VERSION,
          sessionId,
          sequence: item.sequence,
          type: 'capture-telemetry-truncated',
          originalType: type,
          lifecycle,
          authority: HOST_AUTHORITY,
          reason: 'record exceeded the bounded host telemetry ceiling',
          readOnly: true,
          liveWrites: false
        };
        itemBytes = utf8ByteLength(stableJson(item));
      }
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

    function result(type, details) {
      const trace = append(type, details);
      return {
        schema: CAPTURE_RESULT_SCHEMA,
        version: VERSION,
        sessionId,
        enabled: status.enabled,
        lifecycle,
        authority: HOST_AUTHORITY,
        readOnly: true,
        liveWrites: false,
        accepted: type === 'capture-accepted',
        ...(clone(details) || {}),
        trace
      };
    }

    function freezeOnError(error, stage) {
      lifecycle = 'self-frozen';
      return result('capture-self-frozen', {
        stage,
        reason: errorMessage(error),
        tick: nextTick,
        acceptedTicks
      });
    }

    function arm(preMatchSnapshot, armOptions) {
      if (!status.enabled) return result('arm-skipped', { reason: status.reason });
      if (lifecycle === 'armed') return result('arm-skipped', { reason: 'already-armed' });
      if (lifecycle === 'finished' || lifecycle === 'self-frozen') {
        return result('arm-skipped', { reason: 'reset-required', acceptedTicks });
      }
      try {
        const boundary = presentationBoundary(preMatchSnapshot);
        if (boundary === 'prelude') {
          return result('presentation-prelude-skipped', {
            reason: 'arm-only-after-actual-post-walkout-kickoff',
            acceptedTicks: 0
          });
        }
        if (boundary === 'post-match') throw new Error('cannot arm during post-match presentation');
        const armSource = armOptions && typeof armOptions === 'object' ? armOptions : {};
        const requestedEpoch = string(armSource.epochId, 'arm epochId');
        if (requestedEpoch === previousEpochId) throw new Error('reset must use a fresh match epoch id');
        const normalized = normalizeFrame(clone(preMatchSnapshot), 0, identity, 0, 'pre-match');
        const suiteReady = workflow === WORKFLOWS.SET_PIECE_SUITE &&
          preMatchSnapshot && preMatchSnapshot.freeKickPracticeReady === true &&
          ['SET_PIECE', 'DEAD_BALL'].includes(normalized.frame.clock.phase);
        const kickoffReady = normalized.frame.clock.phase === 'SET_PIECE';
        if (normalized.frame.clock.period !== 'first-half' || normalized.frame.clock.gameplaySeconds !== 0 ||
          (!kickoffReady && !suiteReady) || normalized.frame.clock.clockFrames !== 0) {
          throw new Error('first epoch must arm at the zeroed first-half on-pitch kickoff/set-piece state');
        }
        if (normalized.metadata.stagingPlayers.length) {
          throw new Error('pre-match epoch cannot arm with a player in the throw-in apron');
        }
        epochId = requestedEpoch;
        lastFrame = normalized.frame;
        lastActualPlayerIds = normalized.metadata.actualPlayerIds;
        nextTick = 1;
        cumulativeGameplaySeconds = 0;
        acceptedTicks = 0;
        lifecycle = 'armed';
        return result('capture-armed', {
          epochId,
          nextTick,
          boundaryDigest: digest(lastFrame),
          kickoffDefaults: normalized.metadata.kickoffDefaults,
          anchor: suiteReady ? 'set-piece-suite-ready' : 'post-walkout-kickoff'
        });
      } catch (error) {
        return freezeOnError(error, 'arm');
      }
    }

    function captureTick(input) {
      if (!status.enabled) return result('capture-skipped', { reason: status.reason });
      if (lifecycle !== 'armed') return result('capture-skipped', { reason: 'capture-not-armed', acceptedTicks });
      const capture = input && typeof input === 'object' ? input : {};
      try {
        if (presentationBoundary(capture.before) === 'prelude' || presentationBoundary(capture.after) === 'prelude') {
          throw new Error('walkout presentation cannot enter an armed shadow epoch');
        }
        if (presentationBoundary(capture.before) === 'post-match' || presentationBoundary(capture.after) === 'post-match') {
          throw new Error('finish capture before full-time walk-in/presentation staging begins');
        }
        const update = record(capture.update, 'capture update metadata');
        const hostUpdateSequence = integer(update.hostUpdateSequence, 1, 'hostUpdateSequence');
        if (hostUpdateSequence !== nextTick) throw new Error('every Build 173 update call must produce exactly one sequential capture tick');
        integer(update.renderFrameSequence, 0, 'renderFrameSequence');
        const simulationStepIndex = integer(update.simulationStepIndex, 0, 'simulationStepIndex');
        const simulationStepsPerRender = integer(update.simulationStepsPerRender, 1, 'simulationStepsPerRender');
        if (simulationStepIndex >= simulationStepsPerRender) throw new Error('simulationStepIndex must be inside simulationStepsPerRender');

        const before = normalizeFrame(clone(capture.before), nextTick - 1, identity,
          cumulativeGameplaySeconds, 'before');
        if (stableJson(before.frame) !== stableJson(lastFrame)) {
          throw new Error('capture before frame must exactly equal the previous accepted after boundary');
        }
        if (stableJson(before.metadata.actualPlayerIds) !== stableJson(lastActualPlayerIds)) {
          throw new Error('capture actual player identities changed between ticks without an in-tick substitution record');
        }
        const gameplayAdvance = before.frame.clock.phase === 'PLAY'
          ? FIXED_TICK_SECONDS * contract.clock.acceleration : 0;
        const afterGameplaySeconds = cumulativeGameplaySeconds + gameplayAdvance;
        const after = normalizeFrame(clone(capture.after), nextTick, identity,
          afterGameplaySeconds, 'after');
        const actualChanges = Object.keys(after.metadata.actualPlayerIds).filter(stableId =>
          before.metadata.actualPlayerIds[stableId] !== after.metadata.actualPlayerIds[stableId]);
        const substitutions = array(capture.substitutions || [], 'substitutions').map(substitution => {
          const row = record(substitution, 'substitution');
          const teamId = string(row.teamId, 'substitution.teamId');
          const slotId = string(row.slotId, 'substitution.slotId');
          const declared = identity.teams.find(team => team.id === teamId);
          const slot = declared && declared.players.find(player => player.slotId === slotId);
          if (!slot) throw new Error('substitution must target an exact stable on-pitch slot');
          return {
            teamId,
            slotId,
            stablePlayerId: slot.id,
            outPlayerId: string(row.outPlayerId, 'substitution.outPlayerId'),
            inPlayerId: string(row.inPlayerId, 'substitution.inPlayerId')
          };
        });
        exactSet(substitutions.map(row => row.stablePlayerId), actualChanges, 'substitution changed stable slots');
        substitutions.forEach(row => {
          if (before.metadata.actualPlayerIds[row.stablePlayerId] !== row.outPlayerId ||
            after.metadata.actualPlayerIds[row.stablePlayerId] !== row.inPlayerId) {
            throw new Error('substitution actual player identities must exactly match the stable-slot transition');
          }
        });
        const teams = normalizeTeamStates(capture.teamStates, identity, after.frame, nextTick,
          after.metadata.actualToStablePlayerId);
        const movementCommands = normalizeMovementCommands(capture.movementCommands, identity, nextTick,
          after.metadata.actualToStablePlayerId);
        const restart = mergeStagingRestart(before, after);
        const environment = {
          ...(clone(capture.environment || {})),
          hostCapture: {
            schema: CAPTURE_TRACE_SCHEMA,
            readOnly: true,
            update: {
              hostUpdateSequence,
              renderFrameSequence: update.renderFrameSequence,
              simulationStepIndex,
              simulationStepsPerRender,
              oneCapturePerUpdateCall: true
            },
            phaseMapping: clone(PHASE_MAP),
            gameplayAdvanceSeconds: gameplayAdvance,
            kickoffDefaults: {
              before: before.metadata.kickoffDefaults,
              after: after.metadata.kickoffDefaults
            },
            stagingPlayers: {
              before: before.metadata.stagingPlayers,
              after: after.metadata.stagingPlayers
            },
            actualPlayerIds: {
              before: before.metadata.actualPlayerIds,
              after: after.metadata.actualPlayerIds
            },
            substitutions,
            formationAvailability: teams.formation.map(entry => ({
              teamId: entry.teamId,
              playerCount: entry.playerCount,
              unavailableSlotIds: entry.unavailableSlotIds
            }))
          }
        };
        const observation = buildObservation({
          workflow,
          tick: nextTick,
          epochId,
          contract,
          identity,
          before: before.frame,
          after: after.frame,
          movementCommands,
          cpu: teams.cpu,
          formation: teams.formation,
          restart,
          environment
        });
        const adapterOutput = adapter.observe(observation);
        const telemetry = sanitizeAdapterOutput(adapterOutput);
        lastFrame = after.frame;
        lastActualPlayerIds = after.metadata.actualPlayerIds;
        cumulativeGameplaySeconds = afterGameplaySeconds;
        acceptedTicks += 1;
        nextTick += 1;
        return result('capture-accepted', {
          tick: observation.tick,
          epochId,
          observationSchema: observation.schema,
          observationDigest: digest(observation),
          gameplaySeconds: cumulativeGameplaySeconds,
          clockFrames: observation.after.clock.clockFrames,
          phase: observation.after.clock.phase,
          stagingPlayerCount: after.metadata.stagingPlayers.length,
          movementCommandCount: movementCommands.length,
          cpuTeamCount: teams.cpu.length,
          formationTeamCount: teams.formation.length,
          adapterTelemetry: telemetry
        });
      } catch (error) {
        return freezeOnError(error, 'capture');
      }
    }

    function finish(reason) {
      if (!status.enabled) return result('finish-skipped', { reason: status.reason });
      if (lifecycle === 'finished') return result('finish-skipped', { reason: 'already-finished', acceptedTicks });
      if (lifecycle === 'self-frozen') return result('finish-skipped', { reason: 'self-frozen', acceptedTicks });
      lifecycle = 'finished';
      return result('capture-finished', {
        reason: String(reason || 'full-time-before-presentation-staging').slice(0, MAX_ERROR_MESSAGE_LENGTH),
        acceptedTicks,
        gameplaySeconds: cumulativeGameplaySeconds,
        epochId
      });
    }

    function reset() {
      previousEpochId = epochId || previousEpochId;
      epochId = null;
      lastFrame = null;
      lastActualPlayerIds = null;
      nextTick = 1;
      cumulativeGameplaySeconds = 0;
      acceptedTicks = 0;
      lifecycle = status.enabled ? 'awaiting-kickoff' : 'disabled';
      sequence = 0;
      records.length = 0;
      recordSizes.length = 0;
      if (adapter) adapter.reset();
      return {
        schema: CAPTURE_RESULT_SCHEMA,
        version: VERSION,
        lifecycle,
        authority: HOST_AUTHORITY,
        readOnly: true,
        liveWrites: false,
        reset: true
      };
    }

    function exportTelemetry() {
      const exported = {
        schema: CAPTURE_TRACE_SCHEMA + '-export',
        version: VERSION,
        sessionId,
        status: clone(status),
        lifecycle,
        epochId,
        nextTick,
        acceptedTicks,
        cumulativeGameplaySeconds,
        traceLimit,
        recordCount: records.length,
        records: clone(records),
        readOnly: true,
        liveWrites: false
      };
      if (utf8ByteLength(stableJson(exported)) > MAX_TELEMETRY_EXPORT_BYTES) {
        throw new RangeError('host capture telemetry export exceeds the byte ceiling');
      }
      return exported;
    }

    return Object.freeze({
      status,
      sessionId,
      arm,
      captureTick,
      finish,
      reset,
      exportTelemetry,
      stableTelemetryJson() { return stableJson(exportTelemetry()); }
    });
  }

  return Object.freeze({
    VERSION,
    ACKNOWLEDGEMENT,
    CAPTURE_RESULT_SCHEMA,
    CAPTURE_TRACE_SCHEMA,
    ADAPTER_TELEMETRY_SCHEMA,
    HOST_SCHEMA,
    HOST_CONTRACT_SCHEMA,
    HOST_AUTHORITY,
    BUILD,
    FIXED_TICK_SECONDS,
    MAX_TRACE_RECORDS,
    MAX_SESSION_ID_LENGTH,
    MAX_TELEMETRY_RECORD_BYTES,
    MAX_TELEMETRY_EXPORT_BYTES,
    PRE_MATCH_STAGE,
    SHADOW_STAGE,
    WORKFLOWS,
    OFFLINE_WORKFLOWS,
    BUILD173_WORLD,
    PHASE_MAP,
    POSITION_FAMILIES,
    WORKFLOW_OWNERSHIP,
    positionFamily,
    phaseFromHostClock,
    presentationBoundary,
    resolveStatus,
    createPitchContract,
    createIdentity,
    buildObservation,
    prepareObservation,
    createCaptureSession,
    stableJson,
    digest
  });
});
