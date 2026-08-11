import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const onlineApp = readFileSync(new URL('../online/app.js', import.meta.url), 'utf8');
const protocol=onlineApp.match(/const PROTOCOL='([^']+)'/)?.[1];
const build=onlineApp.match(/const BUILD='([^']+)'/)?.[1];
const release=onlineApp.match(/const RELEASE='([^']+)'/)?.[1];

class Emitter {
  constructor(){this.listeners=new Map()}
  on(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list);return this}
  emit(type,...args){for(const listener of this.listeners.get(type)||[])listener(...args)}
}

class FakeConnection extends Emitter {
  constructor(peer,metadata){super();this.peer=peer;this.metadata=metadata;this.open=false;this.sent=[];this.dataChannel={bufferedAmount:0}}
  emit(type,...args){if(type==='open')this.open=true;if(type==='close')this.open=false;super.emit(type,...args)}
  send(message){this.sent.push(message)}
  close(){this.open=false}
}

class FakeCall extends Emitter {
  constructor(){super();this.peerConnection=null}
  close(){}
}

class FakeElement {
  constructor(id){
    this.id=id;
    this.hidden=false;
    this.dataset={};
    this.style={};
    this.classList={toggle(){},contains(){return false},add(){},remove(){}};
    this.textContent='';
    this.innerHTML='';
    this.value='';
    this.selectionStart=0;
    this.listeners=new Map();
    this.span={textContent:''};
    this.contentWindow={postMessage(){},location:{href:'about:blank',replace(){}},document:{getElementById(){return null}}};
  }
  addEventListener(type,listener){const list=this.listeners.get(type)||[];list.push(listener);this.listeners.set(type,list)}
  dispatch(type,event={}){event.preventDefault ||= ()=>{};for(const listener of this.listeners.get(type)||[])listener(event)}
  querySelector(selector){return selector==='span'?this.span:null}
  focus(){}
  setCustomValidity(){}
  reportValidity(){}
  setSelectionRange(){}
}

function createHarness({dropFirstMatchNavigation=false,matchError='' }={}){
  const elements=new Map();
  const node=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id)};
  for(const id of ['entryScreen','waitingScreen','gameStage','gameFrame','guestStage','matchVideo','videoGate','guestMessage','connectionPill','networkStatus','networkRole','networkLatency','roomCodeBlock','roomCode','waitingEyebrow','waitingTitle','waitingCopy','joinForm','roomInput','fatalCard','fatalTitle','fatalCopy','remoteEvent','remoteOfficial','remoteVar','remoteSetPiece','remotePlayerCard','remotePowerFill','remotePowerIdeal','remoteStateOverlay','hostButton','showJoinButton','copyCode','cancelButton','retryButton'])node(id);
  node('waitingScreen').hidden=node('gameStage').hidden=node('guestStage').hidden=node('joinForm').hidden=node('fatalCard').hidden=true;

  const location={href:'https://example.test/football-legacy/online/index.html',origin:'https://example.test',search:''};
  const frame=node('gameFrame'),frameError={textContent:''},replacements=[];
  const videoTrack={stopped:false,stop(){this.stopped=true}};
  const stream={getVideoTracks:()=>[videoTrack],getAudioTracks:()=>[],getTracks:()=>[videoTrack]};
  let assignedFrameSrc='',dropped=false;
  const installFrame=value=>{
    const absolute=new URL(String(value),location.href).href;
    frame.contentWindow.location.href=absolute;
    delete frame.contentWindow.FLMatch;
    frameError.textContent='';
    if(absolute.includes('/match-engine/match.html')){
      frameError.textContent=matchError;
      if(!matchError)frame.contentWindow.FLMatch={getOnlineStream:()=>stream,getAudioState:()=>({requestedPercent:0}),getOnlineViewState:()=>({})};
    }
  };
  Object.defineProperty(frame,'src',{get:()=>assignedFrameSrc,set:value=>{
    assignedFrameSrc=String(value);
    if(assignedFrameSrc.includes('/match-engine/match.html')&&dropFirstMatchNavigation&&!dropped){dropped=true;return}
    installFrame(assignedFrameSrc);
  }});
  frame.contentWindow.location.replace=value=>{replacements.push(String(value));installFrame(value)};
  frame.contentWindow.document.getElementById=id=>id==='errorBox'?frameError:null;

  const intervals=new Map(),timeouts=new Map(),globalListeners=new Map(),peers=[];
  let timerId=0;
  class FakePeer extends Emitter {
    constructor(id){super();this.id=id;this.destroyed=false;this.calls=[];peers.push(this)}
    reconnect(){}
    destroy(){this.destroyed=true}
    call(peer,media,options){this.calls.push({peer,media,options});return new FakeCall()}
  }
  const context={
    window:null,
    document:{body:node('body'),getElementById:node},
    location,
    navigator:{getGamepads:()=>[],clipboard:{writeText:async()=>{}}},
    crypto:webcrypto,
    performance,
    URL,
    URLSearchParams,
    Peer:FakePeer,
    console,
    requestAnimationFrame:()=>1,
    setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id},
    clearInterval:id=>intervals.delete(id),
    setTimeout:(fn,ms)=>{const id=++timerId;timeouts.set(id,{fn,ms});return id},
    clearTimeout:id=>timeouts.delete(id),
    addEventListener:(type,listener)=>{const list=globalListeners.get(type)||[];list.push(listener);globalListeners.set(type,list)}
  };
  context.window=context;
  vm.runInNewContext(onlineApp,context,{filename:'online/app.js'});
  return{context,node,frame,frameError,replacements,intervals,peers,globalListeners};
}

