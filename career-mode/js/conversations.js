window.FLConversations = (() => {
  const VERSION = 3;
  const DAY = 86400000;
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
  const hash=text=>window.FLPeople?.hash?FLPeople.hash(text):(()=>{let h=2166136261;for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0})();
  const pick=(arr,seed)=>arr[Math.abs(Number(seed)||0)%Math.max(1,arr.length)];
  const safe=v=>Array.isArray(v)?v:[];
  const yearOf=g=>Number(String(g?.date||'1888').slice(0,4))||1888;
  const addDays=(date,days)=>new Date(new Date(`${date}T12:00:00Z`).getTime()+days*DAY).toISOString().slice(0,10);
  const disposition=value=>Number(value)>=67?'up':Number(value)<38?'down':'mid';
  const eraWord=(game,early,mid,modern)=>yearOf(game)<1930?early:yearOf(game)<1985?mid:modern;
  const controlled=game=>(game.clubs||[]).find(c=>c.id===game.controlledClubId)||null;
  const clubById=(game,id)=>(game.clubs||[]).find(c=>c.id===id)||(game.competitionClubs||[]).find(c=>c.id===id)||null;
  const managerName=game=>`${game.manager?.firstName||'Club'} ${game.manager?.lastName||'Manager'}`.trim();
  const cleanGroup=group=>({journalists:'press',fans:'supporters',manager:'rivals'}[group]||group||'contacts');

  const PLAYER_TOPICS={
    praise:{situation:'praisedInPublic',label:'Praise',memory:'private-praise'},
    'check-in':{situation:'returnsFromInjury',label:'Check-in',memory:'manager-check-in'},
    role:{situation:'droppedFromTeam',label:'Playing role',memory:'role-discussion'},
    standards:{situation:'criticisedInPublic',label:'Standards',memory:'private-criticism'},
    transfer:{situation:'wantsTransfer',label:'Transfer request',memory:'transfer-discussion'},
    captaincy:{situation:'madeCaptain',label:'Captaincy',memory:'captaincy-discussion'},
    contract:{situation:'contractConcern',label:'Contract',memory:'contract-discussion'},
    injury:{situation:'returnsFromInjury',label:'Injury support',memory:'injury-support'},
    promise:{situation:'brokenPromise',label:'Broken promise',memory:'broken-promise'}
  };

  const FALLBACK_PERSONAS={
    family:[
      {id:'supportive',label:'Supportive but honest',voice:'Warm, practical and protective of life outside football.'},
      {id:'independent',label:'Independent-minded',voice:'Values an identity and career outside the manager’s job.'},
      {id:'anxious',label:'Concerned realist',voice:'Not opposed to football, but notices the cost of every decision.'},
      {id:'adventurous',label:'Adventurous partner',voice:'Open to change and willing to take risks for a shared future.'}
    ],
    agents:[
      {id:'negotiator',label:'Hard negotiator',voice:'Treats every conversation as leverage.'},
      {id:'protector',label:'Player-first representative',voice:'Protective of the client and suspicious of vague promises.'},
      {id:'operator',label:'Quiet operator',voice:'Measured, connected and always aware of the market.'},
      {id:'showman',label:'Public operator',voice:'Loud, media-aware and willing to create pressure.'}
    ],
    officials:[
      {id:'procedural',label:'Procedural official',voice:'Formal, rules-led and resistant to emotion.'},
      {id:'strict',label:'Strict disciplinarian',voice:'Direct and unimpressed by excuses.'},
      {id:'conciliatory',label:'Conciliatory official',voice:'Wants disputes solved before they become public.'},
      {id:'political',label:'Political administrator',voice:'Careful, diplomatic and alert to institutional pressure.'}
    ],
    legends:[
      {id:'traditionalist',label:'Club traditionalist',voice:'Judges everything against the club’s history and values.'},
      {id:'warm',label:'Supportive club elder',voice:'Encouraging, sentimental and protective of the club.'},
      {id:'demanding',label:'Demanding former great',voice:'Believes standards are inherited, not negotiated.'},
      {id:'independent',label:'Independent former player',voice:'Respects the club but refuses to flatter the current regime.'}
    ]
  };

  const GROUP_TOPICS={
    board:['results','budget','ambition','contract','facilities','transfers'],
    staff:['tactics','selection','training','recruitment','role','future'],
    press:['result','selection','transfer','board','rival','job'],
    supporters:['style','results','identity','rivals','ownership','youth'],
    rivals:['respect','feud','tactics','title-race','transfer','touchline'],
    family:['workload','move','money','home','retirement','succession'],
    agents:['client-role','contract','transfer','promise'],
    officials:['discipline','complaint','rules','postponement'],
    legends:['standards','history','supporters','youth']
  };

  const TOPIC_LABELS={
    results:'Results and pressure',budget:'Budget and resources',ambition:'Club ambition',contract:'Your contract',facilities:'Facilities',transfers:'Transfer policy',
    tactics:'Tactical plan',selection:'Team selection',training:'Training standards',recruitment:'Recruitment',role:'Staff role',future:'Future plans',
    result:'The latest result',transfer:'Transfer business',board:'The board',rival:'A rival manager',job:'Your future',style:'Style of play',identity:'Club identity',rivals:'The derby',ownership:'Ownership',youth:'Local youth',
    respect:'Mutual respect',feud:'The feud', 'title-race':'The title race',touchline:'Touchline conduct',workload:'Work-life balance',move:'A possible move',money:'Money and security',home:'Life at home',retirement:'Retirement',succession:'Succession',
    'client-role':'A client’s role',promise:'A promise',discipline:'Discipline',complaint:'A formal complaint',rules:'Competition rules',postponement:'A postponement',standards:'Club standards',history:'Club history',supporters:'Supporters'
  };

  function ensure(game){
    game.conversations=game.conversations&&typeof game.conversations==='object'?game.conversations:{};
    const s=game.conversations;
    s.version=VERSION;
    s.people=s.people&&typeof s.people==='object'?s.people:{};
    s.threads=safe(s.threads).slice(0,350);
    s.memories=safe(s.memories).slice(0,1400);
    s.pressQuotes=safe(s.pressQuotes).slice(0,300);
    s.promises=safe(s.promises).slice(0,300);
    s.topicHistory=safe(s.topicHistory).slice(0,500);
    s.requests=safe(s.requests).slice(0,40);
    s.lastRequestDate=s.lastRequestDate||null;
    return s;
  }

  function personRecord(game,group,person){
    group=cleanGroup(group);
    if(!window.FLPeople)return null;
    if(group==='players')return FLPeople.ensurePlayer(game,person,(game.clubs||[]).find(c=>(c.players||[]).includes(person)));
    if(group==='staff')return FLPeople.ensureStaff(game,person,'staff');
    const name=person?.name||person?.label||`${group} contact`,parts=String(name).trim().split(/\s+/);
    return FLPeople.create(game,{id:person?.personId||`contact-${group}-${person?.id||hash(name)}`,firstName:parts[0]||group,lastName:parts.slice(1).join(' '),gender:window.FLPeople?FLPeople.inferGender(name,person?.gender):(person?.gender||'male'),birthYear:person?.birthYear||yearOf(game)-(person?.age||45),nationality:person?.nationality||'English',footballRoles:[group],currentRole:person?.role||group,reputation:person?.label||person?.role||group,roleLinks:{contactId:person?.id||null,clubId:person?.clubId||null,clientId:person?.clientId||null}});
  }

  function persona(game,group,person){
    group=cleanGroup(group);
    const s=ensure(game),canonical=personRecord(game,group,person),id=canonical?.id||person?.id||`${group}-${person?.name||'unknown'}`,key=`${group}:${id}`;
    if(s.people[key])return s.people[key];
    const voiceGroup=group==='supporters'?'fans':group==='rivals'?'manager':group;
    const options=window.FLVoices?.personas?.[voiceGroup]||FALLBACK_PERSONAS[group]||[];
    const selected=options.length?pick(options,hash(`${game.meta?.worldSeed||game.meta?.seed||1}-${key}`)):{id:'balanced',label:'Measured',voice:'Measured and direct.'};
    const relationship=canonical&&window.FLPeople?FLPeople.relationship(game,game.people?.managerPersonId,canonical.id):50;
    return s.people[key]={key,group,personId:id,personaId:selected.id,label:selected.label,voice:selected.voice,relationship,created:game.date,lastConversation:null,conversations:0};
  }

  function recentMemories(game,personId,limit=4){return ensure(game).memories.filter(m=>m.personId===personId).slice(0,limit);}
  function allThreadsFor(game,personId){return ensure(game).threads.filter(t=>t.personId===personId);}

  function playerContext(game,player,topic,profile){
    const dressing=player.dressingRoom||{},trust=Number(dressing.managerTrust??profile.relationship??50),happiness=Number(dressing.happiness??50),age=Number(player.age)||22,memories=recentMemories(game,player.personId||player.id,5),broken=(game.dressingRoom?.promises||[]).filter(p=>p.playerId===player.id&&p.status==='broken').length;
    return {trust,happiness,age,memories,broken,persona:profile.personaId,squadStatus:player.squadStatus||'First Team',starts:Number(player.starts)||0,apps:Number(player.appearances)||0,topic};
  }

  function playerOpening(game,player,topic,profile,ctx){
    const spec=PLAYER_TOPICS[topic]||PLAYER_TOPICS['check-in'],voice=window.FLVoices?.pick?.('players',spec.situation,disposition((ctx.trust+ctx.happiness)/2),profile.personaId,yearOf(game));
    if(voice)return voice;
    if(topic==='role')return eraWord(game,'I had hoped for a larger part in the eleven, sir.','I need games, boss. I need to know where I stand.','I need clarity. Am I genuinely part of the plan?');
    if(topic==='transfer')return eraWord(game,'I wish to discuss the possibility of moving elsewhere.','I think I need a fresh start, gaffer.','My representatives believe I need a move. I want to hear your position.');
    if(topic==='contract')return eraWord(game,'My terms are due for discussion, sir.','We need to sort my deal, boss.','My contract situation is becoming a problem.');
    if(topic==='promise'||ctx.broken)return eraWord(game,'You gave me your word, sir.','You promised me, boss.','You made a commitment and it has not happened.');
    if(topic==='praise')return eraWord(game,'That is very kind of you, sir. I shall repay the confidence.','Thanks, boss. Means a lot.','Appreciate it. I want to keep building.');
    return eraWord(game,'I am well, thank you. I only wish to be useful to the eleven.','I’m alright, gaffer. Just tell me straight.','I’m okay. I would rather have an honest conversation than guess.');
  }

  function playerFirstChoices(game,topic,ctx){
    const formal=yearOf(game)<1930;
    if(topic==='role')return [
      {id:'support',label:formal?'“You have my confidence. Your opportunity will come.”':'“You are part of the plan. Keep working and your chance will come.”',tone:'supportive'},
      {id:'honest',label:'“At present, others are performing better. That is the honest answer.”',tone:'honest'},
      {id:'review-role',label:'“I will review your role after the next three competitive matches.”',tone:'measured'},
      {id:'no-promise',label:'“I will be fair, but I will not promise minutes you have not earned.”',tone:'firm'}
    ];
    if(topic==='transfer')return [
      {id:'offer-path',label:'“Give me a month. I will show you a clear route back into the side.”',tone:'constructive'},
      {id:'honest',label:'“I understand why you are considering a move. Your concern is reasonable.”',tone:'honest'},
      {id:'open-transfer',label:'“I will not force you to stay. We will consider a suitable offer.”',tone:'pragmatic'},
      {id:'firm',label:'“You are under contract and remain important to the club.”',tone:'firm'}
    ];
    if(topic==='promise'||ctx.broken)return [
      {id:'apologise',label:'“You are right. I made a commitment and I have not kept it.”',tone:'accountable'},
      {id:'clarify',label:'“The circumstances changed, but I should have explained that sooner.”',tone:'honest'},
      {id:'promise',label:'“I will replace the old promise with one clear commitment and a deadline.”',tone:'committing'},
      {id:'challenge',label:'“A promise does not remove your responsibility to perform.”',tone:'confrontational'}
    ];
    if(topic==='praise')return [
      {id:'support',label:'“You have earned the praise. Your standards have lifted the team.”',tone:'supportive'},
      {id:'honest',label:'“You have improved, but there is still another level available to you.”',tone:'honest'},
      {id:'offer-path',label:'“Keep this level and I will give you greater responsibility.”',tone:'committing'},
      {id:'firm',label:'“Enjoy the praise, then return to work. One good spell is not enough.”',tone:'demanding'}
    ];
    return [
      {id:'support',label:'“I wanted to check on you. You have my support.”',tone:'supportive'},
      {id:'honest',label:'“Tell me plainly what is bothering you and I will answer honestly.”',tone:'honest'},
      {id:'clarify',label:'“Let us agree exactly what you need from me and what I need from you.”',tone:'practical'},
      {id:'firm',label:'“I will listen, but the standards of the team still come first.”',tone:'firm'}
    ];
  }

  function playerSecondChoices(topic){
    if(topic==='role')return [
      {id:'promise',label:'“You will receive meaningful minutes within the next six weeks.”',tone:'committing'},
      {id:'offer-path',label:'“We will set a training and selection pathway together.”',tone:'constructive'},
      {id:'challenge',label:'“Use this frustration properly and force me to select you.”',tone:'demanding'},
      {id:'close',label:'“I cannot add anything else today. We return to work.”',tone:'final'}
    ];
    if(topic==='transfer')return [
      {id:'offer-path',label:'“Stay for now and I will give you a genuine route back.”',tone:'constructive'},
      {id:'open-transfer',label:'“I will instruct the club to listen to appropriate offers.”',tone:'pragmatic'},
      {id:'challenge',label:'“Do not let your representatives decide your football for you.”',tone:'confrontational'},
      {id:'close',label:'“Our positions are clear. The club will decide what happens next.”',tone:'final'}
    ];
    return [
      {id:'promise',label:'“I am making a clear commitment and I expect you to hold me to it.”',tone:'committing'},
      {id:'clarify',label:'“I will put the plan in precise terms so neither of us can misunderstand it.”',tone:'measured'},
      {id:'challenge',label:'“I have listened. Now I need a response from you on the pitch.”',tone:'demanding'},
      {id:'close',label:'“We have both said our piece. The conversation ends here.”',tone:'final'}
    ];
  }

  function startPlayer(game,player,topic,systemResult=''){
    const s=ensure(game),person=personRecord(game,'players',player),profile=persona(game,'players',player),ctx=playerContext(game,player,topic,profile),spoken=playerOpening(game,player,topic,profile,ctx);
    s.threads.forEach(t=>{if(t.group==='players'&&t.personId===(person?.id||player.id)&&t.open)t.open=false;});
    const thread={id:`conversation-${game.date}-${person?.id||player.id}-${hash(`${Date.now()}-${s.threads.length}`)}`,date:game.date,group:'players',roleId:player.id,personId:person?.id||player.id,personName:player.name,personaId:profile.personaId,topic,topicLabel:PLAYER_TOPICS[topic]?.label||'Private conversation',open:true,stage:1,context:{trust:ctx.trust,happiness:ctx.happiness,squadStatus:ctx.squadStatus,broken:ctx.broken},messages:[{speaker:'You',text:systemResult||`You ask to discuss ${PLAYER_TOPICS[topic]?.label?.toLowerCase()||'the situation'}.`},{speaker:player.name,text:spoken}],choices:playerFirstChoices(game,topic,ctx),impact:0};
    s.threads.unshift(thread);profile.lastConversation=game.date;profile.conversations=Number(profile.conversations||0)+1;
    window.FLPeople?.recordEvent(game,{type:'conversation-started',actorId:game.people?.managerPersonId,subjectId:person?.id,summary:`Conversation with ${player.name}: ${topic}`,importance:2,context:{topic,playerId:player.id}});
    return thread;
  }

  function activePlayer(game,playerId){return ensure(game).threads.find(t=>t.group==='players'&&(t.roleId===playerId||t.personId===playerId)&&t.open)||null;}
  function latestPlayer(game,playerId){return ensure(game).threads.find(t=>t.group==='players'&&(t.roleId===playerId||t.personId===playerId))||null;}

  function replyEffect(choice,ctx){
    const base={support:5,honest:3,firm:-1,apologise:7,'open-transfer':2,promise:7,clarify:3,challenge:-3,'review-role':4,'offer-path':5,'no-promise':1,close:0}[choice]??0;
    if(choice==='firm'&&ctx.persona==='hothead')return -7;
    if(choice==='honest'&&['mercenary','pro'].includes(ctx.persona))return 5;
    if(choice==='support'&&['loyalist','youngster'].includes(ctx.persona))return 7;
    if(choice==='challenge'&&ctx.persona==='hothead')return -8;
    if(choice==='open-transfer'&&ctx.persona==='mercenary')return 6;
    return base;
  }

  function playerManagerLine(game,choice){
    return {
      support:'You have my support. Keep working and I will deal with you fairly.',
      honest:'I will not tell you what you want to hear. This is exactly where you stand.',
      firm:'The same standard applies to everyone. Meet it and selection becomes straightforward.',
      apologise:'You are right to raise it. I made a commitment and I have not handled it well.',
      'open-transfer':'I will not force you to stay. If the right offer arrives, we will consider it properly.',
      promise:'I am giving you my word and attaching a clear deadline to it.',
      clarify:'Here is the plan, the role I see for you and the specific work that will move you forward.',
      challenge:'You can be angry, but you still have to earn the outcome you want.',
      'review-role':'I will review your role after the next three competitive matches and speak to you again.',
      'offer-path':'We will build a clear training and selection pathway rather than leaving you guessing.',
      'no-promise':'I will be fair with you, but I will not promise minutes that must be earned.',
      close:'We have both said our piece. We return to the work now.'
    }[choice]||'I understand.';
  }

  function playerReply(game,choice,impact,thread,ctx){
    if(choice==='promise')return eraWord(game,'I shall remember your word, sir.','I’ll hold you to that, boss.','I will hold you to that. I need the action to match the words.');
    if(choice==='open-transfer')return eraWord(game,'I appreciate your fairness, sir.','That is all I wanted — a fair position.','Thank you for being direct. My representatives will deal with the club properly.');
    if(choice==='apologise')return eraWord(game,'Your candour is appreciated, sir.','Fair enough, boss. Owning it matters.','Thank you for saying it. Now I need to see the action behind it.');
    if(choice==='challenge'&&ctx.persona==='hothead')return eraWord(game,'Then we understand one another, sir.','Right. I won’t forget that.','Fine. I know exactly where I stand, and I will remember how you said it.');
    if(impact>=5)return eraWord(game,'That is fair. You have my word that I shall respond properly.','Fair enough, boss. I can work with that.','That is clear. I can work with it.');
    if(impact<0)return eraWord(game,'I hear you, sir, though the answer does not satisfy me.','I don’t like that answer, boss.','I hear you, but this has damaged the way I see the situation.');
    return eraWord(game,'Very well. The coming weeks will decide it.','Alright. Let’s see what happens.','Understood. I will judge it by what happens next.');
  }

  function makePromise(game,player,thread){
    game.dressingRoom=game.dressingRoom||{};game.dressingRoom.promises=safe(game.dressingRoom.promises);
    player.dressingRoom=player.dressingRoom||{};player.dressingRoom.promises=safe(player.dressingRoom.promises);
    const currentApps=Number(player.appearances)||0,type=thread.topic==='role'?'Give meaningful first-team minutes':thread.topic==='transfer'?'Review the transfer position honestly':'Follow up on the conversation';
    const promise={id:`conversation-promise-${hash(`${thread.id}-${game.date}`)}`,playerId:player.id,personId:thread.personId,type,status:'active',madeDate:game.date,dueDate:addDays(game.date,42),targetApps:thread.topic==='role'?currentApps+3:null,startingApps:currentApps,conversationId:thread.id};
    game.dressingRoom.promises.unshift(promise);player.dressingRoom.promises.push(promise.id);thread.promise=promise;ensure(game).promises.unshift(promise);
    window.FLPeople?.recordEvent(game,{type:'promise-made',actorId:game.people?.managerPersonId,subjectId:thread.personId,summary:`Promise made to ${player.name}: ${type}`,importance:4,context:{promiseId:promise.id,playerId:player.id,dueDate:promise.dueDate}});
    return promise;
  }

  function closePlayer(game,player,thread,profile,impact){
    thread.open=false;thread.closedDate=game.date;thread.choices=[];thread.result=impact>=7?'Trust strengthened':impact<0?'Relationship damaged':'Position understood';
    player.dressingRoom=player.dressingRoom||{};player.dressingRoom.managerTrust=clamp(Number(player.dressingRoom.managerTrust??50)+impact);player.dressingRoom.happiness=clamp(Number(player.dressingRoom.happiness??50)+Math.round(impact*.7));player.dressingRoom.lastConversation={date:game.date,result:`${thread.topic}: ${thread.result}`,conversationId:thread.id};
    profile.relationship=clamp(Number(profile.relationship||50)+impact);
    game.managerCareer=game.managerCareer||{};game.managerCareer.relationships=game.managerCareer.relationships||{};game.managerCareer.relationships.players=clamp(Number(game.managerCareer.relationships.players??60)+Math.round(impact*.2));
    if(window.FLPeople){FLPeople.adjustRelationship(game,game.people?.managerPersonId,thread.personId,impact,thread.result);FLPeople.recordEvent(game,{type:PLAYER_TOPICS[thread.topic]?.memory||'conversation',actorId:game.people?.managerPersonId,subjectId:thread.personId,summary:`${thread.personName}: ${thread.result}`,importance:Math.abs(impact)>=5?3:2,context:{topic:thread.topic,impact,playerId:player.id,promiseId:thread.promise?.id||null}});}
    const memory={date:game.date,personId:thread.personId,roleId:player.id,personName:player.name,group:'players',topic:thread.topic,result:thread.result,impact,promiseId:thread.promise?.id||null,quote:thread.messages.filter(m=>m.speaker==='You').slice(-1)[0]?.text||null};ensure(game).memories.unshift(memory);return {ok:true,message:thread.result,thread};
  }

  function respondPlayer(game,player,choiceId){
    const thread=activePlayer(game,player.id);if(!thread)return {ok:false,message:'No active conversation.'};
    const profile=persona(game,'players',player),ctx=playerContext(game,player,thread.topic,profile),impact=replyEffect(choiceId,ctx);thread.impact=Number(thread.impact||0)+impact;
    if(choiceId==='promise'&&!thread.promise)makePromise(game,player,thread);
    const spoken=playerManagerLine(game,choiceId);thread.messages.push({speaker:'You',text:spoken},{speaker:player.name,text:playerReply(game,choiceId,impact,thread,ctx)});thread.stage++;
    if(thread.stage<3&&choiceId!=='close'){thread.choices=playerSecondChoices(thread.topic);return {ok:true,message:'The conversation continues.',thread};}
    return closePlayer(game,player,thread,profile,thread.impact);
  }

  function staffLine(game,member){
    const profile=persona(game,'staff',member),role=String(member.role||'').toLowerCase(),situation=role.includes('scout')?'scoutReport':role.includes('academy')?'academyProspect':'assistantAdvice';
    return window.FLVoices?.pick?.('staff',situation,'all',profile.personaId,yearOf(game))||'For what it is worth, boss, I would keep the plan simple and trust the work we have done.';
  }

  function groupContext(game,group,person,profile){
    const club=controlled(game),next=window.FLGame?.nextFixture?.(game),opponent=next?clubById(game,(next.home||next.homeId)===game.controlledClubId?(next.away||next.awayId):(next.home||next.homeId)):null;
    const last=safe(game.fixtures).filter(f=>f.played&&[(f.home||f.homeId),(f.away||f.awayId)].includes(game.controlledClubId)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
    const home=last&&(last.home||last.homeId)===game.controlledClubId,ours=last?Number(home?last.homeGoals:last.awayGoals):null,theirs=last?Number(home?last.awayGoals:last.homeGoals):null;
    const result=last?(ours>theirs?'win':ours<theirs?'loss':'draw'):null;
    const relationships=game.managerCareer?.relationships||{};
    return {group,club,clubName:club?.name||'the club',person,profile,relationship:Number(profile.relationship||50),boardConfidence:Number(game.boardConfidence||relationships.board||50),supporterRelationship:Number(relationships.supporters||58),pressRelationship:Number(relationships.press||45),playerRelationship:Number(relationships.players||60),next,opponent,last,result,ours,theirs,finances:club?.finances||{},memories:recentMemories(game,profile.personId,5),year:yearOf(game),managerName:managerName(game)};
  }

  function topicFor(game,group,person,situation='checkIn'){
    group=cleanGroup(group);
    const topics=GROUP_TOPICS[group]||['check-in'];
    if(situation&&situation!=='checkIn'&&topics.includes(situation))return situation;
    const s=ensure(game),profile=persona(game,group,person),previous=s.topicHistory.filter(x=>x.personId===profile.personId).slice(0,2).map(x=>x.topic),available=topics.filter(x=>!previous.includes(x));
    const pool=available.length?available:topics,seed=hash(`${game.date}-${profile.personId}-${allThreadsFor(game,profile.personId).length}-${group}`),chosen=pick(pool,seed);
    s.topicHistory.unshift({date:game.date,personId:profile.personId,group,topic:chosen});
    return chosen;
  }

  function openingBank(game,group,topic,ctx){
    const c=ctx.clubName,o=ctx.opponent?.name||'the opposition',last=ctx.last?`${ctx.ours}–${ctx.theirs}`:'the recent run';
    const banks={
      board:{
        results:[`The committee have reviewed ${last}. I need to know whether you believe the present direction is working.`,`The results are beginning to define the season. Give me your honest assessment before the board meets.`],
        budget:[`You have asked for resources, but the club cannot spend without consequence. What exactly are you asking us to support?`,`The figures and the football plan are pulling in different directions. Tell me which one should move.`],
        ambition:[`What does progress look like for ${c} under you — survival, promotion, trophies, or something larger?`,`I want to know whether your ambition matches the board’s. Where should this club be heading?`],
        contract:[`Your own position is part of the club’s planning now. Do you see your future here?`,`Before we discuss terms, I want to hear what commitment you are prepared to make to ${c}.`],
        facilities:[`You keep returning to the facilities. Explain why this project matters more than the other demands on the club.`,`The board may fund one major improvement. Make the case for where the money should go.`],
        transfers:[`The recruitment plan is drawing attention in the boardroom. Are you building carefully or simply asking us to gamble?`,`We need clarity on the transfer policy before another commitment is made.`]
      },
      staff:{
        tactics:[`I have been studying the shape. There is one weakness opponents are beginning to find. Do you want my honest view?`,`The tactical plan is clear, but the players are not always carrying it out. Where do you think the fault lies?`],
        selection:[`A few players believe the team is being picked before training begins. How do you want the staff to handle that mood?`,`There is a selection decision dividing the dressing room. I think we should address it before the next match.`],
        training:[`The workload is producing good habits, but a few bodies are beginning to look tired. Do we adjust or hold the line?`,`Training standards have changed. I need to know whether you want more intensity or more recovery.`],
        recruitment:[`I have two different recruitment routes in front of me: proven ability or younger potential. Which direction are we committing to?`,`The scouting staff need a clearer brief. What sort of player are we actually looking for?`],
        role:[`I need to understand how much authority you want me to carry. At present, some decisions are falling between us.`,`We should speak about my role. I can take more responsibility, but only if the arrangement is clear.`],
        future:[`I have had interest from elsewhere and I would rather speak to you before anyone else. How do you see my future here?`,`This staff has grown with you. I need to know whether there is still a place for my ambitions in it.`]
      },
      press:{
        result:[`The public wants an explanation for ${last}. What do you say to the people who believe the performance was not good enough?`,`Was that result a bad day, or evidence of a deeper problem?`],
        selection:[`Your selection has caused debate. Why did you leave out one of the club’s most discussed players?`,`Supporters are asking whether reputation is influencing your team sheet. How do you answer that?`],
        transfer:[`There are reports of movement around the squad. Can you state clearly whether the player is staying?`,`The market is asking questions about ${c}. Are you satisfied with the business done so far?`],
        board:[`Do you believe the board have supported you sufficiently?`,`There appears to be tension between your targets and the resources available. Is the board matching your ambition?`],
        rival:[`${o}'s manager has questioned your approach. Do you have a response?`,`The rivalry is becoming personal. Are you comfortable with the tone of it?`],
        job:[`Your name is being linked with another position. Can you guarantee that you will still be here next season?`,`There is speculation about your future. What should the supporters believe?`]
      },
      supporters:{
        style:[`We can accept difficult days, but people want to recognise their team. What is ${c} supposed to stand for under you?`,`The football has divided the support. Are results enough if the crowd dislike the way the team plays?`],
        results:[`The mood around the ground is changing. What do you say to supporters worried about the direction of the season?`,`People have paid and travelled through a difficult run. Why should they continue to believe?`],
        identity:[`The club is changing quickly. How will you make sure ${c} still feels like our club?`,`Supporters fear that ambition is erasing the club’s identity. Do you understand that concern?`],
        rivals:[`The derby matters differently here. Do the players understand what the next match means to the town?`,`People can forgive many things, but not looking frightened against that lot. What will you demand?`],
        ownership:[`There is concern about the direction of the owners. Will you speak for the club if the board take it somewhere the supporters dislike?`,`Do you believe the people running ${c} understand the community around it?`],
        youth:[`Supporters want to see local players given a chance. Is the academy genuinely part of your plan?`,`How much does it matter to you that the team contains players who understand this place?`]
      },
      rivals:{
        respect:[`We have faced each other enough times to speak plainly. Do you respect what I am building at ${o}?`,`There is history between us now. Is this rivalry professional, or has it become personal?`],
        feud:[`You have had plenty to say about me. Say it directly now — what exactly is your problem?`,`The papers call this a feud. I want to know whether you intend to keep feeding it.`],
        tactics:[`You know how I set my teams up, and I know your habits too. Which of us do you think has adapted better?`,`We keep producing the same tactical fight. Do you believe your approach has solved mine?`],
        'title-race':[`Only one of us can finish where we both want to finish. Do you think your side handles pressure better than mine?`,`The title race is tightening. Are you prepared to say your team is better than ours?`],
        transfer:[`You have shown interest in one of my players. Are you trying to sign him, or merely unsettle him?`,`There is business between our clubs and noise around it. Let us speak without the agents for a moment.`],
        touchline:[`What happened on the touchline crossed a line. Do you intend to apologise?`,`We can compete fiercely without turning every meeting into a scene. Can you?`]
      },
      family:{
        workload:[`Football is taking nearly everything from you again. Do you think the balance we have is sustainable?`,`You are here, but your mind is still at the club. I need to know whether this is temporary.`],
        move:[`This opportunity would change more than your job. Have you thought about what the move would mean for us?`,`Another club may want you, but I need to know whether you want the life that comes with it.`],
        money:[`The job is paying more now, but security and happiness are not the same thing. What are we actually working toward?`,`We should talk about money before football makes the decision for us.`],
        home:[`We have moved around your career before. What does home mean to you now?`,`The family needs something stable. Can this place become that?`],
        retirement:[`You talk about carrying on forever, but your life cannot only be the next fixture. Have you thought seriously about when to stop?`,`I need an honest answer: can you imagine a life after management?`],
        succession:[`If you step away, who carries the story forward matters to you. Does it matter more than what the family wants?`,`You are beginning to talk about successors. Are you planning for the club, or trying to preserve yourself?`]
      },
      agents:{
        'client-role':[`My client needs clarity. Is he central to your plans, a squad option, or someone you would allow to leave?`,`I cannot advise my client while his role changes every week. State your position clearly.`],
        contract:[`The current terms no longer reflect my client’s standing. Are you prepared to discuss a new agreement seriously?`,`We are approaching the point where uncertainty becomes a decision. What is the club offering?`],
        transfer:[`There is interest elsewhere. Is the club prepared to negotiate, or should we stop taking calls?`,`My client wants to know whether a move will be considered fairly.`],
        promise:[`You made a commitment to my client and he believes it has not been kept. How do you intend to repair that?`,`I am here because the words and the reality are no longer matching.`]
      },
      officials:{
        discipline:[`The pattern of cautions and touchline incidents is becoming a concern. What steps are you taking to control it?`,`Your club’s disciplinary record now requires an explanation.`],
        complaint:[`You have requested a formal meeting about the last decision. State the basis of the complaint carefully.`,`The league will hear your concern, but it will not accept an accusation without evidence.`],
        rules:[`A rule change is coming and clubs are divided. What is ${c}'s position?`,`We are consulting managers before the regulation is finalised. What practical effect do you expect?`],
        postponement:[`The postponement has created a difficult schedule for both clubs. What solution would you consider fair?`,`The competition needs your cooperation to rearrange the fixture.`]
      },
      legends:{
        standards:[`This club had standards before either of us arrived. Do you believe the current side understands them?`,`I have watched the team closely. Talent is not the problem. The question is whether the old standards still matter.`],
        history:[`Managers sometimes behave as though history begins with them. What place does the past have in your version of ${c}?`,`You are building something new. Tell me what you believe must never be lost.`],
        supporters:[`The supporters will follow a manager who understands them. Do you?`,`The crowd are not asking for perfection. They are asking to recognise the effort and the club.`],
        youth:[`There are young players here who need more than minutes. Who is teaching them what the shirt means?`,`I want to know whether the academy is a pathway or merely a line in a speech.`]
      }
    };
    return banks[group]?.[topic]||[`${ctx.person?.name||'The other person'} is ready to speak frankly about ${TOPIC_LABELS[topic]||topic}.`];
  }

  function genericOpening(game,group,person,profile,topic,ctx){
    group=cleanGroup(group);
    const voiceGroup=group==='supporters'?'fans':group==='rivals'?'manager':group;
    const voiceSituation={board:{results:'loseStreak',budget:'budgetCut',ambition:'titlePush',contract:'sackPressure',facilities:'budgetBoost',transfers:'bigSigning'},staff:{tactics:'assistantAdvice',selection:'assistantAdvice',training:'assistantAdvice',recruitment:'scoutReport',role:'assistantAdvice',future:'assistantAdvice'},press:{result:'pressConfPrompt',selection:'pressConfPrompt',transfer:'transferRumour',board:'pressJobQuestion',rival:'pressJobQuestion',job:'pressJobQuestion'},supporters:{style:'loseStreak',results:ctx.result==='win'?'winStreak':'loseStreak',identity:'loseStreak',rivals:'derbyLoss',ownership:'loseStreak',youth:'academyDebut'},rivals:{respect:'pressJobQuestion',feud:'pressJobQuestion',tactics:'pressJobQuestion','title-race':'pressJobQuestion',transfer:'pressJobQuestion',touchline:'pressJobQuestion'}}[group]?.[topic];
    const voiced=voiceSituation?window.FLVoices?.pick?.(voiceGroup,voiceSituation,voiceGroup==='staff'?'all':disposition(profile.relationship),profile.personaId,yearOf(game)):null;
    if(voiced&&hash(`${game.date}-${profile.personId}-${topic}`)%3===0)return voiced;
    const bank=openingBank(game,group,topic,ctx);return pick(bank,hash(`${game.date}-${profile.personId}-${topic}-opening`));
  }

  const FIRST_REPLY_LINES={
    board:{
      supportive:'“I understand the concern. I will work with the board rather than turn this into a public argument.”',
      honest:'“The honest answer is that the target and the resources do not currently match.”',
      forceful:'“Back the plan properly or lower the expectation. You cannot demand both restraint and immediate success.”',
      guarded:'“I will not make promises in this room today. Let us review the evidence again before a decision.”'
    },
    staff:{
      supportive:'“I value your judgement. Put the recommendation clearly and we will work through it together.”',
      honest:'“You are right about part of the problem, but responsibility for the final decision remains mine.”',
      forceful:'“I need solutions from my staff, not another description of the problem.”',
      guarded:'“Keep observing it. I am not ready to change the plan on one conversation.”'
    },
    press:{
      supportive:'“The players have my support. We will deal with the issue together and accept fair criticism.”',
      honest:'“The performance was not good enough, and I will not insult anyone by pretending otherwise.”',
      forceful:'“That question is designed to create a crisis. I reject the premise and stand by my decision.”',
      guarded:'“I will not discuss private matters or feed speculation. Judge us by what happens next.”'
    },
    supporters:{
      supportive:'“I hear the supporters and I understand why this matters beyond the table.”',
      honest:'“Some of the criticism is fair. We have not given the crowd enough to believe in.”',
      forceful:'“I will not manage by the loudest shout from the terrace. The long-term plan comes first.”',
      guarded:'“I will not promise a quick answer, but I will take the concern back into the club.”'
    },
    rivals:{
      supportive:'“I respect the work you have done. Our rivalry does not require dishonesty.”',
      honest:'“I respect you, but I believe my side is better prepared and I expect us to prove it.”',
      forceful:'“You have mistaken noise for authority. We will settle this on the pitch.”',
      guarded:'“I have no interest in giving you a headline or a tactical clue.”'
    },
    family:{
      supportive:'“You are right to raise it. Football cannot make every decision for this family.”',
      honest:'“I have put the job first too often. I do not yet know how to change that, but I see it.”',
      forceful:'“This career has demands you knew about. I cannot apologise for taking the work seriously.”',
      guarded:'“I need time before I can answer properly. I do not want to make another promise I cannot keep.”'
    },
    agents:{
      supportive:'“Your client deserves clarity and fair treatment. I will give him both.”',
      honest:'“His position is not secure. I would rather say that now than mislead either of you.”',
      forceful:'“The team will not be selected through pressure from an agent.”',
      guarded:'“The club will review the position, but I will not negotiate through an ultimatum.”'
    },
    officials:{
      supportive:'“I understand the competition’s concern and will cooperate with a fair process.”',
      honest:'“We accept our responsibility, but the decision-making around the incident also needs examination.”',
      forceful:'“The club will not quietly accept a process we believe has been unfair.”',
      guarded:'“I will reserve the club’s position until we have reviewed the written report.”'
    },
    legends:{
      supportive:'“I value what you know about this club. I want that history inside the work, not outside criticising it.”',
      honest:'“Some traditions help us and some hold us back. I will protect the first and challenge the second.”',
      forceful:'“History deserves respect, but it does not get to pick my team.”',
      guarded:'“I will listen carefully, but I will not make a symbolic promise today.”'
    }
  };

  const SECOND_REPLY_LINES={
    board:{commit:'“Give me the agreed support and I will accept a clear, measurable target.”',explain:'“Let me show you the plan, the costs and the consequences before we decide.”',challenge:'“If the board no longer believes in the work, say so directly.”',close:'“We understand one another. I will return with results rather than another speech.”'},
    staff:{commit:'“Take ownership of this area and report back to me after the next three matches.”',explain:'“Set out the evidence and I will explain the final decision to the group.”',challenge:'“If you believe strongly enough, defend the idea in front of the full staff.”',close:'“We will leave it there and get back to preparing the team.”'},
    press:{commit:'“You may quote me on this: I take responsibility and I expect a response.”',explain:'“The context matters, and I will explain it without hiding behind excuses.”',challenge:'“Print the whole answer, not the sentence that creates the easiest outrage.”',close:'“That is all I am saying on the matter today.”'},
    supporters:{commit:'“You will see a clear response in the way we prepare and compete.”',explain:'“I will explain the plan publicly so people know what the club is trying to build.”',challenge:'“Support has meaning when the team is under pressure, not only when it is winning.”',close:'“I have heard the message. The next answer must come from the team.”'},
    rivals:{commit:'“Let us keep the contest fierce and leave the cheap theatre out of it.”',explain:'“I will tell you exactly where I disagree, and then we can stop pretending.”',challenge:'“Say it again after the next match, when one of us has had to prove it.”',close:'“We have nothing more to discuss until we meet again.”'},
    family:{commit:'“I will protect specific time for us and stop treating it as optional.”',explain:'“Let me explain what this decision means before either of us reacts to the headline.”',challenge:'“I need you to tell me what you actually want, not only what you fear.”',close:'“We are too tired to solve this well tonight. We will return to it.”'},
    agents:{commit:'“I will give your client a written role review and a decision date.”',explain:'“I will explain the football reasons directly to the player, with you present.”',challenge:'“Do not manufacture a market through the press and expect cooperation.”',close:'“The club’s position is recorded. Further discussion goes through the proper channel.”'},
    officials:{commit:'“We will comply with the process and submit everything by the deadline.”',explain:'“I will provide the evidence and ask that the full context be recorded.”',challenge:'“The club is prepared to appeal if the process remains unsatisfactory.”',close:'“We will await the written decision before commenting further.”'},
    legends:{commit:'“I want you involved with the players so the standards become something lived.”',explain:'“Help me identify what is truly essential and what has simply become habit.”',challenge:'“Judge this team after the work has had time to become visible.”',close:'“I appreciate the honesty. I will make the decision and carry the responsibility.”'}
  };

  function fourChoices(group,stage){
    group=cleanGroup(group);const source=stage===1?FIRST_REPLY_LINES[group]:SECOND_REPLY_LINES[group];
    if(stage===1)return ['supportive','honest','forceful','guarded'].map(id=>({id,label:source?.[id]||id,tone:{supportive:'supportive',honest:'honest',forceful:'confrontational',guarded:'cautious'}[id]}));
    return ['commit','explain','challenge','close'].map(id=>({id,label:source?.[id]||id,tone:{commit:'committing',explain:'measured',challenge:'confrontational',close:'final'}[id]}));
  }

  function genericImpact(group,choice,profile,topic){
    group=cleanGroup(group);
    let impact={supportive:5,honest:3,forceful:-2,guarded:-1,commit:6,explain:3,challenge:-3,close:0}[choice]??0;
    const p=profile.personaId;
    if(choice==='honest'&&['accountant','broadsheet','pro','procedural','traditionalist','operator'].includes(p))impact+=2;
    if(choice==='supportive'&&['oldmoney','local','diehard','assistant','supportive','warm','protector'].includes(p))impact+=2;
    if(choice==='forceful'&&['hothead','tabloid','ultra','strict','demanding','showman'].includes(p))impact+=1;
    if(choice==='guarded'&&['tabloid','phonein','showman'].includes(p))impact-=2;
    if(group==='family'&&['forceful','challenge'].includes(choice))impact-=3;
    if(group==='officials'&&['forceful','challenge'].includes(choice))impact-=2;
    if(group==='rivals'&&['forceful','challenge'].includes(choice))impact=1;
    if(group==='press'&&choice==='forceful')impact=-4;
    if(group==='supporters'&&choice==='guarded')impact=-3;
    if(topic==='feud'&&['forceful','challenge'].includes(choice))impact=2;
    return impact;
  }

  function genericManagerLine(group,choice){
    group=cleanGroup(group);const source=['supportive','honest','forceful','guarded'].includes(choice)?FIRST_REPLY_LINES[group]:SECOND_REPLY_LINES[group];
    return String(source?.[choice]||'I understand.').replace(/^“|”$/g,'');
  }

  function characterReply(game,group,choice,impact,thread,profile){
    group=cleanGroup(group);
    const positive={
      board:'That is a position the committee can work with. I will expect the same clarity when the decision is tested.',
      staff:'Good. I know what you want from me now, and I can act on it.',
      press:'That is clear enough. The public will judge the answer, but at least it is an answer.',
      supporters:'People may not agree with every word, but they will respect being spoken to directly.',
      rivals:'Fair enough. We can compete without pretending there is no respect between us.',
      family:'Thank you. I needed to know that the concern had actually reached you.',
      agents:'That gives us something concrete to take back to the player.',
      officials:'The league will note your cooperation and the clarity of the club’s position.',
      legends:'That is the first answer you have given me that sounds like you understand the place.'
    };
    const neutral={
      board:'The position is noted. The board will judge what follows rather than what was said today.',
      staff:'Understood. We will see whether the next few weeks support that decision.',
      press:'Very well. That will be reported as your position.',
      supporters:'I will take that back to the supporters. They will decide how much confidence to place in it.',
      rivals:'We understand one another, then. The next meeting will say more.',
      family:'I hear you. This is not solved, but at least the position is clearer.',
      agents:'I will report the answer accurately. The next move depends on what the club does.',
      officials:'Your position is recorded. The formal process will continue.',
      legends:'I may not agree, but I know where you stand.'
    };
    const negative={
      board:'That answer will concern several members of the committee. I suggest the results improve quickly.',
      staff:'I will carry out the instruction, but this has changed the way I see my place here.',
      press:'That will make a headline, whether you intended it to or not.',
      supporters:'That is not the answer people wanted, and they will not forget the tone of it.',
      rivals:'Good. Then there is no need to pretend this is friendly any longer.',
      family:'That is exactly the answer I was afraid you would give.',
      agents:'Then this is likely to become a formal dispute rather than a private conversation.',
      officials:'The tone of that response will be included in the report.',
      legends:'You may be the manager, but you have made it harder for people who care about this club to trust you.'
    };
    if(choice==='close')return neutral[group]||'The discussion is over for now.';
    return impact>=5?(positive[group]||'That is useful to hear.'):impact<0?(negative[group]||'I will remember that answer.'):(neutral[group]||'At least the position is clear.');
  }

  function startGeneric(game,group,person,situation='checkIn'){
    group=cleanGroup(group);const st=ensure(game),canonical=personRecord(game,group,person),profile=persona(game,group,person),topic=topicFor(game,group,person,situation),ctx=groupContext(game,group,person,profile),spoken=genericOpening(game,group,person,profile,topic,ctx);
    st.threads.forEach(t=>{if(t.personId===(canonical?.id||profile.personId)&&t.open)t.open=false;});
    const thread={id:`conversation-${group}-${hash(`${Date.now()}-${st.threads.length}-${profile.personId}`)}`,date:game.date,group,roleId:person?.id||null,personId:canonical?.id||profile.personId,personName:person.name||profile.label,personaId:profile.personaId,topic,topicLabel:TOPIC_LABELS[topic]||String(topic).replace(/-/g,' '),open:true,stage:1,impact:0,context:{clubId:ctx.club?.id||null,opponentId:ctx.opponent?.id||null,relationship:ctx.relationship,clientId:person?.clientId||null},messages:[{speaker:person.name||profile.label,text:spoken}],choices:fourChoices(group,1)};
    st.threads.unshift(thread);profile.lastConversation=game.date;profile.conversations=Number(profile.conversations||0)+1;
    window.FLPeople?.recordEvent(game,{type:'conversation-started',actorId:game.people?.managerPersonId,subjectId:thread.personId,summary:`Conversation with ${thread.personName}: ${thread.topicLabel}`,importance:2,context:{group,topic}});
    return thread;
  }

  function pressHeadline(game,thread,choice){
    const club=controlled(game)?.name||'Club',quote=thread.messages.filter(m=>m.speaker==='You').slice(-1)[0]?.text||'';
    const strong=choice==='forceful'||choice==='challenge',supportive=choice==='supportive'||choice==='commit';
    const topic=thread.topic;
    let headline;
    if(topic==='board')headline=strong?`${managerName(game)} questions ${club} board`:supportive?`${managerName(game)} backs ${club} hierarchy`:`${managerName(game)} addresses board relationship`;
    else if(topic==='job')headline=strong?`${managerName(game)} hits back at job speculation`:supportive?`${managerName(game)} commits to ${club}`:`${managerName(game)} leaves future open`;
    else if(topic==='rival')headline=strong?`${managerName(game)} fires warning at rival manager`:`${managerName(game)} responds to rival`;
    else if(topic==='transfer')headline=strong?`${managerName(game)} rejects transfer pressure`:`${managerName(game)} gives transfer update`;
    else headline=strong?`${managerName(game)} defiant after questioning`:supportive?`${managerName(game)} stands by players`:`${managerName(game)} gives honest assessment`;
    return {headline,body:`Speaking to the press, ${managerName(game)} said: “${quote}”`,category:'press'};
  }

  function applyGroupConsequences(game,thread,profile,lastChoice){
    const group=cleanGroup(thread.group),impact=Number(thread.impact||0);game.managerCareer=game.managerCareer||{};game.managerCareer.relationships=game.managerCareer.relationships||{board:Number(game.boardConfidence)||50,supporters:58,players:60,press:45};
    if(group==='board'){
      game.boardConfidence=clamp(Number(game.boardConfidence||50)+Math.round(impact*.45));game.managerCareer.relationships.board=clamp(Number(game.managerCareer.relationships.board||50)+Math.round(impact*.5));
      const member=game.board?.members?.find(x=>x.id===thread.roleId||x.personId===thread.personId);if(member)member.approval=clamp(Number(member.approval||50)+impact);
    }
    if(group==='staff'){
      const member=game.dressingRoom?.staff?.members?.find(x=>x.id===thread.roleId||x.personId===thread.personId);if(member){member.trust=clamp(Number(member.trust||50)+impact);member.morale=clamp(Number(member.morale||60)+Math.round(impact*.7));member.lastConversation={date:game.date,result:thread.result};}
    }
    if(group==='supporters')game.managerCareer.relationships.supporters=clamp(Number(game.managerCareer.relationships.supporters||58)+impact);
    if(group==='press'){
      game.managerCareer.relationships.press=clamp(Number(game.managerCareer.relationships.press||45)+impact);const article=pressHeadline(game,thread,lastChoice);game.news=safe(game.news);game.news.unshift({id:`conversation-news-${thread.id}`,date:game.date,...article});ensure(game).pressQuotes.unshift({id:`quote-${thread.id}`,date:game.date,personId:thread.personId,topic:thread.topic,quote:thread.messages.filter(m=>m.speaker==='You').slice(-1)[0]?.text||'',headline:article.headline,tone:lastChoice});
    }
    if(group==='family'){
      const life=game.personalLife;if(life?.spouse&&life.spouse.personId===thread.personId)life.spouse.relationship=clamp(Number(life.spouse.relationship||60)+impact);if(life)life.familyMood=clamp(Number(life.familyMood||60)+Math.round(impact*.7));
    }
    if(group==='rivals'){
      const career=game.managerLegacyCareer;const rival=career?.rivals?.find(x=>x.rivalManagerId===thread.personId||x.id===thread.roleId||String(x.rivalName||'').toLowerCase()===String(thread.personName||'').toLowerCase());
      if(rival){const aggressive=['forceful','challenge'].includes(lastChoice);rival.heat=clamp(Number(rival.heat||0)+(aggressive?10:impact>=5?-3:2));rival.status=rival.heat>=45?'Bitter feud':rival.heat>=25?'Feud':rival.heat>=15?'Rivalry':'Acquaintance';rival.incidents=safe(rival.incidents);rival.incidents.unshift({date:game.date,club:rival.currentClub||'',result:'Conversation',outcome:aggressive?'heated':'private',cards:0,detail:`${thread.topicLabel}: ${thread.result}`});rival.incidents=rival.incidents.slice(0,12);}
    }
    if(group==='agents'){
      const player=controlled(game)?.players?.find(p=>p.id===thread.context?.clientId||p.personId===thread.context?.clientId);if(player){player.dressingRoom=player.dressingRoom||{};player.dressingRoom.agentTrust=clamp(Number(player.dressingRoom.agentTrust||50)+impact);}
    }
  }

  function closeGeneric(game,thread,profile,lastChoice){
    thread.open=false;thread.choices=[];thread.closedDate=game.date;thread.result=thread.impact>=8?'Relationship strengthened':thread.impact<0?'Relationship cooled':'Position understood';profile.relationship=clamp(Number(profile.relationship||50)+thread.impact);
    applyGroupConsequences(game,thread,profile,lastChoice);
    if(window.FLPeople){FLPeople.adjustRelationship(game,game.people?.managerPersonId,thread.personId,thread.impact,thread.result);FLPeople.recordEvent(game,{type:`${thread.group}-conversation`,actorId:game.people?.managerPersonId,subjectId:thread.personId,summary:`Conversation with ${thread.personName}: ${thread.result}`,importance:Math.abs(thread.impact)>=8?4:2,context:{group:thread.group,topic:thread.topic,impact:thread.impact,lastChoice}});}
    ensure(game).memories.unshift({date:game.date,personId:thread.personId,roleId:thread.roleId,personName:thread.personName,group:thread.group,topic:thread.topic,topicLabel:thread.topicLabel,result:thread.result,impact:thread.impact,choice:lastChoice,quote:thread.messages.filter(m=>m.speaker==='You').slice(-1)[0]?.text||null});
    return {ok:true,message:thread.result,thread};
  }

  function respondGeneric(game,threadId,choiceId){
    const st=ensure(game),thread=st.threads.find(t=>t.id===threadId&&t.open);if(!thread)return {ok:false,message:'Conversation unavailable.'};
    const group=cleanGroup(thread.group),profile=st.people[`${group}:${thread.personId}`]||persona(game,group,{id:thread.roleId,name:thread.personName,personId:thread.personId}),impact=genericImpact(group,choiceId,profile,thread.topic);thread.impact=Number(thread.impact||0)+impact;
    const managerLine=genericManagerLine(group,choiceId),reply=characterReply(game,group,choiceId,impact,thread,profile);thread.messages.push({speaker:'You',text:managerLine},{speaker:thread.personName,text:reply});thread.stage++;
    if(thread.stage<3&&choiceId!=='close'){thread.choices=fourChoices(group,2);return {ok:true,message:'The conversation continues.',thread};}
    return closeGeneric(game,thread,profile,choiceId);
  }

  function contactsFor(game){
    const club=controlled(game),year=yearOf(game),board=safe(game.board?.members),staff=safe(game.dressingRoom?.staff?.members),players=safe(club?.players),family=game.personalLife||game.personalLifeState||game.personalLifeData,rows=[];
    board.forEach(x=>rows.push({group:'board',...x}));
    staff.forEach(x=>rows.push({group:'staff',...x}));
    players.forEach(x=>rows.push({group:'players',...x,role:x.position||x.squadStatus||'Player'}));
    rows.push({id:'local-reporter',group:'press',name:eraWord(game,'The Sporting Correspondent','Local Football Correspondent','Club Beat Reporter'),role:'Journalist',birthYear:year-38});
    rows.push({id:'national-reporter',group:'press',name:eraWord(game,'National Sporting Writer','National Football Writer','National Football Correspondent'),role:'Journalist',birthYear:year-44});
    rows.push({id:'supporters-rep',group:'supporters',name:'Supporters’ Representative',role:'Fan voice',birthYear:year-47});
    rows.push({id:'young-supporters-rep',group:'supporters',name:'Younger Supporters’ Representative',role:'Fan voice',birthYear:year-27});

    const addedRivals=new Set(),pushRival=(id,name,role,extra={})=>{if(!id||addedRivals.has(String(id)))return;addedRivals.add(String(id));rows.push({id,personId:id,group:'rivals',name,role,...extra});};
    const next=window.FLGame?.nextFixture?.(game),opp=next?clubById(game,(next.home||next.homeId)===game.controlledClubId?(next.away||next.awayId):(next.home||next.homeId)):null,mp=opp?.managerProfile;
    if(mp)pushRival(mp.personId||mp.id,`${mp.firstName||''} ${mp.lastName||''}`.trim()||`Manager of ${opp.name}`,`Manager of ${opp.name}`,{clubId:opp.id,gender:mp.gender||'male',birthYear:mp.birthYear||year-(mp.age||45)});
    safe(game.managerLegacyCareer?.rivals).sort((a,b)=>Number(b.heat||0)-Number(a.heat||0)).slice(0,6).forEach(r=>pushRival(r.rivalManagerId,r.rivalName||'Rival manager',`Manager of ${r.currentClub||'another club'}`,{clubId:r.currentClubId,birthYear:year-48}));

    const spouse=family?.spouse;if(spouse)rows.push({id:spouse.personId||'partner',personId:spouse.personId,group:'family',name:spouse.name,role:'Partner',gender:spouse.gender,birthYear:spouse.birthYear});
    safe(family?.children).filter(c=>Number(c.age??year-Number(c.birthYear||year))>=16).slice(0,4).forEach(c=>rows.push({id:c.personId||c.id,personId:c.personId||c.id,group:'family',name:c.name,role:c.footballPath==='manager'?'Adult child · aspiring manager':'Adult child',gender:c.gender,birthYear:c.birthYear}));

    const priorityPlayers=[];
    const addPriority=p=>{if(p&&!priorityPlayers.some(x=>x.id===p.id))priorityPlayers.push(p)};
    addPriority(players.find(p=>p.isCaptain||p.captain)||players.find(p=>p.squadStatus==='Captain'));
    addPriority([...players].sort((a,b)=>Number(b.ability||0)-Number(a.ability||0))[0]);
    addPriority(players.find(p=>Number(p.dressingRoom?.happiness??60)<42)||players.find(p=>p.transferListed||p.wantsTransfer));
    if(!priorityPlayers.length)addPriority(players[0]);
    priorityPlayers.slice(0,3).forEach((p,i)=>rows.push({id:`agent-${p.id}`,group:'agents',name:`${String(p.name).split(' ').slice(-1)[0]}’s Representative`,role:`Agent for ${p.name}`,clientId:p.id,birthYear:year-(38+i*4)}));

    rows.push({id:'league-secretary',group:'officials',name:eraWord(game,'Football League Secretary','League Secretary','Competition Administrator'),role:'League official',birthYear:year-52});
    rows.push({id:'disciplinary-officer',group:'officials',name:eraWord(game,'Disciplinary Committee Clerk','Disciplinary Officer','Head of Football Regulation'),role:'Disciplinary official',birthYear:year-46});

    let legend=safe(club?.legends||club?.hallOfFame||club?.retiredLegends)[0];
    if(!legend)legend=safe(game.retiredPlayers).find(p=>p.lastClubId===club?.id||p.clubId===club?.id||p.lastClub===club?.name);
    if(legend)rows.push({id:legend.personId||legend.id||`legend-${hash(legend.name)}`,personId:legend.personId||legend.id,group:'legends',name:legend.name,role:'Club legend',birthYear:legend.birthYear||year-(legend.age||65)});
    else if(club)rows.push({id:`club-elder-${club.id}`,group:'legends',name:eraWord(game,'Former Club Captain','Former Club Captain','Former Club Captain'),role:'Club elder',birthYear:year-66});

    const seen=new Set();return rows.filter(row=>{const key=`${row.group}:${row.id}`;if(seen.has(key))return false;seen.add(key);return true;});
  }


  function daysBetween(a,b){return Math.floor((new Date(`${b}T12:00:00Z`)-new Date(`${a}T12:00:00Z`))/DAY);}

  function requestCandidate(game){
    const s=ensure(game),club=controlled(game),contacts=contactsFor(game),players=safe(club?.players),staff=safe(game.dressingRoom?.staff?.members),year=yearOf(game);
    const unhappy=[...players].filter(p=>Number(p.dressingRoom?.happiness??60)<42||Number(p.dressingRoom?.managerTrust??60)<38).sort((a,b)=>Number(a.dressingRoom?.happiness??60)-Number(b.dressingRoom?.happiness??60))[0];
    if(unhappy)return {group:'players',roleId:unhappy.id,name:unhappy.name,topic:Number(unhappy.dressingRoom?.happiness??60)<32?'transfer':'role',reason:`${unhappy.name} wants clarity about his position.`};
    const expiring=[...players].find(p=>{const d=p.contractExpiry||p.contractEnd||p.contract?.expiryDate;return d&&daysBetween(game.date,d)<=180&&daysBetween(game.date,d)>=0;});
    if(expiring){const agent=contacts.find(x=>x.group==='agents'&&x.clientId===expiring.id)||{id:`agent-${expiring.id}`,group:'agents',name:`${String(expiring.name).split(' ').slice(-1)[0]}’s Representative`,role:`Agent for ${expiring.name}`,clientId:expiring.id,birthYear:year-42};return {group:'agents',roleId:agent.id,name:agent.name,topic:'contract',clientId:expiring.id,reason:`${agent.name} wants to discuss ${expiring.name}'s contract.`};}
    const last=safe(game.fixtures).filter(f=>f.played&&[(f.home||f.homeId),(f.away||f.awayId)].includes(game.controlledClubId)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
    if(last&&daysBetween(last.date,game.date)<=2){const home=(last.home||last.homeId)===game.controlledClubId,ours=Number(home?last.homeGoals:last.awayGoals),theirs=Number(home?last.awayGoals:last.homeGoals);if(ours<theirs){const cycle=hash(`${game.date}-${last.id||last.date}`)%3,group=['press','supporters','board'][cycle],person=contacts.find(x=>x.group===group);if(person)return {group,roleId:person.id,name:person.name,topic:group==='press'?'result':'results',reason:`${person.name} wants to discuss the latest defeat.`};}}
    if(Number(game.boardConfidence||60)<42){const person=contacts.find(x=>x.group==='board');if(person)return {group:'board',roleId:person.id,name:person.name,topic:'results',reason:'The chairman has requested a private meeting about results.'};}
    const rival=contacts.find(x=>x.group==='rivals');if(rival&&hash(`${game.date}-${rival.id}-rival-request`)%5===0)return {group:'rivals',roleId:rival.id,name:rival.name,topic:'respect',reason:`${rival.name} has asked to speak before the next meeting.`};
    const spouse=contacts.find(x=>x.group==='family');if(spouse&&String(game.date).slice(8,10)==='15')return {group:'family',roleId:spouse.id,name:spouse.name,topic:'workload',reason:`${spouse.name} wants time for a conversation away from the club.`};
    const member=staff[hash(`${game.date}-staff-request`)%Math.max(1,staff.length)];if(member)return {group:'staff',roleId:member.id,name:member.name,topic:hash(`${game.date}-${member.id}`)%2?'tactics':'selection',reason:`${member.name} has asked for a private football discussion.`};
    return null;
  }

  function dailyTick(game,previousDate){
    const s=ensure(game);s.requests=s.requests.filter(r=>!r.expires||r.expires>=game.date);
    if(s.requests.some(r=>r.status==='waiting')||s.threads.some(t=>t.open))return null;
    if(s.lastRequestDate&&daysBetween(s.lastRequestDate,game.date)<8)return null;
    const chance=hash(`${game.meta?.seed||1}-${game.date}-conversation-request`)%11;if(chance!==0)return null;
    const candidate=requestCandidate(game);if(!candidate)return null;
    const contact=contactsFor(game).find(x=>x.group===candidate.group&&String(x.id)===String(candidate.roleId))||{id:candidate.roleId,group:candidate.group,name:candidate.name,clientId:candidate.clientId};
    const profile=persona(game,candidate.group,contact),request={id:`talk-request-${hash(`${game.date}-${candidate.group}-${candidate.roleId}`)}`,date:game.date,expires:addDays(game.date,21),status:'waiting',personId:profile.personId,...candidate};
    s.requests.unshift(request);s.lastRequestDate=game.date;game.inbox=safe(game.inbox);game.inbox.unshift({id:`inbox-${request.id}`,date:game.date,from:candidate.name,subject:'Request for a conversation',body:`${candidate.reason} Open Manager → People to respond.`,read:false});return request;
  }

  function resolveRequest(game,requestId,action){
    const s=ensure(game),request=s.requests.find(r=>r.id===requestId&&r.status==='waiting');if(!request)return {ok:false,message:'That conversation request is no longer available.'};
    request.status=action==='accept'?'accepted':'declined';request.resolvedDate=game.date;
    const contact=contactsFor(game).find(x=>x.group===request.group&&String(x.id)===String(request.roleId))||{id:request.roleId,group:request.group,name:request.name,clientId:request.clientId};
    if(action==='accept'){
      let thread;if(request.group==='players'){const player=controlled(game)?.players?.find(p=>p.id===request.roleId);if(!player)return {ok:false,message:'The player is no longer at the club.'};thread=startPlayer(game,player,request.topic||'check-in',`${player.name} asked for this meeting.`);}else thread=startGeneric(game,request.group,contact,request.topic||'checkIn');
      return {ok:true,message:`Conversation started with ${request.name}.`,thread};
    }
    const profile=persona(game,request.group,contact);profile.relationship=clamp(Number(profile.relationship||50)-2);s.memories.unshift({date:game.date,personId:profile.personId,roleId:request.roleId,personName:request.name,group:request.group,topic:request.topic,topicLabel:TOPIC_LABELS[request.topic]||request.topic,result:'Meeting request declined',impact:-2});return {ok:true,message:`You declined ${request.name}'s request.`};
  }

  function memoriesFor(game,personId,limit=20){return recentMemories(game,personId,limit);}
  return {VERSION,ensure,persona,startPlayer,activePlayer,latestPlayer,respondPlayer,staffLine,startGeneric,respondGeneric,memoriesFor,contactsFor,topicFor,dailyTick,resolveRequest,_test:{fourChoices,genericImpact,openingBank,pressHeadline,applyGroupConsequences}};
})();
