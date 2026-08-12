# Football Legacy V2 workflow closure ledger — 2026-08-12

## Purpose and status vocabulary

This is the closure ledger for the protected Football Legacy workflows and the
known playtest requests reconciled on 12 August 2026. It preserves every
workflow. It does not authorise deletion, silent rerouting, authority widening,
or publication.

- `implemented+proven`: the exact claim has implementation plus focused
  automated or recorded browser evidence. Evidence may be point-in-time when
  later edits touch the same bytes.
- `implemented-needs-browser`: implementation and usually focused tests exist,
  but the current visual, hardware, or end-to-end route is not proven.
- `active-now`: present repair or explicitly active planned work. This does not
  mean the current working bytes have passed final gates.
- `deferred-with-reason`: retained request intentionally outside the current
  bounded repair, with its prerequisite recorded.
- `dormant-R&D`: preserved candidate, lab, evidence, or design work that owns no
  public workflow.

Where an observation contains two independently closable requests, this ledger
splits it into `a` and `b` entries rather than assigning a misleading combined
status.

## Evidence boundary and current repository state

The earlier regression and browser reports remain valid evidence for the exact
bytes they tested, but they are not proof of the current dirty worktree.

- The local branch is `agent/fl-v2-playtest`. `HEAD`, its upstream, and the
  local `origin/main` reference all point to `dbafc3a` (`Publish Build 174 FL V2
  offline playtest`) with zero recorded branch divergence. This proves the
  committed Build 174 baseline is represented by the local remote-tracking
  refs; this audit did not fetch the remote or re-check the public site.
- Before this ledger was added, the worktree had 50 modified tracked paths and
  49 untracked paths. Shared entry points, live V2 modules, tests, contracts,
  `protected-workflows.json`, and release documentation are among them.
- Current `match-engine/match.html` SHA-256 is
  `700e2b14a522dacdfaee8ec346c276e454e47e4492a9d707fea3ed57854e5a8e`.
  It is neither the checklist's earlier frozen hash
  `1787fa39b8f2d11954fd58a48257ce885f24492fdd20e5d9e654ae017bf29aa6`
  nor the later FL-MSPYQGTA report's seal
  `b9a70902e6fd4c276161eeda2c31df10fd2f79603db95245b98ae6a3c4c54988`.
  The current batch is therefore not frozen or hash-sealed.
- Point-in-time evidence includes: 545/547 pre-promotion tests with only two
  moving-hash failures; 31/31 focused three-log tests; 301/301 FL-MSQ1ILVP
  focused/adjacent tests; 52/52 seal plus 88/88 adjacent tests for the later
  FL-MSPYQGTA checkpoint; and real-browser V2 Single Player and CPU-versus-CPU
  smokes. The Set-Piece Suite still required final exact-hash confirmation in
  the release checklist.
- The current first-touch/contact repair lane reports 122/122 focused gates
  green. It still lacks the small host integration needed to render/log the new
  `dribble-touch` continuation and has no browser proof. The current
  restart/slide/keeper/low-cross repair lane is still changing host code; its
  new targeted tests and browser proof have not run.

No source, runtime, test, manifest, or release file was changed to create this
ledger.

Evidence inputs were the current `protected-workflows.json`,
`OVERHAUL-FOUNDATION-WORKFLOW.md`, Build 174 release checklist, agent cleanup
ledger, pre-promotion regression, the FL-MSPJ3TUN/FL-MSPKF196/FL-MSPL675Y,
FL-MSPYQGTA, FL-MSQ1ILVP, and both FL-MSQ4R4TZ reconciliations, their named
focused tests, and a fresh local git status/hash/branch snapshot. Passing counts
quoted here come from those durable reports or the current bounded repair-lane
checkpoint; this ledger did not re-run the full suite while shared files were
still changing.

## Protected workflow closure matrix

The Build 173 default remains binding. FL V2 may be authoritative only through
the exact offline opt-ins for Single Player, all-CPU CPU versus CPU, and the
Set-Piece Suite. Online remains frozen on Build 173.

