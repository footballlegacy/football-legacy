import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  actualPlayerId,
  captureOptions,
  captureTickInput,
  clone,
  observationInput,
  snapshot,
  stablePlayerId,
  walkinSnapshot,
  walkoutSnapshot
} from './fixtures/build173-shadow-host-capture-fixture.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const adapterPath = path.join(root, 'match-engine', 'build173-live-shadow-adapter-v2.js');
const capturePath = path.join(root, 'match-engine', 'build173-shadow-host-capture-v2.js');
const adapterSource = fs.readFileSync(adapterPath, 'utf8');
const captureSource = fs.readFileSync(capturePath, 'utf8');
const require = createRequire(import.meta.url);
const Adapter = require(adapterPath);
const Capture = require(capturePath);

function recursiveKeys(value, output = []) {
  if (Array.isArray(value)) value.forEach(item => recursiveKeys(item, output));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
    output.push(key);
    recursiveKeys(item, output);
  });
  return output;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function arm(epochId = 'independent-composition-epoch', options = {}) {
  const session = Capture.createCaptureSession(captureOptions('quick-play', options));
  const kickoff = snapshot({ kickoffOptional: true });
  const armed = session.arm(kickoff, { epochId });
  assert.equal(armed.lifecycle, 'armed', armed.reason);
  return { session, kickoff };
}

function accepted(session, before, after, sequence, overrides = {}) {
  const result = session.captureTick(captureTickInput(before, after, { sequence, ...overrides }));
  assert.equal(result.accepted, true, result.reason);
  return result;
}

test('CommonJS and browser globals expose the same frozen read-only composition surface', () => {
  const context = vm.createContext({ window: {} });
  vm.runInContext(adapterSource, context, { filename: adapterPath });
  vm.runInContext(captureSource, context, { filename: capturePath });
  const Browser = context.window.FootballLegacyBuild173ShadowHostCaptureV2;
  assert.equal(Browser.VERSION, Capture.VERSION);
  assert.equal(Browser.HOST_AUTHORITY, 'build-173-legacy');
  assert.equal(Object.isFrozen(Capture), true);
  assert.equal(Object.isFrozen(Browser), true);
  for (const forbidden of ['apply', 'project', 'commit', 'mutate', 'candidateState', 'candidateProjection']) {
    assert.equal(Object.prototype.hasOwnProperty.call(Capture, forbidden), false, forbidden);
    assert.equal(Object.prototype.hasOwnProperty.call(Browser, forbidden), false, forbidden);
  }
  for (const projector of ['toUnifiedSnapshot', 'assertObservation']) {
    assert.equal(Object.prototype.hasOwnProperty.call(Capture, projector), false, projector);
    assert.equal(Object.prototype.hasOwnProperty.call(Adapter, projector), false, projector);
  }
});

test('reserved keys and unstable accessors are rejected before mapping or orchestrator execution', () => {
  for (const unsafe of ['__proto__', 'prototype', 'constructor']) {
    const observation = clone(Capture.prepareObservation(observationInput()));
    Object.defineProperty(observation.environment, unsafe, {
      enumerable: true,
      configurable: true,
      value: { polluted: true }
    });
    const validation = Adapter.validateObservation(observation, { workflow: 'quick-play' });
    assert.equal(validation.valid, false, unsafe);
    assert.match(validation.errors.join(' '), /reserved|unsafe/i, unsafe);
  }

  const accessor = clone(Capture.prepareObservation(observationInput()));
  let reads = 0;
  Object.defineProperty(accessor.environment, 'unstable', {
    enumerable: true,
    configurable: true,
    get() {
      reads += 1;
      return reads === 1 ? {} : new Date(0);
    }
  });
  const validation = Adapter.validateObservation(accessor, { workflow: 'quick-play' });
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /accessor|plain|stable|data property/i);
});

test('default-off and every declared online/config marker freeze before malformed host data is inspected', () => {
  const disabled = Capture.createCaptureSession({ teams: { malformed: true } });
  assert.equal(disabled.status.reason, 'disabled-by-default');
  assert.equal(disabled.arm({ cyclic: null }).trace.type, 'arm-skipped');
  for (const markers of [
    { onlineRole: 'host' }, { onlineRoom: 'ROOM' }, { onlineBuild: '173' },
    { mode: 'online-versus' }, { matchType: 'online' }, { configOnline: true },
    { controllersOnline: true }, { urlMarkers: ['join=ROOM'] }
  ]) {
    const session = Capture.createCaptureSession({
      enabled: true,
      acknowledgement: Capture.ACKNOWLEDGEMENT,
      workflow: 'quick-play',
      onlineMarkers: markers,
      teams: { deliberately: 'malformed' }
    });
    assert.equal(session.status.enabled, false);
    assert.equal(session.status.reason, 'online-frozen');
    assert.equal(session.arm({ deliberately: 'malformed' }).trace.type, 'arm-skipped');
  }
});

