import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const paths = {
  movement: path.join(root, 'match-engine', 'movement-engine-v2.js'),
  ball: path.join(root, 'match-engine', 'ball-engine-v2.js'),
  touch: path.join(root, 'match-engine', 'first-touch-v2.js'),
  adapter: path.join(root, 'match-engine', 'first-touch-authority-adapter-v2.js'),
  match: path.join(root, 'match-engine', 'match.html')
};
const source = Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, fs.readFileSync(value, 'utf8')]));
const require = createRequire(import.meta.url);
const Movement = require(paths.movement);
const Ball = require(paths.ball);
const FirstTouch = require(paths.touch);
const Adapter = require(paths.adapter);

function capability(workflow = 'offline-v2-lab') {
  return Adapter.createCapability({
    enabled: true,
    online: false,
    liveAuthority: false,
    workflow,
    acknowledgement: Adapter.ACKNOWLEDGEMENT
  });
}

function energy(ball) {
  return 0.5 * ball.mass * (ball.velocity.x ** 2 + ball.velocity.y ** 2 + ball.velocity.z ** 2) +
    0.5 * ball.inertia * (ball.angularVelocity.x ** 2 + ball.angularVelocity.y ** 2 + ball.angularVelocity.z ** 2);
}

function finiteTree(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finiteTree);
  if (value && typeof value === 'object') return Object.values(value).every(finiteTree);
  return true;
}

test('CommonJS surface is complete, frozen and locked to the three current candidate schemas', () => {
  assert.equal(Movement.VERSION, '2.0.0-dormant');
  assert.equal(Ball.VERSION, '2.0.0-shadow');
  assert.equal(FirstTouch.VERSION, '2.0.0-dormant');
  assert.equal(Adapter.VERSION, '2.0.0-dormant-authority-adapter');
  assert.equal(Adapter.ROSTER_ELIGIBILITY_SCHEMA, 'football-legacy-first-touch-roster-eligibility-v2');
  assert.equal(Adapter.CONTACT_IDENTITY_SCHEMA, 'football-legacy-first-touch-contact-identity-v2');
  assert.equal(Object.isFrozen(Adapter), true);
  for (const name of [
    'createCapability', 'resolve', 'stableJson', 'createCleanReceptionFixture',
    'createPressuredHeavyTouchFixture', 'createMovingAwayMissFixture',
    'createCustomInertiaFixture', 'createReplayRollbackFixture'
  ]) assert.equal(typeof Adapter[name], 'function', name);
});

test('plain browser loading coexists with Movement, Ball and First Touch and matches CommonJS bytes', () => {
  const context = vm.createContext({});
  vm.runInContext('this.window = this;', context);
  vm.runInContext(source.movement, context, { filename: paths.movement });
  vm.runInContext(source.ball, context, { filename: paths.ball });
  vm.runInContext(source.touch, context, { filename: paths.touch });
  vm.runInContext(source.adapter, context, { filename: paths.adapter });
  const Browser = context.FootballLegacyFirstTouchAuthorityAdapterV2;
  assert.equal(Browser.VERSION, Adapter.VERSION);
  assert.equal(Object.isFrozen(Browser), true);
  const browserJson = vm.runInContext(`(() => {
    const A = FootballLegacyFirstTouchAuthorityAdapterV2;
    const c = A.createCapability({
      enabled: true, online: false, liveAuthority: false, workflow: 'offline-v2-lab',
      acknowledgement: A.ACKNOWLEDGEMENT
    });
    return A.stableJson(A.resolve(A.createCleanReceptionFixture(), c));
  })()`, context);
  const nodeJson = Adapter.stableJson(Adapter.resolve(Adapter.createCleanReceptionFixture(), capability()));
  assert.equal(browserJson, nodeJson);
});

