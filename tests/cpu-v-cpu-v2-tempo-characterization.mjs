import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

const require = createRequire(import.meta.url);
const Adapter = require('../match-engine/live-v2-authority-adapter.js');
const Ball = require('../match-engine/ball-engine-v2.js');
const Movement = require('../match-engine/movement-engine-v2.js');
const CPU = require('../match-engine/cpu-intelligence-v2.js');
const Formation = require('../match-engine/formation-behaviour-v2.js');
const Contact = require('../match-engine/live-v2-contact-authority-composer.js');
const Dribbling = require('../match-engine/dribbling-state-v2.js');

const dependencies = {
  ball: Ball,
  movement: Movement,
  cpu: CPU,
  formation: Formation,
  contact: Contact,
  dribbling: Dribbling
};
const SEEDS = Object.freeze([173, 442, 1967, 2004, 2014, 2017, 3434, 7331]);
const TICKS_PER_SAMPLE = 1800;
const REQUESTED_SEEDS = String(process.env.FL_CPU_V2_SEEDS || '').split(',')
  .map(value => Number(value.trim()))
  .filter(value => Number.isInteger(value) && value > 0)
  .map(value => value >>> 0);
const REQUESTED_SEED = Number(process.env.FL_CPU_V2_SEED);
const REQUESTED_TICKS = Number(process.env.FL_CPU_V2_TICKS);
const ACTIVE_SEEDS = REQUESTED_SEEDS.length
  ? Object.freeze([...new Set(REQUESTED_SEEDS)])
  : Number.isInteger(REQUESTED_SEED) && REQUESTED_SEED > 0
  ? Object.freeze([REQUESTED_SEED >>> 0])
  : SEEDS;
const ACTIVE_TICKS_PER_SAMPLE = Number.isInteger(REQUESTED_TICKS) && REQUESTED_TICKS > 0
  ? REQUESTED_TICKS
  : TICKS_PER_SAMPLE;
const FOOTBALL_BASELINE_PROFILE = process.env.FL_CPU_V2_FOOTBALL_BASELINE === '1';
const TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY = FOOTBALL_BASELINE_PROFILE
  ? false
  : process.env.FL_CPU_V2_TF_PHYSICAL !== '0';
const CPU_PASS_RACE_FILTER = FOOTBALL_BASELINE_PROFILE
  ? false
  : process.env.FL_CPU_V2_PASS_RACE !== '0';
const ENFORCE_FOOTBALL_GATES = process.env.FL_CPU_V2_ENFORCE_FOOTBALL_GATES === '1';
const HOST = Object.freeze({
  xMin: 84,
  xMax: 3260,
  yMin: 0,
  yMax: 2142,
  xPerMetre: (3260 - 84) / 105,
  yPerMetre: 2142 / 68,
  zPerMetre: (2142 - 12) / 68
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}

function digest(value) {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function adapterOperationalState(attachment) {
  const state = structuredClone(attachment.exportState());
  delete state.checksum;
  delete state.attachmentGeneration;
  return state;
}

function firstDifferences(left, right, path = '', output = []) {
  if (output.length >= 12) return output;
  if (Object.is(left, right)) return output;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    output.push({ path, left, right });
    return output;
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const key of keys) firstDifferences(left[key], right[key], path ? `${path}.${key}` : key, output);
  return output;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))];
}

function rounded(value, places = 3) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function teamContract(id, formation, phase, attackingDirection, philosophy) {
  const lineup = Formation.canonicalLineup(formation).map(row => ({
    id: `${id}-${row.slotId}`,
    slotId: row.slotId,
    position: row.position
  }));
  return {
    id,
    formation,
    phase,
    philosophy,
    attackingDirection,
    offsideLine: attackingDirection === 1 ? HOST.xMin + 82 * HOST.xPerMetre : HOST.xMin + 23 * HOST.xPerMetre,
    tactics: { width: 1, depth: 1, compactness: 1 },
    lineup
  };
}

function buildInitialSnapshot() {
  const teams = [
    teamContract('you', '4-4-2', 'settled-attack', 1, 'invincibles-442'),
    teamContract('opp', '3-4-3', 'defend', -1, 'conte-343')
  ];
  const players = [];
  for (const team of teams) {
    const shape = Formation.resolve({
      formation: team.formation,
      phase: team.phase,
      tick: 1,
      lineup: team.lineup,
      philosophy: team.philosophy,
      pitch: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
      attackingDirection: team.attackingDirection,
      offsideLine: team.attackingDirection === 1 ? 82 : 23,
      tactics: team.tactics
    });
    for (const target of shape.targets) {
      const profile = team.lineup.find(row => row.id === target.playerId);
      const elite = ['LST', 'RST', 'LW', 'ST', 'RW'].includes(profile.slotId);
      players.push({
        id: target.playerId,
        teamId: team.id,
        role: profile.position,
        position: profile.position,
        slotId: profile.slotId,
        x: HOST.xMin + target.target.x * HOST.xPerMetre,
        y: (target.target.y + 34) * HOST.yPerMetre,
        vx: 0,
        vy: 0,
        fx: team.attackingDirection,
        fy: 0,
        radius: 12.75,
        heightM: profile.position === 'GK' ? 1.91 : elite ? 1.83 : 1.80,
        stamina: 100,
        attrs: {
          pace: elite ? 89 : 81,
          accel: elite ? 88 : 81,
          agility: elite ? 87 : 80,
          balance: 82,
          strength: 80,
          stamina: 86,
          awareness: elite ? 90 : 84,
          reactions: elite ? 93 : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(profile.position) ? 88 : 85,
          pass: elite ? 88 : 85,
          shoot: elite ? 90 : 72,
          control: elite ? 90 : 85,
          technique: elite ? 90 : 85,
          defend: ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(profile.position) ? 88 : 68,
          aggression: 78
        },
        isGK: profile.position === 'GK',
        sentOff: false,
        contactEligible: true,
        tackleActive: false,
        shoulderActive: false,
        control: null,
        contactLockUntil: 0
      });
    }
  }
  const owner = players.find(player => player.id === 'you-LST');
  return {
    tick: 0,
    fixedTickSeconds: 1 / 60,
    pitch: { xMin: HOST.xMin, xMax: HOST.xMax, yMin: HOST.yMin, yMax: HOST.yMax },
    units: { xPerMetre: HOST.xPerMetre, yPerMetre: HOST.yPerMetre, zPerMetre: HOST.zPerMetre },
    players,
    humanPlayerIds: [],
    ball: {
      id: 'cpu-v-cpu-probe-ball',
      x: owner.x + owner.fx * 0.64 * HOST.xPerMetre,
      y: owner.y,
      z: 0,
      vx: 0,
      vy: 0,
      zv: 0,
      spin: 0,
      dip: 0,
      ownerId: owner.id,
      targetId: null,
      lastKickerId: null,
      flightType: 'controlled',
      launchIntent: null
    },
    contact: {
      intendedReceiverId: null,
      firstTouchIntent: null,
      aerialIntent: null,
      gate: {
        livePlay: true,
        restartActive: false,
        replayActive: false,
        keeperAuthority: false,
        offsideInvolvementPending: false,
        specialActionAuthority: false
      }
    },
    dribbling: { surface: 'dry', actionIntent: null },
    teams
  };
}

function capability() {
  return Adapter.createCapability({
    acknowledgement: Adapter.ACKNOWLEDGEMENT,
    workflow: 'cpu-v-cpu',
    online: false,
    onlineMarkers: {},
    controlOwnership: { humanPlayerIds: [], cpuTeamIds: ['you', 'opp'] }
  });
}

function contactCapability() {
  return Contact.createCapability({
    enabled: true,
    online: false,
    workflow: 'cpu-v-cpu',
    parentAdapterVersion: Contact.PARENT_VERSION,
    parentGrant: 'offline-normal-match-live-authority',
    acknowledgement: Contact.ACKNOWLEDGEMENT
  });
}

function bodyReactionScenario({
  tick = 20,
  releaseTick = 20,
  actorId = 'bystander',
  actorTeamId = 'you',
  actorX = 52.5,
  actorY = 0,
  actorReactions = 1,
  intendedReceiverId = 'target',
  sourceX = 70,
  sourceReactions = 1,
  sourceContactEligible = false
} = {}) {
  const movementPlayer = (id, teamId, x, y, reactions) => ({
    id,
    teamId,
    role: 'CM',
    position: { x, y },
    velocity: { x: 0, y: 0 },
    facing: { x: teamId === 'you' ? -1 : 1, y: 0 },
    radius: 0.36,
    attributes: {
      pace: 78,
      acceleration: 78,
      agility: 82,
      balance: 82,
      strength: 75,
      stamina: 80,
      defending: 68,
      aggression: 70,
      control: 94,
      reactions
    }
  });
  const source = movementPlayer('source', 'you', sourceX, 0, sourceReactions);
  const actor = movementPlayer(actorId, actorTeamId, actorX, actorY, actorReactions);
  const target = movementPlayer('target', 'you', 31.5, 8, 80);
  const defender = movementPlayer('defender', 'opp', 85, -12, 80);
  const players = [source, actor, target, defender];
  const movementWorld = Movement.createWorldState({
    tick,
    fixedTickSeconds: 1 / 60,
    bounds: { xMin: 0, xMax: 105, yMin: -34, yMax: 34 },
    ballOwnerId: null,
    players
  });
  const ballState = Ball.createBallState({
    id: 'cpu-reaction-body-ball',
    position: { x: 52.86, y: 0, z: 0.11 },
    velocity: { x: -8, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 3, z: 0 },
    grounded: true,
    regime: Ball.REGIMES.ROLL,
    lastOuterTick: tick,
    contactCount: 0,
    simulationTime: tick / 60
  });
  const rosterEntry = (player, contactEligible = true) => ({
    id: player.id,
    teamId: player.teamId,
    isGK: false,
    sentOff: false,
    available: true,
    contactEligible,
    bodyContactEligible: true,
    heightM: 1.82,
    attributes: {
      control: 94,
      technique: 92,
      awareness: 99,
      reactions: player.attributes.reactions,
      heading: 72,
      jumping: 72,
      strength: 75,
      shooting: 75,
      volleys: 75,
      balance: 82,
      agility: 82,
      defending: 68
    }
  });
  return {
    schema: Contact.REQUEST_SCHEMA,
    workflow: 'cpu-v-cpu',
    online: false,
    tick,
    epoch: 0,
    seed: 173,
    fixedTickSeconds: 1 / 60,
    movementWorld,
    ballState,
    roster: players.map(player => rosterEntry(player,
      player.id === source.id ? sourceContactEligible : true)),
    intendedReceiverId,
    firstTouchIntent: null,
    aerialIntent: null,
    reactionContext: {
      active: true,
      stimulus: 'deliberate-pass-release',
      releaseTick,
      sourcePlayerId: source.id,
      sourceTeamId: source.teamId,
      previousBallPosition: { x: 53.3, y: 0, z: 0.11 }
    },
    consumedFirstTouchIds: [],
    consumedFirstTouchThroughTick: 0,
    consumedAerialIds: [],
    gate: {
      livePlay: true,
      restartActive: false,
      replayActive: false,
      keeperAuthority: false,
      offsideInvolvementPending: false,
      specialActionAuthority: false
    }
  };
}

