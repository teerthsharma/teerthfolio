<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/three.js-0.178-049ef4?style=flat-square&logo=three.js&logoColor=white" />
  <img src="https://img.shields.io/badge/world%20check-30%20rules-2f7dff?style=flat-square" />
  <img src="https://img.shields.io/badge/live-teerthfolio.vercel.app-e94bff?style=flat-square&logo=vercel" />
</p>

<h1 align="center">🦭 Seal's Topology Land</h1>

<p align="center">
  <b>A portfolio you play: a seal pup slides round an ice island made of merged upstream code</b><br/>
  <i>Invented by <a href="https://teerthsharma.github.io/">Teerth Sharma</a> · <a href="https://github.com/Debyte404/teerthfolio">repo</a> · teerths57@gmail.com</i>
</p>

<p align="center">
  <a href="https://teerthfolio.vercel.app"><b>Play it live</b></a>&nbsp;&nbsp;·&nbsp;&nbsp;
  <a href="https://teerthsharma.github.io">Landing site (the words and numbers come from here)</a>
</p>

---

## 1. What it is

A Bruno-Simon-style open world. You are a baby harp-seal pup, the island's
enlightened "Buddha seal". The **landscape** is Teerth's merged contributions to
Google DeepMind, NVIDIA, TensorFlow, XLA, Google, Meta and Triton. The
**buildings** are his own research projects. Slide up to anything and its panel
opens with the claim, the numbers and the link, verbatim from
[teerthsharma.github.io](https://teerthsharma.github.io) (extracted by
`scripts/extract-showcase.mjs` into `data/showcase.json`, never edited by hand).

Two rules shape everything you see:

- **Show, never tell.** Nothing on the island explains anything: no diagrams, no
  charts, no 3D text beyond names. The explaining lives on GitHub; the island is
  the place you visit.
- **Every place is radioactive** (except the igloo, the neutral zone). Each area
  glows in its own colour; crossing into one warps the view, flashes a halo and
  mutates the seal into an anime-homage look for as long as it stays.

## 2. The island: contributions as landforms

