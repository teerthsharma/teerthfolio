// E05 THE 48 PROBE RAYS (ink-ray-stroke): instanced tapered ink ribbons, one draw per pass.
// MATHS (all in the vertex shader, a pure function of the stepped clock uT):
//   grow   g_i  = 1 - (1 - clamp((uT - T.rays - d_i)/0.3))^3,   d_i = 0.02 i     (staggered, ease-out cubic)
//   free tip Pf  = O + dir_i L_i g_i + jitter,  jitter = (h3(i, floor(12 uT))-.5) 2 J   ("yelling" on twos, J=.12; .03 trembling in the crouch)
//   snap  s_i    = ease3((uT - landBegin_i)/0.3),  landBegin_i = TP + 0.2 i/47      (12 frames for the whole volley)
//   target V_i   = H + Ry(angle) v_i R                                             (the hull vertex it is bound to; spare rays stay free)
//   tip          = mix(Pf, V_i, s_i);   spine(a) = mix(O, tip, a),  a in [0,1]
//   ribbon       half-width w(a) = 0.05 thick_i (1-a)^0.9, floored to half a pixel (hairline far rays);
//                expanded along side = normalize(cross(spine tangent, view)): camera-facing, the hard taper of an ink stroke.
//   ink pass     the same ribbon, widened 2 px on the fat third only, drawn black under the fill.
//   stroke tones 3 flat bands across the width: |side|<.3 lit, <.72 mid, else shadow; coral -> mint with s_i; the hot nine #fff1d8.
//   smear double ghost copy lagged 0.07 s at 0.4 alpha while a ray is mid-snap (2-frame multiples).
//   tick         1 frame of pure white as each tip lands (cue: the same instant fires the vertex dot, hull.js).
import { BufferAttribute, BufferGeometry, DoubleSide, Group, Mesh, ShaderMaterial } from "three";
import { C, PAL, GLSL_HASH, sstep } from "./util.js";

const SEG = 8;
const VERT = `
${GLSL_HASH}
attribute vec3 aS; attribute vec4 aF; attribute vec4 aP; attribute vec3 aV;
uniform float uT, uR, uAng, uGrow, uSnap, uJit, uEdge, uPxK;
uniform vec3 uO, uH;
varying float vSide, vSn, vFlag, vGhost, vTick, vVis, vFat;
void main(){
  float flag = aP.y, idx = aP.w;
  float g = 1.0 - pow(1.0 - clamp((uT - uGrow - aP.x) / 0.3, 0.0, 1.0), 3.0);
  vec3 jv = (h31(idx + floor(uT * 12.0 + 0.5) * 7.31) - 0.5) * 2.0 * uJit;
  vec3 Pf = uO + aF.xyz * aF.w * g + jv * g;
  float landB = uSnap + 0.2 * idx / 47.0;
  float sn = 1.0 - pow(1.0 - clamp((uT - landB - aS.z * 0.07) / 0.3, 0.0, 1.0), 3.0);
  if (flag > 1.5) sn = 0.0;                                  // spare rays stay free
  float c = cos(uAng), s = sin(uAng);
  vec3 V = uH + vec3(c * aV.x + s * aV.z, aV.y, -s * aV.x + c * aV.z) * uR;
  vec3 tip = mix(Pf, V, sn);
  vec3 pos = mix(uO, tip, aS.x);
  vec3 wp = (modelMatrix * vec4(pos, 1.0)).xyz, wo = (modelMatrix * vec4(uO, 1.0)).xyz, wt = (modelMatrix * vec4(tip, 1.0)).xyz;
  vec3 dir = normalize(wt - wo + vec3(1e-5)), view = normalize(cameraPosition - wp);
  vec3 side = normalize(cross(dir, view) + vec3(1e-5));
  float pxW = uPxK * length(cameraPosition - wp);
  float hw = max(0.05 * aP.z * pow(1.0 - aS.x, 0.9), 0.5 * pxW);
  float fat = (1.0 - smoothstep(0.2, 0.45, aS.x)) * step(0.55, aP.z);
  if (uEdge > 0.5) hw += 2.0 * pxW * fat;                  // 2 px ink on the fat third only
  wp += side * aS.y * hw;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  vSide = aS.y; vSn = sn; vFlag = flag; vGhost = aS.z; vFat = fat;
  vTick = 1.0 - step(1.0 / 24.0, abs(uT - (landB + 0.15)));
  vVis = step(0.0005, g) * ((aS.z > 0.5) ? step(0.001, sn) * (1.0 - step(0.999, sn)) : 1.0);
}`;
const FRAG = `
uniform float uEdge, uAlpha; uniform vec3 uInk, uCoral, uCoralSh, uHotC, uMint, uMintSh, uWhite;
varying float vSide, vSn, vFlag, vGhost, vTick, vVis, vFat;
void main(){
  if (vVis < 0.5) discard;
  float al = uAlpha * (vGhost > 0.5 ? 0.4 : 1.0);
  if (vFlag > 1.5) al *= mix(1.0, 0.15, step(0.5, vSn + 0.0));  // spare rays: dim from the start of the snap
  if (uEdge > 0.5) { if (vFat < 0.01) discard; gl_FragColor = vec4(uInk, al); return; }
  vec3 base = (vFlag > 0.5 && vFlag < 1.5) ? uHotC : uCoral;
  base = mix(base, uMint, vSn);
  vec3 sh = mix(uCoralSh, uMintSh, vSn);
  float a = abs(vSide);
  vec3 c = a < 0.3 ? mix(base, uWhite, 0.3) : (a < 0.72 ? base : sh);   // 3 flat stroke tones
  c = mix(c, uWhite, vTick);                                            // the 1-frame white landing tick
  gl_FragColor = vec4(c, al);
}`;

