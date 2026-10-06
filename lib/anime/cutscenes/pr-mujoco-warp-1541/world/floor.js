// THE PAIR FLOOR (bible 3.4): 22 x 22 = 484 coral cells, ONE instanced draw plus ONE instanced ink hull (layer 1: it animates).
//
//  geometry   box 0.191 m square x 0.04 m, pitch 0.30 m (gutter 0.109 m), centred (0.9, 0.03, -1.6); row i along z, column j along x.
//  build      rows rise f0..f30: row i starts at 0.035 i s, rises for 0.35 s: scale = smoothstep(u), y = base - 0.06 (1 - smoothstep(u)).
//  pulse      f36..f72 the diagonal cells pulse #ffa285 -> #fff3c2 (glow = 0.7 (0.5 + 0.5 sin(2 pi 1.2 (t - 1.5)))) and the gold edge starts.
//  slide      f180..f216: row i starts at tS + 0.03 i, u = clamp((t - start) / 0.85); a cell in column j moves to the diagonal:
//                x = cx(j) + (cx(i) - cx(j)) smoothstep(u); non-diagonal cells shrink over the last 28 % of the move and vanish;
//                diagonal cells lift 0.04 m and grow x1.45 over u in [0.5, 1], glow -> #fff3c2, then shrink out in 0.15 s as the tree
//                lifts off (td_i = tS + 0.75 + 0.03 i; the forest module reads the same law).
//  shading    top face: checker #ff7a6b / #ffa285, 1 px stipple (hash of floor(local*60) > 0.82 darkens 5 %), hard cream sliver on the top-left
//             corner, gold #ffd84a 1.5 px edge on diagonal cells; side faces: shadow #d9483f toward the sun, deep #8f2230 on the cast side (-x)
//             and the lower rim. Violet cast with the charge: c = mix(c, c (.78,.66,1), 0.5 uPow).
//  outline    instanced inverted hull 2.5 px #5a1620, thinned to 1.5 px on wide shots, shifting to #4a2878 at the crack.
//  keep-clear the seal stands inside the floor's footprint: non-diagonal cells within 0.85 m of the seal's start are never built, so
//             the hero is never half sunk in cells (L1/L2) and the shell has a clearing.
import { BoxGeometry, Color, InstancedBufferAttribute, InstancedMesh } from "three";
import { surface } from "../../../kit/surface.js";
import { V, FLOOR, SUN, sm, clamp01, cellX, cellZ, instHull, sealSpots } from "./common.js";

export const TREE_DEPART = (T, i) => T.tS + 0.75 + 0.03 * i;   // shared law: when diagonal cell i hands over to its tree