| Place | Contribution | Headline | Hero move |
|---|---|---|---|
| Mount MujoRush | [google-deepmind/mujoco #3396](https://github.com/google-deepmind/mujoco/pull/3396) | 1,281.6x less scratch | purple |
| Mount MujoRush | [google-deepmind/mujoco_warp #1541](https://github.com/google-deepmind/mujoco_warp/pull/1541) | 1.513x faster | smash |
| Mount MujoRush | [google-deepmind/mujoco #3450](https://github.com/google-deepmind/mujoco/pull/3450) | 15,361x fewer probes | beam |
| The Highway | [google/highway #3244](https://github.com/google/highway/pull/3244) | 65.5x fewer comparisons | smash |
| XNNPACK Peak | [google/XNNPACK #10801](https://github.com/google/XNNPACK/pull/10801) | 6.42% lower peak | beam |
| TensorFlow Dam | [tensorflow/tensorflow #124410](https://github.com/tensorflow/tensorflow/pull/124410) | 4 edges to 3 | beam |
| The NVIDIA Moat | [NVIDIA/NeMo-Relay #481](https://github.com/NVIDIA/NeMo-Relay/pull/481) | 23 files | purple |
| The NVIDIA Moat | [dsx-ai-factory/topograph #432](https://github.com/dsx-ai-factory/topograph/pull/432) | 145 lines gated | purple |
| Triton | [triton-lang/kernels #22](https://github.com/triton-lang/kernels/pull/22) | 804 lines added | purple |
| The XLA Geyser | [openxla/xla #46539](https://github.com/openxla/xla/pull/46539) | 5 lines, deterministic | orbit |
| Pyrefly Floes | [facebook/pyrefly #4180](https://github.com/facebook/pyrefly/pull/4180) | 208 SCCs pinned | orbit |

The geology is one story: Triton's glacier feeds **the river**, which runs south
between Mount MujoRush (three seal faces carved like Rushmore, a PR number on
each neck) and the Google range, fills the lake behind the **TensorFlow Dam**
(brushed metal, gates on an 8 s rhythm), and the water the dam turns aside forms
**the NVIDIA Moat** round a rock keep. The XLA geyser erupts every 50 s exactly;
pyrefly's 208 floes hang over the outflow as a funnel above a whirlpool. A real
four-lane **highway** runs from town to MujoRush's car park, cars in lockstep
lanes.

**Anomalies you can touch:** ride the river for fast travel; swim into the
pyrefly whirlpool and it spins you round and throws you onto the bank; stand at
the geyser's rim and it launches you 7 m up; the highway's asphalt makes you 30%
faster.

## 3. The lab buildings

| Building | Tagline | Hero move |
|---|---|---|
| resolvent | Attention and Markov paths share one operator. | purple |
| Epsilon-Hollow | Memory, files and scheduler, on one sphere. | purple |
| Aether-Lang | Loops stop when their shape stops changing. | purple |
| caustic | Hallucination, measurable with no ground truth. | purple |
| monodromy | Can it be undone? Topology answers. | orbit |
| topological-ml-toolkit | The shape of data, as an ordinary feature. | purple |
| faraday | The field coupling, found rather than assumed. | beam |
| nerve | The control that could kill my result. | smash |
| separatrix | Decided by the data, not by rounding. | orbit |
| planimeter | Exact, or refused. | beam |
| tangle | It refuses rather than guesses. | orbit |

## 4. The seal

- **Lazy on land, fast in water:** 10 m/s slide, 15 m/s dash, a 2.9 m glide
  after you let go; 15 m/s swimming so it can beat the current to a bank.
- **Meditates** when left alone: sits up, eyes closed, a halo floats over its
  head and the area's motes spiral in.
- **First-arrival showcase**, once per place per session: the camera drops to a
  hero angle and circles the place, the name appears in the cinema bar, and the
  seal performs a hero move, fired at the viewer:
  `smash` (a leap and slam with a shockwave), `purple` (a red orb and a blue orb
  collide into a purple sphere), `beam` (a charged beam), `orbit` (a sprint round
  the building). Any key, tap or click skips it.
- **18 Easter eggs:** pups in anime-homage costumes (golden spikes, a ninja
  headband, a raised blindfold, a demon-king ring, a turban, a straw hat and
  more) hidden across the island, at least 12 m apart. They turn to look at you
  and bow.

## 5. Controls

The on-screen coach shows whichever input you are using and switches live:

| Input | Move | Open a place |
|---|---|---|
| Keyboard | WASD or arrows, Shift to dash | E or Enter |
| Mouse | click the snow to slide there | click the place |
| Touch | drag anywhere to steer, tap a place to go there | tap the prompt |

A square minimap sits bottom-right (tap a place to go there); **Projects**
lists everything without playing.

## 6. Layout

```
app/                     Next.js App Router entry, global CSS, OG image
components/world/        the scene
  land/                  the contributions as landforms (MujoRush, Triton, the
                         Google range, the dam and geyser, the moat, the floes,
                         the highway)
  monuments/             the lab buildings, one file per project
  seal/                  the pup (variants/D), its outfits and costumes
  life/                  radiation motes, anomalies, penguins, the Easter-egg pups
  look/                  post-processing: the radiation effect on the view
  sea/ sky/ island/      water, snowfall and gulls, the ground
  ui/                    minimap, sheets, the move coach
lib/world/               pure data and physics, no React: places, river, land,
                         motion, terrain, moments (the shared clocks), hero moves
data/showcase.json       every word and number, from the landing site
scripts/                 the world check, capture and probe tools
```

## 7. Run and check

```bash
npm install
npm run dev              # http://localhost:3000   (?play skips the intro, ?spawn=<place id> starts at a place)
npm run check            # the world check: 30 rules against the real motion code, no browser
npm run lint
npm run build
node scripts/shot.mjs --url "http://localhost:3000/?spawn=p-nerve" --out verification/nerve.png
node scripts/probe-frames.mjs "http://localhost:3000/?play" "KeyD+KeyW" 2600 14 strip   # a frame strip of a moment
```

`npm run check` runs the island's rules through the same `stepSeal` the game
uses: bridges are walkable, every dock is dry and inside its area, the river
runs source to sea and an idle rider is carried the length of the island
without a bump, the dam holds the lake and the moat is fed from it, no two
neighbouring areas glow in the same hue, the whirlpool and the geyser always
land the seal on dry flat ground clear of everything, the highway is dry and
flat and clear of every place, a glide from top speed is 2-4 m, and every
Easter-egg pup is clear of docks and 12 m from the next. The full list:
bridges, places, dry docks, river source to sea, dam holds, moat fed from the
reservoir, districts, radiation everywhere, river between MujoRush and the
Google range, trails and bridges, motion, walls, rim, docks, props, throttle,
glide, skid, reaction, bump, arrival, drift, yaw cap, river ride, river exit,
island river ride, the whirlpool, the geyser, the highway, mutation looks.

