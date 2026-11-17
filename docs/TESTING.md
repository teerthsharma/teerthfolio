# Testing

This repository has no test framework. Checks are plain Node scripts, run from the repository root. Most of them
read the real source and assert on it; none of the pure checks needs a server, a browser or a GPU. The gates that
measure pixels, frames or load time run against a running server in real Chrome, and several of them need a named
GPU adapter. Paths below are relative to the repository root. Line numbers refer to the file named in the same row or
bullet.

## 1. Commands in package.json

Source: `package.json` lines 6 to 15 (`scripts` block).

| Command | Runs | Needs |
|---|---|---|
| `npm run lint` | `eslint components/world lib/world app` (`package.json` line 10) | `node_modules` installed |
| `npm run check` | `node scripts/check-world.mjs` (`package.json` line 11) | Node with JSON import attributes (`scripts/check-world.mjs` line 8) |
| `npm run shot` | `node scripts/shot.mjs` (`package.json` line 12) | dev or production server on port 3000 by default, real Chrome |
| `npm run frame-audit` | `node scripts/frame-audit.mjs` (`package.json` line 13) | production server |
| `npm run load` | `node scripts/cut-load.mjs` (`package.json` line 14) | production server and a named GPU adapter |
| `npm run dev`, `build`, `start` | `next dev`, `next build`, `next start` (`package.json` lines 7 to 9) | none (these are the server and build steps for the gates) |

## 2. Pure checks: no server, no browser, no GPU

These run with `node <file>` from the repository root. A check passes when it exits 0. The list below covers every
`*.check.mjs` and `*.test.mjs` file that git tracks (41 files) plus `scripts/check-world.mjs` and the other pure
scripts. The file list comes from `git ls-files '*.check.mjs' '*.test.mjs'`.

### 2.1 Island and world

| Command | What it proves | Source |
|---|---|---|
| `npm run check` (`node scripts/check-world.mjs`) | The island rules hold against the real motion code: seal motion, places, river, toys, highway cars, terrain, peak, hideout, and the cutscene timeline and clock. | `scripts/check-world.mjs` lines 1 to 2 |
| `node components/world/land/parts/floes-layout.check.mjs` | All 208 pyrefly floes keep their place: none touch, each hangs clear of ground and water, the pin stands in the water, the funnel clears the reading point. | `components/world/land/parts/floes-layout.check.mjs` lines 2 to 6 |
| `node components/world/land/parts/mujorush-build.check.mjs` | The carved sheet hides the rough terrain behind the faces, and every carved part, crystal and boulder stays clear of the docks. | `components/world/land/parts/mujorush-build.check.mjs` lines 2 to 6 |
| `node components/world/life/seals-seed.check.mjs` | The eight colony seals land clear of the building, its dock, the path, every landform and the water; moat jumper rings stay over water at every angle. | `components/world/life/seals-seed.check.mjs` lines 2 to 6 |
| `node components/world/life/spawn.check.mjs` | Every prop and penguin lands outside every `forbidden()` circle and at least 2 m from water. | `components/world/life/spawn.check.mjs` lines 2 to 6 |
| `node components/world/seal/drive.check.mjs` | The drive's signs and schedules, the part a seal variant cannot see. | `components/world/seal/drive.check.mjs` line 3 |
| `node components/world/seal/variants/A-body.check.mjs` | Seal A's body is measured against the brief (`verification/SEAL-brief.md` section 4). Prints the numbers and fails on a broken rule. | `components/world/seal/variants/A-body.check.mjs` lines 2 to 4 |
| `node components/world/seal/variants/D.check.mjs` | Seal D's geometry (`D-parts.js`) meets the brief: belly 2 cm into the snow, fore-flipper tips on the snow, lenses that keep a far eye inside the head silhouette. | `components/world/seal/variants/D.check.mjs` lines 2 to 6 |
| `node lib/world/wild.check.mjs` | The wild ring's laws (island plan sections 2.11 and 6.1). Reports which features are not built yet. | `lib/world/wild.check.mjs` lines 2 to 3 |
| `node lib/world/cutscene/deadline.check.mjs` | The deadline laws that order the cutscene prewarm queue (ARCHITECTURE-PLAN 3.1). | `lib/world/cutscene/deadline.check.mjs` line 2 |

