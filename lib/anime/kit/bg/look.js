// THE LOOK: one object that holds the light and the colour harmony of a whole background, so a sky, a city, a floor and a foreground
// are lit by the same hand. Every kit material takes it, shares its uniform objects, and changes together when you change it.
//   const look = bgLook(ctx, { light, shade, amb, bands, base, haze, rim, pools, focus })
//   light  { dir:[x,y,z], col:"#hex" }   the key (written to engine.shared, restored on dispose, so the cast is lit by it too)
//   shade  "#hex"   the cool authored shadow colour every surface multiplies its albedo by
//   amb    "#hex"   sky bounce
//   bands  [n, soft]  how many painted tones the light is cut into (3 to 4 reads as cel), edge softness 0.02 to 0.12
//   base   { dark, h, grime, seed }  the foot of every surface: darkness 0..1 over h metres, grime streak share
//   haze   { col, k, start, h, amt, floor }  aerial perspective: pales to col with distance (k per m after start), pooled below h m
//   rim    { dir, col, k, lo, hi }  a coloured edge light from behind: where the normal turns from the lens
//   focus  { at:[u,v], r, k }  value mass: darkens the set away from a screen point (u v from the lower left), k 0..1 at r + 0.55 frame heights
//   pools  [{ at:[x,y,z], col, r }]  up to 4 pools of light that fall off across any surface (lamps, windows, fire, the domain)
// look.pool(i, { at, col, r }) moves one at runtime (flicker, a lamp going out); look.u holds the shared uniforms.
import { Color, Vector3, Vector4 } from "three";

const C = (h) => new Color(h);

export function bgLook(ctx, o = {}) {
  const sh = ctx.engine.shared;
  const u = {
    uShadeCol: { value: C(o.shade ?? "#7480b8") },
    uBands: { value: new Vector4(o.bands?.[0] ?? 3, o.bands?.[1] ?? 0.05, 0, 0) },
    uBase: { value: new Vector4(o.base?.dark ?? 0.45, o.base?.h ?? 6, o.base?.grime ?? 0.35, o.base?.seed ?? 3) },
    uHaze: { value: new Vector4(...C(o.haze?.col ?? "#9fb0cc").toArray(), o.haze?.k ?? 0.004) },
    uHaze2: { value: new Vector4(o.haze?.start ?? 12, o.haze?.h ?? 40, o.haze?.amt ?? 0.92, o.haze?.floor ?? 0) },
    uRimDir: { value: new Vector3(...(o.rim?.dir ?? [0, 0.3, -1])).normalize() },
    uRimCol: { value: C(o.rim?.col ?? "#ffb070") },
    uRim: { value: new Vector4(o.rim?.lo ?? 0.55, o.rim?.hi ?? 0.92, o.rim?.k ?? 0.6, 0) },
    uPool: { value: Array.from({ length: 4 }, () => new Vector4(0, 0, 0, 0)) },
    uPoolCol: { value: Array.from({ length: 4 }, () => new Color(0, 0, 0)) },
    uAmb: { value: C(o.amb ?? "#8090c0") },
    uFocus: { value: new Vector4(o.focus?.at?.[0] ?? 0.5, o.focus?.at?.[1] ?? 0.45, o.focus?.r ?? 0.3, o.focus?.k ?? 0) },
    uLightDir: sh.uLightDir, uLightCol: sh.uLightCol, uTime: sh.uTime, uRes: sh.uRes,
  };
  const prev = { dir: sh.uLightDir.value.clone(), col: sh.uLightCol.value.clone() };
  if (o.light) {
    sh.uLightDir.value.fromArray(o.light.dir).normalize();
    if (o.light.col) sh.uLightCol.value.set(o.light.col);
  }
  const look = {
    u, o,
    pool(i, p) {
      if (p.at) u.uPool.value[i].set(p.at[0], p.at[1], p.at[2], p.r ?? u.uPool.value[i].w);
      else if (p.r !== undefined) u.uPool.value[i].w = p.r;
      if (p.col) u.uPoolCol.value[i].set(p.col);
      if (p.k !== undefined) u.uPoolCol.value[i].multiplyScalar(p.k);
    },
    hazeColor: (hex) => u.uHaze.value.fromArray(C(hex).toArray()),
    dispose() { sh.uLightDir.value.copy(prev.dir); sh.uLightCol.value.copy(prev.col); },
  };
  (o.pools ?? []).slice(0, 4).forEach((p, i) => look.pool(i, p));
  return look;
}
