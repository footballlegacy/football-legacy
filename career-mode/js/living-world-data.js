window.FLLivingWorldData = (() => {
  const potentialBands = [
    {id:'limited',min:0,label:'Limited outlook',short:'LIMITED',description:'The staff doubt he will rise far above his present level.'},
    {id:'squad',min:66,label:'Squad-level prospect',short:'SQUAD',description:'He looks capable of becoming a dependable member of a senior squad.'},
    {id:'good',min:74,label:'Strong prospect',short:'STRONG',description:'There is a realistic path towards becoming a very good first-team player.'},
    {id:'outstanding',min:82,label:'Outstanding prospect',short:'OUTSTANDING',description:'He has the tools to become one of the leading players in the division.'},
    {id:'world-class',min:89,label:'World-class potential',short:'WORLD CLASS',description:'The staff believe he could eventually belong among the finest players in the world.'},
    {id:'generational',min:95,label:'Generational potential',short:'GENERATIONAL',description:'Football produces very few players with this level of natural possibility.'},
    {id:'historic',min:98,label:'All-time potential',short:'ALL-TIME',description:'The most optimistic reports believe he could enter the argument among the greatest ever.'}
  ];

  const boardTopics = [
    {id:'recruitment-control',title:'Recruitment authority',detail:'Ask for a greater say over who the club buys, sells and scouts.',minYear:1888,minTrust:45,cooldown:180,
      options:[
        {id:'demand',label:'Demand final authority',tone:'Forceful',effects:{board:-6,football:5,control:18},replyLow:'The chairman reminds you that the committee appoints the manager, not the other way around.',replyHigh:'The board reluctantly agrees that your results have earned unusual authority.'},
        {id:'case',label:'Present a detailed football case',tone:'Professional',effects:{board:3,football:6,control:12},replyLow:'The football director likes the plan, though the chairman wants proof before surrendering control.',replyHigh:'The committee accepts your case and grants a wider recruitment brief.'},
        {id:'trial',label:'Request a one-season trial',tone:'Diplomatic',effects:{board:4,control:8},replyLow:'A limited trial is accepted, with every major fee still requiring approval.',replyHigh:'The chairman agrees to a full season under your recommended structure.'},
        {id:'withdraw',label:'Leave the structure unchanged',tone:'Cautious',effects:{board:1},replyLow:'The committee appreciates that you understand the limits of your office.',replyHigh:'Several directors are surprised you did not press your advantage.'}
      ]},
    {id:'youth-pathway',title:'Youth pathway',detail:'Ask the board to protect places for academy players and improve youth coaching.',minYear:1888,minTrust:35,cooldown:150,
      options:[
        {id:'guarantee',label:'Guarantee academy opportunities',tone:'Idealistic',effects:{board:1,local:7,football:-2,youth:10},replyLow:'The directors support the principle but refuse to dictate team selection.',replyHigh:'The board endorses a formal academy pathway and funds additional coaching.'},
        {id:'investment',label:'Request targeted investment',tone:'Practical',effects:{board:3,treasurer:-2,youth:8},replyLow:'The treasurer trims the request to a modest coaching allowance.',replyHigh:'The committee approves the programme and asks you to report on each intake.'},
        {id:'local',label:'Prioritise local youngsters',tone:'Traditional',effects:{board:2,local:9,youth:5},replyLow:'The local director supports you, although the football director warns against sentimentality.',replyHigh:'The club formally adopts a local-development identity.'},
        {id:'results',label:'Only use youngsters when ready',tone:'Results-first',effects:{board:1,football:4,local:-3},replyLow:'The committee accepts the argument, but supporters may see a closed pathway.',replyHigh:'The board trusts your judgement and removes informal appearance targets.'}
      ]},
    {id:'ticket-prices',title:'Ticket prices and supporters',detail:'Discuss affordability, gate income and the relationship with local supporters.',minYear:1888,minTrust:25,cooldown:120,
      options:[
        {id:'lower',label:'Push for cheaper admission',tone:'Supporter-first',effects:{board:1,local:8,treasurer:-6,supporters:8,income:-20},replyLow:'The treasurer blocks a major cut but accepts reduced prices for children and workers.',replyHigh:'The board follows your recommendation and accepts a short-term loss in receipts.'},
        {id:'freeze',label:'Freeze prices',tone:'Balanced',effects:{board:3,local:3,treasurer:1},replyLow:'The committee accepts a freeze until the next financial review.',replyHigh:'The chairman presents the freeze as part of the club’s long-term identity.'},
        {id:'raise',label:'Support a careful increase',tone:'Commercial',effects:{board:2,local:-5,treasurer:7,income:30},replyLow:'The directors approve the increase and leave you to face the supporters.',replyHigh:'The board adopts your phased increase with protected prices for regular attendees.'},
        {id:'premium',label:'Create premium areas instead',tone:'Inventive',effects:{board:4,investor:7,local:1,income:18},replyLow:'The idea is considered unusual but worth a small trial.',replyHigh:'The investor backs a new premium section without raising ordinary admission.'}
      ]},
    {id:'playing-identity',title:'Club playing identity',detail:'Ask the board to support a long-term football philosophy beyond immediate results.',minYear:1888,minTrust:55,cooldown:240,
      options:[
        {id:'attack',label:'Commit to attacking football',tone:'Bold',effects:{board:1,football:6,supporters:5,identity:'Attacking tradition'},replyLow:'The board likes the language but refuses to protect you from poor results.',replyHigh:'The committee adopts attacking football as an official club principle.'},
        {id:'youth',label:'Build around youth development',tone:'Long-term',effects:{board:3,local:5,youth:8,identity:'Youth development'},replyLow:'The board agrees in principle but limits spending.',replyHigh:'The chairman commits the club to a decade-long youth strategy.'},
        {id:'winning',label:'Make winning the only identity',tone:'Ruthless',effects:{board:2,football:8,local:-2,identity:'Results above all'},replyLow:'The football director agrees, while others warn that the club must stand for something.',replyHigh:'The board gives you broad freedom to pursue success by any footballing route.'},
        {id:'adapt',label:'Refuse to be tied to one style',tone:'Pragmatic',effects:{board:2,football:3,identity:'Pragmatic adaptability'},replyLow:'The committee accepts flexibility but offers no additional protection.',replyHigh:'The board formally backs your right to adapt through different eras.'}
      ]},
    {id:'medical-care',title:'Player welfare and medical care',detail:'Ask the club to improve treatment, rehabilitation and support for injured players.',minYear:1895,minTrust:40,cooldown:210,
      options:[
        {id:'full',label:'Build the best medical department possible',tone:'Ambitious',effects:{board:2,treasurer:-5,players:8,medical:10},replyLow:'The request is reduced to one additional specialist.',replyHigh:'The committee approves a major welfare and rehabilitation programme.'},
        {id:'rehab',label:'Focus on long-term rehabilitation',tone:'Compassionate',effects:{board:3,players:10,medical:7},replyLow:'The board supports injured servants of the club but warns about indefinite costs.',replyHigh:'The chairman agrees that no player will be discarded simply because recovery is slow.'},
        {id:'insurance',label:'Create an injury insurance fund',tone:'Protective',effects:{board:4,treasurer:2,players:6},replyLow:'A modest fund is established for career-ending injuries.',replyHigh:'The club creates one of football’s strongest player-protection schemes.'},
        {id:'minimal',label:'Keep treatment basic and affordable',tone:'Frugal',effects:{board:0,treasurer:5,players:-6},replyLow:'The treasurer agrees, though the dressing room notices your position.',replyHigh:'The board follows you but several senior players are disappointed.'}
      ]},
    {id:'stadium-future',title:'The future of the ground',detail:'Discuss expansion, relocation, safety and the atmosphere of the club’s home.',minYear:1900,minTrust:55,cooldown:300,
      options:[
        {id:'expand',label:'Expand the historic ground',tone:'Traditional',effects:{board:2,local:7,investor:1,stadium:8},replyLow:'The committee commissions a modest stand rather than the full project.',replyHigh:'The board backs a phased expansion that protects the club’s home.'},
        {id:'move',label:'Explore a new stadium',tone:'Transformational',effects:{board:-1,local:-8,investor:9,stadium:12},replyLow:'The local director blocks any immediate move.',replyHigh:'The chairman authorises a feasibility study for a new home.'},
        {id:'safety',label:'Prioritise safety and access',tone:'Responsible',effects:{board:5,local:4,stadium:6},replyLow:'Essential works are approved, though capacity growth is postponed.',replyHigh:'The committee places safety above short-term gate income.'},
        {id:'atmosphere',label:'Protect terraces and atmosphere',tone:'Supporter-first',effects:{board:1,local:8,investor:-3,supporters:6},replyLow:'The board offers limited assurances while retaining commercial flexibility.',replyHigh:'The club commits to preserving supporter culture wherever regulations allow.'}
      ]}
  ];

  const pressQuestions = {
    early:[
      'Do you believe professionalism is improving football or corrupting it?',
      'Was today’s result decided by character or by the quality of the football?',
      'Do the players receive too much criticism from the crowd?',
      'Should the committee spend more to strengthen the side?',
      'Was the journey and condition of the pitch a fair excuse?'
    ],
    mid:[
      'Do you accept responsibility for the result?',
      'Is your captain still the right leader for this side?',
      'Will television and growing money change the character of football?',
      'Are you asking the board for reinforcements?',
      'Was the referee strong enough today?'
    ],
    modern:[
      'Is the pressure now beginning to affect your players?',
      'Do you expect the board to back you in the market?',
      'Was your tactical approach too cautious?',
      'How do you respond to criticism from supporters and former players?',
      'Would you support the latest proposed rule change?'
    ]
  };
  const pressResponses = [
    {id:'protect',label:'Protect the players',tone:'Protective',effects:{players:5,press:-1,supporters:1}},
    {id:'honest',label:'Answer honestly and directly',tone:'Honest',effects:{press:4,board:1}},
    {id:'confident',label:'Project complete confidence',tone:'Confident',effects:{players:2,supporters:3,press:1}},
    {id:'challenge',label:'Challenge the question',tone:'Confrontational',effects:{players:1,press:-5,supporters:2}},
    {id:'diplomatic',label:'Give a diplomatic answer',tone:'Diplomatic',effects:{board:2,press:1}},
    {id:'humour',label:'Defuse it with humour',tone:'Wry',effects:{press:3,supporters:3}}
  ];

  const governanceVotes = [
    {id:'professionalism',date:'1889-02-01',title:'Protect or restrict professional football',detail:'Clubs debate whether paying players should be accepted and regulated.',options:['Support regulated professionalism','Restrict payments','Abstain'],official:'Support regulated professionalism'},
    {id:'goal-nets',date:'1890-04-01',title:'Recommend goal nets',detail:'The league asks whether nets should be encouraged behind every goal.',options:['Support immediate adoption','Allow voluntary trials','Oppose the cost'],official:'Allow voluntary trials'},
    {id:'penalty-kick',date:'1891-03-01',title:'Introduce the penalty kick',detail:'A new twelve-yard punishment is proposed for serious offences near goal.',options:['Vote in favour','Vote against','Request a further trial'],official:'Vote in favour'},
    {id:'offside-1925',date:'1925-03-01',title:'Change the offside law',detail:'Reducing the defenders required from three to two could transform attacking football.',options:['Support the change','Protect the existing law','Abstain'],official:'Support the change'},
    {id:'floodlights',date:'1950-03-01',title:'Permit floodlit league fixtures',detail:'Clubs debate whether evening matches should become part of the league calendar.',options:['Support floodlit matches','Allow limited trials','Oppose evening football'],official:'Allow limited trials'},
    {id:'substitutes',date:'1964-03-01',title:'Allow substitutes',detail:'A proposal would let teams replace an injured player during a league match.',options:['Support one substitute','Support tactical substitutes too','Oppose replacements'],official:'Support one substitute'},
    {id:'electric-fencing',date:'1985-05-01',title:'Electric perimeter fencing',detail:'Some owners argue that electrified barriers could control crowds; safety campaigners strongly object.',options:['Reject electric fencing','Allow non-electric perimeter barriers','Support controlled trials'],official:'Reject electric fencing'},
    {id:'three-points',date:'1981-04-01',title:'Award three points for a win',detail:'The league considers rewarding victory more heavily to encourage attacking football.',options:['Support three points','Keep two points','Trial it in one division'],official:'Support three points'},
    {id:'back-pass',date:'1992-02-01',title:'Restrict goalkeeper handling of back-passes',detail:'The proposed law aims to reduce time-wasting and increase attacking play.',options:['Support the restriction','Oppose the change','Request a delayed introduction'],official:'Support the restriction'},
    {id:'var',date:'2017-03-01',title:'Introduce video review',detail:'Football authorities seek views on using video for major refereeing decisions.',options:['Support VAR','Support goal-line technology only','Oppose video review'],official:'Support VAR'},
    {id:'five-subs',date:'2022-04-01',title:'Make five substitutes permanent',detail:'Clubs vote on retaining the expanded substitution allowance.',options:['Support five substitutes','Return to three','Allow five only in congested periods'],official:'Support five substitutes'}
  ];

  const nations = [
    {id:'england',name:'England',nationality:'English',from:1872,strength:82},
    {id:'scotland',name:'Scotland',nationality:'Scottish',from:1872,strength:79},
    {id:'wales',name:'Wales',nationality:'Welsh',from:1876,strength:68},
    {id:'ireland',name:'Ireland',nationality:'Irish',from:1882,strength:66},
    {id:'northern-ireland',name:'Northern Ireland',nationality:'Northern Irish',from:1922,strength:67},
    {id:'france',name:'France',nationality:'French',from:1904,strength:77},
    {id:'belgium',name:'Belgium',nationality:'Belgian',from:1904,strength:72},
    {id:'netherlands',name:'Netherlands',nationality:'Dutch',from:1905,strength:78},
    {id:'germany',name:'Germany',nationality:'German',from:1908,strength:81},
    {id:'italy',name:'Italy',nationality:'Italian',from:1910,strength:82},
    {id:'spain',name:'Spain',nationality:'Spanish',from:1920,strength:82},
    {id:'portugal',name:'Portugal',nationality:'Portuguese',from:1921,strength:77},
    {id:'hungary',name:'Hungary',nationality:'Hungarian',from:1902,strength:77},
    {id:'austria',name:'Austria',nationality:'Austrian',from:1902,strength:74},
    {id:'switzerland',name:'Switzerland',nationality:'Swiss',from:1905,strength:70},
    {id:'denmark',name:'Denmark',nationality:'Danish',from:1908,strength:72},
    {id:'sweden',name:'Sweden',nationality:'Swedish',from:1908,strength:73},
    {id:'brazil',name:'Brazil',nationality:'Brazilian',from:1914,strength:87},
    {id:'argentina',name:'Argentina',nationality:'Argentine',from:1902,strength:86},
    {id:'uruguay',name:'Uruguay',nationality:'Uruguayan',from:1902,strength:80},
    {id:'croatia',name:'Croatia',nationality:'Croatian',from:1992,strength:80},
    {id:'norway',name:'Norway',nationality:'Norwegian',from:1908,strength:72},
    {id:'usa',name:'United States',nationality:'American',from:1916,strength:70},
    {id:'mexico',name:'Mexico',nationality:'Mexican',from:1923,strength:75},
    {id:'japan',name:'Japan',nationality:'Japanese',from:1921,strength:70},
    {id:'poland',name:'Poland',nationality:'Polish',from:1921,strength:76},
    {id:'czechia',name:'Czechia',nationality:'Czech',from:1993,strength:75},
    {id:'slovakia',name:'Slovakia',nationality:'Slovak',from:1993,strength:69},
    {id:'romania',name:'Romania',nationality:'Romanian',from:1922,strength:72},
    {id:'bulgaria',name:'Bulgaria',nationality:'Bulgarian',from:1924,strength:69},
    {id:'greece',name:'Greece',nationality:'Greek',from:1929,strength:70},
    {id:'turkey',name:'Turkey',nationality:'Turkish',from:1923,strength:74},
    {id:'serbia',name:'Serbia',nationality:'Serbian',from:2006,strength:74},
    {id:'ukraine',name:'Ukraine',nationality:'Ukrainian',from:1992,strength:73},
    {id:'russia',name:'Russia',nationality:'Russian',from:1992,strength:73},
    {id:'iceland',name:'Iceland',nationality:'Icelandic',from:1946,strength:65},
    {id:'finland',name:'Finland',nationality:'Finnish',from:1911,strength:66},
    {id:'slovenia',name:'Slovenia',nationality:'Slovenian',from:1992,strength:68},
    {id:'bosnia',name:'Bosnia and Herzegovina',nationality:'Bosnian',from:1995,strength:69},
    {id:'colombia',name:'Colombia',nationality:'Colombian',from:1938,strength:79},
    {id:'chile',name:'Chile',nationality:'Chilean',from:1910,strength:76},
    {id:'peru',name:'Peru',nationality:'Peruvian',from:1927,strength:72},
    {id:'paraguay',name:'Paraguay',nationality:'Paraguayan',from:1919,strength:72},
    {id:'ecuador',name:'Ecuador',nationality:'Ecuadorian',from:1938,strength:73},
    {id:'bolivia',name:'Bolivia',nationality:'Bolivian',from:1926,strength:63},
    {id:'venezuela',name:'Venezuela',nationality:'Venezuelan',from:1938,strength:65},
    {id:'canada',name:'Canada',nationality:'Canadian',from:1924,strength:70},
    {id:'costa-rica',name:'Costa Rica',nationality:'Costa Rican',from:1921,strength:71},
    {id:'jamaica',name:'Jamaica',nationality:'Jamaican',from:1925,strength:65},
    {id:'panama',name:'Panama',nationality:'Panamanian',from:1938,strength:66},
    {id:'australia',name:'Australia',nationality:'Australian',from:1922,strength:73},
    {id:'south-korea',name:'South Korea',nationality:'South Korean',from:1948,strength:73},
    {id:'iran',name:'Iran',nationality:'Iranian',from:1941,strength:72},
    {id:'saudi-arabia',name:'Saudi Arabia',nationality:'Saudi',from:1957,strength:70},
    {id:'china',name:'China',nationality:'Chinese',from:1924,strength:66},
    {id:'qatar',name:'Qatar',nationality:'Qatari',from:1970,strength:66},
    {id:'nigeria',name:'Nigeria',nationality:'Nigerian',from:1949,strength:77},
    {id:'cameroon',name:'Cameroon',nationality:'Cameroonian',from:1960,strength:76},
    {id:'ghana',name:'Ghana',nationality:'Ghanaian',from:1950,strength:76},
    {id:'senegal',name:'Senegal',nationality:'Senegalese',from:1961,strength:77},
    {id:'morocco',name:'Morocco',nationality:'Moroccan',from:1957,strength:77},
    {id:'algeria',name:'Algeria',nationality:'Algerian',from:1963,strength:72},
    {id:'egypt',name:'Egypt',nationality:'Egyptian',from:1920,strength:73},
    {id:'tunisia',name:'Tunisia',nationality:'Tunisian',from:1957,strength:70},
    {id:'ivory-coast',name:'Ivory Coast',nationality:'Ivorian',from:1960,strength:76},
    {id:'south-africa',name:'South Africa',nationality:'South African',from:1906,strength:70},
    {id:'new-zealand',name:'New Zealand',nationality:'New Zealander',from:1922,strength:62}
  ];

  const richMarkets = [
    {id:'china-boom',leagueId:'china',name:'Chinese Super League boom',from:2014,to:2019,bids:[3,7],ageMin:27,qualityMin:78,wageMultiplier:3.3,primeChance:.16},
    {id:'saudi-boom',leagueId:'saudi',name:'Saudi Pro League boom',from:2023,to:2032,bids:[4,8],ageMin:28,qualityMin:80,wageMultiplier:4.5,primeChance:.18},
    {id:'saudi-established',leagueId:'saudi',name:'Saudi Pro League established market',from:2033,to:9999,bids:[1,4],ageMin:30,qualityMin:79,wageMultiplier:3.7,primeChance:.08}
  ];

  return {potentialBands,boardTopics,pressQuestions,pressResponses,governanceVotes,nations,richMarkets};
})();