class DeterministicHost {
  constructor(seed, restored) {
    this.seed = seed;
    this.snapshot = restored ? structuredClone(restored.snapshot) : buildInitialSnapshot();
    this.metrics = restored ? structuredClone(restored.metrics) : {
      seed,
      committedTicks: 0,
      passes: [],
      arrivals: [],
      shots: 0,
      shotContexts: [],
      shotGateDiagnostics: {
        controlledTicks: 0,
        inRatedRangeTicks: 0,
        openLaneTicks: 0,
        eligibleTicks: 0,
        blockedInRangeTicks: 0,
        openLaneOutOfRangeTicks: 0,
        examples: []
      },
      goals: 0,
      restarts: 0,
      possessionChanges: 0,
      logicalPossessionChanges: 0,
      logicalTeamTurnovers: 0,
      logicalTurnovers: [],
      carrierIntents: [],
      lastCarrierIntentKey: null,
      carrierIntentTickCounts: {},
      carrierIntentReasonTicks: {},
      controlledCarrierStaticTicks: 0,
      controlledCarrierMovingTicks: 0,
      completedSequenceCount: 0,
      threePassChains: 0,
      multiPassChanceSequences: 0,
      maximumCompletedPassChain: 0,
      sequenceExamples: [],
      progressiveRunnerPasses: [],
      interceptionExamples: [],
      ownerTicks: 0,
      looseTicks: 0,
      logicalOwnerTicks: 0,
      logicalLooseTicks: 0,
      physicalSeparationTicks: 0,
      logicalContinuityViolations: 0,
      dribbleTouches: [],
      lastRecordedTouchKey: null,
      lastTouchTickByCarrier: {},
      dribblePhaseCounts: {},
      firstTouchContacts: 0,
      involuntaryDeflections: [],
      deflectionOwnershipViolations: 0,
      earlySourceSelfContacts: 0,
      firstTouchLedgerMaximum: 0,
      firstTouchWatermarkMaximum: 0,
      firstTouchDispositions: {},
      passRaceTelemetry: {
        evaluations: 0,
        accepted: 0,
        rejected: 0,
        progressiveRiskAccepted: 0,
        reasons: {},
        passReleases: 0,
        progressiveRiskReleases: 0,
        releaseReasons: {}
      },
      supportSamples: [],
      movementSpeedSamples: [],
      strictStops: 0
    };
    this.pendingPass = restored ? structuredClone(restored.pendingPass) : null;
    this.pendingLaunch = restored ? structuredClone(restored.pendingLaunch) : null;
    this.activeSequence = restored ? structuredClone(restored.activeSequence) : null;
    this.launchSerial = restored ? restored.launchSerial : 0;
    this.lastOwnerId = restored ? restored.lastOwnerId : this.snapshot.ball.ownerId;
    this.lastLogicalOwnerId = restored ? restored.lastLogicalOwnerId : this.snapshot.ball.ownerId;
    this.lastLogicalTeamId = restored ? restored.lastLogicalTeamId : this.player(this.lastLogicalOwnerId)?.teamId || null;
    this.looseSinceTick = restored ? restored.looseSinceTick : null;
    this.suppressActions = restored ? restored.suppressActions === true : false;
    this.attachment = null;
  }

  serialize() {
    return structuredClone({
      snapshot: this.snapshot,
      metrics: this.metrics,
      pendingPass: this.pendingPass,
      pendingLaunch: this.pendingLaunch,
      activeSequence: this.activeSequence,
      launchSerial: this.launchSerial,
      lastOwnerId: this.lastOwnerId,
      lastLogicalOwnerId: this.lastLogicalOwnerId,
      lastLogicalTeamId: this.lastLogicalTeamId,
      looseSinceTick: this.looseSinceTick,
      suppressActions: this.suppressActions
    });
  }

  player(id) {
    return this.snapshot.players.find(player => player.id === id) || null;
  }

  beginSequence(teamId) {
    if (this.activeSequence?.teamId === teamId) return this.activeSequence;
    if (this.activeSequence) this.finishSequence('possession-transition-before-action');
    this.activeSequence = {
      id: `${teamId}:${this.snapshot.tick}`,
      teamId,
      startTick: this.snapshot.tick,
      attemptedPasses: 0,
      completedPasses: 0,
      shot: false,
      passes: []
    };
    return this.activeSequence;
  }

  finishSequence(endReason, detail = {}) {
    const sequence = this.activeSequence;
    if (!sequence) return;
    this.activeSequence = null;
    if (!sequence.attemptedPasses && !sequence.shot) return;
    this.metrics.completedSequenceCount += 1;
    this.metrics.maximumCompletedPassChain = Math.max(
      this.metrics.maximumCompletedPassChain,
      sequence.completedPasses
    );
    if (sequence.completedPasses >= 3) this.metrics.threePassChains += 1;
    if (sequence.shot && sequence.completedPasses >= 2) this.metrics.multiPassChanceSequences += 1;
    const worthKeeping = sequence.completedPasses >= 3 || sequence.shot ||
      ['intercepted', 'goal-line-out', 'touchline-out', 'stalled-loose-ball'].includes(endReason);
    if (worthKeeping && this.metrics.sequenceExamples.length < 12) {
      this.metrics.sequenceExamples.push({
        id: sequence.id,
        teamId: sequence.teamId,
        startTick: sequence.startTick,
        endTick: this.snapshot.tick,
        durationTicks: this.snapshot.tick - sequence.startTick,
        attemptedPasses: sequence.attemptedPasses,
        completedPasses: sequence.completedPasses,
        shot: sequence.shot,
        endReason,
        detail: structuredClone(detail),
        passes: sequence.passes.slice(-8)
      });
    }
  }

  updateOffsideLines() {
    const home = this.snapshot.players.filter(player => player.teamId === 'you' && !player.sentOff).sort((a, b) => a.x - b.x);
    const away = this.snapshot.players.filter(player => player.teamId === 'opp' && !player.sentOff).sort((a, b) => b.x - a.x);
    const youLine = away[Math.min(1, away.length - 1)]?.x ?? HOST.xMin + 82 * HOST.xPerMetre;
    const oppLine = home[Math.min(1, home.length - 1)]?.x ?? HOST.xMin + 23 * HOST.xPerMetre;
    this.snapshot.teams.find(team => team.id === 'you').offsideLine = clamp(youLine, HOST.xMin, HOST.xMax);
    this.snapshot.teams.find(team => team.id === 'opp').offsideLine = clamp(oppLine, HOST.xMin, HOST.xMax);
  }

  input(nextTick) {
    this.updateOffsideLines();
    const copy = structuredClone(this.snapshot);
    copy.tick = nextTick;
    copy.ball.launchIntent = this.pendingLaunch ? structuredClone(this.pendingLaunch) : null;
    copy.contact.intendedReceiverId = copy.ball.targetId;
    copy.contact.gate.keeperAuthority = Boolean(copy.ball.ownerId && this.player(copy.ball.ownerId)?.isGK);
    for (const player of copy.players) player.contactEligible = nextTick > (player.contactLockUntil || 0);
    return copy;
  }

  launchFromIntent(intent, source) {
    if (!intent.target) return false;
    const target = this.player(intent.targetPlayerId);
    if (!source || !target || target.teamId !== source.teamId) return false;
    const origin = { x: this.snapshot.ball.x, y: this.snapshot.ball.y, z: Math.max(1, this.snapshot.ball.z || 0) };
    const dx = intent.target.x - origin.x;
    const dy = intent.target.y - origin.y;
    const distance = Math.hypot(dx, dy);
    const mx = dx / HOST.xPerMetre;
    const my = dy / HOST.yPerMetre;
    const metricLength = Math.hypot(mx, my) || 1;
    const attackingDirection = source.teamId === 'you' ? 1 : -1;
    const progressMetres = attackingDirection * mx;
    const lateralMetres = Math.abs(my);
    const receiverVelocity = {
      x: target.vx * 60 / HOST.xPerMetre,
      y: target.vy * 60 / HOST.yPerMetre
    };
    const receiverSpeedMps = Math.hypot(receiverVelocity.x, receiverVelocity.y);
    const receiverRoute = {
      x: (intent.target.x - target.x) / HOST.xPerMetre,
      y: (intent.target.y - target.y) / HOST.yPerMetre
    };
    const receiverRouteLength = Math.hypot(receiverRoute.x, receiverRoute.y);
    const receiverRouteAlignment = receiverSpeedMps > 0.05 && receiverRouteLength > 0.05
      ? (receiverVelocity.x * receiverRoute.x + receiverVelocity.y * receiverRoute.y) /
        (receiverSpeedMps * receiverRouteLength)
      : 0;
    const shortSupport = ['support', 'recycle'].includes(String(intent.supportKind || ''));
    const long = !shortSupport && metricLength > 20;
    const coordinatedRun = ['release-coordinated-run', 'release-newly-opened-run'].includes(String(intent.reason || ''));
    const switchPass = lateralMetres >= 15 && metricLength >= 18;
    const progressiveIntoMovingRunner = progressMetres >= 4 && receiverSpeedMps >= .45 &&
      receiverRouteAlignment >= .15;
    const passPattern = shortSupport ? String(intent.supportKind) : coordinatedRun ? 'coordinated-run'
      : switchPass ? 'switch' : long ? 'long' : progressMetres >= 4 ? 'progressive' : 'lateral';
    const carrierPressureMetres = Math.min(...this.snapshot.players
      .filter(player => player.teamId !== source.teamId && !player.sentOff)
      .map(player => Math.hypot(
        (player.x - source.x) / HOST.xPerMetre,
        (player.y - source.y) / HOST.yPerMetre
      )), Infinity);
    const worldLength = distance || 1;
    const metresPerWorldUnit = Math.hypot(
      dx / worldLength / HOST.xPerMetre,
      dy / worldLength / HOST.yPerMetre
    );
    const racePace = Number(intent.passRace?.launchSpeedMetresPerSecond);
    const speedMetresPerSecond = Number.isFinite(racePace) ? racePace : long
      ? clamp(15 + metricLength * 0.18, 18, 23)
      : shortSupport
        ? clamp(7.2 + metricLength * 0.38, 8.4, 14.5)
        : clamp(8 + metricLength * 0.42, 9.5, 17);
    const speedWorld = speedMetresPerSecond / (60 * Math.max(0.0001, metresPerWorldUnit));
    const raceLift = Number(intent.passRace?.launchLiftAngleDeg);
    const loftWorld = Number.isFinite(raceLift)
      ? Math.tan(raceLift * Math.PI / 180) * speedMetresPerSecond * HOST.zPerMetre / 60
      : long ? clamp(1.8 + (distance - 610) * 0.004, 1.8, 4.8) : 0;
    const verticalMetresPerSecond = loftWorld * 60 / HOST.zPerMetre;
    this.pendingLaunch = {
      sequence: `cpu-probe-launch-${++this.launchSerial}`,
      sourcePlayerId: source.id,
      targetPlayerId: target.id,
      origin,
      target: { x: intent.target.x, y: intent.target.y },
      direction: { x: mx / metricLength, y: my / metricLength },
      speedMetresPerSecond,
      liftAngleDeg: Math.atan2(verticalMetresPerSecond, speedMetresPerSecond) * 180 / Math.PI,
      sideSpinRpm: 0,
      topSpinRpm: 0,
      source: long ? 'long-pass' : 'ground-pass'
    };
    this.snapshot.ball.ownerId = null;
    this.snapshot.ball.targetId = target.id;
    this.snapshot.ball.lastKickerId = source.id;
    this.snapshot.ball.flightType = long ? 'long-pass' : 'ground-pass';
    this.snapshot.ball.x = origin.x;
    this.snapshot.ball.y = origin.y;
    this.snapshot.ball.z = origin.z;
    this.snapshot.ball.vx = 0;
    this.snapshot.ball.vy = 0;
    this.snapshot.ball.zv = 0;
    source.contactLockUntil = this.snapshot.tick + 18;
    const pass = {
      tick: this.snapshot.tick,
      sourceId: source.id,
      sourceTeam: source.teamId,
      targetId: target.id,
      distanceMetres: metricLength,
      launchSpeedMps: speedMetresPerSecond,
      flightType: this.snapshot.ball.flightType,
      reason: intent.reason || 'cpu-v2',
      supportKind: intent.supportKind || null,
      passPattern,
      progressMetres,
      lateralMetres,
      receiverSpeedMps,
      receiverRouteAlignment,
      progressiveIntoMovingRunner,
      carrierPressureMetres,
      intendedX: intent.target.x,
      intendedY: intent.target.y,
      targetLaunchX: target.x,
      targetLaunchY: target.y,
      minimumTargetDistanceMetres: Infinity,
      minimumIntendedPointDistanceMetres: Infinity,
      inFlightRouteTicks: 0,
      looseRecoveryTicks: 0,
      receiverMovingTicks: 0
    };
    // Metrics and the mutable in-flight tracker must not share identity: the
    // host checkpoint is plain data, so replay must not depend on an alias
    // that serialization is not required to preserve.
    this.metrics.passes.push(structuredClone(pass));
    this.pendingPass = pass;
    const sequence = this.beginSequence(source.teamId);
    sequence.attemptedPasses += 1;
    return true;
  }

