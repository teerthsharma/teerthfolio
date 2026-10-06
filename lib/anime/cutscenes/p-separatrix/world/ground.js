// p-separatrix WORLD: the arena saddle floor (saddle-arena-floor, local), the coral ridge with its rounding band, and the outer ground.
//
// FLOOR  heightfield 90 x 90 m, 180 x 180 cells: y = floorY(x, z) (common.js): K (z^2 - x^2) faded to 0 by r = 17, two bowls (R 2.3, depth 0.34)
//   at x = +-4.6 whose rim is flattened first so the water plane is level. Normals from the displaced grid.
//   Shading = stoneCel travertine plaza + sand grain (0.96 + 0.08 h21(floor(40 P.xz))) + paving joints every 1.6 m (1 px #2a1a24)
//   RIDGE  |x| < 0.45 along z (|z| < RIDGE_END - 0.3): coral #d96a52 in its own 3 tones, 2 px umber edge.
//   BAND   d = max(|x| - 1.0, |z| - RIDGE_END): inside, pale coral #f4b8a0 stone with #b9573a dots (lattice 0.3 m, r 0.04), a punched
//          gold-leaf dot border (pitch 0.28 m, r 0.045, at |x| = 0.92), 2 px umber edge on d = 0.
//   POOL RIMS  2 px umber ring at |P.xz - (+-4.6, 0)| = 2.3; the bowl wall inside is dimmed x0.72.
// GROUND beyond the walls: a ring r 20..420 at y -0.05, sandy travertine tones, the apricot haze takes it to the horizon (never white).
import { Group, Mesh, PlaneGeometry, RingGeometry } from "three";
import { surface } from "../../../kit/surface.js";
import { C, POOL_R, POOL_X, RIDGE_END, PRELUDE, floorY, hex, mixHex } from "./common.js";
import { GLSL as GOLDLEAF } from "./gold-leaf.js";

export function buildGround(ctx, U) {
  const group = new Group(), sh = ctx.engine.shared;
  // ---- the floor heightfield
  const g = new PlaneGeometry(90, 90, 180, 180).rotateX(-Math.PI / 2);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) P.setY(i, floorY(P.getX(i), P.getZ(i)));
  g.computeVertexNormals();
  const floorMat = surface(sh, /* glsl */ `
    ${PRELUDE}
    ${GOLDLEAF}
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 c = stoneCel(P, N, V, 1.0, ${mixHex(C.stoneMid, C.stoneShade, 0.45)}, ${hex(C.stone)}, ${hex(C.stoneLit)}, 0.8);
      c *= 0.96 + 0.08 * h21(floor(P.xz * 40.0));
      vec2 j = abs(fract(P.xz / 1.6 + 0.5) - 0.5) * 1.6;
      c = mix(c, ${hex(C.deep)}, max(aaLine(j.x, 1.0), aaLine(j.y, 1.0)) * 0.7);
      // rounding band
      float u = P.x, v = P.z;
      float db = max(abs(u) - 1.0, abs(v) - ${RIDGE_END.toFixed(2)}), fb = fwidth(db) + 1e-5;
      float band = 1.0 - smoothstep(-fb, fb, db);
      vec3 bc = stoneCel(P, N, V, 1.0, ${mixHex(C.coral, C.stoneShade, 0.4)}, ${mixHex(C.coral, C.coralBand, 0.6)}, ${hex(C.coralBand)}, 0.6);
      vec2 q = fract(P.xz / 0.3) - 0.5; float dotd = length(q) * 0.3 - 0.04;
      bc = mix(bc, ${hex(C.sinopia)}, 1.0 - smoothstep(-fwidth(dotd), fwidth(dotd), dotd));
      vec2 q2 = vec2(abs(u) - 0.92, fract(v / 0.28) - 0.5); q2.y *= 0.28; float gd = length(q2) - 0.045;
      bc = mix(bc, ${hex(C.gold)}, (1.0 - smoothstep(-fwidth(gd), fwidth(gd), gd)) * step(db, -0.03) * step(abs(v), ${RIDGE_END.toFixed(2)} - 0.15));
      c = mix(c, bc, band);
      c = mix(c, ${hex(C.umber)}, aaLine(db, 2.0));
      // the ridge crest
      float dr = max(abs(u) - 0.45, abs(v) - ${(RIDGE_END - 0.3).toFixed(2)}), fr = fwidth(dr) + 1e-5;
      float ridge = 1.0 - smoothstep(-fr, fr, dr);
      vec3 rc = stoneCel(P, N, V, 1.0, ${mixHex(C.coral, C.stoneShade, 0.6)}, ${hex(C.coral)}, ${mixHex(C.coral, C.goldLit, 0.25)}, 1.0);
      c = mix(c, rc, ridge);
      c = mix(c, ${hex(C.umber)}, aaLine(dr, 2.0));
      // pool rims
      float dp = min(length(P.xz - vec2(${POOL_X.toFixed(2)}, 0.0)), length(P.xz + vec2(${POOL_X.toFixed(2)}, 0.0)));
      c *= mix(1.0, 0.72, 1.0 - smoothstep(${(POOL_R - 0.05).toFixed(2)}, ${(POOL_R + 0.05).toFixed(2)}, dp));
      c = mix(c, ${hex(C.umber)}, aaLine(dp - ${POOL_R.toFixed(2)}, 2.0));
      return goldLeaf(P, N, V, fresco(c, P), uErase);
    }`, { uniforms: U, id: 0.5 });
  group.add(new Mesh(g, floorMat));
  // ---- the outer ground
  const og = new RingGeometry(20, 420, 72, 6).rotateX(-Math.PI / 2).translate(0, -0.05, 0);
  const groundMat = surface(sh, /* glsl */ `
    ${PRELUDE}
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      float far = smoothstep(40.0, 260.0, length(P.xz));
      vec3 c = stoneCel(P * 0.5, N, V, 1.0, ${mixHex(C.stoneMid, C.stoneShade, 0.4)}, ${mixHex(C.stoneMid, C.stone, 0.6)}, ${hex(C.stone)}, 0.5);
      c = mix(c, ${hex(C.hills)}, far * 0.55);
      c *= 0.94 + 0.12 * fbm(P.xz * 0.35);
      c = fresco(c, P);
      return apricot(c, P);
    }`, { uniforms: U, id: 0.5 });
  group.add(new Mesh(og, groundMat));
  return { group, update() {}, dispose() { g.dispose(); og.dispose(); floorMat.dispose(); groundMat.dispose(); } };
}