### 2.2 Engine (`lib/anime`, `components/anime`)

| Command | What it proves | Source |
|---|---|---|
| `node lib/anime/live.check.mjs` | The engine mount switch: docks marked live are engine docks, approved, with registry loaders; `the-loop` stays on the live awakening. | `lib/anime/live.check.mjs` lines 2 to 3 |
| `node components/anime/engine-cut.check.mjs` | The engine host contract (ARCHITECTURE-PLAN WP2, section 3.4), checked on the source text of `EngineCut.jsx`. | `components/anime/engine-cut.check.mjs` lines 1 to 5 |
| `node lib/anime/prep.check.mjs` | The engine prep state machine, run with fake loaders and fake engines. | `lib/anime/prep.check.mjs` lines 1 to 6 |
| `node lib/anime/governor.check.mjs` | The T3 quality governor gates, on synthetic frame traces against two baselines. | `lib/anime/governor.check.mjs` line 1 |
| `node lib/anime/topology.check.mjs` | The Yuddh-Niti H0 tests, ported, and the T1 shadow bake on a bumpy sphere. | `lib/anime/topology.check.mjs` line 1 |
| `node lib/anime/step.check.mjs` | `step(t, fps)` lands on frame `floor(t fps) / fps`, including when `t` sits exactly on a frame. | `lib/anime/step.check.mjs` line 1 |
| `node lib/anime/post.check.mjs` | The final pass never writes pure black; bars and the grade floor are studio ink. Reads `post.js` as text. | `lib/anime/post.check.mjs` lines 1 to 6 |
| `node lib/anime/post-view.check.mjs` | The final pass has the lab views (`uView` 2 for notan, 3 for ids) and adds no `#define`. Reads `post.js` as text. | `lib/anime/post-view.check.mjs` lines 1 to 6 |
| `node lib/anime/post-comp.check.mjs` | The composite shows layer-1 pixels that never wrote depth as an overlay. It runs `git show HEAD:lib/anime/post.js`, so it tests the committed file, not the working tree. Needs `git` on PATH. | `lib/anime/post-comp.check.mjs` lines 1 and 31 |
| `node lib/anime/material-key.check.mjs` | The key, cut, mul, band, flat and ink-gain uniforms exist in JS and GLSL with their defaults, the programs add no `#define`, the id reaches alpha, and the hull ink reads the style. | `lib/anime/material-key.check.mjs` lines 1 to 2 |
| `node lib/anime/kit/bg/bg.check.mjs` | Every kit shader (vertex and fragment of each material, and each sky preset) compiles with `glslangValidator`, built the way three r178 builds a `ShaderMaterial`. Needs `glslangValidator` on PATH or under `C:/VulkanSDK`; without it the check prints "glslangValidator not found" and exits 1. | `lib/anime/kit/bg/bg.check.mjs` lines 1 to 2, 26 to 28 |
| `node lib/anime/kit/hero/moves.check.mjs` | Every entrance move is finite, never sinks through the ground, and ends neutral. Silent on pass. | `lib/anime/kit/hero/moves.check.mjs` lines 1 to 2 |
| `node lib/anime/kit/seal-skins.check.mjs` | The S0.1 skin registry gates (spec `seal-skins.md` sections 2 and 4) on hex keys. | `lib/anime/kit/seal-skins.check.mjs` line 1 |
| `node lib/anime/kit/skins/p-aether-lang.check.mjs` | The section 3.1 numbers of the p-aether-lang skin, its registration, and the C2 mutation. | `lib/anime/kit/skins/p-aether-lang.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/framework/seal-skin.check.mjs` | The S0.2 gates (spec `seal-skins.md` sections 2 and 4), checked on `seal.js` as text, because this file cannot import three. | `lib/anime/cutscenes/framework/seal-skin.check.mjs` lines 1 to 6 |
| `node lib/anime/tools/still-stats.check.mjs` | Colour maths and still statistics (luma, hue, notan, hue share, saturation, dark fraction) on known answers. | `lib/anime/tools/still-stats.check.mjs` lines 1 to 6 |
| `node lib/anime/tools/region-stats.check.mjs` | Mask geometry and disc fit on synthetic 1280 by 800 frames. | `lib/anime/tools/region-stats.check.mjs` lines 1 to 6 |

