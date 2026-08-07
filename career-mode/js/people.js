window.FLPeople = (() => {
  const VERSION = 2;
  const clamp = (value,min=0,max=100) => Math.max(min,Math.min(max,Number(value)||0));
  const yearOf = game => Number(String(game?.date||'1888').slice(0,4))||1888;
  const hash = text => {let h=2166136261;for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const splitName = name => {const parts=String(name||'').trim().split(/\s+/).filter(Boolean);return {firstName:parts[0]||'Unknown',lastName:parts.slice(1).join(' ')||''}};
  const normaliseGender = value => /female|woman|girl/i.test(String(value||''))?'female':'male';
  const femaleFirstNames=new Set(['ada','aaliyah','agnes','alice','alison','amanda','amelia','amy','anna','anne','barbara','beatrice','beth','brenda','carol','caroline','charlotte','chloe','claire','clara','deborah','diane','donna','dorothy','edith','elaine','eleanor','elizabeth','ella','elsie','emily','emma','esther','ethel','evelyn','evie','fiona','florence','freya','grace','hannah','harriet','helen','irene','isla','jade','jane','janet','jean','jennifer','jessica','jill','joan','julia','julie','karen','katie','kathleen','laura','lauren','lily','linda','lisa','louisa','louise','lucy','margaret','marjorie','martha','mary','maureen','mia','michelle','natalie','nicola','olivia','patricia','poppy','rachel','rebecca','rose','samantha','sandra','sarah','sharon','sophie','susan','tracey','vera','winifred','zara']);
  const inferGender=(name,explicit)=>explicit?normaliseGender(explicit):(femaleFirstNames.has(String(name||'').trim().split(/\s+/)[0].toLowerCase())?'female':'male');
  const compactUnique = values => [...new Set((values||[]).filter(Boolean))];
  const controlled = game => (game?.clubs||[]).find(c=>c.id===game.controlledClubId)||null;

  function baseStore(){return {version:VERSION,records:{},eventLog:[],managerPersonId:null,migrated:{legacyFamily:false,personalLife:false},lastCompactYear:0};}
  function ensure(game){
    game.people=game.people&&typeof game.people==='object'?game.people:baseStore();
    const store=game.people;
    store.version=VERSION;
    store.records=store.records&&typeof store.records==='object'?store.records:{};
    store.eventLog=Array.isArray(store.eventLog)?store.eventLog:[];
    store.migrated=store.migrated&&typeof store.migrated==='object'?store.migrated:{};
    ensureManager(game);
    migrateLegacyFamily(game);
    migratePersonalLife(game);
    bindControlledClub(game);
    compact(game);
    return store;
  }

  function appearance(seed,parentRecords=[]){
    const parentSeeds=parentRecords.map(p=>Number(p?.appearanceSeed)||0).filter(Boolean);
    const parentIndex=parentRecords.map(p=>Number(p?.appearanceIndex)||0).filter(Boolean)[0]||0;
    const inherited=parentSeeds.length?hash(`${parentSeeds.join('-')}-${seed}`):hash(seed);
    const mutation=(hash(`${seed}-mutation`)%13)-6;
    return {
      appearanceSeed:inherited,
      appearanceIndex:parentIndex?Math.max(1,parentIndex+mutation):0,
      appearanceGenes:{
        skin:hash(`${inherited}-skin`)%8,
        face:hash(`${inherited}-face`)%12,
        eyes:hash(`${inherited}-eyes`)%10,
        nose:hash(`${inherited}-nose`)%12,
        mouth:hash(`${inherited}-mouth`)%10,
        brow:hash(`${inherited}-brow`)%10,
        hairTexture:hash(`${inherited}-texture`)%8,
        hairColour:hash(`${inherited}-hair`)%9
      }
    };
  }

  function create(game,data={}){
    const store=game.people||baseStore();
    if(!game.people)game.people=store;
    const parsed=splitName(data.name||`${data.firstName||''} ${data.lastName||''}`);
    const id=String(data.id||`person-${hash(`${game.meta?.worldSeed||game.meta?.seed||1}-${parsed.firstName}-${parsed.lastName}-${data.birthYear||yearOf(game)}-${Object.keys(store.records).length}`)}`);
    const existing=store.records[id]||{};
    const parents=(data.parentIds||existing.parentIds||[]).map(pid=>store.records[pid]).filter(Boolean);
    const inherited=appearance(id,parents);
    const person={
      id,
      firstName:data.firstName||existing.firstName||parsed.firstName,
      lastName:data.lastName!==undefined?data.lastName:(existing.lastName||parsed.lastName),
      knownAs:data.knownAs||existing.knownAs||'',
      gender:normaliseGender(data.gender||existing.gender),
      birthYear:Number(data.birthYear??existing.birthYear??(yearOf(game)-(Number(data.age)||30))),
      deathYear:data.deathYear??existing.deathYear??null,
      nationality:data.nationality||existing.nationality||'English',
      birthplace:data.birthplace||existing.birthplace||'Unknown',
      parentIds:compactUnique(data.parentIds||existing.parentIds),
      spouseIds:compactUnique(data.spouseIds||existing.spouseIds),
      childIds:compactUnique(data.childIds||existing.childIds),
      appearanceSeed:Number(data.appearanceSeed||existing.appearanceSeed||inherited.appearanceSeed),
      appearanceIndex:Number(data.appearanceIndex||existing.appearanceIndex||inherited.appearanceIndex||0),
      appearanceGenes:data.appearanceGenes||existing.appearanceGenes||inherited.appearanceGenes,
      personality:data.personality||existing.personality||personalityFor(id),
      voicePersona:data.voicePersona||existing.voicePersona||{},
      relationships:existing.relationships&&typeof existing.relationships==='object'?existing.relationships:{},
      lifeEvents:Array.isArray(existing.lifeEvents)?existing.lifeEvents:[],
      footballRoles:compactUnique([...(existing.footballRoles||[]),...(data.footballRoles||[])]),
      currentRole:data.currentRole||existing.currentRole||null,
      reputation:data.reputation||existing.reputation||'Unknown',
      active:data.active!==undefined?Boolean(data.active):(existing.active!==undefined?existing.active:true),
      roleLinks:{...(existing.roleLinks||{}),...(data.roleLinks||{})},
      createdYear:Number(existing.createdYear||yearOf(game))
    };
    store.records[id]=person;
    person.parentIds.forEach(parentId=>{const parent=store.records[parentId];if(parent)parent.childIds=compactUnique([...(parent.childIds||[]),id]);});
    person.spouseIds.forEach(spouseId=>{const spouse=store.records[spouseId];if(spouse)spouse.spouseIds=compactUnique([...(spouse.spouseIds||[]),id]);});
    return person;
  }

  function personalityFor(seed){
    const values=['calm','ambitious','loyal','independent','warm','stubborn','private','sociable','practical','idealistic'];
    return {
      primary:values[hash(`${seed}-primary`)%values.length],
      secondary:values[hash(`${seed}-secondary`)%values.length],
      patience:30+hash(`${seed}-patience`)%61,
      adventurousness:20+hash(`${seed}-adventure`)%76,
      ambition:25+hash(`${seed}-ambition`)%71,
      resilience:25+hash(`${seed}-resilience`)%71
    };
  }

  function ensureManager(game){
    const manager=game.manager||{};
    const legacyId=game.legacySystems?.family?.currentManagerPersonId;
    const id=manager.personId||legacyId||`manager-${hash(`${game.meta?.worldSeed||game.meta?.seed||1}-${manager.firstName||'Manager'}-${manager.lastName||''}`)}`;
    manager.personId=id;
    const person=create(game,{id,firstName:manager.firstName||'Arthur',lastName:manager.lastName||'Manager',gender:manager.gender||'male',birthYear:yearOf(game)-(Number(manager.age)||35),nationality:manager.nationality||'English',birthplace:manager.birthplace||'Unknown',footballRoles:['manager'],currentRole:'manager',reputation:manager.reputation||'Unknown Local Coach',appearanceSeed:manager.identitySeed||manager.appearanceSeed,appearanceIndex:manager.appearanceIndex,roleLinks:{manager:true}});
    game.people.managerPersonId=id;
    return person;
  }

  function ensurePlayer(game,player,club=null){
    if(!player||typeof player!=='object')return null;
    const parsed=splitName(player.name);
    const id=player.personId||`player-${player.id||hash(`${parsed.firstName}-${parsed.lastName}-${player.birthYear||player.age}`)}`;
    player.personId=id;
    const person=create(game,{id,name:player.name,gender:player.gender||'male',birthYear:Number(player.birthYear)||(yearOf(game)-(Number(player.age)||22)),nationality:player.nationality||'English',birthplace:player.birthplace||club?.location||'Unknown',footballRoles:['player'],currentRole:player.status==='retired'?'retired player':'player',reputation:player.reputation||player.personalityLabel||'Footballer',appearanceSeed:player.identitySeed,appearanceIndex:player.appearanceIndex,roleLinks:{playerId:player.id,clubId:club?.id||player.clubId||null}});
    player.identitySeed=person.appearanceSeed;
    player.appearanceIndex=person.appearanceIndex||player.appearanceIndex||0;
    return person;
  }

  function ensureStaff(game,member,role='staff'){
    if(!member)return null;
    const parsed=splitName(member.name);
    const id=member.personId||`staff-${member.id||hash(`${parsed.firstName}-${parsed.lastName}-${role}`)}`;
    member.personId=id;
    return create(game,{id,name:member.name,gender:inferGender(member.name,member.gender),birthYear:Number(member.birthYear)||(yearOf(game)-(Number(member.age)||45)),nationality:member.nationality||'English',footballRoles:[role],currentRole:member.role||role,reputation:member.reputation||(member.quality?`${member.quality} rated staff`:'Staff member'),roleLinks:{staffId:member.id}});
  }

  function bindControlledClub(game){
    const club=controlled(game);if(!club)return;
    (club.players||[]).forEach(p=>ensurePlayer(game,p,club));
    const members=game.dressingRoom?.staff?.members||club.staff||[];
    members.forEach(m=>ensureStaff(game,m,'staff'));
  }

  function migrateLegacyFamily(game){
    const store=game.people;if(store.migrated.legacyFamily)return;
    const family=game.legacySystems?.family;if(!family?.people?.length){store.migrated.legacyFamily=true;return;}
    family.people.forEach(old=>{
      const person=create(game,{id:old.id,firstName:old.firstName,lastName:old.lastName,gender:old.gender,birthYear:old.birthYear,nationality:old.nationality,birthplace:old.birthplace,parentIds:old.parentIds||[],childIds:old.childIds||[],footballRoles:[String(old.footballPath||'family').toLowerCase()],currentRole:String(old.footballPath||'family').toLowerCase(),reputation:old.reputation,appearanceSeed:old.appearanceSeed||hash(old.id),roleLinks:{legacyFamilyId:old.id,playerId:old.playerId,clubId:old.clubId}});
      old.personId=person.id;old.appearanceSeed=person.appearanceSeed;old.appearanceIndex=person.appearanceIndex;
    });
    store.migrated.legacyFamily=true;
  }

  function migratePersonalLife(game){
    const store=game.people;if(store.migrated.personalLife)return;
    const life=game.personalLife;if(!life){store.migrated.personalLife=true;return;}
    const manager=ensureManager(game);
    if(life.spouse){
      const spouse=create(game,{id:life.spouse.personId||life.spouse.id,name:life.spouse.name,gender:life.spouse.gender,birthYear:life.spouse.birthYear,nationality:life.spouse.nationality||manager.nationality,birthplace:life.spouse.birthplace||life.home?.place||'Unknown',spouseIds:[manager.id],footballRoles:['family'],currentRole:'spouse',appearanceSeed:life.spouse.portraitSeed,roleLinks:{personalLife:'spouse'}});
      manager.spouseIds=compactUnique([...(manager.spouseIds||[]),spouse.id]);life.spouse.personId=spouse.id;
    }
    (life.children||[]).forEach(child=>{
      const person=create(game,{id:child.personId||child.id,name:child.name,gender:child.gender,birthYear:child.birthYear,nationality:child.nationality||manager.nationality,birthplace:child.birthplace||life.home?.place||'Unknown',parentIds:compactUnique([manager.id,life.spouse?.personId]),footballRoles:['family',child.footballPath].filter(Boolean),currentRole:child.status||'child',reputation:'Manager family',appearanceSeed:child.portraitSeed,roleLinks:{personalLifeChildId:child.id,playerId:child.playerId}});
      child.personId=person.id;child.portraitSeed=person.appearanceSeed;child.appearanceIndex=person.appearanceIndex;
    });
    store.migrated.personalLife=true;
  }

  function get(game,id){return ensure(game).records[id]||null;}
  function all(game){return Object.values(ensure(game).records);}
  function age(game,person){return Math.max(0,yearOf(game)-Number(person?.birthYear||yearOf(game)));}
  function displayName(person){return person?.knownAs||`${person?.firstName||''} ${person?.lastName||''}`.trim()||'Unknown person';}

  function adjustRelationship(game,fromId,toId,delta,reason=''){
    const from=get(game,fromId),to=get(game,toId);if(!from||!to)return 0;
    const key=String(toId),before=Number(from.relationships[key]?.score??50),score=clamp(before+delta);
    from.relationships[key]={score,lastChanged:game.date,reason:reason||from.relationships[key]?.reason||''};
    return score;
  }
  function relationship(game,fromId,toId){return Number(get(game,fromId)?.relationships?.[toId]?.score??50);}

  function recordEvent(game,event={}){
    const store=ensure(game),row={id:event.id||`people-${hash(`${event.type}-${event.date||game.date}-${event.actorId||''}-${event.subjectId||''}-${store.eventLog.length}`)}`,date:event.date||game.date,type:event.type||'life',actorId:event.actorId||null,subjectId:event.subjectId||null,summary:String(event.summary||event.title||event.type||'Event').slice(0,180),importance:clamp(event.importance??2,1,5),context:event.context&&typeof event.context==='object'?event.context:{}};
    if(!store.eventLog.some(x=>x.id===row.id))store.eventLog.unshift(row);
    [row.actorId,row.subjectId].filter(Boolean).forEach(id=>{const person=store.records[id];if(person&&!person.lifeEvents.includes(row.id)){person.lifeEvents.unshift(row.id);person.lifeEvents=person.lifeEvents.slice(0,120);}});
    compact(game);return row;
  }

  function eventsFor(game,personId,limit=30){const store=ensure(game);return store.eventLog.filter(e=>e.actorId===personId||e.subjectId===personId).slice(0,limit);}
  function family(game,rootId=ensure(game).managerPersonId){
    const store=ensure(game),root=store.records[rootId];if(!root)return [];
    const ids=new Set([root.id,...(root.spouseIds||[]),...(root.childIds||[])]);
    (root.childIds||[]).forEach(id=>{const child=store.records[id];(child?.childIds||[]).forEach(x=>ids.add(x));});
    return [...ids].map(id=>store.records[id]).filter(Boolean);
  }

  function compact(game){
    const store=game.people;if(!store)return;
    const year=yearOf(game);if(store.lastCompactYear===year&&store.eventLog.length<2200)return;
    store.lastCompactYear=year;
    const important=new Set();
    Object.values(store.records).forEach(p=>{if(p.currentRole==='manager'||p.currentRole==='spouse'||(p.parentIds||[]).length||(p.childIds||[]).length||p.roleLinks?.playerId)important.add(p.id);});
    const keep=[];for(const event of store.eventLog){if(event.importance>=4||important.has(event.actorId)||important.has(event.subjectId)||keep.length<600)keep.push(event);if(keep.length>=2200)break;}
    store.eventLog=keep;
  }

  function syncLegacyFamily(game){
    const store=ensure(game),legacy=game.legacySystems?.family;if(!legacy)return;
    legacy.people=(legacy.people||[]).map(old=>{const p=store.records[old.personId||old.id];if(!p)return old;return {...old,personId:p.id,firstName:p.firstName,lastName:p.lastName,gender:p.gender,birthYear:p.birthYear,nationality:p.nationality,birthplace:p.birthplace,parentIds:p.parentIds,childIds:p.childIds,appearanceSeed:p.appearanceSeed,appearanceIndex:p.appearanceIndex};});
  }

  return {VERSION,ensure,create,get,all,age,displayName,ensureManager,ensurePlayer,ensureStaff,bindControlledClub,recordEvent,eventsFor,adjustRelationship,relationship,family,compact,syncLegacyFamily,yearOf,hash,inferGender};
})();
