import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const modulePath = path.join(root, 'match-engine', 'set-piece-coordinate-contract-v2.js');
const suitePath = path.join(root, 'match-engine', 'set-piece-suite-v2.js');
const ballPath = path.join(root, 'match-engine', 'ball-engine-v2.js');
const matchPath = path.join(root, 'match-engine', 'match.html');
const source = fs.readFileSync(modulePath, 'utf8');
const matchHtml = fs.readFileSync(matchPath, 'utf8');
const require = createRequire(import.meta.url);
const Coordinate = require(modulePath);
const Suite = require(suitePath);
const Ball = require(ballPath);

function pitch(overrides = {}) {
  return Coordinate.createMetricPitchBounds({
    units: Coordinate.UNITS,
    coordinateSystem: Coordinate.PITCH_COORDINATE_SYSTEM,
    axisAlignment: Coordinate.AXIS_ALIGNMENT,
    xMin: 0,
    xMax: 105,
    yMin: 0,
    yMax: 68,
    ...overrides
  });
}

function transform(overrides = {}) {
  return Coordinate.createTransform({
    pitch: pitch(),
    orientation: Coordinate.ORIENTATIONS.ATTACKING_RIGHT,
    ...overrides
  });
}

function canonicalGeometry(overrides = {}) {
  return Coordinate.createCanonicalGeometry({
    schema: Coordinate.GEOMETRY_SCHEMA,
    coordinateSystem: Coordinate.CANONICAL_COORDINATE_SYSTEM,
    ball: { x: 31.7, y: -9.25, z: 0.11 },
    taker: { x: 29.2, y: -10.4, z: 0 },
    wall: [
      { x: 40.6, y: -3.4, z: 0 },
      { x: 40.6, y: -2.65, z: 0 },
      { x: 40.6, y: -1.9, z: 0 }
    ],
    keeper: { x: 52.15, y: 0.75, z: 0 },
    targets: [
      { x: 52.5, y: -2.7, z: 1.9 },
      { x: 46.8, y: 0, z: 1.2 }
    ],
    ...overrides
  });
}

function allPoints(geometry) {
  return [geometry.ball, geometry.taker, ...geometry.wall,
    ...(geometry.keeper ? [geometry.keeper] : []), ...geometry.targets];
}

function closePoint(actual, expected, epsilon = 1e-11) {
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(actual[axis] - expected[axis]) <= epsilon,
      `${axis}: expected ${expected[axis]}, received ${actual[axis]}`);
  }
}

function suiteHarness(sessionId = 'coordinate-suite-session') {
  const capability = Suite.createSuiteCapability({
    grant: Suite.CAPABILITY_GRANT,
    runtimeMode: Suite.SUITE_RUNTIME_MODE,
    authority: Suite.SUITE_RUNTIME_AUTHORITY,
    sessionId,
    capabilityId: 'coordinate-suite-capability'
  });
  const active = Suite.activate(Suite.createState({ sessionId }), capability, {
    runtimeMode: Suite.SUITE_RUNTIME_MODE,
    authority: Suite.SUITE_RUNTIME_AUTHORITY
  });
  return { capability, active };
}

