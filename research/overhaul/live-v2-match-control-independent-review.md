# FL V2 match-control composition — independent review

Status: **GO for outer-host integration; current live bridge remains RED until integrated**.

Reviewed frozen bytes:

- live match-control composition: `e75e2d63fb57a884c829b705732714c2418fe4d3f5f4060ef58de2128e07bcc0`
- MatchClock V2: `281be0604de488a870376cf73c7a3718f8555f868bf0ef423742c1272c03d408`
- Restart Presentation V2: `1d6e6c17c240152f2279a96f69431b9cf4ff38954b35a50a87e063704ebbf54c`
- Set-Piece Suite V2: `ac49f9edce6120bfccf0c4f4f1462a0db57bdbe23a54711c7582ee38a632fcb0`
- Set-Piece Coordinate Contract V2: `7f5226aba8a58a4132501c3519820a536b921a6344bca99e65d2e49ec87247e0`

Independent evidence is
`tests/live-v2-match-control-independent-adversarial.mjs`: **13/13 tests pass**.
The author suite also reports **1,130/1,130 assertions pass**.

The independent suite gates factory capability provenance and offline workflow
containment; exclusive accelerated/live, real-time/dead-ball and paused clocks;
prepare/commit/abort/rollback atomicity; no legacy clock double-step; deterministic
offside presentation and one free-kick handoff; Set-Piece Suite Options/Escape and
D-pad-up penalty reachability; SI geometry in both attack directions and scaled
pitches; camera ownership; exact half-time transition; namespace isolation;
malformed input containment; deterministic browser/CommonJS parity; and durable
exact-once history. A 1,025th unique event fails closed before eviction, and the
oldest event cannot replay afterward.

This verdict approves the detached transactional composer. It does not approve
publication until the live adapter and `match.html` prepare gameplay, contact and
match-control together, apply all host effects once, commit both candidates only
after successful host application, and roll every subsystem back on any failure.