| Protected workflow | Status now | Preserved authority and honest closure state |
| --- | --- | --- |
| Single Player Quick Play | `active-now` | Legacy remains default; strict FL V2 is exact opt-in only. The published-baseline selector, seed, strict-stop, and browser launch were proven, but first-touch/contact and host integration are changing now. Re-run keyboard/controller/restart/replay and strict-stop on final bytes. |
| Local two-player | `implemented-needs-browser` | Remains legacy with controller assignment, switching, pause, restart, and replay. Shared Quick Play, controller, and match files are dirty, so preserve and browser-smoke the current route. |
| Home Co-op / same-team co-op | `implemented-needs-browser` | Remains legacy and must not acquire V2 authority. Re-check team assignment, shared input, pause/restart/replay on the final shared bytes. |
| CPU versus CPU | `active-now` | Legacy remains default; exact all-CPU `autoplay=1` FL V2 opt-in had a real browser smoke through committed tick 455. It is now an active reproduction/refinement route for receiver, first-touch, and physics-dribbling work, so the prior smoke is not a final seal. |
| Online versus | `implemented-needs-browser` | Frozen legacy authority, including lobby, connection, controller, ready/video/quality, and restart paths. Online bridge and related tests are dirty; run the preserved connection/lobby/quality gates and one current browser setup smoke. No V2 migration is allowed. |
| Input devices | `implemented-needs-browser` | Keyboard and automated DualSense/generic/reconnect contracts exist. Physical Bluetooth reconnect and wake-up still need hardware proof; compare the reported Mac lifecycle in Chrome as well as the normal test browser without treating Connor's prior Chrome issue as proof of cause. |
| Match lifecycle | `active-now` | Pause/resume/restart/replay/diagnostics/full-time are protected. Pause-safe restart timers and human restart control are in the current repair; explicit user-ended export lifecycle remains open. |
| Normal-match set pieces | `active-now` | Kick-off, free kick, corner, penalty, throw-in, and goal kick remain protected legacy routes unless the exact supported V2 match owns them. Throw solving, human pause/watchdog behaviour, and atomic goal-kick staging are active repairs. |
| Set-Piece Suite | `implemented-needs-browser` | Legacy remains default and strict V2 is exact suite opt-in only. Prior camera/replay browser evidence exists, but the checklist's exact-hash final suite confirmation was open and `match.html` has changed again. |
| Career Mode | `implemented-needs-browser` | Entry, world integrity, save/load, and Quick Play payload are preserved. The saved integrity report still records four historical recovery errors (1888, 1950, 2000, 2026); do not regenerate it accidentally. Root must either resolve or explicitly release-defer them, then browser-smoke entry. |
| Create-a-Club | `implemented-needs-browser` | Entry, creation-to-career handoff, save/load, and both tested presets are preserved. Prior gates passed without concurrent browser contention; final shared-entry-point smoke remains. Future grassroots balancing is separate deferred design. |
| Player Career | `implemented-needs-browser` | Player state, Career link, save/load, and original-name linkage remain protected. Focused gates existed; final shared-entry-point browser smoke remains. |
| Content inputs | `implemented+proven` | Teams, formations, tactics, stadiums, kits, historic squads, and save-data round trips are preserved by the committed baseline and focused gates. No current request authorises format migration or removal; rerun only if final staging touches their paths. |
| Diagnostics and playtest export | `active-now` | Strict-stop, self-test, direct links, fast mode, and export remain non-authoritative. Cumulative V2 telemetry was repaired and proven point-in-time; missing `endedAt` for user-ended sessions and new dribble/restart telemetry still need integration. |

## Engineering lanes and release boundary

