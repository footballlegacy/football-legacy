window.FLClubTrajectory = (() => {
  // Football Legacy v0.8.0 club trajectory balance controls.
  // These constants deliberately live together so long-term balance can be tuned
  // without hunting through the simulation code.
  const CONFIG = Object.freeze({
    VERSION:'0.8.1',
    STATURE_SUCCESS_RATE:0.48,
    STATURE_FAILURE_RATE:0.28,
    STATURE_TITLE_BONUS:0.40,
    STATURE_PROMOTION_BONUS:0.28,
    STATURE_RELEGATION_PENALTY:0.24,
    STATURE_HERITAGE_FLOOR_RATIO:0.70,
    MOMENTUM_PERSISTENCE:0.84,
    MOMENTUM_RESULT_FORCE:16,
    MOMENTUM_PROMOTION_BONUS:3.6,
    MOMENTUM_RELEGATION_PENALTY:3.9,
    MOMENTUM_MAX:18,
    MOMENTUM_TO_MATCH_STRENGTH:0.16,
    POWER_TARGET_SPEED:0.22,
    MONEY_TO_POWER_WEIGHT:0.18,
    STATURE_TO_POWER_WEIGHT:0.46,
    YOUTH_TO_POWER_WEIGHT:0.10,
    MANAGER_TO_POWER_WEIGHT:0.12,
    CEILING_TO_POWER_WEIGHT:0.08,
    GOLDEN_GENERATION_BASE_CHANCE:0.007,
    GOLDEN_GENERATION_STATURE_SCALE:0.00014,
    GOLDEN_GENERATION_PIPELINE_SCALE:0.00016,
    GOLDEN_GENERATION_MIN_YEARS:3,
    GOLDEN_GENERATION_MAX_YEARS:4,
    SHOCK_BASE_CHANCE:0.0048,
    SHOCK_COOLDOWN_YEARS:22,
    TREND_EVENT_COOLDOWN_YEARS:3,
    FINANCE_MIN:-500,
    FINANCE_MAX:6000,
    LOG_LIMIT:180,
    EVENT_LIMIT:80,
    DYNASTY_CYCLE_THRESHOLD:7,
    DYNASTY_CYCLE_CHANCE:0.30,
    DYNASTY_CYCLE_YEARS:4
  });

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const yearOf=value=>Number(String(value||'1888').slice(0,4))||1888;
  function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function seeded(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
  const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
  const average=arr=>arr.length?arr.reduce((a,b)=>a+Number(b||0),0)/arr.length:0;


  const HERITAGE_PROFILES=new Map(Object.entries({'arsenal':72,'chelsea':70,'manchester united':74,'liverpool':74,'real madrid':80,'rangers':74,'celtic':74,'barcelona':78,'bayern munich':77,'juventus':75,'ac milan':74,'inter milan':74}));
  function heritageKey(club){return [club?.reference,club?.realClub,club?.realName,club?.canonicalName].filter(Boolean).map(n=>String(n).trim().toLowerCase()).find(n=>HERITAGE_PROFILES.has(n))||null;}
  function heritageGiant(club){return Boolean(heritageKey(club));}
  function heritageFloorFor(club){return HERITAGE_PROFILES.get(heritageKey(club))||0;}
  function initialStature(club){
    const power=Number(club.powerRating||club.clubRating||34+Number(club.strength||2)*7);
    const financial=Number(club.financialPower||38+Number(club.strength||2)*9);
    const reserve=clamp(28+Number(club.finance||350)/18,25,85);
    return clamp(power*.58+financial*.28+reserve*.14,28,88);
  }
  function initialManagerQuality(club){
    return clamp(37+Number(club.strength||2)*5+(Number(club.reputation||45)-45)*.14,34,78);
  }
  function ensureClub(club,game,year=yearOf(game?.date)){
    if(club.trajectoryVersion===CONFIG.VERSION&&Number.isFinite(Number(club.stature))&&Number.isFinite(Number(club.powerRating||club.clubRating))&&Array.isArray(club.activeTrajectoryEffects)&&Array.isArray(club.trajectorySeasonLog)&&Array.isArray(club.shockHistory))return club;
    const seededStature=initialStature(club);
    club.trajectoryVersion=CONFIG.VERSION;
    club.stature=Number.isFinite(Number(club.stature))?Number(club.stature):seededStature;
    club.initialStature=Number.isFinite(Number(club.initialStature))?Number(club.initialStature):club.stature;
    club.heritageFloor=Number.isFinite(Number(club.heritageFloor))?Number(club.heritageFloor):clamp(club.initialStature*CONFIG.STATURE_HERITAGE_FLOOR_RATIO,22,72);if(heritageGiant(club))club.heritageFloor=Math.max(club.heritageFloor,heritageFloorFor(club));
    club.clubCeiling=Number.isFinite(Number(club.clubCeiling))?Number(club.clubCeiling):clamp(club.stature+10+(Number(club.strength||2)-2)*2,48,94);
    club.momentum=Number.isFinite(Number(club.momentum))?Number(club.momentum):0;
    club.performanceMemory=Number.isFinite(Number(club.performanceMemory))?Number(club.performanceMemory):0;
    club.youthGenerationQuality=Number.isFinite(Number(club.youthGenerationQuality))?Number(club.youthGenerationQuality):clamp(club.stature*.55+Number(club.financialPower||45)*.25+12,28,88);
    club.managerQuality=Number.isFinite(Number(club.managerQuality))?Number(club.managerQuality):initialManagerQuality(club);
    club.managerTenure=Number.isFinite(Number(club.managerTenure))?Number(club.managerTenure):0;
    club.managerFailureYears=Number.isFinite(Number(club.managerFailureYears))?Number(club.managerFailureYears):0;
    club.finance=Number.isFinite(Number(club.finance))?Number(club.finance):Math.round(220+club.stature*7);
    club.financialPower=Number.isFinite(Number(club.financialPower))?Number(club.financialPower):clamp(30+club.stature*.55,25,90);
    club.activeTrajectoryEffects=Array.isArray(club.activeTrajectoryEffects)?club.activeTrajectoryEffects:[];
    club.trajectoryHistory=Array.isArray(club.trajectoryHistory)?club.trajectoryHistory:[];
    club.trajectorySeasonLog=Array.isArray(club.trajectorySeasonLog)?club.trajectorySeasonLog:[];
    club.shockHistory=Array.isArray(club.shockHistory)?club.shockHistory:[];
    club.shockCooldown=Number.isFinite(Number(club.shockCooldown))?Number(club.shockCooldown):Math.floor((hash(`${club.id}-shock-offset`)%9));
    club.lastTrendEventYear=Number.isFinite(Number(club.lastTrendEventYear))?Number(club.lastTrendEventYear):year-10;
    club.currentTrajectory=club.currentTrajectory||'flat';
    club.currentCause=club.currentCause||'The club is moving steadily between seasons.';
    club.trajectoryTags=Array.isArray(club.trajectoryTags)?club.trajectoryTags:[];
    club.transformedByShock=Boolean(club.transformedByShock);
    club.dominanceYears=Number.isFinite(Number(club.dominanceYears))?Number(club.dominanceYears):0;
    club.failureRun=Number.isFinite(Number(club.failureRun))?Number(club.failureRun):0;
    return club;
  }
  function ensure(game,year=yearOf(game?.date)){
    game.clubTrajectory=game.clubTrajectory||{};
    game.clubTrajectory.version=CONFIG.VERSION;
    game.clubTrajectory.processedSeasons=Array.isArray(game.clubTrajectory.processedSeasons)?game.clubTrajectory.processedSeasons:[];
    game.clubTrajectory.eventIds=Array.isArray(game.clubTrajectory.eventIds)?game.clubTrajectory.eventIds:[];
    game.clubTrajectory.seasonSummaries=Array.isArray(game.clubTrajectory.seasonSummaries)?game.clubTrajectory.seasonSummaries:[];
    (game.clubs||[]).forEach(c=>ensureClub(c,game,year));
    return game.clubTrajectory;
  }

  function effectTotals(club,year){
    const active=(club.activeTrajectoryEffects||[]).filter(e=>Number(e.endYear)>=year);
    club.activeTrajectoryEffects=active;
    return active.filter(e=>Number(e.startYear)<=year).reduce((out,e)=>{
      out.power+=Number(e.power||0);out.momentum+=Number(e.momentum||0);out.youth+=Number(e.youth||0);out.finance+=Number(e.finance||0);
      if(e.reason){out.reasons.push(e.reason);out.reasonRows.push({reason:e.reason,power:Number(e.power||0),momentum:Number(e.momentum||0),type:e.type||'effect'})}return out;
    },{power:0,momentum:0,youth:0,finance:0,reasons:[],reasonRows:[]});
  }
  function addEffect(club,effect){
    club.activeTrajectoryEffects=club.activeTrajectoryEffects||[];
    club.activeTrajectoryEffects.push(effect);
    return effect;
  }

  function eventVisibility(game,club,major){
    if(major||club.id===game.controlledClubId)return true;
    const controlled=(game.clubs||[]).find(c=>c.id===game.controlledClubId);
    return Boolean(controlled&&controlled.divisionId&&controlled.divisionId===club.divisionId);
  }
  function recordEvent(game,club,year,type,title,text,effects={},major=false){
    ensure(game,year);ensureClub(club,game,year);
    const id=`trajectory-${type}-${club.id}-${year}`;
    if(game.clubTrajectory.eventIds.includes(id))return null;
    game.clubTrajectory.eventIds.push(id);
    const row={id,date:`${year}-07-01`,year,clubId:club.id,club:club.name,type,title,text,effects:{...effects}};
    const storedRow=game.meta?.headless&&club.id!==game.meta?.preselectedClubId?{id:row.id,date:row.date,year:row.year,clubId:row.clubId,type:row.type,title:row.title,text:row.text,effects:row.effects}:row;club.trajectoryHistory.push(storedRow);const eventLimit=game.meta?.headless&&club.id!==game.meta?.preselectedClubId?16:CONFIG.EVENT_LIMIT;if(club.trajectoryHistory.length>eventLimit)club.trajectoryHistory=club.trajectoryHistory.slice(-eventLimit);
    game.history=Array.isArray(game.history)?game.history:[];game.history.push({id,date:row.date,type:'club-trajectory',clubId:club.id,title,text});
    game.news=Array.isArray(game.news)?game.news:[];game.news.unshift({date:row.date,headline:title,clubId:club.id});
    if(eventVisibility(game,club,major)){
      game.inbox=Array.isArray(game.inbox)?game.inbox:[];
      game.inbox.unshift({id:`inbox-${id}`,date:row.date,from:'Football Gazette',subject:title,body:text,read:false});
    }
    return row;
  }

  function managerName(game,club,year,r){
    const first=window.FLData?.firstNames||['Arthur','George','William'];
    const last=window.FLData?.lastNames||['Brown','Smith','Taylor'];
    return {firstName:pick(first,r),lastName:pick(last,r),id:`manager-${club.id}-${year}-${Math.floor(r()*99999)}`};
  }
  function appointManager(game,club,year,quality,{landmark=false,reason='The board seek a new direction.'}={}){
    const r=seeded(hash(`${game.meta?.seed||1}-${club.id}-${year}-manager`)),name=managerName(game,club,year,r),old=club.managerProfile,age=36+Math.floor(r()*24),birthYear=year-age;
    if(old&&Array.isArray(club.managerHistory)){
      // The appointment is made for the new campaign, so the previous spell
      // ends with the season that has just finished rather than overlapping it.
      const current=[...club.managerHistory].reverse().find(x=>x.to==='Present');if(current)current.to=year-1;
    }
    club.managerProfile={...(old||{}),id:name.id,firstName:name.firstName,lastName:name.lastName,age,birthYear,nationality:'English',birthplace:club.location||'England',clubId:club.id,user:false,identitySeed:hash(`${game.meta?.seed||1}-${name.id}-identity`),appearanceIndex:(hash(`${name.id}-face`)%24)+1,portraitRole:'manager',reputation:landmark?'National':'Regional',style:pick(['Direct','Balanced','Possession','Counter-attacking','Defensive'],r),temperament:pick(['Calm','Demanding','Measured','Volatile'],r)};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,club.managerProfile,year);
    club.managerHistory=Array.isArray(club.managerHistory)?club.managerHistory:[];
    club.managerHistory.push({managerId:name.id,name:`${name.firstName} ${name.lastName}`,from:year,to:'Present',role:'Manager',quality:Math.round(quality),landmark,age,birthYear});
    club.managerQuality=clamp(quality,30,98);club.managerTenure=0;club.managerFailureYears=0;
    return {name:`${name.firstName} ${name.lastName}`,reason};
  }

  function weightedShockType(club,r,year){
    const titleCount=(club.trajectorySeasonLog||[]).filter(x=>x.title).length;
    const benefactorBase=club.stature<54?.68:club.stature<63?.48:club.stature<70?.18:.035;
    const benefactorWeight=club.transformedByShock?.025:Math.max(.02,benefactorBase-titleCount*.025)+(year>=1950?.06:0);
    const collapseWeight=(club.finance<160||club.powerRating>club.financialPower+10)?.42:.22;
    const managerWeight=.34;
    const total=benefactorWeight+collapseWeight+managerWeight,roll=r()*total;
    if(roll<benefactorWeight)return'benefactor';
    if(roll<benefactorWeight+collapseWeight)return'collapse';
    return'landmark-manager';
  }
  function applyShock(game,club,year,r){
    const type=weightedShockType(club,r,year);
    club.shockCooldown=CONFIG.SHOCK_COOLDOWN_YEARS+Math.floor(r()*10);
    if(type==='benefactor'){
      const ceiling=15+Math.floor(r()*8),cash=950+Math.floor(r()*1001),stature=5+Math.floor(r()*5);
      club.clubCeiling=clamp(club.clubCeiling+ceiling,50,99);club.stature=clamp(club.stature+stature,club.heritageFloor,club.clubCeiling);club.heritageFloor=clamp(club.heritageFloor+5+Math.floor(r()*4),20,84);club.finance=clamp(club.finance+cash,CONFIG.FINANCE_MIN,CONFIG.FINANCE_MAX);club.financialPower=clamp(club.financialPower+22+Math.floor(r()*10),20,99);club.momentum=clamp(club.momentum+9, -CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);club.transformedByShock=true;club.transformationYear=year;club.trajectoryTags=[...new Set([...club.trajectoryTags,'transformed-club'])];
      addEffect(club,{id:`benefactor-${year}`,type:'benefactor',startYear:year,endYear:year+8,power:6.5,momentum:4,youth:6,finance:70,reason:'new ownership is funding recruitment and facilities'});
      const title=`A wealthy benefactor transforms ${club.name}`,text=`A new owner commits substantial long-term funding to ${club.name}. The club's financial reach, recruitment ceiling and youth investment all rise permanently.`;
      club.shockHistory.push({year,type,title,ceilingChange:ceiling});recordEvent(game,club,year,type,title,text,{ceiling,finance:cash,stature},true);
    }else if(type==='collapse'){
      const ceiling=8+Math.floor(r()*8),loss=Math.max(180,Math.round(club.finance*(.38+r()*.24)));
      club.clubCeiling=clamp(club.clubCeiling-ceiling,38,96);club.stature=clamp(club.stature-(3+Math.floor(r()*5)),Math.max(18,club.heritageFloor-4),club.clubCeiling);club.heritageFloor=clamp(club.heritageFloor-(1+Math.floor(r()*4)),18,80);club.finance=clamp(club.finance-loss,CONFIG.FINANCE_MIN,CONFIG.FINANCE_MAX);club.financialPower=clamp(club.financialPower-(16+Math.floor(r()*12)),18,96);club.momentum=clamp(club.momentum-8,-CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);club.trajectoryTags=[...new Set([...club.trajectoryTags,'financial-collapse'])];
      addEffect(club,{id:`collapse-${year}`,type:'collapse',startYear:year,endYear:year+4,power:-5.5,momentum:-3.5,youth:-4,reason:'financial collapse has forced sales and cut investment'});
      const title=`Financial collapse strikes ${club.name}`,text=`Serious financial problems force ${club.name} to sell leading players and reduce investment. The club's long-term competitive ceiling falls.`;
      club.shockHistory.push({year,type,title,ceilingChange:-ceiling});recordEvent(game,club,year,type,title,text,{ceiling:-ceiling,finance:-loss},true);
    }else{
      const quality=86+Math.floor(r()*10),legacy=3+Math.floor(r()*5),appointed=appointManager(game,club,year,quality,{landmark:true,reason:'The appointment changes expectations around the club.'});
      club.clubCeiling=clamp(club.clubCeiling+legacy,45,99);club.stature=clamp(club.stature+1.5,club.heritageFloor,club.clubCeiling);club.momentum=clamp(club.momentum+8,-CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);club.trajectoryTags=[...new Set([...club.trajectoryTags,'landmark-manager'])];
      addEffect(club,{id:`landmark-manager-${year}`,type:'landmark-manager',startYear:year,endYear:year+7+Math.floor(r()*4),power:4,momentum:3.5,youth:1.5,reason:'a landmark manager is reshaping the side'});
      const title=`${club.name} appoint landmark manager ${appointed.name}`,text=`${appointed.name} arrives with unusual authority and a clear footballing vision. The appointment immediately raises standards and leaves a lasting mark on the club's ceiling.`;
      club.shockHistory.push({year,type,title,ceilingChange:legacy});recordEvent(game,club,year,type,title,text,{managerQuality:quality,ceiling:legacy},true);
    }
  }

  function maybeGoldenGeneration(game,club,year,r){
    if((club.activeTrajectoryEffects||[]).some(e=>e.type==='golden-generation'&&Number(e.endYear)>=year))return null;
    const sleepingGiantBoost=club.stature>56&&Number(club.failureRun||0)>=6?Math.min(.10,.025+(club.failureRun-5)*.012):0,heritageRecovery=heritageGiant(club)&&Number(club.failureRun||0)>=4?Math.min(.08,.02+(club.failureRun-3)*.01):0;
    const chance=CONFIG.GOLDEN_GENERATION_BASE_CHANCE+Math.max(0,club.stature-35)*CONFIG.GOLDEN_GENERATION_STATURE_SCALE+Math.max(0,club.youthGenerationQuality-38)*CONFIG.GOLDEN_GENERATION_PIPELINE_SCALE+sleepingGiantBoost+heritageRecovery;
    if(r()>=chance)return null;
    const duration=CONFIG.GOLDEN_GENERATION_MIN_YEARS+Math.floor(r()*(CONFIG.GOLDEN_GENERATION_MAX_YEARS-CONFIG.GOLDEN_GENERATION_MIN_YEARS+1)),quality=9+Math.floor(r()*8),id=`golden-${club.id}-${year}`;
    addEffect(club,{id,type:'golden-generation',startYear:year,endYear:year+duration-1,power:3.5+quality*.16,momentum:2.5,youth:quality,reason:'a golden generation is breaking into the first team',generationYear:year});
    club.goldenGeneration={id,startYear:year,endYear:year+duration-1,quality,playerIds:[]};
    club.trajectoryTags=[...new Set([...club.trajectoryTags,'golden-generation'])];
    const title=`Golden generation emerges at ${club.name}`,text=`Coaches at ${club.name} believe an exceptional crop of academy players is ready to emerge. The group is expected to lift the first team over the next ${duration} seasons.`;
    recordEvent(game,club,year,'golden-generation',title,text,{duration,quality},true);
    return club.goldenGeneration;
  }

  function maybeGenerationAgesOut(game,club,year){
    const generation=club.goldenGeneration;if(!generation||generation.agedOut||year<=Number(generation.endYear))return;
    generation.agedOut=true;
    const replacementQuality=Number(club.youthGenerationQuality||50);
    if(replacementQuality<72){
      addEffect(club,{id:`generation-age-out-${year}`,type:'generation-age-out',startYear:year,endYear:year+2,power:-3.2,momentum:-2.4,youth:-2,reason:'the celebrated youth generation has aged without an equal replacement'});
      recordEvent(game,club,year,'generation-age-out',`${club.name}'s golden generation reaches its end`,`The players who drove ${club.name}'s recent rise are ageing out of the side. No equally strong crop is ready to replace them, creating a difficult rebuilding period.`,{power:-3.2},false);
    }else{
      recordEvent(game,club,year,'generation-succession',`${club.name} sustain their academy cycle`,`The club's celebrated generation is ageing, but a strong youth pipeline provides credible replacements and prevents a sharp collapse.`,{youthQuality:replacementQuality},false);
    }
  }

  function maybeSquadCycleEnds(game,club,year,r){
    if(Number(club.dominanceYears||0)<CONFIG.DYNASTY_CYCLE_THRESHOLD)return false;
    if((club.activeTrajectoryEffects||[]).some(e=>e.type==='squad-cycle-end'&&Number(e.endYear)>=year))return false;
    const pressure=Math.min(.72,CONFIG.DYNASTY_CYCLE_CHANCE+(club.dominanceYears-CONFIG.DYNASTY_CYCLE_THRESHOLD)*.08);
    if(r()>=pressure)return false;
    const years=CONFIG.DYNASTY_CYCLE_YEARS+Math.floor(r()*2),cost=110+Math.round(club.powerRating*2.2);
    addEffect(club,{id:`squad-cycle-end-${year}`,type:'squad-cycle-end',startYear:year,endYear:year+years-1,power:-4.8,momentum:-3.2,youth:-1.5,finance:-35,reason:'an ageing championship side is being broken up and rebuilt'});
    club.finance=clamp(club.finance-cost,CONFIG.FINANCE_MIN,CONFIG.FINANCE_MAX);club.momentum=clamp(club.momentum-4.5,-CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);club.managerQuality=clamp(club.managerQuality-1.5,28,98);club.dominanceYears=0;
    recordEvent(game,club,year,'squad-cycle-end',`${club.name}'s great side reaches the end of its cycle`,`The players and manager who sustained ${club.name}'s recent success are ageing together. High wages and an incomplete succession plan begin a difficult rebuild.`,{power:-4.8,finance:-cost},true);
    return true;
  }

  function causeFor(club,{performance,promoted,relegated,effects,financeBalance,managerChanged}){
    const negativeEffect=(effects.reasonRows||[]).find(e=>e.power<0||e.momentum<0),positiveEffect=(effects.reasonRows||[]).find(e=>e.power>0||e.momentum>0);
    if(relegated)return 'relegation has reduced income and destabilised the playing squad';
    if(performance<-.10&&negativeEffect)return negativeEffect.reason;
    if(financeBalance<-45)return 'falling income and rising costs are weakening recruitment';
    if(performance<-.12)return 'repeated under-performance is draining confidence and resources';
    if(managerChanged&&performance<0)return 'managerial instability has interrupted the rebuild';
    if(positiveEffect)return positiveEffect.reason;
    if(managerChanged)return 'a managerial change has altered the direction of the first team';
    if(promoted)return 'promotion has raised confidence, revenue and recruitment pull';
    if(financeBalance>90&&club.stature>58)return 'strong crowds and healthy finances are funding better recruitment';
    if(performance>.12)return 'several seasons of over-performance are building belief';
    if(club.youthGenerationQuality>72)return 'a strong academy pipeline is supporting the senior side';
    return 'the club is moving steadily between seasons';
  }

  function maybeManagerCycle(game,club,year,performance,r){
    let changed=false;
    const profile=club.managerProfile||{},birthYear=Number(profile.birthYear),currentAge=birthYear?year-birthYear:Number(profile.age||45)+1;
    profile.age=currentAge;if(!profile.birthYear)profile.birthYear=year-currentAge;
    club.managerTenure=Number(club.managerTenure||0)+1;
    club.managerFailureYears=performance<-.11?Number(club.managerFailureYears||0)+1:Math.max(0,Number(club.managerFailureYears||0)-1);
    if(performance>.12)club.managerQuality=clamp(club.managerQuality+.35,30,96);
    else if(performance<-.12)club.managerQuality=clamp(club.managerQuality-.45,28,96);
    // The player's own career is governed by contracts and succession choices.
    if(profile.user)return false;if(club.managerVacancy&&!game.meta?.headless)return false;if(game.meta?.headless){club.managerVacancy=false;profile.interim=false;}

    // Managerial turnover changes by era. Secretary-managers could survive for
    // decades before the war; post-war appointments shortened, and the modern
    // game became markedly less patient. Exceptional long reigns remain rare.
    const preWar=year<1946,modern=year>=1992,softTenure=preWar?18:modern?7:12,hardTenure=preWar?34:modern?16:24;
    const ageExit=currentAge>=74?1:currentAge>=70?.62:currentAge>=67?.24:currentAge>=65?.08:0;
    const excess=Math.max(0,club.managerTenure-softTenure),tenureBase=preWar?.035:modern?.10:.06;
    let tenureExit=club.managerTenure>=hardTenure?1:Math.min(preWar?.42:modern?.72:.55,excess*tenureBase);
    if(performance>.12)tenureExit*=.42;else if(performance<-.08)tenureExit*=1.35;
    const failureThreshold=modern?2:3,failureChance=modern?.72:preWar?.48:.60;
    const failed=club.managerFailureYears>=failureThreshold&&r()<failureChance,retiring=ageExit>0&&r()<ageExit,longReign=tenureExit>0&&r()<tenureExit;
    if(failed||retiring||longReign){
      const oldName=profile?`${profile.firstName||''} ${profile.lastName||''}`.trim():'the manager',previousManagerQuality=Number(club.managerQuality||50);
      const target=clamp(36+club.stature*.28+club.financialPower*.18+(r()-.5)*13,34,88);
      const reason=failed?'Poor results forced the board to act.':retiring?'The manager has retired from football.':'A long managerial spell has come to an end.';
      const appointed=appointManager(game,club,year,target,{reason});
      addEffect(club,{id:`manager-reset-${year}`,type:'manager-reset',startYear:year,endYear:year+2,power:target>=65?1.8:-1.2,momentum:target>=65?2:-1,youth:0,reason:target>=65?'a promising new manager has restored direction':'another uncertain managerial appointment has prolonged instability'});
      const positive=target>=previousManagerQuality,action=retiring?'retires after his spell at':longReign?'leaves after a long spell with':'is dismissed by';
      const detail=retiring?`${oldName} ${action} ${club.name}. ${appointed.name} takes charge for the new season.`:longReign?`${oldName} ${action} ${club.name}. ${appointed.name} is appointed to begin a new cycle.`:`${club.name} dismiss ${oldName} after sustained under-performance. ${appointed.name} takes charge ${positive?'with a stronger reputation and a mandate to rebuild':'amid continued uncertainty over the club’s direction'}.`;
      recordEvent(game,club,year,'manager-change',`${club.name} appoint ${appointed.name}`,detail,{managerQuality:target,reason:failed?'dismissal':retiring?'retirement':'end-of-reign'},false);
      changed=true;
    }
    return changed;
  }

  function onSeasonEnd(game,endingYear,tablesInput,movement={promoted:[],relegated:[]}){
    const state=ensure(game,endingYear),seasonKey=String(endingYear);
    if(state.processedSeasons.includes(seasonKey))return state.seasonSummaries.find(s=>s.endingYear===endingYear)||null;
    const tables=(tablesInput||[]).map(block=>({division:block.division||{},table:block.table||block||[]}));
    const clubRows=new Map(),divisionAverages=new Map();
    tables.forEach(block=>{
      const rows=block.table||[],statures=rows.map(c=>ensureClub(c,game,endingYear).stature);divisionAverages.set(block.division.id,average(statures)||50);
      rows.forEach((c,i)=>clubRows.set(c.id,{club:c,division:block.division,position:i+1,size:rows.length,percentile:rows.length<=1?1:1-i/(rows.length-1)}));
    });
    const promotedIds=new Set((movement.promoted||[]).map(x=>x.clubId)),relegatedIds=new Set((movement.relegated||[]).map(x=>x.clubId)),seasonRows=[];
    for(const club of game.clubs||[]){
      ensureClub(club,game,endingYear);
      if(!clubRows.has(club.id)){
        club.momentum=clamp(club.momentum*.9+(club.stature<45?.25:-.2),-CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);
        club.finance=clamp(club.finance+(club.stature-45)*.35-25,CONFIG.FINANCE_MIN,CONFIG.FINANCE_MAX);
        club.financialPower=clamp(club.financialPower+(club.stature*.48-club.financialPower)*.05,18,94);
        continue;
      }
      const row=clubRows.get(club.id),r=seeded(hash(`${game.meta?.seed||1}-${club.id}-${endingYear}-trajectory`)),divisionAverage=divisionAverages.get(row.division.id)||50;
      const expected=clamp(.5+(club.stature-divisionAverage)/48+(club.managerQuality-50)/220,.14,.86),performance=row.percentile-expected;
      const promoted=promotedIds.has(club.id),relegated=relegatedIds.has(club.id),title=row.position===1,tier=Number(row.division.tier)||5;
      const startYear=endingYear+1;maybeGenerationAgesOut(game,club,startYear);
      club.dominanceYears=tier===1&&row.percentile>=.76?Number(club.dominanceYears||0)+1:Math.max(0,Number(club.dominanceYears||0)-1);
      club.failureRun=tier<=2&&row.percentile<=.40?Number(club.failureRun||0)+1:Math.max(0,Number(club.failureRun||0)-1);
      club.shockCooldown=Math.max(0,Number(club.shockCooldown||0)-1);
      if(club.shockCooldown===0&&r()<CONFIG.SHOCK_BASE_CHANCE)applyShock(game,club,startYear,r);
      maybeGoldenGeneration(game,club,startYear,r);maybeSquadCycleEnds(game,club,startYear,r);
      const managerChanged=maybeManagerCycle(game,club,startYear,performance,r),effects=effectTotals(club,startYear);

      const oldMomentum=club.momentum;
      const movementForce=(promoted?CONFIG.MOMENTUM_PROMOTION_BONUS:0)-(relegated?CONFIG.MOMENTUM_RELEGATION_PENALTY:0);
      const targetMomentum=performance*CONFIG.MOMENTUM_RESULT_FORCE+effects.momentum+(club.managerQuality-50)*.035;
      club.momentum=clamp(oldMomentum*CONFIG.MOMENTUM_PERSISTENCE+targetMomentum*(1-CONFIG.MOMENTUM_PERSISTENCE)+movementForce+(r()-.5)*1.1,-CONFIG.MOMENTUM_MAX,CONFIG.MOMENTUM_MAX);
      club.performanceMemory=clamp(club.performanceMemory*.78+performance*.22,-.5,.5);

      let statureDelta=club.performanceMemory*(club.performanceMemory>=0?CONFIG.STATURE_SUCCESS_RATE:CONFIG.STATURE_FAILURE_RATE);
      statureDelta+=(title&&Number(row.division.tier)===1)?CONFIG.STATURE_TITLE_BONUS:title?.18:0;
      statureDelta+=promoted?CONFIG.STATURE_PROMOTION_BONUS:0;statureDelta-=relegated?CONFIG.STATURE_RELEGATION_PENALTY:0;
      statureDelta=clamp(statureDelta,-.55,1.05);
      club.stature=clamp(club.stature+statureDelta,club.heritageFloor,club.clubCeiling);

      const tierIncome={1:230,2:165,3:115,4:78,5:48}[tier]||30;
      const revenue=tierIncome+club.stature*1.72+row.percentile*92+effects.finance;
      const costs=Number(club.powerRating||45)*1.45+club.managerQuality*.48+club.youthGenerationQuality*.27+Math.max(0,Number(club.financialPower||45)-55)*.45;
      const financeBalance=(revenue-costs)*Number(game.worldState?.modifiers?.finance||1)+(r()-.5)*48;
      club.lastFinanceBalance=Math.round(financeBalance);club.finance=clamp(club.finance+financeBalance,CONFIG.FINANCE_MIN,CONFIG.FINANCE_MAX);
      const cashScore=clamp(30+club.finance/42,18,99),tierPrestige=Math.max(0,18-(tier-1)*4.5),financialTarget=clamp(club.stature*.54+cashScore*.29+tierPrestige,18,99);
      club.financialPower=clamp(club.financialPower+(financialTarget-club.financialPower)*.17+(r()-.5)*.8,18,99);

      const facilityYouth=Number(club.facilities?.youth||Math.max(1,Number(club.strength||2)-1))*3.2,worldYouth=(Number(game.worldState?.modifiers?.youthQuality||1)-1)*12;
      const youthTarget=clamp(club.stature*.48+club.financialPower*.31+facilityYouth+worldYouth+effects.youth,25,96);
      club.youthGenerationQuality=clamp(club.youthGenerationQuality+(youthTarget-club.youthGenerationQuality)*.14+(r()-.5)*1.1,24,98);

      const targetPower=18+club.stature*CONFIG.STATURE_TO_POWER_WEIGHT+club.financialPower*CONFIG.MONEY_TO_POWER_WEIGHT+club.youthGenerationQuality*CONFIG.YOUTH_TO_POWER_WEIGHT+club.managerQuality*CONFIG.MANAGER_TO_POWER_WEIGHT+club.clubCeiling*CONFIG.CEILING_TO_POWER_WEIGHT+club.momentum*.36+effects.power;
      club.powerRating=clamp(Number(club.powerRating||45)+(targetPower-Number(club.powerRating||45))*CONFIG.POWER_TARGET_SPEED+performance*.85+(r()-.5)*.55,27,Math.min(99,club.clubCeiling+5));
      club.clubRating=Math.round(club.powerRating);club.strength=clamp(Math.round((club.powerRating-27)/13)+1,1,5);
      club.reputation=clamp(club.stature*.72+club.powerRating*.22+Math.max(0,club.momentum)*.12,20,99);

      const cause=causeFor(club,{performance,promoted,relegated,effects,financeBalance,managerChanged});
      club.currentCause=cause;club.currentTrajectory=club.momentum>5?'rising':club.momentum<-5?'falling':'flat';
      const previous=club.lastTrajectoryState||club.trajectorySeasonLog[club.trajectorySeasonLog.length-1],trendChanged=!previous||previous.trajectory!==club.currentTrajectory;club.lastTrajectoryState={trajectory:club.currentTrajectory,startYear};
      if(trendChanged&&startYear-club.lastTrendEventYear>=CONFIG.TREND_EVENT_COOLDOWN_YEARS&&club.currentTrajectory!=='flat'){
        club.lastTrendEventYear=startYear;
        if(club.currentTrajectory==='rising')recordEvent(game,club,startYear,'rise',`${club.name} begin to gather momentum`,`${club.name} are entering a sustained upward phase because ${cause}.`,{momentum:+club.momentum.toFixed(1)},false);
        else recordEvent(game,club,startYear,'decline',`${club.name} enter a period of decline`,`Results and resources are beginning to turn against ${club.name} because ${cause}.`,{momentum:+club.momentum.toFixed(1)},false);
      }

      const log={season:`${endingYear}-${String(endingYear+1).slice(2)}`,endingYear,startYear,divisionId:row.division.id,division:row.division.name,tier,position:row.position,size:row.size,percentile:+row.percentile.toFixed(4),expected:+expected.toFixed(4),performance:+performance.toFixed(4),stature:+club.stature.toFixed(2),momentum:+club.momentum.toFixed(2),powerRating:+club.powerRating.toFixed(2),financialPower:+club.financialPower.toFixed(2),finance:Math.round(club.finance),financeBalance:Math.round(financeBalance),youthQuality:+club.youthGenerationQuality.toFixed(2),managerQuality:+club.managerQuality.toFixed(2),ceiling:+club.clubCeiling.toFixed(2),trajectory:club.currentTrajectory,cause,promoted,relegated,title:title&&tier===1};
      const storedLog=game.meta?.headless?{season:log.season,endingYear:log.endingYear,startYear:log.startYear,divisionId:log.divisionId,tier:log.tier,position:log.position,stature:log.stature,momentum:log.momentum,powerRating:log.powerRating,trajectory:log.trajectory,cause:log.cause,promoted:log.promoted,relegated:log.relegated,title:log.title}:log,storeLog=!game.meta?.headless||club.id===game.meta?.preselectedClubId||tier===1||promoted||relegated||title||trendChanged||startYear%5===0;if(storeLog)club.trajectorySeasonLog.push(storedLog);if(club.trajectorySeasonLog.length>CONFIG.LOG_LIMIT)club.trajectorySeasonLog=club.trajectorySeasonLog.slice(-CONFIG.LOG_LIMIT);seasonRows.push({clubId:club.id,...log});
    }
    const summary={endingYear,season:`${endingYear}-${String(endingYear+1).slice(2)}`,clubs:seasonRows.length,rising:seasonRows.filter(x=>x.trajectory==='rising').length,falling:seasonRows.filter(x=>x.trajectory==='falling').length,shocks:(game.clubs||[]).flatMap(c=>c.shockHistory||[]).filter(s=>s.year===endingYear+1).length};
    state.processedSeasons.push(seasonKey);state.seasonSummaries.push(summary);if(state.seasonSummaries.length>CONFIG.LOG_LIMIT)state.seasonSummaries=state.seasonSummaries.slice(-CONFIG.LOG_LIMIT);
    return summary;
  }

  function youthIntakeSpec(game,club,startYear){
    ensure(game,startYear);ensureClub(club,game,startYear);
    const effect=effectTotals(club,startYear),generation=club.goldenGeneration,activeGolden=generation&&startYear>=generation.startYear&&startYear<=generation.endYear;
    const quality=clamp(club.youthGenerationQuality+effect.youth,24,99);
    return {quality,abilityBonus:Math.round((quality-50)/11)+(activeGolden?4+Math.round(generation.quality/4):0),potentialBonus:Math.round((quality-50)/8)+(activeGolden?7+Math.round(generation.quality/3):0),countBonus:activeGolden?2:quality>78?1:0,golden:Boolean(activeGolden),generationId:activeGolden?generation.id:null,label:activeGolden?'Golden Generation':'Youth Intake'};
  }
  function registerYouthPlayers(game,club,startYear,players,spec=youthIntakeSpec(game,club,startYear)){
    if(!spec.golden||!players?.length)return;
    club.goldenGeneration=club.goldenGeneration||{id:spec.generationId,startYear,endYear:startYear+2,quality:10,playerIds:[]};
    club.goldenGeneration.playerIds=[...new Set([...(club.goldenGeneration.playerIds||[]),...players.map(p=>p.id)])];
    players.forEach(p=>{p.goldenGenerationId=club.goldenGeneration.id;p.youthStory='Part of a celebrated golden generation.';p.personalityLabel=p.personalityLabel==='Balanced'?'Academy Standard-Bearer':p.personalityLabel;});
  }
  function matchStrengthBonus(club){
    if(!club)return 0;
    const manager=(Number(club.managerQuality||50)-50)*.025;
    return clamp(Number(club.momentum||0)*CONFIG.MOMENTUM_TO_MATCH_STRENGTH+manager,-4.5,4.5);
  }
  function effectivePower(club){return Number(club?.powerRating||club?.clubRating||45)+matchStrengthBonus(club)}

  function analyseTrajectories(game,{minimumSeasons=40,fromYear=-Infinity,toYear=Infinity}={}){
    ensure(game);
    const candidates=(game.clubs||[]).map(club=>({club,logs:(club.trajectorySeasonLog||[]).filter(x=>(Number(x.tier)===1||Number(x.tier)===2)&&Number(x.endingYear)>=fromYear&&Number(x.endingYear)<=toYear)})).filter(x=>x.logs.length>=minimumSeasons);
    const phaseAverage=(logs,start,count,key='percentile')=>average(logs.slice(start,start+count).map(x=>Number(x[key]||0)));
    let sleeping=null,aristocrat=null,transformed=null;
    for(const item of candidates){
      const l=item.logs,n=l.length,window=Math.max(7,Math.min(10,Math.floor(n/5))),middleStart=Math.floor(n*.34),lateStart=Math.max(0,n-window);
      const early=phaseAverage(l,0,window),middle=phaseAverage(l,middleStart,Math.max(12,Math.floor(n*.30))),late=phaseAverage(l,lateStart,window),stature=average(l.map(x=>x.stature));
      const sleepingScore=(stature/100)+(early-middle)+(late-middle)+(late*.35);
      if(stature>56&&early>.57&&middle<.53&&late>.60&&(!sleeping||sleepingScore>sleeping.score))sleeping={club:item.club,score:sleepingScore,early,middle,late,logs:l};
      let switches=0,last=null;l.forEach(x=>{const band=x.percentile>.68?'high':x.percentile<.38?'low':'mid';if((band==='high'||band==='low')&&last&&band!==last)switches++;if(band!=='mid')last=band;});
      const titles=l.filter(x=>x.title).length,aristocratScore=switches+stature/40-Math.max(0,titles-8);
      if(stature>52&&switches>=3&&titles<=9&&(!aristocrat||aristocratScore>aristocrat.score))aristocrat={club:item.club,score:aristocratScore,switches,titles,logs:l};
      const shocks=(item.club.shockHistory||[]).filter(s=>s.type==='benefactor'&&s.year>=fromYear&&s.year<=toYear);for(const shock of shocks){const idx=l.findIndex(x=>x.startYear>=shock.year);if(idx>=6&&idx<l.length-5){const pre=phaseAverage(l,Math.max(0,idx-8),Math.min(8,idx)),post=phaseAverage(l,idx,Math.min(12,l.length-idx)),postTitles=l.slice(idx).filter(x=>x.title).length,score=(post-pre)+postTitles*.16+(post>.65?.12:0);if(post>.60&&(post-pre>.10||postTitles>=2)&&(!transformed||score>transformed.score))transformed={club:item.club,score,shock,pre,post,postTitles,logs:l};}}
    }
    return {sleepingGiant:sleeping,fadedAristocrat:aristocrat,transformedClub:transformed};
  }

  return {CONFIG,ensure,ensureClub,onSeasonEnd,youthIntakeSpec,registerYouthPlayers,matchStrengthBonus,effectivePower,analyseTrajectories};
})();
