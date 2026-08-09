(() => {
  const source = window.FLQuickPlayTeams;
  const names = window.FLOriginalNames;
  if (!source || !names) return;
  source.LEAGUES.forEach(league => {
    league.name = names.leagueAliases[league.name] || league.name;
    if (league.id === 'div1') league.shortName = 'Premier League';
    if (league.id === 'div2') league.shortName = 'Championship';
    if (league.id === 'div3') league.shortName = 'League One';
    if (league.id === 'div4') league.shortName = 'League Two';
  });
  Object.values(source.TEAMS).flat().forEach(team => {
    const special = {'woolwich-arsenal':'Arsenal','milton-keynes-dons-fc':'Milton Keynes Dons','sheffield-wednesday':'Sheffield Wednesday','stockport-county':'Stockport County'};
    const original = special[team.id] || names.originalClubName(team.name);
    if (!original || original === team.name) return;
    team.fictionalName = team.name;
    team.name = original;
    team.shortName = original;
    team.abbreviation = original.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 4).toUpperCase();
  });
})();
