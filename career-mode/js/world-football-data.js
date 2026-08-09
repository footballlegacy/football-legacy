window.FLWorldFootballData = (() => {
  const club=(reference,name,city,strength,stature,primary,secondary,founded)=>{const row=window.FLClubDatabase?.worldByReference?.(reference);return {reference,name:row?.name||name,city,strength:Number(row?.currentStrength??strength),stature:Number(row?.prestige??stature),primary,secondary,founded:Number(row?.founded??founded),databaseClub:Boolean(row)}};
  const leagues=[
    {
      id:'scotland',country:'Scotland',nationality:'Scottish',startDate:'1890-08-16',distance:'near',baseQuality:58,threePointsYear:1994,
      names:[{from:1890,name:'Scottish Football League'},{from:1975,name:'Scottish Premier Division'},{from:1998,name:'Scottish Premier League'},{from:2013,name:'Scottish Premiership'}],
      sizes:[{from:1890,size:10},{from:1893,size:16},{from:1975,size:10},{from:1986,size:12}],
      suspensions:[{from:1939,to:1945,label:'Wartime regional competition'}],
      clubs:[
        club('Celtic','Glasgow Hoops','Glasgow',5,91,'#16834a','#f4f0df',1887),club('Rangers','Glasgow Blues','Glasgow',5,91,'#164c9b','#f4f0df',1872),
        club('Heart of Midlothian','Edinburgh Hearts','Edinburgh',4,76,'#7c1835','#f1e7dc',1874),club('Hibernian','Edinburgh Greens','Edinburgh',4,72,'#217348','#f4f0df',1875),
        club('Aberdeen','Aberdeen Granite','Aberdeen',4,74,'#bc1e2d','#f4f0df',1903),club('Dundee United','Dundee Terrors','Dundee',3,64,'#e47922','#161616',1909),
        club('Dundee','Dundee Dark Blues','Dundee',3,63,'#193967','#f4f0df',1893),club('Motherwell','Lanark Steel','Motherwell',3,62,'#9b223e','#e5bd2b',1886),
        club('Kilmarnock','Ayrshire Blues','Kilmarnock',3,61,'#2866aa','#f4f0df',1869),club('St Mirren','Paisley Saints','Paisley',3,59,'#171717','#f4f0df',1877),
        club('Partick Thistle','Partick Jags','Glasgow',3,57,'#d29c20','#ba2031',1876),club('Falkirk','Falkirk Bairns','Falkirk',3,56,'#1d3f78','#f4f0df',1876),
        club('Dunfermline Athletic','Dunfermline Abbey','Dunfermline',3,55,'#171717','#f4f0df',1885),club('Raith Rovers','Kirkcaldy Rovers','Kirkcaldy',3,53,'#235c9d','#f4f0df',1883),
        club('Queen’s Park','Glasgow Spiders','Glasgow',2,51,'#171717','#f4f0df',1867),club('St Johnstone','Perth Saints','Perth',2,50,'#225bb0','#f4f0df',1884)
      ]
    },
    {
      id:'spain',country:'Spain',nationality:'Spanish',startDate:'1929-02-10',distance:'continental',baseQuality:73,threePointsYear:1995,
      names:[{from:1929,name:'Primera División'},{from:2008,name:'La Liga'}],
      sizes:[{from:1929,size:10},{from:1941,size:14},{from:1950,size:16},{from:1971,size:18},{from:1987,size:20}],
      suspensions:[{from:1936,to:1938,label:'Civil-war suspension'}],
      clubs:[
        club('Real Madrid','Madrid Whites','Madrid',5,96,'#f5f2e8','#d8b53d',1902),club('Barcelona','Catalan Blaugrana','Barcelona',5,95,'#21469a','#9d1737',1899),
        club('Atletico Madrid','Madrid Reds','Madrid',5,84,'#bf2335','#f4f0df',1903),club('Athletic Bilbao','Basque Lions','Bilbao',4,80,'#bd2535','#f4f0df',1898),
        club('Valencia','Valencia Bats','Valencia',4,79,'#f4f0df','#171717',1919),club('Sevilla','Seville Reds','Seville',4,75,'#c52b38','#f4f0df',1890),
        club('Real Betis','Seville Greens','Seville',4,72,'#23824e','#f4f0df',1907),club('Real Sociedad','San Sebastián Blues','San Sebastián',4,72,'#2d68aa','#f4f0df',1909),
        club('Deportivo La Coruna','Galicia Blues','A Coruña',3,66,'#295eaa','#f4f0df',1906),club('Villarreal','Villarreal Yellows','Villarreal',3,65,'#e7cf39','#26569b',1923),
        club('Espanyol','Barcelona Parakeets','Barcelona',3,64,'#2b6aa9','#f4f0df',1900),club('Zaragoza','Aragon Whites','Zaragoza',3,63,'#f4f0df','#244b8d',1932),
        club('Celta Vigo','Vigo Sky Blues','Vigo',3,61,'#8cc5e7','#a51e34',1923),club('Mallorca','Mallorca Islanders','Palma',3,59,'#a71d2c','#171717',1916),
        club('Osasuna','Pamplona Reds','Pamplona',3,58,'#a51f2f','#1d3d70',1920),club('Sporting Gijon','Asturias Sporting','Gijón',3,57,'#bf2635','#f4f0df',1905),
        club('Racing Santander','Cantabria Racing','Santander',2,55,'#2b7747','#f4f0df',1913),club('Real Valladolid','Valladolid Violets','Valladolid',2,54,'#6f3f99','#f4f0df',1928),
        club('Las Palmas','Canary Yellows','Las Palmas',2,52,'#e7c52d','#235599',1949),club('Getafe','South Madrid Blues','Getafe',2,50,'#2460a7','#f4f0df',1946)
      ]
    },
    {
      id:'italy',country:'Italy',nationality:'Italian',startDate:'1929-10-06',distance:'continental',baseQuality:75,threePointsYear:1994,
      names:[{from:1929,name:'Serie A'}],sizes:[{from:1929,size:18},{from:1934,size:16},{from:1952,size:18},{from:1967,size:16},{from:1988,size:18},{from:2004,size:20}],
      suspensions:[{from:1943,to:1945,label:'Wartime suspension'}],
      clubs:[
        club('Juventus','Turin Zebras','Turin',5,94,'#171717','#f4f0df',1897),club('AC Milan','Milan Reds','Milan',5,91,'#b51e30','#171717',1899),
        club('Inter Milan','Milan Blues','Milan',5,91,'#2353a1','#171717',1908),club('Roma','Rome Wolves','Rome',4,82,'#8b2038','#e3ad2c',1927),
        club('Lazio','Rome Eagles','Rome',4,76,'#7fc0e3','#f4f0df',1900),club('Napoli','Naples Blues','Naples',4,82,'#2b9bd0','#f4f0df',1926),
        club('Torino','Turin Bulls','Turin',4,78,'#7b2131','#f4f0df',1906),club('Fiorentina','Florence Violets','Florence',4,74,'#6d3d9d','#f4f0df',1926),
        club('Bologna','Bologna Red-Blues','Bologna',4,73,'#ae2638','#23477c',1909),club('Genoa','Genoa Griffins','Genoa',4,70,'#a91f34','#1d3d70',1893),
        club('Sampdoria','Genoa Sailors','Genoa',3,67,'#4d83bd','#f4f0df',1946),club('Atalanta','Bergamo Black-Blues','Bergamo',3,68,'#244f91','#171717',1907),
        club('Parma','Parma Crusaders','Parma',3,64,'#e4c83a','#244e91',1913),club('Udinese','Udine Black-Whites','Udine',3,61,'#171717','#f4f0df',1896),
        club('Cagliari','Sardinia Islanders','Cagliari',3,60,'#a92334','#253f77',1920),club('Verona','Verona Mastiffs','Verona',3,58,'#e2bd2b','#245196',1903),
        club('Palermo','Palermo Pinks','Palermo',3,57,'#d7749f','#171717',1900),club('Bari','Bari Cockerels','Bari',2,54,'#c72837','#f4f0df',1908),
        club('Empoli','Empoli Blues','Empoli',2,52,'#2465a7','#f4f0df',1920),club('Lecce','Lecce Wolves','Lecce',2,51,'#d4b52b','#bc2435',1908)
      ]
    },
    {
      id:'france',country:'France',nationality:'French',startDate:'1932-09-11',distance:'continental',baseQuality:68,threePointsYear:1994,
      names:[{from:1932,name:'Division 1'},{from:2002,name:'Ligue 1'}],sizes:[{from:1932,size:20},{from:1933,size:14},{from:1946,size:18},{from:1965,size:20},{from:1997,size:18},{from:2002,size:20}],
      suspensions:[{from:1939,to:1945,label:'Wartime regional championships'}],
      clubs:[
        club('Paris Saint-Germain','Paris Rouge et Bleu','Paris',5,88,'#1b3766','#b92335',1970),club('Marseille','Marseille Olympique','Marseille',5,84,'#2a9fd4','#f4f0df',1899),
        club('Lyon','Lyon Rhone','Lyon',4,80,'#234e98','#bc2537',1950),club('Monaco','Monaco Principality','Monaco',4,79,'#bf2637','#f4f0df',1924),
        club('Saint-Etienne','Saint-Étienne Greens','Saint-Étienne',4,79,'#21804c','#f4f0df',1933),club('Bordeaux','Bordeaux Girondins','Bordeaux',4,76,'#1c355f','#f4f0df',1881),
        club('Lille','Lille Flanders','Lille',4,74,'#b62537','#233f78',1944),club('Nantes','Nantes Canaries','Nantes',4,72,'#e0c62d','#20804b',1943),
        club('Reims','Reims Champagne','Reims',4,71,'#bd2635','#f4f0df',1931),club('Nice','Nice Riviera','Nice',3,68,'#b92235','#171717',1904),
        club('Lens','Lens Miners','Lens',3,67,'#c32638','#e3be2e',1906),club('Auxerre','Auxerre Burgundy','Auxerre',3,65,'#f4f0df','#285ca0',1905),
        club('Rennes','Rennes Brittany','Rennes',3,64,'#b52234','#171717',1901),club('Strasbourg','Strasbourg Alsace','Strasbourg',3,63,'#2d69ac','#f4f0df',1906),
        club('Montpellier','Montpellier Coast','Montpellier',3,61,'#e27d28','#244a83',1919),club('Toulouse','Toulouse Violets','Toulouse',3,59,'#674297','#f4f0df',1937),
        club('Metz','Metz Lorraine','Metz',2,56,'#7e2030','#f4f0df',1932),club('Sochaux','Sochaux Works','Montbéliard',2,55,'#e0c52d','#26589b',1928),
        club('Brest','Brest Atlantic','Brest',2,52,'#c22637','#f4f0df',1950),club('Le Havre','Le Havre Dockers','Le Havre',2,51,'#75a8cc','#243f76',1872)
      ]
    },
    {
      id:'portugal',country:'Portugal',nationality:'Portuguese',startDate:'1935-01-20',distance:'continental',baseQuality:67,threePointsYear:1995,
      names:[{from:1934,name:'Campeonato da Liga'},{from:1938,name:'Primeira Divisão'},{from:1999,name:'Primeira Liga'}],sizes:[{from:1934,size:8},{from:1938,size:8},{from:1946,size:14},{from:1971,size:16},{from:1987,size:20},{from:1991,size:18}],
      clubs:[
        club('Benfica','Lisbon Eagles','Lisbon',5,88,'#c52436','#f4f0df',1904),club('Sporting CP','Lisbon Lions','Lisbon',5,85,'#207747','#f4f0df',1906),
        club('Porto','Porto Dragons','Porto',5,87,'#245da0','#f4f0df',1893),club('Braga','Braga Bishops','Braga',4,72,'#c42a39','#f4f0df',1921),
        club('Vitoria Guimaraes','Guimarães Conquerors','Guimarães',3,66,'#f4f0df','#171717',1922),club('Boavista','Porto Chequered','Porto',3,64,'#171717','#f4f0df',1903),
        club('Belenenses','Belém Blues','Lisbon',3,62,'#2b65aa','#f4f0df',1919),club('Academica','Coimbra Students','Coimbra',3,60,'#171717','#f4f0df',1887),
        club('Maritimo','Madeira Mariners','Funchal',3,58,'#21804a','#ba2636',1910),club('Nacional','Madeira Nationals','Funchal',2,55,'#171717','#f4f0df',1910),
        club('Setubal','Setúbal Dolphins','Setúbal',2,54,'#2b754c','#f4f0df',1910),club('Rio Ave','Vila do Conde Greens','Vila do Conde',2,53,'#257b4d','#f4f0df',1939),
        club('Estoril','Estoril Coast','Estoril',2,52,'#e1c82f','#265a9c',1939),club('Farense','Algarve Lions','Faro',2,51,'#171717','#f4f0df',1910),
        club('Gil Vicente','Barcelos Roosters','Barcelos',2,50,'#c32938','#255c9f',1924),club('Leixoes','Matosinhos Fishermen','Matosinhos',2,49,'#bf2838','#f4f0df',1907),
        club('Pacos Ferreira','Paços Beavers','Paços de Ferreira',2,48,'#e0c62e','#27784c',1950),club('Famalicao','Famalicão Blues','Vila Nova de Famalicão',2,48,'#2d63a6','#f4f0df',1931)
      ]
    },
    {
      id:'brazil',country:'Brazil',nationality:'Brazilian',startDate:'1959-08-23',distance:'intercontinental',baseQuality:78,threePointsYear:1995,
      names:[{from:1959,name:'Taça Brasil'},{from:1971,name:'Campeonato Brasileiro Série A'}],sizes:[{from:1959,size:16},{from:1971,size:20},{from:1987,size:24},{from:2003,size:20}],
      clubs:[
        club('Flamengo','Rio Black and Red','Rio de Janeiro',5,91,'#bd2637','#171717',1895),club('Fluminense','Rio Tricolour','Rio de Janeiro',5,83,'#7a2138','#26814b',1902),
        club('Vasco da Gama','Rio Navigators','Rio de Janeiro',5,84,'#171717','#f4f0df',1898),club('Botafogo','Rio Lone Star','Rio de Janeiro',4,78,'#171717','#f4f0df',1904),
        club('Santos','Santos Coast','Santos',5,88,'#f4f0df','#171717',1912),club('Sao Paulo','São Paulo Tricolour','São Paulo',5,88,'#f4f0df','#b92335',1930),
        club('Corinthians','São Paulo Corinthians','São Paulo',5,88,'#171717','#f4f0df',1910),club('Palmeiras','São Paulo Greens','São Paulo',5,87,'#257c4c','#f4f0df',1914),
        club('Gremio','Porto Alegre Blues','Porto Alegre',5,82,'#2d83b7','#171717',1903),club('Internacional','Porto Alegre Reds','Porto Alegre',5,82,'#c52838','#f4f0df',1909),
        club('Cruzeiro','Belo Horizonte Stars','Belo Horizonte',4,81,'#2455a0','#f4f0df',1921),club('Atletico Mineiro','Minas Roosters','Belo Horizonte',4,80,'#171717','#f4f0df',1908),
        club('Bahia','Salvador Tricolour','Salvador',4,72,'#2865aa','#c42a39',1931),club('Sport Recife','Recife Lions','Recife',3,67,'#c22838','#171717',1905),
        club('Vitoria','Salvador Red-Blacks','Salvador',3,64,'#b92536','#171717',1899),club('Athletico Paranaense','Curitiba Hurricanes','Curitiba',3,68,'#c42838','#171717',1924),
        club('Coritiba','Curitiba Greens','Curitiba',3,65,'#247b4a','#f4f0df',1909),club('Goias','Goiânia Greens','Goiânia',3,60,'#25814c','#f4f0df',1943),
        club('Fortaleza','Fortaleza Tricolour','Fortaleza',3,59,'#265ca2','#c52838',1918),club('Ceara','Ceará Black-Whites','Fortaleza',3,58,'#171717','#f4f0df',1914)
      ]
    },
    {
      id:'germany',country:'Germany',nationality:'German',startDate:'1963-08-24',distance:'continental',baseQuality:77,threePointsYear:1995,
      names:[{from:1963,name:'Bundesliga'}],sizes:[{from:1963,size:16},{from:1965,size:18},{from:1991,size:20},{from:1992,size:18}],
      clubs:[
        club('Bayern Munich','Munich Reds','Munich',5,96,'#bd2437','#f4f0df',1900),club('Borussia Dortmund','Dortmund Yellows','Dortmund',5,88,'#e4c82d','#171717',1909),
        club('Schalke 04','Gelsenkirchen Blues','Gelsenkirchen',5,81,'#2363a8','#f4f0df',1904),club('Hamburg','Hamburg North','Hamburg',5,84,'#f4f0df','#225799',1887),
        club('Werder Bremen','Bremen Greens','Bremen',4,77,'#25804c','#f4f0df',1899),club('Borussia Monchengladbach','Rhine Foals','Mönchengladbach',4,79,'#f4f0df','#171717',1900),
        club('Cologne','Cologne Goats','Cologne',4,76,'#c42638','#f4f0df',1948),club('Eintracht Frankfurt','Frankfurt Eagles','Frankfurt',4,76,'#b82335','#171717',1899),
        club('Bayer Leverkusen','Leverkusen Works','Leverkusen',4,80,'#c72b3b','#171717',1904),club('Stuttgart','Stuttgart Reds','Stuttgart',4,75,'#f4f0df','#c62a39',1893),
        club('Kaiserslautern','Palatinate Devils','Kaiserslautern',4,72,'#ba2436','#f4f0df',1900),club('Hertha Berlin','Berlin Old Lady','Berlin',4,70,'#2e65a9','#f4f0df',1892),
        club('Nurnberg','Nuremberg Club','Nuremberg',3,68,'#a81f32','#171717',1900),club('Wolfsburg','Wolfsburg Wolves','Wolfsburg',3,68,'#68a93b','#f4f0df',1945),
        club('Hannover 96','Hanover Reds','Hanover',3,63,'#bf2838','#171717',1896),club('Freiburg','Black Forest Reds','Freiburg',3,62,'#bc2637','#171717',1904),
        club('Mainz 05','Mainz Carnival','Mainz',3,59,'#c82c3b','#f4f0df',1905),club('Union Berlin','East Berlin Iron','Berlin',3,58,'#c42638','#f4f0df',1966)
      ]
    },
    {
      id:'china',country:'China',nationality:'Chinese',startDate:'2004-05-15',distance:'intercontinental',baseQuality:58,threePointsYear:2004,
      names:[{from:2004,name:'Chinese Super League'}],sizes:[{from:2004,size:12},{from:2009,size:16}],
      clubs:[
        club('Shanghai Port','Shanghai Harbour','Shanghai',4,73,'#c42735','#f0c22c',2005),club('Shanghai Shenhua','Shanghai Flowers','Shanghai',4,71,'#2468a8','#f4f0df',1993),
        club('Beijing Guoan','Beijing Imperial','Beijing',4,72,'#25804c','#e4c82e',1992),club('Guangzhou Evergrande','Guangzhou Tigers','Guangzhou',5,78,'#c52537','#e4c52d',1954),
        club('Shandong Taishan','Shandong Mountains','Jinan',4,70,'#ee7929','#f4f0df',1956),club('Tianjin Jinmen Tiger','Tianjin Tigers','Tianjin',3,64,'#2c72b6','#f4f0df',1956),
        club('Wuhan Three Towns','Wuhan Three Rivers','Wuhan',3,66,'#2576ae','#f4f0df',2013),club('Chengdu Rongcheng','Chengdu Phoenix','Chengdu',3,64,'#c62b3b','#f0c52d',2018),
        club('Henan','Henan Red Devils','Zhengzhou',3,61,'#c82d3c','#171717',1994),club('Zhejiang','Zhejiang Greens','Hangzhou',3,60,'#29824c','#f4f0df',1998),
        club('Changchun Yatai','Changchun Snow Tigers','Changchun',2,57,'#c62a39','#f4f0df',1996),club('Qingdao Hainiu','Qingdao Sea Bulls','Qingdao',2,55,'#2d72b0','#f4f0df',1990)
      ]
    },
    {
      id:'saudi',country:'Saudi Arabia',nationality:'Saudi',startDate:'2008-08-13',distance:'intercontinental',baseQuality:62,threePointsYear:2008,
      names:[{from:2008,name:'Saudi Pro League'}],sizes:[{from:2008,size:12},{from:2010,size:14},{from:2023,size:18}],
      clubs:[
        club('Al Hilal','Riyadh Crescent','Riyadh',5,83,'#2456a4','#f4f0df',1957),club('Al Nassr','Riyadh Victory','Riyadh',5,81,'#e1c52d','#285da4',1955),
        club('Al Ittihad','Jeddah Union','Jeddah',5,80,'#e4c52c','#171717',1927),club('Al Ahli','Jeddah Royals','Jeddah',5,78,'#25804d','#f4f0df',1937),
        club('Al Shabab','Riyadh Youth','Riyadh',4,71,'#f4f0df','#171717',1947),club('Al Ettifaq','Dammam Agreement','Dammam',4,69,'#2d7c4b','#c42a38',1945),
        club('Al Taawoun','Buraidah Cooperation','Buraidah',3,65,'#e7c52d','#285ca2',1956),club('Al Fateh','Al-Hasa Conquest','Al-Hasa',3,64,'#2b6fac','#25804b',1958),
        club('Al Fayha','Al Majmaah Orange','Al Majmaah',3,61,'#eb7727','#2768a7',1953),club('Damac','Khamis Red Knights','Khamis Mushait',3,60,'#c72c3b','#e6c62e',1972),
        club('Al Raed','Buraidah Pioneers','Buraidah',2,57,'#c62c3b','#171717',1954),club('Al Khaleej','Saihat Gulf','Saihat',2,55,'#e8c72d','#25814c',1945)
      ]
    }
  ];
  return {leagues};
})();
