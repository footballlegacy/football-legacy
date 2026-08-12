# FL V2 live contact composition — independent review

Status: **GO for exact offline normal-match outer-host composition; not a
standalone live-promotion verdict**.

Reviewed frozen bytes:

- live contact composer: `d7e950dc44e70531ef8a9cff2ef7ffaa0c0779707734428972d58d1414b1292e`
- First Touch V2: `da75f9cc3ab3458df67c08f7868e45ae2c8d4ad1ef50ff07c78c3c100370b77d`
- First Touch authority adapter: `fbbea7ff774015fff32806c32eeb012e23ff2197f86470d4441a9aec27ea4c3e`
- Aerial/Volley Contact V2: `54bf086bef9e0f149f9ed2445454da510fca5908e79aa77d95ba5f70d5e8b1ba`
- Ball V2: `4084ff8968859af2a4149703ce02eb37e0691fa20a542dbc97d793c33342c504`
- Movement V2: `af10e98822e2c1d93aa5b8bb9ce2e31ebad61def47174cf3ad25510eb106811d`

Independent evidence is `tests/live-v2-contact-independent-adversarial.mjs`: **13/13 tests pass**.

The review independently verifies exact offline Single Player and CPU-v-CPU
capability scope, preservation of the selected external workflow identity,
cross-workflow rejection, input purity and retry stability, one-contact chronology, possession staging,
ground/aerial mutual exclusion, high-ball exclusion from ground reception,
offside/restart/replay/keeper/special-action gating, pending/missed aerial
arbitration, already-consumed aerial retry suppression without suppressing
protected keeper/wall/body lanes, epoch-bound exact-once ledgers,
sent-off/unavailable/GK eligibility, deterministic coordinate centring, malformed
input containment and absence of ambient time/random/DOM authority.

This verdict approves the plan-only composer inside the outer transaction. The
host and live adapter must place it after the one Ball V2 integration, stage its
ledgers and possession inside the same outer gameplay transaction, suppress
only the declared legacy reception/aerial lanes, and roll back every host
mutation on any later contact or match-control failure. CPU-v-CPU additionally
depends on the outer capability and snapshot gates proving zero human owners,
both teams CPU-controlled, and no per-player human control input.
