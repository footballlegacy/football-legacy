window.FLFamilyPortraits = (() => {
  const hash = text => { let h=2166136261; for(const c of String(text||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);} return h>>>0; };
  const yearOf = game => Number(String(game?.date||'1888').slice(0,4))||1888;
  function genderOf(person){return /female|woman|girl|daughter/i.test(String(person?.gender||person?.role||''))?'female':'male';}
  function portrait(game,person,ageOverride=null){
    const hasExplicitAge=ageOverride!==null&&ageOverride!==undefined&&ageOverride!==''&&Number.isFinite(Number(ageOverride));
    const age=hasExplicitAge?Number(ageOverride):Math.max(0,yearOf(game)-Number(person?.birthYear||yearOf(game)-30));
    const gender=genderOf(person),seed=hash(person?.id||person?.personId||person?.name||`${gender}-${age}`);
    if(age<=4)return `assets/family-portraits/infant-${gender}.svg`;
    if(age<=9)return `assets/family-portraits/child-${gender}.svg`;
    if(age<=12)return `assets/family-portraits/preteen-${gender}.svg`;
    if(age<=15)return `assets/family-portraits/teen-${gender}-${seed%2+1}.webp`;
    return window.FLEraIdentity?FLEraIdentity.portraitFor({...person,age,identitySeed:person?.appearanceSeed||person?.portraitSeed||person?.identitySeed},yearOf(game),{role:'family'}):'';
  }
  function interactionBand(age){
    const n=Number(age)||0;
    if(n<=4)return 'too-young';
    if(n<=9)return 'simple';
    if(n<=12)return 'basic';
    if(n<=15)return 'teen';
    return 'adult';
  }
  return {portrait,interactionBand};
})();
