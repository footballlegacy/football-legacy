import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const onlineApp=readFileSync(new URL('../online/app.js',import.meta.url),'utf8');
const protocol=onlineApp.match(/const PROTOCOL='([^']+)'/)?.[1];
const build=onlineApp.match(/const BUILD='([^']+)'/)?.[1];
const release=onlineApp.match(/const RELEASE='([^']+)'/)?.[1];

class Emitter{
  constructor(){this.listeners=new Map()}
  on(type,listener){const rows=this.listeners.get(type)||[];rows.push(listener);this.listeners.set(type,rows);return this}
  emit(type,...args){for(const listener of this.listeners.get(type)||[])listener(...args)}
}
class FakeConnection extends Emitter{
  constructor(){super();this.peer='away';this.metadata={protocol,build,release,role:'guest'};this.open=false;this.sent=[]}
  emit(type,...args){if(type==='open')this.open=true;if(type==='close')this.open=false;super.emit(type,...args)}
  send(message){this.sent.push(message)}
  close(){this.open=false}
}
class FakeElement{
  constructor(id){this.id=id;this.hidden=false;this.dataset={};this.style={};this.classList={toggle(){}};this.textContent='';this.value='';this.selectionStart=0;this.listeners=new Map();this.span={textContent:''};this.contentWindow={postMessage(){},location:{href:'about:blank',replace(){}}}}
  addEventListener(type,listener){const rows=this.listeners.get(type)||[];rows.push(listener);this.listeners.set(type,rows)}
  dispatch(type,event={}){event.preventDefault ||=()=>{};for(const listener of this.listeners.get(type)||[])listener(event)}
  querySelector(selector){return selector==='span'?this.span:null}
  focus(){}
  setCustomValidity(){}
  reportValidity(){}
  setSelectionRange(){}
}

function createHarness(){
  const elements=new Map(),frameTargets=[];
  const node=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id)};
  for(const id of ['entryScreen','waitingScreen','gameStage','gameFrame','guestStage','matchVideo','videoGate','guestMessage','connectionPill','networkStatus','networkRole','networkLatency','roomCodeBlock','roomCode','waitingEyebrow','waitingTitle','waitingCopy','joinForm','roomInput','fatalCard','fatalTitle','fatalCopy','remoteEvent','remoteOfficial','remoteVar','remoteSetPiece','remotePlayerCard','remotePowerFill','remotePowerIdeal','remoteStateOverlay','hostButton','showJoinButton','copyCode','cancelButton','retryButton'])node(id);
  node('waitingScreen').hidden=node('gameStage').hidden=node('guestStage').hidden=node('joinForm').hidden=node('fatalCard').hidden=true;
  const frame=node('gameFrame');
  Object.defineProperty(frame,'src',{get:()=>frameTargets.at(-1)||'',set:value=>frameTargets.push(String(value))});
  const intervals=new Map(),timeouts=new Map(),listeners=new Map(),peers=[];
  let timerId=0;
  class FakePeer extends Emitter{
    constructor(){super();this.destroyed=false;peers.push(this)}
    reconnect(){}
    destroy(){this.destroyed=true}
    call(){return null}
  }
  const location={href:'https://example.test/football-legacy/online/index.html',origin:'https://example.test',search:''};
  const context={window:null,document:{body:node('body'),getElementById:node},location,navigator:{getGamepads:()=>[],clipboard:{writeText:async()=>{}}},crypto:webcrypto,performance,URL,URLSearchParams,Peer:FakePeer,console,requestAnimationFrame:()=>1,setInterval:(fn,ms)=>{const id=++timerId;intervals.set(id,{fn,ms});return id},clearInterval:id=>intervals.delete(id),setTimeout:(fn,ms)=>{const id=++timerId;timeouts.set(id,{fn,ms});return id},clearTimeout:id=>timeouts.delete(id),addEventListener:(type,listener)=>{const rows=listeners.get(type)||[];rows.push(listener);listeners.set(type,rows)}};
  context.window=context;
  vm.runInNewContext(onlineApp,context,{filename:'online/app.js'});
  return{context,node,frameTargets,intervals,peers};
}
function connectHost(h,{stageAlreadyVisible=false}={}){
  h.node('hostButton').dispatch('click');
  const peer=h.peers.at(-1);peer.emit('open');
  const connection=new FakeConnection();peer.emit('connection',connection);
  if(stageAlreadyVisible)h.node('gameStage').hidden=false;
  connection.emit('open');
  return connection;
}
function tick(h,ms){for(const [id,timer] of [...h.intervals])if(h.intervals.has(id)&&timer.ms===ms)timer.fn()}

const exhausted=createHarness();
connectHost(exhausted);
assert.equal(exhausted.frameTargets.length,1,'The healthy connection must make the initial lobby navigation');
tick(exhausted,1200);tick(exhausted,1200);tick(exhausted,1200);
const retries=exhausted.frameTargets.filter(value=>value.includes('frameRetry='));
assert.equal(retries.length,3,'A persistently blank lobby must receive exactly three retries');
assert.equal(new Set(retries).size,3,'Each retry must use a distinct URL so Firefox cannot collapse it into the failed navigation');
assert.equal(exhausted.node('fatalCard').hidden,true,'The fatal message must wait until all retries are exhausted');
tick(exhausted,1200);
assert.equal(exhausted.node('fatalCard').hidden,false,'Exhaustion must become visible instead of leaving an empty stage');
assert.equal(exhausted.node('fatalTitle').textContent,'Match setup stayed blank');

const visibleStage=createHarness();
connectHost(visibleStage,{stageAlreadyVisible:true});
assert.equal(visibleStage.frameTargets.length,1,'A healthy connection must restart lobby loading when the stage is visible but no child is ready');
assert.ok(visibleStage.frameTargets[0].includes('/quick-play/index.html'),'The restarted navigation must target the complete Quick Play lobby');

console.log('online lobby frame exhaustion: 8/8 checks passed');