### 2.3 Cutscene timing and clocks

| Command | What it proves | Source |
|---|---|---|
| `node lib/anime/cutscenes/timing.check.mjs` | The timing law on every dock in `DOCKS`. Strict: exits 1 when any dock fails. | `lib/anime/cutscenes/timing.check.mjs` lines 2 to 6 |
| `node lib/anime/cutscenes/timing.check.mjs --report` | The same table, printed; exits 0. | `lib/anime/cutscenes/timing.check.mjs` lines 2 to 3 |
| `node lib/anime/cutscenes/frame-law.check.mjs` | The frame law's clock and camera maths (`framework/law.js`, `framework/director.js`). | `lib/anime/cutscenes/frame-law.check.mjs` lines 2 to 6 |
| `node lib/anime/cutscenes/p-asmodeus/clock.check.mjs` | The mote landing mirror and the lit-window count. | `lib/anime/cutscenes/p-asmodeus/clock.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/p-asmodeus/cams.check.mjs` | The shots tile 0 to 12 with no gap or overlap, and every pin is finite. | `lib/anime/cutscenes/p-asmodeus/cams.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/p-asmodeus/layout.check.mjs` | Layout is finite every 0.05 s from 0 to 11.9, and Lucifer is present only from 7.0 to 8.5. | `lib/anime/cutscenes/p-asmodeus/layout.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/pr-anyps5-12609/islands.check.mjs` | `islands.js` against hand cases, 10,000 seeded oracle agreements, the dock table and the HUD constants. Exits 1 on failure. | `lib/anime/cutscenes/pr-anyps5-12609/islands.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/pr-highway-3244/clock.check.mjs` | `clock.js` against the live race path: card beats, the five flings, the warp round trip, the dock point. | `lib/anime/cutscenes/pr-highway-3244/clock.check.mjs` lines 1 to 6 |
| `node lib/anime/cutscenes/pr-nemo-relay-481/clock.check.mjs` | The clock anchors (real to picture time, pass timing). Prints `ok`. | `lib/anime/cutscenes/pr-nemo-relay-481/clock.check.mjs` lines 1 to 6 |
| `node lib/anime/tools/cuts/pr-pyrefly-4180/clock.check.mjs` | The clock against the live move's own numbers. Prints `CLOCK OK`, or `FAIL` with the mismatches and exit 1. | `lib/anime/tools/cuts/pr-pyrefly-4180/clock.check.mjs` lines 1 to 6 |

### 2.4 Scripts: checks and tests

| Command | What it proves | Source |
|---|---|---|
| `node scripts/accept-run.check.mjs` | The pure scoring layer of `accept-run.mjs` on synthetic stills, with no browser. It also asserts that the pure layer has no static `playwright` or `sharp` import. | `scripts/accept-run.check.mjs` lines 1 and 114 to 116 |
| `node scripts/issues-checklist.check.mjs` | The issues page builder on two fake docks and the real umbrella file `lib/anime/accept/_umbrella.json`. | `scripts/issues-checklist.check.mjs` lines 1 and 9 |
| `node scripts/seal-gates.check.mjs` | The markings gates G-C1 to G-C4, G-32 and G-P on a synthetic seal still, then one break at a time. It also spawns `scripts/seal-gates.mjs` once. | `scripts/seal-gates.check.mjs` lines 1 and 123 |
| `node scripts/trace.check.mjs` | The Microsoft Clarity gate: the ID is validated, Do Not Track and Global Privacy Control switch it off, and custom events are no-ops without `window.clarity`. | `scripts/trace.check.mjs` lines 1 to 30 |
| `node --test scripts/extract-contributions.test.mjs` | A CLOSED PR without `landedCommit` is absent from the output; a CLOSED PR with `landedCommit` is shown as landed and linked by commit. | `scripts/extract-contributions.test.mjs` lines 1 to 30 |
| `node --test scripts/extract-workbench.test.mjs` | `--check` passes on the allowlisted fixture and fails on the fixture with a private repo, a fork and an unlisted repo. | `scripts/extract-workbench.test.mjs` lines 1 to 21 |

### 2.5 Run every pure check in one pass

Use Git Bash from the repository root. The loop reads the tracked file list, so it covers exactly the 41 committed
files. `post-comp.check.mjs` reads `HEAD`, so commit first if it is part of the change under test. `bg.check.mjs`
fails until `glslangValidator` is installed.

