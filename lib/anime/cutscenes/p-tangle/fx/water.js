// WATER FX (bible 6 "Ripples", 3.10 "loop reflections"): expanding ripple rings on the lake plane and the red loop reflection.
// Rings are painted on a horizontal quad at lakeY + 2 cm, depth-tested (so the seal and its islet always sit in front).
//   ring j at radius  R_j(a) = 5.5 a - .9 j     (a = age s; 5.5 m/s from the bible), thickness .12 m
//   intensity         (1 - .3 j) exp(-((r - R_j) / .12)^2) (1 - a / life)^1.2 (1 - r / Rmax)
//   events            link 10.2 (loops), cometImpact 13.9 (far shore, 9 m/s, wide), pull 14.2 (mid lake), bowPop 15.2 (the flipper), retract 22.4
// Loop reflection: a vertical streak below the loops, x displaced by sin(20 y + 2 t) .08, gaussian width .22, in water light
// (1, .3, .35); lit from loopLight (7.7 s) until the retract fades it.
import { billboard, mat, sstep, clamp01 } from "./lib.js";

const RING_VS = /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_FS = /* glsl */ `
uniform float uAge; uniform float uSpeed; uniform float uR; uniform float uLife; uniform vec3 uCol; uniform float uA;
varying vec2 vP;
void main() {
  float r = length(vP) * uR;
  float a = 0.;
  for (int j = 0; j < 3; j++) {
    float fj = float(j);
    float R = uSpeed * uAge - .9 * fj;
    float x = (r - R) / (.12 + .05 * fj);
    a += (1. - .3 * fj) * exp(-x * x) * step(0., R);
  }
  a *= pow(clamp(1. - uAge / uLife, 0., 1.), 1.2) * (1. - smoothstep(.55, 1., r / uR));
  gl_FragColor = vec4(uCol * 1.2, clamp(a, 0., 1.) * uA);
}`;

export default function makeWater(ctx, sh, T, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "water";
  const C = (h) => new THREE.Color(h);
  const sc = L.sc, y = L.lakeY + 0.02;
  const mid = [(L.at[0] + L.hand[0]) / 2, y, (L.at[2] + L.hand[2]) / 2];
  const ev = [
    { name: "link", at: L.loops, R: 30 * sc, speed: 5.5, life: 3.0, col: "#ffd6a0" },
    { name: "cometImpact", at: L.impact, R: 70 * sc, speed: 9, life: 4.2, col: "#ffe6cc" },
    { name: "pull", at: mid, R: 22 * sc, speed: 5.5, life: 2.6, col: "#ff8a98" },
    { name: "bowPop", at: L.flip, R: 14 * sc, speed: 4.2, life: 2.2, col: "#ffc09a" },
    { name: "retract", at: L.loops, R: 34 * sc, speed: 5.5, life: 3.2, col: "#ffd6a0" },
  ];
  const geo = new THREE.PlaneGeometry(2, 2); geo.rotateX(-Math.PI / 2);
  // rotateX turns position.xy to (x, 0, -y): vP must follow the plane's x and z, so read position.xz instead
  const vs = RING_VS.replace("vP = position.xy", "vP = position.xz");
  for (const e of ev) {
    const u = { uAge: { value: 0 }, uSpeed: { value: e.speed }, uR: { value: e.R }, uLife: { value: e.life }, uCol: { value: C(e.col) }, uA: { value: 0.75 } };
    const m = mat(THREE, { vs, fs: RING_FS, u, add: true });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(e.at[0], y, e.at[2]); mesh.scale.set(e.R, 1, e.R);
    mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; mesh.userData.u = u; e.mesh = mesh;
    group.add(mesh);
  }
  // scale is in metres already via mesh.scale, so vP in [-1,1] times uR gives metres
  const reflFs = /* glsl */ `
    uniform vec3 uCol;
    void main() {
      float yy = vUv.y * .5 + .5; // 0 at the loops, 1 at the bottom of the streak
      float x = vUv.x + sin(vUv.y * 20. + uT * 2.) * .08 * (.4 + yy);
      float g = exp(-x * x / .05) * (1. - smoothstep(.0, 1., yy));
      float rip = .65 + .35 * sin((vUv.y * 40. - uT * 3.) + vn(vec2(vUv.y * 9., uT)) * 6.);
      gl_FragColor = vec4(uCol * 1.2, clamp(g * rip, 0., 1.) * uK * .55 * vFade);
    }`;
  const refl = billboard(THREE, sh, reflFs, { uCol: { value: C("#ff4d5a") } }, { order: 3 });
  refl.userData.u.uCenter.value.set(L.loops[0], L.lakeY - 1.1 * sc, L.loops[2]);
  refl.userData.u.uSize.value.set(0.9 * sc, 1.4 * sc);
  group.add(refl);

  return {
    group,
    update(t) {
      for (const e of ev) {
        const age = t - T[e.name], u = e.mesh.userData.u;
        u.uAge.value = age; e.mesh.visible = age > 0 && age < e.life;
      }
      const k = sstep(T.loopLight, T.loopLight + 0.8, t) * (1 - sstep(T.retract, T.retract + 0.8, t));
      refl.userData.u.uK.value = k; refl.userData.u.uT.value = t; refl.visible = k > 0.01;
    },
    dispose() { geo.dispose(); group.traverse((o) => { o.material?.dispose?.(); o.geometry?.dispose?.(); }); },
  };
}