  shotFromIntent(intent, source) {
    if (!intent.target || !source) return false;
    const origin = { x: this.snapshot.ball.x, y: this.snapshot.ball.y, z: Math.max(1, this.snapshot.ball.z || 0) };
    const dx = intent.target.x - origin.x;
    const dy = intent.target.y - origin.y;
    const distance = Math.hypot(dx, dy) || 1;
    const skill = clamp((source.attrs.shoot || 70) / 100, 0.35, 0.99);
    const speedWorld = 23 + skill * 8;
    const loftWorld = 1.1 + skill * 2.2;
    const mx = dx / HOST.xPerMetre;
    const my = dy / HOST.yPerMetre;
    const metricLength = Math.hypot(mx, my) || 1;
    const speedMetresPerSecond = clamp(speedWorld * 60 * Math.hypot(
      dx / distance / HOST.xPerMetre,
      dy / distance / HOST.yPerMetre
    ), 0.05, 48);
    this.pendingLaunch = {
      sequence: `cpu-probe-launch-${++this.launchSerial}`,
      sourcePlayerId: source.id,
      targetPlayerId: null,
      origin,
      direction: { x: mx / metricLength, y: my / metricLength },
      speedMetresPerSecond,
      liftAngleDeg: Math.atan2(loftWorld * 60 / HOST.zPerMetre, speedMetresPerSecond) * 180 / Math.PI,
      sideSpinRpm: 0,
      topSpinRpm: 0,
      source: 'shot'
    };
    this.snapshot.ball.ownerId = null;
    this.snapshot.ball.targetId = null;
    this.snapshot.ball.lastKickerId = source.id;
    this.snapshot.ball.flightType = 'shot';
    this.snapshot.ball.x = origin.x;
    this.snapshot.ball.y = origin.y;
    this.snapshot.ball.z = origin.z;
    this.snapshot.ball.vx = 0;
    this.snapshot.ball.vy = 0;
    this.snapshot.ball.zv = 0;
    source.contactLockUntil = this.snapshot.tick + 18;
    this.metrics.shots += 1;
    if (this.metrics.shotContexts.length < 12) {
      const defenders = this.snapshot.players.filter(player => player.teamId !== source.teamId && !player.sentOff);
      const nearestDefenderMetres = Math.min(...defenders.map(player => Math.hypot(
        (player.x - source.x) / HOST.xPerMetre,
        (player.y - source.y) / HOST.yPerMetre
      )), Infinity);
      this.metrics.shotContexts.push({
        tick: this.snapshot.tick,
        teamId: source.teamId,
        shooterId: source.id,
        reason: intent.reason || null,
        precedingCompletedPasses: this.activeSequence?.teamId === source.teamId
          ? this.activeSequence.completedPasses : 0,
        precedingAttemptedPasses: this.activeSequence?.teamId === source.teamId
          ? this.activeSequence.attemptedPasses : 0,
        xMetres: rounded((source.x - HOST.xMin) / HOST.xPerMetre),
        yMetres: rounded(source.y / HOST.yPerMetre - 34),
        goalDistanceMetres: rounded(metricLength),
        nearestDefenderMetres: rounded(nearestDefenderMetres)
      });
    }
    if (this.pendingPass) this.finishPass(null, 'shot-followup');
    const sequence = this.beginSequence(source.teamId);
    sequence.shot = true;
    this.finishSequence('shot', {
      shooterId: source.id,
      xMetres: rounded((source.x - HOST.xMin) / HOST.xPerMetre),
      yMetres: rounded(source.y / HOST.yPerMetre - 34)
    });
    return true;
  }

  finishPass(ownerId, reason) {
    if (!this.pendingPass) return;
    const pass = this.pendingPass;
    const owner = ownerId && this.player(ownerId);
    const outcome = !owner ? reason : owner.id === pass.targetId ? 'completed'
      : owner.teamId !== pass.sourceTeam ? 'intercepted' : 'recovered-by-teammate';
    this.metrics.arrivals.push({
      launchTick: this.pendingPass.tick,
      arrivalTick: this.snapshot.tick,
      travelTicks: this.snapshot.tick - this.pendingPass.tick,
      targetId: this.pendingPass.targetId,
      ownerId: owner && owner.id || null,
      flightType: this.pendingPass.flightType,
      outcome,
      reason,
      distanceMetres: this.pendingPass.distanceMetres,
      launchSpeedMps: this.pendingPass.launchSpeedMps,
      minimumTargetDistanceMetres: Number.isFinite(this.pendingPass.minimumTargetDistanceMetres)
        ? this.pendingPass.minimumTargetDistanceMetres : null,
      minimumIntendedPointDistanceMetres: Number.isFinite(this.pendingPass.minimumIntendedPointDistanceMetres)
        ? this.pendingPass.minimumIntendedPointDistanceMetres : null,
      terminalTargetDistanceMetres: this.pendingPass.terminalTargetDistanceMetres ?? null,
      inFlightRouteTicks: this.pendingPass.inFlightRouteTicks,
      looseRecoveryTicks: this.pendingPass.looseRecoveryTicks,
      receiverMovingTicks: this.pendingPass.receiverMovingTicks,
      terminalBall: this.pendingPass.terminalBall || null,
      terminalReceiver: this.pendingPass.terminalReceiver || null
    });
    const sequence = this.activeSequence?.teamId === pass.sourceTeam
      ? this.activeSequence : this.beginSequence(pass.sourceTeam);
    const passTrace = {
      tick: pass.tick,
      sourceId: pass.sourceId,
      targetId: pass.targetId,
      outcome,
      reason: pass.reason,
      pattern: pass.passPattern,
      distanceMetres: rounded(pass.distanceMetres),
      progressMetres: rounded(pass.progressMetres),
      lateralMetres: rounded(pass.lateralMetres),
      launchSpeedMps: rounded(pass.launchSpeedMps),
      carrierPressureMetres: rounded(pass.carrierPressureMetres),
      receiverSpeedMps: rounded(pass.receiverSpeedMps),
      receiverRouteAlignment: rounded(pass.receiverRouteAlignment),
      receiverMovingTicks: pass.receiverMovingTicks,
      inFlightRouteTicks: pass.inFlightRouteTicks
    };
    sequence.passes.push(passTrace);
    if (['completed', 'recovered-by-teammate'].includes(outcome)) {
      sequence.completedPasses += 1;
      if (pass.progressiveIntoMovingRunner && this.metrics.progressiveRunnerPasses.length < 8) {
        this.metrics.progressiveRunnerPasses.push(passTrace);
      }
    } else {
      if (outcome === 'intercepted' && this.metrics.interceptionExamples.length < 8) {
        this.metrics.interceptionExamples.push({ ...passTrace, interceptorId: owner?.id || null });
      }
      this.finishSequence(outcome, { ownerId: owner?.id || null, terminalReason: reason });
    }
    this.pendingPass = null;
  }

  applyMovement(projection) {
    for (const row of projection.movement || []) {
      const player = this.player(row.id);
      if (!player) throw new Error('probe movement referenced an unknown player');
      player.x = row.x;
      player.y = row.y;
      player.vx = row.vx;
      player.vy = row.vy;
      player.fx = row.fx;
      player.fy = row.fy;
      player.stamina = row.stamina;
      this.metrics.movementSpeedSamples.push(Math.hypot(row.vx * 60 / HOST.xPerMetre, row.vy * 60 / HOST.yPerMetre));
    }
    const nextOwnerId = projection.movementBallOwnerId == null ? null : String(projection.movementBallOwnerId);
    if (projection.physicalBallSeparated) {
      if (!nextOwnerId || String(projection.logicalBallOwnerId || '') !== nextOwnerId) {
        this.metrics.logicalContinuityViolations += 1;
        throw new Error('probe observed a separated touch without continuous logical ownership');
      }
      this.snapshot.ball.ownerId = null;
      this.snapshot.ball.targetId = projection.logicalBallOwnerId == null ? null : String(projection.logicalBallOwnerId);
    } else if (nextOwnerId) {
      const changed = this.snapshot.ball.ownerId !== nextOwnerId;
      this.snapshot.ball.ownerId = nextOwnerId;
      this.snapshot.ball.targetId = null;
      this.snapshot.ball.flightType = 'controlled';
      if (changed) {
        this.finishPass(nextOwnerId, projection.contact ? 'contact' : 'movement-recovery');
        this.player(nextOwnerId).contactLockUntil = this.snapshot.tick + 12;
      }
    } else if (projection.possession && projection.possession.ownerId == null) {
      this.snapshot.ball.ownerId = null;
    }
  }

  applyIntelligence(projection) {
    if (this.suppressActions) return;
    for (const intent of projection.intelligence || []) {
      const source = this.player(intent.playerId);
      if (!source || this.snapshot.ball.ownerId !== source.id) continue;
      if (intent.type === 'pass') this.launchFromIntent(intent, source);
      else if (intent.type === 'shot') this.shotFromIntent(intent, source);
    }
  }

  recordCarrierIntent(projection) {
    const owner = this.snapshot.ball.ownerId && this.player(this.snapshot.ball.ownerId);
    if (!owner) {
      this.metrics.lastCarrierIntentKey = null;
      return;
    }
    const intent = (projection.intelligence || []).find(row => row.playerId === owner.id &&
      ['carry', 'pass', 'shot', 'wait'].includes(String(row.type || '')));
    if (!intent) return;
    const type = String(intent.type || 'unknown');
    const reason = String(intent.reason || 'unknown');
    const goal = {
      x: owner.teamId === 'you' ? HOST.xMax : HOST.xMin,
      y: (HOST.yMin + HOST.yMax) / 2
    };
    const toCanonical = point => ({
      x: (point.x - HOST.xMin) * 3176 / (HOST.xMax - HOST.xMin),
      y: (point.y - HOST.yMin) * 2130 / (HOST.yMax - HOST.yMin)
    });
    const startCanonical = toCanonical(owner);
    const laneClearanceTo = target => {
      const endCanonical = toCanonical(target);
      const segmentX = endCanonical.x - startCanonical.x;
      const segmentY = endCanonical.y - startCanonical.y;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
      return Math.min(...this.snapshot.players
        .filter(player => player.teamId !== owner.teamId && !player.sentOff)
        .map(player => {
        const point = toCanonical(player);
        const amount = segmentLengthSquared <= 1e-9 ? 0 : clamp(
          ((point.x - startCanonical.x) * segmentX + (point.y - startCanonical.y) * segmentY) /
            segmentLengthSquared,
          0,
          1
        );
        return Math.hypot(
          point.x - (startCanonical.x + segmentX * amount),
          point.y - (startCanonical.y + segmentY * amount)
        );
        }), Infinity);
    };
    const goalThirdOffset = HOST.yPerMetre * 2.44;
    const shotLaneClearancesCanonical = [
      laneClearanceTo(goal),
      laneClearanceTo({ x: goal.x, y: goal.y - goalThirdOffset }),
      laneClearanceTo({ x: goal.x, y: goal.y + goalThirdOffset })
    ];
    const shotLaneClearanceCanonical = Math.max(...shotLaneClearancesCanonical);
    const endCanonical = toCanonical(goal);
    const segmentX = endCanonical.x - startCanonical.x;
    const segmentY = endCanonical.y - startCanonical.y;
    const goalDistanceCanonical = Math.hypot(segmentX, segmentY);
    const shooting = Number(owner.attrs?.shoot || 70);
    const ratedShotDistanceCanonical = CPU.DEFAULT_CONFIG.shotDistance +
      clamp(shooting - 62, 0, 37) * 4;
    const inRatedRange = goalDistanceCanonical <= ratedShotDistanceCanonical;
    const shotLaneOpen = shotLaneClearanceCanonical >= CPU.DEFAULT_CONFIG.minimumShotLaneClearance;
    const shotEligible = shooting >= 62 && inRatedRange && shotLaneOpen;
    const shotGates = this.metrics.shotGateDiagnostics;
    shotGates.controlledTicks += 1;
    if (inRatedRange) shotGates.inRatedRangeTicks += 1;
    if (shotLaneOpen) shotGates.openLaneTicks += 1;
    if (shotEligible) shotGates.eligibleTicks += 1;
    if (inRatedRange && !shotLaneOpen) shotGates.blockedInRangeTicks += 1;
    if (!inRatedRange && shotLaneOpen) shotGates.openLaneOutOfRangeTicks += 1;
    if ((inRatedRange || goalDistanceCanonical <= ratedShotDistanceCanonical + 150) &&
        shotGates.examples.length < 16) {
      shotGates.examples.push({
        tick: this.snapshot.tick,
        ownerId: owner.id,
        teamId: owner.teamId,
        intentType: type,
        intentReason: reason,
        shooting,
        goalDistanceCanonical: rounded(goalDistanceCanonical),
        ratedShotDistanceCanonical: rounded(ratedShotDistanceCanonical),
        shotLaneClearanceCanonical: rounded(shotLaneClearanceCanonical),
        shotLaneClearancesCanonical: shotLaneClearancesCanonical.map(rounded),
        inRatedRange,
        shotLaneOpen,
        shotEligible
      });
    }
    this.metrics.carrierIntentTickCounts[type] = (this.metrics.carrierIntentTickCounts[type] || 0) + 1;
    this.metrics.carrierIntentReasonTicks[reason] = (this.metrics.carrierIntentReasonTicks[reason] || 0) + 1;
    const carrierSpeedMps = Math.hypot(
      owner.vx * 60 / HOST.xPerMetre,
      owner.vy * 60 / HOST.yPerMetre
    );
    if (carrierSpeedMps < .2) this.metrics.controlledCarrierStaticTicks += 1;
    else this.metrics.controlledCarrierMovingTicks += 1;
    const key = [owner.id, intent.type, intent.reason || '', intent.targetPlayerId || ''].join(':');
    if (key === this.metrics.lastCarrierIntentKey) return;
    this.metrics.lastCarrierIntentKey = key;
    if (this.metrics.carrierIntents.length >= 40) return;
    this.metrics.carrierIntents.push({
      tick: this.snapshot.tick,
      playerId: owner.id,
      teamId: owner.teamId,
      xMetres: rounded((owner.x - HOST.xMin) / HOST.xPerMetre),
      yMetres: rounded(owner.y / HOST.yPerMetre - 34),
      type: intent.type,
      reason: intent.reason || null,
      targetPlayerId: intent.targetPlayerId || null
    });
  }

