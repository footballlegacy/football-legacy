window.FLCareerSystems = (() => {
  const VERSION = 1;
  const DAY = 86400000;
  const clamp = (v,min=0,max=100) => Math.max(min,Math.min(max,Number(v)||0));
  const yearOf = value => Number(String(value?.date||value||'1888').slice(0,4))||1888;
  const addDays = (date,days) => { const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+Number(days||0)); return d.toISOString().slice(0,10); };
  const daysBetween = (a,b) => Math.ceil((new Date(`${b}T12:00:00Z`)-new Date(`${a}T12:00:00Z`))/DAY);
  const seasonLabel = y => `${y}/${String(y+1).slice(-2)}`;
  const money = value => `£${Math.round(Number(value)||0).toLocaleString('en-GB')}`;
  const hash = text => { let h=2166136261; for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
  const seeded = text => { let s=hash(text); return () => {s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; };
  const pick = (arr,r) => arr[Math.floor(r()*arr.length)];
  const activeClubs = game => (game.clubs||[]).filter(c=>c.id!=='unattached-manager'&&c.leagueActive!==false&&c.divisionId);
  const clubById = (game,id) => (game.clubs||[]).find(c=>c.id===id)||(game.competitionClubs||[]).find(c=>c.id===id)||(window.FLWorldFootball?FLWorldFootball.clubs(game).find(c=>c.id===id):null)||null;
  const controlled = game => clubById(game,game.controlledClubId);
  const managerName = game => `${game.manager?.firstName||'Club'} ${game.manager?.lastName||'Manager'}`;
  const wageIndex = year => window.FLEconomy?FLEconomy.wageIndex(year):Math.max(.7,Math.pow(1.035,Number(year)-1888)*.7);
  const safeArray = value => Array.isArray(value)?value:[];
  const notify = (game,from,subject,body,id=`career-${Date.now()}-${hash(subject)}`) => {
    game.inbox=Array.isArray(game.inbox)?game.inbox:[];
    game.inbox.unshift({id,date:game.date,from,subject,body,read:false});
  };
  const news = (game,headline,body='',category='career') => {
    game.news=Array.isArray(game.news)?game.news:[];
    game.news.unshift({id:`news-${Date.now()}-${hash(headline)}`,date:game.date,headline,body,category});
  };
  const history = (game,type,title,text,extra={}) => {
    game.history=Array.isArray(game.history)?game.history:[];
    game.history.push({id:`history-${Date.now()}-${hash(title)}`,date:game.date,type,title,text,...extra});
  };

  function ensureState(game){
    if(!game.careerSystems||typeof game.careerSystems!=='object')game.careerSystems={};
    const s=game.careerSystems;s.version=VERSION;
    s.jobs=s.jobs||{};s.jobs.vacancies=safeArray(s.jobs.vacancies);s.jobs.applications=safeArray(s.jobs.applications);s.jobs.history=safeArray(s.jobs.history);s.jobs.managerPool=safeArray(s.jobs.managerPool);s.jobs.lastGeneratedYear=Number(s.jobs.lastGeneratedYear)||0;s.jobs.managerPoolYear=Number(s.jobs.managerPoolYear)||0;
    s.playerContracts=s.playerContracts||{};s.playerContracts.history=safeArray(s.playerContracts.history);s.playerContracts.lastWarningDate=s.playerContracts.lastWarningDate||null;s.playerContracts.migratedYear=Number(s.playerContracts.migratedYear)||0;
    s.staff=s.staff||{};s.staff.market=safeArray(s.staff.market);s.staff.history=safeArray(s.staff.history);s.staff.lastMarketYear=Number(s.staff.lastMarketYear)||0;
    s.facilities=s.facilities||{};s.facilities.history=safeArray(s.facilities.history);s.facilities.migratedYear=Number(s.facilities.migratedYear)||0;
    s.youth=s.youth||{};s.youth.history=safeArray(s.youth.history);s.youth.previews=safeArray(s.youth.previews);s.youth.lastIntakeYear=Number(s.youth.lastIntakeYear)||0;
    s.training=s.training||{};s.training.reports=safeArray(s.training.reports);s.training.lastReportDate=s.training.lastReportDate||null;
    s.ai=s.ai||{};s.ai.managerHistory=safeArray(s.ai.managerHistory);s.ai.squadHistory=safeArray(s.ai.squadHistory);s.ai.lastReviewYear=Number(s.ai.lastReviewYear)||0;
    s.finance=s.finance||{};s.finance.history=safeArray(s.finance.history);s.finance.lastReviewYear=Number(s.finance.lastReviewYear)||0;
    s.season=s.season||{};s.season.audits=safeArray(s.season.audits);s.season.processedYears=safeArray(s.season.processedYears);s.season.block=null;
    s.cups=s.cups||{};s.cups.seasons=s.cups.seasons||{};s.cups.history=safeArray(s.cups.history);
    return s;
  }

  function ensureUnattachedClub(game){
    let c=(game.clubs||[]).find(x=>x.id==='unattached-manager');
    if(!c){
      c={id:'unattached-manager',name:'Unattached',initials:'—',primary:'#203040',secondary:'#0b1420',location:'England',ground:'No club',capacity:0,founded:'9999-01-01',leagueEntry:null,systemEntry:9999,nonFootballEntity:true,leagueActive:false,divisionId:null,tier:99,strength:1,clubRating:1,powerRating:1,reputation:1,stature:1,finance:0,players:[],played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0,honours:[],seasonHistory:[],managerHistory:[]};
      game.clubs.push(c);
    }
    return c;
  }

  function ensureFacilitiesForClub(game,club){
    if(!club||club.id==='unattached-manager')return null;
    const year=yearOf(game),seed=hash(`${game.meta?.seed||1}-${club.id}-facilities`),base=Math.max(1,Math.min(5,Math.round((Number(club.stature||club.reputation||45)-20)/18)));
    club.facilities=club.facilities||{};
    const f=club.facilities;
    f.stadium=f.stadium||{capacity:Number(club.capacity)||Math.max(1000,2500+seed%12000),condition:clamp(40+base*8,25,90),safety:clamp(38+base*9,20,92),pitch:clamp(42+base*8,25,92),floodlights:year>=1950?Math.max(0,base-2):0};
    f.training=Number.isFinite(Number(f.training))?Number(f.training):base;
    f.youth=Number.isFinite(Number(f.youth))?Number(f.youth):Math.max(1,base-1);
    f.medical=Number.isFinite(Number(f.medical))?Number(f.medical):Math.max(1,base-1);
    f.scouting=Number.isFinite(Number(f.scouting))?Number(f.scouting):Math.max(1,base-1);
    f.projects=safeArray(f.projects);f.history=safeArray(f.history);f.lastMaintenanceYear=Number(f.lastMaintenanceYear)||year;
    club.capacity=f.stadium.capacity;
    return f;
  }

  function ensurePlayerContract(game,player,club){
    if(!player||player.status==='retired'||player.status==='deceased')return player;
    const year=yearOf(game),r=seeded(`${game.meta?.seed||1}-${player.id}-contract`);
    if(!player.contractStart)player.contractStart=`${Math.max(1888,year-2)}-07-01`;
    if(club&&!player.contractEnd)player.contractEnd=`${year+1+Math.floor(r()*3)}-06-30`;
    player.contractHistory=safeArray(player.contractHistory);
    player.contractOffers=safeArray(player.contractOffers);
    player.transferListed=Boolean(player.transferListed);
    player.releaseListed=Boolean(player.releaseListed);
    if(club){
      player.clubId=club.id;
      const market=window.FLEconomy?FLEconomy.recommendedWage(game,player,club,player.squadStatus||'First Team'):Math.max(1,Math.round((Number(player.ability)||45)/12*wageIndex(year)));
      player.wage=Math.max(1,Math.round(Number(player.wage)||market));
      const days=player.contractEnd?daysBetween(game.date,player.contractEnd):0;
      player.contractStatus=days<0?'Expired':days<=90?'Expiring':days<=365?'Final year':'Secure';
    }else{
      player.clubId=null;player.contractEnd=null;player.contractStatus='Free Agent';player.wage=0;
    }
    return player;
  }

  function ensureAllContracts(game){
    (game.clubs||[]).forEach(c=>(c.players||[]).forEach(p=>ensurePlayerContract(game,p,c)));
    game.freeAgents=safeArray(game.freeAgents);game.freeAgents.forEach(p=>ensurePlayerContract(game,p,null));
  }

  function managerReputation(game){
    if(window.FLManagerLegacyCareer)return FLManagerLegacyCareer.reputation(game).score;
    const mc=game.managerCareer||{},honours=safeArray(mc.honours).length,clubs=safeArray(mc.clubsManaged).length,seasons=Math.max(0,yearOf(game)-Number(String(game.manager?.appointedDate||game.meta?.startYear||yearOf(game)).slice(0,4)));
    const archive=safeArray(game.seasonArchive),promotions=archive.reduce((n,s)=>n+safeArray(s.promoted).filter(x=>(x.clubId||x.id)===game.controlledClubId).length,0);
    return clamp(28+honours*7+clubs*3+seasons*2+promotions*5+(Number(game.boardConfidence||50)-50)*.25,15,98);
  }

  function managerMarketWage(game,club){
    if(window.FLManagerContracts)return FLManagerContracts.marketWeeklyWage(game,club,yearOf(game),managerReputation(game)-50);
    return Math.max(1,Math.round(3*wageIndex(yearOf(game))*(1.3-(Number(club?.tier||1)-1)*.09)));
  }

  function managerRequirement(club){return clamp(25+(11-Math.min(10,Number(club?.tier)||6))*5+(Number(club?.stature||45)-45)*.35,20,90);}

  function generateManagerPool(game,force=false){
    const s=ensureState(game),year=yearOf(game),available=s.jobs.managerPool.filter(m=>m.status==='available');if(!force&&s.jobs.managerPoolYear===year&&available.length>=20)return s.jobs.managerPool;
    const target=clamp(Math.round(activeClubs(game).length*.14),24,90),clubs=activeClubs(game),r=seeded(`${game.meta?.seed||1}-${year}-manager-pool`),nationalities=['English','English','English','Scottish','Welsh','Irish'],styles=['Direct','Balanced','Possession','Counter-attacking','Defensive','High pressing','Youth development'],temperaments=['Calm','Demanding','Measured','Volatile','Supportive','Pragmatic'],formations=['4-4-2','4-3-3','4-2-3-1','3-5-2','4-5-1'],used=new Set(s.jobs.managerPool.map(m=>m.id));
    s.jobs.managerPool=s.jobs.managerPool.filter(m=>m.status!=='available'||year-Number(m.availableSinceYear||year)<=4);const needed=Math.max(0,target-s.jobs.managerPool.filter(m=>m.status==='available').length);
    for(let index=0;index<needed;index++){
      const nationality=pick(nationalities,r),age=31+Math.floor(r()*34),birthYear=year-age,seed=Math.floor(r()*4294967295),previousClub=clubs.length&&r()<.82?clubs[Math.floor(r()*clubs.length)]:null,ability=clamp(Math.round(38+r()*42+(age>=40&&age<=57?5:0)),32,86),reputation=ability>=76?'National':ability>=63?'Regional':'Local',seasons=Math.max(0,Math.round((age-29)*(.35+r()*.5))),played=Math.round(seasons*(year<1900?20:year<1992?38:44)*(.55+r()*.35)),winRate=clamp(.25+(ability-35)/150+(r()-.5)*.08,.18,.64),won=Math.round(played*winRate),drawn=Math.round((played-won)*(.24+r()*.2)),lost=Math.max(0,played-won-drawn);let id=`manager-pool-${year}-${index+1}-${seed.toString(36)}`;while(used.has(id))id+=`-${Math.floor(r()*99)}`;used.add(id);const generatedName=window.FLEraIdentity?FLEraIdentity.generatedName(nationality,birthYear+25,seed):`${pick(window.FLData?.firstNames||['Arthur'],r)} ${pick(window.FLData?.lastNames||['Smith'],r)}`,parts=generatedName.trim().split(/\s+/),firstName=parts.shift()||'Club',lastName=parts.join(' ')||'Manager',profile={id,firstName,lastName,name:`${firstName} ${lastName}`,age,birthYear,nationality,birthplace:nationality==='English'?(previousClub?.location||'England'):nationality,identitySeed:seed,appearanceIndex:1+Math.floor(r()*24),portraitRole:'manager',style:pick(styles,r),temperament:pick(temperaments,r),preferredFormation:pick(formations,r),reputation,ability,availableSince:`${year}-07-01`,availableSinceYear:year,status:'available',previousClubId:previousClub?.id||null,previousClub:previousClub?.name||'First senior appointment',reasonAvailable:previousClub?pick(['Contract ended','Left by mutual consent','Seeking a new challenge','Dismissed after a difficult season'],r):'Newly qualified',experience:{seasons,clubsManaged:Math.max(0,Math.round(seasons/Math.max(2,3+r()*4))),played,won,drawn,lost,winPct:played?+(won*100/played).toFixed(1):0},honours:[],clubId:null,user:false};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,year,{lockedYear:year});s.jobs.managerPool.push(profile);
    }
    s.jobs.managerPoolYear=year;return s.jobs.managerPool;
  }

  function makeAIManager(game,club,reason='Appointed by the board'){
    const first=window.FLData?.firstNames||['Arthur','William','George','Thomas'],last=window.FLData?.lastNames||['Smith','Jones','Taylor','Brown'],r=seeded(`${game.meta?.seed||1}-${club.id}-${game.date}-ai-manager-${reason}`),year=yearOf(game),requirement=managerRequirement(club),pool=generateManagerPool(game).filter(m=>m.status==='available').sort((a,b)=>Math.abs(Number(a.ability)-requirement)-Math.abs(Number(b.ability)-requirement)||Number(b.experience?.played||0)-Number(a.experience?.played||0)),candidate=pool[Math.floor(r()*Math.min(5,Math.max(1,pool.length)))]||null,age=34+Math.floor(r()*29);
    const profile=candidate?{...candidate,status:'appointed',clubId:club.id,appointedDate:game.date,reason}:{id:`manager-${club.id}-${year}-${Math.floor(r()*1e6)}`,firstName:pick(first,r),lastName:pick(last,r),age,birthYear:year-age,nationality:'English',birthplace:club.location||'England',identitySeed:Math.floor(r()*4294967295),appearanceIndex:1+Math.floor(r()*24),portraitRole:'manager',style:pick(['Direct','Balanced','Possession','Counter-attacking','Defensive'],r),temperament:pick(['Calm','Demanding','Measured','Volatile'],r),reputation:Number(club.tier)<=2?'National':'Regional',ability:clamp(42+Math.floor(r()*35)+(6-Number(club.tier||5))*3,35,88),clubId:club.id,user:false,appointedDate:game.date,reason};if(candidate){const stored=ensureState(game).jobs.managerPool.find(m=>m.id===candidate.id);if(stored)Object.assign(stored,{status:'appointed',clubId:club.id,appointedDate:game.date,appointedClub:club.name});}
    if(window.FLEraIdentity)FLEraIdentity.applyManager(game,profile,year);
    return profile;
  }

  function createVacancy(game,club,reason='Managerial vacancy',options={}){
    const s=ensureState(game),jobs=s.jobs;if(!club||(club.id===game.controlledClubId&&!options.allowControlled)||club.id==='unattached-manager')return null;
    const existing=jobs.vacancies.find(v=>v.clubId===club.id&&v.status==='open');if(existing)return existing;
    const length=yearOf(game)<1950?2:3,wage=managerMarketWage(game,club),row={id:`job-${club.id}-${game.date}-${hash(reason)%9999}`,clubId:club.id,club:club.name,division:window.FLPyramid?.divisionForClub(game,club.id)?.name||'English football',tier:Number(club.tier)||6,reason,openedDate:game.date,deadline:addDays(game.date,Number(options.days)||35),status:'open',requirement:managerRequirement(club),weeklyWage:wage,lengthYears:length,expectation:club.expectation||'Build a stable season',applications:0,interimManagerId:club.managerProfile?.id||null};
    jobs.vacancies.unshift(row);club.managerVacancy=true;if(club.managerProfile)club.managerProfile.interim=true;
    news(game,`${club.name} begin search for a new manager`,reason,'manager');return row;
  }

  function generateVacancies(game,force=false){
    const s=ensureState(game),jobs=s.jobs,year=yearOf(game);if(!force&&jobs.lastGeneratedYear===year)return jobs.vacancies;
    const candidates=activeClubs(game).filter(c=>c.id!==game.controlledClubId&&!jobs.vacancies.some(v=>v.clubId===c.id&&v.status==='open'));
    const r=seeded(`${game.meta?.seed||1}-${year}-job-market`),wanted=Math.min(candidates.length,game.meta?.headless?0:Math.max(2,Math.min(5,Math.round(candidates.length*.05))));
    candidates.sort((a,b)=>(Number(a.managerProfile?.interim||0)-Number(b.managerProfile?.interim||0))||r()-.5).slice(0,wanted).forEach((club,index)=>createVacancy(game,club,index===0&&year<=1892?'The committee seeks a permanent football manager':'The previous manager has left the club'));
    jobs.lastGeneratedYear=year;return jobs.vacancies;
  }

  function applicationFor(game,vacancyId){return ensureState(game).jobs.applications.find(a=>a.vacancyId===vacancyId&&!['withdrawn','rejected','accepted'].includes(a.status))||null;}

  function applyForJob(game,vacancyId){
    const s=ensureState(game),v=s.jobs.vacancies.find(x=>x.id===vacancyId&&x.status==='open');if(!v)return {ok:false,message:'That vacancy is no longer open.'};const eligibility=window.FLManagerLegacyCareer?FLManagerLegacyCareer.jobEligibility(game,v):{eligible:true};if(!eligibility.eligible)return {ok:false,message:eligibility.reason};if(applicationFor(game,v.id))return {ok:false,message:'You have already applied for this position.'};
    const row={id:`application-${v.id}-${game.date}`,vacancyId:v.id,clubId:v.clubId,club:v.club,date:game.date,responseDate:addDays(game.date,3),status:'applied',reputationAtApplication:managerReputation(game),interviewChoice:null,offer:null};v.applications++;
    s.jobs.applications.unshift(row);notify(game,v.club,`Application received: ${v.club}`,`Your application has been received. The committee expects to respond by ${row.responseDate}.`,`job-application-${row.id}`);return {ok:true,message:`Application submitted to ${v.club}.`};
  }

  function answerInterview(game,applicationId,choice){
    const s=ensureState(game),a=s.jobs.applications.find(x=>x.id===applicationId&&x.status==='interview');if(!a)return {ok:false,message:'No interview is awaiting your answer.'};const v=s.jobs.vacancies.find(x=>x.id===a.vacancyId);if(!v)return {ok:false,message:'The vacancy has closed.'};
    const bonuses={project:7,results:5,stability:6,youth:5,ambition:3},r=seeded(`${game.meta?.seed||1}-${a.id}-${choice}`),score=Number(a.reputationAtApplication||managerReputation(game))+Number(bonuses[choice]||0)+(r()-.5)*12-v.requirement;
    a.interviewChoice=choice;a.interviewDate=game.date;
    if(score>=-2){a.status='offered';a.offer={weeklyWage:v.weeklyWage,lengthYears:v.lengthYears,expiryDate:`${yearOf(game)+v.lengthYears}-06-30`,offeredDate:game.date,expiresDate:addDays(game.date,7),status:'offered'};notify(game,v.club,`Contract offer from ${v.club}`,`${v.club} have offered you a ${v.lengthYears}-year appointment worth ${money(v.weeklyWage)} per week.`,`job-offer-${a.id}`);return {ok:true,message:`${v.club} have offered you the job.`};}
    a.status='rejected';a.rejectionDate=game.date;notify(game,v.club,`Interview outcome: ${v.club}`,`${v.club} have chosen another candidate after the interview process.`,`job-reject-${a.id}`);return {ok:true,message:`${v.club} chose another candidate.`};
  }

  function closeCurrentAppointment(game,reason,newClubName=null){
    const old=controlled(game);if(!old||old.id==='unattached-manager')return;
    old.managerHistory=safeArray(old.managerHistory);const current=[...old.managerHistory].reverse().find(x=>x.to==='Present'&&(x.managerId===old.managerProfile?.id||old.managerProfile?.user));if(current){current.to=game.date;current.reason=reason;}
    game.managerArchive=safeArray(game.managerArchive);game.managerArchive.push({id:old.managerProfile?.id||'manager-user',name:managerName(game),clubId:old.id,club:old.name,from:game.manager?.appointedDate||current?.from||game.date,to:game.date,reason,newClub:newClubName||null,user:true});
    game.managerCareer=game.managerCareer||{};game.managerCareer.clubsManaged=safeArray(game.managerCareer.clubsManaged);const careerRow=[...game.managerCareer.clubsManaged].reverse().find(x=>x.to==='Present'&&(x.clubId===old.id||x.club===old.name));if(careerRow){careerRow.to=game.date;careerRow.reason=reason;careerRow.nextClub=newClubName||null;}
    if(window.FLManagerLegacyCareer)FLManagerLegacyCareer.onAppointmentClosed(game,old,reason,newClubName);
    const replacement=makeAIManager(game,old,'Interim appointment after manager departure');old.managerProfile=replacement;old.managerVacancy=true;createVacancy(game,old,`The manager left for ${newClubName||'another opportunity'}`,{days:30,allowControlled:true});
  }

  function resetControlledClubSystems(game){
    delete game.teamManagement;delete game.squadState;delete game.board;delete game.youthAcademy;delete game.dressingRoom;delete game.clubUI;delete game.inboxUI;delete game.transferMarket?.lastIncomingCheck;
    game.worldUI=game.worldUI||{};game.worldUI.clubId=null;game.worldUI.playerId=null;
  }

  function acceptJob(game,applicationId){
    const s=ensureState(game),a=s.jobs.applications.find(x=>x.id===applicationId&&x.status==='offered'&&x.offer?.status==='offered');if(!a)return {ok:false,message:'No active job offer was found.'};const v=s.jobs.vacancies.find(x=>x.id===a.vacancyId),next=clubById(game,a.clubId);if(!v||!next)return {ok:false,message:'The club is no longer available.'};
    const old=controlled(game),outgoingTerms=old?.id!==next.id&&window.FLManagerContracts?FLManagerContracts.ensure(game):null,clubCompensation=Math.max(0,Math.round(Number(outgoingTerms?.compensation||0)));if(old?.id!==next.id)closeCurrentAppointment(game,'Accepted another managerial position',next.name);
    next.managerHistory=safeArray(next.managerHistory);const outgoing=[...next.managerHistory].reverse().find(x=>x.to==='Present');if(outgoing){outgoing.to=game.date;outgoing.reason='Replaced after recruitment process';}
    game.controlledClubId=next.id;game.meta=game.meta||{};game.meta.unemployed=false;game.manager.appointedDate=game.date;
    next.managerProfile={...(next.managerProfile||{}),id:`manager-user-${next.id}-${game.date}`,firstName:game.manager.firstName,lastName:game.manager.lastName,age:Number(game.manager.age)||38,nationality:game.manager.nationality||'English',birthplace:game.manager.birthplace||'England',gender:game.manager.gender||'male',identitySeed:game.manager.identitySeed,appearanceIndex:game.manager.appearanceIndex,portraitRole:'manager',style:game.manager.style||game.manager.managementStyle||'Balanced',temperament:game.manager.temperament||'Measured',reputation:managerReputation(game)>=70?'National':'Regional',clubId:next.id,user:true,appointedDate:game.date,interim:false};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,next.managerProfile,yearOf(game));
    next.managerHistory.push({managerId:next.managerProfile.id,name:managerName(game),from:game.date,to:'Present',role:'Manager'});next.managerVacancy=false;v.status='filled';v.filledDate=game.date;v.filledBy=managerName(game);a.status='accepted';a.offer.status='accepted';
    resetControlledClubSystems(game);if(window.FLEconomy){game.finances={};FLEconomy.ensureClubFinances(game,next);}if(clubCompensation>0&&old&&old.id!=='unattached-manager'){game.finances.balance=Number(game.finances.balance||0)-clubCompensation;old.finance=Number(old.finance||0)+clubCompensation;history(game,'manager-compensation',`${next.name} compensate ${old.name}`,`${next.name} pay ${money(clubCompensation)} to release ${managerName(game)} from the previous appointment.`,{oldClubId:old.id,newClubId:next.id,amount:clubCompensation});}if(window.FLManagerContracts)FLManagerContracts.startAppointment(game,next,{startDate:game.date,lengthYears:a.offer.lengthYears,weeklyWage:a.offer.weeklyWage});if(window.FLManagerLegacyCareer)FLManagerLegacyCareer.onAppointmentStarted(game,next,game.managerContract||a.offer);
    game.boardConfidence=60;game.managerCareer=game.managerCareer||{};game.managerCareer.clubsManaged=safeArray(game.managerCareer.clubsManaged);game.managerCareer.clubsManaged.push({clubId:next.id,club:next.name,from:game.date,to:'Present'});game.managerCareer.timeline=safeArray(game.managerCareer.timeline);game.managerCareer.timeline.unshift({date:game.date,title:`Appointed by ${next.name}`,text:`Accepted a ${a.offer.lengthYears}-year appointment worth ${money(a.offer.weeklyWage)} per week.`});
    notify(game,next.name,`Welcome to ${next.name}`,`The board have confirmed your appointment. The expectation is to ${String(next.expectation||'build a stable season').toLowerCase()}.`,`job-welcome-${next.id}-${game.date}`);history(game,'manager-job',`${managerName(game)} appointed by ${next.name}`,`${managerName(game)} leaves ${old?.name||'unemployment'} to manage ${next.name}.`,{clubId:next.id});game.selectedTab='home';return {ok:true,message:`You are now manager of ${next.name}.`};
  }

  function rejectJob(game,applicationId){const a=ensureState(game).jobs.applications.find(x=>x.id===applicationId&&x.status==='offered');if(!a)return {ok:false,message:'Offer not found.'};a.status='rejected';if(a.offer)a.offer.status='rejected';return {ok:true,message:`The offer from ${a.club} has been declined.`};}

  function resign(game){
    if(game.meta?.unemployed)return {ok:false,message:'You are already unemployed.'};const old=controlled(game);closeCurrentAppointment(game,'Resigned',null);const free=ensureUnattachedClub(game);game.controlledClubId=free.id;game.meta=game.meta||{};game.meta.unemployed=true;game.manager.appointedDate=null;game.managerContract=null;resetControlledClubSystems(game);game.boardConfidence=50;game.selectedTab='manager';game.managerCareer=game.managerCareer||{};game.managerCareer.view='jobs';history(game,'manager-job',`${managerName(game)} resigns from ${old?.name||'the club'}`,`${managerName(game)} becomes available for a new appointment.`);return {ok:true,message:'You have resigned and are now looking for work.'};
  }

  function processJobMarket(game){
    const s=ensureState(game),jobs=s.jobs,r=seeded(`${game.meta?.seed||1}-${game.date}-job-processing`);
    jobs.applications.filter(a=>a.status==='applied'&&a.responseDate<=game.date).forEach(a=>{const v=jobs.vacancies.find(x=>x.id===a.vacancyId);if(!v||v.status!=='open'){a.status='withdrawn';return;}const score=Number(a.reputationAtApplication)+(r()-.5)*15-v.requirement;if(score>=-8){a.status='interview';a.interviewDeadline=addDays(game.date,7);notify(game,v.club,`Interview invitation: ${v.club}`,`${v.club} would like to discuss the vacancy. Choose your approach in Manager → Jobs.`,`job-interview-${a.id}`);}else{a.status='rejected';notify(game,v.club,`Application outcome: ${v.club}`,`${v.club} have not included you on the interview shortlist.`,`job-shortlist-reject-${a.id}`);}});
    jobs.applications.filter(a=>a.status==='offered'&&a.offer?.expiresDate<game.date).forEach(a=>{a.status='expired';a.offer.status='expired';notify(game,a.club,`Job offer expired: ${a.club}`,'The club has withdrawn the offer after the decision deadline passed.',`job-expired-${a.id}`);});
    if(game.date.slice(8)==='01'&&!game.meta?.headless){const rep=managerReputation(game),candidate=jobs.vacancies.filter(v=>v.status==='open'&&!applicationFor(game,v.id)&&rep>=v.requirement+12).sort((a,b)=>b.tier-a.tier||a.requirement-b.requirement)[0];if(candidate&&seeded(`${game.meta?.seed||1}-${game.date}-direct-approach`)()<.4){const a={id:`application-${candidate.id}-${game.date}-approach`,vacancyId:candidate.id,clubId:candidate.clubId,club:candidate.club,date:game.date,responseDate:game.date,status:'interview',reputationAtApplication:rep,interviewChoice:null,offer:null,directApproach:true,interviewDeadline:addDays(game.date,10)};jobs.applications.unshift(a);candidate.applications++;notify(game,candidate.club,`Direct approach from ${candidate.club}`,`${candidate.club} have asked to speak with you about becoming their manager. Open Manager → Jobs to respond.`,`job-direct-${a.id}`);}}
    jobs.vacancies.filter(v=>v.status==='open'&&v.deadline<game.date).forEach(v=>{const active=jobs.applications.some(a=>a.vacancyId===v.id&&['applied','interview','offered'].includes(a.status));if(active)return;const club=clubById(game,v.clubId);if(!club){v.status='closed';return;}const m=makeAIManager(game,club,'Appointed through the manager market');club.managerProfile=m;club.managerHistory=safeArray(club.managerHistory);const prev=[...club.managerHistory].reverse().find(x=>x.to==='Present');if(prev)prev.to=game.date;club.managerHistory.push({managerId:m.id,name:`${m.firstName} ${m.lastName}`,from:game.date,to:'Present',role:'Manager'});club.managerVacancy=false;v.status='filled';v.filledDate=game.date;v.filledBy=`${m.firstName} ${m.lastName}`;news(game,`${v.filledBy} appointed by ${club.name}`,'The club has completed its managerial search.','manager');});
  }

  function recommendedPlayerWage(game,player,club=controlled(game),role=player?.squadStatus||'First Team'){
    return Math.max(1,Math.round(window.FLEconomy?FLEconomy.recommendedWage(game,player,club,role):(Number(player?.ability||45)/10)*wageIndex(yearOf(game))));
  }

  function offerPlayerContract(game,playerId,terms={}){
    const club=controlled(game),player=(club?.players||[]).find(p=>p.id===playerId);if(!player)return {ok:false,message:'Player not found.'};ensurePlayerContract(game,player,club);
    const years=clamp(Number(terms.years)||2,1,5),role=terms.role||player.squadStatus||'First Team',wage=Math.max(1,Math.round(Number(terms.wage)||player.wage||1)),target=recommendedPlayerWage(game,player,club,role),loyalty=Number(player.personalityProfile?.loyalty||50),ambition=Number(player.personalityProfile?.ambition||50),days=player.contractEnd?daysBetween(game.date,player.contractEnd):0;
    const score=(wage/Math.max(1,target))*62+loyalty*.18+(role==='Key Player'?8:role==='First Team'?4:0)+(days<180?5:0)-(ambition>75&&years>3?4:0);
    const offer={id:`player-contract-${player.id}-${game.date}-${Date.now()}`,date:game.date,years,role,wage,target,status:'offered'};player.contractOffers.unshift(offer);
    if(score>=67){offer.status='accepted';offer.decisionDate=game.date;player.contractStart=game.date;player.contractEnd=`${yearOf(game)+years}-06-30`;player.wage=wage;player.squadStatus=role;player.contractStatus='Secure';player.contractHistory.unshift({date:game.date,club:club.name,years,wage,role,expiry:player.contractEnd,reason:'New terms agreed'});ensureState(game).playerContracts.history.unshift({playerId:player.id,player:player.name,clubId:club.id,club:club.name,...offer});notify(game,'Club Secretary',`New contract agreed: ${player.name}`,`${player.name} has signed until ${player.contractEnd} on ${money(wage)} per week.`,`player-contract-accepted-${offer.id}`);return {ok:true,accepted:true,message:`${player.name} accepted the new contract.`};}
    if(score>=54){const counter=Math.max(target,Math.round(wage*1.12));offer.status='countered';offer.counterWage=counter;offer.counterYears=Math.max(2,years);return {ok:true,countered:true,message:`${player.name} wants ${money(counter)} per week.`};}
    offer.status='rejected';offer.decisionDate=game.date;return {ok:true,rejected:true,message:`${player.name} rejected the proposed terms.`};
  }

  function acceptPlayerCounter(game,playerId){
    const club=controlled(game),p=(club?.players||[]).find(x=>x.id===playerId),offer=p?.contractOffers?.find(x=>x.status==='countered');if(!p||!offer)return {ok:false,message:'No counter-offer is available.'};return offerPlayerContract(game,playerId,{years:offer.counterYears,wage:offer.counterWage,role:offer.role});
  }

  function toggleTransferList(game,playerId){const p=(controlled(game)?.players||[]).find(x=>x.id===playerId);if(!p)return {ok:false,message:'Player not found.'};p.transferListed=!p.transferListed;p.squadStatus=p.transferListed?'Transfer Listed':(p.squadStatus==='Transfer Listed'?'First Team':p.squadStatus);return {ok:true,message:`${p.name} is ${p.transferListed?'now':'no longer'} transfer listed.`};}

  function releasePlayer(game,playerId){
    const club=controlled(game),p=(club?.players||[]).find(x=>x.id===playerId);if(!p)return {ok:false,message:'Player not found.'};const weeks=Math.max(0,Math.min(104,Math.ceil((p.contractEnd?daysBetween(game.date,p.contractEnd):0)/7))),comp=Math.round(weeks*Number(p.wage||0)*.25);if(Number(game.finances?.balance||0)<comp)return {ok:false,message:`The club cannot afford the ${money(comp)} contract settlement.`};
    game.finances.balance-=comp;club.players=club.players.filter(x=>x.id!==p.id);p.clubHistory=safeArray(p.clubHistory);const spell=[...p.clubHistory].reverse().find(x=>x.to==='Present');if(spell)spell.to=game.date;p.lastClubId=club.id;p.lastClub=club.name;ensurePlayerContract(game,p,null);game.freeAgents.push(p);history(game,'player-contract',`${p.name} released by ${club.name}`,`${club.name} pay ${money(comp)} to terminate the contract.`,{clubId:club.id,playerId:p.id});return {ok:true,message:`${p.name} released. Settlement: ${money(comp)}.`};
  }

  function processContractWarnings(game){
    const club=controlled(game);if(!club||club.id==='unattached-manager')return;for(const p of club.players||[]){ensurePlayerContract(game,p,club);const days=daysBetween(game.date,p.contractEnd);for(const threshold of [180,90,30]){const key=`contract-warning-${p.id}-${p.contractEnd}-${threshold}`;if(days<=threshold&&days>=threshold-7&&!game.inbox.some(x=>x.id===key))notify(game,'Club Secretary',`${p.name}: contract expires in ${threshold} days`,`${p.name}'s current terms expire on ${p.contractEnd}. Open Squad → Contracts to negotiate.`,key);}}
  }

  function closeHistoricalSpell(player,club,year){player.clubHistory=safeArray(player.clubHistory);const spell=[...player.clubHistory].reverse().find(x=>x.to==='Present');if(spell){spell.clubId=spell.clubId||club.id;spell.club=spell.club||club.name;spell.to=Math.max(Number(spell.from)||year-1,year-1)}}
  function openHistoricalSpell(player,club,year){player.clubHistory=safeArray(player.clubHistory);const current=[...player.clubHistory].reverse().find(x=>x.to==='Present');if(current){current.clubId=club.id;current.club=club.name;return}const last=player.clubHistory.at(-1);if(last&&(last.clubId===club.id||last.club===club.name)){last.to='Present';return}player.clubHistory.push({clubId:club.id,club:club.name,from:year,to:'Present',apps:0,goals:0})}
  function recordAIFreeMove(game,player,club,year){const from=player.lastClub||player.lastClubName||'Free agent';game.worldUI=game.worldUI||{};game.worldUI.transferHistory=safeArray(game.worldUI.transferHistory);const row={id:`ai-free-${year}-${player.id}-${club.id}`,date:`${year}-07-01`,season:`${year}-${String(year+1).slice(2)}`,player:player.name,playerId:player.id,from,fromId:player.lastClubId||null,to:club.name,toId:club.id,fee:0,type:'free transfer',historicalSimulation:Boolean(game.meta?.headless)};game.worldUI.transferHistory.unshift(row);if(game.worldUI.transferHistory.length>1500)game.worldUI.transferHistory=game.worldUI.transferHistory.slice(0,1500)}
  function expireContracts(game,newYear){
    const protectedClubId=game.meta?.headless?null:game.controlledClubId,r=seeded(`${game.meta?.seed||1}-${newYear}-contract-retention`);
    for(const club of game.clubs||[]){if(club.id==='unattached-manager')continue;for(const p of [...(club.players||[])]){ensurePlayerContract(game,p,club);if(!p.contractEnd||p.contractEnd>=`${newYear}-07-01`)continue;const aiClub=club.id!==protectedClubId,core=Number(p.ability||0)>=Math.max(55,Number(club.powerRating||45)-4),loyalty=Number(p.personalityProfile?.loyalty||50),age=Number(p.age)||25;
      // Before the Eastham reforms, expiry did not normally make a player free:
      // clubs retained registrations. Deliberate historical transfers are handled
      // by FLHistoricalPlayerMobility, so contract expiry must not create a second,
      // much faster revolving-door market.
      const retainedByEra=newYear<=1962?age<=33&&r()<.96:newYear<=1977?(core||loyalty>=30||r()<.62):newYear<=1994?(core&&loyalty>=25||r()<.42):(core&&loyalty>=35||r()<.28);
      if(aiClub&&retainedByEra){const wage=recommendedPlayerWage(game,p,club,p.squadStatus||'First Team'),years=newYear<=1962?2:newYear<=1994?2:1+Math.floor(r()*3);p.contractStart=`${newYear}-07-01`;p.contractEnd=`${newYear+years}-06-30`;p.wage=wage;p.contractStatus='Secure';p.contractHistory.unshift({date:p.contractStart,club:club.name,years,wage,role:p.squadStatus||'First Team',expiry:p.contractEnd,reason:newYear<=1962?'Registration retained by club':'AI club renewal'});continue;}
      club.players=club.players.filter(x=>x.id!==p.id);closeHistoricalSpell(p,club,newYear);p.lastClubId=club.id;p.lastClub=club.name;p.lastClubName=club.name;p.freeAgentSinceYear=newYear;ensurePlayerContract(game,p,null);game.freeAgents.push(p);if(club.id===protectedClubId)notify(game,'Club Secretary',`${p.name} leaves at the end of his contract`,`${p.name} is now a free agent after terms expired.`,`expired-${p.id}-${newYear}`);}}
  }

  function staffRoles(year){
    if(year<1900)return ['Trainer','Club Scout','Assistant Secretary'];
    if(year<1946)return ['Assistant Manager','Trainer','Club Scout','Youth Coach'];
    if(year<1970)return ['Assistant Manager','First-team Coach','Physio','Scout','Youth Coach'];
    if(year<1992)return ['Assistant Manager','First-team Coach','Fitness Coach','Physio','Chief Scout','Youth Coach'];
    return ['Assistant Manager','First-team Coach','Fitness Coach','Goalkeeping Coach','Physio','Doctor','Chief Scout','Youth Coach','Analyst'];
  }

  function generateStaffMarket(game,force=false){
    const s=ensureState(game),year=yearOf(game);if(!force&&s.staff.lastMarketYear===year&&s.staff.market.some(x=>x.status==='available'))return s.staff.market;
    const first=window.FLData?.firstNames||['Arthur','William','George'],last=window.FLData?.lastNames||['Smith','Jones','Brown'],roles=staffRoles(year),r=seeded(`${game.meta?.seed||1}-${year}-staff-market`),rows=[];
    for(let i=0;i<Math.max(12,roles.length*2);i++){const role=roles[i%roles.length],quality=clamp(38+Math.floor(r()*45)+(Number(controlled(game)?.tier||5)<=2?5:0),28,92),age=27+Math.floor(r()*35),wage=Math.max(1,Math.round((1.2+quality/22)*wageIndex(year)*(role==='Assistant Manager'?1.2:1)));rows.push({id:`staff-candidate-${year}-${i}-${hash(role)%999}`,name:`${pick(first,r)} ${pick(last,r)}`,role,quality,age,nationality:'English',specialism:pick(['Player development','Tactical preparation','Fitness and conditioning','Recruitment','Youth development','Recovery and availability','Opposition analysis'],r),personality:pick(['Measured','Demanding','Supportive','Ambitious','Loyal','Innovative'],r),requestedWage:wage,lengthYears:year<1950?2:3,status:'available'});}
    s.staff.market=rows;s.staff.lastMarketYear=year;return rows;
  }

  function currentStaff(game){return window.FLDressingRoom?FLDressingRoom.staffSummary(game).members:[];}

  function hireStaff(game,candidateId){
    const s=ensureState(game),candidate=s.staff.market.find(x=>x.id===candidateId&&x.status==='available');if(!candidate)return {ok:false,message:'Candidate is no longer available.'};const club=controlled(game);if(!club||club.id==='unattached-manager')return {ok:false,message:'You need a club before hiring staff.'};const annual=candidate.requestedWage*52;if(Number(game.finances?.balance||0)<annual*.15)return {ok:false,message:'The board will not approve the appointment at the current financial position.'};
    const dr=window.FLDressingRoom?FLDressingRoom.ensure(game):null;if(!dr)return {ok:false,message:'Staff system unavailable.'};const same=dr.staff.members.find(x=>x.role===candidate.role);if(same&&same.quality>=candidate.quality)return {ok:false,message:`The current ${candidate.role} is already rated more highly.`};if(same){same.left=game.date;same.reason='Replaced';dr.staff.history.unshift(same);dr.staff.members=dr.staff.members.filter(x=>x.id!==same.id);}
    const member={...candidate,id:`club-staff-${club.id}-${Date.now()}`,appointed:game.date,contractStart:game.date,contractEnd:`${yearOf(game)+candidate.lengthYears}-06-30`,weeklyWage:candidate.requestedWage,trust:55,adviceHistory:[]};dr.staff.members.push(member);candidate.status='hired';candidate.hiredBy=club.id;candidate.hiredDate=game.date;s.staff.history.unshift({date:game.date,type:'hire',clubId:club.id,club:club.name,staff:member.name,role:member.role,wage:member.weeklyWage});notify(game,'Club Secretary',`${member.name} joins the staff`,`${member.name} has signed a ${candidate.lengthYears}-year contract as ${member.role}.`,`staff-hire-${member.id}`);return {ok:true,message:`${member.name} appointed as ${member.role}.`};
  }

  function dismissStaff(game,staffId){
    const dr=window.FLDressingRoom?FLDressingRoom.ensure(game):null,m=dr?.staff?.members?.find(x=>x.id===staffId);if(!m)return {ok:false,message:'Staff member not found.'};const weeks=Math.max(0,Math.min(104,Math.ceil((m.contractEnd?daysBetween(game.date,m.contractEnd):0)/7))),comp=Math.round(weeks*Number(m.weeklyWage||0)*.35);if(Number(game.finances?.balance||0)<comp)return {ok:false,message:`The club cannot afford the ${money(comp)} settlement.`};game.finances.balance-=comp;dr.staff.members=dr.staff.members.filter(x=>x.id!==m.id);dr.staff.history.unshift({...m,left:game.date,reason:'Dismissed',compensation:comp});return {ok:true,message:`${m.name} dismissed. Compensation: ${money(comp)}.`};
  }

  const facilityOptions = year => [
    {id:'pitch',label:'Improve the pitch',field:'stadium.pitch',cost:180,duration:75,detail:'Improves match preparation and reduces poor-surface injuries.'},
    {id:'training',label:'Upgrade training facilities',field:'training',cost:420,duration:180,detail:'Improves weekly development and tactical preparation.'},
    {id:'youth',label:'Upgrade youth facilities',field:'youth',cost:380,duration:210,detail:'Raises the quality and depth of future youth intakes.'},
    {id:'medical',label:'Improve medical provision',field:'medical',cost:300,duration:150,detail:'Reduces injury risk and improves recovery.'},
    {id:'scouting',label:'Expand scouting network',field:'scouting',cost:320,duration:160,detail:'Improves player and youth knowledge.'},
    {id:'capacity',label:'Expand stadium capacity',field:'stadium.capacity',cost:650,duration:300,detail:'Adds matchday capacity and future gate income.'},
    {id:'safety',label:'Improve ground safety',field:'stadium.safety',cost:450,duration:220,detail:'Protects the club against closures and capacity restrictions.'},
    ...(year>=1950?[{id:'floodlights',label:'Install or improve floodlights',field:'stadium.floodlights',cost:520,duration:240,detail:'Enables reliable evening football.'}]:[])
  ];

  function projectCost(game,option,club){const level=option.field.includes('.')?option.field.split('.').reduce((v,k)=>v?.[k],club.facilities):club.facilities[option.field];return Math.round(option.cost*(1+Number(level||1)*.45)*(window.FLEconomy?FLEconomy.budgetIndex(yearOf(game)):1));}

  function requestFacility(game,optionId){
    const club=controlled(game);if(!club||club.id==='unattached-manager')return {ok:false,message:'You need a club before requesting facilities.'};const f=ensureFacilitiesForClub(game,club),option=facilityOptions(yearOf(game)).find(x=>x.id===optionId);if(!option)return {ok:false,message:'Facility project unavailable.'};if(f.projects.some(p=>p.optionId===optionId&&p.status==='building'))return {ok:false,message:'That project is already under construction.'};const cost=projectCost(game,option,club),approval=Number(game.boardConfidence||50)+(Number(game.finances?.balance||0)>=cost?15:-25)+(optionId==='safety'?8:0);if(approval<48)return {ok:false,message:'The board rejected the proposal because confidence or finances are too weak.'};if(Number(game.finances?.balance||0)<cost)return {ok:false,message:`The project requires ${money(cost)}, which the club cannot currently fund.`};
    game.finances.balance-=cost;const project={id:`facility-${club.id}-${optionId}-${game.date}`,optionId,label:option.label,field:option.field,cost,startDate:game.date,completionDate:addDays(game.date,option.duration),status:'building'};f.projects.unshift(project);f.history.unshift({date:game.date,type:'approved',project:option.label,cost});notify(game,'Club Chairman',`Project approved: ${option.label}`,`Work is scheduled for completion by ${project.completionDate}. Cost: ${money(cost)}.`,`facility-${project.id}`);return {ok:true,message:`${option.label} approved.`};
  }

  function completeFacilityProjects(game){
    for(const club of game.clubs||[]){const f=ensureFacilitiesForClub(game,club);if(!f)continue;for(const p of f.projects.filter(x=>x.status==='building'&&x.completionDate<=game.date)){p.status='complete';p.completedDate=game.date;const parts=p.field.split('.');let target=f;for(let i=0;i<parts.length-1;i++)target=target[parts[i]];const key=parts.at(-1);if(key==='capacity'){target[key]=Math.round(Number(target[key]||club.capacity||5000)*1.18+1000);club.capacity=target[key];}else if(['pitch','safety','condition'].includes(key))target[key]=clamp(Number(target[key]||40)+12,0,100);else target[key]=clamp(Number(target[key]||1)+1,1,10);f.history.unshift({date:game.date,type:'completed',project:p.label});if(club.id===game.controlledClubId)notify(game,'Club Secretary',`Facility project complete: ${p.label}`,`${p.label} has been completed and is now in use.`,`facility-complete-${p.id}`);}}
  }

  function youthQuality(game){const club=controlled(game),f=ensureFacilitiesForClub(game,club),staff=currentStaff(game),coach=staff.find(x=>/Youth/.test(x.role)),scout=staff.find(x=>/Scout/.test(x.role));return clamp(25+Number(f?.youth||1)*7+Number(f?.scouting||1)*3+Number(coach?.quality||45)*.18+Number(scout?.quality||45)*.1,30,96);}

  function makeYouthCandidate(game,index,year){
    const club=controlled(game),quality=youthQuality(game),r=seeded(`${game.meta?.seed||1}-${club.id}-${year}-intake-${index}`),first=window.FLData?.firstNames||['Arthur','William','George'],last=window.FLData?.lastNames||['Smith','Jones','Brown'],age=15+Math.floor(r()*3),ability=clamp(Math.round(25+quality*.28+r()*18),28,72),ceiling=clamp(ability+10+Math.round(r()*22+quality*.08),ability+5,94),positions=['GK','FB','FB','HB','HB','IF','W','CF'];const p={id:`academy-${club.id}-${year}-${index}-${Math.floor(r()*9999)}`,name:window.FLEraIdentity?FLEraIdentity.generatedName('English',year-age+18,Math.floor(r()*4294967295)):`${pick(first,r)} ${pick(last,r)}`,age,birthYear:year-age,generatedYear:year,position:pick(positions,r),nationality:'English',birthplace:club.location||'England',preferredFoot:r()<.2?'Left':'Right',height:`${5+Math.floor(r()*2)}' ${5+Math.floor(r()*8)}"`,bodyType:pick(['Slight','Lean','Average','Athletic'],r),ability,ceiling,potential:Math.round(ability+(ceiling-ability)*.7),condition:90,form:'—',morale:'Good',wage:0,appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,averageRating:'—',playerOfMatch:0,personalityLabel:pick(['Driven','Balanced','Loyal','Ambitious','Professional'],r),personalityProfile:{professionalism:40+Math.floor(r()*55),ambition:35+Math.floor(r()*60),loyalty:40+Math.floor(r()*55),leadership:25+Math.floor(r()*60),bigMatches:30+Math.floor(r()*60),consistency:35+Math.floor(r()*55),injuryProneness:15+Math.floor(r()*55),temperament:35+Math.floor(r()*60),teamwork:40+Math.floor(r()*55),determination:40+Math.floor(r()*55),adaptability:35+Math.floor(r()*60)},developmentFocus:'Balanced development',academyStatus:'Academy',youthApps:0,youthGoals:0,youthAssists:0,honours:[],seasonHistory:[],matchHistory:[]};if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,p,year);return p;
  }

  function processYouth(game){
    if(game.meta?.unemployed)return;const s=ensureState(game),year=yearOf(game),md=game.date.slice(5),club=controlled(game);if(!club)return;
    if(md==='01-15'&&!s.youth.previews.some(x=>x.year===year&&x.clubId===club.id)){const q=youthQuality(game),preview={year,clubId:club.id,date:game.date,quality:q,label:q>=78?'Excellent':q>=65?'Promising':q>=50?'Average':'Limited',areas:q>=65?['Several technically promising players','At least one strong long-term prospect']:['A mixed local group','Development time will be important']};s.youth.previews.unshift(preview);notify(game,'Youth Development Officer',`${year} youth intake preview`,`${preview.label} group expected in March. ${preview.areas.join('. ')}.`,`youth-preview-${club.id}-${year}`);}
    if(md==='03-15'&&s.youth.lastIntakeYear!==year){game.youthAcademy=game.youthAcademy||{};game.youthAcademy.players=safeArray(game.youthAcademy.players);const size=6+Math.round(youthQuality(game)/25);const rows=Array.from({length:size},(_,i)=>makeYouthCandidate(game,i+game.youthAcademy.players.length,year));game.youthAcademy.players.push(...rows);s.youth.lastIntakeYear=year;s.youth.history.unshift({year,date:game.date,clubId:club.id,count:rows.length,best:rows.sort((a,b)=>b.potential-a.potential)[0]?.name});notify(game,'Youth Development Officer',`Youth intake has arrived`,`${rows.length} players are ready for assessment in Team → Youth Academy.`,`youth-intake-${club.id}-${year}`);}
  }

  function processTrainingReport(game){
    if(game.meta?.unemployed)return;const s=ensureState(game),d=new Date(`${game.date}T12:00:00Z`);if(d.getUTCDay()!==1||s.training.lastReportDate===game.date)return;const club=controlled(game);if(!club)return;const f=ensureFacilitiesForClub(game,club),staff=currentStaff(game),coach=staff.find(x=>/Coach|Trainer/.test(x.role))||staff[0],medical=staff.find(x=>/Physio|Medical|Doctor/.test(x.role)),rows=[];
    for(const p of club.players||[]){if(['retired','deceased'].includes(String(p.status||'').toLowerCase()))continue;const plan=p.trainingPlan||{focus:'Balanced development',intensity:'Normal'},intensity=plan.intensity==='Heavy'?1.25:plan.intensity==='Light'?.72:1,professional=Number(p.personalityProfile?.professionalism||50)/100,base=(Number(coach?.quality||48)/100)*(.65+Number(f?.training||1)*.08)*professional*intensity,age=Number(p.age||24),gain=age<24?base*.42:age<29?base*.18:0;p.developmentProgress=Number(p.developmentProgress||0)+gain;if(p.developmentProgress>=1&&Number(p.ability)<Number(p.ceiling||p.ability)){p.ability++;p.developmentProgress-=1;rows.push({playerId:p.id,player:p.name,type:'improved',detail:`Overall rating increased to ${p.ability}.`});}const risk=(plan.intensity==='Heavy'?5:1)+(100-Number(medical?.quality||45))*.035+(3-Number(f?.medical||1))*1.2+Number(p.personalityProfile?.injuryProneness||40)*.025;if(risk>8&&seeded(`${game.date}-${p.id}-training-injury`)()<risk/260){p.condition=clamp(Number(p.condition||90)-12,35,100);p.injuries=safeArray(p.injuries);p.injuries.unshift({name:'Training strain',from:game.date,dueDate:addDays(game.date,7+Math.round(risk)),status:'Recovering'});rows.push({playerId:p.id,player:p.name,type:'injury',detail:'Suffered a training strain.'});}}
    const report={date:game.date,clubId:club.id,focus:game.dressingRoom?.training?.teamFocus||'Balanced',intensity:game.dressingRoom?.training?.intensity||'Normal',improvements:rows.filter(x=>x.type==='improved'),injuries:rows.filter(x=>x.type==='injury'),averageCondition:Math.round((club.players||[]).reduce((n,p)=>n+Number(p.condition||0),0)/Math.max(1,(club.players||[]).length))};s.training.reports.unshift(report);s.training.reports=s.training.reports.slice(0,52);s.training.lastReportDate=game.date;
  }

  function aiSquadPlanning(game,year){
    const s=ensureState(game),free=game.freeAgents=safeArray(game.freeAgents),r=seeded(`${game.meta?.seed||1}-${year}-ai-squad`),protectedClubId=game.meta?.headless?null:game.controlledClubId,profile=window.FLHistoricalPlayerMobility?.eraProfile?.(year)||{maxSpells:year<1963?5:year<1995?8:12};for(const club of activeClubs(game)){if(club.id===protectedClubId)continue;club.players=safeArray(club.players);const active=club.players.filter(p=>!['retired','deceased'].includes(String(p.status||'').toLowerCase()));const required={GK:2,FB:4,HB:4,IF:3,W:3,CF:3};for(const [pos,count] of Object.entries(required)){let have=active.filter(p=>p.position===pos).length;while(have<count){let pickIndex=free.findIndex(p=>p.position===pos&&!['retired','deceased','inactive'].includes(String(p.status||'active').toLowerCase())&&!p.grassrootsInactive&&!p.wartimeGuestFor&&Number(p.age||22)<=(p.position==='GK'?40:37)&&year-Number(p.freeAgentSinceYear||year)<=3&&safeArray(p.clubHistory).length<Number(profile.maxSpells||12));let p=pickIndex>=0?free.splice(pickIndex,1)[0]:null;if(!p)break;openHistoricalSpell(p,club,year);recordAIFreeMove(game,p,club,year);p.clubId=club.id;p.status='active';delete p.freeAgentSinceYear;p.squadStatus=have<2?'First Team':'Backup';p.wage=recommendedPlayerWage(game,p,club,p.squadStatus);p.contractStart=`${year}-07-01`;p.contractEnd=`${year+(year<=1962?2:1+Math.floor(r()*3))}-06-30`;p.contractStatus='Secure';club.players.push(p);have++;s.ai.squadHistory.unshift({date:`${year}-07-01`,clubId:club.id,club:club.name,type:'free-agent-signing',player:p.name,position:pos});}}
      const surplus=club.players.filter(p=>Number(p.age)>34&&Number(p.ability)<Number(club.powerRating||45)-10);for(const p of surplus.slice(0,Math.max(0,club.players.length-24))){club.players=club.players.filter(x=>x.id!==p.id);closeHistoricalSpell(p,club,year);p.lastClubId=club.id;p.lastClub=club.name;p.lastClubName=club.name;p.freeAgentSinceYear=year;ensurePlayerContract(game,p,null);free.push(p);}
      if(club.managerProfile){club.tacticalIdentity=club.managerProfile.style||pick(['Direct','Balanced','Counter-attacking'],r);club.managerAbility=Number(club.managerProfile.ability)||50;}
    }
    s.ai.lastReviewYear=year;
  }

  function freeAgentTarget(game,year){
    const clubs=activeClubs(game).length,rate=year<=1962?.035:year<=1994?.075:.12;
    return clamp(Math.round(clubs*rate),year<=1962?12:24,year>=1995?180:110);
  }
  function replenishFreeAgents(game,year){
    const free=game.freeAgents=safeArray(game.freeAgents),target=freeAgentTarget(game,year),missing=Math.max(0,target-free.filter(p=>!['retired','deceased','inactive'].includes(String(p.status||'active').toLowerCase())).length);if(!missing)return free;
    const clubs=activeClubs(game).filter(c=>c.id!=='unattached-manager'),positions=['GK','FB','FB','HB','HB','IF','W','CF'],r=seeded(`${game.meta?.seed||1}-${year}-free-agent-replenishment`),existing=new Set([...clubs.flatMap(c=>safeArray(c.players).map(p=>p.id)),...free.map(p=>p.id)]);
    for(let index=0;index<missing;index++){
      const lastClub=clubs[Math.floor(r()*Math.max(1,clubs.length))]||null,position=positions[index%positions.length],age=18+Math.floor(r()*15),birthYear=year-age,tier=clamp(Number(lastClub?.tier||lastClub?.modernTier||4),1,10),clubLevel=Number(lastClub?.powerRating||lastClub?.clubRating||lastClub?.modernStrength||50),ability=clamp(Math.round(clubLevel-8+(r()-.5)*14),30,tier<=2?78:68),ceiling=clamp(ability+Math.max(2,Math.round((25-age)*.75+r()*7)),ability,88),apps=Math.max(1,Math.round(5+r()*30)),goalRate={GK:0,FB:.03,HB:.07,IF:.16,W:.18,CF:.28}[position]||.08,goals=Math.round(apps*goalRate*(.65+r()*.7)),assists=Math.round(apps*({GK:.01,FB:.08,HB:.13,IF:.2,W:.21,CF:.09}[position]||.1)*(.65+r()*.7)),cleanSheets=position==='GK'?Math.round(apps*(.18+r()*.22)):0,seed=Math.floor(r()*4294967295);let id=`free-generated-${year}-${index+1}-${seed.toString(36)}`;while(existing.has(id))id+=`-${Math.floor(r()*99)}`;existing.add(id);
      const name=window.FLEraIdentity?FLEraIdentity.generatedName('English',birthYear+18,seed):`${pick(window.FLData?.firstNames||['Arthur'],r)} ${pick(window.FLData?.lastNames||['Smith'],r)}`,season=`${year-1}-${String(year).slice(2)}`,player={id,name,clubId:null,nationality:'English',birthYear,generatedYear:year,age,position,condition:88+Math.floor(r()*13),form:'—',ability,potential:Math.round(ability+(ceiling-ability)*.7),ceiling,developmentCurve:pick(['early','steady','steady','late','volatile'],r),developmentMomentum:0,personalityProfile:{professionalism:35+Math.floor(r()*60),ambition:35+Math.floor(r()*60),loyalty:25+Math.floor(r()*70),leadership:20+Math.floor(r()*70),bigMatches:30+Math.floor(r()*65),consistency:35+Math.floor(r()*60),injuryProneness:10+Math.floor(r()*65),temperament:25+Math.floor(r()*70),teamwork:35+Math.floor(r()*60),determination:35+Math.floor(r()*60),adaptability:35+Math.floor(r()*60)},personalityLabel:pick(['Professional','Driven','Determined','Balanced','Loyal','Ambitious'],r),wage:0,contractStart:null,contractEnd:null,contractStatus:'Free Agent',contractHistory:[],squadStatus:'Free Agent',status:'active',freeAgentSinceYear:year,lastClubId:lastClub?.id||null,lastClub:lastClub?.name||'Local football',lastClubName:lastClub?.name||'Local football',freeAgentOrigin:'Released after annual squad review',appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[{season,club:lastClub?.name||'Local football',clubId:lastClub?.id||null,league:lastClub?.divisionName||'English football',division:lastClub?.divisionName||'English football',divisionId:lastClub?.divisionId||null,tier,apps,goals,assists,cleanSheets,rating:+(5.9+r()*1.15).toFixed(2),ability}],matchHistory:[],clubHistory:[{club:lastClub?.name||'Local football',clubId:lastClub?.id||null,from:Math.max(birthYear+16,year-1-Math.floor(r()*4)),to:year-1,apps,goals}],careerTotals:{appearances:apps,goals,assists,cleanSheets}};
      if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,player,year);ensurePlayerContract(game,player,null);free.push(player);
    }
    return free;
  }

  function aiManagerReview(game,endingYear){
    // Historical fast-forward has its own era-sensitive appointment engine in
    // club-trajectory. Creating 28-day vacancies here left the departed manager
    // attached for decades because headless simulation does not run daily ticks.
    if(game.meta?.headless)return;
    const s=ensureState(game),tables=window.FLPyramid?FLPyramid.allTables(game):[],r=seeded(`${game.meta?.seed||1}-${endingYear}-ai-manager-review`);for(const block of tables){const rows=block.table||[];rows.forEach((club,index)=>{if(club.id===game.controlledClubId||club.id==='unattached-manager')return;const bottom=index>=Math.max(0,rows.length-3),manager=club.managerProfile;if(!manager||manager.interim||bottom&&r()<.48){if(manager){club.managerHistory=safeArray(club.managerHistory);const current=[...club.managerHistory].reverse().find(x=>x.to==='Present');if(current){current.to=game.date;current.reason=bottom?'Dismissed after a bottom-three finish':'Manager departed';}s.ai.managerHistory.unshift({date:game.date,clubId:club.id,club:club.name,manager:`${manager.firstName} ${manager.lastName}`,reason:current?.reason||'Departed'});}createVacancy(game,club,bottom?'Dismissed after a bottom-three finish':'Manager departed at the end of the season',{days:28});}});}
  }

  function financialStatus(game,club=controlled(game)){ensureFacilitiesForClub(game,club);club.financialStatus=club.financialStatus||{status:'Stable',debt:0,embargo:false,pointsDeduction:0,wageArrears:false,lastReviewYear:0,events:[]};return club.financialStatus;}

  function transferAllowed(game){const c=controlled(game),f=c?financialStatus(game,c):null;if(game.meta?.unemployed)return {ok:false,message:'You need a club before entering the transfer market.'};if(f?.embargo)return {ok:false,message:'The club is under a transfer embargo.'};return {ok:true};}

  function annualFinanceReview(game,year){
    const club=controlled(game);if(!club||club.id==='unattached-manager')return null;const s=ensureState(game),status=financialStatus(game,club),balance=Number(game.finances?.balance||0),base=Math.max(100,window.FLEconomy?FLEconomy.clubBudget(game,club):1000),previous=status.status;status.lastReviewYear=year;status.pointsDeduction=0;
    if(balance>=0){status.status=status.debt>base*.2?'Recovering':'Stable';status.embargo=false;status.wageArrears=false;status.debt=Math.max(0,Number(status.debt||0)-Math.round(base*.08));}
    else{status.debt=Math.max(Number(status.debt||0),Math.abs(balance));const ratio=Math.abs(balance)/base;if(ratio<.12)status.status='Financial warning';else if(ratio<.28)status.status='Serious debt';else status.status=year>=1986?'Administration':'Creditors’ crisis';status.embargo=ratio>=.18;status.wageArrears=ratio>=.25;if(year>=1986&&ratio>=.28){status.pointsDeduction=9;club.points=Math.max(-20,Number(club.points||0)-9);history(game,'finance',`${club.name} enter administration`,`${club.name} receive a nine-point deduction and transfer embargo.`,{clubId:club.id});}else if(year<1986&&ratio>=.28){const rescue=Math.round(base*.18);game.finances.balance+=rescue;status.debt+=rescue;history(game,'finance',`${club.name} face a creditors’ crisis`,`The directors secure emergency support of ${money(rescue)} to keep the club operating.`,{clubId:club.id});}}
    if(status.wageArrears)(club.players||[]).forEach(p=>{p.morale='Poor';if(p.dressingRoom)p.dressingRoom.happiness=clamp(Number(p.dressingRoom.happiness||50)-12);});
    status.events.unshift({year,date:game.date,status:status.status,balance,debt:status.debt,embargo:status.embargo,pointsDeduction:status.pointsDeduction});s.finance.history.unshift({clubId:club.id,club:club.name,...status.events[0]});if(previous!==status.status||status.embargo)notify(game,'Club Treasurer',`Financial status: ${status.status}`,`${status.embargo?'A transfer embargo is active. ':''}${status.pointsDeduction?`${status.pointsDeduction} points have been deducted. `:''}Current debt is ${money(status.debt)}.`,`finance-status-${club.id}-${year}`);return status;
  }

  const cupDefs = year => [
    ...(year>=1960?[{id:'league-cup',name:'League Cup',kind:'domestic',startMonthDay:'09-20',entrant:'league',replays:year<1991,twoLegged:false}]:[]),
    ...(year>=1955&&year<1992?[{id:'european-cup',name:'European Cup',kind:'europe',startMonthDay:'09-25',entrant:'champion',replays:false,twoLegged:true}]:[]),
    ...(year>=1992?[{id:'champions-league',name:'Champions League',kind:'europe',startMonthDay:'09-18',entrant:year>=1997?'top4':'champion',replays:false,twoLegged:true}]:[]),
    ...(year>=1960&&year<=1998?[{id:'cup-winners-cup',name:'Cup Winners’ Cup',kind:'europe',startMonthDay:'09-28',entrant:'cup-winner',replays:false,twoLegged:true}]:[]),
    ...(year>=1971&&year<2009?[{id:'uefa-cup',name:'UEFA Cup',kind:'europe',startMonthDay:'09-22',entrant:'uefa',replays:false,twoLegged:true}]:[]),
    ...(year>=2009?[{id:'europa-league',name:'Europa League',kind:'europe',startMonthDay:'09-22',entrant:'uefa',replays:false,twoLegged:true}]:[]),
    ...(year>=2021?[{id:'conference-league',name:'UEFA Conference League',kind:'europe',startMonthDay:'09-24',entrant:'conference',replays:false,twoLegged:true}]:[])
  ];

  function competitionClub(game,source,index,definition,year){
    game.competitionClubs=safeArray(game.competitionClubs);const sourceId=source?.id||`synthetic-${definition.id}-${index}`,id=`continental-${year}-${definition.id}-${sourceId}`;let c=game.competitionClubs.find(x=>x.id===id);if(c)return c;const r=seeded(`${game.meta?.seed||1}-${id}`),name=source?.name||`${pick(['Royal','Athletic','Sporting','Union','Dynamo','Olympic'],r)} ${pick(['Vienna','Milan','Madrid','Prague','Lisbon','Brussels','Amsterdam','Paris','Munich','Belgrade'],r)}`;const strength=clamp(Number(source?.power||source?.strength||55)+Math.floor((r()-.5)*12),42,92),positions=window.FLData?.positions||['GK','FB','FB','HB','HB','IF','IF','W','W','CF','CF'];c={id,name,initials:name.split(/\s+/).map(x=>x[0]).join('').slice(0,4),location:source?.country||'Europe',country:source?.country||'Europe',foreign:true,competitionGuest:true,leagueActive:false,divisionId:null,tier:0,strength:Math.max(1,Math.round(strength/20)),clubRating:strength,powerRating:strength,reputation:strength,stature:strength,financialPower:strength,players:positions.concat(positions.slice(0,9)).map((pos,i)=>({id:`${id}-p${i}`,name:`${pick(window.FLData?.firstNames||['Marco','Jean','Hans'],r)} ${pick(window.FLData?.lastNames||['Rossi','Martin','Muller'],r)}`,age:18+Math.floor(r()*17),position:pos,ability:clamp(strength-8+Math.floor(r()*17),35,96),ceiling:clamp(strength+Math.floor(r()*12),45,98),condition:90,clubId:id,nationality:source?.country||'European',wage:1,appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},seasonHistory:[],matchHistory:[],honours:[]})),played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0,honours:[],seasonHistory:[]};game.competitionClubs.push(c);return c;
  }

  function latestArchive(game){return safeArray(game.seasonArchive).slice().sort((a,b)=>String(b.season).localeCompare(String(a.season)))[0]||null;}
  function qualificationRows(game){const archive=latestArchive(game),tables=archive?.pyramidTables||[],top=tables.slice().sort((a,b)=>Number(a.division?.tier||99)-Number(b.division?.tier||99))[0]?.table||[];return top.map(x=>clubById(game,x.id)).filter(Boolean);}
  function englishQualifiers(game,def){const top=qualificationRows(game),archive=latestArchive(game),cupWinner=archive?.cups?.find?.(x=>/FA Cup|English Cup/.test(x.name))?.winnerId||game.englishCup?.history?.at(-1)?.winnerId;if(def.entrant==='league')return activeClubs(game).filter(c=>Number(c.tier)<=4);if(def.entrant==='champion')return top.slice(0,1);if(def.entrant==='top4')return top.slice(0,4);if(def.entrant==='cup-winner')return [clubById(game,cupWinner)].filter(Boolean);if(def.entrant==='uefa')return top.slice(def.id==='europa-league'?4:1,def.id==='europa-league'?6:4);if(def.entrant==='conference')return top.slice(6,7);return [];}
  function firstCupDate(year,md){return `${year}-${md}`;}
  function shuffle(arr,seed){const r=seeded(seed),out=[...arr];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  function cupRoundName(count){if(count<=2)return 'Final';if(count<=4)return 'Semi-final';if(count<=8)return 'Quarter-final';if(count<=16)return 'Round of 16';return 'Opening round';}
  function addCupFixture(game,comp,tie,home,away,date,leg=1,replay=0){const id=`${comp.id}-${comp.startYear}-r${comp.roundNumber}-t${tie.index}-l${leg}${replay?`-rp${replay}`:''}`;const f={id,date,round:comp.roundNumber,home,away,played:false,homeGoals:null,awayGoals:null,competition:comp.name,competitionId:comp.id,divisionId:comp.id,tier:0,official:true,cupRound:comp.roundName,cupTieId:tie.id,cupLeg:leg,cupReplay:replay};game.fixtures.push(f);tie.fixtureIds.push(id);return f;}
  function scheduleCupRound(game,comp,entrants,date){const ids=shuffle(entrants,`${game.meta?.seed||1}-${comp.id}-${comp.startYear}-${comp.roundNumber}`),byes=[];if(ids.length%2)byes.push(ids.shift());comp.roundName=cupRoundName(ids.length+byes.length);const ties=[];for(let i=0;i<ids.length;i+=2){const tie={id:`${comp.id}-${comp.startYear}-r${comp.roundNumber}-t${i/2+1}`,index:i/2+1,home:ids[i],away:ids[i+1],fixtureIds:[],winnerId:null};ties.push(tie);addCupFixture(game,comp,tie,tie.home,tie.away,date,1);if(comp.twoLegged&&comp.roundName!=='Final')addCupFixture(game,comp,tie,tie.away,tie.home,addDays(date,14),2);}comp.rounds.push({number:comp.roundNumber,name:comp.roundName,date,ties,byes,complete:false});comp.currentRound=comp.rounds.length-1;game.fixtures.sort((a,b)=>a.date.localeCompare(b.date)||Number(a.tier)-Number(b.tier)||a.id.localeCompare(b.id));}

  function startExtendedCups(game,year){
    const s=ensureState(game),label=seasonLabel(year),world=window.FLWorldFootball?FLWorldFootball.clubs(game):[];for(const def of cupDefs(year)){const key=`${def.id}-${year}`;if(s.cups.seasons[key]?.rounds?.length)continue;let entrants=englishQualifiers(game,def).map(c=>c.id);if(def.kind==='europe'&&!entrants.length)continue;if(def.kind==='europe'){const target=def.id==='champions-league'&&year>=1997?32:16;for(let i=0;entrants.length<target;i++){const source=world[i%Math.max(1,world.length)];const c=competitionClub(game,source,i,def,year);if(!entrants.includes(c.id))entrants.push(c.id);if(i>target*3)break;}}if(def.kind==='domestic')entrants=[...new Set(entrants)].slice(0,128);if(entrants.length<2)continue;const comp={...def,startYear:year,season:label,active:true,roundNumber:1,roundName:'Opening round',currentRound:0,rounds:[],championId:null,champion:null};s.cups.seasons[key]=comp;scheduleCupRound(game,comp,entrants,firstCupDate(year,def.startMonthDay));}
  }

  function finishCup(game,comp,winnerId){const winner=clubById(game,winnerId);comp.active=false;comp.championId=winnerId;comp.champion=winner?.name||winnerId;const row={season:comp.season,competitionId:comp.id,name:comp.name,winnerId,winner:comp.champion,date:game.date};const s=ensureState(game);if(!s.cups.history.some(x=>x.season===row.season&&x.competitionId===row.competitionId))s.cups.history.unshift(row);if(winner&&!winner.competitionGuest){winner.honours=safeArray(winner.honours);winner.honours.push({name:comp.name,season:comp.season});}news(game,`${comp.champion} win the ${comp.name}`,`${comp.champion} lift the trophy after the ${comp.season} final.`,'competition');history(game,'competition',`${comp.champion} win the ${comp.name}`,`The ${comp.season} ${comp.name} is won by ${comp.champion}.`,{competitionId:comp.id,winnerId});}

  function progressExtendedCups(game){
    const s=ensureState(game);for(const comp of Object.values(s.cups.seasons).filter(x=>x.active)){const round=comp.rounds[comp.currentRound];if(!round||round.complete)continue;let waiting=false;for(const tie of round.ties){if(tie.winnerId)continue;const fixtures=tie.fixtureIds.map(id=>game.fixtures.find(f=>f.id===id)).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));if(fixtures.some(f=>!f.played&&!f.abandoned)){waiting=true;continue;}if(!fixtures.length){waiting=true;continue;}let homeAgg=0,awayAgg=0;fixtures.forEach((f,i)=>{if(f.home===tie.home){homeAgg+=Number(f.homeGoals||0);awayAgg+=Number(f.awayGoals||0);}else{homeAgg+=Number(f.awayGoals||0);awayAgg+=Number(f.homeGoals||0);}});if(homeAgg===awayAgg){const last=fixtures.at(-1);if(comp.replays&&fixtures.length<3){addCupFixture(game,comp,tie,last.away,last.home,addDays(last.date,7),1,fixtures.length);waiting=true;continue;}const r=seeded(`${game.meta?.seed||1}-${tie.id}-shootout`);tie.winnerId=r()<.5?tie.home:tie.away;tie.decidedBy='penalties';}else tie.winnerId=homeAgg>awayAgg?tie.home:tie.away;}
      if(waiting||round.ties.some(t=>!t.winnerId))continue;round.complete=true;const winners=[...round.byes,...round.ties.map(t=>t.winnerId)].filter(Boolean);if(winners.length===1){finishCup(game,comp,winners[0]);continue;}comp.roundNumber++;const latest=round.ties.flatMap(t=>t.fixtureIds).map(id=>game.fixtures.find(f=>f.id===id)?.date).filter(Boolean).sort().at(-1)||round.date;scheduleCupRound(game,comp,winners,addDays(latest,21));}
  }

  function cupSummaries(game){const s=ensureState(game);return Object.values(s.cups.seasons).filter(c=>c.startYear===yearOf(game)).map(c=>({id:c.id,name:c.name,active:c.active,roundName:c.roundName,champion:c.champion,rounds:c.rounds,fixtures:(game.fixtures||[]).filter(f=>f.competitionId===c.id)}));}

  function incompleteSeason(game){
    const s=ensureState(game),endingYear=yearOf(game),seasonStart=`${endingYear-1}-07-01`;const unplayed=(game.fixtures||[]).filter(f=>f.official!==false&&!f.abandoned&&!f.played&&f.date>=seasonStart&&(Number(f.seasonYear||f.startYear||endingYear-1)===endingYear-1||f.date<`${endingYear+1}-07-01`));const activeCups=[...(game.englishCup?.active?[{id:'english-cup',name:'FA Cup'}]:[]),...Object.values(s.cups.seasons).filter(c=>c.active&&c.startYear===endingYear-1).map(c=>({id:c.id,name:c.name}))];return {ok:unplayed.length===0&&activeCups.length===0,unplayed,activeCups,season:`${endingYear-1}/${String(endingYear).slice(-2)}`};
  }

  function canCloseSeason(game){const result=incompleteSeason(game),s=ensureState(game);if(result.ok){s.season.block=null;return result;}s.season.block={date:game.date,season:result.season,unplayed:result.unplayed.slice(0,20).map(f=>({id:f.id,date:f.date,competition:f.competition,home:f.home,away:f.away})),activeCups:result.activeCups};if(!game.inbox.some(x=>x.id===`season-incomplete-${result.season}`))notify(game,'Football Association',`Season cannot close: fixtures remain`,`${result.unplayed.length} fixture(s) and ${result.activeCups.length} cup competition(s) remain unfinished. The calendar will not roll over until they are resolved.`,`season-incomplete-${result.season}`);return result;}

  function beforeSeasonEnd(game,endingYear){
    const s=ensureState(game),key=String(endingYear);if(s.season.processedYears.includes(key))return {ok:false,duplicate:true};const check=canCloseSeason(game);if(!check.ok)return {ok:false,blocked:true,...check};aiManagerReview(game,endingYear);s.season.audits.unshift({endingYear,date:game.date,fixtureCount:(game.fixtures||[]).filter(f=>f.played).length,cups:s.cups.history.filter(x=>x.season===seasonLabel(endingYear)).map(x=>x.name),complete:true});s.season.processedYears.push(key);return {ok:true};
  }

  function dailyTick(game,previousDate){ensure(game);processJobMarket(game);processContractWarnings(game);completeFacilityProjects(game);processYouth(game);processTrainingReport(game);progressExtendedCups(game);if(window.FLManagerLegacyCareer)FLManagerLegacyCareer.dailyTick(game,previousDate);}

  function annualUpdate(game,newYear,archive){
    ensure(game);expireContracts(game,newYear);generateStaffMarket(game,true);generateVacancies(game,true);aiSquadPlanning(game,newYear);replenishFreeAgents(game,newYear);annualFinanceReview(game,newYear);startExtendedCups(game,newYear);const club=controlled(game);if(club&&club.id!=='unattached-manager'){const f=ensureFacilitiesForClub(game,club),maintenance=Math.round((Number(f.training)+Number(f.youth)+Number(f.medical)+Number(f.scouting))*35*(window.FLEconomy?FLEconomy.budgetIndex(newYear):1));game.finances.balance-=maintenance;f.lastMaintenanceYear=newYear;}if(window.FLManagerLegacyCareer)FLManagerLegacyCareer.annualUpdate(game,newYear,archive);return ensureState(game);
  }

  function ensure(game){
    if(!game)return null;const s=ensureState(game),year=yearOf(game);game.competitionClubs=safeArray(game.competitionClubs);if(s.playerContracts.migratedYear!==year){ensureAllContracts(game);s.playerContracts.migratedYear=year;}else{const c=controlled(game);(c?.players||[]).forEach(p=>ensurePlayerContract(game,p,c));game.freeAgents=safeArray(game.freeAgents);}if(s.facilities.migratedYear!==year){(game.clubs||[]).forEach(c=>ensureFacilitiesForClub(game,c));s.facilities.migratedYear=year;}else ensureFacilitiesForClub(game,controlled(game));if(!game.meta?.headless){replenishFreeAgents(game,year);generateManagerPool(game);generateVacancies(game);generateStaffMarket(game);startExtendedCups(game,year);}return s;
  }

  function managerMarketTable(pool){
    const available=safeArray(pool).filter(m=>m.status==='available').sort((a,b)=>Number(b.ability||0)-Number(a.ability||0)||Number(b.experience?.played||0)-Number(a.experience?.played||0));
    return `<section class="panel manager-market-panel"><div class="panel-head">UNEMPLOYED MANAGER MARKET <span>${available.length} AVAILABLE</span></div><p class="empty-note">These are persistent managers in the football world. Clubs appoint from this list, so their records and careers continue instead of a replacement being invented on demand.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Manager</th><th>Age</th><th>Nationality</th><th>Style</th><th>Formation</th><th>Level</th><th>Record</th><th>Win %</th><th>Last club</th><th>Available because</th></tr></thead><tbody>${available.map(m=>`<tr><td><strong>${m.name}</strong><small>${m.temperament||'Measured'} · ${m.reputation||'Local'} reputation</small></td><td>${m.age}</td><td>${m.nationality}</td><td>${m.style}</td><td>${m.preferredFormation}</td><td>${m.ability}/100</td><td>${m.experience?.played||0} · ${m.experience?.won||0}W ${m.experience?.drawn||0}D ${m.experience?.lost||0}L</td><td>${Number(m.experience?.winPct||0).toFixed(1)}%</td><td>${m.previousClub||'First senior appointment'}</td><td>${m.reasonAvailable||'Seeking a post'}</td></tr>`).join('')||'<tr><td colspan="10">No unemployed managers are currently registered.</td></tr>'}</tbody></table></div></section>`;
  }

  function jobsView(game){
    const s=ensure(game),jobs=s.jobs,rep=Math.round(managerReputation(game)),open=jobs.vacancies.filter(v=>v.status==='open'&&v.deadline>=game.date),apps=jobs.applications.slice(0,20),current=controlled(game);return `<div class="career-jobs-page"><div class="career-summary-strip"><article><span>STATUS</span><strong>${game.meta?.unemployed?'UNEMPLOYED':`MANAGER OF ${current?.name||'—'}`}</strong></article><article><span>REPUTATION</span><strong>${rep}/100</strong></article><article><span>OPEN VACANCIES</span><strong>${open.length}</strong></article><article><span>ACTIVE APPLICATIONS</span><strong>${apps.filter(a=>['applied','interview','offered'].includes(a.status)).length}</strong></article></div><div class="career-two-column"><section class="panel"><div class="panel-head">AVAILABLE JOBS <span>${open.length}</span></div><div class="career-job-list">${open.map(v=>{const a=applicationFor(game,v.id);const fit=window.FLManagerLegacyCareer?FLManagerLegacyCareer.jobEligibility(game,v):{eligible:true,reason:''};return `<article class="${fit.eligible?'job-realistic':'job-unrealistic'}"><div><span>TIER ${v.tier} · ${v.division}</span><h3>${v.club}</h3><p>${v.reason}</p><small>${v.expectation} · ${v.lengthYears} years · ${money(v.weeklyWage)} per week · closes ${v.deadline}</small>${!fit.eligible?`<em class="job-reputation-warning">${fit.reason}</em>`:''}</div><button data-career-job-apply="${v.id}" ${a||!fit.eligible?'disabled':''}>${a?'APPLIED':fit.eligible?'APPLY':'NOT REALISTIC'}</button></article>`}).join('')||'<div class="empty-profile-state"><strong>No vacancies today</strong><span>Jobs appear when managers leave, are dismissed or new clubs enter football.</span></div>'}</div></section><section class="panel"><div class="panel-head">APPLICATIONS & OFFERS</div><div class="career-application-list">${apps.map(a=>`<article class="status-${a.status}"><header><strong>${a.club}</strong><span>${a.status.toUpperCase()}</span></header><small>${a.directApproach?'Approached by the club':'Applied'} ${a.date}</small>${a.status==='interview'?`<p>The committee wants to hear your plan.</p><div class="career-choice-grid"><button data-career-interview="${a.id}" data-career-choice="project">Long-term project</button><button data-career-interview="${a.id}" data-career-choice="results">Immediate results</button><button data-career-interview="${a.id}" data-career-choice="stability">Stability and discipline</button><button data-career-interview="${a.id}" data-career-choice="youth">Build through youth</button></div>`:''}${a.status==='offered'?`<div class="career-offer"><b>${a.offer.lengthYears} years · ${money(a.offer.weeklyWage)} per week</b><div><button data-career-job-accept="${a.id}">ACCEPT JOB</button><button data-career-job-reject="${a.id}" class="danger">DECLINE</button></div></div>`:''}</article>`).join('')||'<p class="empty-note">No applications have been made.</p>'}</div>${!game.meta?.unemployed?'<button class="career-resign-button" data-career-resign>RESIGN AND BECOME UNEMPLOYED</button>':''}</section></div>${managerMarketTable(jobs.managerPool)}</div>`;
  }

  function playerContractsView(game){
    const club=controlled(game),players=safeArray(club?.players).slice().sort((a,b)=>String(a.contractEnd||'').localeCompare(String(b.contractEnd||'')));return `<div class="player-contract-centre"><div class="career-summary-strip"><article><span>SQUAD</span><strong>${players.length}</strong></article><article><span>EXPIRING WITHIN 12 MONTHS</span><strong>${players.filter(p=>p.contractEnd&&daysBetween(game.date,p.contractEnd)<=365).length}</strong></article><article><span>WEEKLY WAGES</span><strong>${money(players.reduce((n,p)=>n+Number(p.wage||0),0))}</strong></article><article><span>TRANSFER LISTED</span><strong>${players.filter(p=>p.transferListed).length}</strong></article></div><section class="panel"><div class="panel-head">PLAYER CONTRACTS <span>Offer, list or release</span></div><div class="table-wrap"><table class="data-table contract-management-table"><thead><tr><th>Player</th><th>Current wage</th><th>Expiry</th><th>Status</th><th>Role</th><th>New wage</th><th>Years</th><th>Actions</th></tr></thead><tbody>${players.map(p=>{ensurePlayerContract(game,p,club);const counter=p.contractOffers?.find(x=>x.status==='countered');return `<tr><td><strong>${p.name}</strong><small>${p.position} · ${p.age}</small></td><td>${money(p.wage)}</td><td>${p.contractEnd}</td><td>${p.contractStatus}${p.transferListed?' · LISTED':''}</td><td><select id="contract-role-${p.id}">${['Key Player','First Team','Rotation','Backup','Prospect'].map(x=>`<option ${p.squadStatus===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input id="contract-wage-${p.id}" type="number" min="1" value="${recommendedPlayerWage(game,p,club,p.squadStatus)}"></td><td><select id="contract-years-${p.id}">${[1,2,3,4,5].map(x=>`<option ${x===2?'selected':''}>${x}</option>`).join('')}</select></td><td><div class="contract-row-actions"><button data-player-contract-offer="${p.id}">OFFER</button>${counter?`<button data-player-contract-counter="${p.id}">ACCEPT ${money(counter.counterWage)}</button>`:''}<button data-player-transfer-list="${p.id}">${p.transferListed?'UNLIST':'LIST'}</button><button class="danger" data-player-release="${p.id}">RELEASE</button></div></td></tr>`}).join('')}</tbody></table></div></section></div>`;
  }

  function staffMarketView(game){
    const s=ensure(game),market=s.staff.market.filter(x=>x.status==='available'),members=currentStaff(game);return `<section class="panel staff-recruitment-market"><div class="panel-head">STAFF RECRUITMENT <span>${market.length} AVAILABLE</span></div><div class="staff-market-grid">${market.slice(0,18).map(c=>`<article><span>${c.role.toUpperCase()}</span><h3>${c.name}</h3><p>${c.specialism}</p><small>${c.personality} · quality ${c.quality} · age ${c.age}</small><b>${money(c.requestedWage)} / week</b><button data-staff-hire="${c.id}">HIRE</button></article>`).join('')}</div><div class="panel-head secondary">CURRENT CONTRACTED STAFF</div><div class="staff-contract-list">${members.map(m=>`<div><span><strong>${m.name}</strong><small>${m.role} · quality ${m.quality} · ${m.contractEnd?`expires ${m.contractEnd}`:'ongoing appointment'}</small></span><b>${money(m.weeklyWage||0)} / week</b><button class="danger" data-staff-dismiss="${m.id}">DISMISS</button></div>`).join('')}</div></section>`;
  }

  function facilitiesView(game){
    const club=controlled(game),f=ensureFacilitiesForClub(game,club),options=facilityOptions(yearOf(game));if(!f)return '<div class="empty-profile-state">Facilities are unavailable while unemployed.</div>';return `<div class="facilities-page"><div class="facility-summary-grid"><article><span>STADIUM</span><strong>${Number(f.stadium.capacity).toLocaleString('en-GB')}</strong><small>${club.ground||'Home ground'}</small></article><article><span>TRAINING</span><strong>LEVEL ${f.training}</strong></article><article><span>YOUTH</span><strong>LEVEL ${f.youth}</strong></article><article><span>MEDICAL</span><strong>LEVEL ${f.medical}</strong></article><article><span>SCOUTING</span><strong>LEVEL ${f.scouting}</strong></article><article><span>PITCH / SAFETY</span><strong>${f.stadium.pitch} / ${f.stadium.safety}</strong></article></div><div class="career-two-column"><section class="panel"><div class="panel-head">PROPOSE A PROJECT</div><div class="facility-options">${options.map(o=>`<article><div><strong>${o.label}</strong><p>${o.detail}</p><small>Estimated cost ${money(projectCost(game,o,club))}</small></div><button data-facility-request="${o.id}">REQUEST</button></article>`).join('')}</div></section><section class="panel"><div class="panel-head">PROJECTS</div><div class="facility-project-list">${f.projects.map(p=>`<article><span>${p.status.toUpperCase()}</span><strong>${p.label}</strong><small>${money(p.cost)} · ${p.status==='building'?`due ${p.completionDate}`:`completed ${p.completedDate}`}</small></article>`).join('')||'<p class="empty-note">No project has been commissioned.</p>'}</div></section></div></div>`;
  }

  function financeView(game){
    const club=controlled(game),status=club&&club.id!=='unattached-manager'?financialStatus(game,club):null;if(!status)return '<div class="empty-profile-state">Club finances are unavailable while unemployed.</div>';const recent=status.events.slice(0,8);return `<div class="finance-consequence-page"><div class="career-summary-strip"><article><span>STATUS</span><strong>${status.status}</strong></article><article><span>BALANCE</span><strong>${money(game.finances?.balance||0)}</strong></article><article><span>DEBT</span><strong>${money(status.debt)}</strong></article><article><span>TRANSFER EMBARGO</span><strong>${status.embargo?'ACTIVE':'NONE'}</strong></article><article><span>POINTS DEDUCTION</span><strong>${status.pointsDeduction||0}</strong></article></div><section class="panel"><div class="panel-head">FINANCIAL CONSEQUENCES</div><p>Negative balances can lead to warnings, wage arrears, a transfer embargo, emergency board support and—where the era permits—administration and a points deduction.</p><div class="meeting-log">${recent.map(x=>`<article><time>${x.date}</time><p><strong>${x.status}</strong> · balance ${money(x.balance)} · debt ${money(x.debt)}${x.pointsDeduction?` · ${x.pointsDeduction} points deducted`:''}</p></article>`).join('')||'<p class="empty-note">No financial review has been recorded.</p>'}</div></section></div>`;
  }

  function youthPanel(game){const s=ensure(game),year=yearOf(game),preview=s.youth.previews.find(x=>x.year===year&&x.clubId===game.controlledClubId),last=s.youth.history.find(x=>x.clubId===game.controlledClubId);return `<section class="panel youth-pipeline-panel"><div class="panel-head">ANNUAL YOUTH PIPELINE</div><div class="youth-pipeline-grid"><article><span>NEXT INTAKE</span><strong>15 March ${year}</strong><small>${preview?`${preview.label} group · ${preview.areas.join(' · ')}`:'The January preview has not yet arrived.'}</small></article><article><span>LAST INTAKE</span><strong>${last?`${last.count} players`:'None recorded'}</strong><small>${last?`Best initial prospect: ${last.best}`:'Youth history begins with the first intake.'}</small></article><article><span>CURRENT PIPELINE QUALITY</span><strong>${Math.round(youthQuality(game))}/100</strong><small>Facilities, youth staff and scouting all contribute.</small></article></div></section>`;}
  function trainingPanel(game){const reports=ensure(game).training.reports.slice(0,8),latest=reports[0];return `<section class="panel training-progress-panel"><div class="panel-head">WEEKLY DEVELOPMENT REPORTS</div>${latest?`<div class="training-report-summary"><strong>${latest.date} · ${latest.focus}</strong><span>Average condition ${latest.averageCondition}%</span><span>${latest.improvements.length} rating improvement${latest.improvements.length===1?'':'s'}</span><span>${latest.injuries.length} training injur${latest.injuries.length===1?'y':'ies'}</span></div>`:''}<div class="meeting-log">${reports.map(r=>`<article><time>${r.date}</time><p><strong>${r.focus} · ${r.intensity}</strong> · ${r.improvements.map(x=>x.player).join(', ')||'No rating increase'}${r.injuries.length?` · injuries: ${r.injuries.map(x=>x.player).join(', ')}`:''}</p></article>`).join('')||'<p class="empty-note">The first report is produced on Monday.</p>'}</div></section>`;}
  function cupsView(game){const rows=cupSummaries(game);return `<div class="extended-cup-grid">${rows.map(c=>{const round=c.rounds[c.rounds.length-1],fixtures=c.fixtures.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);return `<section class="panel"><div class="panel-head">${c.name.toUpperCase()} <span>${c.active?c.roundName:'COMPLETE'}</span></div>${c.champion?`<div class="cup-champion"><span>WINNER</span><strong>${c.champion}</strong></div>`:''}<div class="history-results-list">${fixtures.map(f=>`<div><time>${f.date}</time><strong>${clubById(game,f.home)?.name||f.home} ${f.played?`${f.homeGoals}–${f.awayGoals}`:'v'} ${clubById(game,f.away)?.name||f.away}</strong><span>${f.cupRound||`Round ${f.round}`}${f.cupLeg>1?` · leg ${f.cupLeg}`:''}</span></div>`).join('')||'<p class="empty-note">Fixtures have not yet been drawn.</p>'}</div></section>`}).join('')||'<section class="panel"><div class="empty-profile-state"><strong>No additional cup is active</strong><span>The League Cup and European competitions appear at their configured historical start dates.</span></div></section>'}</div>`;}

  function bindUI(game,callbacks={}){
    const save=message=>{if(message){const note=document.getElementById('saveNote');if(note)note.textContent=message;}if(window.FLSave)(FLSave.saveSoon?FLSave.saveSoon(game,100):FLSave.save(game));callbacks.render?.(game);};
    document.querySelectorAll('[data-career-job-apply]').forEach(el=>el.addEventListener('click',()=>{const r=applyForJob(game,el.dataset.careerJobApply);save(r.message);}));
    document.querySelectorAll('[data-career-interview]').forEach(el=>el.addEventListener('click',()=>{const r=answerInterview(game,el.dataset.careerInterview,el.dataset.careerChoice);save(r.message);}));
    document.querySelectorAll('[data-career-job-accept]').forEach(el=>el.addEventListener('click',()=>{const r=acceptJob(game,el.dataset.careerJobAccept);save(r.message);}));
    document.querySelectorAll('[data-career-job-reject]').forEach(el=>el.addEventListener('click',()=>{const r=rejectJob(game,el.dataset.careerJobReject);save(r.message);}));
    document.querySelector('[data-career-resign]')?.addEventListener('click',()=>{if(!confirm('Resign from the current club and become unemployed?'))return;const r=resign(game);save(r.message);});
    document.querySelectorAll('[data-player-contract-offer]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.playerContractOffer,r=offerPlayerContract(game,id,{wage:document.getElementById(`contract-wage-${id}`)?.value,years:document.getElementById(`contract-years-${id}`)?.value,role:document.getElementById(`contract-role-${id}`)?.value});save(r.message);}));
    document.querySelectorAll('[data-player-contract-counter]').forEach(el=>el.addEventListener('click',()=>{const r=acceptPlayerCounter(game,el.dataset.playerContractCounter);save(r.message);}));
    document.querySelectorAll('[data-player-transfer-list]').forEach(el=>el.addEventListener('click',()=>{const r=toggleTransferList(game,el.dataset.playerTransferList);save(r.message);}));
    document.querySelectorAll('[data-player-release]').forEach(el=>el.addEventListener('click',()=>{const p=(controlled(game)?.players||[]).find(x=>x.id===el.dataset.playerRelease);if(!p||!confirm(`Release ${p.name}?`))return;const r=releasePlayer(game,p.id);save(r.message);}));
    document.querySelectorAll('[data-staff-hire]').forEach(el=>el.addEventListener('click',()=>{const r=hireStaff(game,el.dataset.staffHire);save(r.message);}));
    document.querySelectorAll('[data-staff-dismiss]').forEach(el=>el.addEventListener('click',()=>{if(!confirm('Dismiss this staff member?'))return;const r=dismissStaff(game,el.dataset.staffDismiss);save(r.message);}));
    document.querySelectorAll('[data-facility-request]').forEach(el=>el.addEventListener('click',()=>{const r=requestFacility(game,el.dataset.facilityRequest);save(r.message);}));
  }

  return {VERSION,ensure,dailyTick,annualUpdate,beforeSeasonEnd,canCloseSeason,progressExtendedCups,startExtendedCups,cupSummaries,clubById,transferAllowed,jobsView,playerContractsView,staffMarketView,facilitiesView,financeView,youthPanel,trainingPanel,cupsView,bindUI,applyForJob,answerInterview,acceptJob,rejectJob,resign,offerPlayerContract,acceptPlayerCounter,toggleTransferList,releasePlayer,hireStaff,dismissStaff,requestFacility,financialStatus,managerReputation,recommendedPlayerWage,_managerTools:{createVacancy,closeCurrentAppointment,resetControlledClubSystems,ensureUnattachedClub,makeAIManager},_test:{ensureState,generateVacancies,generateStaffMarket,makeYouthCandidate,aiManagerReview,aiSquadPlanning,incompleteSeason}};
})();
