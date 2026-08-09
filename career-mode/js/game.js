window.FLGame = (() => {
  const DAY = 86400000;
  function hashSeed(text){ let h=2166136261; for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; }
  function rng(seed){ let s=seed>>>0; return () => { s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
  function pick(arr,r){ return arr[Math.floor(r()*arr.length)]; }
  function iso(d){ return d.toISOString().slice(0,10); }
  function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
  function makePlayers(club, r, year=1888, gameRef=null){
    const personalities=['Model Professional','Professional','Driven','Determined','Balanced','Loyal','Ambitious','Temperamental','Casual'];
    const curves=['early','steady','steady','steady','late','volatile'];
    return FLData.positions.map((position,index)=>{
      const age=16+Math.floor(r()*20);
      const base=34+(club.strength*7)+Math.floor(r()*18);
      const balanced=window.FLFootballBalance?FLFootballBalance.generatedPlayerProfile(club,r,age):null;
      const rare=r();
      let ability=balanced?.ability??clamp(base,34,80);
      let ceiling=balanced?.ceiling??clamp(ability+7+Math.floor(r()*16),ability,93);
      if(!balanced&&age<=19 && rare<0.006){ ability=clamp(62+Math.floor(r()*10),ability,78); ceiling=88+Math.floor(r()*7); }
      else if(!balanced&&age<=20 && rare<0.025){ ability=Math.max(ability,54+Math.floor(r()*8)); ceiling=84+Math.floor(r()*9); }
      const professionalism=35+Math.floor(r()*65), ambition=30+Math.floor(r()*70), loyalty=25+Math.floor(r()*75);
      const leadership=20+Math.floor(r()*80), bigMatches=25+Math.floor(r()*75), consistency=35+Math.floor(r()*65);
      const injuryProneness=8+Math.floor(r()*78), temperament=20+Math.floor(r()*80), teamwork=35+Math.floor(r()*65);
      const determination=30+Math.floor(r()*70), adaptability=25+Math.floor(r()*75);
      const potentialEstimate=balanced?.potential??clamp(Math.round((ceiling*.7)+(ability*.3)),ability,95);
      const player={
        id:`${club.id}-p${index+1}`,
        name:window.FLEraIdentity?FLEraIdentity.generatedName('English',Math.max(1888,year-age+18),Math.floor(r()*4294967295)):`${pick(FLData.firstNames,r)} ${pick(FLData.lastNames,r)}`,
        clubId:club.id||null,
        nationality:'English',
        generatedYear:year,
        birthYear:year-age,
        position,
        age,
        condition:88+Math.floor(r()*13),
        form:'—',
        ability,
        potential:potentialEstimate,
        ceiling,
        developmentCurve:pick(curves,r),
        developmentMomentum:0,
        personalityProfile:{professionalism,ambition,loyalty,leadership,bigMatches,consistency,injuryProneness,temperament,teamwork,determination,adaptability},
        personalityLabel:pick(personalities,r),
        wage:Math.max(1,Math.round((1+Math.floor((base/20)*r()))*(window.FLEconomy?FLEconomy.wageIndex(year):1))),
        appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',
        honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0}
      };
      if(window.FLEraIdentity)FLEraIdentity.applyPlayer(gameRef||{meta:{seed:1},date:`${year}-08-15`},player,year);
      return player;
    });
  }
  function makeSchedule(clubs,startYear=1888,options={}){
    const ids=clubs.map(c=>c.id);if(ids.length<2)return [];
    const rotating=ids.length%2?[...ids,null]:ids.slice(),rounds=[];
    for(let round=0;round<rotating.length-1;round++){
      const games=[];
      for(let i=0;i<rotating.length/2;i++){
        let home=rotating[i],away=rotating[rotating.length-1-i];
        if(round%2&&i===0)[home,away]=[away,home];
        if(home&&away)games.push({home,away});
      }
      rounds.push(games);rotating.splice(1,0,rotating.pop());
    }
    const allRounds=Number(options.rounds)===1?rounds:rounds.concat(rounds.map(g=>g.map(x=>({home:x.away,away:x.home}))));
    const startDate=options.startDate||`${startYear}-${options.startMonthDay||'09-08'}`,start=new Date(`${startDate}T12:00:00Z`),fixtures=[],prefix=options.idPrefix||String(startYear);
    allRounds.forEach((games,round)=>games.forEach((g,i)=>fixtures.push({
      id:`${prefix}-r${round+1}m${i+1}`,round:round+1,date:iso(new Date(start.getTime()+round*7*DAY)),home:g.home,away:g.away,played:false,homeGoals:null,awayGoals:null,
      competition:options.name||'Football League',competitionId:options.id||null,divisionId:options.divisionId||options.id||null,tier:Number(options.tier)||1,official:options.official!==false
    })));
    return fixtures;
  }
  function makePyramidSchedule(game,startYear,override={}){
    if(window.FLPyramid)FLPyramid.ensure(game,startYear);
    const context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{official:true,rounds:2,startMonthDay:'09-08'};
    const divisions=(window.FLPyramid?FLPyramid.divisionList(game,startYear):[{id:context.id||'football-league',name:context.name||'Football League',tier:1}]).filter(d=>!window.FLPyramid||FLPyramid.isDetailedDivision(game,d.id));
    return divisions.flatMap(d=>{
      const members=window.FLPyramid?FLPyramid.clubsInDivision(game,d.id):game.clubs;
      return makeSchedule(members,startYear,{...context,...override,id:d.id,divisionId:d.id,tier:d.tier,name:d.name,idPrefix:`${startYear}-${d.id}`,rounds:context.official===false?1:(context.rounds||2)});
    }).sort((a,b)=>a.date.localeCompare(b.date)||a.tier-b.tier||a.id.localeCompare(b.id));
  }
  function openingInbox(manager,club,date='1888-08-15',competitionName='Football League'){
    const year=Number(String(date).slice(0,4))||1888,expectation=String(club.expectation||'build a stable season').replace(/^./,x=>x.toLowerCase()),count=Array.isArray(club.players)?club.players.length:0;
    return [
      {id:'welcome',date,from:'Club Chairman',subject:`Welcome to ${club.name}`,body:`${manager.lastName ? `Mr ${manager.lastName}, ` : ''}the committee is pleased to confirm your appointment. The board expects you to ${expectation}`,read:false},
      {id:'squad',date,from:'Club Secretary',subject:'First-team register prepared',body:`The playing register has been assembled for your review. There are ${count || 'enough'} footballers currently available.`,read:false},
      {id:'league',date,from:`${competitionName} Office`,subject:`${year}/${String(year+1).slice(-2)} season arrangements`,body:`The new ${competitionName} season is preparing to begin. Review the squad, tactics and opening fixtures before your first match.`,read:false}
    ];
  }
  function create(manager,selectedClub,options={}){
    const seed=Number(options.seed)||hashSeed(`${manager.firstName}-${manager.lastName}-${selectedClub.id}-1888`);
    const r=rng(seed);
    const clubs=FLData.clubs.map(c=>({...c,players:makePlayers(c,r,1888),played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
    const club=clubs.find(c=>c.id===selectedClub.id) || clubs[0];
    const game={
      version:'0.24.4',
      meta:{created:new Date().toISOString(),lastSaved:null,seed,preselectedClubId:options.preselectedClubId||null},
      date:'1888-08-15',
      manager:{...manager,appointedDate:'1888-08-15'},
      controlledClubId:club.id,
      clubs,
      freeAgents: makePlayers({id:'free-agent',strength:2},r,1888).slice(0,28).map((p,i)=>({...p,id:`free-agent-p${i+1}`,clubId:null,wage:0,contractEnd:null,squadStatus:'Free Agent'})),
      fixtures:[],
      inbox:openingInbox(manager,club,'1888-08-15','Football League'),
      history:[],seasonArchive:[],hallOfFame:[],managerArchive:[],
      news:[{date:'1888-08-15',headline:'Twelve clubs prepare for a new national competition'}],
      finances:{balance:club.finance,income:0,expenses:0,transferBudget:0,weeklyWageBudget:0},
      boardConfidence:65,
      selectedTab:'home'
    };
    ensureClubManagers(game);
    if(window.FLTimeline){FLTimeline.ensure(game);game.worldState.seasonCompetition=FLTimeline.seasonContext(game,1888);}
    if(window.FLClubTrajectory)FLClubTrajectory.ensure(game,1888);
    if(window.FLWorldFootball)FLWorldFootball.ensure(game,{backfill:false});
    if(window.FLPyramid)FLPyramid.ensure(game,1888);
    if(window.FLLivingWorld)FLLivingWorld.ensure(game);
    if(window.FLEconomy){FLEconomy.ensure(game);FLEconomy.ensureClubFinances(game,club);}
    if(window.FLManagerContracts)FLManagerContracts.startAppointment(game,club,{startDate:game.manager.appointedDate||game.date});
    if(window.FLLegacySystems)FLLegacySystems.ensure(game);
    if(window.FLPeople)FLPeople.ensure(game);
    if(window.FLEraIdentity)FLEraIdentity.refreshAll(game,1888);
    if(window.FLConversations)FLConversations.ensure(game);
    if(window.FLPersonalLife)FLPersonalLife.ensure(game);
    if(window.FLTransferMarket)FLTransferMarket.ensure(game);
    if(window.FLDressingRoom)FLDressingRoom.ensure(game);
    if(window.FLCareerSystems)FLCareerSystems.ensure(game);
    game.fixtures=makePyramidSchedule(game,1888);
    if(window.FLEnglishCup)FLEnglishCup.newSeason(game,1888);
    if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,1888);
    ensureClubManagers(game);
    return game;
  }
  function club(game,id){ return (game.clubs||[]).find(c=>c.id===id)||(game.competitionClubs||[]).find(c=>c.id===id)||null; }
  function controlledClub(game){ return club(game,game.controlledClubId); }
  function fixtureOn(game,date,clubId=game.controlledClubId){ return game.fixtures.find(f=>f.date===date && (f.home===clubId||f.away===clubId)); }
  function nextFixture(game,clubId=game.controlledClubId){ return game.fixtures.find(f=>!f.played&&(f.home===clubId||f.away===clubId)); }
  function repairMissingFixtures(game){
    game.fixtures=Array.isArray(game.fixtures)?game.fixtures:[];
    const clubId=game.controlledClubId,year=Number(String(game.date||'1888').slice(0,4))||1888,month=Number(String(game.date||'1888-08-15').slice(5,7))||8,seasonYear=month>=7?year:year-1;
    const seasonStart=`${seasonYear}-07-01`,seasonEnd=`${seasonYear+1}-07-01`,belongs=f=>f&&!f.abandoned&&String(f.date||'')>=seasonStart&&String(f.date||'')<seasonEnd&&(f.home===clubId||f.away===clubId);
    if(!clubId||game.fixtures.some(belongs))return {changed:false,reason:'fixtures-present'};
    if(window.FLPyramid)FLPyramid.ensure(game,seasonYear);
    const division=window.FLPyramid?.divisionForClub?.(game,clubId),members=division?FLPyramid.clubsInDivision(game,division.id):[];
    if(!division||members.length<2)return {changed:false,reason:'division-unavailable'};
    const context=window.FLTimeline?.seasonContext?.(game,seasonYear)||{official:true,rounds:2,startMonthDay:'09-08'};
    const rebuilt=makeSchedule(members,seasonYear,{...context,id:division.id,divisionId:division.id,tier:division.tier,name:division.name,idPrefix:`${seasonYear}-${division.id}`,rounds:context.official===false?1:(context.rounds||2)});
    const ids=new Set(game.fixtures.map(f=>f.id)),keys=new Set(game.fixtures.map(f=>`${f.date}|${f.home}|${f.away}|${f.divisionId||''}`));let added=0;
    for(const fixture of rebuilt){const key=`${fixture.date}|${fixture.home}|${fixture.away}|${fixture.divisionId||''}`;if(ids.has(fixture.id)||keys.has(key))continue;game.fixtures.push(fixture);ids.add(fixture.id);keys.add(key);added++}
    game.fixtures.sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.tier)-Number(b.tier)||String(a.id).localeCompare(String(b.id)));
    if(added){game.meta=game.meta||{};game.meta.fixtureRepair={version:1,date:game.date,seasonYear,divisionId:division.id,added};}
    return {changed:added>0,added,seasonYear,divisionId:division.id};
  }
  function applyLightweightTeamStats(game,team,goals,conceded,r){
    const eligible=(team.players||[]).filter(p=>p.status!=='retired'&&p.status!=='deceased'&&p.available!==false),keeper=[...eligible].filter(p=>p.position==='GK').sort((a,b)=>(b.ability||50)-(a.ability||50))[0]||eligible[0];
    const outfield=eligible.filter(p=>p!==keeper).map(p=>({p,score:Number(p.ability||50)+(r()-.5)*16+(Number(p.condition||90)-90)*.08})).sort((a,b)=>b.score-a.score).map(x=>x.p),starters=[keeper,...outfield.slice(0,10)].filter(Boolean),remaining=eligible.filter(p=>!starters.includes(p)).sort((a,b)=>(b.ability||50)-(a.ability||50));
    const allowed=Math.max(0,Number(window.FLTimeline?.currentRules?.(game)?.substitutionsAllowed||0)),subCount=Math.min(remaining.length,allowed,allowed>0?2+Math.floor(r()*Math.min(3,allowed)):0),subs=remaining.slice(0,Math.max(0,subCount));
    const exits=new Map();subs.forEach((sub,i)=>{const candidates=starters.filter(p=>p.position!=='GK'&&!exits.has(p.id)),out=candidates[Math.floor(r()*Math.max(1,candidates.length))];if(out)exits.set(out.id,58+Math.floor(r()*Math.max(8,25-i*3)))});
    const register=(p,minutes,start)=>{p.appearances=(p.appearances||0)+1;p.starts=(p.starts||0)+(start?1:0);p.subApps=(p.subApps||0)+(start?0:1);p.minutes=(p.minutes||0)+minutes;p.careerTotals=p.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};p.careerTotals.appearances=(p.careerTotals.appearances||0)+1;const base=6.15+((p.ability||50)-50)*.012+(goals-conceded)*.08+(r()-.5)*.7;p._ratingTotal=(p._ratingTotal||0)+base;p.averageRating=(p._ratingTotal/p.appearances).toFixed(2)};
    starters.forEach(p=>register(p,exits.get(p.id)||90,true));subs.forEach((p,i)=>{const minute=[...exits.values()][i]||70;register(p,Math.max(1,90-minute),false)});
    const participants=[...starters,...subs],attackers=participants.filter(p=>['CF','IF','W'].includes(p.position)),scorers=attackers.length?attackers:participants;
    for(let i=0;i<goals;i++){const scorer=weightedPlayer(scorers,r,true);if(!scorer)continue;scorer.goals=(scorer.goals||0)+1;scorer.careerTotals.goals=(scorer.careerTotals.goals||0)+1;const pool=participants.filter(p=>p.id!==scorer.id&&p.position!=='GK');if(pool.length&&r()<.7){const assist=pick(pool,r);assist.assists=(assist.assists||0)+1;assist.careerTotals.assists=(assist.careerTotals.assists||0)+1}}
    if(keeper){keeper.conceded=(keeper.conceded||0)+conceded;if(conceded===0){keeper.cleanSheets=(keeper.cleanSheets||0)+1;keeper.careerTotals.cleanSheets=(keeper.careerTotals.cleanSheets||0)+1}}
  }
  function simulateFixture(game,f){
    const r=rng(game.meta.seed + f.round*997 + Number(f.id.replace(/\D/g,'')));
    const home=club(game,f.home), away=club(game,f.away);
    const goalCount=(attack,defence,homeBonus)=>{
      const attackPower=window.FLClubTrajectory?FLClubTrajectory.effectivePower(attack):Number(attack.powerRating||attack.clubRating||34+Number(attack.strength||3)*8),defencePower=window.FLClubTrajectory?FLClubTrajectory.effectivePower(defence):Number(defence.powerRating||defence.clubRating||34+Number(defence.strength||3)*8);
      const chance=clamp(.55+(attackPower-defencePower)*.009+homeBonus,.22,.9);
      let goals=0;for(let i=0;i<5;i++)if(r()<chance*.42)goals++;return Math.min(goals,6);
    };
    f.homeGoals=goalCount(home,away,.08); f.awayGoals=goalCount(away,home,0); f.played=true;
    const leagueMatch=f.competitionId!=='english-cup'&&Number(f.tier)!==0;
    if(leagueMatch){
      home.played++; away.played++; home.gf+=f.homeGoals;home.ga+=f.awayGoals;away.gf+=f.awayGoals;away.ga+=f.homeGoals;
      const pointsForWin=window.FLTimeline?FLTimeline.currentRules(game).pointsForWin:2;
      if(f.homeGoals>f.awayGoals){home.won++;away.lost++;home.points+=pointsForWin;}
      else if(f.homeGoals<f.awayGoals){away.won++;home.lost++;away.points+=pointsForWin;}
      else {home.drawn++;away.drawn++;home.points++;away.points++;}
    }
    const result=`${home.name} ${f.homeGoals}–${f.awayGoals} ${away.name}`;
    const humanControlled=!game.meta?.headless&&(f.home===game.controlledClubId||f.away===game.controlledClubId);if(humanControlled)game.history.push({date:f.date,type:'result',text:result});
    if(!f.playerStatsApplied){
      const controlled=humanControlled;
      if(!controlled){applyLightweightTeamStats(game,home,f.homeGoals,f.awayGoals,r);applyLightweightTeamStats(game,away,f.awayGoals,f.homeGoals,r);f.playerStatsApplied=true;}
      else{
        const hp=teamProfile(game,home,true),ap=teamProfile(game,away,false),events=[];
        const addGoals=(side,count,profile)=>{for(let i=0;i<count;i++){const scorer=weightedPlayer(profile.starters,r,true),assistPool=profile.starters.filter(p=>p.id!==scorer.id&&p.position!=='GK'),assist=r()<.72&&assistPool.length?pick(assistPool,r):null;events.push({clock:10+r()*79,minute:10+Math.floor(r()*80),type:'goal',side,playerId:scorer.id,player:scorer.name,assistId:assist?.id||null,assist:assist?.name||null})}};
        addGoals('home',f.homeGoals,hp);addGoals('away',f.awayGoals,ap);const quickRecord={id:`sim-${f.id}-${f.date}`,engineVersion:'2.1',fixtureId:f.id,date:f.date,competition:f.competition||(window.FLTimeline?FLTimeline.activeCompetitionName(game):'Football League'),homeId:home.id,awayId:away.id,homeName:home.name,awayName:away.name,homeGoals:f.homeGoals,awayGoals:f.awayGoals,events,frames:[],teamProfiles:{home:hp,away:ap},substitutions:[]};finalizeMatchStats(game,quickRecord);f.playerStatsApplied=true;
      }
    }
    if(humanControlled){
      const ours=f.home===game.controlledClubId?f.homeGoals:f.awayGoals;
      const theirs=f.home===game.controlledClubId?f.awayGoals:f.homeGoals;
      game.boardConfidence=Math.max(0,Math.min(100,game.boardConfidence+(ours>theirs?3:ours===theirs?0:-2)));
      game.inbox.unshift({id:`result-${f.id}`,date:f.date,from:'Club Secretary',subject:'Match report',body:result,read:false});
    }
    if(f.competitionId==='english-cup'&&!game.meta?.deferCupProgress&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(Number(f.tier)===0&&!game.meta?.deferCupProgress&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
  }
  function developmentEnvironment(player,club){
    const pp=player.personalityProfile||{};
    const minutesFactor=Math.min(1,(player.minutes||0)/2200);
    const academy=Number(club.youthGenerationQuality||50),stature=Number(club.stature||50);
    const clubFactor=clamp(((club.strength||3)/5)*.66+(academy/70)*.24+(stature/80)*.10,.4,1.35);
    const personalityFactor=((pp.professionalism||50)+(pp.determination||50)+(pp.ambition||50))/300;
    const injuryPenalty=(pp.injuryProneness||40)/180;
    return clamp((minutesFactor*.35)+(clubFactor*.2)+(personalityFactor*.55)-injuryPenalty,.05,1.15);
  }
  function ensureClubManagers(game){
    const firstNames=FLData.firstNames||['Arthur'],lastNames=FLData.lastNames||['Smith'],year=Number(String(game.date||'1888').slice(0,4))||1888;
    game.clubs.forEach((team,index)=>{
      const isControlled=team.id===game.controlledClubId&&!game.meta?.headless,saved=team.managerProfile||{},age=Number(saved.age)||34+((index*7)%27);
      const profile=isControlled?{
        ...saved,id:saved.id||'manager-user',firstName:game.manager?.firstName||saved.firstName||'Club',lastName:game.manager?.lastName||saved.lastName||'Manager',age:Number(game.manager?.age)||age,
        nationality:game.manager?.nationality||saved.nationality||'English',birthplace:game.manager?.birthplace||saved.birthplace||team.location||'England',gender:game.manager?.gender||saved.gender||'male',appearanceIndex:Number(game.manager?.appearanceIndex||saved.appearanceIndex)||((index*11)%24)+1,identitySeed:Number(game.manager?.identitySeed||saved.identitySeed)||undefined,
        style:game.manager?.style||game.manager?.managementStyle||saved.style||'Balanced',temperament:game.manager?.temperament||saved.temperament||'Measured',reputation:game.manager?.reputation||saved.reputation||'Local',clubId:team.id,user:true,portraitRole:'manager'
      }:{
        ...saved,id:saved.id||`manager-${team.id}`,firstName:saved.firstName||firstNames[(index*5+3)%firstNames.length],lastName:saved.lastName||lastNames[(index*7+2)%lastNames.length],age,
        nationality:saved.nationality||'English',birthplace:saved.birthplace||team.location||'England',gender:saved.gender||'male',birthYear:Number(saved.birthYear)||year-age,appearanceIndex:((index%24)+1),identitySeed:Number(saved.identitySeed)||undefined,
        style:saved.style||['Direct','Balanced','Possession','Counter-attacking','Defensive'][index%5],temperament:saved.temperament||['Calm','Demanding','Measured','Volatile'][index%4],reputation:saved.reputation||'Regional',clubId:team.id,user:false,portraitRole:'manager'
      };
      if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,year);else profile.portrait=profile.portrait||'assets/player-faces/no-face.svg';
      team.managerProfile=profile;
      if(!Array.isArray(team.managerHistory)||!team.managerHistory.length)team.managerHistory=[{managerId:profile.id,name:`${profile.firstName} ${profile.lastName}`,from:String(Math.max(Number(String(team.founded||1888).slice(0,4))||1888,year)),to:'Present',role:'Manager'}];
      team.honours=Array.isArray(team.honours)?team.honours:[];team.seasonHistory=Array.isArray(team.seasonHistory)?team.seasonHistory:[];
    });
  }
  function endingSeasonLabel(date){const year=Number(String(date||'1889').slice(0,4))||1889;return `${year-1}-${String(year).slice(2)}`;}
  function honourKey(h){return `${typeof h==='string'?h:(h?.name||'Honour')}-${typeof h==='string'?'':(h?.season||'')}`;}
  function addHonour(list,honour){
    if(!Array.isArray(list))return;
    const key=honourKey(honour);if(!list.some(h=>honourKey(h)===key))list.push(honour);
  }
  function seasonPlayerSnapshot(player,team){
    return {id:player.id,name:player.name,clubId:team.id,club:team.name,position:player.position,age:player.age,face:player.face||'',ability:Number(player.ability)||0,
      apps:Number(player.appearances)||0,starts:Number(player.starts)||0,subApps:Number(player.subApps)||0,minutes:Number(player.minutes)||0,goals:Number(player.goals)||0,
      assists:Number(player.assists)||0,yellowCards:Number(player.yellowCards)||0,redCards:Number(player.redCards)||0,cleanSheets:Number(player.cleanSheets)||0,
      rating:player.averageRating||'—',playerOfMatch:Number(player.playerOfMatch)||0};
  }
  function chooseSeasonAwards(players,champion,game){
    const by=(pool,key,filter=()=>true)=>[...pool].filter(filter).sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0)||Number(b.goals||0)-Number(a.goals||0)||a.name.localeCompare(b.name))[0]||null;
    const rated=pool=>[...pool].filter(p=>Number.isFinite(Number(p.rating))&&p.apps>0).sort((a,b)=>Number(b.rating)-Number(a.rating)||b.goals-a.goals||b.assists-a.assists);
    const playerOfSeason=rated(players)[0]||by(players,'goals'),goldenBoot=by(players,'goals'),playmaker=by(players,'assists'),goldenGlove=by(players,'cleanSheets',p=>p.position==='GK');
    const youngPool=players.filter(p=>(Number(p.age)||99)<=21&&p.apps>0),youngPlayer=rated(youngPool)[0]||by(youngPool,'goals'),seasonYear=Number(String(game?.date||'1889').slice(0,4))-1,awards=[];
    const add=row=>{if(row?.winner&&row.winner!=='No winner'&&!awards.some(x=>x.name===row.name&&x.playerId===row.playerId))awards.push(row)};
    if(seasonYear>=1947)add({name:'Footballer of the Year',winner:playerOfSeason?.name||'No winner',playerId:playerOfSeason?.id||null,detail:playerOfSeason&&Number.isFinite(Number(playerOfSeason.rating))?`${playerOfSeason.rating} average rating`:`${playerOfSeason?.goals||0} goals`});
    if(seasonYear>=1974)add({name:'Young Player of the Year',winner:youngPlayer?.name||'No eligible winner',playerId:youngPlayer?.id||null,detail:youngPlayer?`Age ${youngPlayer.age} · ${youngPlayer.goals} goals · ${youngPlayer.assists} assists`:'No eligible player recorded'});
    add({name:seasonYear>=1968?'Golden Boot':'League Leading Goalscorer',winner:goldenBoot?.name||'No winner',playerId:goldenBoot?.id||null,detail:`${goldenBoot?.goals||0} goals`});
    if(seasonYear>=1992)add({name:'Playmaker Award',winner:playmaker?.name||'No winner',playerId:playmaker?.id||null,detail:`${playmaker?.assists||0} assists`});
    if(seasonYear>=1950)add({name:seasonYear>=1992?'Golden Glove':'Goalkeeper Honour',winner:goldenGlove?.name||'No winner',playerId:goldenGlove?.id||null,detail:`${goldenGlove?.cleanSheets||0} clean sheets`});
    const divisions=window.FLPyramid?FLPyramid.divisionList(game):[];
    divisions.forEach(division=>{const clubIds=new Set((game.clubs||[]).filter(c=>c.divisionId===division.id).map(c=>c.id)),pool=players.filter(p=>clubIds.has(p.clubId)&&p.apps>0);if(!pool.length)return;const best=rated(pool)[0]||by(pool,'goals'),scorer=by(pool,'goals');add({name:seasonYear>=1947?`${division.name} Player of the Season`:`${division.name} Outstanding Player`,winner:best?.name||'No winner',playerId:best?.id||null,divisionId:division.id,detail:Number.isFinite(Number(best?.rating))?`${best.rating} average rating`:`${best?.goals||0} goals`});add({name:`${division.name} Leading Goalscorer`,winner:scorer?.name||'No winner',playerId:scorer?.id||null,divisionId:division.id,detail:`${scorer?.goals||0} goals`})});
    if(seasonYear>=1950&&champion?.managerProfile)awards.push({name:'Manager of the Year',winner:`${champion.managerProfile.firstName} ${champion.managerProfile.lastName}`,managerId:champion.managerProfile.id,detail:`Champions with ${champion.name}`});
    return awards;
  }
  function seasonTeamOfTheYear(players){
    const rating=p=>Number.isFinite(Number(p.rating))?Number(p.rating):5.5+(p.goals*.08)+(p.assists*.05)+(p.apps*.005);
    const selected=[],take=(pool,count)=>{[...pool].sort((a,b)=>rating(b)-rating(a)||b.goals-a.goals).slice(0,count).forEach(p=>{if(!selected.some(x=>x.id===p.id))selected.push(p);});};
    take(players.filter(p=>p.position==='GK'),1);take(players.filter(p=>['FB','HB'].includes(p.position)),3);take(players.filter(p=>['HB','IF','W'].includes(p.position)),4);take(players.filter(p=>['CF','IF','W'].includes(p.position)),3);take(players,11-selected.length);
    return selected.slice(0,11);
  }
  function seasonManagerRows(game,fixtures,label){
    return game.clubs.filter(team=>team.leagueActive!==false).map(team=>{
      let won=0,drawn=0,lost=0,gf=0,ga=0;const rows=(fixtures||[]).filter(f=>f.homeId===team.id||f.awayId===team.id);
      rows.forEach(f=>{const ours=f.homeId===team.id?Number(f.homeGoals)||0:Number(f.awayGoals)||0,theirs=f.homeId===team.id?Number(f.awayGoals)||0:Number(f.homeGoals)||0;gf+=ours;ga+=theirs;if(ours>theirs)won++;else if(ours===theirs)drawn++;else lost++;});
      // Headless history does not retain every fixture. Team aggregates are the
      // authoritative season record in that mode, so managers no longer open
      // their history page with 0 matches and 0 wins.
      if(!rows.length){won=Number(team.won)||0;drawn=Number(team.drawn)||0;lost=Number(team.lost)||0;gf=Number(team.gf)||0;ga=Number(team.ga)||0}
      const m=team.managerProfile||{};return {season:label,id:m.id,managerId:m.id,name:`${m.firstName||'Club'} ${m.lastName||'Manager'}`,clubId:team.id,club:team.name,played:won+drawn+lost,won,drawn,lost,gf,ga};
    });
  }
  function archiveSeason(game){
    if(!game.fixtures.some(f=>f.played))return null;
    // Background divisions do not create thousands of individual fixtures.
    // Generate their complete aggregate tables here, after the played season
    // and before honours, managers and movement are archived. Previously these
    // totals were generated at season setup and immediately wiped back to zero.
    const endingYear=Number(String(game.date||'1889').slice(0,4))||1889;if(window.FLPyramid)FLPyramid.simulateLightweightSeason(game,endingYear-1);
    ensureClubManagers(game);game.seasonArchive=Array.isArray(game.seasonArchive)?game.seasonArchive:[];const headless=Boolean(game.meta?.headless);
    const label=endingSeasonLabel(game.date);if(game.seasonArchive.some(s=>s.season===label))return game.seasonArchive.find(s=>s.season===label);
    const pyramidTables=window.FLPyramid?FLPyramid.allTables(game):[{division:{id:'football-league',name:'Football League',tier:1},table:table(game)}];
    const controlledDivision=window.FLPyramid?FLPyramid.divisionForClub(game,game.controlledClubId):pyramidTables[0]?.division;
    const selectedTable=(pyramidTables.find(x=>x.division.id===controlledDivision?.id)||pyramidTables[0]);
    const toRows=block=>block.table.map((team,index)=>{const base={position:index+1,id:team.id,name:team.name,played:Number(team.played)||0,won:Number(team.won)||0,drawn:Number(team.drawn)||0,lost:Number(team.lost)||0,gf:Number(team.gf)||0,ga:Number(team.ga)||0,points:Number(team.points)||0,divisionId:block.division.id,division:block.division.name,tier:block.division.tier};return headless?base:{...base,stature:+Number(team.stature||0).toFixed(2),momentum:+Number(team.momentum||0).toFixed(2),powerRating:+Number(team.powerRating||team.clubRating||0).toFixed(2),trajectory:team.currentTrajectory||'flat',cause:team.currentCause||''}});
    const pyramidRows=pyramidTables.map(block=>({division:{...block.division},table:toRows(block)})),standings=(pyramidRows.find(x=>x.division.id===controlledDivision?.id)||pyramidRows[0])?.table||[];
    const activeTeams=game.clubs.filter(c=>c.leagueActive!==false),allPlayers=activeTeams.flatMap(team=>(team.players||[]).map(player=>seasonPlayerSnapshot(player,team)));
    const controlledPlayers=headless?[]:allPlayers.filter(p=>p.clubId===game.controlledClubId),notable=[...allPlayers].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0)||b.goals-a.goals||b.assists-a.assists||b.ability-a.ability).slice(0,headless?16:50),legendPlayers=allPlayers.filter(p=>p.legendArchetype);
    const compactMap=new Map([...controlledPlayers,...notable,...legendPlayers].map(p=>[p.id,p])),players=[...compactMap.values()];
    const allFixtures=headless?[]:game.fixtures.map(f=>({id:f.id,date:f.date,round:f.round,divisionId:f.divisionId,tier:f.tier,competition:f.competition,homeId:f.home,awayId:f.away,homeName:club(game,f.home)?.name||f.home,awayName:club(game,f.away)?.name||f.away,played:Boolean(f.played),homeGoals:f.homeGoals,awayGoals:f.awayGoals,matchRecordId:f.matchRecordId||null}));
    const fixtures=headless?[]:allFixtures.filter(f=>f.homeId===game.controlledClubId||f.awayId===game.controlledClubId);
    const competition=window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):(window.FLTimeline?FLTimeline.currentCompetition(game):{id:'football-league',name:'Football League',official:true}),official=competition.official!==false;
    const champions=pyramidRows.map(block=>({divisionId:block.division.id,division:block.division.name,tier:block.division.tier,clubId:block.table[0]?.id||null,club:block.table[0]?.name||'—'}));
    const topChampion=game.clubs.find(c=>c.id===champions.find(x=>x.tier===1)?.clubId)||null,controlledChampion=game.clubs.find(c=>c.id===standings[0]?.id)||null;
    const awards=chooseSeasonAwards(allPlayers,topChampion,game),teamOfSeason=seasonTeamOfTheYear(allPlayers);
    const topScorer=[...allPlayers].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name))[0]||null,topAssister=[...allPlayers].sort((a,b)=>b.assists-a.assists||a.name.localeCompare(b.name))[0]||null;
    const startYear=Number(label.slice(0,4))||1888,transfers=headless?[]:(game.worldUI?.transferHistory||[]).filter(t=>String(t.date||'')>=`${startYear}-07-01`&&String(t.date||'')<=`${startYear+1}-06-30`),allManagers=seasonManagerRows(game,allFixtures,label),managers=[...allManagers].sort((a,b)=>b.won-a.won||b.gf-a.gf).filter((m,i)=>i<12||m.clubId===game.controlledClubId||champions.some(ch=>ch.clubId===m.clubId));
    const trajectorySnapshot=headless?[]:activeTeams.map(team=>({clubId:team.id,club:team.name,stature:+Number(team.stature||0).toFixed(2),momentum:+Number(team.momentum||0).toFixed(2),powerRating:+Number(team.powerRating||team.clubRating||0).toFixed(2),financialPower:+Number(team.financialPower||0).toFixed(2),youthQuality:+Number(team.youthGenerationQuality||0).toFixed(2),managerQuality:+Number(team.managerQuality||0).toFixed(2),ceiling:+Number(team.clubCeiling||0).toFixed(2),trajectory:team.currentTrajectory||'flat',cause:team.currentCause||''}));
    const snapshot={season:label,live:false,official,competition:{...competition},champion:official?(controlledChampion?.name||'—'):'Unofficial wartime programme',championId:official?(controlledChampion?.id||null):null,champions:champions.map(x=>({...x,official})),wartimeWinners:official?[]:champions,table:standings,pyramidTables:pyramidRows,players,fixtures,topScorer,topAssister,awards,teamOfSeason,cups:window.FLEnglishCup?FLEnglishCup.seasonRecord(game,label):[],promoted:[],relegated:[],transfers,managers,trajectorySnapshot,archivedAt:game.date};
    game.seasonArchive.push(snapshot);
    activeTeams.forEach(team=>{const block=pyramidRows.find(x=>x.division.id===team.divisionId),row=block?.table.find(x=>x.id===team.id),entry={season:label,division:block?.division.name||'—',divisionId:block?.division.id||null,tier:block?.division.tier||team.tier||'—',position:row?.position||'—',played:row?.played||0,won:row?.won||0,drawn:row?.drawn||0,lost:row?.lost||0,gf:row?.gf||0,ga:row?.ga||0,points:row?.points||0};team.seasonHistory.push(entry)});
    champions.forEach(ch=>{const champion=game.clubs.find(c=>c.id===ch.clubId);if(!champion)return;const honour={name:ch.division,season:label,official};if(!official){champion.wartimeHonours=Array.isArray(champion.wartimeHonours)?champion.wartimeHonours:[];addHonour(champion.wartimeHonours,honour);return}addHonour(champion.honours,honour);champion.players.filter(p=>(p.appearances||0)>0).forEach(p=>{p.honours=Array.isArray(p.honours)?p.honours:[];addHonour(p.honours,honour)})});
    awards.forEach(a=>{if(!a.playerId)return;const found=game.clubs.flatMap(c=>c.players).find(p=>p.id===a.playerId);if(found){found.honours=Array.isArray(found.honours)?found.honours:[];addHonour(found.honours,{name:a.name,season:label,personal:true})}});
    teamOfSeason.forEach(row=>{const found=game.clubs.flatMap(c=>c.players).find(p=>p.id===row.id);if(found){found.honours=Array.isArray(found.honours)?found.honours:[];addHonour(found.honours,{name:'Team of the Season',season:label,personal:true})}});
    if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordSeason(game,snapshot,allManagers);
    const headline=!official?(topChampion?`${topChampion.name} top a wartime regional programme`:`The ${label} wartime programme concludes`):(topChampion?`${topChampion.name} win the top-flight championship`:`The ${label} season concludes`);game.history=Array.isArray(game.history)?game.history:[];game.history.push({date:game.date,type:official?'season':'wartime-season',title:headline,text:official?`The ${label} English league season across ${pyramidRows.length} division${pyramidRows.length===1?'':'s'} has been stored in the permanent history archive.`:`The ${label} wartime regional results have been stored separately from official league championships. Promotion and relegation remained suspended.`});game.news=Array.isArray(game.news)?game.news:[];game.news.unshift({date:game.date,headline});
    // Keep long careers viable in browser storage by retaining complete controlled-club data plus the season's leading and legendary players.
    if(game.seasonArchive.length>155)game.seasonArchive=game.seasonArchive.slice(-155);
    // Older seasons retain permanent tables, champions, awards and movement while bulky match/player detail stays available for the latest 25 campaigns.
    game.seasonArchive.slice(0,-25).forEach(old=>{if(old.compact)return;old.compact=true;old.fixtures=[];old.players=(old.players||[]).filter(p=>p.clubId===game.controlledClubId||p.playerId===old.topScorer?.id).slice(0,22);old.managers=(old.managers||[]).filter(m=>m.clubId===game.controlledClubId||m.clubId===old.champions?.find(c=>c.tier===1)?.clubId).slice(0,4);old.transfers=[];old.teamOfSeason=(old.teamOfSeason||[]).slice(0,11)});
    return snapshot;
  }
  function startNewSeason(game,startYear){
    game.clubs.forEach(team=>{team.played=0;team.won=0;team.drawn=0;team.lost=0;team.gf=0;team.ga=0;team.points=0;team.formRating=50});
    const context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{id:'football-league',name:'Football League',official:true,rounds:2,startMonthDay:'09-08'};
    if(window.FLTimeline){FLTimeline.ensure(game);game.worldState.seasonCompetition={...context};FLTimeline.consumeScheduleRebuild(game)}
    if(window.FLPyramid&&Number(game.pyramid?.seasonYear)!==Number(startYear))FLPyramid.ensure(game,startYear);
    game.fixtures=makePyramidSchedule(game,startYear);if(window.FLEnglishCup)FLEnglishCup.newSeason(game,startYear);if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,startYear);game.postMatchComplete=false;game.activeMatchId=null;
    if(game.matchUI){game.matchUI.playing=false;game.matchUI.recordId=null;game.matchUI.minute=0;game.matchUI.clockStep=0;game.matchUI.phase='complete';game.matchUI.pitchPositions={};game.matchUI.pitchVelocities={}}
    const competition=window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):context,id=`new-season-${startYear}`;
    if(!game.inbox.some(x=>x.id===id))game.inbox.unshift({id,date:game.date,from:context.official?'Football League Office':'Wartime Football Committee',subject:`Fixtures issued for ${startYear}-${String(startYear+1).slice(2)}`,body:`The new ${competition.name} fixture list has been issued. ${context.official?'Promotion, relegation and every division will be recorded in the permanent archive.':'These regional wartime fixtures are recorded separately from the official championship.'}`,read:false});
    if(window.FLLivingWorld)FLLivingWorld.ensure(game);
    game.version=game.meta?.grassroots?'0.28.1-phase-2':'0.27.5.1';
  }

  function rebuildCurrentSchedule(game,reason){
    const startYear=Number(game.date.slice(0,4))||1888,context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{name:'Football League',official:true,rounds:2};
    const played=(game.fixtures||[]).filter(f=>f.played),unplayed=(game.fixtures||[]).filter(f=>!f.played);game.abandonedSeasons=Array.isArray(game.abandonedSeasons)?game.abandonedSeasons:[];
    if(played.length)game.abandonedSeasons.push({date:game.date,reason,competition:game.worldState?.seasonCompetition?.name||'Football League',fixtures:played.map(f=>({...f})),tables:window.FLPyramid?FLPyramid.allTables(game).map(x=>({division:x.division,table:x.table.map(c=>({id:c.id,name:c.name,played:c.played,won:c.won,drawn:c.drawn,lost:c.lost,gf:c.gf,ga:c.ga,points:c.points}))})):[]});
    unplayed.forEach(f=>f.abandoned=true);game.abandonedFixtures=Array.isArray(game.abandonedFixtures)?game.abandonedFixtures:[];game.abandonedFixtures.push(...unplayed.map(f=>({...f})));
    game.clubs.forEach(team=>{team.played=0;team.won=0;team.drawn=0;team.lost=0;team.gf=0;team.ga=0;team.points=0});if(window.FLTimeline)game.worldState.seasonCompetition={...context};
    const d=new Date(`${game.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+14);const startDate=iso(d);game.fixtures=makePyramidSchedule(game,startYear,{startDate}).filter(f=>f.date>game.date);if(window.FLEnglishCup&&FLEnglishCup.active(game))FLEnglishCup.newSeason(game,startYear);
    if(window.FLTimeline)FLTimeline.consumeScheduleRebuild(game);game.history.push({id:`schedule-rebuild-${game.date}`,date:game.date,type:'world',title:`${context.name} programme issued`,text:`The previous fixture programme was abandoned and replaced following ${reason||'a major football-wide event'}.`});
  }

  function annualPlayerDevelopment(game){
    const developmentYear=Number(String(game.date||'1889').slice(0,4))||1889;
    game.clubs.forEach(club=>(club.players||[]).forEach(player=>{
      const pr=rng(hashSeed(`${game.meta?.seed||1}-${player.id}-${developmentYear}-development`));
      const env=developmentEnvironment(player,club), curve=player.developmentCurve||'steady';
      const age=player.age||20, endingAbility=Number(player.ability)||40, division=window.FLPyramid?.divisionForClub(game,club.id)||null;
      const leagueCap=window.FLFootballBalance?FLFootballBalance.capForPlayer(game,club,player):(player.legendArchetype?99:94);
      const ceiling=Math.min(Number(player.ceiling||player.potential||endingAbility),leagueCap);
      let ageWindow=age<20?1.25:age<24?1:age<28?.62:age<31?.28:-.25;
      if(curve==='early') ageWindow+=age<22?.35:age>27?-.3:0;
      if(curve==='late') ageWindow+=age<23?-.35:age<30?.45:0;
      if(curve==='volatile') ageWindow+=(pr()-.5)*.8;
      const gap=Math.max(0,ceiling-endingAbility);
      let change=Math.round((gap/14)*env*ageWindow);
      if(age>31){
        const recordProfile=player.careerRecordProfile||'standard',declineStart=recordProfile==='all-time'?37:recordProfile==='ironman'?35:recordProfile==='goal-machine'?34:31,declineDivisor=recordProfile==='all-time'?6:recordProfile==='ironman'?5:recordProfile==='goal-machine'?4:3;
        change=age<=declineStart?Math.max(0,change):-Math.max(0,Math.round((age-declineStart)/declineDivisor));
      }
      if((player.personalityProfile?.injuryProneness||0)>72 && pr()<.25) change-=1+Math.floor(pr()*2);
      if(window.FLLivingWorld){const development=FLLivingWorld.developmentYear(game,player,club,change);change=development.change;}
      player.ability=clamp(endingAbility+change,24,leagueCap);
      const surprise=(player.personalityProfile?.determination||50)>82 && age>=23 && age<=29 && pr()<.08 && player.ability<leagueCap-2;
      if(surprise) player.ceiling=clamp(Number(player.ceiling||player.ability)+1+Math.floor(pr()*2),player.ability,leagueCap);
      const talentCap=Math.min(Number(player.talentCap||player.ceiling||leagueCap),leagueCap);
      player.ceiling=clamp(Math.min(talentCap,Number(player.ceiling||talentCap)),player.ability,leagueCap);
      player.potential=clamp(Math.round(player.ability+(player.ceiling-player.ability)*(.55+env*.25)),player.ability,leagueCap);
      player.age++;
      player.seasonHistory=player.seasonHistory||[];
      player.seasonHistory.push({season:`${Number(game.date.slice(0,4))-1}/${game.date.slice(2,4)}`,club:club.name,clubId:club.id,league:division?.name||'English football',division:division?.name||'English football',divisionId:division?.id||club.divisionId||null,tier:Number(division?.tier||club.tier)||null,apps:player.appearances||0,goals:player.goals||0,assists:player.assists||0,cleanSheets:player.cleanSheets||0,rating:player.averageRating||'—',ability:endingAbility});
      if(player.seasonHistory.length>50)player.seasonHistory=player.seasonHistory.slice(-50);
      if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,player,developmentYear);
      player.careerTotals=player.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};player.honours=(Array.isArray(player.honours)?player.honours:[]).filter(h=>{const match=String(typeof h==='string'?h:(h?.name||h?.title||'')).match(/^([\d,]+)\s+Career\s+(Appearances|Goals)$/i);if(!match)return true;const total=Number(match[1].replace(/,/g,'')),kind=match[2].toLowerCase();return kind==='appearances'?total===1000:total===500;});
      const milestoneSeason=`${developmentYear-1}-${String(developmentYear).slice(2)}`,awardMilestone=(name,threshold,value)=>{const key=name.replace(/,/g,'');if(value>=threshold&&!player.honours.some(h=>String(typeof h==='string'?h:(h?.name||'')).replace(/,/g,'')===key))player.honours.push({name,season:milestoneSeason,personal:true,milestone:true})};
      awardMilestone('1,000 Career Appearances',1000,Number(player.careerTotals.appearances)||0);awardMilestone('500 Career Goals',500,Number(player.careerTotals.goals)||0);
      player.appearances=0;player.starts=0;player.subApps=0;player.minutes=0;player.goals=0;player.assists=0;player.yellowCards=0;player.redCards=0;player.cleanSheets=0;player.conceded=0;player.playerOfMatch=0;player.averageRating='—';player._ratingTotal=0;
    }));
  }
  function advanceDay(game, options={}){
    if(window.FLTimeline)FLTimeline.ensure(game);if(window.FLEnglishCup)FLEnglishCup.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLClubTrajectory)FLClubTrajectory.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLWorldFootball)FLWorldFootball.ensure(game,{backfill:false});if(window.FLPyramid)FLPyramid.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLLivingWorld)FLLivingWorld.ensure(game);if(window.FLLegacySystems)FLLegacySystems.ensure(game);if(window.FLPeople)FLPeople.ensure(game);if(window.FLDressingRoom)FLDressingRoom.ensure(game);if(window.FLPersonalLife)FLPersonalLife.ensure(game);if(window.FLCareerSystems)FLCareerSystems.ensure(game);if(window.FLGrassroots)FLGrassroots.ensure(game);
    const existingDecision=(window.FLGrassroots?FLGrassroots.nextBlocking(game):null)||(window.FLLivingWorld?FLLivingWorld.nextBlocking(game):null);if(existingDecision){game.selectedTab=existingDecision.targetTab||'board';return {game,stopped:true,reason:'decision',decision:existingDecision}}
    if(window.FLLivingWorld&&FLLivingWorld.seasonExperience(game)){game.selectedTab='season';return {game,stopped:true,reason:'season'}}
    if(options.stopAtControlledMatch){const currentFixture=fixtureOn(game,game.date);if(currentFixture&&!currentFixture.played){if(window.FLGrassroots)FLGrassroots.prepareMatchday(game,currentFixture);return {game,stopped:true,reason:'match'}}}
    if(game.date.slice(5)==='06-30'&&!game.meta?.headless&&window.FLCareerSystems){const closeCheck=FLCareerSystems.canCloseSeason(game);if(!closeCheck.ok){game.selectedTab='competitions';return {game,stopped:true,reason:'season-incomplete',details:closeCheck}}}
    const previousDate=game.date,d=new Date(`${game.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);game.date=iso(d);
    const monthDay=game.date.slice(5),startYear=Number(game.date.slice(0,4))||1889;let timelineResult={rebuildSchedule:false};
    if(monthDay==='07-01'){
      const endingYear=startYear-1;if(window.FLCareerSystems){const audit=FLCareerSystems.beforeSeasonEnd(game,endingYear);if(audit.blocked){game.date=previousDate;game.selectedTab='competitions';return {game,stopped:true,reason:'season-incomplete',details:audit}}}
      const archived=archiveSeason(game);
      const movement=window.FLPyramid?FLPyramid.finaliseSeason(game,endingYear):{promoted:[],relegated:[]};
      if(archived){archived.promoted=movement.promoted||[];archived.relegated=movement.relegated||[];if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordMovement(game,archived,movement)}
      annualPlayerDevelopment(game);
      if(window.FLHistoricalPlayerMobility)FLHistoricalPlayerMobility.annualUpdate(game,startYear);
      if(window.FLEconomy)FLEconomy.annualUpdate(game,startYear);
      if(window.FLManagerContracts)FLManagerContracts.annualUpdate(game,startYear,archived);
      if(window.FLTimeline){timelineResult=FLTimeline.processDate(game,previousDate,game.date);FLTimeline.annualUpdate(game,startYear)}
      if(window.FLWorldFootball){FLWorldFootball.processDate(game,previousDate,game.date);FLWorldFootball.annualUpdate(game,startYear)}
      if(window.FLHistoryIntegrity)FLHistoryIntegrity.inductHallOfFame(game,startYear);
      if(window.FLPyramid)FLPyramid.prepareSeason(game,startYear);if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});
      ensureClubManagers(game);startNewSeason(game,startYear);
      if(window.FLCareerSystems)FLCareerSystems.annualUpdate(game,startYear,archived);
      if(window.FLLivingWorld)FLLivingWorld.annualUpdate(game,startYear,archived);
      if(window.FLLegacySystems)FLLegacySystems.annualUpdate(game,startYear,archived);
      if(window.FLDressingRoom)FLDressingRoom.annualUpdate(game,startYear,archived);if(window.FLPersonalLife)FLPersonalLife.annualUpdate(game,startYear);if(window.FLGrassroots)FLGrassroots.annualUpdate(game,startYear,archived);
    }else{
      if(window.FLTimeline)timelineResult=FLTimeline.processDate(game,previousDate,game.date);if(window.FLWorldFootball)FLWorldFootball.processDate(game,previousDate,game.date);if(window.FLLivingWorld)FLLivingWorld.processDate(game,previousDate,game.date);if(window.FLLegacySystems)FLLegacySystems.processDate(game,previousDate,game.date);if(window.FLDressingRoom)FLDressingRoom.dailyTick(game,previousDate);if(window.FLTransferMarket&&!(window.FLGrassroots?.useLocalRecruitment?.(game)))FLTransferMarket.dailyTick(game,previousDate);if(window.FLCareerSystems)FLCareerSystems.dailyTick(game,previousDate);if(window.FLConversations)FLConversations.dailyTick(game,previousDate);if(timelineResult.rebuildSchedule)rebuildCurrentSchedule(game,timelineResult.reason);
    }
    if(window.FLGrassroots)FLGrassroots.dailyTick(game,previousDate);
    const controlledMatch=fixtureOn(game,game.date),controlledMatchPending=Boolean(options.stopAtControlledMatch&&controlledMatch&&!controlledMatch.played);if(controlledMatchPending&&window.FLGrassroots)FLGrassroots.prepareMatchday(game,controlledMatch);if(!controlledMatchPending)game.fixtures.filter(f=>f.date===game.date&&!f.played).forEach(f=>simulateFixture(game,f));if(!controlledMatchPending&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
    if(monthDay==='09-01'&&!game.inbox.some(x=>x.id===`season-nears-${startYear}`)){const comp=currentCompetition(game);game.inbox.unshift({id:`season-nears-${startYear}`,date:game.date,from:'Assistant',subject:'The season approaches',body:`The opening ${comp.name} match is now close. The squad is ready for selection.`,read:false,link:{tab:'match',label:'OPEN MATCH'}})}
    const controlled=controlledClub(game);if(controlled)controlled.players.forEach(p=>{if(p.status!=='deceased'&&p.status!=='retired')p.condition=Math.min(100,(p.condition||90)+1)});if(game.inbox.length>400)game.inbox=game.inbox.slice(0,400);if(game.news.length>600)game.news=game.news.slice(0,600);if(game.history.length>5000)game.history=game.history.slice(-5000);game.version=game.meta?.grassroots?'0.28.1-phase-2':'0.27.5.1';
    const decision=(window.FLGrassroots?FLGrassroots.nextBlocking(game):null)||(window.FLLivingWorld?FLLivingWorld.nextBlocking(game):null),season=window.FLLivingWorld?FLLivingWorld.seasonExperience(game):null;if(decision)game.selectedTab=decision.targetTab||'board';else if(season)game.selectedTab='season';
    return {game,stopped:Boolean(controlledMatchPending||decision||season),reason:controlledMatchPending?'match':decision?'decision':season?'season':null,decision,timeline:timelineResult};
  }


  function neutralManager(){return {firstName:'World',lastName:'Historian',age:45,nationality:'England',birthplace:'England',managementStyle:'Balanced',temperament:'Calm',occupation:'Club Secretary',reputation:'Regional',portrait:'assets/real-portraits/faces/rp-001-1.webp',appointedDate:'1888-08-15',user:false};}
  function createWorld(options={}){
    const targetYear=clamp(Number(options.startYear)||1888,1888,2026),worldSeed=Number(options.seed)||hashSeed(`${Date.now()}-${Math.random()}-${targetYear}`),founder=FLData.clubs[0];
    const game=create(neutralManager(),founder,{seed:worldSeed,preselectedClubId:options.selectedClubId||null});game.meta.worldSeed=worldSeed;game.meta.startYear=targetYear;game.meta.headless=true;game.meta.historyGenerated=false;game.inbox=[];game.selectedTab='home';
    // The neutral setup identity is only a loading placeholder. It must never
    // become a 100-year historical manager in the archive.
    const placeholder=game.clubs.find(c=>c.id===game.controlledClubId);if(placeholder){placeholder.managerProfile=null;placeholder.managerHistory=[]}ensureClubManagers(game);return game;
  }
  function compactHeadlessHistory(game){
    const selected=game.meta?.preselectedClubId,history=Array.isArray(game.history)?game.history:[];if(history.length>6000){const important=x=>['season','competition','disaster','war','club-admission','world','timeline'].includes(x.type)||x.category==='disaster'||x.clubId===selected;const fixed=history.filter(important),routine=history.filter(x=>!important(x)).slice(-Math.max(0,6000-fixed.length));game.history=[...fixed.slice(-4500),...routine].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(-6000)}if(Array.isArray(game.news)&&game.news.length>1000)game.news=game.news.slice(0,1000);if(Array.isArray(game.retiredPlayers)&&game.retiredPlayers.length>1800){const selectedRows=game.retiredPlayers.filter(p=>p.lastClubId===selected||p.legendArchetype),others=game.retiredPlayers.filter(p=>p.lastClubId!==selected&&!p.legendArchetype).slice(-Math.max(0,1800-selectedRows.length));game.retiredPlayers=[...selectedRows,...others].slice(-1800)}
  }
  function clearHeadlessInterruptions(game){
    game.inbox=[];game.postMatchComplete=false;game.activeMatchId=null;if(game.livingWorld){game.livingWorld.decisions=[];game.livingWorld.seasonExperience=null;game.livingWorld.pendingSeasonExperience=null;}if(game.matchUI){game.matchUI.playing=false;game.matchUI.recordId=null;game.matchUI.minute=0;game.matchUI.clockStep=0;game.matchUI.phase='complete';game.matchUI.pitchPositions={};game.matchUI.pitchVelocities={}}
  }
  function simulateHeadlessSeason(game,seasonYear){
    const seasonEnd=`${seasonYear+1}-07-01`,previousBoundary=game.meta.fastForwardBoundary||game.date;
    // Process fixtures in sorted batches. Cup rounds and replays can append new
    // fixtures, so refresh once per newly-created batch rather than sorting the
    // whole season after every individual match.
    let batchGuard=0;
    while(batchGuard++<64){
      const batch=(game.fixtures||[]).filter(f=>!f.played&&!f.abandoned).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
      if(!batch.length)break;
      const containsCup=batch.some(f=>f.competitionId==='english-cup');game.meta.deferCupProgress=true;
      try{for(const next of batch){if(next.played||next.abandoned)continue;game.date=next.date;simulateFixture(game,next)}}finally{game.meta.deferCupProgress=false}
      if(containsCup&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
    }
    game.date=seasonEnd;if(window.FLCareerSystems)FLCareerSystems.beforeSeasonEnd(game,seasonYear);const archived=archiveSeason(game),movement=window.FLPyramid?FLPyramid.finaliseSeason(game,seasonYear):{promoted:[],relegated:[]};if(archived){archived.promoted=movement.promoted||[];archived.relegated=movement.relegated||[];if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordMovement(game,archived,movement)}
    annualPlayerDevelopment(game);if(window.FLHistoricalPlayerMobility)FLHistoricalPlayerMobility.annualUpdate(game,seasonYear+1);if(window.FLEconomy)FLEconomy.annualUpdate(game,seasonYear+1);if(window.FLTimeline){FLTimeline.processDate(game,previousBoundary,game.date);FLTimeline.annualUpdate(game,seasonYear+1)}if(window.FLWorldFootball){FLWorldFootball.processDate(game,previousBoundary,game.date);FLWorldFootball.annualUpdate(game,seasonYear+1)}if(window.FLHistoryIntegrity)FLHistoryIntegrity.inductHallOfFame(game,seasonYear+1);if(window.FLPyramid)FLPyramid.prepareSeason(game,seasonYear+1);if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});ensureClubManagers(game);startNewSeason(game,seasonYear+1);if(window.FLCareerSystems)FLCareerSystems.annualUpdate(game,seasonYear+1,archived);if(window.FLLegacySystems)FLLegacySystems.annualUpdate(game,seasonYear+1,archived);compactHeadlessHistory(game);game.meta.fastForwardBoundary=game.date;clearHeadlessInterruptions(game);return archived;
  }
  async function fastForwardToYear(game,targetYear,onProgress){
    const finalYear=clamp(Number(targetYear)||1888,1888,2026),from=Number(String(game.date||'1888').slice(0,4))||1888,total=Math.max(0,finalYear-from),now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now(),started=now();game.meta.headless=true;
    for(let year=from;year<finalYear;year++){simulateHeadlessSeason(game,year);if(onProgress)onProgress({year:year+1,completed:year-from+1,total,percent:total?Math.round(((year-from+1)/total)*100):100});if((year-from+1)%4===0)await new Promise(resolve=>setTimeout(resolve,0))}
    if(finalYear===2026&&window.FLPyramid?.applyDatabaseSnapshot?.(game,finalYear)){game.fixtures=makePyramidSchedule(game,finalYear);if(window.FLEnglishCup)FLEnglishCup.newSeason(game,finalYear);if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,finalYear);game.history=Array.isArray(game.history)?game.history:[];game.history.push({date:`${finalYear}-08-01`,type:'database-snapshot',title:'Modern club structure loaded',text:`The ${finalYear} start uses the approved club names, divisions, strength and prestige database.`})}
    // Historical starts are the result of the simulated tables. Never overwrite
    // the generated next-season placement with a real-world/prestige snapshot:
    // doing so could relegate a club after finishing third with no movement row.
    if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});
    if(window.FLHistoryIntegrity)FLHistoryIntegrity.migrate(game,{force:true});
    // A fresh historical start represents the people holding jobs in that year,
    // not the placeholder managers created in 1888. Rebase AI portrait dates so
    // a 1970s or modern career never opens with an entirely Victorian boardroom.
    (game.clubs||[]).forEach(club=>{const profile=club.managerProfile;if(!profile||profile.user)return;profile.faceAssignedYear=finalYear;delete profile.managerPortraitAsset;delete profile.portrait;if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,finalYear,{lockedYear:finalYear})});
    game.date=`${finalYear}-08-15`;game.meta.historyGenerated=true;game.meta.generatedToYear=finalYear;game.meta.fastForwardMs=Math.round(now()-started);delete game.meta.fastForwardBoundary;return game;
  }
  function attachManager(game,manager,clubRef){
    const id=typeof clubRef==='string'?clubRef:clubRef?.id;let team=club(game,id);if(!team){if(window.FLPyramid)FLPyramid.ensure(game,Number(String(game.date).slice(0,4)));team=club(game,id)}if(!team)team=(game.clubs||[]).find(c=>c.leagueActive)||(game.clubs||[])[0];if(window.FLPyramid)FLPyramid.hydrateClub(game,team,Number(String(game.date).slice(0,4)),'manager-appointment');if(window.FLFootballBalance){FLFootballBalance.calibrateClub(game,team,{force:true});FLFootballBalance.repairWorld(game,{force:false});}
    game.controlledClubId=team.id;game.meta.preselectedClubId=team.id;game.manager={...manager,appointedDate:game.date,user:true,portraitRole:'manager'};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,game.manager,Number(String(game.date).slice(0,4)));game.finances={balance:window.FLEconomy?FLEconomy.clubBudget(game,team):(Number(team.finance)||500),income:0,expenses:0,transferBudget:window.FLEconomy?FLEconomy.transferBudget(game,team):Math.max(25,Math.round((Number(team.finance)||500)*.3)),weeklyWageBudget:window.FLEconomy?FLEconomy.weeklyWageBudget(game,team):100};game.boardConfidence=65;if(window.FLManagerContracts)FLManagerContracts.startAppointment(game,team,{startDate:game.manager.appointedDate||game.date});const comp=window.FLPyramid?FLPyramid.competitionForClub(game,team.id):{name:'English football'};game.inbox=openingInbox(game.manager,team,game.date,comp?.name||'English football').map(x=>({...x,id:`${x.id}-${game.date}`}));if(comp?.official===false)game.inbox.unshift({id:`wartime-opening-${game.date}`,date:game.date,from:'Wartime Football Committee',subject:'Normal league football remains suspended',body:'This career begins during wartime. Clubs play temporary regional fixtures, service absences and guest registrations are active, and results are stored separately from official championships. Promotion and relegation are suspended.',read:false});game.selectedTab='home';game.meta.headless=false;game.meta.careerActive=true;game.meta.startYear=Number(String(game.date).slice(0,4));
    team.managerHistory=Array.isArray(team.managerHistory)?team.managerHistory:[];const outgoing=[...team.managerHistory].reverse().find(x=>x.to==='Present');if(outgoing){outgoing.to=game.date;outgoing.reason='Replaced by the player manager'}const outgoingProfile=team.managerProfile;if(outgoingProfile&&window.FLHistoryIntegrity){const archived=(game.managerArchive||[]).find(x=>x.id===outgoingProfile.id);if(archived){archived.currentClubId=null;const spell=(archived.clubs||[]).at(-1);if(spell?.to==='Present')spell.to=Number(String(game.date).slice(0,4))}}
    team.managerProfile={...game.manager,id:`manager-${team.id}-${game.date}`,firstName:manager.firstName,lastName:manager.lastName,age:Number(manager.age)||35,birthYear:Number(manager.birthYear)||game.meta.startYear-(Number(manager.age)||35),nationality:manager.nationality||'England',birthplace:manager.birthplace||team.location,style:manager.managementStyle||'Balanced',temperament:manager.temperament||'Calm',reputation:manager.reputation||'Unknown Local Coach',clubId:team.id,user:true,portraitRole:'manager'};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,team.managerProfile,game.meta.startYear);team.managerHistory.push({managerId:team.managerProfile.id,name:`${manager.firstName} ${manager.lastName}`,from:game.date,to:'Present',role:'Manager',age:team.managerProfile.age,birthYear:team.managerProfile.birthYear});
    if(window.FLDressingRoom){delete game.dressingRoom;FLDressingRoom.ensure(game)}if(window.FLLegacySystems){const generatedGlobalDisasters=game.legacySystems?.globalDisasters?JSON.parse(JSON.stringify(game.legacySystems.globalDisasters)):null,validatedThrough=game.legacySystems?.continuity?.validatedThrough;delete game.legacySystems;FLLegacySystems.ensure(game);if(generatedGlobalDisasters)game.legacySystems.globalDisasters=generatedGlobalDisasters;if(Number.isFinite(Number(validatedThrough)))game.legacySystems.continuity.validatedThrough=Number(validatedThrough)}if(window.FLLivingWorld){FLLivingWorld.ensure(game);game.livingWorld.decisions=[];game.livingWorld.seasonExperience=null;FLLivingWorld.ensureHistoricalWarStart?.(game)}
    if(window.FLPyramid){FLPyramid.ensure(game,game.meta.startYear);const d=FLPyramid.divisionForClub(game,team.id);game.fixtures=(game.fixtures||[]).filter(f=>f.played||Number(f.tier)<=FLPyramid.config.FULL_DETAIL_MAX_TIER||f.divisionId===d?.id);if(d&&!(game.fixtures||[]).some(f=>!f.played&&f.divisionId===d.id)){const extra=makeSchedule(FLPyramid.clubsInDivision(game,d.id),game.meta.startYear,{id:d.id,divisionId:d.id,tier:d.tier,name:d.name,idPrefix:`${game.meta.startYear}-${d.id}-managed`,startDate:`${game.meta.startYear}-09-01`,rounds:comp?.official===false?1:2});game.fixtures.push(...extra);game.fixtures.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))}}
    if(window.FLEconomy)FLEconomy.migrate(game);if(window.FLHistoryIntegrity)FLHistoryIntegrity.migrate(game);if(window.FLManagerContracts)FLManagerContracts.ensure(game);if(window.FLPeople)FLPeople.ensure(game);if(window.FLEraIdentity)FLEraIdentity.refreshAll(game);if(window.FLConversations)FLConversations.ensure(game);if(window.FLPersonalLife)FLPersonalLife.ensure(game);if(window.FLCareerSystems)FLCareerSystems.ensure(game);game.version='0.27.5.1';return game;
  }
  async function createStartYear(manager,selectedClub,startYear,onProgress){const selectedId=typeof selectedClub==='string'?selectedClub:selectedClub?.id;const world=createWorld({startYear,selectedClubId:selectedId});await fastForwardToYear(world,startYear,onProgress);return attachManager(world,manager,selectedClub)}
  function clubHistorySummary(game,clubId){
    const team=club(game,clubId);if(!team)return {headline:'Club history unavailable',lines:[]};const seasons=Array.isArray(team.seasonHistory)?team.seasonHistory:[],honours=Array.isArray(team.honours)?team.honours:[],best=[...seasons].filter(s=>Number.isFinite(Number(s.position))).sort((a,b)=>Number(a.tier)-Number(b.tier)||Number(a.position)-Number(b.position))[0],recent=seasons.slice(-5),promotions=(game.pyramid?.movementHistory||[]).flatMap(x=>x.promoted||[]).filter(x=>x.clubId===team.id).length,relegations=(game.pyramid?.movementHistory||[]).flatMap(x=>x.relegated||[]).filter(x=>x.clubId===team.id).length,current=window.FLPyramid?FLPyramid.divisionForClub(game,team.id):null;
    const milestones=window.FLClubHistory?FLClubHistory.milestonesFor(team,Number(String(game.date).slice(0,4))):[];
    return {headline:`${team.name} in ${String(game.date).slice(0,4)}`,milestones,lines:[`Founded ${String(team.founded||'1888').slice(0,4)} in ${team.location}.`,`Current level: ${current?.name||'Regional football'}${current?` (tier ${current.tier})`:''}.`,`${honours.length} recorded honour${honours.length===1?'':'s'}, ${promotions} promotion${promotions===1?'':'s'} and ${relegations} relegation${relegations===1?'':'s'}.`,best?`Best recorded league finish: ${best.position} in ${best.division} (${best.season}).`:'The club is still waiting for its first archived league finish.',recent.length?`Recent path: ${recent.map(s=>`${s.season} · T${s.tier} ${s.position}`).join(' / ')}`:'No completed seasons before this appointment.'].filter(Boolean)};
  }



  function average(values){ return values.length?values.reduce((a,b)=>a+b,0)/values.length:50; }
  function defaultTactics(team){
    const strength=Number(team.strength||3);
    return {mentality:strength>=4?58:strength<=2?43:50,tempo:50,passing:50,width:50,defensiveLine:strength>=4?56:46,pressing:strength>=4?57:46,creativeFreedom:50,timeWasting:20,buildUp:50};
  }
  function tacticalEffects(tactics){
    const t={...defaultTactics({strength:3}),...(tactics||{})};
    const possession=(100-t.passing)*.18+t.buildUp*.18+t.creativeFreedom*.06+t.tempo*-.05;
    const chanceVolume=t.mentality*.16+t.tempo*.13+t.buildUp*.09+t.width*.04+t.creativeFreedom*.05;
    const chanceQuality=t.creativeFreedom*.10+t.buildUp*.08+t.width*.04-t.tempo*.035;
    const defensiveSecurity=(100-t.mentality)*.11+(100-t.defensiveLine)*.08+(100-t.creativeFreedom)*.035;
    const pressing=t.pressing*.14+t.defensiveLine*.08;
    const fatigue=t.tempo*.09+t.pressing*.11+t.defensiveLine*.035;
    const transition=t.buildUp*.12+t.tempo*.07+t.passing*.04;
    return {raw:t,possession,chanceVolume,chanceQuality,defensiveSecurity,pressing,fatigue,transition};
  }
  function teamProfile(game,team,isHome=false){
    const managed=team.id===game.controlledClubId&&game.teamManagement;
    let starters;
    if(managed&&Array.isArray(game.teamManagement.startingXI)){
      starters=game.teamManagement.startingXI.map(id=>(team.players||[]).find(p=>p.id===id)).filter(p=>p&&p.available!==false&&p.status!=='retired'&&p.status!=='deceased');
    }
    const eligible=[...(team.players||[])].filter(p=>p.status!=='retired'&&p.status!=='deceased'&&p.available!==false);
    if(!starters||starters.length<11)starters=eligible.sort((a,b)=>((b.ability||50)*(b.condition||100))-((a.ability||50)*(a.condition||100))).slice(0,11);
    if(starters.length<11)starters=[...starters,...(team.players||[]).filter(p=>!starters.some(s=>s.id===p.id)&&p.status!=='deceased'&&p.status!=='retired').slice(0,11-starters.length)];
    const attack=average(starters.filter(p=>['CF','IF','W'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const midfield=average(starters.filter(p=>['HB','W','IF'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const defence=average(starters.filter(p=>['GK','FB','HB'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const fitness=average(starters.map(p=>p.condition||90));
    const form=Number(team.formRating||50), confidence=Number(team.confidence||50), morale=Number(team.morale||50);
    const manager=team.id===game.controlledClubId?52:Number(team.managerAbility||48);
    const home=isHome?4.5:0,trajectoryBonus=window.FLClubTrajectory?FLClubTrajectory.matchStrengthBonus(team):0;
    const tactics=managed?game.teamManagement.tactics:defaultTactics(team);
    const tactical=tacticalEffects(tactics);
    const eraTactics=window.FLLegacySystems?FLLegacySystems.tacticalContext(game,tactics,managed&&Array.isArray(game.teamManagement.positions)?game.teamManagement.positions:[]):{execution:1,modifiers:{pressing:1,buildUp:1,coordination:1},freePositioning:true};
    tactical.pressing*=eraTactics.modifiers.pressing;tactical.transition*=eraTactics.modifiers.buildUp;tactical.defensiveSecurity*=eraTactics.modifiers.coordination;
    const tacticalExecution=(eraTactics.execution-1)*4.5;
    const effective=(attack*.34+midfield*.30+defence*.28+fitness*.08)+home+(form-50)*.07+(confidence-50)*.06+(morale-50)*.05+(manager-50)*.05+(tactical.chanceVolume-tactical.defensiveSecurity)*.018+trajectoryBonus+tacticalExecution;
    const benchSize=window.FLTimeline?FLTimeline.currentRules(game).benchSize:7;
    const bench=eligible.filter(p=>!starters.some(s=>s.id===p.id)).sort((a,b)=>(b.ability||50)-(a.ability||50)).slice(0,benchSize);
    const defaultShape=[
      {slot:0,role:'GK',depth:10,width:50},{slot:1,role:'FB',depth:23,width:34},{slot:2,role:'FB',depth:23,width:66},
      {slot:3,role:'HB',depth:36,width:22},{slot:4,role:'HB',depth:36,width:50},{slot:5,role:'HB',depth:36,width:78},
      {slot:6,role:'IF',depth:48,width:36},{slot:7,role:'IF',depth:48,width:64},{slot:8,role:'CF',depth:49,width:50},
      {slot:9,role:'W',depth:47,width:12},{slot:10,role:'W',depth:47,width:88}
    ];
    const shape=managed&&Array.isArray(game.teamManagement.positions)?game.teamManagement.positions.map((pos,i)=>({
      slot:i,role:pos.role||starters[i]?.position||'HB',depth:clamp(5+Number(pos.y||50)*.54,8,49.2),width:clamp(Number(pos.x||50),7,93)
    })):defaultShape;
    const setPieces=managed&&game.teamManagement.setPieces?JSON.parse(JSON.stringify(game.teamManagement.setPieces)):null;
    return {starters,bench,attack,midfield,defence,fitness,form,confidence,morale,manager,trajectoryBonus,effective,tactics:{...tactics},tactical,eraTactics,shape,setPieces};
  }
  function weightedPlayer(players,r,attacking=true){
    const weights=players.map(p=>{let w=1+(p.ability||50)/30;if(attacking){if(p.position==='CF')w*=3.4;else if(['IF','W'].includes(p.position))w*=2.2;else if(p.position==='HB')w*=1.2;else if(p.position==='GK')w*=.08;const recordProfile=p.careerRecordProfile||'standard';if(recordProfile==='goal-machine')w*=1.9;else if(recordProfile==='all-time'&&['CF','IF','W'].includes(p.position))w*=2.15;}return w;});
    let roll=r()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<players.length;i++){roll-=weights[i];if(roll<=0)return players[i];}return players[0];
  }
  function compactMatchRecords(game){
    const records=Array.isArray(game.matchRecords)?game.matchRecords:[];
    const detailedKeep=10,totalKeep=80;
    if(records.length>detailedKeep){
      records.slice(0,-detailedKeep).forEach(old=>{
        if(old.compact)return;
        old.compact=true;
        old.frames=[];old.statsTimeline=[];old.pitchWear=[];old.momentum=(old.momentum||[]).filter((_,i)=>i%10===0).slice(-12);
        if(old.teamProfiles){
          const trim=profile=>profile?{effective:profile.effective,attack:profile.attack,midfield:profile.midfield,defence:profile.defence,tactics:profile.tactics,starters:(profile.starters||[]).map(p=>({id:p.id,name:p.name,position:p.position,ability:p.ability})),bench:[]}:null;
          old.teamProfiles={home:trim(old.teamProfiles.home),away:trim(old.teamProfiles.away)};
        }
        old.events=(old.events||[]).filter(e=>['goal','incident','foul','manager-call'].includes(e.type)||e.card).slice(-60);
      });
    }
    if(records.length>totalKeep)game.matchRecords=records.slice(-totalKeep);
  }
  function repairWorldBalance(game,options={}){return window.FLFootballBalance?FLFootballBalance.repairWorld(game,options):{changedPlayers:0,changedClubs:0};}
  function applyResult(game,f,record){
    if(f.played)return;
    const home=club(game,f.home),away=club(game,f.away);f.homeGoals=record.homeGoals;f.awayGoals=record.awayGoals;f.played=true;f.matchRecordId=record.id;
    const leagueMatch=f.competitionId!=='english-cup'&&Number(f.tier)!==0;
    if(leagueMatch){
      home.played++;away.played++;home.gf+=f.homeGoals;home.ga+=f.awayGoals;away.gf+=f.awayGoals;away.ga+=f.homeGoals;
      const pointsForWin=window.FLTimeline?FLTimeline.currentRules(game).pointsForWin:2;
      if(f.homeGoals>f.awayGoals){home.won++;away.lost++;home.points+=pointsForWin;home.confidence=clamp((home.confidence||50)+3,0,100);away.confidence=clamp((away.confidence||50)-2,0,100);}
      else if(f.homeGoals<f.awayGoals){away.won++;home.lost++;away.points+=pointsForWin;away.confidence=clamp((away.confidence||50)+3,0,100);home.confidence=clamp((home.confidence||50)-2,0,100);}
      else {home.drawn++;away.drawn++;home.points++;away.points++;}
    }
    const result=`${home.name} ${f.homeGoals}–${f.awayGoals} ${away.name}`;
    game.history.push({date:f.date,type:'result',text:result,matchRecordId:record.id});
    game.matchRecords=game.matchRecords||[];game.matchRecords.push(record);compactMatchRecords(game);
    if(f.home===game.controlledClubId||f.away===game.controlledClubId){
      const ours=f.home===game.controlledClubId?f.homeGoals:f.awayGoals,theirs=f.home===game.controlledClubId?f.awayGoals:f.homeGoals;
      game.boardConfidence=clamp(game.boardConfidence+(ours>theirs?3:ours===theirs?0:-2),0,100);
      game.inbox.unshift({id:`result-${f.id}`,date:f.date,from:'Club Secretary',subject:'Match report',body:`${result}. xG ${record.stats.home.xg.toFixed(2)}–${record.stats.away.xg.toFixed(2)}. Attendance ${record.attendance.toLocaleString('en-GB')}.`,read:false});
      if(window.FLLivingWorld)FLLivingWorld.afterControlledMatch(game,f,record);
      if(window.FLLegacySystems&&game.teamManagement){FLLegacySystems.recordTacticalUse(game,game.teamManagement.tactics||{},game.teamManagement.positions||[],ours>theirs?'win':ours===theirs?'draw':'loss');}
    }
    if(f.competitionId==='english-cup'&&!game.meta?.deferCupProgress&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(Number(f.tier)===0&&!game.meta?.deferCupProgress&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
  }

  function ensureMatchCareerFields(player,team){
    const numeric=['appearances','starts','subApps','minutes','goals','assists','yellowCards','redCards','cleanSheets','conceded','playerOfMatch'];
    numeric.forEach(key=>player[key]=Number(player[key]||0));
    player.matchHistory=Array.isArray(player.matchHistory)?player.matchHistory:[];
    player.seasonHistory=Array.isArray(player.seasonHistory)?player.seasonHistory:[];
    player.careerTotals=player.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};
    ['appearances','goals','assists','cleanSheets'].forEach(key=>player.careerTotals[key]=Number(player.careerTotals[key]||0));
    player.clubHistory=Array.isArray(player.clubHistory)&&player.clubHistory.length?player.clubHistory:[{club:team.name,from:1888,to:'Present',apps:0,goals:0}];
    let spell=[...player.clubHistory].reverse().find(row=>row.club===team.name&&row.to==='Present');
    if(!spell){spell={club:team.name,from:Number(String(team?.founded||1888).slice(0,4))||1888,to:'Present',apps:0,goals:0};player.clubHistory.push(spell);}
    spell.apps=Number(spell.apps||0);spell.goals=Number(spell.goals||0);
    return spell;
  }
  function rollbackLegacyScorerOnlyStats(record,home,away){
    if(record.engineVersion!=='2.0'||record.legacyScorerStatsRolledBack)return;
    const grouped={};
    (record.events||[]).filter(event=>event.type==='goal'&&event.playerId).forEach(event=>{
      const key=`${event.side}:${event.playerId}`;grouped[key]=(grouped[key]||0)+1;
    });
    Object.entries(grouped).forEach(([key,count])=>{
      const [side,playerId]=key.split(':'),team=side==='home'?home:away,opponent=side==='home'?away:home,player=team.players.find(p=>p.id===playerId);
      if(!player)return;
      player.goals=Math.max(0,Number(player.goals||0)-count);
      player.appearances=Math.max(0,Number(player.appearances||0)-count);
      player.starts=Math.max(0,Number(player.starts||0)-count);
      player.minutes=Math.max(0,Number(player.minutes||0)-(90*count));
      let remove=count;
      player.matchHistory=(player.matchHistory||[]).filter(entry=>{
        if(remove>0&&entry.date===record.date&&entry.opponent===opponent.name){remove--;return false;}
        return true;
      });
    });
    record.legacyScorerStatsRolledBack=true;
  }
  function finalizeMatchStats(game,record){
    if(!record)return [];
    if(record.playerStatsApplied)return record.playerPerformances||[];
    const home=club(game,record.homeId),away=club(game,record.awayId);
    if(!home||!away)return [];
    rollbackLegacyScorerOnlyStats(record,home,away);
    const activity={};
    const activityFor=id=>{
      if(!id)return {touches:0,passes:0,completedPasses:0,receptions:0,shots:0,onTarget:0,dribbles:0,defensiveActions:0};
      activity[id]=activity[id]||{touches:0,passes:0,completedPasses:0,receptions:0,shots:0,onTarget:0,dribbles:0,defensiveActions:0};
      return activity[id];
    };
    (record.frames||[]).forEach(frame=>{
      if(frame.ownerId){
        const a=activityFor(frame.ownerId);a.touches++;
        if(['pass','kickoff','throw','goal-kick','cross'].includes(frame.phase)){
          a.passes++;
          if(!['intercepted','offside'].includes(frame.outcome))a.completedPasses++;
        }
        if(['shot','header'].includes(frame.phase)){
          a.shots++;
          if(['goal','save','woodwork'].includes(frame.outcome))a.onTarget++;
        }
        if(frame.phase==='carry')a.dribbles++;
      }
      if(frame.receiverId&&!['intercepted','offside'].includes(frame.outcome))activityFor(frame.receiverId).receptions++;
    });
    (record.events||[]).filter(event=>event.type==='turnover'&&event.playerId).forEach(event=>activityFor(event.playerId).defensiveActions++);
    const goalsBy={},assistsBy={},yellowsBy={},redsBy={};
    (record.events||[]).filter(event=>event.type==='goal').forEach(event=>{
      if(event.playerId)goalsBy[event.playerId]=(goalsBy[event.playerId]||0)+1;
      if(event.assistId)assistsBy[event.assistId]=(assistsBy[event.assistId]||0)+1;
    });
    (record.events||[]).filter(event=>event.type==='yellow-card'&&event.playerId).forEach(event=>yellowsBy[event.playerId]=(yellowsBy[event.playerId]||0)+1);
    (record.events||[]).filter(event=>event.type==='red-card'&&event.playerId).forEach(event=>redsBy[event.playerId]=(redsBy[event.playerId]||0)+1);
    const ratingRandom=rng(hashSeed(`${record.id}-player-ratings-v051`)),performances=[];
    const sides=[
      {side:'home',team:home,opponent:away,profile:record.teamProfiles?.home,goalsFor:record.homeGoals,goalsAgainst:record.awayGoals},
      {side:'away',team:away,opponent:home,profile:record.teamProfiles?.away,goalsFor:record.awayGoals,goalsAgainst:record.homeGoals}
    ];
    sides.forEach(info=>{
      const starters=(info.profile?.starters||[]).map(player=>player.id),participants=new Map();
      starters.forEach(id=>participants.set(id,{starter:true,substitute:false,minutes:90}));
      const changes=(record.substitutions||[]).filter(change=>change.side===info.side).sort((a,b)=>Number(a.minute||0)-Number(b.minute||0));
      changes.forEach(change=>{
        const minute=clamp(Number(change.minute||0),1,89),off=participants.get(change.offId);
        if(off)off.minutes=Math.min(off.minutes,minute);
        participants.set(change.onId,{starter:false,substitute:true,minutes:Math.max(1,90-minute)});
      });
      participants.forEach((part,playerId)=>{
        const player=info.team.players.find(p=>p.id===playerId);if(!player)return;
        const spell=ensureMatchCareerFields(player,info.team),previousApps=player.appearances;
        const goals=goalsBy[playerId]||0,assists=assistsBy[playerId]||0,yellowCards=yellowsBy[playerId]||0,redCards=redsBy[playerId]||0,a=activityFor(playerId);
        const resultBonus=info.goalsFor>info.goalsAgainst?.28:info.goalsFor===info.goalsAgainst?.08:-.18;
        const cleanSheet=player.position==='GK'&&info.goalsAgainst===0?1:0;
        const defenderCleanBonus=info.goalsAgainst===0&&['FB','HB'].includes(player.position)?.18:0;
        const involvement=Math.min(.38,(a.touches*.008)+(a.completedPasses*.006)+(a.receptions*.004)+(a.defensiveActions*.08));
        const attackBonus=goals*1.08+assists*.62+a.onTarget*.07+a.dribbles*.018;
        const keeperBonus=player.position==='GK'?(cleanSheet*.55-Math.max(0,info.goalsAgainst-2)*.12):0;
        const minutesWeight=clamp(part.minutes/90,.25,1);
        const rating=+clamp(6.15+resultBonus+defenderCleanBonus+involvement+attackBonus+keeperBonus+(ratingRandom()-.5)*.42-(1-minutesWeight)*.12,5.2,10).toFixed(2);
        player.appearances++;
        if(part.starter)player.starts++;else player.subApps++;
        player.minutes+=Math.round(part.minutes);
        player.goals+=goals;player.assists+=assists;player.yellowCards+=yellowCards;player.redCards+=redCards;player.cleanSheets+=cleanSheet;
        if(player.position==='GK')player.conceded+=info.goalsAgainst;
        const oldAverage=Number(player.averageRating);
        player.averageRating=Number.isFinite(oldAverage)?(((oldAverage*previousApps)+rating)/(previousApps+1)).toFixed(2):rating.toFixed(2);
        player.form=rating>=8?'Excellent':rating>=7?'Good':rating>=6.2?'Fair':'Poor';
        player.condition=clamp(Number(player.condition||100)-Math.max(1,Math.round((part.minutes/90)*(4+ratingRandom()*5))),52,100);
        player.careerTotals.appearances++;player.careerTotals.goals+=goals;player.careerTotals.assists+=assists;player.careerTotals.cleanSheets+=cleanSheet;
        spell.apps++;spell.goals+=goals;
        const history={date:record.date,competition:record.competition||'Football League',opponent:info.opponent.name,venue:info.side==='home'?'Home':'Away',result:`${record.homeGoals}–${record.awayGoals}`,minutes:Math.round(part.minutes),starter:part.starter,rating:rating.toFixed(2),goals,assists,yellowCards,redCards,cleanSheet:Boolean(cleanSheet)};
        player.matchHistory.unshift(history);
        if(player.matchHistory.length>60)player.matchHistory.length=60;
        performances.push({side:info.side,clubId:info.team.id,playerId,playerName:player.name,position:player.position,starter:part.starter,minutes:Math.round(part.minutes),rating,goals,assists,yellowCards,redCards,cleanSheet:Boolean(cleanSheet),touches:a.touches,passes:a.passes,completedPasses:a.completedPasses,shots:a.shots,onTarget:a.onTarget,defensiveActions:a.defensiveActions});
      });
    });
    const playerOfMatch=[...performances].sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists)[0];
    if(playerOfMatch){
      const team=playerOfMatch.side==='home'?home:away,player=team.players.find(p=>p.id===playerOfMatch.playerId);
      if(player)player.playerOfMatch=Number(player.playerOfMatch||0)+1;
      playerOfMatch.playerOfMatch=true;record.playerOfMatch={...playerOfMatch};
    }
    record.playerPerformances=performances;
    record.playerStatsApplied=true;
    record.playerStatsAppliedAt=new Date().toISOString();
    if(window.FLDressingRoom&&(record.homeId===game.controlledClubId||record.awayId===game.controlledClubId))FLDressingRoom.afterMatch(game,record);
    return performances;
  }

  function matchDNA(hp,ap,weather,r){
    const gap=Math.abs(hp.effective-ap.effective),press=(hp.tactical.pressing+ap.tactical.pressing)/2,risk=(hp.tactical.chanceVolume+ap.tactical.chanceVolume)/2;
    if(gap>10)return hp.effective>ap.effective?'Home control':'Away control';
    if(['Heavy rain','Fog','Snow flurries'].includes(weather))return 'Scrappy conditions';
    if(press>62)return 'Physical battle';
    if(risk>62)return 'End-to-end';
    if(risk<43)return 'Tactical contest';
    return pick(['Midfield battle','Open game','Tense contest'],r);
  }
  function aiAdjustment(profile,ownGoals,oppGoals,minute,redCards=0){
    const t={...profile.tactical};
    const losing=ownGoals<oppGoals,winning=ownGoals>oppGoals;
    if(redCards){t.chanceVolume-=10;t.defensiveSecurity+=12;t.possession-=5;}
    if(minute>=65&&losing){t.chanceVolume+=12;t.chanceQuality+=7;t.transition+=9;t.defensiveSecurity-=8;t.fatigue+=7;}
    if(minute>=75&&winning){t.chanceVolume-=8;t.defensiveSecurity+=10;t.possession+=3;t.fatigue-=2;}
    return t;
  }
  const MATCH_TICKS_PER_MINUTE=6;
  const MATCH_TOTAL_TICKS=90*MATCH_TICKS_PER_MINUTE;
  function eventClock(event){
    const value=Number(event?.clock);
    return Number.isFinite(value)?value:Number(event?.minute||0);
  }
  function clockFromTick(tick){return tick/MATCH_TICKS_PER_MINUTE;}
  function displayMinute(clock){return Math.min(90,Math.max(1,Math.floor(clock)+1));}
  function attackDirection(side,clock){
    const firstHalf=clock<45;
    return side==='home'?(firstHalf?1:-1):(firstHalf?-1:1);
  }
  function pointFor(side,clock,zone,lane,jitterX=0,jitterY=0){
    const direction=attackDirection(side,clock);
    const attackingX=clamp(10+zone*19.25+jitterX,4,96);
    const lanes=[18,50,82];
    return {x:direction===1?attackingX:100-attackingX,y:clamp((lanes[lane]??50)+jitterY,6,94)};
  }
  function zoneFromPoint(side,clock,point){
    const direction=attackDirection(side,clock),attackingX=direction===1?point.x:100-point.x;
    return clamp((attackingX-10)/19.25,0,4.25);
  }
  function laneFromPoint(point){return point.y<35?0:point.y>65?2:1;}
  function otherSide(side){return side==='home'?'away':'home';}
  function sideName(side,home,away){return side==='home'?home.name:away.name;}
  function profileFor(side,hp,ap){return side==='home'?hp:ap;}
  function teamFor(side,home,away){return side==='home'?home:away;}
  function playerAt(profile,index){return profile.starters[clamp(index,0,profile.starters.length-1)]||profile.starters[0];}
  function rolePool(zone,lane){
    if(zone<.75)return lane===0?[1,3,4]:lane===2?[2,5,4]:[4,1,2,3,5];
    if(zone<1.7)return lane===0?[3,1,9,6,4]:lane===2?[5,2,10,7,4]:[4,3,5,6,7];
    if(zone<2.7)return lane===0?[9,6,3,4]:lane===2?[10,7,5,4]:[6,7,8,4,3,5];
    if(zone<3.55)return lane===0?[9,6,8,3]:lane===2?[10,7,8,5]:[8,6,7,9,10];
    return lane===0?[9,6,8,7]:lane===2?[10,7,8,6]:[8,6,7,9,10];
  }
  function chooseCarrierIndex(zone,lane,r,exclude=-1){
    const pool=rolePool(zone,lane).filter(i=>i!==exclude);
    return pool[Math.floor(r()*pool.length)]??4;
  }
  function chooseSetPieceTaker(profile,type,r){
    const key=type==='corner'?'corners':type==='throw-in'?'throwIns':type==='penalty'?'penalties':'freeKicks';
    const nominated=profile.setPieces?.takers?.[key]||[];
    const found=nominated.map(id=>profile.starters.findIndex(p=>p.id===id)).find(i=>i>=0);
    if(Number.isInteger(found))return found;
    if(type==='corner')return r()<.5?9:10;
    if(type==='throw-in')return r()<.5?1:2;
    if(type==='penalty')return 8;
    return r()<.5?6:7;
  }
  function activeRoutine(profile,type,occurrence){
    if(!profile.setPieces)return null;
    const key=type==='corner'?'corners':type==='throw-in'?'throwIns':type==='penalty'?'penalties':'freeKicks';
    const routines=(profile.setPieces.routines?.[key]||[]).filter(x=>x&&x.enabled!==false);
    if(!routines.length)return null;
    return routines[profile.setPieces.rotate===false?0:occurrence%routines.length];
  }
  function routineTarget(profile,type,side,clock,cornerLane,occurrence){
    const routine=activeRoutine(profile,type,occurrence),direction=attackDirection(side,clock);
    if(!routine)return {routine:null,target:type==='corner'?pointFor(side,clock,3.82,1,0,(cornerLane===0?-8:8)):pointFor(side,clock,3.45,1)};
    const targetName=routine.target||'Penalty Spot';
    let depth=3.55,y=50;
    if(targetName==='Near Post'){depth=3.9;y=cornerLane===0?39:61;}
    else if(targetName==='Six Yard Box'){depth=4.02;y=50;}
    else if(targetName==='Far Post'){depth=3.82;y=cornerLane===0?63:37;}
    else if(targetName==='Edge Of Box'){depth=3.1;y=50;}
    else if(targetName==='Short'){depth=3.35;y=cornerLane===0?16:84;}
    else if(targetName==='Custom'){
      const customDepth=clamp(Number(routine.targetY??27),4,96);
      const attackingX=96-customDepth*.38;
      return {routine,target:{x:direction===1?attackingX:100-attackingX,y:clamp(Number(routine.targetX??50),6,94)}};
    }
    const point=pointFor(side,clock,depth,1);point.y=y;
    return {routine,target:point};
  }
  function routinePositions(profile,routine,side,clock){
    if(!routine?.positions)return null;
    const direction=attackDirection(side,clock);
    return routine.positions.map(pos=>{
      const depth=clamp(Number(pos.y??60),4,96),attackingX=96-depth*.38;
      return {playerId:pos.playerId,x:direction===1?attackingX:100-attackingX,y:clamp(Number(pos.x??50),6,94),run:routine.runs?.[pos.playerId]||null};
    });
  }
  function commentaryForPass(type,passer,receiver,sideLabel,lane,advanced){
    if(type==='switch')return `${passer.name} opens the pitch with a sweeping switch to ${receiver.name}.`;
    if(type==='through')return `${passer.name} threads a through ball into ${receiver.name}'s run.`;
    if(type==='driven')return `${passer.name} punches a firm pass forward to ${receiver.name}.`;
    if(type==='clipped')return `${passer.name} clips the ball over the first line for ${receiver.name}.`;
    if(type==='one-two')return `${passer.name} combines sharply with ${receiver.name} in a quick one-two.`;
    if(type==='back')return `${passer.name} turns back and keeps possession with ${receiver.name}.`;
    if(advanced)return `${passer.name} finds ${receiver.name} between the lines.`;
    return `${sideLabel} move the ball ${lane===0?'down the left':lane===2?'down the right':'through midfield'}.`;
  }
  function rememberMatch(game,record){
    game.footballMemories=game.footballMemories||[];
    const total=record.homeGoals+record.awayGoals,margin=Math.abs(record.homeGoals-record.awayGoals),inc=record.notableIncidents||[];
    let title=null,kind=null;
    if(inc.some(x=>/dog/i.test(x.text))){title=`The Dog Match`;kind='oddity';}
    else if(record.pitch==='Muddy'&&total>=5){title=`The Mud Battle at ${record.homeName}`;kind='classic';}
    else if(total>=7){title=`The ${record.homeGoals}–${record.awayGoals} Classic`;kind='classic';}
    else if(margin>=5){title=`The ${record.homeName} Rout`;kind='record';}
    else if(record.storyline==='Giant killing' && record.homeGoals!==record.awayGoals){title=`The Great Upset`;kind='upset';}
    if(title&&!game.footballMemories.some(m=>m.matchRecordId===record.id))game.footballMemories.unshift({id:`memory-${record.id}`,date:record.date,title,kind,matchRecordId:record.id,summary:`${record.homeName} ${record.homeGoals}–${record.awayGoals} ${record.awayName}`});
  }
  function simulateDetailedMatch(game,f){
    if(f.played&&f.matchRecordId)return (game.matchRecords||[]).find(m=>m.id===f.matchRecordId);
    const seed=game.meta.seed+f.round*1907+Number(f.id.replace(/\D/g,''))*31,r=rng(seed);
    const home=club(game,f.home),away=club(game,f.away),hp=teamProfile(game,home,true),ap=teamProfile(game,away,false);
    const conditions=window.FLMatchEnvironment?FLMatchEnvironment.create(game,home,r):{era:{id:'victorian',label:'Victorian Football'},weather:pick(['Clear','Overcast','Light rain','Heavy rain','Fog','Cold and dry'],r),startSurface:'Good',windSpeed:5,windLabel:'Light',temperature:10,visibility:'Good',precipitation:'None',drainage:.3,wearRate:.7,friction:1,controlPenalty:0,passPenalty:0,bounce:'True',ballBehaviour:'The ball runs cleanly'};
    const weather=conditions.weather,pitch=conditions.startSurface;
    let storyline=matchDNA(hp,ap,weather,r);
    if(Math.abs(hp.effective-ap.effective)>9&&((hp.effective>ap.effective&&r()<.15)||(ap.effective>hp.effective&&r()<.15)))storyline='Giant killing';
    const stats={home:{shots:0,onTarget:0,xg:0,corners:0,fouls:0,offsides:0,possession:50},away:{shots:0,onTarget:0,xg:0,corners:0,fouls:0,offsides:0,possession:50}};
    const events=[],frames=[],momentum=[],statsTimeline=[];
    const possessionTicks={home:0,away:0},setPieceCount={home:0,away:0},moveChains={home:[],away:[]};
    let hg=0,ag=0,crowdMood='Anticipation',pressureWindow=0;
    const eraRules=window.FLTimeline?{...FLTimeline.currentRules(game)}:{penalties:true,cards:true,offsideDefendersRequired:2,backPassAllowed:false,goalLineTechnology:false,var:false};
    const matchYear=Number(String(f.date||game.date||'1888').slice(0,4))||1888;
    const eraOfficiating=matchYear<1930
      ?{id:'early',challengeTolerance:1.55,cardRate:.10,pullTolerance:1.48,simulationDetection:.42,confrontationRate:1.50,fightRate:1.45,cardsAvailable:false}
      :matchYear<1970
      ?{id:'traditional',challengeTolerance:1.38,cardRate:.28,pullTolerance:1.34,simulationDetection:.50,confrontationRate:1.36,fightRate:1.28,cardsAvailable:false}
      :matchYear<1995
      ?{id:'hard-modern',challengeTolerance:1.20,cardRate:.66,pullTolerance:1.16,simulationDetection:.60,confrontationRate:1.22,fightRate:1.10,cardsAvailable:true}
      :matchYear<2010
      ?{id:'protective',challengeTolerance:1.08,cardRate:.86,pullTolerance:1.02,simulationDetection:.69,confrontationRate:1.08,fightRate:.94,cardsAvailable:true}
      :{id:'modern',challengeTolerance:1.00,cardRate:1.00,pullTolerance:.92,simulationDetection:.78,confrontationRate:.92,fightRate:.78,cardsAvailable:true};
    const varActive=matchYear>=2020;
    eraRules.var=varActive;
    const refereeProfile={control:.50+r()*.42,perception:.52+r()*.42,strictness:.45+r()*.48,dissentTolerance:.38+r()*.48,varThreshold:.58+r()*.28};
    const dismissals={home:0,away:0},dismissedPlayers=new Set(),cautions=new Map();
    let matchTemperature=clamp(18+(storyline==='Physical battle'?15:storyline==='Scrappy conditions'?7:storyline==='Tense contest'?3:0)+(f.competitionId==='english-cup'?2:0),10,58),matchTemperaturePeak=matchTemperature;
    const temperatureHistory=[{minute:0,value:+matchTemperature.toFixed(1),reason:'kickoff'}];
    game.footballFeuds=game.footballFeuds&&typeof game.footballFeuds==='object'?game.footballFeuds:{};
    game.footballReputations=game.footballReputations&&typeof game.footballReputations==='object'?game.footballReputations:{};
    const identityScore=value=>String(value||'').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const reputation=player=>{if(!player)return {diver:0,hardMan:0,dissent:0,fanHostility:0,targeted:0};const key=String(player.id||player.name||'unknown');return game.footballReputations[key]||(game.footballReputations[key]={playerId:player.id||null,playerName:player.name||'Unknown',diver:0,hardMan:0,dissent:0,fanHostility:0,targeted:0,lastUpdated:f.date});};
    const addReputation=(player,kind,amount)=>{if(!player)return;const row=reputation(player);row[kind]=clamp(Number(row[kind]||0)+Number(amount||0),0,100);row.lastUpdated=f.date;};
    const temperament=player=>clamp(42+(identityScore(player?.id||player?.name)%52),35,96);
    const simulationSkill=player=>clamp(38+((identityScore(player?.name||player?.id)*7)%57),30,94);
    const feudKey=(a,b)=>[String(a?.id||a?.name||''),String(b?.id||b?.name||'')].sort().join('::');
    const feudLevel=(a,b)=>Number(game.footballFeuds[feudKey(a,b)]?.level||0);
    const rememberFeud=(a,b,amount,cause,tick)=>{if(!a||!b||a===b)return;const key=feudKey(a,b),old=game.footballFeuds[key]||{playerA:a.id,playerB:b.id,playerAName:a.name,playerBName:b.name,level:0,meetings:0,lastIncident:null};old.level=clamp(Number(old.level||0)+Number(amount||0),0,100);old.meetings=Number(old.meetings||0)+1;old.lastIncident={date:f.date,minute:displayMinute(clockFromTick(tick)),cause};game.footballFeuds[key]=old;};
    const raiseTemperature=(amount,reason,tick,a=null,b=null)=>{matchTemperature=clamp(matchTemperature+Number(amount||0),0,100);matchTemperaturePeak=Math.max(matchTemperaturePeak,matchTemperature);if(a&&b&&amount>=3)rememberFeud(a,b,Math.max(.5,amount*.12),reason,tick);if(amount>=5||matchTemperature>=65)temperatureHistory.push({minute:displayMinute(clockFromTick(tick)),value:+matchTemperature.toFixed(1),reason});};
    let state={side:'home',zone:2,lane:1,carrier:8,ball:pointFor('home',0,2,1),pending:null,kickoff:true,lastPasser:null,lastPassTick:-99};
    const hooliganism=game.worldState?.social?.hooliganismRisk;
    const incidentChance=hooliganism==='crisis'?.16:hooliganism==='rising'?.075:game.date<'1930-01-01'?.055:.012;
    const addEvent=(tick,type,side,text,extra={})=>{
      const clock=clockFromTick(tick),event={clock,minute:displayMinute(clock),type,side,text,homeGoals:hg,awayGoals:ag,...extra};
      events.push(event);return event;
    };
    const addFrame=(tick,data={})=>{
      const clock=clockFromTick(tick),frame={tick,clock,minute:displayMinute(clock),...data};frames.push(frame);
      if(frame.side)possessionTicks[frame.side]++;
      const zone=Number(frame.zone??state.zone),value=(frame.side==='home'?1:-1)*(zone-1.7)*13+(hp.effective-ap.effective)*.65;
      pressureWindow=pressureWindow*.72+value*.28;
      return frame;
    };
    const selectFouler=side=>{const p=profileFor(side,hp,ap),pool=p.starters.filter(player=>!dismissedPlayers.has(player.id)&&['FB','HB'].includes(player.position));return pick(pool.length?pool:p.starters.filter(player=>!dismissedPlayers.has(player.id)),r)||p.starters[0];};
    const showWarning=(tick,side,player,reason)=>addEvent(tick,'warning',side,`${player.name} receives a firm warning for ${reason}.`,{playerId:player.id,player:player.name,reason});
    const applyCard=(tick,side,player,info={})=>{
      if(!player||dismissedPlayers.has(player.id))return null;
      const violent=Boolean(info.violent),severity=clamp(Number(info.severity||0),0,1),reason=String(info.reason||'foul');
      if(!eraOfficiating.cardsAvailable||!eraRules.cards){
        const warningWorthy=violent||Boolean(info.forceYellow)||severity>.58||(Number.isFinite(info.yellowChance)&&r()<Number(info.yellowChance)*.38);
        if(!warningWorthy)return null;
        if(violent&&r()<clamp(.18+(1-refereeProfile.control)*.24,.12,.42)){dismissedPlayers.add(player.id);dismissals[side]++;addEvent(tick,'dismissal',side,`${player.name} is ordered from the field after ${reason}.`,{playerId:player.id,player:player.name,reason,dismissal:true});return 'dismissal';}
        showWarning(tick,side,player,reason);return 'warning';
      }
      const directRed=violent||Boolean(info.forceRed)||severity>.90&&r()<clamp(.28+refereeProfile.strictness*.30,.35,.68);
      if(directRed){dismissedPlayers.add(player.id);dismissals[side]++;stats[side].redCards=(stats[side].redCards||0)+1;addEvent(tick,'red-card',side,`${player.name} is shown a red card for ${reason}.`,{playerId:player.id,player:player.name,card:'red',reason});if(r()<.075)addEvent(tick,'referee-gesture',null,'The referee delivers the dismissal with an unusually forceful card gesture.',{gesture:'forceful-card',card:'red',rare:true});return 'red';}
      const yellowChance=Number.isFinite(info.yellowChance)?Number(info.yellowChance):clamp((severity-.22)*.72*eraOfficiating.cardRate*refereeProfile.strictness,0,.72);
      if(Boolean(info.forceYellow)||r()<yellowChance){const previous=Number(cautions.get(player.id)||0);stats[side].yellowCards=(stats[side].yellowCards||0)+1;addEvent(tick,'yellow-card',side,`${player.name} is shown a yellow card for ${reason}.`,{playerId:player.id,player:player.name,card:'yellow',reason});if(r()<.075)addEvent(tick,'referee-gesture',null,'The referee punches the card emphatically into the air.',{gesture:'forceful-card',card:'yellow',rare:true});cautions.set(player.id,previous+1);if(previous>=1){dismissedPlayers.add(player.id);dismissals[side]++;stats[side].redCards=(stats[side].redCards||0)+1;addEvent(tick,'red-card',side,`${player.name} is sent off after a second yellow card.`,{playerId:player.id,player:player.name,card:'red',reason:'second yellow'});return 'red';}return 'yellow';}
      return null;
    };
    const maybeDissent=(tick,side,player,decision,base=.12)=>{if(!player||dismissedPlayers.has(player.id))return false;const chance=clamp(base+(temperament(player)-70)*.003+(matchTemperature-45)*.002-refereeProfile.dissentTolerance*.08,.015,.38);if(r()>=chance)return false;raiseTemperature(5,'dissent',tick,player,null);addEvent(tick,'dissent',side,`${player.name} continues arguing with the referee after the ${decision}.`,{playerId:player.id,player:player.name,decision});applyCard(tick,side,player,{forceYellow:true,reason:'dissent'});return true;};
    const maybeConfrontation=(tick,offender,victim,severity,cause)=>{
      if(!offender||!victim||dismissedPlayers.has(offender.id)||dismissedPlayers.has(victim.id))return false;
      const aggression=(temperament(offender)+temperament(victim))/2,feud=feudLevel(offender,victim),hardRep=(reputation(offender).hardMan+reputation(victim).hardMan)/2,chance=clamp((matchTemperature-34)*.0024+(aggression-70)*.0019+feud*.0014+hardRep*.0005+severity*.075,.003,.34)*eraOfficiating.confrontationRate*(1.15-refereeProfile.control*.22);
      if(r()>=chance)return false;
      rememberFeud(offender,victim,4,cause,tick);raiseTemperature(9,'confrontation',tick,offender,victim);addReputation(offender,'hardMan',.7);addReputation(victim,'targeted',.5);
      const escalation=clamp((matchTemperature-35)/65+severity*.28+feud*.003+(aggression-70)*.004+(hardRep/100)*.16,0,1),roll=r();
      if(roll<clamp(.68-escalation*.30,.28,.70)){
        addEvent(tick,'incident',null,`${offender.name} gives ${victim.name} a small shove before teammates break it up.`,{incident:'small-push',tier:1,playerId:offender.id,player:offender.name,opponentId:victim.id,opponent:victim.name,cause});
        if(eraOfficiating.cardsAvailable&&r()<.16)applyCard(tick,otherSide(state.side),offender,{forceYellow:true,reason:'confrontation'});
      }else if(roll<clamp(.95-escalation*.13,.68,.96)){
        addEvent(tick,'incident',null,`Players from both teams rush together after ${offender.name} and ${victim.name} square up.`,{incident:'mass-confrontation',tier:2,playerId:offender.id,player:offender.name,opponentId:victim.id,opponent:victim.name,cause});
        raiseTemperature(7,'mass confrontation',tick,offender,victim);
        if(eraOfficiating.cardsAvailable){if(r()<.48)applyCard(tick,otherSide(state.side),offender,{forceYellow:true,reason:'mass confrontation'});if(r()<.32)applyCard(tick,state.side,victim,{forceYellow:true,reason:'mass confrontation'});}
      }else{
        const aggressor=r()<.55?offender:victim,other=aggressor===offender?victim:offender,aggressorSide=aggressor===offender?otherSide(state.side):state.side;
        addEvent(tick,'incident',aggressorSide,`A full brawl erupts as ${aggressor.name} lashes out at ${other.name}.`,{incident:'full-brawl',tier:3,playerId:aggressor.id,player:aggressor.name,opponentId:other.id,opponent:other.name,cause});
        raiseTemperature(18,'full brawl',tick,aggressor,other);addReputation(aggressor,'hardMan',6);addReputation(aggressor,'fanHostility',5);addReputation(other,'targeted',2);applyCard(tick,aggressorSide,aggressor,{violent:true,forceRed:true,severity:1,reason:'violent conduct'});
        const fanChance=clamp((matchTemperature-72)*.008+(hooliganism==='crisis'?.18:hooliganism==='rising'?.07:0)+reputation(aggressor).fanHostility*.0015,0,.34);
        if(r()<fanChance)addEvent(tick,'incident',null,'Several supporters get onto the pitch before stewards and police force them back.',{incident:'fan-pitch-invasion',tier:3,cause:'full brawl'});
      }
      return true;
    };
    const penaltyVARReview=(tick,attackingSide,onFieldDecision,evidence,description)=>{
      if(!varActive)return onFieldDecision;
      const replayAngles=2+Math.floor(r()*5),obstruction=clamp(r()*.72+(replayAngles<=2?.18:0),0,.95),evidenceQuality=clamp((.42+replayAngles*.09)*(1-obstruction*.58),.18,.96),seenEvidence=clamp(.5+(Number(evidence)-.5)*evidenceQuality,.04,.96);
      addEvent(tick,'review',attackingSide,`VAR checking: ${description}. The referee listens through the earpiece while play is held.`,{review:'var',stage:'silent-check',category:'penalty',onFieldDecision,evidence:+seenEvidence.toFixed(2),replayAngles,obstruction:+obstruction.toFixed(2),evidenceQuality:+evidenceQuality.toFixed(2)});
      const clearError=onFieldDecision==='penalty'?seenEvidence<.24:onFieldDecision!=='penalty'&&seenEvidence>.80;
      const borderline=onFieldDecision==='penalty'?seenEvidence>=.24&&seenEvidence<.42:seenEvidence>.61&&seenEvidence<=.80;
      if(clearError&&r()>refereeProfile.varThreshold-.48){
        addEvent(tick,'review',attackingSide,'The referee makes the television signal and runs to the pitch-side monitor.',{review:'var',stage:'monitor',category:'penalty',replayAngles});
        const finalDecision=seenEvidence>.55?'penalty':'no-penalty';
        addEvent(tick,'review',attackingSide,finalDecision==='penalty'?'Decision overturned: after the monitor review, a penalty is awarded.':'Decision overturned: after the monitor review, the penalty is cancelled.',{review:'var',stage:'decision',category:'penalty',decision:finalDecision,overturned:true});return finalDecision;
      }
      if(borderline||evidenceQuality<.43){addEvent(tick,'review',attackingSide,'The replay evidence is inconclusive. The original decision stands.',{review:'var',stage:'decision',category:'penalty',decision:'stands',inconclusive:true});return onFieldDecision;}
      addEvent(tick,'review',attackingSide,'VAR check complete. The original decision stands.',{review:'var',stage:'decision',category:'penalty',decision:'stands'});
      return onFieldDecision;
    };
    const scoreSnapshot=()=>({homeGoals:hg,awayGoals:ag});
    const updatePossession=()=>{
      const total=possessionTicks.home+possessionTicks.away||1;
      stats.home.possession=Math.round(possessionTicks.home/total*100);stats.away.possession=100-stats.home.possession;
    };
    const snapshotStats=tick=>{
      updatePossession();
      statsTimeline.push({clock:clockFromTick(tick),home:{...stats.home},away:{...stats.away}});
    };
    const turnover=(tick,newSide,point,reason='interception')=>{
      const newClock=clockFromTick(tick),newZone=zoneFromPoint(newSide,newClock,point),newLane=laneFromPoint(point),newProfile=profileFor(newSide,hp,ap);
      moveChains.home=[];moveChains.away=[];
      state={side:newSide,zone:newZone,lane:newLane,carrier:chooseCarrierIndex(newZone,newLane,r),ball:{...point},pending:null,kickoff:false,lastPasser:null,lastPassTick:-99};
      const winner=playerAt(newProfile,state.carrier);
      if(reason==='interception'||reason==='tackle')addEvent(tick,'turnover',newSide,reason==='tackle'?`${winner.name} times the tackle and wins the ball.`:`${winner.name} reads the pass and intercepts.` ,{playerId:winner.id,player:winner.name});
    };
    const goalTarget=(side,clock,r)=>{
      const direction=attackDirection(side,clock),y=43+r()*14;
      return {x:direction===1?98.7:1.3,y};
    };
    const shotOutcome=(side,profile,opp,clock,zone,lane,source,shooter,routineBonus=0)=>{
      const base=source==='penalty'?.76:source==='corner'?.11:source==='free-kick'?.09:['header','open-header'].includes(source)?.13:.055;
      const zoneBoost=Math.max(0,zone-3)*.105,central=lane===1?.045:-.01;
      const ability=((shooter.ability||50)-50)*.0017,matchup=(profile.attack-opp.defence)*.0022;
      const windPenalty=(Number(conditions.windSpeed||0)>22&&['header','open-header','corner','free-kick'].includes(source))?.012:0;
      const xg=clamp(base+zoneBoost+central+ability+matchup+routineBonus-windPenalty,source==='penalty'?.62:.025,source==='penalty'?.86:.48);
      const historicalGoalRate=Number(game.worldState?.modifiers?.goalRate||1);
      const goalChance=clamp(xg*.78*historicalGoalRate,.018,.48),roll=r();
      let outcome='wide';
      if(roll<goalChance)outcome='goal';
      else if(roll<goalChance+.39)outcome='save';
      else if(roll<goalChance+.51)outcome='blocked';
      else if(roll<goalChance+.58)outcome='woodwork';
      return {xg,outcome};
    };
    const resolveShot=(tick,side,from,zone,lane,shooterIndex,source='open-play',assistIndex=null,routineBonus=0)=>{
      const clock=clockFromTick(tick),profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),shooter=playerAt(profile,shooterIndex);
      const result=shotOutcome(side,profile,opp,clock,zone,lane,source,shooter,routineBonus),direction=attackDirection(side,clock);
      stats[side].shots++;stats[side].xg+=result.xg;
      let to,phase=['header','open-header'].includes(source)?'header':'shot';
      if(result.outcome==='goal'){to=goalTarget(side,clock,r);stats[side].onTarget++;}
      else if(result.outcome==='save'){to={x:direction===1?95.6:4.4,y:45+r()*10};stats[side].onTarget++;}
      else if(result.outcome==='blocked'){to={x:from.x+direction*(5+r()*4),y:clamp(from.y+(r()-.5)*12,10,90)};}
      else if(result.outcome==='woodwork'){to={x:direction===1?97.4:2.6,y:r()<.5?39.5:60.5};stats[side].onTarget++;}
      else to={x:direction===1?98.2:1.8,y:r()<.5?31+r()*7:62+r()*7};
      addFrame(tick,{side,phase,from:{...from},to,zone,lane,ownerIndex:shooterIndex,ownerId:shooter.id,ballType:['header','open-header'].includes(source)?'header':source==='free-kick'?'free-kick-shot':source==='penalty'?'penalty':'shot',outcome:result.outcome,source,...scoreSnapshot()});
      if(result.outcome==='goal'){
        if(side==='home')hg++;else ag++;
        const assist=assistIndex==null?null:playerAt(profile,assistIndex);
        const descriptor=['header','open-header'].includes(source)?'powers the header into the net':source==='free-kick'?'bends the free kick into the net':source==='penalty'?'scores from the spot':source==='corner'?'turns the corner home':'finishes the move';
        const move=moveChains[side].slice(-5);
        const ev=addEvent(tick,'goal',side,`${shooter.name} ${descriptor} — GOAL for ${team.name}!`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source,assistId:assist?.id||null,assist:assist?.name||null,move,moveText:move.length?move.map(x=>x.passer).concat(shooter.name).filter((x,i,a)=>i===0||x!==a[i-1]).join(' → '):null});
        ev.homeGoals=hg;ev.awayGoals=ag;
        if(eraRules.goalLineTechnology&&r()<.055)addEvent(tick,'technology',side,'Goal-line technology confirms that the ball crossed the line.',{review:'goal-line',decision:'goal'});
        if(varActive&&r()<.075)addEvent(tick,'review',side,'The goal is checked by video review and the decision stands.',{review:'var',decision:'goal stands'});
        crowdMood=side==='home'?'Roaring':'Stunned';
        moveChains.home=[];moveChains.away=[];
        state={side:otherSide(side),zone:2,lane:1,carrier:8,ball:pointFor(otherSide(side),clock+.25,2,1),pending:{type:'kickoff'},kickoff:false,lastPasser:null,lastPassTick:-99};
      }else if(result.outcome==='save'){
        const tippedBehind=source!=='penalty'&&r()<.14;
        addEvent(tick,'chance',side,tippedBehind?`${shooter.name} forces a strong save and the goalkeeper turns it behind.`:`${shooter.name} tests the goalkeeper, who gets safely behind it.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        if(tippedBehind){stats[side].corners++;state={side,zone:3.7,lane:r()<.5?0:2,carrier:state.carrier,ball:to,pending:{type:'corner-setup',side,lane:r()<.5?0:2},kickoff:false};}
        else{const defending=otherSide(side);moveChains.home=[];moveChains.away=[];state={side:defending,zone:.1,lane:1,carrier:0,ball:to,pending:null,kickoff:false,lastPasser:null,lastPassTick:-99};}
        crowdMood=result.xg>.25?'Nervous':crowdMood;
      }else if(result.outcome==='woodwork'){
        addEvent(tick,'chance',side,`${shooter.name} strikes the woodwork!`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        turnover(tick,otherSide(side),to,'rebound');
      }else if(result.outcome==='blocked'){
        addEvent(tick,'chance',side,`${shooter.name}'s effort is blocked in the crowded area.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        if(r()<.58){stats[side].corners++;state.pending={type:'corner-setup',side,lane:r()<.5?0:2};}
        else turnover(tick,otherSide(side),to,'rebound');
      }else{
        addEvent(tick,'chance',side,`${shooter.name} sends the effort wide.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        moveChains.home=[];moveChains.away=[];state={side:otherSide(side),zone:.05,lane:1,carrier:0,ball:to,pending:{type:'goal-kick-setup',side:otherSide(side)},kickoff:false,lastPasser:null,lastPassTick:-99};
      }
    };
    const setPieceSetup=(tick,type,side,lane)=>{
      const clock=clockFromTick(tick),profile=profileFor(side,hp,ap),team=teamFor(side,home,away),direction=attackDirection(side,clock);
      setPieceCount[side]++;const occurrence=setPieceCount[side],takerIndex=chooseSetPieceTaker(profile,type,r),taker=playerAt(profile,takerIndex);
      let origin,target,routine=null;
      if(type==='corner'){
        origin={x:direction===1?96.7:3.3,y:lane===0?6.8:93.2};
        const info=routineTarget(profile,'corner',side,clock,lane,occurrence);routine=info.routine;target=info.target;
        addEvent(tick,'set-piece',side,`${team.name} have a corner. ${taker.name} places the ball at the flag.`,{setPiece:'corner',playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='free-kick-dangerous'){
        origin=pointFor(side,clock,3.25,lane,0,(r()-.5)*4);target=goalTarget(side,clock,r);
        routine=activeRoutine(profile,'free-kick',occurrence);
        addEvent(tick,'set-piece',side,`A dangerous free kick for ${team.name}. ${taker.name} stands over the ball.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='free-kick'){
        origin=pointFor(side,clock,Math.max(.65,state.zone),lane);target=pointFor(side,clock,clamp(state.zone+.65,0,3.2),lane);
        routine=activeRoutine(profile,'free-kick',occurrence);
        addEvent(tick,'set-piece',side,`Free kick to ${team.name}. They organise before the restart.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='throw-in'){
        origin=pointFor(side,clock,state.zone,lane);origin.y=lane===0?5.2:94.8;target=pointFor(side,clock,clamp(state.zone+.25,0,3.5),lane,0,lane===0?8:-8);
        routine=activeRoutine(profile,'throw-in',occurrence);
        addEvent(tick,'set-piece',side,`Throw-in to ${team.name}. ${taker.name} looks for movement.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='goal-kick'){
        origin={x:direction===1?7.2:92.8,y:50};target=pointFor(side,clock,2.25,Math.floor(r()*3));
        addEvent(tick,'set-piece',side,`Goal kick to ${team.name}. The goalkeeper waits for the side to move up.`,{setPiece:type,playerId:profile.starters[0]?.id,player:profile.starters[0]?.name});
      }else if(type==='penalty'){
        origin={x:direction===1?88.5:11.5,y:50};target=goalTarget(side,clock,r);
        routine=activeRoutine(profile,'penalty',occurrence);
        addEvent(tick,'set-piece',side,`Penalty to ${team.name}. ${taker.name} places the ball on the spot.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }
      state.side=side;state.ball=origin;state.carrier=takerIndex;state.lane=lane;
      addFrame(tick,{side,phase:'set-piece-setup',setPiece:type,from:origin,to:origin,zone:zoneFromPoint(side,clock,origin),lane,ownerIndex:takerIndex,ownerId:taker.id,ballType:'stationary',routine:routine?{name:routine.name,delivery:routine.delivery,target:routine.target}:null,routinePositions:routinePositions(profile,routine,side,clock),...scoreSnapshot()});
      state.pending={type:`${type}-delivery`,side,lane,takerIndex,origin,target,routine};
    };
    const resolvePending=(tick,pending)=>{
      const side=pending.side||state.side,clock=clockFromTick(tick),profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),direction=attackDirection(side,clock);
      if(pending.type==='first-touch'){
        const receiver=playerAt(profile,pending.receiverIndex),impact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{controlPenalty:0,state:pitch};
        const touchError=clamp((impact.controlPenalty||0)*42+Math.max(0,55-(receiver.ability||50))*.012,0,.95),angle=r()*Math.PI*2,distance=.15+r()*touchError*1.8;
        const touchPoint={x:clamp(pending.target.x+Math.cos(angle)*distance,3,97),y:clamp(pending.target.y+Math.sin(angle)*distance,5,95)};
        addFrame(tick,{side,phase:'control',from:pending.target,to:touchPoint,zone:pending.zone,lane:pending.lane,ownerIndex:pending.receiverIndex,ownerId:receiver.id,ballType:'first-touch',controlQuality:touchError>.55?'loose':touchError>.28?'settled':'clean',surface:impact.state,...scoreSnapshot()});
        if(touchError>.62&&r()<.22)addEvent(tick,'build-up',side,`${receiver.name} takes an awkward first touch but keeps possession.`,{playerId:receiver.id,player:receiver.name});
        state={side,zone:pending.zone,lane:pending.lane,carrier:pending.receiverIndex,ball:touchPoint,pending:null,kickoff:false,lastPasser:pending.passerIndex,lastPassTick:tick-1};return;
      }
      if(pending.type==='shot-delivery'){
        resolveShot(tick,side,pending.from,pending.zone,pending.lane,pending.shooterIndex,pending.source||'open-play',pending.assistIndex,pending.routineBonus||0);return;
      }
      if(pending.type==='kickoff'){
        const takerIndex=8,taker=playerAt(profile,takerIndex),receiverIndex=pending.secondHalf?7:pending.opening?6:(r()<.5?6:7),receiver=playerAt(profile,receiverIndex),from={x:50,y:50},to=pointFor(side,clock,1.85,receiverIndex===6?0:2);
        addFrame(tick,{side,phase:'kickoff',setPiece:'kickoff',from,to,zone:1.85,lane:receiverIndex===6?0:2,ownerIndex:takerIndex,ownerId:taker.id,receiverIndex,receiverId:receiver.id,ballType:'short-pass',...scoreSnapshot()});
        addEvent(tick,'kickoff',side,pending.opening?`${team.name} kick off the match.`:pending.secondHalf?`${team.name} begin the second half.`:`${team.name} restart from the centre spot.`);
        moveChains[side]=[{tick,passer:taker.name,passerId:taker.id,receiver:receiver.name,receiverId:receiver.id,type:'kickoff'}];
        state={side,zone:1.85,lane:receiverIndex===6?0:2,carrier:receiverIndex,ball:to,pending:{type:'first-touch',side,receiverIndex,passerIndex:takerIndex,target:to,zone:1.85,lane:receiverIndex===6?0:2},kickoff:false,lastPasser:takerIndex,lastPassTick:tick};return;
      }
      if(pending.type.endsWith('-setup')){setPieceSetup(tick,pending.type.replace('-setup',''),side,pending.lane??1);return;}
      if(pending.type==='cutback-control'){
        const receiver=playerAt(profile,pending.receiverIndex),impact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{controlPenalty:0,state:pitch};
        const settle={x:clamp(pending.target.x+direction*(.15+r()*.45),3,97),y:clamp(pending.target.y+(r()-.5)*(1.2+(impact.controlPenalty||0)*18),7,93)};
        addFrame(tick,{side,phase:'control',from:pending.target,to:settle,zone:pending.zone,lane:1,ownerIndex:pending.receiverIndex,ownerId:receiver.id,ballType:'cutback-control',surface:impact.state,...scoreSnapshot()});
        state={side,zone:pending.zone,lane:1,carrier:pending.receiverIndex,ball:settle,pending:{type:'shot-delivery',side,from:settle,zone:pending.zone,lane:1,shooterIndex:pending.receiverIndex,source:'open-play',assistIndex:pending.passerIndex},kickoff:false,lastPasser:pending.passerIndex,lastPassTick:tick-1};return;
      }
      if(pending.type==='open-cross-resolution'){
        const crossChance=clamp(.44+(profile.attack-opp.defence)*.005,.25,.67);
        if(r()<crossChance)resolveShot(tick,side,pending.target,3.78,1,pending.receiverIndex,'open-header',pending.passerIndex,.006);
        else{
          const clearTo=pointFor(otherSide(side),clock,1.25,Math.floor(r()*3));
          addFrame(tick,{side:otherSide(side),phase:'clearance',from:pending.target,to:clearTo,zone:1.25,lane:laneFromPoint(clearTo),ownerIndex:chooseCarrierIndex(.8,1,r),ballType:'clearance',outcome:'cleared',...scoreSnapshot()});
          if(r()<.25){stats[side].corners++;addEvent(tick,'chance',side,`${team.name}'s cross is cut out and goes behind for a corner.`);state={side,zone:3.7,lane:r()<.5?0:2,carrier:pending.passerIndex,ball:clearTo,pending:{type:'corner-setup',side,lane:r()<.5?0:2},kickoff:false};}
          else{addEvent(tick,'chance',side,`${team.name}'s cross is cleared away.`);turnover(tick,otherSide(side),clearTo,'clearance');}
        }return;
      }
      if(pending.type==='corner-delivery'){
        const short=pending.routine?.target==='Short',receiverIndex=short?chooseCarrierIndex(3.34,pending.lane,r,pending.takerIndex):chooseCarrierIndex(3.82,1,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex),delivery=pending.routine?.delivery||pick(['Inswinging','Outswinging','Driven'],r);
        addFrame(tick,{side,phase:short?'pass':'cross',setPiece:'corner',from:pending.origin,to:pending.target,zone:short?3.34:3.82,lane:short?pending.lane:1,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:short?'short-pass':delivery.toLowerCase().includes('driven')?'driven-cross':'high-cross',routinePositions:routinePositions(profile,pending.routine,side,clock),...scoreSnapshot()});
        addEvent(tick,'build-up',side,short?`${playerAt(profile,pending.takerIndex).name} works the corner short to ${receiver.name}.`:`${playerAt(profile,pending.takerIndex).name} swings the corner towards ${pending.routine?.target||'the penalty spot'}.`,{setPiece:'corner'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:short?'short-corner':'corner'});
        if(moveChains[side].length>6)moveChains[side].shift();
        if(short){
          state={side,zone:3.34,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:3.34,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
        }
        state.pending={type:'corner-outcome',side,lane:1,receiverIndex,target:pending.target,takerIndex:pending.takerIndex,routine:pending.routine};return;
      }
      if(pending.type==='corner-outcome'){
        const routineBonus=['Near Post','Far Post'].includes(pending.routine?.target) ? .018 : 0;
        if(r()<.57)resolveShot(tick,side,pending.target,3.86,1,pending.receiverIndex,'header',pending.takerIndex,routineBonus);
        else{
          const clearTo=pointFor(otherSide(side),clock,1.2,Math.floor(r()*3));
          addFrame(tick,{side:otherSide(side),phase:'clearance',setPiece:'corner',from:pending.target,to:clearTo,zone:1.2,lane:laneFromPoint(clearTo),ownerIndex:chooseCarrierIndex(.7,1,r),ballType:'clearance',outcome:'cleared',...scoreSnapshot()});
          addEvent(tick,'chance',side,`${team.name}'s corner is headed clear.` ,{setPiece:'corner'});turnover(tick,otherSide(side),clearTo,'clearance');
        }return;
      }
      if(pending.type==='free-kick-dangerous-delivery'){
        const direct=(pending.routine?.delivery||'Mixed')!=='Floated'&&r()<.62;
        if(direct){resolveShot(tick,side,pending.origin,3.35,pending.lane,pending.takerIndex,'free-kick',null,pending.routine?.target==='Top Corner'?.02:0);return;}
        const receiverIndex=chooseCarrierIndex(3.7,1,r,pending.takerIndex),target=pointFor(side,clock,3.78,1,0,(r()-.5)*16);
        addFrame(tick,{side,phase:'cross',setPiece:'free-kick-dangerous',from:pending.origin,to:target,zone:3.78,lane:1,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:playerAt(profile,receiverIndex).id,ballType:'free-kick-cross',routinePositions:routinePositions(profile,pending.routine,side,clock),...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} clips the free kick into the crowded area.`,{setPiece:'free-kick-dangerous'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:playerAt(profile,receiverIndex).name,receiverId:playerAt(profile,receiverIndex).id,type:'free-kick-cross'});
        if(moveChains[side].length>6)moveChains[side].shift();
        state.pending={type:'free-kick-header',side,target,receiverIndex,takerIndex:pending.takerIndex};return;
      }
      if(pending.type==='free-kick-header'){resolveShot(tick,side,pending.target,3.78,1,pending.receiverIndex,'header',pending.takerIndex,.012);return;}
      if(pending.type==='free-kick-delivery'){
        const receiverIndex=chooseCarrierIndex(clamp(state.zone+.65,0,3.2),pending.lane,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'pass',setPiece:'free-kick',from:pending.origin,to:pending.target,zone:zoneFromPoint(side,clock,pending.target),lane:pending.lane,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:'driven-pass',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} restarts play and finds ${receiver.name}.`,{setPiece:'free-kick'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:'free-kick'});
        if(moveChains[side].length>6)moveChains[side].shift();
        const z=zoneFromPoint(side,clock,pending.target);state={side,zone:z,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:z,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
      }
      if(pending.type==='throw-in-delivery'){
        const receiverIndex=chooseCarrierIndex(zoneFromPoint(side,clock,pending.target),pending.lane,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'throw',setPiece:'throw-in',from:pending.origin,to:pending.target,zone:zoneFromPoint(side,clock,pending.target),lane:pending.lane,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:'throw',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} throws to ${receiver.name}'s feet.`,{setPiece:'throw-in'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:'throw-in'});
        if(moveChains[side].length>6)moveChains[side].shift();
        const z=zoneFromPoint(side,clock,pending.target);state={side,zone:z,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:z,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
      }
      if(pending.type==='goal-kick-delivery'){
        const receiverIndex=chooseCarrierIndex(2.25,laneFromPoint(pending.target),r,0),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'goal-kick',setPiece:'goal-kick',from:pending.origin,to:pending.target,zone:2.25,lane:laneFromPoint(pending.target),ownerIndex:0,ownerId:profile.starters[0]?.id,receiverIndex,receiverId:receiver.id,ballType:'long-kick',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${profile.starters[0]?.name||'The goalkeeper'} sends the goal kick towards midfield.`,{setPiece:'goal-kick'});
        const success=r()<clamp(.58+(profile.midfield-opp.midfield)*.006,.36,.78);
        if(success){
          const keeper=profile.starters[0]||{id:null,name:'The goalkeeper'};
          moveChains[side].push({tick,passer:keeper.name,passerId:keeper.id,receiver:receiver.name,receiverId:receiver.id,type:'goal-kick'});
          if(moveChains[side].length>6)moveChains[side].shift();
          state={side,zone:2.25,lane:laneFromPoint(pending.target),carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:0,target:pending.target,zone:2.25,lane:laneFromPoint(pending.target)},kickoff:false,lastPasser:0,lastPassTick:tick};
        }else turnover(tick,otherSide(side),pending.target,'aerial-duel');return;
      }
      if(pending.type==='penalty-delivery'){resolveShot(tick,side,pending.origin,4,1,pending.takerIndex,'penalty',null,.02);return;}
    };
    const normalAction=tick=>{
      const clock=clockFromTick(tick),side=state.side,profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),sideLabel=team.name;
      const carrier=playerAt(profile,state.carrier),t=profile.tactics||{},live=aiAdjustment(profile,side==='home'?hg:ag,side==='home'?ag:hg,displayMinute(clock),dismissals[side]);
      const press=opp.tactical.pressing||50,technical=(profile.midfield*.55+profile.attack*.25+(carrier.ability||50)*.2);
      const environmentImpact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{passPenalty:(pitch==='Muddy'?.025:pitch==='Frozen'?.035:0),controlPenalty:0,tacklePenalty:0,state:pitch,ballSpeed:1};
      const surfacePenalty=Number(environmentImpact.passPenalty||0),targetingFactor=1+reputation(carrier).targeted*.0035,incidentChance=clamp((.014+press*.00023+(live.tempo||50)*.00007+Number(environmentImpact.tacklePenalty||0)*.16)*(1.04+(eraOfficiating.challengeTolerance-1)*.20)*targetingFactor,.015,.068);
      if(r()<incidentChance){
        const defending=otherSide(side),fouler=selectFouler(defending),view=clamp(refereeProfile.perception*(.72+r()*.48),.18,.98),incidentRoll=r(),inBoxCandidate=eraRules.penalties&&state.zone>3.88&&r()<.12,dangerous=state.zone>3.05;
        addFrame(tick,{side,phase:'foul',from:state.ball,to:state.ball,zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'stopped',surface:environmentImpact.state,...scoreSnapshot()});
        if(incidentRoll<.055){
          const contextRoll=r(),context=contextRoll<.22?'baseless':contextRoll<.50?'reasonable':contextRoll<.76?'reasonable+':contextRoll<.90?'reasonable++':'reasonable+++',skill=simulationSkill(carrier),diverRep=reputation(carrier).diver,detection=clamp(view*eraOfficiating.simulationDetection+(70-skill)*.002+diverRep*.0022,.08,.98);
          const repeatedPulls=context==='reasonable+++'?3:0;
          let decision='play-on',evidence=context==='reasonable+++'?.93:context==='reasonable++'?.88:context==='reasonable+'?.49:context==='reasonable'?.20:.05;
          if(context==='baseless'&&r()<detection)decision='simulation';
          else if(context==='reasonable'&&r()<detection*.72)decision='simulation-warning';
          else if(context==='reasonable+'&&r()<.10)decision='defender-foul';
          else if(context==='reasonable++'&&r()<clamp(.60*view+.14,.28,.90))decision='defender-foul';
          else if(context==='reasonable+++')decision='defender-foul';
          if(inBoxCandidate){const reviewed=penaltyVARReview(tick,side,decision==='defender-foul'?'penalty':'no-penalty',evidence,`a possible foul on ${carrier.name}`);if(reviewed==='penalty')decision='defender-foul';else if(reviewed==='no-penalty'&&decision==='defender-foul')decision=context==='baseless'?'simulation':'play-on';}
          addEvent(tick,'simulation',side,`${carrier.name} goes to ground ${context==='baseless'?'with nobody close':context==='reasonable'?'after a challenge misses':context==='reasonable+'?'after slight contact':context==='reasonable++'?'after clear contact':'after being pulled three consecutive times'}.`,{playerId:carrier.id,player:carrier.name,defenderId:fouler.id,defender:fouler.name,context,decision,pulls:repeatedPulls});
          raiseTemperature(context==='baseless'?4:2,'simulation',tick,carrier,fouler);if(context==='baseless'||context==='reasonable')addReputation(carrier,'diver',context==='baseless'?3:1);if(context==='reasonable+++')addReputation(fouler,'hardMan',1.5);
          if(decision==='defender-foul'){
            const reason=context==='reasonable+++'?'persistent shirt pulling':'contact';stats[defending].fouls++;addEvent(tick,'foul',defending,context==='reasonable+++'?`${fouler.name} is penalised after pulling ${carrier.name}'s shirt three consecutive times.`:`${fouler.name} is penalised for the contact on ${carrier.name}.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,reason,pulls:repeatedPulls});
            if(context==='reasonable+'){
              // Exact requested sub-flow: the marginal incident is called 10% of the time;
              // inside that branch the defender is booked for dissent exactly 1 time in 5.
              if(r()<.20){addEvent(tick,'dissent',defending,`${fouler.name} argues back after the marginal foul decision.`,{playerId:fouler.id,player:fouler.name,decision:'marginal foul'});addReputation(fouler,'dissent',2);applyCard(tick,defending,fouler,{forceYellow:true,reason:'dissent'});}
            }else if(context==='reasonable+++')applyCard(tick,defending,fouler,{severity:.52,yellowChance:.30,reason:'persistent shirt pulling'});
            else applyCard(tick,defending,fouler,{severity:.48,yellowChance:.16,reason:'careless challenge'});
            maybeConfrontation(tick,fouler,carrier,.25,'diving accusation');state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;
          }
          if(decision==='simulation'||decision==='simulation-warning'){
            stats[side].fouls++;if(decision==='simulation')applyCard(tick,side,carrier,{forceYellow:true,reason:'simulation'});else showWarning(tick,side,carrier,'simulation');addEvent(tick,'foul',side,`${carrier.name} is penalised for simulation.`,{playerId:carrier.id,player:carrier.name,reason:'simulation'});maybeConfrontation(tick,carrier,fouler,.20,'diving accusation');state.pending={type:'free-kick-setup',side:defending,lane:state.lane};return;
          }
          if(context!=='reasonable+'||r()<.45)addEvent(tick,'play-on',null,'The referee waves play on.',{context});return;
        }
        if(incidentRoll<.255){
          const pulls=1+Math.floor(r()*4),pressure=.18+pulls*.24+r()*.28,obvious=pulls>=3||pressure>.92,seen=r()<clamp(view/eraOfficiating.pullTolerance,.16,.96);
          raiseTemperature(1+pulls*.8,'shirt pulling',tick,fouler,carrier);
          addEvent(tick,'shirt-pull',defending,pulls>=3?`${fouler.name} pulls ${carrier.name}'s shirt three consecutive times.`:`${fouler.name} tugs at ${carrier.name}'s shirt.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,pulls,pressure:+pressure.toFixed(2),incident:pulls>=3?'three-consecutive-pulls':'shirt-pull'});
          if(obvious&&seen){
            if(inBoxCandidate&&penaltyVARReview(tick,side,'penalty',clamp(.62+pulls*.07+pressure*.08,.72,.96),`the shirt pull on ${carrier.name}`)==='no-penalty'){addEvent(tick,'play-on',null,'The penalty is cancelled after the video review.',{reason:'shirt pull not conclusive'});return;}
            stats[defending].fouls++;addEvent(tick,'foul',defending,`The referee penalises ${fouler.name} for ${pulls>=3?'persistent ':''}shirt pulling.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,reason:'shirt pulling'});applyCard(tick,defending,fouler,{severity:clamp(.24+pressure*.30,0,1),yellowChance:pulls>=3?.30:.08,reason:pulls>=3?'persistent shirt pulling':'shirt pulling'});if(r()<.18)maybeDissent(tick,defending,fouler,'shirt-pull decision',.18);maybeConfrontation(tick,fouler,carrier,.38,'shirt pulling');state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;}
          if(seen&&pulls===1)addEvent(tick,'warning',defending,`The referee tells ${fouler.name} to release the shirt.`,{playerId:fouler.id,player:fouler.name,reason:'shirt pulling'});return;
        }
        const challengeSeverity=clamp(.18+r()*.70+(eraOfficiating.challengeTolerance-1)*.10+(storyline==='Physical battle'?.08:0),.10,1),hard=challengeSeverity>.58,fromBehind=r()<.16,ballFirst=r()<clamp(.54-(challengeSeverity-.45)*.28,.24,.62),callThreshold=.35*eraOfficiating.challengeTolerance,called=!ballFirst&&r()<clamp(view*(challengeSeverity/callThreshold)*.70,.12,.96)||hard&&challengeSeverity>.78*eraOfficiating.challengeTolerance&&r()<view*.78;
        raiseTemperature(hard?4+challengeSeverity*5:1.5,'challenge',tick,fouler,carrier);
        if(!called){if(hard&&r()<.68)addEvent(tick,'play-on',null,`${fouler.name} makes a heavy challenge, but the referee allows play to continue.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,severity:+challengeSeverity.toFixed(2),era:eraOfficiating.id});return;}
        const challengeEvidence=ballFirst?clamp(.20+challengeSeverity*.22,.22,.46):clamp(.53+challengeSeverity*.43,.58,.96);
        if(inBoxCandidate&&penaltyVARReview(tick,side,'penalty',challengeEvidence,`the challenge by ${fouler.name}`)==='no-penalty'){addEvent(tick,'play-on',null,'The penalty is overturned after the replay shows no clear foul.',{playerId:fouler.id,player:fouler.name,reason:'VAR overturn'});return;}
        stats[defending].fouls++;
        const reason=hard?'heavy challenge':fromBehind?'late challenge':'careless challenge';
        addEvent(tick,'foul',defending,`${carrier.name} is brought down by ${fouler.name} and the whistle goes.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,severity:+challengeSeverity.toFixed(2),reason,ballFirst});
        applyCard(tick,defending,fouler,{severity:challengeSeverity,forceRed:fromBehind&&challengeSeverity>.92,reason:fromBehind&&challengeSeverity>.72?'serious foul play':reason});
        if(r()<.12)maybeDissent(tick,defending,fouler,'foul decision',.15);if(hard)maybeConfrontation(tick,fouler,carrier,challengeSeverity,reason);
        state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;
      }
      if(r()<.011){
        addFrame(tick,{side,phase:'out',from:state.ball,to:{...state.ball,y:state.lane===0?4.5:95.5},zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'out',surface:environmentImpact.state,...scoreSnapshot()});
        state.pending={type:'throw-in-setup',side:r()<.7?side:otherSide(side),lane:state.lane===1?(r()<.5?0:2):state.lane};return;
      }
      const advanced=state.zone>=3.22,wide=state.lane!==1;
      const shotChance=advanced?clamp(.075+(state.zone-3.2)*.16+(live.chanceVolume||50)*.00055,.07,.24):0;
      if(r()<shotChance){
        const direction=attackDirection(side,clock),setup={x:clamp(state.ball.x+direction*(.25+r()*.52),3,97),y:clamp(state.ball.y+(r()-.5)*(1.3+Number(environmentImpact.controlPenalty||0)*24),7,93)};
        const assistIndex=state.lastPasser!=null&&tick-state.lastPassTick<=9?state.lastPasser:null;
        addFrame(tick,{side,phase:'shot-setup',from:state.ball,to:setup,zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'control',surface:environmentImpact.state,...scoreSnapshot()});
        state.ball=setup;state.pending={type:'shot-delivery',side,from:setup,zone:state.zone,lane:state.lane,shooterIndex:state.carrier,source:'open-play',assistIndex};return;
      }
      const crossChance=advanced&&wide?clamp(.105+(t.width||50)*.0012,.12,.24):0;
      if(r()<crossChance){
        const cutback=state.zone>3.52&&r()<clamp(.23+(t.creativeFreedom||50)*.002,.25,.46);
        const target=cutback?pointFor(side,clock,3.42,1,0,(r()-.5)*9):pointFor(side,clock,3.78,1,0,(r()-.5)*15),receiverIndex=chooseCarrierIndex(cutback?3.42:3.8,1,r,state.carrier),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'cross',from:state.ball,to:target,zone:cutback?3.42:3.78,lane:1,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType:cutback?'cutback':r()<.45?'driven-cross':'high-cross',surface:environmentImpact.state,...scoreSnapshot()});
        addEvent(tick,'build-up',side,cutback?`${carrier.name} reaches the line and cuts the ball back towards ${receiver.name}.`:`${carrier.name} delivers from ${state.lane===0?'the left':'the right'} towards ${receiver.name}.`,{playerId:carrier.id,player:carrier.name,receiverId:receiver.id,receiver:receiver.name,passType:cutback?'cutback':'cross'});
        moveChains[side].push({tick,passer:carrier.name,passerId:carrier.id,receiver:receiver.name,receiverId:receiver.id,type:cutback?'cutback':'cross'});if(moveChains[side].length>6)moveChains[side].shift();
        state.pending=cutback?{type:'cutback-control',side,target,zone:3.42,receiverIndex,passerIndex:state.carrier}:{type:'open-cross-outcome',side,target,receiverIndex,passerIndex:state.carrier};return;
      }
      const underPressure=r()<clamp(.12+(press-50)*.004,.06,.34),direct=(t.passing||50)>62||((t.tempo||50)>65&&r()<.45)||(['victorian','interwar'].includes(conditions.era?.id)&&r()<.22),switchPlay=(t.width||50)>58&&r()<.12,through=state.zone>2.2&&r()<clamp(.05+(t.creativeFreedom||50)*.001,.07,.16),combination=state.zone>1.45&&state.zone<3.35&&r()<clamp(.035+(t.creativeFreedom||50)*.0011,.065,.145);
      const carryChance=clamp(.26+(t.creativeFreedom||50)*.001-(press||50)*.0014-Number(environmentImpact.controlPenalty||0)*.36,.14,.34);
      if(r()<carryChance){
        const delta=clamp(.09+r()*.18+(t.tempo-50)*.001,.08,.30),newZone=clamp(state.zone+delta,0,4),newLane=r()<.16?clamp(state.lane+(r()<.5?-1:1),0,2):state.lane,to=pointFor(side,clock,newZone,newLane,(r()-.5)*2,(r()-.5)*6);
        const tackleChance=clamp(.045+(press-50)*.0014+(opp.defence-technical)*.0012+Number(environmentImpact.tacklePenalty||0)+Number(environmentImpact.controlPenalty||0)*.22,.025,.18);
        if(r()<tackleChance){
          addFrame(tick,{side,phase:'carry',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'dribble',outcome:'tackled',surface:environmentImpact.state,...scoreSnapshot()});
          turnover(tick,otherSide(side),to,'tackle');
        }else{
          addFrame(tick,{side,phase:'carry',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'dribble',surface:environmentImpact.state,...scoreSnapshot()});
          if(newZone>2.8&&r()<.12)addEvent(tick,'build-up',side,`${carrier.name} carries the ball into attacking territory.`,{playerId:carrier.id,player:carrier.name});
          state.zone=newZone;state.lane=newLane;state.ball=to;
        }return;
      }
      let passType='short',zoneDelta=.18+(r()-.35)*.38,newLane=state.lane;
      if(underPressure&&r()<.55){passType='back';zoneDelta=-.45-r()*.2;}
      else if(switchPlay){passType='switch';zoneDelta=.08+r()*.18;newLane=state.lane===0?2:state.lane===2?0:(r()<.5?0:2);}
      else if(through){passType='through';zoneDelta=.65+r()*.45;newLane=r()<.5?state.lane:1;}
      else if(combination){passType='one-two';zoneDelta=.27+r()*.32;newLane=r()<.72?state.lane:1;}
      else if(direct&&r()<.62){passType=r()<.28?'clipped':'driven';zoneDelta=.45+r()*.55;newLane=r()<.3?Math.floor(r()*3):state.lane;}
      const newZone=clamp(state.zone+zoneDelta,0,4),receiverIndex=chooseCarrierIndex(newZone,newLane,r,state.carrier),receiver=playerAt(profile,receiverIndex),to=pointFor(side,clock,newZone,newLane,(r()-.5)*2,(r()-.5)*6);
      const distance=Math.hypot(to.x-state.ball.x,to.y-state.ball.y),baseDifficulty={through:.075,switch:.065,driven:.045,clipped:.055,'one-two':.026,back:.012,short:.018}[passType]??.018,difficulty=baseDifficulty+distance*.00065;
      const backPassAdjustment=passType==='back'&&!eraRules.backPassAllowed?.035:0;
      const failChance=clamp(.045+difficulty+(press-50)*.0012+(50-technical)*.0011+surfacePenalty+backPassAdjustment,.025,.285);
      const offsideMultiplier=Number(eraRules.offsideDefendersRequired||2)>=3?1.35:1;
      const offside=passType==='through'&&newZone>3.45&&r()<clamp((.045+(100-(profile.attack||50))*.0004)*offsideMultiplier,.035,.13);
      const ballType={switch:'lofted-switch',through:'through-ball',driven:'driven-pass',clipped:'clipped-pass','one-two':'combination-pass',back:'short-pass',short:'short-pass'}[passType]||'short-pass';
      if(offside){
        stats[side].offsides++;
        addFrame(tick,{side,phase:'pass',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType:'through-ball',outcome:'offside',surface:environmentImpact.state,...scoreSnapshot()});
        addEvent(tick,'offside',side,`${receiver.name} goes too soon. The flag is raised for offside.`,{playerId:receiver.id,player:receiver.name});
        const defending=otherSide(side);state={side:defending,zone:zoneFromPoint(defending,clock,to),lane:newLane,carrier:4,ball:to,pending:{type:'free-kick-setup',side:defending,lane:newLane},kickoff:false,lastPasser:null,lastPassTick:-99};return;
      }
      if(r()<failChance){
        const intercept={x:state.ball.x+(to.x-state.ball.x)*(.48+r()*.28),y:state.ball.y+(to.y-state.ball.y)*(.48+r()*.28)};
        addFrame(tick,{side,phase:'pass',from:state.ball,to:intercept,zone:zoneFromPoint(side,clock,intercept),lane:laneFromPoint(intercept),ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType,outcome:'intercepted',surface:environmentImpact.state,...scoreSnapshot()});
        turnover(tick,otherSide(side),intercept,'interception');return;
      }
      addFrame(tick,{side,phase:'pass',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType,surface:environmentImpact.state,...scoreSnapshot()});
      if(passType!=='short'||newZone>2.75||r()<.07)addEvent(tick,'build-up',side,commentaryForPass(passType,carrier,receiver,sideLabel,newLane,newZone>2.75),{playerId:carrier.id,player:carrier.name,receiverId:receiver.id,receiver:receiver.name,passType});
      moveChains[side].push({tick,passer:carrier.name,passerId:carrier.id,receiver:receiver.name,receiverId:receiver.id,type:passType});if(moveChains[side].length>6)moveChains[side].shift();
      state={side,zone:newZone,lane:newLane,carrier:receiverIndex,ball:to,pending:{type:'first-touch',side,receiverIndex,passerIndex:state.carrier,target:to,zone:newZone,lane:newLane},kickoff:false,lastPasser:state.carrier,lastPassTick:tick};
    };
    for(let tick=0;tick<MATCH_TOTAL_TICKS;tick++){
      const clock=clockFromTick(tick);
      if(tick===0){
        const taker=playerAt(hp,8),from={x:50,y:50};
        addFrame(tick,{side:'home',phase:'set-piece-setup',setPiece:'kickoff',from,to:from,zone:2,lane:1,ownerIndex:8,ownerId:taker.id,receiverIndex:6,receiverId:playerAt(hp,6).id,ballType:'stationary',...scoreSnapshot()});
        state={side:'home',zone:2,lane:1,carrier:8,ball:from,pending:{type:'kickoff',side:'home',opening:true},kickoff:true,lastPasser:null,lastPassTick:-99};snapshotStats(tick);momentum.push({minute:0,value:0});continue;
      }
      if(tick===45*MATCH_TICKS_PER_MINUTE){
        const taker=playerAt(ap,8),from={x:50,y:50};
        addFrame(tick,{side:'away',phase:'set-piece-setup',setPiece:'kickoff',from,to:from,zone:2,lane:1,ownerIndex:8,ownerId:taker.id,receiverIndex:7,receiverId:playerAt(ap,7).id,ballType:'stationary',...scoreSnapshot()});
        state={side:'away',zone:2,lane:1,carrier:8,ball:from,pending:{type:'kickoff',side:'away',secondHalf:true},kickoff:true,lastPasser:null,lastPassTick:-99};snapshotStats(tick);momentum.push({minute:45,value:Math.round(clamp(pressureWindow,-45,45))});continue;
      }
      if(state.pending){const pending=state.pending;state.pending=null;resolvePending(tick,pending);}
      else normalAction(tick);
      if(state.pending?.type==='open-cross-outcome'){
        // handled on the next simulation tick by converting to a standard pending action below
      }
      if(state.pending&&state.pending.type==='open-cross-outcome'){
        const original=state.pending;
        state.pending={...original,type:'open-cross-resolution'};
      }
      if(state.pending&&state.pending.type==='open-cross-resolution'){
        // leave queued for next tick
      }
      if(tick%MATCH_TICKS_PER_MINUTE===0){
        if(matchTemperature>18)matchTemperature=Math.max(18,matchTemperature-.32);
        updatePossession();momentum.push({minute:Math.floor(clock),value:Math.round(clamp(pressureWindow,-48,48))});snapshotStats(tick);
      }
      if(r()<incidentChance/MATCH_TOTAL_TICKS){
        const periodIncidents=hooliganism==='crisis'?['Crowd disorder behind one goal forces a lengthy delay.','Objects are thrown from a terrace and the referee temporarily stops play.','Mounted police move between rival groups as play is held up.','A pitch incursion forces both teams towards the centre circle.']:hooliganism==='rising'?['A brief pitch invasion delays the restart.','Police separate rival groups behind the terrace.','A disturbance near the turnstiles delays the second half.']:['A dog has run onto the pitch and play is stopped.','A spectator has wandered across the touchline.','The match ball has burst and a replacement is required.','A brief pitch invasion delays the restart.'];
        const incident=pick(periodIncidents,r);
        addEvent(tick,'incident',null,incident);crowdMood='Amused';
      }
    }
    // Resolve any open-cross frame types that were queued by normal play but not consumed by a named branch.
    for(let i=0;i<frames.length;i++){
      if(frames[i].phase==='cross'&&!frames[i].setPiece){
        const next=frames[i+1];
        if(next&&next.tick===frames[i].tick+1)continue;
      }
    }
    updatePossession();snapshotStats(MATCH_TOTAL_TICKS);
    events.sort((a,b)=>eventClock(a)-eventClock(b)||({incident:0,'set-piece':1,kickoff:2,foul:3,turnover:4,'build-up':5,chance:6,goal:7}[a.type]??8)-({incident:0,'set-piece':1,kickoff:2,foul:3,turnover:4,'build-up':5,chance:6,goal:7}[b.type]??8));
    const attendance=Math.round((home.capacity||12000)*clamp(.38+home.strength*.09+r()*.14,.35,.96));
    const pitchWear=window.FLMatchEnvironment?FLMatchEnvironment.wearMap(frames,conditions):[];
    const setPieceSources=new Set(['corner','free-kick','header','penalty']);
    const setPieceSummary={home:{corners:stats.home.corners,shots:frames.filter(x=>x.side==='home'&&['shot','header'].includes(x.phase)&&setPieceSources.has(x.source)).length,goals:events.filter(x=>x.side==='home'&&x.type==='goal'&&setPieceSources.has(x.source)).length},away:{corners:stats.away.corners,shots:frames.filter(x=>x.side==='away'&&['shot','header'].includes(x.phase)&&setPieceSources.has(x.source)).length,goals:events.filter(x=>x.side==='away'&&x.type==='goal'&&setPieceSources.has(x.source)).length}};
    const record={id:`match-${f.id}-${f.date}`,engineVersion:'2.3',ticksPerMinute:MATCH_TICKS_PER_MINUTE,totalTicks:MATCH_TOTAL_TICKS,fixtureId:f.id,date:f.date,competition:f.competition||(window.FLTimeline?FLTimeline.activeCompetitionName(game):'Football League'),round:f.round,homeId:home.id,awayId:away.id,homeName:home.name,awayName:away.name,homeGoals:hg,awayGoals:ag,weather,pitch,conditions,pitchWear,presentationEra:conditions.era,setPieceSummary,attendance,stats,statsTimeline,events,frames,momentum,storyline,atmosphere:{start:'Anticipation',final:crowdMood},officiating:{year:matchYear,era:eraOfficiating.id,varActive,referee:{control:+refereeProfile.control.toFixed(2),perception:+refereeProfile.perception.toFixed(2),strictness:+refereeProfile.strictness.toFixed(2)},temperature:{start:temperatureHistory[0].value,peak:+matchTemperaturePeak.toFixed(1),final:+matchTemperature.toFixed(1),history:temperatureHistory}},teamProfiles:{home:hp,away:ap},tacticalSummary:{home:hp.tactical,away:ap.tactical},substitutions:[],notableIncidents:events.filter(e=>e.type==='incident')};
    // Player records are committed at full time so all eleven starters and any
    // user-made substitutions receive the correct appearance and minutes.
    applyResult(game,f,record);rememberMatch(game,record);
    return record;
  }
  function simulateMatchday(game,controlledFixture){
    const record=simulateDetailedMatch(game,controlledFixture);
    const sameCompetition=f=>controlledFixture.competitionId==='english-cup'?f.competitionId==='english-cup':(f.divisionId===controlledFixture.divisionId&&f.competitionId===controlledFixture.competitionId);
    const related=game.fixtures.filter(f=>f.date===controlledFixture.date&&!f.played&&f.id!==controlledFixture.id&&sameCompetition(f));
    related.forEach(f=>simulateFixture(game,f));
    record.otherResults=game.fixtures.filter(f=>f.date===controlledFixture.date&&f.id!==controlledFixture.id&&f.played&&sameCompetition(f)).map(f=>({fixtureId:f.id,homeName:club(game,f.home)?.name||f.home,awayName:club(game,f.away)?.name||f.away,homeGoals:f.homeGoals,awayGoals:f.awayGoals}));
    compactMatchRecords(game);game.activeMatchId=record.id;return record;
  }

  function table(game,divisionId){
    if(window.FLPyramid)return FLPyramid.table(game,divisionId);
    return [...game.clubs].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
  }
  function allTables(game){return window.FLPyramid?FLPyramid.allTables(game):[{division:{id:'football-league',name:'Football League',tier:1},table:table(game)}]}
  function currentRules(game){return window.FLTimeline?FLTimeline.currentRules(game):{pointsForWin:2,substitutionsAllowed:3,benchSize:7};}
  function currentCompetition(game){return window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):(window.FLTimeline?FLTimeline.currentCompetition(game):{id:'football-league',name:'Football League',official:true});}
  return {create,createWorld,fastForwardToYear,attachManager,createStartYear,clubHistorySummary,club,controlledClub,nextFixture,fixtureOn,repairMissingFixtures,advanceDay,table,allTables,teamProfile,simulateDetailedMatch,simulateMatchday,finalizeMatchStats,currentRules,currentCompetition,makePyramidSchedule,repairWorldBalance,compactMatchRecords};
})();
window.FLGame = (() => {
  const DAY = 86400000;
  function hashSeed(text){ let h=2166136261; for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; }
  function rng(seed){ let s=seed>>>0; return () => { s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
  function pick(arr,r){ return arr[Math.floor(r()*arr.length)]; }
  function iso(d){ return d.toISOString().slice(0,10); }
  function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
  function makePlayers(club, r, year=1888, gameRef=null){
    const personalities=['Model Professional','Professional','Driven','Determined','Balanced','Loyal','Ambitious','Temperamental','Casual'];
    const curves=['early','steady','steady','steady','late','volatile'];
    return FLData.positions.map((position,index)=>{
      const age=16+Math.floor(r()*20);
      const base=34+(club.strength*7)+Math.floor(r()*18);
      const balanced=window.FLFootballBalance?FLFootballBalance.generatedPlayerProfile(club,r,age):null;
      const rare=r();
      let ability=balanced?.ability??clamp(base,34,80);
      let ceiling=balanced?.ceiling??clamp(ability+7+Math.floor(r()*16),ability,93);
      if(!balanced&&age<=19 && rare<0.006){ ability=clamp(62+Math.floor(r()*10),ability,78); ceiling=88+Math.floor(r()*7); }
      else if(!balanced&&age<=20 && rare<0.025){ ability=Math.max(ability,54+Math.floor(r()*8)); ceiling=84+Math.floor(r()*9); }
      const professionalism=35+Math.floor(r()*65), ambition=30+Math.floor(r()*70), loyalty=25+Math.floor(r()*75);
      const leadership=20+Math.floor(r()*80), bigMatches=25+Math.floor(r()*75), consistency=35+Math.floor(r()*65);
      const injuryProneness=8+Math.floor(r()*78), temperament=20+Math.floor(r()*80), teamwork=35+Math.floor(r()*65);
      const determination=30+Math.floor(r()*70), adaptability=25+Math.floor(r()*75);
      const potentialEstimate=balanced?.potential??clamp(Math.round((ceiling*.7)+(ability*.3)),ability,95);
      const player={
        id:`${club.id}-p${index+1}`,
        name:window.FLEraIdentity?FLEraIdentity.generatedName('English',Math.max(1888,year-age+18),Math.floor(r()*4294967295)):`${pick(FLData.firstNames,r)} ${pick(FLData.lastNames,r)}`,
        clubId:club.id||null,
        nationality:'English',
        generatedYear:year,
        birthYear:year-age,
        position,
        age,
        condition:88+Math.floor(r()*13),
        form:'—',
        ability,
        potential:potentialEstimate,
        ceiling,
        developmentCurve:pick(curves,r),
        developmentMomentum:0,
        personalityProfile:{professionalism,ambition,loyalty,leadership,bigMatches,consistency,injuryProneness,temperament,teamwork,determination,adaptability},
        personalityLabel:pick(personalities,r),
        wage:Math.max(1,Math.round((1+Math.floor((base/20)*r()))*(window.FLEconomy?FLEconomy.wageIndex(year):1))),
        appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',
        honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0}
      };
      if(window.FLEraIdentity)FLEraIdentity.applyPlayer(gameRef||{meta:{seed:1},date:`${year}-08-15`},player,year);
      return player;
    });
  }
  function makeSchedule(clubs,startYear=1888,options={}){
    const ids=clubs.map(c=>c.id);if(ids.length<2)return [];
    const rotating=ids.length%2?[...ids,null]:ids.slice(),rounds=[];
    for(let round=0;round<rotating.length-1;round++){
      const games=[];
      for(let i=0;i<rotating.length/2;i++){
        let home=rotating[i],away=rotating[rotating.length-1-i];
        if(round%2&&i===0)[home,away]=[away,home];
        if(home&&away)games.push({home,away});
      }
      rounds.push(games);rotating.splice(1,0,rotating.pop());
    }
    const allRounds=Number(options.rounds)===1?rounds:rounds.concat(rounds.map(g=>g.map(x=>({home:x.away,away:x.home}))));
    const startDate=options.startDate||`${startYear}-${options.startMonthDay||'09-08'}`,start=new Date(`${startDate}T12:00:00Z`),fixtures=[],prefix=options.idPrefix||String(startYear);
    allRounds.forEach((games,round)=>games.forEach((g,i)=>fixtures.push({
      id:`${prefix}-r${round+1}m${i+1}`,round:round+1,date:iso(new Date(start.getTime()+round*7*DAY)),home:g.home,away:g.away,played:false,homeGoals:null,awayGoals:null,
      competition:options.name||'Football League',competitionId:options.id||null,divisionId:options.divisionId||options.id||null,tier:Number(options.tier)||1,official:options.official!==false
    })));
    return fixtures;
  }
  function makePyramidSchedule(game,startYear,override={}){
    if(window.FLPyramid)FLPyramid.ensure(game,startYear);
    const context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{official:true,rounds:2,startMonthDay:'09-08'};
    const divisions=(window.FLPyramid?FLPyramid.divisionList(game,startYear):[{id:context.id||'football-league',name:context.name||'Football League',tier:1}]).filter(d=>!window.FLPyramid||FLPyramid.isDetailedDivision(game,d.id));
    return divisions.flatMap(d=>{
      const members=window.FLPyramid?FLPyramid.clubsInDivision(game,d.id):game.clubs;
      return makeSchedule(members,startYear,{...context,...override,id:d.id,divisionId:d.id,tier:d.tier,name:d.name,idPrefix:`${startYear}-${d.id}`,rounds:context.official===false?1:(context.rounds||2)});
    }).sort((a,b)=>a.date.localeCompare(b.date)||a.tier-b.tier||a.id.localeCompare(b.id));
  }
  function openingInbox(manager,club,date='1888-08-15',competitionName='Football League'){
    const year=Number(String(date).slice(0,4))||1888,expectation=String(club.expectation||'build a stable season').replace(/^./,x=>x.toLowerCase()),count=Array.isArray(club.players)?club.players.length:0;
    return [
      {id:'welcome',date,from:'Club Chairman',subject:`Welcome to ${club.name}`,body:`${manager.lastName ? `Mr ${manager.lastName}, ` : ''}the committee is pleased to confirm your appointment. The board expects you to ${expectation}`,read:false},
      {id:'squad',date,from:'Club Secretary',subject:'First-team register prepared',body:`The playing register has been assembled for your review. There are ${count || 'enough'} footballers currently available.`,read:false},
      {id:'league',date,from:`${competitionName} Office`,subject:`${year}/${String(year+1).slice(-2)} season arrangements`,body:`The new ${competitionName} season is preparing to begin. Review the squad, tactics and opening fixtures before your first match.`,read:false}
    ];
  }
  function create(manager,selectedClub,options={}){
    const seed=Number(options.seed)||hashSeed(`${manager.firstName}-${manager.lastName}-${selectedClub.id}-1888`);
    const r=rng(seed);
    const clubs=FLData.clubs.map(c=>({...c,players:makePlayers(c,r,1888),played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
    const club=clubs.find(c=>c.id===selectedClub.id) || clubs[0];
    const game={
      version:'0.24.4',
      meta:{created:new Date().toISOString(),lastSaved:null,seed,preselectedClubId:options.preselectedClubId||null},
      date:'1888-08-15',
      manager:{...manager,appointedDate:'1888-08-15'},
      controlledClubId:club.id,
      clubs,
      freeAgents: makePlayers({id:'free-agent',strength:2},r,1888).slice(0,28).map((p,i)=>({...p,id:`free-agent-p${i+1}`,clubId:null,wage:0,contractEnd:null,squadStatus:'Free Agent'})),
      fixtures:[],
      inbox:openingInbox(manager,club,'1888-08-15','Football League'),
      history:[],seasonArchive:[],hallOfFame:[],managerArchive:[],
      news:[{date:'1888-08-15',headline:'Twelve clubs prepare for a new national competition'}],
      finances:{balance:club.finance,income:0,expenses:0,transferBudget:0,weeklyWageBudget:0},
      boardConfidence:65,
      selectedTab:'home'
    };
    ensureClubManagers(game);
    if(window.FLTimeline){FLTimeline.ensure(game);game.worldState.seasonCompetition=FLTimeline.seasonContext(game,1888);}
    if(window.FLClubTrajectory)FLClubTrajectory.ensure(game,1888);
    if(window.FLWorldFootball)FLWorldFootball.ensure(game,{backfill:false});
    if(window.FLPyramid)FLPyramid.ensure(game,1888);
    if(window.FLLivingWorld)FLLivingWorld.ensure(game);
    if(window.FLEconomy){FLEconomy.ensure(game);FLEconomy.ensureClubFinances(game,club);}
    if(window.FLManagerContracts)FLManagerContracts.startAppointment(game,club,{startDate:game.manager.appointedDate||game.date});
    if(window.FLLegacySystems)FLLegacySystems.ensure(game);
    if(window.FLPeople)FLPeople.ensure(game);
    if(window.FLEraIdentity)FLEraIdentity.refreshAll(game,1888);
    if(window.FLConversations)FLConversations.ensure(game);
    if(window.FLPersonalLife)FLPersonalLife.ensure(game);
    if(window.FLTransferMarket)FLTransferMarket.ensure(game);
    if(window.FLDressingRoom)FLDressingRoom.ensure(game);
    if(window.FLCareerSystems)FLCareerSystems.ensure(game);
    game.fixtures=makePyramidSchedule(game,1888);
    if(window.FLEnglishCup)FLEnglishCup.newSeason(game,1888);
    if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,1888);
    ensureClubManagers(game);
    return game;
  }
  function club(game,id){ return (game.clubs||[]).find(c=>c.id===id)||(game.competitionClubs||[]).find(c=>c.id===id)||null; }
  function controlledClub(game){ return club(game,game.controlledClubId); }
  function fixtureOn(game,date,clubId=game.controlledClubId){ return game.fixtures.find(f=>f.date===date && (f.home===clubId||f.away===clubId)); }
  function nextFixture(game,clubId=game.controlledClubId){ return game.fixtures.find(f=>!f.played&&(f.home===clubId||f.away===clubId)); }
  function applyLightweightTeamStats(game,team,goals,conceded,r){
    const eligible=(team.players||[]).filter(p=>p.status!=='retired'&&p.status!=='deceased'&&p.available!==false),keeper=[...eligible].filter(p=>p.position==='GK').sort((a,b)=>(b.ability||50)-(a.ability||50))[0]||eligible[0];
    const outfield=eligible.filter(p=>p!==keeper).map(p=>({p,score:Number(p.ability||50)+(r()-.5)*16+(Number(p.condition||90)-90)*.08})).sort((a,b)=>b.score-a.score).map(x=>x.p),starters=[keeper,...outfield.slice(0,10)].filter(Boolean),remaining=eligible.filter(p=>!starters.includes(p)).sort((a,b)=>(b.ability||50)-(a.ability||50));
    const allowed=Math.max(0,Number(window.FLTimeline?.currentRules?.(game)?.substitutionsAllowed||0)),subCount=Math.min(remaining.length,allowed,allowed>0?2+Math.floor(r()*Math.min(3,allowed)):0),subs=remaining.slice(0,Math.max(0,subCount));
    const exits=new Map();subs.forEach((sub,i)=>{const candidates=starters.filter(p=>p.position!=='GK'&&!exits.has(p.id)),out=candidates[Math.floor(r()*Math.max(1,candidates.length))];if(out)exits.set(out.id,58+Math.floor(r()*Math.max(8,25-i*3)))});
    const register=(p,minutes,start)=>{p.appearances=(p.appearances||0)+1;p.starts=(p.starts||0)+(start?1:0);p.subApps=(p.subApps||0)+(start?0:1);p.minutes=(p.minutes||0)+minutes;p.careerTotals=p.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};p.careerTotals.appearances=(p.careerTotals.appearances||0)+1;const base=6.15+((p.ability||50)-50)*.012+(goals-conceded)*.08+(r()-.5)*.7;p._ratingTotal=(p._ratingTotal||0)+base;p.averageRating=(p._ratingTotal/p.appearances).toFixed(2)};
    starters.forEach(p=>register(p,exits.get(p.id)||90,true));subs.forEach((p,i)=>{const minute=[...exits.values()][i]||70;register(p,Math.max(1,90-minute),false)});
    const participants=[...starters,...subs],attackers=participants.filter(p=>['CF','IF','W'].includes(p.position)),scorers=attackers.length?attackers:participants;
    for(let i=0;i<goals;i++){const scorer=weightedPlayer(scorers,r,true);if(!scorer)continue;scorer.goals=(scorer.goals||0)+1;scorer.careerTotals.goals=(scorer.careerTotals.goals||0)+1;const pool=participants.filter(p=>p.id!==scorer.id&&p.position!=='GK');if(pool.length&&r()<.7){const assist=pick(pool,r);assist.assists=(assist.assists||0)+1;assist.careerTotals.assists=(assist.careerTotals.assists||0)+1}}
    if(keeper){keeper.conceded=(keeper.conceded||0)+conceded;if(conceded===0){keeper.cleanSheets=(keeper.cleanSheets||0)+1;keeper.careerTotals.cleanSheets=(keeper.careerTotals.cleanSheets||0)+1}}
  }
  function simulateFixture(game,f){
    const r=rng(game.meta.seed + f.round*997 + Number(f.id.replace(/\D/g,'')));
    const home=club(game,f.home), away=club(game,f.away);
    const goalCount=(attack,defence,homeBonus)=>{
      const attackPower=window.FLClubTrajectory?FLClubTrajectory.effectivePower(attack):Number(attack.powerRating||attack.clubRating||34+Number(attack.strength||3)*8),defencePower=window.FLClubTrajectory?FLClubTrajectory.effectivePower(defence):Number(defence.powerRating||defence.clubRating||34+Number(defence.strength||3)*8);
      const chance=clamp(.55+(attackPower-defencePower)*.009+homeBonus,.22,.9);
      let goals=0;for(let i=0;i<5;i++)if(r()<chance*.42)goals++;return Math.min(goals,6);
    };
    f.homeGoals=goalCount(home,away,.08); f.awayGoals=goalCount(away,home,0); f.played=true;
    const leagueMatch=f.competitionId!=='english-cup'&&Number(f.tier)!==0;
    if(leagueMatch){
      home.played++; away.played++; home.gf+=f.homeGoals;home.ga+=f.awayGoals;away.gf+=f.awayGoals;away.ga+=f.homeGoals;
      const pointsForWin=window.FLTimeline?FLTimeline.currentRules(game).pointsForWin:2;
      if(f.homeGoals>f.awayGoals){home.won++;away.lost++;home.points+=pointsForWin;}
      else if(f.homeGoals<f.awayGoals){away.won++;home.lost++;away.points+=pointsForWin;}
      else {home.drawn++;away.drawn++;home.points++;away.points++;}
    }
    const result=`${home.name} ${f.homeGoals}–${f.awayGoals} ${away.name}`;
    const humanControlled=!game.meta?.headless&&(f.home===game.controlledClubId||f.away===game.controlledClubId);if(humanControlled)game.history.push({date:f.date,type:'result',text:result});
    if(!f.playerStatsApplied){
      const controlled=humanControlled;
      if(!controlled){applyLightweightTeamStats(game,home,f.homeGoals,f.awayGoals,r);applyLightweightTeamStats(game,away,f.awayGoals,f.homeGoals,r);f.playerStatsApplied=true;}
      else{
        const hp=teamProfile(game,home,true),ap=teamProfile(game,away,false),events=[];
        const addGoals=(side,count,profile)=>{for(let i=0;i<count;i++){const scorer=weightedPlayer(profile.starters,r,true),assistPool=profile.starters.filter(p=>p.id!==scorer.id&&p.position!=='GK'),assist=r()<.72&&assistPool.length?pick(assistPool,r):null;events.push({clock:10+r()*79,minute:10+Math.floor(r()*80),type:'goal',side,playerId:scorer.id,player:scorer.name,assistId:assist?.id||null,assist:assist?.name||null})}};
        addGoals('home',f.homeGoals,hp);addGoals('away',f.awayGoals,ap);const quickRecord={id:`sim-${f.id}-${f.date}`,engineVersion:'2.1',fixtureId:f.id,date:f.date,competition:f.competition||(window.FLTimeline?FLTimeline.activeCompetitionName(game):'Football League'),homeId:home.id,awayId:away.id,homeName:home.name,awayName:away.name,homeGoals:f.homeGoals,awayGoals:f.awayGoals,events,frames:[],teamProfiles:{home:hp,away:ap},substitutions:[]};finalizeMatchStats(game,quickRecord);f.playerStatsApplied=true;
      }
    }
    if(humanControlled){
      const ours=f.home===game.controlledClubId?f.homeGoals:f.awayGoals;
      const theirs=f.home===game.controlledClubId?f.awayGoals:f.homeGoals;
      game.boardConfidence=Math.max(0,Math.min(100,game.boardConfidence+(ours>theirs?3:ours===theirs?0:-2)));
      game.inbox.unshift({id:`result-${f.id}`,date:f.date,from:'Club Secretary',subject:'Match report',body:result,read:false});
    }
    if(f.competitionId==='english-cup'&&!game.meta?.deferCupProgress&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(Number(f.tier)===0&&!game.meta?.deferCupProgress&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
  }
  function developmentEnvironment(player,club){
    const pp=player.personalityProfile||{};
    const minutesFactor=Math.min(1,(player.minutes||0)/2200);
    const academy=Number(club.youthGenerationQuality||50),stature=Number(club.stature||50);
    const clubFactor=clamp(((club.strength||3)/5)*.66+(academy/70)*.24+(stature/80)*.10,.4,1.35);
    const personalityFactor=((pp.professionalism||50)+(pp.determination||50)+(pp.ambition||50))/300;
    const injuryPenalty=(pp.injuryProneness||40)/180;
    return clamp((minutesFactor*.35)+(clubFactor*.2)+(personalityFactor*.55)-injuryPenalty,.05,1.15);
  }
  function ensureClubManagers(game){
    const firstNames=FLData.firstNames||['Arthur'],lastNames=FLData.lastNames||['Smith'],year=Number(String(game.date||'1888').slice(0,4))||1888;
    game.clubs.forEach((team,index)=>{
      const isControlled=team.id===game.controlledClubId&&!game.meta?.headless,saved=team.managerProfile||{},age=Number(saved.age)||34+((index*7)%27);
      const profile=isControlled?{
        ...saved,id:saved.id||'manager-user',firstName:game.manager?.firstName||saved.firstName||'Club',lastName:game.manager?.lastName||saved.lastName||'Manager',age:Number(game.manager?.age)||age,
        nationality:game.manager?.nationality||saved.nationality||'English',birthplace:game.manager?.birthplace||saved.birthplace||team.location||'England',gender:game.manager?.gender||saved.gender||'male',appearanceIndex:Number(game.manager?.appearanceIndex||saved.appearanceIndex)||((index*11)%24)+1,identitySeed:Number(game.manager?.identitySeed||saved.identitySeed)||undefined,
        style:game.manager?.style||game.manager?.managementStyle||saved.style||'Balanced',temperament:game.manager?.temperament||saved.temperament||'Measured',reputation:game.manager?.reputation||saved.reputation||'Local',clubId:team.id,user:true,portraitRole:'manager'
      }:{
        ...saved,id:saved.id||`manager-${team.id}`,firstName:saved.firstName||firstNames[(index*5+3)%firstNames.length],lastName:saved.lastName||lastNames[(index*7+2)%lastNames.length],age,
        nationality:saved.nationality||'English',birthplace:saved.birthplace||team.location||'England',gender:saved.gender||'male',birthYear:Number(saved.birthYear)||year-age,appearanceIndex:((index%24)+1),identitySeed:Number(saved.identitySeed)||undefined,
        style:saved.style||['Direct','Balanced','Possession','Counter-attacking','Defensive'][index%5],temperament:saved.temperament||['Calm','Demanding','Measured','Volatile'][index%4],reputation:saved.reputation||'Regional',clubId:team.id,user:false,portraitRole:'manager'
      };
      if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,year);else profile.portrait=profile.portrait||'assets/player-faces/no-face.svg';
      team.managerProfile=profile;
      if(!Array.isArray(team.managerHistory)||!team.managerHistory.length)team.managerHistory=[{managerId:profile.id,name:`${profile.firstName} ${profile.lastName}`,from:String(Math.max(Number(String(team.founded||1888).slice(0,4))||1888,year)),to:'Present',role:'Manager'}];
      team.honours=Array.isArray(team.honours)?team.honours:[];team.seasonHistory=Array.isArray(team.seasonHistory)?team.seasonHistory:[];
    });
  }
  function endingSeasonLabel(date){const year=Number(String(date||'1889').slice(0,4))||1889;return `${year-1}-${String(year).slice(2)}`;}
  function honourKey(h){return `${typeof h==='string'?h:(h?.name||'Honour')}-${typeof h==='string'?'':(h?.season||'')}`;}
  function addHonour(list,honour){
    if(!Array.isArray(list))return;
    const key=honourKey(honour);if(!list.some(h=>honourKey(h)===key))list.push(honour);
  }
  function seasonPlayerSnapshot(player,team){
    return {id:player.id,name:player.name,clubId:team.id,club:team.name,position:player.position,age:player.age,face:player.face||'',ability:Number(player.ability)||0,
      apps:Number(player.appearances)||0,starts:Number(player.starts)||0,subApps:Number(player.subApps)||0,minutes:Number(player.minutes)||0,goals:Number(player.goals)||0,
      assists:Number(player.assists)||0,yellowCards:Number(player.yellowCards)||0,redCards:Number(player.redCards)||0,cleanSheets:Number(player.cleanSheets)||0,
      rating:player.averageRating||'—',playerOfMatch:Number(player.playerOfMatch)||0};
  }
  function chooseSeasonAwards(players,champion,game){
    const by=(pool,key,filter=()=>true)=>[...pool].filter(filter).sort((a,b)=>(Number(b[key])||0)-(Number(a[key])||0)||Number(b.goals||0)-Number(a.goals||0)||a.name.localeCompare(b.name))[0]||null;
    const rated=pool=>[...pool].filter(p=>Number.isFinite(Number(p.rating))&&p.apps>0).sort((a,b)=>Number(b.rating)-Number(a.rating)||b.goals-a.goals||b.assists-a.assists);
    const playerOfSeason=rated(players)[0]||by(players,'goals'),goldenBoot=by(players,'goals'),playmaker=by(players,'assists'),goldenGlove=by(players,'cleanSheets',p=>p.position==='GK');
    const youngPool=players.filter(p=>(Number(p.age)||99)<=21&&p.apps>0),youngPlayer=rated(youngPool)[0]||by(youngPool,'goals'),seasonYear=Number(String(game?.date||'1889').slice(0,4))-1,awards=[];
    const add=row=>{if(row?.winner&&row.winner!=='No winner'&&!awards.some(x=>x.name===row.name&&x.playerId===row.playerId))awards.push(row)};
    if(seasonYear>=1947)add({name:'Footballer of the Year',winner:playerOfSeason?.name||'No winner',playerId:playerOfSeason?.id||null,detail:playerOfSeason&&Number.isFinite(Number(playerOfSeason.rating))?`${playerOfSeason.rating} average rating`:`${playerOfSeason?.goals||0} goals`});
    if(seasonYear>=1974)add({name:'Young Player of the Year',winner:youngPlayer?.name||'No eligible winner',playerId:youngPlayer?.id||null,detail:youngPlayer?`Age ${youngPlayer.age} · ${youngPlayer.goals} goals · ${youngPlayer.assists} assists`:'No eligible player recorded'});
    add({name:seasonYear>=1968?'Golden Boot':'League Leading Goalscorer',winner:goldenBoot?.name||'No winner',playerId:goldenBoot?.id||null,detail:`${goldenBoot?.goals||0} goals`});
    if(seasonYear>=1992)add({name:'Playmaker Award',winner:playmaker?.name||'No winner',playerId:playmaker?.id||null,detail:`${playmaker?.assists||0} assists`});
    if(seasonYear>=1950)add({name:seasonYear>=1992?'Golden Glove':'Goalkeeper Honour',winner:goldenGlove?.name||'No winner',playerId:goldenGlove?.id||null,detail:`${goldenGlove?.cleanSheets||0} clean sheets`});
    const divisions=window.FLPyramid?FLPyramid.divisionList(game):[];
    divisions.forEach(division=>{const clubIds=new Set((game.clubs||[]).filter(c=>c.divisionId===division.id).map(c=>c.id)),pool=players.filter(p=>clubIds.has(p.clubId)&&p.apps>0);if(!pool.length)return;const best=rated(pool)[0]||by(pool,'goals'),scorer=by(pool,'goals');add({name:seasonYear>=1947?`${division.name} Player of the Season`:`${division.name} Outstanding Player`,winner:best?.name||'No winner',playerId:best?.id||null,divisionId:division.id,detail:Number.isFinite(Number(best?.rating))?`${best.rating} average rating`:`${best?.goals||0} goals`});add({name:`${division.name} Leading Goalscorer`,winner:scorer?.name||'No winner',playerId:scorer?.id||null,divisionId:division.id,detail:`${scorer?.goals||0} goals`})});
    if(seasonYear>=1950&&champion?.managerProfile)awards.push({name:'Manager of the Year',winner:`${champion.managerProfile.firstName} ${champion.managerProfile.lastName}`,managerId:champion.managerProfile.id,detail:`Champions with ${champion.name}`});
    return awards;
  }
  function seasonTeamOfTheYear(players){
    const rating=p=>Number.isFinite(Number(p.rating))?Number(p.rating):5.5+(p.goals*.08)+(p.assists*.05)+(p.apps*.005);
    const selected=[],take=(pool,count)=>{[...pool].sort((a,b)=>rating(b)-rating(a)||b.goals-a.goals).slice(0,count).forEach(p=>{if(!selected.some(x=>x.id===p.id))selected.push(p);});};
    take(players.filter(p=>p.position==='GK'),1);take(players.filter(p=>['FB','HB'].includes(p.position)),3);take(players.filter(p=>['HB','IF','W'].includes(p.position)),4);take(players.filter(p=>['CF','IF','W'].includes(p.position)),3);take(players,11-selected.length);
    return selected.slice(0,11);
  }
  function seasonManagerRows(game,fixtures,label){
    return game.clubs.filter(team=>team.leagueActive!==false).map(team=>{
      let won=0,drawn=0,lost=0,gf=0,ga=0;const rows=(fixtures||[]).filter(f=>f.homeId===team.id||f.awayId===team.id);
      rows.forEach(f=>{const ours=f.homeId===team.id?Number(f.homeGoals)||0:Number(f.awayGoals)||0,theirs=f.homeId===team.id?Number(f.awayGoals)||0:Number(f.homeGoals)||0;gf+=ours;ga+=theirs;if(ours>theirs)won++;else if(ours===theirs)drawn++;else lost++;});
      // Headless history does not retain every fixture. Team aggregates are the
      // authoritative season record in that mode, so managers no longer open
      // their history page with 0 matches and 0 wins.
      if(!rows.length){won=Number(team.won)||0;drawn=Number(team.drawn)||0;lost=Number(team.lost)||0;gf=Number(team.gf)||0;ga=Number(team.ga)||0}
      const m=team.managerProfile||{};return {season:label,id:m.id,managerId:m.id,name:`${m.firstName||'Club'} ${m.lastName||'Manager'}`,clubId:team.id,club:team.name,played:won+drawn+lost,won,drawn,lost,gf,ga};
    });
  }
  function archiveSeason(game){
    if(!game.fixtures.some(f=>f.played))return null;
    // Background divisions do not create thousands of individual fixtures.
    // Generate their complete aggregate tables here, after the played season
    // and before honours, managers and movement are archived. Previously these
    // totals were generated at season setup and immediately wiped back to zero.
    const endingYear=Number(String(game.date||'1889').slice(0,4))||1889;if(window.FLPyramid)FLPyramid.simulateLightweightSeason(game,endingYear-1);
    ensureClubManagers(game);game.seasonArchive=Array.isArray(game.seasonArchive)?game.seasonArchive:[];const headless=Boolean(game.meta?.headless);
    const label=endingSeasonLabel(game.date);if(game.seasonArchive.some(s=>s.season===label))return game.seasonArchive.find(s=>s.season===label);
    const pyramidTables=window.FLPyramid?FLPyramid.allTables(game):[{division:{id:'football-league',name:'Football League',tier:1},table:table(game)}];
    const controlledDivision=window.FLPyramid?FLPyramid.divisionForClub(game,game.controlledClubId):pyramidTables[0]?.division;
    const selectedTable=(pyramidTables.find(x=>x.division.id===controlledDivision?.id)||pyramidTables[0]);
    const toRows=block=>block.table.map((team,index)=>{const base={position:index+1,id:team.id,name:team.name,played:Number(team.played)||0,won:Number(team.won)||0,drawn:Number(team.drawn)||0,lost:Number(team.lost)||0,gf:Number(team.gf)||0,ga:Number(team.ga)||0,points:Number(team.points)||0,divisionId:block.division.id,division:block.division.name,tier:block.division.tier};return headless?base:{...base,stature:+Number(team.stature||0).toFixed(2),momentum:+Number(team.momentum||0).toFixed(2),powerRating:+Number(team.powerRating||team.clubRating||0).toFixed(2),trajectory:team.currentTrajectory||'flat',cause:team.currentCause||''}});
    const pyramidRows=pyramidTables.map(block=>({division:{...block.division},table:toRows(block)})),standings=(pyramidRows.find(x=>x.division.id===controlledDivision?.id)||pyramidRows[0])?.table||[];
    const activeTeams=game.clubs.filter(c=>c.leagueActive!==false),allPlayers=activeTeams.flatMap(team=>(team.players||[]).map(player=>seasonPlayerSnapshot(player,team)));
    const controlledPlayers=headless?[]:allPlayers.filter(p=>p.clubId===game.controlledClubId),notable=[...allPlayers].sort((a,b)=>(Number(b.rating)||0)-(Number(a.rating)||0)||b.goals-a.goals||b.assists-a.assists||b.ability-a.ability).slice(0,headless?16:50),legendPlayers=allPlayers.filter(p=>p.legendArchetype);
    const compactMap=new Map([...controlledPlayers,...notable,...legendPlayers].map(p=>[p.id,p])),players=[...compactMap.values()];
    const allFixtures=headless?[]:game.fixtures.map(f=>({id:f.id,date:f.date,round:f.round,divisionId:f.divisionId,tier:f.tier,competition:f.competition,homeId:f.home,awayId:f.away,homeName:club(game,f.home)?.name||f.home,awayName:club(game,f.away)?.name||f.away,played:Boolean(f.played),homeGoals:f.homeGoals,awayGoals:f.awayGoals,matchRecordId:f.matchRecordId||null}));
    const fixtures=headless?[]:allFixtures.filter(f=>f.homeId===game.controlledClubId||f.awayId===game.controlledClubId);
    const competition=window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):(window.FLTimeline?FLTimeline.currentCompetition(game):{id:'football-league',name:'Football League',official:true}),official=competition.official!==false;
    const champions=pyramidRows.map(block=>({divisionId:block.division.id,division:block.division.name,tier:block.division.tier,clubId:block.table[0]?.id||null,club:block.table[0]?.name||'—'}));
    const topChampion=game.clubs.find(c=>c.id===champions.find(x=>x.tier===1)?.clubId)||null,controlledChampion=game.clubs.find(c=>c.id===standings[0]?.id)||null;
    const awards=chooseSeasonAwards(allPlayers,topChampion,game),teamOfSeason=seasonTeamOfTheYear(allPlayers);
    const topScorer=[...allPlayers].sort((a,b)=>b.goals-a.goals||a.name.localeCompare(b.name))[0]||null,topAssister=[...allPlayers].sort((a,b)=>b.assists-a.assists||a.name.localeCompare(b.name))[0]||null;
    const startYear=Number(label.slice(0,4))||1888,transfers=headless?[]:(game.worldUI?.transferHistory||[]).filter(t=>String(t.date||'')>=`${startYear}-07-01`&&String(t.date||'')<=`${startYear+1}-06-30`),allManagers=seasonManagerRows(game,allFixtures,label),managers=[...allManagers].sort((a,b)=>b.won-a.won||b.gf-a.gf).filter((m,i)=>i<12||m.clubId===game.controlledClubId||champions.some(ch=>ch.clubId===m.clubId));
    const trajectorySnapshot=headless?[]:activeTeams.map(team=>({clubId:team.id,club:team.name,stature:+Number(team.stature||0).toFixed(2),momentum:+Number(team.momentum||0).toFixed(2),powerRating:+Number(team.powerRating||team.clubRating||0).toFixed(2),financialPower:+Number(team.financialPower||0).toFixed(2),youthQuality:+Number(team.youthGenerationQuality||0).toFixed(2),managerQuality:+Number(team.managerQuality||0).toFixed(2),ceiling:+Number(team.clubCeiling||0).toFixed(2),trajectory:team.currentTrajectory||'flat',cause:team.currentCause||''}));
    const snapshot={season:label,live:false,official,competition:{...competition},champion:official?(controlledChampion?.name||'—'):'Unofficial wartime programme',championId:official?(controlledChampion?.id||null):null,champions:champions.map(x=>({...x,official})),wartimeWinners:official?[]:champions,table:standings,pyramidTables:pyramidRows,players,fixtures,topScorer,topAssister,awards,teamOfSeason,cups:window.FLEnglishCup?FLEnglishCup.seasonRecord(game,label):[],promoted:[],relegated:[],transfers,managers,trajectorySnapshot,archivedAt:game.date};
    game.seasonArchive.push(snapshot);
    activeTeams.forEach(team=>{const block=pyramidRows.find(x=>x.division.id===team.divisionId),row=block?.table.find(x=>x.id===team.id),entry={season:label,division:block?.division.name||'—',divisionId:block?.division.id||null,tier:block?.division.tier||team.tier||'—',position:row?.position||'—',played:row?.played||0,won:row?.won||0,drawn:row?.drawn||0,lost:row?.lost||0,gf:row?.gf||0,ga:row?.ga||0,points:row?.points||0};team.seasonHistory.push(entry)});
    champions.forEach(ch=>{const champion=game.clubs.find(c=>c.id===ch.clubId);if(!champion)return;const honour={name:ch.division,season:label,official};if(!official){champion.wartimeHonours=Array.isArray(champion.wartimeHonours)?champion.wartimeHonours:[];addHonour(champion.wartimeHonours,honour);return}addHonour(champion.honours,honour);champion.players.filter(p=>(p.appearances||0)>0).forEach(p=>{p.honours=Array.isArray(p.honours)?p.honours:[];addHonour(p.honours,honour)})});
    awards.forEach(a=>{if(!a.playerId)return;const found=game.clubs.flatMap(c=>c.players).find(p=>p.id===a.playerId);if(found){found.honours=Array.isArray(found.honours)?found.honours:[];addHonour(found.honours,{name:a.name,season:label,personal:true})}});
    teamOfSeason.forEach(row=>{const found=game.clubs.flatMap(c=>c.players).find(p=>p.id===row.id);if(found){found.honours=Array.isArray(found.honours)?found.honours:[];addHonour(found.honours,{name:'Team of the Season',season:label,personal:true})}});
    if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordSeason(game,snapshot,allManagers);
    const headline=!official?(topChampion?`${topChampion.name} top a wartime regional programme`:`The ${label} wartime programme concludes`):(topChampion?`${topChampion.name} win the top-flight championship`:`The ${label} season concludes`);game.history=Array.isArray(game.history)?game.history:[];game.history.push({date:game.date,type:official?'season':'wartime-season',title:headline,text:official?`The ${label} English league season across ${pyramidRows.length} division${pyramidRows.length===1?'':'s'} has been stored in the permanent history archive.`:`The ${label} wartime regional results have been stored separately from official league championships. Promotion and relegation remained suspended.`});game.news=Array.isArray(game.news)?game.news:[];game.news.unshift({date:game.date,headline});
    // Keep long careers viable in browser storage by retaining complete controlled-club data plus the season's leading and legendary players.
    if(game.seasonArchive.length>155)game.seasonArchive=game.seasonArchive.slice(-155);
    // Older seasons retain permanent tables, champions, awards and movement while bulky match/player detail stays available for the latest 25 campaigns.
    game.seasonArchive.slice(0,-25).forEach(old=>{if(old.compact)return;old.compact=true;old.fixtures=[];old.players=(old.players||[]).filter(p=>p.clubId===game.controlledClubId||p.playerId===old.topScorer?.id).slice(0,22);old.managers=(old.managers||[]).filter(m=>m.clubId===game.controlledClubId||m.clubId===old.champions?.find(c=>c.tier===1)?.clubId).slice(0,4);old.transfers=[];old.teamOfSeason=(old.teamOfSeason||[]).slice(0,11)});
    return snapshot;
  }
  function startNewSeason(game,startYear){
    game.clubs.forEach(team=>{team.played=0;team.won=0;team.drawn=0;team.lost=0;team.gf=0;team.ga=0;team.points=0;team.formRating=50});
    const context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{id:'football-league',name:'Football League',official:true,rounds:2,startMonthDay:'09-08'};
    if(window.FLTimeline){FLTimeline.ensure(game);game.worldState.seasonCompetition={...context};FLTimeline.consumeScheduleRebuild(game)}
    if(window.FLPyramid&&Number(game.pyramid?.seasonYear)!==Number(startYear))FLPyramid.ensure(game,startYear);
    game.fixtures=makePyramidSchedule(game,startYear);if(window.FLEnglishCup)FLEnglishCup.newSeason(game,startYear);if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,startYear);game.postMatchComplete=false;game.activeMatchId=null;
    if(game.matchUI){game.matchUI.playing=false;game.matchUI.recordId=null;game.matchUI.minute=0;game.matchUI.clockStep=0;game.matchUI.phase='complete';game.matchUI.pitchPositions={};game.matchUI.pitchVelocities={}}
    const competition=window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):context,id=`new-season-${startYear}`;
    if(!game.inbox.some(x=>x.id===id))game.inbox.unshift({id,date:game.date,from:context.official?'Football League Office':'Wartime Football Committee',subject:`Fixtures issued for ${startYear}-${String(startYear+1).slice(2)}`,body:`The new ${competition.name} fixture list has been issued. ${context.official?'Promotion, relegation and every division will be recorded in the permanent archive.':'These regional wartime fixtures are recorded separately from the official championship.'}`,read:false});
    if(window.FLLivingWorld)FLLivingWorld.ensure(game);
    game.version=game.meta?.grassroots?'0.28.1-phase-2':'0.27.5.1';
  }

  function rebuildCurrentSchedule(game,reason){
    const startYear=Number(game.date.slice(0,4))||1888,context=window.FLTimeline?FLTimeline.seasonContext(game,startYear):{name:'Football League',official:true,rounds:2};
    const played=(game.fixtures||[]).filter(f=>f.played),unplayed=(game.fixtures||[]).filter(f=>!f.played);game.abandonedSeasons=Array.isArray(game.abandonedSeasons)?game.abandonedSeasons:[];
    if(played.length)game.abandonedSeasons.push({date:game.date,reason,competition:game.worldState?.seasonCompetition?.name||'Football League',fixtures:played.map(f=>({...f})),tables:window.FLPyramid?FLPyramid.allTables(game).map(x=>({division:x.division,table:x.table.map(c=>({id:c.id,name:c.name,played:c.played,won:c.won,drawn:c.drawn,lost:c.lost,gf:c.gf,ga:c.ga,points:c.points}))})):[]});
    unplayed.forEach(f=>f.abandoned=true);game.abandonedFixtures=Array.isArray(game.abandonedFixtures)?game.abandonedFixtures:[];game.abandonedFixtures.push(...unplayed.map(f=>({...f})));
    game.clubs.forEach(team=>{team.played=0;team.won=0;team.drawn=0;team.lost=0;team.gf=0;team.ga=0;team.points=0});if(window.FLTimeline)game.worldState.seasonCompetition={...context};
    const d=new Date(`${game.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+14);const startDate=iso(d);game.fixtures=makePyramidSchedule(game,startYear,{startDate}).filter(f=>f.date>game.date);if(window.FLEnglishCup&&FLEnglishCup.active(game))FLEnglishCup.newSeason(game,startYear);
    if(window.FLTimeline)FLTimeline.consumeScheduleRebuild(game);game.history.push({id:`schedule-rebuild-${game.date}`,date:game.date,type:'world',title:`${context.name} programme issued`,text:`The previous fixture programme was abandoned and replaced following ${reason||'a major football-wide event'}.`});
  }

  function annualPlayerDevelopment(game){
    const developmentYear=Number(String(game.date||'1889').slice(0,4))||1889;
    game.clubs.forEach(club=>(club.players||[]).forEach(player=>{
      const pr=rng(hashSeed(`${game.meta?.seed||1}-${player.id}-${developmentYear}-development`));
      const env=developmentEnvironment(player,club), curve=player.developmentCurve||'steady';
      const age=player.age||20, endingAbility=Number(player.ability)||40, division=window.FLPyramid?.divisionForClub(game,club.id)||null;
      const leagueCap=window.FLFootballBalance?FLFootballBalance.capForPlayer(game,club,player):(player.legendArchetype?99:94);
      const ceiling=Math.min(Number(player.ceiling||player.potential||endingAbility),leagueCap);
      let ageWindow=age<20?1.25:age<24?1:age<28?.62:age<31?.28:-.25;
      if(curve==='early') ageWindow+=age<22?.35:age>27?-.3:0;
      if(curve==='late') ageWindow+=age<23?-.35:age<30?.45:0;
      if(curve==='volatile') ageWindow+=(pr()-.5)*.8;
      const gap=Math.max(0,ceiling-endingAbility);
      let change=Math.round((gap/14)*env*ageWindow);
      if(age>31){
        const recordProfile=player.careerRecordProfile||'standard',declineStart=recordProfile==='all-time'?37:recordProfile==='ironman'?35:recordProfile==='goal-machine'?34:31,declineDivisor=recordProfile==='all-time'?6:recordProfile==='ironman'?5:recordProfile==='goal-machine'?4:3;
        change=age<=declineStart?Math.max(0,change):-Math.max(0,Math.round((age-declineStart)/declineDivisor));
      }
      if((player.personalityProfile?.injuryProneness||0)>72 && pr()<.25) change-=1+Math.floor(pr()*2);
      if(window.FLLivingWorld){const development=FLLivingWorld.developmentYear(game,player,club,change);change=development.change;}
      player.ability=clamp(endingAbility+change,24,leagueCap);
      const surprise=(player.personalityProfile?.determination||50)>82 && age>=23 && age<=29 && pr()<.08 && player.ability<leagueCap-2;
      if(surprise) player.ceiling=clamp(Number(player.ceiling||player.ability)+1+Math.floor(pr()*2),player.ability,leagueCap);
      const talentCap=Math.min(Number(player.talentCap||player.ceiling||leagueCap),leagueCap);
      player.ceiling=clamp(Math.min(talentCap,Number(player.ceiling||talentCap)),player.ability,leagueCap);
      player.potential=clamp(Math.round(player.ability+(player.ceiling-player.ability)*(.55+env*.25)),player.ability,leagueCap);
      player.age++;
      player.seasonHistory=player.seasonHistory||[];
      player.seasonHistory.push({season:`${Number(game.date.slice(0,4))-1}/${game.date.slice(2,4)}`,club:club.name,clubId:club.id,league:division?.name||'English football',division:division?.name||'English football',divisionId:division?.id||club.divisionId||null,tier:Number(division?.tier||club.tier)||null,apps:player.appearances||0,goals:player.goals||0,assists:player.assists||0,cleanSheets:player.cleanSheets||0,rating:player.averageRating||'—',ability:endingAbility});
      if(player.seasonHistory.length>50)player.seasonHistory=player.seasonHistory.slice(-50);
      if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,player,developmentYear);
      player.careerTotals=player.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};player.honours=(Array.isArray(player.honours)?player.honours:[]).filter(h=>{const match=String(typeof h==='string'?h:(h?.name||h?.title||'')).match(/^([\d,]+)\s+Career\s+(Appearances|Goals)$/i);if(!match)return true;const total=Number(match[1].replace(/,/g,'')),kind=match[2].toLowerCase();return kind==='appearances'?total===1000:total===500;});
      const milestoneSeason=`${developmentYear-1}-${String(developmentYear).slice(2)}`,awardMilestone=(name,threshold,value)=>{const key=name.replace(/,/g,'');if(value>=threshold&&!player.honours.some(h=>String(typeof h==='string'?h:(h?.name||'')).replace(/,/g,'')===key))player.honours.push({name,season:milestoneSeason,personal:true,milestone:true})};
      awardMilestone('1,000 Career Appearances',1000,Number(player.careerTotals.appearances)||0);awardMilestone('500 Career Goals',500,Number(player.careerTotals.goals)||0);
      player.appearances=0;player.starts=0;player.subApps=0;player.minutes=0;player.goals=0;player.assists=0;player.yellowCards=0;player.redCards=0;player.cleanSheets=0;player.conceded=0;player.playerOfMatch=0;player.averageRating='—';player._ratingTotal=0;
    }));
  }
  function advanceDay(game, options={}){
    if(window.FLTimeline)FLTimeline.ensure(game);if(window.FLEnglishCup)FLEnglishCup.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLClubTrajectory)FLClubTrajectory.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLWorldFootball)FLWorldFootball.ensure(game,{backfill:false});if(window.FLPyramid)FLPyramid.ensure(game,Number(game.date.slice(0,4))||1888);if(window.FLLivingWorld)FLLivingWorld.ensure(game);if(window.FLLegacySystems)FLLegacySystems.ensure(game);if(window.FLPeople)FLPeople.ensure(game);if(window.FLDressingRoom)FLDressingRoom.ensure(game);if(window.FLPersonalLife)FLPersonalLife.ensure(game);if(window.FLCareerSystems)FLCareerSystems.ensure(game);if(window.FLGrassroots)FLGrassroots.ensure(game);
    const existingDecision=(window.FLGrassroots?FLGrassroots.nextBlocking(game):null)||(window.FLLivingWorld?FLLivingWorld.nextBlocking(game):null);if(existingDecision){game.selectedTab=existingDecision.targetTab||'board';return {game,stopped:true,reason:'decision',decision:existingDecision}}
    if(window.FLLivingWorld&&FLLivingWorld.seasonExperience(game)){game.selectedTab='season';return {game,stopped:true,reason:'season'}}
    if(options.stopAtControlledMatch){const currentFixture=fixtureOn(game,game.date);if(currentFixture&&!currentFixture.played){if(window.FLGrassroots)FLGrassroots.prepareMatchday(game,currentFixture);return {game,stopped:true,reason:'match'}}}
    if(game.date.slice(5)==='06-30'&&!game.meta?.headless&&window.FLCareerSystems){const closeCheck=FLCareerSystems.canCloseSeason(game);if(!closeCheck.ok){game.selectedTab='competitions';return {game,stopped:true,reason:'season-incomplete',details:closeCheck}}}
    const previousDate=game.date,d=new Date(`${game.date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);game.date=iso(d);
    const monthDay=game.date.slice(5),startYear=Number(game.date.slice(0,4))||1889;let timelineResult={rebuildSchedule:false};
    if(monthDay==='07-01'){
      const endingYear=startYear-1;if(window.FLCareerSystems){const audit=FLCareerSystems.beforeSeasonEnd(game,endingYear);if(audit.blocked){game.date=previousDate;game.selectedTab='competitions';return {game,stopped:true,reason:'season-incomplete',details:audit}}}
      const archived=archiveSeason(game);
      const movement=window.FLPyramid?FLPyramid.finaliseSeason(game,endingYear):{promoted:[],relegated:[]};
      if(archived){archived.promoted=movement.promoted||[];archived.relegated=movement.relegated||[];if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordMovement(game,archived,movement)}
      annualPlayerDevelopment(game);
      if(window.FLHistoricalPlayerMobility)FLHistoricalPlayerMobility.annualUpdate(game,startYear);
      if(window.FLEconomy)FLEconomy.annualUpdate(game,startYear);
      if(window.FLManagerContracts)FLManagerContracts.annualUpdate(game,startYear,archived);
      if(window.FLTimeline){timelineResult=FLTimeline.processDate(game,previousDate,game.date);FLTimeline.annualUpdate(game,startYear)}
      if(window.FLWorldFootball){FLWorldFootball.processDate(game,previousDate,game.date);FLWorldFootball.annualUpdate(game,startYear)}
      if(window.FLHistoryIntegrity)FLHistoryIntegrity.inductHallOfFame(game,startYear);
      if(window.FLPyramid)FLPyramid.prepareSeason(game,startYear);if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});
      ensureClubManagers(game);startNewSeason(game,startYear);
      if(window.FLCareerSystems)FLCareerSystems.annualUpdate(game,startYear,archived);
      if(window.FLLivingWorld)FLLivingWorld.annualUpdate(game,startYear,archived);
      if(window.FLLegacySystems)FLLegacySystems.annualUpdate(game,startYear,archived);
      if(window.FLDressingRoom)FLDressingRoom.annualUpdate(game,startYear,archived);if(window.FLPersonalLife)FLPersonalLife.annualUpdate(game,startYear);if(window.FLGrassroots)FLGrassroots.annualUpdate(game,startYear,archived);
    }else{
      if(window.FLTimeline)timelineResult=FLTimeline.processDate(game,previousDate,game.date);if(window.FLWorldFootball)FLWorldFootball.processDate(game,previousDate,game.date);if(window.FLLivingWorld)FLLivingWorld.processDate(game,previousDate,game.date);if(window.FLLegacySystems)FLLegacySystems.processDate(game,previousDate,game.date);if(window.FLDressingRoom)FLDressingRoom.dailyTick(game,previousDate);if(window.FLTransferMarket&&!(window.FLGrassroots?.useLocalRecruitment?.(game)))FLTransferMarket.dailyTick(game,previousDate);if(window.FLCareerSystems)FLCareerSystems.dailyTick(game,previousDate);if(window.FLConversations)FLConversations.dailyTick(game,previousDate);if(timelineResult.rebuildSchedule)rebuildCurrentSchedule(game,timelineResult.reason);
    }
    if(window.FLGrassroots)FLGrassroots.dailyTick(game,previousDate);
    const controlledMatch=fixtureOn(game,game.date),controlledMatchPending=Boolean(options.stopAtControlledMatch&&controlledMatch&&!controlledMatch.played);if(controlledMatchPending&&window.FLGrassroots)FLGrassroots.prepareMatchday(game,controlledMatch);if(!controlledMatchPending)game.fixtures.filter(f=>f.date===game.date&&!f.played).forEach(f=>simulateFixture(game,f));if(!controlledMatchPending&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
    if(monthDay==='09-01'&&!game.inbox.some(x=>x.id===`season-nears-${startYear}`)){const comp=currentCompetition(game);game.inbox.unshift({id:`season-nears-${startYear}`,date:game.date,from:'Assistant',subject:'The season approaches',body:`The opening ${comp.name} match is now close. The squad is ready for selection.`,read:false,link:{tab:'match',label:'OPEN MATCH'}})}
    const controlled=controlledClub(game);if(controlled)controlled.players.forEach(p=>{if(p.status!=='deceased'&&p.status!=='retired')p.condition=Math.min(100,(p.condition||90)+1)});if(game.inbox.length>400)game.inbox=game.inbox.slice(0,400);if(game.news.length>600)game.news=game.news.slice(0,600);if(game.history.length>5000)game.history=game.history.slice(-5000);game.version=game.meta?.grassroots?'0.28.1-phase-2':'0.27.5.1';
    const decision=(window.FLGrassroots?FLGrassroots.nextBlocking(game):null)||(window.FLLivingWorld?FLLivingWorld.nextBlocking(game):null),season=window.FLLivingWorld?FLLivingWorld.seasonExperience(game):null;if(decision)game.selectedTab=decision.targetTab||'board';else if(season)game.selectedTab='season';
    return {game,stopped:Boolean(controlledMatchPending||decision||season),reason:controlledMatchPending?'match':decision?'decision':season?'season':null,decision,timeline:timelineResult};
  }


  function neutralManager(){return {firstName:'World',lastName:'Historian',age:45,nationality:'England',birthplace:'England',managementStyle:'Balanced',temperament:'Calm',occupation:'Club Secretary',reputation:'Regional',portrait:'assets/real-portraits/faces/rp-001-1.webp',appointedDate:'1888-08-15',user:false};}
  function createWorld(options={}){
    const targetYear=clamp(Number(options.startYear)||1888,1888,2026),worldSeed=Number(options.seed)||hashSeed(`${Date.now()}-${Math.random()}-${targetYear}`),founder=FLData.clubs[0];
    const game=create(neutralManager(),founder,{seed:worldSeed,preselectedClubId:options.selectedClubId||null});game.meta.worldSeed=worldSeed;game.meta.startYear=targetYear;game.meta.headless=true;game.meta.historyGenerated=false;game.inbox=[];game.selectedTab='home';
    // The neutral setup identity is only a loading placeholder. It must never
    // become a 100-year historical manager in the archive.
    const placeholder=game.clubs.find(c=>c.id===game.controlledClubId);if(placeholder){placeholder.managerProfile=null;placeholder.managerHistory=[]}ensureClubManagers(game);return game;
  }
  function compactHeadlessHistory(game){
    const selected=game.meta?.preselectedClubId,history=Array.isArray(game.history)?game.history:[];if(history.length>6000){const important=x=>['season','competition','disaster','war','club-admission','world','timeline'].includes(x.type)||x.category==='disaster'||x.clubId===selected;const fixed=history.filter(important),routine=history.filter(x=>!important(x)).slice(-Math.max(0,6000-fixed.length));game.history=[...fixed.slice(-4500),...routine].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).slice(-6000)}if(Array.isArray(game.news)&&game.news.length>1000)game.news=game.news.slice(0,1000);if(Array.isArray(game.retiredPlayers)&&game.retiredPlayers.length>1800){const selectedRows=game.retiredPlayers.filter(p=>p.lastClubId===selected||p.legendArchetype),others=game.retiredPlayers.filter(p=>p.lastClubId!==selected&&!p.legendArchetype).slice(-Math.max(0,1800-selectedRows.length));game.retiredPlayers=[...selectedRows,...others].slice(-1800)}
  }
  function clearHeadlessInterruptions(game){
    game.inbox=[];game.postMatchComplete=false;game.activeMatchId=null;if(game.livingWorld){game.livingWorld.decisions=[];game.livingWorld.seasonExperience=null;game.livingWorld.pendingSeasonExperience=null;}if(game.matchUI){game.matchUI.playing=false;game.matchUI.recordId=null;game.matchUI.minute=0;game.matchUI.clockStep=0;game.matchUI.phase='complete';game.matchUI.pitchPositions={};game.matchUI.pitchVelocities={}}
  }
  function simulateHeadlessSeason(game,seasonYear){
    const seasonEnd=`${seasonYear+1}-07-01`,previousBoundary=game.meta.fastForwardBoundary||game.date;
    // Process fixtures in sorted batches. Cup rounds and replays can append new
    // fixtures, so refresh once per newly-created batch rather than sorting the
    // whole season after every individual match.
    let batchGuard=0;
    while(batchGuard++<64){
      const batch=(game.fixtures||[]).filter(f=>!f.played&&!f.abandoned).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
      if(!batch.length)break;
      const containsCup=batch.some(f=>f.competitionId==='english-cup');game.meta.deferCupProgress=true;
      try{for(const next of batch){if(next.played||next.abandoned)continue;game.date=next.date;simulateFixture(game,next)}}finally{game.meta.deferCupProgress=false}
      if(containsCup&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
    }
    game.date=seasonEnd;if(window.FLCareerSystems)FLCareerSystems.beforeSeasonEnd(game,seasonYear);const archived=archiveSeason(game),movement=window.FLPyramid?FLPyramid.finaliseSeason(game,seasonYear):{promoted:[],relegated:[]};if(archived){archived.promoted=movement.promoted||[];archived.relegated=movement.relegated||[];if(window.FLHistoryIntegrity)FLHistoryIntegrity.recordMovement(game,archived,movement)}
    annualPlayerDevelopment(game);if(window.FLHistoricalPlayerMobility)FLHistoricalPlayerMobility.annualUpdate(game,seasonYear+1);if(window.FLEconomy)FLEconomy.annualUpdate(game,seasonYear+1);if(window.FLTimeline){FLTimeline.processDate(game,previousBoundary,game.date);FLTimeline.annualUpdate(game,seasonYear+1)}if(window.FLWorldFootball){FLWorldFootball.processDate(game,previousBoundary,game.date);FLWorldFootball.annualUpdate(game,seasonYear+1)}if(window.FLHistoryIntegrity)FLHistoryIntegrity.inductHallOfFame(game,seasonYear+1);if(window.FLPyramid)FLPyramid.prepareSeason(game,seasonYear+1);if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});ensureClubManagers(game);startNewSeason(game,seasonYear+1);if(window.FLCareerSystems)FLCareerSystems.annualUpdate(game,seasonYear+1,archived);if(window.FLLegacySystems)FLLegacySystems.annualUpdate(game,seasonYear+1,archived);compactHeadlessHistory(game);game.meta.fastForwardBoundary=game.date;clearHeadlessInterruptions(game);return archived;
  }
  async function fastForwardToYear(game,targetYear,onProgress){
    const finalYear=clamp(Number(targetYear)||1888,1888,2026),from=Number(String(game.date||'1888').slice(0,4))||1888,total=Math.max(0,finalYear-from),now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now(),started=now();game.meta.headless=true;
    for(let year=from;year<finalYear;year++){simulateHeadlessSeason(game,year);if(onProgress)onProgress({year:year+1,completed:year-from+1,total,percent:total?Math.round(((year-from+1)/total)*100):100});if((year-from+1)%4===0)await new Promise(resolve=>setTimeout(resolve,0))}
    if(finalYear===2026&&window.FLPyramid?.applyDatabaseSnapshot?.(game,finalYear)){game.fixtures=makePyramidSchedule(game,finalYear);if(window.FLEnglishCup)FLEnglishCup.newSeason(game,finalYear);if(window.FLCareerSystems)FLCareerSystems.startExtendedCups(game,finalYear);game.history=Array.isArray(game.history)?game.history:[];game.history.push({date:`${finalYear}-08-01`,type:'database-snapshot',title:'Modern club structure loaded',text:`The ${finalYear} start uses the approved club names, divisions, strength and prestige database.`})}
    // Historical starts are the result of the simulated tables. Never overwrite
    // the generated next-season placement with a real-world/prestige snapshot:
    // doing so could relegate a club after finishing third with no movement row.
    if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:false});
    if(window.FLHistoryIntegrity)FLHistoryIntegrity.migrate(game,{force:true});
    // A fresh historical start represents the people holding jobs in that year,
    // not the placeholder managers created in 1888. Rebase AI portrait dates so
    // a 1970s or modern career never opens with an entirely Victorian boardroom.
    (game.clubs||[]).forEach(club=>{const profile=club.managerProfile;if(!profile||profile.user)return;profile.faceAssignedYear=finalYear;delete profile.managerPortraitAsset;delete profile.portrait;if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,finalYear,{lockedYear:finalYear})});
    game.date=`${finalYear}-08-15`;game.meta.historyGenerated=true;game.meta.generatedToYear=finalYear;game.meta.fastForwardMs=Math.round(now()-started);delete game.meta.fastForwardBoundary;return game;
  }
  function attachManager(game,manager,clubRef){
    const id=typeof clubRef==='string'?clubRef:clubRef?.id;let team=club(game,id);if(!team){if(window.FLPyramid)FLPyramid.ensure(game,Number(String(game.date).slice(0,4)));team=club(game,id)}if(!team)team=(game.clubs||[]).find(c=>c.leagueActive)||(game.clubs||[])[0];if(window.FLPyramid)FLPyramid.hydrateClub(game,team,Number(String(game.date).slice(0,4)),'manager-appointment');if(window.FLFootballBalance){FLFootballBalance.calibrateClub(game,team,{force:true});FLFootballBalance.repairWorld(game,{force:false});}
    game.controlledClubId=team.id;game.meta.preselectedClubId=team.id;game.manager={...manager,appointedDate:game.date,user:true,portraitRole:'manager'};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,game.manager,Number(String(game.date).slice(0,4)));game.finances={balance:window.FLEconomy?FLEconomy.clubBudget(game,team):(Number(team.finance)||500),income:0,expenses:0,transferBudget:window.FLEconomy?FLEconomy.transferBudget(game,team):Math.max(25,Math.round((Number(team.finance)||500)*.3)),weeklyWageBudget:window.FLEconomy?FLEconomy.weeklyWageBudget(game,team):100};game.boardConfidence=65;if(window.FLManagerContracts)FLManagerContracts.startAppointment(game,team,{startDate:game.manager.appointedDate||game.date});const comp=window.FLPyramid?FLPyramid.competitionForClub(game,team.id):{name:'English football'};game.inbox=openingInbox(game.manager,team,game.date,comp?.name||'English football').map(x=>({...x,id:`${x.id}-${game.date}`}));if(comp?.official===false)game.inbox.unshift({id:`wartime-opening-${game.date}`,date:game.date,from:'Wartime Football Committee',subject:'Normal league football remains suspended',body:'This career begins during wartime. Clubs play temporary regional fixtures, service absences and guest registrations are active, and results are stored separately from official championships. Promotion and relegation are suspended.',read:false});game.selectedTab='home';game.meta.headless=false;game.meta.careerActive=true;game.meta.startYear=Number(String(game.date).slice(0,4));
    team.managerHistory=Array.isArray(team.managerHistory)?team.managerHistory:[];const outgoing=[...team.managerHistory].reverse().find(x=>x.to==='Present');if(outgoing){outgoing.to=game.date;outgoing.reason='Replaced by the player manager'}const outgoingProfile=team.managerProfile;if(outgoingProfile&&window.FLHistoryIntegrity){const archived=(game.managerArchive||[]).find(x=>x.id===outgoingProfile.id);if(archived){archived.currentClubId=null;const spell=(archived.clubs||[]).at(-1);if(spell?.to==='Present')spell.to=Number(String(game.date).slice(0,4))}}
    team.managerProfile={...game.manager,id:`manager-${team.id}-${game.date}`,firstName:manager.firstName,lastName:manager.lastName,age:Number(manager.age)||35,birthYear:Number(manager.birthYear)||game.meta.startYear-(Number(manager.age)||35),nationality:manager.nationality||'England',birthplace:manager.birthplace||team.location,style:manager.managementStyle||'Balanced',temperament:manager.temperament||'Calm',reputation:manager.reputation||'Unknown Local Coach',clubId:team.id,user:true,portraitRole:'manager'};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,team.managerProfile,game.meta.startYear);team.managerHistory.push({managerId:team.managerProfile.id,name:`${manager.firstName} ${manager.lastName}`,from:game.date,to:'Present',role:'Manager',age:team.managerProfile.age,birthYear:team.managerProfile.birthYear});
    if(window.FLDressingRoom){delete game.dressingRoom;FLDressingRoom.ensure(game)}if(window.FLLegacySystems){const generatedGlobalDisasters=game.legacySystems?.globalDisasters?JSON.parse(JSON.stringify(game.legacySystems.globalDisasters)):null,validatedThrough=game.legacySystems?.continuity?.validatedThrough;delete game.legacySystems;FLLegacySystems.ensure(game);if(generatedGlobalDisasters)game.legacySystems.globalDisasters=generatedGlobalDisasters;if(Number.isFinite(Number(validatedThrough)))game.legacySystems.continuity.validatedThrough=Number(validatedThrough)}if(window.FLLivingWorld){FLLivingWorld.ensure(game);game.livingWorld.decisions=[];game.livingWorld.seasonExperience=null;FLLivingWorld.ensureHistoricalWarStart?.(game)}
    if(window.FLPyramid){FLPyramid.ensure(game,game.meta.startYear);const d=FLPyramid.divisionForClub(game,team.id);game.fixtures=(game.fixtures||[]).filter(f=>f.played||Number(f.tier)<=FLPyramid.config.FULL_DETAIL_MAX_TIER||f.divisionId===d?.id);if(d&&!(game.fixtures||[]).some(f=>!f.played&&f.divisionId===d.id)){const extra=makeSchedule(FLPyramid.clubsInDivision(game,d.id),game.meta.startYear,{id:d.id,divisionId:d.id,tier:d.tier,name:d.name,idPrefix:`${game.meta.startYear}-${d.id}-managed`,startDate:`${game.meta.startYear}-09-01`,rounds:comp?.official===false?1:2});game.fixtures.push(...extra);game.fixtures.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))}}
    if(window.FLEconomy)FLEconomy.migrate(game);if(window.FLHistoryIntegrity)FLHistoryIntegrity.migrate(game);if(window.FLManagerContracts)FLManagerContracts.ensure(game);if(window.FLPeople)FLPeople.ensure(game);if(window.FLEraIdentity)FLEraIdentity.refreshAll(game);if(window.FLConversations)FLConversations.ensure(game);if(window.FLPersonalLife)FLPersonalLife.ensure(game);if(window.FLCareerSystems)FLCareerSystems.ensure(game);game.version='0.27.5.1';return game;
  }
  async function createStartYear(manager,selectedClub,startYear,onProgress){const selectedId=typeof selectedClub==='string'?selectedClub:selectedClub?.id;const world=createWorld({startYear,selectedClubId:selectedId});await fastForwardToYear(world,startYear,onProgress);return attachManager(world,manager,selectedClub)}
  function clubHistorySummary(game,clubId){
    const team=club(game,clubId);if(!team)return {headline:'Club history unavailable',lines:[]};const seasons=Array.isArray(team.seasonHistory)?team.seasonHistory:[],honours=Array.isArray(team.honours)?team.honours:[],best=[...seasons].filter(s=>Number.isFinite(Number(s.position))).sort((a,b)=>Number(a.tier)-Number(b.tier)||Number(a.position)-Number(b.position))[0],recent=seasons.slice(-5),promotions=(game.pyramid?.movementHistory||[]).flatMap(x=>x.promoted||[]).filter(x=>x.clubId===team.id).length,relegations=(game.pyramid?.movementHistory||[]).flatMap(x=>x.relegated||[]).filter(x=>x.clubId===team.id).length,current=window.FLPyramid?FLPyramid.divisionForClub(game,team.id):null;
    const milestones=window.FLClubHistory?FLClubHistory.milestonesFor(team,Number(String(game.date).slice(0,4))):[];
    return {headline:`${team.name} in ${String(game.date).slice(0,4)}`,milestones,lines:[`Founded ${String(team.founded||'1888').slice(0,4)} in ${team.location}.`,`Current level: ${current?.name||'Regional football'}${current?` (tier ${current.tier})`:''}.`,`${honours.length} recorded honour${honours.length===1?'':'s'}, ${promotions} promotion${promotions===1?'':'s'} and ${relegations} relegation${relegations===1?'':'s'}.`,best?`Best recorded league finish: ${best.position} in ${best.division} (${best.season}).`:'The club is still waiting for its first archived league finish.',recent.length?`Recent path: ${recent.map(s=>`${s.season} · T${s.tier} ${s.position}`).join(' / ')}`:'No completed seasons before this appointment.'].filter(Boolean)};
  }



  function average(values){ return values.length?values.reduce((a,b)=>a+b,0)/values.length:50; }
  function defaultTactics(team){
    const strength=Number(team.strength||3);
    return {mentality:strength>=4?58:strength<=2?43:50,tempo:50,passing:50,width:50,defensiveLine:strength>=4?56:46,pressing:strength>=4?57:46,creativeFreedom:50,timeWasting:20,buildUp:50};
  }
  function tacticalEffects(tactics){
    const t={...defaultTactics({strength:3}),...(tactics||{})};
    const possession=(100-t.passing)*.18+t.buildUp*.18+t.creativeFreedom*.06+t.tempo*-.05;
    const chanceVolume=t.mentality*.16+t.tempo*.13+t.buildUp*.09+t.width*.04+t.creativeFreedom*.05;
    const chanceQuality=t.creativeFreedom*.10+t.buildUp*.08+t.width*.04-t.tempo*.035;
    const defensiveSecurity=(100-t.mentality)*.11+(100-t.defensiveLine)*.08+(100-t.creativeFreedom)*.035;
    const pressing=t.pressing*.14+t.defensiveLine*.08;
    const fatigue=t.tempo*.09+t.pressing*.11+t.defensiveLine*.035;
    const transition=t.buildUp*.12+t.tempo*.07+t.passing*.04;
    return {raw:t,possession,chanceVolume,chanceQuality,defensiveSecurity,pressing,fatigue,transition};
  }
  function teamProfile(game,team,isHome=false){
    const managed=team.id===game.controlledClubId&&game.teamManagement;
    let starters;
    if(managed&&Array.isArray(game.teamManagement.startingXI)){
      starters=game.teamManagement.startingXI.map(id=>(team.players||[]).find(p=>p.id===id)).filter(p=>p&&p.available!==false&&p.status!=='retired'&&p.status!=='deceased');
    }
    const eligible=[...(team.players||[])].filter(p=>p.status!=='retired'&&p.status!=='deceased'&&p.available!==false);
    if(!starters||starters.length<11)starters=eligible.sort((a,b)=>((b.ability||50)*(b.condition||100))-((a.ability||50)*(a.condition||100))).slice(0,11);
    if(starters.length<11)starters=[...starters,...(team.players||[]).filter(p=>!starters.some(s=>s.id===p.id)&&p.status!=='deceased'&&p.status!=='retired').slice(0,11-starters.length)];
    const attack=average(starters.filter(p=>['CF','IF','W'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const midfield=average(starters.filter(p=>['HB','W','IF'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const defence=average(starters.filter(p=>['GK','FB','HB'].includes(p.position)).map(p=>p.ability||50))||average(starters.map(p=>p.ability||50));
    const fitness=average(starters.map(p=>p.condition||90));
    const form=Number(team.formRating||50), confidence=Number(team.confidence||50), morale=Number(team.morale||50);
    const manager=team.id===game.controlledClubId?52:Number(team.managerAbility||48);
    const home=isHome?4.5:0,trajectoryBonus=window.FLClubTrajectory?FLClubTrajectory.matchStrengthBonus(team):0;
    const tactics=managed?game.teamManagement.tactics:defaultTactics(team);
    const tactical=tacticalEffects(tactics);
    const eraTactics=window.FLLegacySystems?FLLegacySystems.tacticalContext(game,tactics,managed&&Array.isArray(game.teamManagement.positions)?game.teamManagement.positions:[]):{execution:1,modifiers:{pressing:1,buildUp:1,coordination:1},freePositioning:true};
    tactical.pressing*=eraTactics.modifiers.pressing;tactical.transition*=eraTactics.modifiers.buildUp;tactical.defensiveSecurity*=eraTactics.modifiers.coordination;
    const tacticalExecution=(eraTactics.execution-1)*4.5;
    const effective=(attack*.34+midfield*.30+defence*.28+fitness*.08)+home+(form-50)*.07+(confidence-50)*.06+(morale-50)*.05+(manager-50)*.05+(tactical.chanceVolume-tactical.defensiveSecurity)*.018+trajectoryBonus+tacticalExecution;
    const benchSize=window.FLTimeline?FLTimeline.currentRules(game).benchSize:7;
    const bench=eligible.filter(p=>!starters.some(s=>s.id===p.id)).sort((a,b)=>(b.ability||50)-(a.ability||50)).slice(0,benchSize);
    const defaultShape=[
      {slot:0,role:'GK',depth:10,width:50},{slot:1,role:'FB',depth:23,width:34},{slot:2,role:'FB',depth:23,width:66},
      {slot:3,role:'HB',depth:36,width:22},{slot:4,role:'HB',depth:36,width:50},{slot:5,role:'HB',depth:36,width:78},
      {slot:6,role:'IF',depth:48,width:36},{slot:7,role:'IF',depth:48,width:64},{slot:8,role:'CF',depth:49,width:50},
      {slot:9,role:'W',depth:47,width:12},{slot:10,role:'W',depth:47,width:88}
    ];
    const shape=managed&&Array.isArray(game.teamManagement.positions)?game.teamManagement.positions.map((pos,i)=>({
      slot:i,role:pos.role||starters[i]?.position||'HB',depth:clamp(5+Number(pos.y||50)*.54,8,49.2),width:clamp(Number(pos.x||50),7,93)
    })):defaultShape;
    const setPieces=managed&&game.teamManagement.setPieces?JSON.parse(JSON.stringify(game.teamManagement.setPieces)):null;
    return {starters,bench,attack,midfield,defence,fitness,form,confidence,morale,manager,trajectoryBonus,effective,tactics:{...tactics},tactical,eraTactics,shape,setPieces};
  }
  function weightedPlayer(players,r,attacking=true){
    const weights=players.map(p=>{let w=1+(p.ability||50)/30;if(attacking){if(p.position==='CF')w*=3.4;else if(['IF','W'].includes(p.position))w*=2.2;else if(p.position==='HB')w*=1.2;else if(p.position==='GK')w*=.08;const recordProfile=p.careerRecordProfile||'standard';if(recordProfile==='goal-machine')w*=1.9;else if(recordProfile==='all-time'&&['CF','IF','W'].includes(p.position))w*=2.15;}return w;});
    let roll=r()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<players.length;i++){roll-=weights[i];if(roll<=0)return players[i];}return players[0];
  }
  function compactMatchRecords(game){
    const records=Array.isArray(game.matchRecords)?game.matchRecords:[];
    const detailedKeep=10,totalKeep=80;
    if(records.length>detailedKeep){
      records.slice(0,-detailedKeep).forEach(old=>{
        if(old.compact)return;
        old.compact=true;
        old.frames=[];old.statsTimeline=[];old.pitchWear=[];old.momentum=(old.momentum||[]).filter((_,i)=>i%10===0).slice(-12);
        if(old.teamProfiles){
          const trim=profile=>profile?{effective:profile.effective,attack:profile.attack,midfield:profile.midfield,defence:profile.defence,tactics:profile.tactics,starters:(profile.starters||[]).map(p=>({id:p.id,name:p.name,position:p.position,ability:p.ability})),bench:[]}:null;
          old.teamProfiles={home:trim(old.teamProfiles.home),away:trim(old.teamProfiles.away)};
        }
        old.events=(old.events||[]).filter(e=>['goal','incident','foul','manager-call'].includes(e.type)||e.card).slice(-60);
      });
    }
    if(records.length>totalKeep)game.matchRecords=records.slice(-totalKeep);
  }
  function repairWorldBalance(game,options={}){return window.FLFootballBalance?FLFootballBalance.repairWorld(game,options):{changedPlayers:0,changedClubs:0};}
  function applyResult(game,f,record){
    if(f.played)return;
    const home=club(game,f.home),away=club(game,f.away);f.homeGoals=record.homeGoals;f.awayGoals=record.awayGoals;f.played=true;f.matchRecordId=record.id;
    const leagueMatch=f.competitionId!=='english-cup'&&Number(f.tier)!==0;
    if(leagueMatch){
      home.played++;away.played++;home.gf+=f.homeGoals;home.ga+=f.awayGoals;away.gf+=f.awayGoals;away.ga+=f.homeGoals;
      const pointsForWin=window.FLTimeline?FLTimeline.currentRules(game).pointsForWin:2;
      if(f.homeGoals>f.awayGoals){home.won++;away.lost++;home.points+=pointsForWin;home.confidence=clamp((home.confidence||50)+3,0,100);away.confidence=clamp((away.confidence||50)-2,0,100);}
      else if(f.homeGoals<f.awayGoals){away.won++;home.lost++;away.points+=pointsForWin;away.confidence=clamp((away.confidence||50)+3,0,100);home.confidence=clamp((home.confidence||50)-2,0,100);}
      else {home.drawn++;away.drawn++;home.points++;away.points++;}
    }
    const result=`${home.name} ${f.homeGoals}–${f.awayGoals} ${away.name}`;
    game.history.push({date:f.date,type:'result',text:result,matchRecordId:record.id});
    game.matchRecords=game.matchRecords||[];game.matchRecords.push(record);compactMatchRecords(game);
    if(f.home===game.controlledClubId||f.away===game.controlledClubId){
      const ours=f.home===game.controlledClubId?f.homeGoals:f.awayGoals,theirs=f.home===game.controlledClubId?f.awayGoals:f.homeGoals;
      game.boardConfidence=clamp(game.boardConfidence+(ours>theirs?3:ours===theirs?0:-2),0,100);
      game.inbox.unshift({id:`result-${f.id}`,date:f.date,from:'Club Secretary',subject:'Match report',body:`${result}. xG ${record.stats.home.xg.toFixed(2)}–${record.stats.away.xg.toFixed(2)}. Attendance ${record.attendance.toLocaleString('en-GB')}.`,read:false});
      if(window.FLLivingWorld)FLLivingWorld.afterControlledMatch(game,f,record);
      if(window.FLLegacySystems&&game.teamManagement){FLLegacySystems.recordTacticalUse(game,game.teamManagement.tactics||{},game.teamManagement.positions||[],ours>theirs?'win':ours===theirs?'draw':'loss');}
    }
    if(f.competitionId==='english-cup'&&!game.meta?.deferCupProgress&&window.FLEnglishCup)FLEnglishCup.afterFixtures(game);if(Number(f.tier)===0&&!game.meta?.deferCupProgress&&window.FLCareerSystems)FLCareerSystems.progressExtendedCups(game);
  }

  function ensureMatchCareerFields(player,team){
    const numeric=['appearances','starts','subApps','minutes','goals','assists','yellowCards','redCards','cleanSheets','conceded','playerOfMatch'];
    numeric.forEach(key=>player[key]=Number(player[key]||0));
    player.matchHistory=Array.isArray(player.matchHistory)?player.matchHistory:[];
    player.seasonHistory=Array.isArray(player.seasonHistory)?player.seasonHistory:[];
    player.careerTotals=player.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};
    ['appearances','goals','assists','cleanSheets'].forEach(key=>player.careerTotals[key]=Number(player.careerTotals[key]||0));
    player.clubHistory=Array.isArray(player.clubHistory)&&player.clubHistory.length?player.clubHistory:[{club:team.name,from:1888,to:'Present',apps:0,goals:0}];
    let spell=[...player.clubHistory].reverse().find(row=>row.club===team.name&&row.to==='Present');
    if(!spell){spell={club:team.name,from:Number(String(team?.founded||1888).slice(0,4))||1888,to:'Present',apps:0,goals:0};player.clubHistory.push(spell);}
    spell.apps=Number(spell.apps||0);spell.goals=Number(spell.goals||0);
    return spell;
  }
  function rollbackLegacyScorerOnlyStats(record,home,away){
    if(record.engineVersion!=='2.0'||record.legacyScorerStatsRolledBack)return;
    const grouped={};
    (record.events||[]).filter(event=>event.type==='goal'&&event.playerId).forEach(event=>{
      const key=`${event.side}:${event.playerId}`;grouped[key]=(grouped[key]||0)+1;
    });
    Object.entries(grouped).forEach(([key,count])=>{
      const [side,playerId]=key.split(':'),team=side==='home'?home:away,opponent=side==='home'?away:home,player=team.players.find(p=>p.id===playerId);
      if(!player)return;
      player.goals=Math.max(0,Number(player.goals||0)-count);
      player.appearances=Math.max(0,Number(player.appearances||0)-count);
      player.starts=Math.max(0,Number(player.starts||0)-count);
      player.minutes=Math.max(0,Number(player.minutes||0)-(90*count));
      let remove=count;
      player.matchHistory=(player.matchHistory||[]).filter(entry=>{
        if(remove>0&&entry.date===record.date&&entry.opponent===opponent.name){remove--;return false;}
        return true;
      });
    });
    record.legacyScorerStatsRolledBack=true;
  }
  function finalizeMatchStats(game,record){
    if(!record)return [];
    if(record.playerStatsApplied)return record.playerPerformances||[];
    const home=club(game,record.homeId),away=club(game,record.awayId);
    if(!home||!away)return [];
    rollbackLegacyScorerOnlyStats(record,home,away);
    const activity={};
    const activityFor=id=>{
      if(!id)return {touches:0,passes:0,completedPasses:0,receptions:0,shots:0,onTarget:0,dribbles:0,defensiveActions:0};
      activity[id]=activity[id]||{touches:0,passes:0,completedPasses:0,receptions:0,shots:0,onTarget:0,dribbles:0,defensiveActions:0};
      return activity[id];
    };
    (record.frames||[]).forEach(frame=>{
      if(frame.ownerId){
        const a=activityFor(frame.ownerId);a.touches++;
        if(['pass','kickoff','throw','goal-kick','cross'].includes(frame.phase)){
          a.passes++;
          if(!['intercepted','offside'].includes(frame.outcome))a.completedPasses++;
        }
        if(['shot','header'].includes(frame.phase)){
          a.shots++;
          if(['goal','save','woodwork'].includes(frame.outcome))a.onTarget++;
        }
        if(frame.phase==='carry')a.dribbles++;
      }
      if(frame.receiverId&&!['intercepted','offside'].includes(frame.outcome))activityFor(frame.receiverId).receptions++;
    });
    (record.events||[]).filter(event=>event.type==='turnover'&&event.playerId).forEach(event=>activityFor(event.playerId).defensiveActions++);
    const goalsBy={},assistsBy={},yellowsBy={},redsBy={};
    (record.events||[]).filter(event=>event.type==='goal').forEach(event=>{
      if(event.playerId)goalsBy[event.playerId]=(goalsBy[event.playerId]||0)+1;
      if(event.assistId)assistsBy[event.assistId]=(assistsBy[event.assistId]||0)+1;
    });
    (record.events||[]).filter(event=>event.type==='yellow-card'&&event.playerId).forEach(event=>yellowsBy[event.playerId]=(yellowsBy[event.playerId]||0)+1);
    (record.events||[]).filter(event=>event.type==='red-card'&&event.playerId).forEach(event=>redsBy[event.playerId]=(redsBy[event.playerId]||0)+1);
    const ratingRandom=rng(hashSeed(`${record.id}-player-ratings-v051`)),performances=[];
    const sides=[
      {side:'home',team:home,opponent:away,profile:record.teamProfiles?.home,goalsFor:record.homeGoals,goalsAgainst:record.awayGoals},
      {side:'away',team:away,opponent:home,profile:record.teamProfiles?.away,goalsFor:record.awayGoals,goalsAgainst:record.homeGoals}
    ];
    sides.forEach(info=>{
      const starters=(info.profile?.starters||[]).map(player=>player.id),participants=new Map();
      starters.forEach(id=>participants.set(id,{starter:true,substitute:false,minutes:90}));
      const changes=(record.substitutions||[]).filter(change=>change.side===info.side).sort((a,b)=>Number(a.minute||0)-Number(b.minute||0));
      changes.forEach(change=>{
        const minute=clamp(Number(change.minute||0),1,89),off=participants.get(change.offId);
        if(off)off.minutes=Math.min(off.minutes,minute);
        participants.set(change.onId,{starter:false,substitute:true,minutes:Math.max(1,90-minute)});
      });
      participants.forEach((part,playerId)=>{
        const player=info.team.players.find(p=>p.id===playerId);if(!player)return;
        const spell=ensureMatchCareerFields(player,info.team),previousApps=player.appearances;
        const goals=goalsBy[playerId]||0,assists=assistsBy[playerId]||0,yellowCards=yellowsBy[playerId]||0,redCards=redsBy[playerId]||0,a=activityFor(playerId);
        const resultBonus=info.goalsFor>info.goalsAgainst?.28:info.goalsFor===info.goalsAgainst?.08:-.18;
        const cleanSheet=player.position==='GK'&&info.goalsAgainst===0?1:0;
        const defenderCleanBonus=info.goalsAgainst===0&&['FB','HB'].includes(player.position)?.18:0;
        const involvement=Math.min(.38,(a.touches*.008)+(a.completedPasses*.006)+(a.receptions*.004)+(a.defensiveActions*.08));
        const attackBonus=goals*1.08+assists*.62+a.onTarget*.07+a.dribbles*.018;
        const keeperBonus=player.position==='GK'?(cleanSheet*.55-Math.max(0,info.goalsAgainst-2)*.12):0;
        const minutesWeight=clamp(part.minutes/90,.25,1);
        const rating=+clamp(6.15+resultBonus+defenderCleanBonus+involvement+attackBonus+keeperBonus+(ratingRandom()-.5)*.42-(1-minutesWeight)*.12,5.2,10).toFixed(2);
        player.appearances++;
        if(part.starter)player.starts++;else player.subApps++;
        player.minutes+=Math.round(part.minutes);
        player.goals+=goals;player.assists+=assists;player.yellowCards+=yellowCards;player.redCards+=redCards;player.cleanSheets+=cleanSheet;
        if(player.position==='GK')player.conceded+=info.goalsAgainst;
        const oldAverage=Number(player.averageRating);
        player.averageRating=Number.isFinite(oldAverage)?(((oldAverage*previousApps)+rating)/(previousApps+1)).toFixed(2):rating.toFixed(2);
        player.form=rating>=8?'Excellent':rating>=7?'Good':rating>=6.2?'Fair':'Poor';
        player.condition=clamp(Number(player.condition||100)-Math.max(1,Math.round((part.minutes/90)*(4+ratingRandom()*5))),52,100);
        player.careerTotals.appearances++;player.careerTotals.goals+=goals;player.careerTotals.assists+=assists;player.careerTotals.cleanSheets+=cleanSheet;
        spell.apps++;spell.goals+=goals;
        const history={date:record.date,competition:record.competition||'Football League',opponent:info.opponent.name,venue:info.side==='home'?'Home':'Away',result:`${record.homeGoals}–${record.awayGoals}`,minutes:Math.round(part.minutes),starter:part.starter,rating:rating.toFixed(2),goals,assists,yellowCards,redCards,cleanSheet:Boolean(cleanSheet)};
        player.matchHistory.unshift(history);
        if(player.matchHistory.length>60)player.matchHistory.length=60;
        performances.push({side:info.side,clubId:info.team.id,playerId,playerName:player.name,position:player.position,starter:part.starter,minutes:Math.round(part.minutes),rating,goals,assists,yellowCards,redCards,cleanSheet:Boolean(cleanSheet),touches:a.touches,passes:a.passes,completedPasses:a.completedPasses,shots:a.shots,onTarget:a.onTarget,defensiveActions:a.defensiveActions});
      });
    });
    const playerOfMatch=[...performances].sort((a,b)=>b.rating-a.rating||b.goals-a.goals||b.assists-a.assists)[0];
    if(playerOfMatch){
      const team=playerOfMatch.side==='home'?home:away,player=team.players.find(p=>p.id===playerOfMatch.playerId);
      if(player)player.playerOfMatch=Number(player.playerOfMatch||0)+1;
      playerOfMatch.playerOfMatch=true;record.playerOfMatch={...playerOfMatch};
    }
    record.playerPerformances=performances;
    record.playerStatsApplied=true;
    record.playerStatsAppliedAt=new Date().toISOString();
    if(window.FLDressingRoom&&(record.homeId===game.controlledClubId||record.awayId===game.controlledClubId))FLDressingRoom.afterMatch(game,record);
    return performances;
  }

  function matchDNA(hp,ap,weather,r){
    const gap=Math.abs(hp.effective-ap.effective),press=(hp.tactical.pressing+ap.tactical.pressing)/2,risk=(hp.tactical.chanceVolume+ap.tactical.chanceVolume)/2;
    if(gap>10)return hp.effective>ap.effective?'Home control':'Away control';
    if(['Heavy rain','Fog','Snow flurries'].includes(weather))return 'Scrappy conditions';
    if(press>62)return 'Physical battle';
    if(risk>62)return 'End-to-end';
    if(risk<43)return 'Tactical contest';
    return pick(['Midfield battle','Open game','Tense contest'],r);
  }
  function aiAdjustment(profile,ownGoals,oppGoals,minute,redCards=0){
    const t={...profile.tactical};
    const losing=ownGoals<oppGoals,winning=ownGoals>oppGoals;
    if(redCards){t.chanceVolume-=10;t.defensiveSecurity+=12;t.possession-=5;}
    if(minute>=65&&losing){t.chanceVolume+=12;t.chanceQuality+=7;t.transition+=9;t.defensiveSecurity-=8;t.fatigue+=7;}
    if(minute>=75&&winning){t.chanceVolume-=8;t.defensiveSecurity+=10;t.possession+=3;t.fatigue-=2;}
    return t;
  }
  const MATCH_TICKS_PER_MINUTE=6;
  const MATCH_TOTAL_TICKS=90*MATCH_TICKS_PER_MINUTE;
  function eventClock(event){
    const value=Number(event?.clock);
    return Number.isFinite(value)?value:Number(event?.minute||0);
  }
  function clockFromTick(tick){return tick/MATCH_TICKS_PER_MINUTE;}
  function displayMinute(clock){return Math.min(90,Math.max(1,Math.floor(clock)+1));}
  function attackDirection(side,clock){
    const firstHalf=clock<45;
    return side==='home'?(firstHalf?1:-1):(firstHalf?-1:1);
  }
  function pointFor(side,clock,zone,lane,jitterX=0,jitterY=0){
    const direction=attackDirection(side,clock);
    const attackingX=clamp(10+zone*19.25+jitterX,4,96);
    const lanes=[18,50,82];
    return {x:direction===1?attackingX:100-attackingX,y:clamp((lanes[lane]??50)+jitterY,6,94)};
  }
  function zoneFromPoint(side,clock,point){
    const direction=attackDirection(side,clock),attackingX=direction===1?point.x:100-point.x;
    return clamp((attackingX-10)/19.25,0,4.25);
  }
  function laneFromPoint(point){return point.y<35?0:point.y>65?2:1;}
  function otherSide(side){return side==='home'?'away':'home';}
  function sideName(side,home,away){return side==='home'?home.name:away.name;}
  function profileFor(side,hp,ap){return side==='home'?hp:ap;}
  function teamFor(side,home,away){return side==='home'?home:away;}
  function playerAt(profile,index){return profile.starters[clamp(index,0,profile.starters.length-1)]||profile.starters[0];}
  function rolePool(zone,lane){
    if(zone<.75)return lane===0?[1,3,4]:lane===2?[2,5,4]:[4,1,2,3,5];
    if(zone<1.7)return lane===0?[3,1,9,6,4]:lane===2?[5,2,10,7,4]:[4,3,5,6,7];
    if(zone<2.7)return lane===0?[9,6,3,4]:lane===2?[10,7,5,4]:[6,7,8,4,3,5];
    if(zone<3.55)return lane===0?[9,6,8,3]:lane===2?[10,7,8,5]:[8,6,7,9,10];
    return lane===0?[9,6,8,7]:lane===2?[10,7,8,6]:[8,6,7,9,10];
  }
  function chooseCarrierIndex(zone,lane,r,exclude=-1){
    const pool=rolePool(zone,lane).filter(i=>i!==exclude);
    return pool[Math.floor(r()*pool.length)]??4;
  }
  function chooseSetPieceTaker(profile,type,r){
    const key=type==='corner'?'corners':type==='throw-in'?'throwIns':type==='penalty'?'penalties':'freeKicks';
    const nominated=profile.setPieces?.takers?.[key]||[];
    const found=nominated.map(id=>profile.starters.findIndex(p=>p.id===id)).find(i=>i>=0);
    if(Number.isInteger(found))return found;
    if(type==='corner')return r()<.5?9:10;
    if(type==='throw-in')return r()<.5?1:2;
    if(type==='penalty')return 8;
    return r()<.5?6:7;
  }
  function activeRoutine(profile,type,occurrence){
    if(!profile.setPieces)return null;
    const key=type==='corner'?'corners':type==='throw-in'?'throwIns':type==='penalty'?'penalties':'freeKicks';
    const routines=(profile.setPieces.routines?.[key]||[]).filter(x=>x&&x.enabled!==false);
    if(!routines.length)return null;
    return routines[profile.setPieces.rotate===false?0:occurrence%routines.length];
  }
  function routineTarget(profile,type,side,clock,cornerLane,occurrence){
    const routine=activeRoutine(profile,type,occurrence),direction=attackDirection(side,clock);
    if(!routine)return {routine:null,target:type==='corner'?pointFor(side,clock,3.82,1,0,(cornerLane===0?-8:8)):pointFor(side,clock,3.45,1)};
    const targetName=routine.target||'Penalty Spot';
    let depth=3.55,y=50;
    if(targetName==='Near Post'){depth=3.9;y=cornerLane===0?39:61;}
    else if(targetName==='Six Yard Box'){depth=4.02;y=50;}
    else if(targetName==='Far Post'){depth=3.82;y=cornerLane===0?63:37;}
    else if(targetName==='Edge Of Box'){depth=3.1;y=50;}
    else if(targetName==='Short'){depth=3.35;y=cornerLane===0?16:84;}
    else if(targetName==='Custom'){
      const customDepth=clamp(Number(routine.targetY??27),4,96);
      const attackingX=96-customDepth*.38;
      return {routine,target:{x:direction===1?attackingX:100-attackingX,y:clamp(Number(routine.targetX??50),6,94)}};
    }
    const point=pointFor(side,clock,depth,1);point.y=y;
    return {routine,target:point};
  }
  function routinePositions(profile,routine,side,clock){
    if(!routine?.positions)return null;
    const direction=attackDirection(side,clock);
    return routine.positions.map(pos=>{
      const depth=clamp(Number(pos.y??60),4,96),attackingX=96-depth*.38;
      return {playerId:pos.playerId,x:direction===1?attackingX:100-attackingX,y:clamp(Number(pos.x??50),6,94),run:routine.runs?.[pos.playerId]||null};
    });
  }
  function commentaryForPass(type,passer,receiver,sideLabel,lane,advanced){
    if(type==='switch')return `${passer.name} opens the pitch with a sweeping switch to ${receiver.name}.`;
    if(type==='through')return `${passer.name} threads a through ball into ${receiver.name}'s run.`;
    if(type==='driven')return `${passer.name} punches a firm pass forward to ${receiver.name}.`;
    if(type==='clipped')return `${passer.name} clips the ball over the first line for ${receiver.name}.`;
    if(type==='one-two')return `${passer.name} combines sharply with ${receiver.name} in a quick one-two.`;
    if(type==='back')return `${passer.name} turns back and keeps possession with ${receiver.name}.`;
    if(advanced)return `${passer.name} finds ${receiver.name} between the lines.`;
    return `${sideLabel} move the ball ${lane===0?'down the left':lane===2?'down the right':'through midfield'}.`;
  }
  function rememberMatch(game,record){
    game.footballMemories=game.footballMemories||[];
    const total=record.homeGoals+record.awayGoals,margin=Math.abs(record.homeGoals-record.awayGoals),inc=record.notableIncidents||[];
    let title=null,kind=null;
    if(inc.some(x=>/dog/i.test(x.text))){title=`The Dog Match`;kind='oddity';}
    else if(record.pitch==='Muddy'&&total>=5){title=`The Mud Battle at ${record.homeName}`;kind='classic';}
    else if(total>=7){title=`The ${record.homeGoals}–${record.awayGoals} Classic`;kind='classic';}
    else if(margin>=5){title=`The ${record.homeName} Rout`;kind='record';}
    else if(record.storyline==='Giant killing' && record.homeGoals!==record.awayGoals){title=`The Great Upset`;kind='upset';}
    if(title&&!game.footballMemories.some(m=>m.matchRecordId===record.id))game.footballMemories.unshift({id:`memory-${record.id}`,date:record.date,title,kind,matchRecordId:record.id,summary:`${record.homeName} ${record.homeGoals}–${record.awayGoals} ${record.awayName}`});
  }
  function simulateDetailedMatch(game,f){
    if(f.played&&f.matchRecordId)return (game.matchRecords||[]).find(m=>m.id===f.matchRecordId);
    const seed=game.meta.seed+f.round*1907+Number(f.id.replace(/\D/g,''))*31,r=rng(seed);
    const home=club(game,f.home),away=club(game,f.away),hp=teamProfile(game,home,true),ap=teamProfile(game,away,false);
    const conditions=window.FLMatchEnvironment?FLMatchEnvironment.create(game,home,r):{era:{id:'victorian',label:'Victorian Football'},weather:pick(['Clear','Overcast','Light rain','Heavy rain','Fog','Cold and dry'],r),startSurface:'Good',windSpeed:5,windLabel:'Light',temperature:10,visibility:'Good',precipitation:'None',drainage:.3,wearRate:.7,friction:1,controlPenalty:0,passPenalty:0,bounce:'True',ballBehaviour:'The ball runs cleanly'};
    const weather=conditions.weather,pitch=conditions.startSurface;
    let storyline=matchDNA(hp,ap,weather,r);
    if(Math.abs(hp.effective-ap.effective)>9&&((hp.effective>ap.effective&&r()<.15)||(ap.effective>hp.effective&&r()<.15)))storyline='Giant killing';
    const stats={home:{shots:0,onTarget:0,xg:0,corners:0,fouls:0,offsides:0,possession:50},away:{shots:0,onTarget:0,xg:0,corners:0,fouls:0,offsides:0,possession:50}};
    const events=[],frames=[],momentum=[],statsTimeline=[];
    const possessionTicks={home:0,away:0},setPieceCount={home:0,away:0},moveChains={home:[],away:[]};
    let hg=0,ag=0,crowdMood='Anticipation',pressureWindow=0;
    const eraRules=window.FLTimeline?{...FLTimeline.currentRules(game)}:{penalties:true,cards:true,offsideDefendersRequired:2,backPassAllowed:false,goalLineTechnology:false,var:false};
    const matchYear=Number(String(f.date||game.date||'1888').slice(0,4))||1888;
    const eraOfficiating=matchYear<1930
      ?{id:'early',challengeTolerance:1.55,cardRate:.10,pullTolerance:1.48,simulationDetection:.42,confrontationRate:1.50,fightRate:1.45,cardsAvailable:false}
      :matchYear<1970
      ?{id:'traditional',challengeTolerance:1.38,cardRate:.28,pullTolerance:1.34,simulationDetection:.50,confrontationRate:1.36,fightRate:1.28,cardsAvailable:false}
      :matchYear<1995
      ?{id:'hard-modern',challengeTolerance:1.20,cardRate:.66,pullTolerance:1.16,simulationDetection:.60,confrontationRate:1.22,fightRate:1.10,cardsAvailable:true}
      :matchYear<2010
      ?{id:'protective',challengeTolerance:1.08,cardRate:.86,pullTolerance:1.02,simulationDetection:.69,confrontationRate:1.08,fightRate:.94,cardsAvailable:true}
      :{id:'modern',challengeTolerance:1.00,cardRate:1.00,pullTolerance:.92,simulationDetection:.78,confrontationRate:.92,fightRate:.78,cardsAvailable:true};
    const varActive=matchYear>=2020;
    eraRules.var=varActive;
    const refereeProfile={control:.50+r()*.42,perception:.52+r()*.42,strictness:.45+r()*.48,dissentTolerance:.38+r()*.48,varThreshold:.58+r()*.28};
    const dismissals={home:0,away:0},dismissedPlayers=new Set(),cautions=new Map();
    let matchTemperature=clamp(18+(storyline==='Physical battle'?15:storyline==='Scrappy conditions'?7:storyline==='Tense contest'?3:0)+(f.competitionId==='english-cup'?2:0),10,58),matchTemperaturePeak=matchTemperature;
    const temperatureHistory=[{minute:0,value:+matchTemperature.toFixed(1),reason:'kickoff'}];
    game.footballFeuds=game.footballFeuds&&typeof game.footballFeuds==='object'?game.footballFeuds:{};
    game.footballReputations=game.footballReputations&&typeof game.footballReputations==='object'?game.footballReputations:{};
    const identityScore=value=>String(value||'').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
    const reputation=player=>{if(!player)return {diver:0,hardMan:0,dissent:0,fanHostility:0,targeted:0};const key=String(player.id||player.name||'unknown');return game.footballReputations[key]||(game.footballReputations[key]={playerId:player.id||null,playerName:player.name||'Unknown',diver:0,hardMan:0,dissent:0,fanHostility:0,targeted:0,lastUpdated:f.date});};
    const addReputation=(player,kind,amount)=>{if(!player)return;const row=reputation(player);row[kind]=clamp(Number(row[kind]||0)+Number(amount||0),0,100);row.lastUpdated=f.date;};
    const temperament=player=>clamp(42+(identityScore(player?.id||player?.name)%52),35,96);
    const simulationSkill=player=>clamp(38+((identityScore(player?.name||player?.id)*7)%57),30,94);
    const feudKey=(a,b)=>[String(a?.id||a?.name||''),String(b?.id||b?.name||'')].sort().join('::');
    const feudLevel=(a,b)=>Number(game.footballFeuds[feudKey(a,b)]?.level||0);
    const rememberFeud=(a,b,amount,cause,tick)=>{if(!a||!b||a===b)return;const key=feudKey(a,b),old=game.footballFeuds[key]||{playerA:a.id,playerB:b.id,playerAName:a.name,playerBName:b.name,level:0,meetings:0,lastIncident:null};old.level=clamp(Number(old.level||0)+Number(amount||0),0,100);old.meetings=Number(old.meetings||0)+1;old.lastIncident={date:f.date,minute:displayMinute(clockFromTick(tick)),cause};game.footballFeuds[key]=old;};
    const raiseTemperature=(amount,reason,tick,a=null,b=null)=>{matchTemperature=clamp(matchTemperature+Number(amount||0),0,100);matchTemperaturePeak=Math.max(matchTemperaturePeak,matchTemperature);if(a&&b&&amount>=3)rememberFeud(a,b,Math.max(.5,amount*.12),reason,tick);if(amount>=5||matchTemperature>=65)temperatureHistory.push({minute:displayMinute(clockFromTick(tick)),value:+matchTemperature.toFixed(1),reason});};
    let state={side:'home',zone:2,lane:1,carrier:8,ball:pointFor('home',0,2,1),pending:null,kickoff:true,lastPasser:null,lastPassTick:-99};
    const hooliganism=game.worldState?.social?.hooliganismRisk;
    const incidentChance=hooliganism==='crisis'?.16:hooliganism==='rising'?.075:game.date<'1930-01-01'?.055:.012;
    const addEvent=(tick,type,side,text,extra={})=>{
      const clock=clockFromTick(tick),event={clock,minute:displayMinute(clock),type,side,text,homeGoals:hg,awayGoals:ag,...extra};
      events.push(event);return event;
    };
    const addFrame=(tick,data={})=>{
      const clock=clockFromTick(tick),frame={tick,clock,minute:displayMinute(clock),...data};frames.push(frame);
      if(frame.side)possessionTicks[frame.side]++;
      const zone=Number(frame.zone??state.zone),value=(frame.side==='home'?1:-1)*(zone-1.7)*13+(hp.effective-ap.effective)*.65;
      pressureWindow=pressureWindow*.72+value*.28;
      return frame;
    };
    const selectFouler=side=>{const p=profileFor(side,hp,ap),pool=p.starters.filter(player=>!dismissedPlayers.has(player.id)&&['FB','HB'].includes(player.position));return pick(pool.length?pool:p.starters.filter(player=>!dismissedPlayers.has(player.id)),r)||p.starters[0];};
    const showWarning=(tick,side,player,reason)=>addEvent(tick,'warning',side,`${player.name} receives a firm warning for ${reason}.`,{playerId:player.id,player:player.name,reason});
    const applyCard=(tick,side,player,info={})=>{
      if(!player||dismissedPlayers.has(player.id))return null;
      const violent=Boolean(info.violent),severity=clamp(Number(info.severity||0),0,1),reason=String(info.reason||'foul');
      if(!eraOfficiating.cardsAvailable||!eraRules.cards){
        const warningWorthy=violent||Boolean(info.forceYellow)||severity>.58||(Number.isFinite(info.yellowChance)&&r()<Number(info.yellowChance)*.38);
        if(!warningWorthy)return null;
        if(violent&&r()<clamp(.18+(1-refereeProfile.control)*.24,.12,.42)){dismissedPlayers.add(player.id);dismissals[side]++;addEvent(tick,'dismissal',side,`${player.name} is ordered from the field after ${reason}.`,{playerId:player.id,player:player.name,reason,dismissal:true});return 'dismissal';}
        showWarning(tick,side,player,reason);return 'warning';
      }
      const directRed=violent||Boolean(info.forceRed)||severity>.90&&r()<clamp(.28+refereeProfile.strictness*.30,.35,.68);
      if(directRed){dismissedPlayers.add(player.id);dismissals[side]++;stats[side].redCards=(stats[side].redCards||0)+1;addEvent(tick,'red-card',side,`${player.name} is shown a red card for ${reason}.`,{playerId:player.id,player:player.name,card:'red',reason});if(r()<.075)addEvent(tick,'referee-gesture',null,'The referee delivers the dismissal with an unusually forceful card gesture.',{gesture:'forceful-card',card:'red',rare:true});return 'red';}
      const yellowChance=Number.isFinite(info.yellowChance)?Number(info.yellowChance):clamp((severity-.22)*.72*eraOfficiating.cardRate*refereeProfile.strictness,0,.72);
      if(Boolean(info.forceYellow)||r()<yellowChance){const previous=Number(cautions.get(player.id)||0);stats[side].yellowCards=(stats[side].yellowCards||0)+1;addEvent(tick,'yellow-card',side,`${player.name} is shown a yellow card for ${reason}.`,{playerId:player.id,player:player.name,card:'yellow',reason});if(r()<.075)addEvent(tick,'referee-gesture',null,'The referee punches the card emphatically into the air.',{gesture:'forceful-card',card:'yellow',rare:true});cautions.set(player.id,previous+1);if(previous>=1){dismissedPlayers.add(player.id);dismissals[side]++;stats[side].redCards=(stats[side].redCards||0)+1;addEvent(tick,'red-card',side,`${player.name} is sent off after a second yellow card.`,{playerId:player.id,player:player.name,card:'red',reason:'second yellow'});return 'red';}return 'yellow';}
      return null;
    };
    const maybeDissent=(tick,side,player,decision,base=.12)=>{if(!player||dismissedPlayers.has(player.id))return false;const chance=clamp(base+(temperament(player)-70)*.003+(matchTemperature-45)*.002-refereeProfile.dissentTolerance*.08,.015,.38);if(r()>=chance)return false;raiseTemperature(5,'dissent',tick,player,null);addEvent(tick,'dissent',side,`${player.name} continues arguing with the referee after the ${decision}.`,{playerId:player.id,player:player.name,decision});applyCard(tick,side,player,{forceYellow:true,reason:'dissent'});return true;};
    const maybeConfrontation=(tick,offender,victim,severity,cause)=>{
      if(!offender||!victim||dismissedPlayers.has(offender.id)||dismissedPlayers.has(victim.id))return false;
      const aggression=(temperament(offender)+temperament(victim))/2,feud=feudLevel(offender,victim),hardRep=(reputation(offender).hardMan+reputation(victim).hardMan)/2,chance=clamp((matchTemperature-34)*.0024+(aggression-70)*.0019+feud*.0014+hardRep*.0005+severity*.075,.003,.34)*eraOfficiating.confrontationRate*(1.15-refereeProfile.control*.22);
      if(r()>=chance)return false;
      rememberFeud(offender,victim,4,cause,tick);raiseTemperature(9,'confrontation',tick,offender,victim);addReputation(offender,'hardMan',.7);addReputation(victim,'targeted',.5);
      const escalation=clamp((matchTemperature-35)/65+severity*.28+feud*.003+(aggression-70)*.004+(hardRep/100)*.16,0,1),roll=r();
      if(roll<clamp(.68-escalation*.30,.28,.70)){
        addEvent(tick,'incident',null,`${offender.name} gives ${victim.name} a small shove before teammates break it up.`,{incident:'small-push',tier:1,playerId:offender.id,player:offender.name,opponentId:victim.id,opponent:victim.name,cause});
        if(eraOfficiating.cardsAvailable&&r()<.16)applyCard(tick,otherSide(state.side),offender,{forceYellow:true,reason:'confrontation'});
      }else if(roll<clamp(.95-escalation*.13,.68,.96)){
        addEvent(tick,'incident',null,`Players from both teams rush together after ${offender.name} and ${victim.name} square up.`,{incident:'mass-confrontation',tier:2,playerId:offender.id,player:offender.name,opponentId:victim.id,opponent:victim.name,cause});
        raiseTemperature(7,'mass confrontation',tick,offender,victim);
        if(eraOfficiating.cardsAvailable){if(r()<.48)applyCard(tick,otherSide(state.side),offender,{forceYellow:true,reason:'mass confrontation'});if(r()<.32)applyCard(tick,state.side,victim,{forceYellow:true,reason:'mass confrontation'});}
      }else{
        const aggressor=r()<.55?offender:victim,other=aggressor===offender?victim:offender,aggressorSide=aggressor===offender?otherSide(state.side):state.side;
        addEvent(tick,'incident',aggressorSide,`A full brawl erupts as ${aggressor.name} lashes out at ${other.name}.`,{incident:'full-brawl',tier:3,playerId:aggressor.id,player:aggressor.name,opponentId:other.id,opponent:other.name,cause});
        raiseTemperature(18,'full brawl',tick,aggressor,other);addReputation(aggressor,'hardMan',6);addReputation(aggressor,'fanHostility',5);addReputation(other,'targeted',2);applyCard(tick,aggressorSide,aggressor,{violent:true,forceRed:true,severity:1,reason:'violent conduct'});
        const fanChance=clamp((matchTemperature-72)*.008+(hooliganism==='crisis'?.18:hooliganism==='rising'?.07:0)+reputation(aggressor).fanHostility*.0015,0,.34);
        if(r()<fanChance)addEvent(tick,'incident',null,'Several supporters get onto the pitch before stewards and police force them back.',{incident:'fan-pitch-invasion',tier:3,cause:'full brawl'});
      }
      return true;
    };
    const penaltyVARReview=(tick,attackingSide,onFieldDecision,evidence,description)=>{
      if(!varActive)return onFieldDecision;
      const replayAngles=2+Math.floor(r()*5),obstruction=clamp(r()*.72+(replayAngles<=2?.18:0),0,.95),evidenceQuality=clamp((.42+replayAngles*.09)*(1-obstruction*.58),.18,.96),seenEvidence=clamp(.5+(Number(evidence)-.5)*evidenceQuality,.04,.96);
      addEvent(tick,'review',attackingSide,`VAR checking: ${description}. The referee listens through the earpiece while play is held.`,{review:'var',stage:'silent-check',category:'penalty',onFieldDecision,evidence:+seenEvidence.toFixed(2),replayAngles,obstruction:+obstruction.toFixed(2),evidenceQuality:+evidenceQuality.toFixed(2)});
      const clearError=onFieldDecision==='penalty'?seenEvidence<.24:onFieldDecision!=='penalty'&&seenEvidence>.80;
      const borderline=onFieldDecision==='penalty'?seenEvidence>=.24&&seenEvidence<.42:seenEvidence>.61&&seenEvidence<=.80;
      if(clearError&&r()>refereeProfile.varThreshold-.48){
        addEvent(tick,'review',attackingSide,'The referee makes the television signal and runs to the pitch-side monitor.',{review:'var',stage:'monitor',category:'penalty',replayAngles});
        const finalDecision=seenEvidence>.55?'penalty':'no-penalty';
        addEvent(tick,'review',attackingSide,finalDecision==='penalty'?'Decision overturned: after the monitor review, a penalty is awarded.':'Decision overturned: after the monitor review, the penalty is cancelled.',{review:'var',stage:'decision',category:'penalty',decision:finalDecision,overturned:true});return finalDecision;
      }
      if(borderline||evidenceQuality<.43){addEvent(tick,'review',attackingSide,'The replay evidence is inconclusive. The original decision stands.',{review:'var',stage:'decision',category:'penalty',decision:'stands',inconclusive:true});return onFieldDecision;}
      addEvent(tick,'review',attackingSide,'VAR check complete. The original decision stands.',{review:'var',stage:'decision',category:'penalty',decision:'stands'});
      return onFieldDecision;
    };
    const scoreSnapshot=()=>({homeGoals:hg,awayGoals:ag});
    const updatePossession=()=>{
      const total=possessionTicks.home+possessionTicks.away||1;
      stats.home.possession=Math.round(possessionTicks.home/total*100);stats.away.possession=100-stats.home.possession;
    };
    const snapshotStats=tick=>{
      updatePossession();
      statsTimeline.push({clock:clockFromTick(tick),home:{...stats.home},away:{...stats.away}});
    };
    const turnover=(tick,newSide,point,reason='interception')=>{
      const newClock=clockFromTick(tick),newZone=zoneFromPoint(newSide,newClock,point),newLane=laneFromPoint(point),newProfile=profileFor(newSide,hp,ap);
      moveChains.home=[];moveChains.away=[];
      state={side:newSide,zone:newZone,lane:newLane,carrier:chooseCarrierIndex(newZone,newLane,r),ball:{...point},pending:null,kickoff:false,lastPasser:null,lastPassTick:-99};
      const winner=playerAt(newProfile,state.carrier);
      if(reason==='interception'||reason==='tackle')addEvent(tick,'turnover',newSide,reason==='tackle'?`${winner.name} times the tackle and wins the ball.`:`${winner.name} reads the pass and intercepts.` ,{playerId:winner.id,player:winner.name});
    };
    const goalTarget=(side,clock,r)=>{
      const direction=attackDirection(side,clock),y=43+r()*14;
      return {x:direction===1?98.7:1.3,y};
    };
    const shotOutcome=(side,profile,opp,clock,zone,lane,source,shooter,routineBonus=0)=>{
      const base=source==='penalty'?.76:source==='corner'?.11:source==='free-kick'?.09:['header','open-header'].includes(source)?.13:.055;
      const zoneBoost=Math.max(0,zone-3)*.105,central=lane===1?.045:-.01;
      const ability=((shooter.ability||50)-50)*.0017,matchup=(profile.attack-opp.defence)*.0022;
      const windPenalty=(Number(conditions.windSpeed||0)>22&&['header','open-header','corner','free-kick'].includes(source))?.012:0;
      const xg=clamp(base+zoneBoost+central+ability+matchup+routineBonus-windPenalty,source==='penalty'?.62:.025,source==='penalty'?.86:.48);
      const historicalGoalRate=Number(game.worldState?.modifiers?.goalRate||1);
      const goalChance=clamp(xg*.78*historicalGoalRate,.018,.48),roll=r();
      let outcome='wide';
      if(roll<goalChance)outcome='goal';
      else if(roll<goalChance+.39)outcome='save';
      else if(roll<goalChance+.51)outcome='blocked';
      else if(roll<goalChance+.58)outcome='woodwork';
      return {xg,outcome};
    };
    const resolveShot=(tick,side,from,zone,lane,shooterIndex,source='open-play',assistIndex=null,routineBonus=0)=>{
      const clock=clockFromTick(tick),profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),shooter=playerAt(profile,shooterIndex);
      const result=shotOutcome(side,profile,opp,clock,zone,lane,source,shooter,routineBonus),direction=attackDirection(side,clock);
      stats[side].shots++;stats[side].xg+=result.xg;
      let to,phase=['header','open-header'].includes(source)?'header':'shot';
      if(result.outcome==='goal'){to=goalTarget(side,clock,r);stats[side].onTarget++;}
      else if(result.outcome==='save'){to={x:direction===1?95.6:4.4,y:45+r()*10};stats[side].onTarget++;}
      else if(result.outcome==='blocked'){to={x:from.x+direction*(5+r()*4),y:clamp(from.y+(r()-.5)*12,10,90)};}
      else if(result.outcome==='woodwork'){to={x:direction===1?97.4:2.6,y:r()<.5?39.5:60.5};stats[side].onTarget++;}
      else to={x:direction===1?98.2:1.8,y:r()<.5?31+r()*7:62+r()*7};
      addFrame(tick,{side,phase,from:{...from},to,zone,lane,ownerIndex:shooterIndex,ownerId:shooter.id,ballType:['header','open-header'].includes(source)?'header':source==='free-kick'?'free-kick-shot':source==='penalty'?'penalty':'shot',outcome:result.outcome,source,...scoreSnapshot()});
      if(result.outcome==='goal'){
        if(side==='home')hg++;else ag++;
        const assist=assistIndex==null?null:playerAt(profile,assistIndex);
        const descriptor=['header','open-header'].includes(source)?'powers the header into the net':source==='free-kick'?'bends the free kick into the net':source==='penalty'?'scores from the spot':source==='corner'?'turns the corner home':'finishes the move';
        const move=moveChains[side].slice(-5);
        const ev=addEvent(tick,'goal',side,`${shooter.name} ${descriptor} — GOAL for ${team.name}!`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source,assistId:assist?.id||null,assist:assist?.name||null,move,moveText:move.length?move.map(x=>x.passer).concat(shooter.name).filter((x,i,a)=>i===0||x!==a[i-1]).join(' → '):null});
        ev.homeGoals=hg;ev.awayGoals=ag;
        if(eraRules.goalLineTechnology&&r()<.055)addEvent(tick,'technology',side,'Goal-line technology confirms that the ball crossed the line.',{review:'goal-line',decision:'goal'});
        if(varActive&&r()<.075)addEvent(tick,'review',side,'The goal is checked by video review and the decision stands.',{review:'var',decision:'goal stands'});
        crowdMood=side==='home'?'Roaring':'Stunned';
        moveChains.home=[];moveChains.away=[];
        state={side:otherSide(side),zone:2,lane:1,carrier:8,ball:pointFor(otherSide(side),clock+.25,2,1),pending:{type:'kickoff'},kickoff:false,lastPasser:null,lastPassTick:-99};
      }else if(result.outcome==='save'){
        const tippedBehind=source!=='penalty'&&r()<.14;
        addEvent(tick,'chance',side,tippedBehind?`${shooter.name} forces a strong save and the goalkeeper turns it behind.`:`${shooter.name} tests the goalkeeper, who gets safely behind it.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        if(tippedBehind){stats[side].corners++;state={side,zone:3.7,lane:r()<.5?0:2,carrier:state.carrier,ball:to,pending:{type:'corner-setup',side,lane:r()<.5?0:2},kickoff:false};}
        else{const defending=otherSide(side);moveChains.home=[];moveChains.away=[];state={side:defending,zone:.1,lane:1,carrier:0,ball:to,pending:null,kickoff:false,lastPasser:null,lastPassTick:-99};}
        crowdMood=result.xg>.25?'Nervous':crowdMood;
      }else if(result.outcome==='woodwork'){
        addEvent(tick,'chance',side,`${shooter.name} strikes the woodwork!`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        turnover(tick,otherSide(side),to,'rebound');
      }else if(result.outcome==='blocked'){
        addEvent(tick,'chance',side,`${shooter.name}'s effort is blocked in the crowded area.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        if(r()<.58){stats[side].corners++;state.pending={type:'corner-setup',side,lane:r()<.5?0:2};}
        else turnover(tick,otherSide(side),to,'rebound');
      }else{
        addEvent(tick,'chance',side,`${shooter.name} sends the effort wide.`,{playerId:shooter.id,player:shooter.name,xg:+result.xg.toFixed(2),source});
        moveChains.home=[];moveChains.away=[];state={side:otherSide(side),zone:.05,lane:1,carrier:0,ball:to,pending:{type:'goal-kick-setup',side:otherSide(side)},kickoff:false,lastPasser:null,lastPassTick:-99};
      }
    };
    const setPieceSetup=(tick,type,side,lane)=>{
      const clock=clockFromTick(tick),profile=profileFor(side,hp,ap),team=teamFor(side,home,away),direction=attackDirection(side,clock);
      setPieceCount[side]++;const occurrence=setPieceCount[side],takerIndex=chooseSetPieceTaker(profile,type,r),taker=playerAt(profile,takerIndex);
      let origin,target,routine=null;
      if(type==='corner'){
        origin={x:direction===1?96.7:3.3,y:lane===0?6.8:93.2};
        const info=routineTarget(profile,'corner',side,clock,lane,occurrence);routine=info.routine;target=info.target;
        addEvent(tick,'set-piece',side,`${team.name} have a corner. ${taker.name} places the ball at the flag.`,{setPiece:'corner',playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='free-kick-dangerous'){
        origin=pointFor(side,clock,3.25,lane,0,(r()-.5)*4);target=goalTarget(side,clock,r);
        routine=activeRoutine(profile,'free-kick',occurrence);
        addEvent(tick,'set-piece',side,`A dangerous free kick for ${team.name}. ${taker.name} stands over the ball.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='free-kick'){
        origin=pointFor(side,clock,Math.max(.65,state.zone),lane);target=pointFor(side,clock,clamp(state.zone+.65,0,3.2),lane);
        routine=activeRoutine(profile,'free-kick',occurrence);
        addEvent(tick,'set-piece',side,`Free kick to ${team.name}. They organise before the restart.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='throw-in'){
        origin=pointFor(side,clock,state.zone,lane);origin.y=lane===0?5.2:94.8;target=pointFor(side,clock,clamp(state.zone+.25,0,3.5),lane,0,lane===0?8:-8);
        routine=activeRoutine(profile,'throw-in',occurrence);
        addEvent(tick,'set-piece',side,`Throw-in to ${team.name}. ${taker.name} looks for movement.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }else if(type==='goal-kick'){
        origin={x:direction===1?7.2:92.8,y:50};target=pointFor(side,clock,2.25,Math.floor(r()*3));
        addEvent(tick,'set-piece',side,`Goal kick to ${team.name}. The goalkeeper waits for the side to move up.`,{setPiece:type,playerId:profile.starters[0]?.id,player:profile.starters[0]?.name});
      }else if(type==='penalty'){
        origin={x:direction===1?88.5:11.5,y:50};target=goalTarget(side,clock,r);
        routine=activeRoutine(profile,'penalty',occurrence);
        addEvent(tick,'set-piece',side,`Penalty to ${team.name}. ${taker.name} places the ball on the spot.`,{setPiece:type,playerId:taker.id,player:taker.name,routine:routine?.name||null});
      }
      state.side=side;state.ball=origin;state.carrier=takerIndex;state.lane=lane;
      addFrame(tick,{side,phase:'set-piece-setup',setPiece:type,from:origin,to:origin,zone:zoneFromPoint(side,clock,origin),lane,ownerIndex:takerIndex,ownerId:taker.id,ballType:'stationary',routine:routine?{name:routine.name,delivery:routine.delivery,target:routine.target}:null,routinePositions:routinePositions(profile,routine,side,clock),...scoreSnapshot()});
      state.pending={type:`${type}-delivery`,side,lane,takerIndex,origin,target,routine};
    };
    const resolvePending=(tick,pending)=>{
      const side=pending.side||state.side,clock=clockFromTick(tick),profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),direction=attackDirection(side,clock);
      if(pending.type==='first-touch'){
        const receiver=playerAt(profile,pending.receiverIndex),impact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{controlPenalty:0,state:pitch};
        const touchError=clamp((impact.controlPenalty||0)*42+Math.max(0,55-(receiver.ability||50))*.012,0,.95),angle=r()*Math.PI*2,distance=.15+r()*touchError*1.8;
        const touchPoint={x:clamp(pending.target.x+Math.cos(angle)*distance,3,97),y:clamp(pending.target.y+Math.sin(angle)*distance,5,95)};
        addFrame(tick,{side,phase:'control',from:pending.target,to:touchPoint,zone:pending.zone,lane:pending.lane,ownerIndex:pending.receiverIndex,ownerId:receiver.id,ballType:'first-touch',controlQuality:touchError>.55?'loose':touchError>.28?'settled':'clean',surface:impact.state,...scoreSnapshot()});
        if(touchError>.62&&r()<.22)addEvent(tick,'build-up',side,`${receiver.name} takes an awkward first touch but keeps possession.`,{playerId:receiver.id,player:receiver.name});
        state={side,zone:pending.zone,lane:pending.lane,carrier:pending.receiverIndex,ball:touchPoint,pending:null,kickoff:false,lastPasser:pending.passerIndex,lastPassTick:tick-1};return;
      }
      if(pending.type==='shot-delivery'){
        resolveShot(tick,side,pending.from,pending.zone,pending.lane,pending.shooterIndex,pending.source||'open-play',pending.assistIndex,pending.routineBonus||0);return;
      }
      if(pending.type==='kickoff'){
        const takerIndex=8,taker=playerAt(profile,takerIndex),receiverIndex=pending.secondHalf?7:pending.opening?6:(r()<.5?6:7),receiver=playerAt(profile,receiverIndex),from={x:50,y:50},to=pointFor(side,clock,1.85,receiverIndex===6?0:2);
        addFrame(tick,{side,phase:'kickoff',setPiece:'kickoff',from,to,zone:1.85,lane:receiverIndex===6?0:2,ownerIndex:takerIndex,ownerId:taker.id,receiverIndex,receiverId:receiver.id,ballType:'short-pass',...scoreSnapshot()});
        addEvent(tick,'kickoff',side,pending.opening?`${team.name} kick off the match.`:pending.secondHalf?`${team.name} begin the second half.`:`${team.name} restart from the centre spot.`);
        moveChains[side]=[{tick,passer:taker.name,passerId:taker.id,receiver:receiver.name,receiverId:receiver.id,type:'kickoff'}];
        state={side,zone:1.85,lane:receiverIndex===6?0:2,carrier:receiverIndex,ball:to,pending:{type:'first-touch',side,receiverIndex,passerIndex:takerIndex,target:to,zone:1.85,lane:receiverIndex===6?0:2},kickoff:false,lastPasser:takerIndex,lastPassTick:tick};return;
      }
      if(pending.type.endsWith('-setup')){setPieceSetup(tick,pending.type.replace('-setup',''),side,pending.lane??1);return;}
      if(pending.type==='cutback-control'){
        const receiver=playerAt(profile,pending.receiverIndex),impact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{controlPenalty:0,state:pitch};
        const settle={x:clamp(pending.target.x+direction*(.15+r()*.45),3,97),y:clamp(pending.target.y+(r()-.5)*(1.2+(impact.controlPenalty||0)*18),7,93)};
        addFrame(tick,{side,phase:'control',from:pending.target,to:settle,zone:pending.zone,lane:1,ownerIndex:pending.receiverIndex,ownerId:receiver.id,ballType:'cutback-control',surface:impact.state,...scoreSnapshot()});
        state={side,zone:pending.zone,lane:1,carrier:pending.receiverIndex,ball:settle,pending:{type:'shot-delivery',side,from:settle,zone:pending.zone,lane:1,shooterIndex:pending.receiverIndex,source:'open-play',assistIndex:pending.passerIndex},kickoff:false,lastPasser:pending.passerIndex,lastPassTick:tick-1};return;
      }
      if(pending.type==='open-cross-resolution'){
        const crossChance=clamp(.44+(profile.attack-opp.defence)*.005,.25,.67);
        if(r()<crossChance)resolveShot(tick,side,pending.target,3.78,1,pending.receiverIndex,'open-header',pending.passerIndex,.006);
        else{
          const clearTo=pointFor(otherSide(side),clock,1.25,Math.floor(r()*3));
          addFrame(tick,{side:otherSide(side),phase:'clearance',from:pending.target,to:clearTo,zone:1.25,lane:laneFromPoint(clearTo),ownerIndex:chooseCarrierIndex(.8,1,r),ballType:'clearance',outcome:'cleared',...scoreSnapshot()});
          if(r()<.25){stats[side].corners++;addEvent(tick,'chance',side,`${team.name}'s cross is cut out and goes behind for a corner.`);state={side,zone:3.7,lane:r()<.5?0:2,carrier:pending.passerIndex,ball:clearTo,pending:{type:'corner-setup',side,lane:r()<.5?0:2},kickoff:false};}
          else{addEvent(tick,'chance',side,`${team.name}'s cross is cleared away.`);turnover(tick,otherSide(side),clearTo,'clearance');}
        }return;
      }
      if(pending.type==='corner-delivery'){
        const short=pending.routine?.target==='Short',receiverIndex=short?chooseCarrierIndex(3.34,pending.lane,r,pending.takerIndex):chooseCarrierIndex(3.82,1,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex),delivery=pending.routine?.delivery||pick(['Inswinging','Outswinging','Driven'],r);
        addFrame(tick,{side,phase:short?'pass':'cross',setPiece:'corner',from:pending.origin,to:pending.target,zone:short?3.34:3.82,lane:short?pending.lane:1,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:short?'short-pass':delivery.toLowerCase().includes('driven')?'driven-cross':'high-cross',routinePositions:routinePositions(profile,pending.routine,side,clock),...scoreSnapshot()});
        addEvent(tick,'build-up',side,short?`${playerAt(profile,pending.takerIndex).name} works the corner short to ${receiver.name}.`:`${playerAt(profile,pending.takerIndex).name} swings the corner towards ${pending.routine?.target||'the penalty spot'}.`,{setPiece:'corner'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:short?'short-corner':'corner'});
        if(moveChains[side].length>6)moveChains[side].shift();
        if(short){
          state={side,zone:3.34,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:3.34,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
        }
        state.pending={type:'corner-outcome',side,lane:1,receiverIndex,target:pending.target,takerIndex:pending.takerIndex,routine:pending.routine};return;
      }
      if(pending.type==='corner-outcome'){
        const routineBonus=['Near Post','Far Post'].includes(pending.routine?.target) ? .018 : 0;
        if(r()<.57)resolveShot(tick,side,pending.target,3.86,1,pending.receiverIndex,'header',pending.takerIndex,routineBonus);
        else{
          const clearTo=pointFor(otherSide(side),clock,1.2,Math.floor(r()*3));
          addFrame(tick,{side:otherSide(side),phase:'clearance',setPiece:'corner',from:pending.target,to:clearTo,zone:1.2,lane:laneFromPoint(clearTo),ownerIndex:chooseCarrierIndex(.7,1,r),ballType:'clearance',outcome:'cleared',...scoreSnapshot()});
          addEvent(tick,'chance',side,`${team.name}'s corner is headed clear.` ,{setPiece:'corner'});turnover(tick,otherSide(side),clearTo,'clearance');
        }return;
      }
      if(pending.type==='free-kick-dangerous-delivery'){
        const direct=(pending.routine?.delivery||'Mixed')!=='Floated'&&r()<.62;
        if(direct){resolveShot(tick,side,pending.origin,3.35,pending.lane,pending.takerIndex,'free-kick',null,pending.routine?.target==='Top Corner'?.02:0);return;}
        const receiverIndex=chooseCarrierIndex(3.7,1,r,pending.takerIndex),target=pointFor(side,clock,3.78,1,0,(r()-.5)*16);
        addFrame(tick,{side,phase:'cross',setPiece:'free-kick-dangerous',from:pending.origin,to:target,zone:3.78,lane:1,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:playerAt(profile,receiverIndex).id,ballType:'free-kick-cross',routinePositions:routinePositions(profile,pending.routine,side,clock),...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} clips the free kick into the crowded area.`,{setPiece:'free-kick-dangerous'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:playerAt(profile,receiverIndex).name,receiverId:playerAt(profile,receiverIndex).id,type:'free-kick-cross'});
        if(moveChains[side].length>6)moveChains[side].shift();
        state.pending={type:'free-kick-header',side,target,receiverIndex,takerIndex:pending.takerIndex};return;
      }
      if(pending.type==='free-kick-header'){resolveShot(tick,side,pending.target,3.78,1,pending.receiverIndex,'header',pending.takerIndex,.012);return;}
      if(pending.type==='free-kick-delivery'){
        const receiverIndex=chooseCarrierIndex(clamp(state.zone+.65,0,3.2),pending.lane,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'pass',setPiece:'free-kick',from:pending.origin,to:pending.target,zone:zoneFromPoint(side,clock,pending.target),lane:pending.lane,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:'driven-pass',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} restarts play and finds ${receiver.name}.`,{setPiece:'free-kick'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:'free-kick'});
        if(moveChains[side].length>6)moveChains[side].shift();
        const z=zoneFromPoint(side,clock,pending.target);state={side,zone:z,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:z,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
      }
      if(pending.type==='throw-in-delivery'){
        const receiverIndex=chooseCarrierIndex(zoneFromPoint(side,clock,pending.target),pending.lane,r,pending.takerIndex),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'throw',setPiece:'throw-in',from:pending.origin,to:pending.target,zone:zoneFromPoint(side,clock,pending.target),lane:pending.lane,ownerIndex:pending.takerIndex,ownerId:playerAt(profile,pending.takerIndex).id,receiverIndex,receiverId:receiver.id,ballType:'throw',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${playerAt(profile,pending.takerIndex).name} throws to ${receiver.name}'s feet.`,{setPiece:'throw-in'});
        moveChains[side].push({tick,passer:playerAt(profile,pending.takerIndex).name,passerId:playerAt(profile,pending.takerIndex).id,receiver:receiver.name,receiverId:receiver.id,type:'throw-in'});
        if(moveChains[side].length>6)moveChains[side].shift();
        const z=zoneFromPoint(side,clock,pending.target);state={side,zone:z,lane:pending.lane,carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:pending.takerIndex,target:pending.target,zone:z,lane:pending.lane},kickoff:false,lastPasser:pending.takerIndex,lastPassTick:tick};return;
      }
      if(pending.type==='goal-kick-delivery'){
        const receiverIndex=chooseCarrierIndex(2.25,laneFromPoint(pending.target),r,0),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'goal-kick',setPiece:'goal-kick',from:pending.origin,to:pending.target,zone:2.25,lane:laneFromPoint(pending.target),ownerIndex:0,ownerId:profile.starters[0]?.id,receiverIndex,receiverId:receiver.id,ballType:'long-kick',...scoreSnapshot()});
        addEvent(tick,'build-up',side,`${profile.starters[0]?.name||'The goalkeeper'} sends the goal kick towards midfield.`,{setPiece:'goal-kick'});
        const success=r()<clamp(.58+(profile.midfield-opp.midfield)*.006,.36,.78);
        if(success){
          const keeper=profile.starters[0]||{id:null,name:'The goalkeeper'};
          moveChains[side].push({tick,passer:keeper.name,passerId:keeper.id,receiver:receiver.name,receiverId:receiver.id,type:'goal-kick'});
          if(moveChains[side].length>6)moveChains[side].shift();
          state={side,zone:2.25,lane:laneFromPoint(pending.target),carrier:receiverIndex,ball:pending.target,pending:{type:'first-touch',side,receiverIndex,passerIndex:0,target:pending.target,zone:2.25,lane:laneFromPoint(pending.target)},kickoff:false,lastPasser:0,lastPassTick:tick};
        }else turnover(tick,otherSide(side),pending.target,'aerial-duel');return;
      }
      if(pending.type==='penalty-delivery'){resolveShot(tick,side,pending.origin,4,1,pending.takerIndex,'penalty',null,.02);return;}
    };
    const normalAction=tick=>{
      const clock=clockFromTick(tick),side=state.side,profile=profileFor(side,hp,ap),opp=profileFor(otherSide(side),hp,ap),team=teamFor(side,home,away),sideLabel=team.name;
      const carrier=playerAt(profile,state.carrier),t=profile.tactics||{},live=aiAdjustment(profile,side==='home'?hg:ag,side==='home'?ag:hg,displayMinute(clock),dismissals[side]);
      const press=opp.tactical.pressing||50,technical=(profile.midfield*.55+profile.attack*.25+(carrier.ability||50)*.2);
      const environmentImpact=window.FLMatchEnvironment?FLMatchEnvironment.impactAtMinute(conditions,clock):{passPenalty:(pitch==='Muddy'?.025:pitch==='Frozen'?.035:0),controlPenalty:0,tacklePenalty:0,state:pitch,ballSpeed:1};
      const surfacePenalty=Number(environmentImpact.passPenalty||0),targetingFactor=1+reputation(carrier).targeted*.0035,incidentChance=clamp((.014+press*.00023+(live.tempo||50)*.00007+Number(environmentImpact.tacklePenalty||0)*.16)*(1.04+(eraOfficiating.challengeTolerance-1)*.20)*targetingFactor,.015,.068);
      if(r()<incidentChance){
        const defending=otherSide(side),fouler=selectFouler(defending),view=clamp(refereeProfile.perception*(.72+r()*.48),.18,.98),incidentRoll=r(),inBoxCandidate=eraRules.penalties&&state.zone>3.88&&r()<.12,dangerous=state.zone>3.05;
        addFrame(tick,{side,phase:'foul',from:state.ball,to:state.ball,zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'stopped',surface:environmentImpact.state,...scoreSnapshot()});
        if(incidentRoll<.055){
          const contextRoll=r(),context=contextRoll<.22?'baseless':contextRoll<.50?'reasonable':contextRoll<.76?'reasonable+':contextRoll<.90?'reasonable++':'reasonable+++',skill=simulationSkill(carrier),diverRep=reputation(carrier).diver,detection=clamp(view*eraOfficiating.simulationDetection+(70-skill)*.002+diverRep*.0022,.08,.98);
          const repeatedPulls=context==='reasonable+++'?3:0;
          let decision='play-on',evidence=context==='reasonable+++'?.93:context==='reasonable++'?.88:context==='reasonable+'?.49:context==='reasonable'?.20:.05;
          if(context==='baseless'&&r()<detection)decision='simulation';
          else if(context==='reasonable'&&r()<detection*.72)decision='simulation-warning';
          else if(context==='reasonable+'&&r()<.10)decision='defender-foul';
          else if(context==='reasonable++'&&r()<clamp(.60*view+.14,.28,.90))decision='defender-foul';
          else if(context==='reasonable+++')decision='defender-foul';
          if(inBoxCandidate){const reviewed=penaltyVARReview(tick,side,decision==='defender-foul'?'penalty':'no-penalty',evidence,`a possible foul on ${carrier.name}`);if(reviewed==='penalty')decision='defender-foul';else if(reviewed==='no-penalty'&&decision==='defender-foul')decision=context==='baseless'?'simulation':'play-on';}
          addEvent(tick,'simulation',side,`${carrier.name} goes to ground ${context==='baseless'?'with nobody close':context==='reasonable'?'after a challenge misses':context==='reasonable+'?'after slight contact':context==='reasonable++'?'after clear contact':'after being pulled three consecutive times'}.`,{playerId:carrier.id,player:carrier.name,defenderId:fouler.id,defender:fouler.name,context,decision,pulls:repeatedPulls});
          raiseTemperature(context==='baseless'?4:2,'simulation',tick,carrier,fouler);if(context==='baseless'||context==='reasonable')addReputation(carrier,'diver',context==='baseless'?3:1);if(context==='reasonable+++')addReputation(fouler,'hardMan',1.5);
          if(decision==='defender-foul'){
            const reason=context==='reasonable+++'?'persistent shirt pulling':'contact';stats[defending].fouls++;addEvent(tick,'foul',defending,context==='reasonable+++'?`${fouler.name} is penalised after pulling ${carrier.name}'s shirt three consecutive times.`:`${fouler.name} is penalised for the contact on ${carrier.name}.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,reason,pulls:repeatedPulls});
            if(context==='reasonable+'){
              // Exact requested sub-flow: the marginal incident is called 10% of the time;
              // inside that branch the defender is booked for dissent exactly 1 time in 5.
              if(r()<.20){addEvent(tick,'dissent',defending,`${fouler.name} argues back after the marginal foul decision.`,{playerId:fouler.id,player:fouler.name,decision:'marginal foul'});addReputation(fouler,'dissent',2);applyCard(tick,defending,fouler,{forceYellow:true,reason:'dissent'});}
            }else if(context==='reasonable+++')applyCard(tick,defending,fouler,{severity:.52,yellowChance:.30,reason:'persistent shirt pulling'});
            else applyCard(tick,defending,fouler,{severity:.48,yellowChance:.16,reason:'careless challenge'});
            maybeConfrontation(tick,fouler,carrier,.25,'diving accusation');state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;
          }
          if(decision==='simulation'||decision==='simulation-warning'){
            stats[side].fouls++;if(decision==='simulation')applyCard(tick,side,carrier,{forceYellow:true,reason:'simulation'});else showWarning(tick,side,carrier,'simulation');addEvent(tick,'foul',side,`${carrier.name} is penalised for simulation.`,{playerId:carrier.id,player:carrier.name,reason:'simulation'});maybeConfrontation(tick,carrier,fouler,.20,'diving accusation');state.pending={type:'free-kick-setup',side:defending,lane:state.lane};return;
          }
          if(context!=='reasonable+'||r()<.45)addEvent(tick,'play-on',null,'The referee waves play on.',{context});return;
        }
        if(incidentRoll<.255){
          const pulls=1+Math.floor(r()*4),pressure=.18+pulls*.24+r()*.28,obvious=pulls>=3||pressure>.92,seen=r()<clamp(view/eraOfficiating.pullTolerance,.16,.96);
          raiseTemperature(1+pulls*.8,'shirt pulling',tick,fouler,carrier);
          addEvent(tick,'shirt-pull',defending,pulls>=3?`${fouler.name} pulls ${carrier.name}'s shirt three consecutive times.`:`${fouler.name} tugs at ${carrier.name}'s shirt.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,pulls,pressure:+pressure.toFixed(2),incident:pulls>=3?'three-consecutive-pulls':'shirt-pull'});
          if(obvious&&seen){
            if(inBoxCandidate&&penaltyVARReview(tick,side,'penalty',clamp(.62+pulls*.07+pressure*.08,.72,.96),`the shirt pull on ${carrier.name}`)==='no-penalty'){addEvent(tick,'play-on',null,'The penalty is cancelled after the video review.',{reason:'shirt pull not conclusive'});return;}
            stats[defending].fouls++;addEvent(tick,'foul',defending,`The referee penalises ${fouler.name} for ${pulls>=3?'persistent ':''}shirt pulling.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,reason:'shirt pulling'});applyCard(tick,defending,fouler,{severity:clamp(.24+pressure*.30,0,1),yellowChance:pulls>=3?.30:.08,reason:pulls>=3?'persistent shirt pulling':'shirt pulling'});if(r()<.18)maybeDissent(tick,defending,fouler,'shirt-pull decision',.18);maybeConfrontation(tick,fouler,carrier,.38,'shirt pulling');state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;}
          if(seen&&pulls===1)addEvent(tick,'warning',defending,`The referee tells ${fouler.name} to release the shirt.`,{playerId:fouler.id,player:fouler.name,reason:'shirt pulling'});return;
        }
        const challengeSeverity=clamp(.18+r()*.70+(eraOfficiating.challengeTolerance-1)*.10+(storyline==='Physical battle'?.08:0),.10,1),hard=challengeSeverity>.58,fromBehind=r()<.16,ballFirst=r()<clamp(.54-(challengeSeverity-.45)*.28,.24,.62),callThreshold=.35*eraOfficiating.challengeTolerance,called=!ballFirst&&r()<clamp(view*(challengeSeverity/callThreshold)*.70,.12,.96)||hard&&challengeSeverity>.78*eraOfficiating.challengeTolerance&&r()<view*.78;
        raiseTemperature(hard?4+challengeSeverity*5:1.5,'challenge',tick,fouler,carrier);
        if(!called){if(hard&&r()<.68)addEvent(tick,'play-on',null,`${fouler.name} makes a heavy challenge, but the referee allows play to continue.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,severity:+challengeSeverity.toFixed(2),era:eraOfficiating.id});return;}
        const challengeEvidence=ballFirst?clamp(.20+challengeSeverity*.22,.22,.46):clamp(.53+challengeSeverity*.43,.58,.96);
        if(inBoxCandidate&&penaltyVARReview(tick,side,'penalty',challengeEvidence,`the challenge by ${fouler.name}`)==='no-penalty'){addEvent(tick,'play-on',null,'The penalty is overturned after the replay shows no clear foul.',{playerId:fouler.id,player:fouler.name,reason:'VAR overturn'});return;}
        stats[defending].fouls++;
        const reason=hard?'heavy challenge':fromBehind?'late challenge':'careless challenge';
        addEvent(tick,'foul',defending,`${carrier.name} is brought down by ${fouler.name} and the whistle goes.`,{playerId:fouler.id,player:fouler.name,fouledPlayerId:carrier.id,fouledPlayer:carrier.name,severity:+challengeSeverity.toFixed(2),reason,ballFirst});
        applyCard(tick,defending,fouler,{severity:challengeSeverity,forceRed:fromBehind&&challengeSeverity>.92,reason:fromBehind&&challengeSeverity>.72?'serious foul play':reason});
        if(r()<.12)maybeDissent(tick,defending,fouler,'foul decision',.15);if(hard)maybeConfrontation(tick,fouler,carrier,challengeSeverity,reason);
        state.pending={type:inBoxCandidate?'penalty-setup':dangerous?'free-kick-dangerous-setup':'free-kick-setup',side,lane:state.lane};return;
      }
      if(r()<.011){
        addFrame(tick,{side,phase:'out',from:state.ball,to:{...state.ball,y:state.lane===0?4.5:95.5},zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'out',surface:environmentImpact.state,...scoreSnapshot()});
        state.pending={type:'throw-in-setup',side:r()<.7?side:otherSide(side),lane:state.lane===1?(r()<.5?0:2):state.lane};return;
      }
      const advanced=state.zone>=3.22,wide=state.lane!==1;
      const shotChance=advanced?clamp(.075+(state.zone-3.2)*.16+(live.chanceVolume||50)*.00055,.07,.24):0;
      if(r()<shotChance){
        const direction=attackDirection(side,clock),setup={x:clamp(state.ball.x+direction*(.25+r()*.52),3,97),y:clamp(state.ball.y+(r()-.5)*(1.3+Number(environmentImpact.controlPenalty||0)*24),7,93)};
        const assistIndex=state.lastPasser!=null&&tick-state.lastPassTick<=9?state.lastPasser:null;
        addFrame(tick,{side,phase:'shot-setup',from:state.ball,to:setup,zone:state.zone,lane:state.lane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'control',surface:environmentImpact.state,...scoreSnapshot()});
        state.ball=setup;state.pending={type:'shot-delivery',side,from:setup,zone:state.zone,lane:state.lane,shooterIndex:state.carrier,source:'open-play',assistIndex};return;
      }
      const crossChance=advanced&&wide?clamp(.105+(t.width||50)*.0012,.12,.24):0;
      if(r()<crossChance){
        const cutback=state.zone>3.52&&r()<clamp(.23+(t.creativeFreedom||50)*.002,.25,.46);
        const target=cutback?pointFor(side,clock,3.42,1,0,(r()-.5)*9):pointFor(side,clock,3.78,1,0,(r()-.5)*15),receiverIndex=chooseCarrierIndex(cutback?3.42:3.8,1,r,state.carrier),receiver=playerAt(profile,receiverIndex);
        addFrame(tick,{side,phase:'cross',from:state.ball,to:target,zone:cutback?3.42:3.78,lane:1,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType:cutback?'cutback':r()<.45?'driven-cross':'high-cross',surface:environmentImpact.state,...scoreSnapshot()});
        addEvent(tick,'build-up',side,cutback?`${carrier.name} reaches the line and cuts the ball back towards ${receiver.name}.`:`${carrier.name} delivers from ${state.lane===0?'the left':'the right'} towards ${receiver.name}.`,{playerId:carrier.id,player:carrier.name,receiverId:receiver.id,receiver:receiver.name,passType:cutback?'cutback':'cross'});
        moveChains[side].push({tick,passer:carrier.name,passerId:carrier.id,receiver:receiver.name,receiverId:receiver.id,type:cutback?'cutback':'cross'});if(moveChains[side].length>6)moveChains[side].shift();
        state.pending=cutback?{type:'cutback-control',side,target,zone:3.42,receiverIndex,passerIndex:state.carrier}:{type:'open-cross-outcome',side,target,receiverIndex,passerIndex:state.carrier};return;
      }
      const underPressure=r()<clamp(.12+(press-50)*.004,.06,.34),direct=(t.passing||50)>62||((t.tempo||50)>65&&r()<.45)||(['victorian','interwar'].includes(conditions.era?.id)&&r()<.22),switchPlay=(t.width||50)>58&&r()<.12,through=state.zone>2.2&&r()<clamp(.05+(t.creativeFreedom||50)*.001,.07,.16),combination=state.zone>1.45&&state.zone<3.35&&r()<clamp(.035+(t.creativeFreedom||50)*.0011,.065,.145);
      const carryChance=clamp(.26+(t.creativeFreedom||50)*.001-(press||50)*.0014-Number(environmentImpact.controlPenalty||0)*.36,.14,.34);
      if(r()<carryChance){
        const delta=clamp(.09+r()*.18+(t.tempo-50)*.001,.08,.30),newZone=clamp(state.zone+delta,0,4),newLane=r()<.16?clamp(state.lane+(r()<.5?-1:1),0,2):state.lane,to=pointFor(side,clock,newZone,newLane,(r()-.5)*2,(r()-.5)*6);
        const tackleChance=clamp(.045+(press-50)*.0014+(opp.defence-technical)*.0012+Number(environmentImpact.tacklePenalty||0)+Number(environmentImpact.controlPenalty||0)*.22,.025,.18);
        if(r()<tackleChance){
          addFrame(tick,{side,phase:'carry',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'dribble',outcome:'tackled',surface:environmentImpact.state,...scoreSnapshot()});
          turnover(tick,otherSide(side),to,'tackle');
        }else{
          addFrame(tick,{side,phase:'carry',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,ballType:'dribble',surface:environmentImpact.state,...scoreSnapshot()});
          if(newZone>2.8&&r()<.12)addEvent(tick,'build-up',side,`${carrier.name} carries the ball into attacking territory.`,{playerId:carrier.id,player:carrier.name});
          state.zone=newZone;state.lane=newLane;state.ball=to;
        }return;
      }
      let passType='short',zoneDelta=.18+(r()-.35)*.38,newLane=state.lane;
      if(underPressure&&r()<.55){passType='back';zoneDelta=-.45-r()*.2;}
      else if(switchPlay){passType='switch';zoneDelta=.08+r()*.18;newLane=state.lane===0?2:state.lane===2?0:(r()<.5?0:2);}
      else if(through){passType='through';zoneDelta=.65+r()*.45;newLane=r()<.5?state.lane:1;}
      else if(combination){passType='one-two';zoneDelta=.27+r()*.32;newLane=r()<.72?state.lane:1;}
      else if(direct&&r()<.62){passType=r()<.28?'clipped':'driven';zoneDelta=.45+r()*.55;newLane=r()<.3?Math.floor(r()*3):state.lane;}
      const newZone=clamp(state.zone+zoneDelta,0,4),receiverIndex=chooseCarrierIndex(newZone,newLane,r,state.carrier),receiver=playerAt(profile,receiverIndex),to=pointFor(side,clock,newZone,newLane,(r()-.5)*2,(r()-.5)*6);
      const distance=Math.hypot(to.x-state.ball.x,to.y-state.ball.y),baseDifficulty={through:.075,switch:.065,driven:.045,clipped:.055,'one-two':.026,back:.012,short:.018}[passType]??.018,difficulty=baseDifficulty+distance*.00065;
      const backPassAdjustment=passType==='back'&&!eraRules.backPassAllowed?.035:0;
      const failChance=clamp(.045+difficulty+(press-50)*.0012+(50-technical)*.0011+surfacePenalty+backPassAdjustment,.025,.285);
      const offsideMultiplier=Number(eraRules.offsideDefendersRequired||2)>=3?1.35:1;
      const offside=passType==='through'&&newZone>3.45&&r()<clamp((.045+(100-(profile.attack||50))*.0004)*offsideMultiplier,.035,.13);
      const ballType={switch:'lofted-switch',through:'through-ball',driven:'driven-pass',clipped:'clipped-pass','one-two':'combination-pass',back:'short-pass',short:'short-pass'}[passType]||'short-pass';
      if(offside){
        stats[side].offsides++;
        addFrame(tick,{side,phase:'pass',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType:'through-ball',outcome:'offside',surface:environmentImpact.state,...scoreSnapshot()});
        addEvent(tick,'offside',side,`${receiver.name} goes too soon. The flag is raised for offside.`,{playerId:receiver.id,player:receiver.name});
        const defending=otherSide(side);state={side:defending,zone:zoneFromPoint(defending,clock,to),lane:newLane,carrier:4,ball:to,pending:{type:'free-kick-setup',side:defending,lane:newLane},kickoff:false,lastPasser:null,lastPassTick:-99};return;
      }
      if(r()<failChance){
        const intercept={x:state.ball.x+(to.x-state.ball.x)*(.48+r()*.28),y:state.ball.y+(to.y-state.ball.y)*(.48+r()*.28)};
        addFrame(tick,{side,phase:'pass',from:state.ball,to:intercept,zone:zoneFromPoint(side,clock,intercept),lane:laneFromPoint(intercept),ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType,outcome:'intercepted',surface:environmentImpact.state,...scoreSnapshot()});
        turnover(tick,otherSide(side),intercept,'interception');return;
      }
      addFrame(tick,{side,phase:'pass',from:state.ball,to,zone:newZone,lane:newLane,ownerIndex:state.carrier,ownerId:carrier.id,receiverIndex,receiverId:receiver.id,ballType,surface:environmentImpact.state,...scoreSnapshot()});
      if(passType!=='short'||newZone>2.75||r()<.07)addEvent(tick,'build-up',side,commentaryForPass(passType,carrier,receiver,sideLabel,newLane,newZone>2.75),{playerId:carrier.id,player:carrier.name,receiverId:receiver.id,receiver:receiver.name,passType});
      moveChains[side].push({tick,passer:carrier.name,passerId:carrier.id,receiver:receiver.name,receiverId:receiver.id,type:passType});if(moveChains[side].length>6)moveChains[side].shift();
      state={side,zone:newZone,lane:newLane,carrier:receiverIndex,ball:to,pending:{type:'first-touch',side,receiverIndex,passerIndex:state.carrier,target:to,zone:newZone,lane:newLane},kickoff:false,lastPasser:state.carrier,lastPassTick:tick};
    };
    for(let tick=0;tick<MATCH_TOTAL_TICKS;tick++){
      const clock=clockFromTick(tick);
      if(tick===0){
        const taker=playerAt(hp,8),from={x:50,y:50};
        addFrame(tick,{side:'home',phase:'set-piece-setup',setPiece:'kickoff',from,to:from,zone:2,lane:1,ownerIndex:8,ownerId:taker.id,receiverIndex:6,receiverId:playerAt(hp,6).id,ballType:'stationary',...scoreSnapshot()});
        state={side:'home',zone:2,lane:1,carrier:8,ball:from,pending:{type:'kickoff',side:'home',opening:true},kickoff:true,lastPasser:null,lastPassTick:-99};snapshotStats(tick);momentum.push({minute:0,value:0});continue;
      }
      if(tick===45*MATCH_TICKS_PER_MINUTE){
        const taker=playerAt(ap,8),from={x:50,y:50};
        addFrame(tick,{side:'away',phase:'set-piece-setup',setPiece:'kickoff',from,to:from,zone:2,lane:1,ownerIndex:8,ownerId:taker.id,receiverIndex:7,receiverId:playerAt(ap,7).id,ballType:'stationary',...scoreSnapshot()});
        state={side:'away',zone:2,lane:1,carrier:8,ball:from,pending:{type:'kickoff',side:'away',secondHalf:true},kickoff:true,lastPasser:null,lastPassTick:-99};snapshotStats(tick);momentum.push({minute:45,value:Math.round(clamp(pressureWindow,-45,45))});continue;
      }
      if(state.pending){const pending=state.pending;state.pending=null;resolvePending(tick,pending);}
      else normalAction(tick);
      if(state.pending?.type==='open-cross-outcome'){
        // handled on the next simulation tick by converting to a standard pending action below
      }
      if(state.pending&&state.pending.type==='open-cross-outcome'){
        const original=state.pending;
        state.pending={...original,type:'open-cross-resolution'};
      }
      if(state.pending&&state.pending.type==='open-cross-resolution'){
        // leave queued for next tick
      }
      if(tick%MATCH_TICKS_PER_MINUTE===0){
        if(matchTemperature>18)matchTemperature=Math.max(18,matchTemperature-.32);
        updatePossession();momentum.push({minute:Math.floor(clock),value:Math.round(clamp(pressureWindow,-48,48))});snapshotStats(tick);
      }
      if(r()<incidentChance/MATCH_TOTAL_TICKS){
        const periodIncidents=hooliganism==='crisis'?['Crowd disorder behind one goal forces a lengthy delay.','Objects are thrown from a terrace and the referee temporarily stops play.','Mounted police move between rival groups as play is held up.','A pitch incursion forces both teams towards the centre circle.']:hooliganism==='rising'?['A brief pitch invasion delays the restart.','Police separate rival groups behind the terrace.','A disturbance near the turnstiles delays the second half.']:['A dog has run onto the pitch and play is stopped.','A spectator has wandered across the touchline.','The match ball has burst and a replacement is required.','A brief pitch invasion delays the restart.'];
        const incident=pick(periodIncidents,r);
        addEvent(tick,'incident',null,incident);crowdMood='Amused';
      }
    }
    // Resolve any open-cross frame types that were queued by normal play but not consumed by a named branch.
    for(let i=0;i<frames.length;i++){
      if(frames[i].phase==='cross'&&!frames[i].setPiece){
        const next=frames[i+1];
        if(next&&next.tick===frames[i].tick+1)continue;
      }
    }
    updatePossession();snapshotStats(MATCH_TOTAL_TICKS);
    events.sort((a,b)=>eventClock(a)-eventClock(b)||({incident:0,'set-piece':1,kickoff:2,foul:3,turnover:4,'build-up':5,chance:6,goal:7}[a.type]??8)-({incident:0,'set-piece':1,kickoff:2,foul:3,turnover:4,'build-up':5,chance:6,goal:7}[b.type]??8));
    const attendance=Math.round((home.capacity||12000)*clamp(.38+home.strength*.09+r()*.14,.35,.96));
    const pitchWear=window.FLMatchEnvironment?FLMatchEnvironment.wearMap(frames,conditions):[];
    const setPieceSources=new Set(['corner','free-kick','header','penalty']);
    const setPieceSummary={home:{corners:stats.home.corners,shots:frames.filter(x=>x.side==='home'&&['shot','header'].includes(x.phase)&&setPieceSources.has(x.source)).length,goals:events.filter(x=>x.side==='home'&&x.type==='goal'&&setPieceSources.has(x.source)).length},away:{corners:stats.away.corners,shots:frames.filter(x=>x.side==='away'&&['shot','header'].includes(x.phase)&&setPieceSources.has(x.source)).length,goals:events.filter(x=>x.side==='away'&&x.type==='goal'&&setPieceSources.has(x.source)).length}};
    const record={id:`match-${f.id}-${f.date}`,engineVersion:'2.3',ticksPerMinute:MATCH_TICKS_PER_MINUTE,totalTicks:MATCH_TOTAL_TICKS,fixtureId:f.id,date:f.date,competition:f.competition||(window.FLTimeline?FLTimeline.activeCompetitionName(game):'Football League'),round:f.round,homeId:home.id,awayId:away.id,homeName:home.name,awayName:away.name,homeGoals:hg,awayGoals:ag,weather,pitch,conditions,pitchWear,presentationEra:conditions.era,setPieceSummary,attendance,stats,statsTimeline,events,frames,momentum,storyline,atmosphere:{start:'Anticipation',final:crowdMood},officiating:{year:matchYear,era:eraOfficiating.id,varActive,referee:{control:+refereeProfile.control.toFixed(2),perception:+refereeProfile.perception.toFixed(2),strictness:+refereeProfile.strictness.toFixed(2)},temperature:{start:temperatureHistory[0].value,peak:+matchTemperaturePeak.toFixed(1),final:+matchTemperature.toFixed(1),history:temperatureHistory}},teamProfiles:{home:hp,away:ap},tacticalSummary:{home:hp.tactical,away:ap.tactical},substitutions:[],notableIncidents:events.filter(e=>e.type==='incident')};
    // Player records are committed at full time so all eleven starters and any
    // user-made substitutions receive the correct appearance and minutes.
    applyResult(game,f,record);rememberMatch(game,record);
    return record;
  }
  function simulateMatchday(game,controlledFixture){
    const record=simulateDetailedMatch(game,controlledFixture);
    const sameCompetition=f=>controlledFixture.competitionId==='english-cup'?f.competitionId==='english-cup':(f.divisionId===controlledFixture.divisionId&&f.competitionId===controlledFixture.competitionId);
    const related=game.fixtures.filter(f=>f.date===controlledFixture.date&&!f.played&&f.id!==controlledFixture.id&&sameCompetition(f));
    related.forEach(f=>simulateFixture(game,f));
    record.otherResults=game.fixtures.filter(f=>f.date===controlledFixture.date&&f.id!==controlledFixture.id&&f.played&&sameCompetition(f)).map(f=>({fixtureId:f.id,homeName:club(game,f.home)?.name||f.home,awayName:club(game,f.away)?.name||f.away,homeGoals:f.homeGoals,awayGoals:f.awayGoals}));
    compactMatchRecords(game);game.activeMatchId=record.id;return record;
  }

  function table(game,divisionId){
    if(window.FLPyramid)return FLPyramid.table(game,divisionId);
    return [...game.clubs].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.name.localeCompare(b.name));
  }
  function allTables(game){return window.FLPyramid?FLPyramid.allTables(game):[{division:{id:'football-league',name:'Football League',tier:1},table:table(game)}]}
  function currentRules(game){return window.FLTimeline?FLTimeline.currentRules(game):{pointsForWin:2,substitutionsAllowed:3,benchSize:7};}
  function currentCompetition(game){return window.FLPyramid?FLPyramid.competitionForClub(game,game.controlledClubId):(window.FLTimeline?FLTimeline.currentCompetition(game):{id:'football-league',name:'Football League',official:true});}
  return {create,createWorld,fastForwardToYear,attachManager,createStartYear,clubHistorySummary,club,controlledClub,nextFixture,fixtureOn,advanceDay,table,allTables,teamProfile,simulateDetailedMatch,simulateMatchday,finalizeMatchStats,currentRules,currentCompetition,makePyramidSchedule,repairWorldBalance,compactMatchRecords};
})();
