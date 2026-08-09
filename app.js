'use strict';

const STORAGE_KEY = 'footballLegacyFrontEndPhase1SavesV1';
const OPEN_SECTION_KEY = 'footballLegacyFrontEndPhase1OpenSection';

const CREATION_KEYS = {
  player: 'footballLegacyCreatedPlayersV1',
  stadium: 'footballLegacyCreatedStadiumsV1',
  club: 'footballLegacyCreatedClubsV1'
};

function readCreationRows(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn('Could not read created-content records.', error);
    return [];
  }
}

function renderCreationCounts() {
  const playerCount = document.getElementById('createdPlayerCount');
  const stadiumCount = document.getElementById('createdStadiumCount');
  const clubCount = document.getElementById('createdClubCount');
  if (playerCount) playerCount.textContent = readCreationRows(CREATION_KEYS.player).length;
  if (stadiumCount) stadiumCount.textContent = readCreationRows(CREATION_KEYS.stadium).length;
  if (clubCount) clubCount.textContent = readCreationRows(CREATION_KEYS.club).length;
}

function handleCreationReturn() {
  const query = new URLSearchParams(window.location.search);
  const created = query.get('created');
  if (!created) return;

  const labels = { player: 'player', stadium: 'stadium', club: 'club' };
  const label = labels[created];
  if (!label) return;

  const flash = document.getElementById('menuFlash');
  if (flash) {
    flash.textContent = `Your ${label} was saved. It is now available in My Creations.`;
    flash.hidden = false;
  }

  try {
    localStorage.setItem(OPEN_SECTION_KEY, 'my-creations');
  } catch (error) {
    console.warn('Could not store My Creations as the open section.', error);
  }

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function loadCareerSave(){
  try{return window.FLSave?await FLSave.load():null}catch(error){console.warn('Could not read Career Mode save.',error);return null}
}
function careerClub(save){return save?.clubs?.find(club=>club.id===save.controlledClubId)||null}
async function renderSaveSlots(){
  const saveGrid=document.getElementById('saveGrid');if(!saveGrid)return;
  const save=await loadCareerSave(),club=careerClub(save);let playerSave=null;try{playerSave=JSON.parse(localStorage.getItem('footballLegacyPlayerCareerV1')||'null')}catch(error){console.warn('Could not read Player Career save.',error)}
  if(!save&&!playerSave){saveGrid.innerHTML=`<article class="save-card empty"><span class="save-number">Career Mode</span><h2 class="empty-label">No Career Saves</h2><p class="empty-copy">Open New Career above to choose a career type and begin.</p></article>`;return}
  const year=String(save?.date||save?.meta?.startYear||'1888').slice(0,4),last=save?.meta?.lastSaved?new Date(save.meta.lastSaved).toLocaleString('en-GB'):'Saved';
  const managerCard=save?`<article class="save-card occupied"><span class="save-number">Manager Career</span><h2>${escapeHtml(club?.name||'Football Legacy Career')}</h2><div class="save-meta"><span>Current year <strong>${escapeHtml(year)}</strong></span><span>Last saved <strong>${escapeHtml(last)}</strong></span></div><a class="action-button primary" href="career-mode/game.html">Continue</a></article>`:'';
  const playerCard=playerSave?`<article class="save-card occupied player-save"><span class="save-number">Player Career</span><h2>${escapeHtml(playerSave.player?.name||`${playerSave.player?.firstName||''} ${playerSave.player?.lastName||''}`.trim()||'Playing Career')}</h2><div class="save-meta"><span>${escapeHtml(playerSave.club?.name||'Unattached')} <strong>${escapeHtml(playerSave.path?.tier||'Player')}</strong></span><span>Age <strong>${escapeHtml(playerSave.player?.age||14)}</strong> · ${escapeHtml(playerSave.records?.totals?.appearances||0)} apps</span></div><a class="action-button primary" href="player-career/game.html">Continue Player Career</a></article>`:'';
  saveGrid.innerHTML=managerCard+playerCard;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setSectionOpen(section, shouldOpen) {
  const button = section.querySelector('.menu-heading');
  const panelId = button.getAttribute('aria-controls');
  const panel = document.getElementById(panelId);

  section.classList.toggle('open', shouldOpen);
  button.setAttribute('aria-expanded', String(shouldOpen));
  panel.hidden = !shouldOpen;
}

function initialiseAccordions() {
  const sections = [...document.querySelectorAll('.menu-section')];

  sections.forEach((section) => {
    const button = section.querySelector('.menu-heading');

    button.addEventListener('click', () => {
      const opening = button.getAttribute('aria-expanded') !== 'true';

      sections.forEach((candidate) => {
        setSectionOpen(candidate, candidate === section ? opening : false);
      });

      try {
        localStorage.setItem(
          OPEN_SECTION_KEY,
          opening ? section.dataset.section : ''
        );
      } catch (error) {
        console.warn('Could not store open menu section.', error);
      }
    });
  });

  let storedSection = '';
  try {
    storedSection = localStorage.getItem(OPEN_SECTION_KEY) || '';
  } catch (error) {
    console.warn('Could not restore open menu section.', error);
  }

  const initialSection = sections.find((section) => section.dataset.section === storedSection);
  if (initialSection) {
    setSectionOpen(initialSection, true);
  }
}

handleCreationReturn();
renderSaveSlots();
renderCreationCounts();
initialiseAccordions();