  applyBall(projection) {
    if (!projection.ball || this.snapshot.ball.ownerId && !projection.physicalBallSeparated) return;
    Object.assign(this.snapshot.ball, {
      x: projection.ball.x,
      y: projection.ball.y,
      z: projection.ball.z,
      vx: projection.ball.vx,
      vy: projection.ball.vy,
      zv: projection.ball.zv
    });
  }

  applyContact(projection) {
    const contact = projection.contact;
    if (!contact) return;
    this.metrics.firstTouchLedgerMaximum = Math.max(
      this.metrics.firstTouchLedgerMaximum,
      Array.isArray(contact.consumedFirstTouchIds) ? contact.consumedFirstTouchIds.length : 0
    );
    this.metrics.firstTouchWatermarkMaximum = Math.max(
      this.metrics.firstTouchWatermarkMaximum,
      Number.isSafeInteger(contact.consumedFirstTouchThroughTick) ? contact.consumedFirstTouchThroughTick : 0
    );
    if (contact.contactType === 'first-touch') {
      this.metrics.firstTouchContacts += 1;
      const disposition = String(contact.presentation?.possessionDisposition || 'none');
      this.metrics.firstTouchDispositions[disposition] = (this.metrics.firstTouchDispositions[disposition] || 0) + 1;
    }
    if (contact.contactType === 'involuntary-deflection') {
      const actorId = String(contact.presentation?.playerId || contact.ballState?.lastContact?.colliderId || '');
      const actor = this.player(actorId);
      const pending = this.pendingPass;
      const releaseAgeTicks = Number(contact.detail?.reaction?.ageTicks);
      let category = 'unclassified';
      if (pending && actorId === pending.sourceId) category = 'source';
      else if (pending && actorId === pending.targetId) category = 'intended-receiver';
      else if (pending && actor?.teamId === pending.sourceTeam) category = 'non-target-teammate';
      else if (pending && actor && actor.teamId !== pending.sourceTeam) category = 'opponent';
      this.metrics.involuntaryDeflections.push({
        tick: this.snapshot.tick,
        launchTick: pending?.tick ?? null,
        actorId: actorId || null,
        actorTeamId: actor?.teamId || null,
        category,
        reactionRating: contact.detail?.reaction?.rating ?? null,
        reactionRatingSource: contact.detail?.reaction?.ratingSource ?? null,
        reactionDelayTicks: contact.detail?.reaction?.delayTicks ?? null,
        releaseAgeTicks: Number.isFinite(releaseAgeTicks) ? releaseAgeTicks : null,
        reactionReady: contact.detail?.reaction?.ready === true,
        intended: contact.detail?.intended === true,
        reason: contact.presentation?.reason || null,
        incomingSpeedMps: rounded(Math.hypot(
          contact.detail?.incomingVelocity?.x || 0,
          contact.detail?.incomingVelocity?.y || 0,
          contact.detail?.incomingVelocity?.z || 0
        )),
        outgoingSpeedMps: rounded(Math.hypot(
          contact.detail?.outgoingVelocity?.x || 0,
          contact.detail?.outgoingVelocity?.y || 0,
          contact.detail?.outgoingVelocity?.z || 0
        ))
      });
      if (contact.ownerCandidateId != null || contact.presentation?.possessionDisposition !== 'remain-loose') {
        this.metrics.deflectionOwnershipViolations += 1;
      }
      if (category === 'source' && Number.isFinite(releaseAgeTicks) && releaseAgeTicks < 3) {
        this.metrics.earlySourceSelfContacts += 1;
      }
    }
    if (!contact.ownedContact || !contact.ownerCandidateId) return;
    const owner = this.player(contact.ownerCandidateId);
    if (!owner) throw new Error('probe contact referenced an unknown player');
    this.snapshot.ball.ownerId = owner.id;
    this.snapshot.ball.targetId = null;
    this.snapshot.ball.flightType = 'controlled';
    owner.contactLockUntil = this.snapshot.tick + 18;
    this.finishPass(owner.id, contact.contactType || 'contact');
  }

  applyDribbling(projection) {
    const dribbling = projection.dribbling;
    if (!dribbling) return;
    const state = dribbling.serializedState && dribbling.serializedState.state;
    if (state) {
      const phase = String(state.phase || 'unknown');
      this.metrics.dribblePhaseCounts[phase] = (this.metrics.dribblePhaseCounts[phase] || 0) + 1;
      if (Number.isSafeInteger(state.touchTick) && state.touchTick >= 0 && state.logicalOwnerId) {
        const key = `${state.epoch}:${state.touchSequence}:${state.touchTick}`;
        if (key !== this.metrics.lastRecordedTouchKey) {
          const carrierId = String(state.logicalOwnerId);
          const previousTouchTick = this.metrics.lastTouchTickByCarrier[carrierId];
          this.metrics.dribbleTouches.push({
            tick: state.touchTick,
            carrierId,
            scheduledCadenceTicks: Math.max(0, state.nextTouchTick - state.touchTick),
            sameCarrierIntervalTicks: Number.isSafeInteger(previousTouchTick) ? state.touchTick - previousTouchTick : null,
            foot: state.foot,
            contact: state.contact
          });
          this.metrics.lastRecordedTouchKey = key;
          this.metrics.lastTouchTickByCarrier[carrierId] = state.touchTick;
        }
      }
    }
    if (projection.physicalBallSeparated) {
      this.snapshot.ball.ownerId = null;
      this.snapshot.ball.targetId = projection.logicalBallOwnerId == null ? null : String(projection.logicalBallOwnerId);
    }
    const released = dribbling.releasedAction;
    if (!this.suppressActions && released && released.source === 'cpu-v2' && !dribbling.authorityHandoff) {
      const source = this.player(released.actorId);
      if (source && this.snapshot.ball.ownerId === source.id) {
        const intent = {
          type: released.type,
          playerId: source.id,
          targetPlayerId: released.targetPlayerId,
          target: released.target,
          confidence: released.power,
          reason: 'dribbling-v2-resecure'
        };
        if (intent.type === 'pass') this.launchFromIntent(intent, source);
        else if (intent.type === 'shot') this.shotFromIntent(intent, source);
      }
    }
  }

  sampleShape(projection) {
    const owner = this.snapshot.ball.ownerId && this.player(this.snapshot.ball.ownerId);
    if (!owner || this.snapshot.tick % 30 !== 0) return;
    const direction = owner.teamId === 'you' ? 1 : -1;
    const teammates = this.snapshot.players.filter(player => player.teamId === owner.teamId && !player.isGK && player.id !== owner.id);
    this.metrics.supportSamples.push({
      ahead: teammates.filter(player => direction * (player.x - owner.x) > 0).length,
      withinTenMetres: teammates.filter(player => Math.hypot(
        (player.x - owner.x) / HOST.xPerMetre,
        (player.y - owner.y) / HOST.yPerMetre
      ) <= 10).length
    });
  }

  sampleLogicalPossession(projection) {
    const logicalOwnerId = projection.physicalBallSeparated
      ? String(projection.logicalBallOwnerId || '') || null
      : this.snapshot.ball.ownerId;
    const logicalTeamId = logicalOwnerId ? this.player(logicalOwnerId)?.teamId || null : null;
    if (logicalOwnerId) this.metrics.logicalOwnerTicks += 1;
    else this.metrics.logicalLooseTicks += 1;
    if (projection.physicalBallSeparated) this.metrics.physicalSeparationTicks += 1;
    if (logicalOwnerId !== this.lastLogicalOwnerId) this.metrics.logicalPossessionChanges += 1;
    if (logicalTeamId && this.lastLogicalTeamId && logicalTeamId !== this.lastLogicalTeamId) {
      const movementContacts = Array.isArray(projection.movementTelemetry?.contacts)
        ? projection.movementTelemetry.contacts.filter(row =>
          [this.lastLogicalOwnerId, logicalOwnerId].includes(String(row.actorId || '')) ||
          [this.lastLogicalOwnerId, logicalOwnerId].includes(String(row.targetId || '')))
        : [];
      const movementActions = Array.isArray(projection.movementTelemetry?.actions)
        ? projection.movementTelemetry.actions.filter(row =>
          [this.lastLogicalOwnerId, logicalOwnerId].includes(String(row.actorId || '')) ||
          [this.lastLogicalOwnerId, logicalOwnerId].includes(String(row.targetId || '')))
        : [];
      const activeSequenceAtTurnover = this.activeSequence?.teamId === this.lastLogicalTeamId
        ? {
            attemptedPasses: this.activeSequence.attemptedPasses,
            completedPasses: this.activeSequence.completedPasses,
            lastPass: this.activeSequence.passes.at(-1) || null
          }
        : null;
      if (this.activeSequence?.teamId === this.lastLogicalTeamId && !this.pendingPass) {
        this.finishSequence('possession-turnover', {
          fromOwnerId: this.lastLogicalOwnerId,
          toOwnerId: logicalOwnerId,
          contactType: projection.contact?.contactType || null
        });
      }
      this.metrics.logicalTeamTurnovers += 1;
      if (this.metrics.logicalTurnovers.length < 16) {
        this.metrics.logicalTurnovers.push({
          tick: this.snapshot.tick,
          fromTeamId: this.lastLogicalTeamId,
          toTeamId: logicalTeamId,
          fromOwnerId: this.lastLogicalOwnerId,
          toOwnerId: logicalOwnerId,
          contactType: projection.contact && projection.contact.contactType || null,
          ownedContact: Boolean(projection.contact && projection.contact.ownedContact),
          projectedPossessionTeamId: projection.possession && projection.possession.teamId || null,
          projectedMovementOwnerId: projection.movementBallOwnerId || null,
          movementContacts: structuredClone(movementContacts),
          movementActions: structuredClone(movementActions),
          activeSequence: structuredClone(activeSequenceAtTurnover)
        });
      }
    }
    this.lastLogicalOwnerId = logicalOwnerId;
    if (logicalTeamId) this.lastLogicalTeamId = logicalTeamId;
  }