```
for f in $(git ls-files '*.check.mjs'); do node "$f" || echo "FAIL $f"; done
for f in $(git ls-files '*.test.mjs'); do node --test "$f" || echo "FAIL $f"; done
npm run check
node scripts/cutscene-isolation.mjs
```

`scripts/cutscene-isolation.mjs` is a static import check. It resolves `lib/anime/cutscenes` from the working
directory (`scripts/cutscene-isolation.mjs` line 5), so run it from the repository root. It exits 1 on any violation
(line 3).

## 3. Still and image gates: no server

| Command | What it proves | Source |
|---|---|---|
| `node scripts/still-gate.mjs --in <png>` | Fails a HUD-off still that is mostly snow (over 82% of pixels within 10 of `#faf6f0`) or badly exposed (mean luma above 250 or below 40). Uses `sharp`. | `scripts/still-gate.mjs` lines 1 to 12 |
| `node scripts/jolly.mjs <png>... [--assert] [--before <png>]` | The jolly colour metric of a still. With `--assert` it exits 1 unless mean saturation is at least 0.20, dead ground is at most 0.45, there are at least 5 hue families, and (with `--before`) mean saturation is 0.08 above the earlier still. Default `--before` is `verification/island/before-wide.png`. | `scripts/jolly.mjs` lines 1 to 8 |
| `node scripts/seal-gates.mjs` | Not a runner. It exports the markings gate scoring functions (`REGION`, `scoreSeal`, `srgbToLab`). A gate that cannot be computed returns `not_run`, never `pass`. The driver is not written yet. | `scripts/seal-gates.mjs` lines 1 to 3 |
| `node scripts/cutscene-isolation.mjs` | A cutscene imports only the shared engine and its own folder, never another cutscene. | `scripts/cutscene-isolation.mjs` lines 1 to 3 |

## 4. Gates that need a running server

Start the server first. Each gate takes a `--url` (or a port in its header). Most headers do not say whether the
server is a dev or a production one. `frame-audit`, `pup-visibility` and `cut-load` name a production build
(`scripts/frame-audit.mjs` lines 2 to 3, `scripts/pup-visibility.mjs` line 3, `scripts/cut-load.mjs` line 2). For
measurements, use a production build (`npm run build`, then `npm start -- -p <port>`). Restart the server after every
rebuild; a server left running across a build serves stale code (user memory, `prod-server-restart-discipline.md`).

