import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const onlineApp = readFileSync(new URL('../online/app.js', import.meta.url), 'utf8');

class Emitter {
  constructor() {
    this.listeners = new Map();
  }
  on(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
    return this;
  }
  emit(type, ...args) {
    for (const listener of this.listeners.get(type) || []) listener(...args);
  }
}

class FakeConnection extends Emitter {
  constructor(peer, metadata = {}) {
    super();
    this.peer = peer;
    this.metadata = metadata;
    this.open = false;
    this.closed = false;
    this.sent = [];
  }
  emit(type, ...args) {
    if (type === 'open') this.open = true;
    if (type === 'close') this.open = false;
    super.emit(type, ...args);
  }
  send(message) {
    this.sent.push(message);
  }
  close() {
    this.open = false;
    this.closed = true;
  }
}

class FakeElement {
  constructor(hidden = false) {
    this.hidden = hidden;
    this.dataset = {};
    this.style = {};
    this.classList = { toggle() {} };
    this.textContent = '';
    this.value = '';
    this.selectionStart = 0;
    this.contentWindow = { postMessage() {} };
    this.listeners = new Map();
    this.span = { textContent: '' };
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  dispatch(type, event = {}) {
    event.preventDefault ||= () => {};
    return Promise.all((this.listeners.get(type) || []).map(listener => listener(event)));
  }
  querySelector(selector) {
    return selector === 'span' ? this.span : null;
  }
  focus() {}
  setCustomValidity() {}
  reportValidity() {}
  setSelectionRange() {}
}

function createHarness({ href = 'https://example.test/football-legacy/online/index.html', search = '' } = {}) {
  const elements = new Map();
  const element = (id, hidden = false) => {
    const node = new FakeElement(hidden);
    elements.set(id, node);
    return node;
  };

  element('entryScreen');
  element('waitingScreen', true);
  element('gameStage', true);
  element('gameFrame', true);
  element('guestStage', true);
  element('matchVideo');
  element('videoGate', true);
  element('guestMessage');
  element('connectionPill');
  element('networkStatus');
  element('networkRole');
  element('networkLatency');
  element('roomCodeBlock', true);
  element('roomCode');
  element('waitingEyebrow');
  element('waitingTitle');
  element('waitingCopy');
  element('joinForm', true);
  element('roomInput');
  element('fatalCard', true);
  element('fatalTitle');
  element('fatalCopy');
  element('remoteEvent');
  element('remoteOfficial');
  element('remoteVar');
  element('remoteSetPiece');
  element('remotePlayerCard');
  element('remotePowerFill');
  element('remotePowerIdeal');
  element('remoteStateOverlay');
  element('hostButton');
  element('showJoinButton');
  element('copyCode');
  element('cancelButton');
  element('retryButton');

  const peerInstances = [];
  class FakePeer extends Emitter {
    constructor(id) {
      super();
      this.id = id;
      this.destroyed = false;
      this.connections = [];
      peerInstances.push(this);
    }
    connect(id, options) {
      const connection = new FakeConnection(id, options.metadata);
      this.connections.push(connection);
      return connection;
    }
    destroy() {
      this.destroyed = true;
    }
    call() {
      return null;
    }
  }

  let timerSequence = 0;
  const clipboardWrites = [];
  const location = {
    href,
    origin: 'https://example.test',
    search,
  };
  const document = {
    body: new FakeElement(),
    getElementById: id => elements.get(id) || element(id),
  };
  const context = {
    window: null,
    document,
    location,
    navigator: { getGamepads: () => [], clipboard: { writeText: async value => clipboardWrites.push(String(value)) } },
    crypto: webcrypto,
    performance,
    URL,
    URLSearchParams,
    Peer: FakePeer,
    requestAnimationFrame: () => 1,
    setInterval: () => ++timerSequence,
    clearInterval() {},
    addEventListener() {},
    console,
  };
  context.window = context;
  vm.runInNewContext(onlineApp, context, { filename: 'online/app.js' });

  return { clipboardWrites, elements, peerInstances };
}

const protocolMatch = onlineApp.match(/const PROTOCOL='([^']+)'/);
const buildMatch = onlineApp.match(/const BUILD='([^']+)'/);
const releaseMatch = onlineApp.match(/const RELEASE='([^']+)'/);
assert.ok(protocolMatch, 'Online runtime must declare its protocol');
assert.ok(buildMatch, 'Online runtime must declare its build');
assert.ok(releaseMatch, 'Online runtime must declare its release');
const protocol = protocolMatch[1];
const build = buildMatch[1];
const release = releaseMatch[1];

