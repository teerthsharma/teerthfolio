// BARARAQ SAIQA, the mega-bolt (bible 3.14, 3.19, 6). Layer 1.
//
// Anatomy (frame 01): a thick white core (30 px at 1280x720), a cyan edge 8 px each side, a #2a7fe8 glow at 30 percent, an angular zig of
// 5-8 segments, acute branches. Three jitter seeds cycle on threes (3 frames at 24 fps = 8 Hz). Colours flip #8fd8ff / #cfe6ff -> #fff2c0 at the tear.
//
//   knots      K_0 = a, K_n = b, K_i = lerp(a, b, i/n) + s_i * J * perp_i,  s_i = +-1 alternating, perp_i a random unit vector orthogonal to (b - a).
//              Linear segments between knots, so the zig is angular, never smooth.
//   grow       the polyline is sampled on [0, g] with g = clamp(tau / 0.2): the stroke runs from its start to its end in 0.2 s.
//   envelope   a(tau) = 1 for tau in [0.2, 0.7], then 1 - (tau - 0.7) / 0.4 to 0 at 1.1 s.   (0.2 grow, 0.5 hold, 0.4 fade)
//   order      cultist strike i lands after floor(i / 2) * 2 frames: the two nearest the palace axis first (frame 154), then two every 2 frames.
//   wash       a hard-edged 3-band disc on the terrace, additive, never above 0.40 alpha (L8), the seal's footprint masked out.
//   sparks     12 frames of blue diamonds off every cultist hit, gravity 9 m/s^2.
// Cue names: "bolt" (start time, default 6.4). The seal is behind nothing here: depth test is on, so a bolt behind the seal is occluded by it.
import { RibbonBatch, mat, sstep, clamp01, lerp, SparkField, hash3 } from "./lib.js";

const N_PTS = 22;
const sample = (K, u) => {
  const f = clamp01(u) * (K.length - 1), i = Math.min(K.length - 2, Math.floor(f)), r = f - i, a = K[i], b = K[i + 1];
  return [lerp(a[0], b[0], r), lerp(a[1], b[1], r), lerp(a[2], b[2], r)];
};