test('exact walkout-arm-tick-finish-reset lifecycle keeps a fresh epoch and immutable sequencing', () => {
  const session = Capture.createCaptureSession(captureOptions());
  assert.equal(session.arm(walkoutSnapshot(), { epochId: 'walkout-must-not-arm' }).lifecycle, 'awaiting-kickoff');
  const kickoff = deepFreeze(snapshot({ kickoffOptional: true }));
  assert.equal(session.arm(kickoff, { epochId: 'lifecycle-epoch-a' }).lifecycle, 'armed');
  const after = deepFreeze(snapshot({ kickoffOptional: true, clockFrames: 0.125 }));
  accepted(session, kickoff, after, 1);
  assert.equal(session.finish('before-full-time-walkin').lifecycle, 'finished');
  assert.equal(session.captureTick(captureTickInput(after, walkinSnapshot(), { sequence: 2 })).trace.type,
    'capture-skipped');
  assert.equal(session.reset().lifecycle, 'awaiting-kickoff');
  assert.equal(session.arm(kickoff, { epochId: 'lifecycle-epoch-a' }).lifecycle, 'self-frozen');
  session.reset();
  assert.equal(session.arm(kickoff, { epochId: 'lifecycle-epoch-b' }).lifecycle, 'armed');
});

test('capture-to-adapter clock agreement booleans remain true without leaking candidate labels', () => {
  const { session, kickoff } = arm('clock-agreement-epoch');
  const after = snapshot({ kickoffOptional: true, clockFrames: 0.125 });
  const result = accepted(session, kickoff, after, 1);
  assert.equal(result.adapterTelemetry.comparison.clock.periodAgreement, true);
  assert.equal(result.adapterTelemetry.comparison.clock.phaseAgreement, true);
  const keys = recursiveKeys(result);
  for (const forbidden of ['candidatePeriod', 'candidatePhase', 'legacyPeriod', 'legacyPhase']) {
    assert.equal(keys.includes(forbidden), false, forbidden);
  }
});

test('clock accumulation uses the governing before phase and ignores fractional/reset presentation frames', () => {
  for (const minutes of [2, 4, 20]) {
    const { session, kickoff } = arm(`clock-${minutes}-epoch`, { matchLengthMinutes: minutes });
    const live = snapshot({ phase: 'PLAY', clockFrames: 0.25 });
    const dead = snapshot({ phase: 'DEAD_BALL', clockFrames: 101.875 });
    const held = snapshot({ phase: 'SET_PIECE', clockFrames: 0.125 });
    assert.equal(accepted(session, kickoff, live, 1).gameplaySeconds, 0);
    assert.equal(accepted(session, live, dead, 2).gameplaySeconds, (1 / 60) * (90 / minutes));
    assert.equal(accepted(session, dead, held, 3).gameplaySeconds, (1 / 60) * (90 / minutes));
  }
});

test('only the declared held throw-in taker receives the exact raw apron exception', () => {
  const { session, kickoff } = arm('throw-in-composition-epoch');
  const held = snapshot({ kickoffOptional: true, clockFrames: 0.125 });
  accepted(session, kickoff, held, 1);
  const staged = snapshot({ clockFrames: 0.25, throwIn: { teamId: 'you', slotId: 'RB', y: -26 } });
  const stagedBytes = JSON.stringify(staged);
  const result = accepted(session, held, staged, 2);
  assert.equal(result.stagingPlayerCount, 1);
  assert.equal(JSON.stringify(staged), stagedBytes);

  const invalid = arm('throw-in-invalid-epoch');
  const bad = snapshot({ kickoffOptional: true });
  bad.players.find(player => player.teamId === 'you' && player.slotId === 'LB').y = -26;
  const frozen = invalid.session.captureTick(captureTickInput(invalid.kickoff, bad, { sequence: 1 }));
  assert.equal(frozen.lifecycle, 'self-frozen');
  assert.match(frozen.reason, /outside the pitch without the held throw-in taker exception/);
});

test('stable-slot substitution composes and malformed or duplicate occupants self-freeze read-only', () => {
  const stableId = stablePlayerId('you', 'RST');
  const outPlayerId = actualPlayerId('you', 'RST');
  const inPlayerId = 'ars-reyes';
  const good = arm('substitution-composition-epoch');
  const changed = snapshot({ actualPlayerIds: { [stableId]: inPlayerId } });
  accepted(good.session, good.kickoff, changed, 1, {
    substitutions: [{ teamId: 'you', slotId: 'RST', outPlayerId, inPlayerId }]
  });

  const duplicate = arm('duplicate-occupant-epoch');
  const existing = actualPlayerId('you', 'LST');
  const duplicateFrame = snapshot({ actualPlayerIds: { [stableId]: existing } });
  const frozen = duplicate.session.captureTick(captureTickInput(duplicate.kickoff, duplicateFrame, {
    sequence: 1,
    substitutions: [{ teamId: 'you', slotId: 'RST', outPlayerId, inPlayerId: existing }]
  }));
  assert.equal(frozen.lifecycle, 'self-frozen');
  assert.match(frozen.reason, /actual player ids must be unique/);
});

