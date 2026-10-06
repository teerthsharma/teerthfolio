// THE LIGHT SHAFT THROUGH THE SPLIT AND THE MOTES (bible E13, E17). Layer 1.
//   shaft  an open cone from the hole to the ground, 38.5 m tall, radius 5.4 (top) -> 7.0 (ground), scaled in xz by the split so it never
//          pokes outside the tear. Flat bands, 3 steps, from the surface-vs-view angle b = |n . v| (core faces the eye, edge grazes it):
//            b > 0.60  #f5e0b0 at 18%      b > 0.30  #f5e0b0 at 12%      else  #ffffff at 6%
//          vertical: alpha x mix(0.55, 1, v) (v = height / 38.5) x smoothstep(1, 0.93, v) so it dies into the deck, and x smoothstep(0, 0.06, v).
//          Appears at the shaft beat (f104), full when the split lands (f123), then 1% breath: x (1 + 0.01 sin 1.7 t).
//          Over-blended (not additive) and ALWAYS through sealGuard: nothing in front of the seal is ever veiled (guard.js).
//   motes  #fff1d8 dots, drifting 0.1 m/s on twos. 60 ambient (0.4 .. 9 m up, 14 m round the seal, 0.02-0.05 m) and 40 riding the shaft
//          (they appear with it). Point size in px = 2 r P11 (res.y / 2) / depth, floor 1.6 px.
import { ALL, HEX, HOLE_R, SHAFT_H } from "./palette.js";
import { SEAL_GUARD, OVER_KEEP_ID } from "./guard.js";

const SHAFT_VS = /* glsl */ `varying vec3 vWP; varying vec3 vN; varying float vV;
  void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWP = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
    vV = (position.y - 0.2) / ${SHAFT_H.toFixed(2)}; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SHAFT_FS = /* glsl */ `varying vec3 vWP; varying vec3 vN; varying float vV;
  uniform vec3 uSeal; uniform float uVis; ${ALL} ${SEAL_GUARD}
  void main() {
    float b = abs(dot(normalize(vN), normalize(cameraPosition - vWP)));
    float a = b > 0.6 ? 0.18 : (b > 0.3 ? 0.12 : 0.06);
    vec3 col = b > 0.3 ? C_warm : C_white;
    float v = clamp(vV, 0.0, 1.0);
    a *= mix(0.55, 1.0, v) * (1.0 - smoothstep(0.93, 1.0, v)) * smoothstep(0.0, 0.06, v) * uVis * sealGuard(vWP);
    gl_FragColor = vec4(col, a);
  }`;

const MOTE_VS = /* glsl */ `attribute vec2 aS; uniform float uT; uniform float uH; uniform float uY0; uniform vec2 uRes;
  varying vec3 vWP; varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(position.y - uY0 + 0.1 * uT, uH) + uY0;
    p.x += 0.25 * sin(uT * 0.6 + aS.x * 6.28); p.z += 0.25 * cos(uT * 0.5 + aS.x * 5.1);
    vec4 w = modelMatrix * vec4(p, 1.0); vWP = w.xyz;
    vec4 mv = viewMatrix * w; gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.6, 2.0 * aS.y * projectionMatrix[1][1] * uRes.y * 0.5 / max(-mv.z, 0.1));
    vA = 1.0;
  }`;
const MOTE_FS = /* glsl */ `varying vec3 vWP; varying float vA; uniform vec3 uSeal; uniform float uVis; uniform float uBase; ${ALL} ${SEAL_GUARD}
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(C_mote, uBase * uVis * sealGuard(vWP));
  }`;

export function buildShaft(ctx, hole) {
  const { THREE, engine } = ctx;
  const uSeal = { value: new THREE.Vector3() };
  const group = new THREE.Group();
  const dispose = [];

  const geo = new THREE.CylinderGeometry(5.4, 7.0, SHAFT_H, 48, 1, true).translate(0, SHAFT_H / 2 + 0.2, 0);
  const sUni = { uSeal, uVis: { value: 0 } };
  const smat = new THREE.ShaderMaterial({ uniforms: sUni, vertexShader: SHAFT_VS, fragmentShader: SHAFT_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...OVER_KEEP_ID });
  const shaft = new THREE.Mesh(geo, smat); shaft.position.set(hole[0], 0, hole[2]); shaft.visible = false; shaft.frustumCulled = false;
  shaft.renderOrder = 5; ctx.setLayer(shaft, 1); group.add(shaft); dispose.push(geo, smat);

  const R = ctx.rng("motes");
  const motes = (n, region, uBase, h, y0, visUni) => {
    const pos = new Float32Array(n * 3), aS = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = region(R);
      pos.set([x, y, z], i * 3); aS.set([R(), 0.02 + 0.03 * R()], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.BufferAttribute(aS, 2));
    const m = new THREE.ShaderMaterial({
      uniforms: { uSeal, uT: { value: 0 }, uH: { value: h }, uY0: { value: y0 }, uRes: engine.shared.uRes, uVis: visUni, uBase: { value: uBase } },
      vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, ...OVER_KEEP_ID,
    });
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 6; ctx.setLayer(p, 1); group.add(p);
    dispose.push(g, m); return m;
  };
  const one = { value: 1 };
  const ambient = motes(60, (r) => { const a = r() * 6.283, d = 2 + 12 * Math.sqrt(r()); return [Math.sin(a) * d, 0.4 + 8.6 * r(), Math.cos(a) * d]; }, 0.75, 8.6, 0.4, one);
  const inShaft = motes(40, (r) => { const a = r() * 6.283, d = HOLE_R * 0.9 * Math.sqrt(r()); return [hole[0] + Math.sin(a) * d, 1 + 36 * r(), hole[2] + Math.cos(a) * d]; }, 0.85, 36, 1, sUni.uVis);

  const tmp = new THREE.Vector3();
  return {
    group,
    // vis 0..1: the reveal; breath: the 1% swell; t: stepped time
    update(t, vis, breath, split) {
      ctx.seal.chest(tmp); uSeal.value.copy(tmp);
      sUni.uVis.value = vis * breath;
      shaft.visible = vis > 0.001;
      const s = Math.max(0.05, split); shaft.scale.set(s, 1, s);
      ambient.uniforms.uT.value = t; inShaft.uniforms.uT.value = t;
    },
    dispose() { for (const d of dispose) d.dispose(); },
  };
}
