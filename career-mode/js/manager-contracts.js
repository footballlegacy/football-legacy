window.FLManagerContracts = (() => {
  const VERSION = 1;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const yearOf=game=>Number(String(game?.date||'1888').slice(0,4))||1888;
  const controlled=game=>(game?.clubs||[]).find(c=>c.id===game.controlledClubId)||null;
  const isoYearEnd=year=>`${Number(year)}-06-30`;
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const daysBetween=(a,b)=>Math.ceil((new Date(`${b}T12:00:00Z`)-new Date(`${a}T12:00:00Z`))/86400000);
  const wageIndex=year=>window.FLEconomy?FLEconomy.wageIndex(year):Math.max(.7,Math.pow(1.035,Number(year)-1888)*.7);
  const tierFactor=tier=>({1:1,2:.72,3:.52,4:.39,5:.31,6:.25,7:.2,8:.17,9:.14,10:.12,11:.09,12:.07,13:.055,14:.04,15:.03}[clamp(tier,1,15)]||.03);
  const termsLabel=year=>Number(year)<1920?'Terms of Appointment':'Manager Contract';

  function marketWeeklyWage(game,club=controlled(game),year=yearOf(game),performance=0){
    const tier=Number(club?.tier)||1,stature=clamp(Number(club?.stature||club?.reputation||club?.powerRating||45),20,99);
    const inflationBase=3.25*(wageIndex(year)/wageIndex(1888));
    const clubScale=tierFactor(tier)*(.72+stature/145);
    const performanceScale=clamp(1+Number(performance||0)/180,.82,1.38);
    return Math.max(1,Math.round(inflationBase*clubScale*performanceScale));
  }
  function defaultLength(year){return Number(year)<1950?2:Number(year)<1992?3:3}
  function initialExpiry(startDate,lengthYears){const y=Number(String(startDate).slice(0,4))||1888;return isoYearEnd(y+Number(lengthYears||2))}
  function remainingDays(game,contract){if(!contract?.expiryDate)return Infinity;return daysBetween(game.date,contract.expiryDate)}
  function compensation(game,contract){if(contract?.grassroots)return 0;const weeks=Math.max(0,Math.min(156,Math.ceil(remainingDays(game,contract)/7)));return Math.max(0,Math.round(weeks*Number(contract.weeklyWage||0)*.72))}
  function statusFor(game,contract){
    const days=remainingDays(game,contract),confidence=Number(game.boardConfidence)||50;
    if(contract.pendingOffer?.status==='offered')return 'Extension offered';
    if(contract.boardDecision==='will-not-renew')return 'Board will not renew';
    if(days<0)return 'Contract expired';
    if(confidence<25)return 'Position insecure';
    if(days<=180)return 'Expiring';
    if(days<=365)return 'Final year';
    return 'Secure';
  }
  function normalize(game,contract){
    const club=controlled(game),start=contract.startDate||game.manager?.appointedDate||game.date,year=Number(String(start).slice(0,4))||yearOf(game),length=Number(contract.lengthYears)||defaultLength(year);
    contract.version=VERSION;contract.id=contract.id||`manager-contract-${club?.id||'club'}-${start}`;contract.clubId=club?.id||contract.clubId||null;contract.startDate=start;contract.lengthYears=length;contract.expiryDate=contract.expiryDate||initialExpiry(start,length);
    contract.weeklyWage=Math.max(1,Math.round(Number(contract.weeklyWage)||marketWeeklyWage(game,club,year)));contract.signedYear=Number(contract.signedYear)||year;contract.lastInflationYear=Number(contract.lastInflationYear)||year;contract.inflationLinked=contract.inflationLinked!==false;
    contract.wageHistory=Array.isArray(contract.wageHistory)?contract.wageHistory:[{date:start,weeklyWage:contract.weeklyWage,reason:'Appointment terms agreed'}];contract.reviewHistory=Array.isArray(contract.reviewHistory)?contract.reviewHistory:[];contract.offerHistory=Array.isArray(contract.offerHistory)?contract.offerHistory:[];
    contract.status=statusFor(game,contract);contract.annualWage=Math.round(contract.weeklyWage*52);contract.compensation=compensation(game,contract);contract.marketWeeklyWage=marketWeeklyWage(game,club,yearOf(game),Number(game.boardConfidence||50)-50);return contract;
  }
  function startAppointment(game,club=controlled(game),options={}){
    const start=options.startDate||game.manager?.appointedDate||game.date,year=Number(String(start).slice(0,4))||yearOf(game),length=Number(options.lengthYears)||defaultLength(year),weekly=Math.max(1,Math.round(Number(options.weeklyWage)||marketWeeklyWage(game,club,year)));
    game.managerContract={version:VERSION,id:`manager-contract-${club?.id||'club'}-${start}`,clubId:club?.id||null,startDate:start,expiryDate:initialExpiry(start,length),lengthYears:length,weeklyWage:weekly,annualWage:weekly*52,signedYear:year,lastInflationYear:year,inflationLinked:true,status:'Secure',boardDecision:'continue',pendingOffer:null,wageHistory:[{date:start,weeklyWage:weekly,reason:'Appointment terms agreed'}],reviewHistory:[],offerHistory:[]};
    return normalize(game,game.managerContract);
  }
  function ensure(game){
    if(!game||!game.manager)return null;const club=controlled(game);if(game.meta?.unemployed||club?.id==='unattached-manager')return null;
    if(game.meta?.grassroots&&game.meta?.grassrootsClubId===club?.id){
      if(!game.managerContract||!game.managerContract.grassroots)game.managerContract={grassroots:true,clubId:club.id,startDate:game.manager.appointedDate||game.date,expiryDate:null,lengthYears:null,weeklyWage:0,annualWage:0,marketWeeklyWage:0,compensation:0,status:'Volunteer',boardDecision:'continue',pendingOffer:null,wageHistory:[],reviewHistory:[],offerHistory:[]};
      game.managerContract.clubId=club.id;game.managerContract.weeklyWage=0;game.managerContract.annualWage=0;game.managerContract.marketWeeklyWage=0;game.managerContract.compensation=0;game.managerContract.status='Volunteer';return game.managerContract;
    }
    if(!game.managerContract||game.managerContract.clubId!==club?.id)startAppointment(game,club,{startDate:game.manager.appointedDate||game.date});
    return normalize(game,game.managerContract);
  }
  function applyInflation(game,newYear){
    const c=ensure(game);if(!c||!c.inflationLinked)return c;const from=Number(c.lastInflationYear)||Number(newYear)-1,to=Number(newYear)||yearOf(game);if(to<=from)return normalize(game,c);
    const ratio=wageIndex(to)/Math.max(.0001,wageIndex(from)),old=c.weeklyWage;c.weeklyWage=Math.max(1,Math.round(old*ratio));c.lastInflationYear=to;
    if(c.weeklyWage!==old)c.wageHistory.unshift({date:`${to}-07-01`,weeklyWage:c.weeklyWage,reason:'Inflation-linked annual adjustment'});return normalize(game,c);
  }
  function rowFor(game,archive){return (archive?.pyramidTables||[]).flatMap(x=>x.table||[]).find(x=>x.id===game.controlledClubId)||archive?.table?.find(x=>x.id===game.controlledClubId)||null}
  function movementIncludes(rows,game){return (rows||[]).some(x=>(x.clubId||x.id)===game.controlledClubId||x.club===controlled(game)?.name||x.name===controlled(game)?.name)}
  function reviewSeason(game,archive,startYear){
    const contract=ensure(game);
    if(!contract)return null;
    const row=rowFor(game,archive),division=(archive?.pyramidTables||[]).find(x=>(x.table||[]).some(t=>t.id===game.controlledClubId)),size=division?.table?.length||archive?.table?.length||12,champion=Number(row?.position)===1,promoted=movementIncludes(archive?.promoted,game),relegated=movementIncludes(archive?.relegated,game);
    let score=Number(game.boardConfidence)||50,change=0,verdict='The board consider the season broadly acceptable.',outcome='Objective reviewed';
    if(champion){change=8;outcome='Champions';verdict='The board are delighted with a championship-winning season.'}
    else if(promoted){change=7;outcome='Promotion achieved';verdict='The board are delighted that promotion has been secured.'}
    else if(relegated){change=-10;outcome='Relegated';verdict='The board are deeply disappointed by relegation.'}
    else if(Number(row?.position)<=3){change=4;outcome='Top-three finish';verdict='The board are pleased with a strong league finish.'}
    else if(Number(row?.position)>=Math.max(1,size-2)){change=-5;outcome='Bottom-three finish';verdict='The board are concerned by the club’s league position.'}
    else if(Number(row?.position)<=Math.ceil(size/2)){change=2;outcome='Top-half finish';verdict='The board are satisfied with the progress made.'}
    else {change=-1;outcome='Lower-half finish';verdict='The board expect improvement next season.'}
    game.boardConfidence=clamp(score+change,0,100);score=game.boardConfidence;
    const review={season:archive?.season||`${startYear-1}-${String(startYear).slice(2)}`,date:game.date,position:row?.position||null,division:division?.division?.name||row?.division||'English football',outcome,verdict,confidenceBefore:score-change,confidenceAfter:score,confidenceChange:change,objective:controlled(game)?.expectation||'Meet the board’s league expectation',champion,promoted,relegated};
    contract.reviewHistory.unshift(review);contract.lastSeasonReview=review;
    const days=remainingDays(game,contract),eligible=days<=550||champion||promoted||score>=78;
    if(score<30&&(relegated||days<=365)){contract.boardDecision='will-not-renew';contract.pendingOffer=null;review.contractDecision='The board will not offer new terms at present.';}
    else if(eligible){
      const length=Number(startYear)<1950?2:3,performance=champion?24:promoted?18:score-55,wage=Math.max(contract.weeklyWage,marketWeeklyWage({...game,date:`${startYear}-07-01`},controlled(game),startYear,performance));
      contract.pendingOffer={id:`offer-${review.season}-${game.controlledClubId}`,status:'offered',offeredDate:game.date,lengthYears:length,weeklyWage:wage,annualWage:wage*52,expiryDate:isoYearEnd(startYear+length),reason:champion?'Championship success':promoted?'Promotion achieved':days<=550?'Current terms approaching expiry':'Outstanding board confidence',decision:null};contract.boardDecision='extension-offered';review.contractDecision=`A ${length}-year extension has been offered.`;
    }else{contract.boardDecision='continue';review.contractDecision='The existing appointment continues unchanged.';}
    normalize(game,contract);return review;
  }
  function annualUpdate(game,startYear,archive){
    if(game?.meta?.grassroots&&game.meta?.grassrootsClubId===game.controlledClubId)return {contract:ensure(game),review:null};
    const contract=applyInflation(game,startYear);
    if(!contract)return {contract:null,review:null};
    const review=archive?reviewSeason(game,archive,startYear):null;
    if(game.managerContract)normalize(game,game.managerContract);
    return {contract:game.managerContract||null,review};
  }
  function resolveOffer(game,choice){
    const c=ensure(game),o=c?.pendingOffer;if(!o||o.status!=='offered')return {ok:false,message:'There is no active contract offer.'};
    if(choice==='accept'){
      c.offerHistory.unshift({...o,status:'accepted',decisionDate:game.date});c.startDate=game.date;c.expiryDate=o.expiryDate;c.lengthYears=o.lengthYears;c.weeklyWage=o.weeklyWage;c.annualWage=o.annualWage;c.signedYear=yearOf(game);c.lastInflationYear=yearOf(game);c.boardDecision='continue';c.pendingOffer=null;c.wageHistory.unshift({date:game.date,weeklyWage:c.weeklyWage,reason:'New contract accepted'});normalize(game,c);return {ok:true,message:`New terms accepted: ${o.lengthYears} years at £${o.weeklyWage.toLocaleString('en-GB')} per week.`};
    }
    if(choice==='reject'){c.offerHistory.unshift({...o,status:'rejected',decisionDate:game.date});c.pendingOffer=null;c.boardDecision='offer-rejected';normalize(game,c);return {ok:true,message:'You rejected the board’s contract offer. Your existing terms continue until expiry.'};}
    o.decision='delayed';o.delayedDate=game.date;normalize(game,c);return {ok:true,message:'Contract talks have been delayed. The offer remains available in the Board area.'};
  }
  function annualCost(game,club=controlled(game)){const c=ensure(game);if(c?.grassroots)return 0;return c&&c.clubId===club?.id?Math.max(0,Math.round(Number(c.weeklyWage||0)*52)):0}
  function currentReview(game,season=null){const c=ensure(game);if(!season)return c?.lastSeasonReview||null;return c?.reviewHistory?.find(x=>x.season===season)||null}
  return {VERSION,ensure,startAppointment,marketWeeklyWage,applyInflation,annualUpdate,resolveOffer,annualCost,currentReview,remainingDays,compensation,statusFor,termsLabel};
})();
