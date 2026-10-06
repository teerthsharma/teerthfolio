// BLOCKS for the Kamino avenue (bible 3 "Kamino ruined street"): the black blocks with grid windows, the roofs, the two blocks the
// Detroit Smash wrecks, the end caps and the far skyline.
// Frame: seal-local metres (x right, z forward = toward the crater), the group is turned by the seal's yaw by index.js.
// Layout: the avenue is 14 m of road + 3 m of pavement each side, faces stand at x = +-9.5 (FX), 120 m long (z -60..60).
//   FILL: blocks are drawn as FACADES (a painted cutout card on the avenue face) over a cheap box (Rule 7: facades, not buildings).
//   per side a run of variants is laid from the far end to the wreck zone, then from the wreck zone to the other end, 1.2 + rnd 2.5 m apart.
// THE WRECK (layer 1, pure function of the time since the smash, tc):
//   0 .. 0.35 s   the intact block shakes: offset = 0.35 (1 - tc/0.35) sin(61 tc) m on x, a 1.2 degree roll
//   0.35 s        hard cut to the RUIN (a broken card 10-11 m high, a low box, a rubble heap that scales 0.2 -> 1 over 0.3 s)
//   chunks (10)   thrown from the strike point S = (0, 0, 7): v = (dir_xz * (6 + 8 rnd), 7 + 8 rnd), y(t) = y0 + vy t - 4.9 t^2 until it lands,
//                 each tumbling at +-(1..4) rad/s; the landing time is the positive root of y(t) = r
//   dust (5)      OVER-blended cel puffs, size 3 -> 16 m over 1.8 s, alpha 0.8 (1 - smooth(0.8, 2.6 s)), #a37952 lit / #4a3a40 shade
import { BoxGeometry, CylinderGeometry, Group, Mesh, PlaneGeometry, ShaderMaterial, Color } from "three";
import { boulder, rng as krng } from "../../../kit3d.js";
import { C } from "./palette.js";
import { V, OVER, sm, lerp, mergeSolid, solid, faceCamera } from "./lib.js";
import { VARIANTS, facadeGLSL, minTop } from "./facade.js";

const FX = 9.5, DEPTH = 10;
const TOOLS = ["noise", "cel", "grunge"];
const STRIKE = [0, 0, 7];