| Command | What it proves | Default URL | Browser and GPU | Source |
|---|---|---|---|---|
| `node scripts/cutscene-smoke.mjs [--url http://localhost:3340] [--only p-caustic]` | Every approved cutscene plays in real Chrome: arrival starts, the pup is on screen and near the camera at 3 s and 8 s, the scene ends back on the island, no console errors. Prints a pass/fail table. | `http://localhost:3340` | Playwright chromium (import at line 9); the header names no GPU pin | `scripts/cutscene-smoke.mjs` lines 2 to 9 |
| `node scripts/pup-visibility.mjs [--url http://localhost:3450] [--only p-caustic,p-faraday] [--out dir] [--par 2]` | The pup stays visible in every approved cutscene and the island follow at 1280 by 800, against a production build. Fails on under 12% of frame height, occlusion over 0.5 s, a foreground mesh over 15% of the frame, or a flat-colour saved frame. | `http://localhost:3450` | Real Chrome, `window.__frame` via `?debug=frame` | `scripts/pup-visibility.mjs` lines 2 to 12, 21 |
| `node scripts/frame-audit.mjs [--url http://localhost:3190] [--only p-tangle] [--w 1024] [--h 768] [--par 3] [--guard off]` | The pup box stays in the safe zone (inside the viewport with 4% margin, 16 to 55% of viewport height, clear of bubbles and the credit card) for at least 90% of samples. Run against `npm run build && npm start -- -p 3190`. | `http://localhost:3190` | Real Chrome, `?debug=frame` | `scripts/frame-audit.mjs` lines 2 to 14 |
| `node scripts/pocket-budget.mjs [--url http://localhost:3372] [--only id,id]` | Draw calls and triangles that each stage adds over the island baseline, read from `gl.info` at 3 s and 8 s. The composer renders many passes, so the script sums one whole frame by hand. | `http://localhost:3372` | Playwright chromium; counts only, not timings | `scripts/pocket-budget.mjs` lines 2 to 12 |
| `node scripts/dpr-check.mjs [--url http://localhost:3122] [--dsf 2] [--look 3]` | The post stack is as big as the drawing buffer after the DPR is raised: `composer.inputBuffer` equals the drawing buffer size, and the second check on the Tangle gantry frame. Exits 1 on either failure. | `http://localhost:3122` | Real Chrome; device scale factor from `--dsf` (usage line shows 2) | `scripts/dpr-check.mjs` lines 1 to 12 |
| `node scripts/tier-stills.mjs [--url http://localhost:3403] [--param look] [--tiers 0,1,2] [--out verification/tiers] [--against verification/tiers-base]` | The five HUD-off control stills at each pinned quality tier pass the still gate, and the pup's key, fill and rim values match the top tier. With `--against`, a mean absolute difference per channel above 6 fails. | `http://localhost:3403` | Real Chrome | `scripts/tier-stills.mjs` lines 1 to 11 |
| `node scripts/perf-frames.mjs [--url http://localhost:3403] [--w 1440] [--h 900] [--dpr 2] [--phase load,walk,arrival,skip,reduced,tiers,memory] [--gpu intel\|nvidia]` | Frame-time budgets on a 60 Hz laptop, exit 1 on breach: walk p95 at most 33.4 ms and max at most 100 ms; arrival p95 at most 33.4 ms with no frame over 100 ms; no frame over 250 ms in the 4 s after `__world.ready`. Other phases: `first`, `flap`, `nostorage`, `ramp`, `memory` (`--secs 180`). | `http://localhost:3403` | Real Chrome; `--gpu intel` or `--gpu nvidia` (or `--hp`/`--lp`) pins one adapter | `scripts/perf-frames.mjs` lines 1 to 14 |
| `node scripts/perf-gate.mjs [--url http://localhost:3402/?play] [--secs 6] [--rounds 3] [--only laptop] [--gpu intel\|nvidia]` | Laptop parity: the laptop must hold the iPad's frame time after the quality monitor settles. Prints the WebGL renderer string on every row. | `http://localhost:3402/?play` | Real Chrome (the bundled chromium is software WebGL here); `--gpu` | `scripts/perf-gate.mjs` lines 1 to 11 |
| `node scripts/probe-fps.mjs [--url http://localhost:3000/?play] [--w 1440] [--h 900] [--secs 6]` | Frame-time percentiles while the seal is driven for a few seconds. Numbers from Intel UHD are a low-end reading. | `http://localhost:3000/?play` | Real Chrome | `scripts/probe-fps.mjs` lines 1 to 9 |
| `node scripts/walk-gaps.mjs [--url http://localhost:3434] [--secs 20] [--adapter intel\|nvidia]` | Frame gaps during a plain `?play` island walk. Adds D3D11 and the GPU memory flag when `--adapter` is given. | `http://localhost:3434` | Playwright with `channel: "chrome"` | `scripts/walk-gaps.mjs` lines 1 to 7 |
| `node scripts/probe-frames.mjs <url> <keys> <hold ms> <frames> <out prefix>` | A frame strip while keys are held, about 250 ms apart, saved to `verification/<prefix>-NN.png`. Prints console and page errors as one JSON line. | the `<url>` argument | Playwright | `scripts/probe-frames.mjs` lines 1 to 10 |
| `node scripts/shot.mjs [--url http://localhost:3000/?spawn=aether] [--out verification/shot.png] [--w 1440] [--h 900] [--wait 1500] [--keys "KeyW:800,KeyD:400"] [--start] [--click "Projects"]` | One screenshot after `window.__world.ready`. Prints console errors and a non-blank pixel check, so a blank frame cannot pass as a picture. | `http://localhost:3000` | Real Chrome recommended: the bundled chromium renders WebGL in software | `scripts/shot.mjs` lines 1 to 13 |
| `node scripts/anime-cap.mjs --url http://localhost:3801 --gpu nvidia\|intel --shots "demo=rimuru&t=3,..." --out dir [--perf 6]` | Stills and frame timing of an anime lab page on one adapter. The Chrome path (`C:/Program Files/Google/Chrome/Application/chrome.exe`) and the adapter LUIDs are fixed to this laptop. | `http://localhost:3801` | Real Chrome, adapter by LUID | `scripts/anime-cap.mjs` lines 1 to 8 |
| `node scripts/cut-load.mjs --phase boot --gpu intel --runs 3` | Load gate, see section 6. | `http://localhost:3114` | Real Chrome, one named adapter | `scripts/cut-load.mjs` lines 2 to 10 |
| `node scripts/cut-verify.mjs <dock> [--port 3811] [--out <dir>] [--step 0.5]` | One dock end to end, rule by rule: PASS, WARN, FAIL or NOT RUN, written to `<out>/verify-<dock>.json`. Exits 1 on any FAIL or NOT RUN. It starts its own server (`cut-serve.mjs`) and runs `accept-run.mjs` against it. Holds the GPU lock. | `http://localhost:3811` (its own) | Real Chrome, GPU lock | `scripts/cut-verify.mjs` lines 2 to 3, 26, 140 |
| `node scripts/accept-run.mjs <dock> [--base URL] \| --all` | Scores a dock's engine stills against `lib/anime/accept/<dock>.json` and writes `verification/accept/<dock>.json` for `issues-checklist.mjs`. | `http://localhost:3801` | Playwright driver; the scoring layer is pure | `scripts/accept-run.mjs` lines 1 to 3, 15 |
| `node scripts/shot-landing.mjs --id pr-mujoco-3396` or `--id p-caustic` | Captures one card figure from `teerthsharma.github.io` twice, a few seconds apart, to `verification/landing-<id>-a.png` and `-b.png`. Needs network access. | none (remote site) | Real Chrome | `scripts/shot-landing.mjs` lines 1 to 9 |

