'use strict';
(function installHistoricPlaytestSquads(global){
  const api=global.FLQuickPlayTeams;if(!api||!api.TEAMS)return;
  const clamp=n=>Math.max(1,Math.min(99,Math.round(n)));
  const roleDefaults=(role,overall)=>{
    if(role==='gk')return{pace:46,accel:48,control:62,pass:70,shoot:24,defend:48,awareness:overall,strength:76,heading:14,jumping:82,balance:55,agility:overall-2,technique:60,aggression:42,keeper:overall};
    if(role==='def')return{pace:overall-7,accel:overall-8,control:overall-10,pass:overall-11,shoot:overall-35,defend:overall,strength:overall,awareness:overall,heading:overall-3,jumping:overall-2,balance:overall-8,agility:overall-12,technique:overall-11,aggression:overall-2,keeper:8};
    if(role==='mid')return{pace:overall-7,accel:overall-6,control:overall,pass:overall,shoot:overall-10,defend:overall-16,strength:overall-10,awareness:overall,heading:overall-16,jumping:overall-14,balance:overall-3,agility:overall-2,technique:overall,aggression:overall-7,keeper:7};
    return{pace:overall,accel:overall,control:overall,pass:overall-7,shoot:overall,strength:overall-10,awareness:overall,heading:overall-10,jumping:overall-9,balance:overall-3,agility:overall-1,technique:overall,aggression:overall-15,defend:overall-48,keeper:6};
  };
  const player=(id,name,position,overall,number,specific={},appearance={})=>{
    const role=position==='GK'?'gk':['RB','LB','CB','RWB','LWB'].includes(position)?'def':['ST','CF','RW','LW'].includes(position)?'fwd':'mid';
    const attrs=Object.fromEntries(Object.entries({...roleDefaults(role,overall),...specific}).map(([key,value])=>[key,clamp(value)]));
    return{id,name,position,role,overall,number,attrs,appearance,age:0,seasonApps:0,seasonGoals:0,quickPlayProfile:{season:id.startsWith('ars-')?'2003/04':'2016/17',squadRole:'historic-playtest',calibration:'Football Legacy role-and-performance model',source:'historic season and tactical role; custom playtest ratings, not official EA ratings'}};
  };
  const find=id=>api.TEAMS.div1.find(team=>team.id===id);
  const arsenal=find('woolwich-arsenal');
  if(arsenal){
    Object.assign(arsenal,{name:'Arsenal Invincibles',shortName:'ARS 03/04',abbreviation:'ARS',source:'historic-playtest',rating:92,ratings:{overall:92,attack:95,midfield:93,defence:91},formation:'4-4-2',squadId:'historic-arsenal-2003-04'});
    arsenal.squad=[
      player('ars-lehmann','Jens Lehmann','GK',89,1,{keeper:91,awareness:90,agility:85,jumping:86,pass:76,aggression:82}),
      player('ars-stack','Graham Stack','GK',76,24,{keeper:77,awareness:74,agility:77,pass:64}),
      player('ars-lauren','Lauren','RB',86,12,{pace:84,accel:82,control:82,pass:83,defend:86,awareness:88,strength:84,balance:84,aggression:88,technique:82}),
      player('ars-campbell','Sol Campbell','CB',93,23,{pace:80,accel:75,control:75,pass:73,shoot:45,defend:96,awareness:95,strength:97,heading:95,jumping:93,balance:82,agility:68,technique:73,aggression:93}),
      player('ars-toure','Kolo Toure','CB',89,28,{pace:87,accel:86,control:77,pass:75,defend:90,awareness:88,strength:90,heading:86,jumping:93,balance:85,agility:80,technique:75,aggression:91}),
      player('ars-cole','Ashley Cole','LB',92,3,{pace:94,accel:95,control:87,pass:86,shoot:66,defend:91,awareness:93,strength:75,heading:68,jumping:84,balance:91,agility:94,technique:87,aggression:87}),
      player('ars-ljungberg','Freddie Ljungberg','RM',90,8,{pace:91,accel:93,control:90,pass:88,shoot:87,defend:61,awareness:93,strength:73,heading:76,jumping:78,balance:91,agility:93,technique:89,aggression:80}),
      player('ars-vieira','Patrick Vieira','CM',95,4,{pace:84,accel:82,control:91,pass:92,shoot:85,defend:94,awareness:97,strength:97,heading:91,jumping:92,balance:91,agility:84,technique:91,aggression:97}),
      player('ars-gilberto','Gilberto Silva','CM',91,19,{pace:76,accel:74,control:85,pass:88,shoot:72,defend:94,awareness:96,strength:90,heading:88,jumping:90,balance:85,agility:74,technique:84,aggression:89}),
      player('ars-pires','Robert Pires','LM',93,7,{pace:87,accel:89,control:96,pass:94,shoot:90,defend:48,awareness:95,strength:67,heading:68,jumping:69,balance:91,agility:94,technique:96,aggression:56}),
      player('ars-henry','Thierry Henry','ST',97,14,{pace:98,accel:99,control:98,pass:93,shoot:98,defend:42,awareness:98,strength:86,heading:80,jumping:84,balance:95,agility:98,technique:98,aggression:72}),
      player('ars-bergkamp','Dennis Bergkamp','ST',95,10,{pace:78,accel:82,control:99,pass:98,shoot:95,defend:45,awareness:99,strength:78,heading:80,jumping:74,balance:94,agility:91,technique:99,aggression:64}),
      player('ars-cygan','Pascal Cygan','CB',81,18,{pace:63,accel:61,defend:84,awareness:83,strength:88,heading:86,jumping:84}),
      player('ars-clichy','Gael Clichy','LB',82,22,{pace:92,accel:94,control:80,pass:78,defend:80,awareness:79,agility:91}),
      player('ars-edu','Edu','CM',86,17,{pace:76,control:88,pass:90,shoot:83,defend:82,awareness:89,strength:83,technique:89}),
      player('ars-parlour','Ray Parlour','RM',84,15,{pace:80,accel:81,control:82,pass:85,shoot:79,defend:76,awareness:86,strength:82,aggression:91}),
      player('ars-reyes','José Antonio Reyes','ST',86,9,{pace:94,accel:96,control:89,pass:85,shoot:84,awareness:85,balance:90,agility:94,technique:89}),
      player('ars-kanu','Nwankwo Kanu','ST',85,25,{pace:75,accel:72,control:92,pass:86,shoot:84,awareness:89,strength:87,heading:86,balance:81,agility:79,technique:92})
    ];
  }
  const chelsea=find('west-london-blues');
  if(chelsea){
    Object.assign(chelsea,{name:'Conte Chelsea',shortName:'CHE 16/17',abbreviation:'CHE',source:'historic-playtest',rating:92,ratings:{overall:92,attack:94,midfield:93,defence:92},formation:'3-4-3',squadId:'historic-chelsea-2016-17'});
    chelsea.squad=[
      player('che-courtois','Thibaut Courtois','GK',93,13,{keeper:96,awareness:95,agility:90,jumping:95,pass:75,strength:88}),
      player('che-begovic','Asmir Begović','GK',83,1,{keeper:84,awareness:82,agility:82,jumping:86,pass:69}),
      player('che-azpilicueta','César Azpilicueta','CB',92,28,{pace:84,accel:85,control:84,pass:87,shoot:62,defend:95,awareness:97,strength:84,heading:84,jumping:89,balance:91,agility:88,technique:84,aggression:93}),
      player('che-luiz','David Luiz','CB',92,30,{pace:82,accel:80,control:87,pass:94,shoot:83,defend:91,awareness:93,strength:90,heading:91,jumping:91,balance:84,agility:78,technique:90,aggression:92}),
      player('che-cahill','Gary Cahill','CB',90,24,{pace:74,accel:70,control:77,pass:79,shoot:70,defend:93,awareness:94,strength:92,heading:94,jumping:94,balance:82,agility:69,technique:76,aggression:91}),
      player('che-moses','Victor Moses','RWB',87,15,{pace:92,accel:93,control:88,pass:86,shoot:80,defend:78,awareness:88,strength:82,heading:72,jumping:82,balance:90,agility:92,technique:87,aggression:85}),
      player('che-kante','N’Golo Kanté','CM',96,7,{pace:88,accel:91,control:91,pass:92,shoot:73,defend:98,awareness:99,strength:87,heading:67,jumping:82,balance:96,agility:96,technique:90,aggression:98}),
      player('che-matic','Nemanja Matić','CM',92,21,{pace:74,accel:70,control:89,pass:93,shoot:82,defend:94,awareness:96,strength:96,heading:90,jumping:86,balance:87,agility:73,technique:90,aggression:92}),
      player('che-alonso','Marcos Alonso','LWB',89,3,{pace:82,accel:80,control:87,pass:91,shoot:88,defend:86,awareness:92,strength:86,heading:89,jumping:88,balance:84,agility:80,technique:89,aggression:84}),
      player('che-pedro','Pedro','RW',91,11,{pace:91,accel:94,control:94,pass:89,shoot:90,defend:56,awareness:94,strength:66,heading:71,jumping:76,balance:93,agility:96,technique:94,aggression:74}),
      player('che-costa','Diego Costa','ST',94,19,{pace:86,accel:84,control:90,pass:84,shoot:96,defend:50,awareness:96,strength:98,heading:95,jumping:93,balance:92,agility:83,technique:89,aggression:99}),
      player('che-hazard','Eden Hazard','LW',97,10,{pace:96,accel:99,control:99,pass:94,shoot:94,defend:45,awareness:97,strength:78,heading:68,jumping:72,balance:99,agility:99,technique:99,aggression:72}),
      player('che-terry','John Terry','CB',86,26,{pace:55,accel:51,control:74,pass:80,defend:92,awareness:96,strength:92,heading:94,jumping:88,aggression:94}),
      player('che-fabregas','Cesc Fàbregas','CM',92,4,{pace:70,accel:72,control:95,pass:98,shoot:84,defend:69,awareness:98,strength:71,heading:67,jumping:66,balance:88,agility:85,technique:97}),
      player('che-willian','Willian','RW',89,22,{pace:92,accel:94,control:92,pass:90,shoot:85,awareness:90,balance:93,agility:95,technique:92,defend:56,aggression:76}),
      player('che-batshuayi','Michy Batshuayi','ST',84,23,{pace:85,accel:84,control:84,pass:75,shoot:88,awareness:84,strength:87,heading:83,jumping:86,technique:84}),
      player('che-zouma','Kurt Zouma','CB',84,5,{pace:86,accel:82,control:70,pass:69,defend:86,awareness:82,strength:94,heading:87,jumping:97,aggression:88}),
      player('che-chalobah','Nathaniel Chalobah','CM',79,29,{pace:79,control:78,pass:81,shoot:70,defend:80,awareness:80,strength:84,aggression:84})
    ];
  }
})(window);
