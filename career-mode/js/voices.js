/* ============================================================================
   FL VOICES v2 — the big era-tagged character voice bank for Football Legacy
   ----------------------------------------------------------------------------
   Runs with NO live AI. Intelligence baked in at build time; the game just
   picks a line by (group, situation, disposition, persona, YEAR).

   WHY THIS DOESN'T GET REPETITIVE OVER 100 YEARS:
   Repetition comes from too few SITUATIONS, not too few lines. So this covers
   the whole football conversation — dozens of distinct topics — and tags every
   line to an ERA so the voice fits the year. Add more lines to any cell forever.

   -------------------------------------------------------------------------
   ERAS  (picker maps a year to one of these; 'any' fits all)
     'v'  Victorian / Edwardian / early     ~1888–1930   (formal, restrained,
             "the eleven", amateurism, no substitutes, tape-and-mud football)
     'm'  Mid-century                        ~1930–1985   (interwar, wartime
             guests, post-war boom, the maximum wage and its abolition, "the lads")
     'o'  Modern                             ~1985–now    (money, media circus,
             foreign stars, all-seater grounds, the full tabloid roar)
   -------------------------------------------------------------------------
   SHAPE
     personas[group]                    -> the distinct voices in that group
     lines[group][situation][disp]      -> array of { p, e, t }
        p = persona id (or 'any')   e = era ('v'|'m'|'o'|'any')   t = text
     disp = disposition toward the manager: 'up' | 'mid' | 'down'
        (informational situations use a single 'all' bucket)
   -------------------------------------------------------------------------
   USE
     FLVoices.pick('board','soldStar', boardMood, chairmanPersona, year)
   EXTEND (with an AI writing assistant, at build time — never live in-game)
     Add more { p, e, t } to any array. Keep voices distinct and era-true.
   ============================================================================ */

