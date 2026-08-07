/* Football Legacy v0.26.5 — international visibility and performance hotfix only. */
(() => {
  'use strict';

  const VERSION = '0.26.5';
  const COVERAGE_VERSION = 2;
  const runtimeCache = new WeakMap();
  let cachedNationTemplates = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const yearOf = game => Math.max(1872, Number(String(game?.date || '1888').slice(0, 4)) || 1888);
  const hash = text => { let h=2166136261; for(const char of String(text)){ h^=char.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; };
  const seeded = seed => { let state=seed>>>0; return () => { state=(Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; }; };
  const save = game => window.FLSave?.saveSoon ? window.FLSave.saveSoon(game, 0) : window.FLSave?.save?.(game);

  const CONFEDERATIONS = {
    UEFA:{id:'UEFA',name:'Europe'},
    CONMEBOL:{id:'CONMEBOL',name:'South America'},
    CONCACAF:{id:'CONCACAF',name:'North and Central America'},
    CAF:{id:'CAF',name:'Africa'},
    AFC:{id:'AFC',name:'Asia'},
    OFC:{id:'OFC',name:'Oceania'}
  };

  const BASE_CONFEDERATION = {
    england:'UEFA',scotland:'UEFA',wales:'UEFA',ireland:'UEFA','northern-ireland':'UEFA',france:'UEFA',belgium:'UEFA',netherlands:'UEFA',germany:'UEFA',italy:'UEFA',spain:'UEFA',portugal:'UEFA',hungary:'UEFA',austria:'UEFA',switzerland:'UEFA',denmark:'UEFA',sweden:'UEFA',croatia:'UEFA',norway:'UEFA',poland:'UEFA',czechia:'UEFA',slovakia:'UEFA',romania:'UEFA',bulgaria:'UEFA',greece:'UEFA',turkey:'UEFA',serbia:'UEFA',ukraine:'UEFA',russia:'UEFA',iceland:'UEFA',finland:'UEFA',slovenia:'UEFA',bosnia:'UEFA',
    brazil:'CONMEBOL',argentina:'CONMEBOL',uruguay:'CONMEBOL',colombia:'CONMEBOL',chile:'CONMEBOL',peru:'CONMEBOL',paraguay:'CONMEBOL',ecuador:'CONMEBOL',bolivia:'CONMEBOL',venezuela:'CONMEBOL',
    usa:'CONCACAF',mexico:'CONCACAF',canada:'CONCACAF','costa-rica':'CONCACAF',jamaica:'CONCACAF',panama:'CONCACAF',
    japan:'AFC','south-korea':'AFC',iran:'AFC','saudi-arabia':'AFC',china:'AFC',qatar:'AFC',
    nigeria:'CAF',cameroon:'CAF',ghana:'CAF',senegal:'CAF',morocco:'CAF',algeria:'CAF',egypt:'CAF',tunisia:'CAF','ivory-coast':'CAF','south-africa':'CAF',
    australia:'OFC','new-zealand':'OFC'
  };

  const ADDITIONAL_NATIONS = [
    {id:'republic-of-ireland',name:'Republic of Ireland',nationality:'Irish',from:1924,strength:70,confederation:'UEFA'},
    {id:'northern-macedonia',name:'North Macedonia',nationality:'Macedonian',from:1993,strength:65,confederation:'UEFA'},
    {id:'albania',name:'Albania',nationality:'Albanian',from:1946,strength:65,confederation:'UEFA'},
    {id:'georgia',name:'Georgia',nationality:'Georgian',from:1992,strength:67,confederation:'UEFA'},
    {id:'israel',name:'Israel',nationality:'Israeli',from:1948,strength:68,confederation:'UEFA'},
    {id:'honduras',name:'Honduras',nationality:'Honduran',from:1921,strength:69,confederation:'CONCACAF'},
    {id:'el-salvador',name:'El Salvador',nationality:'Salvadoran',from:1921,strength:65,confederation:'CONCACAF'},
    {id:'guatemala',name:'Guatemala',nationality:'Guatemalan',from:1921,strength:65,confederation:'CONCACAF'},
    {id:'trinidad-and-tobago',name:'Trinidad and Tobago',nationality:'Trinidadian',from:1947,strength:66,confederation:'CONCACAF'},
    {id:'haiti',name:'Haiti',nationality:'Haitian',from:1934,strength:64,confederation:'CONCACAF'},
    {id:'iraq',name:'Iraq',nationality:'Iraqi',from:1957,strength:69,confederation:'AFC'},
    {id:'united-arab-emirates',name:'United Arab Emirates',nationality:'Emirati',from:1972,strength:68,confederation:'AFC'},
    {id:'uzbekistan',name:'Uzbekistan',nationality:'Uzbek',from:1992,strength:70,confederation:'AFC'},
    {id:'north-korea',name:'North Korea',nationality:'North Korean',from:1958,strength:65,confederation:'AFC'},
    {id:'indonesia',name:'Indonesia',nationality:'Indonesian',from:1934,strength:62,confederation:'AFC'},
    {id:'dr-congo',name:'DR Congo',nationality:'Congolese',from:1963,strength:72,confederation:'CAF'},
    {id:'zambia',name:'Zambia',nationality:'Zambian',from:1964,strength:70,confederation:'CAF'},
    {id:'mali',name:'Mali',nationality:'Malian',from:1960,strength:71,confederation:'CAF'},
    {id:'burkina-faso',name:'Burkina Faso',nationality:'Burkinabé',from:1960,strength:69,confederation:'CAF'},
    {id:'angola',name:'Angola',nationality:'Angolan',from:1976,strength:68,confederation:'CAF'},
    {id:'fiji',name:'Fiji',nationality:'Fijian',from:1951,strength:59,confederation:'OFC'},
    {id:'solomon-islands',name:'Solomon Islands',nationality:'Solomon Islander',from:1978,strength:57,confederation:'OFC'},
    {id:'tahiti',name:'Tahiti',nationality:'Tahitian',from:1952,strength:58,confederation:'OFC'},
    {id:'new-caledonia',name:'New Caledonia',nationality:'New Caledonian',from:1951,strength:58,confederation:'OFC'},
    {id:'papua-new-guinea',name:'Papua New Guinea',nationality:'Papua New Guinean',from:1963,strength:56,confederation:'OFC'}
  ];

  const COPA_YEARS = new Set([1916,1917,1919,1920,1921,1922,1923,1924,1925,1926,1927,1929,1935,1937,1939,1941,1942,1945,1946,1947,1949,1953,1955,1956,1957,1959,1963,1967,1975,1979,1983,1987,1989,1991,1993,1995,1997,1999,2001,2004,2007,2011,2015,2016,2019,2021,2024]);
  const AFCON_YEARS = new Set([1957,1959,1962,1963,1965,1968,1970,1972,1974,1976,1978,1980,1982,1984,1986,1988,1990,1992,1994,1996,1998,2000,2002,2004,2006,2008,2010,2012,2013,2015,2017,2019,2021,2023,2025]);
  const ASIAN_CUP_YEARS = new Set([1956,1960,1964,1968,1972,1976,1980,1984,1988,1992,1996,2000,2004,2007,2011,2015,2019,2023]);
  const GOLD_CUP_YEARS = new Set([1963,1965,1967,1969,1971,1973,1977,1981,1985,1989,1991,1993,1996,1998,2000,2002,2003,2005,2007,2009,2011,2013,2015,2017,2019,2021,2023,2025]);
  const OFC_YEARS = new Set([1973,1980,1996,1998,2000,2002,2004,2008,2012,2016,2024]);

  const COMPETITIONS = [
    {id:'world-cup',key:'worldCups',name:'World Cup',short:'WORLD CUP',confederation:'WORLD',start:1930,existing:true,description:'The leading global national-team tournament.'},
    {id:'european-championship',key:'euros',name:'European Championship',short:'EUROPE',confederation:'UEFA',start:1960,existing:true,description:'Europe’s continental championship.'},
    {id:'copa-america',key:'copaAmerica',name:'Copa América',short:'SOUTH AMERICA',confederation:'CONMEBOL',start:1916,description:'The South American championship.',isEdition:year=>COPA_YEARS.has(year)||(year>=2028&&(year-2028)%4===0)},
    {id:'africa-cup-of-nations',key:'africaCup',name:'Africa Cup of Nations',short:'AFRICA',confederation:'CAF',start:1957,description:'Africa’s continental championship.',isEdition:year=>AFCON_YEARS.has(year)||(year>=2027&&(year-2027)%2===0)},
    {id:'asian-cup',key:'asianCup',name:'Asian Cup',short:'ASIA',confederation:'AFC',start:1956,description:'Asia’s continental championship.',isEdition:year=>ASIAN_CUP_YEARS.has(year)||(year>=2027&&(year-2027)%4===0)},
    {id:'gold-cup',key:'goldCup',name:'CONCACAF Championship / Gold Cup',short:'CONCACAF',confederation:'CONCACAF',start:1963,description:'The championship of North America, Central America and the Caribbean.',isEdition:year=>GOLD_CUP_YEARS.has(year)||(year>=2027&&(year-2027)%2===0)},
    {id:'ofc-nations-cup',key:'ofcCup',name:'OFC Nations Cup',short:'OCEANIA',confederation:'OFC',start:1973,description:'Oceania’s continental championship.',isEdition:year=>OFC_YEARS.has(year)||(year>=2028&&(year-2028)%4===0)}
  ];

  function confederationFor(nation, year){
    if(nation.id==='australia')return year>=2006?'AFC':'OFC';
    return nation.confederation||BASE_CONFEDERATION[nation.id]||'UEFA';
  }

  function nationTemplates(){
    if(cachedNationTemplates)return cachedNationTemplates;
    const base=(window.FLLivingWorldData?.nations||[]).map(n=>({...n,confederation:BASE_CONFEDERATION[n.id]||'UEFA'}));
    const seen=new Set(base.map(n=>n.id));
    ADDITIONAL_NATIONS.forEach(n=>{if(!seen.has(n.id))base.push({...n});});
    cachedNationTemplates=base;
    return cachedNationTemplates;
  }

  function ensure(game){
    if(!game||typeof game!=='object')return null;
    if((!game.livingWorld||!game.livingWorld.international)&&window.FLLivingWorld?.ensure)window.FLLivingWorld.ensure(game);
    game.livingWorld=game.livingWorld&&typeof game.livingWorld==='object'?game.livingWorld:{};
    const international=game.livingWorld.international||(game.livingWorld.international={nations:{},homeChampionship:[],worldCups:[],euros:[],rankings:[],lastSimulatedYear:1887});
    international.nations=international.nations&&typeof international.nations==='object'?international.nations:{};
    international.worldCups=Array.isArray(international.worldCups)?international.worldCups:[];
    international.euros=Array.isArray(international.euros)?international.euros:[];
    international.homeChampionship=Array.isArray(international.homeChampionship)?international.homeChampionship:[];
    international.rankings=Array.isArray(international.rankings)?international.rankings:[];
    international.continentalCups=international.continentalCups&&typeof international.continentalCups==='object'?international.continentalCups:{};
    for(const definition of COMPETITIONS.filter(c=>!c.existing))international.continentalCups[definition.key]=Array.isArray(international.continentalCups[definition.key])?international.continentalCups[definition.key]:[];
    international.expanded=international.expanded&&typeof international.expanded==='object'?international.expanded:{};
    const expanded=international.expanded;
    expanded.version=VERSION;
    expanded.lastSimulatedYear=Number.isFinite(Number(expanded.lastSimulatedYear))?Number(expanded.lastSimulatedYear):1887;
    expanded.ui=expanded.ui&&typeof expanded.ui==='object'?expanded.ui:{view:'overview',selectedCountry:null,countryQuery:''};
    expanded.ui.view=expanded.ui.view||'overview';
    expanded.records=expanded.records&&typeof expanded.records==='object'?expanded.records:{};
    expanded.matchLedger=Array.isArray(expanded.matchLedger)?expanded.matchLedger:[];
    expanded.coverageVersion=Number(expanded.coverageVersion||0);
    for(const template of nationTemplates()){
      const state=international.nations[template.id]||(international.nations[template.id]={...template,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,trophies:[]});
      state.id=state.id||template.id;state.name=state.name||template.name;state.nationality=state.nationality||template.nationality;state.from=Number(state.from||template.from||1872);state.strength=Number(state.strength||template.strength||60);state.confederation=state.confederation||template.confederation||BASE_CONFEDERATION[state.id]||'UEFA';state.trophies=Array.isArray(state.trophies)?state.trophies:[];
      ['played','won','drawn','lost','gf','ga'].forEach(key=>{state[key]=Number(state[key]||0);});
    }
    return international;
  }

  function activeNations(game, year, confederation=null){
    const international=ensure(game);
    return nationTemplates().filter(n=>Number(n.from||1872)<=year&&(!n.to||year<=Number(n.to))).map(template=>international.nations[template.id]).filter(Boolean).filter(n=>!confederation||confederationFor(n,year)===confederation);
  }

  function historicalRating(game, nation, year, salt='rating'){
    const r=seeded(hash(`${game.meta?.seed||1}-${nation.id}-${year}-${salt}`));
    let base=Number(nation.strength||65);
    if(year<1930&&['usa','japan','china','south-korea','australia'].includes(nation.id))base-=8;
    if(year<1950&&['brazil','argentina','uruguay'].includes(nation.id))base+=2;
    if(year>=1950&&year<=1974&&['hungary','brazil','germany','italy','uruguay'].includes(nation.id))base+=3;
    if(year>=1980&&year<=2006&&['france','germany','italy','brazil','argentina','netherlands'].includes(nation.id))base+=2;
    return clamp(base+(r()-.5)*12,45,96);
  }

  function competitionList(international, definition){
    return definition.existing ? international[definition.key] : international.continentalCups[definition.key];
  }

  function tournamentSize(definition, year, available){
    if(definition.id==='world-cup')return Math.min(available,year===1930?13:year===1938?15:year===1950?13:year>=2026?48:year>=1998?32:year>=1982?24:16);
    if(definition.id==='european-championship')return Math.min(available,year>=2016?24:year>=1996?16:year>=1980?8:4);
    if(definition.id==='copa-america')return Math.min(available,year<1975?8:year<1993?10:12);
    if(definition.id==='africa-cup-of-nations')return Math.min(available,year<1968?4:year<1992?8:year<1998?12:year<2019?16:24);
    if(definition.id==='asian-cup')return Math.min(available,year<1972?4:year<2004?8:year<2019?16:24);
    if(definition.id==='gold-cup')return Math.min(available,year<1991?6:year<2000?9:year<2019?12:16);
    if(definition.id==='ofc-nations-cup')return Math.min(available,year<1996?6:8);
    return Math.min(available,16);
  }

  function stageName(teamCount){
    if(teamCount<=2)return 'Final';
    if(teamCount<=4)return 'Semi-final';
    if(teamCount<=8)return 'Quarter-final';
    if(teamCount<=16)return 'Round of 16';
    return 'Opening round';
  }

  function playMatch(game, a, b, definition, year, roundSize, index){
    const random=seeded(hash(`${game.meta?.seed||1}-${definition.id}-${year}-${roundSize}-${index}-${a.id}-${b.id}`));
    const aRating=historicalRating(game,a,year,definition.id),bRating=historicalRating(game,b,year,definition.id);
    const goals=rating=>{let count=0;for(let i=0;i<5;i++)if(random()<clamp(.17+(rating-60)*.006,.08,.48))count++;return count;};
    let aGoals=goals(aRating+0.5),bGoals=goals(bRating);
    const regulationDraw=aGoals===bGoals;
    let decidedBy=null;
    if(regulationDraw){decidedBy=year<1970?'replay':'penalties';if(random()<aRating/(aRating+bRating))aGoals++;else bGoals++;}
    return {competitionId:definition.id,competition:definition.name,year,stage:stageName(roundSize),a:a.id,b:b.id,aName:a.name,bName:b.name,aGoals,bGoals,regulationDraw,decidedBy,aRating:Math.round(aRating*10)/10,bRating:Math.round(bRating*10)/10};
  }

  function awardMatch(a,b,match){
    a.played++;b.played++;a.gf+=match.aGoals;a.ga+=match.bGoals;b.gf+=match.bGoals;b.ga+=match.aGoals;
    if(match.aGoals>match.bGoals){a.won++;b.lost++;}else if(match.aGoals<match.bGoals){b.won++;a.lost++;}else{a.drawn++;b.drawn++;}
  }

  function addTrophy(nation, name, year, competitionId){
    nation.trophies=Array.isArray(nation.trophies)?nation.trophies:[];
    if(!nation.trophies.some(t=>Number(t.year)===Number(year)&&(t.competitionId===competitionId||t.name===name)))nation.trophies.push({name,year,competitionId});
  }

  function isEditionYear(definition,year){
    if(definition.id==='world-cup')return year>=1930&&(year-1930)%4===0&&year!==1942&&year!==1946;
    if(definition.id==='european-championship')return year>=1960&&(year-1960)%4===0;
    return Boolean(definition.isEdition?.(year));
  }

  function simulateEdition(game, definition, year){
    if(year<definition.start||!isEditionYear(definition,year))return null;
    const international=ensure(game),list=competitionList(international,definition);
    if(list.some(row=>Number(row.year)===year))return null;
    const available=activeNations(game,year,definition.confederation==='WORLD'?null:definition.confederation);
    const size=tournamentSize(definition,year,available.length);
    if(size<2)return null;
    const random=seeded(hash(`${game.meta?.seed||1}-${definition.id}-${year}-selection`));
    let teams=[...available].map(n=>({nation:n,score:historicalRating(game,n,year,'qualification')+(random()-.5)*14})).sort((a,b)=>b.score-a.score).slice(0,size).map(x=>x.nation);
    const participants=teams.map(n=>n.name),matches=[];
    while(teams.length>1){
      const next=[];
      for(let index=0;index<teams.length;index+=2){
        const a=teams[index],b=teams[index+1];
        if(!b){next.push(a);continue;}
        const match=playMatch(game,a,b,definition,year,teams.length,index/2);matches.push(match);awardMatch(a,b,match);next.push(match.aGoals>match.bGoals?a:b);
      }
      teams=next;
    }
    const champion=teams[0],final=matches[matches.length-1]||null;
    addTrophy(champion,definition.name,year,definition.id);
    const row={year,name:definition.name,competitionId:definition.id,confederation:definition.confederation,champion:champion.name,championId:champion.id,participants,formatSize:participants.length,matches,final};
    list.push(row);list.sort((a,b)=>Number(a.year)-Number(b.year));
    international.expanded.matchLedger.push(...matches);
    return row;
  }

  function simulateThrough(game, endingYear=yearOf(game)-1){
    const international=ensure(game),expanded=international.expanded,target=Math.max(1887,Number(endingYear)||1887);
    const needsCoverage=expanded.coverageVersion<COVERAGE_VERSION;
    if(!needsCoverage&&target<=expanded.lastSimulatedYear)return false;
    const firstYear=needsCoverage?1888:expanded.lastSimulatedYear+1;
    let changed=false;
    for(let year=firstYear;year<=target;year++){
      for(const definition of COMPETITIONS)if(simulateEdition(game,definition,year))changed=true;
    }
    expanded.lastSimulatedYear=Math.max(expanded.lastSimulatedYear,target);
    expanded.coverageVersion=COVERAGE_VERSION;
    if(changed){runtimeCache.delete(game);rebuildRecords(game,true);}
    return changed;
  }

  function dataSignature(international){
    return [international.homeChampionship?.length||0,...COMPETITIONS.map(definition=>(competitionList(international,definition)||[]).length)].join(':');
  }

  function compiledData(game){
    const international=ensure(game),signature=dataSignature(international),cached=runtimeCache.get(game);
    if(cached?.signature===signature&&cached.rows&&cached.matches)return cached;
    const rows=[];
    for(const definition of COMPETITIONS){
      for(const edition of competitionList(international,definition)||[])rows.push({...edition,definition});
    }
    for(const edition of international.homeChampionship||[])rows.push({...edition,competitionId:'home-championship',name:'Home Championship',definition:{id:'home-championship',name:'Home Championship',confederation:'UEFA'}});
    rows.sort((a,b)=>Number(a.year)-Number(b.year));
    const matches=[];
    for(const edition of rows)for(const match of edition.matches||[])matches.push({...match,competitionId:match.competitionId||edition.competitionId||edition.definition?.id,competition:match.competition||edition.name||edition.definition?.name,year:Number(match.year||edition.year)});
    const next={signature,rows,matches,records:null};runtimeCache.set(game,next);return next;
  }

  function allTournamentRows(game){return compiledData(game).rows;}
  function allMatches(game){return compiledData(game).matches;}

  function rebuildRecords(game,force=false){
    const international=ensure(game),compiled=compiledData(game);
    if(!force&&compiled.records)return compiled.records;
    const nations=Object.values(international.nations),rows=compiled.rows,matches=compiled.matches;
    const appearances={};
    rows.forEach(row=>{
      const participantIds=(row.participants||[]).map(name=>nations.find(n=>n.name===name)?.id).filter(Boolean);
      if(row.championId&&!participantIds.includes(row.championId))participantIds.push(row.championId);
      participantIds.forEach(id=>{appearances[id]=(appearances[id]||0)+1;});
    });
    const biggest=[...matches].sort((a,b)=>Math.abs((b.aGoals||0)-(b.bGoals||0))-Math.abs((a.aGoals||0)-(a.bGoals||0))||((b.aGoals||0)+(b.bGoals||0))-((a.aGoals||0)+(a.bGoals||0)))[0]||null;
    const mostGoals=[...matches].sort((a,b)=>((b.aGoals||0)+(b.bGoals||0))-((a.aGoals||0)+(a.bGoals||0)))[0]||null;
    international.expanded.records={appearances,biggestWin:biggest,highestScoring:mostGoals,updatedYear:yearOf(game)};
    compiled.records=international.expanded.records;
    return international.expanded.records;
  }

  function rankingRows(game){
    const international=ensure(game),currentYear=yearOf(game),baseById=new Map((international.rankings||[]).map(row=>[row.id,row]));
    return activeNations(game,currentYear).map(nation=>{
      const base=baseById.get(nation.id),rating=base?.rating??Math.round(historicalRating(game,nation,currentYear,'ranking')*10)/10;
      return {id:nation.id,name:nation.name,confederation:confederationFor(nation,currentYear),rating,played:Number(nation.played||0),won:Number(nation.won||0),drawn:Number(nation.drawn||0),lost:Number(nation.lost||0),gf:Number(nation.gf||0),ga:Number(nation.ga||0),trophies:(nation.trophies||[]).length};
    }).sort((a,b)=>b.rating-a.rating||b.won-a.won||b.gf-a.gf);
  }

  function editionsFor(game, definition){return [...(competitionList(ensure(game),definition)||[])].sort((a,b)=>Number(b.year)-Number(a.year));}
  function holder(game, definition){return editionsFor(game,definition)[0]||null;}
  function finalText(edition){
    const final=edition?.final||(edition?.matches||[]).at?.(-1)||(edition?.matches||[])[(edition?.matches||[]).length-1];
    if(!final)return 'Final score not recorded';
    return `${final.aName||final.a} ${final.aGoals}–${final.bGoals} ${final.bName||final.b}${final.decidedBy?` · ${final.decidedBy}`:''}`;
  }

  function countrySummary(game, countryId){
    const international=ensure(game),country=international.nations[countryId];if(!country)return null;
    const currentYear=yearOf(game),ranking=rankingRows(game),rank=ranking.findIndex(row=>row.id===countryId)+1,rows=allTournamentRows(game),matches=allMatches(game).filter(m=>m.a===countryId||m.b===countryId);
    const appearances=rows.filter(row=>(row.participants||[]).includes(country.name)||row.championId===countryId);
    const honours=(country.trophies||[]).slice().sort((a,b)=>Number(b.year)-Number(a.year));
    const biggestWin=matches.filter(m=>(m.a===countryId&&m.aGoals>m.bGoals)||(m.b===countryId&&m.bGoals>m.aGoals)).sort((a,b)=>{
      const margin=x=>x.a===countryId?x.aGoals-x.bGoals:x.bGoals-x.aGoals;return margin(b)-margin(a);
    })[0]||null;
    const winPct=country.played?Math.round(country.won/country.played*1000)/10:0;
    return {country,rank,confederation:confederationFor(country,currentYear),played:Number(country.played||0),won:Number(country.won||0),drawn:Number(country.drawn||0),lost:Number(country.lost||0),gf:Number(country.gf||0),ga:Number(country.ga||0),winPct,honours,appearances,matches:matches.slice(-20).reverse(),biggestWin};
  }

  function countryButton(row,rank){
    return `<button class="intl-country-row" data-intl-country="${esc(row.id)}"><em>${rank}</em><span><b>${esc(row.name)}</b><small>${esc(CONFEDERATIONS[row.confederation]?.name||row.confederation)} · ${row.played} matches · ${row.trophies} trophies</small></span><strong>${row.rating}</strong></button>`;
  }

  function competitionCard(game, definition){
    const latest=holder(game,definition),editions=editionsFor(game,definition);
    return `<article class="intl-competition-card"><span>${esc(definition.short)}</span><strong>${esc(definition.name)}</strong>${latest?`<b>${esc(latest.champion)}</b><small>${latest.year} holders · ${latest.formatSize||latest.participants?.length||'—'} teams</small>`:`<b>Begins ${definition.start}</b><small>No edition has been played in this save yet.</small>`}<p>${esc(definition.description)}</p><button data-intl-competition="${esc(definition.id)}">VIEW ${editions.length} EDITIONS</button></article>`;
  }

  function nav(view){
    const item=(id,label)=>`<button class="${view===id?'active':''}" data-intl-view="${id}">${label}</button>`;
    return `<nav class="intl-section-nav">${item('overview','OVERVIEW')}${item('world-cup','WORLD CUP')}${item('continental','CONTINENTAL CUPS')}${item('countries','COUNTRIES')}${item('records','STATS & RECORDS')}</nav>`;
  }

  function overviewView(game){
    const rankings=rankingRows(game),world=COMPETITIONS.find(c=>c.id==='world-cup'),continentals=COMPETITIONS.filter(c=>c.id!=='world-cup');
    return `<div class="intl-overview-grid"><section class="panel"><div class="panel-head">WORLD RANKINGS <span>${rankings.length} COUNTRIES</span></div><div class="intl-ranking-list">${rankings.slice(0,20).map((row,index)=>countryButton(row,index+1)).join('')||'<p class="empty-note">Rankings will form as international matches are played.</p>'}</div></section><section class="panel"><div class="panel-head">WORLD CUP</div>${competitionCard(game,world)}</section></div><section class="panel intl-continental-panel"><div class="panel-head">CONTINENTAL CHAMPIONSHIPS <span>${continentals.length} COMPETITIONS</span></div><div class="intl-competition-grid">${continentals.map(definition=>competitionCard(game,definition)).join('')}</div></section>`;
  }

  function editionsTable(game,definition,limit=100){
    const rows=editionsFor(game,definition).slice(0,limit);
    return rows.length?`<div class="intl-edition-list">${rows.map(row=>`<article><time>${row.year}</time><div><strong>${esc(row.champion||'Winner not recorded')}</strong><p>${esc(finalText(row))}</p></div><span>${row.formatSize||row.participants?.length||'—'} teams</span></article>`).join('')}</div>`:`<div class="empty-profile-state"><strong>No editions yet</strong><span>${esc(definition.name)} begins in ${definition.start} and will populate as the save advances.</span></div>`;
  }

  function worldCupView(game){
    const definition=COMPETITIONS.find(c=>c.id==='world-cup'),latest=holder(game,definition),rows=editionsFor(game,definition);
    return `<section class="panel"><div class="panel-head">WORLD CUP HISTORY <span>${rows.length} EDITIONS</span></div>${latest?`<div class="intl-holder-banner"><span>CURRENT HOLDERS · ${latest.year}</span><strong>${esc(latest.champion)}</strong><p>${esc(finalText(latest))}</p></div>`:''}${editionsTable(game,definition)}</section>`;
  }

  function continentalView(game,selectedId=null){
    const definitions=COMPETITIONS.filter(c=>c.id!=='world-cup'),selected=definitions.find(c=>c.id===selectedId);
    if(selected)return `<button class="intl-back-button" data-intl-view="continental">← ALL CONTINENTAL CUPS</button><section class="panel"><div class="panel-head">${esc(selected.name.toUpperCase())} <span>${editionsFor(game,selected).length} EDITIONS</span></div>${editionsTable(game,selected)}</section>`;
    return `<div class="intl-competition-grid intl-full-grid">${definitions.map(definition=>competitionCard(game,definition)).join('')}</div>`;
  }

  function countriesView(game){
    const rankings=rankingRows(game),confeds=Object.values(CONFEDERATIONS);
    return `<section class="panel"><div class="panel-head">COUNTRIES <span>${rankings.length} ACTIVE IN ${yearOf(game)}</span></div><div class="intl-confederation-summary">${confeds.map(conf=>{const count=rankings.filter(r=>r.confederation===conf.id).length;return `<span><b>${count}</b>${esc(conf.name)}</span>`;}).join('')}</div><div class="intl-country-grid">${rankings.map((row,index)=>countryButton(row,index+1)).join('')}</div></section>`;
  }

  function matchText(match,countryId){
    if(!match)return 'No result recorded';
    const home=match.a===countryId;const opponent=home?(match.bName||match.b):(match.aName||match.a);const forGoals=home?match.aGoals:match.bGoals,against=home?match.bGoals:match.aGoals;const result=forGoals>against?'W':forGoals<against?'L':'D';
    return `${result} ${forGoals}–${against} v ${opponent}`;
  }

  function countryView(game,countryId){
    const summary=countrySummary(game,countryId);if(!summary)return countriesView(game);
    const c=summary.country;
    return `<button class="intl-back-button" data-intl-view="countries">← ALL COUNTRIES</button><section class="panel intl-country-profile"><div class="intl-country-hero"><div><span>${esc(CONFEDERATIONS[summary.confederation]?.name||summary.confederation)}</span><h2>${esc(c.name)}</h2><p>Active since ${c.from||'—'} · Current world ranking ${summary.rank?`#${summary.rank}`:'unranked'}</p></div><strong>${summary.rank?`#${summary.rank}`:'—'}</strong></div><div class="intl-stat-grid"><article><span>MATCHES</span><strong>${summary.played}</strong></article><article><span>WINS</span><strong>${summary.won}</strong></article><article><span>DRAWS</span><strong>${summary.drawn}</strong></article><article><span>LOSSES</span><strong>${summary.lost}</strong></article><article><span>GOALS</span><strong>${summary.gf}</strong></article><article><span>WIN RATE</span><strong>${summary.winPct}%</strong></article></div></section><div class="intl-country-columns"><section class="panel"><div class="panel-head">HONOURS <span>${summary.honours.length}</span></div>${summary.honours.length?`<div class="intl-honour-list">${summary.honours.map(h=>`<div><time>${h.year}</time><strong>${esc(h.name)}</strong></div>`).join('')}</div>`:'<p class="empty-note">No international trophies won yet.</p>'}</section><section class="panel"><div class="panel-head">TOURNAMENT APPEARANCES <span>${summary.appearances.length}</span></div>${summary.appearances.length?`<div class="intl-honour-list">${summary.appearances.slice().reverse().slice(0,40).map(row=>`<div><time>${row.year}</time><strong>${esc(row.name||row.definition?.name||'Tournament')}</strong><span>${row.championId===c.id?'Champions':'Qualified'}</span></div>`).join('')}</div>`:'<p class="empty-note">No tournament appearances recorded yet.</p>'}</section></div><section class="panel"><div class="panel-head">RECENT INTERNATIONAL RESULTS</div>${summary.matches.length?`<div class="intl-results-list">${summary.matches.map(m=>`<div><time>${m.year||'—'}</time><strong>${esc(matchText(m,c.id))}</strong><span>${esc(m.competition||'International')}</span></div>`).join('')}</div>`:'<p class="empty-note">No match results recorded yet.</p>'}</section>`;
  }

  function recordsView(game){
    const international=ensure(game),rankings=rankingRows(game),records=rebuildRecords(game),nations=Object.values(international.nations),world=COMPETITIONS.find(c=>c.id==='world-cup');
    const worldTitles=nations.map(n=>({name:n.name,value:(n.trophies||[]).filter(t=>t.competitionId==='world-cup'||t.name==='World Cup').length,id:n.id})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
    const continentalTitles=nations.map(n=>({name:n.name,value:(n.trophies||[]).filter(t=>t.competitionId&&t.competitionId!=='world-cup'&&t.competitionId!=='home-championship').length,id:n.id})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name));
    const wins=[...rankings].sort((a,b)=>b.won-a.won||b.played-a.played),goals=[...rankings].sort((a,b)=>b.gf-a.gf),appearances=Object.entries(records.appearances||{}).map(([id,value])=>({id,name:international.nations[id]?.name||id,value})).sort((a,b)=>b.value-a.value);
    const list=(title,rows,suffix='')=>`<section class="panel"><div class="panel-head">${title}</div><div class="intl-record-list">${rows.slice(0,15).map((row,index)=>`<button data-intl-country="${esc(row.id)}"><em>${index+1}</em><span>${esc(row.name)}</span><strong>${row.value}${suffix}</strong></button>`).join('')||'<p class="empty-note">No record yet.</p>'}</div></section>`;
    const biggest=records.biggestWin,highest=records.highestScoring;
    return `<div class="intl-record-grid">${list('MOST WORLD CUPS',worldTitles,'')}${list('MOST CONTINENTAL TITLES',continentalTitles,'')}${list('MOST INTERNATIONAL WINS',wins.map(r=>({...r,value:r.won})),'')}${list('MOST INTERNATIONAL GOALS',goals.map(r=>({...r,value:r.gf})),'')}${list('MOST TOURNAMENT APPEARANCES',appearances,'')}</div><section class="panel"><div class="panel-head">MATCH RECORDS</div><div class="intl-record-highlight-grid"><article><span>BIGGEST WIN</span><strong>${biggest?`${esc(biggest.aName||biggest.a)} ${biggest.aGoals}–${biggest.bGoals} ${esc(biggest.bName||biggest.b)}`:'No result recorded'}</strong><small>${biggest?`${biggest.year} · ${esc(biggest.competition||'International')}`:''}</small></article><article><span>HIGHEST-SCORING MATCH</span><strong>${highest?`${esc(highest.aName||highest.a)} ${highest.aGoals}–${highest.bGoals} ${esc(highest.bName||highest.b)}`:'No result recorded'}</strong><small>${highest?`${highest.year} · ${esc(highest.competition||'International')}`:''}</small></article><article><span>WORLD CUP EDITIONS</span><strong>${editionsFor(game,world).length}</strong><small>Recorded in this save</small></article></div></section>`;
  }

  function renderPage(game,simulate=false){
    const page=document.querySelector('.international-page');if(!page||!game)return false;
    const international=ensure(game);if(simulate)simulateThrough(game,yearOf(game)-1);
    const ui=international.expanded.ui,view=ui.view||'overview';
    let body='';
    if(view==='world-cup')body=worldCupView(game);
    else if(view==='continental')body=continentalView(game,ui.selectedCompetition||null);
    else if(view==='countries')body=countriesView(game);
    else if(view==='country')body=countryView(game,ui.selectedCountry);
    else if(view==='records')body=recordsView(game);
    else body=overviewView(game);
    page.innerHTML=`<div class="page-title"><h1>INTERNATIONAL FOOTBALL</h1><p>World Cups, continental championships, countries, statistics and records across the full history of the save.</p></div>${nav(view==='country'?'countries':view)}<div class="intl-expanded-content">${body}</div>`;
    page.dataset.internationalExpanded=VERSION;
    return true;
  }

  function setView(game,view){
    const international=ensure(game);international.expanded.ui.view=view;international.expanded.ui.selectedCompetition=null;if(view!=='country')international.expanded.ui.selectedCountry=null;renderPage(game);
  }

  function bindEvents(){
    document.addEventListener('click',event=>{
      const viewButton=event.target.closest('[data-intl-view]');
      if(viewButton){event.preventDefault();const game=window.FLCurrentGame;if(!game)return;setView(game,viewButton.dataset.intlView);return;}
      const countryButtonElement=event.target.closest('[data-intl-country]');
      if(countryButtonElement){event.preventDefault();const game=window.FLCurrentGame;if(!game)return;const international=ensure(game);international.expanded.ui.view='country';international.expanded.ui.selectedCountry=countryButtonElement.dataset.intlCountry;international.expanded.ui.selectedCompetition=null;renderPage(game);return;}
      const competitionButton=event.target.closest('[data-intl-competition]');
      if(competitionButton){event.preventDefault();const game=window.FLCurrentGame;if(!game)return;const international=ensure(game),id=competitionButton.dataset.intlCompetition;if(id==='world-cup'){international.expanded.ui.view='world-cup';international.expanded.ui.selectedCompetition=null;}else{international.expanded.ui.view='continental';international.expanded.ui.selectedCompetition=id;}renderPage(game);}
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .international-page .beta-international-history{display:none!important}.intl-section-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}.intl-section-nav button,.intl-back-button{border:1px solid rgba(255,255,255,.16);background:#102b3a;color:#d9e7ed;padding:10px 14px;font-weight:900;letter-spacing:.03em;cursor:pointer}.intl-section-nav button.active,.intl-section-nav button:hover,.intl-back-button:hover{background:#dd7223;color:#081924}.intl-expanded-content{display:grid;gap:18px}.intl-overview-grid{display:grid;grid-template-columns:minmax(360px,1.1fr) minmax(300px,.9fr);gap:18px}.intl-ranking-list{max-height:720px;overflow:auto}.intl-country-row{width:100%;display:grid;grid-template-columns:42px minmax(0,1fr) 72px;align-items:center;gap:12px;padding:11px 14px;border:0;border-top:1px solid rgba(255,255,255,.08);background:transparent;color:inherit;text-align:left;cursor:pointer}.intl-country-row:hover{background:rgba(221,114,35,.1)}.intl-country-row em{font-style:normal;color:#dd7223;font-weight:900}.intl-country-row span{min-width:0}.intl-country-row b,.intl-country-row small{display:block}.intl-country-row small{color:#9fb3bd;margin-top:3px;white-space:normal}.intl-country-row>strong{text-align:right;font-size:18px}.intl-competition-card{display:flex;flex-direction:column;min-height:210px;padding:18px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(20,55,72,.9),rgba(6,23,34,.94))}.intl-competition-card>span{color:#dd7223;font-size:11px;font-weight:900;letter-spacing:.12em}.intl-competition-card>strong{font-size:20px;margin:7px 0}.intl-competition-card>b{font-size:17px}.intl-competition-card>small{color:#9fb3bd;margin-top:4px}.intl-competition-card>p{color:#c7d6dc;line-height:1.45;flex:1}.intl-competition-card>button{align-self:flex-start;padding:8px 10px;border:1px solid rgba(255,255,255,.18);background:#235b43;color:white;font-weight:900;cursor:pointer}.intl-competition-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:16px}.intl-full-grid{padding:0}.intl-holder-banner{padding:22px;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(90deg,rgba(221,114,35,.18),transparent)}.intl-holder-banner span{display:block;color:#dd7223;font-weight:900;font-size:12px}.intl-holder-banner strong{display:block;font-size:30px;margin:7px 0}.intl-holder-banner p{margin:0;color:#c8d8df}.intl-edition-list article{display:grid;grid-template-columns:78px minmax(0,1fr) 90px;gap:14px;align-items:center;padding:13px 16px;border-top:1px solid rgba(255,255,255,.08)}.intl-edition-list time{color:#dd7223;font-weight:900}.intl-edition-list strong,.intl-edition-list p{display:block;margin:0}.intl-edition-list p{color:#9fb3bd;margin-top:3px}.intl-edition-list>article>span{text-align:right;color:#c8d8df}.intl-confederation-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;padding:14px 16px}.intl-confederation-summary span{padding:10px;background:rgba(0,0,0,.16);text-align:center;color:#aebfc7;font-size:11px}.intl-confederation-summary b{display:block;color:#dd7223;font-size:20px}.intl-country-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.08)}.intl-country-grid .intl-country-row:nth-child(odd){border-right:1px solid rgba(255,255,255,.08)}.intl-country-hero{display:flex;align-items:center;justify-content:space-between;padding:24px}.intl-country-hero span{color:#dd7223;font-weight:900}.intl-country-hero h2{font-size:34px;margin:4px 0}.intl-country-hero p{margin:0;color:#9fb3bd}.intl-country-hero>strong{font-size:42px;color:#dd7223}.intl-stat-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.1)}.intl-stat-grid article{padding:16px;border-right:1px solid rgba(255,255,255,.08)}.intl-stat-grid span,.intl-record-highlight-grid span{display:block;color:#9fb3bd;font-size:11px;font-weight:900}.intl-stat-grid strong{display:block;font-size:24px;margin-top:4px}.intl-country-columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.intl-honour-list>div,.intl-results-list>div{display:grid;grid-template-columns:80px minmax(0,1fr) auto;gap:12px;padding:11px 16px;border-top:1px solid rgba(255,255,255,.08)}.intl-honour-list time,.intl-results-list time{color:#dd7223;font-weight:900}.intl-results-list span,.intl-honour-list span{color:#9fb3bd;text-align:right}.intl-record-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.intl-record-list button{width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;padding:10px 14px;border:0;border-top:1px solid rgba(255,255,255,.08);background:transparent;color:inherit;text-align:left;cursor:pointer}.intl-record-list button:hover{background:rgba(221,114,35,.1)}.intl-record-list em{font-style:normal;color:#dd7223}.intl-record-highlight-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;padding:16px}.intl-record-highlight-grid article{padding:16px;background:rgba(0,0,0,.14);border:1px solid rgba(255,255,255,.09)}.intl-record-highlight-grid strong{display:block;font-size:18px;margin:8px 0}.intl-record-highlight-grid small{color:#9fb3bd}
    @media(max-width:1100px){.intl-competition-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.intl-confederation-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.intl-stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:760px){.intl-overview-grid,.intl-country-columns,.intl-record-grid{grid-template-columns:1fr}.intl-competition-grid,.intl-country-grid,.intl-record-highlight-grid{grid-template-columns:1fr}.intl-country-grid .intl-country-row:nth-child(odd){border-right:0}.intl-confederation-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.intl-edition-list article{grid-template-columns:60px minmax(0,1fr)}.intl-edition-list>article>span{grid-column:2;text-align:left}.intl-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);

  const originalAnnualUpdate=window.FLLivingWorld?.annualUpdate;
  if(originalAnnualUpdate){
    window.FLLivingWorld.annualUpdate=function internationalAnnualUpdate(game,startYear,archive){
      const result=originalAnnualUpdate.call(this,game,startYear,archive);
      const changed=simulateThrough(game,Math.max(1887,Number(startYear||yearOf(game))-1));
      if(changed)save(game);
      return result;
    };
  }

  const originalRender=window.FLUI?.render;
  if(originalRender){
    window.FLUI.render=function internationalExpandedRender(game){
      window.FLCurrentGame=game;
      const result=originalRender.call(this,game);
      requestAnimationFrame(()=>{
        if(game?.selectedTab!=='competitions'||!document.querySelector('.international-page'))return;
        renderPage(game,false);
        setTimeout(()=>{
          const changed=simulateThrough(game,yearOf(game)-1);
          if(game?.selectedTab==='competitions'&&document.querySelector('.international-page'))renderPage(game,false);
          if(changed)save(game);
        },0);
      });
      return result;
    };
  }

  bindEvents();
  window.FLInternationalExpansion={VERSION,COMPETITIONS,CONFEDERATIONS,ensure,simulateThrough,rebuildRecords,rankingRows,countrySummary,allTournamentRows,allMatches,renderPage};
})();
