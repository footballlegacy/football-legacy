import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const onlineHtml = read('online/index.html');
const onlineApp = read('online/app.js');
const quickHtml = read('quick-play/index.html');
const quickApp = read('quick-play/app.js');
const matchHtml = read('match-engine/match.html');
const controllerUi = read('controller-ui.js');
let passed = 0;

const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};

check(onlineHtml.includes('../controller-ui.js?v=172-controller-launch-4'), 'Online shell must load the cache-busted shared controller UI');
check(quickHtml.includes('../controller-ui.js?v=172-controller-launch-4'), 'Quick Play must load the same cache-busted controller UI');
check(onlineHtml.includes('id="hostButton" type="button" data-controller-default'), 'Host must be the default controller target');
check(quickHtml.includes('id="startMatch" type="button" data-controller-default'), 'Ready must be the default controller target on confirmation');
check(onlineApp.includes("const BUILD='172'"), 'The peer protocol build must remain compatible with the current room');
check(onlineApp.includes("childSend({type:'menu-input',pad,connected:!!gamepad"), 'Parent controller input must still reach the setup iframe');
check(onlineApp.includes("if(data.type==='gamepad-sample')"), 'The parent must accept genuine samples from the active child frame');
check(onlineApp.includes("type:'local-input',pad"), 'The parent must route the host controller back into the match frame');
check(onlineApp.includes("if(role==='host'&&matchStarted)"), 'Host input forwarding must remain active after kickoff');
check(onlineApp.includes("addEventListener('gamepadconnected',event=>observeGamepad(event.gamepad))"), 'A connected controller must still use the existing acquisition path');
check(!onlineApp.includes('request-controller-activation'), 'The obsolete parent activation request path must be removed');
check(!onlineApp.includes('acceptancePad'), 'No synthetic controller may ship');

const gamepadHelperSource = onlineApp.match(/  function gamepadsFrom\(navigatorLike\)\{[\s\S]*?(?=\n  function selectGamepad\(\))/)?.[0] || '';
check(gamepadHelperSource, 'Controller discovery helpers must remain available');
const runConnectedGamepads = new Function('navigator', 'ui', 'childGamepadSample', 'childGamepadSampleAt', `${gamepadHelperSource};return connectedGamepads();`);
const iframeDualSense = {index:0,id:'DualSense Wireless Controller',mapping:'',connected:true,axes:[],buttons:[]};
const iframeOnlyPads = runConnectedGamepads(
  {getGamepads:()=>[]},
  {frame:{contentWindow:{navigator:{getGamepads:()=>[iframeDualSense]}}}},
  null,
  0
);
check(iframeOnlyPads.length===1&&iframeOnlyPads[0]===iframeDualSense, 'Existing same-origin iframe controller discovery must remain intact');
const duplicatePads = runConnectedGamepads(
  {getGamepads:()=>[{...iframeDualSense}]},
  {frame:{contentWindow:{navigator:{getGamepads:()=>[{...iframeDualSense}]}}}},
  {...iframeDualSense},
  performance.now()
);
check(duplicatePads.length===1, 'Existing controller sources must remain de-duplicated');

check(quickApp.includes("document.body.dataset.controllerExternalGamepad='true'"), 'The parent must remain the sole controller UI authority');
check(quickApp.includes("if(data.type==='menu-input'){handleOnlineMenuInput(data);return}"), 'Quick Play must still consume parent menu input');
check(quickApp.includes("type:'gamepad-sample',context:'setup'"), 'Quick Play must forward genuine iframe controller samples to its online parent');
check(quickApp.includes('navigator.getGamepads?.()'), 'Quick Play must sample the controller in the genuinely focused iframe context');
check(matchHtml.includes("type:'gamepad-sample',context:'match'"), 'The match iframe must keep forwarding its native controller after kickoff');
check(matchHtml.includes("else if(data.type==='local-input')acceptOnlineLocalPad(data.pad)"), 'The match must accept the parent-routed local controller sample');
check(matchHtml.includes('gp1=localFresh?onlineLocalPad:nativeGp1'), 'The match must prefer fresh routed input while retaining native fallback');
check(matchHtml.includes("if(data.type==='remote-input')acceptOnlineRemotePad(data.pad)"), 'The existing remote-input path must remain intact');
check(controllerUi.includes('receiveGamepad:(gp,now)=>processGamepad(gp,now)'), 'The shared controller UI must still accept parent input');
const controllerPollSource = controllerUi.match(/  const poll=now=>\{[\s\S]*?\n  \};/)?.[0] || '';
check(controllerPollSource, 'Shared controller polling must remain testable');
const buildControllerPoll = new Function('document', 'navigator', 'processGamepad', 'requestAnimationFrame', `${controllerPollSource};return poll;`);
const directlyProcessed = [];
buildControllerPoll(
  {body:{dataset:{controllerExternalGamepad:'true'}}},
  {getGamepads:()=>[iframeDualSense]},
  gamepad=>directlyProcessed.push(gamepad),
  ()=>{}
)(1);
check(directlyProcessed.length===0, 'The iframe must not double-process a controller while parent authority is active');

const sourceBetween = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : '';
};
const readyUiSource = sourceBetween(quickApp, 'function updateOnlineReadyUI(){', 'function reconcileOnlineConnection(');
check(readyUiSource, 'Online Ready UI must remain available');
check(readyUiSource.includes("elements.startMatch.disabled=!onlineState.connected||!lobbySynchronized||onlineState.launchRequested"), 'Ready may depend only on connection, lobby sync and launch state');
check(readyUiSource.includes('Ready ${own}'), 'The enabled guest action must clearly read Ready Away');
check(!readyUiSource.includes('controllerKnown')&&!readyUiSource.includes('controllerConnected'), 'Controller telemetry must not gate Ready');
for(const obsolete of ['function onlineHasController','guestMissingController','controllerPromptUntil','Activate Away Controller','Connect Away Controller','Press Cross / A Now',"type:'request-controller-activation'"]){
  check(!quickApp.includes(obsolete), `Obsolete Ready activation path must be absent: ${obsolete}`);
}

