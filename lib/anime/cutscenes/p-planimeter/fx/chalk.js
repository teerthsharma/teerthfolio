// Chalk: the Reviewer's tally scrape (shot 2) and the hero's "S^2 | VR" (shot 4), each a masked wipe plus a
// particle trail of dust at the stroke head. Bible E4 chalk-trail-fx, section 6 (Chalk scrape), shot 4 layer (5).
//
// Maths
//   reveal   a glyph plane is wiped left to right: visible where  uv.x < r(t) + soft edge, r = e(u) (u = beat progress),
//            with a ragged edge  r + 0.015 (vn(uv * 40) - .5)  so the chalk looks pressed, not masked.
//   head     the stroke head moves along  H(u) = (x0 + w e(u), y0 + 0.5 h sin(7 e(u) pi)) in the plane's frame, a
//            hand-writing wobble in height.
//   trail    9 slots with life L = 0.25 s, staggered L/9 apart: slot j has age a_j = (t - j L / 9) mod L and was born
//            at b_j = t - a_j; it sits at H(u(b_j)) + (j1 dx, -g a_j^2, j2 dz), g = 1.6 m/s^2, with hash jitter j*
//            of the slot and birth cycle (never Math.random). Alpha = 1 - a_j/L; only births inside the write window.
//            t is the stepped clock, so the dust steps on twos exactly like the drawing (21 frames).
import * as THREE from "three";
import { mat, canvasTex, hash, prog, sstep, clamp01 } from "./lib.js";

const tally = () => canvasTex(512, 256, (g, W, H) => {
  g.clearRect(0, 0, W, H); g.strokeStyle = "#fffdf0"; g.lineCap = "round"; g.lineWidth = 9;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(90 + i * 60 + 2 * (i % 2), 50); g.lineTo(88 + i * 60, 200 + 4 * (i % 3)); g.stroke(); }
  g.beginPath(); g.moveTo(60, 170); g.lineTo(350, 90); g.stroke();                 // the fifth stroke across
  g.beginPath(); g.moveTo(380, 160); g.lineTo(420, 205); g.lineTo(480, 70); g.stroke(); // a tick
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + 0.5 * ((i * 53) % 11) / 11})`; g.fillRect((i * 7919) % W, (i * 104729) % H, 2, 2); }
});
const sphereNote = () => canvasTex(1024, 256, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  g.font = '700 150px "Segoe Print","Comic Sans MS",cursive'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#fffdf0"; g.fillText("S² | VR", W / 2, H / 2 + 6);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(0,0,0,${0.2 + 0.5 * ((i * 53) % 11) / 11})`; g.fillRect((i * 7919) % W, (i * 104729) % H, 2, 2); }
});

function writer(ctx, U, tex, w, h, pos, T, keyName) {
  const own = [];
  const grp = new THREE.Group(); grp.position.set(...pos);
  const m = mat(U, /* glsl */ `
    uniform sampler2D uMap; uniform float uR; uniform float uA;
    void main(){
      float edge = uR + .015 * (vn(vUv * vec2(40., 14.)) - .5);
      float on = 1. - smoothstep(edge - .01, edge + .004, vUv.x);
      vec4 c = texture2D(uMap, vUv);
      gl_FragColor = vec4(c.rgb, c.a * on * uA * keepClear(vW));
    }`, { uMap: { value: tex }, uR: { value: 0 }, uA: { value: 0 } });
  own.push(m, tex);
  const geo = new THREE.PlaneGeometry(w, h); own.push(geo);
  const mesh = new THREE.Mesh(geo, m); mesh.renderOrder = 6; mesh.frustumCulled = false; mesh.visible = false; grp.add(mesh);

  // dust trail
  const NP = 9, LIFE = 0.25;
  const pg = new THREE.BufferGeometry(); own.push(pg);
  const pp = new Float32Array(NP * 3), ps = new Float32Array(NP).fill(1);
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("aSize", new THREE.BufferAttribute(ps, 1));
  const pm = mat(U, /* glsl */ `
    uniform float uAlpha;
    void main(){
      vec2 q = gl_PointCoord * 2. - 1.;
      float a = (1. - smoothstep(.5, 1., length(q))) * uAlpha * keepClear(vW);
      gl_FragColor = vec4(1., .992, .941, a);        // chalk #fffdf0, normal blend
    }`, { uAlpha: { value: 0 }, uSize: { value: 0.04 } }, { points: true });
  own.push(pm);
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; pts.renderOrder = 7; pts.visible = false; grp.add(pts);

  const head = (u) => [-w / 2 + w * sstep(0, 1, u), 0.5 * h * 0.5 * Math.sin(7 * sstep(0, 1, u) * Math.PI)];
  function update(t) {
    const e = T[keyName], u = prog(e, t), on = t >= e.t;
    m.uniforms.uR.value = on ? sstep(0, 1, u) * 1.02 : 0; m.uniforms.uA.value = on ? 1 : 0; mesh.visible = on;
    const writing = t >= e.t && t < e.t + e.dur;
    pts.visible = on && t < e.t + e.dur + LIFE;
    pm.uniforms.uAlpha.value = 1;
    for (let j = 0; j < NP; j++) {
      const age = ((t - (j * LIFE) / NP) % LIFE + LIFE) % LIFE, birth = t - age;
      const bu = clamp01((birth - e.t) / e.dur), live = birth >= e.t && birth <= e.t + e.dur;
      const [hx, hy] = head(bu), cyc = Math.floor(birth * 12);
      const jx = (hash(j, cyc, 1) - 0.5) * 0.05, jz = hash(j, cyc, 2) * 0.05;
      pp[j * 3] = hx + jx; pp[j * 3 + 1] = hy - 1.6 * age * age; pp[j * 3 + 2] = jz + 0.02;
      ps[j] = live ? (1 - age / LIFE) * 1.1 + 0.2 : 0;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.aSize.needsUpdate = true;
  }
  return { group: grp, update, dispose() { own.forEach((x) => x.dispose?.()); } };
}

export default function chalk(ctx, U, T, L) {
  const grp = new THREE.Group();
  const [bx, by, bz] = L.board;
  const a = writer(ctx, U, tally(), 1.5, 0.75, [bx - 1.6, by + 0.55, bz + 0.04], T, "chalk");      // Reviewer's scrape
  const b = writer(ctx, U, sphereNote(), 2.6, 0.65, [bx + 0.1, by + 0.5, bz + 0.05], T, "chalkS2"); // hero's S^2 | VR
  grp.add(a.group, b.group);
  return { group: grp, update: (t, dt, cue) => { a.update(t); b.update(t); }, dispose() { a.dispose(); b.dispose(); } };
}
