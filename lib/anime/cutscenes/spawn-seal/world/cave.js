// spawn-seal WORLD: the Sealed Cave. Chiselled rock in flat facets (every shard hand-inked at its creases), pool light from
// below, hatch screen-tone in the shadow shards, strata lines, stalactites, rubble. One custom cel material for all rock.
//
// ROCK SHADER (maths):
//   N  = normalize(cross(dFdx(P), dFdy(P)))   facet normal from screen derivatives, flipped to face the camera
//   lp = uPool * max(N . Lpool, 0) / (1 + 0.006 d^2)     the pool is the key, lit from below (Lpool = to the pool light)
//   lg = uGold * max(N . Lmouth, 0) * exp(-d / 55)       the dusk glow from the arch (ignites with the Megiddo beams)
//   lum = 0.10 + 0.10 * (0.5 N.y + 0.5) + 1.6 lp + 0.9 lg
//   tone = step(0.30, lum)  (two-tone cel);  rim tone = step(0.78, lum) lifts to the edge highlight #4a5fa6
//   shadow shards (tone = 0): two crossed diagonal hatch families, line where |fract(k . P) - 0.5| < w   (cross-hatch tone)
//   ink: crease edges only (per-triangle crease flags, barycentric distance b_i + 9 (1 - crease_i) < 1.2 px * fwidth)
//   strata: thin dark line where |sin(4 y + 1.3 sin(0.7 x + 0.5 z))| < 0.07
import { BufferAttribute, Color, ConeGeometry, CylinderGeometry, DoubleSide, Mesh, RingGeometry, ShaderMaterial, Vector3 } from "three";
import { boulder, merge } from "../../../kit3d.js";
import { C, CEIL, MOUTH_H, MOUTH_W, POOL_R, SHARED_GLSL, V, WALL_R } from "./common.js";

