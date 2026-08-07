window.FLDressingRoom = (()=>{
  const DAY=86400000;
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
  const yearOf=d=>Number(String(d||'1888').slice(0,4))||1888;
  function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
  function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
  const pick=(a,r)=>a[Math.floor(r()*a.length)];
  function dateDiff(a,b){return Math.round((new Date(`${b}T12:00:00Z`)-new Date(`${a}T12:00:00Z`))/DAY)}
  function addDays(date,days){const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
  function controlled(game){return (game.clubs||[]).find(c=>c.id===game.controlledClubId)}
  function allPlayers(game){const rows=[];(game.clubs||[]).forEach(c=>(c.players||[]).forEach(p=>rows.push({p,c})));(game.freeAgents||[]).forEach(p=>rows.push({p,c:null}));if(window.FLWorldFootball){try{FLWorldFootball.players(game).forEach(x=>rows.push(x))}catch(e){}}return rows}
  function player(game,id){return allPlayers(game).find(x=>x.p.id===id)?.p||null}
  function roleWeight(p){return p.squadStatus==='First Team'?12:p.squadStatus==='Rotation'?5:p.squadStatus==='Backup'?-4:0}
  function personality(p,key,fallback=50){return Number(p.personalityProfile?.[key]??fallback)}
  function active(p){return p&&p.status!=='retired'&&p.status!=='deceased'&&p.available!==false}
  function staffEra(year){return year<1910?'committee':year<1946?'trainer':year<1970?'coach':year<1992?'department':'modern'}
  function defaultStaff(game){
    const y=yearOf(game.date),r=rng(hash(`${game.meta?.seed||1}-${game.controlledClubId}-staff-${Math.floor(y/10)}`));
    const first=['Arthur','William','George','Edward','Thomas','James','Henry','Frederick','David','Michael','Sarah','Helen','Claire','Louise'];
    const last=['Hughes','Walker','Foster','Bennett','Taylor','Morris','Reed','Clarke','Parker','Walsh'];
    const make=(role,quality,specialism,personalityLabel)=>{const age=28+Math.floor(r()*27),firstName=pick(first,r),female=['Sarah','Helen','Claire','Louise'].includes(firstName),portraitOverride=female?'assets/family-portraits/partners/warm_studio_portrait_of_a_smiling_woman.webp':null;return {id:`dr-staff-${role.toLowerCase().replace(/\W/g,'-')}`,name:`${firstName} ${pick(last,r)}`,gender:female?'female':'male',portraitRole:'staff',portraitOverride,role,quality:clamp(quality+Math.floor(r()*15)-7,25,94),specialism,personality:personalityLabel,trust:45+Math.floor(r()*35),age,birthYear:y-age,appointed:game.date,adviceHistory:[]}};
    const era=staffEra(y),rows=[];
    rows.push(make(y<1910?'Club Secretary':'Assistant Manager',57,'Dressing-room judgement',pick(['Diplomatic','Demanding','Loyal','Analytical'],r)));
    rows.push(make(y<1910?'Team Trainer':'First-Team Coach',55,'Technical development',pick(['Patient','Intense','Traditional','Innovative'],r)));
    if(y>=1900)rows.push(make(y<1940?'Club Scout':'Chief Scout',54,'Character and potential',pick(['Cautious','Instinctive','Meticulous','Adventurous'],r)));
    if(y>=1920)rows.push(make(y<1960?'Club Doctor':y<1990?'Physiotherapist':'Head of Medical',52,'Injury risk and recovery',pick(['Cautious','Pragmatic','Progressive','Conservative'],r)));
    if(y>=1975)rows.push(make('Youth Development Lead',58,'Young-player pathways',pick(['Encouraging','Exacting','Protective','Ambitious'],r)));
    if(y>=1995)rows.push(make('Sports Scientist',60,'Workload and conditioning',pick(['Evidence-led','Conservative','Experimental','Measured'],r)));
    return rows;
  }
  function decoratePlayer(game,p,index=0){
    if(!p)return p;const r=rng(hash(`${game.meta?.seed||1}-${p.id||p.name}-dressing`));
    p.dressingRoom=p.dressingRoom||{};const d=p.dressingRoom;
    d.managerTrust=clamp(d.managerTrust??(42+Math.floor(r()*35)),0,100);
    d.happiness=clamp(d.happiness??(48+Math.floor(r()*35)+roleWeight(p)),0,100);
    d.influence=clamp(d.influence??(Math.round((personality(p,'leadership')*.55)+(Math.min(34,Number(p.age)||20)*1.15)+(Number(p.ability||50)*.12)-18)),5,95);
    d.settling=clamp(d.settling??(p.nationality&&p.nationality!=='English'?45+Math.floor(r()*45):76+Math.floor(r()*20)),0,100);
    d.roleSatisfaction=clamp(d.roleSatisfaction??(p.squadStatus==='First Team'?78:p.squadStatus==='Rotation'?65:52),0,100);
    d.trainingHappiness=clamp(d.trainingHappiness??(52+Math.floor(r()*35)),0,100);
    d.groupId=d.groupId||null;d.concern=d.concern||null;d.lastConversation=d.lastConversation||null;d.conversationCooldownUntil=d.conversationCooldownUntil||null;
    d.relationships=d.relationships||{};d.promises=Array.isArray(d.promises)?d.promises:[];d.mentoredBy=d.mentoredBy||null;d.mentoring=d.mentoring||null;
    p.trainingPlan=p.trainingPlan||{focus:'Balanced development',intensity:'Normal',position:p.position,reviewDate:addDays(game.date,28)};
    p.developmentPathway=p.developmentPathway||{type:p.age<=20?'Youth development':'First-team squad',since:game.date,availableForLoan:false,loan:null,reserveApps:0};
    p.injuries=Array.isArray(p.injuries)?p.injuries:[];
    return p;
  }
  function ensure(game){
    const club=controlled(game);if(!club)return null;
    game.dressingRoom=game.dressingRoom||{};const s=game.dressingRoom;
    s.version='1.0';s.ui=s.ui||{view:'overview',selectedPlayerId:null,compact:true};
    s.training=s.training||{teamFocus:'Balanced',intensity:'Normal',rest:'Balanced',matchPreparation:'Shape and familiarity',setPieceShare:10,weekKey:null,history:[]};
    s.staff=s.staff||{members:defaultStaff(game),vacancies:[],history:[]};
    if(!Array.isArray(s.staff.members)||!s.staff.members.length)s.staff.members=defaultStaff(game);
    const eraStaff=defaultStaff(game);eraStaff.forEach(member=>{if(!s.staff.members.some(x=>x.id===member.id))s.staff.members.push(member)});
    const femaleStaffNames=new Set(['Sarah','Helen','Claire','Louise']);s.staff.members.forEach(member=>{const firstName=String(member.name||'').trim().split(/\s+/)[0];if(!member.gender)member.gender=femaleStaffNames.has(firstName)?'female':'male';member.portraitRole=member.portraitRole||'staff';if(member.gender==='female'&&/coach|trainer|assistant|staff|scout|medical|physio|doctor|scientist|development/i.test(String(member.role||'')))member.portraitOverride='assets/family-portraits/partners/warm_studio_portrait_of_a_smiling_woman.webp';});
    (club.staff||[]).forEach((member,index)=>{const id=member.id||`club-staff-${index}-${member.name}`;if(!s.staff.members.some(x=>x.id===id))s.staff.members.push({id,name:member.name,role:member.role||'Coach',quality:Number(member.quality)||55,specialism:member.formerPlayer?'Club knowledge and player relationships':'First-team support',personality:member.formerPlayer?'Loyal club servant':'Measured',trust:65,age:Math.max(30,yearOf(game.date)-Number(String(member.appointed||game.date).slice(0,4))+35),birthYear:yearOf(game.date)-35,appointed:member.appointed||game.date,formerPlayer:Boolean(member.formerPlayer),adviceHistory:[]})});
    s.scouting=s.scouting||{assignments:[],reports:{},networkFocus:'Domestic first team',budget:'Standard'};
    s.medical=s.medical||{cases:[],history:[]};
    s.issues=Array.isArray(s.issues)?s.issues:[];s.groups=Array.isArray(s.groups)?s.groups:[];s.promises=Array.isArray(s.promises)?s.promises:[];s.meetings=Array.isArray(s.meetings)?s.meetings:[];s.transferTalks=Array.isArray(s.transferTalks)?s.transferTalks:[];
    s.captaincy=s.captaincy||{captainId:game.teamManagement?.captain||club.players?.[0]?.id||null,viceCaptainId:null,lastReview:null};
    (club.players||[]).forEach((p,i)=>decoratePlayer(game,p,i));
    rebuildGroups(game);recalculate(game);syncInjuries(game);return s;
  }
  function rebuildGroups(game){
    const s=game.dressingRoom,club=controlled(game),players=(club.players||[]).filter(active);if(!players.length)return[];
    const groups=[];
    const add=(id,name,filter,description)=>{const members=players.filter(filter);if(members.length>=2)groups.push({id,name,description,members:members.map(p=>p.id),influence:Math.round(members.reduce((n,p)=>n+p.dressingRoom.influence,0)/members.length),mood:Math.round(members.reduce((n,p)=>n+p.dressingRoom.happiness,0)/members.length)})};
    add('senior-core','Senior core',p=>p.age>=28||p.dressingRoom.influence>=70,'Experienced voices who carry weight in difficult weeks.');
    add('young-players','Young players',p=>p.age<=21,'Developing players whose confidence can rise or collapse together.');
    add('first-team','First-team regulars',p=>p.squadStatus==='First Team','Regular starters who expect standards and clear selection decisions.');
    add('fringe','Fringe group',p=>['Backup','Prospect'].includes(p.squadStatus)||(p.appearances||0)<2&&p.age>21,'Players watching for opportunities or considering their futures.');
    const nationalities=[...new Set(players.map(p=>p.nationality||'English'))];nationalities.forEach(n=>add(`nation-${n}`,`${n} group`,p=>(p.nationality||'English')===n&&n!=='English',`Players with a shared national background who may help one another settle.`));
    players.forEach(p=>{const memberships=groups.filter(g=>g.members.includes(p.id)).sort((a,b)=>b.influence-a.influence);p.dressingRoom.groupId=memberships[0]?.id||'squad'});
    for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j],shared=groups.some(g=>g.members.includes(a.id)&&g.members.includes(b.id)),r=rng(hash(`${game.meta?.seed||1}-${a.id}-${b.id}-relationship`));let value=48+(shared?13:0)+((personality(a,'teamwork')+personality(b,'teamwork')-100)*.12)+(r()-.5)*18;if(personality(a,'temperament')>75&&personality(b,'temperament')>75)value-=10;a.dressingRoom.relationships[b.id]=clamp(Math.round(value));b.dressingRoom.relationships[a.id]=clamp(Math.round(value))}
    s.groups=groups;return groups;
  }
  function captainBonus(game){const s=game.dressingRoom,p=controlled(game).players.find(x=>x.id===s.captaincy.captainId);if(!p)return 0;return ((personality(p,'leadership')-50)*.08)+((p.dressingRoom.managerTrust-50)*.04)}
  function recalculate(game){
    const s=game.dressingRoom,players=(controlled(game).players||[]).filter(active);if(!players.length)return s;
    const happiness=players.reduce((n,p)=>n+p.dressingRoom.happiness,0)/players.length,trust=players.reduce((n,p)=>n+p.dressingRoom.managerTrust,0)/players.length,teamwork=players.reduce((n,p)=>n+personality(p,'teamwork'),0)/players.length;
    const unresolved=s.issues.filter(i=>i.status==='open').reduce((n,i)=>n+(i.severity||1)*2.2,0),promiseRisk=s.promises.filter(p=>p.status==='active'&&p.dueDate<game.date).length*5;
    s.harmony=clamp(Math.round(happiness*.44+trust*.26+teamwork*.22+captainBonus(game)-unresolved-promiseRisk+6),0,100);
    s.managerSupport=clamp(Math.round(trust*.65+happiness*.2+(game.boardConfidence||50)*.15),0,100);
    s.moodLabel=s.harmony>=82?'United':s.harmony>=68?'Positive':s.harmony>=52?'Stable':s.harmony>=38?'Uneasy':'Fractured';
    players.forEach(p=>p.morale=p.dressingRoom.happiness>=80?'Excellent':p.dressingRoom.happiness>=64?'Good':p.dressingRoom.happiness>=45?'Fair':p.dressingRoom.happiness>=28?'Poor':'Very Poor');
    return s;
  }
  function concernFor(game,p){
    const d=p.dressingRoom;if(d.concern)return d.concern;
    const unused=(p.appearances||0)<2&&yearOf(game.date)>=Number(String(game.date).slice(0,4));
    if(d.roleSatisfaction<38||unused&&p.squadStatus==='First Team')return {type:'playing-time',title:'Wants more football',detail:`${p.name} believes the current role does not match previous expectations.`,severity:2};
    if(d.trainingHappiness<35)return {type:'training',title:'Unhappy with training',detail:`${p.name} feels the present workload or individual focus is not helping.`,severity:1};
    if(d.settling<35)return {type:'settling',title:'Struggling to settle',detail:`${p.name} has not yet found a place socially or away from football.`,severity:1};
    if(d.managerTrust<30)return {type:'trust',title:'Trust in the manager is low',detail:`${p.name} is increasingly doubtful about your judgement and communication.`,severity:3};
    return null;
  }
  function generateIssue(game){
    const s=ensure(game);if(s.issues.some(i=>i.status==='open'))return null;
    const candidates=controlled(game).players.filter(active).map(p=>({p,c:concernFor(game,p)})).filter(x=>x.c).sort((a,b)=>b.c.severity-a.c.severity||a.p.dressingRoom.happiness-b.p.dressingRoom.happiness);if(!candidates.length)return null;
    const chosen=candidates[0],issue={id:`issue-${game.date}-${chosen.p.id}`,playerId:chosen.p.id,status:'open',date:game.date,...chosen.c};chosen.p.dressingRoom.concern=chosen.c;s.issues.unshift(issue);return issue;
  }
  function conversationOptions(issue){
    const common=[
      {id:'listen',label:'Listen and acknowledge it',tone:'Empathetic',effect:'Build trust without making a firm promise.'},
      {id:'challenge',label:'Challenge the player to earn it',tone:'Demanding',effect:'Motivates strong personalities but risks conflict.'},
      {id:'promise',label:'Make a clear promise',tone:'Committed',effect:'Big immediate lift; serious damage if broken.'},
      {id:'dismiss',label:'Dismiss the complaint',tone:'Blunt',effect:'Ends the discussion quickly but may anger the group.'}
    ];
    if(issue?.type==='settling')common[2]={id:'support',label:'Arrange practical support',tone:'Supportive',effect:'Use staff and senior players to help them settle.'};
    if(issue?.type==='training')common[2]={id:'change-plan',label:'Change the individual plan',tone:'Flexible',effect:'Adjust the workload and review it in four weeks.'};
    return common;
  }
  function resolveIssue(game,issueId,choice){
    const s=ensure(game),issue=s.issues.find(i=>i.id===issueId&&i.status==='open');if(!issue)return {ok:false,message:'That issue is no longer active.'};const p=controlled(game).players.find(x=>x.id===issue.playerId);if(!p)return {ok:false,message:'Player not found.'};const d=p.dressingRoom,lead=personality(p,'leadership'),prof=personality(p,'professionalism');let result='';
    if(choice==='listen'){d.managerTrust=clamp(d.managerTrust+7);d.happiness=clamp(d.happiness+4);result='The player appreciates being heard, although the underlying issue remains partly unresolved.'}
    else if(choice==='challenge'){const responds=(prof+personality(p,'determination'))/2>=58;d.managerTrust=clamp(d.managerTrust+(responds?4:-8));d.happiness=clamp(d.happiness+(responds?6:-9));result=responds?'The challenge is accepted. The player leaves determined to force the issue.':'The player feels publicly judged and the relationship worsens.'}
    else if(choice==='promise'){const type=issue.type==='playing-time'?'Give meaningful first-team minutes':issue.type==='trust'?'Speak honestly again within a month':'Review the concern';const promise={id:`promise-${Date.now()}-${p.id}`,playerId:p.id,type,status:'active',madeDate:game.date,dueDate:addDays(game.date,35),targetApps:issue.type==='playing-time'?Math.max(3,Number(p.appearances||0)+3):null,startingApps:Number(p.appearances||0)};s.promises.unshift(promise);d.promises.push(promise.id);d.managerTrust=clamp(d.managerTrust+10);d.happiness=clamp(d.happiness+10);result='The player accepts your promise. The dressing room will remember whether it is kept.'}
    else if(choice==='support'){d.settling=clamp(d.settling+22);d.happiness=clamp(d.happiness+9);d.managerTrust=clamp(d.managerTrust+6);result='The club arranges practical help and a senior player checks in regularly.'}
    else if(choice==='change-plan'){p.trainingPlan.intensity='Light';p.trainingPlan.focus='Confidence and fundamentals';p.trainingPlan.reviewDate=addDays(game.date,28);d.trainingHappiness=clamp(d.trainingHappiness+18);d.managerTrust=clamp(d.managerTrust+5);result='The individual plan is changed and a four-week review is booked.'}
    else{d.managerTrust=clamp(d.managerTrust-12);d.happiness=clamp(d.happiness-10);if(lead>70)s.groups.filter(g=>g.members.includes(p.id)).forEach(g=>g.mood=clamp(g.mood-5));result='The complaint is closed, but the player and close teammates are unhappy with how it was handled.'}
    d.concern=null;d.lastConversation={date:game.date,choice,result};d.conversationCooldownUntil=addDays(game.date,21);issue.status='resolved';issue.choice=choice;issue.result=result;issue.resolvedDate=game.date;s.meetings.unshift({date:game.date,playerId:p.id,player:p.name,topic:issue.title,choice,result});rebuildGroups(game);recalculate(game);return {ok:true,message:result};
  }
  function playerTalk(game,playerId,type){
    const s=ensure(game),p=controlled(game).players.find(x=>x.id===playerId);if(!p)return {ok:false,message:'Player not found.'};const d=p.dressingRoom;if(d.conversationCooldownUntil&&d.conversationCooldownUntil>game.date)return {ok:false,message:`${p.name} has spoken with you recently. Give the conversation time to settle.`};let message='';
    if(type==='praise'){const deserved=['Good','Excellent'].includes(p.form)||Number(p.averageRating)>=7;if(deserved){d.happiness=clamp(d.happiness+7);d.managerTrust=clamp(d.managerTrust+5);message=`${p.name} appreciates the recognition and feels the praise was earned.`}else{d.managerTrust=clamp(d.managerTrust-2);message=`${p.name} accepts the praise politely, but it feels slightly forced.`}}
    else if(type==='check-in'){d.settling=clamp(d.settling+8);d.happiness=clamp(d.happiness+4);d.managerTrust=clamp(d.managerTrust+4);message=`The private check-in helps ${p.name} feel noticed beyond match selection.`}
    else if(type==='role'){d.roleSatisfaction=clamp(d.roleSatisfaction+4);d.managerTrust=clamp(d.managerTrust+3);message=`You explain exactly where ${p.name} currently stands in the squad. The clarity is useful, even if the answer is not perfect.`}
    else if(type==='standards'){const responds=(personality(p,'professionalism')+personality(p,'determination'))/2>=55;d.trainingHappiness=clamp(d.trainingHappiness+(responds?6:-5));d.managerTrust=clamp(d.managerTrust+(responds?3:-5));message=responds?`${p.name} accepts the demand for higher standards and responds positively.`:`${p.name} feels singled out and leaves the conversation frustrated.`}
    else return {ok:false,message:'That conversation is not available.'};
    d.lastConversation={date:game.date,choice:type,result:message};d.conversationCooldownUntil=addDays(game.date,14);s.meetings.unshift({date:game.date,playerId:p.id,player:p.name,topic:'Manager-initiated conversation',choice:type,result:message});recalculate(game);return {ok:true,message};
  }
  function setCaptain(game,captainId,viceCaptainId=null){
    const s=ensure(game),club=controlled(game),captain=club.players.find(p=>p.id===captainId),vice=club.players.find(p=>p.id===viceCaptainId);if(!captain)return {ok:false,message:'Choose a captain from the squad.'};const old=club.players.find(p=>p.id===s.captaincy.captainId);
    if(old&&old.id!==captain.id){old.dressingRoom.happiness=clamp(old.dressingRoom.happiness-(old.dressingRoom.influence>65?10:5));old.dressingRoom.managerTrust=clamp(old.dressingRoom.managerTrust-4)}
    s.captaincy={captainId:captain.id,viceCaptainId:vice?.id||null,lastReview:game.date};if(game.teamManagement)game.teamManagement.captain=captain.id;captain.dressingRoom.happiness=clamp(captain.dressingRoom.happiness+8);captain.dressingRoom.managerTrust=clamp(captain.dressingRoom.managerTrust+7);recalculate(game);return {ok:true,message:`${captain.name} is now club captain${vice?`, with ${vice.name} as vice-captain`:''}.`};
  }
  function trainingEra(game){const y=yearOf(game.date);if(y<1900)return {label:'Informal evening training',science:12,description:'Fitness work, basic ball practice and match discussion remain simple and player-led.'};if(y<1946)return {label:'Trainer-led preparation',science:28,description:'Conditioning and repeated drills improve, but tactical and medical knowledge remain limited.'};if(y<1975)return {label:'Professional coaching',science:48,description:'Structured technical work, shape training and recovery become normal.'};if(y<1995)return {label:'Specialist departments emerge',science:68,description:'Dedicated fitness, youth and medical work allow more individual planning.'};return {label:'Integrated performance programme',science:88,description:'Coaches, analysts, medical staff and sports science coordinate workload and development.'}}
  const focusEffects={
    'Balanced':{development:1,condition:1,harmony:1},'Fitness':{development:.7,condition:2,harmony:-1},'Technical work':{development:1.25,condition:0,harmony:0},'Defensive organisation':{development:.9,condition:0,harmony:1},'Attacking movement':{development:1.05,condition:0,harmony:0},'Set pieces':{development:.75,condition:1,harmony:1},'Recovery':{development:.35,condition:4,harmony:2},'Youth integration':{development:.95,condition:0,harmony:2}
  };
  function setTeamTraining(game,patch){const s=ensure(game);Object.assign(s.training,patch);s.training.history.unshift({date:game.date,...patch});if(s.training.history.length>40)s.training.history.length=40;return {ok:true,message:'The weekly training programme has been updated.'}}
  function setIndividualTraining(game,playerId,patch){const p=controlled(game).players.find(x=>x.id===playerId);if(!p)return {ok:false,message:'Player not found.'};decoratePlayer(game,p);Object.assign(p.trainingPlan,patch,{reviewDate:addDays(game.date,28)});p.dressingRoom.trainingHappiness=clamp(p.dressingRoom.trainingHappiness+(patch.intensity==='Heavy'?-4:3));return {ok:true,message:`${p.name}'s individual plan has been updated.`}}
  function setMentor(game,youngId,mentorId){const club=controlled(game),young=club.players.find(p=>p.id===youngId),mentor=club.players.find(p=>p.id===mentorId);if(!young||!mentor||young.id===mentor.id)return {ok:false,message:'Choose two different players.'};young.dressingRoom.mentoredBy=mentor.id;mentor.dressingRoom.mentoring=young.id;young.dressingRoom.settling=clamp(young.dressingRoom.settling+6);return {ok:true,message:`${mentor.name} will mentor ${young.name}.`}}
  function setPathway(game,playerId,type){
    const s=ensure(game),club=controlled(game),p=club.players.find(x=>x.id===playerId);if(!p)return {ok:false,message:'Player not found.'};p.developmentPathway=p.developmentPathway||{};p.developmentPathway.type=type;p.developmentPathway.since=game.date;p.developmentPathway.availableForLoan=type==='Available for loan';
    if(type!=='On loan'&&p.developmentPathway.loan&&p.developmentPathway.loan.until<=game.date){p.developmentPathway.loan=null;p.available=true}
    if(type==='Available for loan'){p.dressingRoom.happiness=clamp(p.dressingRoom.happiness+(p.age<=23?3:-2));p.dressingRoom.roleSatisfaction=clamp(p.dressingRoom.roleSatisfaction+2)}
    if(type==='First-team squad'){p.available=true;p.developmentPathway.availableForLoan=false}
    if(type==='Reserve football'){p.available=true;p.dressingRoom.trainingHappiness=clamp(p.dressingRoom.trainingHappiness+2)}
    return {ok:true,message:`${p.name}'s pathway is now ${type.toLowerCase()}.`};
  }
  function placeLoan(game,p){
    const y=yearOf(game.date),r=rng(hash(`${game.meta?.seed||1}-${p.id}-${y}-loan`)),clubs=(game.clubs||[]).filter(c=>c.id!==game.controlledClubId&&c.leagueActive!==false).sort((a,b)=>Math.abs((a.strength||3)-(controlled(game).strength||3))-Math.abs((b.strength||3)-(controlled(game).strength||3)));if(!clubs.length)return null;const dest=clubs[Math.floor(r()*Math.min(8,clubs.length))],until=`${game.date.slice(5)<='06-30'?y:y+1}-06-30`;p.developmentPathway.type='On loan';p.developmentPathway.availableForLoan=false;p.developmentPathway.loan={clubId:dest.id,club:dest.name,from:game.date,until,apps:0,goals:0,rating:'—'};p.available=false;
    if(game.teamManagement){game.teamManagement.startingXI=(game.teamManagement.startingXI||[]).map(id=>id===p.id?null:id);game.teamManagement.substitutes=(game.teamManagement.substitutes||[]).filter(id=>id!==p.id)}
    game.inbox.unshift({id:`loan-${p.id}-${game.date}`,date:game.date,from:'Club Secretary',subject:`Loan arranged: ${p.name}`,body:`${p.name} will spend the season with ${dest.name}. Playing time and the quality of that environment will shape the development outcome.`,read:false});return dest;
  }
  function processPathways(game,weekKey){
    const club=controlled(game),rbase=`${game.meta?.seed||1}-${weekKey}-pathways`;club.players.filter(active).forEach((p,i)=>{const path=p.developmentPathway||{};const r=rng(hash(`${rbase}-${p.id}`));if(path.type==='Available for loan'&&!path.loan&&dateDiff(path.since||game.date,game.date)>=7&&r()<.22)placeLoan(game,p);if(path.type==='Reserve football'){path.reserveApps=Number(path.reserveApps||0)+1;if(r()<.035&&p.ability<(p.ceiling||99))p.ability++;p.condition=clamp(p.condition-1,55,100)}if(path.type==='Youth development'&&p.age<=21&&r()<.025&&p.ability<(p.ceiling||99))p.ability++;});
    club.players.forEach(p=>{const loan=p.developmentPathway?.loan;if(!loan)return;if(loan.until<=game.date){p.available=true;p.developmentPathway.type='First-team squad';p.developmentPathway.loan=null;p.dressingRoom.roleSatisfaction=clamp(p.dressingRoom.roleSatisfaction+6);game.inbox.unshift({id:`loan-return-${p.id}-${game.date}`,date:game.date,from:'Development Staff',subject:`${p.name} returns from loan`,body:`${p.name} returns after ${loan.apps} appearances for ${loan.club}. The development staff have prepared a new first-team assessment.`,read:false});return}const r=rng(hash(`${rbase}-${p.id}-loan`)),played=r()<.72;if(played){loan.apps++;if(['CF','IF','W'].includes(p.position)&&r()<.18)loan.goals++;const rating=5.9+r()*2;loan.rating=loan.rating==='—'?rating.toFixed(2):((Number(loan.rating)*Math.max(0,loan.apps-1)+rating)/loan.apps).toFixed(2);if(r()<.045&&p.ability<(p.ceiling||99))p.ability++;}})
  }
  function weeklyTraining(game){
    const s=ensure(game),weekKey=`${game.date.slice(0,4)}-${Math.ceil((new Date(`${game.date}T12:00:00Z`)-new Date(`${game.date.slice(0,4)}-01-01T12:00:00Z`))/DAY/7)}`;if(s.training.weekKey===weekKey)return;s.training.weekKey=weekKey;
    const club=controlled(game),era=trainingEra(game),coach=s.staff.members.find(m=>/Coach|Trainer/.test(m.role))||s.staff.members[0],medical=s.staff.members.find(m=>/Medical|Physio|Doctor|Scientist/.test(m.role)),team=focusEffects[s.training.teamFocus]||focusEffects.Balanced;
    const intensityMod=s.training.intensity==='Heavy'?1.22:s.training.intensity==='Light'?.72:1,injuryLoad=s.training.intensity==='Heavy'?1.5:s.training.intensity==='Light'?.55:1;
    club.players.filter(active).forEach(p=>{const d=p.dressingRoom,prof=personality(p,'professionalism')/100,det=personality(p,'determination')/100,age=Number(p.age||24),individual=p.trainingPlan?.intensity==='Heavy'?1.15:p.trainingPlan?.intensity==='Light'?.75:1,coachMod=.65+(Number(coach?.quality||50)/140),eraMod=.55+era.science/180;
      const growthChance=Math.max(.002,((Number(p.ceiling||p.ability)-Number(p.ability||0))/100)*.055*team.development*intensityMod*individual*coachMod*eraMod*(.7+prof*.35+det*.25)*(age<=21?1.45:age<=25?1:age<=29?.45:.08));
      const r=rng(hash(`${game.meta?.seed||1}-${p.id}-${weekKey}-training`));if(r()<growthChance)p.ability=clamp(p.ability+1,p.ability,Math.min(99,p.ceiling||99));
      p.condition=clamp(p.condition+(team.condition||0)+(s.training.rest==='More rest'?2:s.training.rest==='Less rest'?-1:0),45,100);d.trainingHappiness=clamp(d.trainingHappiness+(team.harmony||0)+(p.trainingPlan?.focus===s.training.teamFocus?1:0));
      const injuryRisk=((personality(p,'injuryProneness')/100)*.006+.0008)*injuryLoad*individual*(1-(Number(medical?.quality||35)/180));if(r()<injuryRisk&&!p.injuries.length){const injuries=['Hamstring strain','Ankle sprain','Groin strain','Knee inflammation','Calf strain'],days=7+Math.floor(r()*35),inj={id:`training-injury-${p.id}-${game.date}`,name:pick(injuries,r),from:game.date,days,dueDate:addDays(game.date,days),source:'Training',severity:days>28?'Serious':days>14?'Moderate':'Minor'};p.injuries.push(inj);s.medical.cases.unshift({id:inj.id,playerId:p.id,injury:inj.name,date:game.date,dueDate:inj.dueDate,status:'Awaiting decision',options:medicalOptions(game,p,inj)});}
      if(d.mentoredBy){const mentor=club.players.find(x=>x.id===d.mentoredBy);if(mentor){d.managerTrust=clamp(d.managerTrust+.5);d.settling=clamp(d.settling+1);if(personality(mentor,'professionalism')>70&&r()<.04)p.personalityProfile.professionalism=clamp(personality(p,'professionalism')+1)}}
    });processPathways(game,weekKey);recalculate(game);
  }
  function medicalOptions(game,p,inj){const y=yearOf(game.date),modern=y>=1970;return [
    {id:'rest',label:'Conservative rest',detail:'Safest recovery with a slower return.'},
    {id:'specialist',label:modern?'Send to a specialist':'Seek an outside physician',detail:'Costs money but improves diagnosis and lowers recurrence risk.'},
    {id:'play-through',label:'Allow a managed return through pain',detail:'Earlier availability with a meaningful aggravation risk.'},
    ...(modern?[{id:'surgery',label:'Approve surgery',detail:'Longer absence but better long-term outcome for serious injuries.'}]:[])
  ]}
  function syncInjuries(game){const s=game.dressingRoom,club=controlled(game);club.players.forEach(p=>{p.injuries=(p.injuries||[]).filter(inj=>{if(inj.dueDate&&inj.dueDate<=game.date){s.medical.history.unshift({date:game.date,playerId:p.id,injury:inj.name,outcome:'Returned to training'});return false}return true});(p.injuries||[]).forEach(inj=>{if(!s.medical.cases.some(c=>c.id===inj.id))s.medical.cases.push({id:inj.id||`case-${p.id}-${inj.name}`,playerId:p.id,injury:inj.name,date:inj.from||game.date,dueDate:inj.dueDate||addDays(game.date,Number(inj.days)||14),status:'Monitoring',options:medicalOptions(game,p,inj)})})})}
  function medicalDecision(game,caseId,choice){const s=ensure(game),row=s.medical.cases.find(c=>c.id===caseId&&c.status!=='Closed');if(!row)return {ok:false,message:'That medical case is no longer active.'};const p=controlled(game).players.find(x=>x.id===row.playerId),inj=p?.injuries?.find(i=>i.id===caseId)||p?.injuries?.[0];if(!p||!inj)return {ok:false,message:'Player or injury not found.'};let message='';
    if(choice==='rest'){inj.dueDate=addDays(game.date,Math.max(7,dateDiff(game.date,inj.dueDate)));p.dressingRoom.managerTrust=clamp(p.dressingRoom.managerTrust+3);message='The medical team will use a conservative recovery plan.'}
    if(choice==='specialist'){game.finances.balance=Math.max(0,(game.finances.balance||0)-Math.max(2,Math.round(yearOf(game.date)/100)));inj.dueDate=addDays(game.date,Math.max(5,Math.round(dateDiff(game.date,inj.dueDate)*.82)));p.personalityProfile.injuryProneness=clamp(personality(p,'injuryProneness')-3);message='The specialist clarifies the diagnosis and improves the recovery plan.'}
    if(choice==='play-through'){inj.dueDate=addDays(game.date,Math.max(2,Math.round(dateDiff(game.date,inj.dueDate)*.45)));p.condition=clamp(p.condition-8,35,100);p.dressingRoom.happiness=clamp(p.dressingRoom.happiness+2);p.dressingRoom.managerTrust=clamp(p.dressingRoom.managerTrust-(personality(p,'professionalism')>65?1:5));message='The player returns sooner, although the injury may recur.'}
    if(choice==='surgery'){inj.dueDate=addDays(game.date,Math.max(35,dateDiff(game.date,inj.dueDate)+28));p.personalityProfile.injuryProneness=clamp(personality(p,'injuryProneness')-8);message='Surgery ends the immediate season plan but improves the long-term outlook.'}
    row.status='Closed';row.choice=choice;row.outcome=message;row.closedDate=game.date;s.medical.history.unshift({...row});return {ok:true,message};
  }
  function staffAdvice(game,memberId){const s=ensure(game),m=s.staff.members.find(x=>x.id===memberId);if(!m)return {ok:false,message:'Staff member not found.'};const open=s.issues.find(i=>i.status==='open'),low=[...controlled(game).players].sort((a,b)=>a.dressingRoom.happiness-b.dressingRoom.happiness)[0],message=open?`${m.name} recommends dealing with ${player(game,open.playerId)?.name}'s concern before it spreads.`:low&&low.dressingRoom.happiness<55?`${m.name} believes ${low.name} needs a quiet conversation.`:`${m.name} reports that the group is broadly stable and recommends keeping communication consistent.`;m.adviceHistory.unshift({date:game.date,message});return {ok:true,message};}
  function scoutQuality(game){const s=ensure(game),scout=s.staff.members.find(m=>/Scout/.test(m.role));return Number(scout?.quality||48)}
  function startScout(game,playerId,duration=14,focus='Full report'){
    const s=ensure(game),found=allPlayers(game).find(x=>x.p.id===playerId);if(!found)return {ok:false,message:'Player not found.'};if(s.scouting.assignments.some(a=>a.playerId===playerId&&a.status==='active'))return {ok:false,message:'A scout is already watching this player.'};const assignment={id:`scout-${playerId}-${Date.now()}`,playerId,player:found.p.name,club:found.c?.name||'Unattached',focus,duration:Number(duration),startDate:game.date,dueDate:addDays(game.date,Number(duration)),status:'active'};s.scouting.assignments.unshift(assignment);return {ok:true,message:`A ${duration}-day ${focus.toLowerCase()} assignment has begun for ${found.p.name}.`,assignment};
  }
  function finishScouting(game){const s=ensure(game),quality=scoutQuality(game);s.scouting.assignments.filter(a=>a.status==='active'&&a.dueDate<=game.date).forEach(a=>{const found=allPlayers(game).find(x=>x.p.id===a.playerId);if(!found){a.status='cancelled';return}const p=found.p,r=rng(hash(`${game.meta?.seed||1}-${a.id}-report`)),confidence=clamp(Math.round(30+a.duration*1.25+quality*.35),35,96),noise=Math.round((1-confidence/100)*14),estimate=v=>clamp(Math.round(Number(v||50)+(r()-.5)*noise),1,99),traits=[];if(personality(p,'professionalism')>=72)traits.push('Highly professional');if(personality(p,'bigMatches')>=72)traits.push('Strong in major matches');if(personality(p,'consistency')<40)traits.push('Inconsistent');if(personality(p,'injuryProneness')>=65)traits.push('Concerning injury record');if(personality(p,'adaptability')<40)traits.push('May struggle to settle');
      const report={playerId:p.id,date:game.date,confidence,ability:estimate(p.ability),potentialLabel:window.FLLivingWorld?FLLivingWorld.potentialAssessment(game,p,found.c).label:'Promising',feeView:found.c?`Likely to require a meaningful fee from ${found.c.name}`:'Available without a club fee',mentality:confidence>=58?traits:['Character remains uncertain'],fit:estimate((personality(p,'teamwork')+personality(p,'adaptability'))/2),recommendation:confidence>=75&&p.ability>=70?'Strongly recommend':confidence>=55&&p.ability>=62?'Worth pursuing':'Continue monitoring',scout: s.staff.members.find(m=>/Scout/.test(m.role))?.name||'Club scout'};s.scouting.reports[p.id]=report;a.status='complete';a.completedDate=game.date;game.inbox.unshift({id:`scout-report-${a.id}`,date:game.date,from:report.scout,subject:`Scouting report complete: ${p.name}`,body:`${report.recommendation}. Current ability estimate ${report.ability}; potential outlook: ${report.potentialLabel}. Confidence ${report.confidence}%.`,read:false});});
  }
  function report(game,playerId){return ensure(game).scouting.reports[playerId]||null}
  function recruitmentPitch(game,playerId,pitch){const s=ensure(game),found=allPlayers(game).find(x=>x.p.id===playerId);if(!found)return {ok:false,message:'Player not found.'};const p=found.p,amb=personality(p,'ambition'),loy=personality(p,'loyalty'),adapt=personality(p,'adaptability'),club=controlled(game),base=(club.stature||club.strength*12||50)-(found.c?.stature||45)+50;let appeal=base;
    const labels={project:'Explain the long-term project',playing:'Promise important first-team football',captain:'Offer a leadership role',family:'Emphasise location and stability',money:'Lead with the strongest financial package'};
    if(pitch==='project')appeal+=(amb-50)*.18+(game.boardConfidence-50)*.15;
    if(pitch==='playing')appeal+=12+(p.squadStatus==='Backup'?8:0);
    if(pitch==='captain')appeal+=(personality(p,'leadership')-45)*.25;
    if(pitch==='family')appeal+=(loy-45)*.25+(adapt<45?10:0);
    if(pitch==='money')appeal+=15+(100-loy)*.08;
    const accepted=appeal>=55,r={id:`talk-${Date.now()}-${p.id}`,playerId:p.id,date:game.date,pitch,label:labels[pitch]||pitch,response:accepted?'Interested':'Unconvinced',appeal:Math.round(appeal),status:accepted?'open':'closed'};s.transferTalks.unshift(r);
    if(accepted&&['playing','captain'].includes(pitch))s.promises.unshift({id:`recruit-promise-${r.id}`,playerId:p.id,type:pitch==='playing'?'Important playing time':'Leadership role',status:'proposed',madeDate:game.date,dueDate:addDays(game.date,120),external:true});
    return {ok:true,message:accepted?`${p.name} responds positively. The chosen promise will form part of any formal negotiation.`:`${p.name} is not convinced by that approach and wants stronger reasons to move.`,talk:r};
  }
  function formalOffer(game,playerId,terms={}){
    const s=ensure(game),found=allPlayers(game).find(x=>x.p.id===playerId);if(!found)return {ok:false,message:'Player not found.'};const p=found.p,club=controlled(game),role=terms.role||'First Team',years=clamp(Number(terms.years)||2,1,5),packageType=terms.packageType||'Balanced',clause=terms.clause||'None';let appeal=48+((club.stature||50)-(found.c?.stature||45))*.7+(game.boardConfidence-50)*.12;
    if(role==='Key Player')appeal+=12+(personality(p,'ambition')-50)*.1;if(role==='First Team')appeal+=7;if(role==='Rotation')appeal+=(p.age<=21?4:-4);if(role==='Prospect')appeal+=(p.age<=19?8:-12);
    if(packageType==='High wage')appeal+=14+(100-personality(p,'loyalty'))*.06;if(packageType==='Appearance-heavy')appeal+=(personality(p,'ambition')-45)*.1;if(packageType==='Goal bonus')appeal+=['CF','IF','W'].includes(p.position)?8:1;
    if(clause==='Release clause')appeal+=(personality(p,'ambition')-45)*.12;if(clause==='Promise to consider major bids')appeal+=8;if(years>=4&&personality(p,'loyalty')>60)appeal+=5;if(years>=4&&personality(p,'ambition')>75)appeal-=4;
    const interest=appeal>=67?'Very interested':appeal>=54?'Open to talks':appeal>=43?'Needs improvement':'Uninterested',status=appeal>=54?'submitted':'rejected';const row={id:`formal-offer-${Date.now()}-${p.id}`,playerId:p.id,player:p.name,club:found.c?.name||'Unattached',date:game.date,terms:{role,years,packageType,clause},appeal:Math.round(appeal),interest,status};s.transferTalks.unshift(row);
    if(status==='submitted'){const world=game.worldUI||(game.worldUI={negotiations:[]});world.negotiations=Array.isArray(world.negotiations)?world.negotiations:[];world.negotiations=world.negotiations.filter(n=>n.playerId!==p.id);world.negotiations.unshift({id:row.id,playerId:p.id,action:`Formal offer · ${role} · ${years} years`,date:game.date,terms:row.terms});if(['Key Player','First Team'].includes(role))s.promises.unshift({id:`offer-role-${row.id}`,playerId:p.id,type:`${role} playing status`,status:'proposed',madeDate:game.date,dueDate:addDays(game.date,150),external:true});}
    const message=status==='submitted'?`${p.name} is ${interest.toLowerCase()} and the formal package has been submitted.`:`${p.name} is ${interest.toLowerCase()}; the representatives ask for a stronger role or financial package.`;return {ok:true,message,offer:row};
  }
  function checkPromises(game){const s=ensure(game),club=controlled(game);s.promises.filter(x=>x.status==='active'&&x.dueDate<=game.date).forEach(pr=>{const p=club.players.find(x=>x.id===pr.playerId);if(!p){pr.status='void';return}let kept=true;if(pr.targetApps!=null)kept=(p.appearances||0)>=pr.targetApps;if(kept){pr.status='kept';p.dressingRoom.managerTrust=clamp(p.dressingRoom.managerTrust+10);p.dressingRoom.happiness=clamp(p.dressingRoom.happiness+7)}else{pr.status='broken';p.dressingRoom.managerTrust=clamp(p.dressingRoom.managerTrust-20);p.dressingRoom.happiness=clamp(p.dressingRoom.happiness-15);s.issues.unshift({id:`broken-${pr.id}`,playerId:p.id,status:'open',date:game.date,type:'broken-promise',title:'Broken manager promise',detail:`${p.name} believes you failed to honour a clear commitment.`,severity:3})}})}
  function afterMatch(game,record){
    const s=ensure(game);if(record.dressingRoomApplied)return;record.dressingRoomApplied=true;const club=controlled(game),ours=record.homeId===club.id?record.homeGoals:record.awayGoals,theirs=record.homeId===club.id?record.awayGoals:record.homeGoals,performances=(record.playerPerformances||[]).filter(x=>x.clubId===club.id),used=new Set(performances.map(x=>x.playerId));
    club.players.filter(active).forEach(p=>{const d=p.dressingRoom,played=used.has(p.id),perf=performances.find(x=>x.playerId===p.id);if(played){d.roleSatisfaction=clamp(d.roleSatisfaction+(perf?.starter?2:1));d.happiness=clamp(d.happiness+(ours>theirs?3:ours===theirs?0:-2)+(perf?.rating>=7.5?2:0));d.managerTrust=clamp(d.managerTrust+(ours>theirs?1:0))}else if(p.squadStatus==='First Team'){d.roleSatisfaction=clamp(d.roleSatisfaction-4);d.happiness=clamp(d.happiness-2)}else if(p.squadStatus==='Rotation'){d.roleSatisfaction=clamp(d.roleSatisfaction-1)}});generateIssue(game);rebuildGroups(game);recalculate(game);
  }
  function dailyTick(game,previousDate){ensure(game);weeklyTraining(game);finishScouting(game);syncInjuries(game);checkPromises(game);if(new Date(`${game.date}T12:00:00Z`).getUTCDay()===1)generateIssue(game);rebuildGroups(game);recalculate(game)}
  function annualUpdate(game,year){const s=ensure(game),retired=[];s.staff.members.forEach(m=>{m.age=Number(m.age||Math.max(30,year-Number(m.birthYear||year-40)))+1;m.quality=clamp(m.quality+(year%3===0?1:0),25,96);m.trust=clamp(m.trust+1);const r=rng(hash(`${game.meta?.seed||1}-${m.id}-${year}-staff-life`));if(m.age>=70||m.age>=64&&r()<.18)retired.push(m)});retired.forEach(m=>{s.staff.history.unshift({...m,left:`${year}-07-01`,reason:'Retired from football'});s.staff.members=s.staff.members.filter(x=>x.id!==m.id);if(m.role==='Assistant Manager'&&m.quality>=72){const vacancy=(game.clubs||[]).find(c=>c.id!==game.controlledClubId&&c.managerProfile&&!c.managerProfile.user);if(vacancy){vacancy.managerProfile={id:`manager-from-staff-${m.id}-${year}`,firstName:m.name.split(' ')[0],lastName:m.name.split(' ').slice(1).join(' '),age:m.age,birthYear:year-m.age,nationality:'English',identitySeed:hash(`${m.id}-${year}-manager`),appearanceIndex:(hash(`${m.id}-face`)%24)+1,portraitRole:'manager',style:'Balanced',temperament:m.personality,reputation:'Regional',clubId:vacancy.id,user:false};if(window.FLEraIdentity)FLEraIdentity.applyManager(game,vacancy.managerProfile,year);game.news.unshift({date:game.date,headline:`${m.name} leaves the backroom staff to manage ${vacancy.name}`})}}});ensure(game);s.captaincy.lastReview=null;s.training.teamFocus='Balanced';s.training.intensity='Normal';s.training.rest='Balanced';controlled(game).players.forEach(p=>{p.dressingRoom.roleSatisfaction=clamp(p.dressingRoom.roleSatisfaction+3);p.dressingRoom.trainingHappiness=clamp(p.dressingRoom.trainingHappiness+2)});recalculate(game)}
  function squadSummary(game){const s=ensure(game),club=controlled(game),captain=club.players.find(p=>p.id===s.captaincy.captainId),vice=club.players.find(p=>p.id===s.captaincy.viceCaptainId),open=s.issues.filter(i=>i.status==='open');return {harmony:s.harmony,moodLabel:s.moodLabel,managerSupport:s.managerSupport,captain,vice,groups:s.groups,issues:open,promises:s.promises.filter(p=>['active','proposed'].includes(p.status)),players:[...club.players].filter(active).sort((a,b)=>b.dressingRoom.influence-a.dressingRoom.influence),recentMeetings:s.meetings.slice(0,8)}}
  function trainingSummary(game){const s=ensure(game),era=trainingEra(game),club=controlled(game);return {plan:s.training,era,players:club.players.filter(active),medical:s.medical.cases.filter(c=>c.status!=='Closed'),history:s.medical.history.slice(0,8)}}
  function staffSummary(game){const s=ensure(game);return {members:s.staff.members,assignments:s.scouting.assignments,reports:Object.values(s.scouting.reports).sort((a,b)=>b.date.localeCompare(a.date)),network:s.scouting}}
  return {ensure,dailyTick,annualUpdate,afterMatch,squadSummary,trainingSummary,staffSummary,conversationOptions,resolveIssue,playerTalk,setCaptain,setTeamTraining,setIndividualTraining,setMentor,setPathway,medicalDecision,staffAdvice,startScout,report,recruitmentPitch,formalOffer,recalculate};
})();
