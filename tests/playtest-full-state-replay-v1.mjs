import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Replay = require('../match-engine/playtest-full-state-replay-v1.js');

const actorId = index => index < 11 ? `home-${index + 1}` : `away-${index - 10}`;

function playersAt(frameIndex) {
  return Array.from({ length: 22 }, (_, index) => ({
    id: actorId(index),
    name: index === 0 ? 'Home goalkeeper' : index === 11 ? 'Away goalkeeper' : `Footballer ${index + 1}`,
    team: index < 11 ? 'you' : 'opp',
    role: index === 0 || index === 11 ? 'gk' : index % 3 === 0 ? 'def' : index % 3 === 1 ? 'mid' : 'fwd',
    number: index + 1,
    isGK: index === 0 || index === 11,
    x: 100 + index * 119 + frameIndex * (index < 11 ? 1.7 : -1.2),
    y: 80 + (index % 11) * 182 + Math.sin(frameIndex / 4 + index) * 3,
    vx: index < 11 ? 1.7 : -1.2,
    vy: Math.cos(frameIndex / 4 + index) * 0.2,
    fx: index < 11 ? 1 : -1,
    fy: 0,
    gait: frameIndex % 3 ? 'jog' : 'sprint',
    action: index === 5 && frameIndex === 12 ? 'pass' : 'idle',
    actionT: index === 5 && frameIndex === 12 ? 18 : 0,
    slide: 0,
    stun: 0,
    sentOff: false,
    route: index === 8 ? 'run-beyond:inside-channel' : index === 5 ? 'carrier:through-release' : 'shape-support',
    routeTargetX: 1600 + index * 28 + frameIndex * 3,
    routeTargetY: 220 + (index % 11) * 120
  }));
}

function frameAt(frameIndex, startAt = 1000) {
  const players = playersAt(frameIndex);
  const owner = frameIndex < 12 ? players[5] : null;
  return {
    t: startAt + frameIndex * 100,
    clockFrame: 6600 + frameIndex * 6,
    minute: 38 + frameIndex / 100,
    phase: 'play',
    clockLabel: `38:${String(frameIndex).padStart(2, '0')}`,
    score: { you: 1, opp: 0 },
    players,
    ball: {
      x: owner ? owner.x : 900 + frameIndex * 28,
      y: owner ? owner.y : 700 - frameIndex * 4,
      z: frameIndex < 12 ? 0 : 1,
      vx: frameIndex < 12 ? 0 : 13.5,
      vy: frameIndex < 12 ? 0 : -1.6,
      zv: 0,
      ownerId: owner && owner.id,
      lastKickerId: frameIndex >= 12 ? players[5].id : null,
      targetId: players[8].id,
      isShot: false,
      flightType: frameIndex >= 12 ? 'ground-through-ball' : '',
      shotType: '',
      spin: frameIndex >= 12 ? 0.037 : 0,
      dip: frameIndex >= 12 ? 0.012 : 0,
      curveAccel: frameIndex >= 12 ? 0.021 : 0,
      trajectoryProfile: frameIndex >= 12 ? 'authored-ground-through' : '',
      regime: frameIndex >= 12 ? 'rolling-transition' : 'controlled'
    }
  };
}

function captureClip(recorder, offset = 0, eventType = 'through-ball') {
  for (let index = 0; index <= 12; index++) recorder.ingest(frameAt(index, 1000 + offset), { force: true });
  recorder.markEvent({ type: eventType, t: 2200 + offset, seq: 19 + offset, frame: 6672, minute: 38.12, team: 'you', playerId: 'home-6' });
  for (let index = 13; index <= 50; index++) recorder.ingest(frameAt(index, 1000 + offset), { force: true });
}