export function buildBlocks(ctx) {
  const { THREE, engine } = ctx;
  const R = ctx.rng(46539);
  const group = new Group(), own = [], roofs = [];
  const cards = {};
  // bake every facade variant once (a card per variant, shared by every building that uses it)
  for (const [k, v] of Object.entries(VARIANTS)) {
    const card = ctx.bake.card(facadeGLSL(v), { w: Math.round(v.W * 34), h: Math.round(v.H * 34), size: [v.W, v.H], tools: TOOLS, id: 0.55 });
    cards[k] = card; own.push(card);
  }
  const faceCard = (k, side) => {
    const m = new Mesh(cards[k].geometry, cards[k].material);
    m.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    m.position.set(side * (FX - 0.03), VARIANTS[k].H / 2, 0);
    m.frustumCulled = false;
    return m;
  };

  // ---- static runs (layer 0)
  const boxes = [], coping = [], huts = [];
  const place = (side, k, zc) => {
    const v = VARIANTS[k];
    const h = minTop(v) - 0.05;
    boxes.push(new BoxGeometry(DEPTH, h, v.W).translate(side * (FX + DEPTH / 2), h / 2, zc));
    const c = faceCard(k, side); c.position.z = zc; group.add(c);
    if (!v.amp) {            // intact: coping, a hut, a tank, an antenna
      coping.push(new BoxGeometry(DEPTH, 0.5, v.W + 0.4).translate(side * (FX + DEPTH / 2), v.H + 0.25, zc));
      huts.push(new BoxGeometry(2.6, 2.2, 3.2).translate(side * (FX + DEPTH - 2), v.H + 1.1, zc + (R() - 0.5) * (v.W - 5)));
      if (R() > 0.5) huts.push(new CylinderGeometry(1.1, 1.1, 2.4, 10).translate(side * (FX + 3), v.H + 1.7, zc + (R() - 0.5) * (v.W - 4)));
      huts.push(new BoxGeometry(0.12, 5, 0.12).translate(side * (FX + 5), v.H + 3, zc + (R() - 0.5) * (v.W - 3)));
      if (v.H <= 24) roofs.push([side * (FX + 1.1), v.H + 0.5, zc, side]);   // low roofs the cheering civilians stand on
    }
  };
  const fill = (side, seq, z, zEnd) => {
    let i = 0;
    for (;;) {
      const k = seq[i++ % seq.length], v = VARIANTS[k];
      if (z + v.W > zEnd) break;
      place(side, k, z + v.W / 2);
      z += v.W + 1.2 + R() * 2.5;
    }
  };
  fill(-1, ["E", "B", "G", "D", "F", "A"], -58, 2.5);
  fill(-1, ["B", "F", "D", "E", "G"], 16.4, 58);
  fill(1, ["D", "G", "B", "F", "E"], -58, -5.5);
  fill(1, ["E", "F", "C", "D", "B", "G"], 11.4, 58);

  // end caps: a wall across each end of the avenue (x = -10 and +10), two bays of E each
  for (const [z, ry] of [[-64, 0], [64, Math.PI]]) for (const x of [-10.5, 10.5]) {
    boxes.push(new BoxGeometry(20, 26, DEPTH).translate(x, 13, z + (z < 0 ? -DEPTH / 2 : DEPTH / 2)));
    const c = new Mesh(cards.E.geometry, cards.E.material); c.rotation.y = ry; c.position.set(x, 14, z); c.frustumCulled = false; group.add(c);
  }
  group.add(mergeSolid(engine, boxes, C.wallD, "#05020a", 0.55, "blocks"));
  group.add(mergeSolid(engine, coping, C.wallL, C.wallD, 0.56, "coping"));
  group.add(mergeSolid(engine, huts, C.wall, C.wallD, 0.57, "huts"));

  // ---- the two wrecked blocks (layer 1): intact -> shake -> ruin
  const wreck = [];
  const mkWreck = (side, kIntact, kRuin, zc) => {
    const vi = VARIANTS[kIntact], vr = VARIANTS[kRuin];
    const g = new Group(); g.position.set(0, 0, zc);
    const intact = new Group();
    const box = solid(engine, new BoxGeometry(DEPTH, vi.H - 0.1, vi.W), C.wallD, "#05020a", 0.55);
    box.position.set(side * (FX + DEPTH / 2), (vi.H - 0.1) / 2, 0);
    intact.add(box);
    const ci = faceCard(kIntact, side); intact.add(ci);
    const cop = solid(engine, new BoxGeometry(DEPTH, 0.5, vi.W + 0.4), C.wallL, C.wallD, 0.56); cop.position.set(side * (FX + DEPTH / 2), vi.H + 0.25, 0); intact.add(cop);
    const ruin = new Group(); ruin.visible = false;
    const rh = minTop(vr) - 0.05;
    const rbox = solid(engine, new BoxGeometry(DEPTH, rh, vr.W), C.wallD, "#05020a", 0.55); rbox.position.set(side * (FX + DEPTH / 2), rh / 2, 0); ruin.add(rbox);
    const cr = faceCard(kRuin, side); ruin.add(cr);
    // rubble heap spilling across the pavement toward the road
    const heapG = [];
    const hr = krng(zc * 31 + 7);
    for (let i = 0; i < 9; i++) { const s = 1.4 + hr() * 2.0; heapG.push(boulder([s * 1.3, s * 0.8, s], [side * (FX - 1.5 - hr() * 4.5), 0.3 + hr() * 0.5, (hr() - 0.5) * (vi.W - 2)], zc + i, 3.2)); }
    const heap = mergeSolid(engine, heapG, C.rubMid, C.rubShade, 0.52, "heap"); heap.userData.layer = 1;
    const heapHolder = new Group(); heapHolder.add(heap); ruin.add(heapHolder);
    g.add(intact, ruin);
    g.traverse((o) => { o.userData.layer = 1; });
    group.add(g);
    // 10 chunks, one shared painted unit box
    const chunkMesh = solid(engine, new BoxGeometry(1, 1, 1), C.rubMid, C.rubShade, 0.53);
    const chunks = [];
    for (let i = 0; i < 10; i++) {
      const m = chunkMesh.clone(); m.userData.layer = 1; m.visible = false; m.frustumCulled = false; group.add(m);
      const p0 = [side * (FX - 0.5 + R() * 2), 3 + R() * (vi.H * 0.7), zc + (R() - 0.5) * vi.W];
      const dir = [p0[0] - STRIKE[0], p0[2] - STRIKE[2]], dl = Math.hypot(dir[0], dir[1]) || 1;
      const sp = 6 + R() * 8, vy = 7 + R() * 8, r = 0.5 + R() * 1.1;
      const vx = (dir[0] / dl) * sp + side * 3.0, vz = (dir[1] / dl) * sp;     // thrown out across the road and along it
      const tLand = (vy + Math.sqrt(vy * vy + 19.6 * Math.max(0, p0[1] - r))) / 9.8;
      chunks.push({ m, p0, v: [vx, vy, vz], r, tLand, spin: [(R() - 0.5) * 8, (R() - 0.5) * 8, (R() - 0.5) * 8], sc: [r * (1.2 + R()), r * (0.8 + R()), r * (1.2 + R())] });
    }
    // dust puffs
    const dust = [];
    for (let i = 0; i < 5; i++) {
      const m = dustCard(R() * 9); m.userData.layer = 1; m.visible = false; group.add(m); faceCamera(m); own.push({ userData: { dispose: () => { m.geometry.dispose(); m.material.dispose(); } } });
      dust.push({ m, p: [side * (FX - 2 - R() * 5), 2 + R() * 9, zc + (R() - 0.5) * vi.W], k: 0.8 + R() * 0.5 });
    }
    wreck.push({ side, zc, g, intact, ruin, heapHolder, chunks, dust, chunkMesh });
  };
  mkWreck(-1, "C", "R1", 9);
  mkWreck(1, "A", "R2", 3);

  // ---- far skyline: 8 cards in a ring, two ranks of towers lit from below, 180 x 61.5 m
  const SKY = `
  vec4 paint(vec2 p) {
    vec2 m = vec2(p.x / uAsp * 180.0, p.y * 61.5);
    float hFar = 22.0 + 26.0 * h21(vec2(floor(m.x / 9.0), 3.0)) + 6.0 * vn(vec2(m.x * 0.2, 1.0));
    float hNear = 10.0 + 22.0 * h21(vec2(floor(m.x / 14.0), 8.0));
    float inFar = step(m.y, hFar), inNear = step(m.y, hNear);
    if (inFar + inNear < 0.5) return vec4(0.0);
    float glowK = 1.0 - smoothstep(0.0, 24.0, m.y);
    vec3 farC = mix(${V(C.navy)}, ${V("#3a1820")}, celStep(glowK, 0.5 + 0.2 * vn(vec2(m.x * 0.3, 2.0))));
    farC = mix(farC, ${V(C.fireHole)} * 0.7, celStep(glowK, 0.82));
    vec3 nearC = mix(${V(C.navyD)}, ${V("#2a1018")}, celStep(glowK, 0.58));
    nearC = mix(nearC, ${V(C.flash)}, celStep(glowK, 0.88));
    vec2 g = vec2(m.x / 1.8, m.y / 2.6); vec2 gi = floor(g), gf = fract(g);
    float win = step(0.25, gf.x) * step(gf.x, 0.75) * step(0.3, gf.y) * step(gf.y, 0.7) * step(0.88, h21(gi + 5.0));
    nearC = mix(nearC, ${V(C.winLit)} * 0.9, win * inNear);
    vec3 col = inNear > 0.5 ? nearC : farC;
    return vec4(col, 1.0);
  }`;
  const skyCard = ctx.bake.card(SKY, { w: 2048, h: 700, size: [180, 61.5], tools: TOOLS, id: 0.5 }); own.push(skyCard);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2, r = 215;
    const m = new Mesh(skyCard.geometry, skyCard.material);
    m.position.set(Math.sin(a) * r, 30, Math.cos(a) * r);
    m.rotation.y = Math.atan2(-Math.sin(a), -Math.cos(a));    // face the centre
    m.frustumCulled = false; group.add(m);
  }

  // ---- smoke plumes (cel cutouts, billboards) rising behind the blocks
  const SMOKE = (seed) => `
  vec4 paint(vec2 p) {
    vec2 m = vec2(p.x / uAsp * 24.0, p.y * 70.0);
    float cx = 12.0 + 3.5 * sin(m.y * 0.12 + ${seed.toFixed(1)}) + 3.0 * (vn(vec2(m.y * 0.15, ${seed.toFixed(1)})) - 0.5) * 2.0;
    float wd = (3.0 + 7.0 * pow(m.y / 70.0, 0.6)) * smoothstep(70.0, 54.0, m.y);
    wd *= 1.0 + 0.35 * (fbm(vec2(m.y * 0.16, ${seed.toFixed(1)} + 4.0)) - 0.5) * 2.0;
    float d = abs(m.x - cx) - wd;
    d += 1.6 * (fbm(vec2(m.x * 0.5, m.y * 0.22 + ${seed.toFixed(1)})) - 0.5);       // scalloped billows
    if (d > 0.0) return vec4(0.0);
    float litK = 1.0 - m.y / 38.0 + 0.25 * (fbm(vec2(m.x * 0.3, m.y * 0.1)) - 0.5);
    vec3 col = cel3(litK, 0.15, 0.55, ${V(C.wallD)}, ${V(C.wall)}, ${V("#6a2a14")});
    col = mix(col, ${V(C.fireEdge)} * 0.55, celStep(litK, 0.92));
    col = mix(col, ${V(C.ink)}, 1.0 - smoothstep(0.0, 0.4, -d));
    return vec4(col, 1.0);
  }`;
  const smokeCards = [SMOKE(1.0), SMOKE(5.5)].map((s) => { const c = ctx.bake.card(s, { w: 384, h: 1120, size: [24, 70], tools: TOOLS, id: 0.5 }); own.push(c); return c; });
  [[-34, 30, -50], [36, 40, -20], [-38, 40, 25], [34, 30, 52], [-12, 60, 90], [14, 56, -90], [0, 40, 120]].forEach(([x, y, z], i) => {
    const c = smokeCards[i % 2], m = new Mesh(c.geometry, c.material);
    const s = 0.8 + (i % 3) * 0.25;
    m.scale.set(s, s, 1); m.position.set(x, y, z); m.frustumCulled = false; faceCamera(m); group.add(m);
  });

  const E1 = (x) => x * x * (3 - 2 * x);
  function update(ts, tSmash) {
    const tc = ts - tSmash;
    for (const w of wreck) {
      if (tc < 0) {
        w.intact.visible = true; w.ruin.visible = false; w.intact.position.set(0, 0, 0); w.intact.rotation.set(0, 0, 0);
        w.chunks.forEach((c) => { c.m.visible = false; }); w.dust.forEach((d) => { d.m.visible = false; });
        continue;
      }
      const shaking = tc < 0.35;
      w.intact.visible = shaking; w.ruin.visible = !shaking;
      if (shaking) {
        const k = 1 - tc / 0.35;
        w.intact.position.x = 0.35 * k * Math.sin(61 * tc) * w.side; w.intact.rotation.z = 0.021 * k * w.side * Math.sin(47 * tc);
      }
      const hs = lerp(0.2, 1, E1(Math.min(1, Math.max(0, (tc - 0.35) / 0.3))));
      w.heapHolder.scale.set(1, hs, 1);
      for (const c of w.chunks) {
        const t = Math.min(tc, c.tLand);
        c.m.visible = true;
        c.m.position.set(c.p0[0] + c.v[0] * t, Math.max(c.r * 0.5, c.p0[1] + c.v[1] * t - 4.9 * t * t), c.p0[2] + c.v[2] * t);
        c.m.rotation.set(c.spin[0] * t, c.spin[1] * t, c.spin[2] * t);
        c.m.scale.set(...c.sc);
      }
      for (const d of w.dust) {
        d.m.visible = tc < 2.8;
        const s = lerp(3, 16, sm(0, 1.8, tc)) * d.k;
        d.m.scale.set(s, s, 1);
        d.m.position.set(d.p[0], d.p[1] + 2.5 * sm(0, 2, tc), d.p[2]);
        d.m.material.uniforms.uA.value = 0.8 * (1 - sm(0.8, 2.6, tc));
      }
    }
  }
  return {
    group, roofs, update,
    dispose() {
      for (const o of own) o.userData?.dispose?.();
    },
  };
}

