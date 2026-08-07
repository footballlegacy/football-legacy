(function v0268QuickSim(){
  'use strict';

  const PATCH_VERSION = '0.26.10';
  let running = false;
  let lastPointerRun = 0;
  let lastCompletedKey = '';
  let lastCompletedAt = 0;

  function gameNow(){
    return window.FLCurrentGame || null;
  }

  function rows(value){
    return Array.isArray(value) ? value : [];
  }

  function stopMatchClock(game){
    if(window.FLMatchTimer){
      clearInterval(window.FLMatchTimer);
      window.FLMatchTimer = null;
    }
    const ui = game?.matchUI || (game.matchUI = {});
    ui.playing = false;
    ui.teamManagementOpen = false;
    ui.teamManagementWasPlaying = false;
    ui.subsOpen = false;
    ui.goalEventKey = null;
  }

  function fixtureForRecord(game, record){
    if(!record) return null;
    return rows(game?.fixtures).find(fixture =>
      fixture.id === record.fixtureId || fixture.matchRecordId === record.id
    ) || null;
  }

  function recordForFixture(game, fixture){
    if(!fixture) return null;
    return rows(game?.matchRecords).find(record =>
      record.id === fixture.matchRecordId || record.fixtureId === fixture.id
    ) || null;
  }

  function currentFixture(game){
    const ui = game?.matchUI || {};
    return rows(game?.fixtures).find(fixture => fixture.id === ui.previewFixtureId) ||
      window.FLGame?.fixtureOn?.(game, game.date) ||
      rows(game?.fixtures).find(fixture =>
        fixture.date === game?.date &&
        (fixture.home === game?.controlledClubId || fixture.away === game?.controlledClubId)
      ) || null;
  }

  function resolveContext(game, source){
    const ui = game?.matchUI || {};
    let fixture = null;
    let record = null;

    if(source === 'live'){
      record = rows(game?.matchRecords).find(row =>
        row.id === ui.recordId || row.id === game?.activeMatchId
      ) || null;
      fixture = fixtureForRecord(game, record);
    }

    if(!fixture){
      fixture = currentFixture(game);
      record = recordForFixture(game, fixture);
    }

    if(!record && fixture) record = recordForFixture(game, fixture);
    if(!fixture && record) fixture = fixtureForRecord(game, record);
    return {fixture, record};
  }

  function saveNow(game){
    if(!game || !window.FLSave) return;
    if(typeof FLSave.save === 'function') FLSave.save(game);
    else if(typeof FLSave.saveSoon === 'function') FLSave.saveSoon(game, 0);
  }

  function setButtonBusy(button){
    if(!button) return;
    button.disabled = true;
    button.dataset.v0268Busy = '1';
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'GENERATING RESULT…';
  }

  function restoreButton(button){
    if(!button || !button.isConnected) return;
    button.disabled = false;
    delete button.dataset.v0268Busy;
    button.removeAttribute('aria-busy');
    button.textContent = 'QUICK SIM';
  }

  function resultMessage(record){
    if(!record) return 'Full time';
    return `Full time · ${record.homeName} ${Number(record.homeGoals || 0)}–${Number(record.awayGoals || 0)} ${record.awayName}`;
  }

  function showMessage(message){
    const note = document.getElementById('saveNote');
    if(note) note.textContent = message;
  }

  function renderGame(game){
    if(window.FLUI?.render) FLUI.render(game);
  }

  function runQuickSim(button, source){
    const game = gameNow();
    if(!game || !window.FLUI?.beginMatch || !window.FLUI?.finishMatchImmediately) return false;
    if(running) return false;

    const initial = resolveContext(game, source);
    const initialKey = initial.fixture?.id || initial.record?.id || `${game.date}-${game.controlledClubId}`;
    if(initialKey === lastCompletedKey && Date.now() - lastCompletedAt < 1200) return true;

    running = true;
    setButtonBusy(button);

    try{
      stopMatchClock(game);
      const ui = game.matchUI || (game.matchUI = {});
      let {fixture, record} = initial;

      if(!fixture && !record) throw new Error('No match is available to simulate');

      if(!record){
        if(!fixture || fixture.played) throw new Error('The match record could not be found');
        // Remove stale references so the correct fixture is always used.
        ui.recordId = null;
        game.activeMatchId = null;
        ui.previewFixtureId = fixture.id;
        record = FLUI.beginMatch(game, fixture, {autoPlay:false});
      }

      if(!record?.id) throw new Error('The match engine did not create a result');
      fixture = fixture || fixtureForRecord(game, record);

      ui.recordId = record.id;
      ui.previewFixtureId = fixture?.id || null;
      game.activeMatchId = record.id;
      ui.instantResultComplete = false;
      ui.playing = false;
      ui.goalEventKey = null;

      const finished = FLUI.finishMatchImmediately(game);
      if(!finished) throw new Error('The match could not be completed');

      record = rows(game.matchRecords).find(row => row.id === game.matchUI?.recordId || row.id === game.activeMatchId) || record;
      if(!record || Number(game.matchUI?.minute || 0) < 90 || game.matchUI?.phase !== 'full-time'){
        throw new Error('The result did not reach full time');
      }

      record.quickSim = true;
      record.instantResult = true;
      game.version = PATCH_VERSION;
      saveNow(game);
      renderGame(game);
      showMessage(resultMessage(record));

      lastCompletedKey = fixture?.id || record.id;
      lastCompletedAt = Date.now();
      return true;
    }catch(error){
      console.error('Quick Sim failed', error);
      showMessage(`Quick Sim failed: ${error.message || 'unknown error'}`);
      restoreButton(button);
      return false;
    }finally{
      running = false;
    }
  }

  function makeQuickSimButton(source){
    const button = document.createElement('button');
    button.type = 'button';
    button.className = source === 'pre' ? 'wide-action v0268-quick-sim' : 'v0268-quick-sim';
    button.dataset.v0268QuickSim = source;
    button.textContent = 'QUICK SIM';
    button.setAttribute('aria-label', source === 'live' ? 'Quick simulate the rest of this match' : 'Quick simulate this match');
    return button;
  }

  function enhanceButtons(){
    const kickOff = document.getElementById('kickOffMatch');
    if(kickOff){
      if(kickOff.dataset.busy !== '1') kickOff.textContent = 'SIM GAME';
      kickOff.setAttribute('aria-label', 'Open the full match simulation');
      const actions = kickOff.closest('.pre-match-actions');
      if(actions && !actions.querySelector('[data-v0268-quick-sim="pre"]')){
        actions.appendChild(makeQuickSimButton('pre'));
      }
    }

    const controls = document.querySelector?.('.match-controls') || null;
    if(controls){
      const management = controls.querySelector('[data-open-team-management]');
      if(!controls.querySelector('[data-v0268-quick-sim="live"]')){
        const quick = makeQuickSimButton('live');
        quick.id = 'quickSimCurrentMatch';
        if(management) controls.insertBefore(quick, management);
        else controls.appendChild(quick);
      }
      if(management){
        management.disabled = false;
        management.removeAttribute('disabled');
        management.style.pointerEvents = 'auto';
      }
    }
  }

  if(window.FLUI?.render){
    const originalRender = FLUI.render.bind(FLUI);
    FLUI.render = function v0268Render(game){
      window.FLCurrentGame = game;
      const output = originalRender(game);
      enhanceButtons();
      return output;
    };
  }

  document.addEventListener('pointerdown', event => {
    const button = event.target.closest?.('[data-v0268-quick-sim]');
    if(!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lastPointerRun = Date.now();
    runQuickSim(button, button.dataset.v0268QuickSim);
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-v0268-quick-sim]');
    if(!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // Pointer input is handled before the live screen can redraw the button.
    // This path remains for keyboard activation.
    if(Date.now() - lastPointerRun > 900){
      runQuickSim(button, button.dataset.v0268QuickSim);
    }
  }, true);

  window.FLV0268QuickSim = {
    version: PATCH_VERSION,
    runQuickSim,
    resolveContext,
    enhanceButtons
  };
})();