| Lane | Status now | Closure condition |
| --- | --- | --- |
| F0 baseline and protected-workflow inventory | `active-now` | The structure exists, but both baseline and protected manifests are dirty. Re-freeze once, after runtime work stops; do not chase hashes during active edits. |
| F1 evidence and lawful capture | `active-now` | Captures, hashes, input ledgers, and exclusions exist. Physics dribbling is active planned work, but the passing-heavy FIFA 20 footage is qualitative for dribbling/shape and must not be used to fit drag, speed, restitution, or spin coefficients. |
| F2-F8 deterministic V2 engines/contracts | `active-now` | Ball, movement, CPU, formation, first touch, aerial, contact, restart, set-piece, and clock contracts exist with substantial gates. Current first-touch/contact/formation/movement/host edits require a single integrated rerun and browser playtest. |
| Exact Quick Play opt-in and strict rollback/stop | `implemented-needs-browser` | Proven for the published baseline. Re-run exact query/payload/seed rejection, unsupported-mode fallback before kick-off, and no legacy continuation after a forced candidate fault on the final bytes. |
| Read-only Build 173 shadow diagnostic | `implemented-needs-browser` | Telemetry-only/no-authority contract exists, but hook, manifest, and adversarial tests are dirty. Re-prove no default/online load and no host mutation. |
| Offline authority kernel, playable slice, vertical slice, Set-Piece browser lab, boundary candidate | `dormant-R&D` | Preserve each coherent lab/candidate with its contracts and tests. They are explicitly excluded from the public Build 174 runtime and must never be presented as playable public workflows. |
| Physics capture raw traces and generated ledgers | `dormant-R&D` | Keep local unless separately approved and sanitised. Do not publish large raw captures, private paths, or exploratory tooling in the gameplay release. |
| Create-a-Club grassroots economy/division balancing | `deferred-with-reason` | Retained future design; defer until the world/career loop and division balance are audited. |

## Agent-workflow cleanup boundary

The cleanup ledger is a point-in-time history-retention record, not a gameplay
closure signal. At that checkpoint, 95 of 96 completed subagent histories had
been reversibly archived and 26 explicitly approved dormant/superseded
histories (about 7.85 GiB) had been removed. No runtime, test, report, source
capture, lab, workflow, or active root history was removed. New bounded repair
lanes subsequently became active, so “all agents complete” in that older ledger
must not be read as the current implementation state.

The durable dormant units remain the authority-boundary integration, offline
V2 authority kernel, playable CPU slice, Set-Piece lab, and V2 vertical-slice
lab. Keep each unit coherent; archive or branch it later only as a unit. The
cleanup result does not permit `git clean`, bulk deletion, or selective removal
of their contracts/tests.

## Existing playtest request reconciliation

These compact rows cover every numbered item in the existing reconciliations.
The source reports remain the canonical note-by-note forensic evidence.

### FL-MSPJ3TUN, FL-MSPKF196, and FL-MSPL675Y

