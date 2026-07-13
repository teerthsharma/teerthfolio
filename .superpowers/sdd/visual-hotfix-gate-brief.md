# Gate visual hotfix

Owned files: `components/AntarcticSplashShader.jsx`, `components/SdfSealSplash.jsx`, `app/globals.css`, `scripts/check-polar-gate.mjs`.

Make the opening gate a black star field with four animated sinusoidal/noise ribbons: neon blue, blood red, neon red, and nuclear-fusion amber. Keep the title legible. The primary action must be a prominent devil-lettuce green (#39FF14) button labeled `START THE ADVENTURE INTO SEAL'S TOPOLOGICAL LAND`; do not use amber for this CTA. Translate the supplied Godot logic to GLSL/Canvas-safe math rather than copying Godot syntax. Add a failing assertion first, then implement and run `node scripts/check-polar-gate.mjs`. Preserve safe gate and reduced-motion behavior. Do not edit shared scene files.