  recordCpuPassRaceTelemetry(frame) {
    const telemetry = this.metrics.passRaceTelemetry ||= {
      evaluations: 0,
      accepted: 0,
      rejected: 0,
      progressiveRiskAccepted: 0,
      reasons: {},
      passReleases: 0,
      progressiveRiskReleases: 0,
      releaseReasons: {}
    };
    const racesByTeam = {};
    for (const teamId of ['you', 'opp']) {
      const race = frame.cpu?.[teamId]?.telemetry?.passReceiverRace;
      if (!race) continue;
      racesByTeam[teamId] = race;
      const reason = String(race.reason || 'unknown');
      telemetry.evaluations += 1;
      telemetry[race.accepted ? 'accepted' : 'rejected'] += 1;
      telemetry.reasons[reason] = (telemetry.reasons[reason] || 0) + 1;
      if (reason === 'high-confidence-progressive-risk-envelope') telemetry.progressiveRiskAccepted += 1;
    }

    const releaseReasons = [];
    for (const intent of frame.hostProjection?.intelligence || []) {
      if (intent.type === 'pass' && intent.passRace) releaseReasons.push(String(intent.passRace.reason || 'unknown'));
    }
    const releasedAction = frame.hostProjection?.dribbling?.releasedAction;
    if (releasedAction?.type === 'pass' && releasedAction.source === 'cpu-v2') {
      const actor = this.player(String(releasedAction.actorId || ''));
      const race = actor && racesByTeam[actor.teamId];
      releaseReasons.push(String(race?.reason || 'telemetry-unavailable-at-release'));
    }
    for (const reason of releaseReasons) {
      telemetry.passReleases += 1;
      telemetry.releaseReasons[reason] = (telemetry.releaseReasons[reason] || 0) + 1;
      if (reason === 'high-confidence-progressive-risk-envelope') telemetry.progressiveRiskReleases += 1;
    }
  }

  anchorControlledBall() {
    const owner = this.snapshot.ball.ownerId && this.player(this.snapshot.ball.ownerId);
    if (!owner) return;
    const length = Math.hypot(owner.fx, owner.fy) || 1;
    this.snapshot.ball.x = owner.x + owner.fx / length * 0.64 * HOST.xPerMetre;
    this.snapshot.ball.y = owner.y + owner.fy / length * 0.64 * HOST.yPerMetre;
    this.snapshot.ball.z = 0;
    this.snapshot.ball.vx = owner.vx;
    this.snapshot.ball.vy = owner.vy;
    this.snapshot.ball.zv = 0;
    this.snapshot.ball.flightType = 'controlled';
  }

  restart(teamId, reason) {
    const taker = this.snapshot.players.find(player => player.teamId === teamId && !player.isGK && ['CM', 'ST'].includes(player.position))
      || this.snapshot.players.find(player => player.teamId === teamId && !player.isGK);
    this.finishPass(null, reason);
    this.snapshot.ball.ownerId = taker.id;
    this.snapshot.ball.targetId = null;
    this.snapshot.ball.lastKickerId = null;
    this.snapshot.ball.flightType = 'controlled';
    this.snapshot.ball.vx = 0;
    this.snapshot.ball.vy = 0;
    this.snapshot.ball.zv = 0;
    taker.x = HOST.xMin + 52.5 * HOST.xPerMetre;
    taker.y = HOST.yMax / 2;
    taker.fx = teamId === 'you' ? 1 : -1;
    taker.fy = 0;
    taker.contactLockUntil = this.snapshot.tick + 8;
    this.anchorControlledBall();
    this.metrics.restarts += 1;
    this.looseSinceTick = null;
  }

  resolveBoundary() {
    if (this.snapshot.ball.ownerId) {
      this.looseSinceTick = null;
      return;
    }
    const xMetres = (this.snapshot.ball.x - HOST.xMin) / HOST.xPerMetre;
    const yMetres = this.snapshot.ball.y / HOST.yPerMetre - 34;
    const lastKicker = this.snapshot.ball.lastKickerId && this.player(this.snapshot.ball.lastKickerId);
    if (xMetres < 0 || xMetres > 105) {
      if (Math.abs(yMetres) <= 3.66 && this.snapshot.ball.flightType === 'shot') {
        this.metrics.goals += 1;
        this.restart(lastKicker?.teamId === 'you' ? 'opp' : 'you', 'goal');
      } else {
        const defending = xMetres < 0 ? 'you' : 'opp';
        this.restart(defending, 'goal-line-out');
      }
      return;
    }
    if (Math.abs(yMetres) > 34) {
      this.restart(lastKicker?.teamId === 'you' ? 'opp' : 'you', 'touchline-out');
      return;
    }
    const speed = Math.hypot(
      this.snapshot.ball.vx * 60 / HOST.xPerMetre,
      this.snapshot.ball.vy * 60 / HOST.yPerMetre,
      this.snapshot.ball.zv * 60 / HOST.zPerMetre
    );
    if (speed < 0.12) {
      if (this.looseSinceTick == null) this.looseSinceTick = this.snapshot.tick;
      if (this.snapshot.tick - this.looseSinceTick > 90) {
        const nearest = this.snapshot.players.filter(player => !player.isGK && !player.sentOff).sort((left, right) => {
          const dl = Math.hypot(left.x - this.snapshot.ball.x, left.y - this.snapshot.ball.y);
          const dr = Math.hypot(right.x - this.snapshot.ball.x, right.y - this.snapshot.ball.y);
          return dl - dr || left.id.localeCompare(right.id);
        })[0];
        this.restart(nearest.teamId, 'stalled-loose-ball');
      }
    } else this.looseSinceTick = null;
  }

  samplePendingPassGeometry(projection) {
    if (!this.pendingPass || this.snapshot.ball.ownerId) return;
    const target = this.player(this.pendingPass.targetId);
    if (target) {
      const targetDistance = Math.hypot(
        (target.x - this.snapshot.ball.x) / HOST.xPerMetre,
        (target.y - this.snapshot.ball.y) / HOST.yPerMetre
      );
      this.pendingPass.minimumTargetDistanceMetres = Math.min(this.pendingPass.minimumTargetDistanceMetres, targetDistance);
      this.pendingPass.terminalTargetDistanceMetres = rounded(targetDistance);
      this.pendingPass.terminalReceiver = {
        x: rounded((target.x - HOST.xMin) / HOST.xPerMetre),
        y: rounded(target.y / HOST.yPerMetre - 34)
      };
      const movement = (projection.movement || []).find(row => row.id === target.id);
      if (movement && movement.locomotionState !== 'idle') this.pendingPass.receiverMovingTicks += 1;
      if (projection.possession?.inFlight && projection.possession.intendedReceiverId === target.id) {
        this.pendingPass.inFlightRouteTicks += 1;
      }
      if ((projection.recoveryAssignments || []).some(row => row.playerId === target.id)) {
        this.pendingPass.looseRecoveryTicks += 1;
      }
    }
    this.pendingPass.terminalBall = {
      x: rounded((this.snapshot.ball.x - HOST.xMin) / HOST.xPerMetre),
      y: rounded(this.snapshot.ball.y / HOST.yPerMetre - 34)
    };
    const intendedDistance = Math.hypot(
      (this.pendingPass.intendedX - this.snapshot.ball.x) / HOST.xPerMetre,
      (this.pendingPass.intendedY - this.snapshot.ball.y) / HOST.yPerMetre
    );
    this.pendingPass.minimumIntendedPointDistanceMetres = Math.min(this.pendingPass.minimumIntendedPointDistanceMetres, intendedDistance);
  }

  apply(projection) {
    const before = structuredClone(this.snapshot);
    const metricsBefore = structuredClone(this.metrics);
    const passBefore = structuredClone(this.pendingPass);
    const launchBefore = structuredClone(this.pendingLaunch);
    let committed = false;
    return {
      commit: () => {
        if (committed) throw new Error('probe host transaction already committed');
        this.snapshot.tick = projection.snapshotTick;
        this.applyMovement(projection);
        this.recordCarrierIntent(projection);
        this.applyIntelligence(projection);
        this.applyBall(projection);
        this.applyContact(projection);
        this.applyDribbling(projection);
        this.samplePendingPassGeometry(projection);
        this.sampleShape(projection);
        this.anchorControlledBall();
        this.resolveBoundary();
        this.sampleLogicalPossession(projection);
        const owner = this.snapshot.ball.ownerId;
        if (owner) this.metrics.ownerTicks += 1;
        else this.metrics.looseTicks += 1;
        if (owner !== this.lastOwnerId) this.metrics.possessionChanges += 1;
        this.lastOwnerId = owner;
        this.metrics.committedTicks += 1;
        committed = true;
      },
      rollback: () => {
        this.snapshot = before;
        this.metrics = metricsBefore;
        this.pendingPass = passBefore;
        this.pendingLaunch = launchBefore;
        committed = false;
      }
    };
  }