window.FLVoices = (() => {

  const ERA_BOUNDS = { vTo: 1930, mTo: 1985 }; // year -> era
  function eraOf(year) {
    if (!year) return 'any';
    if (year < ERA_BOUNDS.vTo) return 'v';
    if (year < ERA_BOUNDS.mTo) return 'm';
    return 'o';
  }

  /* ====================================================================== */
  /*  PERSONAS                                                               */
  /* ====================================================================== */
  const personas = {
    board: [
      { id:'visionary',  label:'The ambitious moderniser', voice:'Growth-minded, forward-looking. Warm winning, impatient with drift.' },
      { id:'oldmoney',   label:'The old-money traditionalist', voice:'Sentimental about the club\'s soul and people. Patient, paternal.' },
      { id:'accountant', label:'The ledger man', voice:'Cold, money-first, unsentimental. Quick to lose faith.' },
      { id:'chancer',    label:'The populist chairman', voice:'Rides the crowd\'s mood. Generous in good times, panicked in bad.' },
    ],
    press: [
      { id:'local',      label:'The loyal local paper', voice:'Warm, hopeful, forgiving. Roots for club and manager.' },
      { id:'tabloid',    label:'The tabloid', voice:'Sensational, cruel, punny. Loves a crisis, sharpens the knife early.' },
      { id:'broadsheet', label:'The broadsheet analyst', voice:'Measured, tactical, lofty. Careful praise and careful damnation.' },
      { id:'phonein',    label:'The phone-in firebrand', voice:'Loud, black-and-white. Masterstroke or disgrace, nothing between.' },
    ],
    fans: [
      { id:'diehard',    label:'The die-hard', voice:'Loyal through anything. Emotional, forgives heart and effort.' },
      { id:'fairweather',label:'The fair-weather fan', voice:'Turns fast, boos early, entitled to success.' },
      { id:'oldtimer',   label:'The old-timer', voice:'Nostalgic, grumbling, judges all against the past.' },
      { id:'ultra',      label:'The ultra', voice:'Fierce, demanding, chant-and-tifo. Punishes cowardice.' },
    ],
    players: [
      { id:'loyalist',   label:'The one-club man', voice:'Humble, team-first, loves the badge. Takes hard news well.' },
      { id:'mercenary',  label:'The mercenary', voice:'Money- and ambition-driven, always half-eyeing the exit.' },
      { id:'hothead',    label:'The hothead', voice:'Proud, temperamental, easily slighted. A problem when crossed.' },
      { id:'pro',        label:'The quiet pro', voice:'Unflappable, professional, says little, does his job.' },
      { id:'youngster',  label:'The kid', voice:'Eager, nervous, star-struck. Crushed by criticism, lifted by faith.' },
    ],
    staff: [
      { id:'assistant',  label:'The assistant', voice:'Loyal number two and sounding board, with his own opinions and ambitions.' },
      { id:'physio',     label:'The old physio', voice:'A club servant of years, warm, protective, blunt about bodies.' },
      { id:'scout',      label:'The scout', voice:'Dry, blunt, talent-obsessed. Speaks in verdicts.' },
      { id:'academy',    label:'The academy head', voice:'Idealistic about the young lads, a believer in bringing them through.' },
    ],
    manager: [
      { id:'defiant',    label:'Defiant', voice:'Backs himself and his players, refuses criticism, front-foot.' },
      { id:'humble',     label:'Humble', voice:'Takes responsibility, credits others, grounded.' },
      { id:'diplomatic', label:'Diplomatic', voice:'Says little of substance, keeps everyone onside.' },
      { id:'blunt',      label:'Blunt', voice:'Honest to a fault, names problems plainly.' },
      { id:'passionate', label:'Passionate', voice:'Heart on sleeve, talks of pride, fight and the badge.' },
    ],
  };

  /* ====================================================================== */
  /*  LINES                                                                  */
  /*  (v = Victorian/early, m = mid-century, o = modern, any = all eras)     */
  /* ====================================================================== */
  const lines = {

    /* ===================================================================
       BOARD
       =================================================================== */
    board: {
      appointed: { all: [
        { p:'visionary', e:'v', t:"Welcome to the club, sir. We seek a side the town can be proud of. Build us one." },
        { p:'oldmoney',  e:'v', t:"You come to a club with traditions. Honour them, treat our people fairly, and we shall get along." },
        { p:'visionary', e:'m', t:"Welcome aboard. I brought you here to build something lasting. Don't let me down and I won't let you down." },
        { p:'accountant',e:'m', t:"Welcome. You'll find the wage bill tighter than you'd like, maximum or no maximum. Work within it." },
        { p:'chancer',   e:'o', t:"Big day! Fans are buzzing, I'm buzzing. Just win us some football matches and we're all happy." },
        { p:'visionary', e:'o', t:"Welcome. There's a project here and real backing behind it. Deliver, and the sky's the limit for us both." },
      ]},
      soldStar: {
        up: [
          { p:'accountant', e:'v', t:"A handsome fee for a professional past his best. Sound judgement — reinvest it wisely." },
          { p:'visionary',  e:'m', t:"Fine business. The lad wanted away and you got top pound. Spend it well and we go forward." },
          { p:'visionary',  e:'o', t:"A statement sale at a brilliant price. This is the ruthlessness that builds champions. Well done." },
          { p:'any',        e:'any', t:"The supporters won't like it today. Win a few and they'll forget his name by spring." },
        ],
        mid: [
          { p:'oldmoney',  e:'v', t:"He was one of ours, and it grieves me to see him leave. I trust you knew the necessity of it." },
          { p:'chancer',   e:'m', t:"Big money, big questions. The crowd's uneasy — best you answer them on the field, sharpish." },
          { p:'any',       e:'o', t:"The board notes the sale. We'll reserve judgement until we see what the money buys." },
        ],
        down: [
          { p:'oldmoney',  e:'m', t:"You sold the heartbeat of this side. I don't understand it, and neither do the men on the terrace." },
          { p:'accountant',e:'o', t:"The fee was good. The football's been dreadful since. That is not the trade we agreed to." },
          { p:'chancer',   e:'o', t:"There are supporters outside baying for your head over that. I can't shield you forever." },
        ],
      },
      bigSigning: {
        up: [
          { p:'visionary', e:'m', t:"Now that's a signing to stir the place. Ambition backed with nerve — exactly what I wanted." },
          { p:'chancer',   e:'o', t:"The whole town's talking about us again! Best bit of business the fans can remember. Don't waste the buzz." },
        ],
        mid: [
          { p:'accountant',e:'v', t:"He cost the club dear. He shall have to earn it. I'll be watching the accounts, and the results." },
          { p:'any',       e:'any', t:"A bold outlay. The board expects a return on it, and reasonably soon." },
        ],
        down: [
          { p:'accountant',e:'o', t:"You spent money we didn't truly have on a man who hasn't justified a penny of it. Explain yourself." },
          { p:'oldmoney',  e:'m', t:"We chased glamour and forgot who we are. I'd sooner a local lad who bleeds for the shirt." },
        ],
      },
      winStreak: {
        up: [
          { p:'oldmoney',  e:'v', t:"It gladdens an old heart to watch the eleven play like this. My sincere congratulations." },
          { p:'visionary', e:'m', t:"This is what we dreamed of when we brought you in. Keep it going — I can feel something building." },
          { p:'chancer',   e:'o', t:"Marvellous! You're a hero in the boardroom tonight. Long may it roll, my friend." },
        ],
        mid: [ { p:'accountant', e:'any', t:"A good run. Runs end. Let's see where we stand when the fixtures harden." } ],
        down: [ { p:'any', e:'any', t:"A few wins doesn't undo where we've been. Prove it's a turn, not a flicker." } ],
      },
      loseStreak: {
        up: [
          { p:'oldmoney',  e:'v', t:"A poor spell. Every good man endures them. You have my backing — go and set it right." },
          { p:'visionary', e:'o', t:"I still believe in the plan and in you. But belief needs feeding. Give us something, soon." },
        ],
        mid: [
          { p:'chancer',   e:'m', t:"The mood's souring out there and it's making me anxious. I need a response, quickly." },
          { p:'any',       e:'any', t:"The board is concerned. We're not reaching for the trigger — yet — but results must improve." },
        ],
        down: [
          { p:'accountant',e:'o', t:"This is costing us money as well as pride now. My patience is a line item, and it's overdrawn." },
          { p:'any',       e:'any', t:"Consider this a formal warning. A few more results like these and we'll have a decision to make." },
        ],
      },
      derbyWin: {
        up: [ { p:'chancer', e:'any', t:"I'll not sleep for grinning! You've made a great many friends in this town today." },
              { p:'any', e:'any', t:"Beating that lot is worth three ordinary wins. The whole board thanks you." } ],
        mid:[ { p:'accountant', e:'any', t:"A fine day. Bragging rights don't show in the ledger — but I'll permit myself a smile." } ],
        down:[ { p:'oldmoney', e:'any', t:"At last, a day to be proud of. Let it be the start of something, not a solitary bright afternoon." } ],
      },
      derbyLoss: {
        up: [ { p:'oldmoney', e:'any', t:"That one stings worse than most. But one bad day against them won't shake my faith in you." } ],
        mid:[ { p:'chancer', e:'any', t:"Losing to them of all sides... the supporters are wounded. You'll need to make it up to them." } ],
        down:[ { p:'any', e:'any', t:"Losing to them, the way we did, is close to unforgivable in this town. You know that as well as I." } ],
      },
      cupRun: { all: [
        { p:'chancer', e:'v', t:"A cup run! There's no tonic like it. The whole district is talking of us again." },
        { p:'visionary', e:'m', t:"A day out in the cup does wonders — for the coffers and the soul. Take us as far as you can." },
        { p:'accountant', e:'o', t:"The cup means gate receipts and a little glory. Both are welcome. Don't treat it lightly." },
      ]},
      cupUpsetLoss: { all: [
        { p:'chancer', e:'any', t:"Beaten by THAT lot? In the cup? The fans are humiliated and so, frankly, am I." },
        { p:'oldmoney', e:'any', t:"To go out to a smaller club is an embarrassment we'll wear for a while. Learn from it." },
      ]},
      titlePush: {
        up: [ { p:'visionary', e:'m', t:"Do you feel it? We could actually do this. Whatever you need from me, it's yours." },
              { p:'chancer', e:'o', t:"The town hasn't dared dream like this in years. Bring it home and you'll never buy a drink here again." } ],
        mid:[ { p:'accountant', e:'any', t:"Success would be lucrative as well as glorious. Don't let it slip — for all our sakes." } ],
        down:[ { p:'any', e:'any', t:"You've a chance most managers never get. Waste it and the goodwill you've earned goes with it." } ],
      },
      titleWon: { all: [
        { p:'oldmoney', e:'v', t:"Champions. In all my years I never dared hope to see it. You've written your name in this club forever." },
        { p:'visionary', e:'m', t:"Champions! You magnificent man. Whatever comes, they can never take this from us. Thank you." },
        { p:'chancer', e:'o', t:"CHAMPIONS! I could kiss you! The greatest day this club has ever known. History, that's what you've made." },
      ]},
      promoted: {
        up: [ { p:'visionary', e:'m', t:"Promotion. You've earned this club its proudest day in a generation. Now — onward and upward." },
              { p:'oldmoney', e:'v', t:"Up we go. I've waited a very long time to feel a day like this. Thank you, from an old heart." } ],
        mid:[ { p:'accountant', e:'o', t:"Up we go, and up go the costs. Enjoy tonight — tomorrow we discuss surviving the step up." } ],
        down:[ { p:'chancer', e:'any', t:"You did it despite everything I said. Perhaps I misjudged you. Perhaps." } ],
      },
      relegationFight: {
        up: [ { p:'oldmoney', e:'any', t:"We've been here before in our history and survived. I believe you're the man to keep us up." } ],
        mid:[ { p:'any', e:'any', t:"Survival is now the only thing that matters. Everything else waits. Keep us in this division." } ],
        down:[ { p:'accountant', e:'o', t:"You know what relegation costs this club. I don't think you can afford to fail. Nor, I fear, can you." } ],
      },
      relegated: {
        up: [ { p:'oldmoney', e:'any', t:"A dark day. But I've watched you work and I want you to lead us back. Will you?" } ],
        mid:[ { p:'any', e:'any', t:"Relegation. The board must now consider its position, and yours. We'll speak soon." } ],
        down:[ { p:'accountant', e:'o', t:"This failure has grave consequences — for the club's finances and for your future here. I'll be blunt about that." } ],
      },
      sackPressure: {
        up: [ { p:'oldmoney', e:'any', t:"I'm hearing calls for change. I'm resisting them, because I believe in you. Don't make a liar of me." } ],
        mid:[ { p:'chancer', e:'any', t:"I'll be honest — I don't know how much longer I can hold the line for you. Give me a reason to keep trying." } ],
        down:[ { p:'accountant', e:'any', t:"This is your final warning, plainly put. Results, now, or we part ways." },
               { p:'any', e:'any', t:"The board has lost confidence. I won't insult you by pretending otherwise. Your position is untenable." } ],
      },
      budgetBoost: { all: [
        { p:'visionary', e:'m', t:"Good news — I've freed up funds. Spend them wisely and let's take a real step this window." },
        { p:'chancer', e:'o', t:"Money's in the pot, my friend! Go and buy us someone the fans will queue up to watch." },
      ]},
      budgetCut: { all: [
        { p:'accountant', e:'m', t:"Times are hard. The purse is tighter this year. Make do, make it work, and don't come asking for more." },
        { p:'accountant', e:'o', t:"We're trimming the budget. I know it's unwelcome. Prove you can do more with less — that's the real skill." },
      ]},
      newOwner: { all: [
        { p:'chancer', e:'o', t:"There's been a takeover. New money, new expectations, and — between us — no guarantees for anyone. Impress them." },
        { p:'visionary', e:'m', t:"The club's changed hands. The new men are ambitious. Win them over quickly and the future's bright." },
      ]},
      financialTrouble: { all: [
        { p:'accountant', e:'m', t:"I'll be frank: the club's finances are perilous. We may need to sell to survive. I need you to understand that." },
        { p:'oldmoney', e:'o', t:"These are frightening times behind the scenes. I may have to ask painful things of you. I'm sorry for it." },
      ]},
    },

    /* ===================================================================
       PRESS
       =================================================================== */
    press: {
      soldStar: {
        up: [
          { p:'broadsheet', e:'m', t:"A shrewd sale from a manager who plainly sees a season or two beyond the terraces." },
          { p:'local',      e:'v', t:"It grieves the town to lose him, yet there is trust the manager knows what follows." },
        ],
        mid: [
          { p:'broadsheet', e:'o', t:"The fee is undeniable; the wisdom is unproven. The reinvestment will tell the real story." },
          { p:'local',      e:'m', t:"A big name out of the door leaves questions, and the manager knows he must answer them." },
        ],
        down: [
          { p:'tabloid',  e:'o', t:"SOLD DOWN THE RIVER: fury as boss cashes in the one man worth the admission money." },
          { p:'phonein',  e:'o', t:"You do NOT sell your best player and expect a smile back. Baffling. Absolutely baffling." },
          { p:'local',    e:'v', t:"The supporters are dismayed, and it must be said the decision wants a good deal of explaining." },
        ],
      },
      bigSigning: {
        up: [ { p:'local', e:'m', t:"A signing to stir the blood — and a sign the manager means to take this club somewhere." },
              { p:'broadsheet', e:'o', t:"An ambitious acquisition that lifts the side's ceiling, if the fit proves right." } ],
        mid:[ { p:'broadsheet', e:'any', t:"Eye-catching, certainly. Whether it's money well spent, only the field can settle." } ],
        down:[ { p:'tabloid', e:'o', t:"MONEY TO BURN: eyebrows raised as boss gambles a fortune on an unproven punt." } ],
      },
      winStreak: {
        up: [ { p:'local', e:'v', t:"Something stirs at the ground, and the man in charge of the eleven deserves the credit for it." },
              { p:'phonein', e:'o', t:"Say what you like — right now this manager can do no wrong. Long may it continue!" },
              { p:'broadsheet', e:'m', t:"A run built on more than fortune: there is shape and belief here that wasn't present before." } ],
        mid:[ { p:'broadsheet', e:'any', t:"A welcome sequence, though the sterner examinations lie further down the fixture list." } ],
        down:[ { p:'tabloid', e:'o', t:"Don't be fooled — a couple of wins doesn't paper over the cracks we've all seen." } ],
      },
      loseStreak: {
        up: [ { p:'local', e:'any', t:"Nobody's panicking here. Good managers ride these spells, and this one has earned the patience." } ],
        mid:[ { p:'broadsheet', e:'m', t:"The results have dried up and the questions gather. A response is needed before questions become verdicts." } ],
        down:[ { p:'tabloid', e:'o', t:"CRISIS DEEPENS: another feeble surrender and the natives are well past restless." },
               { p:'phonein', e:'o', t:"How long do we give him? From where I'm sitting, the answer's not much longer." },
               { p:'local', e:'v', t:"It pains us to write it, but the side is a shadow of itself, and patience in the town wears thin." } ],
      },
      derbyWin: {
        up: [ { p:'local', e:'any', t:"Bragging rights, glorious and hard-won. The manager will be toasted across the town tonight." },
              { p:'tabloid', e:'o', t:"BRAGGING WRONGS RIGHTED: boss silences the doubters where it hurts them most." } ],
        mid:[ { p:'broadsheet', e:'m', t:"A derby settled by nerve as much as quality. Days like this buy a manager time and goodwill." } ],
        down:[ { p:'phonein', e:'o', t:"Even his critics must admit it — that was the one result he had to get, and he got it." } ],
      },
      derbyLoss: {
        up: [ { p:'local', e:'any', t:"A painful afternoon, but one defeat to the old enemy shouldn't undo a season of good work." } ],
        mid:[ { p:'broadsheet', e:'m', t:"Beaten in the fixture that matters most — a wound that will take more than words to heal." } ],
        down:[ { p:'tabloid', e:'o', t:"HUMILIATION: boss and his men bottle it on the biggest day. Unforgivable, say furious fans." } ],
      },
      cupUpsetWin: { all: [
        { p:'local', e:'v', t:"A giant felled! The town will speak of this cup-tie for a generation. What a day for the little club." },
        { p:'tabloid', e:'o', t:"GIANT-KILLERS! Minnows stun the big boys as boss masterminds the shock of the round." },
      ]},
      cupUpsetLoss: { all: [
        { p:'tabloid', e:'o', t:"BUMPKINS BATTER BLUSHES: red-faced boss dumped out by part-timers. Excuses, please." },
        { p:'broadsheet', e:'m', t:"A chastening afternoon against lesser opposition — the sort of result that lingers on a manager's record." },
      ]},
      titlePush: {
        up: [ { p:'local', e:'m', t:"Dare we dream? The manager has this club believing again, and the whole town dares with it." },
              { p:'broadsheet', e:'o', t:"A genuine challenge, intelligently built. The nerve to finish it is the last thing to prove." } ],
        mid:[ { p:'broadsheet', e:'any', t:"In the hunt, deservedly — but the run-in is where reputations are made or quietly unmade." } ],
        down:[ { p:'tabloid', e:'o', t:"BOTTLE JOB LOOMS? History says this lot fold when it matters. Over to you, boss." } ],
      },
      titleWon: { all: [
        { p:'local', e:'v', t:"Champions of the League. The manager has given this town its finest hour. His name is secure in our history." },
        { p:'broadsheet', e:'o', t:"A title won on merit and nerve. Whatever comes next, this manager has done the one thing that lasts." },
      ]},
      relegated: {
        up: [ { p:'local', e:'any', t:"A gutting end, but there's a case for steadiness — for letting the boss rebuild rather than reaching for the axe." } ],
        mid:[ { p:'broadsheet', e:'m', t:"Relegation always demands a reckoning. The board's response will define the club's next three years." } ],
        down:[ { p:'tabloid', e:'o', t:"DOWN AND OUT: disaster complete, and only one man can carry the can. Time's up, surely?" } ],
      },
      transferGossip: { all: [
        { p:'tabloid', e:'o', t:"EXCLUSIVE: boss 'eyeing' a shock swoop — though nobody at the club will confirm a word of it." },
        { p:'local', e:'m', t:"Whispers around the ground suggest the manager is in the market. The supporters wait, and hope." },
        { p:'broadsheet', e:'o', t:"Sources indicate interest, as sources always do. Treat the smoke with the usual caution." },
      ]},
      managerLinkedAway: { all: [
        { p:'tabloid', e:'o', t:"OFF SOON? Boss 'top target' for a bigger club. Is his heart still at this one? Fans want answers." },
        { p:'local', e:'m', t:"It's said grander clubs are watching our manager. We can only hope his affection for us wins out." },
      ]},
      pressConfPrompt: { all: [
        { p:'local', e:'m', t:"The local reporter leans in warmly: \"Big game coming, boss — how are you feeling about it?\"" },
        { p:'tabloid', e:'o', t:"The tabloid man smells blood: \"Some say you've lost the dressing room. Care to respond?\"" },
        { p:'broadsheet', e:'o', t:"The broadsheet writer, pen poised: \"Tactically, what changes against a side set up like theirs?\"" },
        { p:'phonein', e:'o', t:"The radio man goes straight in: \"Yes or no — is your job on the line this weekend?\"" },
        { p:'local', e:'v', t:"A gentleman of the press enquires: \"Might we know your thoughts on the coming fixture, sir?\"" },
      ]},
    },

    /* ===================================================================
       FANS
       =================================================================== */
    fans: {
      soldStar: {
        up: [ { p:'diehard', e:'any', t:"Gutted he's gone, but in the gaffer I trust. He's not let us down yet." } ],
        mid:[ { p:'oldtimer', e:'v', t:"In my day you didn't sell your best man. Still — let's see what he does with the money." } ],
        down:[ { p:'ultra', e:'o', t:"You sold our heart for silver. Shameful. You'll hear about it, loud and clear." },
               { p:'fairweather', e:'o', t:"That's it, I'm not renewing. Why pay to watch a selling club? Joke decision." } ],
      },
      bigSigning: {
        up: [ { p:'fairweather', e:'o', t:"NOW we're talking! Get the shirt printed with his name on. This is more like it!" },
              { p:'diehard', e:'m', t:"Feels like the club's going places again. Can't wait to see him pull the shirt on." } ],
        mid:[ { p:'oldtimer', e:'v', t:"A big fee, they say. Let us hope he has the stomach for it and not merely the reputation." } ],
        down:[ { p:'ultra', e:'o', t:"Money for a mercenary while the youth setup rots. Not what this club's about." } ],
      },
      winStreak: {
        up: [ { p:'diehard', e:'any', t:"Can't remember the last time it felt this good. The gaffer's got us dreaming again!" },
              { p:'ultra', e:'o', t:"THAT'S our team! Passion, fight, goals — this is what we pay for. More of it!" },
              { p:'oldtimer', e:'m', t:"Reminds me of the good sides, this does. Proper football. Proper effort. Grand to see." } ],
        mid:[ { p:'oldtimer', e:'any', t:"Nice little run. I'll believe it's a proper turn when they do it against the good sides." } ],
        down:[ { p:'oldtimer', e:'any', t:"Few wins and everyone's forgotten how bad it was. Seen this film before. Doesn't end well." } ],
      },
      loseStreak: {
        up: [ { p:'diehard', e:'any', t:"Stick with him. He's earned a bad month. We're not a club that sacks at the first storm." } ],
        mid:[ { p:'fairweather', e:'o', t:"Losing patience here. If it doesn't turn soon, I know what I'd do." } ],
        down:[ { p:'ultra', e:'o', t:"Not good enough. Nowhere near. Sort it or clear off — we mean it." },
               { p:'fairweather', e:'m', t:"Same old story. I'll be stopping at home Saturday rather than waste another afternoon on this." } ],
      },
      derbyWin: {
        up: [ { p:'ultra', e:'o', t:"ALL DAY LONG! We own this city! Never doubted the gaffer — well, not today anyway!" },
              { p:'diehard', e:'any', t:"Beating them is what it's ALL about. I'll be smiling for a week. Get in!" } ],
        mid:[ { p:'oldtimer', e:'v', t:"Beat that lot and it's a good year whatever else befalls. Made an old man very happy." } ],
        down:[ { p:'fairweather', e:'o', t:"See, THAT'S what he can do. So why can't we play like that every single week?" } ],
      },
      derbyLoss: {
        up: [ { p:'diehard', e:'any', t:"Hurts like nothing else, but I'm not turning on the gaffer over one game. Onwards." } ],
        mid:[ { p:'oldtimer', e:'any', t:"Losing to them. Again. There's no lower feeling in football, and he'll know it." } ],
        down:[ { p:'ultra', e:'o', t:"You do NOT lose to them like that. Don't show your face till you've made it right." } ],
      },
      droppedFavourite: {
        up: [ { p:'diehard', e:'any', t:"Don't love seeing him benched, but I trust the gaffer's got a reason. Must have." } ],
        mid:[ { p:'oldtimer', e:'v', t:"Leaving HIM out? A bold stroke. He's a favourite here for good reason, mind." } ],
        down:[ { p:'ultra', e:'o', t:"Leaving him out is an insult to the fans who love him. What are you playing at?" } ],
      },
      boringFootball: {
        up: [ { p:'oldtimer', e:'any', t:"Not pretty, is it? But it's winning, and I'll take winning over fancy any day." } ],
        mid:[ { p:'fairweather', e:'o', t:"Dull as ditchwater, this. Winning or not, I want my money's worth of entertainment." } ],
        down:[ { p:'ultra', e:'o', t:"Turgid rubbish. We didn't grow up supporting this club to watch THAT every week." } ],
      },
      attackingFootball: {
        up: [ { p:'diehard', e:'any', t:"Whatever happens, this lot are a JOY to watch. Edge of my seat every week. Love it." },
              { p:'ultra', e:'o', t:"Cavalier, fearless, all-out — THIS is football the way it's meant to be. Take a bow." } ],
        mid:[ { p:'oldtimer', e:'m', t:"Grand entertainment, no doubt. Just wish they'd not give me heart failure at the back." } ],
        down:[],
      },
      playingKids: {
        up: [ { p:'diehard', e:'any', t:"Love seeing our own lads get a go. Homegrown heart — that's what a club should be." },
              { p:'oldtimer', e:'m', t:"Bringing the young 'uns through, proper. That's how it was done in my day. Good on him." } ],
        mid:[ { p:'fairweather', e:'o', t:"Kids are all well and good but I've paid to WIN, not to watch an experiment." } ],
        down:[],
      },
      promoted: {
        up: [ { p:'diehard', e:'any', t:"I'M NOT CRYING YOU'RE CRYING. Best day of my supporting life. Take a bow, gaffer!" },
              { p:'oldtimer', e:'v', t:"Waited thirty years for a day like this. Thought I'd not see it. Bless the man who did it." } ],
        mid:[], down:[],
      },
      relegated: {
        up: [ { p:'diehard', e:'any', t:"Devastated. But I'm a fan in the bad times too. Rebuild us, gaffer — we'll be there." } ],
        mid:[ { p:'oldtimer', e:'any', t:"Down we go. Seen it before, we'll see it again. Question is whether he's the man to lift us." } ],
        down:[ { p:'ultra', e:'o', t:"You took us DOWN. There's no forgiving that. Go, and take your excuses with you." } ],
      },
      legendPasses: { all: [
        { p:'oldtimer', e:'any', t:"Heard the old number nine passed away. Cried like a boy. There'll never be another like him. Rest easy, legend." },
        { p:'diehard', e:'any', t:"A giant of this club, gone. We'll sing his name till the ground shakes. He was one of us, always." },
      ]},
    },

    /* ===================================================================
       PLAYERS
       =================================================================== */
    players: {
      droppedFromTeam: {
        up: [ { p:'pro', e:'any', t:"Not happy, boss, but I'll keep my head down and earn my place back. That's the job." },
               { p:'loyalist', e:'m', t:"I understand, gaffer. First on the training pitch tomorrow. I'll fight my way back in." } ],
        mid:[ { p:'youngster', e:'any', t:"Right. Okay. I thought I'd done enough. I'll work harder. I will." } ],
        down:[ { p:'hothead', e:'any', t:"Dropped? Me? That's a joke and you know it. Don't expect me to smile about it." },
               { p:'mercenary', e:'o', t:"If I'm not playing here, clubs will play me. My agent will be in touch, boss." } ],
      },
      contractWantsMore: {
        up: [ { p:'loyalist', e:'m', t:"I don't want away, gaffer — this is home. But the lads say I'm due a new deal, and I'd love to stay on fair terms." } ],
        mid:[ { p:'pro', e:'v', t:"I've given honest service. A fresh agreement seems a fair thing to discuss. No quarrel — just business." } ],
        down:[ { p:'mercenary', e:'o', t:"Let's be straight: the numbers don't reflect my value. Sort it, or I start listening to others." },
               { p:'hothead', e:'o', t:"I've carried this team and I'm paid like a squad man. Fix it. I won't ask twice." } ],
      },
      wantsToLeave: {
        up: [ { p:'loyalist', e:'any', t:"It kills me to say it, but a big club's come in and it's a chance I may never get again. I'm torn." } ],
        mid:[ { p:'pro', e:'any', t:"There's interest, and I'd ask you to consider it. I'll be professional either way — you have my word." } ],
        down:[ { p:'mercenary', e:'o', t:"I want out. This club can't match my ambition and we both know it. Name your price." } ],
      },
      maximumWageGripe: { all: [   // era-specific: the maximum wage world
        { p:'mercenary', e:'m', t:"There's a ceiling on what any of us can earn and it's an insult to the good players. You know it's wrong, boss." },
        { p:'pro', e:'m', t:"I'll not moan about the wage — it's the same for every man. But a word of thanks now and then wouldn't go amiss." },
      ]},
      praisedInPublic: {
        up: [ { p:'youngster', e:'any', t:"The gaffer said THAT about me? To the papers? I'd run through a wall for him, I mean it." },
               { p:'loyalist', e:'m', t:"Means the world coming from him. I'll pay it back on the pitch, don't you worry." } ],
        mid:[ { p:'pro', e:'v', t:"Kind words from the manager. Noted, and appreciated. Now to keep proving him right." } ],
        down:[],
      },
      criticisedInPublic: {
        up: [ { p:'pro', e:'any', t:"Fair enough, boss. I wasn't good enough and you said so. I'll answer it the right way." } ],
        mid:[ { p:'youngster', e:'any', t:"Seeing my name in the paper like that stung. But I get it. I'll be better." } ],
        down:[ { p:'hothead', e:'o', t:"Slaughtering me in public? After everything? You've lost me with that, gaffer. Well and truly." },
               { p:'mercenary', e:'o', t:"Air my failings to the press again and you'll see how fast a dressing room turns." } ],
      },
      givenDebut: {
        up: [ { p:'youngster', e:'any', t:"You're really starting me? Thank you, boss — I won't waste it, I promise you I won't." },
               { p:'loyalist', e:'v', t:"A debut for the first eleven. I've dreamed of this since I was a lad. I'll not let the club down." } ],
        mid:[ { p:'pro', e:'any', t:"Appreciate the nod. I'll do a job for you. That's what I'm here for." } ],
        down:[],
      },
      injuredLongTerm: { all: [
        { p:'loyalist', e:'any', t:"They're saying I'll be out a long while, boss. It's breaking my heart. I'll do everything to come back stronger." },
        { p:'pro', e:'m', t:"Bad news from the treatment room. I'll take it on the chin and work my way back. Don't write me off." },
      ]},
      returnsFromInjury: { all: [
        { p:'youngster', e:'any', t:"Fit again at last, boss! Feels like being let out of a cage. Just give me the shirt — I'm ready." },
        { p:'loyalist', e:'any', t:"Back in one piece and desperate to repay the club for its patience. Whenever you need me, I'm there." },
      ]},
      soldReaction: {
        up: [ { p:'loyalist', e:'any', t:"I never wanted to leave. This club's in my blood and always will be. Look after it for me." } ],
        mid:[ { p:'pro', e:'any', t:"That's football. No hard feelings, boss — thanks for everything. I'll always look for our result." } ],
        down:[ { p:'hothead', e:'o', t:"Shipped out like a spare part after what I gave this place. I won't forget how this was handled." } ],
      },
      welcomeNewSigning: {
        up: [ { p:'loyalist', e:'any', t:"Welcome, son — anything you need, come to me. We look after each other here." } ],
        mid:[ { p:'pro', e:'any', t:"New lad seems alright. Quiet. We'll see what he's made of when the tackles fly." } ],
        down:[ { p:'hothead', e:'o', t:"So THAT'S where the money went while I'm waiting on my deal. Welcome, I'm sure." } ],
      },
      captaincyGiven: { all: [
        { p:'loyalist', e:'any', t:"The armband? Me? I'll wear it with everything I've got, boss. I'll not let you or the lads down." },
        { p:'pro', e:'m', t:"Honoured you'd trust me with it. I'll lead the way you'd want — by doing my job and dragging the rest with me." },
      ]},
      retires: { all: [
        { p:'loyalist', e:'any', t:"This is it for me, boss. One last season, then the boots go up. Thank you for the best years of my life." },
        { p:'pro', e:'m', t:"The legs have gone, gaffer. Time to bow out with what dignity's left. It's been an honour to serve this club." },
      ]},
    },

    /* ===================================================================
       STAFF
       =================================================================== */
    staff: {
      afterWin: { all: [
        { p:'assistant', e:'any', t:"Loved that, boss. Shape held, lads believed. Whatever you said before kick-off — say it again." },
        { p:'physio', e:'m', t:"Happy lads are healthy lads. Nobody limped off, everybody's grinning. Good day at the office." },
        { p:'assistant', e:'v', t:"A stout showing, sir. The eleven played for one another. That's your doing, whatever your modesty says." },
      ]},
      afterLoss: { all: [
        { p:'assistant', e:'any', t:"Don't let it fester, boss. We were the better side for an hour. Tweak one thing and we're right back at it." },
        { p:'physio', e:'m', t:"Heads are down in there, and a couple are carrying knocks. Might be worth a lighter week." },
        { p:'assistant', e:'o', t:"I'll say it because someone must: something's not clicking, and the lads have noticed. We need a proper talk." },
      ]},
      scoutReport: { all: [
        { p:'scout', e:'any', t:"Watched the lad twice. Two good feet, reads the game, doesn't hide. Worth the trip — sign him before someone else does." },
        { p:'scout', e:'any', t:"Honest verdict? Flatters to deceive. World-beater in the warm-up, vanishes at kick-off. I'd pass." },
        { p:'scout', e:'m', t:"Rough as they come, but there's something there. Two years and a good coach and you've a player." },
        { p:'scout', e:'v', t:"A promising young fellow, sir, playing junior football up north. Raw, but the makings of a footballer are in him." },
      ]},
      academyProspect: { all: [
        { p:'academy', e:'any', t:"Boss, come and watch the young lad in the juniors. Not been this excited in years. He's special." },
        { p:'academy', e:'m', t:"Not the biggest, not the quickest, but his brain's a decade older than his legs. Bring him on slow and he's yours for fifteen years." },
        { p:'academy', e:'o', t:"Give one of ours a debut this season. Supporters love a homegrown lad, and this one's ready. Trust him." },
      ]},
      assistantAdvice: { all: [
        { p:'assistant', e:'any', t:"For what it's worth, boss — their left side's there for the taking. Push a man wide and we'll have joy all afternoon." },
        { p:'assistant', e:'any', t:"We're a shade open through the middle lately. Another body there and we're much harder to beat. Your call, always." },
        { p:'assistant', e:'m', t:"Lads look leggy. I'd freshen it up — three changes, keep the spine. But you know this group better than anyone." },
      ]},
      injuryCrisis: { all: [
        { p:'physio', e:'any', t:"I'll be straight, boss — the treatment room's overflowing. We're scraping eleven fit men together. Something has to give." },
        { p:'physio', e:'m', t:"Never known a run of injuries like it. The lads left standing are running on fumes. Go easy on them or we'll lose more." },
      ]},
    },

    /* ===================================================================
       MANAGER — choosable reply options (tone = persona: defiant/humble/etc)
       =================================================================== */
    manager: {
      pressAfterWin: { all: [
        { p:'humble', e:'any', t:"\"The players won that, not me. I pick the team — they do the hard part.\"" },
        { p:'defiant', e:'any', t:"\"People doubted us. That's the answer. We'll keep answering as long as they keep doubting.\"" },
        { p:'passionate', e:'any', t:"\"Did you see them out there? That's what this badge means. I'm proud to stand next to them.\"" },
        { p:'diplomatic', e:'any', t:"\"A good day. We take it, enjoy it tonight, and we're back to work in the morning. Nothing more to it.\"" },
        { p:'blunt', e:'any', t:"\"We won and we deserved it. We've been poor and I've said so — so I'll say this too. That was good.\"" },
      ]},
      pressAfterLoss: { all: [
        { p:'humble', e:'any', t:"\"That one's on me. I set us up, it didn't work, and I'll wear it. The players gave everything.\"" },
        { p:'defiant', e:'any', t:"\"One result. We're fine. Anyone in this room writing us off — be my guest. We'll enjoy proving you wrong.\"" },
        { p:'passionate', e:'any', t:"\"It hurts. Course it hurts. We care too much for it not to. And that's exactly why we'll put it right.\"" },
        { p:'diplomatic', e:'any', t:"\"Credit to the opposition. We'll look at it calmly, learn what we can, and move on. No panic.\"" },
        { p:'blunt', e:'any', t:"\"We weren't good enough. Simple as that. No excuses, no spin. We'll fix it or we won't — but we won't hide.\"" },
      ]},
      pressJobQuestion: { all: [
        { p:'defiant', e:'any', t:"\"My job? I'm going nowhere. Judge me over a season, not a fortnight, and we'll talk again in May.\"" },
        { p:'diplomatic', e:'any', t:"\"That's a question for the board, not for me. My focus is the next match. It always is.\"" },
        { p:'blunt', e:'any', t:"\"If they want to sack me, that's their right. Until they do, I'll keep doing the job the way I see it.\"" },
        { p:'passionate', e:'any', t:"\"I love this club. I'll fight for it to my last day here, whenever that comes. That's all I'll say.\"" },
      ]},
      pressTransferQuestion: { all: [
        { p:'diplomatic', e:'any', t:"\"I never discuss other clubs' players in public. When there's something to announce, you'll be the first to know.\"" },
        { p:'blunt', e:'o', t:"\"We're looking, yes. We need bodies and everyone can see it. Whether we get them is about money, and that's not down to me alone.\"" },
        { p:'defiant', e:'any', t:"\"I'm happy with my squad. If the right man comes along, good. If not, I back the players I've got.\"" },
      ]},
      pressDefendPlayer: { all: [
        { p:'defiant', e:'any', t:"\"Leave the lad alone. He's one of ours and I'll not have him hung out to dry in your pages. He'll come good.\"" },
        { p:'passionate', e:'any', t:"\"That boy gives me everything he has every week. You want a target? Aim it at me, not him.\"" },
        { p:'humble', e:'any', t:"\"He's had a hard time, and some of that's my fault for how I've used him. He's a fine player. Back him.\"" },
      ]},
      teamTalkPreMatch: { all: [
        { p:'passionate', e:'any', t:"\"Look at the badge. Look at who's in the stands. Ninety minutes for them. Leave nothing out there.\"" },
        { p:'blunt', e:'any', t:"\"No speeches. You know the plan, you know your man. Do your job and we win. Go.\"" },
        { p:'humble', e:'any', t:"\"I've done my bit all week. The rest is yours. I believe in every one of you. Show them.\"" },
        { p:'defiant', e:'any', t:"\"Nobody out there fancies us. Good. Let's ram it back down their throats. Front foot, first whistle.\"" },
        { p:'diplomatic', e:'any', t:"\"Stick to the shape, stay patient, trust each other. Chances will come. Keep your discipline and it's ours.\"" },
      ]},
      teamTalkHalfTimeLosing: { all: [
        { p:'passionate', e:'any', t:"\"Forty-five minutes to save your season. I don't want excuses at full time — I want to see you EMPTY yourselves.\"" },
        { p:'blunt', e:'any', t:"\"That was the worst half I've watched in a long time. You know it. Now go and put it right, or don't bother coming in.\"" },
        { p:'humble', e:'any', t:"\"I got the setup wrong, that's on me — we're changing it. Now go and take the game by the scruff. You can do this.\"" },
      ]},
      respondToUnhappyPlayer: { all: [
        { p:'blunt', e:'any', t:"\"You want the truth? You're not playing well enough. Fix that and you're back in. It's in your hands.\"" },
        { p:'diplomatic', e:'any', t:"\"I hear you, and your moment will come. Keep your head, keep working, don't do anything you'll regret.\"" },
        { p:'passionate', e:'any', t:"\"I know you're hurting — it's because you care, and I love that. Channel it. Take that shirt off him.\"" },
        { p:'humble', e:'any', t:"\"Maybe I've got it wrong. I'll watch you closer this week. Show me something and I'll hold my hand up.\"" },
        { p:'defiant', e:'any', t:"\"I pick this team and I don't apologise for it. You don't have to like it. You do have to deal with it.\"" },
      ]},
      respondToBoard: { all: [
        { p:'defiant', e:'any', t:"\"Judge me over a season, not a fortnight. Back me and I'll deliver. Panic now and we both lose.\"" },
        { p:'humble', e:'any', t:"\"You're right to be concerned — I am too. Give me a little time and I'll turn it. You have my word.\"" },
        { p:'diplomatic', e:'any', t:"\"I understand the pressure you're under. We want the same thing. Let me work and we'll get there together.\"" },
        { p:'blunt', e:'any', t:"\"If you want to sack me, sack me. If you want me to fix it, let me work. Make your mind up — I can't do both.\"" },
        { p:'passionate', e:'any', t:"\"I love this club. I'll bleed for it before I quit on it. Stand with me and we come through this stronger.\"" },
      ]},
    },
  };

  /* ====================================================================== */
  /*  PICKER — era-aware                                                     */
  /* ====================================================================== */
  function pick(group, situation, disposition = 'mid', personaId = null, year = null) {
    const g = lines[group];
    if (!g || !g[situation]) return '';
    const sit = g[situation];
    // informational situations use a single 'all' bucket
    let bucket = sit[disposition] || sit.all || sit.mid || [];
    if (!bucket.length) {
      bucket = sit.all || sit.mid || sit.up || sit.down || [];
    }
    if (!bucket.length) return '';

    const era = eraOf(year);
    const eraOk = l => l.e === 'any' || era === 'any' || l.e === era;

    // Prefer: right era AND right persona -> right era -> right persona -> anything
    let pool = bucket.filter(l => eraOk(l) && l.p === personaId);
    if (!pool.length) pool = bucket.filter(l => eraOk(l) && l.p === 'any');
    if (!pool.length) pool = bucket.filter(eraOk);
    if (!pool.length) pool = bucket.filter(l => l.p === personaId || l.p === 'any');
    if (!pool.length) pool = bucket;
    return pool[Math.floor(Math.random() * pool.length)].t;
  }

  return { personas, lines, pick, eraOf };
})();