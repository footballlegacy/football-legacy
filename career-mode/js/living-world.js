window.FLLivingWorld = (() => {
  const data=window.FLLivingWorldData||{};
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const seeded=seed=>{let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
  const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
  const yearOf=date=>Number(String(date||'1888').slice(0,4))||1888;
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const clubById=(g,id)=>(g.clubs||[]).find(c=>c.id===id);
  const controlled=g=>clubById(g,g.controlledClubId);
  const allDomesticPlayers=g=>(g.clubs||[]).flatMap(c=>(c.players||[]).map(p=>({p,c,league:null})));
  const allForeignPlayers=g=>window.FLWorldFootball?FLWorldFootball.players(g).map(x=>({p:x.p,c:x.c,league:x.league})):[];
  const allPlayers=g=>[...allDomesticPlayers(g),...allForeignPlayers(g)];
  const historyPush=(g,row)=>{g.history=Array.isArray(g.history)?g.history:[];if(!g.history.some(x=>x.id===row.id))g.history.push(row)};
  const inbox=(g,from,subject,body,id=`living-${Date.now()}-${Math.floor(Math.random()*9999)}`)=>{g.inbox=Array.isArray(g.inbox)?g.inbox:[];g.inbox.unshift({id,date:g.date,from,subject,body,read:false});};

  function ensurePlayer(game,p,club){
    if(!p||typeof p!=='object')return p;
    const r=seeded(hash(`${game.meta?.seed||1}-${p.id}-career-profile`)),pp=p.personalityProfile||(p.personalityProfile={});
    p.nationality=p.nationality||'English';
    ['professionalism','ambition','loyalty','leadership','bigMatches','consistency','injuryProneness','temperament','teamwork','determination','adaptability'].forEach(k=>{if(!Number.isFinite(Number(pp[k])))pp[k]=25+Math.floor(r()*75)});
    if(!Number.isFinite(Number(pp.resilience)))pp.resilience=25+Math.floor(r()*75);
    if(!Number.isFinite(Number(pp.confidenceStability)))pp.confidenceStability=25+Math.floor(r()*75);
    if(!Number.isFinite(Number(p.ceiling)))p.ceiling=Math.max(Number(p.ability)||40,Number(p.potential)||60);
    if(!Number.isFinite(Number(p.talentCap)))p.talentCap=clamp(p.ceiling+Math.floor(r()*8)-3,p.ability||30,99);
    if(!Number.isFinite(Number(p.developmentLuck)))p.developmentLuck=Math.round((r()-.5)*20);
    if(!p.careerArc)p.careerArc=pick(['prodigy','steady','steady','steady','late-bloomer','volatile','injury-risk','relentless'],r);
    if(!p.careerRecordProfile){
      const recordR=seeded(hash(`${game.meta?.seed||1}-${p.id}-career-record-profile`)),quality=Math.max(Number(p.ability)||0,Number(p.ceiling)||0,Number(p.talentCap)||0),attacker=['CF','IF','W'].includes(p.position),elite=quality>=86,exceptional=quality>=93||Boolean(p.legendArchetype);
      const roll=recordR();
      if(exceptional&&roll<.24)p.careerRecordProfile='all-time';
      else if(attacker&&elite&&roll<.16)p.careerRecordProfile='goal-machine';
      else if((elite||p.careerArc==='relentless')&&roll<.10)p.careerRecordProfile='ironman';
      else p.careerRecordProfile='standard';
    }
    if(p.careerRecordProfile==='all-time')p.careerArc='relentless';
    if(!Number.isFinite(Number(p.breakthroughAge)))p.breakthroughAge=p.careerArc==='prodigy'?17+Math.floor(r()*3):p.careerArc==='late-bloomer'?25+Math.floor(r()*5):20+Math.floor(r()*5);
    p.injuryHistory=Array.isArray(p.injuryHistory)?p.injuryHistory:[];
    p.careerStory=Array.isArray(p.careerStory)?p.careerStory:[];
    p.staffPotential=p.staffPotential||pick(['Coach','Scout','Assistant Manager','Youth Coach','Club Secretary'],r);
    p.attributes=p.attributes||currentAttributes(p);
    return p;
  }

  function ensure(game){
    game.livingWorld=game.livingWorld&&typeof game.livingWorld==='object'?game.livingWorld:{};
    const w=game.livingWorld;
    w.version='0.24.4';w.decisions=Array.isArray(w.decisions)?w.decisions:[];w.resolvedDecisions=Array.isArray(w.resolvedDecisions)?w.resolvedDecisions:[];
    w.boardTalks=Array.isArray(w.boardTalks)?w.boardTalks:[];w.pressHistory=Array.isArray(w.pressHistory)?w.pressHistory:[];w.governanceHistory=Array.isArray(w.governanceHistory)?w.governanceHistory:[];
    w.clubIdentity=w.clubIdentity||{kitEra:'Traditional',badgeEra:'Founding crest',officialName:controlled(game)?.name||'Club',sponsors:[],manufacturer:null,philosophies:[],kitHistory:[],badgeHistory:[]};
    w.clubIdentity.kitHistory=Array.isArray(w.clubIdentity.kitHistory)?w.clubIdentity.kitHistory:[];
    w.clubIdentity.badgeHistory=Array.isArray(w.clubIdentity.badgeHistory)?w.clubIdentity.badgeHistory:[];
    const identityClub=controlled(game);w.clubIdentity.design=w.clubIdentity.design||{primary:identityClub?.primary||'#7b1d2a',secondary:identityClub?.secondary||'#eeeade',kitPattern:identityClub?.kitPattern||'plain',badgeShape:identityClub?.badgeShape||'shield',from:yearOf(game.date)};
    w.international=w.international||{nations:{},homeChampionship:[],worldCups:[],euros:[],rankings:[],lastSimulatedYear:1887};
    w.globalMarkets=w.globalMarkets||{history:[],processedYears:[]};w.talentHistory=Array.isArray(w.talentHistory)?w.talentHistory:[];
    w.seasonExperience=w.seasonExperience||null;w.managerService=w.managerService||{};w.ui=w.ui||{internationalView:'overview'};
    (game.clubs||[]).forEach(c=>{
      c.staff=Array.isArray(c.staff)?c.staff:[];
      c.legacyEvents=Array.isArray(c.legacyEvents)?c.legacyEvents:[];
      c.heritage=c.heritage&&typeof c.heritage==='object'?c.heritage:{culture:{attacking:50,resilience:50,youth:50,loyalty:50,giantKilling:45},traditions:[],famousMatches:[]};
      c.heritage.culture=c.heritage.culture||{attacking:50,resilience:50,youth:50,loyalty:50,giantKilling:45};
      c.heritage.traditions=Array.isArray(c.heritage.traditions)?c.heritage.traditions:[];
      c.heritage.famousMatches=Array.isArray(c.heritage.famousMatches)?c.heritage.famousMatches:[];
      (c.players||[]).forEach(p=>ensurePlayer(game,p,c));
    });
    if(window.FLWorldFootball)allForeignPlayers(game).forEach(x=>ensurePlayer(game,x.p,x.c));
    game.managerCareer=game.managerCareer||{view:'overview',timeline:[],honours:[],relationships:{board:game.boardConfidence||60,supporters:58,players:60,press:45}};
    game.managerCareer.timeline=Array.isArray(game.managerCareer.timeline)?game.managerCareer.timeline:[];game.managerCareer.honours=Array.isArray(game.managerCareer.honours)?game.managerCareer.honours:[];
    game.managerCareer.relationships=game.managerCareer.relationships||{board:game.boardConfidence||60,supporters:58,players:60,press:45};
    game.managerCareer.pressReputation=game.managerCareer.pressReputation||'Unknown to the press';
    game.version='0.22.6';
    return w;
  }

  function currentAttributes(p){
    const ability=Number(p.ability)||50,seed=hash(`${p.id}-${p.position}-attributes`),r=seeded(seed);
    const positional={
      GK:{pace:-18,shooting:-30,passing:-2,dribbling:-15,defending:7,physical:4,handling:10,reflexes:12,positioning:9,vision:-1,stamina:-4,technique:-5},
      FB:{pace:5,shooting:-10,passing:1,dribbling:0,defending:7,physical:4,handling:-30,reflexes:-10,positioning:6,vision:0,stamina:7,technique:1},
      HB:{pace:-1,shooting:-4,passing:6,dribbling:1,defending:6,physical:4,handling:-30,reflexes:-10,positioning:7,vision:7,stamina:6,technique:4},
      IF:{pace:3,shooting:7,passing:7,dribbling:8,defending:-9,physical:-1,handling:-30,reflexes:-10,positioning:5,vision:8,stamina:2,technique:9},
      CF:{pace:4,shooting:11,passing:-1,dribbling:4,defending:-15,physical:7,handling:-30,reflexes:-10,positioning:10,vision:0,stamina:2,technique:4},
      W:{pace:11,shooting:3,passing:5,dribbling:11,defending:-12,physical:-4,handling:-30,reflexes:-10,positioning:3,vision:5,stamina:4,technique:8}
    }[p.position]||{};
    const out={};
    ['pace','shooting','passing','dribbling','defending','physical','handling','reflexes','positioning','vision','stamina','technique'].forEach(k=>out[k]=clamp(Math.round(ability+(positional[k]||0)+(r()-.5)*10),20,99));
    return out;
  }

  function potentialAssessment(game,p,club){
    ensurePlayer(game,p,club);const pp=p.personalityProfile||{},age=Number(p.age)||20,apps=Number(p.careerTotals?.appearances||0)+Number(p.appearances||0);
    const facility=Number(club?.facilities?.youth||club?.youthGenerationQuality/20||2),confidence=clamp(28+(age-15)*5+Math.min(25,apps/8)+facility*5,25,96);
    const r=seeded(hash(`${game.meta?.seed||1}-${p.id}-${Math.floor(yearOf(game.date)/2)}-potential-report`)),error=Math.round((r()-.5)*2*(confidence>=80?1:confidence>=60?3:confidence>=40?6:9));
    const mentality=((pp.professionalism||50)+(pp.determination||50)+(pp.resilience||50))/3;
    const injuryDrag=(pp.injuryProneness||40)>75?2:0,trajectory=mentality>=78?2:mentality<=38?-2:0;
    const estimate=clamp((p.talentCap||p.ceiling||p.potential||p.ability)+error+trajectory-injuryDrag,p.ability||30,99);
    const bands=data.potentialBands||[];const band=[...bands].reverse().find(x=>estimate>=x.min)||bands[0];
    return {...band,estimate,confidence,label:band?.label||'Unclear potential',short:band?.short||'UNCLEAR',description:band?.description||'The staff remain unsure.',confidenceLabel:confidence>=82?'High confidence':confidence>=60?'Reasonable confidence':confidence>=40?'Early assessment':'Very uncertain'};
  }

  function developmentYear(game,p,club,baseChange){
    ensurePlayer(game,p,club);const r=seeded(hash(`${game.meta?.seed||1}-${p.id}-${yearOf(game.date)}-development`)),pp=p.personalityProfile||{},age=Number(p.age)||20;
    const mentality=((pp.professionalism||50)*.35+(pp.determination||50)*.35+(pp.resilience||50)*.2+(pp.ambition||50)*.1-50)/28;
    let arc=0;if(p.careerArc==='prodigy')arc=age<=21?1:age>28?-.4:0;if(p.careerArc==='late-bloomer')arc=age<24?-.7:age<=30?1.1:0;if(p.careerArc==='relentless')arc=.75;if(p.careerArc==='volatile')arc=(r()-.5)*2.4;
    let injuryLoss=0,ceilingShift=0,story=null;const risk=clamp(((pp.injuryProneness||40)-20)/220+(p.careerArc==='injury-risk'?.06:0),.01,.34);
    if(r()<risk){const major=r()<.13,severity=major?2+Math.floor(r()*4):1;injuryLoss=severity;ceilingShift=major?-Math.ceil(severity/2):0;const names=major?['Anterior knee ligament damage','Severe ankle fracture','Achilles rupture','Complex leg fracture']:['Muscle strain','Twisted knee','Ankle injury','Back problem'];const name=pick(names,r);p.injuryHistory.push({season:String(yearOf(game.date)-1),name,severity:major?'Major':'Moderate',abilityLoss:severity});story=`${name} interrupted his development.`;}
    if(r()<.08&&mentality>1.2){ceilingShift+=1;story=story||'Exceptional training and resilience raised expectations.'}
    if(r()<.055&&mentality<-1){ceilingShift-=1;story=story||'Poor application caused staff to lower their long-term expectations.'}
    p.talentCap=clamp((p.talentCap||p.ceiling)+ceilingShift,p.ability,99);p.ceiling=clamp(Math.min(p.talentCap,p.ceiling+ceilingShift),p.ability,99);
    const change=Math.round(baseChange+mentality+arc+(Number(p.developmentLuck)||0)/25-injuryLoss);
    if(story){p.careerStory.push({date:game.date,title:'Development turning point',text:story});if(p.careerStory.length>30)p.careerStory=p.careerStory.slice(-30)}
    return {change,ceilingShift,injuryLoss,story};
  }

  function queueDecision(game,decision){
    const w=ensure(game);if(w.decisions.some(x=>x.id===decision.id)||w.resolvedDecisions.some(x=>x.id===decision.id))return null;
    const row={date:game.date,blocking:true,targetTab:'board',...decision,status:'pending'};w.decisions.push(row);
    inbox(game,row.from||'Club Secretary',row.title,row.detail,`decision-${row.id}`);return row;
  }
  function pending(game,type=null){const w=ensure(game);return w.decisions.filter(x=>x.status==='pending'&&(!type||x.type===type)).sort((a,b)=>a.date.localeCompare(b.date));}
  function nextBlocking(game){return pending(game).find(x=>x.blocking!==false)||null;}

  function applyRelationship(game,key,delta){const rel=game.managerCareer.relationships||(game.managerCareer.relationships={board:game.boardConfidence||60,supporters:58,players:60,press:45});rel[key]=clamp((rel[key]||50)+delta,0,100);if(key==='board')game.boardConfidence=clamp((game.boardConfidence||50)+delta,0,100);}
  function applyGenericEffects(game,effects={}){
    const c=controlled(game),b=game.board;
    if(effects.board)applyRelationship(game,'board',effects.board);if(effects.supporters)applyRelationship(game,'supporters',effects.supporters);if(effects.players)applyRelationship(game,'players',effects.players);if(effects.press)applyRelationship(game,'press',effects.press);
    ['chairman','treasurer','football','local','investor'].forEach(k=>{if(effects[k]&&b?.members){const m=b.members.find(x=>x.id===k);if(m)m.approval=clamp(m.approval+effects[k],0,100)}});
    if(effects.income)game.finances.income=Math.max(0,(game.finances.income||0)+effects.income);
    if(effects.youth&&c){c.facilities=c.facilities||{};c.facilities.youth=clamp((c.facilities.youth||2)+Math.sign(effects.youth),1,10);c.youthGenerationQuality=clamp((c.youthGenerationQuality||50)+effects.youth,10,100)}
    if(effects.medical&&c){c.facilities=c.facilities||{};c.facilities.medical=clamp((c.facilities.medical||2)+Math.sign(effects.medical),1,10)}
    if(effects.stadium&&c)c.capacity=Math.round((c.capacity||8000)*(1+effects.stadium/100));
    if(effects.control)c.managerRecruitmentControl=clamp((c.managerRecruitmentControl||20)+effects.control,0,100);
    if(effects.identity&&!ensure(game).clubIdentity.philosophies.includes(effects.identity))ensure(game).clubIdentity.philosophies.push(effects.identity);
  }

  function availableBoardTopics(game){
    const w=ensure(game),year=yearOf(game.date),trust=game.boardConfidence||50;return (data.boardTopics||[]).map(t=>{const last=[...w.boardTalks].reverse().find(x=>x.topicId===t.id),ready=!last||new Date(`${game.date}T12:00:00Z`)-new Date(`${last.date}T12:00:00Z`)>=Number(t.cooldown||180)*86400000;return {...t,locked:year<(t.minYear||1888)||trust<(t.minTrust||0)||!ready,lockReason:year<(t.minYear||1888)?`Available from ${t.minYear}`:trust<(t.minTrust||0)?`Requires ${t.minTrust}% board confidence`:!ready?'Discussed recently':''}});}
  function resolveBoardTalk(game,topicId,optionId){
    const w=ensure(game),topic=(data.boardTopics||[]).find(x=>x.id===topicId),option=topic?.options.find(x=>x.id===optionId);if(!topic||!option)return {ok:false,message:'Conversation unavailable.'};
    const unlocked=availableBoardTopics(game).find(x=>x.id===topicId);if(unlocked?.locked)return {ok:false,message:unlocked.lockReason};
    const high=(game.boardConfidence||50)>=70,reply=high?option.replyHigh:option.replyLow;applyGenericEffects(game,option.effects);const row={date:game.date,topicId,title:topic.title,choice:option.label,tone:option.tone,reply};w.boardTalks.push(row);
    game.board?.log?.push({date:game.date,text:`Board discussion: ${topic.title}. You chose “${option.label}”. ${reply}`});
    inbox(game,'Club Chairman',`Board discussion: ${topic.title}`,reply,`board-talk-${topic.id}-${game.date}`);return {ok:true,message:reply};
  }

  function eraKey(year){return year<1946?'early':year<1992?'mid':'modern'};
  function afterControlledMatch(game,fixture,record){
    const w=ensure(game),ours=fixture.home===game.controlledClubId?fixture.homeGoals:fixture.awayGoals,theirs=fixture.home===game.controlledClubId?fixture.awayGoals:fixture.homeGoals,r=seeded(hash(`${game.meta?.seed||1}-${fixture.id}-press`));
    const question=pick(data.pressQuestions?.[eraKey(yearOf(game.date))]||[],r),responses=[...(data.pressResponses||[])].sort(()=>r()-.5).slice(0,4);
    const conference={id:`press-${fixture.id}`,date:game.date,fixtureId:fixture.id,result:ours>theirs?'win':ours===theirs?'draw':'loss',question,responses,status:'pending',blocking:false};
    if(!w.pressHistory.some(x=>x.id===conference.id))w.pressHistory.unshift(conference);
    inbox(game,'Football Press Room','Post-match press conference',question,conference.id);return conference;
  }
  function answerPress(game,id,responseId){
    const w=ensure(game),row=w.pressHistory.find(x=>x.id===id),response=row?.responses?.find(x=>x.id===responseId);if(!row||row.status!=='pending'||!response)return {ok:false};
    row.status='answered';row.answer=response.label;row.tone=response.tone;applyGenericEffects(game,response.effects);const rel=game.managerCareer.relationships.press||50;game.managerCareer.pressReputation=rel>=75?'Media favourite':rel>=60?'Respected communicator':rel>=42?'Mixed press relationship':rel>=25?'Distrusted by journalists':'Openly hostile relationship';
    const original=(game.inbox||[]).find(x=>x.id===id);if(original){original.read=true;original.responded=true;}inbox(game,'Football Press Room','Your comments are published',`${response.label}. ${response.tone}.`,`press-response-${id}`);return {ok:true,message:`Response published: ${response.label}`};
  }

  function scheduleGovernance(game,previousDate,currentDate){
    (data.governanceVotes||[]).filter(v=>v.date>previousDate&&v.date<=currentDate).forEach(v=>queueDecision(game,{id:`governance-${v.id}`,type:'governance',targetTab:'board',title:v.title,detail:v.detail,from:'Football League Office',options:v.options.map((label,i)=>({id:`vote-${i}`,label,effect:i===0?'Take a clear public position':i===1?'Support the alternative position':'Seek compromise'})),payload:{vote:v},blocking:true}));
  }

  const warPeriods=[{start:'1914-08-05',fromYear:1914,toYear:1918,warId:'ww1',name:'First World War',endDate:'1918-11-11'},{start:'1939-09-04',fromYear:1939,toYear:1945,warId:'ww2',name:'Second World War',endDate:'1945-05-08'}];
  function warDecision(game,x,historicalStart=false){
    if(!game.manager)return null;const age=Number(game.manager.age)||35;if(age<18||age>65)return null;
    return queueDecision(game,{id:`manager-service-${x.warId}`,type:'war-service',targetTab:'manager',title:historicalStart?`Your position during the ${x.name}`:`Your response to the ${x.name}`,detail:historicalStart?'Before taking this appointment, choose the wartime background that belongs in your manager history. This affects reputation and relationships but does not remove control of the career.':'Players and supporters are waiting to see whether their manager will volunteer, accept home service or remain with the club.',from:'Club Chairman',blocking:true,payload:{...x,historicalStart},options:[
      {id:'volunteer',label:historicalStart?'Returned from overseas service':'Volunteer for overseas service',effect:'Major public respect; an assistant handled daily club work'},
      {id:'conscripted',label:historicalStart?'Recently released from military duty':'Remain until formally called',effect:'Service is recorded in the permanent manager timeline'},
      {id:'home',label:historicalStart?'Home service or essential war work':'Seek home or training service',effect:'Served while remaining closer to the club'},
      {id:'stay',label:historicalStart?'Continued in football administration':'Remain with the club',effect:'Kept clubs and temporary competitions operating during wartime'}
    ]});
  }
  function scheduleWarService(game,previousDate,currentDate){warPeriods.filter(x=>x.start>previousDate&&x.start<=currentDate).forEach(x=>warDecision(game,x,false));}
  function ensureHistoricalWarStart(game){
    const year=yearOf(game.date),x=warPeriods.find(w=>year>=w.fromYear&&year<=w.toYear);if(!x)return null;const w=ensure(game);if(w.managerService?.[x.warId]||w.decisions.some(d=>d.id===`manager-service-${x.warId}`)||w.resolvedDecisions.some(d=>d.id===`manager-service-${x.warId}`))return null;return warDecision(game,x,true);
  }

  function queueWarReturnDecision(game,{warId,player,club,injury}){
    if(!game||club?.id!==game.controlledClubId)return null;ensure(game);return queueDecision(game,{id:`war-return-${warId}-${player.id}`,type:'war-return',targetTab:'board',title:`A future at the club for ${player.name}`,detail:`${player.name} has returned with ${injury.name.toLowerCase()} and cannot resume a normal playing career. Decide how the club should treat him.`,from:'Club Secretary',blocking:true,payload:{warId,player:{id:player.id,name:player.name,age:player.age,position:player.position,staffPotential:player.staffPotential||'Coach',careerTotals:{...(player.careerTotals||{})}},clubId:club.id,injury},options:[
      {id:'coach',label:'Offer a coaching position',effect:'Retain his experience and strengthen player trust'},
      {id:'scout',label:'Offer a scouting position',effect:'Create a new career travelling and judging players'},
      {id:'testimonial',label:'Hold a testimonial and lifetime role',effect:'Costs money but creates a lasting club story'},
      {id:'release',label:'Pay compensation and release him',effect:'Financially clean, but supporters may judge the club harshly'}
    ]});
  }

  function sponsorOptions(game,year){
    const c=controlled(game),r=seeded(hash(`${game.meta?.seed||1}-${c.id}-${year}-sponsors`)),era=year<1995?'industrial':year<2010?'corporate':year<2020?'global':'digital';
    const pools={industrial:['Midland Rail Works','Crown Brewery','County Engineering','National Tyres'],corporate:['Britannia Insurance','National Telecom','Grandstand Electronics','Heritage Bank'],global:['AeroWorld','Vertex Mobile','Union Airlines','GlobalBet'],digital:['Northstar Streaming','Pulse Technology','Atlas Markets','GreenGrid Energy']};
    return pick(pools[era],r) && pools[era].slice(0,4).map((name,i)=>({id:`sponsor-${i}`,label:name,effect:`£${Math.round((80+year-1978)*(.8+i*.25))} annual income · ${i===0?'local goodwill':i===3?'highest commercial return':'balanced reputation'}`,payload:{name,value:Math.round((80+year-1978)*(.8+i*.25)),supporter:i===0?4:i===3?-3:0}}));
  }
  function manufacturerOptions(game,year){
    const c=controlled(game),r=seeded(hash(`${game.meta?.seed||1}-${c.id}-${year}-manufacturer`)),local=pick(['County Sportswear','Riverside Athletic Works','Albion Outfitters','Civic Sports'],r),heritage=pick(['Crown Athletic','Heritage Eleven','Foundry Football','Terrace & Field'],r),global=pick(['Vertex Sport','Aero Athletic','Northstar Kits','Union Performance'],r);
    return [
      {id:'local',label:local,effect:'Lower income · strong local goodwill',payload:{name:local,value:70+Math.round((year-1970)*.45),supporter:5,type:'Local manufacturer'}},
      {id:'heritage',label:heritage,effect:'Balanced deal · traditional design influence',payload:{name:heritage,value:105+Math.round((year-1970)*.65),supporter:3,type:'Heritage manufacturer'}},
      {id:'global',label:global,effect:'Largest deal · more commercial control',payload:{name:global,value:165+Math.round((year-1970)*.9),supporter:-1,type:'Global manufacturer'}},
      {id:'board',label:'Let the board negotiate',effect:'The directors choose the strongest overall package',payload:{name:'Board selection',value:0,supporter:0,type:'Board selection'}}
    ];
  }

  function annualClubDecision(game,startYear){
    const w=ensure(game),c=controlled(game),trust=game.boardConfidence||50;if(!c)return;
    const candidates=[];
    if(startYear>=1951&&startYear<=1965&&!c.floodlights)candidates.push({id:`floodlights-${startYear}`,type:'club-future',title:'Install permanent floodlights',detail:'The board wants your view on evening football and the cost of lighting the ground.',options:[{id:'install',label:'Install floodlights now',effect:'Spend club funds and unlock evening fixtures locally'},{id:'trial',label:'Rent temporary lighting first',effect:'Cheaper trial with slower progress'},{id:'delay',label:'Delay the project',effect:'Protect finances but fall behind modern clubs'}],payload:{kind:'floodlights'}});
    if(startYear>=1978&&startYear%3===0)candidates.push({id:`sponsor-choice-${startYear}`,type:'club-future',title:'Choose the shirt sponsor',detail:trust>=68?'The board trusts you to recommend the club’s commercial partner.':'The board will consider your preference but may prioritise income.',options:sponsorOptions(game,startYear),payload:{kind:'sponsor'}});
    if(startYear>=1970&&startYear%5===0)candidates.push({id:`manufacturer-choice-${startYear}`,type:'club-future',title:'Select the kit manufacturer',detail:trust>=70?'The directors invite you into final negotiations with the manufacturers.':'You can advise the board, although the commercial committee retains the final decision.',options:manufacturerOptions(game,startYear),payload:{kind:'manufacturer'}});
    if(startYear%4===0)candidates.push({id:`kit-${startYear}`,type:'club-future',title:'Approve next season’s kit direction',detail:'Designers have presented different ways to carry the club colours into the new season.',options:[{id:'traditional',label:'Keep the traditional design',effect:'Strong continuity and older supporter approval'},{id:'modern',label:'Approve a modern variation',effect:'Fresh identity with a mixed reaction'},{id:'bold',label:'Choose the bold experimental kit',effect:'Commercial attention and a risk of backlash'},{id:'board',label:'Leave the choice to the board',effect:'Avoid responsibility and preserve political capital'}],payload:{kind:'kit'}});
    if(startYear>=1905&&startYear%20===5)candidates.push({id:`badge-${startYear}`,type:'club-future',title:'Review the club badge',detail:'The committee believes the crest may need to change for a new age.',options:[{id:'preserve',label:'Preserve the historic badge',effect:'Protect tradition'},{id:'refine',label:'Refine the existing crest',effect:'Modernise without abandoning identity'},{id:'redesign',label:'Commission a complete redesign',effect:'Create a new visual era'},{id:'supporters',label:'Put designs to a supporter vote',effect:'Slower, but strengthens supporter ownership'}],payload:{kind:'badge'}});
    if(startYear>=1925&&startYear%35===0)candidates.push({id:`name-${startYear}`,type:'club-future',title:'Proposed club name change',detail:'Commercial directors believe a different name could broaden the club’s reach. Traditionalists are furious.',options:[{id:'reject',label:'Reject any name change',effect:'Strong supporter approval'},{id:'formal',label:'Allow a small formal change',effect:'Limited modernisation'},{id:'commercial',label:'Back the commercial name',effect:'More income and a major identity risk'},{id:'vote',label:'Let members and supporters vote',effect:'Share responsibility and delay the decision'}],payload:{kind:'name'}});
    if(candidates.length){const r=seeded(hash(`${game.meta?.seed||1}-${startYear}-club-future`)),chosen=pick(candidates,r);queueDecision(game,{...chosen,id:`club-${chosen.id}`,targetTab:'board',from:'Club Chairman',blocking:true});}
  }

  function activeNations(game,year){return (data.nations||[]).filter(n=>n.from<=year).map(n=>{const state=ensure(game).international.nations[n.id]||(ensure(game).international.nations[n.id]={...n,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,trophies:[]});return state});}
  function nationPool(game,nation){return allPlayers(game).filter(x=>(x.p.nationality||'English')===nation.nationality&&x.p.status!=='retired'&&x.p.status!=='deceased').sort((a,b)=>(b.p.ability||0)-(a.p.ability||0));}
  function internationalSquad(game,nation,limit=23){return nationPool(game,nation).slice(0,limit).map(x=>({id:x.p.id,name:x.p.name,position:x.p.position,age:x.p.age,ability:x.p.ability,clubId:x.c?.id||null,club:x.c?.name||'Unattached',league:x.league?.name||'English football'}));}
  function nationRating(game,nation){const pool=nationPool(game,nation).slice(0,18),avg=pool.length?pool.reduce((s,x)=>s+(x.p.ability||50),0)/pool.length:nation.strength;return clamp(avg*.75+nation.strength*.25,45,96)};
  function playInternational(game,a,b,seedText){const r=seeded(hash(`${game.meta?.seed||1}-${seedText}`)),ra=nationRating(game,a),rb=nationRating(game,b),goals=rating=>{let g=0;for(let i=0;i<5;i++)if(r()<clamp(.20+(rating-65)*.006,.08,.5))g++;return g};let ag=goals(ra+.8),bg=goals(rb);if(ag===bg&&seedText.includes('knockout')){if(r()<ra/(ra+rb))ag++;else bg++;}return {a:a.id,b:b.id,aName:a.name,bName:b.name,aGoals:ag,bGoals:bg,aRating:ra,bRating:rb}};
  function awardNationStats(a,b,m){a.played++;b.played++;a.gf+=m.aGoals;a.ga+=m.bGoals;b.gf+=m.bGoals;b.ga+=m.aGoals;if(m.aGoals>m.bGoals){a.won++;b.lost++}else if(m.aGoals<m.bGoals){b.won++;a.lost++}else{a.drawn++;b.drawn++}}
  function homeNationClubs(game){const rows=(game.clubs||[]).filter(c=>c.leagueActive!==false);if(window.FLWorldFootball){const scotland=FLWorldFootball.league(game,'scotland');if(scotland)rows.push(...scotland.clubs.filter(c=>c.worldActivatedYear!=null));}return rows;}
  function ensureHomeNationDepth(game,year){const nations=activeNations(game,year).filter(n=>['Scottish','Welsh','Irish','Northern Irish'].includes(n.nationality)),clubs=homeNationClubs(game);if(!clubs.length)return;for(const nation of nations){let pool=nationPool(game,nation);const r=seeded(hash(`${game.meta?.seed||1}-${nation.id}-${year}-national-depth`));while(pool.length<20){const club=clubs[Math.floor(r()*clubs.length)],age=18+Math.floor(r()*12),ability=clamp(Math.round(nation.strength-18+r()*15),42,82),ceiling=clamp(ability+3+Math.floor(r()*12),ability,90),id=`national-${nation.id}-${year}-${pool.length}-${Math.floor(r()*999999)}`,position=pick(['GK','FB','FB','HB','HB','IF','CF','W'],r),p={id,name:nameForNationality(nation.nationality,r),nationality:nation.nationality,clubId:club.id,position,age,condition:92,form:'—',ability,ceiling,talentCap:ceiling,potential:Math.round(ability+(ceiling-ability)*.65),developmentCurve:pick(['steady','steady','late','volatile'],r),careerArc:pick(['steady','steady','late-bloomer','relentless'],r),wage:window.FLEconomy?FLEconomy.recommendedWage(game,{ability,age},club,'First Team'):Math.max(1,Math.floor(ability/18)),appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},generatedYear:year,nationalDepth:true};ensurePlayer(game,p,club);club.players=Array.isArray(club.players)?club.players:[];club.players.push(p);pool.push({p,c:club,league:null});}}
  }
  function simulateHomeChampionship(game,year){
    if(year>1984)return null;
    ensureHomeNationDepth(game,year);const ints=ensure(game).international,ids=year<1922?['england','scotland','wales','ireland']:['england','scotland','wales','northern-ireland','ireland'],teams=activeNations(game,year).filter(n=>ids.includes(n.id));if(teams.length<4||ints.homeChampionship.some(x=>x.year===year))return null;
    const table=teams.map(n=>({id:n.id,name:n.name,p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0})),matches=[];for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++){const m=playInternational(game,teams[i],teams[j],`home-${year}-${i}-${j}`);matches.push(m);awardNationStats(teams[i],teams[j],m);const a=table[i],b=table[j];a.p++;b.p++;a.gf+=m.aGoals;a.ga+=m.bGoals;b.gf+=m.bGoals;b.ga+=m.aGoals;if(m.aGoals>m.bGoals){a.w++;b.l++;a.pts+=2}else if(m.aGoals<m.bGoals){b.w++;a.l++;b.pts+=2}else{a.d++;b.d++;a.pts++;b.pts++}}
    table.sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);const champion=teams.find(n=>n.id===table[0].id);champion.trophies.push({name:'Home Championship',year});const row={year,champion:champion.name,championId:champion.id,table,matches,squads:teams.map(n=>({nationId:n.id,nation:n.name,players:internationalSquad(game,n,22)}))};ints.homeChampionship.push(row);return row;
  }
  function tournamentSize(kind,year,available){
    if(kind==='world'){
      const size=year===1930?13:year===1938?15:(year===1934||year>=1954&&year<=1978)?16:year===1950?13:year>=2026?48:year>=1998?32:year>=1982?24:16;
      return Math.min(available,size);
    }
    return Math.min(available,year>=2016?24:year>=1996?16:year>=1980?8:4);
  }
  function simulateTournament(game,kind,year){
    const ints=ensure(game).international,list=kind==='world'?ints.worldCups:ints.euros;if(list.some(x=>x.year===year))return null;if(kind==='world'&&(year<1930||(year-1930)%4!==0||year===1942||year===1946))return null;if(kind==='euro'&&(year<1960||(year-1960)%4!==0))return null;
    let teams=activeNations(game,year);if(kind==='euro')teams=teams.filter(n=>!['brazil','argentina','uruguay','usa','mexico','japan'].includes(n.id));teams=[...teams].sort((a,b)=>nationRating(game,b)-nationRating(game,a)).slice(0,tournamentSize(kind,year,teams.length));if(teams.length<4)return null;
    let round=teams.slice(),matches=[];while(round.length>1){const next=[];for(let i=0;i<round.length;i+=2){const a=round[i],b=round[i+1];if(!b){next.push(a);continue}const m=playInternational(game,a,b,`${kind}-${year}-knockout-${round.length}-${i}`);matches.push(m);awardNationStats(a,b,m);next.push(m.aGoals>m.bGoals?a:b)}round=next}const champion=round[0],name=kind==='world'?'World Cup':'European Championship';champion.trophies.push({name,year});const row={year,name,champion:champion.name,championId:champion.id,participants:teams.map(x=>x.name),squads:teams.map(n=>({nationId:n.id,nation:n.name,players:internationalSquad(game,n,23)})),matches,formatSize:teams.length};list.push(row);game.news.unshift({date:`${year}-07-01`,headline:`${champion.name} win the ${name}`});return row;
  }
  function updateInternationalRankings(game,year){const ints=ensure(game).international,rows=activeNations(game,year).map(n=>({id:n.id,name:n.name,rating:Math.round(nationRating(game,n)*10)/10,played:n.played,trophies:n.trophies.length})).sort((a,b)=>b.rating-a.rating);ints.rankings=rows;return rows}
  function simulateInternationals(game,startYear){const endingYear=startYear-1,ints=ensure(game).international;if(endingYear<=ints.lastSimulatedYear)return;for(let y=ints.lastSimulatedYear+1;y<=endingYear;y++){simulateHomeChampionship(game,y);simulateTournament(game,'world',y);simulateTournament(game,'euro',y);updateInternationalRankings(game,y)}ints.lastSimulatedYear=endingYear;}

  function nameForNationality(nat,r){const pools=window.FLTimelineData?.namePools||{},pool=pools[nat]||pools.English||{first:FLData.firstNames,last:FLData.lastNames};return `${pick(pool.first,r)} ${pick(pool.last,r)}`}
  function eligibleTalentClubs(game,nationality){
    if(['English','Welsh','Irish','Northern Irish'].includes(nationality))return homeNationClubs(game);
    if(!window.FLWorldFootball)return[];const rows=[];FLWorldFootball.leagues(game).forEach(l=>{if(l.nationality===nationality)l.clubs.filter(c=>c.worldActivatedYear!=null).forEach(c=>rows.push(c))});return rows;
  }
  function seedEraTalent(game,startYear){
    const w=ensure(game),r=seeded(hash(`${game.meta?.seed||1}-${startYear}-era-talent`));if(w.talentHistory.some(x=>x.year===startYear))return[];
    const active=activeNations(game,startYear).filter(n=>eligibleTalentClubs(game,n.nationality).length),count=2+(r()<.7?1:0)+(r()<.22?1:0),made=[];
    for(let i=0;i<count;i++){const nation=pick(active,r),clubs=eligibleTalentClubs(game,nation.nationality),club=[...clubs].sort((a,b)=>(b.stature||b.powerRating||b.strength||0)-(a.stature||a.powerRating||a.strength||0))[Math.floor(r()*Math.min(7,clubs.length))]||clubs[0];if(!club)continue;const roll=r(),cap=roll<.055?98+Math.floor(r()*2):roll<.19?95+Math.floor(r()*3):roll<.5?92+Math.floor(r()*3):88+Math.floor(r()*4),prodigy=r()<.14,age=15+Math.floor(r()*4),ability=prodigy?70+Math.floor(r()*12):48+Math.floor(r()*18),position=pick(['GK','FB','HB','IF','CF','W'],r),id=`era-star-${startYear}-${i}-${Math.floor(r()*999999)}`;
      const p={id,name:nameForNationality(nation.nationality,r),nationality:nation.nationality,clubId:club.id,position,age,condition:95,form:'—',ability:clamp(ability,42,cap-5),ceiling:cap,talentCap:cap,potential:Math.round(ability+(cap-ability)*.68),developmentCurve:prodigy?'early':pick(['steady','steady','late','volatile'],r),careerArc:prodigy?'prodigy':pick(['steady','steady','late-bloomer','relentless','volatile','injury-risk'],r),developmentMomentum:0,personalityProfile:{professionalism:45+Math.floor(r()*55),ambition:55+Math.floor(r()*45),loyalty:20+Math.floor(r()*75),leadership:25+Math.floor(r()*75),bigMatches:50+Math.floor(r()*50),consistency:40+Math.floor(r()*60),injuryProneness:8+Math.floor(r()*82),temperament:25+Math.floor(r()*75),teamwork:35+Math.floor(r()*65),determination:45+Math.floor(r()*55),adaptability:35+Math.floor(r()*65),resilience:35+Math.floor(r()*65)},personalityLabel:cap>=98?'Rare Footballing Talent':cap>=95?'Generational Prospect':'Outstanding Prospect',wage:window.FLEconomy?FLEconomy.recommendedWage(game,{ability,age},club,'Prospect'):Math.max(1,Math.floor(ability/20)),appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},eraTalent:true,generatedYear:startYear};ensurePlayer(game,p,club);club.players.push(p);made.push({id:p.id,name:p.name,nationality:p.nationality,club:club.name,ceiling:cap,prodigy});if(cap>=98||prodigy)game.news.unshift({date:`${startYear}-07-01`,headline:`${club.name} reveal exceptional teenager ${p.name}`});}
    w.talentHistory.push({year:startYear,count:made.length,players:made});return made;
  }

  function destinationLeague(game,id){return window.FLWorldFootball?FLWorldFootball.league(game,id):null}
  function movePlayer(game,row,destClub,market,wageMultiplier){const {p,c}=row;if(!p||!c||!destClub)return false;c.players=c.players.filter(x=>x.id!==p.id);p.clubHistory=Array.isArray(p.clubHistory)?p.clubHistory:[];const current=[...p.clubHistory].reverse().find(x=>x.to==='Present');if(current)current.to=yearOf(game.date);p.clubHistory.push({club:destClub.name,from:yearOf(game.date),to:'Present',apps:0,goals:0});p.clubId=destClub.id;p.wage=window.FLEconomy?Math.round(FLEconomy.recommendedWage(game,p,destClub,'First Team')*Math.max(1,wageMultiplier)):Math.max(p.wage||1,Math.round((p.wage||5)*wageMultiplier));p.squadStatus='First Team';destClub.players.push(p);const transfer={date:game.date,playerId:p.id,player:p.name,from:c.name,to:destClub.name,fee:window.FLEconomy?Math.round(FLEconomy.playerValue(game,p,c)*Math.max(1,wageMultiplier*.7)):Math.round((p.ability||70)*20*wageMultiplier),market:market.name};ensure(game).globalMarkets.history.unshift(transfer);game.worldUI=game.worldUI||{};game.worldUI.transferHistory=Array.isArray(game.worldUI.transferHistory)?game.worldUI.transferHistory:[];game.worldUI.transferHistory.unshift(transfer);game.news.unshift({date:game.date,headline:`${p.name} joins ${destClub.name} in a major-money move`});return true}
  function richMarketUpdate(game,startYear){
    const w=ensure(game),year=startYear;if(w.globalMarkets.processedYears.includes(year))return;w.globalMarkets.processedYears.push(year);
    const historical=data.richMarkets||[],future=window.FLLegacySystems?FLLegacySystems.activeFutureMarkets(game,year):[],markets=[...historical,...future];
    markets.filter(m=>year>=m.from&&year<=m.to).forEach(m=>{const league=destinationLeague(game,m.leagueId);if(!league)return;const r=seeded(hash(`${game.meta?.seed||1}-${m.id}-${year}`)),count=m.bids[0]+Math.floor(r()*(m.bids[1]-m.bids[0]+1)),pool=allPlayers(game).filter(x=>x.c&&x.c.worldLeagueId!==m.leagueId&&x.p.status!=='retired'&&(x.p.ability||0)>=m.qualityMin&&((x.p.age||0)>=m.ageMin||r()<m.primeChance)).sort((a,b)=>(b.p.ability||0)-(a.p.ability||0));
      for(let i=0;i<Math.min(count,pool.length);i++){const shortlist=pool.slice(0,Math.min(pool.length,18)),row=shortlist[Math.floor(r()*shortlist.length)];if(row){const idx=pool.indexOf(row);if(idx>=0)pool.splice(idx,1)}const destinations=league.clubs.filter(c=>c.worldActivatedYear!=null).sort((a,b)=>(b.financialPower||b.stature||0)-(a.financialPower||a.stature||0)),dest=destinations[i%Math.max(1,Math.min(5,destinations.length))];if(!row||!dest)continue;if(row.c.id===game.controlledClubId){queueDecision(game,{id:`rich-bid-${m.id}-${year}-${row.p.id}`,type:'rich-bid',targetTab:'board',title:`Major overseas bid for ${row.p.name}`,detail:`${dest.name} have offered life-changing wages and a large fee for your ${row.p.age}-year-old ${row.p.position}.`,from:dest.name,blocking:true,payload:{playerId:row.p.id,destinationClubId:dest.id,market:m},options:[{id:'accept',label:'Accept the offer',effect:'Receive a major fee and allow the player to leave'},{id:'reject',label:'Reject it outright',effect:'Protect the squad, but the player may be unsettled'},{id:'negotiate',label:'Demand a much larger fee',effect:'The move may collapse or become exceptionally valuable'}]});}else movePlayer(game,row,dest,m,m.wageMultiplier);}
    });
  }

  function deriveHeritageTraditions(c){
    const culture=c.heritage.culture,labels=[];
    if(culture.attacking>=62)labels.push('Attacking tradition');
    if(culture.resilience>=62)labels.push('Never-say-die club');
    if(culture.youth>=62)labels.push('Academy pathway');
    if(culture.loyalty>=62)labels.push('One-club loyalty');
    if(culture.giantKilling>=58)labels.push('Cup fighters and giant-killers');
    if(!labels.length)labels.push(...Object.entries(culture).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>({attacking:'Positive football',resilience:'Hard to beat',youth:'Developing club',loyalty:'Traditional club',giantKilling:'Fearless underdogs'})[k]));
    c.heritage.traditions=[...new Set(labels)].slice(0,4);
  }
  function updateClubHeritage(game,archive,startYear){
    if(!archive)return;
    (game.clubs||[]).forEach(c=>{
      const h=c.heritage||(c.heritage={culture:{attacking:50,resilience:50,youth:50,loyalty:50,giantKilling:45},traditions:[],famousMatches:[]}),culture=h.culture;
      const row=(archive.pyramidTables||[]).flatMap(x=>x.table||[]).find(x=>x.id===c.id)||(archive.table||[]).find(x=>x.id===c.id);
      if(row){const played=Math.max(1,Number(row.played)||0),goalRate=(Number(row.gf)||0)/played,gd=(Number(row.gf)||0)-(Number(row.ga)||0);culture.attacking=clamp(culture.attacking+(goalRate>=2?3:goalRate>=1.45?1:-1),20,95);culture.resilience=clamp(culture.resilience+(Number(row.position)<=3?3:gd>0?1:Number(row.position)>=Math.max(10,(archive.table||[]).length-2)?-2:0),20,95);}
      const academy=(c.players||[]).filter(p=>Number(p.youthIntakeYear)>=startYear-5&&(Number(p.appearances)||0)>0).length;culture.youth=clamp(culture.youth+(academy>=4?3:academy>=2?1:academy===0?-1:0),20,95);
      const managerSpells=(c.managerHistory||[]).length;culture.loyalty=clamp(culture.loyalty+(managerSpells<=Math.max(1,(startYear-1887)/8)?1:-1),20,95);
      const fixtures=(archive.fixtures||[]).filter(f=>(f.homeId||f.home)===c.id||(f.awayId||f.away)===c.id);
      fixtures.forEach(f=>{const home=(f.homeId||f.home)===c.id,ours=Number(home?f.homeGoals:f.awayGoals)||0,theirs=Number(home?f.awayGoals:f.homeGoals)||0,oppId=home?(f.awayId||f.away):(f.homeId||f.home),opp=clubById(game,oppId),margin=ours-theirs,total=ours+theirs;if(margin>0&&opp&&(Number(opp.stature||opp.powerRating||opp.strength||0)>Number(c.stature||c.powerRating||c.strength||0)+8))culture.giantKilling=clamp(culture.giantKilling+2,20,95);if(margin>=5||total>=8){const id=`${archive.season}-${f.id||f.date}-${c.id}`;if(!h.famousMatches.some(x=>x.id===id)){const opponent=opp?.name||(home?f.awayName:f.homeName)||'opponents',title=margin>=5?'A historic victory':'A match nobody could forget',entry={id,season:archive.season,date:f.date,title,score:`${c.name} ${ours}–${theirs} ${opponent}`,reason:margin>=5?`${margin}-goal winning margin`:`${total}-goal classic`};h.famousMatches.unshift(entry);c.legacyEvents.unshift({id:`heritage-${id}`,year:archive.season,title,text:entry.score});}}});
      const champion=(archive.champions||[]).find(x=>x.clubId===c.id||x.club===c.name),promoted=(archive.promoted||[]).some(x=>x.clubId===c.id||x.id===c.id||x.club===c.name||x.name===c.name);if(champion||promoted)culture.resilience=clamp(culture.resilience+3,20,95);
      h.famousMatches=h.famousMatches.slice(0,20);deriveHeritageTraditions(c);
    });
  }
  function createSeasonExperience(game,archive,startYear){
    if(!archive)return;const w=ensure(game),talent=w.talentHistory.find(x=>x.year===startYear),latestGovernance=w.governanceHistory[0]||null,latestMarket=w.globalMarkets.history[0]||null,contractReview=window.FLManagerContracts?FLManagerContracts.currentReview(game,archive.season):null,accounts=game.economy?.history?.[0]||null;
    const worldChanges=(game.history||[]).filter(x=>String(x.date||'')>=`${startYear}-01-01`&&String(x.date||'')<=`${startYear}-07-02`).slice(-12).map(x=>({date:x.date,title:x.title||x.text||'Football world update',text:x.text||''}));
    w.seasonExperience={id:`season-experience-${archive.season}`,phase:0,maxPhase:6,complete:false,archiveSeason:archive.season,startYear,created:game.date,summary:{talentCount:talent?.count||0,prodigies:talent?.players?.filter(x=>x.prodigy).length||0,worldChampion:w.international.worldCups.at(-1)||null,euroChampion:w.international.euros.at(-1)||null,homeChampion:w.international.homeChampionship.at(-1)||null,governance:latestGovernance,market:latestMarket,identity:{...w.clubIdentity},contractReview,accounts,worldChanges}};
  }
  function seasonExperience(game){const w=ensure(game),exp=w.seasonExperience;if(!exp||exp.complete)return null;if(!Number.isFinite(Number(exp.maxPhase)))exp.maxPhase=6;return {exp,archive:(game.seasonArchive||[]).find(s=>s.season===exp.archiveSeason)||null};}
  function advanceSeasonExperience(game){const x=seasonExperience(game);if(!x)return {ok:false,complete:true};x.exp.phase++;if(x.exp.phase>Number(x.exp.maxPhase||6)){x.exp.complete=true;ensure(game).seasonExperience=null;game.selectedTab='home';return {ok:true,complete:true}}return {ok:true,complete:false,phase:x.exp.phase}}

  function resolveDecision(game,id,optionId){
    const w=ensure(game),d=w.decisions.find(x=>x.id===id&&x.status==='pending'),o=d?.options?.find(x=>x.id===optionId);if(!d||!o)return {ok:false,message:'Decision no longer available.'};
    d.status='resolved';d.choice=o.label;d.resolvedDate=game.date;let result=o.effect||'';
    if(['succession','major-disaster'].includes(d.type)&&window.FLLegacySystems){const legacy=FLLegacySystems.resolveDecision(game,d,o);if(!legacy?.ok){d.status='pending';return legacy||{ok:false,message:'Legacy decision could not be resolved.'}}result=legacy.message;d.result=result;w.resolvedDecisions.unshift({...d});w.decisions=w.decisions.filter(x=>x.id!==d.id);inbox(game,d.from||'Club Secretary',`${d.title}: decision recorded`,result,`resolved-${d.id}`);return {ok:true,message:result};}
    if(d.type==='war-service'){
      const rel=game.managerCareer.relationships,service=w.managerService[d.payload.warId]={warId:d.payload.warId,warName:d.payload.name,choice:optionId,choiceLabel:o.label,effect:o.effect,from:game.date,to:d.payload.endDate,status:optionId==='stay'?'Remained at club':optionId==='home'?'Home service':optionId==='conscripted'?'Awaiting call-up':'Overseas service'};
      if(optionId==='volunteer'){applyRelationship(game,'supporters',12);applyRelationship(game,'players',9);applyRelationship(game,'board',5);game.manager.reputation='Nationally Respected'}
      else if(optionId==='conscripted'){applyRelationship(game,'supporters',4);applyRelationship(game,'players',3)}
      else if(optionId==='home'){applyRelationship(game,'supporters',5);applyRelationship(game,'board',3)}
      else{applyRelationship(game,'supporters',-8);applyRelationship(game,'players',-3);applyRelationship(game,'board',2)}
      game.managerCareer.timeline.push({date:game.date,title:`Wartime decision: ${o.label}`,text:`The manager chose to ${o.label.toLowerCase()} during the ${d.payload.name}.`});result=`Your decision is recorded permanently: ${service.status}.`;
    }else if(d.type==='war-return'){
      const c=clubById(game,d.payload.clubId),p=d.payload.player;c.staff=c.staff||[];
      if(optionId==='coach'||optionId==='scout'){const role=optionId==='coach'?'Coach':'Scout';c.staff.push({id:`staff-${p.id}`,name:p.name,role,appointed:game.date,formerPlayer:true,warInjury:d.payload.injury});applyRelationship(game,'players',8);applyRelationship(game,'supporters',5);result=`${p.name} accepts a permanent role as ${role.toLowerCase()}.`}
      else if(optionId==='testimonial'){c.staff.push({id:`staff-${p.id}`,name:p.name,role:'Club Ambassador',appointed:game.date,formerPlayer:true,warInjury:d.payload.injury});game.finances.balance=Math.max(0,(game.finances.balance||0)-40);applyRelationship(game,'supporters',12);applyRelationship(game,'players',10);result=`A testimonial is held and ${p.name} becomes a lifetime club ambassador.`}
      else{game.finances.balance=Math.max(0,(game.finances.balance||0)-12);applyRelationship(game,'supporters',-8);applyRelationship(game,'players',-5);result=`${p.name} leaves with compensation, but the decision is criticised locally.`}
      historyPush(game,{id:`war-return-choice-${p.id}`,date:game.date,type:'club',title:`${p.name}'s post-war future`,text:result});
    }else if(d.type==='governance'){
      const vote=d.payload.vote,choice=o.label,aligned=choice===vote.official,weight=Math.round((game.boardConfidence||50)/20+(game.managerCareer.relationships.press||50)/30);w.governanceHistory.push({date:game.date,id:vote.id,title:vote.title,choice,officialOutcome:vote.official,influence:weight});applyRelationship(game,'press',aligned?2:choice.includes('Abstain')?-1:0);result=`You voted to “${choice}”. The wider football authorities ultimately chose “${vote.official}”. Your vote carried ${weight>=6?'considerable':weight>=4?'some':'limited'} influence.`;
    }else if(d.type==='club-future'){
      const c=controlled(game),kind=d.payload.kind,identity=w.clubIdentity,trust=Math.round(((game.boardConfidence||50)+(game.managerCareer.relationships.board||game.boardConfidence||50))/2),r=seeded(hash(`${game.meta?.seed||1}-${d.id}-${optionId}-board-ruling`));
      const preferred={floodlights:'trial',kit:'modern',badge:'refine',name:'reject',manufacturer:'global'};
      let actual=o,delegated=optionId==='board';
      if(delegated||trust<75){const accepts=delegated?false:r()<(trust>=60?.78:trust>=45?.52:.28);if(!accepts){if(kind==='sponsor')actual=[...d.options].sort((a,b)=>(b.payload?.value||0)-(a.payload?.value||0))[0]||o;else actual=d.options.find(x=>x.id===preferred[kind])||d.options.find(x=>x.id!=='board')||o;}}
      const actualId=actual.id,prefix=delegated?`You left the final decision to the directors. `:actualId!==optionId?`The board considered your recommendation to “${o.label}” but chose “${actual.label}”. `:trust>=75?'Your relationship with the board gives your recommendation final authority. ':'The board accepts your recommendation. ';
      d.recommendation=o.label;d.actualChoice=actual.label;d.boardTrust=trust;
      if(kind==='floodlights'){if(actualId==='install'){c.floodlights=true;game.finances.balance=Math.max(0,(game.finances.balance||0)-180);applyRelationship(game,'supporters',5);result=`Permanent floodlights are installed at ${c.ground}.`}else if(actualId==='trial'){c.floodlights='trial';game.finances.balance=Math.max(0,(game.finances.balance||0)-65);result='Temporary lighting trials begin.'}else result='The floodlight project is postponed.'}
      if(kind==='kit'){identity.kitEra=actualId==='traditional'?'Traditional':actualId==='modern'?'Modern variation':actualId==='bold'?'Experimental':'Board-selected';applyRelationship(game,'supporters',actualId==='traditional'?5:actualId==='bold'?-2:1);result=`The ${identity.kitEra.toLowerCase()} kit direction is approved.`}
      if(kind==='badge'){identity.badgeEra=actualId==='preserve'?identity.badgeEra:actualId==='refine'?'Refined heritage crest':actualId==='redesign'?'New-era crest':'Supporter-selected crest';applyRelationship(game,'supporters',actualId==='redesign'?-4:4);result=`The club will use a ${identity.badgeEra.toLowerCase()}.`}
      if(kind==='name'){if(actualId==='commercial'){identity.officialName=`${c.location.split(',')[0]} Legacy FC`;applyRelationship(game,'supporters',-15);game.finances.income=(game.finances.income||0)+100}else if(actualId==='formal'){identity.officialName=`${c.name} Football Club`;applyRelationship(game,'supporters',-2)}else applyRelationship(game,'supporters',actualId==='reject'?10:4);result=actualId==='reject'?'The historic name is protected.':actualId==='vote'?'The matter is sent to a supporter vote.':`The official identity becomes ${identity.officialName}.`}
      if(kind==='sponsor'){const sponsor=actual.payload||{};identity.sponsors.push({name:sponsor.name,from:yearOf(game.date),value:sponsor.value});game.finances.income=(game.finances.income||0)+(sponsor.value||0);applyRelationship(game,'supporters',sponsor.supporter||0);result=`${sponsor.name} becomes the shirt sponsor.`}
      if(kind==='manufacturer'){const manufacturer=actual.payload||{};identity.manufacturer={name:manufacturer.name,from:yearOf(game.date),value:manufacturer.value,type:manufacturer.type};game.finances.income=(game.finances.income||0)+(manufacturer.value||0);applyRelationship(game,'supporters',manufacturer.supporter||0);result=`${manufacturer.name} will manufacture the club’s kits.`}
      result=prefix+result;historyPush(game,{id:`identity-${d.id}`,date:game.date,type:'club',title:d.title,text:result});
    }else if(d.type==='rich-bid'){
      const c=controlled(game),p=c.players.find(x=>x.id===d.payload.playerId),dest=window.FLWorldFootball?.club(game,d.payload.destinationClubId),m=d.payload.market;if(p&&dest){if(optionId==='accept'){const fee=window.FLEconomy?Math.round(FLEconomy.playerValue(game,p,c)*Math.max(.88,m.wageMultiplier*.72)):Math.round((p.ability||70)*30*m.wageMultiplier);game.finances.balance=(game.finances.balance||0)+fee;game.finances.transferBudget=(game.finances.transferBudget||0)+Math.round(fee*.72);movePlayer(game,{p,c},dest,m,m.wageMultiplier);result=`The offer is accepted for £${fee.toLocaleString('en-GB')}.`}else if(optionId==='negotiate'){const r=seeded(hash(`${d.id}-negotiate`));if(r()<.55){const fee=window.FLEconomy?Math.round(FLEconomy.playerValue(game,p,c)*Math.max(1.05,m.wageMultiplier*.9)):Math.round((p.ability||70)*45*m.wageMultiplier);game.finances.balance=(game.finances.balance||0)+fee;game.finances.transferBudget=(game.finances.transferBudget||0)+Math.round(fee*.72);movePlayer(game,{p,c},dest,m,m.wageMultiplier);result=`A record £${fee.toLocaleString('en-GB')} deal is agreed.`}else{p.unsettledUntil=addDays(game.date,120);result='The buying club withdraws and the player is unsettled by the failed move.'}}else{p.unsettledUntil=addDays(game.date,90);applyRelationship(game,'players',-2);result='The offer is rejected and the player remains, though his representatives are disappointed.'}}
    }
    d.result=result;w.resolvedDecisions.unshift({...d});w.decisions=w.decisions.filter(x=>x.id!==d.id);inbox(game,d.from||'Club Secretary',`${d.title}: decision recorded`,result,`resolved-${d.id}`);return {ok:true,message:result};
  }

  function processDate(game,previousDate,currentDate){ensure(game);scheduleGovernance(game,previousDate,currentDate);scheduleWarService(game,previousDate,currentDate);const year=yearOf(currentDate);Object.values(ensure(game).managerService).forEach(s=>{if(s.to&&s.to>previousDate&&s.to<=currentDate&&s.status!=='Returned'){s.status='Returned';inbox(game,'Club Chairman','Return from wartime service','Your wartime service is complete. The club and supporters formally welcome you back.',`manager-return-${s.warId}`);game.managerCareer.timeline.push({date:currentDate,title:'Returned from wartime service',text:'Resumed full duties with the club.'})}});return {blocking:nextBlocking(game)};}
  function annualUpdate(game,startYear,archive){ensure(game);simulateInternationals(game,startYear);seedEraTalent(game,startYear);richMarketUpdate(game,startYear);updateClubHeritage(game,archive,startYear);annualClubDecision(game,startYear);createSeasonExperience(game,archive,startYear);return {blocking:nextBlocking(game),seasonExperience:seasonExperience(game)};}

  function internationalState(game){ensure(game);return ensure(game).international;}
  function clubFuture(game){const w=ensure(game),c=controlled(game),trust=Math.round(((game.boardConfidence||50)+(game.managerCareer.relationships.board||game.boardConfidence||50))/2);return {identity:w.clubIdentity,heritage:c?.heritage||{traditions:[],famousMatches:[]},trust,influence:trust>=75?'Final authority on most club choices':trust>=60?'Strong recommendation usually followed':trust>=45?'Advisory voice; board retains control':'Limited influence in the boardroom',staff:c?.staff||[],pending:pending(game,'club-future'),warReturns:pending(game,'war-return'),governance:pending(game,'governance'),richBids:pending(game,'rich-bid')};}

  return {ensure,ensurePlayer,currentAttributes,potentialAssessment,developmentYear,queueDecision,pending,nextBlocking,availableBoardTopics,resolveBoardTalk,afterControlledMatch,answerPress,queueWarReturnDecision,resolveDecision,processDate,annualUpdate,ensureHistoricalWarStart,seasonExperience,advanceSeasonExperience,internationalState,clubFuture,allPlayers};
})();
