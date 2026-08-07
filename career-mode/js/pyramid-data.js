window.FLPyramidData = (() => {
  const formats = [
    {from:1888,to:1888,era:'The Football League Is Founded',historicalStructure:true,noMovement:true,noMovementNote:'There was no promotion or relegation. League membership was decided by election.',divisions:[{id:'division-one',name:'Football League',tier:1,size:12}]},
    {from:1889,to:1890,era:'Football League and Football Alliance',historicalStructure:true,noMovement:true,noMovementNote:'The Football Alliance was a separate rival competition. There was no automatic movement between it and the Football League.',divisions:[{id:'division-one',name:'Football League',tier:1,size:12},{id:'football-alliance',name:'Football Alliance',tier:2,size:12,separateCompetition:true}]},
    {from:1891,to:1891,era:'League Expansion and the Football Alliance',historicalStructure:true,noMovement:true,noMovementNote:'The Football League expanded to 14 clubs while the Football Alliance continued separately. Membership changes were decided by election.',divisions:[{id:'division-one',name:'Football League',tier:1,size:14},{id:'football-alliance',name:'Football Alliance',tier:2,size:12,separateCompetition:true}]},
    {from:1892,to:1892,era:'First and Second Divisions',historicalStructure:true,divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:16},{id:'division-two',name:'Football League Second Division',tier:2,size:12}]},
    {from:1893,to:1893,era:'Two Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:16},{id:'division-two',name:'Football League Second Division',tier:2,size:15}]},
    {from:1894,to:1897,era:'Two Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:16},{id:'division-two',name:'Football League Second Division',tier:2,size:16}]},
    {from:1898,to:1904,era:'Automatic Movement',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:18},{id:'division-two',name:'Football League Second Division',tier:2,size:18}]},
    {from:1905,to:1914,era:'Edwardian Expansion',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:20},{id:'division-two',name:'Football League Second Division',tier:2,size:20}]},
    {from:1915,to:1918,era:'First World War Regional Football',wartime:true,official:false,noMovement:true,divisions:[{id:'wartime-north',name:'Wartime Northern League',tier:1,size:28,regional:true,region:'north'},{id:'wartime-south',name:'Wartime Southern League',tier:1,size:28,regional:true,region:'south'}]},
    {from:1919,to:1919,era:'Post-war Expansion',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22}]},
    {from:1920,to:1920,era:'Three Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three',name:'Football League Third Division',tier:3,size:22}]},
    {from:1921,to:1922,era:'Regional Third Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three-north',name:'Third Division North',tier:3,size:20,region:'north'},{id:'division-three-south',name:'Third Division South',tier:3,size:22,region:'south'}]},
    {from:1923,to:1938,era:'Regional Third Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three-north',name:'Third Division North',tier:3,size:22,region:'north'},{id:'division-three-south',name:'Third Division South',tier:3,size:22,region:'south'}]},
    {from:1939,to:1945,era:'Second World War Regional Football',wartime:true,official:false,noMovement:true,divisions:[{id:'wartime-north',name:'Wartime Northern League',tier:1,size:36,regional:true,region:'north'},{id:'wartime-south',name:'Wartime Southern League',tier:1,size:36,regional:true,region:'south'}]},
    {from:1946,to:1949,era:'Regional Third Divisions Restored',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three-north',name:'Third Division North',tier:3,size:22,region:'north'},{id:'division-three-south',name:'Third Division South',tier:3,size:22,region:'south'}]},
    {from:1950,to:1957,era:'The 92-club League',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three-north',name:'Third Division North',tier:3,size:24,region:'north'},{id:'division-three-south',name:'Third Division South',tier:3,size:24,region:'south'}]},
    {from:1958,to:1978,era:'Four National Divisions',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24}]},
    {from:1979,to:1980,era:'Alliance Premier League Founded',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24},{id:'alliance-premier',name:'Alliance Premier League',tier:5,size:20}]},
    {from:1981,to:1985,era:'Five-tier National Pyramid',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24},{id:'alliance-premier',name:'Alliance Premier League',tier:5,size:22}]},
    {from:1986,to:1986,era:'Football Conference',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:22},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:1987,to:1987,era:'Play-off Reform',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:21},{id:'division-two',name:'Football League Second Division',tier:2,size:23},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:1988,to:1990,era:'Play-off Reform',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:20},{id:'division-two',name:'Football League Second Division',tier:2,size:24},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:24},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:1991,to:1991,era:'Pre-Premier Reorganisation',divisions:[{id:'division-one',name:'Football League First Division',tier:1,size:22},{id:'division-two',name:'Football League Second Division',tier:2,size:24},{id:'division-three',name:'Football League Third Division',tier:3,size:24},{id:'division-four',name:'Football League Fourth Division',tier:4,size:22},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:1992,to:1994,era:'Premier League Launch',divisions:[{id:'premier-league',name:'Premier League',tier:1,size:22},{id:'division-one',name:'Football League First Division',tier:2,size:24},{id:'division-two',name:'Football League Second Division',tier:3,size:24},{id:'division-three',name:'Football League Third Division',tier:4,size:22},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:1995,to:2003,era:'Five-tier English Pyramid',divisions:[{id:'premier-league',name:'Premier League',tier:1,size:20},{id:'division-one',name:'Football League First Division',tier:2,size:24},{id:'division-two',name:'Football League Second Division',tier:3,size:24},{id:'division-three',name:'Football League Third Division',tier:4,size:24},{id:'football-conference',name:'Football Conference',tier:5,size:22}]},
    {from:2004,to:2005,era:'Premier League, EFL and Conference',divisions:[{id:'premier-league',name:'Premier League',tier:1,size:20},{id:'championship',name:'EFL Championship',tier:2,size:24},{id:'league-one',name:'EFL League One',tier:3,size:24},{id:'league-two',name:'EFL League Two',tier:4,size:24},{id:'conference-national',name:'Conference National',tier:5,size:22}]},
    {from:2006,to:2014,era:'Premier League, EFL and Conference',divisions:[{id:'premier-league',name:'Premier League',tier:1,size:20},{id:'championship',name:'EFL Championship',tier:2,size:24},{id:'league-one',name:'EFL League One',tier:3,size:24},{id:'league-two',name:'EFL League Two',tier:4,size:24},{id:'conference-national',name:'Conference National',tier:5,size:24}]},
    {from:2015,to:9999,era:'Premier League, EFL and National League',divisions:[{id:'premier-league',name:'Premier League',tier:1,size:20},{id:'championship',name:'EFL Championship',tier:2,size:24},{id:'league-one',name:'EFL League One',tier:3,size:24},{id:'league-two',name:'EFL League Two',tier:4,size:24},{id:'national-league',name:'National League',tier:5,size:24}]}
  ];

  // Exact organised-league membership for the first five seasons. Clubs outside
  // these lists may exist and play cups/friendlies, but are not placed into an
  // invented national pyramid.
  const historicalStructures = Object.freeze({
    1888:{
      note:'The Football League begins with 12 founder members. The separate Combination was badly organised and collapsed before completing its season, so it is recorded as history rather than treated as a stable selectable league.',
      divisions:{
        'division-one':['Accrington','Aston Villa','Blackburn Rovers','Bolton Wanderers','Burnley','Derby County','Everton','Notts County','Preston North End','Stoke City','West Bromwich Albion','Wolverhampton Wanderers']
      }
    },
    1889:{
      note:'The Football League remains a 12-club competition. The Football Alliance starts as a separate 12-club rival league; there is no automatic promotion or relegation between them.',
      divisions:{
        'division-one':['Accrington','Aston Villa','Blackburn Rovers','Bolton Wanderers','Burnley','Derby County','Everton','Notts County','Preston North End','Stoke City','West Bromwich Albion','Wolverhampton Wanderers'],
        'football-alliance':["Birmingham St George's",'Bootle','Crewe Alexandra','Darwen','Grimsby Town','Long Eaton Rangers','Manchester United','Nottingham Forest','Sheffield Wednesday','Birmingham City','Sunderland Albion','Walsall']
      }
    },
    1890:{
      note:'Sunderland replace Stoke in the Football League. Stoke enter the Football Alliance after Long Eaton Rangers leave.',
      divisions:{
        'division-one':['Accrington','Aston Villa','Blackburn Rovers','Bolton Wanderers','Burnley','Derby County','Everton','Notts County','Preston North End','Sunderland','West Bromwich Albion','Wolverhampton Wanderers'],
        'football-alliance':["Birmingham St George's",'Bootle','Crewe Alexandra','Darwen','Grimsby Town','Manchester United','Nottingham Forest','Sheffield Wednesday','Birmingham City','Sunderland Albion','Walsall','Stoke City']
      }
    },
    1891:{
      note:'The Football League expands to 14 clubs by admitting Darwen and readmitting Stoke. The Football Alliance continues for one final season.',
      divisions:{
        'division-one':['Accrington','Aston Villa','Blackburn Rovers','Bolton Wanderers','Burnley','Darwen','Derby County','Everton','Notts County','Preston North End','Stoke City','Sunderland','West Bromwich Albion','Wolverhampton Wanderers'],
        'football-alliance':['Manchester City',"Birmingham St George's",'Bootle','Burton United','Crewe Alexandra','Grimsby Town','Lincoln City','Manchester United','Nottingham Forest','Sheffield Wednesday','Birmingham City','Walsall']
      }
    },
    1892:{
      note:'The Football Alliance is absorbed. The Football League creates a 16-club First Division and a new 12-club Second Division.',
      divisions:{
        'division-one':['Accrington','Aston Villa','Blackburn Rovers','Bolton Wanderers','Burnley','Derby County','Everton','Manchester United','Nottingham Forest','Notts County','Preston North End','Sheffield Wednesday','Stoke City','Sunderland','West Bromwich Albion','Wolverhampton Wanderers'],
        'division-two':['Manchester City','Bootle','Burton United','Crewe Alexandra','Darwen','Grimsby Town','Lincoln City','Northwich Victoria','Port Vale','Sheffield United','Birmingham City','Walsall']
      }
    }
  });



  // First appearance in the Football League/Premier League. A club may be
  // founded and play regional football before this date; this date only opens
  // the professional national-league gate.
  const footballLeagueFirstAppearance = Object.freeze({
    "Accrington":1888,
    "Aston Villa":1888,
    "Blackburn Rovers":1888,
    "Bolton Wanderers":1888,
    "Burnley":1888,
    "Derby County":1888,
    "Everton":1888,
    "Notts County":1888,
    "Preston North End":1888,
    "Stoke City":1888,
    "West Bromwich Albion":1888,
    "Wolverhampton Wanderers":1888,
    "Sunderland":1890,
    "Darwen":1891,
    "Birmingham City":1892,
    "Bootle":1892,
    "Burton Swifts":1892,
    "Crewe Alexandra":1892,
    "Grimsby Town":1892,
    "Lincoln City":1892,
    "Manchester City":1892,
    "Manchester United":1892,
    "Northwich Victoria":1892,
    "Nottingham Forest":1892,
    "Port Vale":1892,
    "Sheffield United":1892,
    "Sheffield Wednesday":1892,
    "Walsall":1892,
    "Arsenal":1893,
    "Liverpool":1893,
    "Middlesbrough Ironopolis":1893,
    "Newcastle United":1893,
    "Rotherham Town":1893,
    "Burton Wanderers":1894,
    "Bury":1894,
    "Leicester City":1894,
    "Loughborough":1895,
    "Blackpool":1896,
    "Gainsborough Trinity":1896,
    "Luton Town":1897,
    "Barnsley":1898,
    "Glossop":1898,
    "New Brighton Tower":1898,
    "Chesterfield":1899,
    "Middlesbrough":1899,
    "Stockport County":1900,
    "Bristol City":1901,
    "Burton United":1901,
    "Doncaster Rovers":1901,
    "Bradford City":1903,
    "Chelsea":1905,
    "Hull City":1905,
    "Leeds City":1905,
    "Leyton Orient":1905,
    "Fulham":1907,
    "Oldham Athletic":1907,
    "Bradford Park Avenue":1908,
    "Tottenham Hotspur":1908,
    "Huddersfield Town":1910,
    "Coventry City":1919,
    "Gateshead":1919,
    "South Shields":1919,
    "Rotherham United":1925,
    "West Ham United":1919,
    "Brentford":1920,
    "Brighton & Hove Albion":1920,
    "Bristol Rovers":1920,
    "Cardiff City":1920,
    "Crystal Palace":1920,
    "Exeter City":1920,
    "Gillingham":1920,
    "Leeds United":1920,
    "Merthyr Town":1920,
    "Millwall":1920,
    "Newport County":1920,
    "Northampton Town":1920,
    "Norwich City":1920,
    "Plymouth Argyle":1920,
    "Portsmouth":1920,
    "Queens Park Rangers":1920,
    "Reading":1920,
    "Southampton":1920,
    "Southend United":1920,
    "Swansea City":1920,
    "Swindon Town":1920,
    "Watford":1920,
    "Aberdare Athletic":1921,
    "Accrington Stanley":1921,
    "Ashington":1921,
    "Barrow":1921,
    "Charlton Athletic":1921,
    "Darlington":1921,
    "Durham City":1921,
    "FC Halifax Town":1921,
    "Halifax Town":1921,
    "Hartlepool United":1921,
    "Nelson":1921,
    "Rochdale":1921,
    "Southport":1921,
    "Stalybridge Celtic":1921,
    "Tranmere Rovers":1921,
    "Wigan Borough":1921,
    "Wrexham":1921,
    "AFC Bournemouth":1923,
    "New Brighton":1923,
    "Torquay United":1927,
    "Carlisle United":1928,
    "York City":1929,
    "Thames":1930,
    "Chester":1931,
    "Chester City":1931,
    "Mansfield Town":1931,
    "Aldershot":1932,
    "Ipswich Town":1938,
    "Colchester United":1950,
    "Scunthorpe United":1950,
    "Shrewsbury Town":1950,
    "Workington":1951,
    "Peterborough United":1960,
    "Oxford United":1962,
    "Cambridge United":1970,
    "Hereford":1972,
    "Hereford United":1972,
    "Wimbledon":1977,
    "Wigan Athletic":1978,
    "Scarborough":1987,
    "Maidstone United":1989,
    "Barnet":1991,
    "Wycombe Wanderers":1993,
    "Macclesfield":1997,
    "Macclesfield Town":1997,
    "Cheltenham Town":1999,
    "Kidderminster Harriers":2000,
    "Rushden & Diamonds":2001,
    "Boston United":2002,
    "Yeovil Town":2003,
    "Milton Keynes Dons":2004,
    "Dagenham & Redbridge":2007,
    "Morecambe":2007,
    "Aldershot Town":2008,
    "Burton Albion":2009,
    "Stevenage":2010,
    "Crawley Town":2011,
    "Fleetwood Town":2012,
    "Forest Green Rovers":2017,
    "Salford City":2019,
    "Harrogate Town":2020,
    "Sutton United":2021,
    "Bromley":2024
  });

  const regionalEntryOverrides = Object.freeze({
    'Chatham':{year:1894,divisionId:'southern-one',tier:3},
    'Clapton':{year:1894,divisionId:'southern-one',tier:3},
    'Ilford':{year:1894,divisionId:'southern-one',tier:3},
    'Luton Town':{year:1894,divisionId:'southern-one',tier:3},
    'Millwall':{year:1894,divisionId:'southern-one',tier:3},
    'Reading':{year:1894,divisionId:'southern-one',tier:3},
    'Royal Ordnance Factories':{year:1894,divisionId:'southern-one',tier:3},
    'Southampton':{year:1894,divisionId:'southern-one',tier:3},
    'Swindon Town':{year:1894,divisionId:'southern-one',tier:3},
    'Gillingham':{year:1894,divisionId:'southern-two',tier:4},
    'New Brompton':{year:1894,divisionId:'southern-two',tier:4},
    'Sheppey United':{year:1894,divisionId:'southern-two',tier:4},
    'Uxbridge':{year:1894,divisionId:'southern-two',tier:4},
    'Bromley':{year:1894,divisionId:'southern-two',tier:4},
    'Maidenhead United':{year:1894,divisionId:'southern-two',tier:4},
    'Maidenhead':{year:1894,divisionId:'southern-two',tier:4},
    'Chesham':{year:1894,divisionId:'southern-two',tier:4},
    'Chesham Town':{year:1894,divisionId:'southern-two',tier:4},
    'Chesham United':{year:1917,divisionId:'athenian-league',tier:5},
    "Old St Stephen's":{year:1894,divisionId:'southern-two',tier:4},
    'Casuals':{year:1905,divisionId:'isthmian-league',tier:4},
    'Civil Service':{year:1905,divisionId:'isthmian-league',tier:4},
    'Ealing Association':{year:1905,divisionId:'isthmian-league',tier:4},
    'London Caledonians':{year:1905,divisionId:'isthmian-league',tier:4},
    'Catford Southend':{year:1912,divisionId:'athenian-league',tier:5},
    'Barnet':{year:1912,divisionId:'athenian-league',tier:5},
    'Tufnell Park':{year:1912,divisionId:'athenian-league',tier:5},
    'Finchley':{year:1912,divisionId:'athenian-league',tier:5},
    'Grays Athletic':{year:1912,divisionId:'athenian-league',tier:5},
    'Chelmsford':{year:1912,divisionId:'athenian-league',tier:5},
    'Chelmsford City':{year:1938,divisionId:'southern-league',tier:4},
    'Enfield':{year:1912,divisionId:'athenian-league',tier:5},
    'Romford Town':{year:1912,divisionId:'athenian-league',tier:5},
    'Barking':{year:1912,divisionId:'athenian-league',tier:5}
  });

  const competitionSnapshots = Object.freeze({
    1894:{divisions:{
      'southern-one':['Chatham','Clapton','Ilford','Luton Town','Millwall','Reading','Royal Ordnance Factories','Southampton','Swindon Town'],
      'southern-two':['Gillingham','Sheppey United','Uxbridge','Bromley','Maidenhead United','Chesham',"Old St Stephen's"]
    }},
    1905:{divisions:{
      'isthmian-league':['Casuals','Civil Service','Clapton','Ealing Association','Ilford','London Caledonians']
    }},
    1912:{divisions:{
      'athenian-league':['Catford Southend','Barnet','Tufnell Park','Finchley','Grays Athletic','Chelmsford','Enfield','Chesham','Romford Town','Barking']
    }}
  });

  function footballLeagueEntryFor(reference){
    const row=window.FLClubDatabase?.englishByReference?.(reference);
    const key=row?.reference||String(reference||'').replace(/\s+(parallel|founder|database)$/i,'');
    return footballLeagueFirstAppearance[key]??null;
  }
  function regionalEntryFor(reference){
    const row=window.FLClubDatabase?.englishByReference?.(reference);
    const key=row?.reference||String(reference||'').replace(/\s+(parallel|founder|database)$/i,'');
    return regionalEntryOverrides[key]||regionalEntryOverrides[String(reference||'').replace(/\s+(parallel|founder|database)$/i,'')]||null;
  }
  function footballLeagueEntryTier(year){
    year=Number(year)||1888;
    if(year<=1891)return 1;
    if(year<=1919)return 2;
    if(year<=1957)return 3;
    return 4;
  }

  const palettes = [
    ['#a91f2d','#eeeade'],['#21539a','#eeeade'],['#171717','#eeeade'],['#7d233f','#79add0'],
    ['#d9b729','#1c1c1c'],['#1e6b45','#eeeade'],['#e07826','#172e4d'],['#eeeade','#18345a']
  ];
  const slug = s => String(s).toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  function seed(reference,name,entry,location,region='south',strength=2,periods=null,ground='Town Ground',founded=null,systemEntry=null,extra={}){
    const i=Math.abs([...reference].reduce((n,c)=>n+c.charCodeAt(0),0))%palettes.length,p=palettes[i],leagueEntry=entry!==null&&entry!==''&&Number.isFinite(Number(entry))?Number(entry):null,entryYear=systemEntry!==null&&systemEntry!==''&&Number.isFinite(Number(systemEntry))?Number(systemEntry):(leagueEntry||1979);
    return {id:slug(name),name,initials:name.split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase(),location,region,leagueEntry,systemEntry:entryYear,membershipPeriods:periods||(leagueEntry?[[leagueEntry,null]]:[]),strength,primary:p[0],secondary:p[1],colours:'Traditional club colours',ground,founded:founded||`${Math.max(1850,entryYear-12)}-01-01`,reference:`${reference} parallel`,...extra};
  }
  function allianceSeed(reference,name,leagueEntry,location,region='south',strength=2,periods=null,ground='Town Ground',founded=null){
    return seed(reference,name,leagueEntry,location,region,strength,periods,ground,founded,1979,{fifthTierFounder:true});
  }

  // First Football League admission year is fixed. Results, promotion and relegation are simulation-driven.
  const clubSeeds = [
    seed('Darwen','Darwen Vale',1891,'Darwen, Lancashire','north',2,[[1891,1899]],'Barley Bank','1870-01-01',1889),
    seed('Birmingham City','Birmingham Blues',1892,'Birmingham, Warwickshire','south',3,null,'Muntz Street','1875-01-01',1889),
    seed('Bootle','Bootle Dock FC',1892,'Bootle, Lancashire','north',2,[[1892,1893]],'Hawthorne Road','1879-01-01',1889),
    seed('Burton United','Burton Swifts',1892,'Burton upon Trent, Staffordshire','north',2,[[1892,1907]],'Peel Croft','1871-01-01',1891),
    seed('Crewe Alexandra','Crewe Railway',1892,'Crewe, Cheshire','north',2,[[1892,1896],[1921,null]],'Alexandra Recreation Ground','1877-01-01',1889),
    seed('Grimsby Town','Grimsby Mariners',1892,'Grimsby, Lincolnshire','north',3,[[1892,1910],[1911,null]],'Abbey Park','1878-01-01',1889),
    seed('Lincoln City','Lincoln Imps FC',1892,'Lincoln, Lincolnshire','north',2,[[1892,1908],[1909,1911],[1912,1920],[1921,1987],[1988,null]],'John O Gaunts','1884-01-01',1891),
    seed('Northwich Victoria','Northwich Vale',1892,'Northwich, Cheshire','north',2,[[1892,1894]],'Drill Field',null,null,{fifthTierFounder:true}),
    seed('Port Vale','Burslem Vale',1892,'Burslem, Staffordshire','north',2,[[1892,1896],[1898,1907],[1919,null]]),
    seed('Walsall','Walsall Saddlers',1892,'Walsall, Staffordshire','north',2,[[1892,1895],[1896,1901],[1921,null]],'Fellows Park','1888-01-01',1889),
    seed("Birmingham St George's","Birmingham St George's",null,'Birmingham, Warwickshire','south',2,[],'Cape Hill','1881-01-01',1889,{ceased:1892,historicalOnly:true}),
    seed('Long Eaton Rangers','Long Eaton Rangers',null,'Long Eaton, Derbyshire','north',1,[],'Recreation Ground','1882-01-01',1889,{ceased:1890,historicalOnly:true}),
    seed('Sunderland Albion','Sunderland Albion',null,'Sunderland, County Durham','north',3,[],'Blue House Field','1888-01-01',1889,{ceased:1892,historicalOnly:true}),
    seed('Rotherham Town','Rotherham Townsmen',1893,'Rotherham, Yorkshire','north',2,[[1893,1896]]),
    seed('Middlesbrough Ironopolis','Teesside Ironopolis',1893,'Middlesbrough, Yorkshire','north',2,[[1893,1894]]),
    seed('Bury','Bury Borough',1894,'Bury, Lancashire','north',3),
    seed('Loughborough','Loughborough Athletic',1895,'Loughborough, Leicestershire','north',2,[[1895,1900]]),
    seed('Gainsborough Trinity','Gainsborough Pilgrims',1896,'Gainsborough, Lincolnshire','north',2,[[1896,1912]]),
    seed('Barnsley','Barnsley Oaks',1898,'Barnsley, Yorkshire','north',3),
    seed('Glossop','Glossop North',1898,'Glossop, Derbyshire','north',2,[[1898,1915]]),
    seed('New Brighton Tower','Mersey Tower FC',1898,'New Brighton, Cheshire','north',2,[[1898,1901]]),
    seed('Chesterfield','Chesterfield Spires',1899,'Chesterfield, Derbyshire','north',2,[[1899,1909],[1921,null]]),
    seed('Stockport County','Stockport Hatters',1900,'Stockport, Cheshire','north',3,[[1900,1904],[1905,null]]),
    seed('Doncaster Rovers','Doncaster Locomotive',1901,'Doncaster, Yorkshire','north',2,[[1901,1903],[1904,1905],[1923,1998],[2003,null]]),
    seed('Bradford City','Bradford Claret',1903,'Bradford, Yorkshire','north',3),
    seed('Leeds City','Leeds City Railway',1905,'Leeds, Yorkshire','north',2,[[1905,1915]]),
    seed('Oldham Athletic','Oldham Mill FC',1907,'Oldham, Lancashire','north',3),
    seed('Bradford Park Avenue','Bradford Avenue',1908,'Bradford, Yorkshire','north',2,[[1908,1970]]),
    seed('Gateshead / South Shields','Tyneside Borough',1919,'South Shields, County Durham','north',2,[[1919,1960]]),
    seed('Rotherham County','Rotherham County Works',1919,'Rotherham, Yorkshire','north',3,[[1919,1925]],'Millmoor','1870-01-01',1919,{ceased:1925,historicalOnly:true}),
    seed('Brentford','Brentford Riverside',1920,'Brentford, Middlesex','south',3),
    seed('Cardiff City','Cardiff Dragons',1920,'Cardiff, Glamorgan','south',3),
    seed('Exeter City','Exeter Cathedral',1920,'Exeter, Devon','south',2),
    seed('Gillingham','Medway Garrison',1920,'Gillingham, Kent','south',2,[[1920,1938],[1950,null]]),
    seed('Northampton Town','Northampton Bootmakers',1920,'Northampton, Northamptonshire','south',2),
    seed('Southend United','Southend Pier FC',1920,'Southend-on-Sea, Essex','south',2),
    seed('Swansea City','Swansea Harbour',1920,'Swansea, Glamorgan','south',3),
    seed('Swindon Town','Swindon Railway',1920,'Swindon, Wiltshire','south',2),
    seed('Merthyr Town','Merthyr Iron FC',1920,'Merthyr Tydfil, Glamorgan','south',2,[[1920,1930]]),
    seed('Aberdare Athletic','Aberdare Valleys',1921,'Aberdare, Glamorgan','south',2,[[1921,1927]]),
    seed('Accrington Stanley','Accrington Borough',1921,'Accrington, Lancashire','north',2,[[1921,1962],[2006,null]]),
    seed('Ashington','Ashington Colliery',1921,'Ashington, Northumberland','north',2,[[1921,1929]]),
    seed('Barrow','Barrow Shipyard',1921,'Barrow-in-Furness, Lancashire','north',2,[[1921,1972],[2020,null]],'Holker Street',null,null,{fifthTierFounder:true}),
    seed('Charlton Athletic','Charlton Valley',1921,'Charlton, London','south',3),
    seed('Darlington','Darlington Railway',1921,'Darlington, County Durham','north',2,[[1921,1989],[1990,2010]]),
    seed('Durham City','Durham Cathedral',1921,'Durham, County Durham','north',2,[[1921,1928]]),
    seed('Halifax Town','Halifax Borough',1921,'Halifax, Yorkshire','north',2,[[1921,1993],[1998,2002]]),
    seed('Hartlepool United','Hartlepool Dock',1921,'Hartlepool, County Durham','north',2),
    seed('Nelson','Nelson Weavers',1921,'Nelson, Lancashire','north',2,[[1921,1931]]),
    seed('Rochdale','Rochdale Pioneers',1921,'Rochdale, Lancashire','north',2),
    seed('Stalybridge Celtic','Stalybridge Bridge',1921,'Stalybridge, Cheshire','north',2,[[1921,1923]]),
    seed('Tranmere Rovers','Birkenhead Rovers',1921,'Birkenhead, Cheshire','north',2),
    seed('Wigan Borough','Wigan Borough FC',1921,'Wigan, Lancashire','north',2,[[1921,1931]]),
    seed('Wrexham','Wrexham Dragons',1921,'Wrexham, Denbighshire','north',3,[[1921,2008],[2023,null]]),
    seed('New Brighton','Wirral New Brighton',1923,'New Brighton, Cheshire','north',2,[[1923,1951]]),
    seed('Torquay United','Torquay Riviera',1927,'Torquay, Devon','south',2,[[1927,2007],[2009,2014]]),
    seed('Carlisle United','Carlisle Borderers',1928,'Carlisle, Cumberland','north',2,[[1928,2004],[2005,null]]),
    seed('York City','York Minster',1929,'York, Yorkshire','north',2,[[1929,2004],[2012,2016],[2026,null]]),
    seed('Thames','Thames Dock FC',1930,'Custom House, London','south',1,[[1930,1932]]),
    seed('Chester City','Chester Romans',1931,'Chester, Cheshire','north',2,[[1931,2000],[2004,2009]]),
    seed('Mansfield Town','Mansfield Forest',1931,'Mansfield, Nottinghamshire','north',2,[[1931,2008],[2013,null]]),
    seed('Aldershot','Aldershot Garrison',1932,'Aldershot, Hampshire','south',2,[[1932,1992],[2008,2013]]),
    seed('Ipswich Town','Ipswich Orwell',1938,'Ipswich, Suffolk','south',3),
    seed('Scunthorpe United','Scunthorpe Iron',1950,'Scunthorpe, Lincolnshire','north',2),
    seed('Shrewsbury Town','Shrewsbury Abbey',1950,'Shrewsbury, Shropshire','south',2),
    seed('Workington','Workington Steel',1951,'Workington, Cumberland','north',2,[[1951,1977]]),
    seed('Oxford United','Oxford Scholars',1962,'Oxford, Oxfordshire','south',2,[[1962,2006],[2010,null]]),
    seed('Cambridge United','Cambridge Scholars',1970,'Cambridge, Cambridgeshire','south',2,[[1970,2005],[2014,null]]),
    seed('Hereford United','Hereford Cathedral',1972,'Hereford, Herefordshire','south',2,[[1972,1997],[2006,2012]]),
    seed('Wimbledon / Milton Keynes','Wimbledon Commons',1977,'Wimbledon, London','south',3),
    allianceSeed('A P Leamington','Leamington Spa FC',null,'Leamington Spa, Warwickshire','south',2,[], 'Windmill Ground','1933-01-01'),
    allianceSeed('Altrincham','Altrincham Robins',null,'Altrincham, Cheshire','north',3,[], 'Moss Lane','1891-01-01'),
    allianceSeed('Bangor City','Bangor Citizens',null,'Bangor, Gwynedd','north',2,[], 'Farrar Road','1876-01-01'),
    allianceSeed('Bath City','Bath Romans',null,'Bath, Somerset','south',2,[], 'Twerton Park','1889-01-01'),
    allianceSeed('Gravesend & Northfleet','Thamesfleet FC',null,'Gravesend, Kent','south',2,[], 'Stonebridge Road','1946-01-01'),
    allianceSeed('Kettering Town','Kettering Poppies',null,'Kettering, Northamptonshire','south',3,[], 'Rockingham Road','1872-01-01'),
    allianceSeed('Nuneaton Borough','Nuneaton Borough FC',null,'Nuneaton, Warwickshire','south',2,[], 'Manor Park','1889-01-01'),
    allianceSeed('Redditch United','Redditch Needles',null,'Redditch, Worcestershire','south',2,[], 'Valley Stadium','1891-01-01'),
    allianceSeed('Stafford Rangers','Stafford Rangers FC',null,'Stafford, Staffordshire','north',2,[], 'Marston Road','1876-01-01'),
    allianceSeed('Telford United','Telford Ironbridge',null,'Telford, Shropshire','south',2,[], 'Bucks Head','1872-01-01'),
    allianceSeed('Wealdstone','Wealdstone Stones',null,'Harrow, Middlesex','south',2,[], 'Lower Mead','1899-01-01'),
    allianceSeed('Weymouth','Weymouth Terras',null,'Weymouth, Dorset','south',2,[], 'Recreation Ground','1890-01-01'),
    allianceSeed('Worcester City','Worcester Faithful',null,'Worcester, Worcestershire','south',2,[], 'St George’s Lane','1902-01-01'),
    allianceSeed('Scarborough','Scarborough Coast',1987,'Scarborough, Yorkshire','north',2,[[1987,1999]]),
    allianceSeed('Maidstone United','Maidstone Kent',1989,'Maidstone, Kent','south',2,[[1989,1992]]),
    allianceSeed('Barnet','Barnet Hill',1991,'Barnet, London','south',2,[[1991,2001],[2005,2013],[2015,2025],[2025,null]]),
    seed('Wycombe Wanderers','Wycombe Chairmakers',1993,'High Wycombe, Buckinghamshire','south',2),
    seed('Macclesfield Town','Macclesfield Silk',1997,'Macclesfield, Cheshire','north',2,[[1997,2012],[2018,2020]]),
    seed('Cheltenham Town','Cheltenham Spa',1999,'Cheltenham, Gloucestershire','south',2,[[1999,2015],[2016,null]]),
    seed('Kidderminster Harriers','Kidderminster Carpet',2000,'Kidderminster, Worcestershire','south',2,[[2000,2005]]),
    seed('Rushden and Diamonds','Rushden Diamonds FC',2001,'Irthlingborough, Northamptonshire','south',2,[[2001,2006]]),
    allianceSeed('Boston United','Boston Pilgrims',2002,'Boston, Lincolnshire','north',2,[[2002,2007]]),
    allianceSeed('Yeovil Town','Yeovil Westland',2003,'Yeovil, Somerset','south',2,[[2003,2019]]),
    seed('Dagenham and Redbridge','Dagenham Dock',2007,'Dagenham, London','south',2,[[2007,2016]]),
    seed('Morecambe','Morecambe Bay',2007,'Morecambe, Lancashire','north',2),
    seed('AFC Wimbledon','Wimbledon Phoenix',2011,'Wimbledon, London','south',2),
    seed('Crawley Town','Crawley Gatwick',2011,'Crawley, Sussex','south',2),
    seed('Newport County','Newport Usk',2013,'Newport, Monmouthshire','south',2),
    seed('Forest Green Rovers','Nailsworth Green',2017,'Nailsworth, Gloucestershire','south',2,[[2017,2024]])
  ];


  const regionalHistoricalSeeds = [
    seed('Chatham','Chatham Dockyard',null,'Chatham, Kent','south',2,[],'The Lines','1882-01-01',1894,{entryCompetitionId:'southern-one',initialTier:3,startSelectable:true,historicalRegional:true}),
    seed('Clapton','Clapton Amateurs',null,'Clapton, London','south',2,[],'Old Spotted Dog','1878-01-01',1894,{entryCompetitionId:'southern-one',initialTier:3,startSelectable:true,historicalRegional:true}),
    seed('Ilford','Ilford Town',null,'Ilford, Essex','south',2,[],'Wellesley Road','1881-01-01',1894,{entryCompetitionId:'southern-one',initialTier:3,startSelectable:true,historicalRegional:true}),
    seed('Royal Ordnance Factories','Woolwich Ordnance Works',null,'Woolwich, London','south',2,[],'Invicta Ground','1893-01-01',1894,{entryCompetitionId:'southern-one',initialTier:3,startSelectable:true,historicalRegional:true,ceased:1896}),
    seed('Sheppey United','Sheppey Islanders',null,'Sheerness, Kent','south',2,[],'Botany Road','1890-01-01',1894,{entryCompetitionId:'southern-two',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('Uxbridge','Uxbridge Town',null,'Uxbridge, Middlesex','south',2,[],'The Common','1871-01-01',1894,{entryCompetitionId:'southern-two',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('Chesham','Chesham Generals',null,'Chesham, Buckinghamshire','south',2,[],'The Meadow','1879-01-01',1894,{entryCompetitionId:'southern-two',initialTier:4,startSelectable:true,historicalRegional:true,ceased:1917}),
    seed("Old St Stephen's","Old St Stephen's",null,'Westminster, London','south',1,[],'Local Ground','1880-01-01',1894,{entryCompetitionId:'southern-two',initialTier:4,startSelectable:true,historicalRegional:true,ceased:1898}),
    seed('Casuals','Casuals FC',null,'London, England','south',2,[],'Queen’s Club','1883-01-01',1905,{entryCompetitionId:'isthmian-league',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('Civil Service','Civil Service FC',null,'London, England','south',2,[],'Chiswick Ground','1863-01-01',1905,{entryCompetitionId:'isthmian-league',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('Ealing Association','Ealing Association',null,'Ealing, London','south',1,[],'Gunnersbury Avenue','1892-01-01',1905,{entryCompetitionId:'isthmian-league',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('London Caledonians','London Caledonians',null,'London, England','south',2,[],'Tufnell Park','1886-01-01',1905,{entryCompetitionId:'isthmian-league',initialTier:4,startSelectable:true,historicalRegional:true}),
    seed('Catford Southend','Catford Southend',null,'Catford, London','south',2,[],'Catford Ground','1900-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Tufnell Park','Tufnell Park',null,'Tufnell Park, London','south',2,[],'Campdale Road','1886-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Finchley','Finchley Town',null,'Finchley, Middlesex','south',2,[],'Summers Lane','1874-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Grays Athletic','Grays Athletic',null,'Grays, Essex','south',2,[],'Recreation Ground','1890-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Chelmsford','Chelmsford Town',null,'Chelmsford, Essex','south',2,[],'New Writtle Street','1878-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true,ceased:1938}),
    seed('Enfield','Enfield Town',null,'Enfield, Middlesex','south',2,[],'Tucker’s Field','1893-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Romford Town','Romford Town',null,'Romford, Essex','south',2,[],'Brooklands','1876-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true}),
    seed('Barking','Barking Town',null,'Barking, Essex','south',2,[],'Vicarage Field','1880-01-01',1912,{entryCompetitionId:'athenian-league',initialTier:5,startSelectable:true,historicalRegional:true})
  ];
  clubSeeds.push(...regionalHistoricalSeeds);


  function databaseSeed(row,index){
    const palette=palettes[index%palettes.length],strength=Math.max(1,Math.min(5,Math.round(Number(row.currentStrength||45)/20)));
    const leagueEntry=footballLeagueEntryFor(row.reference),regionalEntry=regionalEntryFor(row.reference),founded=Number(row.founded)||1888;
    const systemEntry=regionalEntry?.year??leagueEntry??Math.max(founded,1979),entryCompetitionId=regionalEntry?.divisionId||null;
    const initialTier=regionalEntry?.tier??(leagueEntry?footballLeagueEntryTier(leagueEntry):(systemEntry>=2004?7:6));
    return {id:row.id,name:row.name,initials:row.name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,4).toUpperCase(),realClub:row.reference,location:row.location,region:row.region,subregion:row.subregion,countyRegion:row.subregion,leagueEntry,systemEntry,entryCompetitionId,startSelectable:Boolean(leagueEntry||regionalEntry),membershipPeriods:leagueEntry?[[leagueEntry,null]]:[],strength,primary:palette[0],secondary:palette[1],colours:'Traditional club colours',ground:'Town Ground',founded:`${founded}-01-01`,reference:`${row.reference} database`,initialTier,lightweight:true,databaseClub:true,modernLeague:row.league,modernTier:Number(row.tier),modernDivisionId:row.divisionId,modernStrength:Number(row.currentStrength),modernPrestige:Number(row.prestige),expectation:'Build the club through its era and protect its long-term place in the English pyramid.'};
  }
  const databaseClubSeeds=(window.FLClubDatabase?.english||[]).map(databaseSeed);

  const legendArchetypes = [
    {id:'wing-wizard-1934',triggerYear:1934,nationality:'English',position:'W',label:'Ageless Wing Wizard',ability:65,ceiling:95,traits:['dribbling','crossing','longevity','sportsmanship']},
    {id:'puskas-wave',triggerYear:1943,nationality:'Hungarian',position:'IF',label:'Left-footed Magyar Goal General',ability:72,ceiling:98,traits:['left foot','finishing','vision','leadership','long shots']},
    {id:'di-stefano-wave',triggerYear:1947,nationality:'Argentine',position:'CF',label:'All-action Complete Forward',ability:71,ceiling:98,traits:['movement','stamina','passing','finishing','leadership']},
    {id:'charlton-wave',triggerYear:1953,nationality:'English',position:'IF',label:'English Long-range Midfield Icon',ability:68,ceiling:97,traits:['long shots','stamina','leadership','big matches']},
    {id:'pele-wave',triggerYear:1955,nationality:'Brazilian',position:'CF',label:'Brazilian Teenage World Phenomenon',ability:75,ceiling:99,traits:['technique','finishing','athleticism','creativity','big matches']},
    {id:'eusebio-wave',triggerYear:1959,nationality:'Portuguese',position:'CF',label:'Explosive Black Panther Forward',ability:71,ceiling:98,traits:['pace','power','finishing','big matches']},
    {id:'cruyff-wave',triggerYear:1963,nationality:'Dutch',position:'IF',label:'Total Football Architect',ability:73,ceiling:99,traits:['intelligence','technique','movement','leadership','manager potential']},
    {id:'beckenbauer-wave',triggerYear:1963,nationality:'German',position:'HB',label:'Elegant Sweeper Emperor',ability:71,ceiling:98,traits:['anticipation','passing','leadership','composure']},
    {id:'best-wave',triggerYear:1963,nationality:'Northern Irish',position:'W',label:'Flamboyant Belfast Wing Genius',ability:70,ceiling:98,traits:['dribbling','pace','balance','flair']},
    {id:'platini-wave',triggerYear:1972,nationality:'French',position:'IF',label:'Goalscoring Midfield Conductor',ability:69,ceiling:97,traits:['vision','free kicks','finishing','leadership']},
    {id:'maradona-wave',triggerYear:1975,nationality:'Argentine',position:'IF',label:'Street-football Number Ten',ability:74,ceiling:99,traits:['dribbling','vision','creativity','balance','big matches']},
    {id:'gullit-wave',triggerYear:1979,nationality:'Dutch',position:'HB',label:'Powerful Total Footballer',ability:69,ceiling:98,traits:['versatility','power','technique','leadership','aerial ability']},
    {id:'van-basten-wave',triggerYear:1981,nationality:'Dutch',position:'CF',label:'Elegant Complete Goal Scorer',ability:70,ceiling:98,traits:['finishing','movement','technique','volleys']},
    {id:'maldini-wave',triggerYear:1983,nationality:'Italian',position:'FB',label:'Dynastic Defensive Prodigy',ability:68,ceiling:98,traits:['positioning','pace','leadership','loyalty','longevity']},
    {id:'r9-wave',triggerYear:1992,nationality:'Brazilian',position:'CF',label:'Explosive Brazilian Phenomenon',ability:73,ceiling:99,traits:['pace','dribbling','finishing','power']},
    {id:'zidane-wave',triggerYear:1988,nationality:'French',position:'IF',label:'Elegant Big-match Playmaker',ability:69,ceiling:98,traits:['technique','vision','composure','big matches']},
    {id:'ronaldinho-wave',triggerYear:1996,nationality:'Brazilian',position:'IF',label:'Joyful Creative Magician',ability:70,ceiling:98,traits:['flair','dribbling','vision','free kicks']},
    {id:'xavi-wave',triggerYear:1997,nationality:'Spanish',position:'HB',label:'Metronomic Midfield Controller',ability:65,ceiling:97,traits:['passing','vision','positioning','tempo control']},
    {id:'cristiano-wave',triggerYear:2001,nationality:'Portuguese',position:'W',label:'Relentless Goal-scoring Wide Forward',ability:72,ceiling:99,traits:['pace','finishing','athleticism','ambition','aerial ability']},
    {id:'messi-wave',triggerYear:2002,nationality:'Argentine',position:'IF',label:'Low-centre-of-gravity Movement Genius',ability:74,ceiling:99,traits:['dribbling','vision','finishing','movement','free kicks']},
    {id:'iniesta-wave',triggerYear:2002,nationality:'Spanish',position:'IF',label:'Press-resistant Midfield Artist',ability:66,ceiling:97,traits:['technique','vision','composure','big matches']},
    {id:'neuer-wave',triggerYear:2004,nationality:'German',position:'GK',label:'Sweeper-keeper Revolutionary',ability:67,ceiling:98,traits:['rushing out','passing','one on ones','leadership']},
    {id:'modric-wave',triggerYear:2004,nationality:'Croatian',position:'HB',label:'Enduring Midfield Artist',ability:65,ceiling:97,traits:['vision','technique','stamina','longevity']},
    {id:'haaland-wave',triggerYear:2016,nationality:'Norwegian',position:'CF',label:'Modern Athletic Goal Machine',ability:70,ceiling:99,traits:['pace','power','finishing','movement']}
  ];

  const PYRAMID_TUNING = Object.freeze({
    MAX_TIER:15,
    FULL_DETAIL_MAX_TIER:5,
    HEADLESS_FULL_DETAIL_MAX_TIER:1,
    LIGHT_DETAIL_MAX_TIER:8,
    LOWER_TIER_CLUB_TARGET:1288,
    FAST_FORWARD_YIELD_INTERVAL:4,
    LIGHTWEIGHT_SQUAD_SIZE:0,
    HYDRATED_SQUAD_SIZE:20
  });

  const deepRegions = Object.freeze({
    north:{label:'Northern England',side:'north'},
    south:{label:'Southern England',side:'south'},
    'north-west':{label:'North West',side:'north'},
    'north-east':{label:'North East',side:'north'},
    yorkshire:{label:'Yorkshire',side:'north'},
    'east-midlands':{label:'East Midlands',side:'north'},
    'west-midlands':{label:'West Midlands',side:'south'},
    east:{label:'Eastern Counties',side:'south'},
    london:{label:'London',side:'south'},
    'south-east':{label:'South East',side:'south'},
    'south-central':{label:'South Central',side:'south'},
    'south-west':{label:'South West',side:'south'},
    'wales-border':{label:'Welsh Border Counties',side:'south'},
    'home-counties':{label:'Home Counties',side:'south'}
  });

  const regionalLayers = Object.freeze({
    6:[
      {id:'national-north',name:'National League North',regionKey:'north',regions:['north-west','north-east','yorkshire','east-midlands'],size:22},
      {id:'national-south',name:'National League South',regionKey:'south',regions:['west-midlands','east','london','south-east','south-central','south-west','wales-border','home-counties'],size:22}
    ],
    7:[
      {id:'northern-premier',name:'Northern Premier Division',regionKey:'north-west',regions:['north-west','north-east'],size:20},
      {id:'yorkshire-midlands-premier',name:'Yorkshire & East Midlands Premier',regionKey:'yorkshire',regions:['yorkshire','east-midlands'],size:20},
      {id:'southern-premier',name:'Southern Premier Division',regionKey:'south-central',regions:['west-midlands','south-central','south-west','wales-border'],size:20},
      {id:'isthmian-premier',name:'Isthmian Premier Division',regionKey:'london',regions:['east','london','south-east','home-counties'],size:20}
    ],
    8:[
      {id:'north-west-division',name:'North West Division',regionKey:'north-west',regions:['north-west'],size:18},
      {id:'north-east-division',name:'North East Division',regionKey:'north-east',regions:['north-east'],size:18},
      {id:'yorkshire-division',name:'Yorkshire Division',regionKey:'yorkshire',regions:['yorkshire'],size:18},
      {id:'east-midlands-division',name:'East Midlands Division',regionKey:'east-midlands',regions:['east-midlands'],size:18},
      {id:'west-midlands-division',name:'West Midlands Division',regionKey:'west-midlands',regions:['west-midlands','wales-border'],size:18},
      {id:'eastern-division',name:'Eastern Counties Division',regionKey:'east',regions:['east','home-counties'],size:18},
      {id:'south-east-division',name:'London & South East Division',regionKey:'south-east',regions:['london','south-east'],size:18},
      {id:'south-west-division',name:'South & West Division',regionKey:'south-west',regions:['south-central','south-west'],size:18}
    ],
    9:[
      {id:'lancashire-area',name:'Lancashire Area League',regionKey:'north-west',regions:['north-west'],size:16},
      {id:'northumberland-area',name:'Northumberland & Durham League',regionKey:'north-east',regions:['north-east'],size:16},
      {id:'yorkshire-area',name:'Yorkshire Area League',regionKey:'yorkshire',regions:['yorkshire'],size:16},
      {id:'midlands-east-area',name:'East Midlands Area League',regionKey:'east-midlands',regions:['east-midlands'],size:16},
      {id:'midlands-west-area',name:'West Midlands Area League',regionKey:'west-midlands',regions:['west-midlands'],size:16},
      {id:'eastern-area',name:'Eastern Counties Area League',regionKey:'east',regions:['east'],size:16},
      {id:'london-area',name:'London Area League',regionKey:'london',regions:['london'],size:16},
      {id:'south-east-area',name:'South East Area League',regionKey:'south-east',regions:['south-east','home-counties'],size:16},
      {id:'southern-area',name:'Southern Counties Area League',regionKey:'south-central',regions:['south-central','wales-border'],size:16},
      {id:'western-area',name:'Western Counties Area League',regionKey:'south-west',regions:['south-west'],size:16}
    ],
    10:[
      {id:'lancashire-county',name:'Lancashire County League',regionKey:'north-west',regions:['north-west'],size:12},
      {id:'north-east-county',name:'North East County League',regionKey:'north-east',regions:['north-east'],size:12},
      {id:'yorkshire-county',name:'Yorkshire County League',regionKey:'yorkshire',regions:['yorkshire'],size:12},
      {id:'east-midlands-county',name:'East Midlands County League',regionKey:'east-midlands',regions:['east-midlands'],size:12},
      {id:'west-midlands-county',name:'West Midlands County League',regionKey:'west-midlands',regions:['west-midlands'],size:12},
      {id:'eastern-counties',name:'Eastern Counties League',regionKey:'east',regions:['east'],size:12},
      {id:'london-county',name:'London County League',regionKey:'london',regions:['london'],size:12},
      {id:'kent-sussex-county',name:'Kent & Sussex County League',regionKey:'south-east',regions:['south-east'],size:12},
      {id:'home-counties-league',name:'Home Counties League',regionKey:'home-counties',regions:['home-counties'],size:12},
      {id:'southern-counties',name:'Southern Counties League',regionKey:'south-central',regions:['south-central'],size:12},
      {id:'western-counties',name:'Western Counties League',regionKey:'south-west',regions:['south-west'],size:12},
      {id:'border-counties',name:'Border Counties League',regionKey:'wales-border',regions:['wales-border'],size:12}
    ],
    11:[
      {id:'north-west-tier-11',name:'Lancashire & Cheshire District Premier League',regionKey:'north-west',regions:['north-west'],size:12},
      {id:'north-east-tier-11',name:'North East District Premier League',regionKey:'north-east',regions:['north-east'],size:12},
      {id:'yorkshire-tier-11',name:'Yorkshire District Premier League',regionKey:'yorkshire',regions:['yorkshire'],size:12},
      {id:'east-midlands-tier-11',name:'East Midlands District Premier League',regionKey:'east-midlands',regions:['east-midlands'],size:12},
      {id:'west-midlands-tier-11',name:'West Midlands District Premier League',regionKey:'west-midlands',regions:['west-midlands'],size:12},
      {id:'east-tier-11',name:'Eastern Counties District Premier League',regionKey:'east',regions:['east'],size:12},
      {id:'london-tier-11',name:'London District Premier League',regionKey:'london',regions:['london'],size:12},
      {id:'south-east-tier-11',name:'Kent & Sussex District Premier League',regionKey:'south-east',regions:['south-east'],size:12},
      {id:'home-counties-tier-11',name:'Home Counties District Premier League',regionKey:'home-counties',regions:['home-counties'],size:12},
      {id:'south-central-tier-11',name:'Southern Counties District Premier League',regionKey:'south-central',regions:['south-central'],size:12},
      {id:'south-west-tier-11',name:'Western Counties District Premier League',regionKey:'south-west',regions:['south-west'],size:12},
      {id:'wales-border-tier-11',name:'Border Counties District Premier League',regionKey:'wales-border',regions:['wales-border'],size:12}
    ],
    12:[
      {id:'north-west-tier-12',name:'Lancashire & Cheshire District Division One',regionKey:'north-west',regions:['north-west'],size:12},
      {id:'north-east-tier-12',name:'North East District Division One',regionKey:'north-east',regions:['north-east'],size:12},
      {id:'yorkshire-tier-12',name:'Yorkshire District Division One',regionKey:'yorkshire',regions:['yorkshire'],size:12},
      {id:'east-midlands-tier-12',name:'East Midlands District Division One',regionKey:'east-midlands',regions:['east-midlands'],size:12},
      {id:'west-midlands-tier-12',name:'West Midlands District Division One',regionKey:'west-midlands',regions:['west-midlands'],size:12},
      {id:'east-tier-12',name:'Eastern Counties District Division One',regionKey:'east',regions:['east'],size:12},
      {id:'london-tier-12',name:'London District Division One',regionKey:'london',regions:['london'],size:12},
      {id:'south-east-tier-12',name:'Kent & Sussex District Division One',regionKey:'south-east',regions:['south-east'],size:12},
      {id:'home-counties-tier-12',name:'Home Counties District Division One',regionKey:'home-counties',regions:['home-counties'],size:12},
      {id:'south-central-tier-12',name:'Southern Counties District Division One',regionKey:'south-central',regions:['south-central'],size:12},
      {id:'south-west-tier-12',name:'Western Counties District Division One',regionKey:'south-west',regions:['south-west'],size:12},
      {id:'wales-border-tier-12',name:'Border Counties District Division One',regionKey:'wales-border',regions:['wales-border'],size:12}
    ],
    13:[
      {id:'north-west-tier-13',name:'Lancashire & Cheshire Local Premier Division',regionKey:'north-west',regions:['north-west'],size:10},
      {id:'north-east-tier-13',name:'North East Local Premier Division',regionKey:'north-east',regions:['north-east'],size:10},
      {id:'yorkshire-tier-13',name:'Yorkshire Local Premier Division',regionKey:'yorkshire',regions:['yorkshire'],size:10},
      {id:'east-midlands-tier-13',name:'East Midlands Local Premier Division',regionKey:'east-midlands',regions:['east-midlands'],size:10},
      {id:'west-midlands-tier-13',name:'West Midlands Local Premier Division',regionKey:'west-midlands',regions:['west-midlands'],size:10},
      {id:'east-tier-13',name:'Eastern Counties Local Premier Division',regionKey:'east',regions:['east'],size:10},
      {id:'london-tier-13',name:'London Local Premier Division',regionKey:'london',regions:['london'],size:10},
      {id:'south-east-tier-13',name:'Kent & Sussex Local Premier Division',regionKey:'south-east',regions:['south-east'],size:10},
      {id:'home-counties-tier-13',name:'Home Counties Local Premier Division',regionKey:'home-counties',regions:['home-counties'],size:10},
      {id:'south-central-tier-13',name:'Southern Counties Local Premier Division',regionKey:'south-central',regions:['south-central'],size:10},
      {id:'south-west-tier-13',name:'Western Counties Local Premier Division',regionKey:'south-west',regions:['south-west'],size:10},
      {id:'wales-border-tier-13',name:'Border Counties Local Premier Division',regionKey:'wales-border',regions:['wales-border'],size:10}
    ],
    14:[
      {id:'north-west-tier-14',name:'Lancashire & Cheshire Local Division One',regionKey:'north-west',regions:['north-west'],size:10},
      {id:'north-east-tier-14',name:'North East Local Division One',regionKey:'north-east',regions:['north-east'],size:10},
      {id:'yorkshire-tier-14',name:'Yorkshire Local Division One',regionKey:'yorkshire',regions:['yorkshire'],size:10},
      {id:'east-midlands-tier-14',name:'East Midlands Local Division One',regionKey:'east-midlands',regions:['east-midlands'],size:10},
      {id:'west-midlands-tier-14',name:'West Midlands Local Division One',regionKey:'west-midlands',regions:['west-midlands'],size:10},
      {id:'east-tier-14',name:'Eastern Counties Local Division One',regionKey:'east',regions:['east'],size:10},
      {id:'london-tier-14',name:'London Local Division One',regionKey:'london',regions:['london'],size:10},
      {id:'south-east-tier-14',name:'Kent & Sussex Local Division One',regionKey:'south-east',regions:['south-east'],size:10},
      {id:'home-counties-tier-14',name:'Home Counties Local Division One',regionKey:'home-counties',regions:['home-counties'],size:10},
      {id:'south-central-tier-14',name:'Southern Counties Local Division One',regionKey:'south-central',regions:['south-central'],size:10},
      {id:'south-west-tier-14',name:'Western Counties Local Division One',regionKey:'south-west',regions:['south-west'],size:10},
      {id:'wales-border-tier-14',name:'Border Counties Local Division One',regionKey:'wales-border',regions:['wales-border'],size:10}
    ],
    15:[
      {id:'north-west-tier-15',name:'Lancashire & Cheshire Community League',regionKey:'north-west',regions:['north-west'],size:10},
      {id:'north-east-tier-15',name:'North East Community League',regionKey:'north-east',regions:['north-east'],size:10},
      {id:'yorkshire-tier-15',name:'Yorkshire Community League',regionKey:'yorkshire',regions:['yorkshire'],size:10},
      {id:'east-midlands-tier-15',name:'East Midlands Community League',regionKey:'east-midlands',regions:['east-midlands'],size:10},
      {id:'west-midlands-tier-15',name:'West Midlands Community League',regionKey:'west-midlands',regions:['west-midlands'],size:10},
      {id:'east-tier-15',name:'Eastern Counties Community League',regionKey:'east',regions:['east'],size:10},
      {id:'london-tier-15',name:'London Community League',regionKey:'london',regions:['london'],size:10},
      {id:'south-east-tier-15',name:'Kent & Sussex Community League',regionKey:'south-east',regions:['south-east'],size:10},
      {id:'home-counties-tier-15',name:'Home Counties Community League',regionKey:'home-counties',regions:['home-counties'],size:10},
      {id:'south-central-tier-15',name:'Southern Counties Community League',regionKey:'south-central',regions:['south-central'],size:10},
      {id:'south-west-tier-15',name:'Western Counties Community League',regionKey:'south-west',regions:['south-west'],size:10},
      {id:'wales-border-tier-15',name:'Border Counties Community League',regionKey:'wales-border',regions:['wales-border'],size:10}
    ]
  });

  function feederDivision(id,name,tier,size,regionKey,regions){
    return {id,name,tier,size,regionKey,regions,region:deepRegions[regionKey]?.side||'south',regional:true,simulation:tier<=PYRAMID_TUNING.LIGHT_DETAIL_MAX_TIER?'light':'aggregate',historicalLeague:true};
  }
  function historicalFeederDivisions(year){
    year=Number(year)||1888;
    if(year<1894||year>=1939&&year<=1945||year>=1915&&year<=1918)return [];
    const out=[];
    if(year<=1904){
      out.push(feederDivision('southern-one','Southern League Division One',3,year===1894?9:16,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      out.push(feederDivision('southern-two','Southern League Division Two',4,year===1894?7:14,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      return out;
    }
    if(year<=1914){
      out.push(feederDivision('southern-one','Southern League Division One',3,20,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      out.push(feederDivision('southern-two','Southern League Division Two',4,18,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      out.push(feederDivision('isthmian-league','Isthmian League',4,year===1905?6:14,'london',['london','south-east','home-counties','east']));
      if(year>=1912)out.push(feederDivision('athenian-league','Athenian League',5,10,'london',['london','south-east','home-counties','east']));
      return out;
    }
    if(year<=1957){
      out.push(feederDivision('southern-league','Southern League',4,22,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      out.push(feederDivision('isthmian-league','Isthmian League',4,18,'london',['london','south-east','home-counties','east']));
      out.push(feederDivision('athenian-league','Athenian League',5,18,'london',['london','south-east','home-counties','east']));
      return out;
    }
    if(year<=1967){
      out.push(feederDivision('southern-premier','Southern League Premier Division',5,22,'south',['london','south-east','home-counties','south-central','south-west','east','west-midlands','wales-border']));
      out.push(feederDivision('isthmian-league','Isthmian League',5,22,'london',['london','south-east','home-counties','east']));
      out.push(feederDivision('athenian-league','Athenian League',6,22,'london',['london','south-east','home-counties','east']));
      return out;
    }
    if(year<=1978){
      out.push(feederDivision('northern-premier','Northern Premier League',5,22,'north',['north-west','north-east','yorkshire','east-midlands']));
      out.push(feederDivision('southern-premier','Southern League Premier Division',5,22,'south',['west-midlands','south-central','south-west','wales-border','home-counties']));
      out.push(feederDivision('isthmian-premier','Isthmian League',5,22,'london',['london','south-east','east','home-counties']));
      return out;
    }
    if(year<=2003){
      out.push(feederDivision('northern-premier','Northern Premier League',6,22,'north',['north-west','north-east','yorkshire','east-midlands']));
      out.push(feederDivision('southern-premier','Southern League Premier Division',6,22,'south',['west-midlands','south-central','south-west','wales-border','home-counties']));
      out.push(feederDivision('isthmian-premier','Isthmian League Premier Division',6,22,'london',['london','south-east','east','home-counties']));
      return out;
    }
    if(year<=2014){
      out.push(feederDivision('conference-north','Conference North',6,22,'north',['north-west','north-east','yorkshire','east-midlands']));
      out.push(feederDivision('conference-south','Conference South',6,22,'south',['west-midlands','east','london','south-east','south-central','south-west','wales-border','home-counties']));
      out.push(feederDivision('northern-premier','Northern Premier League',7,22,'north',['north-west','north-east','yorkshire','east-midlands']));
      out.push(feederDivision('southern-premier','Southern League Premier Division',7,22,'south',['west-midlands','south-central','south-west','wales-border','home-counties']));
      out.push(feederDivision('isthmian-premier','Isthmian League Premier Division',7,22,'london',['london','south-east','east','home-counties']));
      return out;
    }
    for(let tier=6;tier<=15;tier++)regionalLayers[tier].forEach(d=>{const modernSize=year>=2026&&tier===6?24:d.size;out.push({...d,size:modernSize,tier,region:deepRegions[d.regionKey]?.side||'south',regional:true,simulation:tier<=PYRAMID_TUNING.LIGHT_DETAIL_MAX_TIER?'light':'aggregate',historicalLeague:true})});
    return out;
  }

  function formatForYearDeep(year){
    year=Number(year)||1888;
    const base=formats.find(f=>year>=f.from&&year<=f.to)||formats[formats.length-1];
    const divisions=(base.divisions||[]).map(d=>({...d,simulation:'full'}));
    if(base.wartime)return {...base,deep:false,maxTier:1,official:false,noMovement:true,divisions};
    if(base.historicalStructure)return {...base,deep:false,maxTier:Math.max(...divisions.map(d=>Number(d.tier)||1)),official:true,divisions};
    divisions.push(...historicalFeederDivisions(year));
    const maxTier=Math.max(...divisions.map(d=>Number(d.tier)||1));
    return {...base,deep:maxTier>5,maxTier,divisions:divisions.sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name))};
  }

  const generatedTownPools = {
    'north-west':['Accrington','Ashton','Barrowford','Blackrod','Burscough','Chorley','Clitheroe','Colne','Darwen','Fleetwood','Garstang','Haslingden','Heywood','Horwich','Kirkham','Leigh','Leyland','Ormskirk','Padiham','Rochdale','Rossendale','Skelmersdale','Todmorden','Warrington'],
    'north-east':['Alnwick','Ashington','Bishop Auckland','Blyth','Consett','Crook','Durham','Gateshead','Hartlepool','Hexham','Jarrow','Morpeth','North Shields','Peterlee','Seaham','South Shields','Spennymoor','Stanley','Sunderland','Tynemouth','Washington','Whitley Bay'],
    yorkshire:['Barnsley','Batley','Beverley','Brighouse','Castleford','Cleckheaton','Dewsbury','Doncaster','Goole','Halifax','Harrogate','Huddersfield','Keighley','Pontefract','Rotherham','Scarborough','Selby','Skipton','Wakefield','Whitby','York'],
    'east-midlands':['Alfreton','Ashby','Boston','Buxton','Chesterfield','Corby','Daventry','Grantham','Ilkeston','Kettering','Loughborough','Mansfield','Matlock','Melton','Newark','Oakham','Retford','Rushden','Spalding','Worksop'],
    'west-midlands':['Bromsgrove','Cannock','Dudley','Halesowen','Kidderminster','Leamington','Lichfield','Nuneaton','Redditch','Rugby','Shrewsbury','Solihull','Stafford','Stourbridge','Tamworth','Telford','Walsall','Warwick','Wednesbury','Worcester'],
    east:['Beccles','Braintree','Cambridge','Clacton','Dereham','Ely','Felixstowe','Great Yarmouth','Haverhill','Hitchin','Huntingdon','Ipswich','King’s Lynn','Lowestoft','March','Newmarket','Norwich','Saffron Walden','Sudbury','Thetford'],
    london:['Barking','Barnet','Battersea','Bromley','Camberwell','Chiswick','Croydon','Dagenham','Ealing','Enfield','Finchley','Greenwich','Hackney','Hammersmith','Harrow','Lewisham','Romford','Southall','Tottenham','Walthamstow'],
    'south-east':['Ashford','Bexhill','Brighton','Canterbury','Chatham','Crawley','Dartford','Dover','Eastbourne','Folkestone','Gravesend','Guildford','Hastings','Horsham','Maidstone','Margate','Redhill','Reigate','Sevenoaks','Tunbridge Wells'],
    'home-counties':['Aylesbury','Bedford','Berkhamsted','Bicester','Borehamwood','Bracknell','Dunstable','Hemel','High Wycombe','Luton','Maidenhead','Marlow','Milton','Oxford','Reading','Slough','St Albans','Stevenage','Watford','Windsor'],
    'south-central':['Andover','Basingstoke','Chichester','Fareham','Gosport','Havant','Newbury','Petersfield','Portsmouth','Ringwood','Romsey','Salisbury','Southampton','Thatcham','Totton','Winchester','Woking','Wokingham','Worthing','Yateley'],
    'south-west':['Barnstaple','Bath','Bodmin','Bridgwater','Bristol','Camborne','Cheltenham','Exeter','Falmouth','Gloucester','Helston','Launceston','Newton Abbot','Penzance','Plymouth','Taunton','Torquay','Truro','Weston','Yeovil'],
    'wales-border':['Bridgnorth','Chepstow','Coleford','Hereford','Ledbury','Leominster','Ludlow','Malvern','Monmouth','Oswestry','Ross-on-Wye','Ruabon','Tenbury','Usk','Welshpool','Whitchurch','Wrexham','Abergavenny','Newport','Shifnal']
  };
  const generatedSuffixes=['Athletic','Rovers','United','Town','Victoria','Railway','Works','Wanderers','Institute','Albion','Rangers','Harriers','Borough','County','Olympic','Phoenix','Colliery','Dockers','Wednesday','Celtic','Amateurs','Strollers','Vale','Old Boys'];
  function generatedFoundingYear(regionIndex,index){
    const n=regionIndex*47+index;
    if(index<25)return 1852+(n%37);
    if(index<34)return 1889+(n%41);
    if(index<39)return 1930+(n%40);
    if(index<43)return 1970+(n%30);
    return 2000+(n%27);
  }
  function buildGeneratedClubSeeds(){
    const rows=[];Object.entries(generatedTownPools).forEach(([subregion,towns],ri)=>{
      const clubCount=['north-west','north-east'].includes(subregion)?60:52;
      for(let i=0;i<clubCount;i++){
        const town=towns[i%towns.length],suffix=generatedSuffixes[(i+ri*3)%generatedSuffixes.length],name=`${town} ${suffix}`,year=generatedFoundingYear(ri,i),tier=7+(i%4),side=deepRegions[subregion]?.side||'south',palette=palettes[(ri+i)%palettes.length];
        rows.push({id:`gen-${slug(subregion)}-${slug(town)}-${slug(suffix)}-${i}`,name,initials:name.split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase(),location:`${town}, England`,region:side,subregion,countyRegion:subregion,leagueEntry:null,systemEntry:Math.max(year,1979),entryCompetitionId:null,startSelectable:false,membershipPeriods:[],strength:1+(i%3),primary:palette[0],secondary:palette[1],colours:'Traditional local colours',ground:i%5===0?'Recreation Ground':i%5===1?'Victoria Field':i%5===2?'Railway Ground':i%5===3?'Memorial Park':'Town Meadow',founded:`${year}-01-01`,reference:`Generated ${subregion} club ${i}`,initialTier:tier,lightweight:true,generatedClub:true,expectation:'Establish the club locally and build gradually through the English pyramid.'});
      }

    });
    // Tiers 11–15 are a modern grassroots extension. They are inserted only
    // for the 2026 world so historical fast-forwarding retains the existing
    // performance and does not invent full century-long records for pub teams.
    Object.entries(generatedTownPools).forEach(([subregion,towns],ri)=>{
      for(let i=0;i<49;i++){
        const tier=i<40?11+Math.floor(i/10):15,localIndex=i%10,town=towns[(i+5)%towns.length],suffix=generatedSuffixes[(i+ri*5+9)%generatedSuffixes.length],name=`${town} ${suffix}`,side=deepRegions[subregion]?.side||'south',palette=palettes[(ri+i+4)%palettes.length],founded=1955+((ri*13+i*7)%70);
        rows.push({id:`grass-gen-${slug(subregion)}-${tier}-${localIndex}`,name,initials:name.split(/\s+/).map(x=>x[0]).join('').slice(0,4).toUpperCase(),location:`${town}, England`,region:side,subregion,countyRegion:subregion,leagueEntry:null,systemEntry:2026,entryCompetitionId:`${subregion}-tier-${tier}`,startSelectable:false,membershipPeriods:[],strength:1,primary:palette[0],secondary:palette[1],colours:'Local community colours',ground:localIndex%3===0?'Council Recreation Ground':localIndex%3===1?'The Playing Fields':'Community Sports Ground',founded:`${founded}-01-01`,reference:`Modern grassroots ${subregion} tier ${tier} club ${localIndex}`,initialTier:tier,lightweight:true,generatedClub:true,grassrootsGenerated:true,expectation:'Keep the team running and compete in local football.'});
      }
    });
    Object.keys(generatedTownPools).forEach((subregion,ri)=>{
      const town=generatedTownPools[subregion][0],palette=palettes[(ri+7)%palettes.length],side=deepRegions[subregion]?.side||'south';
      rows.push({id:`grassroots-slot-${subregion}`,name:`${town} Community Reserves`,initials:'GSL',location:`${town}, England`,region:side,subregion,countyRegion:subregion,leagueEntry:null,systemEntry:2026,entryCompetitionId:`${subregion}-tier-15`,startSelectable:false,membershipPeriods:[],strength:1,primary:palette[0],secondary:palette[1],colours:'Community colours',ground:'Community Playing Field',founded:'2026-01-01',reference:`Grassroots career slot ${subregion}`,initialTier:15,lightweight:true,generatedClub:true,grassrootsSlot:true,expectation:'Provide a vacant place for a created grassroots club.'});
    });return rows;
  }
  const generatedClubSeeds=buildGeneratedClubSeeds();

  return {formats,historicalStructures,competitionSnapshots,footballLeagueFirstAppearance,regionalEntryOverrides,footballLeagueEntryFor,regionalEntryFor,footballLeagueEntryTier,clubSeeds,databaseClubSeeds,legendArchetypes,PYRAMID_TUNING,deepRegions,regionalLayers,historicalFeederDivisions,formatForYearDeep,generatedClubSeeds};
})();
