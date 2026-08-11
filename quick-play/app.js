 'use strict';
const MATCH_STORAGE_KEY='footballLegacyPendingMatchDataV1';
const ENGINE_CONFIG_KEY='footballLegacyMatchConfig';
const STADIUM_STORAGE_KEY='footballLegacyCreatedStadiumsV1';
const {LEAGUES,getLeagueTeams,getTeam}=window.FLQuickPlayTeams;
const query=new URLSearchParams(window.location.search);
const requestedMode=query.get('mode');
const initialMode=requestedMode==='online'?'online':requestedMode==='co-op'?'co-op':requestedMode==='home-co-op'?'home-co-op':requestedMode==='spectator'?'spectator':requestedMode==='free-kick-suite'?'free-kick-suite':'single-player';
const ONLINE=initialMode==='online';
const TARGET_ORIGIN=location.origin==='null'?'*':location.origin;
if(ONLINE&&window.parent===window)window.location.replace('../online/');
const ONLINE_ROLE=ONLINE&&query.get('onlineRole')==='guest'?'guest':ONLINE?'host':null;
const ONLINE_OWNED_SIDE=ONLINE_ROLE==='guest'?'away':'home';
const SETTINGS_KEY='footballLegacySettingsV1';
function readSettings(){try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch{return{}}}
const preferences=readSettings();
function encodeMatchPayload(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  let binary='';
  for(let offset=0;offset<bytes.length;offset+=16384)binary+=String.fromCharCode(...bytes.subarray(offset,offset+16384));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
const FORMATIONS={
  '4-4-2':['GK','RB','CB','CB','LB','RM','CM','CM','LM','ST','ST'],
  '4-3-3':['GK','RB','CB','CB','LB','CM','CM','CAM','RW','ST','LW'],
  '4-2-3-1':['GK','RB','CB','CB','LB','CDM','CDM','RW','CAM','LW','ST'],
  '3-5-2':['GK','CB','CB','CB','RWB','CM','CDM','CM','LWB','ST','ST'],
  '3-4-3':['GK','CB','CB','CB','RWB','CM','CM','LWB','RW','ST','LW']
};
const TACTIC_OPTIONS={
  mentality:[['defensive','Defensive'],['balanced','Balanced'],['attacking','Attacking']],
  width:[['narrow','Narrow'],['balanced','Balanced'],['wide','Wide']],
  support:[['hold','Hold shape'],['balanced','Balanced'],['forward','Forward runs']],
  pressing:[['low','Low block'],['balanced','Balanced'],['high','High press']],
  tempo:[['slow','Slow'],['balanced','Balanced'],['fast','Fast']],
  lineHeight:[['low','Deep'],['balanced','Balanced'],['high','High line']],
  directness:[['short','Short passing'],['balanced','Balanced'],['direct','Direct']]
};
const defaultTactics=()=>({mentality:'balanced',width:'balanced',support:'balanced',pressing:'balanced',tempo:'balanced',lineHeight:'balanced',directness:'balanced'});
const managementSide=()=>({formation:'4-3-3',lineup:[],bench:[],tactics:defaultTactics()});
const CAROUSEL_STEPS=['teams','management','setup','controls','confirm'];
const state={mode:initialMode,step:'teams',homeLeague:'div1',homeTeamId:'woolwich-arsenal',awayLeague:'div1',awayTeamId:'west-london-blues',management:{home:managementSide(),away:managementSide()},setup:{stadiumValue:'',matchTime:'night',weather:'clear',matchLength:Number(query.get('matchMinutes'))||4,difficulty:'ultimate',camera:preferences.camera||'broadcast',volume:70,homeKit:'home',awayKit:'away'}};
const onlineState={connected:false,connectionEpoch:-1,sideRevisions:{home:ONLINE_OWNED_SIDE==='home'?0:-1,away:ONLINE_OWNED_SIDE==='away'?0:-1},settingsRevision:ONLINE_ROLE==='host'?0:-1,ownReady:false,remoteReady:false,ownReadyRevision:0,remoteReadyRevision:-1,readyAckRevision:-1,ownReadyVersion:'',remoteReadyVersion:'',lastReadySentAt:0,startIntent:false,launchRequested:false,launchId:'',roomCode:query.get('room')||'',applyingRemote:false,controllerKnown:false,controllerConnected:false};
const onlineMenuPadState={previousSection:false,nextSection:false};
const onlineProtocolTrace=[];
let onlineNativePadSampleJson='',onlineNativePadSampleSentAt=0;
function traceOnline(type,detail={}){onlineProtocolTrace.push({at:Date.now(),type,connected:onlineState.connected,epoch:onlineState.connectionEpoch,lobbyVersion:currentLobbyVersion(),ownReady:onlineState.ownReady,remoteReady:onlineState.remoteReady,...detail});if(onlineProtocolTrace.length>180)onlineProtocolTrace.splice(0,onlineProtocolTrace.length-180)}
function serialiseOnlineNativePad(gamepad){
  if(!gamepad)return null;
  return{index:Number.isInteger(gamepad.index)?gamepad.index:0,id:String(gamepad.id||'Local gamepad').slice(0,160),mapping:String(gamepad.mapping||''),connected:gamepad.connected!==false,axes:Array.from(gamepad.axes||[]).slice(0,10).map(value=>+Math.max(-1,Math.min(1,Number(value)||0)).toFixed(3)),buttons:Array.from(gamepad.buttons||[]).slice(0,20).map(button=>({pressed:!!(button&&(button.pressed||button.value>.5)),value:+Math.max(0,Math.min(1,Number(button&&button.value)||0)).toFixed(3)}))};
}
function postOnlineNativeGamepadSample(now=performance.now(),force=false,reason='poll'){
  if(!ONLINE||window.parent===window)return;
  let nativePad=null;
  try{nativePad=Array.from(navigator.getGamepads?.()||[]).filter(gamepad=>gamepad&&gamepad.connected!==false).sort((a,b)=>a.index-b.index)[0]||null}catch{}
  const pad=serialiseOnlineNativePad(nativePad),json=JSON.stringify(pad);
  if(!force&&json===onlineNativePadSampleJson&&now-onlineNativePadSampleSentAt<250)return;
  onlineNativePadSampleJson=json;
  onlineNativePadSampleSentAt=now;
  parent.postMessage({source:'football-legacy-online-child',type:'gamepad-sample',context:'setup',role:ONLINE_ROLE,pad,connected:!!pad,reason,sampledAt:now},TARGET_ORIGIN);
}
function pollOnlineNativeGamepad(now){
  if(!ONLINE)return;
  postOnlineNativeGamepadSample(now);
  requestAnimationFrame(pollOnlineNativeGamepad);
}
const ids=['modePill','carouselPosition','homeControlLabel','awayControlLabel','modeNote','homeLeague','awayLeague','homeTeam','awayTeam','homeCard','awayCard','confirmTeams','homeManagementTitle','awayManagementTitle','homeFormation','awayFormation','homeTactics','awayTactics','homeLineup','awayLineup','homeBench','awayBench','confirmManagement','setupMatchPreview','matchMode','stadiumSelect','matchTime','weather','matchLength','difficulty','camera','volume','homeKit','awayKit','homeKitLabel','awayKitLabel','controllerCard','controllerLayoutStatus','kitClash','confirmSetup','confirmControls','finalMatchCard','summaryGrid','stadiumPreview','previewKickoff','previewStadiumName','startMatch','readyScreen','readyTitle','editMatch'];
const elements=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
function readRows(key){try{const rows=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
function leagueName(id){return LEAGUES.find(x=>x.id===id)?.name||id}
function selectedHome(){return getTeam(state.homeLeague,state.homeTeamId)}
function selectedAway(){return getTeam(state.awayLeague,state.awayTeamId)}
function defaultTeamId(leagueId,preferred=''){const teams=getLeagueTeams(leagueId);return preferred&&teams.some(t=>t.id===preferred)?preferred:(teams[0]?.id||'')}
function populateLeagueSelect(select,value){const leagues=ONLINE?LEAGUES.filter(league=>league.id!=='created'):LEAGUES;select.innerHTML=leagues.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');select.value=leagues.some(league=>league.id===value)?value:'div1'}
function populateTeamSelect(side){const league=state[`${side}League`],select=elements[`${side}Team`],teams=getLeagueTeams(league);state[`${side}TeamId`]=defaultTeamId(league,state[`${side}TeamId`]);select.disabled=!teams.length;select.innerHTML=teams.length?teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''):'<option value="">No clubs available</option>';select.value=state[`${side}TeamId`]}
function patternClass(p){return['stripes','hoops','halves','sash','quarters'].includes(p)?p:''}
function currentKit(team,key){return team?.kits?.[key]||team?.kits?.home||{pattern:'plain',primary:'#173a63',secondary:'#f4ead8',shorts:'#f4ead8',socks:'#173a63'}}
function teamCard(team,leagueId,kitKey='home'){
  if(!team)return'<div class="empty-team"><strong>No club available</strong></div>';
  const kit=currentKit(team,kitKey),r=team.ratings||{overall:60,attack:60,midfield:60,defence:60};
  const rows=[['Overall',r.overall],['Attack',r.attack],['Midfield',r.midfield],['Defence',r.defence]].map(([l,v])=>`<div class="rating-row"><span>${l}</span><div class="rating-track"><div class="rating-fill" style="width:${Number(v)||0}%"></div></div><strong>${Number(v)||0}</strong></div>`).join('');
  return`<div class="club-top"><div class="club-badge" style="--a:${esc(team.colours.primary)};--b:${esc(team.colours.secondary)}">${esc(team.abbreviation)}</div><div class="club-copy"><h3>${esc(team.name)}</h3><p>${esc(leagueName(leagueId))}</p></div></div><div class="kit-and-rating"><div class="kit-preview" style="--kit-a:${esc(kit.primary)};--kit-b:${esc(kit.secondary)};--shorts:${esc(kit.shorts)}"><div class="kit-shirt ${patternClass(kit.pattern)}"></div><div class="kit-shorts"></div></div><div class="ratings">${rows}</div></div><div class="club-facts"><div class="club-fact"><span>Formation</span><strong>${esc(team.formation)}</strong></div><div class="club-fact"><span>Stadium</span><strong>${esc(team.stadium)}</strong></div><div class="club-fact"><span>Squad</span><strong>${team.squad?.length||0} players</strong></div></div>`;
}
function renderTeamCards(){const h=selectedHome(),a=selectedAway();elements.homeCard.innerHTML=teamCard(h,state.homeLeague,'home');elements.awayCard.innerHTML=teamCard(a,state.awayLeague,'away');elements.homeCard.style.setProperty('--a',h?.colours?.primary||'#173a63');elements.homeCard.style.setProperty('--b',h?.colours?.secondary||'#f4ead8');elements.awayCard.style.setProperty('--a',a?.colours?.primary||'#173a63');elements.awayCard.style.setProperty('--b',a?.colours?.secondary||'#f4ead8');elements.confirmTeams.disabled=!(h&&a)}
function initialiseMode(){const online=state.mode==='online',versus=state.mode==='co-op',homeCoop=state.mode==='home-co-op',spectator=state.mode==='spectator',practice=state.mode==='free-kick-suite';elements.modePill.textContent=online?`Online · ${ONLINE_ROLE==='guest'?'Away':'Home'}`:practice?'Free Kick Practice':spectator?'CPU vs CPU':versus?'Co-op / Local 2P':homeCoop?'Same-Team Co-op':'Single Player';elements.homeControlLabel.textContent=online?(ONLINE_ROLE==='host'?'You':'Opponent'):spectator?'CPU':homeCoop?'Players 1 + 2':'Player 1';elements.awayControlLabel.textContent=online?(ONLINE_ROLE==='guest'?'You':'Opponent'):practice?'Practice defence':spectator?'CPU':versus?'Player 2':'CPU';elements.modeNote.innerHTML=online?`<strong>Online Versus:</strong> ${ONLINE_ROLE==='host'?'You own the Home slot and shared match settings.':'You own the Away slot.'} Each player chooses only their own team, line-up, tactics and kit.`:practice?'<strong>Free Kick Practice:</strong> Move anywhere with the taker, press D-pad Up to stage a free kick at that spot, and take unlimited attempts with the ball returned after every shot.':spectator?'<strong>CPU vs CPU:</strong> Both teams use their selected line-ups and tactics while you observe.':versus?'<strong>Co-op / local two-player:</strong> Controller 1 takes Home and Controller 2 takes Away.':homeCoop?'<strong>Same-team co-op:</strong> Controllers 1 and 2 share Home while the selected difficulty controls Away.':'<strong>Single Player:</strong> Controller 1 takes Home and the CPU controls Away.';if(elements.matchMode)elements.matchMode.value=state.mode}
function prepareStep(step){if(step==='management')renderManagement(false);if(step==='setup'){renderSetupPreview();populateStadiums();syncSetupControls();updateControllerCard();updateKitClash()}if(step==='controls')updateControllerCard();if(step==='confirm'){syncSetupState();renderConfirmation()}if(ONLINE)requestAnimationFrame(applyOnlineOwnership)}
function setStep(step,direction=0){if(!CAROUSEL_STEPS.includes(step))return;prepareStep(step);state.step=step;document.body.dataset.carouselDirection=direction<0?'back':direction>0?'forward':'direct';document.querySelectorAll('[data-page]').forEach(p=>p.classList.toggle('active',p.dataset.page===step));document.querySelectorAll('.step-tab').forEach(t=>{const active=t.dataset.step===step;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active))});const index=CAROUSEL_STEPS.indexOf(step);if(elements.carouselPosition)elements.carouselPosition.textContent=`${index+1} / ${CAROUSEL_STEPS.length}`;window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>{const page=document.querySelector(`[data-page="${step}"]`),target=page?.querySelector('[data-controller-default]:not([disabled]),.primary-button:not([disabled])');window.FootballLegacyControllerUI?.focus(target)},40)}
function moveCarousel(delta){const index=CAROUSEL_STEPS.indexOf(state.step),next=Math.max(0,Math.min(CAROUSEL_STEPS.length-1,index+delta));if(next!==index)setStep(CAROUSEL_STEPS[next],delta)}
function enableStep(step){const tab=document.querySelector(`.step-tab[data-step="${step}"]`);if(tab)tab.disabled=false}
function roleForSlot(slot){return slot==='GK'?'gk':['RB','CB','LB','RWB','LWB'].includes(slot)?'def':['ST','CF'].includes(slot)?'fwd':'mid'}
function defaultLineup(team,formation){const squad=team?.squad||[],slots=FORMATIONS[formation]||FORMATIONS['4-3-3'],used=new Set();return slots.map(slot=>{const exact=squad.filter(p=>!used.has(p.id)&&p.position===slot).sort((a,b)=>b.overall-a.overall)[0];const role=roleForSlot(slot),fallback=squad.filter(p=>!used.has(p.id)&&p.role===role).sort((a,b)=>b.overall-a.overall)[0]||squad.filter(p=>!used.has(p.id)).sort((a,b)=>b.overall-a.overall)[0];const chosen=exact||fallback;if(chosen)used.add(chosen.id);return chosen?.id||''})}
function defaultBench(team,lineup){const selected=new Set(lineup);return(team?.squad||[]).filter(p=>!selected.has(p.id)).sort((a,b)=>b.overall-a.overall).slice(0,7).map(p=>p.id)}
function ensureManagement(side,reset=false){const team=side==='home'?selectedHome():selectedAway(),m=state.management[side];if(reset||!FORMATIONS[m.formation])m.formation=team?.formation in FORMATIONS?team.formation:'4-3-3';if(reset||m.lineup.length!==11||m.lineup.some(id=>!team?.squad?.some(p=>p.id===id)))m.lineup=defaultLineup(team,m.formation);const validBench=Array.isArray(m.bench)&&m.bench.length===7&&m.bench.every(id=>team?.squad?.some(p=>p.id===id)&&!m.lineup.includes(id))&&new Set(m.bench).size===m.bench.length;if(reset||!validBench)m.bench=defaultBench(team,m.lineup);m.tactics={...defaultTactics(),...(m.tactics||{})}}
function playerOptions(team,selected,excluded=new Set()){return(team?.squad||[]).slice().sort((a,b)=>b.overall-a.overall).filter(p=>p.id===selected||!excluded.has(p.id)).map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${p.position} · ${esc(p.name)} · ${p.overall}</option>`).join('')}
function renderTactics(side){const m=state.management[side];elements[`${side}Tactics`].innerHTML=Object.entries(TACTIC_OPTIONS).map(([key,rows])=>`<label><span>${key==='lineHeight'?'Defensive line':key.replace(/^./,x=>x.toUpperCase())}</span><select data-tactic-side="${side}" data-tactic-key="${key}">${rows.map(([value,label])=>`<option value="${value}" ${m.tactics[key]===value?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}
function renderManagementSide(side){
  const team=side==='home'?selectedHome():selectedAway(),m=state.management[side],slots=FORMATIONS[m.formation]||FORMATIONS['4-3-3'];
  elements[`${side}ManagementTitle`].textContent=team?.name||'';
  elements[`${side}Formation`].innerHTML=Object.keys(FORMATIONS).map(f=>`<option value="${f}" ${f===m.formation?'selected':''}>${f}</option>`).join('');
  renderTactics(side);
  elements[`${side}Lineup`].innerHTML=slots.map((slot,i)=>`<label class="lineup-row"><span>${i+1}<b>${slot}</b></span><select data-lineup-side="${side}" data-lineup-index="${i}">${playerOptions(team,m.lineup[i])}</select></label>`).join('');
  const starters=new Set(m.lineup),benchSet=new Set(m.bench);
  elements[`${side}Bench`].innerHTML=`<strong>Seven substitutes</strong><div class="bench-select-grid">${m.bench.map((id,i)=>`<label class="bench-select-row"><span>${i+1}</span><select data-bench-side="${side}" data-bench-index="${i}">${playerOptions(team,id,new Set([...starters,...benchSet].filter(x=>x!==id)))}</select></label>`).join('')}</div>`;
}
function renderManagement(reset=false){ensureManagement('home',reset);ensureManagement('away',reset);renderManagementSide('home');renderManagementSide('away')}
function handleLineupChange(e){const select=e.target.closest('[data-lineup-side]');if(!select)return;const side=select.dataset.lineupSide,index=Number(select.dataset.lineupIndex),m=state.management[side],old=m.lineup[index],next=select.value,other=m.lineup.indexOf(next);m.lineup[index]=next;if(other>=0&&other!==index)m.lineup[other]=old;if(m.bench.includes(next)){const bi=m.bench.indexOf(next);m.bench[bi]=old}ensureManagement(side);renderManagementSide(side);if(ONLINE)onlineLocalChange(elements[`${side}Lineup`])}
function handleBenchChange(e){const select=e.target.closest('[data-bench-side]');if(!select)return;const side=select.dataset.benchSide,index=Number(select.dataset.benchIndex),m=state.management[side],old=m.bench[index],next=select.value,other=m.bench.indexOf(next);m.bench[index]=next;if(other>=0&&other!==index)m.bench[other]=old;renderManagementSide(side);if(ONLINE)onlineLocalChange(elements[`${side}Bench`])}
function handleTacticChange(e){const select=e.target.closest('[data-tactic-side]');if(!select)return;state.management[select.dataset.tacticSide].tactics[select.dataset.tacticKey]=select.value}
function renderMiniTeam(team,side){const m=state.management[side];return`<div class="mini-team"><div class="mini-badge" style="--a:${esc(team.colours.primary)};--b:${esc(team.colours.secondary)}">${esc(team.abbreviation)}</div><h3>${esc(team.name)}</h3><span>${esc(m.formation)} · ${esc(team.ratings.overall)} OVR</span></div>`}
function renderSetupPreview(){const h=selectedHome(),a=selectedAway();if(h&&a)elements.setupMatchPreview.innerHTML=`<div class="preview-versus">${renderMiniTeam(h,'home')}<div class="preview-vs">VS</div>${renderMiniTeam(a,'away')}</div>`;elements.homeKitLabel.textContent=`${h.name} Kit`;elements.awayKitLabel.textContent=`${a.name} Kit`}
function stadiumOption(v,l){return`<option value="${esc(v)}">${esc(l)}</option>`}
function populateStadiums(){const h=selectedHome(),a=selectedAway(),created=ONLINE?[]:readRows(STADIUM_STORAGE_KEY),previous=state.setup.stadiumValue||elements.stadiumSelect.value||'built-in:north-london',options=[stadiumOption('built-in:north-london','North London — Night test stadium'),stadiumOption(`home:${h.stadiumId}`,`${h.stadium} — Home ground`),stadiumOption(`away:${a.stadiumId}`,`${a.stadium} — Away ground`),stadiumOption('neutral:national-stadium','National Stadium — Neutral venue')];created.forEach(s=>options.push(stadiumOption(`created:${s.id}`,`${s.name} — ${Number(s.capacity||0).toLocaleString('en-GB')} capacity`)));elements.stadiumSelect.innerHTML=options.join('');state.setup.stadiumValue=[...elements.stadiumSelect.options].some(o=>o.value===previous)?previous:'built-in:north-london';elements.stadiumSelect.value=state.setup.stadiumValue}
function syncSetupControls(){elements.matchMode.value=state.mode;elements.matchTime.value=state.setup.matchTime;elements.weather.value=state.setup.weather;elements.matchLength.value=String(state.setup.matchLength);elements.difficulty.value=state.setup.difficulty;elements.camera.value=state.setup.camera;elements.volume.value=String(state.setup.volume);elements.homeKit.value=state.setup.homeKit;elements.awayKit.value=state.setup.awayKit;if(state.setup.stadiumValue)elements.stadiumSelect.value=state.setup.stadiumValue}
function selectedStadium(){const value=elements.stadiumSelect.value||state.setup.stadiumValue,[kind,id]=value.split(':');if(kind==='built-in'&&id==='north-london')return{id,name:'North London',source:'built-in',capacity:38000,theme:'north-london'};if(kind==='home')return{id,name:selectedHome().stadium,source:'home',capacity:null};if(kind==='away')return{id,name:selectedAway().stadium,source:'away',capacity:null};if(kind==='neutral')return{id,name:'National Stadium',source:'built-in',capacity:90000};const s=readRows(STADIUM_STORAGE_KEY).find(x=>x.id===id);return s?{id:s.id,name:s.name,source:'created',capacity:Number(s.capacity)||null}:{id,name:'Selected Stadium',source:kind,capacity:null}}
function colourDistance(a,b){const p=v=>{const m=/^#?([0-9a-f]{6})$/i.exec(v||'');if(!m)return[0,0,0];const n=parseInt(m[1],16);return[(n>>16)&255,(n>>8)&255,n&255]};const x=p(a),y=p(b);return Math.sqrt(x.reduce((s,v,i)=>s+(v-y[i])**2,0))}
function updateKitClash(){const h=currentKit(selectedHome(),elements.homeKit.value),a=currentKit(selectedAway(),elements.awayKit.value),clash=colourDistance(h.primary,a.primary)<90;elements.kitClash.hidden=!clash;elements.kitClash.textContent=clash?'The selected shirts are visually similar. Choose a different kit before starting.':''}
function updateControllerCard(){const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[],onlinePadCount=onlineState.controllerKnown?(onlineState.controllerConnected?1:0):pads.length,status=state.mode==='online'?`<strong>Online ${ONLINE_ROLE==='guest'?'Away':'Home'}:</strong> Your first connected controller controls ${ONLINE_ROLE==='guest'?'Away':'Home'} · ${onlinePadCount?`${onlinePadCount} detected.`:'connect a DualSense or Xbox controller.'}`:state.mode==='free-kick-suite'?`<strong>Free Kick Practice:</strong> Controller 1 → taker · D-pad Up places the free kick · unlimited attempts · ${pads.length?`${pads.length} detected.`:'keyboard also available.'}`:state.mode==='spectator'?'<strong>CPU vs CPU:</strong> both teams autonomous · controllers remain available for menu navigation.':state.mode==='co-op'?`<strong>Co-op / local two-player:</strong> Controller 1 → Home · Controller 2 → Away · ${pads.length} detected.`:state.mode==='home-co-op'?`<strong>Same-team co-op:</strong> Controller 1 + Controller 2 → Home · CPU → Away · ${pads.length} detected.`:`<strong>Single Player:</strong> Controller 1 → Home · CPU → Away · ${pads.length?`${pads.length} detected.`:'keyboard also available.'}`;elements.controllerCard.innerHTML=status;if(elements.controllerLayoutStatus)elements.controllerLayoutStatus.innerHTML=status}
function syncSetupState(){state.mode=ONLINE?'online':elements.matchMode.value;state.setup={stadiumValue:elements.stadiumSelect.value,matchTime:elements.matchTime.value,weather:elements.weather.value,matchLength:Number(elements.matchLength.value),difficulty:elements.difficulty.value,camera:elements.camera.value,volume:Number(elements.volume.value),homeKit:elements.homeKit.value,awayKit:elements.awayKit.value};initialiseMode()}
const titleCase=v=>String(v).replaceAll('-',' ').replace(/\b\w/g,l=>l.toUpperCase());
const kitLabel=v=>v==='home'?'Home kit':v==='away'?'Away kit':'Third kit';
function renderConfirmation(){const h=selectedHome(),a=selectedAway(),s=selectedStadium();elements.finalMatchCard.style.setProperty('--ha',h.colours.primary);elements.finalMatchCard.style.setProperty('--hb',h.colours.secondary);elements.finalMatchCard.style.setProperty('--aa',a.colours.primary);elements.finalMatchCard.style.setProperty('--ab',a.colours.secondary);elements.finalMatchCard.innerHTML=`<div class="final-team"><div class="club-badge" style="--a:${h.colours.primary};--b:${h.colours.secondary}">${esc(h.abbreviation)}</div><h3>${esc(h.name)}</h3><span>${state.management.home.formation}</span></div><div class="final-centre"><strong>${state.mode==='free-kick-suite'?'FK':'VS'}</strong><span>${esc(s.name)}</span></div><div class="final-team"><div class="club-badge" style="--a:${a.colours.primary};--b:${a.colours.secondary}">${esc(a.abbreviation)}</div><h3>${esc(a.name)}</h3><span>${state.management.away.formation}</span></div>`;elements.previewStadiumName.textContent=s.name;elements.previewKickoff.textContent=`${titleCase(state.setup.matchTime)} · ${titleCase(state.setup.weather)} · ${state.mode==='free-kick-suite'?'Unlimited free kicks':`${state.setup.matchLength} minutes`}`;elements.stadiumPreview.dataset.stadium=s.id;const modeLabel=state.mode==='online'?'Online Versus':state.mode==='free-kick-suite'?'Free Kick Practice':state.mode==='spectator'?'CPU vs CPU':state.mode==='co-op'?'Co-op / Local 2P':state.mode==='home-co-op'?'Same-Team Co-op':'Single Player',rows=[['Mode',modeLabel],['Stadium',s.name],['Kick-off',titleCase(state.setup.matchTime)],['Weather',titleCase(state.setup.weather)],['Match Length',state.mode==='free-kick-suite'?'Unlimited practice':`${state.setup.matchLength} minutes`],['Difficulty',titleCase(state.setup.difficulty)],['Camera',state.mode==='free-kick-suite'?'Player practice camera':titleCase(state.setup.camera)],['Sound','On · mute from pause menu'],['Kits',`${kitLabel(state.setup.homeKit)} · ${kitLabel(state.setup.awayKit)}`],['Home',`${state.management.home.formation} · ${titleCase(state.management.home.tactics.mentality)}`],['Away',`${state.management.away.formation} · ${titleCase(state.management.away.tactics.mentality)}`]];elements.summaryGrid.innerHTML=rows.map(([l,v])=>`<div class="summary-item"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join('')}
function recordsByIds(team,ids){return ids.map(id=>team.squad.find(p=>p.id===id)).filter(Boolean)}
function teamRecord(team,leagueId,kitKey,side){const m=state.management[side],lineup=recordsByIds(team,m.lineup),bench=recordsByIds(team,m.bench);return{id:team.id,name:team.name,shortName:team.shortName,source:team.source,countryId:team.countryId,divisionId:leagueId,squadId:team.squadId,formation:m.formation,tactics:{formation:m.formation.replaceAll('-',''),...m.tactics},rating:team.ratings,colours:team.colours,selectedKit:kitKey,kit:currentKit(team,kitKey),stadiumId:team.stadiumId,stadium:{name:team.stadium,capacity:null},lineup,bench,squad:team.squad}}
function buildMatchData(){const h=selectedHome(),a=selectedAway(),stadium=selectedStadium(),controllers=state.mode==='online'?{player1Team:'home',player2Team:'away',aiTeam:null,online:true}:state.mode==='spectator'?{player1Team:null,player2Team:null,aiTeam:'both'}:state.mode==='co-op'?{player1Team:'home',player2Team:'away',aiTeam:null}:state.mode==='home-co-op'?{player1Team:'home',player2Team:'home',aiTeam:'away',cooperative:true}:{player1Team:'home',player2Team:null,aiTeam:'away'};return{schemaVersion:4,mode:'quickPlay',season:'2026/27',year:2026,matchType:state.mode,practiceMode:state.mode==='free-kick-suite'?'free-kick':null,online:state.mode==='online'?{protocol:'football-legacy-online-v2',roomCode:onlineState.roomCode,hostSide:'home',guestSide:'away'}:null,homeTeam:teamRecord(h,state.homeLeague,state.setup.homeKit,'home'),awayTeam:teamRecord(a,state.awayLeague,state.setup.awayKit,'away'),controllers,settings:{stadium,matchTime:state.setup.matchTime,weather:state.setup.weather,matchLengthMinutes:state.setup.matchLength,difficulty:state.setup.difficulty,camera:state.setup.camera,volume:state.setup.volume},createdAt:new Date().toISOString()}}
function engineDifficulty(v){return ['amateur','semi-pro','professional','world-class','legendary','ultimate'].includes(v)?v:'ultimate'}
function saveAndLaunch(data){
  localStorage.setItem(MATCH_STORAGE_KEY,JSON.stringify(data));
  try{sessionStorage.setItem(MATCH_STORAGE_KEY,JSON.stringify(data))}catch{}
  const stadiumTheme=data.settings.stadium.theme||'north-london',config={mode:'quickPlay',matchType:data.matchType,practiceMode:data.practiceMode,online:data.online||null,year:2026,seasonYear:2026,homeTeam:{...data.homeTeam,tactics:{...data.homeTeam.tactics,camera:data.settings.camera,autoSwitch:preferences.autoSwitch||'on'}},awayTeam:{...data.awayTeam,tactics:{...data.awayTeam.tactics}},stadiumCapacity:data.settings.stadium.capacity||0,stadiumTheme,matchLengthMinutes:data.settings.matchLengthMinutes,controllers:data.controllers};
  localStorage.setItem(ENGINE_CONFIG_KEY,JSON.stringify(config));
  const params=new URLSearchParams({year:'2026',difficulty:engineDifficulty(data.settings.difficulty),weather:data.settings.matchTime==='night'?'night':data.settings.weather,camera:data.settings.camera,formation:data.homeTeam.formation.replaceAll('-',''),homeKit:data.homeTeam.selectedKit,awayKit:data.awayTeam.selectedKit,quickPlay:'1',stadiumTheme,matchMinutes:String(data.settings.matchLengthMinutes||4),autoSwitch:preferences.autoSwitch||'on',volume:String(Number(data.settings.volume??70))});
  if(data.matchType==='spectator')params.set('autoplay','1');
  if(data.practiceMode)params.set('practice',data.practiceMode);
  const offlineSafePayload=encodeMatchPayload(config);
  const href=`../match-engine/match.html?${params}#flMatch=${offlineSafePayload}`;
  if(ONLINE){parent.postMessage({source:'football-legacy-online-child',type:'launch-request',launchId:onlineState.launchId,lobbyVersion:currentLobbyVersion(),configRevision:currentConfigRevision(),href,homeName:data.homeTeam.shortName||data.homeTeam.name,awayName:data.awayTeam.shortName||data.awayTeam.name},TARGET_ORIGIN);return;}
  window.location.href=href;
}
function initialiseSelectors(){populateLeagueSelect(elements.homeLeague,state.homeLeague);populateLeagueSelect(elements.awayLeague,state.awayLeague);populateTeamSelect('home');populateTeamSelect('away');renderTeamCards();['home','away'].forEach(side=>{elements[`${side}League`].addEventListener('change',e=>{state[`${side}League`]=e.target.value;state[`${side}TeamId`]=defaultTeamId(e.target.value);populateTeamSelect(side);ensureManagement(side,true);renderTeamCards()});elements[`${side}Team`].addEventListener('change',e=>{state[`${side}TeamId`]=e.target.value;ensureManagement(side,true);renderTeamCards()})})}
function initialiseNavigation(){document.querySelectorAll('.step-tab').forEach(t=>t.addEventListener('click',()=>setStep(t.dataset.step)));document.querySelectorAll('[data-back]').forEach(b=>b.addEventListener('click',()=>setStep(b.dataset.back,-1)));elements.confirmTeams.addEventListener('click',()=>{if(!selectedHome()||!selectedAway())return;renderManagement(false);setStep('management',1)});elements.homeFormation.addEventListener('change',e=>{state.management.home.formation=e.target.value;state.management.home.lineup=defaultLineup(selectedHome(),e.target.value);state.management.home.bench=defaultBench(selectedHome(),state.management.home.lineup);renderManagementSide('home')});elements.awayFormation.addEventListener('change',e=>{state.management.away.formation=e.target.value;state.management.away.lineup=defaultLineup(selectedAway(),e.target.value);state.management.away.bench=defaultBench(selectedAway(),state.management.away.lineup);renderManagementSide('away')});elements.homeLineup.addEventListener('change',handleLineupChange);elements.awayLineup.addEventListener('change',handleLineupChange);elements.homeBench.addEventListener('change',handleBenchChange);elements.awayBench.addEventListener('change',handleBenchChange);elements.homeTactics.addEventListener('change',handleTacticChange);elements.awayTactics.addEventListener('change',handleTacticChange);elements.confirmManagement.addEventListener('click',()=>setStep('setup',1));[elements.matchMode,elements.stadiumSelect,elements.matchTime,elements.weather,elements.matchLength,elements.difficulty,elements.camera,elements.volume,elements.homeKit,elements.awayKit].forEach(c=>c.addEventListener('change',()=>{syncSetupState();updateControllerCard();updateKitClash()}));elements.confirmSetup.addEventListener('click',()=>setStep('controls',1));elements.confirmControls.addEventListener('click',()=>setStep('confirm',1));elements.startMatch.addEventListener('click',()=>{syncSetupState();saveAndLaunch(buildMatchData())});addEventListener('keydown',e=>{if(e.repeat)return;if(e.key==='PageUp'||e.key==='['){e.preventDefault();moveCarousel(-1)}else if(e.key==='PageDown'||e.key===']'){e.preventDefault();moveCarousel(1)}})}
function initialiseShoulderCarousel(){if(ONLINE)return;const padState=new Map(),pressed=(gp,index)=>{const button=gp.buttons&&gp.buttons[index];return !!(button&&(button.pressed||button.value>.5))};const poll=()=>{let pads=[];try{pads=navigator.getGamepads?[...(navigator.getGamepads()||[])].filter(Boolean):[]}catch{}for(const gp of pads){const prior=padState.get(gp.index)||{l1:false,r1:false},l1=pressed(gp,4),r1=pressed(gp,5);if(l1&&!prior.l1)moveCarousel(-1);if(r1&&!prior.r1)moveCarousel(1);padState.set(gp.index,{l1,r1})}requestAnimationFrame(poll)};requestAnimationFrame(poll)}
function onlineSend(message){if(!ONLINE)return;traceOnline('peer-out',{messageType:message&&message.type,revision:message&&message.revision,side:message&&message.side});parent.postMessage({source:'football-legacy-online-child',type:'send',message},TARGET_ORIGIN)}
function onlineClone(value){return JSON.parse(JSON.stringify(value))}
function onlineRevision(value){const revision=Number(value);return Number.isInteger(revision)&&revision>=0?revision:null}
function onlineLobbySynchronized(){return onlineState.sideRevisions.home>=0&&onlineState.sideRevisions.away>=0&&onlineState.settingsRevision>=0}
function currentConfigRevision(){return onlineLobbySynchronized()?`${onlineState.sideRevisions.home}:${onlineState.sideRevisions.away}:${onlineState.settingsRevision}`:''}
function currentLobbyVersion(){const configRevision=currentConfigRevision();return configRevision?`${onlineState.roomCode}|${configRevision}`:''}
function onlineSidePayload(side){return{side,revision:onlineState.sideRevisions[side],league:state[`${side}League`],teamId:state[`${side}TeamId`],management:onlineClone(state.management[side]),kit:state.setup[`${side}Kit`]}}
function onlineSettingsPayload(){return{revision:onlineState.settingsRevision,settings:{stadiumValue:state.setup.stadiumValue,matchTime:state.setup.matchTime,weather:state.setup.weather,matchLength:state.setup.matchLength,difficulty:state.setup.difficulty,camera:state.setup.camera,volume:state.setup.volume,homeKit:state.setup.homeKit}}}
function invalidateOnlineLobby(reason,sendState=true){
  const cancelledLaunchId=onlineState.launchRequested?onlineState.launchId:'';
  const cancelledLobbyVersion=onlineState.ownReadyVersion||currentLobbyVersion();
  const cancelledConfigRevision=currentConfigRevision();
  onlineState.ownReady=false;
  onlineState.remoteReady=false;
  onlineState.ownReadyRevision+=1;
  onlineState.remoteReadyRevision=-1;
  onlineState.readyAckRevision=-1;
  onlineState.ownReadyVersion=currentLobbyVersion();
  onlineState.remoteReadyVersion='';
  onlineState.startIntent=false;
  onlineState.launchRequested=false;
  onlineState.launchId='';
  traceOnline('ready-invalidated',{reason});
  if(cancelledLaunchId&&onlineState.connected)onlineSend({type:'launch-cancel',launchId:cancelledLaunchId,lobbyVersion:cancelledLobbyVersion,configRevision:cancelledConfigRevision,reason});
  if(sendState)onlineSendReady(true);
}
function onlineSendReady(force=false){if(!ONLINE||!onlineState.connected||!onlineLobbySynchronized())return false;const now=performance.now(),acknowledged=onlineState.readyAckRevision===onlineState.ownReadyRevision&&onlineState.ownReadyVersion===currentLobbyVersion();if(!force&&acknowledged&&now-onlineState.lastReadySentAt<1800)return false;onlineState.lastReadySentAt=now;onlineSend({type:'ready-state',side:ONLINE_OWNED_SIDE,ready:onlineState.ownReady,revision:onlineState.ownReadyRevision,lobbyVersion:onlineState.ownReadyVersion||currentLobbyVersion(),configRevision:currentConfigRevision()});return true}
function onlineBroadcastCurrent(){if(!ONLINE||!onlineState.connected)return;onlineSend({type:'lobby-side',...onlineSidePayload(ONLINE_OWNED_SIDE)});if(ONLINE_ROLE==='host')onlineSend({type:'lobby-settings',...onlineSettingsPayload()});onlineSendReady(true)}
function applyOnlineSide(message){
  const side=message.side,revision=onlineRevision(message.revision);
  if(!ONLINE||side===ONLINE_OWNED_SIDE||!['home','away'].includes(side)||message.league==='created'||revision===null)return;
  if(revision>onlineState.sideRevisions[side]){
    onlineState.sideRevisions[side]=revision;
    onlineState.applyingRemote=true;
    try{state[`${side}League`]=message.league||state[`${side}League`];state[`${side}TeamId`]=message.teamId||state[`${side}TeamId`];populateLeagueSelect(elements[`${side}League`],state[`${side}League`]);populateTeamSelect(side);if(message.management)state.management[side]=onlineClone(message.management);ensureManagement(side,false);if(message.kit)state.setup[`${side}Kit`]=message.kit;renderTeamCards();renderManagementSide(side);syncSetupControls();if(state.step==='setup')renderSetupPreview();if(state.step==='confirm')renderConfirmation();}finally{onlineState.applyingRemote=false}
    invalidateOnlineLobby('remote-side-revision');
  }
  onlineSend({type:'lobby-ack',scope:side,revision});
  applyOnlineOwnership();updateOnlineReadyUI();
}
function applyOnlineSettings(message){
  const revision=onlineRevision(message&&message.revision),settings=message&&message.settings;
  if(!ONLINE||ONLINE_ROLE!=='guest'||!settings||revision===null)return;
  if(revision>onlineState.settingsRevision){
    onlineState.settingsRevision=revision;
    onlineState.applyingRemote=true;
    try{const awayKit=state.setup.awayKit;state.setup={...state.setup,...onlineClone(settings),awayKit};populateStadiums();syncSetupControls();if(state.step==='setup')renderSetupPreview();if(state.step==='confirm')renderConfirmation();}finally{onlineState.applyingRemote=false}
    invalidateOnlineLobby('remote-settings-revision');
  }
  onlineSend({type:'lobby-ack',scope:'settings',revision});
  applyOnlineOwnership();updateOnlineReadyUI();
}
function applyOnlineOwnership(){if(!ONLINE)return;const ownHome=ONLINE_OWNED_SIDE==='home',launchLocked=onlineState.launchRequested;const setDisabled=(nodes,disabled)=>nodes.filter(Boolean).forEach(node=>{node.disabled=disabled;node.setAttribute('aria-disabled',String(disabled))});setDisabled([elements.homeLeague,elements.homeTeam,elements.homeFormation,...elements.homeTactics.querySelectorAll('select'),...elements.homeLineup.querySelectorAll('select'),...elements.homeBench.querySelectorAll('select')],launchLocked||!ownHome);setDisabled([elements.awayLeague,elements.awayTeam,elements.awayFormation,...elements.awayTactics.querySelectorAll('select'),...elements.awayLineup.querySelectorAll('select'),...elements.awayBench.querySelectorAll('select')],launchLocked||ownHome);setDisabled([elements.matchMode],true);setDisabled([elements.stadiumSelect,elements.matchTime,elements.weather,elements.matchLength,elements.difficulty,elements.camera,elements.volume,elements.homeKit],launchLocked||ONLINE_ROLE!=='host');setDisabled([elements.awayKit],launchLocked||ONLINE_ROLE!=='guest');document.querySelector('.team-selector.home-side')?.classList.toggle('online-locked',!ownHome);document.querySelector('.team-selector.away-side')?.classList.toggle('online-locked',ownHome);document.querySelectorAll('.management-panel').forEach((panel,index)=>panel.classList.toggle('online-locked',ownHome?index===1:index===0))}
function updateOnlineReadyUI(){
  if(!ONLINE)return;
  applyOnlineOwnership();
  const startWasDisabled=elements.startMatch.disabled;
  const own=ONLINE_ROLE==='host'?'Home':'Away',other=ONLINE_ROLE==='host'?'Away':'Home';
  const connection=onlineState.connected?'Connected':'Waiting for opponent',room=onlineState.roomCode?` Room ${onlineState.roomCode}.`:'';
  const lobbySynchronized=onlineLobbySynchronized(),lobbyVersion=currentLobbyVersion();
  const ownReadyAcknowledged=onlineState.ownReady&&onlineState.readyAckRevision===onlineState.ownReadyRevision&&onlineState.ownReadyVersion===lobbyVersion;
  elements.modeNote.innerHTML=`<strong>Online Versus · ${own}:</strong> ${connection}.${room} You control only ${own}; ${other} belongs to the other player. ${ONLINE_ROLE==='host'?'You also choose the shared match settings.':'Press Ready when your Away setup is complete.'}`;
  if(state.step==='confirm'){
    const packageNote=document.querySelector('.package-note');
    if(packageNote)packageNote.textContent=`${own}: ${ownReadyAcknowledged?'ready':onlineState.ownReady?'syncing':'not ready'} · ${other}: ${onlineState.remoteReady?'ready':'not ready'} · ${onlineState.roomCode}${!lobbySynchronized?' · syncing lobby':''}`;
  }
  elements.startMatch.disabled=!onlineState.connected||!lobbySynchronized||onlineState.launchRequested;
  if(!onlineState.connected)elements.startMatch.innerHTML='<span class="button-glyph">…</span> Waiting for Opponent';
  else if(!lobbySynchronized)elements.startMatch.innerHTML='<span class="button-glyph">↻</span> Syncing Lobby';
  else if(onlineState.launchRequested)elements.startMatch.innerHTML='<span class="button-glyph">…</span> Starting Online Match';
  else if(onlineState.ownReady&&!ownReadyAcknowledged)elements.startMatch.innerHTML=`<span class="button-glyph">↻</span> Syncing ${own} Ready`;
  else if(ONLINE_ROLE==='host'&&onlineState.remoteReady&&onlineState.ownReady)elements.startMatch.innerHTML='<span class="button-glyph">×</span> Start Online Match';
  else if(ONLINE_ROLE==='host'&&onlineState.remoteReady)elements.startMatch.innerHTML='<span class="button-glyph">×</span> Ready & Start Match';
  else if(!onlineState.ownReady)elements.startMatch.innerHTML=`<span class="button-glyph">×</span> Ready ${own}`;
  else elements.startMatch.innerHTML=`<span class="button-glyph">✓</span> ${ONLINE_ROLE==='guest'?'Away Ready · Waiting for Home':'Home Ready · Waiting for Away'}`;
  if(startWasDisabled&&!elements.startMatch.disabled&&state.step==='confirm'&&document.body.classList.contains('controller-navigation'))requestAnimationFrame(()=>window.FootballLegacyControllerUI?.focus(elements.startMatch));
}
function reconcileOnlineConnection(connected,epoch){
  const nextConnected=!!connected,nextEpoch=Number.isFinite(Number(epoch))?Number(epoch):onlineState.connectionEpoch;
  const epochChanged=nextEpoch!==onlineState.connectionEpoch,connectionChanged=nextConnected!==onlineState.connected;
  if(!epochChanged&&!connectionChanged)return false;
  onlineState.connectionEpoch=nextEpoch;
  onlineState.connected=nextConnected;
  if(epochChanged||!nextConnected){
    const remoteSide=ONLINE_OWNED_SIDE==='home'?'away':'home';
    onlineState.sideRevisions[remoteSide]=-1;
    if(ONLINE_ROLE==='guest')onlineState.settingsRevision=-1;
    invalidateOnlineLobby('connection-epoch',false);
  }
  traceOnline('connection',{nextConnected,epochChanged});
  updateOnlineReadyUI();
  if(nextConnected)requestAnimationFrame(onlineBroadcastCurrent);
  return true;
}
function handleOnlineMenuInput(data){
  if(!ONLINE)return;
  reconcileOnlineConnection(data&&data.peerConnected,data&&data.connectionEpoch);
  const pad=data&&data.pad||null,connected=!!(data&&data.connected&&pad),changed=!onlineState.controllerKnown||onlineState.controllerConnected!==connected;
  onlineState.controllerKnown=true;
  onlineState.controllerConnected=connected;
  if(!pad){
    window.FootballLegacyControllerUI?.forgetGamepad(99);
    onlineMenuPadState.previousSection=false;
    onlineMenuPadState.nextSection=false;
    if(changed){updateControllerCard();updateOnlineReadyUI()}
    return;
  }
  const contract=window.FootballLegacyControllerUI?.receiveGamepad(pad,performance.now());
  if(contract){
    if(contract.previousSection&&!onlineMenuPadState.previousSection)moveCarousel(-1);
    if(contract.nextSection&&!onlineMenuPadState.nextSection)moveCarousel(1);
    onlineMenuPadState.previousSection=!!contract.previousSection;
    onlineMenuPadState.nextSection=!!contract.nextSection;
  }
  if(changed){updateControllerCard();updateOnlineReadyUI()}
}
function onlineSetReady(ready){
  const next=!!ready;
  if(next&&(!onlineState.connected||!onlineLobbySynchronized())){onlineState.ownReady=false;updateOnlineReadyUI();return false}
  if(onlineState.ownReady!==next){
    onlineState.ownReady=next;
    onlineState.ownReadyRevision+=1;
    onlineState.readyAckRevision=-1;
    onlineState.ownReadyVersion=currentLobbyVersion();
    onlineState.startIntent=false;
    onlineState.launchRequested=false;
    onlineState.launchId='';
  }
  traceOnline('ready-intent',{ready:next,revision:onlineState.ownReadyRevision,lobbyVersion:onlineState.ownReadyVersion});
  onlineSendReady(true);
  updateOnlineReadyUI();
  return true;
}
function onlineLaunchId(){const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return`${Date.now().toString(36)}-${bytes[0].toString(36)}${bytes[1].toString(36)}`}
function tryOnlineLaunch(){
  const lobbyVersion=currentLobbyVersion();
  if(!ONLINE||ONLINE_ROLE!=='host'||!onlineState.startIntent||!onlineState.connected||onlineState.launchRequested||!onlineState.ownReady||!onlineState.remoteReady||!lobbyVersion||onlineState.ownReadyVersion!==lobbyVersion||onlineState.remoteReadyVersion!==lobbyVersion||onlineState.readyAckRevision!==onlineState.ownReadyRevision)return false;
  onlineState.launchRequested=true;
  onlineState.launchId=onlineLaunchId();
  traceOnline('launch-requested',{launchId:onlineState.launchId,lobbyVersion});
  updateOnlineReadyUI();
  syncSetupState();
  saveAndLaunch(buildMatchData());
  return true;
}
function onlineLocalChange(target){
  if(!ONLINE||onlineState.applyingRemote||onlineState.launchRequested)return;
  const within=(element,node)=>!!(element&&node&&(element===node||element.contains(node))),home=within(elements.homeTactics,target)||within(elements.homeLineup,target)||within(elements.homeBench,target)||[elements.homeLeague,elements.homeTeam,elements.homeFormation,elements.homeKit].includes(target),away=within(elements.awayTactics,target)||within(elements.awayLineup,target)||within(elements.awayBench,target)||[elements.awayLeague,elements.awayTeam,elements.awayFormation,elements.awayKit].includes(target),shared=[elements.stadiumSelect,elements.matchTime,elements.weather,elements.matchLength,elements.difficulty,elements.camera,elements.volume].includes(target),sideChanged=(ONLINE_OWNED_SIDE==='home'&&home)||(ONLINE_OWNED_SIDE==='away'&&away),settingsChanged=ONLINE_ROLE==='host'&&(shared||target===elements.homeKit);
  if(!sideChanged&&!settingsChanged)return;
  if(sideChanged)onlineState.sideRevisions[ONLINE_OWNED_SIDE]+=1;
  if(settingsChanged)onlineState.settingsRevision+=1;
  invalidateOnlineLobby('local-configuration');
  if(sideChanged)onlineSend({type:'lobby-side',...onlineSidePayload(ONLINE_OWNED_SIDE)});
  if(settingsChanged)onlineSend({type:'lobby-settings',...onlineSettingsPayload()});
}
function handleOnlinePeerMessage(message){
  if(!ONLINE||!message)return;
  traceOnline('peer-in',{messageType:message.type,revision:message.revision,side:message.side});
  if(message.type==='hello'){onlineBroadcastCurrent();return}
  if(message.type==='lobby-side'){applyOnlineSide(message);return}
  if(message.type==='lobby-settings'){applyOnlineSettings(message);return}
  if(message.type==='lobby-ack'){traceOnline('lobby-ack',{scope:message.scope,revision:message.revision});return}
  if(message.type==='ready-state'){
    const expectedSide=ONLINE_OWNED_SIDE==='home'?'away':'home',revision=onlineRevision(message.revision),lobbyVersion=String(message.lobbyVersion||''),configRevision=String(message.configRevision||''),currentVersion=currentLobbyVersion(),currentConfig=currentConfigRevision();
    if(message.side!==expectedSide||revision===null)return;
    if(revision>=onlineState.remoteReadyRevision){
      onlineState.remoteReadyRevision=revision;
      onlineState.remoteReady=!!message.ready&&!!currentVersion&&lobbyVersion===currentVersion&&configRevision===currentConfig;
      onlineState.remoteReadyVersion=onlineState.remoteReady?lobbyVersion:'';
      if(!message.ready){onlineState.startIntent=false;onlineState.launchRequested=false;onlineState.launchId=''}
    }
    const accepted=!message.ready||(onlineState.remoteReady&&lobbyVersion===currentLobbyVersion()&&configRevision===currentConfigRevision());
    onlineSend({type:'ready-ack',side:message.side,revision,lobbyVersion,configRevision,accepted});
    if(!accepted)onlineBroadcastCurrent();
    updateOnlineReadyUI();
    tryOnlineLaunch();
    return;
  }
  if(message.type==='ready-ack'){
    const revision=onlineRevision(message.revision);
    if(message.side!==ONLINE_OWNED_SIDE||revision===null||revision!==onlineState.ownReadyRevision||message.lobbyVersion!==onlineState.ownReadyVersion||message.configRevision!==currentConfigRevision())return;
    if(message.accepted)onlineState.readyAckRevision=revision;
    traceOnline('ready-acknowledged',{revision,accepted:!!message.accepted});
    updateOnlineReadyUI();
    if(!message.accepted){onlineBroadcastCurrent();return}
    tryOnlineLaunch();
    return;
  }
  if(message.type==='launch-proposal'&&ONLINE_ROLE==='guest'){
    const lobbyVersion=currentLobbyVersion(),configRevision=currentConfigRevision(),valid=typeof message.launchId==='string'&&message.launchId.length>5&&(!onlineState.launchRequested||onlineState.launchId===message.launchId)&&message.lobbyVersion===lobbyVersion&&message.configRevision===configRevision&&onlineState.connected&&onlineState.ownReady&&onlineState.remoteReady&&onlineState.ownReadyVersion===lobbyVersion&&onlineState.remoteReadyVersion===lobbyVersion&&onlineState.readyAckRevision===onlineState.ownReadyRevision;
    traceOnline('launch-proposal',{launchId:message.launchId,valid});
    if(valid){onlineState.launchRequested=true;onlineState.launchId=message.launchId;updateOnlineReadyUI();onlineSend({type:'launch-ack',launchId:message.launchId,lobbyVersion,configRevision})}
    else onlineSend({type:'launch-reject',launchId:message.launchId,lobbyVersion:message.lobbyVersion,configRevision:message.configRevision,currentLobbyVersion:lobbyVersion,currentConfigRevision:configRevision});
    return;
  }
  if(message.type==='launch-commit'&&ONLINE_ROLE==='guest'){
    const lobbyVersion=currentLobbyVersion(),configRevision=currentConfigRevision(),valid=typeof message.launchId==='string'&&message.launchId===onlineState.launchId&&message.lobbyVersion===lobbyVersion&&message.configRevision===configRevision&&onlineState.launchRequested&&onlineState.connected&&onlineState.ownReady&&onlineState.remoteReady&&onlineState.ownReadyVersion===lobbyVersion&&onlineState.remoteReadyVersion===lobbyVersion&&onlineState.readyAckRevision===onlineState.ownReadyRevision;
    traceOnline('launch-commit',{launchId:message.launchId,valid});
    if(valid)onlineSend({type:'launch-commit-ack',launchId:message.launchId,lobbyVersion,configRevision});
    else onlineSend({type:'launch-reject',launchId:message.launchId,lobbyVersion:message.lobbyVersion,configRevision:message.configRevision,currentLobbyVersion:lobbyVersion,currentConfigRevision:configRevision});
    return;
  }
  if(message.type==='launch-cancel'){
    if(!message.launchId||message.launchId===onlineState.launchId){onlineState.launchRequested=false;onlineState.startIntent=false;onlineState.launchId='';updateOnlineReadyUI()}
    return;
  }
  if(message.type==='launch-reject'&&ONLINE_ROLE==='host'){
    onlineState.launchRequested=false;onlineState.startIntent=false;onlineState.launchId='';
    traceOnline('launch-rejected',{currentLobbyVersion:message.currentLobbyVersion});
    onlineBroadcastCurrent();updateOnlineReadyUI();
  }
}
function initialiseOnlineMode(){
  if(!ONLINE)return;
  document.body.classList.add('online-quick-play');
  document.body.dataset.controllerExternalGamepad='true';
  document.querySelectorAll('a[href="../index.html"]').forEach(link=>{link.target='_top'});
  applyOnlineOwnership();
  updateOnlineReadyUI();
  addEventListener('message',event=>{
    if(event.source!==parent||(TARGET_ORIGIN!=='*'&&event.origin!==TARGET_ORIGIN))return;
    const data=event.data;
    if(!data||data.source!=='football-legacy-online-parent')return;
    if(data.type==='menu-input'){handleOnlineMenuInput(data);return}
    if(data.type==='connection'){
      onlineState.roomCode=data.roomCode||onlineState.roomCode;
      reconcileOnlineConnection(data.connected,data.connectionEpoch);
      return;
    }
    if(data.type==='launch-failed'){
      onlineState.launchRequested=false;
      onlineState.startIntent=false;
      onlineState.launchId='';
      traceOnline('launch-failed',{reason:data.reason||'handshake'});
      updateOnlineReadyUI();
      return;
    }
    if(data.type==='peer-message')handleOnlinePeerMessage(data.message);
  });
  document.addEventListener('change',event=>onlineLocalChange(event.target));
  document.addEventListener('click',event=>{
    if(!event.target.closest('#startMatch'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!onlineState.connected)return;
    if(ONLINE_ROLE==='host'){
      if(!onlineState.ownReady){
        const startWhenAcknowledged=onlineState.remoteReady;
        onlineSetReady(true);
        onlineState.startIntent=startWhenAcknowledged;
        updateOnlineReadyUI();
        tryOnlineLaunch();
        return;
      }
      if(onlineState.remoteReady){
        onlineState.startIntent=true;
        traceOnline('start-intent',{lobbyVersion:currentLobbyVersion()});
        updateOnlineReadyUI();
        tryOnlineLaunch();
        return;
      }
      onlineSetReady(false);
      return;
    }
    if(!onlineState.ownReady){onlineSetReady(true);return}
    onlineSetReady(false);
  },true);
  addEventListener('gamepadconnected',()=>{postOnlineNativeGamepadSample(performance.now(),true,'connected');updateOnlineReadyUI()});
  addEventListener('gamepaddisconnected',()=>{postOnlineNativeGamepadSample(performance.now(),true,'disconnected');updateOnlineReadyUI()});
  window.FLQuickPlayOnlineDebug={getState:()=>({...onlineState,sideRevisions:{...onlineState.sideRevisions},lobbyVersion:currentLobbyVersion(),lobbySynchronized:onlineLobbySynchronized()}),getProtocolTrace:()=>onlineProtocolTrace.slice(),resendReady:()=>onlineSendReady(true),broadcastLobby:onlineBroadcastCurrent};
  requestAnimationFrame(pollOnlineNativeGamepad);
  // Timers keep a low-frequency bridge alive if a browser briefly throttles
  // the rendered child frame; the animation-frame path remains the live input.
  setInterval(()=>postOnlineNativeGamepadSample(performance.now()),250);
  parent.postMessage({source:'football-legacy-online-child',type:'child-ready'},TARGET_ORIGIN);
}
if(ONLINE){const onlineOption=document.createElement('option');onlineOption.value='online';onlineOption.textContent='Online Versus';elements.matchMode.appendChild(onlineOption)}
initialiseMode();initialiseSelectors();renderManagement(true);populateStadiums();syncSetupControls();initialiseNavigation();initialiseShoulderCarousel();updateControllerCard();setStep('teams');let onlineResyncTick=0;setInterval(()=>{updateControllerCard();if(ONLINE){onlineSendReady(false);if(++onlineResyncTick%2===0)onlineBroadcastCurrent();updateOnlineReadyUI()}},1200);
initialiseOnlineMode();