| Source items | Status now | Preserved result / remaining proof |
| --- | --- | --- |
| MSPJ 1, 4, 21 — Bluetooth detection/reconnect/held D-pad | `implemented-needs-browser` | Reconnect packet/state regressions passed; exact physical Bluetooth wake/reconnect still needs hardware proof. |
| MSPJ 2a — double-click/ambiguous launch | `implemented+proven` | Single-flight launch, disabled Start, busy/loading feedback, and regression exist. |
| MSPJ 2b — underlying match load time | `active-now` | Profile actual page load/render before optimisation; no reduction was proved by the UI fix. |
| MSPJ 3 — note typing triggers game controls | `implemented+proven` | Editable targets guard keydown and keyup with focused regression. |
| MSPJ 5 — pass, shot, and direct-free-kick power | `implemented+proven` | Metre-based bounded pace/arrival models and monotonic tests exist; subjective feel remains a later playtest tune. |
| MSPJ 6 — wrong pass direction | `implemented-needs-browser` | Stick/facing direction source change exists; no focused compass runtime/browser fixture. |
| MSPJ 7, 8, 12 — throw staging, routes, rotation, variable power | `implemented+proven` | Source and focused throw regressions exist. Latest FL-MSQ4R4TZ CPU-throw and pause defects reopen only those narrower scenarios below. |
| MSPJ 9 — lofted pass self-contact | `implemented+proven` | Common lob trajectory and source lock have focused coverage. |
| MSPJ 10 — pace differential, gait, first-touch burst, shielding | `implemented-needs-browser` | Deterministic movement/presentation gates exist; full-match animation and shield feel remain visual. |
| MSPJ 11 — lob/cross flight | `implemented-needs-browser` | Distance-calibrated model and tests exist; feel and latest low-cross calibration remain open. |
| MSPJ 13 — R1 + Square low cross | `active-now` | Mapping is proven, but FL-MSQ4R4TZ showed excessive pace/height and missed contact; a flat calibrated route is being repaired. |
| MSPJ 14 — L1 nearest-ball and defender recovery | `implemented-needs-browser` | Deterministic gates exist, but the later manual-switch complaint is ambiguous and needs incident telemetry/current browser proof. |
| MSPJ 15 — keeper collection/carry speed | `active-now` | ETA collection and speed floor were proven; current work aligns carry pose/socket and input telemetry. |
| MSPJ 16 — defenders crowd keeper | `implemented+proven` | Buildup release-position contract and focused gates exist. |
| MSPJ 17 — through-ball tap and physical collision | `active-now` | Charged through-ball and player collision contracts exist; loose-ball slide contact is in current repair. |
| MSPJ 18 — foul replay framing/duration | `implemented+proven` | Contact-centred longer replay windows have focused tests. |
| MSPJ 19 — well-weighted through ball | `implemented+proven` | Positive invariant; preserve bounded charge model. |
| MSPJ 20, 22 — striker/winger depth | `implemented-needs-browser` | Carrier-relative formation contracts exist; full-match shape proof remains and formation bytes are dirty. |
| MSPJ 23 — V2 fallback/authority truth | `implemented+proven` | Structured authority transitions and strict stop/no Build 173 continuation have focused and prior browser evidence; re-run only as a final-byte release gate. |
| MSPKF 1 — Set-Piece RS camera direction | `implemented-needs-browser` | Direction/bounds tests and prior browser smoke exist; final current-hash feel check remains. |
| MSPKF 2 — FK/penalty camera plus three full slow replays | `implemented-needs-browser` | Immutable three-angle package and prior browser smoke exist; final visual composition/current-byte suite confirmation remains. |
| MSPL 1 — skippable three-replay package | `implemented+proven` | Exact-once whole-package skip has focused coverage. |
| MSPL 2 — CPU free kicks | `implemented-needs-browser` | Viability/delivery selection exists; dynamic CPU-match outcome proof remains. |
| MSPL 3, 4 — CPU-v-CPU V2 availability and truthful indicator | `implemented-needs-browser` | Published-baseline browser proof reached committed tick 455; current shared bytes require re-smoke. |
| MSPL 5 — visible Total 90 Aerow request | `implemented+proven` | High-contrast custom Aerow-inspired ball was visible in browser/playtest. It is intentionally not licensed or pixel-exact Nike artwork. |
| MSPL 6 — striker support | `implemented-needs-browser` | Formation contract exists; full-match visual proof remains. |
| MSPL 7 — replay after a live save | `implemented+proven` | Incident was a miss; replay gate now refuses save-to-corner while ball remains live. |
| MSPL 8 — midfield support and half-distance visual steps | `implemented-needs-browser` | Formation and gait contracts pass; full-match visual tuning remains. |
| MSPL 9 — referee run animation | `implemented-needs-browser` | Source animation exists; visual proof remains. |
| MSPL 10 — replay must include the shot | `implemented+proven` | Launch-anchor replay capture has focused coverage. |

### FL-MSPYQGTA

