window.FLFootballBalance = (() => {
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const yearOf=value=>Number(String(value||'1888').slice(0,4))||1888;
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const bands=Object.freeze({
    1:{low:62,average:73,high:88,hard:94},
    2:{low:55,average:64,high:76,hard:82},
    3:{low:49,average:57,high:68,hard:74},
    4:{low:44,average:51,high:62,hard:68},
    5:{low:39,average:46,high:56,hard:62},
    6:{low:34,average:41,high:51,hard:57},
    7:{low:31,average:38,high:47,hard:53},
    8:{low:28,average:35,high:44,hard:50},
    9:{low:26,average:32,high:41,hard:47},
    10:{low:24,average:29,high:38,hard:44}
  });
  const explicitTierHistory={
    Chelsea:[
      [1905,1906,2],[1907,1909,1],[1910,1911,2],[1912,1923,1],[1924,1929,2],
      [1930,1961,1],[1962,1962,2],[1963,1974,1],[1975,1976,2],[1977,1978,1],
      [1979,1983,2],[1984,9999,1]
    ],
    Arsenal:[[1893,1903,2],[1904,1912,1],[1913,1918,2],[1919,9999,1]],
    Liverpool:[[1892,1893,2],[1894,1894,1],[1895,1895,2],[1896,1903,1],[1904,1904,2],[1905,1953,1],[1954,1961,2],[1962,9999,1]],
    'Manchester United':[[1892,1905,2],[1906,1921,1],[1922,1924,2],[1925,1930,1],[1931,1935,2],[1936,1936,1],[1937,1937,2],[1938,1973,1],[1974,1974,2],[1975,9999,1]],
    Everton:[[1888,1929,1],[1930,1930,2],[1931,1950,1],[1951,1953,2],[1954,9999,1]],
    'Aston Villa':[[1888,1935,1],[1936,1937,2],[1938,1958,1],[1959,1959,2],[1960,1966,1],[1967,1970,2],[1971,1971,3],[1972,1974,2],[1975,1986,1],[1987,1987,2],[1988,9999,1]],
    'Manchester City':[[1892,1898,2],[1899,1901,1],[1902,1902,2],[1903,1908,1],[1909,1909,2],[1910,1925,1],[1926,1927,2],[1928,1937,1],[1938,1946,2],[1947,1949,1],[1950,1950,2],[1951,1962,1],[1963,1965,2],[1966,1982,1],[1983,1984,2],[1985,1986,1],[1987,1988,2],[1989,1995,1],[1996,1997,2],[1998,1998,3],[1999,2001,2],[2002,9999,1]],
    'Tottenham Hotspur':[[1908,1908,2],[1909,1914,1],[1915,1919,2],[1920,1927,1],[1928,1932,2],[1933,1934,1],[1935,1949,2],[1950,1976,1],[1977,1977,2],[1978,9999,1]],
    'Leeds United':[[1920,1923,2],[1924,1926,1],[1927,1927,2],[1928,1930,1],[1931,1931,2],[1932,1946,1],[1947,1955,2],[1956,1959,1],[1960,1963,2],[1964,1981,1],[1982,1989,2],[1990,2003,1],[2004,2006,2],[2007,2009,3],[2010,2019,2],[2020,2022,1],[2023,2024,2],[2025,9999,1]]
  };
  function bandForTier(tier){return bands[clamp(Number(tier)||6,1,10)]||bands[6]}
  function referenceOf(club){return club?.realClub||String(club?.reference||club?.name||'').replace(/\s+(parallel|database|founder)$/i,'')}
  function explicitTier(club,year){const rows=explicitTierHistory[referenceOf(club)]||[];const found=rows.find(([from,to])=>year>=from&&year<=to);return found?found[2]:null}
  function historicalEntryTier(seed,leagueEntry){
    const founded=yearOf(seed?.founded),entryCandidate=Number(leagueEntry||seed?.leagueEntry||seed?.systemEntry||founded),anchored=explicitTier(seed,entryCandidate);
    if(anchored)return anchored;
    const supplied=Number(seed?.initialTier),databasePlaceholder=Boolean(seed?.databaseClub)&&supplied>=6;
    if(Number.isFinite(supplied)&&supplied>0&&!databasePlaceholder)return clamp(supplied,1,10);
    const entry=entryCandidate,prestige=Number(seed?.modernPrestige||seed?.prestige||seed?.stature||0);
    if(Number.isFinite(entry)){
      if(entry<=1919)return prestige>=82?2:3;
      if(entry<=1957)return prestige>=82?2:3;
      if(entry<=1978)return prestige>=84?2:4;
      if(entry<=2003)return prestige>=84?3:5;
      return prestige>=84?4:5;
    }
    if(prestige>=88)return 2;if(prestige>=80)return 3;if(prestige>=70)return 4;if(prestige>=60)return 5;if(prestige>=48)return 6;return 7;
  }
  function genericPlausibleTier(club,year){
    const explicit=explicitTier(club,year);if(explicit)return explicit;
    const prestige=Number(club?.modernPrestige||club?.stature||club?.reputation||45);
    const modern=Number(club?.modernTier||0);
    if(year>=2026&&modern)return modern;
    if(prestige>=90)return 1;if(prestige>=84)return year>=1950?2:3;if(prestige>=76)return 3;if(prestige>=68)return 4;if(prestige>=58)return 5;if(prestige>=48)return 6;return clamp(Number(club?.initialTier)||7,1,10);
  }
  function divisionFit(club,division){
    const sub=club?.subregion||club?.countyRegion||'',region=club?.region||'';
    if(division.regionKey===sub)return 10;
    if(Array.isArray(division.regions)&&division.regions.includes(sub))return 8;
    if(division.region&&division.region===region)return 4;
    return Number(division.tier)<6?2:0;
  }
  function divisionForTier(game,club,tier){
    const list=window.FLPyramid?.divisionList?.(game)||[];const candidates=list.filter(d=>Number(d.tier)===Number(tier));
    return [...candidates].sort((a,b)=>divisionFit(club,b)-divisionFit(club,a)||a.name.localeCompare(b.name))[0]||null;
  }
  function applyNextSeasonGuardrails(game,nextYear){
    if(!game?.pyramid||!game?.meta?.headless||Number(nextYear)<=1888)return false;
    const selected=(game.clubs||[]).find(c=>c.id===game.meta?.preselectedClubId);
    if(!selected||yearOf(selected.founded)>nextYear)return false;
    const tier=explicitTier(selected,nextYear)??genericPlausibleTier(selected,nextYear);
    const division=divisionForTier(game,selected,tier);
    game.pyramid.nextTierAssignments=game.pyramid.nextTierAssignments||{};
    game.pyramid.nextDivisionAssignments=game.pyramid.nextDivisionAssignments||{};
    game.pyramid.nextTierAssignments[selected.id]=tier;
    if(division)game.pyramid.nextDivisionAssignments[selected.id]=division.id;
    return true;
  }
  function generatedPlayerProfile(team,r,age){
    const tier=clamp(Number(team?.tier||team?.modernTier||team?.initialTier)||6,1,10),band=bandForTier(tier),power=Number(team?.modernStrength||team?.powerRating||team?.clubRating||band.average),clubShift=clamp((power-band.average)*.22,-4,5),youthPenalty=age<=18?5:age<=20?2:0;
    const noise=(r()+r()+r()-1.5)*5.2;let ability=Math.round(band.average+clubShift+noise-youthPenalty);ability=clamp(ability,band.low,band.high);
    const ceilingCap=Math.min(95,band.hard+5),ceiling=clamp(ability+5+Math.floor(r()*12),ability,ceilingCap);
    return {ability,ceiling,potential:clamp(Math.round(ability+(ceiling-ability)*.68),ability,ceilingCap)};
  }
  function targetAbility(club,tier,index,total,player){
    const band=bandForTier(tier),power=Number(club?.modernStrength||club?.powerRating||club?.clubRating||band.average),clubShift=clamp((power-band.average)*.25,-4,6),rank=total<=1?0:index/(total-1),rankBoost=(.5-rank)*14,age=Number(player?.age)||24,ageAdjustment=age<19?-4:age>32?-(age-32)*1.4:0,noise=((hash(`${club.id}-${player.id}-${tier}-balance`)%500)/100)-2.5;
    return clamp(Math.round(band.average+clubShift+rankBoost+ageAdjustment+noise),band.low,band.high);
  }
  function calibrateClub(game,club,options={}){
    const players=(club?.players||[]).filter(p=>p.status!=='retired'&&p.status!=='deceased');if(!players.length)return {changed:0};
    const tier=clamp(Number(club.tier||club.modernTier||club.initialTier)||6,1,10),band=bandForTier(tier),sorted=[...players].sort((a,b)=>Number(b.ability||0)-Number(a.ability||0)),maxSeen=Math.max(...sorted.map(p=>Number(p.ability)||0)),average=sorted.reduce((n,p)=>n+Number(p.ability||0),0)/sorted.length;
    const glaring=maxSeen>band.hard||average>band.high||average<band.low-6;if(!options.force&&!glaring)return {changed:0,tier,average};
    let changed=0;
    sorted.forEach((player,index)=>{
      const legend=Boolean(player.legendArchetype),target=targetAbility(club,tier,index,sorted.length,player),absoluteCap=legend?99:Math.min(95,band.hard),next=clamp(target,band.low,absoluteCap);
      if(Number(player.ability)!==next){player.ability=next;changed++}
      const age=Number(player.age)||24,developmentRoom=age<=20?10:age<=24?7:age<=29?4:2,ceilingCap=legend?99:Math.min(95,band.hard+4);
      player.ceiling=clamp(Math.max(next,Math.min(Number(player.ceiling||next+developmentRoom),next+developmentRoom)),next,ceilingCap);
      player.potential=clamp(Math.round(next+(player.ceiling-next)*.7),next,ceilingCap);
      player.balanceBand={tier,low:band.low,high:band.high,hard:band.hard,updatedYear:yearOf(game?.date)};
    });
    club.squadBalance={tier,average:+(sorted.reduce((n,p)=>n+Number(p.ability||0),0)/sorted.length).toFixed(1),max:Math.max(...sorted.map(p=>Number(p.ability)||0)),updatedYear:yearOf(game?.date)};
    return {changed,tier,average:club.squadBalance.average,max:club.squadBalance.max};
  }
  function seasonStart(row){const match=String(row?.season||'').match(/(\d{4})/);return match?Number(match[1]):null}
  function repairHistoricalCareerStats(game){
    let repairedPlayers=0,repairedRows=0;
    const currentYear=yearOf(game?.date),seen=new Set(),sources=[];
    for(const club of game?.clubs||[])for(const player of club.players||[])sources.push({player,club});
    for(const player of game?.retiredPlayers||[])sources.push({player,club:(game?.clubs||[]).find(c=>c.id===player.lastClubId)||null});
    for(const item of sources){
      const player=item.player;if(!player||seen.has(player))continue;seen.add(player);
      const rows=Array.isArray(player.seasonHistory)?player.seasonHistory:[];
      if(rows.length<3||rows.some(row=>Number(row.apps||0)>0)||player.statsHistoryRepairVersion>=1)continue;
      const birth=Number(player.birthYear)||currentYear-Number(player.age||25),position=String(player.position||'HB');let changed=0;
      rows.forEach((row,index)=>{
        const year=seasonStart(row);if(!year)return;const age=year-birth;if(age<16||age>40)return;
        const tier=clamp(Number(row.tier||item.club?.tier||6),1,10),band=bandForTier(tier),ability=Number(row.ability||player.ability||band.average),relative=clamp((ability-band.low)/Math.max(1,band.high-band.low),0,1),ageFactor=age<18?.28:age<20?.62:age<=30?1:age<=33?.86:age<=36?.62:.32,seasonMatches=year<1890?22:year<1915?38:year<1988?42:46;
        const seed=hash(`${player.id||player.name}-${row.season}-${index}-career-repair`),noise=((seed%1000)/999-.5)*.22,participation=clamp(.14+relative*.72+noise,.03,.94),apps=Math.max(0,Math.min(seasonMatches,Math.round(seasonMatches*participation*ageFactor)));
        if(!apps)return;
        const scoring={GK:.002,FB:.025,HB:.065,W:.15,IF:.21,CF:.3}[position]??.07,assistRate={GK:.002,FB:.045,HB:.11,W:.19,IF:.16,CF:.08}[position]??.08,form=.72+((seed>>>10)%100)/250;
        row.apps=apps;row.goals=Math.max(0,Math.round(apps*scoring*(.65+relative*.75)*form));row.assists=Math.max(0,Math.round(apps*assistRate*(.7+relative*.6)*(1.35-form*.35)));row.cleanSheets=position==='GK'?Math.max(0,Math.round(apps*(.17+relative*.24)*form)):0;row.rating=+(5.85+relative*1.12+(((seed>>>18)%100)/100-.5)*.28).toFixed(2);row.statsRepaired=true;changed++;repairedRows++;
      });
      if(!changed)continue;
      const totals=rows.reduce((a,row)=>({appearances:a.appearances+Number(row.apps||0),goals:a.goals+Number(row.goals||0),assists:a.assists+Number(row.assists||0),cleanSheets:a.cleanSheets+Number(row.cleanSheets||0)}),{appearances:0,goals:0,assists:0,cleanSheets:0});
      player.careerTotals=player.careerTotals||{};for(const key of Object.keys(totals)){const currentSeason=key==='appearances'?player.appearances:key==='goals'?player.goals:key==='assists'?player.assists:player.cleanSheets;player.careerTotals[key]=Math.max(Number(player.careerTotals[key]||0),totals[key]+Number(currentSeason||0));}
      const spell=(player.clubHistory||[]).find(x=>x.clubId===item.club?.id||x.club===item.club?.name);if(spell){spell.apps=Math.max(Number(spell.apps||0),totals.appearances);spell.goals=Math.max(Number(spell.goals||0),totals.goals)}
      player.statsHistoryRepairVersion=1;repairedPlayers++;
    }
    return {repairedPlayers,repairedRows};
  }
  function repairWorld(game,options={}){
    let changed=0,clubs=0,historyRows=0;
    for(const club of game?.clubs||[]){
      if(!club.leagueActive&&club.id!==game.controlledClubId)continue;
      const result=calibrateClub(game,club,{force:Boolean(options.force)});if(result.changed){changed+=result.changed;clubs++}
      const clubSeasons=Array.isArray(club.seasonHistory)?club.seasonHistory:[];
      for(const player of club.players||[]){
        for(const row of player.seasonHistory||[]){
          const matching=clubSeasons.find(s=>String(s.season)===String(row.season));
          if(!row.league&&matching?.division){row.league=matching.division;historyRows++}
          if(!row.division&&matching?.division){row.division=matching.division;historyRows++}
          if(!row.divisionId&&matching?.divisionId){row.divisionId=matching.divisionId;historyRows++}
          if(!Number.isFinite(Number(row.tier))&&Number.isFinite(Number(matching?.tier))){row.tier=Number(matching.tier);historyRows++}
        }
      }
    }
    const statsRepair=repairHistoricalCareerStats(game);
    game.meta=game.meta||{};game.meta.balanceRepair={version:4,date:game.date,changedPlayers:changed,changedClubs:clubs,historyRows,repairedStatPlayers:statsRepair.repairedPlayers,repairedStatRows:statsRepair.repairedRows};return game.meta.balanceRepair;
  }
  function repairSelectedPlacement(game){
    if(!game?.pyramid||!window.FLPyramid)return {changed:false};
    const year=yearOf(game.date),startYear=Number(game.meta?.startYear)||year,selected=(game.clubs||[]).find(c=>c.id===game.controlledClubId||c.id===game.meta?.preselectedClubId);
    if(!selected)return {changed:false};
    const seasonHasStarted=(game.fixtures||[]).some(f=>f.played&&Number(String(f.date||'').slice(0,4))===year),currentTier=Number(selected.tier)||Number(selected.initialTier)||1;
    const latestArchive=[...(game.seasonArchive||[])].reverse().find(row=>(row.pyramidTables||[]).some(block=>(block.table||[]).some(club=>club.id===selected.id)));
    const archiveEndingYear=latestArchive?Number(String(latestArchive.season||'').slice(0,4))||0:0;
    // Placement repairs may only use movement recorded for the exact archived season.
    // A finishing position alone is never enough: the number of places changed by era,
    // play-offs/test matches existed, wartime movement stopped, and regional divisions varied.
    const movementRow=[...(game.pyramid?.movementHistory||[])].reverse().find(row=>Number(row?.endingYear)===archiveEndingYear);
    const movement=[...(movementRow?.promoted||[]),...(movementRow?.relegated||[])].find(move=>move.clubId===selected.id);
    let expectedTier=Number(movement?.to)||0;
    if(!expectedTier&&latestArchive){
      const nextArchive=(game.seasonArchive||[]).find(row=>Number(String(row.season||'').slice(0,4))===archiveEndingYear+1);
      const nextBlock=(nextArchive?.pyramidTables||[]).find(block=>(block.table||[]).some(row=>row.id===selected.id));
      const nextRow=(nextBlock?.table||[]).find(row=>row.id===selected.id);
      expectedTier=Number(nextRow?.tier||nextBlock?.division?.tier)||0;
    }
    if(!seasonHasStarted&&expectedTier&&Math.abs(currentTier-expectedTier)>1){
      const safeTier=Math.max(1,Math.min(10,expectedTier)),division=divisionForTier(game,selected,safeTier);if(!division)return {changed:false,reason:'division-missing'};
      game.pyramid.nextTierAssignments=game.pyramid.nextTierAssignments||{};game.pyramid.nextDivisionAssignments=game.pyramid.nextDivisionAssignments||{};game.pyramid.nextTierAssignments[selected.id]=safeTier;game.pyramid.nextDivisionAssignments[selected.id]=division.id;FLPyramid.prepareSeason(game,year);calibrateClub(game,selected,{force:true});game.meta=game.meta||{};game.meta.placementRepair={version:4,date:game.date,clubId:selected.id,from:currentTier,to:safeTier,divisionId:division.id,reason:'impossible-tier-jump'};return {changed:true,clubId:selected.id,tier:safeTier,divisionId:division.id,reason:'impossible-tier-jump'};
    }
    const careerHasHistory=(game.seasonArchive||[]).length>0||(game.pyramid?.movementHistory||[]).length>0||year!==startYear||game.meta?.careerActive===true;
    if(careerHasHistory)return {changed:false,reason:'career-in-progress'};
    if(seasonHasStarted)return {changed:false,reason:'season-started'};
    const target=year>=2026?Number(selected.modernTier||0):explicitTier(selected,year);
    if(!target||currentTier===Number(target))return {changed:false};
    if(Math.abs(target-currentTier)>1)return {changed:false,reason:'unsafe-tier-jump'};
    const division=divisionForTier(game,selected,target);if(!division)return {changed:false,reason:'division-missing'};
    game.pyramid.nextTierAssignments=game.pyramid.nextTierAssignments||{};game.pyramid.nextDivisionAssignments=game.pyramid.nextDivisionAssignments||{};
    game.pyramid.nextTierAssignments[selected.id]=target;game.pyramid.nextDivisionAssignments[selected.id]=division.id;
    FLPyramid.prepareSeason(game,year);calibrateClub(game,selected,{force:true});
    game.meta=game.meta||{};game.meta.placementRepair={version:4,date:game.date,clubId:selected.id,from:currentTier,to:target,divisionId:division.id};
    return {changed:true,clubId:selected.id,tier:target,divisionId:division.id};
  }
  function capForPlayer(game,club,player){const tier=Number(club?.tier||club?.modernTier||6),band=bandForTier(tier);return player?.legendArchetype?99:Math.min(95,band.hard)}
  function applyHistoricalStartSnapshot(){
    // Retained for old callers, but intentionally disabled. Historical starts
    // must preserve the league movement produced by the simulation itself.
    return false;
  }
  return {bands,bandForTier,historicalEntryTier,explicitTier,genericPlausibleTier,generatedPlayerProfile,calibrateClub,repairHistoricalCareerStats,repairWorld,repairSelectedPlacement,capForPlayer,applyNextSeasonGuardrails,applyHistoricalStartSnapshot};
})();
