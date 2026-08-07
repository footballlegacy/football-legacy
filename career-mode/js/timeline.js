window.FLTimeline = (() => {
  const data = window.FLTimelineData || {events:[],clubSeeds:[],legendArchetypes:[],namePools:{}};
  const legendArchetypes=(()=>{const rows=[...(data.legendArchetypes||[]),...(window.FLPyramidData?.legendArchetypes||[])],seen=new Set();return rows.filter(a=>a&&a.id&&!seen.has(a.id)&&seen.add(a.id));})();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const seeded=seed=>{let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
  const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
  const yearOf=date=>Number(String(date||'1888').slice(0,4))||1888;
  const activeCompetitionName=game=>game.worldState?.seasonCompetition?.name||'Football League';

  function baseRules(){return {pointsForWin:2,offsideDefendersRequired:3,penalties:false,substitutionsAllowed:0,benchSize:0,substitutionsReason:'none',cards:false,cardsPrepared:false,backPassAllowed:true,shirtNumbers:false,squadNumbers:false,eveningFixtures:false,goalLineTechnology:false,var:false,automaticPromotion:false,transferWindows:false,bosman:false,financialFairPlay:false,allSeaterTopFlight:false,independentRegulator:false,heritageProtection:false};}
  function baseModifiers(){return {attendance:1,youthQuality:1,finance:1,goalRate:1,injuryRisk:1,control:1,commercialGrowth:0,continentalGrowth:0,internationalGrowth:0,transferInflation:1,wageInflation:1,foreignRecruitment:1,pressingEffect:1,financialScrutiny:1,stadiumCosts:1};}
  function ensure(game,options={}){
    if(!game.worldState||typeof game.worldState!=='object')game.worldState={};
    const w=game.worldState;
    w.processedEventIds=Array.isArray(w.processedEventIds)?w.processedEventIds:[];
    w.worldEvents=Array.isArray(w.worldEvents)?w.worldEvents:[];
    w.clubDirectory=Array.isArray(w.clubDirectory)?w.clubDirectory:[];
    w.competitions=Array.isArray(w.competitions)?w.competitions:[];
    w.awards=Array.isArray(w.awards)?w.awards:[];
    w.legendProspects=Array.isArray(w.legendProspects)?w.legendProspects:[];
    w.generatedArchetypes=Array.isArray(w.generatedArchetypes)?w.generatedArchetypes:[];
    w.obituaries=Array.isArray(w.obituaries)?w.obituaries:[];
    w.rules={...baseRules(),...(w.rules||{})};
    w.modifiers={...baseModifiers(),...(w.modifiers||{})};
    w.technology=w.technology||{};w.social=w.social||{};w.formats=w.formats||{};w.wars=w.wars||{};
    w.era=w.era||'Victorian Foundations';w.leagueStructure=w.leagueStructure||'one-division';
    w.officialLeagueSuspended=Boolean(w.officialLeagueSuspended);w.continentalEligibility=w.continentalEligibility!==false;
    w.seasonCompetition=w.seasonCompetition||{id:'football-league',name:'Football League',official:true};
    game.deceasedPlayers=Array.isArray(game.deceasedPlayers)?game.deceasedPlayers:[];
    game.retiredPlayers=Array.isArray(game.retiredPlayers)?game.retiredPlayers:[];
    game.globalPlayers=Array.isArray(game.globalPlayers)?game.globalPlayers:[];
    game.news=Array.isArray(game.news)?game.news:[];game.history=Array.isArray(game.history)?game.history:[];game.inbox=Array.isArray(game.inbox)?game.inbox:[];
    const current=String(game.date||'1888-08-15');
    data.clubSeeds.filter(c=>c.founded<=current).forEach(seed=>registerClub(game,seed,false));
    if(options.bootstrap!==false){
      data.events.filter(e=>e.date<=current&&!w.processedEventIds.includes(e.id)).forEach(e=>applyEvent(game,e,{silent:true,bootstrap:true}));
    }
    game.version='0.22.6';
    return w;
  }

  function registerClub(game,seed,announce=true){
    const w=game.worldState&&Array.isArray(game.worldState.clubDirectory)?game.worldState:ensure(game,{bootstrap:false});
    if(w.clubDirectory.some(c=>c.id===seed.id))return w.clubDirectory.find(c=>c.id===seed.id);
    const leagueEntryDate=`${Number(seed.leagueEntry||9999)}-07-01`;
    const entry={...seed,status:String(game.date||'1888-08-15')>=leagueEntryDate?'league-member':'regional',registeredDate:seed.founded};
    w.clubDirectory.push(entry);
    if(announce){
      addWorldRecord(game,{date:seed.founded,category:'club',title:`${seed.name} are founded`,summary:`A new club is established in ${seed.location}. League admission is scheduled for ${seed.leagueEntry}.`});
      game.news.unshift({date:seed.founded,headline:`New club founded: ${seed.name}`});
    }
    return entry;
  }

  function addWorldRecord(game,event){
    const w=ensure(game,{bootstrap:false});
    const row={id:event.id||`world-${event.date}-${hash(event.title)}`,date:event.date,category:event.category||'world',title:event.title,summary:event.summary||event.text||''};
    if(!w.worldEvents.some(x=>x.id===row.id))w.worldEvents.push(row);
    if(!game.history.some(x=>x.id===row.id))game.history.push({id:row.id,date:row.date,type:'world',category:row.category,title:row.title,text:row.summary});
  }

  function activateCompetition(w,payload){
    const list=Array.isArray(payload)?payload:[payload];
    list.filter(Boolean).forEach(c=>{const existing=w.competitions.find(x=>x.id===c.id);if(existing)Object.assign(existing,c,{active:true});else w.competitions.push({...c,active:true})});
  }
  function deactivateCompetition(w,payload){
    const ids=Array.isArray(payload)?payload:[payload];ids.filter(Boolean).forEach(id=>{const c=w.competitions.find(x=>x.id===id);if(c)c.active=false});
  }
  function renameCompetition(w,payload){
    const list=Array.isArray(payload)?payload:[payload];list.filter(Boolean).forEach(x=>{const c=w.competitions.find(y=>y.id===x.id);if(c)c.name=x.name});
  }
  function applyFormat(w,payload){
    const list=Array.isArray(payload)?payload:[payload];list.filter(Boolean).forEach(x=>{w.formats[x.id]={...(w.formats[x.id]||{}),...x}});
  }

  function applyEvent(game,event,options={}){
    const w=ensure(game,{bootstrap:false});
    if(w.processedEventIds.includes(event.id))return {event,applied:false};
    const fx=event.effects||{};
    if(fx.era)w.era=fx.era;
    if(fx.tacticalEra)w.tacticalEra=fx.tacticalEra;
    if(fx.rules)Object.assign(w.rules,fx.rules);
    if(fx.modifier)Object.assign(w.modifiers,fx.modifier);
    if(fx.technology)Object.assign(w.technology,fx.technology);
    if(fx.social)Object.assign(w.social,fx.social);
    if(fx.activateCompetition)activateCompetition(w,fx.activateCompetition);
    if(fx.deactivateCompetition)deactivateCompetition(w,fx.deactivateCompetition);
    if(fx.renameCompetition)renameCompetition(w,fx.renameCompetition);
    if(fx.competitionFormat)applyFormat(w,fx.competitionFormat);
    if(fx.activateAward){const list=Array.isArray(fx.activateAward)?fx.activateAward:[fx.activateAward];list.forEach(a=>{if(!w.awards.some(x=>x.id===a.id))w.awards.push({...a,active:true,from:event.date})})}
    if(fx.leagueStructure)w.leagueStructure=fx.leagueStructure;
    if(fx.continentalEligibility!==undefined)w.continentalEligibility=Boolean(fx.continentalEligibility);
    if(fx.warStart){w.wars[fx.warStart.id]={...fx.warStart,active:true,startDate:event.date,mobilised:false,resolved:false}}
    if(fx.warMobilisation)mobilisePlayers(game,fx.warMobilisation,event.date);
    if(fx.warEnd)resolveWar(game,fx.warEnd,event.date);
    if(fx.suspendOfficialLeague){w.officialLeagueSuspended=true;w.scheduleRebuildRequested=Boolean(fx.rebuildSchedule);w.scheduleRebuildReason=event.id}
    if(fx.resumeOfficialLeague){w.officialLeagueSuspended=false;w.scheduleRebuildRequested=Boolean(fx.rebuildSchedule);w.scheduleRebuildReason=event.id}
    if(fx.activateCompetition&&fx.suspendOfficialLeague){const c=(Array.isArray(fx.activateCompetition)?fx.activateCompetition[0]:fx.activateCompetition);w.seasonCompetition={id:c.id,name:c.name,official:false}}
    if(fx.resumeOfficialLeague)w.seasonCompetition=yearOf(event.date)>=1992?{id:'premier-league',name:'Premier League',official:true}:{id:'football-league',name:'Football League',official:true};
    w.processedEventIds.push(event.id);
    addWorldRecord(game,event);
    data.clubSeeds.filter(c=>c.founded===event.date).forEach(seed=>registerClub(game,seed,!options.silent));
    if(!options.silent){
      game.news.unshift({date:event.date,headline:event.title});
      game.inbox.unshift({id:`timeline-${event.id}`,date:event.date,from:'Football Chronicle',subject:event.title,body:event.summary,read:false});
    }
    return {event,applied:true,rebuildSchedule:Boolean(w.scheduleRebuildRequested)};
  }

  function processDate(game,previousDate,currentDate){
    const w=ensure(game);const due=data.events.filter(e=>e.date>previousDate&&e.date<=currentDate&&!w.processedEventIds.includes(e.id));
    const applied=due.map(e=>applyEvent(game,e));
    data.clubSeeds.filter(c=>c.founded>previousDate&&c.founded<=currentDate).forEach(seed=>registerClub(game,seed,true));
    w.clubDirectory.forEach(c=>{const entryDate=`${Number(c.leagueEntry||9999)}-07-01`;if(c.status!=='league-member'&&entryDate>previousDate&&entryDate<=currentDate){c.status='league-member';addWorldRecord(game,{id:`league-entry-${c.id}`,date:entryDate,category:'club',title:`${c.name} enter the Football League`,summary:`The club moves from regional football into the national league structure.`});game.news.unshift({date:entryDate,headline:`${c.name} admitted to the Football League`})}});
    return {applied,rebuildSchedule:Boolean(w.scheduleRebuildRequested),reason:w.scheduleRebuildReason||null};
  }

  function mobilisePlayers(game,warId,date){
    const w=ensure(game,{bootstrap:false});const war=w.wars[warId]||(w.wars[warId]={id:warId,active:true,startDate:date});if(war.mobilised)return;
    const r=seeded(hash(`${game.meta?.seed||1}-${warId}-mobilisation`));
    game.clubs.forEach(team=>{
      team.players=Array.isArray(team.players)?team.players:[];
      if(team.lightweightState==='aggregate'&&team.players.length===0&&team.id!==game.controlledClubId)return;
      team.players.forEach(player=>{
        if(player.age<18||player.age>40||player.status==='deceased')return;
        const serveChance=warId==='ww1'?0.68:0.58,roll=r();
        const status=roll<serveChance?'Overseas service':roll<serveChance+.16?'Home service':'Exempt or reserved occupation';
        player.serviceRecords=Array.isArray(player.serviceRecords)?player.serviceRecords:[];
        player.serviceRecords.push({warId,status,from:date,to:null,outcome:null});
        if(status==='Overseas service'){player.unavailableReason='Military service';player.available=false}
      });
      let available=team.players.filter(p=>p.available!==false&&p.status!=='deceased'&&p.status!=='retired').length,index=1;
      while(available<14){
        const age=r()<.58?15+Math.floor(r()*3):36+Math.floor(r()*9),ability=clamp(30+team.strength*4+Math.floor(r()*12),30,58);
        team.players.push({id:`${team.id}-${warId}-guest-${index++}`,name:`${pick(FLData.firstNames,r)} ${pick(FLData.lastNames,r)}`,clubId:team.id,position:pick(FLData.positions,r),age,condition:82+Math.floor(r()*16),form:'—',ability,potential:ability+Math.floor(r()*5),ceiling:ability+Math.floor(r()*7),developmentCurve:'steady',developmentMomentum:0,personalityProfile:{professionalism:45,ambition:35,loyalty:70,leadership:40,bigMatches:40,consistency:45,injuryProneness:45,temperament:50,teamwork:65,determination:58,adaptability:55},personalityLabel:'Wartime Volunteer',wage:1,appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},wartimeGuestFor:warId,available:true});
        available++;
      }
    });
    war.mobilised=true;
  }

  function playerSnapshot(player,team,game){
    const honours=(player.honours||[]).slice(-12),controlled=Boolean(game&&team.id===game.controlledClubId);
    const notable=Boolean(player.legendArchetype||honours.length||controlled);
    const row={id:player.id,name:player.name,nationality:player.nationality||'English',position:player.position,age:Number(player.age)||0,birthYear:Number.isFinite(Number(player.birthYear))?Number(player.birthYear):null,generatedYear:Number.isFinite(Number(player.generatedYear))?Number(player.generatedYear):null,status:player.status||'retired',retiredDate:player.retiredDate||null,deceasedDate:player.deceasedDate||null,lastClubId:team.id,lastClubName:team.name,careerRecordProfile:player.careerRecordProfile||'standard',careerTotals:{appearances:Number(player.careerTotals?.appearances||player.appearances)||0,goals:Number(player.careerTotals?.goals||player.goals)||0,assists:Number(player.careerTotals?.assists||player.assists)||0,cleanSheets:Number(player.careerTotals?.cleanSheets||player.cleanSheets)||0}};
    if(honours.length)row.honours=honours;
    if(player.legendArchetype){row.legendArchetype=player.legendArchetype;row.archetypeLabel=player.archetypeLabel||null;row.bestAbility=Number(player.ability)||0;}
    if(Array.isArray(player.seasonHistory)&&player.seasonHistory.length)row.seasonHistory=player.seasonHistory.slice(-50);
    if(Array.isArray(player.clubHistory)&&player.clubHistory.length)row.clubHistory=player.clubHistory.map((spell,index,all)=>({...spell,to:index===all.length-1&&spell.to==='Present'?(player.retiredDate?yearOf(player.retiredDate):yearOf(game?.date)):spell.to}));
    return row;
  }
  function obituary(game,player,team,date,cause){
    if(team.id!==game.controlledClubId)return null;
    const w=ensure(game,{bootstrap:false}),apps=player.careerTotals?.appearances||player.appearances||0,goals=player.careerTotals?.goals||player.goals||0;
    const row={id:`obit-${player.id}-${date}`,date,playerId:player.id,name:player.name,age:player.age,clubId:team.id,club:team.name,apps,goals,cause,title:`${player.name} (${Math.max(1800,yearOf(date)-player.age)}–${yearOf(date)})`,text:`${team.name} mourn the death of ${player.name}, who made ${apps} recorded appearances and scored ${goals} goals. ${cause}`};
    if(!w.obituaries.some(x=>x.id===row.id))w.obituaries.unshift(row);
    if(!game.inbox.some(x=>x.id===row.id))game.inbox.unshift({id:row.id,date,from:'Club Secretary',subject:`In remembrance: ${player.name}`,body:row.text,read:false});
    return row;
  }

  function resolveWar(game,warId,date){
    const w=ensure(game,{bootstrap:false}),war=w.wars[warId]||(w.wars[warId]={id:warId});if(war.resolved)return;
    const r=seeded(hash(`${game.meta?.seed||1}-${warId}-return`)),fatal=warId==='ww1'?0.032:0.018,injury=warId==='ww1'?0.115:0.085,retire=0.055;
    game.clubs.forEach(team=>{
      team.players=Array.isArray(team.players)?team.players:[];
      if(team.lightweight&&team.players.length===0&&team.id!==game.controlledClubId)return;
      const survivors=[];
      let guestCount=0;
      team.players.forEach(player=>{
        if(player.wartimeGuestFor===warId){guestCount++;return}
        const record=[...(player.serviceRecords||[])].reverse().find(x=>x.warId===warId&&x.status==='Overseas service');
        if(!record){survivors.push(player);return}
        const roll=r();record.to=date;player.available=true;player.unavailableReason=null;
        if(roll<fatal){record.outcome='Killed during military service';player.status='deceased';player.deceasedDate=date;game.deceasedPlayers.push(playerSnapshot(player,team,game));obituary(game,player,team,date,record.outcome);return}
        if(roll<fatal+injury){
          const severe=r()<.24,loss=severe?8+Math.floor(r()*8):2+Math.floor(r()*7),name=severe?pick(['Loss of a leg','Loss of an arm','Severe blast injury','Permanent loss of sight in one eye'],r):pick(['Leg wound','Reduced mobility','Chronic breathing difficulty','Shoulder injury'],r);
          record.outcome=severe?'Returned with a career-ending service injury':'Returned with a permanent service injury';player.warInjury={warId,name,abilityLoss:loss,severe};player.ability=clamp(player.ability-loss,28,98);player.ceiling=clamp(player.ceiling-Math.ceil(loss/2),player.ability,98);player.condition=severe?40:65;
          if(severe){player.status='retired';player.retiredDate=date;player.careerEndedByWar=true;const snapshot=playerSnapshot(player,team,game);snapshot.warInjury={...player.warInjury};game.retiredPlayers.push(snapshot);if(window.FLLivingWorld)FLLivingWorld.queueWarReturnDecision(game,{warId,player,club:team,injury:player.warInjury});addWorldRecord(game,{id:`service-injury-retirement-${player.id}`,date,category:'player',title:`${player.name}'s playing career ends after service`,summary:`${player.name} returns to ${team.name} with ${name.toLowerCase()} and cannot resume his playing career.`});return}
          survivors.push(player);return
        }
        if(roll<fatal+injury+retire){record.outcome='Retired after military service';player.status='retired';player.retiredDate=date;game.retiredPlayers.push(playerSnapshot(player,team,game));addWorldRecord(game,{id:`service-retirement-${player.id}`,date,category:'player',title:`${player.name} retires after service`,summary:`The ${player.age}-year-old does not return to competitive football after ${warId==='ww1'?'the First World War':'the Second World War'}.`});return}
        record.outcome='Returned to football';survivors.push(player);
      });
      team.players=survivors;
      if(guestCount)addWorldRecord(game,{id:`wartime-guests-released-${warId}-${team.id}`,date,category:'player',title:`${team.name} release wartime registrations`,summary:`${guestCount} temporary wartime player${guestCount===1?'':'s'} leave the club as normal football prepares to return.`});
    });
    war.active=false;war.resolved=true;war.endDate=date;
  }

  function seasonContext(game,startYear){
    const w=ensure(game);
    const wartime=(startYear>=1915&&startYear<=1918)||(startYear>=1939&&startYear<=1945)||w.officialLeagueSuspended;
    const modernTop=startYear>=1992;
    return wartime?{id:startYear>=1939?'ww2-regional':'ww1-regional',name:'Wartime Regional League',official:false,rounds:1,startMonthDay:'09-14'}:{id:modernTop?'premier-league':'football-league',name:modernTop?'Premier League':'Football League',official:true,rounds:2,startMonthDay:'09-08'};
  }

  function makeYouth(game,team,startYear,r,index,intake={}){
    const worldQuality=Number(game.worldState?.modifiers?.youthQuality||1),war=game.worldState?.officialLeagueSuspended;
    const abilityBonus=Number(intake.abilityBonus||0),potentialBonus=Number(intake.potentialBonus||0);
    const age=16+Math.floor(r()*3),base=clamp(34+team.strength*6+Math.floor(r()*15)+Math.round((worldQuality-1)*10)+abilityBonus,32,88),ceiling=clamp(base+9+Math.floor(r()*20)+potentialBonus,base,98);
    const player={id:`${team.id}-y${startYear}-${index}-${Math.floor(r()*99999)}`,name:window.FLEraIdentity?FLEraIdentity.generatedName('English',startYear-age+18,Math.floor(r()*4294967295)):`${pick(FLData.firstNames,r)} ${pick(FLData.lastNames,r)}`,clubId:team.id,nationality:'English',birthYear:startYear-age,generatedYear:startYear,position:pick(FLData.positions,r),age,condition:90,form:'—',ability:base,potential:Math.round(base+(ceiling-base)*.72),ceiling,developmentCurve:pick(['early','steady','steady','late','volatile'],r),developmentMomentum:0,personalityProfile:{professionalism:35+Math.floor(r()*65),ambition:30+Math.floor(r()*70),loyalty:25+Math.floor(r()*75),leadership:20+Math.floor(r()*80),bigMatches:25+Math.floor(r()*75),consistency:35+Math.floor(r()*65),injuryProneness:8+Math.floor(r()*78),temperament:20+Math.floor(r()*80),teamwork:35+Math.floor(r()*65),determination:30+Math.floor(r()*70),adaptability:25+Math.floor(r()*75)},personalityLabel:pick(['Professional','Driven','Balanced','Loyal','Ambitious'],r),wage:window.FLEconomy?FLEconomy.recommendedWage(game,{ability:base,age},team,'Prospect'):1+Math.floor(base/22),appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},youthIntakeYear:startYear,wartimeIntake:Boolean(war),intakeQuality:Number(intake.quality||50),goldenGenerationId:intake.golden?intake.generationId||null:null};if(window.FLLivingWorld)FLLivingWorld.ensurePlayer(game,player,team);if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,player,startYear);return player;
  }

  function legendName(archetype,r){const pool=data.namePools[archetype.nationality]||data.namePools.English;return `${pick(pool.first,r)} ${pick(pool.last,r)}`;}
  function generateLegend(game,archetype,startYear,r){
    const w=ensure(game,{bootstrap:false});if(w.generatedArchetypes.includes(archetype.id))return null;
    const age=15+Math.floor(r()*3),player={id:`legend-${archetype.id}-${startYear}`,name:legendName(archetype,r),nationality:archetype.nationality,position:archetype.position,age,ability:archetype.ability+Math.floor(r()*4)-1,ceiling:archetype.ceiling,potential:archetype.ceiling-1,condition:96,form:'—',personalityLabel:'Generational Talent',legendArchetype:archetype.id,archetypeLabel:archetype.label,traits:[...archetype.traits],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},honours:[],seasonHistory:[],matchHistory:[],status:'global-prospect',generatedYear:startYear};
    if(window.FLLivingWorld)FLLivingWorld.ensurePlayer(game,player,null);
    if(archetype.nationality==='English'){
      const active=game.clubs.filter(c=>c.leagueActive!==false),eligible=active.filter(c=>Array.isArray(c.players)&&c.players.length>=11),team=(eligible.length?eligible:active)[Math.floor(r()*Math.max(1,(eligible.length?eligible:active).length))]||game.clubs[0];player.clubId=team.id;player.status='active';player.wage=4+Math.floor(r()*4);player.personalityProfile={professionalism:80+Math.floor(r()*19),ambition:82+Math.floor(r()*17),loyalty:45+Math.floor(r()*50),leadership:55+Math.floor(r()*44),bigMatches:86+Math.floor(r()*13),consistency:78+Math.floor(r()*21),injuryProneness:10+Math.floor(r()*45),temperament:50+Math.floor(r()*49),teamwork:68+Math.floor(r()*31),determination:88+Math.floor(r()*11),adaptability:70+Math.floor(r()*29)};player.developmentCurve='early';player.appearances=0;player.starts=0;player.subApps=0;player.minutes=0;player.goals=0;player.assists=0;player.yellowCards=0;player.redCards=0;player.cleanSheets=0;player.conceded=0;player.playerOfMatch=0;player.averageRating='—';team.players.push(player);player.clubName=team.name;
    }else if(!(window.FLWorldFootball&&FLWorldFootball.placeLegend(game,player,archetype,startYear,r))) game.globalPlayers.push(player);
    w.legendProspects.unshift({...player});w.generatedArchetypes.push(archetype.id);
    addWorldRecord(game,{id:`legend-wave-${archetype.id}`,date:`${startYear}-07-01`,category:'legend',title:`A ${archetype.label.toLowerCase()} emerges`,summary:`${player.name}, a ${age}-year-old ${archetype.nationality.toLowerCase()} ${archetype.position}, is identified as a possible era-defining talent.`});
    game.news.unshift({date:`${startYear}-07-01`,headline:`Wonderkid watch: ${player.name}`});
    return player;
  }

  function retirementChanceFor(player,age){
    const isKeeper=player.position==='GK',profile=player.careerRecordProfile||'standard';let chance;
    if(profile==='all-time')chance=isKeeper?(age<39?0:age===39?.015:age===40?.04:age===41?.09:age===42?.18:age===43?.34:age===44?.58:age===45?.82:1):(age<37?0:age===37?.015:age===38?.04:age===39?.08:age===40?.16:age===41?.30:age===42?.50:age===43?.74:age===44?.92:1);
    else if(profile==='ironman')chance=isKeeper?(age<37?0:age===37?.025:age===38?.07:age===39?.15:age===40?.30:age===41?.52:age===42?.76:age===43?.94:1):(age<35?0:age===35?.025:age===36?.07:age===37?.15:age===38?.29:age===39?.48:age===40?.70:age===41?.90:1);
    else if(profile==='goal-machine')chance=isKeeper?(age<35?0:age===35?.04:age===36?.12:age===37?.27:age===38?.50:age===39?.76:age===40?.95:1):(age<34?0:age===34?.035:age===35?.10:age===36?.22:age===37?.40:age===38?.62:age===39?.82:age===40?.96:1);
    else chance=isKeeper?(age<34?0:age===34?.07:age===35?.16:age===36?.32:age===37?.55:age===38?.78:age===39?.94:1):(age<31?0:age===31?.07:age===32?.17:age===33?.34:age===34?.58:age===35?.80:age===36?.95:1);
    const professionalism=Number(player.personalityProfile?.professionalism)||50,injuryProneness=Number(player.personalityProfile?.injuryProneness)||45;
    return clamp(chance*(professionalism>=82?.82:professionalism<=35?1.16:1)*(injuryProneness>=78?1.22:injuryProneness<=25?.88:1),0,1);
  }

  function annualUpdate(game,startYear){
    const w=ensure(game),r=seeded(hash(`${game.meta?.seed||1}-annual-${startYear}`)),retired=[];
    game.clubs.forEach(team=>{
      team.players=Array.isArray(team.players)?team.players:[];
      if(team.lightweightState==='aggregate'&&team.players.length===0&&team.id!==game.controlledClubId){
        const profile=team.aggregateSquad||{averageAge:23,quality:Number(team.powerRating||team.clubRating||42),prospects:0};
        profile.averageAge=clamp(Number(profile.averageAge||23)+(r()-.5)*.8,19,30);
        profile.quality=clamp(Number(profile.quality||42)+(r()-.5)*3,24,82);
        profile.prospects=clamp(Math.round(Number(profile.prospects||0)+(r()<.28?1:0)-(r()<.18?1:0)),0,5);
        profile.updatedYear=startYear;team.aggregateSquad=profile;return;
      }
      const active=[];
      team.players.forEach(player=>{
        if(player.status==='deceased'||player.status==='retired')return;
        if(player.wartimeGuestFor){active.push(player);return}
        const age=Number(player.age)||20,retireChance=retirementChanceFor(player,age);
        if(r()<retireChance){player.status='retired';player.retiredDate=`${startYear}-07-01`;const notable=Boolean(player.legendArchetype||(player.honours||[]).length||(player.careerTotals?.appearances||0)>=250||team.id===game.controlledClubId||team.id===game.meta?.preselectedClubId);if(!game.meta?.headless||notable)game.retiredPlayers.push(playerSnapshot(player,team,game));retired.push({player,team});if(notable)addWorldRecord(game,{id:`retirement-${player.id}-${startYear}`,date:`${startYear}-07-01`,category:'player',title:`${player.name} retires`,summary:`The ${age}-year-old ends a career with ${team.name}.`})}else active.push(player);
      });
      team.players=active;
      const wartime=w.officialLeagueSuspended,target=wartime?15:20,baseCap=wartime?17:22;
      const intake=window.FLClubTrajectory?FLClubTrajectory.youthIntakeSpec(game,team,startYear):{quality:50,abilityBonus:0,potentialBonus:0,countBonus:0,golden:false};
      const cap=baseCap+Math.max(0,Number(intake.countBonus||0));
      let count=Math.max(0,target-team.players.length)+Math.max(0,Number(intake.countBonus||0));
      if(!wartime&&team.players.length<cap&&r()<.48)count+=1;
      count=Math.max(0,Math.min(wartime?6:5,cap-team.players.length,count));
      const newPlayers=[];
      for(let i=0;i<count;i++){const youth=makeYouth(game,team,startYear,r,i+1,intake);team.players.push(youth);newPlayers.push(youth)}
      if(window.FLClubTrajectory)FLClubTrajectory.registerYouthPlayers(game,team,startYear,newPlayers,intake);
    });
    // Clubless players must continue ageing. Previously their age froze while
    // they were unattached, allowing the same player to reappear decades later.
    // Keep only genuinely active free agents and retire them on the same
    // age/profile curve as registered players.
    const freeSurvivors=[];game.freeAgents=Array.isArray(game.freeAgents)?game.freeAgents:[];
    game.freeAgents.forEach(player=>{
      if(!player||player.status==='deceased'||player.status==='retired')return;
      const age=Number.isFinite(Number(player.birthYear))?Math.max(Number(player.age)||16,startYear-Number(player.birthYear)):(Number(player.age)||20)+1;player.age=age;
      const fr=seeded(hash(`${game.meta?.seed||1}-${player.id}-${startYear}-free-agent-age`)),retireChance=retirementChanceFor(player,age);
      if(fr()<retireChance){player.status='retired';player.retiredDate=`${startYear}-07-01`;const lastClub=(game.clubs||[]).find(c=>c.id===player.lastClubId)||{id:player.lastClubId||'free-agent',name:player.lastClubName||player.lastClub||'Unattached'};const notable=Boolean(player.legendArchetype||(player.honours||[]).length||(player.careerTotals?.appearances||0)>=250);if(!game.meta?.headless||notable)game.retiredPlayers.push(playerSnapshot(player,lastClub,game));return;}
      freeSurvivors.push(player);
    });game.freeAgents=freeSurvivors;
    legendArchetypes.filter(a=>a.triggerYear===startYear).forEach(a=>generateLegend(game,a,startYear,r));
    game.globalPlayers.forEach(player=>{
      if(player.status!=='global-prospect')return;player.age=(Number(player.age)||16)+1;
      const baseChance=startYear>=2000?.48:startYear>=1992?.34:startYear>=1978?.15:startYear>=1950?.07:.025;
      const chance=clamp(baseChance*Number(w.modifiers.foreignRecruitment||1),0,.72);
      if(player.age>=17&&player.age<=27&&r()<chance){
        const topTier=window.FLPyramid?FLPyramid.divisionList(game,startYear).find(d=>d.tier===1):null;
        const clubs=(topTier&&window.FLPyramid?FLPyramid.clubsInDivision(game,topTier.id):game.clubs.filter(c=>c.leagueActive!==false)).sort((a,b)=>(b.reputation||b.powerRating||0)-(a.reputation||a.powerRating||0));
        const shortlist=clubs.slice(0,Math.max(4,Math.ceil(clubs.length*.55))),team=shortlist[Math.floor(r()*shortlist.length)]||clubs[0];
        if(team){Object.assign(player,{clubId:team.id,clubName:team.name,status:'active',wage:5+Math.floor(r()*9),condition:95,developmentCurve:'early',appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',personalityProfile:{professionalism:78+Math.floor(r()*21),ambition:82+Math.floor(r()*17),loyalty:35+Math.floor(r()*55),leadership:50+Math.floor(r()*49),bigMatches:84+Math.floor(r()*15),consistency:76+Math.floor(r()*23),injuryProneness:10+Math.floor(r()*45),temperament:45+Math.floor(r()*54),teamwork:65+Math.floor(r()*34),determination:86+Math.floor(r()*13),adaptability:74+Math.floor(r()*25)}});team.players.push(player);game.news.unshift({date:`${startYear}-07-01`,headline:`${team.name} sign global prodigy ${player.name}`});addWorldRecord(game,{id:`global-arrival-${player.id}`,date:`${startYear}-07-01`,category:'transfer',title:`${player.name} arrives in English football`,summary:`The ${player.nationality.toLowerCase()} ${player.archetypeLabel.toLowerCase()} joins ${team.name}.`})}
      }
    });
    w.clubDirectory.forEach(c=>{if(c.status!=='league-member'&&Number(c.leagueEntry)<=startYear)c.status='league-member'});
    return {retired:retired.length,legendProspects:w.legendProspects.filter(x=>x.generatedYear===startYear).length};
  }

  function consumeScheduleRebuild(game){const w=ensure(game);const requested=Boolean(w.scheduleRebuildRequested),reason=w.scheduleRebuildReason||null;w.scheduleRebuildRequested=false;w.scheduleRebuildReason=null;return {requested,reason};}
  function currentRules(game){return ensure(game).rules;}
  function currentCompetition(game){const w=ensure(game);return w.seasonCompetition||seasonContext(game,yearOf(game.date));}
  function timelineEvents(game,{includeFuture=false}={}){const w=ensure(game);const current=String(game.date||'1888-08-15');return includeFuture?data.events:[...w.worldEvents].sort((a,b)=>a.date.localeCompare(b.date)).filter(e=>e.date<=current)}

  return {ensure,processDate,applyEvent,seasonContext,annualUpdate,currentRules,currentCompetition,activeCompetitionName,consumeScheduleRebuild,timelineEvents,data};
})();