test('a future playtest export preserves all 22 active footballers, ball ownership and clock around an event', () => {
  const recorder = Replay.createRecorder({ playtestId: 'FL-FULL-STATE-22', leadMs: 1200, postMs: 1800 });
  captureClip(recorder);

  const archive = recorder.exportArchive();
  assert.equal(Replay.validateArchive(archive), true);
  assert.equal(archive.schema, Replay.ARCHIVE_SCHEMA);
  assert.equal(archive.capture, 'live-full-state');
  assert.equal(archive.retroactive, false);
  assert.equal(archive.limits.maximumBytes, 655360);
  assert.equal(archive.limits.maximumClips, 10);
  assert.equal(archive.stats.maximumPlayersInFrame, 22);
  assert.ok(archive.stats.serializedBytes <= archive.limits.maximumBytes);
  assert.equal(archive.clips.length, 1);
  assert.deepEqual(archive.clips[0].playerCountRange, [22, 22]);

  const imported = Replay.archiveFromPlaytestLog({ playtestId: 'FL-FULL-STATE-22', fullStateReplay: archive });
  assert.equal(imported.schema, Replay.VIEW_SCHEMA);
  assert.equal(imported.fullState, true);
  assert.equal(imported.actors.length, 22);
  assert.equal(imported.clips[0].fullState, true);
  assert.ok(imported.clips[0].frames.length >= 20);
  assert.ok(imported.clips[0].frames.every(frame => frame.players.length === 22));

  const release = imported.clips[0].frames.find(frame => frame.ball.lastKickerId === 'home-6');
  assert.ok(release, 'the decoded clip must retain the release frame');
  assert.equal(release.players.find(player => player.id === 'home-6').name, 'Footballer 6');
  assert.equal(release.ball.ownerId, null);
  assert.equal(release.ball.targetId, 'home-9');
  assert.equal(release.ball.flightType, 'ground-through-ball');
  assert.equal(release.ball.spin, 0.037);
  assert.equal(release.ball.dip, 0.012);
  assert.equal(release.ball.curveAccel, 0.021);
  assert.equal(release.ball.trajectoryProfile, 'authored-ground-through');
  assert.equal(release.ball.regime, 'rolling-transition');
  const runner = release.players.find(player => player.id === 'home-9');
  assert.equal(runner.route, 'run-beyond:inside-channel');
  assert.ok(Number.isFinite(runner.routeTargetX));
  assert.ok(Number.isFinite(runner.routeTargetY));
  assert.ok(release.clockFrame >= 6672);
  assert.equal(release.score.home, 1);
  assert.equal(release.score.away, 0);
});

test('a timed note exports a partial live clip immediately instead of waiting for its post-roll', () => {
  const recorder = Replay.createRecorder({ playtestId: 'FL-NOTE', leadMs: 1000, postMs: 2000 });
  for (let index = 0; index < 14; index++) recorder.ingest(frameAt(index), { force: true });
  const marked = recorder.markEvent({ type: 'tester-note', t: 2300, annotationIndex: 0, frame: 6678, minute: 38.13 });
  assert.equal(marked.marked, true);

  const archive = recorder.exportArchive({ includePending: true });
  assert.equal(archive.clips.length, 1);
  assert.equal(archive.clips[0].status, 'partial-live-export');
  assert.equal(archive.clips[0].triggers[0].type, 'tester-note');
  assert.equal(archive.clips[0].triggers[0].annotationIndex, 0);
  assert.ok(archive.clips[0].triggers[0].atMs >= 900, 'the note clip must retain its leading gameplay history');
  assert.deepEqual(archive.clips[0].playerCountRange, [22, 22]);
});

test('a tester note starts its own protected incident clip instead of merging into automatic telemetry', () => {
  const recorder = Replay.createRecorder({ playtestId: 'FL-NOTE-SPLIT', leadMs: 1000, postMs: 1000 });
  for (let index = 0; index <= 10; index++) recorder.ingest(frameAt(index), { force: true });
  recorder.markEvent({ type: 'pass', t: 2000, seq: 1, frame: 6660, minute: 38.1 });
  for (let index = 11; index <= 14; index++) recorder.ingest(frameAt(index), { force: true });
  recorder.markEvent({ type: 'tester-note', t: 2400, seq: 2, frame: 6684, minute: 38.14, annotationIndex: 0 });
  const archive = recorder.exportArchive({ includePending: true });
  assert.equal(archive.clips.length, 2);
  const noteClip = archive.clips.find(clip => clip.triggers.some(trigger => trigger.type === 'tester-note'));
  assert.ok(noteClip);
  assert.deepEqual(noteClip.triggers.map(trigger => trigger.type), ['tester-note']);
  assert.ok(noteClip.triggers[0].atMs >= 900, 'the dedicated note clip must include the pre-incident route state');
  assert.equal(noteClip.priority, 100);
});