test('coordinate contract exposes a pure browser/CommonJS API through only the exact offline FL V2 preflight', () => {
  assert.equal(Coordinate.VERSION, '2.0.0-dormant');
  assert.equal(Coordinate.CANONICAL_COORDINATE_SYSTEM, 'si-metres-attacking-positive-x');
  assert.equal(Coordinate.CANONICAL_COORDINATE_SYSTEM,
    Suite.getScenarioPreset('free-kick-centre-23m').geometry.coordinateSystem);
  for (const name of [
    'createMetricPitchBounds', 'createTransform', 'createCanonicalGeometry',
    'canonicalToPitchPoint', 'pitchToCanonicalPoint',
    'canonicalToPitchVector', 'pitchToCanonicalVector',
    'canonicalToPitchGeometry', 'pitchToCanonicalGeometry'
  ]) assert.equal(typeof Coordinate[name], 'function', name);

  const browserWindow = {};
  vm.runInNewContext(source, { window: browserWindow });
  assert.equal(browserWindow.FootballLegacySetPieceCoordinateContractV2.VERSION, Coordinate.VERSION);
  assert.match(matchHtml, /if\(!eligible\)return;[\s\S]*'set-piece-coordinate-contract-v2\.js'/i);
  assert.doesNotMatch(matchHtml, /<script[^>]+src=["']set-piece-coordinate-contract-v2\.js/i);
  assert.match(source, /owns no gameplay/i);
});

test('coordinate transforms have no random, clock, async, DOM or dependency authority', () => {
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /Date\s*[.(]/);
  assert.doesNotMatch(source, /performance\s*\./);
  assert.doesNotMatch(source, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /document\s*\./);
  assert.doesNotMatch(source, /require\s*\(/);
});

test('canonical 105x68 centred geometry remains a byte-semantic no-op when attacking right', () => {
  const canonical = canonicalGeometry();
  const centredPitch = pitch({ xMin: -52.5, xMax: 52.5, yMin: -34, yMax: 34 });
  const mapping = transform({ pitch: centredPitch });
  assert.equal(mapping.xScale, 1);
  assert.equal(mapping.yScale, 1);
  assert.equal(mapping.xOffset, 0);
  assert.equal(mapping.yOffset, 0);

  const mapped = Coordinate.canonicalToPitchGeometry(canonical, mapping);
  assert.deepEqual({ ...mapped, coordinateSystem: canonical.coordinateSystem }, canonical);
  const restored = Coordinate.pitchToCanonicalGeometry(mapped, mapping);
  assert.deepEqual(restored, canonical);
  assert.ok(Object.isFrozen(mapped));
  assert.ok(Object.isFrozen(restored));
});

test('all suite roles round-trip deterministically on an offset noncanonical metric pitch', () => {
  const declaredPitch = pitch({ xMin: 7.25, xMax: 107.25, yMin: -13.5, yMax: 50.5 });
  const mapping = transform({ pitch: declaredPitch });
  const canonical = canonicalGeometry();
  const before = JSON.stringify(canonical);
  const first = Coordinate.canonicalToPitchGeometry(canonical, mapping);
  const second = Coordinate.canonicalToPitchGeometry(canonical, mapping);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(canonical), before, 'input geometry must not mutate');
  assert.equal(first.coordinateSystem, Coordinate.PITCH_COORDINATE_SYSTEM);
  assert.equal(first.wall.length, 3);
  assert.equal(first.targets.length, 2);
  assert.ok(first.keeper);

  const restored = Coordinate.pitchToCanonicalGeometry(first, mapping);
  const actual = allPoints(restored);
  const expected = allPoints(canonical);
  assert.equal(actual.length, expected.length);
  actual.forEach((point, index) => closePoint(point, expected[index]));
  assert.equal(JSON.stringify(first), JSON.stringify(second), 'same inputs must serialize byte-identically');
});

test('all canonical corners survive floating-point boundary transforms on decimal pitch offsets', () => {
  const declaredPitch = pitch({ xMin: -11.1, xMax: 98.9, yMin: 0.2, yMax: 75.2 });
  for (const orientation of Object.values(Coordinate.ORIENTATIONS)) {
    const mapping = transform({ pitch: declaredPitch, orientation });
    for (const canonical of [
      { x: -52.5, y: -34, z: 0 },
      { x: -52.5, y: 34, z: 20 },
      { x: 52.5, y: -34, z: 0.11 },
      { x: 52.5, y: 34, z: 1.9 }
    ]) {
      const mapped = Coordinate.canonicalToPitchPoint(canonical, mapping);
      const restored = Coordinate.pitchToCanonicalPoint(mapped, mapping);
      closePoint(restored, canonical, Coordinate.COORDINATE_TOLERANCE_M);
    }
  }
});

test('proportionally equivalent pitches preserve normalized placement for every role', () => {
  const canonical = canonicalGeometry();
  const standard = transform({ pitch: pitch({ xMin: 0, xMax: 105, yMin: 0, yMax: 68 }) });
  const compact = transform({ pitch: pitch({ xMin: -20, xMax: 80, yMin: 11, yMax: 75 }) });
  const standardGeometry = Coordinate.canonicalToPitchGeometry(canonical, standard);
  const compactGeometry = Coordinate.canonicalToPitchGeometry(canonical, compact);

  const normalized = (point, bounds) => ({
    x: (point.x - bounds.xMin) / (bounds.xMax - bounds.xMin),
    y: (point.y - bounds.yMin) / (bounds.yMax - bounds.yMin),
    z: point.z
  });
  const standardPoints = allPoints(standardGeometry);
  const compactPoints = allPoints(compactGeometry);
  standardPoints.forEach((point, index) => {
    closePoint(normalized(point, standard.pitch), normalized(compactPoints[index], compact.pitch), 1e-12);
  });
});

test('attacking-left is an exact 180-degree horizontal orientation with left/right semantics preserved', () => {
  const declaredPitch = pitch({ xMin: 10, xMax: 110, yMin: -4, yMax: 60 });
  const right = transform({ pitch: declaredPitch, orientation: Coordinate.ORIENTATIONS.ATTACKING_RIGHT });
  const left = transform({ pitch: declaredPitch, orientation: Coordinate.ORIENTATIONS.ATTACKING_LEFT });
  const canonical = canonicalGeometry();
  const towardRight = Coordinate.canonicalToPitchGeometry(canonical, right);
  const towardLeft = Coordinate.canonicalToPitchGeometry(canonical, left);
  const centreX = (declaredPitch.xMin + declaredPitch.xMax) / 2;
  const centreY = (declaredPitch.yMin + declaredPitch.yMax) / 2;

  allPoints(towardRight).forEach((point, index) => {
    const opposite = allPoints(towardLeft)[index];
    assert.ok(Math.abs((point.x + opposite.x) - 2 * centreX) <= 1e-12);
    assert.ok(Math.abs((point.y + opposite.y) - 2 * centreY) <= 1e-12);
    assert.equal(point.z, opposite.z);
  });
  assert.ok(towardRight.ball.y < centreY, 'canonical attacking-left y<0 is below centre when attacking right');
  assert.ok(towardLeft.ball.y > centreY, 'the same attacking-left role rotates above centre when attacking left');
  const restored = Coordinate.pitchToCanonicalGeometry(towardLeft, left);
  allPoints(restored).forEach((point, index) => closePoint(point, allPoints(canonical)[index]));
});

test('point and direction-vector transforms are independently reversible under anisotropic scaling', () => {
  const mapping = transform({
    pitch: pitch({ xMin: -2, xMax: 98, yMin: 5, yMax: 69 }),
    orientation: Coordinate.ORIENTATIONS.ATTACKING_LEFT
  });
  const canonicalPoint = { x: 41.5, y: -11.25, z: 0.11 };
  const pitchPoint = Coordinate.canonicalToPitchPoint(canonicalPoint, mapping);
  closePoint(Coordinate.pitchToCanonicalPoint(pitchPoint, mapping), canonicalPoint);

  const canonicalVector = { x: 0.8, y: -0.6, z: 0.25 };
  const pitchVector = Coordinate.canonicalToPitchVector(canonicalVector, mapping);
  closePoint(Coordinate.pitchToCanonicalVector(pitchVector, mapping), canonicalVector);
  assert.notEqual(Math.hypot(pitchVector.x, pitchVector.y), Math.hypot(canonicalVector.x, canonicalVector.y),
    'anisotropic metric mapping intentionally maps components before Ball normalizes launch aim');
});

test('Set-Piece Suite launch origin and target map into current Ball Engine V2 without changing physics fields', () => {
  const { capability, active } = suiteHarness();
  const staged = Suite.stageScenario(active, 'free-kick-left-23m', capability);
  const armed = Suite.createLaunchIntent(staged, {
    speed: 28.5,
    liftAngleDeg: 22,
    sideSpinRpm: 340,
    topSpinRpm: 105,
    axialSpinRpm: 8
  }, capability).launchIntent;
  assert.equal(armed.schema, Ball.LAUNCH_SCHEMA);

  const mapping = transform({
    pitch: pitch({ xMin: 7, xMax: 107, yMin: -5, yMax: 59 }),
    orientation: Coordinate.ORIENTATIONS.ATTACKING_LEFT
  });
  const mapped = Ball.createLaunchIntent({
    ...armed,
    origin: Coordinate.canonicalToPitchPoint(armed.origin, mapping),
    target: Coordinate.canonicalToPitchPoint(armed.target, mapping)
  });
  assert.equal(mapped.speed, armed.speed);
  assert.equal(mapped.liftAngleDeg, armed.liftAngleDeg);
  assert.equal(mapped.sideSpinRpm, armed.sideSpinRpm);
  assert.equal(mapped.topSpinRpm, armed.topSpinRpm);
  assert.equal(mapped.axialSpinRpm, armed.axialSpinRpm);
  assert.ok(mapped.origin.x > mapped.target.x, 'attacking-left mapping aims toward decreasing world x');
  const resolved = Ball.resolveLaunch(mapped);
  assert.ok(resolved.state.velocity.x < 0);
  assert.ok(Number.isFinite(resolved.state.velocity.y));
  assert.ok(Number.isFinite(resolved.state.velocity.z));
});

test('explicit Suite direction launch maps as a vector and remains valid for Ball Engine V2', () => {
  const { capability, active } = suiteHarness('coordinate-direction-session');
  const staged = Suite.stageScenario(active, 'corner-right', capability);
  const armed = Suite.createLaunchIntent(staged, {
    direction: { x: -0.25, y: -0.95, z: 0 },
    speed: 23,
    liftAngleDeg: 28
  }, capability).launchIntent;
  const mapping = transform({ pitch: pitch({ xMin: 0, xMax: 100, yMin: 0, yMax: 64 }) });
  const mapped = Ball.createLaunchIntent({
    ...armed,
    origin: Coordinate.canonicalToPitchPoint(armed.origin, mapping),
    direction: Coordinate.canonicalToPitchVector(armed.direction, mapping)
  });
  assert.equal(mapped.target, null);
  assert.ok(Ball.resolveLaunch(mapped).state.velocity.y < 0);
});

test('non-metric, rotated, malformed and unsupported pitch declarations fail closed', () => {
  const valid = {
    units: Coordinate.UNITS,
    coordinateSystem: Coordinate.PITCH_COORDINATE_SYSTEM,
    axisAlignment: Coordinate.AXIS_ALIGNMENT,
    xMin: 0, xMax: 105, yMin: 0, yMax: 68
  };
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, units: 'feet' }), /explicitly be metres/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, coordinateSystem: 'screen-pixels' }), /metric axes/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, axisAlignment: 'rotated' }), /axis-aligned/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, rotationDeg: 0 }), /unsupported field rotationDeg/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, schema: 'forged-pitch' }), /schema is unsupported/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, xMax: 89 }), /length.*90\.\.120/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, xMax: 121 }), /length.*90\.\.120/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, yMax: 44 }), /width.*45\.\.90/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, yMax: 91 }), /width.*45\.\.90/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, xMax: 90, yMax: 90 }), /length must exceed/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, xMax: 0 }), /strictly increasing/);
  assert.throws(() => Coordinate.createMetricPitchBounds({ ...valid, xMax: Number.POSITIVE_INFINITY }), /finite number/);
  assert.throws(() => Coordinate.createTransform({ pitch: valid, orientation: 'left' }), /attacking-right or attacking-left/);
  assert.throws(() => Coordinate.createTransform({ pitch: valid, orientation: 1 }), /attacking-right or attacking-left/);
});

