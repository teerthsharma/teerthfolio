// BUILD for pr-xnnpack-10801 (DIRECTION agent). Imports only the three layer entry points and the framework.
// Each layer exports `export default function build(ctx)` returning { group, update(t, dt, cue), dispose }.
// composeLayers isolates them: a layer that throws leaves the others playing.
//
// What this file adds on top of composeLayers (the director's job, all pure functions of the clock):
//   1. ctx.stage: the stage data plus sealY(t), realm(t), dim(t), so every layer reads ONE timeline of the throne and the realm.
//   2. cue.realm / cue.dim / cue.sealY derived each frame before the layers run.
//   3. The pocket owns its background and fog (L14 live-site bug: island fog must never bleed in): the root's background is
//      ink black in the dimension and the island's pale sky outside it; root.fog is always null; the sun is cleared
//      (no light shafts: the look has none).
//   4. A dev-time camera-law report once at build.
import { composeLayers } from "../framework.js";
import world from "./world/index.js";
import cast from "./cast/index.js";
import fx from "./fx/index.js";

const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

// the realm timeline: island -> dimension (3.0) -> return (break at 9.55) -> island again (10.8)
const T_ON = 3.0, T_BREAK = 9.55, T_ISLAND = 10.8;

export default function build(ctx) {
  const { THREE, scene } = ctx;
  const S = scene.stage;
  const mv = scene.seal.moves; // [rise, drop], the same two moves the player applies (smoothstep eased)

  // dimension strength 0..1: the wipe (1.2 - 3.0) darkens the island, the impact lands the dimension at 3.0 (a hard 1),
  // the break (9.55 - 10.8) lets it fall away
  const dim = (t) => (t < T_ON ? smooth((t - 1.2) / 1.8) * 0.5 : t < T_BREAK ? 1 : 1 - smooth((t - T_BREAK) / (T_ISLAND - T_BREAK)));
  const realm = (t) => (t < T_ON ? "island" : t < T_BREAK ? "dimension" : t < T_ISLAND ? "return" : "island");
  const sealY = (t) => {
    let y = scene.seal.at[1];
    for (const m of mv) { const k = smooth((t - m.t[0]) / (m.t[1] - m.t[0])); if (k <= 0) break; y = lerp(y, m.to[1], k); }
    return y;
  };
  ctx.stage = { ...S, sealY, realm, dim, T_ON, T_BREAK, T_ISLAND };

  // pocket-owned background and fog
  const inkBg = new THREE.Color(scene.palette.sky), islandBg = new THREE.Color(scene.palette.islandSky), bg = new THREE.Color();
  ctx.root.fog = null;
  ctx.root.background = bg.copy(islandBg);

  try { const issues = ctx.camera.report?.() ?? []; for (const m of issues) console.warn(`[pr-xnnpack-10801] camera law: ${m}`); } catch (e) { /* report is dev-only */ }

  const L = composeLayers(ctx, { world, cast, fx });

  return {
    ...L,
    update(t, dt, cue) {
      const d = dim(cue.t ?? t);
      cue.realm = realm(cue.t ?? t); cue.dim = d; cue.sealY = sealY(cue.t ?? t);
      // the dimension is ink black, the island is its own pale sky; never a blend that lifts the blacks
      ctx.root.background.copy(cue.realm === "dimension" ? inkBg : cue.realm === "return" ? inkBg.clone().lerp(islandBg, smooth((cue.t - T_BREAK - 0.3) / 0.9)) : islandBg.clone().lerp(inkBg, d >= 0.5 ? 0.85 : d * 1.7));
      if (ctx.root.fog) ctx.root.fog = null;
      L.update(t, dt, cue);
    },
    dispose() { L.dispose(); },
  };
}
