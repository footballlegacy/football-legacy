'use strict';
(function installHistoricPlaytestSquads(global){
  const api=global.FLQuickPlayTeams;if(!api||!api.TEAMS)return;
  const clamp=n=>Math.max(1,Math.min(99,Math.round(n)));
  const LEFT_FOOTED=new Set(['ars-cole','ars-clichy','ars-edu','ars-reyes','che-courtois','che-matic','che-alonso','rm-marcelo','rm-coentrao','rm-di-maria','rm-bale']);
  const roleDefaults=(role,overall)=>{
    if(role==='gk')return{pace:46,accel:48,control:62,pass:70,shoot:24,defend:48,awareness:overall,reactions:overall,strength:76,heading:14,jumping:82,balance:55,agility:overall-2,technique:60,aggression:42,keeper:overall};
    if(role==='def')return{pace:overall-7,accel:overall-8,control:overall-10,pass:overall-11,shoot:overall-35,defend:overall,strength:overall,awareness:overall,reactions:overall,heading:overall-3,jumping:overall-2,balance:overall-8,agility:overall-12,technique:overall-11,aggression:overall-2,keeper:8};
    if(role==='mid')return{pace:overall-7,accel:overall-6,control:overall,pass:overall,shoot:overall-10,defend:overall-16,strength:overall-10,awareness:overall,reactions:overall,heading:overall-16,jumping:overall-14,balance:overall-3,agility:overall-2,technique:overall,aggression:overall-7,keeper:7};
    return{pace:overall,accel:overall,control:overall,pass:overall-7,shoot:overall,strength:overall-10,awareness:overall,reactions:overall,heading:overall-10,jumping:overall-9,balance:overall-3,agility:overall-1,technique:overall,aggression:overall-15,defend:overall-48,keeper:6};
  };
  const player=(id,name,position,overall,number,specific={},appearance={})=>{
    const role=position==='GK'?'gk':['RB','LB','CB','RWB','LWB'].includes(position)?'def':['ST','CF','RW','LW'].includes(position)?'fwd':'mid';
    const attrs=Object.fromEntries(Object.entries({...roleDefaults(role,overall),...specific}).map(([key,value])=>[key,clamp(value)]));
    const season=id.startsWith('ars-')?'2003/04':id.startsWith('rm-')?'2013/14':'2016/17';
    return{id,name,position,role,overall,number,attrs,appearance,preferredFoot:LEFT_FOOTED.has(id)?'Left':'Right',age:0,seasonApps:0,seasonGoals:0,quickPlayProfile:{season,squadRole:'historic-playtest',calibration:'Football Legacy role-and-performance model',source:'historic season and tactical role; custom playtest ratings, not official EA ratings'}};
  };
  const fifa18Player=(...args)=>{
    const result=player(...args);
    result.quickPlayProfile={season:'2016/17',squadRole:'historic-playtest',calibration:'FIFA 18 launch snapshot 180004 direct attribute map',source:'archived FIFA 18 launch database, 25 September 2017; gameplay fields mapped from recorded FIFA attributes'};
    return result;
  };
  const find=id=>api.TEAMS.div1.find(team=>team.id===id);
  const arsenal=find('woolwich-arsenal');
  if(arsenal){
    Object.assign(arsenal,{name:'Arsenal Invincibles',shortName:'ARS 03/04',abbreviation:'ARS',source:'historic-playtest',rating:90,ratings:{overall:90,attack:92,midfield:91,defence:89},formation:'4-4-2',squadId:'historic-arsenal-2003-04',calibration:{season:'2003/04',method:'FIFA 05 post-Invincibles overall anchor with Football Legacy signature attributes',sourceDate:'2004-10-08',source:'FIFA 05 Arsenal ratings and the unbeaten 2003/04 season; bespoke role attributes preserve period identity'}});
    arsenal.squad=[
      player('ars-lehmann','Jens Lehmann','GK',87,1,{keeper:89,awareness:88,reactions:87,agility:84,jumping:86,pass:75,aggression:82}),
      player('ars-stack','Graham Stack','GK',72,24,{keeper:73,awareness:70,reactions:72,agility:73,pass:61}),
      player('ars-lauren','Lauren','RB',89,12,{pace:84,accel:82,control:86,pass:80,defend:92,awareness:92,reactions:89,strength:92,balance:84,aggression:94,technique:82}),
      player('ars-campbell','Sol Campbell','CB',93,23,{pace:82,accel:78,control:75,pass:73,shoot:45,defend:96,awareness:97,reactions:93,strength:98,heading:97,jumping:93,balance:82,agility:68,technique:73,aggression:93}),
      player('ars-toure','Kolo Toure','CB',88,28,{pace:86,accel:84,control:77,pass:75,defend:89,awareness:91,reactions:88,strength:93,heading:86,jumping:93,balance:85,agility:80,technique:75,aggression:91}),
      player('ars-cole','Ashley Cole','LB',89,3,{pace:93,accel:94,control:88,pass:82,shoot:66,defend:92,awareness:91,reactions:90,strength:75,heading:68,jumping:84,balance:91,agility:94,technique:87,aggression:87}),
      player('ars-ljungberg','Freddie Ljungberg','RM',89,8,{pace:91,accel:93,control:90,pass:88,shoot:87,defend:61,awareness:92,reactions:90,strength:73,heading:76,jumping:78,balance:91,agility:93,technique:89,aggression:80}),
      player('ars-vieira','Patrick Vieira','CM',94,4,{pace:86,accel:84,control:93,pass:95,shoot:82,defend:96,awareness:97,reactions:95,strength:97,heading:91,jumping:92,balance:88,agility:84,technique:91,aggression:98}),
      player('ars-gilberto','Gilberto Silva','CM',89,19,{pace:76,accel:74,control:85,pass:86,shoot:72,defend:91,awareness:94,reactions:92,strength:89,heading:88,jumping:90,balance:85,agility:74,technique:84,aggression:89}),
      player('ars-pires','Robert Pires','LM',92,7,{pace:87,accel:89,control:95,pass:94,shoot:88,defend:48,awareness:94,reactions:93,strength:67,heading:68,jumping:69,balance:91,agility:94,technique:95,aggression:56}),
      player('ars-henry','Thierry Henry','ST',97,14,{pace:98,accel:99,control:98,pass:88,shoot:98,defend:35,awareness:98,reactions:98,strength:84,heading:76,jumping:84,balance:95,agility:98,technique:98,aggression:85}),
      player('ars-bergkamp','Dennis Bergkamp','ST',92,10,{pace:76,accel:80,control:99,pass:98,shoot:94,defend:45,awareness:99,reactions:97,strength:78,heading:80,jumping:74,balance:92,agility:90,technique:99,aggression:64}),
      player('ars-cygan','Pascal Cygan','CB',79,18,{pace:63,accel:61,defend:84,awareness:81,reactions:79,strength:88,heading:86,jumping:84}),
      player('ars-clichy','Gael Clichy','LB',76,22,{pace:91,accel:93,control:80,pass:78,defend:78,awareness:77,reactions:78,agility:90}),
      player('ars-edu','Edu','CM',84,17,{pace:76,control:88,pass:90,shoot:83,defend:82,awareness:87,reactions:85,strength:83,technique:89}),
      player('ars-parlour','Ray Parlour','RM',82,15,{pace:80,accel:81,control:82,pass:85,shoot:79,defend:76,awareness:84,reactions:83,strength:82,aggression:91}),
      player('ars-reyes','José Antonio Reyes','ST',87,9,{pace:94,accel:96,control:89,pass:85,shoot:84,awareness:86,reactions:87,balance:90,agility:94,technique:89}),
      player('ars-kanu','Nwankwo Kanu','ST',83,25,{pace:75,accel:72,control:92,pass:85,shoot:82,awareness:88,reactions:85,strength:87,heading:86,balance:81,agility:79,technique:92})
    ];
  }
  const chelsea=find('west-london-blues');
  if(chelsea){
    Object.assign(chelsea,{name:'Conte Chelsea',shortName:'CHE 16/17',abbreviation:'CHE',source:'historic-playtest',rating:84,ratings:{overall:84,attack:85,midfield:85,defence:82},formation:'3-4-3',squadId:'historic-chelsea-2016-17',preferredLineup:['che-courtois','che-azpilicueta','che-luiz','che-cahill','che-moses','che-kante','che-matic','che-alonso','che-pedro','che-costa','che-hazard'],preferredBench:['che-begovic','che-terry','che-fabregas','che-willian','che-batshuayi','che-zouma','che-chalobah'],calibration:{season:'2016/17',method:'FIFA 18 launch snapshot 180004 direct attribute map',sourceDate:'2017-09-25',source:'archived FIFA 18 launch database; no later ratings refresh'}});
    chelsea.squad=[
      fifa18Player('che-courtois','Thibaut Courtois','GK',89,13,{pace:52,accel:46,control:23,pass:69,shoot:14,defend:18,awareness:86,reactions:81,strength:70,heading:13,jumping:68,balance:45,agility:61,technique:13,aggression:23,keeper:89}),
      fifa18Player('che-begovic','Asmir Begović','GK',82,1,{pace:58,accel:52,control:24,pass:73,shoot:12,defend:11,awareness:79,reactions:78,strength:80,heading:12,jumping:38,balance:41,agility:53,technique:16,aggression:42,keeper:82}),
      fifa18Player('che-azpilicueta','César Azpilicueta','CB',85,28,{pace:79,accel:78,control:79,pass:80,shoot:46,defend:88,awareness:87,reactions:86,strength:73,heading:76,jumping:76,balance:73,agility:75,technique:69,aggression:80,keeper:8}),
      fifa18Player('che-luiz','David Luiz','CB',86,30,{pace:71,accel:68,control:79,pass:79,shoot:55,defend:85,awareness:80,reactions:79,strength:81,heading:83,jumping:80,balance:56,agility:72,technique:66,aggression:86,keeper:8}),
      fifa18Player('che-cahill','Gary Cahill','CB',84,24,{pace:63,accel:62,control:63,pass:65,shoot:56,defend:85,awareness:84,reactions:85,strength:80,heading:86,jumping:82,balance:51,agility:62,technique:58,aggression:84,keeper:8}),
      fifa18Player('che-moses','Victor Moses','RWB',79,15,{pace:83,accel:84,control:80,pass:73,shoot:70,defend:72,awareness:68,reactions:76,strength:80,heading:69,jumping:66,balance:83,agility:80,technique:84,aggression:45,keeper:8}),
      fifa18Player('che-kante','N’Golo Kanté','CM',87,7,{pace:80,accel:82,control:79,pass:84,shoot:65,defend:89,awareness:91,reactions:87,strength:77,heading:54,jumping:79,balance:90,agility:83,technique:77,aggression:90,keeper:7}),
      fifa18Player('che-matic','Nemanja Matić','CM',83,21,{pace:66,accel:62,control:78,pass:83,shoot:64,defend:83,awareness:85,reactions:82,strength:89,heading:77,jumping:71,balance:53,agility:56,technique:72,aggression:83,keeper:7}),
      fifa18Player('che-alonso','Marcos Alonso','LWB',81,3,{pace:79,accel:74,control:79,pass:79,shoot:64,defend:80,awareness:77,reactions:82,strength:79,heading:70,jumping:70,balance:58,agility:68,technique:78,aggression:72,keeper:8}),
      fifa18Player('che-pedro','Pedro','RW',84,11,{pace:80,accel:84,control:87,pass:83,shoot:81,defend:32,awareness:84,reactions:84,strength:56,heading:55,jumping:67,balance:82,agility:84,technique:84,aggression:56,keeper:6}),
      fifa18Player('che-costa','Diego Costa','ST',86,19,{pace:75,accel:74,control:83,pass:67,shoot:88,defend:39,awareness:88,reactions:86,strength:91,heading:83,jumping:64,balance:52,agility:58,technique:77,aggression:93,keeper:6}),
      fifa18Player('che-hazard','Eden Hazard','LW',90,10,{pace:87,accel:93,control:92,pass:86,shoot:83,defend:27,awareness:85,reactions:85,strength:65,heading:57,jumping:59,balance:91,agility:93,technique:93,aggression:54,keeper:6}),
      fifa18Player('che-terry','John Terry','CB',78,26,{pace:34,accel:33,control:59,pass:66,shoot:46,defend:80,awareness:81,reactions:74,strength:83,heading:83,jumping:80,balance:46,agility:42,technique:45,aggression:77,keeper:8}),
      fifa18Player('che-fabregas','Cesc Fàbregas','CM',86,4,{pace:62,accel:65,control:86,pass:91,shoot:76,defend:63,awareness:91,reactions:81,strength:64,heading:74,jumping:68,balance:77,agility:65,technique:80,aggression:45,keeper:7}),
      fifa18Player('che-willian','Willian','RW',84,22,{pace:86,accel:91,control:86,pass:82,shoot:77,defend:58,awareness:80,reactions:83,strength:62,heading:29,jumping:46,balance:81,agility:89,technique:87,aggression:44,keeper:6}),
      fifa18Player('che-batshuayi','Michy Batshuayi','ST',80,23,{pace:80,accel:77,control:77,pass:64,shoot:83,defend:26,awareness:83,reactions:79,strength:82,heading:73,jumping:81,balance:78,agility:78,technique:76,aggression:61,keeper:6}),
      fifa18Player('che-zouma','Kurt Zouma','CB',79,5,{pace:71,accel:63,control:66,pass:62,shoot:47,defend:83,awareness:78,reactions:74,strength:88,heading:77,jumping:87,balance:52,agility:45,technique:48,aggression:83,keeper:8}),
      fifa18Player('che-chalobah','Nathaniel Chalobah','CM',75,29,{pace:65,accel:69,control:76,pass:78,shoot:55,defend:77,awareness:70,reactions:69,strength:75,heading:71,jumping:71,balance:65,agility:74,technique:74,aggression:72,keeper:7})
    ];
  }
  let madrid=find('madrid-real-2013-14');
  if(!madrid){
    madrid={id:'madrid-real-2013-14'};
    api.TEAMS.div1.push(madrid);
  }
  Object.assign(madrid,{
    name:'Ancelotti Real Madrid BBC',shortName:'RMA 13/14',abbreviation:'RMA',source:'historic-playtest',countryId:'spain',divisionId:'div1',
    historicSeason:'2013/14',manager:'Carlo Ancelotti',philosophyId:'ancelotti-bbc-433',rating:94,
    ratings:{overall:94,attack:98,midfield:95,defence:92},
    colours:{primary:'#f7f5ef',secondary:'#1d2d59',accent:'#d59a2f'},
    kits:{
      home:{pattern:'plain',primary:'#f7f5ef',secondary:'#d59a2f',shorts:'#f7f5ef',socks:'#f7f5ef'},
      away:{pattern:'plain',primary:'#173a8f',secondary:'#f28a2e',shorts:'#173a8f',socks:'#173a8f'},
      third:{pattern:'plain',primary:'#f28a2e',secondary:'#173a8f',shorts:'#f28a2e',socks:'#f28a2e'}
    },
    formation:'4-3-3',stadiumId:'madrid-santiago-bernabeu',stadium:'Santiago Bernabéu',squadId:'historic-real-madrid-2013-14',
    tacticalDefaults:{mentality:'attacking',width:'wide',support:'forward',pressing:'balanced',tempo:'fast',lineHeight:'balanced',directness:'direct'},
    preferredLineup:['rm-casillas','rm-carvajal','rm-pepe','rm-ramos','rm-marcelo','rm-modric','rm-xabi-alonso','rm-di-maria','rm-bale','rm-benzema','rm-ronaldo'],
    preferredBench:['rm-diego-lopez','rm-varane','rm-coentrao','rm-arbeloa','rm-khedira','rm-isco','rm-morata'],
    formationSlots:[
      {x:.12,y:.82,role:'def',unitRole:'fullback-right',instruction:'provide the right-side release'},
      {x:.12,y:.60,role:'def',unitRole:'centre-back-right',instruction:'hold the right centre'},
      {x:.12,y:.40,role:'def',unitRole:'centre-back-left',instruction:'attack duels and protect depth'},
      {x:.12,y:.18,role:'def',unitRole:'fullback-left',instruction:'supply left-side width'},
      {x:.28,y:.62,role:'mid',unitRole:'central-mid-right',instruction:'control tempo and connect the right'},
      {x:.25,y:.50,role:'mid',unitRole:'defensive-mid-centre',instruction:'anchor behind the ball'},
      {x:.30,y:.36,role:'mid',unitRole:'central-mid-left',instruction:'carry and support the left transition'},
      {x:.43,y:.78,role:'fwd',unitRole:'winger-right',instruction:'run inside from the right'},
      {x:.40,y:.50,role:'fwd',unitRole:'striker-centre',instruction:'link the BBC and occupy centre-backs'},
      {x:.45,y:.26,role:'fwd',unitRole:'winger-left',instruction:'attack the left-centre channel'}
    ],
    calibration:{season:'2013/14',method:'Football Legacy historic role-and-performance model',source:'official Real Madrid and UEFA season, final and tactical records; custom playtest ratings, not official EA ratings'}
  });
  madrid.squad=[
    player('rm-casillas','Iker Casillas','GK',92,1,{keeper:95,awareness:95,agility:96,jumping:93,pass:78,control:70,strength:74,aggression:77}),
    player('rm-diego-lopez','Diego López','GK',86,25,{keeper:88,awareness:87,agility:84,jumping:91,pass:74,strength:86}),
    player('rm-carvajal','Dani Carvajal','RB',88,15,{pace:91,accel:93,control:86,pass:88,shoot:70,defend:87,awareness:90,strength:80,heading:73,jumping:84,balance:91,agility:92,technique:86,aggression:92}),
    player('rm-pepe','Pepe','CB',93,3,{pace:85,accel:82,control:78,pass:82,shoot:58,defend:96,awareness:95,strength:97,heading:94,jumping:96,balance:87,agility:78,technique:78,aggression:98}),
    player('rm-ramos','Sergio Ramos','CB',96,4,{pace:88,accel:86,control:87,pass:89,shoot:82,defend:97,awareness:97,strength:94,heading:98,jumping:99,balance:91,agility:86,technique:88,aggression:98}),
    player('rm-marcelo','Marcelo','LB',92,12,{pace:91,accel:94,control:97,pass:94,shoot:82,defend:85,awareness:91,strength:79,heading:70,jumping:79,balance:96,agility:97,technique:98,aggression:85}),
    player('rm-varane','Raphaël Varane','CB',88,2,{pace:91,accel:88,control:79,pass:81,shoot:49,defend:91,awareness:89,strength:89,heading:89,jumping:95,balance:84,agility:84,technique:79,aggression:85}),
    player('rm-coentrao','Fábio Coentrão','LB',86,5,{pace:89,accel:90,control:85,pass:87,shoot:75,defend:85,awareness:87,strength:78,heading:73,jumping:82,balance:89,agility:90,technique:86,aggression:89}),
    player('rm-arbeloa','Álvaro Arbeloa','RB',83,17,{pace:76,accel:74,control:77,pass:80,shoot:58,defend:87,awareness:89,strength:84,heading:80,jumping:82,balance:80,agility:75,technique:77,aggression:88}),
    player('rm-modric','Luka Modrić','CM',95,19,{pace:84,accel:89,control:98,pass:98,shoot:87,defend:83,awareness:99,strength:72,heading:62,jumping:68,balance:98,agility:98,technique:99,aggression:85}),
    player('rm-xabi-alonso','Xabi Alonso','CDM',94,14,{pace:68,accel:66,control:94,pass:99,shoot:88,defend:92,awareness:99,strength:86,heading:83,jumping:76,balance:87,agility:74,technique:97,aggression:91}),
    player('rm-di-maria','Ángel Di María','CM',95,22,{pace:96,accel:98,control:97,pass:96,shoot:91,defend:72,awareness:97,strength:72,heading:66,jumping:74,balance:96,agility:99,technique:98,aggression:88}),
    player('rm-khedira','Sami Khedira','CM',87,6,{pace:78,accel:76,control:83,pass:87,shoot:80,defend:91,awareness:92,strength:93,heading:91,jumping:91,balance:85,agility:76,technique:83,aggression:94}),
    player('rm-isco','Isco','CAM',90,23,{pace:82,accel:89,control:98,pass:94,shoot:87,defend:61,awareness:94,strength:74,heading:66,jumping:69,balance:97,agility:98,technique:99,aggression:74}),
    player('rm-bale','Gareth Bale','RW',96,11,{pace:99,accel:98,control:95,pass:92,shoot:97,defend:62,awareness:97,strength:91,heading:91,jumping:96,balance:92,agility:94,technique:96,aggression:85}),
    player('rm-benzema','Karim Benzema','ST',94,9,{pace:87,accel:88,control:97,pass:96,shoot:95,defend:48,awareness:99,strength:88,heading:92,jumping:90,balance:94,agility:92,technique:98,aggression:77}),
    player('rm-ronaldo','Cristiano Ronaldo','LW',98,7,{pace:98,accel:99,control:98,pass:92,shoot:99,defend:48,awareness:99,strength:94,heading:99,jumping:99,balance:96,agility:98,technique:99,aggression:91}),
    player('rm-morata','Álvaro Morata','ST',84,21,{pace:87,accel:86,control:83,pass:78,shoot:87,defend:38,awareness:87,strength:85,heading:90,jumping:92,balance:82,agility:83,technique:84,aggression:78})
  ];
})(window);
