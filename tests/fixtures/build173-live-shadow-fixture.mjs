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

export const BUILD173_WORLD = Object.freeze({
  width: 3344,
  height: 2142,
  goalLineMargin: 84
});

export const BUILD173_THROW_IN_APRON = Object.freeze({
  xMin: 84,
  xMax: 3260,
  yMin: -26,
  yMax: 2168,
  exception: 'declared-held-throw-in-taker-only'
});

const HOME_LINEUP = Object.freeze([
  ['GK', 'GK', 180, 1071],
  ['LB', 'LB', 700, 1825],
  ['LCB', 'CB', 640, 1285],
  ['RCB', 'CB', 640, 855],
  ['RB', 'RB', 700, 315],
  ['LM', 'LM', 1370, 1810],
  ['LCM', 'CM', 1320, 1290],
  ['RCM', 'CM', 1320, 852],
  ['RM', 'RM', 1370, 332],
  ['LST', 'ST', 1530, 1235],
  ['RST', 'ST', 1530, 907]
]);

const AWAY_LINEUP = Object.freeze([
  ['GK', 'GK', 3160, 1071],
  ['LCB', 'CB', 2740, 1530],
  ['CB', 'CB', 2780, 1071],
  ['RCB', 'CB', 2740, 612],
  ['LWB', 'LWB', 2320, 1890],
  ['LCM', 'CM', 2280, 1280],
  ['RCM', 'CM', 2280, 862],
  ['RWB', 'RWB', 2320, 252],
  ['LW', 'LW', 1880, 1700],
  ['ST', 'ST', 1672, 1071],
  ['RW', 'RW', 1880, 442]
]);

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).map(key => [key, clone(value[key])]));
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

function identityTeam(id, candidateId, formation, attackingDirection, control, rows) {
  return {
    id,
    candidateId,
    formation,
    attackingDirection,
    control,
    players: rows.map(([slotId, position], index) => ({
      id: `${id}-${slotId}`,
      candidateId: `${candidateId}-${String(index + 1).padStart(2, '0')}`,
      slotId,
      position
    }))
  };
}

function runtimeTeam(id, rows, tick) {
  const attackingDirection = id === 'you' ? 1 : -1;
  return rows.map(([slotId, position, x, y], index) => ({
    id: `${id}-${slotId}`,
    teamId: id,
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
    sentOff: false,
    locomotionState: tick === 0 ? 'idle' : 'walk'
  }));
}

function frame(tick) {
  return {
    tick,
    players: runtimeTeam('you', HOME_LINEUP, tick).concat(runtimeTeam('opp', AWAY_LINEUP, tick)),
    ball: {
      id: 'match-ball',
      x: 1672,
      y: 1071,
      z: 0,
      vx: 0,
      vy: 0,
      zv: 0,
      spin: 0,
      dip: 0,
      curveAccel: 0,
      ownerId: 'opp-ST',
      flightType: 'ground'
    },
    clock: {
      phase: 'SET_PIECE',
      period: 'first-half',
      ballLive: false,
      clockFrames: 0,
      gameplaySeconds: 0,
      reason: 'pre-match-kickoff-held'
    }
  };
}

export function build173Observation(tick = 1, mutate) {
  const observation = {
    schema: 'football-legacy-build173-host-observation-v2',
    build: 173,
    authority: 'build-173-legacy',
    readOnlyCapture: true,
    online: false,
    workflow: 'quick-play',
    tick,
    fixedTickSeconds: 1 / 60,
    epoch: {
      id: 'build173-fixture-match-001',
      stage: tick === 1 ? 'pre-match' : 'match-shadow'
    },
    contract: {
      schema: 'football-legacy-build173-host-contract-v2',
      authority: 'build-173-legacy',
      readOnly: true,
      world: clone(BUILD173_WORLD),
      pitch: clone(BUILD173_PITCH),
      staging: { throwInApron: clone(BUILD173_THROW_IN_APRON) },
      clock: {
        source: 'simulation-time-only',
        matchLengthMinutes: 4,
        acceleration: 22.5,
        phaseMap: {
          PLAY: 'live',
          DEAD_BALL: 'dead-ball',
          SET_PIECE: 'set-piece',
          PAUSED: 'paused'
        }
      }
    },
    identity: {
      ballId: 'match-ball',
      teams: [
        identityTeam('you', 'home', '4-4-2', 1, 'human', HOME_LINEUP),
        identityTeam('opp', 'away', '3-4-3', -1, 'cpu', AWAY_LINEUP)
      ]
    },
    before: frame(tick - 1),
    after: frame(tick),
    movementCommands: [],
    cpu: [{
      teamId: 'opp',
      possessionTeamId: 'opp',
      carrierId: 'opp-ST',
      offsideLine: 720,
      events: []
    }],
    formation: [
      { teamId: 'you', phase: 'buildup', offsideLine: 2560 },
      { teamId: 'opp', phase: 'buildup', offsideLine: 720 }
    ],
    environment: {}
  };
  const result = clone(observation);
  if (typeof mutate === 'function') mutate(result);
  return result;
}
