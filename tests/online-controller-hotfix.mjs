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

check(onlineHtml.includes('../controller-ui.js?v=172-online-quality-1'), 'Online shell must load the shared controller UI');
check(onlineHtml.includes('id="hostButton" type="button" data-controller-default'), 'Host must be the default controller target');
check(onlineApp.includes("const BUILD='172'"), 'Online peers must reject pre-hotfix builds');
check(onlineApp.includes("childSend({type:'menu-input',pad,connected:!!gamepad"), 'Top-level pad state must reach the setup iframe');
check(!onlineApp.includes('acceptancePad'), 'No synthetic acceptance pad may ship');
check(quickApp.includes("document.body.dataset.controllerExternalGamepad='true'"), 'Online Quick Play must disable duplicate iframe polling');
check(quickApp.includes("if(data.type==='menu-input'){handleOnlineMenuInput(data);return}"), 'Online Quick Play must consume parent menu input');
check(quickApp.includes('if(onlineState.controllerKnown)return onlineState.controllerConnected'), 'Readiness must use parent-observed controller truth');
check(quickApp.indexOf("if(ONLINE_ROLE==='host'&&onlineState.remoteReady)") < quickApp.indexOf("if(!onlineState.ownReady){onlineSetReady(true);return}"), 'Ready Away must allow one host Start activation');
check(quickApp.includes("startWasDisabled&&!elements.startMatch.disabled&&state.step==='confirm'"), 'Start must gain controller focus when connection enables it on the final stage');
check((quickHtml.match(/data-controller-default/g) || []).length >= 5, 'Every Quick Play stage must expose a default Continue or Start target');
check(controllerUi.includes("dataset.controllerUiSuspended==='true'"), 'Outer controller navigation must suspend while the iframe owns input');
check(controllerUi.includes('receiveGamepad:(gp,now)=>processGamepad(gp,now)'), 'Shared controller UI must accept bridged standard or raw packets');

console.log(`online controller hotfix: ${passed}/${passed} checks passed`);
