window.FLData = (() => {
  const baseClubs = [
    {id:'lancashire-reds',name:'Lancashire Reds',initials:'LR',location:'Accrington, Lancashire',colours:'Red',primary:'#9f1d20',secondary:'#5a0b0d',ground:'Thorneyholme Road',strength:2,finance:310,rival:'darwen-blue-whites',expectation:'Establish the club and avoid the foot of the table.'},
    {id:'claret-blue-lions',name:'Claret & Blue Lions',initials:'CBL',location:'Birmingham, Warwickshire',colours:'Claret & Blue',primary:'#7a1731',secondary:'#79a9c7',ground:'Wellington Road',strength:5,finance:620,rival:'bromwich-blue-whites',expectation:'Challenge for the inaugural Football League championship.'},
    {id:'darwen-blue-whites',name:'Darwen Blue & Whites',initials:'DBW',location:'Blackburn, Lancashire',colours:'Blue & White',primary:'#1f5e9b',secondary:'#e8e6da',ground:'Leamington Road',strength:4,finance:545,rival:'lancashire-reds',expectation:'Compete in the upper reaches of the league.'},
    {id:'manchester-whites',name:'Manchester Whites',initials:'MW',location:'Bolton, Lancashire',colours:'White & Navy',primary:'#e9e7df',secondary:'#142d4f',ground:'Pike’s Lane',strength:3,finance:430,rival:'manchester-clarets',expectation:'Deliver a steady and competitive first campaign.'},
    {id:'manchester-clarets',name:'Manchester Clarets',initials:'MC',location:'Burnley, Lancashire',colours:'Claret & Light Blue',primary:'#7c203b',secondary:'#83b8d8',ground:'Turf Moor',strength:3,finance:420,rival:'manchester-whites',expectation:'Build a difficult side to beat and finish safely.'},
    {id:'midlands-athletic',name:'Midlands Athletic',initials:'MA',location:'Derby, Derbyshire',colours:'Black & White',primary:'#171717',secondary:'#efeee7',ground:'County Ground',strength:3,finance:455,rival:'sherwood-fc',expectation:'Play disciplined football and secure a respectable finish.'},
    {id:'liverpool-blues',name:'Liverpool Blues',initials:'LB',location:'Liverpool, Lancashire',colours:'Royal Blue & White',primary:'#1755a0',secondary:'#e9e8e0',ground:'Anfield Road',strength:4,finance:590,rival:'ribble-end-fc',expectation:'Mount a title challenge and protect the home ground.'},
    {id:'sherwood-fc',name:'Sherwood FC',initials:'SFC',location:'Nottingham, Nottinghamshire',colours:'Black & White',primary:'#111111',secondary:'#f0efe8',ground:'Trent Bridge',strength:3,finance:390,rival:'midlands-athletic',expectation:'Establish the club and finish in the upper half.'},
    {id:'ribble-end-fc',name:'Ribble End FC',initials:'REF',location:'Preston, Lancashire',colours:'White & Navy',primary:'#f3f1e7',secondary:'#14294a',ground:'Deepdale',strength:5,finance:650,rival:'liverpool-blues',expectation:'Win the inaugural Football League championship.'},
    {id:'trent-fc',name:'Trent FC',initials:'TFC',location:'Stoke-on-Trent, Staffordshire',colours:'Red & White',primary:'#b5262d',secondary:'#f0eee5',ground:'Victoria Ground',strength:2,finance:300,rival:'midlands-athletic',expectation:'Avoid the bottom places and create a strong home identity.'},
    {id:'bromwich-blue-whites',name:'Bromwich Blue & Whites',initials:'BBW',location:'West Bromwich, Staffordshire',colours:'Blue & White',primary:'#204f92',secondary:'#eeeade',ground:'Stoney Lane',strength:4,finance:500,rival:'claret-blue-lions',expectation:'Compete with the strongest founding clubs.'},
    {id:'birmingham-oranges',name:'Birmingham Oranges',initials:'BO',location:'Wolverhampton, Staffordshire',colours:'Old Gold & Black',primary:'#c58b1a',secondary:'#171717',ground:'Dudley Road',strength:4,finance:565,rival:'claret-blue-lions',expectation:'Launch an aggressive challenge for the title.'}
  ];


  const founderReferences = {
    'lancashire-reds':'Accrington',
    'claret-blue-lions':'Aston Villa',
    'darwen-blue-whites':'Blackburn Rovers',
    'manchester-whites':'Bolton Wanderers',
    'manchester-clarets':'Burnley',
    'midlands-athletic':'Derby County',
    'liverpool-blues':'Everton',
    'sherwood-fc':'Notts County',
    'ribble-end-fc':'Preston North End',
    'trent-fc':'Stoke City',
    'bromwich-blue-whites':'West Bromwich Albion',
    'birmingham-oranges':'Wolverhampton Wanderers'
  };
  const founderMemberships = {
    // Accrington were one of the twelve founders but left the League in 1896.
    'lancashire-reds':[[1888,1896]]
  };
  const clubs = baseClubs.map(club => {
    const seeded={...club,realClub:founderReferences[club.id]||club.realClub,membershipPeriods:founderMemberships[club.id]||club.membershipPeriods};
    return window.FLClubDatabase?.applyEnglishSeed ? FLClubDatabase.applyEnglishSeed(seeded) : seeded;
  });

  const firstNames = ['Arthur','Albert','Alfred','Charles','Edwin','Ernest','Frederick','George','Harry','Henry','Herbert','James','John','Joseph','Samuel','Thomas','Walter','William'];
  const lastNames = ['Barker','Bennett','Brown','Clarke','Cooper','Davies','Fletcher','Green','Harris','Hill','Hughes','Jackson','Jones','Mason','Miller','Moore','Roberts','Robinson','Smith','Taylor','Walker','Ward','Watson','White','Wood','Wright'];
  const positions = ['GK','FB','FB','HB','HB','HB','IF','IF','CF','W','W','GK','FB','FB','HB','HB','IF','CF','W','W'];

  return { clubs, firstNames, lastNames, positions };
})();
