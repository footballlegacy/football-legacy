import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const onlineHtml = read('online/index.html');
const onlineApp = read('online/app.js');
const quickHtml = read('quick-play/index.html');
const quickApp = read('quick-play/app.js');
const controllerUi = read('controller-ui.js');
let passed = 0;

const check = (condition, message) => {
  assert.ok(condition, message);
  passed += 1;
};

check(onlineHtml.includes('../controller-ui.js?v=172-away-controller-1'), 'Online shell must load the cache-busted shared controller UI');
check(onlineHtml.includes('id="hostButton" type="button" data-controller-default'), 'Host must be the default controller target');
check(onlineApp.includes("const BUILD='172'"), 'Online peers must reject pre-hotfix builds');
check(onlineApp.includes("childSend({type:'menu-input',pad,connected:!!gamepad"), 'Top-level pad state must reach the setup iframe');
check(onlineApp.includes("addEventListener('gamepadconnected',event=>observeGamepad(event.gamepad))"), 'A newly exposed browser gamepad must be acquired immediately');
check(onlineApp.includes("if(data.type==='request-controller-activation'&&role==='guest')"), 'The setup button must be able to request top-level controller activation');
check(onlineApp.includes("if(role==='guest')guestPadConnected=!!gamepad"), 'Guest controller status must update before the match starts');
const gamepadHelperSource = onlineApp.match(/  function gamepadsFrom\(navigatorLike\)\{[\s\S]*?(?=\n  function selectGamepad\(\))/)?.[0] || '';
check(gamepadHelperSource, 'Controller discovery helpers must be available for runtime regression coverage');
const runConnectedGamepads = new Function('navigator', 'ui', `${gamepadHelperSource};return connectedGamepads();`);
const iframeDualSense = {index:0,id:'DualSense Wireless Controller',mapping:'',connected:true,axes:[],buttons:[]};
const iframeOnlyPads = runConnectedGamepads(
  {getGamepads:()=>[]},
  {frame:{contentWindow:{navigator:{getGamepads:()=>[iframeDualSense]}}}}
);
check(iframeOnlyPads.length===1&&iframeOnlyPads[0]===iframeDualSense, 'Firefox iframe-only controller exposure must unblock Away readiness');
const noPads = runConnectedGamepads(
  {getGamepads:()=>[]},
  {frame:{contentWindow:{navigator:{getGamepads:()=>[]}}}}
);
check(noPads.length===0, 'Away readiness must stay blocked when both controller navigators are empty');
const outerCopy = {...iframeDualSense};
const iframeCopy = {...iframeDualSense};
const duplicatePads = runConnectedGamepads(
  {getGamepads:()=>[outerCopy]},
  {frame:{contentWindow:{navigator:{getGamepads:()=>[iframeCopy]}}}}
);
check(duplicatePads.length===1, 'The same controller exposed by both navigators must be de-duplicated');
check(!onlineApp.includes('acceptancePad'), 'No synthetic acceptance pad may ship');
check(quickApp.includes("document.body.dataset.controllerExternalGamepad='true'"), 'Online Quick Play must disable duplicate iframe polling');
check(quickApp.includes("if(data.type==='menu-input'){handleOnlineMenuInput(data);return}"), 'Online Quick Play must consume parent menu input');
check(quickApp.includes('if(onlineState.controllerKnown)return onlineState.controllerConnected'), 'Readiness must use parent-observed controller truth');
check(quickApp.includes("type:'request-controller-activation'"), 'Missing Away controller action must ask the parent to reacquire the real pad');
check(quickApp.includes("elements.startMatch.disabled=!onlineState.connected||!lobbySynchronized||onlineState.launchRequested"), 'Controller activation action must remain clickable without weakening the Ready gate');
check(quickApp.includes('Press Cross / A Now'), 'Away must receive a concrete browser activation prompt');
check(quickApp.indexOf("if(ONLINE_ROLE==='host'&&onlineState.remoteReady)") < quickApp.indexOf("if(!onlineState.ownReady){onlineSetReady(true);return}"), 'Ready Away must allow one host Start activation');
check(quickApp.includes("startWasDisabled&&!elements.startMatch.disabled&&state.step==='confirm'"), 'Start must gain controller focus when connection enables it on the final stage');
check((quickHtml.match(/data-controller-default/g) || []).length >= 5, 'Every Quick Play stage must expose a default Continue or Start target');
check(controllerUi.includes("dataset.controllerUiSuspended==='true'"), 'Outer controller navigation must suspend while the iframe owns input');
check(controllerUi.includes('receiveGamepad:(gp,now)=>processGamepad(gp,now)'), 'Shared controller UI must accept bridged standard or raw packets');

console.log(`online controller hotfix: ${passed}/${passed} checks passed`);
