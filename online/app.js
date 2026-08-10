'use strict';
(() => {
  const PROTOCOL='football-legacy-online-v1';
  const BUILD='171';
  const PEER_PREFIX='football-legacy-171-';
  const TARGET_ORIGIN=location.origin==='null'?'*':location.origin;
  const $=id=>document.getElementById(id);
  const ui={
    entry:$('entryScreen'),waiting:$('waitingScreen'),stage:$('gameStage'),frame:$('gameFrame'),
    guestStage:$('guestStage'),video:$('matchVideo'),videoGate:$('videoGate'),guestMessage:$('guestMessage'),
    pill:$('connectionPill'),networkStatus:$('networkStatus'),networkRole:$('networkRole'),networkLatency:$('networkLatency'),
    roomCodeBlock:$('roomCodeBlock'),roomCode:$('roomCode'),waitingEyebrow:$('waitingEyebrow'),waitingTitle:$('waitingTitle'),
    waitingCopy:$('waitingCopy'),joinForm:$('joinForm'),roomInput:$('roomInput'),fatal:$('fatalCard'),fatalTitle:$('fatalTitle'),fatalCopy:$('fatalCopy'),
    remoteEvent:$('remoteEvent'),remoteOfficial:$('remoteOfficial'),remoteVar:$('remoteVar'),remoteSetPiece:$('remoteSetPiece'),
    remotePlayerCard:$('remotePlayerCard'),remotePowerFill:$('remotePowerFill'),remotePowerIdeal:$('remotePowerIdeal'),
    remoteStateOverlay:$('remoteStateOverlay')
  };
  let peer=null;
  let connection=null;
  let connectionPending=false;
  let mediaCall=null;
  let role=null;
  let roomCode='';
  let opponentPeer='';
  let childReady=false;
  let matchStarted=false;
  let matchHomeName='HOME';
  let matchAwayName='AWAY';
  let latestChildMessages=[];
  let latencyMs=null;
  let lastPingAt=0;
  let lastPongAt=0;
  let inputFrame=0;
  let latestRemoteInputSeq=-1;
  let lastInputJson='';
  let lastInputSentAt=0;
  let guestPadConnected=false;
  let hostSeesAwayController=null;
  let remoteAudioMuted=false;
  let remoteAudioReady=false;
  let remoteAudioTrack=false;
  let videoPlaying=false;
  let hostViewTimer=null;
  let heartbeatTimer=null;
  let reconnectTimer=null;
  let reconnectDeadline=0;
  let disconnectHandled=false;
  let connectionEpoch=0;
  let pendingLaunch=null;
  let proposedGuestLaunch=null;
  let acceptedGuestLaunch=null;
  let launchTimer=null;
  let launchCommitted='';
  const protocolTrace=[];

  function traceProtocol(direction,type,detail={}){
    protocolTrace.push({at:Date.now(),direction,type,connectionEpoch,connectionOpen:!!(connection&&connection.open),...detail});
    if(protocolTrace.length>240)protocolTrace.splice(0,protocolTrace.length-240);
  }
  window.FLOnlineDebug={
    getState:()=>({build:BUILD,role,roomCode,matchStarted,connectionOpen:!!(connection&&connection.open),connectionEpoch,connectionPending,lastPongAge:lastPongAt?Date.now()-lastPongAt:null,latestRemoteInputSeq,guestPadConnected,hostSeesAwayController,videoPlaying,pendingLaunch:pendingLaunch?{launchId:pendingLaunch.launchId,phase:pendingLaunch.phase,lobbyVersion:pendingLaunch.lobbyVersion,configRevision:pendingLaunch.configRevision}:null,launchCommitted}),
    getProtocolTrace:()=>protocolTrace.slice(),
    renderRemoteView,
    serialisePad
  };

  const randomCode=()=>{
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes=new Uint8Array(10);
    crypto.getRandomValues(bytes);
    return[...bytes].map(value=>alphabet[value%alphabet.length]).join('').replace(/^(.{5})(.{5})$/,'$1-$2');
  };
  const cleanCode=value=>String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,10).replace(/^(.{5})(.+)$/,'$1-$2');
  const peerIdFor=code=>PEER_PREFIX+cleanCode(code).replace('-','').toLowerCase();
  const setText=(id,value)=>{const node=$(id);if(node)node.textContent=value==null?'':String(value)};
  const validMessageOrigin=event=>TARGET_ORIGIN==='*'||event.origin===TARGET_ORIGIN;

  function setConnection(state,label){
    ui.pill.dataset.state=state;
    ui.pill.querySelector('span').textContent=label;
    if(ui.networkStatus)ui.networkStatus.textContent=label;
  }
  function setOuterControllerSuspended(suspended){
    document.body.dataset.controllerUiSuspended=suspended?'true':'false';
    if(!suspended)requestAnimationFrame(()=>window.FootballLegacyControllerUI?.focus());
  }
  function showOnly(target){[ui.entry,ui.waiting,ui.stage].forEach(element=>{element.hidden=element!==target});setOuterControllerSuspended(target===ui.stage)}
  function clearTimers(){clearInterval(hostViewTimer);clearInterval(heartbeatTimer);clearInterval(reconnectTimer);clearInterval(launchTimer);hostViewTimer=heartbeatTimer=reconnectTimer=launchTimer=null}
  function fail(title,copy){
    clearTimers();
    setOuterControllerSuspended(false);
    setConnection('lost','Connection failed');
    ui.fatalTitle.textContent=title;
    ui.fatalCopy.textContent=copy;
    ui.fatal.hidden=false;
  }
  function reset(){
    clearTimers();
    try{connection&&connection.close()}catch{}
    try{mediaCall&&mediaCall.close()}catch{}
    try{peer&&peer.destroy()}catch{}
    location.href='index.html';
  }
  function peerOptions(){return{debug:1}}
  function createPeer(id){
    if(typeof window.Peer!=='function'){
      fail('Online service did not load','Check the internet connection and reload Online Versus.');
      return null;
    }
    const instance=new Peer(id,peerOptions());
    instance.on('error',error=>{
      const type=error&&error.type||'';
      if(type==='peer-unavailable'&&role==='guest'&&!matchStarted)fail('Room not found','Check the code with the host. The room may not be open yet.');
      else if(type==='unavailable-id'&&role==='host'&&!matchStarted)startHost(true);
      else if(!matchStarted)fail('Could not open the room',error&&error.message||'The connection service rejected the room.');
    });
    instance.on('disconnected',()=>{if(!connection||!connection.open)setConnection('connecting','Reconnecting to room service')});
    instance.on('call',handleMediaCall);
    return instance;
  }
  function send(message){
    const delivered=!!(connection&&connection.open);
    traceProtocol('peer-out',message&&message.type||'unknown',{delivered,revision:message&&message.revision,side:message&&message.side,launchId:message&&message.launchId});
    if(delivered)connection.send({protocol:PROTOCOL,build:BUILD,...message});
    return delivered;
  }
  function childSend(message){
    if(!ui.frame.contentWindow)return;
    if(message.type!=='menu-input')traceProtocol('child-out',message.type,{connected:message.connected});
    ui.frame.contentWindow.postMessage({source:'football-legacy-online-parent',...message},TARGET_ORIGIN);
  }
  function flushChildMessages(){if(childReady)latestChildMessages.splice(0).forEach(childSend)}
  function queueChild(message){latestChildMessages.push(message);flushChildMessages()}
  function loadLobby(){
    showOnly(ui.stage);
    ui.guestStage.hidden=true;
    ui.frame.hidden=false;
    ui.networkRole.textContent=role==='host'?'Home · Host':'Away · Guest';
    ui.networkLatency.textContent=role==='host'?`Room ${roomCode}`:'Private peer link';
    childReady=false;
    ui.frame.src=`../quick-play/index.html?mode=online&onlineRole=${role}&room=${encodeURIComponent(roomCode)}&build=171-code-verification-1`;
    ui.frame.onload=()=>{
      try{ui.frame.focus()}catch{}
    };
  }
  function rejectConnection(conn){try{conn.close()}catch{}}
  function acceptConnection(conn){
    if(!conn)return;
    if(role==='host'){
      const metadata=conn.metadata||{};
      if(metadata.protocol!==PROTOCOL||metadata.build!==BUILD||metadata.role!=='guest'){
        rejectConnection(conn);
        return;
      }
    }
    if(connection&&connection!==conn&&(connection.open||connectionPending)){
      const existingHealthy=connection.open&&Date.now()-lastPongAt<9000;
      if(connectionPending||existingHealthy){rejectConnection(conn);return}
      const stale=connection;
      connection=null;
      try{stale.close()}catch{}
    }
    connection=conn;
    connectionPending=true;
    // Each accepted DataConnection owns its own disconnect cycle. A replacement
    // can fail before `open`, so do not inherit the previous connection's guard.
    disconnectHandled=false;
    opponentPeer=conn.peer;
    setConnection('connecting','Joining room');
    conn.on('open',()=>{
      if(conn!==connection){rejectConnection(conn);return}
      connectionPending=false;
      disconnectHandled=false;
      connectionEpoch+=1;
      latestRemoteInputSeq=-1;
      lastPongAt=Date.now();
      traceProtocol('connection','open',{peer:conn.peer});
      setConnection('connected','Opponent connected');
      if(ui.stage.hidden)loadLobby();
      queueChild({type:'connection',connected:true,role,roomCode,connectionEpoch});
      send({type:'hello',role,roomCode});
      startHeartbeat();
    });
    conn.on('data',message=>{if(conn===connection)handleNetworkMessage(message)});
    conn.on('close',()=>handleDisconnect(conn));
    conn.on('error',()=>handleDisconnect(conn));
  }
  function startHost(retry=false){
    role='host';
    roomCode=retry?randomCode():roomCode||randomCode();
    showOnly(ui.waiting);
    ui.waitingEyebrow.textContent='Home slot';
    ui.waitingTitle.textContent='Creating room';
    ui.waitingCopy.textContent='Your room code will stay on this screen until Away connects and both machines verify the same room.';
    ui.roomCodeBlock.hidden=false;
    ui.roomCode.textContent=roomCode;
    setConnection('connecting','Opening room');
    try{peer&&peer.destroy()}catch{}
    peer=createPeer(peerIdFor(roomCode));
    if(!peer)return;
    peer.on('open',()=>{
      setConnection('connecting','Waiting for Away');
      ui.waitingTitle.textContent='Waiting for Away';
      ui.waitingCopy.textContent='Send the join link to Away. This code will remain visible until the connection is verified.';
    });
    peer.on('connection',acceptConnection);
  }
  function connectGuest(){
    if(!peer||peer.destroyed||connectionPending||(connection&&connection.open))return;
    setConnection('connecting','Finding host');
    const conn=peer.connect(peerIdFor(roomCode),{reliable:true,serialization:'json',metadata:{protocol:PROTOCOL,build:BUILD,role:'guest'}});
    acceptConnection(conn);
  }
  function startGuest(code){
    role='guest';
    roomCode=cleanCode(code);
    if(roomCode.replace('-','').length!==10){
      ui.roomInput.setCustomValidity('Enter the full ten-character room code.');
      ui.roomInput.reportValidity();
      return;
    }
    ui.roomInput.setCustomValidity('');
    showOnly(ui.waiting);
    ui.roomCodeBlock.hidden=false;
    ui.roomCode.textContent=roomCode;
    ui.waitingEyebrow.textContent='Away slot';
    ui.waitingTitle.textContent='Verifying '+roomCode;
    ui.waitingCopy.textContent='Checking the Home player, room code and game build. Team selection will open only after the connection is verified.';
    setConnection('connecting','Opening connection');
    peer=createPeer();
    if(!peer)return;
    peer.on('open',connectGuest);
  }
  function handleDisconnect(source){
    if(source&&source!==connection)return;
    if(disconnectHandled)return;
    disconnectHandled=true;
    connectionPending=false;
    clearInterval(heartbeatTimer);
    heartbeatTimer=null;
    if(connection===source||!source)connection=null;
    setConnection('lost','Opponent disconnected');
    traceProtocol('connection','closed',{peer:source&&source.peer});
    if(pendingLaunch){clearInterval(launchTimer);launchTimer=null;pendingLaunch=null;queueChild({type:'launch-failed',reason:'connection-lost'})}
    proposedGuestLaunch=null;
    acceptedGuestLaunch=null;
    queueChild({type:'connection',connected:false,role,roomCode,connectionEpoch});
    if(role==='host')forwardRemoteInput(null);
    if(matchStarted){
      fail('Match connection lost','This Online beta cannot safely resume a match after the peer link closes. Return to Online Versus and create a new room.');
      return;
    }
    showOnly(ui.waiting);
    ui.roomCodeBlock.hidden=false;
    ui.roomCode.textContent=roomCode;
    if(role==='host'){
      ui.waitingEyebrow.textContent='Home slot';
      ui.waitingTitle.textContent='Away disconnected';
      ui.waitingCopy.textContent='The room code remains valid. This screen will stay here until Away reconnects and the peer link is verified again.';
      setConnection('connecting','Waiting for Away');
      return;
    }
    ui.waitingEyebrow.textContent='Away slot';
    ui.waitingTitle.textContent='Reconnecting '+roomCode;
    ui.waitingCopy.textContent='Keeping the room code visible while the connection to Home is restored.';
    reconnectDeadline=Date.now()+20000;
    clearInterval(reconnectTimer);
    reconnectTimer=setInterval(()=>{
      if(connection&&connection.open){clearInterval(reconnectTimer);reconnectTimer=null;return}
      if(Date.now()>reconnectDeadline){clearInterval(reconnectTimer);reconnectTimer=null;fail('The room closed','Ask the host for a new room code.');return}
      connectGuest();
    },1800);
  }
  function startHeartbeat(){
    lastPongAt=Date.now();
    clearInterval(heartbeatTimer);
    heartbeatTimer=setInterval(()=>{
      const now=Date.now();
      if(lastPongAt&&now-lastPongAt>24000){
        const active=connection;
        handleDisconnect(active);
        try{active&&active.close()}catch{}
        return;
      }
      if(!connection||!connection.open)return;
      lastPingAt=now;
      send({type:'ping',sentAt:lastPingAt});
    },2000);
  }
  function validLaunch(message){return!!(message&&typeof message.launchId==='string'&&message.launchId.length>5&&typeof message.lobbyVersion==='string'&&message.lobbyVersion&&typeof message.configRevision==='string'&&message.configRevision)}
  function clearLaunchHandshake(){clearInterval(launchTimer);launchTimer=null;pendingLaunch=null}
  function launchPacket(type,data){return{type,launchId:data.launchId,lobbyVersion:data.lobbyVersion,configRevision:data.configRevision,homeName:data.homeName||'HOME',awayName:data.awayName||'AWAY'}}
  function transmitPendingLaunch(){
    if(!pendingLaunch)return;
    // A proposal is still safe to abandon: Away has not committed to entering
    // the match. Once the commit phase begins we must keep retrying until the
    // reliable peer link confirms it (or the connection itself closes), because
    // cancelling a delivered commit could start only one player.
    if(pendingLaunch.phase==='proposal'&&Date.now()-pendingLaunch.startedAt>12000){
      traceProtocol('launch','timeout',{launchId:pendingLaunch.launchId,phase:pendingLaunch.phase});
      const cancelled={...pendingLaunch};
      send(launchPacket('launch-cancel',cancelled));
      clearLaunchHandshake();
      queueChild({type:'launch-failed',reason:'opponent-did-not-confirm'});
      return;
    }
    send(launchPacket(pendingLaunch.phase==='proposal'?'launch-proposal':'launch-commit',pendingLaunch));
  }
  function beginHostLaunch(message){
    if(role!=='host'||matchStarted||!validLaunch(message)||!connection||!connection.open){queueChild({type:'launch-failed',reason:'connection-not-ready'});return}
    if(pendingLaunch&&pendingLaunch.launchId===message.launchId){transmitPendingLaunch();return}
    clearLaunchHandshake();
    pendingLaunch={...message,phase:'proposal',startedAt:Date.now()};
    traceProtocol('launch','proposal-started',{launchId:pendingLaunch.launchId,lobbyVersion:pendingLaunch.lobbyVersion,configRevision:pendingLaunch.configRevision});
    transmitPendingLaunch();
    launchTimer=setInterval(transmitPendingLaunch,500);
  }
  function acknowledgeHostLaunch(message){
    if(!pendingLaunch||pendingLaunch.phase!=='proposal'||message.launchId!==pendingLaunch.launchId||message.lobbyVersion!==pendingLaunch.lobbyVersion||message.configRevision!==pendingLaunch.configRevision)return;
    pendingLaunch.phase='commit';
    traceProtocol('launch','proposal-acknowledged',{launchId:pendingLaunch.launchId});
    transmitPendingLaunch();
  }
  function rejectHostLaunch(message){
    if(!pendingLaunch||message.launchId!==pendingLaunch.launchId)return;
    traceProtocol('launch','proposal-rejected',{launchId:pendingLaunch.launchId});
    clearLaunchHandshake();
    queueChild({type:'peer-message',message});
  }
  function cancelLocalLaunch(message){
    if(!message||!message.launchId)return;
    if(role==='host'&&pendingLaunch&&pendingLaunch.launchId===message.launchId){traceProtocol('launch','host-cancelled',{launchId:message.launchId});clearLaunchHandshake()}
    if(role==='guest'){
      if(proposedGuestLaunch&&proposedGuestLaunch.launchId===message.launchId)proposedGuestLaunch=null;
      if(acceptedGuestLaunch&&acceptedGuestLaunch.launchId===message.launchId)acceptedGuestLaunch=null;
    }
  }
  function commitGuestLaunch(message){
    if(role!=='guest'||!validLaunch(message))return;
    if(launchCommitted===message.launchId){send(launchPacket('launch-committed',message));return}
    if(!acceptedGuestLaunch||message.launchId!==acceptedGuestLaunch.launchId||message.lobbyVersion!==acceptedGuestLaunch.lobbyVersion||message.configRevision!==acceptedGuestLaunch.configRevision)return;
    const launch={...acceptedGuestLaunch,...message};
    launchCommitted=message.launchId;
    traceProtocol('launch','guest-committed',{launchId:launchCommitted});
    send(launchPacket('launch-committed',launch));
    startGuestMatch(launch);
  }
  function completeHostLaunch(message){
    if(role!=='host'||!pendingLaunch||pendingLaunch.phase!=='commit'||message.launchId!==pendingLaunch.launchId||message.lobbyVersion!==pendingLaunch.lobbyVersion||message.configRevision!==pendingLaunch.configRevision)return;
    const launch={...pendingLaunch};
    launchCommitted=launch.launchId;
    traceProtocol('launch','host-committed',{launchId:launchCommitted});
    clearLaunchHandshake();
    startHostMatch(launch);
  }
  function handleNetworkMessage(message){
    if(!message||message.protocol!==PROTOCOL)return;
    if(message.build!==BUILD){
      const active=connection;
      fail('Different game versions','Both players must open build 171 of Football Legacy.');
      try{active&&active.close()}catch{}
      return;
    }
    lastPongAt=Date.now();
    if(!['ping','pong','input','view'].includes(message.type))traceProtocol('peer-in',message.type,{revision:message.revision,side:message.side,launchId:message.launchId});
    if(message.type==='ping'){send({type:'pong',sentAt:message.sentAt});return}
    if(message.type==='pong'){
      latencyMs=Math.max(0,Math.round((Date.now()-Number(message.sentAt||Date.now()))/2));
      ui.networkLatency.textContent=`${latencyMs} ms · direct peer link`;
      return;
    }
    if(message.type==='media-playing'&&role==='host'&&matchStarted){setConnection('connected','Online match live');return}
    if(message.type==='input'&&role==='host'&&matchStarted){
      const sequence=Number(message.seq);
      if(!Number.isInteger(sequence)||sequence<=latestRemoteInputSeq)return;
      latestRemoteInputSeq=sequence;
      forwardRemoteInput(message.pad);
      return;
    }
    if(message.type==='view'&&role==='guest'&&matchStarted){renderRemoteView(message.view);return}
    if(message.type==='launch-proposal'&&role==='guest'&&!matchStarted){proposedGuestLaunch={...message};queueChild({type:'peer-message',message});return}
    if(message.type==='launch-ack'&&role==='host'&&!matchStarted){acknowledgeHostLaunch(message);return}
    if(message.type==='launch-reject'&&role==='host'&&!matchStarted){rejectHostLaunch(message);return}
    if(message.type==='launch-cancel'){
      cancelLocalLaunch(message);
      if(role==='host')queueChild({type:'launch-failed',reason:message.reason||'lobby-changed'});
      else queueChild({type:'peer-message',message});
      return;
    }
    if(message.type==='launch-commit'&&role==='guest'){
      if(launchCommitted===message.launchId)send(launchPacket('launch-committed',message));
      else queueChild({type:'peer-message',message});
      return;
    }
    if(message.type==='launch-committed'&&role==='host'){completeHostLaunch(message);return}
    queueChild({type:'peer-message',message});
  }
  function forwardRemoteInput(pad){
    try{ui.frame.contentWindow&&ui.frame.contentWindow.postMessage({source:'football-legacy-online-parent',type:'remote-input',pad,receivedAt:performance.now()},TARGET_ORIGIN)}catch{}
  }
  function serialisePad(gamepad){
    if(!gamepad)return null;
    return{
      index:99,
      id:String(gamepad.id||'Remote standard gamepad').slice(0,160),
      mapping:String(gamepad.mapping||''),
      connected:true,
      axes:Array.from(gamepad.axes||[]).slice(0,10).map(value=>Math.max(-1,Math.min(1,Number(value)||0))),
      buttons:Array.from(gamepad.buttons||[]).slice(0,20).map(button=>({pressed:!!(button&&button.pressed),value:Math.max(0,Math.min(1,Number(button&&button.value)||0))}))
    };
  }
  function updateGuestNetworkStatus(){
    if(role!=='guest'||!connection||!connection.open)return;
    if(!guestPadConnected)ui.networkStatus.textContent='Connect Away controller';
    else if(hostSeesAwayController===false)ui.networkStatus.textContent='Away input reaching host…';
    else if(videoPlaying&&remoteAudioMuted)ui.networkStatus.textContent='Live · match sound muted from pause menu';
    else if(videoPlaying&&!remoteAudioTrack)ui.networkStatus.textContent='Live video · host audio unavailable';
    else if(videoPlaying&&!remoteAudioReady)ui.networkStatus.textContent='Live · host must click Enable match sound';
    else if(videoPlaying)ui.networkStatus.textContent='Away controller connected';
    else ui.networkStatus.textContent='Controller ready · waiting for video';
  }
  function pollGuestInput(now){
    let gamepad=null;
    try{gamepad=Array.from(navigator.getGamepads?navigator.getGamepads()||[]:[]).find(Boolean)||null}catch{}
    const pad=serialisePad(gamepad);
    if(role&&!matchStarted&&childReady&&!ui.frame.hidden){
      childSend({type:'menu-input',pad,connected:!!gamepad,peerConnected:!!(connection&&connection.open),connectionEpoch,role,roomCode,sentAt:now});
    }
    if(role==='guest'&&matchStarted&&connection&&connection.open){
      guestPadConnected=!!gamepad;
      const json=JSON.stringify(pad);
      if(json!==lastInputJson||now-lastInputSentAt>90){
        lastInputJson=json;
        lastInputSentAt=now;
        send({type:'input',seq:++inputFrame,pad});
      }
      updateGuestNetworkStatus();
    }
    requestAnimationFrame(pollGuestInput);
  }
  function startHostMatch(message){
    if(matchStarted)return;
    if(!connection||!connection.open){
      queueChild({type:'connection',connected:false,role,roomCode,connectionEpoch});
      return;
    }
    matchStarted=true;
    childReady=false;
    matchHomeName=message.homeName||'HOME';
    matchAwayName=message.awayName||'AWAY';
    ui.frame.src=appendOnlineParams(message.href,'host');
    ui.frame.hidden=false;
    ui.guestStage.hidden=true;
    ui.networkRole.textContent='Home · Host';
    setConnection('connecting','Match running · opening Away video');
    ui.frame.onload=()=>beginHostStream();
  }
  function appendOnlineParams(href,side){
    const hashIndex=href.indexOf('#');
    const hash=hashIndex>=0?href.slice(hashIndex):'';
    const base=hashIndex>=0?href.slice(0,hashIndex):href;
    const separator=base.includes('?')?'&':'?';
    return`${base}${separator}onlineRole=${side}&onlineRoom=${encodeURIComponent(roomCode)}&onlineBuild=${BUILD}${hash}`;
  }
  function beginHostStream(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      try{
        const win=ui.frame.contentWindow;
        if(!win||!win.FLMatch||typeof win.FLMatch.getOnlineStream!=='function')throw new Error('Match loading');
        clearInterval(timer);
        const stream=win.FLMatch.getOnlineStream(45);
        if(!stream.getVideoTracks().length)throw new Error('Match video track unavailable');
        const audioState=typeof win.FLMatch.getAudioState==='function'?win.FLMatch.getAudioState():null;
        if(audioState&&audioState.requestedPercent>0&&!stream.getAudioTracks().length)throw new Error('Match audio track unavailable');
        mediaCall=peer.call(opponentPeer,stream,{metadata:{protocol:PROTOCOL,build:BUILD,roomCode,homeName:matchHomeName,awayName:matchAwayName}});
        if(!mediaCall)throw new Error('Video call could not be created');
        mediaCall.on('error',()=>fail('Match video failed','Return to Online Versus and create a new room.'));
        setConnection('connecting','Match running · waiting for Away video');
        clearInterval(hostViewTimer);
        hostViewTimer=setInterval(()=>{
          try{send({type:'view',view:win.FLMatch.getOnlineViewState()})}catch{}
        },100);
      }catch(error){
        if(attempts>80){clearInterval(timer);fail('Match stream did not start','Reload the room and try again.')}
      }
    },125);
  }
  function startGuestMatch(message={}){
    if(matchStarted)return;
    matchStarted=true;
    videoPlaying=false;
    hostSeesAwayController=null;
    ui.frame.hidden=true;
    ui.guestStage.hidden=false;
    ui.videoGate.hidden=true;
    ui.networkRole.textContent='Away · Guest';
    ui.guestMessage.innerHTML='<strong>Host is starting the match</strong><span>The live pitch will appear here.</span>';
    ui.guestMessage.hidden=false;
    setText('remoteHomeName',message.homeName||'HOME');
    setText('remoteAwayName',message.awayName||'AWAY');
    setConnection('connecting','Waiting for host video');
  }
  function renderRemoteView(view){
    if(!view)return;
    setText('remoteHomeScore',view.score?.you??0);
    setText('remoteAwayScore',view.score?.opp??0);
    setText('remoteClock',view.clock||'00:00');
    hostSeesAwayController=view.connectedController!==false;
    remoteAudioMuted=!!view.audio?.explicitlyMuted;
    remoteAudioReady=!!view.audio?.unlocked&&view.audio?.context==='running';

    const power=view.awayPower||{};
    ui.remotePlayerCard.hidden=!power.visible;
    ui.remotePlayerCard.classList.toggle('charging',!!power.charging);
    setText('remotePlayerNumber',power.number??'–');
    setText('remotePlayerSide',power.side||matchAwayName||'Away');
    setText('remotePlayerName',power.name||'No footballer');
    setText('remotePlayerAction',power.action||'Ready');
    ui.remotePowerFill.style.width=`${Math.max(0,Math.min(100,Number(power.power)||0))}%`;
    ui.remotePowerIdeal.hidden=!Number.isFinite(power.ideal);
    if(Number.isFinite(power.ideal))ui.remotePowerIdeal.style.left=`calc(${Math.max(0,Math.min(100,power.ideal))}% - 1px)`;

    const event=view.event||{};
    ui.remoteEvent.hidden=!event.visible;
    ui.remoteEvent.textContent=event.text||'';

    const official=view.official||{};
    ui.remoteOfficial.hidden=!official.visible;
    ui.remoteOfficial.dataset.card=official.card||'none';
    setText('remoteOfficialDecision',official.decision||'Referee decision');
    setText('remoteOfficialHeadline',official.headline||'');
    setText('remoteOfficialDetail',official.detail||'');

    const videoReview=view.var||{};
    ui.remoteVar.hidden=!videoReview.visible;
    setText('remoteVarLabel',videoReview.label||'VAR checking');
    setText('remoteVarHeadline',videoReview.headline||'');
    setText('remoteVarDetail',videoReview.detail||'');

    const setPiece=view.setPiece||{};
    ui.remoteSetPiece.hidden=!(setPiece.clockVisible||setPiece.hintVisible);
    setText('remoteSetPieceClock',setPiece.clockVisible?setPiece.clock:'');
    setText('remoteSetPieceHint',setPiece.hintVisible?setPiece.hint:'');

    const overlay=view.overlay;
    ui.remoteStateOverlay.hidden=!overlay;
    if(overlay){
      setText('remoteOverlayTitle',overlay.title||'Match paused');
      setText('remoteOverlayScore',overlay.score||'');
      setText('remoteOverlayMessage',overlay.message||'');
    }
    updateGuestNetworkStatus();
  }
  function markVideoLive(){
    const firstPlay=!videoPlaying;
    videoPlaying=true;
    ui.guestMessage.hidden=true;
    ui.videoGate.hidden=!ui.video.muted;
    setConnection('connected',ui.video.muted?'Video live · enable sound':'Online match live');
    if(firstPlay)send({type:'media-playing'});
    updateGuestNetworkStatus();
  }
  async function playGuestVideo(){
    ui.video.muted=false;
    try{
      await ui.video.play();
      if(!ui.video.paused)markVideoLive();
    }catch{
      ui.video.muted=true;
      try{await ui.video.play()}catch{}
      ui.videoGate.hidden=false;
      ui.guestMessage.innerHTML='<strong>Match video is ready</strong><span>Your browser needs one click before it can play the match sound.</span>';
      ui.guestMessage.hidden=false;
      setConnection('connecting','Click to enable match sound');
    }
  }
  function handleMediaCall(call){
    const metadata=call&&call.metadata||{};
    if(role!=='guest'||metadata.protocol!==PROTOCOL||metadata.build!==BUILD||cleanCode(metadata.roomCode)!==roomCode){
      try{call.close()}catch{}
      if(role==='guest')fail('Rejected match video','The incoming video did not match this room and build.');
      return;
    }
    if(!matchStarted)startGuestMatch(metadata);
    if(mediaCall&&mediaCall!==call){try{mediaCall.close()}catch{}}
    mediaCall=call;
    call.answer();
    call.on('stream',stream=>{
      remoteAudioTrack=stream.getAudioTracks().length>0;
      ui.video.srcObject=stream;
      ui.video.addEventListener('playing',markVideoLive,{once:true});
      playGuestVideo();
    });
    call.on('error',()=>fail('Match video failed','Return to Online Versus and create a new room.'));
    call.on('close',()=>{
      if(matchStarted)fail('Match video interrupted','This Online beta cannot safely resume the video stream. Return to Online Versus and create a new room.');
    });
  }

  addEventListener('message',event=>{
    if(event.source!==ui.frame.contentWindow||!validMessageOrigin(event))return;
    const data=event.data;
    if(!data||data.source!=='football-legacy-online-child')return;
    if(data.type==='child-ready'){
      childReady=true;
      traceProtocol('child-in','child-ready');
      queueChild({type:'connection',connected:!!(connection&&connection.open),role,roomCode,connectionEpoch});
      return;
    }
    if(data.type==='send'){
      traceProtocol('child-in',data.message&&data.message.type||'send');
      if(role==='guest'&&data.message&&data.message.type==='launch-ack'&&validLaunch(data.message)&&proposedGuestLaunch&&data.message.launchId===proposedGuestLaunch.launchId)acceptedGuestLaunch={...proposedGuestLaunch};
      if(data.message&&data.message.type==='launch-cancel')cancelLocalLaunch(data.message);
      if(role==='guest'&&data.message&&data.message.type==='launch-commit-ack'&&validLaunch(data.message)){commitGuestLaunch(data.message);return}
      send(data.message);
      return;
    }
    if(data.type==='launch-request'&&role==='host')beginHostLaunch(data);
  });
  $('hostButton').addEventListener('click',()=>startHost());
  $('showJoinButton').addEventListener('click',()=>{ui.joinForm.hidden=false;ui.roomInput.focus()});
  ui.joinForm.addEventListener('submit',event=>{event.preventDefault();startGuest(ui.roomInput.value)});
  ui.roomInput.addEventListener('input',()=>{
    const position=ui.roomInput.selectionStart;
    ui.roomInput.value=cleanCode(ui.roomInput.value);
    try{ui.roomInput.setSelectionRange(position,position)}catch{}
  });
  function roomInviteUrl(){const url=new URL('index.html',location.href);url.search='';url.hash='';url.searchParams.set('join',roomCode);return url.href}
  $('copyCode').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(roomInviteUrl());$('copyCode').textContent='Join link copied'}catch{$('copyCode').textContent='Select the code above'}
  });
  ui.videoGate.addEventListener('click',playGuestVideo);
  $('cancelButton').addEventListener('click',reset);
  $('retryButton').addEventListener('click',reset);
  addEventListener('beforeunload',()=>{clearTimers();try{connection&&connection.close()}catch{}try{mediaCall&&mediaCall.close()}catch{}try{peer&&peer.destroy()}catch{}});

  const invitedRoom=cleanCode(new URLSearchParams(location.search).get('join'));
  if(invitedRoom.replace('-','').length===10){ui.joinForm.hidden=false;ui.roomInput.value=invitedRoom;ui.roomInput.focus()}

  requestAnimationFrame(pollGuestInput);
})();
