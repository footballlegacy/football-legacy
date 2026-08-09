import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function runtime(){
  const rows=new Map(),localStorage={getItem:key=>rows.has(key)?rows.get(key):null,setItem:(key,value)=>rows.set(key,String(value)),removeItem:key=>rows.delete(key)};
  const context=vm.createContext({console,Date,Math,JSON,localStorage});context.window=context;context.globalThis=context;
  vm.runInContext(fs.readFileSync(new URL('../player-career/player-career.js',import.meta.url),'utf8'),context,{filename:'player-career.js'});
  return{api:context.FLPlayerCareer,localStorage};
}

const config={firstName:'Jamie',lastName:'Tester',nationality:'English',position:'CF',foot:'Right',height:178,archetype:'Complete Forward',entry:'academy',club:{id:'test-club',name:'Test Athletic',league:'Championship',tier:2,currentStrength:68,prestige:70,location:'England'}};

test('creates a complete age-14 player career with a separate save',()=>{
  const {api}=runtime(),career=api.create(config);
  assert.equal(career.mode,'player-career');assert.equal(career.player.age,14);assert.equal(career.path.tier,'academy-u14');assert.equal(career.club.name,'Test Athletic');assert.ok(career.player.overall>=30);assert.equal(career.records.stints.length,1);assert.ok(career.squad.length>=18);assert.ok(career.objectives.length>=3);
  api.save(career);const loaded=api.load();assert.equal(loaded.player.name,'Jamie Tester');assert.equal(loaded.records.matches.length,0);
});

test('records every match and advances an open-ended multi-decade career',()=>{
  const {api}=runtime(),career=api.create(config);
  for(let i=0;i<1040;i++){if(!career.training.usedThisWeek)api.train(career,i%3===0?'recovery':'finishing');const out=api.simulateMatch(career);assert.equal(out.ok,true)}
  assert.equal(career.records.matches.length,1040);assert.ok(career.records.seasons.length>=25);assert.ok(career.player.age>=39);assert.equal(career.records.totals.appearances+career.records.internationalMatches.length,career.records.matches.length);assert.ok(career.records.stints.every(stint=>Number.isFinite(stint.appearances)));assert.equal(career.records.stints.reduce((sum,stint)=>sum+stint.appearances,0),career.records.totals.appearances);assert.equal(career.retired,false);
});

test('poor academy form can cause a real release to grassroots',()=>{
  const {api}=runtime(),career=api.create(config);career.path.coachTrust=0;career.path.stinkers=3;career.player.fitness=20;career.player.morale=10;Object.keys(career.player.attributes).forEach(key=>career.player.attributes[key]=20);career.player.overall=20;
  for(let i=0;i<4&&career.path.tier!=='grassroots';i++)api.simulateMatch(career);
  assert.equal(career.path.tier,'grassroots');assert.ok(career.path.releaseCount>=1);assert.ok(career.history.some(row=>row.type==='release'));
});

test('grassroots form creates scouting and redemption movement',()=>{
  const {api}=runtime(),career=api.create({...config,entry:'grassroots',club:null});career.path.scoutingAttention=41;Object.keys(career.player.attributes).forEach(key=>career.player.attributes[key]=90);career.player.overall=90;career.player.fitness=100;career.player.morale=90;
  for(let i=0;i<4&&career.path.tier==='grassroots';i++)api.simulateMatch(career);
  assert.equal(career.path.tier,'school');assert.ok(career.history.some(row=>row.title==='District call-up'));
});

test('senior internationals and captaincy are recorded independently',()=>{
  const {api}=runtime(),career=api.create(config);career.path.tier='first-team';career.player.age=25;career.player.reputation=80;career.player.overall=84;career.player.attributes.leadership=86;api.simulateMatch(career);assert.equal(career.international.level,'Senior squad');career.international.caps=25;career.international.captaincies=1;career.relationships.nationalManager=85;career.seasonWeek=9;const out=api.simulateMatch(career);assert.equal(out.match.international,true);assert.equal(out.match.captain,true);assert.ok(career.international.captaincies>=2);assert.ok(career.records.internationalMatches.length>=1);
});

test('youth appearances do not count as senior caps',()=>{
  const {api}=runtime(),career=api.create(config);career.player.age=17;career.player.overall=62;career.player.reputation=10;career.international.level='Under-17 squad';career.international.calledUp=true;career.seasonWeek=9;const out=api.simulateMatch(career);assert.equal(out.match.international,true);assert.equal(career.international.youthCaps,1);assert.equal(career.international.caps,0);
});

test('individual teammate relationships can be built once per match week',()=>{
  const {api}=runtime(),career=api.create(config),mate=career.squad[0],before=mate.relationship;const first=api.teammateInteraction(career,mate.id,'bond'),second=api.teammateInteraction(career,mate.id,'bond');assert.equal(first.ok,true);assert.ok(mate.relationship>before);assert.equal(second.ok,false);api.simulateMatch(career);assert.equal(career.social.teammateActionUsed,false);
});

test('nationality names map to the correct national teams',()=>{
  const {api}=runtime();assert.equal(api.create({...config,nationality:'Argentine'}).international.team,'Argentina');assert.equal(api.create({...config,nationality:'Danish'}).international.team,'Denmark');assert.equal(api.create({...config,nationality:'Senegalese'}).international.team,'Senegal');
});

test('retirement remains a player choice and preserves a manager handoff identity',()=>{
  const {api}=runtime(),career=api.create(config);api.quickSim(career,5);const result=api.retire(career,'manager'),identity=api.managerIdentity(career);assert.equal(result.ok,true);assert.equal(career.retired,true);assert.equal(identity.firstName,'Jamie');assert.equal(identity.occupation,'Former Professional Footballer');assert.equal(identity.playerCareerLegacy.appearances,5);
});
