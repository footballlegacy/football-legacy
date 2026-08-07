window.FLMatchEnvironment = (() => {
  const ERAS=[
    {id:'victorian',from:1888,to:1914,label:'Victorian Football',broadcast:'Illustrated Sporting Paper',kit:'Heavy wool shirts · long knickerbockers',ball:'Dark leather-panel ball',photo:'Sepia studio plate'},
    {id:'interwar',from:1915,to:1949,label:'Interwar Football',broadcast:'Newsreel & Evening Edition',kit:'Laced shirts · high collars · plain stockings',ball:'Laced leather ball',photo:'Silver-gelatin press photograph'},
    {id:'postwar',from:1950,to:1969,label:'Post-war Football',broadcast:'Saturday Sports Bulletin',kit:'Short sleeves · simple crests · numbered backs',ball:'Brown stitched match ball',photo:'Grainy monochrome touchline photograph'},
    {id:'television',from:1970,to:1989,label:'Television Football',broadcast:'Saturday Match Broadcast',kit:'Bold trim · brighter colours · classic collars',ball:'White-and-black television ball',photo:'Warm colour broadcast still'},
    {id:'modernising',from:1990,to:2005,label:'Modernising Football',broadcast:'Live Satellite Coverage',kit:'Patterned shirts · sponsors · squad numbers',ball:'High-contrast synthetic ball',photo:'Flash-lit magazine portrait'},
    {id:'contemporary',from:2006,to:9999,label:'Contemporary Football',broadcast:'Global Live Match Centre',kit:'Lightweight technical kit · fitted cut',ball:'Thermally bonded match ball',photo:'High-definition player portrait'}
  ];
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function eraForYear(year){const y=Number(year)||1888;return ERAS.find(e=>y>=e.from&&y<=e.to)||ERAS[0];}
  function weighted(rows,r){let total=rows.reduce((n,x)=>n+x[1],0),roll=r()*total;for(const row of rows){roll-=row[1];if(roll<=0)return row[0]}return rows[0][0]}
  function create(game,home,r){
    const date=String(game?.date||'1888-09-01'),year=Number(date.slice(0,4))||1888,month=Number(date.slice(5,7))||9,era=eraForYear(year);
    const winter=[12,1,2].includes(month),shoulder=[3,4,10,11].includes(month),summer=[5,6,7,8,9].includes(month);
    const options=winter?[["Cold and dry",24],["Overcast",24],["Light rain",20],["Heavy rain",9],["Fog",12],["Snow flurries",7],["Clear",4]]:shoulder?[["Overcast",27],["Light rain",25],["Clear",20],["Heavy rain",9],["Fog",7],["Cold and dry",7],["Bright",5]]:[["Clear",32],["Bright",23],["Overcast",22],["Light rain",14],["Heavy rain",4],["Fog",2],["Cold and dry",3]];
    const weather=weighted(options,r),facility=Number(home?.facilities?.training||home?.strength||2),historicalDrainage=year<1930?.2:year<1960?.34:year<1985?.55:year<2000?.72:.86;
    const drainage=clamp(historicalDrainage+(facility-2)*.035,0.15,.96),windSpeed=Math.round(3+r()*(weather==='Heavy rain'?30:weather==='Snow flurries'?22:weather==='Clear'||weather==='Bright'?13:21));
    const temperature=Math.round((winter?1:shoulder?9:16)+(r()-.5)*(winter?11:shoulder?10:12));
    let startSurface='Good';
    if(weather==='Heavy rain')startSurface=drainage>.72?'Soft':'Muddy';
    else if(weather==='Light rain')startSurface=drainage>.62?'Good':'Soft';
    else if(weather==='Fog')startSurface='Soft';
    else if(weather==='Snow flurries'||(weather==='Cold and dry'&&temperature<=1&&r()<.55))startSurface='Frozen';
    else if(year<1935&&r()<.16)startSurface='Uneven';
    const precipitation=weather==='Heavy rain'?'Heavy':weather==='Light rain'?'Light':weather==='Snow flurries'?'Snow':'None';
    const visibility=weather==='Fog'?'Poor':weather==='Heavy rain'||weather==='Snow flurries'?'Reduced':'Good';
    const wet=['Heavy rain','Light rain'].includes(weather),frozen=startSurface==='Frozen';
    const wearRate=clamp((year<1950?.95:year<1980?.72:year<2000?.52:.36)*(startSurface==='Muddy'?1.55:startSurface==='Soft'?1.25:frozen?1.12:1)*(1.08-drainage*.35),.2,1.8);
    const friction=wet?1.16:frozen?.82:startSurface==='Uneven'?1.08:1,controlPenalty=(startSurface==='Muddy'?.026:frozen?.035:startSurface==='Uneven'?.022:wet?.012:0),passPenalty=(startSurface==='Muddy'?.022:frozen?.03:startSurface==='Uneven'?.018:wet?.009:0)+(windSpeed>22?.009:0);
    const bounce=frozen?'Skiddy':startSurface==='Uneven'?'Unreliable':wet?'Holding up':'True';
    const ballBehaviour=frozen?'The ball skids and gathers pace':startSurface==='Muddy'?'The ball can stop in churned ground':startSurface==='Uneven'?'The bounce is unpredictable':windSpeed>22?'Long passes drift in the wind':wet?'The surface slows grounded passes':'The ball runs cleanly';
    return {era,weather,temperature,windSpeed,windLabel:windSpeed>=25?'Strong':windSpeed>=16?'Fresh':windSpeed>=9?'Moderate':'Light',precipitation,visibility,drainage:+drainage.toFixed(2),startSurface,wearRate:+wearRate.toFixed(2),friction:+friction.toFixed(2),controlPenalty:+controlPenalty.toFixed(3),passPenalty:+passPenalty.toFixed(3),bounce,ballBehaviour};
  }
  function surfaceAtMinute(environment,minute){
    const m=clamp(Number(minute)||0,0,90),start=environment?.startSurface||'Good',wear=(m/90)*Number(environment?.wearRate||.5);
    if(start==='Frozen')return wear>.72?'Churned frozen':'Frozen';
    if(start==='Muddy')return wear>.8?'Very muddy':'Muddy';
    if(start==='Soft')return wear>.82?'Muddy':wear>.36?'Worn':'Soft';
    if(start==='Uneven')return wear>.65?'Cut up and uneven':'Uneven';
    if(wear>.78)return 'Worn';if(wear>.38)return 'Slightly worn';return 'Good';
  }
  function impactAtMinute(environment,minute){
    const wear=(clamp(Number(minute)||0,0,90)/90)*Number(environment?.wearRate||.5),state=surfaceAtMinute(environment,minute);
    return {state,passPenalty:Number(environment?.passPenalty||0)+wear*.009,controlPenalty:Number(environment?.controlPenalty||0)+wear*.011,tacklePenalty:wear*.006,ballSpeed:clamp(1/Number(environment?.friction||1)+(state.includes('Worn')?.04:0),.72,1.18)};
  }
  function wearMap(frames,environment){
    const buckets=new Map();
    const add=(p,w=1)=>{if(!p)return;const gx=Math.max(0,Math.min(7,Math.floor(Number(p.x||50)/12.5))),gy=Math.max(0,Math.min(4,Math.floor(Number(p.y||50)/20))),key=`${gx}-${gy}`;buckets.set(key,(buckets.get(key)||0)+w)};
    (frames||[]).forEach(f=>{add(f.from,f.phase==='carry'?1.35:.55);add(f.to,f.phase==='shot'||f.phase==='header'?1.65:.75)});
    [[.065,.5,1.3],[.935,.5,1.3],[.5,.5,.8]].forEach(([x,y,w])=>{const gx=Math.floor(x*8),gy=Math.floor(y*5),key=`${gx}-${gy}`;buckets.set(key,(buckets.get(key)||0)+w*35)});
    const max=Math.max(1,...buckets.values()),rate=Number(environment?.wearRate||.5);
    return [...buckets.entries()].map(([key,value])=>{const [gx,gy]=key.split('-').map(Number);return {x:+((gx+.5)*12.5).toFixed(1),y:+((gy+.5)*20).toFixed(1),width:+(9+Math.min(8,value/max*8)).toFixed(1),height:+(10+Math.min(12,value/max*12)).toFixed(1),intensity:+clamp(value/max*rate,.08,1).toFixed(2)}}).sort((a,b)=>b.intensity-a.intensity).slice(0,12);
  }
  return {ERAS,eraForYear,create,surfaceAtMinute,impactAtMinute,wearMap};
})();