function windowMessage(h,data){for(const listener of h.globalListeners.get('message')||[])listener({source:h.frame.contentWindow,origin:h.context.location.origin,data})}

function startCommittedHost(h){
  h.node('hostButton').dispatch('click');
  const peer=h.peers.at(-1);
  peer.emit('open');
  const connection=new FakeConnection('away-peer',{protocol,build,release,role:'guest'});
  peer.emit('connection',connection);
  connection.emit('open');
  windowMessage(h,{source:'football-legacy-online-child',type:'child-ready'});
  const launch={launchId:'launch-recovery-test',lobbyVersion:'ROOM|0:0:0',configRevision:'0:0:0',href:'../match-engine/match.html?quickPlay=1#flMatch=test',homeName:'HOME',awayName:'AWAY'};
  windowMessage(h,{source:'football-legacy-online-child',type:'launch-request',...launch});
  connection.emit('data',{protocol,build,release,type:'launch-ack',...launch});
  connection.emit('data',{protocol,build,release,type:'launch-committed',...launch});
  return{peer,connection,launch};
}

function tickIntervals(h,ms,times=1){
  for(let turn=0;turn<times;turn++)for(const [id,timer] of [...h.intervals])if(h.intervals.has(id)&&timer.ms===ms)timer.fn();
}

const startHostBody=onlineApp.slice(onlineApp.indexOf('function startHostMatch'),onlineApp.indexOf('function appendOnlineParams'));
assert.ok(startHostBody.indexOf('ui.frame.onload')<startHostBody.indexOf('ui.frame.src='),'Host must install the match load handler before navigating the iframe');
assert.match(onlineApp,/if\(hostStreamTimer\|\|hostMatchStream\)return/,'Host stream startup must be idempotent');

