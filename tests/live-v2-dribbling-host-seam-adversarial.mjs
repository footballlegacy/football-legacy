import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchPath = path.join(root, 'match-engine', 'match.html');
const matchSource = readFileSync(matchPath, 'utf8');

function sourceWindow(start, end) {
  const from = matchSource.indexOf(start);
  assert.notEqual(from, -1, `missing host source anchor: ${start}`);
  const to = matchSource.indexOf(end, from + start.length);
  assert.ok(to > from, `missing host source end anchor after ${start}: ${end}`);
  return matchSource.slice(from, to);
}

function functionSource(name) {
  const marker = `function ${name}(`;
  const start = matchSource.indexOf(marker);
  assert.notEqual(start, -1, `missing extractable host helper: ${name}`);
  const open = matchSource.indexOf('{', start + marker.length);
  assert.notEqual(open, -1, `missing opening brace for host helper: ${name}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < matchSource.length; index += 1) {
    const char = matchSource[index];
    const next = matchSource[index + 1];
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return matchSource.slice(start, index + 1);
    }
  }
  assert.fail(`unterminated host helper: ${name}`);
}

function preflight(query, payload) {
  const script = matchSource.match(/<script id="offlineLiveV2Preflight">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'offline FL V2 preflight must remain extractable');
  const encoded = payload == null ? '' : Buffer.from(JSON.stringify(payload)).toString('base64url');
  const writes = [];
  const context = vm.createContext({
    URLSearchParams,
    TextDecoder,
    Uint8Array,
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    location: { search: query, hash: encoded ? `#flMatch=${encoded}` : '' },
    document: { write: value => writes.push(value) },
    window: {}
  });
  vm.runInContext(script, context, { filename: 'live-v2-dribbling-host-preflight.vm.js' });
  const scripts = writes.map(value => value.match(/src="([^"?]+)/)?.[1]).filter(Boolean);
  return {
    value: JSON.parse(JSON.stringify(context.window.__FL_V2_LIVE_PREFLIGHT)),
    scripts
  };
}

function payload(matchType = 'single-player', overrides = {}) {
  const controllers = matchType === 'spectator'
    ? { player1Team: null, player2Team: null, aiTeam: 'both' }
    : matchType === 'co-op'
      ? { player1Team: 'home', player2Team: 'away', aiTeam: null }
      : matchType === 'home-co-op'
        ? { player1Team: 'home', player2Team: 'home', aiTeam: 'away', cooperative: true }
        : { player1Team: 'home', player2Team: null, aiTeam: 'away' };
  return {
    mode: 'quickPlay',
    matchType,
    online: null,
    controllers,
    engine: {
      requested: 'fl-v2',
      effective: 'fl-v2',
      version: '1.0.0-offline-live-authority-playtest',
      fallbackReason: null
    },
    simulationSeed: 733173,
    homeTeam: { id: 'host-seam-home' },
    awayTeam: { id: 'host-seam-away' },
    ...overrides
  };
}

function exactQuery(extra = '') {
  return `?engine=fl-v2&simulationSeed=733173${extra}`;
}

function createActionHarness() {
  const ownsSource = functionSource('liveV2DribbleLeaseOwns');
  const queueSource = functionSource('liveV2QueueDribbleAction');
  const acknowledgeSource = functionSource('liveV2AcknowledgeDribbleAction');
  return new Function(`
    let liveV2DribbleLeaseOwnerId = null;
    let liveV2PendingDribbleAction = null;
    let liveV2DribbleActionSerial = 0;
    let liveV2ConsumedDribbleActionIds = new Set();
    let liveV2Tick = 12;
    let clockFrames = 720;
    const LIVE_V2_PREFLIGHT = { workflow: 'single-player' };
    const liveV2Authority = {};
    const ball = { owner: null };
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    const liveV2Clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
    ${ownsSource}
    ${queueSource}
    ${acknowledgeSource}
    return {
      owns: liveV2DribbleLeaseOwns,
      queue: liveV2QueueDribbleAction,
      acknowledge: liveV2AcknowledgeDribbleAction,
      setLease(value) { liveV2DribbleLeaseOwnerId = value; },
      setTick(value) { liveV2Tick = value; clockFrames = value * 60; },
      state() {
        return {
          leaseOwnerId: liveV2DribbleLeaseOwnerId,
          pending: liveV2Clone(liveV2PendingDribbleAction),
          serial: liveV2DribbleActionSerial,
          consumed: [...liveV2ConsumedDribbleActionIds]
        };
      }
    };
  `)();
}

