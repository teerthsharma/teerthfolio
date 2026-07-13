# Igloo reference-effects attribution

This implementation is an original, asset-free interpretation of three user-supplied references. It does not copy Igloo Inc. models, textures, branding, layouts, or source code.

## Sources and translated principles

- [CodeSandbox pointer interaction](https://codesandbox.io/p/sandbox/elegant-tu-wm3mt7): translated into a screen-space gaussian distance field. Pointer distance gates a bounded outward UV displacement and a local bright-pass bloom; only GPU uniforms change per frame.
- [pmndrs/drei Cloud](https://github.com/pmndrs/drei?tab=readme-ov-file#cloud): translated into one bounded instanced submission with seeded placement, camera-facing quads, explicit quality limits, and distance-safe opacity. The local implementation replaces the reference texture with procedural fBm and uses additive, order-independent plumes.
- [Igloo Inc. case study](https://www.awwwards.com/igloo-inc-case-study.html): translated into browser-native shader motion, real-time transitions, continuous performance budgeting, procedural variety, and explicit high/medium/low compilation budgets.

## Local budgets

- High: 52 mist instances in one draw, 4 procedural-noise octaves, full pointer displacement and four-tap local bloom.
- Medium: 28 mist instances in one draw, 3 procedural-noise octaves, the same interaction at reduced radius/intensity and render scale.
- Low and reduced motion: mist and pointer field compile out; the existing static atmosphere and accessible world remain.

Station-biome work can drive `accent` and `stationInfluence` on `PolarAtmosphereField` without changing geometry or adding draw calls.
