window.FLEconomy = (() => {
  const VERSION=4;
  const CURVES = {
    transfer: [[1888,.55],[1900,.85],[1920,1.5],[1930,3],[1950,20],[1960,60],[1970,250],[1980,1200],[1990,5000],[2000,22000],[2010,55000],[2020,120000],[2026,150000]],
    wage: [[1888,.7],[1900,.85],[1920,1.15],[1930,1.5],[1950,4],[1960,9],[1970,35],[1980,120],[1990,450],[2000,2500],[2010,8000],[2020,19000],[2026,25000]],
    budget: [[1888,1],[1900,1.35],[1920,2.3],[1930,4.2],[1950,18],[1960,45],[1970,140],[1980,520],[1990,2200],[2000,12000],[2010,36000],[2020,82000],[2026,105000]]
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const roundMoney=v=>Math.max(0,Math.round(Number(v)||0));
  const yearOf=game=>clamp(Number(String(game?.date||'1888').slice(0,4))||1888,1888,2150);

  function interpolate(points,year){
    const y=Number(year)||1888;
    if(y<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++){
      const [y1,v1]=points[i-1],[y2,v2]=points[i];
      if(y<=y2){const t=(y-y1)/(y2-y1);return v1+(v2-v1)*t;}
    }
    const [lastY,lastV]=points.at(-1),[prevY,prevV]=points.at(-2),annual=Math.pow(lastV/prevV,1/(lastY-prevY));
    return lastV*Math.pow(annual,Math.max(0,y-lastY));
  }
  function index(kind,year){return interpolate(CURVES[kind]||CURVES.transfer,year)}
  function transferIndex(year){return index('transfer',year)}
  function wageIndex(year){return index('wage',year)}
  function budgetIndex(year){return index('budget',year)}
  function eraLabel(year){return year<1914?'Victorian market':year<1946?'Early professional market':year<1961?'Post-war market':year<1985?'Broadcast-era market':year<2000?'Commercial market':year<2013?'Global transfer market':'Modern global market'}

  function historicalBasePlayerValue(player,club){
    const ability=Number(player?.ability)||40,potential=Math.max(ability,Number(player?.ceiling||player?.potential||ability)),gap=Math.max(0,potential-ability),age=Number(player?.age)||24;
    const ageFactor=age<=18?1.34:age<=21?1.48:age<=24?1.37:age<=27?1.18:age<=30?.94:age<=33?.68:.42;
    const ratingCore=Math.pow(Math.max(2,ability-31),1.42)*1.18,potentialPremium=gap*(age<=23?7.5:age<=27?4.2:1.6);
    const clubFactor=club?clamp(.84+(Number(club.stature||club.powerRating||club.reputation||club.strength*11||45)-45)/145,.7,1.42):1;
    return Math.max(1,(ratingCore+potentialPremium+10)*ageFactor*clubFactor);
  }
  function modernBasePlayerValue(player,club){
    const ability=clamp(Number(player?.ability)||40,30,99),potential=clamp(Math.max(ability,Number(player?.ceiling||player?.potential||ability)),ability,99),gap=Math.max(0,potential-ability),age=clamp(Number(player?.age)||24,15,45);
    const ratingValue=160000*Math.pow(1.145,ability-50);
    const ageFactor=age<=18?1.16:age<=21?1.12:age<=24?1.08:age<=27?1:age<=30?.82:age<=33?.58:.32;
    const potentialFactor=clamp(1+gap*(age<=21?.045:age<=24?.032:age<=27?.018:.008),1,1.75);
    const stature=Number(club?.stature||club?.powerRating||club?.reputation||club?.strength*11||45);
    const clubFactor=club?clamp(.72+(stature-35)/135,.65,1.20):.82;
    const pos=String(player?.position||'').toUpperCase(),positionFactor=pos==='GK'?.88:['FB','RB','LB','WB'].includes(pos)?.94:['CB','DF'].includes(pos)?.97:['CF','ST','IF','W','LW','RW'].includes(pos)?1.06:1;
    const exceptionalYouth=age<=21&&ability>=92?1.35:age<=21&&ability>=88?1.15:1;
    return Math.max(25000,ratingValue*ageFactor*potentialFactor*clubFactor*positionFactor*exceptionalYouth);
  }
  function playerValue(game,player,club,modifiers={}){
    const year=yearOf(game),form=Number(modifiers.formFactor)||1,contract=Number(modifiers.contractFactor)||1,importance=Number(modifiers.importanceFactor)||1,nation=Number(modifiers.nationFactor)||1;
    const historic=historicalBasePlayerValue(player,club)*transferIndex(year),modern=modernBasePlayerValue(player,club)*(transferIndex(year)/transferIndex(2026));
    const base=year<1985?historic:year>=2000?modern:historic+(modern-historic)*((year-1985)/15);
    const raw=base*form*contract*importance*nation,cap=year>=2013?225000000:Infinity;
    return Math.max(club?1:0,Math.round(Math.min(cap,raw)));
  }
  function recommendedWage(game,player,club,role='First Team'){
    const year=yearOf(game),ability=Math.max(30,Number(player?.ability)||45),reputation=clamp(Number(club?.reputation||club?.stature||45),20,99),roleFactor=role==='Key Player'?1.28:role==='First Team'?1.08:role==='Rotation'?.88:role==='Backup'?.7:.8;
    const base=Math.max(.12,Math.pow(Math.max(2,ability-30),1.18)/35)*(0.78+reputation/180)*roleFactor;
    return Math.max(1,Math.round(base*wageIndex(year)));
  }

  // club.finance is an abstract historical financial-health value used by the
  // trajectory engine. It must not be inflated into nominal pounds every year.
  function financeSeed(club){
    const explicit=Number(club?.baseFinance1888||club?.finance1888);
    if(Number.isFinite(explicit)&&explicit>0)return explicit;
    const abstract=Number(club?.finance);
    if(Number.isFinite(abstract)&&abstract>0)return clamp(Math.round(abstract),25,7500);
    const power=Number(club?.financialPower||club?.reputation||club?.stature||45);
    return clamp(Math.round(180+power*6),25,7500);
  }
  function clubBudget(game,club){
    const year=yearOf(game),seed=financeSeed(club),power=clamp(Number(club?.financialPower||club?.reputation||club?.stature||45),20,99),tier=clamp(Number(club?.tier)||1,1,10);
    const scale=.58+power/100;
    const tierScale=tier<=1?1:tier===2?.83:tier<=4?.67:tier<=6?.5:tier<=8?.36:.25;
    return Math.max(25,Math.round(seed*budgetIndex(year)*scale*tierScale));
  }
  function transferBudget(game,club){
    const year=yearOf(game),base=clubBudget(game,club),tier=Number(club?.tier)||1,confidence=clamp(Number(game?.boardConfidence)||60,20,95);
    const tierFactor=tier<=2?1:tier<=5?.82:tier<=7?.62:.46;
    const confidenceFactor=.72+confidence/220;
    const marketFactor=year<1920?.18:year<1950?.24:year<1985?.31:year<2000?.38:year<2013?.52:.60;
    return Math.max(year<1900?10:25,Math.round(base*marketFactor*tierFactor*confidenceFactor));
  }
  function weeklyWageBudget(game,club){
    const players=(club?.players||[]).filter(p=>p.status!=='retired'&&p.status!=='deceased'),squad=Math.max(16,players.length||20),averageAbility=players.reduce((n,p)=>n+Number(p.ability||45),0)/Math.max(1,players.length);
    const model={ability:averageAbility||45,age:25};
    return Math.max(squad,Math.round(recommendedWage(game,model,club,'First Team')*squad*1.12));
  }
  function weeklyWageSpend(club){
    return roundMoney((club?.players||[]).filter(p=>p.status!=='retired'&&p.status!=='deceased').reduce((n,p)=>n+Math.max(0,Number(p.wage)||0),0));
  }
  function annualRevenue(game,club){
    const year=yearOf(game),base=clubBudget(game,club),eraMultiplier=year<1914?2.45:year<1946?2.15:year<1961?1.9:year<1985?1.65:year<2000?1.48:1.36;
    const attendanceFactor=club?.averageAttendance&&club?.capacity?clamp(Number(club.averageAttendance)/Math.max(1,Number(club.capacity)),.25,1.05):.72;
    const performance=clamp((Number(club?.reputation||club?.stature||45)-45)/250+.93,.78,1.18);
    return roundMoney(base*eraMultiplier*(.72+attendanceFactor*.38)*performance);
  }
  function annualCosts(game,club){
    const year=yearOf(game),base=clubBudget(game,club),playerWages=weeklyWageSpend(club)*52,managerWages=window.FLManagerContracts?FLManagerContracts.annualCost(game,club):0,wages=playerWages+managerWages;
    const operationsRate=year<1914?.24:year<1946?.29:year<1985?.36:year<2000?.41:.46;
    const operations=base*operationsRate;
    return {wages:roundMoney(wages),playerWages:roundMoney(playerWages),managerWages:roundMoney(managerWages),operations:roundMoney(operations),total:roundMoney(wages+operations)};
  }

  function ensureClubFinances(game,club){
    if(!club)return null;
    if(!game.finances||typeof game.finances!=='object')game.finances={};
    const f=game.finances,base=clubBudget(game,club),year=yearOf(game),firstSetup=!Number.isFinite(Number(f.economyYear));
    if(!Number.isFinite(Number(f.balance)))f.balance=base;
    if(!Number.isFinite(Number(f.transferBudget))||(firstSetup&&Number(f.transferBudget)<=0))f.transferBudget=transferBudget(game,club);
    if(!Number.isFinite(Number(f.weeklyWageBudget))||(firstSetup&&Number(f.weeklyWageBudget)<=0))f.weeklyWageBudget=weeklyWageBudget(game,club);
    if(!Number.isFinite(Number(f.income)))f.income=0;
    if(!Number.isFinite(Number(f.expenses)))f.expenses=0;
    f.weeklyWageSpend=weeklyWageSpend(club);
    f.economyYear=Number(f.economyYear)||year;
    return f;
  }
  function ensure(game){
    game.economy=game.economy&&typeof game.economy==='object'?game.economy:{};
    const e=game.economy,year=yearOf(game);
    e.version=VERSION;e.baseYear=e.baseYear||1888;e.lastAppliedYear=Number(e.lastAppliedYear)||year;e.currentYear=year;e.era=eraLabel(year);e.history=Array.isArray(e.history)?e.history:[];
    for(const club of game.clubs||[]){if(!Number.isFinite(Number(club.baseFinance1888))||Number(club.baseFinance1888)<=0)club.baseFinance1888=financeSeed(club);}
    return e;
  }

  function repairImplausibleLegacyWages(game,club){
    const year=yearOf(game);if(year<1900)return 0;
    let changed=0;
    for(const p of club?.players||[]){
      const wage=Number(p.wage)||0;if(wage<=0)continue;
      const benchmark=recommendedWage(game,p,club,p.squadStatus||'First Team');
      // v0.20 multiplied every live contract by the annual wage index. Only
      // repair figures that are unmistakably outside the current market.
      if(wage>Math.max(benchmark*6,benchmark+5000)){
        p.wage=Math.max(1,Math.round(benchmark*(.82+(Number(p.ability||45)%17)/50)));
        changed++;
      }
    }
    return changed;
  }

  function annualUpdate(game,newYear){
    const e=ensure(game),from=Number(e.lastAppliedYear)||Number(newYear)-1,to=Number(newYear)||yearOf(game);
    if(to<=from){e.currentYear=to;e.era=eraLabel(to);return e;}
    const club=(game.clubs||[]).find(c=>c.id===game.controlledClubId);
    if(club){
      const pricingGame={...game,date:`${to}-07-01`};
      const f=ensureClubFinances(game,club),revenue=annualRevenue(pricingGame,club),costs=annualCosts(pricingGame,club),otherIncome=roundMoney(f.income),otherExpenses=roundMoney(f.expenses),result=revenue+otherIncome-costs.total-otherExpenses;
      f.balance=roundMoney(Number(f.balance)+result);
      const previous=Math.max(0,Number(f.transferBudget)||0),allocation=transferBudget(pricingGame,club),retained=Math.max(0,result)*.35;
      f.transferBudget=Math.min(roundMoney(f.balance*.68),roundMoney(previous*.25+allocation+retained));
      f.weeklyWageBudget=weeklyWageBudget(pricingGame,club);
      f.weeklyWageSpend=weeklyWageSpend(club);
      f.lastAnnualRevenue=revenue+otherIncome;
      f.lastAnnualWages=costs.wages;f.lastAnnualPlayerWages=costs.playerWages||costs.wages;f.lastAnnualManagerWages=costs.managerWages||0;
      f.lastAnnualOperations=costs.operations+otherExpenses;
      f.lastAnnualCosts=costs.total+otherExpenses;
      f.lastAnnualResult=result;
      f.lastAccountsYear=to-1;
      f.income=0;f.expenses=0;f.economyYear=to;
      e.history.unshift({year:to-1,clubId:club.id,revenue:f.lastAnnualRevenue,wages:f.lastAnnualWages,operations:f.lastAnnualOperations,result,balance:f.balance,transferBudget:f.transferBudget,wageBudget:f.weeklyWageBudget});
      e.history=e.history.slice(0,80);
    }
    // Existing contracts and cash balances remain nominal. New contracts,
    // valuations, board allocations and future revenue use the new year's index.
    e.lastAppliedYear=to;e.currentYear=to;e.era=eraLabel(to);return e;
  }

  function migrate(game){
    const e=ensure(game),year=yearOf(game),club=(game.clubs||[]).find(c=>c.id===game.controlledClubId);
    if(club)ensureClubFinances(game,club);
    if(!e.migratedV20){
      if(club&&game.finances){
        const base=clubBudget(game,club);
        if(year>1900&&Number(game.finances.balance)<base*.03)game.finances.balance=base;
        repairImplausibleLegacyWages(game,club);
        game.finances.weeklyWageSpend=weeklyWageSpend(club);
      }
      e.migratedV20=true;e.lastAppliedYear=year;
    }
    if(!e.migratedV21Finance){
      if(club&&game.finances){
        game.finances.transferBudget=Math.min(roundMoney(game.finances.balance*.68),Math.max(0,Number(game.finances.transferBudget)||transferBudget(game,club)));
        game.finances.weeklyWageBudget=weeklyWageBudget(game,club);
        game.finances.weeklyWageSpend=weeklyWageSpend(club);
      }
      e.migratedV21Finance=true;e.version=VERSION;e.lastAppliedYear=year;
    }
    if(!e.migratedV4MarketBalance){
      if(club&&game.finances&&year>=2000){
        const benchmark=transferBudget(game,club),current=Math.max(0,Number(game.finances.transferBudget)||0);
        // Previous builds combined inflated player prices with undersized modern budgets.
        // Repair affected saves once so ordinary first-team players are affordable again.
        if(current<benchmark*.72){
          game.finances.balance=Math.max(roundMoney(game.finances.balance),roundMoney(benchmark*1.45));
          game.finances.transferBudget=Math.min(roundMoney(game.finances.balance*.72),benchmark);
        }
      }
      e.migratedV4MarketBalance=true;e.version=VERSION;
    }
    return e;
  }

  return {VERSION,CURVES,index,transferIndex,wageIndex,budgetIndex,eraLabel,playerValue,recommendedWage,clubBudget,transferBudget,weeklyWageBudget,weeklyWageSpend,annualRevenue,annualCosts,ensureClubFinances,ensure,annualUpdate,migrate,yearOf};
})();
