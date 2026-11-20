# Shader table

2027 shader tools in 28 packs, filed so a cutscene can pick them off one table and knit them together.

## Picking a shader

Search a pack table (docs/shaders/<pack>.md) with your editor's find, on two columns:

- **suits** names the cutscene (dock) the shader was written for, or "any". Search the dock name to see everything made for that cutscene, then search "any" for the shared ones.
- **use** says the kind: card, grade, helper, line, mask, noise, plate, screen, surface. Search the kind to find, for example, every plate or every grade.

Read the **rated** column before you build on one:

- **real**: a finished shader with its own look (1360 of 2027). Build on these.
- **thin**: a small helper or a plain fill (523). Fine as a part of a frame, not as the frame.
- **alias**: the same picture as another entry (144); the column names the entry to use instead, as pack/[dock/]name.

To pull one, a cutscene writes these lines, with the pack and name from the table:

```js
import { loadPack } from "../../tools/packs.js";
import { glslFor } from "../../tools/index.js";
await loadPack("<pack>");
const glsl = glslFor(["<name from the how-to-pull column>"]);
```

## Find one

- One table per pack in docs/shaders/<pack>.md: name, what it draws, use, suits, inputs, whether it compiles, how to pull it.
- The machine-readable table is lib/anime/tools/catalog.json (one record per tool: pack, dock, file, GLSL functions, uniforms, hashes, duplicates, collisions, compile result). Rebuild it with `node scripts/shader-catalog.mjs`.
- Thumbnails: `node scripts/tool-sheet.mjs --pack <name>` writes verification/shaders/<pack>.jpg. See one live at /lab/anime?tool=<name> after the pack is loaded.

## Use one (two lines in a cutscene)

```js
import { loadPack } from "../../tools/packs.js";
await loadPack("jjk");
```

Then glslFor(["jjkVoidSpace"]), tool(name) and uniformsFor(...) from lib/anime/tools/index.js see the whole pack. Each pack is a separate dynamic import, so only the loaded packs ship. Code that imports a pack index itself calls registerPack(namespace) instead.

- A tool that failed the compile check is not registered (lib/anime/tools/packs.gen.js, SKIP).
- A name shared by several tools (QUALIFY in packs.gen.js, 211 tools) registers only as "<pack>/<name>" ("cuts/<dock>/<name>"), so it never depends on load order. The "how to pull it" column gives the exact string for glslFor.
- A dock module in cuts/ calls its dock siblings (worldPlate, stubSky); those are filed as its dependencies, so one name pulls the lot.
- jojo needs its kit (jojoKit); it is filed as a tool and every jojo tool depends on it.
- Two tools that define the same GLSL function cannot share one shader: fnClashes(["a", "b"]) lists them before you build.
- Tools with deps load their kit with them; a pack that needs another pack loads it first (NEEDS in packs.gen.js).

## Packs

- [araki](araki.md): 13 tools, 13 compile
- [basic](basic.md): 151 tools, 151 compile
- [bg](bg.md): 21 tools, 21 compile
- [core](core.md): 17 tools, 17 compile (registered in TOOLS already)
- [cuts](cuts.md): 610 tools, 610 compile
- [deepmath](deepmath.md): 61 tools, 61 compile
- [dock](dock.md): 51 tools, 51 compile
- [gold](gold.md): 51 tools, 51 compile
- [indexneeds](indexneeds.md): 16 tools, 16 compile
- [jcstaff](jcstaff.md): 14 tools, 14 compile
- [jjk](jjk.md): 37 tools, 37 compile
- [jojo](jojo.md): 151 tools, 151 compile
- [madhouse](madhouse.md): 13 tools, 13 compile
- [mappa](mappa.md): 14 tools, 14 compile
- [myth](myth.md): 51 tools, 51 compile
- [occlude](occlude.md): 151 tools, 151 compile
- [other](other.md): 51 tools, 51 compile
- [phys](phys.md): 61 tools, 61 compile
- [pierrot](pierrot.md): 14 tools, 14 compile
- [prettytv](prettytv.md): 13 tools, 13 compile
- [print](print.md): 31 tools, 31 compile
- [sakuga](sakuga.md): 41 tools, 41 compile
- [school](school.md): 51 tools, 51 compile
- [shinkai](shinkai.md): 14 tools, 14 compile
- [shonen](shonen.md): 13 tools, 13 compile
- [space](space.md): 151 tools, 151 compile
- [topo](topo.md): 151 tools, 151 compile
- [ufotable](ufotable.md): 14 tools, 14 compile

## Backgrounds: the kit is the front door

Painting a set (a sky, a city, a floor, a far row, a foreground) starts at the background kit, not at this table: `import { bg } from "lib/anime/kit/bg/index.js"` (docs/BACKGROUNDS.md). The kit's painters are also in the table as the **bg** pack (21 tools with demos: the painter's functions, six sky presets, seven silhouette cards). For everything else, the table is filed by background need in [docs/shaders/backgrounds.md](backgrounds.md) (282 real, compiling tools under sky, water, ground, interior, city, atmosphere, foreground, light), and from code:

```js
import { bg } from "../../kit/bg/index.js";
const picks = await bg.pick("sky", "dusk");        // the real tools filed for that need, filtered by text
const { glsl, uniforms } = await bg.shader("tgDuskSky");   // loads the pack and returns the GLSL, ready for ctx.bake.plateLayer / sky / card
```

Regenerate the need index with `node lib/anime/tools/bg-picks.mjs` after `node scripts/shader-catalog.mjs`. Note: `node scripts/shader-catalog.mjs --docs` rewrites this file from a template; the Backgrounds section is re-added by hand until the template carries it.
