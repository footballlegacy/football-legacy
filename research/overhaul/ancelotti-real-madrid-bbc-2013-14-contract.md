# Ancelotti Real Madrid BBC 2013/14 contract

## Scope and season decision

Quick Play gains one additive historic playtest team: `madrid-real-2013-14`, representing Carlo Ancelotti's 2013/14 La Decima side. This season is the clearest BBC reference because Real Madrid won the Champions League and Cristiano Ronaldo, Karim Benzema and Gareth Bale formed the established front three. No existing team, mode, route or workflow is removed.

The preferred season XI is Casillas; Carvajal, Pepe, Sergio Ramos, Marcelo; Modric, Xabi Alonso, Di Maria; Bale, Benzema, Cristiano Ronaldo. The bench is Diego Lopez, Varane, Coentrao, Arbeloa, Khedira, Isco and Morata. This is a representative season XI, not a claim that all eleven started the Lisbon final: Alonso was suspended, while UEFA's final sheet records Varane, Coentrao and Khedira in the starting XI.

## Football Legacy model

- Formation: 4-3-3, with 2-3-5 attacking occupation and 4-4-2 recovery.
- BBC: Ronaldo attacks the left inside channel and depth; Benzema drops to link; Bale drives inside from the right.
- Midfield: Alonso anchors and switches, Modric controls/connects, Di Maria carries through transition.
- Width/rest defence: fullbacks supply width while a three-player rest structure remains behind attacks.
- Ratings and attributes are bespoke Football Legacy playtest values derived from historic role and performance. They are not EA/FIFA ratings.
- The reusable overlay is `ancelotti-bbc-433`; it contains no team-ID coupling. Build 173 has a narrow Madrid identity route so the team cannot fall through to Arsenal/Chelsea presentation or behavior.

## Evidence boundary

Official sources establish the season, final squad, result, scorers and broad counterattacking/role evidence. Shape coordinates, role weights and attribute values are Football Legacy design inferences:

- Real Madrid, La Decima anniversary and final XI: https://www.realmadrid.com/en-US/news/club/latest-news/ninth-anniversary-of-la-decima
- UEFA, 2014 final tactical lineups: https://www.uefa.com/newsfiles/UCL/2014/2011883_LU.pdf
- UEFA, 2014 tactical comparison: https://www.uefa.com/uefachampionsleague/news/022d-0e9c6a7544bd-afb490c6de78-1000--how-madrid-and-atletico-have-changed-since-2014/
- UEFA, 2013/14 competition record: https://www.uefa.com/uefachampionsleague/history/seasons/2014/
- UEFA, Benzema on Bale/Ronaldo/Madrid: https://www.uefa.com/uefachampionsleague/news/0214-0e89f7f9c862-d49e69b8e498-1000--benzema-on-bale-ronaldo-and-madrid/

## Gate

`node --test tests/historic-real-madrid-bbc.mjs tests/formation-behaviour-v2.mjs`

The gate checks exact roster, IDs, positions, rating bounds, preferred XI/bench, formation slots, payload round-trip, Quick Play routes, Build 173 identity-before-fallback behavior, visual coverage, and the neutral formation overlay. Publishing is out of scope; one concise browser selection/payload proof is required before the parent workflow closes the integration.

Verification on 2026-08-12: 31/31 focused Madrid, formation and protected-foundation tests passed. The four changed JavaScript modules and the Madrid test also passed syntax checks.

The root in-app-browser proof then selected `Ancelotti Real Madrid BBC` through the existing Quick Play team controls, rendered `RMA`, 94 overall, 98 attack, 95 midfield, 92 defence, 4-3-3, Santiago Bernabeu and an 18-player squad, and showed the preferred XI/bench in Team Settings. Match Preview retained RMA 4-3-3 against Conte Chelsea and the ordinary `Start Match` route loaded Build 173 with `RMA 13/14` on the scoreboard and no console errors. The launched `#flMatch` payload decoded to `mode=quickPlay`, `matchType=single-player`, home ID `madrid-real-2013-14`, manager `Carlo Ancelotti`, philosophy `ancelotti-bbc-433`, and the exact XI Casillas; Carvajal, Pepe, Ramos, Marcelo; Modric, Alonso, Di Maria; Bale, Benzema, Ronaldo. This closes the live selection/payload gate without adding a parallel workflow.