test('malformed role geometry, out-of-envelope points and accessors fail closed', () => {
  const valid = canonicalGeometry();
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, targets: [] }), /at least one target/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, wall: {} }), /plain array/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, keeper: undefined }), /plain data object/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, ball: { x: 52.500001, y: 0, z: 0.11 } }), /outside/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, ball: { x: 0, y: 0, z: -0.01 } }), /outside/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, ball: { x: 0, y: 0, z: 21 } }), /outside/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, ball: { x: 0, y: 0, z: 0, w: 1 } }), /unsupported field w/);
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, coordinateSystem: 'si-metres-world' }), /unsupported/);
  assert.throws(() => Coordinate.canonicalToPitchGeometry({
    ...valid,
    extraGeometry: true
  }, transform()), /unsupported field extraGeometry/);

  const accessorPoint = {};
  Object.defineProperty(accessorPoint, 'x', { enumerable: true, get() { throw new Error('must not execute'); } });
  Object.defineProperty(accessorPoint, 'y', { enumerable: true, value: 0 });
  Object.defineProperty(accessorPoint, 'z', { enumerable: true, value: 0 });
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, ball: accessorPoint }), /data properties/);

  const sparseWall = [];
  sparseWall.length = 1;
  assert.throws(() => Coordinate.createCanonicalGeometry({ ...valid, wall: sparseWall }), /must not be sparse/);
});

test('forged transform coefficients and wrong-direction geometry cannot bypass the contract', () => {
  const mapping = transform();
  assert.throws(() => Coordinate.canonicalToPitchPoint({ x: 0, y: 0, z: 0 }, {
    ...mapping,
    xScale: mapping.xScale * 2
  }), /does not match/);
  assert.throws(() => Coordinate.canonicalToPitchPoint({ x: 0, y: 0, z: 0 }, {
    ...mapping,
    attackSign: -1
  }), /does not match/);
  const mapped = Coordinate.canonicalToPitchGeometry(canonicalGeometry(), mapping);
  assert.throws(() => Coordinate.canonicalToPitchGeometry(mapped, mapping), /coordinateSystem is unsupported/);
  assert.throws(() => Coordinate.pitchToCanonicalGeometry(canonicalGeometry(), mapping), /coordinateSystem is unsupported/);
  assert.throws(() => Coordinate.pitchToCanonicalPoint({ x: 105.000001, y: 34, z: 0 }, mapping), /outside/);
});
