# FL V2 CPU-v-CPU passing and tempo characterization — 2026-08-12

## Scope and authority caveat

This is a characterization, not a production change. It runs the current live V2 adapter and current ball, movement, CPU, formation, contact and dribbling modules behind a host-faithful transaction seam. Protected restarts are simplified, so browser match confirmation is still required.

Eight deterministic seeds (`173`, `442`, `1967`, `2004`, `2014`, `2017`, `3434`, `7331`) each ran for 1,800 fixed ticks: 14,400/14,400 committed ticks, four simulated minutes, zero valid-run fallback and zero strict stop.

The uploaded `football-legacy-playtest-FL-MSQFND14.json` is not V2 evidence: it reports `requested: build-173`, `effective: build-173`, `candidateTicks: 0`, `gameplayEpochs: 0`, despite `engineVersion: 0.174`. Its SHA-256 is `cb44edd43238b9bfe4dff49f6d12e1ef6c4b16aeedf15981df4f3d2f5ea92a49`.

It does explain the user's “1.5x” tempo report. The log selected four minutes, while the baseline is six. Regulation time therefore advances at `90/4 = 22.5` rather than `90/6 = 15` football minutes per wall minute: exactly `1.5x`. Do not slow locomotion to compensate for that clock setting.

For context only, that Build 173 log contained 90 passes/60 completions (66.7%). Fifty-eight pass-to-reception pairs had median travel 0.800 s, mean 1.019 s and p90 1.667 s. Those are not V2 results.

## Current-byte V2 result

| Measure | Result |
| --- | ---: |
| Passes | 65 |
| Resolved / unresolved | 57 / 8 |
| Intended completions | 8 (14.0% of resolved) |
| Interceptions | 9 |
| Unintended teammate recoveries | 8 |
| Boundary outs | 32 |
| Ground pass | 38: 5 complete, 9 intercepted, 8 teammate recovery, 16 other |
| Long pass | 27: 3 complete, 0 intercepted/recovered, 16 other, 8 unresolved |
| Median pass distance / launch speed | 16.473 m / 18.515 m/s |
| Median / p90 travel | 2.850 s / 7.417 s |
| Median receiver miss | 1.728 m |
| Median authored-point miss | 0.053 m |
| Passes / logical possession changes per simulated minute | 16.25 / 34.5 |
| Logical team turnovers | 41 |
| Logical / physical controlled-possession share | 2.8% / 2.1% |
| Physical-separated share | 0.7% |
| First-touch contacts | 48: 32 candidate-acquire, 16 remain-loose |
| Logical ownership continuity violations | 0 |
| Shots / goals / simplified restarts | 0 / 0 / 32 |
| Median / p95 moving-player speed | 3.192 / 5.564 m/s |

True Feel changes materially improved the earlier pre-change sample: intended completions increased from 0/64 resolved to 8/57, and median receiver miss fell from 4.999 m to 1.728 m. The result is still not playable calibration: only 14% of resolved passes reach the named receiver, half of all attempts go out, controlled possession is extremely sparse, and no shot occurs.

### Arrival/interception race evidence

| Outcome | Count | Median travel | Median pass distance | Median speed | Median receiver miss | Median authored-point miss |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Completed | 8 | 0.500 s | 19.499 m | 19.297 m/s | 0.163 m | 17.094 m |
| Intercepted | 9 | 1.950 s | 16.451 m | 18.509 m/s | 1.043 m | 0.011 m |
| Unintended teammate | 8 | 0.317 s | 16.181 m | 18.443 m/s | 0.203 m | 16.206 m |
| Touchline out | 24 | 4.300 s | 13.276 m | 17.115 m/s | 1.807 m | 0.021 m |
| Goal-line out | 8 | 7.417 s | 29.860 m | 21.894 m/s | 12.742 m | 0.065 m |

This separates two behaviours. For the 32 outs plus nine interceptions, the ball accurately reaches the CPU-authored point (0.011–0.065 m median miss), but the receiver is elsewhere. Completions and unintended-teammate recoveries instead occur as early opportunistic contacts near a player, 16–17 m before the authored endpoint. The resolver is working as a race; the CPU pass point and receiver route/arrival prediction are the dominant mismatch.