| Items | Status now | Preserved result / remaining proof |
| --- | --- | --- |
| 1 — audio needs a click | `implemented-needs-browser` | Multiple unlock gestures and visible fallback exist; autoplay acceptance remains browser-controlled. |
| 2 — poor frame rate | `active-now` | Qualitative complaint only; use the profiling plan below before changing engine/platform. |
| 3, 4 — targeted flight collection/static defenders | `active-now` | Defensive loose-ball recovery exists; targeted/contested attacking receiver continuation remains in current contact/CPU work. |
| 5 — keeper outside-box concern | `deferred-with-reason` | Logged claim was inside the actual area. Preserve a separate swept hand-claim boundary audit; do not tune from a false incident. |
| 6, 8, 11 — keeper release self-recapture loop | `implemented+proven` | Keeper-origin source exclusion and regression exist. Press avoidance is separate. |
| 7, 13 — poor keeper distribution | `deferred-with-reason` | Re-test after current release/input changes, then tune target/press avoidance from clean evidence. |
| 9 — keeper hand alignment | `active-now` | Carry action/socket alignment is in the current bounded host repair. |
| 10, 17 — intrusive/ambiguous V2 identity | `implemented+proven` | Compact `V2 · SP` / `V2 · CPU` indicator was browser-proven point-in-time. |
| 12 — keeper release interference fouls/cards | `deferred-with-reason` | Requires a separate incident/count/team-warning/card rules contract. |
| 14 — live CPU restart choices | `active-now` | Throw solving, metadata clearing, and staging are in the current restart repair. |
| 15 — referee positioning/replay viewport | `deferred-with-reason` | Research/presentation feature, not part of authority repair. |
| 16 — first-touch frequency | `active-now` | Rating/pressure-led calibration is active and focused gates are green; host integration/browser proof remain. |
| 18 — faster keeper carry | `implemented+proven` | Positive playtest evidence; preserve speed floor during pose work. |
| 19 — less icy but stodgy turning | `implemented-needs-browser` | Reduced skating is preserved; weight-transfer/animation needs full-match visual tune. |
| 20 — pass receiver auto-switch/override | `implemented-needs-browser` | Auto-switch exists; initial target and override timing need current incident proof. |
| 21 — weak/gliding pass | `active-now` | Physics dribbling/ground-contact lane must log distance and arrival before coefficient tuning. |
| 22 — good off-ball run | `implemented+proven` | Positive promotion invariant. |
| 23 — team boxed in at restart | `active-now` | Keep own-corner restart support separate from settled formation tuning. |
| 24 — four-second goal broadcast hold | `implemented+proven` | Implemented with focused pause/replay coverage. |
| 25 — pause consumed replay | `implemented+proven` | Cinematic deadlines shift by paused duration with regression coverage. |

### FL-MSQ1ILVP

| Items | Status now | Preserved result / remaining proof |
| --- | --- | --- |
| 1 — backwards locomotion/referee personality | `deferred-with-reason` | Retained animation/personality lane; unrelated to possession repair. |
| 2, 19 — pass acceleration/deceleration/glide | `deferred-with-reason` | Logged passes already decelerated materially. Revisit only with authority-clean distance/arrival data after contact/dribbling changes. |
| 3 — CPU presser should win | `deferred-with-reason` | One incident does not justify a tackle or physical bonus. Reproduce with contact telemetry. |
| 4 — ball looked static | `implemented+proven` | Travel-derived visible rotation exists and was praised in the later log. |
| 5 — CPU throw receiver/staging | `active-now` | Receiver assignment exists; current distance-solved throw/staging repair must prove the outcome. |
| 6, 23 — magnetised possession and gain distance | `active-now` | The 0.74 m V2 boundary/no centre snap was proven point-in-time; current exact-contact/dribble continuation changes require integration/browser proof. |
| 7 — auto-switch to receiver | `implemented-needs-browser` | Chase-only receiver nomination exists without changing trajectory; visual/input proof remains. |
| 8 — second keeper smother/sweep animation | `implemented-needs-browser` | Variants exist; visual re-test remains. |
| 9, 20 — low-power through-ball receiver | `implemented+proven` | Stronger requested-lane weighting has focused coverage. |
| 10 — do not enable semi-assist | `deferred-with-reason` | Explicit non-action preserved; no global/semi-assisted passing mode is enabled. |
| 11, 16 — receiver moves toward ball / input fight | `active-now` | Bounded assist exists; new dribble/contact host integration must preserve contrary user input. |
| 12 — enjoyable missed touch | `implemented+proven` | Positive invariant; do not remove authentic heavy/missed touches globally. |
| 13 — unpressured missed touches too frequent | `active-now` | Seeded rating/pressure calibration is implemented in the current first-touch lane; browser frequency proof remains. |
| 14 — excellent through-ball/touch/shot/save sequence | `implemented+proven` | Positive end-to-end invariant. |
| 15 — strange second-half kick-off | `active-now` | CPU launch diagnostics exist; current first-touch/kick-off work needs a new diagnostic-quality reproduction. |
| 17, 18, 21, 24, 25 — CPU/neutral-ball collection | `active-now` | One collector per team and receiver ETA contracts exist; current CPU/contact playtests must prove continuation rather than shape-only targeting. |
| 22 — replay angles too quick | `implemented+proven` | Full package slowed to `0.4x / 0.4x / 0.2x` with focused coverage. |

