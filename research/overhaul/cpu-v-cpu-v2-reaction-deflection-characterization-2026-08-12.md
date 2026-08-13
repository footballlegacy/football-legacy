# FL V2 CPU-v-CPU reaction and passive-deflection characterization — 2026-08-12

## Scope

This is a bounded characterization of the reaction-rated passive Magnus Reynolds body-contact lane. It does not remove or replace any workflow, and it does not change production code.

The final accepted run used these exact bytes before and after execution:

- Ball V2: `3c9ab6cd4931dbbd123c1ef35292bf093cb19acd128e1a6330099007caa0a8e4`
- live contact composer: `9d1b7797484b0f5af1fd4fcb26afb688d272d89da001d35c8a78dd211252083e`
- live authority adapter: `b894891d38ffc46392d3f8b2a5c3754524df6981f340b615144bd41c8b577654`
- True Feel: `12f096276b7a83cc1ff3d8e2713208763b55d4fbe3d353b599b8a5e6dda8603c`
- match host: `c5c016e71cacc51e06839f50e0bed03fac89137ee326d84271080f0f31f9a71f`
- historic squads: `5d3873c4bda4adac774b02d066433db9a75e9afb7e59ed885aaa29cb8a14cc96`

The test file is `tests/cpu-v-cpu-v2-tempo-characterization.mjs`, SHA-256 `d9e0b6d2e326651a3d535694703b00206a7422745013c8e6e78fb999e16f55e9`.

## Result

Five tests pass:

1. eight-seed, 14,400-tick live CPU-v-CPU adapter characterization;
2. forced on-path reaction/body classification;
3. isolated True Feel cadence;
4. same-seed and export/restore determinism;
5. fail-closed chronology.

There are zero valid-run strict stops, zero logical-ownership continuity violations, zero deflection ownership violations, and zero source self-contacts during the protected release ages 0, 1 and 2.

## Forced physical-contact evidence

The same deterministic 8.0 m/s frontal fixture was applied in the exact CPU-v-CPU contact workflow. Every physical class produced one ownerless Magnus Reynolds deflection:

| Physical actor | Intended | Release age | Reaction delay | Speed after contact |
| --- | ---: | ---: | ---: | ---: |
| non-target teammate | no | 0 ticks | 12 ticks | 2.895 m/s |
| opponent | no | 0 ticks | 12 ticks | 2.895 m/s |
| intended receiver | yes | 0 ticks | 9 ticks | 2.895 m/s |
| source, after protection | no | 3 ticks | 12 ticks | 2.895 m/s |

All four results have `ownerCandidateId: null` and `possessionDisposition: remain-loose`. Repeating an identical request returns an identical result.

The reaction-rating series is monotonic and explicit-stat-led:

| Reactions | Delay |
| ---: | ---: |
| 1 | 12 ticks |
| 25 | 10 ticks |
| 50 | 7 ticks |
| 75 | 5 ticks |
| 99 | 3 ticks |

The intended receiver receives the designed three-tick anticipation reduction, so a 1-rated intended receiver has a nine-tick delay rather than twelve.

Forced-contact digest: `1be1d99bed2fca5e5bd4f6b560ffdfe7e3269cfa60d3ae77aa4142cac1b9719a`.

## Natural CPU-v-CPU sample

Across eight seeds and four simulated minutes:

| Measure | Result |
| --- | ---: |
| passes | 29 |
| completed | 26 |
| intercepted | 1 |
| unresolved at sample end | 2 |
| unintended teammate recoveries | 0 |
| resolved completion rate | 96.3% |
| natural passive body deflections | 0 |
| first-touch contacts | 80 |
| candidate-acquire / remain-loose | 63 / 17 |
| pass-race evaluations / accepted | 4,158 / 83 |
| strict stops | 0 |

The zero natural deflections does not contradict the forced physical result: in this bounded sample, the CPU pass-race gate selected clear paths. It does mean the new error channel is mechanically proven but not naturally exercised by this CPU calibration. The 96.3% resolved completion rate and only one interception are an over-safe/over-accurate calibration warning for later gameplay playtesting.

## Determinism and timing

- aggregate characterization digest: `ced811b771b858b98739c75ce43ceb2e5249245bb6cefa78c4f56641d0f62021`
- 1,200-tick host digest: `2c8e0e11207e2e1baeb7e433e34dc1f0b7bfff1bae19509ef93f09601d6b46b8`
- adapter operational digest: `eb3bcdaaa0ddfd33b09c3d308c525914ecd007176efbf0d3f4d520e3b100f47c`
- direct replay and 600+600 export/restore converge byte-for-byte;
- deliberate bad chronology still fails closed.

The final combined run measured 10.412 ms mean, 16.642 ms p95 and 318.454 ms maximum engine-only tick time. The warmed forced-contact composer measured 0.849 ms mean across its three timed class probes. The combined timing is materially worse than the previous characterization's 2.182 ms mean, 2.882 ms p95 and 63.901 ms maximum. Because other final suites may have shared the laptop during this measurement, treat this as a P1 performance warning requiring an isolated rerun, not as an attributed production regression yet.

## Calibration verdict

The reaction-rated passive-body seam passes mechanically and transactionally. Preserve it. Before calling natural match calibration closed, separately investigate:

1. the over-safe pass-race selection and 96.3% resolved completion rate;
2. whether representative play naturally creates any blocked or deflected lanes;
3. the engine-only timing warning under an isolated machine load.