### True Feel cadence and ledgers

In the match-like eight-seed sample, only one established dribble touch per seed occurs because possession is too fragmented. Its scheduled cadence is 26 ticks and separated logical ownership never breaks.

An isolated all-CPU sustained carry using the same current adapter/modules, with pass/shot actions suppressed and opponents made contact-ineligible only to isolate cadence, publishes touch ticks `30,54,78,102,126,150,174,198,222`: eight intervals, all 24 ticks. It has 45 physically separated ticks, zero logical possession changes and zero logical continuity violations. Digest: `7e5146848fbb53c4c2c2f7200e7de94611327ea70b988c87b9c4d19086a60533`.

The eight-seed live maximum recent first-touch ledger is seven IDs. The dedicated current composer soak independently passes 320 legitimate contacts, retains at most 64 recent IDs, advances the watermark to 320 and rejects replay as already consumed. That suite is 14 green / 0 red, including the 20-tick-plus-0.9 m same-player recontact gate.

## Tempo and performance

The movement sample does not support a global player-speed reduction: p95 is 5.564 m/s, below the 9.15 m/s sprint cap. The exact 1.5x match-clock selection remains the strongest tempo explanation.

Engine-only timing over 14,400 ticks was mean 2.182 ms, p95 2.882 ms and maximum 63.901 ms on the final combined run. This excludes browser rendering and should not be presented as frame time.

## Smallest safe implementation proposal

1. Preserve the current True Feel cadence, logical-owner continuity, candidate-acquire completion rule and bounded ledger. Those now pass.
2. In CPU pass intent construction, solve a bounded receiver intercept point from the named receiver's current position/velocity and predicted ball arrival under the existing distance-based launch formula. Clamp lead to a small corridor around the receiver's active run; reject a pass intent if the named receiver cannot enter the contact radius before the predicted opponent race winner.
3. Use that same solved point for both `intent.target` and the receiver continuation/run target. Do not add receiver teleporting, enlarge global contact radii, apply a global ball-speed multiplier, or weaken interception arbitration.
4. First fix the target/route mismatch; then separately calibrate the high short-pass floor. Require a rerun with meaningful completion, controlled possession and shots before promotion.
5. Restore or explicitly label the six-minute Quick Play baseline, and require V2 requested/effective authority in every V2 log.

## Determinism, failure policy and exact results

- Characterization digest: `a0c25dcc677f2aad312bbe92a6133a8f2f99d4143e0ce0e85c7d28b010de19be`.
- Same-seed 1,200-tick host digest: `8d164052ecd7ddff1af063267c59279ce5c955f00833069423a42650c8f5f1ef`.
- Adapter operational digest: `71501396f81665abaa08c20a81c37c864a1aa73cf1360b54e3a705671454520f`.
- 600-tick checkpoint host / adapter: `1b6035ac2980abdf6fbc1f42d27a85c432a822b5d663d6f2f9aa06375dc1ee6b` / `742d0fd2362bd526f7b4516fe4de365f898a8c444d95dbb7a4aac29d33d5d5de`.
- Direct replay and 600+600 export/restore converge byte-for-byte for host and operational adapter state. Restore increments `attachmentGeneration` as intended.
- A non-sequential tick fails closed with `live V2 snapshot tick must be exactly sequential`; status digest `7f844f9eba2412b844f56e49563cf5d91492c6a81999b7348c28be7bea567927`. The adapter exposes the Build 173 sentinel; the strict match host must halt rather than silently run it.

Green/red counts:

- Characterization file: four green / zero red (eight-seed sample, isolated cadence, replay/chunk determinism, bad chronology).
- Current contact composer: fourteen green / zero red.

Run with bundled ChatGPT Node:

```text
/Applications/ChatGPT.app/Contents/Resources/cua_node/bin/node --test --test-reporter=spec tests/cpu-v-cpu-v2-tempo-characterization.mjs
```

No production file was edited by this lane.