## FL-MSQ4R4TZ — complete 30-note closure

The source log contains 927 events and 30 annotations. It records no authority
failure, runtime error, or fatal stop. `endedAt:null` means the export did not
record an explicit user-ended lifecycle; it is not evidence of a crash.

| # | Request / observation | Status now | Exact evidence and bounded disposition |
| ---: | --- | --- | --- |
| 1 | Remove black tunnel block; retain a darker tunnel | `deferred-with-reason` | No image exists. Two opaque near-black tunnel boxes are a strong code candidate, not visual proof. Make a later isolated visual change and browser-check an open but dark tunnel. |
| 2 | Kick-off availability is about two seconds late | `deferred-with-reason` | Code intentionally imposes 2.3 s minimum plus stable readiness; referee position is not the gate. Calibrate a bounded legal latency after the active contact/restart repair, with no-premature and upper-bound tests. |
| 3 | Broken unpressured first touch at kick-off | `active-now` | Current rating/pressure-led first-touch calibration and dribble continuation address this family; host hook and browser frequency proof remain. |
| 4 | Good defender take; poor frame rate | `active-now` | Defender take is a positive invariant. Rendered FPS is not present in the log; profile before optimisation or platform change. |
| 5 | CPU ran/chased ball out | `implemented-needs-browser` | Log supports intended-receiver/recovery failure. ETA preference is a partial implementation; replay proof or explicit receiver-abort is still required. |
| 6 | Manual nearest-player switch fought input | `deferred-with-reason` | No L1 event corroborates the complained instant; a later L1 switched in 73 ms. Instrument candidate ranks/current-player exclusion and 250 ms overwrite history before changing selection. |
| 7 | Maybe web version; move playtesting to PC | `deferred-with-reason` | Same unmeasured performance concern. Desktop packaging and PC handoff follow comparable profiling, not this log. |
| 8 | Throw overhaul/aim guide/rotation unclear | `implemented-needs-browser` | Rotation is applied, but guide visibility remains. Visually prove rotation and decide whether to minimise the guide; do not infer from the log. |
| 9 | CPU should take ball; first touch too erroneous | `active-now` | Same first-touch/collector continuation lane as notes 3 and 22. |
| 10 | Through ball redirected away from wide fullback | `implemented-needs-browser` | Requested-lane weighting exists; replay this exact high/wide lane and record chosen candidate/assist before further tuning. |
| 11 | Awful CPU throw-in | `active-now` | Constant throw launch caused target overshoot and stale metadata. Distance solving and metadata clearing are in current host repair; tests/browser remain. |
| 12 | Auto-switch if teammate reaches ball first | `active-now` | Collector/receiver assignment exists; current CPU/contact integration must prove deterministic handoff without fighting user input. |
| 13 | Excellent keeper distribution | `implemented+proven` | Direct positive playtest evidence; preserve this outcome while repairing keeper input/target edge cases. |
| 14 | Static CPU fullback did not collect/exploit space | `implemented-needs-browser` | Intended-receiver ETA weighting is partial mitigation; keeper-pass/fullback continuation needs replay proof. |
| 15a | Nice pass selection/ball physics | `implemented+proven` | Positive playtest invariant; no coefficient change follows from praise alone. |
| 15b | FIFA-style instant replay with dolly/pan/boom/tilt/truck | `deferred-with-reason` | Requested and not built. Safest future design is pause-only review of an immutable snapshot buffer, with scrub/speed and isolated six-axis camera state; exit must restore the exact paused match and never consume automatic replay state. |
| 16 | Tackle deflection or pass straight out | `deferred-with-reason` | The note is ambiguous. Add action/contact/deflection provenance before selecting a physics or decision fix. |
| 17 | Paused throw auto-taken | `active-now` | Exact bug: restart clocks/watchdog advanced over pause. Timer shifting is implemented; human-watchdog gating is in current repair. Targeted test and browser proof remain. |
| 18 | Slide tackle did not collide with loose ball | `active-now` | Root cause confirmed: old collision paths inspected only an owner. Owner-independent swept loose-ball contact is implemented in the active batch; targeted tests/browser remain. |
| 19 | Keeper ignored Cross/X release | `active-now` | The recorded release was the 300-frame watchdog; no input edge was logged. Current work adds accepted/rejected release telemetry and unifies control paths; test pause/reconnect/watchdog exactly once. |
| 20 | Second slide had no hitbox | `active-now` | Same loose-ball slide-contact repair as note 18. |
| 21 | Dead-ball glide and illegal goal-kick staging | `active-now` | Atomic legal staging before the first observable restart frame is in current repair. Physical/visual drag remains separately telemetry-gated. |
| 22 | Player touched then ran away; run CPU-v-CPU tests | `active-now` | CPU-versus-CPU is the active reproduction route for retained touch, collector continuation, and physics dribbling. |
| 23 | Backflip direction and speed | `deferred-with-reason` | Current backflip uses negative full rotation over 112 ticks. Reverse direction and shorten only in an isolated celebration change, then visually verify take-off/landing/camera. Not yet built. |
| 24 | Eight-second roaming celebration selection; CPU must wait | `deferred-with-reason` | CPU selected a backflip 1 ms after goal; human window is 4.3 s and players idle. Requested eight-second scorer-roam/teammate-follow phase is not built; it needs pause-safe timing and no CPU choice before deadline. |
| 25 | Slide tackle felt successful | `active-now` | Forensics show `won:false` followed by incidental reception, so this is an acceptance feel reference, not proof the old slide collision worked. Reproduce it with an actual logged slide contact. |
| 26a | Ball drag needs work | `deferred-with-reason` | “Drag” is unclassified between skill, ground deceleration, and aerodynamic drag. Capture initiating action, authority owner, velocity/spin, surface/air state, and stop/arrival distance first. |
| 26b | New ball spin looks excellent | `implemented+proven` | Direct positive visual evidence; preserve travel-derived spin while physical drag is investigated. |
| 27 | Keeper carry arm animation still wrong | `active-now` | Current repair aligns carry action and ball socket across CPU/human control paths; targeted pose invariant and browser visual proof remain. |
| 28 | R1+Square low cross too hard/receiver unclear | `active-now` | Mapping worked, but trajectory stayed high past contact. Flat/skidding pace/contact calibration is in current repair; targeted and browser proof remain. |
| 29 | Repeated touches suggest physics/collision dribbling | `active-now` | Physics dribbling is explicitly active planned work. FirstTouch V2 now classifies same-player retained chains as `dribble-touch`; host integration must render/log it, and animation/collision feel needs CPU-v-CPU plus human browser playtests. |
| 30a | “Really breaking”; end playtest | `active-now` | Minute 56-71 is the primary reproduction window: 13 retained-touch receptions, then eight tackle inputs, three contact wins, and four late skill inputs. It proves worsening contact-control playability, not a crash. |
| 30b | Explicit user-ended export state | `deferred-with-reason` | `endedAt:null` should become an explicit lifecycle result, but only after the gameplay repair so export schema/lifecycle changes stay isolated. |

