# Task 3 — Premium Fullscreen Render Gate

## Opening-theme comparison

| Theme | Relationship to the fixed building personalities | Strengths | Risks |
| --- | --- | --- | --- |
| Polar field manual | Treats Plaque as a printed observatory plate and the other sites as indexed technical specimens: S2 kernel citadel, Aether manifold sanctuary, Field chamber lab, QPU coherence causeway, Upstream signal harbor, Topology archive canyon, Assembly tool yard. | Precise, legible, and compatible with the evidence language. | Repeats the current pale poster problem; memo panels flatten distinct places into one editorial treatment. |
| Aurora transit map | Casts Plaque as the departure terminal and every building as a colored stop on a luminous route. | Makes the CTA navigational and gives each destination a recognizable accent. | Easily becomes generic neon-on-black UI; route graphics can outrank the physical dome and terrain. |
| **Dawn ice passage — recommended** | Plaque is the home observatory at first light. A cut path in the snow leads past the guide seal and through the dome threshold toward the wider world: S2 remains a blue faceted citadel, Aether a violet sanctuary, Field an amber lab, QPU a mint causeway, Upstream a coral signal harbor, Topology an indigo canyon, and Assembly an amber-steel yard. | Preserves every building personality while making the gate one believable polar place. The route, seal, and CTA share one job: enter the world. Dawn cobalt, glacier ivory, restrained mint, and one amber navigation beacon avoid both cyan wash and generic rainbow neon. | Requires careful mobile framing so the seal, threshold, and dome remain visible together. |

## Selected direction

**Dawn ice passage** is the cohesive opening theme. The fullscreen frame should read in this order: foreground snow/contact route, midground dome plus guide seal, background dawn atmosphere. Copy becomes a quiet observatory identifier rather than a competing hero. The sole `Start Exploring` action belongs at the end of the snow route, not inside a detached card. The mascot communicates real states through pose/light (idle, requesting, ready/error) and is never required to understand or activate the control.

This direction follows the object-world gate: silhouette, contact, material, and route remain readable with the HUD mentally removed. It also removes the anti-slop failure modes visible in the supplied reference: no floating memo cards, no giant stacked headline, no decorative proof panels, no generic glassmorphism, and no timer-driven pseudo-progress.

## Contract to preserve

- Keep `active`, `activeArtifact`, `diagnosticEvents`, `guideState`, `onEnable`, and `safeMode` behavior.
- Keep fullscreen, wake-lock, and WebGL probing inside the native button's user gesture.
- Keep exactly one native primary button with the visible `Start Exploring` contract and normal keyboard activation.
- Expose real permission/diagnostic work in a polite status region; do not imply completion from elapsed time.
- Keep a safe-mode path and a static but stateful reduced-motion path.
- Preserve the bounded WebGL lifecycle and cleanup introduced in `AntarcticSplashShader.jsx`.

## Implementation handoff

The selected Dawn ice passage is implemented within the Task 3 production scope:

- `components/SdfSealSplash.jsx` now renders explicit background, midground, and foreground layers. The physical sequence is snow route → stateful guide seal → observatory dome threshold. The former proof/collision memo cards and duplicated safe-mode button branches are removed.
- Loading is driven only by real `permissionState`, `permissionRows`, and diagnostic events. The elapsed-time `charge` RAF and its pseudo-progress bar are removed. A polite `role="status"` region exposes idle, requesting, and resolved states.
- The sole native `Start Exploring` button retains fullscreen, wake-lock, WebGL probing, and `onEnable` inside its click callback. Safe mode remains explicit through `data-safe-mode` and truthful status copy.
- `components/AntarcticSplashShader.jsx` now draws the cobalt dawn, restrained aurora, mountain horizon, snow field, and perspective passage. It keeps the bounded context lifecycle and caps drawing at 30 FPS / 1.15 DPR.
- Reduced motion is observed in JavaScript. The shader freezes at time zero and stops scheduling its RAF; CSS state changes remain visible while beacon, seal-halo, and request-line animations stop.
- Splash-specific rules appended to `app/globals.css` author the 1440×900 composition, a dedicated ≤720px mobile composition, compact short-mobile handling, focus-visible CTA treatment, and the reduced-motion override.

No IglooWorld or open-world implementation file was touched by Task 3. No server was started and no browser capture was taken.

## Intended Wave E verification

1. Run `node scripts/check-polar-gate.mjs` and retain the full output. The contract has not been run in this wave by instruction.
2. Run ESLint against `components/AntarcticSplashShader.jsx` and `components/SdfSealSplash.jsx`.
3. Capture settled frames at 1440×900 and 390×844 from the shared server.
4. Repeat with `prefers-reduced-motion: reduce`; verify state changes remain and idle field/camera oscillation stops.
5. Exercise safe mode and keyboard activation; confirm a single primary action and truthful live status.
6. Record page errors, console errors, shader compile failures, WebGL context loss, and screenshot timeouts; acceptance requires zero shader/runtime errors.
