(function v0266MatchNewsFixes(){
  'use strict';

  const PATCH_VERSION = '0.26.6';

  function gameNow(){
    return window.FLCurrentGame || null;
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function save(game, delay){
    if(!game || !window.FLSave) return;
    if(typeof FLSave.saveSoon === 'function') FLSave.saveSoon(game, Number.isFinite(delay) ? delay : 50);
    else if(typeof FLSave.save === 'function') FLSave.save(game);
  }

  function currentYear(game){
    return Number(String(game?.date || '1888').slice(0, 4)) || 1888;
  }

  function seasonStart(value){
    const match = String(value || '').match(/\d{4}/);
    return match ? Number(match[0]) : null;
  }

  function clubById(game, id){
    if(!game || !id) return null;
    try{
      return window.FLGame?.club?.(game, id) || safeArray(game.clubs).find(club => club.id === id) || null;
    }catch(_){
      return safeArray(game.clubs).find(club => club.id === id) || null;
    }
  }

  function managerName(game){
    const first = String(game?.manager?.firstName || '').trim();
    const last = String(game?.manager?.lastName || '').trim();
    return `${first} ${last}`.trim() || 'The manager';
  }

  function hasNews(game, id, headline){
    return safeArray(game?.news).some(row => row?.id === id || (headline && row?.headline === headline)) ||
      safeArray(game?.history).some(row => row?.id === id || (headline && row?.title === headline));
  }

  function addNews(game, story){
    if(!game || !story?.id || !story?.headline || hasNews(game, story.id, story.headline)) return false;
    game.news = safeArray(game.news);
    game.history = safeArray(game.history);
    const date = story.date || game.date;
    const body = story.body || story.text || story.headline;
    game.news.unshift({
      id: story.id,
      date,
      headline: story.headline,
      body,
      text: body,
      category: story.category || 'football news',
      matchRecordId: story.matchRecordId || null,
      clubId: story.clubId || null
    });
    game.history.push({
      id: story.id,
      date,
      type: 'news',
      category: story.category || 'football news',
      title: story.headline,
      text: body,
      matchRecordId: story.matchRecordId || null,
      clubId: story.clubId || null
    });
    return true;
  }

  function playerNameForGoal(game, record, event){
    if(event?.player) return event.player;
    const sideClub = clubById(game, event?.side === 'away' ? record.awayId : record.homeId);
    const found = safeArray(sideClub?.players).find(player => player.id === event?.playerId);
    return found?.name || 'an unnamed scorer';
  }

  function rivalryMatch(home, away){
    if(!home || !away) return false;
    const refs = value => safeArray(value).map(String);
    const homeRefs = [home.rival, ...refs(home.rivals), ...refs(home.rivalIds)].filter(Boolean);
    const awayRefs = [away.rival, ...refs(away.rivals), ...refs(away.rivalIds)].filter(Boolean);
    return homeRefs.includes(away.id) || homeRefs.includes(away.name) || awayRefs.includes(home.id) || awayRefs.includes(home.name);
  }

  function wasComeback(record, winnerSide){
    return safeArray(record?.events).some(event => {
      const homeGoals = Number(event?.homeGoals);
      const awayGoals = Number(event?.awayGoals);
      if(!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return false;
      return winnerSide === 'home' ? homeGoals < awayGoals : awayGoals < homeGoals;
    });
  }

  function lateWinner(record, winnerSide){
    const goals = safeArray(record?.events).filter(event => event?.type === 'goal' && event?.side === winnerSide);
    return goals.some(event => {
      const minute = Number(event.minute || event.clock || 0);
      const home = Number(event.homeGoals || 0);
      const away = Number(event.awayGoals || 0);
      return minute >= 85 && (winnerSide === 'home' ? home === away + 1 : away === home + 1);
    });
  }

  function matchHeadline(record, home, away, isRival){
    const hg = Number(record.homeGoals || 0);
    const ag = Number(record.awayGoals || 0);
    const total = hg + ag;
    const margin = Math.abs(hg - ag);
    const winner = hg > ag ? home : ag > hg ? away : null;
    const loser = hg > ag ? away : ag > hg ? home : null;
    const prefix = isRival ? 'DERBY: ' : '';

    if(hg === 0 && ag === 0) return `${prefix}${home.name} and ${away.name} locked in goalless stalemate`;
    if(hg === ag && total >= 6) return `${prefix}${home.name} and ${away.name} share ${total}-goal classic`;
    if(hg === ag && total >= 4) return `${prefix}Thriller ends level between ${home.name} and ${away.name}`;
    if(hg === ag) return `${prefix}Honours even as ${home.name} draw with ${away.name}`;
    if(lateWinner(record, hg > ag ? 'home' : 'away')) return `${prefix}${winner.name} snatch dramatic late victory over ${loser.name}`;
    if(wasComeback(record, hg > ag ? 'home' : 'away')) return `${prefix}${winner.name} fight back to beat ${loser.name}`;
    if(margin >= 5) return `${prefix}${winner.name} demolish ${loser.name} in ${hg}–${ag} rout`;
    if(margin >= 3) return `${prefix}${winner.name} sweep aside ${loser.name}`;
    if(margin === 1) return `${prefix}${winner.name} edge ${loser.name} in tight contest`;
    return `${prefix}${winner.name} record convincing win over ${loser.name}`;
  }

  function matchReportBody(game, record, home, away, isRival){
    const hg = Number(record.homeGoals || 0);
    const ag = Number(record.awayGoals || 0);
    const total = hg + ag;
    const margin = Math.abs(hg - ag);
    const winner = hg > ag ? home : ag > hg ? away : null;
    const loser = hg > ag ? away : ag > hg ? home : null;
    const winnerSide = hg > ag ? 'home' : ag > hg ? 'away' : null;
    const goals = safeArray(record.events).filter(event => event?.type === 'goal');
    const scorers = goals.map(event => `${playerNameForGoal(game, record, event)} (${Math.max(1, Math.round(Number(event.minute || event.clock || 1)))}′)`).join(', ');
    const incidents = safeArray(record.notableIncidents).length || safeArray(record.events).filter(event => event?.type === 'incident').length;
    const homeStats = record.stats?.home || {};
    const awayStats = record.stats?.away || {};
    const sections = [];

    if(hg === ag){
      if(total === 0) sections.push(`${home.name} and ${away.name} cancelled each other out in a match dominated by defensive organisation.`);
      else if(total >= 6) sections.push(`Neither side could hold control in a breathless ${hg}–${ag} draw packed with attacking swings.`);
      else sections.push(`${home.name} and ${away.name} took a point each after a ${hg}–${ag} draw.`);
    }else if(margin >= 5){
      sections.push(`${winner.name} produced a ruthless display and overwhelmed ${loser.name}, winning ${hg}–${ag}.`);
    }else if(wasComeback(record, winnerSide)){
      sections.push(`${winner.name} recovered after falling behind and completed a ${hg}–${ag} comeback victory over ${loser.name}.`);
    }else if(lateWinner(record, winnerSide)){
      sections.push(`${winner.name} settled the match in the closing minutes to defeat ${loser.name} ${hg}–${ag}.`);
    }else if(margin === 1){
      sections.push(`${winner.name} survived a close contest to beat ${loser.name} ${hg}–${ag}.`);
    }else{
      sections.push(`${winner.name} controlled the decisive periods and beat ${loser.name} ${hg}–${ag}.`);
    }

    if(isRival) sections.push(`The result carries extra weight because the two clubs are established rivals.`);
    if(scorers) sections.push(`The goals were scored by ${scorers}.`);

    const homeShots = Number(homeStats.shots || 0);
    const awayShots = Number(awayStats.shots || 0);
    const homeTarget = Number(homeStats.onTarget || 0);
    const awayTarget = Number(awayStats.onTarget || 0);
    const homeXg = Number(homeStats.xg);
    const awayXg = Number(awayStats.xg);
    if(homeShots || awayShots){
      const xgText = Number.isFinite(homeXg) && Number.isFinite(awayXg) ? `, with expected goals of ${homeXg.toFixed(2)} to ${awayXg.toFixed(2)}` : '';
      sections.push(`${home.name} registered ${homeShots} shots (${homeTarget} on target) and ${away.name} produced ${awayShots} (${awayTarget} on target)${xgText}.`);
    }

    if(incidents) sections.push(`${incidents} unusual match incident${incidents === 1 ? '' : 's'} also interrupted the afternoon.`);
    if(Number(record.attendance) > 0) sections.push(`The recorded attendance was ${Number(record.attendance).toLocaleString('en-GB')}.`);

    const controlledInvolved = record.homeId === game.controlledClubId || record.awayId === game.controlledClubId;
    if(controlledInvolved) sections.push(`${managerName(game)} was due to face the press after full time.`);
    return sections.join(' ');
  }

  function improveMatchInbox(game, record, headline, body){
    const fixture = safeArray(game.fixtures).find(row => row.id === record.fixtureId || row.matchRecordId === record.id);
    if(!fixture) return;
    const existing = safeArray(game.inbox).find(message => message.id === `result-${fixture.id}` || (message.subject === 'Match report' && message.date === record.date));
    if(existing){
      existing.subject = headline;
      existing.body = body;
      existing.from = 'Football Desk';
      existing.matchRecordId = record.id;
    }
  }

  function generateMatchReport(game, record){
    if(!game || !record || record.v0266NewsGenerated) return false;
    const home = clubById(game, record.homeId);
    const away = clubById(game, record.awayId);
    if(!home || !away) return false;
    const isRival = rivalryMatch(home, away);
    const headline = matchHeadline(record, home, away, isRival);
    const body = matchReportBody(game, record, home, away, isRival);
    const added = addNews(game, {
      id: `proper-match-report-${record.id}`,
      date: record.date || game.date,
      headline,
      body,
      category: isRival ? 'rivalry' : 'match report',
      matchRecordId: record.id,
      clubId: game.controlledClubId
    });
    improveMatchInbox(game, record, headline, body);
    record.v0266NewsGenerated = true;
    return added;
  }

  function titleStory(game, club, honour){
    const name = String(honour?.name || honour?.competition || '').trim();
    const season = String(honour?.season || honour?.year || '').trim();
    if(!name || !season || honour?.story) return false;
    if(/crisis|investment|administration|takeover/i.test(name)) return false;
    const start = seasonStart(season);
    const year = currentYear(game);
    if(start == null || (start !== year && start !== year - 1)) return false;
    const id = `title-report-${club.id}-${name}-${season}`.replace(/\s+/g, '-').toLowerCase();
    const cupLike = /cup|trophy|shield|champions league|europe/i.test(name);
    const headline = cupLike ? `${club.name} lift the ${name}` : `${club.name} crowned ${name} champions`;
    const body = cupLike
      ? `${club.name} have added the ${name} to their honours list in ${season}. Players, staff and supporters celebrated a major trophy success.`
      : `${club.name} have secured the ${name} title for ${season}. The championship is now permanently recorded in the club and player histories.`;
    return addNews(game, {id, date: game.date, headline, body, category: 'title win', clubId: club.id});
  }

  function disasterStory(game, event, index){
    const marker = `${event?.type || ''} ${event?.category || ''} ${event?.title || ''}`.toLowerCase();
    if(!/(disaster|tragedy|crisis|collapse|fire|fatal|war)/.test(marker)) return false;
    const eventYear = Number(String(event?.date || '').slice(0, 4));
    const year = currentYear(game);
    if(Number.isFinite(eventYear) && eventYear < year - 1) return false;
    const headline = String(event?.title || event?.text || 'Football world shaken by major event').split(/[.!?]/)[0];
    const body = String(event?.text || event?.summary || headline);
    const id = `major-report-${event?.id || `${event?.date || game.date}-${index}`}`;
    return addNews(game, {id, date: event?.date || game.date, headline, body, category: 'major event', clubId: event?.clubId || null});
  }

  function syncMajorStories(game){
    if(!game) return 0;
    let added = 0;
    const controlled = clubById(game, game.controlledClubId);
    const prominent = safeArray(game.clubs)
      .filter(club => club && club.id !== controlled?.id)
      .sort((a,b) => Number(b.stature || b.reputation || b.powerRating || b.strength || 0) - Number(a.stature || a.reputation || a.powerRating || a.strength || 0))
      .slice(0, 24);
    const titleClubs = controlled ? [controlled, ...prominent] : prominent;
    for(const club of titleClubs){
      for(const honour of safeArray(club.honours).slice(-4)){
        if(titleStory(game, club, honour)) added++;
        if(added >= 10) break;
      }
      if(added >= 10) break;
    }
    let disasterAdds = 0;
    safeArray(game.history).slice(-180).forEach((event, index) => {
      if(disasterAdds >= 5 || event?.type === 'news') return;
      if(disasterStory(game, event, index)){ added++; disasterAdds++; }
    });
    if(added) save(game, 120);
    return added;
  }

  function publishPressStory(game, row, response){
    if(!game || !row || !response) return false;
    const fixture = safeArray(game.fixtures).find(item => item.id === row.fixtureId);
    const home = fixture ? clubById(game, fixture.home) : null;
    const away = fixture ? clubById(game, fixture.away) : null;
    const result = fixture && home && away && fixture.played ? `${home.name} ${fixture.homeGoals}–${fixture.awayGoals} ${away.name}` : 'the latest match';
    const quote = String(response.label || row.answer || 'The manager addressed the media').trim();
    const headline = `${managerName(game)} speaks after ${result}`;
    const body = `${managerName(game)} told the post-match press conference: “${quote}” The response was described as ${String(response.tone || row.tone || 'measured').toLowerCase()}.`;
    return addNews(game, {
      id: `press-report-${row.id}`,
      date: game.date,
      headline,
      body,
      category: 'press conference',
      matchRecordId: fixture?.matchRecordId || null,
      clubId: game.controlledClubId
    });
  }

  function ensureFullFormationVisible(){
    const page = document.querySelector('body.lineup-mode .team-page');
    if(!page) return;
    page.classList.add('v0266-full-formation');
  }

  function repairMatchButtons(){
    const instant = document.getElementById('instantResult');
    const game = gameNow();
    if(instant && Number(game?.matchUI?.minute || 0) < 90){
      instant.disabled = false;
      instant.removeAttribute('disabled');
      instant.style.pointerEvents = 'auto';
      if(instant.textContent === 'CALCULATING…' && !game?.matchUI?._instantBusy) instant.textContent = 'INSTANT RESULT';
    }
    const management = document.querySelector('[data-open-team-management]');
    if(management){
      management.disabled = false;
      management.removeAttribute('disabled');
      management.style.pointerEvents = 'auto';
    }
    ensureFullFormationVisible();
  }

  function renderGame(game){
    if(!game || !window.FLUI?.render) return;
    FLUI.render(game);
    requestAnimationFrame(repairMatchButtons);
  }

  function runInstantResult(button){
    const game = gameNow();
    if(!game || !window.FLUI?.finishMatchImmediately) return;
    const ui = game.matchUI || (game.matchUI = {});
    if(ui._instantBusy || Number(ui.minute || 0) >= 90) return;
    ui._instantBusy = true;
    if(button){
      button.disabled = true;
      button.textContent = 'CALCULATING…';
    }
    try{
      if(window.FLMatchTimer){
        clearInterval(window.FLMatchTimer);
        window.FLMatchTimer = null;
      }
      ui.playing = false;
      let finished = FLUI.finishMatchImmediately(game);
      if(!finished){
        const fixture = safeArray(game.fixtures).find(row => row.date === game.date && !row.played && (row.home === game.controlledClubId || row.away === game.controlledClubId));
        if(fixture){
          FLUI.beginMatch(game, fixture, {autoPlay:false});
          finished = FLUI.finishMatchImmediately(game);
        }
      }
      if(!finished) throw new Error('The active match could not be found');
      const record = safeArray(game.matchRecords).find(row => row.id === game.matchUI?.recordId || row.id === game.activeMatchId);
      if(record){
        window.FLGame?.finalizeMatchStats?.(game, record);
        generateMatchReport(game, record);
      }
      game.version = PATCH_VERSION;
      save(game, 0);
      renderGame(game);
      const note = document.getElementById('saveNote');
      if(note && record) note.textContent = `Full time · ${record.homeName} ${record.homeGoals}–${record.awayGoals} ${record.awayName}`;
    }catch(error){
      console.error('Reliable instant result failed', error);
      ui._instantBusy = false;
      if(button){
        button.disabled = false;
        button.textContent = 'INSTANT RESULT';
        button.style.pointerEvents = 'auto';
      }
      const note = document.getElementById('saveNote');
      if(note) note.textContent = `Instant result failed: ${error.message || 'unknown error'}`;
    }finally{
      ui._instantBusy = false;
    }
  }

  function openLiveTeamManagement(){
    const game = gameNow();
    if(!game) return;
    const ui = game.matchUI || (game.matchUI = {});
    ui.teamManagementWasPlaying = Boolean(ui.playing);
    ui.playing = false;
    ui.subsOpen = false;
    ui.teamManagementOpen = true;
    ui.dragSubOn = null;
    if(window.FLMatchTimer){
      clearInterval(window.FLMatchTimer);
      window.FLMatchTimer = null;
    }
    save(game, 0);
    renderGame(game);
  }

  function closeLiveTeamManagement(){
    const game = gameNow();
    if(!game) return;
    const ui = game.matchUI || (game.matchUI = {});
    const resume = Boolean(ui.teamManagementWasPlaying) && Number(ui.minute || 0) < 90 && !['goal','goal-flight','half-time','full-time'].includes(ui.phase);
    ui.teamManagementOpen = false;
    ui.teamManagementWasPlaying = false;
    ui.dragSubOn = null;
    ui.playing = resume;
    save(game, 0);
    renderGame(game);
    if(resume && typeof window.FLStartMatchTimer === 'function') setTimeout(() => window.FLStartMatchTimer(), 0);
  }

  const style = document.createElement('style');
  style.id = 'v0266-targeted-style';
  style.textContent = `
    body.lineup-mode{overflow-y:auto!important;overflow-x:hidden!important}
    body.lineup-mode .app-shell{height:auto!important;min-height:100vh!important;overflow:visible!important}
    body.lineup-mode #mainPanel{height:auto!important;min-height:calc(100vh - 144px)!important;overflow:visible!important}
    body.lineup-mode .team-page.v0266-full-formation{height:auto!important;min-height:calc(100vh - 144px)!important;overflow:visible!important;padding-bottom:74px!important}
    body.lineup-mode .team-page.v0266-full-formation .team-layout{height:auto!important;min-height:680px!important;overflow:visible!important}
    body.lineup-mode .team-page.v0266-full-formation .pitch-panel,
    body.lineup-mode .team-page.v0266-full-formation .selection-panel{height:auto!important;min-height:680px!important;overflow:visible!important}
    body.lineup-mode .team-page.v0266-full-formation .lineup-board{height:auto!important;min-height:680px!important;align-items:start!important}
    body.lineup-mode .team-page.v0266-full-formation .lineup-board .football-pitch{height:660px!important;max-height:none!important;flex:0 0 auto!important}
    body.lineup-mode .team-page.v0266-full-formation .lineup-board .bench-strip{height:660px!important;max-height:660px!important;overflow-y:auto!important}
    #instantResult[data-v0266-busy="1"]{opacity:.72;cursor:wait}
  `;
  document.head.appendChild(style);

  if(window.FLGame?.finalizeMatchStats){
    const originalFinalize = FLGame.finalizeMatchStats.bind(FLGame);
    FLGame.finalizeMatchStats = function v0266FinalizeWithNews(game, record){
      const output = originalFinalize(game, record);
      generateMatchReport(game, record);
      syncMajorStories(game);
      return output;
    };
  }

  if(window.FLGame?.advanceDay){
    const originalAdvanceDay = FLGame.advanceDay.bind(FLGame);
    FLGame.advanceDay = function v0266AdvanceDayWithMajorNews(game, options){
      const output = originalAdvanceDay(game, options);
      syncMajorStories(game);
      return output;
    };
  }

  if(window.FLLivingWorld?.answerPress){
    const originalAnswerPress = FLLivingWorld.answerPress.bind(FLLivingWorld);
    FLLivingWorld.answerPress = function v0266PublishPress(game, id, responseId){
      const row = safeArray(game?.livingWorld?.pressHistory).find(item => item.id === id);
      const response = safeArray(row?.responses).find(item => item.id === responseId);
      const output = originalAnswerPress(game, id, responseId);
      if(output?.ok){
        publishPressStory(game, row, response || {label:row?.answer,tone:row?.tone});
        save(game, 50);
      }
      return output;
    };
  }

  if(window.FLUI?.render){
    const originalRender = FLUI.render.bind(FLUI);
    FLUI.render = function v0266Render(game){
      window.FLCurrentGame = game;
      const output = originalRender(game);
      if(game){
        game.version = PATCH_VERSION;
        if(game._v0266NewsSyncDate !== game.date){
          game._v0266NewsSyncDate = game.date;
          syncMajorStories(game);
        }
      }
      requestAnimationFrame(repairMatchButtons);
      return output;
    };
  }

  let lastTeamManagementPointerOpen = 0;

  // The live match redraws several times per second. Opening on pointerdown prevents
  // a redraw replacing the button between mouse-down and click.
  document.addEventListener('pointerdown', event => {
    const open = event.target.closest?.('[data-open-team-management]');
    if(!open || open.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lastTeamManagementPointerOpen = Date.now();
    openLiveTeamManagement();
  }, true);

  document.addEventListener('click', event => {
    const instant = event.target.closest?.('#instantResult');
    if(instant){
      event.preventDefault();
      event.stopImmediatePropagation();
      runInstantResult(instant);
      return;
    }
    const open = event.target.closest?.('[data-open-team-management]');
    if(open){
      event.preventDefault();
      event.stopImmediatePropagation();
      // Mouse/touch input was already handled on pointerdown. Keyboard activation
      // still arrives here and remains fully supported.
      if(Date.now() - lastTeamManagementPointerOpen > 900) openLiveTeamManagement();
      return;
    }
    const close = event.target.closest?.('[data-close-team-management]');
    if(close){
      event.preventDefault();
      event.stopImmediatePropagation();
      closeLiveTeamManagement();
    }
  }, true);

  window.FLV0266MatchNewsFixes = {
    version: PATCH_VERSION,
    generateMatchReport,
    syncMajorStories,
    rivalryMatch,
    matchHeadline,
    matchReportBody,
    repairMatchButtons,
    runInstantResult,
    openLiveTeamManagement,
    closeLiveTeamManagement
  };
})();
