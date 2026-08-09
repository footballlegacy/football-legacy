window.FLWorldFootball = (() => {
  const data=window.FLWorldFootballData||{leagues:[]};
  const CONFIG={
    ROSTER_SIZE:18,HISTORY_LIMIT:180,PLAYER_HISTORY_LIMIT:50,RETIRED_LIMIT:1200,
    CLUB_POWER_DRIFT:.085,CLUB_MOMENTUM_PERSISTENCE:.72,CLUB_SHOCK_CHANCE:.006,
    SCOUT_REPORT_GAIN:38,SCOUT_REPORT_MAX:100,BASE_FOREIGN_TRANSFER_CHANCE:.42
  };
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const seeded=seed=>{let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
  const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
  const isoYear=date=>Number(String(date||'1888').slice(0,4))||1888;
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const slug=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const positions=['GK','GK','FB','FB','FB','FB','HB','HB','HB','HB','W','W','IF','IF','CF','CF','CF','W','HB','FB'];
  const genericFirst=['Alex','Daniel','Emil','Felix','Hugo','Ivan','Julian','Leo','Marco','Nico','Rafael','Samuel'];
  const genericLast=['Costa','Garcia','Martin','Meyer','Rossi','Silva','Santos','Weber','Moreau','Alves','Pereira','Schmidt'];
  const nationalityLeague={Scottish:'scotland',Spanish:'spain',Italian:'italy',French:'france',Portuguese:'portugal',Brazilian:'brazil',German:'germany'};

  function leagueDef(id){return data.leagues.find(l=>l.id===id)||null;}
  function nameFor(def,year){return [...(def.names||[])].sort((a,b)=>a.from-b.from).filter(x=>x.from<=year).at(-1)?.name||def.country+' League';}
  function sizeFor(def,year){return [...(def.sizes||[])].sort((a,b)=>a.from-b.from).filter(x=>x.from<=year).at(-1)?.size||def.clubs.length;}
  function suspended(def,year){return (def.suspensions||[]).find(x=>year>=x.from&&year<=x.to)||null;}
  function namePool(nationality){const pool=window.FLTimelineData?.namePools?.[nationality];return pool||{first:genericFirst,last:genericLast};}
  function activeDate(def){return String(def.startDate||`${def.startYear}-07-01`);}
  function dateReached(game,def){return String(game.date||'1888-08-15')>=activeDate(def);}
  function worldState(game){return ensure(game);}

  function baseState(){return {version:1,leagues:{},unlockedLeagueIds:[],scoutingReports:{},pendingScouting:[],transferHistory:[],retiredPlayers:[],events:[],migrationBackfilled:false};}
  function ensure(game,options={}){
    if(!game.worldFootball||typeof game.worldFootball!=='object')game.worldFootball=baseState();
    const w=game.worldFootball;
    w.version=1;w.leagues=w.leagues&&typeof w.leagues==='object'?w.leagues:{};
    w.unlockedLeagueIds=Array.isArray(w.unlockedLeagueIds)?w.unlockedLeagueIds:[];
    w.scoutingReports=w.scoutingReports&&typeof w.scoutingReports==='object'?w.scoutingReports:{};
    w.pendingScouting=Array.isArray(w.pendingScouting)?w.pendingScouting:[];
    w.transferHistory=Array.isArray(w.transferHistory)?w.transferHistory:[];
    w.retiredPlayers=Array.isArray(w.retiredPlayers)?w.retiredPlayers:[];
    w.events=Array.isArray(w.events)?w.events:[];
    const currentYear=isoYear(game.date),yearChanged=Number(w.lastEnsuredYear)!==currentYear,eligible=options.skipUnlock?data.leagues.filter(def=>Boolean(w.leagues[def.id])):data.leagues.filter(def=>dateReached(game,def));
    eligible.forEach(def=>{
      if(!w.leagues[def.id])activateLeague(game,def,currentYear,false,{backfill:options.backfill!==false&&currentYear>Number(activeDate(def).slice(0,4))+1});
      else if(yearChanged||Number(w.leagues[def.id].schemaVersion||0)<1){repairLeague(game,w.leagues[def.id],def,currentYear);w.leagues[def.id].schemaVersion=1;}
    });
    w.lastEnsuredYear=currentYear;game.version='0.22.6';
    return w;
  }

  function repairLeague(game,league,def,year){
    league.id=def.id;league.country=def.country;league.nationality=def.nationality;league.name=nameFor(def,year);league.startDate=def.startDate;league.distance=def.distance;
    league.history=Array.isArray(league.history)?league.history:[];league.clubs=Array.isArray(league.clubs)?league.clubs:[];league.table=Array.isArray(league.table)?league.table:[];
    league.records=league.records||{titles:{},recordPoints:null};league.records.titles=league.records.titles||{};
    league.clubs.forEach(c=>repairClub(game,c,league,year));activateFoundedClubs(game,league,year);
  }

  function activateLeague(game,def,year,announce=true,options={}){
    const w=game.worldFootball||baseState();game.worldFootball=w;
    const startYear=Number(activeDate(def).slice(0,4));
    const league={id:def.id,country:def.country,nationality:def.nationality,name:nameFor(def,year),startDate:def.startDate,distance:def.distance,baseQuality:def.baseQuality,threePointsYear:def.threePointsYear,
      lastSimulatedSeason:startYear-1,history:[],table:[],records:{titles:{},recordPoints:null},clubs:[]};
    league.clubs=def.clubs.map((seed,index)=>createClub(game,league,seed,index,year));
    w.leagues[def.id]=league;if(!w.unlockedLeagueIds.includes(def.id))w.unlockedLeagueIds.push(def.id);
    if(options.backfill)backfillLeague(game,league,def,startYear,year-1);
    setPreseasonTable(league,def,year);
    absorbGlobalProspects(game,league,year);
    if(announce){
      const event={id:`foreign-league-${def.id}`,date:def.startDate,title:`${league.name} becomes visible`,text:`Reports and results from ${def.country} now reach English football. Clubs and players can be viewed, searched and scouted, though knowledge is limited by the era.`};
      if(!w.events.some(x=>x.id===event.id))w.events.push(event);
      game.news=Array.isArray(game.news)?game.news:[];game.history=Array.isArray(game.history)?game.history:[];game.inbox=Array.isArray(game.inbox)?game.inbox:[];
      game.news.unshift({date:event.date,headline:event.title});game.history.push({id:event.id,date:event.date,type:'world',category:'foreign-league',title:event.title,text:event.text});
      game.inbox.unshift({id:event.id,date:event.date,from:'International Football Desk',subject:event.title,body:event.text,read:false});
    }
    return league;
  }

  function createClub(game,league,seed,index,year){
    const r=seeded(hash(`${game.meta?.seed||1}-${league.id}-${seed.reference}-${year}`));
    const id=`world-${league.id}-${slug(seed.name)}`,power=clamp(30+Number(seed.strength||3)*10+(r()-.5)*6,38,94);
    const c={id,name:seed.name,reference:seed.reference,initials:seed.name.split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase(),location:seed.city,city:seed.city,country:league.country,nationality:league.nationality,
      primary:seed.primary,secondary:seed.secondary,colours:'Traditional club colours',ground:`${seed.city} Ground`,founded:seed.founded,foreign:true,playable:false,worldLeagueId:league.id,
      stature:Number(seed.stature||power),powerRating:power,momentum:(r()-.5)*4,financialPower:clamp(Number(seed.stature||power)*.75+15,35,96),youthQuality:clamp(Number(seed.stature||power)*.66+18,35,96),
      honours:[],allTime:{seasons:0,titles:0,bestFinish:null,points:0,goals:0},players:[]};
    c.worldActivatedYear=Number(seed.founded||0)<=year?year:null;c.players=c.worldActivatedYear?Array.from({length:CONFIG.ROSTER_SIZE},(_,i)=>makePlayer(game,league,c,year,i,r)):[];
    return c;
  }
  function repairClub(game,c,league,year){
    c.foreign=true;c.playable=false;c.worldLeagueId=league.id;c.country=league.country;c.nationality=league.nationality;c.players=Array.isArray(c.players)?c.players:[];
    c.honours=Array.isArray(c.honours)?c.honours:[];c.allTime=c.allTime||{seasons:0,titles:0,bestFinish:null,points:0,goals:0};
    c.players.forEach((p,i)=>repairPlayer(game,p,league,c,year,i));
  }
  function activateFoundedClubs(game,league,year){
    league.clubs.forEach(c=>{
      if(Number(c.founded||0)>year)return;
      if(c.worldActivatedYear==null)c.worldActivatedYear=year;
      if(!Array.isArray(c.players)||!c.players.length){const r=seeded(hash(`${game.meta?.seed||1}-${league.id}-${c.id}-${year}-club-launch`));c.players=Array.from({length:CONFIG.ROSTER_SIZE},(_,i)=>makePlayer(game,league,c,year,i,r));}
    });
  }
  function makePlayer(game,league,club,year,index,r,overrides={}){
    const pool=namePool(overrides.nationality||league.nationality),age=overrides.age??(16+Math.floor(r()*19)),position=overrides.position||positions[index%positions.length];
    const ageEffect=age<20?-5:age<24?0:age<30?3:age<33?0:-4;
    const base=clamp(Math.round(club.powerRating*.72+league.baseQuality*.2+ageEffect+(r()-.5)*14),34,92),ceiling=clamp(overrides.ceiling??(base+6+Math.floor(r()*17)),base,99);
    const name=overrides.name||`${pick(pool.first,r)} ${pick(pool.last,r)}`;
    const p={id:overrides.id||`${club.id}-p-${year}-${index+1}-${Math.floor(r()*999999)}`,name,clubId:club.id,foreignClubId:club.id,worldLeagueId:league.id,nationality:overrides.nationality||league.nationality,
      position,age,condition:92,form:'—',ability:overrides.ability??base,ceiling,potential:overrides.potential??Math.round(base+(ceiling-base)*.72),developmentCurve:overrides.developmentCurve||pick(['early','steady','steady','steady','late','volatile'],r),
      personalityProfile:overrides.personalityProfile||{professionalism:35+Math.floor(r()*65),ambition:30+Math.floor(r()*70),loyalty:25+Math.floor(r()*75),leadership:20+Math.floor(r()*80),bigMatches:25+Math.floor(r()*75),consistency:35+Math.floor(r()*65),injuryProneness:8+Math.floor(r()*78),temperament:20+Math.floor(r()*80),teamwork:35+Math.floor(r()*65),determination:30+Math.floor(r()*70),adaptability:25+Math.floor(r()*75)},
      personalityLabel:overrides.personalityLabel||pick(['Professional','Driven','Determined','Balanced','Loyal','Ambitious'],r),wage:overrides.wage??Math.max(1,Math.round(base/12)),transferValue:0,
      appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},seasonHistory:[],matchHistory:[],honours:[],status:'active',generatedYear:year,
      legendArchetype:overrides.legendArchetype||null,archetypeLabel:overrides.archetypeLabel||null,traits:overrides.traits||[]};
    if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,p,year,{forceName:!overrides.name});p.wage=window.FLEconomy?FLEconomy.recommendedWage(game,p,club,p.squadStatus||'First Team'):p.wage;p.transferValue=transferValue(game,p,club);return p;
  }
  function repairPlayer(game,p,league,club,year,index){
    p.clubId=club.id;p.foreignClubId=club.id;p.worldLeagueId=league.id;p.nationality=p.nationality||league.nationality;p.position=p.position||positions[index%positions.length];p.age=Number(p.age)||22;
    p.ability=Number(p.ability)||50;p.ceiling=Number(p.ceiling)||Math.min(99,p.ability+12);p.potential=Number(p.potential)||Math.round(p.ability+(p.ceiling-p.ability)*.72);p.status=p.status||'active';
    p.careerTotals=p.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};p.seasonHistory=Array.isArray(p.seasonHistory)?p.seasonHistory:[];p.honours=Array.isArray(p.honours)?p.honours:[];p.personalityProfile=p.personalityProfile||{professionalism:55,ambition:55,loyalty:55,leadership:45,bigMatches:50,consistency:55,injuryProneness:35,temperament:50,teamwork:55,determination:55,adaptability:50};p.personalityLabel=p.personalityLabel||'Balanced';
    if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,p,year);p.wage=Number(p.wage)||(window.FLEconomy?FLEconomy.recommendedWage(game,p,club,p.squadStatus||'First Team'):1);p.transferValue=Number(p.transferValue)||transferValue(game,p,club);return p;
  }

  function setPreseasonTable(league,def,year){
    const available=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year),size=Math.min(sizeFor(def,year),available.length),clubs=[...available].sort((a,b)=>b.powerRating-a.powerRating).slice(0,size);
    league.table=clubs.map((c,i)=>({position:i+1,clubId:c.id,club:c.name,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,points:0,power:+c.powerRating.toFixed(1)}));
  }
  function poisson(lambda,r){let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=r()}while(p>L&&k<10);return k-1;}
  function play(game,home,away,year,r){
    const eraGoal=year<1930?1.35:year<1960?1.55:year<1990?1.42:1.34,diff=(home.powerRating-away.powerRating)/22;
    const hg=clamp(poisson(clamp(eraGoal+.26+diff*.34,.25,3.3),r),0,8),ag=clamp(poisson(clamp(eraGoal-diff*.32,.2,3.1),r),0,8);return [hg,ag];
  }

  const HERITAGE_PROFILES=new Map(Object.entries({'real madrid':80,'rangers':74,'celtic':74,'barcelona':78,'bayern munich':77,'juventus':75,'ac milan':74,'inter milan':74,'manchester united':74,'arsenal':72,'chelsea':70,'liverpool':74}));
  function heritageKey(club){return [club?.reference,club?.realName,club?.realClub,club?.canonicalName].filter(Boolean).map(n=>String(n).trim().toLowerCase()).find(n=>HERITAGE_PROFILES.has(n))||null;}
  function heritageGiant(club){return Boolean(heritageKey(club));}
  function heritageFloorFor(club){return HERITAGE_PROFILES.get(heritageKey(club))||32;}
  function updateClubPower(game,league,club,performance,year,r){
    club.momentum=clamp(Number(club.momentum||0)*CONFIG.CLUB_MOMENTUM_PERSISTENCE+performance*8+(r()-.5)*1.4,-12,12);
    club.stature=clamp(Number(club.stature||55)+performance*.18+(r()-.5)*.08+(heritageGiant(club)&&Number(club.stature||55)<72?.16:0),heritageGiant(club)?heritageFloorFor(club):32,98);
    club.financialPower=clamp(Number(club.financialPower||55)+(club.stature-club.financialPower)*.045+performance*.8+(r()-.5)*.45,30,98);
    club.youthQuality=clamp(Number(club.youthQuality||55)+(club.stature*.62+club.financialPower*.24+12-club.youthQuality)*.06+(r()-.5)*.55,30,98);
    if(r()<CONFIG.CLUB_SHOCK_CHANCE){const positive=r()<.62,change=positive?5+Math.floor(r()*8):-(4+Math.floor(r()*7));club.stature=clamp(club.stature+change,28,99);club.financialPower=clamp(club.financialPower+change*1.2,25,99);club.momentum=clamp(club.momentum+change*.7,-12,12);club.honours.push({name:positive?'Transformative investment':'Financial crisis',season:String(year),story:true});}
    const target=club.stature*.62+club.financialPower*.17+club.youthQuality*.13+league.baseQuality*.08+club.momentum+(heritageGiant(club)&&club.powerRating<74?2.2:0);
    club.powerRating=clamp(club.powerRating+(target-club.powerRating)*CONFIG.CLUB_POWER_DRIFT+performance*1.1+(r()-.5)*.7,34,98);
  }
  function simulatePlayerSeason(game,league,club,year,matches,finish,r){
    const active=club.players.filter(p=>p.status==='active').sort((a,b)=>b.ability-a.ability),top=active.slice(0,18),teamGoals=Math.max(10,Math.round((club._seasonGF||matches*1.2)));
    top.forEach((p,i)=>{
      const age=Number(p.age)||22,apps=clamp(matches-Math.floor(r()*Math.max(2,matches*.28))-(i>14?Math.floor(r()*8):0),2,matches),startRatio=i<11?.88:i<15?.5:.25;
      const posWeight=p.position==='CF'?.22:p.position==='IF'?.16:p.position==='W'?.13:p.position==='HB'?.055:p.position==='FB'?.028:.005;
      const goals=Math.max(0,Math.round(teamGoals*posWeight*(.65+p.ability/110)*(apps/matches)*(r()*.65+.72))),assists=Math.max(0,Math.round(goals*.35+r()*Math.max(1,apps*.13)));
      const clean=p.position==='GK'?Math.max(0,Math.round((matches-(club._seasonGA||matches))*0.2+r()*6)):0;
      p.careerTotals=p.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0};p.careerTotals.appearances+=apps;p.careerTotals.goals+=goals;p.careerTotals.assists+=assists;p.careerTotals.cleanSheets+=clean;
      p.seasonHistory=Array.isArray(p.seasonHistory)?p.seasonHistory:[];p.seasonHistory.push({season:`${year}-${String(year+1).slice(2)}`,club:club.name,league:league.name,apps,goals,assists,cleanSheets:clean,rating:+(6.1+(p.ability-50)*.018+(r()-.5)*.55).toFixed(2),ability:p.ability,finish});if(p.seasonHistory.length>CONFIG.PLAYER_HISTORY_LIMIT)p.seasonHistory=p.seasonHistory.slice(-CONFIG.PLAYER_HISTORY_LIMIT);
      const ageWindow=age<21?1.1:age<25?.7:age<29?.25:age<32?-.15:-(age-30)*.28,gap=Math.max(0,p.ceiling-p.ability),change=Math.round(gap/15*ageWindow+(r()-.5)*.6);
      p.ability=clamp(p.ability+change,30,99);p.potential=clamp(Math.round(p.ability+(p.ceiling-p.ability)*.68),p.ability,99);p.age=age+1;if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,p,year+1);p.wage=window.FLEconomy?FLEconomy.recommendedWage(game,p,club,p.squadStatus||'First Team'):p.wage;p.transferValue=transferValue(game,p,club);
    });
  }
  function retireAndRenew(game,league,club,year,r){
    const survivors=[];
    club.players.forEach(p=>{const age=Number(p.age)||22,chance=age<33?0:age===33?.06:age===34?.15:age===35?.3:age===36?.5:age===37?.72:.9;if(p.status!=='active'||r()<chance){
      p.status='retired';p.retiredDate=`${year+1}-07-01`;game.worldFootball.retiredPlayers.push({id:p.id,name:p.name,nationality:p.nationality,position:p.position,age,retiredAge:age,birthYear:Number(p.birthYear)||year+1-age,ability:Number(p.ability)||0,potential:Number(p.potential)||Number(p.ability)||0,ceiling:Number(p.ceiling)||Number(p.potential)||Number(p.ability)||0,personalityLabel:p.personalityLabel||'Balanced',traits:[...(p.traits||[])],lastClubId:club.id,lastClub:club.name,leagueId:league.id,retiredDate:p.retiredDate,legendArchetype:p.legendArchetype,archetypeLabel:p.archetypeLabel,careerTotals:{...(p.careerTotals||{})},clubHistory:(p.clubHistory||[]).map((spell,index,all)=>({...spell,to:index===all.length-1&&spell.to==='Present'?year+1:spell.to})),seasonHistory:(p.seasonHistory||[]).slice(-CONFIG.PLAYER_HISTORY_LIMIT),honours:[...(p.honours||[])]});
    }else survivors.push(p)});
    club.players=survivors;while(club.players.length<CONFIG.ROSTER_SIZE){club.players.push(makePlayer(game,league,club,year+1,club.players.length,r,{age:16+Math.floor(r()*3)}));}
    if(game.worldFootball.retiredPlayers.length>CONFIG.RETIRED_LIMIT){const legends=game.worldFootball.retiredPlayers.filter(p=>p.legendArchetype),ordinary=game.worldFootball.retiredPlayers.filter(p=>!p.legendArchetype).sort((a,b)=>(b.careerTotals?.goals||0)-(a.careerTotals?.goals||0)||(b.careerTotals?.appearances||0)-(a.careerTotals?.appearances||0)).slice(0,CONFIG.RETIRED_LIMIT);game.worldFootball.retiredPlayers=[...legends,...ordinary];}
  }
  function simulateForeignTransfers(game,league,year,r){
    const moves=Math.max(1,Math.floor(league.clubs.length/7));
    for(let i=0;i<moves;i++){
      const sellers=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year).sort(()=>r()-.5),from=sellers.find(c=>c.players.length>17);if(!from)continue;
      const candidate=[...from.players].filter(p=>p.age>=18&&p.age<=29).sort((a,b)=>b.ability-a.ability)[Math.floor(r()*Math.min(8,from.players.length))];if(!candidate)continue;
      const buyers=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year&&c.id!==from.id&&c.stature>from.stature-8).sort((a,b)=>b.stature-a.stature),to=buyers[Math.floor(r()*Math.min(6,buyers.length))];if(!to)continue;
      from.players=from.players.filter(p=>p.id!==candidate.id);candidate.clubId=to.id;candidate.foreignClubId=to.id;candidate.clubHistory=Array.isArray(candidate.clubHistory)?candidate.clubHistory:[];candidate.clubHistory.push({club:from.name,from:'Earlier',to:year,apps:candidate.careerTotals?.appearances||0,goals:candidate.careerTotals?.goals||0});to.players.push(candidate);
      const fee=transferValue(game,candidate,from);game.worldFootball.transferHistory.unshift({id:`wf-${candidate.id}-${year}-${i}`,date:`${year}-07-01`,playerId:candidate.id,player:candidate.name,from:from.name,to:to.name,fromId:from.id,toId:to.id,fee,leagueId:league.id,international:false});
    }
    if(game.worldFootball.transferHistory.length>600)game.worldFootball.transferHistory=game.worldFootball.transferHistory.slice(0,600);
  }

  function simulateSeason(game,league,def,endingYear){
    if(league.lastSimulatedSeason>=endingYear)return null;
    const r=seeded(hash(`${game.meta?.seed||1}-${league.id}-${endingYear}-foreign-season`)),suspension=suspended(def,endingYear);
    if(suspension){league.history.push({season:`${endingYear}-${String(endingYear+1).slice(2)}`,endingYear,suspended:true,note:suspension.label});league.lastSimulatedSeason=endingYear;return league.history.at(-1);}
    league.name=nameFor(def,endingYear);activateFoundedClubs(game,league,endingYear);const available=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=endingYear),size=Math.min(sizeFor(def,endingYear),available.length),clubs=[...available].sort((a,b)=>b.stature-a.stature||b.powerRating-a.powerRating).slice(0,size);
    const rows=new Map(clubs.map(c=>[c.id,{position:0,clubId:c.id,club:c.name,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,gd:0,points:0,power:+c.powerRating.toFixed(1)}])),pointsWin=endingYear>=Number(def.threePointsYear||1981)?3:2;
    for(let i=0;i<clubs.length;i++)for(let j=i+1;j<clubs.length;j++){
      for(const [home,away] of [[clubs[i],clubs[j]],[clubs[j],clubs[i]]]){const [hg,ag]=play(game,home,away,endingYear,r),hr=rows.get(home.id),ar=rows.get(away.id);hr.played++;ar.played++;hr.gf+=hg;hr.ga+=ag;ar.gf+=ag;ar.ga+=hg;if(hg>ag){hr.won++;ar.lost++;hr.points+=pointsWin}else if(ag>hg){ar.won++;hr.lost++;ar.points+=pointsWin}else{hr.drawn++;ar.drawn++;hr.points++;ar.points++;}}
    }
    const table=[...rows.values()].map(x=>({...x,gd:x.gf-x.ga})).sort((a,b)=>b.points-a.points||b.gd-a.gd||b.gf-a.gf).map((x,i)=>({...x,position:i+1}));
    table.forEach(row=>{const c=clubs.find(x=>x.id===row.clubId),percentile=table.length<=1?1:1-(row.position-1)/(table.length-1),expected=clamp(.5+(c.stature-(clubs.reduce((n,x)=>n+x.stature,0)/clubs.length))/65,.2,.82),performance=percentile-expected;c._seasonGF=row.gf;c._seasonGA=row.ga;c.allTime.seasons++;c.allTime.points+=row.points;c.allTime.goals+=row.gf;c.allTime.bestFinish=c.allTime.bestFinish==null?row.position:Math.min(c.allTime.bestFinish,row.position);updateClubPower(game,league,c,performance,endingYear,r);simulatePlayerSeason(game,league,c,endingYear,row.played,row.position,r);retireAndRenew(game,league,c,endingYear,r);delete c._seasonGF;delete c._seasonGA;});
    const championClub=clubs.find(c=>c.id===table[0]?.clubId),topPlayers=clubs.flatMap(c=>c.players.map(p=>({p,c}))).sort((a,b)=>(b.p.seasonHistory.at(-1)?.goals||0)-(a.p.seasonHistory.at(-1)?.goals||0)),top=topPlayers[0];
    if(championClub){championClub.allTime.titles++;championClub.honours.push({name:league.name,season:`${endingYear}-${String(endingYear+1).slice(2)}`});league.records.titles[championClub.id]=(league.records.titles[championClub.id]||0)+1;}
    const record={season:`${endingYear}-${String(endingYear+1).slice(2)}`,endingYear,championId:championClub?.id||null,champion:championClub?.name||'—',runnerUp:table[1]?.club||'—',championPoints:table[0]?.points||0,topScorerId:top?.p.id||null,topScorer:top?.p.name||'—',topScorerClub:top?.c.name||'—',topScorerGoals:top?.p.seasonHistory.at(-1)?.goals||0};
    if(!league.records.recordPoints||record.championPoints>league.records.recordPoints.points)league.records.recordPoints={points:record.championPoints,club:record.champion,season:record.season};
    league.table=table;league.history.push(record);if(league.history.length>CONFIG.HISTORY_LIMIT)league.history=league.history.slice(-CONFIG.HISTORY_LIMIT);league.lastSimulatedSeason=endingYear;
    simulateForeignTransfers(game,league,endingYear+1,r);return record;
  }

  function backfillLeague(game,league,def,fromYear,toYear){
    if(toYear<fromYear)return;
    const r=seeded(hash(`${game.meta?.seed||1}-${league.id}-backfill`));
    for(let y=fromYear;y<=toYear;y++){
      const suspension=suspended(def,y);if(suspension){league.history.push({season:`${y}-${String(y+1).slice(2)}`,endingYear:y,suspended:true,note:suspension.label});continue;}
      activateFoundedClubs(game,league,y);const available=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=y),size=Math.min(sizeFor(def,y),available.length),clubs=[...available].sort((a,b)=>(b.stature+b.momentum+r()*10)-(a.stature+a.momentum+r()*10)).slice(0,size),champion=clubs[Math.floor(Math.pow(r(),2.7)*Math.min(8,clubs.length))]||clubs[0];
      if(!champion)continue;const max=(size-1)*2*(y>=Number(def.threePointsYear||1981)?3:2),points=Math.round(max*(.57+r()*.17));champion.allTime.titles++;champion.allTime.seasons++;champion.honours.push({name:nameFor(def,y),season:`${y}-${String(y+1).slice(2)}`});league.records.titles[champion.id]=(league.records.titles[champion.id]||0)+1;
      league.history.push({season:`${y}-${String(y+1).slice(2)}`,endingYear:y,championId:champion.id,champion:champion.name,runnerUp:'Archived',championPoints:points,topScorer:'Archived',topScorerGoals:0,backfilled:true});league.lastSimulatedSeason=y;
      champion.stature=clamp(champion.stature+.1,30,98);champion.powerRating=clamp(champion.powerRating+.08,34,98);
    }
    if(league.history.length>CONFIG.HISTORY_LIMIT)league.history=league.history.slice(-CONFIG.HISTORY_LIMIT);
  }

  function processDate(game,previousDate,currentDate){
    const w=ensure(game,{backfill:false,skipUnlock:true}),unlocked=[],completed=[];
    data.leagues.filter(def=>activeDate(def)>previousDate&&activeDate(def)<=currentDate&&!w.leagues[def.id]).forEach(def=>{activateLeague(game,def,isoYear(currentDate),true);unlocked.push(def.id)});
    const due=w.pendingScouting.filter(x=>x.dueDate<=currentDate&&!x.complete);due.forEach(report=>{
      const found=player(game,report.playerId),existing=Number(w.scoutingReports[report.playerId]?.knowledge||0),starting=Math.max(existing,found?baseKnowledge(game,found.league,found.player):0),knowledge=clamp(starting+CONFIG.SCOUT_REPORT_GAIN+Number(report.recruitmentBonus||0),0,CONFIG.SCOUT_REPORT_MAX);report.complete=true;report.completedDate=currentDate;w.scoutingReports[report.playerId]={knowledge,lastReportDate:currentDate,leagueId:report.leagueId};completed.push(report.playerId);
      if(found){game.inbox.unshift({id:`scout-complete-${report.playerId}-${currentDate}`,date:currentDate,from:'Chief Scout',subject:`Scouting report: ${found.player.name}`,body:`The scouting trip is complete. We now have ${knowledge>=85?'excellent':knowledge>=60?'good':knowledge>=35?'useful':'limited'} knowledge of ${found.player.name}, including a clearer rating estimate, likely potential and transfer cost.`,read:false});}
    });
    w.pendingScouting=w.pendingScouting.filter(x=>!x.complete||x.completedDate===currentDate).slice(-80);return {unlocked,scoutingCompleted:completed};
  }
  function annualUpdate(game,startYear){
    const w=ensure(game,{backfill:false}),endingYear=startYear-1,results=[];
    // Save migration for builds which retained a stale registry copy after a
    // global prospect had already been placed at a foreign club.
    if(Array.isArray(game.globalPlayers))game.globalPlayers=game.globalPlayers.filter(p=>p&&p.status!=='placed-in-foreign-league');
    data.leagues.forEach(def=>{const league=w.leagues[def.id];if(!league)return;repairLeague(game,league,def,startYear);if(endingYear>=Number(activeDate(def).slice(0,4)))results.push(simulateSeason(game,league,def,endingYear));league.name=nameFor(def,startYear);absorbGlobalProspects(game,league,startYear);});
    return results.filter(Boolean);
  }

  function absorbGlobalProspects(game,league,year){
    if(!Array.isArray(game.globalPlayers))return;
    const matching=game.globalPlayers.filter(p=>p.status==='global-prospect'&&p.nationality===league.nationality&&Number(p.age||16)<=30);
    const placedIds=new Set();
    matching.forEach(p=>{const r=seeded(hash(`${game.meta?.seed||1}-${p.id}-${year}-absorb`)),available=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year),club=[...available].sort((a,b)=>b.stature-a.stature)[Math.floor(r()*Math.min(5,available.length))]||available[0];if(!club)return;const originalName=p.name,originalBirthYear=Number(p.birthYear)||Number(p.generatedYear||year)-Number(p.age||16),built=makePlayer(game,league,club,year,club.players.length,r,{...p,id:p.id,name:originalName,nationality:p.nationality,position:p.position,age:p.age,ability:p.ability,ceiling:p.ceiling,potential:p.potential,legendArchetype:p.legendArchetype,archetypeLabel:p.archetypeLabel,traits:p.traits,personalityLabel:p.personalityLabel||'Generational Talent',developmentCurve:'early'});built.name=originalName;built.birthYear=originalBirthYear;club.players.push(built);placedIds.add(p.id);game.news.unshift({date:`${year}-07-01`,headline:`${club.name} unveil ${built.name}, an era-defining ${built.nationality.toLowerCase()} talent`});});
    // The foreign-club player is now the canonical object. Keeping the old
    // prospect in globalPlayers produced a second, frozen copy which could be
    // renamed/re-aged decades later and conflict with the genuine retiree.
    if(placedIds.size)game.globalPlayers=game.globalPlayers.filter(p=>!placedIds.has(p.id));
  }
  function placeLegend(game,player,archetype,startYear,rngFn){
    const id=nationalityLeague[player.nationality],w=ensure(game,{backfill:false}),league=id?w.leagues[id]:null;if(!league)return false;
    activateFoundedClubs(game,league,startYear);const r=typeof rngFn==='function'?rngFn:seeded(hash(`${game.meta?.seed||1}-${player.id}-legend`)),available=league.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=startYear),club=[...available].sort((a,b)=>b.stature-a.stature)[Math.floor(r()*Math.min(5,available.length))]||available[0];if(!club)return false;
    const built=makePlayer(game,league,club,startYear,club.players.length,r,{...player,id:player.id,name:player.name,nationality:player.nationality,position:player.position,age:player.age,ability:player.ability,ceiling:player.ceiling,potential:player.potential,legendArchetype:player.legendArchetype,archetypeLabel:player.archetypeLabel,traits:player.traits,personalityLabel:'Generational Talent',developmentCurve:'early'});club.players.push(built);Object.assign(player,built,{status:'active',clubName:club.name});return true;
  }

  function leagues(game){const w=ensure(game);return w.unlockedLeagueIds.map(id=>w.leagues[id]).filter(Boolean).sort((a,b)=>a.startDate.localeCompare(b.startDate));}
  function league(game,id){return ensure(game).leagues[id]||null;}
  function clubs(game){const year=isoYear(game.date);return leagues(game).flatMap(l=>l.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year));}
  function club(game,id){const year=isoYear(game.date);for(const l of leagues(game)){const c=l.clubs.find(x=>x.id===id&&x.worldActivatedYear!=null&&Number(x.founded||0)<=year);if(c)return c;}return null;}
  function players(game){return clubs(game).flatMap(c=>c.players.map(p=>({p,c,league:league(game,c.worldLeagueId)})));}
  function player(game,id){for(const row of players(game))if(row.p.id===id)return {player:row.p,club:row.c,league:row.league};const global=(game.globalPlayers||[]).find(p=>p.id===id);return global?{player:global,club:null,league:null}:null;}
  function retiredPlayers(game){return ensure(game).retiredPlayers;}
  function leagueAllTimePlayers(game,leagueId){
    const l=league(game,leagueId);if(!l)return[];const year=isoYear(game.date),active=l.clubs.filter(c=>c.worldActivatedYear!=null&&Number(c.founded||0)<=year).flatMap(c=>c.players.map(p=>({p,c,retired:false}))),retired=ensure(game).retiredPlayers.filter(p=>p.leagueId===leagueId).map(p=>({p,c:l.clubs.find(c=>c.id===p.lastClubId)||null,retired:true}));
    return [...active,...retired].sort((a,b)=>(b.p.careerTotals?.goals||0)-(a.p.careerTotals?.goals||0));
  }

  function recruitmentLevel(game){const c=(game.clubs||[]).find(x=>x.id===game.controlledClubId);return clamp(Number(c?.facilities?.recruitment||2),1,5);}
  function baseKnowledge(game,l,p){
    const year=isoYear(game.date),facility=recruitmentLevel(game),fame=(p.legendArchetype?14:0)+(p.ability>=84?10:p.ability>=76?5:0);let base=0;
    if(!l)base=15;else if(l.distance==='near')base=year<1914?38:year<1946?55:year<1978?70:year<1995?82:92;
    else if(l.distance==='continental')base=year<1930?8:year<1955?18:year<1978?35:year<1995?55:74;
    else base=year<1978?10:year<1995?29:year<2010?55:70;
    return clamp(base+(facility-2)*6+fame,5,98);
  }
  function knowledge(game,p,c){const l=c?league(game,c.worldLeagueId):null,report=Number(ensure(game).scoutingReports[p.id]?.knowledge||0);return clamp(Math.max(baseKnowledge(game,l,p),report),0,100);}
  function estimate(game,p,c){
    const k=knowledge(game,p,c),seed=hash(`${game.meta?.seed||1}-${p.id}-estimate`),offset=(seed%17)-8;
    const range=k>=85?0:k>=68?2:k>=48?5:k>=28?8:12,centre=clamp(p.ability+Math.round(offset*(100-k)/100),30,99),potCentre=clamp(p.potential+Math.round(((seed>>>5)%15-7)*(100-k)/100),centre,99);
    const fmt=(v,r)=>k<18?'Unknown':r===0?String(v):`${clamp(v-r,25,99)}–${clamp(v+r,25,99)}`;
    return {knowledge:k,ability:fmt(centre,range),potential:fmt(potCentre,Math.max(0,range+1)),abilityMin:clamp(centre-range,25,99),abilityMax:clamp(centre+range,25,99),potentialMin:clamp(potCentre-range-1,25,99),potentialMax:clamp(potCentre+range+1,25,99),label:k>=85?'Extensive':k>=65?'Good':k>=42?'Partial':k>=22?'Sketchy':'Minimal'};
  }
  function scoutingDays(game,l){const year=isoYear(game.date),facility=recruitmentLevel(game);let days=l?.distance==='near'?28:l?.distance==='continental'?year<1955?120:year<1978?80:year<1995?55:35:year<1978?210:year<1995?120:70;days-=facility*5;return Math.max(10,days);}
  function requestScout(game,playerId){
    const found=player(game,playerId);if(!found)return {ok:false,message:'Player not found.'};const w=ensure(game),pending=w.pendingScouting.find(x=>x.playerId===playerId&&!x.complete);if(pending)return {ok:false,message:`A report is already due on ${pending.dueDate}.`,dueDate:pending.dueDate};
    const days=scoutingDays(game,found.league),dueDate=addDays(game.date,days),report={id:`scout-${playerId}-${game.date}`,playerId,leagueId:found.league?.id||null,requestedDate:game.date,dueDate,recruitmentBonus:recruitmentLevel(game)*2,complete:false};w.pendingScouting.push(report);game.inbox.unshift({id:report.id,date:game.date,from:'Chief Scout',subject:`Scouting trip arranged: ${found.player.name}`,body:`A scout has been sent to watch ${found.player.name}${found.club?` at ${found.club.name}`:''}. Travel and information networks in this era mean the report is expected on ${dueDate}.`,read:false});return {ok:true,dueDate,days};
  }
  function transferValue(game,p,c){if(window.FLEconomy)return FLEconomy.playerValue(game,p,c);const power=Math.max(1,p.ability-32),potential=Math.max(0,p.potential-p.ability),ageFactor=p.age<22?1.25:p.age>30?.62:1;return Math.max(8,Math.round((Math.pow(power,1.42)*2.2+potential*16+(c?.stature||50)*2.4)*ageFactor));}
  function quote(game,playerId){const found=player(game,playerId);if(!found)return null;const fee=found.club?transferValue(game,found.player,found.club):0,wage=window.FLEconomy?FLEconomy.recommendedWage(game,found.player,found.club,'First Team'):Math.max(2,Math.round((found.player.ability-30)/5)),est=estimate(game,found.player,found.club);return {...found,fee,wage,knowledge:est.knowledge};}
  function accessFactor(game,l){const year=isoYear(game.date);if(!l)return .35;if(l.distance==='near')return year<1914?.58:year<1950?.74:.94;if(l.distance==='continental')return year<1950?.12:year<1978?.34:year<1995?.62:.9;return year<1978?.06:year<1995?.29:.75;}
  function makeOffer(game,playerId){
    const q=quote(game,playerId);if(!q)return {ok:false,message:'Player not found.'};if(!q.club||!q.club.foreign)return {ok:false,message:'This is not a foreign transfer.'};
    const controlled=(game.clubs||[]).find(c=>c.id===game.controlledClubId);if(!controlled)return {ok:false,message:'No managed club is active.'};
    if(window.FLEconomy)FLEconomy.ensureClubFinances(game,controlled);const balance=Number(game.finances?.balance||0),budget=Number(game.finances?.transferBudget||0);if(balance<q.fee||budget<q.fee)return rejectOffer(game,q,`The board cannot meet the asking price of £${q.fee.toLocaleString('en-GB')} within the available transfer budget.`);
    const r=seeded(hash(`${game.meta?.seed||1}-${game.date}-${playerId}-offer`)),clubPull=Number(controlled.reputation||controlled.stature||50),playerLevel=q.player.ability,knowledgeBonus=q.knowledge>=65?.08:q.knowledge<30?-.08:0;
    const chance=clamp(CONFIG.BASE_FOREIGN_TRANSFER_CHANCE*accessFactor(game,q.league)+(clubPull-playerLevel)*.008+knowledgeBonus+(Number(q.player.personalityProfile?.adaptability||50)-50)*.0015,.04,.93);
    if(r()>chance)return rejectOffer(game,q,`${q.player.name} has declined the move. English football's reach, the club's standing and the travel demands of this era all influenced the decision.`);
    q.club.players=q.club.players.filter(p=>p.id!==q.player.id);q.player.clubHistory=Array.isArray(q.player.clubHistory)?q.player.clubHistory:[];q.player.clubHistory.push({club:q.club.name,from:q.player.generatedYear||'Earlier',to:isoYear(game.date),apps:q.player.careerTotals?.appearances||0,goals:q.player.careerTotals?.goals||0});
    Object.assign(q.player,{clubId:controlled.id,foreignClubId:null,worldLeagueId:null,status:'active',squadStatus:'First Team',contractStart:game.date,contractEnd:`${isoYear(game.date)+3}-06-30`,contractStatus:'Secure',wage:q.wage,condition:95,face:q.player.face||'assets/player-faces/no-face.svg'});controlled.players.push(q.player);game.finances.balance-=q.fee;game.finances.transferBudget=Math.max(0,Number(game.finances.transferBudget||0)-q.fee);
    const row={id:`international-${q.player.id}-${game.date}`,date:game.date,playerId:q.player.id,player:q.player.name,from:q.club.name,to:controlled.name,fromId:q.club.id,toId:controlled.id,fee:q.fee,leagueId:q.league?.id||null,international:true};ensure(game).transferHistory.unshift(row);game.worldUI=game.worldUI||{};game.worldUI.transferHistory=Array.isArray(game.worldUI.transferHistory)?game.worldUI.transferHistory:[];game.worldUI.transferHistory.unshift(row);
    game.news.unshift({date:game.date,headline:`${controlled.name} sign ${q.player.name} from ${q.club.name}`});game.history.push({id:row.id,date:game.date,type:'transfer',category:'international-transfer',title:`${q.player.name} joins ${controlled.name}`,text:`The ${q.player.nationality.toLowerCase()} ${q.player.position} arrives from ${q.club.name} for £${q.fee.toLocaleString('en-GB')}.`});game.inbox.unshift({id:`accepted-${row.id}`,date:game.date,from:'Club Secretary',subject:`Transfer complete: ${q.player.name}`,body:`${q.player.name} has agreed terms and joined from ${q.club.name}. The fee is £${q.fee.toLocaleString('en-GB')} and the player will earn £${q.wage} per week.`,read:false});return {ok:true,message:`${q.player.name} signed for £${q.fee.toLocaleString('en-GB')}.`,fee:q.fee};
  }
  function rejectOffer(game,q,message){game.inbox.unshift({id:`rejected-${q.player.id}-${game.date}-${hash(message)}`,date:game.date,from:q.club?.name||'Player Representative',subject:`Transfer offer rejected: ${q.player.name}`,body:message,read:false});return {ok:false,message};}
  function recentTransfers(game,limit=30){return ensure(game).transferHistory.slice(0,limit);}

  return {CONFIG,ensure,processDate,annualUpdate,leagues,league,clubs,club,players,player,retiredPlayers,leagueAllTimePlayers,knowledge,estimate,requestScout,quote,makeOffer,recentTransfers,placeLegend,data};
})();
