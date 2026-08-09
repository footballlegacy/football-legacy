window.FLEnglishCup = (() => {
  const DAY=86400000;
  const iso=d=>d.toISOString().slice(0,10);
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return iso(d)};
  const seasonLabel=y=>`${y}/${String(y+1).slice(-2)}`;
  const yearOf=v=>Number(String(v||'1888').slice(0,4))||1888;
  function competitionRecord(game){
    if(window.FLTimeline)FLTimeline.ensure(game,{bootstrap:false});
    const list=game.worldState?.competitions||(game.worldState.competitions=[]);let row=list.find(c=>c.id==='english-cup');
    if(!row){row={id:'english-cup',name:'FA Cup',tier:0,official:true,active:true,founded:1871};list.push(row)}
    if(row.name!=='FA Cup')row.name='FA Cup';return row;
  }
  function active(game){return competitionRecord(game).active!==false&&!game.worldState?.officialLeagueSuspended}
  function existingClubs(game,startYear){return (game.clubs||[]).filter(c=>c.leagueActive!==false&&yearOf(c.founded||1888)<=startYear)}
  function firstDate(startYear){
    const d=new Date(`${startYear}-10-01T12:00:00Z`);while(d.getUTCDay()!==3)d.setUTCDate(d.getUTCDate()+1);return iso(d);
  }
  function roundName(count,number){if(count<=2)return 'Final';if(count<=4)return 'Semi-final';if(count<=8)return 'Quarter-final';return `Round ${number}`}
  function shuffle(ids,seed){let s=seed>>>0;const r=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};const out=[...ids];for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
  function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function fixture(game,state,tie,home,away,date,replay=0){
    const id=`english-cup-${state.startYear}-r${state.roundNumber}-t${tie.index}${replay?`-replay${replay}`:''}`;
    const f={id,date,round:state.roundNumber,home,away,played:false,homeGoals:null,awayGoals:null,competition:'FA Cup',competitionId:'english-cup',divisionId:'english-cup',tier:0,official:true,cupRound:state.roundName,cupTieId:tie.id,cupReplay:replay};
    game.fixtures.push(f);tie.fixtureIds.push(id);return f;
  }
  function scheduleRound(game,state,entrants,date){
    const ids=shuffle(entrants,hash(`${game.meta?.seed||1}-${state.startYear}-${state.roundNumber}`)),ties=[],byes=[];
    if(ids.length%2)byes.push(ids.shift());state.roundName=roundName(ids.length+byes.length,state.roundNumber);
    for(let i=0;i<ids.length;i+=2){const tie={id:`ec-${state.startYear}-r${state.roundNumber}-t${i/2+1}`,index:i/2+1,home:ids[i],away:ids[i+1],fixtureIds:[],winnerId:null};ties.push(tie);fixture(game,state,tie,tie.home,tie.away,date,0)}
    state.rounds.push({number:state.roundNumber,name:state.roundName,date,ties,byes,complete:false});state.currentRound=state.rounds.length-1;game.fixtures.sort((a,b)=>a.date.localeCompare(b.date)||Number(a.tier)-Number(b.tier)||a.id.localeCompare(b.id));
  }
  function newSeason(game,startYear){
    competitionRecord(game);game.englishCup=game.englishCup&&typeof game.englishCup==='object'?game.englishCup:{};game.englishCup.history=Array.isArray(game.englishCup.history)?game.englishCup.history:[];
    if(!active(game))return game.englishCup;if(game.englishCup.startYear===startYear&&game.englishCup.active&&(game.fixtures||[]).some(f=>f.competitionId==='english-cup'&&!f.abandoned))return game.englishCup;
    const entrants=existingClubs(game,startYear).map(c=>c.id);if(entrants.length<2)return game.englishCup;
    const previousHistory=game.englishCup.history;game.englishCup={startYear,season:seasonLabel(startYear),active:true,roundNumber:1,roundName:'Round 1',currentRound:0,rounds:[],championId:null,champion:null,history:previousHistory};
    scheduleRound(game,game.englishCup,entrants,firstDate(startYear));return game.englishCup;
  }
  function finish(game,state,winnerId){
    const champion=(game.clubs||[]).find(c=>c.id===winnerId);state.active=false;state.championId=winnerId;state.champion=champion?.name||winnerId;
    const record={season:state.season,competition:'FA Cup',winnerId,winner:state.champion,date:game.date};state.history=Array.isArray(state.history)?state.history:[];if(!state.history.some(x=>x.season===record.season))state.history.push(record);
    if(champion){champion.honours=Array.isArray(champion.honours)?champion.honours:[];if(!champion.honours.some(h=>h.name==='FA Cup'&&h.season===state.season))champion.honours.push({name:'FA Cup',season:state.season});(champion.players||[]).filter(p=>(p.appearances||0)>0).forEach(p=>{p.honours=Array.isArray(p.honours)?p.honours:[];if(!p.honours.some(h=>h.name==='FA Cup'&&h.season===state.season))p.honours.push({name:'FA Cup',season:state.season})})}
    game.news=Array.isArray(game.news)?game.news:[];game.news.unshift({id:`english-cup-winner-${state.startYear}`,date:game.date,headline:`${state.champion} win the FA Cup`,body:`${state.champion} lift the FA Cup after the ${state.season} final.`,category:'competition'});
    game.history=Array.isArray(game.history)?game.history:[];game.history.push({id:`english-cup-winner-${state.startYear}`,date:game.date,type:'competition',title:`${state.champion} win the FA Cup`,text:`The ${state.season} FA Cup is won by ${state.champion}.`});
  }
  function afterFixtures(game){
    const state=game.englishCup;if(!state?.active||!active(game))return state;const round=state.rounds?.[state.currentRound];if(!round||round.complete)return state;
    let waiting=false;
    for(const tie of round.ties){
      if(tie.winnerId)continue;const fixtures=tie.fixtureIds.map(id=>game.fixtures.find(f=>f.id===id)).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));const pending=fixtures.find(f=>!f.played);if(pending){waiting=true;continue}const latest=fixtures.at(-1);if(!latest){waiting=true;continue}
      if(latest.homeGoals===latest.awayGoals){const replayNo=fixtures.length,home=latest.away,away=latest.home,date=addDays(latest.date,7);fixture(game,state,tie,home,away,date,replayNo);waiting=true;continue}
      tie.winnerId=latest.homeGoals>latest.awayGoals?latest.home:latest.away;
    }
    if(waiting||round.ties.some(t=>!t.winnerId))return state;round.complete=true;const winners=[...round.byes,...round.ties.map(t=>t.winnerId)].filter(Boolean);if(winners.length===1){finish(game,state,winners[0]);return state}
    state.roundNumber++;const latestDate=round.ties.flatMap(t=>t.fixtureIds).map(id=>game.fixtures.find(f=>f.id===id)?.date).filter(Boolean).sort().at(-1)||round.date;scheduleRound(game,state,winners,addDays(latestDate,21));return state;
  }
  function suspend(game){if(game.englishCup?.active){game.englishCup.active=false;(game.fixtures||[]).filter(f=>f.competitionId==='english-cup'&&!f.played).forEach(f=>f.abandoned=true)}}
  function seasonRecord(game,label){return (game.englishCup?.history||[]).filter(x=>x.season===label).map(x=>({name:'FA Cup',winner:x.winner,winnerId:x.winnerId,date:x.date}))}
  function ensure(game,startYear=yearOf(game.date)){competitionRecord(game);if(!game.englishCup&&active(game))newSeason(game,startYear);return game.englishCup}
  return {ensure,newSeason,afterFixtures,suspend,active,seasonRecord};
})();