{
  const { clipboardWrites, elements, peerInstances } = createHarness({
    href: 'https://example.test/football-legacy/online/index.html?stale=1#old',
    search: '?stale=1',
  });
  elements.get('hostButton').dispatch('click');
  const peer = peerInstances.at(-1);
  const roomCode = elements.get('roomCode').textContent;

  assert.equal(elements.get('waitingScreen').hidden, false, 'Home enters the code screen immediately');
  assert.equal(elements.get('gameStage').hidden, true, 'Home lobby is gated while its room is registering');
  assert.equal(elements.get('roomCodeBlock').hidden, false, 'Home code is visible while waiting');

  await elements.get('copyCode').dispatch('click');
  assert.equal(
    clipboardWrites.at(-1),
    `https://example.test/football-legacy/online/index.html?join=${roomCode}`,
    'Copy join link writes a complete, clean invite URL containing the active room code',
  );

  peer.emit('open');
  assert.equal(elements.get('waitingScreen').hidden, false, 'PeerJS signalling open must not dismiss the Home code screen');
  assert.equal(elements.get('gameStage').hidden, true, 'PeerJS signalling open is not a verified opponent connection');
  assert.equal(elements.get('roomCode').textContent, roomCode, 'Home code must remain stable and visible after signalling opens');

  const pending = new FakeConnection('away-peer', { protocol, build, release, role: 'guest' });
  peer.emit('connection', pending);
  assert.equal(elements.get('waitingScreen').hidden, false, 'An incoming but pending DataConnection must not dismiss the code screen');
  assert.equal(elements.get('gameStage').hidden, true, 'Home stays gated until the incoming DataConnection emits open');

  pending.emit('open');
  assert.equal(elements.get('waitingScreen').hidden, true, 'Home leaves verification only after DataConnection open');
  assert.equal(elements.get('gameStage').hidden, false, 'Home lobby opens after verified DataConnection open');
  assert.ok(pending.sent.some(message => message.protocol === protocol && message.build === build && message.release === release), 'Every peer packet carries the exact protocol, build and release');

  pending.emit('close');
  assert.equal(elements.get('waitingScreen').hidden, false, 'A pre-match Home disconnect returns to the waiting screen');
  assert.equal(elements.get('gameStage').hidden, true, 'A pre-match Home disconnect re-gates the lobby');
  assert.equal(elements.get('roomCodeBlock').hidden, false, 'The Home code remains visible while Away reconnects');
  assert.equal(elements.get('roomCode').textContent, roomCode, 'Home reconnect waiting preserves the exact room code');
}

{
  const { elements, peerInstances } = createHarness();
  elements.get('hostButton').dispatch('click');
  const peer = peerInstances.at(-1);
  peer.emit('open');
  const stale = new FakeConnection('stale-away', {
    protocol: 'football-legacy-online-v1',
    build,
    release: '172-controller-launch-3',
    role: 'guest',
  });
  peer.emit('connection', stale);
  stale.emit('open');
  assert.equal(stale.closed, true, 'A cached client from the previous controller release is rejected before pairing');
  assert.equal(elements.get('gameStage').hidden, true, 'A stale client cannot release the Home lobby gate');
}

{
  const { elements } = createHarness({
    href: 'https://example.test/football-legacy/online/index.html?join=abcde23456',
    search: '?join=abcde23456',
  });

  assert.equal(elements.get('joinForm').hidden, false, 'A valid invite URL reveals the Away join form');
  assert.equal(elements.get('roomInput').value, 'ABCDE-23456', 'A valid invite URL pre-fills the normalized room code');
}

{
  const { elements, peerInstances } = createHarness();
  const code = 'ABCDE-23456';
  elements.get('roomInput').value = code;
  elements.get('joinForm').dispatch('submit');
  const peer = peerInstances.at(-1);

  assert.equal(elements.get('waitingScreen').hidden, false, 'Away enters the verification screen immediately');
  assert.equal(elements.get('gameStage').hidden, true, 'Away lobby is gated before its signalling peer opens');
  assert.equal(elements.get('roomCode').textContent, code, 'Away sees the exact code it is verifying');

  peer.emit('open');
  const pending = peer.connections.at(-1);
  assert.ok(pending, 'Away starts one DataConnection after its signalling peer opens');
  assert.equal(elements.get('waitingScreen').hidden, false, 'Away remains on verification while DataConnection is pending');
  assert.equal(elements.get('gameStage').hidden, true, 'Away signalling open must not expose the lobby');

  pending.emit('open');
  assert.equal(elements.get('waitingScreen').hidden, true, 'Away leaves verification only after DataConnection open');
  assert.equal(elements.get('gameStage').hidden, false, 'Away lobby opens after verified DataConnection open');
}

{
  const { elements, peerInstances } = createHarness();
  elements.get('roomInput').value = 'ABCDE-23456';
  elements.get('joinForm').dispatch('submit');
  const peer = peerInstances.at(-1);
  peer.emit('open');
  const pending = peer.connections.at(-1);

  pending.emit('close');
  pending.emit('open');
  assert.equal(elements.get('gameStage').hidden, true, 'A late open from a connection already closed cannot release the gate');
}

console.log('online connection gate: Home/Away wait for DataConnection open');