test('conditional loader places Dribbling V2 after Ball V2 and before the live adapter on exact offline normal-match routes only', () => {
  const single = preflight(exactQuery(), payload('single-player'));
  assert.equal(single.value.eligible, true);
  assert.equal(single.value.workflow, 'single-player');
  assert.equal(single.scripts.filter(name => name === 'dribbling-state-v2.js').length, 1);
  assert.ok(single.scripts.indexOf('ball-engine-v2.js') < single.scripts.indexOf('dribbling-state-v2.js'));
  assert.ok(single.scripts.indexOf('dribbling-state-v2.js') < single.scripts.indexOf('live-v2-authority-adapter.js'));

  const cpu = preflight(exactQuery('&autoplay=1'), payload('spectator'));
  assert.equal(cpu.value.eligible, true);
  assert.equal(cpu.value.workflow, 'cpu-v-cpu');
  assert.equal(cpu.scripts.filter(name => name === 'dribbling-state-v2.js').length, 1);
  assert.ok(cpu.scripts.indexOf('dribbling-state-v2.js') < cpu.scripts.indexOf('live-v2-authority-adapter.js'));

  const suite = preflight(exactQuery(), payload('free-kick-suite'));
  assert.equal(suite.value.workflow, 'set-piece-suite');
  assert.equal(suite.scripts.includes('dribbling-state-v2.js'), false,
    'Set-Piece Suite must not load normal-match dribbling authority');

  const defaultBuild = preflight('', {
    ...payload('single-player'),
    engine: { requested: 'build-173', effective: 'build-173', version: '0.174', fallbackReason: null }
  });
  assert.equal(defaultBuild.value.requested, false);
  assert.deepEqual(defaultBuild.scripts, []);

  for (const [label, query, config] of [
    ['online', exactQuery('&online=1'), payload('online', {
      online: { protocol: 'football-legacy-online-v1' },
      controllers: { player1Team: 'home', player2Team: 'away', aiTeam: null, online: true }
    })],
    ['local two-player', exactQuery(), payload('co-op')],
    ['same-team co-op', exactQuery(), payload('home-co-op')]
  ]) {
    const result = preflight(query, config);
    assert.equal(result.value.eligible, false, label);
    assert.deepEqual(result.scripts, [], label);
  }
});