const handleMenuInputSource = sourceBetween(quickApp, 'function handleOnlineMenuInput(data){', 'function onlineSetReady(');
check(handleMenuInputSource, 'Parent menu input handler must remain available');
check(!handleMenuInputSource.includes('onlineSetReady('), 'A transient controller miss must never retract Away readiness');
const makeMenuHandler = new Function(
  'ONLINE','reconcileOnlineConnection','onlineState','window','onlineMenuPadState','updateControllerCard','updateOnlineReadyUI','performance',
  `${handleMenuInputSource};return handleOnlineMenuInput;`
);
const readyState={controllerKnown:true,controllerConnected:true,ownReady:true};
const receivedPads=[];
const menuHandler=makeMenuHandler(
  true,()=>{},readyState,
  {FootballLegacyControllerUI:{forgetGamepad:()=>{},receiveGamepad:pad=>{receivedPads.push(pad);return null}}},
  {previousSection:false,nextSection:false},()=>{},()=>{},{now:()=>100}
);
menuHandler({pad:null,connected:false});
check(readyState.ownReady===true, 'Away must stay ready when controller telemetry briefly reports no pad');
menuHandler({pad:iframeDualSense,connected:true});
check(receivedPads.length===1&&receivedPads[0]===iframeDualSense, 'A connected controller must still enter the existing controller UI path');

const clickBody = quickApp.match(/document\.addEventListener\('click',event=>\{([\s\S]*?)\n  \},true\);/)?.[1] || '';
check(clickBody, 'Online confirmation click handler must remain available');
const runReadyClick = new Function('event','onlineState','ONLINE_ROLE','onlineSetReady','traceOnline','currentLobbyVersion','updateOnlineReadyUI','tryOnlineLaunch',clickBody);
const readyCalls=[];
const clickEvent={target:{closest:selector=>selector==='#startMatch'?{}:null},preventDefault:()=>{},stopImmediatePropagation:()=>{}};
runReadyClick(clickEvent,{connected:true,ownReady:false,remoteReady:false},'guest',ready=>readyCalls.push(ready),()=>{},()=>'',()=>{},()=>{});
check(readyCalls.length===1&&readyCalls[0]===true, 'One mouse or controller click on Ready Away must produce exactly one ready intent');

check(quickApp.indexOf("if(ONLINE_ROLE==='host'&&onlineState.remoteReady)") < quickApp.indexOf("if(!onlineState.ownReady){onlineSetReady(true);return}"), 'Ready Away must preserve the later explicit Home Start action');
check(quickApp.includes("startWasDisabled&&!elements.startMatch.disabled&&state.step==='confirm'"), 'Ready must gain controller focus when it becomes available');
check((quickHtml.match(/data-controller-default/g) || []).length >= 5, 'Every setup stage must retain its default controller target');
check(controllerUi.includes("dataset.controllerUiSuspended==='true'"), 'Outer controller navigation must stay suspended while the iframe owns input');

console.log(`online controller hotfix: ${passed}/${passed} checks passed`);
