window.FLClubHistory = (() => {
  const histories={
    Chelsea:[
      {year:1905,title:'West London club founded',text:'Chelsea are formed at Stamford Bridge and elected directly into the Football League Second Division.'},
      {year:1907,title:'First promotion',text:'The club reaches the First Division for the first time.'},
      {year:1955,title:'Champions of England',text:'Chelsea win the First Division championship, the club’s first major honour.'},
      {year:1970,title:'First FA Cup',text:'An FA Cup triumph begins a new era of major success.'},
      {year:1971,title:'First European trophy',text:'Chelsea lift the European Cup Winners’ Cup.'},
      {year:1997,title:'FA Cup return',text:'The club ends a long wait for a major domestic trophy.'},
      {year:2003,title:'Transformative takeover',text:'New ownership changes the scale and ambition of the club.'},
      {year:2005,title:'Premier League champions',text:'Chelsea win a first league title in fifty years.'},
      {year:2012,title:'Champions of Europe',text:'Chelsea lift the European Cup for the first time.'},
      {year:2021,title:'European champions again',text:'A second Champions League title is won in Porto.'},
      {year:2025,title:'European set completed',text:'Chelsea win the Conference League and become the first club to win all five major UEFA men’s club trophies.'},
      {year:2025,title:'World champions',text:'Chelsea win the expanded FIFA Club World Cup.'}
    ],
    Arsenal:[{year:1886,title:'Club founded',text:'Workers in Woolwich establish the club.'},{year:1893,title:'Football League entry',text:'The club enters the Second Division.'},{year:1931,title:'First league championship',text:'Arsenal become champions of England.'},{year:2004,title:'The Invincibles',text:'An entire top-flight league season is completed unbeaten.'}],
    Liverpool:[{year:1892,title:'Club founded',text:'Liverpool are formed at Anfield.'},{year:1901,title:'First league championship',text:'The club become champions of England.'},{year:1977,title:'Champions of Europe',text:'Liverpool win the European Cup for the first time.'},{year:2020,title:'Premier League champions',text:'A thirty-year wait for the English title ends.'}],
    'Manchester United':[{year:1878,title:'Club founded',text:'The club begins life as Newton Heath.'},{year:1908,title:'First league championship',text:'The club win the First Division.'},{year:1968,title:'European champions',text:'Manchester United become the first English winners of the European Cup.'},{year:1999,title:'Historic treble',text:'League, FA Cup and European Cup are won in one season.'}]
  };
  const reference=value=>String(value?.realClub||value?.reference||value?.name||value||'').replace(/\s+(parallel|database|founder)$/i,'');
  function milestonesFor(club,startYear=2026){const key=reference(club),rows=(histories[key]||[]).map(row=>({...row})),founded=Number(String(club?.founded||'').slice(0,4));if(Number.isFinite(founded)&&founded<=Number(startYear)&&!rows.some(row=>row.year===founded))rows.unshift({year:founded,title:'Club founded',text:`${club?.name||key||'The club'} begins its football story${club?.location?` in ${club.location}`:''}.`});return rows.filter(row=>row.year<=Number(startYear)).sort((a,b)=>a.year-b.year).map(row=>({...row}))}
  function allFor(club){return (histories[reference(club)]||[]).map(row=>({...row}))}
  return {milestonesFor,allFor};
})();
