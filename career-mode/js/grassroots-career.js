window.FLGrassroots = (() => {
  const VERSION = '0.28.1-phase-2';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const hash = text => {
    let value = 2166136261;
    for (const char of String(text || '')) {
      value ^= char.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  };
  const seeded = seed => {
    let state = seed >>> 0;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  };
  const pick = (rows, random) => rows[Math.floor(random() * rows.length)];
  const controlled = game => (game?.clubs || []).find(club => club.id === game.controlledClubId) || null;
  const currentTier = game => {
    const club = controlled(game);
    const division = window.FLPyramid?.divisionForClub?.(game, club?.id);
    return Number(division?.tier || club?.tier || 15);
  };
  const isManagedGrassrootsClub = game => Boolean(
    game?.meta?.grassroots &&
    game?.meta?.grassrootsClubId &&
    game.controlledClubId === game.meta.grassrootsClubId
  );

  const localNames = [
    'Callum Price', 'Dean Fowler', 'Mason Riley', 'Ryan Ellis', 'Lewis Grant',
    'Tommy Wade', 'Jordan Buckley', 'Nathan Cole', 'Jamie Pritchard', 'Luke Barber',
    'Ben Houghton', 'Sam Doyle', 'Kieran Moss', 'Jack Simmonds', 'Aaron Field',
    'Charlie Webb', 'Owen Briggs', 'Connor Walsh', 'Dylan Hart', 'Harry Nolan',
    'Alfie Mercer', 'George Fry', 'Josh Keane', 'Liam Hurst', 'Reece Sutton',
    'Billy Sharpes', 'Elliot Dean', 'Max Cotton', 'Joe Baines', 'Finley Cross'
  ];
  const positions = ['GK', 'FB', 'FB', 'HB', 'HB', 'HB', 'W', 'IF', 'CF', 'IF', 'W'];
  const jobs = [
    'Warehouse picker', 'Electrician', 'Delivery driver', 'Teaching assistant',
    'Bar staff', 'Builder', 'Office administrator', 'Mechanic', 'Retail assistant',
    'Landscaper', 'Apprentice plumber', 'IT support', 'Chef', 'Postman',
    'Student', 'Carpenter'
  ];
  const sources = [
    'a message on the club Facebook page', 'a mate of the captain',
    'someone from the pub team', 'a player seen at five-a-side',
    'a recommendation from a local referee', 'a friend of the chairman',
    'a lad who asked at training', 'word of mouth from an opponent'
  ];
  const regionLabels = {
    'north-west': 'Lancashire & Cheshire',
    'north-east': 'North East',
    yorkshire: 'Yorkshire',
    'east-midlands': 'East Midlands',
    'west-midlands': 'West Midlands',
    east: 'Eastern Counties',
    london: 'London',
    'south-east': 'Kent & Sussex',
    'home-counties': 'Home Counties',
    'south-central': 'Southern Counties',
    'south-west': 'Western Counties',
    'wales-border': 'Border Counties'
  };
  const regionKeywords = [
    ['north-west', /lancashire|cheshire|manchester|merseyside|cumbria/],
    ['north-east', /northumberland|durham|tyne|wear|newcastle/],
    ['yorkshire', /yorkshire|leeds|sheffield|hull/],
    ['east-midlands', /derby|nottingham|leicester|lincoln|northampton/],
    ['west-midlands', /birmingham|warwick|worcester|stafford|shropshire|west midlands/],
    ['east', /norfolk|suffolk|cambridge|essex/],
    ['london', /london|middlesex/],
    ['south-east', /kent|sussex|surrey/],
    ['home-counties', /hertford|bedford|buckingham|berkshire|oxford/],
    ['south-central', /hampshire|wiltshire|dorset|isle of wight/],
    ['south-west', /cornwall|devon|somerset|gloucester|bristol/],
    ['wales-border', /hereford|monmouth|powys|wrexham|border/]
  ];

  function regionForCreatedClub(club) {
    const text = `${club?.location?.city || ''} ${club?.location?.county || ''}`.toLowerCase();
    return regionKeywords.find(([, expression]) => expression.test(text))?.[0] || 'home-counties';
  }
  function placeholderId(region) {
    return `grassroots-slot-${region || 'home-counties'}`;
  }
  function divisionId(region) {
    return `${region || 'home-counties'}-tier-15`;
  }
  function divisionName(region) {
    return `${regionLabels[region] || 'Home Counties'} Community League`;
  }
  function useLocalRecruitment(game) {
    return isManagedGrassrootsClub(game) && currentTier(game) >= 7;
  }

  function managerJob(manager) {
    const title = manager?.occupation && manager.occupation !== 'Full-time Football Manager'
      ? manager.occupation
      : 'Local council worker';
    const random = seeded(hash(`${manager?.firstName}|${manager?.lastName}|${title}`));
    return {
      title,
      employer: pick(['Local employer', 'Family business', 'Council department', 'Town centre workplace', 'Nearby industrial estate'], random),
      weeklyHours: 32 + Math.floor(random() * 13),
      shiftPattern: pick(['Weekdays', 'Rotating shifts', 'Early shifts', 'Mixed weekdays and Saturdays'], random),
      flexibility: 35 + Math.floor(random() * 46),
      stress: 18 + Math.floor(random() * 25),
      annualLeave: 18 + Math.floor(random() * 9),
      daysUsed: 0,
      weeklyPay: Math.round(360 + random() * 290),
      active: true
    };
  }

  function chairmanFor(club) {
    const names = ['Mick Harper', 'Dave Wilkins', 'Gary Phelps', 'Steve Donnelly', 'Martin Cobb', 'Phil Brennan', 'Tony Marsh', 'Alan Rook', 'Robbie Haines', 'Pete Larkin'];
    const random = seeded(hash(`${club.id}|chairman`));
    const name = pick(names, random);
    return {
      id: 'chairman',
      name,
      role: 'Chairman, secretary and treasurer',
      type: 'Unpaid volunteer who started the club for fun',
      approval: 68,
      influence: 5,
      wealth: 1,
      priority: 'Keep the club alive and enjoy Saturdays',
      concern: 'Finding enough players and paying the pitch fee',
      supports: ['Local players', 'Cheap recruitment', 'Community spirit'],
      opposes: ['Debt', 'Pretending the club has money'],
      unpaid: true
    };
  }

  function boardFor(game, club) {
    const chairman = chairmanFor(club);
    return {
      view: 'overview',
      grassroots: true,
      members: [chairman],
      requests: [
        {
          id: 'turn-up',
          category: 'Survival',
          title: 'Get eleven players to the next match',
          detail: 'Keep enough of the squad available to fulfil the fixture.',
          reward: 'The club gets through another week',
          risk: 'A fine or a walkover',
          status: 'active',
          progress: 55
        },
        {
          id: 'pitch-fee',
          category: 'Money',
          title: 'Cover the pitch and referee',
          detail: 'Keep a small positive balance through match fees, gate money and favours.',
          reward: 'The next home game can go ahead',
          risk: 'The chairman pays out of his own pocket again',
          status: 'active',
          progress: 40
        },
        {
          id: 'season',
          category: 'Football',
          title: 'Stay competitive',
          detail: 'Finish the season without the club folding.',
          reward: 'Another year of football',
          risk: 'Players drift away',
          status: 'active',
          progress: 15
        }
      ],
      proposals: [],
      meetings: [],
      log: [{
        date: game.date,
        text: `${chairman.name} handed over the keys, the kit bag and a carrier bag full of registration forms.`
      }]
    };
  }

  function createdLocation(club) {
    return [club?.location?.city, club?.location?.county, club?.location?.country || 'England']
      .filter(Boolean)
      .join(', ') || 'England';
  }
  function stadiumName(createdClub, stadium) {
    return stadium?.name || createdClub?.stadium?.name || 'Community Playing Field';
  }
  function mapPosition(position) {
    const value = String(position || '').toUpperCase();
    if (value === 'GK') return 'GK';
    if (/RB|LB|CB|RWB|LWB|DF/.test(value)) return 'FB';
    if (/DM|CM|CDM|CAM|MF/.test(value)) return 'HB';
    if (/RW|LW|RM|LM/.test(value)) return 'W';
    if (/AM|SS/.test(value)) return 'IF';
    return 'CF';
  }

  function playerBase(template, index, club, random, game) {
    const player = { ...(template || {}) };
    player.id = player.id || `grass-${club.id}-${index}-${Math.floor(random() * 1e9)}`;
    player.clubId = club.id;
    player.status = 'active';
    player.available = true;
    player.condition = clamp(player.condition || 85, 40, 100);
    player.morale = player.morale || 'Good';
    player.contractType = 'Amateur registration';
    player.contractStatus = 'No formal contract';
    player.contractStart = game?.date || '2026-08-15';
    player.contractEnd = '2027-06-30';
    player.wage = 0;
    player.matchExpense = 5 + Math.floor(random() * 16);
    player.squadStatus = index < 11 ? 'First Team' : index < 16 ? 'Rotation' : 'Backup';
    player.careerTotals = player.careerTotals || { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 };
    player.clubHistory = [{ club: club.name, clubId: club.id, from: 2026, to: 'Present', apps: 0, goals: 0 }];
    player.seasonHistory = [];
    player.matchHistory = [];
    player.honours = [];
    return player;
  }

  function applyPartTimeProfile(player, game) {
    const random = seeded(hash(`${game.meta?.seed}|${player.id}|part-time`));
    const age = Number(player.age) || 18 + Math.floor(random() * 22);
    player.age = age;
    player.partTime = true;
    player.reliability = clamp(player.reliability ?? Math.round(42 + random() * 54), 10, 99);
    player.commitment = clamp(player.commitment ?? Math.round(38 + random() * 58), 10, 99);
    player.lifeStage = player.lifeStage || (age <= 20 ? 'student' : age <= 27 ? 'early-career' : age <= 34 ? 'settled-work' : 'family-and-work');
    player.dayJob = player.dayJob || pick(jobs, random);
    player.workFlexibility = clamp(player.workFlexibility ?? Math.round(25 + random() * 66), 10, 98);
    player.travelReliability = clamp(player.travelReliability ?? Math.round(45 + random() * 51), 15, 99);
    player.socialRisk = clamp(player.socialRisk ?? Math.round(random() * 80), 0, 95);
    player.hiddenTalent = clamp(player.hiddenTalent ?? Math.round(random() * 100), 0, 100);
    player.talentKnowledge = clamp(player.talentKnowledge ?? Math.round(random() * 12), 0, 100);
    player.latentAbilityBonus = clamp(player.latentAbilityBonus ?? (player.hiddenTalent >= 94 ? 8 : player.hiddenTalent >= 87 ? 5 : player.hiddenTalent >= 78 ? 3 : player.hiddenTalent >= 68 ? 1 : 0), 0, 10);
    player.appliedTalentBonus = clamp(player.appliedTalentBonus ?? 0, 0, player.latentAbilityBonus);
    player.lifeEventHistory = Array.isArray(player.lifeEventHistory) ? player.lifeEventHistory : [];
    player.availabilityHistory = Array.isArray(player.availabilityHistory) ? player.availabilityHistory : [];
    player.grassrootsProfileVersion = VERSION;
    player.trainingAttendance = clamp(player.trainingAttendance ?? Math.round((player.reliability + player.commitment) / 2), 10, 99);
    return player;
  }

  function convertCreatedPlayer(row, template, index, club, game) {
    const random = seeded(hash(`${row.id}|${club.id}|created`));
    const player = playerBase(template, index, club, random, game);
    player.id = `created-career-${row.id}`;
    player.createdPlayerId = row.id;
    player.name = `${row.firstName || 'Local'} ${row.lastName || 'Player'}`.trim();
    player.firstName = row.firstName || 'Local';
    player.lastName = row.lastName || 'Player';
    player.age = Number(row.age) || player.age || 18;
    player.nationality = row.nationality || 'England';
    player.position = mapPosition(row.primaryPosition);
    player.positions = [player.position, mapPosition(row.secondaryPosition)].filter((value, indexValue, all) => value && all.indexOf(value) === indexValue);
    player.preferredFoot = row.preferredFoot || 'Right';
    player.ability = clamp(Number(row.overall) || Number(template?.ability) || 35, 20, 58);
    player.ceiling = clamp(Math.max(player.ability, Number(row.overall || 0) + 4 + Math.floor(random() * 12)), player.ability, 72);
    player.potential = player.ceiling;
    player.createdAppearance = row.appearance || null;
    player.face = row.appearance?.facePreset || player.face;
    player.shirtNumber = Number(row.shirtNumber) || index + 1;
    if (row.legendArchetype) {
      player.legendArchetype = row.legendArchetype;
      player.traits = [...(row.traits || player.traits || [])];
    }
    return applyPartTimeProfile(player, game);
  }

  const tierRating = tier => ({1:82,2:74,3:68,4:63,5:58,6:54,7:50,8:47,9:44,10:41,11:38,12:35,13:32,14:29,15:26})[Number(tier)] || 42;

  function convertProfessionalPlayer(row, template, index, club, game, tier) {
    const random = seeded(hash(`${row?.id || index}|${club.id}|professional`));
    const player = playerBase(template, index, club, random, game);
    const rawName = row?.name || `${row?.firstName || 'Squad'} ${row?.lastName || `Player ${index + 1}`}`;
    const parts = String(rawName).trim().split(/\s+/);
    player.id = `created-career-${row?.id || `${club.id}-${index}`}`;
    player.createdPlayerId = row?.source === 'created' ? row.id : null;
    player.name = rawName;
    player.firstName = row?.firstName || parts.shift() || 'Squad';
    player.lastName = row?.lastName || parts.join(' ') || `Player ${index + 1}`;
    player.age = Number(row?.age) || 18 + Math.floor(random() * 17);
    player.nationality = row?.nationality || 'England';
    player.position = mapPosition(row?.primaryPosition || row?.position || template?.position);
    player.positions = [player.position];
    player.ability = clamp(Number(row?.overall) || Number(template?.ability) || tierRating(tier), 22, 92);
    player.ceiling = clamp(Math.max(player.ability, player.ability + 3 + Math.floor(random() * 10)), player.ability, 96);
    player.potential = player.ceiling;
    player.partTime = false;
    player.contractType = 'Professional';
    player.contractStatus = 'Secure';
    player.contractStart = game.date;
    player.contractEnd = '2029-06-30';
    player.wage = Math.max(120, Math.round((player.ability * player.ability) * Math.max(1, 7 - Number(tier))));
    player.squadStatus = index < 11 ? 'First Team' : index < 17 ? 'Rotation' : 'Backup';
    if (row?.legendArchetype) {
      player.legendArchetype = row.legendArchetype;
      player.traits = [...(row.traits || player.traits || [])];
    }
    delete player.dayJob;
    delete player.matchExpense;
    return player;
  }

  function takeExistingRealPlayer(game, row) {
    if (!row?.legendArchetype) return null;
    for (const team of game.clubs || []) {
      const index = (team.players || []).findIndex(player => player.legendArchetype === row.legendArchetype);
      if (index >= 0) return team.players.splice(index, 1)[0];
    }
    for (const found of window.FLWorldFootball?.players?.(game) || []) {
      if (found.p?.legendArchetype !== row.legendArchetype) continue;
      const index = (found.c?.players || []).findIndex(player => player.id === found.p.id);
      if (index >= 0) return found.c.players.splice(index, 1)[0];
    }
    for (const key of ['freeAgents', 'globalPlayers']) {
      const rows = Array.isArray(game[key]) ? game[key] : [];
      const index = rows.findIndex(player => player.legendArchetype === row.legendArchetype);
      if (index >= 0) return rows.splice(index, 1)[0];
    }
    return null;
  }

  function moveExistingRealPlayer(player, row, index, club, game, tier, informal) {
    player.clubHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
    const previousSpell = player.clubHistory.at(-1);
    if (previousSpell?.to === 'Present') previousSpell.to = 2026;
    player.clubHistory.push({ clubId: club.id, club: club.name, from: 2026, to: 'Present' });
    player.clubId = club.id;
    player.status = 'active';
    player.available = true;
    player.position = mapPosition(row.primaryPosition || player.position);
    player.positions = [player.position];
    player.condition = clamp(player.condition || 92, 55, 100);
    player.squadStatus = index < 11 ? 'First Team' : index < 17 ? 'Rotation' : 'Backup';
    if (informal) return applyPartTimeProfile(player, game);
    player.partTime = false;
    player.contractType = 'Professional';
    player.contractStatus = 'Secure';
    player.contractStart = game.date;
    player.contractEnd = '2029-06-30';
    player.wage = Math.max(Number(player.wage) || 0, Math.round((Number(player.ability || row.overall) ** 2) * Math.max(1, 7 - Number(tier))));
    delete player.dayJob;
    delete player.matchExpense;
    return player;
  }

  function buildSquad(game, club, createdClub, createdPlayers, informal = true) {
    const templates = [...(club.players || [])];
    const selectedIds = new Set(createdClub?.squad?.playerIds || []);
    const embedded = Array.isArray(createdClub?.squad?.players) ? createdClub.squad.players : [];
    const byId = new Map([...(createdPlayers || []), ...embedded].map(player => [player.id, player]));
    const selectedRows = [...selectedIds].map(id => byId.get(id)).filter(Boolean);
    const squad = [];
    const createdIdMap = {};

    selectedRows.forEach((row, index) => {
      const existing = row.source === 'real' ? takeExistingRealPlayer(game, row) : null;
      const player = existing
        ? moveExistingRealPlayer(existing, row, index, club, game, createdClub.startingTier, informal)
        : informal
          ? convertCreatedPlayer(row, templates[index], index, club, game)
          : convertProfessionalPlayer(row, templates[index], index, club, game, createdClub.startingTier);
      squad.push(player);
      createdIdMap[row.id] = player.id;
    });

    for (let index = squad.length; index < 20; index += 1) {
      const random = seeded(hash(`${game.meta?.seed}|${club.id}|generated-local|${index}`));
      const template = templates[index] || templates[index % Math.max(1, templates.length)] || {};
      const player = playerBase({ ...template }, index, club, random, game);
      player.id = `grass-${club.id}-${index}-${hash(`${club.id}-${index}`)}`;
      player.name = localNames[(hash(`${club.id}-${index}`) + index) % localNames.length];
      const [firstName, ...lastName] = player.name.split(' ');
      player.firstName = firstName;
      player.lastName = lastName.join(' ');
      player.position = positions[index % positions.length];
      player.positions = [player.position];
      player.age = 17 + Math.floor(random() * 26);
      player.ability = informal ? clamp(24 + Math.floor(random() * 19) + (index < 4 ? 2 : 0), 20, 48) : clamp(tierRating(createdClub.startingTier) - 4 + Math.floor(random() * 9), 22, 92);
      player.ceiling = clamp(player.ability + 2 + Math.floor(random() * 17), player.ability, informal ? 65 : 96);
      player.potential = player.ceiling;
      player.nationality = 'England';
      if (informal) applyPartTimeProfile(player, game);
      else {
        player.partTime = false;
        player.contractType = 'Professional';
        player.contractStatus = 'Secure';
        player.wage = Math.max(120, Math.round((player.ability * player.ability) * Math.max(1, 7 - Number(createdClub.startingTier))));
        delete player.dayJob;
        delete player.matchExpense;
      }
      squad.push(player);
    }

    club.players = squad;
    return createdIdMap;
  }

  function ensure(game) {
    if (!isManagedGrassrootsClub(game)) return null;
    const club = controlled(game);
    game.grassroots = game.grassroots || {};
    const state = game.grassroots;
    state.version = VERSION;
    state.region = state.region || game.meta.grassrootsRegion || club?.subregion || 'home-counties';
    state.divisionId = state.divisionId || divisionId(state.region);
    state.managerJob = state.managerJob || managerJob(game.manager);
    state.recruitment = state.recruitment || { generatedMonth: null, candidates: [], history: [] };
    state.matchday = state.matchday || { preparedFixtures: {}, settledFixtures: {}, preparation: {} };
    state.matchday.preparation = state.matchday.preparation || {};
    state.playerLives = state.playerLives || { lastProcessedMonth: null, history: [], talentReveals: [], seasonEventCount: 0, seasonKey: null };
    state.playerLives.history = Array.isArray(state.playerLives.history) ? state.playerLives.history : [];
    state.playerLives.talentReveals = Array.isArray(state.playerLives.talentReveals) ? state.playerLives.talentReveals : [];
    state.work = state.work || { checkedFixtures: {}, pending: [], history: [] };
    state.work.checkedFixtures = state.work.checkedFixtures || {};
    state.work.pending = Array.isArray(state.work.pending) ? state.work.pending : [];
    state.work.history = Array.isArray(state.work.history) ? state.work.history : [];
    state.events = Array.isArray(state.events) ? state.events : [];
    state.stage = currentTier(game) >= 11 ? 'grassroots' : currentTier(game) >= 7 ? 'part-time' : 'football-pyramid';
    state.managerJob.employerPatience = clamp(state.managerJob.employerPatience ?? 72, 0, 100);
    state.managerJob.employmentSecurity = clamp(state.managerJob.employmentSecurity ?? 78, 0, 100);
    state.managerJob.missedShifts = Number(state.managerJob.missedShifts || 0);
    state.managerJob.footballClashes = Number(state.managerJob.footballClashes || 0);
    if (club) (club.players || []).forEach(player => applyPartTimeProfile(player, game));
    return state;
  }

  function setupRecruitment(game) {
    const state = ensure(game);
    if (!state) return null;
    if (!Array.isArray(state.recruitment.candidates) || !state.recruitment.candidates.length) refreshCandidates(game, true);
    return state.recruitment;
  }

  function refreshCandidates(game, force = false) {
    const state = ensure(game);
    if (!state) return [];
    const month = String(game.date || '').slice(0, 7);
    if (!force && state.recruitment.generatedMonth === month) return state.recruitment.candidates;
    const club = controlled(game);
    const random = seeded(hash(`${game.meta?.seed}|${month}|grassroots-recruitment`));
    const usedNames = new Set((club.players || []).map(player => player.name));
    state.recruitment.candidates = Array.from({ length: 7 }, (_, index) => {
      let name = pick(localNames, random);
      let guard = 0;
      while (usedNames.has(name) && guard < 50) {
        name = pick(localNames, random);
        guard += 1;
      }
      usedNames.add(name);
      const actualAbility = 24 + Math.floor(random() * 27);
      const uncertainty = 5 + Math.floor(random() * 13);
      return {
        id: `candidate-${month}-${index}-${hash(name)}`,
        name,
        age: 17 + Math.floor(random() * 28),
        position: pick(positions, random),
        source: pick(sources, random),
        actualAbility,
        reportedMin: clamp(actualAbility - uncertainty, 18, 55),
        reportedMax: clamp(actualAbility + uncertainty, 22, 62),
        reliability: 30 + Math.floor(random() * 65),
        commitment: 30 + Math.floor(random() * 66),
        dayJob: pick(jobs, random),
        matchExpense: 5 + Math.floor(random() * 16),
        hiddenGem: random() < 0.08
      };
    });
    state.recruitment.generatedMonth = month;
    return state.recruitment.candidates;
  }

  function startingDivision(game, tier, region) {
    const choices = (window.FLPyramid?.divisionList?.(game, 2026) || []).filter(division => Number(division.tier) === Number(tier));
    return choices.find(division => division.regionKey === region)
      || choices.find(division => (division.regions || []).includes(region))
      || choices.find(division => division.region === window.FLPyramidData?.deepRegions?.[region]?.side)
      || choices[0]
      || null;
  }

  function placeCreatedClub(game, club, tier, region) {
    const previousDivisionId = club.divisionId;
    const target = startingDivision(game, tier, region);
    if (!target) throw new Error(`Tier ${tier} is not available in the 2026 football pyramid.`);

    if (previousDivisionId !== target.id) {
      const replacement = (window.FLPyramid?.clubsInDivision?.(game, target.id) || [])
        .filter(candidate => candidate.id !== club.id && candidate.id !== game.controlledClubId)
        .sort((a, b) => Number(a.reputation || a.stature || 0) - Number(b.reputation || b.stature || 0))[0];
      if (!replacement) throw new Error(`${target.name} has no club slot available for the created club.`);
      replacement.divisionId = previousDivisionId;
      replacement.tier = 15;
      replacement.initialTier = Number(replacement.initialTier) || 15;
      replacement.leagueActive = true;
      if (game.pyramid?.membership) game.pyramid.membership[replacement.id] = previousDivisionId;
      if (game.pyramid?.nextDivisionAssignments) game.pyramid.nextDivisionAssignments[replacement.id] = previousDivisionId;
      if (game.pyramid?.nextTierAssignments) game.pyramid.nextTierAssignments[replacement.id] = 15;
    }

    club.divisionId = target.id;
    club.tier = Number(tier);
    club.initialTier = Number(tier);
    club.leagueActive = true;
    club.systemEntry = 2026;
    if (tier <= 4) club.earnedNationalEntryYear = 2026;
    game.pyramid = game.pyramid || {};
    game.pyramid.membership = game.pyramid.membership || {};
    game.pyramid.nextDivisionAssignments = game.pyramid.nextDivisionAssignments || {};
    game.pyramid.nextTierAssignments = game.pyramid.nextTierAssignments || {};
    game.pyramid.mandatoryClubIds = [...new Set([...(game.pyramid.mandatoryClubIds || []), club.id])];
    game.pyramid.membership[club.id] = target.id;
    game.pyramid.nextDivisionAssignments[club.id] = target.id;
    game.pyramid.nextTierAssignments[club.id] = Number(tier);
    game.pyramid.uiDivisionId = target.id;
    return target;
  }

  function applyCreatedClub(game, createdClub, createdPlayers = [], stadium = null, region = null) {
    const club = controlled(game);
    if (!club) throw new Error('The created-club slot could not be loaded.');
    region = region || regionForCreatedClub(createdClub);
    const tier = clamp(Number(createdClub?.startingTier) || 15, 1, 15);
    const informal = tier >= 7;
    const rating = tierRating(tier);
    const division = placeCreatedClub(game, club, tier, region);

    // Keep the existing slot ID. All pyramid memberships, tables, fixtures and
    // histories already point at this record, so retaining it prevents a custom
    // club from becoming detached from the shared career world.
    game.meta = game.meta || {};
    game.meta.grassroots = informal;
    game.meta.grassrootsRegion = region;
    game.meta.grassrootsCreatedClubId = createdClub.id;
    game.meta.grassrootsClubId = informal ? club.id : null;
    game.meta.createdClubCareer = true;
    game.meta.createdClubStartingTier = tier;
    game.meta.careerRoute = 'create-club';
    game.meta.startYear = 2026;
    game.meta.preselectedClubId = club.id;

    club.name = createdClub.name || 'Created Club';
    club.initials = (createdClub.abbreviation || createdClub.shortName || club.name)
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 4)
      .toUpperCase() || 'CGC';
    club.location = createdLocation(createdClub);
    club.region = window.FLPyramidData?.deepRegions?.[region]?.side || 'south';
    club.subregion = region;
    club.countyRegion = region;
    club.primary = createdClub.colours?.primary || '#7b1d2a';
    club.secondary = createdClub.colours?.secondary || '#eeeade';
    club.a = club.primary;
    club.b = club.secondary;
    club.colours = `${club.primary} and ${club.secondary}`;
    club.ground = stadiumName(createdClub, stadium);
    const defaultCapacity = tier === 1 ? 32000 : tier === 2 ? 22000 : tier <= 4 ? 12000 : tier <= 6 ? 5000 : 500;
    club.capacity = informal
      ? Math.max(80, Math.min(2400, Number(stadium?.capacity) || defaultCapacity))
      : Math.max(1000, Number(stadium?.capacity) || defaultCapacity);
    club.founded = `${Number(createdClub.founded) || 2026}-01-01`;
    club.createdClub = true;
    club.createdClubId = createdClub.id;
    club.grassrootsClub = informal;
    club.source = 'created';
    club.badge = createdClub.badge || null;
    club.kits = createdClub.kits || null;
    club.teamSetup = createdClub.teamSetup || null;
    club.honours = [];
    club.seasonHistory = [];
    club.managerHistory = [];
    club.powerRating = rating;
    club.clubRating = rating;
    club.reputation = clamp(rating - 7, 16, 92);
    club.stature = clamp(rating - 9, 14, 90);
    club.financialPower = informal ? clamp(20 - tier, 4, 14) : clamp(92 - tier * 7, 30, 88);
    club.strength = clamp(Math.round(rating / 20), 1, 5);
    club.expectation = informal
      ? 'Keep the club alive, fulfil the fixtures and see where the season takes you.'
      : `Establish the new club in ${division.name} and build a sustainable first season.`;
    const facilityLevel = informal ? 1 : clamp(7 - tier, 1, 5);
    club.facilities = { training: facilityLevel, youth: facilityLevel, medical: informal ? 1 : facilityLevel, scouting: informal ? 0 : Math.max(1, facilityLevel - 1), stadium: facilityLevel };

    const createdIdMap = buildSquad(game, club, createdClub, createdPlayers, informal);
    game.manager = {
      ...game.manager,
      appointedDate: '2026-08-15',
      user: true,
      occupation: informal ? (game.manager.occupation || 'Day job') : 'Full-time Football Manager'
    };
    club.managerProfile = {
      ...game.manager,
      id: `manager-${club.id}-2026-08-15`,
      clubId: club.id,
      user: true
    };
    club.managerHistory.push({
      managerId: club.managerProfile.id,
      name: `${game.manager.firstName} ${game.manager.lastName}`,
      from: '2026-08-15',
      to: 'Present',
      role: informal ? 'Player-manager / volunteer manager' : 'Manager',
      age: game.manager.age
    });

    if (informal) {
      game.finances = {
        balance: 650,
        income: 0,
        expenses: 0,
        transferBudget: 0,
        weeklyWageBudget: 0,
        grassroots: true,
        pitchFee: 85,
        refereeFee: 45,
        matchFeesExpected: 120
      };
      game.boardConfidence = 68;
      game.board = boardFor(game, club);
      game.managerContract = {
        grassroots: true,
        clubId: club.id,
        startDate: '2026-08-15',
        expiryDate: null,
        lengthYears: null,
        weeklyWage: 0,
        annualWage: 0,
        marketWeeklyWage: 0,
        compensation: 0,
        status: 'Volunteer',
        boardDecision: 'continue',
        pendingOffer: null,
        wageHistory: [],
        reviewHistory: [],
        offerHistory: []
      };
    } else {
      game.boardConfidence = 65;
      game.finances = {
        balance: window.FLEconomy?.clubBudget?.(game, club) || Math.max(50000, rating * rating * 150),
        income: 0,
        expenses: 0,
        transferBudget: window.FLEconomy?.transferBudget?.(game, club) || Math.max(25000, rating * rating * 40),
        weeklyWageBudget: window.FLEconomy?.weeklyWageBudget?.(game, club) || Math.max(2000, rating * 400)
      };
      window.FLManagerContracts?.startAppointment?.(game, club, { startDate: game.date });
    }

    game.teamManagement = null;
    const startingXI = (createdClub.squad?.startingXI || []).map(id => createdIdMap[id]).filter(Boolean);
    const substitutes = (createdClub.squad?.substitutes || []).map(id => createdIdMap[id]).filter(Boolean);
    if (startingXI.length === 11) {
      game.teamManagement = {
        formation: '2-3-5',
        startingXI,
        substitutes,
        teamView: 'lineup'
      };
    }

    game.fixtures = window.FLGame?.makePyramidSchedule?.(game, 2026) || game.fixtures || [];
    game.grassroots = null;
    const state = informal ? ensure(game) : null;
    if (informal) setupRecruitment(game);

    game.inbox = informal ? [
      {
        id: 'grassroots-welcome',
        date: game.date,
        from: game.board.members[0].name,
        subject: 'Right, this is basically everything',
        body: `Welcome to ${club.name}. I am the chairman, secretary, treasurer and the bloke with the keys. Nobody is paid. The balance is £650, the pitch costs £85 a home game, and half the squad will occasionally have something better to do. Your first job is getting eleven players there.`,
        read: false
      },
      {
        id: 'grassroots-job',
        date: game.date,
        from: 'Personal diary',
        subject: `Your day job: ${state.managerJob.title}`,
        body: `You are still working ${state.managerJob.weeklyHours} hours a week for ${state.managerJob.employer}. ${state.managerJob.shiftPattern} may occasionally clash with training, recruitment or match preparation.`,
        read: false
      },
      {
        id: 'grassroots-recruitment',
        date: game.date,
        from: 'Club WhatsApp',
        subject: 'A few possible players',
        body: 'There is no scouting department. A few names have arrived through the pub, Facebook, five-a-side and people who know people. The reports are guesses.',
        read: false,
        link: { tab: 'transfers', label: 'VIEW LOCAL LEADS' }
      }
    ] : [
      {
        id: 'created-club-welcome',
        date: game.date,
        from: game.board?.members?.[0]?.name || 'Club Board',
        subject: `Welcome to ${club.name}`,
        body: `The new club has been registered in ${division.name}. Your full squad, professional contracts and first-season budget are ready.`,
        read: false
      },
      {
        id: 'created-club-squad',
        date: game.date,
        from: 'Director of Football',
        subject: 'Your first-team squad is ready',
        body: `${club.players.length} players have been registered. You can review the squad, contracts and starting eleven from the Team screen.`,
        read: false,
        link: { tab: 'team', label: 'VIEW TEAM' }
      }
    ];
    game.news = Array.isArray(game.news) ? game.news : [];
    game.news.unshift({
      date: game.date,
      headline: `${club.name} enter ${division.name}`,
      body: informal
        ? `A newly formed local club begins at tier ${tier} with a volunteer board and a part-time squad.`
        : `A newly formed professional club begins at tier ${tier} with a complete first-team squad.`,
      category: 'competition'
    });
    game.history = Array.isArray(game.history) ? game.history : [];
    game.history.push({
      date: game.date,
      type: 'club-formation',
      clubId: club.id,
      title: `${club.name} are formed`,
      text: `The created club enters ${division.name} at tier ${tier}.`
    });
    game.selectedTab = 'home';
    game.version = informal ? VERSION : '0.30.1-created-club';
    return game;
  }

  async function createCareer(manager, createdClub, createdPlayers, stadium, onProgress, region) {
    region = region || regionForCreatedClub(createdClub);
    const game = await FLGame.createStartYear(manager, placeholderId(region), 2026, onProgress);
    return applyCreatedClub(game, createdClub, createdPlayers, stadium, region);
  }

  function absenceReason(player, random) {
    const reasons = [
      ['work', `${player.dayJob.toLowerCase()} shift`],
      ['hangover', 'hungover and not answering properly'],
      ['transport', 'could not get a lift'],
      ['interest', 'said he has other plans'],
      ['family', 'family commitment'],
      ['uni', player.lifeStage === 'student' ? 'university commitment' : 'away for the weekend']
    ];
    const weighted = [
      ...Array(4).fill(reasons[0]),
      ...Array(Math.max(1, Math.round(player.socialRisk / 20))).fill(reasons[1]),
      ...Array(2).fill(reasons[2]),
      reasons[3], reasons[4], reasons[5]
    ];
    return pick(weighted, random)[1];
  }

  function clearAvailability(game) {
    const club = controlled(game);
    (club?.players || []).forEach(player => {
      player.available = true;
      player.unavailableReason = null;
    });
  }

  function prepareMatchday(game, fixture) {
    const state = ensure(game);
    const club = controlled(game);
    if (!state || !club || !fixture) return null;
    const key = fixture.id || `${fixture.date}-${fixture.home}-${fixture.away}`;
    if (state.matchday.preparedFixtures[key]) return state.matchday.preparedFixtures[key];

    const random = seeded(hash(`${game.meta?.seed}|${key}|availability`));
    const absent = [];
    (club.players || []).forEach(player => {
      player.available = true;
      player.unavailableReason = null;
      const absenceChance = clamp(
        0.025 +
        (100 - player.reliability) * 0.0048 +
        (100 - player.commitment) * 0.0018 +
        (100 - player.workFlexibility) * 0.0012 +
        player.socialRisk * 0.0007 +
        Number(state.matchday.preparation?.[key]?.absenceBoost || 0),
        0.02,
        0.52
      );
      if (random() < absenceChance) {
        player.available = false;
        player.unavailableReason = absenceReason(player, random);
        player.availabilityHistory.unshift({ date: fixture.date, available: false, reason: player.unavailableReason });
        absent.push(player);
      }
    });

    let available = (club.players || []).filter(player => player.available !== false);
    if (available.length < 11) {
      absent
        .sort((a, b) => b.reliability - a.reliability)
        .slice(0, 11 - available.length)
        .forEach(player => {
          player.available = true;
          player.unavailableReason = null;
        });
      available = (club.players || []).filter(player => player.available !== false);
    }

    const summary = {
      fixtureId: key,
      date: fixture.date,
      available: available.length,
      absent: absent
        .filter(player => player.available === false)
        .map(player => ({ playerId: player.id, name: player.name, reason: player.unavailableReason }))
    };
    state.matchday.preparedFixtures[key] = summary;

    if (summary.absent.length) {
      game.inbox.unshift({
        id: `availability-${key}`,
        date: fixture.date,
        from: 'Club WhatsApp',
        subject: `Matchday availability: ${summary.absent.length} missing`,
        body: summary.absent.map(row => `${row.name}: ${row.reason}.`).join(' '),
        read: false,
        link: { tab: 'team', label: 'PICK THE TEAM' }
      });
    } else {
      game.inbox.unshift({
        id: `availability-${key}`,
        date: fixture.date,
        from: 'Club WhatsApp',
        subject: 'Everyone says they are coming',
        body: 'For once, the entire registered squad has confirmed availability. Whether they all arrive on time is another matter.',
        read: false
      });
    }
    game.teamManagement = null;
    return summary;
  }

  function settleMatchday(game, fixture) {
    const state = ensure(game);
    const club = controlled(game);
    if (!state || !club || !fixture?.played) return null;
    const key = fixture.id || `${fixture.date}-${fixture.home}-${fixture.away}`;
    if (state.matchday.settledFixtures[key]) return state.matchday.settledFixtures[key];

    const random = seeded(hash(`${game.meta?.seed}|${key}|cash`));
    const home = fixture.home === club.id;
    const attendance = home ? Math.max(8, Math.round(18 + club.reputation * 1.8 + random() * 55)) : 0;
    const gateReceipts = home ? attendance * 3 : 0;
    const playerSubs = Math.round(55 + random() * 45);
    const sponsorTin = random() < 0.16 ? 25 + Math.round(random() * 55) : 0;
    const income = gateReceipts + playerSubs + sponsorTin;
    const available = (club.players || []).filter(player => player.available !== false).slice(0, 14);
    const expenses = Math.round(
      (home ? Number(game.finances.pitchFee || 85) + Number(game.finances.refereeFee || 45) : 40 + random() * 45) +
      available.reduce((total, player) => total + Number(player.matchExpense || 0), 0)
    );
    const net = income - expenses;
    game.finances.income = Number(game.finances.income || 0) + income;
    game.finances.expenses = Number(game.finances.expenses || 0) + expenses;
    game.finances.balance = Number(game.finances.balance || 0) + net;

    const summary = { fixtureId: key, date: fixture.date, home, attendance, income, expenses, net };
    state.matchday.settledFixtures[key] = summary;
    game.inbox.unshift({
      id: `grassroots-cash-${key}`,
      date: game.date,
      from: game.board?.members?.[0]?.name || 'Chairman',
      subject: `${home ? 'Home-match' : 'Away-match'} money: ${net >= 0 ? '+' : '−'}£${Math.abs(net)}`,
      body: `${home ? `${attendance} people came through the gate. ` : ''}The club took £${income} and spent £${expenses} on ${home ? 'the pitch, referee and player expenses' : 'travel and player expenses'}. The balance is now £${Math.round(game.finances.balance)}.`,
      read: false
    });
    clearAvailability(game);
    return summary;
  }


  function dateDistance(from, to) {
    const a = new Date(`${from}T12:00:00Z`);
    const b = new Date(`${to}T12:00:00Z`);
    return Math.round((b - a) / 86400000);
  }

  function closeClubSpell(player, date) {
    player.clubHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
    const spell = [...player.clubHistory].reverse().find(row => row.to === 'Present');
    if (spell) spell.to = date;
  }

  function openClubSpell(player, club, date) {
    player.clubHistory = Array.isArray(player.clubHistory) ? player.clubHistory : [];
    player.clubHistory.push({ club: club.name, clubId: club.id, from: date, to: 'Present', apps: 0, goals: 0 });
  }

  function lifeMessage(game, player, subject, body, type, extra = {}) {
    const state = ensure(game);
    const row = { date: game.date, playerId: player.id, player: player.name, type, text: body, ...extra };
    state.playerLives.history.unshift(row);
    state.playerLives.history = state.playerLives.history.slice(0, 160);
    player.lifeEventHistory = Array.isArray(player.lifeEventHistory) ? player.lifeEventHistory : [];
    player.lifeEventHistory.unshift(row);
    player.lifeEventHistory = player.lifeEventHistory.slice(0, 40);
    game.inbox.unshift({
      id: `grass-life-${type}-${player.id}-${game.date}-${hash(body)}`,
      date: game.date,
      from: 'Club WhatsApp',
      subject,
      body,
      read: false,
      link: { tab: 'squad', label: 'VIEW SQUAD' }
    });
    game.history.push({
      date: game.date,
      type: 'grassroots-player-life',
      clubId: game.controlledClubId,
      playerId: player.id,
      title: subject,
      text: body
    });
    return row;
  }

  function localDestination(game, player, requireDifferentRegion = false) {
    const club = controlled(game);
    const options = (game.clubs || []).filter(candidate => {
      if (!candidate || candidate.id === club?.id || candidate.leagueActive === false) return false;
      const division = window.FLPyramid?.divisionForClub?.(game, candidate.id);
      const tier = Number(division?.tier || candidate.tier || 99);
      if (tier < 11 || tier > 15) return false;
      if (requireDifferentRegion && (candidate.subregion || candidate.countyRegion) === (club?.subregion || club?.countyRegion)) return false;
      return Array.isArray(candidate.players);
    });
    if (!options.length) return null;
    const random = seeded(hash(`${game.meta?.seed}|${game.date}|${player.id}|destination`));
    return pick(options, random);
  }

  function movePlayer(game, player, destination, reason, subject) {
    const club = controlled(game);
    if (!club || !player || !destination) return false;
    club.players = (club.players || []).filter(row => row.id !== player.id);
    closeClubSpell(player, game.date);
    player.lastClubId = club.id;
    player.lastClub = club.name;
    player.clubId = destination.id;
    player.status = 'active';
    player.squadStatus = 'Local player';
    player.grassrootsInactive = false;
    openClubSpell(player, destination, game.date);
    destination.players = Array.isArray(destination.players) ? destination.players : [];
    destination.players.push(player);
    game.teamManagement = null;
    lifeMessage(game, player, subject, `${player.name} has left ${club.name} ${reason} and registered with ${destination.name}.`, 'move', { destinationClubId: destination.id });
    return true;
  }

  function makeInactive(game, player, reason, subject) {
    const club = controlled(game);
    if (!club || !player) return false;
    club.players = (club.players || []).filter(row => row.id !== player.id);
    closeClubSpell(player, game.date);
    player.lastClubId = club.id;
    player.lastClub = club.name;
    player.clubId = null;
    player.status = 'inactive';
    player.squadStatus = 'Not currently playing';
    player.grassrootsInactive = true;
    player.grassrootsInactiveReason = reason;
    player.grassrootsInactiveDate = game.date;
    game.freeAgents = Array.isArray(game.freeAgents) ? game.freeAgents : [];
    if (!game.freeAgents.some(row => row.id === player.id)) game.freeAgents.push(player);
    game.teamManagement = null;
    lifeMessage(game, player, subject, `${player.name} has stopped playing for ${club.name}: ${reason}.`, 'inactive', { reason });
    return true;
  }

  function applyLifeEvent(game, player, type) {
    const club = controlled(game);
    if (!club || !player || !club.players?.some(row => row.id === player.id)) return false;
    const random = seeded(hash(`${game.meta?.seed}|${game.date}|${player.id}|${type}`));
    if (['university', 'move-away', 'quit'].includes(type) && club.players.length <= 14) return false;

    if (type === 'university') {
      const destination = localDestination(game, player, true);
      if (destination) return movePlayer(game, player, destination, 'after moving away for university', `${player.name} is leaving for university`);
      return makeInactive(game, player, 'he is moving away for university and cannot keep travelling back', `${player.name} is leaving for university`);
    }
    if (type === 'move-away') {
      const destination = localDestination(game, player, true);
      if (destination) return movePlayer(game, player, destination, 'after moving for work or family reasons', `${player.name} is moving away`);
      return makeInactive(game, player, 'he has moved too far away to continue', `${player.name} is moving away`);
    }
    if (type === 'new-job') {
      const oldJob = player.dayJob;
      player.dayJob = pick(jobs.filter(job => job !== oldJob), random);
      player.workFlexibility = clamp(player.workFlexibility - 8 - Math.floor(random() * 20), 8, 98);
      player.reliability = clamp(player.reliability - Math.floor(random() * 8), 10, 99);
      player.commitment = clamp(player.commitment - Math.floor(random() * 6), 10, 99);
      lifeMessage(game, player, `${player.name} has changed jobs`, `${player.name} has left his job as ${String(oldJob || 'a local worker').toLowerCase()} and is now working as ${player.dayJob.toLowerCase()}. The hours are less flexible, so his availability may suffer.`, 'new-job');
      return true;
    }
    if (type === 'lost-interest') {
      player.commitment = clamp(player.commitment - 12 - Math.floor(random() * 16), 5, 99);
      player.reliability = clamp(player.reliability - 4 - Math.floor(random() * 10), 5, 99);
      if (player.commitment <= 18 && club.players.length > 14) return makeInactive(game, player, 'he has lost interest and does not want to commit his weekends anymore', `${player.name} has packed it in`);
      lifeMessage(game, player, `${player.name} is losing interest`, `${player.name} says football is becoming difficult to fit around the rest of his life. His commitment has fallen to ${player.commitment}%.`, 'lost-interest');
      return true;
    }
    if (type === 'quit') {
      return makeInactive(game, player, 'a new job and family commitments mean he no longer wants to play regularly', `${player.name} has quit local football`);
    }
    if (type === 'family') {
      player.workFlexibility = clamp(player.workFlexibility - 4 - Math.floor(random() * 10), 10, 98);
      player.commitment = clamp(player.commitment - 3 - Math.floor(random() * 8), 10, 99);
      lifeMessage(game, player, `${player.name}'s circumstances have changed`, `${player.name} has more family commitments now. He is staying registered but expects to miss more Saturdays.`, 'family');
      return true;
    }
    return false;
  }

  function progressHiddenTalent(game) {
    const state = ensure(game);
    const club = controlled(game);
    if (!state || !club) return [];
    const reveals = [];
    (club.players || []).forEach(player => {
      applyPartTimeProfile(player, game);
      const appearances = Number(player.appearances || 0);
      const random = seeded(hash(`${game.meta?.seed}|${game.date}|${player.id}|talent-progress`));
      const gain = Math.max(1, Math.round((player.trainingAttendance / 100) * 5 + Math.min(4, appearances / 3) + random() * 3));
      const before = Number(player.talentKnowledge || 0);
      player.talentKnowledge = clamp(before + gain, 0, 100);
      const thresholds = player.latentAbilityBonus >= 3 ? [50, 100] : [];
      thresholds.forEach(threshold => {
        const revealId = `${player.id}-${threshold}`;
        if (before < threshold && player.talentKnowledge >= threshold && !state.playerLives.talentReveals.includes(revealId)) {
          state.playerLives.talentReveals.push(revealId);
          const targetBonus = Math.min(player.latentAbilityBonus, Math.floor((player.latentAbilityBonus * threshold) / 100));
          const improvement = Math.max(0, targetBonus - Number(player.appliedTalentBonus || 0));
          if (improvement > 0) {
            player.ability = clamp(Number(player.ability || 25) + improvement, 18, 78);
            player.ceiling = clamp(Math.max(Number(player.ceiling || player.ability), player.ability + Math.ceil(player.latentAbilityBonus / 2)), player.ability, 82);
            player.potential = Math.max(Number(player.potential || 0), player.ceiling);
            player.appliedTalentBonus = targetBonus;
          }
          const subject = threshold >= 100 ? `${player.name} was the hidden gem` : `${player.name} might actually be decent`;
          const body = `${player.name} has looked better the more you have seen him. Training and match evidence now suggest there is more ability there than the first local reports showed${improvement ? `; his assessed ability has risen by ${improvement}` : ''}.`;
          lifeMessage(game, player, subject, body, 'talent-reveal', { threshold, improvement });
          reveals.push({ playerId: player.id, threshold, improvement });
        }
      });
    });
    return reveals;
  }

  function processPlayerLives(game) {
    const state = ensure(game);
    const club = controlled(game);
    if (!state || !club || !useLocalRecruitment(game)) return [];
    const month = String(game.date || '').slice(0, 7);
    if (state.playerLives.lastProcessedMonth === month) return [];
    state.playerLives.lastProcessedMonth = month;
    const seasonKey = Number(month.slice(5, 7)) >= 7 ? month.slice(0, 4) : String(Number(month.slice(0, 4)) - 1);
    if (state.playerLives.seasonKey !== seasonKey) {
      state.playerLives.seasonKey = seasonKey;
      state.playerLives.seasonEventCount = 0;
    }

    const events = [];
    progressHiddenTalent(game);
    const monthNumber = Number(month.slice(5, 7));
    const players = [...(club.players || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const player of players) {
      if (events.length >= 2 || Number(state.playerLives.seasonEventCount || 0) >= 9) break;
      const random = seeded(hash(`${game.meta?.seed}|${month}|${player.id}|life-roll`));
      let chance = 0.003 + (100 - player.commitment) * 0.00022 + (100 - player.reliability) * 0.00008;
      if (player.lifeStage === 'student' && [8, 9].includes(monthNumber)) chance += 0.05;
      if (player.lifeStage === 'early-career') chance += 0.003;
      if (player.lifeStage === 'family-and-work') chance += 0.004;
      if (random() >= clamp(chance, 0.002, 0.09)) continue;

      let type = 'new-job';
      if (player.lifeStage === 'student' && [8, 9].includes(monthNumber) && random() < 0.68) type = 'university';
      else {
        const roll = random();
        if (roll < 0.28) type = 'new-job';
        else if (roll < 0.48) type = 'lost-interest';
        else if (roll < 0.65) type = 'family';
        else if (roll < 0.82) type = 'move-away';
        else type = 'quit';
      }
      if (applyLifeEvent(game, player, type)) {
        events.push({ playerId: player.id, type });
        state.playerLives.seasonEventCount += 1;
      }
    }

    const inactive = (game.freeAgents || []).filter(player => player.grassrootsInactive && player.lastClubId === club.id);
    if (club.players.length < 23 && inactive.length) {
      const random = seeded(hash(`${game.meta?.seed}|${month}|return-roll`));
      const returning = inactive.find(player => random() < clamp(0.008 + player.commitment * 0.00025, 0.01, 0.04));
      if (returning) {
        game.freeAgents = game.freeAgents.filter(player => player.id !== returning.id);
        returning.clubId = club.id;
        returning.status = 'active';
        returning.squadStatus = 'Backup';
        returning.grassrootsInactive = false;
        delete returning.grassrootsInactiveReason;
        openClubSpell(returning, club, game.date);
        club.players.push(returning);
        lifeMessage(game, returning, `${returning.name} fancies playing again`, `${returning.name} has messaged the group saying he misses it and wants to register again. He has returned to the squad.`, 'return');
        events.push({ playerId: returning.id, type: 'return' });
      }
    }
    return events;
  }

  function nextFixture(game) {
    return (game.fixtures || [])
      .filter(row => !row.played && (row.home === game.controlledClubId || row.away === game.controlledClubId) && row.date >= game.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
  }

  function queueWorkClash(game, fixture, force = false) {
    const state = ensure(game);
    if (!state || !fixture || !state.managerJob.active) return null;
    const key = fixture.id || `${fixture.date}-${fixture.home}-${fixture.away}`;
    if (state.work.checkedFixtures[key] || state.work.pending.some(row => row.fixtureId === key && !row.resolved)) return null;
    const days = dateDistance(game.date, fixture.date);
    if (!force && (days < 1 || days > 3)) return null;
    const random = seeded(hash(`${game.meta?.seed}|${key}|work-clash`));
    const patternRisk = /Saturday|Rotating|Mixed/i.test(state.managerJob.shiftPattern) ? 0.12 : 0.04;
    const chance = clamp(patternRisk + (100 - state.managerJob.flexibility) * 0.0032 + state.managerJob.stress * 0.0012, 0.04, 0.42);
    state.work.checkedFixtures[key] = true;
    if (!force && random() >= chance) return null;
    const opponentId = fixture.home === game.controlledClubId ? fixture.away : fixture.home;
    const opponent = (game.clubs || []).find(club => club.id === opponentId);
    const decision = {
      id: `work-clash-${key}`,
      type: 'grassroots-work',
      date: game.date,
      fixtureId: key,
      fixtureDate: fixture.date,
      opponent: opponent?.name || 'the next opponents',
      title: 'Work has put you on the rota',
      body: `${state.managerJob.employer} expects you at work close to the match against ${opponent?.name || 'the next opponents'}. You cannot prepare properly and cover the shift without somebody giving way.`,
      targetTab: 'manager',
      blocking: true,
      resolved: false
    };
    state.work.pending.push(decision);
    state.managerJob.footballClashes += 1;
    game.inbox.unshift({
      id: `inbox-${decision.id}`,
      date: game.date,
      from: 'Personal diary',
      subject: decision.title,
      body: `${decision.body} Open the Day Job page and decide what to do before time can continue.`,
      read: false,
      link: { tab: 'manager', label: 'MAKE DECISION' }
    });
    return decision;
  }

  function nextBlocking(game) {
    const state = ensure(game);
    return state?.work?.pending?.find(row => !row.resolved && row.blocking !== false) || null;
  }

  function resolveDecision(game, id, choice) {
    const state = ensure(game);
    const decision = state?.work?.pending?.find(row => row.id === id && !row.resolved);
    if (!decision) return { ok: false, message: 'That work decision is no longer active.' };
    const job = state.managerJob;
    let message = '';
    let prepPenalty = 0;
    if (choice === 'football') {
      if (job.daysUsed < job.annualLeave) {
        job.daysUsed += 1;
        job.stress = clamp(job.stress + 7, 0, 100);
        job.employerPatience = clamp(job.employerPatience - 7, 0, 100);
        job.employmentSecurity = clamp(job.employmentSecurity - 4, 0, 100);
        message = `You used a day of annual leave and kept control of the football preparation. ${job.annualLeave - job.daysUsed} leave days remain.`;
      } else {
        job.missedShifts += 1;
        job.stress = clamp(job.stress + 14, 0, 100);
        job.employerPatience = clamp(job.employerPatience - 18, 0, 100);
        job.employmentSecurity = clamp(job.employmentSecurity - 14, 0, 100);
        message = 'You had no annual leave left and missed the shift. The team is prepared, but your employer is furious.';
      }
      game.boardConfidence = clamp(Number(game.boardConfidence || 50) + 2, 0, 100);
    } else if (choice === 'work') {
      prepPenalty = 0.09;
      job.stress = clamp(job.stress - 3, 0, 100);
      job.employerPatience = clamp(job.employerPatience + 5, 0, 100);
      job.employmentSecurity = clamp(job.employmentSecurity + 4, 0, 100);
      game.boardConfidence = clamp(Number(game.boardConfidence || 50) - 2, 0, 100);
      message = 'You covered the shift. The chairman handled the football side, but preparation and player confirmations were rushed.';
    } else if (choice === 'chairman') {
      prepPenalty = 0.045;
      job.stress = clamp(job.stress + 2, 0, 100);
      job.employerPatience = clamp(job.employerPatience - 1, 0, 100);
      const chairman = game.board?.members?.[0];
      if (chairman) chairman.approval = clamp(Number(chairman.approval || 60) - 2, 0, 100);
      message = `${game.board?.members?.[0]?.name || 'The chairman'} agreed to take training and chase the players. It keeps both worlds moving, but he cannot keep doing everything.`;
    } else return { ok: false, message: 'Choose work, football or ask the chairman to cover.' };

    state.matchday.preparation[decision.fixtureId] = { choice, absenceBoost: prepPenalty, date: game.date };
    decision.resolved = true;
    decision.choice = choice;
    decision.resolvedDate = game.date;
    decision.result = message;
    state.work.history.unshift({ date: game.date, fixtureId: decision.fixtureId, choice, text: message });
    state.events.unshift({ date: game.date, type: 'job', text: message });
    game.inbox.unshift({ id: `work-result-${decision.id}`, date: game.date, from: 'Personal diary', subject: 'Work clash decided', body: message, read: false });

    if (job.active && (job.employerPatience <= 8 || job.employmentSecurity <= 8)) {
      job.active = false;
      job.lostDate = game.date;
      job.weeklyPay = 0;
      const loss = `${job.employer} has ended your employment after repeated football clashes. You now have more time for the club, but no weekly income from the job.`;
      state.events.unshift({ date: game.date, type: 'job', text: loss });
      game.inbox.unshift({ id: `job-lost-${game.date}`, date: game.date, from: job.employer, subject: 'Your employment has ended', body: loss, read: false });
      game.history.push({ date: game.date, type: 'manager-life', title: 'Manager loses day job', text: loss });
      message += ` ${loss}`;
    }
    return { ok: true, message };
  }

  function dailyTick(game, previousDate) {
    const state = ensure(game);
    if (!state) return;

    const previousFixture = (game.fixtures || []).find(fixture =>
      fixture.date === previousDate &&
      fixture.played &&
      (fixture.home === game.controlledClubId || fixture.away === game.controlledClubId)
    );
    if (previousFixture) settleMatchday(game, previousFixture);

    refreshCandidates(game, false);
    if (String(game.date).slice(8) === '01') processPlayerLives(game);
    const upcoming = nextFixture(game);
    if (upcoming) queueWorkClash(game, upcoming, false);
    const fixture = (game.fixtures || []).find(row =>
      row.date === game.date &&
      !row.played &&
      (row.home === game.controlledClubId || row.away === game.controlledClubId)
    );
    if (fixture) prepareMatchday(game, fixture);

    if (String(game.date).slice(8) === '01') {
      const random = seeded(hash(`${game.meta?.seed}|${game.date}|job`));
      state.managerJob.stress = clamp(state.managerJob.stress - 4 + Math.floor(random() * 10), 0, 100);
      if (random() < 0.18) {
        const text = pick([
          `Your manager at ${state.managerJob.employer} has changed next week's shifts.`,
          `${state.managerJob.title} work has been unusually busy this month.`,
          'You have used another evening of annual leave for football.',
          'The chairman covered training because you were kept late at work.'
        ], random);
        state.events.unshift({ date: game.date, type: 'job', text });
        game.inbox.unshift({
          id: `job-${game.date}`,
          date: game.date,
          from: 'Personal diary',
          subject: 'Work and football',
          body: text,
          read: false
        });
      }
    }
  }

  function annualUpdate(game) {
    const state = ensure(game);
    if (!state) return;
    game.finances.transferBudget = useLocalRecruitment(game) ? 0 : Number(game.finances.transferBudget || 0);
    game.finances.weeklyWageBudget = useLocalRecruitment(game) ? 0 : Number(game.finances.weeklyWageBudget || 0);
    game.finances.balance = Math.max(-250, Number(game.finances.balance) || 0);
    state.managerJob.stress = clamp(state.managerJob.stress - 12, 0, 100);
    state.playerLives.seasonEventCount = 0;
    (controlled(game)?.players || []).forEach(player => applyPartTimeProfile(player, game));
    progressHiddenTalent(game);
    refreshCandidates(game, true);
  }

  function signCandidate(game, id) {
    const state = ensure(game);
    const club = controlled(game);
    const candidate = state?.recruitment?.candidates?.find(row => row.id === id);
    if (!candidate || !club) return { ok: false, message: 'That local lead is no longer available.' };
    if (!useLocalRecruitment(game)) return { ok: false, message: 'The club has outgrown informal registrations and must use the normal transfer market.' };

    const random = seeded(hash(`${game.meta?.seed}|${candidate.id}|sign`));
    const template = club.players[club.players.length - 1] || {};
    const player = playerBase({ ...template }, club.players.length, club, random, game);
    player.id = `grass-signing-${hash(candidate.id)}`;
    player.name = candidate.name;
    const [firstName, ...lastName] = candidate.name.split(' ');
    player.firstName = firstName;
    player.lastName = lastName.join(' ');
    player.age = candidate.age;
    player.position = candidate.position;
    player.positions = [candidate.position];
    player.ability = candidate.actualAbility + (candidate.hiddenGem ? 4 : 0);
    player.ceiling = clamp(player.ability + 2 + Math.floor(random() * 14) + (candidate.hiddenGem ? 8 : 0), player.ability, 70);
    player.potential = player.ceiling;
    player.reliability = candidate.reliability;
    player.commitment = candidate.commitment;
    player.dayJob = candidate.dayJob;
    player.matchExpense = candidate.matchExpense;
    applyPartTimeProfile(player, game);
    club.players.push(player);
    state.recruitment.candidates = state.recruitment.candidates.filter(row => row.id !== id);
    state.recruitment.history.unshift({ date: game.date, playerId: player.id, name: player.name, source: candidate.source });
    game.inbox.unshift({
      id: `grass-sign-${player.id}`,
      date: game.date,
      from: game.board?.members?.[0]?.name || 'Chairman',
      subject: `${player.name} has registered`,
      body: `${player.name} came through ${candidate.source}. He wants £${player.matchExpense} for travel and match expenses when he plays. The original report said ${candidate.reportedMin}–${candidate.reportedMax}; training suggests he is around ${player.ability}.`,
      read: false
    });
    game.history.push({
      date: game.date,
      type: 'grassroots-signing',
      clubId: club.id,
      title: `${player.name} joins ${club.name}`,
      text: `The part-time ${player.position} signs through ${candidate.source}.`
    });
    return { ok: true, message: `${player.name} has joined the squad.` };
  }

  function recruitmentView(game) {
    const state = ensure(game);
    setupRecruitment(game);
    const rows = state?.recruitment?.candidates || [];
    const club = controlled(game);
    return `<section class="page grassroots-recruitment-page">
      <div class="page-heading"><span>GRASSROOTS RECRUITMENT</span><h1>Who Knows a Lad?</h1><p>There is no scouting network at ${club.name}. These are local rumours, messages and favours. Ability ranges are deliberately unreliable.</p></div>
      <div class="grassroots-money-strip"><div><span>TRANSFER BUDGET</span><strong>£0</strong></div><div><span>REGISTRATION</span><strong>FREE</strong></div><div><span>PAYMENT</span><strong>TRAVEL / MATCH EXPENSES</strong></div><div><span>LOCAL LEADS</span><strong>${rows.length}</strong></div></div>
      <div class="grassroots-lead-grid">${rows.map(candidate => `<article class="panel grassroots-lead"><div class="panel-head">${candidate.source.toUpperCase()}</div><span>${candidate.position} · AGE ${candidate.age}</span><h2>${candidate.name}</h2><p>${candidate.dayJob}. The person recommending him thinks he is somewhere between <b>${candidate.reportedMin}</b> and <b>${candidate.reportedMax}</b>.</p><div><small>Reported reliability</small><strong>${candidate.reliability}%</strong></div><div><small>Match expenses</small><strong>£${candidate.matchExpense}</strong></div><button data-grassroots-sign="${candidate.id}">ASK HIM TO REGISTER</button></article>`).join('') || '<section class="panel"><div class="panel-body">No useful local leads this month.</div></section>'}</div>
      <section class="panel grassroots-recruitment-note"><div class="panel-head">HOW THIS MARKET WORKS</div><p>Professional transfers remain visible in the football world, but your club cannot pay fees or formal wages at this level. New names arrive monthly through Facebook, the pub, five-a-side, teammates, local referees and opponents.</p></section>
    </section>`;
  }

  function boardView(game) {
    const state = ensure(game);
    const club = controlled(game);
    const chairman = game.board?.members?.[0] || chairmanFor(club);
    return `<section class="page grassroots-board-page">
      <div class="page-heading"><span>THE ENTIRE BOARD</span><h1>${chairman.name}</h1><p>Chairman, secretary, treasurer, kit man and usually the person unlocking the gate.</p></div>
      <div class="grassroots-board-grid">
        <section class="panel grassroots-chairman-card"><div class="panel-head">UNPAID VOLUNTEER CHAIRMAN</div><div class="grassroots-chairman-monogram">${chairman.name.split(' ').map(part => part[0]).join('')}</div><h2>${chairman.name}</h2><strong>${chairman.type}</strong><p>“I started this because I fancied having a team. Just do not spend money we haven't got, and try not to make me ring the league again.”</p></section>
        <section class="panel"><div class="panel-head">CLUB REALITY</div><div class="record-list"><div><span>Board members</span><strong>1</strong></div><div><span>Paid directors</span><strong>0</strong></div><div><span>Club balance</span><strong>£${Number(game.finances?.balance || 0).toLocaleString('en-GB')}</strong></div><div><span>Transfer budget</span><strong>£0</strong></div><div><span>Pitch fee</span><strong>£${game.finances?.pitchFee || 85} per home match</strong></div><div><span>Manager wage</span><strong>Volunteer</strong></div><div><span>Current level</span><strong>Tier ${currentTier(game)}</strong></div></div></section>
        <section class="panel"><div class="panel-head">THIS SEASON'S OBJECTIVES</div><div class="objective-list">${(game.board?.requests || []).map(request => `<article><header><span>${request.category}</span></header><h3>${request.title}</h3><p>${request.detail}</p><div class="objective-progress"><i><b style="width:${request.progress}%"></b></i><strong>${request.progress}%</strong></div></article>`).join('')}</div></section>
        <section class="panel"><div class="panel-head">CHAIRMAN'S NOTES</div><div class="club-timeline">${(game.board?.log || []).slice().reverse().map(row => `<article><time>${row.date}</time><div><p>${row.text}</p></div></article>`).join('')}</div></section>
        <section class="panel grassroots-player-life"><div class="panel-head">PLAYER LIVES <span>WORK, UNIVERSITY, MOVES AND QUITTING</span></div><div class="club-timeline">${(state?.playerLives?.history || []).slice(0, 30).map(row => `<article><time>${row.date}</time><div><strong>${row.player || ''}</strong><p>${row.text}</p></div></article>`).join('') || '<p class="empty-note">Nobody has left, moved away or suddenly rediscovered his ability yet.</p>'}</div></section>
      </div>
    </section>`;
  }

  function dayJobView(game) {
    const state = ensure(game);
    const job = state.managerJob;
    const pending = nextBlocking(game);
    const decisionPanel = pending ? `<section class="panel grassroots-decision-panel"><div class="panel-head">DECISION REQUIRED <span>TIME IS STOPPED</span></div><div class="grassroots-decision-body"><h2>${pending.title}</h2><p>${pending.body}</p><div class="grassroots-decision-actions"><button data-grassroots-decision="${pending.id}" data-choice="football">PUT FOOTBALL FIRST</button><button data-grassroots-decision="${pending.id}" data-choice="work">COVER THE SHIFT</button><button data-grassroots-decision="${pending.id}" data-choice="chairman">ASK THE CHAIRMAN</button></div><div class="grassroots-decision-explain"><span><b>Football first:</b> best preparation, but uses leave or damages your job.</span><span><b>Cover the shift:</b> protects the job, but creates more matchday uncertainty.</span><span><b>Ask the chairman:</b> compromises both and adds to his workload.</span></div></div></section>` : '';
    return `<div class="living-two-column grassroots-day-job-page">
      ${decisionPanel}
      <section class="panel"><div class="panel-head">YOUR DAY JOB <span>FOOTBALL IS NOT PAYING THE BILLS</span></div><div class="manager-facts"><div><span>Status</span><strong>${job.active ? 'Employed' : 'Not currently employed'}</strong></div><div><span>Job</span><strong>${job.title}</strong></div><div><span>Employer</span><strong>${job.employer}</strong></div><div><span>Hours</span><strong>${job.active ? `${job.weeklyHours} per week` : '—'}</strong></div><div><span>Shifts</span><strong>${job.shiftPattern}</strong></div><div><span>Flexibility</span><strong>${job.flexibility}%</strong></div><div><span>Weekly pay</span><strong>£${job.weeklyPay}</strong></div><div><span>Annual leave</span><strong>${Math.max(0, job.annualLeave - job.daysUsed)} days left</strong></div><div><span>Employer patience</span><strong>${job.employerPatience}%</strong></div><div><span>Employment security</span><strong>${job.employmentSecurity}%</strong></div><div><span>Work stress</span><strong>${job.stress}%</strong></div><div><span>Football clashes</span><strong>${job.footballClashes}</strong></div></div><p class="board-influence-note">Work clashes can now stop time before a fixture. Putting football first protects preparation but may cost annual leave or eventually your job. Covering the shift protects employment but makes player availability and preparation less reliable.</p></section>
      <section class="panel"><div class="panel-head">WORK / FOOTBALL DIARY</div><div class="club-timeline">${state.events.filter(row => row.type === 'job').slice(0, 40).map(row => `<article><time>${row.date}</time><div><p>${row.text}</p></div></article>`).join('') || '<p class="empty-note">No major work clash has happened yet.</p>'}</div></section>
    </div>`;
  }

  return {
    VERSION,
    regionForCreatedClub,
    placeholderId,
    divisionId,
    divisionName,
    useLocalRecruitment,
    isManagedGrassrootsClub,
    createCareer,
    applyCreatedClub,
    ensure,
    dailyTick,
    annualUpdate,
    processPlayerLives,
    progressHiddenTalent,
    applyLifeEvent,
    queueWorkClash,
    nextBlocking,
    resolveDecision,
    prepareMatchday,
    settleMatchday,
    refreshCandidates,
    signCandidate,
    recruitmentView,
    boardView,
    dayJobView
  };
})();
