/* Football Legacy v0.26.1 — only the targeted UX tweaks requested after v0.26.0. */
(() => {
  const currentYear = game => Math.max(1888, Number(String(game?.date || '1888').slice(0, 4)) || 1888);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const save = game => window.FLSave?.saveSoon ? FLSave.saveSoon(game) : window.FLSave?.save?.(game);

  function compactPosition(game, code) {
    const year = currentYear(game);
    const value = String(code || '').trim();
    if (year < 1925) return ({GK:'GK', FB:'FB', HB:'HB', IF:'IF', W:'W', CF:'CF'})[value] || value;
    if (year < 1960) return ({GK:'GK', FB:'FB', HB:'WH', IF:'IF', W:'W', CF:'CF'})[value] || value;
    if (year < 1980) return ({GK:'GK', FB:'DF', HB:'MF', IF:'AM', W:'W', CF:'ST'})[value] || value;
    return ({GK:'GK', FB:'DF', HB:'CM', IF:'AM', W:'W', CF:'ST'})[value] || value;
  }

  function fullPosition(game, code) {
    const year = currentYear(game);
    const value = String(code || '').trim();
    if (year < 1925) return ({GK:'Goalkeeper', FB:'Full Back', HB:'Half Back', IF:'Inside Forward', W:'Winger', CF:'Centre Forward'})[value] || value;
    if (year < 1960) return ({GK:'Goalkeeper', FB:'Full Back', HB:'Wing Half', IF:'Inside Forward', W:'Winger', CF:'Centre Forward'})[value] || value;
    if (year < 1980) return ({GK:'Goalkeeper', FB:'Defender', HB:'Midfielder', IF:'Attacking Midfielder', W:'Winger', CF:'Striker'})[value] || value;
    return ({GK:'Goalkeeper', FB:'Defender', HB:'Central Midfielder', IF:'Attacking Midfielder', W:'Winger', CF:'Striker'})[value] || value;
  }

  function roleLabel(game, role) {
    const year = currentYear(game);
    const value = String(role || '').trim();
    if (year < 1925) return value;
    if (year < 1960) return ({'Half Back':'Wing Half'})[value] || value;
    if (year < 1980) return ({'Half Back':'Holding Midfielder', 'Wing Half':'Central Midfielder'})[value] || value;
    return ({'Half Back':'Defensive Midfielder', 'Wing Half':'Central Midfielder'})[value] || value;
  }

  function formationLabel(game, shape) {
    const year = currentYear(game);
    const raw = String(shape || '').trim();
    if (raw === 'Custom') return 'Custom Shape';
    if (year < 1930) return ({'2-3-5':'2-3-5 Pyramid', '3-2-5':'3-2-5 Metodo', '2-2-6':'2-2-6 All-Out Attack'})[raw] || raw;
    if (year < 1960) return ({'2-3-5':'2-3-5 Pyramid', '3-2-5':'3-2-5 Metodo', '2-2-6':'2-2-6 Attacking'})[raw] || raw;
    return ({'2-3-5':'2-3-5 Attacking Shape', '3-2-5':'3-2-5 Build-Up Shape', '2-2-6':'2-2-6 Ultra-Attacking'})[raw] || raw;
  }

  function replaceLeadingPosition(game, node, full = false) {
    if (!node) return;
    const original = node.dataset.flOriginalText || node.textContent;
    if (!node.dataset.flOriginalText) node.dataset.flOriginalText = original;
    const label = full ? fullPosition : compactPosition;
    let next = original;
    for (const code of ['GK','FB','HB','IF','W','CF']) {
      const mapped = label(game, code);
      next = next.replace(new RegExp(`^${code}(?=\\s*(?:·|,|$))`), mapped);
      next = next.replace(new RegExp(`(^|\\s·\\s)${code}(?=\\s*(?:·|,|$))`, 'g'), `$1${mapped}`);
    }
    if (node.textContent !== next) node.textContent = next;
  }

  function applyEraLabels(game) {
    const root = document.getElementById('mainPanel');
    if (!root) return;

    const formation = root.querySelector('#formationSelect');
    formation?.querySelectorAll('option').forEach(option => {
      const raw = option.dataset.flInternalValue || option.value || option.textContent.trim();
      option.dataset.flInternalValue = raw;
      option.value = raw;
      const label = formationLabel(game, raw);
      if (option.textContent !== label) option.textContent = label;
    });

    root.querySelectorAll('.pitch-player small,.bench-player small,.selected-player p,.player-picker option,.role-player-row small,.role-player-header p,.pre-lineup-list li,.history-hall-grid .hall-card>div:last-child>span').forEach(node => replaceLeadingPosition(game, node, false));
    root.querySelectorAll('.youth-table tbody tr td:nth-child(3),.squad-data-table tbody tr td:nth-child(2)').forEach(node => {
      const raw = node.dataset.flPositionCode || node.textContent.trim();
      node.dataset.flPositionCode = raw;
      const next = compactPosition(game, raw);
      if (node.textContent !== next) node.textContent = next;
    });

    const identity = root.querySelector('.player-profile-hero .profile-identity>span');
    if (identity) {
      const original = identity.dataset.flOriginalText || identity.textContent;
      identity.dataset.flOriginalText = original;
      const parts = original.split('·');
      const code = parts.shift()?.trim();
      const next = [fullPosition(game, code), ...parts.map(x => x.trim())].join(' · ');
      if (identity.textContent !== next) identity.textContent = next;
    }

    root.querySelectorAll('.profile-information .detail-list>div').forEach(row => {
      const label = row.querySelector('span');
      const value = row.querySelector('strong');
      if (label?.textContent.trim() !== 'Positions' || !value) return;
      const original = value.dataset.flOriginalText || value.textContent;
      value.dataset.flOriginalText = original;
      const next = original.split(',').map(code => fullPosition(game, code.trim())).join(', ');
      if (value.textContent !== next) value.textContent = next;
    });

    const roleSelect = root.querySelector('#roleSelect');
    roleSelect?.querySelectorAll('option').forEach(option => {
      const raw = option.dataset.flInternalValue || option.value || option.textContent.trim();
      option.dataset.flInternalValue = raw;
      option.value = raw;
      const label = roleLabel(game, raw);
      if (option.textContent !== label) option.textContent = label;
    });
    root.querySelectorAll('.role-description h3,.impact-role-name span').forEach(node => {
      const raw = node.dataset.flRoleName || node.textContent.trim();
      node.dataset.flRoleName = raw;
      const next = roleLabel(game, raw);
      if (node.textContent !== next) node.textContent = next;
    });
  }

  function allKnownPlayers(game) {
    const rows = [];
    (game?.clubs || []).forEach(club => (club.players || []).forEach(player => rows.push({player, club})));
    (game?.freeAgents || []).forEach(player => rows.push({player, club:null}));
    (game?.globalPlayers || []).forEach(player => rows.push({player, club:null}));
    try {
      if (window.FLWorldFootball) FLWorldFootball.players(game).forEach(row => rows.push({player:row.p, club:row.c}));
    } catch (_) {}
    return rows;
  }

  function inferInboxRoute(game, message) {
    if (!message) return null;
    const explicit = message.link || message.route;
    if (explicit?.tab) return {tab:explicit.tab, playerId:explicit.playerId || null, label:explicit.label || 'OPEN RELATED PAGE'};
    const text = `${message.subject || ''} ${message.body || ''}`.toLowerCase();
    const named = allKnownPlayers(game).filter(row => text.includes(String(row.player?.name || '').toLowerCase())).sort((a,b) => String(b.player.name).length - String(a.player.name).length)[0];
    if (/transfer|bid|offer|loan|signing|personal terms|agent|valuation|shortlist/.test(text)) return {tab:'transfers', playerId:named?.player?.id || null, label:named ? `OPEN ${String(named.player.name).toUpperCase()}` : 'OPEN TRANSFER CENTRE'};
    if (/academy|youth|prospect|intake/.test(text)) return {tab:'academy', label:'OPEN YOUTH ACADEMY'};
    if (/\b(family|partner|spouse|son|daughter|household|child|children)\b/.test(text)) return {tab:'family', label:'OPEN FAMILY'};
    if (/board|chairman|director|budget|facilities/.test(text)) return {tab:'board', label:'OPEN BOARD'};
    if (/contract|renewal|wage/.test(text) && named) return {tab:'player', playerId:named.player.id, label:`OPEN ${String(named.player.name).toUpperCase()}`};
    return null;
  }

  function enhanceInbox(game) {
    const view = document.querySelector('.inbox-page .message-view');
    const content = view?.querySelector('.message-content');
    if (!view || !content || view.querySelector('.targeted-inbox-link')) return;
    const messages = Array.isArray(game?.inbox) ? game.inbox : [];
    const selectedId = game?.inboxUI?.selectedId;
    const message = messages.find(row => row.id === selectedId) || messages[0];
    const route = inferInboxRoute(game, message);
    if (!route) return;
    const wrap = document.createElement('div');
    wrap.className = 'message-actions targeted-inbox-link';
    wrap.innerHTML = `<button type="button" data-inbox-route="${esc(route.tab)}"${route.playerId ? ` data-inbox-player="${esc(route.playerId)}"` : ''}>${esc(route.label)}</button>`;
    content.insertAdjacentElement('afterend', wrap);
  }

  function ownSelectedPlayer(game) {
    const selectedId = game?.squadState?.selectedPlayerId;
    if (!selectedId) return null;
    const club = (game.clubs || []).find(row => row.id === game.controlledClubId);
    return club?.players?.find(player => player.id === selectedId) || null;
  }

  function enhanceAcademyAction(game) {
    const page = document.querySelector('.player-profile-page:not(.external-player-profile)');
    if (!page || page.querySelector('[data-move-to-academy]')) return;
    const player = ownSelectedPlayer(game);
    if (!player || Number(player.age) > 21) return;
    const hero = page.querySelector('.player-profile-hero');
    if (!hero) return;
    const bar = document.createElement('div');
    bar.className = 'profile-targeted-actions';
    bar.innerHTML = `<button type="button" data-move-to-academy="${esc(player.id)}">MOVE TO ACADEMY</button><small>Available for under-21 senior players. The player keeps his identity and career record.</small>`;
    hero.insertAdjacentElement('afterend', bar);
  }

  function relationshipTone(value) {
    const n = Number(value);
    if (n >= 80) return 'Very close';
    if (n >= 65) return 'Strong';
    if (n >= 50) return 'Steady';
    if (n >= 35) return 'Strained';
    return 'Distant';
  }

  function portraitForFamily(game, person, fallbackAge = 30, isChild = false) {
    if (!person) return '';
    const age = Number.isFinite(Number(fallbackAge)) ? Number(fallbackAge) : 30;
    if (isChild && window.FLFamilyPortraits) return FLFamilyPortraits.portrait(game, person, age);
    if (!window.FLEraIdentity) return '';
    const year = currentYear(game);
    return FLEraIdentity.portraitFor({...person, age:Number(person.age) || age, identitySeed:person.appearanceSeed || person.portraitSeed || person.identitySeed}, year, {role:'family'});
  }

  function childInteractionButtons(member) {
    const age = Number(member.age) || 0;
    if (age <= 4) return '<small class="targeted-child-age-note">Too young for direct conversation</small>';
    const common = `data-targeted-child-id="${esc(member.id)}" data-child-name="${esc(member.name)}" data-child-age="${age}"`;
    if (age <= 9) return `<div class="targeted-child-actions"><button type="button" data-targeted-child-action="play" ${common}>PLAY TOGETHER</button><button type="button" data-targeted-child-action="story" ${common}>READ A STORY</button></div>`;
    if (age <= 12) return `<div class="targeted-child-actions"><button type="button" data-targeted-child-action="school" ${common}>TALK ABOUT SCHOOL</button><button type="button" data-targeted-child-action="time" ${common}>SPEND TIME TOGETHER</button></div>`;
    if (age <= 15) return `<div class="targeted-child-actions"><button type="button" data-targeted-child-action="how-are-you" ${common}>ASK HOW THEY ARE</button><button type="button" data-targeted-child-action="school" ${common}>DISCUSS SCHOOL</button><button type="button" data-targeted-child-action="football" ${common}>DISCUSS FOOTBALL</button></div>`;
    return `<button type="button" data-targeted-family-talk="${esc(member.id)}" data-family-name="${esc(member.name)}" data-family-role="${esc(member.role)}">TALK</button>`;
  }

  function enhanceFamily(game) {
    const page = document.querySelector('.manager-family-page');
    if (!page || page.querySelector('.targeted-family-links') || !window.FLPersonalLife) return;
    const life = FLPersonalLife.ensure(game);
    const descendants = FLPersonalLife.descendants(game) || [];
    const members = [];
    if (life.spouse) {
      const person = window.FLPeople ? FLPeople.get(game, life.spouse.personId) : null;
      members.push({id:life.spouse.personId || 'spouse', name:life.spouse.name, role:life.relationshipStatus || 'Partner', relationship:Number(life.spouse.relationship || life.familyMood || 50), person:person || life.spouse, isChild:false});
    }
    descendants.slice(0, 6).forEach(child => {
      const person = window.FLPeople ? FLPeople.get(game, child.personId || child.id) : null;
      members.push({id:child.personId || child.id, name:child.name, role:child.gender === 'female' ? 'Daughter' : 'Son', relationship:Number(child.relationship || life.familyMood || 55), person:person || child, age:child.age, isChild:true});
    });
    if (!members.length) return;
    const youngChildIds = new Set(members.filter(member => member.isChild && Number(member.age) < 16).map(member => String(member.id)));
    const thread = window.FLConversations?.ensure ? FLConversations.ensure(game).threads.find(row => row.group === 'family' && !youngChildIds.has(String(row.roleId || row.personId))) : null;
    const conversation = thread ? `<div class="targeted-family-conversation"><div class="panel-head">LATEST FAMILY CONVERSATION <span>${thread.open ? 'IN PROGRESS' : 'RECORDED'}</span></div><div class="conversation-transcript">${(thread.messages || []).map(message => `<div class="${message.speaker === 'You' ? 'manager-line' : 'person-line'}"><strong>${esc(message.speaker)}</strong><p>${esc(message.text)}</p></div>`).join('')}</div>${thread.open ? `<div class="conversation-replies">${(thread.choices || []).map(choice => `<button type="button" data-targeted-family-reply="${esc(choice.id)}" data-family-thread="${esc(thread.id)}"><strong>${esc(choice.label)}</strong><small>${esc(choice.tone)}</small></button>`).join('')}</div>` : ''}</div>` : '';
    const panel = document.createElement('section');
    panel.className = 'panel targeted-family-links';
    panel.innerHTML = `<div class="panel-head">FAMILY RELATIONSHIPS <span>KEEP IN TOUCH</span></div><div class="targeted-family-grid">${members.map(member => `<article><img src="${esc(portraitForFamily(game, member.person, member.age ?? 30, member.isChild))}" alt=""><div><span>${esc(String(member.role).toUpperCase())}${member.age != null ? ` · AGE ${esc(member.age)}` : ''}</span><strong>${esc(member.name)}</strong><small>${esc(relationshipTone(member.relationship))} relationship · ${Math.round(member.relationship)}%</small></div>${member.isChild?childInteractionButtons(member):`<button type="button" data-targeted-family-talk="${esc(member.id)}" data-family-name="${esc(member.name)}" data-family-role="${esc(member.role)}">TALK</button>`}</article>`).join('')}</div>${conversation}`;
    const pending = page.querySelector('.family-decision');
    if (pending) pending.insertAdjacentElement('afterend', panel); else page.prepend(panel);
  }

  function ensureConversationVisible() {
    const panel = document.querySelector('.people-conversation-panel');
    if (panel && !panel.id) panel.id = 'playerConversationPanel';
  }

  function enhance(game) {
    if (!game) return;
    applyEraLabels(game);
    enhanceInbox(game);
    enhanceAcademyAction(game);
    enhanceFamily(game);
    ensureConversationVisible();
  }

  function renderGame(game) {
    save(game);
    window.FLUI?.render?.(game);
  }

  function moveToAcademy(game, playerId) {
    const club = (game.clubs || []).find(row => row.id === game.controlledClubId);
    const index = club?.players?.findIndex(player => String(player.id) === String(playerId)) ?? -1;
    if (!club || index < 0 || !window.ensureYouthAcademy || !window.ensureTeam) return;
    const player = club.players[index];
    if (Number(player.age) > 21) return;
    const academy = ensureYouthAcademy(game);
    club.players.splice(index, 1);
    if (!academy.players.some(row => row.id === player.id)) academy.players.push(player);
    player.squadStatus = 'Academy';
    player.clubId = club.id;
    player.developmentFocus = player.developmentFocus || 'Balanced development';
    player.youthApps = Number(player.youthApps || 0);
    player.youthGoals = Number(player.youthGoals || 0);
    player.youthCleanSheets = Number(player.youthCleanSheets || 0);
    const team = ensureTeam(game);
    team.startingXI = team.startingXI.map(id => id === player.id ? null : id);
    team.substitutes = team.substitutes.filter(id => id !== player.id);
    if (team.roleAssignments) delete team.roleAssignments[player.id];
    if (game.squadState) game.squadState.selectedPlayerId = null;
    team.teamView = 'youth';
    academy.view = 'team';
    game.selectedTab = 'team';
    game.inbox = Array.isArray(game.inbox) ? game.inbox : [];
    game.inbox.unshift({id:`academy-return-${player.id}-${Date.now()}`, date:game.date, from:'Youth Development Officer', subject:`${player.name} moved to the academy`, body:`${player.name} has moved from the senior squad into the youth academy. He can be promoted back to the first team from the Youth Team page.`, read:false, link:{tab:'academy', label:'OPEN YOUTH ACADEMY'}});
    const note = document.getElementById('saveNote');
    if (note) note.textContent = `${player.name} moved to the academy`;
    renderGame(game);
  }

  function followInboxRoute(game, button) {
    const route = button.dataset.inboxRoute;
    const playerId = button.dataset.inboxPlayer || null;
    if (route === 'transfers') {
      game.selectedTab = 'transfers';
      if (window.ensureWorldDatabase) {
        const ui = ensureWorldDatabase(game);
        ui.playerId = playerId;
      }
    } else if (route === 'academy') {
      game.selectedTab = 'team';
      if (window.ensureTeam) ensureTeam(game).teamView = 'youth';
      if (window.ensureYouthAcademy) ensureYouthAcademy(game).view = 'team';
    } else if (route === 'family') {
      game.selectedTab = 'manager';
      game.managerCareer = game.managerCareer || {};
      game.managerCareer.view = 'family';
    } else if (route === 'board') {
      game.selectedTab = 'board';
    } else if (route === 'match' || route === 'team' || route === 'home' || route === 'manager' || route === 'settings') {
      game.selectedTab = route;
      if (route === 'manager') {
        game.managerCareer = game.managerCareer || {};
        game.managerCareer.view = game.managerCareer.view || 'overview';
      }
    } else if (route === 'player' && playerId) {
      game.selectedTab = 'squad';
      game.squadState = game.squadState || {};
      game.squadState.selectedPlayerId = playerId;
      game.squadState.profileView = 'overview';
    }
    renderGame(game);
  }

  function talkToFamily(game, button) {
    if (!window.FLConversations) return;
    const id = button.dataset.targetedFamilyTalk;
    const person = {id, name:button.dataset.familyName || 'Family Member', role:button.dataset.familyRole || 'Family'};
    FLConversations.startGeneric(game, 'family', person, 'checkIn');
    save(game);
    window.FLUI?.render?.(game);
  }

  function interactWithChild(game, button) {
    if (!window.FLPersonalLife) return;
    const life = FLPersonalLife.ensure(game);
    const id = String(button.dataset.targetedChildId || '');
    const child = (life.children || []).find(row => String(row.personId || row.id) === id);
    if (!child) return;
    const age = Math.max(0, currentYear(game) - Number(child.birthYear || currentYear(game)));
    if (age <= 4) return;
    const action = button.dataset.targetedChildAction;
    const options = {
      play:[`You spent time playing with ${child.name}.`,4,'Played together'],
      story:[`You read a story with ${child.name}.`,4,'Story time'],
      school:[`You asked ${child.name} about school and listened properly.`,3,'Talked about school'],
      time:[`You protected time to spend with ${child.name} away from football.`,4,'Time together'],
      'how-are-you':[`You checked in with ${child.name} and gave them space to talk about how life is going.`,4,'Family check-in'],
      football:[`You discussed football with ${child.name} without putting pressure on their future.`,3,'Talked about football']
    };
    const [message, impact, title] = options[action] || [`You spent time with ${child.name}.`,3,'Time together'];
    child.relationship = Math.max(0, Math.min(100, Number(child.relationship || 65) + impact));
    life.familyMood = Math.max(0, Math.min(100, Number(life.familyMood || 60) + Math.max(1, impact - 1)));
    FLPersonalLife.addRelationshipMemory?.(game, title, message, impact, child.personId || child.id);
    life.betaChoices = life.betaChoices || {};
    life.betaChoices.lastAction = message;
    const note = document.getElementById('saveNote');
    if (note) note.textContent = message;
    save(game);
    window.FLUI?.render?.(game);
  }

  function replyToFamily(game, button) {
    if (!window.FLConversations) return;
    const outcome = FLConversations.respondGeneric(game, button.dataset.familyThread, button.dataset.targetedFamilyReply);
    const note = document.getElementById('saveNote');
    if (note && outcome?.message) note.textContent = outcome.message;
    save(game);
    window.FLUI?.render?.(game);
  }

  const familyAgeStyle=document.createElement('style');familyAgeStyle.textContent='.targeted-child-actions{display:flex;flex-wrap:wrap;gap:6px;margin-left:auto;justify-content:flex-end}.targeted-child-actions button{margin-left:0!important;font-size:10px;padding:7px 9px}.targeted-child-age-note{margin-left:auto;max-width:130px;text-align:right;color:#9fb0b8}.family-age-note{color:#9fb0b8}';document.head.appendChild(familyAgeStyle);

  const originalRender = window.FLUI?.render;
  if (originalRender) {
    window.FLUI.render = function targetedRender(game) {
      window.FLCurrentGame = game;
      const result = originalRender.call(this, game);
      requestAnimationFrame(() => enhance(game));
      return result;
    };
  }

  let enhanceScheduled = false;
  const observer = new MutationObserver(() => {
    if (enhanceScheduled) return;
    enhanceScheduled = true;
    requestAnimationFrame(() => {
      enhanceScheduled = false;
      enhance(window.FLCurrentGame);
    });
  });
  const main = document.getElementById('mainPanel');
  if (main) observer.observe(main, {childList:true, subtree:true});

  document.addEventListener('click', event => {
    const game = window.FLCurrentGame;
    if (!game) return;
    const inboxButton = event.target.closest('[data-inbox-route]');
    if (inboxButton) {
      event.preventDefault();
      followInboxRoute(game, inboxButton);
      return;
    }
    const academyButton = event.target.closest('[data-move-to-academy]');
    if (academyButton) {
      event.preventDefault();
      moveToAcademy(game, academyButton.dataset.moveToAcademy);
      return;
    }
    const childAction = event.target.closest('[data-targeted-child-action]');
    if (childAction) {
      event.preventDefault();
      interactWithChild(game, childAction);
      return;
    }
    const familyButton = event.target.closest('[data-targeted-family-talk]');
    if (familyButton) {
      event.preventDefault();
      talkToFamily(game, familyButton);
      return;
    }
    const familyReply = event.target.closest('[data-targeted-family-reply]');
    if (familyReply) {
      event.preventDefault();
      replyToFamily(game, familyReply);
      return;
    }
    if (event.target.closest('[data-player-talk]')) {
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('playerConversationPanel')?.scrollIntoView({behavior:'smooth', block:'start'})));
    }
  });
})();
