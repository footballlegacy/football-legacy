export const BUILD173_WORLD = Object.freeze({
  width: 3344,
  height: 2142,
  goalLineMargin: 84
});

export const BUILD173_PITCH = Object.freeze({
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
});

export const BUILD173_MARKINGS = Object.freeze({
  xMin: 84,
  xMax: 3260,
  yMin: 6,
  yMax: 2136
});

export const BUILD173_THROW_IN_APRON = Object.freeze({
  xMin: 84,
  xMax: 3260,
  yMin: -26,
  yMax: 2168,
  exception: 'declared-held-throw-in-taker-only'
});

export const OFFLINE_WORKFLOWS = Object.freeze([
  'set-piece-suite',
  'single-player',
  'quick-play',
  'local-two-player',
  'home-coop',
  'cpu-v-cpu'
]);

export const HOME_LINEUP = Object.freeze([
  Object.freeze(['GK', 'GK', 180, 1071, 'ars-lehmann']),
  Object.freeze(['LB', 'LB', 700, 1825, 'ars-cole']),
  Object.freeze(['LCB', 'CB', 640, 1285, 'ars-campbell']),
  Object.freeze(['RCB', 'CB', 640, 855, 'ars-toure']),
  Object.freeze(['RB', 'RB', 700, 315, 'ars-lauren']),
  Object.freeze(['LM', 'LM', 1370, 1810, 'ars-pires']),
  Object.freeze(['LCM', 'CM', 1320, 1290, 'ars-vieira']),
  Object.freeze(['RCM', 'CM', 1320, 852, 'ars-gilberto']),
  Object.freeze(['RM', 'RM', 1370, 332, 'ars-ljungberg']),
  Object.freeze(['LST', 'ST', 1530, 1235, 'ars-henry']),
  Object.freeze(['RST', 'ST', 1530, 907, 'ars-bergkamp'])
]);

export const AWAY_LINEUP = Object.freeze([
  Object.freeze(['GK', 'GK', 3160, 1071, 'che-courtois']),
  Object.freeze(['LCB', 'CB', 2740, 1530, 'che-cahill']),
  Object.freeze(['CB', 'CB', 2780, 1071, 'che-luiz']),
  Object.freeze(['RCB', 'CB', 2740, 612, 'che-azpilicueta']),
  Object.freeze(['LWB', 'LWB', 2320, 1890, 'che-alonso']),
  Object.freeze(['LCM', 'CM', 2280, 1280, 'che-matic']),
  Object.freeze(['RCM', 'CM', 2280, 862, 'che-kante']),
  Object.freeze(['RWB', 'RWB', 2320, 252, 'che-moses']),
  Object.freeze(['LW', 'LW', 1880, 1700, 'che-hazard']),
  Object.freeze(['ST', 'ST', 1672, 1071, 'che-costa']),
  Object.freeze(['RW', 'RW', 1880, 442, 'che-pedro'])
]);

const PHASE_CLOCKS = Object.freeze({
  SET_PIECE: Object.freeze({
    matchPhase: 'play',
    paused: false,
    setPieceActive: true,
    kickoffHeld: true,
    restartKind: 'KICK OFF',
    deadBall: false,
    offsidePresentation: false,
    celebrationActive: false,
    replayActive: false,
    clockRunning: false,
    reason: 'pre-match-kickoff-held'
  }),
  PLAY: Object.freeze({
    matchPhase: 'play',
    paused: false,
    setPieceActive: false,
    kickoffHeld: false,
    restartKind: '',
    deadBall: false,
    offsidePresentation: false,
    celebrationActive: false,
    replayActive: false,
    clockRunning: true,
    reason: 'ball-live'
  }),
  DEAD_BALL: Object.freeze({
    matchPhase: 'play',
    paused: false,
    setPieceActive: false,
    kickoffHeld: false,
    restartKind: '',
    deadBall: true,
    offsidePresentation: false,
    celebrationActive: false,
    replayActive: false,
    clockRunning: false,
    reason: 'ball-dead'
  }),
  PAUSED: Object.freeze({
    matchPhase: 'play',
    paused: true,
    setPieceActive: false,
    kickoffHeld: false,
    restartKind: '',
    deadBall: false,
    offsidePresentation: false,
    celebrationActive: false,
    replayActive: false,
    clockRunning: false,
    reason: 'pause-menu'
  })
});

export function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).map(key => [key, clone(value[key])]));
}

export function stablePlayerId(teamId, slotId) {
  return `slot:${teamId}:${slotId}`;
}

export function actualPlayerId(teamId, slotId) {
  const rows = teamId === 'you' ? HOME_LINEUP : AWAY_LINEUP;
  const row = rows.find(entry => entry[0] === slotId);
  if (!row) throw new Error(`unknown ${teamId} slot ${slotId}`);
  return row[4];
}

function role(position) {
  if (position === 'GK') return 'gk';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 'def';
  if (['ST', 'LW', 'RW'].includes(position)) return 'fwd';
  return 'mid';
}