test('EXACT OFFLINE COMPOSITION: match.html conditionally loads the advisory adapter and the module exports no direct apply or mutation surface', () => {
  assert.match(source.match, /if\(!eligible\)return;[\s\S]*'first-touch-authority-adapter-v2\.js'/);
  assert.doesNotMatch(source.match, /<script[^>]+src=["']first-touch-authority-adapter-v2\.js/);
  assert.doesNotMatch(source.adapter,
    /document\.|querySelector|requestAnimationFrame|addEventListener|fetch\(|WebSocket|RTCPeer|Date\.now|performance\.now|Math\.random/);
  assert.equal(Object.keys(Adapter).some(key => /apply|commit|consume|mutate|live/i.test(key)), false);
});

test('capability must be factory-issued, exact, workflow-matched, offline and non-live', () => {
  const request = Adapter.createCleanReceptionFixture();
  const forged = {
    schema: Adapter.CAPABILITY_SCHEMA,
    version: Adapter.VERSION,
    workflow: request.workflow,
    authority: Adapter.AUTHORITY,
    online: false,
    liveAuthority: false,
    advisoryOnly: true
  };
  assert.throws(() => Adapter.resolve(request, forged), /issued dormant offline/);
  assert.throws(() => Adapter.createCapability({
    enabled: true, online: true, liveAuthority: false, workflow: request.workflow,
    acknowledgement: Adapter.ACKNOWLEDGEMENT
  }), /exact dormant offline/);
  assert.throws(() => Adapter.resolve(request, capability('shadow')), /issued dormant offline/);
});

test('clean reception maps canonical Movement identity/attributes and emits advisory possession handoff once', () => {
  const request = Adapter.createCleanReceptionFixture();
  const before = Adapter.stableJson(request);
  const result = Adapter.resolve(request, capability());
  assert.equal(Adapter.stableJson(request), before);
  assert.equal(result.outcome, 'controlled');
  assert.equal(result.status, 'pending');
  assert.equal(result.ownerCandidateId, 'receiver');
  assert.equal(result.handoff.schema, Adapter.HANDOFF_SCHEMA);
  assert.equal(result.handoff.exactOnce, true);
  assert.equal(result.handoff.advisoryOnly, true);
  assert.equal(result.handoff.liveApplied, false);
  assert.equal(result.handoff.possession.priorOwnerId, null);
  assert.equal(result.handoff.possession.ownerCandidateId, 'receiver');
  assert.equal(result.handoff.possession.disposition, 'candidate-acquire');
  assert.equal(result.handoff.preconditions.expectedBallOwnerId, null);
  assert.equal(result.contactIdentity.schema, Adapter.CONTACT_IDENTITY_SCHEMA);
  assert.equal(result.contactIdentityDigest, result.handoff.preconditions.contactIdentityDigest);
  assert.equal(Adapter.stableJson(result.contactIdentity), Adapter.stableJson(result.handoff.preconditions.contactIdentity));
  assert.equal(result.handoff.contact.ballState.contactCount, request.ball.contactCount + 1);
  assert.equal(result.handoff.contact.lastContact.colliderId, 'receiver');
  assert.equal(result.handoff.contact.lastContact.outerTick, request.tick);
  assert.equal(Ball.isBallState(result.handoff.contact.ballState), true);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'movementWorld'), false);
});

test('pressured weak receiver produces a deterministic heavy-touch contact with no possession candidate', () => {
  const request = Adapter.createPressuredHeavyTouchFixture();
  const first = Adapter.resolve(request, capability());
  const reordered = structuredClone(request);
  reordered.pressurePlayerIds.reverse();
  const second = Adapter.resolve(reordered, capability());
  assert.equal(first.outcome, 'loose');
  assert.equal(first.reason, 'heavy-touch');
  assert.equal(first.ownerCandidateId, null);
  assert.equal(first.handoff.possession.disposition, 'remain-loose');
  assert.equal(first.handoff.possession.ownerCandidateId, null);
  assert.equal(Adapter.stableJson(first), Adapter.stableJson(second));
});

test('moving-away geometry miss produces no contact or possession handoff', () => {
  const request = Adapter.createMovingAwayMissFixture();
  const result = Adapter.resolve(request, capability());
  assert.equal(result.outcome, 'missed');
  assert.equal(result.reason, 'contact-geometry-unreachable');
  assert.equal(result.status, 'no-contact');
  assert.equal(result.ownerCandidateId, null);
  assert.equal(result.candidateHandoffId, null);
  assert.equal(result.handoff, null);
});

test('airborne nonidentity orientation stays a semantic no-contact miss after Ball cloning', () => {
  const request = Adapter.createMovingAwayMissFixture();
  const length = Math.hypot(0.21, -0.34, 0.18, 0.89);
  request.ball.position.z = 1.4;
  request.ball.grounded = false;
  request.ball.regime = Ball.REGIMES.FLIGHT;
  request.ball.orientation = {
    x: 0.21 / length,
    y: -0.34 / length,
    z: 0.18 / length,
    w: 0.89 / length
  };
  const before = Adapter.stableJson(request);
  const result = Adapter.resolve(request, capability());
  assert.equal(result.outcome, 'missed');
  assert.equal(result.status, 'no-contact');
  assert.equal(result.ownerCandidateId, null);
  assert.equal(result.handoff, null);
  assert.equal(Adapter.stableJson(request), before);
});

test('custom Ball inertia survives handoff and passive true energy cannot rise', () => {
  const request = Adapter.createCustomInertiaFixture();
  const result = Adapter.resolve(request, capability());
  assert.equal(result.outcome, 'loose');
  assert.equal(result.sourceTelemetry.activeEnergyContact, false);
  assert.equal(result.handoff.contact.ballState.inertia, 0.1);
  assert.ok(energy(result.handoff.contact.ballState) <= energy(request.ball) + 1e-9);
  assert.ok(Math.abs(result.sourceTelemetry.afterEnergy - energy(result.handoff.contact.ballState)) <= 1e-12);
});

test('replay/rollback ledger gives stable IDs, suppresses consumed duplicates and restores on rollback', () => {
  const base = Adapter.createReplayRollbackFixture();
  const first = Adapter.resolve(base, capability());
  const replay = Adapter.resolve(structuredClone(base), capability());
  assert.equal(Adapter.stableJson(replay), Adapter.stableJson(first));

  const consumedRequest = structuredClone(base);
  consumedRequest.consumedHandoffIds = [first.candidateHandoffId];
  const consumed = Adapter.resolve(consumedRequest, capability());
  assert.equal(consumed.candidateHandoffId, first.candidateHandoffId);
  assert.equal(consumed.status, 'already-consumed');
  assert.equal(consumed.handoff, null);

  const rolledBack = Adapter.resolve(structuredClone(base), capability());
  assert.equal(Adapter.stableJson(rolledBack), Adapter.stableJson(first));
});

test('irrelevant valid ledger order does not change a pending candidate', () => {
  const base = Adapter.createReplayRollbackFixture();
  base.consumedHandoffIds = [
    'first-touch-v2:4:0000000000000001',
    'first-touch-v2:3:0000000000000002'
  ];
  const first = Adapter.resolve(base, capability());
  const reordered = structuredClone(base);
  reordered.consumedHandoffIds.reverse();
  const second = Adapter.resolve(reordered, capability());
  assert.equal(Adapter.stableJson(first), Adapter.stableJson(second));
  assert.equal(first.status, 'pending');
});

test('tick/fixed-step chronology requires Movement, Ball and adapter to be the same snapshot', () => {
  const worldMismatch = Adapter.createCleanReceptionFixture();
  worldMismatch.movementWorld.tick -= 1;
  assert.throws(() => Adapter.resolve(worldMismatch, capability()), /movementWorld\.tick/);

  const ballMismatch = Adapter.createCleanReceptionFixture();
  ballMismatch.ball.lastOuterTick -= 1;
  assert.throws(() => Adapter.resolve(ballMismatch, capability()), /lastOuterTick/);

  const stepMismatch = Adapter.createCleanReceptionFixture();
  stepMismatch.fixedTickSeconds = 1 / 30;
  assert.throws(() => Adapter.resolve(stepMismatch, capability()), /fixedTickSeconds/);
});

test('authority roster eligibility is explicit, exact and fail-closed for dismissed or unavailable receivers', () => {
  const valid = Adapter.createCleanReceptionFixture();
  assert.deepEqual(Object.keys(valid.rosterEligibility).sort(), [
    'available', 'contactEligible', 'playerId', 'schema', 'sentOff', 'teamId', 'tick'
  ]);
  assert.equal(valid.rosterEligibility.schema, Adapter.ROSTER_ELIGIBILITY_SCHEMA);

  const missing = Adapter.createCleanReceptionFixture();
  delete missing.rosterEligibility;
  assert.throws(() => Adapter.resolve(missing, capability()), /rosterEligibility/);

  for (const [field, value] of [['sentOff', true], ['available', false], ['contactEligible', false]]) {
    const ineligible = Adapter.createCleanReceptionFixture();
    ineligible.rosterEligibility[field] = value;
    assert.throws(() => Adapter.resolve(ineligible, capability()), /sent-off|unavailable|contact-ineligible/);
  }

  const stale = Adapter.createCleanReceptionFixture();
  stale.rosterEligibility.tick -= 1;
  assert.throws(() => Adapter.resolve(stale, capability()), /exactly match/);

  const ambiguous = Adapter.createCleanReceptionFixture();
  ambiguous.rosterEligibility.eligibleForContact = true;
  assert.throws(() => Adapter.resolve(ambiguous, capability()), /exact contact-eligible/);
});

test('contact exact-once identity is pre-contact authority state, not seed, pressure or result telemetry', () => {
  const request = Adapter.createPressuredHeavyTouchFixture();
  const first = Adapter.resolve(request, capability());
  assert.equal(first.status, 'pending');

  const seedVariant = structuredClone(request);
  seedVariant.seed += 1;
  seedVariant.consumedHandoffIds = [first.candidateHandoffId];
  const seeded = Adapter.resolve(seedVariant, capability());
  assert.equal(seeded.candidateHandoffId, first.candidateHandoffId);
  assert.equal(seeded.contactIdentityDigest, first.contactIdentityDigest);
  assert.equal(Adapter.stableJson(seeded.contactIdentity), Adapter.stableJson(first.contactIdentity));
  assert.equal(seeded.status, 'already-consumed');
  assert.equal(seeded.handoff, null);
  assert.notEqual(seeded.attemptDigest, first.attemptDigest);

  const pressureVariant = structuredClone(request);
  pressureVariant.pressurePlayerIds = [];
  pressureVariant.consumedHandoffIds = [first.candidateHandoffId];
  const unpressured = Adapter.resolve(pressureVariant, capability());
  assert.equal(unpressured.candidateHandoffId, first.candidateHandoffId);
  assert.equal(unpressured.contactIdentityDigest, first.contactIdentityDigest);
  assert.equal(unpressured.status, 'already-consumed');
  assert.equal(unpressured.handoff, null);
  assert.notEqual(unpressured.attemptDigest, first.attemptDigest);
});

test('same-tick or future Ball contact chronology cannot be re-fed as a fresh contact opportunity', () => {
  const request = Adapter.createPressuredHeavyTouchFixture();
  const first = Adapter.resolve(request, capability());
  assert.equal(first.outcome, 'loose');
  const refeed = structuredClone(request);
  refeed.ball = structuredClone(first.handoff.contact.ballState);
  refeed.consumedHandoffIds = [first.candidateHandoffId];
  assert.throws(() => Adapter.resolve(refeed, capability()), /same-tick or future contact/);
});

test('identity, team, pressure and loose-possession preconditions fail closed', () => {
  const badProfile = Adapter.createCleanReceptionFixture();
  badProfile.receiverProfile.teamId = 'away';
  assert.throws(() => Adapter.resolve(badProfile, capability()), /identity and team/);

  const supplementalOverride = Adapter.createCleanReceptionFixture();
  supplementalOverride.receiverProfile.control = 99;
  assert.throws(() => Adapter.resolve(supplementalOverride, capability()), /only supplement/);

  const ownPressure = Adapter.createCleanReceptionFixture();
  ownPressure.pressurePlayerIds = ['receiver'];
  assert.throws(() => Adapter.resolve(ownPressure, capability()), /opposing team/);

  const unknownPressure = Adapter.createCleanReceptionFixture();
  unknownPressure.pressurePlayerIds = ['missing-player'];
  assert.throws(() => Adapter.resolve(unknownPressure, capability()), /canonical Movement/);

  const owned = Adapter.createCleanReceptionFixture();
  owned.movementWorld.ballOwnerId = 'receiver';
  owned.movementWorld.players.find(player => player.id === 'receiver').hasBall = true;
  assert.throws(() => Adapter.resolve(owned, capability()), /loose ball/);
});

test('coordinate and SI range contracts fail while valid Movement slide speed remains contact-safe', () => {
  const coordinate = Adapter.createCleanReceptionFixture();
  coordinate.coordinateSystem = 'pixels';
  assert.throws(() => Adapter.resolve(coordinate, capability()), /coordinate system/);

  const fastReceiver = Adapter.createCleanReceptionFixture();
  fastReceiver.movementWorld.players.find(player => player.id === 'receiver').velocity.x = 15;
  const fastResult = Adapter.resolve(fastReceiver, capability());
  assert.equal(fastResult.status, 'pending');
  assert.equal(fastResult.ownerCandidateId, null,
    'a receiver moving faster than the controlled-ball ceiling may touch but cannot attach the ball');
  assert.ok(Math.hypot(
    fastResult.handoff.contact.ballState.velocity.x,
    fastResult.handoff.contact.ballState.velocity.y,
    fastResult.handoff.contact.ballState.velocity.z
  ) <= FirstTouch.DEFAULT_CONFIG.maximumOutputSpeed + 1e-9,
  'receiver locomotion speed must not raise First Touch ball output above its separate ceiling');

  const unsafeReceiver = Adapter.createCleanReceptionFixture();
  unsafeReceiver.movementWorld.players.find(player => player.id === 'receiver').velocity.x = 20.01;
  assert.throws(() => Adapter.resolve(unsafeReceiver, capability()), /Movement velocity.*input envelope|SI safety envelope/);

  const belowGround = Adapter.createCleanReceptionFixture();
  belowGround.ball.position.z = 0;
  assert.throws(() => Adapter.resolve(belowGround, capability()), /ground-supported radius/);
});

test('hostile request graphs, accessors, invalid ledger rows and intent energy forgery fail closed', () => {
  const cyclic = Adapter.createCleanReceptionFixture();
  cyclic.ball.metadata.self = cyclic;
  assert.throws(() => Adapter.resolve(cyclic, capability()), /cycles/);

  const accessor = Adapter.createCleanReceptionFixture();
  Object.defineProperty(accessor.ball.metadata, 'trap', { enumerable: true, get() { return 1; } });
  assert.throws(() => Adapter.resolve(accessor, capability()), /stable enumerable data property/);

  const ledger = Adapter.createCleanReceptionFixture();
  ledger.consumedHandoffIds = ['not-a-handoff'];
  assert.throws(() => Adapter.resolve(ledger, capability()), /not an adapter handoff id/);

  const forgedIntent = Adapter.createCleanReceptionFixture();
  forgedIntent.intent.active = true;
  assert.throws(() => Adapter.resolve(forgedIntent, capability()), /energy contract/);
});

test('all successful outputs are deterministic, finite, deeply frozen and detached from inputs', () => {
  const request = Adapter.createPressuredHeavyTouchFixture();
  const before = Adapter.stableJson(request);
  const first = Adapter.resolve(request, capability());
  const second = Adapter.resolve(structuredClone(request), capability());
  assert.equal(Adapter.stableJson(first), Adapter.stableJson(second));
  assert.equal(Adapter.stableJson(request), before);
  assert.equal(finiteTree(first), true);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.handoff), true);
  assert.equal(Object.isFrozen(first.handoff.contact.ballState), true);
  assert.equal(Object.isFrozen(first.sourceTelemetry.quality), true);
  assert.doesNotMatch(JSON.stringify(first), /Infinity|NaN/);
});

test('each allowed workflow remains offline and resolves only under its matching issued capability', () => {
  for (const workflow of Adapter.WORKFLOWS) {
    const request = Adapter.createCleanReceptionFixture();
    request.workflow = workflow;
    const result = Adapter.resolve(request, capability(workflow));
    assert.equal(result.workflow, workflow);
    assert.equal(result.online, false);
    assert.equal(result.liveApplied, false);
  }
});