test('archive stays compact and hard-capped while preserving higher-priority clips', () => {
  const recorder = Replay.createRecorder({
    playtestId: 'FL-CAPPED',
    leadMs: 300,
    postMs: 300,
    maximumClips: 3,
    maximumBytes: 54000,
    maximumFramesPerClip: 18
  });
  const eventTypes = ['pass', 'pass', 'goal', 'pass', 'tester-note', 'pass'];
  for (let index = 0; index < eventTypes.length; index++) captureClip(recorder, index * 7000, eventTypes[index]);

  const archive = recorder.exportArchive();
  assert.ok(archive.stats.serializedBytes <= 54000, `${archive.stats.serializedBytes} bytes exceeded the cap`);
  assert.ok(archive.clips.length <= 3);
  assert.ok(archive.stats.droppedClips >= 3);
  const triggerTypes = archive.clips.flatMap(clip => clip.triggers.map(trigger => trigger.type));
  assert.ok(triggerTypes.includes('goal'));
  assert.ok(triggerTypes.includes('tester-note'));
  assert.ok(archive.clips.every(clip => clip.frames.length <= 18));
});

test('non-key telemetry does not create replay clips, but pass and note events do', () => {
  assert.equal(Replay.shouldCaptureEvent('ai-decision'), false);
  assert.equal(Replay.shouldCaptureEvent('pass'), true);
  assert.equal(Replay.shouldCaptureEvent('through-ball'), true);
  assert.equal(Replay.shouldCaptureEvent('tester-note'), true);
  assert.equal(Replay.shouldCaptureEvent('goal'), true);
});

test('module is browser-loadable and contains no old-sequence synthesis contract', async () => {
  const source = await readFile(new URL('../match-engine/playtest-full-state-replay-v1.js', import.meta.url), 'utf8');
  assert.match(source, /FootballLegacyPlaytestFullStateReplayV1/);
  assert.match(source, /compact-indexed-arrays-v1/);
  assert.match(source, /maximumBytes: 655360/);
  assert.doesNotMatch(source, /Bergkamp|Henry|Courtois|defender route|eyewitness reconstruction/i);
});

test('live match exports the bounded archive only in the downloaded or copied report', async () => {
  const html = await readFile(new URL('../match-engine/match.html', import.meta.url), 'utf8');
  assert.match(html, /<script src="playtest-full-state-replay-v1\.js\?v=174-final-candidate-2"><\/script>/);
  assert.match(html, /createRecorder\(\{maximumBytes:2097152,maximumClips:24,minimumSampleMs:90,maximumActorsPerFrame:24\}\)/);
  assert.match(html, /function captureFullStateReplaySnapshot\(t,baseSnapshot=null\)/);
  assert.match(html, /players:actors\.map\(\(player,index\)=>/);
  assert.match(html, /ownerId:ball\.owner&&String\(ball\.owner\.id\)/);
  assert.match(html, /lastKickerId:ball\.lastKicker&&String\(ball\.lastKicker\.id\)/);
  assert.match(html, /spin:Number\(ball\.spin\)\|\|0,dip:Number\(ball\.dip\)\|\|0,curveAccel:Number\(ball\.curveAccel\)\|\|0/);
  assert.match(html, /!force&&t-fullStateReplayLastSampleAt<100/);
  assert.match(html, /ingestFullStateReplayAt\(t,force,snap\)/);
  assert.match(html, /markFullStateReplayEvent\(event\)/);
  assert.match(html, /event\.type==='tester-note'&&paused&&Number\.isFinite\(fullStateReplayLastSampleAt\)\?fullStateReplayLastSampleAt:now/);
  assert.match(html, /annotationIndex=report\.annotations\.length/);
  assert.match(html, /exportArchive\(\{playtestId:report\.playtestId,includePending:true\}\)/);
  assert.match(html, /report\.summary=playtestSummary\(\);persistPlaytestLog\(true\);return fullStateReplayExportReport\(\)/);
  assert.doesNotMatch(html, /report\.fullStateReplay\s*=/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^\n]*fullStateReplay/);

  const inlineScripts = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g)];
  for (const [index, row] of inlineScripts.entries()) {
    if (row[1].trim()) assert.doesNotThrow(() => new vm.Script(row[1], { filename: `match-inline-${index}.js` }));
  }
});
