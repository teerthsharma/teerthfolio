// RING SHOCKWAVES, MOTES, THE CLOSING WIPE (bible 5, 6). Layer 1.
//
// Ring shockwave (ground ring): radius R(k) = Rmax (1 - (1 - k)^3), k = (t - t0) / dur; a 3 px line, |r - R| < 1.5 px via fwidth,
//   colour #7fd8ff -> #e9b23a over k, alpha (1 - k^2). Two events: the bolt (Rmax 4 m, 0.6 s) and the reassembly ring wave (Rmax 8 m, 1.0 s, at F + 1.3 = 9.7 s)
//   plus a lock ring at F + 2.1 (CHK), Rmax 3 m, 0.4 s, gold.
// Motes: 100 diamonds (#f2b52e #e4566a #1fbdb4 #fff3d6) drifting up in a ring of radius 2.5-9 m round the seal; stateless (SparkField loop).
//   Windows 0-1.6 s (the dock dissolves into Sindria) and 12.0-13.4 s (the credit): uOn = smooth in/out, 0 elsewhere.
// Closing wipe (13.2-13.6): a cream #f6ead2 band swept along d = dot(p, (cos .33, sin .33)), p = uv * (asp, 1);
//   half-width w(k) = .2 + 2.1 sin(pi k) so it is a full cover exactly at the camera cut (k = .5) and clears by k = 1; gold #e9b23a edge strips 0.04 wide.
//   It sits behind the seal's depth, so the seal is in every frame.
// Cue names: "bolt" (6.4), "shatter" (8.4), "motes" (0, dur 1.6), "motesB" (12.0, dur 1.4), "wipe" (13.2, dur 0.4).
import { bb, mat, SparkField, sstep, clamp01, hash3 } from "./lib.js";

export default function makeWave(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "wave";
  const C = (h) => new THREE.Color(h);
  const tB = T.one("bolt", 6.4), tF = T.one("shatter", 8.4);
  const tMA = T.one("motes", 0), dMA = T.durOf("motes", 1.6), tMB = T.one("motesB", 12.0), dMB = T.durOf("motesB", 1.4);
  const tW = T.one("wipe", 13.2), dW = T.durOf("wipe", 0.4);

  // ---- rings ----
  const ringFs = /* glsl */ `
    uniform float uK; uniform vec3 uA, uB; varying vec2 vUv;
    void main() {
      float r = length(vUv), fw = fwidth(r) + 1e-5, R = 1. - pow(1. - clamp(uK, 0., 1.), 3.);
      float d = abs(r - R), line = 1. - smoothstep(1.5 * fw - .5 * fw, 1.5 * fw + .5 * fw, d);
      float al = line * (1. - uK * uK); if (al < .004) discard;
      gl_FragColor = vec4(mix(uA, uB, uK) * 1.5, al);
    }`;
  const rings = [
    { t0: tB + 1 / 24, dur: 0.6, R: 4, a: "#7fd8ff", b: "#e9b23a" },
    { t0: tF + 1.3, dur: 1.0, R: 8, a: "#7fd8ff", b: "#e9b23a" },
    { t0: tF + 2.1, dur: 0.4, R: 3, a: "#e9b23a", b: "#fff2c0" },
  ].map((r) => {
    const u = { uK: { value: 0 }, uA: { value: C(r.a) }, uB: { value: C(r.b) } };
    const m = mat(THREE, { vs: `varying vec2 vUv; void main(){ vUv = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fs: ringFs, u, add: true });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    me.rotation.x = -Math.PI / 2; me.scale.setScalar(r.R * L.scale); me.position.set(L.at[0], L.floorY + 0.05, L.at[2]); me.frustumCulled = false; me.renderOrder = 3; me.visible = false;
    group.add(me); return { ...r, u, m, me };
  });

  // ---- motes ----
  const cols = ["#f2b52e", "#e4566a", "#1fbdb4", "#fff3d6"];
  const N = 100, motes = new SparkField(THREE, sh, N, { loop: true, order: 7 });
  for (let i = 0; i < N; i++) {
    const a = hash3(i, 1) * 6.283, rr = (2.5 + 6.5 * hash3(i, 2)) * Math.max(1, L.scale), life = 2.6 + 2.4 * hash3(i, 3);
    motes.setP(i, [L.at[0] + Math.cos(a) * rr, L.at[1] + 0.2 + 5 * hash3(i, 4), L.at[2] + Math.sin(a) * rr - 1], [(hash3(i, 5) - 0.5) * 0.5, 0.35 + 0.5 * hash3(i, 6), (hash3(i, 7) - 0.5) * 0.5], cols[i % 4], -hash3(i, 8) * 4, life, 4 + 5 * hash3(i, 9), i);
  }
  motes.commit(); group.add(motes.mesh);

  // ---- wipe ----
  const wipeFs = /* glsl */ `
    uniform float uK; varying vec2 vUv; varying float vAsp;
    void main() {
      vec2 p = vUv * vec2(vAsp, 1.); float d = dot(p, vec2(cos(.33), sin(.33)));
      float f = mix(-vAsp - 1.2, vAsp + 1.2, uK), w = .2 + 2.1 * sin(3.14159 * uK);
      float e = abs(d - f);
      float inB = step(abs(d - f), w), edge = step(abs(abs(d - f) - w), .04) * step(abs(d - f), w + .04);
      vec3 cream = pow(vec3(.965, .918, .824), vec3(2.2)), gold = pow(vec3(.914, .698, .227), vec3(2.2));
      float a = max(inB, edge); if (a < .5) discard;
      gl_FragColor = vec4(mix(cream, gold, edge * (1. - inB * .0) * step(.5, edge)), .96);
    }`;
  const wu = { uK: { value: 0 } };
  const wipe = bb(THREE, sh, wipeFs, wu, { full: true, push: 0.3, order: 8 });
  group.add(wipe);

  return {
    group,
    update(t, dt, cue) {
      const ct = cue.t;
      for (const r of rings) { const k = (ct - r.t0) / r.dur; r.me.visible = k >= 0 && k < 1; r.u.uK.value = clamp01(k); }
      const win = (t0, d) => sstep(t0 - 0.0001, t0 + 0.25, ct) * (1 - sstep(t0 + d - 0.3, t0 + d, ct));
      const on = Math.max(ct < tMA + dMA ? 1 - sstep(tMA + dMA - 0.4, tMA + dMA, ct) : 0, win(tMB, dMB));
      motes.mesh.visible = on > 0.01; motes.u.uOn.value = on; motes.u.uT.value = ct;
      const wk = (ct - tW) / dW; wipe.visible = wk >= 0 && wk <= 1; wu.uK.value = clamp01(wk);
    },
    dispose() { for (const r of rings) { r.me.geometry.dispose(); r.m.dispose(); } motes.dispose(); wipe.geometry.dispose(); wipe.material.dispose(); },
  };
}