## 5. Capture and helper scripts (not gates)

These produce pictures, data or pages. They are not pass/fail gates unless the table says so.

| Script | What it does | Source |
|---|---|---|
| `scripts/cut-cap.mjs --out <dir> --tag <name> --shots "dock@t[@extraQuery],..." [--port 3811] [--size 1280x720]` | Stills of cutscenes on the NVIDIA adapter, lab navigation hidden, one GPU run at a time. `--sbs <out.jpg> <a> <b> [c]` builds a side-by-side strip. | `scripts/cut-cap.mjs` lines 1 to 4, 94 |
| `scripts/cut-clip.mjs <dock> <from> <to> <out.gif\|out.webp> [fps=24] [width=640]` | A moving clip, one seek per frame, under the GPU lock. | `scripts/cut-clip.mjs` lines 2 to 10 |
| `scripts/tool-sheet.mjs [--pack <name>] [--port 3811]` | One contact sheet per shader pack, written to `verification/shaders/<pack>.jpg`, under the GPU lock. | `scripts/tool-sheet.mjs` lines 2 to 5 |
| `scripts/bake-plates.mjs [--docks a,b] [--out public/plates] [--max-minutes 8] [--dry-run]` | Bakes one background plate per camera-still shot, under the GPU lock. Resumable through `manifest.json`. It was untracked at the start of the session. | `scripts/bake-plates.mjs` lines 1 to 2 |
| `scripts/cut-serve.mjs` | Serves one cutscene's isolated lab page through esbuild. Used by `cut-verify`, `cut-cap`, `cut-clip` and `bake-plates`. | `scripts/cut-serve.mjs` lines 1 to 10 |
| `scripts/cut-lock.mjs` | The GPU lock. At most `CUT_GPU_SLOTS` runs at a time, default 3. A slot is an atomic `mkdir` under `os.tmpdir()`, heartbeat every 30 s, stale after 10 min. | `scripts/cut-lock.mjs` lines 1 to 10 |
| `scripts/gpu-adapter.mjs` | `BASE_FLAGS` and `adapterFlags()`, which pin one adapter of a hybrid laptop by LUID from `chrome://gpu`. | `scripts/gpu-adapter.mjs` lines 1 to 8 |
| `scripts/lab-url.mjs` | The lab URL of a cutscene: the per-cutscene page from `lab-routes.mjs` if present, else the shared registry page. | `scripts/lab-url.mjs` lines 1 to 2 |
| `scripts/lab-routes.mjs` | Writes one dev-only lab page per cutscene and per hero look. Safe to re-run; it rewrites pages under `app/lab`. | `scripts/lab-routes.mjs` lines 1 to 3 |
| `scripts/shader-catalog.mjs` | Builds `lib/anime/tools/catalog.json`; `--check <file>` compiles the tools a file exports (needs `glslangValidator`); `--docs` writes `docs/SHADERS.md`. | `scripts/shader-catalog.mjs` lines 1 to 5 |
| `scripts/shader-pulls.mjs <dock>` | Lists compiling tools whose `suits` names the dock. | `scripts/shader-pulls.mjs` lines 1 to 2 |
| `scripts/issues-checklist.mjs` | Writes `verification/ISSUES.md`, the page the owner reads to close open issues. | `scripts/issues-checklist.mjs` line 1 |
| `scripts/extract-showcase.mjs` | Copies the island's words from `teerthsharma.github.io` verbatim. Needs network access. | `scripts/extract-showcase.mjs` lines 1 to 5 |
| `scripts/extract-contributions.mjs` | Writes `data/contributions.json` from `data/contributions.allow.json`. | `scripts/extract-contributions.mjs` lines 1 to 5 |
| `scripts/extract-workbench.mjs` | Writes `data/workbench.json`. Calls GitHub; run by hand or at build time, never at page render. `--check --from <file>` validates a file. | `scripts/extract-workbench.mjs` lines 1 to 5 |

