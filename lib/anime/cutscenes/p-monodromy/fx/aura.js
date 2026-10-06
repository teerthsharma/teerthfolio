// BAAL EQUIP AURA: the wreath (bible 3.19), the equip sheath, the gold ring vessels (easter egg 1). Layer 1.
//
// Wreath: 5 arcs of lightning swept HORIZONTALLY round the torso (frame 01), 2 px #7fd8ff over a 5 px soft edge, flicker on threes.
//   arc i:  r_i = (0.50 + 0.04 i) s,  y_i = chest.y + (i - 2) * 0.1 s,  theta(u) = phi_i + w_i * T3 + span_i * u,  u in [0, 1]
//           P(u) = chest + (r_i + j(u)) * (cos theta, 0, sin theta) + (0, y_i + 0.5 j(u), 0),  j = jag * (hash - 0.5) re-rolled every 3 frames
//   Each arc is hidden where it would pass in FRONT of the seal's disc (sealVis in the ribbon vertex shader): the seal is never covered.
// Equip sheath (1.9-3.1 s): 3 helices from the feet to the head, angle(u) = 4 pi u + phi, radius 0.56 s, revealed by g(k) = clamp(k * 1.4).
// Wreath intensity A(t): 0 until equip; equip peak 1; residual .35 until 4.9; charge .35 -> 1 by the strike; 1 -> 0 over 6.4 -> 7.4.
// Vessels: a gold torus (#e9b23a) on each flipper with a #7fd8ff halo at 0.9-1.5 s (Sinbad's metal vessels); at 4.9-6.3 the flippers rise and the
//   vessels gather a gold-white glow (halo mixes to #fff2c0), 4 sparks orbiting each.
// Cue names: "equip" (default 1.9, dur 1.2), "charge" (4.9, dur 1.5), "bolt" (6.4), "vessels" (0.9, dur 0.6).
import { RibbonBatch, bb, sstep, clamp01, hash3, lerp } from "./lib.js";

