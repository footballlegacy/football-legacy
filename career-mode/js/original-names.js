window.FLOriginalNames = (() => {
  const competitionNames = Object.freeze({
    'english-cup': 'FA Cup',
    'world-cup': 'FIFA World Cup',
    'european-champions-cup': 'European Cup',
    'european-championship': 'UEFA European Championship',
    'league-cup': 'EFL Cup',
    'cup-winners-cup': "European Cup Winners' Cup",
    'uefa-cup': 'UEFA Europa League',
    'nations-league': 'UEFA Nations League',
    'conference-league': 'UEFA Conference League'
  });

  const competitionAliases = Object.freeze({
    'English Cup': 'FA Cup',
    'World Championship': 'FIFA World Cup',
    'European Champions Cup': 'European Cup',
    'European Champions League': 'UEFA Champions League',
    'European Nations Championship': 'UEFA European Championship',
    'League Cup': 'Football League Cup',
    'European Cup Winners Cup': "European Cup Winners' Cup",
    'European Club Cup': 'UEFA Cup',
    'Europa League': 'UEFA Europa League',
    'Nations League': 'UEFA Nations League',
    'Conference League': 'UEFA Conference League'
  });

  const leagueAliases = Object.freeze({
    'Division 1 — Premier Division': 'Premier League',
    'Division 2 — Championship': 'EFL Championship',
    'Division 3 — League One': 'EFL League One',
    'Division 4 — League Two': 'EFL League Two',
    'Spanish National League': 'Primera División',
    'Spanish Primera División': 'Primera División',
    'Spanish Premier Division': 'La Liga',
    'Italian National Division': 'Serie A',
    'Italian Serie A': 'Serie A',
    'French National Division': 'Division 1',
    'French Division 1': 'Division 1',
    'French Ligue 1': 'Ligue 1',
    'Portuguese Experimental League': 'Campeonato da Liga',
    'Portuguese First Division': 'Primeira Divisão',
    'Portuguese Premier League': 'Primeira Liga',
    'Brazilian Champions Tournament': 'Taça Brasil',
    'Brazilian National Championship': 'Campeonato Brasileiro Série A',
    'Brazilian Série A': 'Campeonato Brasileiro Série A',
    'German Federal League': 'Bundesliga',
    'Saudi Professional League': 'Saudi Pro League'
  });

  const legendNames = Object.freeze({
    'victorian-goal-machine': 'Steve Bloomer',
    'interwar-record-scorer': 'Dixie Dean',
    'danubian-playmaker': 'György Sárosi',
    'postwar-deep-forward': 'Nándor Hidegkuti',
    'global-brazil-prodigy': 'Pelé',
    'portuguese-explosive-forward': 'Eusébio',
    'english-midfield-icon': 'Bobby Charlton',
    'total-football-architect': 'Johan Cruyff',
    'german-sweeper-leader': 'Franz Beckenbauer',
    'french-elegant-playmaker': 'Michel Platini',
    'italian-defensive-master': 'Franco Baresi',
    'dutch-goalscoring-forward': 'Marco van Basten',
    'african-global-superstar': 'George Weah',
    'brazilian-attacking-fullback': 'Cafu',
    'french-complete-midfielder': 'Zinedine Zidane',
    'brazilian-power-striker': 'Ronaldo Nazário',
    'italian-one-club-defender': 'Paolo Maldini',
    'iberian-deep-controller': 'Xavi',
    'portuguese-wide-goalscorer': 'Cristiano Ronaldo',
    'argentine-movement-genius': 'Lionel Messi',
    'german-sweeper-keeper': 'Manuel Neuer',
    'croatian-midfield-artist': 'Luka Modrić',
    'welsh-touchline-sprinter': 'Billy Meredith',
    'english-corinthian-playmaker': 'Vivian Woodward',
    'uruguayan-olympic-conductor': 'Héctor Scarone',
    'italian-method-centre-half': 'Luis Monti',
    'austrian-paper-man': 'Matthias Sindelar',
    'english-ball-playing-captain': 'Billy Wright',
    'soviet-black-shirt-keeper': 'Lev Yashin',
    'argentine-blond-arrow': 'Alfredo Di Stéfano',
    'welsh-gentle-giant-forward': 'John Charles',
    'swedish-continental-forward': 'Gunnar Nordahl',
    'french-attacking-orchestrator': 'Raymond Kopa',
    'english-world-cup-keeper': 'Gordon Banks',
    'english-composed-centre-back': 'Bobby Moore',
    'italian-attacking-fullback': 'Giacinto Facchetti',
    'brazilian-joyful-right-winger': 'Garrincha',
    'german-penalty-box-predator': 'Gerd Müller',
    'italian-regista-genius': 'Gianni Rivera',
    'scottish-lisbon-winger': 'Jimmy Johnstone',
    'polish-eagle-finisher': 'Grzegorz Lato',
    'czechoslovak-elegant-midfielder': 'Josef Masopust',
    'brazilian-left-footed-showman': 'Rivellino',
    'dutch-relentless-runner': 'Johan Neeskens',
    'english-charismatic-forward': 'Kevin Keegan',
    'italian-evergreen-keeper': 'Dino Zoff',
    'argentine-tournament-striker': 'Mario Kempes',
    'brazilian-doctor-midfielder': 'Sócrates',
    'irish-creative-midfielder': 'Liam Brady',
    'italian-sweeper-general': 'Gaetano Scirea',
    'danish-elegant-conductor': 'Michael Laudrup',
    'german-complete-midfielder': 'Lothar Matthäus',
    'romanian-left-foot-magician': 'Gheorghe Hagi',
    'danish-imposing-keeper': 'Peter Schmeichel',
    'english-collar-up-forward': 'Eric Cantona',
    'colombian-blond-playmaker': 'Carlos Valderrama',
    'bulgarian-left-foot-striker': 'Hristo Stoichkov',
    'brazilian-small-box-finisher': 'Romário',
    'argentine-powerful-striker': 'Gabriel Batistuta',
    'french-elegant-striker': 'Thierry Henry',
    'dutch-icy-second-striker': 'Dennis Bergkamp',
    'portuguese-golden-winger': 'Luís Figo',
    'italian-fantasy-number-ten': 'Roberto Baggio',
    'french-midfield-enforcer': 'Didier Deschamps',
    'italian-acrobatic-keeper': 'Gianluigi Buffon',
    'spanish-teenage-goalkeeper': 'Iker Casillas',
    'swedish-nomadic-target-forward': 'Zlatan Ibrahimović',
    'brazilian-samba-playmaker': 'Ronaldinho',
    'english-explosive-teen-forward': 'Wayne Rooney',
    'dutch-inverted-winger': 'Arjen Robben',
    'spanish-press-resistant-artist': 'Andrés Iniesta',
    'spanish-holding-metronome': 'Sergio Busquets',
    'polish-complete-nine': 'Robert Lewandowski',
    'belgian-creative-passer': 'Kevin De Bruyne',
    'uruguayan-relentless-striker': 'Luis Suárez',
    'welsh-left-foot-sprinter': 'Gareth Bale',
    'egyptian-inside-forward': 'Mohamed Salah',
    'senegalese-pressing-winger': 'Sadio Mané',
    'english-penalty-box-captain': 'Harry Kane',
    'brazilian-street-winger': 'Neymar',
    'french-explosive-wide-striker': 'Kylian Mbappé',
    'english-roaming-midfielder': 'Jude Bellingham',
    'spanish-teenage-wing-prodigy': 'Lamine Yamal',
    'moroccan-commanding-keeper': 'Badou Zaki',
    'cameroonian-lion-striker': "Samuel Eto'o",
    'ghanaian-box-to-box-leader': 'Michael Essien',
    'ivorian-power-forward': 'Didier Drogba',
    'nigerian-olympic-winger': 'Jay-Jay Okocha',
    'algerian-left-footed-winger': 'Riyad Mahrez',
    'japanese-attacking-midfielder': 'Shunsuke Nakamura',
    'korean-relentless-winger': 'Son Heung-min',
    'mexican-five-cup-goalkeeper': 'Guillermo Ochoa',
    'chilean-midfield-warrior': 'Arturo Vidal',
    'paraguayan-goalkeeping-captain': 'José Luis Chilavert',
    'czech-helmeted-goalkeeper': 'Petr Čech',
    'serbian-dominant-centre-back': 'Nemanja Vidić',
    'turkish-left-foot-playmaker': 'Emre Belözoğlu',
    'greek-sweeper-captain': 'Traianos Dellas',
    'australian-physical-forward': 'Tim Cahill',
    'american-elite-goalkeeper': 'Tim Howard',
    'canadian-attacking-fullback': 'Alphonso Davies',
    'ecuadorian-power-midfielder': 'Antonio Valencia',
    'georgian-wing-magician': 'Khvicha Kvaratskhelia',
    'italian-towering-keeper': 'Gianpiero Combi',
    'wing-wizard-1934': 'Stanley Matthews',
    'puskas-wave': 'Ferenc Puskás',
    'best-wave': 'George Best',
    'maradona-wave': 'Diego Maradona',
    'gullit-wave': 'Ruud Gullit',
    'haaland-wave': 'Erling Haaland'
  });

  const normalise = value => String(value || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clubReferenceAliases = Object.freeze({
    'West Ham': 'West Ham United',
    'Bournemouth': 'AFC Bournemouth',
    'Brighton': 'Brighton & Hove Albion',
    'Norwich': 'Norwich City',
    'Peterborough': 'Peterborough United',
    'Fleetwood': 'Fleetwood Town'
  });

  let cachedRows = null;
  let cachedClubMap = null;
  let cachedReplacements = null;
  function databaseRows(){
    if (!cachedRows) cachedRows = [...(window.FLClubDatabase?.english || []), ...(window.FLClubDatabase?.world || [])];
    return cachedRows;
  }

  function restoreClubDatabase(){
    databaseRows().forEach(row => {
      if (!row?.reference) return;
      row.fictionalName = row.fictionalName || row.name;
      row.name = row.reference;
    });
  }

  function clubMaps(){
    if (cachedClubMap) return cachedClubMap;
    const byKey = new Map();
    databaseRows().forEach(row => {
      if (!row?.reference) return;
      [row.reference, row.name, row.fictionalName].filter(Boolean).forEach(value => byKey.set(normalise(value), row.reference));
    });
    cachedClubMap = byKey;
    return cachedClubMap;
  }

  function originalClubName(value){
    return clubMaps().get(normalise(value)) || value;
  }

  function renameString(value){
    if (typeof value !== 'string') return value;
    if (competitionAliases[value]) return competitionAliases[value];
    if (leagueAliases[value]) return leagueAliases[value];
    const exactClub = originalClubName(value);
    if (exactClub !== value) return exactClub;
    let output = value;
    if (!cachedReplacements) cachedReplacements = databaseRows().filter(row => row.fictionalName && row.fictionalName !== row.reference).sort((a,b) => b.fictionalName.length - a.fictionalName.length);
    cachedReplacements.forEach(row => { output = output.replaceAll(row.fictionalName, row.reference); });
    Object.entries(competitionAliases).forEach(([fake, original]) => { output = output.replaceAll(fake, original); });
    Object.entries(leagueAliases).forEach(([fake, original]) => { output = output.replaceAll(fake, original); });
    return output;
  }

  function restoreGame(value, seen = new WeakSet()){
    if (!value || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    if (typeof value.name === 'string') {
      const explicit = typeof value.realClub === 'string' ? value.realClub : null;
      const referenced = typeof value.reference === 'string' ? value.reference.replace(/\s+parallel$/i, '') : null;
      const aliasedReference = clubReferenceAliases[referenced] || referenced;
      const original = explicit || (aliasedReference && clubMaps().has(normalise(aliasedReference)) ? originalClubName(aliasedReference) : null);
      if (original) value.name = original;
    }
    if (value.legendArchetype && legendNames[value.legendArchetype]) value.name = legendNames[value.legendArchetype];
    for (const [key, child] of Object.entries(value)) {
      const structuralKey = /(?:^|[_-])(id|ids|key|keys|slug|route|type|mode|status|code)$/i.test(key) || /(?:Id|Ids|Key|Keys|Slug|Route|Type|Mode|Status|Code)$/.test(key);
      if (typeof child === 'string' && !structuralKey) value[key] = renameString(child);
      else restoreGame(child, seen);
    }
    return value;
  }

  restoreClubDatabase();
  [window.FLData, window.FLWorldFootballData, window.FLTimelineData, window.FLPyramidData].filter(Boolean).forEach(value => restoreGame(value));
  return {competitionNames, competitionAliases, leagueAliases, legendNames, originalClubName, restoreClubDatabase, restoreGame, renameString};
})();