## 6. Cutscene load gate

The load gate measures how fast the cutscene path is ready: the curtain, the first frame of the engine, and the bytes
the engine does not use. It is run against a production build (`next build`, then `next start -p 3114`) in real Chrome,
one GPU adapter at a time, cold cache, fresh browser context per run, with at least 3 GB of RAM free.

Every number carries its commit, its adapter and its command. Intel UHD and RTX 4060 are never compared with each
other. Run 0 of a browser launch is reported apart.

Baseline: commit `beff5e24`, build `azo1Wp8Ep9_EweAZ7x_x3`, 3 runs per adapter, 16 GB hybrid laptop with about 35%
background CPU. Source: `LOAD-ANALYSIS` section 2. Intel: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A788) Direct3D11)`.
RTX: `ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11)`.

Phases and options: `scripts/cut-load.mjs` lines 2 to 10. Phases are `boot`, `arrival --dock <id>`, `repeat`,
`net --net slow4g`, and `chunks` (gzip sizes of `.next/static`, no browser). Options include `--url` (default
`http://localhost:3114`), `--runs`, `--after-walk <s>`, `--engine-fault <id|hang>`, `--dump-warm` and `--build-dir`.

| # | Metric | Baseline (Intel UHD / RTX 4060) | Target | Command | Measured after |
|---|---|---|---|---|---|
| T1 | Curtain lift (`__world.ready`), median of 3 | 17.0 s / 16.3 s | <= 7.0 s | `node scripts/cut-load.mjs --phase boot --gpu intel --runs 3` | pending WP1 |
| T2 | Curtain lift, RTX | 16.3 s | <= 7.0 s | `... --gpu nvidia` | pending WP1 |
| T3 | Programs linked at ready | 181 / 190 | <= 125 | `--phase boot` (reads `renderer.info.programs`) | pending WP1 |
| T4 | Engine-owned R3F worlds built before the first arrival | 4 (nerve, tf-124410, openxla, home) | 0 | `--phase boot --dump-warm` | pending WP1 |
| T5 | Pup latency after a key at ready + 2 s | 177 to 214 ms (Intel), 163 to 168 ms (RTX) | <= 250 ms | `--phase boot` | pending WP1, WP2 |
| T6 | `home` key to the engine's first frame, Intel | 2.62 to 3.50 s | <= 1.5 s | `--phase arrival --dock home --gpu intel` | pending WP2 |
| T7 | `home` key to the engine's first frame, RTX | 5.46 to 5.81 s | <= 3.0 s | `--phase arrival --dock home --gpu nvidia` | pending WP2 |
| T8 | Arrival to first frame after an 8 s walk, Intel | not measured (`home` alone: 1.73 to 2.58 s) | <= 0.6 s (level 2), <= 1.5 s (level 1) | `--phase arrival --dock <id> --after-walk 8` | pending WP2 |
| T9 | Engine chunks requested after the arrival fires | 20 requests, 519,623 B gz | 0 | `--phase arrival` (resource timing) | pending WP2 |
| T10 | Arrival frame time p95, Intel | 83.2 ms | <= 50 ms | `node scripts/perf-frames.mjs --phase arrival --gpu intel` | pending WP4 |
| T11 | Arrival frames over 100 ms, Intel | 14, 18 | <= 6 | same | pending WP4 |
| T12 | Main-thread task over 100 ms, ready to first key, engine resident | not measured | none over 100 ms; p95 <= 33.4 ms | `perf-frames.mjs --phase walk` on both adapters | pending WP2 |
| T13 | Memory after 5 arrivals | n/a | JS heap growth < 20 MB; geometries and textures back to the `spin()` value | `perf-frames.mjs --phase memory` | pending WP2 |
| T14 | Scene chunk, gz | 657 KB | <= 597 KB | `--phase chunks` (sums `.next/static` gz) | pending WP3 |
| T15 | Scene chunk done on slow 4G | 7.0 s | <= 6.3 s | `--phase net --net slow4g --gpu intel` | pending WP3 |
| T16 | Revalidating requests on a repeat visit | 11 | 0 | `--phase repeat` | pending WP5 |
| T17 | `llms.txt` entries for the 14 upstream docks | 12 | 14 | `curl -s :3114/llms.txt` | pending WP5 |
| T18 | Engine failure at an arrival: the old move on screen | not tested | <= 8 s, no uncaught error | `--engine-fault hang`, then `scripts/cutscene-smoke.mjs` | pending WP2 |
| T19 | `/lab/*` routes in the build | 70 | <= 6 | route table of `next build` | pending WP7 |

