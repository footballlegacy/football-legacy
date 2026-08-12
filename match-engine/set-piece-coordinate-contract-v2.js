'use strict';

/*
 * Football Legacy Set-Piece Coordinate Contract V2
 *
 * A deterministic, reversible coordinate adapter for the dormant Set-Piece
 * Suite V2. This module owns no gameplay, renderer, input, clock, network or
 * live-match authority and is not loaded by match.html.
 */
(function exposeSetPieceCoordinateContractV2(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacySetPieceCoordinateContractV2 = api;
})(typeof window === 'object' ? window : null, function createSetPieceCoordinateContractV2Api() {
  'use strict';

  const VERSION = '2.0.0-dormant';
  const PITCH_SCHEMA = 'football-legacy-set-piece-coordinate-v2-pitch';
  const TRANSFORM_SCHEMA = 'football-legacy-set-piece-coordinate-v2-transform';
  const GEOMETRY_SCHEMA = 'football-legacy-set-piece-coordinate-v2-geometry';
  const CANONICAL_COORDINATE_SYSTEM = 'si-metres-attacking-positive-x';
  const PITCH_COORDINATE_SYSTEM = 'si-metres-world-x-length-y-width-z-up';
  const UNITS = 'metres';
  const AXIS_ALIGNMENT = 'axis-aligned';
  const MAX_ABSOLUTE_BOUND_M = 100000;
  const MAX_VERTICAL_M = 20;
  const COORDINATE_TOLERANCE_M = 1e-9;

  const ORIENTATIONS = Object.freeze({
    ATTACKING_RIGHT: 'attacking-right',
    ATTACKING_LEFT: 'attacking-left'
  });

  /*
   * This is the full centred reference pitch. Set-Piece Suite V2 currently
   * authors its attacking-half positions inside these bounds: the centre spot
   * is x=0, the attacked goal line is x=52.5, and attacking-left is y<0.
   */
  const CANONICAL_PITCH = deepFreeze({
    units: UNITS,
    coordinateSystem: CANONICAL_COORDINATE_SYSTEM,
    lengthM: 105,
    widthM: 68,
    xMin: -52.5,
    xMax: 52.5,
    yMin: -34,
    yMax: 34,
    zMin: 0,
    zMax: MAX_VERTICAL_M
  });

  /* Engine support boundary, deliberately explicit rather than inferred. */
  const SUPPORTED_PITCH = deepFreeze({
    minimumLengthM: 90,
    maximumLengthM: 120,
    minimumWidthM: 45,
    maximumWidthM: 90,
    lengthMustExceedWidth: true
  });

  const PITCH_INPUT_KEYS = Object.freeze([
    'schema', 'units', 'coordinateSystem', 'axisAlignment', 'xMin', 'xMax', 'yMin', 'yMax'
  ]);
  const POINT_KEYS = Object.freeze(['x', 'y', 'z']);
  const GEOMETRY_KEYS = Object.freeze([
    'schema', 'coordinateSystem', 'ball', 'taker', 'wall', 'keeper', 'targets'
  ]);
  const TRANSFORM_KEYS = Object.freeze([
    'schema', 'version', 'sourceCoordinateSystem', 'targetCoordinateSystem',
    'orientation', 'attackSign', 'xScale', 'yScale', 'xOffset', 'yOffset', 'zScale', 'pitch'
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return value;
  }

  function dataObject(value, label) {
    const name = label || 'value';
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(name + ' must be a plain data object');
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(name + ' must be a plain data object');
    }
    if (Object.getOwnPropertySymbols(value).length) {
      throw new TypeError(name + ' must not contain symbol properties');
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Object.keys(descriptors)) {
      const descriptor = descriptors[key];
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        throw new TypeError(name + ' must contain only enumerable data properties');
      }
    }
    return value;
  }

  function exactKeys(value, allowed, required, label) {
    const source = dataObject(value, label);
    const keys = Object.keys(source);
    for (const key of keys) {
      if (!allowed.includes(key)) throw new TypeError((label || 'value') + ' contains unsupported field ' + key);
    }
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        throw new TypeError((label || 'value') + '.' + key + ' is required');
      }
    }
    return source;
  }

  function finiteNumber(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError((label || 'value') + ' must be a finite number');
    }
    if (Math.abs(value) > MAX_ABSOLUTE_BOUND_M) {
      throw new RangeError((label || 'value') + ' exceeds the supported metric envelope');
    }
    return Object.is(value, -0) ? 0 : value;
  }

  function orientationSign(orientation) {
    if (orientation === ORIENTATIONS.ATTACKING_RIGHT) return 1;
    if (orientation === ORIENTATIONS.ATTACKING_LEFT) return -1;
    throw new RangeError('orientation must be attacking-right or attacking-left');
  }

  function assertArray(value, label) {
    const name = label || 'value';
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError(name + ' must be a plain array');
    }
    if (Object.getOwnPropertySymbols(value).length) throw new TypeError(name + ' must not contain symbol properties');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Object.keys(descriptors)) {
      if (key === 'length') continue;
      if (!/^(0|[1-9][0-9]*)$/.test(key)) throw new TypeError(name + ' contains unsupported array properties');
      const descriptor = descriptors[key];
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value') ||
          descriptor.get || descriptor.set || descriptor.enumerable !== true) {
        throw new TypeError(name + ' must contain only enumerable data entries');
      }
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) throw new TypeError(name + ' must not be sparse');
    }
    return value;
  }

  function createMetricPitchBounds(input) {
    const source = exactKeys(input, PITCH_INPUT_KEYS, [
      'units', 'coordinateSystem', 'axisAlignment', 'xMin', 'xMax', 'yMin', 'yMax'
    ], 'pitch');
    if (source.schema != null && source.schema !== PITCH_SCHEMA) {
      throw new TypeError('pitch.schema is unsupported');
    }
    if (source.units !== UNITS) throw new TypeError('pitch.units must explicitly be metres');
    if (source.coordinateSystem !== PITCH_COORDINATE_SYSTEM) {
      throw new TypeError('pitch.coordinateSystem must explicitly declare world x-length / y-width / z-up metric axes');
    }
    if (source.axisAlignment !== AXIS_ALIGNMENT) {
      throw new TypeError('pitch.axisAlignment must explicitly be axis-aligned');
    }
    const xMin = finiteNumber(source.xMin, 'pitch.xMin');
    const xMax = finiteNumber(source.xMax, 'pitch.xMax');
    const yMin = finiteNumber(source.yMin, 'pitch.yMin');
    const yMax = finiteNumber(source.yMax, 'pitch.yMax');
    if (!(xMax > xMin) || !(yMax > yMin)) throw new RangeError('pitch bounds must be strictly increasing');
    const lengthM = xMax - xMin;
    const widthM = yMax - yMin;
    if (!Number.isFinite(lengthM) || !Number.isFinite(widthM)) {
      throw new RangeError('pitch dimensions exceed the supported metric envelope');
    }
    if (lengthM < SUPPORTED_PITCH.minimumLengthM || lengthM > SUPPORTED_PITCH.maximumLengthM) {
      throw new RangeError('pitch length is outside the supported 90..120 metre range');
    }
    if (widthM < SUPPORTED_PITCH.minimumWidthM || widthM > SUPPORTED_PITCH.maximumWidthM) {
      throw new RangeError('pitch width is outside the supported 45..90 metre range');
    }
    if (!(lengthM > widthM)) throw new RangeError('pitch length must exceed pitch width');
    return deepFreeze({
      schema: PITCH_SCHEMA,
      units: UNITS,
      coordinateSystem: PITCH_COORDINATE_SYSTEM,
      axisAlignment: AXIS_ALIGNMENT,
      xMin,
      xMax,
      yMin,
      yMax
    });
  }

  function createTransform(input) {
    const source = exactKeys(input, ['pitch', 'orientation'], ['pitch', 'orientation'], 'transform request');
    const pitch = createMetricPitchBounds(source.pitch);
    const attackSign = orientationSign(source.orientation);
    const lengthM = pitch.xMax - pitch.xMin;
    const widthM = pitch.yMax - pitch.yMin;
    const transform = {
      schema: TRANSFORM_SCHEMA,
      version: VERSION,
      sourceCoordinateSystem: CANONICAL_COORDINATE_SYSTEM,
      targetCoordinateSystem: PITCH_COORDINATE_SYSTEM,
      orientation: source.orientation,
      attackSign,
      xScale: lengthM / CANONICAL_PITCH.lengthM,
      yScale: widthM / CANONICAL_PITCH.widthM,
      xOffset: pitch.xMin + lengthM / 2,
      yOffset: pitch.yMin + widthM / 2,
      zScale: 1,
      pitch
    };
    for (const key of ['xScale', 'yScale', 'xOffset', 'yOffset']) {
      if (!Number.isFinite(transform[key])) throw new RangeError('transform.' + key + ' is not finite');
    }
    if (!(transform.xScale > 0) || !(transform.yScale > 0)) {
      throw new RangeError('transform scales must be positive');
    }
    return deepFreeze(transform);
  }

  function assertTransform(input) {
    const source = exactKeys(input, TRANSFORM_KEYS, TRANSFORM_KEYS, 'transform');
    if (source.schema !== TRANSFORM_SCHEMA || source.version !== VERSION ||
        source.sourceCoordinateSystem !== CANONICAL_COORDINATE_SYSTEM ||
        source.targetCoordinateSystem !== PITCH_COORDINATE_SYSTEM || source.zScale !== 1) {
      throw new TypeError('transform contract is unsupported');
    }
    const expected = createTransform({ pitch: source.pitch, orientation: source.orientation });
    for (const key of ['attackSign', 'xScale', 'yScale', 'xOffset', 'yOffset', 'zScale']) {
      if (source[key] !== expected[key]) throw new TypeError('transform.' + key + ' does not match its declared pitch and orientation');
    }
    return expected;
  }

  function point(input, bounds, label) {
    const source = exactKeys(input, POINT_KEYS, POINT_KEYS, label || 'point');
    const result = {
      x: finiteNumber(source.x, (label || 'point') + '.x'),
      y: finiteNumber(source.y, (label || 'point') + '.y'),
      z: finiteNumber(source.z, (label || 'point') + '.z')
    };
    if (result.x < bounds.xMin - COORDINATE_TOLERANCE_M ||
        result.x > bounds.xMax + COORDINATE_TOLERANCE_M ||
        result.y < bounds.yMin - COORDINATE_TOLERANCE_M ||
        result.y > bounds.yMax + COORDINATE_TOLERANCE_M ||
        result.z < -COORDINATE_TOLERANCE_M ||
        result.z > MAX_VERTICAL_M + COORDINATE_TOLERANCE_M) {
      throw new RangeError((label || 'point') + ' is outside the supported coordinate envelope');
    }
    result.x = Math.min(bounds.xMax, Math.max(bounds.xMin, result.x));
    result.y = Math.min(bounds.yMax, Math.max(bounds.yMin, result.y));
    result.z = Math.min(MAX_VERTICAL_M, Math.max(0, result.z));
    return result;
  }

  function vector(input, label) {
    const source = exactKeys(input, POINT_KEYS, POINT_KEYS, label || 'vector');
    const result = {
      x: finiteNumber(source.x, (label || 'vector') + '.x'),
      y: finiteNumber(source.y, (label || 'vector') + '.y'),
      z: finiteNumber(source.z, (label || 'vector') + '.z')
    };
    if (Math.hypot(result.x, result.y, result.z) <= 1e-12) {
      throw new RangeError((label || 'vector') + ' must be non-zero');
    }
    return result;
  }

  function pitchBounds(pitch) {
    return { xMin: pitch.xMin, xMax: pitch.xMax, yMin: pitch.yMin, yMax: pitch.yMax };
  }

  function canonicalToPitchPoint(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = point(input, CANONICAL_PITCH, 'canonical point');
    return deepFreeze({
      x: transform.xOffset + transform.attackSign * source.x * transform.xScale,
      y: transform.yOffset + transform.attackSign * source.y * transform.yScale,
      z: source.z
    });
  }

  function pitchToCanonicalPoint(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = point(input, pitchBounds(transform.pitch), 'pitch point');
    const canonical = {
      x: transform.attackSign * (source.x - transform.xOffset) / transform.xScale,
      y: transform.attackSign * (source.y - transform.yOffset) / transform.yScale,
      z: source.z
    };
    return deepFreeze(point(canonical, CANONICAL_PITCH, 'canonical point'));
  }

  function canonicalToPitchVector(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = vector(input, 'canonical vector');
    return deepFreeze({
      x: transform.attackSign * source.x * transform.xScale,
      y: transform.attackSign * source.y * transform.yScale,
      z: source.z
    });
  }

  function pitchToCanonicalVector(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = vector(input, 'pitch vector');
    return deepFreeze({
      x: transform.attackSign * source.x / transform.xScale,
      y: transform.attackSign * source.y / transform.yScale,
      z: source.z
    });
  }

  function geometry(input, coordinateSystem, bounds, label) {
    const name = label || 'geometry';
    const source = exactKeys(input, GEOMETRY_KEYS, GEOMETRY_KEYS, name);
    if (source.schema !== GEOMETRY_SCHEMA) throw new TypeError(name + '.schema is unsupported');
    if (source.coordinateSystem !== coordinateSystem) {
      throw new TypeError(name + '.coordinateSystem is unsupported for this transform direction');
    }
    const wall = assertArray(source.wall, name + '.wall').map((entry, index) =>
      point(entry, bounds, name + '.wall[' + index + ']'));
    const targetsSource = assertArray(source.targets, name + '.targets');
    if (!targetsSource.length) throw new RangeError(name + '.targets must contain at least one target');
    const targets = targetsSource.map((entry, index) => point(entry, bounds, name + '.targets[' + index + ']'));
    return {
      schema: GEOMETRY_SCHEMA,
      coordinateSystem,
      ball: point(source.ball, bounds, name + '.ball'),
      taker: point(source.taker, bounds, name + '.taker'),
      wall,
      keeper: source.keeper === null ? null : point(source.keeper, bounds, name + '.keeper'),
      targets
    };
  }

  function createCanonicalGeometry(input) {
    return deepFreeze(geometry(input, CANONICAL_COORDINATE_SYSTEM, CANONICAL_PITCH, 'canonical geometry'));
  }

  function mapGeometry(source, coordinateSystem, mapper) {
    return deepFreeze({
      schema: GEOMETRY_SCHEMA,
      coordinateSystem,
      ball: mapper(source.ball),
      taker: mapper(source.taker),
      wall: source.wall.map(mapper),
      keeper: source.keeper === null ? null : mapper(source.keeper),
      targets: source.targets.map(mapper)
    });
  }

  function canonicalToPitchGeometry(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = geometry(input, CANONICAL_COORDINATE_SYSTEM, CANONICAL_PITCH, 'canonical geometry');
    return mapGeometry(source, PITCH_COORDINATE_SYSTEM, entry => canonicalToPitchPoint(entry, transform));
  }

  function pitchToCanonicalGeometry(input, transformInput) {
    const transform = assertTransform(transformInput);
    const source = geometry(input, PITCH_COORDINATE_SYSTEM, pitchBounds(transform.pitch), 'pitch geometry');
    return mapGeometry(source, CANONICAL_COORDINATE_SYSTEM, entry => pitchToCanonicalPoint(entry, transform));
  }

  return deepFreeze({
    VERSION,
    PITCH_SCHEMA,
    TRANSFORM_SCHEMA,
    GEOMETRY_SCHEMA,
    CANONICAL_COORDINATE_SYSTEM,
    PITCH_COORDINATE_SYSTEM,
    UNITS,
    AXIS_ALIGNMENT,
    ORIENTATIONS,
    CANONICAL_PITCH,
    SUPPORTED_PITCH,
    MAX_VERTICAL_M,
    COORDINATE_TOLERANCE_M,
    createMetricPitchBounds,
    createTransform,
    createCanonicalGeometry,
    canonicalToPitchPoint,
    pitchToCanonicalPoint,
    canonicalToPitchVector,
    pitchToCanonicalVector,
    canonicalToPitchGeometry,
    pitchToCanonicalGeometry
  });
});