// a cel dust puff: two-tone fbm blob with a hard edge, soft overall alpha; billboarded by the caller
function dustCard(seed) {
  const m = new ShaderMaterial({
    ...OVER,
    uniforms: { uA: { value: 0.8 }, uLit: { value: new Color(C.rubLit) }, uShade: { value: new Color("#4a3a40") } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    // cover: ball r < 1 - 0.35 fbm; tone: lit where the shifted-down sample is smaller (underlit by fire), hard edge
    fragmentShader: `uniform float uA; uniform vec3 uLit; uniform vec3 uShade; varying vec2 vUv;
      float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fb(vec2 p) { return 0.55 * vn(p) + 0.3 * vn(p * 2.1 + 3.0) + 0.15 * vn(p * 4.3 + 7.0); }
      void main() { vec2 q = (vUv - 0.5) * 2.0; float n = fb(q * 2.4 + ${seed.toFixed(2)});
        float r = length(q) - (1.0 - 0.45 * n); if (r > 0.0) discard;
        float lit = step(0.5, fb(q * 2.4 + ${seed.toFixed(2)} + vec2(0.0, 0.25)) - n + 0.5 - q.y * 0.2);
        gl_FragColor = vec4(mix(uShade, uLit, lit), uA); }`,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), m);
  mesh.frustumCulled = false; mesh.renderOrder = 3;
  return mesh;
}