const launchReconnect=createHarness();
launchReconnect.node('hostButton').dispatch('click');
const launchPeer=launchReconnect.peers.at(-1);
launchPeer.emit('open');
const firstLaunchConnection=new FakeConnection('away-peer',{protocol,build,release,role:'guest'});
launchPeer.emit('connection',firstLaunchConnection);
firstLaunchConnection.emit('open');
windowMessage(launchReconnect,{source:'football-legacy-online-child',type:'child-ready'});
const reconnectLaunch={launchId:'launch-reconnect-test',lobbyVersion:'ROOM|0:0:0',configRevision:'0:0:0',href:'../match-engine/match.html?quickPlay=1#flMatch=test',homeName:'HOME',awayName:'AWAY'};
windowMessage(launchReconnect,{source:'football-legacy-online-child',type:'launch-request',...reconnectLaunch});
firstLaunchConnection.emit('data',{protocol,build,release,type:'launch-ack',...reconnectLaunch});
const firstCommit=firstLaunchConnection.sent.find(message=>message.type==='launch-commit');
assert.equal(firstCommit?.launchId,reconnectLaunch.launchId,'Home must enter the commit phase before the simulated link loss');
firstLaunchConnection.emit('close');
assert.equal(launchReconnect.context.FLOnlineDebug.getState().pendingLaunch?.phase,'commit','A dropped committed ACK must preserve Home launch intent across disconnect');
const replacementLaunchConnection=new FakeConnection('away-peer',{protocol,build,release,role:'guest'});
launchPeer.emit('connection',replacementLaunchConnection);
replacementLaunchConnection.emit('open');
const resumedCommit=replacementLaunchConnection.sent.find(message=>message.type==='launch-commit');
assert.equal(resumedCommit?.launchId,firstCommit.launchId,'The replacement link must replay the identical launch commit');
firstLaunchConnection.emit('close');
assert.equal(launchReconnect.context.FLOnlineDebug.getState().connectionOpen,true,'A late close from the old link must not disturb the replacement');
replacementLaunchConnection.emit('data',{protocol,build,release,type:'launch-committed',...reconnectLaunch});
replacementLaunchConnection.emit('data',{protocol,build,release,type:'launch-committed',...reconnectLaunch});
assert.equal(launchReconnect.context.FLOnlineDebug.getState().matchStarted,true,'Home must start after Away re-acknowledges the resumed commit');
assert.equal(launchReconnect.context.FLOnlineDebug.getProtocolTrace().filter(row=>row.type==='host-committed').length,1,'A resumed launch must start Home exactly once');

const recovery=createHarness({dropFirstMatchNavigation:true});
const recoveryLaunch=startCommittedHost(recovery);
assert.equal(recovery.context.FLOnlineDebug.getState().matchStarted,true,'Committed host must enter the match state');
assert.match(recovery.frame.contentWindow.location.href,/\/quick-play\/index\.html/,'The harness must reproduce Firefox retaining the stale setup frame');
assert.equal([...recovery.intervals.values()].filter(timer=>timer.ms===125).length,1,'Exactly one host stream startup poll must run');
recovery.frame.onload();
assert.equal([...recovery.intervals.values()].filter(timer=>timer.ms===125).length,1,'A later iframe load event must not create a second startup poll');
tickIntervals(recovery,125,13);
assert.ok(recovery.replacements.some(value=>value.includes('/match-engine/match.html')),'A stale committed setup frame must be retried with the match target');
assert.equal(recoveryLaunch.peer.calls.length,1,'Recovered host frame must place one media call');
assert.equal(recovery.node('networkStatus').textContent,'Match running · waiting for Away video','Recovered startup must advance to the Away video handshake');
assert.ok(recovery.context.FLOnlineDebug.getProtocolTrace().some(row=>row.type==='host-match-navigation-recovery'),'Recovery must be visible in protocol telemetry');

const engineFailure=createHarness({matchError:'The 3D graphics library could not load.'});
const failedLaunch=startCommittedHost(engineFailure);
tickIntervals(engineFailure,125);
assert.equal(failedLaunch.peer.calls.length,0,'A failed match engine must not place a media call');
assert.equal(engineFailure.node('fatalCard').hidden,false,'A match-engine failure must be surfaced immediately');
assert.equal(engineFailure.node('fatalTitle').textContent,'Match engine could not start');
assert.equal(engineFailure.node('fatalCopy').textContent,'The 3D graphics library could not load.');

console.log('online host frame recovery: 14/14 checks passed');