## Performance profiling, desktop packaging, and PC handoff

| Request | Status now | Decision gate |
| --- | --- | --- |
| Measure poor frame rate | `active-now` | Add a short, opt-in browser profile for RAF p50/p95/p99, >33 ms and >50 ms frames, fixed-step catch-up count, DPR/resolution, renderer calls/triangles, browser/UA, visibility, camera, crowd, and power state. Exclude pauses and note-writing. Run the same seeded scene in the current browser and Chrome; Connor's prior Chrome issue is a hypothesis, not measurement. |
| Conclude web is the cause | `deferred-with-reason` | The log has no FPS/render/GPU samples. Simulation `frame` is not rendered FPS. Do not attribute the issue to the web platform without comparable profiles. |
| Desktop packaging/plugin wrapper | `deferred-with-reason` | A wrapper still renders the WebGL scene. Package only if profiling identifies a browser/platform constraint that the wrapper can change, and only after the current web release remains recoverable. |
| PC playtest handoff | `deferred-with-reason` | No Windows/PC artifact, packaging toolchain, target spec, or parity gate exists. First freeze a reproducible web build/profile; then define target Windows version, input devices, packaging/update route, save/log locations, integrity hash, and rollback instructions. |

## Root closure actions, in order

1. Finish or deliberately stop the two active host repair lanes. Integrate the
   first-touch `dribble-touch` host hook and finish restart/throw/slide/keeper/
   low-cross changes without adding the deferred camera, celebration, tunnel,
   desktop, or packaging work to this batch.
