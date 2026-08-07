window.FLPyramid = (() => {
  const data=window.FLPyramidData||{formats:[],clubSeeds:[]};
  const CONFIG={MAX_TIER:15,FULL_DETAIL_MAX_TIER:5,LIGHT_DETAIL_MAX_TIER:8,HYDRATED_SQUAD_SIZE:20,...(data.PYRAMID_TUNING||{})};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const yearOf=value=>Number(String(value||'1888').slice(0,4))||1888;
  function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function seeded(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
  const pick=(arr,r)=>arr[Math.floor(r()*arr.length)];
  const normaliseText=value=>String(value||'').toLowerCase().replace(/&/g,'and').replace(/\s+(parallel|founder|database)$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const normaliseRef=c=>{const raw=window.FLClubDatabase?.seedReference?.(c)||c?.realClub||c?.reference||c?.name||c?.id;const row=window.FLClubDatabase?.englishByReference?.(raw);return normaliseText(row?.reference||raw)};
  const historicalKey=c=>normaliseText(window.FLClubDatabase?.englishByReference?.(c)?.reference||c.realClub||String(c.reference||'').replace(/\s+parallel$/i,'')||c.name||c.id);
  function historicalDivisionId(c,year){
    const structure=data.historicalStructures?.[Number(year)];if(!structure)return null;const key=historicalKey(c);
    for(const [divisionId,references] of Object.entries(structure.divisions||{}))if((references||[]).some(ref=>normaliseText(ref)===key))return divisionId;
    return null;
  }
  function snapshotDivisionId(c,year){
    const snapshot=data.competitionSnapshots?.[Number(year)];if(!snapshot)return null;const key=historicalKey(c);
    for(const [divisionId,references] of Object.entries(snapshot.divisions||{}))if((references||[]).some(ref=>normaliseText(ref)===key))return divisionId;
    return null;
  }
  const footballLeagueDivisionIds=new Set(['premier-league','division-one','division-two','division-three','division-four','division-three-north','division-three-south','championship','league-one','league-two']);
  const isFootballLeagueDivision=d=>Boolean(d&&footballLeagueDivisionIds.has(d.id));
  function eligibleForDivision(c,d,year){
    if(!c||!d||c.nonFootballEntity)return false;year=Number(year)||1888;
    const founded=yearOf(c.founded),ceased=Number(c.ceased||9999);if(founded>year||year>=ceased)return false;
    if(isFootballLeagueDivision(d))return (c.leagueEntry!=null&&Number(c.leagueEntry)<=year)||(c.earnedNationalEntryYear!=null&&Number(c.earnedNationalEntryYear)<=year);
    return Number(c.systemEntry||c.leagueEntry||founded)<=year;
  }
  function entryDivisionFor(c,format,year){
    const snapshotId=snapshotDivisionId(c,year);if(snapshotId)return format.divisions.find(d=>d.id===snapshotId)||null;
    if(c.entryCompetitionId&&Number(c.systemEntry)===Number(year)){const d=format.divisions.find(x=>x.id===c.entryCompetitionId);if(d)return d}
    if(c.leagueEntry!=null&&Number(c.leagueEntry)===Number(year)){
      const national=format.divisions.filter(isFootballLeagueDivision);if(!national.length)return null;
      const lowest=Math.max(...national.map(d=>Number(d.tier)||1)),choices=national.filter(d=>Number(d.tier)===lowest);
      if(choices.length===1)return choices[0];
      return choices.find(d=>d.region&&(c.region||founderRegion(c))===d.region)||choices[0];
    }
    return null;
  }
  const enrichSeed=c=>window.FLClubDatabase?.applyEnglishSeed?FLClubDatabase.applyEnglishSeed(c):{...c};
  function formatForYear(year){return data.formatForYearDeep?data.formatForYearDeep(Number(year)||1888):(data.formats.find(f=>year>=f.from&&year<=f.to)||data.formats[data.formats.length-1])}
  function geography(location=''){
    const x=String(location);
    if(/Lancashire|Manchester|Liverpool|Cheshire|Cumbria|Cumberland|Bolton|Blackburn|Burnley|Preston|Wigan|Warrington/i.test(x))return {region:'north',subregion:'north-west'};
    if(/Northumberland|Durham|Sunderland|Newcastle|Gateshead|Hartlepool|Tyneside/i.test(x))return {region:'north',subregion:'north-east'};
    if(/Yorkshire|Leeds|Sheffield|Hull|York|Bradford|Huddersfield|Wakefield/i.test(x))return {region:'north',subregion:'yorkshire'};
    if(/Derby|Nottingham|Leicester|Lincoln|Northampton|Rutland|Chesterfield|Mansfield/i.test(x))return {region:'north',subregion:'east-midlands'};
    if(/Warwick|Worcester|Stafford|Shropshire|Birmingham|Wolverhampton|Coventry|Hereford/i.test(x))return {region:'south',subregion:'west-midlands'};
    if(/Norfolk|Suffolk|Cambridge|Essex|Hertford|Bedford/i.test(x))return {region:'south',subregion:'east'};
    if(/London|Middlesex|Woolwich|Fulham|Tottenham|Barking|Croydon|Dagenham|Harrow/i.test(x))return {region:'south',subregion:'london'};
    if(/Kent|Sussex|Brighton|Dover|Maidstone|Hastings|Guildford|Surrey/i.test(x))return {region:'south',subregion:'south-east'};
    if(/Buckingham|Berkshire|Oxford|Watford|Luton|Aylesbury|Windsor|Slough/i.test(x))return {region:'south',subregion:'home-counties'};
    if(/Hampshire|Wiltshire|Dorset|Southampton|Portsmouth|Bournemouth|Salisbury/i.test(x))return {region:'south',subregion:'south-central'};
    if(/Devon|Cornwall|Somerset|Bristol|Gloucester|Plymouth|Exeter|Bath|Yeovil/i.test(x))return {region:'south',subregion:'south-west'};
    if(/Wales|Monmouth|Wrexham|Welshpool|Newport|Oswestry/i.test(x))return {region:'south',subregion:'wales-border'};
    return {region:/north/i.test(x)?'north':'south',subregion:/north/i.test(x)?'north-west':'south-central'};
  }
  function founderRegion(club){return geography(club.location).region}
  function seedList(){
    const mergedByKey=new Map();
    const founders=(window.FLData?.clubs||[]).map(c=>{const geo=geography(c.location);return enrichSeed({...c,leagueEntry:1888,systemEntry:1888,entryCompetitionId:'division-one',startSelectable:true,founded:c.founded||'1880-01-01',region:c.region||geo.region,subregion:c.subregion||geo.subregion,countyRegion:c.countyRegion||c.subregion||geo.subregion,initialTier:1,reference:`${c.realClub||c.name} founder`,membershipPeriods:c.membershipPeriods||[[1888,null]],lightweight:false})});
    const sources=[...founders,...(window.FLTimelineData?.clubSeeds||[]),...(data.clubSeeds||[]),...(data.databaseClubSeeds||[]),...(data.generatedClubSeeds||[])];
    for(const raw of sources){
      const incoming=enrichSeed(raw),key=normaliseRef(incoming);if(!key)continue;const existing=mergedByKey.get(key);
      if(!existing){mergedByKey.set(key,{...incoming});continue}
      const combined={...incoming,...existing};
      for(const k of ['realClub','modernLeague','modernTier','modernDivisionId','modernStrength','modernPrestige','databaseStatus','databaseClub'])if(incoming[k]!=null)combined[k]=incoming[k];
      for(const k of ['leagueEntry','systemEntry','entryCompetitionId','startSelectable','membershipPeriods','initialTier','ceased','historicalOnly','historicalRegional','fifthTierFounder'])if(existing[k]!=null)combined[k]=existing[k];else if(incoming[k]!=null)combined[k]=incoming[k];
      combined.generatedClub=Boolean(existing.generatedClub&&incoming.generatedClub);combined.lightweight=Boolean(existing.lightweight||incoming.lightweight);
      mergedByKey.set(key,combined);
    }
    const merged=[];
    for(const c0 of mergedByKey.values()){
      const c=enrichSeed(c0),leagueEntry=c.leagueEntry!==null&&c.leagueEntry!==''&&Number.isFinite(Number(c.leagueEntry))?Number(c.leagueEntry):null,foundedYear=yearOf(c.founded)||1888,regional=data.regionalEntryFor?.(c)||null;
      const storedEntry=c.systemEntry!==null&&c.systemEntry!==''&&Number.isFinite(Number(c.systemEntry))?Number(c.systemEntry):(leagueEntry??Math.max(foundedYear,1979)),systemEntry=regional?Math.min(storedEntry,Number(regional.year)):storedEntry,geo=geography(c.location),entryCompetitionId=regional?.divisionId||c.entryCompetitionId||null;
      const defaultTier=regional?.tier??(entryCompetitionId?(Number(c.initialTier)||6):(leagueEntry?(data.footballLeagueEntryTier?.(leagueEntry)||4):6)),initialTier=regional&&Number(regional.year)<=storedEntry?Number(regional.tier):Number(c.initialTier)||defaultTier;
      merged.push({...c,leagueEntry,systemEntry,entryCompetitionId,startSelectable:(c.startSelectable!==false||Boolean(regional)||Boolean(leagueEntry))&&!c.generatedClub,region:c.region||geo.region,subregion:c.subregion||geo.subregion,countyRegion:c.countyRegion||c.subregion||geo.subregion,initialTier,lightweight:Boolean(c.lightweight||c.generatedClub)});
    }
    return merged.sort((a,b)=>yearOf(a.founded)-yearOf(b.founded)||a.systemEntry-b.systemEntry||a.name.localeCompare(b.name));
  }
  function makePlayer(team,r,index,year){
    const positions=window.FLData?.positions||['GK','FB','FB','HB','HB','HB','IF','IF','CF','W','W','GK','FB','FB','HB','HB','IF','CF','W','W'];
    const first=window.FLData?.firstNames||['Arthur','George','Harry','James','Thomas','William'];
    const last=window.FLData?.lastNames||['Brown','Clarke','Jones','Smith','Taylor','Wright'];
    const position=positions[index%positions.length],age=16+Math.floor(r()*20),clubPower=Number(team.powerRating||team.clubRating||38+(Number(team.strength||2)*7));
    const balanced=window.FLFootballBalance?FLFootballBalance.generatedPlayerProfile(team,r,age):null;
    let ability=balanced?.ability??clamp(Math.round(clubPower-8+r()*18),28,82),ceiling=balanced?.ceiling??clamp(ability+7+Math.floor(r()*16),ability,94);
    if(!balanced&&age<=19&&r()<.006){ability=clamp(62+Math.floor(r()*10),ability,78);ceiling=88+Math.floor(r()*7)}
    return {id:`${team.id}-p${year}-${index+1}-${Math.floor(r()*99999)}`,name:`${pick(first,r)} ${pick(last,r)}`,clubId:team.id,position,age,nationality:'English',condition:88+Math.floor(r()*13),form:'—',ability,potential:balanced?.potential??Math.round(ability+(ceiling-ability)*.72),ceiling,developmentCurve:pick(['early','steady','steady','steady','late','volatile'],r),developmentMomentum:0,personalityProfile:{professionalism:35+Math.floor(r()*65),ambition:30+Math.floor(r()*70),loyalty:25+Math.floor(r()*75),leadership:20+Math.floor(r()*80),bigMatches:25+Math.floor(r()*75),consistency:35+Math.floor(r()*65),injuryProneness:8+Math.floor(r()*78),temperament:20+Math.floor(r()*80),teamwork:35+Math.floor(r()*65),determination:30+Math.floor(r()*70),adaptability:25+Math.floor(r()*75)},personalityLabel:pick(['Professional','Driven','Determined','Balanced','Loyal','Ambitious'],r),wage:1+Math.floor(Math.max(1,ability/20)*r()),appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,yellowCards:0,redCards:0,cleanSheets:0,conceded:0,playerOfMatch:0,averageRating:'—',honours:[],seasonHistory:[],matchHistory:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},status:'active'};
  }
  function hydrateClub(game,team,year=yearOf(game.date),reason='detail'){
    team.players=Array.isArray(team.players)?team.players:[];if(team.players.length>=11){team.lightweightState='hydrated';if(window.FLFootballBalance)FLFootballBalance.calibrateClub(game,team,{force:false});return team}
    const r=seeded(hash(`${game.meta?.seed||1}-${team.id}-${year}-${reason}-hydrate`)),target=CONFIG.HYDRATED_SQUAD_SIZE||20,elapsed=Math.max(0,year-Number(team.aggregateYear||year));
    const restored=(team.lightweightNotables||[]).map(p=>({...p,age:Number(p.age||20)+elapsed,clubId:team.id,status:'active',seasonHistory:Array.isArray(p.seasonHistory)?p.seasonHistory:[],matchHistory:[],honours:Array.isArray(p.honours)?p.honours:[],careerTotals:p.careerTotals||{appearances:0,goals:0,assists:0,cleanSheets:0}})).filter(p=>p.age<=38).slice(0,4);
    team.players.push(...restored.filter(p=>!team.players.some(x=>x.id===p.id)));team.lightweightNotables=[];
    while(team.players.length<target)team.players.push(makePlayer(team,r,team.players.length,year));
    team.lightweightState='hydrated';team.hydratedYear=year;if(window.FLFootballBalance)FLFootballBalance.calibrateClub(game,team,{force:true});return team;
  }
  function dehydrateClub(game,team,year=yearOf(game.date)){
    const players=Array.isArray(team.players)?team.players:[];if(!players.length){team.lightweightState='aggregate';team.aggregateYear=year;return team}
    const active=players.filter(p=>p.status!=='deceased'&&p.status!=='retired'),averageAge=active.length?active.reduce((n,p)=>n+Number(p.age||22),0)/active.length:23,quality=active.length?active.reduce((n,p)=>n+Number(p.ability||45),0)/active.length:Number(team.powerRating||team.clubRating||42);
    const notable=[...active].sort((a,b)=>(Boolean(b.legendArchetype)-Boolean(a.legendArchetype))||((b.honours||[]).length-(a.honours||[]).length)||Number(b.ability||0)-Number(a.ability||0)).filter((p,i)=>p.legendArchetype||(p.honours||[]).length||Number(p.careerTotals?.appearances||0)>=180||i<2).slice(0,4).map(p=>({id:p.id,name:p.name,nationality:p.nationality||'English',position:p.position,age:Number(p.age)||22,ability:Number(p.ability)||45,potential:Number(p.potential)||Number(p.ability)||45,ceiling:Number(p.ceiling)||Number(p.potential)||50,legendArchetype:p.legendArchetype||null,archetypeLabel:p.archetypeLabel||null,personalityLabel:p.personalityLabel||'Balanced',careerTotals:{...(p.careerTotals||{})},honours:(p.honours||[]).slice(-8),seasonHistory:(p.seasonHistory||[]).slice(-50)}));
    team.aggregateSquad={averageAge:+averageAge.toFixed(1),quality:+quality.toFixed(1),prospects:active.filter(p=>Number(p.age||99)<=20&&Number(p.potential||0)>=65).length,updatedYear:year};team.lightweightNotables=notable;team.players=[];team.lightweightState='aggregate';team.aggregateYear=year;return team;
  }
  function createClub(game,seed,year){
    const r=seeded(hash(`${game.meta?.seed||1}-${seed.id}-${year}`)),rating=clamp(29+(Number(seed.strength||2)*7)+Math.floor(r()*8),28,76);
    const team={...seed,finance:Number(seed.finance)||Math.round(90+rating*7),expectation:seed.expectation||'Build a stable place in the English pyramid.',rival:seed.rival||null,players:[],played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0,formRating:50,honours:[],seasonHistory:[],managerHistory:[],leagueActive:false,divisionId:null,tier:null,clubRating:rating,powerRating:rating,reputation:clamp(rating,18,85),financialPower:clamp(25+Number(seed.strength||2)*8+Math.floor(r()*10),20,85),admittedYear:Number(seed.systemEntry||seed.leagueEntry)||year,lightweight:Boolean(seed.lightweight),lightweightState:seed.lightweight?'aggregate':'hydrated'};
    if(!team.lightweight)hydrateClub(game,team,year,'creation');
    if(window.FLClubTrajectory)FLClubTrajectory.ensureClub(team,game,year);return team;
  }
  function ensureClubObjects(game,year){
    const seeds=seedList();game.clubs=Array.isArray(game.clubs)?game.clubs:[];const byId=new Map(game.clubs.map(c=>[c.id,c]));
    for(const s of seeds){
      if((s.generatedClub?Number(s.systemEntry)>year:yearOf(s.founded)>year)||Number(s.ceased||9999)<=year)continue;
      if(!byId.has(s.id)){const c=createClub(game,s,year);game.clubs.push(c);byId.set(c.id,c)}
      else{const c=byId.get(s.id);['leagueEntry','systemEntry','entryCompetitionId','startSelectable','founded','ceased','region','subregion','countyRegion','reference','membershipPeriods','fifthTierFounder','historicalOnly','historicalRegional','initialTier','lightweight','generatedClub','databaseClub'].forEach(k=>{if(c[k]==null&&s[k]!=null)c[k]=s[k]});['name','initials','realClub','modernLeague','modernTier','modernDivisionId','modernStrength','modernPrestige','databaseStatus'].forEach(k=>{if(s[k]!=null)c[k]=s[k]});c.players=Array.isArray(c.players)?c.players:[];c.powerRating=Number(c.powerRating||c.clubRating||34+Number(c.strength||2)*7);c.clubRating=Number(c.clubRating||c.powerRating);c.reputation=Number(c.reputation||c.powerRating);c.financialPower=Number(c.financialPower||40+Number(c.strength||2)*8);c.honours=Array.isArray(c.honours)?c.honours:[];c.seasonHistory=Array.isArray(c.seasonHistory)?c.seasonHistory:[];c.managerHistory=Array.isArray(c.managerHistory)?c.managerHistory:[]}
    }return seeds;
  }
  function ensure(game,year=yearOf(game.date)){
    game.meta=game.meta||{};if(!Number.isFinite(Number(game.meta.startYear)))game.meta.startYear=1888;if(!Number.isFinite(Number(game.meta.worldSeed)))game.meta.worldSeed=Number(game.meta.seed)||1;
    const p=game.pyramid=game.pyramid||{};p.version='0.24.4';p.maxTier=CONFIG.MAX_TIER;p.membership=p.membership||{};p.nonLeague=Array.isArray(p.nonLeague)?p.nonLeague:[];p.movementHistory=Array.isArray(p.movementHistory)?p.movementHistory:[];p.divisionHistory=Array.isArray(p.divisionHistory)?p.divisionHistory:[];p.admissionLog=Array.isArray(p.admissionLog)?p.admissionLog:[];p.processedAdmissions=Array.isArray(p.processedAdmissions)?p.processedAdmissions:[];p.nextTierAssignments=p.nextTierAssignments||{};p.nextDivisionAssignments=p.nextDivisionAssignments||{};
    if(!Number.isFinite(Number(p.clubObjectsThroughYear))||Number(p.clubObjectsThroughYear)<year){ensureClubObjects(game,year);p.clubObjectsThroughYear=year}
    if(window.FLClubTrajectory&&Number(p.trajectoryEnsuredYear)!==Number(year)){FLClubTrajectory.ensure(game,year);p.trajectoryEnsuredYear=year}if(!p.seasonYear)prepareSeason(game,year);return p;
  }
  function divisionList(game,year=yearOf(game.date)){return (game.pyramid?.format?.divisions||formatForYear(year)?.divisions||[]).map(d=>({...d}))}
  function activeClubs(game){return (game.clubs||[]).filter(c=>c.leagueActive&&c.divisionId)}
  function clubsInDivision(game,id){return activeClubs(game).filter(c=>c.divisionId===id)}
  function table(game,id){const selected=id||divisionForClub(game,game.controlledClubId)?.id||divisionList(game)[0]?.id;return clubsInDivision(game,selected).sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||(b.powerRating||0)-(a.powerRating||0)||a.name.localeCompare(b.name))}
  function allTables(game){return divisionList(game).map(d=>({division:{...d},table:table(game,d.id)}))}
  function divisionForClub(game,id){const c=(game.clubs||[]).find(x=>x.id===id);return divisionList(game).find(d=>d.id===c?.divisionId)||null}
  function competitionForClub(game,id){const d=divisionForClub(game,id);return d?{id:d.id,name:d.name,tier:d.tier,official:!game.pyramid?.format?.wartime}:{id:'county-football',name:'County Football',tier:10,official:false}}
  function scoreClub(c,year){const recent=(c.seasonHistory||[]).slice(-4);let score=(window.FLClubTrajectory?FLClubTrajectory.effectivePower(c):Number(c.powerRating||c.clubRating||40))+(Number(c.stature||c.reputation||45)-45)*.12+(Number(c.financialPower||45)-45)*.12;recent.forEach((s,i)=>{const pos=Number(s.position)||20;score+=(24-pos)*(i+1)*.06});return score+((hash(`${c.id}-${year}-selection`)%1000)/1000-.5)*5}
  function resetClubStats(c){c.played=0;c.won=0;c.drawn=0;c.lost=0;c.gf=0;c.ga=0;c.points=0;c.formRating=50}
  function assignDivision(c,d){c.leagueActive=true;c.divisionId=d.id;c.tier=d.tier;c.leagueStatus=d.tier<=5?'national-member':'regional-member'}
  function deactivate(c){c.leagueActive=false;c.divisionId=null;c.tier=CONFIG.MAX_TIER;c.leagueStatus='outside-pyramid'}
  function mappedTier(c,p){if(p.nextTierAssignments&&Number.isFinite(Number(p.nextTierAssignments[c.id])))return clamp(Number(p.nextTierAssignments[c.id]),1,CONFIG.MAX_TIER);return clamp(Number(c.tier||c.initialTier)||6,1,CONFIG.MAX_TIER)}
  const regionAdjacency={
    'north-west':['north-east','yorkshire'],'north-east':['north-west','yorkshire'],'yorkshire':['north-west','north-east','east-midlands'],'east-midlands':['yorkshire','west-midlands','east'],
    'west-midlands':['east-midlands','wales-border','south-central','home-counties'],'east':['east-midlands','home-counties','london'],'london':['east','home-counties','south-east'],
    'south-east':['london','home-counties','south-central'],'home-counties':['east','london','south-east','south-central','west-midlands'],'south-central':['home-counties','south-east','south-west','west-midlands','wales-border'],
    'south-west':['south-central','wales-border'],'wales-border':['west-midlands','south-central','south-west']
  };
  function regionFit(c,d){const sub=c.subregion||c.countyRegion||geography(c.location).subregion,regions=Array.isArray(d.regions)?d.regions:[];if(d.regionKey===sub)return 7;if(regions.includes(sub))return 6;const neighbours=new Set(regionAdjacency[sub]||[]);if(neighbours.has(d.regionKey)||regions.some(x=>neighbours.has(x)))return 3;if((d.regional||Number(d.tier)>=6)&&d.region&&(c.region||founderRegion(c))===d.region)return 5;return 0}
  function placeByTier(clubs,format,year,p){
    const buckets={},capacity={},unassigned=new Map(clubs.map(c=>[c.id,c])),scoreCache=new Map();
    format.divisions.forEach(d=>{buckets[d.id]=[];capacity[d.id]=Number(d.size)||24});
    const clubScore=c=>{if(!scoreCache.has(c.id))scoreCache.set(c.id,scoreClub(c,year));return scoreCache.get(c.id)};
    const rankFor=(d,c)=>{if(!eligibleForDivision(c,d,year))return -1000000;const desired=mappedTier(c,p),fit=regionFit(c,d),regional=Boolean(d.regional)||Number(d.tier)>=6,compatible=!regional||fit>0,requested=p.nextDivisionAssignments?.[c.id],same=c.divisionId===d.id&&compatible?1:0,balance=(capacity[d.id]-buckets[d.id].length)/Math.max(1,capacity[d.id]);return (requested===d.id?500:requested&&Number(d.tier)===desired?-220:0)+(compatible?0:-520)+(fit>=6?80:fit>=3?25:fit>0?-25:0)+same*55-Math.abs(desired-Number(d.tier))*22+clubScore(c)*.08+balance*5};
    const assign=(c,d,structuralFill=false)=>{const desired=mappedTier(c,p),targetTier=Number(d?.tier);if(!c||!d||!eligibleForDivision(c,d,year)||!unassigned.has(c.id)||buckets[d.id].length>=capacity[d.id]||(!structuralFill&&Math.abs(desired-targetTier)>1))return false;buckets[d.id].push(c);unassigned.delete(c.id);return true};
    const bestForDivision=(d,exactTier=false)=>{let best=null,bestScore=-Infinity;for(const c of unassigned.values()){if(!eligibleForDivision(c,d,year))continue;if(exactTier&&mappedTier(c,p)!==Number(d.tier))continue;const score=rankFor(d,c);if(score>bestScore){best=c;bestScore=score}}return best};
    const bestDivision=(c,choices)=>{let pool=choices.filter(d=>buckets[d.id].length<capacity[d.id]&&eligibleForDivision(c,d,year));const regional=pool.filter(d=>!d.regional&&Number(d.tier)<6||regionFit(c,d)>0);if(regional.length)pool=regional;let best=null,bestScore=-Infinity;for(const d of pool){const score=rankFor(d,c);if(score>bestScore){best=d;bestScore=score}}return best};
    // The controlled/preselected club and newly founded entrants are placed
    // first, before the regional capacities are filled by the wider pool.
    for(const id of p.mandatoryClubIds||[]){const c=unassigned.get(id);if(!c)continue;const desired=mappedTier(c,p),sameTier=format.divisions.filter(d=>Number(d.tier)===desired),requestedId=p.nextDivisionAssignments?.[c.id],requested=requestedId?format.divisions.find(d=>d.id===requestedId&&Number(d.tier)===desired&&buckets[d.id].length<capacity[d.id]):null,d=requested||bestDivision(c,sameTier)||bestDivision(c,format.divisions);if(d)assign(c,d,true)}
    // Seed every division from its own tier and region first. This prevents a
    // southern club being borrowed merely to fill a northern regional league.
    for(const d of format.divisions){const minimum=Number(d.tier)===1?Math.min(capacity[d.id],12):Number(d.tier)<=5?Math.min(capacity[d.id],8):Math.min(capacity[d.id],4);while(buckets[d.id].length<minimum){let c=null,best=-Infinity;for(const candidate of unassigned.values()){if(!eligibleForDivision(candidate,d,year)||mappedTier(candidate,p)!==Number(d.tier))continue;const fit=regionFit(candidate,d);if((d.regional||Number(d.tier)>=6)&&fit<=0)continue;const score=rankFor(d,candidate);if(score>best){c=candidate;best=score}}if(!c&&!d.regional&&Number(d.tier)<6){c=bestForDivision(d,true)}if(!c||!assign(c,d))break}}
    // Preserve intended levels, placing each club in the closest regional branch.
    for(let tier=1;tier<=CONFIG.MAX_TIER;tier++){
      const divisions=format.divisions.filter(d=>Number(d.tier)===tier),candidates=[...unassigned.values()].filter(c=>mappedTier(c,p)===tier&&divisions.some(d=>eligibleForDivision(c,d,year))).sort((a,b)=>clubScore(b)-clubScore(a)||a.name.localeCompare(b.name));
      for(const c of candidates){const compatible=divisions.filter(d=>(!d.regional&&Number(d.tier)<6)||regionFit(c,d)>0),d=bestDivision(c,compatible);if(d)assign(c,d)}
    }
    // Fill remaining vacancies division-first, so a southern overflow club
    // cannot take a northern place before an available northern club is checked.
    const fillVacancies=predicate=>{for(const d of format.divisions){while(buckets[d.id].length<capacity[d.id]){let best=null,bestScore=-Infinity;for(const c of unassigned.values()){if(!eligibleForDivision(c,d,year)||!predicate(c,d))continue;const score=rankFor(d,c);if(score>bestScore){best=c;bestScore=score}}if(!best||!assign(best,d))break}}};
    fillVacancies((c,d)=>(!d.regional&&Number(d.tier)<6)||regionFit(c,d)>0);
    fillVacancies((c,d)=>(!d.regional&&Number(d.tier)<6)||Boolean(d.region&&(c.region||founderRegion(c))===d.region));
    fillVacancies((c,d)=>Math.abs(mappedTier(c,p)-Number(d.tier))<=1);
    // Structural expansion and renamed divisions must never leave large holes.
    // Movement winners are already protected above; this final pass only draws
    // otherwise unassigned, eligible clubs into remaining places. It prevents
    // a division slowly emptying when a feeder league begins with too few clubs.
    for(const d of format.divisions){
      while(buckets[d.id].length<capacity[d.id]){
        let best=null,bestScore=-Infinity;
        for(const c of unassigned.values()){
          if(!eligibleForDivision(c,d,year))continue;
          const fit=regionFit(c,d);
          if((d.regional||Number(d.tier)>=6)&&fit<=0)continue;
          const score=rankFor(d,c)-Math.abs(mappedTier(c,p)-Number(d.tier))*40;
          if(score>bestScore){best=c;bestScore=score}
        }
        if(!best||!assign(best,d,true))break;
      }
    }
    return buckets;
  }
  function detailedDivision(game,d){if(game.meta?.headless){const watched=(game.clubs||[]).find(c=>c.id===game.meta?.preselectedClubId);return Number(d.tier)<=Number(CONFIG.HEADLESS_FULL_DETAIL_MAX_TIER||1)||Boolean(watched?.divisionId&&d.id===watched.divisionId)}return Number(d.tier)<=CONFIG.FULL_DETAIL_MAX_TIER||d.id===divisionForClub(game,game.controlledClubId)?.id}
  function simulateLightweightSeason(game,year){
    const pointsWin=Number(game.worldState?.rules?.pointsForWin)||2;
    divisionList(game,year).filter(d=>!detailedDivision(game,d)).forEach(d=>{
      const rows=clubsInDivision(game,d.id),played=Math.max(0,(rows.length-1)*2);if(!rows.length)return;
      const ranked=[...rows].sort((a,b)=>scoreClub(b,year)-scoreClub(a,year));ranked.forEach((c,index)=>{
        const r=seeded(hash(`${game.meta?.seed||1}-${year}-${d.id}-${c.id}-aggregate`)),strength=rows.length===1?.5:1-index/(rows.length-1),winRate=clamp(.18+strength*.46+(r()-.5)*.09,.08,.72),drawRate=clamp(.18+(r()-.5)*.08,.1,.32);let won=Math.round(played*winRate),drawn=Math.round(played*drawRate);if(won+drawn>played)drawn=played-won;const lost=played-won-drawn,gf=Math.max(0,Math.round(won*1.9+drawn*.9+lost*.42+r()*8)),ga=Math.max(0,Math.round(lost*1.75+drawn*.85+won*.48+r()*8));Object.assign(c,{played,won,drawn,lost,gf,ga,points:won*pointsWin+drawn,formRating:clamp(38+strength*28+(r()-.5)*12,20,82)});
        c.aggregateSeason={year,divisionId:d.id,played,won,drawn,lost,gf,ga,points:c.points};
      });
    });
  }
  function admissionMessage(game,c,year){
    if(c.generatedClub)return;const id=`admission-${c.id}-${year}`;if(game.pyramid.processedAdmissions.includes(id))return;game.pyramid.processedAdmissions.push(id);
    const national=Number(c.leagueEntry)===Number(year),division=divisionForClub(game,c.id),title=national?`${c.name} admitted to the Football League`:`${c.name} enter organised league football`,summary=national?`${c.name} are elected or admitted to the Football League for the ${year}-${String(year+1).slice(2)} season.`:`${c.name} join ${division?.name||'an organised regional league'} for the ${year}-${String(year+1).slice(2)} season.`;
    const row={id,date:`${year}-07-01`,clubId:c.id,club:c.name,year,title,summary};game.pyramid.admissionLog.unshift(row);game.news=Array.isArray(game.news)?game.news:[];game.news.unshift({date:row.date,headline:row.title,body:row.summary,category:'competition'});game.history=Array.isArray(game.history)?game.history:[];game.history.push({date:row.date,type:'club-admission',title:row.title,text:row.summary});
  }
  function prepareSeason(game,year){
    year=Number(year)||1888;const p=game.pyramid=game.pyramid||{};p.nextTierAssignments=p.nextTierAssignments||{};p.nextDivisionAssignments=p.nextDivisionAssignments||{};ensureClubObjects(game,year);const previousFormat=p.format?JSON.parse(JSON.stringify(p.format)):null,format=formatForYear(year),enteringWar=Boolean(format?.wartime&&!previousFormat?.wartime),leavingWar=Boolean(!format?.wartime&&previousFormat?.wartime);if(window.FLClubTrajectory&&Number(p.trajectoryEnsuredYear)!==year){FLClubTrajectory.ensure(game,year);p.trajectoryEnsuredYear=year}if(!format)return p;
    if(enteringWar){p.preWarMembership={warStartYear:year,assignments:Object.fromEntries(activeClubs(game).map(c=>[c.id,{divisionId:c.divisionId,tier:Number(c.tier)||1}]))};p.pendingMovementClubIds=[];}
    p.format=JSON.parse(JSON.stringify(format));p.seasonYear=year;p.era=format.era;const historical=data.historicalStructures?.[year]||null,snapshot=data.competitionSnapshots?.[year]||null,hasOfficialMovement=(p.movementHistory||[]).some(row=>row&&row.official!==false&&!row.wartime),useHistoricalMembership=Boolean(game.meta?.headless)&&!hasOfficialMovement&&year===1888;
    const exists=c=>yearOf(c.founded)<=year&&year<Number(c.ceased||9999),entered=c=>Number(c.systemEntry||c.leagueEntry||yearOf(c.founded))<=year;
    let allEligible=(game.clubs||[]).filter(c=>!c.nonFootballEntity&&exists(c)&&entered(c));
    if(format.wartime)allEligible=allEligible.filter(c=>c.leagueEntry!=null&&Number(c.leagueEntry)<=year);
    const eligible=historical&&useHistoricalMembership?allEligible.filter(c=>historicalDivisionId(c,year)):allEligible;
    const currently=(game.clubs||[]).filter(c=>c.leagueActive&&exists(c)&&(!historical||!useHistoricalMembership||historicalDivisionId(c,year)));
    const due=eligible.filter(c=>(Number(c.systemEntry)===year||Number(c.leagueEntry)===year)&&!p.processedAdmissions.includes(`admission-${c.id}-${year}`));
    if(historical&&useHistoricalMembership){for(const c of eligible){const divisionId=historicalDivisionId(c,year),division=format.divisions.find(d=>d.id===divisionId);if(division){p.nextDivisionAssignments[c.id]=divisionId;p.nextTierAssignments[c.id]=Number(division.tier)||1}}}
    if(snapshot&&useHistoricalMembership){for(const c of eligible){const divisionId=snapshotDivisionId(c,year),division=format.divisions.find(d=>d.id===divisionId);if(division){p.nextDivisionAssignments[c.id]=divisionId;p.nextTierAssignments[c.id]=Number(division.tier)||Number(c.initialTier)||6}}}
    if(leavingWar&&p.preWarMembership?.assignments){for(const [clubId,row] of Object.entries(p.preWarMembership.assignments)){const c=(game.clubs||[]).find(x=>x.id===clubId),division=format.divisions.find(d=>d.id===row.divisionId);if(c&&division&&eligibleForDivision(c,division,year)){p.nextDivisionAssignments[clubId]=division.id;p.nextTierAssignments[clubId]=Number(division.tier)||Number(row.tier)||1}}p.preWarMembership.restoredYear=year;p.pendingMovementClubIds=[];}
    for(const c of due){if((p.pendingMovementClubIds||[]).includes(c.id)&&p.nextDivisionAssignments[c.id]&&Number.isFinite(Number(p.nextTierAssignments[c.id])))continue;const division=entryDivisionFor(c,format,year);if(division){p.nextDivisionAssignments[c.id]=division.id;p.nextTierAssignments[c.id]=Number(division.tier)||1}}
    const chosenMap=new Map();currently.forEach(c=>chosenMap.set(c.id,c));eligible.forEach(c=>chosenMap.set(c.id,c));const chosen=[...chosenMap.values()],snapshotIds=Number(p.snapshotYear)===year?(p.snapshotClubIds||[]):[],movementAssignedIds=Object.keys(p.nextDivisionAssignments||{}),latestMovement=[...(p.movementHistory||[])].reverse().find(row=>Number(row?.endingYear)===year-1),movementPriorityIds=[...new Set([...(p.pendingMovementClubIds||[]),...(latestMovement?.promoted||[]).map(x=>x.clubId),...(latestMovement?.relegated||[]).map(x=>x.clubId)])],mandatory=new Set([...movementPriorityIds,game.meta?.unemployed?null:game.controlledClubId,game.meta?.preselectedClubId,...movementAssignedIds,...snapshotIds,...due.map(c=>c.id),...eligible.filter(c=>useHistoricalMembership&&snapshotDivisionId(c,year)).map(c=>c.id)].filter(Boolean));p.mandatoryClubIds=[...mandatory];
    const buckets=placeByTier(chosen,format,year,p),assignedIds=new Set(format.divisions.flatMap(d=>(buckets[d.id]||[]).map(c=>c.id)));format.divisions.forEach(d=>(buckets[d.id]||[]).forEach(c=>assignDivision(c,d)));game.clubs.forEach(c=>{if(!assignedIds.has(c.id))deactivate(c);resetClubStats(c)});
    p.membership={};activeClubs(game).forEach(c=>p.membership[c.id]=c.divisionId);p.nonLeague=eligible.filter(c=>!c.leagueActive).map(c=>c.id);p.uiDivisionId=divisionForClub(game,game.controlledClubId)?.id||format.divisions[0]?.id;
    const detailedIds=new Set(format.divisions.filter(d=>detailedDivision(game,d)).map(d=>d.id));format.divisions.filter(d=>detailedIds.has(d.id)).forEach(d=>clubsInDivision(game,d.id).forEach(c=>hydrateClub(game,c,year,`tier-${d.tier}`)));if(game.meta?.headless)activeClubs(game).filter(c=>!detailedIds.has(c.divisionId)).forEach(c=>dehydrateClub(game,c,year));due.filter(c=>c.leagueActive).forEach(c=>admissionMessage(game,c,year));
    p.divisionHistory.push({seasonYear:year,format:format.era,divisions:format.divisions.map(d=>{const row={id:d.id,name:d.name,tier:d.tier,regionKey:d.regionKey||null,size:clubsInDivision(game,d.id).length};if(!game.meta?.headless)row.clubs=clubsInDivision(game,d.id).map(c=>c.id);return row})});if(p.divisionHistory.length>160)p.divisionHistory=p.divisionHistory.slice(-160);return p;
  }
  function applyDatabaseSnapshot(game,year=yearOf(game.date)){
    if(Number(year)!==2026||!window.FLClubDatabase?.english?.length)return false;
    ensureClubObjects(game,year);const p=game.pyramid=game.pyramid||{};p.nextTierAssignments=p.nextTierAssignments||{};p.nextDivisionAssignments=p.nextDivisionAssignments||{};p.snapshotYear=year;p.snapshotClubIds=[];
    for(const row of FLClubDatabase.english){
      const team=(game.clubs||[]).find(c=>c.realClub===row.reference||FLClubDatabase.englishByReference(c)?.reference===row.reference);if(!team)continue;
      team.name=row.name;team.initials=row.name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,4).toUpperCase();team.realClub=row.reference;team.modernLeague=row.league;team.modernTier=Number(row.tier);team.modernDivisionId=row.divisionId;team.modernStrength=Number(row.currentStrength);team.modernPrestige=Number(row.prestige);
      const rating=clamp(Number(row.currentStrength)||45,25,99),prestige=clamp(Number(row.prestige)||45,18,99);team.strength=clamp(Math.round(rating/20),1,5);team.clubRating=rating;team.powerRating=rating;team.reputation=prestige;team.stature=prestige;team.initialStature=prestige;team.heritageFloor=clamp(prestige*.7,18,78);team.clubCeiling=clamp(Math.max(rating,prestige)+8,45,99);team.financialPower=clamp(28+prestige*.65,25,96);
      p.nextTierAssignments[team.id]=Number(row.tier);p.nextDivisionAssignments[team.id]=row.divisionId;p.snapshotClubIds.push(team.id);
    }
    prepareSeason(game,year);if(window.FLFootballBalance)FLFootballBalance.repairWorld(game,{force:true});p.modernSnapshotApplied=true;p.modernSnapshotClubCount=p.snapshotClubIds.length;return p.snapshotClubIds.length===FLClubDatabase.english.length;
  }
  function movementPlaces(endingYear=yearOf(new Date().toISOString()),upperTier=1){const policy=movementPolicy(Number(endingYear)||1888,Number(upperTier)||1);return Math.max(Number(policy.up)||0,Number(policy.down)||0)}
  function movementPolicy(endingYear,upperTier,format=null){
    const year=Number(endingYear)||1888,tier=Number(upperTier)||1;
    if(format?.wartime||format?.noMovement)return {up:0,down:0,automaticUp:0,method:'none',note:format?.noMovementNote||'Promotion and relegation were suspended.'};
    if(year>=1892&&year<=1897&&tier===1)return {up:3,down:3,automaticUp:0,method:'test-match',variable:true,note:'First and Second Division places were decided by end-of-season test matches.'};
    if(year===1957&&tier===2)return {up:2,down:2,automaticUp:2,method:'regional-reorganisation',regionalChampions:true,note:'The regional Third Divisions were reorganised into national Third and Fourth Divisions.'};
    if(year===1994){
      if(tier===1||tier===2)return {up:2,down:4,automaticUp:1,method:'play-off',note:'The 1994-95 restructuring reduced promotion places and increased relegation places.'};
      if(tier===3)return {up:2,down:5,automaticUp:1,method:'play-off',note:'The 1994-95 restructuring reduced promotion places and increased relegation places.'};
      if(tier===4)return {up:3,down:0,automaticUp:2,method:'play-off',note:'Three clubs rose from the fourth tier while no non-league club was admitted.'};
    }
    if(tier===1){
      if(year<=1891)return {up:0,down:0,automaticUp:0,method:'election'};
      if(year<=1972)return {up:2,down:2,automaticUp:2,method:'automatic'};
      if(year<=1985)return {up:3,down:3,automaticUp:3,method:'automatic'};
      return {up:3,down:3,automaticUp:2,method:'play-off'};
    }
    if(tier===2){
      if(year<1920)return {up:0,down:0,automaticUp:0,method:'none'};
      if(year===1920)return {up:1,down:1,automaticUp:1,method:'automatic'};
      if(year<=1957)return {up:2,down:2,automaticUp:2,method:'regional-champions',regionalChampions:true};
      if(year<=1972)return {up:2,down:2,automaticUp:2,method:'automatic'};
      if(year<=1985)return {up:3,down:3,automaticUp:3,method:'automatic'};
      return {up:3,down:3,automaticUp:2,method:'play-off'};
    }
    if(tier===3){
      if(year<1958)return {up:0,down:0,automaticUp:0,method:'none'};
      if(year<=1985)return {up:4,down:4,automaticUp:4,method:'automatic'};
      return {up:4,down:4,automaticUp:3,method:'play-off'};
    }
    if(tier===4){
      if(year<1986)return {up:0,down:0,automaticUp:0,method:'re-election',note:'The bottom Football League clubs applied for re-election; there was no automatic exchange with non-league football.'};
      if(year<=2001)return {up:1,down:1,automaticUp:1,method:'automatic'};
      return {up:2,down:2,automaticUp:1,method:'play-off'};
    }
    // Below the national divisions, movement follows the feeder structure: division champions rise,
    // with an equal number dropping from the level above. This prevents the artificial three-club
    // churn that previously made regional histories look like a lift.
    return {up:1,down:1,automaticUp:1,method:'regional-champions',perLowerDivision:true};
  }
  function playoffRank(game,candidates,endingYear,key){const r=seeded(hash(`${game.meta?.seed||1}-${endingYear}-${key}-playoff`));return [...candidates].map((club,index)=>({club,score:Number(club.powerRating||club.clubRating||45)+(candidates.length-index)*1.35+(r()-.5)*8})).sort((a,b)=>b.score-a.score).map(x=>x.club)}
  function finaliseSeason(game,endingYear,tablesInput){
    const p=ensure(game,endingYear),format=p.format||formatForYear(endingYear),nextFormat=formatForYear(Number(endingYear)+1),divisions=[...(format?.divisions||[])].sort((a,b)=>Number(a.tier)-Number(b.tier)||a.name.localeCompare(b.name)),nextDivisions=[...(nextFormat?.divisions||[])].sort((a,b)=>Number(a.tier)-Number(b.tier)||a.name.localeCompare(b.name)),tables=tablesInput||allTables(game),lookup=new Map(tables.map(x=>[x.division?.id||x.divisionId,x.table||x])),assignments={},divisionAssignments={},promoted=[],relegated=[],tierGroups={};
    const nextGroups={};nextDivisions.forEach(d=>(nextGroups[Number(d.tier)]||(nextGroups[Number(d.tier)]=[])).push(d));
    const targetFor=(club,choices)=>[...choices].sort((a,b)=>regionFit(club,b)-regionFit(club,a)||a.name.localeCompare(b.name))[0]||null;
    activeClubs(game).forEach(c=>{const tier=Number(c.tier)||CONFIG.MAX_TIER,target=targetFor(c,nextGroups[tier]||[]);assignments[c.id]=tier;divisionAssignments[c.id]=target?.id||c.divisionId});
    divisions.forEach(d=>(tierGroups[Number(d.tier)]||(tierGroups[Number(d.tier)]=[])).push(d));
    const label=`${endingYear}-${String(endingYear+1).slice(2)}`;
    if(format?.wartime||format?.noMovement){
      p.nextTierAssignments=assignments;p.nextDivisionAssignments=divisionAssignments;p.pendingMovementClubIds=[];
      const record={season:label,endingYear,promoted:[],relegated:[],wartime:Boolean(format?.wartime),official:format?.official!==false,note:format?.noMovementNote||(format?.wartime?'Wartime regional results are archived separately; promotion and relegation are suspended.':'League membership was decided by election; there was no automatic promotion or relegation.')};
      p.movementHistory.push(record);if(p.movementHistory.length>160)p.movementHistory=p.movementHistory.slice(-160);return record;
    }
    const rowsFor=d=>lookup.get(d.id)||table(game,d.id)||[];
    const positionSort=(a,b)=>Number(b.points||0)-Number(a.points||0)||((Number(b.gf||0)-Number(b.ga||0))-(Number(a.gf||0)-Number(a.ga||0)))||Number(b.gf||0)-Number(a.gf||0)||a.name.localeCompare(b.name);
    const relegationSort=(a,b)=>Number(a.points||0)-Number(b.points||0)||((Number(a.gf||0)-Number(a.ga||0))-(Number(b.gf||0)-Number(b.ga||0)))||Number(a.gf||0)-Number(b.gf||0)||a.name.localeCompare(b.name);
    const moved=new Set(),notes=new Set();
    const moveUp=(entry,upperTier,method)=>{const {club,division}=entry,target=targetFor(club,nextGroups[upperTier]||[]);if(!target||moved.has(club.id))return false;assignments[club.id]=upperTier;divisionAssignments[club.id]=target.id;moved.add(club.id);if(isFootballLeagueDivision(target)&&!isFootballLeagueDivision(division)){const earned=Number(endingYear)+1;club.earnedNationalEntryYear=club.earnedNationalEntryYear==null?earned:Math.min(Number(club.earnedNationalEntryYear),earned)}promoted.push({clubId:club.id,club:club.name,from:Number(division.tier)||upperTier+1,to:upperTier,fromDivision:division.id,toDivision:target.id,method});return true};
    const moveDown=(entry,lowerTier,method)=>{const {club,division}=entry,target=targetFor(club,nextGroups[lowerTier]||[]);if(!target||moved.has(club.id))return false;assignments[club.id]=lowerTier;divisionAssignments[club.id]=target.id;moved.add(club.id);relegated.push({clubId:club.id,club:club.name,from:Number(division.tier)||lowerTier-1,to:lowerTier,fromDivision:division.id,toDivision:target.id,method});return true};
    for(let upperTier=1;upperTier<CONFIG.MAX_TIER;upperTier++){
      const lowerTier=upperTier+1,upperDivs=tierGroups[upperTier]||[],lowerDivs=tierGroups[lowerTier]||[],policy=movementPolicy(endingYear,upperTier,format);
      if(!upperDivs.length||!lowerDivs.length||(!policy.up&&!policy.down))continue;if(policy.note)notes.add(policy.note);
      let promotionPool=[];
      if(policy.regionalChampions||policy.perLowerDivision){
        lowerDivs.forEach(d=>{const ranked=rowsFor(d).slice().sort(positionSort),take=policy.perLowerDivision?Math.max(1,Number(policy.up)||1):1;ranked.slice(0,take).forEach((club,index)=>promotionPool.push({club,index,division:d}))});
      }else lowerDivs.forEach(d=>rowsFor(d).slice().sort(positionSort).slice(0,Math.max(8,Number(policy.up)+4)).forEach((club,index)=>promotionPool.push({club,index,division:d})));
      const promotionCandidates=promotionPool.sort((a,b)=>a.index-b.index||positionSort(a.club,b.club)).filter(x=>!moved.has(x.club.id));
      const relegationPool=[];upperDivs.forEach(d=>rowsFor(d).slice().sort(relegationSort).slice(0,Math.max(8,Number(policy.down)+2)).forEach((club,index)=>relegationPool.push({club,index,division:d})));
      const relegationCandidates=relegationPool.sort((a,b)=>a.index-b.index||relegationSort(a.club,b.club)).filter(x=>!moved.has(x.club.id));
      if(policy.method==='test-match'){
        const r=seeded(hash(`${game.meta?.seed||1}-${endingYear}-${upperTier}-test-matches`)),pairs=Math.min(3,promotionCandidates.length,relegationCandidates.length);
        for(let i=0;i<pairs;i++){const lower=promotionCandidates[i],upper=relegationCandidates[i],lowerScore=Number(lower.club.powerRating||lower.club.clubRating||45)+(3-i)*1.7+(r()-.5)*13,upperScore=Number(upper.club.powerRating||upper.club.clubRating||45)+2.5+(r()-.5)*13;if(lowerScore>upperScore){moveUp(lower,upperTier,'test match victory');moveDown(upper,lowerTier,'test match defeat')}}
        continue;
      }
      let upCount=policy.perLowerDivision?Math.min(promotionCandidates.length,lowerDivs.length*Math.max(1,Number(policy.up)||1)):Math.min(Number(policy.up)||0,promotionCandidates.length),downCount=policy.perLowerDivision?Math.min(relegationCandidates.length,upCount):Math.min(Number(policy.down)||0,relegationCandidates.length);
      const automaticCount=Math.min(upCount,Number(policy.automaticUp??upCount)),automatic=promotionCandidates.slice(0,automaticCount),selected=[...automatic];
      if(selected.length<upCount){const pool=promotionCandidates.slice(automaticCount,Math.max(automaticCount+4,upCount+3)).map(x=>x.club),ranked=playoffRank(game,pool,endingYear,`${upperTier}-${lowerTier}`);for(const club of ranked){const entry=promotionCandidates.find(x=>x.club.id===club.id);if(entry&&!selected.some(x=>x.club.id===club.id))selected.push(entry);if(selected.length>=upCount)break}}
      selected.slice(0,upCount).forEach((entry,index)=>moveUp(entry,upperTier,index<automaticCount?(policy.method==='regional-champions'?'regional championship':'automatic promotion'):'play-off victory'));
      relegationCandidates.slice(0,downCount).forEach(entry=>moveDown(entry,lowerTier,policy.method==='re-election'?'not re-elected':'automatic relegation'));
      if(Number(endingYear)===1957&&upperTier===2){
        // 1957-58: champions of North and South rose; the next eleven in each region
        // formed the national Third Division and the bottom twelve formed Division Four.
        lowerDivs.forEach(d=>{const ranked=rowsFor(d).slice().sort(positionSort);ranked.forEach((club,index)=>{if(moved.has(club.id))return;const tier=index<=11?3:4,target=targetFor(club,nextGroups[tier]||[]);if(target){assignments[club.id]=tier;divisionAssignments[club.id]=target.id}})});notes.add('The 1957-58 regional tables were split into national Third and Fourth Divisions according to finishing position.');
      }
    }
    if(window.FLClubTrajectory)FLClubTrajectory.onSeasonEnd(game,endingYear,tables,{promoted,relegated});
    p.nextTierAssignments=assignments;p.nextDivisionAssignments=divisionAssignments;p.pendingMovementClubIds=[...new Set([...promoted,...relegated].map(x=>x.clubId))];
    const defaultNote=Number(endingYear)>=1986?'Automatic places and play-offs are applied by division, with clubs moving only one level.':'Promotion and relegation places follow the rules in force for this season; clubs can never skip a division.';
    const record={season:label,endingYear,promoted,relegated,note:[...notes].join(' ')||defaultNote};
    p.movementHistory.push(record);if(p.movementHistory.length>160)p.movementHistory=p.movementHistory.slice(-160);return record;
  }
  function isDetailedDivision(game,divisionId){const d=divisionList(game).find(x=>x.id===divisionId);return Boolean(d&&detailedDivision(game,d))}
  function clubCountByTier(game){const out={};activeClubs(game).forEach(c=>out[c.tier]=(out[c.tier]||0)+1);return out}
  return {ensure,formatForYear,prepareSeason,applyDatabaseSnapshot,finaliseSeason,divisionList,divisionForClub,competitionForClub,activeClubs,clubsInDivision,table,allTables,seedList,hydrateClub,dehydrateClub,isDetailedDivision,clubCountByTier,config:CONFIG,simulateLightweightSeason,movementPlaces,movementPolicy,eligibleForDivision,snapshotDivisionId};
})();