export function make(ctx, S) {
  const { F, T, plan } = S;
  const nr = plan.length, per = (SEG + 1) * 2, ghosts = 2;
  const pos = new Float32Array(nr * ghosts * per * 3), aS = new Float32Array(nr * ghosts * per * 3), aF = new Float32Array(nr * ghosts * per * 4);
  const aP = new Float32Array(nr * ghosts * per * 4), aV = new Float32Array(nr * ghosts * per * 3), idx = [];
  let o = 0;
  for (let g = 0; g < ghosts; g++) for (const r of plan) {
    const base = o;
    for (let s = 0; s <= SEG; s++) for (const side of [-1, 1]) {
      aS.set([s / SEG, side, g], o * 3);
      aF.set([r.dir.x, r.dir.y, r.dir.z, r.len], o * 4);
      aP.set([r.delay, r.v < 0 ? 2 : (r.hot ? 1 : 0), r.thick, r.i], o * 4);
      const v = r.v >= 0 ? S.verts[r.v] : r.dir; aV.set([v.x, v.y, v.z], o * 3);
      o++;
    }
    for (let s = 0; s < SEG; s++) { const a = base + s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(pos, 3));
  geo.setAttribute("aS", new BufferAttribute(aS, 3)); geo.setAttribute("aF", new BufferAttribute(aF, 4));
  geo.setAttribute("aP", new BufferAttribute(aP, 4)); geo.setAttribute("aV", new BufferAttribute(aV, 3));
  geo.setIndex(idx);
  const U = () => ({
    uT: { value: 0 }, uR: { value: 0 }, uAng: { value: 0 }, uGrow: { value: T.rays }, uSnap: { value: T.snap }, uJit: { value: 0.12 }, uEdge: { value: 0 }, uPxK: S.pxK,
    uO: { value: F.corner.clone() }, uH: { value: F.H.clone() }, uAlpha: { value: 1 },
    uInk: { value: C(PAL.ink) }, uCoral: { value: C(PAL.coral) }, uCoralSh: { value: C(PAL.coralSh) }, uHotC: { value: C(PAL.hot) },
    uMint: { value: C(PAL.mint) }, uMintSh: { value: C(PAL.mintSh) }, uWhite: { value: C("#ffffff") },
  });
  const mk = (edge) => { const u = U(); u.uEdge.value = edge; return new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, side: DoubleSide, transparent: true, depthWrite: false }); };
  const ink = new Mesh(geo, mk(1)), fill = new Mesh(geo, mk(0));
  ink.renderOrder = 4; fill.renderOrder = 5; ink.frustumCulled = fill.frustumCulled = false;
  const group = new Group(); group.add(ink, fill);
  return {
    group,
    update(ts) {
      const R = S.hullR(ts), ang = S.hullAng(ts);
      // alpha: full until the hull closes, then down to 0.15 by f135 (T.close1)
      const al = 1 - 0.85 * sstep(T.close0, T.close1, ts);
      // jitter: yelling while growing, a held tremble in the crouch (rays frozen trembling), still after the snap
      const jit = ts < T.wind ? 0.12 : ts < T.TP ? 0.03 : 0;
      for (const m of [ink, fill]) {
        const u = m.material.uniforms;
        u.uT.value = ts; u.uR.value = R; u.uAng.value = ang; u.uAlpha.value = al; u.uJit.value = jit;
        u.uO.value.copy(F.H).addScaledVector(F.toSeal, R);
      }
      group.visible = ts >= T.rays;
    },
    dispose() { geo.dispose(); ink.material.dispose(); fill.material.dispose(); },
  };
}
