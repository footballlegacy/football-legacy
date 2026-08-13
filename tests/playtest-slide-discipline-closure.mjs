import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matchPath = path.join(root, 'match-engine', 'match.html');
const match = fs.readFileSync(matchPath, 'utf8');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function sourceBetween(start, end) {
  const from = match.indexOf(start);
  const to = match.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing source boundary: ${start}`);
  assert.ok(to > from, `missing source boundary: ${end}`);
  return match.slice(from, to);
}

const profileSource = sourceBetween('function slideDisciplineProfile', 'function recordChallenge');
const injectedContactImpact = offender => ({
  entrySpeed: offender.challengeEntrySpeed,
  closingSpeed: offender.__impact.closingSpeed,
  relativeSpeed: offender.__impact.relativeSpeed,
  intensity: offender.__impact.intensity
});
const slideDisciplineProfile = new Function(
  'clamp',
  'contactImpact',
  `${profileSource}; return slideDisciplineProfile;`
)(clamp, injectedContactImpact);

function profile({ rear = false, entry = 0, closing = 0, relative = 0, intensity = 0 } = {}) {
  const offender = Object.freeze({
    id: 'tackler',
    x: rear ? -1 : 1,
    y: 0,
    fx: rear ? 1 : -1,
    fy: 0,
    vx: 0,
    vy: 0,
    slideEntrySpeed: entry,
    __impact: Object.freeze({ closingSpeed: closing, relativeSpeed: relative, intensity })
  });
  const victim = Object.freeze({ id: 'carrier', x: 0, y: 0, fx: 1, fy: 0 });
  return slideDisciplineProfile(offender, victim);
}

function assertBoundary({ below, exact, belowCategory, exactCategory }) {
  const belowResult = profile(below);
  const exactResult = profile(exact);
  assert.equal(belowResult.category, belowCategory);
  assert.equal(exactResult.category, exactCategory);
  assert.equal(belowResult.forceRed, false);
  assert.equal(exactResult.forceRed, exactCategory === 'dangerous');
}

test('dangerous slide thresholds require the exact physical evidence', () => {
  const boundaries = [
    { below: { intensity: .719 }, exact: { intensity: .72 } },
    { below: { rear: true, entry: 5.79 }, exact: { rear: true, entry: 5.8 } },
    { below: { rear: true, closing: 4.79 }, exact: { rear: true, closing: 4.8 } },
    { below: { rear: true, relative: 8.99 }, exact: { rear: true, relative: 9 } },
    { below: { entry: 6.19, closing: 4 }, exact: { entry: 6.2, closing: 4 } },
    { below: { entry: 6.2, relative: 7.99 }, exact: { entry: 6.2, relative: 8 } }
  ];
  for (const boundary of boundaries) {
    assertBoundary({ ...boundary, belowCategory: 'reckless', exactCategory: 'dangerous' });
  }
});

test('reckless slide thresholds classify their exact edge without a random card roll', () => {
  const boundaries = [
    [{ intensity: .619 }, { intensity: .62 }],
    [{ entry: 5.19 }, { entry: 5.2 }],
    [{ closing: 4.19 }, { closing: 4.2 }],
    [{ relative: 8.49 }, { relative: 8.5 }],
    [{ entry: 4.59, relative: 6.2 }, { entry: 4.6, relative: 6.2 }],
    [{ rear: true, entry: 3.79 }, { rear: true, entry: 3.8 }],
    [{ rear: true, closing: 1.49 }, { rear: true, closing: 1.5 }],
    [{ rear: true, relative: 5.49 }, { rear: true, relative: 5.5 }],
    [{ rear: true, intensity: .549 }, { rear: true, intensity: .55 }]
  ];
  for (const [below, exact] of boundaries) {
    assertBoundary({ below, exact, belowCategory: 'careless', exactCategory: 'reckless' });
    const result = profile(exact);
    assert.equal(result.forceYellow, true);
    assert.equal(result.yellowChance, undefined);
  }
});

test('careless slides explicitly disable card chance and the profile is pure', () => {
  const offender = Object.freeze({
    id: 'human', x: 1, y: 0, fx: -1, fy: 0, vx: 1, vy: 0,
    slideEntrySpeed: 3.2,
    __impact: Object.freeze({ closingSpeed: 1.1, relativeSpeed: 3.8, intensity: .48 })
  });
  const victim = Object.freeze({ id: 'victim', x: 0, y: 0, fx: 1, fy: 0 });
  const before = JSON.stringify({ offender, victim });
  const result = slideDisciplineProfile(offender, victim);
  assert.equal(result.category, 'careless');
  assert.equal(result.forceYellow, false);
  assert.equal(result.forceRed, false);
  assert.equal(result.yellowChance, 0);
  assert.equal(result.fromBehind, false);
  assert.equal(JSON.stringify({ offender, victim }), before);
});

test('victim-relative rear geometry and discipline are mirrored for human and CPU actors', () => {
  const human = Object.freeze({
    id: 'human', team: 'you', x: -2, y: 0, fx: 1, fy: 0, vx: 0, vy: 0,
    slideEntrySpeed: 3.8,
    __impact: Object.freeze({ closingSpeed: 1.5, relativeSpeed: 5.5, intensity: .55 })
  });
  const cpu = Object.freeze({ ...human, id: 'cpu', team: 'opp' });
  const victim = Object.freeze({ id: 'victim', x: 0, y: 0, fx: 1, fy: 0 });
  const humanResult = slideDisciplineProfile(human, victim);
  const cpuResult = slideDisciplineProfile(cpu, victim);
  assert.deepEqual(cpuResult, humanResult);
  assert.equal(humanResult.fromBehind, true);
  assert.equal(humanResult.rearDot, -1);

  const rotatedVictim = Object.freeze({ ...victim, fx: 0, fy: 1 });
  const rearActor = Object.freeze({ ...human, x: 0, y: -2 });
  const frontActor = Object.freeze({ ...human, x: 0, y: 2 });
  assert.equal(slideDisciplineProfile(rearActor, rotatedVictim).fromBehind, true);
  assert.equal(slideDisciplineProfile(frontActor, rotatedVictim).fromBehind, false);
});

function cardHarness() {
  const issueSource = sourceBetween('function issueCard', 'function OFFICIAL_TOLERANCE');
  const report = { teams: { you: { yellows: 0, reds: 0 }, opp: { yellows: 0, reds: 0 } } };
  const events = [];
  const issueCard = new Function(
    'clamp', 'OFFICIATING', 'REFEREE_PROFILE', 'addReputation', 'report',
    'forcefulRefereeGesture', 'showOfficialDecision', 'openFightWindow', 'logEvent',
    `${issueSource}; return issueCard;`
  )(
    clamp,
    { cardsAvailable: true, challengeTolerance: 1, cardRate: 1 },
    { strictness: .5 },
    () => {},
    report,
    () => false,
    () => {},
    () => {},
    (type, team, player, detail) => events.push({ type, team, player: player.id, detail })
  );
  return { issueCard, report, events };
}

function player(id = 'p') {
  return { id, name: id, team: 'you', sentOff: false, stats: { yellows: 0, reds: 0, rating: 6 } };
}

test('two reckless slides still produce a football-correct second-yellow dismissal', () => {
  const { issueCard, report, events } = cardHarness();
  const offender = player('booked-tackler');
  const reckless = profile({ intensity: .62 });
  const first = issueCard(offender, { ...reckless, slide: true, deferPresentation: true, deferSendOff: true });
  const second = issueCard(offender, { ...reckless, slide: true, deferPresentation: true, deferSendOff: true });
  assert.equal(first.card, 'yellow');
  assert.equal(second.card, 'red');
  assert.equal(second.secondYellow, true);
  assert.equal(offender.stats.yellows, 1);
  assert.equal(offender.stats.reds, 1);
  assert.equal(report.teams.you.yellows, 1);
  assert.equal(report.teams.you.reds, 1);
  assert.deepEqual(events.map(event => event.type), ['yellow-card', 'red-card']);
});

test('a careless foul after a yellow does not manufacture a second yellow', () => {
  const { issueCard, report, events } = cardHarness();
  const offender = player('already-booked');
  const reckless = profile({ intensity: .62 });
  const careless = profile({ intensity: .4 });
  assert.equal(issueCard(offender, { ...reckless, slide: true, deferPresentation: true }).card, 'yellow');
  const result = issueCard(offender, { ...careless, slide: true, deferPresentation: true });
  assert.equal(result.card, null);
  assert.equal(offender.stats.yellows, 1);
  assert.equal(offender.stats.reds, 0);
  assert.equal(report.teams.you.yellows, 1);
  assert.equal(report.teams.you.reds, 0);
  assert.deepEqual(events.map(event => event.type), ['yellow-card']);
});

test('dangerous classification forces a direct red', () => {
  const { issueCard, report } = cardHarness();
  const offender = player('dangerous-tackler');
  const dangerous = profile({ intensity: .72 });
  const result = issueCard(offender, { ...dangerous, slide: true, deferPresentation: true, deferSendOff: true });
  assert.equal(result.card, 'red');
  assert.equal(result.secondYellow, undefined);
  assert.equal(offender.stats.yellows, 0);
  assert.equal(offender.stats.reds, 1);
  assert.equal(report.teams.you.reds, 1);
});

test('both slide foul branches share the profile and export every derived telemetry fact', () => {
  const humanBranch = sourceBetween('function trySlide()', 'function doPassOpp');
  const mirroredBranch = sourceBetween('function trySlideFor(player)', 'function updateActiveSkill');
  assert.match(humanBranch, /slideDisciplineProfile\(controlled,o\)/);
  assert.match(mirroredBranch, /slideDisciplineProfile\(player,o\)/);
  for (const branch of [humanBranch, mirroredBranch]) {
    assert.match(branch, /disciplineCategory:discipline\.category/);
    assert.match(branch, /rearDot:discipline\.rearDot/);
    assert.match(branch, /entrySpeed:discipline\.entrySpeed/);
    assert.match(branch, /closingSpeed:discipline\.closingSpeed/);
    assert.match(branch, /relativeSpeed:discipline\.relativeSpeed/);
    assert.match(branch, /contactIntensity:discipline\.intensity/);
    assert.match(branch, /forceYellow:discipline\.forceYellow/);
    assert.match(branch, /forceRed:discipline\.forceRed/);
    assert.match(branch, /yellowChance:discipline\.yellowChance/);
  }
  assert.match(humanBranch, /if\(d < profile\.cleanReach\)/);
  assert.match(mirroredBranch, /if\(d<profile\.cleanReach\)/);
});

test('global card policy source remains frozen', () => {
  const issueSource = sourceBetween('function issueCard', 'function OFFICIAL_TOLERANCE');
  assert.equal(issueSource.length, 3743);
  assert.equal(
    crypto.createHash('sha256').update(issueSource).digest('hex'),
    'a03b8127808fcba772aa7f969e8f7f77ea34aea2614a0325f64757662d1065ae'
  );
});
