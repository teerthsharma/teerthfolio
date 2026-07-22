# teerthfolio Awwwards Cumulative Benchmark

Date: 2026-07-11
Status: Phase 1 research baseline; **teerthfolio itself has not yet been audited**
Scope: beat the strongest published result among Igloo Inc, Junni is..., and Bruno's Portfolio in every Awwwards category, rather than comparing against their average.

## 1. Source contract and what is authoritative

The numeric results in this document come from the three official Awwwards winner pages:

- [Igloo Inc — Awwwards SOTD](https://www.awwwards.com/sites/igloo-inc)
- [Junni is... — Awwwards SOTD](https://www.awwwards.com/sites/junni-is)
- [Bruno's Portfolio — Awwwards SOTD](https://www.awwwards.com/sites/brunos-portfolio)

Awwwards' [official evaluation-system page](https://www.awwwards.com/about-evaluation/) defines the main jury weighting as Design 40%, Usability 30%, Creativity 20%, and Content 10%. It also says that a nominee is sent to at least 18 jury members, the three jury scores furthest from the average are removed, an Honorable Mention requires 6.5 or more, and a Developer Award requires a developer-jury result above 7.

The [official Developer Award page](https://www.awwwards.com/developer-award/) says the award is intended to recognize quality code that works across modern browsers and devices, is inclusive across device/browser capability, and balances innovation with code quality. Its linked [Developer Award Guideline 2024 v0.7](https://docs.google.com/document/d/1Gvmg6Z60UQ-4BOM3XyUcBKvq2shd4J-l_MoXT26JFEg/edit) gives these relative weights:

| Developer criterion | Weight |
| --- | ---: |
| WPO | 20% |
| Responsive Design / Mobile | 20% |
| Semantics / SEO | 20% |
| Markup / Meta-data | 15% |
| Animations / Transitions | 15% |
| Accessibility | 10% |

The qualitative strengths below are grounded in the official pages' highlighted elements, technologies, descriptions, and published scores. Any weakness is explicitly an **inference from a comparatively low category score**, not a claim that Awwwards published a written defect report.

## 2. Published score matrix

### Main SOTD jury

| Site | Design 40% | Usability 30% | Creativity 20% | Content 10% | Overall |
| --- | ---: | ---: | ---: | ---: | ---: |
| Igloo Inc | 8.05 | 7.50 | 8.31 | 7.91 | 7.92 |
| Junni is... | 7.46 | 7.05 | 8.28 | 6.88 | 7.44 |
| Bruno's Portfolio | 8.05 | 7.83 | 8.62 | 8.18 | 8.11 |
| **Strongest result in each column** | **8.05** | **7.83** | **8.62** | **8.18** | **8.11** |

The weighted calculation reproduces each published overall after rounding. Bruno is the strongest complete main-jury benchmark, while Igloo ties Bruno on Design.

### Developer jury

| Site | Semantics / SEO 20% | Animations / Transitions 15% | Accessibility 10% | WPO 20% | Responsive 20% | Markup / Meta-data 15% | Overall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Igloo Inc | 6.60 | 9.60 | 6.60 | 8.00 | 8.40 | 6.40 | 7.66 |
| Junni is... | 7.80 | 9.40 | 6.20 | 8.00 | 7.20 | 7.60 | 7.77 |
| Bruno's Portfolio | 7.00 | 8.60 | 6.60 | 8.20 | 8.20 | 6.80 | 7.65 |
| **Strongest result in each column** | **7.80** | **9.60** | **6.60** | **8.20** | **8.40** | **7.60** | **7.77** |

No reference owns the whole strongest-per-category developer vector. Its synthetic weighted score is **8.12**, which is a better benchmark than the best single published DEV overall of 7.77.

## 3. What each reference proves—and where it leaves room

### Igloo Inc

The official page highlights Content Page and Links elements, an intentionally narrow two-color palette (`#b6bac5`, `#383e4e`), animation, infinite scroll, transitions, and 3D. It also provides explicit Mobile and Desktop showcase entries. The 8.31 Creativity and 9.60 Animations scores are the clearest published evidence of its strength: a coherent 3D identity and motion system, not a collection of unrelated effects.

The comparatively low Usability (7.50), Semantics/SEO (6.60), Accessibility (6.60), and especially Markup/Meta-data (6.40) imply the available competitive opening: preserve the physical-world spectacle while making the content structure, navigation, accessibility, and metadata materially stronger.

### Junni is...

The official page highlights branding, a navigation sequence explaining Junni's work/technology/philosophy, and a skip-transition control. It identifies a proprietary Three.js-based library plus Three.js, WebGL, Blender, After Effects, animation, 3D, and portfolio work, and provides separate Mobile and Desktop screenshots. The 8.28 Creativity and 9.40 Animations scores support the mascot/identity lesson: character and motion can carry a brand when they remain part of navigation and communication.

The comparatively low Content (6.88), Usability (7.05), Accessibility (6.20), and Responsive Design (7.20) imply that teerthfolio should not rely on charm or transition craft alone. Real evidence, task success, reduced-motion parity, and a composed mobile interaction model must be first-class.

### Bruno's Portfolio

The official page describes a creative, immersive 3D world and lists Games & Entertainment, Web & Interactive, 3D, WebGL, GSAP, and Three.js. It has the strongest published main score here: 8.11 overall, including 8.62 Creativity, 7.83 Usability, and 8.18 Content. This is the strongest evidence for spatial navigation as the actual portfolio interface rather than a decorative hero.

The page does not expose separate Mobile/Desktop showcase elements in the same way as Igloo and Junni, but its developer score includes 8.20 Responsive Design and 8.20 WPO. Its comparatively low Markup/Meta-data (6.80), Accessibility (6.60), and Semantics/SEO (7.00) again reveal the same gap: an explorable world can win visually while still leaving substantial room for a more inclusive, crawlable, evidence-complete implementation.

## 4. teerthfolio target scorecard

Two thresholds are useful:

1. **Beat floor:** strictly exceed the strongest published category result among the three references.
2. **Internal submission target:** leave enough margin that ordinary jury variance does not erase the win.

### Main jury target

| Criterion | Strongest reference | Beat floor | Internal target | Required product proof |
| --- | ---: | ---: | ---: | --- |
| Design | 8.05 | 8.06 | **8.70** | First frame works without HUD; every station has a distinct silhouette/material/world; composition holds across desktop/mobile; typography and controls never look pasted over the scene. |
| Usability | 7.83 | 7.84 | **8.60** | New users discover movement, projects, archive fallback, quality/safe controls, and a return path without coaching; no teleport, dead end, hidden control, or focus loss. |
| Creativity | 8.62 | 8.63 | **9.10** | The Antarctic evidence-world, topological seal, station-specific shader ecosystems, and proximity-driven discovery form one attributable interaction idea; testers do not describe it as a clone of any reference. |
| Content | 8.18 | 8.19 | **8.80** | Every monument exposes real, source-backed work and a comprehensible story; no filler, invented telemetry, broken evidence, or decorative text wall. |
| **Weighted overall** | **8.11** | **>8.11** | **8.77** | `0.40D + 0.30U + 0.20C + 0.10Content`; all category floors must pass independently. |

### Developer jury target

| Criterion | Strongest reference | Beat floor | Internal target | Required product proof |
| --- | ---: | ---: | ---: | --- |
| Semantics / SEO | 7.80 | 7.81 | **8.70** | Semantic landmark/headings, crawlable project/evidence links, canonical and social metadata, structured data, sitemap/robots, honest unique copy. |
| Animations / Transitions | 9.60 | 9.61 | **9.70** | Continuous movement and camera motion, no visible snapping, stable frame pacing, meaningful station/mascot transitions, reduced-motion alternative with equivalent information. |
| Accessibility | 6.60 | 6.61 | **9.00** | Keyboard-complete, screen-reader-comprehensible, contrast-safe, visible focus, motion-safe, touch-safe; zero serious/critical automated findings and successful human task audit. |
| WPO | 8.20 | 8.21 | **8.80** | Production cold-load and interaction budgets pass on representative mid-tier mobile/desktop; no WebGL context loss, runaway memory, long-task storm, or unbounded quality setting. |
| Responsive Design | 8.40 | 8.41 | **9.00** | A genuinely composed mobile world with tap/drag routing, readable overlays, 44px targets, correct safe areas, landscape/portrait support, and complete archive fallback. |
| Markup / Meta-data | 7.60 | 7.61 | **8.80** | Valid minimal markup, correct document language/title/description, image dimensions/alt where applicable, OpenGraph/Twitter data, meaningful anchor text, no div-only interaction surface. |
| **Weighted overall** | **8.12 synthetic composite** | **>8.12** | **8.98** | Apply official DEV weights; every category floor must pass independently. |

The stretch targets deliberately fix the references' common weak point: none combines top-tier motion with top-tier accessibility, semantics, markup, and responsive behavior.

## 5. Falsifiable evidence gates

These are release gates, not aspirations. Evidence should be produced from a clean production build and stored with timestamp, commit, browser, viewport, DPR, hardware/GPU, network profile, and quality mode.

### A. Visual-design gates

1. Capture stable frames at 1920x1080, 1440x900, 768x1024, 412x915, and 390x844 in Plaque plus all seven non-home stations.
2. In an anonymized five-person visual test, at least four identify a coherent Antarctic place and the focal object in the first frame without reading HUD text.
3. At least four of five can distinguish all eight station silhouettes from grayscale thumbnails; at least four can match six of eight stations to their color/material ecosystem.
4. No capture has clipped focal geometry, unreadable primary copy, overlay-object collision, accidental black void, texture stretching, visible shader seam, or UI panel covering the seal's face.
5. A HUD-hidden capture remains compositionally complete at every station.

### B. Usability gates

1. Five unfamiliar users receive only the URL. Within ten seconds, at least four discover how to move or choose a destination.
2. All five can open a project, inspect evidence, return to the world, reach the archive without mastering WASD, and find contact/source links.
3. Keyboard-only and touch-only traces can visit all eight stations, with the active rail item centered and the same destination/arrival state shown everywhere.
4. No single rendered frame advances the seal farther than the controller's documented maximum displacement; click/tap routing visibly travels rather than teleports.
5. Returning to Plaque restores the igloo, seal home state, labels, lighting, evidence, and collision behavior with no remount blank.
6. After 15 seconds without navigation, the hint system offers a left/right or nearest-undiscovered cue; it does not steal focus or repeat while the user is moving.

### C. Creativity and content gates

1. In a blind comparison with unlabeled Igloo/Junni/Bruno captures, at least four of five describe teerthfolio with its own concept rather than “Igloo copy,” “Junni seal,” or “Bruno reskin.”
2. Every building has a shape-specific physical function, shader/material behavior, ambient response, discovery transition, and evidence payload; changing only hue does not count.
3. The seal has five legible functional states and maintains breathing in every world state; eyes, pose, halo, and movement communicate current state without requiring speech bubbles.
4. All eight station summaries and all evidence links are source-backed. A scripted link audit reports zero broken internal routes and zero knowingly fabricated activity.
5. The live GitHub section visibly attributes returned API identity/activity to the hard-coded portfolio source handle and exposes an honest, quiet fallback when unavailable.

### D. Developer gates

1. Clean install/build/lint/verifier suite exits zero; no verifier threshold is weakened to produce green output.
2. Production browser run has zero uncaught page errors, shader compile/link errors, hydration errors, WebGL context-loss events, and failed first-party requests.
3. Lighthouse mobile, three cold runs at the median, meets LCP <=2.5s, INP <=200ms, CLS <=0.10, and Accessibility/SEO/Best Practices >=95. Record the exact throttling profile instead of quoting a single score without context.
4. A ten-minute navigation soak on medium quality has no monotonically increasing geometry/material/texture count after warm-up, no recurring long task >50ms, and no sustained frame-time regression >20% from minute two.
5. At 60Hz, p95 settled frame time is <=16.7ms and p95 travel frame time is <=20ms on the declared reference desktop; on the declared mid-tier mobile, interaction remains responsive and the adaptive governor degrades effects before motion continuity.
6. `axe` reports zero serious/critical findings. Keyboard, screen-reader, 200% zoom, forced-colors/high-contrast where supported, and `prefers-reduced-motion` human audits all complete the core project/evidence task.
7. HTML validation produces zero errors; links and controls use correct native semantics; document outline, language, canonical, OpenGraph/Twitter data, JSON-LD, robots, and sitemap are inspected rather than inferred from framework defaults.
8. Viewports from 320px to 2560px have no accidental document overflow, focus trap, unreachable control, or text below AA contrast. Intentional canvas/world extent is not treated as document overflow.
9. Safe gate, low/medium/high modes, evidence archive, reduced-motion path, and WebGL fallback each receive an explicit production trace.

## 6. Judge-style checklist

Score each item 0-10 independently before discussing the work. A “beautiful” result cannot compensate for a failed hard gate.

### Design (40%)

- Does the first viewport communicate a recognizable place, scale, focal object, and authored point of view before text is read?
- Are silhouette, camera, light, contact shadow, terrain, and material separation resolved before post-processing?
- Does each monument feel authored for its content rather than generated from a shared primitive with a different color?
- Is the anime-soft palette bright, controlled, readable, and consistent across background, geometry, character, and UI?
- Is detail hierarchical—hero, secondary structures, evidence, microtexture—instead of uniformly noisy?
- Are mobile and desktop composed as separate framing problems?

### Usability (30%)

- Can a first-time visitor answer “who is Teerth, what has he built, and where is the evidence?” without learning a game?
- Do WASD, tap/drag routing, station rail, labels, camera, light, mascot, and archive agree on destination and arrival state?
- Are progress, loading, error, fallback, and return paths obvious and reversible?
- Are controls discoverable, readable, reachable, and consistent?
- Is interaction physically responsive without accidental collision glue, snapping, camera sickness, or input latency?

### Creativity (20%)

- Is there one ownable concept with a reason for every major effect?
- Does proximity alter world, shader, sound/motion state, evidence, and mascot in a coherent cause/effect chain?
- Does the seal help users understand the system, rather than merely decorate it?
- Do references disappear into a new synthesis rather than remain visible as copied motifs?
- Can a judge remember and describe the experience the next day in one sentence?

### Content (10%)

- Does each station reveal concrete work, role, result, source, and evidence?
- Is the writing concise, specific, human, and free of invented metrics or generic AI phrasing?
- Can the full portfolio be indexed outside the 3D path?
- Are live/fallback data states honest and correctly attributed?
- Are contact and external source links complete and trustworthy?

### Developer jury

- **WPO:** production budgets, progressive loading, stable memory, bounded DPR/effects, no context loss.
- **Responsive:** composed mobile controls and framing, density-aware assets, touch targets, safe areas, orientation and breakpoint consistency.
- **Semantics/SEO:** meaningful structure, crawlable evidence, metadata, structured data, canonical URLs, quality text.
- **Markup/Meta-data:** valid minimal HTML, native controls/links, correct global attributes, image metadata, social cards.
- **Animations/Transitions:** purposeful, interruptible, state-correct, frame-paced, and motion-preference aware.
- **Accessibility:** full keyboard/screen-reader path, focus/contrast/zoom/reduced-motion parity, no canvas-only information dead end.

## 7. Anti-patterns that disqualify “award-ready” claims

- Comparing against the three-site average instead of the strongest score in every category.
- Copying a reference's recognizable composition, asset, mascot, building, or transition and calling attribution sufficient for originality.
- Treating bloom, fog, aberration, scanlines, noise, or dithering as substitutes for unresolved form, light, contact, or typography.
- Hiding a weak world behind large HUD cards; the screenshot collapses when overlays are mentally removed.
- Building every monument from the same shader/material and changing only its color.
- One mesh/material/draw call per decorative brick when instancing, merging, or shader-computed joints can preserve the appearance.
- Movement that looks smooth only at one refresh rate, click-to-teleport routing, dual pose writers, or camera and seal springs that fight each other.
- A mascot that stops breathing outside home, speaks constantly, blocks evidence, or has no functional state mapping.
- Mobile as a cropped desktop canvas, controls below safe areas, tiny tap targets, or a missing non-game project index.
- Optimizing only a warm local dev server; reporting Lighthouse without cold production conditions and hardware/network context.
- Celebrating animations while semantics, markup, accessibility, and content remain below the references' weakest categories.
- Fake GitHub “live” events, placeholder project copy, unverifiable metrics, or a fallback presented as live data.
- Weakening safety, quality, accessibility, evidence, or verifier contracts to make a visual demo appear complete.
- Self-scoring immediately after implementation, with the author explaining controls to the evaluator.

## 8. Blind-audit protocol

### 8.1 Freeze and evidence pack

1. Freeze one production commit and record URL, commit SHA, build output, browser versions, hardware/GPU, and all quality flags.
2. Prepare unlabeled captures and interaction builds for teerthfolio plus the three references. Randomize order independently per evaluator.
3. Give no art-direction memo, feature list, keyboard instructions, or intended scores. The site itself must teach the experience.
4. Use fresh profiles, cold cache for first-load tasks, and a warm second pass. Capture screen, input, console, network, performance trace, and observer notes.

### 8.2 Panels

- **Main jury simulation:** at least 18 independent scorers to match Awwwards' stated minimum. Include visual designers/art directors, UX practitioners, creative developers, and people unfamiliar with the project.
- **Developer jury simulation:** at least six separate reviewers, with named ownership of WPO, responsive/mobile, semantics/SEO, markup/meta-data, animation, and accessibility.
- No evaluator may have authored the implementation or seen the internal target scorecard before submitting scores.

### 8.3 Tasks before ratings

Each evaluator receives only the URL and must:

1. State what the site is and what action seems possible after 10 seconds.
2. Reach any non-home station and open one project/evidence item.
3. Visit one named destination, return to Plaque, and then reach a second station.
4. Find the complete archive/index and a contact/source link without using WASD.
5. On mobile, complete the same route with touch controls.
6. On the accessibility pass, complete the core route by keyboard and with reduced motion; the specialist repeats it with a screen reader.

Observers must not rescue a participant. A hint request, mistaken click, unexplained wait, lost focus, or route abandonment is logged as evidence.

### 8.4 Scoring and outlier treatment

1. Collect 0-10 scores for Design, Usability, Creativity, and Content with one evidence sentence per score.
2. Compute each evaluator's weighted overall using 40/30/20/10.
3. Compute the initial mean overall, remove the three evaluator ballots furthest from that mean, and recompute category and overall results. Keep the removed ballots visible in the report.
4. Developer reviewers score all six criteria; compute the weighted result using 20/20/20/15/15/10 as listed above.
5. Report median, trimmed mean, lowest retained score, task completion, time-on-task, error count, and confidence interval where sample size permits. Do not report only the most flattering number.

### 8.5 Pass rule

teerthfolio is ready for an award submission only when:

- the trimmed main score meets or exceeds **8.77**;
- every retained main-category mean meets its internal target;
- the developer score meets or exceeds **8.98** and every DEV category meets its internal target;
- all hard evidence gates pass on desktop and mobile;
- no evaluator encounters a build error, blank world, inaccessible core task, trapped navigation, false live data, or missing fallback/archive; and
- a second blind round on the corrected frozen build reproduces the result.

If a category misses, the next iteration must address that category's observed failure. Adding unrelated spectacle is not a valid response to a usability, content, accessibility, semantics, markup, responsive, or performance miss.

## 9. Phase 2 handoff

Phase 2 is intentionally deferred until the dome, movement controller, station placement, and world loading have reached a stable visual checkpoint. At that point an independent auditor should inspect localhost without reading implementation commentary, run the tasks above, score teerthfolio against this matrix, and return a gap report with evidence—not an optimistic completion percentage.
