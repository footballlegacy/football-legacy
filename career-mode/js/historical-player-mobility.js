window.FLHistoricalPlayerMobility=(()=>{
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const arr=v=>Array.isArray(v)?v:[];
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const seeded=text=>{let s=hash(text);return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
  const seasonLabel=year=>`${year-1}-${String(year).slice(2)}`;
  const eraProfile=year=>{
    if(year<=1914)return {rate:.018,maxSpells:3,repeat:.50,minTenure:3};
    if(year<=1918)return {rate:.004,maxSpells:3,repeat:.45,minTenure:3};
    if(year<=1938)return {rate:.028,maxSpells:4,repeat:.56,minTenure:3};
    if(year<=1945)return {rate:.005,maxSpells:4,repeat:.52,minTenure:3};
    if(year<=1962)return {rate:.045,maxSpells:5,repeat:.62,minTenure:2};
    if(year<=1977)return {rate:.088,maxSpells:6,repeat:.76,minTenure:2};
    if(year<=1994)return {rate:.135,maxSpells:8,repeat:.84,minTenure:1};
    if(year<=2009)return {rate:.195,maxSpells:10,repeat:.90,minTenure:1};
    return {rate:.225,maxSpells:12,repeat:.93,minTenure:1};
  };
  const eraRate=year=>eraProfile(year).rate;
  const yearsLeft=(game,p)=>{if(!p.contractEnd)return 1.5;const end=Number(String(p.contractEnd).slice(0,4))||Number(String(game.date).slice(0,4));return end-(Number(String(game.date).slice(0,4))||end)};
  const positionGroup=p=>{const x=String(p.position||'').toUpperCase();if(x==='GK')return 'GK';if(['FB','CB','WB','DF'].includes(x))return 'DEF';if(['HB','CM','AM','WM','MF'].includes(x))return 'MID';return 'ATT'};
  const needScore=(club,p)=>{const group=positionGroup(p),count=arr(club.players).filter(x=>positionGroup(x)===group).length,target=group==='GK'?3:group==='DEF'?8:group==='MID'?8:6;return clamp((target-count)*3,-10,18)};
  const regionalScore=(from,to,year)=>{if(year>=1977)return 0;const sameSub=from.subregion&&to.subregion&&from.subregion===to.subregion,sameRegion=from.region&&to.region&&from.region===to.region;if(sameSub)return year<1963?19:10;if(sameRegion)return year<1963?10:5;return year<1930?-18:year<1963?-9:-3};
  const statusFactor=p=>p.squadStatus==='Backup'?1.48:p.squadStatus==='Rotation'?1.24:p.squadStatus==='Key Player'?.72:p.squadStatus==='First Team'?.92:1;
  const ageFactor=age=>age<=21?1.18:age<=28?1:age<=31?.82:age<=34?.58:.30;
  function normaliseHistory(game){
    arr(game.clubs).forEach(club=>arr(club.players).forEach(p=>{
      p.clubHistory=arr(p.clubHistory);const seasons=arr(p.seasonHistory).filter(x=>x.clubId||x.club);if(!p.clubHistory.length&&seasons.length){let last=null;for(const row of seasons){const key=row.clubId||row.club;if(!last||last.key!==key){if(last)last.spell.to=Number(String(row.season||'').slice(0,4))||last.spell.from;const spell={clubId:row.clubId||null,club:row.club||club.name,from:Number(String(row.season||'').slice(0,4))||1888,to:'Present',apps:0,goals:0};p.clubHistory.push(spell);last={key,spell};}last.spell.apps+=Number(row.apps)||0;last.spell.goals+=Number(row.goals)||0;}}
      if(!p.clubHistory.length)p.clubHistory.push({clubId:club.id,club:club.name,from:Number(p.generatedYear||String(game.date).slice(0,4))||1888,to:'Present',apps:0,goals:0});
      let current=[...p.clubHistory].reverse().find(x=>x.to==='Present');if(!current){current={clubId:club.id,club:club.name,from:Number(String(game.date).slice(0,4))||1888,to:'Present',apps:0,goals:0};p.clubHistory.push(current);}current.clubId=club.id;current.club=club.name;p.clubId=club.id;
    }));
  }
  function moveProbability(game,club,p,year){
    const era=eraProfile(year),profile=p.personalityProfile||{},loyalty=Number(profile.loyalty??55),ambition=Number(profile.ambition??55),apps=Number(arr(p.seasonHistory).at(-1)?.apps)||0,contract=yearsLeft(game,p),spells=arr(p.clubHistory),prior=Math.max(1,spells.length);
    if(prior>=era.maxSpells)return 0;
    const current=[...spells].reverse().find(x=>x.to==='Present')||spells.at(-1),tenure=Math.max(0,year-(Number(current?.from)||year));
    let factor=statusFactor(p)*ageFactor(Number(p.age)||24)*(1+(ambition-50)*.006-(loyalty-50)*.007)*Math.pow(era.repeat,Math.max(0,prior-1));
    if(tenure<era.minTenure)factor*=year<1963?.16:.42;else if(tenure===era.minTenure)factor*=.72;
    if(apps<8)factor*=1.28;else if(apps>30)factor*=.88;
    if(contract<=0)factor*=year<1963?1.18:1.72;else if(contract<=1)factor*=year<1963?1.08:1.30;else if(contract>=4)factor*=.82;
    if(p.legendArchetype)factor*=.42;
    return clamp(era.rate*factor,0,.42);
  }
  function chooseDestination(game,from,p,year,r){
    const sourceTier=Number(from.tier)||5,ability=Number(p.ability)||45,protectedClubId=game.meta?.headless?null:game.controlledClubId,candidates=arr(game.clubs).filter(c=>c.id!==from.id&&c.id!==protectedClubId&&c.leagueActive!==false&&arr(c.players).length<29);
    if(!candidates.length)return null;
    const scored=candidates.map(c=>{
      const tier=Number(c.tier)||5,expected=88-(tier-1)*7.5,fit=-Math.abs(ability-expected)*1.3,stepPenalty=Math.abs(tier-sourceTier)>1?-22*Math.abs(tier-sourceTier):0,upward=(tier<sourceTier&&ability>=expected-7)?8:0,regional=regionalScore(from,c,year),need=needScore(c,p),reputation=(Number(c.reputation||c.prestige||c.stature||50)-50)*.12,noise=(r()-.5)*14;
      return {c,score:fit+stepPenalty+upward+regional+need+reputation+noise};
    }).sort((a,b)=>b.score-a.score);
    const pool=scored.slice(0,Math.min(6,scored.length)),weights=pool.map((x,i)=>Math.max(1,20-i*3+x.score-pool.at(-1).score)),total=weights.reduce((a,b)=>a+b,0);let roll=r()*total;for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i].c;}return pool[0]?.c||null;
  }
  function closeSpell(p,from,year){
    p.clubHistory=arr(p.clubHistory);let spell=[...p.clubHistory].reverse().find(x=>x.to==='Present');if(!spell)return;
    spell.to=year-1;spell.clubId=spell.clubId||from.id;spell.club=spell.club||from.name;
    const rows=arr(p.seasonHistory).filter(x=>(x.clubId&&x.clubId===from.id)||(!x.clubId&&x.club===from.name));spell.apps=rows.reduce((n,x)=>n+(Number(x.apps)||0),0);spell.goals=rows.reduce((n,x)=>n+(Number(x.goals)||0),0);
  }
  function recordMove(game,p,from,to,year){
    closeSpell(p,from,year);p.clubHistory.push({clubId:to.id,club:to.name,from:year,to:'Present',apps:0,goals:0});p.clubId=to.id;p.lastClubId=from.id;p.lastClubName=from.name;
    const role=needScore(to,p)>7?'First Team':Number(p.ability)>Number(to.powerRating||to.clubRating||50)+4?'Key Player':'Rotation';p.squadStatus=role;p.contractStart=`${year}-07-01`;p.contractEnd=`${year+Math.max(1,Math.min(5,1+Math.floor((hash(`${p.id}-${year}-contract`)%5))))}-06-30`;p.contractStatus='Secure';
    if(window.FLEconomy)p.wage=Math.max(1,Math.round(FLEconomy.recommendedWage(game,p,to,role)));const fee=window.FLTransferMarket?Math.max(0,Math.round(FLTransferMarket.value(game,p,from))):Math.max(0,Math.round((Number(p.ability)||40)*10));
    const row={id:`historical-transfer-${year}-${p.id}-${to.id}`,date:`${year}-07-01`,season:seasonLabel(year),player:p.name,playerId:p.id,from:from.name,fromId:from.id,to:to.name,toId:to.id,fee,type:'permanent',historicalSimulation:true};
    game.transferMarket=game.transferMarket||{};game.transferMarket.completed=arr(game.transferMarket.completed);game.transferMarket.completed.unshift(row);game.worldUI=game.worldUI||{};game.worldUI.transferHistory=arr(game.worldUI.transferHistory);game.worldUI.transferHistory.unshift(row);if(game.worldUI.transferHistory.length>1500)game.worldUI.transferHistory=game.worldUI.transferHistory.slice(0,1500);
    game.history=arr(game.history);game.history.push({id:row.id,date:row.date,type:'transfer',title:`${p.name} joins ${to.name}`,text:`${p.name} moves from ${from.name} to ${to.name}.`,playerId:p.id,clubId:to.id});
    if(Number(p.ability)>=Number(to.powerRating||to.clubRating||50)+7||to.id===game.controlledClubId){game.news=arr(game.news);game.news.unshift({id:`news-${row.id}`,date:row.date,headline:`${p.name} completes move to ${to.name}`,body:`${to.name} sign ${p.name} from ${from.name}.`,category:'transfer'});}
    return row;
  }
  function annualUpdate(game,year){
    normaliseHistory(game);const r=seeded(`${game.meta?.seed||1}-${year}-historical-player-mobility`),protectedClubId=game.meta?.headless?null:game.controlledClubId,sources=arr(game.clubs).filter(c=>c.id!==protectedClubId&&c.leagueActive!==false),moves=[];
    const candidates=[];for(const club of sources){if(arr(club.players).length<=17)continue;for(const p of arr(club.players)){if(p.status==='retired'||p.status==='deceased'||p.developmentPathway?.loan)continue;if(r()<moveProbability(game,club,p,year))candidates.push({club,p,key:r()});}}
    candidates.sort((a,b)=>a.key-b.key);
    for(const item of candidates){const from=item.club,p=item.p;if(!arr(from.players).some(x=>x.id===p.id)||arr(from.players).length<=17)continue;const to=chooseDestination(game,from,p,year,r);if(!to)continue;from.players=from.players.filter(x=>x.id!==p.id);to.players=arr(to.players);to.players.push(p);moves.push(recordMove(game,p,from,to,year));}
    game.meta=game.meta||{};game.meta.playerMobilityVersion='0.27.5.1-era-mobility';game.meta.lastPlayerMobility={year,moves:moves.length,baseRate:eraRate(year)};return moves;
  }
  return {annualUpdate,normaliseHistory,eraRate,eraProfile,version:'0.27.5.1-era-mobility'};
})();
