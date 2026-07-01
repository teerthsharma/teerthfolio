# Teerth Sharma Igloo + Active Theory Faithful Portfolio Design

Date: 2026-07-01

## Decision

The next rebuild uses **Igloo + Active Theory Faithful First** as the base design language. Igloo defines the physical polar object-world. Active Theory defines the cinematic darkness, shader atmosphere, and motion discipline. Bruno Simon, Wodniack, Rogier, and Gregory ideas can be translated after this combined foundation works.

This does not copy Igloo or Active Theory assets, copy, models, audio, names, routes, or exact layouts. It adapts their systems: a cold physical world, one hero object, sparse edge typography, camera-like scene travel, artifact-led project discovery, fullscreen cinematic atmosphere, and materially deep shader motion.

## Target Feeling

The first viewport should feel like a serious Antarctic research environment built by Teerth Sharma and filmed through a high-end cinematic shader system: quiet, cold, technical, expensive, dark, and physically present. It should not feel like a themed portfolio, a neon dashboard, a mascot page, a project-card grid, or a generic particle scene.

## Non-Negotiables

1. One physical polar world owns the site.
2. The first viewport has a central object and cinematic atmosphere, not a large text hero.
3. Every major project appears as an inspectable research artifact.
4. Typography is sparse, monospaced, and edge-anchored.
5. The seal identity is infrastructure/authorship, not a cute mascot.
6. Scroll/click movement feels like camera travel through a scene.
7. Shader/canvas motion must encode atmosphere, depth, or state; no decorative noise-only particles.
8. No Igloo or Active Theory proprietary assets, exact copy, audio, geometry, or brand structure.
9. Desktop, tablet, and mobile screenshots must pass before completion is claimed.

## Reference Anatomy

Igloo’s useful patterns:

- Fullscreen WebGL-like world, not normal document layout.
- Pale blue-gray ice terrain with snow, fog, bloom, and frosted material.
- One central physical object visible before the user reads much text.
- Edge UI: logo/copyright/manifesto/sound/scroll labels.
- Portfolio items as physical objects with technical labels.
- Camera drift, inertial movement, object transition, and fog/glitch changes.
- Sparse text over world space rather than decorative cards.

Active Theory’s useful patterns:

- Fullscreen dark cinematic atmosphere as the brand surface.
- Restraint: text and controls sit inside the visual world without covering it.
- Shader/video/canvas motion carries prestige before conventional content appears.
- Contrast-protected copy over moving visuals.
- Slow deliberate motion that reveals hierarchy, continuity, and state.
- Premium darkness: blacks, graphite, cold light, controlled bloom, and deep spatial gradients.

Patterns to avoid:

- Reusing Igloo’s igloo model, cube carousel, brand text, audio, textures, or exact route naming.
- Reusing Active Theory’s exact site structure, brand language, media, or project presentation.
- Making the page too bright for Teerth’s requested darker serious tone.
- Returning to a generic dark shader with floating labels.
- Covering the cinematic world with dashboard panels.

## World Model

The world is **Seal Topology Observatory**, a polar research station built into an ice shelf and shot through a dark cinematic atmosphere.

The hero object is a fractured ice observatory dome made of block segments. It is not a literal Igloo clone: the shape should suggest a research observatory and OS kernel chamber, with carved seal insignia, topology seams, and an illuminated S2 core inside. Active Theory influence appears in the rendering language around it: volumetric darkness, depth fog, edge bloom, scan distortion, and slow stateful shader motion.

The site has three scene bands:

1. **Exterior Observatory**
   - First viewport.
   - Ice terrain, distant ridges, dark fog, snow, central observatory object, cinematic shader veil.
   - Edge manifesto: Teerth Sharma, physics/topology/compilers/AI systems, public repo metrics.

2. **Artifact Field**
   - Scroll/click moves camera around research artifacts.
   - Artifacts represent major systems and upstream work.
   - Labels are concise technical annotations, not cards.

3. **Interior Archive**
   - Evidence archive and project index become cold storage walls, blackbox logs, radio mast signal, and topology drawers.
   - Existing LiveRadar, ProjectIndex, and EvidenceArchive logic can remain but must be visually translated later.

## Content Objects

Use Teerth’s mined corpus as physical objects:

- **Observatory Plaque**
  - Evidence: `teerth-content.profile`, metrics, 75-repo corpus.
  - Copy: "Teerth Sharma. Physics, topology, compilers, AI systems. 75 public repos. 25 systems/runtime repos. 11 topology-ML repos."

- **S2 Kernel Core**
  - Evidence: `Epsilon-Hollow`, Seal OS station.
  - Object: glowing geodesic sphere inside the observatory.
  - Copy: "Seal OS: a Rust microkernel where OS state is topology on S2, gated by ISO boot proof."

- **Manifold Reactor**
  - Evidence: `Aether-Lang`.
  - Object: green manifold coils with Betti gauges and proof rods.
  - Copy: "Aether-Lang runs ML on manifolds: persistent homology, spatial neighborhoods, and a Lean-verified kernel."

- **Field Chamber Coils**
  - Evidence: `faraday`, `hamliton`.
  - Object: amber electromagnetic coils in an ice-glass test tank.
  - Copy: "Faraday and Hamilton turn electromagnetic coupling into fixed-point tensors and gauge-field lattices."

