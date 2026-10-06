// SHOT 3 to 5: the INFORMATION FLOOD (440 star-line ribbons, bible 3.5, FX 3) and the KRACKLE ARMS (bible 3.7).
//
// FLOOD. Hard-edged tapered streaks of flat colour (no gradient), 3 colours #e6d6ff / #8cb8ff / #c775f2, 12% of them a tiny square chip
// (no letters, L10), drawn on THREES, converging on the core C = (0, 1.7, -15) at 8..14 m/s, frozen by the flow clock at 8.6 s.
//   span      = Rmax - Rmin = 90 - 2 m
//   u         = fract(seed + flow(tq) speed / span)         0 = at Rmax, 1 = at the core;  tq = floor(t 8) / 8   (threes)
//   rad       = mix(Rmax, Rmin, u)                          head distance from the core along the ribbon's direction d
//   head H    = C + d rad;   tail T = C + d (rad + len);    len 3..16 m (a chip: 1.8 width)
//   ribbon    pos = mix(H, T, along) + side * s * w * (1 - along)      side = normalize(cross(T - H, mid - eye)): faces the lens
//             the tail ends in a point (taper 1 - along); a chip keeps taper 1
//   fade      smoothstep(0, .08, u) (1 - smoothstep(.9, 1, u)): a streak is born and dies off the ends of its path
//   envelope  K = smoothstep(1.45, 2.2, t) over 1.45..9.5, then 0.45 by 10.4, 0 by 11.5 (the frozen field lingers into the still)
//   flow'     1 for t < 8.3, then 1 - smoothstep((t - 8.3)/0.3): zero over 0.3 s (the Freeze).
// Colour is flat linear <= 1.0, so no streak blooms; it is drawn depth-tested and never reaches the seal.
//
// KRACKLE. 16 arms x 7 four-point sparkles with a white core, curling out of the core: theta = a_arm + 0.38 j + 0.5 flow, radius
// 2.5 + 2.2 j; twinkle on twos (alpha 0.5 + 0.5 h(step, id)). Fill #f5ebff core to #a885ff arm.
import { hexLin, flowClock, sstep, hash, mkMat, quadSet, GLSL_COMMON } from "./lib.js";