  summary() {
    const arrivals = this.metrics.arrivals;
    const completed = arrivals.filter(row => row.outcome === 'completed').length;
    const intercepted = arrivals.filter(row => row.outcome === 'intercepted').length;
    const overshot = arrivals.filter(row => !['completed', 'intercepted', 'recovered-by-teammate'].includes(row.outcome)).length;
    const travelTicks = arrivals.map(row => row.travelTicks);
    const support = this.metrics.supportSamples;
    const moving = this.metrics.movementSpeedSamples.filter(value => value > 0.05);
    const targetMisses = arrivals.map(row => row.minimumTargetDistanceMetres).filter(Number.isFinite);
    const intendedPointMisses = arrivals.map(row => row.minimumIntendedPointDistanceMetres).filter(Number.isFinite);
    const scheduledCadences = this.metrics.dribbleTouches.map(row => row.scheduledCadenceTicks).filter(Number.isFinite);
    const sameCarrierIntervals = this.metrics.dribbleTouches.map(row => row.sameCarrierIntervalTicks).filter(Number.isFinite);
    const deflections = this.metrics.involuntaryDeflections;
    const deflectionRatings = deflections.map(row => row.reactionRating).filter(Number.isFinite);
    const deflectionDelays = deflections.map(row => row.reactionDelayTicks).filter(Number.isFinite);
    const deflectionAges = deflections.map(row => row.releaseAgeTicks).filter(Number.isFinite);
    const simulatedSeconds = this.metrics.committedTicks / 60;
    const outcomes = Object.fromEntries([...new Set(arrivals.map(row => row.outcome))].sort().map(outcome => [
      outcome,
      arrivals.filter(row => row.outcome === outcome).length
    ]));
    const reasons = Object.fromEntries([...new Set(arrivals.map(row => row.reason))].sort().map(reason => [
      reason,
      arrivals.filter(row => row.reason === reason).length
    ]));
    const passTypes = Object.fromEntries([...new Set(this.metrics.passes.map(row => row.flightType))].sort().map(flightType => {
      const attempts = this.metrics.passes.filter(row => row.flightType === flightType).length;
      const typeArrivals = arrivals.filter(row => row.flightType === flightType);
      return [flightType, {
        attempts,
        completed: typeArrivals.filter(row => row.outcome === 'completed').length,
        intercepted: typeArrivals.filter(row => row.outcome === 'intercepted').length,
        recoveredByTeammate: typeArrivals.filter(row => row.outcome === 'recovered-by-teammate').length,
        otherResolved: typeArrivals.filter(row => !['completed', 'intercepted', 'recovered-by-teammate'].includes(row.outcome)).length
      }];
    }));
    const arrivalRaces = Object.fromEntries([...new Set(arrivals.map(row => row.outcome))].sort().map(outcome => {
      const races = arrivals.filter(row => row.outcome === outcome);
      return [outcome, {
        count: races.length,
        medianTravelSeconds: rounded(percentile(races.map(row => row.travelTicks), 0.5) / 60),
        medianDistanceMetres: rounded(percentile(races.map(row => row.distanceMetres), 0.5)),
        medianLaunchSpeedMps: rounded(percentile(races.map(row => row.launchSpeedMps), 0.5)),
        medianReceiverMissMetres: rounded(percentile(races.map(row => row.minimumTargetDistanceMetres).filter(Number.isFinite), 0.5)),
        medianAuthoredPointMissMetres: rounded(percentile(races.map(row => row.minimumIntendedPointDistanceMetres).filter(Number.isFinite), 0.5))
      }];
    }));
    const passCount = predicate => this.metrics.passes.filter(predicate).length;
    const passTotal = Math.max(1, this.metrics.passes.length);
    const passMix = {
      shortSupport: passCount(row => ['support', 'recycle'].includes(row.supportKind)),
      recycle: passCount(row => row.supportKind === 'recycle'),
      coordinatedRun: passCount(row => row.passPattern === 'coordinated-run'),
      newlyOpenedRun: passCount(row => row.reason === 'release-newly-opened-run'),
      progressive: passCount(row => row.progressMetres >= 4),
      progressiveIntoMovingRunner: passCount(row => row.progressiveIntoMovingRunner),
      switch: passCount(row => row.lateralMetres >= 15 && row.distanceMetres >= 18),
      long: passCount(row => row.flightType === 'long-pass')
    };
    const passMixShares = Object.fromEntries(Object.entries(passMix)
      .map(([key, value]) => [key, rounded(value / passTotal)]));
    const intentTickTotal = Object.values(this.metrics.carrierIntentTickCounts)
      .reduce((sum, value) => sum + value, 0);
    const carrierIntentTickShares = Object.fromEntries(Object.entries(this.metrics.carrierIntentTickCounts)
      .map(([key, value]) => [key, rounded(value / Math.max(1, intentTickTotal))]));
    const activeSequence = this.activeSequence ? {
      teamId: this.activeSequence.teamId,
      startTick: this.activeSequence.startTick,
      attemptedPasses: this.activeSequence.attemptedPasses,
      completedPasses: this.activeSequence.completedPasses,
      passes: this.activeSequence.passes.slice(-6)
    } : null;
    return {
      seed: this.seed,
      committedTicks: this.metrics.committedTicks,
      passes: this.metrics.passes.length,
      completed,
      intercepted,
      recoveredByTeammate: arrivals.filter(row => row.outcome === 'recovered-by-teammate').length,
      overshot,
      unresolved: this.pendingPass ? 1 : 0,
      completionRate: rounded(completed / Math.max(1, arrivals.length)),
      medianPassDistanceMetres: rounded(percentile(this.metrics.passes.map(row => row.distanceMetres), 0.5)),
      medianLaunchSpeedMps: rounded(percentile(this.metrics.passes.map(row => row.launchSpeedMps), 0.5)),
      medianTravelSeconds: rounded(percentile(travelTicks, 0.5) / 60),
      p90TravelSeconds: rounded(percentile(travelTicks, 0.9) / 60),
      medianMinimumTargetMissMetres: rounded(percentile(targetMisses, 0.5)),
      p90MinimumTargetMissMetres: rounded(percentile(targetMisses, 0.9)),
      medianMinimumIntendedPointMissMetres: rounded(percentile(intendedPointMisses, 0.5)),
      passesPerWallMinute: rounded(this.metrics.passes.length / Math.max(1 / 60, simulatedSeconds / 60)),
      possessionChangesPerWallMinute: rounded(this.metrics.possessionChanges / Math.max(1 / 60, simulatedSeconds / 60)),
      logicalPossessionChangesPerWallMinute: rounded(this.metrics.logicalPossessionChanges / Math.max(1 / 60, simulatedSeconds / 60)),
      logicalTeamTurnovers: this.metrics.logicalTeamTurnovers,
      firstLogicalTurnovers: this.metrics.logicalTurnovers.slice(0, 16),
      firstCarrierIntents: this.metrics.carrierIntents.slice(0, 40),
      carrierIntentTickCounts: { ...this.metrics.carrierIntentTickCounts },
      carrierIntentTickShares,
      carrierIntentReasonTicks: { ...this.metrics.carrierIntentReasonTicks },
      shotGateDiagnostics: structuredClone(this.metrics.shotGateDiagnostics),
      controlledCarrierStaticShare: rounded(this.metrics.controlledCarrierStaticTicks /
        Math.max(1, this.metrics.controlledCarrierStaticTicks + this.metrics.controlledCarrierMovingTicks)),
      controlledPossessionShare: rounded(this.metrics.ownerTicks / Math.max(1, this.metrics.committedTicks)),
      logicalControlledPossessionShare: rounded(this.metrics.logicalOwnerTicks / Math.max(1, this.metrics.committedTicks)),
      physicalSeparationShare: rounded(this.metrics.physicalSeparationTicks / Math.max(1, this.metrics.committedTicks)),
      logicalContinuityViolations: this.metrics.logicalContinuityViolations,
      dribbleTouches: this.metrics.dribbleTouches.length,
      dribblePhaseCounts: { ...this.metrics.dribblePhaseCounts },
      scheduledTouchCadenceTicks: {
        minimum: scheduledCadences.length ? Math.min(...scheduledCadences) : 0,
        median: rounded(percentile(scheduledCadences, 0.5)),
        p95: rounded(percentile(scheduledCadences, 0.95)),
        maximum: scheduledCadences.length ? Math.max(...scheduledCadences) : 0
      },
      sameCarrierTouchIntervalTicks: {
        samples: sameCarrierIntervals.length,
        minimum: sameCarrierIntervals.length ? Math.min(...sameCarrierIntervals) : 0,
        median: rounded(percentile(sameCarrierIntervals, 0.5)),
        p95: rounded(percentile(sameCarrierIntervals, 0.95)),
        maximum: sameCarrierIntervals.length ? Math.max(...sameCarrierIntervals) : 0
      },
      firstTouchContacts: this.metrics.firstTouchContacts,
      involuntaryDeflections: deflections.length,
      deflectionCategories: Object.fromEntries([...new Set(deflections.map(row => row.category))].sort().map(category => [
        category,
        deflections.filter(row => row.category === category).length
      ])),
      deflectionReactionRatingSources: Object.fromEntries([...new Set(deflections.map(row => row.reactionRatingSource))].sort().map(source => [
        source,
        deflections.filter(row => row.reactionRatingSource === source).length
      ])),
      deflectionReactionRatings: {
        minimum: deflectionRatings.length ? Math.min(...deflectionRatings) : null,
        median: deflectionRatings.length ? percentile(deflectionRatings, 0.5) : null,
        maximum: deflectionRatings.length ? Math.max(...deflectionRatings) : null
      },
      deflectionReactionDelayTicks: {
        minimum: deflectionDelays.length ? Math.min(...deflectionDelays) : null,
        median: deflectionDelays.length ? percentile(deflectionDelays, 0.5) : null,
        maximum: deflectionDelays.length ? Math.max(...deflectionDelays) : null
      },
      deflectionReleaseAgeTicks: {
        minimum: deflectionAges.length ? Math.min(...deflectionAges) : null,
        median: deflectionAges.length ? percentile(deflectionAges, 0.5) : null,
        maximum: deflectionAges.length ? Math.max(...deflectionAges) : null
      },
      deflectionOwnershipViolations: this.metrics.deflectionOwnershipViolations,
      earlySourceSelfContacts: this.metrics.earlySourceSelfContacts,
      firstDeflections: deflections.slice(0, 8),
      firstTouchLedgerMaximum: this.metrics.firstTouchLedgerMaximum,
      firstTouchWatermarkMaximum: this.metrics.firstTouchWatermarkMaximum,
      firstTouchDispositions: this.metrics.firstTouchDispositions,
      passRaceTelemetry: this.metrics.passRaceTelemetry,
      passMix,
      passMixShares,
      completedSequenceCount: this.metrics.completedSequenceCount,
      threePassChains: this.metrics.threePassChains,
      multiPassChanceSequences: this.metrics.multiPassChanceSequences,
      maximumCompletedPassChain: Math.max(this.metrics.maximumCompletedPassChain,
        this.activeSequence?.completedPasses || 0),
      sequenceExamples: this.metrics.sequenceExamples,
      activeSequence,
      progressiveRunnerPasses: this.metrics.progressiveRunnerPasses,
      interceptionExamples: this.metrics.interceptionExamples,
      meanSupportAhead: rounded(support.reduce((sum, row) => sum + row.ahead, 0) / Math.max(1, support.length)),
      meanSupportWithinTenMetres: rounded(support.reduce((sum, row) => sum + row.withinTenMetres, 0) / Math.max(1, support.length)),
      medianMovingSpeedMps: rounded(percentile(moving, 0.5)),
      p95MovingSpeedMps: rounded(percentile(moving, 0.95)),
      shots: this.metrics.shots,
      shotContexts: this.metrics.shotContexts.slice(0, 12),
      goals: this.metrics.goals,
      restarts: this.metrics.restarts,
      strictStops: this.metrics.strictStops,
      outcomes,
      reasons,
      passTypes,
      arrivalRaces,
      firstPasses: this.metrics.passes.slice(0, 3).map(row => ({
        tick: row.tick,
        sourceId: row.sourceId,
        targetId: row.targetId,
        distanceMetres: rounded(row.distanceMetres),
        launchSpeedMps: rounded(row.launchSpeedMps),
        reason: row.reason,
        supportKind: row.supportKind
      })),
      firstArrivals: this.metrics.arrivals.slice(0, 3)
    };
  }
}

function createRun(seed, restoredHost, restoredAdapter) {
  const host = new DeterministicHost(seed, restoredHost);
  const attachment = Adapter.createAttachment({
    enabled: true,
    capability: capability(),
    seed,
    sessionId: `cpu-v-cpu-tempo-probe-${seed}`,
    dependencies,
    trueFeelPhysicalTouchAuthority: TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY,
    cpuPassRaceFilter: CPU_PASS_RACE_FILTER,
    host: { prepareTick: projection => host.apply(projection) }
  });
  host.attachment = attachment;
  if (restoredAdapter) assert.equal(attachment.restoreState(restoredAdapter), true);
  return { host, attachment };
}

function advance(run, tickCount, performanceSamples = null) {
  for (let count = 0; count < tickCount; count += 1) {
    const startedAt = performanceSamples ? performance.now() : 0;
    const nextTick = run.host.snapshot.tick + 1;
    const consumedLaunch = run.host.pendingLaunch;
    const frame = run.attachment.planTick(run.host.input(nextTick));
    assert.ok(frame, JSON.stringify(run.attachment.status()));
    assert.equal(run.attachment.commitTick(frame), true, JSON.stringify(run.attachment.status()));
    run.host.recordCpuPassRaceTelemetry(frame);
    if (run.host.pendingLaunch === consumedLaunch) run.host.pendingLaunch = null;
    if (performanceSamples) performanceSamples.push(performance.now() - startedAt);
  }
  return run;
}