test('outfield dismissal reaches formation shadow while goalkeeper dismissal freezes until replacement semantics exist', () => {
  const red = arm('red-card-composition-epoch');
  const outfield = stablePlayerId('you', 'RCB');
  const after = snapshot({ sentOffStableIds: [outfield] });
  const acceptedRed = accepted(red.session, red.kickoff, after, 1);
  assert.ok(acceptedRed.adapterTelemetry.comparison.formation.some(entry => entry.observedPlayerCount === 10));

  const gk = arm('goalkeeper-dismissal-epoch');
  const gkAfter = snapshot({ sentOffStableIds: [stablePlayerId('you', 'GK')] });
  const frozen = gk.session.captureTick(captureTickInput(gk.kickoff, gkAfter, { sequence: 1 }));
  assert.equal(frozen.lifecycle, 'self-frozen');
  assert.match(frozen.reason, /goalkeeper.*dismiss.*replacement/i);
});

test('telemetry has both a record-count and byte ceiling and exposes no snapshot, command, mapping, or candidate surface', () => {
  assert.throws(() => Capture.createCaptureSession(captureOptions('quick-play', {
    sessionId: 's'.repeat(96 * 1024)
  })), /sessionId exceeds the string length limit/);
  const { session, kickoff } = arm('bounded-telemetry-epoch', {
    sessionId: 's'.repeat(240),
    traceLimit: 16
  });
  let before = kickoff;
  for (let tick = 1; tick <= 20; tick += 1) {
    const after = snapshot({ kickoffOptional: true, clockFrames: tick / 8 });
    session.captureTick(captureTickInput(before, after, { sequence: tick }));
    before = after;
  }
  const exported = session.exportTelemetry();
  const bytes = Buffer.byteLength(session.stableTelemetryJson(), 'utf8');
  assert.ok(exported.recordCount <= 16);
  assert.ok(bytes <= 512 * 1024, `host telemetry export must be <=512KiB, received ${bytes} bytes`);
  const keys = recursiveKeys(exported);
  for (const forbidden of [
    'before', 'after', 'movementCommands', 'commands', 'mapping', 'candidateState',
    'candidateProjection', 'candidateSignature', 'candidatePeriod', 'candidatePhase'
  ]) assert.equal(keys.includes(forbidden), false, forbidden);
});

test('crafted cyclic snapshot fails closed inside capture and never throws into legacy gameplay', () => {
  const { session, kickoff } = arm('cyclic-fail-closed-epoch');
  const cyclic = clone(kickoff);
  cyclic.environment = cyclic;
  const result = session.captureTick({
    before: cyclic,
    after: snapshot(),
    movementCommands: [],
    teamStates: [],
    substitutions: [],
    environment: {},
    update: { hostUpdateSequence: 1, renderFrameSequence: 1, simulationStepIndex: 0, simulationStepsPerRender: 1 }
  });
  assert.equal(result.lifecycle, 'self-frozen');
  assert.equal(result.accepted, false);
});

test('throwing presentation accessors self-freeze capture instead of escaping into the legacy update loop', () => {
  const { session } = arm('throwing-presentation-accessor-epoch');
  const before = {};
  Object.defineProperty(before, 'clock', {
    enumerable: true,
    get() { throw new Error('crafted presentation getter'); }
  });
  let result;
  assert.doesNotThrow(() => {
    result = session.captureTick({ before, after: snapshot() });
  });
  assert.equal(result.lifecycle, 'self-frozen');
  assert.match(result.reason, /crafted presentation getter/);
});

test('finite host inputs cannot overflow exported aggregate telemetry to Infinity or null', () => {
  const before = snapshot({ kickoffOptional: true, clockFrames: 0 });
  const after = snapshot({
    kickoffOptional: true,
    clockFrames: 0.125,
    ball: { vx: Number.MAX_VALUE, vy: Number.MAX_VALUE }
  });
  const observation = Capture.prepareObservation(observationInput({ before, after }));
  const capability = Adapter.createCapability({
    workflow: 'quick-play',
    acknowledgement: Adapter.ACKNOWLEDGEMENT
  });
  const adapter = Adapter.createAdapter({
    enabled: true,
    workflow: 'quick-play',
    capability,
    fixedTickSeconds: 1 / 60,
    seed: 173,
    sessionId: 'finite-overflow-adversary'
  });
  const output = adapter.observe(observation);
  assert.equal(Number.isFinite(output.telemetry.comparison.ball.velocityErrorWorldPerFrame), true);
  assert.doesNotMatch(adapter.stableTelemetryJson(), /null/);
});
