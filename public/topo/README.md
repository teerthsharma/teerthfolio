# Baked topological-shader data

Static files for the topological shader, loaded only behind `?topo` (default off).

## Belongs here

- `route-plates.json`: the baked route-heat plates of the 8-leg library L8. Format version 1: `grid` (`R` 84, `h` 4, `n` 1,615 cells of `lib/world/heat/hexgrid.js`) and `legs`, each with `id`, `from`, `to`, `lengthM` and `heat`, the D5 heat of walking that leg once (1,615 numbers at 4 decimals, normalised to a maximum of 1). A loader that sees another `n` refuses it.

## Does not belong here

- Pattern or cutscene plates (`public/plates/`).
- Anything not produced by a script in `scripts/`, or a file that is edited by hand.

## Regenerating

`npm run bake:topo` rewrites `route-plates.json`; `node scripts/bake-route-heat.mjs --check` exits 1 unless the committed file equals a fresh bake. The bake is deterministic. The plates are a bake pipeline, not evidence about visitors: T1 found that the 8 routes do not explain roam heat (`../../experiments/topological-shader/out/t1.md`), and their value is judged by the owner's blind pairs.
