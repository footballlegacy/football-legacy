(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FootballLegacyPlaytestFullStateReplayV1 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const ARCHIVE_SCHEMA = 'football-legacy-playtest-full-state-replay-v1';
  const VIEW_SCHEMA = 'football-legacy-playtest-full-state-replay-view-v1';
  const ENCODING = 'compact-indexed-arrays-v1';
  const ACTOR_LAYOUT = Object.freeze(['id', 'name', 'team', 'role', 'number', 'isGoalkeeper']);
  const FRAME_LAYOUT = Object.freeze([
    'relativeTimeMs', 'clockFrame', 'matchMinute', 'phaseStringIndex',
    'clockLabelStringIndex', 'homeScore', 'awayScore', 'players', 'ball'
  ]);
  const PLAYER_LAYOUT = Object.freeze([
    'actorIndex', 'x', 'y', 'vx', 'vy', 'facingX', 'facingY',
    'gaitStringIndex', 'actionStringIndex', 'actionTime', 'slide', 'stun', 'sentOff',
    'routeStringIndex', 'routeTargetX', 'routeTargetY'
  ]);
  const BALL_LAYOUT = Object.freeze([
    'x', 'y', 'z', 'vx', 'vy', 'verticalVelocity', 'ownerActorIndex',
    'lastKickerActorIndex', 'targetActorIndex', 'isShot', 'flightTypeStringIndex',
    'shotTypeStringIndex', 'spin', 'dip', 'curveAcceleration',
    'trajectoryProfileStringIndex', 'regimeStringIndex'
  ]);
  const DEFAULT_LIMITS = Object.freeze({
    leadMs: 3200,
    postMs: 3200,
    maximumClipDurationMs: 9000,
    minimumSampleMs: 90,
    maximumFramesPerClip: 96,
    maximumHistoryFrames: 110,
    maximumActorsPerFrame: 32,
    maximumClips: 10,
    maximumBytes: 655360
  });
  const DEFAULT_TRIGGER_TYPES = Object.freeze([
    'tester-note', 'human-pass-intent', 'pass', 'pass-contact', 'pass-resolved',
    'through-ball', 'lob-pass', 'reception', 'heavy-touch', 'directional-knock-on',
    'shot', 'shot-off-target', 'goal', 'keeper-save', 'keeper-error', 'block',
    'tackle', 'foul', 'yellow-card', 'red-card', 'offside', 'restart',
    'free-kick-strike', 'penalty-sequence', 'set-piece-directional-delivery',
    'substitution', 'half-time', 'full-time'
  ]);
  const TRIGGER_TYPES = new Set(DEFAULT_TRIGGER_TYPES);

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, finite(value)));
  }

  function positiveInteger(value, fallback, maximum) {
    const number = Math.floor(Number(value));
    return Number.isInteger(number) && number > 0 ? Math.min(number, maximum) : fallback;
  }

  function round(value, places) {
    const power = 10 ** places;
    return Math.round(finite(value) * power) / power;
  }

  function safeText(value, maximum = 96) {
    return String(value == null ? '' : value).slice(0, maximum);
  }

  function utf8Bytes(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).byteLength;
    if (typeof Buffer === 'function') return Buffer.byteLength(text, 'utf8');
    return unescape(encodeURIComponent(text)).length;
  }

  function normaliseLimits(input) {
    const source = input && typeof input === 'object' ? input : {};
    const maximumClipDurationMs = clamp(
      source.maximumClipDurationMs == null ? DEFAULT_LIMITS.maximumClipDurationMs : source.maximumClipDurationMs,
      1000,
      15000
    );
    const leadMs = clamp(source.leadMs == null ? DEFAULT_LIMITS.leadMs : source.leadMs, 0, maximumClipDurationMs);
    const postMs = clamp(source.postMs == null ? DEFAULT_LIMITS.postMs : source.postMs, 0, maximumClipDurationMs);
    return Object.freeze({
      leadMs,
      postMs,
      maximumClipDurationMs,
      minimumSampleMs: clamp(source.minimumSampleMs == null ? DEFAULT_LIMITS.minimumSampleMs : source.minimumSampleMs, 16, 500),
      maximumFramesPerClip: positiveInteger(source.maximumFramesPerClip, DEFAULT_LIMITS.maximumFramesPerClip, 240),
      maximumHistoryFrames: positiveInteger(source.maximumHistoryFrames, DEFAULT_LIMITS.maximumHistoryFrames, 260),
      maximumActorsPerFrame: positiveInteger(source.maximumActorsPerFrame, DEFAULT_LIMITS.maximumActorsPerFrame, 40),
      maximumClips: positiveInteger(source.maximumClips, DEFAULT_LIMITS.maximumClips, 30),
      maximumBytes: positiveInteger(source.maximumBytes, DEFAULT_LIMITS.maximumBytes, 4 * 1024 * 1024)
    });
  }

  function shouldCaptureEvent(type) {
    return TRIGGER_TYPES.has(safeText(type, 64));
  }

  function triggerPriority(type) {
    const name = safeText(type, 64);
    if (name === 'tester-note') return 100;
    if (['goal', 'keeper-error', 'red-card', 'full-time'].includes(name)) return 80;
    if (['shot', 'keeper-save', 'foul', 'through-ball', 'yellow-card'].includes(name)) return 60;
    if (['pass', 'human-pass-intent', 'pass-contact', 'pass-resolved', 'reception'].includes(name)) return 30;
    return 45;
  }

  function normaliseScore(source) {
    if (Array.isArray(source)) return { home: finite(source[0]), away: finite(source[1]) };
    const score = source && typeof source === 'object' ? source : {};
    return {
      home: finite(score.home == null ? score.you : score.home),
      away: finite(score.away == null ? score.opp : score.away)
    };
  }

  function normalisePlayer(source) {
    if (!source || typeof source !== 'object') return null;
    const id = safeText(source.id, 120);
    if (!id) return null;
    return {
      id,
      name: safeText(source.name || id, 120),
      team: safeText(source.team, 32),
      role: safeText(source.role || source.position || '', 48),
      number: Number.isFinite(Number(source.number)) ? Math.round(Number(source.number)) : null,
      isGoalkeeper: !!(source.isGoalkeeper || source.isGK || String(source.role || '').toLowerCase() === 'gk'),
      x: round(source.x, 2),
      y: round(source.y, 2),
      vx: round(source.vx, 3),
      vy: round(source.vy, 3),
      fx: round(source.fx, 4),
      fy: round(source.fy, 4),
      gait: safeText(source.gait || 'idle', 48),
      action: safeText(source.action || 'idle', 64),
      actionT: round(source.actionT, 2),
      slide: round(source.slide, 2),
      stun: round(source.stun, 2),
      sentOff: !!source.sentOff,
      route: safeText(source.route, 96),
      routeTargetX: Number.isFinite(Number(source.routeTargetX)) ? round(source.routeTargetX, 2) : null,
      routeTargetY: Number.isFinite(Number(source.routeTargetY)) ? round(source.routeTargetY, 2) : null
    };
  }

  function normaliseFrame(source, limits) {
    if (!source || !Number.isFinite(Number(source.t)) || !Array.isArray(source.players) || !source.ball) return null;
    const players = source.players.slice(0, limits.maximumActorsPerFrame).map(normalisePlayer).filter(Boolean);
    if (!players.length) return null;
    const ids = new Set(players.map(player => player.id));
    if (ids.size !== players.length) return null;
    const ball = source.ball && typeof source.ball === 'object' ? source.ball : {};
    const score = normaliseScore(source.score);
    return {
      t: Number(source.t),
      clockFrame: round(source.clockFrame == null ? source.frame : source.clockFrame, 2),
      minute: round(source.minute == null ? source.matchMinute : source.minute, 2),
      phase: safeText(source.phase || source.matchPhase || 'play', 48),
      clockLabel: safeText(source.clockLabel || source.clock || '', 24),
      score,
      players,
      ball: {
        x: round(ball.x, 2),
        y: round(ball.y, 2),
        z: round(ball.z, 2),
        vx: round(ball.vx, 3),
        vy: round(ball.vy, 3),
        zv: round(ball.zv, 3),
        ownerId: safeText(ball.ownerId || ball.owner, 120),
        lastKickerId: safeText(ball.lastKickerId || ball.lastKicker, 120),
        targetId: safeText(ball.targetId || ball.target, 120),
        isShot: !!ball.isShot,
        flightType: safeText(ball.flightType, 64),
        shotType: safeText(ball.shotType, 64),
        spin: round(ball.spin, 4),
        dip: round(ball.dip, 4),
        curveAccel: round(ball.curveAccel, 4),
        trajectoryProfile: safeText(ball.trajectoryProfile, 64),
        regime: safeText(ball.regime || ball.v2Regime, 64)
      }
    };
  }

  function normaliseTrigger(source, fallbackAt) {
    const row = source && typeof source === 'object' ? source : { type: source };
    return {
      type: safeText(row.type, 64),
      t: Number.isFinite(Number(row.t)) ? Number(row.t) : fallbackAt,
      seq: Number.isFinite(Number(row.seq)) ? Math.round(Number(row.seq)) : null,
      frame: Number.isFinite(Number(row.frame)) ? round(row.frame, 2) : null,
      minute: Number.isFinite(Number(row.minute)) ? round(row.minute, 2) : null,
      team: safeText(row.team, 32) || null,
      playerId: safeText(row.playerId, 120) || null,
      annotationIndex: Number.isInteger(row.annotationIndex) ? row.annotationIndex : null,
      priority: triggerPriority(row.type)
    };
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createRecorder(options) {
    const limits = normaliseLimits(options);
    let playtestId = safeText(options && options.playtestId, 120) || null;
    let history = [];
    let pending = null;
    let clips = [];
    let clipSequence = 0;
    let lastSampleAt = -Infinity;
    let droppedClips = 0;
    let droppedFrames = 0;
    const actors = [];
    const actorIndexes = new Map();
    const strings = [''];
    const stringIndexes = new Map([['', 0]]);

    function intern(value) {
      const text = safeText(value, 96);
      if (stringIndexes.has(text)) return stringIndexes.get(text);
      const index = strings.length;
      strings.push(text);
      stringIndexes.set(text, index);
      return index;
    }

    function registerActor(player) {
      if (actorIndexes.has(player.id)) return actorIndexes.get(player.id);
      const index = actors.length;
      actors.push([player.id, player.name, player.team, player.role, player.number, player.isGoalkeeper ? 1 : 0]);
      actorIndexes.set(player.id, index);
      return index;
    }

    function actorIndex(id) {
      return id && actorIndexes.has(id) ? actorIndexes.get(id) : -1;
    }

    function compactFrame(frame, t0) {
      for (const player of frame.players) registerActor(player);
      const playerRows = frame.players.map(player => [
        actorIndex(player.id), player.x, player.y, player.vx, player.vy, player.fx, player.fy,
        intern(player.gait), intern(player.action), player.actionT, player.slide, player.stun,
        player.sentOff ? 1 : 0, intern(player.route), player.routeTargetX, player.routeTargetY
      ]);
      const ball = frame.ball;
      return [
        Math.round(frame.t - t0), frame.clockFrame, frame.minute, intern(frame.phase),
        intern(frame.clockLabel), frame.score.home, frame.score.away, playerRows,
        [ball.x, ball.y, ball.z, ball.vx, ball.vy, ball.zv, actorIndex(ball.ownerId),
          actorIndex(ball.lastKickerId), actorIndex(ball.targetId), ball.isShot ? 1 : 0,
          intern(ball.flightType), intern(ball.shotType), ball.spin, ball.dip, ball.curveAccel,
          intern(ball.trajectoryProfile), intern(ball.regime)]
      ];
    }

    function thinFrames(frames) {
      if (frames.length <= limits.maximumFramesPerClip) return frames.slice();
      const result = [];
      const last = frames.length - 1;
      for (let index = 0; index < limits.maximumFramesPerClip; index++) {
        const sourceIndex = Math.round(index * last / Math.max(1, limits.maximumFramesPerClip - 1));
        if (result[result.length - 1] !== frames[sourceIndex]) result.push(frames[sourceIndex]);
      }
      droppedFrames += Math.max(0, frames.length - result.length);
      return result;
    }

    function compactTrigger(trigger, t0) {
      return {
        type: trigger.type,
        atMs: Math.round(trigger.t - t0),
        seq: trigger.seq,
        frame: trigger.frame,
        minute: trigger.minute,
        team: trigger.team,
        playerId: trigger.playerId,
        annotationIndex: trigger.annotationIndex
      };
    }

    function compactClip(source, status) {
      const frames = thinFrames(source.frames).sort((a, b) => a.t - b.t);
      if (!frames.length) return null;
      const t0 = frames[0].t;
      const compactFrames = frames.map(frame => compactFrame(frame, t0));
      const playerCounts = frames.map(frame => frame.players.length);
      return {
        id: 'replay-' + (++clipSequence),
        status,
        t0: round(t0, 3),
        durationMs: Math.max(0, Math.round(frames[frames.length - 1].t - t0)),
        triggers: source.triggers.map(trigger => compactTrigger(trigger, t0)),
        priority: Math.max(0, ...source.triggers.map(trigger => trigger.priority)),
        playerCountRange: [Math.min(...playerCounts), Math.max(...playerCounts)],
        frames: compactFrames
      };
    }

    function trimInternalClips() {
      while (clips.length > limits.maximumClips) {
        let removeAt = 0;
        for (let index = 1; index < clips.length; index++) {
          if (clips[index].priority < clips[removeAt].priority) removeAt = index;
        }
        clips.splice(removeAt, 1);
        droppedClips++;
      }
    }

    function finalisePending(status) {
      if (!pending) return null;
      const source = pending;
      pending = null;
      const clip = compactClip(source, status || 'complete');
      if (clip) {
        clips.push(clip);
        trimInternalClips();
      }
      return clip;
    }

    function startPending(trigger) {
      const startAt = trigger.t - limits.leadMs;
      const hardEndAt = startAt + limits.maximumClipDurationMs;
      pending = {
        startAt,
        sealAt: Math.min(hardEndAt, trigger.t + limits.postMs),
        hardEndAt,
        triggers: [trigger],
        frames: history.filter(frame => frame.t >= startAt && frame.t <= trigger.t)
      };
      return pending;
    }

    function ingest(source, ingestOptions) {
      const frame = normaliseFrame(source, limits);
      if (!frame) return Object.freeze({ accepted: false, reason: 'invalid-full-state-frame' });
      const force = !!(ingestOptions && ingestOptions.force);
      if (!force && frame.t - lastSampleAt < limits.minimumSampleMs) {
        return Object.freeze({ accepted: false, reason: 'sample-cadence', at: frame.t });
      }
      lastSampleAt = frame.t;
      history.push(frame);
      const historyCutoff = frame.t - limits.leadMs - limits.minimumSampleMs;
      while (history.length > limits.maximumHistoryFrames || (history.length > 2 && history[0].t < historyCutoff)) history.shift();
      if (pending) {
        if (frame.t <= pending.hardEndAt && frame.t > (pending.frames[pending.frames.length - 1] || { t: -Infinity }).t) pending.frames.push(frame);
        if (frame.t >= pending.sealAt || frame.t >= pending.hardEndAt) finalisePending('complete');
      }
      return Object.freeze({ accepted: true, reason: null, at: frame.t, playerCount: frame.players.length });
    }

    function markEvent(source) {
      const fallbackAt = history.length ? history[history.length - 1].t : 0;
      const trigger = normaliseTrigger(source, fallbackAt);
      if (!trigger.type || (!shouldCaptureEvent(trigger.type) && !(source && source.force === true))) {
        return Object.freeze({ marked: false, reason: 'event-not-selected' });
      }
      if (pending && trigger.t > pending.hardEndAt) finalisePending('complete');
      if (pending && trigger.type === 'tester-note') finalisePending('complete-before-tester-note');
      if (!pending) startPending(trigger);
      else {
        pending.triggers.push(trigger);
        pending.sealAt = Math.min(pending.hardEndAt, Math.max(pending.sealAt, trigger.t + limits.postMs));
      }
      return Object.freeze({
        marked: true,
        reason: null,
        type: trigger.type,
        pendingFrames: pending.frames.length,
        sealAt: pending.sealAt
      });
    }

    function provisionalClip() {
      if (!pending || !pending.frames.length) return null;
      const sequence = clipSequence;
      const clip = compactClip(pending, 'partial-live-export');
      clipSequence = sequence;
      if (clip) clip.id = 'replay-pending';
      return clip;
    }

    function archiveCandidate(includePending) {
      const candidateClips = clips.map(cloneJson);
      const live = includePending ? provisionalClip() : null;
      if (live) candidateClips.push(live);
      return {
        schema: ARCHIVE_SCHEMA,
        version: VERSION,
        encoding: ENCODING,
        capture: 'live-full-state',
        scope: 'triggered-leading-and-trailing-windows',
        retroactive: false,
        playtestId,
        layouts: {
          actor: ACTOR_LAYOUT.slice(),
          frame: FRAME_LAYOUT.slice(),
          player: PLAYER_LAYOUT.slice(),
          ball: BALL_LAYOUT.slice()
        },
        limits: { ...limits },
        actors: actors.map(row => row.slice()),
        strings: strings.slice(),
        clips: candidateClips,
        stats: {
          clipCount: candidateClips.length,
          frameCount: candidateClips.reduce((sum, clip) => sum + clip.frames.length, 0),
          maximumPlayersInFrame: candidateClips.reduce((maximum, clip) => Math.max(maximum, clip.playerCountRange[1]), 0),
          droppedClips,
          droppedFrames,
          serializedBytes: 0,
          sizeCapped: false
        }
      };
    }

    function updateStats(archive) {
      archive.stats.clipCount = archive.clips.length;
      archive.stats.frameCount = archive.clips.reduce((sum, clip) => sum + clip.frames.length, 0);
      archive.stats.maximumPlayersInFrame = archive.clips.reduce((maximum, clip) => Math.max(maximum, clip.playerCountRange[1]), 0);
      archive.stats.serializedBytes = utf8Bytes(archive);
      return archive.stats.serializedBytes;
    }

    function selectEvictionIndex(rows) {
      let removeAt = 0;
      for (let index = 1; index < rows.length; index++) {
        if (rows[index].priority < rows[removeAt].priority) removeAt = index;
      }
      return removeAt;
    }

    function exportArchive(exportOptions) {
      const source = exportOptions && typeof exportOptions === 'object' ? exportOptions : {};
      if (source.playtestId != null) playtestId = safeText(source.playtestId, 120) || null;
      const archive = archiveCandidate(source.includePending !== false);
      let bytes = updateStats(archive);
      while (bytes > limits.maximumBytes && archive.clips.length > 1) {
        archive.clips.splice(selectEvictionIndex(archive.clips), 1);
        archive.stats.droppedClips++;
        archive.stats.sizeCapped = true;
        bytes = updateStats(archive);
      }
      while (bytes > limits.maximumBytes && archive.clips.length === 1 && archive.clips[0].frames.length > 2) {
        const frames = archive.clips[0].frames;
        archive.clips[0].frames = frames.filter((frame, index) => index === 0 || index === frames.length - 1 || index % 2 === 0);
        archive.clips[0].playerCountRange = archive.clips[0].frames.reduce((range, frame) => {
          const count = frame[7].length;
          return [Math.min(range[0], count), Math.max(range[1], count)];
        }, [Infinity, 0]);
        archive.stats.droppedFrames += frames.length - archive.clips[0].frames.length;
        archive.stats.sizeCapped = true;
        bytes = updateStats(archive);
      }
      bytes = updateStats(archive);
      if (bytes > limits.maximumBytes) {
        archive.clips = [];
        archive.stats.droppedClips++;
        archive.stats.sizeCapped = true;
        updateStats(archive);
      }
      return archive;
    }

    function reset(resetOptions) {
      history = [];
      pending = null;
      clips = [];
      clipSequence = 0;
      lastSampleAt = -Infinity;
      droppedClips = 0;
      droppedFrames = 0;
      actors.splice(0);
      actorIndexes.clear();
      strings.splice(1);
      stringIndexes.clear();
      stringIndexes.set('', 0);
      if (resetOptions && resetOptions.playtestId != null) playtestId = safeText(resetOptions.playtestId, 120) || null;
      return status();
    }

    function status() {
      return Object.freeze({
        schema: ARCHIVE_SCHEMA,
        playtestId,
        historyFrames: history.length,
        pending: !!pending,
        completedClips: clips.length,
        actors: actors.length,
        limits
      });
    }

    return Object.freeze({ ingest, markEvent, exportArchive, reset, status, limits });
  }

  function validateArchive(archive) {
    if (!archive || archive.schema !== ARCHIVE_SCHEMA || archive.encoding !== ENCODING) throw new Error('Unsupported full-state replay archive.');
    if (!Array.isArray(archive.actors) || !Array.isArray(archive.strings) || !Array.isArray(archive.clips)) throw new Error('Full-state replay tables are missing.');
    for (const clip of archive.clips) {
      if (!clip || !Array.isArray(clip.frames) || !Array.isArray(clip.triggers)) throw new Error('Full-state replay clip is malformed.');
      for (const frame of clip.frames) {
        if (!Array.isArray(frame) || frame.length !== FRAME_LAYOUT.length || !Array.isArray(frame[7]) || !Array.isArray(frame[8])) throw new Error('Full-state replay frame is malformed.');
        for (const player of frame[7]) {
          if (!Array.isArray(player) || player.length !== PLAYER_LAYOUT.length || !archive.actors[player[0]]) throw new Error('Full-state replay player row is malformed.');
        }
      }
    }
    return true;
  }

  function decodeArchive(archive) {
    validateArchive(archive);
    const actorObjects = archive.actors.map(row => ({
      id: row[0], name: row[1], team: row[2], role: row[3], number: row[4], isGoalkeeper: !!row[5]
    }));
    const stringAt = index => archive.strings[index] || '';
    const clips = archive.clips.map(clip => ({
      id: clip.id,
      status: clip.status,
      durationMs: clip.durationMs,
      fullState: true,
      triggers: cloneJson(clip.triggers),
      frames: clip.frames.map(row => {
        const players = row[7].map(player => ({
          ...actorObjects[player[0]],
          x: player[1], y: player[2], vx: player[3], vy: player[4], fx: player[5], fy: player[6],
          gait: stringAt(player[7]), action: stringAt(player[8]), actionT: player[9],
          slide: player[10], stun: player[11], sentOff: !!player[12], route: stringAt(player[13]),
          routeTargetX: player[14], routeTargetY: player[15]
        }));
        const ball = row[8];
        return {
          t: clip.t0 + row[0],
          clockFrame: row[1],
          minute: row[2],
          phase: stringAt(row[3]),
          clockLabel: stringAt(row[4]),
          score: { home: row[5], away: row[6] },
          players,
          ball: {
            x: ball[0], y: ball[1], z: ball[2], vx: ball[3], vy: ball[4], zv: ball[5],
            ownerId: actorObjects[ball[6]] ? actorObjects[ball[6]].id : null,
            lastKickerId: actorObjects[ball[7]] ? actorObjects[ball[7]].id : null,
            targetId: actorObjects[ball[8]] ? actorObjects[ball[8]].id : null,
            isShot: !!ball[9], flightType: stringAt(ball[10]), shotType: stringAt(ball[11]),
            spin: ball[12], dip: ball[13], curveAccel: ball[14],
            trajectoryProfile: stringAt(ball[15]), regime: stringAt(ball[16])
          }
        };
      })
    }));
    return {
      schema: VIEW_SCHEMA,
      sourceSchema: ARCHIVE_SCHEMA,
      playtestId: archive.playtestId,
      capture: archive.capture,
      retroactive: false,
      fullState: true,
      actors: actorObjects,
      clips,
      stats: cloneJson(archive.stats || {})
    };
  }

  function archiveFromPlaytestLog(log) {
    if (!log || typeof log !== 'object') throw new Error('Playtest log is unavailable.');
    const archive = log.fullStateReplay || log.replayArchive;
    if (!archive) throw new Error('This playtest predates full-state replay persistence.');
    return decodeArchive(archive);
  }

  return Object.freeze({
    VERSION,
    ARCHIVE_SCHEMA,
    VIEW_SCHEMA,
    ENCODING,
    ACTOR_LAYOUT,
    FRAME_LAYOUT,
    PLAYER_LAYOUT,
    BALL_LAYOUT,
    DEFAULT_LIMITS,
    DEFAULT_TRIGGER_TYPES,
    shouldCaptureEvent,
    createRecorder,
    validateArchive,
    decodeArchive,
    archiveFromPlaytestLog,
    utf8Bytes
  });
});