function attributes(index, position) {
  const goalkeeper = position === 'GK';
  const forward = ['ST', 'LW', 'RW'].includes(position);
  return {
    pace: goalkeeper ? 48 : 78 + (index % 8),
    accel: goalkeeper ? 50 : 77 + (index % 9),
    agility: goalkeeper ? 67 : 75 + (index % 10),
    balance: 74 + (index % 8),
    strength: goalkeeper ? 82 : 76 + (index % 10),
    stamina: goalkeeper ? 72 : 82 + (index % 9),
    defend: goalkeeper ? 48 : forward ? 43 : 76 + (index % 15),
    aggression: goalkeeper ? 45 : 72 + (index % 17),
    control: goalkeeper ? 65 : 80 + (index % 12),
    pass: goalkeeper ? 70 : 78 + (index % 14),
    shoot: goalkeeper ? 22 : forward ? 87 + (index % 10) : 68 + (index % 17),
    awareness: goalkeeper ? 90 : 81 + (index % 15)
  };
}

function identityTeam(id, candidateId, formation, attackingDirection, rows) {
  return {
    id,
    candidateId,
    formation,
    attackingDirection,
    players: rows.map(([slotId, position, , , occupantId], index) => ({
      id: stablePlayerId(id, slotId),
      actualPlayerId: occupantId,
      candidateId: `${candidateId}-${String(index + 1).padStart(2, '0')}`,
      slotId,
      position
    }))
  };
}

export function teams() {
  return [
    identityTeam('you', 'home', '4-4-2', 1, HOME_LINEUP),
    identityTeam('opp', 'away', '3-4-3', -1, AWAY_LINEUP)
  ];
}

export function controlOwnership(workflow) {
  switch (workflow) {
    case 'set-piece-suite':
    case 'single-player':
    case 'quick-play':
      return {
        participants: [{ id: 'player-one', inputSlot: 'controller-one', teamId: 'you' }],
        cpuTeamIds: ['opp']
      };
    case 'local-two-player':
      return {
        participants: [
          { id: 'player-one', inputSlot: 'controller-one', teamId: 'you' },
          { id: 'player-two', inputSlot: 'controller-two', teamId: 'opp' }
        ],
        cpuTeamIds: []
      };
    case 'home-coop':
      return {
        participants: [
          { id: 'player-one', inputSlot: 'controller-one', teamId: 'you' },
          { id: 'player-two', inputSlot: 'controller-two', teamId: 'you' }
        ],
        cpuTeamIds: ['opp']
      };
    case 'cpu-v-cpu':
      return { participants: [], cpuTeamIds: ['you', 'opp'] };
    default:
      throw new Error(`unsupported fixture workflow ${workflow}`);
  }
}

export function captureOptions(workflow = 'quick-play', overrides = {}) {
  return {
    enabled: true,
    acknowledgement: 'EXPLICIT_BUILD_173_PLAIN_CAPTURE_WITH_NO_LIVE_WRITES',
    workflow,
    teams: teams(),
    controlOwnership: controlOwnership(workflow),
    ballId: 'match-ball',
    matchLengthMinutes: 4,
    seed: 173,
    traceLimit: 16,
    sessionId: `build173-capture-${workflow}`,
    ...clone(overrides)
  };
}

function runtimeTeam(id, rows, options) {
  const attackingDirection = id === 'you' ? 1 : -1;
  const replacements = options.actualPlayerIds || {};
  const sentOff = new Set(options.sentOffStableIds || []);
  return rows.map(([slotId, position, x, y, occupantId], index) => {
    const stableId = stablePlayerId(id, slotId);
    return {
      id: replacements[stableId] || occupantId,
      actualPlayerId: replacements[stableId] || occupantId,
      teamId: id,
      slotId,
      x,
      y,
      vx: 0,
      vy: 0,
      fx: attackingDirection,
      fy: 0,
      homeX: x,
      homeY: y,
      role: role(position),
      position,
      attrs: attributes(index + (id === 'you' ? 0 : 11), position),
      stamina: 100,
      sentOff: sentOff.has(stableId),
      locomotionState: options.locomotionState || 'idle'
    };
  });
}

function clock(options) {
  const phase = options.phase || 'SET_PIECE';
  const source = PHASE_CLOCKS[phase];
  if (!source) throw new Error(`unsupported fixture phase ${phase}`);
  return {
    ...clone(source),
    period: options.period || 'first-half',
    clockFrames: options.clockFrames == null ? 0 : options.clockFrames,
    ...(options.clock || {})
  };
}

function ball(options) {
  const kickoffOptional = options.kickoffOptional === true;
  const value = {
    id: 'match-ball',
    x: 1672,
    y: 1071,
    vx: 0,
    vy: 0,
    ownerId: options.ownerId === undefined ? actualPlayerId('opp', 'ST') : options.ownerId
  };
  if (!kickoffOptional) Object.assign(value, {
    z: 0,
    zv: 0,
    spin: 0,
    dip: 0,
    curveAccel: 0,
    flightType: 'ground'
  });
  return { ...value, ...(options.ball || {}) };
}