const NP = 14;
export default function makeAura(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "aura";
  const s = L.scale;
  const tE = T.one("equip", 1.9), dE = T.durOf("equip", 1.2), tC = T.one("charge", 4.9), tB = T.one("bolt", 6.4), tV = T.one("vessels", 0.9), dV = T.durOf("vessels", 0.6);
  const nArc = 5, nSpiral = 3;
  const B = new RibbonBatch(THREE, sh, nArc + nSpiral, NP, true);
  const edge = B.pass({ col: "#7fd8ff", px: 5, a: 0.7, hdr: 1.6, soft: 1, add: true, taper: 1, order: 6 });
  const core = B.pass({ col: "#ffffff", px: 2, a: 1, hdr: 2.2, add: false, taper: 1, order: 7 });
  group.add(edge, core);
  const chest = new THREE.Vector3(), pts = new Array(NP * 3);

  const intensity = (t) => {
    if (t < tE) return 0;
    if (t < tE + dE) return 1;
    if (t < tC) return lerp(0.35, 0.35, 0) + 0.65 * (1 - sstep(tE + dE, tE + dE + 0.5, t));
    if (t < tB) return 0.35 + 0.65 * sstep(tC, tB, t);
    return 1 - sstep(tB, tB + 1.0, t);
  };

  // ---- vessels ----
  const ringGeo = new THREE.TorusGeometry(0.12 * s, 0.026 * s, 8, 22);
  const ringMat = new THREE.MeshBasicMaterial({ color: "#e9b23a", toneMapped: false });
  const vessels = [-1, 1].map(() => { const m = new THREE.Mesh(ringGeo, ringMat); m.visible = false; group.add(m); return m; });
  const haloFs = /* glsl */ `
    uniform float uA; uniform vec3 uC; varying vec2 vUv;
    void main() { float r = length(vUv); float fw = fwidth(r) + 1e-4;
      float core = 1. - smoothstep(.34 - fw, .34, r), ring = (1. - smoothstep(.62 - fw, .62, r)) - (1. - smoothstep(.5 - fw, .5, r));
      float a = (core * .85 + ring * .5) * uA; if (a < .004) discard; gl_FragColor = vec4(mix(uC, vec3(1.), core * .5), a); }`;
  const halos = [0, 1].map(() => { const h = bb(THREE, sh, haloFs, { uA: { value: 0 }, uC: { value: new THREE.Color("#7fd8ff") } }, { add: true, push: 0.1, order: 8 }); h.userData.u.uSize.value.set(0.34 * s, 0.34 * s); group.add(h); return h; });
  const cyan = new THREE.Color("#7fd8ff"), goldW = new THREE.Color("#fff2c0");

  return {
    group,
    update(t, dt, cue) {
      ctx.seal.chest(chest);
      const yaw = ctx.seal.yaw ?? 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
      const A = intensity(cue.t), t3 = Math.floor(cue.t * 8) / 8, f3 = Math.floor(cue.t * 8);
      const on = A > 0.01;
      edge.visible = core.visible = on;
      if (on) {
        edge.userData.u.uA.value = 0.7 * A; core.userData.u.uA.value = A;
        // wreath arcs
        for (let i = 0; i < nArc; i++) {
          const r = (0.5 + 0.04 * i) * s, yy = chest.y + (i - 2) * 0.1 * s, phi = hash3(i, 7) * 6.283, w = (i % 2 ? -1 : 1) * (2.2 + 0.5 * i), span = 1.6 + 0.9 * hash3(i, 9);
          // visibility: arcs appear in staggered order during the charge, all present in the equip and the strike
          const vis = cue.t < tE + dE + 0.1 || cue.t >= tB - 0.6 ? 1 : (hash3(i, 3, f3 % 5) > 0.35 ? 1 : 0);
          for (let k = 0; k < NP; k++) {
            const u = k / (NP - 1), th = phi + w * t3 + span * u, jg = (hash3(i, k, f3) - 0.5) * 0.09 * s * (k === 0 || k === NP - 1 ? 0.2 : 1);
            const rr = r + jg;
            pts[k * 3] = chest.x + rr * Math.cos(th); pts[k * 3 + 1] = yy + jg * 0.6; pts[k * 3 + 2] = chest.z + rr * Math.sin(th);
          }
          if (vis) B.set(i, pts, 1); else B.hideRib(i);
        }
        // equip sheath: helices from feet to head, only during the equip (+ short tail)
        const ke = clamp01((cue.t - tE) / dE), sheath = cue.t >= tE && cue.t < tE + dE + 0.4 ? 1 - sstep(tE + dE, tE + dE + 0.4, cue.t) : 0;
        for (let h = 0; h < nSpiral; h++) {
          if (sheath < 0.02) { B.hideRib(nArc + h); continue; }
          const g = clamp01(ke * 1.4), phi = (h / nSpiral) * 6.283 + t3 * 3;
          for (let k = 0; k < NP; k++) {
            const u = (k / (NP - 1)) * g, th = 12.566 * u + phi, jg = (hash3(h + 20, k, f3) - 0.5) * 0.07 * s;
            const rr = 0.56 * s + jg;
            pts[k * 3] = chest.x + rr * Math.cos(th); pts[k * 3 + 1] = L.at[1] + (0.04 + 0.78 * u) * s; pts[k * 3 + 2] = chest.z + rr * Math.sin(th);
          }
          B.set(nArc + h, pts, sheath);
        }
        B.commit();
      }
      // vessels on the flippers (local x right, z forward, rotated by the seal yaw)
      const eg1 = clamp01(1 - Math.abs((cue.t - (tV + dV * 0.5)) / (dV * 0.5 + 0.12))), eg2 = sstep(tC, tC + 0.4, cue.t) * (1 - sstep(tB - 0.1, tB + 0.05, cue.t));
      const show = Math.max(eg1, eg2);
      const lift = sstep(tC, tC + 0.5, cue.t) * (1 - sstep(tB - 0.1, tB + 0.05, cue.t));
      for (let i = 0; i < 2; i++) {
        const sg = i ? 1 : -1, lx = sg * 0.5 * s, lz = 0.12 * s, ly = (-0.04 + 0.42 * lift) * s;
        const wx = chest.x + lx * cy + lz * sy, wz = chest.z - lx * sy + lz * cy;
        vessels[i].visible = show > 0.02; halos[i].visible = show > 0.02;
        vessels[i].position.set(wx, chest.y + ly, wz); vessels[i].scale.setScalar(0.6 + 0.4 * show); vessels[i].rotation.set(1.2, 0, cue.t * 2 * sg);
        halos[i].userData.u.uCenter.value.set(wx, chest.y + ly, wz);
        halos[i].userData.u.uA.value = 0.55 * show * (1 + 0.35 * Math.sin(cue.t * 30 + i));
        halos[i].userData.u.uC.value.copy(cyan).lerp(goldW, lift);
      }
    },
    dispose() { B.dispose(); ringGeo.dispose(); ringMat.dispose(); for (const h of halos) { h.geometry.dispose(); h.material.dispose(); } },
  };
}