export default function makeBolt(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "bolt";
  const R = ctx.rng("mono-bolt");
  const tb = T.one("bolt", 6.4) + 1 / 24; // one frame after the inverted impact frame
  const C = (h) => new THREE.Color(h);

  // ---- stroke construction (3 seeds each) ----
  const zig = (a, b, n, J) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dl = Math.hypot(...d) || 1, e = d.map((x) => x / dl);
    const K = [a];
    for (let i = 1; i < n; i++) {
      let p = [R() - 0.5, R() - 0.5, R() - 0.5]; const dot = p[0] * e[0] + p[1] * e[1] + p[2] * e[2];
      p = p.map((x, k) => x - dot * e[k]); const pl = Math.hypot(...p) || 1; const s = (i % 2 ? 1 : -1) * J * (0.55 + 0.9 * R());
      K.push([lerp(a[0], b[0], i / n) + (p[0] / pl) * s, lerp(a[1], b[1], i / n) + (p[1] / pl) * s, lerp(a[2], b[2], i / n) + (p[2] / pl) * s]);
    }
    K.push(b); return K;
  };
  const V = L.vortex, P = L.palace;
  const top = [V[0], V[1] - 1.5, V[2]];
  const strokes = [];
  const mk = (a, b, n, J, delay, batch) => strokes.push({ v: [0, 1, 2].map(() => zig(a, b, n, J)), delay, batch, a, b });
  // main trunk: vortex -> palace roofline, 8 knots
  mk(top, P, 8, 3.2, 0, "main");
  // sheets across the cloud deck (outward from the vortex, alternating sides)
  mk([V[0], V[1] + 0.5, V[2]], [V[0] - 26, V[1] + 0.4, V[2] - 6], 7, 1.6, 0.04, "main");
  mk([V[0], V[1] + 0.3, V[2]], [V[0] + 24, V[1] + 0.7, V[2] - 9], 7, 1.6, 0.06, "main");
  mk([V[0], V[1] - 0.4, V[2] + 1], [V[0] - 12, V[1] - 0.2, V[2] + 14], 6, 1.4, 0.1, "main");
  // cultist strikes ordered by distance from the palace axis (x), nearest first
  const order = L.cultists.map((c, i) => ({ c, i })).sort((p, q) => Math.abs(p.c[0] - P[0]) - Math.abs(q.c[0] - P[0]));
  order.forEach(({ c }, rank) => { const dly = Math.floor(rank / 2) * (2 / 24); mk(top, c, 6, 1.5, dly, "minor"); strokes[strokes.length - 1].hit = c; strokes[strokes.length - 1].rank = rank; });
  // acute branches off the trunk
  for (let j = 0; j < 5; j++) {
    const base = sample(strokes[0].v[0], 0.2 + 0.14 * j), end = [base[0] + (j % 2 ? 1 : -1) * (5 + 6 * R()), base[1] - 4 - 5 * R(), base[2] + (R() - 0.5) * 8];
    mk(base, end, 5, 1.1, 0.03 + 0.02 * j, "minor");
  }

  const mainN = strokes.filter((s) => s.batch === "main").length, minorN = strokes.filter((s) => s.batch === "minor").length;
  const main = new RibbonBatch(THREE, sh, mainN, N_PTS), minor = new RibbonBatch(THREE, sh, minorN, N_PTS);
  const mi = { main: 0, minor: 0 }; for (const s of strokes) s.rib = mi[s.batch]++;
  // 3 passes per batch: glow (soft, wide), cyan edge (+8 px each side), white core. Order: glow, edge, core.
  const px = { main: 30, minor: 12 };
  const passes = [];
  for (const [name, B] of [["main", main], ["minor", minor]]) {
    const w = px[name];
    const glow = B.pass({ col: "#2a7fe8", px: w * 2.4, a: 0.3, hdr: 1.6, soft: 1, add: true, taper: 0.7, order: 4 });
    const edge = B.pass({ col: "#8fd8ff", px: w + 16, a: 1, hdr: 1.8, add: true, taper: 1, order: 5 });
    const core = B.pass({ col: "#ffffff", px: w, a: 1, hdr: 2.4, add: false, taper: 1, order: 6 });
    group.add(glow, edge, core); passes.push({ glow, edge, core });
  }

  // ---- terrace wash: hard bands, additive, seal footprint masked ----
  const washFs = /* glsl */ `
    uniform float uA; uniform vec2 uCenterXZ; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec2 uSealXZ; uniform float uSealR; varying vec2 vUv;
    void main() {
      float r = length(vUv);
      // hard 3-band disc: core <.22, mid <.55, rim <1 ; each a flat colour, edges anti-aliased by fwidth
      float fw = fwidth(r) + 1e-4;
      float b0 = 1. - smoothstep(.22 - fw, .22, r), b1 = 1. - smoothstep(.55 - fw, .55, r), b2 = 1. - smoothstep(1. - fw, 1., r);
      vec3 col = uC2 * (b2 - b1) * .55 + uC1 * (b1 - b0) * .8 + uC0 * b0;
      float al = b2 * uA;
      float ds = length(uCenterXZ + vec2(vUv.x, -vUv.y) * 14. - uSealXZ);   // metres from the seal's feet
      al *= smoothstep(uSealR * .9, uSealR * 1.4, ds);
      if (al < .004) discard;
      gl_FragColor = vec4(col, al);
    }`;
  const wu = { uA: { value: 0 }, uC0: { value: C("#cfe6ff") }, uC1: { value: C("#8fd8ff") }, uC2: { value: C("#2a7fe8") }, uSealXZ: { value: new THREE.Vector2(L.at[0], L.at[2]) }, uCenterXZ: { value: new THREE.Vector2(L.at[0], L.at[2] - 4) }, uSealR: { value: 0.6 * L.scale } };
  const washM = mat(THREE, { vs: `varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fs: washFs, u: wu, add: true });
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), washM);
  wash.rotation.x = -Math.PI / 2; wash.scale.setScalar(14); wash.position.set(L.at[0], L.floorY + 0.04, L.at[2] - 4); wash.frustumCulled = false; wash.renderOrder = 2; wash.visible = false;
  group.add(wash);

  // ---- blue sparks on every hit (12 frames = 0.5 s) ----
  const nSp = L.cultists.length * 12, sp = new SparkField(THREE, sh, nSp, { g: 9, add: false, order: 7 });
  strokes.filter((s) => s.hit).forEach((s) => {
    for (let j = 0; j < 12; j++) {
      const i = s.rank * 12 + j, a = hash3(i, 1) * 6.283, up = 2.5 + 4 * hash3(i, 2), out = 1 + 2.5 * hash3(i, 3);
      sp.setP(i, s.hit, [Math.cos(a) * out, up, Math.sin(a) * out], j % 3 ? "#7fd8ff" : "#ffffff", tb + s.delay + 0.2, 0.5, 5 + 3 * hash3(i, 4), i);
    }
  });
  sp.commit(); group.add(sp.mesh);

  const cEdgeA = C("#8fd8ff"), cEdgeB = C("#fff2c0"), cGlowA = C("#2a7fe8"), cGlowB = C("#ffd36a");
  const tmp = new THREE.Color();
  return {
    group,
    update(t, dt, cue) {
      const seed = Math.floor(cue.t * 8) % 3; // threes
      const tau0 = cue.t - tb;
      const live = tau0 > -0.01 && tau0 < 1.35;
      group.visible = live; if (!live) { wash.visible = false; return; }
      const flip = sstep(0.12, 0.42, tau0); // cyan-white -> #fff2c0 at the tear
      for (const p of passes) {
        p.edge.userData.u.uCol.value.copy(tmp.copy(cEdgeA).lerp(cEdgeB, flip));
        p.glow.userData.u.uCol.value.copy(tmp.copy(cGlowA).lerp(cGlowB, flip));
      }
      for (const s of strokes) {
        const tau = cue.t - (tb + s.delay);
        const B = s.batch === "main" ? main : minor;
        if (tau < 0 || tau > 1.1) { B.hideRib(s.rib); continue; }
        const g = clamp01(tau / 0.2), a = tau < 0.7 ? 1 : 1 - (tau - 0.7) / 0.4;
        const K = s.v[seed], pts = new Array(N_PTS * 3);
        for (let i = 0; i < N_PTS; i++) { const q = sample(K, (i / (N_PTS - 1)) * g); pts[i * 3] = q[0]; pts[i * 3 + 1] = q[1]; pts[i * 3 + 2] = q[2]; }
        B.set(s.rib, pts, clamp01(a));
      }
      main.commit(); minor.commit();
      // wash: starts with the trunk, same envelope, cyan-white then gold
      const wa = tau0 < 0 ? 0 : tau0 < 0.2 ? tau0 / 0.2 : tau0 < 0.7 ? 1 : clamp01(1 - (tau0 - 0.7) / 0.4);
      wash.visible = wa > 0.01; wu.uA.value = 0.4 * wa;
      wu.uC0.value.set("#cfe6ff").lerp(tmp.set("#fff2c0"), flip); wu.uC1.value.set("#8fd8ff").lerp(tmp.set("#ffe9a0"), flip);
      sp.u.uT.value = cue.t * 1; sp.u.uOn.value = 1;
    },
    dispose() { main.dispose(); minor.dispose(); sp.dispose(); washM.dispose(); wash.geometry.dispose(); },
  };
}