export function snapshot(overrides = {}) {
  const options = clone(overrides);
  const players = runtimeTeam('you', HOME_LINEUP, options)
    .concat(runtimeTeam('opp', AWAY_LINEUP, options));
  if (options.throwIn) {
    const teamId = options.throwIn.teamId || 'you';
    const slotId = options.throwIn.slotId || 'RB';
    const stableId = stablePlayerId(teamId, slotId);
    const taker = players.find(player => player.teamId === teamId && player.slotId === slotId);
    taker.x = options.throwIn.x == null ? 1672 : options.throwIn.x;
    taker.y = options.throwIn.y;
    options.restart = {
      kind: 'THROW IN',
      held: true,
      takerId: options.throwIn.takerId || taker.actualPlayerId
    };
    options.clock = {
      ...(options.clock || {}),
      setPieceActive: true,
      kickoffHeld: false,
      restartKind: 'THROW IN',
      clockRunning: false,
      reason: 'held-throw-in'
    };
    options.phase = 'SET_PIECE';
    options.ownerId = taker.actualPlayerId;
    options.throwInStableId = stableId;
  }
  if (typeof options.mutatePlayers === 'function') options.mutatePlayers(players);
  const value = {
    players,
    ball: ball(options),
    clock: clock(options),
    restart: options.restart || { kind: '', held: false, takerId: null }
  };
  if (options.presentationPrelude === true) value.presentationPrelude = true;
  if (options.postMatchPresentation === true) value.postMatchPresentation = true;
  return value;
}

export function walkoutSnapshot() {
  return snapshot({
    presentationPrelude: true,
    clock: {
      matchPhase: 'walkout',
      setPieceActive: false,
      kickoffHeld: false,
      restartKind: '',
      reason: 'walkout-tunnel'
    },
    mutatePlayers(players) {
      players.forEach((player, index) => { player.y = 2142 + 205 + index * 29; });
    }
  });
}

export function walkinSnapshot() {
  return snapshot({
    postMatchPresentation: true,
    period: 'full-time',
    clock: {
      matchPhase: 'walkin',
      setPieceActive: false,
      kickoffHeld: false,
      restartKind: '',
      reason: 'full-time-walkin'
    },
    mutatePlayers(players) {
      players.forEach((player, index) => { player.y = 2142 + 50 + index * 9; });
    }
  });
}

export function teamStates(overrides = {}) {
  const events = overrides.events || {};
  return [
    {
      teamId: 'you',
      formationPhase: overrides.homePhase || 'buildup',
      offsideLine: overrides.homeOffsideLine == null ? 2560 : overrides.homeOffsideLine,
      cpuEvents: clone(events.you || [])
    },
    {
      teamId: 'opp',
      formationPhase: overrides.awayPhase || 'buildup',
      offsideLine: overrides.awayOffsideLine == null ? 720 : overrides.awayOffsideLine,
      cpuEvents: clone(events.opp || [])
    }
  ];
}

export function captureTickInput(before, after, overrides = {}) {
  const sequence = overrides.sequence == null ? 1 : overrides.sequence;
  return {
    before: clone(before),
    after: clone(after),
    movementCommands: clone(overrides.movementCommands || []),
    teamStates: clone(overrides.teamStates || teamStates()),
    substitutions: clone(overrides.substitutions || []),
    environment: clone(overrides.environment || { weather: 'night-clear' }),
    update: {
      hostUpdateSequence: sequence,
      renderFrameSequence: overrides.renderFrameSequence == null ? sequence : overrides.renderFrameSequence,
      simulationStepIndex: overrides.simulationStepIndex == null ? 0 : overrides.simulationStepIndex,
      simulationStepsPerRender: overrides.simulationStepsPerRender == null ? 1 : overrides.simulationStepsPerRender
    }
  };
}

export function observationInput(overrides = {}) {
  const workflow = overrides.workflow || 'quick-play';
  const before = overrides.before || snapshot({ kickoffOptional: true });
  const after = overrides.after || snapshot({ kickoffOptional: true });
  return {
    workflow,
    tick: overrides.tick == null ? 1 : overrides.tick,
    epochId: overrides.epochId || 'fixture-epoch-001',
    teams: teams(),
    controlOwnership: controlOwnership(workflow),
    ballId: 'match-ball',
    matchLengthMinutes: overrides.matchLengthMinutes == null ? 4 : overrides.matchLengthMinutes,
    gameplaySecondsBefore: overrides.gameplaySecondsBefore == null ? 0 : overrides.gameplaySecondsBefore,
    before: clone(before),
    after: clone(after),
    movementCommands: clone(overrides.movementCommands || []),
    teamStates: clone(overrides.teamStates || teamStates()),
    environment: clone(overrides.environment || {})
  };
}
