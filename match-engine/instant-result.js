(function(global){
  'use strict';

  const FALLBACK_HOME = [
    ['Hughes','gk',70],['Harper','def',71],['Wright','def',72],['Ellison','def',70],['Boyd','def',71],
    ['Nakamura','mid',74],['Okafor','mid',73],['Da Costa','mid',72],['Lindqvist','mid',74],['Mensah','fwd',75],['Novak','fwd',74]
  ];
  const FALLBACK_AWAY = [
    ['Bennett','gk',70],['Kovac','def',72],['Salib','def',71],['Turner','def',70],['Voss','def',72],
    ['Marchetti','mid',73],['Pardo','mid',72],['Ihara','mid',73],['Blom','mid',71],['Achebe','fwd',74],['Rosen','fwd',75]
  ];

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function n(v,fallback){ const x=Number(v); return Number.isFinite(x)?x:fallback; }
  function clone(v){ try{return JSON.parse(JSON.stringify(v));}catch(e){return v;} }
  function hashSeed(value){
    const text=String(value==null?'football-legacy':value); let h=2166136261;
    for(let i=0;i<text.length;i++){ h^=text.charCodeAt(i); h=Math.imul(h,16777619); }
    return h>>>0;
  }
  function rngFrom(seed){
    let state=hashSeed(seed)||0x9e3779b9;
    return function(){ state+=0x6D2B79F5; let t=state; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
  }
  function poisson(lambda,rng){
    lambda=clamp(lambda,0,7); if(lambda<=0)return 0;
    const limit=Math.exp(-lambda); let p=1,k=0;
    do{k++;p*=rng();}while(p>limit&&k<12);
    return Math.max(0,k-1);
  }
  function randInt(min,max,rng){ return Math.floor(min+rng()*(max-min+1)); }
  function pickWeighted(items,weightFn,rng){
    if(!items.length)return null;
    const weights=items.map(x=>Math.max(.01,weightFn(x))), total=weights.reduce((a,b)=>a+b,0);
    let roll=rng()*total;
    for(let i=0;i<items.length;i++){roll-=weights[i];if(roll<=0)return items[i];}
    return items[items.length-1];
  }
  function roleOf(raw,index,total){
    const text=String(raw&&(
      raw.role||raw.positionGroup||raw.position||raw.pos||raw.primaryPosition||''
    )).toLowerCase();
    if(/gk|goal/.test(text))return 'gk';
    if(/cb|lb|rb|def|back|sweeper/.test(text))return 'def';
    if(/st|cf|lw|rw|fwd|forward|striker|winger/.test(text))return 'fwd';
    if(/mid|cm|dm|am|lm|rm/.test(text))return 'mid';
    if(index===0)return 'gk';
    if(index<=4)return 'def';
    if(index>=Math.max(8,total-2))return 'fwd';
    return 'mid';
  }
  function playerRating(raw,fallback){
    return clamp(n(raw&&(raw.overall??raw.ovr??raw.rating??raw.ability??raw.currentAbility),fallback),45,99);
  }
  function normalisePlayers(team,fallback){
    const source=(team&&(
      team.players||team.startingXI||team.lineup||team.squad||team.firstTeam
    ));
    const arr=Array.isArray(source)?source.slice(0,18):[];
    const base=arr.length?arr:fallback.map((p,i)=>({name:p[0],role:p[1],overall:p[2],number:i+1}));
    return base.map((raw,index)=>{
      const role=roleOf(raw,index,base.length), rating=playerRating(raw,fallback[index%fallback.length][2]);
      return {
        id:String(raw.id??raw.playerId??raw.uid??('p'+index)),
        name:String(raw.name??raw.fullName??raw.displayName??fallback[index%fallback.length][0]),
        number:n(raw.number??raw.shirtNumber,index+1),
        role,
        overall:rating,
        finishing:clamp(n(raw.finishing??raw.shooting??raw.shoot, role==='fwd'?rating+3:role==='mid'?rating-2:rating-14),35,99),
        passing:clamp(n(raw.passing??raw.pass, role==='mid'?rating+2:rating-3),35,99),
        defending:clamp(n(raw.defending??raw.defence??raw.defend, role==='def'?rating+3:rating-12),30,99),
        keeping:clamp(n(raw.goalkeeping??raw.keeper??raw.gk, role==='gk'?rating+4:20),15,99),
        seasonApps:n(raw.seasonApps??raw.apps??raw.appearances,0),
        seasonGoals:n(raw.seasonGoals??raw.goals,0)
      };
    });
  }
  function average(players,key,roles){
    const use=players.filter(p=>!roles||roles.includes(p.role));
    const arr=use.length?use:players;
    return arr.reduce((s,p)=>s+n(p[key],p.overall),0)/Math.max(1,arr.length);
  }
  function normaliseTeam(raw,fallbackName,fallbackPlayers){
    raw=raw||{}; const players=normalisePlayers(raw,fallbackPlayers);
    const overall=clamp(n(raw.overall??raw.rating??raw.teamRating,average(players,'overall')),45,99);
    const attack=clamp(n(raw.attack??raw.attacking,average(players,'finishing',['fwd','mid'])),40,99);
    const midfield=clamp(n(raw.midfield,average(players,'passing',['mid','fwd'])),40,99);
    const defence=clamp(n(raw.defence??raw.defense,average(players,'defending',['def','mid'])),40,99);
    const keeper=clamp(n(raw.goalkeeping??raw.keeper,average(players,'keeping',['gk'])),35,99);
    return {id:String(raw.id??raw.teamId??fallbackName),name:String(raw.name??raw.clubName??fallbackName),players,overall,attack,midfield,defence,keeper,tactics:raw.tactics||{}};
  }
  function tacticProfile(t){
    t=t||{}; const mentality=String(t.mentality||'balanced'),pressing=String(t.pressing||'balanced'),tempo=String(t.tempo||'balanced'),direct=String(t.directness||'balanced'),support=String(t.support||t.supportRuns||'balanced');
    return {
      attack: mentality==='attacking'?1.13:mentality==='defensive'?.88:1,
      defence: mentality==='defensive'?1.10:mentality==='attacking'?.93:1,
      possession: direct==='short'?1.07:direct==='direct'?.94:1,
      chance: direct==='direct'?1.06:1,
      press: pressing==='high'?1.12:pressing==='low'?.91:1,
      discipline: pressing==='high'?1.18:pressing==='low'?.88:1,
      tempo: tempo==='fast'||tempo==='high'?1.08:tempo==='slow'||tempo==='low'?.94:1,
      support: support==='forward'||support==='getForward'?1.08:support==='hold'?.94:1
    };
  }
  function blankTeamStats(){return {shots:0,onTarget:0,passes:0,completed:0,tackles:0,fouls:0,corners:0,offsides:0,saves:0,yellows:0,reds:0,possessionTicks:0,possession:50,xg:0};}
  function mergeStats(base,add){const out=Object.assign(blankTeamStats(),clone(base||{}));for(const k of Object.keys(add||{})){if(typeof add[k]==='number'&&k!=='possession')out[k]=n(out[k],0)+add[k];else out[k]=add[k];}return out;}
  function randomMinute(start,end,rng){
    const min=Math.max(1,Math.ceil(start)),max=Math.max(min,Math.floor(end));
    return randInt(min,max,rng);
  }
  function addPlayerStat(playerMap,teamKey,p,key,amount){
    const id=String(p.id).startsWith(teamKey+'-')?String(p.id):teamKey+'-'+p.id; if(!playerMap[id])playerMap[id]={name:p.name,team:teamKey,role:p.role,number:p.number,seasonApps:p.seasonApps+1,seasonGoals:p.seasonGoals,goals:0,assists:0,shots:0,onTarget:0,passes:0,completed:0,tackles:0,fouls:0,yellows:0,reds:0,saves:0,rating:6.3};
    playerMap[id][key]=n(playerMap[id][key],0)+amount;
  }
  function buildPlayerMap(home,away,current){
    const map=clone(current&&current.players||{}); if(Object.keys(map).length)return map;
    for(const [teamKey,team] of [['you',home],['opp',away]]){
      team.players.slice(0,11).forEach(p=>{map[teamKey+'-'+p.id]={name:p.name,team:teamKey,role:p.role,number:p.number,seasonApps:p.seasonApps+1,seasonGoals:p.seasonGoals,goals:0,assists:0,shots:0,onTarget:0,passes:0,completed:0,tackles:0,fouls:0,yellows:0,reds:0,saves:0,rating:6.3};});
    }
    return map;
  }
  function scorerWeight(p){return p.role==='fwd'?Math.max(15,p.finishing):p.role==='mid'?Math.max(8,p.finishing*.58):p.role==='def'?Math.max(2,p.finishing*.16):.2;}
  function assistWeight(p){return p.role==='mid'?Math.max(12,p.passing):p.role==='fwd'?Math.max(8,p.passing*.72):p.role==='def'?Math.max(3,p.passing*.25):.2;}
  function simulate(options){
    options=options||{}; const cfg=options.config||{};
    const saved=cfg.matchConfig||{};
    const home=normaliseTeam(options.homeTeam||saved.homeTeam||cfg.homeTeam,'Ribble End',FALLBACK_HOME);
    const away=normaliseTeam(options.awayTeam||saved.awayTeam||cfg.awayTeam,'Sherwood',FALLBACK_AWAY);
    const query=cfg.query||{};
    home.tactics=Object.assign({},home.tactics,cfg.tactics||{},query.formation?{formation:query.formation}:null,query.mentality?{mentality:query.mentality}:null,query.support?{support:query.support}:null,query.pressing?{pressing:query.pressing}:null,query.width?{width:query.width}:null);
    const ht=tacticProfile(home.tactics),at=tacticProfile(away.tactics);
    const current=options.current||{}; const startMinute=clamp(n(current.minute,0),0,95); const remaining=clamp((95-startMinute)/95,0,1);
    const seed=options.seed??saved.matchId??cfg.matchId??(Date.now()+'-'+Math.random()); const rng=rngFrom(seed);
    const difficulty=String(query.difficulty||cfg.difficulty||'medium'); const awayDifficulty={easy:-4,medium:0,hard:2.5,legend:4.5}[difficulty]||0;
    const weather=String(query.weather||cfg.weather||'clear'); const weatherGoal=weather==='rain'?.92:weather==='night'?.98:1;
    const homeEdge=2.4;
    const homeAttack=(home.attack*.48+home.midfield*.30+home.overall*.22)*ht.attack*ht.tempo*ht.support;
    const awayAttack=(away.attack*.48+away.midfield*.30+(away.overall+awayDifficulty)*.22)*at.attack*at.tempo*at.support;
    const homeResistance=(away.defence*.68+away.keeper*.32)*at.defence;
    const awayResistance=(home.defence*.68+home.keeper*.32)*ht.defence;
    const homeXg90=clamp(1.22+(homeAttack-homeResistance+homeEdge)/18,0.25,3.35)*ht.chance*weatherGoal;
    const awayXg90=clamp(1.10+(awayAttack-awayResistance-awayDifficulty*.15)/18,0.22,3.2)*at.chance*weatherGoal;
    const addHome=poisson(homeXg90*remaining,rng),addAway=poisson(awayXg90*remaining,rng);
    const score={you:n(current.score&&current.score.you,0)+addHome,opp:n(current.score&&current.score.opp,0)+addAway};
    const addedTime=randInt(2,6,rng); const finalMinute=90+addedTime;
    const report=clone(current.report||{}); report.mode='instant';report.seed=seed;report.startedAt=report.startedAt||Date.now();report.endedAt=Date.now();report.score=score;report.teamNames={you:home.name,opp:away.name};report.events=Array.isArray(report.events)?report.events:[];report.players=buildPlayerMap(home,away,report);

    const possBase=50+(home.midfield-away.midfield)*.42+(home.overall-away.overall)*.16;
    const homePoss=clamp(Math.round(possBase*ht.possession/(Math.max(.7,at.possession))),34,66),awayPoss=100-homePoss;
    function genStats(teamKey,team,oppTeam,xg90,goals,poss,tact){
      const xg=Math.max(goals*.36,xg90*remaining*(.86+rng()*.28));
      const shots=Math.max(goals+2,Math.round(xg*4.7+rng()*3)); const onTarget=clamp(Math.max(goals,Math.round(shots*(.34+rng()*.17))),goals,shots);
      const passes=Math.round((225+poss*3.7)*(startMinute?remaining:1)*(tact.possession)); const acc=clamp(.70+(team.midfield-60)*.004+(weather==='rain'?-.035:0),.65,.91);
      const fouls=Math.round((6+rng()*7)*remaining*tact.discipline), yellows=Math.min(fouls,Math.round(fouls*(.13+rng()*.13))), reds=(yellows>=3&&rng()<.08)?1:0;
      return {shots,onTarget,passes,completed:Math.round(passes*acc),tackles:Math.round((10+rng()*8)*remaining*tact.press),fouls,corners:Math.round((2+rng()*5)*remaining),offsides:Math.round(rng()*4*remaining),saves:Math.max(0,Math.round((oppTeam===home?0:0))),yellows,reds,possessionTicks:poss*100,xg:+xg.toFixed(2)};
    }
    const hAdd=genStats('you',home,away,homeXg90,addHome,homePoss,ht),aAdd=genStats('opp',away,home,awayXg90,addAway,awayPoss,at);
    hAdd.saves=Math.max(0,aAdd.onTarget-addAway);aAdd.saves=Math.max(0,hAdd.onTarget-addHome);
    report.teams=report.teams||{};report.teams.you=mergeStats(report.teams.you,hAdd);report.teams.opp=mergeStats(report.teams.opp,aAdd);report.teams.you.possession=homePoss;report.teams.opp.possession=awayPoss;

    const goalEvents=[];
    function createGoals(teamKey,team,count){
      for(let i=0;i<count;i++){
        const scorer=pickWeighted(team.players.filter(p=>p.role!=='gk'),scorerWeight,rng)||team.players[team.players.length-1];
        const possible=team.players.filter(p=>p.role!=='gk'&&p.id!==scorer.id); const assist=rng()<.79?pickWeighted(possible,assistWeight,rng):null;
        const minute=randomMinute(startMinute+1,finalMinute,rng);
        addPlayerStat(report.players,teamKey,scorer,'goals',1);addPlayerStat(report.players,teamKey,scorer,'shots',1);addPlayerStat(report.players,teamKey,scorer,'onTarget',1);addPlayerStat(report.players,teamKey,scorer,'rating',.45);
        const scorerKey=String(scorer.id).startsWith(teamKey+'-')?String(scorer.id):teamKey+'-'+scorer.id;const scorerRow=report.players[scorerKey];scorerRow.seasonGoals=n(scorerRow.seasonGoals,scorer.seasonGoals)+1;
        if(assist){addPlayerStat(report.players,teamKey,assist,'assists',1);addPlayerStat(report.players,teamKey,assist,'rating',.24);}
        goalEvents.push({type:'goal',team:teamKey,minute,player:scorer.name,playerId:(String(scorer.id).startsWith(teamKey+'-')?String(scorer.id):teamKey+'-'+scorer.id),assist:assist?assist.name:null});
      }
    }
    createGoals('you',home,addHome);createGoals('opp',away,addAway);
    goalEvents.sort((a,b)=>a.minute-b.minute);
    let runningHome=n(current.score&&current.score.you,0),runningAway=n(current.score&&current.score.opp,0);
    goalEvents.forEach(e=>{if(e.team==='you')runningHome++;else runningAway++;e.score=runningHome+'-'+runningAway;report.events.push(e);});

    function cardEvents(teamKey,team,count,redCount){
      const pool=team.players.filter(p=>p.role!=='gk');
      for(let i=0;i<count;i++){const p=pickWeighted(pool,x=>x.role==='def'?1.5:x.role==='mid'?1.1:.6,rng);const minute=randomMinute(startMinute+1,finalMinute,rng);report.events.push({type:'yellow-card',team:teamKey,minute,player:p.name,playerId:(String(p.id).startsWith(teamKey+'-')?String(p.id):teamKey+'-'+p.id)});addPlayerStat(report.players,teamKey,p,'yellows',1);}
      for(let i=0;i<redCount;i++){const p=pickWeighted(pool,x=>x.role==='def'?1.5:1,rng);const minute=randomMinute(startMinute+1,finalMinute,rng);report.events.push({type:'red-card',team:teamKey,minute,player:p.name,playerId:(String(p.id).startsWith(teamKey+'-')?String(p.id):teamKey+'-'+p.id)});addPlayerStat(report.players,teamKey,p,'reds',1);}
    }
    cardEvents('you',home,Math.max(0,hAdd.yellows),hAdd.reds);cardEvents('opp',away,Math.max(0,aAdd.yellows),aAdd.reds);
    report.events.push({type:'added-time',team:null,minute:90,half:2,minutes:addedTime});
    report.events.push({type:'full-time',team:null,minute:finalMinute,score:score.you+'-'+score.opp});
    report.events.sort((a,b)=>n(a.minute,0)-n(b.minute,0));

    for(const row of Object.values(report.players)){
      row.rating=+clamp(n(row.rating,6.3),4.5,10).toFixed(2);
      row.seasonApps=Math.max(1,n(row.seasonApps,1));row.seasonGoals=Math.max(0,n(row.seasonGoals,0));
    }
    report.summary={home:home.name,away:away.name,winner:score.you===score.opp?null:(score.you>score.opp?'you':'opp'),addedTime};
    try{localStorage.setItem('footballLegacyLastMatchReport',JSON.stringify(report));}catch(e){}
    try{if(global.parent&&global.parent!==global)global.parent.postMessage({type:'footballLegacyMatchComplete',mode:'instant',report},'*');}catch(e){}
    return report;
  }

  global.FootballLegacyInstantSim={simulate};
})(window);
