'use strict';

/*
 * Build 173 live shadow attachment.
 *
 * This is a telemetry-only host wrapper. It captures detached boundaries
 * around exactly one authoritative Build 173 update call and hands them to
 * the independently reviewed plain-host capture. It has no route back into
 * the match and deliberately exposes no candidate snapshot, command,
 * projection, force or application surface.
 */
(function exposeBuild173LiveShadowHook(root, factory) {
  const dependency = typeof module === 'object' && module.exports
    ? require('./build173-shadow-host-capture-v2.js')
    : root && root.FootballLegacyBuild173ShadowHostCaptureV2;
  const api = factory(dependency);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FootballLegacyBuild173LiveShadowHookV2 = api;
})(typeof window === 'object' ? window : null, function createBuild173LiveShadowHookApi(Capture) {
  'use strict';

  const VERSION = '2.0.0-build173-exact-flag-live-shadow-hook';
  const ACKNOWLEDGEMENT = 'EXPLICIT_BUILD_173_EXACT_FLAG_OFFLINE_TELEMETRY_HOOK';
  const DIAGNOSTIC_SCHEMA = 'football-legacy-build173-live-shadow-hook-diagnostic-v2';
  const MAX_REASON_LENGTH = 1024;

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(key => { output[key] = clone(value[key]); });
    return output;
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function detached(value) {
    return deepFreeze(clone(value));
  }

  function safeReason(error) {
    try {
      return String(error && error.message || error || 'unknown shadow-hook error').slice(0, MAX_REASON_LENGTH);
    } catch (ignored) {
      return 'unreadable shadow-hook error';
    }
  }

  function createAttachment(options) {
    const source = options && typeof options === 'object' ? options : {};
    const requestedEnabled = source.enabled === true && source.acknowledgement === ACKNOWLEDGEMENT;
    const workflow = String(source.workflow || 'quick-play');
    const host = source.host && typeof source.host === 'object' ? source.host : null;
    const baseSessionId = String(source.sessionId || 'build173-live-shadow').slice(0, 180);
    let enabled = false;
    let attachmentAvailable = false;
    let lifecycle = requestedEnabled ? 'awaiting-new-match' : 'disabled';
    let reason = requestedEnabled ? 'awaiting-fresh-match-epoch' : 'disabled-by-default';
    let session = null;
    let epochSerial = 0;
    let epochId = null;
    let hostUpdateSequence = 0;
    let failure = null;

    function selfFreeze(error, stage) {
      enabled = false;
      attachmentAvailable = false;
      lifecycle = 'self-frozen';
      reason = safeReason(error);
      failure = deepFreeze({ stage: String(stage || 'unknown'), reason });
      return diagnostic();
    }

    function diagnostic() {
      return deepFreeze({
        schema: DIAGNOSTIC_SCHEMA,
        version: VERSION,
        requestedEnabled,
        enabled,
        workflow,
        lifecycle,
        reason,
        epochId,
        hostUpdateSequence,
        failure: failure && clone(failure),
        authority: 'build-173-legacy',
        readOnly: true,
        liveWrites: false
      });
    }

    if (requestedEnabled) {
      try {
        if (!Capture || typeof Capture.resolveStatus !== 'function' ||
          typeof Capture.createCaptureSession !== 'function') {
          throw new Error('reviewed Build 173 host capture dependency is unavailable');
        }
        const status = Capture.resolveStatus({
          enabled: true,
          acknowledgement: Capture.ACKNOWLEDGEMENT,
          workflow,
          online: source.online === true,
          onlineMarkers: detached(source.onlineMarkers || {})
        });
        if (!status.enabled) {
          lifecycle = status.reason === 'online-frozen' ? 'online-frozen' : 'disabled';
          reason = status.reason;
        } else if (!host || typeof host.sessionOptions !== 'function' ||
          typeof host.captureSnapshot !== 'function' ||
          typeof host.captureTeamStates !== 'function') {
          throw new Error('Build 173 shadow host facade is incomplete');
        } else {
          enabled = true;
          attachmentAvailable = true;
        }
      } catch (error) {
        selfFreeze(error, 'construct');
      }
    }

    function resetForNewMatch() {
      if (!attachmentAvailable) return diagnostic();
      try {
        enabled = true;
        epochSerial += 1;
        epochId = baseSessionId + ':epoch:' + epochSerial;
        hostUpdateSequence = 0;
        const supplied = detached(host.sessionOptions());
        session = Capture.createCaptureSession({
          ...supplied,
          enabled: true,
          acknowledgement: Capture.ACKNOWLEDGEMENT,
          workflow,
          online: false,
          onlineMarkers: detached(source.onlineMarkers || {}),
          sessionId: baseSessionId + ':capture:' + epochSerial
        });
        if (!session.status || session.status.enabled !== true) {
          throw new Error('host capture session rejected the exact offline attachment');
        }
        lifecycle = 'awaiting-kickoff';
        reason = 'fresh-match-epoch-awaiting-arm';
        failure = null;
      } catch (error) {
        selfFreeze(error, 'reset-for-new-match');
      }
      return diagnostic();
    }

    function arm(kind) {
      if (!enabled || lifecycle !== 'awaiting-kickoff' || !session) return diagnostic();
      try {
        const suiteWorkflow = workflow === 'set-piece-suite';
        const suiteReadyArm = kind === 'set-piece-suite-ready';
        if (suiteWorkflow !== suiteReadyArm) {
          throw new Error('shadow arm method does not match the attachment workflow');
        }
        const snapshot = detached(host.captureSnapshot({
          freeKickPracticeReady: suiteReadyArm
        }));
        const result = session.arm(snapshot, { epochId });
        if (!result || result.lifecycle !== 'armed') {
          throw new Error(result && result.reason || 'host capture refused the arming boundary');
        }
        lifecycle = 'armed';
        reason = suiteReadyArm
          ? 'armed-after-set-piece-suite-ready-init'
          : 'armed-after-post-walkout-kickoff';
      } catch (error) {
        selfFreeze(error, 'arm');
      }
      return diagnostic();
    }

    function armAfterPostWalkoutKickoff() {
      return arm('post-walkout-kickoff');
    }

    function armAfterSetPieceSuiteReady() {
      return arm('set-piece-suite-ready');
    }

    function finishBeforeFullTimePresentation() {
      if (!enabled || !session || lifecycle === 'finished') return diagnostic();
      try {
        const result = session.finish('full-time-before-presentation-staging');
        if (result && result.lifecycle === 'self-frozen') {
          throw new Error(result.reason || 'host capture self-froze while finishing');
        }
        lifecycle = 'finished';
        reason = 'finished-before-full-time-presentation';
        enabled = false;
      } catch (error) {
        selfFreeze(error, 'finish');
      }
      return diagnostic();
    }

    function substitutions(before, after) {
      const beforeRows = Array.isArray(before && before.players) ? before.players : [];
      const afterRows = Array.isArray(after && after.players) ? after.players : [];
      const prior = Object.fromEntries(beforeRows.map(row => [String(row.teamId) + ':' + String(row.slotId), row]));
      return afterRows.reduce((rows, row) => {
        const previous = prior[String(row.teamId) + ':' + String(row.slotId)];
        const oldId = previous && String(previous.actualPlayerId || previous.id || '');
        const newId = String(row.actualPlayerId || row.id || '');
        if (previous && oldId !== newId) rows.push({
          teamId: String(row.teamId),
          slotId: String(row.slotId),
          outPlayerId: oldId,
          inPlayerId: newId
        });
        return rows;
      }, []);
    }

    function runAuthoritativeUpdate(legacyUpdate, updateMetadata) {
      if (typeof legacyUpdate !== 'function') throw new TypeError('legacyUpdate must be a function');
      if (!enabled || lifecycle !== 'armed' || !session) return legacyUpdate();
      let before = null;
      let captureReady = true;
      try {
        before = detached(host.captureSnapshot());
      } catch (error) {
        captureReady = false;
        selfFreeze(error, 'capture-before');
      }

      // This is the one and only authoritative update call. Errors from the
      // legacy game retain their original behaviour and are never hidden.
      const result = legacyUpdate();

      if (!captureReady || !enabled || lifecycle !== 'armed') return result;
      try {
        const after = detached(host.captureSnapshot());
        const metadata = detached(updateMetadata || {});
        hostUpdateSequence += 1;
        const captured = session.captureTick({
          before,
          after,
          update: {
            hostUpdateSequence,
            renderFrameSequence: Number.isInteger(metadata.renderFrameSequence)
              ? metadata.renderFrameSequence : hostUpdateSequence,
            simulationStepIndex: Number.isInteger(metadata.simulationStepIndex)
              ? metadata.simulationStepIndex : 0,
            simulationStepsPerRender: Number.isInteger(metadata.simulationStepsPerRender)
              ? metadata.simulationStepsPerRender : 1
          },
          substitutions: substitutions(before, after),
          teamStates: detached(host.captureTeamStates(after)),
          movementCommands: [],
          environment: typeof host.captureEnvironment === 'function'
            ? detached(host.captureEnvironment()) : {}
        });
        if (!captured || captured.accepted !== true) {
          throw new Error(captured && captured.reason || 'host capture rejected the update boundary');
        }
      } catch (error) {
        selfFreeze(error, 'capture-after-observe');
      }
      return result;
    }

    function selectTickRunner(legacyUpdate, metadataFactory) {
      if (typeof legacyUpdate !== 'function') throw new TypeError('legacyUpdate must be a function');
      if (!enabled) return legacyUpdate;
      return function selectedBuild173ShadowTick() {
        let metadata = {};
        if (typeof metadataFactory === 'function') {
          try { metadata = metadataFactory(); }
          catch (error) { selfFreeze(error, 'tick-metadata'); }
        }
        return runAuthoritativeUpdate(legacyUpdate, metadata);
      };
    }

    function exportTelemetry() {
      if (!session || typeof session.exportTelemetry !== 'function') {
        return deepFreeze({ diagnostic: diagnostic(), telemetry: null });
      }
      try {
        return deepFreeze({ diagnostic: diagnostic(), telemetry: detached(session.exportTelemetry()) });
      } catch (error) {
        selfFreeze(error, 'telemetry-export');
        return deepFreeze({ diagnostic: diagnostic(), telemetry: null });
      }
    }

    return Object.freeze({
      diagnostic,
      resetForNewMatch,
      armAfterPostWalkoutKickoff,
      armAfterSetPieceSuiteReady,
      finishBeforeFullTimePresentation,
      runAuthoritativeUpdate,
      selectTickRunner,
      exportTelemetry
    });
  }

  return Object.freeze({
    VERSION,
    ACKNOWLEDGEMENT,
    DIAGNOSTIC_SCHEMA,
    createAttachment
  });
});