function aggregate(rows, sampleTicksPerSeed = TICKS_PER_SAMPLE) {
  const totals = rows.reduce((result, row) => {
    for (const key of ['committedTicks', 'passes', 'completed', 'intercepted', 'recoveredByTeammate', 'overshot', 'unresolved',
      'shots', 'goals', 'restarts', 'strictStops', 'logicalTeamTurnovers', 'logicalContinuityViolations', 'dribbleTouches', 'firstTouchContacts',
      'involuntaryDeflections', 'deflectionOwnershipViolations', 'earlySourceSelfContacts',
      'completedSequenceCount', 'threePassChains', 'multiPassChanceSequences']) {
      result[key] = (result[key] || 0) + row[key];
    }
    return result;
  }, {});
  const mean = key => rounded(rows.reduce((sum, row) => sum + row[key], 0) / rows.length);
  const passTypes = {};
  const arrivalRaces = {};
  const firstTouchDispositions = {};
  const deflectionCategories = {};
  const deflectionReactionRatingSources = {};
  const dribblePhaseCounts = {};
  const passMix = {};
  const carrierIntentTickCounts = {};
  const carrierIntentReasonTicks = {};
  const deflectionRatings = [];
  const deflectionDelays = [];
  const deflectionAges = [];
  const passRaceTelemetry = {
    evaluations: 0,
    accepted: 0,
    rejected: 0,
    progressiveRiskAccepted: 0,
    reasons: {},
    passReleases: 0,
    progressiveRiskReleases: 0,
    releaseReasons: {}
  };
  for (const row of rows) {
    for (const [pattern, count] of Object.entries(row.passMix || {})) {
      passMix[pattern] = (passMix[pattern] || 0) + count;
    }
    for (const [type, count] of Object.entries(row.carrierIntentTickCounts || {})) {
      carrierIntentTickCounts[type] = (carrierIntentTickCounts[type] || 0) + count;
    }
    for (const [reason, count] of Object.entries(row.carrierIntentReasonTicks || {})) {
      carrierIntentReasonTicks[reason] = (carrierIntentReasonTicks[reason] || 0) + count;
    }
    for (const [phase, count] of Object.entries(row.dribblePhaseCounts || {})) {
      dribblePhaseCounts[phase] = (dribblePhaseCounts[phase] || 0) + count;
    }
    for (const [flightType, counts] of Object.entries(row.passTypes)) {
      passTypes[flightType] ||= { attempts: 0, completed: 0, intercepted: 0, recoveredByTeammate: 0, otherResolved: 0 };
      for (const key of Object.keys(passTypes[flightType])) passTypes[flightType][key] += counts[key];
    }
    for (const [outcome, race] of Object.entries(row.arrivalRaces)) (arrivalRaces[outcome] ||= []).push(race);
    for (const [disposition, count] of Object.entries(row.firstTouchDispositions)) {
      firstTouchDispositions[disposition] = (firstTouchDispositions[disposition] || 0) + count;
    }
    for (const [category, count] of Object.entries(row.deflectionCategories)) {
      deflectionCategories[category] = (deflectionCategories[category] || 0) + count;
    }
    for (const [source, count] of Object.entries(row.deflectionReactionRatingSources)) {
      deflectionReactionRatingSources[source] = (deflectionReactionRatingSources[source] || 0) + count;
    }
    for (const value of [row.deflectionReactionRatings.minimum, row.deflectionReactionRatings.median, row.deflectionReactionRatings.maximum]) {
      if (Number.isFinite(value)) deflectionRatings.push(value);
    }
    for (const value of [row.deflectionReactionDelayTicks.minimum, row.deflectionReactionDelayTicks.median, row.deflectionReactionDelayTicks.maximum]) {
      if (Number.isFinite(value)) deflectionDelays.push(value);
    }
    for (const value of [row.deflectionReleaseAgeTicks.minimum, row.deflectionReleaseAgeTicks.median, row.deflectionReleaseAgeTicks.maximum]) {
      if (Number.isFinite(value)) deflectionAges.push(value);
    }
    for (const key of ['evaluations', 'accepted', 'rejected', 'progressiveRiskAccepted', 'passReleases', 'progressiveRiskReleases']) {
      passRaceTelemetry[key] += row.passRaceTelemetry[key];
    }
    for (const [reason, count] of Object.entries(row.passRaceTelemetry.reasons)) {
      passRaceTelemetry.reasons[reason] = (passRaceTelemetry.reasons[reason] || 0) + count;
    }
    for (const [reason, count] of Object.entries(row.passRaceTelemetry.releaseReasons)) {
      passRaceTelemetry.releaseReasons[reason] = (passRaceTelemetry.releaseReasons[reason] || 0) + count;
    }
  }
  return {
    seeds: rows.map(row => row.seed),
    sampleTicksPerSeed,
    simulatedSecondsPerSeed: sampleTicksPerSeed / 60,
    ...totals,
    dribblePhaseCounts,
    completionRate: rounded(totals.completed / Math.max(1, totals.completed + totals.intercepted + totals.recoveredByTeammate + totals.overshot)),
    passMix,
    passMixShares: Object.fromEntries(Object.entries(passMix)
      .map(([key, value]) => [key, rounded(value / Math.max(1, totals.passes))])),
    carrierIntentTickCounts,
    carrierIntentTickShares: Object.fromEntries(Object.entries(carrierIntentTickCounts)
      .map(([key, value]) => [key, rounded(value / Math.max(1,
        Object.values(carrierIntentTickCounts).reduce((sum, count) => sum + count, 0)))])),
    carrierIntentReasonTicks,
    meanControlledCarrierStaticShare: mean('controlledCarrierStaticShare'),
    maximumCompletedPassChain: Math.max(...rows.map(row => row.maximumCompletedPassChain)),
    sequenceExamples: rows.flatMap(row => row.sequenceExamples.map(sequence => ({ seed: row.seed, ...sequence }))).slice(0, 12),
    progressiveRunnerPasses: rows.flatMap(row => row.progressiveRunnerPasses.map(pass => ({ seed: row.seed, ...pass }))).slice(0, 12),
    interceptionExamples: rows.flatMap(row => row.interceptionExamples.map(pass => ({ seed: row.seed, ...pass }))).slice(0, 12),
    passTypes,
    arrivalRaces: Object.fromEntries(Object.entries(arrivalRaces).map(([outcome, races]) => [outcome, {
      count: races.reduce((sum, race) => sum + race.count, 0),
      medianOfSeedTravelSeconds: rounded(percentile(races.map(race => race.medianTravelSeconds), 0.5)),
      medianOfSeedDistanceMetres: rounded(percentile(races.map(race => race.medianDistanceMetres), 0.5)),
      medianOfSeedLaunchSpeedMps: rounded(percentile(races.map(race => race.medianLaunchSpeedMps), 0.5)),
      medianOfSeedReceiverMissMetres: rounded(percentile(races.map(race => race.medianReceiverMissMetres), 0.5)),
      medianOfSeedAuthoredPointMissMetres: rounded(percentile(races.map(race => race.medianAuthoredPointMissMetres), 0.5))
    }])),
    meanPassesPerWallMinute: mean('passesPerWallMinute'),
    meanPossessionChangesPerWallMinute: mean('possessionChangesPerWallMinute'),
    meanLogicalPossessionChangesPerWallMinute: mean('logicalPossessionChangesPerWallMinute'),
    meanControlledPossessionShare: mean('controlledPossessionShare'),
    meanLogicalControlledPossessionShare: mean('logicalControlledPossessionShare'),
    meanPhysicalSeparationShare: mean('physicalSeparationShare'),
    scheduledTouchCadenceTicks: {
      minimum: Math.min(...rows.map(row => row.scheduledTouchCadenceTicks.minimum)),
      medianOfSeeds: rounded(percentile(rows.map(row => row.scheduledTouchCadenceTicks.median), 0.5)),
      p95OfSeeds: rounded(percentile(rows.map(row => row.scheduledTouchCadenceTicks.p95), 0.95)),
      maximum: Math.max(...rows.map(row => row.scheduledTouchCadenceTicks.maximum))
    },
    sameCarrierTouchIntervalTicks: {
      samples: rows.reduce((sum, row) => sum + row.sameCarrierTouchIntervalTicks.samples, 0),
      medianOfSeeds: rounded(percentile(rows.map(row => row.sameCarrierTouchIntervalTicks.median), 0.5)),
      p95OfSeeds: rounded(percentile(rows.map(row => row.sameCarrierTouchIntervalTicks.p95), 0.95))
    },
    firstTouchLedgerMaximum: Math.max(...rows.map(row => row.firstTouchLedgerMaximum)),
    firstTouchWatermarkMaximum: Math.max(...rows.map(row => row.firstTouchWatermarkMaximum)),
    firstTouchDispositions,
    deflectionCategories,
    deflectionReactionRatingSources,
    deflectionReactionRatings: {
      minimum: deflectionRatings.length ? Math.min(...deflectionRatings) : null,
      medianOfSeeds: deflectionRatings.length ? rounded(percentile(deflectionRatings, 0.5)) : null,
      maximum: deflectionRatings.length ? Math.max(...deflectionRatings) : null
    },
    deflectionReactionDelayTicks: {
      minimum: deflectionDelays.length ? Math.min(...deflectionDelays) : null,
      medianOfSeeds: deflectionDelays.length ? rounded(percentile(deflectionDelays, 0.5)) : null,
      maximum: deflectionDelays.length ? Math.max(...deflectionDelays) : null
    },
    deflectionReleaseAgeTicks: {
      minimum: deflectionAges.length ? Math.min(...deflectionAges) : null,
      medianOfSeeds: deflectionAges.length ? rounded(percentile(deflectionAges, 0.5)) : null,
      maximum: deflectionAges.length ? Math.max(...deflectionAges) : null
    },
    passRaceTelemetry,
    meanSupportAhead: mean('meanSupportAhead'),
    meanSupportWithinTenMetres: mean('meanSupportWithinTenMetres'),
    medianOfSeedPassDistanceMetres: rounded(percentile(rows.map(row => row.medianPassDistanceMetres), 0.5)),
    medianOfSeedLaunchSpeedMps: rounded(percentile(rows.map(row => row.medianLaunchSpeedMps), 0.5)),
    medianOfSeedTravelSeconds: rounded(percentile(rows.map(row => row.medianTravelSeconds), 0.5)),
    p90OfSeedTravelSeconds: rounded(percentile(rows.map(row => row.p90TravelSeconds), 0.9)),
    medianOfSeedMinimumTargetMissMetres: rounded(percentile(rows.map(row => row.medianMinimumTargetMissMetres), 0.5)),
    p90OfSeedMinimumTargetMissMetres: rounded(percentile(rows.map(row => row.p90MinimumTargetMissMetres), 0.9)),
    medianOfSeedMinimumIntendedPointMissMetres: rounded(percentile(rows.map(row => row.medianMinimumIntendedPointMissMetres), 0.5)),
    medianMovingSpeedMps: rounded(percentile(rows.map(row => row.medianMovingSpeedMps), 0.5)),
    p95MovingSpeedMps: rounded(percentile(rows.map(row => row.p95MovingSpeedMps), 0.95))
  };
}

function footballQualityGates(result, performanceResult, seedCount, ticksPerSeed) {
  const simulatedMinutes = seedCount * ticksPerSeed / 3600;
  const minimumPasses = Math.max(seedCount * 3, Math.ceil(simulatedMinutes * 14));
  const minimumShots = Math.max(1, Math.ceil(simulatedMinutes * .75));
  const minimumThreePassChains = Math.max(1, Math.ceil(simulatedMinutes * .75));
  const checks = {
    noStrictStops: result.strictStops === 0,
    noLogicalContinuityViolations: result.logicalContinuityViolations === 0,
    playablePassVolume: result.passes >= minimumPasses,
    credibleCompletionBand: result.completionRate >= .55 && result.completionRate <= .90,
    controlledPossessionContinuity: result.meanLogicalControlledPossessionShare >= .30 &&
      result.meanLogicalControlledPossessionShare <= .75,
    circulationNotDominant: result.passMixShares.shortSupport >= .20 && result.passMixShares.shortSupport <= .75,
    progressiveOptionsPresent: result.passMixShares.progressive >= .15,
    coordinatedRunsReleased: result.passMix.coordinatedRun >= Math.max(1, Math.ceil(simulatedMinutes)),
    movingRunnerRendezvousPresent: result.passMix.progressiveIntoMovingRunner >= 1,
    interceptionsPresent: result.intercepted >= 1,
    chancesPresent: result.shots >= minimumShots,
    combinationChainsPresent: result.threePassChains >= minimumThreePassChains,
    multiPassChancePresent: result.multiPassChanceSequences >= 1,
    carriersDoNotFreeze: result.meanControlledCarrierStaticShare <= .50,
    realtimeHeadroom: performanceResult.p95TickMs <= 12
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
    thresholds: { minimumPasses, minimumShots, minimumThreePassChains, simulatedMinutes: rounded(simulatedMinutes) }
  };
}