export function buildFloor(ctx, U) {
  const { THREE, engine } = ctx;
  const sh = engine.shared;
  const n = FLOOR.n, count = n * n;
  const geo = new BoxGeometry(FLOOR.half * 2, FLOOR.h, FLOOR.half * 2).translate(0, FLOOR.h / 2, 0);

  const aI = new Float32Array(count * 4);
  const [sx, , sz] = sealSpots(ctx)[0];
  const cleared = new Uint8Array(count);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = i * n + j;
    aI[k * 4] = (i + j) % 2; aI[k * 4 + 1] = i === j ? 1 : 0; aI[k * 4 + 2] = ((i * 7 + j * 13) % 11) / 11; aI[k * 4 + 3] = ((i * 5 + j * 3) % 9) / 9;
    if (i !== j && Math.hypot(cellX(j) - sx, cellZ(i) - sz) < 0.85) cleared[k] = 1;
  }
  geo.setAttribute("aI", new InstancedBufferAttribute(aI, 4));

  const mat = surface(sh, /* glsl */ `
    uniform float uGlow; uniform float uEdge; uniform float uPow;
    varying vec4 vI; varying vec2 vLP;
    vec3 shade(vec3 P, vec3 N, vec3 V) {
      vec3 L = normalize(vec3(${SUN.map((v) => v.toFixed(4)).join(", ")}));
      float diag = vI.y;
      vec3 lit = mix(${V("#ff7a6b")}, ${V("#ffa285")}, vI.x);
      lit = mix(lit, mix(${V("#ffa285")}, ${V("#fff3c2")}, uGlow), diag);
      vec3 c;
      if (N.y > 0.5) {
        c = lit;
        c *= 1.0 - 0.05 * step(0.82, h21(floor(vLP * 60.0 + vI.zw * 13.0)));        // 1 px stipple
        float e = max(abs(vLP.x), abs(vLP.y)) / 0.0955;
        c = mix(c, ${V("#ffd84a")}, diag * uEdge * step(0.84, e));                  // gold edge on the diagonal
        c = mix(c, ${V("#fbfaf7")}, step(0.84, (-vLP.x - vLP.y) / (2.0 * 0.0955)) * (1.0 - diag * uEdge)); // hard top-left sliver
      } else {
        float lam = dot(N, L);
        c = lam > 0.2 ? ${V("#d9483f")} : ${V("#8f2230")};                          // cast side (-x) takes the deep tone
      }
      return mix(c, c * vec3(0.78, 0.66, 1.0), uPow * 0.5);
    }`, { instanced: true, attrs: "attribute vec4 aI; varying vec4 vI; varying vec2 vLP;", vert: "vI = aI; vLP = position.xz;", varyings: "varying vec4 vI; varying vec2 vLP;",
    tools: ["noise"], uniforms: { uGlow: U.glow, uEdge: U.edge, uPow: U.pow } });
  const mesh = new InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  const hull = instHull(mesh, sh, { col: "#5a1620", px: 2.5 });

  const group = new THREE.Group();
  group.userData.layer = 1;
  group.add(hull, mesh);

  const M = mesh.instanceMatrix.array;
  const colV = new Color("#5a1620"), colP = new Color("#4a2878"), tmp = new Color();
  const put = (k, x, y, z, s) => { const o = k * 16; M[o] = s; M[o + 1] = 0; M[o + 2] = 0; M[o + 3] = 0; M[o + 4] = 0; M[o + 5] = s; M[o + 6] = 0; M[o + 7] = 0; M[o + 8] = 0; M[o + 9] = 0; M[o + 10] = s; M[o + 11] = 0; M[o + 12] = x; M[o + 13] = y; M[o + 14] = z; M[o + 15] = 1; };

  return {
    group,
    update(ts, cue, T) {
      const tS = T.tS;
      for (let i = 0; i < n; i++) {
        const u = clamp01((ts - tS - 0.03 * i) / 0.85);
        const appear = clamp01((ts - i * 0.035) / 0.35), e = sm(0, 1, appear);
        for (let j = 0; j < n; j++) {
          const k = i * n + j, diag = i === j;
          if (cleared[k] || e <= 0) { put(k, 0, -9, 0, 0); continue; }
          let x = cellX(j), y = FLOOR.cy + (e - 1) * 0.06 + j * 0.0003, z = cellZ(i), s = e;
          if (u > 0) {
            x += (cellX(i) - cellX(j)) * sm(0, 1, u);
            if (!diag) s *= 1 - sm(0.72, 1, u);
            else {
              const g = sm(0.5, 1, u);
              y += FLOOR.h * g; s *= 1 + 0.45 * g;
              s *= 1 - clamp01((ts - TREE_DEPART(T, i)) / 0.15);                 // hands over to the tree
            }
          }
          put(k, x, y, z, s);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      // glow: pulse f36..f72 on the diagonal, then the slide lights it up
      const pulse = ts > 1.5 && ts < 3.0 ? 0.7 * (0.5 + 0.5 * Math.sin((ts - 1.5) * Math.PI * 2 * 1.2)) : 0;
      U.glow.value = Math.max(pulse, sm(tS, tS + 1.5, ts));
      U.edge.value = sm(1.45, 1.6, ts);
      U.cellOn.value = sm(0.1, 1.1, ts) * (1 - sm(tS + 0.2, tS + 1.5, ts));
      hull.userData.mat.uniforms.uPx.value = cue.law === "wide" ? 1.5 : 2.5;
      tmp.lerpColors(colV, colP, sm(T.tc - 0.05, T.tc + 0.3, ts));               // violet outline shift at the crack
      hull.userData.mat.uniforms.uCol.value.copy(tmp);
    },
    dispose() { geo.dispose(); mat.dispose(); hull.userData.mat.dispose(); },
  };
}
