# Horizontal World 100% Layer Plan

Goal: turn the approved Igloo + Active Theory horizontal base into a complete interactive portfolio world. The site must feel driven along a horizontal axis, prove Teerth's work in the first viewport, and keep the serious object-world language intact.

## Global Constraints

- Preserve the Igloo + Active Theory dark polar object-world.
- Keep the site horizontal: no vertical document scroll as the main route.
- The guide/avatar must be functional navigation state, not decoration.
- The live GitHub/evidence surface must appear in the first viewport.
- Keep all checks Vercel-safe and free-hostable.
- Do not reintroduce old Antarctica or cute mascot implementation paths.

## Task 1: Functional Axis Probe

- Add a `SealAxisProbe` R3F object that follows the current horizontal axis.
- Make the probe visibly lean or pulse while the user is moving.
- Keep the shape serious: a dark seal/probe silhouette, not a cartoon mascot.
- Pass axis velocity/movement state from `IglooWorld` into `IglooScene`.

## Task 2: Continuous Controls

- Convert WASD/arrow input from one-shot stepping to hold-to-move traversal.
- Keep number keys and artifact buttons as direct docking controls.
- Add pointer/touch drag on the world for mobile horizontal traversal.
- Preserve explicit horizontal document navigation for Work, Radar, and Archive.

## Task 3: First-Viewport Evidence

- Add a compact live evidence strip to `IglooHud`.
- Show the newest live GitHub/upstream event with repo, label, title, timestamp, and source link.
- Keep fallback mode honest when the live API fails.

## Task 4: Contract And Styling

- Update `check-teerth` so the axis probe, continuous movement, drag movement, and live evidence strip are required.
- Add `.igloo-axis-probe` and `.igloo-live-strip` styles.
- Verify desktop, tablet, and mobile have no text overlap.

## Task 5: Verification

- Run `npm run check:teerth`.
- Run `npm run lint`.
- Run `npm run build`.
- Run browser verification at `1440x900`, `768x1024`, and `375x667`.
- Verify canvas nonblank, horizontal document width, zero vertical scroll, WASD hold movement, wheel movement, drag movement, live strip rendering, and no overlap.