2. Run the new targeted repair tests, then the affected first-touch, contact,
   CPU, movement, formation, restart, replay, controller, online, shadow,
   strict-stop, and protected-workflow gates. Treat any current performance
   budget result separately from functional failure and repeat it without
   concurrent browser load.
3. Browser-test the final local bytes through real Quick Play: V2 Single
   Player, V2 CPU versus CPU, V2 Set-Piece Suite, forced strict-stop diagnostic,
   unsupported V2 fallback before kick-off, legacy Single Player, Local 2P,
   Home Co-op, Online setup, Career, Player Career, and Create-a-Club. Include
   physical controller reconnect when hardware is available.
4. Profile one reproducible late-match scene in the normal browser and Chrome.
   Decide on optimisation only from recorded render data. Keep desktop
   packaging and PC handoff deferred unless that comparison establishes a
   platform-specific reason.
5. Resolve the four saved career integrity errors or record an explicit release
   deferral. Do not regenerate the report as a side effect of ordinary tests.
6. Reconcile README, CHANGELOG, Quick Play, Match Engine, foundation, release
   checklist, and manifests with the final actual state. The checklist's old
   branch/upstream and frozen-hash statements are already stale relative to
   current git evidence. Sanitise absolute private paths.
7. Freeze runtime once, regenerate exact hashes/manifests once, inspect staged
   scope explicitly, and keep dormant labs, candidates, raw captures, generated
   ledgers, and private-path research out of the gameplay release without
   deleting them.
8. Only then commit/push the new repair batch and verify the public cache-busted
   asset hashes plus one final public Quick Play launch. The committed
   `dbafc3a` baseline and today's dirty repair batch must remain distinct in the
   release record.

## Preservation statement

The agent cleanup removed approved completed rollout histories, not runtime,
tests, reports, captures, labs, or workflows. The remaining dormant R&D units
and every protected legacy route stay retained. Nothing in this ledger converts
a lab into a live workflow, widens V2 authority, approves desktop migration, or
turns qualitative playtest wording into measured performance evidence.
