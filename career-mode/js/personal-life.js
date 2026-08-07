window.FLPersonalLife = (() => {
  const VERSION=3;
  const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,Number(n)||0));
  const hash=text=>window.FLPeople?.hash?FLPeople.hash(text):(()=>{let h=2166136261;for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0})();
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
  const yearOf=g=>Number(String(g?.date||'1888').slice(0,4))||1888;
  const controlled=g=>(g.clubs||[]).find(c=>c.id===g.controlledClubId)||null;
  const addDays=(date,days)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
  const maleFirst=['Arthur','William','George','Thomas','Edward','Henry','James','John','Robert','Charles','Daniel','Samuel','Jack','Oliver','Harry','Noah','Leo','Theo','Frederick','Peter','Michael','David'];
  const femaleFirst=['Eleanor','Mary','Elizabeth','Florence','Margaret','Alice','Edith','Rose','Sarah','Emily','Charlotte','Sophie','Olivia','Amelia','Grace','Mia','Isla','Clara','Helen','Anna'];
  const careers=['Teacher','Nurse','Writer','Shopkeeper','Civil servant','Artist','Accountant','Community worker','Solicitor','Doctor','Journalist','Local business owner'];
  const personalities=['calm','ambitious','loyal','independent','warm','stubborn','private','sociable','practical','idealistic'];
  const partnerSurnames=['Adams','Baker','Bell','Bennett','Brown','Campbell','Carter','Clarke','Collins','Cooper','Davies','Edwards','Evans','Foster','Green','Hall','Harris','Hill','Hughes','Johnson','Jones','Kelly','Lewis','Martin','Mitchell','Morgan','Murphy','Parker','Price','Reed','Roberts','Scott','Smith','Taylor','Thomas','Walker','Ward','White','Williams','Wilson','Wood','Wright'];
  const partnerTypes=['adventurous','home-loving','career-focused','family-focused','private','sociable','financially cautious','luxury-loving'];
  const partnerPortraits=[
    'assets/family-portraits/partners/elegant_braided_portrait_with_gold_pendant.webp',
    'assets/family-portraits/partners/curly_haired_woman_in_a_warm_studio_portrait.webp',
    'assets/family-portraits/partners/freckled_auburn_portrait_with_gold_accents.webp',
    'assets/family-portraits/partners/warm_beige_studio_headshot.webp',
    'assets/family-portraits/partners/elegant_studio_portrait_of_a_young_woman.webp',
    'assets/family-portraits/partners/polished_blonde_bun_headshot.webp',
    'assets/family-portraits/partners/warm_toned_studio_portrait_of_a_young_woman.webp',
    'assets/family-portraits/partners/warm_curly_haired_professional_headshot.webp',
    'assets/family-portraits/partners/warm_studio_portrait_of_a_confident_woman.webp',
    'assets/family-portraits/partners/warm_studio_portrait_of_a_smiling_woman.webp'
  ];

  function managerPerson(game){return window.FLPeople?FLPeople.ensureManager(game):null;}
  function surname(game){return game.manager?.lastName||'Bennett';}
  function addTimeline(game,title,text,date=game.date,type='personal'){
    game.managerCareer=game.managerCareer||{timeline:[],honours:[],relationships:{}};game.managerCareer.timeline=Array.isArray(game.managerCareer.timeline)?game.managerCareer.timeline:[];
    if(!game.managerCareer.timeline.some(e=>e.date===date&&e.title===title))game.managerCareer.timeline.unshift({date,title,text,type});
  }
  function event(game,type,title,text,date=game.date,personId=null,importance=2){
    const s=ensure(game),id=`life-${hash(`${type}-${date}-${title}-${personId||''}`)}`;
    if(!s.events.some(e=>e.id===id))s.events.unshift({id,date,type,title,text,personId});
    addTimeline(game,title,text,date,type);
    window.FLPeople?.recordEvent(game,{id,type:`family-${type}`,actorId:game.people?.managerPersonId,subjectId:personId,summary:title,importance,context:{text}});
    return id;
  }

  function ensure(game){
    game.personalLife=game.personalLife&&typeof game.personalLife==='object'?game.personalLife:{};
    const s=game.personalLife;s.version=VERSION;s.relationshipStatus=s.relationshipStatus||'single';s.spouse=s.spouse||null;s.children=Array.isArray(s.children)?s.children:[];s.events=Array.isArray(s.events)?s.events:[];s.decisions=Array.isArray(s.decisions)?s.decisions:[];s.careerOffers=Array.isArray(s.careerOffers)?s.careerOffers:[];s.familyMood=Number.isFinite(+s.familyMood)?+s.familyMood:65;s.home=s.home||{place:game.manager?.birthplace||controlled(game)?.location||'England',settled:50,moves:0};s.lastAnnualYear=Number(s.lastAnnualYear)||yearOf(game)-1;s.pending=s.pending||null;s.lastOfferYear=Number(s.lastOfferYear)||0;s.householdHistory=Array.isArray(s.householdHistory)?s.householdHistory:[];s.householdManagerId=s.householdManagerId||game.manager?.personId||null;
    s.relationshipJourney=s.relationshipJourney&&typeof s.relationshipJourney==='object'?s.relationshipJourney:{};const j=s.relationshipJourney;j.stage=j.stage||(s.relationshipStatus==='married'?'married':s.relationshipStatus==='engaged'?'engaged':s.spouse?'partner':'single');j.candidate=j.candidate||null;j.cohabiting=Boolean(j.cohabiting||['married'].includes(j.stage));j.metDate=j.metDate||null;j.officialDate=j.officialDate||null;j.engagedDate=j.engagedDate||null;j.marriageDate=j.marriageDate||null;j.childrenPlan=j.childrenPlan||'undecided';j.lastChildAttemptDate=j.lastChildAttemptDate||null;j.lastChildBirthYear=Number(j.lastChildBirthYear)||0;j.memories=Array.isArray(j.memories)?j.memories:[];j.promises=Array.isArray(j.promises)?j.promises:[];j.preferredSuccessorPersonId=j.preferredSuccessorPersonId||null;j.lastInvitationYear=Number(j.lastInvitationYear)||0;j.lastWarningYear=Number(j.lastWarningYear)||0;s.formerPartners=Array.isArray(s.formerPartners)?s.formerPartners:[];s.lastRelationshipEnd=s.lastRelationshipEnd||null;
    if(s.spouse&&j.stage==='single')j.stage=s.relationshipStatus==='married'?'married':'partner';s.relationshipStatus=j.stage==='dating'?'dating':j.stage==='engaged'?'engaged':j.stage==='married'?'married':j.stage==='partner'?'partner':'single';
    if(window.FLPeople){FLPeople.ensure(game);if(s.householdManagerId&&game.people?.managerPersonId&&s.householdManagerId!==game.people.managerPersonId)switchHouseholdInternal(game,game.people.managerPersonId);linkCanonical(game);if(s.spouse)refreshSpousePortrait(game,s.spouse);if(j.candidate)refreshSpousePortrait(game,j.candidate);mergeLegacyChildren(game);}
    s.events=s.events.slice(0,220);s.decisions=s.decisions.slice(0,100);s.careerOffers=s.careerOffers.slice(0,30);
    return s;
  }

  function canonicalSpouse(game,spouse){
    if(!window.FLPeople||!spouse)return null;const manager=managerPerson(game);
    const person=FLPeople.create(game,{id:spouse.personId||spouse.id,name:spouse.name,gender:spouse.gender,birthYear:spouse.birthYear,nationality:spouse.nationality||manager?.nationality,birthplace:spouse.birthplace||game.personalLife?.home?.place||'Unknown',spouseIds:manager?[manager.id]:[],footballRoles:['family'],currentRole:'spouse',appearanceSeed:spouse.portraitSeed,appearanceIndex:spouse.appearanceIndex,portraitOverride:spouse.portraitOverride||null,reputation:spouse.career||'Family member',roleLinks:{personalLife:'spouse'}});
    spouse.personId=person.id;spouse.portraitSeed=person.appearanceSeed;spouse.appearanceIndex=person.appearanceIndex;spouse.portraitOverride=spouse.portraitOverride||person.portraitOverride||null;if(manager)manager.spouseIds=[...new Set([...(manager.spouseIds||[]),person.id])];return person;
  }
  function canonicalChild(game,child){
    if(!window.FLPeople||!child)return null;const manager=managerPerson(game),spouse=game.personalLife?.spouse,parents=[manager?.id,spouse?.personId].filter(Boolean);
    const roles=['family'];if(child.footballPath&&child.footballPath!=='outside')roles.push(child.footballPath);
    const person=FLPeople.create(game,{id:child.personId||child.id,name:child.name,gender:child.gender,birthYear:child.birthYear,nationality:child.nationality||manager?.nationality||'English',birthplace:child.birthplace||game.personalLife?.home?.place||'Unknown',parentIds:parents,footballRoles:roles,currentRole:child.status||'child',appearanceSeed:child.portraitSeed,appearanceIndex:child.appearanceIndex,reputation:child.reputation||'Manager family',roleLinks:{personalLifeChildId:child.id,playerId:child.playerId||null,managerClubId:child.managerClubId||null}});
    child.personId=person.id;child.portraitSeed=person.appearanceSeed;child.appearanceIndex=person.appearanceIndex;return person;
  }
  function linkCanonical(game){const s=game.personalLife;if(s.spouse)canonicalSpouse(game,s.spouse);s.children.forEach(c=>canonicalChild(game,c));}

  function childStateFromPerson(game,person){
    const legacy=game.legacySystems?.family?.people?.find(p=>(p.personId||p.id)===person.id),path=String(legacy?.footballPath||person.currentRole||'outside').toLowerCase();
    return {id:person.id,personId:person.id,name:window.FLPeople?FLPeople.displayName(person):`${person.firstName} ${person.lastName}`.trim(),gender:person.gender,birthYear:person.birthYear,age:Math.max(0,yearOf(game)-person.birthYear),relationship:window.FLPeople?FLPeople.relationship(game,game.people?.managerPersonId,person.id):70,footballInterest:path.includes('player')?75:path.includes('manager')?72:path.includes('coach')||path.includes('staff')?60:25,footballPath:path.includes('player')?'player':path.includes('manager')?'manager':path.includes('coach')||path.includes('scout')||path.includes('staff')?'staff':'outside',ability:Number(legacy?.playerAbility||legacy?.playingTalent)||0,potential:Number(legacy?.playingTalent)||0,managerPotential:Number(legacy?.managerAbility)||0,personality:person.personality?.primary||'independent',portraitSeed:person.appearanceSeed,appearanceIndex:person.appearanceIndex||0,status:person.currentRole||'child',careerHistory:[],playerId:person.roleLinks?.playerId||legacy?.playerId||null,managerClubId:person.roleLinks?.managerClubId||legacy?.clubId||null,reputation:person.reputation||legacy?.reputation||'Manager family'};
  }
  function switchHouseholdInternal(game,personId){
    const s=game.personalLife,store=game.people,person=store?.records?.[personId];if(!s||!person)return false;
    if(s.householdManagerId&&s.householdManagerId!==personId)s.householdHistory.unshift({managerPersonId:s.householdManagerId,from:s.householdStarted||game.manager?.appointedDate||game.date,to:game.date,relationshipStatus:s.relationshipStatus,spouse:s.spouse?{...s.spouse}:null,children:(s.children||[]).map(c=>({...c}))});
    s.householdHistory=s.householdHistory.slice(0,12);s.householdManagerId=personId;s.householdStarted=game.date;s.pending=null;
    const spousePerson=(person.spouseIds||[]).map(id=>store.records[id]).find(Boolean)||null;
    s.spouse=spousePerson?{id:spousePerson.id,personId:spousePerson.id,name:window.FLPeople?FLPeople.displayName(spousePerson):`${spousePerson.firstName} ${spousePerson.lastName}`.trim(),gender:spousePerson.gender,birthYear:spousePerson.birthYear,relationship:window.FLPeople?FLPeople.relationship(game,personId,spousePerson.id):68,patience:spousePerson.personality?.patience||55,adventurousness:spousePerson.personality?.adventurousness||50,career:spousePerson.reputation||'Independent career',careerImportance:spousePerson.personality?.ambition||45,personality:spousePerson.personality?.primary||'private',portraitSeed:spousePerson.appearanceSeed,appearanceIndex:spousePerson.appearanceIndex||0,portraitOverride:spousePerson.portraitOverride||null,previousMoves:0}:null;
    s.relationshipStatus=s.spouse?'married':'single';s.children=(person.childIds||[]).map(id=>store.records[id]).filter(Boolean).map(p=>childStateFromPerson(game,p));s.familyMood=s.spouse?65:70;return true;
  }
  function switchHousehold(game,personId){const s=ensure(game);return s.householdManagerId===personId||switchHouseholdInternal(game,personId);}

  function mergeLegacyChildren(game){
    const s=game.personalLife,legacy=game.legacySystems?.family,managerId=game.people?.managerPersonId;if(!legacy?.people?.length||!managerId)return;
    legacy.people.filter(p=>(p.parentIds||[]).includes(managerId)).forEach(p=>{
      if(s.children.some(c=>(c.personId||c.id)===(p.personId||p.id)))return;
      const gender=/female/i.test(p.gender)?'female':'male',path=String(p.footballPath||'Outside').toLowerCase();
      s.children.push({id:p.id,personId:p.personId||p.id,name:`${p.firstName} ${p.lastName}`.trim(),gender,birthYear:p.birthYear,age:Math.max(0,yearOf(game)-p.birthYear),relationship:70,footballInterest:path==='player'?75:path==='manager'?70:35,footballPath:['player','manager','coach','scout','staff'].includes(path)?(path==='coach'||path==='scout'?'staff':path):'outside',ability:Number(p.playerAbility)||0,managerPotential:Number(p.managerAbility)||0,personality:'independent',portraitSeed:p.appearanceSeed||hash(p.id),appearanceIndex:p.appearanceIndex||0,status:p.playerId?'player':p.clubId&&path==='manager'?'manager':'child',careerHistory:[],playerId:p.playerId||null,managerClubId:p.clubId||null,legacyPersonId:p.id});
    });
  }

  function syncLegacyPerson(game,child){
    const legacy=game.legacySystems?.family;if(!legacy)return;legacy.people=Array.isArray(legacy.people)?legacy.people:[];
    const canonical=canonicalChild(game,child),existing=legacy.people.find(p=>(p.personId||p.id)===canonical?.id||p.id===child.id),manager=managerPerson(game);
    const row={id:canonical?.id||child.id,personId:canonical?.id||child.id,firstName:canonical?.firstName||child.name.split(' ')[0],lastName:canonical?.lastName||surname(game),gender:child.gender==='female'?'Female':'Male',birthYear:child.birthYear,nationality:canonical?.nationality||game.manager?.nationality||'England',birthplace:canonical?.birthplace||game.personalLife?.home?.place||'Unknown',parentIds:canonical?.parentIds||[manager?.id].filter(Boolean),childIds:canonical?.childIds||[],generation:2,relation:child.gender==='female'?'Daughter':'Son',footballPath:child.footballPath==='manager'?'Manager':child.footballPath==='staff'?'Coach':child.footballPath==='player'?'Player':'Outside football',managerAbility:child.managerPotential||35,playerAbility:child.ability||0,reputation:child.reputation||'Manager family',appearanceSeed:canonical?.appearanceSeed,appearanceIndex:canonical?.appearanceIndex,active:true,playerId:child.playerId||null,clubId:child.managerClubId||null};
    if(existing)Object.assign(existing,row);else legacy.people.push(row);if((child.playerId||child.managerClubId)&&!legacy.placedPeople.includes(row.id))legacy.placedPeople.push(row.id);
    if(manager){const root=legacy.people.find(p=>(p.personId||p.id)===manager.id);if(root)root.childIds=[...new Set([...(root.childIds||[]),row.id])];}
  }

  function choosePartnerPortrait(spouse){
    if(!spouse||String(spouse.gender||'').toLowerCase()!=='female')return null;
    if(spouse.portraitOverride)return spouse.portraitOverride;
    const seed=hash(`${spouse.personId||spouse.id||spouse.name||'partner'}-portrait-choice`);
    spouse.portraitOverride=partnerPortraits[seed%partnerPortraits.length];
    return spouse.portraitOverride;
  }

  function makeSpouse(game,year,r,link=true){
    const managerGender=/female/i.test(String(game.manager?.gender||''))?'female':'male',gender=r()<.72?(managerGender==='male'?'female':'male'):(r()<.5?'female':'male'),first=(gender==='female'?femaleFirst:maleFirst)[Math.floor(r()*(gender==='female'?femaleFirst.length:maleFirst.length))],last=partnerSurnames[Math.floor(r()*partnerSurnames.length)],id=`spouse-${year}-${hash(`${first}-${last}-${game.meta?.worldSeed||game.meta?.seed||1}`)}`,type=partnerTypes[Math.floor(r()*partnerTypes.length)];
    let patience=35+Math.floor(r()*56),adventurousness=20+Math.floor(r()*71),careerImportance=25+Math.floor(r()*66),familyFocus=30+Math.floor(r()*61),financialCaution=25+Math.floor(r()*71),sociability=25+Math.floor(r()*71),homeLoving=25+Math.floor(r()*71),luxuryTaste=15+Math.floor(r()*76);
    if(type==='adventurous')adventurousness=Math.max(adventurousness,78);if(type==='home-loving')homeLoving=Math.max(homeLoving,80);if(type==='career-focused')careerImportance=Math.max(careerImportance,82);if(type==='family-focused')familyFocus=Math.max(familyFocus,84);if(type==='private')sociability=Math.min(sociability,28);if(type==='sociable')sociability=Math.max(sociability,82);if(type==='financially cautious')financialCaution=Math.max(financialCaution,85);if(type==='luxury-loving')luxuryTaste=Math.max(luxuryTaste,82);
    const spouse={id,personId:id,name:`${first} ${last}`,gender,birthYear:year-(24+Math.floor(r()*12)),relationship:52+Math.floor(r()*15),patience,adventurousness,career:careers[Math.floor(r()*careers.length)],careerImportance,familyFocus,financialCaution,sociability,homeLoving,luxuryTaste,personality:type,portraitSeed:hash(`${id}-portrait`),appearanceIndex:0,previousMoves:0};choosePartnerPortrait(spouse);if(link)canonicalSpouse(game,spouse);return spouse;
  }

  function refreshSpousePortrait(game,spouse){
    if(!spouse)return spouse;
    choosePartnerPortrait(spouse);
    if(window.FLPeople){
      const person=FLPeople.get(game,spouse.personId||spouse.id);
      if(person){
        person.gender=spouse.gender||person.gender||'female';
        person.portraitOverride=spouse.portraitOverride||person.portraitOverride||null;
        if(!person.portraitOverride){
          const refreshedSeed=hash(`${spouse.personId||spouse.id||spouse.name||'spouse'}-portrait-refresh-v2611`);
          spouse.portraitSeed=refreshedSeed;
          spouse.appearanceIndex=(Number(spouse.appearanceIndex||0)+3)%8;
          person.appearanceSeed=refreshedSeed;
          person.appearanceIndex=spouse.appearanceIndex;
          delete person.faceAssetId;delete person.managerFaceAssetId;
        }
        delete person.face;delete person.portrait;
      }
    }
    spouse.portraitRefreshVersion=2612;
    return spouse;
  }
  function endRelationship(game,mode='separation'){
    const s=ensure(game),j=s.relationshipJourney,sp=s.spouse;
    if(!sp)return {ok:false,message:'There is no current relationship to end.'};
    const manager=managerPerson(game),person=window.FLPeople?FLPeople.get(game,sp.personId||sp.id):null;
    const endLabel=mode==='divorce'?'Divorce':'Separation';
    const message=mode==='divorce'?`You divorced ${sp.name}.`:`You ended the relationship with ${sp.name}.`;
    s.formerPartners.unshift({...sp, endedDate:game.date, endedType:mode});
    s.formerPartners=s.formerPartners.slice(0,12);
    s.lastRelationshipEnd={name:sp.name,type:mode,date:game.date};
    if(person){
      person.currentRole='former spouse';
      person.roleLinks=person.roleLinks||{};
      person.roleLinks.personalLife='former-spouse';
      if(manager&&Array.isArray(manager.spouseIds))manager.spouseIds=manager.spouseIds.filter(id=>id!==person.id);
      if(Array.isArray(person.spouseIds))person.spouseIds=person.spouseIds.filter(id=>id!==manager?.id);
    }
    s.spouse=null;
    s.relationshipStatus='single';
    j.stage='single';
    j.candidate=null;
    j.cohabiting=false;
    s.familyMood=clamp(Number(s.familyMood||60)+(mode==='divorce'?-8:-5));
    addRelationshipMemory(game,endLabel,message,mode==='divorce'?-8:-5,sp.personId||sp.id);
    return {ok:true,message,impact:mode==='divorce'?-8:-5,state:relationshipState(game)};
  }

  function addInbox(game,from,subject,body,id){game.inbox=Array.isArray(game.inbox)?game.inbox:[];if(!game.inbox.some(x=>x.id===id))game.inbox.unshift({id,date:game.date,from,subject,body,read:false,link:{tab:'family',label:'OPEN FAMILY'}});}
  function addRelationshipMemory(game,title,text,impact=0,personId=null){const s=ensure(game),j=s.relationshipJourney,id=`relationship-memory-${hash(`${game.date}-${title}-${j.memories.length}`)}`;const row={id,date:game.date,title,text,impact,personId:personId||s.spouse?.personId||null};j.memories.unshift(row);j.memories=j.memories.slice(0,80);event(game,'relationship-memory',title,text,game.date,row.personId,Math.abs(impact)>=8?4:2);return row;}
  function relationshipState(game){const s=ensure(game),j=s.relationshipJourney;return {...j,status:j.stage,partner:s.spouse,candidate:j.candidate,relationship:Number(s.spouse?.relationship||0),familyMood:Number(s.familyMood||0),childrenPlan:j.childrenPlan,preferredSuccessorPersonId:j.preferredSuccessorPersonId,lastRelationshipEnd:s.lastRelationshipEnd,formerPartners:s.formerPartners};}
  function canAdvanceRelationship(s,minimum=0){return Boolean(s.spouse)&&Number(s.spouse.relationship||0)>=minimum;}
  function childAttemptAllowed(game,j){if(!j.lastChildAttemptDate)return true;const last=new Date(`${j.lastChildAttemptDate}T12:00:00Z`),now=new Date(`${game.date}T12:00:00Z`);return (now-last)/86400000>=90;}
  function relationshipAction(game,action){
    const s=ensure(game),j=s.relationshipJourney,year=yearOf(game),r=rng(hash(`${game.meta?.worldSeed||game.meta?.seed||1}-${game.date}-${action}-${j.memories.length}`));let message='',impact=0;
    if(action==='attend-social'){
      if(j.stage!=='single'||j.candidate)return {ok:false,message:'There is already a relationship or introduction to consider.'};j.candidate=makeSpouse(game,year,r,false);j.stage='introduced';j.metDate=game.date;message=`You met ${j.candidate.name}, a ${String(j.candidate.career).toLowerCase()} who is ${j.candidate.personality}.`;addInbox(game,j.candidate.name,'Would you like to meet again?',`${message} Open Manager → Family to decide whether to arrange a first date.`,`relationship-introduction-${j.candidate.id}`);addRelationshipMemory(game,`Met ${j.candidate.name}`,message,1,j.candidate.personId);
    }else if(action==='accept-date'){
      if(!j.candidate)return {ok:false,message:'There is no introduction waiting.'};s.spouse=j.candidate;j.candidate=null;canonicalSpouse(game,s.spouse);j.stage='dating';s.relationshipStatus='dating';j.officialDate=null;impact=4;s.spouse.relationship=clamp(Number(s.spouse.relationship||52)+impact);message=`You and ${s.spouse.name} went on your first proper date.`;addRelationshipMemory(game,'First date',message,impact,s.spouse.personId);
    }else if(action==='decline-date'){
      if(!j.candidate)return {ok:false,message:'There is no introduction waiting.'};message=`You decided not to pursue a relationship with ${j.candidate.name}.`;addRelationshipMemory(game,'Declined an introduction',message,0,j.candidate.personId);j.candidate=null;j.stage='single';
    }else if(action==='spend-time'||action==='weekend-away'){
      if(!s.spouse)return {ok:false,message:'There is no partner to spend time with.'};impact=action==='weekend-away'?7:4;s.spouse.relationship=clamp(Number(s.spouse.relationship||55)+impact);s.familyMood=clamp(Number(s.familyMood||60)+Math.max(2,impact-1));message=action==='weekend-away'?`You protected a full weekend for ${s.spouse.name} and the family.`:`You made proper time for ${s.spouse.name} away from football.`;addRelationshipMemory(game,action==='weekend-away'?'Weekend together':'Time together',message,impact,s.spouse.personId);
    }else if(action==='make-official'){
      if(j.stage!=='dating'||!canAdvanceRelationship(s,55))return {ok:false,message:'The relationship is not ready to become official yet.'};j.stage='partner';s.relationshipStatus='partner';j.officialDate=game.date;impact=5;message=`You and ${s.spouse.name} agreed to make the relationship official.`;s.spouse.relationship=clamp(Number(s.spouse.relationship||55)+impact);addRelationshipMemory(game,'Relationship became official',message,impact,s.spouse.personId);
    }else if(action==='move-in'){
      if(!['partner','engaged'].includes(j.stage)||!canAdvanceRelationship(s,62))return {ok:false,message:'The relationship is not settled enough to move in together.'};j.cohabiting=true;s.home.settled=clamp(Number(s.home.settled||50)+8);impact=4;message=`${s.spouse.name} moved into the family home.`;s.spouse.relationship=clamp(Number(s.spouse.relationship||60)+impact);addRelationshipMemory(game,'Moved in together',message,impact,s.spouse.personId);
    }else if(action==='propose'){
      if(j.stage!=='partner'||!canAdvanceRelationship(s,70))return {ok:false,message:'The relationship is not yet strong enough for a proposal.'};j.stage='engaged';s.relationshipStatus='engaged';j.engagedDate=game.date;impact=7;message=`${s.spouse.name} accepted your proposal.`;s.spouse.relationship=clamp(Number(s.spouse.relationship||70)+impact);addRelationshipMemory(game,'Engagement',message,impact,s.spouse.personId);
    }else if(action==='marry'){
      if(j.stage!=='engaged'||!canAdvanceRelationship(s,68))return {ok:false,message:'The wedding cannot go ahead yet.'};j.stage='married';s.relationshipStatus='married';j.marriageDate=game.date;j.cohabiting=true;impact=8;message=`You married ${s.spouse.name}.`;s.spouse.relationship=clamp(Number(s.spouse.relationship||70)+impact);addRelationshipMemory(game,'Marriage',message,impact,s.spouse.personId);addInbox(game,'Family',`Wedding: ${s.spouse.name}`,`${message} The marriage is now part of the permanent manager timeline.`,`relationship-marriage-${s.spouse.personId}-${game.date}`);
    }else if(action==='promise-stability'){
      if(!s.spouse)return {ok:false,message:'There is no partner to make this promise to.'};const untilYear=year+3;j.promises=j.promises.filter(p=>p.type!=='stability'||p.broken||Number(p.untilYear)<year);j.promises.unshift({id:`stability-${game.date}`,type:'stability',date:game.date,untilYear,broken:false});impact=5;s.spouse.relationship=clamp(Number(s.spouse.relationship||60)+impact);message=`You promised ${s.spouse.name} that the family would not be uprooted again before ${untilYear}.`;addRelationshipMemory(game,'Promise of stability',message,impact,s.spouse.personId);
    }else if(action==='family-day'){
      if(!s.spouse&&!s.children.length)return {ok:false,message:'There is no current household to spend the day with.'};impact=3;if(s.spouse)s.spouse.relationship=clamp(Number(s.spouse.relationship||60)+impact);s.children.forEach(c=>c.relationship=clamp(Number(c.relationship||65)+2));s.familyMood=clamp(Number(s.familyMood||60)+4);message='You protected a full day for the family instead of football.';addRelationshipMemory(game,'Family day',message,impact,s.spouse?.personId||null);
    }else if(action==='end-dating'){
      if(j.stage!=='dating')return {ok:false,message:'There is no dating relationship to end.'};
      return endRelationship(game,'separation');
    }else if(action==='separate'){
      if(!['partner','engaged'].includes(j.stage))return {ok:false,message:'Separation is only available for an established relationship.'};
      return endRelationship(game,'separation');
    }else if(action==='divorce'){
      if(j.stage!=='married')return {ok:false,message:'Divorce is only available once married.'};
      return endRelationship(game,'divorce');
    }else if(action==='children-try'){
      if(!s.spouse||!['partner','engaged','married'].includes(j.stage))return {ok:false,message:'You need an established relationship before trying for children.'};if(j.childrenPlan==='never')return {ok:false,message:'You have chosen not to have children. Reconsider that decision first.'};if(!childAttemptAllowed(game,j))return {ok:false,message:'You have already tried recently. Give the decision some time.'};j.childrenPlan='trying';j.lastChildAttemptDate=game.date;const chance=Math.max(.18,Math.min(.48,.31+(Number(s.spouse.familyFocus||50)-50)/500+(Number(s.familyMood||60)-60)/600));if(s.children.length<5&&r()<chance){const child=makeChild(game,year,r);s.children.push(child);j.lastChildBirthYear=year;message=`${child.name} was born. The family has grown.`;addRelationshipMemory(game,`${child.name} was born`,message,9,child.personId);addInbox(game,'Family',`${child.name} was born`,`${message} Their life and possible football path will now develop over the years.`,`relationship-child-${child.id}`);}else{message=`You and ${s.spouse.name} decided to try for a child, but nothing has happened yet.`;addRelationshipMemory(game,'Trying for children',message,1,s.spouse.personId);}
    }else if(action==='children-not-now'){
      j.childrenPlan='not-now';message='You agreed that children are not the right decision at the moment.';addRelationshipMemory(game,'Children postponed',message,0,s.spouse?.personId||null);
    }else if(action==='children-never'){
      j.childrenPlan='never';message='You decided that you do not plan to have children.';addRelationshipMemory(game,'Decision not to have children',message,0,s.spouse?.personId||null);
    }else if(action==='children-reconsider'){
      j.childrenPlan='undecided';message='You reopened the question of having children.';addRelationshipMemory(game,'Children discussed again',message,1,s.spouse?.personId||null);
    }else return {ok:false,message:'That relationship decision is unavailable.'};
    s.betaChoices=s.betaChoices||{};s.betaChoices.childrenChoice=j.childrenPlan;s.betaChoices.lastAction=message;return {ok:true,message,impact,state:relationshipState(game)};
  }
  function setPreferredSuccessor(game,personId){const s=ensure(game),candidate=descendants(game).find(c=>(c.personId||c.id)===personId&&c.eligibleManager);if(!candidate)return {ok:false,message:'That child has not yet earned eligibility to take over the managerial career.'};s.relationshipJourney.preferredSuccessorPersonId=candidate.personId||candidate.id;addRelationshipMemory(game,'Preferred family successor',`${candidate.name} was marked as the preferred family succession option. The final retirement choice remains yours.`,2,candidate.personId);return {ok:true,message:`${candidate.name} is now your preferred family successor.`};}

  function makeChild(game,year,r){
    const gender=r()<.5?'male':'female',first=(gender==='male'?maleFirst:femaleFirst)[Math.floor(r()*(gender==='male'?maleFirst.length:femaleFirst.length))],interest=r(),path=gender==='male'&&interest<.14?'player':interest<.30?'manager':interest<.43?'staff':'outside',baseAbility=path==='player'?24+Math.floor(r()*63):0,managerPotential=path==='manager'||path==='staff'?30+Math.floor(r()*66):0,id=`child-${year}-${hash(`${first}-${Math.floor(r()*1e8)}-${game.meta?.worldSeed||1}`)}`;
    const child={id,personId:id,name:`${first} ${surname(game)}`,gender,birthYear:year,age:0,relationship:72+Math.floor(r()*18),footballInterest:Math.round(interest*100),footballPath:path,ability:baseAbility,potential:path==='player'?clamp(baseAbility+5+Math.floor(r()*24),baseAbility,96):0,managerPotential,personality:personalities[Math.floor(r()*personalities.length)],portraitSeed:hash(`${id}-portrait`),appearanceIndex:0,status:'child',careerHistory:[],education:null,playerId:null,managerClubId:null,reputation:'Manager family'};
    canonicalChild(game,child);syncLegacyPerson(game,child);return child;
  }

  function updateChildCareer(game,child,year,r){
    child.age=Math.max(0,year-child.birthYear);const age=child.age;
    if(age===15&&child.footballPath==='player'&&child.gender==='male'&&!child.playerId){child.status='academy-eligible';event(game,'child-football',`${child.name} asks for a football chance`,`Your son has reached academy age. Staff warn that his surname must not decide whether he earns a place.`,`${year}-07-01`,child.personId,3);}
    if(age===16&&['manager','staff'].includes(child.footballPath)&&!child.education){child.education=r()<.5?'Coaching and sports studies':'General education with youth coaching';child.careerHistory.push({year,role:'Education',club:null,detail:child.education});event(game,'child-path',`${child.name} begins a coaching path`,`${child.name} has shown a serious interest in football work but still has to build an independent career.`,`${year}-07-01`,child.personId,2);}
    if(age===21&&['manager','staff'].includes(child.footballPath)&&child.status==='child'){child.status='trainee';child.careerHistory.push({year,role:'Trainee coach',club:'Local football',detail:'Begins outside the parent’s senior management team.'});}
    if(age>=27&&['manager','staff'].includes(child.footballPath)&&!child.managerClubId&&r()<.28){
      const candidates=(game.clubs||[]).filter(c=>c.id!==game.controlledClubId&&c.leagueActive!==false).sort((a,b)=>(Number(a.stature)||40)-(Number(b.stature)||40)),club=candidates[Math.min(candidates.length-1,Math.floor(r()*Math.max(1,Math.ceil(candidates.length*.55))))];
      if(club){child.managerClubId=club.id;child.status=child.footballPath==='manager'&&age>=30?'manager':'staff';const role=child.status==='manager'?'Manager':r()<.5?'Coach':'Scout';child.careerHistory.push({year,role,club:club.name,detail:`First established football role at ${club.name}.`});child.reputation=child.managerPotential>=78?'Highly regarded prospect':child.managerPotential>=58?'Promising coach':'Unproven football professional';if(role==='Manager'){club.managerProfile={id:`family-manager-${child.personId}`,personId:child.personId,firstName:child.name.split(' ')[0],lastName:child.name.split(' ').slice(1).join(' '),age,nationality:game.manager?.nationality||'English',portraitRole:'manager',portrait:window.FLEraIdentity?FLEraIdentity.portraitFor({...child,age,portraitRole:'manager'},year,{role:'manager'}):'',style:['Balanced','Attacking','Pragmatic','Youth-led'][hash(child.id)%4],temperament:child.personality,reputation:child.reputation,clubId:club.id,user:false};event(game,'child-manager',`${child.name} becomes manager of ${club.name}`,`A child of the managerial family has earned a senior appointment through an independent coaching career.`,`${year}-07-01`,child.personId,4);}syncLegacyPerson(game,child);}
    }
    if(child.status==='manager'&&child.managerClubId&&age<68){const progress=(child.managerPotential-50)/28+(r()-.5)*4;child.managerPotential=clamp(child.managerPotential+Math.round(progress),25,96);if(year%4===0)child.careerHistory.push({year,role:'Manager',club:(game.clubs||[]).find(c=>c.id===child.managerClubId)?.name||'Unknown club',detail:progress>0?'Reputation continues to grow.':'A difficult spell slows progress.'});}
    if(age>=30&&['manager','staff'].includes(child.footballPath))child.managerEligible=Boolean(child.managerClubId||child.careerHistory.length>=2)&&child.managerPotential>=42;
    canonicalChild(game,child);syncLegacyPerson(game,child);
  }

  function managerReputationScore(game){
    const club=controlled(game),played=(game.fixtures||[]).filter(f=>f.played&&(f.home===club?.id||f.away===club?.id)),wins=club?played.filter(f=>{const home=f.home===club.id;return (home?f.homeGoals:f.awayGoals)>(home?f.awayGoals:f.homeGoals)}).length:0,honours=game.managerCareer?.honours?.length||0;
    return clamp(35+wins*.7+honours*12+Number(game.boardConfidence||50)*.22,20,98);
  }

  function maybeCareerOffer(game,year,r){
    const s=ensure(game),yearsAtClub=year-Number(String(game.manager?.appointedDate||`${year}-01-01`).slice(0,4));if(yearsAtClub<2||s.pending||s.lastOfferYear>=year-1||r()>.10)return null;
    const current=controlled(game),score=managerReputationScore(game),candidates=(game.clubs||[]).filter(c=>c.id!==current?.id&&c.leagueActive!==false&&Number(c.stature||c.reputation||40)<=score+20&&Number(c.stature||c.reputation||40)>=Math.max(25,Number(current?.stature||40)-8));if(!candidates.length)return null;
    const target=candidates[Math.floor(r()*candidates.length)],currentRegion=String(current?.region||current?.location||''),targetRegion=String(target.region||target.location||''),abroad=Boolean(target.foreign),distance=abroad?'abroad':currentRegion&&targetRegion&&currentRegion===targetRegion?'near':'far';s.lastOfferYear=year;
    const offer={id:`manager-offer-${year}-${target.id}`,date:`${year}-07-01`,clubId:target.id,clubName:target.name,distance,abroad,status:'family-review',expires:addDays(`${year}-07-01`,28),reputationRequired:Math.round(Number(target.stature||45)),currentClubId:current?.id};s.careerOffers.unshift(offer);proposeMove(game,{clubName:target.name,clubId:target.id,distance,abroad,offerId:offer.id});event(game,'career-offer',`${target.name} approach the manager`,`A career offer has arrived. The football opportunity now has to be discussed at home.`,offer.date,null,3);return offer;
  }

  function annualUpdate(game,year){
    const s=ensure(game);if(s.lastAnnualYear>=year)return s;s.lastAnnualYear=year;const r=rng(hash(`${game.meta?.worldSeed||game.meta?.seed||1}-${year}-personal-life`)),j=s.relationshipJourney;
    s.children.forEach(c=>updateChildCareer(game,c,year,r));
    if(j.stage==='single'&&!j.candidate&&year-(game.meta?.startYear||1888)>=1&&j.lastInvitationYear<year-1&&r()<.18){j.candidate=makeSpouse(game,year,r,false);j.stage='introduced';j.metDate=`${year}-07-01`;j.lastInvitationYear=year;const text=`You met ${j.candidate.name} through a social event away from football. They work as a ${String(j.candidate.career).toLowerCase()} and are ${j.candidate.personality}.`;event(game,'relationship-introduction',`Met ${j.candidate.name}`,text,`${year}-07-01`,j.candidate.personId,2);addInbox(game,j.candidate.name,'Would you like to meet again?',`${text} Open Manager → Family to decide whether to arrange a first date.`,`relationship-invitation-${j.candidate.id}`);}
    if(s.spouse){const workStrain=(year%5===0&&r()<.25)?-2:0,qualityTime=j.memories.some(m=>String(m.date||'').startsWith(String(year-1))&&['Time together','Weekend together','Family day'].includes(m.title))?2:-1;s.spouse.relationship=clamp(s.spouse.relationship+(r()<.58?1:0)+workStrain+qualityTime);s.familyMood=clamp(Math.round((s.familyMood*2+s.spouse.relationship)/3));if(Number(s.spouse.relationship)<28&&j.lastWarningYear<year){j.lastWarningYear=year;addInbox(game,s.spouse.name,'We need to talk about us','Football has taken over too much of family life. Open Manager → Family and spend time together or discuss the future.',`relationship-warning-${year}-${s.spouse.personId}`);}}
    if(j.childrenPlan==='trying'&&s.spouse&&s.children.length<5&&j.lastChildBirthYear<year&&r()<.27){const c=makeChild(game,year,r);s.children.push(c);j.lastChildBirthYear=year;event(game,'birth',`${c.name} was born`,`A new generation joined the ${surname(game)} family.`,`${year}-07-01`,c.personId,5);addInbox(game,'Family',`${c.name} was born`,`The family has grown. ${c.name}'s relationships and future path will develop with age.`,`annual-child-${c.id}`);}
    maybeCareerOffer(game,year,r);return s;
  }

  function moveStrain(game,spouse,{distance='far',abroad=false}={}){
    const s=ensure(game),year=yearOf(game),children=s.children.map(c=>({...c,age:year-c.birthYear})),schooling=children.filter(c=>c.age>=5&&c.age<=17).length*5,adultDependants=children.filter(c=>c.age>=18&&c.age<=22).length*2,settled=Math.round(Number(s.home?.settled||50)/8),career=Math.round(Number(spouse?.careerImportance||45)/7),home=Math.round(Number(spouse?.homeLoving||50)/8),pastMoves=Number(s.home?.moves||0)*3,stabilityPromise=s.relationshipJourney.promises.some(p=>p.type==='stability'&&!p.broken&&Number(p.untilYear)>=year)?22:0,base=abroad?25:distance==='far'?15:6;
    return base+schooling+adultDependants+settled+career+home+pastMoves+stabilityPromise-Math.round((Number(spouse?.adventurousness||50)+Number(spouse?.patience||50)+Number(spouse?.relationship||65))/9);
  }

  function proposeMove(game,{clubName='another club',clubId=null,distance='far',abroad=false,offerId=null}={}){
    const s=ensure(game),sp=s.spouse;if(!sp){s.pending={id:`move-${hash(`${game.date}-${clubName}`)}`,type:'move',clubName,clubId,offerId,abroad,distance,reaction:'There is no partner objection, though the move still changes the manager’s home life.',impact:0,choices:moveChoices(false)};return {ok:true,reaction:s.pending.reaction,impact:0,pending:s.pending};}
    const strain=moveStrain(game,sp,{distance,abroad}),impact=Math.round(-strain/3);let reaction;if(strain<=0)reaction=`${sp.name} is excited by the possibility of moving for ${clubName}.`;else if(strain<=10)reaction=`${sp.name} is uncertain and wants the family consulted before any decision.`;else if(strain<=22)reaction=`${sp.name} is unhappy about uprooting the family for ${clubName}, particularly at this point in the children’s lives.`;else reaction=`${sp.name} is deeply opposed to another upheaval for football and believes the family is being treated as an afterthought.`;
    s.pending={id:`move-${hash(`${game.date}-${clubName}-${clubId}`)}`,type:'move',clubName,clubId,offerId,abroad,distance,reaction,impact,strain,choices:moveChoices(true)};return {ok:true,reaction,impact,pending:s.pending};
  }
  function moveChoices(hasSpouse){return hasSpouse?[{id:'decline',label:'Decline the job for family stability'},{id:'wait',label:'Ask the club to wait until summer'},{id:'move-together',label:'Ask the family to move together'},{id:'family-stays',label:'Accept while the family initially stays'},{id:'career-first',label:'Accept despite the objection'}]:[{id:'decline',label:'Decline the job'},{id:'move-together',label:'Accept and relocate'}];}

  function performManagerMove(game,pending,together=true){
    const s=ensure(game),target=(game.clubs||[]).find(c=>c.id===pending.clubId);if(!target)return {ok:false,message:'The approached club is no longer available.'};const old=controlled(game),manager={...game.manager};
    game.managerArchive=Array.isArray(game.managerArchive)?game.managerArchive:[];game.managerArchive.push({id:`manager-spell-${hash(`${old?.id}-${manager.personId}-${manager.appointedDate}`)}`,personId:manager.personId,name:`${manager.firstName} ${manager.lastName}`,from:manager.appointedDate||`${game.meta?.startYear||1888}-08-15`,to:game.date,club:old?.name||'',clubId:old?.id||null});
    if(window.FLGame?.attachManager)FLGame.attachManager(game,manager,target.id);else{game.controlledClubId=target.id;game.manager={...manager,appointedDate:game.date};}
    game.managerCareer=game.managerCareer||{timeline:[],honours:[],relationships:{}};game.managerCareer.clubsManaged=Array.isArray(game.managerCareer.clubsManaged)?game.managerCareer.clubsManaged:[];game.managerCareer.clubsManaged.push({clubId:target.id,club:target.name,from:game.date});
    if(together){s.home.place=target.location||target.name;s.home.settled=25;s.home.moves=Number(s.home.moves||0)+1;if(s.spouse)s.spouse.previousMoves=Number(s.spouse.previousMoves||0)+1;}
    addTimeline(game,`Appointed manager of ${target.name}`,`Left ${old?.name||'the previous club'} to begin a new appointment.`,game.date,'manager-move');window.FLPeople?.recordEvent(game,{type:'manager-move',actorId:game.people?.managerPersonId,summary:`Moved from ${old?.name||'previous club'} to ${target.name}`,importance:5,context:{fromClubId:old?.id,toClubId:target.id,familyMoved:together}});
    return {ok:true,message:`You have been appointed manager of ${target.name}.`};
  }

  function resolve(game,choice){
    const s=ensure(game),p=s.pending;if(!p)return {ok:false,message:'No family decision is waiting.'};let delta=0,message='',move=false,together=false;
    if(choice==='decline'){delta=9;message='The job is declined. Your family feels that its stability mattered in the decision.';const offer=s.careerOffers.find(o=>o.id===p.offerId);if(offer)offer.status='declined';}
    else if(choice==='wait'){delta=4;message='You ask the club to wait until the summer. The family appreciates being consulted.';const offer=s.careerOffers.find(o=>o.id===p.offerId);if(offer){offer.status='delayed';offer.reviewDate=`${yearOf(game)+1}-06-01`;}}
    else if(choice==='move-together'){delta=p.strain<=10?4:-4;message=delta>=0?'The family agrees to make the move together.':'The family agrees reluctantly, but the upheaval causes strain.';move=true;together=true;}
    else if(choice==='family-stays'){delta=-7;message='You accept the job while the family remains behind for now. Distance puts pressure on the relationship.';move=true;together=false;}
    else if(choice==='career-first'){delta=-14;message='You put the career first despite the objection. The decision seriously strains family trust.';move=true;together=true;}
    else return {ok:false,message:'Unknown family decision.'};
    if(move){const activePromise=s.relationshipJourney.promises.find(x=>x.type==='stability'&&!x.broken&&Number(x.untilYear)>=yearOf(game));if(activePromise){activePromise.broken=true;activePromise.brokenDate=game.date;delta-=10;message+=' You also broke a promise to keep the family settled.';}}
    if(s.spouse)s.spouse.relationship=clamp(s.spouse.relationship+delta);s.familyMood=clamp(s.familyMood+delta);s.decisions.unshift({date:game.date,type:p.type,clubName:p.clubName,choice,result:message,impact:delta});event(game,'family-decision',`Decision about ${p.clubName}`,message,game.date,s.spouse?.personId||null,Math.abs(delta)>=10?4:3);addRelationshipMemory(game,`Career decision: ${p.clubName}`,message,delta,s.spouse?.personId||null);
    let moveResult=null;if(move)moveResult=performManagerMove(game,p,together);const offer=s.careerOffers.find(o=>o.id===p.offerId);if(offer&&moveResult?.ok)offer.status='accepted';s.pending=null;return {ok:moveResult?moveResult.ok:true,message:moveResult?.ok?`${message} ${moveResult.message}`:moveResult?.message||message,impact:delta,moved:Boolean(moveResult?.ok)};
  }

  function descendants(game){
    const s=ensure(game),year=yearOf(game),preferred=s.relationshipJourney.preferredSuccessorPersonId;return s.children.map(c=>({...c,age:Math.max(0,year-c.birthYear),eligiblePlayer:c.gender==='male'&&c.footballPath==='player'&&!c.playerId&&year-c.birthYear>=15&&year-c.birthYear<=20,eligibleManager:['manager','staff'].includes(c.footballPath)&&Boolean(c.managerEligible)&&year-c.birthYear>=28,preferredSuccessor:(c.personId||c.id)===preferred}));
  }

  function addSonToAcademy(game,id){
    const c=descendants(game).find(x=>(x.id===id||x.personId===id)&&x.eligiblePlayer);if(!c)return {ok:false,message:'This family member is not eligible for an academy trial.'};const club=controlled(game);if(!club)return {ok:false,message:'Club unavailable.'};if((club.players||[]).some(p=>p.personId===c.personId||p.familyPersonId===c.personId))return {ok:false,message:`${c.name} is already at the club.`};
    const position=['GK','FB','HB','IF','W','CF'][hash(c.personId)%6],ability=clamp(Number(c.ability)||35,24,88),potential=clamp(Number(c.potential)||ability+10,ability,96),player={id:`family-player-${c.personId}`,personId:c.personId,familyPersonId:c.personId,name:c.name,gender:'male',age:c.age,birthYear:c.birthYear,nationality:game.manager?.nationality||'English',position,ability,potential,ceiling:potential,condition:100,morale:65,form:'—',wage:0,contractYears:3,status:'active',squadStatus:'Youth Prospect',appearances:0,starts:0,subApps:0,minutes:0,goals:0,assists:0,cleanSheets:0,seasonHistory:[],matchHistory:[],honours:[],careerTotals:{appearances:0,goals:0,assists:0,cleanSheets:0},identitySeed:c.portraitSeed,appearanceIndex:c.appearanceIndex,identityNameLocked:true,personalityLabel:c.personality};
    if(window.FLEraIdentity)FLEraIdentity.applyPlayer(game,player,yearOf(game));if(window.FLEconomy)player.wage=FLEconomy.recommendedWage(game,player,club,'Prospect');club.players.push(player);const original=ensure(game).children.find(x=>x.id===c.id||x.personId===c.personId);if(original){original.status='player';original.playerId=player.id;original.careerHistory.push({year:yearOf(game),role:'Academy player',club:club.name,detail:`Awarded a trial on staff recommendation. Current ability ${ability}.`});syncLegacyPerson(game,original);}const person=window.FLPeople?.get(game,c.personId);if(person){person.currentRole='player';person.footballRoles=[...new Set([...(person.footballRoles||[]),'player'])];person.roleLinks.playerId=player.id;person.roleLinks.clubId=club.id;}
    event(game,'child-player',`${c.name} joined ${club.name}`,`The manager’s son entered the academy with ability ${ability} and potential ${potential}. His career will be judged on merit.`,game.date,c.personId,5);return {ok:true,message:`${c.name} has joined the academy on a trial pathway.`,player};
  }

  function familyTree(game){
    const s=ensure(game),manager=managerPerson(game),people=[manager,s.spouse?window.FLPeople?.get(game,s.spouse.personId):null,...s.children.map(c=>window.FLPeople?.get(game,c.personId))].filter(Boolean);return {root:manager,people,links:people.flatMap(p=>(p.childIds||[]).map(childId=>({from:p.id,to:childId,type:'parent'}))).concat((manager?.spouseIds||[]).map(id=>({from:manager.id,to:id,type:'spouse'}))),children:descendants(game)};
  }

  return {VERSION,ensure,annualUpdate,proposeMove,resolve,descendants,addSonToAcademy,familyTree,managerReputationScore,maybeCareerOffer,performManagerMove,switchHousehold,relationshipState,relationshipAction,addRelationshipMemory,setPreferredSuccessor};
})();
