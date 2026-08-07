window.FLEraIdentity = (() => {
  const VERSION=27;
  const FACE_COUNTS=Object.freeze({victorian:{male:24,female:8},edwardian:{male:24,female:8},ww1:{male:24,female:8},twenties:{male:24,female:8},thirties:{male:24,female:8},ww2:{male:24,female:8},postwar:{male:24,female:8},sixties:{male:24,female:8},seventies:{male:24,female:8},eighties:{male:24,female:8},nineties:{male:24,female:8},noughties:{male:24,female:8},modern:{male:24,female:8},future:{male:24,female:8}});
  const PLAYER_FACE_START=1888,PLAYER_FACE_END=1909,PLAYER_FACE_COUNT=78,NO_PLAYER_FACE='assets/player-faces/no-face.svg';
  const PLAYER_FACE_RANGES=Object.freeze([
    {start:1888,end:1899,prefix:'1890',folder:'1890s',count:78},
    {start:1900,end:1909,prefix:'1900',folder:'1900s',count:72}
  ]);
  const hash=text=>window.FLPeople?.hash?FLPeople.hash(text):(()=>{let h=2166136261;for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0})();
  const pick=(arr,seed,offset=0)=>arr[(Math.abs(Number(seed)||0)+offset)%arr.length];
  const normaliseNation=n=>String(n||'English').toLowerCase().replace(/[^a-z]/g,'');
  const currentYear=game=>Math.max(1888,Number(String(game?.date||'1888').slice(0,4))||1888);
  const birthYear=(p,year)=>Number(p?.birthYear)||Math.max(1845,(Number(year)||1888)-(Number(p?.age)||22));
  const nameEra=year=>year<1919?'victorian':year<1946?'interwar':year<1966?'postwar':year<1986?'late20':year<2005?'millennium':'modern';
  const portraitEra=year=>year<1902?'victorian':year<1915?'edwardian':year<1919?'ww1':year<1930?'twenties':year<1939?'thirties':year<1946?'ww2':year<1960?'postwar':year<1970?'sixties':year<1980?'seventies':year<1990?'eighties':year<2000?'nineties':year<2010?'noughties':year<2027?'modern':'future';
  const genderKey=value=>/female|woman|girl/i.test(String(value||''))?'female':'male';
  const ageBand=age=>Number(age)<20?'teen':Number(age)<28?'young':Number(age)<36?'prime':Number(age)<50?'veteran':'senior';

  const ENGLISH={
    victorian:{male:['Albert','Alfred','Arthur','Benjamin','Charles','Edgar','Edmund','Edwin','Ernest','Frederick','George','Harold','Harry','Henry','Herbert','Isaac','James','John','Joseph','Samuel','Thomas','Walter','William'],female:['Ada','Alice','Beatrice','Clara','Edith','Eleanor','Elizabeth','Ethel','Florence','Grace','Harriet','Lillian','Louisa','Margaret','Mary','Martha','Rose','Sarah'],last:['Ashworth','Bennett','Brown','Cartwright','Chambers','Clarke','Cooper','Davies','Fletcher','Greenwood','Harris','Hughes','Mason','Roberts','Smith','Taylor','Walker','Ward','Wilkinson','Wilson','Wood']},
    interwar:{male:['Albert','Alf','Arthur','Bert','Billy','Charlie','Cliff','Cyril','Ernie','Frank','Fred','George','Harry','Jack','Joe','Len','Reg','Stan','Tom','Walter'],female:['Alice','Betty','Dorothy','Edith','Elsie','Evelyn','Florence','Gladys','Irene','Joan','Kathleen','Margaret','Marjorie','Mary','Vera','Winifred'],last:['Barker','Brown','Carter','Cook','Dawson','Edwards','Evans','Harrison','Jackson','Morris','Robinson','Shaw','Smith','Thompson','Turner','Walker','Williams','Wilson','Wright']},
    postwar:{male:['Alan','Bobby','Brian','Colin','David','Dennis','Eric','Frank','Geoff','George','Gordon','Jimmy','John','Keith','Les','Peter','Ray','Ron','Terry','Tony'],female:['Ann','Barbara','Brenda','Carol','Christine','Diane','Elaine','Janet','Jean','Jill','Linda','Margaret','Maureen','Patricia','Sandra','Susan'],last:['Allen','Baker','Banks','Bell','Charlton','Cooper','Davies','Edwards','Harris','Hill','Hughes','Jones','Lee','Moore','Roberts','Smith','Taylor','Thompson','Wilson','Young']},
    late20:{male:['Andy','Chris','Darren','David','Dean','Gary','Graham','Ian','Jason','John','Kevin','Lee','Mark','Michael','Neil','Paul','Peter','Rob','Simon','Steve'],female:['Amanda','Angela','Claire','Deborah','Donna','Emma','Fiona','Helen','Jane','Julie','Karen','Lisa','Michelle','Nicola','Rachel','Sarah','Sharon','Tracey'],last:['Adams','Brown','Campbell','Clarke','Cole','Davis','Edwards','Green','Hall','Johnson','Jones','Kelly','Martin','Miller','Phillips','Robinson','Smith','Taylor','Walker','Williams']},
    millennium:{male:['Adam','Ashley','Ben','Callum','Chris','Daniel','David','Gareth','James','Jamie','Joe','Jonathan','Lee','Luke','Matt','Michael','Nathan','Ryan','Scott','Steven'],female:['Amy','Charlotte','Chloe','Danielle','Emily','Emma','Hannah','Jade','Jennifer','Jessica','Katie','Laura','Lauren','Lucy','Natalie','Rebecca','Samantha','Sophie'],last:['Brown','Campbell','Carter','Cole','Davies','Dawson','Foster','Green','Henderson','James','Johnson','Jones','King','Richards','Smith','Taylor','Terry','Walker','Young']},
    modern:{male:['Aaron','Alex','Archie','Ben','Callum','Charlie','Declan','Elliot','Finley','George','Harvey','Isaac','Jacob','Jamal','James','Jayden','Jude','Kai','Lewis','Mason','Morgan','Noah','Oliver','Reece','Sam','Tyler'],female:['Aaliyah','Amelia','Ava','Charlotte','Ella','Emily','Evie','Freya','Grace','Isla','Layla','Lily','Maisie','Maya','Mia','Olivia','Poppy','Sienna','Sophie','Zara'],last:['Adebayo','Alexander','Anderson','Brown','Campbell','Clarke','Davies','Edwards','Foster','Gordon','Gray','Greenwood','Hall','Henderson','James','Johnson','Jones','Kelly','Lewis','Mitchell','Palmer','Robinson','Smith','Taylor','Walker','Williams']}
  };

  const NATIONAL={
    scottish:{male:['Alasdair','Angus','Callum','Craig','Duncan','Ewan','Finlay','Fraser','Gordon','Jamie','Kieran','Lewis','Scott'],female:['Ailsa','Catriona','Eilidh','Fiona','Isla','Kirsty','Mairi','Morag','Rhona'],last:['Campbell','Clark','Ferguson','Fraser','Gordon','MacDonald','McGregor','McKay','Murray','Robertson','Stewart']},
    welsh:{male:['Aled','Bryn','Carwyn','Dafydd','Gareth','Gethin','Gruff','Ieuan','Owain','Rhys'],female:['Bethan','Carys','Cerys','Eleri','Ffion','Gwen','Lowri','Nia','Seren'],last:['Davies','Evans','Griffiths','Hughes','Jenkins','Jones','Lewis','Morgan','Owen','Price','Rees','Roberts','Thomas','Williams']},
    irish:{male:['Aidan','Ciaran','Conor','Declan','Liam','Niall','Patrick','Ronan','Sean'],female:['Aoife','Ciara','Eimear','Fiona','Maeve','Niamh','Orla','Roisin','Saoirse'],last:['Byrne','Doyle','Kelly','Murphy','OBrien','OConnor','Quinn','Ryan','Walsh']},
    spanish:{male:['Alejandro','Carlos','Dani','Diego','Fernando','Javier','Jorge','Luis','Manuel','Miguel','Pablo','Sergio'],female:['Alba','Ana','Carmen','Clara','Elena','Isabel','Laura','Lucia','Marta','Sofia'],last:['Alonso','Garcia','Gomez','Gonzalez','Hernandez','Lopez','Martinez','Moreno','Navarro','Perez','Ramos','Sanchez']},
    italian:{male:['Alessandro','Andrea','Carlo','Davide','Federico','Francesco','Gianluca','Lorenzo','Marco','Matteo','Paolo','Stefano'],female:['Alessia','Chiara','Elena','Francesca','Giulia','Lucia','Martina','Sara','Sofia','Valentina'],last:['Bianchi','Colombo','Conti','De Luca','Esposito','Ferrari','Gallo','Mancini','Moretti','Ricci','Romano','Rossi']},
    french:{male:['Adrien','Antoine','Benoit','Christophe','Didier','Etienne','Hugo','Jean','Julien','Laurent','Mathieu','Olivier','Theo'],female:['Amelie','Camille','Charlotte','Chloe','Claire','Elise','Juliette','Lea','Manon','Sophie'],last:['Bernard','Blanc','Dubois','Fontaine','Girard','Lefevre','Leroy','Martin','Mercier','Moreau','Petit','Roux']},
    portuguese:{male:['Andre','Bruno','Diogo','Fernando','Goncalo','Joao','Luis','Miguel','Nuno','Paulo','Pedro','Rafael','Tiago'],female:['Ana','Beatriz','Carolina','Catarina','Ines','Joana','Mariana','Rita','Sofia'],last:['Almeida','Carvalho','Costa','Fernandes','Ferreira','Gomes','Lopes','Martins','Oliveira','Pereira','Santos','Silva']},
    brazilian:{male:['Adriano','Bruno','Caio','Carlos','Danilo','Diego','Gabriel','Joao','Lucas','Marcos','Matheus','Rafael','Renato','Thiago','Vinicius'],female:['Amanda','Beatriz','Camila','Fernanda','Gabriela','Isabela','Juliana','Larissa','Mariana','Rafaela'],last:['Alves','Barbosa','Costa','Lima','Mendes','Oliveira','Pereira','Rocha','Rodrigues','Santos','Silva','Souza']},
    argentinian:{male:['Alejandro','Diego','Emiliano','Facundo','Federico','Gonzalo','Javier','Julian','Lautaro','Lionel','Matias','Nicolas'],female:['Agustina','Camila','Carla','Florencia','Julieta','Luciana','Martina','Sofia'],last:['Acosta','Alvarez','Diaz','Fernandez','Gimenez','Gonzalez','Lopez','Martinez','Rodriguez','Romero','Sanchez']},
    german:{male:['Andreas','Bastian','Felix','Florian','Hans','Julian','Kai','Karl','Leon','Lukas','Matthias','Michael','Thomas'],female:['Anna','Clara','Franziska','Hannah','Julia','Katharina','Lea','Lena','Lisa','Sophie'],last:['Bauer','Becker','Fischer','Hoffmann','Klein','Koch','Meyer','Muller','Richter','Schmidt','Schneider','Schulz','Weber','Wolf']},
    dutch:{male:['Arjen','Daan','Dennis','Frenkie','Johan','Joris','Koen','Luuk','Marco','Matthijs','Ruben','Sven'],female:['Anne','Eva','Femke','Iris','Lieke','Lotte','Marit','Sanne','Sophie'],last:['Bakker','De Boer','De Jong','De Vries','Jansen','Kuipers','Meijer','Smit','Van Dijk','Van Leeuwen','Visser']},
    nigerian:{male:['Chinedu','Daniel','Emeka','Ibrahim','Kelechi','Musa','Obinna','Samuel','Tunde','Victor'],female:['Adaeze','Amara','Blessing','Chioma','Esther','Ngozi','Temi'],last:['Adeyemi','Afolayan','Balogun','Eze','Iheanacho','Musa','Nwosu','Okafor','Okeke','Onyeka']},
    ghanaian:{male:['Daniel','Emmanuel','Joseph','Kofi','Kwame','Mohammed','Samuel','Yaw'],female:['Abena','Adwoa','Akosua','Ama','Efua','Yaa'],last:['Addo','Agyemang','Asare','Boateng','Mensah','Ofori','Owusu']},
    japanese:{male:['Daichi','Haruto','Hiroki','Kaito','Kenji','Riku','Sota','Takumi','Yuki'],female:['Aiko','Hana','Haruka','Mio','Rin','Sakura','Yui'],last:['Endo','Ito','Kato','Kobayashi','Nakamura','Saito','Suzuki','Takahashi','Tanaka','Yamamoto']},
    polish:{male:['Adam','Jakub','Kamil','Lukasz','Maciej','Mateusz','Michal','Piotr','Tomasz'],female:['Agnieszka','Anna','Ewa','Joanna','Katarzyna','Magdalena','Marta'],last:['Dabrowski','Kaminski','Kowalski','Krawczyk','Lewandowski','Nowak','Wojcik','Zielinski']},
    turkish:{male:['Ahmet','Burak','Can','Emre','Hakan','Kerem','Mehmet','Mert','Ozan'],female:['Aylin','Deniz','Elif','Eylul','Selin','Zeynep'],last:['Aydin','Celik','Demir','Kaya','Koc','Ozdemir','Sahin','Yildiz']},
    chinese:{male:['Bo','Chen','Hao','Jian','Jun','Lei','Ming','Peng','Tao','Wei','Xiang','Yang'],female:['Fang','Hua','Jing','Lan','Li','Mei','Xia','Yan'],last:['Chen','Huang','Li','Liu','Sun','Wang','Wu','Xu','Yang','Zhang','Zhao']},
    saudiarabian:{male:['Abdullah','Ahmed','Fahad','Faisal','Hassan','Khalid','Mohammed','Nasser','Omar','Salem','Saud','Yasser'],female:['Aisha','Amal','Hala','Lina','Maha','Noura','Reem','Sara'],last:['Al-Dawsari','Al-Faraj','Al-Ghamdi','Al-Harbi','Al-Hassan','Al-Qahtani','Al-Shehri','Al-Shammari']}
  };
  const aliases={english:'english',england:'english',british:'english',scotland:'scottish',scottish:'scottish',wales:'welsh',welsh:'welsh',northernirish:'irish',ireland:'irish',spanish:'spanish',spain:'spanish',italy:'italian',italian:'italian',france:'french',french:'french',portugal:'portuguese',brazil:'brazilian',argentina:'argentinian',germany:'german',netherlands:'dutch',holland:'dutch',nigeria:'nigerian',ghana:'ghanaian',japan:'japanese',poland:'polish',turkey:'turkish',china:'chinese',saudi:'saudiarabian',saudiarabia:'saudiarabian'};

  function poolFor(nationality,year,gender='male'){
    const key=aliases[normaliseNation(nationality)]||normaliseNation(nationality),g=genderKey(gender);
    if(key==='english'){const pool=ENGLISH[nameEra(year)]||ENGLISH.modern;return {first:pool[g]||pool.male,last:pool.last};}
    const pool=NATIONAL[key];if(pool)return {first:pool[g]||pool.male,last:pool.last};
    const timeline=window.FLTimelineData?.namePools?.[nationality];if(timeline?.first?.length&&timeline?.last?.length)return timeline;
    const fallback=ENGLISH[nameEra(year)]||ENGLISH.modern;return {first:fallback[g]||fallback.male,last:fallback.last};
  }
  function generatedName(nationality,year,seed,gender='male'){const pool=poolFor(nationality,year,gender);return `${pick(pool.first,seed,11)} ${pick(pool.last,seed,47)}`;}
  const REAL_ASSETS=Array.isArray(window.FLRealPortraitCatalog?.assets)?window.FLRealPortraitCatalog.assets:[];
  const REAL_BY_ID=new Map(REAL_ASSETS.map(asset=>[asset.id,asset]));
  const ERA_KEYS=['1890s','1900s','1910s','1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s','2020s','future'];
  const eraKeyFor=year=>{const y=Number(year)||1888;return y<1900?'1890s':y<1910?'1900s':y<1920?'1910s':y<1930?'1920s':y<1940?'1930s':y<1950?'1940s':y<1960?'1950s':y<1970?'1960s':y<1980?'1970s':y<1990?'1980s':y<2000?'1990s':y<2010?'2000s':y<2020?'2010s':y<2050?'2020s':'future';};
  const weighted=(rows,roll)=>{let cursor=0;for(const [key,weight] of rows){cursor+=weight;if(roll<cursor)return key}return rows.at(-1)?.[0]||'european'};
  const AFRICAN=new Set(['nigeria','nigerian','ghana','ghanaian','senegal','cameroon','ivorycoast','cotedivoire','mali','guinea','gambia','sierra leone','sierraleone','liberia','congo','drcongo','angola','zambia','zimbabwe','southafrica','kenya','uganda','tanzania','ethiopia','jamaica','trinidadandtobago','barbados','haiti']);
  const EAST_ASIAN=new Set(['japan','japanese','china','chinese','southkorea','korea','korean','northkorea','taiwan','hongkong','vietnam','vietnamese','thailand','thai']);
  const SOUTH_ASIAN=new Set(['india','indian','pakistan','pakistani','bangladesh','bangladeshi','srilanka','srilankan','nepal','nepali','afghanistan','afghan']);
  const LATIN=new Set(['brazil','brazilian','argentina','argentinian','uruguay','uruguayan','colombia','colombian','chile','chilean','peru','peruvian','ecuador','ecuadorian','paraguay','paraguayan','bolivia','bolivian','venezuela','venezuelan','mexico','mexican','costarica','panama']);
  const MEDITERRANEAN=new Set(['italy','italian','spain','spanish','portugal','portuguese','greece','greek','turkey','turkish','cyprus','croatia','serbia','bosnia','albania','morocco','moroccan','algeria','algerian','tunisia','tunisian','egypt','egyptian','lebanon','lebanese','israel','israeli','palestine','palestinian','saudiarabia','saudiarabian','iran','iranian','iraq','iraqi','syria','syrian']);
  function appearanceGroupFor(subject={},year=2026,seed=0){
    const nation=normaliseNation(subject.nationality||subject.country||subject.birthNation||'English');
    const roll=Math.abs(Number(seed)||hash(`${subject.id||subject.name||'person'}-${year}`))%1000;
    if(AFRICAN.has(nation))return 'black';
    if(EAST_ASIAN.has(nation))return 'east_asian';
    if(SOUTH_ASIAN.has(nation))return 'south_asian';
    if(LATIN.has(nation)){
      if(['brazil','brazilian','colombia','colombian','ecuador','ecuadorian'].includes(nation))return weighted([['latin',560],['black',360],['mediterranean',80]],roll);
      return weighted([['latin',820],['mediterranean',150],['black',30]],roll);
    }
    if(MEDITERRANEAN.has(nation)){
      const modern=Number(year)>=1980;
      return weighted(modern?[['mediterranean',900],['black',65],['south_asian',35]]:[['mediterranean',970],['european',30]],roll);
    }
    if(['france','french'].includes(nation))return Number(year)<1960?'european':weighted([['european',650],['black',190],['mediterranean',150],['south_asian',10]],roll);
    if(['netherlands','dutch','holland','belgium','belgian'].includes(nation))return Number(year)<1970?'european':weighted([['european',760],['black',160],['mediterranean',60],['south_asian',20]],roll);
    if(['germany','german','austria','austrian','switzerland','swiss'].includes(nation))return Number(year)<1980?'european':weighted([['european',820],['mediterranean',120],['black',40],['south_asian',20]],roll);
    if(['unitedstates','usa','american','canada','canadian'].includes(nation))return weighted([['european',560],['black',260],['latin',100],['east_asian',45],['south_asian',35]],roll);
    if(['england','english','british','scotland','scottish','wales','welsh','ireland','irish','northernireland','northernirish'].includes(nation)){
      const y=Number(year)||1888;
      if(y<1948)return weighted([['european',996],['black',3],['mediterranean',1]],roll);
      if(y<1970)return weighted([['european',958],['black',24],['mediterranean',10],['south_asian',7],['east_asian',1]],roll);
      if(y<1990)return weighted([['european',875],['black',80],['mediterranean',22],['south_asian',18],['east_asian',3],['latin',2]],roll);
      if(y<2010)return weighted([['european',735],['black',165],['south_asian',45],['mediterranean',35],['latin',12],['east_asian',8]],roll);
      return weighted([['european',665],['black',205],['south_asian',62],['mediterranean',38],['latin',18],['east_asian',12]],roll);
    }
    return 'european';
  }
  function candidateAssets(group,era){
    let rows=REAL_ASSETS.filter(asset=>asset.group===group&&asset.eras?.includes(era));
    // Prefer portraits built for the narrowest period range. This keeps period grooming
    // (especially moustaches, sideburns and long hair) from leaking into the wrong decades.
    if(rows.length){const shortest=Math.min(...rows.map(asset=>Math.max(1,asset.eras?.length||99)));const precise=rows.filter(asset=>Math.max(1,asset.eras?.length||99)===shortest);return precise.length?precise:rows;}
    const target=Math.max(0,ERA_KEYS.indexOf(era));
    const same=REAL_ASSETS.filter(asset=>asset.group===group);
    if(same.length){
      const distance=asset=>Math.min(...(asset.eras||['2020s']).map(x=>Math.abs(ERA_KEYS.indexOf(x)-target)));
      const best=Math.min(...same.map(distance));rows=same.filter(asset=>distance(asset)===best);
      if(rows.length)return rows;
    }
    rows=REAL_ASSETS.filter(asset=>asset.group==='european'&&asset.eras?.includes(era));
    return rows.length?rows:REAL_ASSETS;
  }
  function descriptorFor(subject={},year=2026,options={}){
    const assignedYear=Number(options.assignedYear||subject.faceAssignedYear||subject.generatedYear||subject.youthIntakeYear||subject.birthYear+18||year)||1888;
    const seed=Math.abs(Number(subject.identitySeed||subject.appearanceSeed)||hash(subject.id||subject.name||'person'));
    const era=eraKeyFor(assignedYear),group=appearanceGroupFor(subject,assignedYear,seed);
    const rows=candidateAssets(group,era);
    const asset=rows.length?rows[seed%rows.length]:null;
    return {asset,id:asset?.id||'',path:asset?.path||NO_PLAYER_FACE,era,group,index:rows.length?(seed%rows.length)+1:0,count:rows.length,assignedYear};
  }
  function validAssetId(id){return REAL_BY_ID.has(String(id||''));}
  function faceNumber(subject,year=2026){return descriptorFor(subject,year).index||1;}
  function toneFor(subject={},year=2026){
    const explicit=String(subject.skinTone||subject.faceConfig?.skin||'').toLowerCase();
    if(['light','fair','medium','tan','deep','dark'].includes(explicit))return explicit==='fair'?'light':explicit;
    const group=subject.appearanceGroup||appearanceGroupFor(subject,year,subject.identitySeed||subject.appearanceSeed);
    return group==='black'?'dark':group==='south_asian'?'tan':group==='east_asian'?'medium':group==='latin'?'tan':group==='mediterranean'?'medium':'light';
  }
  function portraitStage(subject){const age=Number(subject?.age)||30;return age<30?'young':age<50?'prime':'senior';}
  function historicalPortraitYear(subject,fallback=2026){const explicit=Number(subject?.portraitLockedYear||subject?.portraitYear||subject?.lastActiveYear||subject?.retirementYear||subject?.careerEndYear||subject?.deathYear);return Number.isFinite(explicit)&&explicit>=1888?explicit:Number(fallback)||2026;}
  function playerFaceRange(year){const era=eraKeyFor(year),count=REAL_ASSETS.filter(a=>a.eras?.includes(era)).length;return {start:Number(year)||1888,end:Number(year)||1888,prefix:'rp',folder:'real-portraits',count,era};}
  function assignedFaceNumber(subject={},year){return descriptorFor(subject,year).index||1;}
  function facePath(id){return REAL_BY_ID.get(String(id||''))?.path||NO_PLAYER_FACE;}
  function inApprovedFaceEra(year){return Number(year)>=1888&&REAL_ASSETS.length>0;}
  function portraitFor(subject,year=2026,options={}){
    if(!subject||typeof subject!=='object')return NO_PLAYER_FACE;
    const override=String(subject.portraitOverride||subject.customPortrait||subject.portraitPath||'').trim();
    if(override)return override;
    const picturedYear=Number(options.lockedYear||historicalPortraitYear(subject,year))||2026;
    const assignedYear=Number(subject.faceAssignedYear||String(subject.appointedDate||subject.appointedYear||'').slice(0,4)||subject.generatedYear||subject.youthIntakeYear||subject.birthYear+18||picturedYear)||picturedYear;
    if(genderKey(subject.gender)==='female'){
      const role=String(options.role||subject.portraitRole||subject.role||'').toLowerCase();
      if(/coach|staff|assistant|trainer/.test(role)){
        const approved=['elegant_braided_portrait_with_gold_pendant.webp','curly_haired_woman_in_a_warm_studio_portrait.webp','freckled_auburn_portrait_with_gold_accents.webp','warm_beige_studio_headshot.webp','elegant_studio_portrait_of_a_young_woman.webp','polished_blonde_bun_headshot.webp','warm_toned_studio_portrait_of_a_young_woman.webp','warm_curly_haired_professional_headshot.webp','warm_studio_portrait_of_a_confident_woman.webp','warm_studio_portrait_of_a_smiling_woman.webp'];
        const seed=Math.abs(Number(subject.identitySeed||subject.appearanceSeed)||hash(subject.id||subject.name||'female-staff'));
        return `assets/family-portraits/partners/${approved[seed%approved.length]}`;
      }
      const era=portraitEra(assignedYear),number=String(faceNumber(subject,assignedYear)%8||1).padStart(3,'0'),stage=portraitStage(subject);
      return `assets/era-face-pool/${era}/female/face-${number}-${stage}.jpg`;
    }
    if(!validAssetId(subject.faceAssetId||subject.managerFaceAssetId)){
      const d=descriptorFor(subject,assignedYear,{assignedYear});
      subject.faceAssetId=d.id;subject.managerFaceAssetId=/manager|coach|staff|director|chair/i.test(String(options.role||subject.portraitRole||subject.role||''))?d.id:subject.managerFaceAssetId;
      subject.appearanceGroup=d.group;subject.portraitEra=d.era;subject.faceAssignedYear=assignedYear;
    }
    return facePath(subject.faceAssetId||subject.managerFaceAssetId);
  }
  function portraitOptions(year=1888,nationality='England',count=10){
    const rows=[],used=new Set();
    for(let i=0;i<Math.max(1,count);i++){
      const subject={id:`manager-option-${year}-${nationality}-${i}`,name:`Manager ${i}`,nationality,gender:'male',identitySeed:hash(`${year}-${nationality}-${i*7919}`),faceAssignedYear:Number(year)||1888,age:[35,41,38,45,55,48,42,50,36,44][i%10]};
      let d=descriptorFor(subject,year);let guard=0;
      while(used.has(d.id)&&guard++<40){subject.identitySeed+=104729;d=descriptorFor(subject,year)}
      used.add(d.id);rows.push({id:i+1,age:subject.age,faceAssetId:d.id,image:d.path,year:Number(year)||1888,appearanceGroup:d.group});
    }
    return rows;
  }
  function shouldRename(player,birth){
    if(player.identityNameLocked||player.userCreated)return false;
    if(Number(player.identityVersion)>=VERSION)return false;
    const current=String(player.name||'').trim();if(!current)return true;
    const generated=Number(player.generatedYear||player.youthIntakeYear||0);
    if(generated>=1980||birth>=1970)return true;
    const legacyFirst=new Set([...(window.FLData?.firstNames||[]),...ENGLISH.victorian.male]);
    return birth>=1960&&legacyFirst.has(current.split(/\s+/)[0]);
  }
  function applyPlayer(game,player,year=currentYear(game),options={}){
    if(!player||typeof player!=='object')return player;
    player.identitySeed=Number(player.identitySeed)||hash(`${game?.meta?.worldSeed||game?.meta?.seed||1}-${player.id||player.name||'person'}`);
    player.gender=genderKey(player.gender);player.birthYear=birthYear(player,year);
    const namingYear=Number(player.birthYear)+18;if(options.forceName||shouldRename(player,player.birthYear))player.name=generatedName(player.nationality||'English',namingYear,player.identitySeed,player.gender);
    if(window.FLPeople&&game?.clubs){const person=FLPeople.ensurePlayer(game,player,(game.clubs||[]).find(c=>(c.players||[]).includes(player)));if(person){player.identitySeed=person.appearanceSeed;player.appearanceIndex=person.appearanceIndex||player.appearanceIndex||0;}}
    const picturedYear=options.active===false?historicalPortraitYear(player,year):Number(options.portraitYear)||Number(year)||2026;if(options.active===false&&!player.portraitLockedYear)player.portraitLockedYear=picturedYear;
    const firstTeamYear=Number(player.faceAssignedYear||player.generatedYear||player.youthIntakeYear||player.birthYear+18||picturedYear)||picturedYear;
    player.faceAssignedYear=firstTeamYear;
    if(player.gender==='male'&&(Number(player.identityVersion)<VERSION||!validAssetId(player.faceAssetId))){const d=descriptorFor(player,firstTeamYear,{assignedYear:firstTeamYear});player.faceAssetId=d.id;player.appearanceGroup=d.group;player.portraitEra=d.era;}
    player.face=portraitFor(player,picturedYear,{lockedYear:picturedYear,role:'player'});player.portrait=player.face;player.skinTone=toneFor(player,firstTeamYear);player.portraitAgeBand=ageBand(player.age);player.portraitStage=portraitStage(player);player.identityVersion=VERSION;return player;
  }
  function applyManager(game,manager,year=currentYear(game),options={}){
    if(!manager||typeof manager!=='object')return manager;
    manager.identitySeed=Number(manager.identitySeed)||hash(`${game?.meta?.worldSeed||game?.meta?.seed||1}-${manager.id||manager.firstName||''}-${manager.lastName||'manager'}`);manager.gender=genderKey(manager.gender);manager.birthYear=Number(manager.birthYear)||Math.max(1820,(Number(year)||1888)-(Number(manager.age)||42));manager.portraitRole='manager';
    const appointmentYear=Number(manager.faceAssignedYear||String(manager.appointedDate||manager.appointedYear||year).slice(0,4))||Number(year)||1888;manager.faceAssignedYear=appointmentYear;
    if(manager.gender==='male'&&(Number(manager.identityVersion)<VERSION||!validAssetId(manager.faceAssetId||manager.managerFaceAssetId))){const d=descriptorFor(manager,appointmentYear,{assignedYear:appointmentYear});manager.faceAssetId=d.id;manager.managerFaceAssetId=d.id;manager.appearanceGroup=d.group;manager.portraitEra=d.era;}
    manager.portrait=portraitFor(manager,year,{role:'manager',lockedYear:options.lockedYear||appointmentYear});manager.managerPortraitAsset=manager.portrait;manager.skinTone=toneFor(manager,appointmentYear);manager.identityVersion=VERSION;return manager;
  }
  function applyPerson(game,person,year=currentYear(game),options={}){if(!person||typeof person!=='object')return person;person.identitySeed=Number(person.identitySeed||person.appearanceSeed)||hash(`${game?.meta?.worldSeed||1}-${person.id||person.name||'person'}`);person.gender=genderKey(person.gender);const picturedYear=options.active===false?historicalPortraitYear(person,year):Number(year)||2026;person.age=Math.max(0,picturedYear-Number(person.birthYear||picturedYear-30));person.faceAssignedYear=Number(person.faceAssignedYear||person.birthYear+25||picturedYear)||picturedYear;if(person.gender==='male'&&(Number(person.identityVersion)<VERSION||!validAssetId(person.faceAssetId))){const d=descriptorFor(person,person.faceAssignedYear,{assignedYear:person.faceAssignedYear});person.faceAssetId=d.id;person.appearanceGroup=d.group;person.portraitEra=d.era;}person.face=portraitFor(person,picturedYear,{lockedYear:picturedYear,role:person.role});person.portrait=person.face;person.identityVersion=VERSION;return person;}
  function newPlayer(game,player,year=currentYear(game)){return applyPlayer(game,player,year,{forceName:true,active:true});}
  function refreshAll(game,year=currentYear(game)){
    const seen=new Set(),active=p=>{if(!p||seen.has(p))return;seen.add(p);applyPlayer(game,p,year,{active:true})},archived=p=>{if(!p||seen.has(p))return;seen.add(p);const locked=historicalPortraitYear(p,Number(p?.retirementYear||p?.lastActiveYear||year));applyPlayer(game,p,locked,{active:false,portraitYear:locked})};
    (game?.clubs||[]).forEach(c=>{(c.players||[]).forEach(p=>{if(!p.clubId)p.clubId=c.id;active(p)});if(c.managerProfile)applyManager(game,c.managerProfile,year)});(game?.freeAgents||[]).forEach(active);(game?.globalPlayers||[]).forEach(active);if(window.FLWorldFootball)try{FLWorldFootball.players(game).forEach(x=>active(x.p))}catch{};(game?.retiredPlayers||[]).forEach(archived);(game?.worldFootball?.retiredPlayers||[]).forEach(archived);(game?.youthAcademy?.players||[]).forEach(active);if(game?.manager)applyManager(game,game.manager,year);if(window.FLPeople)FLPeople.all(game).forEach(p=>applyPerson(game,p,p.active===false?historicalPortraitYear(p,year):year,{active:p.active!==false}));return seen.size;
  }
  return {VERSION,FACE_COUNTS,nameEra,portraitEra,eraKeyFor,poolFor,generatedName,portraitFor,portraitOptions,applyPlayer,applyManager,applyPerson,newPlayer,refreshAll,currentYear,ageBand,genderKey,faceNumber,toneFor,portraitStage,historicalPortraitYear,assignedFaceNumber,facePath,inApprovedFaceEra,playerFaceRange,appearanceGroupFor,descriptorFor,validAssetId};
})();
