# Architecture

## Cutscene loading

Each place on the island opens with a cutscene: the visitor's first arrival plays it, then the seal is back on the island.
Two renderers can play it. The engine (`lib/anime/`) plays the anime-style cut in its own WebGL context under an iris
over the island. The R3F move (`components/world/cutscene/moves/`) is the older in-world move. The loading path decides,
per arrival, which one plays and how early its work is done, so the arrival starts without a visible hitch.

### What decides what plays

- `lib/anime/live.js` is the one switch. `ENGINE_DOCKS` lists every dock with an engine scene, `ENGINE_LIVE` the docks
  approved by eye to play on the engine, and `engineOwns(id)` answers for an arrival. `?engine=<id>[,<id>]`, `?engine=all`
  and `?engine=none` override the list for review.
- `engineActive(id, engineFail)` is what every R3F consumer reads. A failed engine hands the dock back to its R3F move.
- `lib/anime/cutscenes/index.js` is the lazy registry. Each dock is two dynamic imports (`scene.js`, `build.js`), so a
  broken dock rejects only its own promise. `hasCut(id)` and `loadCut(id)` are the only entry points.

### Fallback chain

Checked in this order at every arrival:

1. a prepared engine player for the dock;
2. a cold engine start;
3. the R3F move, for docks that have one;
4. nothing (the two engine-only docks, `pr-anyps5-12609` and `pr-tensorflow-128930`, show the island and the HUD card).

A failed prepare marks `ui.engineFail[place]` at once, so the R3F move starts warming while the seal is still walking.

### Target loading tree

```
document, CSS, initial scripts                          unchanged
 +- Scene chunk (island, Look, postprocessing)          moves leave it (WP3)
 |   +- prewarm.js: earliest-deadline-first queue        (WP1)
 |   |     move job    R3F dock the engine does not own
 |   |     load job   lazy move chunk, one import per dock
 |   |     engine job prefetch, spin, build, compile   (WP2)
 |   +- EngineCut.jsx: persistent host, prepared-player consumer (WP2)
 +- boot compile behind the curtain, engine shared pack at low priority
 +- ready: the curtain lifts once no critical dock is warming
 +- ready + idle: hot engine on a detached 1x1 canvas, composer programs linked (WP2)
 +- walking: per dock, loadCut, initSteps in slices of at most 50 ms, compileAsync, one hidden frame
 +- arrival: take(id) appends the canvas and opens the iris
 +- end: release(id) disposes the player and keeps the context
```

`deadline.js` gives the seconds until a dock's arrival could fire, from the seal's position and the dock's ring at
the seal's top speed. Warming is ordered by that deadline, so a bigger island needs no new constants.

### Module contracts

- `lib/world/cutscene/deadline.js`: `deadlineS(seal, dock)`, pure.
- `components/world/cutscene/prewarm.js`: `registerWarm`, `takeWarm`, `warmTick`, `warmPending`, plus the seams
  `registerLoader(id, load)` and `registerEngineProvider(p)`.
- `lib/anime/prep.js`: `status`, `prefetch`, `spin`, `prepare`, `take`, `release`, `drop`, `readiness`. Framework-free.
- `components/anime/EngineCut.jsx`: keeps the `EngineCut()` export and the `useUi` shape; registers the engine provider.
- `components/world/cutscene/moves/index.js`: `MOVE_LOADERS`, one literal `import()` per R3F move.

### Render modes

Four render modes come from the device quality tier. `lib/quality/modes.js` is the single map (`modeForTier`,
`featuresForTier`): LOW shows the baked plate only, GOOD adds shaders, MEDIUM adds the heavy shaders, BEST adds a few
live objects. The engine prepares a dock above LOW only.

## Routes and checks

The gates that guard this path are described in [TESTING.md](TESTING.md).
