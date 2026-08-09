window.FLHistoryIntegrity=(()=>{
  const VERSION='0.27.5.1-history-placement-integrity';
  const array=value=>Array.isArray(value)?value:[];
  const number=value=>Number.isFinite(Number(value))?Number(value):0;
  const seasonStart=value=>Number(String(value||'1888').slice(0,4))||1888;
  const nameOf=h=>typeof h==='string'?h:(h?.name||h?.title||'Honour');
  const seasonOf=h=>typeof h==='string'?'':String(h?.season||h?.year||'');
  const isPersonal=h=>Boolean(h&&typeof h==='object'&&h.personal);
  const isOfficial=h=>!(h&&typeof h==='object'&&h.official===false);
  const uniquePush=(rows,row,keyFn)=>{const key=keyFn(row);if(!rows.some(x=>keyFn(x)===key))rows.push(row);};
  function ensure(game){
    game.managerArchive=array(game.managerArchive);game.hallOfFame=array(game.hallOfFame);game.retiredPlayers=array(game.retiredPlayers);
    array(game.clubs).forEach(c=>{c.honours=array(c.honours);c.hallOfFame=array(c.hallOfFame);c.managerHistory=array(c.managerHistory);c.seasonHistory=array(c.seasonHistory)});
    return game;
  }

  function snapshotTierMap(snapshot){
    const out=new Map(),add=(rows,block={})=>{const blockTier=number(block?.division?.tier||block?.tier||snapshot?.tier),divisionId=block?.division?.id||block?.divisionId||snapshot?.divisionId||null;array(rows).forEach(row=>{const tier=number(row?.tier)||blockTier;if(row?.id&&tier)out.set(row.id,{tier,divisionId:row.divisionId||divisionId,club:row.name||row.club||''})})};
    array(snapshot?.pyramidTables).forEach(block=>add(block?.table,block));
    if(!out.size&&array(snapshot?.table).length)add(snapshot.table,{division:snapshot?.division,tier:snapshot?.tier,divisionId:snapshot?.divisionId});
    return out;
  }
  function clubHistoryFromSeasons(player,fallbackClub=null){
    const seasons=array(player?.seasonHistory),spells=[];let current=null;
    seasons.forEach(row=>{const clubId=row?.clubId||null,club=row?.club||fallbackClub?.name||'Unknown club',year=seasonStart(row?.season||row?.year);const key=clubId||club;if(!current||current.key!==key){if(current)current.spell.to=Math.max(current.spell.from,year-1);const spell={clubId:clubId||null,club,from:year,to:'Present',apps:0,goals:0};spells.push(spell);current={key,spell};}current.spell.apps+=number(row?.apps);current.spell.goals+=number(row?.goals);});
    if(!spells.length&&fallbackClub)spells.push({clubId:fallbackClub.id,club:fallbackClub.name,from:seasonStart(player?.generatedYear||player?.birthYear||1888),to:'Present',apps:number(player?.careerTotals?.appearances||player?.appearances),goals:number(player?.careerTotals?.goals||player?.goals)});
    return spells;
  }
  function repairPlayerClubHistories(game){
    const active=[];array(game.clubs).forEach(club=>array(club.players).forEach(player=>active.push({player,club})));const retired=array(game.retiredPlayers).map(player=>({player,club:array(game.clubs).find(c=>c.id===player.lastClubId)||null}));
    [...active,...retired].forEach(({player,club})=>{if(!player)return;let spells=array(player.clubHistory);const reconstructed=clubHistoryFromSeasons(player,club);if(!spells.length||new Set(spells.map(x=>x.clubId||x.club)).size<new Set(reconstructed.map(x=>x.clubId||x.club)).size)spells=reconstructed;spells.forEach((spell,index)=>{if(index<spells.length-1&&spell.to==='Present')spell.to=Math.max(number(spell.from),number(spells[index+1]?.from)-1);});if(spells.length){spells.at(-1).to=player.status==='retired'||player.retiredDate?seasonStart(player.retiredDate||game.date):'Present';player.clubHistory=spells;}});return active.length+retired.length;
  }
  function repairMovementHistory(game){
    ensure(game);game.pyramid=game.pyramid||{};const archive=[...array(game.seasonArchive)].sort((a,b)=>seasonStart(a.season)-seasonStart(b.season)),byYear=new Map(archive.map(s=>[seasonStart(s.season),s])),existing=new Map(array(game.pyramid.movementHistory).map(row=>[number(row.endingYear)||seasonStart(row.season),row])),years=[...new Set([...byYear.keys(),...existing.keys()])].sort((a,b)=>a-b),rebuilt=[],truth=new Map();
    years.forEach(year=>{
      const current=byYear.get(year),next=byYear.get(year+1),old=existing.get(year),currentMap=snapshotTierMap(current),nextMap=snapshotTierMap(next),noMovement=Boolean(old?.wartime||current?.wartime||old?.noMovement||current?.official===false&&/wartime/i.test(String(current?.competition||current?.note||'')));
      if(!current||!next||!currentMap.size||!nextMap.size){if(old)rebuilt.push(old);return;}
      const promoted=[],relegated=[];
      if(!noMovement){
        currentMap.forEach((from,id)=>{const to=nextMap.get(id);if(!to)return;const delta=to.tier-from.tier;if(delta!==-1&&delta!==1)return;const oldMove=[...array(old?.promoted),...array(old?.relegated)].find(x=>x.clubId===id),move={clubId:id,club:from.club||to.club||oldMove?.club||id,from:from.tier,to:to.tier,fromDivision:from.divisionId,toDivision:to.divisionId,method:oldMove?.method||'recorded tier change'};if(delta===-1)promoted.push(move);else relegated.push(move);});
      }
      const row={...(old||{}),season:current?.season||old?.season||`${year}-${String(year+1).slice(2)}`,endingYear:year,promoted,relegated};if(noMovement){row.promoted=[];row.relegated=[];}rebuilt.push(row);truth.set(year,{promoted:new Set(row.promoted.map(x=>x.clubId)),relegated:new Set(row.relegated.map(x=>x.clubId))});
      if(current){current.promoted=row.promoted.map(x=>x.club);current.relegated=row.relegated.map(x=>x.club);}
    });
    game.pyramid.movementHistory=rebuilt.sort((a,b)=>number(a.endingYear)-number(b.endingYear)).slice(-160);
    array(game.clubs).forEach(club=>{
      array(club.trajectorySeasonLog).forEach(log=>{const year=number(log.endingYear)||seasonStart(log.season),valid=truth.get(year);if(!valid)return;log.promoted=valid.promoted.has(club.id);log.relegated=valid.relegated.has(club.id);if(log.promoted&&log.relegated){log.promoted=false;log.relegated=false;}if(!log.promoted&&!log.relegated&&/relegation|promotion/i.test(String(log.cause||'')))log.cause='the club completed the season without changing division';});
      club.trajectoryHistory=array(club.trajectoryHistory).filter(event=>{const text=`${event?.type||''} ${event?.title||''} ${event?.text||''}`;const promotion=/promot/i.test(text),relegation=/relegat/i.test(text);if(!promotion&&!relegation)return true;const eventYear=number(event?.year)||seasonStart(event?.date),possible=[truth.get(eventYear),truth.get(eventYear-1)].filter(Boolean);return possible.some(valid=>promotion?valid.promoted.has(club.id):valid.relegated.has(club.id));});
      const latest=array(club.trajectorySeasonLog).at(-1);if(latest&&!latest.promoted&&!latest.relegated&&/relegation|promotion/i.test(String(club.currentCause||'')))club.currentCause=latest.cause||'the club completed the season without changing division';
    });
    return {seasons:rebuilt.length,validated:[...truth.keys()].length};
  }

  function splitName(full='Club Manager'){const parts=String(full).trim().split(/\s+/);return {firstName:parts.shift()||'Club',lastName:parts.join(' ')||'Manager'};}
  function spellYear(value,fallback){const match=String(value??'').match(/(18|19|20)\d{2}/);return match?Number(match[0]):fallback;}
  function activeSpell(club,year){
    const rows=array(club.managerHistory);return [...rows].reverse().find(spell=>{const from=spellYear(spell.from,1888),to=spell.to==='Present'?9999:spellYear(spell.to,9999);return year>=from&&year<=to;})||null;
  }
  function profileFrom(game,club,spell,year){
    const current=club.managerProfile||{},same=spell&&(spell.managerId===current.id||spell.name===`${current.firstName||''} ${current.lastName||''}`.trim()),parsed=splitName(spell?.name||`${current.firstName||'Club'} ${current.lastName||'Manager'}`),storedBirth=number(spell?.birthYear)||number(current.birthYear),storedAge=number(spell?.age)||number(current.age)||45,birthYear=storedBirth||year-storedAge;
    return {id:spell?.managerId||current.id||`manager-${club.id}-${year}`,firstName:same?(current.firstName||parsed.firstName):parsed.firstName,lastName:same?(current.lastName||parsed.lastName):parsed.lastName,age:Math.max(18,year-birthYear),birthYear,nationality:current.nationality||'English',birthplace:current.birthplace||club.location||'England',gender:current.gender||'male',appearanceIndex:number(current.appearanceIndex)||1,identitySeed:current.identitySeed,portrait:current.portrait,managerPortraitAsset:current.managerPortraitAsset,faceAssignedYear:number(current.faceAssignedYear)||year,style:current.style||current.managementStyle||'Balanced',temperament:current.temperament||'Measured',reputation:current.reputation||'Regional',user:Boolean(current.user&&same),clubId:club.id};
  }
  function ensureManager(game,profile,club,year,indexes=null){
    // Close the previous incumbent before opening the new manager's spell. This
    // prevents every historical manager being shown as still managing the club.
    const incumbents=indexes?.incumbentByClub,byId=indexes?.byId,old=incumbents?incumbents.get(club.id):game.managerArchive.find(candidate=>candidate.id!==profile.id&&candidate.currentClubId===club.id);
    if(old&&old.id!==profile.id){old.currentClubId=null;const prior=array(old.clubs).at(-1);if(prior&&prior.to==='Present')prior.to=Math.max(number(prior.from)||year-1,year-1)}
    let row=byId?.get(profile.id)||game.managerArchive.find(x=>x.id===profile.id);
    if(!row){row={...profile,id:profile.id,clubs:[],seasons:[],honours:[],achievements:[],record:{played:0,won:0,drawn:0,lost:0,gf:0,ga:0,winPct:0},firstSeason:year,lastSeason:year,currentClubId:club.id,lastClubId:club.id};game.managerArchive.push(row);byId?.set(profile.id,row)}
    Object.assign(row,{firstName:profile.firstName||row.firstName,lastName:profile.lastName||row.lastName,age:number(profile.age)||row.age,birthYear:number(profile.birthYear)||row.birthYear,nationality:profile.nationality||row.nationality,birthplace:profile.birthplace||row.birthplace,gender:profile.gender||row.gender,appearanceIndex:profile.appearanceIndex||row.appearanceIndex,identitySeed:profile.identitySeed||row.identitySeed,portrait:profile.portrait||row.portrait,managerPortraitAsset:profile.managerPortraitAsset||row.managerPortraitAsset,faceAssignedYear:profile.faceAssignedYear||row.faceAssignedYear,style:profile.style||row.style,temperament:profile.temperament||row.temperament,reputation:profile.reputation||row.reputation,user:Boolean(profile.user||row.user),currentClubId:club.id,lastClubId:club.id,lastSeason:Math.max(number(row.lastSeason),year),firstSeason:Math.min(number(row.firstSeason)||year,year)});
    incumbents?.set(club.id,row);
    row.clubs=array(row.clubs);let spell=row.clubs.at(-1);if(!spell||spell.clubId!==club.id){if(spell&&spell.to==='Present')spell.to=year-1;row.clubs.push({clubId:club.id,club:club.name,from:year,to:'Present'})}else{spell.club=club.name;spell.to='Present'}
    return row;
  }
  function recalculate(row){
    const record=array(row.seasons).reduce((out,s)=>{for(const key of ['played','won','drawn','lost','gf','ga'])out[key]+=number(s[key]);return out},{played:0,won:0,drawn:0,lost:0,gf:0,ga:0});record.winPct=record.played?Number((record.won*100/record.played).toFixed(1)):0;row.record=record;row.seasonCount=new Set(array(row.seasons).map(s=>s.season)).size;row.trophies=array(row.honours).filter(h=>h.type!=='promotion').length;return row;
  }
  function managerSeasonRow(game,club,snapshot,profile){
    const tables=array(snapshot?.pyramidTables),tableRow=tables.flatMap(x=>array(x.table)).find(x=>x.id===club.id),fallback=array(club.seasonHistory).find(x=>x.season===snapshot?.season)||{};
    const source=tableRow||fallback;return {season:snapshot.season,managerId:profile.id,id:profile.id,name:`${profile.firstName} ${profile.lastName}`,clubId:club.id,club:club.name,played:number(source.played),won:number(source.won),drawn:number(source.drawn),lost:number(source.lost),gf:number(source.gf),ga:number(source.ga)};
  }
  function addManagerHonour(row,honour){uniquePush(row.honours,honour,h=>`${nameOf(h)}|${seasonOf(h)}|${h.clubId||''}`)}
  function applySeasonHonours(game,snapshot,managerRows){
    if(!snapshot?.official)return;
    array(snapshot.champions).filter(ch=>ch.official!==false).forEach(ch=>{const m=managerRows.find(x=>x.clubId===ch.clubId),archive=m&&game.managerArchive.find(x=>x.id===(m.managerId||m.id));if(archive)addManagerHonour(archive,{name:ch.division,season:snapshot.season,clubId:ch.clubId,club:ch.club,type:'league-title'})});
    array(snapshot.cups).forEach(cup=>{const m=managerRows.find(x=>x.clubId===cup.winnerId),archive=m&&game.managerArchive.find(x=>x.id===(m.managerId||m.id));if(archive)addManagerHonour(archive,{name:cup.name||'Cup',season:snapshot.season,clubId:cup.winnerId,club:cup.winner,type:'cup'})});
  }
  function recordSeason(game,snapshot,managerRows=[]){
    if(!snapshot?.season)return null;ensure(game);const year=seasonStart(snapshot.season),rows=array(managerRows).length?managerRows:array(game.clubs).filter(c=>c.leagueActive!==false).map(club=>{const spell=activeSpell(club,year),profile=profileFrom(game,club,spell,year);return managerSeasonRow(game,club,snapshot,profile)});
    const clubsById=new Map(array(game.clubs).map(club=>[club.id,club])),indexes={byId:new Map(game.managerArchive.map(manager=>[manager.id,manager])),incumbentByClub:new Map(game.managerArchive.filter(manager=>manager.currentClubId).map(manager=>[manager.currentClubId,manager]))};
    rows.forEach(source=>{const club=clubsById.get(source.clubId);if(!club)return;const spell=activeSpell(club,year),profile=club.managerProfile?.id===(source.managerId||source.id)?club.managerProfile:profileFrom(game,club,spell,year),manager=ensureManager(game,{...profile,id:source.managerId||source.id||profile.id,firstName:source.name?splitName(source.name).firstName:profile.firstName,lastName:source.name?splitName(source.name).lastName:profile.lastName},club,year,indexes),season={season:snapshot.season,clubId:club.id,club:club.name,played:number(source.played),won:number(source.won),drawn:number(source.drawn),lost:number(source.lost),gf:number(source.gf),ga:number(source.ga)};const existing=manager.seasons.find(x=>x.season===season.season&&x.clubId===season.clubId);if(existing)Object.assign(existing,season);else manager.seasons.push(season);recalculate(manager)});
    applySeasonHonours(game,snapshot,rows);game.managerArchive.forEach(recalculate);return rows;
  }
  function recordMovement(game,snapshot,movement){
    ensure(game);if(!snapshot)return;const year=seasonStart(snapshot.season);array(movement?.promoted).forEach(move=>{const manager=game.managerArchive.find(m=>array(m.seasons).some(s=>s.season===snapshot.season&&s.clubId===move.clubId));if(!manager)return;uniquePush(manager.achievements,{name:'Promotion',season:snapshot.season,clubId:move.clubId,club:move.club,method:move.method||'promotion'},h=>`${h.name}|${h.season}|${h.clubId}`)});game.managerArchive.forEach(recalculate);inductHallOfFame(game,year+1);
  }
  function cleanClubHonours(game){
    ensure(game);const movement=array(game.pyramid?.movementHistory);
    array(game.clubs).forEach(club=>{
      const seen=new Set(),rows=[];array(club.honours).forEach(h=>{if(!isOfficial(h)||isPersonal(h))return;const key=`${nameOf(h)}|${seasonOf(h)}`;if(!seen.has(key)){seen.add(key);rows.push(h)}});
      const sorted=[...rows].sort((a,b)=>seasonStart(seasonOf(a))-seasonStart(seasonOf(b))),kept=[],lastLowerWinByTier={};
      sorted.forEach(h=>{const season=seasonOf(h),snap=array(game.seasonArchive).find(s=>s.season===season),champ=array(snap?.champions).find(c=>c.clubId===club.id&&c.division===nameOf(h)),tier=number(champ?.tier);if(tier>1){const prior=lastLowerWinByTier[tier];if(prior){const relegatedBetween=movement.some(m=>number(m.endingYear)>prior&&number(m.endingYear)<seasonStart(season)&&array(m.relegated).some(x=>x.clubId===club.id&&number(x.to)>=tier));if(!relegatedBetween)return}lastLowerWinByTier[tier]=seasonStart(season)}kept.push(h)});
      club.honours=kept.sort((a,b)=>seasonStart(seasonOf(a))-seasonStart(seasonOf(b)));
    });
  }
  function backfillManagers(game){
    ensure(game);
    // Fresh careers already record every manager season as it happens. Replaying
    // the archive here would reopen old spells and attach inactive clubs to
    // seasons they never played. Backfill is only for legacy saves with no rows.
    if(game.managerArchive.some(m=>array(m.seasons).length))return game.managerArchive;
    const snapshots=[...array(game.seasonArchive)].sort((a,b)=>seasonStart(a.season)-seasonStart(b.season)),existing=new Set();
    snapshots.forEach(snapshot=>{const year=seasonStart(snapshot.season),rows=[],tableRows=[...array(snapshot.table),...array(snapshot.pyramidTables).flatMap(x=>array(x.table))];array(game.clubs).forEach(club=>{
      const key=`${snapshot.season}|${club.id}`;if(existing.has(key))return;
      const stored=array(snapshot.managers).find(x=>x.clubId===club.id),tableRow=tableRows.find(x=>x.id===club.id),spell=activeSpell(club,year);
      if(!stored&&!tableRow)return;if(!stored&&!spell)return;
      const profile=profileFrom(game,club,spell,year),named=stored?.name?splitName(stored.name):null,id=stored?.managerId||stored?.id||profile.id;
      if(!id)return;
      const source=stored||managerSeasonRow(game,club,snapshot,{...profile,id});rows.push({...source,managerId:id,id,name:stored?.name||`${profile.firstName} ${profile.lastName}`,firstName:named?.firstName||profile.firstName,lastName:named?.lastName||profile.lastName});existing.add(key)
    });if(rows.length)recordSeason(game,snapshot,rows)});return game.managerArchive;
  }
  function playerScore(player){const totals=player.careerTotals||{},honours=array(player.honours),team=honours.filter(h=>!isPersonal(h)).length,personal=honours.filter(isPersonal).length;return number(totals.appearances)*.08+number(totals.goals)*.24+number(totals.assists)*.12+number(totals.cleanSheets)*.12+team*9+personal*3+(player.legendArchetype?70:0)+number(player.bestAbility||player.ability)*.35;}
  function hallReason(player,clubLevel=false){const totals=player.careerTotals||{};if(player.legendArchetype)return player.archetypeLabel||'Era-defining career';if(number(totals.goals)>=300)return `${number(totals.goals)} career goals`;if(number(totals.appearances)>=600)return `${number(totals.appearances)} career appearances`;if(array(player.honours).length>=8)return `${array(player.honours).length} recorded honours`;return clubLevel?'Outstanding service to the club':'Outstanding career record';}
  function inductHallOfFame(game,year=seasonStart(game.date)){
    ensure(game);const worldIds=new Set(game.hallOfFame.map(x=>x.playerId||x.id));
    array(game.retiredPlayers).forEach(player=>{const totals=player.careerTotals||{},score=playerScore(player),club=array(game.clubs).find(c=>c.id===player.lastClubId),teamHonours=array(player.honours).filter(h=>!isPersonal(h)).length,clubEligible=Boolean(player.legendArchetype||number(totals.appearances)>=250||number(totals.goals)>=120||number(totals.cleanSheets)>=150||(teamHonours>=3&&number(totals.appearances)>=150)),worldEligible=Boolean(player.legendArchetype||number(totals.appearances)>=750||number(totals.goals)>=400||number(totals.cleanSheets)>=300||(teamHonours>=10&&number(totals.appearances)>=400)||score>=260);
      if(club&&clubEligible&&!club.hallOfFame.some(x=>(x.playerId||x.id)===player.id))club.hallOfFame.push({playerId:player.id,id:player.id,name:player.name,role:'Player',inductedYear:Math.max(year,seasonStart(player.retiredDate||year)),reason:hallReason(player,true),apps:number(totals.appearances),goals:number(totals.goals),honours:teamHonours,score:Number(score.toFixed(1))});
      if(worldEligible&&!worldIds.has(player.id)){game.hallOfFame.push({playerId:player.id,id:player.id,name:player.name,clubId:player.lastClubId,club:player.lastClubName||club?.name||'—',role:'Player',inductedYear:Math.max(year,seasonStart(player.retiredDate||year)),reason:hallReason(player,false),score:Number(score.toFixed(1))});worldIds.add(player.id)}
    });
    array(game.clubs).forEach(c=>c.hallOfFame.sort((a,b)=>number(b.score)-number(a.score)||number(a.inductedYear)-number(b.inductedYear)));game.hallOfFame.sort((a,b)=>number(b.score)-number(a.score));
  }
  function archivedClubRow(snapshot,clubId){
    for(const block of array(snapshot?.pyramidTables)){const row=array(block?.table).find(x=>x.id===clubId);if(row)return {...row,divisionId:row.divisionId||block?.division?.id||null,division:row.division||block?.division?.name||'English football',tier:number(row.tier||block?.division?.tier)}}
    const row=array(snapshot?.table).find(x=>x.id===clubId);return row?{...row,tier:number(row.tier||snapshot?.tier),divisionId:row.divisionId||snapshot?.divisionId||null,division:row.division||snapshot?.division?.name||'English football'}:null;
  }
  function divisionForExpectedTier(game,club,tier,priorDivisionId,year){
    const format=window.FLPyramid?.formatForYear?.(year),choices=array(format?.divisions).filter(d=>number(d.tier)===number(tier));if(!choices.length)return null;
    const direct=choices.find(d=>d.id===priorDivisionId);if(direct)return direct;
    const text=`${club?.subregion||''} ${club?.region||''} ${club?.location||''}`.toLowerCase();
    const score=d=>{const key=String(d.regionKey||'').toLowerCase();if(!key)return 1;let n=0;key.split(/[-_\s]+/).filter(Boolean).forEach(part=>{if(text.includes(part))n+=4});if(/north/.test(key)&&/north|lancashire|yorkshire|durham|cumbria|mersey|manchester/.test(text))n+=6;if(/south/.test(key)&&/south|london|kent|sussex|essex|hampshire|devon|cornwall/.test(text))n+=6;return n};
    return [...choices].sort((a,b)=>score(b)-score(a)||String(a.name).localeCompare(String(b.name)))[0]||choices[0];
  }
  function reconcileCurrentPlacement(game){
    if(!window.FLPyramid)return {changed:false,reason:'pyramid-unavailable'};ensure(game);const year=seasonStart(game.date),clubId=game.meta?.preselectedClubId||game.controlledClubId,club=array(game.clubs).find(c=>c.id===clubId);if(!club)return {changed:false,reason:'club-unavailable'};
    const currentPlayed=array(game.fixtures).some(f=>f.played&&seasonStart(f.date)===year);if(currentPlayed)return {changed:false,reason:'season-started'};
    const snapshots=[...array(game.seasonArchive)].sort((a,b)=>seasonStart(a.season)-seasonStart(b.season)),latest=[...snapshots].reverse().find(s=>archivedClubRow(s,club.id));if(!latest)return {changed:false,reason:'no-archive'};
    const previous=archivedClubRow(latest,club.id),endingYear=seasonStart(latest.season);if(!previous?.tier)return {changed:false,reason:'no-previous-tier'};
    const movement=[...array(game.pyramid?.movementHistory)].reverse().find(row=>number(row.endingYear)===endingYear||String(row.season||'')===String(latest.season||'')),move=[...array(movement?.promoted),...array(movement?.relegated)].find(x=>x.clubId===club.id);
    let expected=number(move?.to)||number(previous.tier);
    // The 1957-58 regional reorganisation was structural: champions rose,
    // places 2-12 formed Division Three and the lower half formed Division Four.
    if(!move&&endingYear===1957&&number(previous.tier)===3)expected=number(previous.position)<=12?3:4;
    const current=window.FLPyramid.divisionForClub(game,club.id),currentTier=number(current?.tier||club.tier);if(!expected||currentTier===expected)return {changed:false,reason:'already-consistent'};
    const division=divisionForExpectedTier(game,club,expected,move?.toDivision||previous.divisionId,year);if(!division)return {changed:false,reason:'division-unavailable'};
    game.pyramid=game.pyramid||{};game.pyramid.nextTierAssignments=game.pyramid.nextTierAssignments||{};game.pyramid.nextDivisionAssignments=game.pyramid.nextDivisionAssignments||{};game.pyramid.nextTierAssignments[club.id]=expected;game.pyramid.nextDivisionAssignments[club.id]=division.id;window.FLPyramid.prepareSeason(game,year);
    // At an unplayed season boundary it is safe to rebuild that season's lists.
    if(window.FLGame?.makePyramidSchedule){game.fixtures=window.FLGame.makePyramidSchedule(game,year);window.FLEnglishCup?.newSeason?.(game,year);window.FLCareerSystems?.startExtendedCups?.(game,year)}
    game.meta=game.meta||{};game.meta.currentPlacementRepair={version:VERSION,date:game.date,clubId:club.id,from:currentTier,to:expected,previousSeason:latest.season,previousPosition:previous.position,movement:move?move.method||'recorded movement':'no recorded movement'};
    return {changed:true,clubId:club.id,from:currentTier,to:expected,divisionId:division.id};
  }
  function migrate(game,{force=false}={}){
    ensure(game);game.meta=game.meta||{};if(!force&&game.meta.historyIntegrityVersion===VERSION){reconcileCurrentPlacement(game);return game}repairMovementHistory(game);reconcileCurrentPlacement(game);repairPlayerClubHistories(game);cleanClubHonours(game);backfillManagers(game);inductHallOfFame(game,seasonStart(game.date));game.meta.historyIntegrityVersion=VERSION;return game;
  }
  return {ensure,recordSeason,recordMovement,inductHallOfFame,cleanClubHonours,backfillManagers,repairMovementHistory,repairPlayerClubHistories,reconcileCurrentPlacement,migrate,version:VERSION};
})();
