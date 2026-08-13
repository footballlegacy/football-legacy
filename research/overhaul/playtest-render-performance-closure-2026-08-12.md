# FL V2 playtest rendering performance closure — 2026-08-12

## Scope

This pass improves the normal browser playtest renderer without changing simulation speed, gameplay authority, match rules, teams, modes, or protected workflows. Build 173 remains the default engine and the prior high-quality renderer remains available with `?renderQuality=high`.

## Measured result

Measurements were taken in the Codex in-app Chromium browser on the same Mac and local server. They are comparative engineering measurements, not a claim about Firefox, battery state, every stadium, or every machine.

| Route | Render profile | Approx. FPS | Median frame | 95th percentile | Draw calls | Device pixel ratio |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Previous Single Player baseline | prior default | 9.48 | 100.0 ms | 200.9 ms | 2,585 | 2 |
| FL V2 Single Player | balanced | 30.41 | 32.8 ms | 49.1 ms | 840 | 1 |
| FL V2 CPU v CPU | balanced | 35.25 | 32.3 ms | 50.0 ms | 838 | 1 |

The final real-match Single Player smoke also survived kickoff, movement and a pass through 570 committed FL V2 ticks with `failureCode=none`, no strict-stop page and no browser warnings or errors.

## Changes

- Balanced is the normal playtest profile: device-pixel ratio is capped at 1, one 1024px basic stadium shadow map is retained, and dynamic player shadow maps are disabled in favour of the existing contact-shadow presentation.
- Broadcast-distance footballers retain their articulated silhouette while very small mesh details use a distance gate.
- Night lighting uses six wider floodlights in balanced mode; high quality retains ten.
- The effective renderer profile is exported in playtest telemetry so future logs distinguish simulation issues from presentation cost.
- `renderQuality=high` preserves the previous DPR 2, soft-shadow, 3072px and full-detail path for visual comparison.

## Limits and next evidence

- The change does not justify a web-to-desktop migration by itself. A desktop wrapper would still run essentially the same renderer unless the engine or asset pipeline changed.
- Firefox and Bluetooth-controller performance still need hardware-specific observation.
- Subjective smoothness, low-battery behaviour and long-match thermal throttling remain playtest questions; no synthetic measurement is substituted for those observations.
- No workflow was removed or renamed.