test('host snapshot carries one weather-only surface and pending action through the shared Single Player and CPU-v-CPU seam', () => {
  const snapshot = functionSource('liveV2Snapshot');
  assert.match(snapshot, /dribbling:\{[^{}]*surface:/,
    'live snapshot must publish the Dribbling V2 input namespace');
  assert.match(snapshot, /CONFIG\.weather==='rain'\?'wet':'dry'/,
    'only rain may map the live pitch to the wet surface profile');
  assert.match(snapshot, /actionIntent:liveV2PendingDribbleAction/,
    'the stable host action must remain visible until acknowledgement');
  const dribblingLiteral = snapshot.slice(snapshot.indexOf('dribbling:'), snapshot.indexOf('dribbling:') + 260);
  assert.doesNotMatch(dribblingLiteral, /difficulty|D0|aiDifficulty/i,
    'difficulty must not enter the physical dribbling request');

  const run = functionSource('liveV2RunTick');
  const prepare = functionSource('liveV2PrepareHostTick');
  assert.match(run, /liveV2Snapshot\(nextTick\)/);
  assert.match(prepare, /liveV2ApplyDribbling\(projection\)/);
  assert.doesNotMatch(prepare, /workflow==='single-player'.*liveV2ApplyDribbling|workflow==='cpu-v-cpu'.*liveV2ApplyDribbling/,
    'both supported workflows must commit through the same host projection seam');
});

test('separated projection preserves logical lease, clears physical ownership, and applies Ball V2 before presentation', () => {
  const movement = functionSource('liveV2ApplyMovement');
  const ballApply = functionSource('liveV2ApplyBall');
  const contactApply = functionSource('liveV2ApplyContact');
  const dribbling = functionSource('liveV2ApplyDribbling');
  const prepare = functionSource('liveV2PrepareHostTick');

  assert.match(movement, /projection\.physicalBallSeparated/);
  assert.match(movement, /projection\.(?:logicalBallOwnerId|movementBallOwnerId)/);
  assert.match(dribbling, /projection\.physicalBallSeparated/);
  assert.match(dribbling, /projection\.logicalBallOwnerId/);
  assert.match(dribbling, /ball\.owner=null/,
    'physical Ball must be ownerless for the duration of the logical action lease');
  assert.match(ballApply, /projection\.ball/);
  assert.match(ballApply, /physicalBallSeparated/,
    'Ball V2 geometry must still apply when logical possession survives');
  assert.match(contactApply, /liveV2SuppressLegacyReception=projection\.physicalBallSeparated===true/);
  assert.match(contactApply, /liveV2SuppressLegacyReception=dribblingOwnsReception\|\|suppress\.reception===true/,
    'a separated Dribbling V2 tick must not be reclaimed by the same-frame legacy reception loop');

  const order = [
    'liveV2ApplyMovement(projection)',
    'liveV2ApplyIntelligence(projection)',
    'liveV2ApplyBall(projection)',
    'liveV2ApplyContact(projection)',
    'liveV2ApplyDribbling(projection)'
  ].map(call => prepare.indexOf(call));
  assert.ok(order.every(index => index >= 0), `missing host apply call(s): ${JSON.stringify(order)}`);
  assert.deepEqual(order, [...order].sort((a, b) => a - b),
    'host must apply movement, intelligence, Ball, contact, then dribbling presentation');
});

test('lease queue accepts one pass or shot, rejects non-lease input, and acknowledgement clears only the matching ID once', () => {
  const host = createActionHarness();
  const carrier = { id: 'home-carrier' };
  const stranger = { id: 'home-stranger' };

  assert.equal(host.owns(carrier), false);
  assert.equal(host.queue('pass', carrier, 0.6, {}), null,
    'ordinary Build 173/default input must not be intercepted without a live lease');
  host.setLease(carrier.id);
  assert.equal(host.owns(carrier), true);
  assert.equal(host.owns(stranger), false);
  assert.equal(host.queue('cross', carrier, 0.6, {}), null, 'only pass and shot may enter the lease buffer');
  assert.equal(host.queue('pass', stranger, 0.6, {}), null, 'a different actor cannot borrow the lease');

  const passId = host.queue('pass', carrier, 0.62, { targetPlayerId: 'home-runner' });
  assert.equal(typeof passId, 'string');
  assert.ok(passId.length > 0);
  assert.equal(host.state().pending.id, passId);
  assert.equal(host.state().pending.type, 'pass');
  assert.equal(host.queue('shot', carrier, 0.9, {}), null, 'one physical lease cannot stage two host actions');

  host.acknowledge({ bufferedAction: { id: 'not-the-pending-id' }, releasedAction: null });
  assert.equal(host.state().pending.id, passId, 'foreign acknowledgement must not clear pending input');
  host.acknowledge({ bufferedAction: { id: passId }, releasedAction: null });
  assert.equal(host.state().pending, null);
  const afterFirstAck = host.state();
  host.acknowledge({ bufferedAction: { id: passId }, releasedAction: null });
  assert.deepEqual(host.state(), afterFirstAck, 'replayed acknowledgement must be a no-op');

  host.setTick(13);
  const shotId = host.queue('shot', carrier, 0.78, { shotType: 'normal' });
  assert.equal(typeof shotId, 'string');
  assert.notEqual(shotId, passId);
  assert.equal(host.state().serial, 2);
  host.acknowledge({ bufferedAction: null, releasedAction: { id: shotId } });
  assert.equal(host.state().pending, null);
  assert.equal(host.state().serial, 2, 'acknowledgement must not mint another action');
});

test('human pass and shot releases queue during the lease and execute exactly once only after physical resecure', () => {
  const pass = functionSource('doPassForHuman');
  const shot = functionSource('doShootForHuman');
  const apply = functionSource('liveV2ApplyDribbling');

  const passQueue = pass.indexOf("liveV2QueueDribbleAction('pass',src,power");
  const shotQueue = shot.indexOf("liveV2QueueDribbleAction('shot',src,power");
  assert.ok(passQueue >= 0, 'human pass release must offer its stable command to the active lease');
  assert.ok(shotQueue >= 0, 'human shot release must offer its stable command to the active lease');
  assert.ok(passQueue < pass.indexOf('liveV2QueueLaunch'), 'queued pass must precede physical launch');
  assert.ok(shotQueue < shot.indexOf('liveV2QueueLaunch'), 'queued shot must precede physical launch');

  assert.match(apply, /releasedAction/);
  assert.match(apply, /physicalBallSeparated/);
  assert.match(apply, /resecure/,
    'a buffered action may be launched only after the projection physically resecures');
  assert.match(apply, /liveV2ConsumedDribbleActionIds\.has\(/);
  assert.match(apply, /liveV2ConsumedDribbleActionIds\.add\(/);
  assert.match(apply, /releasedAction\.type==='pass'/);
  assert.match(apply, /releasedAction\.type==='shot'/);
  assert.match(apply, /doPassForHuman\(/);
  assert.match(apply, /doShootForHuman\(/);
  assert.match(apply, /liveV2AcknowledgeDribbleAction\(/);
  assert.match(apply, /if\(!physicalBallSeparated&&liveV2PendingDribbleAction\)/,
    'a heavy touch, turnover or protected handoff must retire an unacknowledged terminal-tick action');
  assert.match(apply, /physical-lease-ended-without-release/);
});

test('host rollback restores lease, pending action, serial and exact-once ledger', () => {
  const transaction = sourceWindow('function liveV2CaptureTransactionState', 'function liveV2ApplyMovement');
  const capture = transaction.slice(0, transaction.indexOf('function liveV2RestoreTransactionState'));
  const restore = transaction.slice(transaction.indexOf('function liveV2RestoreTransactionState'));
  for (const field of [
    'liveV2DribbleLeaseOwnerId',
    'liveV2PendingDribbleAction',
    'liveV2DribbleActionSerial',
    'liveV2ConsumedDribbleActionIds'
  ]) {
    assert.ok(capture.includes(field), `transaction capture omitted ${field}`);
    assert.match(restore, new RegExp(`${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=|${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.`),
      `transaction rollback omitted ${field}`);
  }
  assert.match(restore, /new Set\(/,
    'rollback must restore a detached exact-once ledger, not alias the mutated Set');

  const outer = functionSource('liveV2RunTick');
  assert.match(outer, /liveV2RestoreTransactionState\(saved\)/);
  assert.match(outer, /rollbackPrepared\(prepared,error\)/);
});

test('dribble presentation cannot synthesize a reception and protected skill handoff is consumed at most once', () => {
  const apply = functionSource('liveV2ApplyDribbling');
  assert.match(apply, /presentation/);
  assert.match(apply, /animationPhase/);
  assert.doesNotMatch(apply, /logEvent\(['"]reception['"]/,
    'a separated dribble contact is presentation, not a new reception');
  assert.doesNotMatch(apply, /stats\.touches\+\+/,
    'presentation alone must not mint a legacy touch statistic');

  assert.match(apply, /authorityHandoff/);
  assert.match(apply, /executeExactlyOnce/);
  assert.match(apply, /liveV2ConsumedDribbleActionIds\.has\(/);
  assert.match(apply, /liveV2ConsumedDribbleActionIds\.add\(/);
  const observe = functionSource('liveV2ObserveBoundary');
  assert.match(observe, /liveV2DribbleLeaseOwnerId=null/);
  assert.match(observe, /liveV2PendingDribbleAction=null/);
});

test('physical dribbling presentation has dedicated foot, contact, chase, gather and failure animation poses', () => {
  const apply = functionSource('liveV2ApplyDribbling');
  const place = functionSource('place');
  for (const field of ['dribbleFoot', 'dribbleContact', 'dribbleSeparation', 'dribbleTargetSeparation', 'dribbleOutcome']) {
    assert.match(apply, new RegExp(`actor\\.${field}=`), `host projection omitted ${field}`);
  }
  for (const action of ['dribbleTouchWindup', 'dribbleTouchContact', 'dribbleTouchChase', 'dribbleTouchGather', 'dribbleTouchHeavy', 'dribbleCarry']) {
    assert.match(apply, new RegExp(`['"]${action}['"]`), `host never assigns ${action}`);
    assert.match(place, new RegExp(`['"]${action}['"]`), `renderer has no ${action} pose`);
  }
  assert.match(place, /p\.dribbleFoot==='left'/);
  assert.match(place, /p\.dribbleContact\|\|'instep-push'/);
  assert.match(place, /p\.dribbleSeparation/);
  assert.match(place, /p\.dribbleTargetSeparation/);
  assert.match(place, /contactKind==='inside-cut'/);
  assert.match(place, /contactKind==='outside-push'/);
});
