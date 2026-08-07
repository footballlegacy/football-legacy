window.FLTransferMarket = (() => {
  const DAY = 86400000;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const seeded=text=>{let s=hash(text);return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}};
  const money=value=>`£${Math.max(0,Math.round(Number(value)||0)).toLocaleString('en-GB')}`;
  function availableBudget(game){const club=controlled(game);if(window.FLEconomy&&club)FLEconomy.ensureClubFinances(game,club);return Math.max(0,Number(game.finances?.transferBudget)||Number(game.finances?.balance)||0)}
  function controlled(game){return (game.clubs||[]).find(c=>c.id===game.controlledClubId)}
  function allForeign(game){return window.FLWorldFootball?FLWorldFootball.players(game):[]}
  function allBuyingClubs(game){const foreign=window.FLWorldFootball?FLWorldFootball.clubs(game):[];return [...(game.clubs||[]),...foreign]}
  function findPlayer(game,playerId){
    for(const c of game.clubs||[]){const p=(c.players||[]).find(x=>x.id===playerId);if(p)return {p,c,league:null};}
    const free=(game.freeAgents||[]).find(x=>x.id===playerId);if(free)return {p:free,c:null,league:null};
    return allForeign(game).find(x=>x.p?.id===playerId)||null;
  }
  function ensure(game){
    if(!game.transferMarket||typeof game.transferMarket!=='object')game.transferMarket={};
    const s=game.transferMarket;
    s.outgoingOffers=Array.isArray(s.outgoingOffers)?s.outgoingOffers:[];
    s.incomingOffers=Array.isArray(s.incomingOffers)?s.incomingOffers:[];
    s.completed=Array.isArray(s.completed)?s.completed:[];
    s.lastIncomingCheck=s.lastIncomingCheck||null;
    if(s.valueModelVersion!==4){
      for(const offer of s.outgoingOffers){
        if(['completed','withdrawn'].includes(offer.status))continue;
        const found=findPlayer(game,offer.playerId);if(!found)continue;
        offer.valuation=value(game,found.p,found.c);offer.target=found.c?sellerTarget(game,found):0;
        if(offer.type!=='loan'&&Number(offer.terms?.fee)>offer.valuation*1.8)offer.terms.fee=Math.round(offer.valuation*.9);
        if(offer.status==='countered'&&offer.type!=='loan')offer.counterFee=Math.max(1,Math.round(offer.target*.98));
      }
      for(const offer of s.incomingOffers){
        if(offer.status!=='pending')continue;
        const found=findPlayer(game,offer.playerId);if(!found)continue;
        offer.valuation=value(game,found.p,found.c);
        if(Number(offer.fee)>offer.valuation*1.8)offer.fee=Math.round(offer.valuation*(.94+(hash(offer.id)%24)/100));
      }
      s.valueModelVersion=4;
    }
    return s;
  }
  function formNumber(player){
    const rating=Number(player.averageRating);
    if(Number.isFinite(rating)&&rating>0)return clamp((rating-6.2)*18,-12,20);
    return ({Excellent:14,Good:7,Fair:0,Poor:-8,'Very Poor':-14,'—':0})[player.form]??0;
  }
  function contractYears(game,player){
    if(!player.contractEnd)return 0;
    const remaining=(new Date(`${player.contractEnd}T12:00:00Z`)-new Date(`${game.date}T12:00:00Z`))/(365.25*DAY);
    return clamp(remaining,0,5);
  }
  function nationFactor(game,player){
    const year=Number(String(game.date||'1888').slice(0,4))||1888,n=String(player.nationality||'').toLowerCase();
    const reputation={english:1.08,scottish:1.03,welsh:.98,irish:.98,spanish:1.06,italian:1.06,german:1.05,french:1.04,brazilian:1.10,argentinian:1.09,portuguese:1.05,dutch:1.05};
    let f=reputation[n]||1;if(year>=1992&&n==='english')f*=1.16;if(year<1930&&!['english','scottish','welsh','irish'].includes(n))f*=.82;return f;
  }
  function value(game,player,club){
    const formFactor=1+formNumber(player)/100,contractFactor=club?(.78+contractYears(game,player)*.11):.18,importance=player.squadStatus==='Key Player'?1.18:player.squadStatus==='First Team'?1.10:player.squadStatus==='Rotation'?1:player.squadStatus==='Backup'?.9:.95;
    if(window.FLEconomy)return FLEconomy.playerValue(game,player,club,{formFactor,contractFactor,importanceFactor:importance,nationFactor:nationFactor(game,player)});
    return Math.max(club?1:0,Math.round((Number(player.ability)||40)*formFactor*contractFactor*importance*nationFactor(game,player)));
  }
  function breakdown(game,player,club){return {value:value(game,player,club),age:Number(player.age)||0,form:formNumber(player),rating:Number(player.ability)||0,potential:Math.max(Number(player.ceiling||player.potential||player.ability),Number(player.ability)||0),contractYears:Number(contractYears(game,player).toFixed(1)),nation:player.nationality||'Unknown',club:club?.name||'Free agent'}}
  function sellerTarget(game,found){
    const base=value(game,found.p,found.c);if(!found.c)return 0;let factor=1.06;
    if(found.p.squadStatus==='Key Player')factor+=.18;else if(found.p.squadStatus==='First Team')factor+=.10;else if(found.p.squadStatus==='Backup')factor-=.12;
    if((found.p.morale||'')==='Unhappy')factor-=.14;if(contractYears(game,found.p)<.7)factor-=.20;return Math.max(1,Math.round(base*factor));
  }
  function evaluatePermanent(game,found,terms){
    const fee=Math.max(0,Number(terms.fee)||0),addons=Math.max(0,Number(terms.addons)||0),installments=clamp(Number(terms.installments)||1,1,4),effective=fee+addons*.42-(installments-1)*fee*.035,target=sellerTarget(game,found),ratio=target?effective/target:1;
    if(!found.c)return {status:'accepted',message:'The player is unattached, so no club fee is required.',target:0,counterFee:0};
    if(ratio>=.98)return {status:'accepted',message:`${found.c.name} accept the permanent offer.`,target,counterFee:0};
    if(ratio>=.72){const counterFee=Math.max(fee+1,Math.round(target*(.96+Math.min(.08,(1-ratio)*.15))));return {status:'countered',message:`${found.c.name} reject the opening figure but propose a fee of ${money(counterFee)}.`,target,counterFee};}
    return {status:'rejected',message:`${found.c.name} reject the offer as too far below their valuation.`,target,counterFee:0};
  }
  function evaluateLoan(game,found,terms){
    if(!found.c)return {status:'rejected',message:'A free agent cannot be loaned.',target:0};
    const age=Number(found.p.age)||24,wage=clamp(Number(terms.wageContribution)||0,0,100),fee=Math.max(0,Number(terms.loanFee)||0),role=found.p.squadStatus||'Rotation';
    let score=42+wage*.38+Math.min(25,fee/Math.max(1,value(game,found.p,found.c))*1200);if(age<=22)score+=12;if(role==='Backup')score+=14;if(role==='Key Player')score-=26;if(role==='First Team')score-=12;
    if(score>=62)return {status:'accepted',message:`${found.c.name} agree to the proposed loan.`,target:62};
    if(score>=48)return {status:'countered',message:`${found.c.name} want a larger wage contribution.`,target:62,counterWage:Math.min(100,Math.max(wage+15,70))};
    return {status:'rejected',message:`${found.c.name} do not consider the loan suitable.`,target:62};
  }
  function syncWorldNegotiation(game,row){
    const world=game.worldUI||(game.worldUI={});world.negotiations=Array.isArray(world.negotiations)?world.negotiations:[];
    world.negotiations=world.negotiations.filter(x=>x.playerId!==row.playerId);world.negotiations.unshift({id:row.id,playerId:row.playerId,action:row.type==='loan'?'Loan offer':'Permanent offer',date:row.date,status:row.status,fee:Number(row.terms.fee||row.terms.loanFee||0)});
  }
  function submitOutgoing(game,playerId,type,terms={}){if(window.FLGrassroots?.useLocalRecruitment?.(game))return {ok:false,message:'This club has no formal transfer operation yet. Use the local leads page to register amateur players.'};const permission=window.FLCareerSystems?FLCareerSystems.transferAllowed(game):{ok:true};if(!permission.ok)return permission;
    const s=ensure(game),found=findPlayer(game,playerId);if(!found)return {ok:false,message:'Player not found.'};if(found.c?.id===game.controlledClubId)return {ok:false,message:'That player is already at your club.'};
    const freeAgent=!found.c;if(type==='loan'&&freeAgent)return {ok:false,message:'A free agent cannot be loaned.'};
    const committed=Math.max(0,Number(type==='loan'?terms.loanFee:terms.fee)||0),budget=availableBudget(game);
    if(!freeAgent&&committed>budget)return {ok:false,message:`The board has made ${money(budget)} available for transfer fees. This offer is too high.`};
    const r=seeded(`${game.meta?.seed||1}-${game.date}-${playerId}-${type}-${s.outgoingOffers.length}`),delay=1+Math.floor(r()*3);
    const row={id:`outgoing-${Date.now()}-${playerId}`,playerId,player:found.p.name,sellingClubId:found.c?.id||null,sellingClub:found.c?.name||'Unattached',type,status:freeAgent?'accepted':'pending',date:game.date,decisionDate:freeAgent?game.date:addDays(game.date,delay),terms:{...terms},valuation:value(game,found.p,found.c),target:freeAgent?0:sellerTarget(game,found),counterFee:0,counterWage:0,message:freeAgent?'No club fee is required. You may discuss personal terms.':`${found.c.name} will consider the offer and reply by ${addDays(game.date,delay)}.`};
    s.outgoingOffers=s.outgoingOffers.filter(x=>x.playerId!==playerId||!['accepted','countered','pending'].includes(x.status));s.outgoingOffers.unshift(row);syncWorldNegotiation(game,row);
    return {ok:true,offer:row,message:row.message};
  }
  function processOutgoingResponses(game){
    const s=ensure(game);s.outgoingOffers.filter(o=>o.status==='pending'&&o.decisionDate<=game.date).forEach(o=>{
      const found=findPlayer(game,o.playerId);if(!found){o.status='withdrawn';o.message='The player is no longer available.';return;}
      const result=o.type==='loan'?evaluateLoan(game,found,o.terms):evaluatePermanent(game,found,o.terms);Object.assign(o,{status:result.status,target:result.target||o.target||0,counterFee:result.counterFee||0,counterWage:result.counterWage||0,message:result.message,responseDate:game.date});syncWorldNegotiation(game,o);
      game.inbox.unshift({id:`club-response-${o.id}`,date:game.date,from:found.c?.name||'Player Representative',subject:`Offer response: ${found.p.name}`,body:result.message,read:false});
    });
  }
  function outgoingForPlayer(game,playerId){return ensure(game).outgoingOffers.find(x=>x.playerId===playerId&&x.status!=='withdrawn'&&x.status!=='completed')||null}
  function acceptCounter(game,offerId){
    const o=ensure(game).outgoingOffers.find(x=>x.id===offerId);if(!o||o.status!=='countered')return {ok:false,message:'No counter-offer is available.'};
    if(o.type==='loan'){o.terms.wageContribution=o.counterWage;o.status='accepted';o.message='The countered loan terms have been accepted.';}else{if(Number(o.counterFee||0)>availableBudget(game))return {ok:false,message:`The board transfer budget is ${money(availableBudget(game))}; the counter-offer cannot be accepted.`};o.terms.fee=o.counterFee;o.status='accepted';o.message='The seller’s counter-offer has been accepted.';}syncWorldNegotiation(game,o);return {ok:true,offer:o,message:o.message};
  }
  function withdraw(game,offerId){const o=ensure(game).outgoingOffers.find(x=>x.id===offerId);if(!o)return {ok:false,message:'Offer not found.'};o.status='withdrawn';syncWorldNegotiation(game,o);return {ok:true,message:'Offer withdrawn.'}}
  function recordTransfer(game,p,from,to,fee,type){
    const row={id:`completed-${Date.now()}-${p.id}`,date:game.date,player:p.name,playerId:p.id,from:from?.name||'Unattached',fromId:from?.id||null,to:to.name,toId:to.id,fee:Number(fee)||0,type};
    ensure(game).completed.unshift(row);const world=game.worldUI||(game.worldUI={});world.transferHistory=Array.isArray(world.transferHistory)?world.transferHistory:[];world.transferHistory.unshift(row);
    game.history.push({id:row.id,date:game.date,type:'transfer',title:`${p.name} joins ${to.name}`,text:`${p.name} moves from ${row.from} to ${to.name}${row.fee?` for ${money(row.fee)}`:''}.`});game.news.unshift({id:`news-${row.id}`,date:game.date,headline:`${p.name} completes move to ${to.name}`,body:`${to.name} sign ${p.name} from ${row.from}${row.fee?` for ${money(row.fee)}`:''}.`,category:'transfer'});return row;
  }
  function removePlayer(game,found){if(found.c)found.c.players=found.c.players.filter(x=>x.id!==found.p.id);else game.freeAgents=(game.freeAgents||[]).filter(x=>x.id!==found.p.id)}
  function completeAcceptedTransfer(game,playerId,personalTerms={}){if(window.FLGrassroots?.useLocalRecruitment?.(game))return {ok:false,message:'Formal fees and contracts are unavailable at this level. Recruit through local amateur registrations.'};const permission=window.FLCareerSystems?FLCareerSystems.transferAllowed(game):{ok:true};if(!permission.ok)return permission;
    const s=ensure(game),offer=s.outgoingOffers.find(x=>x.playerId===playerId&&x.status==='accepted');if(!offer)return {ok:false,message:'The selling club has not accepted an offer.'};const found=findPlayer(game,playerId),to=controlled(game);if(!found||!to)return {ok:false,message:'Player or club not found.'};
    const fee=offer.type==='loan'?Number(offer.terms.loanFee||0):Number(offer.terms.fee||0);if(Number(game.finances?.balance||0)<fee||availableBudget(game)<fee)return {ok:false,message:'The club cannot afford the accepted fee within the board transfer budget.'};
    game.finances.balance-=fee;game.finances.transferBudget=Math.max(0,availableBudget(game)-fee);removePlayer(game,found);const p=found.p;p.clubId=to.id;p.squadStatus=personalTerms.role||'First Team';p.wage=Math.max(Number(p.wage)||1,Math.round(window.FLEconomy?FLEconomy.recommendedWage(game,p,to,personalTerms.role||'First Team')*(personalTerms.packageType==='High wage'?1.25:1):((Number(p.ability)||50)/10)));p.contractStart=game.date;p.contractEnd=addDays(game.date,(Number(personalTerms.years)||2)*365);p.contractStatus='Secure';
    if(offer.type==='loan'){p.developmentPathway={type:'loan',loan:true,parentClubId:found.c?.id||null,parentClubName:found.c?.name||'',endDate:addDays(game.date,Number(offer.terms.durationDays)||365)};p.loanParentSnapshot={clubId:found.c?.id||null,clubName:found.c?.name||'',foreign:Boolean(found.c?.foreign)}}
    to.players.push(p);offer.status='completed';syncWorldNegotiation(game,offer);recordTransfer(game,p,found.c,to,fee,offer.type);game.inbox.unshift({id:`deal-done-${offer.id}`,date:game.date,from:'Club Secretary',subject:`Transfer completed: ${p.name}`,body:`${p.name} has joined ${to.name}. Registration and personal terms are complete.`,read:false});return {ok:true,message:`${p.name} has joined ${to.name}.`,player:p};
  }
  function maybeIncoming(game){
    const s=ensure(game),date=game.date;if(s.lastIncomingCheck===date)return;const d=new Date(`${date}T12:00:00Z`);if(d.getUTCDay()!==1)return;s.lastIncomingCheck=date;
    const r=seeded(`${game.meta?.seed||1}-${date}-incoming`);if(r()>.52)return;const club=controlled(game),eligible=(club?.players||[]).filter(p=>!p.developmentPathway?.loan&&p.status!=='retired'&&p.status!=='deceased');if(!eligible.length)return;
    const weighted=[...eligible].sort((a,b)=>(Number(b.ability)+formNumber(b))-(Number(a.ability)+formNumber(a))),p=weighted[Math.floor(r()*Math.min(weighted.length,8))],buyers=allBuyingClubs(game).filter(c=>c.id!==club.id&&c.players?.length);if(!p||!buyers.length)return;
    const buyer=buyers[Math.floor(r()*buyers.length)],v=value(game,p,club),fee=Math.max(1,Math.round(v*(.82+r()*.42))),row={id:`incoming-${date}-${p.id}-${buyer.id}`,date,playerId:p.id,player:p.name,buyerId:buyer.id,buyer:buyer.name,fee,status:'pending',valuation:v};if(s.incomingOffers.some(x=>x.status==='pending'&&x.playerId===p.id))return;
    s.incomingOffers.unshift(row);game.inbox.unshift({id:`incoming-mail-${row.id}`,date,from:buyer.name,subject:`Transfer offer for ${p.name}`,body:`${buyer.name} have submitted an offer of ${money(fee)} for ${p.name}. Review it in Transfers.`,read:false});
  }
  function acceptIncoming(game,offerId){
    const s=ensure(game),o=s.incomingOffers.find(x=>x.id===offerId);if(!o||o.status!=='pending')return {ok:false,message:'That offer is no longer active.'};const from=controlled(game),p=from.players.find(x=>x.id===o.playerId),buyer=allBuyingClubs(game).find(x=>x.id===o.buyerId);if(!p||!buyer)return {ok:false,message:'The player or buying club no longer exists.'};
    from.players=from.players.filter(x=>x.id!==p.id);p.clubId=buyer.id;p.squadStatus='First Team';buyer.players.push(p);game.finances.balance+=Number(o.fee)||0;game.finances.transferBudget=Math.max(0,Number(game.finances.transferBudget)||0)+Math.round((Number(o.fee)||0)*.72);o.status='accepted';recordTransfer(game,p,from,buyer,o.fee,'permanent');game.inbox.unshift({id:`sale-${o.id}`,date:game.date,from:'Club Secretary',subject:`Sale completed: ${p.name}`,body:`${p.name} has joined ${buyer.name} for ${money(o.fee)}.`,read:false});return {ok:true,message:`Offer accepted. ${p.name} has joined ${buyer.name}.`};
  }
  function rejectIncoming(game,offerId){const o=ensure(game).incomingOffers.find(x=>x.id===offerId);if(!o||o.status!=='pending')return {ok:false,message:'That offer is no longer active.'};o.status='rejected';return {ok:true,message:`The offer from ${o.buyer} has been rejected.`}}
  function returnLoans(game){
    const club=controlled(game);for(const p of [...(club?.players||[])]){if(!p.developmentPathway?.loan||p.developmentPathway.endDate>game.date)continue;const parentId=p.developmentPathway.parentClubId,parent=(game.clubs||[]).find(c=>c.id===parentId)||(window.FLWorldFootball?FLWorldFootball.clubs(game).find(c=>c.id===parentId):null);if(parent){club.players=club.players.filter(x=>x.id!==p.id);p.clubId=parent.id;delete p.developmentPathway;delete p.loanParentSnapshot;parent.players.push(p);game.inbox.unshift({id:`loan-return-${p.id}-${game.date}`,date:game.date,from:'Club Secretary',subject:`Loan completed: ${p.name}`,body:`${p.name} has returned to ${parent.name}.`,read:false})}}
  }
  function dailyTick(game){ensure(game);returnLoans(game);processOutgoingResponses(game);maybeIncoming(game)}
  return {ensure,findPlayer,value,breakdown,outgoingForPlayer,submitOutgoing,processOutgoingResponses,acceptCounter,withdraw,completeAcceptedTransfer,dailyTick,acceptIncoming,rejectIncoming};
})();