// ---- facet geometry: flat triangles, crease flags, barycentric coordinates, two painted tones per face ----
export function facet(src, paintFn) {
  const g = src.index ? src.toNonIndexed() : src.clone();
  for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k);
  g.computeVertexNormals();
  const P = g.attributes.position, N = g.attributes.normal, T = P.count / 3;
  const key = (i) => `${Math.round(P.getX(i) * 200)},${Math.round(P.getY(i) * 200)},${Math.round(P.getZ(i) * 200)}`;
  const fn = new Float32Array(T * 3), edges = new Map();
  for (let t = 0; t < T; t++) {
    fn[t * 3] = N.getX(t * 3); fn[t * 3 + 1] = N.getY(t * 3); fn[t * 3 + 2] = N.getZ(t * 3);
    for (let e = 0; e < 3; e++) {
      const ka = key(t * 3 + ((e + 1) % 3)), kb = key(t * 3 + ((e + 2) % 3)), ek = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (!edges.has(ek)) edges.set(ek, []);
      edges.get(ek).push(t);
    }
  }
  const bary = new Float32Array(P.count * 3), edge = new Float32Array(P.count * 3), col = new Float32Array(P.count * 3), sh = new Float32Array(P.count * 3);
  for (let t = 0; t < T; t++) {
    const flags = [0, 0, 0];
    for (let e = 0; e < 3; e++) {
      const ka = key(t * 3 + ((e + 1) % 3)), kb = key(t * 3 + ((e + 2) % 3)), list = edges.get(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`);
      let crease = list.length < 2 ? 1 : 0;
      for (const o of list) if (o !== t && fn[o * 3] * fn[t * 3] + fn[o * 3 + 1] * fn[t * 3 + 1] + fn[o * 3 + 2] * fn[t * 3 + 2] < 0.965) crease = 1;
      flags[e] = crease;
    }
    const cx = (P.getX(t * 3) + P.getX(t * 3 + 1) + P.getX(t * 3 + 2)) / 3, cy = (P.getY(t * 3) + P.getY(t * 3 + 1) + P.getY(t * 3 + 2)) / 3, cz = (P.getZ(t * 3) + P.getZ(t * 3 + 1) + P.getZ(t * 3 + 2)) / 3;
    const pc = paintFn(new Vector3(cx, cy, cz), new Vector3(fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]), t);
    for (let v = 0; v < 3; v++) {
      const i = (t * 3 + v) * 3;
      bary[i + v] = 1;
      edge.set(flags, i);
      col.set([pc.c.r, pc.c.g, pc.c.b], i); sh.set([pc.s.r, pc.s.g, pc.s.b], i);
    }
  }
  g.setAttribute("aBary", new BufferAttribute(bary, 3)); g.setAttribute("aEdge", new BufferAttribute(edge, 3));
  g.setAttribute("aCol", new BufferAttribute(col, 3)); g.setAttribute("aSh", new BufferAttribute(sh, 3));
  return g;
}

export function rockMaterial(U) {
  return new ShaderMaterial({
    side: DoubleSide, uniforms: { ...U },
    vertexShader: `attribute vec3 aBary, aEdge, aCol, aSh; varying vec3 vP, vBary, vEdge, vCol, vSh;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vBary = aBary; vEdge = aEdge; vCol = aCol; vSh = aSh; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vP, vBary, vEdge, vCol, vSh; ${SHARED_GLSL}
      void main() {
        vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));
        vec3 Vd = normalize(cameraPosition - vP);
        if (dot(N, Vd) < 0.0) N = -N;
        vec3 Lp = uPoolPos - vP; float dp = length(Lp);
        float lp = uPool * max(dot(N, Lp / dp), 0.0) / (1.0 + 0.006 * dp * dp);
        vec3 Lg = uMouth - vP; float dg = length(Lg);
        float lg = uGold * max(dot(N, Lg / dg), 0.0) * exp(-dg / 55.0);
        float lum = 0.10 + 0.10 * (0.5 * N.y + 0.5) + 1.6 * lp + 0.9 * lg;
        float tone = step(0.30, lum);
        vec3 col = mix(vSh, vCol, tone);
        col = mix(col, ${V(C.under)}, clamp(lp * 1.4, 0.0, 1.0) * 0.45 * tone);
        col = mix(col, ${V("#ffb35a")} * 0.55, clamp(lg * 1.2, 0.0, 1.0) * 0.5 * tone);
        // cross-hatch screen tone in the shadow shards
        float h1 = abs(fract((vP.x + vP.y * 1.3 + vP.z * 0.7) * 5.0) - 0.5), h2 = abs(fract((vP.x * 0.8 - vP.y * 1.1 + vP.z) * 4.0) - 0.5);
        float hw = fwidth(vP.x + vP.y + vP.z) * 5.0;
        float hatch = (1.0 - tone) * max(1.0 - smoothstep(0.05, 0.05 + hw, h1), (1.0 - smoothstep(0.04, 0.04 + hw, h2)) * step(0.6, fract(vP.y * 0.9)));
        col = mix(col, ${V(C.crack)}, hatch * 0.75);
        // strata
        float st = abs(sin(vP.y * 4.0 + 1.3 * sin(vP.x * 0.7 + vP.z * 0.5)));
        col = mix(col, ${V(C.crack)}, (1.0 - smoothstep(0.07, 0.07 + fwidth(vP.y) * 8.0, st)) * 0.55);
        // inked crease edges (2 px) and a lit edge highlight on lit shards
        vec3 b = vBary + (1.0 - vEdge) * 9.0;
        float d = min(b.x, min(b.y, b.z)), w = fwidth(d);
        float ink = 1.0 - smoothstep(w * 1.0, w * 1.6, d);
        float hi = (1.0 - smoothstep(w * 2.4, w * 3.2, d)) * step(0.78, lum);
        col = mix(col, ${V(C.edge)}, hi * 0.8);
        col = mix(col, ${V(C.ink)}, ink);
        gl_FragColor = vec4(worldFinish(col, vP), 0.30);
      }`,
  });
}

const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const mixc = (a, b, k) => new Color(a).lerp(new Color(b), k);

// rock painter: three lit tones per face, overhang undersides lit by the pool, top faces in shadow
function rocky(kind, R) {
  const lit = [C.shardLit, "#232d6a", "#1f2862"];
  return (c, n) => {
    let base = new Color(kind === "ceil" ? C.ceil : lit[Math.floor(R() * 3)]);
    if (kind === "wall") base = mixc(C.wallMid, base, 0.5 + 0.5 * R());
    if (n.y < -0.35) base = mixc(base, C.under, 0.55);
    else if (n.y > 0.55) base = mixc(base, C.top, 0.65);
    return { c: base, s: mixc(base, C.abyss, 0.5) };
  };
}

export function buildCave(ctx, S, mat) {
  const { THREE } = ctx;
  const R = ctx.rng(11), gy = S.gy, group = new THREE.Group(), geos = [];
  const add = (geo, painter) => { const g = facet(geo, painter); geos.push(g); const m = new Mesh(g, mat); m.frustumCulled = false; group.add(m); return m; };
  const half = Math.asin(MOUTH_W / 2 / WALL_R);

  // wall: displaced cylinder shards (angular jitter per vertex row), the mouth gap left open at theta = pi (-z)
  const wallOf = (t0, len, y0, h, segW, segH) => {
    const g = new CylinderGeometry(WALL_R, WALL_R, h, segW, segH, true, t0, len);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), th = Math.atan2(x, z);
      const ix = Math.round(th / (Math.PI * 2) * segW), iy = Math.round((y + h / 2) / h * segH);
      const d = (hash2(ix, iy + y0 * 3) - 0.5) * 2.2 + 1.8 * Math.sin(th * 5.0 + y * 0.35) * Math.cos(th * 3.0 - y * 0.2);
      const rr = Math.hypot(x, z) + d;
      P.setXYZ(i, Math.sin(th) * rr, y + y0 + h / 2 + gy, Math.cos(th) * rr);
    }
    return g;
  };
  add(wallOf(Math.PI + half, Math.PI * 2 - 2 * half, 0, CEIL, 120, 24), rocky("wall", R));
  add(wallOf(Math.PI - half, 2 * half, MOUTH_H, CEIL - MOUTH_H, 10, 4), rocky("wall", R));

  // ceiling: a shallow ring displaced into shards
  const ce = new RingGeometry(0.05, WALL_R + 1.5, 72, 14).rotateX(Math.PI / 2);
  { const P = ce.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, gy + CEIL + 0.5 + (hash2(Math.round(P.getX(i) * 0.6), Math.round(P.getZ(i) * 0.6)) - 0.5) * 2.6 + 0.5 * Math.hypot(P.getX(i), P.getZ(i)) / WALL_R); }
  add(ce, rocky("ceil", R));

  // floor: flat near the pool, shard-bumped far from it
  const fl = new RingGeometry(POOL_R - 0.2, WALL_R + 1.5, 96, 22).rotateX(-Math.PI / 2);
  { const P = fl.attributes.position;
    for (let i = 0; i < P.count; i++) { const r = Math.hypot(P.getX(i), P.getZ(i)), k = Math.min(1, Math.max(0, (r - 8) / 6));
      P.setY(i, gy + k * (hash2(Math.round(P.getX(i) * 2.5), Math.round(P.getZ(i) * 2.5)) - 0.5) * 0.45); } }
  add(fl, rocky("floor", R));

  // stalactites 0.6 - 2.4 m, hanging from the ceiling
  const st = [];
  for (let i = 0; i < 170; i++) {
    const a = R() * Math.PI * 2, r = Math.sqrt(R()) * (WALL_R - 3), len = 0.6 + R() * R() * 1.8 + (R() > 0.93 ? 1.0 : 0), rad = 0.14 + len * 0.16 * (0.6 + R() * 0.6);
    st.push(new ConeGeometry(rad, len, 5 + Math.floor(R() * 2), 1).rotateX(Math.PI).rotateY(R() * 6).translate(Math.cos(a) * r, gy + CEIL + 0.3 - len / 2, Math.sin(a) * r));
  }
  add(merge(st, "stalactites"), rocky("wall", R));

  // rubble: shards 0.3 - 1.2 m piled at the wall foot and scattered on the floor (kept clear of the pool and the mouth)
  const rub = [];
  const place = (r0, r1, n, smin, smax) => {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, r = r0 + R() * (r1 - r0), x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (Math.abs(x) < MOUTH_W / 2 + 1 && z < -22) continue;
      const s = smin + R() * (smax - smin);
      rub.push(boulder([s * 1.3, s * 0.85, s], [x, gy + s * 0.2, z], rub.length + 3));
    }
  };
  place(30, 37, 110, 0.3, 1.2); place(9, 29, 46, 0.25, 0.8);
  for (let i = 0; i < 9; i++) rub.push(boulder([0.9, 1.5, 0.9], [(i % 2 ? 1 : -1) * (MOUTH_W / 2 + 0.4 + R()), gy + 0.6, -WALL_R + 1.2 + R()], 900 + i)); // jamb heaps
  add(merge(rub, "rubble"), rocky("floor", R));

  return { group, dispose() { geos.forEach((g) => g.dispose()); } };
}

// rim stones (0.25 m high ring) around the pool: always present
export function buildRim(ctx, S, mat) {
  const R = ctx.rng(23), parts = [];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + (R() - 0.5) * 0.05, r = POOL_R + 0.12;
    parts.push(boulder([0.62, 0.2, 0.42], [Math.sin(a) * r, S.gy, Math.cos(a) * r], 400 + i));
  }
  const g = facet(merge(parts, "rim"), (c, n) => ({ c: new Color(n.y > 0.5 ? C.stoneMid : C.stoneLit), s: new Color(C.stoneSh) }));
  const m = new Mesh(g, mat); m.frustumCulled = false;
  return { mesh: m, dispose() { g.dispose(); } };
}