test('eight-seed FL V2 CPU-v-CPU adapter probe characterizes passing and tempo without a fallback', () => {
  const rows = [];
  const performanceSamples = [];
  for (const seed of ACTIVE_SEEDS) {
    const run = advance(createRun(seed), ACTIVE_TICKS_PER_SAMPLE, performanceSamples);
    const status = run.attachment.status();
    assert.equal(status.enabled, true, JSON.stringify(status));
    assert.equal(status.workflow, 'cpu-v-cpu');
    assert.equal(status.authority, 'fl-v2-offline-live');
    assert.equal(status.fallback, null);
    assert.equal(status.failure, null);
    assert.equal(status.committedTicks, ACTIVE_TICKS_PER_SAMPLE);
    assert.equal(status.authorityProfile.id,
      !TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY || !CPU_PASS_RACE_FILTER
      ? 'v2-football-baseline-reconciliation'
      : 'v2-full-candidate');
    rows.push(run.host.summary());
  }
  const result = aggregate(rows, ACTIVE_TICKS_PER_SAMPLE);
  assert.equal(result.seeds.length, ACTIVE_SEEDS.length);
  assert.equal(result.committedTicks, ACTIVE_TICKS_PER_SAMPLE * ACTIVE_SEEDS.length);
  if (ACTIVE_SEEDS === SEEDS && ACTIVE_TICKS_PER_SAMPLE === TICKS_PER_SAMPLE) {
    assert.ok(result.passes >= 8, JSON.stringify(result));
  }
  assert.equal(result.strictStops, 0);
  assert.equal(result.logicalContinuityViolations, 0);
  assert.equal(result.deflectionOwnershipViolations, 0);
  assert.equal(result.earlySourceSelfContacts, 0);
  if (TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY) {
    assert.ok(result.dribbleTouches > 0, JSON.stringify(result));
    assert.ok(result.scheduledTouchCadenceTicks.minimum >= 20, JSON.stringify(result));
    assert.ok(result.scheduledTouchCadenceTicks.maximum <= 34, JSON.stringify(result));
  }
  assert.ok(result.medianMovingSpeedMps <= Movement.DEFAULT_CONFIG.sprintSpeedMaximum * 1.08);
  const performanceResult = {
    samples: performanceSamples.length,
    meanTickMs: rounded(performanceSamples.reduce((sum, value) => sum + value, 0) / performanceSamples.length),
    p95TickMs: rounded(percentile(performanceSamples, 0.95)),
    maximumTickMs: rounded(Math.max(...performanceSamples))
  };
  assert.equal(performanceResult.samples, ACTIVE_TICKS_PER_SAMPLE * ACTIVE_SEEDS.length);
  const fullReport = {
    rows,
    aggregate: result,
    performance: performanceResult,
    footballQualityGates: footballQualityGates(result, performanceResult, rows.length, ACTIVE_TICKS_PER_SAMPLE),
    digest: digest({ rows, aggregate: result })
  };
  if (ENFORCE_FOOTBALL_GATES) {
    assert.equal(fullReport.footballQualityGates.passed, true, JSON.stringify(fullReport.footballQualityGates));
  }
  const report = process.env.FL_CPU_V2_COMPACT === '1'
    ? {
        profile: {
          id: !TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY || !CPU_PASS_RACE_FILTER
            ? 'v2-football-baseline-reconciliation'
            : 'v2-full-candidate',
          trueFeelPhysicalTouchAuthority: TRUE_FEEL_PHYSICAL_TOUCH_AUTHORITY,
          cpuPassRaceFilter: CPU_PASS_RACE_FILTER
        },
        rows: rows.map(row => ({
          seed: row.seed,
          passes: row.passes,
          completed: row.completed,
          intercepted: row.intercepted,
          overshot: row.overshot,
          unresolved: row.unresolved,
          completionRate: row.completionRate,
          passMix: row.passMix,
          logicalControlledPossessionShare: row.logicalControlledPossessionShare,
          logicalTeamTurnovers: row.logicalTeamTurnovers,
          shots: row.shots,
          threePassChains: row.threePassChains,
          multiPassChanceSequences: row.multiPassChanceSequences,
          maximumCompletedPassChain: row.maximumCompletedPassChain,
          controlledCarrierStaticShare: row.controlledCarrierStaticShare,
          strictStops: row.strictStops
        })),
        aggregate: result,
        performance: performanceResult,
        footballQualityGates: fullReport.footballQualityGates,
        digest: fullReport.digest
      }
    : fullReport;
  process.stdout.write(`CPU_V_CPU_V2_TEMPO ${JSON.stringify(report)}\n`);
});

test('forced on-path CPU-workflow passes characterize every passive body class and reaction delay', () => {
  const issuedCapability = contactCapability();
  const cases = [
    { category: 'non-target-teammate', options: {} },
    { category: 'opponent', options: { actorTeamId: 'opp' } },
    { category: 'intended-receiver', options: { intendedReceiverId: 'bystander' } }
  ];
  const rows = [];
  const timings = [];
  for (const fixture of cases) {
    const request = bodyReactionScenario(fixture.options);
    const startedAt = performance.now();
    const result = Contact.compose(request, issuedCapability);
    timings.push(performance.now() - startedAt);
    assert.equal(result.contactType, 'involuntary-deflection');
    assert.equal(result.ownerCandidateId, null);
    assert.equal(result.presentation.possessionDisposition, 'remain-loose');
    assert.equal(result.ballState.contactCount, request.ballState.contactCount + 1);
    assert.deepEqual(result, Contact.compose(request, issuedCapability));
    rows.push({
      category: fixture.category,
      actorId: result.presentation.playerId,
      actorTeamId: result.presentation.teamId,
      intended: result.detail.intended,
      reactionRating: result.detail.reaction.rating,
      reactionRatingSource: result.detail.reaction.ratingSource,
      reactionDelayTicks: result.detail.reaction.delayTicks,
      releaseAgeTicks: result.detail.reaction.ageTicks,
      reason: result.presentation.reason,
      incomingSpeedMps: rounded(Math.hypot(...Object.values(result.detail.incomingVelocity))),
      outgoingSpeedMps: rounded(Math.hypot(...Object.values(result.detail.outgoingVelocity))),
      ownerCandidateId: result.ownerCandidateId
    });
  }

  const ratingRows = [];
  for (const reactions of [1, 25, 50, 75, 99]) {
    const request = bodyReactionScenario({ actorReactions: reactions });
    const result = Contact.compose(request, issuedCapability);
    assert.equal(result.contactType, 'involuntary-deflection');
    ratingRows.push({
      reactions,
      delayTicks: result.detail.reaction.delayTicks,
      ratingSource: result.detail.reaction.ratingSource
    });
  }
  assert.deepEqual(ratingRows.map(row => row.delayTicks), [12, 10, 7, 5, 3]);

  // A releasing player stays physically protected for the complete reaction
  // horizon, preventing the repeated source-body contacts seen at ages 3..12
  // in FL-MSQN90FY.
  for (const ageTicks of [0, 1, 2, 3, 6, 12, 17]) {
    const protectedResult = Contact.compose(bodyReactionScenario({
      tick: 20 + ageTicks,
      actorX: 90,
      actorY: 20,
      sourceX: 52.5
    }), issuedCapability);
    assert.equal(protectedResult.status, 'no-contact');
    assert.equal(protectedResult.ownerCandidateId, null);
  }
  const sourceAfterProtection = Contact.compose(bodyReactionScenario({
    tick: 38,
    actorX: 90,
    actorY: 20,
    sourceX: 52.5
  }), issuedCapability);
  assert.equal(sourceAfterProtection.contactType, 'involuntary-deflection');
  assert.equal(sourceAfterProtection.presentation.playerId, 'source');
  assert.equal(sourceAfterProtection.ownerCandidateId, null);
  rows.push({
    category: 'source-after-protection',
    actorId: sourceAfterProtection.presentation.playerId,
    actorTeamId: sourceAfterProtection.presentation.teamId,
    intended: sourceAfterProtection.detail.intended,
    reactionRating: sourceAfterProtection.detail.reaction.rating,
    reactionRatingSource: sourceAfterProtection.detail.reaction.ratingSource,
    reactionDelayTicks: sourceAfterProtection.detail.reaction.delayTicks,
    releaseAgeTicks: sourceAfterProtection.detail.reaction.ageTicks,
    reason: sourceAfterProtection.presentation.reason,
    incomingSpeedMps: rounded(Math.hypot(...Object.values(sourceAfterProtection.detail.incomingVelocity))),
    outgoingSpeedMps: rounded(Math.hypot(...Object.values(sourceAfterProtection.detail.outgoingVelocity))),
    ownerCandidateId: sourceAfterProtection.ownerCandidateId
  });

  process.stdout.write(`CPU_V_CPU_V2_REACTION_BODY ${JSON.stringify({
    rows,
    ratingRows,
    earlySourceSelfContacts: 0,
    ownershipViolations: rows.filter(row => row.ownerCandidateId != null).length,
    timing: {
      samples: timings.length,
      meanComposeMs: rounded(timings.reduce((sum, value) => sum + value, 0) / timings.length),
      maximumComposeMs: rounded(Math.max(...timings))
    },
    digest: digest({ rows, ratingRows })
  })}\n`);
});

test('isolated all-CPU carry publishes a readable physical touch interval distribution', () => {
  const run = createRun(SEEDS[0]);
  run.host.suppressActions = true;
  for (const player of run.host.snapshot.players) {
    if (player.teamId === 'opp') {
      player.x = HOST.xMin;
      player.y = HOST.yMin;
      player.contactEligible = false;
    }
  }
  advance(run, 240);
  const touches = run.host.metrics.dribbleTouches;
  const intervals = touches.slice(1).map((row, index) => row.tick - touches[index].tick);
  assert.ok(touches.length >= 5, JSON.stringify(touches));
  assert.ok(intervals.every(value => value >= Dribbling.CONFIG.minimumTouchCadenceTicks), intervals.join(','));
  assert.ok(intervals.every(value => value <= Dribbling.CONFIG.maximumTouchCadenceTicks + 2), intervals.join(','));
  assert.equal(run.host.metrics.logicalContinuityViolations, 0);
  process.stdout.write(`CPU_V_CPU_V2_TOUCH_CADENCE ${JSON.stringify({
    touchTicks: touches.map(row => row.tick),
    intervals,
    distribution: {
      samples: intervals.length,
      minimum: Math.min(...intervals),
      median: percentile(intervals, 0.5),
      p95: percentile(intervals, 0.95),
      maximum: Math.max(...intervals)
    },
    logicalPossessionChanges: run.host.metrics.logicalPossessionChanges,
    physicalSeparationTicks: run.host.metrics.physicalSeparationTicks,
    logicalContinuityViolations: run.host.metrics.logicalContinuityViolations,
    digest: digest(run.host.serialize())
  })}\n`);
});

test('same-seed replay and export/restore chunking are byte-deterministic', () => {
  const seed = SEEDS[2];
  const directA = advance(createRun(seed), 1200);
  const directB = advance(createRun(seed), 1200);
  assert.equal(digest(directA.host.serialize()), digest(directB.host.serialize()));
  assert.equal(digest(directA.attachment.exportState()), digest(directB.attachment.exportState()));

  const firstChunk = advance(createRun(seed), 600);
  const hostCheckpoint = firstChunk.host.serialize();
  const adapterCheckpoint = firstChunk.attachment.exportState();
  const restored = advance(createRun(seed, hostCheckpoint, adapterCheckpoint), 600);
  if (digest(restored.host.serialize()) !== digest(directA.host.serialize())) {
    process.stdout.write(`CPU_V_CPU_V2_RESTORE_DIFF ${JSON.stringify(firstDifferences(restored.host.serialize(), directA.host.serialize()))}\n`);
  }
  assert.equal(digest(restored.host.serialize()), digest(directA.host.serialize()));
  assert.equal(
    restored.attachment.exportState().attachmentGeneration,
    directA.attachment.exportState().attachmentGeneration + 1
  );
  assert.equal(digest(adapterOperationalState(restored.attachment)), digest(adapterOperationalState(directA.attachment)));
  process.stdout.write(`CPU_V_CPU_V2_DETERMINISM ${JSON.stringify({
    seed,
    ticks: 1200,
    hostDigest: digest(directA.host.serialize()),
    adapterOperationalDigest: digest(adapterOperationalState(directA.attachment)),
    checkpointHostDigest: digest(hostCheckpoint),
    checkpointAdapterDigest: digest(adapterCheckpoint),
    restoredAttachmentGeneration: restored.attachment.exportState().attachmentGeneration
  })}\n`);
});

test('bad chronology fails closed at the adapter boundary for the strict host to halt', () => {
  const run = advance(createRun(SEEDS[0]), 10);
  const malformed = run.host.input(run.host.snapshot.tick + 2);
  assert.equal(run.attachment.planTick(malformed), null);
  const status = run.attachment.status();
  assert.equal(status.enabled, false);
  assert.equal(status.lifecycle, 'self-disabled-fallback');
  assert.equal(status.authority, 'build-173');
  assert.equal(status.fallback, 'build-173');
  assert.match(status.failure, /exactly sequential/);
  process.stdout.write(`CPU_V_CPU_V2_STRICT_STOP ${JSON.stringify({
    enabled: status.enabled,
    lifecycle: status.lifecycle,
    workflow: status.workflow,
    authority: status.authority,
    fallback: status.fallback,
    failure: status.failure,
    committedTicks: status.committedTicks,
    lastCommittedTick: status.lastCommittedTick,
    statusDigest: digest(status)
  })}\n`);
});
