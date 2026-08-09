(() => {
  const $ = id => document.getElementById(id);
  const nationalities = ['English','Scottish','Welsh','Northern Irish','Irish','French','Spanish','German','Italian','Portuguese','Dutch','Belgian','Danish','Swedish','Norwegian','Polish','Croatian','Serbian','Turkish','American','Canadian','Mexican','Brazilian','Argentine','Uruguayan','Colombian','Nigerian','Ghanaian','Senegalese','Moroccan','Egyptian','Japanese','Korean','Australian'];
  const nationTeam = {English:'England',Scottish:'Scotland',Welsh:'Wales','Northern Irish':'Northern Ireland',Irish:'Republic of Ireland',French:'France',German:'Germany',Spanish:'Spain',Italian:'Italy',Portuguese:'Portugal',Dutch:'Netherlands',Belgian:'Belgium',Danish:'Denmark',Swedish:'Sweden',Norwegian:'Norway',Polish:'Poland',Croatian:'Croatia',Serbian:'Serbia',Turkish:'Turkey',Brazilian:'Brazil',Argentine:'Argentina',Uruguayan:'Uruguay',American:'United States',Canadian:'Canada',Mexican:'Mexico',Japanese:'Japan',Korean:'South Korea',Nigerian:'Nigeria',Ghanaian:'Ghana',Senegalese:'Senegal',Moroccan:'Morocco',Egyptian:'Egypt',Australian:'Australia',Colombian:'Colombia'};
  const archetypes = {
    GK:['Modern Keeper','Shot Stopper','Commanding Keeper'], FB:['Overlapping Full-back','Defensive Full-back','Inverted Full-back'], HB:['Deep Playmaker','Ball-winning Midfielder','Elegant Centre-half'], W:['Explosive Winger','Wide Playmaker','Inside Winger'], IF:['Creative Number Ten','Box-to-box Creator','Second Striker'], CF:['Complete Forward','Penalty-box Finisher','Pressing Forward']
  };
  const state = { entry:'academy', club:null, archetype:'Complete Forward' };
  const clubs = [...(window.FLClubDatabase?.english || [])].filter(c => Number(c.founded) <= 2026).sort((a,b) => Number(a.tier)-Number(b.tier) || Number(b.prestige)-Number(a.prestige));

  $('nationality').innerHTML = nationalities.map(n => `<option ${n==='English'?'selected':''}>${n}</option>`).join('');
  const leagues = [...new Set(clubs.map(c => c.league))];
  $('leagueFilter').innerHTML += leagues.map(l => `<option value="${l}">${l}</option>`).join('');

  function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
  function renderArchetypes(){
    const rows = archetypes[$('position').value] || archetypes.CF;
    if (!rows.includes(state.archetype)) state.archetype = rows[0];
    $('archetypes').innerHTML = rows.map((name,index) => `<button class="${state.archetype===name?'active':''}" data-archetype="${esc(name)}"><span>${String(index+1).padStart(2,'0')}</span><b>${esc(name)}</b></button>`).join('');
    document.querySelectorAll('[data-archetype]').forEach(button => button.onclick=()=>{state.archetype=button.dataset.archetype;renderArchetypes();updateSummary()});
  }
  function renderClubs(){
    const q=$('clubSearch').value.trim().toLowerCase(),league=$('leagueFilter').value;
    const rows=clubs.filter(c=>(league==='all'||c.league===league)&&(!q||`${c.name} ${c.location} ${c.league}`.toLowerCase().includes(q))).slice(0,80);
    $('academyGrid').innerHTML=rows.map(c=>`<button class="academy-card ${state.club?.id===c.id?'active':''}" data-club="${c.id}"><span class="mini-crest">${esc(c.name.split(/\s+/).map(x=>x[0]).join('').slice(0,3))}</span><span><b>${esc(c.name)}</b><small>${esc(c.location)} · ${esc(c.league)}</small></span><em>${Number(c.prestige)||50}</em></button>`).join('')||'<p class="no-clubs">No clubs match this search.</p>';
    document.querySelectorAll('[data-club]').forEach(button=>button.onclick=()=>{state.club=clubs.find(c=>c.id===button.dataset.club)||null;renderClubs();updateSummary()});
  }
  function updateSummary(){
    const first=$('firstName').value.trim()||'Unnamed',last=$('lastName').value.trim()||'Player',nationality=$('nationality').value;
    $('summaryName').textContent=`${first} ${last}`;$('monogram').textContent=`${first[0]||''}${last[0]||''}`.toUpperCase();
    $('summaryLine').textContent=`${nationality} · ${$('position').value} · ${$('foot').value} foot`;
    $('summaryTier').textContent=state.entry==='academy'?'Academy U14':'Saturday/Sunday grassroots';
    $('summaryClub').textContent=state.entry==='academy'?(state.club?.name||'Choose academy'):'Riverside Juniors';
    $('summaryArchetype').textContent=state.archetype;$('summaryNation').textContent=nationTeam[nationality]||nationality.replace(/ian$/,'y');
  }
  document.querySelectorAll('[data-entry]').forEach(button=>button.onclick=()=>{state.entry=button.dataset.entry;document.querySelectorAll('[data-entry]').forEach(x=>x.classList.toggle('active',x===button));$('academyPanel').hidden=state.entry!=='academy';updateSummary()});
  ['firstName','lastName','nationality','position','foot','height'].forEach(id=>{$(id).addEventListener('input',()=>{if(id==='position')renderArchetypes();updateSummary()});$(id).addEventListener('change',()=>{if(id==='position')renderArchetypes();updateSummary()})});
  $('clubSearch').addEventListener('input',renderClubs);$('leagueFilter').addEventListener('change',renderClubs);
  $('beginCareer').onclick=()=>{
    const firstName=$('firstName').value.trim(),lastName=$('lastName').value.trim();
    if(!firstName||!lastName){$('setupError').textContent='Enter both a first name and surname.';return}
    if(state.entry==='academy'&&!state.club){$('setupError').textContent='Choose the academy where your story begins.';return}
    const config={firstName,lastName,nationality:$('nationality').value,position:$('position').value,foot:$('foot').value,height:Number($('height').value.replace(/\D/g,''))||175,archetype:state.archetype,entry:state.entry,club:state.club};
    const career=FLPlayerCareer.create(config);FLPlayerCareer.save(career);location.href='game.html';
  };
  state.club=clubs.find(c=>c.tier===2)||clubs[0]||null;renderArchetypes();renderClubs();updateSummary();
})();