- **QPU Ice Bridge**
  - Evidence: `topobridge-q`, `aether-link`.
  - Object: narrow pressure bridge across a crevasse with homology cables.
  - Copy: "Homology crosses the crevasse: IBM QPU verification on one side, low-latency I/O on the other."

- **Upstream Radio Mast**
  - Evidence: Triton, PyTorch, NeMo Relay upstream work.
  - Object: exterior mast receiving live GitHub/upstream signal.
  - Copy: "Sparse attention, topology-aware PyTorch modules, and ACG cache reuse appear as upstream weather."

- **Topology Archive Wall**
  - Evidence: `lambda-topo`, `topoflow`, `topoml`, `phi-mem`, `charlie`.
  - Object: cold archive drawers with persistence diagrams.
  - Copy: "Persistent homology is the archive index: memory, visualization, SDKs, and phase-space experiments."

- **Assembly Tool Locker**
  - Evidence: `vec-simd`, `pgtable-asm`, `hollow-asm`, `topo-asm`.
  - Object: low-level maintenance bay.
  - Copy: "The hand tools are AVX-512, page tables, no_std kernels, and SIMD persistent homology."

## Interaction

Desktop:

- Scroll advances through scene bands with camera-like easing.
- Clicking an artifact focuses it and updates an edge detail label.
- Keyboard can cycle artifacts with arrow keys.
- Quality control is present but discreet.

Mobile:

- No forced game controls.
- Swipe/scroll moves through object stops.
- Artifact labels stay inside the viewport.
- Touch targets are at least 44px where practical.
- The world remains visible; panels must not bury the central object.

Reduced motion:

- Static polar composition.
- Artifact list appears as anchored labels around the world.
- No heavy camera movement or continuous particle loops.

## Visual System

Materials:

- Igloo layer: ice glass, frost, compacted snow, graphite, pale blue-gray fog, white light, muted cyan signal.
- Active Theory layer: deep black, graphite gradients, volumetric shadow, controlled bloom, scan texture, shader distortion, low-frequency motion.
- Avoid neon dominance, one-note teal palettes, and flat dark backgrounds.

Typography:

- Monospace-first.
- Small technical labels, manifesto blocks, source labels, object IDs.
- Teerth’s name should be present but not hero-scale after the initial read.

Layout:

- Edge UI, not cards.
- Project detail panels must feel like instrument readouts or labels attached to objects.
- Repeated archive content may use framed rows later, but the first viewport cannot be a dashboard.
- The cinematic canvas remains visible when all labels are hidden.

## Component Boundary

Keep:

- `data/teerth-content.json`
- `data/project-intelligence.json`
- `lib/teerth-data.js`
- `lib/github-live.js`
- Existing LiveRadar, ProjectIndex, and EvidenceArchive content logic for later restyling.

Replace for the public world:

- `components/AntarcticaWorld.jsx`
- `components/SealGuide.jsx`
- `components/WorldStations.jsx`
- `public/teerth-world.js`
- All `.antarctica-*`, `.world-*`, `.css-seal-*`, and previous shader-restart CSS blocks.

New implementation files:

- `components/IglooWorld.jsx`
- `components/IglooScene.jsx`
- `components/IglooArtifacts.jsx`
- `components/IglooHud.jsx`
- `components/ActiveTheoryVeil.jsx`
- Optional `components/IglooReducedMotion.jsx`
- New CSS namespace only: `.igloo-*`

Integration files:

- `components/PortfolioPage.jsx` swaps `AntarcticaWorld` for `IglooWorld`.
- `app/layout.jsx` removes the vanilla `teerth-world.js` script injection.

## Data Flow

`app/page.jsx` continues to assemble:

- Teerth content.
- Project intelligence.
- Live GitHub summary.

`IglooWorld` receives content, live summary, projects, and stations. It owns only visual state:

- active artifact
- scene band
- quality mode
- reduced motion

The live GitHub behavior stays honest:

- Show live mode when GitHub fetch succeeds.
- Show snapshot mode when fallback is used.
- Show generated timestamp where possible.

## Verification

Required before completion:

- `npm run check:teerth`
- `npm run lint`
- `npm run build`
- Browser screenshots at 1440x900, 768x1024, and 375x667.
- Canvas/WebGL nonblank pixel check.
- Seal/observatory object visible in first viewport.
- Cinematic atmosphere visible even if artifact labels are hidden.
- Text does not overlap on mobile or desktop.
- Artifact click/keyboard navigation works.
- Reduced-motion fallback renders without broken layout.

## Acceptance Criteria

The first screenshot must read as:

> Teerth Sharma’s polar research observatory, filmed through a dark cinematic shader system, where ML/topology/compiler projects are physical artifacts in an ice world.

It must not read as:

- Debyte template.
- Generic dark portfolio.
- Neon topology wallpaper.
- Generic cinematic particle page.
- Cute seal mascot page.
- Igloo clone with renamed text.
- Active Theory clone with renamed text.

## Self-Review

- No placeholder sections remain.
- Scope is focused on the Igloo + Active Theory faithful foundation only.
- The design avoids copying proprietary Igloo or Active Theory assets or exact structure.
- Implementation boundaries are explicit.
- Verification includes rendered browser checks, not only code checks.