Frame control: stills of three docks at three times each, on the NVIDIA adapter at tier 4, before and after a package.
The mean absolute difference per channel must stay at or below 0.3.

## 7. Gate order before a release

The repository has no CI workflow: `.github/` contains no `*.yml` or `*.yaml` files. The order below is derived from
the script headers and the owner's standing deploy rule. Run each step in turn; stop at the first failure.

1. `npm run lint` (`package.json` line 10).
2. `npm run check` (`package.json` line 11).
3. Every pure check in section 2.5. Fix `bg.check.mjs` by installing `glslangValidator` first.
4. The still and static gates in section 3, on any stills the change produced.
5. `npm run build`, then `npm start -- -p <port>` with the port the gates expect (3190 for `frame-audit`, 3450 for
   `pup-visibility`, 3114 for `cut-load`). Restart the server after each rebuild (user memory,
   `prod-server-restart-discipline.md`).
6. Server gates, one GPU run at a time (`scripts/cut-lock.mjs`): `cutscene-smoke`, `pup-visibility`, `frame-audit`,
   `pocket-budget`, `cut-verify <dock>` for each approved dock, `dpr-check`, then `perf-gate` and `perf-frames`
   on each named adapter, then the `cut-load` phases. Record each number with its commit, adapter and command.
7. Stills: `tier-stills` against the baseline set, then `accept-run` and `issues-checklist`.
8. A clean build, then `vercel --prod` (user memory, `deploy-confirmed-features.md`: a standing yes for lint, check,
   capture and clean build, then `vercel --prod`, without a further ask).

## 8. Notes for the next reader

- `docs/TESTING.md` already existed at commit `7d949add` with the load gate section and the T1 to T19 table. This
  rewrite keeps that section and its numbers unchanged (section 6).
- `scripts/cut-load.mjs` line 2 cites `ARCHITECTURE-PLAN` section 4, and the check headers cite `ARCHITECTURE-PLAN`
  sections 3.1 and WP2. No such file is tracked; `docs/ARCHITECTURE.md` is the only architecture document in `docs/`.
- `.oneshot/` holds more `*.check.mjs` files, for example under `.oneshot/p-nerve/issue-build/`. The directory is
  excluded from git by `.git/info/exclude` line 10, so these are not part of the repository's tests and are not
  counted above.
- At the start of the session `scripts/bake-plates.mjs`, `scripts/jolly.mjs` and a folder named `undefined/` were
  untracked (git status at session start).
- Pictures and frame numbers from the pixel and frame gates are only comparable within one adapter. Intel UHD and
  RTX 4060 are separate rows in every table that reports numbers.