export default function make(ctx, L) {
  const { THREE } = ctx;
  const group = new THREE.Group(); group.name = "fx-flood";
  const rng = ctx.rng(7);
  const N = 440, RMAX = 90, RMIN = 2;

  // ---- ribbons ----------------------------------------------------------------------------------------------------------------
  const pos = new Float32Array(N * 12), aDir = new Float32Array(N * 12), aP = new Float32Array(N * 16), aQ = new Float32Array(N * 12), aChip = new Float32Array(N * 4), idx = new Uint32Array(N * 6);
  const Q = [[0, -1], [0, 1], [1, 1], [1, -1]];
  for (let i = 0; i < N; i++) {
    const z = rng() * 2 - 1, az = rng() * Math.PI * 2, rr = Math.sqrt(1 - z * z);
    const d = [rr * Math.cos(az), z, rr * Math.sin(az)];
    const chip = rng() < 0.12 ? 1 : 0, col = rng() < 0.5 ? 0 : rng() < 0.55 ? 1 : 2;
    const seed = rng(), speed = 8 + rng() * 6, len = 3 + rng() * 13, w = 0.12 + rng() * 0.23;
    for (let v = 0; v < 4; v++) {
      aDir.set(d, i * 12 + v * 3); aP.set([seed, speed, len, chip ? w * 0.8 : w], i * 16 + v * 4);
      aQ.set([Q[v][0], Q[v][1], col], i * 12 + v * 3); aChip[i * 4 + v] = chip;
    }
    idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aDir", new THREE.BufferAttribute(aDir, 3)); geo.setAttribute("aP", new THREE.BufferAttribute(aP, 4));
  geo.setAttribute("aQ", new THREE.BufferAttribute(aQ, 3)); geo.setAttribute("aChip", new THREE.BufferAttribute(aChip, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  const V = (h) => new THREE.Vector3(...hexLin(h));
  const mat = mkMat(THREE, {
    u: { uCore: L.CORE.clone(), uFlow: 0, uRmax: RMAX, uRmin: RMIN, uK: 0, uC0: V("#e6d6ff"), uC1: V("#8cb8ff"), uC2: V("#c775f2") },
    vs: /* glsl */ `
    attribute vec3 aDir; attribute vec4 aP; attribute vec3 aQ; attribute float aChip;
    uniform vec3 uCore; uniform float uFlow; uniform float uRmax; uniform float uRmin; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
    varying vec3 vCol; varying float vFade;
    void main() {
      float span = uRmax - uRmin;
      float u = fract(aP.x + uFlow * aP.y / span);
      float rad = mix(uRmax, uRmin, u);
      float len = aChip > 0.5 ? aP.w * 1.8 : aP.z;
      vec3 H = uCore + aDir * rad, T = uCore + aDir * (rad + len);
      vec3 tang = normalize(T - H);
      vec3 mid = mix(H, T, 0.5);
      vec3 side = normalize(cross(tang, mid - cameraPosition));
      float taper = aChip > 0.5 ? 1. : 1. - aQ.x;
      vec3 p = mix(H, T, aQ.x) + side * aQ.y * aP.w * taper;
      vFade = smoothstep(0., 0.08, u) * (1. - smoothstep(0.9, 1., u));
      vCol = aQ.z < 0.5 ? uC0 : (aQ.z < 1.5 ? uC1 : uC2);
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.);
    }`,
    fs: `uniform float uK; varying vec3 vCol; varying float vFade;
      void main() { float a = vFade * uK; if (a < 0.01) discard; gl_FragColor = vec4(min(vCol, vec3(1.0)), a * 0.9); }`,
  });
  const ribbons = new THREE.Mesh(geo, mat); ribbons.frustumCulled = false; ribbons.renderOrder = 3;
  group.add(ribbons);

  // ---- krackle arms -----------------------------------------------------------------------------------------------------------
  const ARMS = 16, DOTS = 7, kn = ARMS * DOTS;
  const kr = quadSet(THREE, kn, /* glsl */ `
    uniform float uK; uniform vec3 uA; uniform vec3 uB;
    void main() {
      float st = star4(vP, 0.9);
      float core = 1. - smoothstep(0.10, 0.22, length(vP));
      vec3 c = mix(uA, uB, core);
      float a = max(st, core) * vS.y * uK;
      if (a < 0.01) discard;
      gl_FragColor = vec4(min(c, vec3(1.0)), a);
    }`, { u: { uA: V("#a885ff"), uB: V("#f5ebff") }, order: 4 });
  group.add(kr.mesh);
  const armA = [], armH = [];
  for (let i = 0; i < ARMS; i++) { armA.push((i / ARMS) * Math.PI * 2 + (rng() - 0.5) * 0.3); armH.push(rng()); }

  const fl = L.T("flood", 1.45, 7.15), fz = L.T("freeze", 8.3, 0.3);
  return {
    group,
    update(t, dt, cue) {
      const tq = Math.floor(t * 8) / 8; // threes
      const f0 = cue.since("freeze") !== Infinity ? fz.t : 8.3;
      const k = sstep(fl.t, fl.t + 0.75, t) * (t < 9.5 ? 1 : 1 - 0.55 * sstep(9.5, 10.4, t)) * (1 - sstep(10.4, 11.5, t));
      const u = mat.userData.u;
      u.uFlow.value = flowClock(tq, f0, 0.3); u.uK.value = k;
      // krackle
      const flow = flowClock(t, f0, 0.3), step = Math.floor(t * 12), ku = kr.mesh.userData.u;
      const kk = sstep(fl.t + 0.3, fl.t + 1.1, t) * (1 - sstep(8.6, 9.6, t));
      ku.uK.value = kk;
      if (kk > 0.004) {
        for (let a = 0; a < ARMS; a++) for (let j = 0; j < DOTS; j++) {
          const th = armA[a] + 0.38 * j + 0.5 * flow, rho = 2.5 + 2.2 * j;
          const i = a * DOTS + j;
          kr.set(i, L.CORE.x + rho * Math.cos(th), L.CORE.y + rho * Math.sin(th) * 0.8, L.CORE.z + (armH[a] - 0.5) * 5 + rho * 0.1,
            0.45 + 0.05 * j, 0.5 + 0.5 * hash(step * 13.7 + i), 0);
        }
        kr.flush();
      }
    },
    dispose() {},
  };
}
