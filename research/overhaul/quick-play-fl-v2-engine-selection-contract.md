# Quick Play FL V2 engine-selection contract

Date: 2026-08-12
Status: **PASS — guarded Quick Play promotion seam**

## Scope

This change adds an engine request to the existing Quick Play setup. It does
not replace or remove any match mode, team-management step, controller route,
online handshake, historic team, Build 173 authority, or launch destination.
`match-engine/match.html` and the live authority adapter are outside this
change's ownership.

## Selection rules

- The default request and effective engine are both `build-173`.
- `fl-v2` must be explicitly selected.
- `fl-v2` is effective only for offline `single-player`, exact all-CPU
  `spectator`, and `free-kick-suite` (shown as Set-Piece Suite).
- Local 2P and Same-Team Co-op preserve the `fl-v2` request but visibly select
  Build 173 before kickoff because their authority routes are unsupported.
- Online locks the selector and always resolves to Build 173. An attempted V2
  request is retained as intent only and receives `online-authority-frozen`.
- Switching back to either supported offline mode recomputes the effective
  engine from the retained request; no mode switch silently deletes the user's
  preference.

## Authoritative payload

Both the stored Quick Play payload and the encoded `#flMatch` engine config
carry:

```text
engine: {
  requested: "build-173" | "fl-v2",
  effective: "build-173" | "fl-v2",
  version: "1.0.0-offline-live-authority-playtest",
  fallbackReason: null | "online-authority-frozen" |
    "unsupported-offline-mode:<mode>"
}
simulationSeed: <positive unsigned 32-bit integer>
```

The seed is FNV-1a over a stable, key-sorted gameplay configuration containing
the effective engine/version, mode, teams, formations, tactics, kits, XI,
bench, controllers, stadium and match settings. Wall-clock `createdAt` is
excluded, so an identical match package produces the same seed.

## Launch-query gate

- `simulationSeed=<seed>` is always emitted for parser-time deterministic
  setup.
- `engine=fl-v2` is emitted only when `engine.effective === "fl-v2"`.
- Unsupported modes, default Build 173 and every Online launch omit/remove the
  V2 marker even if V2 remains the stored request.
- The encoded hash payload remains authoritative over query hints.

## User-facing behavior

The Match Settings page names Build 173 as stable and FL V2 as a strict offline
playtest. A live status panel distinguishes the Single Player, CPU-versus-CPU
and Set-Piece Suite contracts, and the final confirmation names the effective
engine and explains every pre-launch Build 173 selection. After V2 launches, a
fault freezes the match behind an exportable diagnostic rather than continuing
under Build 173. The Match Preview stadium
strip has an explicit layout contract, so its kick-off summary, named stadium
and matchday label remain visually separated rather than collapsing into one
unstyled line.

## Promotion evidence

- `tests/quick-play-fl-v2-engine-selection.mjs`: **7/7 pass** covering default,
  opt-in, mode switches, Online freeze, deterministic seed, payload codec,
  query markers, workflow preservation, exact Madrid BBC source bytes and the
  Match Preview stadium-strip layout contract.
- The final release proof must verify all three supported routes through the real
  five-step Quick Play UI; a standalone lab is not release evidence.
- Existing Quick Play/online/Madrid/formation/replay/name protections:
  **43/43 pass**.
- Combined bounded run: **49/51 pass**. The only two failures are concurrent
  `overhaul-foundation` pins for `match-engine/match.html`; that file changed in
  the authority integration lane and was not edited by this change. The
  foundation manifest was deliberately not updated here.
- Madrid BBC source, including the backward-compatible explicit `reactions`
  default used by the True Feel/MR contact window, remains exactly SHA-256
  `4aacd4a33083eee996beace57ba038caf6e5b5a580f1896a9b1d765240b879d5`.
