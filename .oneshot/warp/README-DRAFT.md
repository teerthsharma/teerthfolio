# Seal's Topology Land

**A portfolio you play.** You are a seal pup on a 3D ice island. The island is the work itself: every landform is a contribution merged into a real upstream project, and every building is one of the author's own lab projects. Slide up to a landform and its panel opens with the claim, the numbers and the link to the pull request. Slide up to a building and it opens with the project's claim and its repository. Nothing on the island explains itself in text. The explanation lives in the repositories; the island is the place you go to see them.

## Why it matters

A résumé lists claims. Here each claim is a place you walk to, and each place links back to the code it came from. The places are joined by one idea, topology. The river, the dam, the moat and the geyser form one connected system, and the lab buildings (monodromy, topological-ml-toolkit, separatrix, Epsilon-Hollow) are the research behind the same shapes. The seal is the only character, and it is the reader's body on the island.

## Status

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![three.js 0.178](https://img.shields.io/badge/three.js-0.178-049ef4?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org)

## What a visitor sees

![The igloo hub with the seal pup at its door, under the snow](public/readme/home-1.png)

*The target path above does not exist yet. The source frame is `verification/v1/home-1.png`, which `.gitignore` line 12 excludes (`verification/`), so it must be copied to `public/readme/home-1.png` and committed before merge. The frame also shows the HUD counter and the Skip button; crop them out if the owner wants a clean hero.*

- **The island.** Snow, sea and a river run through it. Each place sits on its own piece of land: Mount MujoRush (three seal faces carved like Mount Rushmore), the TensorFlow Dam with gates on a timed rhythm, the NVIDIA Moat round a rock keep, the XLA geyser, the pyrefly floes over a whirlpool, the highway, and the Google range.
- **The lab.** Eleven buildings, one per lab project, each glowing in its own colour.
- **The seal.** Slide, dash and glide on land, swim in the sea and the river. Leave it alone and it sits up and meditates.
- **The first arrival.** The first time you reach a place, the camera circles it and the seal performs a short move in its honour. Any key, tap or click skips it.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

- `?play` skips the intro. `?spawn=<place id>` starts the seal at a place (`components/world/Controller.jsx:35`).
- `npm run check` runs the island's rules against the same motion code the game uses, with no browser.
- `npm run lint` lints `components/world`, `lib/world` and `app`.
- `npm run build` then `npm run start` runs the production build.
- `node scripts/shot.mjs --url "http://localhost:3000/?spawn=p-nerve" --out <file>.png` captures one place. It uses Playwright, a dev dependency.

## Architecture map

```
app/                     Next.js App Router: page, layout, global CSS, OG image
components/world/        the scene
  land/                  the contributions as landforms
  monuments/             the lab buildings, one file per project
  buildings/             the building components (hideout, home)
  seal/                  the pup, its outfits and costumes
  life/                  motes, anomalies, penguins, the Easter-egg pups
  look/                  post-processing, the radiation effect on the view
  sea/ sky/ island/      water, snowfall and gulls, the ground
  cutscene/              the arrival cutscene path
  ui/                    minimap, sheets, the move coach
lib/world/               pure data and physics, no React
lib/anime/               the anime cutscene engine
lib/quality/             the render-quality tiers
data/showcase.json       every word and number shown, from the author's landing site
data/contributions.json  the upstream contributions and their state
data/workbench.json      the lab repositories
scripts/                 the world check, capture, load and frame tools
docs/                    ARCHITECTURE.md, TESTING.md and the subsystem notes
```

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the cutscene loading path: what decides which renderer plays an arrival, and the fallback chain.
- [docs/TESTING.md](docs/TESTING.md) lists the Node checks and the load gate, with the commands that produce each number.

## Contributions and lab projects

Twelve upstream contributions are listed in `data/contributions.json`: ten are merged, and two (openxla/xla #46539 and facebook/pyrefly #4180) are shown as landed by import, linked by commit, because GitHub marks those pull requests closed. Two more, boykopovar/AnyPS5 #12609 and tensorflow/tensorflow #128930, appear on the island as arrivals without a live scene and are listed in `data/showcase.json`.

The lab buildings are the eleven repositories in `data/workbench.json`: resolvent, Epsilon-Hollow, Aether-Lang, caustic, monodromy, topological-ml-toolkit, faraday, nerve, separatrix, planimeter and tangle.

## How to contribute

- **Data is generated, never hand-edited.** `data/showcase.json` comes from `scripts/extract-showcase.mjs`, `data/contributions.json` from `scripts/extract-contributions.mjs`, and `data/workbench.json` from `scripts/extract-workbench.mjs`. Change the script, then run it.
- **Check before you open a pull request.** Run `npm run check`, `npm run lint` and `npm run build`. [docs/TESTING.md](docs/TESTING.md) lists the other Node checks and what each one guards.
- **Open the pull request against `main`.** Describe the subsystem you changed and the check output that shows it works.

<!--
DRAFT SOURCES (strip this block at merge time; it is not part of the README)

Sections: 8 (Title and vision, Why it matters, Status, What a visitor sees, Quick start, Architecture map, Contributions and lab projects, How to contribute).

Sources cited (count: 22):
1. README.md section 1 "What it is": claim, numbers and link shown verbatim from teerthsharma.github.io; the extraction via scripts/extract-showcase.mjs.
2. README.md section 1: "Show, never tell", no text explaining on the island.
3. README.md section 2: landform table and geology paragraph (Mount MujoRush, TensorFlow Dam, NVIDIA Moat, XLA geyser, pyrefly floes, highway).
4. README.md section 3: lab building table.
5. README.md section 4: seal movement, meditation, first-arrival showcase and hero moves.
6. README.md section 5: controls.
7. README.md section 7: npm install, npm run dev, npm run check, npm run lint, npm run build, shot.mjs command.
8. package.json lines 7-14 (scripts: dev, build, start, lint, check, shot, frame-audit, load).
9. package.json line 20: next ^16.2.9.
10. package.json line 22: react ^19.1.0.
11. package.json line 24: three ^0.178.0.
12. components/world/Controller.jsx:35: play and spawn query parameters.
13. .gitignore line 12: verification/ is ignored (git check-ignore confirms verification/v1/home-1.png is ignored).
14. verification/v1/home-1.png: the igloo hub frame, read and checked visually; shows the HUD counter (top-left) and the Skip button (bottom-left).
15. data/contributions.json: 12 items; items with state MERGED (10) and CLOSED (openxla/xla #46539 at line 68, facebook/pyrefly #4180 at line 77), the CLOSED rows described by the file's own source note (line 2).
16. data/showcase.json: contains pr-anyps5-12609 and the TensorFlow #128930 entry (grep count 6 for 12609|128930).
17. data/workbench.json: 11 repos, names listed in the draft.
18. lib/anime/live.js line 4: ENGINE_DOCKS list (includes pr-anyps5-12609 and pr-tensorflow-128930).
19. docs/ARCHITECTURE.md: cutscene loading path, fallback chain.
20. docs/TESTING.md: check table (node lib/anime/live.check.mjs, scripts/cutscene-isolation.mjs, scripts/cutscene-smoke.mjs, scripts/check-world.mjs) and the load gate.
21. Directory layout: `ls` of components/world, components/anime, lib/anime, lib/world, lib/world/cutscene, docs (run in the worktree).
22. Git remote: git remote -v shows origin https://github.com/teerthsharma/teerthfolio.git (the old README links Debyte404/teerthfolio; not used here).

Notes for the later reader:
- lib/world/plots.js does not exist, so the reserved seal-named plots section is omitted.
- The live-site badge and link are omitted: the target was not verified (the old README names teerthfolio.vercel.app; project memory names evilseal.si).
- No LICENSE file exists at the repository root; a stranger will look for one.
- docs/ARCHITECTURE.md currently covers only the cutscene loading path, not the whole architecture.
- The old README contained a personal email address; it is not carried into this draft.
-->
