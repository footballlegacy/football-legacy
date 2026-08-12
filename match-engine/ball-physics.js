'use strict';

/*
 * Football Legacy deterministic ball-physics kernel.
 *
 * This file is intentionally dormant.  Loading it exposes a tested physics
 * contract, but match.html remains the gameplay authority until the explicit
 * integration gate is completed in a later workflow.
 */
(function exposeBallPhysics(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyBallPhysics = api;
})(typeof window === 'object' ? window : null, function createBallPhysicsApi() {
  'use strict';

  const VERSION = '1.0.0-dormant';
  const STATE_SCHEMA = 'football-legacy-ball-state-v1';
  const MODES = Object.freeze({ LEGACY: 'legacy', EXPERIMENTAL: 'experimental' });
  const UNITS = Object.freeze({ LEGACY_WORLD: 'legacy-world', SI: 'si' });

  // Current pitch geometry: W=3344, H=2142, M=84, with a 105 m x 68 m field.
  // Axis-specific values preserve the existing engine's non-square rendering
  // scale; callers may provide another positive scale without changing physics.
  const DEFAULT_UNIT_SYSTEM = Object.freeze({
    xUnitsPerMetre: (3344 - 2 * 84) / 105,
    yUnitsPerMetre: (2142 - 12) / 68,
    zUnitsPerMetre: (2142 - 12) / 68,
    framesPerSecond: 60
  });

  const LEGACY_DEFAULTS = Object.freeze({
    gravityPerFrame: 0.26,
    airDragPerFrame: 0.9938,
    framesPerSecond: 60
  });

  // These SI values are a conservative experiment, not live gameplay tuning.
  const EXPERIMENTAL_DEFAULTS = Object.freeze({
    gravity: 9.80665,
    airDensity: 1.225,
    dragCoefficient: 0.25,
    liftSlope: 0.08,
    maxLiftCoefficient: 0.35,
    angularAirDecay: 0.12,
    restitution: 0.52,
    tangentialRetention: 0.82,
    rollingFriction: 0.015,
    rollingSpinResponse: 10,
    rollingSpinDecay: 0.7,
    minimumBounceSpeed: 0.55,
    settleLinearSpeed: 0.035,
    settleVerticalSpeed: 0.025,
    settleAngularSpeed: 0.75,
    settleDelay: 0.25,
    contactEpsilon: 1e-7,
    maxSubstep: 1 / 240,
    groundHeight: 0
  });

  function finite(value, fallback) {
    return Number.isFinite(value) ? Number(value) : fallback;
  }

  function positive(value, fallback, label) {
    const result = finite(value, fallback);
    if (!(result > 0)) throw new RangeError(label + ' must be a positive finite number');
    return result;
  }

  function vector(value, fallback) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      x: finite(source.x, fallback.x),
      y: finite(source.y, fallback.y),
      z: finite(source.z, fallback.z)
    };
  }

  function quaternion(value) {
    const source = value && typeof value === 'object' ? value : {};
    const raw = {
      x: finite(source.x, 0),
      y: finite(source.y, 0),
      z: finite(source.z, 0),
      w: finite(source.w, 1)
    };
    const length = Math.hypot(raw.x, raw.y, raw.z, raw.w) || 1;
    return { x: raw.x / length, y: raw.y / length, z: raw.z / length, w: raw.w / length };
  }

  function magnitude(value) {
    return Math.hypot(value.x, value.y, value.z);
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  function unitSystem(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    return {
      xUnitsPerMetre: positive(source.xUnitsPerMetre, DEFAULT_UNIT_SYSTEM.xUnitsPerMetre, 'xUnitsPerMetre'),
      yUnitsPerMetre: positive(source.yUnitsPerMetre, DEFAULT_UNIT_SYSTEM.yUnitsPerMetre, 'yUnitsPerMetre'),
      zUnitsPerMetre: positive(source.zUnitsPerMetre, DEFAULT_UNIT_SYSTEM.zUnitsPerMetre, 'zUnitsPerMetre'),
      framesPerSecond: positive(source.framesPerSecond, DEFAULT_UNIT_SYSTEM.framesPerSecond, 'framesPerSecond')
    };
  }

  function createState(initial) {
    const source = initial && typeof initial === 'object' ? initial : {};
    const mode = source.mode === MODES.LEGACY ? MODES.LEGACY : MODES.EXPERIMENTAL;
    const units = source.units || (mode === MODES.LEGACY ? UNITS.LEGACY_WORLD : UNITS.SI);
    const radius = positive(source.radius, units === UNITS.SI ? 0.11 : 3.45, 'radius');
    const mass = positive(source.mass, 0.43, 'mass');
    const groundHeight = finite(source.groundHeight, 0);
    const defaultZ = units === UNITS.SI ? groundHeight + radius : groundHeight;
    const position = vector(source.position, { x: 0, y: 0, z: defaultZ });
    const velocity = vector(source.velocity, { x: 0, y: 0, z: 0 });
    const angularVelocity = vector(source.angularVelocity, { x: 0, y: 0, z: 0 });
    const contactLevel = units === UNITS.SI ? groundHeight + radius : groundHeight;
    const grounded = typeof source.grounded === 'boolean'
      ? source.grounded
      : position.z <= contactLevel && velocity.z <= 0;
    return {
      schema: STATE_SCHEMA,
      mode,
      units,
      tick: Math.max(0, Math.trunc(finite(source.tick, 0))),
      time: Math.max(0, finite(source.time, 0)),
      position,
      velocity,
      angularVelocity,
      orientation: quaternion(source.orientation),
      radius,
      mass,
      inertia: positive(source.inertia, (2 / 5) * mass * radius * radius, 'inertia'),
      groundHeight,
      grounded,
      settled: Boolean(source.settled),
      settleTime: Math.max(0, finite(source.settleTime, 0)),
      contactCount: Math.max(0, Math.trunc(finite(source.contactCount, 0))),
      lastContact: source.lastContact && typeof source.lastContact === 'object'
        ? {
            tick: Math.max(0, Math.trunc(finite(source.lastContact.tick, 0))),
            time: Math.max(0, finite(source.lastContact.time, 0)),
            normalSpeed: Math.max(0, finite(source.lastContact.normalSpeed, 0))
          }
        : null,
      metadata: source.metadata && typeof source.metadata === 'object' ? { ...source.metadata } : {}
    };
  }

  function cloneState(state) {
    return createState(state);
  }

  function isCompleteState(state) {
    if (!state || state.schema !== STATE_SCHEMA) return false;
    const vectors = [state.position, state.velocity, state.angularVelocity];
    const scalars = [state.tick, state.time, state.radius, state.mass, state.inertia,
      state.groundHeight, state.settleTime, state.contactCount];
    return vectors.every(item => item && ['x', 'y', 'z'].every(key => Number.isFinite(item[key]))) &&
      state.orientation && ['x', 'y', 'z', 'w'].every(key => Number.isFinite(state.orientation[key])) &&
      scalars.every(Number.isFinite) && typeof state.grounded === 'boolean' &&
      typeof state.settled === 'boolean' && state.metadata && typeof state.metadata === 'object';
  }

  function metresToWorld(value, axis, system) {
    const scale = unitSystem(system);
    const key = axis === 'y' ? 'yUnitsPerMetre' : axis === 'z' ? 'zUnitsPerMetre' : 'xUnitsPerMetre';
    return finite(value, 0) * scale[key];
  }

  function worldToMetres(value, axis, system) {
    const scale = unitSystem(system);
    const key = axis === 'y' ? 'yUnitsPerMetre' : axis === 'z' ? 'zUnitsPerMetre' : 'xUnitsPerMetre';
    return finite(value, 0) / scale[key];
  }

  function metresPerSecondToWorldPerFrame(value, axis, system) {
    const scale = unitSystem(system);
    return metresToWorld(value, axis, scale) / scale.framesPerSecond;
  }

  function worldPerFrameToMetresPerSecond(value, axis, system) {
    const scale = unitSystem(system);
    return worldToMetres(finite(value, 0) * scale.framesPerSecond, axis, scale);
  }

  function rpmToRadiansPerSecond(rpm) {
    return finite(rpm, 0) * Math.PI * 2 / 60;
  }

  function radiansPerSecondToRpm(radiansPerSecond) {
    return finite(radiansPerSecond, 0) * 60 / (Math.PI * 2);
  }

  function fromLegacyState(legacy, options) {
    const source = legacy && typeof legacy === 'object' ? legacy : {};
    const opts = options && typeof options === 'object' ? options : {};
    return createState({
      mode: MODES.LEGACY,
      units: UNITS.LEGACY_WORLD,
      position: { x: finite(source.x, 0), y: finite(source.y, 0), z: finite(source.z, 0) },
      velocity: { x: finite(source.vx, 0), y: finite(source.vy, 0), z: finite(source.zv, 0) },
      angularVelocity: opts.angularVelocity || { x: 0, y: 0, z: finite(source.spin, 0) },
      radius: positive(opts.radius, 3.45, 'radius'),
      mass: positive(opts.mass, 0.43, 'mass'),
      tick: finite(opts.tick, finite(source.flightAge, 0)),
      time: finite(opts.time, 0),
      groundHeight: finite(opts.groundHeight, 0),
      grounded: finite(source.z, 0) <= finite(opts.groundHeight, 0) && finite(source.zv, 0) <= 0,
      metadata: {
        flightType: source.flightType || null,
        dip: finite(source.dip, 0),
        ...(opts.metadata || {})
      }
    });
  }

  function toLegacyState(state) {
    const source = createState(state);
    return {
      x: source.position.x,
      y: source.position.y,
      z: source.position.z,
      vx: source.velocity.x,
      vy: source.velocity.y,
      zv: source.velocity.z,
      spin: source.angularVelocity.z,
      dip: finite(source.metadata.dip, 0),
      flightType: source.metadata.flightType || null,
      flightAge: source.tick
    };
  }

  function legacyWorldStateToSI(state, system) {
    const source = createState(state);
    const scale = unitSystem(system);
    const radius = worldToMetres(source.radius, 'z', scale);
    return createState({
      ...source,
      mode: MODES.EXPERIMENTAL,
      units: UNITS.SI,
      position: {
        x: worldToMetres(source.position.x, 'x', scale),
        y: worldToMetres(source.position.y, 'y', scale),
        z: worldToMetres(source.position.z, 'z', scale) + radius
      },
      velocity: {
        x: worldPerFrameToMetresPerSecond(source.velocity.x, 'x', scale),
        y: worldPerFrameToMetresPerSecond(source.velocity.y, 'y', scale),
        z: worldPerFrameToMetresPerSecond(source.velocity.z, 'z', scale)
      },
      radius,
      groundHeight: worldToMetres(source.groundHeight, 'z', scale),
      grounded: source.grounded
    });
  }

  function siStateToLegacyWorld(state, system) {
    const source = createState(state);
    const scale = unitSystem(system);
    const radius = metresToWorld(source.radius, 'z', scale);
    return createState({
      ...source,
      mode: MODES.LEGACY,
      units: UNITS.LEGACY_WORLD,
      position: {
        x: metresToWorld(source.position.x, 'x', scale),
        y: metresToWorld(source.position.y, 'y', scale),
        z: metresToWorld(source.position.z - source.radius, 'z', scale)
      },
      velocity: {
        x: metresPerSecondToWorldPerFrame(source.velocity.x, 'x', scale),
        y: metresPerSecondToWorldPerFrame(source.velocity.y, 'y', scale),
        z: metresPerSecondToWorldPerFrame(source.velocity.z, 'z', scale)
      },
      radius,
      groundHeight: metresToWorld(source.groundHeight, 'z', scale),
      grounded: source.grounded
    });
  }

  function legacyOptions(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    return {
      gravityPerFrame: finite(source.gravityPerFrame, LEGACY_DEFAULTS.gravityPerFrame),
      airDragPerFrame: finite(source.airDragPerFrame, LEGACY_DEFAULTS.airDragPerFrame),
      framesPerSecond: positive(source.framesPerSecond, LEGACY_DEFAULTS.framesPerSecond, 'framesPerSecond')
    };
  }

  function stepLegacy(state, frames, options) {
    const count = frames === undefined ? 1 : frames;
    if (!Number.isInteger(count) || count < 0) throw new RangeError('legacy frames must be a non-negative integer');
    const config = legacyOptions(options);
    const next = createState({ ...state, mode: MODES.LEGACY, units: UNITS.LEGACY_WORLD });
    for (let index = 0; index < count; index += 1) {
      // Deliberately identical to the established predictor contract:
      // move -> gravity -> horizontal drag.
      next.position.x += next.velocity.x;
      next.position.y += next.velocity.y;
      next.position.z += next.velocity.z;
      next.velocity.z -= config.gravityPerFrame;
      next.velocity.x *= config.airDragPerFrame;
      next.velocity.y *= config.airDragPerFrame;
      next.tick += 1;
      next.time += 1 / config.framesPerSecond;
      next.grounded = next.position.z <= next.groundHeight && next.velocity.z <= 0;
    }
    return next;
  }

  function experimentalOptions(overrides) {
    const source = overrides && typeof overrides === 'object' ? overrides : {};
    const config = {};
    Object.keys(EXPERIMENTAL_DEFAULTS).forEach(key => {
      config[key] = finite(source[key], EXPERIMENTAL_DEFAULTS[key]);
    });
    positive(config.gravity, EXPERIMENTAL_DEFAULTS.gravity, 'gravity');
    positive(config.airDensity, EXPERIMENTAL_DEFAULTS.airDensity, 'airDensity');
    positive(config.maxSubstep, EXPERIMENTAL_DEFAULTS.maxSubstep, 'maxSubstep');
    if (config.dragCoefficient < 0 || config.liftSlope < 0 || config.maxLiftCoefficient < 0 ||
        config.angularAirDecay < 0 || config.rollingFriction < 0 || config.rollingSpinDecay < 0 ||
        config.settleDelay < 0) throw new RangeError('experimental coefficients cannot be negative');
    if (config.restitution < 0 || config.restitution > 1 ||
        config.tangentialRetention < 0 || config.tangentialRetention > 1) {
      throw new RangeError('contact coefficients must be between zero and one');
    }
    return config;
  }

  function integrateOrientation(state, dt) {
    const omega = state.angularVelocity;
    const speed = magnitude(omega);
    if (!(speed > 0) || !(dt > 0)) return;
    const halfAngle = speed * dt * 0.5;
    const sine = Math.sin(halfAngle) / speed;
    const delta = { x: omega.x * sine, y: omega.y * sine, z: omega.z * sine, w: Math.cos(halfAngle) };
    const q = state.orientation;
    state.orientation = quaternion({
      x: delta.w * q.x + delta.x * q.w + delta.y * q.z - delta.z * q.y,
      y: delta.w * q.y - delta.x * q.z + delta.y * q.w + delta.z * q.x,
      z: delta.w * q.z + delta.x * q.y - delta.y * q.x + delta.z * q.w,
      w: delta.w * q.w - delta.x * q.x - delta.y * q.y - delta.z * q.z
    });
  }

  function slowPlanarVelocity(velocity, amount) {
    const speed = Math.hypot(velocity.x, velocity.y);
    if (!(speed > 0)) return;
    const retained = Math.max(0, speed - amount) / speed;
    velocity.x *= retained;
    velocity.y *= retained;
  }

  function experimentalSubstep(state, dt, config) {
    if (state.settled) {
      state.time += dt;
      state.tick += 1;
      return;
    }

    const contactLevel = config.groundHeight + state.radius;
    const resting = state.position.z <= contactLevel + config.contactEpsilon && state.velocity.z <= 0;
    if (resting) {
      state.position.z = contactLevel;
      state.velocity.z = 0;
      state.grounded = true;
      slowPlanarVelocity(state.velocity, config.rollingFriction * config.gravity * dt);
      const response = 1 - Math.exp(-config.rollingSpinResponse * dt);
      const idealX = -state.velocity.y / state.radius;
      const idealY = state.velocity.x / state.radius;
      state.angularVelocity.x += (idealX - state.angularVelocity.x) * response;
      state.angularVelocity.y += (idealY - state.angularVelocity.y) * response;
      const spinRetention = Math.exp(-config.rollingSpinDecay * dt);
      state.angularVelocity.z *= spinRetention;
      integrateOrientation(state, dt);
      state.position.x += state.velocity.x * dt;
      state.position.y += state.velocity.y * dt;
    } else {
      state.grounded = false;
      const velocity = state.velocity;
      const speed = magnitude(velocity);
      const area = Math.PI * state.radius * state.radius;
      let ax = 0;
      let ay = 0;
      let az = -config.gravity;
      if (speed > 1e-9) {
        const dragScale = 0.5 * config.airDensity * area * config.dragCoefficient * speed / state.mass;
        ax -= dragScale * velocity.x;
        ay -= dragScale * velocity.y;
        az -= dragScale * velocity.z;
        const spinSpeed = magnitude(state.angularVelocity);
        const spinRatio = state.radius * spinSpeed / speed;
        const liftCoefficient = Math.min(config.maxLiftCoefficient, config.liftSlope * spinRatio);
        const magnusDirection = cross(state.angularVelocity, velocity);
        const magnusLength = magnitude(magnusDirection);
        if (magnusLength > 1e-12 && liftCoefficient > 0) {
          const magnusAcceleration = 0.5 * config.airDensity * area * liftCoefficient * speed * speed / state.mass;
          ax += magnusDirection.x / magnusLength * magnusAcceleration;
          ay += magnusDirection.y / magnusLength * magnusAcceleration;
          az += magnusDirection.z / magnusLength * magnusAcceleration;
        }
      }
      state.velocity.x += ax * dt;
      state.velocity.y += ay * dt;
      state.velocity.z += az * dt;
      const angularRetention = Math.exp(-config.angularAirDecay * dt);
      state.angularVelocity.x *= angularRetention;
      state.angularVelocity.y *= angularRetention;
      state.angularVelocity.z *= angularRetention;
      integrateOrientation(state, dt);
      state.position.x += state.velocity.x * dt;
      state.position.y += state.velocity.y * dt;
      state.position.z += state.velocity.z * dt;

      if (state.position.z <= contactLevel) {
        const incomingSpeed = Math.max(0, -state.velocity.z);
        state.position.z = contactLevel;
        state.contactCount += 1;
        state.lastContact = { tick: state.tick + 1, time: state.time + dt, normalSpeed: incomingSpeed };
        state.velocity.x *= config.tangentialRetention;
        state.velocity.y *= config.tangentialRetention;
        if (incomingSpeed >= config.minimumBounceSpeed) {
          state.velocity.z = incomingSpeed * config.restitution;
          state.grounded = false;
        } else {
          state.velocity.z = 0;
          state.grounded = true;
        }
      }
    }

    const planarSpeed = Math.hypot(state.velocity.x, state.velocity.y);
    const angularSpeed = magnitude(state.angularVelocity);
    if (state.grounded && planarSpeed <= config.settleLinearSpeed &&
        Math.abs(state.velocity.z) <= config.settleVerticalSpeed &&
        angularSpeed <= config.settleAngularSpeed) {
      state.settleTime += dt;
      if (state.settleTime >= config.settleDelay) {
        state.velocity = { x: 0, y: 0, z: 0 };
        state.angularVelocity = { x: 0, y: 0, z: 0 };
        state.settled = true;
      }
    } else {
      state.settleTime = 0;
    }
    state.time += dt;
    state.tick += 1;
  }

  function stepExperimental(state, seconds, options) {
    const duration = seconds === undefined ? 1 / 60 : finite(seconds, NaN);
    if (!(duration >= 0)) throw new RangeError('experimental seconds must be a non-negative finite number');
    const config = experimentalOptions(options);
    const next = createState({
      ...state,
      mode: MODES.EXPERIMENTAL,
      units: UNITS.SI,
      groundHeight: finite(config.groundHeight, state && state.groundHeight)
    });
    if (duration === 0) return next;
    const substeps = Math.max(1, Math.ceil(duration / config.maxSubstep));
    const dt = duration / substeps;
    for (let index = 0; index < substeps; index += 1) experimentalSubstep(next, dt, config);
    return next;
  }

  function step(state, options) {
    const config = options && typeof options === 'object' ? options : {};
    const mode = config.mode || (state && state.mode) || MODES.EXPERIMENTAL;
    if (mode === MODES.LEGACY) return stepLegacy(state, config.frames === undefined ? 1 : config.frames, config);
    if (mode === MODES.EXPERIMENTAL) return stepExperimental(state, config.seconds === undefined ? 1 / 60 : config.seconds, config);
    throw new RangeError('unknown ball-physics mode: ' + mode);
  }

  function predictSteps(state, count, options) {
    if (!Number.isInteger(count) || count < 0) throw new RangeError('prediction count must be a non-negative integer');
    const samples = [cloneState(state)];
    let current = samples[0];
    for (let index = 0; index < count; index += 1) {
      current = step(current, options);
      samples.push(current);
    }
    return { state: cloneState(current), samples: samples.map(cloneState), steps: count };
  }

  function predictUntil(state, predicate, options) {
    if (typeof predicate !== 'function') throw new TypeError('prediction predicate must be a function');
    const config = options && typeof options === 'object' ? options : {};
    const maximum = Number.isInteger(config.maxSteps) && config.maxSteps >= 0 ? config.maxSteps : 600;
    const stepOptions = { ...config };
    delete stepOptions.maxSteps;
    const samples = [cloneState(state)];
    let current = samples[0];
    let matched = Boolean(predicate(current, 0));
    let completed = 0;
    while (!matched && completed < maximum) {
      current = step(current, stepOptions);
      completed += 1;
      samples.push(current);
      matched = Boolean(predicate(current, completed));
    }
    return { state: cloneState(current), samples: samples.map(cloneState), steps: completed, matched };
  }

  return Object.freeze({
    VERSION,
    STATE_SCHEMA,
    MODES,
    UNITS,
    DEFAULT_UNIT_SYSTEM,
    LEGACY_DEFAULTS,
    EXPERIMENTAL_DEFAULTS,
    createState,
    cloneState,
    isCompleteState,
    unitSystem,
    metresToWorld,
    worldToMetres,
    metresPerSecondToWorldPerFrame,
    worldPerFrameToMetresPerSecond,
    rpmToRadiansPerSecond,
    radiansPerSecondToRpm,
    fromLegacyState,
    toLegacyState,
    legacyWorldStateToSI,
    siStateToLegacyWorld,
    stepLegacy,
    stepExperimental,
    step,
    predictSteps,
    predictUntil
  });
});
