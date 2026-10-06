// spawn-seal WORLD: the HOME set (shot 12, 29.3 s): "the island returns". Open ground at the spawn statue under the dusk, the pool and the
// plinth unchanged, hills of painted grass, a ring of cel trees and boulders, painted mountain ranges all round. Static art, layer 0.
//
// GRASS SHADER (maths), q = P.xz:
//   cell = floor(q * 3.2); h = hash(cell); tuft = step(0.55, fract(h * 7 + 0.35 * q.x - 0.2 * q.y))      painted blade strokes, hard
//   col = mix(#4c8a30, #7fb840, tuft); patches where fbm-free value noise v(q * 0.25) > 0.62 go #2e5a2a (shade); lit side-glow (the dusk key from -z)
//   plaza: r < 7.2 is paved #5a669a with tile seams (|fract(q * 0.8) - 0.5| > 0.46 -> #3e4a7a), a 0.25 m darker ring at r in [7.0, 7.2]
// DUSK CEL (trees, boulders): lum = dot(N, Ldusk) * 0.5 + 0.5, tone = step(0.52, lum), rim = step(0.85, lum); creases inked #0b1450... (ink #16301c for foliage)
import { CircleGeometry, Color, CylinderGeometry, DoubleSide, IcosahedronGeometry, Mesh, ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { boulder } from "../../../kit3d.js";
import { C, SHARED_GLSL, V } from "./common.js";
import { facet } from "./cave.js";
import { RIDGE_CARD } from "./plates.js";

function celMaterial(S) {
  return new ShaderMaterial({
    side: DoubleSide, uniforms: { ...S.U },
    vertexShader: `attribute vec3 aBary, aEdge, aCol, aSh; varying vec3 vP, vBary, vEdge, vCol, vSh;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; vBary = aBary; vEdge = aEdge; vCol = aCol; vSh = aSh; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vP, vBary, vEdge, vCol, vSh; ${SHARED_GLSL}
      void main() {
        vec3 N = normalize(cross(dFdx(vP), dFdy(vP)));
        if (dot(N, normalize(cameraPosition - vP)) < 0.0) N = -N;
        float lum = dot(N, normalize(vec3(-0.35, 0.45, -0.8))) * 0.5 + 0.5;
        vec3 col = mix(vSh, vCol, step(0.52, lum));
        col = mix(col, ${V("#ffd27a")}, step(0.85, lum) * 0.35);
        vec3 b = vBary + (1.0 - vEdge) * 9.0;
        float d = min(b.x, min(b.y, b.z)), w = fwidth(d);
        col = mix(col, ${V("#16301c")}, 1.0 - smoothstep(w * 1.0, w * 1.6, d));
        gl_FragColor = vec4(worldFinish(col, vP), 0.40);
      }`,
  });
}

export function buildIsland(ctx, S) {
  const { THREE } = ctx;
  const R = ctx.rng(47), group = new THREE.Group(), geos = [];

  const grassGeo = new CircleGeometry(120, 72).rotateX(-Math.PI / 2).translate(0, S.gy - 0.02, 0);
  const grass = new ShaderMaterial({
    uniforms: { ...S.U },
    vertexShader: "varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `varying vec3 vP; ${SHARED_GLSL}
      float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnz(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), f.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        vec2 q = vP.xz; float r = length(q);
        vec2 cell = floor(q * 3.2); float h = h1(cell);
        float tuft = step(0.55, fract(h * 7.0 + 0.35 * q.x - 0.2 * q.y));
        vec3 col = mix(${V("#4c8a30")}, ${V("#7fb840")}, tuft);
        col = mix(col, ${V("#2e5a2a")}, step(0.62, vnz(q * 0.25)));
        col = mix(col, ${V("#b6d85a")}, step(0.8, h) * step(0.5, vnz(q * 0.6 + 4.0)) * 0.6);
        float side = smoothstep(0.0, -40.0, q.y) * 0.25;
        col = mix(col, ${V("#ffd27a")}, side * tuft);
        vec2 f = abs(fract(q * 0.8) - 0.5);
        vec3 plaza = mix(${V("#5a669a")}, ${V("#7f8ab8")}, step(0.5, h1(floor(q * 0.8))));
        plaza = mix(plaza, ${V("#3e4a7a")}, step(0.46, max(f.x, f.y)));
        col = mix(col, plaza, step(r, 7.2));
        col = mix(col, ${V("#283058")}, step(7.0, r) * step(r, 7.2));
        gl_FragColor = vec4(worldFinish(col, vP), 0.2);
      }`,
  });
  const gm = new Mesh(grassGeo, grass); gm.frustumCulled = false; group.add(gm);

  const cel = celMaterial(S);
  const trees = [], stones = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + (R() - 0.5) * 0.25, r = 18 + R() * 26, x = Math.sin(a) * r, z = Math.cos(a) * r, s = 0.8 + R() * 0.8;
    const trunk = new CylinderGeometry(0.22 * s, 0.34 * s, 3.2 * s, 6, 1).translate(x, S.gy + 1.6 * s, z);
    trunk.deleteAttribute("uv");
    const tg = facet(trunk, () => ({ c: new Color("#6a4a2a"), s: new Color("#3a2a1a") }));
    trees.push(tg);
    for (let k = 0; k < 3; k++) {
      const c = new IcosahedronGeometry((1.5 - 0.25 * k) * s, 1).translate(x + (R() - 0.5) * 0.8 * s, S.gy + (3.4 + k * 1.1) * s, z + (R() - 0.5) * 0.8 * s);
      c.deleteAttribute("uv");
      const hex = ["#7fb840", "#4c8a30", "#b6d85a"][Math.floor(R() * 3)];
      trees.push(facet(c, (cc, n) => ({ c: new Color(n.y > 0.3 ? "#b6d85a" : hex), s: new Color("#2e5a2a").lerp(new Color("#16301c"), 0.3) })));
    }
  }
  for (let i = 0; i < 40; i++) {
    const a = R() * Math.PI * 2, r = 9 + R() * 45, s = 0.3 + R() * 0.9;
    stones.push(facet(boulder([s * 1.3, s * 0.85, s], [Math.sin(a) * r, S.gy + s * 0.25, Math.cos(a) * r], 700 + i), (c, n) => ({ c: new Color(n.y > 0.4 ? C.stoneLit : C.stoneMid), s: new Color(C.stoneSh) })));
  }
  const add = (list) => { const g = mergeGeometries(list); geos.push(g); const m = new Mesh(g, cel); m.frustumCulled = false; group.add(m); };
  add(trees); add(stones);

  // the mountain ring: one baked card, six clones facing the centre
  const card = ctx.bake.card(RIDGE_CARD, { w: 1024, h: 512, size: [160, 42], id: 0.5 });
  const cards = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, m = i === 0 ? card : card.clone();
    m.position.set(Math.sin(a) * 108, S.gy + 14, Math.cos(a) * 108); m.rotation.y = a + Math.PI; m.frustumCulled = false;
    group.add(m); cards.push(m);
  }
  return { group, dispose() { geos.forEach((g) => g.dispose()); grassGeo.dispose(); grass.dispose(); cel.dispose(); card.userData.dispose?.(); } };
}
